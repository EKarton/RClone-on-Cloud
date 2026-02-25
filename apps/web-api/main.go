package main

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/golang-jwt/jwt/v5"
	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/rc"
	"github.com/rclone/rclone/fs/rc/rcserver"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/ekarton/RClone-Cloud/apps/web-api/config/mongodb"

	_ "github.com/rclone/rclone/backend/all"
	_ "github.com/rclone/rclone/fs/operations"
	_ "github.com/rclone/rclone/fs/sync"
)

// --- JWT types ---

type contextKey string

const contextKeyClaims contextKey = "claims"

type Claims struct {
	UserID string `json:"sub"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// --- Main ---

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// 1. Encryption key
	keyHex := os.Getenv("RCLONE_ENCRYPTION_KEY")
	if len(keyHex) != 64 {
		log.Fatal("RCLONE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
	}
	encKey, err := hex.DecodeString(keyHex)
	if err != nil {
		log.Fatalf("invalid RCLONE_ENCRYPTION_KEY: %v", err)
	}

	// 2. MongoDB
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI is not set")
	}
	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer client.Disconnect(ctx)

	// 3. Load rclone config from MongoDB
	store, err := mongodb.New(
		client.Database("rclone").Collection("configs"),
		encKey,
	)
	if err != nil {
		log.Fatalf("init storage: %v", err)
	}
	if err := store.Load(); err != nil {
		log.Fatalf("load config: %v", err)
	}
	config.SetData(store)

	// 4. Load RSA public key for JWT verification
	publicKey, err := loadRSAPublicKey(os.Getenv("JWT_PUBLIC_KEY_PATH"))
	if err != nil {
		log.Fatalf("load public key: %v", err)
	}

	// 5. RC server — internal only
	rc.Opt.Enabled = true
	rc.Opt.NoAuth = true
	rc.Opt.HTTP.ListenAddr = []string{"127.0.0.1:9090"}

	s, err := rcserver.Start(ctx, &rc.Opt)
	if err != nil {
		log.Fatalf("start rc server: %v", err)
	}
	_ = s

	// 6. Public server with JWT middleware → proxies to RC server
	target, _ := url.Parse("http://127.0.0.1:9090")
	proxy := httputil.NewSingleHostReverseProxy(target)

	publicServer := &http.Server{
		Addr:    getEnv("LISTEN_ADDR", ":8080"),
		Handler: bearerMiddleware(publicKey, proxy),
	}

	go func() {
		log.Printf("API listening on %s", getEnv("LISTEN_ADDR", ":8080"))
		if err := publicServer.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("public server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down...")
	publicServer.Shutdown(context.Background())
}

// loadRSAPublicKey reads a PEM file from disk and parses it as an RSA public key.
func loadRSAPublicKey(path string) (*rsa.PublicKey, error) {
	if path == "" {
		return nil, fmt.Errorf("JWT_PUBLIC_KEY_PATH is not set")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read public key: %w", err)
	}
	block, _ := pem.Decode(data)
	if block == nil {
		return nil, fmt.Errorf("public key file is not valid PEM")
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse public key: %w", err)
	}
	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("key is not an RSA public key")
	}
	return rsaPub, nil
}

func bearerMiddleware(publicKey *rsa.PublicKey, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := extractBearer(r)
		if !ok {
			jsonError(w, "missing or malformed token", http.StatusUnauthorized)
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
			// Only accept RS256 — reject all other algorithms
			if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return publicKey, nil
		})

		if err != nil || !token.Valid {
			if errors.Is(err, jwt.ErrTokenExpired) {
				jsonError(w, "token expired", http.StatusUnauthorized)
				return
			}
			jsonError(w, "invalid token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), contextKeyClaims, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func extractBearer(r *http.Request) (string, bool) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return "", false
	}
	parts := strings.SplitN(auth, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", false
	}
	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", false
	}
	return token, true
}

func GetClaims(r *http.Request) *Claims {
	claims, _ := r.Context().Value(contextKeyClaims).(*Claims)
	return claims
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("WWW-Authenticate", `Bearer realm="rclone-api"`)
	w.WriteHeader(status)
	fmt.Fprintf(w, `{"error":"%s"}`, msg)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

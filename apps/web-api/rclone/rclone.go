package rclone

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/rc"
	"github.com/rclone/rclone/fs/rc/rcserver"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	mongocfg "github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"

	_ "github.com/rclone/rclone/backend/all"
	_ "github.com/rclone/rclone/fs/operations"
	_ "github.com/rclone/rclone/fs/sync"
)

const rcAddr = "127.0.0.1:9090"

// --- JWT types ---

type contextKey string

const contextKeyClaims contextKey = "claims"

// Claims are the JWT claims carried through the request context.
type Claims struct {
	UserID string `json:"sub"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// GetClaims extracts claims from a request that passed through the bearer middleware.
func GetClaims(r *http.Request) *Claims {
	claims, _ := r.Context().Value(contextKeyClaims).(*Claims)
	return claims
}

// --- Handler ---

// Config holds all parameters needed to initialise the rclone handler.
type Config struct {
	MongoURI         string
	EncryptionKey    []byte
	JWTPublicKeyPath string
}

// Handler owns the rclone RC server life-cycle, MongoDB-backed config,
// and the JWT-protected reverse proxy.
type Handler struct {
	publicKey *rsa.PublicKey
	client    *mongo.Client
}

// NewHandler connects to MongoDB, loads the encrypted rclone config,
// starts the internal RC server, and prepares the JWT-protected proxy.
func NewHandler(ctx context.Context, cfg Config) (*Handler, error) {
	// MongoDB
	client, err := mongo.Connect(options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		return nil, fmt.Errorf("mongo connect: %w", err)
	}

	// Rclone config (encrypted in MongoDB)
	store, err := mongocfg.New(client.Database("rclone").Collection("configs"), cfg.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("init storage: %w", err)
	}
	if err := store.Load(); err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}
	config.SetData(store)

	// Internal RC server
	rc.Opt.Enabled = true
	rc.Opt.NoAuth = true
	rc.Opt.HTTP.ListenAddr = []string{rcAddr}
	if _, err := rcserver.Start(ctx, &rc.Opt); err != nil {
		return nil, fmt.Errorf("start rc server: %w", err)
	}

	// JWT public key
	publicKey, err := loadRSAPublicKey(cfg.JWTPublicKeyPath)
	if err != nil {
		return nil, fmt.Errorf("load public key: %w", err)
	}

	return &Handler{publicKey: publicKey, client: client}, nil
}

// RegisterRoutes mounts the JWT-protected rclone proxy on the given mux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	target, _ := url.Parse("http://" + rcAddr)
	proxy := httputil.NewSingleHostReverseProxy(target)
	mux.Handle("/", bearerMiddleware(h.publicKey, proxy))
}

// Shutdown disconnects the MongoDB client.
func (h *Handler) Shutdown(ctx context.Context) error {
	return h.client.Disconnect(ctx)
}

// --- Helpers ---

func loadRSAPublicKey(path string) (*rsa.PublicKey, error) {
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

// --- Middleware ---

func bearerMiddleware(publicKey *rsa.PublicKey, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := extractBearer(r)
		if !ok {
			jsonError(w, "missing or malformed token", http.StatusUnauthorized)
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
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
	h := r.Header.Get("Authorization")
	if h == "" {
		return "", false
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", false
	}
	tok := strings.TrimSpace(parts[1])
	if tok == "" {
		return "", false
	}
	return tok, true
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("WWW-Authenticate", `Bearer realm="rclone-api"`)
	w.WriteHeader(status)
	fmt.Fprintf(w, `{"error":"%s"}`, msg)
}

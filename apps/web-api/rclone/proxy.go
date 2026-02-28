package rclone

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	sharedjwt "github.com/ekarton/RClone-Cloud/apps/web-api/shared/jwt"
	"github.com/golang-jwt/jwt/v5"
)

// GetClaims extracts claims from a request that passed through the bearer middleware.
// This is now a wrapper around sharedjwt.GetClaims for backward compatibility if needed,
// but we should eventually update callers to use sharedjwt.GetClaims directly.
func GetClaims(r *http.Request) *sharedjwt.Claims {
	return sharedjwt.GetClaims(r)
}

// --- Handler ---

// ProxyHandler owns the JWT-protected reverse proxy.
type ProxyHandler struct {
	publicKey any
	rcAddr    string
}

// NewProxyHandler prepares the JWT-protected proxy.
func NewProxyHandler(pubKeyPEM string, rcAddr string) (*ProxyHandler, error) {
	publicKey, err := sharedjwt.LoadPublicKey(pubKeyPEM)
	if err != nil {
		return nil, fmt.Errorf("load public key: %w", err)
	}

	return &ProxyHandler{publicKey: publicKey, rcAddr: rcAddr}, nil
}

// RegisterRoutes mounts the JWT-protected rclone proxy on the given mux.
func (h *ProxyHandler) RegisterRoutes(mux *http.ServeMux) {
	target, _ := url.Parse("http://" + h.rcAddr)
	proxy := httputil.NewSingleHostReverseProxy(target)
	mux.Handle("/api/v1/rclone/", bearerMiddleware(h.publicKey, http.StripPrefix("/api/v1/rclone", proxy)))
}

// --- Middleware ---

func bearerMiddleware(publicKey any, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := extractBearer(r)
		if !ok {
			jsonError(w, "missing or malformed token", http.StatusUnauthorized)
			return
		}

		claims, err := sharedjwt.VerifyToken(raw, publicKey)
		if err != nil {
			if errors.Is(err, jwt.ErrTokenExpired) {
				jsonError(w, "token expired", http.StatusUnauthorized)
				return
			}
			jsonError(w, "invalid token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), sharedjwt.ContextKeyClaims, claims)
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

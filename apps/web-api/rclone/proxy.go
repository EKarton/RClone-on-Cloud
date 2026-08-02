package rclone

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	sharedjwt "github.com/ekarton/RClone-Cloud/apps/web-api/shared/jwt"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/rc"
	"github.com/rclone/rclone/fs/rc/jobs"
)

// The RClone API handler
type RCloneAPIHandler struct {
	// The RSA public key used to verify JWT tokens.
	publicKey any
}

// Creates a new RClone API handler.
func NewRCloneAPIHandler(pubKeyPEM string, store config.Storage) (*RCloneAPIHandler, error) {
	// Initialize global rclone state — match rclone rcd behavior
	config.SetData(store)
	rc.Opt.Enabled = true
	rc.Opt.NoAuth = true
	rc.Opt.Serve = true  // equivalent to --rc-serve
	jobs.SetOpt(&rc.Opt) // configure job expiry (matches rcserver.Start)

	publicKey, err := sharedjwt.LoadPublicKey(pubKeyPEM)
	if err != nil {
		return nil, fmt.Errorf("load public key: %w", err)
	}

	return &RCloneAPIHandler{publicKey: publicKey}, nil
}

// Mounts the RClone API handler on the given mux.
func (h *RCloneAPIHandler) RegisterRoutes(mux *http.ServeMux) {
	handler := NewRCHandler()
	mux.Handle("/api/v1/rclone/", bearerMiddleware(h.publicKey, http.StripPrefix("/api/v1/rclone", handler)))
}

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
	if status == http.StatusUnauthorized {
		w.Header().Set("WWW-Authenticate", `Bearer realm="rclone-api"`)
	}
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

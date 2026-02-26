package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/idtoken"
)

const (
	// stateCookieName is the cookie used to store the OAuth2 CSRF state.
	stateCookieName = "oauth_state"
	// defaultTokenTTL is how long issued JWTs are valid.
	defaultTokenTTL = 1 * time.Hour
)

// GoogleUserInfo holds the fields we extract from the verified Google ID token.
type GoogleUserInfo struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
}

// TokenResponse is the JSON returned to the client after successful login.
type TokenResponse struct {
	Token string `json:"token"`
}

// ErrorResponse is the standard error JSON we return.
type ErrorResponse struct {
	Error string `json:"error"`
}

// --- Interfaces for testability ---

// TokenExchanger exchanges an authorization code for an OAuth2 token.
type TokenExchanger interface {
	Exchange(ctx context.Context, code string, opts ...oauth2.AuthCodeOption) (*oauth2.Token, error)
}

// IDTokenValidator validates a Google ID token and returns the payload.
type IDTokenValidator interface {
	Validate(ctx context.Context, idToken string, audience string) (*idtoken.Payload, error)
}

// googleIDTokenValidator is the production implementation.
type googleIDTokenValidator struct{}

func (g *googleIDTokenValidator) Validate(ctx context.Context, idToken string, audience string) (*idtoken.Payload, error) {
	return idtoken.Validate(ctx, idToken, audience)
}

// --- Handler ---

// Handler serves the Google OAuth2 login flow and issues JWTs.
type Handler struct {
	oauthConfig *oauth2.Config
	privateKey  *rsa.PrivateKey
	tokenTTL    time.Duration
	exchanger   TokenExchanger
	idValidator IDTokenValidator
}

// Config holds the parameters needed to create a Handler.
type Config struct {
	GoogleClientID     string
	GoogleClientSecret string
	RedirectURL        string
	PrivateKeyPath     string
}

// NewHandler creates an auth Handler from the given config.
func NewHandler(cfg Config) (*Handler, error) {
	privateKey, err := loadRSAPrivateKey(cfg.PrivateKeyPath)
	if err != nil {
		return nil, fmt.Errorf("load private key: %w", err)
	}

	oauthCfg := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.RedirectURL,
		Scopes:       []string{"openid", "email"},
		Endpoint:     google.Endpoint,
	}

	return &Handler{
		oauthConfig: oauthCfg,
		privateKey:  privateKey,
		tokenTTL:    defaultTokenTTL,
		exchanger:   oauthCfg,
		idValidator: &googleIDTokenValidator{},
	}, nil
}

// NewHandlerWithDeps creates a Handler with injectable dependencies (for testing).
func NewHandlerWithDeps(oauthCfg *oauth2.Config, privateKey *rsa.PrivateKey, exchanger TokenExchanger, validator IDTokenValidator) *Handler {
	return &Handler{
		oauthConfig: oauthCfg,
		privateKey:  privateKey,
		tokenTTL:    defaultTokenTTL,
		exchanger:   exchanger,
		idValidator: validator,
	}
}

// RegisterRoutes mounts /auth/login and /auth/callback on the given mux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /auth/login", h.HandleLogin)
	mux.HandleFunc("GET /auth/callback", h.HandleCallback)
}

// HandleLogin redirects the user to Google's consent screen.
func (h *Handler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	state, err := randomState(32)
	if err != nil {
		writeError(w, "could not generate state", http.StatusInternalServerError)
		return
	}

	// Store state in a secure, short-lived cookie for CSRF protection.
	http.SetCookie(w, &http.Cookie{
		Name:     stateCookieName,
		Value:    state,
		Path:     "/",
		MaxAge:   300, // 5 minutes
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   r.TLS != nil,
	})

	url := h.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusFound)
}

// HandleCallback handles the redirect from Google after user consent.
func (h *Handler) HandleCallback(w http.ResponseWriter, r *http.Request) {
	// 1. Verify state for CSRF protection
	cookie, err := r.Cookie(stateCookieName)
	if err != nil || cookie.Value == "" {
		writeError(w, "missing state cookie", http.StatusForbidden)
		return
	}
	queryState := r.URL.Query().Get("state")
	if queryState == "" || queryState != cookie.Value {
		writeError(w, "state mismatch", http.StatusForbidden)
		return
	}

	// Clear the state cookie
	http.SetCookie(w, &http.Cookie{
		Name:   stateCookieName,
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	// 2. Exchange authorization code for token
	code := r.URL.Query().Get("code")
	if code == "" {
		writeError(w, "missing code parameter", http.StatusBadRequest)
		return
	}

	oauthToken, err := h.exchanger.Exchange(r.Context(), code)
	if err != nil {
		log.Printf("token exchange failed: %v", err)
		writeError(w, "token exchange failed", http.StatusUnauthorized)
		return
	}

	// 3. Extract and validate the Google ID token from the OAuth2 response
	rawIDToken, ok := oauthToken.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		writeError(w, "no id_token in response", http.StatusUnauthorized)
		return
	}

	payload, err := h.idValidator.Validate(r.Context(), rawIDToken, h.oauthConfig.ClientID)
	if err != nil {
		log.Printf("id token validation failed: %v", err)
		writeError(w, "id token validation failed", http.StatusUnauthorized)
		return
	}

	// 4. Extract user info from validated payload
	userID, _ := payload.Claims["sub"].(string)
	email, _ := payload.Claims["email"].(string)
	if userID == "" {
		writeError(w, "missing sub in id_token", http.StatusUnauthorized)
		return
	}

	// 5. Issue our own JWT
	signedToken, err := h.signJWT(userID, email)
	if err != nil {
		log.Printf("jwt signing failed: %v", err)
		writeError(w, "could not issue token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TokenResponse{Token: signedToken})
}

// signJWT creates an RS256-signed JWT with the given user info.
func (h *Handler) signJWT(userID, email string) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"iat":   now.Unix(),
		"exp":   now.Add(h.tokenTTL).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(h.privateKey)
}

// --- Helpers ---

// loadRSAPrivateKey reads a PEM-encoded RSA private key from disk.
func loadRSAPrivateKey(path string) (*rsa.PrivateKey, error) {
	if path == "" {
		return nil, fmt.Errorf("JWT_PRIVATE_KEY_PATH is not set")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read private key: %w", err)
	}
	block, _ := pem.Decode(data)
	if block == nil {
		return nil, fmt.Errorf("private key file is not valid PEM")
	}

	// Try PKCS#8 first, then fall back to PKCS#1
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		rsaKey, err2 := x509.ParsePKCS1PrivateKey(block.Bytes)
		if err2 != nil {
			return nil, fmt.Errorf("parse private key: pkcs8=%v, pkcs1=%v", err, err2)
		}
		return rsaKey, nil
	}
	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("private key is not RSA")
	}
	return rsaKey, nil
}

func randomState(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

func writeError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: msg})
}

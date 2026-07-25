package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/idtoken"

	sharedjwt "github.com/ekarton/RClone-Cloud/apps/web-api/shared/jwt"
)

const (
	// defaultTokenTTL is how long issued JWTs are valid.
	defaultTokenTTL = 15 * time.Minute
)

// GoogleUserInfo holds the fields we extract from the verified Google ID token.
type GoogleUserInfo struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
}

// TokenResponse is the JSON returned to the client after successful login.
type TokenResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token,omitempty"`
}

// ErrorResponse is the standard error JSON we return.
type ErrorResponse struct {
	Error string `json:"error"`
}

// CallbackRequest is the JSON body for the callback request.
type CallbackRequest struct {
	Code         string `json:"code"`
	CodeVerifier string `json:"code_verifier"`
	State        string `json:"state"`
}

// RefreshRequest is the JSON body for the refresh request.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// --- Interfaces for testability ---

// TokenExchanger exchanges an authorization code for an OAuth2 token.
type TokenExchanger interface {
	Exchange(ctx context.Context, code string, opts ...oauth2.AuthCodeOption) (*oauth2.Token, error)
}

// TokenStore manages refresh tokens.
type TokenStore interface {
	Store(ctx context.Context, userID, email, refreshToken string) error
	ValidateAndRevoke(ctx context.Context, refreshToken string) (string, string, error)
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
	oauthConfig       *oauth2.Config
	privateKey        any
	tokenTTL          time.Duration
	exchanger         TokenExchanger
	idValidator       IDTokenValidator
	allowedGoogleIDs  map[string]bool
	allowAllGoogleIDs bool
	hmacKey           []byte
	tokenStore        TokenStore
}

// Config holds the parameters needed to create a Handler.
type Config struct {
	GoogleClientID     string
	GoogleClientSecret string
	RedirectURL        string
	PrivateKeyPEM      string
	AllowedGoogleIDs   []string
}

// NewHandler creates an auth Handler from the given config.
func NewHandler(cfg Config, store TokenStore) (*Handler, error) {
	privateKey, err := sharedjwt.LoadPrivateKey(cfg.PrivateKeyPEM)
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

	allowedGoogleIDs := make(map[string]bool)
	var allowAll bool
	for _, id := range cfg.AllowedGoogleIDs {
		if id == "*" {
			allowAll = true
		}
		allowedGoogleIDs[id] = true
	}

	// Derive an HMAC key from the private key PEM for signing state cookies.
	hmacKey := deriveHMACKey(cfg.PrivateKeyPEM)

	return &Handler{
		oauthConfig:       oauthCfg,
		privateKey:        privateKey,
		tokenTTL:          defaultTokenTTL,
		exchanger:         oauthCfg,
		idValidator:       &googleIDTokenValidator{},
		allowedGoogleIDs:  allowedGoogleIDs,
		allowAllGoogleIDs: allowAll,
		hmacKey:           hmacKey,
		tokenStore:        store,
	}, nil
}

// RegisterRoutes mounts /auth/login and /auth/callback on the given mux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /auth/v1/google/login", h.handleLogin)
	mux.HandleFunc("POST /auth/v1/google/callback", h.handleCallback)
	mux.HandleFunc("POST /auth/v1/google/refresh", h.handleRefresh)
}

// handleLogin redirects the user to Google's consent screen.
func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	if state == "" {
		writeError(w, "missing state parameter", http.StatusBadRequest)
		return
	}

	challenge := r.URL.Query().Get("challenge")
	if challenge == "" {
		writeError(w, "missing challenge parameter", http.StatusBadRequest)
		return
	}

	codeChallengeMethod := r.URL.Query().Get("code_challenge_method")
	if codeChallengeMethod == "" {
		writeError(w, "missing code_challenge_method parameter", http.StatusBadRequest)
		return
	}

	url := h.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("code_challenge", challenge), oauth2.SetAuthURLParam("code_challenge_method", codeChallengeMethod))

	// Set a signed, HttpOnly cookie with the state value for CSRF validation in the callback.
	signedState := h.signState(state)
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    signedState,
		Path:     "/",
		MaxAge:   300, // 5 minutes
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})

	http.Redirect(w, r, url, http.StatusFound)
}

// HandleCallback handles the redirect from Google after user consent.
func (h *Handler) handleCallback(w http.ResponseWriter, r *http.Request) {
	// 1. Parse JSON body
	var req CallbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	code := req.Code
	if code == "" {
		writeError(w, "missing code parameter", http.StatusBadRequest)
		return
	}

	// 2. Validate CSRF state: the state from the POST body must match the
	// HMAC signature stored in the HttpOnly cookie set during login.
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value == "" {
		writeError(w, "missing oauth_state cookie", http.StatusForbidden)
		return
	}
	if req.State == "" {
		writeError(w, "missing state parameter", http.StatusBadRequest)
		return
	}
	if !h.verifyState(req.State, stateCookie.Value) {
		writeError(w, "invalid state parameter", http.StatusForbidden)
		return
	}

	// Clear the state cookie after successful validation.
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})

	oauthToken, err := h.exchanger.Exchange(r.Context(), code, oauth2.VerifierOption(req.CodeVerifier))
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
	if userID == "" || email == "" {
		writeError(w, "missing sub or email in id_token", http.StatusUnauthorized)
		return
	}

	// SECURITY: Ensure the user is explicitly authorized to access the API by their Google ID (sub).
	if !h.allowAllGoogleIDs && !h.allowedGoogleIDs[userID] {
		log.Printf("unauthorized login attempt from user ID: %s (email: %s)", userID, email)
		writeError(w, "unauthorized access", http.StatusForbidden)
		return
	}

	// 5. Issue our own JWT
	signedToken, err := h.signJWT(userID, email)
	if err != nil {
		log.Printf("jwt signing failed: %v", err)
		writeError(w, "could not issue token", http.StatusInternalServerError)
		return
	}

	// 6. Generate and store Refresh Token
	var refreshToken string
	if h.tokenStore != nil {
		rt, err := sharedjwt.GenerateRefreshToken()
		if err != nil {
			log.Printf("refresh token generation failed: %v", err)
			writeError(w, "could not issue refresh token", http.StatusInternalServerError)
			return
		}
		if err := h.tokenStore.Store(r.Context(), userID, email, rt); err != nil {
			log.Printf("refresh token storage failed: %v", err)
			writeError(w, "could not store refresh token", http.StatusInternalServerError)
			return
		}
		refreshToken = rt
	}

	log.Printf("granted token for user: %s", userID)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(TokenResponse{
		Token:        signedToken,
		RefreshToken: refreshToken,
	})
}

// handleRefresh handles exchanging a valid refresh token for a new access token.
func (h *Handler) handleRefresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.RefreshToken == "" {
		writeError(w, "missing refresh token", http.StatusBadRequest)
		return
	}
	if h.tokenStore == nil {
		writeError(w, "refresh tokens not supported", http.StatusInternalServerError)
		return
	}

	// Validate and revoke the old refresh token
	userID, email, err := h.tokenStore.ValidateAndRevoke(r.Context(), req.RefreshToken)
	if err != nil {
		writeError(w, "invalid or expired refresh token", http.StatusUnauthorized)
		return
	}

	// Generate a new refresh token (rotation)
	newRefreshToken, err := sharedjwt.GenerateRefreshToken()
	if err != nil {
		log.Printf("refresh token generation failed: %v", err)
		writeError(w, "could not issue new refresh token", http.StatusInternalServerError)
		return
	}
	if err := h.tokenStore.Store(r.Context(), userID, email, newRefreshToken); err != nil {
		log.Printf("refresh token storage failed: %v", err)
		writeError(w, "could not store new refresh token", http.StatusInternalServerError)
		return
	}

	// Issue a new access token
	signedToken, err := h.signJWT(userID, email)
	if err != nil {
		log.Printf("jwt signing failed during refresh: %v", err)
		writeError(w, "could not issue new token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(TokenResponse{
		Token:        signedToken,
		RefreshToken: newRefreshToken,
	})
}

// signJWT creates a signed JWT with the given user info.
func (h *Handler) signJWT(userID, email string) (string, error) {
	return sharedjwt.SignToken(h.privateKey, h.tokenTTL, userID, email)
}

func writeError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorResponse{Error: msg})
}

// deriveHMACKey derives a fixed HMAC key from the private key PEM.
// This avoids needing a separate secret for cookie signing.
func deriveHMACKey(privateKeyPEM string) []byte {
	h := sha256.Sum256([]byte(privateKeyPEM))
	return h[:]
}

// signState computes an HMAC-SHA256 of the state value.
func (h *Handler) signState(state string) string {
	mac := hmac.New(sha256.New, h.hmacKey)
	mac.Write([]byte(state))
	return hex.EncodeToString(mac.Sum(nil))
}

// verifyState checks that the provided state matches the HMAC signature.
func (h *Handler) verifyState(state, signature string) bool {
	expected := h.signState(state)
	return hmac.Equal([]byte(expected), []byte(signature))
}

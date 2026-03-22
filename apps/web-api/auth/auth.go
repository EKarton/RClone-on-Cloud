package auth

import (
	"context"
	"encoding/json"
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

// CallbackRequest is the JSON body for the callback request.
type CallbackRequest struct {
	Code string `json:"code"`
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
	oauthConfig      *oauth2.Config
	privateKey       any
	tokenTTL         time.Duration
	exchanger        TokenExchanger
	idValidator      IDTokenValidator
	allowedGoogleIDs map[string]bool
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
func NewHandler(cfg Config) (*Handler, error) {
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
	for _, id := range cfg.AllowedGoogleIDs {
		allowedGoogleIDs[id] = true
	}

	return &Handler{
		oauthConfig:      oauthCfg,
		privateKey:       privateKey,
		tokenTTL:         defaultTokenTTL,
		exchanger:        oauthCfg,
		idValidator:      &googleIDTokenValidator{},
		allowedGoogleIDs: allowedGoogleIDs,
	}, nil
}

// RegisterRoutes mounts /auth/login and /auth/callback on the given mux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /auth/v1/google/login", h.handleLogin)
	mux.HandleFunc("POST /auth/v1/google/callback", h.handleCallback)
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
	http.Redirect(w, r, url, http.StatusFound)
}

// HandleCallback handles the redirect from Google after user consent.
func (h *Handler) handleCallback(w http.ResponseWriter, r *http.Request) {
	// 1. In a production environment, you should verify the state for CSRF protection.
	// However, we are removing the state cookie as requested.

	// 2. Exchange authorization code for token
	var code string
	var req CallbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
		code = req.Code
	}

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
	if userID == "" || email == "" {
		writeError(w, "missing sub or email in id_token", http.StatusUnauthorized)
		return
	}

	// SECURITY: Ensure the user is explicitly authorized to access the API by their Google ID (sub).
	if !h.allowedGoogleIDs[userID] {
		log.Printf("unauthorized login attempt from user ID: %s (email: %s)", userID, email)
		writeError(w, fmt.Sprintf("unauthorized access for user id: %s", userID), http.StatusForbidden)
		return
	}

	// 5. Issue our own JWT
	signedToken, err := h.signJWT(userID, email)
	if err != nil {
		log.Printf("jwt signing failed: %v", err)
		writeError(w, "could not issue token", http.StatusInternalServerError)
		return
	}

	log.Printf("granted token for user: %s", userID)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(TokenResponse{Token: signedToken})
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

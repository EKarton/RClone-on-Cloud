package auth_test

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/oauth2"
	"google.golang.org/api/idtoken"

	"github.com/ekarton/RClone-Cloud/apps/web-api/auth"
)

// --- Test helpers ---

// testPrivateKey is a fresh RSA key pair generated per test run.
var testPrivateKey *rsa.PrivateKey

func init() {
	var err error
	testPrivateKey, err = rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic("failed to generate test RSA key: " + err.Error())
	}
}

// mockExchanger simulates the Google token exchange.
type mockExchanger struct {
	token *oauth2.Token
	err   error
}

func (m *mockExchanger) Exchange(_ context.Context, _ string, _ ...oauth2.AuthCodeOption) (*oauth2.Token, error) {
	return m.token, m.err
}

// mockValidator simulates Google ID token validation.
type mockValidator struct {
	payload *idtoken.Payload
	err     error
}

func (m *mockValidator) Validate(_ context.Context, _ string, _ string) (*idtoken.Payload, error) {
	return m.payload, m.err
}

// newTestHandler creates a Handler with mocked Google dependencies.
func newTestHandler(exchanger auth.TokenExchanger, validator auth.IDTokenValidator) *auth.Handler {
	oauthCfg := &oauth2.Config{
		ClientID:     "test-client-id",
		ClientSecret: "test-client-secret",
		RedirectURL:  "http://localhost:8080/auth/callback",
		Scopes:       []string{"openid", "email"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://accounts.google.com/o/oauth2/auth",
			TokenURL: "https://oauth2.googleapis.com/token",
		},
	}
	return auth.NewHandlerWithDeps(oauthCfg, testPrivateKey, exchanger, validator)
}

// --- /auth/login tests ---

func TestLoginRedirect(t *testing.T) {
	h := newTestHandler(nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
	rec := httptest.NewRecorder()
	h.HandleLogin(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	assert.Equal(t, http.StatusFound, resp.StatusCode)

	location := resp.Header.Get("Location")
	assert.Contains(t, location, "accounts.google.com")
	assert.Contains(t, location, "client_id=test-client-id")
	assert.Contains(t, location, "redirect_uri=")
	assert.Contains(t, location, "scope=")
	assert.Contains(t, location, "state=")

	// Verify a state cookie was set
	cookies := resp.Cookies()
	var stateCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "oauth_state" {
			stateCookie = c
		}
	}
	require.NotNil(t, stateCookie, "state cookie must be set")
	assert.NotEmpty(t, stateCookie.Value)
	assert.True(t, stateCookie.HttpOnly)
}

// --- /auth/callback tests ---

func TestCallbackMissingCode(t *testing.T) {
	h := newTestHandler(&mockExchanger{}, &mockValidator{})

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?state=abc", nil)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "abc"})
	rec := httptest.NewRecorder()
	h.HandleCallback(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	var errResp auth.ErrorResponse
	json.NewDecoder(resp.Body).Decode(&errResp)
	assert.Contains(t, errResp.Error, "missing code")
}

func TestCallbackMissingStateCookie(t *testing.T) {
	h := newTestHandler(&mockExchanger{}, &mockValidator{})

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=abc&state=abc", nil)
	// No state cookie!
	rec := httptest.NewRecorder()
	h.HandleCallback(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	assert.Equal(t, http.StatusForbidden, resp.StatusCode)
}

func TestCallbackStateMismatch(t *testing.T) {
	h := newTestHandler(&mockExchanger{}, &mockValidator{})

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=abc&state=wrong", nil)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "expected"})
	rec := httptest.NewRecorder()
	h.HandleCallback(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	assert.Equal(t, http.StatusForbidden, resp.StatusCode)

	var errResp auth.ErrorResponse
	json.NewDecoder(resp.Body).Decode(&errResp)
	assert.Contains(t, errResp.Error, "state mismatch")
}

func TestCallbackInvalidGoogleToken(t *testing.T) {
	exchanger := &mockExchanger{
		err: assert.AnError,
	}
	h := newTestHandler(exchanger, &mockValidator{})

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=badcode&state=abc", nil)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "abc"})
	rec := httptest.NewRecorder()
	h.HandleCallback(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	var errResp auth.ErrorResponse
	json.NewDecoder(resp.Body).Decode(&errResp)
	assert.Contains(t, errResp.Error, "token exchange failed")
}

func TestCallbackNoIDToken(t *testing.T) {
	// OAuth2 token without an id_token extra field
	oauthToken := &oauth2.Token{
		AccessToken: "access-token",
		TokenType:   "Bearer",
		Expiry:      time.Now().Add(1 * time.Hour),
	}
	exchanger := &mockExchanger{token: oauthToken}
	h := newTestHandler(exchanger, &mockValidator{})

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=goodcode&state=abc", nil)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "abc"})
	rec := httptest.NewRecorder()
	h.HandleCallback(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	var errResp auth.ErrorResponse
	json.NewDecoder(resp.Body).Decode(&errResp)
	assert.Contains(t, errResp.Error, "no id_token")
}

func TestCallbackIDTokenValidationFails(t *testing.T) {
	oauthToken := (&oauth2.Token{
		AccessToken: "access-token",
		TokenType:   "Bearer",
		Expiry:      time.Now().Add(1 * time.Hour),
	}).WithExtra(map[string]interface{}{"id_token": "fake.id.token"})

	exchanger := &mockExchanger{token: oauthToken}
	validator := &mockValidator{err: assert.AnError}
	h := newTestHandler(exchanger, validator)

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=goodcode&state=abc", nil)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "abc"})
	rec := httptest.NewRecorder()
	h.HandleCallback(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	var errResp auth.ErrorResponse
	json.NewDecoder(resp.Body).Decode(&errResp)
	assert.Contains(t, errResp.Error, "id token validation failed")
}

func TestCallbackSuccess(t *testing.T) {
	// Build a mock OAuth2 token with an id_token extra
	oauthToken := (&oauth2.Token{
		AccessToken: "access-token",
		TokenType:   "Bearer",
		Expiry:      time.Now().Add(1 * time.Hour),
	}).WithExtra(map[string]interface{}{
		"id_token": "mock.google.idtoken",
	})

	exchanger := &mockExchanger{token: oauthToken}
	validator := &mockValidator{
		payload: &idtoken.Payload{
			Issuer:   "https://accounts.google.com",
			Audience: "test-client-id",
			Expires:  time.Now().Add(1 * time.Hour).Unix(),
			IssuedAt: time.Now().Unix(),
			Subject:  "google-user-123",
			Claims: map[string]interface{}{
				"sub":   "google-user-123",
				"email": "user@example.com",
			},
		},
	}
	h := newTestHandler(exchanger, validator)

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=goodcode&state=abc", nil)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "abc"})
	rec := httptest.NewRecorder()
	h.HandleCallback(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var tokenResp auth.TokenResponse
	err := json.NewDecoder(resp.Body).Decode(&tokenResp)
	require.NoError(t, err)
	require.NotEmpty(t, tokenResp.Token)

	// Verify the issued JWT is valid and contains expected claims
	parsed, err := jwt.Parse(tokenResp.Token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return &testPrivateKey.PublicKey, nil
	})
	require.NoError(t, err)
	require.True(t, parsed.Valid)

	claims, ok := parsed.Claims.(jwt.MapClaims)
	require.True(t, ok)
	assert.Equal(t, "google-user-123", claims["sub"])
	assert.Equal(t, "user@example.com", claims["email"])
	assert.NotNil(t, claims["exp"])
	assert.NotNil(t, claims["iat"])
}

func TestSignAndVerifyJWT(t *testing.T) {
	// This tests the full sign→verify round trip independently.
	oauthToken := (&oauth2.Token{
		AccessToken: "at",
		TokenType:   "Bearer",
		Expiry:      time.Now().Add(1 * time.Hour),
	}).WithExtra(map[string]interface{}{
		"id_token": "x.y.z",
	})

	exchanger := &mockExchanger{token: oauthToken}
	validator := &mockValidator{
		payload: &idtoken.Payload{
			Subject: "user-456",
			Claims: map[string]interface{}{
				"sub":   "user-456",
				"email": "test@test.com",
			},
		},
	}
	h := newTestHandler(exchanger, validator)

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=c&state=s", nil)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "s"})
	rec := httptest.NewRecorder()
	h.HandleCallback(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var tokenResp auth.TokenResponse
	json.NewDecoder(resp.Body).Decode(&tokenResp)

	// Verify using the public key counterpart
	token, err := jwt.Parse(tokenResp.Token, func(t *jwt.Token) (interface{}, error) {
		return &testPrivateKey.PublicKey, nil
	})
	require.NoError(t, err)
	require.True(t, token.Valid)

	claims := token.Claims.(jwt.MapClaims)
	assert.Equal(t, "user-456", claims["sub"])
	assert.Equal(t, "test@test.com", claims["email"])

	// Verify expiration is roughly 1 hour from now
	exp, err := claims.GetExpirationTime()
	require.NoError(t, err)
	diff := time.Until(exp.Time)
	assert.InDelta(t, float64(time.Hour), float64(diff), float64(5*time.Second))
}

func TestCallbackMissingSub(t *testing.T) {
	oauthToken := (&oauth2.Token{
		AccessToken: "at",
		TokenType:   "Bearer",
		Expiry:      time.Now().Add(1 * time.Hour),
	}).WithExtra(map[string]interface{}{
		"id_token": "x.y.z",
	})

	exchanger := &mockExchanger{token: oauthToken}
	validator := &mockValidator{
		payload: &idtoken.Payload{
			Claims: map[string]interface{}{
				// No "sub" claim
				"email": "user@example.com",
			},
		},
	}
	h := newTestHandler(exchanger, validator)

	req := httptest.NewRequest(http.MethodGet, "/auth/callback?code=c&state=s", nil)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "s"})
	rec := httptest.NewRecorder()
	h.HandleCallback(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	var errResp auth.ErrorResponse
	json.NewDecoder(resp.Body).Decode(&errResp)
	assert.Contains(t, errResp.Error, "missing sub")
}

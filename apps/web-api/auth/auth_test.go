package auth

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	sharedjwt "github.com/ekarton/RClone-Cloud/apps/web-api/shared/jwt"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/oauth2"
	"google.golang.org/api/idtoken"
)

// --- Test helpers ---

// testPrivateKey is a fresh key pair generated per test run.
var testPrivateKey any

func init() {
	var err error
	testPrivateKey, err = rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic("failed to generate test RSA key: " + err.Error())
	}
}

// getPrivateKeyPEM returns the test private key as a PEM string.
func getPrivateKeyPEM(t *testing.T) string {
	t.Helper()

	privBytes, err := x509.MarshalPKCS8PrivateKey(testPrivateKey)
	require.NoError(t, err)
	pemBlock := &pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: privBytes,
	}

	return string(pem.EncodeToMemory(pemBlock))
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

// newTestHandler creates a Handler with mocked Google dependencies using NewHandler.
func newTestHandler(t *testing.T, exchanger TokenExchanger, validator IDTokenValidator) (*Handler, *http.ServeMux) {
	t.Helper()

	pem := getPrivateKeyPEM(t)

	cfg := Config{
		GoogleClientID:     "test-client-id",
		GoogleClientSecret: "test-client-secret",
		RedirectURL:        "http://localhost:8080/auth/v1/google/callback",
		PrivateKeyPEM:      pem,
		AllowedGoogleIDs:   []string{"google-user-123", "user-456"},
	}

	h, err := NewHandler(cfg)
	require.NoError(t, err)

	// Override real dependencies with the mocks if provided
	if exchanger != nil {
		h.exchanger = exchanger
	}
	if validator != nil {
		h.idValidator = validator
	}

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	return h, mux
}

func TestLoginRedirect(t *testing.T) {
	_, mux := newTestHandler(t, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/auth/v1/google/login?state=test-state", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	assert.Equal(t, http.StatusFound, resp.StatusCode)
	location := resp.Header.Get("Location")
	assert.Contains(t, location, "accounts.google.com")
	assert.Contains(t, location, "state=test-state")
}

func TestLoginRedirectMissingState(t *testing.T) {
	_, mux := newTestHandler(t, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/auth/v1/google/login", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	var errResp ErrorResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&errResp))
	assert.Contains(t, errResp.Error, "missing state")
}

func TestCallbackMissingCode(t *testing.T) {
	_, mux := newTestHandler(t, &mockExchanger{}, &mockValidator{})

	req := httptest.NewRequest(http.MethodPost, "/auth/v1/google/callback?state=abc", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	var errResp ErrorResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&errResp))
	assert.Contains(t, errResp.Error, "missing code")
}

func TestCallbackInvalidGoogleToken(t *testing.T) {
	exchanger := &mockExchanger{
		err: assert.AnError,
	}
	_, mux := newTestHandler(t, exchanger, &mockValidator{})

	body, _ := json.Marshal(CallbackRequest{Code: "badcode"})
	req := httptest.NewRequest(http.MethodPost, "/auth/v1/google/callback?state=abc", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	var errResp ErrorResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&errResp))
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
	_, mux := newTestHandler(t, exchanger, &mockValidator{})

	body, _ := json.Marshal(CallbackRequest{Code: "goodcode"})
	req := httptest.NewRequest(http.MethodPost, "/auth/v1/google/callback?state=abc", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "abc"})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	var errResp ErrorResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&errResp))
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
	_, mux := newTestHandler(t, exchanger, validator)

	body, _ := json.Marshal(CallbackRequest{Code: "goodcode"})
	req := httptest.NewRequest(http.MethodPost, "/auth/v1/google/callback?state=abc", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	var errResp ErrorResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&errResp))
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
	_, mux := newTestHandler(t, exchanger, validator)

	body, _ := json.Marshal(CallbackRequest{Code: "goodcode"})
	req := httptest.NewRequest(http.MethodPost, "/auth/v1/google/callback?state=abc", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var tokenResp TokenResponse
	err := json.NewDecoder(resp.Body).Decode(&tokenResp)
	require.NoError(t, err)
	require.NotEmpty(t, tokenResp.Token)

	// Verify using the public key counterpart
	parsed, err := jwt.ParseWithClaims(tokenResp.Token, &sharedjwt.Claims{}, func(t *jwt.Token) (interface{}, error) {
		switch k := testPrivateKey.(type) {
		case *rsa.PrivateKey:
			if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return &k.PublicKey, nil
		case ed25519.PrivateKey:
			if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return k.Public(), nil
		default:
			return nil, jwt.ErrSignatureInvalid
		}
	})
	require.NoError(t, err)
	require.True(t, parsed.Valid)

	claims, ok := parsed.Claims.(*sharedjwt.Claims)
	require.True(t, ok)
	assert.Equal(t, "google-user-123", claims.UserID)
	assert.Equal(t, "user@example.com", claims.Email)
	assert.NotNil(t, claims.ExpiresAt)
	assert.NotNil(t, claims.IssuedAt)
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
	_, mux := newTestHandler(t, exchanger, validator)

	body, _ := json.Marshal(CallbackRequest{Code: "c"})
	req := httptest.NewRequest(http.MethodPost, "/auth/v1/google/callback?state=s", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var tokenResp TokenResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&tokenResp))

	// Verify using the public key counterpart
	token, err := jwt.ParseWithClaims(tokenResp.Token, &sharedjwt.Claims{}, func(t *jwt.Token) (interface{}, error) {
		switch k := testPrivateKey.(type) {
		case *rsa.PrivateKey:
			return &k.PublicKey, nil
		case ed25519.PrivateKey:
			return k.Public(), nil
		default:
			return nil, jwt.ErrSignatureInvalid
		}
	})
	require.NoError(t, err)
	require.True(t, token.Valid)

	claims := token.Claims.(*sharedjwt.Claims)
	assert.Equal(t, "user-456", claims.UserID)
	assert.Equal(t, "test@test.com", claims.Email)

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
	_, mux := newTestHandler(t, exchanger, validator)

	body, _ := json.Marshal(CallbackRequest{Code: "c"})
	req := httptest.NewRequest(http.MethodPost, "/auth/v1/google/callback?state=s", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	var errResp ErrorResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&errResp))
	assert.Contains(t, errResp.Error, "missing sub")
}
func TestCallbackJSONBodySuccess(t *testing.T) {
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
			Claims: map[string]interface{}{
				"sub":   "google-user-123",
				"email": "user@example.com",
			},
		},
	}
	_, mux := newTestHandler(t, exchanger, validator)

	body, _ := json.Marshal(CallbackRequest{Code: "goodcode"})
	req := httptest.NewRequest(http.MethodPost, "/auth/v1/google/callback", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	resp := rec.Result()
	defer func() {
		require.NoError(t, resp.Body.Close())
	}()

	require.Equal(t, http.StatusOK, resp.StatusCode)
}

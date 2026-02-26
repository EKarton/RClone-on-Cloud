package rclone

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProxyHandler(t *testing.T) {
	// 1. Setup a dummy backend server mimicking RClone RC
	backendCalled := false
	backendPath := ""

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		backendCalled = true
		backendPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer backend.Close()

	// 2. Generate an RSA Keypair
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	// Save Public Key to a temporary PEM file for NewProxyHandler
	pubBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	require.NoError(t, err)

	pemBlock := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubBytes,
	}

	pubKeyFile := filepath.Join(t.TempDir(), "public_key.pem")
	f, err := os.Create(pubKeyFile)
	require.NoError(t, err)
	err = pem.Encode(f, pemBlock)
	require.NoError(t, err)
	f.Close()

	// 3. Initialize ProxyHandler
	// Extract just the host:port from the backend URL string
	// backend.URL typically looks like "http://127.0.0.1:54321"
	rcAddr := backend.URL[7:] // strips "http://"

	proxy, err := NewProxyHandler(pubKeyFile, rcAddr)
	require.NoError(t, err)

	// Register it with a test router
	mux := http.NewServeMux()
	proxy.RegisterRoutes(mux)

	// Create a test server with our proxy mux
	ts := httptest.NewServer(mux)
	defer ts.Close()

	client := ts.Client()

	// Helper function to sign a JWT
	signJWT := func(sub, email string, expTime time.Time) string {
		claims := Claims{
			UserID: sub,
			Email:  email,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(expTime),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
		signed, err := token.SignedString(privateKey)
		require.NoError(t, err)
		return signed
	}

	// Helper function to sign a JWT with a different key (invalid signature)
	signInvalidJWT := func() string {
		diffKey, _ := rsa.GenerateKey(rand.Reader, 2048)
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{"sub": "123"})
		signed, _ := token.SignedString(diffKey)
		return signed
	}

	// --- Subtests --- //

	t.Run("No Token", func(t *testing.T) {
		backendCalled = false
		req, _ := http.NewRequest("GET", ts.URL+"/api/v1/rclone/config/listremotes", nil)
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

		body, _ := io.ReadAll(resp.Body)
		assert.Contains(t, string(body), "missing or malformed token")
		assert.False(t, backendCalled)
	})

	t.Run("Malformed Token", func(t *testing.T) {
		backendCalled = false
		req, _ := http.NewRequest("GET", ts.URL+"/api/v1/rclone/config/listremotes", nil)
		req.Header.Set("Authorization", "Bearer invalid.jwt.token")
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		assert.False(t, backendCalled)
	})

	t.Run("Invalid Signature", func(t *testing.T) {
		backendCalled = false
		req, _ := http.NewRequest("GET", ts.URL+"/api/v1/rclone/config/listremotes", nil)
		req.Header.Set("Authorization", "Bearer "+signInvalidJWT())
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		assert.False(t, backendCalled)
	})

	t.Run("Expired Token", func(t *testing.T) {
		backendCalled = false
		req, _ := http.NewRequest("GET", ts.URL+"/api/v1/rclone/config/listremotes", nil)
		req.Header.Set("Authorization", "Bearer "+signJWT("123", "test@test.com", time.Now().Add(-1*time.Hour)))
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

		body, _ := io.ReadAll(resp.Body)
		assert.Contains(t, string(body), "token expired")
		assert.False(t, backendCalled)
	})

	t.Run("Valid Token - Proxied Successfully", func(t *testing.T) {
		backendCalled = false
		backendPath = ""

		req, _ := http.NewRequest("GET", ts.URL+"/api/v1/rclone/config/listremotes", nil)
		req.Header.Set("Authorization", "Bearer "+signJWT("user-1", "user@test.com", time.Now().Add(1*time.Hour)))
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		body, _ := io.ReadAll(resp.Body)
		assert.Contains(t, string(body), `{"status":"ok"}`)

		assert.True(t, backendCalled)
		// Crucial assertion: the `/api/v1/rclone` prefix must be stripped!
		assert.Equal(t, "/config/listremotes", backendPath)
	})

	t.Run("Context Claims Verification", func(t *testing.T) {
		// Replace the httptest server entirely with a dummy handler that inspects Context.
		var extractedClaims *Claims
		mux := http.NewServeMux()
		mux.Handle("/api/v1/rclone/", bearerMiddleware(&privateKey.PublicKey, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			extractedClaims = GetClaims(r)
			w.WriteHeader(http.StatusOK)
		})))

		// For this test we bypass proxy since it's private and just test the exported `GetClaims` integration
		tsInternal := httptest.NewServer(mux)
		defer tsInternal.Close()

		req, _ := http.NewRequest("GET", tsInternal.URL+"/api/v1/rclone/test", nil)
		req.Header.Set("Authorization", "Bearer "+signJWT("target-sub", "target@email.com", time.Now().Add(1*time.Hour)))

		resp, err := client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NotNil(t, extractedClaims)
		assert.Equal(t, "target-sub", extractedClaims.UserID)
		assert.Equal(t, "target@email.com", extractedClaims.Email)
	})
}

func TestNewProxyHandlerFailures(t *testing.T) {
	t.Run("Missing Public Key File", func(t *testing.T) {
		_, err := NewProxyHandler("/does/not/exist.pem", "localhost:8080")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "read public key")
	})

	t.Run("Invalid Key Data", func(t *testing.T) {
		badFile := filepath.Join(t.TempDir(), "bad.pem")
		os.WriteFile(badFile, []byte("NOT A PEM"), 0644)

		_, err := NewProxyHandler(badFile, "localhost:8080")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "public key file is not valid PEM")
	})

	t.Run("Invalid Key Type", func(t *testing.T) {
		// Create a PEM block but not an RSA public key
		badFile := filepath.Join(t.TempDir(), "wrong_type.pem")
		pemBlock := &pem.Block{
			Type:  "PUBLIC KEY",
			Bytes: []byte("definitely not an rsa key"),
		}
		f, _ := os.Create(badFile)
		pem.Encode(f, pemBlock)
		f.Close()

		_, err := NewProxyHandler(badFile, "localhost:8080")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "parse public key")
	})
}

func TestExtractBearerEdgeCases(t *testing.T) {
	tests := []struct {
		name   string
		header string
		tok    string
		ok     bool
	}{
		{"Empty Header", "", "", false},
		{"Not Bearer", "Basic dXNlcjpwYXNz", "", false},
		{"Bearer Missing Token", "Bearer ", "", false},
		{"Bearer Missing Token Spaced", "Bearer    ", "", false},
		{"Valid", "Bearer abc.def.ghi", "abc.def.ghi", true},
		{"Valid Extra Spaces", "Bearer     abc.def.ghi", "abc.def.ghi", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			if tt.header != "" {
				req.Header.Set("Authorization", tt.header)
			}
			tok, ok := extractBearer(req)
			assert.Equal(t, tt.ok, ok)
			assert.Equal(t, tt.tok, tok)
		})
	}
}

func TestUnexpectedSigningAlg(t *testing.T) {
	// Generate an HMAC key which is not RSA
	hmacSecret := []byte("my_secret_key")
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "123"})
	signed, _ := token.SignedString(hmacSecret)

	privateKey, _ := rsa.GenerateKey(rand.Reader, 2048)

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+signed)

	rec := httptest.NewRecorder()
	handler := bearerMiddleware(&privateKey.PublicKey, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	body, _ := io.ReadAll(rec.Body)
	assert.Contains(t, string(body), "invalid token")
}

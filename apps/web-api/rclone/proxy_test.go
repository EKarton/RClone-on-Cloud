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

	sharedjwt "github.com/ekarton/RClone-Cloud/apps/web-api/shared/jwt"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configfile"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRCloneAPIHandler(t *testing.T) {
	// 1. Setup rclone for testing
	tempDir := t.TempDir()
	confPath := filepath.Join(tempDir, "rclone.conf")
	_ = os.WriteFile(confPath, []byte("[testremote]\ntype = local\n"), 0600)
	require.NoError(t, config.SetConfigPath(confPath))
	configfile.Install()
	// 2. Generate an RSA Keypair
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	pubBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	require.NoError(t, err)

	pemBlock := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubBytes,
	}
	pubKeyPEM := string(pem.EncodeToMemory(pemBlock))

	// 3. Initialize RCloneAPIHandler
	handler, err := NewRCloneAPIHandler(pubKeyPEM, config.Data())
	require.NoError(t, err)

	// Register it with a test router
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	ts := httptest.NewServer(mux)
	defer ts.Close()

	client := ts.Client()

	// Helper function to sign a JWT
	signJWT := func(sub, email string, expTime time.Time) string {
		claims := sharedjwt.Claims{
			UserID: sub,
			Email:  email,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(expTime),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				Issuer:    "rclone-cloud-api",
				Audience:  jwt.ClaimStrings{"rclone-cloud-ui"},
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
		req, _ := http.NewRequest("POST", ts.URL+"/api/v1/rclone/rc/noop", nil)
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer func() {
			require.NoError(t, resp.Body.Close())
		}()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

		body, _ := io.ReadAll(resp.Body)
		assert.Contains(t, string(body), "missing or malformed token")
	})

	t.Run("Malformed Token", func(t *testing.T) {
		req, _ := http.NewRequest("POST", ts.URL+"/api/v1/rclone/rc/noop", nil)
		req.Header.Set("Authorization", "Bearer invalid.jwt.token")
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer func() {
			require.NoError(t, resp.Body.Close())
		}()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("Invalid Signature", func(t *testing.T) {
		req, _ := http.NewRequest("POST", ts.URL+"/api/v1/rclone/rc/noop", nil)
		req.Header.Set("Authorization", "Bearer "+signInvalidJWT())
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer func() {
			require.NoError(t, resp.Body.Close())
		}()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("Expired Token", func(t *testing.T) {
		req, _ := http.NewRequest("POST", ts.URL+"/api/v1/rclone/rc/noop", nil)
		req.Header.Set("Authorization", "Bearer "+signJWT("123", "test@test.com", time.Now().Add(-1*time.Hour)))
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer func() {
			require.NoError(t, resp.Body.Close())
		}()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

		body, _ := io.ReadAll(resp.Body)
		assert.Contains(t, string(body), "token expired")
	})

	t.Run("Valid Token - Calls RCHandler Successfully", func(t *testing.T) {
		req, _ := http.NewRequest("POST", ts.URL+"/api/v1/rclone/rc/noop", nil)
		req.Header.Set("Authorization", "Bearer "+signJWT("user-1", "user@test.com", time.Now().Add(1*time.Hour)))
		resp, err := client.Do(req)
		require.NoError(t, err)
		defer func() {
			require.NoError(t, resp.Body.Close())
		}()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		body, _ := io.ReadAll(resp.Body)
		assert.Equal(t, "{}\n", string(body))
	})
}

func TestNewRCloneAPIHandlerFailures(t *testing.T) {
	t.Run("Empty Public Key String", func(t *testing.T) {
		_, err := NewRCloneAPIHandler("", config.Data())
		require.Error(t, err)
		assert.Contains(t, err.Error(), "JWT_PUBLIC_KEY is not set")
	})

	t.Run("Invalid PEM Data", func(t *testing.T) {
		_, err := NewRCloneAPIHandler("NOT A PEM", config.Data())
		require.Error(t, err)
		assert.Contains(t, err.Error(), "public key is not valid PEM")
	})

	t.Run("Invalid Key Type", func(t *testing.T) {
		pemBlock := &pem.Block{
			Type:  "PUBLIC KEY",
			Bytes: []byte("definitely not an rsa key"),
		}
		pemStr := string(pem.EncodeToMemory(pemBlock))

		_, err := NewRCloneAPIHandler(pemStr, config.Data())
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
	hmacSecret := []byte("my_secret_key")
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "123"})
	signed, _ := token.SignedString(hmacSecret)

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+signed)

	rec := httptest.NewRecorder()
	handler := bearerMiddleware(string(pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: []byte("fake")})), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	body, _ := io.ReadAll(rec.Body)
	assert.Contains(t, string(body), "invalid token")
}

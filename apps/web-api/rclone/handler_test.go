package rclone

import (
	"bytes"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configfile"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRCHandler(t *testing.T) {
	// 1. Create a temporary directory with a test file
	tempDir := t.TempDir()
	testFilePath := filepath.Join(tempDir, "hello.txt")
	err := os.WriteFile(testFilePath, []byte("world"), 0644)
	require.NoError(t, err)

	// 2. Create a temporary rclone.conf file
	confPath := filepath.Join(t.TempDir(), "rclone.conf")
	confContent := fmt.Sprintf(`[localtest]
type = alias
remote = %s
`, tempDir)

	err = os.WriteFile(confPath, []byte(confContent), 0600)
	require.NoError(t, err)

	// Point rclone to our test config
	require.NoError(t, config.SetConfigPath(confPath))
	configfile.Install()
	store := config.Data()

	// 3. Initialize rclone via the API handler constructor
	// Generate a valid public key PEM for the constructor
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	pubBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	require.NoError(t, err)
	pemBlock := &pem.Block{Type: "PUBLIC KEY", Bytes: pubBytes}
	pubKeyPEM := string(pem.EncodeToMemory(pemBlock))

	_, err = NewRCloneAPIHandler(pubKeyPEM, store)
	require.NoError(t, err)

	handler := NewRCHandler()
	ts := httptest.NewServer(handler)
	defer ts.Close()

	baseURL := ts.URL
	client := ts.Client()

	// 4. Test mapping of aliases/remotes
	t.Run("List Remotes", func(t *testing.T) {
		resp, err := client.Post(baseURL+"/config/listremotes", "application/json", bytes.NewReader([]byte("{}")))
		require.NoError(t, err)
		defer func() {
			require.NoError(t, resp.Body.Close())
		}()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		var res struct {
			Remotes []string `json:"remotes"`
		}
		err = json.NewDecoder(resp.Body).Decode(&res)
		require.NoError(t, err)

		assert.Contains(t, res.Remotes, "localtest")
	})

	// 5. Query files in the remote
	t.Run("Operations List", func(t *testing.T) {
		reqBody := `{"fs": "localtest:", "remote": ""}`
		resp, err := client.Post(baseURL+"/operations/list", "application/json", bytes.NewReader([]byte(reqBody)))
		require.NoError(t, err)
		defer func() {
			require.NoError(t, resp.Body.Close())
		}()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		var res struct {
			List []struct {
				Name string `json:"Name"`
				Path string `json:"Path"`
				Size int64  `json:"Size"`
			} `json:"list"`
		}
		err = json.NewDecoder(resp.Body).Decode(&res)
		require.NoError(t, err)

		require.Len(t, res.List, 1)
		assert.Equal(t, "hello.txt", res.List[0].Name)
		assert.Equal(t, int64(5), res.List[0].Size)
	})

	// 6. Access files using standard GET syntax: GET /[remote:path]/path/to/object
	t.Run("Get Object", func(t *testing.T) {
		resp, err := client.Get(baseURL + "/[localtest:]/hello.txt")
		require.NoError(t, err)
		defer func() {
			require.NoError(t, resp.Body.Close())
		}()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		data, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		assert.Equal(t, "world", string(data))
	})

	// 7. Verify that methods NOT in the allowlist are rejected with 403
	t.Run("Disallowed Method Returns 403", func(t *testing.T) {
		for _, blocked := range []string{
			"core/version",
			"config/setpath",
			"fscache/clear",
		} {
			blocked := blocked
			t.Run(blocked, func(t *testing.T) {
				resp, err := client.Post(baseURL+"/"+blocked, "application/json", bytes.NewReader([]byte("{}")))
				require.NoError(t, err)
				defer func() {
					require.NoError(t, resp.Body.Close())
				}()
				assert.Equal(t, http.StatusForbidden, resp.StatusCode)
			})
		}
	})

	// 8. Verify that all allowlisted methods pass the allowlist gate.
	// We do not test their full behaviour here—just that they are not rejected with 403.
	// (They may return 4xx/5xx for other reasons, e.g. missing parameters.)
	t.Run("Allowed Methods Pass Allowlist", func(t *testing.T) {
		for _, allowed := range []string{
			"rc/noop",
			"config/listremotes",
			"operations/list",
			"operations/about",
			"operations/stat",
			"operations/purge",
			"operations/deletefile",
			"sync/copy",
			"operations/copyfile",
			"operations/movefile",
			"sync/move",
			"operations/mkdir",
			"operations/cleanup",
			"job/status",
			"job/stop",
		} {
			t.Run(allowed, func(t *testing.T) {
				resp, err := client.Post(baseURL+"/"+allowed, "application/json", bytes.NewReader([]byte("{}")))
				require.NoError(t, err)
				defer func() {
					require.NoError(t, resp.Body.Close())
				}()
				// The allowlist should let these through — status must NOT be 403.
				assert.NotEqual(t, http.StatusForbidden, resp.StatusCode,
					"method %q should not be blocked by the allowlist", allowed)
			})
		}
	})
}

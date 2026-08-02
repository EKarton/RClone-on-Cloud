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
	"mime/multipart"
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

	// 3. Initialize rclone api
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

	// Sends a JSON body to the given path and returns the response.
	postJSON := func(t *testing.T, path string, body string) *http.Response {
		t.Helper()
		resp, err := client.Post(baseURL+"/"+path, "application/json", bytes.NewReader([]byte(body)))
		require.NoError(t, err)
		return resp
	}

	// Decodes a JSON response body into a generic map.
	decodeJSON := func(t *testing.T, resp *http.Response) map[string]interface{} {
		t.Helper()
		var result map[string]interface{}
		err := json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)
		return result
	}

	t.Run("rc/noop", func(t *testing.T) {
		resp := postJSON(t, "rc/noop", `{"potato": "1"}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)
		result := decodeJSON(t, resp)
		assert.Equal(t, "1", result["potato"])
	})

	t.Run("config/listremotes", func(t *testing.T) {
		resp := postJSON(t, "config/listremotes", `{}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)
		result := decodeJSON(t, resp)
		remotes, ok := result["remotes"].([]interface{})
		require.True(t, ok)
		assert.Contains(t, remotes, "localtest")
	})

	t.Run("operations/list", func(t *testing.T) {
		resp := postJSON(t, "operations/list", `{"fs": "localtest:", "remote": ""}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)
		result := decodeJSON(t, resp)
		list, ok := result["list"].([]interface{})
		require.True(t, ok)
		require.Len(t, list, 1)
		entry := list[0].(map[string]interface{})
		assert.Equal(t, "hello.txt", entry["Name"])
		assert.Equal(t, float64(5), entry["Size"])
	})

	t.Run("operations/about", func(t *testing.T) {
		resp := postJSON(t, "operations/about", `{"fs": "localtest:"}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)
		result := decodeJSON(t, resp)
		// "about" returns disk usage info; "total" should be present and positive.
		total, ok := result["total"].(float64)
		require.True(t, ok, "expected 'total' in about response")
		assert.Greater(t, total, float64(0))
	})

	t.Run("operations/stat", func(t *testing.T) {
		resp := postJSON(t, "operations/stat", `{"fs": "localtest:", "remote": "hello.txt"}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)
		result := decodeJSON(t, resp)
		item, ok := result["item"].(map[string]interface{})
		require.True(t, ok, "expected 'item' in stat response")
		assert.Equal(t, "hello.txt", item["Name"])
		assert.Equal(t, float64(5), item["Size"])
	})

	t.Run("operations/mkdir", func(t *testing.T) {
		resp := postJSON(t, "operations/mkdir", `{"fs": "localtest:", "remote": "newdir"}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify directory was created on disk.
		_, err := os.Stat(filepath.Join(tempDir, "newdir"))
		assert.NoError(t, err)
	})

	t.Run("operations/uploadfile", func(t *testing.T) {
		// operations/uploadfile expects a multipart form upload.
		// fs and remote must be passed as query parameters.
		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)

		part, err := writer.CreateFormFile("file0", "uploaded.txt")
		require.NoError(t, err)
		_, err = part.Write([]byte("upload content"))
		require.NoError(t, err)

		require.NoError(t, writer.Close())

		uploadURL := baseURL + "/operations/uploadfile?fs=localtest:&remote="
		resp, err := client.Post(uploadURL, writer.FormDataContentType(), &buf)
		require.NoError(t, err)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify the file was uploaded.
		data, err := os.ReadFile(filepath.Join(tempDir, "uploaded.txt"))
		require.NoError(t, err)
		assert.Equal(t, "upload content", string(data))
	})

	t.Run("operations/copyfile", func(t *testing.T) {
		resp := postJSON(t, "operations/copyfile", `{
			"srcFs": "localtest:",
			"srcRemote": "hello.txt",
			"dstFs": "localtest:",
			"dstRemote": "hello_copy.txt"
		}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify copy exists and original is untouched.
		data, err := os.ReadFile(filepath.Join(tempDir, "hello_copy.txt"))
		require.NoError(t, err)
		assert.Equal(t, "world", string(data))

		_, err = os.Stat(filepath.Join(tempDir, "hello.txt"))
		assert.NoError(t, err, "original file should still exist after copy")
	})

	t.Run("operations/movefile", func(t *testing.T) {
		// Create a file to move.
		src := filepath.Join(tempDir, "moveme.txt")
		require.NoError(t, os.WriteFile(src, []byte("moveme"), 0644))

		resp := postJSON(t, "operations/movefile", `{
			"srcFs": "localtest:",
			"srcRemote": "moveme.txt",
			"dstFs": "localtest:",
			"dstRemote": "moved.txt"
		}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify destination exists and source is gone.
		data, err := os.ReadFile(filepath.Join(tempDir, "moved.txt"))
		require.NoError(t, err)
		assert.Equal(t, "moveme", string(data))

		_, err = os.Stat(src)
		assert.True(t, os.IsNotExist(err), "source file should be removed after move")
	})

	t.Run("sync/copy", func(t *testing.T) {
		// Set up a source directory with a file inside the test remote.
		srcDir := filepath.Join(tempDir, "sync_copy_src")
		require.NoError(t, os.MkdirAll(srcDir, 0755))
		require.NoError(t, os.WriteFile(filepath.Join(srcDir, "sc.txt"), []byte("sync-copy"), 0644))

		resp := postJSON(t, "sync/copy", `{
			"srcFs": "localtest:sync_copy_src",
			"dstFs": "localtest:sync_copy_dst"
		}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		data, err := os.ReadFile(filepath.Join(tempDir, "sync_copy_dst", "sc.txt"))
		require.NoError(t, err)
		assert.Equal(t, "sync-copy", string(data))

		// Source should still exist.
		_, err = os.Stat(filepath.Join(srcDir, "sc.txt"))
		assert.NoError(t, err, "source should still exist after sync/copy")
	})

	t.Run("sync/move", func(t *testing.T) {
		// Set up a source directory with a file inside the test remote.
		srcDir := filepath.Join(tempDir, "sync_move_src")
		require.NoError(t, os.MkdirAll(srcDir, 0755))
		require.NoError(t, os.WriteFile(filepath.Join(srcDir, "sm.txt"), []byte("sync-move"), 0644))

		resp := postJSON(t, "sync/move", `{
			"srcFs": "localtest:sync_move_src",
			"dstFs": "localtest:sync_move_dst"
		}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		data, err := os.ReadFile(filepath.Join(tempDir, "sync_move_dst", "sm.txt"))
		require.NoError(t, err)
		assert.Equal(t, "sync-move", string(data))

		// Source file should be gone after move.
		_, err = os.Stat(filepath.Join(srcDir, "sm.txt"))
		assert.True(t, os.IsNotExist(err), "source should be removed after sync/move")
	})

	t.Run("operations/deletefile", func(t *testing.T) {
		// Create a file to delete.
		delPath := filepath.Join(tempDir, "deleteme.txt")
		require.NoError(t, os.WriteFile(delPath, []byte("bye"), 0644))

		resp := postJSON(t, "operations/deletefile", `{
			"fs": "localtest:",
			"remote": "deleteme.txt"
		}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		_, err := os.Stat(delPath)
		assert.True(t, os.IsNotExist(err), "file should be deleted")
	})

	t.Run("operations/purge", func(t *testing.T) {
		// Create a directory with contents to purge.
		purgeDir := filepath.Join(tempDir, "purgeme")
		require.NoError(t, os.MkdirAll(purgeDir, 0755))
		require.NoError(t, os.WriteFile(filepath.Join(purgeDir, "file.txt"), []byte("x"), 0644))

		resp := postJSON(t, "operations/purge", `{
			"fs": "localtest:",
			"remote": "purgeme"
		}`)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		_, err := os.Stat(purgeDir)
		assert.True(t, os.IsNotExist(err), "directory should be purged")
	})

	t.Run("operations/cleanup", func(t *testing.T) {
		// cleanup is not supported by local/alias backends, so we expect a 500.
		resp := postJSON(t, "operations/cleanup", `{"fs": "localtest:"}`)
		defer func() { _ = resp.Body.Close() }()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		result := decodeJSON(t, resp)
		assert.Contains(t, result["error"], "doesn't support cleanup")
	})

	t.Run("job/status", func(t *testing.T) {
		// Request status for a non-existent job — should return 500 with an error message.
		resp := postJSON(t, "job/status", `{"jobid": 999999}`)
		defer func() { _ = resp.Body.Close() }()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		result := decodeJSON(t, resp)
		assert.Contains(t, result["error"], "job not found")
	})

	t.Run("job/stop", func(t *testing.T) {
		// Request stop for a non-existent job — should return 500 with an error message.
		resp := postJSON(t, "job/stop", `{"jobid": 999999}`)
		defer func() { _ = resp.Body.Close() }()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		result := decodeJSON(t, resp)
		assert.Contains(t, result["error"], "job not found")
	})

	// --- Access files using standard GET syntax: GET /[remote:path]/path/to/object ---

	t.Run("Get Object", func(t *testing.T) {
		resp, err := client.Get(baseURL + "/[localtest:]/hello.txt")
		require.NoError(t, err)
		defer func() { _ = resp.Body.Close() }()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		data, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		assert.Equal(t, "world", string(data))
	})

	// --- Verify that methods NOT in the allowlist are rejected with 403 ---

	t.Run("Disallowed Method Returns 403", func(t *testing.T) {
		for _, blocked := range []string{
			"core/version",
			"config/setpath",
			"fscache/clear",
		} {
			blocked := blocked
			t.Run(blocked, func(t *testing.T) {
				resp := postJSON(t, blocked, `{}`)
				defer func() { _ = resp.Body.Close() }()
				assert.Equal(t, http.StatusForbidden, resp.StatusCode)
			})
		}
	})

	t.Run("All Allowed Methods Pass Allowlist", func(t *testing.T) {
		for allowed := range allowedMethods {
			t.Run(allowed, func(t *testing.T) {
				resp := postJSON(t, allowed, `{}`)
				defer func() { _ = resp.Body.Close() }()
				assert.NotEqual(t, http.StatusForbidden, resp.StatusCode,
					"method %q should not be blocked by the allowlist", allowed)
			})
		}
	})

	t.Run("POST Path Traversal Rejection", func(t *testing.T) {
		tests := []struct {
			name   string
			method string
			body   string
		}{
			{
				name:   "bare root path as fs",
				method: "operations/list",
				body:   `{"fs": "/", "remote": ""}`,
			},
			{
				name:   "bare /etc/ path as fs",
				method: "operations/list",
				body:   `{"fs": "/etc/", "remote": ""}`,
			},
			{
				name:   "bare /tmp/ path for destructive op",
				method: "operations/purge",
				body:   `{"fs": "/tmp/", "remote": "sensitive-data"}`,
			},
			{
				name:   "traversal in remote param",
				method: "operations/list",
				body:   `{"fs": "localtest:", "remote": "../../etc"}`,
			},
			{
				name:   "bare paths for sync/copy srcFs and dstFs",
				method: "sync/copy",
				body:   `{"srcFs": "/", "dstFs": "/tmp/"}`,
			},
			{
				name:   "connection string remote",
				method: "operations/list",
				body:   `{"fs": ":local:/etc/", "remote": ""}`,
			},
			{
				name:   "unknown remote name",
				method: "operations/list",
				body:   `{"fs": "notconfigured:", "remote": ""}`,
			},
			{
				name:   "traversal in srcRemote",
				method: "operations/copyfile",
				body:   `{"srcFs": "localtest:", "srcRemote": "../../../etc/passwd", "dstFs": "localtest:", "dstRemote": "stolen.txt"}`,
			},
			{
				name:   "traversal in dstRemote",
				method: "operations/movefile",
				body:   `{"srcFs": "localtest:", "srcRemote": "hello.txt", "dstFs": "localtest:", "dstRemote": "../../tmp/evil"}`,
			},
		}

		for _, tc := range tests {
			tc := tc
			t.Run(tc.name, func(t *testing.T) {
				resp := postJSON(t, tc.method, tc.body)
				defer func() { _ = resp.Body.Close() }()

				assert.Equal(t, http.StatusForbidden, resp.StatusCode,
					"expected 403 Forbidden for path traversal attempt")
			})
		}
	})

	t.Run("GET Path Traversal Rejection", func(t *testing.T) {
		tests := []struct {
			name string
			path string
		}{
			{
				name: "bare path as remote name",
				path: "/[/etc/]passwd",
			},
			{
				name: "traversal in path",
				path: "/[localtest:]../../etc/passwd",
			},
			{
				name: "unknown remote",
				path: "/[notconfigured:]secret.txt",
			},
			{
				name: "connection string remote",
				path: "/[:local:/etc/]passwd",
			},
		}

		for _, tc := range tests {
			tc := tc
			t.Run(tc.name, func(t *testing.T) {
				resp, err := client.Get(baseURL + tc.path)
				require.NoError(t, err)
				defer func() { _ = resp.Body.Close() }()

				assert.Equal(t, http.StatusForbidden, resp.StatusCode,
					"expected 403 Forbidden for path traversal attempt via GET")
			})
		}
	})
}

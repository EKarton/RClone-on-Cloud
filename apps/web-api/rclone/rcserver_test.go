package rclone

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configfile"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStartRCServer(t *testing.T) {
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
	config.SetConfigPath(confPath)
	configfile.Install()
	store := config.Data()

	// 3. Boot StartRCServer on a dynamic port
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	port := getFreePort()
	rcAddr := fmt.Sprintf("127.0.0.1:%d", port)

	server, err := StartRCServer(ctx, store, rcAddr)
	require.NoError(t, err)
	defer server.Shutdown()

	baseURL := fmt.Sprintf("http://%s", rcAddr)

	// Basic HTTP client with a short timeout
	client := &http.Client{Timeout: 5 * time.Second}

	// Wait for the server to bind
	var ready bool
	for i := 0; i < 20; i++ {
		resp, err := client.Post(baseURL+"/rc/noop", "application/json", bytes.NewReader([]byte("{}")))
		if err == nil {
			resp.Body.Close()
			ready = true
			break
		}
		time.Sleep(100 * time.Millisecond)
	}
	require.True(t, ready, "RC server did not become ready in time")

	// 4. Test mapping of aliases/remotes
	t.Run("List Remotes", func(t *testing.T) {
		resp, err := client.Post(baseURL+"/config/listremotes", "application/json", bytes.NewReader([]byte("{}")))
		require.NoError(t, err)
		defer resp.Body.Close()

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
		defer resp.Body.Close()

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
		defer resp.Body.Close()

		require.Equal(t, http.StatusOK, resp.StatusCode)

		data, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		assert.Equal(t, "world", string(data))
	})
}

// getFreePort asks the kernel for a free open port that is ready to use.
func getFreePort() int {
	addr, err := net.ResolveTCPAddr("tcp", "127.0.0.1:0")
	if err != nil {
		panic(err)
	}

	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		panic(err)
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}

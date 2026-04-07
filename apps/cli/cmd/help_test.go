package cmd

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
	_ "github.com/rclone/rclone/backend/all"
	_ "github.com/rclone/rclone/cmd/all"
	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/fs/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	mongodbcontainer "github.com/testcontainers/testcontainers-go/modules/mongodb"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func TestMain(m *testing.M) {
	// Initialize the root command once for all tests in this package.
	setupRootCommand(Root)
	os.Exit(m.Run())
}

func setupTestMongo(t *testing.T) (uri string, client *mongo.Client, keyHex string) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	container, err := mongodbcontainer.Run(ctx, "mongo:7.0")
	require.NoError(t, err)

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cleanupCancel()

		if err := container.Terminate(cleanupCtx); err != nil {
			t.Logf("failed to terminate container: %s", err)
		}
	})

	uri, err = container.ConnectionString(ctx)
	require.NoError(t, err)

	client, err = mongo.Connect(options.Client().ApplyURI(uri))
	require.NoError(t, err)

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()

		if err := client.Disconnect(cleanupCtx); err != nil {
			t.Logf("failed to disconnect mongo client: %s", err)
		}
	})

	encryptionKey := make([]byte, 32)
	_, err = rand.Read(encryptionKey)
	require.NoError(t, err)
	keyHex = hex.EncodeToString(encryptionKey)

	return uri, client, keyHex
}

// captureOutput captures everything written to os.Stdout during the execution of fn.
func captureOutput(fn func()) (string, error) {
	oldStdout := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	outChan := make(chan string)
	go func() {
		var buf bytes.Buffer
		_, _ = io.Copy(&buf, r)
		outChan <- buf.String()
	}()

	fn()

	_ = w.Close()
	os.Stdout = oldStdout
	output := <-outChan
	return output, nil
}

// execute runs the root command with given arguments, capturing output via captureOutput.
// It safely handles rclone's internal os.Exit() calls which trigger a panic in tests.
func execute(t *testing.T, args ...string) string {
	t.Helper()
	Root.SetArgs(args)

	var output string
	var err error

	defer func() {
		if r := recover(); r != nil {
			if s, ok := r.(string); ok && strings.Contains(s, "unexpected call to os.Exit") {
				// Intercepted os.Exit(0) or similar
				return
			}
			panic(r)
		}
	}()

	output, err = captureOutput(func() {
		_ = Root.Execute()
	})
	require.NoError(t, err)
	return output
}

func TestRootCommand_ListRemotes(t *testing.T) {
	uri, client, keyHex := setupTestMongo(t)
	databaseName := "rclone-test"
	collectionName := "configs"
	coll := client.Database(databaseName).Collection(collectionName)
	storage, err := mongodb.New(coll, keyHex)
	require.NoError(t, err)

	// Inject fake remotes
	storage.SetValue("test-remote-1", "type", "s3")
	storage.SetValue("test-remote-2", "type", "drive")
	require.NoError(t, storage.Save())

	// Force the global config state to our MongoDB store for this test
	config.SetData(storage)
	t.Cleanup(func() { config.SetData(nil) })

	output := execute(t,
		"listremotes",
		"--mongo-url", uri,
		"--mongo-key", keyHex,
		"--mongo-db", databaseName,
		"--mongo-col", collectionName,
	)

	assert.Contains(t, output, "test-remote-1:")
	assert.Contains(t, output, "test-remote-2:")
}

func TestRootCommand_Sync(t *testing.T) {
	uri, client, keyHex := setupTestMongo(t)
	databaseName := "rclone-sync-test"
	collectionName := "configs"
	coll := client.Database(databaseName).Collection(collectionName)
	storage, err := mongodb.New(coll, keyHex)
	require.NoError(t, err)

	storage.SetValue("mem-remote", "type", "memory")
	require.NoError(t, storage.Save())

	config.SetData(storage)
	t.Cleanup(func() { config.SetData(nil) })

	tempDir := t.TempDir()
	sourceDir := filepath.Join(tempDir, "src")
	require.NoError(t, os.MkdirAll(sourceDir, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(sourceDir, "file1.txt"), []byte("hello world"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(sourceDir, "file2.txt"), []byte("rclone cloud test"), 0644))

	commonFlags := []string{
		"--mongo-url", uri,
		"--mongo-key", keyHex,
		"--mongo-db", databaseName,
		"--mongo-col", collectionName,
	}
	_ = execute(t, append([]string{"sync", sourceDir, "mem-remote:/"}, commonFlags...)...)

	ctx := context.Background()
	f, err := fs.NewFs(ctx, "mem-remote:/")
	require.NoError(t, err)

	entries, err := f.List(ctx, "")
	require.NoError(t, err)

	var names []string
	for _, entry := range entries {
		names = append(names, entry.Remote())
	}

	assert.Contains(t, names, "file1.txt")
	assert.Contains(t, names, "file2.txt")
}

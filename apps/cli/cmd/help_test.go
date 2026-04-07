package cmd

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
	_ "github.com/rclone/rclone/backend/all"
	_ "github.com/rclone/rclone/cmd/all"
	"github.com/rclone/rclone/fs/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	mongodbcontainer "github.com/testcontainers/testcontainers-go/modules/mongodb"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func setupTestMongo(t *testing.T) (uri string, client *mongo.Client, keyHex string) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	container, err := mongodbcontainer.Run(ctx, "mongo:7.0")
	require.NoError(t, err)

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cleanupCancel()
		require.NoError(t, container.Terminate(cleanupCtx))
	})

	uri, err = container.ConnectionString(ctx)
	require.NoError(t, err)

	client, err = mongo.Connect(options.Client().ApplyURI(uri))
	require.NoError(t, err)

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		require.NoError(t, client.Disconnect(cleanupCtx))
	})

	encryptionKey := make([]byte, 32)
	_, err = rand.Read(encryptionKey)
	require.NoError(t, err)

	return uri, client, hex.EncodeToString(encryptionKey)
}

func executeCommand(t *testing.T, args ...string) (string, string, error) {
	t.Helper()

	cmd := NewRootCommand(defaultRuntime())

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.SetOut(&stdout)
	cmd.SetErr(&stderr)
	cmd.SetArgs(args)

	err := cmd.Execute()
	return stdout.String(), stderr.String(), err
}

func TestRootCommand_ListRemotes(t *testing.T) {
	uri, client, keyHex := setupTestMongo(t)
	databaseName := "rclone-test"
	collectionName := "configs"

	coll := client.Database(databaseName).Collection(collectionName)
	storage, err := mongodb.New(coll, keyHex)
	require.NoError(t, err)

	storage.SetValue("test-remote-1", "type", "s3")
	storage.SetValue("test-remote-2", "type", "drive")
	require.NoError(t, storage.Save())

	config.SetData(storage)
	t.Cleanup(func() { config.SetData(nil) })

	stdout, stderr, err := executeCommand(
		t,
		"listremotes",
		"--mongo-url", uri,
		"--mongo-key", keyHex,
		"--mongo-db", databaseName,
		"--mongo-col", collectionName,
	)
	require.NoError(t, err)
	assert.Empty(t, stderr)
	assert.Contains(t, stdout, "test-remote-1:")
	assert.Contains(t, stdout, "test-remote-2:")
}

func TestRootCommand_Sync(t *testing.T) {
	uri, client, keyHex := setupTestMongo(t)
	databaseName := "rclone-sync-test"
	collectionName := "configs"

	coll := client.Database(databaseName).Collection(collectionName)
	storage, err := mongodb.New(coll, keyHex)
	require.NoError(t, err)

	remoteDir := t.TempDir()
	storage.SetValue("mem-remote", "type", "local")
	storage.SetValue("mem-remote", "path", remoteDir)
	require.NoError(t, storage.Save())

	config.SetData(storage)
	t.Cleanup(func() { config.SetData(nil) })

	tempDir := t.TempDir()
	sourceDir := filepath.Join(tempDir, "src")
	require.NoError(t, os.MkdirAll(sourceDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(sourceDir, "file1.txt"), []byte("hello world"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(sourceDir, "file2.txt"), []byte("rclone cloud test"), 0o644))

	commonFlags := []string{
		"--mongo-url", uri,
		"--mongo-key", keyHex,
		"--mongo-db", databaseName,
		"--mongo-col", collectionName,
	}

	_, _, err = executeCommand(t, append([]string{"sync", sourceDir, "mem-remote:/"}, commonFlags...)...)
	require.NoError(t, err)

	stdout, stderr, err := executeCommand(t, append([]string{"ls", "mem-remote:/"}, commonFlags...)...)
	require.NoError(t, err)
	assert.Empty(t, stderr)
	assert.Contains(t, stdout, "file1.txt")
	assert.Contains(t, stdout, "file2.txt")
}

func TestRootCommand_List(t *testing.T) {
	uri, client, keyHex := setupTestMongo(t)
	databaseName := "rclone-list-test"
	collectionName := "configs"

	coll := client.Database(databaseName).Collection(collectionName)
	storage, err := mongodb.New(coll, keyHex)
	require.NoError(t, err)

	remoteDir := t.TempDir()
	storage.SetValue("mem-remote", "type", "local")
	storage.SetValue("mem-remote", "path", remoteDir)
	require.NoError(t, storage.Save())

	config.SetData(storage)
	t.Cleanup(func() { config.SetData(nil) })

	srcDir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(srcDir, "fileA.txt"), []byte("data A"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(srcDir, "fileB.txt"), []byte("data B"), 0o644))

	commonFlags := []string{
		"--mongo-url", uri,
		"--mongo-key", keyHex,
		"--mongo-db", databaseName,
		"--mongo-col", collectionName,
	}

	_, _, err = executeCommand(t, append([]string{"sync", srcDir, "mem-remote:/"}, commonFlags...)...)
	require.NoError(t, err)

	stdout, stderr, err := executeCommand(t, append([]string{"ls", "mem-remote:/"}, commonFlags...)...)
	require.NoError(t, err)
	assert.Empty(t, stderr)
	assert.Contains(t, stdout, "fileA.txt")
	assert.Contains(t, stdout, "fileB.txt")
}

package cmd

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
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
		_ = container.Terminate(cleanupCtx)
	})

	uri, err = container.ConnectionString(ctx)
	require.NoError(t, err)

	client, err = mongo.Connect(options.Client().ApplyURI(uri))
	require.NoError(t, err)

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		_ = client.Disconnect(cleanupCtx)
	})

	encryptionKey := make([]byte, 32)
	_, err = rand.Read(encryptionKey)
	require.NoError(t, err)

	return uri, client, hex.EncodeToString(encryptionKey)
}

func executeCommand(t *testing.T, args ...string) (stdout string, stderr string, err error) {
	t.Helper()

	cmd := NewRootCommand(defaultRuntime())

	// Redirect os.Stdout and os.Stderr to capture fmt.Printf and direct writes
	oldStdout := os.Stdout
	oldStderr := os.Stderr
	stdoutR, stdoutW, _ := os.Pipe()
	stderrR, stderrW, _ := os.Pipe()
	os.Stdout = stdoutW
	os.Stderr = stderrW

	stdoutChan := make(chan string)
	stderrChan := make(chan string)

	go func() {
		var buf bytes.Buffer
		_, _ = io.Copy(&buf, stdoutR)
		stdoutChan <- buf.String()
	}()
	go func() {
		var buf bytes.Buffer
		_, _ = io.Copy(&buf, stderrR)
		stderrChan <- buf.String()
	}()

	cmd.SetOut(stdoutW)
	cmd.SetErr(stderrW)
	cmd.SetArgs(args)

	// rclone commands often call os.Exit which panics during tests.
	// We catch these panics to allow the test to continue and verify results.
	defer func() {
		_ = stdoutW.Close()
		_ = stderrW.Close()
		os.Stdout = oldStdout
		os.Stderr = oldStderr
		stdout = <-stdoutChan
		stderr = <-stderrChan

		if r := recover(); r != nil {
			s := fmt.Sprintf("%v", r)
			if strings.Contains(s, "os.Exit(") {
				if strings.Contains(s, "os.Exit(0)") {
					err = nil
				} else {
					err = fmt.Errorf("unexpected exit: %v", r)
				}
				return
			}
			panic(r)
		}
	}()

	err = cmd.Execute()
	return
}

func TestRootCommand_ListRemotes(t *testing.T) {
	uri, client, keyHex := setupTestMongo(t)
	const databaseName = "rclone-test"
	const collectionName = "configs"
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

func TestRootCommand_SyncAndList(t *testing.T) {
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

	_, stderr, err := executeCommand(
		t,
		"sync", sourceDir, "mem-remote:/",
		"--mongo-url", uri,
		"--mongo-key", keyHex,
		"--mongo-db", databaseName,
		"--mongo-col", collectionName,
	)
	require.NoError(t, err)
	assert.Empty(t, stderr)

	listStdout, listStderr, listErr := executeCommand(
		t,
		"ls",
		"mem-remote:/",
		"--mongo-url", uri,
		"--mongo-key", keyHex,
		"--mongo-db", databaseName,
		"--mongo-col", collectionName,
	)
	require.NoError(t, listErr)
	assert.Empty(t, listStderr)
	assert.Contains(t, listStdout, "file1.txt")
	assert.Contains(t, listStdout, "file2.txt")
}

package cmd

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"testing"
	"time"

	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
	_ "github.com/rclone/rclone/backend/all"
	_ "github.com/rclone/rclone/cmd/all"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	mongodbcontainer "github.com/testcontainers/testcontainers-go/modules/mongodb"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func TestRootCommand_ListRemotes(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// 1. Start MongoDB testcontainer
	container, err := mongodbcontainer.Run(ctx, "mongo:7.0")
	require.NoError(t, err)

	defer func() {
		if err := container.Terminate(ctx); err != nil {
			t.Fatalf("failed to terminate container: %s", err)
		}
	}()

	uri, err := container.ConnectionString(ctx)
	require.NoError(t, err)

	// 2. Set up MongoStorage with fake data
	encryptionKey := make([]byte, 32)
	_, err = rand.Read(encryptionKey)
	require.NoError(t, err)
	keyHex := hex.EncodeToString(encryptionKey)

	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	require.NoError(t, err)
	defer func() {
		require.NoError(t, client.Disconnect(ctx))
	}()

	databaseName := "rclone-test"
	collectionName := "configs"

	coll := client.Database(databaseName).Collection(collectionName)
	storage, err := mongodb.New(coll, keyHex)
	require.NoError(t, err)

	// Inject fake remotes
	storage.SetValue("test-remote-1", "type", "s3")
	storage.SetValue("test-remote-2", "type", "drive")
	require.NoError(t, storage.Save())

	// 3. Set up CLI args & capture output
	oldArgs := os.Args
	defer func() { os.Args = oldArgs }()

	// Overwrite STDOUT to capture output
	oldStdout := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	// Build the command line arguments
	Root.SetArgs([]string{
		"listremotes",
		"--mongo-url", uri,
		"--mongo-key", keyHex,
		"--mongo-db", databaseName,
		"--mongo-col", collectionName,
	})

	// Make sure everything is initialized as it would be inside main.go
	setupRootCommand(Root)
	AddBackendFlags()

	err = Root.Execute()

	// Close writer to flush pipe, restore stdout
	_ = w.Close()
	os.Stdout = oldStdout

	// Read captured output
	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	output := buf.String()

	require.NoError(t, err)
	assert.Contains(t, output, "test-remote-1:")
	assert.Contains(t, output, "test-remote-2:")
}

package dump_test

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/ekarton/RClone-Cloud/apps/cli/cmd/dump"
	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
	"github.com/rclone/rclone/fs/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	mongodbcontainer "github.com/testcontainers/testcontainers-go/modules/mongodb"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func TestDumpConfig(t *testing.T) {
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

	// 2. Seed MongoDB with encrypted data
	encryptionKey := "test-secret-key"

	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	require.NoError(t, err)
	defer func() {
		require.NoError(t, client.Disconnect(ctx))
	}()

	coll := client.Database("rclone").Collection("configs")
	storage, err := mongodb.New(coll, encryptionKey)
	require.NoError(t, err)

	storage.SetValue("remote1", "type", "drive")
	storage.SetValue("remote1", "scope", "drive.readonly")
	storage.SetValue("remote2", "type", "s3")
	storage.SetValue("remote2", "endpoint", "s3.amazonaws.com")

	err = storage.Save()
	require.NoError(t, err)

	// 3. Install the MongoStorage as the global config (simulating initConfig)
	config.SetData(storage)

	// 4. Run the Dump command
	tempDir := t.TempDir()
	dumpPath := filepath.Join(tempDir, "dump.conf")
	err = dump.Dump(io.Discard, dumpPath)
	require.NoError(t, err)

	// 5. Verify the output file
	content, err := os.ReadFile(dumpPath)
	require.NoError(t, err)

	dumpStr := string(content)

	// Verify sections
	assert.True(t, strings.Contains(dumpStr, "[remote1]"), "expected [remote1] section")
	assert.True(t, strings.Contains(dumpStr, "[remote2]"), "expected [remote2] section")

	// Verify decrypted values
	assert.True(t, strings.Contains(dumpStr, "type = drive"), "expected remote1.type = drive")
	assert.True(t, strings.Contains(dumpStr, "scope = drive.readonly"), "expected remote1.scope = drive.readonly")
	assert.True(t, strings.Contains(dumpStr, "type = s3"), "expected remote2.type = s3")
	assert.True(t, strings.Contains(dumpStr, "endpoint = s3.amazonaws.com"), "expected remote2.endpoint = s3.amazonaws.com")
}

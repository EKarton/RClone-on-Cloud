package dump_test

import (
	"context"
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

func TestDumpCobraCmd(t *testing.T) {
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

	// 2. Seed DB
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
	require.NoError(t, storage.Save())

	// 3. Install as global config (simulating initConfig)
	config.SetData(storage)

	// 4. Execute Command via Cobra
	tempDir := t.TempDir()
	dumpPath := filepath.Join(tempDir, "dump.conf")

	cmd := dump.DumpCmd
	cmd.SetArgs([]string{"--to-file", dumpPath})
	err = cmd.Execute()
	require.NoError(t, err)

	// 5. Verify file
	content, err := os.ReadFile(dumpPath)
	require.NoError(t, err)
	assert.True(t, strings.Contains(string(content), "[remote1]"))
}

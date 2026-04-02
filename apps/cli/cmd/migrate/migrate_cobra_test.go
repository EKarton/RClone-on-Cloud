package migrate_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ekarton/RClone-Cloud/apps/cli/cmd/migrate"
	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
	"github.com/rclone/rclone/fs/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	mongodbcontainer "github.com/testcontainers/testcontainers-go/modules/mongodb"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func TestMigrateCobraCmd(t *testing.T) {
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

	// 2. Set up MongoStorage as global config
	encryptionKey := make([]byte, 32)
	_, err = rand.Read(encryptionKey)
	require.NoError(t, err)
	keyHex := hex.EncodeToString(encryptionKey)

	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	require.NoError(t, err)
	defer func() {
		require.NoError(t, client.Disconnect(ctx))
	}()

	coll := client.Database("rclone").Collection("configs")
	storage, err := mongodb.New(coll, keyHex)
	require.NoError(t, err)

	// Install as global config (simulating initConfig)
	config.SetData(storage)

	// 3. Create dummy rclone.conf
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "rclone.conf")
	dummyConfig := `[testremote]
type = drive
scope = drive`
	err = os.WriteFile(configPath, []byte(dummyConfig), 0644)
	require.NoError(t, err)

	// 4. Execute Command via Cobra
	cmd := migrate.MigrateCmd
	cmd.SetArgs([]string{"--from-file", configPath})
	err = cmd.Execute()
	require.NoError(t, err)

	// 5. Verify in DB
	count, err := coll.CountDocuments(ctx, map[string]interface{}{"_id": "testremote"})
	require.NoError(t, err)
	assert.Equal(t, int64(1), count)
}

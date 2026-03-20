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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go/modules/mongodb"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func TestMigrateCobraCmd(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// 1. Start MongoDB testcontainer
	mongodbContainer, err := mongodb.Run(ctx, "mongo:7.0")
	require.NoError(t, err)

	defer func() {
		if err := mongodbContainer.Terminate(ctx); err != nil {
			t.Fatalf("failed to terminate container: %s", err)
		}
	}()

	uri, err := mongodbContainer.ConnectionString(ctx)
	require.NoError(t, err)

	// 2. Setup environment
	encryptionKey := make([]byte, 32)
	_, err = rand.Read(encryptionKey)
	require.NoError(t, err)
	keyHex := hex.EncodeToString(encryptionKey)
	t.Setenv("RCLONE_ENCRYPTION_KEY", keyHex)

	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "rclone.conf")
	dummyConfig := `[testremote]
type = drive
scope = drive`
	err = os.WriteFile(configPath, []byte(dummyConfig), 0644)
	require.NoError(t, err)

	// 3. Execute Command via Cobra
	cmd := migrate.MigrateCmd
	cmd.SetArgs([]string{"--from-file", configPath, "--to-mongodb-uri", uri})
	err = cmd.Execute()
	require.NoError(t, err)

	// 4. Verify in DB
	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	require.NoError(t, err)
	defer func() {
		require.NoError(t, client.Disconnect(ctx))
	}()

	coll := client.Database("rclone").Collection("configs")
	count, err := coll.CountDocuments(ctx, map[string]interface{}{"_id": "testremote"})
	require.NoError(t, err)
	assert.Equal(t, int64(1), count)
}

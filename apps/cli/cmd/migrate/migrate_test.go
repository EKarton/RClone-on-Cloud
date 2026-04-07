package migrate_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
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
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func TestMigrateConfig(t *testing.T) {
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

	// 2. Connect to MongoDB and set up MongoStorage as global config
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

	// 3. Create a dummy rclone.conf file
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "rclone.conf")

	dummyConfig := `[myremote]
type = s3
provider = AWS
env_auth = false
access_key_id = my_access_key
secret_access_key = my_secret_key
region = us-east-1`

	err = os.WriteFile(configPath, []byte(dummyConfig), 0644)
	require.NoError(t, err)

	err = migrate.Migrate(io.Discard, configPath)
	require.NoError(t, err)

	// 5. Verify the data in MongoDB
	var doc bson.M
	err = coll.FindOne(ctx, bson.M{"_id": "myremote"}).Decode(&doc)
	require.NoError(t, err, "could not find 'myremote' config in database")

	// The db document should have fields corresponding to the config keys (encrypted)
	assert.Contains(t, doc, "type", "expected encrypted 'type' field in mongo document")
	assert.Contains(t, doc, "provider", "expected encrypted 'provider' field in mongo document")
	assert.Contains(t, doc, "region", "expected encrypted 'region' field in mongo document")
	assert.NotContains(t, doc, "data", "should not have a 'data' field in flattened schema")
}

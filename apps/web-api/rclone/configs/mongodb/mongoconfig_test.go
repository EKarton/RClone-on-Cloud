package mongodb_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	tcmongo "github.com/testcontainers/testcontainers-go/modules/mongodb"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
)

// testKey is a fixed string key for tests only.
var testKey = "test-secret-key"

// Setup spins up a real MongoDB container and returns a MongoStorage, the Collection, and a cleanup func.
func setup(t *testing.T) (*mongodb.MongoStorage, *mongo.Collection, func()) {
	t.Helper()
	ctx := context.Background()

	// Start a real MongoDB container (pulled from Docker Hub)
	container, err := tcmongo.Run(ctx, "mongo:7")
	require.NoError(t, err, "failed to start MongoDB container")

	uri, err := container.ConnectionString(ctx)
	require.NoError(t, err)

	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	require.NoError(t, err)

	// Use t.Name() as the DB name so each test is fully isolated
	collection := client.Database(t.Name()).Collection("configs")

	store, err := mongodb.New(collection, testKey)
	require.NoError(t, err)

	cleanup := func() {
		_ = client.Disconnect(ctx)
		_ = container.Terminate(ctx)
	}
	return store, collection, cleanup
}

func TestLoad_EmptyDB(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	err := store.Load()
	assert.NoError(t, err)
	assert.Empty(t, store.GetSectionList())
}

func TestSaveAndLoad_RoundTrip(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("mys3", "type", "s3")
	store.SetValue("mys3", "region", "us-west-2")
	store.SetValue("mydrive", "type", "drive")

	require.NoError(t, store.Save())

	// Reload the same store and verify data survived the round trip
	require.NoError(t, store.Load())

	assert.True(t, store.HasSection("mys3"))
	assert.True(t, store.HasSection("mydrive"))

	v, found := store.GetValue("mys3", "region")
	assert.True(t, found)
	assert.Equal(t, "us-west-2", v)
}

func TestFlattenedSchemaStructure(t *testing.T) {
	store, collection, cleanup := setup(t)
	defer cleanup()

	// 1. Verify basic storage and encryption
	plaintextType := "s3"
	plaintextRegion := "us-west-2"
	store.SetValue("mys3", "type", plaintextType)
	store.SetValue("mys3", "region", plaintextRegion)
	require.NoError(t, store.Save())

	// Inspect the raw BSON document in MongoDB
	ctx := context.Background()
	var doc bson.M
	err := collection.FindOne(ctx, bson.M{"_id": "mys3"}).Decode(&doc)
	require.NoError(t, err)

	// Verify ID
	assert.Equal(t, "mys3", doc["_id"])

	// Verify flattened structure: "type" and "region" should be top-level fields (excluding _id)
	assert.Contains(t, doc, "type")
	assert.Contains(t, doc, "region")

	// Verify values are binary and encrypted (not plaintext)
	for _, key := range []string{"type", "region"} {
		var encrypted []byte
		if b, ok := doc[key].(bson.Binary); ok {
			encrypted = b.Data
		} else if b, ok := doc[key].([]byte); ok {
			encrypted = b
		} else {
			t.Fatalf("field %s should be binary data", key)
		}

		assert.NotEqual(t, plaintextType, string(encrypted))
		assert.NotEqual(t, plaintextRegion, string(encrypted))
		assert.True(t, len(encrypted) > len(plaintextType), "ciphertext should be longer than plaintext due to nonce/tag")
	}

	// 2. Verify field-level deletion propagates to MongoDB
	store.DeleteKey("mys3", "region")
	require.NoError(t, store.Save())

	doc = bson.M{} // RESET MAP to avoid merging from previous Decode
	err = collection.FindOne(ctx, bson.M{"_id": "mys3"}).Decode(&doc)
	require.NoError(t, err)
	assert.Contains(t, doc, "type")
	assert.NotContains(t, doc, "region", "deleted field should be removed from MongoDB document")

	// 3. Verify empty section results in document deletion
	store.DeleteSection("mys3")
	require.NoError(t, store.Save())

	count, err := collection.CountDocuments(ctx, bson.M{"_id": "mys3"})
	require.NoError(t, err)
	assert.Equal(t, int64(0), count, "empty section should result in document being deleted from MongoDB")
}

func TestSetValue_CreatesSection(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("remote1", "type", "s3")

	v, found := store.GetValue("remote1", "type")
	assert.True(t, found)
	assert.Equal(t, "s3", v)
}

func TestGetValue_MissingSection(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	v, found := store.GetValue("nonexistent", "type")
	assert.False(t, found)
	assert.Empty(t, v)
}

func TestGetValue_MissingKey(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("remote1", "type", "s3")

	v, found := store.GetValue("remote1", "nosuchkey")
	assert.False(t, found)
	assert.Empty(t, v)
}

func TestSetValue_Overwrites(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("remote1", "type", "s3")
	store.SetValue("remote1", "type", "drive") // overwrite

	v, found := store.GetValue("remote1", "type")
	assert.True(t, found)
	assert.Equal(t, "drive", v)
}

func TestHasSection(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	assert.False(t, store.HasSection("remote1"))
	store.SetValue("remote1", "type", "s3")
	assert.True(t, store.HasSection("remote1"))
}

func TestGetSectionList(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("alpha", "type", "s3")
	store.SetValue("beta", "type", "drive")

	sections := store.GetSectionList()
	assert.ElementsMatch(t, []string{"alpha", "beta"}, sections)
}

func TestDeleteSection(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("remote1", "type", "s3")
	require.True(t, store.HasSection("remote1"))

	store.DeleteSection("remote1")
	assert.False(t, store.HasSection("remote1"))
}

func TestDeleteSection_Nonexistent(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	// Should not panic
	store.DeleteSection("doesnotexist")
}

func TestGetKeyList(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("remote1", "type", "s3")
	store.SetValue("remote1", "region", "us-east-1")
	store.SetValue("remote1", "bucket", "mybucket")

	keys := store.GetKeyList("remote1")
	assert.ElementsMatch(t, []string{"type", "region", "bucket"}, keys)
}

func TestGetKeyList_MissingSection(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	keys := store.GetKeyList("nonexistent")
	assert.Nil(t, keys)
}

func TestDeleteKey(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("remote1", "type", "s3")
	store.SetValue("remote1", "region", "us-east-1")

	deleted := store.DeleteKey("remote1", "region")
	assert.True(t, deleted)

	_, found := store.GetValue("remote1", "region")
	assert.False(t, found)
	// section still exists because "type" remains
	assert.True(t, store.HasSection("remote1"))
}

func TestDeleteKey_LastKey_RemovesSection(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("remote1", "type", "s3")
	store.DeleteKey("remote1", "type")

	// Section should be auto-removed when last key is deleted
	assert.False(t, store.HasSection("remote1"))
}

func TestDeleteKey_Nonexistent(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	deleted := store.DeleteKey("nosection", "nokey")
	assert.False(t, deleted)
}

func TestEncryption_DataIsEncryptedInMongoDB(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("secure", "token", "supersecrettoken")
	require.NoError(t, store.Save())

	// Reload and verify plaintext is recovered correctly
	require.NoError(t, store.Load())

	v, found := store.GetValue("secure", "token")
	assert.True(t, found)
	assert.Equal(t, "supersecrettoken", v)
}

func TestSerialize(t *testing.T) {
	store, _, cleanup := setup(t)
	defer cleanup()

	store.SetValue("mys3", "type", "s3")
	store.SetValue("mys3", "region", "us-west-2")

	out, err := store.Serialize()
	assert.NoError(t, err)
	assert.Contains(t, out, "[mys3]")
	assert.Contains(t, out, "type = s3")
	assert.Contains(t, out, "region = us-west-2")
}

func TestNew_EmptyKey(t *testing.T) {
	_, err := mongodb.New(nil, "")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be empty")
}

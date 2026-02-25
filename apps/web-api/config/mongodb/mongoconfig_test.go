package mongoconfig

import (
	"context"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func setupTestDB(t *testing.T) (*MongoStorage, func()) {
	t.Helper()

	// Use generic mongo test container or simple local Mongo if available.
	// We'll assume a local default mongo is running for these tests.
	// In CI, you'd want to use testcontainers-go.
	uri := "mongodb://localhost:27017"
	dbName := "rclone_test_db"
	colName := "rclone_configs"
	ctx := context.Background()

	// Clear out DB first
	clientOpts := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(clientOpts)
	if err != nil {
		t.Skipf("MongoDB not running on localhost:27017, skipping tests: %v", err)
	}
	_ = client.Database(dbName).Collection(colName).Drop(ctx)
	_ = client.Disconnect(ctx)

	// 32-byte key for AES-256
	key := []byte("12345678901234567890123456789012")
	storage, err := NewMongoStorage(ctx, uri, dbName, colName, key)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	cleanup := func() {
		_ = storage.collection.Drop(ctx)
		_ = storage.Close()
	}

	return storage, cleanup
}

func TestMongoStorage_BasicOps(t *testing.T) {
	storage, cleanup := setupTestDB(t)
	defer cleanup()

	// Test SetValue
	storage.SetValue("remote1", "type", "s3")
	storage.SetValue("remote1", "env_auth", "false")

	val, found := storage.GetValue("remote1", "type")
	if !found || val != "s3" {
		t.Errorf("GetValue failed. Expected 's3', got '%s'", val)
	}

	// Test HasSection
	if !storage.HasSection("remote1") {
		t.Error("HasSection should be true")
	}
	if storage.HasSection("nonexistent") {
		t.Error("HasSection should be false")
	}

	// Test GetSectionList
	sections := storage.GetSectionList()
	if len(sections) != 1 || sections[0] != "remote1" {
		t.Errorf("GetSectionList failed. Got %v", sections)
	}

	// Test GetKeyList
	keys := storage.GetKeyList("remote1")
	if len(keys) != 2 {
		t.Errorf("GetKeyList failed. Expected length 2, got %d", len(keys))
	}

	// Test DeleteKey
	deleted := storage.DeleteKey("remote1", "env_auth")
	if !deleted {
		t.Error("DeleteKey should return true")
	}

	keys = storage.GetKeyList("remote1")
	if len(keys) != 1 || keys[0] != "type" {
		t.Errorf("GetKeyList after delete failed. %v", keys)
	}

	// Test DeleteSection
	storage.DeleteSection("remote1")
	if storage.HasSection("remote1") {
		t.Error("HasSection should be false after DeleteSection")
	}
}

func TestMongoStorage_Encryption(t *testing.T) {
	storage, cleanup := setupTestDB(t)
	defer cleanup()

	// A sensitive key and normal key
	storage.SetValue("secure", "type", "s3")
	storage.SetValue("secure", "access_key_id", "my-secret-id")
	storage.SetValue("secure", "secret_access_key", "my-super-secret-key")

	// Wait a tiny bit for the async save to finish
	// (in a real test we'd sync this for testing purposes)
	// For testing we will just verify what's actually in Mongo

	// Read directly from Mongo bypassing the Storage interface
	ctx := context.Background()
	var doc RcloneConfig
	err := storage.collection.FindOne(ctx, bson.M{"section": "secure"}).Decode(&doc)
	if err != nil {
		t.Fatalf("Failed to read directly from Mongo: %v", err)
	}

	if doc.Keys["type"] != "s3" {
		t.Errorf("type should not be encrypted, got %v", doc.Keys["type"])
	}

	if doc.Keys["secret_access_key"] == "my-super-secret-key" {
		t.Error("secret_access_key should be encrypted in DB, found plaintext")
	}

	// Verify decrypt works via standard interface
	val, found := storage.GetValue("secure", "secret_access_key")
	if !found || val != "my-super-secret-key" {
		t.Errorf("Failed to read/decrypt value. Got: %s", val)
	}
}

func TestMongoStorage_Load(t *testing.T) {
	storage, cleanup := setupTestDB(t)
	defer cleanup()

	storage.SetValue("state", "foo", "bar")

	// Wait a moment for async save
	// Testing only
	time.Sleep(100 * time.Millisecond)

	// Create a new storage pointing to same DB to test Load
	uri := "mongodb://localhost:27017"
	key := []byte("12345678901234567890123456789012")
	storage2, err := NewMongoStorage(context.Background(), uri, "rclone_test_db", "rclone_configs", key)
	if err != nil {
		t.Fatalf("Failed to create second storage: %v", err)
	}
	defer storage2.Close()

	if !storage2.HasSection("state") {
		t.Error("Loaded storage did not have 'state' section")
	}

	val, found := storage2.GetValue("state", "foo")
	if !found || val != "bar" {
		t.Errorf("Loaded storage failed to get value. Got: %s", val)
	}
}

package cmd

import (
	"context"
	"encoding/hex"
	"log"
	"os"

	"github.com/rclone/rclone/fs/config"
	_ "github.com/rclone/rclone/fs/config/configfile" // installs file-backed storage

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/ekarton/RClone-Cloud/apps/web-api/config/mongodb"
)

func Migrate(configPath string) {
	ctx := context.Background()

	// 1. Point rclone at your existing .conf file and load it
	if err := config.SetConfigPath(configPath); err != nil {
		log.Fatalf("set config path: %v", err)
	}
	fileStore := config.LoadedData() // reads and parses the file

	// 2. Connect to MongoDB
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI is not set")
	}
	keyHex := os.Getenv("RCLONE_ENCRYPTION_KEY")
	if len(keyHex) != 64 {
		log.Fatal("RCLONE_ENCRYPTION_KEY must be a 64-character hex string")
	}
	encKey, err := hex.DecodeString(keyHex)
	if err != nil {
		log.Fatalf("invalid key: %v", err)
	}

	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer client.Disconnect(ctx)

	mongoStore, err := mongodb.New(
		client.Database("rclone").Collection("configs"),
		encKey,
	)
	if err != nil {
		log.Fatalf("init mongo storage: %v", err)
	}

	// 3. Copy every section + key from file → mongo
	sections := fileStore.GetSectionList()
	if len(sections) == 0 {
		log.Println("No sections found — nothing to migrate.")
		return
	}

	for _, section := range sections {
		for _, key := range fileStore.GetKeyList(section) {
			value, _ := fileStore.GetValue(section, key)
			mongoStore.SetValue(section, key, value)
		}
		log.Printf("✓ %s (%d keys)", section, len(fileStore.GetKeyList(section)))
	}

	// 4. Flush to MongoDB
	if err := mongoStore.Save(); err != nil {
		log.Fatalf("save to mongodb: %v", err)
	}

	log.Printf("Done — %d remotes migrated.", len(sections))
}

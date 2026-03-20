package dump

import (
	"context"
	"fmt"
	"log"
	"os"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
)

// Dump connects to MongoDB, retrieves all configs, and writes them to filePath in INI format.
func Dump(mongoURI, filePath string) {
	ctx := context.Background()

	// 1. Connect to MongoDB
	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer func() {
		if err := client.Disconnect(ctx); err != nil {
			log.Printf("mongo disconnect: %v", err)
		}
	}()

	// 2. Initialize MongoStorage
	encKey := os.Getenv("RCLONE_ENCRYPTION_KEY")
	if encKey == "" {
		log.Fatal("RCLONE_ENCRYPTION_KEY is not set")
	}

	mongoStore, err := mongodb.New(
		client.Database("rclone").Collection("configs"),
		encKey,
	)
	if err != nil {
		log.Fatalf("init mongo storage: %v", err)
	}

	// 3. Load and decrypt all configs
	if err := mongoStore.Load(); err != nil {
		log.Fatalf("load from mongodb: %v", err)
	}

	// 4. Serialize to INI format
	data, err := mongoStore.Serialize()
	if err != nil {
		log.Fatalf("serialize: %v", err)
	}

	// 5. Write to file
	if err := os.WriteFile(filePath, []byte(data), 0600); err != nil {
		log.Fatalf("write file: %v", err)
	}

	fmt.Printf("✓ Config dumped to %s\n", filePath)
}

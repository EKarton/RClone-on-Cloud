package migrate

import (
	"context"
	"log"
	"os"

	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configfile"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
)

func Migrate(configPath string, mongoURI string) {
	ctx := context.Background()

	// 1. Point rclone at your existing .conf file and load it
	if err := config.SetConfigPath(configPath); err != nil {
		log.Fatalf("set config path: %v", err)
	}
	configfile.Install()
	fileStore := config.Data() // reads and parses the file

	// 2. Connect to MongoDB
	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer func() {
		if err := client.Disconnect(ctx); err != nil {
			log.Printf("mongo disconnect: %v", err)
		}
	}()

	mongoStore, err := mongodb.New(
		client.Database("rclone").Collection("configs"),
		os.Getenv("RCLONE_ENCRYPTION_KEY"),
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

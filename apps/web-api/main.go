package main

import (
	"context"
	"encoding/hex"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/rc"
	"github.com/rclone/rclone/fs/rc/rcserver"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	_ "github.com/rclone/rclone/backend/all" // all 50+ backends
	_ "github.com/rclone/rclone/fs/operations"
	_ "github.com/rclone/rclone/fs/sync"

	_ "github.com/ekarton/RClone-Cloud/apps/web-api/config/mongodb"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	// 1. Parse 32-byte encryption key from env (64 hex chars)
	keyHex := os.Getenv("RCLONE_ENCRYPTION_KEY")
	if len(keyHex) != 64 {
		log.Fatal("RCLONE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
	}
	encKey, err := hex.DecodeString(keyHex)
	if err != nil {
		log.Fatalf("invalid RCLONE_ENCRYPTION_KEY: %v", err)
	}

	// 2. Connect to MongoDB
	mongoURI := os.Getenv("MONGODB_URI") // e.g. "mongodb://localhost:27017"
	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer client.Disconnect(ctx)

	collection := client.Database("rclone").Collection("configs")

	// 3. Create storage and load existing config into memory
	store, err := mongoconfig.NewMongoStorage(collection, encKey)
	if err != nil {
		log.Fatalf("init storage: %v", err)
	}
	if err := store.Load(); err != nil {
		log.Fatalf("load config: %v", err)
	}

	// 4. Inject into rclone BEFORE any operation runs
	config.SetData(store)

	// 5. Start embedded RC server
	rc.Opt.Enabled = true
	rc.Opt.HTTP.ListenAddr = []string{":8080"}
	rc.Opt.NoAuth = true // set to false and add creds in production

	s, err := rcserver.Start(ctx, &rc.Opt)
	if err != nil {
		log.Fatalf("start rc server: %v", err)
	}

	log.Println("rclone RC server listening on :8080")
	s.Wait()
}

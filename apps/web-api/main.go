package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/ekarton/RClone-Cloud/apps/web-api/auth"
	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone"
	mongocfg "github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	env := LoadEnv()

	// -- MongoDB --
	client, err := mongo.Connect(options.Client().ApplyURI(env.MongoURI))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer func() {
		log.Println("shutting down mongo...")
		if err := client.Disconnect(ctx); err != nil {
			log.Printf("error shutting down mongo: %v", err)
		}
	}()

	// -- Rclone config (encrypted in MongoDB) --
	store, err := mongocfg.New(client.Database("rclone").Collection("configs"), env.EncryptionKey)
	if err != nil {
		log.Fatalf("init storage: %v", err)
	}
	if err := store.Load(); err != nil {
		log.Fatalf("load config: %v", err)
	}

	// -- Rclone RC server --
	rcServer, err := rclone.StartRCServer(ctx, store, "127.0.0.1:9090")
	if err != nil {
		log.Fatalf("init rclone rc server: %v", err)
	}
	defer func() {
		log.Printf("shutting down rclone rc server...")
		if err := rcServer.Shutdown(); err != nil {
			log.Printf("error shutting down rclone rc server: %v", err)
		}
	}()

	// -- Rclone Proxy (JWT-protected) --
	proxyHandler, err := rclone.NewProxyHandler(env.JWTPublicKeyPEM, "127.0.0.1:9090")
	if err != nil {
		log.Fatalf("init rclone proxy: %v", err)
	}

	// -- Google OAuth2 --
	authHandler, err := auth.NewHandler(auth.Config{
		GoogleClientID:     env.GoogleClientID,
		GoogleClientSecret: env.GoogleClientSecret,
		RedirectURL:        env.GoogleRedirectURL,
		PrivateKeyPEM:      env.JWTPrivateKeyPEM,
		AllowedGoogleIDs:   env.AllowedGoogleIDs,
	})
	if err != nil {
		log.Fatalf("init auth: %v", err)
	}

	mux := http.NewServeMux()
	authHandler.RegisterRoutes(mux)
	proxyHandler.RegisterRoutes(mux)

	server := &http.Server{Addr: env.ListenAddr, Handler: mux}
	go func() {
		log.Printf("API listening on %s", env.ListenAddr)
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("public server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down web api...")
	server.Shutdown(context.Background())
}

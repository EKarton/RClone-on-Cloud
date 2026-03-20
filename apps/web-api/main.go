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
	"github.com/ekarton/RClone-Cloud/apps/web-api/shared/cors"
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
	defer func() {
		log.Println("saving config to mongo...")
		if err := store.Save(); err != nil {
			log.Printf("error saving config: %v", err)
		}
	}()

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

	// -- Rclone API (Direct integration, JWT-protected) --
	// This also initializes the global RClone system state.
	rcloneHandler, err := rclone.NewRCloneAPIHandler(env.JWTPublicKeyPEM, store)
	if err != nil {
		log.Fatalf("init rclone handler: %v", err)
	}

	mux := http.NewServeMux()
	authHandler.RegisterRoutes(mux)
	rcloneHandler.RegisterRoutes(mux)

	server := &http.Server{Addr: env.ListenAddr, Handler: cors.NewMiddleware(env.CORSAllowedURLs)(mux)}
	go func() {
		log.Printf("API listening on %s", env.ListenAddr)
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("public server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down web api...")
	if err := server.Shutdown(context.Background()); err != nil {
		log.Printf("HTTP server Shutdown: %v", err)
	}
}

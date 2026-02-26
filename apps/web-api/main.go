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
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	env := LoadEnv()

	// -- Rclone (MongoDB config + RC server + JWT-protected proxy) --
	rcloneHandler, err := rclone.NewHandler(ctx, rclone.Config{
		MongoURI:         env.MongoURI,
		EncryptionKey:    env.EncryptionKey,
		JWTPublicKeyPath: env.JWTPublicKeyPath,
	})
	if err != nil {
		log.Fatalf("init rclone: %v", err)
	}
	defer rcloneHandler.Shutdown(ctx)

	// -- Google OAuth2 --
	authHandler, err := auth.NewHandler(auth.Config{
		GoogleClientID:     env.GoogleClientID,
		GoogleClientSecret: env.GoogleClientSecret,
		RedirectURL:        env.GoogleRedirectURL,
		PrivateKeyPath:     env.JWTPrivateKeyPath,
	})
	if err != nil {
		log.Fatalf("init auth: %v", err)
	}

	mux := http.NewServeMux()
	authHandler.RegisterRoutes(mux)
	rcloneHandler.RegisterRoutes(mux)

	srv := &http.Server{Addr: env.ListenAddr, Handler: mux}
	go func() {
		log.Printf("API listening on %s", env.ListenAddr)
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("public server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down...")
	srv.Shutdown(context.Background())
}

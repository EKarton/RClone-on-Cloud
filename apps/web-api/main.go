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
	"github.com/ekarton/RClone-Cloud/apps/web-api/telemetry"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.opentelemetry.io/contrib/instrumentation/go.mongodb.org/mongo-driver/v2/mongo/otelmongo"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/contrib/instrumentation/runtime"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	env := LoadEnv()

	// -- Telemetry --
	shutdown := telemetry.InitTelemetry(ctx, telemetry.Config{
		ServiceName:    env.OtelServiceName,
		ServiceVersion: env.OtelServiceVersion,
		Environment:    env.OtelEnvironment,
		Endpoint:       env.OtelExporterEndpoint,
		Headers:        env.OtelExporterHeaders,
	})
	defer func() {
		log.Println("shutting down telemetry...")
		if err := shutdown(context.Background()); err != nil {
			log.Printf("error shutting down telemetry: %v", err)
		}
	}()

	// Go runtime metrics
	if err := runtime.Start(); err != nil {
		log.Printf("failed to start runtime metrics: %v", err)
	}

	// -- MongoDB --
	mongoOpts := options.Client().ApplyURI(env.MongoURI).SetMonitor(otelmongo.NewMonitor())
	client, err := mongo.Connect(mongoOpts)
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
	store, err := mongocfg.New(client.Database(env.MongoDB).Collection(env.MongoCol), env.MongoKey)
	if err != nil {
		log.Fatalf("init storage: %v", err)
	}
	if err := store.Load(); err != nil {
		log.Fatalf("load config: %v", err)
	}
	if err := store.StartWatching(ctx); err != nil {
		log.Fatalf("start watching config: %v", err)
	}
	defer func() {
		log.Println("stopping watching config...")
		store.StopWatching()
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

	// Wrap with OpenTelemetry instrumentation
	otelHandler := otelhttp.NewHandler(mux, "http.request")

	server := &http.Server{
		Addr:    env.ListenAddr,
		Handler: cors.NewMiddleware(env.CORSAllowedURLs)(otelHandler),
	}
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

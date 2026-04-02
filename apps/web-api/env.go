package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Env holds all environment-driven configuration for the application.
type Env struct {
	MongoKey           string
	MongoURI           string
	MongoDB            string
	MongoCol           string
	JWTPublicKeyPEM    string
	JWTPrivateKeyPEM   string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	ListenAddr         string
	AllowedGoogleIDs   []string
	CORSAllowedURLs    []string

	OtelServiceName      string
	OtelServiceVersion   string
	OtelEnvironment      string
	OtelExporterEndpoint string
	OtelExporterHeaders  string
}

// LoadEnv reads and validates all required environment variables,
// returning a populated Env or fataling on any missing/invalid value.
func LoadEnv() Env {
	_ = godotenv.Load()

	pub := requireEnv("AUTH_JWT_PUBLIC_KEY")
	priv := requireEnv("AUTH_JWT_PRIVATE_KEY")

	allowedGoogleIDsStr := requireEnv("AUTH_ALLOWED_GOOGLE_IDS")
	var allowedGoogleIDs []string
	for _, id := range strings.Split(allowedGoogleIDsStr, ",") {
		id = strings.TrimSpace(id)
		if id != "" {
			allowedGoogleIDs = append(allowedGoogleIDs, id)
		}
	}
	if len(allowedGoogleIDs) == 0 {
		log.Fatal("AUTH_ALLOWED_GOOGLE_IDS must contain at least one valid Google ID")
	}

	corsAllowedURLsStr := getEnv("CORS_ALLOWED_URLS", "http://localhost:4200")
	var corsAllowedURLs []string
	for _, url := range strings.Split(corsAllowedURLsStr, ",") {
		url = strings.TrimSpace(url)
		if url != "" {
			corsAllowedURLs = append(corsAllowedURLs, url)
		}
	}

	return Env{
		MongoKey:             requireEnv("RCLONE_CONFIG_MONGO_KEY"),
		MongoURI:             requireEnv("RCLONE_CONFIG_MONGO_URI"),
		MongoDB:              getEnv("RCLONE_CONFIG_MONGO_DB", "rclone"),
		MongoCol:             getEnv("RCLONE_CONFIG_MONGO_COL", "configs"),
		JWTPublicKeyPEM:      pub,
		JWTPrivateKeyPEM:     priv,
		GoogleClientID:       requireEnv("AUTH_GOOGLE_CLIENT_ID"),
		GoogleClientSecret:   requireEnv("AUTH_GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:    getEnv("AUTH_GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/v1/google/callback"),
		ListenAddr:           getEnv("LISTEN_ADDR", ":8080"),
		AllowedGoogleIDs:     allowedGoogleIDs,
		CORSAllowedURLs:      corsAllowedURLs,
		OtelServiceName:      getEnv("OTEL_SERVICE_NAME", "rclone-cloud-web-api"),
		OtelServiceVersion:   getEnv("OTEL_SERVICE_VERSION", "1.0.0"),
		OtelEnvironment:      getEnv("OTEL_ENVIRONMENT", "development"),
		OtelExporterEndpoint: os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"),
		OtelExporterHeaders:  os.Getenv("OTEL_EXPORTER_OTLP_HEADERS"),
	}
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required environment variable %s is not set", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// String returns a redacted string representation of the Env.
func (e Env) String() string {
	return fmt.Sprintf("ListenAddr=%s MongoURI=*** GoogleRedirectURL=%s", e.ListenAddr, e.GoogleRedirectURL)
}

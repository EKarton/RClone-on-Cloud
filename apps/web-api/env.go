package main

import (
	"fmt"
	"log"
	"os"
	"strings"
)

// Env holds all environment-driven configuration for the application.
type Env struct {
	EncryptionKey      string
	MongoURI           string
	JWTPublicKeyPath   string
	JWTPrivateKeyPath  string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	ListenAddr         string
	AllowedGoogleIDs   []string
}

// LoadEnv reads and validates all required environment variables,
// returning a populated Env or fataling on any missing/invalid value.
func LoadEnv() Env {
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

	return Env{
		EncryptionKey:      requireEnv("RCLONE_CONFIG_ENCRYPTION_KEY"),
		MongoURI:           requireEnv("RCLONE_CONFIG_MONGODB_URI"),
		JWTPublicKeyPath:   requireEnv("AUTH_JWT_PUBLIC_KEY_PATH"),
		JWTPrivateKeyPath:  requireEnv("AUTH_JWT_PRIVATE_KEY_PATH"),
		GoogleClientID:     requireEnv("AUTH_GOOGLE_CLIENT_ID"),
		GoogleClientSecret: requireEnv("AUTH_GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnv("AUTH_GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/v1/google/callback"),
		ListenAddr:         getEnv("LISTEN_ADDR", ":8080"),
		AllowedGoogleIDs:   allowedGoogleIDs,
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

func (e Env) String() string {
	return fmt.Sprintf("ListenAddr=%s MongoURI=*** GoogleRedirectURL=%s", e.ListenAddr, e.GoogleRedirectURL)
}

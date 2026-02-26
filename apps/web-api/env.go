package main

import (
	"encoding/hex"
	"fmt"
	"log"
	"os"
)

// Env holds all environment-driven configuration for the application.
type Env struct {
	EncryptionKey      []byte // 32-byte AES-256 key (decoded from hex)
	MongoURI           string
	JWTPublicKeyPath   string
	JWTPrivateKeyPath  string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	ListenAddr         string
}

// LoadEnv reads and validates all required environment variables,
// returning a populated Env or fataling on any missing/invalid value.
func LoadEnv() Env {
	encKeyHex := requireEnv("RCLONE_ENCRYPTION_KEY")
	encKey, err := hex.DecodeString(encKeyHex)
	if err != nil || len(encKey) != 32 {
		log.Fatal("RCLONE_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)")
	}

	return Env{
		EncryptionKey:      encKey,
		MongoURI:           requireEnv("MONGODB_URI"),
		JWTPublicKeyPath:   requireEnv("JWT_PUBLIC_KEY_PATH"),
		JWTPrivateKeyPath:  requireEnv("JWT_PRIVATE_KEY_PATH"),
		GoogleClientID:     requireEnv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/callback"),
		ListenAddr:         getEnv("LISTEN_ADDR", ":8080"),
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

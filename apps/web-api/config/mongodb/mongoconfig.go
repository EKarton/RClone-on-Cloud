package mongodb

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"

	"github.com/rclone/rclone/fs/config"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type configDoc struct {
	ID            string `bson:"_id"`
	EncryptedData []byte `bson:"encrypted_data"`
}

// MongoStorage implements rclone's config.Storage backed by MongoDB.
// All config values are encrypted at rest with AES-256-GCM.
type MongoStorage struct {
	mu         sync.RWMutex
	data       map[string]map[string]string // in-memory cache
	collection *mongo.Collection
	key        []byte // must be exactly 32 bytes (AES-256)
}

var _ config.Storage = (*MongoStorage)(nil)

// New creates a MongoStorage. encKey must be exactly 32 bytes.
func New(collection *mongo.Collection, encKey []byte) (*MongoStorage, error) {
	if len(encKey) != 32 {
		return nil, fmt.Errorf("encryption key must be 32 bytes for AES-256, got %d", len(encKey))
	}
	return &MongoStorage{
		data:       make(map[string]map[string]string),
		collection: collection,
		key:        encKey,
	}, nil
}

// --- Encryption helpers ---

func (s *MongoStorage) encrypt(plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	// Layout: nonce || ciphertext+tag
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

func (s *MongoStorage) decrypt(data []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(data) < gcm.NonceSize() {
		return nil, fmt.Errorf("ciphertext too short")
	}
	nonce, ciphertext := data[:gcm.NonceSize()], data[gcm.NonceSize():]
	return gcm.Open(nil, nonce, ciphertext, nil)
}

// --- config.Storage implementation ---

// Load reads all documents from MongoDB, decrypts them, and populates
// the in-memory cache. Called once at startup.
func (s *MongoStorage) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	ctx := context.Background()
	cursor, err := s.collection.Find(ctx, bson.D{})
	if err != nil {
		return fmt.Errorf("load: %w", err)
	}
	defer cursor.Close(ctx)

	data := make(map[string]map[string]string)
	for cursor.Next(ctx) {
		var doc configDoc
		if err := cursor.Decode(&doc); err != nil {
			return fmt.Errorf("load: decode: %w", err)
		}
		plaintext, err := s.decrypt(doc.EncryptedData)
		if err != nil {
			return fmt.Errorf("load: decrypt %q: %w", doc.ID, err)
		}
		var kv map[string]string
		if err := json.Unmarshal(plaintext, &kv); err != nil {
			return fmt.Errorf("load: unmarshal %q: %w", doc.ID, err)
		}
		data[doc.ID] = kv
	}
	if err := cursor.Err(); err != nil {
		return fmt.Errorf("load: cursor: %w", err)
	}
	s.data = data
	return nil
}

// Save encrypts each in-memory section and upserts it to MongoDB.
// Sections deleted from memory are also deleted from MongoDB.
func (s *MongoStorage) Save() error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ctx := context.Background()

	// Collect existing IDs to detect deletions
	cursor, err := s.collection.Find(ctx, bson.D{},
		options.Find().SetProjection(bson.D{{Key: "_id", Value: 1}}))
	if err != nil {
		return fmt.Errorf("save: list existing: %w", err)
	}
	existingIDs := make(map[string]bool)
	for cursor.Next(ctx) {
		var doc struct {
			ID string `bson:"_id"`
		}
		cursor.Decode(&doc)
		existingIDs[doc.ID] = true
	}
	cursor.Close(ctx)

	// Upsert current in-memory sections
	for section, kv := range s.data {
		plaintext, err := json.Marshal(kv)
		if err != nil {
			return fmt.Errorf("save: marshal %q: %w", section, err)
		}
		ciphertext, err := s.encrypt(plaintext)
		if err != nil {
			return fmt.Errorf("save: encrypt %q: %w", section, err)
		}
		filter := bson.D{{Key: "_id", Value: section}}
		update := bson.D{{Key: "$set", Value: bson.D{
			{Key: "encrypted_data", Value: ciphertext},
		}}}
		_, err = s.collection.UpdateOne(ctx, filter, update,
			options.UpdateOne().SetUpsert(true))
		if err != nil {
			return fmt.Errorf("save: upsert %q: %w", section, err)
		}
		delete(existingIDs, section) // mark as accounted for
	}

	// Delete any sections that were removed from memory
	for id := range existingIDs {
		_, _ = s.collection.DeleteOne(ctx, bson.D{{Key: "_id", Value: id}})
	}
	return nil
}

// Serialize produces a plaintext INI-style dump (used by rclone's dump commands).
func (s *MongoStorage) Serialize() (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sections := make([]string, 0, len(s.data))
	for section := range s.data {
		sections = append(sections, section)
	}
	sort.Strings(sections)

	var b strings.Builder
	for _, section := range sections {
		fmt.Fprintf(&b, "[%s]\n", section)
		keys := make([]string, 0, len(s.data[section]))
		for k := range s.data[section] {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, key := range keys {
			fmt.Fprintf(&b, "%s = %s\n", key, s.data[section][key])
		}
		b.WriteString("\n")
	}
	return b.String(), nil
}

// --- Section/key accessors (in-memory only, Save() flushes to MongoDB) ---

func (s *MongoStorage) GetSectionList() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, 0, len(s.data))
	for section := range s.data {
		out = append(out, section)
	}
	return out
}

func (s *MongoStorage) HasSection(section string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.data[section]
	return ok
}

func (s *MongoStorage) DeleteSection(section string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data, section)
}

func (s *MongoStorage) GetKeyList(section string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.data[section] == nil {
		return nil
	}

	out := make([]string, 0, len(s.data[section]))
	for k := range s.data[section] {
		out = append(out, k)
	}
	return out
}

func (s *MongoStorage) GetValue(section, key string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.data[section] == nil {
		return "", false
	}
	v, ok := s.data[section][key]
	return v, ok
}

func (s *MongoStorage) SetValue(section, key, value string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.data[section] == nil {
		s.data[section] = make(map[string]string)
	}
	s.data[section][key] = value
}

func (s *MongoStorage) DeleteKey(section, key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.data[section] == nil {
		return false
	}
	_, ok := s.data[section][key]
	if ok {
		delete(s.data[section], key)
		if len(s.data[section]) == 0 {
			delete(s.data, section)
		}
	}
	return ok
}

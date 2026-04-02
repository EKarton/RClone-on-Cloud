package mongodb

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"io"
	"log"
	"sort"
	"strings"
	"sync"

	"github.com/rclone/rclone/fs/config"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// MongoStorage implements rclone's config.Storage backed by MongoDB.
// All config values are encrypted at rest with AES-256-GCM.
type MongoStorage struct {
	mu          sync.RWMutex
	data        map[string]map[string]string // in-memory cache
	collection  *mongo.Collection
	key         []byte // derived from SHA-256 hash of the input key string
	cancelWatch context.CancelFunc
}

var _ config.Storage = (*MongoStorage)(nil)

// New creates a MongoStorage. encKeyStr will be hashed with SHA-256 to derive a 32-byte key.
func New(collection *mongo.Collection, encKeyStr string) (*MongoStorage, error) {
	trimmedKey := strings.TrimSpace(encKeyStr)
	if trimmedKey == "" {
		return nil, fmt.Errorf("encryption key cannot be empty or only whitespace")
	}
	hash := sha256.Sum256([]byte(trimmedKey))
	return &MongoStorage{
		data:       make(map[string]map[string]string),
		collection: collection,
		key:        hash[:],
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

// Load reads all documents from MongoDB, decrypts each field, and populates
// the in-memory cache. Called once at startup.
func (s *MongoStorage) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	ctx := context.Background()
	cursor, err := s.collection.Find(ctx, bson.D{})
	if err != nil {
		return fmt.Errorf("load: %w", err)
	}
	defer func() { _ = cursor.Close(ctx) }()

	data := make(map[string]map[string]string)
	for cursor.Next(ctx) {
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			return fmt.Errorf("load: decode: %w", err)
		}

		id, ok := doc["_id"].(string)
		if !ok {
			continue
		}

		section := make(map[string]string)
		for k, v := range doc {
			if k == "_id" {
				continue
			}
			encrypted, ok := v.([]byte)
			// Handle cases where MongoDB might return primitive.Binary
			if !ok {
				if b, ok := v.(bson.Binary); ok {
					encrypted = b.Data
				} else {
					continue
				}
			}

			plaintext, err := s.decrypt(encrypted)
			if err != nil {
				return fmt.Errorf("load: decrypt %q.%q: %w", id, k, err)
			}
			section[k] = string(plaintext)
		}
		data[id] = section
	}
	if err := cursor.Err(); err != nil {
		return fmt.Errorf("load: cursor: %w", err)
	}
	s.data = data
	return nil
}

// Save encrypts each key-value pair and upserts flattened documents to MongoDB.
// Documents deleted from memory are also deleted from MongoDB.
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
		if err := cursor.Decode(&doc); err != nil {
			return fmt.Errorf("save: decode existing: %w", err)
		}
		existingIDs[doc.ID] = true
	}
	_ = cursor.Close(ctx)

	// Upsert current in-memory sections as flattened documents
	for section, kv := range s.data {
		doc := bson.M{} // Do NOT include _id in the replacement document
		for k, v := range kv {
			ciphertext, err := s.encrypt([]byte(v))
			if err != nil {
				return fmt.Errorf("save: encrypt %q.%q: %w", section, k, err)
			}
			doc[k] = ciphertext
		}

		filter := bson.D{{Key: "_id", Value: section}}
		_, err = s.collection.ReplaceOne(ctx, filter, doc,
			options.Replace().SetUpsert(true))
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

// StartWatching opens a MongoDB Change Stream on the collection and spawns a
// background goroutine that propagates external changes (insert, update,
// replace, delete) into the in-memory cache. Change Streams require the
// MongoDB deployment to be a replica set or sharded cluster.
func (s *MongoStorage) StartWatching(ctx context.Context) error {
	opts := options.ChangeStream().SetFullDocument(options.UpdateLookup)
	cs, err := s.collection.Watch(ctx, mongo.Pipeline{}, opts)
	if err != nil {
		return fmt.Errorf("start watching: %w", err)
	}

	watchCtx, cancel := context.WithCancel(ctx)
	s.cancelWatch = cancel

	go s.processChangeStream(watchCtx, cs)
	return nil
}

// StopWatching cancels the background Change Stream watcher. It is safe
// to call even if StartWatching was never called.
func (s *MongoStorage) StopWatching() {
	if s.cancelWatch != nil {
		s.cancelWatch()
		s.cancelWatch = nil
	}
}

// processChangeStream loops on the Change Stream cursor and applies each
// event to the in-memory cache.
func (s *MongoStorage) processChangeStream(ctx context.Context, cs *mongo.ChangeStream) {
	defer func() { _ = cs.Close(ctx) }()

	for cs.Next(ctx) {
		var event struct {
			OperationType string `bson:"operationType"`
			DocumentKey   struct {
				ID string `bson:"_id"`
			} `bson:"documentKey"`
			FullDocument bson.M `bson:"fullDocument"`
		}
		if err := cs.Decode(&event); err != nil {
			log.Fatalln("change stream decode error: ", err)
			continue
		}

		log.Println("Received change event: ", event)

		switch event.OperationType {
		case "insert", "update", "replace":
			log.Println("Mongo config section updated: ", event.OperationType, event.DocumentKey.ID)
			s.applyFullDocument(event.DocumentKey.ID, event.FullDocument)
		case "delete":
			log.Println("Mongo config section deleted: ", event.OperationType, event.DocumentKey.ID)
			s.mu.Lock()
			delete(s.data, event.DocumentKey.ID)
			s.mu.Unlock()
		}
	}
	// cs.Next returns false when the context is cancelled or an error occurs.
	if err := cs.Err(); err != nil && ctx.Err() == nil {
		log.Fatalln("change stream: cursor: ", err)
	}
}

// applyFullDocument decrypts each field in the full BSON document and
// replaces the corresponding section in the in-memory cache.
func (s *MongoStorage) applyFullDocument(id string, doc bson.M) {
	if id == "" || doc == nil {
		return
	}

	section := make(map[string]string)
	for k, v := range doc {
		if k == "_id" {
			continue
		}
		var encrypted []byte
		switch b := v.(type) {
		case []byte:
			encrypted = b
		case bson.Binary:
			encrypted = b.Data
		default:
			continue
		}
		plaintext, err := s.decrypt(encrypted)
		if err != nil {
			log.Printf("change stream: decrypt %q.%q: %v", id, k, err)
			continue
		}
		section[k] = string(plaintext)
	}

	s.mu.Lock()
	s.data[id] = section
	s.mu.Unlock()
}

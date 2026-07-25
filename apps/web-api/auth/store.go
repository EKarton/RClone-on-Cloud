package auth

import (
	"context"
	"errors"
	"sync"
)

type UserData struct {
	UserID string
	Email  string
}

// InMemoryTokenStore implements TokenStore using a thread-safe map.
type InMemoryTokenStore struct {
	mu     sync.Mutex
	tokens map[string]UserData
}

// NewInMemoryTokenStore creates a new InMemoryTokenStore.
func NewInMemoryTokenStore() *InMemoryTokenStore {
	return &InMemoryTokenStore{
		tokens: make(map[string]UserData),
	}
}

// Store saves a new refresh token for a user.
func (s *InMemoryTokenStore) Store(ctx context.Context, userID, email, refreshToken string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tokens[refreshToken] = UserData{UserID: userID, Email: email}
	return nil
}

// ValidateAndRevoke checks if a refresh token is valid, returns the associated user data, and revokes it.
func (s *InMemoryTokenStore) ValidateAndRevoke(ctx context.Context, refreshToken string) (string, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, ok := s.tokens[refreshToken]
	if !ok {
		return "", "", errors.New("invalid or expired refresh token")
	}

	// Revoke the token to prevent reuse (implementing rotation)
	delete(s.tokens, refreshToken)
	return data.UserID, data.Email, nil
}

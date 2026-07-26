package health

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/v2/mongo/readpref"
)

type mockPinger struct {
	err error
}

func (m *mockPinger) Ping(ctx context.Context, rp *readpref.ReadPref) error {
	return m.err
}

func TestHealthHandler_Success(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, &mockPinger{err: nil})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "OK", strings.TrimSpace(rec.Body.String()))
}

func TestHealthHandler_Failure(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, &mockPinger{err: errors.New("connection timeout")})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
	assert.Contains(t, rec.Body.String(), "MongoDB unhealthy")
}

package health

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo/readpref"
)

// Pinger defines the interface for pinging MongoDB.
type Pinger interface {
	Ping(ctx context.Context, rp *readpref.ReadPref) error
}

// Handler handles health check requests.
type Handler struct {
	pinger Pinger
}

// NewHandler creates a new health check handler with the provided Pinger.
func NewHandler(pinger Pinger) *Handler {
	return &Handler{pinger: pinger}
}

// RegisterRoutes mounts the /health endpoint on the provided mux using the given Pinger.
func RegisterRoutes(mux *http.ServeMux, pinger Pinger) {
	handler := NewHandler(pinger)
	mux.HandleFunc("GET /health", handler.handleHealth)
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if h.pinger != nil {
		if err := h.pinger.Ping(ctx, readpref.Primary()); err != nil {
			http.Error(w, fmt.Sprintf("DB connection unhealthy: %v", err), http.StatusServiceUnavailable)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprintln(w, "OK")
}

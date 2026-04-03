package health

import (
	"fmt"
	"net/http"
)

// RegisterRoutes mounts the /health endpoint on the provided mux.
func RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", handleHealth)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprintln(w, "OK")
}

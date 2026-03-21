package cors

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewMiddleware(t *testing.T) {
	allowedOrigins := []string{"http://localhost:4200", "https://rclone-on-cloud-demo.netlify.app"}
	middleware := NewMiddleware(allowedOrigins)

	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	t.Run("Allowed Origin", func(t *testing.T) {
		req := httptest.NewRequest("GET", "http://example.com/api/v1/test", nil)
		req.Header.Set("Origin", "http://localhost:4200")
		rr := httptest.NewRecorder()

		middleware(h).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}
		if rr.Header().Get("Access-Control-Allow-Origin") != "http://localhost:4200" {
			t.Errorf("expected Access-Control-Allow-Origin http://localhost:4200, got %s", rr.Header().Get("Access-Control-Allow-Origin"))
		}
		if rr.Header().Get("Access-Control-Allow-Credentials") != "true" {
			t.Errorf("expected Access-Control-Allow-Credentials true, got %s", rr.Header().Get("Access-Control-Allow-Credentials"))
		}
	})

	t.Run("Disallowed Origin", func(t *testing.T) {
		req := httptest.NewRequest("GET", "http://example.com/api/v1/test", nil)
		req.Header.Set("Origin", "http://malicious.com")
		rr := httptest.NewRecorder()

		middleware(h).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}
		if rr.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Errorf("expected no Access-Control-Allow-Origin, got %s", rr.Header().Get("Access-Control-Allow-Origin"))
		}
	})

	t.Run("OPTIONS Request", func(t *testing.T) {
		req := httptest.NewRequest("OPTIONS", "http://example.com/api/v1/test", nil)
		req.Header.Set("Origin", "http://localhost:4200")
		rr := httptest.NewRecorder()

		middleware(h).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}
		if rr.Header().Get("Access-Control-Allow-Methods") == "" {
			t.Error("expected Access-Control-Allow-Methods header")
		}
	})
}

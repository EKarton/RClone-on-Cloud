package rclone

import (
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"regexp"
	"strings"

	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/fs/cache"
	"github.com/rclone/rclone/fs/list"
	"github.com/rclone/rclone/fs/rc"
	"github.com/rclone/rclone/fs/rc/jobs"
	"github.com/rclone/rclone/lib/http/serve"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"

	// Side-effect imports to register RC methods and backends
	_ "github.com/rclone/rclone/backend/all"
	_ "github.com/rclone/rclone/fs/operations"
	_ "github.com/rclone/rclone/fs/sync"
)

var (
	fsMatch = regexp.MustCompile(`^\[(.*?)\](.*)$`)
	tracer  = otel.Tracer("rclone-handler")
)

// allowedMethods is the set of rclone RC endpoints that this API exposes.
// Any POST to a path not listed here will be rejected with HTTP 403.
var allowedMethods = map[string]struct{}{
	"rc/noop":               {},
	"config/listremotes":    {},
	"operations/list":       {},
	"operations/about":      {},
	"operations/stat":       {},
	"operations/uploadfile": {},
	"operations/purge":      {},
	"operations/deletefile": {},
	"sync/copy":             {},
	"operations/copyfile":   {},
	"operations/movefile":   {},
	"sync/move":             {},
	"operations/mkdir":      {},
	"operations/cleanup":    {},
	"job/status":            {},
	"job/stop":              {},
}

// RCHandler dispatches requests directly to rclone's rc/jobs system.
type RCHandler struct{}

// NewRCHandler creates a new direct RC handler.
func NewRCHandler() *RCHandler {
	return &RCHandler{}
}

// ServeHTTP implements http.Handler.
func (h *RCHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimLeft(r.URL.Path, "/")

	switch r.Method {
	case "POST":
		h.handlePost(w, r, path)
	case "GET", "HEAD":
		h.handleGet(w, r, path)
	case "OPTIONS":
		w.WriteHeader(http.StatusOK)
	default:
		h.writeError(path, nil, w, fmt.Errorf("method %q not allowed", r.Method), http.StatusMethodNotAllowed)
	}
}

func (h *RCHandler) handleGet(w http.ResponseWriter, r *http.Request, path string) {
	fsMatchResult := fsMatch.FindStringSubmatch(path)
	if fsMatchResult != nil {
		h.serveRemote(w, r, fsMatchResult[2], fsMatchResult[1])
		return
	}
	http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
}

func (h *RCHandler) serveRemote(w http.ResponseWriter, r *http.Request, path string, fsName string) {
	ctx, span := tracer.Start(r.Context(), "serveRemote", trace.WithAttributes(
		attribute.String("rclone.fs", fsName),
		attribute.String("rclone.path", path),
	))
	defer span.End()

	f, err := cache.Get(ctx, fsName)
	if err != nil {
		h.writeError(path, nil, w, fmt.Errorf("failed to make Fs: %w", err), http.StatusInternalServerError)
		return
	}
	if path == "" || strings.HasSuffix(path, "/") {
		path = strings.Trim(path, "/")
		entries, err := list.DirSorted(ctx, f, false, path)
		if err != nil {
			h.writeError(path, nil, w, fmt.Errorf("failed to list directory: %w", err), http.StatusInternalServerError)
			return
		}
		// Note: We don't have rclone's HTML template here, so we use a simple directory listing or JSON if preferred.
		// For now, let's keep it simple and just list names if it's a directory.
		// Or we can use rclone's serve.NewDirectory if we can find a way to provide a template.
		// Since this is for an API, maybe JSON is better? But the original was HTML.
		// Let's use JSON for directory listings to be more "API-like".
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(entries)
	} else {
		path = strings.Trim(path, "/")
		o, err := f.NewObject(ctx, path)
		if err != nil {
			h.writeError(path, nil, w, fmt.Errorf("failed to find object: %w", err), http.StatusInternalServerError)
			return
		}
		serve.Object(w, r, o)
	}
}

func (h *RCHandler) handlePost(w http.ResponseWriter, r *http.Request, path string) {
	ctx := r.Context()
	contentType := r.Header.Get("Content-Type")

	var (
		contentTypeMediaType string
		contentTypeParams    map[string]string
	)
	if contentType != "" {
		var err error
		contentTypeMediaType, contentTypeParams, err = mime.ParseMediaType(contentType)
		if err != nil {
			h.writeError(path, nil, w, fmt.Errorf("failed to parse Content-Type: %w", err), http.StatusBadRequest)
			return
		}
	}

	values := r.URL.Query()
	if contentTypeMediaType == "application/x-www-form-urlencoded" {
		err := r.ParseForm()
		if err != nil {
			h.writeError(path, nil, w, fmt.Errorf("failed to parse form/URL parameters: %w", err), http.StatusBadRequest)
			return
		}
		values = r.Form
	}

	in := make(rc.Params)
	for k, vs := range values {
		if len(vs) > 0 {
			in[k] = vs[len(vs)-1]
		}
	}

	ctx, span := tracer.Start(ctx, "rclone.rc."+path)
	defer span.End()

	if contentTypeMediaType == "application/json" {
		if charset, ok := contentTypeParams["charset"]; ok && !strings.EqualFold(charset, "utf-8") {
			h.writeError(path, in, w, fmt.Errorf("unsupported charset %q for JSON input", charset), http.StatusBadRequest)
			return
		}

		err := json.NewDecoder(r.Body).Decode(&in)
		if err != nil && err.Error() != "EOF" {
			h.writeError(path, in, w, fmt.Errorf("failed to read input JSON: %w", err), http.StatusBadRequest)
			return
		}
	}

	if _, ok := allowedMethods[path]; !ok {
		h.writeError(path, in, w, fmt.Errorf("method %q is not allowed", path), http.StatusForbidden)
		return
	}

	call := rc.Calls.Get(path)
	if call == nil {
		h.writeError(path, in, w, fmt.Errorf("couldn't find method %q", path), http.StatusNotFound)
		return
	}

	// Note: We are bypassing the internal rclone auth checks since we use our own JWT middleware.
	// rclone's internal auth would require libhttp.Server state.

	inOrig := in.Copy()

	if call.NeedsRequest {
		in["_request"] = r
	}
	if call.NeedsResponse {
		in["_response"] = w
	}

	job, out, err := jobs.NewJob(ctx, call.Fn, in)
	if job != nil {
		w.Header().Add("x-rclone-jobid", fmt.Sprintf("%d", job.ID))
		span.SetAttributes(attribute.Int64("rclone.jobid", int64(job.ID)))
	}
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		h.writeError(path, inOrig, w, err, http.StatusInternalServerError)
		return
	}
	if out == nil {
		out = make(rc.Params)
	}

	w.Header().Set("Content-Type", "application/json")
	err = rc.WriteJSON(w, out)
	if err != nil {
		fs.Errorf(nil, "rc: handler: failed to write JSON output: %v", err)
	}
}

func (h *RCHandler) writeError(path string, in rc.Params, w http.ResponseWriter, err error, status int) {
	fs.Errorf(nil, "rc: %q: error: %v", path, err)
	params, status := rc.Error(path, in, err, status)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = rc.WriteJSON(w, params)
}

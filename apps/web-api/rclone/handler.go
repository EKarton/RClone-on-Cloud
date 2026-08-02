package rclone

import (
	"encoding/json"
	"fmt"
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/fs/cache"
	"github.com/rclone/rclone/fs/config"
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

// Is the set of allowed RClone RC endpoints.
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

// The rc.Params keys that specify an rclone filesystem
// (i.e. a remote reference such as "myremote:subpath").
var fsParamKeys = []string{"fs", "srcFs", "dstFs"}

// The rc.Params keys that specify a path within a remote.
var remoteParamKeys = []string{"remote", "srcRemote", "dstRemote"}

// Checks that an fs value (e.g. "myremote:", "myremote:sub/path")
// references a remote that is present in the rclone configuration.
// Bare filesystem paths (no colon) and on-the-fly connection strings (empty name
// before the colon, like ":local:/etc") are rejected.
func validateFsParam(value string) error {
	// rclone remote references always contain a colon, e.g. "myremote:" or "myremote:sub/path".
	colonIdx := strings.Index(value, ":")
	if colonIdx < 0 {
		return fmt.Errorf("invalid fs parameter %q: must reference a configured remote (e.g. \"myremote:\")", value)
	}

	remoteName := value[:colonIdx]
	if remoteName == "" {
		return fmt.Errorf("invalid fs parameter %q: empty remote name", value)
	}

	// Check that the remote name exists in the rclone configuration.
	for _, section := range config.FileSections() {
		if section == remoteName {
			return nil
		}
	}

	return fmt.Errorf("invalid fs parameter %q: remote %q is not configured", value, remoteName)
}

// Checks that a path within a remote does not contain
// path traversal sequences that could escape the remote's root.
func validateRemoteParam(value string) error {
	cleaned := filepath.ToSlash(value)
	for _, part := range strings.Split(cleaned, "/") {
		if part == ".." {
			return fmt.Errorf("invalid remote parameter %q: path traversal is not allowed", value)
		}
	}
	return nil
}

// Validates all fs and remote parameters in the given rc.Params.
func validateRCParams(in rc.Params) error {
	for _, key := range fsParamKeys {
		raw, ok := in[key]
		if !ok {
			continue
		}
		value, ok := raw.(string)
		if !ok {
			continue
		}
		if err := validateFsParam(value); err != nil {
			return err
		}
	}
	for _, key := range remoteParamKeys {
		raw, ok := in[key]
		if !ok {
			continue
		}
		value, ok := raw.(string)
		if !ok {
			continue
		}
		if err := validateRemoteParam(value); err != nil {
			return err
		}
	}
	return nil
}

// RCHandler dispatches requests directly to rclone's rc/jobs system.
type RCHandler struct{}

// Creates a new direct RC handler.
func NewRCHandler() *RCHandler {
	return &RCHandler{}
}

// Implements http.Handler.
func (h *RCHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimLeft(r.URL.Path, "/")
	log.Printf("[rclone] %s /%s", r.Method, path)

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
		fsName := fsMatchResult[1]
		remotePath := fsMatchResult[2]

		if err := validateFsParam(fsName); err != nil {
			h.writeError(path, nil, w, err, http.StatusForbidden)
			return
		}
		if err := validateRemoteParam(remotePath); err != nil {
			h.writeError(path, nil, w, err, http.StatusForbidden)
			return
		}

		h.serveRemote(w, r, remotePath, fsName)
		return
	}
	http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
}

func (h *RCHandler) serveRemote(w http.ResponseWriter, r *http.Request, path string, fsName string) {
	log.Printf("[rclone] GET remote=%q path=%q", fsName, path)
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

		r.Body = http.MaxBytesReader(w, r.Body, 10<<20) // 10 MB limit
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

	// Validate fs/remote parameters against configured remotes and reject path traversal.
	if err := validateRCParams(in); err != nil {
		h.writeError(path, in, w, err, http.StatusForbidden)
		return
	}

	inOrig := in.Copy()
	log.Printf("[rclone] RC POST /%s input=%+v", path, inOrig)

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
	if job != nil {
		log.Printf("[rclone] RC POST /%s SUCCESS job_id=%d output=%+v", path, job.ID, out)
	} else {
		log.Printf("[rclone] RC POST /%s SUCCESS output=%+v", path, out)
	}
	err = rc.WriteJSON(w, out)
	if err != nil {
		fs.Errorf(nil, "rc: handler: failed to write JSON output: %v", err)
	}
}

func (h *RCHandler) writeError(path string, in rc.Params, w http.ResponseWriter, err error, status int) {
	log.Printf("[rclone] %q error (status %d): %v", path, status, err)
	fs.Errorf(nil, "rc: %q: error: %v", path, err)
	params, status := rc.Error(path, in, err, status)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = rc.WriteJSON(w, params)
}

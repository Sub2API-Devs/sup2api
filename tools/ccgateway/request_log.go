package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// Full payloads stay only in removable files; metadata describes protocol structure.
type requestDiagnostic struct {
	fields    Object
	stage     string
	started   time.Time
	status    int
	directory string
	response  *os.File
	writer    *diagnosticWriter
	bytes     int64
	discarded bool
	store     *requestLogStore
}

type diagnosticWriter struct {
	http.ResponseWriter
	diagnostic *requestDiagnostic
	written    bool
}

func (w *diagnosticWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }
func (w *diagnosticWriter) WriteHeader(status int) {
	if w.written {
		return
	}
	w.written = true
	w.diagnostic.fields["http_status"] = status
	w.ResponseWriter.WriteHeader(status)
}
func (w *diagnosticWriter) Write(b []byte) (int, error) {
	if w.diagnostic.store != nil {
		w.diagnostic.store.mu.Lock()
		defer w.diagnostic.store.mu.Unlock()
	}
	if !w.written {
		w.WriteHeader(http.StatusOK)
	}
	if w.diagnostic.response != nil && w.diagnostic.reserve(len(b)) {
		if _, err := w.diagnostic.response.Write(b); err != nil {
			w.diagnostic.logFailure(err)
		}
	}
	return w.ResponseWriter.Write(b)
}

func (d *requestDiagnostic) logFailure(err error) {
	d.fields["log_write_error"] = true
	log.Printf("request log write failed for %s: %v", d.fields["request_id"], err)
}

func (d *requestDiagnostic) save(name string, b []byte) {
	if d.store != nil {
		d.store.mu.Lock()
		defer d.store.mu.Unlock()
		if !d.store.enabled {
			return
		}
	}
	if d.directory == "" {
		return
	}
	if !d.reserve(len(b)) {
		return
	}
	if err := os.WriteFile(filepath.Join(d.directory, name), b, 0600); err != nil {
		d.logFailure(err)
	}
}

// Overflow removes the whole diagnostic instead of retaining partial content.
func (d *requestDiagnostic) reserve(n int) bool {
	if d.discarded {
		return false
	}
	d.bytes += int64(n)
	if d.bytes <= 64<<20 {
		return true
	}
	if d.response != nil {
		_ = d.response.Close()
		d.response = nil
	}
	if err := os.RemoveAll(d.directory); err != nil {
		d.logFailure(err)
	}
	d.directory = ""
	d.discarded = true
	return false
}

func configureRequestLogs(root string) (string, error) {
	dir := filepath.Join(root, "request-logs")
	if _, err := os.Stat(filepath.Join(root, "request-logs.disabled")); err == nil {
		if err := os.RemoveAll(dir); err != nil {
			return "", err
		}
		return "", nil
	} else if !os.IsNotExist(err) {
		return "", err
	}
	return dir, nil
}

func safeHeaders(h http.Header) http.Header {
	out := h.Clone()
	for _, key := range []string{"Authorization", "Proxy-Authorization", "X-Api-Key", "Cookie", "Set-Cookie", "X-CCG-Revision"} {
		if out.Get(key) != "" {
			out.Set(key, "[REDACTED]")
		}
	}
	return out
}

// Keep complete requests for 24h, with a 512 MiB soft storage budget.
// Only directories created by this logger are eligible for removal.
func pruneRequestLogs(root string) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return
	}
	type record struct {
		path string
		time time.Time
		size int64
	}
	var records []record
	var total int64
	for _, entry := range entries {
		if !entry.IsDir() || !nativeSessionName.MatchString(entry.Name()) {
			continue
		}
		p := filepath.Join(root, entry.Name())
		info, err := os.Stat(filepath.Join(p, "metadata.json"))
		if err != nil {
			// Interrupted requests have no completion metadata. They must still expire.
			if info, statErr := entry.Info(); statErr == nil && time.Since(info.ModTime()) > 24*time.Hour {
				_ = os.RemoveAll(p)
			}
			continue
		}
		var size int64
		_ = filepath.WalkDir(p, func(_ string, e os.DirEntry, err error) error {
			if err == nil && !e.IsDir() {
				if i, err := e.Info(); err == nil {
					size += i.Size()
				}
			}
			return nil
		})
		records = append(records, record{p, info.ModTime(), size})
		total += size
	}
	sort.Slice(records, func(i, j int) bool { return records[i].time.Before(records[j].time) })
	for _, r := range records {
		if time.Since(r.time) > 24*time.Hour || total > 512<<20 {
			if os.RemoveAll(r.path) == nil {
				total -= r.size
			}
		}
	}
}

func (d *requestDiagnostic) capture(w http.ResponseWriter, r *http.Request, root string) http.ResponseWriter {
	if d.store != nil {
		d.store.mu.Lock()
		if !d.store.enabled {
			d.store.mu.Unlock()
			return w
		}
		d.store.active[d] = true
		defer d.store.mu.Unlock()
		root = d.store.root
	}
	if root == "" {
		return w
	}
	if err := os.MkdirAll(root, 0700); err != nil {
		d.logFailure(err)
		return w
	}
	pruneRequestLogs(root)
	// A separate random filename prevents callers from selecting or overwriting files.
	directory := filepath.Join(root, uuid())
	if err := os.Mkdir(directory, 0700); err != nil {
		d.logFailure(err)
		return w
	}
	d.directory = directory
	b, _ := json.MarshalIndent(safeHeaders(r.Header), "", "  ")
	if err := os.WriteFile(filepath.Join(directory, "request-headers.json"), b, 0600); err != nil {
		d.logFailure(err)
	}
	f, err := os.OpenFile(filepath.Join(directory, "response.body"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		d.logFailure(err)
	} else {
		d.response = f
	}
	d.writer = &diagnosticWriter{ResponseWriter: w, diagnostic: d}
	return d.writer
}

func logValue(s string) string {
	if len(s) > 256 {
		return s[:256]
	}
	return s
}

func newRequestDiagnostic(w http.ResponseWriter, r *http.Request) *requestDiagnostic {
	id := r.Header.Get("X-Request-ID")
	if !sessionName.MatchString(id) {
		id = uuid()
	}
	w.Header().Set("request-id", id)
	return &requestDiagnostic{fields: Object{"request_id": id, "method": r.Method, "path": r.URL.Path}, stage: "admission", started: time.Now(), status: 200}
}

func (d *requestDiagnostic) emit(event string) {
	d.fields["event"] = event
	d.fields["timestamp"] = time.Now().UTC().Format(time.RFC3339Nano)
}

func (d *requestDiagnostic) request(body []byte, h http.Header) {
	d.save("request.body", body)
	sum := sha256.Sum256(body)
	d.fields["body_bytes"] = len(body)
	d.fields["body_sha256"] = hex.EncodeToString(sum[:])
	d.fields["anthropic_beta"] = logValue(h.Get("anthropic-beta"))
	o, err := decodeObject(body)
	if err == nil {
		d.fields["model"] = logValue(str(o, "model"))
		if stream, ok := o["stream"].(bool); ok {
			d.fields["stream"] = stream
		}
		d.fields["has_system"] = o["system"] != nil
		messages, _ := o["messages"].([]any)
		d.fields["message_count"] = len(messages)
		summaries := []Object{}
		for i, v := range messages {
			if i >= 256 {
				d.fields["messages_truncated"] = true
				break
			}
			m, ok := v.(map[string]any)
			entry := Object{"index": i}
			if !ok {
				entry["invalid_message"] = true
				summaries = append(summaries, entry)
				continue
			}
			entry["role"] = logValue(str(m, "role"))
			switch content := m["content"].(type) {
			case string:
				entry["content_type"] = "string"
				entry["text_bytes"] = len(content)
			case []any:
				entry["content_type"] = "blocks"
				entry["block_count"] = len(content)
				types := []string{}
				for j, v := range content {
					if j >= 32 {
						break
					}
					b, _ := v.(map[string]any)
					types = append(types, logValue(str(b, "type")))
				}
				entry["block_types"] = types
			default:
				entry["content_type"] = "invalid"
			}
			summaries = append(summaries, entry)
		}
		d.fields["messages"] = summaries
	} else {
		d.fields["invalid_json"] = true
	}
	d.emit("request_received")
}

func (d *requestDiagnostic) fail(status int, kind, message string) {
	d.status = status
	d.fields["error_type"] = kind
	d.fields["error"] = logValue(message)
}

func (d *requestDiagnostic) finish() {
	if d.store != nil {
		d.store.mu.Lock()
	}
	d.fields["stage"] = d.stage
	d.fields["status"] = d.status
	d.fields["duration_ms"] = time.Since(d.started).Milliseconds()
	if d.response != nil {
		if err := d.response.Close(); err != nil {
			d.logFailure(err)
		}
	}
	if d.store != nil {
		delete(d.store.active, d)
		d.store.mu.Unlock()
	}
	if d.writer != nil {
		b, _ := json.MarshalIndent(safeHeaders(d.writer.Header()), "", "  ")
		d.save("response-headers.json", b)
	}
	d.emit("request_finished")
	b, _ := json.MarshalIndent(d.fields, "", "  ")
	d.save("metadata.json", b)
}

type requestLogStore struct {
	mu      sync.Mutex
	root    string
	enabled bool
	active  map[*requestDiagnostic]bool
}

func (s *requestLogStore) serve(w http.ResponseWriter, r *http.Request) {
	if s == nil {
		apiError(w, 503, "api_error", "Request logs unavailable")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if r.Method == "PUT" {
		var input struct {
			Enabled *bool `json:"enabled"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&input) != nil || input.Enabled == nil {
			apiError(w, 400, "invalid_request_error", "enabled must be boolean")
			return
		}
		marker := filepath.Join(filepath.Dir(s.root), "request-logs.disabled")
		if !*input.Enabled {
			if err := os.WriteFile(marker, []byte("disabled"), 0600); err != nil {
				apiError(w, 500, "api_error", "Cannot persist request log setting")
				return
			}
			s.enabled = false
			for d := range s.active {
				if d.response != nil {
					_ = d.response.Close()
					d.response = nil
				}
				d.directory = ""
				d.discarded = true
			}
			if err := os.RemoveAll(s.root); err != nil {
				apiError(w, 500, "api_error", "Cannot clear request logs")
				return
			}
		} else {
			if err := os.Remove(marker); err != nil && !os.IsNotExist(err) {
				apiError(w, 500, "api_error", "Cannot persist request log setting")
				return
			}
			s.enabled = true
		}
	} else if r.Method != "GET" {
		apiError(w, 405, "invalid_request_error", "Use GET or PUT")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(Object{"enabled": s.enabled})
}

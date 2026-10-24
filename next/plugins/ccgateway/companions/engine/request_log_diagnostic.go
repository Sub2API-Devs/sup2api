package engine

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// Full payloads stay only in removable files; metadata describes protocol structure.
type requestDiagnostic struct {
	secretCapture bool
	secretTokens  []string
	mu            sync.Mutex
	fields        Object
	stage         string
	started       time.Time
	status        int
	directory     string
	response      *os.File
	writer        *diagnosticWriter
	bytes         int64
	discarded     bool
	finished      bool
	store         *requestLogStore
	// summaryOnly: this request keeps no request or response content (the
	// summary level), decided when its log starts; only the summary files
	// are written. A diagnostic without a store keeps everything.
	summaryOnly bool
}

// Request log levels (REQUEST-LOG-LEVELS-DESIGN.md): off keeps nothing; the
// summary keeps what a request looked like (metadata, events, headers with
// credentials masked) and no content; full also keeps request and response
// content, for a chosen time, after which the summary applies again.
const (
	logLevelOff     = "off"
	logLevelSummary = "summary"
	logLevelFull    = "full"
)

// Each level's retention and budgets. A request's summary files age as a
// summary; its content files age (and are removed) as full content.
const (
	summaryRetention    = 7 * 24 * time.Hour
	summaryBudget       = 128 << 20
	summaryRequestLimit = 256 << 10
	fullRetention       = 24 * time.Hour
	fullBudget          = 512 << 20
	fullRequestLimit    = 64 << 20
)

// fullDurations are the times the full level may be chosen for, in hours.
var fullDurations = map[int]bool{1: true, 4: true, 24: true}

// summaryFiles are the files the summary level writes: none holds request or
// response content. Every other file is content and needs the full level.
var summaryFiles = map[string]bool{"metadata.json": true, "events.jsonl": true, "request-headers.json": true, "response-headers.json": true}

// keeps says whether this request's log takes the named file.
func (d *requestDiagnostic) keeps(name string) bool { return !d.summaryOnly || summaryFiles[name] }

// requestLimit is the bytes one request's log may hold at its level.
func (d *requestDiagnostic) requestLimit() int64 {
	if d.summaryOnly {
		return summaryRequestLimit
	}
	return fullRequestLimit
}

// Locks (audit C7): the account's store.mu guards only its level, its active
// requests and its index; a request's files are written under that request's
// own d.mu, so one slow write never holds every other request. Whoever needs
// both takes store.mu first (turning logs off, clearing content, listing the
// active requests); nothing holding d.mu takes store.mu. Turning logs off
// ends each active request's log under its d.mu, so no write lands after; the
// logs themselves are removed once store.mu is released (store.applyLevel),
// as is cleared content (store.clearFull).
func (d *requestDiagnostic) lock() func() {
	d.mu.Lock()
	return d.mu.Unlock
}

func (d *requestDiagnostic) setStage(stage string) {
	d.mu.Lock()
	d.stage = stage
	d.mu.Unlock()
}

func (d *requestDiagnostic) setField(key string, value any) {
	d.mu.Lock()
	d.fields[key] = value
	d.mu.Unlock()
}

func (d *requestDiagnostic) setHTTPStatus(status int) {
	d.mu.Lock()
	d.status = status
	d.fields["http_status"] = status
	d.mu.Unlock()
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
	w.diagnostic.setHTTPStatus(status)
	w.ResponseWriter.WriteHeader(status)
}
func (w *diagnosticWriter) Write(b []byte) (int, error) {
	if !w.written {
		w.WriteHeader(http.StatusOK)
	}
	unlock := w.diagnostic.lock()
	if !w.diagnostic.secretCapture && w.diagnostic.response != nil && w.diagnostic.reserve(len(b)) {
		if _, err := w.diagnostic.response.Write(b); err != nil {
			w.diagnostic.logFailure(err)
		}
	}
	unlock()
	// A slow client must not hold the request's log lock.
	return w.ResponseWriter.Write(b)
}

func (d *requestDiagnostic) logFailure(err error) {
	// Caller holds the request lock.
	d.fields["log_write_error"] = true
	if d.fields["log_status"] != "truncated" {
		d.fields["log_status"] = "partial"
	}
	log.Printf("request log write failed for %s: %v", d.fields["request_id"], err)
}

func (d *requestDiagnostic) save(name string, b []byte) {
	unlock := d.lock()
	defer unlock()
	d.saveLocked(name, b)
}

func (d *requestDiagnostic) saveLocked(name string, b []byte) {
	b = d.redactCaptureLocked(b)
	// Logs turned off clear the directory (store.serve).
	if d.directory == "" || !d.keeps(name) {
		return
	}
	// Completion metadata remains queryable even when payload capture overflowed.
	if name != "metadata.json" && !d.reserve(len(b)) {
		return
	}
	if err := os.WriteFile(filepath.Join(d.directory, name), b, 0600); err != nil {
		d.logFailure(err)
	}
}

// Stop payload capture at the request budget, preserving an explicitly partial
// record and its bounded completion metadata instead of silently losing it.
func (d *requestDiagnostic) reserve(n int) bool {
	if d.discarded || d.finished {
		return false
	}
	limit := d.requestLimit()
	if d.bytes+int64(n) <= limit {
		d.bytes += int64(n)
		return true
	}
	if d.response != nil {
		_ = d.response.Close()
		d.response = nil
	}
	d.fields["log_status"] = "truncated"
	d.fields["log_limit_bytes"] = limit
	d.fields["log_retained_bytes"] = d.bytes
	d.fields["log_overflow_stage"] = d.stage
	d.discarded = true
	return false
}

// capture starts the request's log in its store; the gateway calls it once
// the caller is authenticated (audit C7), so an unauthenticated request
// leaves nothing. A request without a store (a Gateway built on its own) is
// not logged.
func (d *requestDiagnostic) capture(w http.ResponseWriter, r *http.Request) http.ResponseWriter {
	s := d.store
	if s == nil {
		return w
	}
	s.mu.Lock()
	if !s.enabled {
		s.mu.Unlock()
		return w
	}
	// The level is the store's when the request starts; clearing content
	// later changes it for the active requests (store.clearFull).
	d.mu.Lock()
	d.summaryOnly = !s.captureContent()
	d.mu.Unlock()
	s.active[d] = true
	// A week of summaries is many directories: a request prunes at most
	// once a minute (the maintenance loop prunes every minute too).
	now := s.clock()
	prune := now.Sub(s.pruned) >= time.Minute
	if prune {
		s.pruned = now
	}
	s.mu.Unlock()
	if prune {
		s.pruneFiles()
	}
	unlock := d.lock()
	defer unlock()
	if d.discarded {
		return w // logs were turned off meanwhile
	}
	if err := d.startLogDirectory(r.Header); err != nil {
		d.logFailure(err)
		return w
	}
	d.writer = &diagnosticWriter{ResponseWriter: w, diagnostic: d}
	return d.writer
}

// startLogDirectory creates the request's private directory and its initial
// files. Caller holds d.mu; a failure stops logging but not the request.
func (d *requestDiagnostic) startLogDirectory(header http.Header) error {
	if err := os.MkdirAll(d.store.root, 0700); err != nil {
		return err
	}
	d.fields["log_level"] = logLevelFull
	if d.summaryOnly {
		d.fields["log_level"] = logLevelSummary
	}
	// A separate random filename prevents callers from selecting or overwriting files.
	directory := filepath.Join(d.store.root, uuid())
	if err := os.Mkdir(directory, 0700); err != nil {
		return err
	}
	d.directory = directory
	d.fields["log_directory"] = filepath.Base(directory)
	b, _ := json.MarshalIndent(safeHeaders(header), "", "  ")
	if d.reserve(len(b)) {
		if err := os.WriteFile(filepath.Join(directory, "request-headers.json"), b, 0600); err != nil {
			d.logFailure(err)
		}
	}
	if !d.summaryOnly {
		f, err := os.OpenFile(filepath.Join(directory, "response.body"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if err != nil {
			d.logFailure(err)
		} else {
			d.response = f
		}
	}
	return nil
}

func logValue(s string) string {
	if len(s) > 256 {
		return s[:256]
	}
	return s
}

func newRequestDiagnostic(w http.ResponseWriter, r *http.Request) *requestDiagnostic {
	id := r.Header.Get("X-Request-ID")
	if !features.RequestIDPattern.MatchString(id) {
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
	d.mu.Lock()
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
		summaries, truncated := messageSummaries(messages)
		d.fields["messages"] = summaries
		if truncated {
			d.fields["messages_truncated"] = true
		}
	} else {
		d.fields["invalid_json"] = true
	}
	d.emit("request_received")
	requestID := d.fields["request_id"]
	d.mu.Unlock()
	d.trace("request_received", Object{"request_id": requestID})
}

// messageSummaries describes the request messages for the log: shape only, at
// most 256 messages and 32 block types each. truncated reports that messages
// were left out.
func messageSummaries(messages []any) ([]Object, bool) {
	summaries := []Object{}
	for i, v := range messages {
		if i >= 256 {
			return summaries, true
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
	return summaries, false
}

func (d *requestDiagnostic) fail(status int, kind, message string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.status = status
	d.fields["error_type"] = kind
	d.fields["error"] = logValue(message)
}

// clientCanceled records a Worker-observed caller cancellation, not a CLI
// stderr frame. 499 is diagnostic-only when no HTTP response was committed.
func (d *requestDiagnostic) clientCanceled(committed bool) {
	d.mu.Lock()
	if !committed {
		d.status = 499
	} else {
		d.fields["response_interrupted"] = true
	}
	d.fields["canceled"] = true
	d.fields["error_type"] = "client_canceled"
	d.fields["error_code"] = "client_canceled"
	d.fields["error_source"] = "client"
	d.fields["error"] = "Client canceled request"
	d.mu.Unlock()
	d.trace("request_canceled", Object{"response_started": committed})
}

func (d *requestDiagnostic) finish() {
	d.mu.Lock()
	detail := Object{"stage": d.stage, "status": d.status}
	d.mu.Unlock()
	d.trace("request_finished", detail)
	unlock := d.lock()
	if d.finished {
		unlock()
		return
	}
	d.fields["stage"] = d.stage
	d.fields["status"] = d.status
	d.fields["duration_ms"] = time.Since(d.started).Milliseconds()
	if _, exists := d.fields["log_status"]; !exists {
		d.fields["log_status"] = "complete"
	}
	b := d.writeMetadata()
	d.finished = true
	unlock()
	if s := d.store; s != nil {
		s.mu.Lock()
		delete(s.active, d)
		// Logs turned off since clear the directory: nothing to list.
		d.mu.Lock()
		directory := d.directory
		d.mu.Unlock()
		if directory != "" && s.enabled {
			s.indexed(filepath.Base(directory), b)
		}
		s.mu.Unlock()
	}
}

// writeMetadata closes the recorded response and writes the completion
// metadata. It returns the metadata bytes the viewer indexes. Caller holds d.mu.
func (d *requestDiagnostic) writeMetadata() []byte {
	if d.response != nil {
		if err := d.response.Close(); err != nil {
			d.logFailure(err)
		}
		d.response = nil
	}
	if d.writer != nil {
		b, _ := json.MarshalIndent(safeHeaders(d.writer.Header()), "", "  ")
		d.saveLocked("response-headers.json", b)
	}
	d.emit("request_finished")
	b, _ := json.MarshalIndent(d.fields, "", "  ")
	// Detailed message summaries are bounded independently of the payload
	// budget. Keep completion/overflow identity even for unusually large input.
	if len(b) > 256<<10 {
		delete(d.fields, "messages")
		d.fields["metadata_details_truncated"] = true
		b, _ = json.MarshalIndent(d.fields, "", "  ")
	}
	d.saveLocked("metadata.json", b)
	return b
}

// stopContent ends a running request's content capture; its summary goes on
// (caller holds d.mu).
func (d *requestDiagnostic) stopContent() {
	if d.response != nil {
		_ = d.response.Close()
		d.response = nil
	}
	d.summaryOnly = true
}

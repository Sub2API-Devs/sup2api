package engine

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

// Always acquire the store before the request mutex; disable uses the same
// order while closing active files. Standalone diagnostics still need a lock.
func (d *requestDiagnostic) lock() func() {
	if d.store != nil {
		d.store.mu.Lock()
	}
	d.mu.Lock()
	return func() {
		d.mu.Unlock()
		if d.store != nil {
			d.store.mu.Unlock()
		}
	}
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
	// A slow client must not hold the account-wide logging/disable mutex.
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
	if d.store != nil && !d.store.enabled {
		return
	}
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

// The level is kept beside the logs (request-logs.json); an older Worker's
// marker (request-logs.disabled) is read as off and written for off, so a
// rollback keeps logging off. Without either the level is the summary.
const requestLogStateFile, requestLogDisabledMarker = "request-logs.json", "request-logs.disabled"

type requestLogState struct {
	Level     string     `json:"level"`
	FullUntil *time.Time `json:"full_until"`
}

// newRequestLogStore reads the account's level. Off removes any log left.
func newRequestLogStore(root string) (*requestLogStore, error) {
	s := &requestLogStore{root: filepath.Join(root, "request-logs"), state: root, level: logLevelSummary, active: map[*requestDiagnostic]bool{}}
	raw, err := os.ReadFile(filepath.Join(root, requestLogStateFile))
	var saved requestLogState
	switch {
	case err == nil && json.Unmarshal(raw, &saved) == nil && (saved.Level == logLevelOff || saved.Level == logLevelSummary || saved.Level == logLevelFull && saved.FullUntil != nil):
		s.level = saved.Level
		if saved.FullUntil != nil {
			s.fullUntil = *saved.FullUntil
		}
	case err != nil && !os.IsNotExist(err):
		return nil, err
	default:
		if _, err := os.Stat(filepath.Join(root, requestLogDisabledMarker)); err == nil {
			s.level = logLevelOff
		} else if !os.IsNotExist(err) {
			return nil, err
		}
	}
	s.enabled = s.level != logLevelOff
	if !s.enabled {
		if err := os.RemoveAll(s.root); err != nil {
			return nil, err
		}
	}
	return s, nil
}

// persist writes the level (caller holds s.mu). A store without a state
// directory keeps its level in memory.
func (s *requestLogStore) persist() error {
	if s.state == "" {
		return nil
	}
	state := requestLogState{Level: s.level}
	if s.level == logLevelFull {
		until := s.fullUntil.UTC()
		state.FullUntil = &until
	}
	b, _ := json.Marshal(state)
	tmp := filepath.Join(s.state, requestLogStateFile+".tmp")
	if err := os.WriteFile(tmp, b, 0600); err != nil {
		return err
	}
	if err := os.Rename(tmp, filepath.Join(s.state, requestLogStateFile)); err != nil {
		return err
	}
	marker := filepath.Join(s.state, requestLogDisabledMarker)
	if s.level == logLevelOff {
		return os.WriteFile(marker, []byte("disabled"), 0600)
	}
	if err := os.Remove(marker); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// captureContent says whether a request starting now keeps content (caller
// holds s.mu). The full level ends at its time and the summary applies again.
// A store built without a level (tests, embedded gateways) keeps everything.
func (s *requestLogStore) captureContent() bool {
	if s.level == "" {
		return true
	}
	if s.level == logLevelFull && !s.clock().Before(s.fullUntil) {
		s.level, s.fullUntil = logLevelSummary, time.Time{}
		if err := s.persist(); err != nil {
			log.Printf("request log level not saved: %v", err)
		}
	}
	return s.level == logLevelFull
}

func (s *requestLogStore) clock() time.Time {
	if s.now != nil {
		return s.now()
	}
	return time.Now()
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

// pruneRequestLogs keeps each level within its retention and budget, oldest
// first: a request's content files as full content (24h, 512 MiB), the
// request itself as a summary (7 days, 128 MiB). Only directories created by
// this logger are eligible for removal.
func pruneRequestLogs(root string) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return
	}
	type record struct {
		path             string
		time             time.Time
		summary, content int64
		contentFiles     []string
	}
	var records []record
	var summaryTotal, contentTotal int64
	for _, entry := range entries {
		if !entry.IsDir() || !nativeSessionName.MatchString(entry.Name()) {
			continue
		}
		p := filepath.Join(root, entry.Name())
		info, err := os.Stat(filepath.Join(p, "metadata.json"))
		if err != nil {
			// Interrupted requests have no completion metadata. They must still expire.
			if info, statErr := entry.Info(); statErr == nil && time.Since(info.ModTime()) > fullRetention {
				_ = os.RemoveAll(p)
			}
			continue
		}
		r := record{path: p, time: info.ModTime()}
		files, _ := os.ReadDir(p)
		for _, f := range files {
			i, err := f.Info()
			if err != nil || f.IsDir() {
				continue
			}
			if summaryFiles[f.Name()] {
				r.summary += i.Size()
			} else {
				r.content += i.Size()
				r.contentFiles = append(r.contentFiles, filepath.Join(p, f.Name()))
			}
		}
		records = append(records, r)
		summaryTotal += r.summary
		contentTotal += r.content
	}
	sort.Slice(records, func(i, j int) bool { return records[i].time.Before(records[j].time) })
	for _, r := range records {
		if r.content > 0 && (time.Since(r.time) > fullRetention || contentTotal > fullBudget) {
			for _, f := range r.contentFiles {
				_ = os.Remove(f)
			}
			contentTotal -= r.content
		}
		if time.Since(r.time) > summaryRetention || summaryTotal > summaryBudget {
			if os.RemoveAll(r.path) == nil {
				summaryTotal -= r.summary
			}
		}
	}
}

// requestLogUsage is what the logs hold now, by level.
func requestLogUsage(root string) Object {
	var summary, content, requests int64
	entries, _ := os.ReadDir(root)
	for _, entry := range entries {
		if !entry.IsDir() || !nativeSessionName.MatchString(entry.Name()) {
			continue
		}
		requests++
		files, _ := os.ReadDir(filepath.Join(root, entry.Name()))
		for _, f := range files {
			if i, err := f.Info(); err == nil && !f.IsDir() {
				if summaryFiles[f.Name()] {
					summary += i.Size()
				} else {
					content += i.Size()
				}
			}
		}
	}
	return Object{"summary_bytes": summary, "full_bytes": content, "requests": requests}
}

// clearContent removes every request's content files, keeping the summaries.
func clearContent(root string) error {
	entries, err := os.ReadDir(root)
	if os.IsNotExist(err) {
		return nil
	} else if err != nil {
		return err
	}
	for _, entry := range entries {
		if !entry.IsDir() || !nativeSessionName.MatchString(entry.Name()) {
			continue
		}
		files, _ := os.ReadDir(filepath.Join(root, entry.Name()))
		for _, f := range files {
			if !f.IsDir() && !summaryFiles[f.Name()] {
				if err := os.Remove(filepath.Join(root, entry.Name(), f.Name())); err != nil && !os.IsNotExist(err) {
					return err
				}
			}
		}
	}
	return nil
}

func (d *requestDiagnostic) capture(w http.ResponseWriter, r *http.Request, root string) http.ResponseWriter {
	unlock := d.lock()
	defer unlock()
	d.summaryOnly = false
	if d.store != nil {
		if !d.store.enabled {
			return w
		}
		d.summaryOnly = !d.store.captureContent()
		d.store.active[d] = true
		root = d.store.root
	}
	if root == "" {
		return w
	}
	if err := os.MkdirAll(root, 0700); err != nil {
		d.logFailure(err)
		return w
	}
	// A week of summaries is many directories: a request prunes at most once a
	// minute (the maintenance loop prunes every minute too).
	if d.store == nil || d.store.clock().Sub(d.store.pruned) >= time.Minute {
		pruneRequestLogs(root)
		if d.store != nil {
			d.store.pruned = d.store.clock()
		}
	}
	d.fields["log_level"] = logLevelFull
	if d.summaryOnly {
		d.fields["log_level"] = logLevelSummary
	}
	// A separate random filename prevents callers from selecting or overwriting files.
	directory := filepath.Join(root, uuid())
	if err := os.Mkdir(directory, 0700); err != nil {
		d.logFailure(err)
		return w
	}
	d.directory = directory
	d.fields["log_directory"] = filepath.Base(directory)
	b, _ := json.MarshalIndent(safeHeaders(r.Header), "", "  ")
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
	requestID := d.fields["request_id"]
	d.mu.Unlock()
	d.trace("request_received", Object{"request_id": requestID})
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
	defer unlock()
	if d.finished {
		return
	}
	d.fields["stage"] = d.stage
	d.fields["status"] = d.status
	d.fields["duration_ms"] = time.Since(d.started).Milliseconds()
	if _, exists := d.fields["log_status"]; !exists {
		d.fields["log_status"] = "complete"
	}
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
	d.finished = true
	if d.store != nil {
		delete(d.store.active, d)
	}
}

type requestLogStore struct {
	mu      sync.Mutex
	root    string
	enabled bool
	// level is off, summary or full; "" (tests, embedded gateways) keeps
	// everything and never expires. fullUntil ends the full level.
	level     string
	fullUntil time.Time
	// state is the directory the level is saved in; "" keeps it in memory.
	state  string
	pruned time.Time
	now    func() time.Time
	active map[*requestDiagnostic]bool
}

func (s *requestLogStore) serve(w http.ResponseWriter, r *http.Request) {
	if s == nil {
		apiError(w, 503, "api_error", "Request logs unavailable")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if r.Method == "PUT" {
		var input map[string]json.RawMessage
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&input) != nil {
			apiError(w, 400, "invalid_request_error", "Invalid request log setting")
			return
		}
		level, hours, clear, ok := requestLogChange(input)
		if !ok {
			apiError(w, 400, "invalid_request_error", `Use {"level":"off"|"summary"}, {"level":"full","full_for_hours":1|4|24}, {"clear_full":true} or {"enabled":bool}`)
			return
		}
		if clear {
			for d := range s.active {
				d.mu.Lock()
				d.stopContent()
				d.mu.Unlock()
			}
			if err := clearContent(s.root); err != nil {
				apiError(w, 500, "api_error", "Cannot clear request log content")
				return
			}
		} else {
			previous, previousUntil := s.level, s.fullUntil
			s.level, s.fullUntil = level, time.Time{}
			if level == logLevelFull {
				s.fullUntil = s.clock().Add(time.Duration(hours) * time.Hour)
			}
			if err := s.persist(); err != nil {
				s.level, s.fullUntil = previous, previousUntil
				apiError(w, 500, "api_error", "Cannot persist request log setting")
				return
			}
			s.enabled = level != logLevelOff
			if !s.enabled {
				for d := range s.active {
					d.mu.Lock()
					d.stopContent()
					d.directory = ""
					d.discarded = true
					d.mu.Unlock()
				}
				if err := os.RemoveAll(s.root); err != nil {
					apiError(w, 500, "api_error", "Cannot clear request logs")
					return
				}
			}
		}
	} else if r.Method != "GET" {
		apiError(w, 405, "invalid_request_error", "Use GET or PUT")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(s.describe())
}

// requestLogChange reads one PUT: a level (full with its hours), clearing the
// content, or an older core's switch (on is the summary).
func requestLogChange(input map[string]json.RawMessage) (level string, hours int, clear, ok bool) {
	only := func(keys ...string) bool {
		if len(input) != len(keys) {
			return false
		}
		for _, key := range keys {
			if _, present := input[key]; !present {
				return false
			}
		}
		return true
	}
	switch {
	case only("enabled"):
		var on bool
		if json.Unmarshal(input["enabled"], &on) != nil || string(input["enabled"]) == "null" {
			return "", 0, false, false
		}
		if on {
			return logLevelSummary, 0, false, true
		}
		return logLevelOff, 0, false, true
	case only("clear_full"):
		var yes bool
		return "", 0, true, json.Unmarshal(input["clear_full"], &yes) == nil && yes
	case only("level"), only("level", "full_for_hours"):
		if json.Unmarshal(input["level"], &level) != nil {
			return "", 0, false, false
		}
		_, timed := input["full_for_hours"]
		if level == logLevelFull {
			return level, hours, false, timed && json.Unmarshal(input["full_for_hours"], &hours) == nil && fullDurations[hours]
		}
		return level, 0, false, !timed && (level == logLevelOff || level == logLevelSummary)
	}
	return "", 0, false, false
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

// describe is the level, each level's limits and what the logs hold (caller
// holds s.mu). The top-level limits are the full level's, as an older core reads them.
func (s *requestLogStore) describe() Object {
	level := s.level
	if level == "" {
		level = logLevelFull
	}
	if !s.enabled {
		level = logLevelOff
	}
	var until any
	if level == logLevelFull && !s.fullUntil.IsZero() {
		if !s.clock().Before(s.fullUntil) {
			level = logLevelSummary
		} else {
			until = s.fullUntil.UTC().Format(time.RFC3339)
		}
	}
	return Object{
		"enabled": s.enabled, "level": level, "full_until": until, "levels": []string{logLevelOff, logLevelSummary, logLevelFull},
		"limits": Object{
			logLevelSummary: Object{"retention_hours": int(summaryRetention / time.Hour), "storage_budget_bytes": summaryBudget, "per_request_limit_bytes": summaryRequestLimit},
			logLevelFull:    Object{"retention_hours": int(fullRetention / time.Hour), "storage_budget_bytes": fullBudget, "per_request_limit_bytes": fullRequestLimit},
		},
		"usage":                   requestLogUsage(s.root),
		"per_request_limit_bytes": fullRequestLimit, "retention_hours": int(fullRetention / time.Hour), "storage_budget_bytes": fullBudget,
		"overflow_behavior": "retain_partial_with_metadata",
	}
}

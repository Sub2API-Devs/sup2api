package engine

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"maps"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// A request's log (REQUEST-LOG-ASYNC-DESIGN.md). The request only tells it
// what happened — the request arrived (capture, request), what the CLI was
// given (commandStarted), the answer's bytes (diagnosticWriter), what the CLI
// sent upstream (keepUpstreamRequest), the request ended (finish) — and goes
// on. Every file is written by the store's background writer (logSink); full
// metadata stays only in removable files, the metadata describes structure.
//
// State is split by who owns it. The fields under mu are bookkeeping in
// memory: the request and the store's admin take mu only to read or set them,
// never across a disk access or a wait. The fields marked "sink" belong to the
// background writer's one goroutine and are touched nowhere else.
type requestDiagnostic struct {
	secretCapture bool
	secretTokens  []string
	mu            sync.Mutex
	fields        Object
	stage         string
	started       time.Time
	status        int
	// directory is the request's log directory: chosen when its log starts
	// and created by the first background write; "" once logs were turned off
	// or cleared, after which no write touches the disk for it.
	directory string
	writer    *diagnosticWriter
	// bytes is what the request's log holds or was promised, against its
	// budget (requestLimit).
	bytes     int64
	discarded bool
	finished  bool
	store     *requestLogStore
	// summaryOnly: this request keeps no request or response content (the
	// summary level), decided when its log starts; only the summary files
	// are written. A diagnostic without a store keeps everything.
	summaryOnly bool
	// contentSHA256 is the request body's digest without the whitespace after
	// it, compared with the sent request's (keepUpstreamRequest).
	contentSHA256 string
	// active: the store lists the request until its completion ran.
	active bool
	// The response as the client received it: its headers when it started,
	// and why its capture stopped ("" while it goes on).
	responseType, responseEncoding string
	responseCaptured               bool
	responseStop                   string
	// headers is response-headers.json, read when the request finished.
	headers []byte
	// What the background writer refused (log_dropped_*).
	droppedBytes, droppedWrites int64

	// sink: the directory was created; the response chunks kept for the
	// assembler and the bytes they hold; the completion ran.
	created   bool
	chunks    [][]byte
	held      int64
	finalized bool
}

// bodyDigests is a body's SHA-256 and, in the same pass, that of the body
// without its trailing whitespace: CC's transport pads a large body it sends,
// so content is compared without it (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §2).
func bodyDigests(raw []byte) (sum, content string) {
	end := len(raw)
	for end > 0 && (raw[end-1] == ' ' || raw[end-1] == '\t' || raw[end-1] == '\n' || raw[end-1] == '\r') {
		end--
	}
	h := sha256.New()
	h.Write(raw[:end])
	content = hex.EncodeToString(h.Sum(nil))
	if end == len(raw) {
		return content, content
	}
	h.Write(raw[end:])
	return hex.EncodeToString(h.Sum(nil)), content
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
// response content (upstream-request.json is the sent request's facts and
// headers, credentials masked by the CLI). Every other file is content and
// needs the full level.
var summaryFiles = map[string]bool{"metadata.json": true, "events.jsonl": true, "request-headers.json": true, "response-headers.json": true, upstreamRequestFile: true}

// keeps says whether this request's log takes the named file.
func (d *requestDiagnostic) keeps(name string) bool { return !d.summaryOnly || summaryFiles[name] }

// requestLimit is the bytes one request's log may hold at its level.
func (d *requestDiagnostic) requestLimit() int64 {
	if d.summaryOnly {
		return summaryRequestLimit
	}
	return fullRequestLimit
}

// Locks (audit C7, REQUEST-LOG-ASYNC-DESIGN.md §3). Their order is store.io →
// store.mu → d.mu, and only store.io is ever held across the disk:
//   - store.io: held by the background writer while it writes a request's
//     files, and by the admin while it turns logs off, clears them or lists
//     what clearing removes. No request takes it.
//   - store.mu: the level, the active requests, the index; memory only.
//   - d.mu: this request's bookkeeping; memory only.
//
// So a request never waits for the disk: what it calls takes store.mu or d.mu
// for a moment and hands the work to the writer. Turning logs off or clearing
// them takes store.io first: no background write is under way, and every
// write queued after sees the directory gone or the content stopped.
func (d *requestDiagnostic) lock() func() {
	d.mu.Lock()
	return d.mu.Unlock
}

func (d *requestDiagnostic) setStage(stage string) {
	if d == nil {
		return
	}
	d.mu.Lock()
	d.stage = stage
	d.mu.Unlock()
}

func (d *requestDiagnostic) setField(key string, value any) {
	if d == nil {
		return
	}
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

// admitted records how the request runs: its mode, and whether it is the
// console's test.
func (d *requestDiagnostic) admitted(mode string, probe bool) {
	d.setField("mode", mode)
	if probe {
		d.setField("test_mode", "native_build")
	}
}

// commandStarted records what the CLI is given: build's envelope is kept (a
// direct request's input is its body, already kept).
func (d *requestDiagnostic) commandStarted(mode string, input []byte) {
	if d == nil {
		return
	}
	if mode == "build" {
		d.save("build-components.json", input)
	}
	d.setStage("request_command")
}

// diagnosticWriter is the response as the client receives it: the client is
// written first, and only then is a copy handed to the log.
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
	w.ResponseWriter.WriteHeader(status)
	w.diagnostic.responseStarted(status, w.Header())
}
func (w *diagnosticWriter) Write(b []byte) (int, error) {
	if !w.written {
		w.WriteHeader(http.StatusOK)
	}
	n, err := w.ResponseWriter.Write(b)
	if n > 0 && n <= len(b) {
		w.diagnostic.responseChunk(b[:n])
	}
	return n, err
}

// responseStarted records the status and how the response is assembled.
func (d *requestDiagnostic) responseStarted(status int, h http.Header) {
	d.mu.Lock()
	d.status = status
	d.fields["http_status"] = status
	d.responseType, d.responseEncoding = h.Get("Content-Type"), h.Get("Content-Encoding")
	d.mu.Unlock()
}

// responseChunk hands a copy of bytes the client received to the assembler.
// The budget, a credential-safe capture or a refused hand-over stops the
// capture for the rest of the response.
func (d *requestDiagnostic) responseChunk(b []byte) {
	d.mu.Lock()
	defer d.mu.Unlock()
	switch {
	case d.directory == "" || d.finished || d.summaryOnly || d.responseStop != "":
		return
	case d.secretCapture:
		d.responseStop = responseCaptureOmitted
		return
	case !d.reserve(len(b)):
		d.responseStop = responseCaptureTruncated
		return
	}
	d.responseCaptured = true
	chunk := bytes.Clone(b)
	if !d.submitLocked(int64(len(chunk)), func() int64 { return d.keepChunk(chunk) }) {
		d.bytes -= int64(len(chunk))
		d.responseStop = responseCaptureDropped
	}
}

// keepChunk keeps a response chunk for the assembler (sink); it holds its
// bytes until the completion.
func (d *requestDiagnostic) keepChunk(chunk []byte) int64 {
	d.mu.Lock()
	keep := d.directory != "" && !d.summaryOnly && !d.secretCapture
	d.mu.Unlock()
	if !keep || d.finalized {
		return 0
	}
	d.chunks = append(d.chunks, chunk)
	d.held += int64(len(chunk))
	return int64(len(chunk))
}

// releaseResponse lets the kept chunks go (sink).
func (d *requestDiagnostic) releaseResponse() {
	d.store.sink.release(d.held)
	d.chunks, d.held = nil, 0
}

func (d *requestDiagnostic) logFailure(err error) {
	// Caller holds the request lock.
	d.fields["log_write_error"] = true
	if d.fields["log_status"] != "truncated" {
		d.fields["log_status"] = "partial"
	}
	log.Printf("request log write failed for %s: %v", d.fields["request_id"], err)
}

// failed records a background write's failure (sink).
func (d *requestDiagnostic) failed(err error) {
	d.mu.Lock()
	d.logFailure(err)
	d.mu.Unlock()
}

// submitLocked hands one write of this request's log to the background
// writer (caller holds d.mu). A write it refuses is counted and leaves the
// log partial; the request goes on either way.
func (d *requestDiagnostic) submitLocked(bytes int64, run func() int64) bool {
	var sink *logSink
	if d.store != nil {
		sink = d.store.sink
	}
	if sink.submit(bytes, run) {
		return true
	}
	d.droppedBytes += bytes
	d.droppedWrites++
	if d.fields["log_status"] != "truncated" {
		d.fields["log_status"] = "partial"
	}
	return false
}

func (d *requestDiagnostic) save(name string, b []byte) {
	if d == nil {
		return
	}
	unlock := d.lock()
	defer unlock()
	d.saveLocked(name, b)
}

// saveLocked hands one file of the request's log to the background writer
// and says whether it did (caller holds d.mu). The bytes are not copied: the
// caller does not change them afterwards.
func (d *requestDiagnostic) saveLocked(name string, b []byte) bool {
	// Logs turned off clear the directory (store.discard).
	if d.directory == "" || !d.keeps(name) || !d.reserve(len(b)) {
		return false
	}
	return d.submitLocked(int64(len(b)), func() int64 {
		d.writeFile(name, b)
		return 0
	})
}

// inLog runs fn with the request's log directory under the store's I/O lock,
// creating the directory first (sink). It does nothing once the logs were
// turned off or cleared.
func (d *requestDiagnostic) inLog(fn func(dir string)) {
	if d.store == nil {
		return
	}
	d.store.io.Lock()
	defer d.store.io.Unlock()
	d.mu.Lock()
	dir := d.directory
	d.mu.Unlock()
	if dir == "" {
		return
	}
	if !d.created {
		if err := os.MkdirAll(filepath.Dir(dir), 0700); err != nil {
			d.failed(err)
			return
		}
		// A separate random filename prevents callers from selecting or
		// overwriting files.
		if err := os.Mkdir(dir, 0700); err != nil {
			d.failed(err)
			return
		}
		d.created = true
	}
	fn(dir)
}

// capturePolicy is what a background write reads of the request's capture.
type capturePolicy struct {
	keep   bool
	secret bool
	tokens []string
}

func (d *requestDiagnostic) policyFor(name string) capturePolicy {
	d.mu.Lock()
	defer d.mu.Unlock()
	return capturePolicy{keep: d.keeps(name), secret: d.secretCapture, tokens: d.secretTokens}
}

// writeFile writes one file of the log (sink), redacted when the request's
// content may hold a credential (diagnostic_secrets.go).
func (d *requestDiagnostic) writeFile(name string, b []byte) bool {
	written := false
	d.inLog(func(dir string) {
		policy := d.policyFor(name)
		if !policy.keep {
			return
		}
		if policy.secret {
			b = redactCapture(b, policy.tokens)
		}
		if err := os.WriteFile(filepath.Join(dir, name), b, 0600); err != nil {
			d.failed(err)
			return
		}
		written = true
		logFileWritten(dir, name)
	})
	return written
}

// appendFile appends to one file of the log (sink).
func (d *requestDiagnostic) appendFile(name string, b []byte) {
	d.inLog(func(dir string) {
		policy := d.policyFor(name)
		if !policy.keep || policy.secret && name != "events.jsonl" {
			return
		}
		if policy.secret {
			b = redactCapture(b, policy.tokens)
		}
		f, err := os.OpenFile(filepath.Join(dir, name), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
		if err != nil {
			d.failed(err)
			return
		}
		_, err = f.Write(b)
		if closeErr := f.Close(); err == nil {
			err = closeErr
		}
		if err != nil {
			d.failed(err)
			return
		}
		logFileWritten(dir, name)
	})
}

// logFileWritten observes the background writes in tests; nil otherwise.
var logFileWrittenHook atomic.Pointer[func(dir, name string)]

func logFileWritten(dir, name string) {
	if hook := logFileWrittenHook.Load(); hook != nil {
		(*hook)(dir, name)
	}
}

// Stop payload capture at the request budget, preserving an explicitly partial
// record and its bounded completion metadata instead of silently losing it.
// A request asks while it runs (caller holds d.mu); what it finished with was
// promised before.
func (d *requestDiagnostic) reserve(n int) bool {
	if d.finished {
		return false
	}
	return d.charge(int64(n))
}

// charge counts n bytes against the request's budget (caller holds d.mu): the
// background writer charges what it only learns the size of when it writes
// (the sent request), for work handed over before the request finished.
func (d *requestDiagnostic) charge(n int64) bool {
	if d.discarded {
		return false
	}
	limit := d.requestLimit()
	if d.bytes+n <= limit {
		d.bytes += n
		return true
	}
	d.fields["log_status"] = "truncated"
	d.fields["log_limit_bytes"] = limit
	d.fields["log_retained_bytes"] = d.bytes
	d.fields["log_overflow_stage"] = d.stage
	d.discarded = true
	return false
}

// Where a request's log level came from (metadata log_level_source): the
// core's policy (features.WorkerPolicy.RequestLog) or the Worker's own level.
const (
	logLevelFromPolicy = "policy"
	logLevelFromLocal  = "local"
)

// policyLogLevel is the log level the request's policy names, "" when it has
// no policy or names none (REQUEST-LOG-POLICY-DESIGN.md §3). An invalid policy
// names none: the request is logged at the Worker's own level and refused with
// 400 when its policy is read (parseRequestPolicy).
func policyLogLevel(h http.Header) string {
	value := h.Get(features.PolicyHeader)
	if value == "" {
		return ""
	}
	policy, err := features.ParseWorkerPolicy([]byte(value))
	if err != nil {
		return ""
	}
	return policy.RequestLog
}

// capture starts the request's log in its store; the gateway calls it once
// the caller is authenticated (audit C7), so an unauthenticated request
// leaves nothing. A request without a store (a Gateway built on its own) is
// not logged. The level is the one the request's policy names; without one
// it is the store's own, which the policy's level neither reads nor changes.
// Nothing touches the disk here: the directory is created by the first
// background write.
func (d *requestDiagnostic) capture(w http.ResponseWriter, r *http.Request) http.ResponseWriter {
	s := d.store
	if s == nil {
		return w
	}
	policyLevel := policyLogLevel(r.Header)
	if policyLevel == logLevelOff {
		return w
	}
	s.mu.Lock()
	if policyLevel == "" && !s.enabled {
		s.mu.Unlock()
		return w
	}
	// The level is decided when the request starts; clearing content later
	// changes it for the active requests (store.clearFull).
	d.mu.Lock()
	if policyLevel != "" {
		d.summaryOnly = policyLevel != logLevelFull
		d.fields["log_level_source"] = logLevelFromPolicy
	} else {
		d.summaryOnly = !s.captureContent()
		d.fields["log_level_source"] = logLevelFromLocal
	}
	d.active = true
	d.mu.Unlock()
	s.active[d] = true
	// A week of summaries is many directories: a request asks for a prune at
	// most once a minute (the maintenance loop prunes every minute too). The
	// prune itself runs off this goroutine: the maintenance loop owns it and
	// stops with the Worker.
	now := s.clock()
	prune := now.Sub(s.pruned) >= time.Minute
	if prune {
		s.pruned = now
	}
	s.mu.Unlock()
	if prune {
		select {
		case s.pruneDue <- struct{}{}:
		default: // one prune already asked for and not run yet
		}
	}
	unlock := d.lock()
	defer unlock()
	if d.discarded {
		return w // logs were turned off meanwhile
	}
	d.startLog(r.Header)
	d.writer = &diagnosticWriter{ResponseWriter: w, diagnostic: d}
	return d.writer
}

// startLog names the request's private directory and hands over its first
// file (caller holds d.mu).
func (d *requestDiagnostic) startLog(header http.Header) {
	d.fields["log_level"] = logLevelFull
	if d.summaryOnly {
		d.fields["log_level"] = logLevelSummary
	}
	d.directory = filepath.Join(d.store.root, uuid())
	d.fields["log_directory"] = filepath.Base(d.directory)
	b, _ := json.MarshalIndent(safeHeaders(header), "", "  ")
	d.saveLocked("request-headers.json", b)
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

// request records that the body arrived: the headers and the
// request_received event now; its size, digests and description, and the
// body itself at the full level, in the background (received). The body is
// handed over as it is: the request never changes it.
func (d *requestDiagnostic) request(body *requestBody, h http.Header) {
	if d == nil {
		return
	}
	d.mu.Lock()
	if d.directory == "" || d.discarded || d.finished {
		d.mu.Unlock()
		return // no log keeps it
	}
	d.fields["body_bytes"] = len(body.raw)
	d.fields["anthropic_beta"] = logValue(h.Get("anthropic-beta"))
	d.emit("request_received")
	requestID := d.fields["request_id"]
	keep := d.keeps("request.body") && d.reserve(len(body.raw))
	raw, input := body.raw, body.summaryInput()
	d.submitLocked(int64(len(raw)), func() int64 {
		d.received(raw, input, keep)
		return 0
	})
	d.mu.Unlock()
	d.trace("request_received", Object{"request_id": requestID})
}

// received describes the request body and keeps it (sink). Only metadata.json
// reads the fields, and it is written after.
func (d *requestDiagnostic) received(raw []byte, input summaryInput, keep bool) {
	sum, content := bodyDigests(raw)
	fields := summarizeRequest(input)
	d.mu.Lock()
	d.fields["body_sha256"] = sum
	d.contentSHA256 = content
	for key, value := range fields {
		d.fields[key] = value
	}
	d.mu.Unlock()
	if keep {
		d.writeFile("request.body", raw)
	}
}

// summarizeRequest is the log's description of a request body: the fields
// decodeObject and messageSummaries produced when the summary ran inline
// (values decoded with UseNumber, so no number is rounded or refused).
func summarizeRequest(input summaryInput) Object {
	fields := Object{}
	if input.invalid {
		fields["invalid_json"] = true
		return fields
	}
	fields["model"] = logValue(jsonStringValue(input.model))
	if stream, ok := jsonBoolValue(input.stream); ok {
		fields["stream"] = stream
	}
	fields["has_system"] = input.system != nil && !jsonNull(input.system)
	messages, _ := jsonValue(input.messages).([]any)
	fields["message_count"] = len(messages)
	summaries, truncated := messageSummaries(messages)
	fields["messages"] = summaries
	if truncated {
		fields["messages_truncated"] = true
	}
	return fields
}

// jsonValue is one member as decodeObject decoded it: numbers stay as
// written, so a number no float64 holds still counts its message.
func jsonValue(raw json.RawMessage) any {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var value any
	if decoder.Decode(&value) != nil {
		return nil
	}
	return value
}

func jsonStringValue(raw json.RawMessage) string {
	var value string
	if json.Unmarshal(raw, &value) != nil {
		return ""
	}
	return value
}

func jsonBoolValue(raw json.RawMessage) (bool, bool) {
	switch string(bytes.TrimSpace(raw)) {
	case "true":
		return true, true
	case "false":
		return false, true
	}
	return false, false
}

func jsonNull(raw json.RawMessage) bool {
	return string(bytes.TrimSpace(raw)) == "null"
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
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	d.status = status
	d.fields["error_type"] = kind
	d.fields["error"] = logValue(message)
}

// clientCanceled records a Worker-observed caller cancellation, not a CLI
// stderr frame. 499 is diagnostic-only when no HTTP response was committed.
func (d *requestDiagnostic) clientCanceled(committed bool) {
	if d == nil {
		return
	}
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

// finish records how the request ended and hands its completion to the
// background writer (finalize); it returns at once. Later notifications are
// ignored.
func (d *requestDiagnostic) finish() {
	if d == nil {
		return
	}
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
	// The headers the client got are read here, on the request's goroutine:
	// the response writer is the request's.
	if d.writer != nil && d.directory != "" {
		b, _ := json.MarshalIndent(safeHeaders(d.writer.Header()), "", "  ")
		if d.keeps("response-headers.json") && d.reserve(len(b)) {
			d.headers = b
		}
	}
	d.emit("request_finished")
	d.finished = true
	if (d.active || d.directory != "") && d.store != nil {
		d.store.sink.submitAlways(d.finalize)
	}
}

// finalize completes the request's log (sink): the response headers, the
// assembled response, the metadata last, then the index. The request leaves
// the active requests either way.
func (d *requestDiagnostic) finalize() int64 {
	defer d.releaseResponse()
	var metadata []byte
	var id string
	d.inLog(func(dir string) {
		d.mu.Lock()
		headers := d.headers
		d.mu.Unlock()
		if headers != nil {
			d.writeLocked(dir, "response-headers.json", headers)
		}
		d.keepResponse(dir)
		d.mu.Lock()
		if d.droppedWrites > 0 {
			d.fields["log_dropped_bytes"] = d.droppedBytes
			d.fields["log_dropped_writes"] = d.droppedWrites
		}
		fields, secret, tokens := maps.Clone(d.fields), d.secretCapture, d.secretTokens
		dropped := Object{"bytes": d.droppedBytes, "writes": d.droppedWrites}
		d.mu.Unlock()
		if dropped["writes"].(int64) > 0 {
			// The event of what was lost is written here, where it cannot be.
			line, _ := json.Marshal(Object{"time": time.Now().UTC().Format(time.RFC3339Nano), "event": "log_dropped", "detail": dropped})
			d.appendLocked(dir, "events.jsonl", append(line, '\n'))
		}
		metadata, _ = json.MarshalIndent(fields, "", "  ")
		// Detailed message summaries are bounded independently of the payload
		// budget. Keep completion/overflow identity even for unusually large input.
		if len(metadata) > 256<<10 {
			delete(fields, "messages")
			fields["metadata_details_truncated"] = true
			metadata, _ = json.MarshalIndent(fields, "", "  ")
		}
		if secret {
			metadata = redactCapture(metadata, tokens)
		}
		if d.writeLocked(dir, "metadata.json", metadata) {
			id = filepath.Base(dir)
		}
	})
	d.finalized = true
	s := d.store
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.active, d)
	// Logs turned off or cleared since clear the directory (store.discard,
	// under s.mu): nothing to list. A log kept at the policy's level is
	// listed whatever the store's own level.
	d.mu.Lock()
	listed := d.directory != "" && id != ""
	d.mu.Unlock()
	if listed {
		s.indexed(id, metadata)
	}
	return 0
}

// writeLocked writes a completion file already checked for redaction (sink,
// inside inLog).
func (d *requestDiagnostic) writeLocked(dir, name string, b []byte) bool {
	policy := d.policyFor(name)
	if !policy.keep {
		return false
	}
	if policy.secret && name != "metadata.json" {
		b = redactCapture(b, policy.tokens)
	}
	if err := os.WriteFile(filepath.Join(dir, name), b, 0600); err != nil {
		d.failed(err)
		return false
	}
	logFileWritten(dir, name)
	return true
}

// appendLocked appends a line the log wrote itself (sink, inside inLog).
func (d *requestDiagnostic) appendLocked(dir, name string, b []byte) {
	f, err := os.OpenFile(filepath.Join(dir, name), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		d.failed(err)
		return
	}
	_, err = f.Write(b)
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		d.failed(err)
		return
	}
	logFileWritten(dir, name)
}

// keepResponse assembles the captured response and writes it (sink, inside
// inLog): response.json, or response.body when it cannot be assembled. The
// metadata says how (response_capture, response_assembled, response_events).
func (d *requestDiagnostic) keepResponse(dir string) {
	d.mu.Lock()
	summary, secret := d.summaryOnly, d.secretCapture
	captured, stop := d.responseCaptured, d.responseStop
	contentType, encoding := d.responseType, d.responseEncoding
	d.mu.Unlock()
	if summary || !captured && stop == "" {
		return // nothing was captured, or the content was cleared
	}
	fields := Object{}
	switch {
	case secret || stop == responseCaptureOmitted:
		fields["response_capture"] = responseCaptureOmitted
	case len(d.chunks) == 0 && stop == "":
		return // the chunks met the content cleared or the logs gone
	case len(d.chunks) == 0:
		fields["response_capture"] = stop
	default:
		capture := responseCaptureComplete
		if stop != "" {
			capture = stop
		}
		fields["response_capture"] = capture
		response := assembleResponse(d.chunks, contentType, encoding)
		fields["response_assembled"] = response.assembled
		if response.stream {
			fields["response_events"] = response.events
		}
		d.releaseResponse()
		d.writeLocked(dir, response.name, response.body)
	}
	d.mu.Lock()
	maps.Copy(d.fields, fields)
	d.mu.Unlock()
}

// stopContent ends a running request's content capture; its summary goes on
// (caller holds d.mu).
func (d *requestDiagnostic) stopContent() {
	d.summaryOnly = true
}

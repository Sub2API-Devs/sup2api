package engine

// Reading the request logs (REQUEST-LOG-VIEWER-DESIGN.md §4): a list from an
// in-memory index of finished requests, one request's summary, and its
// content files in bounded chunks. The core decides who may read content;
// the Worker only keeps a summary's events bounded unless content is asked for.
import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

const (
	viewerPageDefault  = 50
	viewerPageMax      = 100
	viewerChunkMax     = 1 << 20
	viewerEventsMax    = 2000
	viewerEventsBytes  = 2 << 20
	viewerMetadataMax  = 512 << 10
	viewerHeadersMax   = 256 << 10
	viewerQueryBodyMax = 4 << 10
)

// logFileName is a content file's name as the Worker writes them.
var logFileName = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{0,127}$`)

// logEntry is one finished request in the index, from its metadata.json. The
// mode, sessions and digests (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3) are
// what the list is searched by; a log from before them has none.
type logEntry struct {
	ID                 string    `json:"id"`
	RequestID          string    `json:"request_id"`
	Time               time.Time `json:"time"`
	DurationMS         int64     `json:"duration_ms"`
	Status             int       `json:"status"`
	Stage              string    `json:"stage"`
	Model              string    `json:"model,omitempty"`
	Stream             *bool     `json:"stream,omitempty"`
	Level              string    `json:"log_level"`
	ErrorType          string    `json:"error_type,omitempty"`
	Error              string    `json:"error,omitempty"`
	LogStatus          string    `json:"log_status"`
	Test               bool      `json:"test"`
	Mode               string    `json:"mode,omitempty"`
	ClientSessionID    string    `json:"client_session_id,omitempty"`
	UpstreamSessionID  string    `json:"upstream_session_id,omitempty"`
	BodySHA256         string    `json:"body_sha256,omitempty"`
	UpstreamBodySHA256 string    `json:"upstream_body_sha256,omitempty"`
	BodyChanged        *bool     `json:"body_changed,omitempty"`
	// UpstreamCaptured is absent for a request that sent nothing upstream.
	UpstreamCaptured *bool `json:"upstream_captured,omitempty"`
	// upstreamContentSHA256 is searched by sha256, not listed.
	upstreamContentSHA256 string
}

// parseLogEntry reads the index fields of a request's metadata. A log from
// before the levels kept everything, so it counts as full. A search field of
// another shape is left out.
func parseLogEntry(id string, raw []byte) (logEntry, bool) {
	var m struct {
		RequestID          string `json:"request_id"`
		Timestamp          string `json:"timestamp"`
		DurationMS         int64  `json:"duration_ms"`
		Status             int    `json:"status"`
		Stage              string `json:"stage"`
		Model              string `json:"model"`
		Stream             *bool  `json:"stream"`
		Level              string `json:"log_level"`
		ErrorType          string `json:"error_type"`
		Error              string `json:"error"`
		LogStatus          string `json:"log_status"`
		TestMode           any    `json:"test_mode"`
		Mode               any    `json:"mode"`
		ClientSessionID    any    `json:"client_session_id"`
		UpstreamSessionID  any    `json:"upstream_session_id"`
		BodySHA256         any    `json:"body_sha256"`
		UpstreamBodySHA256 any    `json:"upstream_body_sha256"`
		BodyChanged        any    `json:"body_changed"`
		UpstreamCaptured   any    `json:"upstream_captured"`
		UpstreamContent    any    `json:"upstream_content_sha256"`
	}
	if json.Unmarshal(raw, &m) != nil {
		return logEntry{}, false
	}
	finished, err := time.Parse(time.RFC3339Nano, m.Timestamp)
	if err != nil {
		return logEntry{}, false
	}
	if m.Level != logLevelSummary {
		m.Level = logLevelFull
	}
	test := m.TestMode != nil && m.TestMode != false && m.TestMode != ""
	e := logEntry{ID: id, RequestID: logValue(m.RequestID), Time: finished.Add(-time.Duration(m.DurationMS) * time.Millisecond).UTC(), DurationMS: m.DurationMS,
		Status: m.Status, Stage: logValue(m.Stage), Model: logValue(m.Model), Stream: m.Stream, Level: m.Level, ErrorType: logValue(m.ErrorType),
		Error: logValue(m.Error), LogStatus: logValue(m.LogStatus), Test: test,
		Mode: shaped(m.Mode, logMode), ClientSessionID: shaped(m.ClientSessionID, logSessionID), UpstreamSessionID: shaped(m.UpstreamSessionID, logSessionID),
		BodySHA256: shaped(m.BodySHA256, sha256Hex), UpstreamBodySHA256: shaped(m.UpstreamBodySHA256, sha256Hex),
		upstreamContentSHA256: shaped(m.UpstreamContent, sha256Hex)}
	if changed, ok := m.BodyChanged.(bool); ok {
		e.BodyChanged = &changed
	}
	if captured, ok := m.UpstreamCaptured.(bool); ok {
		e.UpstreamCaptured = &captured
	}
	return e, true
}

// logMode is a request mode as the index keeps it.
var logMode = regexp.MustCompile(`^(direct|build)$`)

// shaped is value when it is a string of pattern's shape, else "".
func shaped(value any, pattern *regexp.Regexp) string {
	if s, ok := value.(string); ok && pattern.MatchString(s) {
		return s
	}
	return ""
}

// startIndex builds the index in the background: a week of summaries is tens
// of thousands of metadata.json files, and the Worker serves requests while
// they are read (audit C7). The viewer waits for it (waitIndex).
func (s *requestLogStore) startIndex() {
	s.indexBuilding, s.indexPending, s.indexPruned = true, map[string]logEntry{}, map[string]bool{}
	s.indexReady = make(chan struct{})
	go s.buildIndex()
}

// buildIndex scans the disk without holding s.mu, then applies what the
// requests finished and pruned meanwhile. Logs turned off meanwhile reset
// the index, and the scan is dropped.
func (s *requestLogStore) buildIndex() {
	scanned := scanLogIndex(s.root)
	s.mu.Lock()
	if s.index == nil {
		for id, e := range s.indexPending {
			scanned[id] = e
		}
		for id := range s.indexPruned {
			delete(scanned, id)
		}
		s.index = scanned
	}
	s.indexBuilding, s.indexPending, s.indexPruned = false, nil, nil
	s.mu.Unlock()
	close(s.indexReady)
}

// waitIndex waits for the background index (caller does not hold s.mu).
func (s *requestLogStore) waitIndex() {
	if s.indexReady != nil {
		<-s.indexReady
	}
}

// scanLogIndex reads every finished request's metadata.
func scanLogIndex(root string) map[string]logEntry {
	index := map[string]logEntry{}
	entries, _ := os.ReadDir(root)
	for _, entry := range entries {
		if !entry.IsDir() || !uuidPattern.MatchString(entry.Name()) {
			continue
		}
		raw, err := readBounded(filepath.Join(root, entry.Name(), "metadata.json"), viewerMetadataMax)
		if err != nil {
			continue
		}
		if e, ok := parseLogEntry(entry.Name(), raw); ok {
			index[entry.Name()] = e
		}
	}
	return index
}

// indexed adds a finished request (caller holds s.mu). While the index is
// built it waits in indexPending.
func (s *requestLogStore) indexed(id string, metadata []byte) {
	e, ok := parseLogEntry(id, metadata)
	switch {
	case !ok:
	case s.index != nil:
		s.index[id] = e
	case s.indexBuilding:
		s.indexPending[id] = e
	}
}

// prune keeps each level within its limits and drops the removed requests
// from the index.
func (s *requestLogStore) prune() {
	s.mu.Lock()
	s.pruned = s.clock()
	s.mu.Unlock()
	s.pruneFiles()
}

// pruneFiles removes what the levels' limits no longer keep without holding
// s.mu, then drops it from the index. One prune runs at a time: another one
// due meanwhile is skipped.
func (s *requestLogStore) pruneFiles() {
	if !s.pruning.TryLock() {
		return
	}
	defer s.pruning.Unlock()
	removed := pruneRequestLogs(s.root)
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, id := range removed {
		delete(s.index, id)
		if s.indexBuilding {
			delete(s.indexPending, id)
			s.indexPruned[id] = true
		}
	}
}

func readBounded(path string, limit int64) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	raw, err := io.ReadAll(io.LimitReader(f, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(raw)) > limit {
		return nil, errors.New("file over its limit")
	}
	return raw, nil
}

// serveViewer answers /admin/request-logs/{query,detail,read}.
func (s *requestLogStore) serveViewer(w http.ResponseWriter, r *http.Request, action string) {
	if s == nil {
		apiError(w, 503, "api_error", "Request logs unavailable")
		return
	}
	if r.Method != "POST" {
		apiError(w, 405, "invalid_request_error", "Use POST")
		return
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, viewerQueryBodyMax))
	decoder.DisallowUnknownFields()
	switch action {
	case "query":
		var q logQuery
		if decoder.Decode(&q) != nil || !q.valid() {
			apiError(w, 400, "invalid_request_error", "Invalid request log query")
			return
		}
		s.query(w, q)
	case "detail":
		var q struct {
			ID      string `json:"id"`
			Content bool   `json:"content"`
		}
		if decoder.Decode(&q) != nil || !uuidPattern.MatchString(q.ID) {
			apiError(w, 400, "invalid_request_error", "Invalid request log id")
			return
		}
		s.detail(w, q.ID, q.Content)
	case "read":
		var q logRead
		if decoder.Decode(&q) != nil || !q.valid() {
			apiError(w, 400, "invalid_request_error", "Invalid request log file read")
			return
		}
		s.read(w, q)
	default:
		apiError(w, 404, "not_found_error", "Not found")
	}
}

type logQuery struct {
	Limit     int    `json:"limit"`
	Before    string `json:"before"`
	RequestID string `json:"request_id"`
	Status    string `json:"status"`
	Model     string `json:"model"`
	Level     string `json:"level"`
	Since     string `json:"since"`
	Until     string `json:"until"`
	// The search by the sent request (viewer_search): the mode, a session
	// (the client's or the upstream's), a body digest (the client's or the
	// sent one) and whether the body changed.
	Mode      string `json:"mode"`
	SessionID string `json:"session_id"`
	SHA256    string `json:"sha256"`
	Changed   *bool  `json:"changed"`
	since     time.Time
	until     time.Time
	cursor    *logEntry
}

// querySHA256 is a digest as a query may spell it.
var querySHA256 = regexp.MustCompile(`^[0-9A-Fa-f]{64}$`)

func (q *logQuery) valid() bool {
	if q.Limit == 0 {
		q.Limit = viewerPageDefault
	}
	if q.Limit < 1 || q.Limit > viewerPageMax || len(q.Model) > 256 ||
		q.RequestID != "" && !features.RequestIDPattern.MatchString(q.RequestID) ||
		q.Status != "" && q.Status != "ok" && q.Status != "error" ||
		q.Level != "" && q.Level != logLevelSummary && q.Level != logLevelFull ||
		q.Mode != "" && !logMode.MatchString(q.Mode) ||
		q.SessionID != "" && !logSessionID.MatchString(q.SessionID) ||
		q.SHA256 != "" && !querySHA256.MatchString(q.SHA256) {
		return false
	}
	q.SHA256 = strings.ToLower(q.SHA256)
	for _, t := range []struct {
		raw string
		out *time.Time
	}{{q.Since, &q.since}, {q.Until, &q.until}} {
		if t.raw == "" {
			continue
		}
		v, err := time.Parse(time.RFC3339, t.raw)
		if err != nil {
			return false
		}
		*t.out = v
	}
	if q.Before != "" {
		at, id, ok := strings.Cut(q.Before, "_")
		nanos, err := strconv.ParseInt(at, 10, 64)
		if !ok || err != nil || !uuidPattern.MatchString(id) {
			return false
		}
		q.cursor = &logEntry{ID: id, Time: time.Unix(0, nanos).UTC()}
	}
	return true
}

func (q *logQuery) matches(e logEntry) bool {
	switch {
	case q.RequestID != "" && e.RequestID != q.RequestID,
		q.Model != "" && e.Model != q.Model,
		q.Level != "" && e.Level != q.Level,
		q.Status == "ok" && e.Status >= 400,
		q.Status == "error" && e.Status < 400,
		!q.since.IsZero() && e.Time.Before(q.since),
		!q.until.IsZero() && e.Time.After(q.until),
		q.Mode != "" && e.Mode != q.Mode,
		q.SessionID != "" && e.ClientSessionID != q.SessionID && e.UpstreamSessionID != q.SessionID,
		q.SHA256 != "" && e.BodySHA256 != q.SHA256 && e.UpstreamBodySHA256 != q.SHA256 && e.upstreamContentSHA256 != q.SHA256,
		// A log that could not compare the bodies matches neither answer.
		q.Changed != nil && (e.BodyChanged == nil || *e.BodyChanged != *q.Changed):
		return false
	}
	return q.cursor == nil || newerLog(*q.cursor, e)
}

// newerLog orders the list: newest first, then by id.
func newerLog(a, b logEntry) bool {
	if !a.Time.Equal(b.Time) {
		return a.Time.After(b.Time)
	}
	return a.ID > b.ID
}

func cursorOf(e logEntry) string { return fmt.Sprintf("%d_%s", e.Time.UnixNano(), e.ID) }

type logItem struct {
	logEntry
	Attempt    int   `json:"attempt,omitempty"`
	HasContent bool  `json:"has_content"`
	Bytes      int64 `json:"bytes"`
}

func (s *requestLogStore) off(w http.ResponseWriter) bool {
	if !s.enabled {
		apiError(w, 409, "request_logs_off", "Request logs are off")
		return true
	}
	return false
}

func (s *requestLogStore) query(w http.ResponseWriter, q logQuery) {
	s.waitIndex()
	s.mu.Lock()
	if s.off(w) {
		s.mu.Unlock()
		return
	}
	all := make([]logEntry, 0, len(s.index))
	for _, e := range s.index {
		all = append(all, e)
	}
	active := []Object{}
	if q.cursor == nil {
		for d := range s.active {
			d.mu.Lock()
			if d.directory != "" && !d.finished {
				active = append(active, Object{"request_id": d.fields["request_id"], "started": d.started.UTC().Format(time.RFC3339), "stage": d.stage})
			}
			d.mu.Unlock()
		}
		sort.Slice(active, func(i, j int) bool { return active[i]["started"].(string) > active[j]["started"].(string) })
	}
	s.mu.Unlock()
	sort.Slice(all, func(i, j int) bool { return newerLog(all[i], all[j]) })
	// A request retried on this account has one log per attempt, oldest first.
	attempts, seen := map[string]int{}, map[string]int{}
	for _, e := range all {
		attempts[e.RequestID]++
	}
	items, next := []logItem{}, any(nil)
	for _, e := range all {
		seen[e.RequestID]++
		if !q.matches(e) {
			continue
		}
		if len(items) == q.Limit {
			next = cursorOf(items[len(items)-1].logEntry)
			break
		}
		item, ok := logItemOf(s.root, e)
		if !ok {
			continue // removed since it was indexed; the next prune drops it
		}
		if attempts[e.RequestID] > 1 {
			item.Attempt = attempts[e.RequestID] - seen[e.RequestID] + 1
		}
		items = append(items, item)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(Object{"items": items, "next": next, "active": active})
}

// logItemOf adds what a request's directory holds now.
func logItemOf(root string, e logEntry) (logItem, bool) {
	files, err := os.ReadDir(filepath.Join(root, e.ID))
	if err != nil {
		return logItem{}, false
	}
	item := logItem{logEntry: e}
	for _, f := range files {
		if info, err := f.Info(); err == nil && info.Mode().IsRegular() {
			item.Bytes += info.Size()
			item.HasContent = item.HasContent || !summaryFiles[f.Name()]
		}
	}
	return item, true
}

// directoryOf is a finished request's directory, or "" (writes the error).
func (s *requestLogStore) directoryOf(w http.ResponseWriter, id string) string {
	s.waitIndex()
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.off(w) {
		return ""
	}
	if _, ok := s.index[id]; !ok {
		apiError(w, 404, "request_log_not_found", "Request log not found")
		return ""
	}
	return filepath.Join(s.root, id)
}

// logFileKind groups content files for the viewer. `cli-*` is kept for logs
// written up to plugin 0.1.86, whose traceReader still wrote cli-stdout.jsonl.
// `upstream-*` is the request the CLI sent (upstream-request.body; its facts,
// upstream-request.json, are a summary file the detail returns itself), and
// `resource-*` the resource requests the Worker made upstream. response-meta.json
// lives in the request's temporary directory, not here.
func logFileKind(name string) string {
	switch {
	case name == "request.body":
		return "request"
	case name == "response.body":
		return "response"
	case strings.HasPrefix(name, "upstream-"), strings.HasPrefix(name, "resource-"):
		return "upstream"
	case strings.HasPrefix(name, "cli-"):
		return "cli"
	case strings.HasPrefix(name, "history"):
		return "history"
	case strings.HasSuffix(name, ".json"):
		return "build"
	}
	return "other"
}

func (s *requestLogStore) detail(w http.ResponseWriter, id string, content bool) {
	dir := s.directoryOf(w, id)
	if dir == "" {
		return
	}
	raw, err := readBounded(filepath.Join(dir, "metadata.json"), viewerMetadataMax)
	var metadata Object
	if err != nil || json.Unmarshal(raw, &metadata) != nil {
		apiError(w, 404, "request_log_not_found", "Request log not found")
		return
	}
	headers := func(name string) any {
		raw, err := readBounded(filepath.Join(dir, name), viewerHeadersMax)
		var h map[string][]string
		if err != nil || json.Unmarshal(raw, &h) != nil {
			return nil
		}
		return h
	}
	events, truncated := readEvents(filepath.Join(dir, "events.jsonl"), content)
	// The request the CLI sent, as an object: a summary file, so it comes with
	// or without content; null when the request has none.
	var upstream any
	if raw, err := readBounded(filepath.Join(dir, upstreamRequestFile), upstreamFactsMax); err == nil {
		var object map[string]any
		if json.Unmarshal(raw, &object) == nil {
			upstream = object
		}
	}
	files := []Object{}
	entries, _ := os.ReadDir(dir)
	for _, f := range entries {
		info, err := f.Info()
		if err != nil || !info.Mode().IsRegular() || summaryFiles[f.Name()] || !logFileName.MatchString(f.Name()) {
			continue
		}
		files = append(files, Object{"name": f.Name(), "bytes": info.Size(), "kind": logFileKind(f.Name())})
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(Object{"metadata": metadata, "events": events, "events_truncated": truncated,
		"request_headers": headers("request-headers.json"), "response_headers": headers("response-headers.json"), "upstream_request": upstream, "files": files})
}

// readEvents is the request's event list, bounded. Without content every
// text keeps its first 256 bytes, as the summary level writes them.
func readEvents(path string, content bool) ([]any, bool) {
	events := []any{}
	f, err := os.Open(path)
	if err != nil {
		return events, false
	}
	defer f.Close()
	reader := bufio.NewReaderSize(f, 64<<10)
	var total int
	for {
		line, err := reader.ReadSlice('\n')
		for errors.Is(err, bufio.ErrBufferFull) {
			// An event longer than the buffer: keep reading it, then judge its size.
			var more []byte
			more, err = reader.ReadSlice('\n')
			line = append(append([]byte{}, line...), more...)
		}
		line = bytes.TrimSpace(line)
		if len(line) > 0 {
			if len(events) == viewerEventsMax || total+len(line) > viewerEventsBytes {
				return events, true
			}
			total += len(line)
			var event any
			if json.Unmarshal(line, &event) == nil {
				if !content {
					event = boundStrings(event)
				}
				events = append(events, event)
			}
		}
		if err != nil {
			return events, false
		}
	}
}

type logRead struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Offset   int64  `json:"offset"`
	Length   int64  `json:"length"`
	Download bool   `json:"download"`
}

func (q *logRead) valid() bool {
	if q.Length == 0 {
		q.Length = viewerChunkMax
	}
	return uuidPattern.MatchString(q.ID) && logFileName.MatchString(q.Name) && !summaryFiles[q.Name] &&
		q.Offset >= 0 && q.Length > 0 && q.Length <= viewerChunkMax && !(q.Download && q.Offset != 0)
}

// read sends a content file's bytes as written: a chunk, or the whole file for
// a download. The file is opened under the store lock and sent without it, so
// a slow reader never holds up logging.
func (s *requestLogStore) read(w http.ResponseWriter, q logRead) {
	dir := s.directoryOf(w, q.ID)
	if dir == "" {
		return
	}
	root, err := os.OpenRoot(dir)
	if err != nil {
		apiError(w, 404, "request_log_not_found", "Request log not found")
		return
	}
	defer root.Close()
	info, err := root.Lstat(q.Name)
	if err != nil || !info.Mode().IsRegular() {
		apiError(w, 404, "request_log_not_found", "Request log file not found")
		return
	}
	f, err := root.Open(q.Name)
	if err != nil {
		apiError(w, 404, "request_log_not_found", "Request log file not found")
		return
	}
	defer f.Close()
	size := info.Size()
	if q.Offset > size {
		apiError(w, 416, "invalid_request_error", "Offset past the end of the file")
		return
	}
	length := min(q.Length, size-q.Offset)
	if q.Download {
		length = size
	}
	if _, err := f.Seek(q.Offset, io.SeekStart); err != nil {
		apiError(w, 500, "api_error", "Cannot read request log file")
		return
	}
	h := w.Header()
	h.Set("Content-Type", "application/octet-stream")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Log-File-Size", strconv.FormatInt(size, 10))
	h.Set("X-Log-Offset", strconv.FormatInt(q.Offset, 10))
	h.Set("X-Log-Length", strconv.FormatInt(length, 10))
	h.Set("Content-Length", strconv.FormatInt(length, 10))
	w.WriteHeader(200)
	_, _ = io.CopyN(w, f, length)
}

package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Reading an account's request logs (REQUEST-LOG-VIEWER-DESIGN.md §6/§7):
// the list and one request's summary for settings or account readers; the
// content files only for settings:manage, every read audited. The core checks
// every parameter before the Worker sees it and passes nothing else on.
const (
	requestLogListLimit   = 512 << 10
	requestLogDetailLimit = 4 << 20
	requestLogChunkLimit  = 1 << 20
	requestLogFileLimit   = 64 << 20
	// requestLogReadAuditWindow: paging through one file is one audit row.
	requestLogReadAuditWindow = 10 * time.Minute
)

var (
	requestLogID       = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	requestLogFileName = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{0,127}$`)
	requestLogReqID    = regexp.MustCompile(`^[A-Za-z0-9_-]{1,128}$`)
	requestLogCursor   = regexp.MustCompile(`^[0-9]{1,20}_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	// The shapes of the upstream-capture search fields
	// (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3/§4).
	requestLogSessionID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,128}$`)
	requestLogSHA256    = regexp.MustCompile(`^[0-9a-f]{64}$`)
	// The summary files: the detail carries them, a file read never does.
	requestLogSummaryFiles = map[string]bool{"metadata.json": true, "events.jsonl": true, "request-headers.json": true, "response-headers.json": true, "upstream-request.json": true}
	// Masked again here, whatever the Worker wrote.
	requestLogSecretHeaders = map[string]bool{"authorization": true, "proxy-authorization": true, "x-api-key": true, "cookie": true, "set-cookie": true, "x-ccg-revision": true}
)

func (s *Service) registerRequestLogViewer(r *httpapi.Router) {
	r.PermAny("GET", "/system/ccgateway/accounts/:id/request-logs/requests", s.requestLogList, "settings:read", "account:read")
	// settings:manage is listed so the detail knows whether to keep event texts whole.
	r.PermAny("GET", "/system/ccgateway/accounts/:id/request-logs/requests/:log", s.requestLogDetail, "settings:read", "account:read", "settings:manage")
	r.Perm("GET", "/system/ccgateway/accounts/:id/request-logs/requests/:log/files/:name", "settings:manage", s.requestLogFile)
}

// viewerAccount is the account of :id with its runtime, or false (answered).
func (s *Service) viewerAccount(c *gin.Context, ctx context.Context) (accountDesired, bool) {
	httpapi.NoStore(c)
	id, e := strconv.ParseInt(c.Param("id"), 10, 64)
	if e != nil || id <= 0 {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return accountDesired{}, false
	}
	d, e := s.desired(ctx, id, false)
	if e != nil {
		httpapi.Fail(c, core.ErrNotFound)
		return accountDesired{}, false
	}
	if reason := d.unavailable(); reason != "" {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, reason))
		return accountDesired{}, false
	}
	return d, true
}

// viewerError maps a Worker's refusal of a log read. An older controller or
// Worker does not know the paths at all.
func viewerError(status int, raw []byte) *core.Error {
	code, _ := parseRuntimeError(raw)
	switch {
	case code == "request_log_not_found":
		return core.ErrNotFound.WithMessage("The request log was not found; it may have expired.").WithDetails(map[string]any{"reason": code})
	case code == "request_logs_off":
		return core.ErrConflict.WithMessage("Request logs are off for this account.").WithDetails(map[string]any{"reason": code})
	case status == http.StatusRequestedRangeNotSatisfiable:
		return core.ErrInvalidArgument.WithMessage("The offset is past the end of the file.")
	case status == http.StatusNotFound || status == http.StatusMethodNotAllowed:
		return reasonError(core.ErrUnavailable, "request_log_viewer_unsupported")
	}
	return runtimeError(status, raw)
}

// viewerJSON runs one Worker read and returns its JSON answer, bounded.
func (s *Service) viewerJSON(c *gin.Context, ctx context.Context, d accountDesired, action string, body any, limit int64) ([]byte, bool) {
	payload, _ := json.Marshal(body)
	res, closeConn, e := s.runtimeRequest(ctx, d.Key, http.MethodPost, "admin/request-logs/"+action, payload, d.Revision)
	if e != nil {
		httpapi.Fail(c, transportError(e))
		return nil, false
	}
	defer closeConn()
	defer res.Body.Close()
	raw, e := readBounded(res.Body, limit)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return nil, false
	}
	if res.StatusCode != http.StatusOK {
		e := viewerError(res.StatusCode, raw)
		// The core checked the query to the Worker's rules, so a refusal of
		// one with the new filters is a Worker without viewer_search.
		if q, isQuery := body.(map[string]any); isQuery && action == "query" && res.StatusCode == http.StatusBadRequest && usesRequestLogSearch(q) {
			e = reasonError(core.ErrUnavailable, "request_log_search_unsupported").
				WithMessage("This account's runtime cannot filter request logs by mode, session, SHA-256 or change; update the CCGateway plugin.")
		}
		httpapi.Fail(c, e)
		return nil, false
	}
	return raw, true
}

// requestLogQuery is the list's query string as the Worker's query body.
func requestLogQuery(c *gin.Context) (map[string]any, *core.Error) {
	q := map[string]any{}
	invalid := func(name string) *core.Error {
		return core.ErrInvalidArgument.WithMessage("Invalid " + name + ".")
	}
	for name := range c.Request.URL.Query() {
		switch name {
		case "limit", "before", "request_id", "status", "model", "level", "since", "until",
			"mode", "session_id", "sha256", "changed":
		default:
			return nil, invalid("parameter " + strconv.Quote(name))
		}
	}
	if v := c.Query("limit"); v != "" {
		n, e := strconv.Atoi(v)
		if e != nil || n < 1 || n > 100 {
			return nil, invalid("limit (1-100)")
		}
		q["limit"] = n
	}
	for _, p := range []struct {
		name string
		ok   func(string) bool
	}{
		{"before", requestLogCursor.MatchString},
		{"request_id", requestLogReqID.MatchString},
		{"status", func(v string) bool { return v == "ok" || v == "error" }},
		{"level", func(v string) bool { return v == requestLogSummary || v == requestLogFull }},
		{"model", func(v string) bool {
			return len(v) <= 256 && strings.IndexFunc(v, func(r rune) bool { return unicode.IsControl(r) }) < 0
		}},
		{"since", rfc3339},
		{"until", rfc3339},
		{"mode", validRequestMode},
		{"session_id", requestLogSessionID.MatchString},
	} {
		if v := c.Query(p.name); v != "" {
			if !p.ok(v) {
				return nil, invalid(p.name)
			}
			q[p.name] = v
		}
	}
	if v := c.Query("sha256"); v != "" {
		v = strings.ToLower(v)
		if !requestLogSHA256.MatchString(v) {
			return nil, invalid("sha256 (64 hexadecimal digits)")
		}
		q["sha256"] = v
	}
	switch c.Query("changed") {
	case "":
	case "true":
		q["changed"] = true
	case "false":
		q["changed"] = false
	default:
		return nil, invalid("changed (true or false)")
	}
	return q, nil
}

// requestLogSearchKeys are the filters only a Worker reporting viewer_search
// understands; an older Worker refuses the whole query (400).
var requestLogSearchKeys = []string{"mode", "session_id", "sha256", "changed"}

func usesRequestLogSearch(q map[string]any) bool {
	for _, k := range requestLogSearchKeys {
		if _, ok := q[k]; ok {
			return true
		}
	}
	return false
}

func validRequestMode(v string) bool { return v == "direct" || v == "build" }

func rfc3339(v string) bool {
	_, e := time.Parse(time.RFC3339, v)
	return e == nil
}

type requestLogItem struct {
	ID         string `json:"id"`
	RequestID  string `json:"request_id"`
	Time       string `json:"time"`
	DurationMS int64  `json:"duration_ms"`
	Status     int    `json:"status"`
	Stage      string `json:"stage"`
	Model      string `json:"model,omitempty"`
	Stream     *bool  `json:"stream,omitempty"`
	Level      string `json:"log_level"`
	ErrorType  string `json:"error_type,omitempty"`
	Error      string `json:"error,omitempty"`
	LogStatus  string `json:"log_status"`
	Test       bool   `json:"test"`
	Attempt    int    `json:"attempt,omitempty"`
	HasContent bool   `json:"has_content"`
	Bytes      int64  `json:"bytes"`
	// Upstream capture (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3): only
	// identifiers and hashes, each dropped when not of its shape.
	Mode               string `json:"mode,omitempty"`
	ClientSessionID    string `json:"client_session_id,omitempty"`
	UpstreamSessionID  string `json:"upstream_session_id,omitempty"`
	BodySHA256         string `json:"body_sha256,omitempty"`
	UpstreamBodySHA256 string `json:"upstream_body_sha256,omitempty"`
	BodyChanged        *bool  `json:"body_changed,omitempty"`
	// UpstreamCaptured is absent for a request that sent nothing upstream.
	UpstreamCaptured *bool `json:"upstream_captured,omitempty"`
}

// clean drops the upstream-capture fields that are not of their shape. They
// are search aids: one odd value must not hide the whole page.
func (item *requestLogItem) clean() {
	if !validRequestMode(item.Mode) {
		item.Mode = ""
	}
	for _, id := range []*string{&item.ClientSessionID, &item.UpstreamSessionID} {
		if !requestLogSessionID.MatchString(*id) {
			*id = ""
		}
	}
	for _, sum := range []*string{&item.BodySHA256, &item.UpstreamBodySHA256} {
		if *sum = strings.ToLower(*sum); !requestLogSHA256.MatchString(*sum) {
			*sum = ""
		}
	}
}

type requestLogActive struct {
	RequestID string `json:"request_id"`
	Started   string `json:"started"`
	Stage     string `json:"stage"`
}

type requestLogPage struct {
	Items  []requestLogItem   `json:"items"`
	Next   *string            `json:"next"`
	Active []requestLogActive `json:"active"`
}

// decodeRequestLogPage keeps the fields the list shows, each checked.
func decodeRequestLogPage(raw []byte) (requestLogPage, error) {
	var page requestLogPage
	if err := json.Unmarshal(raw, &page); err != nil || page.Items == nil {
		return page, errors.New("invalid request log page")
	}
	if page.Next != nil && !requestLogCursor.MatchString(*page.Next) {
		return page, errors.New("invalid request log cursor")
	}
	for i := range page.Items {
		item := &page.Items[i]
		if !requestLogID.MatchString(item.ID) || !rfc3339(item.Time) || item.Level != requestLogSummary && item.Level != requestLogFull ||
			item.DurationMS < 0 || item.Bytes < 0 || item.Attempt < 0 {
			return page, errors.New("invalid request log item")
		}
		item.clean()
	}
	if page.Active == nil {
		page.Active = []requestLogActive{}
	}
	return page, nil
}

func (s *Service) requestLogList(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()
	q, invalid := requestLogQuery(c)
	if invalid != nil {
		httpapi.Fail(c, invalid)
		return
	}
	d, ok := s.viewerAccount(c, ctx)
	if !ok {
		return
	}
	raw, ok := s.viewerJSON(c, ctx, d, "query", q, requestLogListLimit)
	if !ok {
		return
	}
	page, err := decodeRequestLogPage(raw)
	if err != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	httpapi.OK(c, page)
}

type requestLogFile struct {
	Name  string `json:"name"`
	Bytes int64  `json:"bytes"`
	Kind  string `json:"kind"`
}

type requestLogDetail struct {
	Metadata        map[string]any      `json:"metadata"`
	Events          []any               `json:"events"`
	EventsTruncated bool                `json:"events_truncated"`
	RequestHeaders  map[string][]string `json:"request_headers"`
	ResponseHeaders map[string][]string `json:"response_headers"`
	Files           []requestLogFile    `json:"files"`
	// UpstreamRequest is upstream-request.json: what the CLI sent, without
	// the body (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §2/§4).
	UpstreamRequest map[string]any `json:"upstream_request,omitempty"`
	// Content says whether the caller may read the files (settings:manage).
	Content bool `json:"content"`
}

// maskUpstreamRequest masks the secret headers of upstream-request.json
// again. Its headers are {"name": "value"}; anything else under a secret
// name is masked too, and headers that are not an object are dropped.
func maskUpstreamRequest(up map[string]any) map[string]any {
	if up == nil {
		return nil
	}
	raw, ok := up["headers"]
	if !ok {
		return up
	}
	h, ok := raw.(map[string]any)
	if !ok {
		delete(up, "headers")
		return up
	}
	for k, v := range h {
		if !requestLogSecretHeaders[strings.ToLower(k)] {
			continue
		}
		if list, isList := v.([]any); isList {
			for i := range list {
				list[i] = "[REDACTED]"
			}
			continue
		}
		h[k] = "[REDACTED]"
	}
	return up
}

func maskHeaders(h map[string][]string) map[string][]string {
	for k, v := range h {
		if requestLogSecretHeaders[strings.ToLower(k)] {
			for i := range v {
				v[i] = "[REDACTED]"
			}
		}
	}
	return h
}

func (s *Service) requestLogDetail(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()
	log := c.Param("log")
	if !requestLogID.MatchString(log) {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("Invalid request log id."))
		return
	}
	d, ok := s.viewerAccount(c, ctx)
	if !ok {
		return
	}
	content := granted(ctx, "settings:manage")
	raw, ok := s.viewerJSON(c, ctx, d, "detail", map[string]any{"id": log, "content": content}, requestLogDetailLimit)
	if !ok {
		return
	}
	var out requestLogDetail
	if json.Unmarshal(raw, &out) != nil || out.Metadata == nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	files := []requestLogFile{}
	for _, f := range out.Files {
		if requestLogFileName.MatchString(f.Name) && !requestLogSummaryFiles[f.Name] && f.Bytes >= 0 {
			files = append(files, f)
		}
	}
	out.Files, out.Content = files, content
	if out.Events == nil {
		out.Events = []any{}
	}
	out.RequestHeaders, out.ResponseHeaders = maskHeaders(out.RequestHeaders), maskHeaders(out.ResponseHeaders)
	out.UpstreamRequest = maskUpstreamRequest(out.UpstreamRequest)
	httpapi.OK(c, out)
}

func granted(ctx context.Context, key string) bool {
	for _, k := range core.Granted(ctx) {
		if k == key {
			return true
		}
	}
	return false
}

// requestLogFile sends a content file: a 1 MiB chunk from ?offset, or the
// whole file with ?download=1. Streamed, never held in memory.
func (s *Service) requestLogFile(c *gin.Context) {
	log, name := c.Param("log"), c.Param("name")
	for key := range c.Request.URL.Query() {
		if key != "offset" && key != "download" {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("Invalid parameter "+strconv.Quote(key)+"."))
			return
		}
	}
	offset, download, ok := parseFileQuery(c)
	if !ok {
		return
	}
	if !requestLogID.MatchString(log) || !requestLogFileName.MatchString(name) || requestLogSummaryFiles[name] {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("Invalid request log file."))
		return
	}
	timeout, limit := 90*time.Second, int64(requestLogChunkLimit)
	body := map[string]any{"id": log, "name": name, "offset": offset}
	if download {
		timeout, limit = 10*time.Minute, requestLogFileLimit
		body = map[string]any{"id": log, "name": name, "download": true}
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
	defer cancel()
	d, ok := s.viewerAccount(c, ctx)
	if !ok {
		return
	}
	payload, _ := json.Marshal(body)
	res, closeConn, e := s.runtimeRequest(ctx, d.Key, http.MethodPost, "admin/request-logs/read", payload, d.Revision)
	if e != nil {
		httpapi.Fail(c, transportError(e))
		return
	}
	defer closeConn()
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
		httpapi.Fail(c, viewerError(res.StatusCode, raw))
		return
	}
	size, length, ok := parseLogChunkHeaders(res, offset, limit)
	if !ok {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	s.auditRequestLogRead(c, ctx, d.AccountID, log, name, offset, length, download)
	copyLogChunk(c, res.Body, d.AccountID, log, name, offset, size, length, download)
}

// parseFileQuery reads ?offset= and ?download= and validates the combination:
// a download is always the whole file, and "download" is only 1 when present.
func parseFileQuery(c *gin.Context) (offset int64, download bool, ok bool) {
	download = c.Query("download") == "1"
	if v := c.Query("offset"); v != "" {
		n, e := strconv.ParseInt(v, 10, 64)
		if e != nil || n < 0 || n > requestLogFileLimit {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("Invalid offset."))
			return 0, false, false
		}
		offset = n
	}
	if download && offset != 0 || c.Query("download") != "" && !download {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("Invalid request log file."))
		return 0, false, false
	}
	return offset, download, true
}

// parseLogChunkHeaders validates the size headers of a chunk response and
// returns the file size and chunk length.
func parseLogChunkHeaders(res *http.Response, offset, limit int64) (size, length int64, ok bool) {
	var e1, e2, e3 error
	size, e1 = strconv.ParseInt(res.Header.Get("X-Log-File-Size"), 10, 64)
	length, e2 = strconv.ParseInt(res.Header.Get("X-Log-Length"), 10, 64)
	at, e3 := strconv.ParseInt(res.Header.Get("X-Log-Offset"), 10, 64)
	if e1 != nil || e2 != nil || e3 != nil || at != offset || length < 0 || length > limit || size < 0 || offset+length > size {
		return 0, 0, false
	}
	return size, length, true
}

// copyLogChunk streams the chunk to the client with the headers that make a
// short read detectable.
func copyLogChunk(c *gin.Context, body io.Reader, account int64, log, name string, offset, size, length int64, download bool) {
	h := c.Writer.Header()
	h.Set("Content-Type", "application/octet-stream")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Log-File-Size", strconv.FormatInt(size, 10))
	h.Set("X-Log-Offset", strconv.FormatInt(offset, 10))
	h.Set("X-Log-Length", strconv.FormatInt(length, 10))
	h.Set("Content-Length", strconv.FormatInt(length, 10))
	if download {
		h.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="account-%d-%s-%s"`, account, log, name))
	}
	c.Status(http.StatusOK)
	_, _ = io.CopyN(c.Writer, body, length)
}

// auditRequestLogRead records who read which content. Paging through the
// same file within the window is one row (per node).
func (s *Service) auditRequestLogRead(c *gin.Context, ctx context.Context, account int64, log, name string, offset, length int64, download bool) {
	uid, _ := core.UserID(ctx)
	key := fmt.Sprintf("%d|%d|%s|%s|%t", uid, account, log, name, download)
	now := time.Now()
	if last, ok := s.logReads.Load(key); ok && now.Sub(last.(time.Time)) < requestLogReadAuditWindow {
		return
	}
	s.logReads.Store(key, now)
	s.logReads.Range(func(k, v any) bool {
		if now.Sub(v.(time.Time)) >= requestLogReadAuditWindow {
			s.logReads.Delete(k)
		}
		return true
	})
	s.recordDetail(c, "account."+strconv.FormatInt(account, 10)+".request-logs.read",
		map[string]any{"log": log, "file": name, "offset": offset, "length": length, "download": download})
}

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
	// The summary files: the detail carries them, a file read never does.
	requestLogSummaryFiles = map[string]bool{"metadata.json": true, "events.jsonl": true, "request-headers.json": true, "response-headers.json": true}
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
	c.Header("Cache-Control", "no-store")
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
	raw, e := io.ReadAll(io.LimitReader(res.Body, limit+1))
	if e != nil || int64(len(raw)) > limit {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return nil, false
	}
	if res.StatusCode != http.StatusOK {
		httpapi.Fail(c, viewerError(res.StatusCode, raw))
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
		case "limit", "before", "request_id", "status", "model", "level", "since", "until":
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
	} {
		if v := c.Query(p.name); v != "" {
			if !p.ok(v) {
				return nil, invalid(p.name)
			}
			q[p.name] = v
		}
	}
	return q, nil
}

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
	for _, item := range page.Items {
		if !requestLogID.MatchString(item.ID) || !rfc3339(item.Time) || item.Level != requestLogSummary && item.Level != requestLogFull ||
			item.DurationMS < 0 || item.Bytes < 0 || item.Attempt < 0 {
			return page, errors.New("invalid request log item")
		}
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
	// Content says whether the caller may read the files (settings:manage).
	Content bool `json:"content"`
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
	download := c.Query("download") == "1"
	for key := range c.Request.URL.Query() {
		if key != "offset" && key != "download" {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("Invalid parameter "+strconv.Quote(key)+"."))
			return
		}
	}
	var offset int64
	if v := c.Query("offset"); v != "" {
		n, e := strconv.ParseInt(v, 10, 64)
		if e != nil || n < 0 || n > requestLogFileLimit {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("Invalid offset."))
			return
		}
		offset = n
	}
	if !requestLogID.MatchString(log) || !requestLogFileName.MatchString(name) || requestLogSummaryFiles[name] ||
		download && offset != 0 || c.Query("download") != "" && !download {
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
	size, e1 := strconv.ParseInt(res.Header.Get("X-Log-File-Size"), 10, 64)
	length, e2 := strconv.ParseInt(res.Header.Get("X-Log-Length"), 10, 64)
	at, e3 := strconv.ParseInt(res.Header.Get("X-Log-Offset"), 10, 64)
	if e1 != nil || e2 != nil || e3 != nil || at != offset || length < 0 || length > limit || size < 0 || offset+length > size {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	s.auditRequestLogRead(c, ctx, d.AccountID, log, name, offset, length, download)
	h := c.Writer.Header()
	h.Set("Content-Type", "application/octet-stream")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Log-File-Size", strconv.FormatInt(size, 10))
	h.Set("X-Log-Offset", strconv.FormatInt(offset, 10))
	h.Set("X-Log-Length", strconv.FormatInt(length, 10))
	h.Set("Content-Length", strconv.FormatInt(length, 10))
	if download {
		h.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="account-%d-%s-%s"`, d.AccountID, log, name))
	}
	c.Status(http.StatusOK)
	_, _ = io.CopyN(c.Writer, res.Body, length)
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

package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
)

// viewerAuth grants exactly the listed permission keys to user 1.
type viewerAuth map[string]bool

func (a viewerAuth) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (a viewerAuth) VerifyAccessToken(context.Context, string) (int64, error) { return 1, nil }
func (a viewerAuth) Can(_ context.Context, _ int64, key string) (bool, error) { return a[key], nil }
func (a viewerAuth) CanGrant(context.Context, int64, []string) error          { return nil }

const viewerLogID = "0b6f2a39-6f1e-4c5a-9a7b-2c3d4e5f6a7b"

// viewerWorker is a fake controller/Worker for the three log reads.
type viewerWorker struct {
	mu     sync.Mutex
	bodies map[string][]string
	reply  func(w http.ResponseWriter, action string, body map[string]any)
}

func (v *viewerWorker) handler(t *testing.T) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		action, ok := strings.CutPrefix(r.URL.Path, "/accounts/")
		if _, rest, _ := strings.Cut(action, "/"); ok {
			action = rest
		}
		action, ok = strings.CutPrefix(action, "admin/request-logs/")
		if !ok || r.Method != "POST" || r.Header.Get("Authorization") != "Bearer controller-secret" || r.URL.RawQuery != "" {
			t.Errorf("wrong runtime request: %s %s?%s", r.Method, r.URL.Path, r.URL.RawQuery)
			w.WriteHeader(500)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		v.mu.Lock()
		v.bodies[action] = append(v.bodies[action], string(raw))
		v.mu.Unlock()
		var body map[string]any
		_ = json.Unmarshal(raw, &body)
		v.reply(w, action, body)
	}
}

func (v *viewerWorker) last(action string) string {
	v.mu.Lock()
	defer v.mu.Unlock()
	if len(v.bodies[action]) == 0 {
		return ""
	}
	return v.bodies[action][len(v.bodies[action])-1]
}

func viewerFixture(t *testing.T, reply func(w http.ResponseWriter, action string, body map[string]any)) (*store.DB, *viewerWorker, int64, func(keys viewerAuth, path string) *httptest.ResponseRecorder) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	worker := &viewerWorker{bodies: map[string][]string{}, reply: reply}
	s, db := requestLogsService(t, worker.handler(t))
	var id int64
	if e := db.Pool.QueryRow(context.Background(), `INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('ccg-audit-viewer','ccgateway','managed',''::bytea) RETURNING id`).Scan(&id); e != nil {
		t.Fatal(e)
	}
	get := func(keys viewerAuth, path string) *httptest.ResponseRecorder {
		engine := gin.New()
		s.RegisterRoutes(httpapi.NewRouter(engine, keys, keys))
		req := httptest.NewRequest("GET", "/api/v1/system/ccgateway/accounts/"+strconv.FormatInt(id, 10)+"/request-logs/requests"+path, nil)
		req.Header.Set("Authorization", "Bearer test")
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		return w
	}
	return db, worker, id, get
}

var (
	readers  = viewerAuth{"settings:read": true}
	managers = viewerAuth{"settings:manage": true}
)

func TestRequestLogViewerPermissions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		keys viewerAuth
		path string
	}{
		{viewerAuth{"account:own:read": true}, ""},
		{viewerAuth{"account:own:read": true}, "/" + viewerLogID},
		{viewerAuth{"account:update": true, "account:own:update": true}, ""},
		{viewerAuth{"settings:read": true, "account:read": true, "account:update": true}, "/" + viewerLogID + "/files/request.body"},
	} {
		engine := gin.New()
		(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, tc.keys, tc.keys))
		req := httptest.NewRequest("GET", "/api/v1/system/ccgateway/accounts/25/request-logs/requests"+tc.path, nil)
		req.Header.Set("Authorization", "Bearer test")
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		if w.Code != 403 {
			t.Fatalf("%v %s: %d", tc.keys, tc.path, w.Code)
		}
	}
}

func TestRequestLogListForwardsQueryAndProjects(t *testing.T) {
	_, worker, _, get := viewerFixture(t, func(w http.ResponseWriter, action string, body map[string]any) {
		_, _ = w.Write([]byte(`{"items":[{"id":"` + viewerLogID + `","request_id":"rid","time":"2026-10-23T10:00:00Z","duration_ms":12,"status":529,` +
			`"stage":"upstream","model":"m","log_level":"full","error_type":"overloaded_error","log_status":"complete","test":false,"attempt":1,` +
			`"has_content":true,"bytes":2048,"private":"must-not-leak"}],"next":"1761213600000000000_` + viewerLogID + `","active":[{"request_id":"r2","started":"2026-10-23T10:00:01Z","stage":"cli"}]}`))
	})
	w := get(viewerAuth{"account:read": true}, "?limit=20&status=error&request_id=rid&level=full&model=m&since=2026-10-22T00:00:00Z&before=1_"+viewerLogID)
	if w.Code != 200 || strings.Contains(w.Body.String(), "must-not-leak") || !strings.Contains(w.Body.String(), `"attempt":1`) || !strings.Contains(w.Body.String(), `"active":[{`) {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if got := worker.last("query"); got != `{"before":"1_`+viewerLogID+`","level":"full","limit":20,"model":"m","request_id":"rid","since":"2026-10-22T00:00:00Z","status":"error"}` {
		t.Fatal("forwarded query", got)
	}
	for _, q := range []string{"?limit=0", "?limit=101", "?limit=x", "?status=active", "?level=off", "?request_id=a/b", "?before=x",
		"?since=yesterday", "?other=1", "?model=" + strings.Repeat("m", 257)} {
		if w := get(readers, q); w.Code != 400 {
			t.Fatalf("%s: %d", q, w.Code)
		}
	}
	if n := len(worker.bodies["query"]); n != 1 {
		t.Fatal("rejected queries reached the Worker", n)
	}
}

func TestRequestLogListRejectsMalformedWorkerAnswers(t *testing.T) {
	answer := ""
	_, _, _, get := viewerFixture(t, func(w http.ResponseWriter, action string, body map[string]any) { _, _ = w.Write([]byte(answer)) })
	for _, answer = range []string{`{}`, `{"items":[{"id":"../x","time":"2026-10-23T10:00:00Z","log_level":"full"}]}`,
		`{"items":[{"id":"` + viewerLogID + `","time":"now","log_level":"full"}]}`, `{"items":[],"next":"x"}`, `not json`} {
		if w := get(readers, ""); w.Code != 503 {
			t.Fatalf("%s: %d", answer, w.Code)
		}
	}
}

// The detail's metadata is projected by default: without settings:manage only
// the listed summary fields come through, so identity, the upstream's error
// text, Worker paths and fields added later stay with settings:manage.
func TestRequestLogDetailProjectsMetadataWithoutContent(t *testing.T) {
	const summary = `"request_id":"rid","http_status":529,"status":529,"stage":"request_command","model":"claude-x","duration_ms":12,` +
		`"error_type":"overloaded_error","error_code":"overloaded","error_source":"http","mode":"build","body_sha256":"ab","upstream_betas":["b1"],"stream":true`
	// path is a listed name, but an object is not a summary value.
	const metadata = `{` + summary + `,"device_id":"dev-1","account_uuid":"acc-uuid","error":"upstream said: secret detail","log_directory":"x",` +
		`"messages":[{"role":"user"}],"future_field":"new","path":{"nested":"content"}}`
	_, _, _, get := viewerFixture(t, func(w http.ResponseWriter, _ string, _ map[string]any) {
		_, _ = w.Write([]byte(`{"metadata":` + metadata + `,"events":[],"events_truncated":false,"files":[]}`))
	})
	read := func(keys viewerAuth) map[string]any {
		t.Helper()
		w := get(keys, "/"+viewerLogID)
		var out struct {
			Data struct {
				Metadata map[string]any `json:"metadata"`
			} `json:"data"`
		}
		if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &out) != nil || out.Data.Metadata == nil {
			t.Fatalf("detail: %d %s", w.Code, w.Body)
		}
		return out.Data.Metadata
	}
	var whole, projected map[string]any
	if json.Unmarshal([]byte(metadata), &whole) != nil || json.Unmarshal([]byte(`{`+summary+`}`), &projected) != nil {
		t.Fatal("fixture")
	}
	for _, keys := range []viewerAuth{{"account:read": true}, {"settings:read": true}} {
		if got := read(keys); !reflect.DeepEqual(got, projected) {
			t.Errorf("%v reads %v, want %v", keys, got, projected)
		}
	}
	for _, keys := range []viewerAuth{{"settings:manage": true}, {"account:read": true, "settings:manage": true}} {
		if got := read(keys); !reflect.DeepEqual(got, whole) {
			t.Errorf("%v reads %v, want the whole metadata", keys, got)
		}
	}
}

// Without settings:manage the events, the upstream request and the headers
// of a detail keep only their summary fields; settings:manage reads them as
// the Worker sent them, secret headers masked (FU3).
func TestRequestLogDetailProjectsEventsWithoutContent(t *testing.T) {
	const events = `[{"time":"t1","event":"resource_identity_verified","detail":{"principal_id":"p-1","organization_uuid":"o-1"}},` +
		`{"time":"t2","event":"resource_dispatch_failed","detail":{"error":"open /home/u/secret.txt: denied"}},` +
		`{"time":"t3","event":"resource_received","detail":{"method":"POST","path":"/v1/files","query":"name=secret.txt","declared_bytes":5}},` +
		`{"time":"t4","event":"resource_upload_spooled","detail":{"bytes":5,"sha256":"ab","parts":[{"filename":"secret.txt"}]}},` +
		`{"time":"t5","event":"cli_error","detail":{"status":529,"code":"overloaded","source":"http","truncated":false,"future":"x"},"extra":"y"},` +
		`{"time":"t6","event":"resource_issuer_mismatch","detail":null},"not an object"]`
	const upstream = `{"schema":1,"mode":"build","method":"POST","url":"https://api.anthropic.com/v1/messages?beta=true","sent_at":"t",` +
		`"headers":{"Authorization":"Bearer sk-secret","anthropic-beta":"b1","User-Agent":"claude-cli (device)","x-claude-code-session-id":"s1"},` +
		`"body_bytes":12,"body_sha256":"ab","prompt":"secret prompt","future":{"x":1}}`
	const headers = `"request_headers":{"X-Api-Key":["sk-live"],"Content-Type":["application/json"],"User-Agent":["device"]},` +
		`"response_headers":{"Set-Cookie":["c"],"Request-Id":["rid"],"X-Internal-Path":["/srv/x"]}`
	_, _, _, get := viewerFixture(t, func(w http.ResponseWriter, _ string, _ map[string]any) {
		_, _ = w.Write([]byte(`{"metadata":{"request_id":"rid"},"events":` + events + `,"events_truncated":false,` + headers +
			`,"upstream_request":` + upstream + `,"files":[]}`))
	})
	read := func(keys viewerAuth) (string, requestLogDetail) {
		t.Helper()
		w := get(keys, "/"+viewerLogID)
		var out struct {
			Data requestLogDetail `json:"data"`
		}
		if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &out) != nil {
			t.Fatalf("detail: %d %s", w.Code, w.Body)
		}
		return w.Body.String(), out.Data
	}
	body, d := read(viewerAuth{"account:read": true})
	for _, leaked := range []string{"p-1", "o-1", "secret", "/v1/files", "future", "extra", "device", "sk-", "/srv/x", "api.anthropic.com/v1", "not an object"} {
		if strings.Contains(body, leaked) {
			t.Errorf("account:read reads %q: %s", leaked, body)
		}
	}
	wantEvents := []any{
		map[string]any{"time": "t1", "event": "resource_identity_verified", "detail": map[string]any{}},
		map[string]any{"time": "t2", "event": "resource_dispatch_failed", "detail": map[string]any{}},
		map[string]any{"time": "t3", "event": "resource_received", "detail": map[string]any{"method": "POST", "declared_bytes": float64(5)}},
		map[string]any{"time": "t4", "event": "resource_upload_spooled", "detail": map[string]any{"bytes": float64(5), "sha256": "ab"}},
		map[string]any{"time": "t5", "event": "cli_error", "detail": map[string]any{"status": float64(529), "code": "overloaded", "source": "http", "truncated": false}},
		map[string]any{"time": "t6", "event": "resource_issuer_mismatch"},
	}
	wantUpstream := map[string]any{"schema": float64(1), "mode": "build", "method": "POST", "host": "api.anthropic.com", "sent_at": "t",
		"body_bytes": float64(12), "body_sha256": "ab", "headers": map[string]any{"anthropic-beta": "b1", "x-claude-code-session-id": "s1"}}
	if !reflect.DeepEqual(d.Events, wantEvents) || !reflect.DeepEqual(d.UpstreamRequest, wantUpstream) ||
		!reflect.DeepEqual(d.RequestHeaders, map[string][]string{"Content-Type": {"application/json"}}) ||
		!reflect.DeepEqual(d.ResponseHeaders, map[string][]string{"Request-Id": {"rid"}}) {
		t.Fatalf("account:read detail:\n%v\n%v\n%v %v", d.Events, d.UpstreamRequest, d.RequestHeaders, d.ResponseHeaders)
	}

	body, d = read(viewerAuth{"settings:manage": true})
	var whole []any
	if json.Unmarshal([]byte(events), &whole) != nil || !reflect.DeepEqual(d.Events, whole) {
		t.Fatalf("settings:manage events: %v", d.Events)
	}
	if strings.Contains(body, "sk-") || d.UpstreamRequest["url"] != "https://api.anthropic.com/v1/messages?beta=true" ||
		d.UpstreamRequest["prompt"] != "secret prompt" || d.RequestHeaders["User-Agent"][0] != "device" ||
		d.RequestHeaders["X-Api-Key"][0] != "[REDACTED]" || d.ResponseHeaders["X-Internal-Path"][0] != "/srv/x" {
		t.Fatalf("settings:manage detail: %s", body)
	}
}

// The list keeps the classified error for every reader and the upstream's
// text for settings:manage only.
func TestRequestLogListHidesErrorTextWithoutContent(t *testing.T) {
	_, _, _, get := viewerFixture(t, func(w http.ResponseWriter, _ string, _ map[string]any) {
		_, _ = w.Write([]byte(`{"items":[{"id":"` + viewerLogID + `","request_id":"rid","time":"2026-11-12T00:00:00Z","duration_ms":1,"status":529,` +
			`"stage":"request_command","log_level":"summary","error_type":"overloaded_error","error":"upstream said: secret detail","log_status":"complete","bytes":1}],"next":null}`))
	})
	for _, tc := range []struct {
		keys viewerAuth
		text string
	}{
		{viewerAuth{"account:read": true}, ""},
		{viewerAuth{"settings:read": true}, ""},
		{viewerAuth{"settings:manage": true}, "upstream said: secret detail"},
		{viewerAuth{"account:read": true, "settings:manage": true}, "upstream said: secret detail"},
	} {
		w := get(tc.keys, "")
		var out struct {
			Data struct {
				Items []requestLogItem `json:"items"`
			} `json:"data"`
		}
		if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &out) != nil || len(out.Data.Items) != 1 {
			t.Fatalf("%v list: %d %s", tc.keys, w.Code, w.Body)
		}
		if item := out.Data.Items[0]; item.Error != tc.text || item.ErrorType != "overloaded_error" {
			t.Errorf("%v reads error %q (%s), want %q", tc.keys, item.Error, item.ErrorType, tc.text)
		}
	}
}

func TestRequestLogDetailContentFollowsPermission(t *testing.T) {
	_, worker, _, get := viewerFixture(t, func(w http.ResponseWriter, action string, body map[string]any) {
		_, _ = w.Write([]byte(`{"metadata":{"request_id":"rid"},"events":[{"event":"x"}],"events_truncated":false,` +
			`"request_headers":{"X-Api-Key":["sk-live"],"X-Request-Id":["rid"]},"response_headers":{"Set-Cookie":["c"]},` +
			`"files":[{"name":"request.body","bytes":10,"kind":"request"},{"name":"metadata.json","bytes":1,"kind":"build"},{"name":"../x","bytes":1,"kind":"other"}]}`))
	})
	w := get(readers, "/"+viewerLogID)
	if w.Code != 200 || worker.last("detail") != `{"content":false,"id":"`+viewerLogID+`"}` {
		t.Fatalf("reader: %d %s / %s", w.Code, w.Body.String(), worker.last("detail"))
	}
	var out struct {
		Data requestLogDetail `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if out.Data.Content || len(out.Data.Files) != 1 || out.Data.Files[0].Name != "request.body" ||
		!reflect.DeepEqual(out.Data.RequestHeaders, map[string][]string{"X-Request-Id": {"rid"}}) || len(out.Data.ResponseHeaders) != 0 {
		t.Fatal("reader detail", out.Data)
	}
	w = get(managers, "/"+viewerLogID)
	if w.Code != 200 || worker.last("detail") != `{"content":true,"id":"`+viewerLogID+`"}` || !strings.Contains(w.Body.String(), `"content":true`) {
		t.Fatalf("manager: %d %s", w.Code, worker.last("detail"))
	}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if out.Data.RequestHeaders["X-Api-Key"][0] != "[REDACTED]" || out.Data.ResponseHeaders["Set-Cookie"][0] != "[REDACTED]" {
		t.Fatal("manager detail", out.Data)
	}
	if w := get(readers, "/not-a-log"); w.Code != 400 {
		t.Fatal("invalid id", w.Code)
	}
}

func TestRequestLogFileStreamsAndAudits(t *testing.T) {
	db, worker, id, get := viewerFixture(t, func(w http.ResponseWriter, action string, body map[string]any) {
		switch body["name"] {
		case "missing.body":
			w.WriteHeader(404)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"request_log_not_found","message":"Request log file not found"}}`))
			return
		case "old.body":
			w.WriteHeader(404)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"not_found_error","message":"Unknown management endpoint"}}`))
			return
		case "off.body":
			w.WriteHeader(409)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"request_logs_off","message":"Request logs are off"}}`))
			return
		case "lying.body":
			w.Header().Set("X-Log-File-Size", "3")
			w.Header().Set("X-Log-Offset", "0")
			w.Header().Set("X-Log-Length", "9")
			_, _ = w.Write([]byte("abc"))
			return
		}
		data := "0123456789"
		offset := 0
		if v, ok := body["offset"].(float64); ok {
			offset = int(v)
		}
		w.Header().Set("X-Log-File-Size", "10")
		w.Header().Set("X-Log-Offset", strconv.Itoa(offset))
		w.Header().Set("X-Log-Length", strconv.Itoa(10-offset))
		_, _ = w.Write([]byte(data[offset:]))
	})
	file := "/" + viewerLogID + "/files/request.body"
	w := get(managers, file+"?offset=4")
	if w.Code != 200 || w.Body.String() != "456789" || w.Header().Get("X-Log-File-Size") != "10" || w.Header().Get("X-Log-Offset") != "4" ||
		w.Header().Get("Content-Type") != "application/octet-stream" || w.Header().Get("X-Content-Type-Options") != "nosniff" || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("chunk: %d %q %v", w.Code, w.Body.String(), w.Header())
	}
	if worker.last("read") != `{"id":"`+viewerLogID+`","name":"request.body","offset":4}` {
		t.Fatal("forwarded read", worker.last("read"))
	}
	if w := get(managers, file); w.Code != 200 || w.Body.String() != "0123456789" {
		t.Fatal("second chunk", w.Code)
	}
	w = get(managers, file+"?download=1")
	if w.Code != 200 || w.Body.String() != "0123456789" || !strings.Contains(w.Header().Get("Content-Disposition"), `attachment; filename="account-`+strconv.FormatInt(id, 10)+`-`+viewerLogID+`-request.body"`) ||
		worker.last("read") != `{"download":true,"id":"`+viewerLogID+`","name":"request.body"}` {
		t.Fatalf("download: %d %v %s", w.Code, w.Header(), worker.last("read"))
	}
	for name, want := range map[string]int{"missing.body": 404, "old.body": 503, "off.body": 409, "lying.body": 503} {
		if w := get(managers, "/"+viewerLogID+"/files/"+name); w.Code != want {
			t.Fatalf("%s: %d %s", name, w.Code, w.Body.String())
		}
	}
	reads := len(worker.bodies["read"])
	for _, path := range []string{"/" + viewerLogID + "/files/metadata.json", "/" + viewerLogID + "/files/A.body", "/x/files/request.body",
		file + "?offset=-1", file + "?offset=1&download=1", file + "?download=yes", file + "?other=1"} {
		if w := get(managers, path); w.Code != 400 && w.Code != 404 {
			t.Fatalf("%s: %d", path, w.Code)
		}
	}
	if len(worker.bodies["read"]) != reads {
		t.Fatal("rejected reads reached the Worker")
	}
	// Two chunks of one file are one audit row; the download is another.
	var n int
	if err := db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action=$1`,
		"ccgateway.account."+strconv.FormatInt(id, 10)+".request-logs.read").Scan(&n); err != nil || n != 2 {
		t.Fatal("audit rows", n, err)
	}
}

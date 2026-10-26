package ccgateway

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §4: the core checks and forwards the
// new filters, keeps the new list fields of their shape, masks the upstream
// request headers again and passes viewer_search through.

const viewerSHA = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func queryOf(t *testing.T, rawQuery string) (string, bool) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/requests?"+rawQuery, nil)
	q, e := requestLogQuery(c)
	if e != nil {
		return "", false
	}
	b, _ := json.Marshal(q)
	return string(b), true
}

func TestRequestLogQuerySearchParams(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{"", `{}`},
		{"mode=direct", `{"mode":"direct"}`},
		{"mode=build", `{"mode":"build"}`},
		{"session_id=sess_A-1", `{"session_id":"sess_A-1"}`},
		{"session_id=" + strings.Repeat("s", 128), `{"session_id":"` + strings.Repeat("s", 128) + `"}`},
		{"sha256=" + strings.ToUpper(viewerSHA), `{"sha256":"` + viewerSHA + `"}`},
		{"changed=true", `{"changed":true}`},
		{"changed=false", `{"changed":false}`},
		// Empty values are "not given" and not forwarded, like the other filters.
		{"mode=&session_id=&sha256=&changed=", `{}`},
		{"mode=build&session_id=s&sha256=" + viewerSHA + "&changed=false&status=ok",
			`{"changed":false,"mode":"build","session_id":"s","sha256":"` + viewerSHA + `","status":"ok"}`},
	} {
		got, ok := queryOf(t, tc.in)
		if !ok || got != tc.want {
			t.Fatalf("%q: %v %s", tc.in, ok, got)
		}
	}
	for _, in := range []string{
		"mode=Direct", "mode=legacy", "mode=direct,build",
		"session_id=a/b", "session_id=a%20b", "session_id=a.b", "session_id=" + strings.Repeat("s", 129),
		"sha256=" + viewerSHA[:63], "sha256=" + viewerSHA + "0", "sha256=" + strings.Repeat("g", 64),
		"changed=1", "changed=yes", "changed=TRUE",
		"session=s", "hash=" + viewerSHA, "body_changed=true", "upstream_session_id=s",
	} {
		if got, ok := queryOf(t, in); ok {
			t.Fatalf("%q accepted: %s", in, got)
		}
	}
}

func TestRequestLogPageKeepsUpstreamFieldsOfTheirShape(t *testing.T) {
	item := func(fields string) string {
		return `{"items":[{"id":"` + viewerLogID + `","request_id":"rid","time":"2026-10-26T10:00:00Z","log_level":"summary"` + fields + `}]}`
	}
	page, err := decodeRequestLogPage([]byte(item(`,"mode":"build","client_session_id":"c-1","upstream_session_id":"u_2",` +
		`"body_sha256":"` + strings.ToUpper(viewerSHA) + `","upstream_body_sha256":"` + viewerSHA + `","body_changed":true,"upstream_captured":true`)))
	if err != nil {
		t.Fatal(err)
	}
	got := page.Items[0]
	if got.Mode != "build" || got.ClientSessionID != "c-1" || got.UpstreamSessionID != "u_2" || got.BodySHA256 != viewerSHA ||
		got.UpstreamBodySHA256 != viewerSHA || got.BodyChanged == nil || !*got.BodyChanged || got.UpstreamCaptured == nil || !*got.UpstreamCaptured {
		t.Fatalf("lost fields: %+v", got)
	}
	// Values not of their shape are dropped; the page and the item stay.
	page, err = decodeRequestLogPage([]byte(item(`,"mode":"legacy","client_session_id":"a b","upstream_session_id":"` + strings.Repeat("u", 129) + `",` +
		`"body_sha256":"abc","upstream_body_sha256":"` + strings.Repeat("z", 64) + `","body_changed":false,"upstream_captured":false`)))
	if err != nil {
		t.Fatal(err)
	}
	got = page.Items[0]
	if got.Mode != "" || got.ClientSessionID != "" || got.UpstreamSessionID != "" || got.BodySHA256 != "" || got.UpstreamBodySHA256 != "" ||
		got.BodyChanged == nil || *got.BodyChanged || got.UpstreamCaptured == nil || *got.UpstreamCaptured {
		t.Fatalf("unshaped fields kept: %+v", got)
	}
	encoded, _ := json.Marshal(got)
	for _, absent := range []string{`"mode"`, `"client_session_id"`, `"upstream_session_id"`, `"body_sha256"`, `"upstream_body_sha256"`} {
		if strings.Contains(string(encoded), absent) {
			t.Fatalf("%s present: %s", absent, encoded)
		}
	}
	if !strings.Contains(string(encoded), `"body_changed":false`) || !strings.Contains(string(encoded), `"upstream_captured":false`) {
		t.Fatal("false values dropped", string(encoded))
	}
	// An old Worker's item has none of them.
	page, err = decodeRequestLogPage([]byte(item("")))
	if err != nil || page.Items[0].BodyChanged != nil || page.Items[0].Mode != "" || page.Items[0].UpstreamCaptured != nil {
		t.Fatal("old item", err, page.Items)
	}
}

func TestRequestLogListForwardsSearch(t *testing.T) {
	_, worker, _, get := viewerFixture(t, func(w http.ResponseWriter, action string, body map[string]any) {
		_, _ = w.Write([]byte(`{"items":[{"id":"` + viewerLogID + `","request_id":"rid","time":"2026-10-26T10:00:00Z","log_level":"full",` +
			`"mode":"direct","client_session_id":"c1","upstream_session_id":"bad/id","body_sha256":"` + viewerSHA + `","body_changed":true,` +
			`"upstream_captured":true,"private":"must-not-leak"}],"next":null}`))
	})
	w := get(readers, "?mode=direct&session_id=c1&sha256="+strings.ToUpper(viewerSHA)+"&changed=true")
	body := w.Body.String()
	if w.Code != 200 || strings.Contains(body, "must-not-leak") || strings.Contains(body, "bad/id") || !strings.Contains(body, `"mode":"direct"`) ||
		!strings.Contains(body, `"client_session_id":"c1"`) || !strings.Contains(body, `"body_changed":true`) || !strings.Contains(body, `"upstream_captured":true`) {
		t.Fatalf("%d %s", w.Code, body)
	}
	if got := worker.last("query"); got != `{"changed":true,"mode":"direct","session_id":"c1","sha256":"`+viewerSHA+`"}` {
		t.Fatal("forwarded query", got)
	}
	// Without the new filters nothing new is forwarded.
	if w := get(readers, "?status=ok"); w.Code != 200 || worker.last("query") != `{"status":"ok"}` {
		t.Fatal("plain query", w.Code, worker.last("query"))
	}
	n := len(worker.bodies["query"])
	for _, q := range []string{"?mode=x", "?session_id=a/b", "?sha256=1", "?changed=maybe", "?session=x"} {
		if w := get(readers, q); w.Code != 400 {
			t.Fatalf("%s: %d", q, w.Code)
		}
	}
	if len(worker.bodies["query"]) != n {
		t.Fatal("rejected queries reached the Worker")
	}
}

// A Worker without viewer_search refuses the unknown keys with 400: with the
// new filters that is "update the plugin", otherwise the usual refusal.
func TestRequestLogListSearchOnOldWorker(t *testing.T) {
	_, _, _, get := viewerFixture(t, func(w http.ResponseWriter, action string, body map[string]any) {
		w.WriteHeader(400)
		_, _ = w.Write([]byte(`{"type":"error","error":{"type":"invalid_request_error","message":"Invalid request log query"}}`))
	})
	if w := get(readers, "?changed=false"); w.Code != 503 || !strings.Contains(w.Body.String(), "request_log_search_unsupported") {
		t.Fatalf("new filter: %d %s", w.Code, w.Body.String())
	}
	if w := get(readers, "?status=ok"); w.Code != 400 || strings.Contains(w.Body.String(), "request_log_search_unsupported") {
		t.Fatalf("old filter: %d %s", w.Code, w.Body.String())
	}
}

func TestRequestLogDetailMasksUpstreamRequest(t *testing.T) {
	_, _, _, get := viewerFixture(t, func(w http.ResponseWriter, action string, body map[string]any) {
		_, _ = w.Write([]byte(`{"metadata":{"request_id":"rid","upstream_captured":true},"events":[],"request_headers":{},"response_headers":{},` +
			`"upstream_request":{"schema":1,"mode":"build","method":"POST","url":"https://api.anthropic.com/v1/messages?beta=true",` +
			`"headers":{"Authorization":"Bearer sk-ant-oat-secret","x-api-key":"sk-live","cookie":["a=b"],"x-ccg-revision":{"v":1},` +
			`"anthropic-beta":"oauth-2025-04-20","x-claude-code-session-id":"s1"},"body_bytes":12,"body_sha256":"` + viewerSHA + `"},` +
			`"files":[{"name":"upstream-request.json","bytes":900,"kind":"upstream"},{"name":"upstream-request.body","bytes":12,"kind":"upstream"},` +
			`{"name":"request.body","bytes":10,"kind":"request"}]}`))
	})
	w := get(managers, "/"+viewerLogID)
	if w.Code != 200 || strings.Contains(w.Body.String(), "secret") || strings.Contains(w.Body.String(), "sk-live") || strings.Contains(w.Body.String(), "a=b") {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	var out struct {
		Data requestLogDetail `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	h, _ := out.Data.UpstreamRequest["headers"].(map[string]any)
	if h["Authorization"] != "[REDACTED]" || h["x-api-key"] != "[REDACTED]" || h["x-ccg-revision"] != "[REDACTED]" ||
		h["cookie"].([]any)[0] != "[REDACTED]" || h["anthropic-beta"] != "oauth-2025-04-20" || h["x-claude-code-session-id"] != "s1" ||
		out.Data.UpstreamRequest["body_sha256"] != viewerSHA || out.Data.UpstreamRequest["mode"] != "build" {
		t.Fatalf("upstream request: %v", out.Data.UpstreamRequest)
	}
	names := []string{}
	for _, f := range out.Data.Files {
		names = append(names, f.Name)
	}
	if strings.Join(names, ",") != "upstream-request.body,request.body" {
		t.Fatal("content files", names)
	}
	// The summary file is never read as content.
	if w := get(managers, "/"+viewerLogID+"/files/upstream-request.json"); w.Code != 400 {
		t.Fatal("upstream-request.json read", w.Code)
	}
}

func TestMaskUpstreamRequestShapes(t *testing.T) {
	if maskUpstreamRequest(nil) != nil {
		t.Fatal("nil invented")
	}
	up := maskUpstreamRequest(map[string]any{"method": "POST"})
	if _, ok := up["headers"]; ok || up["method"] != "POST" {
		t.Fatal("no headers", up)
	}
	up = maskUpstreamRequest(map[string]any{"headers": "authorization: Bearer x", "url": "u"})
	if _, ok := up["headers"]; ok || up["url"] != "u" {
		t.Fatal("headers that are not an object kept", up)
	}
}

func TestRequestLogStateViewerSearch(t *testing.T) {
	base := `{"enabled":true,"level":"summary","levels":["off","summary","full"],"viewer":true`
	for raw, want := range map[string]bool{base + `}`: false, base + `,"viewer_search":false}`: false, base + `,"viewer_search":true}`: true} {
		out, err := decodeRequestLogState([]byte(raw))
		st, ok := out.(requestLogLevelState)
		if err != nil || !ok || st.ViewerSearch != want {
			t.Fatalf("%s: %v %+v", raw, err, out)
		}
		encoded, _ := json.Marshal(st)
		if !strings.Contains(string(encoded), `"viewer_search":`+map[bool]string{true: "true", false: "false"}[want]) {
			t.Fatal("not projected", string(encoded))
		}
	}
	if _, err := decodeRequestLogState([]byte(base + `,"viewer_search":"yes"}`)); err == nil {
		t.Fatal("non-boolean viewer_search accepted")
	}
	// A legacy Worker's state has no viewer_search at all.
	out, _ := decodeRequestLogState([]byte(`{"enabled":true,"viewer_search":true}`))
	if encoded, _ := json.Marshal(out); strings.Contains(string(encoded), "viewer_search") {
		t.Fatal("legacy state", string(encoded))
	}
}

func TestRequestLogsStatePassesViewerSearch(t *testing.T) {
	s, _ := requestLogsService(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(strings.Replace(leveledWorkerState, `"viewer":true`, `"viewer":true,"viewer_search":true`, 1)))
	})
	w := serveRequestLogsOnce(s, "GET", "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"viewer_search":true`) || strings.Contains(w.Body.String(), "must-not-leak") {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}

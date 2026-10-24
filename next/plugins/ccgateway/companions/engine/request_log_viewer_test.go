package engine

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

// viewerRequest logs one request with the given ID and status; content is
// kept when the store is at the full level.
func viewerRequest(t *testing.T, store *requestLogStore, requestID string, status int) string {
	t.Helper()
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	r.Header.Set("X-Request-ID", requestID)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	d.request([]byte(`{"model":"claude-test","messages":[{"role":"user","content":"`+privateMarker+`"}]}`), r.Header)
	d.save("build-components.json", []byte(`{"system":"`+privateMarker+`"}`))
	d.trace("cli_error", Object{"message": strings.Repeat("e", 300)})
	if status >= 400 {
		d.fail(status, "overloaded_error", "Overloaded")
		out.WriteHeader(status)
	}
	_, _ = out.Write([]byte(privateMarker))
	d.finish()
	return filepath.Base(d.directory)
}

func viewer(t *testing.T, store *requestLogStore, action, body string) (int, []byte, *httptest.ResponseRecorder) {
	t.Helper()
	w := httptest.NewRecorder()
	store.serveViewer(w, httptest.NewRequest("POST", "/admin/request-logs/"+action, strings.NewReader(body)), action)
	return w.Code, w.Body.Bytes(), w
}

type viewerList struct {
	Items []struct {
		ID         string `json:"id"`
		RequestID  string `json:"request_id"`
		Status     int    `json:"status"`
		Level      string `json:"log_level"`
		Attempt    int    `json:"attempt"`
		HasContent bool   `json:"has_content"`
		Model      string `json:"model"`
		ErrorType  string `json:"error_type"`
	} `json:"items"`
	Next   *string  `json:"next"`
	Active []Object `json:"active"`
}

func listLogs(t *testing.T, store *requestLogStore, body string) viewerList {
	t.Helper()
	code, raw, _ := viewer(t, store, "query", body)
	var out viewerList
	if code != 200 || json.Unmarshal(raw, &out) != nil {
		t.Fatalf("query %s: %d %s", body, code, raw)
	}
	return out
}

// cli-stdout.jsonl is written by Worker 0.1.86 and earlier; it must stay in
// its own group so a current console still labels those directories right.
func TestRequestLogFileKinds(t *testing.T) {
	for name, want := range map[string]string{
		"request.body": "request", "response.body": "response", "resource-config.json": "upstream",
		"cli-stdout.jsonl": "cli", "cli-stderr.jsonl": "cli", "history.jsonl": "history",
		"build-components.json": "build", "notes.txt": "other",
	} {
		if got := logFileKind(name); got != want {
			t.Fatalf("%s: %s, want %s", name, got, want)
		}
	}
}

func TestRequestLogQueryOrdersFiltersAndPages(t *testing.T) {
	store, _ := newRequestLogStore(t.TempDir())
	first := viewerRequest(t, store, "rid-retried", 529)
	putLogs(t, store, `{"level":"full","full_for_hours":1}`)
	second := viewerRequest(t, store, "rid-retried", 200)
	third := viewerRequest(t, store, "rid-other", 200)

	all := listLogs(t, store, `{}`)
	if len(all.Items) != 3 || all.Items[0].ID != third || all.Items[1].ID != second || all.Items[2].ID != first || all.Next != nil {
		t.Fatal("not newest first", all)
	}
	if all.Items[1].Attempt != 2 || all.Items[2].Attempt != 1 || all.Items[0].Attempt != 0 {
		t.Fatal("retries not numbered", all)
	}
	if all.Items[2].Level != logLevelSummary || all.Items[2].HasContent || !all.Items[1].HasContent || all.Items[1].Level != logLevelFull {
		t.Fatal("levels or content", all)
	}
	if all.Items[2].Status != 529 || all.Items[2].ErrorType != "overloaded_error" || all.Items[0].Model != "claude-test" {
		t.Fatal("index fields", all)
	}
	page := listLogs(t, store, `{"limit":2}`)
	if len(page.Items) != 2 || page.Next == nil {
		t.Fatal("first page", page)
	}
	rest := listLogs(t, store, `{"limit":2,"before":"`+*page.Next+`"}`)
	if len(rest.Items) != 1 || rest.Items[0].ID != first || rest.Next != nil {
		t.Fatal("second page", rest)
	}
	for body, want := range map[string]int{`{"status":"error"}`: 1, `{"status":"ok"}`: 2, `{"request_id":"rid-retried"}`: 2, `{"level":"summary"}`: 1,
		`{"model":"other"}`: 0, `{"since":"2999-01-01T00:00:00Z"}`: 0, `{"until":"2999-01-01T00:00:00Z"}`: 3} {
		if got := listLogs(t, store, body); len(got.Items) != want {
			t.Fatalf("%s: %d items", body, len(got.Items))
		}
	}
	for _, body := range []string{`{"limit":101}`, `{"limit":-1}`, `{"status":"active"}`, `{"level":"off"}`, `{"request_id":"a/b"}`,
		`{"before":"x"}`, `{"since":"yesterday"}`, `{"unknown":1}`, `[]`} {
		if code, _, _ := viewer(t, store, "query", body); code != 400 {
			t.Fatalf("%s accepted", body)
		}
	}
	// A new store reads the same index from disk.
	reloaded, _ := newRequestLogStore(filepath.Dir(store.root))
	if got := listLogs(t, reloaded, `{}`); len(got.Items) != 3 || got.Items[0].ID != third {
		t.Fatal("index not rebuilt from disk", got)
	}
}

func TestRequestLogQueryShowsActiveRequests(t *testing.T) {
	store, _ := newRequestLogStore(t.TempDir())
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	r.Header.Set("X-Request-ID", "rid-running")
	d := newRequestDiagnostic(w, r)
	d.store = store
	d.capture(w, r)
	got := listLogs(t, store, `{}`)
	if len(got.Items) != 0 || len(got.Active) != 1 || got.Active[0]["request_id"] != "rid-running" {
		t.Fatal("running request", got)
	}
	d.finish()
	if got := listLogs(t, store, `{}`); len(got.Items) != 1 || len(got.Active) != 0 {
		t.Fatal("finished request not indexed", got)
	}
}

func TestRequestLogDetailBoundsEventsWithoutContent(t *testing.T) {
	store, _ := newRequestLogStore(t.TempDir())
	putLogs(t, store, `{"level":"full","full_for_hours":1}`)
	id := viewerRequest(t, store, "rid-detail", 200)
	type detail struct {
		Metadata       Object              `json:"metadata"`
		Events         []Object            `json:"events"`
		RequestHeaders map[string][]string `json:"request_headers"`
		Files          []Object            `json:"files"`
	}
	read := func(content bool) detail {
		code, raw, _ := viewer(t, store, "detail", `{"id":"`+id+`","content":`+map[bool]string{true: "true", false: "false"}[content]+`}`)
		var out detail
		if code != 200 || json.Unmarshal(raw, &out) != nil {
			t.Fatal(code, string(raw))
		}
		if !content && bytes.Contains(raw, []byte(privateMarker)) {
			t.Fatal("detail without content shows content")
		}
		return out
	}
	summary := read(false)
	if summary.Metadata["request_id"] != "rid-detail" || summary.RequestHeaders["X-Request-Id"][0] != "rid-detail" || len(summary.Events) < 2 {
		t.Fatal("detail", summary)
	}
	full := read(true)
	long := func(d detail) bool {
		for _, e := range d.Events {
			if e["event"] == "cli_error" {
				return len(e["detail"].(map[string]any)["message"].(string)) == 300
			}
		}
		t.Fatal("cli_error event missing")
		return false
	}
	if long(summary) || !long(full) {
		t.Fatal("event texts not bounded without content")
	}
	kinds := map[string]string{}
	for _, f := range full.Files {
		kinds[f["name"].(string)] = f["kind"].(string)
	}
	if kinds["request.body"] != "request" || kinds["response.body"] != "response" || kinds["build-components.json"] != "build" || kinds["metadata.json"] != "" {
		t.Fatal("content files", kinds)
	}
	for body, want := range map[string]int{`{"id":"` + uuid() + `"}`: 404, `{"id":"../x"}`: 400, `{"id":"` + id + `","x":1}`: 400} {
		if code, _, _ := viewer(t, store, "detail", body); code != want {
			t.Fatalf("%s: %d", body, code)
		}
	}
}

func TestRequestLogReadChunksAndDownloads(t *testing.T) {
	store, _ := newRequestLogStore(t.TempDir())
	putLogs(t, store, `{"level":"full","full_for_hours":1}`)
	id := viewerRequest(t, store, "rid-read", 200)
	body, _ := os.ReadFile(filepath.Join(store.root, id, "request.body"))
	code, raw, w := viewer(t, store, "read", `{"id":"`+id+`","name":"request.body","offset":2,"length":5}`)
	if code != 200 || !bytes.Equal(raw, body[2:7]) || w.Header().Get("X-Log-File-Size") != strconv.Itoa(len(body)) ||
		w.Header().Get("X-Log-Offset") != "2" || w.Header().Get("X-Log-Length") != "5" || w.Header().Get("Content-Type") != "application/octet-stream" {
		t.Fatal("chunk", code, string(raw), w.Header())
	}
	if code, raw, _ := viewer(t, store, "read", `{"id":"`+id+`","name":"request.body","offset":`+strconv.Itoa(len(body)-3)+`}`); code != 200 || !bytes.Equal(raw, body[len(body)-3:]) {
		t.Fatal("chunk to the end", code)
	}
	if code, raw, _ := viewer(t, store, "read", `{"id":"`+id+`","name":"request.body","download":true}`); code != 200 || !bytes.Equal(raw, body) {
		t.Fatal("download", code)
	}
	_ = os.WriteFile(filepath.Join(store.root, "secret.body"), []byte("outside"), 0600)
	symlinked := os.Symlink(filepath.Join(store.root, "secret.body"), filepath.Join(store.root, id, "linked.body")) == nil
	for body, want := range map[string]int{
		`{"id":"` + id + `","name":"metadata.json"}`:                           400, // summary files come with the detail
		`{"id":"` + id + `","name":"../secret.body"}`:                          400,
		`{"id":"` + id + `","name":"a/b"}`:                                     400,
		`{"id":"` + id + `","name":"missing.body"}`:                            404,
		`{"id":"` + id + `","name":"request.body","length":1048577}`:           400,
		`{"id":"` + id + `","name":"request.body","offset":-1}`:                400,
		`{"id":"` + id + `","name":"request.body","offset":99999999}`:          416,
		`{"id":"` + id + `","name":"request.body","offset":1,"download":true}`: 400,
		`{"id":"` + uuid() + `","name":"request.body"}`:                        404,
	} {
		if code, _, _ := viewer(t, store, "read", body); code != want {
			t.Fatalf("%s: %d, want %d", body, code, want)
		}
	}
	if symlinked {
		if code, _, _ := viewer(t, store, "read", `{"id":"`+id+`","name":"linked.body"}`); code != 404 {
			t.Fatal("a symlink was followed", code)
		}
	} else {
		t.Log("symlinks unavailable here; the symlink case runs on Linux")
	}
}

func TestRequestLogViewerFollowsLevelAndPruning(t *testing.T) {
	store, _ := newRequestLogStore(t.TempDir())
	putLogs(t, store, `{"level":"full","full_for_hours":1}`)
	id := viewerRequest(t, store, "rid-prune", 200)
	if _, state := putLogs(t, store, `{"clear_full":true}`); state["viewer"] != true {
		t.Fatal("description does not offer the viewer", state)
	}
	if got := listLogs(t, store, `{}`); len(got.Items) != 1 || got.Items[0].HasContent {
		t.Fatal("cleared content still listed", got)
	}
	if code, _, _ := viewer(t, store, "read", `{"id":"`+id+`","name":"request.body"}`); code != 404 {
		t.Fatal("cleared content readable", code)
	}
	_ = os.RemoveAll(filepath.Join(store.root, id))
	if got := listLogs(t, store, `{}`); len(got.Items) != 0 {
		t.Fatal("removed log listed", got)
	}
	viewerRequest(t, store, "rid-off", 200)
	putLogs(t, store, `{"level":"off"}`)
	if code, _, _ := viewer(t, store, "detail", `{"id":"`+id+`"}`); code != 409 {
		t.Fatal("detail while off", code)
	}
	if code, _, _ := viewer(t, store, "read", `{"id":"`+id+`","name":"request.body"}`); code != 409 {
		t.Fatal("read while off", code)
	}
	if code, raw, _ := viewer(t, store, "query", `{}`); code != 409 || !strings.Contains(string(raw), "request_logs_off") {
		t.Fatal("query while off", code)
	}
	putLogs(t, store, `{"level":"summary"}`)
	if got := listLogs(t, store, `{}`); len(got.Items) != 0 {
		t.Fatal("logs from before off listed", got)
	}
	w := httptest.NewRecorder()
	store.serveViewer(w, httptest.NewRequest("GET", "/admin/request-logs/query", nil), "query")
	if w.Code != 405 {
		t.Fatal("GET accepted", w.Code)
	}
}

func TestRequestLogPruneDropsIndexEntries(t *testing.T) {
	store, _ := newRequestLogStore(t.TempDir())
	id := viewerRequest(t, store, "rid-old", 200)
	listLogs(t, store, `{}`)
	meta := filepath.Join(store.root, id, "metadata.json")
	old := time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
	_ = os.Chtimes(meta, old, old)
	store.prune()
	if _, ok := store.index[id]; ok {
		t.Fatal("pruned request kept in the index")
	}
}

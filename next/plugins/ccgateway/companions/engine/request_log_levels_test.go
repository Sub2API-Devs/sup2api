package engine

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const privateMarker = "CCG_PRIVATE_LOG_MARKER"

// logRequest runs one request through a store and returns its log directory.
func logRequest(t *testing.T, store *requestLogStore) string {
	t.Helper()
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	r.Header.Set("X-Api-Key", "secret")
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r, "")
	d.request([]byte(`{"model":"m","messages":[{"role":"user","content":"`+privateMarker+`"}]}`), r.Header)
	d.save("build-components.json", []byte(privateMarker))
	d.appendTrace("cli-stdout.jsonl", []byte(privateMarker))
	d.traceContent("web_search_output", Object{"text": privateMarker}, Object{"bytes": 1})
	d.trace("cli_error", Object{"message": strings.Repeat("e", 300)})
	_, _ = out.Write([]byte(privateMarker))
	d.finish()
	return d.directory
}

func putLogs(t *testing.T, store *requestLogStore, body string) (int, Object) {
	t.Helper()
	w := httptest.NewRecorder()
	store.serve(w, httptest.NewRequest("PUT", "/admin/request-logs", strings.NewReader(body)))
	var out Object
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestRequestLogLevelDefaultsAndLegacyMarker(t *testing.T) {
	root := t.TempDir()
	store, err := newRequestLogStore(root)
	if err != nil || store.level != logLevelSummary || !store.enabled {
		t.Fatal("a new account must log the summary", store, err)
	}
	legacy := t.TempDir()
	_ = os.WriteFile(filepath.Join(legacy, requestLogDisabledMarker), []byte("disabled"), 0600)
	if store, err := newRequestLogStore(legacy); err != nil || store.level != logLevelOff || store.enabled {
		t.Fatal("an older Worker's disable must stay off", err)
	}
	until := time.Now().Add(time.Hour).UTC()
	saved, _ := json.Marshal(requestLogState{Level: logLevelFull, FullUntil: &until})
	_ = os.WriteFile(filepath.Join(root, requestLogStateFile), saved, 0600)
	if store, err := newRequestLogStore(root); err != nil || store.level != logLevelFull || !store.fullUntil.Equal(until) {
		t.Fatal("the full level and its end must survive a restart", err)
	}
}

// The summary keeps what a request looked like and none of its content.
func TestSummaryLevelKeepsNoContent(t *testing.T) {
	root := t.TempDir()
	store, _ := newRequestLogStore(root)
	dir := logRequest(t, store)
	entries, _ := os.ReadDir(dir)
	names := []string{}
	for _, entry := range entries {
		names = append(names, entry.Name())
		data, _ := os.ReadFile(filepath.Join(dir, entry.Name()))
		if strings.Contains(string(data), privateMarker) {
			t.Fatalf("summary kept content in %s", entry.Name())
		}
		if strings.Contains(string(data), "secret") {
			t.Fatalf("summary kept a credential in %s", entry.Name())
		}
	}
	for _, name := range names {
		if !summaryFiles[name] {
			t.Fatalf("summary wrote %s (%v)", name, names)
		}
	}
	for _, name := range []string{"metadata.json", "events.jsonl", "request-headers.json"} {
		if _, err := os.Stat(filepath.Join(dir, name)); err != nil {
			t.Fatalf("summary lost %s", name)
		}
	}
	events, _ := os.ReadFile(filepath.Join(dir, "events.jsonl"))
	if !strings.Contains(string(events), `"web_search_output","detail":{"bytes":1}`) && !strings.Contains(string(events), `"detail":{"bytes":1},"event":"web_search_output"`) {
		t.Fatal("content event lost its shape", string(events))
	}
	if strings.Contains(string(events), strings.Repeat("e", 257)) || !strings.Contains(string(events), strings.Repeat("e", 256)) {
		t.Fatal("event text not bounded to 256 bytes")
	}
	var metadata Object
	raw, _ := os.ReadFile(filepath.Join(dir, "metadata.json"))
	if json.Unmarshal(raw, &metadata) != nil || metadata["log_level"] != logLevelSummary || metadata["message_count"] != float64(1) {
		t.Fatal("summary metadata", string(raw))
	}
}

// Full keeps content for the chosen hours, then the summary applies again.
func TestFullLevelExpiresToSummary(t *testing.T) {
	root := t.TempDir()
	store, _ := newRequestLogStore(root)
	now := time.Now()
	store.now = func() time.Time { return now }
	code, state := putLogs(t, store, `{"level":"full","full_for_hours":4}`)
	if code != 200 || state["level"] != logLevelFull || state["full_until"] != now.Add(4*time.Hour).UTC().Format(time.RFC3339) {
		t.Fatal(code, state)
	}
	dir := logRequest(t, store)
	if body, err := os.ReadFile(filepath.Join(dir, "request.body")); err != nil || !strings.Contains(string(body), privateMarker) {
		t.Fatal("full level lost the request body", err)
	}
	if body, _ := os.ReadFile(filepath.Join(dir, "response.body")); string(body) != privateMarker {
		t.Fatal("full level lost the response body")
	}
	events, _ := os.ReadFile(filepath.Join(dir, "events.jsonl"))
	if !strings.Contains(string(events), privateMarker) || !strings.Contains(string(events), strings.Repeat("e", 300)) {
		t.Fatal("full level cut its events")
	}
	now = now.Add(4*time.Hour + time.Second)
	dir = logRequest(t, store)
	if _, err := os.Stat(filepath.Join(dir, "request.body")); !os.IsNotExist(err) {
		t.Fatal("full level outlived its time")
	}
	if reloaded, _ := newRequestLogStore(root); reloaded.level != logLevelSummary {
		t.Fatal("the end of the full level was not saved", reloaded.level)
	}
}

func TestRequestLogChangesAreValidated(t *testing.T) {
	store, _ := newRequestLogStore(t.TempDir())
	for _, body := range []string{`{}`, `{"level":"full"}`, `{"level":"full","full_for_hours":2}`, `{"level":"summary","full_for_hours":1}`,
		`{"level":"verbose"}`, `{"level":"off","enabled":false}`, `{"clear_full":false}`, `{"enabled":null}`, `{"enabled":"yes"}`, `[]`} {
		if code, _ := putLogs(t, store, body); code != 400 {
			t.Fatalf("%s accepted", body)
		}
	}
	if code, state := putLogs(t, store, `{"enabled":true}`); code != 200 || state["level"] != logLevelSummary || state["enabled"] != true {
		t.Fatal("an older core's on must be the summary", state)
	}
	if code, state := putLogs(t, store, `{"enabled":false}`); code != 200 || state["level"] != logLevelOff || state["enabled"] != false {
		t.Fatal("an older core's off", state)
	}
}

// Clearing removes content and keeps every summary; the description reports
// each level's limits and what the logs hold.
func TestClearFullKeepsSummariesAndDescribeReportsUsage(t *testing.T) {
	root := t.TempDir()
	store, _ := newRequestLogStore(root)
	putLogs(t, store, `{"level":"full","full_for_hours":1}`)
	dir := logRequest(t, store)
	code, state := putLogs(t, store, `{"clear_full":true}`)
	if code != 200 {
		t.Fatal(code)
	}
	if _, err := os.Stat(filepath.Join(dir, "request.body")); !os.IsNotExist(err) {
		t.Fatal("content survived clearing")
	}
	if _, err := os.Stat(filepath.Join(dir, "metadata.json")); err != nil {
		t.Fatal("clearing removed the summary")
	}
	usage, _ := state["usage"].(map[string]any)
	limits, _ := state["limits"].(map[string]any)
	summary, _ := limits[logLevelSummary].(map[string]any)
	if usage["full_bytes"] != float64(0) || usage["requests"] != float64(1) || usage["summary_bytes"].(float64) <= 0 ||
		summary["retention_hours"] != float64(168) || summary["storage_budget_bytes"] != float64(128<<20) || summary["per_request_limit_bytes"] != float64(256<<10) ||
		state["retention_hours"] != float64(24) || state["level"] != logLevelFull {
		t.Fatal("description", state)
	}
}

// Content gives way to its own budget first; summaries to theirs.
func TestRequestLogBudgetsByLevel(t *testing.T) {
	root := t.TempDir()
	write := func(age time.Duration, content int) string {
		dir := filepath.Join(root, uuid())
		_ = os.Mkdir(dir, 0700)
		meta := filepath.Join(dir, "metadata.json")
		_ = os.WriteFile(filepath.Join(dir, "response.body"), make([]byte, content), 0600)
		_ = os.WriteFile(meta, []byte("{}"), 0600)
		when := time.Now().Add(-age)
		_ = os.Chtimes(meta, when, when)
		return dir
	}
	oldest := write(3*time.Hour, fullBudget/2+1)
	newest := write(time.Hour, fullBudget/2+1)
	pruneRequestLogs(root)
	if _, err := os.Stat(filepath.Join(oldest, "response.body")); !os.IsNotExist(err) {
		t.Fatal("the oldest content did not give way")
	}
	if _, err := os.Stat(filepath.Join(oldest, "metadata.json")); err != nil {
		t.Fatal("a content budget removed a summary")
	}
	if _, err := os.Stat(filepath.Join(newest, "response.body")); err != nil {
		t.Fatal("content within budget removed")
	}
}

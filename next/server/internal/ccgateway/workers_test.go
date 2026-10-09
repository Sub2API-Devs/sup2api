package ccgateway

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeWorkers is a controller answering GET /accounts and POST
// /accounts/<key>/worker (§53.7) with a canned answer per key.
type fakeWorkers struct {
	mu        sync.Mutex
	keys      []string
	answers   map[string]string // "<status code> <body>"; default updated
	slow      map[string]time.Duration
	listCode  int
	outdated  bool     // /health without the worker-update feature
	calls     []string // "<key> <image>" in call order
	active    int
	maxActive int
}

var workerPath = regexp.MustCompile(`^/accounts/([^/]+)/worker$`)

func (c *fakeWorkers) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Authorization") != "Bearer controller-secret" {
		w.WriteHeader(401)
		return
	}
	if r.Method == "GET" && r.URL.Path == "/health" {
		features := []string{"tunnel", "uploads", "runtime-images", "self-upgrade", "worker-update"}
		if c.outdated {
			features = features[:4]
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"version": "v1", "features": features})
		return
	}
	if r.Method == "GET" && r.URL.Path == "/accounts" {
		c.mu.Lock()
		defer c.mu.Unlock()
		if c.listCode != 0 {
			w.WriteHeader(c.listCode)
			return
		}
		list := []map[string]string{}
		for _, k := range c.keys {
			list = append(list, map[string]string{"key": k, "status": "ready", "created_at": "2026-10-09T00:00:00Z"})
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"runtimes": list})
		return
	}
	m := workerPath.FindStringSubmatch(r.URL.Path)
	if m == nil || r.Method != "POST" {
		w.WriteHeader(404)
		_, _ = w.Write([]byte(`{"error":"not_found"}`))
		return
	}
	var in struct {
		Image string `json:"image"`
	}
	_ = json.NewDecoder(r.Body).Decode(&in)
	c.mu.Lock()
	c.calls = append(c.calls, m[1]+" "+in.Image)
	c.active++
	if c.active > c.maxActive {
		c.maxActive = c.active
	}
	answer, delay := c.answers[m[1]], c.slow[m[1]]
	c.mu.Unlock()
	defer func() {
		c.mu.Lock()
		c.active--
		c.mu.Unlock()
	}()
	time.Sleep(20*time.Millisecond + delay)
	if answer == "" {
		answer = `200 {"status":"updated","previous_sha256":"` + strings.Repeat("a", 64) + `","sha256":"` + strings.Repeat("b", 64) + `","path":"/usr/local/bin/worker","online":true}`
	}
	code, body, _ := strings.Cut(answer, " ")
	switch code {
	case "200":
	case "404":
		w.WriteHeader(404)
	case "409":
		w.WriteHeader(409)
	case "502":
		w.WriteHeader(502)
	default:
		w.WriteHeader(503)
	}
	_, _ = w.Write([]byte(body))
}

func (c *fakeWorkers) seen() ([]string, int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return append([]string(nil), c.calls...), c.maxActive
}

func workerResults(t *testing.T, out map[string]any) map[string]map[string]any {
	t.Helper()
	list, _ := data(out)["results"].([]any)
	byKey := map[string]map[string]any{}
	for _, item := range list {
		r, _ := item.(map[string]any)
		key, _ := r["key"].(string)
		byKey[key] = r
	}
	return byKey
}

func TestRuntimeWorkersUpdatesEachRuntimeInTurn(t *testing.T) {
	ctl := &fakeWorkers{answers: map[string]string{}, slow: map[string]time.Duration{}}
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	admin := f.user("admin@x")
	ctx := context.Background()
	adopted, unadopted := "d00000000000000a1", "d00000000000000b2"
	owner := f.account(true)
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key, proxy_id, account_id) VALUES($1, $2, $3)`, adopted, f.proxy(nil), owner); err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key, proxy_id) VALUES($1, $2)`, unadopted, f.proxy(nil)); err != nil {
		t.Fatal(err)
	}
	ctl.keys = []string{"21", "22", "23", "24", "25", "26", "27", "28", "29", adopted, unadopted, "../etc", "21"}
	ctl.answers["22"] = `200 {"status":"unchanged","sha256":"` + strings.Repeat("c", 64) + `"}`
	ctl.answers["23"] = `200 {"status":"busy"}`
	ctl.answers["24"] = `200 {"status":"not_running"}`
	ctl.answers["25"] = `200 {"status":"rolled_back","reason":"unhealthy","sha256":"not a sha"}`
	ctl.answers["26"] = `409 {"error":"unsupported_container"}`
	ctl.answers["27"] = `502 <html>bad gateway</html>`
	ctl.answers["28"] = `200 {"status":"exploded"}`
	ctl.answers["29"] = `404 {"error":"not_found"}`
	ctl.answers[unadopted] = `200 {"status":"unchanged","sha256":"` + strings.Repeat("c", 64) + `"}`

	code, out := f.request(admin, "POST", "/system/ccgateway/runtime/workers", `{}`)
	if code != 200 || data(out)["image"] != AppImage {
		t.Fatalf("workers: %d %v", code, out)
	}
	calls, maxActive := ctl.seen()
	want := []string{"21", "22", "23", "24", "25", "26", "27", "28", "29", adopted, unadopted}
	if len(calls) != len(want) || maxActive != 1 {
		t.Fatalf("calls %v (at most %d at once)", calls, maxActive)
	}
	for i, k := range want {
		if calls[i] != k+" "+AppImage {
			t.Fatalf("call %d: %q, want %q", i, calls[i], k+" "+AppImage)
		}
	}
	results := workerResults(t, out)
	if len(results) != len(want) {
		t.Fatalf("results: %v", data(out)["results"])
	}
	check := func(key, status, reason, sha, prev string, account any) {
		t.Helper()
		r := results[key]
		if r["status"] != status || r["account_id"] != account || r["sha256"] != nilIfEmpty(sha) || r["previous_sha256"] != nilIfEmpty(prev) ||
			r["reason"] != nilIfEmpty(reason) {
			t.Errorf("%s: %v", key, r)
		}
	}
	check("21", "updated", "", strings.Repeat("b", 64), strings.Repeat("a", 64), float64(21))
	check("22", "unchanged", "", strings.Repeat("c", 64), "", float64(22))
	check("23", "busy", "", "", "", float64(23))
	check("24", "not_running", "", "", "", float64(24))
	check("25", "rolled_back", "unhealthy", "", "", float64(25))
	check("26", "failed", "unsupported_container", "", "", float64(26))
	check("27", "failed", "unreachable", "", "", float64(27))
	check("28", "failed", "invalid_response", "", "", float64(28))
	check("29", "failed", "not_found", "", "", float64(29))
	check(adopted, "updated", "", strings.Repeat("b", 64), strings.Repeat("a", 64), float64(owner))
	check(unadopted, "unchanged", "", strings.Repeat("c", 64), "", nil)
	var n int
	_ = f.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action='ccgateway.runtime.workers'
	  AND detail->>'image'=$1 AND (detail->'statuses'->>'failed')::int=4`, AppImage).Scan(&n)
	if n != 1 {
		t.Fatalf("audit rows: %d", n)
	}
}

func nilIfEmpty(v string) any {
	if v == "" {
		return nil
	}
	return v
}

func TestRuntimeWorkersRequestsAndRefusals(t *testing.T) {
	ctl := &fakeWorkers{answers: map[string]string{}, slow: map[string]time.Duration{}, keys: []string{"21"}}
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	admin := f.user("admin@x")
	path := "/system/ccgateway/runtime/workers"
	// Explicit image, and no body at all (the effective app image).
	if code, out := f.request(admin, "POST", path, `{"image":"ccgateway:22cfdb5"}`); code != 200 || data(out)["image"] != "ccgateway:22cfdb5" {
		t.Fatalf("explicit image: %d %v", code, out)
	}
	f.writeConfig(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret", Images: &RuntimeImages{App: "ccgateway:configured"}})
	if code, out := f.request(admin, "POST", path, ``); code != 200 || data(out)["image"] != "ccgateway:configured" {
		t.Fatalf("default image: %d %v", code, out)
	}
	if calls, _ := ctl.seen(); strings.Join(calls, ",") != "21 ccgateway:22cfdb5,21 ccgateway:configured" {
		t.Fatalf("calls: %v", calls)
	}
	// Refusals reach no controller.
	for name, tc := range map[string]struct {
		body   string
		code   int
		reason string
	}{
		"invalid image":    {`{"image":"ccgateway:tag;rm -rf /"}`, 400, "invalid_image"},
		"image with space": {`{"image":"ccgateway tag"}`, 400, "invalid_image"},
		"not json":         {`{"image":`, 400, "invalid_request"},
		"wrong type":       {`{"image":7}`, 400, "invalid_request"},
	} {
		if code, out := f.request(admin, "POST", path, tc.body); code != tc.code || reason(out) != tc.reason {
			t.Errorf("%s: %d %v", name, code, out)
		}
	}
	f.s.installMu.Lock()
	code, out := f.request(admin, "POST", path, `{}`)
	f.s.installMu.Unlock()
	if code != 409 || reason(out) != "install_in_progress" {
		t.Fatalf("during an install: %d %v", code, out)
	}
	f.auth.keys[2] = []string{"settings:read"}
	if code, _ = f.request(2, "POST", path, `{}`); code != 403 {
		t.Fatalf("settings:read only: %d", code)
	}
	if calls, _ := ctl.seen(); len(calls) != 2 {
		t.Fatalf("refused requests reached the controller: %v", calls)
	}
	// The controller cannot list its runtimes.
	ctl.mu.Lock()
	ctl.listCode = 503
	ctl.mu.Unlock()
	if code, out = f.request(admin, "POST", path, `{}`); code != 503 || reason(out) != "controller_unhealthy" {
		t.Fatalf("listing failed: %d %v", code, out)
	}
	f.runtimes(false)
	if code, out = f.request(admin, "POST", path, `{}`); code != 400 || reason(out) != "runtimes_disabled" {
		t.Fatalf("runtimes off: %d %v", code, out)
	}
	f.writeConfig(Config{Mode: "disabled"})
	if code, out = f.request(admin, "POST", path, `{}`); code != 400 || reason(out) != "ssh_not_configured" {
		t.Fatalf("disabled: %d %v", code, out)
	}
}

func TestRuntimeWorkersTimeoutDoesNotStopTheOthers(t *testing.T) {
	ctl := &fakeWorkers{answers: map[string]string{}, slow: map[string]time.Duration{"22": 2 * time.Second}, keys: []string{"21", "22", "23"}}
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	admin := f.user("admin@x")
	workerLimit = 300 * time.Millisecond
	t.Cleanup(func() { workerLimit = 5 * time.Minute })
	code, out := f.request(admin, "POST", "/system/ccgateway/runtime/workers", `{}`)
	results := workerResults(t, out)
	if code != 200 || results["21"]["status"] != "updated" || results["22"]["status"] != "failed" || results["22"]["reason"] != "timeout" ||
		results["23"]["status"] != "updated" {
		t.Fatalf("workers: %d %v", code, out)
	}
	// The whole run has its own limit: what is left is not attempted.
	workerLimit = 5 * time.Minute
	workersLimit = 200 * time.Millisecond
	t.Cleanup(func() { workersLimit = 25 * time.Minute })
	ctl.mu.Lock()
	ctl.slow = map[string]time.Duration{"21": 400 * time.Millisecond}
	ctl.calls = nil
	ctl.mu.Unlock()
	code, out = f.request(admin, "POST", "/system/ccgateway/runtime/workers", `{}`)
	results = workerResults(t, out)
	if calls, _ := ctl.seen(); code != 200 || len(calls) != 1 || results["21"]["reason"] != "timeout" || results["23"]["reason"] != "timeout" {
		t.Fatalf("overall limit: %d %v %v", code, out, calls)
	}
}

func TestRuntimeWorkersOverSSH(t *testing.T) {
	ctl := &fakeWorkers{answers: map[string]string{}, slow: map[string]time.Duration{}, keys: []string{"21"}}
	f := newRuntimeFixture(t, newFakeController(t).ServeHTTP)
	admin := f.user("admin@x")
	srv := httptest.NewServer(ctl)
	t.Cleanup(srv.Close)
	var modes []string
	f.s.openController = func(_ context.Context, c Config) (*http.Client, string, func() error, error) {
		modes = append(modes, c.Mode)
		return srv.Client(), srv.URL, func() error { return nil }, nil
	}
	cfg := sshConfig
	cfg.AdminKey = "controller-secret"
	f.writeConfig(cfg)
	code, out := f.request(admin, "POST", "/system/ccgateway/runtime/workers", `{}`)
	if r := workerResults(t, out)["21"]; code != 200 || r["status"] != "updated" || len(modes) == 0 || modes[0] != "ssh" {
		t.Fatalf("ssh: %d %v %v", code, out, modes)
	}
	// A controller without the feature answers 503 controller_outdated
	// before any container is touched.
	ctl.outdated = true
	before, _ := ctl.seen()
	code, out = f.request(admin, "POST", "/system/ccgateway/runtime/workers", `{}`)
	after, _ := ctl.seen()
	if code != 503 || reason(out) != "controller_outdated" || len(after) != len(before) {
		t.Fatalf("outdated: %d %v", code, out)
	}
}

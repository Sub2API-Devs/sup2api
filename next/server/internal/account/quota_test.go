package account

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// ---------------------------------------------------------------- unit tests (no database)

func tp(t time.Time) *time.Time { return &t }

func TestQuotaView(t *testing.T) {
	now := time.Date(2026, 10, 5, 12, 0, 0, 0, time.UTC)
	decl := &manifest.AccountQuota{Headers: []manifest.QuotaHeader{{Key: "zz", Status: "x"}, {Key: "5h", Status: "y"}}}
	if v := quotaView(decl, nil, now); !v.Supported || v.Source != "" || v.UpdatedAt != nil || v.Windows == nil || len(v.Windows) != 0 {
		t.Fatalf("no snapshot: %+v", v)
	}
	// A row created by a query claim has no data yet.
	if v := quotaView(decl, &store.QuotaSnapshot{Source: "", Error: "transient: 503", Windows: map[string]store.QuotaWindow{}}, now); v.Source != "" || v.Error != "transient: 503" {
		t.Fatalf("claim-only row: %+v", v)
	}
	snap := &store.QuotaSnapshot{Source: store.QuotaPassive, UpdatedAt: tp(now.Add(-time.Minute)), Windows: map[string]store.QuotaWindow{
		"aa":       {Utilization: 1},
		"zz":       {Utilization: 2},
		"7d_fable": {Utilization: 3, ResetsAt: tp(now.Add(time.Hour)), Status: "allowed"},
		"7d":       {Utilization: 99, ResetsAt: tp(now.Add(-time.Second)), Status: "rejected", Used: 5, Limit: 10},
		"5h":       {Utilization: 42, ResetsAt: tp(now.Add(time.Hour)), Status: "allowed_warning"},
	}}
	v := quotaView(decl, snap, now)
	var keys []string
	for _, w := range v.Windows {
		keys = append(keys, w.Key)
	}
	// Known keys first, then the declaration order, then the alphabet.
	if fmt.Sprint(keys) != "[5h 7d 7d_fable zz aa]" {
		t.Fatalf("order: %v", keys)
	}
	if w := v.Windows[1]; w.Utilization != 0 || w.ResetsAt != nil || w.Status != "" || w.Used != 0 || w.Limit != 10 {
		t.Fatalf("expired window is not shown as reset: %+v", w)
	}
	if w := v.Windows[0]; w.Utilization != 42 || w.Status != "allowed_warning" || !w.ResetsAt.Equal(now.Add(time.Hour)) {
		t.Fatalf("5h: %+v", w)
	}
	raw, _ := json.Marshal(v)
	var back map[string]any
	_ = json.Unmarshal(raw, &back)
	for _, f := range []string{"supported", "source", "updated_at", "error", "windows"} {
		if _, ok := back[f]; !ok {
			t.Fatalf("field %s missing: %s", f, raw)
		}
	}
	w0 := back["windows"].([]any)[1].(map[string]any)
	if _, ok := w0["resets_at"]; !ok || w0["resets_at"] != nil || w0["status"] != "" {
		t.Fatalf("window json: %s", raw)
	}
}

func TestShouldQueryQuota(t *testing.T) {
	now := time.Now()
	ago := func(d time.Duration) *time.Time { return tp(now.Add(-d)) }
	cases := []struct {
		name  string
		snap  *store.QuotaSnapshot
		force bool
		want  bool
	}{
		{"no snapshot", nil, false, true},
		{"fresh passive", &store.QuotaSnapshot{UpdatedAt: ago(time.Minute)}, false, false},
		{"fresh passive, forced", &store.QuotaSnapshot{UpdatedAt: ago(time.Minute)}, true, true},
		{"stale", &store.QuotaSnapshot{UpdatedAt: ago(4 * time.Minute)}, false, true},
		{"floor", &store.QuotaSnapshot{UpdatedAt: ago(4 * time.Minute), LastActiveAt: ago(10 * time.Second)}, false, false},
		{"floor, forced", &store.QuotaSnapshot{UpdatedAt: ago(time.Minute), LastActiveAt: ago(10 * time.Second)}, true, false},
		{"after floor, forced", &store.QuotaSnapshot{UpdatedAt: ago(time.Minute), LastActiveAt: ago(31 * time.Second)}, true, true},
		{"negative cache", &store.QuotaSnapshot{Error: "x", UpdatedAt: ago(10 * time.Minute), LastActiveAt: ago(40 * time.Second)}, false, false},
		{"negative cache, forced", &store.QuotaSnapshot{Error: "x", UpdatedAt: ago(10 * time.Minute), LastActiveAt: ago(40 * time.Second)}, true, true},
		{"negative cache expired", &store.QuotaSnapshot{Error: "x", LastActiveAt: ago(61 * time.Second)}, false, true},
	}
	for _, c := range cases {
		if got := shouldQueryQuota(c.snap, c.force, now); got != c.want {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}

type savedQuota struct {
	id int64
	w  map[string]store.QuotaWindow
}

func recorderForTest() (*quotaRecorder, *[]savedQuota, *sync.Mutex) {
	var mu sync.Mutex
	var saved []savedQuota
	r := newQuotaRecorder(func(_ context.Context, id int64, w map[string]store.QuotaWindow) error {
		mu.Lock()
		saved = append(saved, savedQuota{id, w})
		mu.Unlock()
		return nil
	})
	return r, &saved, &mu
}

func TestQuotaRecorderThrottle(t *testing.T) {
	r, saved, _ := recorderForTest()
	t0 := time.Now()
	r.observe(1, map[string]store.QuotaWindow{"5h": {Utilization: 10, Status: "allowed"}}, t0)
	// The first sample is due at once.
	if got := r.take(t0, false); len(got) != 1 || got[1]["5h"].Utilization != 10 {
		t.Fatalf("first take: %v", got)
	}
	// Samples within the interval are merged, not written...
	r.observe(1, map[string]store.QuotaWindow{"5h": {Utilization: 11, Status: "allowed"}}, t0.Add(time.Second))
	r.observe(1, map[string]store.QuotaWindow{"7d": {Utilization: 3, Status: "allowed"}}, t0.Add(2*time.Second))
	r.observe(1, map[string]store.QuotaWindow{"5h": {Utilization: 12, Status: "allowed"}}, t0.Add(3*time.Second))
	if got := r.take(t0.Add(3*time.Second), false); len(got) != 0 {
		t.Fatalf("throttled take: %v", got)
	}
	// ...until the interval has passed: the last value of each window wins.
	got := r.take(t0.Add(quotaPassiveInterval+time.Second), false)
	if len(got) != 1 || got[1]["5h"].Utilization != 12 || got[1]["7d"].Utilization != 3 {
		t.Fatalf("trailing take: %v", got)
	}
	// A status change is written at once.
	t1 := t0.Add(quotaPassiveInterval + 2*time.Second)
	r.observe(1, map[string]store.QuotaWindow{"5h": {Utilization: 100, Status: "rejected"}}, t1)
	if got := r.take(t1, false); len(got) != 1 || got[1]["5h"].Status != "rejected" {
		t.Fatalf("status change take: %v", got)
	}
	// Shutdown writes what is pending regardless of the interval.
	r.observe(1, map[string]store.QuotaWindow{"5h": {Utilization: 100, Status: "rejected"}}, t1.Add(time.Second))
	r.flush(context.Background(), true)
	if len(*saved) != 1 || (*saved)[0].w["5h"].Utilization != 100 {
		t.Fatalf("flush all: %v", *saved)
	}
	// Idle accounts are forgotten.
	r.take(t1.Add(quotaIdle+time.Minute), false)
	if len(r.entries) != 0 {
		t.Fatalf("idle entry kept: %v", r.entries)
	}
}

// The writer goroutine picks up a due sample through the kick channel.
func TestQuotaRecorderRun(t *testing.T) {
	r, saved, mu := recorderForTest()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { r.run(ctx); close(done) }()
	r.observe(7, map[string]store.QuotaWindow{"5h": {Utilization: 1}}, time.Now())
	deadline := time.Now().Add(3 * time.Second)
	for {
		mu.Lock()
		n := len(*saved)
		mu.Unlock()
		if n == 1 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("sample not written")
		}
		time.Sleep(10 * time.Millisecond)
	}
	cancel()
	<-done
}

func TestObserveQuotaHeaders(t *testing.T) {
	s := New(Deps{})
	var saved *[]savedQuota
	s.quota, saved, _ = recorderForTest()
	decls := []manifest.QuotaHeader{{Key: "5h", Utilization: "anthropic-ratelimit-unified-5h-utilization",
		Reset: "anthropic-ratelimit-unified-5h-reset", Status: "anthropic-ratelimit-unified-5h-status"}}
	reset := time.Now().Add(time.Hour).Unix()
	h := http.Header{}
	h.Set("anthropic-ratelimit-unified-5h-utilization", "0.25")
	h.Set("anthropic-ratelimit-unified-5h-reset", strconv.FormatInt(reset, 10))
	h.Set("anthropic-ratelimit-unified-5h-status", "allowed")
	for id, status := range map[int64]int{1: 200, 2: 429, 3: 500, 4: 401, 5: 101} {
		s.ObserveQuotaHeaders(id, decls, status, h)
	}
	s.ObserveQuotaHeaders(6, nil, 200, h)
	s.ObserveQuotaHeaders(7, decls, 200, http.Header{})
	s.quota.flush(context.Background(), true)
	ids := map[int64]store.QuotaWindow{}
	for _, sv := range *saved {
		ids[sv.id] = sv.w["5h"]
	}
	if len(ids) != 3 || ids[1].Utilization != 25 || ids[2].ResetsAt.Unix() != reset || ids[5].Status != "allowed" {
		t.Fatalf("observed: %+v", ids)
	}
}

func TestValidQuotaKey(t *testing.T) {
	for k, want := range map[string]bool{"5h": true, "7d_fable": true, "": false, "_a": false, "A": false, "a-b": false,
		"abcdefghijabcdefghijabcdefghij12": true, "abcdefghijabcdefghijabcdefghij123": false} {
		if validQuotaKey(k) != want {
			t.Errorf("validQuotaKey(%q) = %v", k, !want)
		}
	}
}

// ---------------------------------------------------------------- API (database)

// quotaUpstream answers GET /quota with the 5h utilization in pct, or
// failStatus when set, and counts the calls.
type quotaUpstream struct {
	srv        *httptest.Server
	calls      atomic.Int32
	pct        atomic.Int64
	failStatus atomic.Int32
}

func newQuotaUpstream(t *testing.T) *quotaUpstream {
	u := &quotaUpstream{}
	u.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u.calls.Add(1)
		if s := u.failStatus.Load(); s != 0 {
			w.WriteHeader(int(s))
			return
		}
		fmt.Fprintf(w, `{"5h": %d, "reset": %d}`, u.pct.Load(), time.Now().Add(time.Hour).Unix())
	}))
	t.Cleanup(u.srv.Close)
	return u
}

// withQuota declares quota on the anthropic/apikey type of the harness.
func (e *env) withQuota(q *manifest.AccountQuota) {
	e.gen.types[0].Type.Quota = q
}

func TestAccountQuotaAPI(t *testing.T) {
	e := setup(t)
	up := newQuotaUpstream(t)
	e.plat.quotaURL = up.srv.URL + "/quota"
	up.pct.Store(40)
	id := e.mkRawAccount("anthropic", "apikey", "sub", "sk-good-key-123", true)
	relay := e.mkRawAccount("relay", "relay_key", "relay", "sk-good-key-123", true)
	path := fmt.Sprintf("/accounts/%d/quota", id)

	// A type without quota: not supported, nothing asked, quota null in lists.
	code, out := e.do("GET", path, nil)
	if d := out["data"].(map[string]any); code != 200 || d["supported"] != false || up.calls.Load() != 0 {
		t.Fatalf("unsupported: %d %v", code, out)
	}
	e.withQuota(&manifest.AccountQuota{Query: true, Headers: []manifest.QuotaHeader{{Key: "5h", Status: "x-status"}}})

	// First read queries once; the fresh snapshot is served afterwards.
	code, out = e.do("GET", path, nil)
	d := out["data"].(map[string]any)
	if code != 200 || d["supported"] != true || d["source"] != "active" || up.calls.Load() != 1 {
		t.Fatalf("first: %d %v (calls %d)", code, out, up.calls.Load())
	}
	if w := d["windows"].([]any)[0].(map[string]any); w["key"] != "5h" || w["utilization"].(float64) != 40 || w["status"] != "allowed" {
		t.Fatalf("window: %v", w)
	}
	e.do("GET", path, nil)
	if up.calls.Load() != 1 {
		t.Fatalf("fresh snapshot queried again: %d", up.calls.Load())
	}
	// force inside the 30-second floor is still refused.
	e.do("GET", path+"?force=true", nil)
	if up.calls.Load() != 1 {
		t.Fatalf("forced inside the floor: %d", up.calls.Load())
	}
	// Past the floor, force queries; concurrent callers share one query.
	ctx := context.Background()
	if _, err := e.db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET last_active_at = now() - interval '31 seconds'`); err != nil {
		t.Fatal(err)
	}
	up.pct.Store(55)
	var wg sync.WaitGroup
	for range 5 {
		wg.Add(1)
		go func() { defer wg.Done(); e.do("GET", path+"?force=true", nil) }()
	}
	wg.Wait()
	if up.calls.Load() != 2 {
		t.Fatalf("concurrent forced reads: %d upstream calls, want 2", up.calls.Load())
	}

	// A failure is recorded and negatively cached for a minute.
	up.failStatus.Store(503)
	if _, err := e.db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET last_active_at = now() - interval '5 minutes',
		updated_at = now() - interval '5 minutes'`); err != nil {
		t.Fatal(err)
	}
	_, out = e.do("GET", path, nil)
	d = out["data"].(map[string]any)
	if up.calls.Load() != 3 || d["error"] == "" || d["windows"].([]any)[0].(map[string]any)["utilization"].(float64) != 55 {
		t.Fatalf("failure: %v (calls %d)", out, up.calls.Load())
	}
	if _, err := e.db.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET last_active_at = now() - interval '40 seconds'`); err != nil {
		t.Fatal(err)
	}
	e.do("GET", path, nil)
	if up.calls.Load() != 3 {
		t.Fatalf("negative cache ignored: %d", up.calls.Load())
	}

	// The list carries the stored snapshot without asking the upstream, and
	// null for types without quota.
	code, out = e.do("GET", "/accounts?orphaned=all", nil)
	if code != 200 {
		t.Fatalf("list: %d %v", code, out)
	}
	for _, it := range out["data"].([]any) {
		a := it.(map[string]any)
		switch int64(a["id"].(float64)) {
		case id:
			if q := a["quota"].(map[string]any); q["supported"] != true || q["error"] == "" {
				t.Fatalf("list quota: %v", q)
			}
		case relay:
			if a["quota"] != nil {
				t.Fatalf("relay quota: %v", a["quota"])
			}
		}
	}
	if up.calls.Load() != 3 {
		t.Fatalf("list asked the upstream: %d", up.calls.Load())
	}

	// A passive sample clears the error and becomes the source.
	h := http.Header{}
	h.Set("x-status", "rejected")
	e.svc.ObserveQuotaHeaders(id, e.gen.types[0].Type.Quota.Headers, 429, h)
	e.svc.quota.flush(ctx, true)
	_, out = e.do("GET", path, nil)
	d = out["data"].(map[string]any)
	if d["source"] != "passive" || d["error"] != "" || d["windows"].([]any)[0].(map[string]any)["status"] != "rejected" {
		t.Fatalf("passive: %v", out)
	}
}

func TestAccountResetStatus(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	id := e.mkRawAccount("anthropic", "apikey", "a", "sk-good-key-123", true)
	if err := e.svc.SetCooldown(ctx, id, time.Now().Add(time.Hour), "429"); err != nil {
		t.Fatal(err)
	}
	statusEvents := func() int {
		n := 0
		for _, ev := range e.eventTypes() {
			if ev == "account.status_changed" {
				n++
			}
		}
		return n
	}
	before, beforeEvents := e.bus.count(), statusEvents()
	code, out := e.do("POST", fmt.Sprintf("/accounts/%d/reset-status", id), nil)
	if code != 200 || out["data"].(map[string]any)["cooldown_until"] != nil {
		t.Fatalf("reset: %d %v", code, out)
	}
	if e.mr.Exists(cooldownKey(id)) {
		t.Fatal("cooldown key kept")
	}
	if e.bus.count() == before {
		t.Fatal("account:changed not broadcast")
	}
	if statusEvents() != beforeEvents+1 {
		t.Fatalf("events: %v", e.eventTypes())
	}
	rows := e.auditRows("account.reset_status")
	if len(rows) != 1 {
		t.Fatalf("audit: %v", rows)
	}
	// Without a cooldown nothing changes status: audited, no event.
	n := len(e.eventTypes())
	if code, _ = e.do("POST", fmt.Sprintf("/accounts/%d/reset-status", id), nil); code != 200 || len(e.eventTypes()) != n {
		t.Fatalf("second reset: %d events %v", code, e.eventTypes())
	}
	// A disabled account stays disabled (sub2api ClearRateLimit semantics).
	off := e.mkRawAccount("anthropic", "apikey", "off", "sk-good-key-123", false)
	code, out = e.do("POST", fmt.Sprintf("/accounts/%d/reset-status", off), nil)
	if code != 200 || out["data"].(map[string]any)["status"] != "disabled" {
		t.Fatalf("disabled: %d %v", code, out)
	}
	if code, _ = e.do("POST", "/accounts/999999/reset-status", nil); code != 404 {
		t.Fatalf("missing: %d", code)
	}
}

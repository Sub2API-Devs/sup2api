package moderation

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// Verdict cache, review findings of 0.8.0: a hit survives the passes of its
// segments, the review sync, clear counters, the memory budget.

// kvSpy counts the KV writes of a plugin by key and fails every KV call
// while fail is set.
type kvSpy struct {
	fail   atomic.Bool
	mu     sync.Mutex
	writes map[string]int
}

func (s *kvSpy) wrote(key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.writes == nil {
		s.writes = map[string]int{}
	}
	s.writes[key]++
}

// counts returns the writes per key so far and starts over.
func (s *kvSpy) counts() map[string]int {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := s.writes
	s.writes = nil
	return out
}

type kvSpyPlugin struct {
	*Plugin
	spy *kvSpy
}

func (w kvSpyPlugin) Init(ctx context.Context, h pluginsdk.Host) error {
	return w.Plugin.Init(ctx, kvSpyHost{Host: h, spy: w.spy})
}

type kvSpyHost struct {
	pluginsdk.Host
	spy *kvSpy
}

func (h kvSpyHost) KV() pluginsdk.KV { return kvSpyKV{KV: h.Host.KV(), spy: h.spy} }

type kvSpyKV struct {
	pluginsdk.KV
	spy *kvSpy
}

func (k kvSpyKV) Get(ctx context.Context, ns, key string) ([]byte, bool, error) {
	if k.spy.fail.Load() {
		return nil, false, errKVDown
	}
	return k.KV.Get(ctx, ns, key)
}

func (k kvSpyKV) Set(ctx context.Context, ns, key string, val []byte, ttl time.Duration) error {
	if k.spy.fail.Load() {
		return errKVDown
	}
	k.spy.wrote(key)
	return k.KV.Set(ctx, ns, key, val, ttl)
}

func (k kvSpyKV) Delete(ctx context.Context, ns, key string) error {
	if k.spy.fail.Load() {
		return errKVDown
	}
	k.spy.wrote(key)
	return k.KV.Delete(ctx, ns, key)
}

// startSpy is startDB with a spied KV.
func startSpy(t *testing.T, cfg map[string]any) (*Plugin, *pluginsdktest.Harness, *pluginsdktest.FakeHost, *kvSpy) {
	t.Helper()
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, "../../migrations")
	fh := pluginsdktest.NewFakeHost()
	fh.SetDSN(dsn, schema)
	fh.Authz = func(int64, string) bool { return false }
	spy := &kvSpy{}
	p := New()
	h := pluginsdktest.Start(t, kvSpyPlugin{Plugin: p, spy: spy}, pluginsdktest.Options{Host: fh, SDK: sdkOpts(), Config: cfg})
	return p, h, fh, spy
}

// segValues reads the segment keys of the KV.
func segValues(t *testing.T, fh *pluginsdktest.FakeHost) map[string]segValue {
	t.Helper()
	out := map[string]segValue{}
	for _, key := range kvKeys(t, fh, "s:") {
		r, err := fh.KVGet(context.Background(), &pluginv1.KVGetRequest{Namespace: kvNamespace, Key: key})
		if err != nil {
			t.Fatal(err)
		}
		out[key] = parseSeg(r.GetValue())
	}
	return out
}

// waitSegs waits for the background KV writes: n segment keys that cond
// holds for.
func waitSegs(t *testing.T, fh *pluginsdktest.FakeHost, what string, n int, cond func(segValue) bool) {
	t.Helper()
	waitFor(t, fmt.Sprintf("%d segment keys %s", n, what), func() bool {
		got := 0
		for _, v := range segValues(t, fh) {
			if cond(v) {
				got++
			}
		}
		return got >= n
	})
}

func pointed(v segValue) bool { return len(v.hits) > 0 }

// newPairMod serves /v1/moderations: "sexual" scores 0.99 only when the
// input holds both "alpha" and "beta".
func newPairMod(t *testing.T) (base string, calls *atomic.Int64) {
	calls = new(atomic.Int64)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		body, _ := io.ReadAll(r.Body)
		scores := map[string]float64{}
		for _, c := range OpenAICategories {
			scores[c] = 0.01
		}
		if strings.Contains(string(body), "alpha") && strings.Contains(string(body), "beta") {
			scores["sexual"] = 0.99
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"model": "omni-mock", "results": []any{map[string]any{"category_scores": scores}}})
	}))
	t.Cleanup(srv.Close)
	return srv.URL, calls
}

// Finding 1: the segments of a cached hit passing one by one in other
// requests do not turn the hit into a pass, in memory or in the KV.
func TestHitSurvivesPassesOfItsSegments(t *testing.T) {
	base, calls := newPairMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	_, h, fh := startDB(t, nil, cfg)
	setupFlow(t, h, base, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const (
		proto = "anthropic.messages"
		whole = `{"system":"alpha rule","messages":[{"role":"user","content":"beta ask"}]}`
		first = `{"system":"alpha rule","messages":[{"role":"user","content":"a harmless sentence"}]}`
		last  = `{"messages":[{"role":"user","content":"beta ask"}]}`
	)
	if r := mustHook(t, h, rawReq(3, "pair", proto, whole)); !denied(r) || replayed(r) {
		t.Fatalf("the pair = %+v", r)
	}
	if c := traceOf(t, recordOf(t, h, "pair")).Cache; c == nil || len(c.Segs) != 2 {
		t.Fatalf("hit set = %+v", c)
	}
	if r := mustHook(t, h, rawReq(3, "", proto, whole)); !denied(r) || !replayed(r) || calls.Load() != 1 {
		t.Fatalf("the pair again = %+v, calls %d", r, calls.Load())
	}
	// Each segment alone passes, and is then a cached pass.
	for i, body := range []string{first, last} {
		if r := mustHook(t, h, rawReq(3, "", proto, body)); denied(r) || r.GetNote() == notePrefix+"pass (cached)" || calls.Load() != int64(i+2) {
			t.Fatalf("part %d = %+v, calls %d", i, r, calls.Load())
		}
	}
	if r := mustHook(t, h, rawReq(3, "", proto, last)); r.GetNote() != notePrefix+"pass (cached)" || calls.Load() != 3 {
		t.Fatalf("the part again = %+v, calls %d", r, calls.Load())
	}
	// The pair is still the cached hit, for any user.
	for _, uid := range []int64{3, 4} {
		if r := mustHook(t, h, rawReq(uid, "", proto, whole)); !denied(r) || !replayed(r) || calls.Load() != 3 {
			t.Fatalf("the pair after its parts passed (user %d) = %+v, calls %d", uid, r, calls.Load())
		}
	}
	// In the KV both segments hold the pass and the pointer; another node
	// decides the same from it.
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "with a pass and a pointer", 2, func(v segValue) bool { return v.pass > 0 && len(v.hits) == 1 })
	_, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, rawReq(5, "", proto, whole)); !denied(r) || !replayed(r) {
		t.Fatalf("the pair on a second node = %+v", r)
	}
	if r := mustHook(t, h2, rawReq(5, "", proto, last)); r.GetNote() != notePrefix+"pass (cached)" {
		t.Fatalf("the part on a second node = %+v", r)
	}
	if calls.Load() != 3 {
		t.Fatalf("calls = %d", calls.Load())
	}
}

// A segment key holds a pass and the newest pointers, each with the time of
// its write.
func TestSegValue(t *testing.T) {
	id := func(i int) string { return fmt.Sprintf("%064x", i) }
	var v segValue
	passAt(100)(&v)
	pointTo(id(1), 90)(&v)
	pointTo(id(2), 120)(&v)
	passAt(80)(&v) // an older pass does not replace a newer one
	if got, want := string(v.encode()), fmt.Sprintf("p100 h%s@120 h%s@90", id(2), id(1)); got != want {
		t.Fatalf("value = %q, want %q", got, want)
	}
	if back := parseSeg(v.encode()); back.pass != 100 || len(back.hits) != 2 || back.hits[0] != (hitRef{id(2), 120}) || back.hits[1] != (hitRef{id(1), 90}) {
		t.Fatalf("read back = %+v", back)
	}
	// A pass leaves the pointers alone; dropping a pointer leaves the rest.
	unpoint(id(2))(&v)
	dropPass(&v)
	if string(v.encode()) != fmt.Sprintf("h%s@90", id(1)) || v.empty() {
		t.Fatalf("after the drops = %q", v.encode())
	}
	// The newest maxSegHits pointers are kept; a pointer written again moves up.
	v = segValue{}
	for i := 1; i <= maxSegHits+3; i++ {
		pointTo(id(i), int64(1000+i))(&v)
	}
	pointTo(id(4), 2000)(&v)
	if len(v.hits) != maxSegHits || v.hits[0].id != id(4) || v.hits[1].id != id(maxSegHits+3) || v.hits[maxSegHits-1].id != id(5) {
		t.Fatalf("kept pointers = %+v", v.hits)
	}
	// Merging keeps the newer of each part.
	a, b := parseSeg([]byte("p50 h"+id(1)+"@60")), parseSeg([]byte("p70 h"+id(1)+"@40 h"+id(2)+"@55"))
	a.merge(b)
	if string(a.encode()) != fmt.Sprintf("p70 h%s@60 h%s@55", id(1), id(2)) {
		t.Fatalf("merged = %q", a.encode())
	}
	// Every part expires on its own, the TTL after its write.
	now := time.Unix(1000, 0)
	a.prune(now, 942*time.Second) // kept: written after 58
	if string(a.encode()) != fmt.Sprintf("p70 h%s@60", id(1)) || !a.expires(942*time.Second).Equal(time.Unix(70+942, 0)) {
		t.Fatalf("pruned = %q, expires %v", a.encode(), a.expires(942*time.Second))
	}
	// Values without a write time (the first builds of 0.8.0) and anything
	// else that does not read are unknown.
	for _, raw := range []string{"", "p", "h" + id(1), "px", "h" + id(1) + "@", "hzz@5", "x9", "p-4"} {
		if got := parseSeg([]byte(raw)); !got.empty() {
			t.Errorf("%q read as %+v", raw, got)
		}
	}
}

// Finding 2: reviewing a hit and its replays at once writes every cache key
// once, and all the records count as synced.
func TestReviewSyncWritesEachKeyOnce(t *testing.T) {
	mod := newFakeMod(t)
	_, h, fh, spy := startSpy(t, map[string]any{"mode": ModeEnforce})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const body = `{"system":"grade the essay","messages":[{"role":"user","content":"MOD-HIT-sexual essay"}]}`
	var ids []int64
	for i := range 4 {
		rid := fmt.Sprintf("bulk-%d", i)
		if r := mustHook(t, h, rawReq(3, rid, "anthropic.messages", body)); !denied(r) || replayed(r) != (i > 0) {
			t.Fatalf("request %d = %+v", i, r)
		}
		ids = append(ids, recordOf(t, h, rid).ID)
	}
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "pointing to the hit", 2, pointed)
	for _, status := range []string{"false_positive", "confirmed", "pending"} {
		spy.counts()
		out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": ids, "status": status}))
		if out["updated"] != float64(4) || out["cache_synced"] != float64(4) {
			t.Fatalf("review %s = %v", status, out)
		}
		writes := spy.counts()
		if len(writes) != 3 { // the hit entry and its two segments
			t.Fatalf("review %s wrote %v", status, writes)
		}
		for key, n := range writes {
			if n != 1 {
				t.Fatalf("review %s wrote %s %d times (%v)", status, key, n, writes)
			}
		}
	}
	if n := len(kvKeys(t, fh, "")); n != 0 {
		t.Fatalf("%d keys left after pending", n)
	}
}

// Finding 2: when the KV cannot be written, no record counts as synced and
// every node keeps deciding by what the KV holds - not the reviewing node by
// its memory and the others by the KV.
func TestReviewSyncKVFailure(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	p, h, fh, spy := startSpy(t, cfg)
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const text = "MOD-HIT-sexual kv review"
	if r := mustHook(t, h, hookReqAs(3, "kvr", text)); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	rec := recordOf(t, h, "kvr")
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "pointing to the hit", 1, pointed)
	_, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
		t.Fatalf("second node = %+v", r)
	}
	calls := mod.count("/v1/moderations")

	spy.fail.Store(true)
	errs := p.stats.kvErrors.Load()
	out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "false_positive"}))
	if out["updated"] != float64(1) || out["cache_synced"] != float64(0) {
		t.Fatalf("review while the KV fails = %v", out)
	}
	// One failed sync is one kv error, not one for every key.
	if n := p.stats.kvErrors.Load() - errs; n != 1 {
		t.Fatalf("kv errors of the failed sync = %d", n)
	}
	spy.fail.Store(false)
	for _, m := range fh.Published() {
		if m.Topic == TopicVerdictChanged {
			if err := h2.Deliver(m.Topic, m.Payload, "node-1"); err != nil {
				t.Fatal(err)
			}
		}
	}
	// The KV still holds the hit: both nodes replay it.
	for name, node := range map[string]*pluginsdktest.Harness{"reviewing node": h, "second node": h2} {
		if r := mustHook(t, node, hookReq(text)); !denied(r) || !replayed(r) {
			t.Fatalf("%s after the failed sync = %+v", name, r)
		}
	}
	if n := mod.count("/v1/moderations"); n != calls {
		t.Fatalf("calls %d -> %d", calls, n)
	}
	// Reviewing again once the KV is back syncs it, on both nodes.
	out = decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "false_positive"}))
	if out["cache_synced"] != float64(1) {
		t.Fatalf("review after the KV is back = %v", out)
	}
	pub := fh.Published()
	if err := h2.Deliver(TopicVerdictChanged, pub[len(pub)-1].Payload, "node-1"); err != nil {
		t.Fatal(err)
	}
	for name, node := range map[string]*pluginsdktest.Harness{"reviewing node": h, "second node": h2} {
		if r := mustHook(t, node, hookReq(text)); r.GetNote() != notePrefix+"pass (cached)" {
			t.Fatalf("%s after the sync = %+v", name, r)
		}
	}
}

// Finding 2: once the budget is over no more KV work is handed out, and the
// run counts one kv error.
func TestKVRunStopsWithItsContext(t *testing.T) {
	p := New()
	ctx, cancel := context.WithCancel(context.Background())
	var ran atomic.Int64
	ok := p.kvRun(ctx, 100, func(i int) error {
		if ran.Add(1) == 5 {
			cancel()
		}
		return nil
	})
	done := 0
	for _, o := range ok {
		if o {
			done++
		}
	}
	// What was handed out before the cancel ran; nothing after it.
	if n := ran.Load(); n < 5 || n > 5+kvLookupWorkers || int64(done) != n {
		t.Fatalf("%d calls ran, %d reported done", n, done)
	}
	if n := p.stats.kvErrors.Load(); n != 1 {
		t.Fatalf("kv errors = %d", n)
	}
	if ok := p.kvRun(context.Background(), 20, func(int) error { return nil }); len(ok) != 20 || p.stats.kvErrors.Load() != 1 {
		t.Fatal("a complete run counted an error")
	}
}

// Finding 3: a hit names only the segments that were sent (not an image the
// flow had no auditor for), and a false positive of a record judged under
// another fingerprint stores no pass.
func TestFalsePositiveUnderAnotherFingerprint(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorTypeSafe})
	jev := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))[0]
	blind := decodeData[AuditorView](t, h.Do("POST", "/auditors", nil, map[string]any{"name": "jev without images", "type": AuditorTypeSafe,
		"channel_id": jev.ChannelID, "config": map[string]any{"review_images": false}}))
	spec := Spec{SampleRate: 100, Stages: []Stage{{Auditors: []int64{blind.ID}, Combine: CombineAny}}}
	spec.ModelFilter.Type = FilterAll
	f := decodeData[FlowView](t, h.Do("POST", "/flows", nil, map[string]any{"name": "no images", "draft": spec}))
	decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/groups", f.ID), nil, map[string]any{"groups": []int64{10}}))
	decodeData[FlowView](t, h.Do("POST", fmt.Sprintf("/flows/%d/publish", f.ID), nil, map[string]any{"expected_version": 0}))
	send := func(rid, body string) *pluginv1.GatewayRequestHookResponse {
		t.Helper()
		req := rawReq(3, rid, "anthropic.messages", body)
		req.Meta.GroupId = 10
		return mustHook(t, h, req)
	}
	calls := func() int64 { return mod.count("/v1/systemone") }
	const (
		text      = `{"type":"text","text":"MOD-HIT-sexual picture"}`
		image     = `{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="}}`
		withImage = `{"messages":[{"role":"user","content":[` + text + `,` + image + `]}]}`
		textOnly  = `{"messages":[{"role":"user","content":[` + text + `]}]}`
	)
	if r := send("img", withImage); !denied(r) || replayed(r) || calls() != 1 {
		t.Fatalf("first = %+v, calls %d", r, calls())
	}
	rec := recordOf(t, h, "img")
	if c := traceOf(t, rec).Cache; rec.ImageCount != 1 || c == nil || len(c.Segs) != 1 {
		t.Fatalf("hit set of a chunk whose image was not sent = %+v (images %d)", c, rec.ImageCount)
	}
	// The text was judged a hit by itself: it replays without the image.
	if r := send("", textOnly); !denied(r) || !replayed(r) || calls() != 1 {
		t.Fatalf("the text alone = %+v, calls %d", r, calls())
	}
	// The auditor now takes images: another fingerprint. The old record is a
	// false positive - of the old configuration. Nothing passes under the
	// new one, which has judged neither the text nor the image.
	decodeData[AuditorView](t, h.Do("PUT", fmt.Sprintf("/auditors/%d", blind.ID), nil, map[string]any{"name": blind.Name, "type": blind.Type,
		"channel_id": blind.ChannelID, "config": map[string]any{"review_images": true}}))
	out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "false_positive"}))
	if out["updated"] != float64(1) {
		t.Fatalf("review = %v", out)
	}
	if r := send("", withImage); !denied(r) || replayed(r) || calls() != 2 {
		t.Fatalf("after a false positive under another fingerprint = %+v, calls %d", r, calls())
	}
}

// Finding 4: a value loaded from the KV keeps the time of its write in
// memory instead of a fresh TTL, and a part older than the TTL is not used.
func TestKVValueKeepsItsWriteTime(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	snap := p.snap.Load()
	scope, ttl := snap.scopeOf(snap.flows[flow]), p.cfg.Load().cacheTTL
	now := time.Now()
	set := func(key [32]byte, val string) {
		t.Helper()
		if _, err := fh.KVSet(context.Background(), &pluginv1.KVSetRequest{Namespace: kvNamespace, Key: segKeyOf(scope, key), Value: []byte(val)}); err != nil {
			t.Fatal(err)
		}
	}
	old, expired, legacyPass, legacyHit := [32]byte{1}, [32]byte{2}, [32]byte{3}, [32]byte{4}
	written := now.Add(time.Hour - ttl).Unix() // an hour left
	set(old, fmt.Sprintf("p%d", written))
	set(expired, fmt.Sprintf("p%d", now.Add(-ttl-time.Minute).Unix()))
	set(legacyPass, "p")
	set(legacyHit, "h"+strings.Repeat("ab", 32))
	keys := [][32]byte{old, expired, legacyPass, legacyHit}
	v := p.lookupVerdicts(scope, keys, true)
	if len(v.passed) != 1 || !v.passed[old] || v.hit != nil {
		t.Fatalf("verdicts = %+v", v)
	}
	cache := p.cache.Load()
	el := cache.items[segKeyOf(scope, old)]
	if el == nil || cache.len() != 1 {
		t.Fatalf("memory holds %d entries", cache.len())
	}
	if exp := el.Value.(*cacheEntry).expires; !exp.Equal(time.Unix(written, 0).Add(ttl)) {
		t.Fatalf("memory expiry = %v, want the write time %v plus the TTL (now %v)", exp, time.Unix(written, 0), now)
	}
	// From memory alone it is the same pass, and gone an hour later.
	if v := p.lookupVerdicts(scope, keys, false); len(v.passed) != 1 || !v.passed[old] {
		t.Fatalf("from memory = %+v", v)
	}
	if _, ok := cache.get(segKeyOf(scope, old), now.Add(time.Hour+time.Second)); ok {
		t.Fatal("the pass outlived the TTL of its write")
	}
}

// Finding 5: a post job queued before the cache was cleared is not answered
// from the cleared cache, and its verdict is stored under the new counter.
func TestQueuedJobAfterClear(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const text = "MOD-HIT-violence epoch"
	mustHook(t, h, hookReqAs(3, "e0", text))
	recordOf(t, h, "e0")
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "pointing to the hit", 1, pointed)
	// A job as the hook queues it on a node whose memory does not know the
	// hit (the worker would find it in the KV).
	p.cache.Store(newLRU(1000))
	snap := p.snap.Load()
	m, early := p.admit(p.cfg.Load(), hookReqAs(6, "queued", text), snap, snap.flows[flow])
	if early != nil || m == nil || m.timing != TimingPost {
		t.Fatalf("admit = %+v, %+v", m, early)
	}
	m.queued = p.now()
	if got := decodeData[map[string]int64](t, h.Do("POST", "/verdict-cache/clear", nil, nil))["epoch"]; got != 1 {
		t.Fatalf("clear = %d", got)
	}
	calls := mod.count("/v1/moderations")
	p.runPost(m)
	if n := mod.count("/v1/moderations"); n != calls+1 {
		t.Fatalf("the queued job did not run after the clear: calls %d -> %d", calls, n)
	}
	if ev := recordOf(t, h, "queued"); ev.Replayed || ev.Result != ResultHit {
		t.Fatalf("record of the queued job = %+v", ev.Event)
	}
	// Its hit is cached under the counter of now.
	if r := mustHook(t, h, hookReqAs(7, "after", text)); r.GetNote() != notePrefix+"hit (replay)" || mod.count("/v1/moderations") != calls+1 {
		t.Fatalf("after the clear = %+v, calls %d", r, mod.count("/v1/moderations"))
	}
	waitKV(t, fh, "h:e1:", 1)
}

// Finding 6: the memory cache is bounded by bytes as well as entries.
func TestLRUByteBudget(t *testing.T) {
	now := time.Now()
	exp := now.Add(time.Minute)
	c := newLRU(1000)
	if c.maxBytes != cacheMaxBytes {
		t.Fatalf("default budget = %d", c.maxBytes)
	}
	one := int64(1 + 10 + cacheEntryOverhead) // a one-letter key with ten bytes
	c.maxBytes = 3 * one
	val := []byte("0123456789")
	for _, k := range []string{"a", "b", "c"} {
		c.put(k, val, exp)
	}
	if c.len() != 3 || c.size() != 3*one {
		t.Fatalf("%d entries, %d bytes", c.len(), c.size())
	}
	c.get("a", now)
	c.put("d", val, exp) // over the budget: the least recently used goes
	if _, ok := c.get("b", now); ok || c.len() != 3 || c.size() != 3*one {
		t.Fatalf("after the fourth: %d entries, %d bytes", c.len(), c.size())
	}
	// A value replaced by a larger one is charged its new size.
	c.put("a", append(val, val...), exp)
	if _, ok := c.get("c", now); ok || c.len() != 2 || c.size() != 2*one+10 {
		t.Fatalf("after growing a: %d entries, %d bytes", c.len(), c.size())
	}
	// A decoded hit is charged twice its JSON; removing and expiring free.
	hit := &storedHit{Keys: []string{"k"}}
	c.maxBytes = 1 << 20
	if !c.putHit("h", hit, 1000, exp, now) || c.getHit("h", now) != hit || c.size() != 2*one+10+1+2000+cacheEntryOverhead {
		t.Fatalf("with a hit: %d bytes", c.size())
	}
	if c.getHit("a", now) != nil {
		t.Fatal("a segment value read as a hit")
	}
	c.del("h")
	c.get("a", exp)
	c.get("d", exp)
	if c.len() != 0 || c.size() != 0 {
		t.Fatalf("emptied: %d entries, %d bytes", c.len(), c.size())
	}
	// An entry larger than the whole budget is not kept.
	c.maxBytes = one
	c.putHit("big", hit, int(one), exp, now)
	if c.len() != 0 || c.size() != 0 {
		t.Fatalf("an entry beyond the budget: %d entries, %d bytes", c.len(), c.size())
	}
}

// Finding 6: a hit is decoded once and kept decoded in memory; the runtime
// figures show the bytes of the cache.
func TestHitKeptDecoded(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	if r := mustHook(t, h, hookReqAs(3, "dec", "MOD-HIT-sexual decoded")); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "pointing to the hit", 1, pointed)
	c := traceOf(t, recordOf(t, h, "dec")).Cache
	key := hashOf(t, c.Segs[0])
	snap := p.snap.Load()
	scope := snap.scopeOf(snap.flows[flow])
	p.cache.Store(newLRU(1000))
	fromKV := p.lookupVerdicts(scope, [][32]byte{key}, true)
	if fromKV.hit == nil || fromKV.hitID != c.Key || fromKV.hit.RequestID != "dec" {
		t.Fatalf("from the KV = %+v", fromKV)
	}
	for range 2 {
		if again := p.lookupVerdicts(scope, [][32]byte{key}, false); again.hit != fromKV.hit {
			t.Fatal("the hit was decoded again")
		}
	}
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	if st.Runtime.CacheEntries != 2 || st.Runtime.CacheBytes != p.cache.Load().size() || st.Runtime.CacheBytes < 2*cacheEntryOverhead {
		t.Fatalf("runtime = %d entries, %d bytes", st.Runtime.CacheEntries, st.Runtime.CacheBytes)
	}
}

// hashOf reads a segment hash as a record's trace names it.
func hashOf(t *testing.T, s string) (key [32]byte) {
	t.Helper()
	if n, err := hex.Decode(key[:], []byte(s)); err != nil || n != len(key) {
		t.Fatalf("%q is not a hash", s)
	}
	return key
}

// Finding 7: the verdicts of a pre run are stored by the run - also when its
// client has left, and once however many requests wait for it.
func TestPreRunStoresVerdictsOnce(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh, spy := startSpy(t, map[string]any{"mode": ModeEnforce})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	calls := func() int64 { return mod.count("/v1/moderations") }
	mod.delay.Store(int64(400 * time.Millisecond))

	// The client leaves before the run ends: the pass is cached all the same.
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	r, err := p.OnGatewayRequest(ctx, hookReqAs(3, "left", "clean and left behind"))
	cancel()
	if err != nil || denied(r) || r.GetNote() != notePrefix+"error canceled" {
		t.Fatalf("canceled request = %+v %v", r, err)
	}
	waitSegs(t, fh, "that passed", 1, func(v segValue) bool { return v.pass > 0 })
	if r := mustHook(t, h, hookReqAs(3, "", "clean and left behind")); r.GetNote() != notePrefix+"pass (cached)" || calls() != 1 {
		t.Fatalf("after the client left = %+v, calls %d", r, calls())
	}

	// Five requests share one run: its verdict is written once.
	spy.counts()
	var wg sync.WaitGroup
	notes := make([]string, 5)
	for i := range notes {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if r, err := h.Hook.OnGatewayRequest(context.Background(), hookReqAs(3, "", "clean and asked five times")); err == nil {
				notes[i] = r.GetNote()
			}
		}()
	}
	wg.Wait()
	for i, note := range notes {
		if !strings.HasPrefix(note, notePrefix+"pass flow=") {
			t.Fatalf("request %d = %q", i, note)
		}
	}
	if calls() != 2 {
		t.Fatalf("the five requests made %d runs", calls()-1)
	}
	waitSegs(t, fh, "that passed", 2, func(v segValue) bool { return v.pass > 0 })
	time.Sleep(300 * time.Millisecond) // writes of further settles, if there were any
	writes := spy.counts()
	if len(writes) != 1 {
		t.Fatalf("writes = %v", writes)
	}
	for key, n := range writes {
		if n != 1 {
			t.Fatalf("%s written %d times", key, n)
		}
	}
}

// Finding 8: the fingerprint carries the version of the judging defaults in
// the code.
func TestFingerprintJudgingVersion(t *testing.T) {
	spec := &Spec{Stages: []Stage{{Auditors: []int64{1}, Combine: CombineAny}}}
	auditors := map[int64]storedAuditor{1: {typ: AuditorOpenAI, channel: 1, config: []byte(`{}`)}}
	channels := map[int64]*liveChannel{1: {ID: 1, Type: ChannelOpenAI, BaseURL: "https://a.example"}}
	base := fingerprint(spec, auditors, channels, nil)
	if base != fingerprintAt(judgingVersion, spec, auditors, channels, nil) {
		t.Fatal("fingerprint is not the one of judgingVersion")
	}
	if base == fingerprintAt(judgingVersion+1, spec, auditors, channels, nil) {
		t.Fatal("another judging version kept the fingerprint")
	}
}

// Finding 9: a key a review changed is tombstoned for a while - nothing a
// lookup read or a run decided before the review is stored under it.
func TestLRUTombstone(t *testing.T) {
	now := time.Now()
	exp := now.Add(time.Hour)
	c := newLRU(10)
	c.put("s", []byte("p5"), exp)
	c.putHit("h", &storedHit{}, 10, exp, now)
	c.kill([]string{"s", "h"}, now.Add(time.Second), now)
	if c.len() != 0 || c.size() != 0 || !c.tombstoned("s", now) || c.tombstoned("other", now) {
		t.Fatalf("killed: %d entries, %d bytes", c.len(), c.size())
	}
	c.editSeg("s", now, time.Hour, passAt(now.Unix()))
	if c.putHit("h", &storedHit{}, 10, exp, now) || c.len() != 0 {
		t.Fatal("a tombstoned key was stored")
	}
	later := now.Add(time.Second)
	c.editSeg("s", later, time.Hour, passAt(now.Unix()))
	if !c.putHit("h", &storedHit{}, 10, exp, later) || c.len() != 2 || c.tombstoned("s", later) {
		t.Fatal("the tombstone outlived its time")
	}
	// Old tombstones are dropped with the next kill.
	c.kill([]string{"x"}, later.Add(time.Second), later)
	if len(c.dead) != 1 {
		t.Fatalf("tombstones = %v", c.dead)
	}
}

// Finding 9: after a review, a lookup on another node does not put what it
// read back into memory, and the late write of a run that judged before the
// review does not restore the hit - in memory or in the KV.
func TestReviewIsNotUndoneByLateWrites(t *testing.T) {
	mod := newFakeMod(t)
	cfg := map[string]any{"mode": ModeEnforce}
	p, h, fh := startDB(t, nil, cfg)
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	const text = "MOD-HIT-sexual late write"
	if r := mustHook(t, h, hookReqAs(3, "late", text)); !denied(r) {
		t.Fatalf("first = %+v", r)
	}
	rec := recordOf(t, h, "late")
	waitKV(t, fh, "h:", 1)
	waitSegs(t, fh, "pointing to the hit", 1, pointed)
	p2, h2 := secondNode(t, fh, cfg)
	if r := mustHook(t, h2, hookReq(text)); !replayed(r) {
		t.Fatalf("second node = %+v", r)
	}
	// The hit as a run holds it when it comes to store it.
	c := traceOf(t, rec).Cache
	key := hashOf(t, c.Segs[0])
	snap := p.snap.Load()
	scope := snap.scopeOf(snap.flows[flow])
	held := p.lookupVerdicts(scope, [][32]byte{key}, true).hit
	if held == nil {
		t.Fatal("the hit is not cached")
	}

	decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "pending"}))
	if n := len(kvKeys(t, fh, "")); n != 0 {
		t.Fatalf("%d keys left after pending", n)
	}
	pub := fh.Published()
	if err := h2.Deliver(TopicVerdictChanged, pub[len(pub)-1].Payload, "node-1"); err != nil {
		t.Fatal(err)
	}
	// The late writes, on the reviewing node and on the one that was told.
	for name, node := range map[string]*Plugin{"reviewing node": p, "second node": p2} {
		late := *held
		late.At = time.Now().Unix()
		node.storeVerdicts(node.cfg.Load(), scope, [][32]byte{{9}}, []storedHit{late})
		waitKV(t, fh, "s:", 1)             // the pass of the other segment: the background write ran
		time.Sleep(300 * time.Millisecond) // and the rest of it, if there were any
		if v := node.lookupVerdicts(scope, [][32]byte{key}, true); v.hit != nil || len(v.passed) != 0 {
			t.Fatalf("%s: the late write restored %+v", name, v)
		}
		if keys := kvKeys(t, fh, "h:"); len(keys) != 0 {
			t.Fatalf("%s: the late write restored %v in the KV", name, keys)
		}
		if keys := kvKeys(t, fh, "s:"); len(keys) != 1 { // only the pass of the other segment
			t.Fatalf("%s: segment keys after the late write = %v", name, keys)
		}
	}

	// False positive: the passes are in the KV; a node that was told reads
	// them there and keeps them out of its memory while the tombstone lasts.
	decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{rec.ID}, "status": "false_positive"}))
	pub = fh.Published()
	if err := h2.Deliver(TopicVerdictChanged, pub[len(pub)-1].Payload, "node-1"); err != nil {
		t.Fatal(err)
	}
	before := p2.cache.Load().len()
	if r := mustHook(t, h2, hookReq(text)); r.GetNote() != notePrefix+"pass (cached)" {
		t.Fatalf("second node after the false positive = %+v", r)
	}
	if n := p2.cache.Load().len(); n != before {
		t.Fatalf("a lookup right after verdict.changed stored what it read: %d -> %d entries", before, n)
	}
}

package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"maps"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/batch"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

func sdkOpts() []pluginsdk.Option {
	return []pluginsdk.Option{pluginsdk.WithInfo("moderation", "0.2.0")}
}

var reqSeq atomic.Int64

// hookReqAs builds an anthropic.messages hook request (api key 5, group 9).
func hookReqAs(user int64, id, text string) *pluginv1.GatewayRequestHookRequest {
	if id == "" {
		id = fmt.Sprintf("req-%d", reqSeq.Add(1))
	}
	msgs, _ := json.Marshal([]any{map[string]any{"role": "user", "content": text}})
	return &pluginv1.GatewayRequestHookRequest{
		Meta: &pluginv1.RequestMeta{RequestId: id, Protocol: "anthropic.messages", ClientProtocol: "anthropic.messages",
			Model: "claude-opus-5", UserId: user, ApiKeyId: 5, GroupId: 9, Endpoint: "/v1/messages"},
		Fields: map[string]string{FieldModel: `"claude-opus-5"`, FieldMessages: string(msgs)},
	}
}

func hookReq(text string) *pluginv1.GatewayRequestHookRequest { return hookReqAs(3, "", text) }

// mustHook sends a hook request to the node h when the verdicts of the runs
// before it are in the cache, and returns when those of its own run are (the
// writes that failed are over as well): a run stores its verdicts after the
// hook has answered, and the same content sent again before that is moderated
// again. Under post timing the run comes later; a test waits for its record
// (recordOf) and the next mustHook for its write. hookNow does not wait.
func mustHook(t *testing.T, h *pluginsdktest.Harness, req *pluginv1.GatewayRequestHookRequest) *pluginv1.GatewayRequestHookResponse {
	t.Helper()
	p := nodeOf(t, h)
	written(t, p)
	r := hookNow(t, h, req)
	written(t, p)
	return r
}

// hookNow sends a hook request at once, whatever the node is still writing
// to its verdict cache, and does not wait for what its run writes.
func hookNow(t *testing.T, h *pluginsdktest.Harness, req *pluginv1.GatewayRequestHookRequest) *pluginv1.GatewayRequestHookResponse {
	t.Helper()
	r, err := h.Hook.OnGatewayRequest(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

// written waits until the verdicts the node's runs stored so far are in the
// KV and in the node's memory (or their writes have failed).
func written(t *testing.T, p *Plugin) {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for p.stats.kvWriting.Load() != 0 {
		if time.Now().After(deadline) {
			t.Fatal("timed out waiting for the verdict writes")
		}
		time.Sleep(time.Millisecond)
	}
}

// nodes maps the harness of every node of the tests to its plugin (startNode).
var nodes sync.Map

// nodeOf is the plugin of the node behind h.
func nodeOf(t *testing.T, h *pluginsdktest.Harness) *Plugin {
	t.Helper()
	p, ok := nodes.Load(h)
	if !ok {
		t.Fatal("a harness that startNode did not start")
	}
	return p.(*Plugin)
}

func denied(r *pluginv1.GatewayRequestHookResponse) bool {
	return r.GetDecision() == pluginv1.GatewayRequestHookResponse_DECISION_DENY
}

// fakeMod serves /v1/moderations and /v1/systemone: every category scores
// 0.01, a "MOD-HIT-<category>" token in the text scores it 0.99, MOD-500
// answers 500; JEV-500 and OAI-500 answer 500 on /v1/systemone and
// /v1/moderations only.
type fakeMod struct {
	srv   *httptest.Server
	calls sync.Map     // path -> *atomic.Int64
	delay atomic.Int64 // nanoseconds before answering
	mu    sync.Mutex
	texts []string // request bodies of /v1/moderations
	// hold: the requests wait on gate before they are answered, each
	// reported on arrived.
	gate    chan struct{}
	arrived chan string
}

// hold makes the requests that come in from now on wait until release is
// called (the end of the test at the latest); arrived gets the path of each
// as it comes in.
func (f *fakeMod) hold(t *testing.T) (arrived <-chan string, release func()) {
	gate := make(chan struct{})
	f.mu.Lock()
	f.gate, f.arrived = gate, make(chan string, 256)
	arrived = f.arrived
	f.mu.Unlock()
	release = sync.OnceFunc(func() {
		f.mu.Lock()
		f.gate = nil
		f.mu.Unlock()
		close(gate)
	})
	t.Cleanup(release)
	return arrived, release
}

// moderated returns the /v1/moderations request bodies so far.
func (f *fakeMod) moderated() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.texts...)
}

var hitToken = regexp.MustCompile(`MOD-HIT-([a-z/_-]+)`)

func newFakeMod(t *testing.T) *fakeMod {
	f := &fakeMod{}
	f.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n, _ := f.calls.LoadOrStore(r.URL.Path, new(atomic.Int64))
		n.(*atomic.Int64).Add(1)
		if d := time.Duration(f.delay.Load()); d > 0 {
			time.Sleep(d)
		}
		f.mu.Lock()
		gate, arrived := f.gate, f.arrived
		f.mu.Unlock()
		if gate != nil {
			arrived <- r.URL.Path
			<-gate
		}
		body, _ := io.ReadAll(r.Body)
		text := string(body)
		if r.URL.Path == "/v1/moderations" {
			f.mu.Lock()
			f.texts = append(f.texts, text)
			f.mu.Unlock()
		}
		if strings.Contains(text, "MOD-500") || (r.URL.Path == "/v1/systemone" && strings.Contains(text, "JEV-500")) ||
			(r.URL.Path == "/v1/moderations" && strings.Contains(text, "OAI-500")) {
			w.WriteHeader(500)
			_, _ = io.WriteString(w, `{"error":{"message":"boom"}}`)
			return
		}
		score := func(cat string) float64 {
			for _, m := range hitToken.FindAllStringSubmatch(text, -1) {
				if m[1] == cat {
					return 0.99
				}
			}
			return 0.01
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/v1/moderations":
			scores := map[string]float64{}
			for _, c := range OpenAICategories {
				scores[c] = score(c)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"model": "omni-mock", "results": []any{map[string]any{"category_scores": scores}}})
		case "/v1/systemone":
			var req struct {
				Questions map[string]json.RawMessage `json:"questions"`
			}
			_ = json.Unmarshal(body, &req)
			answers := map[string]any{}
			for c := range req.Questions {
				answers[c] = map[string]any{"type": "noul", "noul": score(c)}
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"model": "jev-mock", "answers": answers, "usage": map[string]int{"input_tokens": 10}})
		default:
			w.WriteHeader(404)
		}
	}))
	t.Cleanup(f.srv.Close)
	return f
}

func (f *fakeMod) count(path string) int64 {
	if n, ok := f.calls.Load(path); ok {
		return n.(*atomic.Int64).Load()
	}
	return 0
}

// node is a plugin instance under test. Its Init can put a fake between the
// plugin and the KV of its host (kv), and give the plugin a logger of the
// test instead of the host's (log).
type node struct {
	*Plugin
	kv  *kvFake
	log *slog.Logger
}

func (n *node) Init(ctx context.Context, h pluginsdk.Host) error {
	if n.kv != nil {
		h = kvFakeHost{Host: h, kv: n.kv}
	}
	if n.log != nil {
		h = logHost{Host: h, log: n.log}
	}
	return n.Plugin.Init(ctx, h)
}

// logHost is a host whose logger is log.
type logHost struct {
	pluginsdk.Host
	log *slog.Logger
}

func (h logHost) Logger() *slog.Logger { return h.log }

// nodeOpt changes a node before it is initialised.
type nodeOpt func(*node)

// withKV puts kv between the node and the KV of its host.
func withKV(kv *kvFake) nodeOpt { return func(n *node) { n.kv = kv } }

// withLog makes the node log to log.
func withLog(log *slog.Logger) nodeOpt { return func(n *node) { n.log = log } }

// noRefreshTicks stops the periodic refresh of a node: only a kick (the
// start, a change of the settings) runs it, so the conversions it makes
// cannot fall into the middle of a test that makes them by hand.
func noRefreshTicks(n *node) { n.refreshEvery = 24 * time.Hour }

// withClock gives a node a clock that stands still at the time of the call
// plus ahead (nanoseconds): only the test moves it.
func withClock(ahead *atomic.Int64) nodeOpt {
	start := time.Now()
	return func(n *node) {
		n.now = func() time.Time { return start.Add(time.Duration(ahead.Load())) }
	}
}

// startNode starts a plugin instance on the host fh: every test instance of
// the plugin starts here. Its event writer flushes every few milliseconds, so
// a test does not wait a second for each record (recordOf, waitEvents).
func startNode(t *testing.T, fh *pluginsdktest.FakeHost, cfg any, opts ...nodeOpt) (*Plugin, *pluginsdktest.Harness) {
	t.Helper()
	n := &node{Plugin: New()}
	n.eventFlushEvery = 10 * time.Millisecond
	for _, opt := range opts {
		opt(n)
	}
	h := pluginsdktest.Start(t, n, pluginsdktest.Options{Host: fh, SDK: sdkOpts(), Config: cfg})
	nodes.Store(h, n.Plugin)
	t.Cleanup(func() { nodes.Delete(h) })
	return n.Plugin, h
}

// startDB starts a plugin instance with settings on a host of its own with
// a fresh database (newDBHost).
func startDB(t *testing.T, settings map[string]any, opts ...nodeOpt) (*Plugin, *pluginsdktest.Harness, *pluginsdktest.FakeHost) {
	t.Helper()
	fh := newDBHost(t)
	p, h := startNode(t, fh, settings, opts...)
	return p, h, fh
}

// newDBHost is a host with a fresh, migrated database: users 1-100 exist in
// the core, nobody is a moderator.
func newDBHost(t *testing.T) *pluginsdktest.FakeHost {
	t.Helper()
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
	fh := pluginsdktest.NewFakeHost()
	fh.SetDSN(dsn, schema)
	// Nobody is a moderator unless a test says so (isStaff).
	fh.Authz = func(int64, string) bool { return false }
	// Users 1-100 exist in the core (GetUsers).
	fh.Users = map[int64]*pluginv1.UserInfo{}
	for id := int64(1); id <= 100; id++ {
		fh.Users[id] = &pluginv1.UserInfo{Id: id, DisplayName: fmt.Sprintf("user %d", id), Status: "active"}
	}
	return fh
}

func decodeData[T any](t *testing.T, resp *pluginv1.HTTPResponse) T {
	t.Helper()
	if resp.GetStatus() != 200 {
		t.Fatalf("HTTP %d %s", resp.GetStatus(), resp.GetBody())
	}
	var out struct {
		Data T `json:"data"`
	}
	if err := json.Unmarshal(resp.GetBody(), &out); err != nil {
		t.Fatalf("%v: %s", err, resp.GetBody())
	}
	return out.Data
}

func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(50 * time.Millisecond)
	}
}

func waitEvents(t *testing.T, h *pluginsdktest.Harness, q map[string]string, n int) []EventListItem {
	t.Helper()
	var items []EventListItem
	waitFor(t, fmt.Sprintf("%d events %v", n, q), func() bool {
		items = decodeData[[]EventListItem](t, h.Do("GET", "/events", q, nil))
		return len(items) >= n
	})
	return items
}

// newAuditor creates an auditor of typ through the API, on the channel of its
// channel type in channels - created at base when it is not there yet.
func newAuditor(t *testing.T, h *pluginsdktest.Harness, base, typ string, channels map[string]int64) int64 {
	t.Helper()
	chType := channelTypeOf[typ]
	if channels[chType] == 0 {
		ch := decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": chType, "name": chType, "base_url": base, "api_key": "key-" + chType}))
		channels[chType] = ch.ID
	}
	return decodeData[AuditorView](t, h.Do("POST", "/auditors", nil, map[string]any{"name": typ, "type": typ, "channel_id": channels[chType]})).ID
}

// stageOf is a stage of the auditors ids (any of them decides).
func stageOf(fallback bool, ids ...int64) Stage {
	return Stage{Auditors: ids, Combine: CombineAny, Fallback: fallback}
}

// publishFlow creates the flow of spec through the API (every request; every
// model unless spec has a filter; scope all, everything the client sent, as
// before scopes existed), binds it to groups and publishes it; returns the
// flow id.
func publishFlow(t *testing.T, h *pluginsdktest.Harness, spec Spec, groups ...int64) int64 {
	t.Helper()
	spec.SampleRate = 100
	if spec.ModelFilter.Type == "" {
		spec.ModelFilter.Type = FilterAll
	}
	f := decodeData[FlowView](t, h.Do("POST", "/flows", nil, map[string]any{"name": "f", "draft": spec, "scope": ScopeAll}))
	decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/groups", f.ID), nil, map[string]any{"groups": groups}))
	pub := decodeData[FlowView](t, h.Do("POST", fmt.Sprintf("/flows/%d/publish", f.ID), nil, map[string]any{"expected_version": 0}))
	if pub.Version != 1 || pub.Dirty {
		t.Fatalf("published = %+v", pub)
	}
	return f.ID
}

// setupFlow creates channels (one per type, at base), auditors and a
// published flow bound to groups. stages lists the auditor types of each
// stage; returns the flow id.
func setupFlow(t *testing.T, h *pluginsdktest.Harness, base string, groups []int64, combine string, stages ...[]string) int64 {
	t.Helper()
	channels := map[string]int64{}
	var spec Spec
	for _, types := range stages {
		st := Stage{Combine: combine}
		for _, typ := range types {
			st.Auditors = append(st.Auditors, newAuditor(t, h, base, typ, channels))
		}
		spec.Stages = append(spec.Stages, st)
	}
	return publishFlow(t, h, spec, groups...)
}

func TestObserveWatchListAndEnforceLevel(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, map[string]any{"mode": ModeObserve})
	setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	first := hookReqAs(3, "req-a", "MOD-HIT-sexual one")
	first.Meta.SessionFingerprint = "fp-a"
	if r := mustHook(t, h, first); denied(r) || r.GetNote() != queuedNote {
		t.Fatalf("observe = %+v", r)
	}
	waitEvents(t, h, map[string]string{"result": "hit", "user_id": "3"}, 1)
	// The record keeps the endpoint and the sticky-session fingerprint; the
	// list filters by both (new-api records filters).
	if ev := waitEvents(t, h, map[string]string{"endpoint": "/v1/messages", "session_fp": "fp-a"}, 1); ev[0].Endpoint != "/v1/messages" || ev[0].SessionFp != "fp-a" {
		t.Fatalf("record = %+v", ev[0].Event)
	}
	for _, q := range []map[string]string{{"session_fp": "fp-b"}, {"endpoint": "/v1/chat/completions"}} {
		if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", q, nil))); n != 0 {
			t.Fatalf("filter %v = %d", q, n)
		}
	}
	var w []Watch
	waitFor(t, "watch entry", func() bool {
		w = decodeData[[]Watch](t, h.Do("GET", "/watchlist", nil, nil))
		return len(w) == 1 && w[0].ViolationCount == 1
	})
	if w[0].Level != LevelObserve || w[0].Source != "auto" || w[0].ExpiresAt == nil {
		t.Fatalf("watch = %+v", w[0])
	}
	// The same request again (a retry) adds a record but not a violation:
	// since 0.8.0 it is decided by the cached hit (a replay), which does not
	// count as a hit of the watch entry either.
	mustHook(t, h, hookReqAs(3, "req-a", "MOD-HIT-sexual one"))
	if evs := waitEvents(t, h, map[string]string{"result": "hit", "user_id": "3"}, 2); !evs[0].Replayed || evs[1].Replayed {
		t.Fatalf("retry records replayed = %v %v", evs[0].Replayed, evs[1].Replayed)
	}
	time.Sleep(200 * time.Millisecond)
	if w := decodeData[[]Watch](t, h.Do("GET", "/watchlist", nil, nil)); w[0].ViolationCount != 1 || w[0].HitCount != 1 {
		t.Fatalf("after retry = %+v", w[0])
	}
	// enforce level: moderated before the upstream call and refused.
	decodeData[Watch](t, h.Do("PATCH", "/watchlist/3", nil, map[string]any{"level": LevelEnforce}))
	if p.watchLevel(3) != LevelEnforce {
		t.Fatal("watch snapshot not reloaded")
	}
	if r := mustHook(t, h, hookReqAs(3, "", "MOD-HIT-sexual two")); !denied(r) {
		t.Fatalf("enforce level not refused: %+v", r)
	}
	// The refused request is recorded (and its watch update done) before the
	// level changes again.
	waitEvents(t, h, map[string]string{"result": "block", "user_id": "3"}, 1)
	if r := mustHook(t, h, hookReqAs(4, "", "MOD-HIT-sexual two")); denied(r) {
		t.Fatalf("other user refused: %+v", r)
	}
	evs := decodeData[[]WatchEvent](t, h.Do("GET", "/watchlist/3/events", nil, nil))
	if len(evs) != 2 || evs[0].Action != "set_level" || evs[1].Action != "auto_add" {
		t.Fatalf("watch events = %+v", evs)
	}
	// Back at observe a new counting window starts: the count restarts and
	// the entry expires after watch_days again.
	back := decodeData[Watch](t, h.Do("PATCH", "/watchlist/3", nil, map[string]any{"level": LevelObserve}))
	if back.ViolationCount != 0 || back.ExpiresAt == nil {
		t.Fatalf("after level change = %+v", back)
	}
	// Under default enforce the entry's own level wins: the observe-level
	// user is still only moderated after the request, a user without an
	// entry before it (and joins the list at the enforce level).
	if errs := h.Configure(map[string]any{"mode": ModeEnforce}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	if r := mustHook(t, h, hookReqAs(3, "", "a harmless question under default enforce")); denied(r) || r.GetNote() != queuedNote {
		t.Fatalf("observe entry under default enforce = %+v", r)
	}
	if r := mustHook(t, h, hookReqAs(6, "", "MOD-HIT-sexual four")); !denied(r) {
		t.Fatalf("no entry under default enforce not refused: %+v", r)
	}
	waitFor(t, "enforce-level auto entry", func() bool { return p.watchLevel(6) == LevelEnforce })
	if errs := h.Configure(map[string]any{"mode": ModeObserve}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	review := func(rid, status string, want int) {
		t.Helper()
		var ids []int64
		for _, e := range waitEvents(t, h, map[string]string{"result": "hit", "user_id": "3", "request_id": rid}, 1) {
			ids = append(ids, e.ID)
		}
		decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": ids, "status": status}))
		if w := decodeData[[]Watch](t, h.Do("GET", "/watchlist", map[string]string{"user_id": "3"}, nil)); w[0].ViolationCount != want {
			t.Fatalf("%s %s: violations = %d, want %d", rid, status, w[0].ViolationCount, want)
		}
	}
	// A record of the old window does not touch the new count.
	review("req-a", "false_positive", 0)
	mustHook(t, h, hookReqAs(3, "req-b", "MOD-HIT-sexual three"))
	waitFor(t, "violation in the new window", func() bool {
		w := decodeData[[]Watch](t, h.Do("GET", "/watchlist", map[string]string{"user_id": "3"}, nil))
		return w[0].ViolationCount == 1
	})
	// A false positive of the current window takes its violation back; undoing
	// it counts it again.
	review("req-b", "false_positive", 0)
	review("req-b", "confirmed", 1)
	if r := h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 3}); r.GetStatus() != http.StatusConflict {
		t.Fatalf("duplicate add = %d", r.GetStatus())
	}
	if r := h.Do("DELETE", "/watchlist/3", nil, nil); r.GetStatus() != 200 || p.watchLevel(3) != "" {
		t.Fatalf("remove = %s", r.GetBody())
	}
}

func TestTwoStageFlowCacheAndFailOpen(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI}, []string{AuditorTypeSafe})
	// hate is an OpenAI category only: the Jev stage overturns it.
	if r := mustHook(t, h, hookReq("MOD-HIT-hate words")); denied(r) || !strings.Contains(r.GetNote(), "overturned") {
		t.Fatalf("overturn = %+v", r)
	}
	if r := mustHook(t, h, hookReq("MOD-HIT-sexual words")); !denied(r) {
		t.Fatalf("two-stage hit allowed: %+v", r)
	}
	ev := waitEvents(t, h, map[string]string{"result": "overturned"}, 1)
	if len(ev[0].HitCategories) != 1 || ev[0].HitCategories[0] != "hate" {
		t.Fatalf("overturned = %+v", ev[0])
	}
	d := decodeData[EventDetail](t, h.Do("GET", fmt.Sprintf("/events/%d", ev[0].ID), nil, nil))
	if d.Trace == nil || d.InputMessageSize == 0 {
		t.Fatalf("detail = %+v", d)
	}
	in := decodeData[map[string]any](t, h.Do("GET", fmt.Sprintf("/events/%d/input", ev[0].ID), nil, nil))
	if !strings.Contains(fmt.Sprint(in["messages"]), "MOD-HIT-hate") {
		t.Fatalf("input = %v", in)
	}
	// A clean pass is cached: the same text does not call upstream again.
	before := mod.count("/v1/moderations")
	mustHook(t, h, hookReq("clean text"))
	mustHook(t, h, hookReq("clean   text"))
	if got := mod.count("/v1/moderations") - before; got != 1 {
		t.Fatalf("moderation calls for a cached pass = %d", got)
	}
	// A review stage that errors is passed over: the first stage's hit
	// stands and the request is refused (it passed before 0.8.0).
	r := mustHook(t, h, hookReq("MOD-HIT-violence JEV-500 words"))
	if !denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"hit ") || !strings.Contains(r.GetNote(), "[violence]") {
		t.Fatalf("hit with a failed review stage = %+v", r)
	}
	blocked := waitEvents(t, h, map[string]string{"result": "block"}, 2)
	var kept *EventListItem
	for i := range blocked {
		if len(blocked[i].HitCategories) == 1 && blocked[i].HitCategories[0] == "violence" {
			kept = &blocked[i]
		}
	}
	if kept == nil {
		t.Fatalf("blocked = %+v", blocked)
	}
	var ktr Trace
	if err := json.Unmarshal(kept.Trace, &ktr); err != nil {
		t.Fatal(err)
	}
	if ktr.Final != Hit || ktr.Decider != 0 || !ktr.Errored || stagesOf(ktr) != "hit failed" || len(ktr.Stages[1].Outcomes) != 1 || ktr.Stages[1].Outcomes[0].ErrType == "" {
		t.Fatalf("trace = %s", kept.Trace)
	}
	// The record keeps the raw messages, as any record with a stage hit.
	if d := decodeData[EventDetail](t, h.Do("GET", fmt.Sprintf("/events/%d", kept.ID), nil, nil)); d.InputMessageSize == 0 {
		t.Fatalf("detail = %+v", d)
	}
	// Errors in every stage let the request pass and are recorded.
	if r := mustHook(t, h, hookReq("MOD-500 please")); denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"error ") {
		t.Fatalf("error = %+v", r)
	}
	errs := waitEvents(t, h, map[string]string{"result": "error"}, 1)
	var etr Trace
	if err := json.Unmarshal(errs[0].Trace, &etr); err != nil {
		t.Fatal(err)
	}
	if len(errs) != 1 || etr.Final != Pass || stagesOf(etr) != "failed failed" {
		t.Fatalf("error records = %d, trace = %s", len(errs), errs[0].Trace)
	}
	// A failed first stage is passed over too: the second stage reviews as
	// the first one, and its pass is a pass, not an error or an overturn.
	if r := mustHook(t, h, hookReq("OAI-500 calm words")); denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"pass ") {
		t.Fatalf("pass after a failed first stage = %+v", r)
	}
	waitFor(t, "the pass after a failed stage", func() bool {
		for _, it := range decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"result": "pass"}, nil)) {
			var tr Trace
			if json.Unmarshal(it.Trace, &tr) == nil && stagesOf(tr) == "failed pass" && tr.Errored && !tr.Overturned {
				return true
			}
		}
		return false
	})
	if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"result": "error"}, nil))); n != 1 {
		t.Fatalf("error records = %d", n)
	}
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	// Flow errors count the runs with a failed stage, whatever the result.
	if st.Today.Blocked != 2 || st.Today.Overturned != 1 || st.Today.Errors != 3 || !st.Runtime.Configured {
		t.Fatalf("status = %+v", st.Today)
	}
	res := decodeData[TestResult](t, h.Do("POST", "/test", nil, map[string]any{"text": "MOD-HIT-sexual", "flow_id": flow}))
	if res.Result != ResultHit || len(res.Categories) == 0 {
		t.Fatalf("test = %+v", res)
	}
}

func TestTestAndTryRoutes(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, map[string]any{"mode": ModeObserve})
	flow := setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAll, []string{AuditorOpenAI, AuditorTypeSafe})
	res := decodeData[TestResult](t, h.Do("POST", "/test", nil, map[string]any{"text": "MOD-HIT-sexual"}))
	if res.FlowID != flow || res.Result != ResultHit || len(res.Trace.Stages) != 1 || len(res.Trace.Stages[0].Outcomes) != 2 {
		t.Fatalf("test = %+v", res)
	}
	auds := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))
	if len(auds) != 2 || !auds[0].Usable || auds[1].RulesVersion != RulesVersionZH {
		t.Fatalf("auditors = %+v", auds)
	}
	try := decodeData[TryResult](t, h.Do("POST", fmt.Sprintf("/auditors/%d/try", auds[0].ID), nil, map[string]any{"text": "MOD-HIT-violence"}))
	if !try.Hit || try.TopCategory != "violence" {
		t.Fatalf("try = %+v", try)
	}
	chans := decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))
	ct := decodeData[ChannelTestResult](t, h.Do("POST", fmt.Sprintf("/channels/%d/test", chans[0].ID), nil, nil))
	if !ct.OK || ct.Model != "omni-mock" {
		t.Fatalf("channel test = %+v", ct)
	}
	// Nothing was recorded or counted by tests.
	if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", nil, nil))); n != 0 {
		t.Fatalf("events = %d", n)
	}
}

func TestConfigValidation(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, map[string]any{"mode": ModeObserve})
	flow := setupFlow(t, h, mod.srv.URL, []int64{0, 9}, CombineAny, []string{AuditorOpenAI})
	if r := h.Do("POST", "/channels", nil, map[string]any{"type": "openai_moderation", "name": "x", "base_url": "ftp://x"}); r.GetStatus() != 400 {
		t.Fatalf("bad base_url = %d", r.GetStatus())
	}
	chans := decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))
	if r := h.Do("POST", "/auditors", nil, map[string]any{"name": "j", "type": AuditorTypeSafe, "channel_id": chans[0].ID}); r.GetStatus() != 400 {
		t.Fatalf("type mismatch = %d %s", r.GetStatus(), r.GetBody())
	}
	// A question-table LLM auditor needs an llm channel.
	if r := h.Do("POST", "/auditors", nil, map[string]any{"name": "q", "type": AuditorLLMQuestions, "channel_id": chans[0].ID}); r.GetStatus() != 400 ||
		!strings.Contains(string(r.GetBody()), "type_mismatch") {
		t.Fatalf("llm_questions on an openai_moderation channel = %d %s", r.GetStatus(), r.GetBody())
	}
	if r := h.Do("POST", "/auditors", nil, map[string]any{"name": "q", "type": "llm", "channel_id": chans[0].ID}); r.GetStatus() != 400 ||
		!strings.Contains(string(r.GetBody()), "llm_questions") {
		t.Fatalf("unknown type = %d %s", r.GetStatus(), r.GetBody())
	}
	if r := h.Do("DELETE", fmt.Sprintf("/channels/%d", chans[0].ID), nil, nil); r.GetStatus() != http.StatusConflict {
		t.Fatalf("delete used channel = %d", r.GetStatus())
	}
	auds := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))
	if r := h.Do("DELETE", fmt.Sprintf("/auditors/%d", auds[0].ID), nil, nil); r.GetStatus() != http.StatusConflict {
		t.Fatalf("delete used auditor = %d", r.GetStatus())
	}
	if r := h.Do("PUT", fmt.Sprintf("/channels/%d", chans[0].ID), nil, map[string]any{"name": "x", "base_url": "https://elsewhere.example"}); r.GetStatus() != 400 ||
		!strings.Contains(string(r.GetBody()), "api_key") {
		t.Fatalf("host change without key = %d %s", r.GetStatus(), r.GetBody())
	}
	other := decodeData[FlowView](t, h.Do("POST", "/flows", nil, map[string]any{"name": "g", "draft": map[string]any{"stages": []any{map[string]any{"auditors": []int64{auds[0].ID}}}}}))
	if r := h.Do("PUT", fmt.Sprintf("/flows/%d/groups", other.ID), nil, map[string]any{"groups": []int64{9}}); r.GetStatus() != http.StatusConflict {
		t.Fatalf("group conflict = %d", r.GetStatus())
	}
	moved := decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/groups", other.ID), nil, map[string]any{"groups": []int64{9}, "force": true}))
	if len(moved.Groups) != 1 || moved.Groups[0] != 9 {
		t.Fatalf("moved = %+v", moved)
	}
	// Group 9 is bound to an unpublished flow: the binding does not apply
	// and the group falls back to the default flow, like an unbound group.
	if r := mustHook(t, h, hookReq("MOD-HIT-sexual bound")); r.GetNote() != queuedNote {
		t.Fatalf("group of an unpublished flow not on the default flow: %+v", r)
	}
	unbound := hookReq("MOD-HIT-sexual unbound")
	unbound.Meta.GroupId = 10
	if r := mustHook(t, h, unbound); r.GetNote() != queuedNote {
		t.Fatalf("unbound group not on the default flow: %+v", r)
	}
	if r := h.Do("POST", fmt.Sprintf("/flows/%d/publish", flow), nil, map[string]any{"expected_version": 0}); r.GetStatus() != http.StatusConflict {
		t.Fatalf("stale publish = %d", r.GetStatus())
	}
	if r := h.Do("PUT", fmt.Sprintf("/flows/%d", flow), nil, map[string]any{"name": "f", "draft": map[string]any{"stages": []any{map[string]any{"auditors": []int{999}}}}}); r.GetStatus() != 400 {
		t.Fatalf("missing auditor draft = %d", r.GetStatus())
	}
	decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/enabled", flow), nil, map[string]any{"enabled": false}))
	if r := mustHook(t, h, hookReq("MOD-HIT-sexual")); r.GetNote() != "" {
		t.Fatalf("disabled flow moderated: %+v", r)
	}
}

func TestBansExemptAndModeOff(t *testing.T) {
	mod := newFakeMod(t)
	// exempt_user_ids is the older name of the allowlist, imported on the
	// first start (upgradeOnce): user 8 is moderated after the request and
	// recorded, but never watched automatically, refused or banned.
	p, h, _ := startDB(t, map[string]any{"mode": ModeObserve, "ban_threshold": 2, "exempt_user_ids": []string{"8"}})
	setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	waitFor(t, "the imported list", func() bool { return p.userLock(8) == LockAllowlist })
	mustHook(t, h, hookReq("MOD-HIT-sexual 1"))
	mustHook(t, h, hookReq("MOD-HIT-sexual 2"))
	waitFor(t, "auto ban", func() bool { return p.isBlocked(3) })
	if r := mustHook(t, h, hookReq("hello")); !denied(r) || r.GetDenyCode() != DenyUserBlocked {
		t.Fatalf("banned user = %+v", r)
	}
	for i := 1; i <= 3; i++ {
		if r := mustHook(t, h, hookReqAs(8, "", fmt.Sprintf("MOD-HIT-sexual allowlisted %d", i))); denied(r) || r.GetNote() != queuedNote {
			t.Fatalf("allowlisted user = %+v", r)
		}
	}
	waitEvents(t, h, map[string]string{"result": "hit", "user_id": "8"}, 3)
	if p.isBlocked(8) {
		t.Fatal("allowlisted user banned")
	}
	if n := len(decodeData[[]Block](t, h.Do("GET", "/blocks", nil, nil))); n != 1 {
		t.Fatalf("blocks = %d, want only user 3", n)
	}
	// By hand an allowlisted user cannot be banned, nor watched: the user's
	// entry is locked (locks.go).
	if resp := h.Do("POST", "/blocks", nil, map[string]any{"user_id": 8}); resp.GetStatus() != 400 || !strings.Contains(string(resp.GetBody()), `"allowlisted"`) {
		t.Fatalf("ban of an allowlisted user = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if resp := h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 8}); resp.GetStatus() != 409 || p.watchLevel(8) != LevelObserve {
		t.Fatalf("watch of an allowlisted user = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if errs := h.Configure(map[string]any{"mode": ModeOff}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	if r := mustHook(t, h, hookReq("anything")); denied(r) {
		t.Fatalf("mode off denied: %+v", r)
	}
}

// The retention purge runs on the node holding the advisory lock and deletes
// in batches until nothing is left (new-api cleanup.go deleteRecordBatches).
func TestRetentionPurgeBatchesOnOneNode(t *testing.T) {
	p, _, _ := startDB(t, map[string]any{"mode": ModeObserve})
	ctx := context.Background()
	db, _ := p.db(ctx)
	defer func(b int, d time.Duration) { purgeBatch, purgePause = b, d }(purgeBatch, purgePause)
	purgeBatch, purgePause = 2, 0
	if _, err := db.Exec(ctx, `INSERT INTO events (user_id, mode, verdict, action, result, keep_until, created_at)
		SELECT 1, 'observe', 'pass', 'allow', 'pass', now() - interval '1 hour', now() - interval '2 days' FROM generate_series(1, 5)
		UNION ALL SELECT 1, 'observe', 'flag', 'allow', 'hit', now() + interval '1 day', now() - interval '200 days' FROM generate_series(1, 3)
		UNION ALL SELECT 1, 'observe', 'flag', 'allow', 'hit', now() + interval '1 day', now()`); err != nil {
		t.Fatal(err)
	}
	other, err := db.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := other.Exec(ctx, `SELECT pg_advisory_lock(`+purgeLockKey+`)`); err != nil {
		t.Fatal(err)
	}
	if n, err := p.purgeRetention(ctx, db, time.Now().UTC()); err != nil || n != 0 {
		t.Fatalf("purge while another node holds the lock = %d %v", n, err)
	}
	if _, err := other.Exec(ctx, `SELECT pg_advisory_unlock(`+purgeLockKey+`)`); err != nil {
		t.Fatal(err)
	}
	other.Release()
	if n, err := p.purgeRetention(ctx, db, time.Now().UTC()); err != nil || n != 8 {
		t.Fatalf("purge = %d %v, want 8", n, err)
	}
	var left int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM events`).Scan(&left); err != nil || left != 1 {
		t.Fatalf("left = %d %v, want the young hit", left, err)
	}
	// The purge let the lock go: another node can take it.
	var free bool
	if err := db.QueryRow(ctx, `SELECT pg_try_advisory_lock(`+purgeLockKey+`) AND pg_advisory_unlock(`+purgeLockKey+`)`).Scan(&free); err != nil || !free {
		t.Fatalf("lock after the purge free = %v %v", free, err)
	}
}

func TestCleanupAndImport(t *testing.T) {
	p, h, _ := startDB(t, map[string]any{"mode": ModeObserve})
	ctx := context.Background()
	db, _ := p.db(ctx)
	if _, err := db.Exec(ctx, `INSERT INTO events (user_id, mode, verdict, action, result, keep_until) VALUES
		(1,'observe','pass','allow','pass', now() - interval '1 hour'), (1,'observe','flag','allow','hit', now() + interval '1 day')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO events (user_id, mode, verdict, action, result, keep_until, request_id, created_at) VALUES
		(1,'observe','flag','allow','hit', now() + interval '170 days', 'aged-hit', now() - interval '10 days')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, expires_at) VALUES (5,'observe','auto', now() - interval '1 minute')`); err != nil {
		t.Fatal(err)
	}
	// A row a 0.1 node wrote after the migration: backfilled by the cleanup, a
	// flag becomes hit but never counts as a violation.
	if _, err := db.Exec(ctx, `INSERT INTO events (user_id, mode, verdict, action, request_id) VALUES (9,'observe','flag','allow','old-flag'), (9,'enforce','block','deny','old-block')`); err != nil {
		t.Fatal(err)
	}
	out, err := p.RunJob(ctx, &pluginv1.RunJobRequest{JobId: JobCleanup})
	if err != nil || !strings.Contains(out.GetMessage(), "deleted 1 events, 1 expired watch") {
		t.Fatalf("cleanup = %v %v", out, err)
	}
	var res string
	var keep time.Time
	if err := db.QueryRow(ctx, `SELECT result, keep_until FROM events WHERE request_id = 'old-flag'`).Scan(&res, &keep); err != nil || res != ResultHit || keep.Before(time.Now().Add(170*24*time.Hour)) {
		t.Fatalf("backfill = %s %v %v", res, keep, err)
	}
	if n, err := countViolations(ctx, db, 9, time.Now().Add(-time.Hour)); err != nil || n != 1 {
		t.Fatalf("violations = %d %v (0.1 flags must not count)", n, err)
	}
	// A shortened retention applies to the stored records at once, not only
	// to the keep_until of new ones (new-api cleanup.go).
	if errs := h.Configure(map[string]any{"mode": ModeObserve, "hit_retention_days": 5}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	waitFor(t, "retention cleanup", func() bool {
		var n int
		return db.QueryRow(ctx, `SELECT count(*) FROM events WHERE request_id = 'aged-hit'`).Scan(&n) == nil && n == 0
	})
	var left int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM events WHERE user_id = 1`).Scan(&left); err != nil || left != 1 {
		t.Fatalf("records younger than the retention = %d %v", left, err)
	}
	doc := map[string]any{"data": map[string]any{
		"channels":            []any{map[string]any{"type": "openai", "name": "omni", "base_url": "https://api.openai.com", "proxy": "socks5://x"}},
		"auditors":            []any{map[string]any{"name": "a", "type": "openai", "channel_ref": 0, "thresholds": map[string]float64{"sexual": 0.5}}},
		"analysis_guidelines": "  my guidelines  ",
		"flows":               []any{},
	}, "preview": true}
	prev := decodeData[map[string]any](t, h.Do("POST", "/import", nil, doc))
	if prev["channels"] != float64(1) || len(decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))) != 0 {
		t.Fatalf("preview = %v", prev)
	}
	// What the import does not read is reported, not dropped silently: the
	// analysis guidelines of a 0.9 export too (the AI analysis is gone).
	if _, ok := prev["analysis_guidelines"]; ok || fmt.Sprint(prev["unsupported"]) != "[analysis_guidelines flows channels[0].proxy]" {
		t.Fatalf("preview = %v", prev)
	}
	doc["preview"] = false
	decodeData[map[string]any](t, h.Do("POST", "/import", nil, doc))
	chans := decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))
	if len(chans) != 1 || chans[0].Enabled || chans[0].HasKey || chans[0].Model != "omni-moderation-latest" {
		t.Fatalf("imported = %+v", chans)
	}
	bad := map[string]any{"data": map[string]any{"auditors": []any{map[string]any{"name": "a", "type": "openai", "channel_ref": 3}}}}
	if r := h.Do("POST", "/import", nil, bad); r.GetStatus() != 400 {
		t.Fatalf("bad import = %d", r.GetStatus())
	}
	// new-api's question-table auditor (type llm) becomes llm_questions and
	// keeps its table; without one it uses the default set.
	table := map[string]any{"preamble": "p", "items": []any{map[string]any{"category": "sexual", "question": "q?", "threshold": 1}}}
	llmAuditor := map[string]any{"name": "judge", "type": "llm", "channel_ref": 0, "questions": table}
	llmDoc := map[string]any{"data": map[string]any{
		"channels": []any{map[string]any{"type": "llm", "protocol": "anthropic", "name": "claude", "base_url": "https://api.anthropic.com", "model": "claude-x"}},
		"auditors": []any{llmAuditor, map[string]any{"name": "judge default", "type": "llm", "channel_ref": 0}},
	}, "preview": true}
	before := len(decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil)))
	if prev := decodeData[map[string]any](t, h.Do("POST", "/import", nil, llmDoc)); prev["auditors"] != float64(2) || fmt.Sprint(prev["unsupported"]) != "[]" {
		t.Fatalf("llm preview = %v", prev)
	}
	if n := len(decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))); n != before {
		t.Fatalf("the preview stored %d auditors", n-before)
	}
	llmDoc["preview"] = false
	decodeData[map[string]any](t, h.Do("POST", "/import", nil, llmDoc))
	var typ, cfg, chType string
	if err := db.QueryRow(ctx, `SELECT a.type, a.config::text, c.type FROM auditors a JOIN channels c ON c.id = a.channel_id WHERE a.name = 'judge'`).Scan(&typ, &cfg, &chType); err != nil ||
		typ != AuditorLLMQuestions || chType != ChannelLLM || !strings.Contains(cfg, `"q?"`) {
		t.Fatalf("imported llm auditor = %s %s %s %v", typ, chType, cfg, err)
	}
	for _, a := range decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil)) {
		if a.Name == "judge default" && (a.Type != AuditorLLMQuestions || a.RulesVersion != RulesVersionZH) {
			t.Fatalf("imported llm auditor without a table = %+v", a)
		}
	}
	// Its image switch comes with it as it is: without one the stored
	// config has none (on), a false stays false.
	sw := func(name string) string {
		t.Helper()
		var v *string
		if err := db.QueryRow(ctx, `SELECT config->>'review_images' FROM auditors WHERE name = $1 AND deleted_at IS NULL`, name).Scan(&v); err != nil {
			t.Fatalf("auditor %s: %v", name, err)
		}
		if v == nil {
			return "unset"
		}
		return *v
	}
	seeing, blind := maps.Clone(llmAuditor), maps.Clone(llmAuditor)
	seeing["name"], seeing["review_images"] = "judge seeing", true
	blind["name"], blind["review_images"] = "judge blind", false
	llmDoc["data"].(map[string]any)["auditors"] = []any{seeing, blind}
	if got := decodeData[map[string]any](t, h.Do("POST", "/import", nil, llmDoc)); got["auditors"] != float64(2) || fmt.Sprint(got["unsupported"]) != "[]" {
		t.Fatalf("llm auditors with an image switch = %v", got)
	}
	if a, b, c := sw("judge"), sw("judge seeing"), sw("judge blind"); a != "unset" || b != "true" || c != "false" {
		t.Fatalf("imported image switches: none %s, true %s, false %s", a, b, c)
	}
	// It has no thresholds of its own, and it binds an llm channel only.
	for field, extra := range map[string]map[string]any{
		"auditors[0].config":      {"thresholds": map[string]float64{"sexual": 0.5}},
		"auditors[0].channel_ref": {"channel_ref": 1},
	} {
		a := maps.Clone(llmAuditor)
		maps.Copy(a, extra)
		doc := map[string]any{"data": map[string]any{"channels": []any{
			map[string]any{"type": "llm", "name": "claude", "base_url": "https://api.anthropic.com", "model": "claude-x"},
			map[string]any{"type": "typesafe", "name": "jev", "base_url": "https://api.typesafe.ai"},
		}, "auditors": []any{a}}, "preview": true}
		if r := h.Do("POST", "/import", nil, doc); r.GetStatus() != 400 || !strings.Contains(string(r.GetBody()), strings.TrimSpace(field)) {
			t.Fatalf("llm auditor with %v = %d %s", extra, r.GetStatus(), r.GetBody())
		}
	}
}

func TestConfigureRejectsNonObject(t *testing.T) {
	_, h := startNode(t, nil, nil)
	if errs := h.Configure(json.RawMessage(`[1]`), nil); len(errs) == 0 {
		t.Fatal("array settings accepted")
	}
}

func BenchmarkHookOff(b *testing.B) {
	p := New()
	req := hookReq("hello")
	ctx := context.Background()
	for i := 0; i < b.N; i++ {
		_, _ = p.OnGatewayRequest(ctx, req)
	}
}

// A synchronous run whose client leaves keeps going: a hit is still recorded
// (no escaping the watch list by disconnecting), a pass is not.
func TestPreCanceledClient(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, map[string]any{"mode": ModeEnforce, "record_pass": true, "verdict_cache_days": 0})
	setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	mod.delay.Store(int64(500 * time.Millisecond))
	for _, tc := range []struct{ id, text string }{{"cancel-hit", "MOD-HIT-sexual gone"}, {"cancel-pass", "clean and gone"}} {
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		r, err := p.OnGatewayRequest(ctx, hookReqAs(3, tc.id, tc.text))
		cancel()
		if err != nil || denied(r) {
			t.Fatalf("%s: canceled request = %+v %v", tc.id, r, err)
		}
	}
	// The late hit is a refusal like any other pre hit (new-api gate.go).
	waitEvents(t, h, map[string]string{"request_id": "cancel-hit", "result": "block"}, 1)
	time.Sleep(1500 * time.Millisecond)
	if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"request_id": "cancel-pass"}, nil))); n != 0 {
		t.Fatalf("canceled pass recorded %d times", n)
	}
	if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"request_id": "cancel-hit"}, nil))); n != 1 {
		t.Fatalf("canceled hit recorded %d times", n)
	}
	// Only the hit counts: one run, one refused request.
	if st := decodeData[Status](t, h.Do("GET", "/status", nil, nil)); st.Today.Audited != 1 || st.Today.Blocked != 1 {
		t.Fatalf("counted after the client left = %+v", st.Today)
	}
}

// A pre hit concluded after its client left is still stored when the
// plugin shuts down meanwhile: Shutdown waits for it before it stops the
// event writer.
func TestShutdownKeepsLatePreHit(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, map[string]any{"mode": ModeEnforce, "verdict_cache_days": 0})
	setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	mod.delay.Store(int64(500 * time.Millisecond))
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	r, err := p.OnGatewayRequest(ctx, hookReqAs(3, "late-hit", "MOD-HIT-sexual gone"))
	cancel()
	if err != nil || denied(r) {
		t.Fatalf("canceled request = %+v %v", r, err)
	}
	if err := p.Shutdown(context.Background()); err != nil {
		t.Fatal(err)
	}
	if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"request_id": "late-hit", "result": "block"}, nil))); n != 1 {
		t.Fatalf("late hit recorded %d times", n)
	}
}

// Migration 0010 can be applied again (DESIGN-2026-11-10 §11.3): every
// statement is idempotent, as are the migrations before it.
func TestMigration0010Idempotent(t *testing.T) {
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	dir := filepath.Join("..", "..", "migrations")
	pluginsdktest.ApplyMigrations(t, dsn, schema, dir)
	pluginsdktest.ApplyMigrations(t, dsn, schema, dir)
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	for _, c := range [][2]string{{"config_state", "cache_epoch"}, {"config_state", "parity_converted"}, {"events", "replayed"}, {"stats_hourly", "replayed"}} {
		var def *string
		var nullable string
		if err := conn.QueryRow(ctx, `SELECT column_default, is_nullable FROM information_schema.columns
			WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`, schema, c[0], c[1]).Scan(&def, &nullable); err != nil {
			t.Fatalf("%s.%s: %v", c[0], c[1], err)
		}
		if def == nil || nullable != "NO" {
			t.Fatalf("%s.%s: default %v nullable %s", c[0], c[1], def, nullable)
		}
	}
	// The time of the watch list conversion: unset until it ran.
	var typ, nullable string
	if err := conn.QueryRow(ctx, `SELECT data_type, is_nullable FROM information_schema.columns
		WHERE table_schema = $1 AND table_name = 'config_state' AND column_name = 'parity_converted_at'`, schema).Scan(&typ, &nullable); err != nil ||
		typ != "timestamp with time zone" || nullable != "YES" {
		t.Fatalf("config_state.parity_converted_at: %s nullable %s (%v)", typ, nullable, err)
	}
	var n int
	var def string
	if err := conn.QueryRow(ctx, `SELECT count(*), max(pg_get_constraintdef(c.oid)) FROM pg_constraint c
		JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace ns ON ns.oid = r.relnamespace
		WHERE ns.nspname = $1 AND r.relname = 'auditors' AND c.contype = 'c' AND pg_get_constraintdef(c.oid) LIKE '%type%'`, schema).Scan(&n, &def); err != nil {
		t.Fatal(err)
	}
	if n != 1 || !strings.Contains(def, "llm_questions") || !strings.Contains(def, "llm_verdict") {
		t.Fatalf("auditors type checks = %d: %s", n, def)
	}
	// The constraint takes the new type and still refuses unknown ones.
	insert := `INSERT INTO ` + pgx.Identifier{schema, "auditors"}.Sanitize() + ` (name, type, channel_id, config, created_at, updated_at) VALUES ('a', $1, $2, '{}', now(), now())`
	var chID int64
	if err := conn.QueryRow(ctx, `INSERT INTO `+pgx.Identifier{schema, "channels"}.Sanitize()+` (type, protocol, name, base_url, model, billing_model, timeout_ms, enabled, created_at, updated_at)
		VALUES ('llm', 'openai_chat', 'c', 'https://x', 'm', '', 15000, true, now(), now()) RETURNING id`).Scan(&chID); err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(ctx, insert, AuditorLLMQuestions, chID); err != nil {
		t.Fatalf("insert an llm_questions auditor: %v", err)
	}
	if _, err := conn.Exec(ctx, insert, "llm", chID); err == nil {
		t.Fatal("an unknown auditor type was stored")
	}
}

// A fallback stage that hits after the chain ended early: the request is
// refused (no panic), the record shows the spec stage, and the statistics
// count the stages by their number in the spec.
func TestFallbackStageHitEndToEnd(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, map[string]any{"mode": ModeEnforce, "record_pass": true})
	channels := map[string]int64{}
	auditor := func(typ string) int64 { return newAuditor(t, h, mod.srv.URL, typ, channels) }
	// Group 9: Jev, Jev, then OpenAI as a fallback stage. "hate" is an
	// OpenAI category only: stage 1 passes (stage 2 never runs) and the
	// fallback stage hits.
	jev1, jev2, oai := auditor(AuditorTypeSafe), auditor(AuditorTypeSafe), auditor(AuditorOpenAI)
	first := publishFlow(t, h, Spec{Stages: []Stage{stageOf(false, jev1), stageOf(false, jev2), stageOf(true, oai)}}, 9)
	// Group 10: OpenAI, Jev, then OpenAI as a fallback stage. Stage 1 hits,
	// stage 2 fails (JEV-500): the hit stands and the fallback does not run.
	oai1, jev3, oai2 := auditor(AuditorOpenAI), auditor(AuditorTypeSafe), auditor(AuditorOpenAI)
	second := publishFlow(t, h, Spec{Stages: []Stage{stageOf(false, oai1), stageOf(false, jev3), stageOf(true, oai2)}}, 10)

	r := mustHook(t, h, requestReq("fallback-hit", 9, "MOD-HIT-hate fallback words"))
	if !denied(r) || r.GetDenyCode() != DenyBlocked || !strings.Contains(r.GetNote(), "[hate]") {
		t.Fatalf("fallback hit = %+v", r)
	}
	r = mustHook(t, h, requestReq("failed-review", 10, "MOD-HIT-sexual JEV-500 words"))
	if !denied(r) || r.GetDenyCode() != DenyBlocked {
		t.Fatalf("hit with a failed review stage = %+v", r)
	}

	ev := recordOf(t, h, "fallback-hit")
	tr := traceOf(t, ev)
	if ev.Result != ResultBlock || tr.Decider != 1 || len(tr.Stages) != 2 || tr.Stages[0].Stage != 1 || tr.Stages[1].Stage != 3 || !tr.Stages[1].Fallback {
		t.Fatalf("record %s, trace %s", ev.Result, ev.Trace)
	}
	ev = recordOf(t, h, "failed-review")
	tr = traceOf(t, ev)
	if ev.Result != ResultBlock || tr.Decider != 0 || !tr.Errored || len(tr.Stages) != 2 || tr.Stages[1].Stage != 2 || !tr.Stages[1].Failed {
		t.Fatalf("record %s, trace %s", ev.Result, ev.Trace)
	}

	// The test route runs the same flow without a panic.
	res := decodeData[TestResult](t, h.Do("POST", "/test", nil, map[string]any{"text": "MOD-HIT-hate once more", "flow_id": first}))
	if res.Result != ResultHit || len(res.Categories) != 1 || res.Categories[0].Stage != 3 || res.Categories[0].Auditor != oai {
		t.Fatalf("test result = %+v", res)
	}

	// Funnel rows by spec stage: flow 1 has stages 1 and 3 (2 never ran),
	// flow 2 has stages 1 and 2.
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	funnel := map[int64]map[int]FunnelStage{}
	for _, f := range st.Funnels {
		funnel[f.FlowID] = map[int]FunnelStage{}
		for _, fs := range f.Stages {
			funnel[f.FlowID][fs.Stage] = fs
		}
	}
	if f := funnel[first]; len(f) != 2 || f[1].Received != 1 || f[1].Hit != 0 || f[3].Received != 1 || f[3].Hit != 1 {
		t.Fatalf("funnel of the fallback flow = %+v", f)
	}
	if f := funnel[second]; len(f) != 2 || f[1].Received != 1 || f[1].Hit != 1 || f[2].Received != 1 || f[2].Hit != 0 {
		t.Fatalf("funnel of the failed-review flow = %+v", f)
	}
	// The auditor rows are on the same stages: the fallback auditor on 3.
	trend := decodeData[TrendResult](t, h.Do("GET", "/stats/trend", map[string]string{"granularity": "hour"}, nil))
	stages := map[int64]int{}
	for _, at := range trend.Auditors {
		stages[at.AuditorID] = at.Stage
	}
	if stages[jev1] != 1 || stages[oai] != 3 || stages[oai1] != 1 || stages[jev3] != 2 || stages[jev2] != 0 || stages[oai2] != 0 {
		t.Fatalf("auditor rows by stage = %v", stages)
	}
}

// A panic while a queued job runs or is recorded does not end the plugin
// process: the job is recorded as an error and the workers go on.
func TestPostWorkerSurvivesPanic(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, map[string]any{"mode": ModeObserve, "record_pass": true, "record_errors": true})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	snap := p.snap.Load()
	m := &moderation{cfg: p.cfg.Load(), flow: snap.flows[flow], snap: snap, timing: TimingPost, queued: p.now(),
		chunks: []*chunk{nil}, // running it panics outside the flow's own recover
		rec: eventRec{At: p.now().UTC(), RequestID: "panics", UserID: 3, GroupID: 9, Timing: TimingPost, FlowID: flow, FlowVersion: 1,
			Protocol: "anthropic.messages", Mode: ModeObserve}}
	if !p.enqueue(m) {
		t.Fatal("job not queued")
	}
	ev := recordOf(t, h, "panics")
	if tr := traceOf(t, ev); ev.Result != ResultError || !tr.Errored || tr.Final != Pass {
		t.Fatalf("record of the panicked job = %s %s", ev.Result, ev.Trace)
	}
	// The workers still moderate, and the run was counted once.
	mustHook(t, h, hookReqAs(3, "after", "MOD-HIT-sexual after the panic"))
	if ev := recordOf(t, h, "after"); ev.Result != ResultHit {
		t.Fatalf("record after the panic = %s", ev.Result)
	}
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	if st.Today.Errors != 1 || st.Today.Audited != 2 {
		t.Fatalf("today = %+v", st.Today)
	}
	// A background task that panics is contained as well.
	done := make(chan struct{})
	p.goTracked(func() {
		defer close(done)
		panic("boom")
	})
	<-done
	mustHook(t, h, hookReqAs(3, "after-task", "clean text after the task"))
	recordOf(t, h, "after-task")
}

// The raw input message of a request is built only for a record that is
// written: a pass without a record costs none of it.
func TestFinishBuildsInputMessageOnlyForRecords(t *testing.T) {
	mod := newFakeMod(t)
	settings := func(recordPass bool) map[string]any {
		return map[string]any{"mode": ModeEnforce, "store_text": true, "record_pass_input_message": true, "record_pass": recordPass}
	}
	p, h, _ := startDB(t, settings(false))
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	// One user message with a 3 MiB inline image, different for each request
	// (the first one's pass is cached).
	const imgSize = 4 << 20 // of base64
	admit := func(rid string) *moderation {
		t.Helper()
		data := make([]byte, imgSize/4*3)
		copy(data, rid)
		img := b64(data)
		msgs, _ := json.Marshal([]any{map[string]any{"role": "user", "content": []any{
			map[string]any{"type": "text", "text": "a harmless picture for " + rid},
			map[string]any{"type": "image", "source": map[string]any{"type": "base64", "media_type": "image/png", "data": img}},
		}}})
		in := hookReqAs(3, rid, "")
		in.Fields[FieldMessages] = string(msgs)
		snap := p.snap.Load()
		m, early := p.admit(context.Background(), p.cfg.Load(), in, snap, snap.flows[flow], flowMatch{}, requestModel(in))
		if early != nil || len(m.chunks) != 1 || len(m.chunks[0].in.Images) != 1 {
			t.Fatalf("admit = %+v, %+v", m, early)
		}
		if got := len(m.chunks[0].messages()); got < imgSize {
			t.Fatalf("input message of %d bytes for an image of %d", got, imgSize)
		}
		return m
	}
	pass := Trace{Final: Pass, Decider: -1, Stages: []StageTrace{{Stage: 1, Result: Pass}}}
	allocated := func(fn func()) uint64 {
		var before, after runtime.MemStats
		runtime.GC()
		runtime.ReadMemStats(&before)
		fn()
		runtime.ReadMemStats(&after)
		return after.TotalAlloc - before.TotalAlloc
	}
	m := admit("no-record")
	finish := func(m *moderation) { // what a run does once it has its traces
		p.settleVerdicts(m, []Trace{pass})
		p.finish(m, pass, false)
	}
	if got := allocated(func() { finish(m) }); got > imgSize/4 {
		t.Fatalf("finishing a pass without a record allocated %d KiB (the image is %d KiB)", got>>10, imgSize>>10)
	}
	// With the record on, the same pass keeps its input message.
	if errs := h.Configure(settings(true), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	m = admit("with-record")
	finish(m)
	ev := recordOf(t, h, "with-record")
	if ev.Result != ResultPass || ev.InputMessageSize < imgSize {
		t.Fatalf("record = %s with an input message of %d bytes", ev.Result, ev.InputMessageSize)
	}
	if list := decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"request_id": "no-record"}, nil)); len(list) != 0 {
		t.Fatalf("a pass was recorded with record_pass off: %+v", list)
	}
}

// The verdicts of a pre run are stored by the run - also when its client has
// left, and once however many requests wait for it.
func TestPreRunStoresVerdictsOnce(t *testing.T) {
	mod := newFakeMod(t)
	kv := &kvFake{}
	p, h, fh := startDB(t, map[string]any{"mode": ModeEnforce}, withKV(kv))
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	calls := func() int64 { return mod.count("/v1/moderations") }

	// The client leaves while its run waits for the upstream: the pass is
	// cached all the same.
	arrived, release := mod.hold(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	answer := make(chan *pluginv1.GatewayRequestHookResponse, 1)
	go func() {
		r, _ := p.OnGatewayRequest(ctx, hookReqAs(3, "left", "clean and left behind"))
		answer <- r
	}()
	within(t, "the upstream call of the run", arrived)
	cancel()
	if r := within(t, "the answer to the client that left", answer); r == nil || denied(r) || r.GetNote() != notePrefix+"error canceled" {
		t.Fatalf("canceled request = %+v", r)
	}
	release()
	waitSegs(t, fh, "that passed", 1, passed)
	if r := mustHook(t, h, hookReqAs(3, "", "clean and left behind")); r.GetNote() != cachedPass || calls() != 1 {
		t.Fatalf("after the client left = %+v, calls %d", r, calls())
	}

	// Five requests share one run: its verdict is written once. The run is
	// held at the upstream until all five wait for it.
	written(t, p)
	kv.counts()
	arrived, release = mod.hold(t)
	notes := make(chan string, 5)
	for range 5 {
		go func() {
			note := "failed"
			if r, err := h.Hook.OnGatewayRequest(context.Background(), hookReqAs(3, "", "clean and asked five times")); err == nil {
				note = r.GetNote()
			}
			notes <- note
		}()
	}
	within(t, "the upstream call of the shared run", arrived)
	waitFor(t, "five requests waiting for one run", func() bool { return p.stats.preWaiting.Load() == 5 })
	release()
	for i := range 5 {
		if note := within(t, "the answers of the shared run", notes); !strings.HasPrefix(note, notePrefix+"pass flow=") {
			t.Fatalf("request %d = %q", i, note)
		}
	}
	if calls() != 2 {
		t.Fatalf("the five requests made %d runs", calls()-1)
	}
	// Every write of the run and of its waiters has been started by now.
	written(t, p)
	writes := kv.counts()
	if len(writes) != 1 {
		t.Fatalf("writes = %v", writes)
	}
	for key, n := range writes {
		if n != 1 {
			t.Fatalf("%s written %d times", key, n)
		}
	}
	if n := segCount(t, fh, passed); n != 2 {
		t.Fatalf("%d segment keys that passed", n)
	}
}

// logged reports whether the host got a log line with the message.
func logged(fh *pluginsdktest.FakeHost, message string) int {
	n := 0
	for _, e := range fh.Logs() {
		if strings.Contains(e.Message, message) {
			n++
		}
	}
	return n
}

// A panic in the shared run of the pre path does not end the plugin process
// either (singleflight would hand it to a goroutine nothing recovers in).
// Before the chunks have run the waiters get a run that errored: the request
// passes and is recorded as an error. Once the auditors have decided, their
// decision stands: a hit is refused and recorded as a block although handing
// it to the cache panicked - in the run, or in the write that follows the
// answer in the background, which has a recover of its own.
func TestPreRunSurvivesPanic(t *testing.T) {
	mod := newFakeMod(t)
	// Without the periodic refresh: nothing but this test reads the snapshot
	// while the test has taken it away (below).
	p, h, fh := startDB(t, map[string]any{"mode": ModeEnforce, "record_errors": true}, noRefreshTicks)
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	snap := p.snap.Load()
	job := func(rid string) *moderation {
		return &moderation{cfg: p.cfg.Load(), flow: snap.flows[flow], snap: snap, timing: TimingPre, key: "r:" + rid,
			rec: eventRec{At: p.now().UTC(), RequestID: rid, UserID: 3, GroupID: 9, Timing: TimingPre, FlowID: flow, FlowVersion: 1,
				Protocol: "anthropic.messages", Mode: ModeEnforce}}
	}
	// While the chunks run.
	running := job("panics-running")
	running.chunks = []*chunk{nil}
	r := p.runPre(context.Background(), running)
	if denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"error ") {
		t.Fatalf("panic while running = %+v", r)
	}
	ev := recordOf(t, h, "panics-running")
	if tr := traceOf(t, ev); ev.Result != ResultError || !tr.Errored || tr.Final != Pass {
		t.Fatalf("record of the panic while running = %s %s", ev.Result, ev.Trace)
	}
	waitFor(t, "the panic in the log", func() bool { return logged(fh, "pre run panicked") == 1 })

	// While the verdicts are handed to the cache (the node has no snapshot to
	// take the clear counter from), after the upstream judged the text a hit.
	hitJob := func(rid string, key byte) *moderation {
		m := job(rid)
		m.chunks = []*chunk{{in: &Input{Text: "MOD-HIT-sexual words"}, segs: []int{0}, parts: []chunkPart{{seg: 0, role: RoleUser, text: "MOD-HIT-sexual words"}}}}
		m.plan = &plan{keys: [][32]byte{{key}}, pieces: []int{1}}
		if c := p.cache.Load(); c != nil { // as the lookup of the request leaves it (planUncached)
			m.asked = c.reading(p.now())
		}
		return m
	}
	stood := func(rid string, r *pluginv1.GatewayRequestHookResponse) {
		t.Helper()
		if !denied(r) || r.GetDenyCode() != DenyBlocked || !strings.HasPrefix(r.GetNote(), notePrefix+"hit flow=") {
			t.Fatalf("%s = %+v", rid, r)
		}
		ev := recordOf(t, h, rid)
		if tr := traceOf(t, ev); ev.Result != ResultBlock || tr.Final != Hit || tr.Cache == nil || len(tr.Cache.Segs) != 1 {
			t.Fatalf("record of %s = %s %s", rid, ev.Result, ev.Trace)
		}
	}
	p.snap.Store(nil)
	r = p.runPre(context.Background(), hitJob("panics-storing", 1))
	p.snap.Store(snap)
	stood("panics-storing", r)
	waitFor(t, "the second panic in the log", func() bool { return logged(fh, "pre run panicked") == 2 })
	// While the verdicts are written, which is after the answer and in the
	// background (the node has no memory cache to put them in): the
	// panic ends there, the hit stands, and the write gives back its turn at
	// the keys - the next write of the same keys is made.
	cache := p.cache.Swap(nil)
	r = p.runPre(context.Background(), hitJob("panics-writing", 2))
	written(t, p)
	p.cache.Store(cache)
	stood("panics-writing", r)
	waitFor(t, "the panic of the write in the log", func() bool { return logged(fh, "background task panicked") == 1 })
	if n := logged(fh, "pre run panicked"); n != 2 {
		t.Fatalf("%d pre runs panicked", n)
	}
	r = p.runPre(context.Background(), hitJob("writes-again", 2))
	written(t, p)
	stood("writes-again", r)
	if hits, segs := kvCount(t, fh, "h:"), segCount(t, fh, pointed); hits != 1 || segs != 1 {
		t.Fatalf("after the write that was made again: %d hit entries, %d segment keys pointing to one", hits, segs)
	}
	// Nothing judged: an error. With the runs the result is their combination.
	two := &moderation{chunks: []*chunk{{}, {}}}
	if tr := afterPanic(nil, two.combine); tr.Final != Pass || !tr.Errored {
		t.Fatalf("no runs = %+v", tr)
	}
	runs := []Trace{{Final: Pass, Decider: -1}, {Final: Hit}, {Final: Hit, Errored: true}}
	if tr := afterPanic(runs, two.combine); tr.Final != Hit || tr.Chunk != 2 || len(tr.Chunks) != 2 {
		t.Fatalf("runs with a hit = %+v", tr)
	}
	// Combining panics as well: the first run that hit stands alone, with the
	// number of its chunk - the record names the hit set of that chunk, not of
	// the first one. Without a hit nothing judged.
	combined := 0
	panics := func([]Trace) Trace { combined++; panic("combining panicked") }
	tr := afterPanic(runs, panics)
	if combined != 1 || tr.Final != Hit || tr.Errored || tr.Chunk != 2 || len(tr.Chunks) != 0 || two.chunkOf(tr) != two.chunks[1] {
		t.Fatalf("combining panicked, runs with a hit = %+v (combine called %d times)", tr, combined)
	}
	if tr := afterPanic(runs[1:2], panics); tr.Final != Hit || tr.Chunk != 0 {
		t.Fatalf("combining panicked, one run = %+v", tr)
	}
	if tr := afterPanic(runs[:1], panics); tr.Final != Pass || !tr.Errored || tr.Chunk != 0 {
		t.Fatalf("combining panicked, no hit = %+v", tr)
	}
	if n := mod.count("/v1/moderations"); n != 3 { // the jobs after the first reached the upstream
		t.Fatalf("upstream calls = %d", n)
	}
	// The hook still moderates.
	if r := mustHook(t, h, hookReqAs(3, "after", "MOD-HIT-sexual after the panics")); !denied(r) {
		t.Fatalf("after the panics = %+v", r)
	}
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	if st.Today.Errors != 1 || st.Today.Audited != 5 {
		t.Fatalf("today = %+v", st.Today)
	}
}

// A panic while the result of a pre run is counted or recorded does not change
// the answer. Left to the SDK the hook would fail, and the core lets a request
// through whose hook failed - also one the auditors judged a hit, or a cached
// hit decides.
func TestHitStandsWhenRecordingPanics(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, map[string]any{"mode": ModeEnforce, "record_pass": true})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	// Without its event writer the plugin panics where a record is handed
	// over (finish, replay).
	setWriter := func(w *batch.Writer[eventRec]) {
		p.poolMu.Lock()
		p.eventWriter = w
		p.poolMu.Unlock()
	}
	writer := p.eventWriter
	setWriter(nil)
	defer setWriter(writer)
	const text = "MOD-HIT-sexual while recording panics"
	r := mustHook(t, h, hookReqAs(3, "hit", text))
	if !denied(r) || replayed(r) || r.GetDenyCode() != DenyBlocked || !strings.HasPrefix(r.GetNote(), notePrefix+"hit flow=") {
		t.Fatalf("a hit whose record panics = %+v", r)
	}
	if n := logged(fh, "concluding the pre run panicked"); n != 1 {
		t.Fatalf("%d panics logged", n)
	}
	// The cached hit, replayed.
	r = mustHook(t, h, hookReqAs(3, "replay", text))
	if !denied(r) || !replayed(r) || r.GetDenyCode() != DenyBlocked || mod.count("/v1/moderations") != 1 {
		t.Fatalf("a replay whose record panics = %+v", r)
	}
	if n := logged(fh, "replaying a cached hit panicked"); n != 1 {
		t.Fatalf("%d replay panics logged", n)
	}
	// A pass stays a pass.
	if r := mustHook(t, h, hookReqAs(3, "pass", "a harmless text while recording panics")); denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"pass flow=") {
		t.Fatalf("a pass whose record panics = %+v", r)
	}
	if n := logged(fh, "concluding the pre run panicked"); n != 2 {
		t.Fatalf("%d panics logged", n)
	}
	// With the writer back the hook records again.
	setWriter(writer)
	if r := mustHook(t, h, hookReqAs(3, "after", "MOD-HIT-sexual after the panics")); !denied(r) {
		t.Fatalf("after the panics = %+v", r)
	}
	if ev := recordOf(t, h, "after"); ev.Result != ResultBlock {
		t.Fatalf("record after the panics = %s", ev.Result)
	}
}

// A queued job that panics is counted once, whenever the panic comes: after
// the job was counted (while its record is written) nothing is counted or
// recorded again, and a panic while the error itself is recorded is
// contained and logged too.
func TestPostPanicIsCountedOnce(t *testing.T) {
	mod := newFakeMod(t)
	p, h, fh := startDB(t, map[string]any{"mode": ModeObserve, "record_pass": true, "record_errors": true})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	ctx := context.Background()
	job := func(rid string) *moderation {
		t.Helper()
		return queuedJob(t, p, flow, hookReqAs(3, rid, "MOD-HIT-sexual "+rid))
	}
	// Without its event writer the plugin panics where a record is handed
	// over: in finish, after the request was counted on the user's day.
	setWriter := func(w *batch.Writer[eventRec]) {
		p.poolMu.Lock()
		p.eventWriter = w
		p.poolMu.Unlock()
	}
	writer := p.eventWriter
	setWriter(nil)
	defer setWriter(writer)
	counted := job("counted")
	p.runPostSafely(counted)
	if !counted.counted || !counted.userCounted {
		t.Fatalf("the job panicked before it was counted: run %v, user %v", counted.counted, counted.userCounted)
	}
	// A job that panics before anything is counted, and again while its
	// error is recorded.
	uncounted := job("uncounted")
	uncounted.chunks = []*chunk{nil}
	p.runPostSafely(uncounted)
	setWriter(writer)

	// One hit and one error: on the flow and on the user's day.
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	if st.Today.Audited != 2 || st.Today.Errors != 1 {
		t.Fatalf("today = %+v", st.Today)
	}
	p.flushStats(ctx)
	db, _ := p.db(ctx)
	var audited, suspicious, errored int64
	if err := db.QueryRow(ctx, `SELECT coalesce(sum(audited), 0), coalesce(sum(suspicious), 0), coalesce(sum(errors), 0) FROM user_daily WHERE user_id = 3`).
		Scan(&audited, &suspicious, &errored); err != nil || audited != 2 || suspicious != 1 || errored != 1 {
		t.Fatalf("user day: audited %d, suspicious %d, errors %d (%v)", audited, suspicious, errored, err)
	}
	waitFor(t, "the panics in the log", func() bool {
		return logged(fh, "post run panicked") == 2 && logged(fh, "recording the panicked post run failed") == 1
	})
	// The workers go on.
	mustHook(t, h, hookReqAs(4, "after", "MOD-HIT-sexual after the panics"))
	if ev := recordOf(t, h, "after"); ev.Result != ResultHit {
		t.Fatalf("record after the panics = %s", ev.Result)
	}
}

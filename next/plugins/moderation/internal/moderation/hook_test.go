package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
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

// settingsMap is a 0.1 single-model setup (converted on first start).
func settingsMap(base string, mode string, extra map[string]any) map[string]any {
	m := map[string]any{"mode": mode, "base_url": base, "api_key": "sk-test", "model": "mod-model", "record_pass": true}
	for k, v := range extra {
		m[k] = v
	}
	return m
}

func mustHook(t *testing.T, h *pluginsdktest.Harness, req *pluginv1.GatewayRequestHookRequest) *pluginv1.GatewayRequestHookResponse {
	t.Helper()
	r, err := h.Hook.OnGatewayRequest(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func denied(r *pluginv1.GatewayRequestHookResponse) bool {
	return r.GetDecision() == pluginv1.GatewayRequestHookResponse_DECISION_DENY
}

// mockLLM answers like mock-upstream (CONTRACTS §20.9) through the tool.
func mockLLM(t *testing.T) *fakeLLM {
	return newFakeLLM(t, func(req fakeReq, _ int) (int, any) {
		return 200, toolCallResp("c1", ToolName, verdictFor(req.lastUser()))
	})
}

// fakeMod serves /v1/moderations and /v1/systemone: every category scores
// 0.01, a "MOD-HIT-<category>" token in the text scores it 0.99, MOD-500
// answers 500.
type fakeMod struct {
	srv   *httptest.Server
	calls sync.Map     // path -> *atomic.Int64
	delay atomic.Int64 // nanoseconds before answering
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
		body, _ := io.ReadAll(r.Body)
		text := string(body)
		if strings.Contains(text, "MOD-500") {
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

func startDB(t *testing.T, llm *fakeLLM, extra map[string]any, beforeInit ...func(*Plugin)) (*Plugin, *pluginsdktest.Harness, *pluginsdktest.FakeHost) {
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
	p := New()
	for _, configure := range beforeInit {
		configure(p)
	}
	var cfg any = extra
	if llm != nil {
		cfg = settingsMap(llm.srv.URL, ModeEnforce, extra)
	}
	h := pluginsdktest.Start(t, p, pluginsdktest.Options{Host: fh, SDK: sdkOpts(), Config: cfg})
	return p, h, fh
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

// setupFlow creates channels, auditors and a published flow bound to groups
// through the API. stages lists auditor types per stage; returns the flow id.
func setupFlow(t *testing.T, h *pluginsdktest.Harness, base string, groups []int64, combine string, stages ...[]string) int64 {
	t.Helper()
	channels := map[string]int64{}
	var spec Spec
	spec.ModelFilter.Type = FilterAll
	spec.SampleRate = 100
	for _, st := range stages {
		var ids []int64
		for _, typ := range st {
			chType := channelTypeOf[typ]
			if channels[chType] == 0 {
				ch := decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": chType, "name": chType, "base_url": base, "api_key": "key-" + chType}))
				channels[chType] = ch.ID
			}
			a := decodeData[AuditorView](t, h.Do("POST", "/auditors", nil, map[string]any{"name": typ, "type": typ, "channel_id": channels[chType]}))
			ids = append(ids, a.ID)
		}
		spec.Stages = append(spec.Stages, Stage{Auditors: ids, Combine: combine})
	}
	f := decodeData[FlowView](t, h.Do("POST", "/flows", nil, map[string]any{"name": "f", "draft": spec}))
	decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/groups", f.ID), nil, map[string]any{"groups": groups}))
	pub := decodeData[FlowView](t, h.Do("POST", fmt.Sprintf("/flows/%d/publish", f.ID), nil, map[string]any{"expected_version": 0}))
	if pub.Version != 1 || pub.Dirty {
		t.Fatalf("published = %+v", pub)
	}
	return f.ID
}

func TestLegacyConversion(t *testing.T) {
	llm := mockLLM(t)
	p, h, fh := startDB(t, llm, map[string]any{"group_ids": []int{9}, "model_patterns": []string{"claude-*"}})
	waitFor(t, "conversion", func() bool { return p.snap.Load().bound() })
	chans := decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))
	if len(chans) != 1 || chans[0].Type != ChannelLLM || chans[0].APIKeyTail != "test" || !chans[0].HasKey {
		t.Fatalf("channels = %+v", chans)
	}
	db, _ := p.db(context.Background())
	var enc []byte
	if err := db.QueryRow(context.Background(), `SELECT api_key_enc FROM channels`).Scan(&enc); err != nil || strings.Contains(string(enc), "sk-test") {
		t.Fatalf("key stored in clear: %v", err)
	}
	flows := decodeData[[]FlowView](t, h.Do("GET", "/flows", nil, nil))
	if len(flows) != 1 || flows[0].Version != 1 || len(flows[0].Groups) != 1 || flows[0].Groups[0] != 9 {
		t.Fatalf("flows = %+v", flows)
	}
	r := mustHook(t, h, hookReq("please MOD-BLOCK this"))
	if !denied(r) || r.GetDenyStatus() != 403 || r.GetDenyCode() != DenyBlocked || !strings.Contains(r.GetNote(), "hit flow=") {
		t.Fatalf("block = %+v", r)
	}
	if r := mustHook(t, h, hookReq("quicksort in Go")); denied(r) {
		t.Fatalf("pass denied: %+v", r)
	}
	other := hookReq("MOD-BLOCK other group")
	other.Meta.GroupId = 10
	if r := mustHook(t, h, other); denied(r) || r.GetNote() != "" {
		t.Fatalf("unbound group moderated: %+v", r)
	}
	ev := waitEvents(t, h, map[string]string{"result": "block"}, 1)
	if ev[0].Timing != TimingPre || ev[0].FlowVersion != 1 || ev[0].Verdict != VerdictBlock || ev[0].HighestCategory != "illegal" {
		t.Fatalf("event = %+v", ev[0])
	}
	// A second node on the same database does not convert again.
	fh2 := pluginsdktest.NewFakeHost()
	fh2.SetDSN(fh.DSNValue, fh.SchemaValue)
	p2 := New()
	pluginsdktest.Start(t, p2, pluginsdktest.Options{Host: fh2, SDK: sdkOpts(), Config: settingsMap(llm.srv.URL, ModeEnforce, nil)})
	waitFor(t, "second node snapshot", func() bool { return p2.snap.Load().bound() })
	if n := len(decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))); n != 1 {
		t.Fatalf("channels after second start = %d", n)
	}
}

func TestObserveWatchListAndEnforceLevel(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	first := hookReqAs(3, "req-a", "MOD-HIT-sexual one")
	first.Meta.SessionFingerprint = "fp-a"
	if r := mustHook(t, h, first); denied(r) || r.GetNote() != notePrefix+"queued" {
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
	// The same request again (a retry) adds a record but not a violation.
	mustHook(t, h, hookReqAs(3, "req-a", "MOD-HIT-sexual one"))
	waitEvents(t, h, map[string]string{"result": "hit", "user_id": "3"}, 2)
	time.Sleep(200 * time.Millisecond)
	if w := decodeData[[]Watch](t, h.Do("GET", "/watchlist", nil, nil)); w[0].ViolationCount != 1 || w[0].HitCount != 2 {
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
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
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
	// Errors let the request pass and are recorded.
	if r := mustHook(t, h, hookReq("MOD-500 please")); denied(r) || !strings.Contains(r.GetNote(), "error") {
		t.Fatalf("error = %+v", r)
	}
	waitEvents(t, h, map[string]string{"result": "error"}, 1)
	st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	if st.Today.Blocked != 1 || st.Today.Overturned != 1 || st.Today.Errors != 1 || !st.Runtime.Configured {
		t.Fatalf("status = %+v", st.Today)
	}
	res := decodeData[TestResult](t, h.Do("POST", "/test", nil, map[string]any{"text": "MOD-HIT-sexual", "flow_id": flow}))
	if res.Result != ResultHit || len(res.Categories) == 0 {
		t.Fatalf("test = %+v", res)
	}
}

func TestTestAndTryRoutes(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
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
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	flow := setupFlow(t, h, mod.srv.URL, []int64{0, 9}, CombineAny, []string{AuditorOpenAI})
	if r := h.Do("POST", "/channels", nil, map[string]any{"type": "openai_moderation", "name": "x", "base_url": "ftp://x"}); r.GetStatus() != 400 {
		t.Fatalf("bad base_url = %d", r.GetStatus())
	}
	chans := decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))
	if r := h.Do("POST", "/auditors", nil, map[string]any{"name": "j", "type": AuditorTypeSafe, "channel_id": chans[0].ID}); r.GetStatus() != 400 {
		t.Fatalf("type mismatch = %d %s", r.GetStatus(), r.GetBody())
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
	// Group 9 is bound to an unpublished flow: not moderated, no fallback to
	// the default flow; an unbound group still takes the default.
	if r := mustHook(t, h, hookReq("MOD-HIT-sexual bound")); r.GetNote() != "" {
		t.Fatalf("group of an unpublished flow moderated: %+v", r)
	}
	unbound := hookReq("MOD-HIT-sexual unbound")
	unbound.Meta.GroupId = 10
	if r := mustHook(t, h, unbound); r.GetNote() != notePrefix+"queued" {
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
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "ban_threshold": 2, "exempt_user_ids": []string{"8"}})
	setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	mustHook(t, h, hookReq("MOD-HIT-sexual 1"))
	mustHook(t, h, hookReq("MOD-HIT-sexual 2"))
	waitFor(t, "auto ban", func() bool { return p.isBlocked(3) })
	if r := mustHook(t, h, hookReq("hello")); !denied(r) || r.GetDenyCode() != DenyUserBlocked {
		t.Fatalf("banned user = %+v", r)
	}
	if r := mustHook(t, h, hookReqAs(8, "", "MOD-HIT-sexual")); r.GetNote() != "" {
		t.Fatalf("exempt user moderated: %+v", r)
	}
	for _, path := range []string{"/watchlist", "/blocks"} {
		if resp := h.Do("POST", path, nil, map[string]any{"user_id": 8}); resp.GetStatus() != 400 || !strings.Contains(string(resp.GetBody()), `"exempt"`) {
			t.Fatalf("exempt %s = %d %s", path, resp.GetStatus(), resp.GetBody())
		}
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
	p, _, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
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
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
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
		"channels": []any{map[string]any{"type": "openai", "name": "omni", "base_url": "https://api.openai.com"}},
		"auditors": []any{map[string]any{"name": "a", "type": "openai", "channel_ref": 0, "thresholds": map[string]float64{"sexual": 0.5}}},
	}, "preview": true}
	prev := decodeData[map[string]any](t, h.Do("POST", "/import", nil, doc))
	if prev["channels"] != float64(1) || len(decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))) != 0 {
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
}

func TestConfigureRejectsNonObject(t *testing.T) {
	h := pluginsdktest.Start(t, New(), pluginsdktest.Options{SDK: sdkOpts()})
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
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true, "cache_ttl_seconds": 0})
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
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "cache_ttl_seconds": 0})
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

package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

func sdkOpts() []pluginsdk.Option {
	return []pluginsdk.Option{pluginsdk.WithInfo("moderation", "0.1.1")}
}

var reqSeq struct {
	sync.Mutex
	n int
}

// hookReq builds an anthropic.messages hook request for user 3 / group 9.
func hookReq(text string) *pluginv1.GatewayRequestHookRequest {
	reqSeq.Lock()
	reqSeq.n++
	id := fmt.Sprintf("req-%d", reqSeq.n)
	reqSeq.Unlock()
	msg, _ := json.Marshal(map[string]any{"role": "user", "content": text})
	return &pluginv1.GatewayRequestHookRequest{
		Meta: &pluginv1.RequestMeta{RequestId: id, Protocol: "anthropic.messages", ClientProtocol: "anthropic.messages",
			Model: "claude-opus-5", UserId: 3, ApiKeyId: 5, GroupId: 9},
		Fields: map[string]string{FieldModel: `"claude-opus-5"`, FieldMessages: string(msg)},
	}
}

func settingsMap(base string, mode string, extra map[string]any) map[string]any {
	m := map[string]any{"mode": mode, "base_url": base, "api_key": "sk-test", "model": "mod-model", "record_pass": true}
	for k, v := range extra {
		m[k] = v
	}
	return m
}

func startHook(t *testing.T, cfg any) (*Plugin, *pluginsdktest.Harness) {
	t.Helper()
	p := New()
	h := pluginsdktest.Start(t, p, pluginsdktest.Options{SDK: sdkOpts(), Config: cfg})
	return p, h
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
	return newFakeLLM(t, func(req llmRequest, _ int) (int, any) {
		return 200, toolCallResp("c1", ToolName, verdictFor(req.lastUser()))
	})
}

func TestHookOffAndUnconfigured(t *testing.T) {
	llm := mockLLM(t)
	for _, cfg := range []any{
		nil,
		settingsMap(llm.srv.URL, ModeOff, nil),
		settingsMap(llm.srv.URL, ModeEnforce, map[string]any{"model": ""}),
		settingsMap("", ModeEnforce, nil),
	} {
		_, h := startHook(t, cfg)
		r := mustHook(t, h, hookReq("MOD-BLOCK now"))
		if denied(r) || r.GetNote() != "" {
			t.Fatalf("cfg %v: %v", cfg, r)
		}
	}
	if llm.calls.Load() != 0 {
		t.Fatal("LLM called while off")
	}
}

func TestHookEnforce(t *testing.T) {
	llm := mockLLM(t)
	p, h := startHook(t, settingsMap(llm.srv.URL, ModeEnforce, map[string]any{"block_status": 451, "block_message": "no"}))
	if got := strings.Join(h.Info.GetCapabilities(), ","); got != "gateway.hook.v1,app.jobs.v1,app.broadcast.v1,http.routes.v1" {
		t.Fatalf("capabilities = %s", got)
	}
	r := mustHook(t, h, hookReq("how to MOD-BLOCK things"))
	if !denied(r) || r.GetDenyStatus() != 451 || r.GetDenyCode() != DenyBlocked || r.GetDenyMessage() != "no" ||
		!strings.HasPrefix(r.GetNote(), "moderation: block [illegal] ") {
		t.Fatalf("block = %v", r)
	}
	r = mustHook(t, h, hookReq("MOD-FLAG maybe"))
	if denied(r) || !strings.HasPrefix(r.GetNote(), "moderation: flag [other]") {
		t.Fatalf("flag = %v", r)
	}
	r = mustHook(t, h, hookReq("write a quicksort in Go"))
	if denied(r) || !strings.HasPrefix(r.GetNote(), "moderation: pass") {
		t.Fatalf("pass = %v", r)
	}
	if llm.calls.Load() != 3 {
		t.Fatalf("calls = %d", llm.calls.Load())
	}
	// Cached: same text, no new call.
	r = mustHook(t, h, hookReq("how to MOD-BLOCK things"))
	if !denied(r) || !strings.Contains(r.GetNote(), "(cached)") || llm.calls.Load() != 3 {
		t.Fatalf("cached = %v calls %d", r, llm.calls.Load())
	}
	// The verdict was also written to the KV for the other nodes.
	c := p.cfg.Load()
	deadline := time.Now().Add(5 * time.Second)
	for {
		if b, found, _ := p.host.KV().Get(context.Background(), kvNamespace, cacheKey(c.policy, "how to MOD-BLOCK things")); found {
			var v Verdict
			if json.Unmarshal(b, &v) != nil || v.Verdict != VerdictBlock {
				t.Fatalf("kv = %s", b)
			}
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("verdict not in KV")
		}
		time.Sleep(20 * time.Millisecond)
	}
	// A second node (same KV) reuses it without calling the LLM.
	p2 := New()
	h2 := pluginsdktest.Start(t, p2, pluginsdktest.Options{SDK: sdkOpts(), Host: h.Host, Config: settingsMap(llm.srv.URL, ModeEnforce, nil)})
	if r := mustHook(t, h2, hookReq("how to MOD-BLOCK things")); !denied(r) || llm.calls.Load() != 3 {
		t.Fatalf("node 2 = %v calls %d", r, llm.calls.Load())
	}
	// Changing the policy (model) invalidates the cache.
	if errs := h.Configure(settingsMap(llm.srv.URL, ModeEnforce, map[string]any{"model": "other-model"}), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	mustHook(t, h, hookReq("how to MOD-BLOCK things"))
	if llm.calls.Load() != 4 {
		t.Fatalf("policy change must miss the cache: calls %d", llm.calls.Load())
	}
	health, err := h.Plugin.Health(context.Background(), &pluginv1.HealthRequest{})
	m := health.GetMetrics()
	if err != nil || m["calls"] != 4 || m["cache_hits"] != 1 || m["errors"] != 0 {
		t.Fatalf("health = %v %v", m, err)
	}
}

func TestHookFilters(t *testing.T) {
	llm := mockLLM(t)
	p, h := startHook(t, settingsMap(llm.srv.URL, ModeEnforce, map[string]any{
		"exempt_user_ids": []string{"4"}, "group_ids": []int{9}, "model_patterns": []string{"claude-*"}, "min_chars": 5,
	}))
	req := func(mut func(*pluginv1.GatewayRequestHookRequest)) *pluginv1.GatewayRequestHookRequest {
		r := hookReq("MOD-BLOCK please")
		mut(r)
		return r
	}
	for name, r := range map[string]*pluginv1.GatewayRequestHookRequest{
		"exempt user":   req(func(r *pluginv1.GatewayRequestHookRequest) { r.Meta.UserId = 4 }),
		"other group":   req(func(r *pluginv1.GatewayRequestHookRequest) { r.Meta.GroupId = 10 }),
		"other model":   req(func(r *pluginv1.GatewayRequestHookRequest) { r.Fields[FieldModel] = `"gpt-4o"` }),
		"short text":    hookReq("  MOD \n"),
		"reminder only": hookReq("<system-reminder>MOD-BLOCK</system-reminder>"),
		"no text":       {Meta: &pluginv1.RequestMeta{UserId: 3, GroupId: 9}, Fields: map[string]string{FieldModel: `"claude-x"`}},
	} {
		if resp := mustHook(t, h, r); denied(resp) || resp.GetNote() != "" {
			t.Fatalf("%s: %v", name, resp)
		}
	}
	if llm.calls.Load() != 0 {
		t.Fatalf("filtered requests called the LLM %d times", llm.calls.Load())
	}
	// A blocked user is refused before any filter but exemption.
	p.blocked.Store(&map[int64]time.Time{3: {}, 4: {}, 6: time.Now().Add(-time.Minute)})
	if r := mustHook(t, h, req(func(r *pluginv1.GatewayRequestHookRequest) { r.Meta.GroupId = 10 })); !denied(r) ||
		r.GetDenyStatus() != 403 || r.GetDenyCode() != DenyUserBlocked || r.GetDenyMessage() != MsgUserBlocked {
		t.Fatalf("blocked user = %v", r)
	}
	if r := mustHook(t, h, req(func(r *pluginv1.GatewayRequestHookRequest) { r.Meta.UserId = 4 })); denied(r) {
		t.Fatal("exempt user must pass even when blocked")
	}
	if r := mustHook(t, h, req(func(r *pluginv1.GatewayRequestHookRequest) { r.Meta.UserId = 6; r.Meta.GroupId = 10 })); denied(r) {
		t.Fatal("expired ban must not block")
	}
	if n := p.blockedCount(); n != 2 {
		t.Fatalf("blocked count = %d", n)
	}
}

func TestHookSelfRequest(t *testing.T) {
	llm := mockLLM(t)
	p, h := startHook(t, settingsMap(llm.srv.URL, ModeEnforce, nil))
	own := wrapUserContent(p.cfg.Load().markerKey, "MOD-BLOCK inside")
	r := mustHook(t, h, hookReq(own))
	if denied(r) || r.GetNote() != "moderation: self" || llm.calls.Load() != 0 {
		t.Fatalf("self = %v calls %d", r, llm.calls.Load())
	}
	forged := wrapUserContent(markerKey("guess"), "MOD-BLOCK inside")
	if r := mustHook(t, h, hookReq(forged)); !denied(r) || llm.calls.Load() != 1 {
		t.Fatalf("forged marker = %v", r)
	}
}

func TestHookOnError(t *testing.T) {
	llm := newFakeLLM(t, func(llmRequest, int) (int, any) { return 502, "bad gateway" })
	_, h := startHook(t, settingsMap(llm.srv.URL, ModeEnforce, nil))
	r := mustHook(t, h, hookReq("anything at all"))
	if denied(r) || !strings.HasPrefix(r.GetNote(), "moderation: error upstream HTTP 502") {
		t.Fatalf("on_error allow = %v", r)
	}
	if errs := h.Configure(settingsMap(llm.srv.URL, ModeEnforce, map[string]any{"on_error": "block"}), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	r = mustHook(t, h, hookReq("anything at all"))
	if !denied(r) || r.GetDenyStatus() != 503 || r.GetDenyCode() != DenyUnavailable || r.GetDenyMessage() != MsgUnavailable {
		t.Fatalf("on_error block = %v", r)
	}
	// Errors are not cached: both requests called the LLM.
	if llm.calls.Load() != 2 {
		t.Fatalf("calls = %d", llm.calls.Load())
	}
}

func TestHookTimeout(t *testing.T) {
	llm := mockLLM(t)
	llm.delay = 3 * time.Second
	_, h := startHook(t, settingsMap(llm.srv.URL, ModeEnforce, map[string]any{"timeout_ms": 1000, "on_error": "block"}))
	start := time.Now()
	r := mustHook(t, h, hookReq("slow one"))
	if el := time.Since(start); el > 2500*time.Millisecond {
		t.Fatalf("hook took %v", el)
	}
	if !denied(r) || r.GetDenyCode() != DenyUnavailable || !strings.Contains(r.GetNote(), "timeout") {
		t.Fatalf("timeout = %v", r)
	}
}

func TestHookConcurrencyAndSingleflight(t *testing.T) {
	llm := mockLLM(t)
	llm.delay = 300 * time.Millisecond
	p, h := startHook(t, settingsMap(llm.srv.URL, ModeEnforce, map[string]any{"max_concurrency": 1, "timeout_ms": 1000}))
	// Same text, concurrently: one upstream run.
	var wg sync.WaitGroup
	results := make([]*pluginv1.GatewayRequestHookResponse, 5)
	for i := range results {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			results[i] = mustHook(t, h, hookReq("same MOD-BLOCK text"))
		}(i)
	}
	wg.Wait()
	for _, r := range results {
		if !denied(r) {
			t.Fatalf("shared verdict = %v", r)
		}
	}
	if llm.calls.Load() != 1 {
		t.Fatalf("singleflight: calls = %d", llm.calls.Load())
	}
	// max_concurrency 1: distinct texts queue for the slot; waiting counts
	// toward timeout_ms, so the later ones time out (on_error allow).
	for i := range results {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			results[i] = mustHook(t, h, hookReq(fmt.Sprintf("distinct %d", i)))
		}(i)
	}
	wg.Wait()
	var timeouts int
	for _, r := range results {
		if strings.Contains(r.GetNote(), "timeout") {
			timeouts++
		}
	}
	if timeouts == 0 || timeouts == len(results) {
		t.Fatalf("expected some requests to wait out their timeout, got %d of %d", timeouts, len(results))
	}
	if p.stats.inflight.Load() != 0 {
		t.Fatalf("inflight = %d", p.stats.inflight.Load())
	}
}

func TestHookObserve(t *testing.T) {
	llm := mockLLM(t)
	p, h := startHook(t, settingsMap(llm.srv.URL, ModeObserve, nil))
	r := mustHook(t, h, hookReq("observe MOD-BLOCK"))
	if denied(r) || r.GetNote() != "moderation: queued" {
		t.Fatalf("observe = %v", r)
	}
	// The worker moderates asynchronously and caches the verdict.
	deadline := time.Now().Add(5 * time.Second)
	for llm.calls.Load() == 0 || p.cache.len() == 0 {
		if time.Now().After(deadline) {
			t.Fatal("observe job not processed")
		}
		time.Sleep(10 * time.Millisecond)
	}
	r = mustHook(t, h, hookReq("observe MOD-BLOCK"))
	if denied(r) || !strings.HasPrefix(r.GetNote(), "moderation: block [illegal] (cached)") {
		t.Fatalf("observe cached = %v", r)
	}
	// A banned user is refused in observe mode too.
	p.blocked.Store(&map[int64]time.Time{3: {}})
	if r := mustHook(t, h, hookReq("hello there")); !denied(r) || r.GetDenyCode() != DenyUserBlocked {
		t.Fatalf("observe banned = %v", r)
	}
}

func TestHookObserveQueueFull(t *testing.T) {
	llm := mockLLM(t)
	llm.delay = 500 * time.Millisecond
	p, h := startHook(t, settingsMap(llm.srv.URL, ModeObserve, map[string]any{"max_concurrency": 1, "queue_size": 1}))
	var dropped int
	for i := 0; i < 5; i++ {
		if r := mustHook(t, h, hookReq(fmt.Sprintf("text number %d", i))); strings.Contains(r.GetNote(), "dropped") {
			dropped++
		}
	}
	if dropped < 2 || p.stats.dropped.Load() != int64(dropped) {
		t.Fatalf("dropped = %d (stat %d)", dropped, p.stats.dropped.Load())
	}
	_, qcap := p.queueLen()
	if qcap != 1 {
		t.Fatalf("queue cap = %d", qcap)
	}
	// Resize on Configure.
	if errs := h.Configure(settingsMap(llm.srv.URL, ModeObserve, map[string]any{"max_concurrency": 4, "queue_size": 50}), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	if _, qcap := p.queueLen(); qcap != 50 || p.pool.workers != 4 || cap(p.sem.Load().ch) != 4 {
		t.Fatalf("resized: cap %d workers %d sem %d", qcap, p.pool.workers, cap(p.sem.Load().ch))
	}
}

func TestSampleRate(t *testing.T) {
	llm := mockLLM(t)
	_, h := startHook(t, settingsMap(llm.srv.URL, ModeEnforce, map[string]any{"sample_rate": 1}))
	checked := 0
	for i := 0; i < 50; i++ {
		if mustHook(t, h, hookReq(fmt.Sprintf("sampled text %d", i))).GetNote() != "" {
			checked++
		}
	}
	if checked > 10 || int64(checked) != llm.calls.Load() {
		t.Fatalf("1%% sampling moderated %d of 50 (calls %d)", checked, llm.calls.Load())
	}
}

func TestRoutesWithoutDB(t *testing.T) {
	llm := mockLLM(t)
	_, h := startHook(t, nil)
	if r := h.Do("POST", "/test", nil, map[string]any{"text": "hello"}); r.GetStatus() != 400 || !strings.Contains(string(r.GetBody()), "not_configured") {
		t.Fatalf("unconfigured test = %d %s", r.GetStatus(), r.GetBody())
	}
	if errs := h.Configure(settingsMap(llm.srv.URL, ModeOff, nil), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	if r := h.Do("POST", "/test", nil, map[string]any{"text": "  "}); r.GetStatus() != 400 || !strings.Contains(string(r.GetBody()), "invalid_argument") {
		t.Fatalf("empty text = %d %s", r.GetStatus(), r.GetBody())
	}
	if r := h.Do("POST", "/test", nil, "{"); r.GetStatus() != 400 {
		t.Fatalf("bad json = %d", r.GetStatus())
	}
	// The test works with mode off (only needs the connection settings),
	// bypasses the cache and returns the transcript.
	var out struct {
		Data TestResult `json:"data"`
	}
	for i := 0; i < 2; i++ {
		r := h.Do("POST", "/test", nil, map[string]any{"text": "MOD-BLOCK test"})
		if r.GetStatus() != 200 || json.Unmarshal(r.GetBody(), &out) != nil {
			t.Fatalf("test = %d %s", r.GetStatus(), r.GetBody())
		}
	}
	d := out.Data
	if d.Verdict != VerdictBlock || strings.Join(d.Categories, ",") != "illegal" || d.Turns != 1 || d.Usage.PromptTokens != 100 ||
		len(d.Transcript) != 3 || llm.calls.Load() != 2 {
		t.Fatalf("test result = %+v calls %d", d, llm.calls.Load())
	}
	var defaults struct {
		Data struct {
			SystemPrompt string     `json:"system_prompt"`
			Categories   []Category `json:"categories"`
		} `json:"data"`
	}
	r := h.Do("GET", "/defaults", nil, nil)
	if r.GetStatus() != 200 || json.Unmarshal(r.GetBody(), &defaults) != nil ||
		!strings.Contains(defaults.Data.SystemPrompt, "{{categories}}") || len(defaults.Data.Categories) != 12 {
		t.Fatalf("defaults = %s", r.GetBody())
	}
	for _, path := range []string{"/overview", "/events", "/blocks"} {
		if r := h.Do("GET", path, nil, nil); r.GetStatus() != 503 {
			t.Fatalf("%s without db = %d", path, r.GetStatus())
		}
	}
	if r := h.Do("GET", "/overview", map[string]string{"range": "1y"}, nil); r.GetStatus() != 400 {
		t.Fatalf("bad range = %d", r.GetStatus())
	}
	if r := h.Do("GET", "/events", map[string]string{"verdict": "nope", "page_size": "500", "user_id": "x", "from": "yesterday"}, nil); r.GetStatus() != 400 ||
		strings.Count(string(r.GetBody()), `"field"`) != 4 {
		t.Fatalf("bad filters = %d %s", r.GetStatus(), r.GetBody())
	}
	if _, err := h.App.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: JobCleanup}); err == nil {
		t.Fatal("cleanup without database must fail")
	}
	if _, err := h.App.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: "nope"}); err == nil {
		t.Fatal("unknown job must fail")
	}
	if err := h.Deliver(TopicBlocksChanged, nil, "node-2"); err == nil {
		t.Fatal("reload without database should fail")
	}
}

func TestConfigureRejectsNonObject(t *testing.T) {
	_, h := startHook(t, nil)
	if errs := h.Configure(`[1,2]`, nil); len(errs) != 1 || errs[0].GetCode() != "invalid_json" {
		t.Fatalf("errs = %v", errs)
	}
	if errs := h.Configure(`{"mode":"off"}`, nil); len(errs) != 0 {
		t.Fatalf("errs = %v", errs)
	}
}

// BenchmarkHookOff measures the fast path when moderation is off.
func BenchmarkHookOff(b *testing.B) {
	p := New()
	req := hookReq("some prompt text")
	ctx := context.Background()
	b.ReportAllocs()
	for b.Loop() {
		if _, err := p.OnGatewayRequest(ctx, req); err != nil {
			b.Fatal(err)
		}
	}
}

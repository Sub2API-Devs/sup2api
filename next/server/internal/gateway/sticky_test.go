package gateway

import (
	"context"
	"strconv"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func (e *env) stickyStats(rule string) map[string]string {
	e.t.Helper()
	m, err := e.rdb.HGetAll(context.Background(), stickyStatsKey(rule)).Result()
	if err != nil {
		e.t.Fatal(err)
	}
	return m
}

func TestStickyHitAndRebind(t *testing.T) {
	e := newEnv(t)
	e.enableSticky(onFailureFailover)
	// Make account 2 the normal choice after the first binding, to prove
	// the binding (not priority) decides.
	sess := withSession(body(testModel, false), "user_abc_account__session_1")
	if r := e.messages(sess); r.status != 200 {
		t.Fatalf("first: %d", r.status)
	}
	rec := e.record()
	if rec.StickyRule != "claude-code-session" || rec.StickyHit {
		t.Fatalf("first request sticky: %+v", rec)
	}
	first := e.up.last().key
	e.accounts.mu.Lock()
	e.accounts.accounts[2].Priority = 0 // would win without the binding
	e.accounts.mu.Unlock()
	for i := 0; i < 3; i++ {
		e.messages(sess)
		if rec := e.record(); !rec.StickyHit {
			t.Fatalf("request %d not a sticky hit", i)
		}
		if k := e.up.last().key; k != first {
			t.Fatalf("session moved to %s (bound %s)", k, first)
		}
	}
	st := e.stickyStats("claude-code-session")
	if st["hits"] != "3" || st["misses"] != "1" {
		t.Fatalf("stats %v", st)
	}
	// Bound account fails -> failover and rebind.
	e.up.set(first, &upstreamRule{status: 529})
	if r := e.messages(sess); r.status != 200 {
		t.Fatalf("failover: %d", r.status)
	}
	moved := e.up.last().key
	e.record()
	if moved == first {
		t.Fatal("did not fail over")
	}
	if st := e.stickyStats("claude-code-session"); st["rebinds"] != "1" {
		t.Fatalf("rebinds %v", st)
	}
	e.up.set(first, nil)
	e.messages(sess)
	e.record()
	if k := e.up.last().key; k != moved {
		t.Fatalf("after rebind went to %s, want %s", k, moved)
	}
	// A different session is independent; a request without session is not sticky.
	e.messages(body(testModel, false))
	if rec := e.record(); rec.StickyRule != "" {
		t.Fatalf("no-session request got sticky rule %q", rec.StickyRule)
	}
}

func TestStickyKeyFormatAndTTL(t *testing.T) {
	e := newEnv(t)
	e.enableSticky(onFailureFailover)
	e.messages(withSession(body(testModel, false), "s-1"))
	e.record()
	keys := e.mr.Keys()
	var binding string
	for _, k := range keys {
		if strings.HasPrefix(k, "sticky:claude-code-session:") {
			binding = k
		}
	}
	want := stickyKey(&stickyRule{Name: "claude-code-session", KeyIncludes: []string{"group", "model", "rule"}}, testGroup, testModel, "s-1")
	if binding != want || !strings.HasPrefix(binding, "sticky:claude-code-session:3:"+testModel+":") {
		t.Fatalf("binding key %q, want %q (keys %v)", binding, want, keys)
	}
	if ttl := e.mr.TTL(binding); ttl <= 0 || ttl > 3600e9 {
		t.Fatalf("ttl %v", ttl)
	}
	if v, _ := e.mr.Get(binding); v != "1" {
		t.Fatalf("bound to %q", v)
	}
	// keyIncludes without model/group collapses those dimensions.
	k := stickyKey(&stickyRule{Name: "r", KeyIncludes: []string{"rule"}}, 9, "m", "v")
	if !strings.HasPrefix(k, "sticky:r:_:_:") {
		t.Fatalf("key %s", k)
	}
}

func TestStickyOnFailureStick(t *testing.T) {
	e := newEnv(t)
	e.enableSticky(onFailureStick)
	sess := withSession(body(testModel, false), "stick-session")
	e.messages(sess)
	e.record()
	bound := e.up.last().key
	e.up.set(bound, &upstreamRule{status: 529})
	n := len(e.up.keys())
	r := e.messages(sess)
	if r.status != 529 {
		t.Fatalf("stick should return the upstream error: %d %s", r.status, r.body)
	}
	if got := len(e.up.keys()) - n; got != 1 {
		t.Fatalf("stick rule failed over (%d upstream calls)", got)
	}
	if rec := e.record(); !rec.StickyHit || rec.Success {
		t.Fatalf("record %+v", rec)
	}
}

func TestStickyBindingDroppedWhenAccountDisabled(t *testing.T) {
	e := newEnv(t)
	e.enableSticky(onFailureFailover)
	sess := withSession(body(testModel, false), "disable-session")
	e.messages(sess)
	e.record()
	key := stickyKey(e.gw.rules.override[0], testGroup, testModel, "disable-session")
	if !e.mr.Exists(key) {
		t.Fatal("no binding")
	}
	// 401 disables the bound account; the binding is dropped, then rebound.
	e.up.set("acc-1", &upstreamRule{status: 401})
	e.messages(sess)
	e.record()
	if v, _ := e.mr.Get(key); v != "2" {
		t.Fatalf("binding after disable = %q", v)
	}
	// Admin disables account 2 out of band: binding deleted at pick time.
	e.accounts.Disable(context.Background(), 2, "admin")
	e.messages(sess)
	e.record()
	if v, _ := e.mr.Get(key); v != "3" {
		t.Fatalf("binding after admin disable = %q", v)
	}
	if st := e.stickyStats("claude-code-session"); st["rebinds"] != "0" && st["rebinds"] != "" {
		// Dropped bindings are new bindings, not rebinds.
		t.Fatalf("rebinds %v", st)
	}
}

func TestStickyKeepOnAccountDisabled(t *testing.T) {
	e := newEnv(t)
	e.enableSticky(onFailureFailover)
	e.setSettings(defaultGatewaySettings(), StickySettings{Enabled: true, DefaultTTLSeconds: 60, KeepOnAccountDisabled: true})
	sess := withSession(body(testModel, false), "keep-session")
	e.messages(sess)
	e.record()
	e.accounts.Disable(context.Background(), 1, "admin")
	e.messages(sess)
	e.record()
	// Served by another account, which now owns the binding (rebind).
	if st := e.stickyStats("claude-code-session"); st["rebinds"] != "1" {
		t.Fatalf("rebinds %v", st)
	}
}

func TestStickyDisabledGlobally(t *testing.T) {
	e := newEnv(t)
	e.enableSticky(onFailureFailover)
	e.setSettings(defaultGatewaySettings(), StickySettings{Enabled: false, DefaultTTLSeconds: 60})
	e.messages(withSession(body(testModel, false), "x"))
	if rec := e.record(); rec.StickyRule != "" {
		t.Fatalf("sticky while disabled: %+v", rec)
	}
}

type fakeScheduler struct {
	got *pluginv1.ResolveAffinityKeyRequest
}

func (s *fakeScheduler) ResolveAffinityKey(_ context.Context, in *pluginv1.ResolveAffinityKeyRequest) (*pluginv1.ResolveAffinityKeyResponse, error) {
	s.got = in
	return &pluginv1.ResolveAffinityKeyResponse{Value: "conv-" + strings.Trim(in.GetFields()["metadata.conv"], `"`)}, nil
}

func TestStickyKeySources(t *testing.T) {
	e := newEnv(t)
	sched := &fakeScheduler{}
	e.gen.scheds["anthropic"] = sched
	mk := func(src ...manifest.StickyKeySource) *stickyRule {
		return &stickyRule{Name: "r", PluginKey: "anthropic", KeySources: src}
	}
	c := &call{g: e.gw, gen: e.gen, ep: endpointOf(t, builtinPlatform(t, "anthropic"), "anthropic.messages"), model: testModel}
	c.principal = e.auth.keys[testKey]
	c.body = []byte(`{"model":"m","metadata":{"user_id":"user_x_session_abc","conv":"42"},"n":5}`)
	// A gin context is needed for headers.
	ginCtx, req := newTestContext(map[string]string{"X-Session-Id": "hdr-1"})
	c.c = ginCtx
	_ = req
	ctx := context.Background()
	cases := []struct {
		rule *stickyRule
		want string
	}{
		{mk(manifest.StickyKeySource{Type: "body", Path: "metadata.missing"}, manifest.StickyKeySource{Type: "header", Name: "x-session-id"}), "hdr-1"},
		{mk(manifest.StickyKeySource{Type: "body", Path: "n"}), "5"},
		{mk(manifest.StickyKeySource{Type: "api_key"}), "5"},
		{mk(manifest.StickyKeySource{Type: "user"}), strconv.FormatInt(testUser, 10)},
		{mk(manifest.StickyKeySource{Type: "plugin", Needs: []string{"metadata.conv"}}), "conv-42"},
	}
	for i, tc := range cases {
		if got := c.stickyValue(ctx, tc.rule); got != tc.want {
			t.Fatalf("case %d: got %q want %q", i, got, tc.want)
		}
	}
	if sched.got.GetRuleName() != "r" || sched.got.GetFields()["metadata.conv"] != `"42"` {
		t.Fatalf("affinity request %+v", sched.got)
	}
	// valueRegex extracts the first group.
	r := mk(manifest.StickyKeySource{Type: "body", Path: "metadata.user_id"})
	r.ValueRegex = `session_([a-z]+)$`
	rules := activeRules([]*stickyRule{{Name: "r", Enabled: true, KeySources: r.KeySources, ValueRegex: r.ValueRegex}})
	if got := c.stickyValue(ctx, rules[0]); got != "abc" {
		t.Fatalf("regex value %q", got)
	}
	rules[0].re = mustRegexp(`^nomatch$`)
	if got := c.stickyValue(ctx, rules[0]); got != "" {
		t.Fatalf("non matching regex value %q", got)
	}
}

func TestStickyRuleMatching(t *testing.T) {
	r := &stickyRule{Match: manifest.StickyMatch{Protocols: []string{"anthropic.messages"}, Models: []string{"claude-*"},
		UserAgentContains: []string{"claude-cli"}}}
	if !r.matches("anthropic.messages", "claude-x", "Claude-CLI/1.0") {
		t.Fatal("should match")
	}
	if r.matches("anthropic.messages", "gpt-4", "claude-cli") || r.matches("openai.chat", "claude-x", "claude-cli") ||
		r.matches("anthropic.messages", "claude-x", "curl/8") {
		t.Fatal("should not match")
	}
	// Same-name shadowing: admin over built-in over plugin default;
	// disabled rules are dropped.
	list := activeRules([]*stickyRule{
		{Name: "a", Source: sourcePluginDefault, Enabled: true},
		{Name: "a", Source: sourceAdmin, Enabled: true},
		{Name: "b", Source: sourceAdmin, Enabled: false},
		{Name: "c", Source: sourceAdmin, Enabled: true, ValueRegex: "("},
		{Name: "d", Source: sourcePluginDefault, Enabled: true},
		{Name: "d", Source: sourceBuiltin, Enabled: true},
		{Name: "e", Source: sourceBuiltin, Enabled: false},
		{Name: "e", Source: sourcePluginDefault, Enabled: true},
	})
	if len(list) != 2 || list[0].Source != sourceAdmin || list[1].Name != "d" || list[1].Source != sourceBuiltin {
		t.Fatalf("active rules %+v", list)
	}
}

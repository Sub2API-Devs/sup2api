package gateway

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"
	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

func init() { gin.SetMode(gin.TestMode) }

// ---------------------------------------------------------------- test manifest

const testManifestJSON = `{
  "apiVersion": 1, "key": "anthropic", "version": "0.1.0", "publisher": "sub2api", "runtime": "grpc",
  "gateway": { "endpoints": [
    { "id": "messages", "method": "POST", "path": "/v1/messages", "protocol": "anthropic.messages", "kind": "proxy",
      "auth": { "headers": ["x-api-key", "authorization"] },
      "request": { "modelPath": "model", "streamPath": "stream", "promptTextPaths": ["system", "messages.#.content"] },
      "response": { "stream": "sse", "nonStream": "json" }, "errorFormat": "anthropic", "billing": "usage" },
    { "id": "count_tokens", "method": "POST", "path": "/v1/messages/count_tokens", "protocol": "anthropic.count_tokens",
      "kind": "proxy", "auth": { "headers": ["x-api-key", "authorization"] }, "request": { "modelPath": "model" },
      "response": { "nonStream": "json" }, "errorFormat": "anthropic", "billing": "free" }
  ] },
  "platform": {
    "id": "anthropic", "protocols": ["anthropic.messages", "anthropic.count_tokens"],
    "requestFields": ["model"], "passHeaders": ["anthropic-version", "anthropic-beta", "user-agent"],
    "usage": {
      "semantics": "exclusive",
      "sse": [
        { "event": "message_start", "map": {
            "model": "message.model", "input_tokens": "message.usage.input_tokens",
            "cache_read_tokens": "message.usage.cache_read_input_tokens",
            "cache_creation_tokens": "message.usage.cache_creation_input_tokens",
            "cache_creation_1h_tokens": "message.usage.cache_creation.ephemeral_1h_input_tokens" } },
        { "event": "message_delta", "map": { "output_tokens": "usage.output_tokens" } }
      ],
      "json": { "map": {
          "model": "model", "input_tokens": "usage.input_tokens", "output_tokens": "usage.output_tokens",
          "cache_read_tokens": "usage.cache_read_input_tokens",
          "cache_creation_tokens": "usage.cache_creation_input_tokens",
          "cache_creation_1h_tokens": "usage.cache_creation.ephemeral_1h_input_tokens" } }
    },
    "stickyRules": [ { "name": "claude-code-session",
      "match": { "protocols": ["anthropic.messages"], "models": ["claude-*"] },
      "keySources": [ { "type": "body", "path": "metadata.user_id" } ],
      "ttlSeconds": 3600, "keyIncludes": ["group", "model", "rule"], "onFailure": "failover" } ]
  }
}`

func testManifest(t testing.TB) *manifest.Manifest {
	t.Helper()
	var m manifest.Manifest
	if err := json.Unmarshal([]byte(testManifestJSON), &m); err != nil {
		t.Fatal(err)
	}
	return &m
}

// ---------------------------------------------------------------- registry fakes

type fakeGen struct {
	num       uint64
	plugins   []core.PluginInfo
	endpoints []core.EndpointBinding
	platforms []core.PlatformBinding
	hooks     []core.HookBinding
	scheds    map[string]core.SchedulerPlugin
}

func (g *fakeGen) Number() uint64             { return g.num }
func (g *fakeGen) Plugins() []core.PluginInfo { return g.plugins }
func (g *fakeGen) Plugin(key string) (core.PluginInfo, bool) {
	for _, p := range g.plugins {
		if p.Key == key {
			return p, true
		}
	}
	return core.PluginInfo{}, false
}
func (g *fakeGen) Endpoints() []core.EndpointBinding { return g.endpoints }
func (g *fakeGen) PlatformsForProtocol(protocol string) []core.PlatformBinding {
	var out []core.PlatformBinding
	for _, p := range g.platforms {
		for _, pr := range p.Platform.Protocols {
			if pr == protocol {
				out = append(out, p)
			}
		}
	}
	return out
}
func (g *fakeGen) Platform(id string) (core.PlatformBinding, bool) {
	for _, p := range g.platforms {
		if p.Platform.ID == id {
			return p, true
		}
	}
	return core.PlatformBinding{}, false
}
func (g *fakeGen) AccountTypes() []core.AccountTypeBinding { return nil }
func (g *fakeGen) AccountType(string, string) (core.AccountTypeBinding, bool) {
	return core.AccountTypeBinding{}, false
}
func (g *fakeGen) Hooks(point string) []core.HookBinding {
	var out []core.HookBinding
	for _, h := range g.hooks {
		if h.Hook.Point == point {
			out = append(out, h)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Hook.Order < out[j].Hook.Order })
	return out
}
func (g *fakeGen) Scheduler(key string) (core.SchedulerPlugin, bool) {
	s, ok := g.scheds[key]
	return s, ok
}
func (g *fakeGen) Routes(string) []core.RouteBinding                { return nil }
func (g *fakeGen) Jobs() []core.JobBinding                          { return nil }
func (g *fakeGen) Subscriptions() []core.SubscriptionBinding        { return nil }
func (g *fakeGen) ReadAsset(string, string) ([]byte, string, error) { return nil, "", errors.New("no") }

type fakeRegistry struct {
	mu  sync.Mutex
	cur core.Generation
	fns []func(core.Generation)
}

func (r *fakeRegistry) Current() core.Generation {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.cur
}
func (r *fakeRegistry) OnChange(fn func(core.Generation)) func() {
	r.mu.Lock()
	r.fns = append(r.fns, fn)
	r.mu.Unlock()
	return func() {}
}
func (r *fakeRegistry) set(g core.Generation) {
	r.mu.Lock()
	r.cur = g
	fns := append([]func(core.Generation){}, r.fns...)
	r.mu.Unlock()
	for _, fn := range fns {
		fn(g)
	}
}

// ---------------------------------------------------------------- platform plugin fake

type fakePlatform struct {
	mu        sync.Mutex
	base      string
	buildHook func(ctx context.Context, in *pluginv1.BuildUpstreamRequestRequest) error
	patches   []*pluginv1.BodyPatch
	builds    []*pluginv1.BuildUpstreamRequestRequest
	classify  []*pluginv1.ClassifyErrorRequest
	urlFor    func(acct *pluginv1.Account) string
}

func (p *fakePlatform) ValidateCredentials(context.Context, *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return &pluginv1.ValidateCredentialsResponse{}, nil
}

func (p *fakePlatform) BuildUpstreamRequest(ctx context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	p.mu.Lock()
	p.builds = append(p.builds, in)
	hook, base, urlFor, patches := p.buildHook, p.base, p.urlFor, p.patches
	p.mu.Unlock()
	if hook != nil {
		if err := hook(ctx, in); err != nil {
			return nil, err
		}
	}
	key := gjson.Get(in.GetAccount().GetCredentialsJson(), "api_key").String()
	u := base + "/v1/messages"
	if in.GetMeta().GetProtocol() == "anthropic.count_tokens" {
		u = base + "/v1/messages/count_tokens"
	}
	if urlFor != nil {
		u = urlFor(in.GetAccount())
	}
	h := map[string]string{"x-api-key": key, "content-type": "application/json"}
	for k, v := range in.GetInboundHeaders() {
		h[k] = v
	}
	return &pluginv1.BuildUpstreamRequestResponse{Method: "POST", Url: u, Headers: h, Patches: patches}, nil
}

// ClassifyError mimics the anthropic plugin: 429/5xx cool down and fail
// over, 401 disables and fails over, other 4xx return to the client.
func (p *fakePlatform) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	p.mu.Lock()
	p.classify = append(p.classify, in)
	p.mu.Unlock()
	code := int(in.GetStatus())
	msg := gjson.GetBytes(in.GetBodyPrefix(), "error.message").String()
	r := &pluginv1.ClassifyErrorResponse{ClientErrorType: anthropicType(code), ClientMessage: msg}
	switch {
	case code == 0 || code == 429 || code >= 500:
		r.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		r.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
		r.CooldownUntilUnix = time.Now().Add(time.Minute).Unix()
		r.Reason = fmt.Sprintf("status %d", code)
		if code == 0 {
			r.ClientStatus = 502
		}
	case code == 401:
		r.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		r.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
		r.Reason = "bad credentials"
	default:
		r.Action = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
	}
	return r, nil
}

func (p *fakePlatform) BuildTestRequest(context.Context, *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	return &pluginv1.BuildTestRequestResponse{}, nil
}

func (p *fakePlatform) buildCount() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.builds)
}

// ---------------------------------------------------------------- hook fake

type fakeHook struct {
	mu    sync.Mutex
	fn    func(ctx context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error)
	calls []*pluginv1.GatewayRequestHookRequest
}

func (h *fakeHook) OnGatewayRequest(ctx context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	h.mu.Lock()
	h.calls = append(h.calls, in)
	fn := h.fn
	h.mu.Unlock()
	if fn == nil {
		return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW}, nil
	}
	return fn(ctx, in)
}

func (h *fakeHook) count() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.calls)
}

// ---------------------------------------------------------------- core service fakes

type fakeAuth struct {
	keys map[string]*core.APIKeyPrincipal
}

func (a *fakeAuth) Authenticate(_ context.Context, raw string) (*core.APIKeyPrincipal, error) {
	if p, ok := a.keys[raw]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, core.ErrUnauthenticated.WithMessage("invalid api key")
}

type fakePricer struct {
	mu      sync.Mutex
	rules   map[string]*core.PriceRule // model -> rule; missing = not configured
	free    bool
	params  []string
	headers []string
	calls   int
}

func (p *fakePricer) Resolve(_ context.Context, platform, model string) (*core.PriceRule, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.calls++
	if r, ok := p.rules[model]; ok {
		return r, nil
	}
	if p.free {
		return nil, nil
	}
	return nil, core.ErrPriceNotConfigured
}

func (p *fakePricer) Inputs(*core.PriceRule) ([]string, []string) { return p.params, p.headers }

type fakeBalance struct{ broke map[int64]bool }

func (b *fakeBalance) CheckBalance(_ context.Context, uid int64) error {
	if b.broke[uid] {
		return core.ErrInsufficientBalance
	}
	return nil
}

type fakeAccounts struct {
	mu        sync.Mutex
	accounts  map[int64]*core.Account
	groups    map[int64][]int64 // group -> account ids
	cooldown  map[int64]time.Time
	disabled  map[int64]string
	touched   map[int64]int
	cooldowns []int64
}

func newFakeAccounts() *fakeAccounts {
	return &fakeAccounts{accounts: map[int64]*core.Account{}, groups: map[int64][]int64{},
		cooldown: map[int64]time.Time{}, disabled: map[int64]string{}, touched: map[int64]int{}}
}

func (a *fakeAccounts) add(group int64, id int64, priority int, key string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.accounts[id] = &core.Account{
		AccountRef: core.AccountRef{ID: id, Name: fmt.Sprintf("acc-%d", id), PluginKey: "anthropic", Platform: "anthropic",
			Type: "apikey", Priority: priority, MaxConcurrency: 5},
		Status: "active", Credentials: json.RawMessage(fmt.Sprintf(`{"api_key":%q}`, key)), Settings: json.RawMessage(`{}`),
	}
	a.groups[group] = append(a.groups[group], id)
}

func (a *fakeAccounts) Candidates(_ context.Context, group int64, platforms []string) ([]core.AccountRef, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	var out []core.AccountRef
	for _, id := range a.groups[group] {
		acc := a.accounts[id]
		if _, dis := a.disabled[id]; dis || time.Now().Before(a.cooldown[id]) {
			continue
		}
		ok := len(platforms) == 0
		for _, p := range platforms {
			ok = ok || p == acc.Platform
		}
		if ok {
			out = append(out, acc.AccountRef)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Priority < out[j].Priority })
	return out, nil
}

func (a *fakeAccounts) Load(_ context.Context, id int64) (*core.Account, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	acc, ok := a.accounts[id]
	if !ok {
		return nil, core.ErrNotFound
	}
	cp := *acc
	return &cp, nil
}

func (a *fakeAccounts) IsCoolingDown(_ context.Context, id int64) (bool, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	return time.Now().Before(a.cooldown[id]), nil
}

func (a *fakeAccounts) SetCooldown(_ context.Context, id int64, until time.Time, _ string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.cooldown[id] = until
	a.cooldowns = append(a.cooldowns, id)
	return nil
}

func (a *fakeAccounts) Disable(_ context.Context, id int64, reason string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.disabled[id] = reason
	return nil
}

func (a *fakeAccounts) TouchLastUsed(_ context.Context, id int64) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.touched[id]++
}

type fakeSlots struct {
	mu     sync.Mutex
	inUse  map[string]int
	limits map[string]int // overrides the requested limit
}

func (s *fakeSlots) Acquire(_ context.Context, kind string, id int64, limit int, _ string) (func(), bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	k := kind + ":" + itoa(id)
	if l, ok := s.limits[k]; ok {
		limit = l
	}
	if limit > 0 && s.inUse[k] >= limit {
		return nil, false, nil
	}
	s.inUse[k]++
	var once sync.Once
	return func() {
		once.Do(func() {
			s.mu.Lock()
			s.inUse[k]--
			s.mu.Unlock()
		})
	}, true, nil
}

func (s *fakeSlots) InUse(_ context.Context, kind string, id int64) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.inUse[kind+":"+itoa(id)], nil
}

type fakeProxies struct{}

func (fakeProxies) HTTPClient(context.Context, *int64) (*http.Client, error) {
	return &http.Client{Transport: http.DefaultTransport.(*http.Transport).Clone()}, nil
}

type fakeSettler struct {
	ch chan *core.UsageRecord
}

func (s *fakeSettler) Submit(rec *core.UsageRecord) { s.ch <- rec }

type fakeNode struct{}

func (fakeNode) NodeID() string { return "node-test" }
func (fakeNode) BootID() string { return "boot-test" }

// ---------------------------------------------------------------- upstream (Anthropic-like)

const (
	upInput         = 11
	upOutput        = 22
	upCacheRead     = 5
	upCacheCreation = 7 // total, includes the 1h part
	upCacheCreate1h = 3
	upModel         = "claude-upstream-x"
)

type upstreamRule struct {
	status      int
	delay       time.Duration
	hold        chan struct{} // SSE: wait after message_start
	breakStream bool          // SSE: abort the connection after message_start
	waitCancel  bool          // block until the request is canceled
}

type upstreamCall struct {
	key    string
	body   []byte
	header http.Header
}

type upstream struct {
	srv      *httptest.Server
	mu       sync.Mutex
	rules    map[string]*upstreamRule
	calls    []upstreamCall
	canceled chan string
}

func newUpstream(t *testing.T) *upstream {
	u := &upstream{rules: map[string]*upstreamRule{}, canceled: make(chan string, 8)}
	u.srv = httptest.NewServer(http.HandlerFunc(u.handle))
	t.Cleanup(u.srv.Close)
	return u
}

func (u *upstream) set(key string, r *upstreamRule) {
	u.mu.Lock()
	u.rules[key] = r
	u.mu.Unlock()
}

func (u *upstream) keys() []string {
	u.mu.Lock()
	defer u.mu.Unlock()
	out := make([]string, 0, len(u.calls))
	for _, c := range u.calls {
		out = append(out, c.key)
	}
	return out
}

func (u *upstream) last() upstreamCall {
	u.mu.Lock()
	defer u.mu.Unlock()
	return u.calls[len(u.calls)-1]
}

func usageJSON(output int) map[string]any {
	return map[string]any{
		"input_tokens": upInput, "output_tokens": output, "cache_read_input_tokens": upCacheRead,
		"cache_creation_input_tokens": upCacheCreation,
		"cache_creation":              map[string]any{"ephemeral_5m_input_tokens": upCacheCreation - upCacheCreate1h, "ephemeral_1h_input_tokens": upCacheCreate1h},
	}
}

func (u *upstream) handle(w http.ResponseWriter, r *http.Request) {
	key := r.Header.Get("x-api-key")
	body, _ := io.ReadAll(r.Body)
	u.mu.Lock()
	u.calls = append(u.calls, upstreamCall{key: key, body: body, header: r.Header.Clone()})
	rule := u.rules[key]
	u.mu.Unlock()
	if rule == nil {
		rule = &upstreamRule{}
	}
	if rule.waitCancel {
		<-r.Context().Done()
		u.canceled <- key
		return
	}
	if rule.delay > 0 {
		select {
		case <-time.After(rule.delay):
		case <-r.Context().Done():
			return
		}
	}
	if rule.status != 0 {
		w.Header().Set("Content-Type", "application/json")
		if rule.status == 429 {
			w.Header().Set("retry-after", "2")
		}
		w.WriteHeader(rule.status)
		_, _ = fmt.Fprintf(w, `{"type":"error","error":{"type":%q,"message":"mock status %d"}}`, anthropicType(rule.status), rule.status)
		return
	}
	if strings.HasSuffix(r.URL.Path, "/count_tokens") {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"input_tokens":42}`))
		return
	}
	if !gjson.GetBytes(body, "stream").Bool() {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id": "msg_1", "type": "message", "role": "assistant", "model": upModel,
			"content": []any{map[string]any{"type": "text", "text": "hello"}}, "usage": usageJSON(upOutput),
		})
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	fl := w.(http.Flusher)
	send := func(ev string, v any) {
		b, _ := json.Marshal(v)
		_, _ = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", ev, b)
		fl.Flush()
	}
	send("message_start", map[string]any{"type": "message_start", "message": map[string]any{
		"id": "msg_1", "model": upModel, "usage": usageJSON(1)}})
	if rule.breakStream {
		panic(http.ErrAbortHandler)
	}
	if rule.hold != nil {
		select {
		case <-rule.hold:
		case <-r.Context().Done():
			u.canceled <- key
			return
		}
	}
	send("content_block_delta", map[string]any{"type": "content_block_delta", "index": 0,
		"delta": map[string]any{"type": "text_delta", "text": "hello"}})
	send("message_delta", map[string]any{"type": "message_delta", "usage": map[string]any{"output_tokens": upOutput}})
	send("message_stop", map[string]any{"type": "message_stop"})
}

// ---------------------------------------------------------------- environment

const (
	testKey   = "sk-s2a-user-key"
	testUser  = int64(7)
	testGroup = int64(3)
	testModel = "claude-sonnet-4-5"
)

type env struct {
	t        *testing.T
	gw       *Gateway
	srv      *httptest.Server
	up       *upstream
	reg      *fakeRegistry
	gen      *fakeGen
	plat     *fakePlatform
	accounts *fakeAccounts
	slots    *fakeSlots
	settler  *fakeSettler
	pricer   *fakePricer
	balance  *fakeBalance
	auth     *fakeAuth
	mr       *miniredis.Miniredis
	rdb      *redis.Client
	man      *manifest.Manifest
}

type envOpt func(*env)

func newEnv(t *testing.T, opts ...envOpt) *env {
	t.Helper()
	e := &env{t: t, man: testManifest(t)}
	e.up = newUpstream(t)
	e.mr = miniredis.RunT(t)
	e.rdb = redis.NewClient(&redis.Options{Addr: e.mr.Addr()})
	t.Cleanup(func() { _ = e.rdb.Close() })

	info := core.PluginInfo{Key: "anthropic", Version: "0.1.0", Manifest: e.man}
	e.plat = &fakePlatform{base: e.up.srv.URL}
	e.gen = &fakeGen{num: 1, plugins: []core.PluginInfo{info}, scheds: map[string]core.SchedulerPlugin{}}
	for _, ep := range e.man.Gateway.Endpoints {
		e.gen.endpoints = append(e.gen.endpoints, core.EndpointBinding{Plugin: info, Endpoint: ep})
	}
	e.gen.platforms = []core.PlatformBinding{{Plugin: info, Platform: *e.man.Platform, Client: e.plat}}
	e.reg = &fakeRegistry{cur: e.gen}

	e.accounts = newFakeAccounts()
	e.accounts.add(testGroup, 1, 1, "acc-1")
	e.accounts.add(testGroup, 2, 50, "acc-2")
	e.accounts.add(testGroup, 3, 90, "acc-3")
	e.slots = &fakeSlots{inUse: map[string]int{}, limits: map[string]int{}}
	e.settler = &fakeSettler{ch: make(chan *core.UsageRecord, 64)}
	e.pricer = &fakePricer{rules: map[string]*core.PriceRule{
		testModel: {ID: 9, Platform: "anthropic", Pattern: "claude-sonnet-*", Mode: "per_token", Expression: "p*3", ExprHash: "h"},
	}}
	e.balance = &fakeBalance{broke: map[int64]bool{}}
	e.auth = &fakeAuth{keys: map[string]*core.APIKeyPrincipal{
		testKey: {KeyID: 5, UserID: testUser, UserMaxConcurrency: 3,
			Group: core.GroupInfo{ID: testGroup, Name: "default", Status: "active", RateMultiplier: decimal.RequireFromString("1.5")}},
	}}
	for _, o := range opts {
		o(e)
	}
	e.gw = New(Deps{
		Redis: e.rdb, Registry: e.reg, Node: fakeNode{}, Auth: e.auth, Pricer: e.pricer, Balance: e.balance,
		Slots: e.slots, Accounts: e.accounts, Proxies: fakeProxies{}, Settler: e.settler,
		Config: &config.Config{AllowPrivateUpstream: true},
	})
	t.Cleanup(e.gw.Close)
	e.gw.shuffle = func(int, func(int, int)) {} // deterministic order within a priority
	e.setSettings(defaultGatewaySettings(), StickySettings{Enabled: false, DefaultTTLSeconds: 3600})

	engine := gin.New()
	engine.Use(httpapi.RequestContext(), httpapi.Recover(), e.gw.Middleware())
	engine.NoRoute(func(c *gin.Context) { c.JSON(404, gin.H{"error": "core 404"}) })
	e.srv = httptest.NewServer(engine)
	t.Cleanup(e.srv.Close)
	return e
}

func (e *env) setSettings(gw GatewaySettings, st StickySettings) {
	e.gw.settings.mu.Lock()
	e.gw.settings.override = &settingsSnapshot{gateway: gw, sticky: st}
	e.gw.settings.mu.Unlock()
}

// enableSticky turns sticky sessions on with the manifest's default rule.
func (e *env) enableSticky(onFailure string) {
	r := e.man.Platform.StickyRules[0]
	rule := &stickyRule{ID: 1, Name: r.Name, Source: sourcePluginDefault, PluginKey: "anthropic", Enabled: true,
		Priority: 100, Match: r.Match, KeySources: r.KeySources, TTLSeconds: r.TTLSeconds, KeyIncludes: r.KeyIncludes,
		OnFailure: onFailure}
	e.gw.rules.mu.Lock()
	e.gw.rules.override = activeRules([]*stickyRule{rule})
	e.gw.rules.mu.Unlock()
	e.setSettings(defaultGatewaySettings(), StickySettings{Enabled: true, DefaultTTLSeconds: 3600})
}

func (e *env) addHook(h manifest.Hook, granted []string, client core.HookPlugin) {
	info := core.PluginInfo{Key: "guard", Version: "0.1.0", Manifest: &manifest.Manifest{Key: "guard", Hooks: []manifest.Hook{h}}}
	e.gen.hooks = append(e.gen.hooks, core.HookBinding{Plugin: info, Hook: h, GrantedFields: granted, Client: client})
}

func body(model string, stream bool, extra ...string) map[string]any {
	b := map[string]any{"model": model, "max_tokens": 64, "stream": stream,
		"messages": []any{map[string]any{"role": "user", "content": "hello there"}}}
	for i := 0; i+1 < len(extra); i += 2 {
		b[extra[i]] = extra[i+1]
	}
	return b
}

func withSession(b map[string]any, session string) map[string]any {
	b["metadata"] = map[string]any{"user_id": session}
	return b
}

type result struct {
	status int
	header http.Header
	body   []byte
}

func (r result) json() gjson.Result { return gjson.ParseBytes(r.body) }

func (e *env) do(path string, b any, headers map[string]string) result {
	e.t.Helper()
	raw, _ := json.Marshal(b)
	req, _ := http.NewRequest(http.MethodPost, e.srv.URL+path, strings.NewReader(string(raw)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", testKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	for k, v := range headers {
		if v == "" {
			req.Header.Del(k)
		} else {
			req.Header.Set(k, v)
		}
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		e.t.Fatalf("request: %v", err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	return result{status: resp.StatusCode, header: resp.Header, body: data}
}

func (e *env) messages(b any) result {
	e.t.Helper()
	return e.do("/v1/messages", b, nil)
}

// record waits for the next usage record.
func (e *env) record() *core.UsageRecord {
	e.t.Helper()
	select {
	case r := <-e.settler.ch:
		return r
	case <-time.After(5 * time.Second):
		e.t.Fatal("no usage record submitted")
		return nil
	}
}

func (e *env) noRecord() {
	e.t.Helper()
	select {
	case r := <-e.settler.ch:
		e.t.Fatalf("unexpected usage record: %+v", r)
	case <-time.After(100 * time.Millisecond):
	}
}

package gateway

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestNonStreamSuccessAndUsage(t *testing.T) {
	e := newEnv(t)
	r := e.do("/v1/messages", body(testModel, false), map[string]string{"X-Request-Id": "client-chosen"})
	if r.status != 200 || r.json().Get("usage.output_tokens").Int() != upOutput {
		t.Fatalf("response: %d %s", r.status, r.body)
	}
	rid := r.header.Get("X-Request-Id")
	if rid == "" || rid == "client-chosen" {
		t.Fatalf("request id must be server generated, got %q", rid)
	}
	rec := e.record()
	if rec.RequestID != rid {
		t.Fatalf("record request id %q, header %q", rec.RequestID, rid)
	}
	if !rec.Success || rec.StatusCode != 200 || rec.ErrorType != "" || rec.Attempts != 1 {
		t.Fatalf("record status: %+v", rec)
	}
	if rec.AccountID == nil || *rec.AccountID != 1 || rec.Platform != "anthropic" || rec.PluginKey != "anthropic" ||
		rec.Protocol != "anthropic.messages" || rec.Endpoint != "/v1/messages" || rec.Model != testModel ||
		rec.UpstreamModel != upModel || rec.UserID != testUser || rec.APIKeyID != 5 || rec.GroupID != testGroup {
		t.Fatalf("record identity: %+v", rec)
	}
	want := core.UsageTokens{Input: upInput, Output: upOutput, CacheRead: upCacheRead,
		CacheCreation: upCacheCreation - upCacheCreate1h, CacheCreation1h: upCacheCreate1h}
	if rec.Tokens != want {
		t.Fatalf("tokens = %+v, want %+v", rec.Tokens, want)
	}
	if !rec.Billable || rec.Price == nil || rec.Price.ID != 9 || rec.UsageSemantics != "exclusive" ||
		rec.RateMultiplier.String() != "1.5" || rec.NodeID != "node-test" {
		t.Fatalf("record billing: %+v", rec)
	}
	// The upstream got the account key, never the client's key.
	call := e.up.last()
	if call.key != "acc-1" || call.header.Get("anthropic-version") != "2023-06-01" {
		t.Fatalf("upstream call: key=%s headers=%v", call.key, call.header)
	}
	for _, v := range call.header {
		for _, s := range v {
			if strings.Contains(s, testKey) {
				t.Fatal("client api key leaked upstream")
			}
		}
	}
	if e.accounts.touched[1] != 1 {
		t.Fatal("TouchLastUsed not called")
	}

	// The same client X-Request-Id again yields a different id.
	r2 := e.do("/v1/messages", body(testModel, false), map[string]string{"X-Request-Id": "client-chosen"})
	if rid2 := r2.header.Get("X-Request-Id"); rid2 == rid || e.record().RequestID != rid2 {
		t.Fatalf("second request reused id %q", rid2)
	}
}

func TestStreamFlushesEachEventAndExtractsUsage(t *testing.T) {
	e := newEnv(t)
	hold := make(chan struct{})
	e.up.set("acc-1", &upstreamRule{hold: hold})

	raw, _ := json.Marshal(body(testModel, true))
	req, _ := http.NewRequest(http.MethodPost, e.srv.URL+"/v1/messages", strings.NewReader(string(raw)))
	req.Header.Set("x-api-key", testKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 || !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") {
		t.Fatalf("stream response %d %s", resp.StatusCode, resp.Header.Get("Content-Type"))
	}
	br := bufio.NewReader(resp.Body)
	// message_start must arrive while the upstream is still holding the rest.
	got := make(chan string, 1)
	go func() {
		var lines []string
		for len(lines) < 2 {
			l, err := br.ReadString('\n')
			if err != nil {
				break
			}
			lines = append(lines, strings.TrimSpace(l))
		}
		got <- strings.Join(lines, "|")
	}()
	select {
	case s := <-got:
		if !strings.HasPrefix(s, "event: message_start|data: ") {
			t.Fatalf("first event: %q", s)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("first SSE event was not flushed before the upstream finished")
	}
	close(hold)
	var events []string
	for {
		l, err := br.ReadString('\n')
		if strings.HasPrefix(l, "event: ") {
			events = append(events, strings.TrimSpace(l[len("event: "):]))
		}
		if err != nil {
			break
		}
	}
	if strings.Join(events, ",") != "content_block_delta,message_delta,message_stop" {
		t.Fatalf("events after hold: %v", events)
	}
	rec := e.record()
	if !rec.Success || !rec.Stream || rec.FirstTokenMs <= 0 || rec.UpstreamModel != upModel {
		t.Fatalf("stream record: %+v", rec)
	}
	want := core.UsageTokens{Input: upInput, Output: upOutput, CacheRead: upCacheRead,
		CacheCreation: upCacheCreation - upCacheCreate1h, CacheCreation1h: upCacheCreate1h}
	if rec.Tokens != want {
		t.Fatalf("stream tokens %+v, want %+v", rec.Tokens, want)
	}
}

func TestFailoverOn429CoolsDown(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{status: 429})
	r := e.messages(body(testModel, false))
	if r.status != 200 {
		t.Fatalf("failover: %d %s", r.status, r.body)
	}
	if k := e.up.keys(); strings.Join(k, ",") != "acc-1,acc-2" {
		t.Fatalf("upstream order %v", k)
	}
	if len(e.accounts.cooldowns) != 1 || e.accounts.cooldowns[0] != 1 {
		t.Fatalf("cooldowns %v", e.accounts.cooldowns)
	}
	c := e.plat.classify[0]
	if c.GetStatus() != 429 || c.GetHeaders()["retry-after"] != "2" || !strings.Contains(string(c.GetBodyPrefix()), "mock status 429") {
		t.Fatalf("classify request: %+v", c)
	}
	rec := e.record()
	if rec.Attempts != 2 || *rec.AccountID != 2 || !rec.Success {
		t.Fatalf("record %+v", rec)
	}
	if e.plat.builds[1].GetAttempt() != 1 {
		t.Fatalf("attempt number %d", e.plat.builds[1].GetAttempt())
	}
	// The cooled account is skipped next time.
	e.messages(body(testModel, false))
	if k := e.up.keys(); k[len(k)-1] != "acc-2" || len(k) != 3 {
		t.Fatalf("after cooldown %v", k)
	}
}

func TestFailoverOn401DisablesAccount(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{status: 401})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d", r.status)
	}
	if e.accounts.disabled[1] == "" {
		t.Fatal("account 1 not disabled")
	}
}

func TestClientErrorReturnedWithoutFailover(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{status: 400})
	r := e.messages(body(testModel, false))
	if r.status != 400 || r.json().Get("type").String() != "error" ||
		r.json().Get("error.type").String() != "invalid_request_error" || r.json().Get("error.message").String() != "mock status 400" {
		t.Fatalf("400: %d %s", r.status, r.body)
	}
	if len(e.up.keys()) != 1 {
		t.Fatalf("failed over on 400: %v", e.up.keys())
	}
	rec := e.record()
	if rec.Success || rec.StatusCode != 400 || rec.ErrorType != errTypeUpstream || rec.Billable {
		t.Fatalf("record %+v", rec)
	}
}

func TestAllAttemptsFailReturnsLastUpstreamError(t *testing.T) {
	e := newEnv(t)
	e.setSettings(GatewaySettings{MaxAttempts: 2}, StickySettings{})
	for _, k := range []string{"acc-1", "acc-2", "acc-3"} {
		e.up.set(k, &upstreamRule{status: 529})
	}
	r := e.messages(body(testModel, false))
	if len(e.up.keys()) != 2 {
		t.Fatalf("max_attempts not honoured: %v", e.up.keys())
	}
	if r.status != 529 || r.json().Get("error.type").String() != "overloaded_error" {
		t.Fatalf("last upstream error: %d %s", r.status, r.body)
	}
	rec := e.record()
	if rec.Attempts != 2 || rec.ErrorType != errTypeUpstream || rec.Billable {
		t.Fatalf("record %+v", rec)
	}
}

func TestNoAccountReturns503(t *testing.T) {
	e := newEnv(t)
	e.accounts.groups[testGroup] = nil
	r := e.messages(body(testModel, false))
	if r.status != 503 || r.json().Get("error.code").String() != "no_available_account" {
		t.Fatalf("no account: %d %s", r.status, r.body)
	}
	if rec := e.record(); rec.ErrorType != errTypeNoAccount || rec.StatusCode != 503 || rec.AccountID != nil {
		t.Fatalf("record %+v", rec)
	}
}

func TestPluginTimeoutTreatsAccountUnavailable(t *testing.T) {
	e := newEnv(t)
	e.setSettings(GatewaySettings{MaxAttempts: 3, PlatformCallTimeoutMs: 100}, StickySettings{})
	e.plat.buildHook = func(ctx context.Context, in *pluginv1.BuildUpstreamRequestRequest) error {
		if in.GetAccount().GetId() == 1 {
			<-ctx.Done()
			return ctx.Err()
		}
		return nil
	}
	r := e.messages(body(testModel, false))
	if r.status != 200 || strings.Join(e.up.keys(), ",") != "acc-2" {
		t.Fatalf("plugin timeout: %d %v", r.status, e.up.keys())
	}
	// Plugin down for every account -> 503 no_available_account.
	e.plat.buildHook = func(context.Context, *pluginv1.BuildUpstreamRequestRequest) error {
		return core.ErrPluginUnavailable
	}
	e.record()
	r = e.messages(body(testModel, false))
	if r.status != 503 || r.json().Get("error.code").String() != "no_available_account" {
		t.Fatalf("plugin down: %d %s", r.status, r.body)
	}
}

func TestNoFailoverOnceOutputStarted(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{breakStream: true})
	r := e.messages(body(testModel, true))
	if r.status != 200 || !strings.Contains(string(r.body), "message_start") {
		t.Fatalf("partial stream: %d %s", r.status, r.body)
	}
	if k := e.up.keys(); len(k) != 1 {
		t.Fatalf("failed over after output started: %v", k)
	}
	rec := e.record()
	if rec.Success || rec.ErrorType != errTypeUpstream || rec.Tokens.Input != upInput {
		t.Fatalf("interrupted stream record %+v", rec)
	}
	if !rec.Billable {
		t.Fatal("usage produced before the interruption must still be billed")
	}
}

func TestClientDisconnectCancelsUpstream(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{waitCancel: true})
	ctx, cancel := context.WithCancel(context.Background())
	raw, _ := json.Marshal(body(testModel, true))
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, e.srv.URL+"/v1/messages", strings.NewReader(string(raw)))
	req.Header.Set("x-api-key", testKey)
	done := make(chan struct{})
	go func() {
		defer close(done)
		resp, err := http.DefaultClient.Do(req)
		if err == nil {
			resp.Body.Close()
		}
	}()
	// Wait until the upstream has the request, then drop the client.
	deadline := time.Now().Add(3 * time.Second)
	for len(e.up.keys()) == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	cancel()
	<-done
	select {
	case k := <-e.up.canceled:
		if k != "acc-1" {
			t.Fatalf("canceled %s", k)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("upstream request not canceled after client disconnect")
	}
	rec := e.record()
	if rec.ErrorType != errTypeClientCanceled || len(e.up.keys()) != 1 {
		t.Fatalf("record %+v, calls %v", rec, e.up.keys())
	}
	// Slots are released.
	if n, _ := e.slots.InUse(context.Background(), "user", testUser); n != 0 {
		t.Fatalf("user slot leaked: %d", n)
	}
	if n, _ := e.slots.InUse(context.Background(), "account", 1); n != 0 {
		t.Fatalf("account slot leaked: %d", n)
	}
}

func TestAuthErrors(t *testing.T) {
	e := newEnv(t)
	r := e.do("/v1/messages", body(testModel, false), map[string]string{"x-api-key": "sk-bad"})
	if r.status != 401 || r.json().Get("type").String() != "error" || r.json().Get("error.type").String() != "authentication_error" {
		t.Fatalf("bad key: %d %s", r.status, r.body)
	}
	r = e.do("/v1/messages", body(testModel, false), map[string]string{"x-api-key": ""})
	if r.status != 401 {
		t.Fatalf("missing key: %d", r.status)
	}
	e.noRecord()
	// Authorization: Bearer works too.
	r = e.do("/v1/messages", body(testModel, false), map[string]string{"x-api-key": "", "Authorization": "Bearer " + testKey})
	if r.status != 200 {
		t.Fatalf("bearer: %d %s", r.status, r.body)
	}
	e.record()
}

func TestModelAllowlist(t *testing.T) {
	e := newEnv(t, func(e *env) {
		e.auth.keys[testKey].Group.ModelAllowlist = []string{"claude-haiku-*"}
	})
	r := e.messages(body(testModel, false))
	if r.status != 403 || r.json().Get("error.code").String() != "model_not_allowed" || r.json().Get("error.type").String() != "permission_error" {
		t.Fatalf("allowlist: %d %s", r.status, r.body)
	}
	if len(e.up.keys()) != 0 {
		t.Fatal("upstream called")
	}
	if rec := e.record(); rec.ErrorType != errTypeModelNotAllowed || rec.Billable {
		t.Fatalf("record %+v", rec)
	}
}

func TestInsufficientBalance402(t *testing.T) {
	e := newEnv(t)
	e.balance.broke[testUser] = true
	for _, stream := range []bool{false, true} {
		r := e.messages(body(testModel, stream))
		if r.status != 402 || r.json().Get("type").String() != "error" || r.json().Get("error.code").String() != "insufficient_balance" {
			t.Fatalf("402: %d %s", r.status, r.body)
		}
		if rec := e.record(); rec.ErrorType != errTypeInsufficientBalance || rec.StatusCode != 402 || rec.Billable {
			t.Fatalf("record %+v", rec)
		}
	}
	if len(e.up.keys()) != 0 {
		t.Fatal("upstream called despite insufficient balance")
	}
}

func TestPriceNotConfigured403(t *testing.T) {
	e := newEnv(t)
	r := e.messages(body("claude-unknown-1", false))
	if r.status != 403 || r.json().Get("error.code").String() != "model_price_not_configured" {
		t.Fatalf("price: %d %s", r.status, r.body)
	}
	if rec := e.record(); rec.ErrorType != errTypePriceNotConfigured {
		t.Fatalf("record %+v", rec)
	}
	// Free policy: served, not billable.
	e.pricer.free = true
	if r := e.messages(body("claude-unknown-1", false)); r.status != 200 {
		t.Fatalf("free policy: %d", r.status)
	}
	if rec := e.record(); rec.Billable || rec.Price != nil {
		t.Fatalf("free policy record %+v", rec)
	}
}

func TestFreeEndpointSkipsPricing(t *testing.T) {
	e := newEnv(t)
	e.balance.broke[testUser] = true // not checked for billing=free
	r := e.do("/v1/messages/count_tokens", body("claude-unknown-1", false), nil)
	if r.status != 200 || r.json().Get("input_tokens").Int() != 42 {
		t.Fatalf("count_tokens: %d %s", r.status, r.body)
	}
	if e.pricer.calls != 0 {
		t.Fatal("pricer consulted for a free endpoint")
	}
	if rec := e.record(); rec.Billable || rec.Protocol != "anthropic.count_tokens" || !rec.Success {
		t.Fatalf("record %+v", rec)
	}
}

func TestPriceInputsCaptured(t *testing.T) {
	e := newEnv(t)
	e.pricer.params = []string{"service_tier"}
	e.pricer.headers = []string{"Anthropic-Beta"}
	b := body(testModel, false, "service_tier", "priority")
	e.do("/v1/messages", b, map[string]string{"anthropic-beta": "fast-mode"})
	rec := e.record()
	if rec.PriceParams["service_tier"] != `"priority"` || rec.PriceHeaders["anthropic-beta"] != "fast-mode" {
		t.Fatalf("captured params=%v headers=%v", rec.PriceParams, rec.PriceHeaders)
	}
}

func TestUserConcurrencyLimit(t *testing.T) {
	e := newEnv(t)
	e.slots.inUse["user:"+itoa(testUser)] = 3 // limit is UserMaxConcurrency=3
	r := e.messages(body(testModel, false))
	if r.status != 429 || r.json().Get("error.type").String() != "rate_limit_error" {
		t.Fatalf("user limit: %d %s", r.status, r.body)
	}
	e.record()
}

func TestAccountSlotsBusy(t *testing.T) {
	e := newEnv(t)
	for _, id := range []int64{1, 2, 3} {
		e.slots.limits["account:"+itoa(id)] = 1
		e.slots.inUse["account:"+itoa(id)] = 1
	}
	r := e.messages(body(testModel, false))
	if r.status != 429 {
		t.Fatalf("busy accounts: %d %s", r.status, r.body)
	}
	e.record()
	// One free slot on the lowest priority account is used.
	e.slots.inUse["account:3"] = 0
	if r := e.messages(body(testModel, false)); r.status != 200 || e.up.last().key != "acc-3" {
		t.Fatalf("free slot: %d %v", r.status, e.up.keys())
	}
}

func TestInvalidBodyAndLimits(t *testing.T) {
	e := newEnv(t)
	req, _ := http.NewRequest(http.MethodPost, e.srv.URL+"/v1/messages", strings.NewReader("{not json"))
	req.Header.Set("x-api-key", testKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 400 {
		t.Fatalf("invalid json: %d", resp.StatusCode)
	}
	e.record()
	r := e.messages(map[string]any{"messages": []any{}})
	if r.status != 400 {
		t.Fatalf("missing model: %d", r.status)
	}
	e.record()
	e.gen.endpoints[0].Endpoint.Request.MaxBodyBytes = 64
	e.gw.table.Store(buildRouteTable(e.gen))
	r = e.messages(body(testModel, false, "pad", strings.Repeat("x", 200)))
	if r.status != 413 {
		t.Fatalf("too large: %d %s", r.status, r.body)
	}
	e.record()
}

func TestSSRFGuard(t *testing.T) {
	e := newEnv(t)
	e.gw.allowPrivate = false
	// httptest listens on 127.0.0.1: rejected, every account, then 503.
	r := e.messages(body(testModel, false))
	if r.status != 503 || len(e.up.keys()) != 0 {
		t.Fatalf("private upstream allowed: %d %v", r.status, e.up.keys())
	}
	e.record()
}

func TestRouteFallthroughAndGenerationSwitch(t *testing.T) {
	e := newEnv(t)
	resp, err := http.Post(e.srv.URL+"/v1/other", "application/json", strings.NewReader("{}"))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 404 {
		t.Fatalf("unknown path: %d", resp.StatusCode)
	}
	// Disable the plugin: the endpoint leaves the table; the known index
	// (installed plugins) turns it into 503 plugin_unavailable.
	e.reg.set(&fakeGen{num: 2})
	e.gw.known.Store(buildKnownIndex(map[string][]manifest.Endpoint{"anthropic": e.man.Gateway.Endpoints}))
	r := e.messages(body(testModel, false))
	if r.status != 503 || r.json().Get("type").String() != "error" || r.json().Get("error.code").String() != "plugin_unavailable" {
		t.Fatalf("inactive plugin endpoint: %d %s", r.status, r.body)
	}
	e.noRecord()
	// Re-enable.
	e.reg.set(e.gen)
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("after enable: %d", r.status)
	}
	e.record()
}

func TestUpstreamPatchesAndFields(t *testing.T) {
	e := newEnv(t)
	e.plat.patches = []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "model", ValueJson: `"claude-mapped"`}}
	e.messages(body(testModel, false))
	e.record()
	if m := gjson.GetBytes(e.up.last().body, "model").String(); m != "claude-mapped" {
		t.Fatalf("patched model = %s", m)
	}
	b := e.plat.builds[0]
	if b.GetFields()["model"] != `"`+testModel+`"` || b.GetInboundHeaders()["anthropic-version"] != "2023-06-01" ||
		b.GetMeta().GetRequestId() == "" || b.GetAccount().GetCredentialsJson() == "" {
		t.Fatalf("build request: %+v", b)
	}
	if _, ok := b.GetInboundHeaders()["x-api-key"]; ok {
		t.Fatal("non-allowlisted header forwarded to the plugin")
	}
}

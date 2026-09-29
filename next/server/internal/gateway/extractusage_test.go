package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Plugin-reported usage: endpoints declaring usage.source "plugin" have their
// token usage read by PlatformService.ExtractUsage after the response has
// been forwarded (CONTRACTS §25.3).

// ---------------------------------------------------------------- environment

// pluginUsageRules are the usage rules under test: one fact is declared so a
// price expression has something to read. There is deliberately no sse/json
// map - that is the whole reason an endpoint picks the plugin source, and it
// makes the fallback visible when the plugin fails. Who reads the usage is
// declared on the endpoint (pluginUsageEndpoint), not here.
func pluginUsageRules() manifest.UsageRules {
	return manifest.UsageRules{
		Semantics: "exclusive",
		Facts: map[string]manifest.UsageFact{
			"images": {Type: "number"},
			"tier":   {Type: "enum", Enum: []string{"fast", "slow"}},
		},
	}
}

// pluginUsageEndpoint is the endpoint under test: the plugin reports the
// usage and the host collects only "message_delta" from a stream.
func pluginUsageEndpoint() manifest.Endpoint {
	return manifest.Endpoint{ID: "chat", Method: "POST", Path: "/pu/v1/chat", Protocol: "pu.chat", Kind: "proxy",
		Auth:     manifest.EndpointAuth{Headers: []string{"x-api-key"}},
		Request:  manifest.EndpointRequest{ModelPath: "model", StreamPath: "stream"},
		Response: manifest.EndpointResp{Stream: "sse", NonStream: "json"}, ErrorFormat: "plain", Billing: "usage",
		UsageSource:       manifest.UsageSourcePlugin,
		UsageStreamEvents: []string{"message_delta"},
	}
}

// pluginUsageRoute is the route the endpoint above produces, for the unit
// tests of the capture that do not go through the gateway.
func pluginUsageRoute() *typeRoute {
	ep := pluginUsageEndpoint()
	return &typeRoute{usage: pluginUsageRules(), pluginUsage: ep.PluginUsage(),
		usageEvents: ep.UsageStreamEvents, usageMaxBytes: ep.UsageMaxBytes}
}

// usageEnv adds a plugin "pu" declaring platform "pu" with one endpoint at
// POST /pu/v1/chat whose usage comes from the plugin, plus an account type of
// the same plugin serving it (account 9).
func usageEnv(t *testing.T, rules manifest.UsageRules) (*env, *fakePlatform) {
	t.Helper()
	return usageEnvEP(t, rules, nil)
}

// usageEnvEP is usageEnv with a chance to change the endpoint declaration.
func usageEnvEP(t *testing.T, rules manifest.UsageRules, mut func(*manifest.Endpoint)) (*env, *fakePlatform) {
	t.Helper()
	pp := &fakePlatform{}
	e := newEnv(t, func(e *env) {
		pp.base = e.up.srv.URL
		ep := pluginUsageEndpoint()
		if mut != nil {
			mut(&ep)
		}
		pf := manifest.Platform{ID: "pu", Usage: rules, Endpoints: []manifest.Endpoint{ep}}
		info := e.addAccountType("pu", "pu_key", pp, manifest.AccountPlatform{Platform: "pu"})
		e.gen.addPlatform(info, pf, pp)
		e.accounts.addTyped(testGroup, 9, 0, "pu-9", "pu", "pu_key")
		e.accounts.groups[testGroup] = []int64{9}
	})
	return e, pp
}

// report is a UsageReport with the given token counts.
func report(in, out int64) *pluginv1.UsageReport {
	return &pluginv1.UsageReport{Tokens: &pluginv1.UsageTokens{InputTokens: in, OutputTokens: out}}
}

// ---------------------------------------------------------------- non-streaming

// A non-streaming endpoint hands the whole body to the plugin and bills what
// the plugin reports, not what the (absent) declarative rules would find.
func TestPluginUsageNonStream(t *testing.T) {
	e, pp := usageEnv(t, pluginUsageRules())
	pp.extract = func(_ context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
		r := report(100, 200)
		r.Tokens.CacheReadTokens = 9
		r.Tokens.CacheCreationTokens = 12 // total, including the 1h part
		r.Tokens.CacheCreation_1HTokens = 4
		r.Facts = map[string]string{"images": "3", "tier": "fast"}
		r.UpstreamModel = "pu-upstream-1"
		r.DetailJson = `{"job":"j-1"}`
		return r, nil
	}
	res := e.do("/pu/v1/chat", body(testModel, false), nil)
	if res.status != 200 {
		t.Fatalf("status %d %s", res.status, res.body)
	}
	// The record is submitted only once the plugin has answered, so waiting
	// for it is what makes the call observable.
	rec := e.record()
	if pp.extractCount() != 1 {
		t.Fatalf("ExtractUsage called %d times", pp.extractCount())
	}
	in := pp.lastExtract()
	if in.GetStatus() != 200 || len(in.GetEvents()) != 0 || in.GetTruncated() {
		t.Fatalf("request %+v", in)
	}
	if !strings.Contains(string(in.GetBody()), upModel) {
		t.Fatalf("body %q", in.GetBody())
	}
	if ct := in.GetHeaders()["content-type"]; !strings.Contains(ct, "json") {
		t.Fatalf("headers %v", in.GetHeaders())
	}
	// The response is read, not built: no credentials travel.
	if a := in.GetAccount(); a.GetId() != 9 || a.GetCredentialsJson() != "" || a.GetType() != "pu_key" {
		t.Fatalf("account %+v", in.GetAccount())
	}
	if in.GetMeta().GetRequestId() == "" || in.GetMeta().GetProtocol() != "pu.chat" {
		t.Fatalf("meta %+v", in.GetMeta())
	}

	// cache_creation_tokens is the total, so the 5 minute figure is 12-4.
	want := core.UsageTokens{Input: 100, Output: 200, CacheRead: 9, CacheCreation: 8, CacheCreation1h: 4}
	if rec.Tokens != want {
		t.Fatalf("tokens %+v", rec.Tokens)
	}
	if rec.Metrics["images"] != float64(3) || rec.Metrics["tier"] != "fast" || len(rec.Metrics) != 2 {
		t.Fatalf("metrics %+v", rec.Metrics)
	}
	if rec.UpstreamModel != "pu-upstream-1" {
		t.Fatalf("upstream model %q", rec.UpstreamModel)
	}
	if string(rec.PluginDetail) != `{"job":"j-1"}` {
		t.Fatalf("plugin detail %s", rec.PluginDetail)
	}
	if rec.UsageExtract != core.UsageExtractPlugin {
		t.Fatalf("usage extract %q", rec.UsageExtract)
	}
	// What the plugin reported is priced like any other usage.
	if !rec.Billable || rec.Price == nil || rec.Price.ID != 9 {
		t.Fatalf("billing %+v %+v", rec.Billable, rec.Price)
	}
}

// ---------------------------------------------------------------- streaming

// A streaming response is relayed as it arrives; the host keeps only the
// events the endpoint named and hands those to the plugin once the stream is
// over. The upstream sends four events here and exactly one is collected,
// which is the assertion that matters: the stream is not buffered.
func TestPluginUsageStreamCollectsOnlyDeclaredEvents(t *testing.T) {
	e, pp := usageEnv(t, pluginUsageRules())
	pp.extract = func(_ context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
		return report(int64(len(in.GetEvents())), 77), nil
	}
	res := e.do("/pu/v1/chat", body(testModel, true), nil)
	if res.status != 200 || !strings.Contains(string(res.body), "message_stop") {
		t.Fatalf("status %d %s", res.status, res.body)
	}
	// input_tokens echoes how many events the host handed over; the record
	// arrives only after the plugin answered, so waiting for it orders this.
	rec := e.record()
	in := pp.lastExtract()
	if len(in.GetEvents()) != 1 {
		t.Fatalf("collected %d events, want only the declared one: %+v", len(in.GetEvents()), in.GetEvents())
	}
	ev := in.GetEvents()[0]
	if ev.GetName() != "message_delta" || !strings.Contains(string(ev.GetData()), `"output_tokens":22`) {
		t.Fatalf("event %s %s", ev.GetName(), ev.GetData())
	}
	if len(in.GetBody()) != 0 || in.GetTruncated() {
		t.Fatalf("body %q truncated %v", in.GetBody(), in.GetTruncated())
	}
	if rec.Tokens.Input != 1 || rec.Tokens.Output != 77 {
		t.Fatalf("tokens %+v", rec.Tokens)
	}
}

// fatStream answers with n SSE events of roughly size bytes each, all named
// "message_delta".
func fatStream(t *testing.T, n, size int) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fl := w.(http.Flusher)
		pad := strings.Repeat("x", size)
		for i := range n {
			fmt.Fprintf(w, "event: message_delta\ndata: {\"type\":\"message_delta\",\"i\":%d,\"pad\":%q}\n\n", i, pad)
			fl.Flush()
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

// Collection stops at the byte budget: the plugin is told the events are a
// prefix, and the stream itself was still relayed in full.
func TestPluginUsageStreamStopsAtByteBudget(t *testing.T) {
	e, pp := usageEnvEP(t, pluginUsageRules(), func(ep *manifest.Endpoint) { ep.UsageMaxBytes = 1 << 10 })
	up := fatStream(t, 20, 400)
	pp.route = func(*pluginv1.BuildUpstreamRequestRequest) string { return up.URL }
	pp.extract = func(_ context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
		return report(int64(len(in.GetEvents())), 0), nil
	}
	res := e.do("/pu/v1/chat", body(testModel, true), nil)
	if sent := strings.Count(string(res.body), "event: message_delta"); res.status != 200 || sent != 20 {
		t.Fatalf("client got %d of 20 events (status %d)", sent, res.status)
	}
	rec := e.record()
	in := pp.lastExtract()
	if !in.GetTruncated() {
		t.Fatal("truncated not reported")
	}
	if n := len(in.GetEvents()); n == 0 || n >= 20 {
		t.Fatalf("collected %d of 20 events; the budget should have stopped it well short", n)
	}
	if int(rec.Tokens.Input) != len(in.GetEvents()) {
		t.Fatalf("tokens %+v", rec.Tokens)
	}
}

// The event count cap stops collection even when every event is tiny.
func TestUsageCaptureEventCountCap(t *testing.T) {
	cap := newUsageCapture(pluginUsageRoute())
	for i := range maxUsageStreamEvents + 10 {
		cap.addEvent("message_delta", fmt.Appendf(nil, `{"i":%d}`, i))
	}
	if len(cap.events) != maxUsageStreamEvents || !cap.stopped {
		t.Fatalf("collected %d events, stopped=%v", len(cap.events), cap.stopped)
	}
	// Undeclared events are never collected, whatever the budget.
	cap2 := newUsageCapture(pluginUsageRoute())
	cap2.addEvent("content_block_delta", []byte(`{"a":1}`))
	if len(cap2.events) != 0 || cap2.stopped {
		t.Fatalf("collected %+v", cap2.events)
	}
	// An endpoint on the declarative rules captures nothing at all.
	if newUsageCapture(&typeRoute{usage: manifest.UsageRules{Semantics: "exclusive"}}) != nil {
		t.Fatal("capture built for an endpoint that did not ask for one")
	}
}

// The event data handed over is the event's own bytes, not a slice of the
// forwarding loop's reusable buffer.
func TestUsageCaptureCopiesEventData(t *testing.T) {
	cap := newUsageCapture(pluginUsageRoute())
	buf := []byte(`{"type":"message_delta","n":1}`)
	cap.addEvent("message_delta", buf)
	for i := range buf {
		buf[i] = 'z'
	}
	if string(cap.events[0].GetData()) != `{"type":"message_delta","n":1}` {
		t.Fatalf("data aliased the caller's buffer: %s", cap.events[0].GetData())
	}
}

// ---------------------------------------------------------------- the boundary

// A plugin states upstream facts and nothing else. It has no field for
// attribution or cost in UsageReport, and the facts map is not a back door:
// keys the manifest never declared are dropped, and so are values that do not
// fit the declared type. What the record carries for user, key, group,
// account, multiplier and price is what the core put there.
func TestPluginUsageCannotForgeAttributionOrCost(t *testing.T) {
	e, pp := usageEnv(t, pluginUsageRules())
	pp.extract = func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
		r := report(5, 5)
		r.Facts = map[string]string{
			// Attribution and money, in the only map a plugin can fill.
			"user_id": "999", "api_key_id": "999", "group_id": "999", "account_id": "999",
			"total_cost": "0", "rate_multiplier": "0", "price_id": "1",
			// A declared fact with a value outside its declared enum.
			"tier": "free",
			// A declared fact of the wrong type.
			"images": "many",
		}
		r.DetailJson = `{"user_id":999,"total_cost":0,"account_id":999}`
		return r, nil
	}
	e.do("/pu/v1/chat", body(testModel, false), nil)
	rec := e.record()
	if rec.UserID != testUser || rec.APIKeyID != 5 || rec.GroupID != testGroup {
		t.Fatalf("attribution %d %d %d", rec.UserID, rec.APIKeyID, rec.GroupID)
	}
	if rec.AccountID == nil || *rec.AccountID != 9 {
		t.Fatalf("account %v", rec.AccountID)
	}
	if rec.RateMultiplier.String() != "1.5" || rec.Price == nil || rec.Price.ID != 9 {
		t.Fatalf("pricing %s %+v", rec.RateMultiplier, rec.Price)
	}
	if rec.PluginKey != "pu" || rec.Platform != "pu" || rec.Endpoint != "/pu/v1/chat" || rec.NodeID != "node-test" {
		t.Fatalf("core fields %+v", rec)
	}
	// Every fact was refused: undeclared keys, a value outside the enum, a
	// non-number for a number.
	if len(rec.Metrics) != 0 {
		t.Fatalf("metrics %+v", rec.Metrics)
	}
	// detail_json is stored verbatim but is never read by anything: it says
	// nothing about the record's own fields.
	if string(rec.PluginDetail) != `{"user_id":999,"total_cost":0,"account_id":999}` {
		t.Fatalf("plugin detail %s", rec.PluginDetail)
	}
}

// ---------------------------------------------------------------- detail_json

func TestPluginUsageDetailJSONLimits(t *testing.T) {
	for _, tc := range []struct {
		name, detail, want string
	}{
		{"object", `{"a":1}`, `{"a":1}`},
		{"empty", "", ""},
		// jsonb cannot hold half a document, so an over-long one becomes a
		// marker that says how big it was.
		{"too_large", `{"pad":"` + strings.Repeat("x", core.MaxPluginDetailBytes) + `"}`, ""},
		{"not_an_object", `[1,2,3]`, ""},
		{"invalid", `{nope`, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			e, pp := usageEnv(t, pluginUsageRules())
			pp.extract = func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
				r := report(1, 1)
				r.DetailJson = tc.detail
				return r, nil
			}
			e.do("/pu/v1/chat", body(testModel, false), nil)
			rec := e.record()
			got := string(rec.PluginDetail)
			if tc.name == "too_large" {
				var m map[string]any
				if err := json.Unmarshal(rec.PluginDetail, &m); err != nil || m["_truncated"] != true {
					t.Fatalf("marker %s (%v)", got, err)
				}
				return
			}
			if got != tc.want {
				t.Fatalf("plugin detail %q, want %q", got, tc.want)
			}
		})
	}
}

// ---------------------------------------------------------------- failure

// A plugin that cannot answer never turns an already-delivered response into
// an error. The request keeps its 200, the record is billed from whatever the
// declarative rules found, and the fallback is recorded so it can be found
// later - for this endpoint the rules find nothing, which is exactly the case
// worth alerting on.
func TestPluginUsageFallsBackWhenThePluginFails(t *testing.T) {
	cases := map[string]func(*fakePlatform){
		"unimplemented": func(p *fakePlatform) { p.extract = nil },
		"error": func(p *fakePlatform) {
			p.extract = func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
				return nil, fmt.Errorf("boom")
			}
		},
		"nil_answer": func(p *fakePlatform) {
			p.extract = func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
				return nil, nil
			}
		},
		"timeout": func(p *fakePlatform) {
			p.extract = func(ctx context.Context, _ *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
				<-ctx.Done()
				return nil, ctx.Err()
			}
		},
	}
	for name, setup := range cases {
		t.Run(name, func(t *testing.T) {
			e, pp := usageEnv(t, pluginUsageRules())
			if name == "timeout" {
				gw := defaultGatewaySettings()
				gw.PlatformHotpathTimeoutMs = 50
				e.setSettings(gw, StickySettings{})
			}
			setup(pp)
			res := e.do("/pu/v1/chat", body(testModel, false), nil)
			if res.status != 200 {
				t.Fatalf("status %d %s", res.status, res.body)
			}
			rec := e.record()
			if rec.UsageExtract != core.UsageExtractFallback {
				t.Fatalf("usage extract %q", rec.UsageExtract)
			}
			if !rec.Success {
				t.Fatalf("a delivered response must stay a success: %+v", rec)
			}
			// These rules declare no json map, so the fallback counts zero -
			// the trade the marker exists to make visible.
			if rec.Tokens != (core.UsageTokens{}) {
				t.Fatalf("tokens %+v", rec.Tokens)
			}
		})
	}
}

// The fallback is the declarative rules' answer, not zero by definition: an
// endpoint that keeps its json map gets billed from it when the plugin fails.
func TestPluginUsageFallbackUsesTheDeclarativeRules(t *testing.T) {
	rules := pluginUsageRules()
	rules.JSON = &manifest.UsageMap{Map: map[string]string{
		manifest.UsageInputTokens:  "usage.input_tokens",
		manifest.UsageOutputTokens: "usage.output_tokens",
	}}
	e, _ := usageEnv(t, rules)
	e.do("/pu/v1/chat", body(testModel, false), nil)
	rec := e.record()
	if rec.UsageExtract != core.UsageExtractFallback {
		t.Fatalf("usage extract %q", rec.UsageExtract)
	}
	if rec.Tokens.Input != upInput || rec.Tokens.Output != upOutput {
		t.Fatalf("tokens %+v", rec.Tokens)
	}
}

// A platform whose plugin has no PlatformService (declared before the
// install-time check existed) falls back too, instead of 500-ing a response
// the client already has.
func TestPluginUsageWithoutPlatformClient(t *testing.T) {
	pp := &fakePlatform{}
	e := newEnv(t, func(e *env) {
		pp.base = e.up.srv.URL
		ep := pluginUsageEndpoint()
		ep.Response = manifest.EndpointResp{NonStream: "json"}
		pf := manifest.Platform{ID: "pu", Usage: pluginUsageRules(), Endpoints: []manifest.Endpoint{ep}}
		info := e.addAccountType("pu", "pu_key", pp, manifest.AccountPlatform{Platform: "pu"})
		e.gen.addPlatform(info, pf) // no client
		e.accounts.addTyped(testGroup, 9, 0, "pu-9", "pu", "pu_key")
		e.accounts.groups[testGroup] = []int64{9}
	})
	res := e.do("/pu/v1/chat", body(testModel, false), nil)
	if res.status != 200 {
		t.Fatalf("status %d %s", res.status, res.body)
	}
	if rec := e.record(); rec.UsageExtract != core.UsageExtractFallback {
		t.Fatalf("usage extract %q", rec.UsageExtract)
	}
	if pp.extractCount() != 0 {
		t.Fatalf("ExtractUsage called %d times without a platform client", pp.extractCount())
	}
}

// ---------------------------------------------------------------- not declared

// Endpoints that say nothing about usage.source keep the behaviour they had
// before this existed: the declarative rules, and not one call.
func TestExtractUsageNotCalledWithoutDeclaration(t *testing.T) {
	e := newEnv(t)
	for _, stream := range []bool{false, true} {
		if r := e.messages(body(testModel, stream)); r.status != 200 {
			t.Fatalf("status %d %s", r.status, r.body)
		}
		rec := e.record()
		if rec.Tokens.Input != upInput || rec.Tokens.Output != upOutput {
			t.Fatalf("tokens %+v", rec.Tokens)
		}
		if rec.UsageExtract != "" || rec.PluginDetail != nil {
			t.Fatalf("record carries plugin usage state: %q %s", rec.UsageExtract, rec.PluginDetail)
		}
	}
	if e.plat.extractCount() != 0 {
		t.Fatalf("ExtractUsage called %d times", e.plat.extractCount())
	}
}

// ---------------------------------------------------------------- latency

// ExtractUsage runs after the last byte reached the client: a plugin that
// blocks in it delays the usage record, never the response.
func TestExtractUsageRunsAfterTheResponse(t *testing.T) {
	e, pp := usageEnv(t, pluginUsageRules())
	gw := defaultGatewaySettings()
	gw.PlatformHotpathTimeoutMs = 300
	e.setSettings(gw, StickySettings{})
	pp.extract = func(ctx context.Context, _ *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
		time.Sleep(150 * time.Millisecond)
		return report(1, 1), nil
	}
	start := time.Now()
	res := e.do("/pu/v1/chat", body(testModel, true), nil)
	clientDone := time.Since(start)
	if res.status != 200 {
		t.Fatalf("status %d", res.status)
	}
	rec := e.record()
	if rec.Tokens.Input != 1 {
		t.Fatalf("tokens %+v", rec.Tokens)
	}
	// The record waited for the plugin; the client did not. Compared against
	// the sleep so the assertion cannot pass by being slow everywhere.
	if clientDone >= 150*time.Millisecond {
		t.Fatalf("client waited %s for a call that must run after its last byte", clientDone)
	}
}

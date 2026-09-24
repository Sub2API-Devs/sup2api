package gateway

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"sync"
	"testing"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

// addAccountType registers a plugin declaring one account type serving the
// given platforms.
func (e *env) addAccountType(pluginKey, typeID string, client core.PlatformPlugin, platforms ...manifest.AccountPlatform) core.PluginInfo {
	t := manifest.AccountType{ID: typeID, Label: manifest.LocalizedText{"en": typeID}, Platforms: platforms}
	info := core.PluginInfo{Key: pluginKey, Version: "1.2.3",
		Manifest: &manifest.Manifest{Key: pluginKey, AccountTypes: []manifest.AccountType{t}}}
	e.gen.plugins = append(e.gen.plugins, info)
	e.gen.accountTypes = append(e.gen.accountTypes, core.AccountTypeBinding{Plugin: info, Type: t, Client: client})
	return info
}

func hasKey(keys []core.AccountTypeKey, pluginKey, typ string) bool {
	return slices.Contains(keys, core.AccountTypeKey{PluginKey: pluginKey, Type: typ})
}

// ---------------------------------------------------------------- mixed account types

func TestMixedAccountTypesServeOneEndpoint(t *testing.T) {
	e := newEnv(t)
	relay := &fakePlatform{base: e.up.srv.URL}
	e.addAccountType("relay", "relay_key", relay,
		manifest.AccountPlatform{Platform: "anthropic", PassHeaders: []string{"x-relay-hint"}})
	e.accounts.addTyped(testGroup, 4, 0, "relay-4", "relay", "relay_key")

	// Priority: the relay account (priority 0) goes first.
	r := e.do("/v1/messages", body(testModel, false), map[string]string{"x-relay-hint": "h1"})
	if r.status != 200 || strings.Join(e.up.keys(), ",") != "relay-4" {
		t.Fatalf("relay first: %d %v %s", r.status, e.up.keys(), r.body)
	}
	if !hasKey(e.accounts.lastTypes, "anthropic", "apikey") || !hasKey(e.accounts.lastTypes, "relay", "relay_key") {
		t.Fatalf("candidate types %v", e.accounts.lastTypes)
	}
	rec := e.record()
	if rec.PluginKey != "relay" || rec.PluginVersion != "1.2.3" || rec.AccountType != "relay_key" ||
		rec.Platform != "anthropic" || rec.Protocol != "anthropic.messages" || rec.UpstreamProtocol != "anthropic.messages" ||
		*rec.AccountID != 4 || rec.Tokens.Output != upOutput || !rec.Billable || rec.UsageSemantics != "exclusive" {
		t.Fatalf("relay record %+v", rec)
	}
	b := relay.builds[0]
	if b.GetAccount().GetPlatform() != "anthropic" || b.GetAccount().GetType() != "relay_key" ||
		b.GetMeta().GetProtocol() != "anthropic.messages" || b.GetMeta().GetClientProtocol() != "anthropic.messages" {
		t.Fatalf("relay build meta %+v account %+v", b.GetMeta(), b.GetAccount())
	}
	// Request fields fall back to the platform; pass headers are overridden.
	if b.GetFields()["model"] != `"`+testModel+`"` {
		t.Fatalf("fields %v", b.GetFields())
	}
	if h := b.GetInboundHeaders(); h["x-relay-hint"] != "h1" || h["anthropic-version"] != "" {
		t.Fatalf("pass headers %v", h)
	}
	if e.plat.buildCount() != 0 {
		t.Fatal("anthropic plugin built a request for a relay account")
	}

	// Failover across types: relay 429 -> anthropic account 1.
	e.up.set("relay-4", &upstreamRule{status: 429})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("failover: %d %s", r.status, r.body)
	}
	if k := e.up.keys(); strings.Join(k, ",") != "relay-4,relay-4,acc-1" {
		t.Fatalf("upstream order %v", k)
	}
	if len(relay.classify) != 1 || len(e.plat.classify) != 0 {
		t.Fatalf("classify calls relay=%d anthropic=%d", len(relay.classify), len(e.plat.classify))
	}
	if c := relay.classify[0]; c.GetAccount().GetType() != "relay_key" || c.GetMeta().GetProtocol() != "anthropic.messages" {
		t.Fatalf("classify request %+v", c)
	}
	rec = e.record()
	if rec.Attempts != 2 || *rec.AccountID != 1 || rec.PluginKey != "anthropic" || rec.AccountType != "apikey" {
		t.Fatalf("failover record %+v", rec)
	}
	if len(e.accounts.cooldowns) != 1 || e.accounts.cooldowns[0] != 4 {
		t.Fatalf("cooldowns %v", e.accounts.cooldowns)
	}
}

func TestUnsupportedAccountTypeNotScheduled(t *testing.T) {
	e := newEnv(t)
	other := &fakePlatform{base: e.up.srv.URL}
	e.addAccountType("gem", "gem_key", other, manifest.AccountPlatform{Platform: "gemini"})
	e.accounts.addTyped(testGroup, 5, 0, "gem-5", "gem", "gem_key")

	if r := e.messages(body(testModel, false)); r.status != 200 || strings.Join(e.up.keys(), ",") != "acc-1" {
		t.Fatalf("status %d keys %v", r.status, e.up.keys())
	}
	if hasKey(e.accounts.lastTypes, "gem", "gem_key") {
		t.Fatalf("unsupported type requested: %v", e.accounts.lastTypes)
	}
	e.record()

	// Only the unsupported account left in the group: 503.
	e.accounts.groups[testGroup] = []int64{5}
	r := e.messages(body(testModel, false))
	if r.status != 503 || r.json().Get("error.code").String() != "no_available_account" || other.buildCount() != 0 {
		t.Fatalf("unsupported only: %d %s", r.status, r.body)
	}
	e.record()

	// No account type at all for the protocol: 503 before pricing.
	e.gen.accountTypes = e.gen.accountTypes[1:]
	calls := e.pricer.calls
	if r := e.messages(body(testModel, false)); r.status != 503 {
		t.Fatalf("no type: %d", r.status)
	}
	if e.pricer.calls != calls {
		t.Fatal("priced a request no account type can serve")
	}
	if rec := e.record(); rec.ErrorType != errTypeNoAccount {
		t.Fatalf("record %+v", rec)
	}
}

func TestPlanRoutes(t *testing.T) {
	anth := builtinPlatform(t, "anthropic")
	cl := &fakePlatform{}
	acctUsage := manifest.UsageRules{Semantics: "account"}
	epUsage := &manifest.UsageRules{Semantics: "endpoint"}
	// Plugin platform "x": x.up (endpoint usage override) and x.plain.
	xp := manifest.Platform{ID: "x", RequestFields: []string{"xf"}, PassHeaders: []string{"x-h"},
		Usage: manifest.UsageRules{Semantics: "platform"},
		Endpoints: []manifest.Endpoint{
			{ID: "plain", Method: "POST", Path: "/x/plain", Protocol: "x.plain"},
			{ID: "up", Method: "POST", Path: "/x/up", Protocol: "x.up", Usage: epUsage},
		}}
	mk := func(key, id string, client core.PlatformPlugin, ps ...manifest.AccountPlatform) core.AccountTypeBinding {
		return core.AccountTypeBinding{Plugin: core.PluginInfo{Key: key}, Type: manifest.AccountType{ID: id, Platforms: ps}, Client: client}
	}
	gen := newFakeGen()
	gen.addPlatform(core.PluginInfo{Key: "xplug"}, xp)
	gen.accountTypes = []core.AccountTypeBinding{
		mk("a", "native", cl, manifest.AccountPlatform{Platform: "anthropic"}),
		mk("b", "conv", cl, manifest.AccountPlatform{Platform: "gemini"},
			manifest.AccountPlatform{Platform: "x", RequestFields: []string{"q"}}),
		mk("c", "both", cl, manifest.AccountPlatform{Platform: "x"}, manifest.AccountPlatform{Platform: "anthropic",
			PassHeaders: []string{"h1"}, Usage: map[string]manifest.UsageRules{"anthropic.messages": acctUsage}}),
		mk("d", "none", cl, manifest.AccountPlatform{Platform: "openai"}),
		mk("e", "noclient", nil, manifest.AccountPlatform{Platform: "anthropic"}),
		mk("f", "gone", cl, manifest.AccountPlatform{Platform: "disabled_plugin_platform"}),
		mk("g", "convacct", cl, manifest.AccountPlatform{Platform: "x",
			Usage: map[string]manifest.UsageRules{"x.up": acctUsage}}),
	}
	g := &Gateway{conv: convert.NewRegistry(&fakeConv{from: "anthropic.messages", to: "x.up"})}
	c := &call{g: g, gen: gen, ep: endpointOf(t, anth, "anthropic.messages"), platform: "anthropic", pf: anth}
	c.planRoutes()
	if len(c.routeKeys) != 4 {
		t.Fatalf("routes %v", c.routeKeys)
	}
	a := c.routes[core.AccountTypeKey{PluginKey: "a", Type: "native"}]
	if a == nil || a.conv != nil || a.upstream != "anthropic.messages" || a.platform != "anthropic" ||
		!slices.Equal(a.requestFields, []string{"model"}) || a.usage.Semantics != "exclusive" ||
		!slices.Equal(a.passHeaders, anth.PassHeaders) {
		t.Fatalf("native route %+v", a)
	}
	b := c.routes[core.AccountTypeKey{PluginKey: "b", Type: "conv"}]
	if b == nil || b.conv == nil || b.upstream != "x.up" || b.platform != "x" || !slices.Equal(b.requestFields, []string{"q"}) ||
		b.usage.Semantics != "endpoint" || !slices.Equal(b.passHeaders, []string{"x-h"}) {
		t.Fatalf("converting route %+v", b)
	}
	both := c.routes[core.AccountTypeKey{PluginKey: "c", Type: "both"}]
	if both == nil || both.conv != nil || both.upstream != "anthropic.messages" || both.usage.Semantics != "account" ||
		!slices.Equal(both.passHeaders, []string{"h1"}) {
		t.Fatalf("native must win over conversion: %+v", both)
	}
	ca := c.routes[core.AccountTypeKey{PluginKey: "g", Type: "convacct"}]
	if ca == nil || ca.conv == nil || ca.usage.Semantics != "account" || !slices.Equal(ca.requestFields, []string{"xf"}) {
		t.Fatalf("converting route with account usage %+v", ca)
	}
	// Native types are listed first.
	if c.routeKeys[0] != (core.AccountTypeKey{PluginKey: "a", Type: "native"}) ||
		c.routeKeys[1] != (core.AccountTypeKey{PluginKey: "c", Type: "both"}) {
		t.Fatalf("order %v", c.routeKeys)
	}

	// An endpoint-level usage override applies to native routes too.
	ep := endpointOf(t, anth, "anthropic.messages")
	ep.Usage = epUsage
	c = &call{g: g, gen: gen, ep: ep, platform: "anthropic", pf: anth}
	c.planRoutes()
	if r := c.routes[core.AccountTypeKey{PluginKey: "a", Type: "native"}]; r.usage.Semantics != "endpoint" {
		t.Fatalf("endpoint usage %+v", r.usage)
	}
}

// ---------------------------------------------------------------- conversion

// fakeConv converts anthropic.messages <-> a toy "q" protocol:
// request {q_model, q_stream, q_prompt}; response {q_model, q_text,
// q_usage:{in,out}}; stream events {q_delta} / {q_usage} / [DONE].
// Converted responses carry no usage, so extraction must use the upstream
// body.
type fakeConv struct {
	from, to string
	reqErr   error
	respErr  error
}

func (f *fakeConv) From() string { return f.from }
func (f *fakeConv) To() string   { return f.to }

func (f *fakeConv) Request(b []byte) ([]byte, error) {
	if f.reqErr != nil {
		return nil, f.reqErr
	}
	return json.Marshal(map[string]any{
		"q_model":  gjson.GetBytes(b, "model").String(),
		"q_stream": gjson.GetBytes(b, "stream").Bool(),
		"q_prompt": gjson.GetBytes(b, "messages.0.content").String(),
	})
}

func (f *fakeConv) Response(b []byte) ([]byte, error) {
	if f.respErr != nil {
		return nil, f.respErr
	}
	if !gjson.ValidBytes(b) {
		return nil, errors.New("bad upstream json")
	}
	return json.Marshal(map[string]any{"type": "message", "role": "assistant", "model": gjson.GetBytes(b, "q_model").String(),
		"content": []any{map[string]any{"type": "text", "text": gjson.GetBytes(b, "q_text").String()}}})
}

func (f *fakeConv) NewStream() convert.StreamConverter { return &fakeConvStream{} }

type fakeConvStream struct{ started bool }

func ev(name string, v any) convert.Event {
	b, _ := json.Marshal(v)
	return convert.Event{Name: name, Data: b}
}

func (s *fakeConvStream) Event(in convert.Event) ([]convert.Event, error) {
	if string(in.Data) == "[DONE]" {
		return nil, nil
	}
	var out []convert.Event
	if !s.started {
		s.started = true
		out = append(out, ev("message_start", map[string]any{"type": "message_start",
			"message": map[string]any{"model": gjson.GetBytes(in.Data, "q_model").String()}}))
	}
	if d := gjson.GetBytes(in.Data, "q_delta"); d.Exists() {
		out = append(out, ev("content_block_delta", map[string]any{"type": "content_block_delta",
			"delta": map[string]any{"type": "text_delta", "text": d.String()}}))
	}
	if gjson.GetBytes(in.Data, "q_usage").Exists() {
		out = append(out, ev("message_delta", map[string]any{"type": "message_delta", "delta": map[string]any{"stop_reason": "end_turn"}}))
	}
	return out, nil
}

func (s *fakeConvStream) Flush() ([]convert.Event, error) {
	return []convert.Event{ev("message_stop", map[string]any{"type": "message_stop"})}, nil
}

// qUpstream speaks the toy "q" protocol.
type qUpstream struct {
	srv    *httptest.Server
	mu     sync.Mutex
	bodies [][]byte
	status int
}

func newQUpstream(t *testing.T) *qUpstream {
	q := &qUpstream{}
	q.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		q.mu.Lock()
		q.bodies = append(q.bodies, b)
		status := q.status
		q.mu.Unlock()
		if status != 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(status)
			_, _ = w.Write([]byte(`{"q_error":"boom"}`))
			return
		}
		if !gjson.GetBytes(b, "q_stream").Bool() {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"q_model":"q-up","q_text":"hello","q_usage":{"in":13,"out":17}}`))
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		for _, d := range []string{`{"q_model":"q-up","q_delta":"he"}`, `{"q_delta":"llo"}`, `{"q_usage":{"in":13,"out":17}}`, `[DONE]`} {
			_, _ = fmt.Fprintf(w, "data: %s\n\n", d)
			w.(http.Flusher).Flush()
		}
	}))
	t.Cleanup(q.srv.Close)
	return q
}

func (q *qUpstream) last() []byte {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.bodies[len(q.bodies)-1]
}

var qUsage = &manifest.UsageRules{
	Semantics: "inclusive",
	JSON: &manifest.UsageMap{Map: map[string]string{
		"model": "q_model", "input_tokens": "q_usage.in", "output_tokens": "q_usage.out"}},
	SSE: []manifest.SSEUsageMap{{Map: map[string]string{
		"model": "q_model", "input_tokens": "q_usage.in", "output_tokens": "q_usage.out"}}},
}

// convEnv adds a "qplug" plugin declaring platform "q" (protocol q.chat) and
// an account type serving it (priority 0, account 6), and a converter
// anthropic.messages -> q.chat.
func convEnv(t *testing.T, conv *fakeConv) (*env, *qUpstream, *fakePlatform) {
	q := newQUpstream(t)
	qp := &fakePlatform{urlFor: func(*pluginv1.Account) string { return q.srv.URL + "/q" }}
	e := newEnv(t, func(e *env) {
		if conv == nil {
			conv = &fakeConv{}
		}
		conv.from, conv.to = "anthropic.messages", "q.chat"
		if err := e.conv.Register(conv); err != nil {
			t.Fatal(err)
		}
		info := e.addAccountType("qplug", "q_key", qp, manifest.AccountPlatform{Platform: "q", RequestFields: []string{"q_model"}})
		e.gen.addPlatform(info, manifest.Platform{ID: "q", Usage: *qUsage, Endpoints: []manifest.Endpoint{{
			ID: "chat", Method: "POST", Path: "/q/chat", Protocol: "q.chat", Kind: "proxy",
			Auth: manifest.EndpointAuth{Headers: []string{"x-api-key"}}, Request: manifest.EndpointRequest{ModelPath: "q_model"},
			ErrorFormat: "plain", Billing: "usage"}}})
		e.accounts.addTyped(testGroup, 6, 0, "q-6", "qplug", "q_key")
	})
	return e, q, qp
}

func TestConvertedNonStream(t *testing.T) {
	e, q, qp := convEnv(t, nil)
	if !e.gw.CanConvert("anthropic.messages", "q.chat") || e.gw.CanConvert("q.chat", "anthropic.messages") {
		t.Fatal("CanConvert")
	}
	r := e.messages(body(testModel, false))
	if r.status != 200 || r.json().Get("type").String() != "message" || r.json().Get("content.0.text").String() != "hello" ||
		strings.Contains(string(r.body), "q_") {
		t.Fatalf("converted response %d %s", r.status, r.body)
	}
	if len(e.up.keys()) != 0 {
		t.Fatal("anthropic upstream called")
	}
	up := q.last()
	if gjson.GetBytes(up, "q_model").String() != testModel || gjson.GetBytes(up, "q_prompt").String() != "hello there" ||
		gjson.GetBytes(up, "model").Exists() {
		t.Fatalf("converted request %s", up)
	}
	b := qp.builds[0]
	if b.GetMeta().GetProtocol() != "q.chat" || b.GetMeta().GetClientProtocol() != "anthropic.messages" ||
		b.GetFields()["q_model"] != `"`+testModel+`"` || b.GetAccount().GetPlatform() != "anthropic" || b.GetAccount().GetType() != "q_key" {
		t.Fatalf("build request meta=%+v fields=%v account=%+v", b.GetMeta(), b.GetFields(), b.GetAccount())
	}
	rec := e.record()
	if rec.Protocol != "anthropic.messages" || rec.UpstreamProtocol != "q.chat" || rec.AccountType != "q_key" ||
		rec.PluginKey != "qplug" || rec.Platform != "anthropic" || rec.UsageSemantics != "inclusive" ||
		rec.UpstreamModel != "q-up" || !rec.Success || !rec.Billable || rec.Price == nil || rec.Price.ID != 9 {
		t.Fatalf("record %+v", rec)
	}
	if rec.Tokens != (core.UsageTokens{Input: 13, Output: 17}) {
		t.Fatalf("tokens %+v", rec.Tokens)
	}
	if e.pricer.calls != 1 {
		t.Fatalf("price resolved %d times", e.pricer.calls)
	}
}

func TestConvertedStream(t *testing.T) {
	e, _, _ := convEnv(t, nil)
	raw, _ := json.Marshal(body(testModel, true))
	req, _ := http.NewRequest(http.MethodPost, e.srv.URL+"/v1/messages", strings.NewReader(string(raw)))
	req.Header.Set("x-api-key", testKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 || !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") {
		t.Fatalf("stream %d %s", resp.StatusCode, resp.Header.Get("Content-Type"))
	}
	var events, texts []string
	sc := bufio.NewScanner(resp.Body)
	for sc.Scan() {
		l := sc.Text()
		switch {
		case strings.HasPrefix(l, "event: "):
			events = append(events, l[len("event: "):])
		case strings.HasPrefix(l, "data: "):
			d := l[len("data: "):]
			if strings.Contains(d, "q_") || d == "[DONE]" {
				t.Fatalf("unconverted data %q", d)
			}
			if tx := gjson.Get(d, "delta.text"); tx.Exists() {
				texts = append(texts, tx.String())
			}
		}
	}
	if strings.Join(events, ",") != "message_start,content_block_delta,content_block_delta,message_delta,message_stop" ||
		strings.Join(texts, "") != "hello" {
		t.Fatalf("events %v texts %v", events, texts)
	}
	rec := e.record()
	if !rec.Success || !rec.Stream || rec.UpstreamProtocol != "q.chat" || rec.FirstTokenMs <= 0 ||
		rec.Tokens != (core.UsageTokens{Input: 13, Output: 17}) || rec.UpstreamModel != "q-up" {
		t.Fatalf("stream record %+v", rec)
	}
}

func TestConvertedErrors(t *testing.T) {
	// Upstream 400 on a converted route: endpoint error format, no raw q body.
	e, q, qp := convEnv(t, nil)
	q.status = 400
	r := e.messages(body(testModel, false))
	if r.status != 400 || r.json().Get("type").String() != "error" || strings.Contains(string(r.body), "q_error") {
		t.Fatalf("converted 400: %d %s", r.status, r.body)
	}
	if c := qp.classify[0]; c.GetMeta().GetProtocol() != "q.chat" || !strings.Contains(string(c.GetBodyPrefix()), "q_error") {
		t.Fatalf("classify %+v", c)
	}
	e.record()

	// Upstream 500: fail over to a native account.
	q.status = 500
	if r := e.messages(body(testModel, false)); r.status != 200 || strings.Join(e.up.keys(), ",") != "acc-1" {
		t.Fatalf("failover from converted: %d %v", r.status, e.up.keys())
	}
	if rec := e.record(); rec.UpstreamProtocol != "anthropic.messages" || rec.AccountType != "apikey" {
		t.Fatalf("record %+v", rec)
	}
}

func TestConvertRequestFailureSkipsType(t *testing.T) {
	e, q, qp := convEnv(t, &fakeConv{reqErr: errors.New("unsupported block")})
	e.accounts.addTyped(testGroup, 7, 0, "q-7", "qplug", "q_key")
	if r := e.messages(body(testModel, false)); r.status != 200 || strings.Join(e.up.keys(), ",") != "acc-1" {
		t.Fatalf("status %d keys %v", r.status, e.up.keys())
	}
	if qp.buildCount() != 0 || len(q.bodies) != 0 {
		t.Fatal("unconvertible request sent upstream")
	}
	// One attempt for the failed conversion, the other q account skipped.
	if rec := e.record(); rec.Attempts != 2 || *rec.AccountID != 1 {
		t.Fatalf("record %+v", rec)
	}
	// Only q accounts: the conversion error reaches the client.
	e.accounts.groups[testGroup] = []int64{6, 7}
	r := e.messages(body(testModel, false))
	if r.status != 400 || !strings.Contains(r.json().Get("error.message").String(), "unsupported block") {
		t.Fatalf("conversion error: %d %s", r.status, r.body)
	}
	if rec := e.record(); rec.ErrorType != errTypeInvalidRequest || rec.Attempts != 1 {
		t.Fatalf("record %+v", rec)
	}
}

func TestConvertResponseFailure(t *testing.T) {
	e, _, _ := convEnv(t, &fakeConv{respErr: errors.New("cannot map")})
	r := e.messages(body(testModel, false))
	if r.status != 502 || r.json().Get("type").String() != "error" {
		t.Fatalf("response conversion failure: %d %s", r.status, r.body)
	}
	rec := e.record()
	if rec.Success || rec.StatusCode != 502 || rec.ErrorType != errTypeUpstream || rec.Tokens.Input != 13 || !rec.Billable {
		t.Fatalf("record %+v", rec)
	}
}

// ---------------------------------------------------------------- plugin platforms

// A plugin platform's endpoints exist while the plugin is enabled and 404
// once it is disabled; the built-in endpoints stay.
func TestPluginPlatformEndpoints(t *testing.T) {
	e := newEnv(t)
	anth := builtinPlatform(t, "anthropic")
	ep := manifest.Endpoint{ID: "gen", Method: "POST", Path: "/v1/video/generations", Protocol: "myvideo.gen", Kind: "proxy",
		Auth: manifest.EndpointAuth{Headers: []string{"x-api-key"}}, Request: manifest.EndpointRequest{ModelPath: "model", StreamPath: "stream"},
		ErrorFormat: "plain", Billing: "usage"}
	vp := &fakePlatform{base: e.up.srv.URL}
	info := e.addAccountType("video", "video_key", vp, manifest.AccountPlatform{Platform: "myvideo", RequestFields: []string{"model"}})
	e.gen.addPlatform(info, manifest.Platform{ID: "myvideo", Usage: anth.Usage, Endpoints: []manifest.Endpoint{ep}})
	e.accounts.addTyped(testGroup, 8, 0, "video-8", "video", "video_key")
	e.reg.set(e.gen)

	r := e.do("/v1/video/generations", body(testModel, false), nil)
	if r.status != 200 || strings.Join(e.up.keys(), ",") != "video-8" {
		t.Fatalf("plugin endpoint: %d %v %s", r.status, e.up.keys(), r.body)
	}
	if b := vp.builds[0]; b.GetAccount().GetPlatform() != "myvideo" || b.GetMeta().GetProtocol() != "myvideo.gen" {
		t.Fatalf("build %+v", b)
	}
	rec := e.record()
	if rec.Platform != "myvideo" || rec.Protocol != "myvideo.gen" || rec.PluginKey != "video" || rec.AccountType != "video_key" ||
		rec.Tokens.Output != upOutput || !rec.Billable || rec.Endpoint != "/v1/video/generations" {
		t.Fatalf("record %+v", rec)
	}
	if hasKey(e.accounts.lastTypes, "anthropic", "apikey") {
		t.Fatalf("anthropic type offered for myvideo: %v", e.accounts.lastTypes)
	}

	// Disable the plugin: its endpoint is gone (core 404, nothing recorded),
	// the built-in anthropic endpoint still serves.
	e.reg.set(e.gen.withoutPlugin("video"))
	r = e.do("/v1/video/generations", body(testModel, false), nil)
	if r.status != 404 || r.json().Get("error").String() != "core 404" {
		t.Fatalf("disabled plugin endpoint: %d %s", r.status, r.body)
	}
	e.noRecord()
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("builtin endpoint after disable: %d %s", r.status, r.body)
	}
	if rec := e.record(); rec.Platform != "anthropic" || rec.PluginKey != "anthropic" {
		t.Fatalf("record %+v", rec)
	}
}

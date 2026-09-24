package gateway

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func newTestContext(headers map[string]string) (*gin.Context, *http.Request) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	c.Request = req
	return c, req
}

func mustRegexp(s string) *regexp.Regexp { return regexp.MustCompile(s) }

func TestErrorFormats(t *testing.T) {
	render := func(format string, e *gwError) (int, gjson.Result, string) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		writeError(c, format, e)
		return w.Code, gjson.Parse(w.Body.String()), w.Header().Get("Content-Type")
	}
	e := fromCore(core.ErrInsufficientBalance, "")
	code, b, _ := render(FormatAnthropic, e)
	if code != 402 || b.Get("type").String() != "error" || b.Get("error.type").String() != "billing_error" ||
		b.Get("error.message").String() != "insufficient balance" || b.Get("error.code").String() != "insufficient_balance" {
		t.Fatalf("anthropic: %d %s", code, b.Raw)
	}
	code, b, _ = render(FormatOpenAI, fromCore(core.ErrRateLimited, ""))
	if code != 429 || b.Get("error.type").String() != "rate_limit_error" || b.Get("error.code").String() != "rate_limited" ||
		!b.Get("error.param").Exists() {
		t.Fatalf("openai: %d %s", code, b.Raw)
	}
	code, b, _ = render(FormatGemini, fromCore(core.ErrUnauthenticated, ""))
	if code != 401 || b.Get("error.code").Int() != 401 || b.Get("error.status").String() != "UNAUTHENTICATED" ||
		b.Get("error.details.0.reason").String() != "unauthenticated" {
		t.Fatalf("gemini: %d %s", code, b.Raw)
	}
	code, b, _ = render(FormatPlain, fromCore(core.ErrPluginUnavailable, ""))
	if code != 503 || b.Get("error.code").String() != "plugin_unavailable" || b.Get("error.message").String() == "" {
		t.Fatalf("plain: %d %s", code, b.Raw)
	}
	// Explicit protocol type wins; raw upstream JSON passes through.
	_, b, _ = render(FormatAnthropic, &gwError{Status: 429, Type: "rate_limit_error", Message: "slow down"})
	if b.Get("error.type").String() != "rate_limit_error" || b.Get("error.message").String() != "slow down" {
		t.Fatalf("typed: %s", b.Raw)
	}
	code, b, ct := render(FormatAnthropic, &gwError{Status: 418, Raw: []byte(`{"x":1}`), ContentType: "application/json; charset=utf-8"})
	if code != 418 || b.Get("x").Int() != 1 || !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("raw: %d %s %s", code, b.Raw, ct)
	}
}

func TestRouteMatching(t *testing.T) {
	gen := &fakeGen{}
	add := func(method, path string) {
		gen.endpoints = append(gen.endpoints, core.EndpointBinding{Plugin: core.PluginInfo{Key: path},
			Endpoint: manifest.Endpoint{Method: method, Path: path}})
	}
	add("POST", "/v1/messages")
	add("POST", "/v1/messages/:id")
	add("POST", "/v1/messages/count_tokens")
	add("GET", "/v1beta/models/*rest")
	add("POST", "/v1/messages") // duplicate ignored
	tb := buildRouteTable(gen)
	cases := map[string]string{
		"POST /v1/messages":              "/v1/messages",
		"POST /v1/messages/":             "/v1/messages",
		"POST /v1/messages/count_tokens": "/v1/messages/count_tokens",
		"POST /v1/messages/abc":          "/v1/messages/:id",
		"GET /v1beta/models/a/b":         "/v1beta/models/*rest",
		"GET /v1/messages":               "",
		"POST /v1/messages/a/b":          "",
		"POST /v2/messages":              "",
	}
	for in, want := range cases {
		parts := strings.SplitN(in, " ", 2)
		r := tb.match(parts[0], parts[1])
		got := ""
		if r != nil {
			got = r.binding.Endpoint.Path
		}
		if got != want {
			t.Errorf("%s -> %q, want %q", in, got, want)
		}
	}
	if len(tb.routes) != 4 {
		t.Fatalf("duplicate not dropped: %d routes", len(tb.routes))
	}
	if buildRouteTable(nil).match("POST", "/v1/messages") != nil {
		t.Fatal("nil generation matched")
	}
}

func TestExtractPromptText(t *testing.T) {
	b := []byte(`{
	  "system": [{"type":"text","text":"sys A"},{"type":"text","text":"sys B"}],
	  "messages": [
	    {"role":"user","content":"plain string"},
	    {"role":"assistant","content":[{"type":"text","text":"answer"},{"type":"tool_use","input":{"q":"x"}}]},
	    {"role":"user","content":[{"type":"tool_result","content":[{"type":"text","text":"tool out"}]},{"type":"image","source":{}}]}
	  ]}`)
	got := extractPromptText(b, []string{"system", "messages.#.content"}, 0)
	want := "sys A\nsys B\nplain string\nanswer\ntool out"
	if got != want {
		t.Fatalf("prompt text %q, want %q", got, want)
	}
	if s := extractPromptText(b, []string{"system", "messages.#.content"}, 7); s != "sys A\ns" {
		t.Fatalf("truncated %q", s)
	}
	// Multi-byte runes are never split.
	if s := truncateUTF8("héllo", 2); s != "h" {
		t.Fatalf("utf8 truncate %q", s)
	}
}

func TestUsageExtraction(t *testing.T) {
	m := testManifest(t)
	u := newUsageAcc(m.Platform.Usage)
	u.applySSE("message_start", []byte(`{"type":"message_start","message":{"model":"claude-x","usage":{"input_tokens":100,"output_tokens":1,"cache_read_input_tokens":20,"cache_creation_input_tokens":30,"cache_creation":{"ephemeral_1h_input_tokens":10}}}}`))
	u.applySSE("content_block_delta", []byte(`{"type":"content_block_delta","delta":{"text":"hi"}}`))
	u.applySSE("message_delta", []byte(`{"type":"message_delta","usage":{"output_tokens":55}}`))
	got := u.tokens()
	want := core.UsageTokens{Input: 100, Output: 55, CacheRead: 20, CacheCreation: 20, CacheCreation1h: 10}
	if got != want || u.model != "claude-x" {
		t.Fatalf("sse usage %+v model %s", got, u.model)
	}
	// Events without an "event:" line fall back to the data "type".
	u = newUsageAcc(m.Platform.Usage)
	u.applySSE("", []byte(`{"type":"message_delta","usage":{"output_tokens":9}}`))
	if u.output != 9 {
		t.Fatalf("type fallback: %d", u.output)
	}
	// 1h larger than total never goes negative.
	u = newUsageAcc(m.Platform.Usage)
	u.applyJSON([]byte(`{"usage":{"input_tokens":1,"cache_creation_input_tokens":2,"cache_creation":{"ephemeral_1h_input_tokens":5}}}`))
	if tk := u.tokens(); tk.CacheCreation != 0 || tk.CacheCreation1h != 5 {
		t.Fatalf("clamp %+v", tk)
	}
	// Facts and extra map keys become metrics.
	rules := manifest.UsageRules{JSON: &manifest.UsageMap{Map: map[string]string{"images": "usage.images"}},
		Facts: map[string]manifest.UsageFact{"seconds": {Type: "number", Path: "usage.seconds"}, "hd": {Type: "boolean", Path: "hd"}}}
	u = newUsageAcc(rules)
	u.applyJSON([]byte(`{"hd":true,"usage":{"images":2,"seconds":1.5}}`))
	if u.metrics["images"] != 2.0 || u.metrics["seconds"] != 1.5 || u.metrics["hd"] != true {
		t.Fatalf("metrics %v", u.metrics)
	}
	// Stream error events are noticed.
	u = newUsageAcc(m.Platform.Usage)
	u.applySSE("error", []byte(`{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}`))
	if !strings.Contains(u.streamError, "Overloaded") {
		t.Fatalf("stream error %q", u.streamError)
	}
}

// The real anthropic manifest (plugins/anthropic) must work with the
// extraction rules implemented here.
func TestRealAnthropicManifest(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "..", "plugins", "anthropic", "manifest.json"))
	if err != nil {
		t.Skip("anthropic manifest not present:", err)
	}
	var m manifest.Manifest
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatal(err)
	}
	u := newUsageAcc(m.Platform.Usage)
	u.applyJSON([]byte(`{"model":"claude-y","usage":{"input_tokens":3,"output_tokens":4,"cache_read_input_tokens":5,"cache_creation_input_tokens":6,"cache_creation":{"ephemeral_1h_input_tokens":2}}}`))
	if tk := u.tokens(); tk != (core.UsageTokens{Input: 3, Output: 4, CacheRead: 5, CacheCreation: 4, CacheCreation1h: 2}) {
		t.Fatalf("json tokens %+v", tk)
	}
	tb := buildRouteTable(&fakeGen{endpoints: []core.EndpointBinding{
		{Endpoint: m.Gateway.Endpoints[0]}, {Endpoint: m.Gateway.Endpoints[1]}}})
	if r := tb.match("POST", "/v1/messages/count_tokens"); r == nil || r.binding.Endpoint.Billing != "free" {
		t.Fatal("count_tokens endpoint")
	}
	if len(m.Platform.StickyRules) == 0 || m.Platform.StickyRules[0].KeySources[0].Path != "metadata.user_id" {
		t.Fatal("sticky default rule")
	}
}

func TestSSRFCheck(t *testing.T) {
	g := &Gateway{lookupIP: func(_ context.Context, host string) ([]net.IP, error) {
		switch host {
		case "internal.example":
			return []net.IP{net.ParseIP("10.1.2.3")}, nil
		case "mixed.example":
			return []net.IP{net.ParseIP("8.8.8.8"), net.ParseIP("169.254.169.254")}, nil
		}
		return []net.IP{net.ParseIP("93.184.216.34")}, nil
	}}
	ctx := context.Background()
	bad := []string{"ftp://api.example/x", "http://127.0.0.1:8080/v1", "http://[::1]/x", "http://localhost/x",
		"http://169.254.169.254/latest", "http://internal.example/x", "http://mixed.example/x", "http://user:pw@api.example/x",
		"http://[::ffff:10.0.0.1]/x", "http://100.64.1.1/x", "/relative", ""}
	for _, u := range bad {
		if _, err := g.checkUpstreamURL(ctx, u); err == nil {
			t.Errorf("%q accepted", u)
		}
	}
	for _, u := range []string{"https://api.anthropic.com/v1/messages", "http://8.8.8.8/x"} {
		if _, err := g.checkUpstreamURL(ctx, u); err != nil {
			t.Errorf("%q rejected: %v", u, err)
		}
	}
	g.allowPrivate = true
	if _, err := g.checkUpstreamURL(ctx, "http://127.0.0.1:1/x"); err != nil {
		t.Fatalf("allow private: %v", err)
	}
	if _, err := g.checkUpstreamURL(ctx, "file:///etc/passwd"); err == nil {
		t.Fatal("scheme must still be checked")
	}
}

func TestGlobAndLists(t *testing.T) {
	if !globMatch("claude-*", "claude-sonnet-4") || globMatch("claude-*", "gpt-4") || !globMatch("a?c", "abc") ||
		!globMatch("*/*", "openai/gpt") {
		t.Fatal("glob")
	}
	if !matchList(nil, "x") || !matchList([]string{"*"}, "x") || matchList([]string{"a"}, "b") || !matchList([]string{"vip"}, "3", "vip") {
		t.Fatal("matchList")
	}
	if !pathCovered("metadata.user_id", []string{"metadata"}) || pathCovered("metadatax", []string{"metadata"}) ||
		pathCovered("model", nil) {
		t.Fatal("pathCovered")
	}
}

func TestP99(t *testing.T) {
	b := make([]int64, len(latencyBuckets)+1)
	b[2] = 98 // <= 5ms
	b[6] = 2  // <= 100ms
	if p := p99(b, 100); p != 100 {
		t.Fatalf("p99 = %d", p)
	}
	if p99(b, 0) != 0 {
		t.Fatal("empty")
	}
}

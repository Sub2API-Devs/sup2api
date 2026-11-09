package upstream

import (
	"encoding/json"
	"errors"
	"reflect"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/paramoverride"
)

// The golden test pins the four presets to the plugins they replace; these
// cover what no plugin did: templates, query auth, account layers, body
// filters, the fixed rewrite and the URL re-render.

func resolve(t *testing.T, upstream string, passHeaders ...string) *Profile {
	t.Helper()
	at := &manifest.AccountType{ID: "custom", Upstream: &manifest.Upstream{}}
	if err := json.Unmarshal([]byte(upstream), at.Upstream); err != nil {
		t.Fatal(err)
	}
	p, err := Resolve(at, passHeaders, nil)
	if err != nil {
		t.Fatal(err)
	}
	return p
}

func account(settings string) *pluginv1.Account {
	return &pluginv1.Account{Id: 7, Type: "custom", CredentialsJson: `{"api_key":"k-123456789","org":"o-1"}`, SettingsJson: settings}
}

func TestTemplatesAndQueryAuth(t *testing.T) {
	p := resolve(t, `{
		"preset": "gemini",
		"baseURL": {"required": true},
		"credentials": {"fields": ["org"]},
		"auth": {"type": "query", "name": "key", "value": "{api_key}"},
		"headers": {"x-org": {"set": "{credentials.org}"}, "x-ua": {"default": "s2a/{client_header.user-agent}"}, "x-none": {"set": "{credentials.org}-{client_header.x-missing}"}}
	}`, "user-agent", "x-missing")
	out, err := p.Build(&pluginv1.BuildUpstreamRequestRequest{
		Meta:           &pluginv1.RequestMeta{Protocol: "gemini.stream_generate", Model: "models/a b"},
		Account:        account(`{"base_url":"https://g.example.com"}`),
		InboundHeaders: map[string]string{"user-agent": " cli/1 "},
	})
	if err != nil {
		t.Fatal(err)
	}
	if want := "https://g.example.com/v1beta/models/a%20b:streamGenerateContent?alt=sse&key=k-123456789"; out.Url != want {
		t.Errorf("url %s, want %s", out.Url, want)
	}
	want := map[string]string{"content-type": "application/json", "x-org": "o-1", "user-agent": "cli/1", "x-ua": "s2a/cli/1"}
	if !reflect.DeepEqual(out.Headers, want) {
		t.Errorf("headers %v, want %v", out.Headers, want)
	}
}

func TestHeaderAppend(t *testing.T) {
	p := resolve(t, `{"preset":"openai"}`, "openai-beta")
	for inbound, want := range map[string]string{
		"":                                "responses_websockets=2026-02-06",
		"assistants=v2":                   "assistants=v2,responses_websockets=2026-02-06",
		"responses_websockets=2025-01-01": "responses_websockets=2025-01-01",
	} {
		out, err := p.Build(&pluginv1.BuildUpstreamRequestRequest{
			Meta: &pluginv1.RequestMeta{Protocol: "openai.responses_ws"}, Account: account(""),
			InboundHeaders: map[string]string{"openai-beta": inbound},
		})
		if err != nil {
			t.Fatal(err)
		}
		if got := out.Headers["openai-beta"]; got != want || out.Method != "GET" || out.Url != "wss://api.openai.com/v1/responses" {
			t.Errorf("%q: %s %s openai-beta %q, want %q", inbound, out.Method, out.Url, got, want)
		}
		if _, ok := out.Headers["content-type"]; ok {
			t.Errorf("%q: websocket handshake keeps content-type", inbound)
		}
	}
}

func TestAccountLayer(t *testing.T) {
	p := resolve(t, `{"preset":"openai","accountConfig":true,"baseURL":{"required":true}}`)
	layer := `{"base_url":"https://x.example.com","upstream":{"auth":{"name":"api-key","value":"{api_key}"},
		"headers":{"x-team":{"set":"t1"}},"routes":{"openai.chat":{"path":"/chat"}},"allowFields":["service_tier"]}}`
	acc := account(layer)
	out, err := p.Build(&pluginv1.BuildUpstreamRequestRequest{Meta: &pluginv1.RequestMeta{Protocol: "openai.chat"}, Account: acc})
	if err != nil {
		t.Fatal(err)
	}
	if out.Url != "https://x.example.com/chat" || out.Headers["api-key"] != "k-123456789" || out.Headers["x-team"] != "t1" || out.Headers["authorization"] != "" {
		t.Errorf("got %s %v", out.Url, out.Headers)
	}
	if got := p.AuthHeader(acc); got != "api-key" {
		t.Errorf("auth header %q", got)
	}
	res, err := p.PrepareBody(acc, []byte(`{"model":"m","service_tier":"flex","safety_identifier":"u"}`), nil)
	if err != nil || string(res.Body) != `{"model":"m","service_tier":"flex"}` {
		t.Errorf("body %s, %v", res.Body, err)
	}

	for name, tc := range map[string]struct{ bad, field string }{
		"credentials":     {`{"credentials":{"fields":["x"]}}`, "upstream.credentials"},
		"route transport": {`{"routes":{"openai.chat":{"transport":"websocket"}}}`, "upstream.routes.openai.chat"},
		"new route":       {`{"routes":{"openai.audio":{"path":"/a"}}}`, "upstream.routes.openai.audio"},
		"allow unknown":   {`{"allowFields":["temperature"]}`, "upstream.allowFields"},
		"blocked header":  {`{"headers":{"cookie":{"set":"a"}}}`, "upstream.headers.cookie"},
		"not an object":   {`[]`, SettingsField},
	} {
		resp := p.Validate(&pluginv1.ValidateCredentialsRequest{AccountType: "custom", CredentialsJson: `{"api_key":"sk-123456789"}`,
			SettingsJson: `{"base_url":"https://x.example.com","upstream":` + tc.bad + `}`})
		if len(resp.Errors) == 0 || resp.Errors[0].Field != tc.field {
			t.Errorf("%s: errors %v, want field %s", name, resp.Errors, tc.field)
		}
	}
	// Every problem is its own field error.
	resp := p.Validate(&pluginv1.ValidateCredentialsRequest{AccountType: "custom", CredentialsJson: `{"api_key":"sk-123456789"}`,
		SettingsJson: `{"base_url":"https://x.example.com","upstream":{"classify":"openai","models":null}}`})
	if len(resp.Errors) != 2 {
		t.Errorf("errors %v, want one per problem", resp.Errors)
	}
}

func TestPrepareBodyAndURL(t *testing.T) {
	p := resolve(t, `{"preset":"gemini","filterFields":["cachedContent"],"paramOverride":{"operations":[{"mode":"set","path":"labels.via","value":"s2a"}]}}`)
	res, err := p.PrepareBody(account(""), []byte(`{"cachedContent":"c","contents":[]}`), &paramoverride.Context{})
	if err != nil || string(res.Body) != `{"contents":[],"labels":{"via":"s2a"}}` {
		t.Errorf("body %s, %v", res.Body, err)
	}
	in := &pluginv1.BuildUpstreamRequestRequest{Meta: &pluginv1.RequestMeta{Protocol: "gemini.generate", Model: "a"}, Account: account("")}
	u, err := p.URL(in, "b")
	if err != nil || u != "https://generativelanguage.googleapis.com/v1beta/models/b:generateContent" {
		t.Errorf("url %s, %v", u, err)
	}
}

func TestResolveProblems(t *testing.T) {
	at := &manifest.AccountType{ID: "x", Upstream: &manifest.Upstream{}}
	_ = json.Unmarshal([]byte(`{"preset":"anthropic","routes":{"anthropic.messages":{"path":"v1"}},"test":{"protocol":"none"}}`), at.Upstream)
	_, err := Resolve(at, nil, nil)
	var probs Problems
	if !errors.As(err, &probs) {
		t.Fatalf("error %v", err)
	}
	got := map[string]string{}
	for _, p := range probs {
		got[p.Path] = p.Code
	}
	want := map[string]string{"routes.anthropic.messages.path": "invalid", "test.protocol": "unknown_protocol"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("problems %v, want %v", got, want)
	}
}

// A route's null removes the shared write of that header for the route only.
func TestRouteHeaderTombstone(t *testing.T) {
	p := resolve(t, `{"preset":"openai","routes":{"openai.embeddings":{"headers":{"content-type":null}}}}`)
	for proto, want := range map[string]string{"openai.embeddings": "", "openai.chat": "application/json"} {
		out, err := p.Build(&pluginv1.BuildUpstreamRequestRequest{Meta: &pluginv1.RequestMeta{Protocol: proto}, Account: account("")})
		if err != nil || out.Headers["content-type"] != want {
			t.Errorf("%s: content-type %q, want %q (%v)", proto, out.GetHeaders()["content-type"], want, err)
		}
	}
}

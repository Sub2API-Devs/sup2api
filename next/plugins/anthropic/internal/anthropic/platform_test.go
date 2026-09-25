package anthropic

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

func start(t *testing.T) (*Plugin, *pluginsdktest.Harness) {
	t.Helper()
	p := New()
	h := pluginsdktest.Start(t, p, pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithInfo("anthropic", "0.1.6")}})
	return p, h
}

func TestCapabilities(t *testing.T) {
	_, h := start(t)
	got := strings.Join(h.Info.GetCapabilities(), ",")
	if got != "platform.adapter.v1,http.routes.v1" {
		t.Fatalf("capabilities = %s", got)
	}
}

func TestValidateCredentials(t *testing.T) {
	_, h := start(t)
	ctx := context.Background()
	cases := []struct {
		name       string
		typ        string
		creds      string
		settings   string
		wantFields []string
		wantCreds  string
		wantSets   string
	}{
		{name: "ok minimal", typ: "apikey", creds: `{"api_key":"  sk-ant-api03-abcdef  "}`,
			wantCreds: `{"api_key":"sk-ant-api03-abcdef"}`},
		{name: "ok with settings", typ: "apikey",
			creds:     `{"api_key":"sk-ant-api03-abcdef"}`,
			settings:  `{"base_url":"https://relay.example.com/v1/"}`,
			wantCreds: `{"api_key":"sk-ant-api03-abcdef"}`,
			wantSets:  `{"base_url":"https://relay.example.com"}`},
		{name: "all in credentials", typ: "apikey",
			creds:     `{"api_key":"sk-ant-x1234567","base_url":""}`,
			wantCreds: `{"api_key":"sk-ant-x1234567","base_url":"https://api.anthropic.com"}`},
		// Legacy accounts may still carry model_mapping (now a core account
		// field): it is neither validated nor touched.
		{name: "legacy model_mapping ignored", typ: "apikey",
			creds:     `{"api_key":"sk-ant-12345678"}`,
			settings:  `{"base_url":"https://relay.example.com","model_mapping":{"a":1}}`,
			wantCreds: `{"api_key":"sk-ant-12345678"}`,
			wantSets:  `{"base_url":"https://relay.example.com","model_mapping":{"a":1}}`},
		{name: "missing key", typ: "apikey", creds: `{}`, wantFields: []string{"api_key"}},
		{name: "key with space", typ: "apikey", creds: `{"api_key":"sk ant 123456"}`, wantFields: []string{"api_key"}},
		{name: "bad url", typ: "apikey", creds: `{"api_key":"sk-ant-12345678"}`, settings: `{"base_url":"ftp://x"}`, wantFields: []string{"base_url"}},
		{name: "url with query", typ: "apikey", creds: `{"api_key":"sk-ant-12345678"}`, settings: `{"base_url":"https://x.com?a=1"}`, wantFields: []string{"base_url"}},
		{name: "wrong type", typ: "oauth", creds: `{"api_key":"sk-ant-12345678"}`, wantFields: []string{"account_type"}},
		{name: "invalid json", typ: "apikey", creds: `[1]`, wantFields: []string{""}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r, err := h.Platform.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{AccountType: tc.typ, CredentialsJson: tc.creds, SettingsJson: tc.settings})
			if err != nil {
				t.Fatal(err)
			}
			var fields []string
			for _, e := range r.GetErrors() {
				fields = append(fields, e.GetField())
				if !strings.Contains(e.GetMessage(), "/") {
					t.Errorf("message should be bilingual: %q", e.GetMessage())
				}
			}
			if strings.Join(fields, ",") != strings.Join(tc.wantFields, ",") {
				t.Fatalf("errors = %v, want %v", r.GetErrors(), tc.wantFields)
			}
			if len(tc.wantFields) > 0 {
				return
			}
			assertJSON(t, r.GetNormalizedCredentialsJson(), tc.wantCreds)
			assertJSON(t, r.GetNormalizedSettingsJson(), tc.wantSets)
		})
	}
}

func assertJSON(t *testing.T, got, want string) {
	t.Helper()
	if want == "" {
		if got != "" {
			t.Fatalf("got %s, want empty", got)
		}
		return
	}
	var g, w any
	if err := json.Unmarshal([]byte(got), &g); err != nil {
		t.Fatalf("bad json %q: %v", got, err)
	}
	_ = json.Unmarshal([]byte(want), &w)
	gb, _ := json.Marshal(g)
	wb, _ := json.Marshal(w)
	if string(gb) != string(wb) {
		t.Fatalf("got %s, want %s", gb, wb)
	}
}

func account(creds, settings string) *pluginv1.Account {
	return &pluginv1.Account{Id: 42, Platform: "anthropic", Type: "apikey", CredentialsJson: creds, SettingsJson: settings}
}

func TestBuildUpstreamRequest(t *testing.T) {
	_, h := start(t)
	ctx := context.Background()

	r, err := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolMessages, Model: "claude-sonnet-4-6", Stream: true},
		Account: account(`{"api_key":"sk-ant-key-1"}`, ""),
		Fields:  map[string]string{"model": `"claude-sonnet-4-6"`},
		InboundHeaders: map[string]string{
			"anthropic-beta": "prompt-caching-2024-07-31", "user-agent": "claude-cli/2.0",
			"x-stainless-lang": "js", "cookie": "should-not-pass",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetMethod() != "POST" || r.GetUrl() != "https://api.anthropic.com/v1/messages" {
		t.Fatalf("method/url = %s %s", r.GetMethod(), r.GetUrl())
	}
	hd := r.GetHeaders()
	if hd["x-api-key"] != "sk-ant-key-1" || hd["anthropic-version"] != DefaultAPIVersion || hd["anthropic-beta"] != "prompt-caching-2024-07-31" ||
		hd["content-type"] != "application/json" || hd["user-agent"] != "claude-cli/2.0" || hd["x-stainless-lang"] != "js" {
		t.Fatalf("headers = %v", hd)
	}
	if _, ok := hd["cookie"]; ok {
		t.Fatal("cookie must not be forwarded")
	}
	if len(r.GetPatches()) != 0 || r.GetUpstreamModel() != "claude-sonnet-4-6" {
		t.Fatalf("patches = %v, upstream = %s", r.GetPatches(), r.GetUpstreamModel())
	}

	// count_tokens + version pass-through + custom base url. A legacy
	// model_mapping in the settings is ignored: the model is sent as received
	// (the core maps it before calling the plugin) and no patch is emitted.
	r, err = h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta:           &pluginv1.RequestMeta{Protocol: ProtocolCountTokens, Model: "claude-sonnet-4-6"},
		Account:        account(`{"api_key":"k-12345678"}`, `{"base_url":"http://mock-upstream:8080/","model_mapping":{"claude-sonnet-*":"claude-sonnet-5","claude-sonnet-4-6":"exact-wins"}}`),
		Fields:         map[string]string{"model": `"claude-sonnet-4-6"`},
		InboundHeaders: map[string]string{"anthropic-version": "2024-01-01"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != "http://mock-upstream:8080/v1/messages/count_tokens" || r.GetHeaders()["anthropic-version"] != "2024-01-01" {
		t.Fatalf("url/version = %s %v", r.GetUrl(), r.GetHeaders())
	}
	if len(r.GetPatches()) != 0 || r.GetUpstreamModel() != "claude-sonnet-4-6" {
		t.Fatalf("patches = %v upstream = %s", r.GetPatches(), r.GetUpstreamModel())
	}

	// fields["model"] wins over meta.model as the upstream model.
	r, err = h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolMessages, Model: "claude-sonnet-4-6"},
		Account: account(`{"api_key":"k-12345678"}`, ""),
		Fields:  map[string]string{"model": `"claude-sonnet-5"`},
	})
	if err != nil || len(r.GetPatches()) != 0 || r.GetUpstreamModel() != "claude-sonnet-5" {
		t.Fatalf("fields model: %v %v", r, err)
	}

	// missing key / bad protocol / foreign account type
	if _, err := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta: &pluginv1.RequestMeta{Protocol: ProtocolMessages}, Account: account(`{}`, ""),
	}); err == nil {
		t.Fatal("expected error for missing api key")
	}
	if _, err := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta: &pluginv1.RequestMeta{Protocol: "openai.chat"}, Account: account(`{"api_key":"k-12345678"}`, ""),
	}); err == nil {
		t.Fatal("expected error for unknown protocol")
	}
	foreign := account(`{"api_key":"k-12345678"}`, "")
	foreign.Type = "relay_key"
	if _, err := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta: &pluginv1.RequestMeta{Protocol: ProtocolMessages}, Account: foreign,
	}); err == nil {
		t.Fatal("expected error for an account type of another plugin")
	}

	// The upstream path follows meta.protocol, not the client endpoint's
	// protocol (converted requests).
	r, err = h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolMessages, ClientProtocol: "openai.chat", Model: "claude-sonnet-5"},
		Account: account(`{"api_key":"k-12345678"}`, ""),
	})
	if err != nil || r.GetUrl() != "https://api.anthropic.com/v1/messages" {
		t.Fatalf("converted request: %v %v", r, err)
	}
}

func TestBuildTestRequest(t *testing.T) {
	_, h := start(t)
	// A legacy model_mapping in the settings is ignored; in.model is used
	// as-is (the default model when empty).
	r, err := h.Platform.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{
		Account: account(`{"api_key":"k-12345678"}`, `{"model_mapping":{"claude-haiku-4-5":"mapped"}}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != "https://api.anthropic.com/v1/messages" || r.GetHeaders()["x-api-key"] != "k-12345678" {
		t.Fatalf("resp = %v", r)
	}
	var body struct {
		Model     string `json:"model"`
		MaxTokens int    `json:"max_tokens"`
		Messages  []any  `json:"messages"`
	}
	if err := json.Unmarshal([]byte(r.GetBodyJson()), &body); err != nil || body.Model != DefaultTestModel || body.MaxTokens != 1 || len(body.Messages) != 1 {
		t.Fatalf("body = %s", r.GetBodyJson())
	}

	r, err = h.Platform.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{
		Account: account(`{"api_key":"k-12345678"}`, ""), Model: " claude-sonnet-5 ",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal([]byte(r.GetBodyJson()), &body); err != nil || body.Model != "claude-sonnet-5" {
		t.Fatalf("body = %s", r.GetBodyJson())
	}
}

func TestClassifyError(t *testing.T) {
	now := time.Date(2026, 9, 24, 12, 0, 0, 0, time.UTC)
	p := New()
	p.now = func() time.Time { return now }
	ctx := context.Background()
	cls := func(status int32, headers map[string]string, body string, transport string) *pluginv1.ClassifyErrorResponse {
		r, err := p.ClassifyError(ctx, &pluginv1.ClassifyErrorRequest{Status: status, Headers: headers, BodyPrefix: []byte(body), TransportError: transport})
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	const (
		ret      = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
		failover = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		none     = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED
		cool     = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
		disable  = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
	)
	type want struct {
		action   pluginv1.ClassifyErrorResponse_Action
		effect   pluginv1.ClassifyErrorResponse_AccountEffect
		cooldown time.Duration
		errType  string
	}
	check := func(name string, r *pluginv1.ClassifyErrorResponse, w want) {
		t.Helper()
		if r.GetAction() != w.action || r.GetAccountEffect() != w.effect || r.GetClientErrorType() != w.errType {
			t.Errorf("%s: got %v/%v/%s, want %v/%v/%s", name, r.GetAction(), r.GetAccountEffect(), r.GetClientErrorType(), w.action, w.effect, w.errType)
		}
		if w.effect == cool {
			if got := time.Unix(r.GetCooldownUntilUnix(), 0).Sub(now); got != w.cooldown {
				t.Errorf("%s: cooldown %v, want %v", name, got, w.cooldown)
			}
		}
		if w.effect != none && r.GetReason() == "" {
			t.Errorf("%s: empty reason", name)
		}
	}

	r := cls(400, nil, `{"type":"error","error":{"type":"invalid_request_error","message":"max_tokens: required"}}`, "")
	check("400", r, want{ret, none, 0, "invalid_request_error"})
	if r.GetClientMessage() != "max_tokens: required" {
		t.Errorf("client message = %q", r.GetClientMessage())
	}
	check("400 credit", cls(400, nil, `{"error":{"message":"Your credit balance is too low to access the Anthropic API."}}`, ""), want{failover, disable, 0, "invalid_request_error"})
	check("404", cls(404, nil, "", ""), want{ret, none, 0, "not_found_error"})
	check("401", cls(401, nil, `{"error":{"message":"invalid x-api-key"}}`, ""), want{failover, disable, 0, "authentication_error"})
	check("403", cls(403, nil, "", ""), want{failover, disable, 0, "permission_error"})
	check("429 default", cls(429, nil, "", ""), want{failover, cool, 60 * time.Second, "rate_limit_error"})
	check("429 retry-after", cls(429, map[string]string{"retry-after": "2"}, "", ""), want{failover, cool, 2 * time.Second, "rate_limit_error"})
	check("429 retry-after date", cls(429, map[string]string{"Retry-After": now.Add(90 * time.Second).Format(http.TimeFormat)}, "", ""), want{failover, cool, 90 * time.Second, "rate_limit_error"})
	check("429 exhausted reset", cls(429, map[string]string{
		"anthropic-ratelimit-requests-remaining": "10",
		"anthropic-ratelimit-requests-reset":     now.Add(5 * time.Second).Format(time.RFC3339),
		"anthropic-ratelimit-tokens-remaining":   "0",
		"anthropic-ratelimit-tokens-reset":       now.Add(40 * time.Second).Format(time.RFC3339),
	}, "", ""), want{failover, cool, 40 * time.Second, "rate_limit_error"})
	check("429 earliest reset", cls(429, map[string]string{
		"anthropic-ratelimit-requests-reset": now.Add(5 * time.Second).Format(time.RFC3339),
		"anthropic-ratelimit-tokens-reset":   now.Add(40 * time.Second).Format(time.RFC3339),
	}, "", ""), want{failover, cool, 5 * time.Second, "rate_limit_error"})
	check("429 unified unix reset", cls(429, map[string]string{
		"anthropic-ratelimit-unified-status": "rejected",
		"anthropic-ratelimit-unified-reset":  strconv.FormatInt(now.Add(2*time.Hour).Unix(), 10),
	}, "", ""), want{failover, cool, 2 * time.Hour, "rate_limit_error"})
	check("429 clamp", cls(429, map[string]string{"retry-after": "99999999"}, "", ""), want{failover, cool, 7 * 24 * time.Hour, "rate_limit_error"})
	check("529", cls(529, nil, "", ""), want{failover, cool, 30 * time.Second, "overloaded_error"})
	check("500", cls(500, nil, "", ""), want{failover, cool, 10 * time.Second, "api_error"})
	check("503", cls(503, nil, "", ""), want{failover, cool, 10 * time.Second, "api_error"})
	check("transport", cls(0, nil, "", "dial tcp: connection refused"), want{failover, cool, 10 * time.Second, "api_error"})
}

func TestBuildModelsRequest(t *testing.T) {
	_, h := start(t)
	r, err := h.Platform.BuildModelsRequest(context.Background(), &pluginv1.BuildModelsRequestRequest{
		Account: account(`{"api_key":"k-12345678"}`, `{"base_url":"https://relay.example.com/v1/"}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetMethod() != "GET" || r.GetUrl() != "https://relay.example.com/v1/models?limit=1000" ||
		r.GetHeaders()["x-api-key"] != "k-12345678" || r.GetHeaders()["anthropic-version"] == "" ||
		r.GetIdsPath() != "data.#.id" || r.GetBodyJson() != "" {
		t.Fatalf("resp = %v", r)
	}
	if _, err := h.Platform.BuildModelsRequest(context.Background(), &pluginv1.BuildModelsRequestRequest{
		Account: account(`{}`, ""),
	}); err == nil {
		t.Fatal("missing api_key must fail")
	}
}

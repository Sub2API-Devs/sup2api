package openai

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

func start(t *testing.T) *pluginsdktest.Harness {
	t.Helper()
	return pluginsdktest.Start(t, New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithInfo("openai", "0.1.5")}})
}

func account(creds, settings string) *pluginv1.Account {
	return &pluginv1.Account{Id: 7, Platform: PlatformID, Type: AccountTypeAPIKey, CredentialsJson: creds, SettingsJson: settings}
}

func TestCapabilities(t *testing.T) {
	h := start(t)
	if got := strings.Join(h.Info.GetCapabilities(), ","); got != "platform.adapter.v1" {
		t.Fatalf("capabilities = %s", got)
	}
}

func TestValidateCredentials(t *testing.T) {
	h := start(t)
	r, err := h.Platform.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{
		AccountType: "apikey", CredentialsJson: `{"api_key":" sk-proj-abcdef "}`, SettingsJson: `{"base_url":"https://relay.example.com/v1/"}`,
	})
	if err != nil || len(r.GetErrors()) != 0 {
		t.Fatalf("valid: %v %v", r, err)
	}
	if r.GetNormalizedCredentialsJson() != `{"api_key":"sk-proj-abcdef"}` || r.GetNormalizedSettingsJson() != `{"base_url":"https://relay.example.com"}` {
		t.Fatalf("normalized = %s %s", r.GetNormalizedCredentialsJson(), r.GetNormalizedSettingsJson())
	}
	r, _ = h.Platform.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: "apikey", CredentialsJson: `{}`})
	if len(r.GetErrors()) != 1 || r.GetErrors()[0].GetField() != "api_key" {
		t.Fatalf("missing key: %v", r.GetErrors())
	}
	r, _ = h.Platform.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: "oauth", CredentialsJson: `{"api_key":"sk-12345678"}`})
	if len(r.GetErrors()) != 1 || r.GetErrors()[0].GetField() != "account_type" {
		t.Fatalf("wrong type: %v", r.GetErrors())
	}
}

func patches(r *pluginv1.BuildUpstreamRequestResponse) map[string]string {
	out := map[string]string{}
	for _, p := range r.GetPatches() {
		if p.GetOp() == pluginv1.BodyPatch_OP_SET {
			out[p.GetPath()] = p.GetValueJson()
		}
	}
	return out
}

func TestBuildUpstreamRequest(t *testing.T) {
	h := start(t)
	ctx := context.Background()
	build := func(meta *pluginv1.RequestMeta, acc *pluginv1.Account, inbound map[string]string) (*pluginv1.BuildUpstreamRequestResponse, error) {
		return h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
			Meta: meta, Account: acc, Fields: map[string]string{"model": `"` + meta.GetModel() + `"`}, InboundHeaders: inbound,
		})
	}

	// Streaming chat: default base URL, bearer key, include_usage forced.
	r, err := build(&pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "gpt-4o", Stream: true},
		account(`{"api_key":"sk-key-1234"}`, ""),
		map[string]string{"openai-organization": "org-1", "user-agent": "OpenAI/Python 1.0", "x-stainless-lang": "python", "cookie": "no"})
	if err != nil {
		t.Fatal(err)
	}
	hd := r.GetHeaders()
	if r.GetMethod() != "POST" || r.GetUrl() != "https://api.openai.com/v1/chat/completions" || hd["authorization"] != "Bearer sk-key-1234" ||
		hd["content-type"] != "application/json" || hd["openai-organization"] != "org-1" || hd["user-agent"] != "OpenAI/Python 1.0" || hd["x-stainless-lang"] != "python" {
		t.Fatalf("request = %s %s %v", r.GetMethod(), r.GetUrl(), hd)
	}
	if _, ok := hd["cookie"]; ok {
		t.Fatal("cookie must not be forwarded")
	}
	if p := patches(r); len(p) != 1 || p["stream_options.include_usage"] != "true" || r.GetUpstreamModel() != "gpt-4o" {
		t.Fatalf("patches = %v upstream = %s", r.GetPatches(), r.GetUpstreamModel())
	}

	// Non-streaming chat: no stream_options patch.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "gpt-4o"}, account(`{"api_key":"sk-key-1234"}`, ""), nil)
	if err != nil || len(r.GetPatches()) != 0 {
		t.Fatalf("non-stream chat: %v %v", r, err)
	}

	// Responses (stream: usage comes in response.completed, no patch) with a
	// custom base URL. A legacy model_mapping in the settings is ignored:
	// the model is sent as received (the core maps it before calling the
	// plugin) and no model patch is emitted.
	acc := account(`{"api_key":"sk-key-1234"}`, `{"base_url":"http://mock-upstream:8080/v1","model_mapping":{"gpt-4o*":"gpt-4.1","gpt-4o-mini":"exact"}}`)
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolResponses, Model: "gpt-4o-2024-08-06", Stream: true}, acc, nil)
	if err != nil || r.GetUrl() != "http://mock-upstream:8080/v1/responses" {
		t.Fatalf("responses: %v %v", r, err)
	}
	if len(r.GetPatches()) != 0 || r.GetUpstreamModel() != "gpt-4o-2024-08-06" {
		t.Fatalf("responses patches = %v upstream = %s", r.GetPatches(), r.GetUpstreamModel())
	}

	// fields["model"] wins over meta.model as the upstream model.
	r, err = h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta: &pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "gpt-4o"}, Account: account(`{"api_key":"sk-key-1234"}`, ""),
		Fields: map[string]string{"model": `"gpt-4.1"`},
	})
	if err != nil || len(r.GetPatches()) != 0 || r.GetUpstreamModel() != "gpt-4.1" {
		t.Fatalf("fields model: %v %v", r, err)
	}

	// Embeddings.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolEmbeddings, Model: "text-embedding-3-small"}, account(`{"api_key":"sk-key-1234"}`, ""), nil)
	if err != nil || r.GetUrl() != "https://api.openai.com/v1/embeddings" || len(r.GetPatches()) != 0 {
		t.Fatalf("embeddings: %v %v", r, err)
	}

	// Converted request (client spoke anthropic.messages): the path and the
	// include_usage patch follow meta.protocol.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolChat, ClientProtocol: "anthropic.messages", Model: "gpt-4o", Stream: true}, account(`{"api_key":"sk-key-1234"}`, ""), nil)
	if err != nil || r.GetUrl() != "https://api.openai.com/v1/chat/completions" || patches(r)["stream_options.include_usage"] != "true" {
		t.Fatalf("converted: %v %v", r, err)
	}

	// Errors: missing key, unknown protocol, foreign account type.
	if _, err := build(&pluginv1.RequestMeta{Protocol: ProtocolChat}, account(`{}`, ""), nil); err == nil {
		t.Fatal("expected error for missing api key")
	}
	if _, err := build(&pluginv1.RequestMeta{Protocol: "gemini.generate"}, account(`{"api_key":"sk-key-1234"}`, ""), nil); err == nil {
		t.Fatal("expected error for unknown protocol")
	}
	foreign := account(`{"api_key":"sk-key-1234"}`, "")
	foreign.Type = "relay_key"
	if _, err := build(&pluginv1.RequestMeta{Protocol: ProtocolChat}, foreign, nil); err == nil {
		t.Fatal("expected error for a foreign account type")
	}
}

func TestBuildTestRequest(t *testing.T) {
	h := start(t)
	// A legacy model_mapping in the settings is ignored; in.model is used
	// as-is (the default model when empty).
	r, err := h.Platform.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{
		Account: account(`{"api_key":"sk-key-1234"}`, `{"model_mapping":{"gpt-4o-mini":"mapped"}}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != "https://api.openai.com/v1/chat/completions" || r.GetHeaders()["authorization"] != "Bearer sk-key-1234" {
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
		Account: account(`{"api_key":"sk-key-1234"}`, ""), Model: " gpt-4.1 ",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal([]byte(r.GetBodyJson()), &body); err != nil || body.Model != "gpt-4.1" {
		t.Fatalf("body = %s", r.GetBodyJson())
	}
}

func TestClassifyError(t *testing.T) {
	now := time.Date(2026, 9, 25, 12, 0, 0, 0, time.UTC)
	p := New()
	p.now = func() time.Time { return now }
	cls := func(status int32, headers map[string]string, body, transport string) *pluginv1.ClassifyErrorResponse {
		r, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: status, Headers: headers, BodyPrefix: []byte(body), TransportError: transport})
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
	check := func(name string, r *pluginv1.ClassifyErrorResponse, action pluginv1.ClassifyErrorResponse_Action, effect pluginv1.ClassifyErrorResponse_AccountEffect, cooldown time.Duration, errType string) {
		t.Helper()
		if r.GetAction() != action || r.GetAccountEffect() != effect || r.GetClientErrorType() != errType {
			t.Errorf("%s: got %v/%v/%s, want %v/%v/%s", name, r.GetAction(), r.GetAccountEffect(), r.GetClientErrorType(), action, effect, errType)
		}
		if effect == cool {
			if got := time.Unix(r.GetCooldownUntilUnix(), 0).Sub(now); got != cooldown {
				t.Errorf("%s: cooldown %v, want %v", name, got, cooldown)
			}
		}
		if effect != none && r.GetReason() == "" {
			t.Errorf("%s: empty reason", name)
		}
	}

	r := cls(400, nil, `{"error":{"message":"'messages' is required","type":"invalid_request_error","param":"messages","code":null}}`, "")
	check("400", r, ret, none, 0, "invalid_request_error")
	if r.GetClientMessage() != "'messages' is required" {
		t.Errorf("client message = %q", r.GetClientMessage())
	}
	check("404 model", cls(404, nil, `{"error":{"message":"The model does not exist","type":"invalid_request_error","code":"model_not_found"}}`, ""), ret, none, 0, "invalid_request_error")
	check("400 no body", cls(400, nil, "", ""), ret, none, 0, "invalid_request_error")
	check("401", cls(401, nil, `{"error":{"message":"Incorrect API key provided","type":"invalid_request_error","code":"invalid_api_key"}}`, ""), failover, disable, 0, "invalid_request_error")
	check("401 no body", cls(401, nil, "", ""), failover, disable, 0, "authentication_error")
	check("403", cls(403, nil, `{"error":{"message":"Country, region, or territory not supported","type":"request_forbidden","code":"unsupported_country_region_territory"}}`, ""), failover, disable, 0, "request_forbidden")
	check("429 quota", cls(429, nil, `{"error":{"message":"You exceeded your current quota","type":"insufficient_quota","code":"insufficient_quota"}}`, ""), failover, disable, 0, "insufficient_quota")
	check("429 default", cls(429, nil, `{"error":{"message":"Rate limit reached","type":"requests","code":"rate_limit_exceeded"}}`, ""), failover, cool, 60*time.Second, "requests")
	check("429 retry-after", cls(429, map[string]string{"retry-after": "2"}, "", ""), failover, cool, 2*time.Second, "rate_limit_error")
	check("429 retry-after-ms", cls(429, map[string]string{"retry-after-ms": "2500", "retry-after": "9"}, "", ""), failover, cool, 2*time.Second, "rate_limit_error") // 2.5 s, unix seconds truncate
	check("429 retry-after date", cls(429, map[string]string{"Retry-After": now.Add(90 * time.Second).Format(http.TimeFormat)}, "", ""), failover, cool, 90*time.Second, "rate_limit_error")
	check("429 exhausted tokens", cls(429, map[string]string{
		"x-ratelimit-remaining-requests": "10", "x-ratelimit-reset-requests": "5s",
		"x-ratelimit-remaining-tokens": "0", "x-ratelimit-reset-tokens": "6m0s",
	}, "", ""), failover, cool, 6*time.Minute, "rate_limit_error")
	check("429 earliest reset", cls(429, map[string]string{"x-ratelimit-reset-requests": "20s", "x-ratelimit-reset-tokens": "1m"}, "", ""), failover, cool, 20*time.Second, "rate_limit_error")
	check("429 clamp", cls(429, map[string]string{"retry-after": "99999999"}, "", ""), failover, cool, 7*24*time.Hour, "rate_limit_error")
	check("500", cls(500, nil, `{"error":{"message":"The server had an error","type":"server_error"}}`, ""), failover, cool, 10*time.Second, "server_error")
	check("503", cls(503, nil, "", ""), failover, cool, 10*time.Second, "server_error")
	check("408", cls(408, nil, "", ""), failover, cool, 10*time.Second, "invalid_request_error")
	r = cls(0, nil, "", "dial tcp: connection refused")
	check("transport", r, failover, cool, 10*time.Second, "server_error")
	if r.GetClientStatus() != 502 {
		t.Errorf("transport client status = %d", r.GetClientStatus())
	}
	// Compatible servers that answer {"error": "message"}.
	if r := cls(400, nil, `{"error":"bad things"}`, ""); r.GetClientMessage() != "bad things" || r.GetClientErrorType() != "invalid_request_error" {
		t.Errorf("string error body: %v", r)
	}
}

func TestBuildModelsRequest(t *testing.T) {
	h := start(t)
	r, err := h.Platform.BuildModelsRequest(context.Background(), &pluginv1.BuildModelsRequestRequest{
		Account: account(`{"api_key":"sk-key-1234"}`, `{"base_url":"http://mock-upstream:8080/v1"}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetMethod() != "GET" || r.GetUrl() != "http://mock-upstream:8080/v1/models" ||
		r.GetHeaders()["authorization"] != "Bearer sk-key-1234" || r.GetIdsPath() != "data.#.id" {
		t.Fatalf("resp = %v", r)
	}
}

package gemini

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
	return pluginsdktest.Start(t, New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithInfo("gemini", "0.1.6")}})
}

func account(creds, settings string) *pluginv1.Account {
	return &pluginv1.Account{Id: 9, Platform: PlatformID, Type: AccountTypeAPIKey, CredentialsJson: creds, SettingsJson: settings}
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
		AccountType: "apikey", CredentialsJson: `{"api_key":"AIzaSyExample123"}`, SettingsJson: `{"base_url":"https://proxy.example.com/v1beta/"}`,
	})
	if err != nil || len(r.GetErrors()) != 0 || r.GetNormalizedSettingsJson() != `{"base_url":"https://proxy.example.com"}` {
		t.Fatalf("valid: %v %v", r, err)
	}
	r, _ = h.Platform.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: "apikey", CredentialsJson: `{"api_key":"short"}`})
	if len(r.GetErrors()) != 1 || r.GetErrors()[0].GetField() != "api_key" {
		t.Fatalf("short key: %v", r.GetErrors())
	}
}

func TestBuildUpstreamRequest(t *testing.T) {
	h := start(t)
	ctx := context.Background()
	build := func(meta *pluginv1.RequestMeta, acc *pluginv1.Account, inbound map[string]string) (*pluginv1.BuildUpstreamRequestResponse, error) {
		return h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{Meta: meta, Account: acc, InboundHeaders: inbound})
	}
	acc := account(`{"api_key":"AIza-key-123"}`, "")

	r, err := build(&pluginv1.RequestMeta{Protocol: ProtocolGenerate, Model: "gemini-2.5-flash"}, acc,
		map[string]string{"x-goog-api-client": "genai-js/1.0", "user-agent": "ua", "cookie": "no"})
	if err != nil {
		t.Fatal(err)
	}
	hd := r.GetHeaders()
	if r.GetMethod() != "POST" || r.GetUrl() != "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" ||
		hd["x-goog-api-key"] != "AIza-key-123" || hd["content-type"] != "application/json" || hd["x-goog-api-client"] != "genai-js/1.0" || hd["user-agent"] != "ua" {
		t.Fatalf("request = %s %v", r.GetUrl(), hd)
	}
	if _, ok := hd["cookie"]; ok || hd["authorization"] != "" || len(r.GetPatches()) != 0 || r.GetUpstreamModel() != "gemini-2.5-flash" {
		t.Fatalf("headers/patches = %v %v %s", hd, r.GetPatches(), r.GetUpstreamModel())
	}

	// Streaming always uses alt=sse. A legacy model_mapping in the settings
	// is ignored: the path model is meta.model as received (the core maps it
	// before calling the plugin).
	legacy := account(`{"api_key":"AIza-key-123"}`, `{"base_url":"http://mock-upstream:8080/v1beta","model_mapping":{"gemini-2.5-pro*":"gemini-2.5-flash"}}`)
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolStreamGenerate, Model: "gemini-2.5-pro-preview", Stream: true}, legacy, nil)
	if err != nil || r.GetUrl() != "http://mock-upstream:8080/v1beta/models/gemini-2.5-pro-preview:streamGenerateContent?alt=sse" ||
		r.GetUpstreamModel() != "gemini-2.5-pro-preview" || len(r.GetPatches()) != 0 {
		t.Fatalf("stream: %v %v", r, err)
	}
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolCountTokens, Model: "models/gemini-2.0-flash"}, acc, nil)
	if err != nil || r.GetUrl() != "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:countTokens" {
		t.Fatalf("count tokens: %v %v", r, err)
	}
	// Odd characters in the model stay inside the path segment.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolGenerate, Model: "a/b?c"}, acc, nil)
	if err != nil || r.GetUrl() != "https://generativelanguage.googleapis.com/v1beta/models/a%2Fb%3Fc:generateContent" {
		t.Fatalf("escaped model: %v %v", r, err)
	}

	for name, meta := range map[string]*pluginv1.RequestMeta{
		"no model":         {Protocol: ProtocolGenerate},
		"unknown protocol": {Protocol: "openai.chat", Model: "gemini-2.5-flash"},
	} {
		if _, err := build(meta, acc, nil); err == nil {
			t.Errorf("%s: expected error", name)
		}
	}
	if _, err := build(&pluginv1.RequestMeta{Protocol: ProtocolGenerate, Model: "m"}, account(`{}`, ""), nil); err == nil {
		t.Error("missing key: expected error")
	}
}

func TestBuildTestRequest(t *testing.T) {
	h := start(t)
	r, err := h.Platform.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{Account: account(`{"api_key":"AIza-key-123"}`, "")})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != "https://generativelanguage.googleapis.com/v1beta/models/"+DefaultTestModel+":generateContent" || r.GetHeaders()["x-goog-api-key"] != "AIza-key-123" {
		t.Fatalf("resp = %v", r)
	}
	var body struct {
		Contents []struct {
			Parts []struct{ Text string } `json:"parts"`
		} `json:"contents"`
		GenerationConfig struct {
			MaxOutputTokens int `json:"maxOutputTokens"`
		} `json:"generationConfig"`
	}
	if err := json.Unmarshal([]byte(r.GetBodyJson()), &body); err != nil || len(body.Contents) != 1 || body.Contents[0].Parts[0].Text != "ping" || body.GenerationConfig.MaxOutputTokens != 1 {
		t.Fatalf("body = %s", r.GetBodyJson())
	}

	// in.model is used as-is (models/ prefix stripped); a legacy
	// model_mapping in the settings is ignored.
	r, err = h.Platform.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{
		Account: account(`{"api_key":"AIza-key-123"}`, `{"model_mapping":{"gemini-2.5-pro":"gemini-2.5-flash"}}`), Model: "models/gemini-2.5-pro",
	})
	if err != nil || r.GetUrl() != "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent" {
		t.Fatalf("explicit model: %v %v", r, err)
	}
}

func TestClassifyError(t *testing.T) {
	now := time.Date(2026, 9, 25, 12, 0, 0, 0, time.UTC) // 05:00 PDT
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
	gerr := func(code int, status, msg, details string) string {
		if details == "" {
			details = "[]"
		}
		return `{"error":{"code":` + itoa(code) + `,"message":"` + msg + `","status":"` + status + `","details":` + details + `}}`
	}

	r := cls(400, nil, gerr(400, "INVALID_ARGUMENT", "Invalid JSON payload received.", ""), "")
	check("400", r, ret, none, 0, "INVALID_ARGUMENT")
	if r.GetClientMessage() != "Invalid JSON payload received." {
		t.Errorf("client message = %q", r.GetClientMessage())
	}
	check("400 key invalid", cls(400, nil, gerr(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.",
		`[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com"}]`), ""), failover, disable, 0, "INVALID_ARGUMENT")
	check("400 location", cls(400, nil, gerr(400, "FAILED_PRECONDITION", "User location is not supported for the API use.", ""), ""), failover, disable, 0, "FAILED_PRECONDITION")
	check("404", cls(404, nil, gerr(404, "NOT_FOUND", "models/nope is not found", ""), ""), ret, none, 0, "NOT_FOUND")
	check("401", cls(401, nil, "", ""), failover, disable, 0, "UNAUTHENTICATED")
	check("403", cls(403, nil, gerr(403, "PERMISSION_DENIED", "Generative Language API has not been used in project", ""), ""), failover, disable, 0, "PERMISSION_DENIED")
	check("429 default", cls(429, nil, gerr(429, "RESOURCE_EXHAUSTED", "Resource has been exhausted", ""), ""), failover, cool, 60*time.Second, "RESOURCE_EXHAUSTED")
	check("429 retry-after", cls(429, map[string]string{"Retry-After": "2"}, "", ""), failover, cool, 2*time.Second, "RESOURCE_EXHAUSTED")
	check("429 retryDelay", cls(429, nil, gerr(429, "RESOURCE_EXHAUSTED", "You exceeded your current quota",
		`[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"m","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]},
		  {"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"34s"}]`), ""), failover, cool, 34*time.Second, "RESOURCE_EXHAUSTED")
	check("429 daily", cls(429, nil, gerr(429, "RESOURCE_EXHAUSTED", "quota",
		`[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]`), ""),
		failover, cool, 19*time.Hour, "RESOURCE_EXHAUSTED") // 05:00 PDT -> next midnight PDT
	check("429 array body", cls(429, nil, "["+gerr(429, "RESOURCE_EXHAUSTED", "x", `[{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"5.5s"}]`)+"]", ""),
		failover, cool, 5*time.Second, "RESOURCE_EXHAUSTED")
	check("500", cls(500, nil, gerr(500, "INTERNAL", "An internal error has occurred", ""), ""), failover, none, 0, "INTERNAL")
	check("503", cls(503, nil, gerr(503, "UNAVAILABLE", "The model is overloaded", ""), ""), failover, none, 0, "UNAVAILABLE")
	check("504 no body", cls(504, nil, "", ""), failover, none, 0, "DEADLINE_EXCEEDED")
	r = cls(0, nil, "", "dial tcp: i/o timeout")
	check("transport", r, failover, cool, 10*time.Second, "UNAVAILABLE")
	if r.GetClientStatus() != http.StatusBadGateway {
		t.Errorf("transport client status = %d", r.GetClientStatus())
	}
}

func itoa(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}

func TestBuildModelsRequest(t *testing.T) {
	h := start(t)
	r, err := h.Platform.BuildModelsRequest(context.Background(), &pluginv1.BuildModelsRequestRequest{
		Account: account(`{"api_key":"AIza-key-123"}`, ""),
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetMethod() != "GET" || r.GetUrl() != "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000" ||
		r.GetHeaders()["x-goog-api-key"] != "AIza-key-123" || r.GetIdsPath() != "models.#.name" || r.GetStripPrefix() != "models/" {
		t.Fatalf("resp = %v", r)
	}
}

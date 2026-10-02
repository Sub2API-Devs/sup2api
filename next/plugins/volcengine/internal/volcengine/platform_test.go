package volcengine

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
	return pluginsdktest.Start(t, New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithInfo("volcengine", "0.10.1")}})
}

func account(creds, settings string) *pluginv1.Account {
	return &pluginv1.Account{Id: 7, Platform: PlatformID, Type: AccountTypeAPIKey, CredentialsJson: creds, SettingsJson: settings}
}

const testKey = `{"api_key":"11111111-2222-3333-4444-555555555555"}`

// TestCapabilities: stage three serves the asset library over the plugin's
// own HTTP routes, so the SDK reports http.routes.v1 next to the platform
// adapter.
func TestCapabilities(t *testing.T) {
	h := start(t)
	if got := strings.Join(h.Info.GetCapabilities(), ","); got != "platform.execute.v1,platform.monitor.v1,platform.adapter.v1,platform.tasks.v1,platform.poll.v1,http.routes.v1" {
		t.Fatalf("capabilities = %s", got)
	}
}

func TestValidateCredentials(t *testing.T) {
	h := start(t)
	ctx := context.Background()

	// base_url left empty: normalized to the official Chinese endpoint.
	r, err := h.Platform.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{
		AccountType: AccountTypeAPIKey, CredentialsJson: `{"api_key":" ark-key-12345678 "}`, SettingsJson: `{"base_url":""}`,
	})
	if err != nil || len(r.GetErrors()) != 0 {
		t.Fatalf("valid: %v %v", r, err)
	}
	if r.GetNormalizedCredentialsJson() != `{"api_key":"ark-key-12345678"}` ||
		r.GetNormalizedSettingsJson() != `{"base_url":"`+DefaultBaseURL+`"}` {
		t.Fatalf("normalized = %s %s", r.GetNormalizedCredentialsJson(), r.GetNormalizedSettingsJson())
	}

	// The Ark SDK base URL and trailing slashes are normalized away, so the
	// value matches guardedSettings (CONTRACTS §21.3) again.
	for _, in := range []string{
		DefaultBaseURL + "/api/v3",
		DefaultBaseURL + "/api/v3/",
		DefaultBaseURL + "/",
		" " + DefaultBaseURL + " ",
	} {
		r, err := h.Platform.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{
			AccountType: AccountTypeAPIKey, CredentialsJson: testKey, SettingsJson: `{"base_url":"` + in + `"}`,
		})
		if err != nil || len(r.GetErrors()) != 0 {
			t.Fatalf("%q: %v %v", in, r, err)
		}
		if r.GetNormalizedSettingsJson() != `{"base_url":"`+DefaultBaseURL+`"}` {
			t.Fatalf("%q normalized to %s", in, r.GetNormalizedSettingsJson())
		}
	}

	// BytePlus, the other allowed address, survives untouched.
	r, _ = h.Platform.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{
		AccountType: AccountTypeAPIKey, CredentialsJson: testKey, SettingsJson: `{"base_url":"` + BytePlusBaseURL + `/api/v3"}`,
	})
	if len(r.GetErrors()) != 0 || r.GetNormalizedSettingsJson() != `{"base_url":"`+BytePlusBaseURL+`"}` {
		t.Fatalf("byteplus: %v %s", r.GetErrors(), r.GetNormalizedSettingsJson())
	}

	// Errors: missing key, relative base_url, wrong account type.
	r, _ = h.Platform.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{AccountType: AccountTypeAPIKey, CredentialsJson: `{}`})
	if len(r.GetErrors()) != 1 || r.GetErrors()[0].GetField() != "api_key" {
		t.Fatalf("missing key: %v", r.GetErrors())
	}
	r, _ = h.Platform.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{
		AccountType: AccountTypeAPIKey, CredentialsJson: testKey, SettingsJson: `{"base_url":"ark.cn-beijing.volces.com"}`,
	})
	if len(r.GetErrors()) != 1 || r.GetErrors()[0].GetField() != "base_url" {
		t.Fatalf("relative base_url: %v", r.GetErrors())
	}
	r, _ = h.Platform.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{AccountType: "oauth", CredentialsJson: testKey})
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

	// Streaming chat on the default base URL: Ark's /api/v3 prefix, bearer
	// key, include_usage forced, only the user agent forwarded.
	r, err := build(&pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "doubao-seed-1-6-250615", Stream: true},
		account(testKey, ""),
		map[string]string{"user-agent": "OpenAI/Python 1.0", "openai-organization": "org-1", "cookie": "no"})
	if err != nil {
		t.Fatal(err)
	}
	hd := r.GetHeaders()
	if r.GetMethod() != "POST" || r.GetUrl() != DefaultBaseURL+"/api/v3/chat/completions" ||
		hd["authorization"] != "Bearer 11111111-2222-3333-4444-555555555555" ||
		hd["content-type"] != "application/json" || hd["user-agent"] != "OpenAI/Python 1.0" {
		t.Fatalf("request = %s %s %v", r.GetMethod(), r.GetUrl(), hd)
	}
	for _, name := range []string{"cookie", "openai-organization"} {
		if _, ok := hd[name]; ok {
			t.Fatalf("%s must not be forwarded", name)
		}
	}
	if p := patches(r); len(p) != 1 || p["stream_options.include_usage"] != "true" || r.GetUpstreamModel() != "doubao-seed-1-6-250615" {
		t.Fatalf("patches = %v upstream = %s", r.GetPatches(), r.GetUpstreamModel())
	}

	// Non-streaming chat: no stream_options patch.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "doubao-seed-1-6-250615"}, account(testKey, ""), nil)
	if err != nil || len(r.GetPatches()) != 0 {
		t.Fatalf("non-stream chat: %v %v", r, err)
	}

	// A "bot" model is an Ark application: it has its own chat path.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "bot-20250101120000-abcde"}, account(testKey, ""), nil)
	if err != nil || r.GetUrl() != DefaultBaseURL+"/api/v3/bots/chat/completions" {
		t.Fatalf("bot model: %v %v", r, err)
	}
	// Models that merely start with "bot" as part of a word do not: the
	// prefix is the whole discriminator Ark offers, so document the edge.
	r, _ = build(&pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "doubao-bot"}, account(testKey, ""), nil)
	if r.GetUrl() != DefaultBaseURL+"/api/v3/chat/completions" {
		t.Fatalf("model containing bot: %s", r.GetUrl())
	}

	// A custom base URL with a trailing slash and the /api/v3 the operator
	// pasted from the Ark SDK docs; responses never uses the bots path.
	//
	// mock-upstream speaks Ark's own paths while not being an Ark host, which
	// is exactly the case the derived layout gets wrong and api_prefix exists
	// for: without it this account would be taken for a standard relay and
	// asked for /v1/responses.
	acc := account(testKey, `{"base_url":"http://mock-upstream:8080/api/v3/","api_prefix":"/api/v3"}`)
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolResponses, Model: "bot-1", Stream: true}, acc, nil)
	if err != nil || r.GetUrl() != "http://mock-upstream:8080/api/v3/responses" || len(r.GetPatches()) != 0 {
		t.Fatalf("responses: %v %v", r, err)
	}

	// Embeddings on the BytePlus address.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolEmbeddings, Model: "doubao-embedding-text-240715"},
		account(testKey, `{"base_url":"`+BytePlusBaseURL+`"}`), nil)
	if err != nil || r.GetUrl() != BytePlusBaseURL+"/api/v3/embeddings" || len(r.GetPatches()) != 0 {
		t.Fatalf("embeddings: %v %v", r, err)
	}

	// fields["model"] wins over meta.model, including for the bots path.
	r, err = h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "doubao-seed-1-6-250615"},
		Account: account(testKey, ""), Fields: map[string]string{"model": `"bot-7"`},
	})
	if err != nil || r.GetUpstreamModel() != "bot-7" || r.GetUrl() != DefaultBaseURL+"/api/v3/bots/chat/completions" {
		t.Fatalf("fields model: %v %v", r, err)
	}

	// Converted request (the client spoke anthropic.messages): the path and
	// the include_usage patch follow meta.protocol.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolChat, ClientProtocol: "anthropic.messages", Model: "doubao-seed-1-6-250615", Stream: true}, account(testKey, ""), nil)
	if err != nil || r.GetUrl() != DefaultBaseURL+"/api/v3/chat/completions" || patches(r)["stream_options.include_usage"] != "true" {
		t.Fatalf("converted: %v %v", r, err)
	}

	// Errors: missing key, unknown protocol, foreign account type.
	if _, err := build(&pluginv1.RequestMeta{Protocol: ProtocolChat}, account(`{}`, ""), nil); err == nil {
		t.Fatal("expected error for missing api key")
	}
	if _, err := build(&pluginv1.RequestMeta{Protocol: "gemini.generate"}, account(testKey, ""), nil); err == nil {
		t.Fatal("expected error for unknown protocol")
	}
	foreign := account(testKey, "")
	foreign.Type = "relay_key"
	if _, err := build(&pluginv1.RequestMeta{Protocol: ProtocolChat}, foreign, nil); err == nil {
		t.Fatal("expected error for a foreign account type")
	}
}

// TestBuildUpstreamRequestImages covers the volcengine platform's own
// endpoint: the client calls /ark/v3/images/generations (the core reserves
// the "api" first segment), the upstream stays Ark's /api/v3.
func TestBuildUpstreamRequestImages(t *testing.T) {
	h := start(t)
	ctx := context.Background()
	build := func(meta *pluginv1.RequestMeta, acc *pluginv1.Account, inbound map[string]string) (*pluginv1.BuildUpstreamRequestResponse, error) {
		return h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
			Meta: meta, Account: acc, Fields: map[string]string{"model": `"` + meta.GetModel() + `"`}, InboundHeaders: inbound,
		})
	}

	r, err := build(&pluginv1.RequestMeta{Protocol: ProtocolImages, Model: "doubao-seedream-4-0-250828"},
		account(testKey, ""), map[string]string{"user-agent": "Ark/Python 1.0", "cookie": "no"})
	if err != nil {
		t.Fatal(err)
	}
	hd := r.GetHeaders()
	if r.GetMethod() != "POST" || r.GetUrl() != DefaultBaseURL+"/api/v3/images/generations" ||
		hd["authorization"] != "Bearer 11111111-2222-3333-4444-555555555555" ||
		hd["content-type"] != "application/json" || hd["user-agent"] != "Ark/Python 1.0" {
		t.Fatalf("images = %s %s %v", r.GetMethod(), r.GetUrl(), hd)
	}
	if _, ok := hd["cookie"]; ok {
		t.Fatal("cookie must not be forwarded")
	}
	if r.GetUpstreamModel() != "doubao-seedream-4-0-250828" {
		t.Fatalf("upstream model = %q", r.GetUpstreamModel())
	}

	// Image-to-image shares the path: Ark decides from the body, not the URL,
	// so there is no second branch to take.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolImages, Model: "doubao-seedream-4-5-251128"},
		account(testKey, `{"base_url":"`+BytePlusBaseURL+`/api/v3/"}`), nil)
	if err != nil || r.GetUrl() != BytePlusBaseURL+"/api/v3/images/generations" {
		t.Fatalf("byteplus images: %v %v", r, err)
	}

	// stream_options.include_usage is a chat-completions field: never patched
	// onto an image request, even when the client asked for a stream.
	r, err = build(&pluginv1.RequestMeta{Protocol: ProtocolImages, Model: "doubao-seedream-4-0-250828", Stream: true},
		account(testKey, ""), nil)
	if err != nil || len(r.GetPatches()) != 0 {
		t.Fatalf("streaming images: %v %v", r.GetPatches(), err)
	}

	// A model starting with "bot" does not divert the image path.
	r, _ = build(&pluginv1.RequestMeta{Protocol: ProtocolImages, Model: "bot-1"}, account(testKey, ""), nil)
	if r.GetUrl() != DefaultBaseURL+"/api/v3/images/generations" {
		t.Fatalf("bot image model: %s", r.GetUrl())
	}
}

func TestBuildTestRequest(t *testing.T) {
	h := start(t)
	ctx := context.Background()
	r, err := h.Platform.BuildTestRequest(ctx, &pluginv1.BuildTestRequestRequest{Account: account(testKey, "")})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != DefaultBaseURL+"/api/v3/chat/completions" || r.GetHeaders()["authorization"] != "Bearer 11111111-2222-3333-4444-555555555555" {
		t.Fatalf("resp = %v", r)
	}
	var body struct {
		Model     string `json:"model"`
		MaxTokens int    `json:"max_tokens"`
		Messages  []any  `json:"messages"`
	}
	if err := json.Unmarshal([]byte(r.GetBodyJson()), &body); err != nil ||
		body.Model != DefaultTestModel || body.MaxTokens != testMaxTokens || len(body.Messages) != 1 {
		t.Fatalf("body = %s", r.GetBodyJson())
	}
	// The host is told which model was really used and how to read the usage
	// (account/testreq.go testUsage), so the console shows the token counts.
	if r.GetModel() != DefaultTestModel || r.GetUsageProtocol() != ProtocolChat {
		t.Fatalf("model = %q usage protocol = %q", r.GetModel(), r.GetUsageProtocol())
	}

	// An explicit bot id is tested against the bots path.
	r, err = h.Platform.BuildTestRequest(ctx, &pluginv1.BuildTestRequestRequest{
		Account: account(testKey, `{"base_url":"`+BytePlusBaseURL+`"}`), Model: " bot-42 ",
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != BytePlusBaseURL+"/api/v3/bots/chat/completions" || r.GetModel() != "bot-42" {
		t.Fatalf("bot test = %s %s", r.GetUrl(), r.GetModel())
	}
}

// TestBuildModelsRequestUnimplemented pins the decision not to implement
// pluginsdk.ModelLister: Ark documents no API-key-authenticated list-models
// endpoint, so the console's "fetch from upstream" reports 501 rather than
// hitting a guessed URL (CONTRACTS §19).
func TestBuildModelsRequestUnimplemented(t *testing.T) {
	h := start(t)
	_, err := h.Platform.BuildModelsRequest(context.Background(), &pluginv1.BuildModelsRequestRequest{Account: account(testKey, "")})
	if err == nil {
		t.Fatal("expected UNIMPLEMENTED")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "unimplemented") {
		t.Fatalf("err = %v", err)
	}
}

func TestClassifyError(t *testing.T) {
	now := time.Date(2026, 9, 29, 12, 0, 0, 0, time.UTC)
	p := New()
	p.now = func() time.Time { return now }
	cls := func(status int32, headers map[string]string, body, transport string) *pluginv1.ClassifyErrorResponse {
		r, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
			Status: status, Headers: headers, BodyPrefix: []byte(body), TransportError: transport,
		})
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
	check := func(name string, r *pluginv1.ClassifyErrorResponse, action pluginv1.ClassifyErrorResponse_Action,
		effect pluginv1.ClassifyErrorResponse_AccountEffect, cooldown time.Duration, errType string) {
		t.Helper()
		if r.GetAction() != action || r.GetAccountEffect() != effect || r.GetClientErrorType() != errType {
			t.Errorf("%s: got %v/%v/%s, want %v/%v/%s", name, r.GetAction(), r.GetAccountEffect(), r.GetClientErrorType(), action, effect, errType)
		}
		if effect == cool {
			if got := time.Unix(r.GetCooldownUntilUnix(), 0).Sub(now); got != cooldown {
				t.Errorf("%s: cooldown %v, want %v", name, got, cooldown)
			}
		}
		if action == failover && r.GetReason() == "" {
			t.Errorf("%s: empty reason", name)
		}
	}
	arkErr := func(code, msg string) string {
		return `{"error":{"code":"` + code + `","message":"` + msg + `","param":"","type":"x"}}`
	}

	// Client mistakes come back untouched.
	r := cls(400, nil, arkErr("InvalidParameter", "invalid parameter model"), "")
	check("400", r, ret, none, 0, "invalid_request_error")
	if r.GetClientMessage() != "invalid parameter model" {
		t.Errorf("client message = %q", r.GetClientMessage())
	}
	check("404 endpoint", cls(404, nil, arkErr("InvalidEndpoint.NotFound", "endpoint not found"), ""), ret, none, 0, "invalid_request_error")
	check("400 no body", cls(400, nil, "", ""), ret, none, 0, "invalid_request_error")

	// Ark reports the client's error type as an HTTP phrase ("Unauthorized"),
	// which OpenAI SDKs do not know: the status decides the type instead.
	check("401", cls(401, nil, arkErr("AuthenticationError", "The API key doesn't exist"), ""), failover, disable, 0, "authentication_error")
	check("403 denied", cls(403, nil, arkErr("AccessDenied", "no permission"), ""), failover, disable, 0, "permission_error")
	check("403 overdue", cls(403, nil, arkErr("AccountOverdueError", "account is in arrears"), ""), failover, disable, 0, "permission_error")
	if got := cls(403, nil, arkErr("AccountOverdueError", "account is in arrears"), "").GetReason(); !strings.Contains(got, "AccountOverdueError") {
		t.Errorf("reason = %q, want the Ark code in it", got)
	}

	// The model is simply not enabled on this account: try the next one, but
	// leave the account alone.
	check("404 model not open", cls(404, nil, arkErr("ModelNotOpen", "model not open"), ""), failover, none, 0, "invalid_request_error")
	check("400 closed endpoint", cls(400, nil, arkErr("InvalidEndpoint.ClosedEndpoint", "endpoint closed"), ""), failover, none, 0, "invalid_request_error")
	check("404 invalid endpoint or model", cls(404, nil, arkErr("InvalidEndpointOrModel.NotFound", "not found"), ""), failover, none, 0, "invalid_request_error")

	// 429s.
	check("429 quota", cls(429, nil, arkErr("QuotaExceeded", "free trial used up"), ""), failover, disable, 0, "rate_limit_error")
	check("429 overloaded", cls(429, nil, arkErr("ServerOverloaded", "busy"), ""), failover, cool, transientCooldown, "rate_limit_error")
	check("429 loading", cls(429, nil, arkErr("ModelLoadingError", "loading"), ""), failover, cool, transientCooldown, "rate_limit_error")
	check("429 rpm", cls(429, nil, arkErr("RateLimitExceeded.EndpointRPMExceeded", "rpm"), ""), failover, cool, defaultRateLimitCooldown, "rate_limit_error")
	check("429 account tpm", cls(429, nil, arkErr("ModelAccountTpmRateLimitExceeded", "tpm"), ""), failover, cool, defaultRateLimitCooldown, "rate_limit_error")
	check("429 retry-after", cls(429, map[string]string{"retry-after": "2"}, "", ""), failover, cool, 2*time.Second, "rate_limit_error")
	check("429 retry-after-ms", cls(429, map[string]string{"retry-after-ms": "2500", "retry-after": "9"}, "", ""), failover, cool, 2*time.Second, "rate_limit_error")
	check("429 retry-after date", cls(429, map[string]string{"Retry-After": now.Add(90 * time.Second).Format(http.TimeFormat)}, "", ""), failover, cool, 90*time.Second, "rate_limit_error")
	check("429 clamp", cls(429, map[string]string{"retry-after": "99999999"}, "", ""), failover, cool, maxCooldown, "rate_limit_error")

	// Server side and transport.
	check("500", cls(500, nil, arkErr("InternalServiceError", "boom"), ""), failover, cool, transientCooldown, "server_error")
	check("503", cls(503, nil, "", ""), failover, cool, transientCooldown, "server_error")
	check("408", cls(408, nil, "", ""), failover, cool, transientCooldown, "invalid_request_error")
	r = cls(0, nil, "", "dial tcp: connection refused")
	check("transport", r, failover, cool, transientCooldown, "server_error")
	if r.GetClientStatus() != http.StatusBadGateway || r.GetClientMessage() != "upstream connection failed" {
		t.Errorf("transport = %d %q", r.GetClientStatus(), r.GetClientMessage())
	}

	// Compatible relays that answer {"error": "message"}.
	if r := cls(400, nil, `{"error":"bad things"}`, ""); r.GetClientMessage() != "bad things" || r.GetClientErrorType() != "invalid_request_error" {
		t.Errorf("string error body: %v", r)
	}
	// A non-JSON body (an HTML gateway page) must not panic or misclassify.
	check("502 html", cls(502, nil, "<html>502 Bad Gateway</html>", ""), failover, cool, transientCooldown, "server_error")

	// Image generation (volcengine.images) adds no error code of its own that
	// needs a different decision: content moderation is a 400 about this
	// request, so it goes back to the client instead of being replayed —
	// and paid for — on every other account of the group. The Input* /
	// Output* prefixes must not be mistaken for the account-resource codes
	// that do fail over (ModelNotOpen, InvalidEndpointOrModel*).
	for _, code := range []string{
		"InputTextSensitiveContentDetected",
		"InputImageSensitiveContentDetected.PrivacyInformation",
		"OutputImageSensitiveContentDetected",
		"InputImageUrlCannotAccess",
	} {
		check("400 "+code, cls(400, nil, arkErr(code, "sensitive content"), ""), ret, none, 0, "invalid_request_error")
	}
	// The shared decisions still apply on the image endpoint.
	check("images 404 model not open", cls(404, nil, arkErr("ModelNotOpen", "model not open"), ""), failover, none, 0, "invalid_request_error")
	check("images 429 overloaded", cls(429, nil, arkErr("ServerOverloaded", "busy"), ""), failover, cool, transientCooldown, "rate_limit_error")
}

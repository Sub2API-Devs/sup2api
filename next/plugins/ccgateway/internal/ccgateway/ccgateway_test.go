package ccgateway

import (
	"context"
	"encoding/json"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"testing"
	"time"
)

func TestManagedRPCRequests(t *testing.T) {
	h := pluginsdktest.Start(t, New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithInfo("ccgateway", "0.1.0")}})
	ctx := context.Background()
	acc := &pluginv1.Account{Id: 1, Platform: PlatformID, Type: AccountTypeManaged, CredentialsJson: "{}", SettingsJson: "{}"}
	for _, stream := range []bool{false, true} {
		r, e := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{Account: acc, Meta: &pluginv1.RequestMeta{Protocol: ProtocolMessages, Model: "original", Stream: stream}, Fields: map[string]string{"model": `"mapped"`}, InboundHeaders: map[string]string{"x-api-key": "caller-secret", "authorization": "Bearer caller-secret", "anthropic-beta": "test-beta"}})
		if e != nil {
			t.Fatal(e)
		}
		if r.GetUrl() != VirtualURL || r.GetMethod() != "POST" || r.GetUpstreamModel() != "mapped" {
			t.Fatalf("wrong request %v", r)
		}
		if len(r.GetHeaders()) != 4 || r.GetHeaders()["anthropic-beta"] != "test-beta" {
			t.Fatal("header allowlist changed")
		}
	}
	count, err := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{Account: acc, Meta: &pluginv1.RequestMeta{Protocol: ProtocolCountTokens, Model: "fixture"}})
	if err != nil || count.GetUrl() != VirtualCountURL {
		t.Fatal("count protocol not routed to the count endpoint", err, count)
	}
	for _, protocol := range []string{"openai.chat", ""} {
		if _, e := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{Account: acc, Meta: &pluginv1.RequestMeta{Protocol: protocol}}); status.Code(e) != codes.Unimplemented {
			t.Fatalf("unsupported protocol accepted: %s %v", protocol, e)
		}
	}
	r, e := h.Platform.BuildTestRequest(ctx, &pluginv1.BuildTestRequestRequest{Account: acc})
	if e != nil || r.GetUrl() != VirtualURL || r.GetUsageProtocol() != ProtocolMessages || r.GetModel() != DefaultTestModel {
		t.Fatalf("test request %v %v", r, e)
	}
	var probe struct {
		MaxTokens int `json:"max_tokens"`
	}
	if err := json.Unmarshal([]byte(r.GetBodyJson()), &probe); err != nil || probe.MaxTokens < 64 {
		t.Fatalf("probe can truncate the CLI response before persistence: %s (%v)", r.GetBodyJson(), err)
	}
}

func TestNativeSessionScopeCannotBeSpoofed(t *testing.T) {
	p := New()
	in := &pluginv1.BuildUpstreamRequestRequest{
		Account:        &pluginv1.Account{Platform: PlatformID, Type: AccountTypeManaged, CredentialsJson: "{}", SettingsJson: "{}"},
		Meta:           &pluginv1.RequestMeta{Protocol: ProtocolMessages, UserId: 12, ApiKeyId: 34},
		InboundHeaders: map[string]string{"x-ccgateway-session-id": "conversation-a", "x-ccgateway-session-scope": "attacker", "x-claude-code-agent-id": "agent-fixture"},
	}
	r, err := p.BuildUpstreamRequest(context.Background(), in)
	if err != nil {
		t.Fatal(err)
	}
	if r.Headers["x-ccgateway-session-scope"] != "user:12:key:34" {
		t.Fatal("native session scope not owned by host")
	}
	// The session comes from the body (CONTRACTS §53.12); the legacy header
	// is not forwarded. A client subagent's own header is.
	if _, forwarded := r.Headers["x-ccgateway-session-id"]; forwarded || r.Headers["x-claude-code-agent-id"] != "agent-fixture" {
		t.Fatal("session headers", r.Headers)
	}
	in.Meta.ApiKeyId = 35
	r2, err := p.BuildUpstreamRequest(context.Background(), in)
	if err != nil || r2.Headers["x-ccgateway-session-scope"] == r.Headers["x-ccgateway-session-scope"] {
		t.Fatal("API keys share session scope")
	}
}
func TestManagedRejectsCredentialOrTargetOverrides(t *testing.T) {
	p := New()
	ctx := context.Background()
	for _, raw := range []string{`{"api_key":"secret"}`, `{"base_url":"https://evil.invalid"}`, `[]`, `null`, `{`} {
		for _, settings := range []bool{false, true} {
			in := &pluginv1.ValidateCredentialsRequest{AccountType: AccountTypeManaged, CredentialsJson: "{}", SettingsJson: "{}"}
			if settings {
				in.SettingsJson = raw
			} else {
				in.CredentialsJson = raw
			}
			r, e := p.ValidateCredentials(ctx, in)
			if e != nil || len(r.GetErrors()) == 0 {
				t.Fatalf("override accepted: %s", raw)
			}
		}
	}
	r, e := p.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{AccountType: AccountTypeManaged})
	if e != nil || len(r.GetErrors()) != 0 || r.GetNormalizedCredentialsJson() != "{}" {
		t.Fatalf("managed default: %v %v", r, e)
	}
	_, e = p.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{Account: &pluginv1.Account{Type: AccountTypeManaged, SettingsJson: `{"base_url":"https://evil.invalid"}`}, Meta: &pluginv1.RequestMeta{Protocol: ProtocolMessages}})
	if status.Code(e) != codes.FailedPrecondition {
		t.Fatal("runtime override accepted")
	}
}
func TestErrorsPreserveCoreFailover(t *testing.T) {
	for _, code := range []int32{401, 403, 429, 500, 529} {
		r, e := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: code})
		if e != nil || r.GetAction() != pluginv1.ClassifyErrorResponse_ACTION_FAILOVER {
			t.Fatalf("error %d: %v %v", code, r, e)
		}
	}
}

// A gateway refusal of the request itself (history it could not carry) goes
// back to the client without cooling the account down: every account would
// refuse it, and the others' sessions must keep working (2026-10-10, a 502
// that left the group with "no available account").
func TestRequestScopedGatewayErrorKeepsTheAccount(t *testing.T) {
	body := []byte(`{"type":"error","error":{"type":"api_error","message":"cannot prepare the upstream request: fixture"}}`)
	r, e := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: 502, BodyPrefix: body,
		Headers: map[string]string{"x-ccgateway-error-scope": "request"}})
	if e != nil || r.GetAction() != pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT ||
		r.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED || r.GetCooldownUntilUnix() != 0 {
		t.Fatalf("request-scoped error: %v %v", r, e)
	}
	// Without the mark a 502 is still an upstream failure.
	r, e = New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: 502, BodyPrefix: body})
	if e != nil || r.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN {
		t.Fatalf("unmarked 502: %v %v", r, e)
	}
}

// A full Worker answers 429 with Retry-After: 1: the account pauses for a
// second and the request fails over, instead of a minute of cooldown that
// left the group with "no available account" (2026-10-10).
func TestFullWorkerPausesTheAccountBriefly(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	p := &Plugin{now: func() time.Time { return now }}
	body := []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"Gateway concurrency limit reached"}}`)
	r, e := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: 429, BodyPrefix: body, Headers: map[string]string{"retry-after": "1"}})
	if e != nil || r.GetAction() != pluginv1.ClassifyErrorResponse_ACTION_FAILOVER || r.GetCooldownUntilUnix() != now.Add(time.Second).Unix() {
		t.Fatalf("full worker: %v %v", r, e)
	}
	r, _ = p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: 429, BodyPrefix: body})
	if r.GetCooldownUntilUnix() != now.Add(time.Minute).Unix() {
		t.Fatalf("without Retry-After: %v", r)
	}
}

// An Anthropic error body is returned unchanged; only other bodies are
// described for the host to render.
func TestUpstreamErrorBodyPassesThrough(t *testing.T) {
	body := []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"tools.0.custom.input_schema: JSON schema is invalid."}}`)
	for _, code := range []int32{400, 429, 502, 529} {
		r, e := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: code, BodyPrefix: body})
		if e != nil || r.GetClientErrorType() != "" || r.GetClientMessage() != "" || r.GetClientErrorCode() != "" || r.GetClientStatus() != 0 {
			t.Fatalf("error %d rewritten: %v %v", code, r, e)
		}
	}
	r, e := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: 502, BodyPrefix: []byte("<html>bad gateway</html>")})
	if e != nil || r.GetClientErrorType() != "api_error" {
		t.Fatalf("non-JSON body: %v %v", r, e)
	}
}

func TestAPIKeyCredentialsAndVirtualRouting(t *testing.T) {
	p := New()
	for _, raw := range []string{`{}`, `{"api_key":"short"}`, `{"api_key":"test-key-123","base_url":"http://example.com"}`, `{"api_key":"test-key-123","base_url":"https://user:pass@example.com"}`, `{"api_key":"test-key-123","base_url":"https://example.com?q=secret"}`, `{"api_key":"test-key-123","base_url":"https://example.com#"}`, `{"api_key":"test-key-123","extra":"bad"}`} {
		r, err := p.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: AccountTypeAPIKey, CredentialsJson: raw})
		if err != nil || len(r.Errors) == 0 {
			t.Fatal("invalid API credentials accepted")
		}
	}
	r, err := p.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: AccountTypeAPIKey, CredentialsJson: `{"api_key":"test-key-123","base_url":"https://relay.example/v1/"}`})
	if err != nil || len(r.Errors) != 0 || r.NormalizedCredentialsJson != `{"api_key":"test-key-123","base_url":"https://relay.example"}` {
		t.Fatal("API key normalization failed")
	}
	acc := &pluginv1.Account{Type: AccountTypeAPIKey, CredentialsJson: r.NormalizedCredentialsJson}
	req, err := p.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{Account: acc})
	if err != nil || req.Url != VirtualURL || len(req.Headers) != 2 {
		t.Fatal("API key bypassed managed transport")
	}
	for _, v := range req.Headers {
		if v == "test-key-123" {
			t.Fatal("upstream key leaked to transport")
		}
	}
}

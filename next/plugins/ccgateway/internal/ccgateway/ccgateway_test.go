package ccgateway

import (
	"context"
	"encoding/json"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"net/http"
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
	for _, protocol := range []string{ProtocolCountTokens, "openai.chat", ""} {
		if _, e := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{Account: acc, Meta: &pluginv1.RequestMeta{Protocol: protocol}}); status.Code(e) != codes.Unimplemented {
			t.Fatalf("unsupported protocol accepted: %s %v", protocol, e)
		}
	}
	r, e := h.Platform.BuildTestRequest(ctx, &pluginv1.BuildTestRequestRequest{Account: acc})
	if e != nil || r.GetUrl() != VirtualTestURL || r.GetUsageProtocol() != ProtocolMessages || r.GetModel() != DefaultTestModel {
		t.Fatalf("test request %v %v", r, e)
	}
	var probe struct {
		MaxTokens int    `json:"max_tokens"`
		System    string `json:"system"`
	}
	if err := json.Unmarshal([]byte(r.GetBodyJson()), &probe); err != nil || probe.MaxTokens < 64 || probe.System == "" {
		t.Fatalf("probe can truncate the CLI response before persistence: %s (%v)", r.GetBodyJson(), err)
	}
}

func TestAccountExtensionsSurviveValidationAndRequests(t *testing.T) {
	p := New()
	ctx := context.Background()
	for _, kind := range []string{AccountTypeManaged, AccountTypeAPIKey} {
		credentials := "{}"
		if kind == AccountTypeAPIKey {
			credentials = `{"api_key":"fixture-only-key"}`
		}
		settings := `{"locale":"ja-JP","timezone":"Asia/Tokyo"}`
		validated, err := p.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{AccountType: kind, CredentialsJson: credentials, SettingsJson: settings})
		if err != nil || len(validated.GetErrors()) != 0 {
			t.Fatalf("%s extensions rejected: %v %v", kind, validated, err)
		}
		var normalized map[string]string
		if json.Unmarshal([]byte(validated.GetNormalizedSettingsJson()), &normalized) != nil || normalized["locale"] != "ja-JP" || normalized["timezone"] != "Asia/Tokyo" {
			t.Fatalf("%s extensions discarded: %v", kind, normalized)
		}
		acc := &pluginv1.Account{Type: kind, CredentialsJson: credentials, SettingsJson: settings}
		if _, err := p.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{Account: acc, Meta: &pluginv1.RequestMeta{Protocol: ProtocolMessages}}); err != nil {
			t.Fatalf("%s request rejected: %v", kind, err)
		}
	}
}

func TestNativeSessionScopeCannotBeSpoofed(t *testing.T) {
	p := New()
	in := &pluginv1.BuildUpstreamRequestRequest{
		Account:        &pluginv1.Account{Platform: PlatformID, Type: AccountTypeManaged, CredentialsJson: "{}", SettingsJson: "{}"},
		Meta:           &pluginv1.RequestMeta{Protocol: ProtocolMessages, UserId: 12, ApiKeyId: 34, RequestId: "0123456789abcdef01234567"},
		InboundHeaders: map[string]string{"x-ccgateway-session-id": "conversation-a", "x-ccgateway-session-scope": "attacker", "x-claude-code-agent-id": "agent-fixture", "x-request-id": "caller"},
	}
	r, err := p.BuildUpstreamRequest(context.Background(), in)
	if err != nil {
		t.Fatal(err)
	}
	if r.Headers["x-ccgateway-session-scope"] != "user:12:key:34" {
		t.Fatal("native session scope not owned by host")
	}
	if r.Headers["x-request-id"] != "0123456789abcdef01234567" {
		t.Fatal("the Worker's log is not named by the core's request ID", r.Headers)
	}
	// The session comes from the body (CONTRACTS §53.12); the legacy header
	// is not forwarded. A client subagent's own header is.
	if _, forwarded := r.Headers["x-ccgateway-session-id"]; forwarded || r.Headers["x-claude-code-agent-id"] != "agent-fixture" {
		t.Fatal("session headers", r.Headers)
	}
	in.Meta.ApiKeyId = 35
	in.Meta.RequestId = "not/a request id"
	r2, err := p.BuildUpstreamRequest(context.Background(), in)
	if err != nil || r2.Headers["x-ccgateway-session-scope"] == r.Headers["x-ccgateway-session-scope"] {
		t.Fatal("API keys share session scope")
	}
	if _, forwarded := r2.Headers["x-request-id"]; forwarded {
		t.Fatal("a malformed request ID or the caller's was forwarded")
	}
}

// CC's request context headers reach the Worker; a malformed value is dropped.
func TestAgentContextHeadersForwarded(t *testing.T) {
	p := New()
	in := &pluginv1.BuildUpstreamRequestRequest{
		Account: &pluginv1.Account{Platform: PlatformID, Type: AccountTypeManaged, CredentialsJson: "{}", SettingsJson: "{}"},
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolMessages, UserId: 1, ApiKeyId: 2},
		InboundHeaders: map[string]string{
			"x-claude-code-request-class":       "subagent",
			"x-claude-code-agent-id":            "a12268251d7ed891f",
			"x-claude-code-parent-agent-id":     "ad870fd7d5b0b15e6",
			"x-claude-code-agent-type":          "general-purpose",
			"x-claude-code-prompt-id":           "a606b757-b9e1-4f6f-8eb0-88ffd9569a8d",
			"x-claude-code-prev-tool-durations": "Agent=76;Read=12",
			"x-cc-compaction-request":           "auto",
			"x-claude-code-compaction":          "auto",
			"x-cc-context-compacted":            "manual",
			"x-claude-code-context-compacted":   "manual",
			"user-agent":                        "claude-cli/2.1.310 (external, sdk-ts, agent-sdk/0.2.71)",
			"x-claude-code-session-id":          "475d3bc6-d49a-4c42-8d1a-f5d9ab945851",
		},
	}
	r, err := p.BuildUpstreamRequest(context.Background(), in)
	if err != nil {
		t.Fatal(err)
	}
	for key, value := range in.InboundHeaders {
		if key == "x-claude-code-session-id" {
			if _, ok := r.Headers[key]; ok {
				t.Fatal("the session comes from the body, not the header")
			}
			continue
		}
		if r.Headers[key] != value {
			t.Fatalf("%s = %q, want %q", key, r.Headers[key], value)
		}
	}
	for key, bad := range map[string]string{
		"x-claude-code-request-class":       "Main Thread",
		"x-claude-code-agent-id":            "a b",
		"x-claude-code-agent-type":          "../x",
		"x-claude-code-prompt-id":           "not-a-uuid",
		"x-claude-code-prev-tool-durations": "Agent=76,Read=12",
		"x-cc-compaction-request":           "Auto Compact",
		// Only Claude Code's own User-Agent is the client's to keep.
		"user-agent": "anthropic-sdk-python/0.40.0",
	} {
		in.InboundHeaders = map[string]string{key: bad}
		r, err = p.BuildUpstreamRequest(context.Background(), in)
		if err != nil {
			t.Fatal(err)
		}
		if _, ok := r.Headers[key]; ok {
			t.Fatalf("malformed %s forwarded", key)
		}
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
func TestQuotaLimitDeclaresTimedAutomaticDisable(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	p := &Plugin{now: func() time.Time { return now }}
	reset := now.Add(3 * time.Hour)
	headers := map[string]string{"retry-after": "60", "anthropic-ratelimit-unified-5h-status": "rejected", "anthropic-ratelimit-unified-5h-reset": reset.Format(time.RFC3339)}
	in := &pluginv1.ClassifyErrorRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 429,
		Headers: headers, BodyPrefix: []byte(`{"error":{"type":"rate_limit_error","message":"quota exhausted"}}`)}
	out, err := p.ClassifyError(context.Background(), in)
	if err != nil || out.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE ||
		out.GetAutomaticState().GetAction() != pluginv1.AccountAutomaticState_ACTION_DISABLE || out.GetAutomaticState().GetUntilUnix() != reset.Unix() {
		t.Fatalf("quota reset: %v %v", out, err)
	}
	in.Headers = map[string]string{"anthropic-ratelimit-unified-7d-utilization": "1",
		"anthropic-ratelimit-unified-7d-reset":       reset.Format(time.RFC3339),
		"anthropic-ratelimit-unified-5h-utilization": "0.5",
		"anthropic-ratelimit-unified-5h-reset":       now.Add(time.Minute).Format(time.RFC3339)}
	out, err = p.ClassifyError(context.Background(), in)
	if err != nil || out.GetAutomaticState().GetUntilUnix() != reset.Unix() {
		t.Fatalf("healthy short window hid the exhausted weekly window: %v %v", out, err)
	}
	in.Headers = map[string]string{"retry-after": reset.UTC().Format(http.TimeFormat),
		"anthropic-ratelimit-tokens-remaining": "0", "anthropic-ratelimit-tokens-reset": now.Add(time.Minute).Format(time.RFC3339)}
	out, err = p.ClassifyError(context.Background(), in)
	if err != nil || out.GetAutomaticState().GetUntilUnix() != reset.Unix() {
		t.Fatalf("worker retry hint was shortened by the token window: %v %v", out, err)
	}
	in.Headers = map[string]string{"retry-after": "1", sourceHeader: "gateway", "x-ccgateway-error-reason": "concurrency_limit"}
	in.BodyPrefix = []byte(`{"error":{"type":"rate_limit_error","message":"Gateway concurrency limit reached"}}`)
	out, err = p.ClassifyError(context.Background(), in)
	if err != nil || out.GetAutomaticState() != nil || out.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN || out.GetCooldownUntilUnix() != now.Add(time.Second).Unix() {
		t.Fatalf("worker capacity: %v %v", out, err)
	}
	in.Status = 401
	in.Headers = map[string]string{}
	out, err = p.ClassifyError(context.Background(), in)
	if err != nil || out.GetAutomaticState() != nil || out.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE {
		t.Fatalf("authentication rejection must not have timed recovery: %v %v", out, err)
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
// A CLI-side failure (the CLI never reached the upstream) is not the
// gateway's refusal: a 502 cools the account down like any upstream 5xx.
func TestCLIFailureIsNotAGatewayRefusal(t *testing.T) {
	body := []byte(`{"type":"error","error":{"type":"api_error","code":"cli_process_error","message":"CLI request failed without a valid structured error"}}`)
	for _, source := range []string{"internal", "transport", ""} {
		r, e := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: 502, BodyPrefix: body, Headers: map[string]string{sourceHeader: source}})
		if e != nil || r.GetLocalFailure() || r.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN {
			t.Fatalf("%q: %v %v", source, r, e)
		}
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
	if err != nil || req.Url != VirtualTestURL || len(req.Headers) != 2 {
		t.Fatal("API key bypassed managed transport")
	}
	for _, v := range req.Headers {
		if v == "test-key-123" {
			t.Fatal("upstream key leaked to transport")
		}
	}
}

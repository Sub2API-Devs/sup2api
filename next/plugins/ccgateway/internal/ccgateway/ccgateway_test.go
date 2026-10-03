package ccgateway

import (
	"context"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"testing"
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
		if len(r.GetHeaders()) != 3 || r.GetHeaders()["anthropic-beta"] != "test-beta" {
			t.Fatal("header allowlist changed")
		}
	}
	for _, protocol := range []string{"anthropic.count_tokens", "openai.chat", ""} {
		if _, e := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{Account: acc, Meta: &pluginv1.RequestMeta{Protocol: protocol}}); status.Code(e) != codes.Unimplemented {
			t.Fatalf("unsupported protocol accepted: %s %v", protocol, e)
		}
	}
	r, e := h.Platform.BuildTestRequest(ctx, &pluginv1.BuildTestRequestRequest{Account: acc})
	if e != nil || r.GetUrl() != VirtualURL || r.GetUsageProtocol() != ProtocolMessages || r.GetModel() != DefaultTestModel {
		t.Fatalf("test request %v %v", r, e)
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

// Package ccgateway exposes managed Claude Code accounts without connection secrets.
package ccgateway

import (
	"context"
	"encoding/json"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"strings"
	"time"
)

const (
	PlatformID         = "anthropic"
	AccountTypeManaged = "managed"
	ProtocolMessages   = "anthropic.messages"
	VirtualURL         = "https://ccgateway.internal/v1/messages"
	DefaultTestModel   = "claude-haiku-4-5"
)

type Plugin struct{ now func() time.Time }

func New() *Plugin { return &Plugin{now: time.Now} }
func emptyObject(raw string) bool {
	if strings.TrimSpace(raw) == "" {
		return true
	}
	var object map[string]json.RawMessage
	return json.Unmarshal([]byte(raw), &object) == nil && object != nil && len(object) == 0
}
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	var fields pluginsdk.FieldErrors
	if in.GetAccountType() != AccountTypeManaged {
		fields = fields.Add("account_type", "unsupported", "Unsupported account type / 不支持的账号类型")
	}
	if !emptyObject(in.GetCredentialsJson()) {
		fields = fields.Add("", "unsupported", "Managed accounts use the administrator connection configuration / 托管账号使用管理员配置，无需账号凭证")
	}
	if !emptyObject(in.GetSettingsJson()) {
		fields = fields.Add("", "unsupported", "Managed accounts do not accept a custom upstream / 托管账号不接受自定义上游")
	}
	if len(fields) > 0 {
		return &pluginv1.ValidateCredentialsResponse{Errors: fields}, nil
	}
	return &pluginv1.ValidateCredentialsResponse{NormalizedCredentialsJson: "{}", NormalizedSettingsJson: "{}"}, nil
}
func validateAccount(acc *pluginv1.Account) error {
	if acc == nil || acc.GetType() != AccountTypeManaged {
		return status.Error(codes.FailedPrecondition, "CCGateway requires a managed account")
	}
	if !emptyObject(acc.GetCredentialsJson()) || !emptyObject(acc.GetSettingsJson()) {
		return status.Error(codes.FailedPrecondition, "CCGateway managed account cannot override its connection")
	}
	return nil
}
func headers(in map[string]string) map[string]string {
	out := map[string]string{"content-type": "application/json", "anthropic-version": "2023-06-01"}
	for _, key := range []string{"anthropic-version", "anthropic-beta"} {
		if value := strings.TrimSpace(in[key]); value != "" {
			out[key] = value
		}
	}
	return out
}

// The host resolves this exact virtual target for this plugin and account type,
// then injects authentication. No caller-supplied URL or credential is forwarded.
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	if err := validateAccount(in.GetAccount()); err != nil {
		return nil, err
	}
	if in.GetMeta().GetProtocol() != ProtocolMessages {
		return nil, status.Error(codes.Unimplemented, "CCGateway supports Anthropic Messages only; token counting is unavailable")
	}
	model := in.GetMeta().GetModel()
	if raw := in.GetFields()["model"]; raw != "" {
		var mapped string
		if json.Unmarshal([]byte(raw), &mapped) == nil && mapped != "" {
			model = mapped
		}
	}
	return &pluginv1.BuildUpstreamRequestResponse{Method: "POST", Url: VirtualURL, Headers: headers(in.GetInboundHeaders()), UpstreamModel: model}, nil
}
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	if err := validateAccount(in.GetAccount()); err != nil {
		return nil, err
	}
	model := strings.TrimSpace(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	body, _ := json.Marshal(map[string]any{"model": model, "max_tokens": 1, "messages": []map[string]string{{"role": "user", "content": "ping"}}})
	return &pluginv1.BuildTestRequestResponse{Method: "POST", Url: VirtualURL, Headers: headers(nil), BodyJson: string(body), Model: model, UsageProtocol: ProtocolMessages}, nil
}

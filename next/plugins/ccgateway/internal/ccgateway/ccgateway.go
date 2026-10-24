// Package ccgateway exposes managed Claude Code accounts without connection secrets.
package ccgateway

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/environment"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"net/url"
	"slices"
	"strings"
	"time"
)

const (
	PlatformID          = "anthropic"
	AccountTypeManaged  = "managed"
	AccountTypeAPIKey   = "apikey"
	ProtocolMessages    = "anthropic.messages"
	ProtocolCountTokens = "anthropic.count_tokens"
	VirtualURL          = "https://ccgateway.internal/v1/messages"
	VirtualTestURL      = "https://ccgateway.internal/v1/ccgateway/probe"
	DefaultTestModel    = "claude-haiku-4-5-20251001"
)

type Plugin struct{ now func() time.Time }

func New() *Plugin { return &Plugin{now: time.Now} }

func (p *Plugin) Init(_ context.Context, host pluginsdk.Host) error {
	if host.Info().HostAPIVersion < protocol.AccountAutomaticStateHostAPIVersion {
		return status.Errorf(codes.FailedPrecondition, "CCGateway requires host API %d for automatic account recovery", protocol.AccountAutomaticStateHostAPIVersion)
	}
	return nil
}

func emptyObject(raw string) bool {
	if strings.TrimSpace(raw) == "" {
		return true
	}
	var object map[string]json.RawMessage
	return json.Unmarshal([]byte(raw), &object) == nil && object != nil && len(object) == 0
}
func normalize(kind, raw, settings string) (string, pluginsdk.FieldErrors) {
	var fields pluginsdk.FieldErrors
	if _, err := environment.Normalize([]byte(settings)); err != nil {
		fields = fields.Add("settings", "invalid", "Invalid runtime environment / 运行环境配置无效")
	}
	switch kind {
	case AccountTypeManaged:
		if !emptyObject(raw) {
			fields = fields.Add("", "unsupported", "OAuth accounts do not accept API credentials / OAuth 账号不接受 API 凭证")
		}
		return "{}", fields
	case AccountTypeAPIKey:
		var values map[string]string
		if json.Unmarshal([]byte(raw), &values) != nil || values == nil {
			return "", fields.Add("", "invalid", "Invalid credentials / 凭证格式错误")
		}
		for key := range values {
			if key != "api_key" && key != "base_url" {
				fields = fields.Add(key, "unsupported", "Unknown field / 未知字段")
			}
		}
		key := strings.TrimSpace(values["api_key"])
		validKey := len(key) >= 8 && len(key) <= 512
		for _, c := range key {
			if c < 33 || c > 126 {
				validKey = false
			}
		}
		if !validKey {
			fields = fields.Add("api_key", "invalid", "Invalid API Key / API Key 格式错误")
		}
		base := strings.TrimSuffix(strings.TrimRight(strings.TrimSpace(values["base_url"]), "/"), "/v1")
		if base == "" {
			base = "https://api.anthropic.com"
		}
		u, e := url.Parse(base)
		if e != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || strings.ContainsAny(base, " \t\r\n#") || len(base) > 2048 {
			fields = fields.Add("base_url", "invalid", "Use an HTTPS base URL without credentials, query or fragment / 请填写不含认证信息、查询或片段的 HTTPS 地址")
		}
		out, _ := json.Marshal(map[string]string{"api_key": key, "base_url": base})
		return string(out), fields
	default:
		return "", fields.Add("account_type", "unsupported", "Unsupported account type / 不支持的账号类型")
	}
}
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	raw, fields := normalize(in.GetAccountType(), in.GetCredentialsJson(), in.GetSettingsJson())
	if len(fields) > 0 {
		return &pluginv1.ValidateCredentialsResponse{Errors: fields}, nil
	}
	settings, _ := environment.Normalize([]byte(in.GetSettingsJson()))
	encoded, _ := json.Marshal(settings)
	return &pluginv1.ValidateCredentialsResponse{NormalizedCredentialsJson: raw, NormalizedSettingsJson: string(encoded)}, nil
}
func validateAccount(acc *pluginv1.Account) error {
	if acc == nil {
		return status.Error(codes.FailedPrecondition, "CCGateway account required")
	}
	if _, fields := normalize(acc.GetType(), acc.GetCredentialsJson(), acc.GetSettingsJson()); len(fields) > 0 {
		return status.Error(codes.FailedPrecondition, "Invalid CCGateway account credentials")
	}
	return nil
}
func headers(in map[string]string) map[string]string {
	out := map[string]string{"content-type": "application/json", "anthropic-version": "2023-06-01"}
	// The session comes from the body's metadata.user_id (CONTRACTS §53.12).
	// The x-claude-code-* headers are CC's own request context (request class,
	// subagent and prompt IDs); the Worker maps the IDs before they go upstream.
	for _, key := range []string{"anthropic-version", "anthropic-beta"} {
		if value := strings.TrimSpace(in[key]); value != "" {
			out[key] = value
		}
	}
	for _, header := range agentContextHeaders {
		key := strings.ToLower(header.Header)
		if value := strings.TrimSpace(in[key]); value != "" && header.Valid(value) {
			out[key] = value
		}
	}
	return out
}

// agentContextHeaders are the forwarded CC context headers, with the shape
// each must have (the Worker reads the same table); a value of any other
// shape is dropped, not forwarded. The client's own User-Agent goes along
// only when it is Claude Code's: the Worker's CLI keeps it on a request that
// keeps the client's billing header, so the two agree as they do in Claude
// Code (audit D1).
var agentContextHeaders = append(slices.Clone(features.AgentContextHeaders), features.ClientUserAgent)

// The host resolves this exact virtual target for this plugin and account type,
// then injects authentication. No caller-supplied URL or credential is forwarded.
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	if err := validateAccount(in.GetAccount()); err != nil {
		return nil, err
	}
	// CCGateway offers no token counting (2026-10-11): the manifest does not
	// declare count_tokens, so the core never routes it here.
	if in.GetMeta().GetProtocol() != ProtocolMessages {
		return nil, status.Error(codes.Unimplemented, "CCGateway supports Anthropic Messages only")
	}
	target := VirtualURL
	model := in.GetMeta().GetModel()
	if raw := in.GetFields()["model"]; raw != "" {
		var mapped string
		if json.Unmarshal([]byte(raw), &mapped) == nil && mapped != "" {
			model = mapped
		}
	}
	outHeaders := headers(in.GetInboundHeaders())
	// Scope is supplied by the authenticated host, never copied from caller headers.
	outHeaders["x-ccgateway-session-scope"] = fmt.Sprintf("user:%d:key:%d", in.GetMeta().GetUserId(), in.GetMeta().GetApiKeyId())
	// The core's request ID names the Worker's log, so a usage record leads
	// to it (REQUEST-LOG-VIEWER-DESIGN.md §3); a caller's own is not copied.
	if id := in.GetMeta().GetRequestId(); features.RequestIDPattern.MatchString(id) {
		outHeaders["x-request-id"] = id
	}
	return &pluginv1.BuildUpstreamRequestResponse{Method: "POST", Url: target, Headers: outHeaders, UpstreamModel: model}, nil
}
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	if err := validateAccount(in.GetAccount()); err != nil {
		return nil, err
	}
	model := strings.TrimSpace(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	// Account connectivity is probed through CC's native builder, even when
	// business traffic uses direct. No hand-written CC identity/system tokens.
	body, _ := json.Marshal(map[string]any{"model": model, "max_tokens": 128, "system": "Answer the user concisely.", "messages": []map[string]string{{"role": "user", "content": "What is the capital of France?"}}})
	return &pluginv1.BuildTestRequestResponse{Method: "POST", Url: VirtualTestURL, Headers: headers(nil), BodyJson: string(body), Model: model, UsageProtocol: ProtocolMessages}, nil
}

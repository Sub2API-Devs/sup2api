// Package relay implements the "Claude relay" demo plugin: it declares one
// account type (relay_key) whose upstream is an Anthropic-compatible relay
// and that serves the core's built-in anthropic platform (manifest
// accountTypes[0].platforms, ARCHITECTURE 6.6), i.e. the anthropic.messages
// and anthropic.count_tokens endpoints. It declares no platform, no gateway
// endpoint and no price.
package relay

import (
	"context"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/apikey"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/providers/anthropic"
)

// PlatformID is the built-in platform the relay_key account type serves.
const PlatformID = "anthropic"

// Protocols of the built-in anthropic platform, which relay_key speaks
// natively upstream.
const (
	ProtocolMessages    = anthropic.ProtocolMessages
	ProtocolCountTokens = anthropic.ProtocolCountTokens
)

// Protocols lists the upstream protocols BuildUpstreamRequest supports.
var Protocols = []string{ProtocolMessages, ProtocolCountTokens}

const (
	// AccountTypeRelayKey is the only account type of the plugin.
	AccountTypeRelayKey = "relay_key"
	// DefaultAPIVersion is sent when the client did not send anthropic-version.
	DefaultAPIVersion = anthropic.DefaultAPIVersion
	// DefaultTestModel is used by BuildTestRequest when no model is given.
	DefaultTestModel = "claude-haiku-4-5"
)

// PassHeaders are the client headers relay_key asks the host for (manifest
// accountTypes[0].platforms[0].passHeaders, overriding the anthropic
// platform default) and forwards.
var PassHeaders = []string{"anthropic-version", "anthropic-beta"}

// spec describes the relay_key account type; base_url is required. Validation
// is the SDK's shared apikey.Spec.Validate, with the wording the console has
// always shown for this plugin.
var spec = apikey.Spec{
	AccountType:    AccountTypeRelayKey,
	RequireBaseURL: true,
	StripSuffixes:  []string{"/v1"},
	Texts: apikey.Texts{
		UnsupportedAccountType: "unsupported account type %q / 不支持的账号类型",
		KeyNotString:           "API key must be 8-512 printable characters without spaces / API Key 须为 8-512 个不含空格的可见字符",
		BaseURLRequired:        "Base URL of the relay is required / 请填写中转站的 Base URL",
		BaseURLFormat:          "base_url %s / base_url 必须是不含账号、查询参数的 http(s) 地址",
	},
}

// Plugin is the relay plugin. It implements pluginsdk.Platform.
type Plugin struct {
	now func() time.Time
}

// New returns the plugin.
func New() *Plugin { return &Plugin{now: time.Now} }

// ValidateCredentials implements pluginsdk.Platform: the shared apikey.Spec
// validation. api_key is checked before base_url, so an empty form reports
// both fields in that order.
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return spec.Validate(in), nil
}

// ---------------------------------------------------------------- requests

// upstreamPath maps the upstream protocol (RequestMeta.protocol) to the
// relay path.
func upstreamPath(protocol string) (string, error) {
	path, err := anthropic.Path(protocol)
	if err != nil {
		return "", status.Errorf(codes.InvalidArgument, "%v", err)
	}
	return path, nil
}

func upstreamHeaders(apiKey string, inbound map[string]string) map[string]string {
	return anthropic.Headers(apiKey, inbound, PassHeaders, DefaultAPIVersion)
}

// BuildUpstreamRequest implements pluginsdk.Platform: POST
// {base_url}/v1/messages or {base_url}/v1/messages/count_tokens depending on
// meta.protocol, authenticated with x-api-key. The model is sent as received:
// the core applies the account's model mapping before calling this method.
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	acc := in.GetAccount()
	if t := acc.GetType(); t != "" && t != AccountTypeRelayKey {
		return nil, status.Errorf(codes.FailedPrecondition, "unsupported account type %q", t)
	}
	cfg, err := spec.FromAccount(acc)
	if err != nil {
		return nil, err
	}
	ep, err := upstreamPath(in.GetMeta().GetProtocol())
	if err != nil {
		return nil, err
	}
	model := pluginsdk.RequestModel(in)
	return &pluginv1.BuildUpstreamRequestResponse{
		Method:        "POST",
		Url:           cfg.BaseURL + ep,
		Headers:       upstreamHeaders(cfg.APIKey, in.GetInboundHeaders()),
		UpstreamModel: model,
	}, nil
}

// BuildTestRequest implements pluginsdk.Platform: a one-token messages call.
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	acc := in.GetAccount()
	if t := acc.GetType(); t != "" && t != AccountTypeRelayKey {
		return nil, status.Errorf(codes.FailedPrecondition, "unsupported account type %q", t)
	}
	cfg, err := spec.FromAccount(acc)
	if err != nil {
		return nil, err
	}
	model := strings.TrimSpace(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	body := anthropic.MessagesPingBody(model, 1)
	return &pluginv1.BuildTestRequestResponse{
		Method:   "POST",
		Url:      cfg.BaseURL + "/v1/messages",
		Headers:  upstreamHeaders(cfg.APIKey, nil),
		BodyJson: body,
	}, nil
}

// BuildModelsRequest implements pluginsdk.ModelLister: GET /v1/models of the
// relay (Anthropic-compatible).
func (p *Plugin) BuildModelsRequest(_ context.Context, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	acc := in.GetAccount()
	if t := acc.GetType(); t != "" && t != AccountTypeRelayKey {
		return nil, status.Errorf(codes.FailedPrecondition, "unsupported account type %q", t)
	}
	cfg, err := spec.FromAccount(acc)
	if err != nil {
		return nil, err
	}
	return apikey.ModelListRequest(cfg, "/v1/models?limit=1000", "data.#.id", "", upstreamHeaders(cfg.APIKey, nil)), nil
}

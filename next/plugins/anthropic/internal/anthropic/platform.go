// Package anthropic implements the Anthropic plugin: the apikey account type
// for the built-in anthropic platform (credential validation, upstream
// request construction, error classification) and the model catalog admin
// route. The anthropic platform and its endpoints are built into the core
// (server/internal/platforms); this plugin declares none.
package anthropic

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

// PlatformID is the built-in platform the apikey account type serves
// (manifest accountTypes[].platforms).
const PlatformID = "anthropic"

// Protocol ids of the built-in anthropic platform's endpoints.
const (
	ProtocolMessages    = anthropic.ProtocolMessages
	ProtocolCountTokens = anthropic.ProtocolCountTokens
)

// Protocols lists the upstream protocols BuildUpstreamRequest supports: the
// protocols of the anthropic platform, in its endpoint order.
var Protocols = []string{ProtocolMessages, ProtocolCountTokens}

const (
	// AccountTypeAPIKey is the only account type in 0.1 (top-level
	// accountTypes in manifest.json).
	AccountTypeAPIKey = "apikey"
	// DefaultBaseURL is used when an account has no base_url.
	DefaultBaseURL = "https://api.anthropic.com"
	// DefaultAPIVersion is sent when the client did not send anthropic-version.
	DefaultAPIVersion = anthropic.DefaultAPIVersion
	// DefaultTestModel is used by BuildTestRequest when no model is given.
	DefaultTestModel = "claude-haiku-4-5"
)

// forwardHeaders are client headers (lower-case, from the built-in anthropic
// platform's passHeaders, which the apikey account type does not override)
// copied verbatim to the upstream request.
var forwardHeaders = []string{
	"anthropic-beta",
	"anthropic-dangerous-direct-browser-access",
	"user-agent",
	"x-app",
	"x-stainless-arch",
	"x-stainless-helper-method",
	"x-stainless-lang",
	"x-stainless-os",
	"x-stainless-package-version",
	"x-stainless-retry-count",
	"x-stainless-runtime",
	"x-stainless-runtime-version",
	"x-stainless-timeout",
}

// ForwardHeaders returns the client headers copied to the upstream request
// (besides anthropic-version, which has a default).
func ForwardHeaders() []string { return append([]string(nil), forwardHeaders...) }

// spec describes the apikey account type. Validation is the SDK's shared
// apikey.Spec.Validate; Texts only keeps the wording the console shipped
// before that helper existed. The key rule stays "8-512 printable
// characters" (no key prefix): the account form accepts any such key, and a
// stricter rule would reject keys it let through.
var spec = apikey.Spec{
	AccountType:    AccountTypeAPIKey,
	DefaultBaseURL: DefaultBaseURL,
	StripSuffixes:  []string{"/v1"},
	Texts: apikey.Texts{
		UnsupportedAccountType: "unsupported account type %q / 不支持的账号类型",
		KeyNotString:           "API key must be 8-512 printable characters without spaces / API Key 须为 8-512 个不含空格的可见字符",
		BaseURLFormat:          "base_url %s / base_url 必须是不含账号、查询参数的 http(s) 地址",
	},
}

// Plugin is the anthropic plugin. It implements pluginsdk.Platform,
// pluginsdk.HTTP and pluginsdk.Initializer.
type Plugin struct {
	*pluginsdk.Router
	host pluginsdk.Host
	now  func() time.Time
}

// New returns the plugin.
func New() *Plugin {
	p := &Plugin{Router: pluginsdk.NewRouter(), now: time.Now}
	p.Handle("GET", "/models", p.listModels)
	return p
}

// Init implements pluginsdk.Initializer.
func (p *Plugin) Init(_ context.Context, h pluginsdk.Host) error {
	p.host = h
	return nil
}

// ---------------------------------------------------------------- credentials

// ValidateCredentials implements pluginsdk.Platform: the shared apikey.Spec
// validation, which normalizes api_key and base_url where they already live.
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return spec.Validate(in), nil
}

// endpointPath maps the upstream protocol (RequestMeta.protocol, which may
// differ from the client endpoint's protocol when the core converts the
// request) to the upstream path. An empty protocol means messages.
func endpointPath(protocol string) (string, error) {
	if protocol == "" {
		protocol = ProtocolMessages
	}
	path, err := anthropic.Path(protocol)
	if err != nil {
		return "", status.Errorf(codes.InvalidArgument, "%v", err)
	}
	return path, nil
}

func upstreamHeaders(apiKey string, inbound map[string]string) map[string]string {
	return anthropic.Headers(apiKey, inbound, forwardHeaders, DefaultAPIVersion)
}

// BuildUpstreamRequest implements pluginsdk.Platform. The upstream path
// follows meta.protocol (messages or count_tokens). The model is sent as
// received: the core applies the account's model mapping before calling
// this method.
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	acc := in.GetAccount()
	if t := acc.GetType(); t != "" && t != AccountTypeAPIKey {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: unsupported account type %q", acc.GetId(), t)
	}
	cfg, err := spec.FromAccount(acc)
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: %v", acc.GetId(), err)
	}
	if cfg.APIKey == "" {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: missing api_key", acc.GetId())
	}
	ep, err := endpointPath(in.GetMeta().GetProtocol())
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
// The response reports the model really used and names anthropic.messages as
// the protocol whose usage rules read the token counts.
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	acc := in.GetAccount()
	if t := acc.GetType(); t != "" && t != AccountTypeAPIKey {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: unsupported account type %q", acc.GetId(), t)
	}
	cfg, err := spec.FromAccount(acc)
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: %v", acc.GetId(), err)
	}
	model := strings.TrimSpace(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	body := anthropic.MessagesPingBody(model, 1)
	return &pluginv1.BuildTestRequestResponse{
		Method:        "POST",
		Url:           cfg.BaseURL + "/v1/messages",
		Headers:       upstreamHeaders(cfg.APIKey, nil),
		BodyJson:      body,
		Model:         model,
		UsageProtocol: "anthropic.messages",
	}, nil
}

// BuildModelsRequest implements pluginsdk.ModelLister: GET /v1/models.
func (p *Plugin) BuildModelsRequest(_ context.Context, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	acc := in.GetAccount()
	if t := acc.GetType(); t != "" && t != AccountTypeAPIKey {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: unsupported account type %q", acc.GetId(), t)
	}
	cfg, err := spec.FromAccount(acc)
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: %v", acc.GetId(), err)
	}
	return apikey.ModelListRequest(cfg, "/v1/models?limit=1000", "data.#.id", "", upstreamHeaders(cfg.APIKey, nil)), nil
}

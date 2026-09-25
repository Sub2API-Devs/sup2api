// Package gemini implements the Gemini plugin: the apikey account type for
// the built-in gemini platform (credential validation, upstream request
// construction, error classification). The gemini platform and its
// endpoints are built into the core (server/internal/platforms); this
// plugin declares none.
package gemini

import (
	"context"
	"encoding/json"
	"net/url"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/apikey"
)

// PlatformID is the built-in platform the apikey account type serves.
const PlatformID = "gemini"

// Protocol ids of the built-in gemini platform's endpoints.
const (
	ProtocolGenerate       = "gemini.generate"
	ProtocolStreamGenerate = "gemini.stream_generate"
	ProtocolCountTokens    = "gemini.count_tokens"
)

// Protocols lists the upstream protocols BuildUpstreamRequest supports, in
// the built-in platform's endpoint order.
var Protocols = []string{ProtocolGenerate, ProtocolStreamGenerate, ProtocolCountTokens}

const (
	// AccountTypeAPIKey is the only account type (manifest accountTypes).
	AccountTypeAPIKey = "apikey"
	// DefaultBaseURL is used when an account has no base_url.
	DefaultBaseURL = "https://generativelanguage.googleapis.com"
	// DefaultTestModel is used by BuildTestRequest when no model is given.
	DefaultTestModel = "gemini-2.5-flash-lite"
)

// spec describes the apikey account type; a trailing /v1beta (or /v1) of
// base_url is removed.
var spec = apikey.Spec{AccountType: AccountTypeAPIKey, DefaultBaseURL: DefaultBaseURL, StripSuffixes: []string{"/v1beta", "/v1"}}

// forwardHeaders are client headers (lower-case, the built-in gemini
// platform's passHeaders) copied verbatim to the upstream request.
var forwardHeaders = []string{"user-agent", "x-goog-api-client"}

// ForwardHeaders returns the client headers copied to the upstream request.
func ForwardHeaders() []string { return append([]string(nil), forwardHeaders...) }

// Plugin is the gemini plugin. It implements pluginsdk.Platform.
type Plugin struct {
	now func() time.Time
}

// New returns the plugin.
func New() *Plugin { return &Plugin{now: time.Now} }

// ValidateCredentials implements pluginsdk.Platform.
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return spec.Validate(in), nil
}

// action maps the upstream protocol to the model method and whether the
// response is streamed. An empty protocol means generateContent.
func action(protocol string) (method string, stream bool, err error) {
	switch protocol {
	case ProtocolGenerate, "":
		return "generateContent", false, nil
	case ProtocolStreamGenerate:
		return "streamGenerateContent", true, nil
	case ProtocolCountTokens:
		return "countTokens", false, nil
	default:
		return "", false, status.Errorf(codes.InvalidArgument, "unsupported upstream protocol %q", protocol)
	}
}

// modelURL builds <base>/v1beta/models/<model>:<method>; streaming always
// asks for SSE (alt=sse): the gateway re-frames the stream for clients that
// did not ask for it (CONTRACTS 14.1).
func modelURL(base, model, method string, stream bool) string {
	u := base + "/v1beta/models/" + url.PathEscape(model) + ":" + method
	if stream {
		u += "?alt=sse"
	}
	return u
}

// normalizeModel strips a "models/" prefix (the resource name form).
func normalizeModel(m string) string {
	return strings.TrimPrefix(strings.TrimSpace(m), "models/")
}

func upstreamHeaders(apiKey string, inbound map[string]string) map[string]string {
	h := map[string]string{
		"x-goog-api-key": apiKey,
		"content-type":   "application/json",
	}
	apikey.ForwardHeaders(h, inbound, forwardHeaders)
	return h
}

// BuildUpstreamRequest implements pluginsdk.Platform. The model comes from
// meta.model (the endpoint's path parameter, or the converted request's
// model; the core applies the account's model mapping before calling this
// method) and is sent as received; the method follows meta.protocol. The
// body is forwarded unchanged.
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	cfg, err := spec.FromAccount(in.GetAccount())
	if err != nil {
		return nil, err
	}
	method, stream, err := action(in.GetMeta().GetProtocol())
	if err != nil {
		return nil, err
	}
	model := normalizeModel(in.GetMeta().GetModel())
	if model == "" {
		return nil, status.Error(codes.InvalidArgument, "model is required (path /v1beta/models/{model}:...)")
	}
	return &pluginv1.BuildUpstreamRequestResponse{
		Method:        "POST",
		Url:           modelURL(cfg.BaseURL, model, method, stream),
		Headers:       upstreamHeaders(cfg.APIKey, in.GetInboundHeaders()),
		UpstreamModel: model,
	}, nil
}

// BuildTestRequest implements pluginsdk.Platform: a one-token
// generateContent call.
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	cfg, err := spec.FromAccount(in.GetAccount())
	if err != nil {
		return nil, err
	}
	model := normalizeModel(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	body, _ := json.Marshal(map[string]any{
		"contents":         []any{map[string]any{"role": "user", "parts": []any{map[string]string{"text": "ping"}}}},
		"generationConfig": map[string]any{"maxOutputTokens": 1},
	})
	return &pluginv1.BuildTestRequestResponse{
		Method:   "POST",
		Url:      modelURL(cfg.BaseURL, model, "generateContent", false),
		Headers:  upstreamHeaders(cfg.APIKey, nil),
		BodyJson: string(body),
	}, nil
}

// BuildModelsRequest implements pluginsdk.ModelLister: GET /v1beta/models
// (ids come back as resource names "models/<id>").
func (p *Plugin) BuildModelsRequest(_ context.Context, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	cfg, err := spec.FromAccount(in.GetAccount())
	if err != nil {
		return nil, err
	}
	h := upstreamHeaders(cfg.APIKey, nil)
	delete(h, "content-type")
	return &pluginv1.BuildModelsRequestResponse{
		Method:      "GET",
		Url:         cfg.BaseURL + "/v1beta/models?pageSize=1000",
		Headers:     h,
		IdsPath:     "models.#.name",
		StripPrefix: "models/",
	}, nil
}

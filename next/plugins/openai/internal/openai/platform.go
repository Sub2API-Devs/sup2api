// Package openai implements the OpenAI plugin: the apikey account type for
// the built-in openai platform (credential validation, upstream request
// construction, error classification). The openai platform and its
// endpoints are built into the core (server/internal/platforms); this
// plugin declares none.
package openai

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/apikey"
)

// PlatformID is the built-in platform the apikey account type serves.
const PlatformID = "openai"

// Protocol ids of the built-in openai platform's endpoints.
const (
	ProtocolChat       = "openai.chat"
	ProtocolResponses  = "openai.responses"
	ProtocolEmbeddings = "openai.embeddings"
)

// Protocols lists the upstream protocols BuildUpstreamRequest supports, in
// the built-in platform's endpoint order.
var Protocols = []string{ProtocolChat, ProtocolResponses, ProtocolEmbeddings}

const (
	// AccountTypeAPIKey is the only account type (manifest accountTypes).
	AccountTypeAPIKey = "apikey"
	// DefaultBaseURL is used when an account has no base_url.
	DefaultBaseURL = "https://api.openai.com"
	// DefaultTestModel is used by BuildTestRequest when no model is given.
	DefaultTestModel = "gpt-4o-mini"
)

// spec describes the apikey account type; a trailing /v1 of base_url is
// removed (users often paste the SDK base URL).
var spec = apikey.Spec{AccountType: AccountTypeAPIKey, DefaultBaseURL: DefaultBaseURL, StripSuffixes: []string{"/v1"}}

// forwardHeaders are client headers (lower-case, the built-in openai
// platform's passHeaders, which the apikey account type does not override)
// copied verbatim to the upstream request.
var forwardHeaders = []string{
	"openai-organization",
	"openai-project",
	"openai-beta",
	"user-agent",
	"x-stainless-arch",
	"x-stainless-lang",
	"x-stainless-os",
	"x-stainless-package-version",
	"x-stainless-retry-count",
	"x-stainless-runtime",
	"x-stainless-runtime-version",
	"x-stainless-timeout",
}

// ForwardHeaders returns the client headers copied to the upstream request.
func ForwardHeaders() []string { return append([]string(nil), forwardHeaders...) }

// Plugin is the openai plugin. It implements pluginsdk.Platform.
type Plugin struct {
	now func() time.Time
}

// New returns the plugin.
func New() *Plugin { return &Plugin{now: time.Now} }

// ValidateCredentials implements pluginsdk.Platform.
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return spec.Validate(in), nil
}

// upstreamPath maps the upstream protocol (RequestMeta.protocol, which may
// differ from the client endpoint's protocol when the core converts the
// request) to the upstream path. An empty protocol means chat completions.
func upstreamPath(protocol string) (string, error) {
	switch protocol {
	case ProtocolChat, "":
		return "/v1/chat/completions", nil
	case ProtocolResponses:
		return "/v1/responses", nil
	case ProtocolEmbeddings:
		return "/v1/embeddings", nil
	default:
		return "", status.Errorf(codes.InvalidArgument, "unsupported upstream protocol %q", protocol)
	}
}

func upstreamHeaders(apiKey string, inbound map[string]string) map[string]string {
	h := map[string]string{
		"authorization": "Bearer " + apiKey,
		"content-type":  "application/json",
	}
	apikey.ForwardHeaders(h, inbound, forwardHeaders)
	return h
}

// BuildUpstreamRequest implements pluginsdk.Platform. The upstream path
// follows meta.protocol. Streaming chat completions get
// stream_options.include_usage=true so the upstream reports usage in the
// last chunk (CONTRACTS 14.1).
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	cfg, err := spec.FromAccount(in.GetAccount())
	if err != nil {
		return nil, err
	}
	meta := in.GetMeta()
	ep, err := upstreamPath(meta.GetProtocol())
	if err != nil {
		return nil, err
	}
	model := meta.GetModel()
	if raw, ok := in.GetFields()["model"]; ok && raw != "" {
		var s string
		if json.Unmarshal([]byte(raw), &s) == nil && s != "" {
			model = s
		}
	}
	resp := &pluginv1.BuildUpstreamRequestResponse{
		Method:        "POST",
		Url:           cfg.BaseURL + ep,
		Headers:       upstreamHeaders(cfg.APIKey, in.GetInboundHeaders()),
		UpstreamModel: model,
	}
	if mapped := apikey.MapModel(cfg.ModelMapping, model); mapped != model {
		v, _ := json.Marshal(mapped)
		resp.Patches = append(resp.Patches, &pluginv1.BodyPatch{Op: pluginv1.BodyPatch_OP_SET, Path: "model", ValueJson: string(v)})
		resp.UpstreamModel = mapped
	}
	if meta.GetStream() && (meta.GetProtocol() == ProtocolChat || meta.GetProtocol() == "") {
		resp.Patches = append(resp.Patches, &pluginv1.BodyPatch{Op: pluginv1.BodyPatch_OP_SET, Path: "stream_options.include_usage", ValueJson: "true"})
	}
	return resp, nil
}

// BuildTestRequest implements pluginsdk.Platform: a one-token chat
// completion.
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	cfg, err := spec.FromAccount(in.GetAccount())
	if err != nil {
		return nil, err
	}
	model := strings.TrimSpace(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	model = apikey.MapModel(cfg.ModelMapping, model)
	body, _ := json.Marshal(map[string]any{
		"model":      model,
		"max_tokens": 1,
		"messages":   []map[string]string{{"role": "user", "content": "ping"}},
	})
	return &pluginv1.BuildTestRequestResponse{
		Method:   "POST",
		Url:      cfg.BaseURL + "/v1/chat/completions",
		Headers:  upstreamHeaders(cfg.APIKey, nil),
		BodyJson: string(body),
	}, nil
}

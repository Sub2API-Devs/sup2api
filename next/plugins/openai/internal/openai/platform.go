// Package openai implements the OpenAI plugin: the apikey account type for
// the built-in openai platform (credential validation, upstream request
// construction, error classification). The openai platform and its
// endpoints are built into the core (server/internal/platforms); this
// plugin declares none.
package openai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/apikey"
)

// PlatformID is the built-in platform the apikey account type serves.
const PlatformID = "openai"

// Protocol ids of the built-in openai platform's endpoints.
const (
	ProtocolChat      = "openai.chat"
	ProtocolResponses = "openai.responses"
	// ProtocolResponsesWS is the Responses WebSocket mode (GET /v1/responses
	// upgraded; one upstream WebSocket per client connection).
	ProtocolResponsesWS = "openai.responses_ws"
	ProtocolEmbeddings  = "openai.embeddings"
)

// Protocols lists the upstream protocols BuildUpstreamRequest supports, in
// the built-in platform's endpoint order.
var Protocols = []string{ProtocolChat, ProtocolResponses, ProtocolResponsesWS, ProtocolEmbeddings}

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
var spec = apikey.Spec{
	AccountType:    AccountTypeAPIKey,
	DefaultBaseURL: DefaultBaseURL,
	StripSuffixes:  []string{"/v1"},
	KeyValidator:   &apikey.OpenAI,
}

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
	var errs pluginsdk.FieldErrors
	if in.GetAccountType() != AccountTypeAPIKey {
		errs = errs.Add("account_type", "unsupported", fmt.Sprintf("unsupported account type %q / 不支持的账号类型", in.GetAccountType()))
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}, nil
	}
	creds, err := apikey.DecodeObject(in.GetCredentialsJson())
	if err != nil {
		errs = errs.Add("", "invalid_json", "credentials must be a JSON object / 凭证必须是 JSON 对象")
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}, nil
	}
	settings, err := apikey.DecodeObject(in.GetSettingsJson())
	if err != nil {
		errs = errs.Add("", "invalid_json", "settings must be a JSON object / 设置必须是 JSON 对象")
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}, nil
	}

	// api_key
	rawKey, _ := apikey.Lookup("api_key", creds, settings)
	key, isString := rawKey.(string)
	key = strings.TrimSpace(key)
	switch {
	case rawKey == nil || (isString && key == ""):
		errs = errs.Add("api_key", "required", "API key is required / 请填写 API Key")
	case !isString:
		errs = errs.Add("api_key", "pattern", "API key must be a string / api_key 必须是字符串")
	default:
		if _, fieldErr := spec.KeyValidator.Check(key); fieldErr != nil {
			errs = append(errs, fieldErr)
		}
	}

	// base_url
	baseURL := DefaultBaseURL
	if v, ok := apikey.Lookup("base_url", settings, creds); ok {
		s, isStr := v.(string)
		if !isStr {
			errs = errs.Add("base_url", "type", "base_url must be a string / base_url 必须是字符串")
		} else if n, err := apikey.NormalizeBaseURL(s, spec.StripSuffixes); err != nil {
			errs = errs.Add("base_url", "format", "base_url "+err.Error()+" / base_url 格式错误")
		} else {
			baseURL = n
		}
	}

	if len(errs) > 0 {
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}, nil
	}

	// Normalize each object in place, keeping its key set (unknown keys pass through untouched).
	normalize := func(obj map[string]any) string {
		if len(obj) == 0 {
			return ""
		}
		out := make(map[string]any, len(obj))
		for k, v := range obj {
			switch k {
			case "api_key":
				out[k] = key
			case "base_url":
				out[k] = baseURL
			default:
				out[k] = v
			}
		}
		b, _ := json.Marshal(out)
		return string(b)
	}

	return &pluginv1.ValidateCredentialsResponse{
		NormalizedCredentialsJson: normalize(creds),
		NormalizedSettingsJson:    normalize(settings),
	}, nil
}

// upstreamPath maps the upstream protocol (RequestMeta.protocol, which may
// differ from the client endpoint's protocol when the core converts the
// request) to the upstream path. An empty protocol means chat completions.
func upstreamPath(protocol string) (string, error) {
	switch protocol {
	case ProtocolChat, "":
		return "/v1/chat/completions", nil
	case ProtocolResponses, ProtocolResponsesWS:
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
// follows meta.protocol. The model is sent as received (the core applies
// the account's model mapping before calling this method). Streaming chat
// completions get stream_options.include_usage=true so the upstream
// reports usage in the last chunk (CONTRACTS 14.1).
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	acc := in.GetAccount()
	if t := acc.GetType(); t != "" && t != AccountTypeAPIKey {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: unsupported account type %q", acc.GetId(), t)
	}
	cfg, err := spec.FromAccount(acc)
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
	if meta.GetProtocol() == ProtocolResponsesWS {
		return webSocketRequest(resp)
	}
	if meta.GetStream() && (meta.GetProtocol() == ProtocolChat || meta.GetProtocol() == "") {
		resp.Patches = append(resp.Patches, &pluginv1.BodyPatch{Op: pluginv1.BodyPatch_OP_SET, Path: "stream_options.include_usage", ValueJson: "true"})
	}
	return resp, nil
}

// BuildTestRequest implements pluginsdk.Platform: a one-token chat
// completion. The response reports the model really used and names
// openai.chat as the protocol whose usage rules read the token counts.
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	acc := in.GetAccount()
	if t := acc.GetType(); t != "" && t != AccountTypeAPIKey {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: unsupported account type %q", acc.GetId(), t)
	}
	cfg, err := spec.FromAccount(acc)
	if err != nil {
		return nil, err
	}
	model := strings.TrimSpace(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	body, _ := json.Marshal(map[string]any{
		"model":      model,
		"max_tokens": 1,
		"messages":   []map[string]string{{"role": "user", "content": "ping"}},
	})
	return &pluginv1.BuildTestRequestResponse{
		Method:        "POST",
		Url:           cfg.BaseURL + "/v1/chat/completions",
		Headers:       upstreamHeaders(cfg.APIKey, nil),
		BodyJson:      string(body),
		Model:         model,
		UsageProtocol: "openai.chat",
	}, nil
}

// BuildModelsRequest implements pluginsdk.ModelLister: GET /v1/models.
func (p *Plugin) BuildModelsRequest(_ context.Context, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	cfg, err := spec.FromAccount(in.GetAccount())
	if err != nil {
		return nil, err
	}
	h := upstreamHeaders(cfg.APIKey, nil)
	delete(h, "content-type")
	return &pluginv1.BuildModelsRequestResponse{
		Method:  "GET",
		Url:     cfg.BaseURL + "/v1/models",
		Headers: h,
		IdsPath: "data.#.id",
	}, nil
}

// webSocketBeta opts the upstream connection into the Responses WebSocket
// mode, as the official clients do.
const webSocketBeta = "responses_websockets=2026-02-06"

// webSocketRequest turns the Responses request into the upstream WebSocket
// handshake: GET on the same path with a ws(s) scheme. The core dials it and
// relays the session; there is no body, so no content type and no patches.
// A client that already names a responses_websockets version keeps it.
func webSocketRequest(resp *pluginv1.BuildUpstreamRequestResponse) (*pluginv1.BuildUpstreamRequestResponse, error) {
	switch {
	case strings.HasPrefix(resp.Url, "https://"):
		resp.Url = "wss://" + strings.TrimPrefix(resp.Url, "https://")
	case strings.HasPrefix(resp.Url, "http://"):
		resp.Url = "ws://" + strings.TrimPrefix(resp.Url, "http://")
	default:
		return nil, status.Errorf(codes.InvalidArgument, "base_url %q has no http(s) scheme", resp.Url)
	}
	resp.Method = "GET"
	delete(resp.Headers, "content-type")
	switch beta := resp.Headers["openai-beta"]; {
	case beta == "":
		resp.Headers["openai-beta"] = webSocketBeta
	case !strings.Contains(beta, "responses_websockets="):
		resp.Headers["openai-beta"] = beta + "," + webSocketBeta
	}
	return resp, nil
}

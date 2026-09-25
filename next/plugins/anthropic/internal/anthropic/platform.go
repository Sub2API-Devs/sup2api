// Package anthropic implements the Anthropic plugin: the apikey account type
// for the built-in anthropic platform (credential validation, upstream
// request construction, error classification) and the model catalog admin
// route. The anthropic platform and its endpoints are built into the core
// (server/internal/platforms); this plugin declares none.
package anthropic

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// PlatformID is the built-in platform the apikey account type serves
// (manifest accountTypes[].platforms).
const PlatformID = "anthropic"

// Protocol ids of the built-in anthropic platform's endpoints.
const (
	ProtocolMessages    = "anthropic.messages"
	ProtocolCountTokens = "anthropic.count_tokens"
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
	DefaultAPIVersion = "2023-06-01"
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

// accountConfig is the merged view of an account's credentials and settings.
// Unknown keys (e.g. the legacy "model_mapping", now a core account field)
// are ignored.
type accountConfig struct {
	APIKey  string
	BaseURL string
}

// decodeObject parses a JSON object; empty input yields an empty map.
func decodeObject(raw string) (map[string]any, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return map[string]any{}, nil
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return nil, err
	}
	if m == nil {
		m = map[string]any{}
	}
	return m, nil
}

// lookup returns the first present value of key in the given objects.
func lookup(key string, objs ...map[string]any) (any, bool) {
	for _, o := range objs {
		if v, ok := o[key]; ok && v != nil {
			return v, true
		}
	}
	return nil, false
}

// normalizeBaseURL validates base_url and strips a trailing slash and "/v1".
func normalizeBaseURL(s string) (string, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return DefaultBaseURL, nil
	}
	u, err := url.Parse(s)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return "", fmt.Errorf("must be an absolute http(s) URL")
	}
	if u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return "", fmt.Errorf("must not contain credentials, query or fragment")
	}
	p := strings.TrimRight(u.Path, "/")
	p = strings.TrimSuffix(p, "/v1")
	u.Path = strings.TrimRight(p, "/")
	u.RawPath = ""
	return u.String(), nil
}

func validAPIKey(k string) bool {
	if len(k) < 8 || len(k) > 512 {
		return false
	}
	for _, r := range k {
		if r <= ' ' || r > '~' {
			return false
		}
	}
	return true
}

func parseAccount(credentialsJSON, settingsJSON string) (*accountConfig, error) {
	creds, err := decodeObject(credentialsJSON)
	if err != nil {
		return nil, fmt.Errorf("credentials: %w", err)
	}
	settings, err := decodeObject(settingsJSON)
	if err != nil {
		return nil, fmt.Errorf("settings: %w", err)
	}
	cfg := &accountConfig{}
	if v, ok := lookup("api_key", creds, settings); ok {
		cfg.APIKey, _ = v.(string)
	}
	base := ""
	if v, ok := lookup("base_url", settings, creds); ok {
		base, _ = v.(string)
	}
	if cfg.BaseURL, err = normalizeBaseURL(base); err != nil {
		return nil, fmt.Errorf("base_url: %w", err)
	}
	return cfg, nil
}

// ValidateCredentials implements pluginsdk.Platform.
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	var errs pluginsdk.FieldErrors
	if in.GetAccountType() != AccountTypeAPIKey {
		errs = errs.Add("account_type", "unsupported", fmt.Sprintf("unsupported account type %q / 不支持的账号类型", in.GetAccountType()))
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}, nil
	}
	creds, err := decodeObject(in.GetCredentialsJson())
	if err != nil {
		errs = errs.Add("", "invalid_json", "credentials must be a JSON object / 凭证必须是 JSON 对象")
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}, nil
	}
	settings, err := decodeObject(in.GetSettingsJson())
	if err != nil {
		errs = errs.Add("", "invalid_json", "settings must be a JSON object / 设置必须是 JSON 对象")
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}, nil
	}

	// api_key
	rawKey, _ := lookup("api_key", creds, settings)
	key, isString := rawKey.(string)
	key = strings.TrimSpace(key)
	switch {
	case rawKey == nil || (isString && key == ""):
		errs = errs.Add("api_key", "required", "API key is required / 请填写 API Key")
	case !isString || !validAPIKey(key):
		errs = errs.Add("api_key", "pattern", "API key must be 8-512 printable characters without spaces / API Key 须为 8-512 个不含空格的可见字符")
	}

	// base_url
	baseURL := DefaultBaseURL
	if v, ok := lookup("base_url", settings, creds); ok {
		s, isStr := v.(string)
		if !isStr {
			errs = errs.Add("base_url", "type", "base_url must be a string / base_url 必须是字符串")
		} else if n, err := normalizeBaseURL(s); err != nil {
			errs = errs.Add("base_url", "format", "base_url "+err.Error()+" / base_url 必须是不含账号、查询参数的 http(s) 地址")
		} else {
			baseURL = n
		}
	}

	if len(errs) > 0 {
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}, nil
	}

	// Normalize each object in place, keeping its key set (unknown keys,
	// including a legacy model_mapping, pass through untouched).
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

// endpointPath maps the upstream protocol (RequestMeta.protocol, which may
// differ from the client endpoint's protocol when the core converts the
// request) to the upstream path. An empty protocol means messages.
func endpointPath(protocol string) (string, error) {
	switch protocol {
	case ProtocolMessages, "":
		return "/v1/messages", nil
	case ProtocolCountTokens:
		return "/v1/messages/count_tokens", nil
	default:
		return "", status.Errorf(codes.InvalidArgument, "unsupported upstream protocol %q", protocol)
	}
}

func upstreamHeaders(apiKey string, inbound map[string]string) map[string]string {
	h := map[string]string{
		"x-api-key":         apiKey,
		"anthropic-version": DefaultAPIVersion,
		"content-type":      "application/json",
	}
	if v := strings.TrimSpace(inbound["anthropic-version"]); v != "" {
		h["anthropic-version"] = v
	}
	for _, name := range forwardHeaders {
		if v, ok := inbound[name]; ok && v != "" {
			h[name] = v
		}
	}
	return h
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
	cfg, err := parseAccount(acc.GetCredentialsJson(), acc.GetSettingsJson())
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
	model := in.GetMeta().GetModel()
	if raw, ok := in.GetFields()["model"]; ok && raw != "" {
		var s string
		if json.Unmarshal([]byte(raw), &s) == nil && s != "" {
			model = s
		}
	}
	return &pluginv1.BuildUpstreamRequestResponse{
		Method:        "POST",
		Url:           cfg.BaseURL + ep,
		Headers:       upstreamHeaders(cfg.APIKey, in.GetInboundHeaders()),
		UpstreamModel: model,
	}, nil
}

// BuildTestRequest implements pluginsdk.Platform.
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	acc := in.GetAccount()
	cfg, err := parseAccount(acc.GetCredentialsJson(), acc.GetSettingsJson())
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: %v", acc.GetId(), err)
	}
	if cfg.APIKey == "" {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: missing api_key", acc.GetId())
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
		Method:   "POST",
		Url:      cfg.BaseURL + "/v1/messages",
		Headers:  upstreamHeaders(cfg.APIKey, nil),
		BodyJson: string(body),
	}, nil
}

// BuildModelsRequest implements pluginsdk.ModelLister: GET /v1/models.
func (p *Plugin) BuildModelsRequest(_ context.Context, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	acc := in.GetAccount()
	cfg, err := parseAccount(acc.GetCredentialsJson(), acc.GetSettingsJson())
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: %v", acc.GetId(), err)
	}
	if cfg.APIKey == "" {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: missing api_key", acc.GetId())
	}
	h := upstreamHeaders(cfg.APIKey, nil)
	delete(h, "content-type")
	return &pluginv1.BuildModelsRequestResponse{
		Method:  "GET",
		Url:     cfg.BaseURL + "/v1/models?limit=1000",
		Headers: h,
		IdsPath: "data.#.id",
	}, nil
}

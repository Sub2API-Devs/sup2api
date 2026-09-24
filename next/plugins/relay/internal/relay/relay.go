// Package relay implements the "Claude relay" demo plugin: it declares one
// account type (relay_key) whose upstream is an Anthropic-compatible relay
// and that serves the core's built-in anthropic platform (manifest
// accountTypes[0].platforms, ARCHITECTURE 6.6), i.e. the anthropic.messages
// and anthropic.count_tokens endpoints. It declares no platform, no gateway
// endpoint and no price.
package relay

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"path"
	"sort"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// PlatformID is the built-in platform the relay_key account type serves.
const PlatformID = "anthropic"

// Protocols of the built-in anthropic platform, which relay_key speaks
// natively upstream.
const (
	ProtocolMessages    = "anthropic.messages"
	ProtocolCountTokens = "anthropic.count_tokens"
)

// Protocols lists the upstream protocols BuildUpstreamRequest supports.
var Protocols = []string{ProtocolMessages, ProtocolCountTokens}

const (
	// AccountTypeRelayKey is the only account type of the plugin.
	AccountTypeRelayKey = "relay_key"
	// DefaultAPIVersion is sent when the client did not send anthropic-version.
	DefaultAPIVersion = "2023-06-01"
	// DefaultTestModel is used by BuildTestRequest when no model is given.
	DefaultTestModel = "claude-haiku-4-5"
)

// PassHeaders are the client headers relay_key asks the host for (manifest
// accountTypes[0].platforms[0].passHeaders, overriding the anthropic
// platform default) and forwards.
var PassHeaders = []string{"anthropic-version", "anthropic-beta"}

// Plugin is the relay plugin. It implements pluginsdk.Platform.
type Plugin struct {
	now func() time.Time
}

// New returns the plugin.
func New() *Plugin { return &Plugin{now: time.Now} }

// ---------------------------------------------------------------- credentials

// accountConfig is the merged view of an account's credentials and settings.
type accountConfig struct {
	APIKey       string
	BaseURL      string
	ModelMapping map[string]string
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

// lookup returns the first present, non-null value of key.
func lookup(key string, objs ...map[string]any) (any, bool) {
	for _, o := range objs {
		if v, ok := o[key]; ok && v != nil {
			return v, true
		}
	}
	return nil, false
}

// parseModelMapping accepts an object {"from": "to"} or a string holding
// such a JSON object (textarea input).
func parseModelMapping(v any) (map[string]string, error) {
	switch t := v.(type) {
	case nil:
		return nil, nil
	case string:
		s := strings.TrimSpace(t)
		if s == "" {
			return nil, nil
		}
		var m map[string]string
		if err := json.Unmarshal([]byte(s), &m); err != nil {
			return nil, fmt.Errorf("must be a JSON object of model -> model")
		}
		return m, nil
	case map[string]any:
		m := make(map[string]string, len(t))
		for k, val := range t {
			s, ok := val.(string)
			if !ok {
				return nil, fmt.Errorf("value for %q must be a string", k)
			}
			m[k] = s
		}
		return m, nil
	default:
		return nil, fmt.Errorf("must be an object of model -> model")
	}
}

// normalizeBaseURL validates base_url (required) and strips a trailing slash
// and "/v1".
func normalizeBaseURL(s string) (string, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", fmt.Errorf("is required")
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

func parseAccount(acc *pluginv1.Account) (*accountConfig, error) {
	if t := acc.GetType(); t != "" && t != AccountTypeRelayKey {
		return nil, fmt.Errorf("unsupported account type %q", t)
	}
	creds, err := decodeObject(acc.GetCredentialsJson())
	if err != nil {
		return nil, fmt.Errorf("credentials: %w", err)
	}
	settings, err := decodeObject(acc.GetSettingsJson())
	if err != nil {
		return nil, fmt.Errorf("settings: %w", err)
	}
	cfg := &accountConfig{}
	if v, ok := lookup("api_key", creds, settings); ok {
		cfg.APIKey, _ = v.(string)
	}
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("missing api_key")
	}
	base := ""
	if v, ok := lookup("base_url", settings, creds); ok {
		base, _ = v.(string)
	}
	if cfg.BaseURL, err = normalizeBaseURL(base); err != nil {
		return nil, fmt.Errorf("base_url %v", err)
	}
	if v, ok := lookup("model_mapping", settings, creds); ok {
		if cfg.ModelMapping, err = parseModelMapping(v); err != nil {
			return nil, fmt.Errorf("model_mapping: %w", err)
		}
	}
	return cfg, nil
}

// ValidateCredentials implements pluginsdk.Platform.
func (p *Plugin) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	var errs pluginsdk.FieldErrors
	if in.GetAccountType() != AccountTypeRelayKey {
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

	// base_url (required)
	var baseURL string
	rawBase, _ := lookup("base_url", settings, creds)
	switch s, isStr := rawBase.(string); {
	case rawBase == nil || (isStr && strings.TrimSpace(s) == ""):
		errs = errs.Add("base_url", "required", "Base URL of the relay is required / 请填写中转站的 Base URL")
	case !isStr:
		errs = errs.Add("base_url", "type", "base_url must be a string / base_url 必须是字符串")
	default:
		if n, err := normalizeBaseURL(s); err != nil {
			errs = errs.Add("base_url", "format", "base_url "+err.Error()+" / base_url 必须是不含账号、查询参数的 http(s) 地址")
		} else {
			baseURL = n
		}
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

	// model_mapping (optional)
	var mapping map[string]string
	if v, ok := lookup("model_mapping", settings, creds); ok {
		m, err := parseModelMapping(v)
		if err != nil {
			errs = errs.Add("model_mapping", "format", "model_mapping "+err.Error()+" / 模型映射必须是\"模型 -> 模型\"的对象")
		} else {
			for from, to := range m {
				if strings.TrimSpace(from) == "" || strings.TrimSpace(to) == "" {
					errs = errs.Add("model_mapping", "empty", "model names in model_mapping must not be empty / 模型映射中的模型名不能为空")
					break
				}
				if _, err := path.Match(from, ""); err != nil {
					errs = errs.Add("model_mapping", "pattern", fmt.Sprintf("invalid pattern %q / 无效的通配符", from))
					break
				}
			}
			mapping = m
		}
	}
	if len(errs) > 0 {
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}, nil
	}

	// Normalize each object in place, keeping its key set.
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
			case "model_mapping":
				if mapping == nil {
					out[k] = map[string]string{}
				} else {
					out[k] = mapping
				}
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

// ---------------------------------------------------------------- requests

// mapModel applies the account model mapping: exact match first, then the
// longest matching glob pattern.
func mapModel(mapping map[string]string, model string) string {
	if model == "" || len(mapping) == 0 {
		return model
	}
	if to, ok := mapping[model]; ok && to != "" {
		return to
	}
	patterns := make([]string, 0, len(mapping))
	for from := range mapping {
		if strings.ContainsAny(from, "*?[") {
			patterns = append(patterns, from)
		}
	}
	sort.Slice(patterns, func(i, j int) bool {
		if len(patterns[i]) != len(patterns[j]) {
			return len(patterns[i]) > len(patterns[j])
		}
		return patterns[i] < patterns[j]
	})
	for _, from := range patterns {
		if ok, _ := path.Match(from, model); ok && mapping[from] != "" {
			return mapping[from]
		}
	}
	return model
}

// upstreamPath maps the upstream protocol (RequestMeta.protocol) to the
// relay path.
func upstreamPath(protocol string) (string, error) {
	switch protocol {
	case ProtocolMessages:
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
	for _, name := range PassHeaders {
		if v := strings.TrimSpace(inbound[name]); v != "" {
			h[name] = v
		}
	}
	return h
}

// BuildUpstreamRequest implements pluginsdk.Platform: POST
// {base_url}/v1/messages or {base_url}/v1/messages/count_tokens depending on
// meta.protocol, authenticated with x-api-key.
func (p *Plugin) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	acc := in.GetAccount()
	cfg, err := parseAccount(acc)
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: %v", acc.GetId(), err)
	}
	ep, err := upstreamPath(in.GetMeta().GetProtocol())
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
	resp := &pluginv1.BuildUpstreamRequestResponse{
		Method:        "POST",
		Url:           cfg.BaseURL + ep,
		Headers:       upstreamHeaders(cfg.APIKey, in.GetInboundHeaders()),
		UpstreamModel: model,
	}
	if mapped := mapModel(cfg.ModelMapping, model); mapped != model {
		v, _ := json.Marshal(mapped)
		resp.Patches = append(resp.Patches, &pluginv1.BodyPatch{Op: pluginv1.BodyPatch_OP_SET, Path: "model", ValueJson: string(v)})
		resp.UpstreamModel = mapped
	}
	return resp, nil
}

// BuildTestRequest implements pluginsdk.Platform: a one-token messages call.
func (p *Plugin) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	acc := in.GetAccount()
	cfg, err := parseAccount(acc)
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: %v", acc.GetId(), err)
	}
	model := strings.TrimSpace(in.GetModel())
	if model == "" {
		model = DefaultTestModel
	}
	model = mapModel(cfg.ModelMapping, model)
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

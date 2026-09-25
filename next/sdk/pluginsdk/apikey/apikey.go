// Package apikey implements the credential handling shared by API-key
// account types: an "api_key" (sensitive) and an optional "base_url", each
// in the credentials or the settings object. Platform plugins use it for
// ValidateCredentials and to read an account in BuildUpstreamRequest.
//
// Model mapping is a core account field (CONTRACTS §18): the core rewrites
// the request model before calling the plugin. Unknown keys in the
// credentials or settings (including a legacy "model_mapping") are ignored
// and passed through untouched by Validate.
package apikey

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Spec describes one API-key account type.
type Spec struct {
	// AccountType is the account type id (manifest accountTypes[].id).
	AccountType string
	// DefaultBaseURL is used when an account has no base_url.
	DefaultBaseURL string
	// StripSuffixes are path suffixes removed from base_url (after trailing
	// slashes), e.g. "/v1", so users may paste an SDK base URL.
	StripSuffixes []string
}

// Config is the merged view of an account's credentials and settings.
type Config struct {
	APIKey  string
	BaseURL string // normalized, without trailing slash
}

// Fields of the account form.
const (
	FieldAPIKey  = "api_key"
	FieldBaseURL = "base_url"
)

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

// NormalizeBaseURL validates base_url and strips trailing slashes and the
// spec's suffixes. An empty value yields DefaultBaseURL.
func (s Spec) NormalizeBaseURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return s.DefaultBaseURL, nil
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return "", fmt.Errorf("must be an absolute http(s) URL")
	}
	if u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.ForceQuery {
		return "", fmt.Errorf("must not contain credentials, query or fragment")
	}
	p := strings.TrimRight(u.Path, "/")
	for _, suf := range s.StripSuffixes {
		if strings.HasSuffix(p, suf) {
			p = strings.TrimSuffix(p, suf)
			break
		}
	}
	u.Path = strings.TrimRight(p, "/")
	u.RawPath = ""
	return u.String(), nil
}

// ValidAPIKey reports whether k is 8-512 printable ASCII characters
// without spaces.
func ValidAPIKey(k string) bool {
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

// Parse merges credentials and settings (api_key is read from the
// credentials first, base_url from the settings first). Unknown keys are
// ignored.
func (s Spec) Parse(credentialsJSON, settingsJSON string) (*Config, error) {
	creds, err := decodeObject(credentialsJSON)
	if err != nil {
		return nil, fmt.Errorf("credentials: %w", err)
	}
	settings, err := decodeObject(settingsJSON)
	if err != nil {
		return nil, fmt.Errorf("settings: %w", err)
	}
	cfg := &Config{}
	if v, ok := lookup(FieldAPIKey, creds, settings); ok {
		cfg.APIKey, _ = v.(string)
		cfg.APIKey = strings.TrimSpace(cfg.APIKey)
	}
	base := ""
	if v, ok := lookup(FieldBaseURL, settings, creds); ok {
		base, _ = v.(string)
	}
	if cfg.BaseURL, err = s.NormalizeBaseURL(base); err != nil {
		return nil, fmt.Errorf("base_url: %w", err)
	}
	return cfg, nil
}

// FromAccount reads an account for BuildUpstreamRequest/BuildTestRequest.
// Errors are gRPC FailedPrecondition statuses (foreign account type,
// unreadable credentials, missing api_key).
func (s Spec) FromAccount(acc *pluginv1.Account) (*Config, error) {
	if t := acc.GetType(); t != "" && t != s.AccountType {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: unsupported account type %q", acc.GetId(), t)
	}
	cfg, err := s.Parse(acc.GetCredentialsJson(), acc.GetSettingsJson())
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: %v", acc.GetId(), err)
	}
	if cfg.APIKey == "" {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: missing api_key", acc.GetId())
	}
	return cfg, nil
}

// Validate implements ValidateCredentials: field errors (bilingual
// messages) or the normalized credentials and settings (each object keeps
// its key set; api_key trimmed, base_url normalized, other keys untouched).
func (s Spec) Validate(in *pluginv1.ValidateCredentialsRequest) *pluginv1.ValidateCredentialsResponse {
	var errs pluginsdk.FieldErrors
	if in.GetAccountType() != s.AccountType {
		errs = errs.Add("account_type", "unsupported", fmt.Sprintf("unsupported account type %q / 不支持的账号类型", in.GetAccountType()))
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}
	}
	creds, err := decodeObject(in.GetCredentialsJson())
	if err != nil {
		errs = errs.Add("", "invalid_json", "credentials must be a JSON object / 凭证必须是 JSON 对象")
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}
	}
	settings, err := decodeObject(in.GetSettingsJson())
	if err != nil {
		errs = errs.Add("", "invalid_json", "settings must be a JSON object / 设置必须是 JSON 对象")
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}
	}

	rawKey, _ := lookup(FieldAPIKey, creds, settings)
	key, isString := rawKey.(string)
	key = strings.TrimSpace(key)
	switch {
	case rawKey == nil || (isString && key == ""):
		errs = errs.Add(FieldAPIKey, "required", "API key is required / 请填写 API Key")
	case !isString || !ValidAPIKey(key):
		errs = errs.Add(FieldAPIKey, "pattern", "API key must be 8-512 printable characters without spaces / API Key 须为 8-512 个不含空格的可见字符")
	}

	baseURL := s.DefaultBaseURL
	if v, ok := lookup(FieldBaseURL, settings, creds); ok {
		str, isStr := v.(string)
		if !isStr {
			errs = errs.Add(FieldBaseURL, "type", "base_url must be a string / base_url 必须是字符串")
		} else if n, err := s.NormalizeBaseURL(str); err != nil {
			errs = errs.Add(FieldBaseURL, "format", "base_url "+err.Error()+" / base_url 必须是不含账号、查询参数的 http(s) 地址")
		} else {
			baseURL = n
		}
	}
	if len(errs) > 0 {
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}
	}

	normalize := func(obj map[string]any) string {
		if len(obj) == 0 {
			return ""
		}
		out := make(map[string]any, len(obj))
		for k, v := range obj {
			switch k {
			case FieldAPIKey:
				out[k] = key
			case FieldBaseURL:
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
	}
}

// ForwardHeaders copies the inbound headers named in names (lower-case)
// into dst when present and non-empty.
func ForwardHeaders(dst map[string]string, inbound map[string]string, names []string) {
	for _, name := range names {
		if v, ok := inbound[name]; ok && v != "" {
			dst[name] = v
		}
	}
}

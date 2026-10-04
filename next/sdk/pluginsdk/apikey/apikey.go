// Package apikey validates API keys in plugin ValidateCredentials: stripping
// whitespace, checking prefixes and rejecting keys with internal whitespace or
// obviously wrong shape. anthropic, relay and ccgateway share one validator;
// openai and gemini have their own prefix lists.
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

// Validator checks one API key format.
type Validator struct {
	// Prefixes are the accepted prefixes (e.g. "sk-ant-", "sk-relay-").
	// Empty = no prefix check.
	Prefixes []string
	// MinLength is the minimum total length after trimming (0 = no check).
	MinLength int
	// Field is the credentials field name, for error messages.
	Field string
}

// Check trims s, checks the prefix and length, and rejects keys containing
// internal whitespace. Returns the normalized key and an error to add to
// FieldErrors when invalid.
func (v Validator) Check(s string) (string, *pluginv1.FieldError) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", &pluginv1.FieldError{Field: v.Field, Code: "required", Message: v.Field + " is required / " + v.Field + " 不能为空"}
	}
	if v.MinLength > 0 && len(s) < v.MinLength {
		return "", &pluginv1.FieldError{Field: v.Field, Code: "too_short", Message: v.Field + " is too short / " + v.Field + " 长度不足"}
	}
	if len(v.Prefixes) > 0 {
		ok := false
		for _, p := range v.Prefixes {
			if strings.HasPrefix(s, p) {
				ok = true
				break
			}
		}
		if !ok {
			return "", &pluginv1.FieldError{Field: v.Field, Code: "invalid_prefix", Message: v.Field + " must start with a valid prefix / " + v.Field + " 前缀不正确"}
		}
	}
	if strings.ContainsAny(s, " \t\r\n") {
		return "", &pluginv1.FieldError{Field: v.Field, Code: "whitespace", Message: v.Field + " must not contain whitespace / " + v.Field + " 不能包含空格"}
	}
	return s, nil
}

// Anthropic accepts sk-ant-api03-* and sk-ant-sid01-* (session keys).
var Anthropic = Validator{
	Prefixes:  []string{"sk-ant-api03-", "sk-ant-sid01-"},
	MinLength: 20,
	Field:     "api_key",
}

// OpenAI accepts sk-* and sess-* (realtime session tokens).
var OpenAI = Validator{
	Prefixes:  []string{"sk-", "sess-"},
	MinLength: 10,
	Field:     "api_key",
}

// Gemini accepts AIza* keys.
var Gemini = Validator{
	Prefixes:  []string{"AIza"},
	MinLength: 20,
	Field:     "api_key",
}

// Config is the normalized account configuration extracted from credentials
// and settings JSON by Spec.FromAccount.
type Config struct {
	APIKey  string
	BaseURL string
}

// Spec describes an account type that uses api_key and optional base_url.
// It validates, normalizes, and extracts these fields from ValidateCredentialsRequest
// and Account protos.
type Spec struct {
	// AccountType is the expected account type (e.g. "apikey", "relay_key").
	AccountType string
	// DefaultBaseURL is used when base_url is empty or absent.
	DefaultBaseURL string
	// StripSuffixes are removed from the end of base_url (e.g. []string{"/v1"}).
	StripSuffixes []string
	// RequireBaseURL = true makes base_url mandatory (for relay).
	RequireBaseURL bool
	// KeyValidator checks the api_key. If nil, any 8-512 printable non-space
	// character string is accepted.
	KeyValidator *Validator
}

// Validate implements ValidateCredentials for the account type described by s.
func (s Spec) Validate(in *pluginv1.ValidateCredentialsRequest) *pluginv1.ValidateCredentialsResponse {
	var errs pluginsdk.FieldErrors
	if in.GetAccountType() != s.AccountType {
		errs = errs.Add("account_type", "unsupported", "unsupported account type / 不支持的账号类型")
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

	// api_key
	rawKey, _ := lookup("api_key", creds, settings)
	key, isString := rawKey.(string)
	key = strings.TrimSpace(key)
	switch {
	case rawKey == nil || (isString && key == ""):
		errs = errs.Add("api_key", "required", "API key is required / 请填写 API Key")
	case !isString:
		errs = errs.Add("api_key", "type", "api_key must be a string / api_key 必须是字符串")
	default:
		if s.KeyValidator != nil {
			if _, fieldErr := s.KeyValidator.Check(key); fieldErr != nil {
				errs = append(errs, fieldErr)
			}
		} else if !validAPIKey(key) {
			errs = errs.Add("api_key", "pattern", "API key must be 8-512 printable characters without spaces / API Key 须为 8-512 个不含空格的可见字符")
		}
	}

	// base_url
	var baseURL string
	rawBase, _ := lookup("base_url", settings, creds)
	baseStr, isStr := rawBase.(string)
	baseStr = strings.TrimSpace(baseStr)
	switch {
	case rawBase == nil || (isStr && baseStr == ""):
		if s.RequireBaseURL {
			errs = errs.Add("base_url", "required", "Base URL is required / 请填写 Base URL")
		} else {
			baseURL = s.DefaultBaseURL
		}
	case !isStr:
		errs = errs.Add("base_url", "type", "base_url must be a string / base_url 必须是字符串")
	default:
		if normalized, err := s.normalizeBaseURL(baseStr); err != nil {
			errs = errs.Add("base_url", "format", "base_url "+err.Error()+" / base_url 格式错误")
		} else {
			baseURL = normalized
		}
	}

	if len(errs) > 0 {
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}
	}

	// Return normalized credentials
	normalized, _ := json.Marshal(map[string]string{"api_key": key, "base_url": baseURL})
	return &pluginv1.ValidateCredentialsResponse{
		NormalizedCredentialsJson: string(normalized),
		NormalizedSettingsJson:    "{}",
	}
}

// FromAccount extracts and validates the api_key and base_url from an Account proto.
func (s Spec) FromAccount(acc *pluginv1.Account) (*Config, error) {
	if acc == nil {
		return nil, status.Error(codes.FailedPrecondition, "account required")
	}
	creds, err := decodeObject(acc.GetCredentialsJson())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid credentials JSON: %v", err)
	}
	settings, err := decodeObject(acc.GetSettingsJson())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid settings JSON: %v", err)
	}

	cfg := &Config{}
	if v, ok := lookup("api_key", creds, settings); ok {
		cfg.APIKey, _ = v.(string)
	}
	cfg.APIKey = strings.TrimSpace(cfg.APIKey)
	if cfg.APIKey == "" {
		return nil, status.Error(codes.InvalidArgument, "missing api_key")
	}

	base := ""
	if v, ok := lookup("base_url", settings, creds); ok {
		base, _ = v.(string)
	}
	if cfg.BaseURL, err = s.normalizeBaseURL(strings.TrimSpace(base)); err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid base_url: %v", err)
	}
	if cfg.BaseURL == "" && s.RequireBaseURL {
		return nil, status.Error(codes.InvalidArgument, "base_url is required")
	}
	if cfg.BaseURL == "" {
		cfg.BaseURL = s.DefaultBaseURL
	}

	return cfg, nil
}

func (s Spec) normalizeBaseURL(baseStr string) (string, error) {
	if baseStr == "" {
		if s.RequireBaseURL {
			return "", fmt.Errorf("is required")
		}
		return s.DefaultBaseURL, nil
	}
	return NormalizeBaseURL(baseStr, s.StripSuffixes)
}

// NormalizeBaseURL validates and normalizes a base URL, stripping the given suffixes.
// Returns an error if baseStr is empty.
func NormalizeBaseURL(baseStr string, stripSuffixes []string) (string, error) {
	if baseStr == "" {
		return "", fmt.Errorf("is required")
	}
	u, err := url.Parse(baseStr)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return "", fmt.Errorf("must be an absolute http(s) URL")
	}
	if u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return "", fmt.Errorf("must not contain credentials, query or fragment")
	}
	p := strings.TrimRight(u.Path, "/")
	for _, suffix := range stripSuffixes {
		p = strings.TrimSuffix(p, suffix)
	}
	u.Path = strings.TrimRight(p, "/")
	u.RawPath = ""
	return u.String(), nil
}

// ForwardHeaders copies the specified headers from inbound to out.
// Header names are case-insensitive (normalized to lower-case).
func ForwardHeaders(out, inbound map[string]string, headers []string) {
	for _, key := range headers {
		if value := strings.TrimSpace(inbound[key]); value != "" {
			out[key] = value
		}
	}
}

// Helper functions

// DecodeObject parses a JSON string into a map. An empty string yields an empty map.
func DecodeObject(raw string) (map[string]any, error) {
	return decodeObject(raw)
}

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

// Lookup searches for a key in the given maps in order and returns the first non-nil value.
func Lookup(key string, objs ...map[string]any) (any, bool) {
	return lookup(key, objs...)
}

func lookup(key string, objs ...map[string]any) (any, bool) {
	for _, o := range objs {
		if v, ok := o[key]; ok && v != nil {
			return v, true
		}
	}
	return nil, false
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

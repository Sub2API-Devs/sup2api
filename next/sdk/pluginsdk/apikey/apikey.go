// Package apikey validates API keys in plugin ValidateCredentials: stripping
// whitespace, checking prefixes and rejecting keys with internal whitespace or
// obviously wrong shape. Spec.Validate is the one implementation of the
// api_key + base_url credential form (anthropic, openai, gemini, relay and
// volcengine use it); Spec.Texts only overrides the wording each plugin shipped.
package apikey

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
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

// OpenAI accepts sk-* and sess-* (realtime session tokens). It is the only
// preset in force: the anthropic and relay account types declare validators of
// their own (see their Spec), because the account forms accept any 8-512
// printable characters (CONTRACTS §21.3) and a stricter prefix rule would
// reject keys those forms accept.
var OpenAI = Validator{
	Prefixes:  []string{"sk-", "sess-"},
	MinLength: 10,
	Field:     "api_key",
}

// Config is the normalized account configuration extracted from credentials
// and settings JSON by Spec.FromAccount.
type Config struct {
	APIKey  string
	BaseURL string
}

// Texts overrides the wording of a few Spec.Validate field errors. An empty
// field keeps the SDK text. The console renders these strings verbatim and the
// built-in plugins shipped their own wording before this helper existed; the
// validation rules are the same either way.
//
// A message is plain text with named placeholders, never a printf template: a
// message containing a bare percent sign ("100%") comes out unchanged, and an
// unknown placeholder is left as it is.
type Texts struct {
	// UnsupportedAccountType is the account_type message; "{type}" is replaced
	// by the received account type, Go-quoted as %q used to quote it.
	UnsupportedAccountType string
	// KeyNotString, when set, reports a non-string api_key with this message
	// instead of the SDK's own type message.
	KeyNotString string
	// KeyNotStringCode is the code reported with KeyNotString. Default
	// "pattern" (the code this helper has always used for that message);
	// plugins that keep the SDK's "type" code set it explicitly.
	KeyNotStringCode string
	// BaseURLRequired is the message of a missing base_url when
	// RequireBaseURL is set.
	BaseURLRequired string
	// BaseURLFormat is the base_url format message; "{reason}" is replaced by
	// the reason.
	BaseURLFormat string
}

// placeholder replaces one named placeholder in a Texts message. It never
// interprets the surrounding text as a format string.
func placeholder(msg, name, value string) string {
	return strings.ReplaceAll(msg, "{"+name+"}", value)
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
	// Texts overrides the wording of a few field errors (see Texts).
	Texts Texts
}

// Validate implements ValidateCredentials for the account type described by s.
func (s Spec) Validate(in *pluginv1.ValidateCredentialsRequest) *pluginv1.ValidateCredentialsResponse {
	var errs pluginsdk.FieldErrors
	if in.GetAccountType() != s.AccountType {
		msg := s.Texts.UnsupportedAccountType
		if msg == "" {
			msg = "unsupported account type / 不支持的账号类型"
		} else {
			msg = placeholder(msg, "type", strconv.Quote(in.GetAccountType()))
		}
		errs = errs.Add("account_type", "unsupported", msg)
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

	key, errs := s.validateKey(errs, creds, settings)
	baseURL, errs := s.validateBaseURL(errs, creds, settings)
	if len(errs) > 0 {
		return &pluginv1.ValidateCredentialsResponse{Errors: errs}
	}

	// Normalize each object in place: api_key and base_url are rewritten
	// where they are, every other key passes through untouched (CONTRACTS
	// §18: a legacy model_mapping, plugin-specific settings). Moving
	// base_url from settings into credentials would take it out of reach of
	// the core's guardedSettings check and the console form. An empty object
	// stays empty: "" tells the core to keep what it has.
	return &pluginv1.ValidateCredentialsResponse{
		NormalizedCredentialsJson: s.rewriteObject(creds, key, baseURL),
		NormalizedSettingsJson:    s.rewriteObject(settings, key, baseURL),
	}
}

// validateKey reads api_key from credentials then settings and returns the
// trimmed key. It appends exactly one api_key error when the key is unusable.
func (s Spec) validateKey(errs pluginsdk.FieldErrors, creds, settings map[string]any) (string, pluginsdk.FieldErrors) {
	rawKey, _ := lookup("api_key", creds, settings)
	key, isString := rawKey.(string)
	key = strings.TrimSpace(key)
	switch {
	case rawKey == nil || (isString && key == ""):
		return "", errs.Add("api_key", "required", "API key is required / 请填写 API Key")
	case !isString:
		if s.Texts.KeyNotString != "" {
			code := s.Texts.KeyNotStringCode
			if code == "" {
				code = "pattern"
			}
			return "", errs.Add("api_key", code, s.Texts.KeyNotString)
		}
		return "", errs.Add("api_key", "type", "api_key must be a string / api_key 必须是字符串")
	}
	if s.KeyValidator != nil {
		if _, fieldErr := s.KeyValidator.Check(key); fieldErr != nil {
			return "", append(errs, fieldErr)
		}
	} else if !validAPIKey(key) {
		return "", errs.Add("api_key", "pattern", "API key must be 8-512 printable characters without spaces / API Key 须为 8-512 个不含空格的可见字符")
	}
	return key, errs
}

// validateBaseURL reads base_url from settings then credentials and returns
// the normalized URL (s.DefaultBaseURL when absent).
func (s Spec) validateBaseURL(errs pluginsdk.FieldErrors, creds, settings map[string]any) (string, pluginsdk.FieldErrors) {
	rawBase, _ := lookup("base_url", settings, creds)
	baseStr, isStr := rawBase.(string)
	baseStr = strings.TrimSpace(baseStr)
	switch {
	case rawBase == nil || (isStr && baseStr == ""):
		if s.RequireBaseURL {
			msg := s.Texts.BaseURLRequired
			if msg == "" {
				msg = "Base URL is required / 请填写 Base URL"
			}
			return "", errs.Add("base_url", "required", msg)
		}
		return s.DefaultBaseURL, errs
	case !isStr:
		return "", errs.Add("base_url", "type", "base_url must be a string / base_url 必须是字符串")
	}
	normalized, err := s.normalizeBaseURL(baseStr)
	if err != nil {
		msg := s.Texts.BaseURLFormat
		if msg == "" {
			msg = "base_url {reason} / base_url 格式错误"
		}
		return "", errs.Add("base_url", "format", placeholder(msg, "reason", err.Error()))
	}
	return normalized, errs
}

// rewriteObject re-encodes obj with api_key and base_url normalized where the
// key already exists; an empty object stays empty ("" keeps the core's value).
func (s Spec) rewriteObject(obj map[string]any, key, baseURL string) string {
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
	if strings.TrimSpace(baseStr) == "" {
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
	baseStr = strings.TrimSpace(baseStr)
	if baseStr == "" {
		return "", fmt.Errorf("is required")
	}
	u, err := url.Parse(baseStr)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return "", fmt.Errorf("must be an absolute http(s) URL")
	}
	if u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.ForceQuery {
		return "", fmt.Errorf("must not contain credentials, query or fragment")
	}
	p := strings.TrimRight(u.Path, "/")
	// Only the first matching suffix: "/x/v1/v1beta" with /v1beta, /v1 is
	// "/x/v1", not "/x".
	for _, suffix := range stripSuffixes {
		if strings.HasSuffix(p, suffix) {
			p = strings.TrimSuffix(p, suffix)
			break
		}
	}
	u.Path = strings.TrimRight(p, "/")
	u.RawPath = ""
	return u.String(), nil
}

// ModelList describes a model listing request: the path on base_url (with
// whatever page size the upstream expects, e.g. "/v1/models?limit=1000"), where
// the ids sit in the answer, and the prefix to strip from each id.
type ModelList struct {
	// Path is appended to the account's base_url.
	Path string
	// IdsPath is the gjson path of the model ids in the response.
	IdsPath string
	// StripPrefix is removed from the front of every id ("models/" for
	// Gemini's resource names).
	StripPrefix string
}

// ModelListRequest builds the GET a plugin's BuildModelsRequest returns: a
// model listing on base_url + list.Path, with the request's headers minus
// content-type (nothing is sent in the body). headers is the map
// upstreamHeaders just built; it is copied, never modified, so a caller may
// reuse its header map.
func ModelListRequest(cfg *Config, list ModelList, headers map[string]string) *pluginv1.BuildModelsRequestResponse {
	h := make(map[string]string, len(headers))
	for k, v := range headers {
		if !strings.EqualFold(k, "content-type") {
			h[k] = v
		}
	}
	return &pluginv1.BuildModelsRequestResponse{
		Method:      "GET",
		Url:         cfg.BaseURL + list.Path,
		Headers:     h,
		IdsPath:     list.IdsPath,
		StripPrefix: list.StripPrefix,
	}
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

// DecodeObject parses a JSON string into a map. An empty string (or "null")
// yields an empty map, which is what a form posting nothing looks like.
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

// Lookup searches the given maps in order and returns the first non-nil value
// of key (the same precedence Spec.Validate applies).
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

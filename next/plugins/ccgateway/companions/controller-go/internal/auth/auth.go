// Package auth is the account credential check and its fingerprint (Python
// manager.environment_value, authentication, auth_fingerprint; behaviour V5,
// V6, PV3, RB3). The fingerprint is HMAC-SHA256 over Python's
// json.dumps(identity, sort_keys=True) and is compared with the label of
// every existing account container: it must match Python byte for byte, or
// the first configuration after an upgrade recreates every account.
//
// FROZEN.
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"strings"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/pyjson"
)

// Modes.
const (
	ModeOAuth  = "oauth"
	ModeAPIKey = "api_key"
)

// DefaultBaseURL is the API key mode's default base URL.
const DefaultBaseURL = "https://api.anthropic.com"

var (
	locale   = regexp.MustCompile(`^(?:C|POSIX|[A-Za-z]{2,3}(?:_[A-Za-z0-9]{2,8}){0,2})(?:\.[A-Za-z0-9-]{1,16})?(?:@[A-Za-z0-9]{1,16})?$`)
	timezone = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_+-]{0,63}(?:/[A-Za-z0-9][A-Za-z0-9_+-]{0,63}){0,3}$`)
)

// Auth is a normalised authentication, as Python's dict:
// {"mode": "oauth", locale?, timezone?} or
// {"mode": "api_key", "api_key", "base_url", locale?, timezone?}.
type Auth struct {
	Mode     string
	APIKey   string
	BaseURL  string
	Locale   string // "" when not set
	Timezone string // "" when not set
}

// PyValue is the dict authentication() returns, in its key order.
func (a Auth) PyValue() any {
	o := pyjson.Ordered{{Key: "mode", Value: a.Mode}}
	if a.Mode == ModeAPIKey {
		o = append(o, pyjson.KV{Key: "api_key", Value: a.APIKey}, pyjson.KV{Key: "base_url", Value: a.BaseURL})
	}
	if a.Locale != "" {
		o = append(o, pyjson.KV{Key: "locale", Value: a.Locale})
	}
	if a.Timezone != "" {
		o = append(o, pyjson.KV{Key: "timezone", Value: a.Timezone})
	}
	return o
}

// identity is the fingerprinted part: without locale and timezone.
func (a Auth) identity() pyjson.Ordered {
	o := pyjson.Ordered{{Key: "mode", Value: a.Mode}}
	if a.Mode == ModeAPIKey {
		o = append(o, pyjson.KV{Key: "api_key", Value: a.APIKey}, pyjson.KV{Key: "base_url", Value: a.BaseURL})
	}
	return o
}

// Fingerprint is auth_fingerprint(salt, auth): the hex HMAC-SHA256 keyed
// with the account's admin key over json.dumps(identity, sort_keys=True).
func Fingerprint(salt string, a Auth) string {
	mac := hmac.New(sha256.New, []byte(salt))
	mac.Write(pyjson.MustMarshalSorted(a.identity()))
	return hex.EncodeToString(mac.Sum(nil))
}

// EnvironmentValue is environment_value(key, value): a locale ("locale") or
// a timezone (any other key); "" is "not set".
func EnvironmentValue(key string, value any) (string, error) {
	pattern, limit := timezone, 128
	if key == "locale" {
		pattern, limit = locale, 64
	}
	s, ok := value.(string)
	if !ok || len([]rune(s)) > limit || s != "" && (!pattern.MatchString(s) || s == "Local") {
		return "", errs.New(errs.BadRequest, "invalid "+key)
	}
	return s, nil
}

// Parse is authentication(raw) for the decoded "auth" value (nil when absent).
func Parse(raw any) (Auth, error) {
	if raw == nil {
		raw = pyjson.Ordered{{Key: "mode", Value: ModeOAuth}}
	}
	obj, ok := raw.(pyjson.Ordered)
	if !ok {
		return Auth{}, errs.New(errs.BadRequest, "invalid authentication")
	}
	var a Auth
	var err error
	for _, key := range []string{"locale", "timezone"} {
		v, present := obj.Get(key)
		if !present {
			v = ""
		}
		val, verr := EnvironmentValue(key, v)
		if verr != nil {
			return Auth{}, verr
		}
		if key == "locale" {
			a.Locale = val
		} else {
			a.Timezone = val
		}
	}
	mode, _ := obj.Get("mode")
	if onlyKeys(obj, "mode", "locale", "timezone") && pyjson.Equal(mode, ModeOAuth) {
		a.Mode = ModeOAuth
		return a, nil
	}
	if !pyjson.Equal(mode, ModeAPIKey) || !onlyKeys(obj, "mode", "api_key", "base_url", "locale", "timezone") {
		return Auth{}, errs.New(errs.BadRequest, "invalid authentication")
	}
	keyValue, _ := obj.Get("api_key")
	key, ok := keyValue.(string)
	if !ok || len([]rune(key)) < 8 || len([]rune(key)) > 512 || !printable(key) {
		return Auth{}, errs.New(errs.BadRequest, "invalid API key")
	}
	var base any = DefaultBaseURL
	if v, _ := obj.Get("base_url"); pyjson.Truthy(v) {
		base = v
	}
	baseURL, ok := base.(string)
	if !ok || len([]rune(baseURL)) > 2048 || pyjson.HasSpace(baseURL) {
		return Auth{}, errs.New(errs.BadRequest, "invalid base URL")
	}
	u, err := pyjson.URLSplit(baseURL)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.HasUserinfo() ||
		strings.Contains(baseURL, "?") || strings.Contains(baseURL, "#") {
		return Auth{}, errs.New(errs.BadRequest, "invalid base URL")
	}
	baseURL = strings.TrimSuffix(strings.TrimRight(baseURL, "/"), "/v1")
	a.Mode, a.APIKey, a.BaseURL = ModeAPIKey, key, baseURL
	return a, nil
}

func onlyKeys(o pyjson.Ordered, allowed ...string) bool {
	for _, kv := range o {
		found := false
		for _, a := range allowed {
			if kv.Key == a {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// printable is every character in ASCII 33..126.
func printable(s string) bool {
	for _, r := range s {
		if r < 33 || r > 126 {
			return false
		}
	}
	return true
}

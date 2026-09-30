package volcengine

// Upstream path prefixes. Ark's OpenAI- and Anthropic-compatible surfaces sit
// under /api/v3 on the official endpoint, but a relay in front of Ark mounts
// the same shapes wherever it likes: the one this plugin was first verified
// against serves text at the root (/v1/chat/completions, /v1/messages) while
// keeping Ark's native video tasks under /doubao/api/v3. One fixed prefix
// cannot express that, so both are settings, and the video one falls back to
// the other.

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// prefixes are the two path prefixes of one account, already normalized.
type prefixes struct {
	api   string
	video string
}

// prefixesOf reads them from an account's settings. The zero value of either
// means "the default": api falls back to APIPrefix, video to api.
func prefixesOf(settingsJSON string) (prefixes, error) {
	settings, err := decodeJSONObject(settingsJSON)
	if err != nil {
		return prefixes{}, fmt.Errorf("settings: %w", err)
	}
	read := func(field string) (string, error) {
		v, ok := settings[field]
		if !ok || v == nil {
			return "", nil
		}
		s, isStr := v.(string)
		if !isStr {
			return "", fmt.Errorf("%s must be a string", field)
		}
		p, err := normalizePrefix(s)
		if err != nil {
			// Name the field. Two settings have the same rules, and an
			// operator reading "must start with /" in a log has no way to tell
			// which of them to go and fix.
			return "", fmt.Errorf("%s %w", field, err)
		}
		return p, nil
	}
	api, err := read(FieldAPIPrefix)
	if err != nil {
		return prefixes{}, err
	}
	video, err := read(FieldVideoAPIPrefix)
	if err != nil {
		return prefixes{}, err
	}
	if api == "" {
		api = APIPrefix
	}
	if video == "" {
		video = api
	}
	return prefixes{api: api, video: video}, nil
}

// normalizePrefix trims a prefix and rejects the shapes that would not stay a
// path. An empty result is legal and means "unset".
//
// This is not a blocklist of dangerous characters - those are always on the
// wrong side, and CONTRACTS §25.1 already records what that costs. It is a
// whitelist of one shape: a rooted path. The guarantee that a prefix cannot
// move the request to another host is enforced separately and unconditionally,
// by sameHost below, because this function only runs when an account is saved.
func normalizePrefix(raw string) (string, error) {
	p := strings.TrimSpace(raw)
	if p == "" {
		return "", nil
	}
	if len(p) > MaxPrefixLen {
		return "", fmt.Errorf("must be at most %d characters", MaxPrefixLen)
	}
	if !strings.HasPrefix(p, "/") {
		return "", fmt.Errorf("must start with %q", "/")
	}
	// "//host" is a protocol-relative URL, not a path: parsed after a base it
	// replaces the host entirely.
	if strings.HasPrefix(p, "//") {
		return "", fmt.Errorf("must not start with %q", "//")
	}
	if strings.ContainsAny(p, "?#") {
		return "", fmt.Errorf("must not contain a query or fragment")
	}
	for _, seg := range strings.Split(p, "/") {
		if seg == ".." {
			return "", fmt.Errorf("must not contain a %q segment", "..")
		}
	}
	return strings.TrimRight(p, "/"), nil
}

// validatePrefixFields reports the prefix settings an operator cannot have
// meant. It is the friendly half of the guarantee - the binding half is
// upstreamURL, which runs on every request.
func validatePrefixFields(errs pluginsdk.FieldErrors, settingsJSON string) pluginsdk.FieldErrors {
	obj, err := decodeJSONObject(settingsJSON)
	if err != nil {
		return errs.Add("", "type", err.Error()+" / 字段类型不正确")
	}
	for _, f := range []string{FieldAPIPrefix, FieldVideoAPIPrefix} {
		v, ok := obj[f]
		if !ok || v == nil {
			continue
		}
		s, isStr := v.(string)
		if !isStr {
			errs = errs.Add(f, "type", f+" must be a string / "+f+" 必须是字符串")
			continue
		}
		if _, err := normalizePrefix(s); err != nil {
			errs = errs.Add(f, "pattern", fmt.Sprintf(
				"%s %s / %s 必须是以 / 开头的路径前缀（如 /api/v3），留空表示使用默认值", f, err, f))
		}
	}
	return errs
}

// normalizePrefixFields rewrites the two prefix settings in place. An invalid
// value is left as the operator typed it: validatePrefixFields has already
// turned it into a field error, and silently storing a "fixed" version of
// something we refused would be worse than storing what was sent.
func normalizePrefixFields(objJSON string) string {
	obj, err := decodeJSONObject(objJSON)
	if err != nil || len(obj) == 0 {
		return objJSON
	}
	changed := false
	for _, f := range []string{FieldAPIPrefix, FieldVideoAPIPrefix} {
		v, ok := obj[f]
		if !ok {
			continue
		}
		s, isStr := v.(string)
		if !isStr {
			continue
		}
		n, err := normalizePrefix(s)
		if err != nil {
			continue
		}
		obj[f] = n
		changed = true
	}
	if !changed {
		return objJSON
	}
	b, err := json.Marshal(obj)
	if err != nil {
		return objJSON
	}
	return string(b)
}

// upstreamURL joins a normalized base URL with a path and returns it only if
// the result is still the same scheme and host.
//
// This is the actual security boundary of the two prefix settings. base_url is
// restricted by guardedSettings (CONTRACTS §21.3) to the official endpoints
// unless the caller holds account:settings:custom - but guardedSettings is a
// URL allow-list (check/validate.go requires every allowed entry to be an
// absolute http(s) URL) and therefore cannot guard a path. A free-text prefix
// of "@evil.com/v3" appended to "https://ark.cn-beijing.volces.com" parses
// with host evil.com, the first half demoted to userinfo: the restriction is
// bypassed and the account's key goes elsewhere. netguard.CheckURL does not
// help, because it asks "is this host private", not "is this the host we
// meant".
//
// So the check is not on the prefix, it is on the answer: parse what we are
// about to send and require the origin we started from. Anything a future
// prefix shape does that normalizePrefix did not foresee still cannot leave
// the host.
func upstreamURL(base, path string) (string, error) {
	b, err := url.Parse(base)
	if err != nil {
		return "", status.Errorf(codes.FailedPrecondition, "base_url is not a URL: %v", err)
	}
	full := base + path
	u, err := url.Parse(full)
	if err != nil {
		return "", status.Errorf(codes.InvalidArgument, "the upstream path is not a URL: %v", err)
	}
	if u.Scheme != b.Scheme || u.Host != b.Host {
		return "", status.Errorf(codes.InvalidArgument,
			"the upstream path would move the request to %s://%s, but this account's base URL is %s://%s; "+
				"check %s and %s", u.Scheme, u.Host, b.Scheme, b.Host, FieldAPIPrefix, FieldVideoAPIPrefix)
	}
	return full, nil
}

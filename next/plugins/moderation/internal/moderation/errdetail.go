package moderation

import (
	"errors"
	"net/url"
	"regexp"
	"strings"
	"unicode"
)

// errDetailRunes bounds the error text a trace keeps (Outcome.ErrDetail).
const errDetailRunes = 200

var (
	// errURLRe: a URL in an error text (net/http quotes the request URL).
	errURLRe = regexp.MustCompile(`[a-zA-Z][a-zA-Z0-9+.-]*://[^\s"'<>]+`)
	// errAuthRe: an HTTP auth scheme and its credentials; the credentials
	// must look like a key (errLooksLikeKey), so "basic validation" stays.
	errAuthRe = regexp.MustCompile(`(?i)\b(bearer|basic)(\s+)([^\s"',;]+)`)
	// errKeyValueRe: a credential as name and value; the name may be
	// compound (refresh_token, client_secret, x-api-key).
	errKeyValueRe = regexp.MustCompile(`(?i)((?:^|[^a-z0-9])[\w-]*(?:token|secret|password|passwd|api[-_]?key|private[-_]?key|authorization))(["']?\s*[:=]\s*["']?)[^\s"',;&]+`)
	// errPrefixedKeyRe: keys with a well-known prefix (sk-…).
	errPrefixedKeyRe = regexp.MustCompile(`\b(?:sk|pk|rk|ak|key|tok|sess)[-_][A-Za-z0-9_-]{16,}`)
	// errTokenRe: a long run of key characters; cut when it mixes letters
	// and digits (a key, not a word or a path) and is not a UUID.
	errTokenRe = regexp.MustCompile(`[A-Za-z0-9_+=-]{32,}`)
	errUUIDRe  = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

// errDetail is what a trace keeps of a failed call's error text (§72.9,
// 0.11.2), next to its type (ErrType): only for network errors, whose text
// (the request URL, the proxy, the dial or handshake that failed) adds what
// the type cannot say. Every other error writes nothing: its type and
// status say it all, or its text may carry what the upstream returned and
// so echo user input (an upstream error body, an unparsable answer); the
// channel test and the try still show those texts, a stored record never.
// The text loses URLs' queries, fragments and user info, credentials and
// key-like strings, and is cut to errDetailRunes.
func errDetail(err error) string {
	var ne *networkError
	if !errors.As(err, &ne) {
		return ""
	}
	return truncateRunes(redactErrText(ne.err.Error()), errDetailRunes)
}

// redactErrText removes from an error text what must not be stored.
func redactErrText(s string) string {
	s = errURLRe.ReplaceAllStringFunc(s, func(raw string) string {
		u, err := url.Parse(raw)
		if err != nil {
			return "…"
		}
		u.User, u.RawQuery, u.ForceQuery, u.Fragment, u.RawFragment = nil, "", false, "", ""
		return u.String()
	})
	s = errAuthRe.ReplaceAllStringFunc(s, func(m string) string {
		g := errAuthRe.FindStringSubmatch(m)
		if !errLooksLikeKey(g[3]) {
			return m
		}
		return g[1] + g[2] + "…"
	})
	s = errKeyValueRe.ReplaceAllString(s, "$1$2…")
	s = errPrefixedKeyRe.ReplaceAllString(s, "…")
	return errTokenRe.ReplaceAllStringFunc(s, func(t string) string {
		if errUUIDRe.MatchString(t) || !strings.ContainsAny(t, "0123456789") || strings.IndexFunc(t, unicode.IsLetter) < 0 {
			return t
		}
		return "…"
	})
}

// errLooksLikeKey: credentials, not a word - a digit or a key character in
// it, or at least 20 characters.
func errLooksLikeKey(s string) bool {
	return len(s) >= 20 || strings.ContainsAny(s, "0123456789._~+/=-")
}

// describeErr fills the trace fields of a failed outcome.
func (o *Outcome) describeErr() {
	o.ErrType, o.Status, o.ErrDetail = ErrType(o.Err), upstreamStatus(o.Err), errDetail(o.Err)
}

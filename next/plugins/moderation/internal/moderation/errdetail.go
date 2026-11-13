package moderation

import (
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
	// errSecretRes: credentials (scheme or name with value) and prefixed keys.
	errSecretRes = []struct {
		re   *regexp.Regexp
		repl string
	}{
		{regexp.MustCompile(`(?i)\b(bearer|basic)\s+[^\s"',;]+`), "$1 …"},
		{regexp.MustCompile(`(?i)\b(authorization|proxy-authorization|x-api-key|api[-_]?key|access[-_]?token|token|secret|password|passwd)(["']?\s*[:=]\s*["']?)[^\s"',;&]+`), "$1$2…"},
		{regexp.MustCompile(`\b(sk|pk|rk|ak|key|tok|sess)[-_][A-Za-z0-9_-]{16,}`), "…"},
	}
	// errTokenRe: a long run of key characters; cut when it mixes letters
	// and digits (a key, not a word or a path).
	errTokenRe = regexp.MustCompile(`[A-Za-z0-9_+=-]{32,}`)
)

// errDetail is the text of a failed call as a trace may keep it (§72.9,
// 0.11.2): URLs lose their query, fragment and user info, credentials and
// token-like strings are cut, at most errDetailRunes. An upstream error is
// its status line: its body may echo user input (UpstreamError).
func errDetail(err error) string {
	if err == nil {
		return ""
	}
	s := errURLRe.ReplaceAllStringFunc(err.Error(), func(raw string) string {
		u, perr := url.Parse(raw)
		if perr != nil {
			return "…"
		}
		u.User, u.RawQuery, u.ForceQuery, u.Fragment, u.RawFragment = nil, "", false, "", ""
		return u.String()
	})
	for _, r := range errSecretRes {
		s = r.re.ReplaceAllString(s, r.repl)
	}
	s = errTokenRe.ReplaceAllStringFunc(s, func(t string) string {
		if strings.ContainsAny(t, "0123456789") && strings.IndexFunc(t, unicode.IsLetter) >= 0 {
			return "…"
		}
		return t
	})
	return truncateRunes(s, errDetailRunes)
}

// describeErr fills the trace fields of a failed outcome.
func (o *Outcome) describeErr() {
	o.ErrType, o.Status, o.ErrDetail = ErrType(o.Err), upstreamStatus(o.Err), errDetail(o.Err)
}

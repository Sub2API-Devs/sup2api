package core

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"sync"
)

// Header passthrough (CONTRACTS §81) copies client request headers onto the
// upstream request of an account, next to the headers its plugin builds. An
// account lists rules: "*" (every header), "regex:<pattern>" or
// "re:<pattern>" (header names matching a Go regular expression, case
// insensitive), or an exact header name. Headers the plugin already set win,
// and the headers below never pass, whatever the rules say.

// MaxHeaderPassthroughRules caps the rules of one account.
const MaxHeaderPassthroughRules = 32

// maxHeaderPassthroughRule caps the length of one rule.
const maxHeaderPassthroughRule = 256

const (
	headerPassthroughAll     = "*"
	headerPassthroughRegex   = "regex:"
	headerPassthroughRegexV2 = "re:"
)

// headerPassthroughSkip are the headers no rule forwards: credentials (the
// account's own are set by its plugin), hop-by-hop and framing headers the
// transport owns, and client addresses a client could forge.
var headerPassthroughSkip = map[string]struct{}{
	// RFC 9110 / 7230 hop-by-hop and framing.
	"connection":        {},
	"keep-alive":        {},
	"te":                {},
	"trailer":           {},
	"transfer-encoding": {},
	"upgrade":           {},
	"expect":            {},
	"host":              {},
	"content-length":    {},
	"content-encoding":  {},
	"accept-encoding":   {},
	// Credentials.
	"authorization":  {},
	"x-api-key":      {},
	"x-goog-api-key": {},
	"api-key":        {},
	"cookie":         {},
	// Client addresses and proxy trails.
	"x-forwarded-for":     {},
	"x-forwarded-host":    {},
	"x-forwarded-proto":   {},
	"x-forwarded-port":    {},
	"x-real-ip":           {},
	"forwarded":           {},
	"via":                 {},
	"cf-connecting-ip":    {},
	"true-client-ip":      {},
	"x-client-ip":         {},
	"x-cluster-client-ip": {},
}

// headerPassthroughSkipPrefixes are header families no rule forwards:
// proxy credentials, WebSocket handshakes, and the control headers of this
// gateway and of the gateways it fronts (x-kin-* steers vm2api/sakura).
var headerPassthroughSkipPrefixes = []string{"proxy-", "sec-websocket-", "x-sub2api-", "x-kin-"}

// HeaderPassthroughBlocked reports whether no rule may forward the header.
func HeaderPassthroughBlocked(name string) bool {
	n := strings.ToLower(strings.TrimSpace(name))
	if n == "" {
		return true
	}
	if _, ok := headerPassthroughSkip[n]; ok {
		return true
	}
	for _, p := range headerPassthroughSkipPrefixes {
		if strings.HasPrefix(n, p) {
			return true
		}
	}
	return false
}

// headerPassthroughPattern returns the regular expression of a regex rule.
func headerPassthroughPattern(rule string) (string, bool) {
	lower := strings.ToLower(rule)
	for _, prefix := range []string{headerPassthroughRegex, headerPassthroughRegexV2} {
		if strings.HasPrefix(lower, prefix) {
			return strings.TrimSpace(rule[len(prefix):]), true
		}
	}
	return "", false
}

var headerPassthroughRegexps sync.Map // pattern → *regexp.Regexp

func compileHeaderPassthrough(pattern string) (*regexp.Regexp, error) {
	if v, ok := headerPassthroughRegexps.Load(pattern); ok {
		return v.(*regexp.Regexp), nil
	}
	re, err := regexp.Compile("(?i)" + pattern)
	if err != nil {
		return nil, err
	}
	v, _ := headerPassthroughRegexps.LoadOrStore(pattern, re)
	return v.(*regexp.Regexp), nil
}

// validHeaderName reports whether s is an HTTP field name (RFC 9110 token).
func validHeaderName(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9':
		case strings.IndexByte("!#$%&'*+-.^_`|~", c) >= 0:
		default:
			return false
		}
	}
	return true
}

// NormalizeHeaderPassthrough trims, validates and de-duplicates the rules of
// an account. Exact names are lower-cased; a name that can never pass is an
// error rather than a rule that silently does nothing.
func NormalizeHeaderPassthrough(ctx context.Context, field string, rules []string) ([]string, []FieldError) {
	out := make([]string, 0, len(rules))
	seen := map[string]bool{}
	var errs []FieldError
	add := func(code, en, zh string) {
		errs = append(errs, FieldError{Field: field, Code: code, Message: Text(ctx, en, zh)})
	}
	for _, raw := range rules {
		rule := strings.TrimSpace(raw)
		if rule == "" {
			continue
		}
		if len(rule) > maxHeaderPassthroughRule {
			add("invalid", "header passthrough rule is too long (at most 256 characters)", "请求头透传规则过长（最多 256 个字符）")
			continue
		}
		if pattern, ok := headerPassthroughPattern(rule); ok {
			if pattern == "" {
				add("invalid", "header passthrough regex is empty: "+rule, "请求头透传正则为空："+rule)
				continue
			}
			if _, err := compileHeaderPassthrough(pattern); err != nil {
				add("invalid", "invalid header passthrough regex "+rule+": "+err.Error(), "请求头透传正则无效 "+rule+"："+err.Error())
				continue
			}
			rule = headerPassthroughRegex + pattern
		} else if rule != headerPassthroughAll {
			if !validHeaderName(rule) {
				add("invalid", "invalid header name: "+rule, "请求头名称无效："+rule)
				continue
			}
			rule = strings.ToLower(rule)
			if HeaderPassthroughBlocked(rule) {
				add("blocked", "header "+rule+" can never be passed through (credential, hop-by-hop, client address or gateway control header)",
					"请求头 "+rule+" 不能透传（凭证、逐跳、客户端地址或网关控制头）")
				continue
			}
		}
		if seen[rule] {
			continue
		}
		seen[rule] = true
		out = append(out, rule)
	}
	if len(out) > MaxHeaderPassthroughRules {
		add("too_many", "at most 32 header passthrough rules", "请求头透传规则最多 32 条")
	}
	return out, errs
}

// PassthroughHeaders returns the client headers the rules forward, keyed by
// canonical name, with every value of each. Rules that no longer compile
// are skipped (they were validated when saved).
func PassthroughHeaders(rules []string, inbound http.Header) http.Header {
	if len(rules) == 0 || len(inbound) == 0 {
		return nil
	}
	all := false
	names := map[string]bool{}
	var patterns []*regexp.Regexp
	for _, rule := range rules {
		if rule == headerPassthroughAll {
			all = true
			continue
		}
		if pattern, ok := headerPassthroughPattern(rule); ok {
			if re, err := compileHeaderPassthrough(pattern); err == nil {
				patterns = append(patterns, re)
			}
			continue
		}
		names[strings.ToLower(rule)] = true
	}
	out := http.Header{}
	for name, values := range inbound {
		lower := strings.ToLower(name)
		if HeaderPassthroughBlocked(lower) || len(values) == 0 {
			continue
		}
		match := all || names[lower]
		for i := 0; !match && i < len(patterns); i++ {
			match = patterns[i].MatchString(lower)
		}
		if match {
			out[http.CanonicalHeaderKey(name)] = append([]string(nil), values...)
		}
	}
	return out
}

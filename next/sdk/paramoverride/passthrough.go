package paramoverride

import (
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
// and HeaderBlocked headers never pass, whatever the rules say. It lives here,
// next to the override, so manifest/check validates a declared default of the
// rules (commonControls.header_passthrough) with the core's parser.

// MaxPassthroughRules caps the rules of one account.
const MaxPassthroughRules = 32

// maxPassthroughRule caps the length of one rule.
const maxPassthroughRule = 256

const (
	passthroughAll     = "*"
	passthroughRegex   = "regex:"
	passthroughRegexV2 = "re:"
)

// passthroughPattern returns the regular expression of a regex rule.
func passthroughPattern(rule string) (string, bool) {
	lower := strings.ToLower(rule)
	for _, prefix := range []string{passthroughRegex, passthroughRegexV2} {
		if strings.HasPrefix(lower, prefix) {
			return strings.TrimSpace(rule[len(prefix):]), true
		}
	}
	return "", false
}

var passthroughRegexps sync.Map // pattern → *regexp.Regexp

func compilePassthrough(pattern string) (*regexp.Regexp, error) {
	if v, ok := passthroughRegexps.Load(pattern); ok {
		return v.(*regexp.Regexp), nil
	}
	re, err := regexp.Compile("(?i)" + pattern)
	if err != nil {
		return nil, err
	}
	v, _ := passthroughRegexps.LoadOrStore(pattern, re)
	return v.(*regexp.Regexp), nil
}

// NormalizePassthrough trims, validates and de-duplicates the rules of an
// account. Exact names are lower-cased; a name that can never pass is an
// error rather than a rule that silently does nothing. zh picks the Chinese
// wording.
func NormalizePassthrough(field string, rules []string, zh bool) ([]string, []FieldError) {
	out := make([]string, 0, len(rules))
	seen := map[string]bool{}
	var errs []FieldError
	add := func(code, en, cn string) {
		msg := en
		if zh {
			msg = cn
		}
		errs = append(errs, FieldError{Field: field, Code: code, Message: msg})
	}
	for _, raw := range rules {
		rule := strings.TrimSpace(raw)
		if rule == "" {
			continue
		}
		if len(rule) > maxPassthroughRule {
			add("invalid", "header passthrough rule is too long (at most 256 characters)", "请求头透传规则过长（最多 256 个字符）")
			continue
		}
		if pattern, ok := passthroughPattern(rule); ok {
			if pattern == "" {
				add("invalid", "header passthrough regex is empty: "+rule, "请求头透传正则为空："+rule)
				continue
			}
			if _, err := compilePassthrough(pattern); err != nil {
				add("invalid", "invalid header passthrough regex "+rule+": "+err.Error(), "请求头透传正则无效 "+rule+"："+err.Error())
				continue
			}
			rule = passthroughRegex + pattern
		} else if rule != passthroughAll {
			if !ValidHeaderName(rule) {
				add("invalid", "invalid header name: "+rule, "请求头名称无效："+rule)
				continue
			}
			rule = strings.ToLower(rule)
			if HeaderBlocked(rule) {
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
	if len(out) > MaxPassthroughRules {
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
		if rule == passthroughAll {
			all = true
			continue
		}
		if pattern, ok := passthroughPattern(rule); ok {
			if re, err := compilePassthrough(pattern); err == nil {
				patterns = append(patterns, re)
			}
			continue
		}
		names[strings.ToLower(rule)] = true
	}
	out := http.Header{}
	for name, values := range inbound {
		lower := strings.ToLower(name)
		if HeaderBlocked(lower) || len(values) == 0 {
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

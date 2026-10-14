package core

import (
	"net/url"
	"strconv"
	"strings"
)

// ParseProxyURL parses a proxy URL such as socks5://user:pass@host:1080 into
// a ProxySpec (CONTRACTS §21.4). It lives in core so that the account module
// can accept proxy_url without importing the proxy module: the scheme must be
// http, https, socks5 or socks5h (recorded as socks5); host (lower-case, IPv6
// brackets removed) and port (1-65535) are required; user info is
// URL-decoded; a path other than "/", a query or a fragment is rejected. The
// result also passes the field rules of POST /proxies (§15.4). Errors are
// invalid_argument with details.fields[{field:"proxy_url", code:"invalid"}];
// their messages never echo the input, which may contain a password.
func ParseProxyURL(raw string) (ProxySpec, error) {
	fail := func(reason string) (ProxySpec, error) {
		return ProxySpec{}, InvalidFields(FieldError{
			Field: "proxy_url", Code: "invalid", Message: "invalid proxy URL: " + reason,
		})
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fail("empty")
	}
	u, err := url.Parse(raw)
	if err != nil {
		// url.Error quotes the whole URL: never pass it on.
		return fail("malformed")
	}
	if u.Opaque != "" {
		return fail("malformed")
	}
	var spec ProxySpec
	switch strings.ToLower(u.Scheme) {
	case "http", "https", "socks5":
		spec.Protocol = strings.ToLower(u.Scheme)
	case "socks5h":
		spec.Protocol = "socks5"
	default:
		return fail("scheme must be http, https, socks5 or socks5h")
	}
	spec.Host = strings.ToLower(u.Hostname())
	if spec.Host == "" {
		return fail("missing host")
	}
	if len(spec.Host) > 255 || strings.ContainsAny(spec.Host, "/?#@ \t") {
		return fail("invalid host")
	}
	port := u.Port()
	if port == "" {
		return fail("missing port")
	}
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		return fail("port must be 1-65535")
	}
	spec.Port = n
	if u.Path != "" && u.Path != "/" || u.RawPath != "" && u.RawPath != "/" {
		return fail("path is not allowed")
	}
	if u.RawQuery != "" || u.ForceQuery {
		return fail("query is not allowed")
	}
	if u.Fragment != "" || u.RawFragment != "" {
		return fail("fragment is not allowed")
	}
	if u.User != nil {
		spec.Username = u.User.Username()
		spec.Password, _ = u.User.Password()
	}
	if len(spec.Username) > 255 {
		return fail("username is too long")
	}
	if len(spec.Password) > 1024 {
		return fail("password is too long")
	}
	return spec, nil
}

package gateway

import (
	"context"
	"errors"
	"fmt"
	"net/netip"
	"net/url"
	"strings"
)

var (
	errBadUpstreamURL  = errors.New("upstream url must be an absolute http(s) url")
	errPrivateUpstream = errors.New("upstream address is private, loopback or link-local")
)

// checkUpstreamURL validates a URL returned by BuildUpstreamRequest: http(s),
// a host, and (unless AllowPrivateUpstream) only public addresses. Proxied
// requests are resolved by the proxy; the check still applies to the name.
func (g *Gateway) checkUpstreamURL(ctx context.Context, raw string) (*url.URL, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.Hostname() == "" {
		return nil, errBadUpstreamURL
	}
	if u.User != nil {
		return nil, fmt.Errorf("%w: credentials in url", errBadUpstreamURL)
	}
	if g.allowPrivate {
		return u, nil
	}
	host := u.Hostname()
	if ip, err := netip.ParseAddr(host); err == nil {
		if blockedAddr(ip) {
			return nil, errPrivateUpstream
		}
		return u, nil
	}
	if strings.EqualFold(host, "localhost") || strings.HasSuffix(strings.ToLower(host), ".localhost") {
		return nil, errPrivateUpstream
	}
	ips, err := g.lookupIP(ctx, host)
	if err != nil {
		return nil, fmt.Errorf("resolve %s: %w", host, err)
	}
	if len(ips) == 0 {
		return nil, fmt.Errorf("resolve %s: no addresses", host)
	}
	for _, ip := range ips {
		a, ok := netip.AddrFromSlice(ip)
		if !ok || blockedAddr(a) {
			return nil, errPrivateUpstream
		}
	}
	return u, nil
}

var blockedPrefixes = mustPrefixes(
	"0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12",
	"192.0.0.0/24", "192.168.0.0/16", "198.18.0.0/15", "224.0.0.0/4", "240.0.0.0/4",
	"::/128", "::1/128", "fc00::/7", "fe80::/10", "ff00::/8", "64:ff9b::/96",
)

func mustPrefixes(ss ...string) []netip.Prefix {
	out := make([]netip.Prefix, 0, len(ss))
	for _, s := range ss {
		out = append(out, netip.MustParsePrefix(s))
	}
	return out
}

func blockedAddr(a netip.Addr) bool {
	a = a.Unmap()
	if !a.IsValid() || a.IsLoopback() || a.IsPrivate() || a.IsUnspecified() || a.IsLinkLocalUnicast() ||
		a.IsLinkLocalMulticast() || a.IsInterfaceLocalMulticast() || a.IsMulticast() {
		return true
	}
	for _, p := range blockedPrefixes {
		if p.Contains(a) {
			return true
		}
	}
	return false
}

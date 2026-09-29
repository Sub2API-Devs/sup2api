// Package netguard is the core's single answer to "is this URL safe for the
// server to fetch?" - the SSRF guard applied to every address a plugin hands
// the core to call: BuildUpstreamRequest on the gateway path, and
// BuildReconcileRequest in the offline reconcile loop.
//
// It lives in its own package because having two of these is how one of them
// drifts, and the drift is always silent: the weaker copy keeps working, on
// exactly the requests it should have refused.
package netguard

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/netip"
	"net/url"
	"strings"
)

var (
	// ErrBadURL is an address that is not an absolute http(s) URL.
	ErrBadURL = errors.New("upstream url must be an absolute http(s) url")
	// ErrPrivate is an address that resolves somewhere inside the
	// deployment's own network.
	ErrPrivate = errors.New("upstream address is private, loopback or link-local")
)

// Lookup resolves a host name. Callers pass DefaultLookup outside tests.
type Lookup func(ctx context.Context, host string) ([]net.IP, error)

// DefaultLookup resolves through the process resolver.
func DefaultLookup(ctx context.Context, host string) ([]net.IP, error) {
	addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, err
	}
	out := make([]net.IP, 0, len(addrs))
	for _, a := range addrs {
		out = append(out, a.IP)
	}
	return out, nil
}

// CheckURL validates a URL a plugin returned: http(s), a host, no embedded
// credentials, and - unless allowPrivate - only public addresses. A proxied
// request is resolved by the proxy, so the check still applies to the name:
// it is the plugin's claim about where it wants to go that is being judged.
func CheckURL(ctx context.Context, raw string, allowPrivate bool, lookup Lookup) (*url.URL, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.Hostname() == "" {
		return nil, ErrBadURL
	}
	if u.User != nil {
		return nil, fmt.Errorf("%w: credentials in url", ErrBadURL)
	}
	if allowPrivate {
		return u, nil
	}
	host := u.Hostname()
	if ip, err := netip.ParseAddr(host); err == nil {
		if BlockedAddr(ip) {
			return nil, ErrPrivate
		}
		return u, nil
	}
	if strings.EqualFold(host, "localhost") || strings.HasSuffix(strings.ToLower(host), ".localhost") {
		return nil, ErrPrivate
	}
	if lookup == nil {
		lookup = DefaultLookup
	}
	ips, err := lookup(ctx, host)
	if err != nil {
		return nil, fmt.Errorf("resolve %s: %w", host, err)
	}
	if len(ips) == 0 {
		return nil, fmt.Errorf("resolve %s: no addresses", host)
	}
	for _, ip := range ips {
		a, ok := netip.AddrFromSlice(ip)
		if !ok || BlockedAddr(a) {
			return nil, ErrPrivate
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

// BlockedAddr reports whether an address belongs to the deployment's own
// network rather than the public internet.
func BlockedAddr(a netip.Addr) bool {
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

package proxy

import (
	"net/netip"
	"syscall"
)

// PrivateAddressError is returned when a direct (non-proxied) upstream
// connection would reach a loopback, private, link-local, unspecified or
// multicast address (CONTRACTS §14.2). The check runs on the resolved address
// at dial time, so DNS rebinding cannot bypass it.
type PrivateAddressError struct {
	Address string // "ip:port" the dialer was about to connect to
}

func (e *PrivateAddressError) Error() string {
	return "upstream address " + e.Address + " is private, loopback or otherwise non-public and not allowed " +
		"(set SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM=true to allow)"
}

// extraBlocked are non-public ranges not covered by the netip predicates
// (loopback, private incl. IPv6 ULA, link-local, multicast, unspecified).
var extraBlocked = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),      // "this network"; 0.x reaches local services on Linux
	netip.MustParsePrefix("100.64.0.0/10"),  // carrier-grade NAT (RFC 6598)
	netip.MustParsePrefix("192.0.0.0/24"),   // IETF protocol assignments
	netip.MustParsePrefix("198.18.0.0/15"),  // benchmarking (RFC 2544)
	netip.MustParsePrefix("240.0.0.0/4"),    // reserved, includes 255.255.255.255
	netip.MustParsePrefix("::/96"),          // IPv4-compatible (deprecated), can embed private IPv4
	netip.MustParsePrefix("64:ff9b:1::/48"), // local-use NAT64 (RFC 8215)
	netip.MustParsePrefix("100::/64"),       // discard-only
	netip.MustParsePrefix("2002::/16"),      // 6to4, can embed private IPv4
	netip.MustParsePrefix("fec0::/10"),      // deprecated site-local
}

// IsBlockedUpstreamIP reports whether a direct upstream connection to ip is
// refused unless private upstreams are allowed.
func IsBlockedUpstreamIP(ip netip.Addr) bool {
	if !ip.IsValid() {
		return true
	}
	ip = ip.Unmap().WithZone("")
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
		return true
	}
	for _, p := range extraBlocked {
		if p.Contains(ip) {
			return true
		}
	}
	return false
}

// guardControl is a net.Dialer.Control that refuses non-public addresses.
// address is the resolved "ip:port"; anything unparsable is refused.
func guardControl(_, address string, _ syscall.RawConn) error {
	ap, err := netip.ParseAddrPort(address)
	if err != nil || IsBlockedUpstreamIP(ap.Addr()) {
		return &PrivateAddressError{Address: address}
	}
	return nil
}

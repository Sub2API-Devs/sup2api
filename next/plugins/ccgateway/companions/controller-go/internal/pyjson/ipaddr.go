package pyjson

import (
	"errors"
	"math/bits"
	"net/netip"
	"strconv"
	"strings"
)

// ErrAddress is the ValueError of ipaddress for text it refuses.
var ErrAddress = errors.New("pyjson: invalid IPv4 address or network")

// IPv4Address is ipaddress.IPv4Address(s): four ASCII decimal octets of at
// most three digits, no leading zeros, each at most 255.
func IPv4Address(s string) (netip.Addr, error) {
	var b [4]byte
	parts := strings.Split(s, ".")
	if len(parts) != 4 {
		return netip.Addr{}, ErrAddress
	}
	for i, p := range parts {
		if p == "" || len(p) > 3 {
			return netip.Addr{}, ErrAddress
		}
		for j := 0; j < len(p); j++ {
			if p[j] < '0' || p[j] > '9' {
				return netip.Addr{}, ErrAddress
			}
		}
		if p != "0" && p[0] == '0' {
			return netip.Addr{}, ErrAddress
		}
		n, _ := strconv.Atoi(p)
		if n > 255 {
			return netip.Addr{}, ErrAddress
		}
		b[i] = byte(n)
	}
	return netip.AddrFrom4(b), nil
}

// CanonicalIPv4 is common.ipv4(value): the address text, re-spelled.
func CanonicalIPv4(s string) (string, error) {
	a, err := IPv4Address(s)
	if err != nil {
		return "", err
	}
	return a.String(), nil
}

// IPv4Network is ipaddress.IPv4Network(s, strict): an address with an
// optional "/prefix", where the prefix is decimal digits (leading zeros
// allowed, 0..32), a netmask, or a hostmask. strict=false masks host bits;
// strict=true refuses them.
func IPv4Network(s string, strict bool) (netip.Prefix, error) {
	addrText, maskText, hasMask := strings.Cut(s, "/")
	if strings.Contains(maskText, "/") {
		return netip.Prefix{}, ErrAddress
	}
	addr, err := IPv4Address(addrText)
	if err != nil {
		return netip.Prefix{}, err
	}
	prefix := 32
	if hasMask {
		prefix, err = prefixOf(maskText)
		if err != nil {
			return netip.Prefix{}, err
		}
	}
	p := netip.PrefixFrom(addr, prefix)
	if masked := p.Masked(); masked != p {
		if strict {
			return netip.Prefix{}, ErrAddress
		}
		p = masked
	}
	return p, nil
}

func prefixOf(text string) (int, error) {
	if text == "" {
		return 0, ErrAddress
	}
	digits := true
	for i := 0; i < len(text); i++ {
		if text[i] < '0' || text[i] > '9' {
			digits = false
			break
		}
	}
	if digits {
		n, err := strconv.Atoi(text)
		if err != nil || n > 32 {
			return 0, ErrAddress
		}
		return n, nil
	}
	mask, err := IPv4Address(text)
	if err != nil {
		return 0, ErrAddress
	}
	b := mask.As4()
	v := uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	if ones := bits.LeadingZeros32(^v); v<<ones == 0 { // netmask: ones then zeros
		return ones, nil
	}
	if zeros := bits.LeadingZeros32(v); ^v<<zeros == 0 { // hostmask: zeros then ones
		return zeros, nil
	}
	return 0, ErrAddress
}

// SubnetOf is IPv4Network.subnet_of.
func SubnetOf(a, b netip.Prefix) bool {
	return a.Bits() >= b.Bits() && b.Contains(a.Addr())
}

// Overlaps is IPv4Network.overlaps.
func Overlaps(a, b netip.Prefix) bool { return a.Overlaps(b) }

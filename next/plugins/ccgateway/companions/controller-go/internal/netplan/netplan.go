// Package netplan is the account network policy and the pure rules the
// controller derives from it (Python network.py; behaviour N1-N6, V8, V10,
// V24): the subnet and address allocator, the business firewall text, and
// the pinning of a proxy host to one IPv4 address.
//
// FROZEN: Policy, ParsePolicy, AllocateSubnet, AllocateAddresses,
// BusinessRules, ValidateProxy, PinProxy and Resolver.
package netplan

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/netip"
	"time"

	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/rnd"
)

// Policy is a normalised network policy {"pool", "allocation"} (S12).
type Policy struct {
	Pool       string `json:"pool"`
	Allocation string `json:"allocation"`
}

// PyValue keeps Python's key order: pool, allocation.
func (p Policy) PyValue() any {
	return pyjson.Ordered{{Key: "pool", Value: p.Pool}, {Key: "allocation", Value: p.Allocation}}
}

// Label is the io.sup2api.ccgateway.network label: json.dumps(policy, sort_keys=True).
func (p Policy) Label() string { return string(pyjson.MustMarshalSorted(p)) }

// Allocation modes.
const (
	Random     = "random"
	Sequential = "sequential"
)

// PrivatePools are the RFC 1918 ranges a pool must lie in.
var PrivatePools = []netip.Prefix{
	netip.MustParsePrefix("10.0.0.0/8"),
	netip.MustParsePrefix("172.16.0.0/12"),
	netip.MustParsePrefix("192.168.0.0/16"),
}

// PrivateDestinations is network.PRIVATE_DESTINATIONS (nft set text).
const PrivateDestinations = "0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, " +
	"172.16.0.0/12, 192.168.0.0/16, 224.0.0.0/4, 240.0.0.0/4"

// ErrInvalidPolicy is network_policy's ValueError (400 at validation).
var ErrInvalidPolicy = errors.New("invalid network policy")

// ErrExhausted is allocate_subnet's ValueError: answered 503
// runtime_unavailable (BUG-22 kept).
var ErrExhausted = errors.New("network pool exhausted or overlaps host routes")

// ParsePolicy is network_policy(raw) for a decoded JSON value: null is {};
// the object's keys must be within {pool, allocation}; pool defaults to
// 10.0.0.0/8 (also when falsy), parsed non-strictly, IPv4, prefix at most
// /24, inside RFC 1918; allocation defaults to random (also when falsy) and
// is random or sequential.
func ParsePolicy(raw any) (Policy, error) {
	var obj pyjson.Ordered
	switch x := raw.(type) {
	case nil:
	case pyjson.Ordered:
		obj = x
	case map[string]any:
		for k, v := range x {
			obj = append(obj, pyjson.KV{Key: k, Value: v})
		}
	default:
		return Policy{}, ErrInvalidPolicy
	}
	for _, kv := range obj {
		if kv.Key != "pool" && kv.Key != "allocation" {
			return Policy{}, ErrInvalidPolicy
		}
	}
	poolValue, _ := obj.Get("pool")
	poolText := "10.0.0.0/8"
	if pyjson.Truthy(poolValue) {
		s, ok := poolValue.(string)
		if !ok {
			// ip_network(int) is a /32 (refused below); any other type raises.
			return Policy{}, ErrInvalidPolicy
		}
		poolText = s
	}
	pool, err := pyjson.IPv4Network(poolText, false)
	if err != nil || pool.Bits() > 24 || !inPrivate(pool) {
		return Policy{}, ErrInvalidPolicy
	}
	allocation := Random
	if v, _ := obj.Get("allocation"); pyjson.Truthy(v) {
		s, ok := v.(string)
		if !ok || (s != Random && s != Sequential) {
			return Policy{}, ErrInvalidPolicy
		}
		allocation = s
	}
	return Policy{Pool: pool.String(), Allocation: allocation}, nil
}

func inPrivate(p netip.Prefix) bool {
	for _, private := range PrivatePools {
		if pyjson.SubnetOf(p, private) {
			return true
		}
	}
	return false
}

func u32(a netip.Addr) uint64 {
	b := a.As4()
	return uint64(b[0])<<24 | uint64(b[1])<<16 | uint64(b[2])<<8 | uint64(b[3])
}

func addrOf(v uint64) netip.Addr {
	return netip.AddrFrom4([4]byte{byte(v >> 24), byte(v >> 16), byte(v >> 8), byte(v)})
}

// AllocateSubnet is allocate_subnet(policy, occupied): subnets of prefix
// max(24, pool+1) inside the pool, minus every one overlapping an occupied
// network; random picks uniformly with r, sequential the first.
func AllocateSubnet(p Policy, occupied []netip.Prefix, r rnd.Source) (netip.Prefix, error) {
	pool, err := netip.ParsePrefix(p.Pool)
	if err != nil || !pool.Addr().Is4() {
		return netip.Prefix{}, ErrInvalidPolicy
	}
	prefix := pool.Bits() + 1
	if prefix < 24 {
		prefix = 24
	}
	size := uint64(1) << (32 - prefix)
	count := (uint64(1) << (32 - pool.Bits())) / size
	base := u32(pool.Addr())
	blocked := map[uint64]bool{}
	for _, n := range occupied {
		if !n.Addr().Is4() {
			continue
		}
		n = n.Masked()
		if !n.Overlaps(pool) {
			continue
		}
		start := u32(n.Addr())
		end := start + (uint64(1) << (32 - n.Bits())) - 1
		var first uint64
		if start > base {
			first = (start - base) / size
		}
		last := count - 1
		if end >= base {
			if l := (end - base) / size; l < last {
				last = l
			}
		}
		for i := first; i <= last; i++ {
			blocked[i] = true
		}
	}
	var free []uint64
	for i := uint64(0); i < count; i++ {
		if !blocked[i] {
			free = append(free, i)
		}
	}
	if len(free) == 0 {
		return netip.Prefix{}, ErrExhausted
	}
	index := free[0]
	if p.Allocation == Random {
		index = rnd.Choice(r, free)
	}
	return netip.PrefixFrom(addrOf(base+index*size), prefix), nil
}

// AllocateAddresses is allocate_addresses(subnet, allocation, 2): two
// distinct host offsets in [2, size-2] (not the network address, Docker's .1
// or the broadcast) -> (gateway_ip, app_ip).
func AllocateAddresses(subnet netip.Prefix, allocation string, r rnd.Source) (gateway, app netip.Addr, err error) {
	subnet = subnet.Masked()
	n := uint64(1) << (32 - subnet.Bits())
	if n < 5 {
		return netip.Addr{}, netip.Addr{}, fmt.Errorf("subnet %s too small", subnet)
	}
	var offsets []uint64
	for o := uint64(2); o < n-1; o++ {
		offsets = append(offsets, o)
	}
	var out [2]netip.Addr
	for i := range out {
		k := 0
		if allocation == Random {
			k = r.Intn(len(offsets))
		}
		out[i] = addrOf(u32(subnet.Addr()) + offsets[k])
		offsets = append(offsets[:k:k], offsets[k+1:]...)
	}
	return out[0], out[1], nil
}

// BusinessRules is business_rules(gateway_ip): the account's ccg_app nft
// table, byte for byte; the address is re-spelled by IPv4Address first.
func BusinessRules(gatewayIP string) (string, error) {
	gw, err := pyjson.CanonicalIPv4(gatewayIP)
	if err != nil {
		return "", err
	}
	return "table inet ccg_app {\n" +
		" chain output { type filter hook output priority filter; policy drop;\n" +
		"  ct state established,related accept\n" +
		"  ip daddr " + gw + " udp dport 53 accept\n" +
		"  ip daddr " + gw + " tcp dport 53 accept\n" +
		"  ip daddr 127.0.0.1 tcp dport 8787 accept\n" +
		"  ip daddr { " + PrivateDestinations + " } drop\n" +
		"  meta nfproto ipv4 meta l4proto tcp accept\n" +
		" }\n" +
		"}\n", nil
}

// Resolver resolves a proxy host to IPv4 addresses.
type Resolver interface {
	LookupIPv4(ctx context.Context, host string) ([]netip.Addr, error)
}

// LookupTimeout bounds one proxy host lookup.
const LookupTimeout = 10 * time.Second

// SystemResolver is the production resolver: Go's own DNS client reading the
// container's /etc/resolv.conf (Docker's embedded DNS).
func SystemResolver() Resolver { return systemResolver{r: &net.Resolver{PreferGo: true}} }

type systemResolver struct{ r *net.Resolver }

func (s systemResolver) LookupIPv4(ctx context.Context, host string) ([]netip.Addr, error) {
	ctx, cancel := context.WithTimeout(ctx, LookupTimeout)
	defer cancel()
	addrs, err := s.r.LookupNetIP(ctx, "ip4", host)
	if err != nil {
		return nil, err
	}
	out := make([]netip.Addr, 0, len(addrs))
	for _, a := range addrs {
		if a = a.Unmap(); a.Is4() {
			out = append(out, a)
		}
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("no IPv4 address for %s", host)
	}
	return out, nil
}

// StaticResolver is a test resolver: host -> addresses.
type StaticResolver map[string][]string

func (s StaticResolver) LookupIPv4(_ context.Context, host string) ([]netip.Addr, error) {
	list, ok := s[host]
	if !ok {
		return nil, fmt.Errorf("lookup %s: no such host", host)
	}
	out := make([]netip.Addr, 0, len(list))
	for _, a := range list {
		addr, err := netip.ParseAddr(a)
		if err != nil {
			return nil, err
		}
		out = append(out, addr)
	}
	return out, nil
}

// ErrInvalidProxy is proxy_outbound's ValueError for a bad protocol, host or
// port. Since BUG-5 is fixed, ValidateProxy reports it at the entry (400).
var ErrInvalidProxy = errors.New("invalid proxy")

// Proxy protocols.
var protocols = map[string]bool{"http": true, "https": true, "socks5": true}

// ProxyFields is a proxy object's checked fields.
type ProxyFields struct {
	Protocol string
	Host     string
	Port     int64
	// Username and Password are the raw JSON values: proxy.get('username', '')
	// may be any JSON value (null included); they reach the outbound as is.
	Username any
	Password any
}

// ValidateProxy checks a proxy object without resolving it: protocol is
// http, https or socks5; host a non-empty string of at most 253
// characters; port int()-convertible within 1..65535.
func ValidateProxy(proxy any) (ProxyFields, error) {
	obj, ok := proxy.(pyjson.Ordered)
	if !ok {
		return ProxyFields{}, ErrInvalidProxy
	}
	var f ProxyFields
	protocol, _ := obj.Get("protocol")
	f.Protocol, ok = protocol.(string)
	if !ok || !protocols[f.Protocol] {
		return ProxyFields{}, ErrInvalidProxy
	}
	host, _ := obj.Get("host")
	f.Host, ok = host.(string)
	if !ok || f.Host == "" || len([]rune(f.Host)) > 253 {
		return ProxyFields{}, ErrInvalidProxy
	}
	portValue, present := obj.Get("port")
	port, err := pyjson.IntOf(portValue)
	if !present || err != nil || port < 1 || port > 65535 {
		return ProxyFields{}, ErrInvalidProxy
	}
	f.Port = port
	f.Username, f.Password = "", ""
	if v, ok := obj.Get("username"); ok {
		f.Username = v
	}
	if v, ok := obj.Get("password"); ok {
		f.Password = v
	}
	return f, nil
}

// Pinned is a proxy pinned to one IPv4 address (proxy_outbound's result).
type Pinned struct {
	ProxyFields
	Server string // the resolved IPv4 address
}

// PinProxy is proxy_outbound(proxy): ValidateProxy, then the first IPv4
// address of the host (an IPv4 literal is itself; an IPv6 literal fails).
func PinProxy(ctx context.Context, r Resolver, proxy any) (Pinned, error) {
	f, err := ValidateProxy(proxy)
	if err != nil {
		return Pinned{}, err
	}
	if a, err := netip.ParseAddr(f.Host); err == nil {
		if !a.Is4() {
			return Pinned{}, fmt.Errorf("proxy %s is not an IPv4 address", f.Host)
		}
		return Pinned{ProxyFields: f, Server: a.String()}, nil
	}
	addrs, err := r.LookupIPv4(ctx, f.Host)
	if err != nil {
		return Pinned{}, err
	}
	if len(addrs) == 0 || !addrs[0].Is4() {
		return Pinned{}, fmt.Errorf("no IPv4 address for proxy host")
	}
	return Pinned{ProxyFields: f, Server: addrs[0].String()}, nil
}

// IsAddressLiteral is Manager._is_address: an IPv4 or IPv6 literal never
// moves (Q1).
func IsAddressLiteral(host string) bool {
	if _, err := pyjson.IPv4Address(host); err == nil {
		return true
	}
	a, err := netip.ParseAddr(host)
	return err == nil && a.Is6()
}

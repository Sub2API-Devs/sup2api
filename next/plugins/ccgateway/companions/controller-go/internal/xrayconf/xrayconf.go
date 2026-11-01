// Package xrayconf generates the shared gateway's Xray and nftables
// configuration (the first half of Python shared_egress.py; behaviour G5,
// G6, G7, V24). Pure functions: the orchestration (configure, sync, fence,
// collect, recover) lives in package accounts.
//
// The outbound tag is a digest of Python json.dumps(out, sort_keys=True) and
// is reproduced byte for byte (RB5). The firewall text is the Python text
// with one intended change (BUG-17 fixed): the output-chain accept rules are
// sorted, so the file is deterministic.
//
// FROZEN: every exported name.
package xrayconf

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"sort"
	"strconv"
	"strings"

	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

// APIServer is the Xray API address inside the gateway.
const APIServer = "127.0.0.1:10085"

// TransparentPort is the TPROXY inbound port.
const TransparentPort = 15001

// DNS inbound ports of bindings.
const (
	FirstDNSPort = 20000
	LastDNSPort  = 29999
	MaxNodes     = 256
)

// Base is shared_egress.BASE: the gateway's boot configuration.
func Base() pyjson.Ordered {
	return pyjson.Ordered{
		{Key: "log", Value: pyjson.Ordered{{Key: "loglevel", Value: "warning"}}},
		{Key: "api", Value: pyjson.Ordered{{Key: "tag", Value: "api"}, {Key: "listen", Value: APIServer},
			{Key: "services", Value: []any{"HandlerService", "RoutingService"}}}},
		{Key: "inbounds", Value: []any{pyjson.Ordered{
			{Key: "tag", Value: "transparent"}, {Key: "listen", Value: "0.0.0.0"}, {Key: "port", Value: int64(TransparentPort)},
			{Key: "protocol", Value: "dokodemo-door"},
			{Key: "settings", Value: pyjson.Ordered{{Key: "network", Value: "tcp"}, {Key: "followRedirect", Value: true}}},
			{Key: "streamSettings", Value: pyjson.Ordered{{Key: "sockopt", Value: pyjson.Ordered{{Key: "tproxy", Value: "tproxy"}}}}},
		}}},
		{Key: "outbounds", Value: []any{pyjson.Ordered{{Key: "tag", Value: "block"}, {Key: "protocol", Value: "blackhole"}}}},
		{Key: "routing", Value: pyjson.Ordered{{Key: "rules", Value: []any{pyjson.Ordered{
			{Key: "type", Value: "field"}, {Key: "ruleTag", Value: "deny"}, {Key: "network", Value: "tcp,udp"},
			{Key: "outboundTag", Value: "block"}}}}}},
	}
}

// Tag is "proxy-" + sha256(salt + json.dumps(out, sort_keys=True))[:24],
// computed before the tag key is added to out.
func Tag(salt string, out any) (string, error) {
	b, err := pyjson.MarshalSorted(out)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(append([]byte(salt), b...))
	return "proxy-" + hex.EncodeToString(sum[:])[:24], nil
}

// Direct is the outbound of a direct runtime (freedom, IPv4 only).
func Direct() pyjson.Ordered {
	return pyjson.Ordered{{Key: "protocol", Value: "freedom"},
		{Key: "settings", Value: pyjson.Ordered{{Key: "domainStrategy", Value: "UseIPv4"}}}}
}

// Outbound is the outbound object node() builds for a pinned proxy (without tag).
func Outbound(p netplan.Pinned) pyjson.Ordered {
	server := pyjson.Ordered{{Key: "address", Value: p.Server}, {Key: "port", Value: p.Port}}
	if pyjson.Truthy(p.Username) || pyjson.Truthy(p.Password) {
		server = append(server, pyjson.KV{Key: "users", Value: []any{pyjson.Ordered{
			{Key: "user", Value: p.Username}, {Key: "pass", Value: p.Password}}}})
	}
	protocol := "http"
	if p.Protocol == "socks5" {
		protocol = "socks"
	}
	out := pyjson.Ordered{{Key: "protocol", Value: protocol},
		{Key: "settings", Value: pyjson.Ordered{{Key: "servers", Value: []any{server}}}}}
	if p.Protocol == "https" {
		out = append(out, pyjson.KV{Key: "streamSettings", Value: pyjson.Ordered{
			{Key: "security", Value: "tls"},
			{Key: "tlsSettings", Value: pyjson.Ordered{{Key: "serverName", Value: p.Host}, {Key: "allowInsecure", Value: false}}},
		}})
	}
	return out
}

// NodeOf is node() for an outbound already built: the tag is computed and
// appended, endpoint is nil for direct.
func NodeOf(salt string, out pyjson.Ordered, endpoint *store.Endpoint) (*store.Node, error) {
	tag, err := Tag(salt, out)
	if err != nil {
		return nil, err
	}
	out = append(out.Clone(), pyjson.KV{Key: "tag", Value: tag})
	return store.NewNode(out, endpoint), nil
}

// Node is node(proxy, salt): proxy nil is direct; otherwise the proxy is
// validated and pinned to one IPv4 address through r.
func Node(ctx context.Context, r netplan.Resolver, proxy any, salt string) (*store.Node, error) {
	if proxy == nil {
		return NodeOf(salt, Direct(), nil)
	}
	p, err := netplan.PinProxy(ctx, r, proxy)
	if err != nil {
		return nil, err
	}
	return NodeOf(salt, Outbound(p), &store.Endpoint{IP: p.Server, Port: p.Port})
}

// InboundTag is "dns-<port>".
func InboundTag(port int64) string { return "dns-" + strconv.FormatInt(port, 10) }

// Inbound is inbound(binding): the binding's DNS SOCKS inbound.
func Inbound(port int64) pyjson.Ordered {
	return pyjson.Ordered{{Key: "tag", Value: InboundTag(port)}, {Key: "listen", Value: "127.0.0.1"},
		{Key: "port", Value: port}, {Key: "protocol", Value: "socks"},
		{Key: "settings", Value: pyjson.Ordered{{Key: "auth", Value: "noauth"}, {Key: "udp", Value: false}}}}
}

// Routes is routes(bindings): the complete routing table, active bindings
// in key order, then the final deny.
func Routes(b *store.Bindings) pyjson.Ordered {
	rules := []any{}
	for _, key := range b.SortedKeys() {
		bd, _ := b.Get(key)
		if !bd.Active {
			continue
		}
		rules = append(rules,
			pyjson.Ordered{{Key: "type", Value: "field"}, {Key: "ruleTag", Value: "dns-" + key},
				{Key: "inboundTag", Value: []any{InboundTag(bd.Port)}}, {Key: "outboundTag", Value: bd.Tag}},
			pyjson.Ordered{{Key: "type", Value: "field"}, {Key: "ruleTag", Value: "app-" + key},
				{Key: "inboundTag", Value: []any{"transparent"}}, {Key: "source", Value: []any{bd.IP + "/32"}},
				{Key: "outboundTag", Value: bd.Tag}})
	}
	rules = append(rules, pyjson.Ordered{{Key: "type", Value: "field"}, {Key: "ruleTag", Value: "deny"},
		{Key: "network", Value: "tcp,udp"}, {Key: "outboundTag", Value: "block"}})
	return pyjson.Ordered{{Key: "routing", Value: pyjson.Ordered{{Key: "domainStrategy", Value: "AsIs"}, {Key: "rules", Value: rules}}}}
}

// ErrInterface is the ValueError of an interface name that is not
// alphanumeric after removing '_' and '-' (ASCII only; Python's isalnum also
// accepted Unicode letters, BUG-18).
var ErrInterface = errors.New("invalid interface")

func validInterface(name string) bool {
	stripped := strings.NewReplacer("_", "", "-", "").Replace(name)
	if stripped == "" {
		return false
	}
	for i := 0; i < len(stripped); i++ {
		c := stripped[i]
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9') {
			return false
		}
	}
	return true
}

// Firewall is firewall(bindings, nodes): the gateway's ccg_shared table.
// Bindings are walked in insertion order (as Python iterates the dict); the
// output rules are sorted (BUG-17) with the pinned proxy endpoints before
// the direct private-destination drop.
func Firewall(b *store.Bindings, n *store.Nodes) (string, error) {
	var intercept, inputs []string
	for _, key := range b.Keys() {
		bd, _ := b.Get(key)
		if !validInterface(bd.Interface) {
			return "", ErrInterface
		}
		ip, err := pyjson.CanonicalIPv4(bd.IP)
		if err != nil {
			return "", err
		}
		gw, err := pyjson.CanonicalIPv4(bd.Gateway)
		if err != nil {
			return "", err
		}
		identity := `iifname "` + bd.Interface + `" ip saddr ` + ip
		if bd.Active {
			for _, transport := range []string{"tcp", "udp"} {
				rule := identity + " ip daddr " + gw + " " + transport + " dport 53 accept"
				intercept = append(intercept, rule)
				inputs = append(inputs, rule)
			}
		}
		intercept = append(intercept, identity+" ip daddr { "+netplan.PrivateDestinations+" } drop")
		intercept = append(intercept, identity+" meta l4proto tcp meta mark set 1 tproxy ip to :15001 accept")
		if bd.Active {
			inputs = append(inputs, identity+" meta mark 1 accept")
		}
	}
	set := map[string]bool{}
	for _, tag := range n.Keys() {
		node, _ := n.Get(tag)
		if node.Endpoint != nil {
			set["ip daddr "+node.Endpoint.IP+" tcp dport "+strconv.FormatInt(node.Endpoint.Port, 10)+" accept"] = true
		} else {
			set["ip daddr { "+netplan.PrivateDestinations+" } drop\n meta nfproto ipv4 meta l4proto tcp accept"] = true
		}
	}
	outputs := make([]string, 0, len(set))
	for s := range set {
		outputs = append(outputs, s)
	}
	sort.Strings(outputs)
	sort.SliceStable(outputs, func(i, j int) bool {
		return !strings.Contains(outputs[i], " drop") && strings.Contains(outputs[j], " drop")
	})
	return "table inet ccg_shared {\n chain intercept { type filter hook prerouting priority mangle; policy accept;\n" +
		strings.Join(intercept, "\n") + "\n }\n chain forward { type filter hook forward priority filter; policy drop; }\n" +
		"chain input { type filter hook input priority filter; policy drop;\n iifname \"lo\" accept\n" +
		"ct state established,related accept\n" + strings.Join(inputs, "\n") + "\n }\n" +
		"chain output { type filter hook output priority filter; policy drop;\n" +
		"oifname \"lo\" accept\n ct state established,related accept\n" + strings.Join(outputs, "\n") + "\n }\n}\n", nil
}

// DNSMap is dns.json: {<active binding ip>: {"port": n}} in binding order.
func DNSMap(b *store.Bindings) pyjson.Ordered {
	out := pyjson.Ordered{}
	for _, key := range b.Keys() {
		bd, _ := b.Get(key)
		if bd.Active {
			out.Set(bd.IP, pyjson.Ordered{{Key: "port", Value: bd.Port}})
		}
	}
	return out
}

// NFTReplace is the gateway command that atomically replaces ccg_shared.
const NFTReplace = `{ if nft list table inet ccg_shared >/dev/null 2>&1; then echo "delete table inet ccg_shared"; fi; ` +
	`cat /config/active.nft; } | nft -f -`

// APICommand is ["xray","api",action,"--server=127.0.0.1:10085"] plus
// "/config/operation.json" when an object is sent, plus a tag.
func APICommand(action string, withObject bool, tag string) []string {
	cmd := []string{"xray", "api", action, "--server=" + APIServer}
	if withObject {
		cmd = append(cmd, "/config/operation.json")
	}
	if tag != "" {
		cmd = append(cmd, tag)
	}
	return cmd
}

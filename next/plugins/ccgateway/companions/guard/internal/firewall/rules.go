// Package firewall computes and writes the guard's three iptables chains
// (03 §7): CCG-PROXY-BRIDGE (account → shared gateway veth exceptions),
// CCG-CONTROL-FWD (controller → Worker) and CCG-CONTROL-IN (only the
// controller reaches the guard).
package firewall

import (
	"net/netip"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/names"
)

// Rule is one rule's arguments after "-A <chain>".
type Rule []string

// String joins the arguments.
func (r Rule) String() string { return strings.Join(r, " ") }

// Chains are the chain names of one instance.
type Chains struct {
	Bridge     string
	ControlFwd string
	ControlIn  string
}

// ChainNames derives the chains from the chain prefix (CCG, CCG-GT).
func ChainNames(prefix string) Chains {
	return Chains{Bridge: prefix + "-PROXY-BRIDGE", ControlFwd: prefix + "-CONTROL-FWD", ControlIn: prefix + "-CONTROL-IN"}
}

// All lists the chains in write order.
func (c Chains) All() []string { return []string{c.Bridge, c.ControlFwd, c.ControlIn} }

// Jump is a chain's jump rule in a parent chain.
type Jump struct {
	Parent  string
	Chain   string
	Comment string
}

// Args are the jump's match and target.
func (j Jump) Args() []string {
	return []string{"-m", "comment", "--comment", j.Comment, "-j", j.Chain}
}

// JumpComment is the bridge guard's rule: the base comment for the
// production chain, base + "-" + lower(chain) for any other chain.
func JumpComment(base, chain, production string) string {
	if chain == production {
		return base
	}
	return base + "-" + strings.ToLower(chain)
}

// Jumps returns the three jumps (03 §7.1).
func (c Chains) Jumps() []Jump {
	return []Jump{
		{"DOCKER-USER", c.Bridge, JumpComment("ccgateway-managed-proxy-bridge", c.Bridge, "CCG-PROXY-BRIDGE")},
		{"DOCKER-USER", c.ControlFwd, JumpComment("ccgateway-managed-control-fwd", c.ControlFwd, "CCG-CONTROL-FWD")},
		{"INPUT", c.ControlIn, JumpComment("ccgateway-managed-control-in", c.ControlIn, "CCG-CONTROL-IN")},
	}
}

var vethRe = regexp.MustCompile(`^veth[0-9a-f]+$`)

// ValidVeth reports a Docker veth name.
func ValidVeth(s string) bool { return vethRe.MatchString(s) }

// BridgeInput is everything BridgeRules decides on (all from Docker and
// the host, nothing from the controller's state files).
type BridgeInput struct {
	AID          string
	App, Gateway *dockerapi.ContainerInfo
	Network      *dockerapi.NetworkInfo
	AppVeth      string
	GatewayVeth  string
	DefaultRoute string // the app namespace's single default route gateway; "" when none or several
	Prefix       string
}

// endpoint returns the address of c on network n when c is attached to
// exactly that network id.
func endpoint(c *dockerapi.ContainerInfo, n *dockerapi.NetworkInfo) (netip.Addr, bool) {
	ep, ok := c.NetworkSettings.Networks[n.Name]
	if !ok || ep.NetworkID != n.ID {
		return netip.Addr{}, false
	}
	a, err := netip.ParseAddr(ep.IPAddress)
	if err != nil || !a.Is4() {
		return netip.Addr{}, false
	}
	return a, true
}

// Subnet is the network's single IPv4 pool.
func Subnet(n *dockerapi.NetworkInfo) (netip.Prefix, bool) {
	for _, c := range n.IPAM.Config {
		p, err := netip.ParsePrefix(c.Subnet)
		if err == nil && p.Addr().Is4() {
			return p.Masked(), true
		}
	}
	return netip.Prefix{}, false
}

func hostAddr(a netip.Addr, p netip.Prefix) bool {
	if !p.Contains(a) || a == p.Addr() {
		return false
	}
	b := p.Addr().As4()
	v := uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	v |= (1 << (32 - p.Bits())) - 1
	return a != netip.AddrFrom4([4]byte{byte(v >> 24), byte(v >> 16), byte(v >> 8), byte(v)})
}

// accountApp checks the conditions shared by both account chains: the
// app runs, carries the account label, is attached only to <p>-<aid>-net,
// and the network is this account's internal network. It returns the
// app's address.
func accountApp(aid, prefix string, app *dockerapi.ContainerInfo, net *dockerapi.NetworkInfo) (netip.Addr, bool) {
	if !names.ValidKey(aid) || app == nil || net == nil {
		return netip.Addr{}, false
	}
	if app.State.Status != "running" || app.Label(names.LabelAccount) != aid {
		return netip.Addr{}, false
	}
	n := names.Names{Prefix: prefix}
	if net.Name != n.Net(aid) || !net.Internal || net.Label(names.LabelAccount) != aid {
		return netip.Addr{}, false
	}
	if len(app.NetworkSettings.Networks) != 1 {
		return netip.Addr{}, false
	}
	addr, ok := endpoint(app, net)
	if !ok {
		return netip.Addr{}, false
	}
	sub, ok := Subnet(net)
	if !ok || !hostAddr(addr, sub) {
		return netip.Addr{}, false
	}
	return addr, true
}

// BridgeRules is rules_for_account (03 §7.2): nil unless every condition
// holds.
func BridgeRules(in BridgeInput) []Rule {
	if !ValidVeth(in.AppVeth) || !ValidVeth(in.GatewayVeth) || in.AppVeth == in.GatewayVeth {
		return nil
	}
	app, ok := accountApp(in.AID, in.Prefix, in.App, in.Network)
	if !ok || in.Gateway == nil || in.Gateway.State.Status != "running" {
		return nil
	}
	if in.Gateway.Label(names.LabelShared) != in.Prefix {
		return nil
	}
	gw, ok := endpoint(in.Gateway, in.Network)
	if !ok || gw == app {
		return nil
	}
	sub, _ := Subnet(in.Network)
	if !hostAddr(gw, sub) {
		return nil
	}
	if in.DefaultRoute != gw.String() {
		return nil
	}
	a := app.String() + "/32"
	return []Rule{
		{"-m", "physdev", "--physdev-is-bridged", "--physdev-in", in.AppVeth, "--physdev-out", in.GatewayVeth,
			"-s", a, "-p", "tcp", "-m", "comment", "--comment", "ccgateway-" + in.AID + "-proxy-out", "-j", "ACCEPT"},
		{"-m", "physdev", "--physdev-is-bridged", "--physdev-in", in.GatewayVeth, "--physdev-out", in.AppVeth,
			"-d", a, "-m", "conntrack", "--ctstate", "ESTABLISHED,RELATED", "-m", "comment",
			"--comment", "ccgateway-" + in.AID + "-proxy-return", "-j", "ACCEPT"},
	}
}

// Control is the control network configuration.
type Control struct {
	Bridge       string // ccg-control0
	ControllerIP netip.Addr
	GuardIP      netip.Addr
	GuardPort    uint16
}

// ControlAccountRules lets the controller reach one Worker's 8787 (03
// §7.4). The gateway is not required.
func ControlAccountRules(aid, prefix string, app *dockerapi.ContainerInfo, net *dockerapi.NetworkInfo, c Control) []Rule {
	addr, ok := accountApp(aid, prefix, app, net)
	if !ok {
		return nil
	}
	br := net.BridgeName()
	if br == "" || len(br) > 15 {
		return nil
	}
	ctl := c.ControllerIP.String() + "/32"
	a := addr.String() + "/32"
	return []Rule{
		{"-i", c.Bridge, "-o", br, "-s", ctl, "-d", a, "-p", "tcp", "-m", "tcp", "--dport", "8787",
			"-m", "comment", "--comment", "ccgateway-" + aid + "-control", "-j", "ACCEPT"},
		{"-i", br, "-o", c.Bridge, "-s", a, "-d", ctl, "-p", "tcp", "-m", "tcp", "--sport", "8787",
			"-m", "conntrack", "--ctstate", "ESTABLISHED,RELATED", "-m", "comment", "--comment", "ccgateway-" + aid + "-control-return", "-j", "ACCEPT"},
	}
}

// ControlDNSRules let the controller reach Docker's upstream DNS servers
// on port 53 (D1).
func ControlDNSRules(servers []netip.Addr, c Control) []Rule {
	ctl := c.ControllerIP.String() + "/32"
	sorted := append([]netip.Addr(nil), servers...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Less(sorted[j]) })
	var out []Rule
	for i, s := range sorted {
		if i > 0 && s == sorted[i-1] {
			continue
		}
		d := s.String() + "/32"
		out = append(out,
			Rule{"-i", c.Bridge, "-s", ctl, "-d", d, "-p", "udp", "-m", "udp", "--dport", "53",
				"-m", "comment", "--comment", "ccgateway-control-dns", "-j", "ACCEPT"},
			Rule{"-i", c.Bridge, "-s", ctl, "-d", d, "-p", "tcp", "-m", "tcp", "--dport", "53",
				"-m", "comment", "--comment", "ccgateway-control-dns", "-j", "ACCEPT"},
			Rule{"-o", c.Bridge, "-s", d, "-d", ctl, "-m", "conntrack", "--ctstate", "ESTABLISHED,RELATED",
				"-m", "comment", "--comment", "ccgateway-control-dns-return", "-j", "ACCEPT"},
		)
	}
	return out
}

// ControlTail ends CCG-CONTROL-FWD.
func ControlTail(c Control) []Rule {
	return []Rule{
		{"-i", c.Bridge, "-m", "comment", "--comment", "ccgateway-control-egress-deny", "-j", "DROP"},
		{"-o", c.Bridge, "-m", "comment", "--comment", "ccgateway-control-ingress-deny", "-j", "DROP"},
	}
}

// ControlInRules is the static CCG-CONTROL-IN (03 §7.5).
func ControlInRules(c Control) []Rule {
	guard := c.GuardIP.String() + "/32"
	port := strconv.Itoa(int(c.GuardPort))
	return []Rule{
		{"-i", c.Bridge, "-s", c.ControllerIP.String() + "/32", "-d", guard, "-p", "tcp", "-m", "tcp", "--dport", port,
			"-m", "comment", "--comment", "ccgateway-control-guard", "-j", "ACCEPT"},
		{"-d", guard, "-p", "tcp", "-m", "tcp", "--dport", port, "-m", "comment", "--comment", "ccgateway-control-guard-deny", "-j", "DROP"},
		{"-i", c.Bridge, "-m", "conntrack", "--ctstate", "ESTABLISHED,RELATED", "-m", "comment", "--comment", "ccgateway-control-established", "-j", "ACCEPT"},
		{"-i", c.Bridge, "-m", "comment", "--comment", "ccgateway-control-host-deny", "-j", "DROP"},
	}
}

// RestoreScript is the iptables-restore --noflush input that replaces
// exactly the named chains (03 §7.6).
func RestoreScript(order []string, chains map[string][]Rule) string {
	var b strings.Builder
	b.WriteString("*filter\n")
	for _, name := range order {
		rules, ok := chains[name]
		if !ok {
			continue
		}
		b.WriteString(":" + name + " - [0:0]\n-F " + name + "\n")
		for _, r := range rules {
			b.WriteString("-A " + name + " " + r.String() + "\n")
		}
	}
	b.WriteString("COMMIT\n")
	return b.String()
}

// Cleanup prints the commands that remove the jumps and chains (03 §7.9).
func Cleanup(c Chains) []string {
	var out []string
	for _, j := range c.Jumps() {
		out = append(out, "iptables -w 5 -D "+j.Parent+" "+strings.Join(j.Args(), " "))
	}
	for _, ch := range c.All() {
		out = append(out, "iptables -w 5 -F "+ch, "iptables -w 5 -X "+ch)
	}
	return out
}

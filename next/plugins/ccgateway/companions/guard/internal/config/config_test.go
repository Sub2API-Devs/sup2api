package config

import (
	"errors"
	"net/netip"
	"strings"
	"testing"
)

const tok = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func env(m map[string]string) func(string) string { return func(k string) string { return m[k] } }

// covers: 03§10.1 production defaults; D1 control DNS on by default
func TestDefaults(t *testing.T) {
	c, err := Load(env(map[string]string{"CCG_GUARD_TOKEN": tok}), Options{RequireToken: true})
	if err != nil {
		t.Fatal(err)
	}
	if c.Prefix != "ccg" || c.Listen.String() != "172.29.255.1:8790" || c.ControllerIP.String() != "172.29.255.2" ||
		c.ControlNetwork != "ccg-control" || c.ControlBridge != "ccg-control0" || c.ControlSubnet.String() != "172.29.255.0/29" ||
		c.ChainPrefix != "CCG" || c.Project != "ccgateway" || c.ProjectDir != "/opt/ccgateway" ||
		c.RuntimeRoot != "/opt/ccgateway-runtime" || c.StateDir != "/var/lib/ccgateway-guard" ||
		c.DockerSocket != "/var/run/docker.sock" || !c.ControlDNS || !c.HasToken || c.Token[0] != 0x01 || c.SessionState {
		t.Fatalf("%+v", c)
	}
	if c.Chain("PROXY-BRIDGE") != "CCG-PROXY-BRIDGE" || c.Names().App("21") != "ccg-21-app" {
		t.Fatal("names")
	}
}

// covers: 03§10.1 isolated instance overrides every value
func TestIsolatedInstance(t *testing.T) {
	c, err := Load(env(map[string]string{
		"CCG_GUARD_TOKEN": tok, "CCG_GUARD_PREFIX": "ccg-gt", "CCG_GUARD_LISTEN": "172.29.255.9:8790",
		"CCG_GUARD_CONTROLLER_IP": "172.29.255.10", "CCG_GUARD_CONTROL_NETWORK": "ccg-gt-control",
		"CCG_GUARD_CONTROL_BRIDGE": "ccg-gt-ctl0", "CCG_GUARD_CONTROL_SUBNET": "172.29.255.8/29",
		"CCG_GUARD_CHAIN_PREFIX": "CCG-GT", "CCG_GUARD_PROJECT": "ccgateway-gt", "CCG_GUARD_PROJECT_DIR": "/opt/ccgateway-gt",
		"CCG_GUARD_RUNTIME_ROOT": "/opt/ccgateway-gt-runtime", "CCG_GUARD_CONTROL_DNS": "0",
		"CCG_GUARD_CONTROL_DNS_SERVERS": "1.1.1.1,8.8.8.8", "CCG_GUARD_SESSION_STATE": "1",
	}), Options{RequireToken: true})
	if err != nil {
		t.Fatal(err)
	}
	if c.Chain("PROXY-BRIDGE") != "CCG-GT-PROXY-BRIDGE" || c.ControlDNS || len(c.DNSServers) != 2 || c.Project != "ccgateway-gt" ||
		!c.SessionState {
		t.Fatalf("%+v", c)
	}
}

// covers: 03§10.1 every invalid value exits with the variable name, never the value
func TestRejects(t *testing.T) {
	cases := map[string]map[string]string{
		"CCG_GUARD_TOKEN":               {"CCG_GUARD_TOKEN": strings.ToUpper(tok)},
		"CCG_GUARD_PREFIX":              {"CCG_GUARD_PREFIX": "ccg-"},
		"CCG_GUARD_CONTROL_SUBNET":      {"CCG_GUARD_CONTROL_SUBNET": "172.29.255.0/31"},
		"CCG_GUARD_LISTEN":              {"CCG_GUARD_LISTEN": "172.29.254.1:8790"},
		"CCG_GUARD_CONTROLLER_IP":       {"CCG_GUARD_CONTROLLER_IP": "172.29.255.1"},
		"CCG_GUARD_CONTROL_BRIDGE":      {"CCG_GUARD_CONTROL_BRIDGE": "ccg-control-bridge0"},
		"CCG_GUARD_CHAIN_PREFIX":        {"CCG_GUARD_CHAIN_PREFIX": "ccg"},
		"CCG_GUARD_PROJECT":             {"CCG_GUARD_PROJECT": "Bad Name"},
		"CCG_GUARD_PROJECT_DIR":         {"CCG_GUARD_PROJECT_DIR": "/opt/../etc"},
		"CCG_GUARD_RUNTIME_ROOT":        {"CCG_GUARD_RUNTIME_ROOT": "relative"},
		"CCG_GUARD_PULL_REPOS":          {"CCG_GUARD_PULL_REPOS": "*"},
		"CCG_GUARD_LOAD_REPOS":          {"CCG_GUARD_LOAD_REPOS": "a/*/b"},
		"CCG_GUARD_CONTROL_DNS":         {"CCG_GUARD_CONTROL_DNS": "yes"},
		"CCG_GUARD_CONTROL_DNS_SERVERS": {"CCG_GUARD_CONTROL_DNS_SERVERS": "127.0.0.53"},
		"CCG_GUARD_LOG":                 {"CCG_GUARD_LOG": "trace"},
		"CCG_GUARD_SESSION_STATE":       {"CCG_GUARD_SESSION_STATE": "true"},
	}
	for v, m := range cases {
		m["CCG_GUARD_TOKEN"] = map[bool]string{true: m["CCG_GUARD_TOKEN"], false: tok}[v == "CCG_GUARD_TOKEN"]
		_, err := Load(env(m), Options{RequireToken: true})
		var e *Error
		if !errors.As(err, &e) || e.Var != v {
			t.Errorf("%s: %v", v, err)
			continue
		}
		if strings.Contains(err.Error(), m[v]) && len(m[v]) > 3 {
			t.Errorf("%s: error leaks the value", v)
		}
	}
	if _, err := Load(env(nil), Options{RequireToken: true}); err == nil {
		t.Fatal("missing token accepted")
	}
	if c, err := Load(env(nil), Options{}); err != nil || c.HasToken {
		t.Fatal("offline commands do not need the token")
	}
}

// covers: 03§10.1 repository patterns and §3.6.2 qualification
func TestPatterns(t *testing.T) {
	ps, err := ParsePatterns("ccgateway-*,ghcr.io/sub2api-devs/ccgateway-*")
	if err != nil {
		t.Fatal(err)
	}
	yes := []string{"ccgateway-app", "docker.io/library/ccgateway-controller", "ghcr.io/sub2api-devs/ccgateway-xray"}
	no := []string{"caddy", "ccgateway-x/caddy", "postgres", "ghcr.io/sub2api-devs/other", "ghcr.io/sub2api-devs/ccgateway-a/b",
		"evil.io/ccgateway-app", "library/ccgateway-app/x"}
	for _, r := range yes {
		if !MatchAny(ps, r) {
			t.Errorf("%s rejected", r)
		}
	}
	for _, r := range no {
		if MatchAny(ps, r) {
			t.Errorf("%s accepted", r)
		}
	}
	exact, _ := ParsePatterns("ghcr.io/x/y")
	if !MatchAny(exact, "ghcr.io/x/y") || MatchAny(exact, "ghcr.io/x/yz") {
		t.Fatal("exact pattern")
	}
	if Qualify("a/b") != "docker.io/a/b" || Qualify("localhost/x") != "localhost/x" || Qualify("r:5000/x") != "r:5000/x" {
		t.Fatal("qualify")
	}
	repo, tag, dig := SplitRef("r:5000/a/b:1.2@sha256:" + strings.Repeat("a", 64))
	if repo != "r:5000/a/b" || tag != "1.2" || dig != "sha256:"+strings.Repeat("a", 64) {
		t.Fatal(repo, tag, dig)
	}
	if repo, tag, _ := SplitRef("r:5000/a"); repo != "r:5000/a" || tag != "" {
		t.Fatal("port is not a tag")
	}
}

// covers: 03§2.3 InSubnet helpers
func TestAddressHelpers(t *testing.T) {
	p := netip.MustParsePrefix("10.0.0.0/24")
	if Broadcast(p).String() != "10.0.0.255" || First(p).String() != "10.0.0.1" {
		t.Fatal("broadcast")
	}
	if HostAddr(netip.MustParseAddr("10.0.0.0"), p) || HostAddr(netip.MustParseAddr("10.0.0.255"), p) ||
		!HostAddr(netip.MustParseAddr("10.0.0.1"), p) || HostAddr(netip.MustParseAddr("10.0.1.1"), p) {
		t.Fatal("hostaddr")
	}
}

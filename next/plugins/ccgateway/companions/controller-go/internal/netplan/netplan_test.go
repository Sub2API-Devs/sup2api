package netplan

import (
	"context"
	"encoding/json"
	"net/netip"
	"strings"
	"testing"

	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/pyreftest"
	"ccgateway/controller/internal/rnd"
)

func decode(t *testing.T, s string) any {
	t.Helper()
	v, err := pyjson.Decode([]byte(s))
	if err != nil {
		t.Fatal(err)
	}
	return v
}

// covers: N1 V8 S12 S39 (network_policy and its label, byte for byte)
func TestPolicyMatchesPython(t *testing.T) {
	for _, c := range pyreftest.Cases(t, "network_policy.json") {
		p, err := ParsePolicy(decode(t, pyreftest.Str(c, "raw")))
		if want := pyreftest.Str(c, "error"); want != "" {
			if err == nil {
				t.Errorf("%s: %s accepted as %+v; Python raised %s", c["name"], c["raw"], p, want)
			}
			continue
		}
		if err != nil {
			t.Errorf("%s: %s: %v", c["name"], c["raw"], err)
			continue
		}
		if got := string(pyjson.MustMarshal(p)); got != pyreftest.Str(c, "policy") {
			t.Errorf("%s: policy %s, want %s", c["name"], got, c["policy"])
		}
		if p.Label() != pyreftest.Str(c, "label") {
			t.Errorf("%s: label %s, want %s", c["name"], p.Label(), c["label"])
		}
	}
}

// covers: N2 N3 PV11 (sequential allocation)
func TestAllocationMatchesPython(t *testing.T) {
	var doc struct {
		Allocations []struct {
			Policy    string
			Occupied  []string
			Subnet    string
			Addresses []string
			Error     string
		}
	}
	pyreftest.Load(t, "network_policy.json", &doc)
	if len(doc.Allocations) < 10 {
		t.Fatal("allocation vectors missing")
	}
	for _, c := range doc.Allocations {
		var p Policy
		if err := json.Unmarshal([]byte(c.Policy), &p); err != nil {
			t.Fatal(err)
		}
		var occupied []netip.Prefix
		for _, o := range c.Occupied {
			occupied = append(occupied, netip.MustParsePrefix(o))
		}
		subnet, err := AllocateSubnet(p, occupied, rnd.Fixed(0))
		if c.Error != "" {
			if err != ErrExhausted {
				t.Errorf("%s %v: %v, want exhausted", c.Policy, c.Occupied, err)
			}
			continue
		}
		if err != nil || subnet.String() != c.Subnet {
			t.Errorf("%s %v: %s %v, want %s", c.Policy, c.Occupied, subnet, err, c.Subnet)
			continue
		}
		gw, app, err := AllocateAddresses(subnet, p.Allocation, rnd.Fixed(0))
		if err != nil || gw.String() != c.Addresses[0] || app.String() != c.Addresses[1] {
			t.Errorf("addresses of %s: %s %s, want %v", subnet, gw, app, c.Addresses)
		}
	}
}

// covers: N2 N3 (random allocation uses the source; never .0 .1 or broadcast)
func TestRandomAllocation(t *testing.T) {
	p := Policy{Pool: "10.0.0.0/22", Allocation: Random}
	s, err := AllocateSubnet(p, []netip.Prefix{netip.MustParsePrefix("10.0.1.0/24")}, rnd.Fixed(0, 1))
	if err != nil || s.String() != "10.0.2.0/24" {
		t.Fatal(s, err)
	}
	gw, app, err := AllocateAddresses(netip.MustParsePrefix("10.0.2.0/24"), Random, rnd.Fixed(0, 0, 0))
	if err != nil || gw.String() != "10.0.2.2" || app.String() != "10.0.2.3" {
		t.Fatal(gw, app, err)
	}
	r := rnd.Crypto()
	for i := 0; i < 200; i++ {
		gw, app, _ := AllocateAddresses(netip.MustParsePrefix("192.168.7.0/29"), Random, r)
		for _, a := range []netip.Addr{gw, app} {
			b := a.As4()[3]
			if b < 2 || b > 6 {
				t.Fatal(a)
			}
		}
		if gw == app {
			t.Fatal("distinct")
		}
	}
	if _, _, err := AllocateAddresses(netip.MustParsePrefix("10.0.0.0/30"), Sequential, r); err == nil {
		t.Fatal("a /30 has no two free hosts")
	}
	if _, err := AllocateSubnet(Policy{Pool: "bad"}, nil, r); err == nil {
		t.Fatal("bad pool")
	}
}

func texts(t *testing.T) map[string]string {
	out := map[string]string{}
	for _, c := range pyreftest.Cases(t, "texts.json") {
		out[pyreftest.Str(c, "name")] = pyreftest.Str(c, "text")
	}
	return out
}

// covers: N6 V24 (business_rules byte for byte)
func TestBusinessRulesMatchPython(t *testing.T) {
	want := texts(t)
	got, err := BusinessRules("10.1.2.3")
	if err != nil || got != want["network.business_rules(10.1.2.3)"] {
		t.Fatalf("business rules differ:\n%s", got)
	}
	if _, err := BusinessRules("010.1.2.3"); err == nil {
		t.Fatal("leading zero accepted")
	}
	for _, bad := range []string{"10.1.2.3; drop", "::1", ""} {
		if _, err := BusinessRules(bad); err == nil {
			t.Errorf("%q accepted", bad)
		}
	}
	if !strings.Contains(got, "policy drop") || strings.Contains(got, "ip6") {
		t.Fatal("no IPv6, default drop")
	}
}

// covers: N5 V10 BUG-5(fixed: validated at the entry)
func TestProxyValidationAndPinning(t *testing.T) {
	r := StaticResolver{"proxy.test": {"198.18.0.2", "198.18.0.3"}, "v6.test": {"::1"}}
	ok := []string{`{"protocol":"http","host":"proxy.test","port":8080}`,
		`{"protocol":"socks5","host":"proxy.test","port":"1080","username":"u"}`,
		`{"protocol":"https","host":"203.0.113.9","port":443.0}`}
	for _, s := range ok {
		p, err := PinProxy(context.Background(), r, decode(t, s))
		if err != nil {
			t.Fatalf("%s: %v", s, err)
		}
		if p.Server != "198.18.0.2" && p.Server != "203.0.113.9" {
			t.Fatalf("%s pinned to %s (first address)", s, p.Server)
		}
	}
	bad := []string{`null`, `[]`, `{}`, `{"protocol":"ftp","host":"h","port":1}`, `{"protocol":"http","host":"","port":1}`,
		`{"protocol":"http","host":"h","port":0}`, `{"protocol":"http","host":"h","port":65536}`, `{"protocol":"http","host":"h"}`,
		`{"protocol":"http","host":5,"port":1}`, `{"protocol":"http","host":"` + strings.Repeat("a", 254) + `","port":1}`,
		`{"protocol":"http","host":"h","port":"x"}`}
	for _, s := range bad {
		if _, err := ValidateProxy(decode(t, s)); err != ErrInvalidProxy {
			t.Errorf("%s: %v", s, err)
		}
	}
	if _, err := PinProxy(context.Background(), r, decode(t, `{"protocol":"http","host":"missing.test","port":1}`)); err == nil {
		t.Error("a lookup failure fails")
	}
	if _, err := PinProxy(context.Background(), r, decode(t, `{"protocol":"http","host":"::1","port":1}`)); err == nil {
		t.Error("an IPv6 literal fails")
	}
	f, _ := ValidateProxy(decode(t, `{"protocol":"http","host":"h","port":1,"username":null}`))
	if f.Username != nil || f.Password != "" {
		t.Errorf("username/password defaults: %#v %#v", f.Username, f.Password)
	}
}

// covers: Q1
func TestIsAddressLiteral(t *testing.T) {
	for h, want := range map[string]bool{"1.2.3.4": true, "::1": true, "proxy.test": false, "01.2.3.4": false, "": false} {
		if IsAddressLiteral(h) != want {
			t.Errorf("%q", h)
		}
	}
}

// covers: Q2 (the production resolver resolves an IPv4 literal locally)
func TestSystemResolver(t *testing.T) {
	addrs, err := SystemResolver().LookupIPv4(context.Background(), "127.0.0.1")
	if err != nil || len(addrs) != 1 || addrs[0].String() != "127.0.0.1" {
		t.Fatal(addrs, err)
	}
}

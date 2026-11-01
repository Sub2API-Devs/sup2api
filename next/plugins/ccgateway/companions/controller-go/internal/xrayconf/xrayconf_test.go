package xrayconf

import (
	"context"
	"strings"
	"testing"

	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/pyreftest"
	"ccgateway/controller/internal/store"
)

// covers: G5 RB5 S32 (outbound and tag byte for byte)
func TestNodeMatchesPython(t *testing.T) {
	for _, c := range pyreftest.Cases(t, "outbound_tag.json") {
		proxy, err := pyjson.Decode([]byte(pyreftest.Str(c, "proxy")))
		if err != nil {
			t.Fatal(err)
		}
		r := netplan.StaticResolver{}
		if ip := pyreftest.Str(c, "resolved"); ip != "" {
			p, _ := proxy.(pyjson.Ordered)
			host, _ := p.Get("host")
			r[host.(string)] = []string{ip}
		}
		n, err := Node(context.Background(), r, proxy, pyreftest.Str(c, "salt"))
		if err != nil {
			t.Fatalf("%s: %v", c["name"], err)
		}
		if got := string(pyjson.MustMarshal(n)); got != pyreftest.Str(c, "node") {
			t.Errorf("%s:\n got  %s\n want %s", c["name"], got, c["node"])
		}
		if n.Tag() != pyreftest.Str(c, "tag") {
			t.Errorf("%s: tag %s, want %s", c["name"], n.Tag(), c["tag"])
		}
	}
}

func texts(t *testing.T) map[string]string {
	out := map[string]string{}
	for _, c := range pyreftest.Cases(t, "texts.json") {
		out[pyreftest.Str(c, "name")] = pyreftest.Str(c, "text")
	}
	return out
}

func binding(ip, gw, iface string, port int64, tag string, active bool) *store.Binding {
	return store.NewBinding(ip, gw, "n1", "c1", iface, port, tag, strings.Repeat("a", 64), active)
}

// covers: G6 G7 S34 BUG-17(fixed) (gateway configuration texts)
func TestTextsMatchPython(t *testing.T) {
	want := texts(t)
	if got := string(pyjson.MustMarshal(Base())); got != want["json(shared_egress.BASE)"] {
		t.Errorf("BASE:\n%s", got)
	}
	empty, err := Firewall(&store.Bindings{}, &store.Nodes{})
	if err != nil || empty != want["shared_egress.firewall({},{})"] {
		t.Errorf("empty firewall:\n%s", empty)
	}
	b := &store.Bindings{}
	b.Set("21", binding("10.8.1.2", "10.8.1.3", "eth1", 20000, "proxy-aaa", true))
	fenced := binding("10.8.2.2", "10.8.2.3", "eth_2-b", 20001, "proxy-aaa", false)
	b.Set("22", fenced)
	pinned, err := Node(context.Background(), netplan.StaticResolver{"p.test": {"198.18.0.2"}},
		pyjson.Ordered{{Key: "protocol", Value: "http"}, {Key: "host", Value: "p.test"}, {Key: "port", Value: int64(8080)}}, "salt")
	if err != nil {
		t.Fatal(err)
	}
	nodes := &store.Nodes{}
	nodes.Set(pinned.Tag(), pinned)
	got, err := Firewall(b, nodes)
	if err != nil || got != want["shared_egress.firewall(active+fenced, pinned)"] {
		t.Errorf("firewall with a pinned node:\n%s\nwant\n%s", got, want["shared_egress.firewall(active+fenced, pinned)"])
	}
	direct, _ := NodeOf("salt", Direct(), nil)
	one := &store.Bindings{}
	one.Set("21", binding("10.8.1.2", "10.8.1.3", "eth1", 20000, "proxy-aaa", true))
	directNodes := &store.Nodes{}
	directNodes.Set(direct.Tag(), direct)
	if got, _ := Firewall(one, directNodes); got != want["shared_egress.firewall(active, direct)"] {
		t.Errorf("firewall with direct:\n%s", got)
	}
	r := &store.Bindings{}
	r.Set("22", fenced)
	r.Set("21", binding("10.8.1.2", "10.8.1.3", "eth1", 20000, "proxy-aaa", true))
	r.Set("3", binding("10.8.1.2", "10.8.1.3", "eth1", 20002, "proxy-aaa", true))
	if got := string(pyjson.MustMarshal(Routes(r))); got != want["json(shared_egress.routes(active+fenced))"] {
		t.Errorf("routes:\n%s", got)
	}
	if got := string(pyjson.MustMarshal(Inbound(20001))); got != want["json(shared_egress.inbound(20001))"] {
		t.Errorf("inbound: %s", got)
	}
}

// covers: BUG-17(fixed) G7 (several output rules come out sorted, endpoints before the direct drop)
func TestFirewallOutputIsDeterministic(t *testing.T) {
	b := &store.Bindings{}
	nodes := &store.Nodes{}
	for i, ip := range []string{"198.18.0.9", "198.18.0.2", "203.0.113.1"} {
		n, _ := NodeOf("s", pyjson.Ordered{{Key: "protocol", Value: "http"}, {Key: "n", Value: i}}, &store.Endpoint{IP: ip, Port: int64(1000 + i)})
		nodes.Set(n.Tag(), n)
	}
	d, _ := NodeOf("s", Direct(), nil)
	nodes.Set(d.Tag(), d)
	first, err := Firewall(b, nodes)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 20; i++ {
		if again, _ := Firewall(b, nodes); again != first {
			t.Fatal("output differs between calls")
		}
	}
	a := strings.Index(first, "ip daddr 198.18.0.2 tcp dport 1001 accept")
	z := strings.Index(first, "ip daddr 203.0.113.1 tcp dport 1002 accept")
	drop := strings.Index(first, "} drop\n meta nfproto")
	if a < 0 || z < 0 || drop < 0 || !(a < z && z < drop) {
		t.Fatalf("order:\n%s", first)
	}
}

// covers: V24 G7 (interface and address operands are checked)
func TestFirewallRejectsBadOperands(t *testing.T) {
	for _, bd := range []*store.Binding{
		binding("10.8.1.2", "10.8.1.3", "eth1; accept", 20000, "t", true),
		binding("10.8.1.2", "10.8.1.3", "", 20000, "t", true),
		binding("10.8.1.2", "10.8.1.3", "ethé", 20000, "t", true),
		binding("10.8.1.256", "10.8.1.3", "eth1", 20000, "t", true),
		binding("10.8.1.2", "gw", "eth1", 20000, "t", true),
	} {
		b := &store.Bindings{}
		b.Set("21", bd)
		if _, err := Firewall(b, &store.Nodes{}); err == nil {
			t.Errorf("%+v accepted", bd)
		}
	}
}

// covers: G8 S34 (dns.json and the API commands)
func TestDNSMapAndCommands(t *testing.T) {
	b := &store.Bindings{}
	b.Set("21", binding("10.8.1.2", "10.8.1.3", "eth1", 20000, "t", true))
	b.Set("22", binding("10.8.2.2", "10.8.2.3", "eth2", 20001, "t", false))
	if got := string(pyjson.MustMarshal(DNSMap(b))); got != `{"10.8.1.2": {"port": 20000}}` {
		t.Fatal(got)
	}
	if strings.Join(APICommand("ado", true, ""), " ") != "xray api ado --server=127.0.0.1:10085 /config/operation.json" ||
		strings.Join(APICommand("rmo", false, "proxy-x"), " ") != "xray api rmo --server=127.0.0.1:10085 proxy-x" {
		t.Fatal("commands")
	}
	if !strings.Contains(NFTReplace, "delete table inet ccg_shared") {
		t.Fatal(NFTReplace)
	}
}

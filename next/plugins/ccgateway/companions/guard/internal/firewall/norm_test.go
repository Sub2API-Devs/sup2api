package firewall

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// covers: 03§7.9 normalization: guard-written rules equal ovh's real `iptables -S` text
func TestNormalize(t *testing.T) {
	b, err := os.ReadFile(filepath.Join("..", "..", "testdata", "iptables", "ovh-proxy-bridge.txt"))
	if err != nil {
		t.Fatal(err)
	}
	kernel := ParseChain(string(b), "CCG-PROXY-BRIDGE")
	if len(kernel) != 4 {
		t.Fatalf("sample has %d rules", len(kernel))
	}
	written := []Rule{
		{"-m", "physdev", "--physdev-is-bridged", "--physdev-in", "veth1695e5c", "--physdev-out", "veth7622ec2",
			"-s", "10.52.74.112/32", "-p", "tcp", "-m", "comment", "--comment", "ccgateway-21-proxy-out", "-j", "ACCEPT"},
		{"-m", "physdev", "--physdev-is-bridged", "--physdev-in", "veth7622ec2", "--physdev-out", "veth1695e5c",
			"-d", "10.52.74.112/32", "-m", "conntrack", "--ctstate", "ESTABLISHED,RELATED", "-m", "comment",
			"--comment", "ccgateway-21-proxy-return", "-j", "ACCEPT"},
	}
	for i, w := range written {
		if Normalize(w) != Normalize(kernel[i]) {
			t.Fatalf("rule %d:\n%s\n%s", i, Normalize(w), Normalize(kernel[i]))
		}
	}
	if d := Diff(written, kernel[:2], false); len(d) != 0 {
		t.Fatal(d)
	}
	if d := Diff(written, kernel, false); len(d) != 2 || !strings.HasPrefix(d[0], "- ") {
		t.Fatal(d)
	}
	jump := ParseChain(string(b), "DOCKER-USER")
	if len(jump) != 1 || Normalize(jump[0]) != Normalize(ChainNames("CCG").Jumps()[0].Args()) {
		t.Fatal("jump")
	}
	// iptables -S adds -m tcp and /32 by itself.
	if Normalize(Rule{"-s", "10.0.0.1", "-p", "tcp", "--dport", "53", "-j", "ACCEPT"}) !=
		Normalize(Rule{"-s", "10.0.0.1/32", "-p", "tcp", "-m", "tcp", "--dport", "53", "-j", "ACCEPT"}) {
		t.Fatal("implicit -m tcp")
	}
	// Order of CONTROL chains matters.
	a := []Rule{{"-i", "x", "-j", "ACCEPT"}, {"-i", "x", "-j", "DROP"}}
	if len(Diff(a, []Rule{a[1], a[0]}, true)) == 0 || len(Diff(a, []Rule{a[1], a[0]}, false)) != 0 {
		t.Fatal("ordered diff")
	}
	if Normalize(Rule{"-m", "comment", "--comment", `"a b"`, "-j", "ACCEPT"}) != Normalize(Tokens(`-m comment --comment "a b" -j ACCEPT`)) {
		t.Fatal("quoted comment")
	}
	if Normalize(Rule{"!", "-d", "10.0.0.0/8", "-j", "DROP"}) == Normalize(Rule{"-d", "10.0.0.0/8", "-j", "DROP"}) {
		t.Fatal("negation lost")
	}
}

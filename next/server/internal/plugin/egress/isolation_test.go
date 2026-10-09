package egress

import (
	"context"
	"net"
	"net/netip"
	"strings"
	"sync"
	"testing"

	"golang.org/x/net/dns/dnsmessage"

	sdkegress "github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/egress"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// dialRecorder is a Dial that records its targets and connects to nothing
// real: the other end of a pipe that is closed at once.
type dialRecorder struct {
	mu     sync.Mutex
	dialed []string
}

func (d *dialRecorder) dial(_ context.Context, network, address string) (net.Conn, error) {
	d.mu.Lock()
	d.dialed = append(d.dialed, network+" "+address)
	d.mu.Unlock()
	a, b := net.Pipe()
	_ = b.Close()
	return a, nil
}

func (d *dialRecorder) list() []string {
	d.mu.Lock()
	defer d.mu.Unlock()
	return append([]string(nil), d.dialed...)
}

// isolationLookup resolves the names the isolation tests use.
func isolationLookup(_ context.Context, host string) ([]netip.Addr, error) {
	m := map[string][]string{
		"public.example":   {"93.184.216.34"},
		"internal.example": {"10.0.0.5"},
		"mixed.example":    {"93.184.216.34", "10.0.0.5"},
		"meta.example":     {"169.254.169.254"},
		"ula.example":      {"fd00::5"},
		"api.corp.example": {"192.168.10.2"},
		"redis.internal":   {"10.1.2.3"},
		"pg.internal":      {"10.1.2.4"},
		"alias.example":    {"10.1.2.3"}, // another name of the Redis host
		"localhost":        {"127.0.0.1", "::1"},
	}
	ips, ok := m[host]
	if !ok {
		return nil, &net.DNSError{Err: "no such host", Name: host, IsNotFound: true}
	}
	out := make([]netip.Addr, 0, len(ips))
	for _, s := range ips {
		out = append(out, netip.MustParseAddr(s))
	}
	return out, nil
}

func dialErr(address string) error {
	c, err := sdkegress.DialContext(context.Background(), "tcp", address)
	if err == nil {
		_ = c.Close()
	}
	return err
}

// Without the net grant nothing is reachable through the tunnel - not a
// public address, not DNS - whatever the mode says.
func TestEgressDeniedWithoutNetGrant(t *testing.T) {
	rec := &dialRecorder{}
	e := newStrictEnv(t, Options{Dial: rec.dial, LookupIP: isolationLookup})
	for _, pol := range []core.EgressPolicy{
		{Mode: PolicyAllowAll},
		{Mode: PolicyAllowlist, AllowedDomains: []string{"*"}},
		{},
	} {
		e.policy.set(pol)
		for _, target := range []string{"public.example:443", "93.184.216.34:443"} {
			if err := dialErr(target); err == nil || !strings.Contains(err.Error(), "no net permission") {
				t.Fatalf("%+v %s: %v", pol, target, err)
			}
		}
		if _, err := sdkegress.DialContext(context.Background(), "tcp", DNSHost+":53"); err == nil || !strings.Contains(err.Error(), "no net permission") {
			t.Fatalf("%+v dns: %v", pol, err)
		}
	}
	if d := rec.list(); len(d) != 0 {
		t.Fatalf("dialled without the net grant: %v", d)
	}
	// With the grant the same public target is dialled, at the checked address.
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowAll, Net: true})
	if err := dialErr("public.example:443"); err != nil {
		t.Fatal(err)
	}
	if d := rec.list(); len(d) != 1 || d[0] != "tcp 93.184.216.34:443" {
		t.Fatalf("dialled %v", d)
	}
}

// A provider without a policy function refuses everything.
func TestEgressNilPolicyDenies(t *testing.T) {
	p := newProvider(nil, Options{LookupIP: isolationLookup})
	t.Cleanup(p.Close)
	srv := p.ServerFor("demo", nil).(*server)
	if pol := srv.policy(); pol.Net || pol.Database {
		t.Fatalf("default policy %+v", pol)
	}
}

// Private, loopback, link-local (cloud metadata), CGNAT, ULA and
// unspecified addresses are refused under every policy, allow_all included,
// as literals and as the answer of a name; one non-public answer among
// public ones is enough.
func TestEgressDeniesNonPublicTargets(t *testing.T) {
	rec := &dialRecorder{}
	e := newStrictEnv(t, Options{Dial: rec.dial, LookupIP: isolationLookup})
	targets := []string{
		"10.0.0.1:80", "172.16.0.1:80", "192.168.1.1:80",
		"127.0.0.1:80", "[::1]:80", "0.0.0.0:80", "[::]:80", "[::ffff:127.0.0.1]:80",
		"169.254.169.254:80", "[fd00:ec2::254]:80", "100.100.100.200:80", "[fe80::1]:80",
		"localhost:80",
		"internal.example:443", "mixed.example:443", "meta.example:80", "ula.example:443",
	}
	for _, pol := range []core.EgressPolicy{
		{Mode: PolicyAllowAll, Net: true},
		{Mode: PolicyAllowlist, AllowedDomains: []string{"*"}, Net: true},
	} {
		e.policy.set(pol)
		for _, target := range targets {
			if err := dialErr(target); err == nil || !strings.Contains(err.Error(), "non-public") {
				t.Fatalf("%s under %+v: %v", target, pol, err)
			}
		}
	}
	// An allowlisted name that resolves inwards is refused too.
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowlist, AllowedDomains: []string{"*.corp.example"}, Net: true})
	if err := dialErr("api.corp.example:443"); err == nil || !strings.Contains(err.Error(), "non-public") {
		t.Fatalf("allowlisted private name: %v", err)
	}
	if d := rec.list(); len(d) != 0 {
		t.Fatalf("dialled non-public targets: %v", d)
	}
}

// A name that resolves publicly at check time and privately afterwards
// (DNS rebinding) is dialled at the checked public address.
func TestEgressRebindingDialsCheckedAddress(t *testing.T) {
	rec := &dialRecorder{}
	var mu sync.Mutex
	n := 0
	e := newStrictEnv(t, Options{Dial: rec.dial, LookupIP: func(context.Context, string) ([]netip.Addr, error) {
		mu.Lock()
		defer mu.Unlock()
		n++
		if n == 1 {
			return []netip.Addr{netip.MustParseAddr("93.184.216.34")}, nil
		}
		return []netip.Addr{netip.MustParseAddr("10.0.0.5")}, nil
	}})
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowAll, Net: true})
	if err := dialErr("rebind.example:443"); err != nil {
		t.Fatal(err)
	}
	if d := rec.list(); len(d) != 1 || d[0] != "tcp 93.184.216.34:443" {
		t.Fatalf("dialled %v", d)
	}
	// The second resolution (now private) is refused.
	if err := dialErr("rebind.example:443"); err == nil || !strings.Contains(err.Error(), "non-public") {
		t.Fatalf("rebound name: %v", err)
	}
}

// The core's Redis and PostgreSQL are refused by name, by IP and by another
// name of the same address - even with the private-network test switch on.
// PostgreSQL is reachable only with the database exception, by its
// configured name.
func TestEgressDeniesCoreServices(t *testing.T) {
	rec := &dialRecorder{}
	opts := Options{Dial: rec.dial, LookupIP: isolationLookup,
		CoreAddrs: []string{"redis.internal:6379", "127.0.0.1:6380"}, DatabaseAddrs: []string{"pg.internal:5432"},
		AllowPrivate: true}
	e := newEnvRaw(t, nil, opts)
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowAll, Net: true})
	for _, target := range []string{
		"redis.internal:6379", "REDIS.internal.:6379", "10.1.2.3:6379", "alias.example:6379",
		"127.0.0.1:6380", "localhost:6380", "[::1]:6380", "0.0.0.0:6380",
		"pg.internal:5432", "10.1.2.4:5432",
	} {
		if err := dialErr(target); err == nil || !strings.Contains(err.Error(), "core service") {
			t.Fatalf("%s: %v", target, err)
		}
	}
	if d := rec.list(); len(d) != 0 {
		t.Fatalf("dialled core services: %v", d)
	}
	// Other ports of a private host are reachable only because the test
	// switch is on.
	if err := dialErr("10.1.2.3:8080"); err != nil {
		t.Fatalf("test switch: %v", err)
	}
	// A plugin with its own database reaches PostgreSQL by the configured
	// name (dialled by name), not Redis, and without net nothing else.
	e.policy.set(core.EgressPolicy{Database: true})
	if err := dialErr("pg.internal:5432"); err != nil {
		t.Fatalf("database exception: %v", err)
	}
	if err := dialErr("10.1.2.4:5432"); err == nil {
		t.Fatal("database reached by address instead of the configured name")
	}
	if err := dialErr("redis.internal:6379"); err == nil {
		t.Fatal("redis reached with the database exception")
	}
	if err := dialErr("public.example:443"); err == nil || !strings.Contains(err.Error(), "no net permission") {
		t.Fatalf("database-only plugin reached the internet: %v", err)
	}
	if d := rec.list(); len(d) != 2 || d[1] != "tcp pg.internal:5432" {
		t.Fatalf("dialled %v", d)
	}
}

// The tunnel's resolver does not hand out non-public answers.
func TestEgressDNSHidesNonPublicAnswers(t *testing.T) {
	e := newStrictEnv(t, Options{LookupIP: isolationLookup})
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowAll, Net: true})
	if m := rawDNS(t, "internal.example.", dnsmessage.TypeA); len(m.Answers) != 0 {
		t.Fatalf("private answer handed out: %+v", m.Answers)
	}
	m := rawDNS(t, "mixed.example.", dnsmessage.TypeA)
	if len(m.Answers) != 1 || m.Answers[0].Body.(*dnsmessage.AResource).A != [4]byte{93, 184, 216, 34} {
		t.Fatalf("mixed answers: %+v", m.Answers)
	}
}

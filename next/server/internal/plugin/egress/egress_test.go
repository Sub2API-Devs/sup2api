package egress

import (
	"context"
	"encoding/binary"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"runtime"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"golang.org/x/net/dns/dnsmessage"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	sdkegress "github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/egress"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// echoTCP starts a TCP echo server that closes after the peer half-closes.
func echoTCP(t *testing.T) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = ln.Close() })
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go func() {
				defer c.Close()
				_, _ = io.Copy(c, c)
			}()
		}
	}()
	return ln.Addr().String()
}

type policyBox struct {
	mu  sync.Mutex
	pol core.EgressPolicy
}

func (b *policyBox) get() core.EgressPolicy {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.pol
}

func (b *policyBox) set(p core.EgressPolicy) {
	b.mu.Lock()
	b.pol = p
	b.mu.Unlock()
}

type env struct {
	p      *Provider
	client pluginv1.EgressServiceClient
	policy *policyBox
}

// newEnv serves Provider.ServerFor("demo") over bufconn. Host names ending
// in ".test" resolve to 127.0.0.1 (and ::1 for "v6.test").
func newEnv(t *testing.T, db *store.DB, opts Options) *env {
	t.Helper()
	opts.NodeID = "node-1"
	opts.FlushInterval = 20 * time.Millisecond
	lookup := func(_ context.Context, host string) ([]netip.Addr, error) {
		switch {
		case host == "v6.test":
			return []netip.Addr{netip.MustParseAddr("127.0.0.1"), netip.MustParseAddr("::1")}, nil
		case strings.HasSuffix(host, ".test"):
			return []netip.Addr{netip.MustParseAddr("127.0.0.1")}, nil
		case host == "broken.invalid":
			return nil, errors.New("resolver exploded")
		}
		return nil, &net.DNSError{Err: "no such host", Name: host, IsNotFound: true}
	}
	if opts.LookupIP == nil {
		opts.LookupIP = lookup
	}
	if opts.Dial == nil {
		d := &net.Dialer{}
		opts.Dial = func(ctx context.Context, network, address string) (net.Conn, error) {
			host, port, _ := net.SplitHostPort(address)
			if strings.HasSuffix(host, ".test") {
				address = net.JoinHostPort("127.0.0.1", port)
			}
			return d.DialContext(ctx, network, address)
		}
	}
	p := New(db, opts)
	t.Cleanup(p.Close)
	box := &policyBox{pol: core.EgressPolicy{Mode: PolicyAllowAll}}
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	pluginv1.RegisterEgressServiceServer(srv, p.ServerFor("demo", box.get))
	go func() { _ = srv.Serve(lis) }()
	cc, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = cc.Close(); srv.Stop() })
	client := pluginv1.NewEgressServiceClient(cc)
	oldT, oldR := http.DefaultTransport, net.DefaultResolver
	t.Cleanup(func() { http.DefaultTransport, net.DefaultResolver = oldT, oldR })
	if err := sdkegress.Install(client); err != nil {
		t.Fatal(err)
	}
	return &env{p: p, client: client, policy: box}
}

func TestAllowedHost(t *testing.T) {
	pol := core.EgressPolicy{Mode: PolicyAllowlist, AllowedDomains: []string{"api.example.com", "*.hooks.io", " Mixed.Case.ORG. "}}
	cases := map[string]bool{
		"api.example.com":   true,
		"API.EXAMPLE.COM.":  true,
		"x.api.example.com": false,
		"example.com":       false,
		"a.hooks.io":        true,
		"a.b.hooks.io":      true,
		"hooks.io":          false,
		"evilhooks.io":      false,
		"mixed.case.org":    true,
		"":                  false,
	}
	for h, want := range cases {
		if got := AllowedHost(pol, h); got != want {
			t.Errorf("%q: got %v want %v", h, got, want)
		}
	}
	if !AllowedHost(core.EgressPolicy{Mode: PolicyAllowAll}, "anything") || !AllowedHost(core.EgressPolicy{}, "x") {
		t.Fatal("allow_all")
	}
	if !AllowedHost(core.EgressPolicy{Mode: PolicyAllowlist, AllowedDomains: []string{"*"}}, "x.y") {
		t.Fatal("star")
	}
}

func TestTunnelEchoAndHalfClose(t *testing.T) {
	e := newEnv(t, nil, Options{})
	addr := echoTCP(t)
	c, err := sdkegress.DialContext(context.Background(), "tcp", addr)
	if err != nil {
		t.Fatal(err)
	}
	payload := strings.Repeat("hello egress ", 20000) // ~260 KB, many frames
	go func() {
		_, _ = c.Write([]byte(payload))
		_ = c.(interface{ CloseWrite() error }).CloseWrite()
	}()
	got, err := io.ReadAll(c)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != payload {
		t.Fatalf("echo mismatch: %d vs %d bytes", len(got), len(payload))
	}
	_ = c.Close()
	_ = e
}

func TestHTTPThroughDefaultTransport(t *testing.T) {
	newEnv(t, nil, Options{})
	hs := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "hi "+r.Host)
	}))
	defer hs.Close()
	_, port, _ := net.SplitHostPort(strings.TrimPrefix(hs.URL, "http://"))
	resp, err := http.Get("http://svc.test:" + port + "/x")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if string(body) != "hi svc.test:"+port {
		t.Fatalf("body %q", body)
	}
	// A cloned transport also goes through the tunnel.
	tr := http.DefaultTransport.(*http.Transport).Clone()
	resp, err = (&http.Client{Transport: tr}).Get("http://svc.test:" + port + "/y")
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
}

func TestPolicyDeniesAndDialErrors(t *testing.T) {
	e := newEnv(t, nil, Options{AlwaysAllow: []string{"db.internal.test:5432"}})
	addr := echoTCP(t)
	_, port, _ := net.SplitHostPort(addr)
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowlist, AllowedDomains: []string{"*.good.test"}})

	if _, err := sdkegress.DialContext(context.Background(), "tcp", "evil.test:"+port); err == nil ||
		!strings.Contains(err.Error(), "not allowed") {
		t.Fatalf("denied host: %v", err)
	}
	c, err := sdkegress.DialContext(context.Background(), "tcp", "api.good.test:"+port)
	if err != nil {
		t.Fatalf("allowed host: %v", err)
	}
	_ = c.Close()
	// AlwaysAllow bypasses the policy (reaches nothing here: dial error, not denial).
	_, err = sdkegress.DialContext(context.Background(), "tcp", "db.internal.test:5432")
	if err == nil || strings.Contains(err.Error(), "not allowed") {
		t.Fatalf("always-allow: %v", err)
	}
	// Dial error from the target.
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowAll})
	ln, _ := net.Listen("tcp", "127.0.0.1:0")
	dead := ln.Addr().String()
	_ = ln.Close()
	if _, err := sdkegress.DialContext(context.Background(), "tcp", dead); err == nil {
		t.Fatal("dial to closed port succeeded")
	}
	// Bad addresses are rejected by the host.
	if _, err := sdkegress.DialContext(context.Background(), "tcp", "no-port"); err == nil {
		t.Fatal("bad address accepted")
	}
}

func TestDialTimeout(t *testing.T) {
	newEnv(t, nil, Options{
		DialTimeout: 100 * time.Millisecond,
		Dial: func(ctx context.Context, _, _ string) (net.Conn, error) {
			<-ctx.Done()
			return nil, ctx.Err()
		},
	})
	start := time.Now()
	if _, err := sdkegress.DialContext(context.Background(), "tcp", "slow.test:80"); err == nil {
		t.Fatal("expected timeout")
	}
	if time.Since(start) > 3*time.Second {
		t.Fatal("dial timeout not applied")
	}
}

// rawDNS sends one DNS-over-TCP query through the tunnel.
func rawDNS(t *testing.T, name string, qtype dnsmessage.Type) dnsmessage.Message {
	t.Helper()
	c, err := sdkegress.DialContext(context.Background(), "tcp", "dns.sub2api:53")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	b := dnsmessage.NewBuilder(nil, dnsmessage.Header{ID: 42, RecursionDesired: true})
	_ = b.StartQuestions()
	_ = b.Question(dnsmessage.Question{Name: dnsmessage.MustNewName(name), Type: qtype, Class: dnsmessage.ClassINET})
	q, _ := b.Finish()
	frame := binary.BigEndian.AppendUint16(nil, uint16(len(q)))
	if _, err := c.Write(append(frame, q...)); err != nil {
		t.Fatal(err)
	}
	var lb [2]byte
	if _, err := io.ReadFull(c, lb[:]); err != nil {
		t.Fatal(err)
	}
	resp := make([]byte, binary.BigEndian.Uint16(lb[:]))
	if _, err := io.ReadFull(c, resp); err != nil {
		t.Fatal(err)
	}
	var m dnsmessage.Message
	if err := m.Unpack(resp); err != nil {
		t.Fatal(err)
	}
	if m.Header.ID != 42 || !m.Header.Response {
		t.Fatalf("header %+v", m.Header)
	}
	return m
}

func TestDNSOverTunnel(t *testing.T) {
	e := newEnv(t, nil, Options{})
	m := rawDNS(t, "v6.test.", dnsmessage.TypeA)
	if m.Header.RCode != dnsmessage.RCodeSuccess || len(m.Answers) != 1 {
		t.Fatalf("A: %+v", m)
	}
	if a := m.Answers[0].Body.(*dnsmessage.AResource).A; a != [4]byte{127, 0, 0, 1} {
		t.Fatalf("A %v", a)
	}
	m = rawDNS(t, "v6.test.", dnsmessage.TypeAAAA)
	if len(m.Answers) != 1 || m.Answers[0].Body.(*dnsmessage.AAAAResource).AAAA != netip.MustParseAddr("::1").As16() {
		t.Fatalf("AAAA: %+v", m.Answers)
	}
	m = rawDNS(t, "svc.test.", dnsmessage.TypeAAAA) // v4 only: NODATA
	if m.Header.RCode != dnsmessage.RCodeSuccess || len(m.Answers) != 0 {
		t.Fatalf("NODATA: %+v", m)
	}
	if m = rawDNS(t, "missing.example.", dnsmessage.TypeA); m.Header.RCode != dnsmessage.RCodeNameError {
		t.Fatalf("NXDOMAIN: %v", m.Header.RCode)
	}
	if m = rawDNS(t, "broken.invalid.", dnsmessage.TypeA); m.Header.RCode != dnsmessage.RCodeServerFailure {
		t.Fatalf("SERVFAIL: %v", m.Header.RCode)
	}
	if m = rawDNS(t, "svc.test.", dnsmessage.TypeMX); m.Header.RCode != dnsmessage.RCodeNotImplemented {
		t.Fatalf("MX: %v", m.Header.RCode)
	}
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowlist, AllowedDomains: []string{"ok.test"}})
	if m = rawDNS(t, "svc.test.", dnsmessage.TypeA); m.Header.RCode != dnsmessage.RCodeRefused {
		t.Fatalf("policy: %v", m.Header.RCode)
	}
	if m = rawDNS(t, "ok.test.", dnsmessage.TypeA); len(m.Answers) != 1 {
		t.Fatalf("allowed: %+v", m)
	}
}

func TestGoResolverUsesTunnel(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("the pure Go resolver is not used for LookupHost on Windows")
	}
	newEnv(t, nil, Options{})
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	addrs, err := net.DefaultResolver.LookupHost(ctx, "v6.test.")
	if err != nil {
		t.Fatal(err)
	}
	slices.Sort(addrs)
	if !slices.Equal(addrs, []string{"127.0.0.1", "::1"}) {
		t.Fatalf("addrs %v", addrs)
	}
}

func TestEgressLogsWritten(t *testing.T) {
	db := testutil.DB(t)
	e := newEnv(t, db, Options{})
	addr := echoTCP(t)
	_, port, _ := net.SplitHostPort(addr)
	c, err := sdkegress.DialContext(context.Background(), "tcp", "svc.test:"+port)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = c.Write([]byte("12345"))
	buf := make([]byte, 5)
	_, _ = io.ReadFull(c, buf)
	_ = c.(interface{ CloseWrite() error }).CloseWrite()
	_, _ = io.ReadAll(c)
	_ = c.Close()
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowlist})
	_, _ = sdkegress.DialContext(context.Background(), "tcp", "blocked.test:443")
	e.policy.set(core.EgressPolicy{Mode: PolicyAllowAll})
	rawDNS(t, "svc.test.", dnsmessage.TypeA)

	ctx := context.Background()
	var sum []HostSummary
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		_ = e.p.Flush(ctx)
		sum, err = Summary(ctx, db.Pool, "demo", time.Now().Add(-time.Hour), time.Now().Add(time.Hour))
		if err != nil {
			t.Fatal(err)
		}
		var total int64
		for _, s := range sum {
			total += s.Connections
		}
		if total >= 3 {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	by := map[string]HostSummary{}
	for _, s := range sum {
		by[s.Host] = s
	}
	svc := by["svc.test"]
	if svc.Connections != 2 || svc.BytesIn < 5 || svc.BytesOut < 5 { // one tcp + one dns row
		t.Fatalf("svc summary %+v (all %+v)", svc, sum)
	}
	if by["blocked.test"].Denied != 1 {
		t.Fatalf("blocked summary %+v", by["blocked.test"])
	}
	rows, err := List(ctx, db.Pool, "demo", time.Now().Add(-time.Hour), time.Now().Add(time.Hour), 10)
	if err != nil {
		t.Fatal(err)
	}
	var tcpRow, dnsRow bool
	for _, r := range rows {
		if r.NodeID != "node-1" {
			t.Fatalf("node id %q", r.NodeID)
		}
		if r.Network == "tcp" && r.Host == "svc.test" && r.Result == ResultOK && r.BytesOut == 5 && r.BytesIn == 5 {
			tcpRow = true
		}
		if r.Network == "dns" && r.Host == "svc.test" && r.Port == 53 {
			dnsRow = true
		}
	}
	if !tcpRow || !dnsRow {
		t.Fatalf("rows %+v", rows)
	}
}

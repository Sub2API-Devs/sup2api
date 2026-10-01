package proxy

import (
	"bufio"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/shell/internal/peer"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"io"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestPublicScrubsInternalHeadersAndPreservesBusinessRequest(t *testing.T) {
	var calls atomic.Int64
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		calls.Add(1)
		b, _ := io.ReadAll(q.Body)
		if q.Header.Get(hopHeader) != "" || q.Header.Get("X-Forwarded-For") != "192.0.2.1" || q.Header.Get("Authorization") != "Bearer secret" || q.URL.RequestURI() != "/v1/videos?id=x" || string(b) != "body" {
			t.Errorf("request not preserved safely: %s %#v %s", q.URL, q.Header, b)
		}
		w.WriteHeader(201)
	}))
	defer up.Close()
	r := New(Config{})
	if e := r.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "b", Revision: 1}); e != nil {
		t.Fatal(e)
	}
	q := httptest.NewRequest("POST", "http://public/v1/videos?id=x", strings.NewReader("body"))
	q.Header.Set(hopHeader, "9")
	q.Header.Set("X-Forwarded-For", "attacker")
	q.Header.Set("Authorization", "Bearer secret")
	w := httptest.NewRecorder()
	r.Public().ServeHTTP(w, q)
	if w.Code != 201 || calls.Load() != 1 {
		t.Fatalf("status %d calls %d", w.Code, calls.Load())
	}
}
func TestNoReplayAfterUpstreamDisconnect(t *testing.T) {
	var calls atomic.Int64
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		calls.Add(1)
		io.Copy(io.Discard, q.Body)
		c, _, e := w.(http.Hijacker).Hijack()
		if e != nil {
			t.Error(e)
			return
		}
		c.Close()
	}))
	defer up.Close()
	r := New(Config{})
	r.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "b"})
	for _, method := range []string{"GET", "POST"} {
		q := httptest.NewRequest(method, "http://public/charge", strings.NewReader("body"))
		q.Header.Set("Idempotency-Key", "still-no-shell-retry")
		w := httptest.NewRecorder()
		r.Public().ServeHTTP(w, q)
		if w.Code != 502 {
			t.Fatalf("unexpected code %d", w.Code)
		}
	}
	if calls.Load() != 2 {
		t.Fatalf("upstream request replayed %d times", calls.Load())
	}
}
func TestSSEFlushAndCancellation(t *testing.T) {
	cancelled := make(chan struct{})
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		io.WriteString(w, "data: first\n\n")
		w.(http.Flusher).Flush()
		<-q.Context().Done()
		close(cancelled)
	}))
	defer up.Close()
	r := New(Config{})
	r.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "b"})
	srv := httptest.NewServer(r.Public())
	defer srv.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", srv.URL+"/stream", nil)
	res, e := http.DefaultClient.Do(req)
	if e != nil {
		t.Fatal(e)
	}
	line, e := bufio.NewReader(res.Body).ReadString('\n')
	if e != nil || line != "data: first\n" {
		t.Fatalf("SSE not flushed %q %v", line, e)
	}
	cancel()
	res.Body.Close()
	select {
	case <-cancelled:
	case <-time.After(time.Second):
		t.Fatal("upstream did not receive cancellation")
	}
}
func TestPrivateRejectsUntrustedStaleAndForwardOnly(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) }))
	defer up.Close()
	_, b := testPeers(t)
	r := New(Config{})
	r.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "boot", Revision: 7})
	handler := b.Middleware(r.Private())
	request := func(auth bool, revision, boot string) int {
		q := httptest.NewRequest("GET", "https://private/internal/forward/v1/videos", nil)
		if auth {
			q.Header.Set(peer.NodeHeader, "a")
			q.Header.Set(peer.BootHeader, "a-boot")
			q.Header.Set(peer.KeyHeader, strings.Repeat("a", 32))
		}
		q.Header.Set(hopHeader, "1")
		q.Header.Set(revisionHeader, revision)
		q.Header.Set(bootHeader, boot)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, q)
		return w.Code
	}
	if c := request(false, "7", "boot"); c != 401 {
		t.Fatal(c)
	}
	if c := request(true, "6", "boot"); c != 409 {
		t.Fatal(c)
	}
	if c := request(true, "7", "oldboot"); c != 409 {
		t.Fatal(c)
	}
	if c := request(true, "7", "boot"); c != 204 {
		t.Fatal(c)
	}
	r.SetRoute(Route{Mode: "candidate", Revision: 8})
	if c := request(true, "8", "boot"); c != 409 {
		t.Fatalf("candidate forwarded request %d", c)
	}
}
func TestRouteRevisionCannotRegress(t *testing.T) {
	r := New(Config{})
	if e := r.SetRoute(Route{Mode: "maintenance", Revision: 10}); e != nil {
		t.Fatal(e)
	}
	if e := r.SetRoute(Route{Mode: "maintenance", Revision: 9}); e == nil {
		t.Fatal("accepted stale route")
	}
}

func TestTLSRedisSingleHopUsesPeerRevision(t *testing.T) {
	sourceAuth, targetAuth := testPeers(t)
	pub, priv, e := ed25519.GenerateKey(rand.Reader)
	if e != nil {
		t.Fatal(e)
	}
	template := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "test cluster"}, NotBefore: time.Now().Add(-time.Minute), NotAfter: time.Now().Add(time.Hour), IsCA: true, BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth}, DNSNames: []string{"node-a"}, IPAddresses: []net.IP{net.ParseIP("127.0.0.1")}}
	der, e := x509.CreateCertificate(rand.Reader, template, template, pub, priv)
	if e != nil {
		t.Fatal(e)
	}
	parsed, e := x509.ParseCertificate(der)
	if e != nil {
		t.Fatal(e)
	}
	pool := x509.NewCertPool()
	pool.AddCert(parsed)
	cert := tls.Certificate{Certificate: [][]byte{der}, PrivateKey: priv}
	var calls atomic.Int64
	var expectedScheme atomic.Value
	expectedScheme.Store("http")
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		calls.Add(1)
		if q.URL.RequestURI() != "/v1/a%2Fb?q=ok" || q.Header.Get("X-Forwarded-Proto") != expectedScheme.Load().(string) || q.Header.Get("X-Forwarded-For") != "192.0.2.1" || q.Host != "public.example" {
			t.Errorf("forward metadata changed %s %s %#v", q.URL, q.Host, q.Header)
		}
		w.WriteHeader(201)
	}))
	defer up.Close()
	b := New(Config{})
	if e = b.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "b-boot", Revision: 7}); e != nil {
		t.Fatal(e)
	}
	private := httptest.NewUnstartedServer(targetAuth.Middleware(b.Private()))
	private.TLS = ServerTLS(cert, pool)
	private.StartTLS()
	defer private.Close()
	_, trusted, _ := net.ParseCIDR("10.0.0.0/8")
	clientTLS := &tls.Config{RootCAs: pool, MinVersion: tls.VersionTLS13}
	a := New(Config{TrustedProxies: []*net.IPNet{trusted}, PeerTLS: clientTLS, PeerTransport: sourceAuth.WrapTransport(PeerTransport(clientTLS), func(_ context.Context, u *url.URL) error {
		if u.String() == private.URL || u.Host == strings.TrimPrefix(private.URL, "https://") {
			return nil
		}
		return peer.ErrForbidden
	})})
	if e = a.SetRoute(Route{Mode: "forward-only", PeerURL: private.URL, Revision: 99, PeerRevision: 7, CoreBootID: "b-boot"}); e != nil {
		t.Fatal(e)
	}
	q := httptest.NewRequest("GET", "http://public.example/v1/a%2Fb?q=ok", nil)
	w := httptest.NewRecorder()
	a.Public().ServeHTTP(w, q)
	if w.Code != 201 || calls.Load() != 1 {
		t.Fatalf("mTLS forwarding status %d calls %d: %s", w.Code, calls.Load(), w.Body)
	}
	expectedScheme.Store("https")
	q.RemoteAddr = "10.0.0.1:12345"
	q.Header.Set("X-Forwarded-Proto", "https")
	q.Header.Set("X-Forwarded-For", "192.0.2.1")
	w = httptest.NewRecorder()
	a.Public().ServeHTTP(w, q)
	if w.Code != 201 || calls.Load() != 2 {
		t.Fatalf("TLS offload metadata did not survive the mTLS hop: %d, %d", w.Code, calls.Load())
	}
	// A receiving shell that is itself forwarding must not make a second hop.
	if e = b.SetRoute(Route{Mode: "candidate", Revision: 8}); e != nil {
		t.Fatal(e)
	}
	w = httptest.NewRecorder()
	a.Public().ServeHTTP(w, q)
	if w.Code != 503 || calls.Load() != 2 {
		t.Fatalf("second hop accepted: %d calls %d", w.Code, calls.Load())
	}
}

func TestTLSOffloadOnlyTrustsConfiguredDirectPeers(t *testing.T) {
	_, trusted, _ := net.ParseCIDR("10.0.0.0/8")
	cases := []struct {
		name, remote      string
		tls               bool
		proto, xff        []string
		wantProto, wantIP string
	}{
		{name: "trusted TLS terminator", remote: "10.0.0.1:1234", proto: []string{"https"}, xff: []string{"198.51.100.7"}, wantProto: "https", wantIP: "198.51.100.7"},
		{name: "untrusted spoofed headers", remote: "203.0.113.4:1234", proto: []string{"https"}, xff: []string{"198.51.100.7"}, wantProto: "http", wantIP: "203.0.113.4"},
		{name: "untrusted TLS downgrade", remote: "203.0.113.4:1234", tls: true, proto: []string{"http"}, xff: []string{"198.51.100.7"}, wantProto: "https", wantIP: "203.0.113.4"},
		{name: "ambiguous proto list", remote: "10.0.0.1:1234", proto: []string{"https, http"}, wantProto: "http", wantIP: "10.0.0.1"},
		{name: "duplicate proto headers", remote: "10.0.0.1:1234", proto: []string{"https", "http"}, wantProto: "http", wantIP: "10.0.0.1"},
		{name: "invalid proto", remote: "10.0.0.1:1234", proto: []string{"javascript"}, wantProto: "http", wantIP: "10.0.0.1"},
		{name: "missing proto preserves TLS", remote: "10.0.0.1:1234", tls: true, wantProto: "https", wantIP: "10.0.0.1"},
		{name: "trusted chain stops at client", remote: "10.0.0.1:1234", proto: []string{"https"}, xff: []string{"203.0.113.99, 198.51.100.7, 10.2.3.4"}, wantProto: "https", wantIP: "198.51.100.7"},
		{name: "duplicate XFF lines preserve chain", remote: "10.0.0.1:1234", proto: []string{"https"}, xff: []string{"203.0.113.99", "198.51.100.7, 10.2.3.4"}, wantProto: "https", wantIP: "198.51.100.7"},
		{name: "invalid closest XFF fails closed", remote: "10.0.0.1:1234", xff: []string{"203.0.113.99, malformed"}, wantProto: "http", wantIP: "10.0.0.1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
				if got := q.Header.Get("X-Forwarded-Proto"); got != tc.wantProto {
					t.Errorf("proto=%q want %q", got, tc.wantProto)
				}
				if got := q.Header.Get("X-Forwarded-For"); got != tc.wantIP {
					t.Errorf("IP=%q want %q", got, tc.wantIP)
				}
				w.WriteHeader(204)
			}))
			defer up.Close()
			router := New(Config{TrustedProxies: []*net.IPNet{trusted}})
			if err := router.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "boot"}); err != nil {
				t.Fatal(err)
			}
			q := httptest.NewRequest("GET", "http://public/", nil)
			q.RemoteAddr = tc.remote
			if tc.tls {
				q.TLS = &tls.ConnectionState{}
			}
			for _, v := range tc.proto {
				q.Header.Add("X-Forwarded-Proto", v)
			}
			for _, v := range tc.xff {
				q.Header.Add("X-Forwarded-For", v)
			}
			w := httptest.NewRecorder()
			router.Public().ServeHTTP(w, q)
			if w.Code != 204 {
				t.Fatalf("HTTP %d", w.Code)
			}
		})
	}
}

func TestUpgradedConnectionIsStreamedAndTracked(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		c, rw, e := w.(http.Hijacker).Hijack()
		if e != nil {
			t.Error(e)
			return
		}
		defer c.Close()
		rw.WriteString("HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n")
		rw.Flush()
		io.Copy(c, rw)
	}))
	defer up.Close()
	r := New(Config{})
	r.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "b"})
	srv := httptest.NewServer(r.Public())
	defer srv.Close()
	u, _ := url.Parse(srv.URL)
	c, e := net.DialTimeout("tcp", u.Host, time.Second)
	if e != nil {
		t.Fatal(e)
	}
	defer c.Close()
	c.SetDeadline(time.Now().Add(3 * time.Second))
	fmt.Fprintf(c, "GET /ws HTTP/1.1\r\nHost: public\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n")
	reader := bufio.NewReader(c)
	res, e := http.ReadResponse(reader, nil)
	if e != nil {
		t.Fatal(e)
	}
	if res.StatusCode != 101 {
		t.Fatalf("upgrade failed %d", res.StatusCode)
	}
	if r.Active() != 1 {
		t.Fatalf("upgraded connection not tracked: %d", r.Active())
	}
	if _, e = c.Write([]byte("streamed")); e != nil {
		t.Fatal(e)
	}
	buf := make([]byte, len("streamed"))
	if _, e = io.ReadFull(reader, buf); e != nil || string(buf) != "streamed" {
		t.Fatalf("duplex stream failed %q %v", buf, e)
	}
	c.Close()
	deadline := time.Now().Add(time.Second)
	for r.Active() != 0 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if r.Active() != 0 {
		t.Fatal("upgraded connection leaked active count")
	}
}

func testPeers(t *testing.T) (*peer.Manager, *peer.Manager) {
	t.Helper()
	db := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: db.Addr()})
	t.Cleanup(func() { client.Close() })
	create := func(node string) *peer.Manager {
		m, e := peer.New(peer.Config{Redis: client, Cluster: "test", NodeID: node, BootID: node + "-boot", ConfiguredKey: strings.Repeat(node, 32), Validate: func(context.Context, peer.Identity) error { return nil }, Register: func(context.Context) error { return nil }, WithRegistration: func(ctx context.Context, fn func(context.Context) error) error { return fn(ctx) }})
		if e != nil {
			t.Fatal(e)
		}
		if e = m.Maintain(context.Background()); e != nil {
			t.Fatal(e)
		}
		return m
	}
	return create("a"), create("b")
}

// forwardPair wires a forwarding source router to a target shell's private
// listener over verified TLS with Redis-authenticated node keys.
func forwardPair(t *testing.T, upstream http.Handler) (*Router, *peer.Manager, *peer.Manager) {
	t.Helper()
	sourceAuth, targetAuth := testPeers(t)
	pub, priv, e := ed25519.GenerateKey(rand.Reader)
	if e != nil {
		t.Fatal(e)
	}
	template := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "test cluster"}, NotBefore: time.Now().Add(-time.Minute), NotAfter: time.Now().Add(time.Hour), IsCA: true, BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, IPAddresses: []net.IP{net.ParseIP("127.0.0.1")}}
	der, e := x509.CreateCertificate(rand.Reader, template, template, pub, priv)
	if e != nil {
		t.Fatal(e)
	}
	parsed, e := x509.ParseCertificate(der)
	if e != nil {
		t.Fatal(e)
	}
	pool := x509.NewCertPool()
	pool.AddCert(parsed)
	up := httptest.NewServer(upstream)
	t.Cleanup(up.Close)
	b := New(Config{})
	if e = b.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "b-boot", Revision: 7}); e != nil {
		t.Fatal(e)
	}
	private := httptest.NewUnstartedServer(targetAuth.Middleware(b.Private()))
	private.TLS = ServerTLS(tls.Certificate{Certificate: [][]byte{der}, PrivateKey: priv}, pool)
	private.StartTLS()
	t.Cleanup(private.Close)
	clientTLS := &tls.Config{RootCAs: pool, MinVersion: tls.VersionTLS13}
	a := New(Config{PeerTLS: clientTLS, PeerTransport: sourceAuth.WrapTransport(PeerTransport(clientTLS), func(context.Context, *url.URL) error { return nil })})
	if e = a.SetRoute(Route{Mode: "forward-only", PeerURL: private.URL, Revision: 99, PeerRevision: 7, CoreBootID: "b-boot"}); e != nil {
		t.Fatal(e)
	}
	return a, sourceAuth, targetAuth
}

func TestForwardPreservesUnusualPathsAndQueries(t *testing.T) {
	var got atomic.Value
	a, _, _ := forwardPair(t, http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		got.Store(q.RequestURI)
		w.WriteHeader(204)
	}))
	for _, target := range []string{
		"/v1//double//slash",
		"/v1/./dot/../segments",
		"/v1/a%2Fb/%2e%2e/c",
		"/v1/x?a=1&a=2",
		"/v1/x?",
		"/v1/x?&&q=%20+%26",
		"/v1/%E4%B8%AD?k=%E4%B8%AD",
	} {
		got.Store("")
		q := httptest.NewRequest("GET", "http://public.example"+target, nil)
		w := httptest.NewRecorder()
		a.Public().ServeHTTP(w, q)
		if w.Code != 204 || got.Load().(string) != target {
			t.Errorf("%s: status %d, core saw %q", target, w.Code, got.Load())
		}
	}
}

func TestBusinessAuthFailuresPassButNodeFailuresBecome503(t *testing.T) {
	a, sourceAuth, targetAuth := forwardPair(t, http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		if q.Header.Get(peer.KeyHeader) != "" || q.Header.Get(peer.NodeHeader) != "" {
			t.Error("node credentials reached the core")
		}
		// A core cannot make its own response look like a node failure.
		w.Header().Set(peer.ErrorHeader, "1")
		if q.Header.Get("Authorization") == "Bearer good" {
			w.WriteHeader(403)
			return
		}
		w.WriteHeader(401)
	}))
	for auth, want := range map[string]int{"Bearer good": 403, "Bearer bad": 401} {
		q := httptest.NewRequest("POST", "http://public.example/v1/chat", strings.NewReader("{}"))
		q.Header.Set("Authorization", auth)
		w := httptest.NewRecorder()
		a.Public().ServeHTTP(w, q)
		if w.Code != want || w.Header().Get(peer.ErrorHeader) != "" {
			t.Fatalf("%s: got %d %v, want business %d", auth, w.Code, w.Header(), want)
		}
	}
	// A target that lost its own registration answers with an internal 401;
	// a source that lost its registration never sends. Clients see 503 either way.
	for _, lost := range []*peer.Manager{targetAuth, sourceAuth} {
		if e := lost.Unregister(context.Background()); e != nil {
			t.Fatal(e)
		}
		q := httptest.NewRequest("POST", "http://public.example/v1/chat", strings.NewReader("{}"))
		q.Header.Set("Authorization", "Bearer good")
		w := httptest.NewRecorder()
		a.Public().ServeHTTP(w, q)
		if w.Code != 503 || w.Header().Get(peer.ErrorHeader) != "" || w.Header().Get("Retry-After") == "" {
			t.Fatalf("node failure leaked as %d %v", w.Code, w.Header())
		}
	}
}

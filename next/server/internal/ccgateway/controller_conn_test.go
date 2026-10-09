package ccgateway

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestControllerOpenTrust(t *testing.T) {
	var mu sync.Mutex
	protos := []string{}
	_, host, port, ca := tlsPanel(t, func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		protos = append(protos, r.Proto)
		mu.Unlock()
		if r.URL.Path == "/moved" {
			http.Redirect(w, r, "/health", http.StatusFound)
			return
		}
		if r.URL.Path != "/health" || r.Header.Get("Authorization") != "Bearer "+panelKey {
			w.WriteHeader(401)
			return
		}
		_, _ = w.Write([]byte(`{"version":"v1","features":["tunnel","uploads"]}`))
	})
	other := otherCA(t)
	s := &Service{}
	ctx := context.Background()
	cfg := testPanelConfig(host, port, ca)
	h, err := s.health(ctx, cfg)
	if err != nil || h.Version != "v1" || !h.has("tunnel") {
		t.Fatalf("pinned CA: %+v %v", h, err)
	}
	mu.Lock()
	if len(protos) != 1 || protos[0] != "HTTP/1.1" {
		t.Fatalf("protocol: %v", protos)
	}
	mu.Unlock()
	// Another root, or the system roots, must not accept the certificate.
	for name, root := range map[string]string{"other CA": other, "system roots": ""} {
		bad := testPanelConfig(host, port, root)
		_, err := s.health(ctx, bad)
		var se *stageError
		if !errors.As(err, &se) || se.stage != "tls" {
			t.Fatalf("%s: %v", name, err)
		}
	}
	client, base, closeFn, err := s.open(ctx, cfg)
	if err != nil || base != "https://"+net.JoinHostPort(host, strconv.Itoa(port)) {
		t.Fatalf("open: %s %v", base, err)
	}
	defer closeFn()
	if _, err := client.Get("https://example.com/health"); err == nil {
		t.Fatal("another destination reached")
	}
	if _, err := client.Get("http://" + net.JoinHostPort(host, strconv.Itoa(port)) + "/health"); err == nil {
		t.Fatal("plain HTTP used")
	}
	res, err := client.Get(base + "/moved")
	if err != nil || res.StatusCode != http.StatusFound {
		t.Fatalf("redirect followed: %v", err)
	}
	res.Body.Close()
	// Nothing listening: the connect stage.
	l, _ := net.Listen("tcp", "127.0.0.1:0")
	closed := l.Addr().(*net.TCPAddr).Port
	l.Close()
	_, err = s.health(ctx, testPanelConfig("127.0.0.1", closed, ca))
	var se *stageError
	if !errors.As(err, &se) || se.stage != "connect" {
		t.Fatalf("closed port: %v", err)
	}
}

// lockedBuffer collects the bytes the tunnel carries towards the account.
type lockedBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *lockedBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *lockedBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

// tunnelPanel is a fake control panel: /accounts/21/connection, and
// /accounts/21/tunnel relaying to the account server at accountAddr.
type tunnelPanel struct {
	mu          sync.Mutex
	accountAddr string
	revision    string
	connection  accountConnection
	mode        string // "": relay; "409", "503", "websocket", "canned"
	header      http.Header
	host        string
	tunnels     int
	sent        lockedBuffer
}

func (p *tunnelPanel) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Authorization") != "Bearer "+panelKey {
		w.WriteHeader(401)
		return
	}
	switch r.URL.Path {
	case "/accounts/21/connection":
		p.mu.Lock()
		c := p.connection
		p.mu.Unlock()
		_ = json.NewEncoder(w).Encode(c)
		return
	case "/accounts/21/tunnel":
	default:
		w.WriteHeader(404)
		return
	}
	p.mu.Lock()
	p.header, p.host = r.Header.Clone(), r.Host
	p.tunnels++
	mode, revision := p.mode, p.revision
	p.mu.Unlock()
	if r.Header.Get("X-CCG-Revision") != revision || mode == "409" {
		w.WriteHeader(409)
		_, _ = w.Write([]byte(`{"error":"not_synchronized"}`))
		return
	}
	if mode == "503" {
		w.WriteHeader(503)
		_, _ = w.Write([]byte(`{"error":"runtime_unavailable"}`))
		return
	}
	conn, buf, err := w.(http.Hijacker).Hijack()
	if err != nil {
		return
	}
	defer conn.Close()
	switch mode {
	case "websocket":
		_, _ = io.WriteString(conn, "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n")
		return
	case "canned":
		// The account's answer arrives in the same write as the 101.
		_, _ = io.WriteString(conn, "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: ccg-tunnel\r\n\r\n"+
			"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok")
		_, _ = io.Copy(io.Discard, buf)
		return
	}
	upstream, err := net.Dial("tcp", p.accountAddr)
	if err != nil {
		return
	}
	defer upstream.Close()
	_, _ = io.WriteString(conn, "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: ccg-tunnel\r\n\r\n")
	go func() {
		_, _ = io.Copy(io.MultiWriter(upstream, &p.sent), buf)
		_ = upstream.(*net.TCPConn).CloseWrite()
	}()
	_, _ = io.Copy(conn, upstream)
}

func TestControllerTunnel(t *testing.T) {
	revision := strings.Repeat("a", 64)
	modelKey := strings.Repeat("k", 32)
	release := make(chan struct{})
	account := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != modelKey {
			w.WriteHeader(401)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = w.Write([]byte("data: 1\n\n"))
		w.(http.Flusher).Flush()
		<-release
		_, _ = w.Write([]byte("data: 2\n\n"))
	}))
	defer account.Close()
	panel := &tunnelPanel{accountAddr: account.Listener.Addr().String(), revision: revision,
		connection: accountConnection{IP: "10.52.74.181", Port: 8787, Key: modelKey, Revision: revision}}
	_, host, port, ca := tlsPanel(t, panel.ServeHTTP)
	cfg := testPanelConfig(host, port, ca)
	s := &Service{}
	ctx := context.Background()

	client, base, key, closeFn, err := s.openAccountModel(ctx, cfg, "21", revision)
	if err != nil || base != "http://10.52.74.181:8787" || key != modelKey {
		t.Fatalf("open: %s %v", base, err)
	}
	newRequest := func() *http.Request {
		req, _ := http.NewRequestWithContext(ctx, "POST", base+"/v1/messages?beta=true", strings.NewReader(`{"x":1}`))
		req.Header.Set("x-api-key", key)
		req.Header.Set("Anthropic-Beta", "a,b")
		req.Header.Set("X-Custom", "  spaced  value ")
		return req
	}
	res, err := client.Do(newRequest())
	if err != nil {
		t.Fatal(err)
	}
	// The first event arrives before the account finishes its answer.
	br := bufio.NewReader(res.Body)
	if line, err := br.ReadString('\n'); err != nil || line != "data: 1\n" {
		t.Fatalf("first event: %q %v", line, err)
	}
	close(release)
	rest, _ := io.ReadAll(br)
	if !strings.Contains(string(rest), "data: 2") {
		t.Fatalf("rest: %q", rest)
	}
	res.Body.Close()
	closeFn()
	panel.mu.Lock()
	hdr, reqHost, tunnels := panel.header, panel.host, panel.tunnels
	panel.mu.Unlock()
	if tunnels != 1 || reqHost != net.JoinHostPort(host, strconv.Itoa(port)) || hdr.Get("Upgrade") != "ccg-tunnel" ||
		hdr.Get("Connection") != "Upgrade" || hdr.Get("X-CCG-Revision") != revision {
		t.Fatalf("tunnel request: %d %s %v", tunnels, reqHost, hdr)
	}

	// The account sees exactly what the SSH direct-tcpip transport writes.
	capture, _ := net.Listen("tcp", "127.0.0.1:0")
	defer capture.Close()
	captured := make(chan string, 1)
	go func() {
		conn, err := capture.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		var got []byte
		buf := make([]byte, 4096)
		for {
			n, err := conn.Read(buf)
			got = append(got, buf[:n]...)
			if i := bytes.Index(got, []byte("\r\n\r\n")); i >= 0 && len(got)-i-4 >= len(`{"x":1}`) || err != nil {
				break
			}
		}
		captured <- string(got)
		_, _ = io.WriteString(conn, "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n")
	}()
	reference := &http.Transport{Proxy: nil, MaxResponseHeaderBytes: 64 << 10, MaxIdleConns: 2, MaxConnsPerHost: 4, IdleConnTimeout: 30 * time.Second,
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "tcp", capture.Addr().String())
		}}
	if res, err := (&http.Client{Transport: reference}).Do(newRequest()); err == nil {
		res.Body.Close()
	}
	if want := <-captured; panel.sent.String() != want {
		t.Fatalf("tunnel bytes differ from the SSH transport:\n%q\n%q", panel.sent.String(), want)
	}

	// Unsynchronized runtimes, refusals and foreign upgrades.
	for mode, wantSync := range map[string]bool{"409": true, "503": false, "websocket": false} {
		panel.mu.Lock()
		panel.mode = mode
		panel.mu.Unlock()
		_, _, _, _, err := s.openAccountModel(ctx, cfg, "21", revision)
		if err == nil || errors.Is(err, errAccountNotSynchronized) != wantSync {
			t.Fatalf("%s: %v", mode, err)
		}
	}
	panel.mu.Lock()
	panel.mode, panel.revision = "", strings.Repeat("b", 64)
	panel.mu.Unlock()
	if _, _, _, _, err := s.openAccountModel(ctx, cfg, "21", revision); !errors.Is(err, errAccountNotSynchronized) {
		t.Fatalf("stale revision: %v", err)
	}

	// Bytes that came with the 101 are not lost; only the account address
	// can be requested.
	panel.mu.Lock()
	panel.mode, panel.revision = "canned", revision
	panel.mu.Unlock()
	client, base, _, closeFn, err = s.openAccountModel(ctx, cfg, "21", revision)
	if err != nil {
		t.Fatal(err)
	}
	defer closeFn()
	res, err = client.Get(base + "/v1/models")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if string(body) != "ok" {
		t.Fatalf("canned answer: %q", body)
	}
	if _, err := client.Get("http://10.52.74.182:8787/v1/models"); err == nil {
		t.Fatal("another account address reached")
	}
	if _, err := dialTunnel(ctx, cfg, "../21", revision); err == nil {
		t.Fatal("invalid runtime key accepted")
	}
	bad := cfg
	bad.AdminKey = "k\r\nX-Injected: 1"
	if _, err := dialTunnel(ctx, bad, "21", revision); err == nil {
		t.Fatal("header injection accepted")
	}
}

// TestControllerOpenHTTP: a plain HTTP panel (§53.9) has the same fixed
// target, no redirects, and only the connect stage.
func TestControllerOpenHTTP(t *testing.T) {
	var mu sync.Mutex
	hosts := []string{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		hosts = append(hosts, r.Host)
		mu.Unlock()
		if r.URL.Path == "/moved" {
			http.Redirect(w, r, "/health", http.StatusFound)
			return
		}
		if r.URL.Path != "/health" || r.Header.Get("Authorization") != "Bearer "+panelKey {
			w.WriteHeader(401)
			return
		}
		_, _ = w.Write([]byte(`{"version":"v1","features":["tunnel"]}`))
	}))
	defer srv.Close()
	addr := srv.Listener.Addr().(*net.TCPAddr)
	cfg := testPanelConfig("127.0.0.1", addr.Port, "")
	cfg.Scheme = "http"
	s := &Service{}
	ctx := context.Background()
	if h, err := s.health(ctx, cfg); err != nil || h.Version != "v1" {
		t.Fatalf("health: %+v %v", h, err)
	}
	client, base, closeFn, err := s.open(ctx, cfg)
	if err != nil || base != "http://"+addr.String() {
		t.Fatalf("open: %s %v", base, err)
	}
	defer closeFn()
	for _, target := range []string{"https://" + addr.String() + "/health", "http://example.com/health", "http://127.0.0.2:" + strconv.Itoa(addr.Port) + "/health"} {
		if _, err := client.Get(target); err == nil {
			t.Fatalf("%s reached", target)
		}
	}
	res, err := client.Get(base + "/moved")
	if err != nil || res.StatusCode != http.StatusFound {
		t.Fatalf("redirect followed: %v", err)
	}
	res.Body.Close()
	// The HTTPS client of the same port does not fall back to plain HTTP.
	https := cfg
	https.Scheme = "https"
	var se *stageError
	if _, err := s.health(ctx, https); !errors.As(err, &se) || se.stage != "tls" {
		t.Fatalf("https against an http panel: %v", err)
	}
	l, _ := net.Listen("tcp", "127.0.0.1:0")
	closed := l.Addr().(*net.TCPAddr).Port
	l.Close()
	down := cfg
	down.Port = closed
	if _, err := s.health(ctx, down); !errors.As(err, &se) || se.stage != "connect" {
		t.Fatalf("closed port: %v", err)
	}
	bad := cfg
	bad.Scheme = "ftp"
	if _, _, _, err := s.open(ctx, bad); err == nil {
		t.Fatal("unknown scheme opened")
	}
}

// TestControllerTunnelHTTP: the tunnel over a plain HTTP panel.
func TestControllerTunnelHTTP(t *testing.T) {
	revision := strings.Repeat("a", 64)
	modelKey := strings.Repeat("k", 32)
	account := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != modelKey {
			w.WriteHeader(401)
			return
		}
		_, _ = w.Write([]byte("hello " + r.URL.Path))
	}))
	defer account.Close()
	panel := &tunnelPanel{accountAddr: account.Listener.Addr().String(), revision: revision,
		connection: accountConnection{IP: "10.52.74.181", Port: 8787, Key: modelKey, Revision: revision}}
	srv := httptest.NewServer(panel)
	defer srv.Close()
	addr := srv.Listener.Addr().(*net.TCPAddr)
	cfg := testPanelConfig("127.0.0.1", addr.Port, "")
	cfg.Scheme = "http"
	s := &Service{}
	ctx := context.Background()
	client, base, key, closeFn, err := s.openAccountModel(ctx, cfg, "21", revision)
	if err != nil || base != "http://10.52.74.181:8787" || key != modelKey {
		t.Fatalf("open: %s %v", base, err)
	}
	defer closeFn()
	for i := 0; i < 2; i++ {
		req, _ := http.NewRequestWithContext(ctx, "POST", base+"/v1/messages", strings.NewReader(`{}`))
		req.Header.Set("x-api-key", key)
		req.Close = true // a new tunnel per request
		res, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if string(body) != "hello /v1/messages" {
			t.Fatalf("answer: %q", body)
		}
	}
	panel.mu.Lock()
	hdr, reqHost, tunnels := panel.header, panel.host, panel.tunnels
	panel.mu.Unlock()
	if tunnels != 2 || reqHost != addr.String() || hdr.Get("Upgrade") != "ccg-tunnel" || hdr.Get("Authorization") != "Bearer "+panelKey {
		t.Fatalf("tunnel request: %d %s %v", tunnels, reqHost, hdr)
	}
	panel.mu.Lock()
	panel.mode = "409"
	panel.mu.Unlock()
	if _, err := dialTunnel(ctx, cfg, "21", revision); !errors.Is(err, errAccountNotSynchronized) {
		t.Fatalf("409: %v", err)
	}
}

// TestControllerBasePath: a controller behind a reverse proxy path prefix
// (the proxy strips it): management requests and tunnels carry the prefix,
// nothing outside it can be requested.
func TestControllerBasePath(t *testing.T) {
	revision := strings.Repeat("a", 64)
	modelKey := strings.Repeat("k", 32)
	account := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("account " + r.URL.Path))
	}))
	defer account.Close()
	panel := &tunnelPanel{accountAddr: account.Listener.Addr().String(), revision: revision,
		connection: accountConnection{IP: "10.52.74.181", Port: 8787, Key: modelKey, Revision: revision}}
	var mu sync.Mutex
	var paths []string
	mux := http.NewServeMux()
	mux.Handle("/controller/", http.StripPrefix("/controller", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		paths = append(paths, r.URL.Path)
		mu.Unlock()
		if r.URL.Path == "/health" {
			if r.Header.Get("Authorization") != "Bearer "+panelKey {
				w.WriteHeader(401)
				return
			}
			_, _ = w.Write([]byte(`{"version":"v9","features":["tunnel"]}`))
			return
		}
		panel.ServeHTTP(w, r)
	})))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		t.Errorf("request outside the prefix: %s", r.URL.Path)
		w.WriteHeader(404)
	})
	for _, scheme := range []string{"http", "https"} {
		t.Run(scheme, func(t *testing.T) {
			var cfg Config
			if scheme == "https" {
				_, host, port, ca := tlsPanel(t, mux.ServeHTTP)
				cfg = testPanelConfig(host, port, ca)
			} else {
				srv := httptest.NewServer(mux)
				t.Cleanup(srv.Close)
				cfg = testPanelConfig("127.0.0.1", srv.Listener.Addr().(*net.TCPAddr).Port, "")
			}
			cfg.Scheme, cfg.BasePath = scheme, "/controller"
			s := &Service{}
			ctx := context.Background()
			if h, err := s.health(ctx, cfg); err != nil || h.Version != "v9" {
				t.Fatalf("health: %+v %v", h, err)
			}
			client, base, closeFn, err := s.open(ctx, cfg)
			if err != nil || !strings.HasSuffix(base, "/controller") || !strings.HasPrefix(base, scheme+"://") {
				t.Fatalf("open: %s %v", base, err)
			}
			root := strings.TrimSuffix(base, "/controller")
			for _, target := range []string{root + "/health", root + "/controllerx/health", base + "/../health", base + "/./health", base + "/a/../../health", base} {
				if res, err := client.Get(target); err == nil {
					res.Body.Close()
					t.Fatalf("%s reached", target)
				}
			}
			closeFn()
			model, modelBase, key, closeModel, err := s.openAccountModel(ctx, cfg, "21", revision)
			if err != nil || key != modelKey {
				t.Fatalf("account model: %v", err)
			}
			defer closeModel()
			res, err := model.Get(modelBase + "/v1/models")
			if err != nil {
				t.Fatal(err)
			}
			body, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if string(body) != "account /v1/models" {
				t.Fatalf("tunnel answer: %q", body)
			}
			mu.Lock()
			got := strings.Join(paths, ",")
			paths = nil
			mu.Unlock()
			if got != "/health,/accounts/21/connection,/accounts/21/tunnel" {
				t.Fatalf("controller saw: %s", got)
			}
		})
	}
	bad := testPanelConfig("127.0.0.1", 1, "")
	for _, p := range []string{"controller", "/a/../b", "/a?x=1", "/a b"} {
		bad.BasePath = p
		if _, _, _, err := (&Service{}).open(context.Background(), bad); err == nil {
			t.Errorf("base path %q opened", p)
		}
		if _, err := dialTunnel(context.Background(), bad, "21", revision); err == nil {
			t.Errorf("base path %q tunneled", p)
		}
	}
}

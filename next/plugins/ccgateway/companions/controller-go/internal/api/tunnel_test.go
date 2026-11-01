package api

import (
	"bufio"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
)

// accountServer stands in for the account Worker on its port: POST
// streams two SSE events chunked, the second only after release; GET
// answers {"path": ...} (test_tunnel.AccountHandler).
type accountServer struct {
	ln      net.Listener
	release chan struct{}
	mu      sync.Mutex
	seen    [][3]string
}

func newAccount(t *testing.T) *accountServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	a := &accountServer{ln: ln, release: make(chan struct{})}
	srv := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			body, _ := io.ReadAll(r.Body)
			a.mu.Lock()
			a.seen = append(a.seen, [3]string{r.URL.Path, r.Header.Get("Authorization"), string(body)})
			a.mu.Unlock()
			w.Header().Set("Content-Type", "text/event-stream")
			io.WriteString(w, "event: one\n\n")
			w.(http.Flusher).Flush()
			select {
			case <-a.release:
			case <-time.After(5 * time.Second):
			}
			io.WriteString(w, "event: two\n\n")
			return
		}
		raw, _ := json.Marshal(map[string]string{"path": r.URL.Path})
		w.Header().Set("Content-Type", "application/json")
		w.Write(raw)
	})}
	go srv.Serve(ln)
	t.Cleanup(func() {
		a.releaseOnce()
		srv.Close()
	})
	return a
}

var releaseMu sync.Mutex

func (a *accountServer) releaseOnce() {
	releaseMu.Lock()
	defer releaseMu.Unlock()
	select {
	case <-a.release:
	default:
		close(a.release)
	}
}

func (a *accountServer) port() int { return a.ln.Addr().(*net.TCPAddr).Port }

func (a *accountServer) requests() [][3]string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return append([][3]string(nil), a.seen...)
}

// tunnelHarness: account 7 is ready at testRev and its Worker is a.
func tunnelHarness(t *testing.T, port int, edit func(*Options)) *harness {
	t.Helper()
	h := newHarness(t, edit)
	h.core.on("connection", func(args []any) (any, error) {
		if args[0] == "7" && args[1] == testRev {
			return &contract.Connection{AppIP: "127.0.0.1", Port: port, APIKey: "gateway-key-123456", Revision: testRev}, nil
		}
		return nil, nil
	})
	return h
}

func upgradeRequest(aid, revision, key string, extra string) []byte {
	return []byte("GET /accounts/" + aid + "/tunnel HTTP/1.1\r\nHost: gateway.test\r\nAuthorization: Bearer " + key +
		"\r\nX-CCG-Revision: " + revision + "\r\nConnection: Upgrade\r\nUpgrade: ccg-tunnel\r\n\r\n" + extra)
}

// covers: T4, T5, T6 (test_tunnel.test_tunnel_carries_http_with_streaming_and_half_close)
func TestTunnelCarriesHTTPWithStreamingAndHalfClose(t *testing.T) {
	a := newAccount(t)
	h := tunnelHarness(t, a.port(), nil)
	conn := dialRaw(t, h.addr)
	body := `{"model":"x"}`
	request := "POST /v1/messages HTTP/1.1\r\nHost: 10.0.0.3:8787\r\nAuthorization: Bearer account-key\r\n" +
		"Content-Type: application/json\r\nContent-Length: " + strconv.Itoa(len(body)) + "\r\n\r\n" + body
	// The model request is pipelined right behind the upgrade request.
	conn.write(upgradeRequest("7", testRev, testKey, request))
	head := conn.readHead()
	if head.Status != 101 || head.Reason != "Switching Protocols" {
		t.Fatal(head.Status, head.Reason)
	}
	var names []string
	for _, kv := range head.Header {
		names = append(names, kv[0])
	}
	if strings.Join(names, ",") != "Date,Connection,Upgrade" {
		t.Fatal(names)
	}
	if v, _ := head.get("Upgrade"); v != "ccg-tunnel" {
		t.Fatal(v)
	}
	if v, _ := head.get("Connection"); v != "Upgrade" {
		t.Fatal(v)
	}
	res, err := http.ReadResponse(conn.br, &http.Request{Method: "POST"})
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != 200 || res.Header.Get("Content-Type") != "text/event-stream" {
		t.Fatal(res.Status, res.Header)
	}
	first := make([]byte, len("event: one\n\n"))
	if _, err := io.ReadFull(res.Body, first); err != nil || string(first) != "event: one\n\n" {
		t.Fatal(string(first), err)
	}
	a.releaseOnce()
	rest, _ := io.ReadAll(res.Body)
	if string(rest) != "event: two\n\n" {
		t.Fatal(string(rest))
	}
	if seen := a.requests(); len(seen) != 1 || seen[0] != [3]string{"/v1/messages", "Bearer account-key", body} {
		t.Fatal(seen)
	}
	// Same tunnel, next request.
	conn.write([]byte("GET /admin/status HTTP/1.1\r\nHost: x\r\n\r\n"))
	res, err = http.ReadResponse(conn.br, &http.Request{Method: "GET"})
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(res.Body)
	if string(b) != `{"path":"/admin/status"}` {
		t.Fatal(string(b))
	}
	// Client EOF reaches the account side, whose close comes back as EOF.
	conn.c.(*net.TCPConn).CloseWrite()
	if rest := conn.readAll(); rest != "" {
		t.Fatal(rest)
	}
	waitTunnels(t, h.srv, 0)
}

// covers: T1 (test_tunnel.test_upgrade_header_case_and_connection_list)
func TestUpgradeHeaderCaseAndConnectionList(t *testing.T) {
	a := newAccount(t)
	h := tunnelHarness(t, a.port(), nil)
	conn := dialRaw(t, h.addr)
	raw := strings.Replace(string(upgradeRequest("7", testRev, testKey, "")), "Connection: Upgrade", "Connection: keep-alive, upgrade", 1)
	raw = strings.Replace(raw, "Upgrade: ccg-tunnel", "Upgrade:  CCG-Tunnel ", 1)
	conn.write([]byte(raw))
	if head := conn.readHead(); head.Status != 101 {
		t.Fatal(head.Status)
	}
}

func tunnelHeaders(extra ...[2]string) [][2]string {
	base := map[string]string{"X-CCG-Revision": testRev, "Connection": "Upgrade", "Upgrade": "ccg-tunnel"}
	order := []string{"X-CCG-Revision", "Connection", "Upgrade"}
	for _, e := range extra {
		if _, ok := base[e[0]]; !ok {
			order = append(order, e[0])
		}
		base[e[0]] = e[1]
	}
	var out [][2]string
	for _, k := range order {
		if base[k] != "\x00" {
			out = append(out, [2]string{k, base[k]})
		}
	}
	return out
}

// covers: T1, T2, H1, H8 (test_tunnel.test_rejections; every non-101 answer closes)
func TestTunnelRejections(t *testing.T) {
	a := newAccount(t)
	h := tunnelHarness(t, a.port(), nil)
	path := "/accounts/7/tunnel"
	check := func(res *response, status int, code string) {
		t.Helper()
		if res.Status != status || string(res.Body) != errBody(code) || !res.Closed {
			t.Fatalf("got %d %s closed=%v, want %d %s", res.Status, res.Body, res.Closed, status, code)
		}
		if v, _ := res.get("Connection"); v != "close" {
			t.Fatalf("Connection %q", v)
		}
	}
	check(h.doKey(strings.Repeat("x", 32), "GET", path, "", tunnelHeaders()...), 401, "unauthorized")
	check(h.do("GET", path, "", tunnelHeaders(hdr("X-CCG-Revision", strings.Repeat("b", 64)))...), 409, "not_synchronized")
	check(h.do("GET", path, "", tunnelHeaders(hdr("X-CCG-Revision", ""))...), 409, "not_synchronized")
	check(h.do("GET", "/accounts/8/tunnel", "", tunnelHeaders()...), 409, "not_synchronized")
	check(h.do("GET", path, "", tunnelHeaders(hdr("Upgrade", "websocket"))...), 400, "invalid_request")
	check(h.do("GET", path, "", tunnelHeaders(hdr("Connection", "keep-alive"))...), 400, "invalid_request")
	check(h.do("GET", path, "", tunnelHeaders(hdr("Upgrade", "\x00"))...), 400, "invalid_request")
	check(h.do("POST", path, "", tunnelHeaders()...), 405, "method_not_allowed")
	check(h.do("GET", path, "", tunnelHeaders(hdr("Content-Length", "00"))...), 400, "invalid_request")
	check(h.do("GET", path, "x", tunnelHeaders()...), 400, "invalid_request")
	check(h.do("GET", path, "", tunnelHeaders(hdr("Transfer-Encoding", "chunked"))...), 400, "invalid_request")
	if res := h.do("GET", path, "", tunnelHeaders(hdr("Content-Length", "0"))...); res.Status != 101 {
		t.Fatal(res.Status)
	}
	if len(a.requests()) != 0 {
		t.Fatal(a.requests())
	}
	// The account lock wait ended: named, no chain in the log.
	h.core.failWith("connection", errs.New(errs.RuntimeBusy, "account lock busy"))
	check(h.do("GET", path, "", tunnelHeaders()...), 503, "runtime_unavailable")
	if !strings.Contains(h.log.String(), "GET key=7 path=tunnel -> 503 runtime_unavailable: RuntimeBusy: account lock busy\n") {
		t.Fatal(h.log.String())
	}
	h.core.failWith("connection", errs.New(errs.BadRequest, "invalid runtime key"))
	check(h.do("GET", path, "", tunnelHeaders()...), 400, "invalid_request")
	h.core.failWith("connection", errs.New(errs.ImagePullFailed, "x"))
	check(h.do("GET", path, "", tunnelHeaders()...), 503, "runtime_unavailable")
}

// covers: T2, Y1 (test_tunnel.test_stopped_runtime_is_not_synchronized)
func TestStoppedRuntimeIsNotSynchronized(t *testing.T) {
	h := newHarness(t, nil)
	h.core.answer("connection", nil) // the app container stopped: not ready
	res := h.do("GET", "/accounts/7/tunnel", "", tunnelHeaders()...)
	if res.Status != 409 || string(res.Body) != errBody("not_synchronized") {
		t.Fatal(res.Status, string(res.Body))
	}
}

// covers: T3 (test_tunnel.test_unreachable_account_is_runtime_unavailable)
func TestUnreachableAccountIsRuntimeUnavailable(t *testing.T) {
	h := tunnelHarness(t, closedPort(t), nil)
	res := h.do("GET", "/accounts/7/tunnel", "", tunnelHeaders()...)
	if res.Status != 503 || string(res.Body) != errBody("runtime_unavailable") || !res.Closed {
		t.Fatal(res.Status, string(res.Body))
	}
	if h.log.String() != "" {
		t.Fatalf("T3 is not logged: %q", h.log.String())
	}
}

// covers: T7 (new: a direction idle for the tunnel timeout ends both sides)
func TestTunnelIdleTimeoutEndsBothSides(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	upstream := make(chan net.Conn, 1)
	go func() {
		c, err := ln.Accept()
		if err == nil {
			upstream <- c
		}
	}()
	h := tunnelHarness(t, ln.Addr().(*net.TCPAddr).Port, func(o *Options) { o.TunnelIdle = 300 * time.Millisecond })
	conn := dialRaw(t, h.addr)
	conn.write(upgradeRequest("7", testRev, testKey, ""))
	if head := conn.readHead(); head.Status != 101 {
		t.Fatal(head.Status)
	}
	up := <-upstream
	defer up.Close()
	// Keep one direction busy: the idle one still ends the tunnel.
	stop := make(chan struct{})
	go func() {
		for {
			select {
			case <-stop:
				return
			case <-time.After(50 * time.Millisecond):
				if _, err := up.Write([]byte("x")); err != nil {
					return
				}
			}
		}
	}()
	defer close(stop)
	start := time.Now()
	io.Copy(io.Discard, conn.br)
	if d := time.Since(start); d > 5*time.Second {
		t.Fatal(d)
	}
	up.SetReadDeadline(time.Now().Add(5 * time.Second))
	if _, err := io.Copy(io.Discard, up); err != nil {
		t.Fatalf("upstream not closed: %v", err)
	}
	waitTunnels(t, h.srv, 0)
}

// covers: T6, T7 (new: half-close in the other direction, Worker EOF
// first; a reset ends both)
func TestTunnelWorkerHalfCloseAndReset(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	upstream := make(chan net.Conn, 2)
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			upstream <- c
		}
	}()
	h := tunnelHarness(t, ln.Addr().(*net.TCPAddr).Port, nil)
	conn := dialRaw(t, h.addr)
	conn.write(upgradeRequest("7", testRev, testKey, "hello"))
	conn.readHead()
	up := <-upstream
	defer up.Close()
	buf := make([]byte, 5)
	if _, err := io.ReadFull(up, buf); err != nil || string(buf) != "hello" {
		t.Fatal(string(buf), err)
	}
	up.Write([]byte("bye"))
	up.(*net.TCPConn).CloseWrite()
	if got := conn.readN(3); got != "bye" {
		t.Fatal(got)
	}
	// The client can still send after the Worker's EOF.
	conn.write([]byte("more"))
	buf = make([]byte, 4)
	if _, err := io.ReadFull(up, buf); err != nil || string(buf) != "more" {
		t.Fatal(string(buf), err)
	}
	conn.c.(*net.TCPConn).CloseWrite()
	if rest := conn.readAll(); rest != "" {
		t.Fatal(rest)
	}
	waitTunnels(t, h.srv, 0)

	// A reset of the Worker side ends the client side too.
	conn2 := dialRaw(t, h.addr)
	conn2.write(upgradeRequest("7", testRev, testKey, ""))
	conn2.readHead()
	up2 := <-upstream
	up2.(*net.TCPConn).SetLinger(0)
	up2.Close()
	conn2.c.SetReadDeadline(time.Now().Add(5 * time.Second))
	io.Copy(io.Discard, conn2.br)
	waitTunnels(t, h.srv, 0)
}

// covers: T6 (new: a connection that is not TCP cannot be half-closed:
// EOF ends both directions)
func TestTunnelHalfCloseFallsBackForNonTCP(t *testing.T) {
	cert := selfSigned(t)
	srvSide, cliSide := net.Pipe()
	tlsSrv := tls.Server(srvSide, &tls.Config{Certificates: []tls.Certificate{cert}})
	tlsCli := tls.Client(cliSide, &tls.Config{InsecureSkipVerify: true})
	upA, upB := net.Pipe()
	s := &Server{tunIdle: time.Minute, tunnels: map[net.Conn]struct{}{}}
	done := make(chan struct{})
	go func() {
		s.splice(tlsSrv, bufio.NewReader(tlsSrv), upA)
		close(done)
	}()
	br := bufio.NewReader(tlsCli)
	line, err := br.ReadString('\n')
	if err != nil || !strings.HasPrefix(line, "HTTP/1.1 101 ") {
		t.Fatal(line, err)
	}
	for l, _ := br.ReadString('\n'); l != "\r\n"; l, _ = br.ReadString('\n') {
	}
	go upB.Write([]byte("x"))
	if b, _ := br.ReadByte(); b != 'x' {
		t.Fatal(b)
	}
	go io.Copy(io.Discard, br) // drain the close_notify alert (a pipe has no buffer)
	upB.Close()                // EOF from the Worker: the TLS client side cannot be half-closed
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("splice did not end")
	}
	tlsCli.Close()
}

func waitTunnels(t *testing.T, s *Server, n int) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for s.OpenTunnels() != n {
		if time.Now().After(deadline) {
			t.Fatalf("%d tunnel connections open, want %d", s.OpenTunnels(), n)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

// covers: T8, 02 §4.5 (new: graceful exit closes every tunnel; a tunnel is
// not torn down when the runtime later loses readiness)
func TestGracefulExitClosesTunnels(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	upstream := make(chan net.Conn, 1)
	go func() {
		c, err := ln.Accept()
		if err == nil {
			upstream <- c
		}
	}()
	h := tunnelHarness(t, ln.Addr().(*net.TCPAddr).Port, nil)
	conn := dialRaw(t, h.addr)
	conn.write(upgradeRequest("7", testRev, testKey, ""))
	conn.readHead()
	up := <-upstream
	defer up.Close()
	waitTunnels(t, h.srv, 2)
	h.core.answer("connection", nil) // readiness lost: the open tunnel stays
	up.Write([]byte("still"))
	if got := conn.readN(5); got != "still" {
		t.Fatal(got)
	}
	start := time.Now()
	h.stop()
	if d := time.Since(start); d > time.Second {
		t.Fatalf("Shutdown waited %v for a hijacked tunnel", d)
	}
	if rest := conn.readAll(); rest != "" {
		t.Fatal(rest)
	}
	up.SetReadDeadline(time.Now().Add(5 * time.Second))
	if _, err := io.Copy(io.Discard, up); err != nil {
		t.Fatal(err)
	}
	if n := h.srv.CloseTunnels(); n != 0 {
		t.Fatal(n)
	}
	_ = fmt.Sprint
}

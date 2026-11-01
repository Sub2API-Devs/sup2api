package api

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/textproto"
	"os"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

const (
	testKey = "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk" // 'k' * 32, test_manager.CONTROLLER_KEY
	testRev = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	draft   = "d0123456789abcdef"
)

// syncBuffer is a log sink safe for concurrent writers.
type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

// harness is a controller API on a real loopback listener with stub
// business packages.
type harness struct {
	t    *testing.T
	core *stubCore
	srv  *Server
	addr string
	log  *syncBuffer
	stop func()
}

func newHarness(t *testing.T, edit func(*Options)) *harness {
	t.Helper()
	core := newStubCore()
	logs := &syncBuffer{}
	o := Options{Key: testKey, Accounts: stubAccounts{core}, Updates: stubUpdates{core}, Uploads: stubUploads{core},
		Cleanup: stubCleanup{core}, Admin: stubAdmin{core}, Log: logx.New(logs, "ccgateway.controller")}
	if edit != nil {
		edit(&o)
	}
	srv, err := New(o)
	if err != nil {
		t.Fatal(err)
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- srv.Serve(ctx, ln, 2*time.Second) }()
	h := &harness{t: t, core: core, srv: srv, addr: ln.Addr().String(), log: logs}
	h.stop = sync.OnceFunc(func() {
		cancel()
		if err := <-done; err != nil {
			t.Errorf("Serve: %v", err)
		}
	})
	t.Cleanup(h.stop)
	return h
}

// response is one raw HTTP answer.
type response struct {
	Status  int
	Reason  string
	Proto   string
	Header  [][2]string // in arrival order, Date included
	Body    []byte
	Closed  bool // the server closed the connection after the answer
	Missing bool // the server closed without answering
}

func (r *response) get(name string) (string, bool) {
	for _, h := range r.Header {
		if strings.EqualFold(h[0], name) {
			return h[1], true
		}
	}
	return "", false
}

// rawRequest builds a request like differential_dump.raw_request.
func rawRequest(method, target string, body []byte, headers [][2]string, key string, auth bool) []byte {
	var b strings.Builder
	fmt.Fprintf(&b, "%s %s HTTP/1.1\r\nHost: controller.test\r\n", method, target)
	if auth {
		fmt.Fprintf(&b, "Authorization: Bearer %s\r\n", key)
	}
	hasLength := false
	for _, h := range headers {
		if strings.EqualFold(h[0], "Content-Length") || strings.EqualFold(h[0], "Transfer-Encoding") {
			hasLength = true
		}
		fmt.Fprintf(&b, "%s: %s\r\n", h[0], h[1])
	}
	if len(body) > 0 && !hasLength {
		fmt.Fprintf(&b, "Content-Length: %d\r\n", len(body))
	}
	b.WriteString("\r\n")
	return append([]byte(b.String()), body...)
}

// readResponse reads one answer from br (Content-Length or close-delimited).
func readResponse(br *bufio.Reader, head bool) (*response, error) {
	line, err := br.ReadString('\n')
	if err != nil {
		if line == "" && (errors.Is(err, io.EOF) || isReset(err)) {
			return &response{Missing: true, Closed: true}, nil
		}
		return nil, err
	}
	parts := strings.SplitN(strings.TrimRight(line, "\r\n"), " ", 3)
	if len(parts) < 2 {
		return nil, fmt.Errorf("bad status line %q", line)
	}
	res := &response{Proto: parts[0]}
	res.Status, err = strconv.Atoi(parts[1])
	if err != nil {
		return nil, err
	}
	if len(parts) == 3 {
		res.Reason = parts[2]
	}
	tp := textproto.NewReader(br)
	for {
		l, err := tp.ReadLine()
		if err != nil {
			return nil, err
		}
		if l == "" {
			break
		}
		name, value, _ := strings.Cut(l, ":")
		res.Header = append(res.Header, [2]string{strings.TrimSpace(name), strings.TrimSpace(value)})
	}
	if res.Status == http.StatusSwitchingProtocols || head {
		return res, nil
	}
	if cl, ok := res.get("Content-Length"); ok {
		n, err := strconv.Atoi(cl)
		if err != nil {
			return nil, err
		}
		res.Body = make([]byte, n)
		if _, err := io.ReadFull(br, res.Body); err != nil {
			return nil, err
		}
		return res, nil
	}
	if te, ok := res.get("Transfer-Encoding"); ok {
		return nil, fmt.Errorf("unexpected Transfer-Encoding %q", te)
	}
	res.Body, err = io.ReadAll(br)
	return res, err
}

// exchange sends raw on a new connection and reads one answer; then it
// waits up to wait for the server to close the connection.
func doRaw(t *testing.T, addr string, raw []byte, wait time.Duration) *response {
	t.Helper()
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(20 * time.Second))
	if _, err := conn.Write(raw); err != nil {
		t.Fatal(err)
	}
	br := bufio.NewReader(conn)
	res, err := readResponse(br, bytes.HasPrefix(raw, []byte("HEAD ")))
	if err != nil {
		t.Fatalf("reading the answer to %q: %v", firstLine(raw), err)
	}
	if res.Missing {
		return res
	}
	conn.SetReadDeadline(time.Now().Add(wait))
	var one [1]byte
	n, err := br.Read(one[:])
	switch {
	case n > 0:
		t.Fatalf("extra bytes after the answer to %q", firstLine(raw))
	case errors.Is(err, os.ErrDeadlineExceeded):
		res.Closed = false
	default:
		res.Closed = true
	}
	return res
}

func firstLine(raw []byte) string {
	line, _, _ := bytes.Cut(raw, []byte("\r\n"))
	return string(line)
}

// call is HandlerTests.call: one request on its own connection; the
// status and the raw body.
func (h *harness) call(method, target string, body string, headers ...[2]string) (int, string) {
	h.t.Helper()
	res := h.do(method, target, body, headers...)
	return res.Status, string(res.Body)
}

// do is call returning the whole answer (close detection: 300 ms).
func (h *harness) do(method, target string, body string, headers ...[2]string) *response {
	h.t.Helper()
	return doRaw(h.t, h.addr, rawRequest(method, target, []byte(body), headers, testKey, true), 300*time.Millisecond)
}

// doKey is do with another controller key.
func (h *harness) doKey(key, method, target, body string, headers ...[2]string) *response {
	h.t.Helper()
	return doRaw(h.t, h.addr, rawRequest(method, target, []byte(body), headers, key, true), 300*time.Millisecond)
}

func errBody(code string) string { return `{"error": "` + code + `"}` }

func hdr(name, value string) [2]string { return [2]string{name, value} }

func rev() [2]string { return hdr("X-CCG-Revision", testRev) }

// readyState is an account state ready for the pass-through.
func readyState(t *testing.T, authMode string) *store.AccountState {
	t.Helper()
	doc := `{"api_key": "gateway-key-123456", "admin_key": "admin-key-abcdef", "app_ip": "10.77.0.2", ` +
		`"gateway_ip": "10.77.0.1", "revision": "` + testRev + `", "status": "ready", "created_at": "2026-11-01T00:00:00Z"`
	if authMode != "" {
		doc += `, "auth_mode": "` + authMode + `"`
	}
	st, err := store.ParseAccountState([]byte(doc + "}"))
	if err != nil {
		t.Fatal(err)
	}
	return st
}

// workerServer is an account Worker's admin port on loopback.
type workerServer struct {
	ln   net.Listener
	srv  *http.Server
	mu   sync.Mutex
	seen []*seenRequest
}

type seenRequest struct {
	Method, Path string
	Header       http.Header
	Body         []byte
}

func newWorker(t *testing.T, handler func(w http.ResponseWriter, r *http.Request)) *workerServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	ws := &workerServer{ln: ln}
	ws.srv = &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		ws.mu.Lock()
		ws.seen = append(ws.seen, &seenRequest{Method: r.Method, Path: r.URL.Path, Header: r.Header.Clone(), Body: body})
		ws.mu.Unlock()
		handler(w, r)
	})}
	go ws.srv.Serve(ln)
	t.Cleanup(func() { ws.srv.Close() })
	return ws
}

func (ws *workerServer) port() int { return ws.ln.Addr().(*net.TCPAddr).Port }

func (ws *workerServer) requests() []*seenRequest {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	return append([]*seenRequest(nil), ws.seen...)
}

// client is a Worker client toward port on loopback.
func client(port int) *workeradmin.Client {
	return &workeradmin.Client{Port: port, HostOverride: "127.0.0.1"}
}

// closedPort is a loopback port nobody listens on.
func closedPort(t *testing.T) int {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()
	return port
}

// ordered decodes a JSON object for a stub answer.
func ordered(t *testing.T, doc string) pyjson.Ordered {
	t.Helper()
	o, err := pyjson.DecodeObject([]byte(doc))
	if err != nil {
		t.Fatal(err)
	}
	return o
}

// health is runtime_admin.health() of the Python tests' default manager.
func healthAnswer(t *testing.T) pyjson.Ordered {
	return ordered(t, `{"version": "dev", "app_image": "app:test", "egress_image": "egress:test", "controller_image": "", `+
		`"network_policy_version": 1, "features": ["tunnel", "uploads", "runtime-images", "self-upgrade", "worker-update", `+
		`"runtime-pair-update-v1", "shared-egress-v1", "cli-profile-v1", "runtime-cleanup-v1", "account-disk-quota-v1", `+
		`"runtime-purge-v2"], "disk_quota": {"default_bytes": 10737418240, "support": "unknown"}}`)
}

var _ contract.Accounts = stubAccounts{}

// rawConn is a client connection driven byte by byte.
type rawConn struct {
	t  *testing.T
	c  net.Conn
	br *bufio.Reader
}

func dialRaw(t *testing.T, addr string) *rawConn {
	t.Helper()
	c, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.Close() })
	c.SetDeadline(time.Now().Add(20 * time.Second))
	return &rawConn{t: t, c: c, br: bufio.NewReader(c)}
}

func (r *rawConn) write(p []byte) {
	r.t.Helper()
	if _, err := r.c.Write(p); err != nil {
		r.t.Fatal(err)
	}
}

// readHead reads a status line and headers (no body).
func (r *rawConn) readHead() *response {
	r.t.Helper()
	res, err := readResponse(r.br, true)
	if err != nil {
		r.t.Fatal(err)
	}
	return res
}

// readAnswer reads one whole answer.
func (r *rawConn) readAnswer() *response {
	r.t.Helper()
	res, err := readResponse(r.br, false)
	if err != nil {
		r.t.Fatal(err)
	}
	return res
}

func (r *rawConn) readN(n int) string {
	r.t.Helper()
	buf := make([]byte, n)
	if _, err := io.ReadFull(r.br, buf); err != nil {
		r.t.Fatal(err)
	}
	return string(buf)
}

// readAll reads until the server closes.
func (r *rawConn) readAll() string {
	r.t.Helper()
	b, err := io.ReadAll(r.br)
	if err != nil {
		r.t.Fatal(err)
	}
	return string(b)
}

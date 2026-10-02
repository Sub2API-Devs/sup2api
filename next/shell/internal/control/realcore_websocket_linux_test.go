//go:build linux

package control

import (
	"bufio"
	"context"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/shell/internal/proxy"
)

// TestRealCoreShellsCarryWebSocketsAcrossNodes runs WebSocket sessions through
// real shells: public listener, Redis-authenticated peer TLS and private
// listener, with registrations, the Redis link and CPU offload changing
// underneath. The core has no WebSocket endpoint, so each node's local route
// points at a WebSocket echo server standing in for its core; everything
// between the client and that server is the production shell code.
func TestRealCoreShellsCarryWebSocketsAcrossNodes(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	const ttl = 3 * time.Second
	c := newRealCluster(t, ctx, realOptions{peerTTL: ttl, standInCores: true})
	wait := func(what string, timeout time.Duration, fn func() bool) {
		t.Helper()
		deadline := time.Now().Add(timeout)
		for !fn() {
			if time.Now().After(deadline) {
				t.Fatalf("timed out waiting for %s", what)
			}
			time.Sleep(100 * time.Millisecond)
		}
	}
	// a is the primary, f a follower forwarding to it, b a serving follower
	// that takes a's new sessions while a offloads.
	a, b, f := c.startShell("a"), c.startShell("b"), c.startShell("c")
	coreA, coreB := newWSBackend(t, "a"), newWSBackend(t, "b")
	rev := time.Now().UnixNano()
	for _, err := range []error{
		a.runtime.Router.SetRoute(proxy.Route{Mode: "local-serving", LocalURL: coreA.URL, CoreBootID: "core-a", Revision: rev}),
		b.runtime.Router.SetRoute(proxy.Route{Mode: "local-serving", LocalURL: coreB.URL, CoreBootID: "core-b", Revision: rev}),
		f.runtime.Router.SetRoute(proxy.Route{Mode: "forward-only", PeerURL: a.private.URL, CoreBootID: "core-a", Revision: rev, PeerRevision: rev}),
	} {
		if err != nil {
			t.Fatal(err)
		}
	}

	// ---- a session through the follower reaches the primary's core
	ws, status := dialWS(t, f.public.URL, "/v1/realtime?model=m", "Bearer user-key")
	if status != 101 {
		t.Fatalf("upgrade through the follower: HTTP %d", status)
	}
	defer ws.Close()
	if got := ws.echo(t, "hello"); got != "a:hello" {
		t.Fatalf("echo through the follower: %q", got)
	}
	if coreA.auth.Load() != "Bearer user-key" || coreA.leaked.Load() {
		t.Fatalf("the core saw Authorization %q, internal headers leaked: %v", coreA.auth.Load(), coreA.leaked.Load())
	}
	if f.runtime.Router.Active() != 1 || a.runtime.Router.Active() != 1 {
		t.Fatalf("session not tracked for draining: follower %d primary %d", f.runtime.Router.Active(), a.runtime.Router.Active())
	}
	large := strings.Repeat("x", 70000)
	if got := ws.echo(t, large); got != "a:"+large {
		t.Fatalf("large frame through the follower: %d bytes", len(got))
	}

	// ---- registrations disappear and come back with new keys; the session
	// keeps going for several TTLs
	registration := func(node string) string { return "s2a:peer:{" + c.dbname + "}:node:" + node }
	keyOf := func(node string) string {
		raw, err := c.direct.Get(ctx, registration(node)).Bytes()
		if err != nil {
			return ""
		}
		var r struct {
			Key string `json:"auth_key"`
		}
		_ = json.Unmarshal(raw, &r)
		return r.Key
	}
	before := map[string]string{"a": keyOf("a"), "c": keyOf("c")}
	if err := c.direct.Del(ctx, registration("a"), registration("c")).Err(); err != nil {
		t.Fatal(err)
	}
	for node, old := range before {
		wait(node+" re-registered with a new key", 30*time.Second, func() bool { k := keyOf(node); return k != "" && k != old })
	}
	deadline := time.Now().Add(2 * ttl)
	for i := 0; time.Now().Before(deadline); i++ {
		if got := ws.echo(t, fmt.Sprint("tick-", i)); got != fmt.Sprint("a:tick-", i) {
			t.Fatalf("session across registrations: %q", got)
		}
		time.Sleep(500 * time.Millisecond)
	}
	second, status := dialWS(t, f.public.URL, "/v1/realtime", "Bearer user-key")
	if status != 101 || second.echo(t, "after-rotation") != "a:after-rotation" {
		t.Fatalf("new session after key replacement: HTTP %d", status)
	}
	second.Close()
	t.Logf("session through the follower survived %s and new keys for both nodes", 2*ttl)

	// ---- Redis unreachable: the open session continues, new ones are refused
	c.redis.Cut(3 * ttl)
	if got := ws.echo(t, "during-cut"); got != "a:during-cut" {
		t.Fatalf("session during the Redis cut: %q", got)
	}
	if _, status = dialWS(t, f.public.URL, "/v1/realtime", "Bearer user-key"); status != 503 {
		t.Fatalf("new session without Redis: HTTP %d, want 503", status)
	}
	wait("new sessions after Redis returned", time.Minute, func() bool {
		s, status := dialWS(t, f.public.URL, "/v1/realtime", "Bearer user-key")
		if status != 101 {
			return false
		}
		defer s.Close()
		return s.echo(t, "back") == "a:back"
	})
	if got := ws.echo(t, "after-cut"); got != "a:after-cut" {
		t.Fatalf("session after the Redis cut: %q", got)
	}

	// ---- CPU offload: a hands new sessions to b; open ones stay put. The
	// marks are what the heartbeats of serving nodes would store.
	if _, err := c.db.Exec(ctx, `UPDATE updater.nodes SET mode='local',ready=true,core_boot_id='core-b',route_revision=$2 WHERE cluster_id=$1 AND node_id='b'`, c.dbname, rev); err != nil {
		t.Fatal(err)
	}
	if _, err := c.db.Exec(ctx, `UPDATE updater.nodes SET offloading=true WHERE cluster_id=$1 AND node_id='a'`, c.dbname); err != nil {
		t.Fatal(err)
	}
	if err := a.runtime.SetOffload([]Node{{ID: "b", PeerURL: b.private.URL, CoreBootID: "core-b", RouteRevision: rev}}); err != nil {
		t.Fatal(err)
	}
	direct, status := dialWS(t, a.public.URL, "/v1/realtime", "Bearer user-key")
	if status != 101 {
		t.Fatalf("session through the offloading primary: HTTP %d", status)
	}
	if got := direct.echo(t, "offloaded"); got != "b:offloaded" {
		t.Fatalf("new session of an offloading node must go to b: %q", got)
	}
	// A forwarded session is served by a itself and never forwarded again.
	via, status := dialWS(t, f.public.URL, "/v1/realtime", "Bearer user-key")
	if status != 101 || via.echo(t, "forwarded") != "a:forwarded" {
		t.Fatalf("forwarded session while a offloads: HTTP %d", status)
	}
	if got := ws.echo(t, "still-here"); got != "a:still-here" {
		t.Fatalf("open session moved by the offload: %q", got)
	}
	t.Log("while a offloads, its new session runs on b; the open and the forwarded sessions stay on a")

	// ---- closing every session releases the drain counters on all shells
	for _, s := range []*wsConn{ws, direct, via} {
		s.closeFrame()
	}
	wait("sessions released", 30*time.Second, func() bool {
		return a.runtime.Router.Active() == 0 && b.runtime.Router.Active() == 0 && f.runtime.Router.Active() == 0 && coreA.open.Load() == 0 && coreB.open.Load() == 0
	})
}

// ---- a minimal RFC 6455 endpoint: unfragmented frames only

const wsGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

func wsAccept(key string) string {
	sum := sha1.Sum([]byte(key + wsGUID))
	return base64.StdEncoding.EncodeToString(sum[:])
}

func wsWrite(w *bufio.Writer, masked bool, op byte, payload []byte) error {
	header := []byte{0x80 | op}
	maskBit := byte(0)
	if masked {
		maskBit = 0x80
	}
	switch n := len(payload); {
	case n < 126:
		header = append(header, maskBit|byte(n))
	case n < 1<<16:
		header = append(header, maskBit|126, byte(n>>8), byte(n))
	default:
		header = append(header, maskBit|127)
		header = binary.BigEndian.AppendUint64(header, uint64(n))
	}
	body := payload
	if masked {
		var key [4]byte
		_, _ = rand.Read(key[:])
		header = append(header, key[:]...)
		body = make([]byte, len(payload))
		for i := range payload {
			body[i] = payload[i] ^ key[i%4]
		}
	}
	if _, err := w.Write(header); err != nil {
		return err
	}
	if _, err := w.Write(body); err != nil {
		return err
	}
	return w.Flush()
}

func wsRead(r *bufio.Reader) (byte, []byte, error) {
	var h [2]byte
	if _, err := io.ReadFull(r, h[:]); err != nil {
		return 0, nil, err
	}
	if h[0]&0x80 == 0 {
		return 0, nil, errors.New("fragmented frame")
	}
	n := uint64(h[1] & 0x7f)
	switch n {
	case 126:
		var ext [2]byte
		if _, err := io.ReadFull(r, ext[:]); err != nil {
			return 0, nil, err
		}
		n = uint64(binary.BigEndian.Uint16(ext[:]))
	case 127:
		var ext [8]byte
		if _, err := io.ReadFull(r, ext[:]); err != nil {
			return 0, nil, err
		}
		n = binary.BigEndian.Uint64(ext[:])
	}
	var key [4]byte
	masked := h[1]&0x80 != 0
	if masked {
		if _, err := io.ReadFull(r, key[:]); err != nil {
			return 0, nil, err
		}
	}
	payload := make([]byte, n)
	if _, err := io.ReadFull(r, payload); err != nil {
		return 0, nil, err
	}
	if masked {
		for i := range payload {
			payload[i] ^= key[i%4]
		}
	}
	return h[0] & 0x0f, payload, nil
}

// wsBackend is the stand-in core: it echoes each message prefixed with its
// name and records what reached it.
type wsBackend struct {
	*httptest.Server
	auth   atomic.Value
	leaked atomic.Bool
	open   atomic.Int64
}

func newWSBackend(t *testing.T, name string) *wsBackend {
	b := &wsBackend{}
	b.auth.Store("")
	b.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		if !strings.EqualFold(q.Header.Get("Upgrade"), "websocket") || q.Header.Get("Sec-WebSocket-Key") == "" {
			http.Error(w, "websocket only", http.StatusUpgradeRequired)
			return
		}
		b.auth.Store(q.Header.Get("Authorization"))
		for k := range q.Header {
			if strings.HasPrefix(strings.ToLower(k), "x-sub2api-") {
				b.leaked.Store(true)
			}
		}
		conn, rw, err := w.(http.Hijacker).Hijack()
		if err != nil {
			t.Error(err)
			return
		}
		defer conn.Close()
		b.open.Add(1)
		defer b.open.Add(-1)
		fmt.Fprintf(rw, "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n", wsAccept(q.Header.Get("Sec-WebSocket-Key")))
		if rw.Flush() != nil {
			return
		}
		for {
			op, msg, err := wsRead(rw.Reader)
			if err != nil || op == 8 {
				return
			}
			if wsWrite(rw.Writer, false, op, append([]byte(name+":"), msg...)) != nil {
				return
			}
		}
	}))
	t.Cleanup(b.Close)
	return b
}

type wsConn struct {
	net.Conn
	r *bufio.Reader
	w *bufio.Writer
}

// dialWS opens a session through a public listener; the status is 101 on
// success, otherwise the HTTP status of the refusal.
func dialWS(t *testing.T, base, path, authorization string) (*wsConn, int) {
	t.Helper()
	u, err := url.Parse(base)
	if err != nil {
		t.Fatal(err)
	}
	conn, err := net.DialTimeout("tcp", u.Host, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	_ = conn.SetDeadline(time.Now().Add(20 * time.Second))
	var nonce [16]byte
	_, _ = rand.Read(nonce[:])
	key := base64.StdEncoding.EncodeToString(nonce[:])
	fmt.Fprintf(conn, "GET %s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: %s\r\nAuthorization: %s\r\n\r\n", path, u.Host, key, authorization)
	r := bufio.NewReader(conn)
	res, err := http.ReadResponse(r, nil)
	if err != nil {
		conn.Close()
		t.Fatalf("websocket handshake: %v", err)
	}
	if res.StatusCode != http.StatusSwitchingProtocols {
		_, _ = io.Copy(io.Discard, res.Body)
		conn.Close()
		return nil, res.StatusCode
	}
	if res.Header.Get("Sec-WebSocket-Accept") != wsAccept(key) {
		conn.Close()
		t.Fatal("handshake accept value changed on the way")
	}
	return &wsConn{Conn: conn, r: r, w: bufio.NewWriter(conn)}, res.StatusCode
}

func (c *wsConn) echo(t *testing.T, msg string) string {
	t.Helper()
	_ = c.SetDeadline(time.Now().Add(20 * time.Second))
	if err := wsWrite(c.w, true, 1, []byte(msg)); err != nil {
		t.Fatalf("websocket write: %v", err)
	}
	op, payload, err := wsRead(c.r)
	if err != nil || op != 1 {
		t.Fatalf("websocket read: op %d %v", op, err)
	}
	return string(payload)
}

func (c *wsConn) closeFrame() {
	_ = wsWrite(c.w, true, 8, nil)
	_ = c.Close()
}

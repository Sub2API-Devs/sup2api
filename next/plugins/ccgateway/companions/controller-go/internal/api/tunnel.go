package api

import (
	"bufio"
	"errors"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// handleTunnel is handle_tunnel: GET /accounts/<key>/tunnel upgrades the
// connection to raw bytes toward the account Worker's port (T1-T8).
func (ex *exchange) handleTunnel(aid string) {
	r := ex.r
	ex.close = true // the connection never returns to HTTP
	if r.Method != http.MethodGet {
		ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", false)
		return
	}
	upgrade := false
	for _, t := range strings.Split(r.Header.Get("Connection"), ",") {
		if strings.ToLower(strings.TrimSpace(t)) == "upgrade" {
			upgrade = true
		}
	}
	if strings.ToLower(strings.TrimSpace(r.Header.Get("Upgrade"))) != "ccg-tunnel" || !upgrade ||
		len(r.TransferEncoding) > 0 || ex.rawContentLength("0") != "0" {
		ex.fail(http.StatusBadRequest, "invalid_request", false)
		return
	}
	target, err := ex.s.accounts.Connection(r.Context(), aid, r.Header.Get("X-CCG-Revision"))
	if err != nil {
		ex.answerError(err, tunnelErrors, false)
		return
	}
	if target == nil {
		ex.fail(http.StatusConflict, "not_synchronized", false)
		return
	}
	up, err := ex.s.dial("tcp", net.JoinHostPort(target.AppIP, strconv.Itoa(target.Port)), DialTimeout)
	if err != nil {
		ex.fail(http.StatusServiceUnavailable, "runtime_unavailable", false) // not logged (T3)
		return
	}
	client, rw, err := http.NewResponseController(ex.w).Hijack()
	if err != nil {
		up.Close()
		ex.fail(http.StatusServiceUnavailable, "runtime_unavailable", false)
		return
	}
	ex.hijacked = true
	ex.s.splice(client, rw.Reader, up)
}

// splice answers 101 and copies bytes both ways until both directions end
// (T4-T7). The bytes already buffered behind the upgrade request (a
// pipelined request) go first. EOF on one side half-closes the other; a
// failure or TunnelIdle without progress in either direction ends both.
// Content is never inspected or logged.
func (s *Server) splice(client net.Conn, buffered *bufio.Reader, up net.Conn) {
	defer client.Close()
	defer up.Close()
	if !s.track(client) {
		return
	}
	defer s.untrack(client)
	if !s.track(up) {
		return
	}
	defer s.untrack(up)
	idle := s.tunIdle
	head := "HTTP/1.1 101 Switching Protocols\r\nDate: " + time.Now().UTC().Format(http.TimeFormat) +
		"\r\nConnection: Upgrade\r\nUpgrade: ccg-tunnel\r\n\r\n"
	client.SetWriteDeadline(time.Now().Add(idle))
	if _, err := io.WriteString(client, head); err != nil {
		return
	}
	var once sync.Once
	closeBoth := func() {
		once.Do(func() {
			client.Close()
			up.Close()
		})
	}
	if n := buffered.Buffered(); n > 0 {
		pending, _ := buffered.Peek(n)
		up.SetWriteDeadline(time.Now().Add(idle))
		if _, err := up.Write(pending); err != nil {
			return
		}
		buffered.Discard(n)
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		pump(client, up, idle, closeBoth) // Worker -> client
	}()
	pump(up, client, idle, closeBoth) // client -> Worker
	<-done
}

// pump copies src to dst. At src's EOF it half-closes dst and returns;
// any other failure, an idle timeout included, ends both directions.
func pump(dst, src net.Conn, idle time.Duration, closeBoth func()) {
	buf := make([]byte, 64<<10)
	for {
		src.SetReadDeadline(time.Now().Add(idle))
		n, err := src.Read(buf)
		if n > 0 {
			dst.SetWriteDeadline(time.Now().Add(idle))
			if _, werr := dst.Write(buf[:n]); werr != nil {
				closeBoth()
				return
			}
		}
		if errors.Is(err, io.EOF) {
			closeWrite(dst, closeBoth)
			return
		}
		if err != nil {
			closeBoth()
			return
		}
	}
}

// closeWrite is shutdown(SHUT_WR) on a TCP connection; any other
// connection (TLS, a pipe) cannot be half-closed and ends both directions.
func closeWrite(c net.Conn, closeBoth func()) {
	if tcp, ok := c.(*net.TCPConn); ok {
		tcp.CloseWrite()
		return
	}
	closeBoth()
}

package ccgateway

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Account model traffic in controller mode (§53.4): every connection is a
// fresh "ccg-tunnel" Upgrade through the control panel, after which the TLS
// connection carries the raw TCP stream to the account's app_ip:8787. The
// core speaks the same HTTP/1.1 over it as over SSH direct-tcpip.

// tunnelSetupTimeout bounds one tunnel set-up (connect, TLS, Upgrade answer).
var tunnelSetupTimeout = 30 * time.Second

const maxTunnelHeader = 64 << 10

// dialTunnel opens one tunnel to the runtime key at revision.
func dialTunnel(ctx context.Context, cfg Config, runtimeKey, revision string) (net.Conn, error) {
	if (!accountKeyPattern.MatchString(runtimeKey) && !isDraftKey(runtimeKey)) || revision == "" || cfg.AdminKey == "" ||
		strings.ContainsAny(revision+cfg.AdminKey, "\r\n\x00") {
		return nil, errors.New("invalid account tunnel request")
	}
	addr, err := controllerAddress(cfg)
	if err != nil {
		return nil, err
	}
	if p, ok := normalizeBasePath(cfg.BasePath); !ok || p != cfg.BasePath {
		return nil, errors.New("invalid control panel base path")
	}
	ctx, cancel := context.WithTimeout(ctx, tunnelSetupTimeout)
	defer cancel()
	conn, err := dialController(ctx, cfg)
	if err != nil {
		return nil, err
	}
	deadline, _ := ctx.Deadline()
	_ = conn.SetDeadline(deadline)
	stop := context.AfterFunc(ctx, func() { _ = conn.SetDeadline(time.Unix(1, 0)) })
	fail := func(err error) (net.Conn, error) {
		stop()
		_ = conn.Close()
		return nil, err
	}
	request := "GET " + cfg.BasePath + "/accounts/" + runtimeKey + "/tunnel HTTP/1.1\r\n" +
		"Host: " + addr + "\r\n" +
		"Authorization: Bearer " + cfg.AdminKey + "\r\n" +
		"X-CCG-Revision: " + revision + "\r\n" +
		"Connection: Upgrade\r\n" +
		"Upgrade: ccg-tunnel\r\n\r\n"
	if _, err = io.WriteString(conn, request); err != nil {
		return fail(errors.New("account tunnel request failed"))
	}
	header := &cappedReader{r: conn, n: maxTunnelHeader}
	br := bufio.NewReader(header)
	res, err := http.ReadResponse(br, &http.Request{Method: http.MethodGet})
	if err != nil {
		return fail(errors.New("account tunnel answer invalid"))
	}
	if res.StatusCode == http.StatusConflict {
		return fail(errAccountNotSynchronized)
	}
	if res.StatusCode != http.StatusSwitchingProtocols || !strings.EqualFold(res.Header.Get("Upgrade"), "ccg-tunnel") {
		return fail(errors.New("account tunnel refused"))
	}
	if !stop() {
		_ = conn.Close()
		return nil, ctx.Err()
	}
	_ = conn.SetDeadline(time.Time{})
	// Bytes of the tunnel that arrived with the answer.
	pending, _ := br.Peek(br.Buffered())
	return &tunnelConn{Conn: conn, r: io.MultiReader(bytes.NewReader(bytes.Clone(pending)), conn)}, nil
}

// cappedReader fails after n bytes (bounds the Upgrade answer header).
type cappedReader struct {
	r io.Reader
	n int
}

func (c *cappedReader) Read(p []byte) (int, error) {
	if c.n <= 0 {
		return 0, errors.New("account tunnel answer too large")
	}
	if len(p) > c.n {
		p = p[:c.n]
	}
	n, err := c.r.Read(p)
	c.n -= n
	return n, err
}

type tunnelConn struct {
	net.Conn
	r io.Reader
}

func (t *tunnelConn) Read(p []byte) (int, error) { return t.r.Read(p) }

// accountTunnelClient is the HTTP client of one account endpoint (target is
// app_ip:8787) over tunnels. The first tunnel is opened at once so that an
// unsynchronized runtime is reported as errAccountNotSynchronized.
func accountTunnelClient(ctx context.Context, cfg Config, runtimeKey, revision, target string) (*http.Client, func() error, error) {
	first, err := dialTunnel(ctx, cfg, runtimeKey, revision)
	if err != nil {
		return nil, nil, err
	}
	var mu sync.Mutex
	// Same transport settings as the SSH direct-tcpip path, so requests are
	// written identically.
	transport := &http.Transport{Proxy: nil, MaxResponseHeaderBytes: 64 << 10, MaxIdleConns: 2, MaxConnsPerHost: 4, IdleConnTimeout: 30 * time.Second}
	transport.DialContext = func(dialCtx context.Context, network, address string) (net.Conn, error) {
		if network != "tcp" || address != target {
			return nil, errors.New("account tunnel destination rejected")
		}
		mu.Lock()
		conn := first
		first = nil
		mu.Unlock()
		if conn != nil {
			return conn, nil
		}
		return dialTunnel(dialCtx, cfg, runtimeKey, revision)
	}
	var once sync.Once
	closeAll := func() error {
		once.Do(func() {
			transport.CloseIdleConnections()
			mu.Lock()
			if first != nil {
				_ = first.Close()
				first = nil
			}
			mu.Unlock()
		})
		return nil
	}
	client := &http.Client{Transport: fixedTarget{rt: transport, scheme: "http", host: target}, CheckRedirect: func(*http.Request, []*http.Request) error {
		return errors.New("account tunnel redirects are disabled")
	}}
	return client, closeAll, nil
}

package remotedocker

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"

	"golang.org/x/crypto/ssh"
)

// NewHTTPClient forwards HTTP through SSH to one server-selected loopback
// destination, e.g. 127.0.0.1:8787. Never derive target from untrusted input.
// Requests must use http://target/...; redirects and other destinations fail.
// ctx owns the connection lifetime. The caller must provide a deadline or
// cancellation policy and invoke the returned close. HTTP headers and streaming
// bodies have no independent timeout; only the SSH handshake is bounded.
func NewHTTPClient(ctx context.Context, cfg Config, target string) (*http.Client, func() error, error) {
	return newHTTPClient(ctx, cfg, target, timeout)
}

func newHTTPClient(ctx context.Context, cfg Config, target string, handshakeTimeout time.Duration) (*http.Client, func() error, error) {
	host, port, err := net.SplitHostPort(target)
	if err != nil {
		return nil, nil, errors.New("invalid HTTP forwarding target")
	}
	ip := net.ParseIP(host)
	pn, err := strconv.Atoi(port)
	if ip == nil || !ip.IsLoopback() || err != nil || pn < 1 || pn > 65535 {
		return nil, nil, errors.New("HTTP forwarding requires a fixed loopback target")
	}
	addr, err := address(cfg.Host, cfg.Port)
	if err != nil {
		return nil, nil, err
	}
	sshCfg, err := clientConfig(cfg)
	if err != nil {
		return nil, nil, err
	}
	connectCtx, cancel := context.WithTimeout(ctx, handshakeTimeout)
	defer cancel()
	conn, err := (&net.Dialer{}).DialContext(connectCtx, "tcp", addr)
	if err != nil {
		return nil, nil, safeError(connectCtx, "SSH connection failed")
	}
	stopHandshake := context.AfterFunc(connectCtx, func() { _ = conn.Close() })
	cc, chans, reqs, err := ssh.NewClientConn(conn, addr, sshCfg)
	stopHandshake()
	if err != nil {
		_ = conn.Close()
		return nil, nil, safeError(connectCtx, "SSH handshake, host key verification, or authentication failed")
	}
	sc := ssh.NewClient(cc, chans, reqs)
	transport := &http.Transport{Proxy: nil, MaxResponseHeaderBytes: 64 << 10, MaxIdleConns: 2, MaxConnsPerHost: 4, IdleConnTimeout: timeout}
	transport.DialContext = func(dialCtx context.Context, network, address string) (net.Conn, error) {
		if network != "tcp" || address != target {
			return nil, errors.New("HTTP forwarding destination rejected")
		}
		c, e := sc.DialContext(dialCtx, "tcp", target)
		if e != nil {
			return nil, safeError(dialCtx, "SSH HTTP forwarding failed")
		}
		return c, nil
	}
	var once sync.Once
	var closeErr error
	closeConn := func() error {
		once.Do(func() { transport.CloseIdleConnections(); closeErr = sc.Close() })
		return closeErr
	}
	stopLifetime := context.AfterFunc(ctx, func() { _ = closeConn() })
	closeAll := func() error { stopLifetime(); return closeConn() }
	client := &http.Client{Transport: fixedTargetTransport{transport: transport, target: target}, CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
		return errors.New("HTTP forwarding redirects are disabled")
	}}
	return client, closeAll, nil
}

type fixedTargetTransport struct {
	transport *http.Transport
	target    string
}

func (f fixedTargetTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.Scheme != "http" || req.URL.Host != f.target || req.URL.User != nil || (req.Host != "" && req.Host != f.target) {
		return nil, errors.New("HTTP forwarding destination rejected")
	}
	return f.transport.RoundTrip(req)
}

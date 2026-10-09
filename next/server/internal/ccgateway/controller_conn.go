package ccgateway

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// controllerDialTimeout bounds the TCP connect and the TLS handshake to the
// control panel, each (§53.4).
const controllerDialTimeout = 10 * time.Second

// stageError tells where reaching the control panel failed: "connect" or
// "tls" (§53.3 details.stage; plain HTTP panels only have "connect").
type stageError struct {
	stage string
	err   error
}

func (e *stageError) Error() string { return "control panel " + e.stage + " failed" }
func (e *stageError) Unwrap() error { return e.err }

// controllerAddress is host:port of a controller-mode configuration.
func controllerAddress(cfg Config) (string, error) {
	if cfg.Mode != "controller" || !validControllerHost(cfg.Host) || cfg.Port < 1 || cfg.Port > 65535 {
		return "", errors.New("invalid control panel address")
	}
	if cfg.Scheme != "" && cfg.Scheme != "https" && cfg.Scheme != "http" {
		return "", errors.New("invalid control panel scheme")
	}
	return net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port)), nil
}

// controllerTLSConfig trusts only the pinned roots when there are any, else
// the system roots; HTTP/1.1 only (the tunnel is an HTTP/1.1 Upgrade).
func controllerTLSConfig(cfg Config) (*tls.Config, error) {
	tc := &tls.Config{MinVersion: tls.VersionTLS12, ServerName: cfg.Host, NextProtos: []string{"http/1.1"}}
	if cfg.ControllerCA != "" {
		certs, err := controllerCerts(cfg.ControllerCA)
		if err != nil {
			return nil, err
		}
		pool := x509.NewCertPool()
		for _, cert := range certs {
			pool.AddCert(cert)
		}
		tc.RootCAs = pool
	}
	return tc, nil
}

// dialController opens one connection to the control panel: verified TLS,
// or plain TCP for an "http" panel (§53.9).
func dialController(ctx context.Context, cfg Config) (net.Conn, error) {
	addr, err := controllerAddress(cfg)
	if err != nil {
		return nil, err
	}
	var tc *tls.Config
	if cfg.panelScheme() == "https" {
		if tc, err = controllerTLSConfig(cfg); err != nil {
			return nil, err
		}
	}
	dialCtx, cancel := context.WithTimeout(ctx, controllerDialTimeout)
	raw, err := (&net.Dialer{}).DialContext(dialCtx, "tcp", addr)
	cancel()
	if err != nil {
		return nil, &stageError{stage: "connect", err: err}
	}
	if tc == nil {
		return raw, nil
	}
	handshakeCtx, cancel := context.WithTimeout(ctx, controllerDialTimeout)
	defer cancel()
	conn := tls.Client(raw, tc)
	if err = conn.HandshakeContext(handshakeCtx); err != nil {
		_ = raw.Close()
		return nil, &stageError{stage: "tls", err: err}
	}
	if p := conn.ConnectionState().NegotiatedProtocol; p != "" && p != "http/1.1" {
		_ = conn.Close()
		return nil, &stageError{stage: "tls", err: errors.New("unexpected application protocol")}
	}
	return conn, nil
}

// openControllerPanel is open() in controller mode: requests go only to
// <scheme>://host:port<base_path>/..., without proxies, HTTP/2 or redirects.
func openControllerPanel(cfg Config) (*http.Client, string, func() error, error) {
	addr, err := controllerAddress(cfg)
	if err != nil {
		return nil, "", nil, err
	}
	if p, ok := normalizeBasePath(cfg.BasePath); !ok || p != cfg.BasePath {
		return nil, "", nil, errors.New("invalid control panel base path")
	}
	scheme := cfg.panelScheme()
	if scheme == "https" {
		if _, err = controllerTLSConfig(cfg); err != nil {
			return nil, "", nil, err
		}
	}
	tr := &http.Transport{Proxy: nil, ForceAttemptHTTP2: false, TLSNextProto: map[string]func(string, *tls.Conn) http.RoundTripper{},
		MaxResponseHeaderBytes: 64 << 10, MaxIdleConns: 4, MaxIdleConnsPerHost: 4, IdleConnTimeout: 90 * time.Second}
	dial := func(ctx context.Context, network, address string) (net.Conn, error) {
		if network != "tcp" || address != addr {
			return nil, errors.New("control panel destination rejected")
		}
		return dialController(ctx, cfg)
	}
	if scheme == "https" {
		tr.DialTLSContext = dial
		tr.DialContext = func(context.Context, string, string) (net.Conn, error) {
			return nil, errors.New("control panel destination rejected")
		}
	} else {
		tr.DialContext = dial
		tr.DialTLSContext = func(context.Context, string, string) (net.Conn, error) {
			return nil, errors.New("control panel destination rejected")
		}
	}
	client := &http.Client{Transport: fixedTarget{rt: tr, scheme: scheme, host: addr, prefix: cfg.BasePath}, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return client, scheme + "://" + addr + cfg.BasePath, func() error { tr.CloseIdleConnections(); return nil }, nil
}

// fixedTarget rejects requests to anything but scheme://host, and with a
// prefix to paths outside prefix/ (no dot segments).
type fixedTarget struct {
	rt     http.RoundTripper
	scheme string
	host   string
	prefix string
}

func (f fixedTarget) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.URL.Scheme != f.scheme || req.URL.Host != f.host || req.URL.User != nil || (req.Host != "" && req.Host != f.host) || !f.pathAllowed(req.URL) {
		if req.Body != nil {
			_ = req.Body.Close()
		}
		return nil, errors.New("control panel destination rejected")
	}
	return f.rt.RoundTrip(req)
}

func (f fixedTarget) pathAllowed(u *url.URL) bool {
	if f.prefix == "" {
		return true
	}
	p := u.EscapedPath()
	return strings.HasPrefix(p, f.prefix+"/") && !strings.Contains(p+"/", "/../") && !strings.Contains(p+"/", "/./")
}

// Package egress routes a plugin's outbound network traffic through the
// host's EgressService tunnel. In strict mode (Linux) the kernel refuses
// direct TCP/UDP sockets, so every connection must use this package.
//
// After InitHost, call Install once: http.DefaultTransport and
// net.DefaultResolver are replaced, so net/http clients built on the default
// transport (or a Clone of it) and Go DNS lookups go through the tunnel.
// Database, Redis and gRPC clients must use DialContext explicitly, e.g.
// pgx: cfg.ConnConfig.DialFunc = egress.DialContext.
package egress

import (
	"context"
	"errors"
	"net"
	"net/http"
	"sync"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// DNSAddress is the host-provided DNS-over-TCP endpoint.
const DNSAddress = "dns.sub2api:53"

// ErrNotInstalled is returned by DialContext before Install.
var ErrNotInstalled = errors.New("egress: not installed")

var (
	mu     sync.RWMutex
	client pluginv1.EgressServiceClient
)

// Install routes http.DefaultTransport and net.DefaultResolver through the
// host EgressService. Safe to call once, after InitHost.
func Install(c pluginv1.EgressServiceClient) error {
	if c == nil {
		return errors.New("egress: nil EgressServiceClient")
	}
	mu.Lock()
	client = c
	mu.Unlock()

	var t *http.Transport
	if dt, ok := http.DefaultTransport.(*http.Transport); ok {
		t = dt.Clone()
	} else {
		t = &http.Transport{
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          100,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: time.Second,
		}
	}
	// The host dials by name; proxies from the environment do not apply.
	t.Proxy = nil
	t.DialContext = DialContext
	t.Dial = nil //nolint:staticcheck // clear the deprecated hook so DialContext is used
	t.DialTLSContext = nil
	t.DialTLS = nil //nolint:staticcheck
	http.DefaultTransport = t

	net.DefaultResolver = &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return DialContext(ctx, "tcp", DNSAddress)
		},
	}
	return nil
}

// DialContext opens a tunnelled TCP connection (for DB/Redis/gRPC clients).
// network must be tcp, tcp4 or tcp6; address is "host:port" and the host
// name is resolved by the core.
func DialContext(ctx context.Context, network, address string) (net.Conn, error) {
	mu.RLock()
	c := client
	mu.RUnlock()
	if c == nil {
		return nil, &net.OpError{Op: "dial", Net: network, Err: ErrNotInstalled}
	}
	return dial(ctx, c, network, address)
}

// TEMPORARY PLACEHOLDER owned by E (sdk-plugins).
//
// The real implementation of this package belongs to D (sandbox-network) and
// lives in egress.go / conn.go on D's branch. When merging, DELETE this file
// and keep D's implementation. This stub only mirrors the API from
// docs/CONTRACTS.md §11.2 so the SDK compiles before D's code lands.

package egress

import (
	"context"
	"errors"
	"net"
	"sync"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

var (
	mu     sync.Mutex
	client pluginv1.EgressServiceClient
)

// errNotImplemented is returned by DialContext in the placeholder build.
var errNotImplemented = errors.New("egress: tunnel not available (placeholder build)")

// Install routes http.DefaultTransport and net.DefaultResolver through the
// host EgressService. Safe to call once, after InitHost.
//
// Placeholder: records the client only.
func Install(c pluginv1.EgressServiceClient) error {
	if c == nil {
		return errors.New("egress: nil client")
	}
	mu.Lock()
	defer mu.Unlock()
	if client != nil {
		return errors.New("egress: already installed")
	}
	client = c
	return nil
}

// DialContext opens a tunnelled TCP connection (for DB/Redis/gRPC clients).
//
// Placeholder: always fails.
func DialContext(ctx context.Context, network, address string) (net.Conn, error) {
	mu.Lock()
	installed := client != nil
	mu.Unlock()
	if !installed {
		return nil, errors.New("egress: not installed")
	}
	return nil, errNotImplemented
}

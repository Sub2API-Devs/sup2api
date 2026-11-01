//go:build !linux

package api

import (
	"context"
	"errors"
	"net"
)

// Listen is Linux only (IP_FREEBIND).
func Listen(ctx context.Context, addr string, retry func()) (net.Listener, error) {
	return nil, errors.ErrUnsupported
}

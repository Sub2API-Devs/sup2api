//go:build linux

package api

import (
	"context"
	"net"
	"syscall"
	"time"
)

// Listen binds with IP_FREEBIND so the address may appear later (the
// control bridge can be created after the guard starts, 03 §3.1). A busy
// port is retried every 2 s.
func Listen(ctx context.Context, addr string, retry func()) (net.Listener, error) {
	lc := net.ListenConfig{Control: func(network, address string, c syscall.RawConn) error {
		var serr error
		if err := c.Control(func(fd uintptr) {
			serr = syscall.SetsockoptInt(int(fd), syscall.IPPROTO_IP, syscall.IP_FREEBIND, 1)
		}); err != nil {
			return err
		}
		return serr
	}}
	for {
		l, err := lc.Listen(ctx, "tcp4", addr)
		if err == nil {
			return l, nil
		}
		if retry != nil {
			retry()
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
}

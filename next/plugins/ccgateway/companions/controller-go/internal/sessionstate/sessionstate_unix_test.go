//go:build unix

package sessionstate

import (
	"context"
	"errors"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	"ccgateway/controller/internal/sessionstate/fakevalkey"
)

// covers: SESSION-MEMORY §7.5 the real unix socket path: absent socket is
// "not configured", a socket nobody listens on is "down", a listening one
// works
func TestClientUnixSocket(t *testing.T) {
	dir, err := os.MkdirTemp("", "ccgss") // short: sun_path is 108 bytes
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	sock := filepath.Join(dir, "valkey.sock")
	c := &Client{Socket: sock, Secret: func() ([]byte, error) { return []byte(adminPass), nil }, Timeout: time.Second}
	ctx := context.Background()
	if _, err := c.Observe(ctx); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("absent socket: %v", err)
	}
	l, err := net.ListenUnix("unix", &net.UnixAddr{Name: sock, Net: "unix"})
	if err != nil {
		t.Fatal(err)
	}
	l.SetUnlinkOnClose(false)
	l.Close() // the file stays, nobody listens: Valkey stopped
	if _, err := c.Observe(ctx); err == nil || errors.Is(err, ErrNotConfigured) {
		t.Fatalf("stale socket: %v", err)
	}
	os.Remove(sock)
	l2, err := net.Listen("unix", sock)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { l2.Close() })
	fv := fakevalkey.New(adminPass)
	go fv.Serve(l2)
	if err := c.SetUser(ctx, "21", "pw", true); err != nil {
		t.Fatal(err)
	}
	info, err := c.Observe(ctx)
	if err != nil || !info.HasUser("21") {
		t.Fatal(info, err)
	}
}

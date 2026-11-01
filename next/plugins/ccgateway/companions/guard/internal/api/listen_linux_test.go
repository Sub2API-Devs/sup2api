//go:build linux

package api

import (
	"context"
	"net"
	"testing"
	"time"
)

// covers: 03§3.1 IP_FREEBIND: the listen address may not exist yet
func TestListenFreebind(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	l, err := Listen(ctx, "172.29.255.249:18790", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	if l.Addr().(*net.TCPAddr).IP.String() != "172.29.255.249" {
		t.Fatal(l.Addr())
	}
}

//go:build !ccgwired

package main

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"

	"ccgateway/controller/internal/guardapi/fakeguard"
)

// PENDING: removed together with wire_pending.go by the coordinator.

// covers: E1 (new: a binary built without the business packages refuses
// to serve: exit 70, an ERROR line, never a listener)
func TestServeNotWiredFailsLoudly(t *testing.T) {
	g := httptest.NewServer(fakeguard.New().Handler())
	defer g.Close()
	var stderr lockedBuffer
	code := serve(context.Background(), env(t, t.TempDir(), g.URL, map[string]string{"CCG_CONTROLLER_PORT": freePort(t)}),
		&stderr, build, nil)
	if code != exitNotWired {
		t.Fatalf("exit %d, want %d", code, exitNotWired)
	}
	if !strings.Contains(stderr.String(), "ERROR ccgateway.controller cannot start: serve is not wired yet") {
		t.Fatal(stderr.String())
	}
	if strings.Contains(stderr.String(), "listening") {
		t.Fatal("it listened")
	}
}

package server

import (
	"testing"
	"time"
)

// The core keeps an idle account connection for up to 110 s and only then
// closes it (CONTRACTS §63.8). A Worker that closed its end first would be
// one the core writes into: the request then fails instead of running on the
// tunnel it kept. The Worker's idle limit must stay well above the core's,
// with room for a clock that is not perfectly shared.
func TestIdleTimeoutOutlastsTheCoreTunnel(t *testing.T) {
	const coreIdleTimeout = 110 * time.Second
	if idleTimeout < 180*time.Second {
		t.Fatalf("Worker idle timeout %v must be at least 180 s", idleTimeout)
	}
	if idleTimeout <= coreIdleTimeout {
		t.Fatalf("Worker idle timeout %v must exceed the core's %v", idleTimeout, coreIdleTimeout)
	}
}

// The server keeps the timeouts a request path depends on: a header deadline
// so an idle peer cannot hold a slot, and the idle limit above.
func TestServerTimeouts(t *testing.T) {
	s := New(&mockWorker{}, 8788, "")
	if s.srv.ReadHeaderTimeout != 10*time.Second {
		t.Fatalf("read header timeout %v", s.srv.ReadHeaderTimeout)
	}
	if s.srv.IdleTimeout != idleTimeout {
		t.Fatalf("idle timeout %v", s.srv.IdleTimeout)
	}
}

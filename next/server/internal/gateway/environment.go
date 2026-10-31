package gateway

import (
	"io"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// environment resolves the environment variables (CONTRACTS §73.3) of an
// attempt on ref; a nil ref resolves the request before an account is chosen.
func (c *call) environment(ref *core.AccountRef) core.Environment {
	var global, group, account core.EnvironmentValues
	if c.g.d.Environment != nil {
		global = c.g.d.Environment.GlobalEnvironment(c.c.Request.Context())
	}
	if c.principal != nil {
		group = c.principal.Group.Environment
	}
	if ref != nil {
		account = ref.Environment
	}
	return core.ResolveEnvironment(global, group, account)
}

// idleBody cancels the upstream request when a streamed response delivers
// nothing for the idle timeout (streaming_idle_timeout_seconds). Each read
// that returns re-arms the timer.
type idleBody struct {
	io.ReadCloser
	timer *time.Timer
	idle  time.Duration
	fired *atomic.Bool
}

func newIdleBody(body io.ReadCloser, idle time.Duration, cancel func()) *idleBody {
	fired := &atomic.Bool{}
	return &idleBody{ReadCloser: body, idle: idle, fired: fired, timer: time.AfterFunc(idle, func() {
		fired.Store(true)
		cancel()
	})}
}

func (b *idleBody) Read(p []byte) (int, error) {
	n, err := b.ReadCloser.Read(p)
	if n > 0 {
		b.timer.Reset(b.idle)
	}
	return n, err
}

func (b *idleBody) Close() error {
	b.timer.Stop()
	return b.ReadCloser.Close()
}

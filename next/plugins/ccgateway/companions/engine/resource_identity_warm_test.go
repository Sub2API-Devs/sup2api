package engine

import (
	"bytes"
	"context"
	"log"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// An identity about to expire is verified again in the background while the
// account is in use (CONTRACTS §63.4). A fresh identity, an idle account, an
// authorization change in progress and a Worker without a free slot skip the
// round; a failed refresh keeps the cached identity until it expires.
func TestKeepIdentityWarm(t *testing.T) {
	g, _ := identityTestGateway(t)
	b, ctx := g.resources, context.Background()
	// A verification that runs fails here and is logged: the log tells
	// whether the round verified.
	g.Runner.CLI = "must-not-execute"
	var logs bytes.Buffer
	log.SetOutput(&logs)
	t.Cleanup(func() { log.SetOutput(os.Stderr) })
	verified := func() bool {
		b.keepIdentityWarm(ctx)
		defer logs.Reset()
		return strings.Contains(logs.String(), "resource identity refresh failed")
	}
	age := func(d time.Duration) {
		v := *b.verified.Load()
		v.at = time.Now().Add(-d)
		b.verified.Store(&v)
	}

	b.touch()
	require.False(t, verified(), "a fresh identity")
	age(identityRefreshAge + time.Second)
	b.used.Store(time.Now().Add(-identityKeepWarm - time.Minute).UnixNano())
	require.False(t, verified(), "an idle account")
	b.touch()
	b.authority.mu.Lock()
	require.False(t, verified(), "an authorization change in progress")
	b.authority.mu.Unlock()
	g.Slots <- struct{}{}
	require.False(t, verified(), "a Worker without a free slot")
	<-g.Slots
	b.verifying.Lock()
	require.False(t, verified(), "a verification already running")
	b.verifying.Unlock()
	require.True(t, verified(), "in use and about to expire")
	require.NotNil(t, b.cachedIdentity(g.Runner.baseEnv()), "the failed refresh kept the cached identity")
}

package gateway

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type fakeEnvironment struct{ global core.EnvironmentValues }

func (f fakeEnvironment) GlobalEnvironment(context.Context) core.EnvironmentValues { return f.global }
func (f fakeEnvironment) ResolveEnvironment(context.Context, int64, int64) (core.Environment, error) {
	return core.ResolveEnvironment(f.global, nil, nil), nil
}

func withEnvironment(global, group core.EnvironmentValues) envOpt {
	return func(e *env) {
		p := e.auth.keys[testKey]
		p.Group.Environment = group
		e.auth.keys[testKey] = p
		e.envGlobal = global
	}
}

func TestEnvironmentReachesBuildMeta(t *testing.T) {
	e := newEnv(t, withEnvironment(core.EnvironmentValues{core.EnvVarRelayTimeoutSeconds: 300},
		core.EnvironmentValues{core.EnvVarTaskPollMaxFailures: 10, core.EnvVarRelayTimeoutSeconds: 120}))
	e.accounts.mu.Lock()
	e.accounts.accounts[1].Environment = core.EnvironmentValues{core.EnvVarRelayTimeoutSeconds: 90}
	e.accounts.mu.Unlock()
	r := e.messages(body(testModel, false))
	require.Equal(t, 200, r.status, string(r.body))
	e.plat.mu.Lock()
	meta := e.plat.builds[0].GetMeta()
	e.plat.mu.Unlock()
	require.Equal(t, map[string]int64{core.EnvVarTaskPollMaxFailures: 10, core.EnvVarRelayTimeoutSeconds: 90}, meta.GetEnvironment())
}

func TestEnvironmentRequestBodyLimitFromGroup(t *testing.T) {
	e := newEnv(t, withEnvironment(nil, core.EnvironmentValues{core.EnvVarMaxRequestBodyMB: 1}))
	big := `{"model":"` + testModel + `","max_tokens":16,"messages":[{"role":"user","content":"` + strings.Repeat("x", 1<<20) + `"}]}`
	r := e.messages(big)
	require.Equal(t, 413, r.status)
}

func TestEnvironmentResponseHeaderTimeout(t *testing.T) {
	e := newEnv(t, withEnvironment(core.EnvironmentValues{core.EnvVarResponseHeaderTimeoutSeconds: 1}, nil))
	for _, key := range []string{"acc-1", "acc-2", "acc-3"} {
		e.up.set(key, &upstreamRule{status: 200, delay: 3 * time.Second})
	}
	start := time.Now()
	r := e.messages(body(testModel, false))
	require.NotEqual(t, 200, r.status)
	// Three attempts, each cut after one second instead of waiting three.
	require.Less(t, time.Since(start), 6*time.Second)
}

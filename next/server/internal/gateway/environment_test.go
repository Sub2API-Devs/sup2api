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

// max_request_body_mb replaces the default of an endpoint that declares no
// limit, and only raises one the endpoint declares.
func TestEnvironmentRequestBodyLimit(t *testing.T) {
	e := newEnv(t, withEnvironment(nil, core.EnvironmentValues{core.EnvVarMaxRequestBodyMB: 1}))
	big := body(testModel, false, "pad", strings.Repeat("x", 1<<20))
	r := e.messages(big)
	require.Equal(t, 413, r.status, "1 MB replaces the 32 MB default: %s", r.body)

	e.gen.endpoints[0].Endpoint.Request.MaxBodyBytes = 64
	e.gw.table.Store(buildRouteTable(e.gen))
	r = e.messages(body(testModel, false, "pad", strings.Repeat("x", 200)))
	require.Equal(t, 200, r.status, "1 MB raises the endpoint's 64 bytes")
	e.record()
	r = e.messages(big)
	require.Equal(t, 413, r.status)

	e.gen.endpoints[0].Endpoint.Request.MaxBodyBytes = 4 << 20
	e.gw.table.Store(buildRouteTable(e.gen))
	r = e.messages(big)
	require.Equal(t, 200, r.status, "1 MB does not lower the endpoint's 4 MB: %s", r.body)
	e.record()
}

// A timeout that cuts a stream mid-way is named in the usage record.
func TestEnvironmentTimeoutCutsStreamAndNamesIt(t *testing.T) {
	for _, tc := range []struct {
		key   string
		cause error
	}{
		{core.EnvVarRelayTimeoutSeconds, errRelayTimeout},
		{core.EnvVarStreamingIdleTimeoutSeconds, errStreamIdleTimeout},
	} {
		t.Run(tc.key, func(t *testing.T) {
			e := newEnv(t, withEnvironment(core.EnvironmentValues{tc.key: 1}, nil))
			hold := make(chan struct{})
			defer close(hold)
			e.up.set("acc-1", &upstreamRule{hold: hold})
			start := time.Now()
			e.messages(body(testModel, true))
			rec := e.record()
			require.Less(t, time.Since(start), 5*time.Second)
			require.False(t, rec.Success)
			require.Equal(t, "upstream stream interrupted: "+tc.cause.Error(), rec.ErrorMessage)
			require.Contains(t, rec.ErrorMessage, tc.key)
		})
	}
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

package core

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestResolveEnvironmentNearestLayerWins(t *testing.T) {
	env := ResolveEnvironment(
		// The async task variables have no global layer (the reconcile settings are).
		EnvironmentValues{EnvRelayTimeoutSeconds: 60, EnvMaxRequestBodyMB: 8, EnvTaskTimeoutMinutes: 30, EnvTaskPollMaxFailures: 5},
		EnvironmentValues{EnvRelayTimeoutSeconds: 120, EnvMaxRequestBodyMB: 16, EnvTaskTimeoutMinutes: 30},
		// An account cannot hold the body limit; a value left from elsewhere is ignored.
		EnvironmentValues{EnvRelayTimeoutSeconds: 600, EnvMaxRequestBodyMB: 64, EnvStreamingIdleTimeoutSeconds: 999999},
	)
	require.EqualValues(t, 600, env[EnvRelayTimeoutSeconds])
	require.EqualValues(t, 16, env[EnvMaxRequestBodyMB])
	require.EqualValues(t, 30, env[EnvTaskTimeoutMinutes])
	_, set := env[EnvStreamingIdleTimeoutSeconds]
	require.False(t, set, "out of range values are skipped")
	_, set = env[EnvTaskPollMaxFailures]
	require.False(t, set, "a value on a layer the variable lacks is skipped")
	require.Equal(t, 10*time.Minute, env.Duration(EnvRelayTimeoutSeconds))
	require.Equal(t, 30*time.Minute, env.Duration(EnvTaskTimeoutMinutes))
	require.EqualValues(t, 16<<20, env.Bytes(EnvMaxRequestBodyMB))
	require.Zero(t, env.Duration(EnvResponseHeaderTimeoutSeconds))
}

func TestValidateEnvironmentValues(t *testing.T) {
	ctx := context.Background()
	out, fe := ValidateEnvironmentValues(ctx, EnvLayerGroup, "environment", EnvironmentValues{EnvRelayTimeoutSeconds: 30, EnvMaxRequestBodyMB: 0})
	require.Empty(t, fe)
	require.Equal(t, EnvironmentValues{EnvRelayTimeoutSeconds: 30}, out, "0 follows the next layer and is dropped")

	_, fe = ValidateEnvironmentValues(ctx, EnvLayerAccount, "environment", EnvironmentValues{EnvMaxRequestBodyMB: 8, "nope": 1, EnvRelayTimeoutSeconds: 86401})
	fields := map[string]bool{}
	for _, f := range fe {
		fields[f.Field] = true
	}
	require.Equal(t, map[string]bool{"environment.max_request_body_mb": true, "environment.nope": true, "environment.relay_timeout_seconds": true}, fields)
}

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
		EnvironmentValues{EnvVarRelayTimeoutSeconds: 60, EnvVarMaxRequestBodyMB: 8, EnvVarTaskTimeoutMinutes: 30, EnvVarTaskPollMaxFailures: 5},
		EnvironmentValues{EnvVarRelayTimeoutSeconds: 120, EnvVarMaxRequestBodyMB: 16, EnvVarTaskTimeoutMinutes: 30},
		// An account cannot hold the body limit; a value left from elsewhere is ignored.
		EnvironmentValues{EnvVarRelayTimeoutSeconds: 600, EnvVarMaxRequestBodyMB: 64, EnvVarStreamingIdleTimeoutSeconds: 999999},
	)
	require.EqualValues(t, 600, env[EnvVarRelayTimeoutSeconds])
	require.EqualValues(t, 16, env[EnvVarMaxRequestBodyMB])
	require.EqualValues(t, 30, env[EnvVarTaskTimeoutMinutes])
	_, set := env[EnvVarStreamingIdleTimeoutSeconds]
	require.False(t, set, "out of range values are skipped")
	_, set = env[EnvVarTaskPollMaxFailures]
	require.False(t, set, "a value on a layer the variable lacks is skipped")
	require.Equal(t, 10*time.Minute, env.Duration(EnvVarRelayTimeoutSeconds))
	require.Equal(t, 30*time.Minute, env.Duration(EnvVarTaskTimeoutMinutes))
	require.EqualValues(t, 16<<20, env.Bytes(EnvVarMaxRequestBodyMB))
	require.Zero(t, env.Duration(EnvVarResponseHeaderTimeoutSeconds))
}

func TestValidateEnvironmentValues(t *testing.T) {
	ctx := context.Background()
	out, fe := ValidateEnvironmentValues(ctx, EnvLayerGroup, "environment", EnvironmentValues{EnvVarRelayTimeoutSeconds: 30, EnvVarMaxRequestBodyMB: 0})
	require.Empty(t, fe)
	require.Equal(t, EnvironmentValues{EnvVarRelayTimeoutSeconds: 30}, out, "0 follows the next layer and is dropped")

	_, fe = ValidateEnvironmentValues(ctx, EnvLayerAccount, "environment", EnvironmentValues{EnvVarMaxRequestBodyMB: 8, "nope": 1, EnvVarRelayTimeoutSeconds: 86401})
	fields := map[string]bool{}
	for _, f := range fe {
		fields[f.Field] = true
	}
	require.Equal(t, map[string]bool{"environment.max_request_body_mb": true, "environment.nope": true, "environment.relay_timeout_seconds": true}, fields)
}

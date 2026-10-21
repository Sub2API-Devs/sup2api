package engine

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func envValueOf(env []string, name string) (string, bool) {
	for _, item := range env {
		if key, value, ok := strings.Cut(item, "="); ok && strings.EqualFold(key, name) {
			return value, true
		}
	}
	return "", false
}

// The switches must be present and non-empty: the CLI reads DISABLE_TELEMETRY,
// DO_NOT_TRACK, DISABLE_ERROR_REPORTING and CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
// as strings, so an inherited "" would re-enable the channel.
func TestTelemetryDefaultsAreNonEmptySwitches(t *testing.T) {
	defaults := telemetryDefaults()
	for _, name := range []string{
		"DISABLE_AUTOUPDATER",
		"DISABLE_TELEMETRY",
		"DO_NOT_TRACK",
		"DISABLE_ERROR_REPORTING",
		"DISABLE_GROWTHBOOK",
		"DISABLE_FEEDBACK_COMMAND",
		"CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY",
	} {
		require.Equal(t, "1", defaults[name], name)
	}
	require.Equal(t, "0", defaults["CLAUDE_CODE_ENABLE_TELEMETRY"])
}

// These variables remove a tool, a connector or a marketplace install, so they
// must never be set: closing telemetry may not cost a capability.
func TestTelemetryDefaultsKeepEveryCapability(t *testing.T) {
	defaults := telemetryDefaults()
	for _, name := range []string{
		"CLAUDE_CODE_DISABLE_WEB_FETCH",
		"CLAUDE_CODE_DISABLE_ARTIFACT",
		"ENABLE_CLAUDEAI_MCP_SERVERS",
		"CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL",
	} {
		_, present := defaults[name]
		require.False(t, present, name)
	}
}

// Login, refresh and logout are CLI sessions too. They must carry the same
// switches, and an inherited "" or "0" must not survive.
func TestTelemetryDefaultsOverrideInheritedEmptyAndZero(t *testing.T) {
	inherited := envWith(os.Environ(), map[string]string{
		"DISABLE_TELEMETRY":            "",
		"DO_NOT_TRACK":                 "0",
		"DISABLE_ERROR_REPORTING":      "",
		"DISABLE_GROWTHBOOK":           "",
		"DISABLE_FEEDBACK_COMMAND":     "",
		"CLAUDE_CODE_ENABLE_TELEMETRY": "1",
	})
	overrides := NewEnvironmentOverrides(t.TempDir())

	runner := &Runner{Env: inherited, Overrides: overrides}
	auth := &authManager{env: inherited, overrides: overrides}
	for name, env := range map[string][]string{"baseEnv": runner.baseEnv(), "authEnvironment": auth.environment()} {
		for key, want := range telemetryDefaults() {
			got, present := envValueOf(env, key)
			require.True(t, present, name+": "+key+" is missing")
			require.Equal(t, want, got, name+": "+key)
		}
	}
}

// The login processes stop at the pure telemetry switches; the broader
// nonessential-traffic switch stays on the request path only.
func TestTelemetryDefaultsDoNotReachLoginWithNonessentialTraffic(t *testing.T) {
	overrides := NewEnvironmentOverrides(t.TempDir())
	auth := &authManager{env: os.Environ(), overrides: overrides}
	_, present := envValueOf(auth.environment(), "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC")
	require.False(t, present)

	runner := &Runner{Env: os.Environ(), Overrides: overrides}
	got, present := envValueOf(runner.baseEnv(), "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC")
	require.True(t, present)
	require.Equal(t, "1", got)
}

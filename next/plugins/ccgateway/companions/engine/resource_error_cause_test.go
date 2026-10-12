package engine

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Removing request rewriting must not discard the CLI's original failure when
// the independently enforced Mod handshake also failed.
func TestResourceCLIErrorRetainsCauseAndModFailure(t *testing.T) {
	for _, tc := range []struct {
		name  string
		frame Object
	}{
		{"result", Object{"is_error": true, "result": "fixture transport failure"}},
		{"errors", Object{"is_error": true, "errors": []any{"fixture transport failure", "fixture second failure"}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			session := &cliSession{cfg: &runConfig{control: &modControl{}}, acc: &Accumulator{}}
			out, err := session.onResult(tc.frame)
			require.Error(t, err)
			assert.Nil(t, out)
			assert.True(t, strings.HasPrefix(err.Error(), "Claude Code: "), "original cause must remain first")
			assert.Contains(t, err.Error(), "fixture transport failure")
			assert.Contains(t, err.Error(), "Mod did not acknowledge loading")
			if tc.name == "errors" {
				assert.Contains(t, err.Error(), "fixture second failure")
			}
		})
	}
}

func TestResourceNativeErrorRetainsTypedCauseAndModFailure(t *testing.T) {
	state := &nativeRunState{}
	state.observe(Object{"type": "assistant", "error": "rate_limit", "request_id": "req_resource_fixture"})
	frame := Object{"type": "result", "is_error": true, "subtype": "error_during_execution", "api_error_status": 429, "result": "private-provider-body", "errors": []any{"private-provider-secret"}}
	state.observe(frame)
	session := &cliSession{cfg: &runConfig{native: state, control: &modControl{ready: true, systems: 1}}, acc: &Accumulator{}}
	out, err := session.onResult(frame)
	require.Error(t, err)
	assert.Nil(t, out)
	var native *nativeError
	require.ErrorAs(t, err, &native)
	assert.Equal(t, 429, native.Status)
	assert.True(t, native.ObservedStatus)
	assert.Equal(t, "rate_limit", native.Category)
	assert.Equal(t, "req_resource_fixture", native.RequestID)
	assert.True(t, strings.HasPrefix(err.Error(), native.Error()))
	assert.Contains(t, err.Error(), "Mod did not attach the system messages")
	assert.NotContains(t, err.Error(), "private-provider")
}

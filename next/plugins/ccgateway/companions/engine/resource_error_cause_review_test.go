package engine

import (
	"errors"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReviewResourceErrorNeverAcceptsUnverifiedMod(t *testing.T) {
	for _, done := range []bool{false, true} {
		t.Run(fmt.Sprint(done), func(t *testing.T) {
			s := &cliSession{cfg: &runConfig{control: &modControl{}}, acc: &Accumulator{Done: done, Message: Object{"stop_reason": "refusal"}}}
			out, err := s.onResult(Object{"is_error": true, "result": "original API failure"})
			require.Error(t, err)
			assert.Nil(t, out)
			assert.Contains(t, err.Error(), "Mod did not acknowledge loading")
			if !done {
				assert.Contains(t, err.Error(), "Claude Code: original API failure")
			}
		})
	}
}

func TestReviewResourceErrorPreservesCompletedRefusal(t *testing.T) {
	s := &cliSession{req: &Request{}, cfg: &runConfig{control: &modControl{ready: true}}, acc: &Accumulator{Done: true, Message: Object{"stop_reason": "refusal"}}}
	out, err := s.onResult(Object{"is_error": true, "result": "CLI terminal status after complete response"})
	require.NoError(t, err)
	assert.Equal(t, "refusal", str(out, "stop_reason"))
}

func TestReviewResourceNativeFailureIsNotHiddenByCompletedRefusal(t *testing.T) {
	for _, category := range []string{"rate_limit", "error_max_turns"} {
		t.Run(category, func(t *testing.T) {
			state := &nativeRunState{}
			frame := Object{"type": "result", "is_error": true, "subtype": category, "api_error_status": 429}
			state.observe(frame)
			s := &cliSession{req: &Request{}, cfg: &runConfig{native: state, control: &modControl{ready: true}}, acc: &Accumulator{Done: true, Message: Object{"stop_reason": "refusal"}}}
			out, err := s.onResult(frame)
			require.Error(t, err)
			assert.Nil(t, out)
			var native *nativeError
			require.ErrorAs(t, err, &native)
			assert.True(t, native.ObservedStatus)
			assert.Equal(t, 429, native.Status)
		})
	}
}

func TestReviewResourceNativeFatalCauseRemainsUnwrappable(t *testing.T) {
	cause := errors.New("fixture native protocol failure")
	state := &nativeRunState{}
	state.fail(cause)
	s := &cliSession{cfg: &runConfig{native: state, control: &modControl{}}, acc: &Accumulator{}}
	out, err := s.onResult(Object{"is_error": true})
	require.ErrorIs(t, err, cause)
	assert.Nil(t, out)
	assert.Contains(t, err.Error(), "Mod did not acknowledge loading")
}

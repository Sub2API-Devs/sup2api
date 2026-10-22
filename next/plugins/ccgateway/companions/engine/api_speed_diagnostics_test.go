package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeAPISpeedExactControlsAndPolicy(t *testing.T) {
	for _, value := range []any{"fast", "standard", nil} {
		body := basic()
		body["speed"] = value
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		p := defaultRequestPolicy()
		p.AllowFast = true
		h := policyHeaders(p)
		h.Set("anthropic-beta", "fast-mode-2026-02-01")
		r, err := parsePolicyRequest(raw, h)
		require.NoError(t, err)
		cfg, err := r.passthroughBodies()
		require.NoError(t, err)
		for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
			if value == nil {
				assert.NotContains(t, round, "speed")
			} else {
				want, err := json.Marshal(value)
				require.NoError(t, err)
				assert.Equal(t, string(want), string(round["speed"]))
			}
		}
	}
	r := plannedRequest(t, Object{})
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		assert.NotContains(t, round, "speed")
		assert.NotContains(t, round, "diagnostics")
	}
	body := basic()
	body["speed"] = "fast"
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	_, err = parsePolicyRequest(raw, nil)
	require.ErrorContains(t, err, "disabled")
	p := defaultRequestPolicy()
	p.AllowFast = true
	r, err = parsePolicyRequest(raw, policyHeaders(p))
	require.NoError(t, err)
	assert.NotContains(t, r.Betas, "fast-mode-2026-02-01")
}

func TestNativeDiagnosticsRawControlsAndObservedEvents(t *testing.T) {
	for _, value := range []string{`null`, `{}`, `{"previous_message_id":"owned"}`} {
		r, err := parsePolicyRequest([]byte(`{"model":"m","max_tokens":64,"diagnostics":`+value+`,"messages":[{"role":"user","content":"q"}]}`), nil)
		require.NoError(t, err)
		cfg, err := r.passthroughBodies()
		require.NoError(t, err)
		assert.Equal(t, value, string(cfg.First["diagnostics"]))
		assert.Equal(t, value, string(cfg.Rest["diagnostics"]))
	}
	for _, observed := range []bool{false, true} {
		r := plannedRequest(t, Object{})
		s := &cliSession{req: r, responseReq: r, p: &Prepared{}, initialized: true, acc: &Accumulator{}, cfg: &runConfig{control: &modControl{ready: true, attached: true}}, emit: func(Object) error { return nil }}
		usage := Object{"input_tokens": json.Number("17"), "output_tokens": json.Number("0")}
		message := Object{"id": "msg_observed", "role": "assistant", "usage": usage}
		if observed {
			message["diagnostics"] = Object{"cache_miss_reason": nil}
			usage["speed"] = "fast"
		}
		require.NoError(t, s.onStreamEvent(Object{"type": "stream_event", "event": Object{"type": "message_start", "message": message}}))
		assert.Equal(t, usage, s.acc.Message["usage"])
		if observed {
			raw, err := json.Marshal(s.acc.Message["diagnostics"])
			require.NoError(t, err)
			assert.Equal(t, `{"cache_miss_reason":null}`, string(raw))
		} else {
			assert.NotContains(t, s.acc.Message, "diagnostics")
			assert.NotContains(t, s.acc.Message["usage"], "speed")
		}
	}
}

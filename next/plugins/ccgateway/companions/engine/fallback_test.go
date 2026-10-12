package engine

import (
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFallbackLedgerOnlyAbandonsCurrentSegment(t *testing.T) {
	req := &Request{ServerTools: []Object{{"name": "web_search"}}}
	call := func(id string) Object {
		return Object{"type": "server_tool_use", "id": id, "name": "web_search", "input": Object{}}
	}
	ledger := newServerToolLedger()
	require.NoError(t, ledger.accept(call("prior"), req, true))
	ledger.beginTurn()
	require.NoError(t, ledger.accept(call("abandoned"), req))
	require.NoError(t, ledger.accept(fallbackFixture(), req))
	assert.NotEmpty(t, ledger.pending["prior"])
	assert.Empty(t, ledger.pending["abandoned"])
	require.NoError(t, ledger.accept(call("later"), req))
	require.Error(t, ledger.complete("end_turn", false))
	require.Error(t, ledger.accept(call("abandoned"), req))
}

func TestNativeFallbackHistoryRefused(t *testing.T) {
	body := basic()
	body["messages"] = []any{Object{"role": "user", "content": "anchor"}, Object{"role": "assistant", "content": []Object{{"type": "text", "text": "before"}, fallbackFixture(), {"type": "text", "text": "after"}}}, Object{"role": "user", "content": "next"}}
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	_, err = parsePolicyRequest(raw, nil)
	require.ErrorContains(t, err, `history block "fallback" is not supported`)
}

func TestNativeFallbackRequiresTerminalObservedFailureWithoutOutput(t *testing.T) {
	for _, status := range []int{429, 500, 502, 503, 504, 529} {
		for _, guard := range []string{"valid", "not-terminal", "output", "fatal", "success", "subagent"} {
			t.Run(http.StatusText(status)+"/"+guard, func(t *testing.T) {
				state := &nativeRunState{}
				state.observe(Object{"type": "assistant", "error": "overloaded", "request_id": "req_native"})
				assert.False(t, state.canFallback())
				if guard == "output" {
					state.observe(Object{"type": "stream_event", "event": Object{"type": "message_start"}})
				}
				if guard == "fatal" {
					state.fail(errors.New("unproven native response"))
				}
				result := Object{"type": "result", "subtype": "error_during_execution", "is_error": true, "api_error_status": status}
				if guard == "success" {
					result["subtype"], result["is_error"] = "success", false
				}
				if guard == "subagent" {
					result["parent_tool_use_id"] = "other"
				}
				if guard != "not-terminal" {
					state.observe(result)
				}
				assert.Equal(t, guard == "valid", state.canFallback())
				state.reset()
				assert.False(t, state.canFallback())
				assert.NoError(t, state.failure())
				assert.Empty(t, state.headers())
			})
		}
	}
	for _, status := range []any{nil, "429", json.Number("429.1"), json.Number("1e999"), json.Number("9007199254740993"), -429, 399, 400, 401, 403, 413, 600} {
		state := &nativeRunState{}
		state.observe(Object{"type": "result", "subtype": "error_during_execution", "is_error": true, "api_error_status": status})
		assert.False(t, state.canFallback(), "status=%v", status)
	}
}

func TestNativeFallbackOverridesPreserveNullAndPrimaryRequest(t *testing.T) {
	body := []byte(`{"model":"primary","max_tokens":128,"thinking":{"type":"adaptive"},"output_config":{"effort":"high"},"speed":"standard","temperature":0.30,"fallbacks":[{"model":"secondary","max_tokens":null,"thinking":null,"output_config":null,"speed":null}],"messages":[{"role":"user","content":"q"}]}`)
	h := http.Header{"Anthropic-Beta": []string{"server-side-fallback-2026-07-01"}}
	r, err := parsePolicyRequest(body, h)
	require.NoError(t, err)
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	require.Len(t, cfg.Fallbacks, 1)
	for _, key := range []string{"max_tokens", "thinking", "output_config", "speed"} {
		assert.Equal(t, "null", string(cfg.Fallbacks[0].Body[key]))
	}
	next, err := r.nativeFallback(cfg.Fallbacks[0])
	require.NoError(t, err)
	assert.Equal(t, "secondary", next.Model)
	assert.Equal(t, 128, next.MaxTokens)
	assert.False(t, next.hasFallbacks())
	nextCfg, err := next.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{nextCfg.First, nextCfg.Rest} {
		assert.Equal(t, "0.30", string(round["temperature"]))
		assert.Equal(t, "128", string(round["max_tokens"]))
		for _, key := range []string{"thinking", "output_config", "speed", "fallbacks"} {
			assert.NotContains(t, round, key)
		}
	}
	assert.Equal(t, body, r.Plan.RawRequest())
	assert.Equal(t, "primary", r.Model)
	_, err = parsePolicyRequest(body, nil)
	require.ErrorContains(t, err, "explicit fallbacks require")
}

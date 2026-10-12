package engine

import (
	"crypto/sha256"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func plannedRequest(t *testing.T, extra Object) *Request {
	t.Helper()
	body := basic()
	for k, v := range extra {
		body[k] = v
	}
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, http.Header{})
	require.NoError(t, err)
	return r
}

func TestGenerationPlanNativeControlsWithoutAliasing(t *testing.T) {
	r := plannedRequest(t, Object{"temperature": 0.2, "top_p": 0.95, "top_k": 12, "stop_sequences": []any{"END", ""}, "service_tier": "standard_only", "metadata": Object{"user_id": "client-user"}})
	assert.Len(t, r.Plan.FeatureDecisions(), 7)
	raw := r.Plan.RawRequest()
	raw[0] = 'x'
	assert.True(t, json.Valid(r.Plan.RawRequest()))
	view := r.Plan.MainRequestFields()
	view["stop_sequences"].([]any)[0] = "changed"
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		assert.Equal(t, "0.2", string(round["temperature"]))
		assert.Equal(t, "0.95", string(round["top_p"]))
		assert.Equal(t, "12", string(round["top_k"]))
		assert.Equal(t, `["END",""]`, string(round["stop_sequences"]))
		assert.Equal(t, `"standard_only"`, string(round["service_tier"]))
		// The client's metadata only selects the session (§53.12).
		assert.NotContains(t, round, "metadata")
		assert.NotContains(t, round, "messages")
	}
	cfg.First["stop_sequences"][2] = 'X'
	next, err := r.passthroughBodies()
	require.NoError(t, err)
	assert.Equal(t, `["END",""]`, string(next.First["stop_sequences"]))
}

func TestGenerationPlanClientMetadataSelectsSessionOnly(t *testing.T) {
	r := plannedRequest(t, Object{"temperature": 0.1, "metadata": Object{"user_id": "client"}})
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	assert.NotContains(t, cfg.First, "metadata")
	assert.NotContains(t, cfg.Rest, "metadata")
	assert.Equal(t, "0.1", string(cfg.First["temperature"]))
	assert.Equal(t, digestUUID(sha256.Sum256([]byte("ccgateway-session-v1client"))), clientSessionID(r))
	assert.Contains(t, r.Plan.FeatureDecisions(), Object{"field": "metadata", "action": "select_session_only", "stage": "admission"})
}

func TestGenerationPlanValidationAndSemanticIgnore(t *testing.T) {
	p := defaultRequestPolicy()
	p.UnknownField = "ignore"
	for _, invalid := range []Object{
		{"temperature": -1}, {"temperature": 1.1}, {"top_p": "0.5"}, {"top_k": 1.5}, {"top_k": -1},
		{"stop_sequences": "stop"}, {"stop_sequences": []any{1}}, {"service_tier": "priority"},
		{"metadata": Object{"session_id": "impersonate"}}, {"metadata": Object{"user_id": strings.Repeat("a", 513)}},
		{"context_management": Object{}}, {"container": []any{}}, {"mcp_servers": []any{}},
	} {
		v := basic()
		for key, value := range invalid {
			v[key] = value
		}
		raw, err := json.Marshal(v)
		require.NoError(t, err)
		_, err = parsePolicyRequest(raw, policyHeaders(p))
		require.Error(t, err, "invalid control accepted despite ignore: %v", invalid)
	}
}

func TestForcedToolChoiceNativeWireNamesAndParallelControl(t *testing.T) {
	tool := Object{"name": "weather", "input_schema": Object{"type": "object"}}
	r := plannedRequest(t, Object{"tools": []any{tool}, "tool_choice": Object{"type": "tool", "name": "weather", "disable_parallel_tool_use": true}})
	for _, native := range []bool{false, true} {
		r.Native["weather"] = native
		cfg, err := r.passthroughBodies()
		require.NoError(t, err)
		choice, err := decodeObject(cfg.First["tool_choice"])
		require.NoError(t, err)
		name := "mcp__ccgateway__weather"
		if native {
			name = "weather"
		}
		assert.Equal(t, name, choice["name"])
		assert.Equal(t, true, choice["disable_parallel_tool_use"])
		assert.NotContains(t, cfg.Rest, "tool_choice")
	}
	for _, choice := range []Object{{"type": "none", "disable_parallel_tool_use": true}, {"type": "auto", "name": "weather"}} {
		v := basic()
		v["tools"], v["tool_choice"] = []any{tool}, choice
		raw, err := json.Marshal(v)
		require.NoError(t, err)
		_, err = parsePolicyRequest(raw, nil)
		require.Error(t, err, "%v", choice)
	}
}

func TestNativeForcedToolChoiceDefersProviderConstraints(t *testing.T) {
	for _, extra := range []Object{
		{"thinking": Object{"type": "enabled", "budget_tokens": 1024}, "max_tokens": 2048},
		{"thinking": Object{"type": "adaptive"}, "model": "custom-claude-alias"},
		{"output_config": Object{"format": Object{"type": "json_schema", "schema": Object{"type": "object"}}}},
		{"tools": []any{Object{"name": "weather", "input_schema": Object{"type": "object"}, "defer_loading": true}}},
	} {
		if extra["tools"] == nil {
			extra["tools"] = []any{Object{"name": "weather", "input_schema": Object{"type": "object"}}}
		}
		extra["tool_choice"] = Object{"type": "any"}
		r := plannedRequest(t, extra)
		cfg, err := r.passthroughBodies()
		require.NoError(t, err)
		assert.Equal(t, `{"type":"any"}`, string(cfg.First["tool_choice"]))
		assert.NotContains(t, cfg.Rest, "tool_choice")
		for _, key := range []string{"thinking", "output_config"} {
			if value, ok := extra[key]; ok {
				raw, err := json.Marshal(value)
				require.NoError(t, err)
				assert.Equal(t, string(raw), string(cfg.First[key]))
				assert.Equal(t, string(raw), string(cfg.Rest[key]))
			}
		}
	}
}

func TestMetadataUserIDOfficialCharacterLimit(t *testing.T) {
	for _, count := range []int{256, 257, 512} {
		value := strings.Repeat("界", count)
		r := plannedRequest(t, Object{"metadata": Object{"user_id": value}})
		cfg, err := r.passthroughBodies()
		require.NoError(t, err)
		// Accepted in full, selects the session, never sent upstream (§53.12).
		assert.NotContains(t, cfg.First, "metadata")
		assert.NotContains(t, cfg.Rest, "metadata")
		assert.Equal(t, digestUUID(sha256.Sum256([]byte("ccgateway-session-v1"+value))), clientSessionID(r))
	}
	require.Error(t, validateGenerationField("metadata", Object{"user_id": strings.Repeat("界", 513)}))
}

func TestGenerationPlanKeepsIntegerPrecision(t *testing.T) {
	r := plannedRequest(t, Object{"top_k": json.Number("9007199254740993")})
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		raw, err := json.Marshal(round)
		require.NoError(t, err)
		assert.Equal(t, `{"max_tokens":128,"top_k":9007199254740993}`, string(raw))
	}
}

func TestGenerationPlanNumericBoundaryPrecision(t *testing.T) {
	for _, name := range []string{"temperature", "top_p"} {
		for _, value := range []string{"-1e-9999", "1.00000000000000000001", "1e9999"} {
			require.Error(t, validateGenerationField(name, json.Number(value)), "%s=%s", name, value)
		}
		for _, value := range []string{"0", "-0", "-0e999", "1e-9999", "0.99999999999999999999", "1", "0.2"} {
			r := plannedRequest(t, Object{name: json.Number(value)})
			cfg, err := r.passthroughBodies()
			require.NoError(t, err)
			assert.Equal(t, value, string(cfg.First[name]))
			assert.Equal(t, value, string(cfg.Rest[name]))
		}
	}
	for _, value := range []string{"9223372036854775808", "1e9999", "-1", "1.5"} {
		require.Error(t, validateGenerationField("top_k", json.Number(value)), value)
	}
}

func TestGenerationPlanRejectsWrongTypesWithoutPanic(t *testing.T) {
	for _, name := range []string{"temperature", "top_p", "top_k", "metadata", "service_tier", "tool_choice", "stop_sequences"} {
		for _, value := range []any{nil, true, Object{"unexpected": []any{}}, []any{Object{}}} {
			body := basic()
			body[name] = value
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			_, err = parsePolicyRequest(raw, nil)
			require.Error(t, err, "invalid %s type %T", name, value)
		}
	}
	// Nullable user_id is accepted and is no session (§53.12); the client's
	// metadata is never written into the upstream request.
	r := plannedRequest(t, Object{"metadata": Object{"user_id": nil}})
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	assert.NotContains(t, cfg.First, "metadata")
	assert.NotContains(t, cfg.Rest, "metadata")
	assert.Empty(t, clientSessionID(r))
}

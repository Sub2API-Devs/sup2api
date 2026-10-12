package engine

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func cacheRequest(t *testing.T, body Object) *Request {
	t.Helper()
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, http.Header{})
	require.NoError(t, err)
	return r
}

func TestCachePlanBreakpointLimitsAndTTLOrder(t *testing.T) {
	for _, tc := range []struct {
		name      string
		ttls      []string
		automatic string
		want      bool
	}{
		{"four", []string{"1h", "1h", "5m", "5m"}, "", true},
		{"five", []string{"1h", "1h", "5m", "5m", "5m"}, "", false},
		{"reverse", []string{"5m", "1h"}, "", false},
		{"same-final-auto", []string{"1h", "1h", "5m", "5m"}, "5m", true},
		{"conflicting-final-auto", []string{"5m"}, "1h", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			content := []any{}
			for _, ttl := range tc.ttls {
				content = append(content, Object{"type": "text", "text": "same", "cache_control": Object{"type": "ephemeral", "ttl": ttl}})
			}
			body := Object{"model": "fixture", "max_tokens": 32, "messages": []any{Object{"role": "user", "content": content}}}
			if tc.automatic != "" {
				body["cache_control"] = Object{"type": "ephemeral", "ttl": tc.automatic}
			}
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			_, err = parsePolicyRequest(raw, nil)
			if tc.want {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
			}
		})
	}
}

func TestNativeCacheTTLSelectionWithoutBreakpointForwarding(t *testing.T) {
	for _, tc := range []struct {
		name   string
		extra  Object
		ttl    time.Duration
		prompt string
	}{
		{"absent", Object{}, 5 * time.Minute, ""},
		{"root-default", Object{"cache_control": Object{"type": "ephemeral"}}, 5 * time.Minute, "5m"},
		{"root-hour", Object{"cache_control": Object{"type": "ephemeral", "ttl": "1h"}}, time.Hour, "1h"},
		{"system-hour", Object{"system": []any{Object{"type": "text", "text": "A", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}, Object{"type": "text", "text": "B"}}}, time.Hour, "1h"},
		{"tool-hour", Object{"tools": []any{Object{"name": "lookup", "input_schema": Object{"type": "object"}, "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}}}, time.Hour, "1h"},
		{"message-five", Object{"messages": []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "same", "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}, Object{"type": "text", "text": "same"}}}}}, 5 * time.Minute, "5m"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body := basic()
			for key, value := range tc.extra {
				body[key] = value
			}
			before, err := json.Marshal(body)
			require.NoError(t, err)
			r := cacheRequest(t, body)
			assert.Equal(t, tc.ttl, r.TTL)
			assert.Equal(t, tc.prompt, r.PromptCacheTTL)
			cfg, err := r.passthroughBodies()
			require.NoError(t, err)
			for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
				for _, field := range []string{"cache_control", "system", "tools", "messages"} {
					assert.NotContains(t, round, field)
				}
			}
			after, err := json.Marshal(body)
			require.NoError(t, err)
			assert.Equal(t, before, after)
		})
	}
}

func TestCacheProtocolTraversalPreservesInputLiterals(t *testing.T) {
	blocks := []Object{{"type": "tool_use", "input": Object{"cache_control": Object{"type": "business", "ttl": "literal"}}, "cache_control": Object{"type": "ephemeral"}}}
	require.NoError(t, visitProtocolBlocks(blocks, func(b Object) error { delete(b, "cache_control"); return nil }))
	assert.Equal(t, Object{"type": "business", "ttl": "literal"}, blocks[0]["input"].(Object)["cache_control"])
}

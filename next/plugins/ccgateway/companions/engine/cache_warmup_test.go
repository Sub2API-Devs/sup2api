package engine

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeCacheWarmupRefusesNonStreaming(t *testing.T) {
	for _, thinking := range []any{nil, Object{"type": "disabled"}, Object{"type": "adaptive"}} {
		body := basic()
		body["max_tokens"] = 0
		if thinking != nil {
			body["thinking"] = thinking
		}
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		_, err = parsePolicyRequest(raw, nil)
		require.ErrorContains(t, err, "max_tokens: 0 is not supported")
	}
}

func TestNativeCacheWarmupStreamingDefersToProvider(t *testing.T) {
	r := plannedRequest(t, Object{"max_tokens": 0, "stream": true})
	assert.True(t, r.CacheWarmup)
	cfg, err := r.passthroughBodies()
	require.NoError(t, err)
	assert.Equal(t, "0", string(cfg.First["max_tokens"]))
	assert.Equal(t, "0", string(cfg.Rest["max_tokens"]))
	assert.NotContains(t, cfg.First, "stream")
}

func TestNativeCacheWarmupNeverWritesTheCachedSession(t *testing.T) {
	c, err := newCache(t.TempDir(), 8<<20)
	require.NoError(t, err)
	r, err := parsePolicyRequest([]byte(`{"model":"fixture","max_tokens":64,"messages":[{"role":"user","content":"first"}]}`), nil)
	require.NoError(t, err)
	answer := responseHistoryAnswer("msg_warmup_prior", "answer")
	prior := commitResponseFixture(t, c, "scope", r, answer)
	before, err := os.ReadFile(prior.NativePath)
	require.NoError(t, err)
	messages := append(append([]Message(nil), r.Messages...), Message{Role: "assistant", Content: answer["content"].([]Object)}, Message{Role: "user", Content: []Object{{"type": "text", "text": "next"}}})
	body := Object{"model": r.Model, "max_tokens": 0, "stream": true, "messages": messages}
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	warmRequest, err := parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	warm, err := prepareHistory(warmRequest, c, testBranch("scope"), t.TempDir(), "2.1.292")
	require.NoError(t, err)
	// Same branch, same session ID; the CLI only ever writes a private copy.
	assert.Equal(t, "fork", warm.Mode)
	assert.Equal(t, prior.SessionID, warm.SessionID)
	require.NotEqual(t, prior.NativePath, warm.Path)
	require.NotEqual(t, c.canonicalPath(prior.SessionID), warm.Path)
	require.NoError(t, os.WriteFile(warm.Path, []byte("fixture CLI writes"), 0600))
	after, err := os.ReadFile(prior.NativePath)
	require.NoError(t, err)
	assert.Equal(t, before, after)
	body["max_tokens"] = 64
	raw, err = json.Marshal(body)
	require.NoError(t, err)
	next, err := parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	resumed, err := prepareHistory(next, c, testBranch("scope"), t.TempDir(), "2.1.292")
	require.NoError(t, err)
	assert.Equal(t, "prefix-hit", resumed.Mode)
}

func TestNativeCacheWarmupRejectsInvalidTokenLimits(t *testing.T) {
	for _, value := range []any{-1, 0.1, nil, "0", json.Number("2147483648"), json.Number("1e999")} {
		body := basic()
		body["max_tokens"] = value
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		_, err = parsePolicyRequest(raw, nil)
		require.Error(t, err, "max_tokens=%v", value)
	}
}

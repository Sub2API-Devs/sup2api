package engine

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

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

func TestMessageOwnershipPersistenceIsolationAndBounds(t *testing.T) {
	path := filepath.Join(t.TempDir(), "message-ownership-v1.json")
	s := openMessageOwnership(path)
	now := time.Now().UTC()
	require.NoError(t, s.remember("msg_private", "scope-A", now))
	s = openMessageOwnership(path)
	assert.True(t, s.owns("msg_private", "scope-A", now))
	assert.False(t, s.owns("msg_private", "scope-B", now))
	assert.False(t, s.owns("msg_unknown", "scope-A", now))
	assert.False(t, s.owns("msg_private", "scope-A", now.Add(messageOwnershipTTL)))
	require.Error(t, s.remember("msg_private", "scope-B", now))
	raw, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.NotContains(t, string(raw), "msg_private")
	for i := 0; i < messageOwnershipLimit; i++ {
		s.entries[digest(i)] = ownedMessage{Scope: "scope-A", Created: now.Add(-time.Minute)}
	}
	// Existing entry plus the seeded full index must shrink to the fixed quota.
	delete(s.entries, digest("msg_private"))
	require.NoError(t, s.remember("new", "scope-A", now))
	assert.Len(t, s.entries, messageOwnershipLimit)
	assert.False(t, openMessageOwnership(filepath.Join(t.TempDir(), "other-account.json")).owns("msg_private", "scope-A", now))
}

func TestNativeDiagnosticsOwnershipAdmission(t *testing.T) {
	cache, err := newCache(t.TempDir(), 1<<20)
	require.NoError(t, err)
	g := &Gateway{Cache: cache, Key: "worker-key"}
	request := func(scope, id string) *exchange {
		httpReq := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
		httpReq.Header.Set("X-CCGateway-Session-Scope", scope)
		return &exchange{g: g, r: httpReq, req: plannedRequest(t, Object{"diagnostics": Object{"previous_message_id": id}})}
	}
	owner := request("A", "msg_owned")
	require.NoError(t, g.ownershipIndex().remember("msg_owned", owner.ownershipScope(), time.Now()))
	require.NoError(t, owner.validateDiagnosticsOwnership())
	require.Error(t, request("B", "msg_owned").validateDiagnosticsOwnership())
	require.Error(t, request("A", "msg_unknown").validateDiagnosticsOwnership())
}

func TestOwnershipAuthorizationRotationDoesNotReviveOldExchange(t *testing.T) {
	cache, err := newCache(t.TempDir(), 1<<20)
	require.NoError(t, err)
	g := &Gateway{Cache: cache, Key: "worker-key"}
	old := &exchange{g: g, r: httptest.NewRequest("POST", "/v1/messages", nil)}
	oldScope := old.ownershipScope()
	store := g.ownershipIndex()
	now := time.Now()
	require.NoError(t, store.remember("old", oldScope, now))
	require.NoError(t, store.rotateAuthorization())
	current := &exchange{g: g, r: httptest.NewRequest("POST", "/v1/messages", nil)}
	currentScope := current.ownershipScope()
	assert.NotEqual(t, oldScope, currentScope)
	assert.Equal(t, oldScope, old.ownershipScope())
	// A request admitted before rotation can finish afterwards; it remains
	// under the old captured issuer domain, including after a Worker restart.
	require.NoError(t, store.remember("late-old-response", old.ownershipScope(), now))
	reloaded := openMessageOwnership(store.path)
	assert.False(t, reloaded.owns("old", currentScope, now))
	assert.False(t, reloaded.owns("late-old-response", currentScope, now))
	require.NoError(t, store.remember("new", currentScope, now))
	assert.True(t, store.owns("new", currentScope, now))
}

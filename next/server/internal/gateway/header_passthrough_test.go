package gateway

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// An account's header passthrough (CONTRACTS §81) copies client headers onto
// the upstream request after the plugin's own: the account key still replaces
// the client's, and credentials, client addresses and gateway control
// headers never pass.
func TestAccountHeaderPassthrough(t *testing.T) {
	client := map[string]string{
		"X-Claude-Code-Agent-Id":   "agent-7",
		"X-Claude-Code-Session-Id": "sess-1",
		"X-Custom-Trace":           "trace-1",
		"X-Other-Trace":            "trace-2",
		"X-Forwarded-For":          "203.0.113.9",
		"X-Real-Ip":                "203.0.113.9",
		"X-Kin-Debug":              "1",
		"X-Sub2api-Entry-Node":     "node-x",
		"Cookie":                   "session=secret",
		"Proxy-Authorization":      "Basic secret",
	}
	cases := []struct {
		name  string
		rules []string
		want  []string
		never []string
	}{
		{name: "none", rules: nil,
			never: []string{"X-Custom-Trace", "X-Other-Trace"}},
		{name: "all", rules: []string{"*"},
			want: []string{"X-Claude-Code-Agent-Id", "X-Claude-Code-Session-Id", "X-Custom-Trace", "X-Other-Trace"}},
		{name: "regex", rules: []string{"regex:^X-Custom-"},
			want: []string{"X-Custom-Trace"}, never: []string{"X-Other-Trace"}},
		{name: "exact", rules: []string{"x-custom-trace"},
			want: []string{"X-Custom-Trace"}, never: []string{"X-Other-Trace"}},
	}
	blocked := []string{"X-Forwarded-For", "X-Real-Ip", "X-Kin-Debug", "X-Sub2api-Entry-Node", "Cookie", "Proxy-Authorization"}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			e := newEnv(t)
			e.accounts.mu.Lock()
			for _, acc := range e.accounts.accounts {
				acc.HeaderPassthrough = tc.rules
			}
			e.accounts.mu.Unlock()

			r := e.do("/v1/messages", body(testModel, false), client)
			require.Equal(t, 200, r.status, string(r.body))
			got := e.up.last().header
			assert.Equal(t, "acc-1", got.Get("x-api-key"), "the account key replaces the client's")
			for _, h := range tc.want {
				assert.Equal(t, client[h], got.Get(h), h)
			}
			for _, h := range append(tc.never, blocked...) {
				assert.Empty(t, got.Get(h), h)
			}
		})
	}
}

// A request matching a sticky rule forwards the rule's pass headers (CONTRACTS
// §5.6), with the account passthrough's blocked headers still held back; a
// request without a sticky session forwards nothing extra. The built-in
// Claude Code rule carries the session and sub-agent headers.
func TestStickyRulePassHeaders(t *testing.T) {
	rule := builtinPlatform(t, "anthropic").StickyRules[0]
	assert.Equal(t, []string{"x-claude-code-session-id", "x-claude-code-agent-id", "x-claude-code-parent-agent-id",
		"x-claude-code-request-class", "x-claude-code-agent-type"}, rule.PassHeaders)

	client := map[string]string{
		"X-Custom-Trace":  "trace-1",
		"X-Other-Trace":   "trace-2",
		"X-Forwarded-For": "203.0.113.9",
		"X-Kin-Debug":     "1",
	}
	setup := func(t *testing.T) *env {
		e := newEnv(t)
		e.enableSticky(onFailureFailover)
		e.gw.rules.mu.Lock()
		e.gw.rules.override[0].PassHeaders = []string{"x-custom-trace", "x-forwarded-for", "regex:^x-kin-"}
		e.gw.rules.mu.Unlock()
		return e
	}

	t.Run("matched", func(t *testing.T) {
		e := setup(t)
		r := e.do("/v1/messages", withSession(body(testModel, false), "user_abc_session_1"), client)
		require.Equal(t, 200, r.status, string(r.body))
		got := e.up.last().header
		assert.Equal(t, "trace-1", got.Get("X-Custom-Trace"))
		assert.Empty(t, got.Get("X-Other-Trace"))
		assert.Empty(t, got.Get("X-Forwarded-For"))
		assert.Empty(t, got.Get("X-Kin-Debug"))
		assert.Equal(t, "acc-1", got.Get("x-api-key"))
	})
	t.Run("no session", func(t *testing.T) {
		e := setup(t)
		r := e.do("/v1/messages", body(testModel, false), client)
		require.Equal(t, 200, r.status, string(r.body))
		assert.Empty(t, e.up.last().header.Get("X-Custom-Trace"))
	})
}

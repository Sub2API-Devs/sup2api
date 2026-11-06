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

package engine

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestThinkingDisabledCompat(t *testing.T) {
	for _, c := range []struct {
		name, compat, model string
		thinking            Object
		omitted             bool
	}{
		{"pass keeps disabled", "pass", "claude-opus-5-5", Object{"type": "disabled"}, false},
		{"default keeps disabled", "", "claude-opus-5-5", Object{"type": "disabled"}, false},
		{"omit drops disabled", "omit", "claude-opus-5-5", Object{"type": "disabled"}, true},
		{"omit drops disabled fable", "omit", "claude-fable-5-1", Object{"type": "disabled"}, true},
		{"unlisted model", "omit", "claude-sonnet-4-6", Object{"type": "disabled"}, false},
		{"adaptive untouched", "omit", "claude-opus-5-5", Object{"type": "adaptive", "display": "omitted"}, false},
		{"enabled untouched", "omit", "claude-opus-5-5", Object{"type": "enabled", "budget_tokens": 1024}, false},
		{"absent untouched", "omit", "claude-opus-5-5", nil, false},
	} {
		t.Run(c.name, func(t *testing.T) {
			p := defaultRequestPolicy()
			p.ThinkingDisabledCompat = c.compat
			body := basic()
			body["model"] = c.model
			body["max_tokens"] = 2048
			if c.thinking != nil {
				body["thinking"] = c.thinking
			}
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			r, err := parsePolicyRequest(raw, policyHeaders(p))
			require.NoError(t, err)
			require.NotNil(t, r.Plan)
			assert.Equal(t, raw, r.Plan.RawRequest(), "compat must not mutate the client's original request")
			cfg, err := r.passthroughBodies()
			require.NoError(t, err)
			for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
				if c.omitted || c.thinking == nil {
					assert.NotContains(t, round, "thinking", "omit concerns EXTRA_BODY, not the CLI's accepted flags")
				} else {
					want, err := json.Marshal(c.thinking)
					require.NoError(t, err)
					assert.Equal(t, string(want), string(round["thinking"]))
				}
			}
			decided := false
			for _, d := range r.Plan.FeatureDecisions() {
				decided = decided || str(d, "action") == "omit_unsupported_disabled"
			}
			assert.Equal(t, c.omitted, decided)
			if c.omitted {
				assert.Nil(t, r.Thinking)
				assert.Equal(t, c.model, r.Plan.thinkingCompat)
			} else {
				assert.Empty(t, r.Plan.thinkingCompat)
				assert.Equal(t, str(c.thinking, "type"), str(r.Thinking, "type"))
			}
			args := strings.Join(cliArgs(r, &Prepared{}, "plugin"), " ")
			switch str(c.thinking, "type") {
			case "enabled":
				assert.Contains(t, args, "--max-thinking-tokens 1024")
			case "adaptive":
				assert.Contains(t, args, "--thinking adaptive")
			default:
				// Omitted and absent thinking still select the CLI's disabled
				// mode; this is not evidence of an upstream thinking field.
				assert.Contains(t, args, "--thinking disabled")
				assert.NotContains(t, args, "--thinking adaptive")
			}
		})
	}
	p := defaultRequestPolicy()
	p.ThinkingDisabledCompat = "adaptive"
	_, err := parsePolicyRequest([]byte(`{"model":"claude-opus-5-5","max_tokens":8,"messages":[{"role":"user","content":"x"}]}`), policyHeaders(p))
	require.ErrorContains(t, err, "thinking_disabled_compat")
	assert.Equal(t, "pass", defaultRequestPolicy().ThinkingDisabledCompat)
}

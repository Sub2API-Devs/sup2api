package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeRejectsInlineToolsDespiteSearchPolicy(t *testing.T) {
	body := basic()
	body["messages"] = append(fixtureUser(), Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": Object{"name": "lookup", "defer_loading": true, "input_schema": Object{"type": "object"}}}}}})
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	p := defaultRequestPolicy()
	p.ToolSearch = "true"
	h := policyHeaders(p)
	h.Set("anthropic-beta", "inline-tools-2026-09-15")
	r, err := parsePolicyRequest(raw, h)
	require.ErrorContains(t, err, "inline tool definitions is not supported by this gateway")
	assert.Nil(t, r)
}

// Validate identity restrictions directly; this is not an admission fixture.
func TestInlineInternalSearchExcludesUnprovenIdentities(t *testing.T) {
	for _, name := range []string{"native", "helper", "compaction", "safeguards"} {
		t.Run(name, func(t *testing.T) {
			r := &Request{ToolSearch: "true", InlineTools: &inlineToolTimeline{}, Tools: []Tool{{Name: "beta"}}, Plan: &RequestPlan{fields: map[string]json.RawMessage{}}}
			require.NoError(t, r.validateInlineInternalSearch())
			switch name {
			case "native":
				r.Native = map[string]bool{"beta": true}
			case "helper":
				r.Tools[0].Name = "ToolSearch"
			case "compaction":
				r.Messages = []Message{{Role: "assistant", Content: []Object{{"type": "compaction", "content": "summary"}}}}
			case "safeguards":
				r.Plan.fields["safeguards"] = json.RawMessage(`{}`)
			}
			require.Error(t, r.validateInlineInternalSearch(), "unproven identity must not pass validation")
		})
	}
}

func TestInlineInternalSearchDiscoveryIsRequestLocal(t *testing.T) {
	// Supply the timeline explicitly to test only the local discovery predicate.
	r := &Request{ToolSearch: "true", CustomToolPrefix: "ccgateway", InlineTools: &inlineToolTimeline{Searchable: map[string]bool{"beta": true}}}
	r.internalCache = &internalCacheRounds{discovered: map[string]bool{r.wireName("beta"): true, r.wireName("alpha"): true}}
	assert.True(t, r.inlineSearchDiscovered("beta"))
	assert.False(t, r.inlineSearchDiscovered("alpha"), "withdrawal must constrain discovery")
	cold := &Request{ToolSearch: "true", CustomToolPrefix: "ccgateway", InlineTools: &inlineToolTimeline{Searchable: map[string]bool{"beta": true}}}
	assert.False(t, cold.inlineSearchDiscovered("beta"), "discovery must not leak to another request")
}

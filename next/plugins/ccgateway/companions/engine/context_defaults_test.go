package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestMainPlanDoesNotLeakCLIContextDefault(t *testing.T) {
	r := plannedRequest(t, Object{})
	wire := Object{"thinking": Object{"type": "adaptive"}, "context_management": Object{"edits": []any{Object{"type": "clear_thinking_20251015", "keep": "all"}}}}
	if err := r.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	if _, ok := wire["context_management"]; ok {
		t.Fatal("CLI context default leaked despite client absence")
	}
}

func TestMainPlanContextExplicitAndNonGeneration(t *testing.T) {
	for _, value := range []any{nil, Object{"edits": []any{Object{"type": "clear_thinking_20251015", "keep": "all"}}}} {
		body := basic()
		body["context_management"] = value
		raw, _ := json.Marshal(body)
		r, err := parsePolicyRequest(raw, http.Header{"Anthropic-Beta": []string{contextBeta}})
		if err != nil {
			t.Fatal(err)
		}
		wire := Object{"context_management": Object{"edits": []any{}}, "thinking": Object{"type": "adaptive"}}
		if err = r.ApplyMainRequestFeatures(wire); err != nil {
			t.Fatal(err)
		}
		got, exists := wire["context_management"]
		if !exists || digest(got) != digest(value) {
			t.Fatal("explicit context changed")
		}
		if _, exists := wire["thinking"]; exists {
			t.Fatal("gateway repaired client invalid combination")
		}
	}
	r := plannedRequest(t, Object{})
	r.Plan.apiGeneration = false
	wire := Object{"context_management": Object{"edits": []any{Object{"type": "clear_thinking_20251015", "keep": "all"}}}}
	before := digest(wire["context_management"])
	if err := r.ApplyMainRequestFeatures(wire); err != nil || digest(wire["context_management"]) != before {
		t.Fatal("non-generation defaults changed", err)
	}
}

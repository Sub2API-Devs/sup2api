package engine

import (
	"encoding/json"
	"strings"
	"testing"
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
		{"adaptive untouched", "omit", "claude-opus-5-5", Object{"type": "adaptive"}, false},
		{"absent untouched", "omit", "claude-opus-5-5", nil, false},
	} {
		t.Run(c.name, func(t *testing.T) {
			p := defaultRequestPolicy()
			p.ThinkingDisabledCompat = c.compat
			body := basic()
			body["model"] = c.model
			if c.thinking != nil {
				body["thinking"] = c.thinking
			}
			raw, _ := json.Marshal(body)
			r, err := parsePolicyRequest(raw, policyHeaders(p))
			if err != nil {
				t.Fatal(err)
			}
			_, planned := r.Plan.fields["thinking"]
			args := strings.Join(cliArgs(r, &Prepared{}, "plugin"), " ")
			decided := false
			for _, d := range r.Plan.FeatureDecisions() {
				decided = decided || str(d, "action") == "omit_unsupported_disabled"
			}
			if c.omitted {
				if r.Thinking != nil || planned || strings.Contains(args, "--thinking") || !decided {
					t.Fatalf("not omitted: thinking=%v planned=%v args=%s decided=%v", r.Thinking, planned, args, decided)
				}
				return
			}
			if decided || str(r.Thinking, "type") != str(c.thinking, "type") || planned != (c.thinking != nil) {
				t.Fatalf("changed: thinking=%v planned=%v decided=%v", r.Thinking, planned, decided)
			}
			if str(c.thinking, "type") == "disabled" && !strings.Contains(args, "--thinking disabled") {
				t.Fatalf("disabled not forwarded: %s", args)
			}
		})
	}
	p := defaultRequestPolicy()
	p.ThinkingDisabledCompat = "adaptive"
	if _, err := parsePolicyRequest([]byte(`{"model":"claude-opus-5-5","max_tokens":8,"messages":[{"role":"user","content":"x"}]}`), policyHeaders(p)); err == nil {
		t.Fatal("invalid thinking_disabled_compat accepted")
	}
	if defaultRequestPolicy().ThinkingDisabledCompat != "pass" {
		t.Fatal("default is not pass")
	}
}

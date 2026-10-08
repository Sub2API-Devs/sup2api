package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestReviewPerTurnControlIndependentAdmission(t *testing.T) {
	for _, mode := range []string{"both", "misspelled", "clear-only", "perturn-with-clear", "both-clear"} {
		body := basic()
		directive := Object{"role": "system", "content": "fixture", "output_config": Object{"effort": "medium"}}
		h := http.Header{}
		switch mode {
		case "both":
			h.Add("Anthropic-Beta", ccPerTurnBeta)
			h.Add("Anthropic-Beta", publicPerTurnBeta)
		case "misspelled":
			h.Set("Anthropic-Beta", "per-turn-control-2026-07-02")
		case "clear-only":
			h.Set("Anthropic-Beta", "mid-conversation-system-clear-at-2026-08-21")
		case "perturn-with-clear":
			h.Set("Anthropic-Beta", ccPerTurnBeta)
			directive["clear_at"] = "next_user_message"
		case "both-clear":
			h.Set("Anthropic-Beta", ccPerTurnBeta+",mid-conversation-system-clear-at-2026-08-21")
			directive["clear_at"] = "next_user_message"
		}
		body["messages"] = []any{Object{"role": "user", "content": "start"}, directive}
		raw, _ := json.Marshal(body)
		r, err := parsePolicyRequest(raw, h)
		good := mode == "both"
		if (err == nil) != good {
			t.Fatal(mode, err)
		}
		if good {
			seen := map[string]bool{}
			for _, name := range r.Betas {
				seen[name] = true
			}
			if !seen[ccPerTurnBeta] {
				t.Fatal("CC beta lost")
			}
			if mode == "both" && !seen[publicPerTurnBeta] {
				t.Fatal("public beta lost")
			}
		}
	}
}

func TestReviewPerTurnLegacyPolicyDoesNotMaskNewRule(t *testing.T) {
	p := defaultRequestPolicy()
	p.UnknownBeta = "reject"
	p.Betas = []BetaRule{{Name: publicPerTurnBeta, Mapping: "forward"}}
	h := policyHeaders(p)
	h.Set("Anthropic-Beta", ccPerTurnBeta)
	body := basic()
	body["messages"] = []any{Object{"role": "user", "content": "fixture"}, Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "medium"}}}
	raw, _ := json.Marshal(body)
	if _, err := parsePolicyRequest(raw, h); err != nil {
		t.Fatal("legacy policy hid the new code rule", err)
	}
	h.Set("Anthropic-Beta", "not-a-known-beta")
	if _, err := parsePolicyRequest(raw, h); err == nil {
		t.Fatal("unknown reject policy bypassed")
	}
	p.AllowEffort = false
	h = policyHeaders(p)
	h.Set("Anthropic-Beta", ccPerTurnBeta)
	if _, err := parsePolicyRequest(raw, h); err == nil {
		t.Fatal("effort disabled policy bypassed")
	}
}

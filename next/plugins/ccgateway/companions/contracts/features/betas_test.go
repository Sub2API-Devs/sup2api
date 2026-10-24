package features

import (
	"encoding/json"
	"regexp"
	"testing"
)

func TestBetaRulesAreIndependentAdmissionRules(t *testing.T) {
	rules := BetaRules()
	if len(rules) == 0 {
		t.Fatal("no admission rules")
	}
	seen := map[string]bool{}
	validName := regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{0,127}$`)
	for _, rule := range rules {
		if !validName.MatchString(rule.Name) || seen[rule.Name] {
			t.Fatalf("invalid or duplicate beta %q", rule.Name)
		}
		seen[rule.Name] = true
		switch rule.Mapping {
		case "forward", "fine_grained_tools", "fast", "tool_search":
		default:
			t.Errorf("unimplemented admission mapping %q", rule.Mapping)
		}
	}
	want, _ := json.Marshal(rules)
	for i := range rules {
		rules[i] = BetaRule{Name: "changed", Mapping: "changed"}
	}
	got, _ := json.Marshal(BetaRules())
	if string(got) != string(want) {
		t.Fatal("mutable beta rules leaked across callers")
	}
	if !seen["inline-tools-2026-09-15"] || !seen["mid-conversation-tool-changes-2026-07-01"] {
		t.Fatal("implemented inline protocols lack beta admission")
	}
	if !seen["mcp-client-2025-11-20"] || !seen["mcp-client-2026-09-15"] {
		t.Fatal("implemented MCP protocols lack shared beta admission")
	}
	// The deprecated schema is not silently upgraded to a supported version.
	if seen["mcp-client-2025-04-04"] {
		t.Fatal("deprecated MCP protocol unexpectedly admitted")
	}
}

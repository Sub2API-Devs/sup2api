package features

import (
	"encoding/json"
	"regexp"
	"testing"
)

func TestCatalogSchemaAndUniqueIDs(t *testing.T) {
	doc := Catalog()
	if doc.CatalogVersion == "" || doc.PolicySchemaVersion < 1 || doc.RuntimeVerified || len(doc.Features) == 0 {
		t.Fatalf("invalid source catalog envelope: %+v", doc)
	}
	seen := map[string]bool{}
	validID := regexp.MustCompile(`^F-[A-Z0-9-]+$`)
	statuses := map[string]bool{"supported": true, "partial": true, "unsupported": true, "unverified": true}
	for _, feature := range doc.Features {
		if !validID.MatchString(feature.ID) || seen[feature.ID] {
			t.Fatalf("invalid or duplicate ID %q", feature.ID)
		}
		seen[feature.ID] = true
		if feature.Title == "" || feature.Category == "" || feature.Reason == "" || !statuses[feature.Status] || (feature.Scope != "api" && feature.Scope != "cc") {
			t.Errorf("invalid feature metadata: %+v", feature)
		}
		if feature.BodyPaths == nil || feature.BetaHeaders == nil || feature.Mechanisms == nil {
			t.Errorf("%s has null arrays; frontend requires JSON arrays", feature.ID)
		}
	}
	// These stable IDs connect existing policy controls to feature descriptions.
	for _, id := range []string{"F-FAST", "F-OUTPUT", "F-TOOL-SEARCH"} {
		if !seen[id] {
			t.Errorf("missing policy feature %s", id)
		}
	}
	encoded, err := json.Marshal(doc)
	if err != nil {
		t.Fatal(err)
	}
	var wire map[string]json.RawMessage
	if err := json.Unmarshal(encoded, &wire); err != nil {
		t.Fatal(err)
	}
	if string(wire["runtime_verified"]) != "false" {
		t.Fatal("source catalog must explicitly report runtime_verified=false")
	}
}

func TestCatalogReturnsIndependentValues(t *testing.T) {
	want, err := json.Marshal(Catalog())
	if err != nil {
		t.Fatal(err)
	}
	changed := Catalog()
	for i := range changed.Features {
		feature := &changed.Features[i]
		feature.ID = "changed"
		for _, values := range [][]string{feature.BodyPaths, feature.BetaHeaders, feature.Mechanisms, feature.Requirements} {
			for j := range values {
				values[j] = "changed"
			}
		}
	}
	got, err := json.Marshal(Catalog())
	if err != nil || string(got) != string(want) {
		t.Fatalf("mutating one catalog leaked into the next: err=%v", err)
	}
}

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

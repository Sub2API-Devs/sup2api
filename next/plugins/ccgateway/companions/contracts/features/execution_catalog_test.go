package features

import "testing"

func TestExecutionCatalogKeepsSourceEvidenceSeparate(t *testing.T) {
	doc := Catalog()
	if doc.CatalogVersion != "2026-10-08.6" || doc.RuntimeVerified {
		t.Fatal("catalog version or source evidence boundary changed")
	}
	wanted := map[string]bool{"F-FILES": false, "F-SKILLS": false, "F-CODE-EXEC": false, "F-PTC": false}
	for _, feature := range doc.Features {
		if _, ok := wanted[feature.ID]; ok {
			wanted[feature.ID] = true
			if feature.Status != "partial" || len(feature.Mechanisms) == 0 {
				t.Errorf("%s must describe implemented but conditional support", feature.ID)
			}
		}
	}
	for id, found := range wanted {
		if !found {
			t.Errorf("missing feature %s", id)
		}
	}
	rules := map[string]string{}
	for _, rule := range BetaRules() {
		rules[rule.Name] = rule.Mapping
	}
	for _, beta := range []string{"code-execution-2025-05-22", "code-execution-2025-08-25", "skills-2025-10-02"} {
		if rules[beta] != "forward" {
			t.Errorf("legacy beta %s must pass through unchanged", beta)
		}
	}
}

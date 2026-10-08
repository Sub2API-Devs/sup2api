package features

import (
	"strings"
	"testing"
)

func TestHelperInlineBudgetCatalogRemainsConditional(t *testing.T) {
	doc := Catalog()
	if doc.CatalogVersion != "2026-10-08.16" || doc.RuntimeVerified {
		t.Fatal("candidate catalog promoted verification")
	}
	seen := map[string]bool{}
	for _, f := range doc.Features {
		if f.ID != "F-TASK-BUDGET" && f.ID != "F-INLINE-TOOLS" {
			continue
		}
		seen[f.ID] = true
		if f.Status != "partial" {
			t.Fatal("narrow combination promoted to full support")
		}
		for _, word := range []string{"custom inline", "锚点", "撤销", "MCP", "safeguards", "云端"} {
			if !strings.Contains(f.Reason, word) {
				t.Errorf("%s missing boundary %s", f.ID, word)
			}
		}
		if strings.Contains(f.Reason, "MCP、inline、context") {
			t.Fatal("old blanket inline rejection remains")
		}
	}
	if len(seen) != 2 {
		t.Fatal("missing shared catalog features")
	}
}

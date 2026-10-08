package engine

import (
	"encoding/json"
	"testing"
)

func TestForcedAPIFormatQualification(t *testing.T) {
	for _, kind := range []string{"any", "tool"} {
		r := forcedLoadedFixture(t)
		choice := Object{"type": kind}
		if kind == "tool" {
			choice["name"] = "chosen"
		}
		r.Plan.fields["tool_choice"], _ = json.Marshal(choice)
		r.JSONSchema = Object{"type": "object"}
		if r.forcedLoadedClientCatalog() {
			t.Fatal("legacy synthetic admitted")
		}
		r.APIOutputFormat = true
		if !r.forcedLoadedClientCatalog() || r.maxTurns() != "1" {
			t.Fatal("API format incorrectly treated as synthetic")
		}
		if newRunConfig(r, &Prepared{}, "fixture", "fixture").env["CCGATEWAY_TOOL_SEARCH"] != "0" {
			t.Fatal("helper enabled")
		}
	}
}

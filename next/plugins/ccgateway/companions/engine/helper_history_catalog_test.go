package engine

import "testing"

func helperFixtureReferencesAvailable(body Object) bool {
	tools, _ := historyContent(body["tools"])
	available := map[string]bool{}
	for _, tool := range tools {
		available[str(tool, "name")] = true
	}
	rows, _ := body["messages"].([]any)
	for _, raw := range rows {
		m, _ := raw.(Object)
		blocks, _ := historyContent(m["content"])
		for _, block := range blocks {
			if str(block, "type") != "tool_result" {
				continue
			}
			refs, err := historyContent(block["content"])
			if err != nil {
				continue
			}
			for _, ref := range refs {
				if str(ref, "type") == "tool_reference" && !available[str(ref, "tool_name")] {
					return false
				}
			}
		}
	}
	return true
}

func TestHelperCatalogProviderValidation(t *testing.T) {
	r, body, want := independentHelperCatalogFixture(t)
	want, _ = jsonCopyObject(want)
	want["name"] = r.wireName(str(want, "name"))
	if err := r.applyHelperHistory(body); err != nil {
		t.Fatal(err)
	}
	if helperFixtureReferencesAvailable(body) {
		t.Fatal("fixture accepted missing deferred definition")
	}
	if err := r.restoreHelperToolCatalog(body); err != nil {
		t.Fatal(err)
	}
	if !helperFixtureReferencesAvailable(body) {
		t.Fatal("restored reference still unresolved")
	}
	tools, _ := historyContent(body["tools"])
	for _, tool := range tools {
		if str(tool, "name") == r.wireName("weather") && digest(tool) != digest(want) {
			t.Fatal("client definition changed")
		}
	}
}

package engine

import (
	"encoding/json"
	"testing"
)

func TestReviewForcedAnyClientNamedHelperIsNotRemoved(t *testing.T) {
	r := forcedLoadedFixture(t)
	r.Plan.fields["tool_choice"] = json.RawMessage(`{"type":"any"}`)
	r.Tools[0].Name = "ToolSearch"
	r.Native = map[string]bool{"ToolSearch": true}
	body := Object{"tools": []any{Object{"name": "ToolSearch", "input_schema": r.Tools[0].Schema}}}
	if err := r.verifyForcedLoadedCatalog(body); err != nil {
		t.Fatal(err)
	}
	tools, _ := historyContent(body["tools"])
	if len(tools) != 1 || str(tools[0], "name") != "ToolSearch" {
		t.Fatal("declared client identity mistaken for helper")
	}
	if internalHistoryAssistant(r, Object{"content": []Object{{"type": "tool_use", "name": "ToolSearch"}}}) {
		t.Fatal("client call consumed internally")
	}
}

func TestReviewForcedAnyParallelContractAndInvalidCatalog(t *testing.T) {
	for _, raw := range []string{`{"type":"any"}`, `{"type":"any","disable_parallel_tool_use":false}`, `{"type":"any","disable_parallel_tool_use":true}`} {
		r := forcedLoadedFixture(t)
		r.Plan.fields["tool_choice"] = json.RawMessage(raw)
		body := Object{"tools": []any{Object{"name": r.wireName("chosen"), "input_schema": r.Tools[0].Schema}}}
		if err := r.ApplyMainRequestFeatures(body); err != nil {
			t.Fatal(err)
		}
		want, _ := decodeObject([]byte(raw))
		if digest(body["tool_choice"]) != digest(want) {
			t.Fatal("parallel contract modified")
		}
		if r.maxTurns() != "1" || newRunConfig(r, &Prepared{}, "fixture", "fixture").env["CCGATEWAY_TOOL_SEARCH"] != "0" {
			t.Fatal("helper execution enabled")
		}
		for _, bad := range []Object{
			{"tools": []any{}},
			{"tools": []any{Object{"name": r.wireName("chosen"), "input_schema": Object{"type": "array"}}}},
			{"tools": []any{Object{"name": r.wireName("chosen"), "input_schema": r.Tools[0].Schema, "defer_loading": true}}},
			{"tools": []any{Object{"name": r.wireName("chosen"), "input_schema": r.Tools[0].Schema}, Object{"name": "ToolSearch"}, Object{"name": "ToolSearch"}}},
		} {
			if r.verifyForcedLoadedCatalog(bad) == nil {
				t.Fatal("invalid catalog accepted")
			}
		}
	}
}

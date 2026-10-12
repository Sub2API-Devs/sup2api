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
		body := basic()
		body["tools"] = []any{Object{"name": "chosen", "defer_loading": false, "input_schema": Object{"type": "object"}}}
		body["tool_choice"] = json.RawMessage(raw)
		r := reviewParseForcedMixed(t, body)
		cfg, err := r.passthroughBodies()
		if err != nil {
			t.Fatal(err)
		}
		if string(cfg.First["tool_choice"]) != raw || cfg.Rest["tool_choice"] != nil {
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

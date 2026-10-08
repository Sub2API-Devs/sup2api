package engine

import (
	"encoding/json"
	"testing"
)

func TestReviewForcedLoadedWholeCatalogBoundary(t *testing.T) {
	for _, policy := range []string{"true", "auto", "auto:1", "auto:100"} {
		r := forcedLoadedFixture(t)
		r.ToolSearch = policy
		if r.forcedLoadedClientTool() == nil || r.maxTurns() != "1" {
			t.Fatal("lost eligible policy", policy)
		}
		no := false
		r.Tools = append(r.Tools, Tool{Name: "other", Schema: Object{"type": "object"}, DeferLoading: &no})
		r.Tools[1].DeferLoading = nil
		if r.forcedLoadedClientTool() != nil {
			t.Fatal("unrelated implicit tool admitted", policy)
		}
		yes := true
		r.Tools[1].DeferLoading = &yes
		if r.forcedLoadedClientTool() != nil {
			t.Fatal("unrelated deferred tool admitted", policy)
		}
	}
	for _, raw := range []string{`{"type":"tool","name":"missing"}`, `{"type":"none"}`, `{"type":"auto"}`, `null`} {
		r := forcedLoadedFixture(t)
		r.Plan.fields["tool_choice"] = json.RawMessage(raw)
		if r.forcedLoadedClientTool() != nil {
			t.Fatal("wrong choice admitted", raw)
		}
	}
}

func TestReviewForcedLoadedSchemaAndMetadata(t *testing.T) {
	r := forcedLoadedFixture(t)
	r.Tools[0].Schema = Object{"type": "object", "properties": Object{"number": Object{"const": json.Number("9007199254740993")}}}
	for _, mode := range []string{"correct", "schema-change", "missing", "duplicate", "deferred"} {
		t.Run(mode, func(t *testing.T) {
			tool := Object{"name": r.wireName("chosen"), "input_schema": r.Tools[0].Schema, "description": "exact description", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}
			wire := Object{"tools": []any{tool}}
			switch mode {
			case "schema-change":
				tool["input_schema"] = Object{"type": "object", "properties": Object{"number": Object{"const": json.Number("9007199254740992")}}}
			case "missing":
				wire["tools"] = []any{}
			case "duplicate":
				wire["tools"] = []any{tool, tool}
			case "deferred":
				tool["defer_loading"] = true
			}
			err := r.verifyForcedLoadedCatalog(wire)
			if (err == nil) != (mode == "correct") {
				t.Fatal(mode, err)
			}
			if mode == "correct" && (tool["defer_loading"] != false || tool["description"] != "exact description" || digest(tool["cache_control"]) != digest(Object{"type": "ephemeral", "ttl": "1h"})) {
				t.Fatal("metadata lost")
			}
		})
	}
}

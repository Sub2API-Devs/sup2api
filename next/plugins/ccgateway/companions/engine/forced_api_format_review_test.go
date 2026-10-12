package engine

import (
	"encoding/json"
	"testing"
)

func TestReviewForcedAPIFormatExactPlanAndParallelFalse(t *testing.T) {
	for _, kind := range []string{"any", "tool"} {
		body := basic()
		choice := Object{"type": kind, "disable_parallel_tool_use": false}
		if kind == "tool" {
			choice["name"] = "chosen"
		}
		format := Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"n": Object{"type": "integer", "enum": []any{json.Number("9007199254740993")}}}, "required": []any{"n"}, "additionalProperties": false}}
		body["tools"] = []any{Object{"name": "chosen", "defer_loading": false, "input_schema": Object{"type": "object"}}}
		body["tool_choice"] = choice
		body["output_config"] = Object{"format": format}
		p := defaultRequestPolicy()
		p.ToolSearch = "true"
		raw, _ := json.Marshal(body)
		r, err := parsePolicyRequest(raw, policyHeaders(p))
		if err != nil {
			t.Fatal(err)
		}
		cfg, err := r.passthroughBodies()
		if err != nil {
			t.Fatal(err)
		}
		output, err := decodeObject(cfg.First["output_config"])
		if err != nil {
			t.Fatal(err)
		}
		if digest(output["format"]) != digest(format) || string(cfg.First["output_config"]) != string(cfg.Rest["output_config"]) {
			t.Fatal("format numeric identity changed")
		}
		actual, err := decodeObject(cfg.First["tool_choice"])
		if err != nil || cfg.Rest["tool_choice"] != nil {
			t.Fatal("forced choice escaped first round", err)
		}
		if kind == "tool" && str(actual, "name") != r.wireName("chosen") {
			t.Fatal("forced client tool name was not mapped")
		}
		if actual["disable_parallel_tool_use"] != false || str(actual, "type") != kind {
			t.Fatal("choice or explicit parallel=false changed")
		}
		if !r.forcedLoadedClientCatalog() || r.maxTurns() != "1" || r.structuredOutput() {
			t.Fatal("API format took legacy helper path")
		}
		deferred := true
		r.Tools[0].DeferLoading = &deferred
		if r.forcedLoadedClientCatalog() {
			t.Fatal("API format relaxed deferred catalog gate")
		}
		r.Tools[0].DeferLoading = nil
		if r.forcedLoadedClientCatalog() {
			t.Fatal("API format relaxed implicit catalog gate")
		}
	}
}

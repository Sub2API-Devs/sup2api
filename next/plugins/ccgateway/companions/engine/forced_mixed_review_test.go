package engine

import (
	"encoding/json"
	"testing"
)

func reviewForcedMixedBody() Object {
	body := basic()
	body["tools"] = []any{
		Object{"name": "chosen", "description": "", "defer_loading": false, "input_schema": Object{"type": "object"}},
		Object{"name": "other", "defer_loading": true, "strict": false, "input_examples": []any{}, "eager_input_streaming": nil, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740993")}}}},
	}
	body["tool_choice"] = Object{"type": "tool", "name": "chosen", "disable_parallel_tool_use": true}
	body["metadata"] = Object{}
	return body
}

func reviewParseForcedMixed(t *testing.T, body Object) *Request {
	t.Helper()
	p := defaultRequestPolicy()
	p.ToolSearch = "true"
	r, err := parsePolicyRequest(mustMCPJSON(body), policyHeaders(p))
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func reviewForcedWire(r *Request) Object {
	return Object{"tools": []any{
		Object{"name": r.wireName("other"), "input_schema": r.Tools[1].Schema},
		Object{"name": r.wireName("chosen"), "input_schema": r.Tools[0].Schema},
		Object{"name": "ToolSearch"},
	}}
}

func TestReviewForcedMixedMainRestorationAndIsolation(t *testing.T) {
	body := reviewForcedMixedBody()
	original := digest(body)
	r := reviewParseForcedMixed(t, body)
	rawBefore := string(r.Plan.raw)
	wire := reviewForcedWire(r)
	if err := r.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	wanted, err := jsonCopyObject(body)
	if err != nil {
		t.Fatal(err)
	}
	list, _ := historyContent(wanted["tools"])
	for _, tool := range list {
		tool["name"] = r.wireName(str(tool, "name"))
	}
	if digest(wire["tools"]) != digest(list) {
		t.Fatal("original field presence, order or numeric schema changed")
	}
	choice := wire["tool_choice"].(Object)
	_, metadataApplied := wire["metadata"] // the client's metadata only selects the session (§53.12)
	if str(choice, "name") != r.wireName("chosen") || choice["disable_parallel_tool_use"] != true || metadataApplied {
		t.Fatal("main controls changed")
	}
	actual, _ := historyContent(wire["tools"])
	actual[1]["input_schema"].(Object)["type"] = "array"
	if digest(body) != original || string(r.Plan.raw) != rawBefore || str(r.Tools[1].Schema, "type") != "object" {
		t.Fatal("output mutation polluted request")
	}
	next := reviewForcedWire(r)
	if err := r.ApplyMainRequestFeatures(next); err != nil || digest(next["tools"]) != digest(list) {
		t.Fatal("second response inherited mutation", err)
	}
}

func TestReviewForcedMixedLateFailureAtomic(t *testing.T) {
	for _, kind := range []string{"duplicate", "schema", "unknown", "defer-object"} {
		t.Run(kind, func(t *testing.T) {
			r := reviewParseForcedMixed(t, reviewForcedMixedBody())
			wire := reviewForcedWire(r)
			list := wire["tools"].([]any)
			switch kind {
			case "duplicate":
				list = append(list, list[0])
			case "schema":
				list[1].(Object)["input_schema"] = Object{"type": "array"}
			case "unknown":
				list = append(list, Object{"name": "not-declared"})
			case "defer-object":
				list[1].(Object)["defer_loading"] = Object{}
			}
			wire["tools"] = list
			before := digest(wire)
			if err := r.verifyForcedLoadedCatalog(wire); err == nil {
				t.Fatal("bad catalog accepted")
			}
			if digest(wire) != before {
				t.Fatal("failed catalog partially mutated")
			}
		})
	}
}

func TestReviewForcedMixedCacheAndHelperBoundary(t *testing.T) {
	r := reviewParseForcedMixed(t, reviewForcedMixedBody())
	key := r.configKey()
	changed := reviewForcedMixedBody()
	changed["tools"].([]any)[1].(Object)["defer_loading"] = false
	if reviewParseForcedMixed(t, changed).configKey() == key {
		t.Fatal("different loading catalog shared config")
	}
	cfg := newRunConfig(r, &Prepared{}, "fixture", "fixture")
	if cfg.env["CCGATEWAY_TOOL_SEARCH"] != "0" || cfg.env["ENABLE_TOOL_SEARCH"] != "true" || r.maxTurns() != "1" {
		t.Fatal("zero helper boundary changed")
	}
	for _, variant := range []string{"any", "implicit", "mcp", "inline"} {
		q := reviewParseForcedMixed(t, reviewForcedMixedBody())
		switch variant {
		case "any":
			q.Plan.fields["tool_choice"] = json.RawMessage(`{"type":"any"}`)
		case "implicit":
			q.Tools[1].DeferLoading = nil
		case "mcp":
			q.MCP = &MCPConnectorPlan{}
		case "inline":
			q.InlineTools = &inlineToolTimeline{}
		}
		if q.forcedLoadedClientCatalog() {
			t.Fatal("scope expanded", variant)
		}
	}
}

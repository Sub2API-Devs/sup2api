package engine

import (
	"encoding/json"
	"testing"
)

func forcedMixedRequest(t *testing.T) *Request {
	t.Helper()
	body := basic()
	body["tools"] = []any{
		Object{"name": "chosen", "description": "", "defer_loading": false, "input_schema": Object{"type": "object"}},
		Object{"name": "other", "strict": false, "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740993")}}}},
	}
	body["tool_choice"] = Object{"type": "tool", "name": "chosen"}
	p := defaultRequestPolicy()
	p.ToolSearch = "true"
	r, err := parsePolicyRequest(mustMCPJSON(body), policyHeaders(p))
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func TestForcedMixedExactCatalogAndAtomicFailure(t *testing.T) {
	r := forcedMixedRequest(t)
	for _, variant := range []string{"ok", "missing", "extra", "schema", "duplicate"} {
		t.Run(variant, func(t *testing.T) {
			tools := []any{Object{"name": r.wireName("other"), "input_schema": r.Tools[1].Schema}, Object{"name": r.wireName("chosen"), "input_schema": r.Tools[0].Schema}}
			switch variant {
			case "missing":
				tools = tools[:1]
			case "extra":
				tools = append(tools, Object{"name": "unexpected"})
			case "schema":
				tools[1].(Object)["input_schema"] = Object{"type": "array"}
			case "duplicate":
				tools = append(tools, tools[0])
			}
			wire := Object{"tools": tools}
			before := digest(wire)
			err := r.verifyForcedLoadedCatalog(wire)
			if variant != "ok" {
				if err == nil || digest(wire) != before {
					t.Fatal("invalid catalog accepted or partially mutated", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			want, err := r.originalForcedCatalog()
			if err != nil {
				t.Fatal(err)
			}
			if digest(wire["tools"]) != digest(want) {
				t.Fatal("original order/field presence/schema changed")
			}
		})
	}
}

func TestForcedMixedEligibilityAndZeroHelper(t *testing.T) {
	r := forcedMixedRequest(t)
	if !r.forcedLoadedClientCatalog() || r.maxTurns() != "1" {
		t.Fatal("eager named not eligible")
	}
	for _, name := range r.enabledTools() {
		if name == "ToolSearch" {
			t.Fatal("helper enabled")
		}
	}
	if newRunConfig(r, &Prepared{}, "fixture", "fixture").env["ENABLE_TOOL_SEARCH"] != "true" {
		t.Fatal("CLI loading policy changed")
	}
	for _, raw := range []string{`{"type":"any"}`, `{"type":"tool","name":"other"}`} {
		r.Plan.fields["tool_choice"] = json.RawMessage(raw)
		if r.forcedLoadedClientCatalog() {
			t.Fatal("unsupported forced combination admitted")
		}
	}
}

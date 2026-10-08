package engine

import (
	"encoding/json"
	"testing"
)

func forcedLoadedFixture(t *testing.T) *Request {
	t.Helper()
	v := basic()
	v["tools"] = []any{Object{"name": "chosen", "defer_loading": false, "input_schema": Object{"type": "object"}}}
	v["tool_choice"] = Object{"type": "tool", "name": "chosen"}
	b, _ := json.Marshal(v)
	p := defaultRequestPolicy()
	p.ToolSearch = "true"
	r, e := parsePolicyRequest(b, policyHeaders(p))
	if e != nil {
		t.Fatal(e)
	}
	return r
}
func TestForcedLoadedAdmissionAndExecutionBoundary(t *testing.T) {
	r := forcedLoadedFixture(t)
	if !r.forcedLoadedClientCatalog() || r.maxTurns() != "1" {
		t.Fatal("eligible scope missing")
	}
	q := Object{"request_id": "fixture", "request": Object{"subtype": "can_use_tool", "tool_name": "ToolSearch", "tool_use_id": "helper"}}
	reply := controlReply(q, r)
	raw, _ := json.Marshal(reply)
	var decoded Object
	json.Unmarshal(raw, &decoded)
	response := decoded["response"].(Object)
	if response["response"].(Object)["behavior"] != "deny" {
		t.Fatal("stdio allowed helper")
	}
	if internalHistoryAssistant(r, Object{"content": []Object{{"type": "tool_use", "name": "ToolSearch"}}}) {
		t.Fatal("helper classified as permitted round")
	}
	for _, tool := range r.responseView().Tools {
		if tool.Name == "ToolSearch" {
			t.Fatal("helper accepted by response view")
		}
	}
	for _, mode := range []string{"deferred", "implicit", "server", "typed", "mcp", "inline", "safeguards", "format"} {
		t.Run(mode, func(t *testing.T) {
			x := forcedLoadedFixture(t)
			switch mode {
			case "deferred":
				v := true
				x.Tools[0].DeferLoading = &v
			case "implicit":
				x.Tools[0].DeferLoading = nil
			case "server":
				x.ServerTools = []Object{{}}
			case "typed":
				x.APIClientTools = []Object{{}}
			case "mcp":
				x.MCP = &MCPConnectorPlan{}
			case "inline":
				x.InlineTools = &inlineToolTimeline{}
			case "safeguards":
				x.Plan.fields["safeguards"] = json.RawMessage(`[{}]`)
			case "format":
				x.JSONSchema = Object{}
			}
			if x.forcedLoadedClientCatalog() {
				t.Fatal("unsafe combination admitted")
			}
		})
	}
}
func TestForcedLoadedDeferralAndExecutionAreSeparate(t *testing.T) {
	for _, mode := range []string{"loaded-forced", "normal-search", "no-search"} {
		t.Run(mode, func(t *testing.T) {
			r := forcedLoadedFixture(t)
			if mode == "normal-search" {
				r.Plan.fields["tool_choice"] = json.RawMessage(`{"type":"auto"}`)
			}
			if mode == "no-search" {
				r.ToolSearch = "false"
			}
			cfg := newRunConfig(r, &Prepared{}, "fixture", "fixture")
			c, err := startModControl(cfg, "http://fixture")
			if err != nil {
				t.Fatal(err)
			}
			defer modControls.Delete(c.path)
			var config Object
			json.Unmarshal(c.config, &config)
			deferred := config["deferred"].(Object)
			if mode == "no-search" {
				if len(deferred) != 0 || cfg.env["CCGATEWAY_TOOL_SEARCH"] == "1" {
					t.Fatal("no-search gained helper")
				}
				return
			}
			if deferred["mcp__ccgateway__chosen"] != false || cfg.env["ENABLE_TOOL_SEARCH"] != "true" {
				t.Fatal("directory policy lost")
			}
			want := "1"
			if mode == "loaded-forced" {
				want = "0"
			}
			if cfg.env["CCGATEWAY_TOOL_SEARCH"] != want {
				t.Fatal("helper permission changed")
			}
		})
	}
}

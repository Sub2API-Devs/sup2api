package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSafeguardsAdmissionAndMainAttribution(t *testing.T) {
	body := basic()
	body["safeguards"] = []any{Object{"type": "dangerous_tool_use", "classifier_context": Object{"live_cwd": "D:/client"}}}
	raw, _ := json.Marshal(body)
	headers := policyHeaders(defaultRequestPolicy())
	headers.Set("anthropic-beta", "dangerous-tool-use-2026-09-03")
	r, err := parsePolicyRequest(raw, headers)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Betas) != 1 || r.Betas[0] != "dangerous-tool-use-2026-09-03" {
		t.Fatal("safeguards beta dropped")
	}
	s := newMainRequestScope()
	if err := s.enter(); err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{scope: s, path: "/fixture"}
	var forwarded []byte
	handler := relay.handler(r, http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		forwarded, _ = io.ReadAll(req.Body)
		w.WriteHeader(200)
	}))
	for _, scenario := range []struct {
		name, path     string
		marked, client bool
	}{{"main", "/messages", true, true}, {"auxiliary", "/messages", false, false}, {"count", "/messages/count_tokens", true, false}} {
		t.Run(scenario.name, func(t *testing.T) {
			message := scopedFixture(s)
			message["safeguards"] = []any{Object{"type": "dangerous_tool_use", "classifier_context": Object{"live_cwd": "/container"}}}
			if !scenario.marked {
				message["system"] = []any{Object{"type": "text", "text": "classifier"}}
			}
			wire, _ := json.Marshal(message)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequest("POST", "http://local/fixture"+scenario.path, bytes.NewReader(wire)))
			if response.Code != 200 {
				t.Fatal(response.Code, response.Body.String())
			}
			if bytes.Contains(forwarded, []byte("D:/client")) != scenario.client {
				t.Fatal("wrong request context replaced")
			}
			if bytes.Contains(forwarded, []byte(s.marker)) {
				t.Fatal("marker leaked")
			}
			if !scenario.marked && !bytes.Equal(wire, forwarded) {
				t.Fatal("auxiliary modified")
			}
		})
	}
	if err := s.verify(); err != nil {
		t.Fatal(err)
	}
}

func TestSafeguardsEnvelope(t *testing.T) {
	for _, raw := range []string{`null`, `{}`, `[]`, `[null]`, `[{}]`, `[1]`, `"x"`, `[{"x":"` + strings.Repeat("x", maxSafeguardsBytes) + `"}]`} {
		o, err := decodeObject([]byte(`{"safeguards":` + raw + `}`))
		if err != nil {
			t.Fatal(err)
		}
		if _, err := parseRequestPlan(nil, o); err == nil {
			t.Fatalf("accepted invalid safeguards envelope (%d bytes)", len(raw))
		}
	}
}

func TestSafeguardsClientExecutionContextPreserved(t *testing.T) {
	// Different container roots would classify against the wrong executor.
	// Preserve the client object, including unknown versioned fields and numbers.
	o, _ := decodeObject([]byte(`{"safeguards":[{"type":"dangerous_tool_use","classifier_context":{"live_cwd":"D:/client","v":9007199254740993,"future":null}}]}`))
	p, err := parseRequestPlan(nil, o)
	if err != nil {
		t.Fatal(err)
	}
	schema := Object{"type": "object"}
	r := &Request{Plan: p, Tools: []Tool{{Name: "Bash", Schema: schema}}, Native: map[string]bool{"Bash": true}}
	m := Object{"safeguards": []any{Object{"classifier_context": Object{"live_cwd": "/container"}}}, "tools": []any{Object{"name": "Bash", "input_schema": schema}}}
	m["messages"] = []any{Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_client_identity", "name": "Bash", "input": Object{}}, Object{"type": "text", "text": "context"}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_client_identity", "content": "result"}}}}
	beforeHistory, _ := json.Marshal(m["messages"])
	if err := r.ApplyMainRequestFeatures(m); err != nil {
		t.Fatal(err)
	}
	afterHistory, _ := json.Marshal(m["messages"])
	if !bytes.Equal(beforeHistory, afterHistory) {
		t.Fatal("safeguards mapping changed tool-use IDs or client history")
	}
	raw, _ := json.Marshal(m["safeguards"])
	if !strings.Contains(string(raw), `9007199254740993`) || !strings.Contains(string(raw), `D:/client`) || strings.Contains(string(raw), `/container`) {
		t.Fatalf("context changed: %s", raw)
	}
	m["safeguards"].([]any)[0].(map[string]any)["type"] = "mutated"
	if strings.Contains(string(p.fields["safeguards"]), "mutated") {
		t.Fatal("plan storage leaked")
	}
	// No explicit client safeguards must not suppress inner CC protections.
	r.Plan = nil
	inner := Object{"safeguards": []any{Object{"type": "inner"}}}
	if err := r.ApplyMainRequestFeatures(inner); err != nil {
		t.Fatal(err)
	}
	if str(inner["safeguards"].([]any)[0].(map[string]any), "type") != "inner" {
		t.Fatal("inner safeguards lost")
	}
}

func TestSafeguardsRejectDifferentToolExecutionScope(t *testing.T) {
	for _, mode := range []string{"mapped", "schema", "extra", "missing", "duplicate", "search-extra", "search-missing", "structured"} {
		t.Run(mode, func(t *testing.T) {
			o, _ := decodeObject([]byte(`{"safeguards":[{"type":"dangerous_tool_use"}]}`))
			p, _ := parseRequestPlan(nil, o)
			schema := Object{"type": "object"}
			r := &Request{Plan: p, Tools: []Tool{{Name: "Bash", Schema: schema}}, Native: map[string]bool{"Bash": true}}
			actual := []any{Object{"name": "Bash", "input_schema": schema}}
			switch mode {
			case "mapped":
				r.Native = nil
			case "schema":
				actual[0].(Object)["input_schema"] = Object{"type": "string"}
			case "extra":
				actual = append(actual, Object{"name": "Extra", "input_schema": schema})
			case "missing":
				actual = nil
			case "duplicate":
				actual = append(actual, actual[0])
			case "search-extra":
				r.ToolSearch = "true"
				actual = append(actual, Object{"name": "Extra", "input_schema": schema})
			case "search-missing":
				// Only deferred client tools may wait for ToolSearch.
				r.ToolSearch = "true"
				actual = []any{Object{"name": "ToolSearch", "input_schema": schema}}
			case "structured":
				r.JSONSchema = Object{"type": "object"}
			}
			m := Object{"tools": actual, "safeguards": "unchanged"}
			if err := r.ApplyMainRequestFeatures(m); err == nil {
				t.Fatal("accepted incompatible execution scope")
			}
			if m["safeguards"] != "unchanged" {
				t.Fatal("rejection mutated inner protections")
			}
		})
	}
}

// Internal ToolSearch rounds keep the client's context (CC 2.1.292 sends it
// with DeferredToolPlaceholder): the search helpers may join the outbound
// tools and deferred client tools may be absent until they are loaded.
func TestSafeguardsWithInternalToolSearch(t *testing.T) {
	o, _ := decodeObject([]byte(`{"safeguards":[{"type":"dangerous_tool_use"}]}`))
	p, _ := parseRequestPlan(nil, o)
	schema := Object{"type": "object"}
	yes := true
	r := &Request{Plan: p, ToolSearch: "true", Native: map[string]bool{"Bash": true}, Tools: []Tool{
		{Name: "Bash", Schema: schema},
		{Name: "DeferredToolPlaceholder", Schema: schema, DeferLoading: &yes},
		{Name: "mcp__fixture__lookup", Schema: schema, DeferLoading: &yes},
	}}
	for _, actual := range [][]any{
		{Object{"name": "Bash", "input_schema": schema}, Object{"name": "ToolSearch", "input_schema": schema}, Object{"name": "DeferredToolPlaceholder", "input_schema": schema}},
		{Object{"name": "Bash", "input_schema": schema}, Object{"name": "ToolSearch", "input_schema": schema}, Object{"name": "mcp__fixture__lookup", "input_schema": schema}},
	} {
		m := Object{"tools": actual}
		if err := r.ApplyMainRequestFeatures(m); err != nil {
			t.Fatal(err)
		}
		if m["safeguards"] == nil {
			t.Fatal("client safeguards not applied")
		}
	}
	r.ToolSearch = "false"
	if err := r.ApplyMainRequestFeatures(Object{"tools": []any{Object{"name": "Bash", "input_schema": schema}, Object{"name": "ToolSearch", "input_schema": schema}}}); err == nil {
		t.Fatal("search helper accepted without internal search")
	}
}

func TestSafeguardsHistoricalToolIdentityAfterNativeMatching(t *testing.T) {
	for _, scenario := range []string{"same-native", "schema-changed", "removed-native", "same-mcp"} {
		t.Run(scenario, func(t *testing.T) {
			body := basic()
			body["safeguards"] = []any{Object{"type": "dangerous_tool_use", "classifier_context": Object{"fixture": true}}}
			read := verifiedNativeToolCatalogues["2.1.292"]["Read"][0]
			name := "Read"
			if scenario == "same-mcp" {
				read.Name = "mcp__client__Read"
				name = read.Name
			}
			if scenario == "schema-changed" {
				read.Schema = Object{"type": "object", "properties": Object{"changed": Object{"type": "string"}}}
			}
			body["tools"] = []any{read}
			if scenario == "removed-native" {
				body["tools"] = []any{}
			}
			body["messages"] = []any{Object{"role": "user", "content": "read"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_history_identity", "name": name, "input": Object{"file_path": "D:/fixture"}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_history_identity", "content": "fixture result"}}}}
			raw, _ := json.Marshal(body)
			r, err := parsePolicyRequest(raw, http.Header{})
			if err != nil {
				t.Fatalf("parse must wait for native matching: %v", err)
			}
			matchNativeTools(r, "2.1.292")
			actual := []any{}
			for _, tool := range r.Tools {
				actual = append(actual, Object{"name": r.wireName(tool.Name), "input_schema": tool.Schema})
			}
			wire := Object{"tools": actual, "safeguards": []any{Object{"type": "inner"}}}
			err = r.ApplyMainRequestFeatures(wire)
			wantReject := scenario == "schema-changed" // Removed completed history now preserves its original wire name.
			if (err != nil) != wantReject {
				t.Fatalf("reject=%t err=%v", wantReject, err)
			}
			if wantReject && !strings.Contains(err.Error(), "historical tool names") {
				t.Fatalf("wrong rejection reason: %v", err)
			}
		})
	}
}

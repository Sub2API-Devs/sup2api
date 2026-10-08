package engine

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func independentHelperCatalogFixture(t *testing.T, overrides ...Object) (*Request, Object, Object) {
	t.Helper()
	r := internalCacheReviewRequest()
	definition := Object{"name": "weather", "description": "client description", "defer_loading": true, "input_schema": Object{"type": "object"}}
	for _, patch := range overrides {
		for k, v := range patch {
			definition[k] = v
		}
	}
	rawTools, _ := json.Marshal([]any{definition})
	var err error
	r.Tools, err = parseTools([]any{definition}, &r.TTL)
	if err != nil {
		t.Fatal(err)
	}
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	public := json.RawMessage(`[{"role":"user","content":"public"}]`)
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	segment, err := r.captureHelperHistory(public, rawTools, 0, suffix)
	if err != nil {
		t.Fatal(err)
	}
	r.internalCache = &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
	x := &helperHistoryExecution{authenticated: true, public: public, tools: rawTools, imported: helperhistory.Payload{Version: 1, Segments: []helperhistory.Segment{segment}}, delta: helperhistory.Payload{Version: 1}}
	r.helperHistory = x
	if err = r.admitHelperHistory(x); err != nil {
		t.Fatal(err)
	}
	body := Object{"messages": []any{Object{"role": "user", "content": "public"}}, "tools": []any{Object{"name": "DeferredToolPlaceholder", "input_schema": Object{"type": "object"}}, Object{"name": "ToolSearch", "input_schema": Object{"type": "object"}}}}
	return r, body, definition
}

func TestIndependentHelperCatalogMetadataPrecisionAndNoMutation(t *testing.T) {
	r, body, want := independentHelperCatalogFixture(t, Object{"description": "", "strict": false, "eager_input_streaming": false, "input_examples": []any{Object{"n": json.Number("9007199254740993")}}, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740993")}}}})
	source := string(r.helperHistory.tools)
	if err := r.ApplyMainRequestFeatures(body); err != nil {
		t.Fatal(err)
	}
	for _, raw := range body["tools"].([]any) {
		tool := raw.(Object)
		if str(tool, "name") == r.wireName("weather") {
			expected, _ := jsonCopyObject(want)
			expected["name"] = r.wireName("weather")
			if digest(tool) != digest(expected) {
				t.Fatalf("metadata or precision lost: %#v", tool)
			}
		}
	}
	if string(r.helperHistory.tools) != source {
		t.Fatal("persisted source catalog mutated")
	}
	before := digest(body)
	if err := r.ApplyMainRequestFeatures(body); err != nil {
		t.Fatal(err)
	}
	if digest(body) != before {
		t.Fatal("catalog restoration duplicates or changes definition")
	}
}

func TestIndependentHelperCatalogRejectsAmbiguityAtomically(t *testing.T) {
	for _, variant := range []string{"schema", "duplicate"} {
		t.Run(variant, func(t *testing.T) {
			r, body, want := independentHelperCatalogFixture(t)
			offered, _ := jsonCopyObject(want)
			offered["name"] = r.wireName("weather")
			if variant == "schema" {
				offered["input_schema"] = Object{"type": "string"}
			}
			body["tools"] = append(body["tools"].([]any), offered)
			if variant == "duplicate" {
				body["tools"] = append(body["tools"].([]any), offered)
			}
			before := digest(body)
			if err := r.ApplyMainRequestFeatures(body); err == nil {
				t.Fatal("invalid existing definition accepted")
			}
			if digest(body) != before {
				t.Fatal("partial catalog change before rejection")
			}
		})
	}
}

func TestIndependentHelperCatalogInlineWithdrawalAndReadd(t *testing.T) {
	old, public, tools := helperInlineFixture(t, nil)
	old.internalCache = &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
	suffix := internalCacheSuffix()
	assistant, _ := historyContent(suffix[0].(Object)["content"])
	assistant[0]["input"] = Object{"query": "select:mcp__ccgateway__beta"}
	user, _ := historyContent(suffix[1].(Object)["content"])
	user[0]["content"] = []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__beta"}}
	observeCacheFixture(old, assistant)
	confirmReviewHidden(t, old)
	segment, err := old.captureHelperHistory(public, tools, 1, suffix)
	if err != nil {
		t.Fatal(err)
	}
	removal := Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "beta"}}}}
	newDefinition := Object{"name": "beta", "description": "new beta", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740995")}}}}
	for _, readd := range []bool{false, true} {
		extra := []any{Object{"role": "assistant", "content": "old answer"}, Object{"role": "user", "content": "withdraw"}, removal}
		if readd {
			extra = append(extra, Object{"role": "assistant", "content": "withdrawn"}, Object{"role": "user", "content": "readd"}, Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": newDefinition}}}})
		}
		current, _, _ := helperInlineFixture(t, extra)
		current.internalCache = &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
		current.helperHistory.imported = helperhistory.Payload{Version: 1, Segments: []helperhistory.Segment{segment}}
		if err = current.admitHelperHistory(current.helperHistory); err != nil {
			t.Fatal(err)
		}
		messages := []any{}
		for _, message := range current.Messages {
			messages = append(messages, Object{"role": message.Role, "content": current.wireMessage(message).Content})
		}
		body := Object{"messages": messages, "tools": []any{Object{"name": "ToolSearch", "input_schema": Object{"type": "object"}}}}
		if err = current.ApplyMainRequestFeatures(body); err != nil {
			t.Fatal(err)
		}
		if err = current.applyHelperHistory(body); err != nil {
			t.Fatal(err)
		}
		if current.runtimeToolSearchable("beta") != readd {
			t.Fatal("historical discovery changed current availability")
		}
		if current.inlineSearchDiscovered("beta") {
			t.Fatal("historical discovery became current discovery")
		}
		for _, raw := range body["tools"].([]any) {
			if str(raw.(Object), "name") == current.wireName("beta") {
				t.Fatal("historical union promoted into base tools")
			}
		}
		view, err := current.helperInlineHistoryView(1)
		if err != nil {
			t.Fatal(err)
		}
		if digest(view.InlineTools.Known["beta"]["input_schema"]) == digest(newDefinition["input_schema"]) {
			t.Fatal("new schema rewrote historical definition")
		}
		if readd && digest(current.InlineTools.Known["beta"]["input_schema"]) != digest(newDefinition["input_schema"]) {
			t.Fatal("readded tool lost new schema")
		}
	}
}

func TestIndependentHelperCatalogPublicToolNamesRemainClientOwned(t *testing.T) {
	r, body, _ := independentHelperCatalogFixture(t)
	before := digest(r.Tools)
	if err := r.ApplyMainRequestFeatures(body); err != nil {
		t.Fatal(err)
	}
	original := Message{Role: "assistant", Content: []Object{{"type": "tool_use", "id": "public-call", "name": "weather", "input": Object{"n": json.Number("9007199254740993")}}}}
	wire := r.wireMessage(original)
	if str(wire.Content[0], "name") != r.wireName("weather") || str(original.Content[0], "name") != "weather" {
		t.Fatal("history wire mapping mutated public name")
	}
	a := &Accumulator{Inputs: map[int]string{}, Structured: map[int]bool{}, Closed: map[int]bool{}}
	event := Object{"index": 0, "content_block": Object{"type": "tool_use", "id": "new-public-call", "name": r.wireName("weather"), "input": Object{}}}
	if err := a.blockStart(event, r); err != nil {
		t.Fatal(err)
	}
	if str(a.Blocks[0], "name") != "weather" || !a.HasClientTool {
		t.Fatal("public response leaked transport name or changed execution identity")
	}
	if digest(r.Tools) != before {
		t.Fatal("catalog restoration changed client tool registry")
	}
}

func TestIndependentHelperCatalogRestoresProvenReference(t *testing.T) {
	r, body, want := independentHelperCatalogFixture(t)
	if err := r.ApplyMainRequestFeatures(body); err != nil {
		t.Fatal(err)
	}
	if err := r.applyHelperHistory(body); err != nil {
		t.Fatal(err)
	}
	count := 0
	for _, raw := range body["tools"].([]any) {
		tool := raw.(Object)
		if str(tool, "name") == r.wireName("weather") {
			count++
			expected, _ := jsonCopyObject(want)
			expected["name"] = r.wireName("weather")
			if digest(tool) != digest(expected) {
				t.Fatalf("restored definition differs: %#v", tool)
			}
		}
	}
	if count != 1 {
		t.Fatalf("historical reference lacks unique available definition: %d", count)
	}
}

func TestIndependentHelperCatalogReplayRequiresExactCatalogAndIdentity(t *testing.T) {
	for _, variant := range []string{"schema", "unknown-ref", "native-remap", "mcp"} {
		t.Run(variant, func(t *testing.T) {
			r, _, _ := independentHelperCatalogFixture(t)
			x := r.helperHistory
			switch variant {
			case "schema":
				x.tools = json.RawMessage(`[{"name":"weather","description":"client description","defer_loading":true,"input_schema":{"type":"object","additionalProperties":false}}]`)
			case "unknown-ref":
				m, err := decodeObject(x.imported.Segments[0].Messages[1])
				if err != nil {
					t.Fatal(err)
				}
				b, _ := historyContent(m["content"])
				b[0]["content"] = []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__not_declared"}}
				x.imported.Segments[0].Messages[1], _ = json.Marshal(m)
			case "native-remap":
				r.Native = map[string]bool{"weather": true}
			case "mcp":
				r.MCP = &MCPConnectorPlan{}
			}
			if err := r.admitHelperHistory(x); err == nil {
				t.Fatal("changed catalog or execution identity admitted")
			}
		})
	}
}

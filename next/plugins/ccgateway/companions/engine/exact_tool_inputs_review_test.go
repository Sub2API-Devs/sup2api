package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

func TestReviewExactToolInputsRejectNonNumericChange(t *testing.T) {
	want := Object{"type": "tool_use", "id": "tool_fixture", "name": "local", "input": Object{"number": json.Number("9007199254740993"), "text": "9007199254740993"}}
	r := &Request{Native: map[string]bool{"local": true}, Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "q"}}}, {Role: "assistant", Content: []Object{want}}, {Role: "user", Content: []Object{{"type": "text", "text": "next"}}}}}
	for _, input := range []Object{
		{"number": json.Number("9007199254740992"), "text": "9007199254740992"},
		{"number": "9007199254740993", "text": "9007199254740993"},
		{"number": json.Number("9007199254740992"), "text": "9007199254740993", "extra": true},
	} {
		body := Object{"messages": []any{Object{"role": "user", "content": "q"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "tool_fixture", "name": "local", "input": input}}}, Object{"role": "user", "content": "next"}}}
		if _, err := r.restoreExactToolHistoryInputs(body); err == nil {
			t.Fatal("non-numeric tool input modification accepted")
		}
	}
	one := fingerprints(r.Messages)
	copy := *r
	copy.Messages = append([]Message(nil), r.Messages...)
	changed, _ := jsonCopyObject(want)
	changed["input"].(map[string]any)["number"] = json.Number("9007199254740992")
	copy.Messages[1].Content = []Object{changed}
	two := fingerprints(copy.Messages)
	if one[1] == two[1] {
		t.Fatal("original distinct numeric inputs share cache fingerprint")
	}
}

func TestRealCLIReviewExactMCPInitialInput(t *testing.T) {
	input := Object{"integer": json.Number("9007199254740993"), "decimal": json.Number("0.12345678901234567890123456789")}
	endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "mcp_tool_use", "id": "mcptoolu_numeric", "name": "remote", "server_name": "one", "input": input}, {"type": "mcp_tool_result", "tool_use_id": "mcptoolu_numeric", "is_error": false, "content": "result"}})
	})
	body := mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	body["messages"] = []any{Object{"role": "user", "content": "numeric fixture"}}
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
	req.Header.Set("Anthropic-Beta", mcpConnectorBeta)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatalf("HTTP%d %s", res.StatusCode, raw)
	}
	answer, err := decodeObject(raw)
	if err != nil {
		t.Fatal(err)
	}
	content, _ := historyContent(answer["content"])
	if len(content) < 1 || digest(content[0]["input"]) != digest(input) {
		t.Fatal("MCP initial tool input lost numeric precision through CLI")
	}
}

func TestRealCLIReviewExactMCPListingSchema(t *testing.T) {
	schema := Object{"type": "object", "properties": Object{"value": Object{"type": "integer", "minimum": json.Number("9007199254740993")}}}
	listing := Object{"type": "mcp_tool_listing", "mcp_server_name": "one", "tools": []any{Object{"name": "remote", "input_schema": schema}}}
	handler := func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		if bytes.Contains(mustMCPJSON(body["messages"]), []byte("listing next")) {
			if !messageProbeContainsBlock(body, listing) {
				t.Error("resumed MCP listing schema changed in final provider wire")
			}
			tools, _ := historyContent(body["tools"])
			if len(tools) == 0 || digest(tools[0]["tools"]) != digest(listing["tools"]) {
				t.Error("pinned MCP listing schema changed in final provider wire")
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "continued"}})
			return
		}
		writeSurfaceFixture(w, str(body, "model"), []Object{listing, {"type": "text", "text": "schema"}})
	}
	endpoint, _ := newThinkingOutputFixture(t, handler)
	body := mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	body["messages"] = []any{Object{"role": "user", "content": "listing fixture"}}
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
	req.Header.Set("Anthropic-Beta", mcpListingBeta)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatalf("HTTP%d %s", res.StatusCode, raw)
	}
	answer, _ := decodeObject(raw)
	content, _ := historyContent(answer["content"])
	if len(content) == 0 || digest(content[0]) != digest(listing) {
		t.Fatal("MCP listing schema lost numeric precision through CLI")
	}
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "listing next"})
	body["tools"].([]any)[0].(map[string]any)["tools"] = content[0]["tools"]
	cold, _ := newThinkingOutputFixture(t, handler)
	for _, target := range []string{endpoint, cold} {
		req, _ := http.NewRequest("POST", target+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
		req.Header.Set("Anthropic-Beta", mcpListingBeta)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != 200 {
			t.Fatalf("pinned resume HTTP%d %s", res.StatusCode, raw)
		}
	}
}

func TestReviewExactMCPListingSourceIdentity(t *testing.T) {
	source := Object{"type": "mcp_tool_listing", "mcp_server_name": "one", "tools": []any{Object{"name": "remote", "description": "original", "input_schema": Object{"minimum": json.Number("9007199254740993")}}}}
	for _, tamper := range []string{"", "server", "control", "description"} {
		relay := &outboundRelay{}
		observer := &apiTerminalObserver{relay: relay}
		observer.observeExactToolInput(Object{"type": "message_start", "message": Object{"id": "message"}})
		observer.observeExactToolInput(Object{"type": "content_block_start", "index": json.Number("0"), "content_block": source})
		actual, _ := jsonCopyObject(source)
		actual["tools"] = jsNumberView(actual["tools"])
		switch tamper {
		case "server":
			actual["mcp_server_name"] = "other"
		case "control":
			actual["unknown_control"] = true
		case "description":
			actual["tools"].([]any)[0].(map[string]any)["description"] = "changed"
		}
		s := &cliSession{relay: relay, p: &Prepared{}, acc: &Accumulator{Message: Object{"id": "message"}}}
		err := s.restoreExactToolStart(Object{"type": "content_block_start", "index": json.Number("0"), "content_block": actual})
		if tamper != "" {
			if err == nil {
				t.Fatalf("accepted modified listing %s", tamper)
			}
			continue
		}
		if err != nil || digest(actual) != digest(source) {
			t.Fatal("original listing was not restored", err)
		}
	}
}

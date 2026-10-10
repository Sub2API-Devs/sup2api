package engine

import (
	"bytes"
	"compress/gzip"
	"compress/zlib"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/andybalholm/brotli"
	"github.com/klauspost/compress/zstd"
)

func passthroughHeader(betas ...string) http.Header {
	h := http.Header{}
	h.Set(policyHeader, `{"relay_mode":"passthrough"}`)
	if len(betas) > 0 {
		h.Set("anthropic-beta", strings.Join(betas, ","))
	}
	return h
}

// The client's fields reach the Mod exactly as sent; tool_choice is in the
// first round only, with a custom tool under the inner CLI's name.
func TestPassthroughBodies(t *testing.T) {
	body := `{"model":"claude-sonnet-4-6","max_tokens":2048,"temperature":0.30,"top_p":1e-1,"stop_sequences":["</a>"],"service_tier":"standard_only","inference_geo":"us",` +
		`"thinking":{"type":"adaptive","display":"omitted"},"output_config":{"effort":"low","format":{"type":"json_schema","schema":{"type":"object","x-unknown":true}},"task_budget":{"type":"tokens","total":30000}},` +
		`"safeguards":[{"type":"dangerous_tool_use","classifier_context":{"opaque":[1,2]}}],"metadata":{"user_id":"u"},"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":"all"}]},` +
		`"tools":[{"name":"lookup","input_schema":{"type":"object"}}],"tool_choice":{"type":"tool","name":"lookup","disable_parallel_tool_use":true},"messages":[{"role":"user","content":"hi"}]}`
	req, err := parsePolicyRequest([]byte(body), passthroughHeader("task-budgets-2026-03-13", "fixture-beta"))
	if err != nil {
		t.Fatal(err)
	}
	if !req.Passthrough || req.Effort != "low" || strings.Join(req.Betas, ",") != "task-budgets-2026-03-13,fixture-beta" {
		t.Fatalf("request %+v", req)
	}
	cfg, err := req.passthroughBodies()
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{
		"max_tokens": `2048`, "temperature": `0.30`, "top_p": `1e-1`, "stop_sequences": `["</a>"]`, "service_tier": `"standard_only"`, "inference_geo": `"us"`,
		"thinking":      `{"type":"adaptive","display":"omitted"}`,
		"output_config": `{"effort":"low","format":{"type":"json_schema","schema":{"type":"object","x-unknown":true}},"task_budget":{"type":"tokens","total":30000}}`,
		"safeguards":    `[{"type":"dangerous_tool_use","classifier_context":{"opaque":[1,2]}}]`,
	}
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		for name, value := range want {
			if string(round[name]) != value {
				t.Errorf("%s = %s, want %s", name, round[name], value)
			}
		}
		for _, absent := range []string{"metadata", "context_management", "tools", "messages", "model"} {
			if _, exists := round[absent]; exists {
				t.Errorf("%s sent through EXTRA_BODY", absent)
			}
		}
	}
	if got := string(cfg.First["tool_choice"]); got != `{"disable_parallel_tool_use":true,"name":"mcp__ccgateway__lookup","type":"tool"}` {
		t.Errorf("first tool_choice %s", got)
	}
	if _, exists := cfg.Rest["tool_choice"]; exists {
		t.Error("tool_choice in later rounds")
	}
	args := strings.Join(cliArgs(req, &Prepared{SessionID: "00000000-0000-4000-8000-000000000000"}, "mod"), " ")
	if !strings.Contains(args, "--thinking adaptive") || !strings.Contains(args, "--effort low") || strings.Contains(args, "--json-schema") || strings.Contains(args, "--thinking-display") {
		t.Errorf("args %s", args)
	}
	env := cliEnv(req, false)
	if env["CLAUDE_CODE_MAX_RETRIES"] != "0" || env["CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS"] != "1" || env["ANTHROPIC_BETAS"] != "task-budgets-2026-03-13,fixture-beta" || env["ANTHROPIC_CUSTOM_HEADERS"] != "" {
		t.Errorf("env %v", env)
	}
}

// Without thinking or effort the CLI is told the API's defaults instead of
// choosing its own per model.
func TestPassthroughDefaults(t *testing.T) {
	req, err := parsePolicyRequest([]byte(`{"model":"claude-opus-5-5","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}`), passthroughHeader())
	if err != nil {
		t.Fatal(err)
	}
	args := strings.Join(cliArgs(req, &Prepared{SessionID: "00000000-0000-4000-8000-000000000000"}, "mod"), " ")
	if !strings.Contains(args, "--thinking disabled") || !strings.Contains(args, "--effort high") {
		t.Errorf("args %s", args)
	}
	req.upstreamAgent = "a0123456789abcdef"
	if got := cliEnv(req, false)["ANTHROPIC_CUSTOM_HEADERS"]; got != "x-claude-code-agent-id: a0123456789abcdef" {
		t.Errorf("subagent header %q", got)
	}
	cfg, _ := req.passthroughBodies()
	if string(cfg.First["max_tokens"]) != "64" || len(cfg.First) != 1 {
		t.Errorf("fields %v", cfg.First)
	}
}

// What Claude Code cannot express is refused with the reason.
func TestPassthroughRefusals(t *testing.T) {
	for name, body := range map[string]string{
		"prefill":         `{"model":"m","max_tokens":9,"messages":[{"role":"user","content":"a"},{"role":"assistant","content":"b"}]}`,
		"code_execution":  `{"model":"m","max_tokens":9,"tools":[{"type":"code_execution_20250825","name":"code_execution"}],"messages":[{"role":"user","content":"a"}]}`,
		"web_fetch":       `{"model":"m","max_tokens":9,"tools":[{"type":"web_fetch_20250910","name":"web_fetch"}],"messages":[{"role":"user","content":"a"}]}`,
		"text_editor":     `{"model":"m","max_tokens":9,"tools":[{"type":"text_editor_20250728","name":"str_replace_based_edit_tool"}],"messages":[{"role":"user","content":"a"}]}`,
		"mcp_servers":     `{"model":"m","max_tokens":9,"mcp_servers":[],"messages":[{"role":"user","content":"a"}]}`,
		"credit":          `{"model":"m","max_tokens":9,"fallback_credit_token":"x","messages":[{"role":"user","content":"a"}]}`,
		"transformations": `{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="},"transformations":[{"type":"resize","max_dimension":64}]},{"type":"text","text":"a"}]}]}`,
		"server history":  `{"model":"m","max_tokens":9,"messages":[{"role":"user","content":"a"},{"role":"assistant","content":[{"type":"server_tool_use","id":"srvtoolu_1","name":"web_search","input":{"query":"q"}}]},{"role":"user","content":"b"}]}`,
	} {
		if _, err := parsePolicyRequest([]byte(body), passthroughHeader()); err == nil {
			t.Errorf("%s admitted", name)
		}
	}
}

// A pending turn with a base64 image and final text is split; other turns are
// the CLI's input whole.
func TestPassthroughImageSplit(t *testing.T) {
	image := `{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="}}`
	for body, split := range map[string]bool{
		`{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[` + image + `,{"type":"text","text":"a"}]}]}`:                                                              true,
		`{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[{"type":"text","text":"a"},` + image + `]}]}`:                                                              false,
		`{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[{"type":"image","source":{"type":"url","url":"https://example.com/a.png"}},{"type":"text","text":"a"}]}]}`: false,
		`{"model":"m","max_tokens":9,"messages":[{"role":"user","content":[{"type":"text","text":"a"},{"type":"text","text":"b"}]}]}`:                                                 false,
	} {
		req, err := parsePolicyRequest([]byte(body), passthroughHeader())
		if err != nil {
			t.Fatal(err)
		}
		seed, input, ok := req.passthroughImageSplit()
		if ok != split {
			t.Errorf("%s: split %t", body, ok)
		}
		if ok && (len(seed.Content) != 1 || len(input.Content) != 1 || str(input.Content[0], "text") != "a" || len(req.pendingWireMessage().Content) != 1) {
			t.Errorf("%s: seed %v input %v", body, seed, input)
		}
	}
}

// The client sees the request ID and retry hints, never the subscription's
// own limits.
func TestPassthroughClientFacts(t *testing.T) {
	h := http.Header{"Request-Id": {"req_1"}, "Retry-After": {"3"}, "Anthropic-Ratelimit-Unified-5h-Utilization": {"0.4"}, "Anthropic-Ratelimit-Unified-Status": {"allowed"}, "Anthropic-Ratelimit-Tokens-Remaining": {"9"}}
	got := clientFacts(h)
	if got.Get("Request-Id") != "req_1" || got.Get("Retry-After") != "3" || got.Get("Anthropic-Ratelimit-Tokens-Remaining") != "9" || len(got) != 3 {
		t.Fatalf("facts %v", got)
	}
}

// Only errors the API's own fallback chain moves on from release the next
// fallback model.
func TestPassthroughFallbackGate(t *testing.T) {
	for status, allowed := range map[int]bool{429: true, 529: true, 500: true, 400: false, 401: false, 413: false} {
		relay := &outboundRelay{passthrough: true}
		relay.recordUpstream(&upstreamError{Status: status})
		if relay.allowFallback() != allowed || relay.passthroughBlocked() == allowed {
			t.Errorf("HTTP%d: allowed %t", status, !allowed)
		}
	}
	if (&outboundRelay{}).allowFallback() {
		t.Error("fallback without an upstream error")
	}
}

// The API codes errors and streams in whatever the CLI accepts; the relay
// reads them decoded and the CLI receives them uncoded.
func TestPassthroughContentCodings(t *testing.T) {
	official := `{"type":"error","error":{"type":"invalid_request_error","message":"temperature is not supported"}}`
	stream := "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":3}}}\n\n" +
		"event: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\",\"message\":\"Overloaded\"}}\n\n"
	encode := map[string]func([]byte) []byte{
		"gzip": func(b []byte) []byte {
			var out bytes.Buffer
			w := gzip.NewWriter(&out)
			w.Write(b)
			w.Close()
			return out.Bytes()
		},
		"deflate": func(b []byte) []byte {
			var out bytes.Buffer
			w := zlib.NewWriter(&out)
			w.Write(b)
			w.Close()
			return out.Bytes()
		},
		"br": func(b []byte) []byte {
			var out bytes.Buffer
			w := brotli.NewWriter(&out)
			w.Write(b)
			w.Close()
			return out.Bytes()
		},
		"zstd": func(b []byte) []byte {
			w, _ := zstd.NewWriter(nil)
			return w.EncodeAll(b, nil)
		},
	}
	respond := func(status int, contentType, coding string, body []byte) *http.Response {
		request := httptest.NewRequest("POST", "/v1/messages", nil)
		return &http.Response{StatusCode: status, Request: request, ContentLength: int64(len(body)), Body: io.NopCloser(bytes.NewReader(body)),
			Header: http.Header{"Content-Type": {contentType}, "Content-Encoding": {coding}, "Content-Length": {fmt.Sprint(len(body))}, "Request-Id": {"req_1"}}}
	}
	for coding, enc := range encode {
		relay := &outboundRelay{passthrough: true}
		resp := respond(400, "application/json", coding, enc([]byte(official)))
		if err := relay.observePassthrough(resp, &passthroughExchange{model: true}); err != nil {
			t.Fatal(err)
		}
		got, _ := io.ReadAll(resp.Body)
		upstream := relay.UpstreamError()
		if upstream == nil || string(upstream.Body) != official || string(got) != official || upstream.Headers.Get("Content-Encoding") != "" || resp.Header.Get("Content-Encoding") != "" || resp.Header.Get("Content-Length") != "" {
			t.Fatalf("%s error: %+v, CLI read %q", coding, upstream, got)
		}

		relay = &outboundRelay{passthrough: true}
		var events []string
		relay.observeEvent = func(event Object) { events = append(events, str(event, "type")) }
		resp = respond(200, "text/event-stream; charset=utf-8", coding, enc([]byte(stream)))
		if err := relay.observePassthrough(resp, &passthroughExchange{model: true}); err != nil {
			t.Fatal(err)
		}
		got, _ = io.ReadAll(resp.Body)
		if string(got) != stream || strings.Join(events, ",") != "message_start" {
			t.Fatalf("%s stream: events %v, CLI read %q", coding, events, got)
		}
		if upstream := relay.UpstreamError(); upstream == nil || upstream.Status != 529 || !strings.Contains(string(upstream.Body), "Overloaded") {
			t.Fatalf("%s stream error %+v", coding, upstream)
		}
	}

	// A coding the relay does not read reaches the client with its bytes.
	relay := &outboundRelay{passthrough: true}
	if err := relay.observePassthrough(respond(400, "application/json", "compress", []byte("LZW")), &passthroughExchange{model: true}); err != nil {
		t.Fatal(err)
	}
	if upstream := relay.UpstreamError(); string(upstream.Body) != "LZW" || upstream.Headers.Get("Content-Encoding") != "compress" {
		t.Fatalf("unread coding %+v", upstream)
	}
}

// A gateway-issued search result opens; a changed one does not.
func TestWebSearchContentSignature(t *testing.T) {
	content := signWebSearchContent(webSearchPayload{Input: Object{"query": "q"}, Text: "read"})
	payload, ok := openWebSearchContent(content)
	if !ok || payload.Text != "read" || str(payload.Input, "query") != "q" {
		t.Fatalf("payload %+v %t", payload, ok)
	}
	for _, bad := range []string{"provider-opaque", content[:len(content)-2] + "AA", strings.Replace(content, "ccgws1.", "ccgws2.", 1)} {
		if _, ok := openWebSearchContent(bad); ok {
			t.Errorf("%q opened", bad)
		}
	}
}

// Search blocks of client history become WebSearch calls and results, a run
// of parallel searches one round.
func TestNativeWebSearchTurns(t *testing.T) {
	result := func(id, text string) Object {
		return Object{"type": "web_search_tool_result", "tool_use_id": id, "content": []any{Object{"type": "web_search_result", "title": "t", "url": "u", "encrypted_content": signWebSearchContent(webSearchPayload{Input: Object{"query": id}, Text: text})}}}
	}
	use := func(id string) Object {
		return Object{"type": "server_tool_use", "id": id, "name": "web_search", "input": Object{"query": id}}
	}
	turns, err := nativeWebSearchTurns(Message{Role: "assistant", Content: []Object{{"type": "text", "text": "a"}, use("srvtoolu_1"), use("srvtoolu_2"), result("srvtoolu_1", "R1"), result("srvtoolu_2", "R2"), {"type": "text", "text": "b"}}})
	if err != nil {
		t.Fatal(err)
	}
	var shape []string
	for _, turn := range turns {
		var kinds []string
		for _, block := range turn.Content {
			kinds = append(kinds, str(block, "type")+":"+str(block, "id")+str(block, "tool_use_id")+fmt.Sprint(block["content"]))
		}
		shape = append(shape, turn.Role+"["+strings.Join(kinds, ",")+"]")
	}
	want := "assistant[text:<nil>,tool_use:toolu_1<nil>,tool_use:toolu_2<nil>] user[tool_result:toolu_1R1,tool_result:toolu_2R2] assistant[text:<nil>]"
	if strings.Join(shape, " ") != want {
		t.Fatalf("turns %s", strings.Join(shape, " "))
	}
	if _, err := nativeWebSearchTurns(Message{Role: "assistant", Content: []Object{use("srvtoolu_1"), result("srvtoolu_1", "R1")}}); err == nil {
		t.Fatal("a turn ending with a result admitted")
	}
}

// The client's blocks of a search round, and the stream of a whole message.
func TestWebSearchBlocksAndEvents(t *testing.T) {
	plan := &webSearchPlan{records: map[string]*webSearchRecord{"toolu_a": {Input: Object{"query": "q"}, Result: Object{"results": []any{Object{"tool_use_id": "srvtoolu_side", "content": []any{Object{"title": "T", "url": "https://e.com"}}}, "note"}}, Text: "read"}}, usage: Object{"input_tokens": int64(5)}}
	blocks, internal := plan.convertBlocks([]Object{{"type": "text", "text": "x"}, {"type": "tool_use", "id": "toolu_a", "name": "WebSearch", "input": Object{"query": "q"}}}, "tool_use")
	if !internal || len(blocks) != 3 || str(blocks[1], "id") != "srvtoolu_a" || str(blocks[2], "tool_use_id") != "srvtoolu_a" {
		t.Fatalf("blocks %v %t", blocks, internal)
	}
	entry := blocks[2]["content"].([]any)[0].(Object)
	if payload, ok := openWebSearchContent(str(entry, "encrypted_content")); !ok || payload.Text != "read" || str(entry, "title") != "T" {
		t.Fatalf("entry %v", entry)
	}
	if _, internal := plan.convertBlocks([]Object{{"type": "tool_use", "id": "toolu_b", "name": "WebSearch", "input": Object{}}}, "tool_use"); internal {
		t.Fatal("an unanswered search continued")
	}
	usage := plan.webSearchUsage(Object{"input_tokens": json.Number("10"), "output_tokens": json.Number("3")})
	if fmt.Sprint(usage["input_tokens"]) != "15" || fmt.Sprint(usage["server_tool_use"].(Object)["web_search_requests"]) != "1" {
		t.Fatalf("usage %v", usage)
	}
	events := messageEvents(Object{"id": "msg_1", "type": "message", "role": "assistant", "model": "m", "content": blocks, "stop_reason": "end_turn", "stop_sequence": nil, "usage": usage, "safeguard_results": []any{"v"}})
	var kinds []string
	for _, event := range events {
		kinds = append(kinds, str(event, "type"))
	}
	if strings.Join(kinds, ",") != "message_start,content_block_start,content_block_delta,content_block_stop,content_block_start,content_block_delta,content_block_stop,content_block_start,content_block_stop,message_delta" {
		t.Fatalf("events %v", kinds)
	}
	if events[len(events)-1]["safeguard_results"] == nil || events[0]["message"].(Object)["safeguard_results"] != nil {
		t.Fatal("extension in the wrong event")
	}
}

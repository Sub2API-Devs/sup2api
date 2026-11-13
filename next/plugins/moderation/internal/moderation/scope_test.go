package moderation

import (
	"slices"
	"testing"
)

// renderPieces renders pieces as "role:text", an image as "role:image".
func renderPieces(pieces []piece) []string {
	out := make([]string, 0, len(pieces))
	for _, p := range pieces {
		if p.img.raw() != "" {
			out = append(out, p.role+":image")
		} else {
			out = append(out, p.role+":"+p.text)
		}
	}
	return out
}

// scopeCases are a request of every protocol the extractor reads, holding
// each kind of content it has, with the pieces each scope keeps.
var scopeCases = []struct {
	protocol, body    string
	input, tools, all []string
}{
	{protocol: "anthropic.messages", body: `{"system":"SYS","tools":[{"name":"t","description":"TOOLDEF"}],"messages":[
		{"role":"user","content":[{"type":"text","text":"U1"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"AAAA"}},
			{"type":"document","source":{"type":"text","media_type":"text/plain","data":"DOC"}}]},
		{"role":"assistant","content":[{"type":"text","text":"A1"},{"type":"tool_use","id":"x","name":"t","input":{"q":"USE"}}]},
		{"role":"user","content":[{"type":"tool_result","tool_use_id":"x","content":[{"type":"text","text":"RES"},
			{"type":"image","source":{"type":"base64","media_type":"image/png","data":"BBBB"}}]}]}]}`,
		input: []string{"system:SYS", "user:U1", "user:image", "document:DOC"},
		tools: []string{"system:SYS", "user:U1", "user:image", "document:DOC", "tool:RES", "tool:image"},
		all:   []string{"system:SYS", "user:U1", "user:image", "document:DOC", "assistant:A1", "assistant:USE", "tool:RES", "tool:image", "tools:t TOOLDEF"}},
	{protocol: "openai.chat", body: `{"tools":[{"type":"function","function":{"name":"t","description":"TOOLDEF"}}],"messages":[
		{"role":"system","content":"SYS"},{"role":"developer","content":"DEV"},
		{"role":"user","content":[{"type":"text","text":"U1"},{"type":"image_url","image_url":{"url":"data:image/png;base64,AAAA"}}]},
		{"role":"assistant","content":"A1","tool_calls":[{"id":"x","type":"function","function":{"name":"t","arguments":"{\"q\":\"USE\"}"}}]},
		{"role":"tool","tool_call_id":"x","content":"RES"},{"role":"function","name":"f","content":"FRES"}]}`,
		input: []string{"system:SYS", "developer:DEV", "user:U1", "user:image"},
		tools: []string{"system:SYS", "developer:DEV", "user:U1", "user:image", "tool:RES", "tool:FRES"},
		all:   []string{"system:SYS", "developer:DEV", "user:U1", "user:image", "assistant:A1", "assistant:USE", "tool:RES", "tool:FRES", "tools:t TOOLDEF"}},
	{protocol: "openai.responses", body: `{"instructions":"SYS","tools":[{"type":"function","name":"t","description":"TOOLDEF"}],"input":[
		{"role":"developer","content":"DEV"},
		{"role":"user","content":[{"type":"input_text","text":"U1"},{"type":"input_image","image_url":"data:image/png;base64,AAAA"}]},
		{"type":"message","role":"assistant","content":[{"type":"output_text","text":"A1"}]},
		{"type":"function_call","call_id":"x","name":"t","arguments":"{\"q\":\"USE\"}"},
		{"type":"function_call_output","call_id":"x","output":"RES"}]}`,
		input: []string{"system:SYS", "developer:DEV", "user:U1", "user:image"},
		tools: []string{"system:SYS", "developer:DEV", "user:U1", "user:image", "tool:RES"},
		all:   []string{"system:SYS", "developer:DEV", "user:U1", "user:image", "assistant:A1", "assistant:USE", "tool:RES", "tools:t TOOLDEF"}},
	{protocol: "openai.responses_ws", body: `{"type":"response.create","input":[{"role":"user","content":"U1"},
		{"type":"custom_tool_call","call_id":"x","name":"t","input":"USE"},{"type":"custom_tool_call_output","call_id":"x","output":"RES"}]}`,
		input: []string{"user:U1"},
		tools: []string{"user:U1", "tool:RES"},
		all:   []string{"user:U1", "assistant:USE", "tool:RES"}},
	{protocol: "gemini.generate", body: `{"systemInstruction":{"parts":[{"text":"SYS"}]},"tools":[{"functionDeclarations":[{"name":"t","description":"TOOLDEF"}]}],"contents":[
		{"role":"user","parts":[{"text":"U1"},{"inlineData":{"mimeType":"image/png","data":"AAAA"}},{"inlineData":{"mimeType":"text/plain","data":"RE9D"}}]},
		{"role":"model","parts":[{"text":"A1"},{"functionCall":{"name":"t","args":{"q":"USE"}}}]},
		{"role":"function","parts":[{"functionResponse":{"name":"t","response":{"r":"RES"}}}]}]}`,
		input: []string{"system:SYS", "user:U1", "user:image", "document:DOC"},
		tools: []string{"system:SYS", "user:U1", "user:image", "document:DOC", "tool:RES"},
		all:   []string{"system:SYS", "user:U1", "user:image", "document:DOC", "assistant:A1", "assistant:USE", "tool:RES", "tools:t TOOLDEF"}},
	{protocol: "gemini.stream_generate", body: `{"system_instruction":"SYS","contents":[{"parts":[{"text":"U1"}]},
		{"role":"model","parts":[{"executableCode":{"code":"CODE"}}]},{"role":"user","parts":[{"codeExecutionResult":{"output":"OUT"}}]}]}`,
		input: []string{"system:SYS", "user:U1"},
		tools: []string{"system:SYS", "user:U1", "tool:OUT"},
		all:   []string{"system:SYS", "user:U1", "assistant:CODE", "tool:OUT"}},
	// A role the client made up is kept by every scope.
	{protocol: "openai.chat", body: `{"messages":[{"role":"narrator","content":"N"}]}`,
		input: []string{"narrator:N"}, tools: []string{"narrator:N"}, all: []string{"narrator:N"}},
	{protocol: "volcengine.images", body: `{"prompt":"P","image":["data:image/png;base64,AAAA"]}`,
		input: []string{"user:P", "user:image"},
		tools: []string{"user:P", "user:image"},
		all:   []string{"user:P", "user:image"}},
	{protocol: "volcengine.video_submit", body: `{"content":[{"type":"text","text":"P"},{"type":"image_url","image_url":{"url":"data:image/png;base64,AAAA"}}]}`,
		input: []string{"user:P", "user:image"},
		tools: []string{"user:P", "user:image"},
		all:   []string{"user:P", "user:image"}},
}

// Every protocol x every audit scope: exactly the pieces the scope keeps
// (scopeFilter after extractPieces, CONTRACTS §72.4, 0.10.0).
func TestScopeFilterMatrix(t *testing.T) {
	for _, tc := range scopeCases {
		for scope, want := range map[string][]string{ScopeInput: tc.input, ScopeTools: tc.tools, ScopeAll: tc.all} {
			pieces, ok := extractPieces(tc.protocol, hookFields(tc.body))
			if !ok {
				t.Fatalf("%s not moderated", tc.protocol)
			}
			if got := renderPieces(scopeFilter(scope, pieces)); !slices.Equal(got, want) {
				t.Errorf("%s scope %s:\n got %q\nwant %q", tc.protocol, scope, got, want)
			}
		}
	}
}

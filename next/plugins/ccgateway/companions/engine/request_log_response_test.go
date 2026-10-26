package engine

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

// sse is a stream of events, each "name" then its data.
func sse(events ...string) string {
	var b strings.Builder
	for i := 0; i+1 < len(events); i += 2 {
		b.WriteString("event: " + events[i] + "\ndata: " + events[i+1] + "\n\n")
	}
	return b.String()
}

// assembled is the response.json a stream is kept as, decoded, and the
// assembly's facts.
func assembled(t *testing.T, stream string) (Object, assembledResponse) {
	t.Helper()
	// The client's bytes arrive in arbitrary chunks: split them anywhere.
	var chunks [][]byte
	for len(stream) > 0 {
		n := min(7, len(stream))
		chunks = append(chunks, []byte(stream[:n]))
		stream = stream[n:]
	}
	response := assembleResponse(chunks, "text/event-stream; charset=utf-8", "")
	var out Object
	if response.name == responseJSONFile {
		decoder := json.NewDecoder(strings.NewReader(string(response.body)))
		decoder.UseNumber()
		require.NoError(t, decoder.Decode(&out))
	}
	return out, response
}

const sseStart = `{"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","model":"m","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":12,"cache_read_input_tokens":9007199254740993,"output_tokens":1}}}`

func TestSSEAssemblyText(t *testing.T) {
	out, response := assembled(t, ": comment\n\n"+sse(
		"message_start", sseStart,
		"ping", `{"type":"ping"}`,
		"content_block_start", `{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}`,
		"content_block_delta", `{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hel"}}`,
		"content_block_delta", `{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"lo ✓"}}`,
		"content_block_stop", `{"type":"content_block_stop","index":0}`,
		"message_delta", `{"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":5}}`,
		"message_stop", `{"type":"message_stop"}`))
	require.True(t, response.assembled)
	require.Equal(t, 8, response.events)
	require.Equal(t, responseJSONFile, response.name)
	require.Equal(t, []any{map[string]any{"type": "text", "text": "Hello ✓"}}, out["content"])
	require.Equal(t, "end_turn", out["stop_reason"])
	require.Nil(t, out["stop_sequence"])
	require.Equal(t, map[string]any{"input_tokens": json.Number("12"), "cache_read_input_tokens": json.Number("9007199254740993"), "output_tokens": json.Number("5")}, out["usage"])
	require.NotContains(t, out, "ccgateway_incomplete")
	require.NotContains(t, out, "ccgateway_unparsed")
	require.NotContains(t, string(response.body), "9.007", "a number was rounded")
}

func TestSSEAssemblyToolUseThinkingAndCitations(t *testing.T) {
	out, response := assembled(t, sse(
		"message_start", sseStart,
		"content_block_start", `{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"","signature":""}}`,
		"content_block_delta", `{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me "}}`,
		"content_block_delta", `{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"think."}}`,
		"content_block_delta", `{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"EqQBCgIYAhIM"}}`,
		"content_block_stop", `{"type":"content_block_stop","index":0}`,
		"content_block_start", `{"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}`,
		"content_block_delta", `{"type":"content_block_delta","index":1,"delta":{"type":"citations_delta","citation":{"type":"char_location","cited_text":"a","document_index":0,"start_char_index":0,"end_char_index":1}}}`,
		"content_block_delta", `{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"cited"}}`,
		"content_block_stop", `{"type":"content_block_stop","index":1}`,
		"content_block_start", `{"type":"content_block_start","index":2,"content_block":{"type":"tool_use","id":"toolu_1","name":"get_weather","input":{}}}`,
		"content_block_delta", `{"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":""}}`,
		"content_block_delta", `{"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"{\"location\": \"San Fra"}}`,
		"content_block_delta", `{"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"ncisco\", \"days\": 12345678901234567890}"}}`,
		"content_block_stop", `{"type":"content_block_stop","index":2}`,
		"content_block_start", `{"type":"content_block_start","index":3,"content_block":{"type":"tool_use","id":"toolu_2","name":"noop","input":{}}}`,
		"content_block_stop", `{"type":"content_block_stop","index":3}`,
		"message_delta", `{"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":40}}`,
		"message_stop", `{"type":"message_stop"}`))
	require.True(t, response.assembled)
	content := out["content"].([]any)
	require.Len(t, content, 4)
	require.Equal(t, map[string]any{"type": "thinking", "thinking": "Let me think.", "signature": "EqQBCgIYAhIM"}, content[0])
	require.Equal(t, map[string]any{"type": "text", "text": "cited", "citations": []any{map[string]any{"type": "char_location", "cited_text": "a",
		"document_index": json.Number("0"), "start_char_index": json.Number("0"), "end_char_index": json.Number("1")}}}, content[1])
	require.Equal(t, map[string]any{"type": "tool_use", "id": "toolu_1", "name": "get_weather",
		"input": map[string]any{"location": "San Francisco", "days": json.Number("12345678901234567890")}}, content[2])
	require.Equal(t, map[string]any{"type": "tool_use", "id": "toolu_2", "name": "noop", "input": map[string]any{}}, content[3], "a tool call without input keeps its {}")
	require.Equal(t, "tool_use", out["stop_reason"])
}

// An error event after the message started is the message's error; one
// before it is the whole response.
func TestSSEAssemblyErrorEvents(t *testing.T) {
	out, response := assembled(t, sse(
		"message_start", sseStart,
		"content_block_start", `{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}`,
		"content_block_delta", `{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"par"}}`,
		"error", `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}`))
	require.True(t, response.assembled)
	require.Equal(t, map[string]any{"type": "overloaded_error", "message": "Overloaded"}, out["error"])
	require.Equal(t, []any{map[string]any{"type": "text", "text": "par"}}, out["content"], "the block cut off keeps what arrived")
	require.Equal(t, true, out["ccgateway_incomplete"])

	out, response = assembled(t, sse("error", `{"type":"error","error":{"type":"api_error","message":"boom"}}`))
	require.True(t, response.assembled)
	require.Equal(t, Object{"type": "error", "error": map[string]any{"type": "api_error", "message": "boom"}}, out)
}

// A stream cut off keeps what arrived: a block's text and an input whose JSON
// was not finished, which is kept unparsed.
func TestSSEAssemblyTruncatedStream(t *testing.T) {
	stream := sse(
		"message_start", sseStart,
		"content_block_start", `{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"f","input":{}}}`,
		"content_block_delta", `{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"a\": 1"}}`) +
		"event: content_block_delta\ndata: {\"type\":\"content_bl"
	out, response := assembled(t, stream)
	require.True(t, response.assembled)
	require.Equal(t, 3, response.events, "an event cut off is not one")
	require.Equal(t, true, out["ccgateway_incomplete"])
	block := out["content"].([]any)[0].(map[string]any)
	require.Equal(t, map[string]any{}, block["input"])
	require.Equal(t, []any{map[string]any{"type": "input_json_delta", "partial_json": `{"a": 1`}}, block["ccgateway_unparsed"])
}

// What the assembly cannot place is kept as it came.
func TestSSEAssemblyKeepsUnknownEvents(t *testing.T) {
	out, response := assembled(t, sse(
		"message_start", sseStart,
		"content_block_start", `{"type":"content_block_start","index":0,"content_block":{"type":"server_tool_use","id":"srvtoolu_1","name":"web_search","input":{"query":"q"}}}`,
		"content_block_delta", `{"type":"content_block_delta","index":0,"delta":{"type":"future_delta","value":1}}`,
		"content_block_stop", `{"type":"content_block_stop","index":0}`,
		"content_block_delta", `{"type":"content_block_delta","index":5,"delta":{"type":"text_delta","text":"orphan"}}`,
		"future_event", `{"type":"future_event","x":true}`,
		"message_delta", `{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2},"context_management":{"applied":[]}}`,
		"message_stop", `{"type":"message_stop"}`))
	require.True(t, response.assembled)
	block := out["content"].([]any)[0].(map[string]any)
	require.Equal(t, map[string]any{"query": "q"}, block["input"], "a block without deltas is kept as it started")
	require.Equal(t, []any{map[string]any{"type": "future_delta", "value": json.Number("1")}}, block["ccgateway_unparsed"])
	unparsed := out["ccgateway_unparsed"].([]any)
	require.Len(t, unparsed, 3)
	require.Equal(t, "content_block_delta", unparsed[0].(map[string]any)["event"])
	require.Equal(t, "future_event", unparsed[1].(map[string]any)["event"])
	require.Equal(t, "message_delta", unparsed[2].(map[string]any)["event"])
	require.Equal(t, "end_turn", out["stop_reason"], "the known part of an event is still merged")
}

// A stream that cannot be read is kept as its raw bytes.
func TestSSEAssemblyFallsBackToRawBytes(t *testing.T) {
	for _, stream := range []string{
		sse("message_start", sseStart, "content_block_start", `{"type":"content_block_start",`),
		sse("ping", `{"type":"ping"}`),
		"not an event stream at all",
	} {
		_, response := assembled(t, stream)
		require.False(t, response.assembled, stream)
		require.Equal(t, responseBodyFile, response.name)
		require.Equal(t, stream, string(response.body), "the raw bytes are kept as they came")
	}
}

func TestResponseAssemblyByContentType(t *testing.T) {
	body := `{"id":"msg_1","type":"message","content":[{"type":"text","text":"x"}],"usage":{"input_tokens":1}}`
	response := assembleResponse([][]byte{[]byte(body[:10]), []byte(body[10:])}, "application/json", "")
	require.True(t, response.assembled)
	require.Equal(t, responseJSONFile, response.name)
	require.Equal(t, body, string(response.body), "a JSON answer is kept byte for byte")
	require.False(t, response.stream)

	response = assembleResponse([][]byte{[]byte(`{"broken":`)}, "application/json", "")
	require.False(t, response.assembled)
	require.Equal(t, responseBodyFile, response.name)

	response = assembleResponse([][]byte{[]byte("plain")}, "text/plain", "")
	require.Equal(t, responseBodyFile, response.name)
	require.Equal(t, "plain", string(response.body))

	response = assembleResponse([][]byte{[]byte(sse("message_start", sseStart, "message_stop", `{}`))}, "text/event-stream", "gzip")
	require.Equal(t, responseBodyFile, response.name, "an encoded stream is not read")
}

package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeToolHistoryRetainsAdmittedNumericInputs(t *testing.T) {
	for _, number := range []string{"9007199254740993", "-9007199254740993", "0.100000000000000000001", "1e309", "-0"} {
		t.Run(number, func(t *testing.T) {
			raw := []byte(`{"model":"m","max_tokens":128,"tools":[{"name":"lookup","input_schema":{"type":"object"}}],"messages":[{"role":"user","content":"original text"},{"role":"assistant","content":[{"type":"tool_use","id":"call","name":"lookup","input":{"nested":[` + number + `,"9007199254740993"]}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"call","content":"done"}]}]}`)
			r, err := parsePolicyRequest(raw, nil)
			require.NoError(t, err)
			assert.Equal(t, raw, r.Plan.RawRequest())
			input := r.Messages[1].Content[0]["input"].(Object)
			assert.Equal(t, []any{json.Number(number), "9007199254740993"}, input["nested"])
			wire := r.cliWireMessage(r.Messages[1])
			assert.Equal(t, input, wire.Content[0]["input"])
			assert.Equal(t, "mcp__ccgateway__lookup", wire.Content[0]["name"])
		})
	}
}

func TestNativeToolEventsKeepObservedRawFields(t *testing.T) {
	for _, number := range []string{"9007199254740993", "0.12345678901234567890123456789", "1e309", "-0"} {
		for _, delta := range []bool{false, true} {
			r := plannedRequest(t, Object{"tools": []any{Object{"name": "lookup", "input_schema": Object{"type": "object"}}}})
			s := &cliSession{req: r, responseReq: r, p: &Prepared{}, initialized: true, acc: &Accumulator{}, cfg: &runConfig{control: &modControl{ready: true, attached: true}}, emit: func(Object) error { return nil }}
			push := func(raw string) {
				event, err := decodeObject([]byte(raw))
				require.NoError(t, err)
				require.NoError(t, s.onStreamEvent(Object{"type": "stream_event", "event": event}))
			}
			push(`{"type":"message_start","message":{"id":"message","role":"assistant","content":[],"usage":{"input_tokens":1,"output_tokens":0}}}`)
			input := `{"value":` + number + `,"literal":"9007199254740993"}`
			initial := input
			if delta {
				initial = `{}`
			}
			push(`{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"call","name":"mcp__ccgateway__lookup","caller":{"type":"direct"},"input":` + initial + `}}`)
			if delta {
				part, err := json.Marshal(input)
				require.NoError(t, err)
				push(`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":` + string(part) + `}}`)
			}
			push(`{"type":"content_block_stop","index":0}`)
			require.Len(t, s.acc.Blocks, 1)
			block := s.acc.Blocks[0]
			assert.Equal(t, "call", block["id"])
			assert.Equal(t, "lookup", block["name"])
			assert.Equal(t, Object{"type": "direct"}, block["caller"])
			assert.Equal(t, Object{"value": json.Number(number), "literal": "9007199254740993"}, block["input"])
		}
	}
}

func TestExactToolHistoryFingerprintsDoNotCollapseJSNumbers(t *testing.T) {
	a := []Message{{Role: "assistant", Content: []Object{{"type": "tool_use", "id": "same", "name": "lookup", "input": Object{"x": json.Number("9007199254740992")}}}}}
	b := []Message{{Role: "assistant", Content: []Object{{"type": "tool_use", "id": "same", "name": "lookup", "input": Object{"x": json.Number("9007199254740993")}}}}}
	require.Equal(t, digest(jsNumberView(a[0].Content[0]["input"])), digest(jsNumberView(b[0].Content[0]["input"])))
	assert.NotEqual(t, fingerprints(a)[0], fingerprints(b)[0])
}

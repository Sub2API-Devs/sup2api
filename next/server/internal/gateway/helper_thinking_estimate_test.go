package gateway

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

func helperThinkingEstimateSSE() []byte {
	frames := []string{
		`{"type":"message_start","message":{"id":"message","type":"message","role":"assistant","model":"` + testModel + `","content":[],"usage":{"input_tokens":2,"output_tokens":0,"cache_read_input_tokens":883,"cache_creation_input_tokens":1585,"cache_creation":{"ephemeral_1h_input_tokens":1585,"ephemeral_5m_input_tokens":0}}}}`,
		`{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"initial-","signature":"old"}}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"a","estimated_tokens":null}}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"b","estimated_tokens":4096}}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"final"}}`,
		`{"type":"content_block_stop","index":0}`,
		`{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":66}}`,
		`{"type":"message_stop"}`,
	}
	var out bytes.Buffer
	for _, frame := range frames {
		var e struct{ Type string }
		json.Unmarshal([]byte(frame), &e)
		fmt.Fprintf(&out, "event: %s\ndata: %s\n\n", e.Type, frame)
	}
	return out.Bytes()
}

func TestHelperThinkingEstimateRefusalRemainsProvider200(t *testing.T) {
	e, s, calls := helperHTTPFixture(t, "thinking_refusal")
	request := helperRequestBody()
	request["stream"] = true
	response := e.messages(request)
	want := strings.ReplaceAll(string(helperThinkingEstimateSSE()), "end_turn", "refusal")
	if response.status != 200 || string(response.body) != want || calls.Load() != 1 {
		t.Fatal("provider refusal changed", response.status)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.commits != 1 || len(s.usage) != 1 || s.usage[0].Tokens.Output != 66 {
		t.Fatal("refusal custody or usage lost")
	}
}

func TestHelperThinkingEstimateSSEHistoryAndAccounting(t *testing.T) {
	e, s, calls := helperHTTPFixture(t, "thinking_estimates")
	request := helperRequestBody()
	request["stream"] = true
	response := e.messages(request)
	if response.status != 200 || !bytes.Equal(response.body, helperThinkingEstimateSSE()) {
		t.Fatalf("SSE changed or rejected: %d", response.status)
	}
	requestRaw, _ := json.Marshal(request)
	messages, _, err := publicHelperPrefixes(requestRaw)
	if err != nil {
		t.Fatal(err)
	}
	expected := []byte(`{"id":"message","type":"message","role":"assistant","content":[{"type":"thinking","thinking":"initial-ab","signature":"final"}],"stop_reason":"end_turn"}`)
	prefix, err := helperDeliveredPrefix(messages, expected, false)
	if err != nil {
		t.Fatal(err)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if calls.Load() != 1 || s.commits != 1 || len(s.records) != 1 || len(s.usage) != 1 {
		t.Fatal("missing or duplicate custody/usage")
	}
	if _, ok := s.records[prefix]; !ok {
		t.Fatal("display estimate entered persisted public identity")
	}
	usage := s.usage[0]
	if !usage.Success || usage.Tokens.Input != 2 || usage.Tokens.Output != 66 || usage.Tokens.CacheRead != 883 || usage.Tokens.CacheCreation1h != 1585 {
		t.Fatalf("billing changed: %+v", usage.Tokens)
	}
	select {
	case <-e.settler.ch:
		t.Fatal("duplicate ordinary settlement")
	default:
	}
}

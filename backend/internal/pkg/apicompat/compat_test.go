package apicompat_test

import (
	"encoding/json"
	codec "github.com/Sub2API-Devs/sup2api/next/protocol-codec"
	legacy "github.com/Wei-Shaw/sub2api/internal/pkg/apicompat"
	"reflect"
	"testing"
)

func TestLegacyFacadeUsesSharedTypesAndBehavior(t *testing.T) {
	request := &legacy.ResponsesRequest{Model: "claude-opus-5-5", Input: json.RawMessage(`"hello"`)}
	var shared *codec.ResponsesRequest = request
	old, err := legacy.ResponsesToAnthropicRequest(request)
	if err != nil {
		t.Fatal(err)
	}
	current, err := codec.ResponsesToAnthropicRequest(shared)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(old, current) {
		t.Fatal("legacy facade differs from shared codec")
	}
	if old.MaxTokens != 8192 || old.Thinking.Type != "adaptive" || old.OutputConfig.Effort != "medium" {
		t.Fatal("legacy defaults changed during extraction")
	}
	var accumulator *codec.BufferedResponseAccumulator = legacy.NewBufferedResponseAccumulator()
	accumulator.ProcessEvent(&legacy.ResponsesStreamEvent{Type: "response.output_text.delta", Delta: "hello"})
	if !accumulator.HasContent() {
		t.Fatal("type alias lost shared accumulator methods")
	}
}

func TestLegacyFacadePreservesVariadicToolMapping(t *testing.T) {
	input := map[string]any{"model": "test", "input": "hello"}
	_, _, err := legacy.AdaptResponsesClientToolsWithInheritedMapping(input, legacy.ResponsesClientToolMapping{}, []any{}, []any{})
	if err != nil {
		t.Fatal(err)
	}
}

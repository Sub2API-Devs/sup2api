package engine

import "testing"

func TestIndependentSearchUsageMultiplePublicDeltas(t *testing.T) {
	total := Object{}
	if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 24, "output_tokens": 91, "cache_creation_input_tokens": 1647, "cache_creation": Object{"ephemeral_1h_input_tokens": 1647}}}); err != nil {
		t.Fatal(err)
	}
	a := &Accumulator{Message: Object{"usage": Object{"input_tokens": 10, "output_tokens": 0, "cache_creation_input_tokens": 0}}}
	for _, event := range []Object{
		{"type": "message_delta", "delta": Object{}, "usage": Object{"output_tokens": 1}},
		{"type": "message_delta", "delta": Object{"stop_reason": "end_turn"}, "usage": Object{"output_tokens": 2}},
	} {
		if err := mergeSearchUsage(event, total, a.Message); err != nil {
			t.Fatal(err)
		}
		if err := a.messageDelta(event); err != nil {
			t.Fatal(err)
		}
	}
	usage := a.Message["usage"].(Object)
	cache, _ := usage["cache_creation"].(Object)
	if tokenCount(usage["input_tokens"]) != 34 || tokenCount(usage["output_tokens"]) != 93 || tokenCount(usage["cache_creation_input_tokens"]) != 1647 || tokenCount(cache["ephemeral_1h_input_tokens"]) != 1647 {
		t.Fatalf("hidden usage counted again on later final-call delta: %v", usage)
	}
}

func TestIndependentSearchUsageFinalCategoriesRemainCategorical(t *testing.T) {
	total := Object{}
	if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 24, "output_tokens": 0, "service_tier": "standard", "inference_geo": "us"}}); err != nil {
		t.Fatal(err)
	}
	initial := Object{"input_tokens": 10, "service_tier": "standard", "inference_geo": "us", "server_tool_use": Object{"web_search_requests": 3}}
	event := Object{"usage": Object{"output_tokens": 2}}
	if err := mergeSearchUsage(event, total, Object{"usage": initial}); err != nil {
		t.Fatal(err)
	}
	a := &Accumulator{Message: Object{"usage": initial}}
	event["delta"] = Object{"stop_reason": "end_turn"}
	if err := a.messageDelta(event); err != nil {
		t.Fatal(err)
	}
	usage := a.Message["usage"].(Object)
	if usage["service_tier"] != "standard" || usage["inference_geo"] != "us" || tokenCount(usage["server_tool_use"].(Object)["web_search_requests"]) != 3 {
		t.Fatal("final public categorical/tool facts altered")
	}
}

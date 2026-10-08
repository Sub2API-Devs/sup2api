package engine

import "testing"

func TestReviewHelperSearchPreservesCacheCreationDurations(t *testing.T) {
	total := Object{}
	if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 24, "output_tokens": 91, "cache_creation_input_tokens": 1647, "cache_creation": Object{"ephemeral_1h_input_tokens": 1647, "ephemeral_5m_input_tokens": 0}}}); err != nil {
		t.Fatal(err)
	}
	current := Object{"usage": Object{"input_tokens": 20, "output_tokens": 0, "cache_creation_input_tokens": 11, "cache_creation": Object{"ephemeral_1h_input_tokens": 0, "ephemeral_5m_input_tokens": 11}}}
	event := Object{"usage": Object{"output_tokens": 8}}
	if err := mergeSearchUsage(event, total, current); err != nil {
		t.Fatal(err)
	}
	usage := event["usage"].(map[string]any)
	cache, _ := usage["cache_creation"].(map[string]any)
	if tokenCount(cache["ephemeral_1h_input_tokens"]) != 1647 || tokenCount(cache["ephemeral_5m_input_tokens"]) != 11 || tokenCount(usage["cache_creation_input_tokens"]) != 1658 {
		t.Fatalf("hidden cache duration accounting lost: %#v", usage)
	}
}

func TestReviewHelperSearchDoesNotInferUnknownCacheDuration(t *testing.T) {
	total := Object{}
	if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "cache_creation_input_tokens": 17}}); err != nil {
		t.Fatal(err)
	}
	event := Object{"usage": Object{"output_tokens": 1}}
	if err := mergeSearchUsage(event, total, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "cache_creation_input_tokens": 3}}); err != nil {
		t.Fatal(err)
	}
	usage := event["usage"].(map[string]any)
	if tokenCount(usage["cache_creation_input_tokens"]) != 20 {
		t.Fatal("total cache count changed")
	}
	if _, exists := usage["cache_creation"]; exists {
		t.Fatal("missing duration was invented")
	}
}

func TestReviewHelperSearchDurationDeltaIsNotAddedToInitialTwice(t *testing.T) {
	total := Object{}
	if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "cache_creation_input_tokens": 7, "cache_creation": Object{"ephemeral_1h_input_tokens": 7}}}); err != nil {
		t.Fatal(err)
	}
	event := Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "cache_creation_input_tokens": 13, "cache_creation": Object{"ephemeral_1h_input_tokens": 4, "ephemeral_5m_input_tokens": 9, "future_class": "original-final-value"}}}
	if err := mergeSearchUsage(event, total, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "cache_creation_input_tokens": 13, "cache_creation": Object{"ephemeral_1h_input_tokens": 4, "ephemeral_5m_input_tokens": 9}}}); err != nil {
		t.Fatal(err)
	}
	usage := event["usage"].(map[string]any)
	cache, _ := usage["cache_creation"].(map[string]any)
	if tokenCount(cache["ephemeral_1h_input_tokens"]) != 11 || tokenCount(cache["ephemeral_5m_input_tokens"]) != 9 || cache["future_class"] != "original-final-value" {
		t.Fatalf("delta duration or opaque field changed: %#v", cache)
	}
}

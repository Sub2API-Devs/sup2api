package usageobserver

import "testing"

func TestObserverExtractsSplitSSECumulativeUsage(t *testing.T) {
	observer := New("text/event-stream; charset=utf-8")
	observer.Write([]byte("event: message_delta\ndata: {\"usage\":{\"input_tokens\":10,\"output_to"))
	observer.Write([]byte("kens\":3,\"cache_read_input_tokens\":4}}\n\n"))
	observer.Write([]byte("data: {\"response\":{\"usage\":{\"output_tokens\":8,\"reasoning_tokens\":2}}}\n\n"))
	usage := observer.Finalize()
	if usage.InputTokens != 10 || usage.OutputTokens != 8 || usage.CacheReadTokens != 4 || usage.ReasoningTokens != 2 {
		t.Fatalf("usage = %+v", usage)
	}
}

func TestObserverExtractsNestedJSONProviderVariants(t *testing.T) {
	observer := New("application/json")
	observer.Write([]byte(`{"usage":{"prompt_tokens":12,"completion_tokens":5,"prompt_tokens_details":{"cached_tokens":7}},"usageMetadata":{"thoughtsTokenCount":3}}`))
	usage := observer.Finalize()
	if usage.InputTokens != 12 || usage.OutputTokens != 5 || usage.CacheReadTokens != 7 || usage.ReasoningTokens != 3 {
		t.Fatalf("usage = %+v", usage)
	}
}

func TestObserverExtractsCacheCreationTTLBreakdown(t *testing.T) {
	observer := New("text/event-stream")
	observer.Write([]byte("data: {\"usage\":{\"cache_creation_input_tokens\":20,\"cache_creation\":{\"ephemeral_5m_input_tokens\":12,\"ephemeral_1h_input_tokens\":8}}}\n\n"))
	observer.Write([]byte("data: {\"usage\":{\"cache_creation_5m_input_tokens\":14,\"cache_creation_1h_input_tokens\":9}}\n\n"))
	usage := observer.Finalize()
	if usage.CacheCreationTokens != 20 || usage.CacheCreation5mTokens != 14 || usage.CacheCreation1hTokens != 9 {
		t.Fatalf("usage = %+v", usage)
	}
}

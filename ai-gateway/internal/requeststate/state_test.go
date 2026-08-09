package requeststate

import "testing"

func TestUsageRecordMetadataNormalization(t *testing.T) {
	state := new(State)
	state.SetUsageRecordMetadata(" FAST ", "x-high")
	if state.ServiceTier != "priority" || state.ReasoningEffort != "xhigh" {
		t.Fatalf("metadata tier=%q effort=%q", state.ServiceTier, state.ReasoningEffort)
	}
	state.SetUsageRecordMetadata("turbo", "extreme")
	if state.ServiceTier != "" || state.ReasoningEffort != "" {
		t.Fatalf("unsupported metadata was retained: tier=%q effort=%q", state.ServiceTier, state.ReasoningEffort)
	}
}

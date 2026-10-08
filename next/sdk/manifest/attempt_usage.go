package manifest

// AttemptUsageRule selects a versioned, host-owned meter for protocols whose
// final counters cover only one attempt. It is not a plugin billing callback.
type AttemptUsageRule struct {
	Name       string   `json:"name"`
	Adapter    string   `json:"adapter"`
	RequiredBy []string `json:"requiredBy"`
}

const AttemptAdapterAnthropicFallback = "anthropic_fallback_20260701"

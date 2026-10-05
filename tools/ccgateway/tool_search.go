package main

func isInternalSearch(message Object) bool {
	blocks, _ := message["content"].([]Object)
	for _, b := range blocks {
		if str(b, "type") == "tool_use" && str(b, "name") == "ToolSearch" {
			return true
		}
	}
	return false
}
func addSearchUsage(total Object, message Object) {
	usage, _ := message["usage"].(map[string]any)
	for _, key := range []string{"input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"} {
		total[key] = tokenCount(total[key]) + tokenCount(usage[key])
	}
}
func tokenCount(value any) int {
	if n, ok := value.(int); ok {
		return n
	}
	if n, ok := value.(float64); ok && n >= 0 && n <= 1<<31-1 && n == float64(int(n)) {
		return int(n)
	}
	return positive(value)
}
func mergeSearchUsage(event Object, total Object, current Object) {
	usage, _ := event["usage"].(map[string]any)
	initial, _ := current["usage"].(map[string]any)
	if usage == nil {
		usage = Object{}
	}
	// message_start carries the final call's input counters; add previous calls
	// to those counters after this delta is merged by the accumulator.
	for _, key := range []string{"input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"} {
		value, present := usage[key]
		if !present {
			value = initial[key]
		}
		usage[key] = tokenCount(value) + tokenCount(total[key])
	}
	event["usage"] = usage
}

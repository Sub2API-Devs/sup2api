package engine

import "fmt"

func isInternalSearch(message Object) bool {
	blocks, _ := message["content"].([]Object)
	for _, b := range blocks {
		if str(b, "type") == "tool_use" && str(b, "name") == "ToolSearch" {
			return true
		}
	}
	return false
}
func addSearchUsage(total Object, message Object) error {
	usage, _ := message["usage"].(map[string]any)
	if !searchUsageInteger(usage["input_tokens"]) || !searchUsageInteger(usage["output_tokens"]) {
		return fmt.Errorf("hidden usage lacks required input/output counters")
	}
	if _, present := message["usage"]; present && usage == nil {
		return fmt.Errorf("invalid hidden usage object")
	}
	if err := validateSearchUsage(usage, true); err != nil {
		return err
	}
	if err := addSearchCategories(total, usage); err != nil {
		return err
	}
	for _, key := range []string{"input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"} {
		if value, exists := usage[key]; exists && value == nil {
			if tokenCount(total[key]) != 0 {
				return fmt.Errorf("cannot aggregate unknown cache usage %s", key)
			}
			total["_null_"+key] = true
			continue
		}
		if total["_null_"+key] == true && tokenCount(usage[key]) != 0 {
			return fmt.Errorf("cannot aggregate unknown cache usage %s", key)
		}
		total[key] = tokenCount(total[key]) + tokenCount(usage[key])
	}
	cache, _ := usage["cache_creation"].(map[string]any)
	for _, key := range searchCacheLifetimeCounters {
		value, present := cache[key]
		if !present {
			continue
		}
		accumulated, _ := total["cache_creation"].(map[string]any)
		if accumulated == nil {
			accumulated = Object{}
			total["cache_creation"] = accumulated
		}
		accumulated[key] = tokenCount(accumulated[key]) + tokenCount(value)
	}
	if err := addSearchServerCounters(total, usage); err != nil {
		return err
	}
	mergeSearchCounterGroup(total, total, Object{"output_tokens_details": usage["output_tokens_details"]}, "output_tokens_details", []string{"thinking_tokens"})
	if iterations, ok := usage["iterations"].([]any); ok {
		previous, _ := total["iterations"].([]any)
		total["iterations"] = append(previous, iterations...)
	}
	return nil
}

var searchCacheLifetimeCounters = [...]string{"ephemeral_5m_input_tokens", "ephemeral_1h_input_tokens"}

func tokenCount(value any) int {
	if n, ok := value.(int); ok {
		return n
	}
	if n, ok := value.(float64); ok && n >= 0 && n <= 1<<31-1 && n == float64(int(n)) {
		return int(n)
	}
	return positive(value)
}
func mergeSearchUsage(event Object, total Object, current Object) error {
	usage, _ := event["usage"].(map[string]any)
	if _, present := event["usage"]; present && usage == nil {
		return fmt.Errorf("invalid public delta usage object")
	}
	initial, _ := total["_public_usage"].(Object)
	if initial == nil {
		initial, _ = current["usage"].(Object)
		if _, present := current["usage"]; present && initial == nil {
			return fmt.Errorf("invalid public start usage object")
		}
	}
	initial = copySearchUsage(initial)
	overlaySearchUsage(initial, usage)
	if !searchUsageInteger(initial["input_tokens"]) || !searchUsageInteger(initial["output_tokens"]) {
		return fmt.Errorf("public usage lacks required input/output counters")
	}
	if err := validateSearchUsage(initial, false); err != nil {
		return err
	}
	total["_public_usage"] = copySearchUsage(initial)
	if err := verifySearchCategories(total, initial); err != nil {
		return err
	}
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
		_, reported := initial[key]
		if total["_null_"+key] == true || reported && value == nil {
			if tokenCount(value) != 0 || tokenCount(total[key]) != 0 {
				return fmt.Errorf("cannot aggregate unknown cache usage %s", key)
			}
			usage[key] = nil
			continue
		}
		usage[key] = tokenCount(value) + tokenCount(total[key])
	}
	mergeSearchCacheLifetimes(usage, initial, total)
	mergeSearchCounterGroup(usage, initial, total, "server_tool_use", searchServerCounters)
	mergeSearchCounterGroup(usage, initial, total, "output_tokens_details", []string{"thinking_tokens"})
	if hidden, ok := total["iterations"].([]any); ok {
		last, _ := initial["iterations"].([]any)
		usage["iterations"] = append(append([]any(nil), hidden...), last...)
	}
	event["usage"] = usage
	return nil
}

// A delta's current-call fact replaces its start fact. Prior hidden calls are
// added once; an absent lifetime is never inferred from the aggregate counter.
func mergeSearchCacheLifetimes(usage, initial, total Object) {
	mergeSearchCounterGroup(usage, initial, total, "cache_creation", searchCacheLifetimeCounters[:])
}

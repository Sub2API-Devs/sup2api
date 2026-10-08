package engine

import (
	"encoding/json"
	"fmt"
	"strconv"
)

var searchServerCounters = []string{"web_search_requests", "web_fetch_requests", "code_execution_requests"}
var searchUsageCategories = []string{"service_tier", "inference_geo", "speed"}

func mergeHiddenSearchCurrentUsage(event, current Object) error {
	initial, _ := current["usage"].(Object)
	if _, present := current["usage"]; present && initial == nil {
		return fmt.Errorf("invalid hidden start usage")
	}
	delta, _ := event["usage"].(Object)
	if _, ok := event["usage"]; ok && delta == nil {
		return fmt.Errorf("invalid hidden delta usage")
	}
	merged := copySearchUsage(initial)
	overlaySearchUsage(merged, delta)
	if err := validateSearchUsage(merged, true); err != nil {
		return err
	}
	event["usage"] = merged
	return nil
}

func overlaySearchUsage(target, delta Object) {
	for key, value := range delta {
		if key == "cache_creation" || key == "server_tool_use" || key == "output_tokens_details" {
			patch, ok := value.(Object)
			if ok {
				previous, _ := target[key].(Object)
				if previous == nil {
					previous = Object{}
					target[key] = previous
				}
				for field, v := range patch {
					previous[field] = v
				}
				continue
			}
		}
		target[key] = value
	}
}

func copySearchUsage(source Object) Object {
	out := Object{}
	for key, value := range source {
		if nested, ok := value.(Object); ok {
			child := Object{}
			for k, v := range nested {
				child[k] = v
			}
			out[key] = child
		} else {
			out[key] = value
		}
	}
	return out
}

func addSearchCategories(total, usage Object) error {
	for _, key := range searchUsageCategories {
		value, present := usage[key]
		present = present && value != nil
		if present {
			if v, ok := value.(string); !ok || v == "" {
				return fmt.Errorf("invalid usage category %s", key)
			}
		}
		prior, known := total[key]
		if present && known && prior != value {
			return fmt.Errorf("hidden call usage category %s conflicts", key)
		}
		if !present {
			total["_missing_"+key] = true
		} else {
			total[key] = value
		}
	}
	return nil
}

// Missing is unknown, not evidence of equality. If any call reports a category,
// a single public categorical value is valid only when every call reports it.
func verifySearchCategories(total, current Object) error {
	for _, key := range searchUsageCategories {
		hidden, h := total[key]
		actual, a := current[key]
		a = a && actual != nil
		if a {
			if v, ok := actual.(string); !ok || v == "" {
				return fmt.Errorf("invalid usage category %s", key)
			}
		}
		if !h && !a {
			continue
		}
		if !h || !a || total["_missing_"+key] == true || hidden != actual {
			return fmt.Errorf("cannot aggregate incomplete or conflicting usage category %s", key)
		}
	}
	return nil
}

func validateSearchUsage(usage Object, hidden bool) error {
	if hidden && keys(usage, "input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "cache_creation", "server_tool_use", "output_tokens_details", "iterations", "service_tier", "inference_geo", "speed") != nil {
		return fmt.Errorf("unknown hidden usage cannot be aggregated")
	}
	for _, key := range []string{"input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"} {
		if value, ok := usage[key]; ok {
			if value == nil && (key == "cache_read_input_tokens" || key == "cache_creation_input_tokens") {
				continue
			}
			if !searchUsageInteger(value) {
				return fmt.Errorf("invalid usage counter %s", key)
			}
		}
	}
	for group, known := range map[string][]string{"cache_creation": searchCacheLifetimeCounters[:], "server_tool_use": searchServerCounters, "output_tokens_details": {"thinking_tokens"}} {
		raw, exists := usage[group]
		if !exists || raw == nil {
			continue
		}
		fields, ok := raw.(Object)
		if !ok {
			return fmt.Errorf("invalid usage group %s", group)
		}
		if hidden && keys(fields, known...) != nil {
			return fmt.Errorf("unknown hidden usage group %s", group)
		}
		for _, key := range known {
			if v, ok := fields[key]; ok && !searchUsageInteger(v) {
				return fmt.Errorf("invalid usage counter %s.%s", group, key)
			}
		}
	}
	if raw, ok := usage["iterations"]; ok && raw != nil {
		if _, ok := raw.([]any); !ok {
			return fmt.Errorf("invalid usage iterations")
		}
	}
	return nil
}

func searchUsageInteger(value any) bool {
	var text string
	switch v := value.(type) {
	case int:
		return v >= 0 && v <= 1<<31-1
	case float64:
		return v >= 0 && v <= 1<<31-1 && v == float64(int(v))
	case json.Number:
		text = v.String()
	default:
		return false
	}
	v, err := strconv.ParseInt(text, 10, 32)
	return err == nil && v >= 0
}

func addSearchServerCounters(total, usage Object) error {
	value, _ := usage["server_tool_use"].(Object)
	if value == nil {
		return nil
	}
	if err := keys(value, searchServerCounters...); err != nil {
		return fmt.Errorf("unknown hidden server-tool usage cannot be aggregated")
	}
	acc, _ := total["server_tool_use"].(Object)
	if acc == nil {
		acc = Object{}
		total["server_tool_use"] = acc
	}
	for key, v := range value {
		acc[key] = tokenCount(acc[key]) + tokenCount(v)
	}
	return nil
}

func mergeSearchCounterGroup(usage, initial, total Object, group string, keys []string) {
	start, _ := initial[group].(Object)
	delta, _ := usage[group].(Object)
	hidden, _ := total[group].(Object)
	if start == nil && delta == nil && hidden == nil {
		return
	}
	merged := Object{}
	for key, value := range start {
		merged[key] = value
	}
	for key, value := range delta {
		merged[key] = value
	}
	for _, key := range keys {
		if value, ok := hidden[key]; ok {
			merged[key] = tokenCount(merged[key]) + tokenCount(value)
		}
	}
	usage[group] = merged
}

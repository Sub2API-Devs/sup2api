package usagerules

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/tidwall/gjson"
	"math"
	"strings"
)

func cloneAttemptFacts(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := map[string]any{}
	for k, v := range in {
		out[k] = v
	}
	return out
}
func extractAttemptFacts(rules map[string]manifest.UsageFact, body []byte) map[string]any {
	out := map[string]any{}
	for key, rule := range rules {
		if rule.Path == "" {
			continue
		}
		value := gjson.GetBytes(body, strings.TrimSpace(rule.Path))
		if strings.Contains(rule.Path, "+") {
			if rule.Type != "number" {
				continue
			}
			sum, ok := attemptFactSum(body, rule.Path)
			if ok {
				out[key] = sum
			}
			continue
		}
		if !value.Exists() || value.Type == gjson.Null {
			continue
		}
		validType := rule.Type == "number" && value.Type == gjson.Number || rule.Type == "boolean" && (value.Type == gjson.True || value.Type == gjson.False) || rule.Type == "enum" && value.Type == gjson.String
		if !validType {
			continue
		}
		raw := value.Raw
		if value.Type == gjson.String {
			raw = value.Str
		}
		fact, ok := Fact(rule, raw)
		if !ok {
			continue
		}
		if n, ok := fact.(float64); ok && (math.IsNaN(n) || math.IsInf(n, 0)) {
			continue
		}
		out[key] = fact
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
func attemptFactSum(body []byte, path string) (float64, bool) {
	sum := float64(0)
	found := false
	for _, part := range strings.Split(path, "+") {
		v := gjson.GetBytes(body, strings.TrimSpace(part))
		if !v.Exists() || v.Type == gjson.Null {
			continue
		}
		if v.Type != gjson.Number {
			return 0, false
		}
		n := v.Float()
		if math.IsNaN(n) || math.IsInf(n, 0) {
			return 0, false
		}
		sum += n
		found = true
	}
	return sum, found && !math.IsNaN(sum) && !math.IsInf(sum, 0)
}

package usagerules

import (
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
	"strconv"
	"strings"
	"unicode/utf8"
)

func mergeUsageSnapshot(before, after gjson.Result) gjson.Result {
	if !after.Exists() {
		return before
	}
	if !after.IsObject() {
		return after
	}
	m := map[string]json.RawMessage{}
	if before.IsObject() {
		before.ForEach(func(k, v gjson.Result) bool { m[k.Str] = json.RawMessage(v.Raw); return true })
	}
	after.ForEach(func(k, v gjson.Result) bool { m[k.Str] = json.RawMessage(v.Raw); return true })
	raw, _ := json.Marshal(m)
	return gjson.ParseBytes(raw)
}

type attemptGroup struct {
	model      string
	start, end int
}

func (m *attemptMeter) anthropicFallback(kind, primary string) ([]core.AttemptUsage, error) {
	if !m.usage.IsObject() || m.reason == "" {
		return nil, fmt.Errorf("attempt response lacks usage/stop reason")
	}
	if len(m.boundaries) > 3 {
		return nil, fmt.Errorf("too many fallback transitions")
	}
	array := m.usage.Get("iterations")
	var entries []gjson.Result
	if array.Exists() && array.Type != gjson.Null {
		if !array.IsArray() || len(array.Array()) > 128 {
			return nil, fmt.Errorf("invalid attempt usage snapshot")
		}
		entries = array.Array()
	}
	var selected []gjson.Result
	for _, entry := range entries {
		switch entry.Get("type").Str {
		case "message", "fallback_message":
			selected = append(selected, entry)
		case "advisor_message": // Independently metered by Additional rules.
		case "compaction":
			return nil, fmt.Errorf("fallback compaction lacks an admitted per-attempt metering contract")
		default:
			return nil, fmt.Errorf("unknown iteration type in attempt usage")
		}
	}
	if len(selected) == 0 {
		if len(m.boundaries) > 0 || m.model != primary {
			return nil, fmt.Errorf("fallback served without per-attempt usage")
		}
		// No model handoff: a normal single primary completion may omit iterations.
		tokens, err := attemptTokens(m.usage)
		if err != nil {
			return nil, err
		}
		item := core.AttemptUsage{Kind: kind, Model: primary, UsageSemantics: "exclusive", Tokens: tokens, BillingReason: "completed_attempt"}
		if m.reason == "refusal" {
			if err = refusalDisposition(&item, m.details); err != nil {
				return nil, err
			}
		}
		return []core.AttemptUsage{item}, nil
	}
	items := make([]core.AttemptUsage, 0, len(selected))
	groups := []attemptGroup{}
	fallbackSeen := false
	for i, entry := range selected {
		model := entry.Get("model")
		if !model.Exists() || model.Type == gjson.Null {
			if len(m.boundaries) == 0 && !hasFallbackTerminal(selected) {
				model = gjson.Result{Type: gjson.String, Str: primary}
			}
		}
		if model.Type != gjson.String || model.Str == "" || len(model.Str) > 256 || !utf8.ValidString(model.Str) || strings.ContainsAny(model.Str, "\r\n\x00") {
			return nil, fmt.Errorf("missing or invalid attempt model")
		}
		tokens, err := attemptTokens(entry)
		if err != nil {
			return nil, err
		}
		items = append(items, core.AttemptUsage{Kind: kind, Model: model.Str, UsageSemantics: "exclusive", Tokens: tokens, BillingReason: "completed_attempt"})
		if len(groups) == 0 || groups[len(groups)-1].model != model.Str {
			for _, g := range groups {
				if g.model == model.Str {
					return nil, fmt.Errorf("fallback model reappeared in attempt chain")
				}
			}
			groups = append(groups, attemptGroup{model.Str, i, i})
		} else {
			groups[len(groups)-1].end = i
		}
		if entry.Get("type").Str == "fallback_message" {
			if fallbackSeen || i != len(selected)-1 {
				return nil, fmt.Errorf("fallback terminal must be final sampling iteration")
			}
			fallbackSeen = true
		}
	}
	if len(groups) > 4 || len(m.boundaries) != len(groups)-1 {
		return nil, fmt.Errorf("fallback transition/usage groups disagree")
	}
	if len(groups) > 1 && !fallbackSeen {
		return nil, fmt.Errorf("fallback response lacks terminal iteration")
	}
	if !fallbackSeen && groups[0].model != primary {
		return nil, fmt.Errorf("nonfallback attempt changed primary model")
	}
	for i, b := range m.boundaries {
		if b.Get("from.model").Str != groups[i].model || b.Get("to.model").Str != groups[i+1].model {
			return nil, fmt.Errorf("fallback transition identities do not match attempts")
		}
		if err := refusalDisposition(&items[groups[i].end], b.Get("trigger")); err != nil {
			return nil, err
		}
	}
	if m.reason == "refusal" {
		if err := refusalDisposition(&items[len(items)-1], m.details); err != nil {
			return nil, err
		}
	}
	// A streamed start can retain the primary model after a mid-output handoff.
	// The final usage identity, validated against boundaries above, is authoritative.
	if m.model == "" || m.model != groups[0].model && m.model != items[len(items)-1].Model {
		return nil, fmt.Errorf("response model conflicts with attempts")
	}
	return items, nil
}
func hasFallbackTerminal(entries []gjson.Result) bool {
	for _, e := range entries {
		if e.Get("type").Str == "fallback_message" {
			return true
		}
	}
	return false
}
func attemptTokens(v gjson.Result) (core.UsageTokens, error) {
	fields := []string{"input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "cache_creation.ephemeral_1h_input_tokens"}
	values := make([]int64, len(fields))
	for i, path := range fields {
		value := v.Get(path)
		if !value.Exists() || value.Type == gjson.Null {
			if i < 2 {
				return core.UsageTokens{}, fmt.Errorf("missing attempt token counter")
			}
			continue
		}
		n, e := strconv.ParseInt(value.Raw, 10, 64)
		if value.Type != gjson.Number || e != nil || n < 0 || n > 1e12 {
			return core.UsageTokens{}, fmt.Errorf("invalid attempt token counter")
		}
		values[i] = n
	}
	if values[4] > values[3] {
		return core.UsageTokens{}, fmt.Errorf("attempt cache subdivision exceeds total")
	}
	return Tokens(values[0], values[1], values[2], values[3], values[4]), nil
}
func refusalDisposition(item *core.AttemptUsage, details gjson.Result) error {
	if item.Tokens.Output > 0 {
		item.BillingReason = "refusal_after_output"
		return nil
	}
	if !details.IsObject() || details.Get("type").Str != "refusal" {
		return fmt.Errorf("zero-output refusal lacks classification evidence")
	}
	category := details.Get("category")
	if !category.Exists() {
		return fmt.Errorf("zero-output refusal lacks category")
	}
	if category.Type == gjson.Null {
		item.Free = true
		item.BillingReason = "refusal_before_output_unclassified"
		return nil
	}
	if category.Type != gjson.String {
		return fmt.Errorf("invalid refusal category")
	}
	switch category.Str {
	case "bio", "frontier_llm", "reasoning_extraction":
		item.BillingReason = "refusal_before_output_billed_" + category.Str
	case "cyber", "general_harms":
		item.Free = true
		item.BillingReason = "refusal_before_output_free_" + category.Str
	default:
		return fmt.Errorf("unknown refusal billing category")
	}
	return nil
}

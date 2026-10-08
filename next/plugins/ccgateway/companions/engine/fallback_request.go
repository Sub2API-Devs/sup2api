package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

func (p *RequestPlan) takeFallbacks(o Object) error {
	value, exists := o["fallbacks"]
	if !exists {
		return nil
	}
	entries, ok := value.([]any)
	if !ok || len(entries) < 1 || len(entries) > 3 {
		return fmt.Errorf("fallbacks requires one to three explicit model entries; default routing needs a separate authorization contract")
	}
	seen := map[string]bool{str(o, "model"): true}
	for i, value := range entries {
		entry, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("fallbacks[%d] must be an object", i)
		}
		if err := keys(entry, "model", "max_tokens", "thinking", "output_config", "speed"); err != nil {
			return err
		}
		model := str(entry, "model")
		if model == "" || len(model) > 200 || strings.TrimSpace(model) != model || strings.ContainsAny(model, "\r\n\x00") || seen[model] {
			return fmt.Errorf("fallbacks models must be distinct, nonempty model identifiers")
		}
		seen[model] = true
		if value, ok := entry["max_tokens"]; ok && value != nil {
			n, ok := value.(json.Number)
			count, err := n.Int64()
			if !ok || err != nil || count < 1 || count > 2147483647 {
				return fmt.Errorf("fallback max_tokens must be a positive integer or null")
			}
		}
	}
	p.fallbacks, _ = json.Marshal(entries)
	p.fields["fallbacks"] = append(json.RawMessage(nil), p.fallbacks...)
	delete(o, "fallbacks")
	return nil
}
func (r *Request) hasFallbacks() bool { return r.Plan != nil && len(r.Plan.fallbacks) > 0 }
func (r *Request) fallbackJSON() bool { return (r.hasFallbacks() || r.credit != nil) && !r.Stream }
func (r *Request) configureFallbacks(h http.Header) error {
	if !r.hasFallbacks() {
		return nil
	}
	if !hasBetaHeader(h.Values("anthropic-beta"), "server-side-fallback-2026-06-01") && !hasBetaHeader(h.Values("anthropic-beta"), "server-side-fallback-2026-07-01") {
		return fmt.Errorf("explicit fallbacks require server-side-fallback-2026-06-01 or 2026-07-01")
	}
	for _, header := range h.Values("anthropic-beta") {
		for _, b := range strings.Split(header, ",") {
			b = strings.TrimSpace(b)
			if strings.HasPrefix(b, "server-side-fallback-") && b != "server-side-fallback-2026-06-01" && b != "server-side-fallback-2026-07-01" {
				return fmt.Errorf("unsupported server-side-fallback beta version")
			}
		}
	}
	if r.CacheWarmup || r.CountTokens || r.toolSearchEnabled() || r.structuredOutput() {
		return fmt.Errorf("fallback chain requires a single Messages generation; warmup/count/internal CLI rounds are not interchangeable")
	}
	original, err := decodeObject(r.Plan.raw)
	if err != nil {
		return err
	}
	if original["compaction"] != nil {
		return fmt.Errorf("fallbacks with compaction requires per-attempt compaction model attribution for billing")
	}
	if context, ok := original["context_management"].(map[string]any); ok {
		if edits, ok := context["edits"].([]any); ok {
			for _, value := range edits {
				edit, _ := value.(map[string]any)
				if strings.HasPrefix(str(edit, "type"), "compact_") {
					return fmt.Errorf("fallbacks with context compaction requires per-attempt compaction model attribution for billing")
				}
			}
		}
	}
	delete(original, "fallbacks")
	var entries []json.RawMessage
	if err = json.Unmarshal(r.Plan.fallbacks, &entries); err != nil {
		return err
	}
	for i, raw := range entries {
		entry, err := decodeObject(raw)
		if err != nil {
			return err
		}
		effective := Object{}
		for k, v := range original {
			effective[k] = v
		}
		for k, v := range entry {
			if v == nil { // Preserve null in the outgoing override; local checks do not invent a null policy.
				if k != "model" {
					delete(effective, k)
				}
				continue
			}
			effective[k] = v
		}
		// The nullable token override cannot remove the carrier's required primary limit.
		if effective["max_tokens"] == nil {
			effective["max_tokens"] = original["max_tokens"]
		}
		body, _ := json.Marshal(effective)
		if _, err = parsePolicyRequest(body, h); err != nil {
			return fmt.Errorf("fallbacks[%d] effective request: %w", i, err)
		}
	}
	return nil
}

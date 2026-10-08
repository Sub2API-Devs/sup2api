package usagerules

import (
	"strconv"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
)

func cacheCounter(v gjson.Result) core.CacheCounter {
	if !v.Exists() {
		return core.CacheCounter{State: "absent"}
	}
	if v.Type == gjson.Null {
		return core.CacheCounter{State: "null"}
	}
	n, err := strconv.ParseInt(v.Raw, 10, 64)
	if v.Type != gjson.Number || err != nil || n < 0 {
		return core.CacheCounter{State: "invalid"}
	}
	return core.CacheCounter{State: "value", Value: &n}
}

func cacheEvidence(usage gjson.Result, source string, before *core.CacheWriteEvidence) *core.CacheWriteEvidence {
	if !usage.IsObject() {
		return before
	}
	fields := []gjson.Result{usage.Get("cache_creation_input_tokens"), usage.Get("cache_creation.ephemeral_5m_input_tokens"), usage.Get("cache_creation.ephemeral_1h_input_tokens")}
	parent := usage.Get("cache_creation")
	if parent.Exists() && !parent.IsObject() {
		if parent.Type != gjson.Null {
			parent = gjson.Result{Type: gjson.String, Raw: `"invalid"`, Str: "invalid"}
		}
		fields[1], fields[2] = parent, parent
	}
	if before == nil && !fields[0].Exists() && !fields[1].Exists() && !fields[2].Exists() {
		return nil
	}
	e := core.CacheWriteEvidence{Version: 1, Total: core.CacheCounter{State: "absent"}, Explicit5m: core.CacheCounter{State: "absent"}, Explicit1h: core.CacheCounter{State: "absent"}, Source: source, PricingPolicy: "platform_default_cache_write_compat"}
	if before != nil {
		e = before.Clone()
		e.Source = source
	}
	counts := []*core.CacheCounter{&e.Total, &e.Explicit5m, &e.Explicit1h}
	for i, f := range fields {
		if f.Exists() {
			*counts[i] = cacheCounter(f)
		}
	}
	e.Completeness = "unknown"
	e.UnclassifiedTokens = nil
	if before != nil && before.Completeness == "inconsistent" && !fields[0].Exists() && !fields[1].Exists() && !fields[2].Exists() {
		e.Completeness = "inconsistent"
		return &e
	}
	for _, c := range counts {
		if c.State == "invalid" {
			e.Completeness = "inconsistent"
			return &e
		}
	}
	if before != nil && before.Total.Value != nil && e.Total.Value != nil && *e.Total.Value < *before.Total.Value {
		e.Completeness = "inconsistent"
		return &e
	}
	if e.Total.Value == nil {
		return &e
	}
	left := *e.Total.Value
	for _, c := range counts[1:] {
		if c.Value != nil {
			if *c.Value > left {
				e.Completeness = "inconsistent"
				return &e
			}
			left -= *c.Value
		}
	}
	e.UnclassifiedTokens = &left
	e.Completeness = "partial"
	if left == 0 && e.Explicit5m.State == "value" && e.Explicit1h.State == "value" {
		e.Completeness = "complete"
	}
	return &e
}

// Only the exact Anthropic cache mapping can opt in. Unrelated providers and
// arbitrary plugin fact names cannot be interpreted as Anthropic TTL fields.
func cacheUsagePath(mapping map[string]string) string {
	p := mapping[manifest.UsageCacheCreationTokens]
	if !strings.HasSuffix(p, "cache_creation_input_tokens") {
		return ""
	}
	base := strings.TrimSuffix(p, "cache_creation_input_tokens")
	if mapping[manifest.UsageCacheCreation1h] != base+"cache_creation.ephemeral_1h_input_tokens" {
		return ""
	}
	if base != "usage." && base != "message.usage." && base != "" {
		return ""
	}
	return strings.TrimSuffix(base, ".")
}

func (u *Acc) observeCacheEvidence(body []byte, mapping map[string]string, source string) {
	path := cacheUsagePath(mapping)
	if path == "" {
		return
	}
	u.cacheEvidence = cacheEvidence(gjson.GetBytes(body, path), source, u.cacheEvidence)
	if u.cacheEvidence == nil {
		return
	}
	if u.Metrics == nil {
		u.Metrics = map[string]any{}
	}
	u.Metrics[core.CacheWriteEvidenceKey] = u.cacheEvidence.Clone()
}

func iterationCacheMetrics(entry gjson.Result) map[string]any {
	e := cacheEvidence(entry, "iteration", nil)
	if e == nil {
		return nil
	}
	return map[string]any{core.CacheWriteEvidenceKey: *e}
}

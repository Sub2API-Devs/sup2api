package gateway

import "github.com/Sub2API-Devs/sup2api/next/server/internal/core"

func preserveHostCacheEvidence(before, after map[string]any) map[string]any {
	// The report cannot create the reserved key even without a host observation.
	v := core.CloneUsageMetrics(before)[core.CacheWriteEvidenceKey]
	delete(after, core.CacheWriteEvidenceKey)
	switch v.(type) {
	case core.CacheWriteEvidence, map[string]any:
	default:
		return after
	}
	if after == nil {
		after = map[string]any{}
	}
	after[core.CacheWriteEvidenceKey] = v
	return after
}

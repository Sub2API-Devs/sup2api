package check

import "github.com/Sub2API-Devs/sup2api/next/sdk/manifest"

func (v *validator) attemptUsageRule(field string, r *manifest.AttemptUsageRule) {
	if r == nil {
		return
	}
	if !usageEventRe.MatchString(r.Name) {
		v.add(field+".name", "invalid", "a bounded attempt meter name is required")
	}
	if r.Adapter != manifest.AttemptAdapterAnthropicFallback {
		v.add(field+".adapter", "unsupported", "unknown attempt usage adapter")
	}
	if len(r.RequiredBy) == 0 || len(r.RequiredBy) > 8 {
		v.add(field+".requiredBy", "invalid", "one to eight activation paths required")
	}
	seen := map[string]bool{}
	for _, p := range r.RequiredBy {
		if len(p) > 200 || !modelObjectPath.MatchString(p) || seen[p] {
			v.add(field+".requiredBy", "invalid", "unique simple object paths required")
		}
		seen[p] = true
	}
}

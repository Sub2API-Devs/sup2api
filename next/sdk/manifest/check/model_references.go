package check

import (
	"fmt"
	"regexp"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

var modelObjectPath = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$`)

func (v *validator) modelReferences(f string, p manifest.Platform, e manifest.Endpoint) {
	refs := e.Request.ModelReferences
	if len(refs) == 0 {
		return
	}
	field := f + ".request.modelReferences"
	if len(refs) > 8 {
		v.add(field, "too_many", "at most 8 model reference rules are supported")
	}
	if e.Kind != manifest.EndpointKindProxy || e.Task != nil || e.PluginUsage() {
		v.add(field, "conflict", "model references require a synchronous proxy with declarative usage")
	}
	u := p.Usage
	if e.Usage != nil {
		u = *e.Usage
	}
	seen := map[string]bool{}
	for i, ref := range refs {
		at := fmt.Sprintf("%s[%d]", field, i)
		if !usageEventRe.MatchString(ref.Name) || seen[ref.Name] {
			v.add(at+".name", "invalid", "model reference name must be unique and nonempty")
		}
		seen[ref.Name] = true
		for key, path := range map[string]string{"arrayPath": ref.ArrayPath, "modelPath": ref.ModelPath} {
			if len(path) > 200 || !modelObjectPath.MatchString(path) {
				v.add(at+"."+key, "invalid", "a simple object path is required")
			}
		}
		if len(ref.Match) > 8 {
			v.add(at+".match", "too_many", "at most 8 exact match fields are supported")
		}
		if len(ref.ParameterOverrides) > 8 {
			v.add(at+".parameterOverrides", "too_many", "at most 8 parameter overrides are supported")
		}
		overrides := map[string]bool{}
		for _, path := range ref.ParameterOverrides {
			if len(path) > 200 || !modelObjectPath.MatchString(path) || overrides[path] {
				v.add(at+".parameterOverrides", "invalid", "unique simple parameter paths are required")
			}
			overrides[path] = true
		}
		for key, value := range ref.Match {
			if len(key) > 200 || !modelObjectPath.MatchString(key) || value == "" || len(value) > 200 {
				v.add(at+".match", "invalid", "match requires simple paths and nonempty strings up to 200 bytes")
			}
		}
		if e.Billing != "free" && !hasReferencedUsageRule(u, ref.Name) {
			v.add(at+".name", "missing_usage", "model reference requires an additional or attempt usage rule with the same name")
		}
	}
}

func hasReferencedUsageRule(u manifest.UsageRules, name string) bool {
	if u.Attempts != nil && u.Attempts.Name == name {
		return true
	}
	for _, r := range u.Additional {
		if r.Name == name {
			return true
		}
	}
	return false
}

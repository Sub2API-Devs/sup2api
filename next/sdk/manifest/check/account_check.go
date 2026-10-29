package check

import (
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
)

// credentialsScopeOwn is the only accepted scope of accounts.credentials:
// the plugin reads credentials of its own account types (ARCHITECTURE 6.6).
var credentialsScopeOwn = map[string]any{"types": "own"}

func (v *validator) accountLifecycle(field string, at manifest.AccountType) {
	if lifecycle := at.Lifecycle; lifecycle != nil {
		v.needCap(field+".lifecycle", manifest.CapAccountLifecycle)
		if lifecycle.Required && !lifecycle.Preparation {
			v.add(field+".lifecycle.required", "invalid", "required needs preparation")
		}
		seen := map[string]bool{}
		for _, action := range lifecycle.Actions {
			if !accountTypeIDRe.MatchString(action.ID) || seen[action.ID] || strings.TrimSpace(action.Label["en"]) == "" {
				v.add(field+".lifecycle.actions", "invalid", "actions need unique identifiers and English labels")
			}
			seen[action.ID] = true
		}
		if d := lifecycle.Deletion; d != nil && (d.RetentionDays < 1 || d.RetentionDays > manifest.MaxRetentionDays) {
			v.add(field+".lifecycle.deletion.retentionDays", "invalid", "retention must be 1 to %d days", manifest.MaxRetentionDays)
		}
	}
	if len(at.ExtensionsSchema) == 0 {
		return
	}
	var schema map[string]any
	if len(at.ExtensionsSchema) > 65536 || json.Unmarshal(at.ExtensionsSchema, &schema) != nil || schema["type"] != "object" || schema["additionalProperties"] != false {
		v.add(field+".extensionsSchema", "invalid", "extensions schema must be a bounded, closed object schema")
		return
	}
	properties, ok := schema["properties"].(map[string]any)
	if !ok || len(properties) > 64 {
		v.add(field+".extensionsSchema.properties", "invalid", "at most 64 extension fields are allowed")
		return
	}
	reserved := []string{"id", "name", "plugin_key", "type", "status", "schedulable", "auto_disable", "priority", "weight", "max_concurrency", "rpm_limit", "tpm_limit", "proxy_id", "proxy_url", "models", "model_mapping", "credentials", "created_by", "group_ids", "status_reason", "auto_disabled_until", "created_at", "updated_at", "preparation_key", "lifecycle_sync"}
	for name := range properties {
		if slices.Contains(reserved, name) || slices.Contains(at.SensitiveFields, name) || slices.Contains(at.SettingsFields, name) {
			v.add(field+".extensionsSchema.properties."+name, "conflict", "extensions cannot duplicate core, credential or existing settings fields")
		}
	}
	pending := []any{schema}
	for len(pending) > 0 {
		node := pending[len(pending)-1]
		pending = pending[:len(pending)-1]
		switch node := node.(type) {
		case map[string]any:
			for key, value := range node {
				if key == "$ref" || key == "$dynamicRef" || key == "$recursiveRef" {
					ref, ok := value.(string)
					if !ok || !strings.HasPrefix(ref, "#") {
						v.add(field+".extensionsSchema", "invalid", "external schema references are not allowed")
					}
				}
				pending = append(pending, value)
			}
		case []any:
			pending = append(pending, node...)
		}
	}
}

// accountTypes validates the top-level accountTypes (ARCHITECTURE 6.6).
func (v *validator) accountTypes() {
	ats := v.m.AccountTypes
	if len(ats) == 0 {
		return
	}
	v.needCap("accountTypes", manifest.CapPlatformAdapter)
	v.needPerm("accountTypes", "platform.register", "account types")
	v.needPerm("accountTypes", "accounts.credentials", "account types")
	ownPlatforms := map[string]*manifest.Platform{}
	for i := range v.m.Platforms {
		ownPlatforms[v.m.Platforms[i].ID] = &v.m.Platforms[i]
	}
	ids := map[string]bool{}
	for i, at := range ats {
		f := fmt.Sprintf("accountTypes[%d]", i)
		if !accountTypeIDRe.MatchString(at.ID) {
			v.add(f+".id", "invalid_format", "account type id %q must match %s", at.ID, accountTypeIDRe.String())
		} else if ids[at.ID] {
			v.add(f+".id", "duplicate", "account type %q declared twice", at.ID)
		}
		ids[at.ID] = true
		if strings.TrimSpace(at.Label["en"]) == "" {
			v.add(f+".label", "required", "label.en is required")
		}
		if at.Icon != "" && !strings.HasPrefix(at.Icon, "text:") {
			v.needFile(f+".icon", at.Icon)
		}
		v.form(f+".form", at.Form, false)
		v.guardedSettings(f, at)
		v.accountLifecycle(f, at)
		v.defaultModels(f, at)
		v.defaultLimits(f+".defaultLimits", at.DefaultLimits)
		for _, name := range sortedKeys(at.CommonControls) {
			if name != "auto_disable" && name != "schedulable" {
				v.add(f+".commonControls."+name, "unsupported", "unknown common account control %q", name)
			}
		}
		v.quota(f, at.Quota)
		v.balance(f, at.Balance)
		v.refresh(f, at)
		if len(at.Platforms) == 0 {
			v.add(f+".platforms", "required", "at least one platform is required")
		}
		seen := map[string]bool{}
		for j, ap := range at.Platforms {
			v.accountPlatform(fmt.Sprintf("%s.platforms[%d]", f, j), ap, seen, ownPlatforms)
		}
	}
}

// accountPlatform validates one accountTypes[].platforms entry: the platform
// reference, its endpoint subset and the per-protocol usage overrides.
// seen collects the platform ids already used by this account type.
func (v *validator) accountPlatform(pf string, ap manifest.AccountPlatform, seen map[string]bool, ownPlatforms map[string]*manifest.Platform) {
	switch {
	case ap.Platform == "":
		v.add(pf+".platform", "required", "platform is required")
	case !keyRe.MatchString(ap.Platform):
		v.add(pf+".platform", "invalid_format", "platform id %q must match %s", ap.Platform, keyRe.String())
	case seen[ap.Platform]:
		v.add(pf+".platform", "duplicate", "platform %q listed twice", ap.Platform)
	}
	seen[ap.Platform] = true
	own := ownPlatforms[ap.Platform]
	v.accountEndpoints(pf, ap, own)
	for _, proto := range sortedKeys(ap.Usage) {
		uf := pf + ".usage." + proto
		if own != nil {
			if !slices.Contains(own.Protocols(), proto) {
				v.add(uf, "unknown_protocol", "protocol %q is not a protocol of platform %q", proto, ap.Platform)
			}
		} else if !strings.HasPrefix(proto, ap.Platform+".") {
			v.add(uf, "unknown_protocol", "protocol %q does not belong to platform %q", proto, ap.Platform)
		}
		v.usageRules(uf, ap.Usage[proto], ownerAccountType, protocolPluginUsage(own, proto))
	}
}

func (v *validator) accountEndpoints(field string, ap manifest.AccountPlatform, own *manifest.Platform) {
	if ap.Endpoints == nil {
		return
	}
	if len(ap.Endpoints) == 0 {
		v.add(field+".endpoints", "required", "at least one endpoint is required when endpoints is specified")
	}
	p := own
	for _, builtin := range platforms.Builtin() {
		if builtin.ID == ap.Platform {
			p = &builtin
		}
	}
	for _, other := range v.opt.OtherPlatforms {
		if other.ID == ap.Platform {
			p = &manifest.Platform{ID: other.ID, Endpoints: other.Endpoints}
		}
	}
	if p == nil && !v.opt.Tooling {
		v.add(field+".endpoints", "unknown_platform", "platform %q must be installed to validate endpoint references", ap.Platform)
	}
	seen := map[string]bool{}
	for i, id := range ap.Endpoints {
		f := fmt.Sprintf("%s.endpoints[%d]", field, i)
		switch {
		case strings.TrimSpace(id) == "":
			v.add(f, "required", "endpoint id is required")
		case seen[id]:
			v.add(f, "duplicate", "endpoint %q listed twice", id)
		case p != nil && !slices.ContainsFunc(p.Endpoints, func(e manifest.Endpoint) bool { return e.ID == id }):
			v.add(f, "unknown_endpoint", "endpoint %q does not belong to platform %q", id, ap.Platform)
		}
		seen[id] = true
	}
}

// guardedSettings validates accountTypes[].guardedSettings (CONTRACTS §21.3):
// each field is a distinct settings field of the same account type and its
// allowed list holds at least one absolute http(s) URL.
func (v *validator) guardedSettings(f string, at manifest.AccountType) {
	seen := map[string]bool{}
	for i, gs := range at.GuardedSettings {
		gf := fmt.Sprintf("%s.guardedSettings[%d]", f, i)
		switch {
		case gs.Field == "":
			v.add(gf+".field", "required", "field is required")
		case !slices.Contains(at.SettingsFields, gs.Field):
			v.add(gf+".field", "unknown_field", "field %q is not in settingsFields of account type %q", gs.Field, at.ID)
		case seen[gs.Field]:
			v.add(gf+".field", "duplicate", "field %q is guarded twice", gs.Field)
		}
		seen[gs.Field] = true
		if len(gs.Allowed) == 0 {
			v.add(gf+".allowed", "required", "allowed must list at least one URL")
		}
		for j, raw := range gs.Allowed {
			if !isAbsoluteHTTPURL(raw) {
				v.add(fmt.Sprintf("%s.allowed[%d]", gf, j), "invalid_url", "%q is not an absolute http(s) URL", raw)
			}
		}
	}
}

// defaultLimits validates accountTypes[].defaultLimits (CONTRACTS §68.5)
// with the ranges of the account fields they prefill.
func (v *validator) defaultLimits(f string, d *manifest.AccountDefaultLimits) {
	if d == nil {
		return
	}
	bad := func(field string, value, lo, hi int64) {
		if value < lo || value > hi {
			v.add(f+"."+field, "invalid", "%s must be %d-%d", field, lo, hi)
		}
	}
	if d.Priority != nil {
		bad("priority", int64(*d.Priority), 0, 1_000_000)
	}
	if d.Weight != nil {
		bad("weight", int64(*d.Weight), 1, 1000)
	}
	if d.MaxConcurrency != nil {
		bad("maxConcurrency", int64(*d.MaxConcurrency), 0, 100_000)
	}
	if d.RPMLimit != nil {
		bad("rpmLimit", int64(*d.RPMLimit), 0, 10_000_000)
	}
	if d.TPMLimit != nil {
		bad("tpmLimit", *d.TPMLimit, 0, 1_000_000_000_000)
	}
	if len(d.ModelLimits) > manifest.MaxDefaultModelLimits {
		v.add(f+".modelLimits", "too_many", "at most %d model lists", manifest.MaxDefaultModelLimits)
	}
	owner := map[string]bool{}
	for i, l := range d.ModelLimits {
		lf := fmt.Sprintf("%s.modelLimits[%d]", f, i)
		if len(l.Models) == 0 {
			v.add(lf+".models", "required", "a model list needs at least one model")
		}
		if len(l.Models) > manifest.MaxDefaultModels {
			v.add(lf+".models", "too_many", "at most %d models per list", manifest.MaxDefaultModels)
		}
		for j, m := range l.Models {
			mf := fmt.Sprintf("%s.models[%d]", lf, j)
			switch {
			case !manifest.ValidModelID(m):
				v.add(mf, "invalid", "%q is not a complete model id", m)
			case owner[m]:
				v.add(mf, "duplicate", "model %q is in more than one list", m)
			}
			owner[m] = true
		}
		bad(fmt.Sprintf("modelLimits[%d].maxConcurrency", i), int64(l.MaxConcurrency), 0, 100_000)
		bad(fmt.Sprintf("modelLimits[%d].rpmLimit", i), int64(l.RPMLimit), 0, 10_000_000)
		bad(fmt.Sprintf("modelLimits[%d].tpmLimit", i), l.TPMLimit, 0, 1_000_000_000_000)
	}
}

// defaultModels validates accountTypes[].defaultModels and
// defaultModelMapping (CONTRACTS §41) with the rules the core applies to the
// account fields they prefill: complete model ids, no duplicates, at most
// manifest.MaxDefaultModels each. A mapping key missing from a non-empty
// defaultModels is rejected too: the account would never be scheduled for it.
func (v *validator) defaultModels(f string, at manifest.AccountType) {
	if len(at.DefaultModelsBySubscription) > 32 {
		v.add(f+".defaultModelsBySubscription", "too_many", "at most 32 subscription presets")
	}
	for _, plan := range sortedKeys(at.DefaultModelsBySubscription) {
		if !subscriptionRe.MatchString(plan) {
			v.add(f+".defaultModelsBySubscription", "invalid", "invalid subscription type %q", plan)
		}
		// Reuse the same bounded complete-id validation for each preset.
		v.defaultModels(f+".defaultModelsBySubscription."+plan, manifest.AccountType{DefaultModels: at.DefaultModelsBySubscription[plan]})
	}
	if len(at.DefaultModels) > manifest.MaxDefaultModels {
		v.add(f+".defaultModels", "too_many", "at most %d default models", manifest.MaxDefaultModels)
	}
	seen := map[string]bool{}
	for i, m := range at.DefaultModels {
		mf := fmt.Sprintf("%s.defaultModels[%d]", f, i)
		switch {
		case !manifest.ValidModelID(m):
			v.add(mf, "invalid", "%q is not a complete model id", m)
		case seen[m]:
			v.add(mf, "duplicate", "model %q listed twice", m)
		}
		seen[m] = true
	}
	if len(at.DefaultModelMapping) > manifest.MaxDefaultModels {
		v.add(f+".defaultModelMapping", "too_many", "at most %d mapping entries", manifest.MaxDefaultModels)
	}
	for _, from := range sortedKeys(at.DefaultModelMapping) {
		mf := f + ".defaultModelMapping." + from
		switch to := at.DefaultModelMapping[from]; {
		case !manifest.ValidModelID(from), !manifest.ValidModelID(to):
			v.add(mf, "invalid", "%q -> %q: both sides must be complete model ids", from, to)
		case len(at.DefaultModels) > 0 && !seen[from]:
			v.add(mf, "not_in_models", "mapped model %q is not in defaultModels", from)
		}
	}
}

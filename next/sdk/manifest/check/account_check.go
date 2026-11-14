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
	reserved := []string{"id", "name", "plugin_key", "type", "status", "schedulable", "auto_disable", "priority", "weight", "max_concurrency", "rpm_limit", "tpm_limit", "spm_limit", "proxy_id", "proxy_url", "models", "model_mapping", "credentials", "created_by", "group_ids", "status_reason", "auto_disabled_until", "created_at", "updated_at", "preparation_key", "lifecycle_sync"}
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
	if needsCredentials(ats) {
		v.needPerm("accountTypes", "accounts.credentials", "account types the plugin implements or extends")
	}
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
		v.upstreamFields(f, at)
		v.accountLifecycle(f, at)
		v.defaultModels(f, at)
		v.defaultLimits(f+".defaultLimits", at.DefaultLimits)
		v.commonControls(f, at)
		v.quota(f, at.Quota)
		v.balance(f, at.Balance)
		v.refresh(f, at)
		if at.Upstream != nil {
			v.upstream(f, at, ownPlatforms)
		}
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
	v.accountStreamOnly(pf, ap, own)
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
	p := v.referencedPlatform(ap.Platform, own)
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

// referencedPlatform resolves the platform an account type entry names: a
// built-in platform, another installed plugin's platform or this plugin's
// own (own may be nil). nil when it is none of these.
func (v *validator) referencedPlatform(id string, own *manifest.Platform) *manifest.Platform {
	p := own
	for _, builtin := range platforms.Builtin() {
		if builtin.ID == id {
			p = &builtin
		}
	}
	for _, other := range v.opt.OtherPlatforms {
		if other.ID == id {
			p = &manifest.Platform{ID: other.ID, Endpoints: other.Endpoints}
		}
	}
	return p
}

// accountStreamOnly validates accountTypes[].platforms[].streamOnly
// (CONTRACTS §83): every entry names, once, the protocol of a proxy endpoint
// of the platform that the account type serves, answers with SSE
// (response.stream "sse") and carries the client's choice in
// request.streamPath - the path the host sets to true upstream. Offline
// packaging that cannot resolve an external platform only checks that the
// protocol belongs to it; the install check resolves it.
func (v *validator) accountStreamOnly(field string, ap manifest.AccountPlatform, own *manifest.Platform) {
	if ap.StreamOnly == nil {
		return
	}
	field += ".streamOnly"
	if len(ap.StreamOnly) == 0 {
		v.add(field, "required", "at least one protocol is required when streamOnly is specified")
		return
	}
	p := v.referencedPlatform(ap.Platform, own)
	if p == nil && !v.opt.Tooling {
		v.add(field, "unknown_platform", "platform %q must be installed to validate streamOnly protocols", ap.Platform)
		return
	}
	seen := map[string]bool{}
	for i, proto := range ap.StreamOnly {
		f := fmt.Sprintf("%s[%d]", field, i)
		switch {
		case strings.TrimSpace(proto) == "":
			v.add(f, "required", "protocol is required")
			continue
		case seen[proto]:
			v.add(f, "duplicate", "protocol %q listed twice", proto)
			continue
		}
		seen[proto] = true
		if p == nil {
			if !strings.HasPrefix(proto, ap.Platform+".") {
				v.add(f, "unknown_protocol", "protocol %q does not belong to platform %q", proto, ap.Platform)
			}
			continue
		}
		known, streams := false, false
		for _, e := range p.Endpoints {
			if e.Protocol != proto || !ap.SupportsEndpoint(e.ID) {
				continue
			}
			known = true
			if e.Kind == manifest.EndpointKindProxy && e.Response.Stream == "sse" && e.Request.StreamPath != "" {
				streams = true
			}
		}
		switch {
		case !known:
			v.add(f, "unknown_protocol", "protocol %q is not served by an endpoint of platform %q this account type supports", proto, ap.Platform)
		case !streams:
			v.add(f, "not_streamable", "protocol %q needs a proxy endpoint with response.stream \"sse\" and request.streamPath", proto)
		}
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

// upstreamFields validates accountTypes[].upstreamFields: non-empty,
// distinct keys.
func (v *validator) upstreamFields(f string, at manifest.AccountType) {
	seen := map[string]bool{}
	for i, name := range at.UpstreamFields {
		uf := fmt.Sprintf("%s.upstreamFields[%d]", f, i)
		switch {
		case strings.TrimSpace(name) == "":
			v.add(uf, "required", "field name is required")
		case seen[name]:
			v.add(uf, "duplicate", "field %q is listed twice", name)
		}
		seen[name] = true
	}
}

// Warnings returns manifest findings that do not block installation; the
// packaging CLI prints them. Today: a schema form editing an address-like
// field (base_url, *_endpoint) of an account type whose upstreamFields are
// neither declared nor derivable, so the core keeps the legacy rule for it.
func Warnings(m *manifest.Manifest, files map[string][]byte) []FieldError {
	var out []FieldError
	for i, at := range m.AccountTypes {
		if _, known := at.AddressFields(); known || at.Form.Mode != "schema" {
			continue
		}
		var schema struct {
			Properties map[string]json.RawMessage `json:"properties"`
		}
		if json.Unmarshal(files[at.Form.Schema], &schema) != nil {
			continue
		}
		var addr []string
		for _, name := range sortedKeys(schema.Properties) {
			if name == "base_url" || strings.HasSuffix(name, "_endpoint") {
				addr = append(addr, name)
			}
		}
		if len(addr) > 0 {
			out = append(out, FieldError{Field: fmt.Sprintf("accountTypes[%d].upstreamFields", i), Code: "undeclared",
				Message: fmt.Sprintf("form fields %s look like upstream addresses; declare upstreamFields", strings.Join(addr, ", "))})
		}
	}
	return out
}

// defaultLimits validates accountTypes[].defaultLimits (CONTRACTS §68.5)
// with the ranges of the account fields they prefill.
func (v *validator) defaultLimits(f string, d *manifest.AccountDefaultLimits) {
	if d == nil {
		return
	}
	for _, x := range []struct {
		control string
		value   *int64
	}{
		{"priority", widen(d.Priority)}, {"weight", widen(d.Weight)}, {"max_concurrency", widen(d.MaxConcurrency)},
		{"rpm_limit", widen(d.RPMLimit)}, {"tpm_limit", d.TPMLimit}, {"spm_limit", widen(d.SPMLimit)},
	} {
		if x.value != nil {
			v.controlRange(f+"."+camelLimitNames[x.control], x.control, *x.value)
		}
	}
	lists, _ := d.ControlDefaults()["model_limits"].([]manifest.ModelLimitValue)
	v.modelLimitLists(f+".modelLimits", lists, camelLimitNames)
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

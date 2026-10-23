package ccgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

// FeatureOverrides is sparse: omitted keys inherit, including individual source
// keys. No container settings or CLI executable selectors are accepted here.
type FeatureOverrides struct {
	// Level overrides the request level; it wins over RelayMode, which only
	// overrides saved before levels carry (applyLevelOverride).
	Level                  *string                         `json:"level,omitempty"`
	RelayMode              *string                         `json:"relay_mode,omitempty"`
	UnknownField           *string                         `json:"unknown_field,omitempty"`
	ToolSearch             *string                         `json:"tool_search,omitempty"`
	ThinkingDisabledCompat *string                         `json:"thinking_disabled_compat,omitempty"`
	CustomToolPrefix       *string                         `json:"custom_tool_prefix,omitempty"`
	BuildAttachmentSources features.BuildAttachmentSources `json:"build_attachment_sources,omitempty"`
	BuildBillingSources    features.BuildBillingSources    `json:"build_billing_sources,omitempty"`
	BuildBillingEntrypoint *string                         `json:"build_billing_entrypoint,omitempty"`
	BuildIdentityLines     features.BuildIdentityLines     `json:"build_identity_lines,omitempty"`
	BuildInjection         *features.BuildInjection        `json:"build_injection,omitempty"`
	RequestIdentitySources features.RequestIdentitySources `json:"request_identity_sources,omitempty"`
}

func featureRevisionConflict() error {
	return core.ErrConflict.WithMessage("CC feature policy changed; reload before saving.").WithDetails(map[string]any{"reason": "feature_revision_conflict"})
}

func (p *FeatureOverrides) UnmarshalJSON(raw []byte) error {
	type plain FeatureOverrides
	var out plain
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return errors.New("feature overrides must be an object")
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return err
	}
	for _, value := range fields {
		if bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
			return errors.New("inherit feature fields by omitting the key, not null")
		}
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(&out); err != nil {
		return err
	}
	// The structure only: the vocabulary is checked when saving (Validate)
	// and applied leniently when resolving (sanitizeOverrides), so a stored
	// override from an older vocabulary still decodes.
	*p = FeatureOverrides(out)
	return nil
}

func (p FeatureOverrides) Validate() error {
	for _, v := range []*string{p.Level, p.RelayMode, p.UnknownField, p.ToolSearch, p.ThinkingDisabledCompat, p.CustomToolPrefix, p.BuildBillingEntrypoint} {
		if v != nil && *v == "" {
			return errors.New("feature override cannot be empty")
		}
	}
	if p.RelayMode != nil && *p.RelayMode != "build" && *p.RelayMode != "direct" {
		return errors.New("invalid relay_mode: must be build or direct")
	}
	// Stored only, never resolved: still checked when saved.
	if err := p.BuildIdentityLines.Validate(); err != nil {
		return err
	}
	if err := p.RequestIdentitySources.Validate(); err != nil {
		return err
	}
	base := defaultRequestPolicy()
	applyFeatureOverrides(&base, p, nil, "")
	return validateRequestPolicy(base)
}

type GroupFeaturePolicy struct {
	Enabled              bool             `json:"enabled"`
	AllowAccountOverride bool             `json:"allow_account_override"`
	Overrides            FeatureOverrides `json:"overrides"`
}

type AccountFeaturePolicy struct {
	Mode      string           `json:"mode"`
	Overrides FeatureOverrides `json:"overrides"`
	Revision  int64            `json:"revision"`
}

func (p AccountFeaturePolicy) Validate() error {
	if p.Mode != "follow" && p.Mode != "custom" {
		return errors.New("feature mode must be follow or custom")
	}
	if p.Revision < 0 {
		return errors.New("invalid feature revision")
	}
	return p.Overrides.Validate()
}

func copyPolicy(p RequestPolicy) RequestPolicy {
	p.BuildAttachmentSources = cloneSourceMap(p.BuildAttachmentSources)
	p.BuildBillingSources = cloneSourceMap(p.BuildBillingSources)
	p.BuildIdentityLines = cloneSourceMap(p.BuildIdentityLines)
	p.BuildInjection = p.BuildInjection.Merge(nil)
	p.RequestIdentitySources = cloneSourceMap(p.RequestIdentitySources)
	return p
}

func cloneSourceMap[M ~map[string]string](m M) M {
	out := make(M, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

// mergeSourceMap applies a saved source map onto the stored one: nil keeps the
// stored map, empty resets it, and entries override key by key.
func mergeSourceMap[M ~map[string]string](in, stored M) M {
	if in == nil {
		return stored
	}
	if len(in) == 0 {
		return in
	}
	merged := cloneSourceMap(stored)
	for k, v := range in {
		merged[k] = v
	}
	return merged
}

func applyFeatureOverrides(p *RequestPolicy, o FeatureOverrides, sources map[string]string, layer string) {
	for _, f := range layerFields {
		for _, key := range f.apply(p, o) {
			if sources != nil {
				sources[key] = layer
			}
		}
	}
}

// layerField is one setting a group or account layer may override. keys are
// its entries in FeatureResolution.Sources; apply copies what o sets onto p
// and names the entries it set; fill (nil: none) gives the global policy's
// unset entries their default. The identity lines and identity sources are
// not among them: stored only, never resolved (audit A9, 2026-10-21/23).
type layerField struct {
	keys  []string
	apply func(p *RequestPolicy, o FeatureOverrides) []string
	fill  func(p *RequestPolicy)
}

// layerFields in the order a layer applies them: the level last, it reads
// what the others merged (applyLevelOverride).
var layerFields = []layerField{
	scalarField("unknown_field", func(o FeatureOverrides) *string { return o.UnknownField }, func(p *RequestPolicy) *string { return &p.UnknownField }, ""),
	scalarField("tool_search", func(o FeatureOverrides) *string { return o.ToolSearch }, func(p *RequestPolicy) *string { return &p.ToolSearch }, ""),
	scalarField("thinking_disabled_compat", func(o FeatureOverrides) *string { return o.ThinkingDisabledCompat }, func(p *RequestPolicy) *string { return &p.ThinkingDisabledCompat }, ""),
	scalarField("custom_tool_prefix", func(o FeatureOverrides) *string { return o.CustomToolPrefix }, func(p *RequestPolicy) *string { return &p.CustomToolPrefix }, ""),
	scalarField("build_billing_entrypoint", func(o FeatureOverrides) *string { return o.BuildBillingEntrypoint }, func(p *RequestPolicy) *string { return &p.BuildBillingEntrypoint }, features.DefaultBillingEntrypoint),
	sourceField("build_attachment_sources", features.BuildAttachmentFields,
		func(o FeatureOverrides) map[string]string { return o.BuildAttachmentSources },
		func(p *RequestPolicy) *map[string]string { return (*map[string]string)(&p.BuildAttachmentSources) }),
	sourceField("build_billing_sources", []string{"cc_version", "cc_entrypoint"},
		func(o FeatureOverrides) map[string]string { return o.BuildBillingSources },
		func(p *RequestPolicy) *map[string]string { return (*map[string]string)(&p.BuildBillingSources) }),
	injectionField(),
	{keys: []string{"level", "relay_mode"}, apply: applyLevelOverride},
}

// scalarField is a string setting; def ("" none) is the global default.
func scalarField(name string, from func(FeatureOverrides) *string, to func(*RequestPolicy) *string, def string) layerField {
	f := layerField{keys: []string{name}, apply: func(p *RequestPolicy, o FeatureOverrides) []string {
		v := from(o)
		if v == nil {
			return nil
		}
		*to(p) = *v
		return []string{name}
	}}
	if def != "" {
		f.fill = func(p *RequestPolicy) {
			if *to(p) == "" {
				*to(p) = def
			}
		}
	}
	return f
}

// sourceField is a map of sources overridden key by key; an unset key of
// the global policy is "client".
func sourceField(name string, fields []string, from func(FeatureOverrides) map[string]string, to func(*RequestPolicy) *map[string]string) layerField {
	keys := make([]string, len(fields))
	for i, k := range fields {
		keys[i] = name + "." + k
	}
	return layerField{keys: keys,
		apply: func(p *RequestPolicy, o FeatureOverrides) []string {
			m := to(p)
			if *m == nil {
				*m = map[string]string{}
			}
			var set []string
			for k, v := range from(o) {
				(*m)[k] = v
				set = append(set, name+"."+k)
			}
			return set
		},
		fill: func(p *RequestPolicy) {
			m := to(p)
			if *m == nil {
				*m = map[string]string{}
			}
			for _, k := range fields {
				if (*m)[k] == "" {
					(*m)[k] = "client"
				}
			}
		}}
}

// injectionField: the system prompt and each attachment and tool override on
// their own; an omitted one inherits.
func injectionField() layerField {
	keys := []string{"build_injection.system_prompt"}
	for _, k := range features.InjectionAttachments {
		keys = append(keys, "build_injection.attachments."+k)
	}
	for _, k := range features.InjectionTools {
		keys = append(keys, "build_injection.tools."+k)
	}
	return layerField{keys: keys, apply: func(p *RequestPolicy, o FeatureOverrides) []string {
		if o.BuildInjection == nil {
			return nil
		}
		p.BuildInjection = p.BuildInjection.Merge(o.BuildInjection)
		var set []string
		if o.BuildInjection.SystemPrompt != nil {
			set = append(set, "build_injection.system_prompt")
		}
		for k := range o.BuildInjection.Attachments {
			set = append(set, "build_injection.attachments."+k)
		}
		for k := range o.BuildInjection.Tools {
			set = append(set, "build_injection.tools."+k)
		}
		return set
	}}
}

// applyLevelOverride applies an override's level after its layer settings. A
// level always wins. An override saved before levels has only relay_mode:
// direct is level none; build lifts only a none level so far, to the level of
// what the merged settings do (features.LegacyLevel, keeping what they added).
// The relay mode follows the level either way.
func applyLevelOverride(p *RequestPolicy, o FeatureOverrides) []string {
	changed := false
	switch {
	case o.Level != nil:
		p.Level, changed = *o.Level, true
	case o.RelayMode != nil && *o.RelayMode == "direct":
		p.Level, changed = features.LevelNone, true
	case o.RelayMode != nil && *o.RelayMode == "build" && p.Level == features.LevelNone:
		if level := features.LegacyLevel("build", p.BuildAttachmentSources, p.BuildInjection); level != "" {
			p.Level, changed = level, true
			p.BuildInjection = keepLegacyInjection(level, p.BuildInjection)
		}
	}
	p.RelayMode = features.RelayModeForLevel(p.Level)
	if changed {
		return []string{"level", "relay_mode"}
	}
	return nil
}

type FeatureResolution struct {
	Effective      RequestPolicy     `json:"effective"`
	Inherited      RequestPolicy     `json:"inherited"`
	Sources        map[string]string `json:"sources"`
	Editable       bool              `json:"editable"`
	DisabledReason string            `json:"disabled_reason"`
	PolicyRevision string            `json:"policy_revision"`
}

// Group CC settings are optional. Only an enabled group policy can prohibit
// account overrides; absent/disabled policies inherit global defaults.
// A missing request group remains global-only (for example account probes).
func (c Config) allowsAccountFeatures(groupID int64) bool {
	if groupID <= 0 {
		return false
	}
	g, configured := c.CCFeatureGroups[strconv.FormatInt(groupID, 10)]
	return !configured || !g.Enabled || g.AllowAccountOverride
}

// ResolveFeaturePolicy is shared by preview and transport. A missing request
// group deliberately disables account overrides; probes never choose a group.
// The identity lines and identity sources are stored only: they are neither
// resolved nor shown (the console dropped them anyway, audit A9).
func (c Config) ResolveFeaturePolicy(groupID int64, account AccountFeaturePolicy) FeatureResolution {
	p := copyPolicy(c.EffectiveRequestPolicy())
	p.BuildIdentityLines, p.RequestIdentitySources = nil, nil
	// What the current vocabulary does not know is ignored, layer by layer
	// (feature_policy_sanitize.go); the stored values are not touched.
	warnDropped("global", sanitizePolicy(&p))
	sources := map[string]string{}
	for _, f := range layerFields {
		if f.fill != nil {
			f.fill(&p)
		}
		for _, k := range f.keys {
			sources[k] = "global"
		}
	}
	g, ok := c.CCFeatureGroups[strconv.FormatInt(groupID, 10)]
	reason := ""
	switch {
	case groupID <= 0:
		reason = "no_group"
	case !c.allowsAccountFeatures(groupID):
		reason = "account_override_disabled"
	}
	if groupID > 0 && ok && g.Enabled {
		overrides := g.Overrides
		warnDropped("group", sanitizeOverrides(&overrides))
		applyFeatureOverrides(&p, overrides, sources, "group")
	}
	inherited := copyPolicy(p)
	if reason == "" && account.Mode == "custom" {
		overrides := account.Overrides
		warnDropped("account", sanitizeOverrides(&overrides))
		applyFeatureOverrides(&p, overrides, sources, "account")
	}
	return FeatureResolution{Effective: p, Inherited: inherited, Sources: sources, Editable: reason == "", DisabledReason: reason,
		PolicyRevision: fmt.Sprintf("%d:%d:%d", c.FeatureRevision, groupID, account.Revision)}
}

func LoadAccountFeaturePolicy(ctx context.Context, q store.Querier, id int64) (AccountFeaturePolicy, error) {
	p := AccountFeaturePolicy{Mode: "follow"}
	var raw []byte
	err := q.QueryRow(ctx, `SELECT mode,overrides,revision FROM ccgateway_account_feature_policies WHERE account_id=$1`, id).Scan(&p.Mode, &raw, &p.Revision)
	if store.IsNoRows(err) {
		return p, nil
	}
	if err != nil {
		return p, err
	}
	err = json.Unmarshal(raw, &p.Overrides)
	return p, err
}

// SaveAccountFeaturePolicyTx runs while the parent account row is locked; this
// serializes first insertion as well as updates, without a delete/recreate ABA.
func SaveAccountFeaturePolicyTx(ctx context.Context, tx pgx.Tx, id int64, p AccountFeaturePolicy) error {
	if err := p.Validate(); err != nil {
		return core.ErrInvalidArgument.WithMessage(err.Error())
	}
	old, err := LoadAccountFeaturePolicy(ctx, tx, id)
	if err != nil {
		return err
	}
	if old.Revision != p.Revision {
		return featureRevisionConflict()
	}
	if p.Mode == "follow" {
		p.Overrides = FeatureOverrides{}
	}
	raw, err := json.Marshal(p.Overrides)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO ccgateway_account_feature_policies(account_id,mode,overrides,revision)
		VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(account_id) DO UPDATE SET mode=EXCLUDED.mode,overrides=EXCLUDED.overrides,
		revision=EXCLUDED.revision,updated_at=clock_timestamp()`, id, p.Mode, raw, old.Revision+1)
	return err
}

func (s *Service) resolvedWorkerPolicy(ctx context.Context, c Config, accountID, groupID int64) (features.WorkerPolicy, error) {
	account := AccountFeaturePolicy{Mode: "follow"}
	if accountID > 0 && c.allowsAccountFeatures(groupID) {
		var err error
		account, err = s.requestAccountFeatures(ctx, accountID)
		if err != nil {
			return features.WorkerPolicy{}, err
		}
	}
	return workerPolicy(c.ResolveFeaturePolicy(groupID, account).Effective), nil
}

// workerPolicy is the wire form of a resolved policy (features.WorkerPolicy):
// only what the Worker reads, and only the layers of its level, sparse. The
// level itself is not sent; it decides the relay mode (none is direct) and
// what goes along:
//
//	none  - the billing entrypoint and sources
//	low   - plus the attachment sources and the attachments added
//	high  - plus the system prompt and the tools added
//
// Layers above the level stay configured but are not sent. The identity line
// adapts to the billing header's entrypoint in the CLI and the identity is
// mapped (neither is configurable, 2026-10-21/23); what a policy stored
// earlier says about them stays stored and unsent, like every other field
// the console no longer edits (RequestPolicy).
func workerPolicy(p RequestPolicy) features.WorkerPolicy {
	level := p.Level
	if level == "" {
		level = features.DefaultRequestLevel
	}
	wire := features.WorkerPolicy{SchemaVersion: features.PolicySchemaVersion, RelayMode: features.RelayModeForLevel(level), CLIVersion: p.CLIVersion}
	if wire.CLIVersion == "" {
		wire.CLIVersion = defaultRequestPolicy().CLIVersion
	}
	// Client is also the wire default: the wire stays sparse.
	wire.BuildBillingSources = withoutClient(p.BuildBillingSources)
	if features.LevelHasEnvironment(level) {
		wire.BuildAttachmentSources = withoutClient(p.BuildAttachmentSources)
	}
	// The default is the CLI's own too, so a policy that changes nothing needs
	// no Worker able to honour the entrypoint.
	if p.BuildBillingEntrypoint != features.DefaultBillingEntrypoint {
		wire.BuildBillingEntrypoint = p.BuildBillingEntrypoint
	}
	// Only what the level adds goes to the Worker (its layers at their
	// defaults unless chosen otherwise); adding nothing needs no Worker able
	// to inject.
	wire.BuildInjection = features.LevelInjection(level, p.BuildInjection)
	return wire
}

// withoutClient is the sources map without the entries at the default, nil
// when none remain.
func withoutClient[M ~map[string]string](sources M) M {
	var out M
	for k, v := range sources {
		if v == "client" {
			continue
		}
		if out == nil {
			out = M{}
		}
		out[k] = v
	}
	return out
}

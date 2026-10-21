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
	RelayMode              *string                         `json:"relay_mode,omitempty"`
	UnknownField           *string                         `json:"unknown_field,omitempty"`
	ToolSearch             *string                         `json:"tool_search,omitempty"`
	ThinkingDisabledCompat *string                         `json:"thinking_disabled_compat,omitempty"`
	CustomToolPrefix       *string                         `json:"custom_tool_prefix,omitempty"`
	BuildAttachmentSources features.BuildAttachmentSources `json:"build_attachment_sources,omitempty"`
	BuildBillingSources    features.BuildBillingSources    `json:"build_billing_sources,omitempty"`
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
	*p = FeatureOverrides(out)
	return p.Validate()
}

func (p FeatureOverrides) Validate() error {
	for _, v := range []*string{p.RelayMode, p.UnknownField, p.ToolSearch, p.ThinkingDisabledCompat, p.CustomToolPrefix} {
		if v != nil && *v == "" {
			return errors.New("feature override cannot be empty")
		}
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
	for key, pair := range map[string][2]*string{
		"relay_mode": {o.RelayMode, &p.RelayMode}, "unknown_field": {o.UnknownField, &p.UnknownField},
		"tool_search": {o.ToolSearch, &p.ToolSearch}, "thinking_disabled_compat": {o.ThinkingDisabledCompat, &p.ThinkingDisabledCompat},
		"custom_tool_prefix": {o.CustomToolPrefix, &p.CustomToolPrefix},
	} {
		if pair[0] != nil {
			*pair[1] = *pair[0]
			if sources != nil {
				sources[key] = layer
			}
		}
	}
	if p.BuildAttachmentSources == nil {
		p.BuildAttachmentSources = features.BuildAttachmentSources{}
	}
	if p.BuildBillingSources == nil {
		p.BuildBillingSources = features.BuildBillingSources{}
	}
	if p.RequestIdentitySources == nil {
		p.RequestIdentitySources = features.RequestIdentitySources{}
	}
	for k, v := range o.BuildAttachmentSources {
		p.BuildAttachmentSources[k] = v
		if sources != nil {
			sources["build_attachment_sources."+k] = layer
		}
	}
	for k, v := range o.BuildBillingSources {
		p.BuildBillingSources[k] = v
		if sources != nil {
			sources["build_billing_sources."+k] = layer
		}
	}
	for k, v := range o.RequestIdentitySources {
		p.RequestIdentitySources[k] = v
		if sources != nil {
			sources["request_identity_sources."+k] = layer
		}
	}
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
func (c Config) ResolveFeaturePolicy(groupID int64, account AccountFeaturePolicy) FeatureResolution {
	p := copyPolicy(c.EffectiveRequestPolicy())
	sources := map[string]string{}
	for _, k := range []string{"relay_mode", "unknown_field", "tool_search", "thinking_disabled_compat", "custom_tool_prefix"} {
		sources[k] = "global"
	}
	for _, k := range features.BuildAttachmentFields {
		if p.BuildAttachmentSources[k] == "" {
			p.BuildAttachmentSources[k] = "client"
		}
		sources["build_attachment_sources."+k] = "global"
	}
	for _, k := range []string{"cc_version", "cc_entrypoint"} {
		if p.BuildBillingSources[k] == "" {
			p.BuildBillingSources[k] = "client"
		}
		sources["build_billing_sources."+k] = "global"
	}
	for _, k := range features.RequestIdentityFields {
		if p.RequestIdentitySources[k] == "" {
			p.RequestIdentitySources[k] = features.RequestIdentityDefault
		}
		sources["request_identity_sources."+k] = "global"
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
		applyFeatureOverrides(&p, g.Overrides, sources, "group")
	}
	inherited := copyPolicy(p)
	if reason == "" && account.Mode == "custom" {
		applyFeatureOverrides(&p, account.Overrides, sources, "account")
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

func (s *Service) resolvedWorkerPolicy(ctx context.Context, c Config, accountID, groupID int64) (RequestPolicy, error) {
	account := AccountFeaturePolicy{Mode: "follow"}
	if accountID > 0 && c.allowsAccountFeatures(groupID) {
		var err error
		account, err = LoadAccountFeaturePolicy(ctx, s.DB.Pool, accountID)
		if err != nil {
			return RequestPolicy{}, err
		}
	}
	p := c.ResolveFeaturePolicy(groupID, account).Effective
	// Client is also the wire default. Keep the wire sparse so unchanged
	// legacy Workers never receive newly introduced no-op source keys.
	for k, v := range p.BuildAttachmentSources {
		if v == "client" {
			delete(p.BuildAttachmentSources, k)
		}
	}
	for k, v := range p.BuildBillingSources {
		if v == "client" {
			delete(p.BuildBillingSources, k)
		}
	}
	// The identity is not configurable (2026-10-21 decision): build replaces a
	// client metadata.user_id and adds none, which is the Worker's own default,
	// and direct forwards it untouched. A source stored earlier is not sent.
	p.RequestIdentitySources = nil
	if p.RelayMode == "direct" {
		p.BuildAttachmentSources = nil
		p.BuildBillingSources = nil
	}
	return p, nil
}

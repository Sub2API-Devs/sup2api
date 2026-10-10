package ccgateway

import (
	"encoding/json"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"regexp"
	"strings"
)

// RequestPolicy is supplied by the authenticated host, never by API callers.
type RequestPolicy struct {
	SchemaVersion            int               `json:"schema_version"`
	EnvironmentFields        map[string]string `json:"environment_fields,omitempty"`
	UnknownBeta              string            `json:"unknown_beta"`
	UnknownField             string            `json:"unknown_field"`
	AllowFast                bool              `json:"allow_fast"`
	ToolSearch               string            `json:"tool_search,omitempty"`
	AllowEffort              bool              `json:"allow_effort"`
	AttachmentSource         string            `json:"attachment_source"`
	AttachmentSources        map[string]string `json:"attachment_sources,omitempty"`
	UnknownClientAttachment  string            `json:"unknown_client_attachment"`
	UnknownGatewayAttachment string            `json:"unknown_gateway_attachment"`
	CustomToolPrefix         string            `json:"custom_tool_prefix"`
	// PassUpstreamErrors makes the application return the first upstream error
	// as-is instead of letting Claude Code retry, back off or refresh auth.
	// Defaults to false; configurations saved before it existed decode as false.
	PassUpstreamErrors bool `json:"pass_upstream_errors"`
	// ThinkingDisabledCompat is "pass" (default: thinking "disabled" goes
	// upstream as sent, so a model that rejects it answers 400 as the official
	// API does) or "omit" (the Worker drops it for the models it knows reject
	// it, e.g. when a client proxy rewrote claude-opus-5 to claude-opus-5-5).
	ThinkingDisabledCompat string `json:"thinking_disabled_compat,omitempty"`
	// RelayMode is "legacy" (default: the Worker's outbound relay adapts the
	// inner CLI's requests) or "passthrough" (every upstream request is the one
	// the inner CLI built, forwarded unchanged; PASSTHROUGH-DESIGN.md).
	RelayMode string `json:"relay_mode,omitempty"`
	// RelayPassthroughAccounts runs these accounts in passthrough while
	// RelayMode is legacy (a staged rollout). Only the core reads it: the
	// Worker receives the account's effective relay_mode.
	RelayPassthroughAccounts []int64    `json:"relay_passthrough_accounts,omitempty"`
	Betas                    []BetaRule `json:"betas"`
}
type BetaRule = features.BetaRule

func (p *RequestPolicy) UnmarshalJSON(raw []byte) error {
	if err := features.ValidatePolicySchemaJSON(raw); err != nil {
		return err
	}
	type plain RequestPolicy
	value := plain(*p)
	if err := json.Unmarshal(raw, &value); err != nil {
		return err
	}
	value.SchemaVersion = features.PolicySchemaVersion
	*p = RequestPolicy(value)
	return nil
}

func defaultRequestPolicy() RequestPolicy {
	return RequestPolicy{SchemaVersion: features.PolicySchemaVersion, UnknownClientAttachment: "pass", UnknownGatewayAttachment: "pass", CustomToolPrefix: "ccgateway", UnknownBeta: "ignore", UnknownField: "reject", AllowFast: true, AllowEffort: true, AttachmentSource: "client", PassUpstreamErrors: false, ToolSearch: "request", ThinkingDisabledCompat: "pass", RelayMode: "legacy", Betas: features.BetaRules()}
}

// EffectiveRequestPolicy is the policy sent to the Worker. Features the
// official API supports are always on: allow_fast (speed) and allow_effort
// (output_config.effort) are no longer settings, so a saved false is ignored.
func (c Config) EffectiveRequestPolicy() RequestPolicy {
	if c.RequestPolicy == nil {
		p := defaultRequestPolicy()
		p.SchemaVersion = features.PolicySchemaVersion
		return p
	}
	p := *c.RequestPolicy
	p.AllowFast, p.AllowEffort = true, true
	if p.SchemaVersion == 0 {
		p.SchemaVersion = features.PolicySchemaVersion
	}
	if p.UnknownClientAttachment == "" {
		p.UnknownClientAttachment = "pass"
	}
	if p.UnknownGatewayAttachment == "" {
		p.UnknownGatewayAttachment = "pass"
	}
	if p.CustomToolPrefix == "" {
		p.CustomToolPrefix = "ccgateway"
	}
	if p.AttachmentSource == "" {
		p.AttachmentSource = "client"
	}
	if p.ToolSearch == "" {
		p.ToolSearch = "request"
	}
	if p.ThinkingDisabledCompat == "" {
		p.ThinkingDisabledCompat = "pass"
	}
	if p.RelayMode == "" {
		p.RelayMode = "legacy"
	}
	p.Betas = defaultRequestPolicy().Betas
	return p
}

// WorkerRequestPolicy is the policy one account's Worker receives: its
// effective relay_mode, without the rollout list of other accounts.
func (c Config) WorkerRequestPolicy(accountID int64) RequestPolicy {
	p := c.EffectiveRequestPolicy()
	if p.RelayMode != "passthrough" && accountID > 0 {
		for _, id := range p.RelayPassthroughAccounts {
			if id == accountID {
				p.RelayMode = "passthrough"
			}
		}
	}
	p.RelayPassthroughAccounts = nil
	return p
}

func validateRequestPolicy(p RequestPolicy) error {
	if p.SchemaVersion != 0 && p.SchemaVersion != features.PolicySchemaVersion {
		return errors.New("unsupported request policy schema_version")
	}
	if err := validateAttachmentPolicy(p); err != nil {
		return err
	}
	if p.CustomToolPrefix != "" && (!customToolPrefixPattern.MatchString(p.CustomToolPrefix) || strings.Contains(p.CustomToolPrefix, "__")) {
		return errors.New("invalid custom tool prefix: use 1-32 letters, digits, underscores or hyphens, without double underscores")
	}
	if p.AttachmentSource != "client" && p.AttachmentSource != "gateway" && p.AttachmentSource != "both" {
		return errors.New("invalid attachment source policy")
	}
	if (p.UnknownBeta != "reject" && p.UnknownBeta != "ignore") || (p.UnknownField != "reject" && p.UnknownField != "ignore") {
		return errors.New("invalid request policy")
	}
	if p.ToolSearch != "" && !validToolSearch(p.ToolSearch) {
		return errors.New("invalid tool search policy")
	}
	if p.ThinkingDisabledCompat != "" && p.ThinkingDisabledCompat != "pass" && p.ThinkingDisabledCompat != "omit" {
		return errors.New("invalid thinking_disabled_compat: must be pass or omit")
	}
	if p.RelayMode != "" && p.RelayMode != "legacy" && p.RelayMode != "passthrough" {
		return errors.New("invalid relay_mode: must be legacy or passthrough")
	}
	if len(p.RelayPassthroughAccounts) > 1000 {
		return errors.New("relay_passthrough_accounts lists at most 1000 accounts")
	}
	seen := map[int64]bool{}
	for _, id := range p.RelayPassthroughAccounts {
		if id <= 0 || seen[id] {
			return errors.New("relay_passthrough_accounts must list distinct positive account IDs")
		}
		seen[id] = true
	}
	return nil
}

var customToolPrefixPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,32}$`)
var toolSearchThresholdPattern = regexp.MustCompile(`^auto:(0|[1-9][0-9]?|100)$`)

func validToolSearch(value string) bool {
	if value == "request" || value == "false" || value == "true" || value == "auto" {
		return true
	}
	return toolSearchThresholdPattern.MatchString(value)
}

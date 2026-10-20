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
	BuildBillingSources    features.BuildBillingSources    `json:"build_billing_sources,omitempty"`
	BuildAttachmentSources features.BuildAttachmentSources `json:"build_attachment_sources,omitempty"`
	SchemaVersion          int                             `json:"schema_version"`
	UnknownField           string                          `json:"unknown_field"`
	AllowFast              bool                            `json:"allow_fast"`
	ToolSearch             string                          `json:"tool_search,omitempty"`
	AllowEffort            bool                            `json:"allow_effort"`
	CustomToolPrefix       string                          `json:"custom_tool_prefix"`
	// ThinkingDisabledCompat is "pass" (default: thinking "disabled" goes
	// upstream as sent, so a model that rejects it answers 400 as the official
	// API does) or "omit" (the Worker drops it for the models it knows reject
	// it, e.g. when a client proxy rewrote claude-opus-5 to claude-opus-5-5).
	ThinkingDisabledCompat string `json:"thinking_disabled_compat,omitempty"`
	// EraseClientAttachments lists the client attachment types (environment,
	// model, date, total_tokens_reminder, session_context) the Worker erases
	// before admission; empty keeps every client attachment as sent.
	EraseClientAttachments []string `json:"erase_client_attachments,omitempty"`
	// ReplaceClientAttachments lists the client attachment types (environment,
	// model, total_tokens_reminder) the Worker replaces in place with Claude
	// Code's own rendering on that Worker; never an erased type.
	ReplaceClientAttachments []string   `json:"replace_client_attachments,omitempty"`
	RelayMode                string     `json:"relay_mode,omitempty"`
	CLIVersion               string     `json:"cli_version,omitempty"`
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
	return RequestPolicy{SchemaVersion: features.PolicySchemaVersion, CustomToolPrefix: "ccgateway", UnknownField: "reject", AllowFast: true, AllowEffort: true, ToolSearch: "request", ThinkingDisabledCompat: "pass", RelayMode: "build", CLIVersion: "2.1.304", Betas: features.BetaRules()}
}

// Used only when no encrypted configuration has ever been stored. Historic
// configurations with omitted source maps retain client defaults.
func newRequestPolicy() RequestPolicy {
	p := defaultRequestPolicy()
	p.BuildAttachmentSources = features.BuildAttachmentSources{"platform_name": "worker", "os_version": "worker"}
	return p
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
	if p.CustomToolPrefix == "" {
		p.CustomToolPrefix = "ccgateway"
	}
	if p.ToolSearch == "" {
		p.ToolSearch = "request"
	}
	if p.ThinkingDisabledCompat == "" {
		p.ThinkingDisabledCompat = "pass"
	}
	// Historical native/legacy/passthrough configurations migrate on read.
	if p.RelayMode != "direct" && p.RelayMode != "build" {
		p.RelayMode = "build"
	}
	if p.CLIVersion == "" {
		p.CLIVersion = "2.1.304"
	}
	p.Betas = defaultRequestPolicy().Betas
	return p
}

func (c Config) WorkerRequestPolicy(_ int64) RequestPolicy {
	return c.EffectiveRequestPolicy()
}

func validateRequestPolicy(p RequestPolicy) error {
	if err := p.BuildBillingSources.Validate(); err != nil {
		return err
	}
	if err := p.BuildAttachmentSources.Validate(); err != nil {
		return err
	}
	if p.SchemaVersion != 0 && p.SchemaVersion != features.PolicySchemaVersion {
		return errors.New("unsupported request policy schema_version")
	}
	if p.CustomToolPrefix != "" && (!customToolPrefixPattern.MatchString(p.CustomToolPrefix) || strings.Contains(p.CustomToolPrefix, "__")) {
		return errors.New("invalid custom tool prefix: use 1-32 letters, digits, underscores or hyphens, without double underscores")
	}
	if p.UnknownField != "reject" && p.UnknownField != "ignore" {
		return errors.New("invalid request policy")
	}
	if p.ToolSearch != "" && !validToolSearch(p.ToolSearch) {
		return errors.New("invalid tool search policy")
	}
	if p.ThinkingDisabledCompat != "" && p.ThinkingDisabledCompat != "pass" && p.ThinkingDisabledCompat != "omit" {
		return errors.New("invalid thinking_disabled_compat: must be pass or omit")
	}
	if p.RelayMode != "" && p.RelayMode != "build" && p.RelayMode != "direct" {
		return errors.New("invalid relay_mode: must be build or direct")
	}
	if p.CLIVersion != "" && !regexp.MustCompile(`^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$`).MatchString(p.CLIVersion) {
		return errors.New("invalid cli_version")
	}
	if err := features.ValidateEraseClientAttachments(p.EraseClientAttachments); err != nil {
		return err
	}
	if err := features.ValidateReplaceClientAttachments(p.ReplaceClientAttachments, p.EraseClientAttachments); err != nil {
		return err
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

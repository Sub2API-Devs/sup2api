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
	// Level is the request level (features.RequestLevels): which of Claude
	// Code's layers a request is given. It decides the relay mode (none is
	// direct) and which of the layer settings below reach the Worker; the
	// others are kept but not sent. "" is a policy saved before levels,
	// migrated on read (EffectiveRequestPolicy). Never sent to the Worker.
	Level               string                       `json:"level,omitempty"`
	BuildBillingSources features.BuildBillingSources `json:"build_billing_sources,omitempty"`
	// BuildBillingEntrypoint is the cc_entrypoint build writes when it fills
	// the billing header or the source is worker; "" is the default (sdk-cli).
	BuildBillingEntrypoint string `json:"build_billing_entrypoint,omitempty"`
	// BuildIdentityLines picks Claude Code's identity line per entrypoint;
	// omitted entrypoints use their default (features.IdentityLineChoices).
	BuildIdentityLines features.BuildIdentityLines `json:"build_identity_lines,omitempty"`
	// BuildInjection is what build gives a request without a billing header
	// (one that is not Claude Code's): CC's system prompt, first-turn
	// attachments and tools, each optional; nil adds nothing.
	BuildInjection         *features.BuildInjection        `json:"build_injection,omitempty"`
	BuildAttachmentSources features.BuildAttachmentSources `json:"build_attachment_sources,omitempty"`
	RequestIdentitySources features.RequestIdentitySources `json:"request_identity_sources,omitempty"`
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
// configurations with omitted source maps retain client defaults. A new
// installation starts at the default level with its defaults (low: every
// first-turn attachment added to a request without a billing header).
func newRequestPolicy() RequestPolicy {
	p := defaultRequestPolicy()
	p.Level = features.DefaultRequestLevel
	p.BuildAttachmentSources = features.BuildAttachmentSources{"platform_name": "worker", "os_version": "worker"}
	return p
}

// keepLegacyInjection turns every layer item the level adds by default, and a
// policy saved before levels did not add, into an explicit "not added", so a
// level derived from that policy adds what it added and nothing more:
// LevelInjection(level, result) equals injection.Effective().
func keepLegacyInjection(level string, injection *features.BuildInjection) *features.BuildInjection {
	if !features.LevelHasEnvironment(level) {
		return injection
	}
	added := injection.Effective()
	if added == nil {
		added = &features.BuildInjection{}
	}
	out := injection.Merge(nil)
	if out == nil {
		out = &features.BuildInjection{}
	}
	for _, name := range features.InjectionAttachments {
		if !added.Attachments[name] {
			if out.Attachments == nil {
				out.Attachments = map[string]bool{}
			}
			out.Attachments[name] = false
		}
	}
	if features.LevelHasPromptAndTools(level) {
		if added.SystemPrompt == nil {
			off := false
			out.SystemPrompt = &off
		}
		for _, name := range features.DefaultInjectionTools {
			if !added.Tools[name] {
				if out.Tools == nil {
					out.Tools = map[string]bool{}
				}
				out.Tools[name] = false
			}
		}
	}
	return out
}

// migrateLegacyLevel gives a policy saved before levels the level of what it
// did (features.LegacyLevel), keeping what it added.
func migrateLegacyLevel(p *RequestPolicy) {
	if p.Level != "" {
		return
	}
	p.Level = features.LegacyLevel(p.RelayMode, p.BuildAttachmentSources, p.BuildInjection)
	if p.Level == "" {
		p.Level = features.DefaultRequestLevel
	}
	p.BuildInjection = keepLegacyInjection(p.Level, p.BuildInjection)
}

// EffectiveRequestPolicy is the global policy as stored, completed and
// migrated (the Worker receives resolvedWorkerPolicy's form of it). Features
// the official API supports are always on: allow_fast (speed) and allow_effort
// (output_config.effort) are no longer settings, so a saved false is ignored.
// The level decides the relay mode: a saved relay_mode only migrates a policy
// saved before levels.
func (c Config) EffectiveRequestPolicy() RequestPolicy {
	if c.RequestPolicy == nil {
		p := defaultRequestPolicy()
		p.SchemaVersion = features.PolicySchemaVersion
		migrateLegacyLevel(&p)
		p.RelayMode = features.RelayModeForLevel(p.Level)
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
	migrateLegacyLevel(&p)
	p.RelayMode = features.RelayModeForLevel(p.Level)
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
	if err := features.ValidateRequestLevel(p.Level); err != nil {
		return err
	}
	if err := p.BuildBillingSources.Validate(); err != nil {
		return err
	}
	if err := features.ValidateBillingEntrypoint(p.BuildBillingEntrypoint); err != nil {
		return err
	}
	if err := p.BuildIdentityLines.Validate(); err != nil {
		return err
	}
	if err := p.BuildInjection.Validate(); err != nil {
		return err
	}
	if err := p.BuildAttachmentSources.Validate(); err != nil {
		return err
	}
	if err := p.RequestIdentitySources.Validate(); err != nil {
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

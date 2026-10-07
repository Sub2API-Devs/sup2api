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
	PassUpstreamErrors bool       `json:"pass_upstream_errors"`
	Betas              []BetaRule `json:"betas"`
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
	return RequestPolicy{SchemaVersion: features.PolicySchemaVersion, UnknownClientAttachment: "pass", UnknownGatewayAttachment: "pass", CustomToolPrefix: "ccgateway", UnknownBeta: "ignore", UnknownField: "reject", AllowFast: false, AllowEffort: true, AttachmentSource: "client", PassUpstreamErrors: false, ToolSearch: "request", Betas: features.BetaRules()}
}
func (c Config) EffectiveRequestPolicy() RequestPolicy {
	if c.RequestPolicy == nil {
		p := defaultRequestPolicy()
		p.SchemaVersion = features.PolicySchemaVersion
		return p
	}
	p := *c.RequestPolicy
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
	p.Betas = defaultRequestPolicy().Betas
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

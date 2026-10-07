package engine

import (
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// Only the authenticated host/controller can provide this internal header.
const policyHeader = "X-CCGateway-Request-Policy"

type BetaRule = features.BetaRule
type RequestPolicy struct {
	SchemaVersion     int               `json:"schema_version"`
	EnvironmentFields map[string]string `json:"environment_fields,omitempty"`
	UnknownBeta       string            `json:"unknown_beta"`
	UnknownField      string            `json:"unknown_field"`
	AllowFast         bool              `json:"allow_fast"`
	ToolSearch        string            `json:"tool_search,omitempty"`
	AllowEffort       bool              `json:"allow_effort"`
	Betas             []BetaRule        `json:"betas"`
	// Upstream errors end the run and reach the client as the API sent them,
	// instead of being handled (retried, backed off) by Claude Code.
	PassUpstreamErrors bool `json:"pass_upstream_errors"`
	// Which side's system attachments (environment, date, tokens, session_context)
	// to keep: "client" (default), "gateway", or "both".
	AttachmentSource         string            `json:"attachment_source"`
	AttachmentSources        map[string]string `json:"attachment_sources,omitempty"`
	UnknownClientAttachment  string            `json:"unknown_client_attachment"`
	UnknownGatewayAttachment string            `json:"unknown_gateway_attachment"`
	CustomToolPrefix         string            `json:"custom_tool_prefix"`
}

func defaultRequestPolicy() RequestPolicy {
	return RequestPolicy{SchemaVersion: features.PolicySchemaVersion, UnknownClientAttachment: "pass", UnknownGatewayAttachment: "pass", CustomToolPrefix: "ccgateway", UnknownBeta: "ignore", UnknownField: "reject", AllowFast: false, AllowEffort: true, ToolSearch: "request", AttachmentSource: "client", Betas: features.BetaRules()}
}

var betaName = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{0,127}$`)

func requestPolicy(h http.Header) (RequestPolicy, error) {
	p := defaultRequestPolicy()
	p.SchemaVersion = features.PolicySchemaVersion
	if raw := h.Get(policyHeader); raw != "" {
		if len(raw) > 16384 {
			return p, fmt.Errorf("invalid gateway request policy")
		}
		if err := features.ValidatePolicySchemaJSON([]byte(raw)); err != nil {
			return p, err
		}
		if err := json.Unmarshal([]byte(raw), &p); err != nil {
			return p, fmt.Errorf("invalid gateway request policy")
		}
	}
	if (p.UnknownBeta != "reject" && p.UnknownBeta != "ignore") || (p.UnknownField != "reject" && p.UnknownField != "ignore") {
		return p, fmt.Errorf("invalid gateway request policy")
	}
	if p.AttachmentSource == "" {
		p.AttachmentSource = "client"
	}
	if p.UnknownClientAttachment == "" {
		p.UnknownClientAttachment = "pass"
	}
	if p.UnknownGatewayAttachment == "" {
		p.UnknownGatewayAttachment = "pass"
	}
	if err := validateAttachmentPolicy(p); err != nil {
		return p, err
	}
	if p.CustomToolPrefix == "" {
		p.CustomToolPrefix = "ccgateway"
	}
	if !customToolPrefix.MatchString(p.CustomToolPrefix) || strings.Contains(p.CustomToolPrefix, "__") {
		return p, fmt.Errorf("invalid custom_tool_prefix: use 1-32 letters, digits, underscores or hyphens, without double underscores")
	}
	if p.AttachmentSource != "client" && p.AttachmentSource != "gateway" && p.AttachmentSource != "both" {
		return p, fmt.Errorf("invalid attachment_source: must be client, gateway, or both")
	}
	if p.ToolSearch == "" {
		p.ToolSearch = "request"
	}
	if !validToolSearch(p.ToolSearch) {
		return p, fmt.Errorf("invalid tool search policy")
	}
	// Ignore legacy editable rules; Beta handling is fixed in code.
	p.Betas = defaultRequestPolicy().Betas
	return p, nil
}
func parsePolicyRequest(body []byte, h http.Header) (*Request, error) {
	p, err := requestPolicy(h)
	if err != nil {
		return nil, err
	}
	o, err := decodeObject(body)
	if err != nil {
		return nil, err
	}
	plan, err := parseRequestPlan(body, o)
	if err != nil {
		return nil, err
	}
	if err := plan.takeTaskBudget(o); err != nil {
		return nil, err
	}
	if err = p.filterFields(o); err != nil {
		return nil, err
	}
	fast, err := p.speed(o)
	if err != nil {
		return nil, err
	}
	effort, format, err := p.outputConfig(o)
	if err != nil {
		return nil, err
	}
	schema, err := outputSchema(format)
	if err != nil {
		return nil, err
	}
	cacheRequested := hasRequestCacheControl(o)
	data, _ := json.Marshal(o)
	req, err := parseRequest(data, hasBetaHeader(h.Values("anthropic-beta"), "interleaved-thinking-2025-05-14"))
	if err != nil {
		return nil, err
	}
	if err := plan.validateTools(req); err != nil {
		return nil, err
	}
	req.Plan = plan
	req.Fast = fast
	req.Effort = effort
	req.JSONSchema = schema
	req.APIOutputFormat = schema != nil
	if err := plan.configureThinkingOutput(req, format, h.Values("anthropic-beta")); err != nil {
		return nil, err
	}
	req.PassUpstreamErrors = p.PassUpstreamErrors
	req.AttachmentSource = p.AttachmentSource
	req.AttachmentSources = p.AttachmentSources
	req.EnvironmentFields = p.EnvironmentFields
	req.UnknownClientAttachment = p.UnknownClientAttachment
	req.UnknownGatewayAttachment = p.UnknownGatewayAttachment
	req.filterClientAttachments()
	req.CustomToolPrefix = p.CustomToolPrefix
	req.ToolSearch = p.toolSearch(req)
	if cacheRequested {
		req.PromptCacheTTL = "5m"
		if req.TTL == time.Hour {
			req.PromptCacheTTL = "1h"
		}
	}
	if err = p.applyBetas(req, h.Values("anthropic-beta")); err != nil {
		return nil, err
	}
	if err := plan.configureAPISpeed(req); err != nil {
		return nil, err
	}
	if err = req.validateAdvisorBeta(); err != nil {
		return nil, err
	}
	if err := req.validateInlineSystemBetas(p.AllowEffort); err != nil {
		return nil, err
	}
	// API server search owns deferred discovery. Do not add CC's separate
	// client ToolSearch loop, even when the global policy enables it.
	if len(req.ServerTools) > 0 {
		req.ToolSearch = "false"
	}
	if err := req.configureContextCompaction(h.Values("anthropic-beta")); err != nil {
		return nil, err
	}
	if err := req.validateInlineToolConfiguration(); err != nil {
		return nil, err
	}
	if err := req.validateAPIClientConfiguration(); err != nil {
		return nil, err
	}
	if err := plan.validateInternalRounds(req); err != nil {
		return nil, err
	}
	if err := plan.validateTaskBudget(req); err != nil {
		return nil, err
	}
	return req, nil
}

// filterFields rejects or drops body fields outside the supported set.
func (p RequestPolicy) filterFields(o Object) error {
	if _, exists := o["fallback_credit_token"]; exists {
		return fmt.Errorf("fallback_credit_token requires issuing-account affinity, original-body/beta matching and five-minute redemption tracking; cross-account credit redemption is not yet implemented")
	}
	if _, exists := o["fallbacks"]; exists {
		return fmt.Errorf("fallbacks requires core authorization of target models, per-model usage.iterations billing and distinct JSON/SSE response handling; server-side routing is not yet enabled")
	}
	// These are known protocol features, not harmless unknown extensions.
	// Until their request/response/history path exists, ignore must not turn
	// an explicit semantic request into a different successful operation.
	for _, field := range []string{"container", "mcp_servers", "diagnostics", "fallbacks", "fallback_credit_token"} {
		if _, exists := o[field]; exists {
			return fmt.Errorf("unsupported request feature %q: complete protocol adaptation is required", field)
		}
	}
	allowed := map[string]bool{}
	for _, k := range []string{"model", "max_tokens", "stream", "system", "messages", "tools", "tool_choice", "thinking", "cache_control", "speed", "output_config", "output_format"} {
		allowed[k] = true
	}
	for k := range o {
		if !allowed[k] {
			if p.UnknownField == "reject" {
				return fmt.Errorf("unsupported request field %q (CCGateway policy)", k)
			}
			delete(o, k)
		}
	}
	return nil
}

// speed takes the speed field out of the body. The result is never nil:
// without an allowed speed, fast mode is off.
func (p RequestPolicy) speed(o Object) (*bool, error) {
	fast := new(bool)
	if v, ok := o["speed"]; ok {
		if v != nil {
			speed, ok := v.(string)
			if !ok || (speed != "fast" && speed != "standard") {
				return nil, fmt.Errorf("speed must be fast or standard")
			}
			b := speed == "fast"
			if b && !p.AllowFast {
				return nil, fmt.Errorf("speed fast is disabled by CCGateway policy")
			}
			fast = &b
		}
		delete(o, "speed")
	}
	return fast, nil
}

// outputConfig takes output_config and the legacy output_format out of the
// body, returning the effort and the requested output format.
func (p RequestPolicy) outputConfig(o Object) (effort string, format any, err error) {
	format = o["output_format"]
	delete(o, "output_format")
	v, ok := o["output_config"]
	if !ok {
		return "", format, nil
	}
	cfg, ok := v.(map[string]any)
	if !ok {
		return "", nil, fmt.Errorf("output_config must be an object")
	}
	if current, exists := cfg["format"]; exists {
		if format != nil {
			return "", nil, fmt.Errorf("use output_config.format or output_format, not both")
		}
		format = current
	}
	for k, v := range cfg {
		if k == "task_budget" {
			return "", nil, fmt.Errorf("unsupported request feature output_config.task_budget: account capability and budget semantics require validation")
		}
		if k == "format" {
			continue
		}
		if k == "effort" && !p.AllowEffort {
			return "", nil, fmt.Errorf("output_config.effort is disabled by the gateway policy")
		}
		if k != "effort" || !p.AllowEffort {
			if p.UnknownField == "reject" {
				return "", nil, fmt.Errorf("unsupported request field output_config.%s (CCGateway policy)", k)
			}
			continue
		}
		effort, ok = v.(string)
		if !ok {
			return "", nil, fmt.Errorf("output_config.effort must be a string")
		}
		switch effort {
		case "low", "medium", "high", "xhigh", "max":
		default:
			return "", nil, fmt.Errorf("invalid output_config.effort")
		}
	}
	delete(o, "output_config")
	return effort, format, nil
}

// outputSchema validates a json_schema output format; nil means none.
func outputSchema(format any) (Object, error) {
	if format == nil {
		return nil, nil
	}
	f, ok := format.(map[string]any)
	if !ok || str(f, "type") != "json_schema" {
		return nil, fmt.Errorf("output_config.format must be a json_schema object")
	}
	if err := keys(f, "type", "schema"); err != nil {
		return nil, err
	}
	schema, ok := f["schema"].(map[string]any)
	if !ok || len(schema) == 0 {
		return nil, fmt.Errorf("output_config.format.schema must be a non-empty JSON Schema object")
	}
	encoded, _ := json.Marshal(schema)
	if len(encoded) > 64<<10 {
		return nil, fmt.Errorf("output_config.format.schema exceeds 64 KiB")
	}
	if _, err := compileOutputSchema(schema); err != nil {
		return nil, fmt.Errorf("invalid output_config.format.schema: %w", err)
	}
	return schema, nil
}

// toolSearch is the CLI's tool search setting before any beta: "request"
// enables it when a tool asks for deferred loading; disabled tools disable it.
func (p RequestPolicy) toolSearch(req *Request) string {
	if req.NoTools {
		return "false"
	}
	if p.ToolSearch != "request" {
		return p.ToolSearch
	}
	for _, tool := range req.Tools {
		if tool.DeferLoading != nil && *tool.DeferLoading {
			return "true"
		}
	}
	return "false"
}

// applyBetas maps the anthropic-beta header through the fixed whitelist.
func (p RequestPolicy) applyBetas(req *Request, values []string) error {
	rules := map[string]string{}
	for _, b := range p.Betas {
		rules[b.Name] = b.Mapping
	}
	seen := map[string]bool{}
	if len(strings.Join(values, ",")) > 8192 {
		return fmt.Errorf("anthropic-beta header is too large")
	}
	for _, value := range values {
		for _, name := range strings.Split(value, ",") {
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			if !betaName.MatchString(name) {
				return fmt.Errorf("invalid anthropic-beta name")
			}
			mapping, ok := rules[name]
			if !ok {
				if p.UnknownBeta == "reject" {
					return fmt.Errorf("unsupported anthropic-beta %q (CCGateway policy)", name)
				}
				continue
			}
			if seen[name] {
				continue
			}
			seen[name] = true
			p.applyBeta(req, name, mapping)
		}
	}
	return nil
}
func (p RequestPolicy) applyBeta(req *Request, name, mapping string) {
	switch mapping {
	case "fine_grained_tools":
		req.FineGrainedTools = true
		req.Betas = append(req.Betas, name)
	case "tool_search":
		if p.ToolSearch != "false" && !req.NoTools && len(req.Tools) > 0 {
			req.ToolSearch = "true"
			req.Betas = append(req.Betas, name)
		}
	case "fast":
		if p.AllowFast {
			req.Betas = append(req.Betas, name)
		}
	case "forward":
		req.Betas = append(req.Betas, name)
	}
}

// Check only protocol locations, never tool schemas or arbitrary tool inputs.
func hasRequestCacheControl(o Object) bool {
	if _, exists := o["cache_control"]; exists {
		return true
	}
	var checkBlocks func(any) bool
	checkBlocks = func(value any) bool {
		blocks, _ := value.([]any)
		for _, v := range blocks {
			b, _ := v.(map[string]any)
			if _, exists := b["cache_control"]; exists {
				return true
			}
			if str(b, "type") == "tool_result" && checkBlocks(b["content"]) {
				return true
			}
		}
		return false
	}
	if checkBlocks(o["system"]) || checkBlocks(o["tools"]) {
		return true
	}
	messages, _ := o["messages"].([]any)
	for _, v := range messages {
		m, _ := v.(map[string]any)
		if checkBlocks(m["content"]) {
			return true
		}
	}
	return false
}

var toolSearchThresholdPattern = regexp.MustCompile(`^auto:(0|[1-9][0-9]?|100)$`)

func validToolSearch(value string) bool {
	if value == "request" || value == "false" || value == "true" || value == "auto" {
		return true
	}
	return toolSearchThresholdPattern.MatchString(value)
}

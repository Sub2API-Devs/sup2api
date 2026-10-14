package engine

import (
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"net/http"
	"regexp"
	"strings"
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
	// Which side's system attachments (environment, date, tokens, session_context)
	// to keep: "client" (default), "gateway", or "both".
	AttachmentSource         string            `json:"attachment_source"`
	AttachmentSources        map[string]string `json:"attachment_sources,omitempty"`
	UnknownClientAttachment  string            `json:"unknown_client_attachment"`
	UnknownGatewayAttachment string            `json:"unknown_gateway_attachment"`
	// Client attachment types erased before admission (client_attachment_erase.go);
	// empty keeps every client attachment as sent.
	EraseClientAttachments []string `json:"erase_client_attachments,omitempty"`
	// Client attachment types replaced in place with Claude Code's own
	// rendering on this Worker (gateway_attachments.go); never erased ones.
	ReplaceClientAttachments []string `json:"replace_client_attachments,omitempty"`
	// gatewayAttachments is the rendering used for ReplaceClientAttachments,
	// set by the Worker (never by the host's header).
	gatewayAttachments map[string]string
	CustomToolPrefix   string `json:"custom_tool_prefix"`
	// "pass" (default) or "omit": see applyThinkingDisabledCompat.
	ThinkingDisabledCompat string `json:"thinking_disabled_compat,omitempty"`
	RelayMode              string `json:"relay_mode,omitempty"`
}

func defaultRequestPolicy() RequestPolicy {
	return RequestPolicy{SchemaVersion: features.PolicySchemaVersion, UnknownClientAttachment: "pass", UnknownGatewayAttachment: "pass", CustomToolPrefix: "ccgateway", UnknownBeta: "ignore", UnknownField: "reject", AllowFast: false, AllowEffort: true, ToolSearch: "request", AttachmentSource: "client", ThinkingDisabledCompat: "pass", RelayMode: "native", Betas: features.BetaRules()}
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
	if err := validateEraseClientAttachments(p.EraseClientAttachments); err != nil {
		return p, err
	}
	if err := features.ValidateReplaceClientAttachments(p.ReplaceClientAttachments, p.EraseClientAttachments); err != nil {
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
	if p.ThinkingDisabledCompat == "" {
		p.ThinkingDisabledCompat = "pass"
	}
	if !validThinkingDisabledCompat(p.ThinkingDisabledCompat) {
		return p, fmt.Errorf("invalid thinking_disabled_compat: must be pass or omit")
	}
	if p.RelayMode == "" {
		p.RelayMode = "native"
	}
	if p.RelayMode != "native" {
		return p, fmt.Errorf("invalid relay_mode: must be native")
	}
	// Ignore legacy editable rules; Beta handling is fixed in code.
	p.Betas = defaultRequestPolicy().Betas
	return p, nil
}
func parsePolicyRequest(body []byte, h http.Header) (*Request, error) {
	return parsePolicyRequestWithResources(body, h, nil)
}
func parsePolicyRequestWithResources(body []byte, h http.Header, access *resourceAdmission) (*Request, error) {
	return parsePolicyRequestWithHelper(body, h, access, nil)
}

func parsePolicyRequestWithHelper(body []byte, h http.Header, access *resourceAdmission, helper *helperHistoryExecution) (*Request, error) {
	return parsePolicyRequestWithGateway(body, h, access, helper, nil)
}

// parsePolicyRequestWithGateway also takes Claude Code's own rendering of the
// replaced attachment types (gateway_attachments.go); without one a type is
// kept as sent.
func parsePolicyRequestWithGateway(body []byte, h http.Header, access *resourceAdmission, helper *helperHistoryExecution, gateway map[string]string) (*Request, error) {
	if helper != nil && !helper.authenticated {
		return nil, fmt.Errorf("helper execution is not authenticated")
	}
	p, err := requestPolicy(h)
	if err != nil {
		return nil, err
	}
	if helper != nil {
		return nil, passthroughRefusal("helper history", "every upstream request is Claude Code's own")
	}
	p.gatewayAttachments = map[string]string{}
	for _, typ := range p.ReplaceClientAttachments {
		if text, ok := gateway[typ]; ok && strings.TrimSpace(text) != "" {
			p.gatewayAttachments[typ] = text
		}
	}
	return parsePassthroughRequest(body, h, p, access)
}

// filterFields rejects or drops body fields outside the supported set.
func (p RequestPolicy) filterFields(o Object) error {
	if _, exists := o["fallback_credit_token"]; exists {
		return fmt.Errorf("fallback_credit_token requires issuing-account affinity, original-body/beta matching and five-minute redemption tracking; cross-account credit redemption is not yet implemented")
	}
	if _, exists := o["fallbacks"]; exists {
		return fmt.Errorf("fallbacks must be admitted by the explicit model-chain plan before field filtering")
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

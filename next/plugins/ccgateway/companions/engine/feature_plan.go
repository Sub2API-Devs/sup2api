package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"strings"
	"unicode/utf8"
)

// RequestPlan owns copies of the client's raw request and validated generation
// controls. Its maps are private: applying a plan cannot mutate the next run.
// Only the relay's identified main model request may apply these controls.
type RequestPlan struct {
	container     *providerContainerPlan
	fallbacks     json.RawMessage
	taskBudget    json.RawMessage
	apiGeneration bool
	cache         *CachePlan
	raw           []byte
	fields        map[string]json.RawMessage
}

func (p *RequestPlan) RawRequest() []byte {
	if p == nil {
		return nil
	}
	return append([]byte(nil), p.raw...)
}

// MainRequestFields returns a fresh diagnostic view, never the plan's storage.
func (p *RequestPlan) MainRequestFields() Object {
	out := Object{}
	if p != nil {
		for key, raw := range p.fields {
			value, _ := decodePlannedValue(raw)
			out[key] = value
		}
	}
	return out
}

func decodePlannedValue(raw json.RawMessage) (any, error) {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var value any
	err := decoder.Decode(&value)
	return value, err
}

func (r *Request) HasMainRequestFeatures() bool {
	return len(r.imageCarriers) > 0 || len(requestFallbackBlocks(r)) > 0 || r.continuation != "" || r.hasInlineSystemMetadata() || len(r.ServerTools) > 0 || len(r.toolMetadataKey()) > 0 || r.hasHistoryCitations() || r.Plan != nil && (len(r.Plan.fields) > 0 || r.Plan.cache != nil)
}

// FeatureDecisions reports requested controls without including raw user data.
func (p *RequestPlan) FeatureDecisions() []Object {
	var out []Object
	if p != nil {
		if len(p.taskBudget) > 0 {
			out = append(out, Object{"field": "output_config.task_budget", "action": "apply_main_request_advisory_budget", "stage": "outbound_relay"})
		}
		if p.cache != nil {
			out = append(out, Object{"field": "cache_control", "action": "restore_exact_protocol_breakpoints", "stage": "outbound_relay"})
		}
		for _, field := range []string{"max_tokens", "temperature", "top_p", "top_k", "stop_sequences", "metadata", "service_tier", "inference_geo", "speed", "diagnostics", "tool_choice", "safeguards", "thinking", "output_config", "context_management", "compaction", "fallbacks", "container"} {
			if _, exists := p.fields[field]; exists {
				decision := Object{"field": field, "action": "apply_main_request", "stage": "outbound_relay"}
				if field == "metadata" {
					decision["mapping"] = "explicit_client_object_replaces_cli_metadata"
				}
				if field == "inference_geo" {
					decision["action"] = "apply_all_model_requests_and_block_auxiliary_count"
				}
				out = append(out, decision)
			}
		}
	}
	return out
}

func parseRequestPlan(body []byte, o Object) (*RequestPlan, error) {
	p := &RequestPlan{raw: append([]byte(nil), body...), fields: map[string]json.RawMessage{}}
	if value, exists := o["container"]; exists {
		var err error
		p.container, err = parseProviderContainer(value)
		if err != nil {
			return nil, err
		}
		p.fields["container"], _ = json.Marshal(value)
		delete(o, "container")
	}
	if err := p.takeFallbacks(o); err != nil {
		return nil, err
	}
	var cacheErr error
	p.cache, cacheErr = compileCachePlan(o)
	if cacheErr != nil {
		return nil, cacheErr
	}
	// The CLI's environment setting is only a hint: it clamps large values to
	// its model default. Keep the admitted API limit authoritative at the main
	// request boundary. Leave it in o for the request parser's integer checks.
	if value, exists := o["max_tokens"]; exists {
		p.fields["max_tokens"], _ = json.Marshal(value)
	}
	if err := parseContextCompaction(p, o); err != nil {
		return nil, err
	}
	if err := parseSafeguards(p, o); err != nil {
		return nil, err
	}
	if err := parseAPIDiagnostics(p, o); err != nil {
		return nil, err
	}
	for _, name := range []string{"temperature", "top_p", "top_k", "stop_sequences", "metadata", "service_tier", "inference_geo"} {
		value, exists := o[name]
		if !exists {
			continue
		}
		if err := validateGenerationField(name, value); err != nil {
			return nil, err
		}
		p.fields[name], _ = json.Marshal(value)
		delete(o, name)
	}
	if value, exists := o["tool_choice"]; exists {
		choice, ok := value.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("tool_choice must be an object")
		}
		if err := keys(choice, "type", "name", "disable_parallel_tool_use"); err != nil {
			return nil, err
		}
		kind := str(choice, "type")
		switch kind {
		case "auto", "none", "any", "tool":
		default:
			return nil, fmt.Errorf("tool_choice.type must be auto, none, any or tool")
		}
		if kind == "tool" {
			if !toolName.MatchString(str(choice, "name")) {
				return nil, fmt.Errorf("tool_choice.name must name a declared tool")
			}
		} else if _, exists := choice["name"]; exists {
			return nil, fmt.Errorf("tool_choice.name is only valid with type tool")
		}
		if parallel, exists := choice["disable_parallel_tool_use"]; exists {
			if _, ok := parallel.(bool); !ok || kind == "none" {
				return nil, fmt.Errorf("invalid tool_choice.disable_parallel_tool_use")
			}
		}
		p.fields["tool_choice"], _ = json.Marshal(choice)
		// The legacy parser needs only the local tool exposure decision. The
		// exact API choice is applied later after wire tool names are known.
		localType := "auto"
		if kind == "none" {
			localType = "none"
		}
		o["tool_choice"] = Object{"type": localType}
	}
	return p, nil
}

func validateGenerationField(name string, value any) error {
	switch name {
	case "temperature", "top_p", "top_k":
		n, ok := value.(json.Number)
		if !ok {
			return fmt.Errorf("%s must be a number", name)
		}
		v, err := n.Float64()
		if err != nil || math.IsNaN(v) || math.IsInf(v, 0) || v < 0 {
			return fmt.Errorf("invalid %s", name)
		}
		// Float64 rounds tiny negative values to -0 and decimals just above
		// one to 1. Preserve the JSON number but validate its actual range.
		mantissa := strings.SplitN(strings.ToLower(n.String()), "e", 2)[0]
		if strings.HasPrefix(mantissa, "-") && strings.Trim(mantissa, "-0.") != "" {
			return fmt.Errorf("invalid %s", name)
		}
		if name == "top_k" {
			if _, err := n.Int64(); err != nil {
				return fmt.Errorf("top_k must be a nonnegative integer")
			}
		} else if v > 1 {
			return fmt.Errorf("%s must be between 0 and 1", name)
		} else if v == 1 {
			// Precision scales with the supplied decimal digits; exponent-only
			// magnitude cannot be unbounded here because Float64 resolved to 1.
			exact, _, err := big.ParseFloat(n.String(), 10, uint(len(n.String())*4+64), big.ToNearestEven)
			if err != nil || exact.Cmp(big.NewFloat(1)) > 0 {
				return fmt.Errorf("%s must be between 0 and 1", name)
			}
		}
	case "stop_sequences":
		items, ok := value.([]any)
		if !ok {
			return fmt.Errorf("stop_sequences must be an array of strings")
		}
		for _, item := range items {
			if _, ok := item.(string); !ok {
				return fmt.Errorf("stop_sequences must be an array of strings")
			}
		}
	case "metadata":
		metadata, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("metadata must be an object")
		}
		if err := keys(metadata, "user_id"); err != nil {
			return fmt.Errorf("metadata: %w", err)
		}
		if id, exists := metadata["user_id"]; exists && id != nil {
			s, ok := id.(string)
			if !ok || utf8.RuneCountInString(s) > 512 {
				return fmt.Errorf("metadata.user_id must be null or a string of at most 512 characters")
			}
		}
	case "service_tier":
		if value != "auto" && value != "standard_only" {
			return fmt.Errorf("service_tier must be auto or standard_only")
		}
	case "inference_geo":
		if value != nil && value != "us" && value != "global" {
			return fmt.Errorf("inference_geo must be null, us or global")
		}
	}
	return nil
}

func (p *RequestPlan) validateTools(req *Request) error {
	if p == nil {
		return nil
	}
	var choice Object
	if raw := p.fields["tool_choice"]; len(raw) != 0 {
		_ = json.Unmarshal(raw, &choice)
	}
	kind := str(choice, "type")
	if req.CacheWarmup && (req.Stream || str(req.Thinking, "type") == "enabled" || req.structuredOutput() || kind == "any" || kind == "tool") {
		return fmt.Errorf("max_tokens: 0 requires nonstreaming without enabled thinking, output format or forced tool_choice")
	}
	if kind != "any" && kind != "tool" {
		return nil
	}
	if len(req.Tools) == 0 && len(req.ServerTools) == 0 && len(req.APIClientTools) == 0 && req.MCP == nil {
		return fmt.Errorf("forced tool_choice requires declared tools")
	}
	// Manual thinking cannot force tools. Adaptive thinking can, depending on
	// the model; forward that combination and preserve the upstream decision.
	if str(req.Thinking, "type") == "enabled" {
		return fmt.Errorf("forced tool_choice is incompatible with manual thinking")
	}
	if kind == "tool" {
		if req.acceptsAPIClientIdentity(ToolIdentity{Name: str(choice, "name")}) {
			return nil
		}
		if req.hasServerSearch(str(choice, "name")) {
			return nil
		}
		for _, tool := range req.Tools {
			if tool.Name == str(choice, "name") {
				return nil
			}
		}
		return fmt.Errorf("tool_choice.name must name a declared tool")
	}
	return nil
}

func (p *RequestPlan) validateInternalRounds(req *Request) error {
	if p != nil && p.cache != nil && (req.toolSearchEnabled() || req.structuredOutput()) {
		return fmt.Errorf("explicit cache_control with internal CLI tool rounds requires cache-boundary adaptation")
	}
	if req.CacheWarmup && req.JSONSchema != nil {
		return fmt.Errorf("max_tokens: 0 is incompatible with output_config.format")
	}
	if err := p.validateSafeguardRounds(req); err != nil {
		return err
	}
	if p == nil {
		return nil
	}
	var choice Object
	if raw := p.fields["tool_choice"]; len(raw) != 0 {
		_ = json.Unmarshal(raw, &choice)
	}
	kind := str(choice, "type")
	if (kind == "tool" || kind == "any") && (req.toolSearchEnabled() || req.structuredOutput()) {
		return fmt.Errorf("forced tool_choice with internal tool search or structured output requires continuation-phase adaptation")
	}
	return nil
}

// ApplyMainRequestFeatures is intentionally separate from CLI configuration:
// CC can issue auxiliary classification and token-count requests which must not
// receive the caller's sampling, metadata, stop or forced-tool controls.
func (r *Request) ApplyMainRequestFeatures(message Object) error {
	if r.Plan == nil {
		return r.applyCompleteToolCatalog(message)
	}
	patch := Object{}
	if len(r.Plan.fields["safeguards"]) != 0 {
		if err := r.validateSafeguardTools(message); err != nil {
			return err
		}
	}
	for name, raw := range r.Plan.fields {
		value, err := decodePlannedValue(raw)
		if err != nil {
			return fmt.Errorf("invalid planned field %s", name)
		}
		// metadata.user_id is an external opaque attribution value, not an
		// authentication credential. Explicit metadata follows the client object
		// exactly (including {} and null user_id); do not decode or merge the
		// CLI's JSON-shaped user_id string. Missing metadata leaves CLI defaults.
		if name == "tool_choice" {
			choice := value.(map[string]any)
			if str(choice, "type") == "tool" {
				choice["name"] = r.wireName(str(choice, "name"))
			}
		}
		if name == "context_management" && value != nil {
			r.mapContextToolNames(value.(map[string]any))
		}
		patch[name] = value
	}
	for name, value := range patch {
		message[name] = value
	}
	if r.Plan.apiGeneration {
		for _, name := range []string{"thinking", "output_config", "speed", "diagnostics", "container"} {
			if _, explicit := patch[name]; !explicit {
				delete(message, name)
			}
		}
	}
	if err := r.applyCompleteToolCatalog(message); err != nil {
		return err
	}
	return r.applyMCPConnector(message)
}

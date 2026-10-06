package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Only the authenticated host/controller can provide this internal header.
const policyHeader = "X-CCGateway-Request-Policy"

type BetaRule struct {
	Name    string `json:"name"`
	Mapping string `json:"mapping"`
}
type RequestPolicy struct {
	UnknownBeta  string     `json:"unknown_beta"`
	UnknownField string     `json:"unknown_field"`
	AllowFast    bool       `json:"allow_fast"`
	ToolSearch   string     `json:"tool_search,omitempty"`
	AllowEffort  bool       `json:"allow_effort"`
	Betas        []BetaRule `json:"betas"`
	// Upstream errors end the run and reach the client as the API sent them,
	// instead of being handled (retried, backed off) by Claude Code.
	PassUpstreamErrors bool `json:"pass_upstream_errors"`
}

func defaultRequestPolicy() RequestPolicy {
	return RequestPolicy{UnknownBeta: "ignore", UnknownField: "reject", AllowFast: false, AllowEffort: true, ToolSearch: "request", Betas: []BetaRule{
		{"interleaved-thinking-2025-05-14", "forward"}, {"fine-grained-tool-streaming-2025-05-14", "fine_grained_tools"},
		{"context-1m-2025-08-07", "forward"}, {"fast-mode-2026-02-01", "fast"},
		{"advanced-tool-use-2025-11-20", "tool_search"},
		{"dev-full-thinking-2025-05-14", "forward"},
		{"model-context-window-exceeded-2025-08-26", "forward"},
	}}
}

var betaName = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{0,127}$`)

func requestPolicy(h http.Header) (RequestPolicy, error) {
	p := defaultRequestPolicy()
	if raw := h.Get(policyHeader); raw != "" {
		if len(raw) > 16384 {
			return p, fmt.Errorf("invalid gateway request policy")
		}
		if err := json.Unmarshal([]byte(raw), &p); err != nil {
			return p, fmt.Errorf("invalid gateway request policy")
		}
	}
	if (p.UnknownBeta != "reject" && p.UnknownBeta != "ignore") || (p.UnknownField != "reject" && p.UnknownField != "ignore") {
		return p, fmt.Errorf("invalid gateway request policy")
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
	allowed := map[string]bool{}
	for _, k := range []string{"model", "max_tokens", "stream", "system", "messages", "tools", "tool_choice", "thinking", "cache_control", "speed", "output_config", "output_format"} {
		allowed[k] = true
	}
	for k := range o {
		if !allowed[k] {
			if p.UnknownField == "reject" {
				return nil, fmt.Errorf("unsupported request field %q (CCGateway policy)", k)
			}
			delete(o, k)
		}
	}
	fast := new(bool)
	if v, ok := o["speed"]; ok {
		if p.AllowFast {
			speed, ok := v.(string)
			if !ok || (speed != "fast" && speed != "standard") {
				return nil, fmt.Errorf("speed must be fast or standard")
			}
			b := speed == "fast"
			fast = &b
		}
		delete(o, "speed")
	}
	effort := ""
	var schema Object
	format := o["output_format"]
	delete(o, "output_format")
	if v, ok := o["output_config"]; ok {
		cfg, ok := v.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("output_config must be an object")
		}
		if current, exists := cfg["format"]; exists {
			if format != nil {
				return nil, fmt.Errorf("use output_config.format or output_format, not both")
			}
			format = current
		}
		for k, v := range cfg {
			if k == "format" {
				continue
			}
			if k != "effort" || !p.AllowEffort {
				if p.UnknownField == "reject" {
					return nil, fmt.Errorf("unsupported request field output_config.%s (CCGateway policy)", k)
				}
				continue
			}
			effort, ok = v.(string)
			if !ok {
				return nil, fmt.Errorf("output_config.effort must be a string")
			}
			switch effort {
			case "low", "medium", "high", "xhigh", "max":
			default:
				return nil, fmt.Errorf("invalid output_config.effort")
			}
		}
		delete(o, "output_config")
	}
	if format != nil {
		f, ok := format.(map[string]any)
		if !ok || str(f, "type") != "json_schema" {
			return nil, fmt.Errorf("output_config.format must be a json_schema object")
		}
		if err := keys(f, "type", "schema"); err != nil {
			return nil, err
		}
		schema, ok = f["schema"].(map[string]any)
		if !ok || len(schema) == 0 {
			return nil, fmt.Errorf("output_config.format.schema must be a non-empty JSON Schema object")
		}
		encoded, _ := json.Marshal(schema)
		if len(encoded) > 64<<10 {
			return nil, fmt.Errorf("output_config.format.schema exceeds 64 KiB")
		}
	}
	if schema != nil {
		if _, err := compileOutputSchema(schema); err != nil {
			return nil, fmt.Errorf("invalid output_config.format.schema: %w", err)
		}
	}
	cacheRequested := hasRequestCacheControl(o)
	data, _ := json.Marshal(o)
	req, err := parseRequest(data)
	if err != nil {
		return nil, err
	}
	req.Fast = fast
	req.Effort = effort
	req.JSONSchema = schema
	req.PassUpstreamErrors = p.PassUpstreamErrors
	req.ToolSearch = p.ToolSearch
	if req.ToolSearch == "request" {
		req.ToolSearch = "false"
		for _, tool := range req.Tools {
			if tool.DeferLoading != nil && *tool.DeferLoading {
				req.ToolSearch = "true"
			}
		}
	}
	if req.NoTools {
		req.ToolSearch = "false"
	}
	if cacheRequested {
		req.PromptCacheTTL = "5m"
		if req.TTL == time.Hour {
			req.PromptCacheTTL = "1h"
		}
	}
	rules := map[string]string{}
	for _, b := range p.Betas {
		rules[b.Name] = b.Mapping
	}
	seen := map[string]bool{}
	values := h.Values("anthropic-beta")
	if len(strings.Join(values, ",")) > 8192 {
		return nil, fmt.Errorf("anthropic-beta header is too large")
	}
	for _, value := range values {
		for _, name := range strings.Split(value, ",") {
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			if !betaName.MatchString(name) {
				return nil, fmt.Errorf("invalid anthropic-beta name")
			}
			mapping, ok := rules[name]
			if !ok {
				if p.UnknownBeta == "reject" {
					return nil, fmt.Errorf("unsupported anthropic-beta %q (CCGateway policy)", name)
				}
				continue
			}
			if seen[name] {
				continue
			}
			seen[name] = true
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
				if !p.AllowFast {
					continue
				}
				req.Betas = append(req.Betas, name)
			case "forward":
				req.Betas = append(req.Betas, name)
			}
		}
	}
	return req, nil
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

func validToolSearch(value string) bool {
	if value == "request" || value == "false" || value == "true" || value == "auto" {
		return true
	}
	if strings.HasPrefix(value, "auto:") {
		n, err := strconv.Atoi(strings.TrimPrefix(value, "auto:"))
		return err == nil && n >= 1 && n <= 100
	}
	return false
}

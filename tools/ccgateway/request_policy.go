package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
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
	AllowEffort  bool       `json:"allow_effort"`
	Betas        []BetaRule `json:"betas"`
}

func defaultRequestPolicy() RequestPolicy {
	return RequestPolicy{UnknownBeta: "ignore", UnknownField: "reject", AllowFast: false, AllowEffort: true, Betas: []BetaRule{
		{"claude-code-20250219", "native"}, {"oauth-2025-04-20", "native"},
		{"interleaved-thinking-2025-05-14", "forward"}, {"fine-grained-tool-streaming-2025-05-14", "fine_grained_tools"},
		{"context-1m-2025-08-07", "forward"}, {"fast-mode-2026-02-01", "fast"},
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
	if (p.UnknownBeta != "reject" && p.UnknownBeta != "ignore") || (p.UnknownField != "reject" && p.UnknownField != "ignore") || len(p.Betas) > 64 {
		return p, fmt.Errorf("invalid gateway request policy")
	}
	seen := map[string]bool{}
	for _, b := range p.Betas {
		if !betaName.MatchString(b.Name) || seen[b.Name] {
			return p, fmt.Errorf("invalid gateway beta policy")
		}
		seen[b.Name] = true
		switch b.Mapping {
		case "forward", "native":
		case "fast":
			if b.Name != "fast-mode-2026-02-01" {
				return p, fmt.Errorf("invalid gateway beta mapping")
			}
		case "fine_grained_tools":
			if b.Name != "fine-grained-tool-streaming-2025-05-14" {
				return p, fmt.Errorf("invalid gateway beta mapping")
			}
		default:
			return p, fmt.Errorf("invalid gateway beta mapping")
		}
	}
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
	for _, k := range []string{"model", "max_tokens", "stream", "system", "messages", "tools", "tool_choice", "thinking", "cache_control", "speed", "output_config"} {
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
	if v, ok := o["output_config"]; ok {
		cfg, ok := v.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("output_config must be an object")
		}
		for k, v := range cfg {
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
	data, _ := json.Marshal(o)
	req, err := parseRequest(data)
	if err != nil {
		return nil, err
	}
	req.Fast = fast
	req.Effort = effort
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
			case "native": // CLI owns its authentication and native capability headers.
			case "fine_grained_tools":
				req.FineGrainedTools = true
				req.Betas = append(req.Betas, name)
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

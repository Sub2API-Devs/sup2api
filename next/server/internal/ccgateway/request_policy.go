package ccgateway

import (
	"errors"
	"strconv"
	"strings"
)

// RequestPolicy is supplied by the authenticated host, never by API callers.
type RequestPolicy struct {
	UnknownBeta  string     `json:"unknown_beta"`
	UnknownField string     `json:"unknown_field"`
	AllowFast    bool       `json:"allow_fast"`
	ToolSearch   string     `json:"tool_search,omitempty"`
	AllowEffort  bool       `json:"allow_effort"`
	Betas        []BetaRule `json:"betas"`
}
type BetaRule struct {
	Name    string `json:"name"`
	Mapping string `json:"mapping"`
}

func defaultRequestPolicy() RequestPolicy {
	return RequestPolicy{UnknownBeta: "ignore", UnknownField: "reject", AllowFast: false, AllowEffort: true, ToolSearch: "request", Betas: []BetaRule{
		{"interleaved-thinking-2025-05-14", "forward"},
		{"fine-grained-tool-streaming-2025-05-14", "fine_grained_tools"},
		{"context-1m-2025-08-07", "forward"},
		{"fast-mode-2026-02-01", "fast"},
		{"advanced-tool-use-2025-11-20", "tool_search"},
		{"dev-full-thinking-2025-05-14", "forward"},
		{"model-context-window-exceeded-2025-08-26", "forward"},
	}}
}
func (c Config) EffectiveRequestPolicy() RequestPolicy {
	if c.RequestPolicy == nil {
		return defaultRequestPolicy()
	}
	p := *c.RequestPolicy
	if p.ToolSearch == "" {
		p.ToolSearch = "request"
	}
	p.Betas = defaultRequestPolicy().Betas
	return p
}

func validateRequestPolicy(p RequestPolicy) error {
	if (p.UnknownBeta != "reject" && p.UnknownBeta != "ignore") || (p.UnknownField != "reject" && p.UnknownField != "ignore") {
		return errors.New("invalid request policy")
	}
	if p.ToolSearch != "" && !validToolSearch(p.ToolSearch) {
		return errors.New("invalid tool search policy")
	}
	return nil
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

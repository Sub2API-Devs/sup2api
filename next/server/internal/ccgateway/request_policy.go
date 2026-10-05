package ccgateway

import (
	"errors"
	"regexp"
)

// RequestPolicy is supplied by the authenticated host, never by API callers.
type RequestPolicy struct {
	UnknownBeta  string     `json:"unknown_beta"`
	UnknownField string     `json:"unknown_field"`
	AllowFast    bool       `json:"allow_fast"`
	AllowEffort  bool       `json:"allow_effort"`
	Betas        []BetaRule `json:"betas"`
}
type BetaRule struct {
	Name    string `json:"name"`
	Mapping string `json:"mapping"`
}

func defaultRequestPolicy() RequestPolicy {
	return RequestPolicy{UnknownBeta: "ignore", UnknownField: "reject", AllowFast: false, AllowEffort: true, Betas: []BetaRule{
		{"claude-code-20250219", "native"}, {"oauth-2025-04-20", "native"},
		{"interleaved-thinking-2025-05-14", "forward"},
		{"fine-grained-tool-streaming-2025-05-14", "fine_grained_tools"},
		{"context-1m-2025-08-07", "forward"},
		{"fast-mode-2026-02-01", "fast"},
	}}
}
func (c Config) EffectiveRequestPolicy() RequestPolicy {
	if c.RequestPolicy == nil {
		return defaultRequestPolicy()
	}
	p := *c.RequestPolicy
	if p.Betas == nil {
		p.Betas = []BetaRule{}
	}
	return p
}

var betaName = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{0,127}$`)

func validateRequestPolicy(p RequestPolicy) error {
	if (p.UnknownBeta != "reject" && p.UnknownBeta != "ignore") || (p.UnknownField != "reject" && p.UnknownField != "ignore") || len(p.Betas) > 64 {
		return errors.New("invalid request policy")
	}
	seen := map[string]bool{}
	for _, b := range p.Betas {
		if !betaName.MatchString(b.Name) || seen[b.Name] {
			return errors.New("invalid or duplicate beta name")
		}
		seen[b.Name] = true
		switch b.Mapping {
		case "native", "forward":
		case "fine_grained_tools":
			if b.Name != "fine-grained-tool-streaming-2025-05-14" {
				return errors.New("invalid fine-grained tool beta mapping")
			}
		case "fast":
			if b.Name != "fast-mode-2026-02-01" {
				return errors.New("invalid fast beta mapping")
			}
		default:
			return errors.New("unsupported beta mapping")
		}
	}
	return nil
}

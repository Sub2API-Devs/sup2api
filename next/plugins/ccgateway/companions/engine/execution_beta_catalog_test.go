package engine

import (
	"encoding/json"
	"testing"
)

func TestExecutionLegacyBetasForwardWithoutBecomingRequired(t *testing.T) {
	body, _ := json.Marshal(basic())
	for _, beta := range []string{"", "code-execution-2025-05-22", "code-execution-2025-08-25", "skills-2025-10-02"} {
		t.Run(beta, func(t *testing.T) {
			policy := defaultRequestPolicy()
			policy.UnknownBeta = "reject"
			h := policyHeaders(policy)
			if beta != "" {
				h.Set("anthropic-beta", beta)
			}
			req, err := parsePolicyRequest(body, h)
			if err != nil {
				t.Fatal(err)
			}
			if beta == "" {
				if len(req.Betas) != 0 {
					t.Fatalf("legacy beta injected: %v", req.Betas)
				}
			} else if len(req.Betas) != 1 || req.Betas[0] != beta {
				t.Fatalf("beta not preserved: %v", req.Betas)
			}
		})
	}
}

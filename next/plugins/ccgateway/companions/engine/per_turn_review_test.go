package engine

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReviewPerTurnControlIndependentAdmission(t *testing.T) {
	for _, mode := range []string{"both", "misspelled", "clear-only", "perturn-with-clear", "both-clear"} {
		t.Run(mode, func(t *testing.T) {
			body := basic()
			directive := Object{"role": "system", "content": "fixture", "output_config": Object{"effort": "medium"}}
			h := http.Header{}
			var betas []string
			switch mode {
			case "both":
				betas = []string{ccPerTurnBeta, publicPerTurnBeta}
			case "misspelled":
				betas = []string{"per-turn-control-2026-07-02"}
			case "clear-only":
				betas = []string{"mid-conversation-system-clear-at-2026-08-21"}
			case "perturn-with-clear":
				betas = []string{ccPerTurnBeta}
				directive["clear_at"] = "next_user_message"
			case "both-clear":
				betas = []string{ccPerTurnBeta, "mid-conversation-system-clear-at-2026-08-21"}
				directive["clear_at"] = "next_user_message"
			}
			for _, beta := range betas {
				h.Add("Anthropic-Beta", beta)
			}
			body["messages"] = []any{Object{"role": "user", "content": "start"}, directive}
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			r, err := parsePolicyRequest(raw, h)
			if mode == "perturn-with-clear" || mode == "both-clear" {
				require.ErrorContains(t, err, "next_user_message cannot carry output_config")
				return
			}
			require.NoError(t, err, "beta names are the client's, not a gateway allowlist")
			assert.Equal(t, betas, r.Betas)
			assert.Equal(t, strings.Join(betas, ","), cliEnv(r, true)["ANTHROPIC_BETAS"])
			require.Len(t, r.Messages, 2)
			assert.Equal(t, `{"effort":"medium"}`, string(r.Messages[1].OutputConfig))
		})
	}
}

func TestReviewPerTurnLegacyPolicyDoesNotMaskNewRule(t *testing.T) {
	p := defaultRequestPolicy()
	p.UnknownBeta = "reject"
	p.Betas = []BetaRule{{Name: publicPerTurnBeta, Mapping: "forward"}}
	body := basic()
	body["messages"] = []any{Object{"role": "user", "content": "fixture"}, Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "medium"}}}
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	for _, allowEffort := range []bool{true, false} {
		p.AllowEffort = allowEffort
		for _, beta := range []string{ccPerTurnBeta, "not-a-known-beta", ""} {
			h := policyHeaders(p)
			h.Set("Anthropic-Beta", beta)
			r, err := parsePolicyRequest(raw, h)
			require.NoError(t, err)
			require.Len(t, r.Messages, 2)
			assert.True(t, r.Messages[1].directiveOnly(), "legacy policies must not delete directive-only turns")
			assert.Equal(t, `{"effort":"medium"}`, string(r.Messages[1].OutputConfig))
			assert.Equal(t, beta, cliEnv(r, true)["ANTHROPIC_BETAS"])
		}
	}
}

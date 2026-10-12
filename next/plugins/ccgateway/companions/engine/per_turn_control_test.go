package engine

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const ccPerTurnBeta = "per-turn-control-2026-07-01"
const publicPerTurnBeta = "mid-conversation-output-config-2026-07-01"

func TestCCPerTurnControlAdmission(t *testing.T) {
	for _, beta := range []string{ccPerTurnBeta, publicPerTurnBeta} {
		t.Run(beta, func(t *testing.T) {
			for _, mode := range []string{"valid", "missing-beta", "role", "schema", "effort", "clear-at", "policy"} {
				t.Run(mode, func(t *testing.T) {
					directive := Object{"role": "system", "content": "fixture environment", "output_config": Object{"effort": "medium"}}
					headers := http.Header{"Anthropic-Beta": []string{beta}}
					wantError := ""
					switch mode {
					case "missing-beta":
						headers.Del("Anthropic-Beta")
					case "role":
						directive["role"] = "user"
						wantError = "output_config"
					case "schema":
						directive["output_config"] = Object{"format": Object{}}
						wantError = "format"
					case "effort":
						directive["output_config"] = Object{"effort": "invented"}
						wantError = "effort"
					case "clear-at":
						directive["clear_at"] = "next_user_message"
						wantError = "next_user_message cannot carry output_config"
					case "policy":
						p := defaultRequestPolicy()
						p.AllowEffort = false
						headers.Set(policyHeader, policyHeaders(p).Get(policyHeader))
					}
					body := basic()
					body["messages"] = []any{Object{"role": "user", "content": "fixture"}, directive}
					raw, err := json.Marshal(body)
					require.NoError(t, err)
					req, err := parsePolicyRequest(raw, headers)
					if wantError != "" {
						require.ErrorContains(t, err, wantError)
						return
					}
					require.NoError(t, err, "native does not apply legacy beta/effort admission gates")
					if mode == "missing-beta" {
						assert.Empty(t, req.Betas, "gateway must not synthesize a client beta")
					} else {
						assert.Equal(t, []string{beta}, req.Betas)
					}
					require.Len(t, req.Messages, 2)
					assert.Equal(t, `{"effort":"medium"}`, string(req.Messages[1].OutputConfig))
					assert.Equal(t, []string{"fixture environment"}, systemTexts(req.Messages[1]))
					assert.Equal(t, "1", cliEnv(req, true)["CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM"])
					cfg, err := req.passthroughBodies()
					require.NoError(t, err)
					assert.Equal(t, "medium", req.Effort)
					assert.JSONEq(t, `{"effort":"medium"}`, string(cfg.First["output_config"]))
					assert.Equal(t, cfg.First["output_config"], cfg.Rest["output_config"])
					assert.NotContains(t, cfg.First, "messages")
					assert.NotContains(t, cfg.Rest, "messages")
				})
			}
		})
	}
}

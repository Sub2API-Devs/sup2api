package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

const ccPerTurnBeta = "per-turn-control-2026-07-01"
const publicPerTurnBeta = "mid-conversation-output-config-2026-07-01"

func TestCCPerTurnControlAdmission(t *testing.T) {
	for _, beta := range []string{ccPerTurnBeta, publicPerTurnBeta} {
		t.Run(beta, func(t *testing.T) {
			for _, invalid := range []string{"", "missing-beta", "role", "schema", "effort", "clear-at", "policy"} {
				t.Run(invalid, func(t *testing.T) {
					directive := Object{"role": "system", "content": "fixture environment", "output_config": Object{"effort": "medium"}}
					headers := http.Header{"Anthropic-Beta": []string{beta}}
					switch invalid {
					case "missing-beta":
						headers.Del("Anthropic-Beta")
					case "role":
						directive["role"] = "user"
					case "schema":
						directive["output_config"] = Object{"format": Object{}}
					case "effort":
						directive["output_config"] = Object{"effort": "invented"}
					case "clear-at":
						directive["clear_at"] = "next_user_message"
					case "policy":
						p := defaultRequestPolicy()
						p.AllowEffort = false
						b, _ := json.Marshal(p)
						headers.Set(policyHeader, string(b))
					}
					body := basic()
					body["messages"] = []any{Object{"role": "user", "content": "fixture"}, directive}
					raw, _ := json.Marshal(body)
					req, err := parsePolicyRequest(raw, headers)
					if invalid != "" {
						if err == nil {
							t.Fatal("invalid directive accepted")
						}
						return
					}
					if err != nil {
						t.Fatal(err)
					}
					if len(req.Betas) != 1 || req.Betas[0] != beta {
						t.Fatalf("beta renamed or dropped: %v", req.Betas)
					}
					if string(req.Messages[1].OutputConfig) != `{"effort":"medium"}` {
						t.Fatal("directive value changed")
					}
				})
			}
		})
	}
}

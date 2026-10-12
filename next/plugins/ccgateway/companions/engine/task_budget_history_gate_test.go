package engine

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Native task budgets remain provider generation fields even when the CLI
// discovers tools. They never authorize a separate hidden-helper ledger.
func TestTaskBudgetNativeHistoryWithoutHelperCustody(t *testing.T) {
	for _, remaining := range []string{"omitted", "null", "0", "32000", "9007199254740993", "3.20e4"} {
		for _, history := range []string{"new", "tool-result", "ordinary-followup"} {
			t.Run(history+"/"+remaining, func(t *testing.T) {
				body := basic()
				budget := `{"type":"tokens","total":64000`
				if remaining != "omitted" {
					budget += `,"remaining":` + remaining
				}
				config := `{"task_budget":` + budget + `}}`
				body["output_config"] = json.RawMessage(config)
				body["tools"] = []any{Object{"name": "weather", "defer_loading": true, "input_schema": Object{"type": "object"}}}
				if history == "new" {
					body["messages"] = []any{Object{"role": "user", "content": "fixture"}}
				} else if history == "tool-result" {
					body["messages"] = []any{
						Object{"role": "user", "content": "fixture"},
						Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "client-call", "name": "weather", "input": Object{}}}},
						Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "client-call", "content": "fixture result"}}},
					}
				} else {
					body["messages"] = []any{Object{"role": "user", "content": "fixture"}, Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "continue"}}
				}
				raw, err := json.Marshal(body)
				require.NoError(t, err)
				h := http.Header{"Anthropic-Beta": []string{taskBudgetBeta}}
				r, err := parsePolicyRequest(raw, h)
				require.NoError(t, err)
				assert.True(t, r.persistsSession())
				assert.True(t, r.toolSearchEnabled())
				assert.Contains(t, r.enabledTools(), "ToolSearch")
				assert.Nil(t, r.helperHistory)
				assert.Empty(t, r.Plan.taskBudget, "raw native budget must not activate helper accounting")
				cfg, err := r.passthroughBodies()
				require.NoError(t, err)
				for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
					assert.Equal(t, config, string(round["output_config"]), "null, omitted, zero and exact numbers are distinct")
				}
				assert.Equal(t, len(body["messages"].([]any)), len(r.Messages), "client history must not be deleted to satisfy a budget")
				if history == "tool-result" {
					assert.Equal(t, "client-call", str(r.Messages[1].Content[0], "id"))
					assert.Equal(t, "client-call", str(r.Messages[2].Content[0], "tool_use_id"))
					assert.Equal(t, "fixture result", str(r.Messages[2].Content[0], "content"))
				}
				_, err = parsePolicyRequestWithHelper(raw, h, nil, &helperHistoryExecution{})
				require.ErrorContains(t, err, "helper execution is not authenticated")
				_, err = parsePolicyRequestWithHelper(raw, h, nil, &helperHistoryExecution{authenticated: true})
				require.ErrorContains(t, err, "helper history is not supported by this gateway")
			})
		}
	}
}

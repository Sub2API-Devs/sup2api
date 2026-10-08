package engine

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// An in-memory helper ledger alone must never become permission to admit a
// task budget: the client's next request cannot echo those hidden rounds.
func TestTaskBudgetRequiresDurableHiddenHistory(t *testing.T) {
	for _, remaining := range []any{"omitted", nil, 0, 32000} {
		for _, history := range []string{"new", "tool-result", "ordinary-followup"} {
			t.Run(history+"/"+digest(remaining)[:8], func(t *testing.T) {
				body := basic()
				budget := Object{"type": "tokens", "total": 64000}
				if remaining != "omitted" {
					budget["remaining"] = remaining
				}
				body["output_config"] = Object{"task_budget": budget}
				body["tools"] = []any{Object{"name": "weather", "defer_loading": true, "input_schema": Object{"type": "object"}}}
				if history == "tool-result" {
					body["messages"] = []any{
						Object{"role": "user", "content": "fixture"},
						Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "client-call", "name": "weather", "input": Object{}}}},
						Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "client-call", "content": "fixture result"}}},
					}
				} else if history == "ordinary-followup" {
					body["messages"] = []any{Object{"role": "user", "content": "fixture"}, Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "continue"}}
				}
				raw, err := json.Marshal(body)
				if err != nil {
					t.Fatal(err)
				}
				_, err = parsePolicyRequest(raw, http.Header{"Anthropic-Beta": []string{taskBudgetBeta}})
				if err == nil || !strings.Contains(err.Error(), "durable restoration of hidden helper history") {
					t.Fatalf("expected history-specific gate, got %v", err)
				}
			})
		}
	}
}

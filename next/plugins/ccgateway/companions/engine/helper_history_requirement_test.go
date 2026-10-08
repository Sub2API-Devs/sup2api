package engine

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestHelperRequirementUsesActualParserWithoutRuntime(t *testing.T) {
	for _, mode := range []string{"ordinary", "old-history", "deferred", "disabled", "forced-eager", "server", "missing-beta", "invalid-budget"} {
		t.Run(mode, func(t *testing.T) {
			body := basic()
			body["output_config"] = Object{"task_budget": Object{"type": "tokens", "total": 20000}}
			policy := `{"tool_search":"request"}`
			want := "ordinary"
			status := 200
			switch mode {
			case "old-history":
				body["messages"] = []any{Object{"role": "user", "content": "first"}, Object{"role": "assistant", "content": "old"}, Object{"role": "user", "content": "next"}}
			case "deferred", "disabled":
				body["tools"] = []any{Object{"name": "weather", "defer_loading": true, "input_schema": Object{"type": "object"}}}
				if mode == "deferred" {
					want = "needs_custody"
				} else {
					policy = `{"tool_search":"false"}`
				}
			case "forced-eager":
				body["tools"] = []any{Object{"name": "weather", "defer_loading": false, "input_schema": Object{"type": "object"}}}
				body["tool_choice"] = Object{"type": "any"}
				policy = `{"tool_search":"true"}`
			case "server":
				body["tools"] = []any{Object{"name": "web_search", "type": "web_search_20250305"}}
				policy = `{"tool_search":"true"}`
			case "missing-beta":
				want = "defer_to_ordinary"
			case "invalid-budget":
				body["output_config"] = Object{"task_budget": Object{"type": "tokens", "total": 1}}
				want = "defer_to_ordinary"
			}
			raw, _ := json.Marshal(body)
			r := httptest.NewRequest("POST", helperhistory.RequirementPath, bytes.NewReader(raw))
			r.Header.Set("x-api-key", "fixture")
			r.Header.Set("X-CCGateway-Request-Policy", policy)
			r.Header.Set(helperhistory.Header, "forged") // Never becomes custody authority.
			if mode != "missing-beta" {
				r.Header.Set("anthropic-beta", taskBudgetBeta)
			}
			w := httptest.NewRecorder()
			// Nil Runner/cache/resources/slots makes any runtime dependency fail.
			g := &Gateway{Key: "fixture", RequestLogDir: t.TempDir()}
			g.ServeHTTP(w, r)
			if files, err := os.ReadDir(g.RequestLogDir); err != nil || len(files) != 0 {
				t.Fatal("planning wrote diagnostic files")
			}
			if w.Code != status {
				t.Fatalf("status%d body%s", w.Code, w.Body.String())
			}
			if status == 200 {
				var result struct{ Decision string }
				json.Unmarshal(w.Body.Bytes(), &result)
				if result.Decision != want {
					t.Fatal(result.Decision)
				}
			}
		})
	}
}

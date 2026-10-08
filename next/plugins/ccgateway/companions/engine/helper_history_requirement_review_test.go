package engine

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestReviewHelperRequirementAuthorizationAndInvalidPlan(t *testing.T) {
	for _, mode := range []string{"empty-key", "wrong-key", "wrong-method", "oversized", "invalid-after-budget"} {
		t.Run(mode, func(t *testing.T) {
			raw := reviewHelperBudgetBody(t)
			if mode == "invalid-after-budget" {
				body, _ := decodeObject(raw)
				body["temperature"] = "not-a-number"
				raw, _ = json.Marshal(body)
			}
			if mode == "oversized" {
				raw = bytes.Repeat([]byte(" "), (32<<20)+1)
			}
			r := httptest.NewRequest(http.MethodPost, helperhistory.RequirementPath, bytes.NewReader(raw))
			r.Header.Set("x-api-key", "fixture")
			r.Header.Set("anthropic-beta", taskBudgetBeta)
			r.Header.Set("X-CCGateway-Request-Policy", `{"tool_search":"true"}`)
			g := &Gateway{Key: "fixture", RequestLogDir: t.TempDir()}
			want := 200
			switch mode {
			case "empty-key":
				g.Key = ""
				want = 401
			case "wrong-key":
				r.Header.Set("x-api-key", "other")
				want = 401
			case "wrong-method":
				r.Method = http.MethodGet
				want = 405
			case "oversized":
				want = 413
			}
			w := httptest.NewRecorder()
			g.ServeHTTP(w, r)
			if w.Code != want {
				t.Fatalf("status=%d want=%d", w.Code, want)
			}
			if mode == "invalid-after-budget" {
				decision, err := helperhistory.DecodeRequirement(w.Body.Bytes())
				if err != nil || decision.Decision != helperhistory.RequirementDeferToOrdinary {
					t.Fatal("invalid parameter promoted to custody", err)
				}
			}
			entries, err := os.ReadDir(g.RequestLogDir)
			if err != nil || len(entries) != 0 {
				t.Fatal("pure planning created files", err)
			}
		})
	}
}

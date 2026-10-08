package engine

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func reviewHelperBudgetBody(t *testing.T) []byte {
	t.Helper()
	body := basic()
	body["output_config"] = Object{"task_budget": Object{"type": "tokens", "total": 64000, "remaining": 32000}}
	body["tools"] = []any{Object{"name": "fixture", "defer_loading": true, "input_schema": Object{"type": "object"}}}
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

func TestReviewHelperBudgetHeaderIsNotRestorationAuthority(t *testing.T) {
	raw := reviewHelperBudgetBody(t)
	h := http.Header{"Anthropic-Beta": []string{taskBudgetBeta}}
	h.Set(helperhistory.Header, "1")
	if _, err := parsePolicyRequest(raw, h); err == nil || !strings.Contains(err.Error(), "durable restoration") {
		t.Fatal("untrusted header granted parser restoration authority", err)
	}
	for _, validKey := range []bool{false, true} {
		g := &Gateway{Key: "fixture-key", Runner: &Runner{CLI: "must-not-execute", Version: "2.1.292"}}
		r := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		r.Header = h.Clone()
		if validKey {
			r.Header.Set("x-api-key", "fixture-key")
		}
		w := httptest.NewRecorder()
		g.ServeHTTP(w, r)
		want := 401
		if validKey {
			want = 400
		}
		if w.Code != want {
			t.Fatalf("plain body plus forged carrier header: status=%d want=%d", w.Code, want)
		}
	}
}

func TestReviewHelperBudgetPrivateStateStillRequiresAuthenticationAndBeta(t *testing.T) {
	raw := reviewHelperBudgetBody(t)
	h := http.Header{"Anthropic-Beta": []string{taskBudgetBeta}}
	if _, err := parsePolicyRequestWithHelper(raw, h, nil, &helperHistoryExecution{}); err == nil || !strings.Contains(err.Error(), "not authenticated") {
		t.Fatal("constructed but unverified execution authorized budget", err)
	}
	if _, err := parsePolicyRequestWithHelper(raw, http.Header{}, nil, &helperHistoryExecution{authenticated: true}); err == nil || !strings.Contains(err.Error(), taskBudgetBeta) {
		t.Fatal("private state bypassed required beta", err)
	}
}

package anthropicupstream

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
)

func TestTransformerEnforcesHeaderBoundaryAndSanitizesContextManagement(t *testing.T) {
	large := strings.Repeat("I", 2<<20)
	body := `{"model":"claude-upstream","context_management":{"edits":[]},"messages":[{"role":"user","content":[{"type":"image","source":{"type":"base64","data":"` + large + `"}}]}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://gateway/v1/messages", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client")
	request.Header.Set("X-Api-Key", "client-key")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("X-Forwarded-For", "198.51.100.1")
	request.Header.Set("Anthropic-Beta", "client-beta")
	request.Header.Set("X-Stainless-Lang", "go")
	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{"anthropic_beta": "tool-beta"}}
	if err := new(Transformer).TransformRequest(request, plan, nil); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"Authorization", "X-Api-Key", "Cookie", "X-Forwarded-For", "Anthropic-Beta"} {
		if request.Header.Get(key) != "" {
			t.Fatalf("header %s leaked: %+v", key, request.Header)
		}
	}
	if request.Header.Get("X-Stainless-Lang") != "go" {
		t.Fatal("safe SDK header was removed")
	}
	transformed, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(transformed, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["context_management"] != nil || !strings.Contains(string(transformed), large[:4096]) {
		t.Fatalf("sanitized body changed unexpectedly")
	}
}

func TestTransformerKeepsContextManagementWithAuthoritativeBeta(t *testing.T) {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway/v1/messages", strings.NewReader(`{"context_management":{"edits":[]},"messages":[]}`))
	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{"anthropic_beta": "tool-beta,context-management-2025-06-27"}}
	if err := new(Transformer).TransformRequest(request, plan, nil); err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(request.Body)
	if !strings.Contains(string(body), "context_management") {
		t.Fatalf("context management removed: %s", body)
	}
}

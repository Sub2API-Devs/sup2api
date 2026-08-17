package vertexanthropic

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
)

func TestTransformerStreamsVertexBodyAndFiltersHeaders(t *testing.T) {
	largeImage := strings.Repeat("a", 2<<20)
	body := `{"model":"claude-client","anthropic_version":"old","context_management":{"edits":[]},"messages":[{"role":"user","content":[{"type":"image","source":{"type":"base64","data":"` + largeImage + `"}}]}],"stream":true}`
	request, err := http.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", io.NopCloser(strings.NewReader(body)))
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}
	request.ContentLength = int64(len(body))
	request.Header.Set("Authorization", "Bearer client")
	request.Header.Set("X-Api-Key", "client")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("X-Not-Forwarded", "secret")
	request.Header.Set("X-Stainless-Lang", "go")
	request.Header.Set("Anthropic-Beta", contextManagementBeta)
	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{
		"anthropic_version": "vertex-2023-10-16",
		"anthropic_beta":    "",
	}}
	if err := new(Transformer).TransformRequest(request, plan, nil); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	transformed, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatalf("read transformed body: %v", err)
	}
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(transformed, &payload); err != nil {
		t.Fatalf("transformed JSON: %v\n%s", err, transformed)
	}
	if _, exists := payload["model"]; exists {
		t.Fatal("model was not removed")
	}
	if _, exists := payload["context_management"]; exists {
		t.Fatal("context_management was not removed without its final beta token")
	}
	var version string
	if err := json.Unmarshal(payload["anthropic_version"], &version); err != nil || version != "vertex-2023-10-16" {
		t.Fatalf("anthropic_version=%q err=%v", version, err)
	}
	if !strings.Contains(string(payload["messages"]), largeImage[:1024]) {
		t.Fatal("large multimodal value was not preserved")
	}
	if request.ContentLength != -1 || request.Header.Get("Content-Length") != "" {
		t.Fatalf("streaming content length=%d header=%q", request.ContentLength, request.Header.Get("Content-Length"))
	}
	for _, key := range []string{"Authorization", "X-Api-Key", "Cookie", "X-Not-Forwarded", "Anthropic-Beta"} {
		if value := request.Header.Get(key); value != "" {
			t.Fatalf("filtered header %s=%q", key, value)
		}
	}
	if request.Header.Get("X-Stainless-Lang") != "go" {
		t.Fatal("allowed Anthropic client header was removed")
	}
}

func TestTransformerPreservesContextManagementWithFinalBeta(t *testing.T) {
	body := `{"model":"claude","context_management":{"edits":[]},"messages":[]}`
	request, _ := http.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", io.NopCloser(strings.NewReader(body)))
	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{
		"anthropic_version": "vertex-2023-10-16",
		"anthropic_beta":    "interleaved-thinking-2025-05-14," + contextManagementBeta,
	}}
	if err := new(Transformer).TransformRequest(request, plan, nil); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	transformed, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(transformed, &payload); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if _, exists := payload["context_management"]; !exists {
		t.Fatal("context_management was removed despite the final beta capability")
	}
}

func TestTransformerReportsMalformedJSONThroughStreamingBody(t *testing.T) {
	for _, body := range []string{
		`{"model":"claude",}`,
		`{"model":"claude"} trailing`,
		`{"model":}`,
	} {
		request, _ := http.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", io.NopCloser(strings.NewReader(body)))
		plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{"anthropic_version": "vertex-2023-10-16"}}
		if err := new(Transformer).TransformRequest(request, plan, nil); err != nil {
			t.Fatalf("unexpected synchronous error: %v", err)
		}
		if _, err := io.ReadAll(request.Body); err == nil {
			t.Fatalf("expected malformed body %q to fail", body)
		}
	}
}

func TestTransformerRequiresVersionOption(t *testing.T) {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", io.NopCloser(strings.NewReader(`{}`)))
	if err := new(Transformer).TransformRequest(request, &controlv1.ExecutionPlan{}, nil); err == nil {
		t.Fatal("expected missing version to fail closed")
	}
}

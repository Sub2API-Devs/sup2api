package geminioauth

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func TestCodeAssistRequestWrapsAndNormalizesNativeGemini(t *testing.T) {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway/v1beta/models/gemini:streamGenerateContent", strings.NewReader(`{
		"contents":[
			{"role":"user","parts":[]},
			{"role":"model","parts":[{"functionCall":{"name":"lookup","args":{}}}]}
		],
		"generationConfig":{"temperature":0.3}
	}`))
	request.Header.Set("Authorization", "Bearer client-secret")
	request.Header.Set("X-Untrusted", "secret")
	state := &requeststate.State{}
	plan := geminiPlan("code_assist", true, false, false)
	if err := new(Transformer).TransformRequest(request, plan, state); err != nil {
		t.Fatal(err)
	}
	root := readRequest(t, request)
	if root["model"] != "gemini-3.1-pro-preview" || root["project"] != "project-1" {
		t.Fatalf("Code Assist envelope = %#v", root)
	}
	inner := root["request"].(map[string]any)
	contents := inner["contents"].([]any)
	if len(contents) != 1 {
		t.Fatalf("empty contents survived: %#v", contents)
	}
	part := contents[0].(map[string]any)["parts"].([]any)[0].(map[string]any)
	if part["thoughtSignature"] != dummyThoughtSignature {
		t.Fatalf("thought signature = %#v", part)
	}
	if request.Header.Get("Authorization") != "" || request.Header.Get("X-Untrusted") != "" {
		t.Fatalf("client headers survived: %v", request.Header)
	}
}

func TestAIStudioRequestStaysNative(t *testing.T) {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway/v1beta/models/gemini:generateContent", strings.NewReader(`{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}`))
	plan := geminiPlan("ai_studio", false, false, false)
	if err := new(Transformer).TransformRequest(request, plan, &requeststate.State{}); err != nil {
		t.Fatal(err)
	}
	root := readRequest(t, request)
	if root["request"] != nil || root["project"] != nil {
		t.Fatalf("AI Studio request was wrapped: %#v", root)
	}
}

func TestStreamingResponseUnwrapsCodeAssistFrames(t *testing.T) {
	sse := "event: message\ndata: {\"response\":{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"hi\"}]}}],\"usageMetadata\":{\"promptTokenCount\":3,\"candidatesTokenCount\":2}}}\n\ndata: [DONE]\n\n"
	response := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(sse))}
	response.Header.Set("Content-Type", "application/json")
	if err := new(Transformer).TransformResponse(response, geminiPlan("code_assist", true, false, false), &requeststate.State{}); err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	text := string(body)
	if strings.Contains(text, `"response"`) || !strings.Contains(text, `"promptTokenCount":3`) || !strings.Contains(text, "data: [DONE]") {
		t.Fatalf("unwrapped stream = %s", text)
	}
	if response.Header.Get("Content-Type") != "text/event-stream" {
		t.Fatalf("content type = %q", response.Header.Get("Content-Type"))
	}
}

func TestNonStreamingCodeAssistAggregatesSSEAndLatestUsage(t *testing.T) {
	sse := strings.Join([]string{
		`data: {"response":{"candidates":[{"content":{"role":"model","parts":[{"text":"hel"}]}}]}}`, "",
		`data: {"response":{"candidates":[{"content":{"role":"model","parts":[{"text":"lo"}]}}]}}`, "",
		`data: {"response":{"usageMetadata":{"promptTokenCount":9,"candidatesTokenCount":4,"cachedContentTokenCount":2,"thoughtsTokenCount":1}}}`, "",
		`data: [DONE]`, "",
	}, "\n")
	response := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(sse))}
	response.Header.Set("Content-Type", "text/event-stream")
	if err := new(Transformer).TransformResponse(response, geminiPlan("code_assist", true, true, false), &requeststate.State{}); err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	var root map[string]any
	if err := json.Unmarshal(body, &root); err != nil {
		t.Fatal(err)
	}
	parts := root["candidates"].([]any)[0].(map[string]any)["content"].(map[string]any)["parts"].([]any)
	if parts[0].(map[string]any)["text"] != "hello" {
		t.Fatalf("aggregated body = %s", body)
	}
	usage := root["usageMetadata"].(map[string]any)
	if usage["promptTokenCount"] != float64(9) || usage["candidatesTokenCount"] != float64(4) {
		t.Fatalf("latest usage = %#v", usage)
	}
}

func TestCountTokensInsufficientScopeFallsBackToEstimate(t *testing.T) {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway/v1beta/models/gemini:countTokens", strings.NewReader(`{"systemInstruction":{"parts":[{"text":"abcd"}]},"contents":[{"parts":[{"text":"abcdefgh"},{"text":"中文"}]}]}`))
	state := &requeststate.State{}
	plan := geminiPlan("ai_studio", false, false, true)
	if err := new(Transformer).TransformRequest(request, plan, state); err != nil {
		t.Fatal(err)
	}
	response := &http.Response{StatusCode: http.StatusForbidden, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"error":{"message":"insufficient authentication scopes"}}`))}
	response.Header.Set("Content-Type", "application/json")
	if err := new(Transformer).TransformResponse(response, plan, state); err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	if response.StatusCode != http.StatusOK || string(body) != `{"totalTokens":5}` {
		t.Fatalf("fallback status=%d body=%s", response.StatusCode, body)
	}
}

func TestNonStreamingResponseUnwrapsEnvelope(t *testing.T) {
	want := `{"candidates":[],"usageMetadata":{"promptTokenCount":1}}`
	response := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"response":` + want + `}`))}
	response.Header.Set("Content-Type", "application/json")
	if err := new(Transformer).TransformResponse(response, geminiPlan("code_assist", false, false, false), &requeststate.State{}); err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	if string(body) != want {
		t.Fatalf("unwrapped response = %s", body)
	}
}

func geminiPlan(mode string, upstreamStream, aggregate, count bool) *controlv1.ExecutionPlan {
	return &controlv1.ExecutionPlan{
		MappedModel: "gemini-3.1-pro-preview", ProtocolProfile: "gemini_oauth",
		ProtocolOptions: map[string]string{
			"mode": mode, "project_id": "project-1", "action": "generateContent",
			"upstream_stream": boolString(upstreamStream), "aggregate_stream": boolString(aggregate), "count_tokens": boolString(count),
		},
	}
}

func boolString(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

func readRequest(t *testing.T, request *http.Request) map[string]any {
	t.Helper()
	body, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatal(err)
	}
	request.Body = io.NopCloser(bytes.NewReader(body))
	var root map[string]any
	if err := json.Unmarshal(body, &root); err != nil {
		t.Fatalf("decode request: %v body=%s", err, body)
	}
	return root
}

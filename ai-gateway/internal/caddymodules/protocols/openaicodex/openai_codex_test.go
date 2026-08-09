package openaicodex

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func TestTransformRequestAppliesCodexContractAndSecurityBoundary(t *testing.T) {
	body := `{
		"model":"client-model",
		"input":[
			{"type":"message","role":"system","content":"system policy"},
			{"type":"message","role":"user","content":"hello"},
			{"role":"tool","tool_call_id":"call_1","content":"tool output"},
			{"type":"reasoning","id":"rs_123","encrypted_content":"sealed"}
		],
		"reasoning":{"effort":"minimal"},
		"functions":[{"name":"lookup","description":"Lookup","parameters":{"type":"object"}}],
		"function_call":{"name":"lookup"},
		"prompt_cache_key":"shared-session",
		"temperature":0.4,
		"metadata":{"private":"drop"},
		"service_tier":"fast"
	}`
	request, err := http.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Authorization", "Bearer client-secret")
	request.Header.Set("Cookie", "session=client-secret")
	request.Header.Set("Chatgpt-Account-Id", "client-account")
	request.Header.Set("X-Forwarded-For", "203.0.113.9")
	request.Header.Set("X-Codex-Window-ID", "window-1")
	request.Header.Set("Session_ID", "shared-session")
	plan := testPlan(false)
	state := &requeststate.State{RequestID: "request-1", Auth: &requeststate.AuthGrant{APIKeyID: 42}}

	if err := new(Transformer).TransformRequest(request, plan, state); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	for _, key := range []string{"Authorization", "Cookie", "Chatgpt-Account-Id", "X-Forwarded-For"} {
		if got := request.Header.Get(key); got != "" {
			t.Fatalf("client header %s leaked: %q", key, got)
		}
	}
	if request.Header.Get("X-Codex-Window-ID") != "window-1" {
		t.Fatal("safe Codex header was not preserved")
	}
	if request.Header.Get("session_id") == "" || request.Header.Get("session_id") == "shared-session" {
		t.Fatalf("session was not isolated: %q", request.Header.Get("session_id"))
	}

	var got map[string]any
	decodeRequestBody(t, request, &got)
	if got["model"] != "gpt-5.4" || got["store"] != false || got["stream"] != true {
		t.Fatalf("core Codex fields = %+v", got)
	}
	for _, key := range []string{"temperature", "metadata", "functions", "function_call"} {
		if _, exists := got[key]; exists {
			t.Fatalf("unsupported field %q was retained", key)
		}
	}
	if got["instructions"] != "system policy" {
		t.Fatalf("instructions = %#v", got["instructions"])
	}
	reasoning := got["reasoning"].(map[string]any)
	if reasoning["effort"] != "none" {
		t.Fatalf("reasoning = %+v", reasoning)
	}
	include := got["include"].([]any)
	if len(include) != 1 || include[0] != "reasoning.encrypted_content" {
		t.Fatalf("include = %+v", include)
	}
	if got["service_tier"] != "priority" {
		t.Fatalf("service_tier = %#v", got["service_tier"])
	}
	if state.ServiceTier != "priority" || state.ReasoningEffort != "none" {
		t.Fatalf("usage metadata tier=%q effort=%q", state.ServiceTier, state.ReasoningEffort)
	}
	tools := got["tools"].([]any)
	tool := tools[0].(map[string]any)
	if tool["name"] != "lookup" {
		t.Fatalf("tools = %+v", tools)
	}
	metadata := got["client_metadata"].(map[string]any)
	if metadata["x-codex-installation-id"] != "device-1" {
		t.Fatalf("client_metadata = %+v", metadata)
	}
	input := got["input"].([]any)
	if input[0].(map[string]any)["role"] != "developer" {
		t.Fatalf("system role was not normalized: %+v", input[0])
	}
	if input[2].(map[string]any)["type"] != "function_call_output" {
		t.Fatalf("tool output was not normalized: %+v", input[2])
	}
	if _, exists := input[3].(map[string]any)["id"]; exists {
		t.Fatalf("reasoning id was retained: %+v", input[3])
	}
}

func TestTransformRequestCompactUsesUnarySchema(t *testing.T) {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway.test/v1/responses/compact", strings.NewReader(`{
		"model":"client-model","input":"hello","reasoning":{"effort":"max"},"stream":true,
		"store":true,"prompt_cache_key":"drop","service_tier":"fast","unknown":"drop"
	}`))
	plan := testPlan(true)
	plan.MappedModel = "gpt-5.6-sol"
	state := &requeststate.State{RequestID: "request-compact", Auth: &requeststate.AuthGrant{APIKeyID: 7}}
	if err := new(Transformer).TransformRequest(request, plan, state); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	var got map[string]any
	decodeRequestBody(t, request, &got)
	for _, key := range []string{"stream", "store", "prompt_cache_key", "service_tier", "unknown"} {
		if _, exists := got[key]; exists {
			t.Fatalf("compact retained %q", key)
		}
	}
	if got["reasoning"].(map[string]any)["effort"] != "xhigh" {
		t.Fatalf("compact reasoning = %+v", got["reasoning"])
	}
	if state.ServiceTier != "" || state.ReasoningEffort != "xhigh" {
		t.Fatalf("compact usage metadata tier=%q effort=%q", state.ServiceTier, state.ReasoningEffort)
	}
	if request.Header.Get("session_id") == "" {
		t.Fatal("compact request did not receive an isolated session")
	}
}

func TestTransformRequestPreservesLargeMultimodalValue(t *testing.T) {
	large := strings.Repeat("A", 2<<20)
	body := `{"model":"client","input":[{"type":"input_image","image_url":"data:image/png;base64,` + large + `"}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", strings.NewReader(body))
	state := &requeststate.State{RequestID: "request-large", Auth: &requeststate.AuthGrant{APIKeyID: 8}}
	if err := new(Transformer).TransformRequest(request, testPlan(false), state); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	var got map[string]any
	decodeRequestBody(t, request, &got)
	input := got["input"].([]any)
	imageURL := input[0].(map[string]any)["image_url"].(string)
	if imageURL != "data:image/png;base64,"+large {
		t.Fatalf("large multimodal value changed: len=%d", len(imageURL))
	}
}

func testPlan(compact bool) *controlv1.ExecutionPlan {
	return &controlv1.ExecutionPlan{
		MappedModel: "gpt-5.4",
		ProtocolOptions: map[string]string{
			"compact":              strconv.FormatBool(compact),
			"device_id":            "device-1",
			"default_instructions": "default instructions",
		},
	}
}

func decodeRequestBody(t *testing.T, request *http.Request, target any) {
	t.Helper()
	payload, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(payload, target); err != nil {
		t.Fatalf("decode transformed body: %v", err)
	}
}

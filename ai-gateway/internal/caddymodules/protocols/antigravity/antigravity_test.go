package antigravity

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func TestTransformerWrapsNativeGeminiAndEnforcesHeaderBoundary(t *testing.T) {
	body := `{
		"metadata":{"user_id":"private-native-session"},"sessionId":"private-session","project":"client-project",
		"contents":[{"role":"user","parts":[]},{"role":"user","parts":[{"functionCall":{"name":"lookup","args":{}}}]}],
		"tools":[{"functionDeclarations":[{"name":"lookup","parameters":{"type":"object","properties":{"query":{"type":"STRING","minLength":1}},"x-extra":true}}]}]
	}`
	request, _ := http.NewRequest(http.MethodPost, "http://gateway/v1beta/models/client:streamGenerateContent", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-secret")
	request.Header.Set("X-Goog-Api-Key", "client-key")
	request.Header.Set("X-Client-Metadata", "private")
	plan := antigravityPlan("streamGenerateContent", true, false, false)
	if err := new(Transformer).TransformRequest(request, plan, &requeststate.State{}); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	if request.Header.Get("Authorization") != "" || request.Header.Get("X-Goog-Api-Key") != "" || request.Header.Get("X-Client-Metadata") != "" {
		t.Fatalf("client headers crossed provider boundary: %+v", request.Header)
	}
	transformed, _ := io.ReadAll(request.Body)
	var wrapped map[string]any
	if err := json.Unmarshal(transformed, &wrapped); err != nil {
		t.Fatal(err)
	}
	if wrapped["project"] != "project-1" || wrapped["model"] != "gemini-3.1-pro-high" || !strings.HasPrefix(wrapped["requestId"].(string), "agent-") {
		t.Fatalf("wrapped identity = %+v", wrapped)
	}
	inner := wrapped["request"].(map[string]any)
	if _, exists := inner["metadata"]; exists || inner["sessionId"] != nil || inner["project"] != nil {
		t.Fatalf("client routing fields crossed provider boundary: %+v", inner)
	}
	if len(inner["contents"].([]any)) != 1 {
		t.Fatalf("empty contents not removed: %+v", inner["contents"])
	}
	part := inner["contents"].([]any)[0].(map[string]any)["parts"].([]any)[0].(map[string]any)
	if part["thoughtSignature"] != dummyThoughtSignature {
		t.Fatalf("thought signature = %+v", part)
	}
	system := inner["systemInstruction"].(map[string]any)
	if !strings.Contains(system["parts"].([]any)[0].(map[string]any)["text"].(string), "You are Antigravity") {
		t.Fatalf("identity patch missing: %+v", system)
	}
	parameters := inner["tools"].([]any)[0].(map[string]any)["functionDeclarations"].([]any)[0].(map[string]any)["parameters"].(map[string]any)
	query := parameters["properties"].(map[string]any)["query"].(map[string]any)
	if query["type"] != "string" || query["minLength"] != nil || parameters["x-extra"] != nil {
		t.Fatalf("schema was not normalized: %+v", parameters)
	}
}

func TestTransformerStreamsAndAggregatesWrappedResponses(t *testing.T) {
	streamPayload := "data: {\"response\":{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"hello\"}]}}]}}\n\n"
	streamResponse := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(streamPayload))}
	if err := new(Transformer).TransformResponse(streamResponse, antigravityPlan("streamGenerateContent", true, false, false), &requeststate.State{}); err != nil {
		t.Fatal(err)
	}
	streamed, _ := io.ReadAll(streamResponse.Body)
	if strings.Contains(string(streamed), `"response"`) || !strings.Contains(string(streamed), `"text":"hello"`) {
		t.Fatalf("stream response = %s", streamed)
	}

	aggregatePayload := strings.Join([]string{
		"data: {\"response\":{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"hel\"}]}}]}}\n\n",
		"data: {\"response\":{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"lo\"}]}}],\"usageMetadata\":{\"promptTokenCount\":2,\"candidatesTokenCount\":1}}}\n\n",
	}, "")
	aggregateResponse := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(aggregatePayload))}
	if err := new(Transformer).TransformResponse(aggregateResponse, antigravityPlan("generateContent", true, true, false), &requeststate.State{}); err != nil {
		t.Fatal(err)
	}
	aggregated, _ := io.ReadAll(aggregateResponse.Body)
	if !bytes.Contains(aggregated, []byte(`"text":"hello"`)) || !bytes.Contains(aggregated, []byte(`"promptTokenCount":2`)) {
		t.Fatalf("aggregate response = %s", aggregated)
	}
}

func TestCountTokensNeverCallsUpstream(t *testing.T) {
	var calls atomic.Int64
	base := roundTripFunc(func(*http.Request) (*http.Response, error) {
		calls.Add(1)
		return nil, nil
	})
	wrapper, err := new(Transformer).WrapTransport(base, antigravityPlan("countTokens", false, false, true), &requeststate.State{})
	if err != nil {
		t.Fatal(err)
	}
	request, _ := http.NewRequest(http.MethodPost, "https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent", strings.NewReader(`{}`))
	response, err := wrapper.RoundTrip(request)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	if calls.Load() != 0 || string(body) != `{"totalTokens":0}` {
		t.Fatalf("calls=%d body=%s", calls.Load(), body)
	}
}

func TestSignatureRecoveryRetriesOnceWithSensitivePartsRemoved(t *testing.T) {
	var calls atomic.Int64
	base := roundTripFunc(func(request *http.Request) (*http.Response, error) {
		attempt := calls.Add(1)
		body, _ := io.ReadAll(request.Body)
		if attempt == 1 {
			return &http.Response{StatusCode: 400, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"error":{"message":"invalid thought_signature"}}`)), Request: request}, nil
		}
		if bytes.Contains(body, []byte("thoughtSignature")) || bytes.Contains(body, []byte(`"thought":true`)) {
			t.Fatalf("signature-sensitive content remained on retry: %s", body)
		}
		return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{}`)), Request: request}, nil
	})
	state := &requeststate.State{}
	plan := antigravityClaudePlan(false)
	plan.MaxAttempts = 2
	wrapper, err := new(Transformer).WrapTransport(base, plan, state)
	if err != nil {
		t.Fatal(err)
	}
	payload := []byte(`{"request":{"contents":[{"parts":[{"thought":true,"text":"secret","thoughtSignature":"bad"},{"text":"hello","thoughtSignature":"bad"}]}]}}`)
	request, _ := http.NewRequest(http.MethodPost, "https://example.test", bytes.NewReader(payload))
	request.GetBody = func() (io.ReadCloser, error) { return io.NopCloser(bytes.NewReader(payload)), nil }
	response, err := wrapper.RoundTrip(request)
	if err != nil || response.StatusCode != 200 || calls.Load() != 2 {
		t.Fatalf("response=%+v calls=%d err=%v", response, calls.Load(), err)
	}
}

func TestSignatureRecoveryDoesNotRetryUnrelatedBadRequest(t *testing.T) {
	var calls atomic.Int64
	base := roundTripFunc(func(request *http.Request) (*http.Response, error) {
		calls.Add(1)
		return &http.Response{StatusCode: 400, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"error":{"message":"invalid model"}}`)), Request: request}, nil
	})
	plan := antigravityClaudePlan(false)
	plan.MaxAttempts = 2
	wrapper, _ := new(Transformer).WrapTransport(base, plan, &requeststate.State{})
	payload := []byte(`{"request":{}}`)
	request, _ := http.NewRequest(http.MethodPost, "https://example.test", bytes.NewReader(payload))
	request.GetBody = func() (io.ReadCloser, error) { return io.NopCloser(bytes.NewReader(payload)), nil }
	response, err := wrapper.RoundTrip(request)
	if err != nil || response.StatusCode != 400 || calls.Load() != 1 {
		t.Fatalf("response=%+v calls=%d err=%v", response, calls.Load(), err)
	}
}

func TestTransformerExpandsAndCleansSchemaReferences(t *testing.T) {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway", strings.NewReader(`{"tools":[{"functionDeclarations":[{"name":"x","parameters":{"$ref":"#/$defs/X","$defs":{"X":{"type":"object"}}}}]}]}`))
	if err := new(Transformer).TransformRequest(request, antigravityPlan("generateContent", true, true, false), &requeststate.State{}); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	body, _ := io.ReadAll(request.Body)
	if bytes.Contains(body, []byte(`"$ref"`)) || bytes.Contains(body, []byte(`"$defs"`)) || !bytes.Contains(body, []byte(`"reason"`)) {
		t.Fatalf("schema was not expanded and normalized: %s", body)
	}
}

func TestTransformerConvertsClaudeRequestWithoutForwardingClientMetadata(t *testing.T) {
	body := `{
		"model":"claude-client","stream":false,"max_tokens":1024,
		"thinking":{"type":"enabled","budget_tokens":512},
		"metadata":{"user_id":"private-client-session"},
		"system":"Follow the user request",
		"messages":[{"role":"user","content":[{"type":"text","text":"hello"}]}],
		"tools":[{"name":"lookup","description":"lookup docs","input_schema":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}]
	}`
	request, _ := http.NewRequest(http.MethodPost, "http://gateway/v1/messages", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-key")
	request.Header.Set("Anthropic-Beta", "private-beta")
	state := &requeststate.State{RequestedModel: "claude-client"}
	if err := new(Transformer).TransformRequest(request, antigravityClaudePlan(false), state); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	transformed, _ := io.ReadAll(request.Body)
	if bytes.Contains(transformed, []byte("private-client-session")) {
		t.Fatalf("client metadata crossed upstream boundary: %s", transformed)
	}
	var envelope map[string]any
	if err := json.Unmarshal(transformed, &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope["project"] != "project-1" || envelope["model"] != "claude-sonnet-4-5-thinking" || envelope["requestType"] != "agent" {
		t.Fatalf("Claude envelope = %+v", envelope)
	}
	inner := envelope["request"].(map[string]any)
	if !strings.Contains(fmt.Sprint(inner["systemInstruction"]), "You are Antigravity") || len(inner["tools"].([]any)) == 0 {
		t.Fatalf("Claude transform = %+v", inner)
	}
	if request.Header.Get("Authorization") != "" || request.Header.Get("Anthropic-Beta") != "" {
		t.Fatalf("client headers leaked: %+v", request.Header)
	}
}

func TestTransformerConvertsClaudeNonStreamingResponse(t *testing.T) {
	upstream := strings.Join([]string{
		`data: {"response":{"responseId":"resp-1","candidates":[{"content":{"parts":[{"thought":true,"text":"consider","thoughtSignature":"sig-1"},{"text":"hello "}]}}]}}` + "\n\n",
		`data: {"response":{"candidates":[{"content":{"parts":[{"text":"world"}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":13,"cachedContentTokenCount":3,"candidatesTokenCount":4,"thoughtsTokenCount":2}}}` + "\n\n",
	}, "")
	response := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(upstream))}
	state := &requeststate.State{RequestedModel: "claude-client"}
	if err := new(Transformer).TransformResponse(response, antigravityClaudePlan(false), state); err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	var decoded map[string]any
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("response=%s err=%v", body, err)
	}
	if decoded["type"] != "message" || decoded["model"] != "claude-client" || decoded["stop_reason"] != "end_turn" {
		t.Fatalf("Claude response = %+v", decoded)
	}
	if !strings.Contains(fmt.Sprint(decoded["content"]), "hello world") || !strings.Contains(fmt.Sprint(decoded["content"]), "consider") {
		t.Fatalf("Claude content = %+v", decoded["content"])
	}
	usage := decoded["usage"].(map[string]any)
	if usage["input_tokens"] != float64(10) || usage["output_tokens"] != float64(6) || usage["cache_read_input_tokens"] != float64(3) {
		t.Fatalf("Claude usage = %+v", usage)
	}
}

func TestTransformerConvertsClaudeStreamingLifecycle(t *testing.T) {
	upstream := strings.Join([]string{
		`data: {"response":{"responseId":"resp-stream","candidates":[{"content":{"parts":[{"text":"hello"}]}}]}}` + "\n\n",
		`data: {"response":{"candidates":[{"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":2}}}` + "\n\n",
	}, "")
	response := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(upstream))}
	state := &requeststate.State{RequestedModel: "claude-client"}
	if err := new(Transformer).TransformResponse(response, antigravityClaudePlan(true), state); err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	text := string(body)
	for _, event := range []string{"event: message_start", "event: content_block_start", "event: content_block_delta", "event: message_delta", "event: message_stop"} {
		if !strings.Contains(text, event) {
			t.Fatalf("missing %q in %s", event, text)
		}
	}
	if !strings.Contains(text, `"input_tokens":5`) || !strings.Contains(text, `"output_tokens":2`) {
		t.Fatalf("stream usage = %s", text)
	}
}

func TestTransformerMapsClaudeUpstreamErrors(t *testing.T) {
	response := &http.Response{StatusCode: http.StatusTooManyRequests, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"error":{"message":"capacity exhausted"}}`))}
	if err := new(Transformer).TransformResponse(response, antigravityClaudePlan(false), &requeststate.State{RequestedModel: "claude"}); err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	if !bytes.Contains(body, []byte(`"type":"rate_limit_error"`)) || !bytes.Contains(body, []byte("capacity exhausted")) {
		t.Fatalf("mapped error = %s", body)
	}
}

func antigravityPlan(action string, upstreamStream, aggregate, count bool) *controlv1.ExecutionPlan {
	return &controlv1.ExecutionPlan{
		MappedModel: "gemini-3.1-pro-high", ProtocolProfile: "antigravity",
		ProtocolOptions: map[string]string{
			"mode": "native_gemini", "project_id": "project-1", "action": action,
			"upstream_stream": boolString(upstreamStream), "aggregate_stream": boolString(aggregate), "count_tokens": boolString(count),
		},
	}
}

func antigravityClaudePlan(stream bool) *controlv1.ExecutionPlan {
	return &controlv1.ExecutionPlan{
		MappedModel: "claude-sonnet-4-5", ProtocolProfile: "antigravity",
		ProtocolOptions: map[string]string{
			"mode": "claude", "project_id": "project-1", "action": "messages",
			"client_stream": boolString(stream), "upstream_stream": "true",
			"aggregate_stream": boolString(!stream), "count_tokens": "false",
		},
	}
}

func boolString(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

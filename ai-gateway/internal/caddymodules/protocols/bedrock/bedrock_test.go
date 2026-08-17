package bedrock

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"hash/crc32"
	"io"
	"net/http"
	"strings"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func TestTransformRequestAppliesBedrockContractAndCCCompatibility(t *testing.T) {
	body := `{
		"model":"claude-client","stream":true,"metadata":{"private":"drop"},
		"service_tier":"auto","interface_geo":"US","context_management":{"edits":[]},
		"thinking":{"type":"enabled"},
		"output_format":{"type":"json","schema":{"result":"string"}},
		"output_config":{"max_tokens":100},
		"system":[{"type":"text","text":"sys","cache_control":{"type":"ephemeral","scope":"global","ttl":"1h"}}],
		"messages":[{"role":"user","content":[{"type":"tool_use","id":"tool:bad.id"},{"type":"tool_result","tool_use_id":"tool:bad.id"}]}],
		"tools":[
			{"type":"computer_20251124","name":"computer","custom":{"defer_loading":true}},
			{"type":"tool_search_tool_regex_20251119","name":"search"}
		]
	}`
	request, _ := http.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-secret")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("Anthropic-Beta", "client-token")
	plan := bedrockPlan("apikey")
	plan.ProtocolOptions["cc_compat"] = "true"
	plan.ProtocolOptions["initial_beta_tokens"] = "context-1m-2025-08-07"
	plan.ProtocolOptions["allowed_auto_betas"] = "computer-use-2025-11-24,tool-search-tool-2025-10-19,tool-examples-2025-10-29"

	if err := new(Transformer).TransformRequest(request, plan, &requeststate.State{}); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	if request.Header.Get("Authorization") != "" || request.Header.Get("Cookie") != "" || request.Header.Get("Anthropic-Beta") != "" {
		t.Fatalf("client headers leaked: %v", request.Header)
	}
	var got map[string]any
	decodeBody(t, request.Body, &got)
	for _, key := range []string{"model", "stream", "metadata", "service_tier", "interface_geo", "context_management", "output_format", "output_config"} {
		if _, exists := got[key]; exists {
			t.Fatalf("Bedrock-incompatible field %q retained", key)
		}
	}
	if got["anthropic_version"] != "bedrock-2023-05-31" {
		t.Fatalf("anthropic_version = %#v", got["anthropic_version"])
	}
	if got["max_tokens"].(json.Number).String() != "81920" {
		t.Fatalf("max_tokens = %#v", got["max_tokens"])
	}
	thinking := got["thinking"].(map[string]any)
	if thinking["type"] != "adaptive" || thinking["budget_tokens"] != nil {
		t.Fatalf("thinking = %+v", thinking)
	}
	betas := got["anthropic_beta"].([]any)
	for _, expected := range []string{"context-1m-2025-08-07", "computer-use-2025-11-24", "tool-search-tool-2025-10-19", "tool-examples-2025-10-29"} {
		if !sliceContains(betas, expected) {
			t.Fatalf("beta %q missing from %+v", expected, betas)
		}
	}
	tools := got["tools"].([]any)
	if _, exists := tools[0].(map[string]any)["custom"]; exists {
		t.Fatalf("tool custom field retained: %+v", tools[0])
	}
	messages := got["messages"].([]any)
	content := messages[0].(map[string]any)["content"].([]any)
	if content[0].(map[string]any)["id"] != "tool_bad_id" || content[1].(map[string]any)["tool_use_id"] != "tool_bad_id" {
		t.Fatalf("tool ids = %+v", content)
	}
	if len(content) != 3 || !strings.Contains(content[2].(map[string]any)["text"].(string), `"result":"string"`) {
		t.Fatalf("output schema not inlined: %+v", content)
	}
}

func TestTransformRequestObtainsSigV4FromControlPlaneDigestOnly(t *testing.T) {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", strings.NewReader(`{"model":"claude-client","max_tokens":32,"messages":[]}`))
	request.Header.Set("Authorization", "Bearer client-secret")
	plan := bedrockPlan("sigv4")
	signer := new(signingRuntimeStub)
	transformer := &Transformer{signer: signer}
	state := &requeststate.State{RequestID: "request-sigv4", Admission: &controlv1.OpenRequestResponse{Lease: &controlv1.RequestLease{LeaseId: "lease-sigv4"}}}

	if err := transformer.TransformRequest(request, plan, state); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	authorization := plan.GetUpstreamHeaders()["Authorization"]
	if authorization != "AWS4-HMAC-SHA256 signed-by-control-plane" {
		t.Fatalf("SigV4 Authorization = %q", authorization)
	}
	if plan.GetUpstreamHeaders()["X-Amz-Date"] == "" || plan.GetUpstreamHeaders()["X-Amz-Security-Token"] != "session-example" {
		t.Fatalf("SigV4 headers = %+v", plan.GetUpstreamHeaders())
	}
	if signer.request == nil || signer.request.GetRequestId() != "request-sigv4" || signer.request.GetLeaseId() != "lease-sigv4" || len(signer.request.GetPayloadSha256()) != 64 {
		t.Fatalf("signing RPC request = %+v", signer.request)
	}
}

func TestTransformRequestRejectsBodyDerivedBlockedBeta(t *testing.T) {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", strings.NewReader(`{
		"model":"claude-client","tools":[{"type":"computer_20251124","name":"computer"}],"messages":[]
	}`))
	plan := bedrockPlan("apikey")
	plan.ProtocolOptions["allowed_auto_betas"] = "computer-use-2025-11-24"
	plan.ProtocolOptions["blocked_auto_betas"] = `{"computer-use-2025-11-24":"computer use is disabled"}`
	err := new(Transformer).TransformRequest(request, plan, &requeststate.State{})
	policy, ok := err.(*PolicyError)
	if !ok || policy.HTTPStatus() != http.StatusForbidden || policy.ErrorCode() != "BETA_FEATURE_BLOCKED" {
		t.Fatalf("blocked beta error = %#v", err)
	}
}

func TestTransformResponseConvertsAWSEventStreamToSSEAndUsage(t *testing.T) {
	event := []byte(`{"type":"message_delta","delta":{"stop_reason":"end_turn"},"amazon-bedrock-invocationMetrics":{"inputTokenCount":9,"outputTokenCount":4}}`)
	payload, _ := json.Marshal(map[string]string{"bytes": base64.StdEncoding.EncodeToString(event)})
	frame := buildEventStreamFrame(map[string]string{":message-type": "event", ":event-type": "chunk", ":content-type": "application/json"}, payload)
	response := &http.Response{
		StatusCode: http.StatusOK,
		Header: http.Header{
			"Content-Type":     []string{"application/vnd.amazon.eventstream"},
			"X-Amzn-Requestid": []string{"aws-request-1"},
		},
		Body: io.NopCloser(bytes.NewReader(frame)),
	}
	if err := new(Transformer).TransformResponse(response, nil, nil); err != nil {
		t.Fatalf("TransformResponse: %v", err)
	}
	translated, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("read translated response: %v", err)
	}
	if response.Header.Get("Content-Type") != "text/event-stream" || response.Header.Get("x-request-id") != "aws-request-1" {
		t.Fatalf("response headers = %v", response.Header)
	}
	text := string(translated)
	if !strings.Contains(text, "event: message_delta") || !strings.Contains(text, `"usage":{"input_tokens":9,"output_tokens":4}`) || strings.Contains(text, "amazon-bedrock-invocationMetrics") {
		t.Fatalf("translated SSE = %s", text)
	}
}

func TestEventStreamDecoderRejectsCRCCorruption(t *testing.T) {
	frame := buildEventStreamFrame(map[string]string{":message-type": "event", ":event-type": "chunk"}, []byte(`{"bytes":"e30="}`))
	frame[len(frame)-1] ^= 0xff
	if _, err := newEventStreamDecoder(bytes.NewReader(frame)).Decode(); err == nil || !strings.Contains(err.Error(), "CRC") {
		t.Fatalf("CRC error = %v", err)
	}
}

func bedrockPlan(authMode string) *controlv1.ExecutionPlan {
	return &controlv1.ExecutionPlan{
		UpstreamUrl:    "https://bedrock-runtime.us-east-1.amazonaws.com/model/us.anthropic.claude-opus-4-7-v1/invoke-with-response-stream",
		UpstreamMethod: http.MethodPost, UpstreamHost: "bedrock-runtime.us-east-1.amazonaws.com",
		MappedModel: "us.anthropic.claude-opus-4-7-v1", ProtocolProfile: "bedrock",
		UpstreamHeaders: map[string]string{"Content-Type": "application/json", "Accept": "application/json", "Authorization": "Bearer bedrock-api-key"},
		ProtocolOptions: map[string]string{
			"auth_mode": authMode, "aws_region": "us-east-1", "cc_compat": "false",
			"blocked_auto_betas": `{}`,
		},
	}
}

type signingRuntimeStub struct {
	request *controlv1.SignBedrockRequestRequest
}

func (s *signingRuntimeStub) SignBedrockRequest(_ context.Context, request *controlv1.SignBedrockRequestRequest) (*controlv1.SignBedrockRequestResponse, error) {
	s.request = request
	return &controlv1.SignBedrockRequestResponse{
		Decision: controlv1.Decision_DECISION_ALLOW,
		SignedHeaders: map[string]string{
			"Authorization":        "AWS4-HMAC-SHA256 signed-by-control-plane",
			"X-Amz-Date":           "20260801T000000Z",
			"X-Amz-Security-Token": "session-example",
		},
	}, nil
}

func decodeBody(t *testing.T, reader io.Reader, target any) {
	t.Helper()
	decoder := json.NewDecoder(reader)
	decoder.UseNumber()
	if err := decoder.Decode(target); err != nil {
		t.Fatal(err)
	}
}

func sliceContains(values []any, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func buildEventStreamFrame(headers map[string]string, payload []byte) []byte {
	var encodedHeaders bytes.Buffer
	for _, name := range []string{":message-type", ":event-type", ":content-type", ":exception-type"} {
		value, exists := headers[name]
		if !exists {
			continue
		}
		encodedHeaders.WriteByte(byte(len(name)))
		encodedHeaders.WriteString(name)
		encodedHeaders.WriteByte(7)
		_ = binary.Write(&encodedHeaders, binary.BigEndian, uint16(len(value)))
		encodedHeaders.WriteString(value)
	}
	totalLength := 12 + encodedHeaders.Len() + len(payload) + 4
	prelude := make([]byte, 12)
	binary.BigEndian.PutUint32(prelude[:4], uint32(totalLength))
	binary.BigEndian.PutUint32(prelude[4:8], uint32(encodedHeaders.Len()))
	binary.BigEndian.PutUint32(prelude[8:12], crc32.ChecksumIEEE(prelude[:8]))
	frame := append(prelude, encodedHeaders.Bytes()...)
	frame = append(frame, payload...)
	checksum := crc32.ChecksumIEEE(frame)
	crc := make([]byte, 4)
	binary.BigEndian.PutUint32(crc, checksum)
	return append(frame, crc...)
}

package grok

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/protocoltransform"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func TestTransformRequestNormalizesAndIsolatesCacheIdentity(t *testing.T) {
	body := `{
		"model":"client-model","prompt_cache_key":"raw-secret-session",
		"session_id":"raw-body-session","metadata":{"user_id":"tenant_session_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"},
		"prompt_cache_retention":"24h","safety_identifier":"client",
		"presence_penalty":1,"frequencyPenalty":2,"stop":["x"],
		"input":[{"role":"user","content":"hello","external_web_access":true},{"type":"reasoning","content":null,"encrypted_content":"enc"}],
		"tools":[{"type":"function","name":"lookup","parameters":{"type":"object"}}]
	}`
	request := requestWithBody(body)
	request.Header.Set("Authorization", "Bearer downstream-secret")
	request.Header.Set("X-Grok-Conv-Id", "raw-conversation")
	state := grokState(41)
	plan := grokPlan(false, false, false)

	if err := new(Transformer).TransformRequest(request, plan, state); err != nil {
		t.Fatal(err)
	}
	root := readRequestJSON(t, request)
	if got := stringValue(root["model"]); got != "grok-4.5" {
		t.Fatalf("mapped model = %q", got)
	}
	for _, field := range []string{"prompt_cache_retention", "safety_identifier", "presence_penalty", "frequencyPenalty", "stop"} {
		if _, exists := root[field]; exists {
			t.Fatalf("unsupported field %q survived: %#v", field, root[field])
		}
	}
	encoded, _ := json.Marshal(root)
	if strings.Contains(string(encoded), "external_web_access") || strings.Contains(string(encoded), `"content":null`) || strings.Contains(string(encoded), "raw-body-session") || strings.Contains(string(encoded), "tenant_session_") {
		t.Fatalf("recursive/null sanitization failed: %s", encoded)
	}
	identity := stringValue(root["prompt_cache_key"])
	if identity == "" || identity == "raw-secret-session" || identity == "raw-conversation" {
		t.Fatalf("cache identity was not isolated: %q", identity)
	}
	if request.Header.Get("X-Grok-Conv-Id") != identity {
		t.Fatalf("conversation header = %q, identity = %q", request.Header.Get("X-Grok-Conv-Id"), identity)
	}
	if request.Header.Get("Authorization") != "" {
		t.Fatal("downstream authorization survived request transform")
	}

	request2 := requestWithBody(body)
	request2.Header.Set("X-Grok-Conv-Id", "raw-conversation")
	if err := new(Transformer).TransformRequest(request2, plan, grokState(42)); err != nil {
		t.Fatal(err)
	}
	identity2 := stringValue(readRequestJSON(t, request2)["prompt_cache_key"])
	if identity2 == identity {
		t.Fatal("cache identity was shared across API keys")
	}
}

func TestTransformRequestPromotesAndRestoresPrivateTools(t *testing.T) {
	body := `{
		"model":"grok","input":[
			{"type":"additional_tools","tools":[{"type":"custom","name":"exec","format":{"type":"grammar"}},{"type":"tool_search"}]},
			{"type":"custom_tool_call","name":"exec","call_id":"call_1","input":"pwd"},
			{"type":"tool_search_call","call_id":"call_2","arguments":{"query":"git"}}
		],
		"tools":[{"type":"namespace","name":"gmail","tools":[{"type":"function","name":"send","description":"send"}]}],
		"tool_choice":{"type":"custom","name":"exec"}
	}`
	request := requestWithBody(body)
	state := grokState(7)
	if err := new(Transformer).TransformRequest(request, grokPlan(false, false, false), state); err != nil {
		t.Fatal(err)
	}
	root := readRequestJSON(t, request)
	tools, _ := root["tools"].([]any)
	wantNames := map[string]bool{"gmail__send": false, "exec": false, "tool_search": false}
	for _, raw := range tools {
		tool, _ := raw.(map[string]any)
		if _, exists := wantNames[stringValue(tool["name"])]; exists {
			wantNames[stringValue(tool["name"])] = true
		}
		if stringValue(tool["name"]) == "exec" {
			if stringValue(tool["type"]) != "function" || tool["format"] != nil {
				t.Fatalf("custom tool was not lowered: %#v", tool)
			}
		}
	}
	for name, found := range wantNames {
		if !found {
			t.Fatalf("lowered tool %q missing: %#v", name, tools)
		}
	}
	choice, _ := root["tool_choice"].(map[string]any)
	if stringValue(choice["type"]) != "function" || stringValue(choice["name"]) != "exec" {
		t.Fatalf("tool choice was not lowered: %#v", choice)
	}
	if len(state.ProtocolData(mappingStateKey)) == 0 {
		t.Fatal("request-local client tool mapping missing")
	}

	responsePayload := `{"id":"resp_1","output":[
		{"type":"function_call","id":"item_1","call_id":"call_1","name":"exec","arguments":"{\"input\":\"ls -la\"}"},
		{"type":"function_call","id":"item_2","call_id":"call_2","name":"tool_search","arguments":"{\"query\":\"go\"}"},
		{"type":"function_call","id":"item_3","call_id":"call_3","name":"gmail__send","arguments":"{}"}
	]}`
	response := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(responsePayload))}
	response.Header.Set("Content-Type", "application/json")
	if err := new(Transformer).TransformResponse(response, grokPlan(false, false, false), state); err != nil {
		t.Fatal(err)
	}
	restored, _ := io.ReadAll(response.Body)
	var decoded map[string]any
	if err := json.Unmarshal(restored, &decoded); err != nil {
		t.Fatal(err)
	}
	output := decoded["output"].([]any)
	custom := output[0].(map[string]any)
	if stringValue(custom["type"]) != "custom_tool_call" || stringValue(custom["input"]) != "ls -la" || custom["arguments"] != nil {
		t.Fatalf("custom response was not restored: %#v", custom)
	}
	search := output[1].(map[string]any)
	if stringValue(search["type"]) != "tool_search_call" || stringValue(search["execution"]) != "client" || search["name"] != nil {
		t.Fatalf("tool_search response was not restored: %#v", search)
	}
	if query := search["arguments"].(map[string]any)["query"]; query != "go" {
		t.Fatalf("tool_search arguments = %#v", search["arguments"])
	}
	namespace := output[2].(map[string]any)
	if stringValue(namespace["name"]) != "send" || stringValue(namespace["namespace"]) != "gmail" {
		t.Fatalf("namespace response was not restored: %#v", namespace)
	}
}

func TestTransformResponseRestoresCustomToolSSELifecycle(t *testing.T) {
	mapping := clientToolMapping{CustomTools: map[string]bool{"exec": true}}
	state := grokState(1)
	encoded, _ := json.Marshal(mapping)
	state.SetProtocolData(mappingStateKey, encoded)
	sse := strings.Join([]string{
		`event: response.output_item.added`,
		`data: {"type":"response.output_item.added","sequence_number":10,"output_index":0,"item":{"type":"function_call","id":"item_1","call_id":"call_1","name":"exec","arguments":""}}`, "",
		`event: response.function_call_arguments.delta`,
		`data: {"type":"response.function_call_arguments.delta","sequence_number":11,"output_index":0,"item_id":"item_1","delta":"{\"input\":\"ec"}`, "",
		`event: response.function_call_arguments.done`,
		`data: {"type":"response.function_call_arguments.done","sequence_number":12,"output_index":0,"item_id":"item_1","arguments":"{\"input\":\"echo hi\"}"}`, "",
		`event: response.output_item.done`,
		`data: {"type":"response.output_item.done","sequence_number":13,"output_index":0,"item":{"type":"function_call","id":"item_1","call_id":"call_1","name":"exec","arguments":"{\"input\":\"echo hi\"}"}}`, "",
	}, "\n")
	response := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(sse))}
	response.Header.Set("Content-Type", "text/event-stream")
	if err := new(Transformer).TransformResponse(response, grokPlan(false, false, false), state); err != nil {
		t.Fatal(err)
	}
	output, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	text := string(output)
	for _, expected := range []string{
		`"type":"custom_tool_call"`,
		`response.custom_tool_call_input.delta`,
		`response.custom_tool_call_input.done`,
		`"input":"echo hi"`,
	} {
		if !strings.Contains(text, expected) {
			t.Fatalf("restored SSE missing %q:\n%s", expected, text)
		}
	}
	if strings.Contains(text, "response.function_call_arguments") {
		t.Fatalf("private function-argument lifecycle leaked:\n%s", text)
	}
	for _, sequence := range []string{`"sequence_number":10`, `"sequence_number":11`, `"sequence_number":12`, `"sequence_number":13`} {
		if !strings.Contains(text, sequence) {
			t.Fatalf("continuous sequence missing %s:\n%s", sequence, text)
		}
	}
}

func TestCompactRequestAndResponse(t *testing.T) {
	request := requestWithBody(`{"model":"grok","prompt_cache_key":"secret","input":"summarize","tools":[{"type":"function","name":"f"}],"stream":true}`)
	state := grokState(9)
	plan := grokPlan(true, true, true)
	if err := new(Transformer).TransformRequest(request, plan, state); err != nil {
		t.Fatal(err)
	}
	root := readRequestJSON(t, request)
	if root["stream"] != false || root["store"] != false || root["tool_choice"] != "none" {
		t.Fatalf("compact request flags = %#v", root)
	}
	if _, exists := root["prompt_cache_key"]; exists || request.Header.Get("X-Grok-Conv-Id") != "" {
		t.Fatal("compact request carried cache identity")
	}
	input := root["input"].([]any)
	last := input[len(input)-1].(map[string]any)
	content := last["content"].([]any)[0].(map[string]any)
	if !strings.Contains(stringValue(content["text"]), "Primary Request and Intent") {
		t.Fatal("authoritative compact prompt missing")
	}

	responsePayload := `{"id":"resp","status":"completed","output_text":"old","output":[{"type":"reasoning","encrypted_content":"encrypted"},{"type":"message","content":[{"type":"output_text","text":"summary text"}]}]}`
	response := &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(responsePayload))}
	response.Header.Set("Content-Type", "application/json")
	if err := new(Transformer).TransformResponse(response, plan, state); err != nil {
		t.Fatal(err)
	}
	payload, _ := io.ReadAll(response.Body)
	var decoded map[string]any
	_ = json.Unmarshal(payload, &decoded)
	output := decoded["output"].([]any)
	item := output[0].(map[string]any)
	if stringValue(item["type"]) != "compaction" || stringValue(item["encrypted_content"]) != "encrypted" || !strings.HasPrefix(stringValue(item["id"]), "cmp_") {
		t.Fatalf("compact response = %s", payload)
	}
	if _, exists := decoded["output_text"]; exists {
		t.Fatalf("output_text survived compact conversion: %s", payload)
	}
}

func TestPrivateToolConflictFailsAsClientError(t *testing.T) {
	request := requestWithBody(`{"model":"grok","input":"hi","tools":[{"type":"function","name":"exec"},{"type":"custom","name":"exec"}]}`)
	err := new(Transformer).TransformRequest(request, grokPlan(false, false, false), grokState(1))
	if err == nil {
		t.Fatal("expected tool conflict")
	}
	httpErr, ok := err.(protocoltransform.HTTPError)
	if !ok || httpErr.HTTPStatus() != http.StatusBadRequest || httpErr.ErrorCode() != "invalid_tools" {
		t.Fatalf("unexpected error contract: %T %v", err, err)
	}
}

func TestFreeAccountRoutesToolFreeRequestWithoutEnablingSearch(t *testing.T) {
	request := requestWithBody(`{"model":"grok","input":"hello"}`)
	if err := new(Transformer).TransformRequest(request, grokPlan(false, true, true), grokState(1)); err != nil {
		t.Fatal(err)
	}
	root := readRequestJSON(t, request)
	tools := root["tools"].([]any)
	if len(tools) != 2 || root["tool_choice"] != "none" {
		t.Fatalf("free cache route = %#v", root)
	}
}

func TestStablePrefixCacheIdentitySurvivesAppendOnlyTurns(t *testing.T) {
	first := requestWithBody(`{"model":"grok","instructions":"project rules","tools":[{"type":"function","name":"read"}],"input":[{"role":"user","content":"first"}]}`)
	second := requestWithBody(`{"model":"grok","instructions":"project rules","tools":[{"type":"function","name":"read"}],"input":[{"role":"user","content":"first"},{"role":"assistant","content":"answer"},{"role":"user","content":"second"}]}`)
	plan := grokPlan(false, false, false)
	if err := new(Transformer).TransformRequest(first, plan, grokState(88)); err != nil {
		t.Fatal(err)
	}
	if err := new(Transformer).TransformRequest(second, plan, grokState(88)); err != nil {
		t.Fatal(err)
	}
	firstID := stringValue(readRequestJSON(t, first)["prompt_cache_key"])
	secondID := stringValue(readRequestJSON(t, second)["prompt_cache_key"])
	if firstID == "" || firstID != secondID {
		t.Fatalf("append-only identities differ: %q != %q", firstID, secondID)
	}
}

func TestTransformResponsePreservesProviderErrorVerbatim(t *testing.T) {
	state := grokState(1)
	mapping, _ := json.Marshal(clientToolMapping{CustomTools: map[string]bool{"exec": true}})
	state.SetProtocolData(mappingStateKey, mapping)
	want := []byte("upstream temporarily unavailable")
	response := &http.Response{StatusCode: http.StatusServiceUnavailable, Header: make(http.Header), Body: io.NopCloser(bytes.NewReader(want))}
	response.Header.Set("Content-Type", "text/plain")
	if err := new(Transformer).TransformResponse(response, grokPlan(false, false, false), state); err != nil {
		t.Fatal(err)
	}
	got, _ := io.ReadAll(response.Body)
	if !bytes.Equal(got, want) {
		t.Fatalf("provider error changed: %q", got)
	}
}

func TestReadBoundedRejectsOversizeBody(t *testing.T) {
	_, err := readBounded(io.NopCloser(strings.NewReader("12345")), 4, "test")
	if err == nil || !strings.Contains(err.Error(), "exceeds 4 bytes") {
		t.Fatalf("oversize error = %v", err)
	}
}

func TestRetryTransportStripsRejectedEncryptedReasoningOnce(t *testing.T) {
	request := requestWithBody(`{"model":"grok","input":[{"type":"reasoning","summary":[],"encrypted_content":"foreign"},{"role":"user","content":"continue"}]}`)
	state := grokState(1)
	plan := grokPlan(false, false, false)
	plan.MaxAttempts = 2
	if err := new(Transformer).TransformRequest(request, plan, state); err != nil {
		t.Fatal(err)
	}
	attempts := 0
	base := roundTripFunc(func(out *http.Request) (*http.Response, error) {
		attempts++
		body, _ := io.ReadAll(out.Body)
		if attempts == 1 {
			if !bytes.Contains(body, []byte(`"encrypted_content":"foreign"`)) {
				t.Fatalf("first attempt lost encrypted reasoning: %s", body)
			}
			return &http.Response{
				StatusCode: http.StatusBadRequest, Header: make(http.Header), Request: out,
				Body: io.NopCloser(strings.NewReader(`{"code":"invalid-argument","error":"Could not decrypt the provided encrypted_content."}`)),
			}, nil
		}
		if bytes.Contains(body, []byte("encrypted_content")) {
			t.Fatalf("retry retained rejected encrypted reasoning: %s", body)
		}
		return &http.Response{StatusCode: http.StatusOK, Header: make(http.Header), Request: out, Body: io.NopCloser(strings.NewReader(`{"output":[]}`))}, nil
	})
	wrapper, err := new(Transformer).WrapTransport(base, plan, state)
	if err != nil {
		t.Fatal(err)
	}
	state.MarkUpstreamStarted()
	response, err := wrapper.RoundTrip(request)
	if err != nil {
		t.Fatal(err)
	}
	_ = response.Body.Close()
	if attempts != 2 || response.StatusCode != http.StatusOK || state.Finish().Attempts != 2 {
		t.Fatalf("attempts=%d response=%d state=%+v", attempts, response.StatusCode, state.Finish())
	}
}

func TestRetryTransportDoesNotRetryUnrelatedBadRequest(t *testing.T) {
	request := requestWithBody(`{"model":"grok","input":[{"type":"reasoning","encrypted_content":"foreign"}]}`)
	state := grokState(1)
	plan := grokPlan(false, false, false)
	plan.MaxAttempts = 2
	if err := new(Transformer).TransformRequest(request, plan, state); err != nil {
		t.Fatal(err)
	}
	attempts := 0
	base := roundTripFunc(func(out *http.Request) (*http.Response, error) {
		attempts++
		return &http.Response{
			StatusCode: http.StatusBadRequest, Header: make(http.Header), Request: out,
			Body: io.NopCloser(strings.NewReader(`{"code":"invalid-argument","error":"tools are invalid"}`)),
		}, nil
	})
	wrapper, _ := new(Transformer).WrapTransport(base, plan, state)
	response, err := wrapper.RoundTrip(request)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if attempts != 1 || !bytes.Contains(body, []byte("tools are invalid")) {
		t.Fatalf("attempts=%d body=%s", attempts, body)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func requestWithBody(body string) *http.Request {
	request, _ := http.NewRequest(http.MethodPost, "http://gateway.local/v1/responses", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	return request
}

func grokState(apiKeyID int64) *requeststate.State {
	return &requeststate.State{RequestID: "req_test", RequestedModel: "grok", Auth: &requeststate.AuthGrant{APIKeyID: apiKeyID}}
}

func grokPlan(compact, knownFree, allowCache bool) *controlv1.ExecutionPlan {
	return &controlv1.ExecutionPlan{
		MappedModel: "grok-4.5", ProtocolProfile: "grok",
		ProtocolOptions: map[string]string{
			"compact":                 boolText(compact),
			"known_free_account":      boolText(knownFree),
			"allow_client_tool_cache": boolText(allowCache),
		},
	}
}

func boolText(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

func readRequestJSON(t *testing.T, request *http.Request) map[string]any {
	t.Helper()
	payload, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatal(err)
	}
	request.Body = io.NopCloser(bytes.NewReader(payload))
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	var root map[string]any
	if err := decoder.Decode(&root); err != nil {
		t.Fatalf("decode transformed request: %v\n%s", err, payload)
	}
	return root
}

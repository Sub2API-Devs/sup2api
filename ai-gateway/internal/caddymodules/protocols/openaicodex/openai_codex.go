// Package openaicodex implements the ChatGPT Codex Responses wire contract for
// OpenAI OAuth, Codex personal-access-token, and agent-identity accounts.
package openaicodex

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2"
)

const maxRequestBodyBytes int64 = 64 << 20

var forwardedHeaders = map[string]struct{}{
	"accept": {}, "accept-language": {}, "content-type": {}, "conversation_id": {},
	"openai-beta": {}, "originator": {}, "session_id": {}, "user-agent": {},
	"x-codex-beta-features": {}, "x-codex-installation-id": {}, "x-codex-turn-state": {},
	"x-codex-turn-metadata": {}, "x-codex-window-id": {}, "x-responses-lite": {},
}

var unsupportedFields = []string{
	"max_output_tokens", "max_completion_tokens", "max_tokens", "temperature", "top_p",
	"frequency_penalty", "presence_penalty", "user", "metadata", "prompt_cache_retention",
	"safety_identifier", "stream_options", "prompt_cache_options",
}

func init() { caddy.RegisterModule(Transformer{}) }

type Transformer struct{}

func (Transformer) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.protocols.openai_codex", New: func() caddy.Module { return new(Transformer) }}
}

func (*Transformer) ForwardClientAddress() bool { return false }

func (*Transformer) HandlesModelRewrite() bool { return true }

func (*Transformer) TransformRequest(request *http.Request, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if request == nil || request.Body == nil || plan == nil || state == nil || state.Auth == nil {
		return fmt.Errorf("OpenAI Codex request state is incomplete")
	}
	compact, err := strconv.ParseBool(strings.TrimSpace(plan.GetProtocolOptions()["compact"]))
	if err != nil {
		return fmt.Errorf("invalid OpenAI Codex compact option")
	}

	clientSessionID := strings.TrimSpace(request.Header.Get("session_id"))
	clientConversationID := strings.TrimSpace(request.Header.Get("conversation_id"))
	for key := range request.Header {
		if _, allowed := forwardedHeaders[strings.ToLower(strings.TrimSpace(key))]; !allowed {
			request.Header.Del(key)
		}
	}
	stripClientSecrets(request.Header)

	body, err := readBoundedBody(request.Body)
	if err != nil {
		return err
	}
	transformed, promptCacheKey, err := transformBody(body, plan, compact)
	if err != nil {
		return err
	}
	request.Body = io.NopCloser(bytes.NewReader(transformed))
	request.ContentLength = int64(len(transformed))
	request.GetBody = nil
	request.Header.Set("Content-Type", "application/json")
	request.Header.Del("Content-Length")

	if clientSessionID == "" {
		clientSessionID = promptCacheKey
	}
	if clientConversationID == "" {
		clientConversationID = promptCacheKey
	}
	if compact && clientSessionID == "" {
		clientSessionID = state.RequestID
	}
	if isolated := isolateSessionID(state.Auth.APIKeyID, clientSessionID); isolated != "" {
		request.Header.Set("session_id", isolated)
	} else {
		request.Header.Del("session_id")
	}
	if isolated := isolateSessionID(state.Auth.APIKeyID, clientConversationID); isolated != "" {
		request.Header.Set("conversation_id", isolated)
	} else {
		request.Header.Del("conversation_id")
	}
	return nil
}

func (*Transformer) TransformResponse(*http.Response, *controlv1.ExecutionPlan, *requeststate.State) error {
	return nil
}

func readBoundedBody(body io.ReadCloser) ([]byte, error) {
	defer body.Close()
	limited := io.LimitReader(body, maxRequestBodyBytes+1)
	payload, err := io.ReadAll(limited)
	if err != nil {
		return nil, fmt.Errorf("read OpenAI Codex body: %w", err)
	}
	if int64(len(payload)) > maxRequestBodyBytes {
		return nil, fmt.Errorf("OpenAI Codex body exceeds %d bytes", maxRequestBodyBytes)
	}
	return payload, nil
}

func transformBody(body []byte, plan *controlv1.ExecutionPlan, compact bool) ([]byte, string, error) {
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.UseNumber()
	var value map[string]any
	if err := decoder.Decode(&value); err != nil {
		return nil, "", fmt.Errorf("OpenAI Codex body must be a JSON object: %w", err)
	}
	if value == nil {
		return nil, "", fmt.Errorf("OpenAI Codex body must be a JSON object")
	}
	if err := ensureJSONEOF(decoder); err != nil {
		return nil, "", err
	}

	mappedModel := strings.TrimSpace(plan.GetMappedModel())
	if mappedModel == "" {
		return nil, "", fmt.Errorf("OpenAI Codex mapped model is missing")
	}
	value["model"] = mappedModel
	promptCacheKey := strings.TrimSpace(stringValue(value["prompt_cache_key"]))

	if compact {
		allowed := map[string]struct{}{
			"model": {}, "input": {}, "instructions": {}, "tools": {}, "parallel_tool_calls": {},
			"reasoning": {}, "text": {}, "previous_response_id": {},
		}
		for key := range value {
			if _, ok := allowed[key]; !ok {
				delete(value, key)
			}
		}
		if strings.HasPrefix(strings.ToLower(mappedModel), "gpt-5.6") {
			normalizeReasoningEffort(value, "max", "xhigh")
		}
	} else {
		value["store"] = false
		value["stream"] = true
		for _, key := range unsupportedFields {
			delete(value, key)
		}
		normalizeReasoningEffort(value, "minimal", "none")
		ensureReasoningInclude(value)
	}

	normalizeLegacyFunctions(value)
	normalizeFunctionTools(value)
	promoteSystemInstructions(value)
	normalizeInput(value)
	if strings.TrimSpace(stringValue(value["instructions"])) == "" {
		value["instructions"] = plan.GetProtocolOptions()["default_instructions"]
	}
	if deviceID := strings.TrimSpace(plan.GetProtocolOptions()["device_id"]); deviceID != "" && !compact {
		ensureClientMetadata(value, deviceID)
	}
	if tier := strings.TrimSpace(stringValue(value["service_tier"])); strings.EqualFold(tier, "fast") {
		value["service_tier"] = "priority"
	}

	var output bytes.Buffer
	encoder := json.NewEncoder(&output)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return nil, "", fmt.Errorf("encode OpenAI Codex body: %w", err)
	}
	return bytes.TrimSuffix(output.Bytes(), []byte{'\n'}), promptCacheKey, nil
}

func ensureJSONEOF(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); err == io.EOF {
		return nil
	} else if err != nil {
		return fmt.Errorf("read trailing OpenAI Codex body: %w", err)
	}
	return fmt.Errorf("OpenAI Codex body contains trailing JSON data")
}

func normalizeReasoningEffort(body map[string]any, from, to string) {
	reasoning, ok := body["reasoning"].(map[string]any)
	if !ok {
		return
	}
	if strings.EqualFold(strings.TrimSpace(stringValue(reasoning["effort"])), from) {
		reasoning["effort"] = to
	}
}

func ensureReasoningInclude(body map[string]any) {
	reasoning, ok := body["reasoning"].(map[string]any)
	if !ok || len(reasoning) == 0 {
		return
	}
	const encrypted = "reasoning.encrypted_content"
	include, ok := body["include"].([]any)
	if !ok {
		if body["include"] == nil {
			body["include"] = []any{encrypted}
		}
		return
	}
	for _, item := range include {
		if stringValue(item) == encrypted {
			return
		}
	}
	body["include"] = append(include, encrypted)
}

func normalizeLegacyFunctions(body map[string]any) {
	if functions, ok := body["functions"].([]any); ok {
		tools := make([]any, 0, len(functions))
		for _, function := range functions {
			tools = append(tools, map[string]any{"type": "function", "function": function})
		}
		body["tools"] = tools
	}
	delete(body, "functions")
	if raw, ok := body["function_call"]; ok {
		switch call := raw.(type) {
		case string:
			body["tool_choice"] = call
		case map[string]any:
			if name := strings.TrimSpace(stringValue(call["name"])); name != "" {
				body["tool_choice"] = map[string]any{"type": "function", "name": name}
			}
		}
		delete(body, "function_call")
	}
}

func normalizeFunctionTools(body map[string]any) {
	tools, ok := body["tools"].([]any)
	if !ok {
		return
	}
	result := make([]any, 0, len(tools))
	for _, raw := range tools {
		tool, ok := raw.(map[string]any)
		if !ok || strings.TrimSpace(stringValue(tool["type"])) != "function" {
			result = append(result, raw)
			continue
		}
		if strings.TrimSpace(stringValue(tool["name"])) != "" {
			result = append(result, tool)
			continue
		}
		function, ok := tool["function"].(map[string]any)
		if !ok || strings.TrimSpace(stringValue(function["name"])) == "" {
			continue
		}
		for _, key := range []string{"name", "description", "parameters", "strict"} {
			if _, exists := tool[key]; !exists {
				if candidate, exists := function[key]; exists {
					tool[key] = candidate
				}
			}
		}
		delete(tool, "function")
		result = append(result, tool)
	}
	body["tools"] = result
}

func promoteSystemInstructions(body map[string]any) {
	input, ok := body["input"].([]any)
	if !ok {
		return
	}
	var system []string
	for _, raw := range input {
		item, ok := raw.(map[string]any)
		if !ok || strings.TrimSpace(stringValue(item["role"])) != "system" {
			continue
		}
		if text := extractText(item["content"]); text != "" {
			system = append(system, text)
		}
		item["role"] = "developer"
	}
	if len(system) == 0 {
		return
	}
	promoted := strings.Join(system, "\n\n")
	if existing := strings.TrimSpace(stringValue(body["instructions"])); existing != "" {
		promoted += "\n\n" + existing
	}
	body["instructions"] = promoted
}

func normalizeInput(body map[string]any) {
	if text, ok := body["input"].(string); ok {
		body["input"] = []any{map[string]any{"type": "message", "role": "user", "content": text}}
		return
	}
	input, ok := body["input"].([]any)
	if !ok {
		return
	}
	for index, raw := range input {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if strings.TrimSpace(stringValue(item["role"])) == "tool" {
			callID := firstString(item["call_id"], item["tool_call_id"], item["id"])
			if callID != "" {
				input[index] = map[string]any{"type": "function_call_output", "call_id": callID, "output": extractText(item["content"])}
			} else {
				item["role"] = "user"
				delete(item, "tool_call_id")
			}
		}
		if strings.TrimSpace(stringValue(item["type"])) == "reasoning" {
			delete(item, "id")
			if item["summary"] == nil {
				item["summary"] = []any{}
			}
		}
	}
}

func ensureClientMetadata(body map[string]any, deviceID string) {
	metadata, ok := body["client_metadata"].(map[string]any)
	if !ok {
		if body["client_metadata"] == nil {
			body["client_metadata"] = map[string]any{"x-codex-installation-id": deviceID}
		}
		return
	}
	if strings.TrimSpace(stringValue(metadata["x-codex-installation-id"])) == "" {
		metadata["x-codex-installation-id"] = deviceID
	}
}

func extractText(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case []any:
		var parts []string
		for _, raw := range typed {
			part, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			switch strings.TrimSpace(stringValue(part["type"])) {
			case "text", "input_text", "output_text":
				if text, ok := part["text"].(string); ok {
					parts = append(parts, text)
				}
			}
		}
		return strings.Join(parts, "")
	default:
		encoded, _ := json.Marshal(value)
		return string(encoded)
	}
}

func firstString(values ...any) string {
	for _, value := range values {
		if candidate := strings.TrimSpace(stringValue(value)); candidate != "" {
			return candidate
		}
	}
	return ""
}

func stringValue(value any) string {
	text, _ := value.(string)
	return text
}

func stripClientSecrets(header http.Header) {
	for _, key := range []string{
		"Authorization", "Proxy-Authorization", "X-Api-Key", "X-Goog-Api-Key", "Cookie",
		"X-Forwarded-For", "X-Forwarded-Host", "X-Forwarded-Proto", "Forwarded", "X-Real-Ip",
		"Chatgpt-Account-Id", "X-Openai-Fedramp",
	} {
		header.Del(key)
	}
}

func isolateSessionID(apiKeyID int64, raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	var id [8]byte
	binary.BigEndian.PutUint64(id[:], uint64(apiKeyID))
	digest := sha256.New()
	_, _ = digest.Write([]byte("sup2api:openai-session:v1:"))
	_, _ = digest.Write(id[:])
	_, _ = digest.Write([]byte{0})
	_, _ = digest.Write([]byte(raw))
	return hex.EncodeToString(digest.Sum(nil)[:8])
}

var (
	_ caddy.Module = (*Transformer)(nil)
)

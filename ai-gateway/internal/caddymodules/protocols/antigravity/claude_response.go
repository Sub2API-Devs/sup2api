package antigravity

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	protocol "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/antigravityprotocol"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func transformClaudeResponse(response *http.Response, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if response == nil || response.Body == nil || plan == nil || state == nil {
		return fmt.Errorf("Antigravity Claude response state is incomplete")
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		body, err := readBounded(response.Body, maxBodyBytes, "Antigravity Claude error")
		if err != nil {
			return err
		}
		mapped := mapClaudeError(response.StatusCode, body)
		response.Header.Set("Content-Type", "application/json")
		installBody(response, mapped)
		return nil
	}
	clientStream, err := optionBool(plan, "client_stream")
	if err != nil {
		return err
	}
	if clientStream {
		response.Body = transformClaudeSSE(response.Body, state.RequestedModel)
		response.ContentLength = -1
		response.Header.Set("Content-Type", "text/event-stream")
		response.Header.Set("Cache-Control", "no-cache")
		response.Header.Del("Content-Length")
		return nil
	}
	geminiBody, err := collectGeminiSSE(response.Body)
	if err != nil {
		return err
	}
	claudeBody, _, err := protocol.TransformGeminiToClaude(geminiBody, state.RequestedModel)
	if err != nil {
		return fmt.Errorf("convert Antigravity response to Anthropic: %w", err)
	}
	response.Header.Set("Content-Type", "application/json")
	installBody(response, claudeBody)
	return nil
}

type claudeStreamBody struct {
	*io.PipeReader
	source io.ReadCloser
}

func (b *claudeStreamBody) Close() error {
	readerErr := b.PipeReader.Close()
	sourceErr := b.source.Close()
	if readerErr != nil {
		return readerErr
	}
	return sourceErr
}

func transformClaudeSSE(source io.ReadCloser, originalModel string) io.ReadCloser {
	reader, writer := io.Pipe()
	body := &claudeStreamBody{PipeReader: reader, source: source}
	go func() {
		processor := protocol.NewStreamingProcessor(originalModel)
		scanner := bufio.NewScanner(source)
		scanner.Buffer(make([]byte, 64<<10), int(maxBodyBytes))
		var transformErr error
		for scanner.Scan() {
			if events := processor.ProcessLine(strings.TrimRight(scanner.Text(), "\r")); len(events) > 0 {
				if _, transformErr = writer.Write(events); transformErr != nil {
					break
				}
			}
		}
		if transformErr == nil {
			transformErr = scanner.Err()
		}
		if transformErr == nil {
			finalEvents, _ := processor.Finish()
			if !processor.MessageStartSent() {
				transformErr = fmt.Errorf("Antigravity returned an empty Claude stream")
			} else if len(finalEvents) > 0 {
				_, transformErr = writer.Write(finalEvents)
			}
		}
		_ = source.Close()
		_ = writer.CloseWithError(transformErr)
	}()
	return body
}

func collectGeminiSSE(source io.ReadCloser) ([]byte, error) {
	defer source.Close()
	scanner := bufio.NewScanner(source)
	scanner.Buffer(make([]byte, 64<<10), int(maxBodyBytes))
	var total int64
	var last, lastWithParts map[string]any
	var collected []any
	var latestUsage any
	for scanner.Scan() {
		line := strings.TrimRight(scanner.Text(), "\r")
		total += int64(len(line)) + 1
		if total > maxBodyBytes {
			return nil, fmt.Errorf("Antigravity Claude response exceeds %d bytes", maxBodyBytes)
		}
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "" || payload == "[DONE]" {
			continue
		}
		var envelope map[string]any
		decoder := json.NewDecoder(bytes.NewReader([]byte(payload)))
		decoder.UseNumber()
		if decoder.Decode(&envelope) != nil {
			continue
		}
		response := envelope
		if inner, ok := envelope["response"].(map[string]any); ok {
			response = inner
		}
		last = response
		if usage, ok := response["usageMetadata"]; ok {
			latestUsage = usage
		}
		parts := geminiParts(response)
		if len(parts) > 0 {
			lastWithParts = response
			collected = append(collected, parts...)
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	result := lastWithParts
	if result == nil {
		result = last
	}
	if result == nil {
		return nil, fmt.Errorf("Antigravity returned an empty Claude response")
	}
	if len(collected) > 0 {
		candidates, _ := result["candidates"].([]any)
		if len(candidates) > 0 {
			candidate, _ := candidates[0].(map[string]any)
			content, _ := candidate["content"].(map[string]any)
			content["parts"] = collected
		}
	}
	mergeGeminiTerminalMetadata(result, last)
	if latestUsage != nil {
		result["usageMetadata"] = latestUsage
	}
	return marshalJSON(result)
}

func mergeGeminiTerminalMetadata(result, terminal map[string]any) {
	if result == nil || terminal == nil {
		return
	}
	for _, key := range []string{"responseId", "modelVersion"} {
		if value, exists := terminal[key]; exists {
			result[key] = value
		}
	}
	targetCandidates, _ := result["candidates"].([]any)
	sourceCandidates, _ := terminal["candidates"].([]any)
	if len(targetCandidates) == 0 || len(sourceCandidates) == 0 {
		return
	}
	target, _ := targetCandidates[0].(map[string]any)
	source, _ := sourceCandidates[0].(map[string]any)
	for _, key := range []string{"finishReason", "finishMessage", "index", "groundingMetadata"} {
		if value, exists := source[key]; exists {
			target[key] = value
		}
	}
}

func geminiParts(response map[string]any) []any {
	candidates, _ := response["candidates"].([]any)
	if len(candidates) == 0 {
		return nil
	}
	candidate, _ := candidates[0].(map[string]any)
	content, _ := candidate["content"].(map[string]any)
	parts, _ := content["parts"].([]any)
	return parts
}

func mapClaudeError(status int, body []byte) []byte {
	message := "Upstream request failed"
	var root map[string]any
	if json.Unmarshal(unwrapResponse(body), &root) == nil {
		if object, ok := root["error"].(map[string]any); ok {
			if candidate := strings.TrimSpace(stringValue(object["message"])); candidate != "" {
				message = candidate
			}
		} else if candidate := strings.TrimSpace(stringValue(root["message"])); candidate != "" {
			message = candidate
		}
	}
	errorType := "api_error"
	switch status {
	case http.StatusBadRequest:
		errorType = "invalid_request_error"
	case http.StatusUnauthorized:
		errorType = "authentication_error"
	case http.StatusForbidden:
		errorType = "permission_error"
	case http.StatusNotFound:
		errorType = "not_found_error"
	case http.StatusTooManyRequests:
		errorType = "rate_limit_error"
	}
	mapped, _ := json.Marshal(map[string]any{"type": "error", "error": map[string]any{"type": errorType, "message": message}})
	return mapped
}

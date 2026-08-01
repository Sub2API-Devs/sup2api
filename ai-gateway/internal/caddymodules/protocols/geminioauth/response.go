package geminioauth

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const maxSSELineBytes = 16 << 20

func unwrapResponse(payload []byte) []byte {
	var root map[string]json.RawMessage
	if json.Unmarshal(payload, &root) != nil {
		return payload
	}
	inner, exists := root["response"]
	if !exists || len(inner) == 0 || bytes.Equal(bytes.TrimSpace(inner), []byte("null")) {
		return payload
	}
	if !json.Valid(inner) {
		return payload
	}
	return append([]byte(nil), inner...)
}

func insufficientScope(header http.Header, body []byte) bool {
	if strings.Contains(strings.ToLower(header.Get("Www-Authenticate")), "insufficient_scope") {
		return true
	}
	lower := strings.ToLower(string(body))
	return strings.Contains(lower, "insufficient authentication scopes") || strings.Contains(lower, "access_token_scope_insufficient")
}

type streamBody struct {
	*io.PipeReader
	source io.ReadCloser
}

func (b *streamBody) Close() error {
	readerErr := b.PipeReader.Close()
	sourceErr := b.source.Close()
	if readerErr != nil {
		return readerErr
	}
	return sourceErr
}

func transformSSE(source io.ReadCloser) io.ReadCloser {
	reader, writer := io.Pipe()
	body := &streamBody{PipeReader: reader, source: source}
	go func() {
		err := rewriteSSE(source, writer)
		_ = source.Close()
		_ = writer.CloseWithError(err)
	}()
	return body
}

func rewriteSSE(source io.Reader, destination io.Writer) error {
	scanner := bufio.NewScanner(source)
	scanner.Buffer(make([]byte, 64<<10), maxSSELineBytes)
	writer := bufio.NewWriterSize(destination, 4<<10)
	for scanner.Scan() {
		line := strings.TrimSuffix(scanner.Text(), "\r")
		if strings.HasPrefix(line, "data:") {
			payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			if payload != "" && payload != "[DONE]" {
				payload = string(unwrapResponse([]byte(payload)))
			}
			line = "data: " + payload
		}
		if _, err := writer.WriteString(line + "\n"); err != nil {
			return err
		}
		if line == "" {
			if err := writer.Flush(); err != nil {
				return err
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read Gemini Code Assist SSE: %w", err)
	}
	return writer.Flush()
}

func aggregateSSE(source io.ReadCloser) ([]byte, error) {
	defer source.Close()
	scanner := bufio.NewScanner(source)
	scanner.Buffer(make([]byte, 64<<10), maxSSELineBytes)
	var last, lastWithParts map[string]any
	var textParts []string
	var latestUsage any
	for scanner.Scan() {
		line := strings.TrimSuffix(scanner.Text(), "\r")
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "" || payload == "[DONE]" {
			continue
		}
		inner := unwrapResponse([]byte(payload))
		var event map[string]any
		decoder := json.NewDecoder(bytes.NewReader(inner))
		decoder.UseNumber()
		if decoder.Decode(&event) != nil || event == nil {
			continue
		}
		last = event
		if usage, exists := event["usageMetadata"]; exists {
			latestUsage = usage
		}
		parts := responseParts(event)
		if len(parts) > 0 {
			lastWithParts = event
			for _, part := range parts {
				if text := stringValue(part["text"]); text != "" {
					textParts = append(textParts, text)
				}
			}
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
		result = map[string]any{}
	}
	result = mergeTextParts(result, textParts)
	if latestUsage != nil {
		result["usageMetadata"] = latestUsage
	}
	return marshalJSON(result)
}

func responseParts(root map[string]any) []map[string]any {
	candidates, _ := root["candidates"].([]any)
	if len(candidates) == 0 {
		return nil
	}
	candidate, _ := candidates[0].(map[string]any)
	content, _ := candidate["content"].(map[string]any)
	parts, _ := content["parts"].([]any)
	result := make([]map[string]any, 0, len(parts))
	for _, raw := range parts {
		if part, ok := raw.(map[string]any); ok {
			result = append(result, part)
		}
	}
	return result
}

func mergeTextParts(root map[string]any, texts []string) map[string]any {
	if len(texts) == 0 {
		return root
	}
	merged := strings.Join(texts, "")
	candidates, _ := root["candidates"].([]any)
	if len(candidates) == 0 {
		candidates = []any{map[string]any{}}
		root["candidates"] = candidates
	}
	candidate, ok := candidates[0].(map[string]any)
	if !ok {
		candidate = map[string]any{}
		candidates[0] = candidate
	}
	content, ok := candidate["content"].(map[string]any)
	if !ok {
		content = map[string]any{"role": "model"}
		candidate["content"] = content
	}
	parts, _ := content["parts"].([]any)
	updated := false
	for _, raw := range parts {
		part, ok := raw.(map[string]any)
		if ok && !updated {
			if _, exists := part["text"]; exists {
				part["text"] = merged
				updated = true
			}
		}
	}
	if !updated {
		content["parts"] = append([]any{map[string]any{"text": merged}}, parts...)
	}
	return root
}

package geminioauth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

const dummyThoughtSignature = "skip_thought_signature_validator"

func decodeObject(payload []byte) (map[string]any, error) {
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	var root map[string]any
	if err := decoder.Decode(&root); err != nil {
		return nil, fmt.Errorf("Gemini request body must be a JSON object: %w", err)
	}
	if root == nil {
		return nil, fmt.Errorf("Gemini request body must be a JSON object")
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		if err == nil {
			return nil, fmt.Errorf("Gemini request body contains trailing JSON data")
		}
		return nil, fmt.Errorf("read trailing Gemini request body: %w", err)
	}
	return root, nil
}

func marshalJSON(value any) ([]byte, error) {
	var output bytes.Buffer
	encoder := json.NewEncoder(&output)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(output.Bytes(), []byte{'\n'}), nil
}

func filterEmptyContents(root map[string]any) {
	contents, ok := root["contents"].([]any)
	if !ok {
		return
	}
	filtered := make([]any, 0, len(contents))
	for _, raw := range contents {
		content, ok := raw.(map[string]any)
		if !ok {
			filtered = append(filtered, raw)
			continue
		}
		parts, exists := content["parts"]
		if !exists {
			filtered = append(filtered, raw)
			continue
		}
		if list, ok := parts.([]any); ok && len(list) == 0 {
			continue
		}
		filtered = append(filtered, raw)
	}
	root["contents"] = filtered
}

func ensureFunctionCallThoughtSignatures(root map[string]any) {
	contents, _ := root["contents"].([]any)
	for _, rawContent := range contents {
		content, _ := rawContent.(map[string]any)
		parts, _ := content["parts"].([]any)
		for _, rawPart := range parts {
			part, _ := rawPart.(map[string]any)
			if functionCall, ok := part["functionCall"].(map[string]any); !ok || functionCall == nil {
				continue
			}
			if strings.TrimSpace(stringValue(part["thoughtSignature"])) == "" {
				part["thoughtSignature"] = dummyThoughtSignature
			}
		}
	}
}

func estimateCountTokens(root map[string]any) int {
	total := 0
	addParts := func(value any) {
		parts, _ := value.([]any)
		for _, raw := range parts {
			part, _ := raw.(map[string]any)
			total += estimateTextTokens(stringValue(part["text"]))
		}
	}
	if system, ok := root["systemInstruction"].(map[string]any); ok {
		addParts(system["parts"])
	}
	contents, _ := root["contents"].([]any)
	for _, raw := range contents {
		content, _ := raw.(map[string]any)
		addParts(content["parts"])
	}
	return total
}

func estimateTextTokens(text string) int {
	text = strings.TrimSpace(text)
	if text == "" {
		return 0
	}
	runes := []rune(text)
	ascii := 0
	for _, value := range runes {
		if value <= 0x7f {
			ascii++
		}
	}
	if float64(ascii)/float64(len(runes)) >= 0.8 {
		return (len(runes) + 3) / 4
	}
	return len(runes)
}

func stringValue(value any) string {
	text, _ := value.(string)
	return text
}

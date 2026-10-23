package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"strconv"
	"strings"
)

func isJSONString(raw json.RawMessage) bool {
	raw = bytes.TrimSpace(raw)
	return len(raw) >= 2 && raw[0] == '"'
}

// Validate protocol locations only. Arbitrary tool input/schema properties
// named text or requestPolicy are ordinary user data, not envelope controls.
func validateBuildContent(raw []byte) error {
	var body map[string]json.RawMessage
	if json.Unmarshal(raw, &body) != nil || body == nil {
		return fmt.Errorf("expected a Messages JSON object")
	}
	for _, key := range []string{"requestPolicy", "runtimeContext", "attachments", "systemPrompt", "ccgatewaySystemBlocks", "ccgatewayBuildOnly"} {
		if _, ok := body[key]; ok {
			return fmt.Errorf("reserved internal request field %s", key)
		}
	}
	if err := validateBuildGenerationParameters(body); err != nil {
		return err
	}
	var content func(json.RawMessage, string) error
	content = func(raw json.RawMessage, path string) error {
		if isJSONString(raw) {
			return nil
		}
		var blocks []map[string]json.RawMessage
		if json.Unmarshal(raw, &blocks) != nil || blocks == nil {
			return fmt.Errorf("%s must be a string or block array", path)
		}
		for i, block := range blocks {
			if block == nil {
				return fmt.Errorf("invalid block at %s[%d]", path, i)
			}
			var kind string
			if json.Unmarshal(block["type"], &kind) != nil || kind == "" {
				return fmt.Errorf("invalid block type at %s[%d]", path, i)
			}
			if strings.HasPrefix(kind, "ccgateway_") {
				return fmt.Errorf("reserved internal block type at %s[%d]", path, i)
			}
			if kind == "text" && !isJSONString(block["text"]) {
				return fmt.Errorf("text must be a non-null string at %s[%d]", path, i)
			}
			if kind == "tool_result" {
				if nested, ok := block["content"]; ok {
					if err := content(nested, fmt.Sprintf("%s[%d].content", path, i)); err != nil {
						return err
					}
				}
			}
		}
		return nil
	}
	if system, ok := body["system"]; ok {
		if err := content(system, "system"); err != nil {
			return err
		}
	}
	var messages []map[string]json.RawMessage
	if json.Unmarshal(body["messages"], &messages) != nil || len(messages) == 0 {
		return fmt.Errorf("messages must be a non-empty array")
	}
	for i, message := range messages {
		var role string
		if json.Unmarshal(message["role"], &role) != nil || (role != "user" && role != "assistant" && role != "system") {
			return fmt.Errorf("invalid role at messages[%d]", i)
		}
		for _, key := range []string{"attachment", "ccgatewayBuildOnly", "ccgatewaySystemBlocks"} {
			if _, ok := message[key]; ok {
				return fmt.Errorf("reserved internal message field %s", key)
			}
		}
		if err := content(message["content"], fmt.Sprintf("messages[%d].content", i)); err != nil {
			return err
		}
	}
	return nil
}

// Validate explicit generation controls before starting the CLI. Omitted
// controls still use native defaults; model-specific budget adjustment remains
// the CLI's responsibility. This validator is never used by direct mode.
func validateBuildGenerationParameters(body map[string]json.RawMessage) error {
	positiveInteger := func(raw json.RawMessage, field string) error {
		text := string(bytes.TrimSpace(raw))
		n, err := strconv.ParseFloat(text, 64)
		if err != nil || n <= 0 || n > 9007199254740991 || math.Trunc(n) != n {
			return fmt.Errorf("%s must be a positive safe integer", field)
		}
		// Check the exact JSON number before a float64/JS conversion can round
		// a fractional boundary value into an apparently valid integer.
		value, ok := new(big.Rat).SetString(text)
		if !ok || !value.IsInt() || value.Sign() <= 0 || value.Num().Cmp(big.NewInt(9007199254740991)) > 0 {
			return fmt.Errorf("%s must be a positive safe integer", field)
		}
		return nil
	}
	if value, exists := body["max_tokens"]; exists {
		if err := positiveInteger(value, "max_tokens"); err != nil {
			return err
		}
	}
	if value, exists := body["stream"]; exists {
		value = bytes.TrimSpace(value)
		if !bytes.Equal(value, []byte("true")) && !bytes.Equal(value, []byte("false")) {
			return fmt.Errorf("stream must be a boolean")
		}
	}
	if value, exists := body["thinking"]; exists {
		var thinking map[string]json.RawMessage
		if json.Unmarshal(value, &thinking) != nil || thinking == nil {
			return fmt.Errorf("thinking must be an object")
		}
		var kind string
		if json.Unmarshal(thinking["type"], &kind) != nil || (kind != "enabled" && kind != "disabled" && kind != "adaptive") {
			return fmt.Errorf("thinking.type must be enabled, disabled or adaptive")
		}
		budget, hasBudget := thinking["budget_tokens"]
		if kind == "enabled" {
			if !hasBudget {
				return fmt.Errorf("thinking.budget_tokens is required when thinking.type is enabled")
			}
			if err := positiveInteger(budget, "thinking.budget_tokens"); err != nil {
				return err
			}
		} else if hasBudget {
			return fmt.Errorf("thinking.budget_tokens requires thinking.type enabled")
		}
	}
	return nil
}

func validateBuildNumbers(raw []byte) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var root any
	if err := decoder.Decode(&root); err != nil {
		return err
	}
	var visit func(any) error
	visit = func(value any) error {
		switch v := value.(type) {
		case json.Number:
			n, err := strconv.ParseFloat(string(v), 64)
			if err != nil || math.IsNaN(n) || math.IsInf(n, 0) || math.Trunc(n) == n && math.Abs(n) > 9007199254740991 {
				return fmt.Errorf("build cannot represent an unsafe JSON number; use direct mode")
			}
		case map[string]any:
			for _, item := range v {
				if err := visit(item); err != nil {
					return err
				}
			}
		case []any:
			for _, item := range v {
				if err := visit(item); err != nil {
					return err
				}
			}
		}
		return nil
	}
	return visit(root)
}

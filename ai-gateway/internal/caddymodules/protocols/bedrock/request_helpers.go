package bedrock

import (
	"crypto/sha256"
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
)

var claudeVersion = regexp.MustCompile(`claude-(?:haiku|sonnet|opus)-(\d+)(?:[-.](\d+))?`)

func sha256Sum(value []byte) [32]byte { return sha256.Sum256(value) }

func splitTokens(value string) []string {
	var result []string
	seen := make(map[string]struct{})
	for _, token := range strings.FieldsFunc(value, func(r rune) bool { return r == ',' || r == ' ' }) {
		token = strings.TrimSpace(token)
		if token == "" {
			continue
		}
		if replacement, ok := map[string]string{"advanced-tool-use-2025-11-20": "tool-search-tool-2025-10-19"}[token]; ok {
			token = replacement
		}
		if _, ok := seen[token]; !ok {
			result = append(result, token)
			seen[token] = struct{}{}
		}
	}
	return result
}

func stringSet(values []string) map[string]struct{} {
	result := make(map[string]struct{}, len(values))
	for _, value := range values {
		result[value] = struct{}{}
	}
	return result
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func stringValue(value any) string {
	result, _ := value.(string)
	return strings.TrimSpace(result)
}

func nestedValue(value map[string]any, path string) any {
	current := any(value)
	for _, segment := range strings.Split(path, ".") {
		object, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current = object[segment]
	}
	return current
}

func containsNestedString(value map[string]any, path, target string) bool {
	items, _ := nestedValue(value, path).([]any)
	for _, item := range items {
		if stringValue(item) == target {
			return true
		}
	}
	return false
}

func hasNestedArray(value map[string]any, path string) bool {
	items, _ := nestedValue(value, path).([]any)
	return len(items) > 0
}

func modelSupportsToolSearch(modelID string) bool {
	lower := strings.ToLower(modelID)
	if strings.Contains(lower, "haiku") {
		return false
	}
	matches := claudeVersion.FindStringSubmatch(lower)
	if len(matches) != 3 {
		return false
	}
	major, _ := strconv.Atoi(matches[1])
	minor, _ := strconv.Atoi(matches[2])
	return major > 4 || major == 4 && minor >= 5
}

func convertOutputFormat(body map[string]any) {
	format, ok := body["output_format"].(map[string]any)
	if !ok {
		return
	}
	schema, exists := format["schema"]
	if !exists {
		return
	}
	encoded, err := json.Marshal(schema)
	if err != nil {
		return
	}
	messages, _ := body["messages"].([]any)
	for index := len(messages) - 1; index >= 0; index-- {
		message, ok := messages[index].(map[string]any)
		if !ok || stringValue(message["role"]) != "user" {
			continue
		}
		instruction := map[string]any{"type": "text", "text": string(encoded)}
		switch content := message["content"].(type) {
		case string:
			message["content"] = []any{map[string]any{"type": "text", "text": content}, instruction}
		case []any:
			message["content"] = append(content, instruction)
		}
		return
	}
}

func removeToolCustomFields(body map[string]any) {
	tools, _ := body["tools"].([]any)
	for _, raw := range tools {
		if tool, ok := raw.(map[string]any); ok {
			delete(tool, "custom")
		}
	}
}

func sanitizeCacheControl(body map[string]any, modelID string) {
	allowTTL := modelClaude45OrNewer(modelID)
	sanitizeBlock := func(block map[string]any) {
		cache, _ := block["cache_control"].(map[string]any)
		if cache == nil {
			return
		}
		delete(cache, "scope")
		ttl := stringValue(cache["ttl"])
		if !allowTTL || ttl != "5m" && ttl != "1h" {
			delete(cache, "ttl")
		}
	}
	if system, ok := body["system"].([]any); ok {
		for _, raw := range system {
			if block, ok := raw.(map[string]any); ok {
				sanitizeBlock(block)
			}
		}
	}
	if messages, ok := body["messages"].([]any); ok {
		for _, rawMessage := range messages {
			message, _ := rawMessage.(map[string]any)
			content, _ := message["content"].([]any)
			for _, rawBlock := range content {
				if block, ok := rawBlock.(map[string]any); ok {
					sanitizeBlock(block)
				}
			}
		}
	}
}

func modelClaude45OrNewer(modelID string) bool {
	matches := claudeVersion.FindStringSubmatch(strings.ToLower(modelID))
	if len(matches) != 3 {
		return strings.Contains(strings.ToLower(modelID), "claude-fable-5")
	}
	major, _ := strconv.Atoi(matches[1])
	minor, _ := strconv.Atoi(matches[2])
	return major > 4 || major == 4 && minor >= 5
}

func sanitizeThinking(body map[string]any, modelID string) {
	thinking, _ := body["thinking"].(map[string]any)
	if thinking == nil {
		return
	}
	typeName := stringValue(thinking["type"])
	lower := strings.ToLower(modelID)
	if strings.Contains(lower, "claude-fable-5") || modelOpus47OrNewer(lower) {
		if typeName == "enabled" {
			thinking["type"] = "adaptive"
		}
		if typeName == "enabled" || typeName == "adaptive" {
			delete(thinking, "budget_tokens")
		}
		return
	}
	if typeName == "enabled" && thinking["budget_tokens"] == nil {
		thinking["budget_tokens"] = json.Number(strconv.Itoa(defaultThinkingBudgetTokens))
	}
}

func modelOpus47OrNewer(modelID string) bool {
	if !strings.Contains(modelID, "opus") {
		return false
	}
	matches := claudeVersion.FindStringSubmatch(modelID)
	if len(matches) != 3 {
		return false
	}
	major, _ := strconv.Atoi(matches[1])
	minor, _ := strconv.Atoi(matches[2])
	return major > 4 || major == 4 && minor >= 7
}

func sanitizeToolUseIDs(body map[string]any) {
	messages, _ := body["messages"].([]any)
	for _, rawMessage := range messages {
		message, _ := rawMessage.(map[string]any)
		content, _ := message["content"].([]any)
		for _, rawBlock := range content {
			block, _ := rawBlock.(map[string]any)
			switch stringValue(block["type"]) {
			case "tool_use":
				if id := stringValue(block["id"]); id != "" {
					block["id"] = invalidToolUseID.ReplaceAllString(id, "_")
				}
			case "tool_result":
				if id := stringValue(block["tool_use_id"]); id != "" {
					block["tool_use_id"] = invalidToolUseID.ReplaceAllString(id, "_")
				}
			}
		}
	}
}

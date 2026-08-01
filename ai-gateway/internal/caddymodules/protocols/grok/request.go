package grok

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

var (
	claudeSessionSuffix = regexp.MustCompile(`_session_([a-fA-F0-9-]+)$`)
	supportedToolTypes  = map[string]bool{
		"code_execution": true, "code_interpreter": true, "collections_search": true,
		"file_search": true, "function": true, "mcp": true, "shell": true,
		"web_search": true, "x_search": true,
	}
)

type cacheSeedHeaders struct {
	ClaudeSession string
	Sessions      []string
	Conversation  string
}

func captureCacheSeedHeaders(header http.Header) cacheSeedHeaders {
	seeds := cacheSeedHeaders{ClaudeSession: strings.TrimSpace(header.Get("X-Claude-Code-Session-Id")), Conversation: strings.TrimSpace(header.Get("X-Grok-Conv-Id"))}
	for _, name := range []string{"session_id", "conversation_id", "X-Session-Affinity", "X-Session-Id", "X-OpenCode-Session", "X-Conversation-ID"} {
		seeds.Sessions = append(seeds.Sessions, strings.TrimSpace(header.Get(name)))
	}
	return seeds
}

func stripClientHeaders(header http.Header) {
	// The legacy in-process path constructs a fresh upstream request and only
	// forwards OpenAI-Beta. Apply the same allowlist here so arbitrary client
	// headers cannot become xAI identity, routing, or credential inputs.
	for name := range header {
		if !strings.EqualFold(strings.TrimSpace(name), "OpenAI-Beta") {
			header.Del(name)
		}
	}
}

func decodeJSONObject(payload []byte) (map[string]any, error) {
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	var root map[string]any
	if err := decoder.Decode(&root); err != nil {
		return nil, fmt.Errorf("Grok request body must be a JSON object: %w", err)
	}
	if root == nil {
		return nil, fmt.Errorf("Grok request body must be a JSON object")
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		if err == nil {
			return nil, fmt.Errorf("Grok request body contains trailing JSON data")
		}
		return nil, fmt.Errorf("read trailing Grok request body: %w", err)
	}
	return root, nil
}

func cloneJSONObject(root map[string]any) map[string]any {
	payload, _ := json.Marshal(root)
	clone, _ := decodeJSONObject(payload)
	return clone
}

func marshalJSON(value any) ([]byte, error) {
	var out bytes.Buffer
	encoder := json.NewEncoder(&out)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(out.Bytes(), []byte{'\n'}), nil
}

func promoteAdditionalTools(root map[string]any) error {
	input, ok := root["input"].([]any)
	if !ok {
		return nil
	}
	tools, _ := root["tools"].([]any)
	merged := append([]any(nil), tools...)
	seen := make(map[string]bool)
	for _, raw := range merged {
		seen[toolDedupKey(raw)] = true
	}
	filtered := make([]any, 0, len(input))
	changed := false
	for _, raw := range input {
		item, ok := raw.(map[string]any)
		if !ok || stringValue(item["type"]) != "additional_tools" {
			filtered = append(filtered, raw)
			continue
		}
		changed = true
		additional, _ := item["tools"].([]any)
		for _, tool := range additional {
			key := toolDedupKey(tool)
			if !seen[key] {
				seen[key] = true
				merged = append(merged, tool)
			}
		}
	}
	if changed {
		root["input"] = filtered
		if len(merged) > 0 {
			root["tools"] = merged
		}
	}
	return nil
}

func toolDedupKey(value any) string {
	tool, _ := value.(map[string]any)
	typ, name := strings.TrimSpace(stringValue(tool["type"])), strings.TrimSpace(stringValue(tool["name"]))
	if typ != "" && name != "" {
		return "type:" + typ + "\x00name:" + name
	}
	if typ == "mcp" {
		if label := strings.TrimSpace(stringValue(tool["server_label"])); label != "" {
			return "type:mcp\x00server_label:" + label
		}
	}
	payload, _ := marshalJSON(value)
	return "json:" + string(payload)
}

func normalizeRequest(root map[string]any, mappedModel string) error {
	root["model"] = mappedModel
	if modelRejectsReasoningEffort(mappedModel) {
		delete(root, "reasoning")
		delete(root, "reasoning_effort")
		delete(root, "reasoningEffort")
	}
	delete(root, "prompt_cache_retention")
	delete(root, "safety_identifier")
	if strings.EqualFold(mappedModel, "grok-4.5") {
		for _, field := range []string{"presence_penalty", "presencePenalty", "frequency_penalty", "frequencyPenalty", "stop"} {
			delete(root, field)
		}
	}
	deleteRecursive(root, "external_web_access")
	convertCompactInputs(root)
	removeNullReasoningContent(root)
	sanitizeTools(root)
	return nil
}

func modelRejectsReasoningEffort(model string) bool {
	model = strings.ToLower(strings.TrimSpace(model))
	if slash := strings.LastIndex(model, "/"); slash >= 0 {
		model = strings.TrimSpace(model[slash+1:])
	}
	return model == "grok-composer" || model == "grok-composer-2.5-fast" || model == "composer-2.5"
}

func deleteRecursive(value any, field string) {
	switch typed := value.(type) {
	case map[string]any:
		delete(typed, field)
		for _, child := range typed {
			deleteRecursive(child, field)
		}
	case []any:
		for _, child := range typed {
			deleteRecursive(child, field)
		}
	}
}

func removeNullReasoningContent(root map[string]any) {
	input, _ := root["input"].([]any)
	for _, raw := range input {
		item, _ := raw.(map[string]any)
		if stringValue(item["type"]) == "reasoning" && item["content"] == nil {
			delete(item, "content")
		}
	}
}

func sanitizeTools(root map[string]any) {
	tools, ok := root["tools"].([]any)
	if !ok {
		delete(root, "tool_choice")
		return
	}
	filtered := make([]any, 0, len(tools))
	for _, raw := range tools {
		tool, _ := raw.(map[string]any)
		if supportedToolTypes[strings.TrimSpace(stringValue(tool["type"]))] {
			filtered = append(filtered, raw)
		}
	}
	if len(filtered) == 0 {
		delete(root, "tools")
		delete(root, "tool_choice")
		return
	}
	root["tools"] = filtered
	choice, ok := root["tool_choice"].(map[string]any)
	if !ok {
		return
	}
	typ := strings.TrimSpace(stringValue(choice["type"]))
	if typ != "" && !supportedToolTypes[typ] {
		delete(root, "tool_choice")
		return
	}
	if typ != "function" {
		return
	}
	name := strings.TrimSpace(stringValue(choice["name"]))
	if name == "" {
		if function, ok := choice["function"].(map[string]any); ok {
			name = strings.TrimSpace(stringValue(function["name"]))
		}
	}
	if name == "" {
		return
	}
	for _, raw := range filtered {
		tool, _ := raw.(map[string]any)
		if stringValue(tool["type"]) != "function" {
			continue
		}
		toolName := strings.TrimSpace(stringValue(tool["name"]))
		if toolName == "" {
			if function, ok := tool["function"].(map[string]any); ok {
				toolName = strings.TrimSpace(stringValue(function["name"]))
			}
		}
		if toolName == name {
			return
		}
	}
	delete(root, "tool_choice")
}

func resolveCacheIdentity(apiKeyID int64, mappedModel string, seeds cacheSeedHeaders, root map[string]any) string {
	if apiKeyID <= 0 || strings.TrimSpace(mappedModel) == "" {
		return ""
	}
	seed := strings.TrimSpace(seeds.ClaudeSession)
	if seed == "" {
		seed = claudeSessionFromMetadata(root)
	}
	if seed == "" {
		for _, candidate := range seeds.Sessions {
			if seed = strings.TrimSpace(candidate); seed != "" {
				break
			}
		}
	}
	if seed == "" {
		seed = bodySessionSeed(root)
	}
	if seed == "" {
		seed = strings.TrimSpace(seeds.Conversation)
	}
	if seed == "" {
		seed = strings.TrimSpace(stringValue(root["prompt_cache_key"]))
	}
	if seed == "" {
		seed = stablePrefixSeed(root)
	}
	if seed == "" {
		seed = anchoredUserSeed(root)
	}
	if seed == "" {
		return ""
	}
	isolated := fmt.Sprintf("grok-prompt-cache:v1:%d:%s:%s", apiKeyID, strings.ToLower(strings.TrimSpace(mappedModel)), seed)
	return deterministicUUID(isolated)
}

func bodySessionSeed(root map[string]any) string {
	for _, field := range []string{"session_id", "conversation_id", "sessionId", "conversationId"} {
		if seed := strings.TrimSpace(stringValue(root[field])); seed != "" {
			return seed
		}
	}
	return ""
}

func stripBodySessionFields(root map[string]any) {
	for _, field := range []string{"session_id", "conversation_id", "sessionId", "conversationId"} {
		delete(root, field)
	}
	// Claude-compatible clients often encode their raw session in
	// metadata.user_id. It has already contributed to the isolated cache key;
	// do not forward the original tenant identifier to xAI.
	if metadata, ok := root["metadata"].(map[string]any); ok {
		delete(metadata, "user_id")
		if len(metadata) == 0 {
			delete(root, "metadata")
		}
	}
}

func claudeSessionFromMetadata(root map[string]any) string {
	metadata, _ := root["metadata"].(map[string]any)
	userID := strings.TrimSpace(stringValue(metadata["user_id"]))
	if matches := claudeSessionSuffix.FindStringSubmatch(userID); len(matches) == 2 {
		return matches[1]
	}
	if strings.HasPrefix(userID, "{") {
		var embedded map[string]any
		if json.Unmarshal([]byte(userID), &embedded) == nil {
			return strings.TrimSpace(stringValue(embedded["session_id"]))
		}
	}
	return ""
}

func stablePrefixSeed(root map[string]any) string {
	parts := make([]string, 0, 6)
	appendValue := func(label string, value any) {
		if emptyJSONValue(value) {
			return
		}
		encoded, err := marshalJSON(value)
		if err == nil {
			parts = append(parts, label+"="+string(encoded))
		}
	}
	appendValue("tools", root["tools"])
	appendValue("functions", root["functions"])
	if strings.TrimSpace(stringValue(root["instructions"])) != "" {
		appendValue("instructions", root["instructions"])
	}
	items, _ := root["messages"].([]any)
	if len(items) == 0 {
		items, _ = root["input"].([]any)
	}
	for _, raw := range items {
		item, _ := raw.(map[string]any)
		role := strings.TrimSpace(stringValue(item["role"]))
		if role == "system" || role == "developer" {
			appendValue(role, item["content"])
		}
	}
	if len(parts) == 0 {
		return ""
	}
	return "openai-stable-prefix:v1|" + strings.Join(parts, "|")
}

func anchoredUserSeed(root map[string]any) string {
	if input, ok := root["input"].(string); ok && strings.TrimSpace(input) != "" {
		return "openai-content:v1|first_user=" + input
	}
	items, _ := root["messages"].([]any)
	if len(items) == 0 {
		items, _ = root["input"].([]any)
	}
	for _, raw := range items {
		item, _ := raw.(map[string]any)
		if stringValue(item["role"]) == "user" && !emptyJSONValue(item["content"]) {
			encoded, _ := marshalJSON(item["content"])
			return "openai-content:v1|first_user=" + string(encoded)
		}
		if stringValue(item["type"]) == "input_text" && strings.TrimSpace(stringValue(item["text"])) != "" {
			return "openai-content:v1|first_user=" + stringValue(item["text"])
		}
	}
	return ""
}

func emptyJSONValue(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return strings.TrimSpace(typed) == ""
	case []any:
		return len(typed) == 0
	case map[string]any:
		return len(typed) == 0
	default:
		return false
	}
}

func deterministicUUID(seed string) string {
	digest := sha256.Sum256([]byte(seed))
	digest[6] = (digest[6] & 0x0f) | 0x40
	digest[8] = (digest[8] & 0x3f) | 0x80
	hexID := hex.EncodeToString(digest[:16])
	return hexID[:8] + "-" + hexID[8:12] + "-" + hexID[12:16] + "-" + hexID[16:20] + "-" + hexID[20:32]
}

func applyCacheIdentity(root map[string]any, identity string) {
	if strings.TrimSpace(identity) == "" {
		delete(root, "prompt_cache_key")
		return
	}
	root["prompt_cache_key"] = identity
}

func applyRequestCachePolicy(accountPolicy bool, raw string) bool {
	switch raw {
	case "1", "true", "yes", "on", "prefer-cache":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return accountPolicy
	}
}

func applyFreeCacheRoute(root, rawIntent, toolIntent map[string]any, identity string, knownFree, allowPureClientTools bool) {
	if !knownFree || identity == "" {
		return
	}
	if !hasToolIntent(rawIntent) {
		root["tools"] = []any{map[string]any{"type": "web_search"}, map[string]any{"type": "x_search"}}
		root["tool_choice"] = "none"
		return
	}
	intentTools, ok := toolIntent["tools"].([]any)
	if !ok || len(intentTools) == 0 || !cacheableToolIntent(intentTools, toolIntent["tool_choice"]) {
		return
	}
	choice, _ := toolIntent["tool_choice"].(string)
	if choice == "none" {
		appendNativeCacheTools(root, true, false)
		return
	}
	appendNativeCacheTools(root, allowPureClientTools, allowPureClientTools)
}

func hasToolIntent(root map[string]any) bool {
	if _, ok := root["tools"]; ok {
		return true
	}
	if _, ok := root["tool_choice"]; ok {
		return true
	}
	input, _ := root["input"].([]any)
	for _, raw := range input {
		item, _ := raw.(map[string]any)
		if stringValue(item["type"]) == "additional_tools" {
			return true
		}
	}
	return false
}

func cacheableToolIntent(tools []any, choice any) bool {
	for _, raw := range tools {
		tool, ok := raw.(map[string]any)
		if !ok || !supportedToolTypes[stringValue(tool["type"])] {
			return false
		}
		if stringValue(tool["type"]) == "function" && (strings.TrimSpace(stringValue(tool["name"])) == "" || tool["function"] != nil) {
			return false
		}
	}
	if choice == nil {
		return true
	}
	text, ok := choice.(string)
	return ok && (text == "auto" || text == "none")
}

func appendNativeCacheTools(root map[string]any, allowPureClientTools, allowFunctionSearch bool) {
	tools, ok := root["tools"].([]any)
	if !ok || len(tools) == 0 {
		return
	}
	present := make(map[string]bool)
	hasCompanion, hasNativeSearch := false, false
	merged := make([]any, 0, len(tools)+2)
	for _, raw := range tools {
		tool, ok := raw.(map[string]any)
		if !ok {
			return
		}
		typ, name := stringValue(tool["type"]), strings.TrimSpace(stringValue(tool["name"]))
		switch typ {
		case "function":
			if name == "" || tool["function"] != nil {
				return
			}
			if (name == "web_search" || name == "x_search") && allowFunctionSearch {
				if !present[name] {
					merged = append(merged, map[string]any{"type": name})
					present[name] = true
				}
				if allowPureClientTools {
					hasCompanion = true
				}
				continue
			}
			if name == "web_search" || name == "x_search" {
				present[name] = true
			}
			hasCompanion = true
			merged = append(merged, raw)
		case "web_search", "x_search":
			hasNativeSearch = true
			if !present[typ] {
				merged = append(merged, raw)
				present[typ] = true
			}
		default:
			if !supportedToolTypes[typ] {
				return
			}
			hasCompanion = true
			merged = append(merged, raw)
		}
	}
	if !allowPureClientTools && !allowFunctionSearch && !hasNativeSearch || !hasCompanion {
		return
	}
	if !allowPureClientTools && !present["web_search"] && !present["x_search"] {
		return
	}
	for _, typ := range []string{"web_search", "x_search"} {
		if !present[typ] {
			merged = append(merged, map[string]any{"type": typ})
		}
	}
	root["tools"] = merged
}

func stringValue(value any) string {
	text, _ := value.(string)
	return text
}

package engine

import (
	"encoding/json"
	"fmt"
	"time"
)

// API server tools are executed by the upstream API, never by the SDK MCP
// bridge. Keep its definition and history separate from client tool handoffs.
func serverSearchName(kind string) string {
	switch kind {
	case "tool_search_tool_regex_20251119", "tool_search_tool_regex":
		return "tool_search_tool_regex"
	case "tool_search_tool_bm25_20251119", "tool_search_tool_bm25":
		return "tool_search_tool_bm25"
	}
	return ""
}

func splitServerSearchTools(value any, ttl *time.Duration) (any, []Object, error) {
	items, ok := value.([]any)
	if !ok {
		return nil, nil, fmt.Errorf("tools must be an array")
	}
	clients := []any{}
	var servers []Object
	seen := map[string]bool{}
	for _, item := range items {
		t, ok := item.(map[string]any)
		if !ok {
			return nil, nil, fmt.Errorf("invalid tool definition")
		}
		name := str(t, "name")
		if seen[name] {
			return nil, nil, fmt.Errorf("duplicate tool name %q", name)
		}
		seen[name] = true
		kind, typed := t["type"]
		if !typed || kind == "custom" || kind == nil {
			if t["defer_loading"] == true && t["cache_control"] != nil {
				return nil, nil, fmt.Errorf("deferred tools cannot carry cache_control")
			}
			clients = append(clients, item)
			continue
		}
		canonical := serverToolName(str(t, "type"))
		if canonical == "" {
			return nil, nil, fmt.Errorf("unsupported server tool type %q", str(t, "type"))
		}
		if name != canonical {
			return nil, nil, fmt.Errorf("server tool name must be %q", canonical)
		}
		if serverSearchName(str(t, "type")) != "" {
			if err := keys(t, "type", "name", "cache_control", "defer_loading", "strict", "allowed_callers"); err != nil {
				return nil, nil, err
			}
			if deferred, exists := t["defer_loading"]; exists && deferred != false {
				return nil, nil, fmt.Errorf("server search cannot be deferred")
			}
		} else {
			check := checkWebTool
			if canonical == "code_execution" {
				check = checkCodeExecutionTool
			}
			if canonical == "advisor" {
				check = checkAdvisorTool
			}
			if err := check(t); err != nil {
				return nil, nil, err
			}
		}
		if _, err := parseToolMetadata(t, false); err != nil {
			return nil, nil, err
		}
		if t["defer_loading"] == true && t["cache_control"] != nil {
			return nil, nil, fmt.Errorf("deferred tools cannot carry cache_control")
		}
		if err := cacheTTL(t["cache_control"], ttl); err != nil {
			return nil, nil, err
		}
		servers = append(servers, t)
	}
	return clients, servers, nil
}

func (r *Request) hasServerSearch(name string) bool {
	if codeExecutionCall(name) {
		var active []Object
		for _, tool := range r.ServerTools {
			if r.InlineTools == nil || r.InlineTools.Active[str(tool, "name")] {
				active = append(active, tool)
			}
		}
		return providerExecutionCallDeclared(active, name)
	}
	if r.InlineTools != nil && !r.InlineTools.Active[name] {
		return false
	}
	return r.declaresServerTool(name)
}

func (r *Request) declaresServerTool(name string) bool {
	if codeExecutionCall(name) {
		return providerExecutionCallDeclared(r.ServerTools, name)
	}
	for _, tool := range r.ServerTools {
		if str(tool, "name") == name {
			return true
		}
	}
	return false
}

func checkServerSearchBlock(b Object, role string) error {
	if role != "assistant" {
		return fmt.Errorf("server tool blocks must be assistant content")
	}
	if str(b, "type") == "server_tool_use" {
		if serverResultType(str(b, "name")) == "" || str(b, "id") == "" {
			return fmt.Errorf("unsupported server tool use")
		}
		return checkToolUse(b, role)
	}
	if str(b, "type") == "web_search_tool_result" || str(b, "type") == "web_fetch_tool_result" {
		return checkWebResult(b)
	}
	if codeExecutionResult(str(b, "type")) {
		return checkCodeExecutionResult(b)
	}
	if str(b, "type") == "advisor_tool_result" {
		return checkAdvisorResult(b)
	}
	if err := keys(b, "type", "tool_use_id", "content"); err != nil {
		return err
	}
	if str(b, "tool_use_id") == "" {
		return fmt.Errorf("server search result requires tool_use_id")
	}
	content, ok := b["content"].(map[string]any)
	if !ok {
		return fmt.Errorf("server search result content must be an object")
	}
	switch str(content, "type") {
	case "tool_search_tool_search_result":
		if err := keys(content, "type", "tool_references"); err != nil {
			return err
		}
		refs, ok := content["tool_references"].([]any)
		if !ok {
			return fmt.Errorf("tool_references must be an array")
		}
		for _, value := range refs {
			ref, ok := value.(map[string]any)
			if !ok || str(ref, "type") != "tool_reference" || str(ref, "tool_name") == "" {
				return fmt.Errorf("invalid tool_reference")
			}
			if err := keys(ref, "type", "tool_name"); err != nil {
				return err
			}
		}
	case "tool_search_tool_result_error":
		if err := keys(content, "type", "error_code", "error_message"); err != nil {
			return err
		}
		if str(content, "error_code") == "" {
			return fmt.Errorf("server search error requires error_code")
		}
		if value, exists := content["error_message"]; exists {
			if _, ok := value.(string); !ok {
				return fmt.Errorf("invalid search error_message")
			}
		}
	default:
		return fmt.Errorf("unsupported server search result content")
	}
	return nil
}

func mapSearchReferences(block Object, rename func(string) string) (Object, error) {
	raw, err := json.Marshal(block)
	if err != nil {
		return nil, err
	}
	copy, err := decodeObject(raw)
	if err != nil {
		return nil, err
	}
	content, _ := copy["content"].(map[string]any)
	refs, _ := content["tool_references"].([]any)
	for _, value := range refs {
		ref := value.(map[string]any)
		name := rename(str(ref, "tool_name"))
		if name == "" {
			return nil, fmt.Errorf("server search referenced an undeclared tool")
		}
		ref["tool_name"] = name
	}
	return copy, nil
}

func (r *Request) validateServerSearchHistory() error {
	for _, tool := range r.ServerTools {
		raw, _ := json.Marshal(tool["url_sources"])
		copy, _ := decodePlannedValue(raw)
		if err := checkURLSources(copy, r.resolveURLSource); err != nil {
			return err
		}
	}
	ledger := newServerToolLedger()
	for messageIndex, message := range r.Messages {
		if message.Role == "assistant" {
			ledger.beginTurn()
		}
		if message.Role == "user" {
			if err := ledger.ptc.user(message.Content); err != nil {
				return err
			}
		}
		clientTool := false
		for _, block := range message.Content {
			clientTool = clientTool || str(block, "type") == "tool_use"
			if err := ledger.accept(block, r, true); err != nil {
				return err
			}
			if str(block, "type") == "tool_search_tool_result" {
				if _, err := mapSearchReferences(block, func(name string) string {
					return r.searchReferenceName(name, false)
				}); err != nil {
					return err
				}
			}
		}
		if message.Role == "assistant" && len(ledger.pending) > 0 && !clientTool && !(r.continuation != "" && messageIndex == len(r.Messages)-1) {
			return fmt.Errorf("server tool history is missing its result outside a client handoff")
		}
	}
	return ledger.validatePendingDefinitions(r)
}

// Invoked only after the relay identifies the main model request. The CLI
// registers all client tools for dispatch; API defer_loading controls visibility.
func (r *Request) applyServerSearchTools(message Object) error {
	exactSchema := r.hasExactToolSchema()
	if len(r.ServerTools) == 0 && len(r.toolMetadataKey()) == 0 && !r.NoTools && !exactSchema {
		return nil
	}
	tools, _ := message["tools"].([]any)
	byName := map[string]Object{}
	for _, value := range tools {
		if tool, ok := value.(map[string]any); ok {
			byName[str(tool, "name")] = tool
		}
	}
	for _, client := range r.Tools {
		if len(r.ServerTools) == 0 && len(client.Metadata) == 0 && !r.NoTools && !exactSchema {
			continue
		}
		tool := byName[r.wireName(client.Name)]
		if tool == nil && r.NoTools {
			// tool_choice:none suppresses CLI registration, but the API still
			// accepts a catalog. It cannot trigger a client tool execution.
			tool = Object{"name": r.wireName(client.Name)}
			tools = append(tools, tool)
		}
		if tool == nil {
			return fmt.Errorf("CLI omitted API search catalog tool %q", client.Name)
		}
		// SDK MCP registration may augment descriptions/schemas. The API catalog
		// must use the client's definition, while retaining the verified wire name.
		raw, err := json.Marshal(client.Schema)
		if err != nil {
			return err
		}
		schema, err := decodeObject(raw)
		if err != nil {
			return err
		}
		tool["input_schema"] = schema
		if client.Description != "" {
			tool["description"] = client.Description
		} else {
			delete(tool, "description")
		}
		if client.DeferLoading != nil {
			if len(r.ServerTools) > 0 {
				tool["defer_loading"] = *client.DeferLoading
			}
		} else if len(r.ServerTools) > 0 {
			delete(tool, "defer_loading")
		}
		for key, value := range client.Metadata {
			raw, err := json.Marshal(value)
			if err != nil {
				return err
			}
			copy, err := decodePlannedValue(raw)
			if err != nil {
				return err
			}
			tool[key] = copy
		}
	}
	for _, server := range r.ServerTools {
		if byName[str(server, "name")] != nil {
			return fmt.Errorf("CLI tool collides with API server search")
		}
		raw, err := json.Marshal(server)
		if err != nil {
			return err
		}
		copy, err := decodeObject(raw)
		if err != nil {
			return err
		}
		if err := checkURLSources(copy["url_sources"], r.resolveURLSource); err != nil {
			return err
		}
		tools = append(tools, copy)
	}
	message["tools"] = tools
	return nil
}

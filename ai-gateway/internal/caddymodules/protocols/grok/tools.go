package grok

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
)

const (
	toolSearchProxyName   = "tool_search"
	customToolInputSchema = `{"type":"object","properties":{"input":{"type":"string","description":"The raw input for this tool, passed through verbatim."}},"required":["input"]}`
	toolSearchProxySchema = `{"type":"object","properties":{"query":{"type":"string","description":"Search query for tools or connectors to load."},"limit":{"type":"integer","description":"Maximum number of tool groups to return."}},"required":["query"]}`
	maxToolNameBytes      = 64
)

type namespaceName struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type clientToolMapping struct {
	CustomTools    map[string]bool          `json:"custom_tools,omitempty"`
	ToolSearch     bool                     `json:"tool_search,omitempty"`
	NamespaceTools map[string]namespaceName `json:"namespace_tools,omitempty"`
}

func (m clientToolMapping) active() bool {
	return len(m.CustomTools) > 0 || m.ToolSearch || len(m.NamespaceTools) > 0
}

func adaptClientTools(root map[string]any) (clientToolMapping, error) {
	tools, ok := root["tools"].([]any)
	if !ok || len(tools) == 0 {
		return clientToolMapping{}, nil
	}
	mapping := clientToolMapping{CustomTools: make(map[string]bool)}
	functionNames, customNames := make(map[string]bool), make(map[string]bool)
	for _, raw := range tools {
		tool, _ := raw.(map[string]any)
		name := strings.TrimSpace(stringValue(tool["name"]))
		switch strings.TrimSpace(stringValue(tool["type"])) {
		case "function":
			if name != "" {
				functionNames[name] = true
			}
		case "custom":
			if name != "" {
				customNames[name] = true
			}
		case "tool_search":
			mapping.ToolSearch = true
		}
	}
	for name := range customNames {
		if functionNames[name] {
			return clientToolMapping{}, fmt.Errorf("custom tool %q conflicts with a function tool of the same name; rename one of the tools", name)
		}
	}
	if mapping.ToolSearch && (functionNames[toolSearchProxyName] || customNames[toolSearchProxyName]) {
		return clientToolMapping{}, fmt.Errorf("built-in tool_search conflicts with a declared tool named %q; rename the tool", toolSearchProxyName)
	}

	names, err := flattenNamespaces(root)
	if err != nil {
		return clientToolMapping{}, err
	}
	mapping.NamespaceTools = names
	if mapping.ToolSearch {
		if _, exists := names[toolSearchProxyName]; exists {
			return clientToolMapping{}, fmt.Errorf("built-in tool_search conflicts with namespace tool flattened as %q; rename the tool", toolSearchProxyName)
		}
	}

	tools, _ = root["tools"].([]any)
	lowered := make([]any, 0, len(tools))
	seenSearch := false
	for _, raw := range tools {
		tool, ok := raw.(map[string]any)
		if !ok {
			lowered = append(lowered, raw)
			continue
		}
		typ, name := strings.TrimSpace(stringValue(tool["type"])), strings.TrimSpace(stringValue(tool["name"]))
		switch typ {
		case "custom":
			if name == "" {
				lowered = append(lowered, raw)
				continue
			}
			copy := copyMap(tool)
			copy["type"] = "function"
			copy["parameters"] = json.RawMessage(customToolInputSchema)
			delete(copy, "format")
			mapping.CustomTools[name] = true
			lowered = append(lowered, copy)
		case "tool_search":
			if seenSearch {
				continue
			}
			seenSearch = true
			lowered = append(lowered, map[string]any{
				"type": "function", "name": toolSearchProxyName,
				"description": "Search and load Codex tools, plugins, connectors, and MCP namespaces for the current task.",
				"parameters":  json.RawMessage(toolSearchProxySchema),
			})
		default:
			lowered = append(lowered, raw)
		}
	}
	root["tools"] = lowered
	rewriteClientToolHistory(root["input"], &mapping)
	rewriteClientToolChoice(root, &mapping)
	if len(mapping.CustomTools) == 0 {
		mapping.CustomTools = nil
	}
	if len(mapping.NamespaceTools) == 0 {
		mapping.NamespaceTools = nil
	}
	return mapping, nil
}

func flattenNamespaces(root map[string]any) (map[string]namespaceName, error) {
	tools, ok := root["tools"].([]any)
	if !ok {
		return nil, nil
	}
	topLevel := make(map[string]bool)
	for _, raw := range tools {
		tool, _ := raw.(map[string]any)
		typ, name := stringValue(tool["type"]), strings.TrimSpace(stringValue(tool["name"]))
		if (typ == "function" || typ == "custom") && name != "" {
			topLevel[name] = true
		}
	}
	names := make(map[string]namespaceName)
	for _, raw := range tools {
		tool, _ := raw.(map[string]any)
		if stringValue(tool["type"]) != "namespace" {
			continue
		}
		namespace := strings.TrimSpace(stringValue(tool["name"]))
		for _, rawChild := range namespaceChildren(tool) {
			child, _ := rawChild.(map[string]any)
			name := strings.TrimSpace(stringValue(child["name"]))
			if namespace == "" || stringValue(child["type"]) != "function" || name == "" {
				continue
			}
			flat := flattenToolName(namespace, name)
			entry := namespaceName{Namespace: namespace, Name: name}
			if topLevel[flat] {
				return nil, fmt.Errorf("namespace tool %q/%q flattens to %q which conflicts with a top-level tool", namespace, name, flat)
			}
			if previous, exists := names[flat]; exists && previous != entry {
				return nil, fmt.Errorf("namespace tools %q/%q and %q/%q both flatten to %q", previous.Namespace, previous.Name, namespace, name, flat)
			}
			names[flat] = entry
		}
	}
	if len(names) == 0 {
		return nil, nil
	}
	flattened := make([]any, 0, len(tools)+len(names))
	seen := make(map[string]bool)
	for _, raw := range tools {
		tool, _ := raw.(map[string]any)
		if stringValue(tool["type"]) != "namespace" {
			flattened = append(flattened, raw)
			continue
		}
		namespace := strings.TrimSpace(stringValue(tool["name"]))
		for _, rawChild := range namespaceChildren(tool) {
			child, _ := rawChild.(map[string]any)
			name := strings.TrimSpace(stringValue(child["name"]))
			flat := flattenToolName(namespace, name)
			if stringValue(child["type"]) != "function" || name == "" || seen[flat] {
				continue
			}
			seen[flat] = true
			copy := copyMap(child)
			copy["name"] = flat
			flattened = append(flattened, copy)
		}
	}
	root["tools"] = flattened
	rewriteNamespaceCalls(root["input"], names)
	if choice, ok := root["tool_choice"].(map[string]any); ok {
		if stringValue(choice["type"]) == "namespace" {
			root["tool_choice"] = "auto"
		} else {
			rewriteNamespaceCall(choice, names)
		}
	}
	return names, nil
}

func namespaceChildren(tool map[string]any) []any {
	if children, ok := tool["tools"].([]any); ok && len(children) > 0 {
		return children
	}
	children, _ := tool["children"].([]any)
	return children
}

func flattenToolName(namespace, name string) string {
	full := namespace + "__" + name
	if len(full) <= maxToolNameBytes {
		return full
	}
	digest := sha256.Sum256([]byte(full))
	suffix := "__" + hex.EncodeToString(digest[:4])
	limit := maxToolNameBytes - len(suffix)
	var prefix strings.Builder
	for _, char := range full {
		if prefix.Len()+len(string(char)) > limit {
			break
		}
		prefix.WriteRune(char)
	}
	return prefix.String() + suffix
}

func rewriteNamespaceCalls(value any, names map[string]namespaceName) {
	switch typed := value.(type) {
	case []any:
		for _, child := range typed {
			rewriteNamespaceCalls(child, names)
		}
	case map[string]any:
		if stringValue(typed["type"]) == "function_call" {
			rewriteNamespaceCall(typed, names)
		}
		for _, child := range typed {
			rewriteNamespaceCalls(child, names)
		}
	}
}

func rewriteNamespaceCall(item map[string]any, names map[string]namespaceName) bool {
	namespace, name := strings.TrimSpace(stringValue(item["namespace"])), strings.TrimSpace(stringValue(item["name"]))
	if namespace == "" || name == "" {
		return false
	}
	flat := flattenToolName(namespace, name)
	entry, ok := names[flat]
	if !ok || entry.Namespace != namespace || entry.Name != name {
		return false
	}
	item["name"] = flat
	delete(item, "namespace")
	return true
}

func rewriteClientToolHistory(value any, mapping *clientToolMapping) {
	switch typed := value.(type) {
	case []any:
		for _, child := range typed {
			rewriteClientToolHistory(child, mapping)
		}
	case map[string]any:
		switch stringValue(typed["type"]) {
		case "custom_tool_call":
			if mapping.CustomTools[strings.TrimSpace(stringValue(typed["name"]))] {
				typed["type"] = "function_call"
				typed["arguments"] = customArguments(stringValue(typed["input"]))
				delete(typed, "input")
			}
		case "custom_tool_call_output":
			typed["type"] = "function_call_output"
			normalizeToolOutput(typed)
		case "tool_search_call":
			if mapping.ToolSearch {
				typed["type"] = "function_call"
				typed["name"] = toolSearchProxyName
				typed["arguments"] = rawObjectString(typed["arguments"])
				delete(typed, "execution")
			}
		case "tool_search_output":
			if mapping.ToolSearch {
				typed["type"] = "function_call_output"
				normalizeToolOutput(typed)
			}
		}
		for _, child := range typed {
			rewriteClientToolHistory(child, mapping)
		}
	}
}

func rewriteClientToolChoice(root map[string]any, mapping *clientToolMapping) {
	choice, ok := root["tool_choice"].(map[string]any)
	if !ok {
		return
	}
	typ, name := stringValue(choice["type"]), strings.TrimSpace(stringValue(choice["name"]))
	if typ == "custom" && mapping.CustomTools[name] {
		choice["type"] = "function"
	} else if typ == "tool_search" && mapping.ToolSearch {
		root["tool_choice"] = map[string]any{"type": "function", "name": toolSearchProxyName}
	}
}

func normalizeToolOutput(item map[string]any) {
	value, exists := item["output"]
	if !exists {
		return
	}
	if _, ok := value.(string); ok {
		return
	}
	encoded, err := json.Marshal(value)
	if value == nil || err != nil {
		item["output"] = ""
	} else {
		item["output"] = string(encoded)
	}
}

func customArguments(input string) string {
	encoded, _ := json.Marshal(map[string]string{"input": input})
	return string(encoded)
}

func rawObjectString(value any) string {
	if text, ok := value.(string); ok {
		return text
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(encoded)
}

func extractCustomInput(arguments string) string {
	trimmed := strings.TrimSpace(arguments)
	if trimmed == "" {
		return ""
	}
	var object map[string]json.RawMessage
	if json.Unmarshal([]byte(trimmed), &object) != nil {
		return trimmed
	}
	if raw, exists := object["input"]; exists {
		var input string
		if json.Unmarshal(raw, &input) == nil {
			return input
		}
		return trimmed
	}
	if len(object) == 0 {
		return ""
	}
	return trimmed
}

func toolSearchArguments(arguments string) any {
	trimmed := strings.TrimSpace(arguments)
	if trimmed == "" {
		return map[string]any{}
	}
	var value any
	if json.Unmarshal([]byte(trimmed), &value) == nil {
		return value
	}
	return arguments
}

func restoreClientToolPayload(payload []byte, mapping clientToolMapping) ([]byte, error) {
	decoder := json.NewDecoder(strings.NewReader(string(payload)))
	decoder.UseNumber()
	var value any
	if err := decoder.Decode(&value); err != nil {
		return nil, err
	}
	restoreClientToolValue(value, mapping)
	return marshalJSON(value)
}

func restoreClientToolValue(value any, mapping clientToolMapping) bool {
	changed := false
	switch typed := value.(type) {
	case []any:
		for _, child := range typed {
			changed = restoreClientToolValue(child, mapping) || changed
		}
	case map[string]any:
		if stringValue(typed["type"]) == "function_call" {
			name := strings.TrimSpace(stringValue(typed["name"]))
			if mapping.CustomTools[name] {
				typed["type"] = "custom_tool_call"
				typed["input"] = extractCustomInput(rawObjectString(typed["arguments"]))
				delete(typed, "arguments")
				delete(typed, "namespace")
				changed = true
			} else if mapping.ToolSearch && name == toolSearchProxyName {
				typed["type"] = "tool_search_call"
				typed["execution"] = "client"
				typed["arguments"] = toolSearchArguments(rawObjectString(typed["arguments"]))
				delete(typed, "name")
				delete(typed, "namespace")
				changed = true
			} else if entry, exists := mapping.NamespaceTools[name]; exists {
				typed["name"] = entry.Name
				typed["namespace"] = entry.Namespace
				changed = true
			}
		}
		for _, child := range typed {
			changed = restoreClientToolValue(child, mapping) || changed
		}
	}
	return changed
}

func copyMap(value map[string]any) map[string]any {
	copy := make(map[string]any, len(value))
	for key, item := range value {
		copy[key] = item
	}
	return copy
}

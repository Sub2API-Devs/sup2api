package resources

import (
	"fmt"
	"sort"
)

func executionTool(tool map[string]any) bool {
	switch tool["type"] {
	case "code_execution_20250522", "code_execution_20250825", "code_execution_20260120", "code_execution_20260521":
		return true
	case "web_search_20260209", "web_search_20260318", "web_fetch_20260209", "web_fetch_20260309", "web_fetch_20260318":
		value, exists := tool["allowed_callers"]
		if !exists {
			return true
		}
		callers, _ := value.([]any)
		for _, caller := range callers {
			if caller != "direct" {
				return true
			}
		}
	}
	return false
}

func resourceToolChange(block map[string]any) bool {
	if block["type"] != "tool_addition" {
		return false
	}
	tool, _ := block["tool"].(map[string]any)
	definition, _ := tool["definition"].(map[string]any)
	return tool["type"] == "tool_definition" && executionTool(definition)
}

func programmaticParent(block map[string]any) string {
	if block["type"] != "tool_use" && block["type"] != "server_tool_use" {
		return ""
	}
	caller, _ := block["caller"].(map[string]any)
	switch caller["type"] {
	case "code_execution_20250825", "code_execution_20260120":
		parent, _ := caller["tool_id"].(string)
		return parent
	}
	return ""
}

func requestResourceCapabilities(root map[string]any) (bool, []string, error) {
	outputs := root["container"] != nil
	tools, _ := root["tools"].([]any)
	for _, value := range tools {
		tool, _ := value.(map[string]any)
		outputs = outputs || executionTool(tool)
	}
	parents := map[string]bool{}
	messages, _ := root["messages"].([]any)
	for _, value := range messages {
		message, _ := value.(map[string]any)
		blocks, _ := message["content"].([]any)
		for _, value := range blocks {
			block, _ := value.(map[string]any)
			outputs = outputs || resourceToolChange(block)
			if block["type"] == "compaction" {
				changes, _ := block["tool_changes"].([]any)
				for _, value := range changes {
					change, _ := value.(map[string]any)
					outputs = outputs || resourceToolChange(change)
				}
			}
			if message["role"] != "assistant" {
				continue
			}
			switch block["type"] {
			case "server_tool_use":
				switch block["name"] {
				case "code_execution", "bash_code_execution", "text_editor_code_execution":
					outputs = true
				}
				if block["name"] == "code_execution" {
					id, _ := block["id"].(string)
					if !segment.MatchString(id) {
						return false, nil, fmt.Errorf("invalid execution parent ID")
					}
					if _, exists := parents[id]; exists {
						return false, nil, fmt.Errorf("duplicate active execution parent")
					}
					parents[id] = false
				}
				if parent := programmaticParent(block); parent != "" {
					if _, exists := parents[parent]; !exists || !segment.MatchString(parent) {
						return false, nil, fmt.Errorf("programmatic server caller has no active execution parent")
					}
					parents[parent] = true
					outputs = true
				}
			case "code_execution_tool_result", "bash_code_execution_tool_result", "text_editor_code_execution_tool_result":
				outputs = true
				if block["type"] == "code_execution_tool_result" {
					id, _ := block["tool_use_id"].(string)
					delete(parents, id)
				}
			case "tool_use":
				if parent := programmaticParent(block); parent != "" {
					if _, exists := parents[parent]; !exists || !segment.MatchString(parent) {
						return false, nil, fmt.Errorf("programmatic caller has no active execution parent")
					}
					parents[parent] = true
					outputs = true
				}
			}
		}
	}
	var pending []string
	for parent, hasCalls := range parents {
		if hasCalls {
			pending = append(pending, parent)
		}
	}
	if len(pending) > 100 {
		return false, nil, fmt.Errorf("too many pending programmatic parents")
	}
	sort.Strings(pending)
	return outputs, pending, nil
}

// ResponsePTCParents returns only provider caller references, not client tool
// input strings. Core binds these to the verified response container.
func ResponsePTCParents(body []byte) ([]string, error) {
	root, err := referenceObject(body)
	if err != nil {
		return nil, err
	}
	var blocks []any
	switch root["type"] {
	case "message":
		blocks, _ = root["content"].([]any)
	case "message_start":
		message, _ := root["message"].(map[string]any)
		blocks, _ = message["content"].([]any)
	case "content_block_start":
		blocks = []any{root["content_block"]}
	}
	seen := map[string]bool{}
	var result []string
	for _, value := range blocks {
		block, _ := value.(map[string]any)
		parent := programmaticParent(block)
		if parent == "" || seen[parent] {
			continue
		}
		if !segment.MatchString(parent) || len(result) >= 100 {
			return nil, fmt.Errorf("invalid programmatic response parent")
		}
		seen[parent] = true
		result = append(result, parent)
	}
	return result, nil
}

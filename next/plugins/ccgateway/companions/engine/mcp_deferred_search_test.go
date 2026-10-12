package engine

func pinnedSearchFixture() Object {
	b := mcpPlanFixture()
	b["model"] = "claude-opus-5-5"
	b["max_tokens"] = 128
	for _, value := range b["tools"].([]any) {
		def := value.(Object)
		def["tools"] = []any{Object{"name": "echo", "input_schema": Object{"type": "object"}}}
		def["default_config"] = Object{"defer_loading": true}
	}
	b["tools"] = append(b["tools"].([]any), Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"})
	b["messages"] = []any{Object{"role": "user", "content": "public fixture"}}
	return b
}
func pinnedSearchBlocks() []Object {
	return []Object{
		{"type": "server_tool_use", "id": "search_pinned", "name": "tool_search_tool_regex", "input": Object{"pattern": "echo"}},
		{"type": "tool_search_tool_result", "tool_use_id": "search_pinned", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "one_echo"}}}},
		{"type": "mcp_tool_use", "id": "mcp_pinned", "server_name": "one", "name": "echo", "input": Object{}},
		{"type": "mcp_tool_result", "tool_use_id": "mcp_pinned", "is_error": false, "content": "PUBLIC_RESULT"},
	}
}

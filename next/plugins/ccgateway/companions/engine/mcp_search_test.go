package engine

func mcpSearchFixture() Object {
	body := mcpInlineFixture()
	body["tools"] = append(body["tools"].([]any), Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"}, Object{"name": "lookup", "input_schema": Object{"type": "object"}, "defer_loading": true})
	return body
}

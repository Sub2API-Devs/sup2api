package engine

func mcpInlineFixture() Object {
	body := mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	top := body["tools"].([]any)
	body["tools"] = top[1:]
	body["messages"] = []any{Object{"role": "user", "content": "begin"}, Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": top[0]}}}}}
	return body
}

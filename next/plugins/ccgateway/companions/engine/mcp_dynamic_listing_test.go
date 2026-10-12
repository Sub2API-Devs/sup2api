package engine

func dynamicMCPFixture() Object {
	b := pinnedSearchFixture()
	b["mcp_servers"] = b["mcp_servers"].([]any)[:1]
	tools := b["tools"].([]any)
	delete(tools[0].(Object), "tools")
	b["tools"] = []any{tools[0], tools[len(tools)-1]}
	return b
}

func dynamicMCPListing() Object {
	return Object{"type": "mcp_tool_listing", "mcp_server_name": "one", "tools": []any{Object{"name": "echo", "description": nil, "input_schema": Object{"type": "object"}}}}
}
func dynamicMCPBlocks() []Object {
	return append([]Object{dynamicMCPListing()}, pinnedSearchBlocks()...)
}

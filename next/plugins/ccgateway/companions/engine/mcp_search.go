package engine

// Deferred connector search is admitted only with a complete, unambiguous
// pinned identity catalog. Unknown references never become MCP tools by prefix.
func (r *Request) validateMCPClientSearch() error {
	if r.MCP == nil {
		return nil
	}
	if err := r.validateMCPReferenceNames(); err != nil {
		return err
	}
	return r.validateMCPNamespace()
}
func (r *Request) validateMCPNamespace() error {
	if r.MCP == nil {
		return nil
	}
	// Use the new comprehensive namespace validation that handles conflicts
	return r.validateToolNamespace()
}
func mcpMayDefer(definition Object) bool {
	if pinned, ok := definition["tools"].([]any); ok {
		for _, value := range pinned {
			tool, _ := value.(Object)
			name := str(tool, "name")
			if mcpConfigFlag(definition, name, "enabled", true) && mcpConfigFlag(definition, name, "defer_loading", false) {
				return true
			}
		}
		return false
	}
	if mcpConfigFlag(definition, "", "enabled", true) && mcpConfigFlag(definition, "", "defer_loading", false) {
		return true
	}
	configs, _ := definition["configs"].(Object)
	for name := range configs {
		if mcpConfigFlag(definition, name, "enabled", true) && mcpConfigFlag(definition, name, "defer_loading", false) {
			return true
		}
	}
	return false
}

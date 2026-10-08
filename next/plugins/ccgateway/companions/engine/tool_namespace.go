package engine

import "fmt"

// resolveToolNamespace determines the appropriate namespace for mapping client tools
// to avoid conflicts with existing MCP servers. When a client has an MCP server named
// "ccgateway" (or the configured custom prefix), we must use a different namespace
// to prevent tool name collisions.
func (r *Request) resolveToolNamespace() string {
	if r.MCP == nil || len(r.Tools) == 0 {
		return r.customToolServer()
	}

	base := r.customToolServer()
	if !r.MCP.hasServer(base) {
		return base
	}

	// Client already has an MCP server with this name - use fallback namespace
	return base + "-mapped"
}

// effectiveToolServer returns the actual namespace being used for tool mapping,
// taking into account potential MCP server conflicts. This is the single source
// of truth for what namespace Worker should use.
func (r *Request) effectiveToolServer() string {
	if r.MCP == nil {
		return r.customToolServer()
	}
	return r.resolveToolNamespace()
}

// validateToolNamespace checks that the resolved namespace doesn't conflict
// with any existing MCP server or client tools. For security-sensitive scenarios
// (safeguards, deferred search), we reject conflicts instead of auto-resolving.
func (r *Request) validateToolNamespace() error {
	if r.MCP == nil || len(r.Tools) == 0 {
		return nil
	}

	// For safeguards or deferred tool search, reject namespace conflicts outright
	// because automatic remapping could bypass security restrictions
	hasSafeguards := r.Plan != nil && len(r.Plan.fields["safeguards"]) > 0
	hasServerSearch := len(r.ServerTools) > 0
	hasDeferredSearch := hasServerSearch || r.toolSearchEnabled() && r.hasDeferredClientTools()

	base := r.customToolServer()
	if r.MCP.hasServer(base) {
		if hasSafeguards || hasDeferredSearch {
			return fmt.Errorf("MCP server conflicts with the client tool transport namespace")
		}
		// For non-sensitive scenarios, allow auto-resolution
		namespace := r.effectiveToolServer()
		if r.MCP.hasServer(namespace) {
			return fmt.Errorf("tool mapping namespace %q conflicts with MCP server", namespace)
		}
	}

	return nil
}

// hasDeferredClientTools checks if any client tools use defer_loading
func (r *Request) hasDeferredClientTools() bool {
	for _, tool := range r.Tools {
		if r.Native[tool.Name] {
			continue
		}
		// Check tool-level defer_loading
		if tool.DeferLoading != nil && *tool.DeferLoading {
			return true
		}
	}
	return false
}

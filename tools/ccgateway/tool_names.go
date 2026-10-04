package main

import (
	"fmt"
	"strings"
)

// Validate after native-tool selection: a selected native Read stays Read,
// while an ordinary custom Read occupies mcp__ccgateway__Read instead.
func validateToolNames(r *Request) error {
	seen := make(map[string]bool, len(r.Tools))
	for _, tool := range r.Tools {
		name := r.wireName(tool.Name)
		if seen[name] {
			return fmt.Errorf("tool definitions map to the same upstream name")
		}
		seen[name] = true
	}
	return nil
}

// A qualified MCP name splits at the first separator after mcp__. Tool names
// may themselves contain __. Incomplete lookalikes remain ordinary custom
// tools and receive the gateway's namespace when mapped to an upstream name.
func splitMCPToolName(name string) (server, tool string, ok bool) {
	if !toolName.MatchString(name) {
		return "", "", false
	}
	rest, found := strings.CutPrefix(name, "mcp__")
	if !found {
		return "", "", false
	}
	server, tool, found = strings.Cut(rest, "__")
	if !found || !toolName.MatchString(server) || !toolName.MatchString(tool) {
		return "", "", false
	}
	return server, tool, true
}

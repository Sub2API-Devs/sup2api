package main

import (
	_ "embed"
	"encoding/json"
)

// Captured from CLI 2.1.288 against an isolated local upstream, with empty
// settings/MCP configuration. Never guess definitions from tool names.
//
//go:embed catalog/claude-2.1.288.json
var nativeToolsJSON []byte

var verifiedNativeTools = func() map[string]Tool {
	var tools []Tool
	if err := json.Unmarshal(nativeToolsJSON, &tools); err != nil {
		panic("invalid bundled native tool catalogue")
	}
	result := make(map[string]Tool, len(tools))
	for _, tool := range tools {
		result[tool.Name] = tool
	}
	return result
}()

// Retain only explicitly authorized native candidates whose entire definition
// matches the verified CLI version. All other declarations use SDK MCP without
// changing the caller's description or JSON Schema.
func matchNativeTools(r *Request, version string) {
	matched := map[string]bool{}
	if version == "2.1.288" {
		for _, tool := range r.Tools {
			known, ok := verifiedNativeTools[tool.Name]
			if ok && r.Native[tool.Name] && digest(known) == digest(tool) {
				matched[tool.Name] = true
			}
		}
	}
	r.Native = matched
}

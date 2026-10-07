package engine

import (
	"ccgateway/catalog"
	"encoding/json"
	"fmt"
)

type nativeToolAvailabilityError struct {
	Names     []string
	RetrySafe bool
}

func (e *nativeToolAvailabilityError) Error() string {
	return fmt.Sprintf("native tools unavailable or incompatible in this CLI session: %v", e.Names)
}

// Captured from CLI 2.1.288 against an isolated local upstream, with empty
// settings/MCP configuration. Never guess definitions from tool names.
var nativeToolsJSON = catalog.NativeTools

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

// Native means preserving a definition, never permitting local execution.
// Mod and permission callbacks intercept both native and MCP client tools.
// Match automatically, without requiring the legacy native opt-in header.
func matchNativeTools(r *Request, version string) {
	matched := map[string]bool{}
	if version == "2.1.288" {
		for _, tool := range r.Tools {
			known, ok := verifiedNativeTools[tool.Name]
			if ok && sameToolDefinition(known, tool) {
				matched[tool.Name] = true
			}
		}
	}
	r.Native = matched
}

// Identity is the name plus the full input schema. Client descriptions and
// deferral are applied independently through tool.describe, not used to match.
func sameToolDefinition(a, b Tool) bool {
	return a.Name == b.Name && digest(a.Schema) == digest(b.Schema)
}

// Check what this CLI actually offered, not only the bundled catalogue. Runtime
// settings can change a native definition even within the same CLI version.
// Fail before forwarding instead of silently substituting a different tool.
func verifyNativeWireTools(req *Request, message Object) error {
	tools, _ := message["tools"].([]any)
	var unavailable []string
	for _, want := range req.Tools {
		if req.NoTools || !req.Native[want.Name] {
			continue
		}
		found := 0
		compatible := true
		for _, value := range tools {
			obj, _ := value.(map[string]any)
			if str(obj, "name") != want.Name {
				continue
			}
			found++
			schema, _ := obj["input_schema"].(map[string]any)
			actual := Tool{Name: want.Name, Description: str(obj, "description"), Schema: schema}
			if !sameToolDefinition(want, actual) {
				compatible = false
			}
		}
		if found != 1 || !compatible {
			unavailable = append(unavailable, want.Name)
		}
	}
	if len(unavailable) > 0 {
		return &nativeToolAvailabilityError{Names: unavailable}
	}
	return nil
}

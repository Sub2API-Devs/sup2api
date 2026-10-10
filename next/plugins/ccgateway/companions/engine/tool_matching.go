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

// Captured from actual CLI requests to an isolated upstream. One version can
// expose multiple schemas under feature gates, so keep each observed variant.
// Selection is only provisional: verifyNativeWireTools checks the running CLI.
func decodeNativeCatalogue(data []byte) map[string][]Tool {
	var tools []Tool
	if err := json.Unmarshal(data, &tools); err != nil {
		panic("invalid bundled native tool catalogue")
	}
	result := make(map[string][]Tool, len(tools))
	for _, tool := range tools {
		result[tool.Name] = append(result[tool.Name], tool)
	}
	return result
}

var verifiedNativeToolCatalogues = map[string]map[string][]Tool{
	"2.1.288": decodeNativeCatalogue(catalog.NativeTools),
	"2.1.292": decodeNativeCatalogue(catalog.NativeTools21292),
}

// Legacy fixtures explicitly test the 2.1.288 definitions.
var verifiedNativeTools = func() map[string]Tool {
	result := map[string]Tool{}
	for name, variants := range verifiedNativeToolCatalogues["2.1.288"] {
		result[name] = variants[0]
	}
	return result
}()

// Native means preserving a definition, never permitting local execution.
// Mod and permission callbacks intercept both native and MCP client tools.
// Match automatically, without requiring the legacy native opt-in header.
func matchNativeTools(r *Request, version string) {
	matched := map[string]bool{}
	for _, tool := range r.Tools {
		for _, known := range verifiedNativeToolCatalogues[version][tool.Name] {
			if catalogueMatch(known, tool) {
				matched[tool.Name] = true
				break
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
	tools, _ := historyContent(message["tools"])
	var unavailable []string
	for _, want := range req.Tools {
		if req.NoTools || !req.Native[want.Name] {
			continue
		}
		found := 0
		compatible := true
		for _, obj := range tools {
			if str(obj, "name") != want.Name {
				continue
			}
			found++
			schema, _ := obj["input_schema"].(map[string]any)
			actual := Tool{Name: want.Name, Description: str(obj, "description"), Schema: schema}
			if !sameToolDefinition(want, actual) && !restoreShellTool(want, obj) {
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

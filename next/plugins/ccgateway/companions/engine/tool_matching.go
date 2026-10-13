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
	r.Native, r.catalogueEnv, r.nativeProfile = map[string]bool{}, map[string]string{}, nil
	catalogue := r.nativeCatalogue(version)
	if r.cliSnapshot == nil {
		r.Native = matchCatalogueSchemas(r.Tools, catalogue)
		return
	}
	for _, profile := range catalogue.profiles() {
		matched := matchCatalogueSchemas(r.Tools, profile.tools)
		if r.nativeProfile != nil && len(matched) <= len(r.Native) {
			continue
		}
		view := *r
		view.Native = matched
		if validateToolNames(&view) != nil {
			continue
		}
		config := profile.config
		r.Native, r.nativeProfile = matched, &config
	}
	if r.nativeProfile != nil {
		for key, value := range r.nativeProfile.environment() {
			r.catalogueEnv[key] = value
		}
	}
}

func matchCatalogueSchemas(tools []Tool, catalogue nativeCatalogue) map[string]bool {
	matched := map[string]bool{}
	for _, tool := range tools {
		for _, known := range catalogue[tool.Name] {
			if catalogueMatch(known, tool) {
				matched[tool.Name] = true
				break
			}
		}
	}
	return matched
}

func sameToolSchema(a, b Tool) bool {
	return a.Name == b.Name && digest(a.Schema) == digest(b.Schema)
}

func (r *Request) selectedNativeCatalogue(version string) nativeCatalogue {
	catalogue := r.nativeCatalogue(version)
	if r.cliSnapshot == nil {
		return catalogue
	}
	if r.nativeProfile != nil {
		for _, profile := range catalogue.profiles() {
			if digest(profile.config) == digest(r.nativeProfile) {
				return profile.tools
			}
		}
	}
	return nil
}

// Identity requires the exact name, description and full input schema.
// Deferral is applied independently through tool.describe, not used to match.
func sameToolDefinition(a, b Tool) bool {
	return a.Name == b.Name && a.Description == b.Description && digest(a.Schema) == digest(b.Schema)
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

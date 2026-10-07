package engine

import "fmt"

// Metadata changes model-side tool semantics, not SDK execution. Retain it
// until the attributed main API request instead of relying on MCP conversion.
func parseToolMetadata(tool Object, custom bool) (Object, error) {
	metadata := Object{}
	for _, key := range []string{"strict", "eager_input_streaming"} {
		value, exists := tool[key]
		if !exists {
			continue
		}
		if value == nil && key == "eager_input_streaming" {
			metadata[key] = nil
			continue
		}
		if _, ok := value.(bool); !ok {
			return nil, fmt.Errorf("tools.%s must be boolean", key)
		}
		metadata[key] = value
	}
	if value, exists := tool["input_examples"]; exists {
		examples, ok := value.([]any)
		if !ok {
			return nil, fmt.Errorf("tools.input_examples must be an array")
		}
		for _, example := range examples {
			if _, ok := example.(map[string]any); !ok {
				return nil, fmt.Errorf("tool input examples must be objects")
			}
		}
		metadata["input_examples"] = examples
	}
	if value, exists := tool["allowed_callers"]; exists {
		callers, ok := value.([]any)
		if !ok || len(callers) != 1 || callers[0] != "direct" {
			return nil, fmt.Errorf("tools.allowed_callers currently supports only [direct]; programmatic execution requires a separate adapter")
		}
		metadata["allowed_callers"] = callers
	}
	if custom {
		if value, exists := tool["type"]; exists {
			if value != nil && value != "custom" {
				return nil, fmt.Errorf("client tool type must be custom")
			}
			metadata["type"] = value
		}
	}
	return metadata, nil
}

func (r *Request) toolMetadataKey() []Object {
	var values []Object
	for _, tool := range r.Tools {
		if len(tool.Metadata) > 0 {
			values = append(values, Object{"name": tool.Name, "metadata": tool.Metadata})
		}
	}
	return values
}

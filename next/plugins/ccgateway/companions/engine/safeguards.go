package engine

import (
	"encoding/json"
	"fmt"
)

const maxSafeguardsBytes = 128 << 10

// The CLI's classifier context is versioned and opaque. Validate only the
// observed envelope; never rewrite paths, rules, verdicts or tool references.
func parseSafeguards(p *RequestPlan, request Object) error {
	value, present := request["safeguards"]
	if !present {
		return nil
	}
	items, ok := value.([]any)
	if !ok || len(items) == 0 {
		return fmt.Errorf("safeguards must be a non-empty array of objects")
	}
	for _, item := range items {
		if object, ok := item.(map[string]any); !ok || len(object) == 0 {
			return fmt.Errorf("safeguards entries must be non-empty objects")
		}
	}
	raw, err := json.Marshal(value)
	if err != nil || len(raw) > maxSafeguardsBytes {
		return fmt.Errorf("safeguards exceeds the 128 KiB request limit")
	}
	p.fields["safeguards"] = raw
	delete(request, "safeguards")
	return nil
}

func (p *RequestPlan) validateSafeguardRounds(r *Request) error {
	if p == nil || len(p.fields["safeguards"]) == 0 {
		return nil
	}
	if r.toolSearchEnabled() || r.structuredOutput() || len(r.ServerTools) != 0 {
		return fmt.Errorf("client safeguards with internal search, structured output or server tools requires execution-context adaptation")
	}
	return nil
}

// An explicit client context describes the executor, which remains the client.
// It replaces the inner container context only when every advertised tool has
// the same identity and schema. This does not grant local execution permission.
func (r *Request) validateSafeguardTools(message Object) error {
	if err := r.Plan.validateSafeguardRounds(r); err != nil {
		return err
	}
	// Classifier context also refers to prior tool activity. Perform this after
	// native matching, when wireName reflects this CLI's actual tool identity.
	// A removed native tool or a schema change must not quietly rename history
	// while preserving opaque client classifier references to the old identity.
	for _, historical := range r.Messages {
		wire := r.wireMessage(historical)
		for i, block := range historical.Content {
			if str(block, "type") == "tool_use" && (i >= len(wire.Content) || str(wire.Content[i], "name") != str(block, "name")) {
				return fmt.Errorf("client safeguards requires unchanged historical tool names: %s", str(block, "name"))
			}
		}
	}
	want := map[string]Tool{}
	if !r.NoTools {
		for _, tool := range r.Tools {
			if r.wireName(tool.Name) != tool.Name {
				return fmt.Errorf("client safeguards requires unchanged tool names: %s", tool.Name)
			}
			want[tool.Name] = tool
		}
	}
	actual, ok := message["tools"].([]any)
	if !ok && message["tools"] != nil {
		return fmt.Errorf("cannot verify safeguards tool definitions")
	}
	seen := map[string]bool{}
	for _, item := range actual {
		tool, ok := item.(map[string]any)
		name := str(tool, "name")
		definition, exists := want[name]
		schema, validSchema := tool["input_schema"].(map[string]any)
		if !ok || !exists || seen[name] || !validSchema || digest(schema) != digest(definition.Schema) {
			return fmt.Errorf("client safeguards requires identical outbound client tools")
		}
		seen[name] = true
	}
	if len(seen) != len(want) {
		return fmt.Errorf("client safeguards requires all client tools in the outbound request")
	}
	return nil
}

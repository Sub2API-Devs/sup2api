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

// Internal tool search rounds are allowed: ToolSearch only loads client
// definitions, the client's context still describes every tool that runs,
// and CC 2.1.292 sends safeguards together with DeferredToolPlaceholder. A
// 400 here makes the CLI drop its server classifier for the conversation, so
// that every auto-mode tool use is denied afterwards.
func (p *RequestPlan) validateSafeguardRounds(r *Request) error {
	if p == nil || len(p.fields["safeguards"]) == 0 {
		return nil
	}
	if r.structuredOutput() || len(r.ServerTools) != 0 {
		return fmt.Errorf("client safeguards with structured output or server tools requires execution-context adaptation")
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
			if str(block, "type") == "tool_use" && (i >= len(wire.Content) || str(wire.Content[i], "name") != str(block, "name") && !r.handbackTool(str(block, "name"))) {
				return fmt.Errorf("client safeguards requires unchanged historical tool names: %s", str(block, "name"))
			}
		}
	}
	want := map[string]Tool{}
	deferred := map[string]bool{}
	if !r.NoTools {
		for _, tool := range r.Tools {
			if r.searchHelper(tool.Name) {
				// The client's DeferredToolPlaceholder is the CLI's own: the
				// inner CLI sends it (and ToolSearch) as its search helper.
				continue
			}
			name := r.wireName(tool.Name)
			if name != tool.Name && !r.handbackTool(tool.Name) {
				return fmt.Errorf("client safeguards requires unchanged tool names: %s", tool.Name)
			}
			want[name] = tool
			deferred[name] = r.toolSearchEnabled() && tool.DeferLoading != nil && *tool.DeferLoading
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
		if ok && r.searchHelper(name) && !seen[name] {
			seen[name] = true
			continue
		}
		definition, exists := want[name]
		schema, validSchema := tool["input_schema"].(map[string]any)
		if !ok || !exists || seen[name] || !validSchema || digest(schema) != digest(definition.Schema) {
			return fmt.Errorf("client safeguards requires identical outbound client tools")
		}
		seen[name] = true
	}
	// Deferred client tools reach the outbound request once ToolSearch loads them.
	for name := range want {
		if !seen[name] && !deferred[name] {
			return fmt.Errorf("client safeguards requires all client tools in the outbound request")
		}
	}
	return nil
}

// subagentHandbackSchema is the input schema of SubagentHandback, the tool
// CC 2.1.292 gives every subagent (with safeguards) to deliver its report.
const subagentHandbackSchema = `{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"message":{"description":"Your full report for your caller","type":"string"}},"required":["message"],"additionalProperties":false}`

// handbackTool reports the client's SubagentHandback with the verified
// schema. The inner CLI has no such tool, so it travels under the gateway's
// MCP name like any client tool; its ID, input and schema are unchanged and
// it only returns the report to the client. Classifier rules govern CC's
// executing tools by name: every other renamed tool is still refused.
func (r *Request) handbackTool(name string) bool {
	if name != "SubagentHandback" {
		return false
	}
	var schema Object
	_ = json.Unmarshal([]byte(subagentHandbackSchema), &schema)
	for _, tool := range r.Tools {
		if tool.Name == name {
			return digest(tool.Schema) == digest(schema)
		}
	}
	return false
}

// searchHelper reports the tools the inner CLI adds for internal tool search.
func (r *Request) searchHelper(name string) bool {
	return r.toolSearchEnabled() && (name == "ToolSearch" || name == "DeferredToolPlaceholder")
}

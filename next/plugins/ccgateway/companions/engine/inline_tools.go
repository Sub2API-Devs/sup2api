package engine

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

type inlineToolTimeline struct {
	Searchable          map[string]bool
	HistoricalDiscovery bool
	Base                []Object
	Known               map[string]Object
	Active              map[string]bool
	Withdrawn           map[string]bool
	Versions            map[string][]Object
}

func inlineToolBlock(block Object) bool {
	return str(block, "type") == "tool_addition" || str(block, "type") == "tool_removal"
}
func inlineToolDefinition(block Object) Object {
	if str(block, "type") != "tool_addition" {
		return nil
	}
	target, _ := block["tool"].(map[string]any)
	if str(target, "type") != "tool_definition" {
		return nil
	}
	definition, _ := target["definition"].(map[string]any)
	return definition
}
func checkInlineToolBlock(block Object) error {
	if err := keys(block, "type", "tool", "cache_control"); err != nil {
		return err
	}
	tool, ok := block["tool"].(map[string]any)
	if !ok {
		return fmt.Errorf("inline tool change requires tool object")
	}
	switch str(tool, "type") {
	case "tool_reference":
		if err := keys(tool, "type", "name"); err != nil {
			return err
		}
		if !toolName.MatchString(str(tool, "name")) {
			return fmt.Errorf("invalid inline tool reference")
		}
	case "tool_definition":
		if str(block, "type") != "tool_addition" {
			return fmt.Errorf("tool_removal requires a reference")
		}
		if err := keys(tool, "type", "definition"); err != nil {
			return err
		}
		if _, ok := tool["definition"].(map[string]any); !ok {
			return fmt.Errorf("inline tool definition must be an object")
		}
	case "mcp_tool_reference":
		if err := keys(tool, "type", "server_name", "name"); err != nil {
			return err
		}
		if str(tool, "server_name") == "" || str(tool, "name") == "" {
			return fmt.Errorf("MCP reference requires server_name and name")
		}
	case "mcp_toolset_reference":
		if err := keys(tool, "type", "server_name"); err != nil {
			return err
		}
		if str(tool, "server_name") == "" {
			return fmt.Errorf("MCP toolset reference requires server_name")
		}
	default:
		return fmt.Errorf("unsupported inline tool change target")
	}
	return nil
}
func definitionFamily(tool Object) string {
	kind := str(tool, "type")
	if kind == "" || kind == "custom" {
		return "custom"
	}
	if name := serverToolName(kind); name != "" {
		return "server:" + name
	}
	if family := toolsetFamily(kind); family != "" {
		return "toolset:" + family
	}
	if name := apiClientToolNames[kind]; name != "" {
		return "client:" + name
	}
	return "unsupported:" + kind
}
func (r *Request) compileInlineTools(base []Object) error {
	timeline, carriers, err := r.compileToolTimeline(base)
	if err != nil || timeline == nil {
		return err
	}
	for _, i := range carriers {
		r.Messages[i].toolCarrier = "ccgateway-inline-tools-" + uuid() + "-" + uuid()
	}
	r.InlineTools = timeline
	// Register known custom identities only for transport/denial. Never put
	// this union into the model catalog; the relay restores the base timeline.
	names := make([]string, 0, len(timeline.Known))
	for name := range timeline.Known {
		names = append(names, name)
	}
	sort.Strings(names)
	all := []any{}
	for _, name := range names {
		copy, err := jsonCopyObject(timeline.Known[name])
		if err != nil {
			return err
		}
		all = append(all, copy)
	}
	remaining, typed, _, err := splitAPIClientTools(all, &r.TTL)
	if err != nil {
		return err
	}
	custom, server, err := splitServerSearchTools(remaining, &r.TTL)
	if err != nil {
		return err
	}
	tools, err := parseTools(custom, &r.TTL)
	if err != nil {
		return err
	}
	r.Tools, r.APIClientTools, r.ServerTools = tools, typed, server
	return nil
}
func (r *Request) validateInlineDefinition(def Object) error {
	copy, err := jsonCopyObject(def)
	if err != nil {
		return err
	}
	remaining, _, _, err := splitAPIClientTools([]any{copy}, &r.TTL)
	if err != nil {
		return err
	}
	custom, _, err := splitServerSearchTools(remaining, &r.TTL)
	if err != nil {
		return err
	}
	_, err = parseTools(custom, &r.TTL)
	return err
}

func (r *Request) validateInlineToolConfiguration() error {
	if r.InlineTools == nil {
		return nil
	}
	old, newBeta := hasBetaHeader(r.Betas, "mid-conversation-tool-changes-2026-07-01"), hasBetaHeader(r.Betas, "inline-tools-2026-09-15")
	if !old && !newBeta {
		return fmt.Errorf("inline tool changes require an admitted inline-tools beta")
	}
	for _, message := range r.Messages {
		for _, block := range message.Content {
			for _, change := range timelineChanges(block) {
				target := change["tool"].(map[string]any)
				if str(target, "type") == "tool_definition" && !newBeta {
					return fmt.Errorf("inline definitions require inline-tools-2026-09-15")
				}
			}
		}
	}
	if err := r.validateInlineInternalSearch(); err != nil {
		return err
	}
	if r.InlineTools.HistoricalDiscovery && !r.toolSearchEnabled() {
		return fmt.Errorf("historical deferred custom tool requires internal search evidence")
	}
	if r.Plan != nil && len(r.Plan.fields["safeguards"]) > 0 {
		return fmt.Errorf("inline tools with explicit safeguards require timeline context verification")
	}
	if r.Plan != nil {
		if raw := r.Plan.fields["tool_choice"]; len(raw) > 0 {
			value, _ := decodePlannedValue(raw)
			choice, _ := value.(map[string]any)
			if str(choice, "type") == "tool" && !r.InlineTools.Active[str(choice, "name")] {
				return fmt.Errorf("forced tool is not active at the final inline position")
			}
		}
	}
	return nil
}

func (r *Request) validateInlineNativeMapping(version string) error {
	if err := r.validateInlineInternalSearch(); err != nil {
		return err
	}
	if r.InlineTools == nil {
		return nil
	}
	for _, message := range r.Messages {
		for _, block := range message.Content {
			if str(block, "type") != "compaction" {
				continue
			}
			for _, change := range timelineChanges(block) {
				if digest(change) != digest(r.wireInlineToolBlock(change)) {
					return fmt.Errorf("compaction tool_changes require original tool identities; mapped names cannot rewrite the signed block")
				}
			}
		}
	}
	for name, versions := range r.InlineTools.Versions {
		matched, unmatched := false, false
		for _, definition := range versions {
			if definitionFamily(definition) != "custom" {
				continue
			}
			schema, _ := definition["input_schema"].(map[string]any)
			native := false
			for _, known := range verifiedNativeToolCatalogues[version][name] {
				native = native || sameToolDefinition(known, Tool{Name: name, Schema: schema})
			}
			matched = matched || native
			unmatched = unmatched || !native
		}
		if matched && unmatched {
			return fmt.Errorf("inline schema changes cannot switch CC native versus MCP identity for %s", name)
		}
	}
	return nil
}
func (r *Request) inlineToolActive(id ToolIdentity) bool {
	if r.InlineTools == nil {
		return true
	}
	name := id.Name
	if r.inlineInternalSearch() && name == "ToolSearch" && r.Native[name] {
		return true
	}
	if id.Toolset != "" {
		name = id.Toolset
	}
	return r.InlineTools.Active[name] || r.inlineSearchDiscovered(name)
}
func (r *Request) applyInlineToolCatalog(body Object) error {
	if r.InlineTools == nil {
		return nil
	}
	out := []any{}
	for _, original := range r.InlineTools.Base {
		tool, err := jsonCopyObject(original)
		if err != nil {
			return err
		}
		if definitionFamily(tool) == "custom" {
			tool["name"] = r.wireName(str(tool, "name"))
		}
		out = append(out, tool)
	}
	var err error
	out, err = r.appendInlineSearchHelpers(body, out)
	if err != nil {
		return err
	}
	body["tools"] = out
	return nil
}
func (r *Request) wireInlineToolBlock(original Object) Object {
	block, _ := jsonCopyObject(original)
	target, _ := block["tool"].(map[string]any)
	if str(target, "type") == "tool_reference" {
		name := str(target, "name")
		if r.InlineTools != nil && definitionFamily(r.InlineTools.Known[name]) == "custom" {
			target["name"] = r.wireName(name)
		}
	}
	if str(target, "type") == "tool_definition" {
		definition, _ := target["definition"].(map[string]any)
		if definitionFamily(definition) == "custom" {
			definition["name"] = r.wireName(str(definition, "name"))
		}
	}
	return block
}
func (r *Request) restoreInlineTools(body Object) error {
	if r.InlineTools == nil {
		return nil
	}
	messages, _ := body["messages"].([]any)
	for _, client := range r.Messages {
		if client.toolCarrier == "" {
			continue
		}
		count := 0
		for _, value := range messages {
			message, _ := value.(map[string]any)
			if str(message, "role") != "system" {
				continue
			}
			blocks, err := historyContent(message["content"])
			if err != nil {
				return err
			}
			if len(blocks) == 1 && str(blocks[0], "type") == "text" && str(blocks[0], "text") == client.toolCarrier {
				count++
				message["content"] = r.wireMessage(client).Content
			}
		}
		if count != 1 {
			return fmt.Errorf("inline tool carrier missing or ambiguous")
		}
	}
	raw, _ := json.Marshal(body)
	for _, client := range r.Messages {
		if client.toolCarrier != "" && strings.Contains(string(raw), client.toolCarrier) {
			return fmt.Errorf("inline tool carrier leaked")
		}
	}
	return nil
}

func (r *Request) verifyInlineToolHistory(body Object) error {
	if r.InlineTools == nil {
		return nil
	}
	if _, err := alignClientHistory(r, body); err != nil {
		return fmt.Errorf("inline tool history changed: %w", err)
	}
	return nil
}

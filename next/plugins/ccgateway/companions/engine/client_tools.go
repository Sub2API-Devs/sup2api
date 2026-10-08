package engine

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// ToolIdentity is the API dispatch identity, distinct from a CC transport name.
type ToolIdentity struct{ Toolset, Name string }

var apiClientToolNames = map[string]string{
	"bash_20241022": "bash", "bash_20250124": "bash",
	"text_editor_20241022": "str_replace_editor", "text_editor_20250124": "str_replace_editor",
	"text_editor_20250429": "str_replace_based_edit_tool", "text_editor_20250728": "str_replace_based_edit_tool",
	"computer_20241022": "computer", "computer_20250124": "computer", "computer_20251124": "computer",
	"memory_20250818": "memory",
}
var apiToolsetMembers = map[string][]string{
	"computer_toolset_20260801": strings.Fields("cursor_position double_click hold_key key left_click left_click_drag left_mouse_down left_mouse_up middle_click mouse_move right_click screenshot scroll triple_click type wait zoom"),
	"browser_toolset_20260801":  strings.Fields("close_tab double_click file_upload find form_input get_page_text hold_key hover javascript_exec key left_click left_click_drag left_mouse_down left_mouse_up list_tabs middle_click mouse_move navigate new_tab read_console read_network read_page right_click screenshot scroll scroll_to switch_tab triple_click type wait zoom"),
}

func apiClientType(kind string) bool {
	return apiClientToolNames[kind] != "" || apiToolsetMembers[kind] != nil
}
func toolsetFamily(kind string) string {
	if apiToolsetMembers[kind] != nil {
		return strings.SplitN(kind, "_", 2)[0]
	}
	return ""
}
func apiToolName(o Object) string {
	if family := toolsetFamily(str(o, "type")); family != "" {
		return family
	}
	return str(o, "name")
}

func splitAPIClientTools(value any, ttl *time.Duration) (any, []Object, []Object, error) {
	items, ok := value.([]any)
	if !ok {
		return nil, nil, nil, fmt.Errorf("tools must be an array")
	}
	others := []any{}
	var typed, catalog []Object
	seen := map[string]bool{}
	for _, v := range items {
		o, ok := v.(map[string]any)
		if !ok {
			return nil, nil, nil, fmt.Errorf("invalid tool definition")
		}
		name := apiToolName(o)
		if seen[name] {
			return nil, nil, nil, fmt.Errorf("duplicate tool identity %q", name)
		}
		seen[name] = true
		copy, err := jsonCopyObject(o)
		if err != nil {
			return nil, nil, nil, err
		}
		catalog = append(catalog, copy)
		if !apiClientType(str(o, "type")) {
			others = append(others, v)
			continue
		}
		if err := validateAPIClientTool(o, ttl); err != nil {
			return nil, nil, nil, err
		}
		typed = append(typed, copy)
	}
	if len(typed) == 0 {
		catalog = nil
	}
	return others, typed, catalog, nil
}

func validateAPIClientTool(o Object, ttl *time.Duration) error {
	kind := str(o, "type")
	family := toolsetFamily(kind)
	if family != "" {
		if err := keys(o, "type", "configs", "cache_control", "allowed_callers"); err != nil {
			return err
		}
		if err := validateToolsetConfigs(o, kind); err != nil {
			return err
		}
	} else {
		if str(o, "name") != apiClientToolNames[kind] {
			return fmt.Errorf("API client tool %s has a fixed name", kind)
		}
		allowed := []string{"type", "name", "cache_control", "defer_loading", "strict", "input_examples", "allowed_callers"}
		if strings.HasPrefix(kind, "computer_") {
			allowed = append(allowed, "display_width_px", "display_height_px", "display_number")
			if kind == "computer_20251124" {
				allowed = append(allowed, "enable_zoom")
			}
		}
		if kind == "text_editor_20250728" {
			allowed = append(allowed, "max_characters")
		}
		if err := keys(o, allowed...); err != nil {
			return err
		}
		for _, field := range []string{"defer_loading", "strict", "enable_zoom"} {
			if v, exists := o[field]; exists {
				if _, ok := v.(bool); !ok {
					return fmt.Errorf("%s must be boolean", field)
				}
			}
		}
		if strings.HasPrefix(kind, "computer_") {
			for _, field := range []string{"display_width_px", "display_height_px"} {
				if err := clientToolInteger(o[field], true); err != nil {
					return fmt.Errorf("%s: %w", field, err)
				}
			}
		}
		for _, field := range []string{"display_number", "max_characters"} {
			if value, exists := o[field]; exists && value != nil {
				if err := clientToolInteger(value, false); err != nil {
					return fmt.Errorf("%s: %w", field, err)
				}
			}
		}
		if v, exists := o["input_examples"]; exists {
			items, ok := v.([]any)
			if !ok {
				return fmt.Errorf("input_examples must be an array")
			}
			for _, item := range items {
				if _, ok := item.(map[string]any); !ok {
					return fmt.Errorf("tool input example must be an object")
				}
			}
		}
		if o["defer_loading"] == true && o["cache_control"] != nil {
			return fmt.Errorf("deferred tool cannot carry cache_control")
		}
	}
	if v, exists := o["allowed_callers"]; exists {
		list, ok := v.([]any)
		if !ok || len(list) != 1 || list[0] != "direct" {
			return fmt.Errorf("only direct client tool execution is supported")
		}
	}
	return cacheTTL(o["cache_control"], ttl)
}
func clientToolInteger(v any, positive bool) error {
	n, ok := v.(json.Number)
	if !ok {
		return fmt.Errorf("expected integer")
	}
	value, err := n.Int64()
	if err != nil || value < 0 || positive && value == 0 {
		return fmt.Errorf("invalid nonnegative integer")
	}
	return nil
}
func validateToolsetConfigs(o Object, kind string) error {
	configs := Object{}
	if v, exists := o["configs"]; exists && v != nil {
		var ok bool
		configs, ok = v.(map[string]any)
		if !ok {
			return fmt.Errorf("toolset configs must be object or null")
		}
	}
	members := map[string]bool{}
	for _, name := range apiToolsetMembers[kind] {
		members[name] = true
	}
	for name, v := range configs {
		if !members[name] {
			return fmt.Errorf("unknown toolset member %q", name)
		}
		if v == nil {
			continue
		}
		c, ok := v.(map[string]any)
		if !ok {
			return fmt.Errorf("toolset member config must be object or null")
		}
		if err := keys(c, "enabled", "defer_loading"); err != nil {
			return err
		}
		for _, key := range []string{"enabled", "defer_loading"} {
			if value, exists := c[key]; exists && value != nil {
				if _, ok := value.(bool); !ok {
					return fmt.Errorf("toolset member %s must be boolean", key)
				}
			}
		}
	}
	enabled, deferred := 0, 0
	for name := range members {
		c, _ := configs[name].(map[string]any)
		on := toolsetMemberEnabled(kind, name, c)
		if !on {
			continue
		}
		enabled++
		if c["defer_loading"] == true {
			deferred++
		}
	}
	if enabled == 0 {
		return fmt.Errorf("toolset must enable a member")
	}
	if deferred != 0 && deferred != enabled {
		return fmt.Errorf("enabled toolset members must share defer_loading")
	}
	if deferred > 0 && o["cache_control"] != nil {
		return fmt.Errorf("deferred toolset cannot carry cache_control")
	}
	return nil
}

func toolsetMemberEnabled(kind, name string, config Object) bool {
	if explicit, ok := config["enabled"].(bool); ok {
		return explicit
	}
	return kind != "browser_toolset_20260801" || (name != "javascript_exec" && name != "file_upload" && name != "read_console" && name != "read_network")
}

func (r *Request) acceptsAPIClientIdentity(id ToolIdentity) bool {
	for _, tool := range r.APIClientTools {
		kind := str(tool, "type")
		family := toolsetFamily(kind)
		if family == "" {
			if id.Toolset == "" && id.Name == str(tool, "name") {
				return true
			}
			continue
		}
		if family != id.Toolset {
			continue
		}
		for _, member := range apiToolsetMembers[kind] {
			if id.Name == member {
				return true
			}
		}
	}
	return false
}
func (r *Request) apiResponseToolName(block Object) string {
	if r.NoTools {
		return ""
	}
	id := ToolIdentity{Toolset: str(block, "toolset_name"), Name: str(block, "name")}
	if r.acceptsAPIClientIdentity(id) {
		if !r.inlineToolActive(id) {
			return ""
		}
		return id.Name
	}
	if id.Toolset != "" {
		return ""
	}
	name := clientToolName(r, id.Name)
	if !r.inlineToolActive(ToolIdentity{Name: name}) {
		return ""
	}
	return name
}
func (r *Request) applyAPIClientTools(body Object) error {
	if len(r.APIClientTools) == 0 {
		return nil
	}
	existing, _ := body["tools"].([]any)
	byName := map[string]Object{}
	for _, v := range existing {
		if o, ok := v.(map[string]any); ok {
			byName[str(o, "name")] = o
		}
	}
	out := []any{}
	for _, raw := range r.APIToolCatalog {
		if apiClientType(str(raw, "type")) {
			copy, err := jsonCopyObject(raw)
			if err != nil {
				return err
			}
			out = append(out, copy)
			continue
		}
		name := r.wireName(str(raw, "name"))
		tool := byName[name]
		if tool == nil {
			return fmt.Errorf("registered tool missing while restoring API tool catalog")
		}
		out = append(out, tool)
	}
	body["tools"] = out
	return nil
}

func (r *Request) validateAPIClientConfiguration() error {
	// A completed call without toolset_name cannot prove its old typed identity
	// after the declaration was removed. Do not silently change it into MCP.
	for _, message := range r.Messages {
		for _, block := range message.Content {
			if str(block, "type") != "tool_use" || str(block, "toolset_name") != "" {
				continue
			}
			name := str(block, "name")
			for _, fixed := range apiClientToolNames {
				if name == fixed && r.searchReferenceName(name, false) == "" {
					return fmt.Errorf("historical typed tool identity requires its declaration: %s", name)
				}
			}
		}
	}
	if len(r.APIClientTools) == 0 {
		return nil
	}
	if r.toolSearchEnabled() {
		return fmt.Errorf("typed API client tools with internal CC ToolSearch require scoped discovery adaptation")
	}
	if r.Plan != nil && len(r.Plan.fields["safeguards"]) > 0 {
		return fmt.Errorf("typed API client tools require explicit safeguards catalog identity verification before combining")
	}
	for _, tool := range r.APIClientTools {
		if toolsetFamily(str(tool, "type")) != "" && r.FineGrainedTools {
			return fmt.Errorf("client toolsets do not accept the legacy fine-grained beta")
		}
		if strings.HasPrefix(str(tool, "type"), "computer_") && toolsetFamily(str(tool, "type")) == "" {
			version := strings.TrimPrefix(str(tool, "type"), "computer_")
			beta := "computer-use-" + version[:4] + "-" + version[4:6] + "-" + version[6:]
			if !hasBetaHeader(r.Betas, beta) {
				return fmt.Errorf("legacy computer tool requires anthropic-beta: %s", beta)
			}
		}
		if family := toolsetFamily(str(tool, "type")); family != "" {
			configs, _ := tool["configs"].(map[string]any)
			deferred := false
			for _, name := range apiToolsetMembers[str(tool, "type")] {
				c, _ := configs[name].(map[string]any)
				on := toolsetMemberEnabled(str(tool, "type"), name, c)
				deferred = deferred || on && c["defer_loading"] == true
			}
			if deferred {
				found := false
				for _, server := range r.ServerTools {
					found = found || serverSearchName(str(server, "type")) != ""
				}
				if !found {
					return fmt.Errorf("deferred client toolsets require API tool search")
				}
			}
		}
	}
	return nil
}

func (r *Request) applyCompleteToolCatalog(body Object) error {
	if r.InlineTools != nil {
		return r.applyInlineToolCatalog(body)
	}
	if err := r.applyServerSearchTools(body); err != nil {
		return err
	}
	return r.applyAPIClientTools(body)
}

func (r *Request) verifyAPIClientHistory(body Object) (err error) {
	// CLI 2.1.292 strips toolset_name from assistant calls, while retaining it
	// on user results. Restore that one field only on an exact ID/name/input
	// match, then require the full client history to align before committing.
	expected := map[string]Object{}
	for _, message := range r.Messages {
		for _, block := range r.wireMessage(message).Content {
			if str(block, "type") == "tool_use" && str(block, "toolset_name") != "" {
				expected[str(block, "id")] = block
			}
		}
	}
	if len(expected) == 0 && len(r.APIClientTools) == 0 {
		return nil
	}
	var patched []Object
	defer func() {
		if err != nil {
			for _, block := range patched {
				delete(block, "toolset_name")
			}
		}
	}()
	messages, _ := body["messages"].([]any)
	for _, value := range messages {
		message, _ := value.(map[string]any)
		if str(message, "role") != "assistant" {
			continue
		}
		content, _ := historyContent(message["content"])
		for _, block := range content {
			want := expected[str(block, "id")]
			if str(block, "type") != "tool_use" || want == nil {
				continue
			}
			if _, present := block["toolset_name"]; present {
				continue
			}
			if err := restoreKnownToolsetField(want, block); err != nil {
				return err
			}
			patched = append(patched, block)
		}
	}
	if _, err := alignClientHistory(r, body); err != nil {
		return fmt.Errorf("API client tool history changed: %w", err)
	}
	return nil
}

func restoreKnownToolsetField(want, actual Object) error {
	if str(want, "toolset_name") == "" {
		return nil
	}
	if _, present := actual["toolset_name"]; present {
		return nil
	}
	plain, err := jsonCopyObject(want)
	if err != nil {
		return err
	}
	delete(plain, "toolset_name")
	if digest(historySkeleton([]Object{plain})) != digest(historySkeleton([]Object{actual})) {
		return fmt.Errorf("toolset call changed beyond known CLI field omission")
	}
	actual["toolset_name"] = want["toolset_name"]
	return nil
}
func validateToolsetIdentityField(block Object) error {
	if value, exists := block["toolset_name"]; exists {
		name, ok := value.(string)
		if !ok || !toolName.MatchString(name) {
			return fmt.Errorf("toolset_name must be a nonempty tool identity")
		}
	}
	return nil
}

// searchReferenceName resolves a catalog reference, not a toolset member call.
// Toolsets are deferred and expanded as a whole; their family name stays intact.
func (r *Request) searchReferenceName(name string, fromWire bool) string {
	if _, ok := r.mcpSearchReference(name); ok {
		return name
	}
	for _, tool := range r.APIClientTools {
		if apiToolName(tool) == name {
			return name
		}
	}
	if r.declaresServerTool(name) {
		return name
	}
	if fromWire {
		return clientToolName(r, name)
	}
	for _, tool := range r.Tools {
		if tool.Name == name {
			return name
		}
	}
	return ""
}
func (r *Request) wireSearchReferenceName(name string) string {
	if _, ok := r.mcpSearchReference(name); ok {
		return name
	}
	if r.searchReferenceName(name, false) == "" {
		return ""
	}
	for _, tool := range r.APIClientTools {
		if apiToolName(tool) == name {
			return name
		}
	}
	return r.wireName(name)
}

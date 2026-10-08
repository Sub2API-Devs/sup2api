package engine

import "fmt"

// Callers use this only after protocol block shape validation.
func timelineChanges(block Object) []Object {
	if inlineToolBlock(block) {
		return []Object{block}
	}
	var changes []Object
	if str(block, "type") == "compaction" {
		values, _ := block["tool_changes"].([]any)
		for _, value := range values {
			if change, ok := value.(Object); ok {
				changes = append(changes, change)
			}
		}
	}
	return changes
}

// compileToolTimeline interprets protocol positions without rewriting signed
// compaction blocks. Known is a transport identity union; Active is only the
// final model-visible state. Neither replaces the original upstream catalog.
func (r *Request) compileToolTimeline(base []Object) (*inlineToolTimeline, []int, error) {
	found := false
	for _, message := range r.Messages {
		for _, block := range message.Content {
			changes, _ := block["tool_changes"].([]any)
			found = found || inlineToolBlock(block) || str(block, "type") == "compaction" && len(changes) > 0
		}
	}
	if !found {
		return nil, nil, nil
	}
	t := &inlineToolTimeline{Base: base, Known: map[string]Object{}, Active: map[string]bool{}, Versions: map[string][]Object{}}
	current := map[string]Object{}
	reset := func() {
		current = map[string]Object{}
		t.Active = map[string]bool{}
		t.Withdrawn = map[string]bool{}
		t.Searchable = map[string]bool{}
		for _, tool := range base {
			name := apiToolName(tool)
			current[name] = tool
			t.Active[name] = tool["defer_loading"] != true
			t.Searchable[name] = true
		}
	}
	reset()
	for _, tool := range base {
		name := apiToolName(tool)
		t.Known[name] = tool
		t.Versions[name] = append(t.Versions[name], tool)
	}
	pending := map[string]string{}
	apply := func(block Object) error {
		if err := checkInlineToolBlock(block); err != nil {
			return err
		}
		if mcpInlineChange(block) {
			return nil
		}
		target := block["tool"].(map[string]any)
		name := str(target, "name")
		definition := inlineToolDefinition(block)
		if definition != nil {
			name = apiToolName(definition)
			if err := r.validateInlineDefinition(definition); err != nil {
				return err
			}
			if previous := t.Known[name]; previous != nil && definitionFamily(previous) != definitionFamily(definition) {
				return fmt.Errorf("inline tool definition changes tool family: %s", name)
			}
		} else if current[name] == nil {
			return fmt.Errorf("inline tool reference is unresolved: %s", name)
		}
		for _, outstanding := range pending {
			if outstanding == name {
				return fmt.Errorf("inline change cannot replace or withdraw a pending server tool: %s", name)
			}
		}
		if definition != nil {
			current[name], t.Known[name] = definition, definition
			t.Versions[name] = append(t.Versions[name], definition)
		}
		t.Active[name] = str(block, "type") == "tool_addition"
		t.Withdrawn[name] = str(block, "type") == "tool_removal"
		t.Searchable[name] = str(block, "type") == "tool_addition"
		return nil
	}
	var carriers []int
	previousRole := ""
	turnCalls := map[string]bool{}
	for mi, message := range r.Messages {
		if message.Role == "assistant" {
			turnCalls = map[string]bool{}
		}
		hasChanges := false
		for _, block := range message.Content {
			kind := str(block, "type")
			if kind == "fallback" {
				for id := range turnCalls {
					delete(pending, id)
				}
				turnCalls = map[string]bool{}
			}
			if kind == "compaction" && block["content"] != nil {
				changes, explicitChanges := block["tool_changes"].([]any)
				if explicitChanges {
					if len(pending) != 0 {
						return nil, nil, fmt.Errorf("compaction tool timeline crosses a pending server call")
					}
					// The returned changes describe the net effect relative to tools,
					// not relative to the previously replayed conversation state.
					previous := current
					reset()
					// Threshold compaction retains earlier messages. References can
					// resolve definitions actually present there, but never invent
					// definitions missing from a cold signed-summary import.
					for name, definition := range previous {
						if current[name] == nil {
							current[name] = definition
						}
					}
					for _, value := range changes {
						change, ok := value.(map[string]any)
						if !ok || !inlineToolBlock(change) {
							return nil, nil, fmt.Errorf("invalid compaction tool change")
						}
						if err := apply(change); err != nil {
							return nil, nil, err
						}
					}
				}
			}
			if inlineToolBlock(block) {
				if message.Role != "system" || previousRole != "user" {
					return nil, nil, fmt.Errorf("inline tool changes must follow a user turn; resume a paused server turn first")
				}
				hasChanges = true
				if err := apply(block); err != nil {
					return nil, nil, err
				}
			}
			if kind == "tool_use" || kind == "server_tool_use" {
				name := str(block, "name")
				if family := str(block, "toolset_name"); family != "" {
					name = family
				}
				if kind == "server_tool_use" && codeExecutionCall(name) {
					resolved := ""
					for _, candidate := range []string{"code_execution", "web_search", "web_fetch"} {
						if t.Active[candidate] && providerExecutionCallDeclared([]Object{current[candidate]}, name) {
							resolved = candidate
							break
						}
					}
					if resolved != "" {
						name = resolved
					}
				}
				if current[name] != nil && !t.Active[name] && t.Searchable[name] && definitionFamily(current[name]) == "custom" && current[name]["defer_loading"] == true {
					t.HistoricalDiscovery = true
				} else if current[name] == nil || !t.Active[name] {
					return nil, nil, fmt.Errorf("historical tool call was not available at that position: %s", name)
				}
				server := serverToolName(str(current[name], "type")) != ""
				if server != (kind == "server_tool_use") {
					return nil, nil, fmt.Errorf("historical tool call changed client/server execution identity: %s", name)
				}
				if kind == "server_tool_use" {
					pending[str(block, "id")] = name
					turnCalls[str(block, "id")] = true
				}
			}
			if kind == "tool_search_tool_result" {
				content, _ := block["content"].(Object)
				refs, _ := content["tool_references"].([]any)
				for _, value := range refs {
					ref, _ := value.(Object)
					name := str(ref, "tool_name")
					if current[name] == nil || t.Withdrawn[name] {
						return nil, nil, fmt.Errorf("tool search referenced an undefined tool at its historical position")
					}
					t.Active[name] = true
				}
			}
			if serverResultTypeForBlock(kind) {
				delete(pending, str(block, "tool_use_id"))
			}
		}
		if hasChanges {
			if string(message.ClearAt) == `"next_user_message"` {
				return nil, nil, fmt.Errorf("turn-scoped system messages cannot contain tool changes")
			}
			carriers = append(carriers, mi)
		}
		if message.Role != "system" {
			previousRole = message.Role
		}
	}
	return t, carriers, nil
}

func serverResultTypeForBlock(kind string) bool {
	if codeExecutionResult(kind) {
		return true
	}
	switch kind {
	case "tool_search_tool_result", "web_search_tool_result", "web_fetch_tool_result", "advisor_tool_result":
		return true
	}
	return false
}

func (a *Accumulator) rememberInlineSearch(block Object) {
	content, _ := block["content"].(Object)
	refs, _ := content["tool_references"].([]any)
	for _, value := range refs {
		ref, _ := value.(Object)
		if a.discoveredInlineTools == nil {
			a.discoveredInlineTools = map[string]bool{}
		}
		a.discoveredInlineTools[str(ref, "tool_name")] = true
	}
}

func (a *Accumulator) inlineResponseView(r *Request) *Request {
	if r.InlineTools == nil || len(a.discoveredInlineTools) == 0 {
		return r
	}
	view := *r
	timeline := *r.InlineTools
	timeline.Active = map[string]bool{}
	for name, active := range r.InlineTools.Active {
		timeline.Active[name] = active
	}
	for name := range a.discoveredInlineTools {
		if !timeline.Withdrawn[name] {
			timeline.Active[name] = true
		}
	}
	view.InlineTools = &timeline
	return &view
}

func (r *Request) validateInlineSearchDiscovery(block Object) error {
	if r.InlineTools == nil {
		return nil
	}
	content, _ := block["content"].(Object)
	refs, _ := content["tool_references"].([]any)
	for _, value := range refs {
		ref, _ := value.(Object)
		if r.InlineTools.Withdrawn[str(ref, "tool_name")] {
			return fmt.Errorf("tool search cannot rediscover an explicitly withdrawn tool")
		}
	}
	return nil
}

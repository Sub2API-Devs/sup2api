package engine

import (
	"encoding/json"
	"fmt"
)

// Inline controls are protocol metadata. They never become prompt text or
// an instruction to the worker; only the attributed main request gets them.
func validateInlineSystemMetadata(m Object, index int) error {
	if value, exists := m["clear_at"]; exists && value != nil {
		if value != "never" && value != "next_user_message" {
			return fmt.Errorf("messages.%d.clear_at must be never, next_user_message or null", index)
		}
	}
	if value, exists := m["output_config"]; exists && value != nil {
		config, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("messages.%d.output_config must be an object or null", index)
		}
		if err := keys(config, "effort"); err != nil {
			return err
		}
		if effort, exists := config["effort"]; exists && effort != nil {
			switch effort {
			case "low", "medium", "high", "xhigh", "max":
			default:
				return fmt.Errorf("messages.%d.output_config.effort is invalid", index)
			}
		}
	}
	if m["clear_at"] == "next_user_message" {
		if m["output_config"] != nil {
			return fmt.Errorf("messages.%d: next_user_message cannot carry output_config", index)
		}
		if blocks, ok := m["content"].([]any); ok {
			for _, value := range blocks {
				if block, ok := value.(map[string]any); ok && block["cache_control"] != nil {
					return fmt.Errorf("messages.%d: next_user_message cannot carry cache_control", index)
				}
			}
		}
	}
	return nil
}

func validInlineDirective(m Object) bool {
	config, ok := m["output_config"].(map[string]any)
	return ok && config["effort"] != nil
}

func (m Message) directiveOnly() bool {
	if m.Role != "system" || len(m.Content) != 0 || len(m.OutputConfig) == 0 {
		return false
	}
	var config Object
	return json.Unmarshal(m.OutputConfig, &config) == nil && config["effort"] != nil
}

func inlineSystemObject(m Message) Object {
	content := make([]any, len(m.Content))
	for i, block := range m.Content {
		content[i] = block
	}
	out := Object{"role": "system", "content": content}
	for key, raw := range map[string]json.RawMessage{"clear_at": m.ClearAt, "output_config": m.OutputConfig} {
		if len(raw) > 0 {
			value, _ := decodePlannedValue(raw)
			out[key] = value
		}
	}
	return out
}

func (r *Request) hasInlineSystemMetadata() bool {
	for _, message := range r.Messages {
		if len(message.ClearAt) > 0 || len(message.OutputConfig) > 0 {
			return true
		}
	}
	return false
}

func (r *Request) validateInlineSystemBetas(allowEffort bool) error {
	admitted := map[string]bool{}
	for _, beta := range r.Betas {
		admitted[beta] = true
	}
	for _, message := range r.Messages {
		if len(message.ClearAt) > 0 && !admitted["mid-conversation-system-clear-at-2026-08-21"] {
			return fmt.Errorf("messages[].clear_at requires admitted mid-conversation-system-clear-at-2026-08-21 beta")
		}
		if len(message.OutputConfig) > 0 {
			if !allowEffort {
				return fmt.Errorf("messages[].output_config is disabled by the effort policy")
			}
			if !admitted["mid-conversation-output-config-2026-07-01"] {
				return fmt.Errorf("messages[].output_config requires admitted mid-conversation-output-config-2026-07-01 beta")
			}
		}
	}
	return nil
}

// An empty directive needs no native text carrier. Identify every client turn
// monotonically, with full role/block identity, then insert it in the original
// gap. This runs only after main-request attribution and text-system recovery.
func restoreInlineSystemMetadata(r *Request, body Object) error {
	if !r.hasInlineSystemMetadata() {
		return nil
	}
	wire, ok := body["messages"].([]any)
	if !ok {
		return fmt.Errorf("inline system metadata has no outbound messages")
	}
	type insertion struct {
		at      int
		message Object
	}
	var inserts []insertion
	var pending []Message
	matchedSystems := map[int]bool{}
	internalResults := map[string]bool{}
	at := 0
	for clientIndex, want := range r.Messages {
		if want.directiveOnly() {
			pending = append(pending, want)
			continue
		}
		expected := r.wireMessage(want).Content
		found := false
		for at < len(wire) {
			current, ok := wire[at].(map[string]any)
			if !ok {
				return fmt.Errorf("invalid inline system history")
			}
			actual, err := historyContent(current["content"])
			if err != nil {
				return err
			}
			if str(current, "role") == "assistant" && internalHistoryAssistant(r, current) {
				for _, block := range actual {
					if str(block, "type") == "tool_use" {
						internalResults[str(block, "id")] = true
					}
				}
				at++
				continue
			}
			if str(current, "role") == "user" && onlyInternalResults(actual, internalResults) {
				at++
				continue
			}
			if str(current, "role") == "system" && (want.Role != "system" || digest(historySkeleton(actual)) != digest(historySkeleton(expected))) {
				at++
				continue
			}
			if str(current, "role") != want.Role {
				return fmt.Errorf("inline system history role changed")
			}
			matched := actual
			if want.Role == "user" {
				if parts := splitInlineUserRun(r, clientIndex, current); len(parts) > 1 {
					wire = append(wire[:at], append(parts, wire[at+1:]...)...)
					current = wire[at].(map[string]any)
					actual, _ = historyContent(current["content"])
				}
				matched, err = alignUserHistoryBlocks(expected, actual)
				if err != nil {
					return err
				}
			}
			if digest(historySkeleton(matched)) != digest(historySkeleton(expected)) {
				return fmt.Errorf("inline system history blocks changed")
			}
			for _, directive := range pending {
				inserts = append(inserts, insertion{at, inlineSystemObject(directive)})
			}
			pending = nil
			if want.Role == "system" {
				matchedSystems[at] = true
				original := inlineSystemObject(want)
				for _, key := range []string{"clear_at", "output_config"} {
					if value, exists := original[key]; exists {
						current[key] = value
					}
				}
				if current["clear_at"] == "next_user_message" {
					for _, block := range actual {
						delete(block, "cache_control")
					}
				}
			}
			at++
			found = true
			break
		}
		if !found {
			return fmt.Errorf("inline system history turn missing")
		}
	}
	for _, directive := range pending {
		inserts = append(inserts, insertion{at, inlineSystemObject(directive)})
	}
	if err := validateInlineTail(r, wire[at:], internalResults); err != nil {
		return err
	}
	stripGeneratedInlineEffort(r, wire, matchedSystems)
	for i := len(inserts) - 1; i >= 0; i-- {
		insert := inserts[i]
		wire = append(wire[:insert.at], append([]any{insert.message}, wire[insert.at:]...)...)
	}
	clean := make([]any, 0, len(wire))
	for _, value := range wire {
		if value != nil {
			clean = append(clean, value)
		}
	}
	body["messages"] = clean
	return nil
}

// This runs before client system restoration, so the inline effort fields in
// the CLI request are defaults generated by the inner CLI. Removing them must
// precede restoring client directives; doing it afterward could erase a real
// per-turn override or allow CC's medium to override the API top-level effort.
func stripCLIInlineEffort(body Object) {
	wire, ok := body["messages"].([]any)
	if !ok {
		return
	}
	out := make([]any, 0, len(wire))
	for _, value := range wire {
		message, ok := value.(map[string]any)
		if !ok || str(message, "role") != "system" {
			out = append(out, value)
			continue
		}
		config, ok := message["output_config"].(map[string]any)
		if !ok {
			out = append(out, value)
			continue
		}
		if _, exists := config["effort"]; !exists {
			out = append(out, value)
			continue
		}
		delete(config, "effort")
		if len(config) == 0 {
			delete(message, "output_config")
		}
		content, err := historyContent(message["content"])
		if err == nil && len(content) == 0 && len(message) == 2 {
			continue
		}
		out = append(out, message)
	}
	body["messages"] = out
}

func onlyInternalResults(blocks []Object, ids map[string]bool) bool {
	if len(blocks) == 0 {
		return false
	}
	for _, block := range blocks {
		if str(block, "type") != "tool_result" || !ids[str(block, "tool_use_id")] {
			return false
		}
	}
	return true
}

// Native CLI coalesces consecutive user input separated only by empty
// directives. Split only a complete unique block run; never search text inside
// a block or infer boundaries from tool arguments.
func splitInlineUserRun(r *Request, start int, current Object) []any {
	var users []Message
	var combined []Object
	for _, message := range r.Messages[start:] {
		if message.directiveOnly() {
			continue
		}
		if message.Role != "user" {
			break
		}
		wire := r.wireMessage(message)
		users = append(users, wire)
		combined = append(combined, wire.Content...)
	}
	if len(users) < 2 {
		return nil
	}
	actual, err := historyContent(current["content"])
	if err != nil {
		return nil
	}
	matched, err := alignUserHistoryBlocks(combined, actual)
	if err != nil {
		return nil
	}
	extra := len(actual) - len(matched)
	var out []any
	at := extra
	for i, user := range users {
		end := at + len(user.Content)
		from := at
		if i == 0 {
			from = 0
		}
		content := make([]any, end-from)
		for j, block := range actual[from:end] {
			content[j] = block
		}
		out = append(out, Object{"role": "user", "content": content})
		at = end
	}
	return out
}

func validateInlineTail(r *Request, tail []any, internalResults map[string]bool) error {
	for _, value := range tail {
		message, _ := value.(map[string]any)
		if str(message, "role") == "system" {
			continue
		}
		blocks, err := historyContent(message["content"])
		if err != nil {
			return err
		}
		if str(message, "role") == "assistant" && internalHistoryAssistant(r, message) {
			for _, block := range blocks {
				if str(block, "type") == "tool_use" {
					internalResults[str(block, "id")] = true
				}
			}
			continue
		}
		if str(message, "role") == "user" && onlyInternalResults(blocks, internalResults) {
			continue
		}
		return fmt.Errorf("unmatched outbound turn after inline system history")
	}
	return nil
}

func stripGeneratedInlineEffort(r *Request, wire []any, matchedSystems map[int]bool) {
	// Explicit inline effort overrides CC's generated inline effort directives.
	// Matched client systems are protected; preserve every other field/content.
	effort := false
	for _, message := range r.Messages {
		var config Object
		_ = json.Unmarshal(message.OutputConfig, &config)
		effort = effort || config["effort"] != nil
	}
	if effort {
		for i, value := range wire {
			message, _ := value.(map[string]any)
			if str(message, "role") != "system" || matchedSystems[i] {
				continue
			}
			config, ok := message["output_config"].(map[string]any)
			if !ok {
				continue
			}
			delete(config, "effort")
			if len(config) == 0 {
				delete(message, "output_config")
				content, _ := historyContent(message["content"])
				if len(message) == 2 && len(content) == 0 {
					wire[i] = nil
				}
			}
		}
	}
}

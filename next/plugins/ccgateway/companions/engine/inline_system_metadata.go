package engine

import (
	"encoding/json"
	"fmt"
)

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

func (m Message) turnScoped() bool {
	var clearAt string
	return m.Role == "system" && json.Unmarshal(m.ClearAt, &clearAt) == nil && clearAt == "next_user_message"
}

func (r *Request) lastUserMessage() int {
	for i := len(r.Messages) - 1; i >= 0; i-- {
		if r.Messages[i].Role == "user" {
			return i
		}
	}
	return -1
}

func (r *Request) inlineSystemState(end int) string {
	var state []any
	lastUser := r.lastUserMessage()
	for i, message := range r.Messages[:end] {
		if message.turnScoped() {
			state = append(state, []any{i, i < lastUser})
		}
	}
	if len(state) == 0 {
		return ""
	}
	return digest(state)
}

func (r *Request) inlineEffort() string {
	effective, pending := "", ""
	newInput := false
	for _, message := range r.Messages {
		switch message.Role {
		case "user":
			newInput = false
			for _, block := range message.Content {
				newInput = newInput || str(block, "type") != "tool_result"
			}
			if newInput && pending != "" {
				effective = pending
			}
		case "assistant":
			newInput = false
		case "system":
			var config struct {
				Effort string `json:"effort"`
			}
			if json.Unmarshal(message.OutputConfig, &config) == nil && config.Effort != "" {
				pending = config.Effort
				if newInput {
					effective = pending
				}
			}
		}
	}
	return effective
}

// pendingPersistentSystems removes scoped entries by client position, not by
// text. prompt.submit coalesces these entries into one native attachment.
func (r *Request) pendingPersistentSystems() (texts []string, scoped bool) {
	for i := r.pendingStart(); i < len(r.Messages); i++ {
		m := r.Messages[i]
		if m.Role != "system" || m.turnScoped() && i < r.lastUserMessage() {
			continue
		}
		if m.turnScoped() {
			scoped = true
			continue
		}
		texts = append(texts, systemTexts(m)...)
	}
	return texts, scoped
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

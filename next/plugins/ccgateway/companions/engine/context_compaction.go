package engine

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"
)

const contextBeta = "context-management-2025-06-27"
const thresholdCompactionBeta = "compact-2026-01-12"
const signedCompactionBeta = "compact-2026-09-04"

func (p *RequestPlan) hasObjectField(name string) bool {
	return p != nil && len(p.fields[name]) > 0 && string(p.fields[name]) != "null"
}

func (r *Request) hasContextControls() bool {
	return r.Plan != nil && (r.Plan.hasObjectField("context_management") || r.Plan.hasObjectField("compaction"))
}

func (r *Request) mapContextToolNames(o Object) {
	clientNames := map[string]bool{}
	for _, tool := range r.Tools {
		clientNames[tool.Name] = true
	}
	for _, message := range r.Messages {
		for _, block := range message.Content {
			if str(block, "type") == "tool_use" {
				clientNames[str(block, "name")] = true
			}
		}
	}
	for _, value := range o["edits"].([]any) {
		e := value.(map[string]any)
		for _, key := range []string{"exclude_tools", "clear_tool_inputs"} {
			list, ok := e[key].([]any)
			if !ok {
				continue
			}
			for i, v := range list {
				name := v.(string)
				if clientNames[name] {
					list[i] = r.wireName(name)
				}
			}
		}
	}
}

func parseContextCompaction(p *RequestPlan, body Object) error {
	for _, name := range []string{"context_management", "compaction"} {
		value, exists := body[name]
		if !exists {
			continue
		}
		if value == nil {
			p.fields[name] = json.RawMessage("null")
			delete(body, name)
			continue
		}
		object, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("%s must be an object", name)
		}
		var err error
		if name == "compaction" {
			err = validateCompaction(object)
		} else {
			err = validateContextManagement(object)
		}
		if err != nil {
			return err
		}
		p.fields[name], _ = json.Marshal(object)
		delete(body, name)
	}
	if p.hasObjectField("compaction") && p.hasObjectField("context_management") {
		return fmt.Errorf("compaction cannot be combined with context_management")
	}
	return nil
}

func validateCompaction(o Object) error {
	if err := keys(o, "type", "instructions"); err != nil {
		return err
	}
	if str(o, "type") != "summarize" {
		return fmt.Errorf("compaction.type must be summarize")
	}
	return compactionInstructions(o)
}
func compactionInstructions(o Object) error {
	if value, exists := o["instructions"]; exists {
		if str(o, "type") == "compact_20260112" {
			if value == nil {
				return nil
			}
			if _, ok := value.(string); !ok {
				return fmt.Errorf("compaction instructions must be text")
			}
			return nil
		}
		s, ok := value.(string)
		if !ok || strings.TrimSpace(s) == "" || utf8.RuneCountInString(s) > 16384 {
			return fmt.Errorf("compaction instructions must be nonblank text of at most 16384 characters")
		}
	}
	return nil
}

func contextCounter(value any, kinds ...string) error {
	o, ok := value.(map[string]any)
	if !ok {
		return fmt.Errorf("context counter must be an object")
	}
	if err := keys(o, "type", "value"); err != nil {
		return err
	}
	matched := false
	for _, kind := range kinds {
		matched = matched || str(o, "type") == kind
	}
	n, ok := o["value"].(json.Number)
	if !ok || !matched {
		return fmt.Errorf("invalid context counter")
	}
	v, err := n.Int64()
	if err != nil || v < 0 {
		return fmt.Errorf("context counter must be a nonnegative integer")
	}
	return nil
}
func contextNames(value any) error {
	list, ok := value.([]any)
	if !ok {
		return fmt.Errorf("context tool names must be an array")
	}
	for _, v := range list {
		s, ok := v.(string)
		if !ok || s == "" {
			return fmt.Errorf("invalid context tool name")
		}
	}
	return nil
}
func validateContextManagement(o Object) error {
	if err := keys(o, "edits"); err != nil {
		return err
	}
	edits, ok := o["edits"].([]any)
	if !ok {
		return fmt.Errorf("context_management.edits must be an array")
	}
	seen := map[string]bool{}
	for index, value := range edits {
		e, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("context edit must be an object")
		}
		kind := str(e, "type")
		if seen[kind] {
			return fmt.Errorf("duplicate context edit")
		}
		seen[kind] = true
		switch kind {
		case "clear_thinking_20251015":
			if err := keys(e, "type", "keep"); err != nil {
				return err
			}
			if index != 0 {
				return fmt.Errorf("thinking clearing must precede other context edits")
			}
			if v, exists := e["keep"]; exists && func() bool { s, ok := v.(string); return !ok || s != "all" }() {
				if all, ok := v.(map[string]any); ok && str(all, "type") == "all" {
					if err := keys(all, "type"); err != nil {
						return err
					}
					continue
				}
				if err := contextCounter(v, "thinking_turns"); err != nil {
					return err
				}
				count, _ := v.(map[string]any)["value"].(json.Number).Int64()
				if count == 0 {
					return fmt.Errorf("thinking_turns must be positive")
				}
			}
		case "clear_tool_uses_20250919":
			if err := keys(e, "type", "trigger", "keep", "clear_at_least", "exclude_tools", "clear_tool_inputs"); err != nil {
				return err
			}
			for name, kinds := range map[string][]string{"trigger": {"input_tokens", "tool_uses"}, "keep": {"tool_uses"}, "clear_at_least": {"input_tokens"}} {
				if v, exists := e[name]; exists && !(name == "clear_at_least" && v == nil) {
					if err := contextCounter(v, kinds...); err != nil {
						return err
					}
				}
			}
			if v, exists := e["exclude_tools"]; exists && v != nil {
				if err := contextNames(v); err != nil {
					return err
				}
			}
			if v, exists := e["clear_tool_inputs"]; exists && v != nil {
				if _, ok := v.(bool); !ok {
					if err := contextNames(v); err != nil {
						return err
					}
				}
			}
		case "compact_20260112":
			if err := keys(e, "type", "trigger", "instructions", "pause_after_compaction"); err != nil {
				return err
			}
			if v, exists := e["trigger"]; exists && v != nil {
				if err := contextCounter(v, "input_tokens"); err != nil {
					return err
				}
			}
			if v, exists := e["pause_after_compaction"]; exists {
				if _, ok := v.(bool); !ok {
					return fmt.Errorf("pause_after_compaction must be boolean")
				}
			}
			if err := compactionInstructions(e); err != nil {
				return err
			}
		default:
			return fmt.Errorf("unsupported context edit %q", kind)
		}
	}
	return nil
}

// keepsAllThinking: a thinking-clearing edit that keeps every thinking block
// ("all" or {"type":"all"}), so the API drops nothing.
func keepsAllThinking(e map[string]any) bool {
	if str(e, "type") != "clear_thinking_20251015" {
		return false
	}
	switch v := e["keep"].(type) {
	case string:
		return v == "all"
	case map[string]any:
		return str(v, "type") == "all"
	}
	return false
}

func (r *Request) hasCompactionHistory() bool {
	for _, m := range r.Messages {
		for _, b := range m.Content {
			if str(b, "type") == "compaction" {
				return true
			}
		}
	}
	return false
}
func (r *Request) configureContextCompaction(headers []string) error {
	if r.Plan == nil {
		return nil
	}
	need := map[string]bool{}
	// rewrites: the API may drop or replace context. Keeping every thinking
	// block (CLI 2.1.292 sends it by default) rewrites nothing.
	rewrites := false
	if r.Plan.hasObjectField("compaction") {
		need[signedCompactionBeta] = true
		rewrites = true
	}
	if raw := r.Plan.fields["context_management"]; r.Plan.hasObjectField("context_management") {
		v, _ := decodePlannedValue(raw)
		o := v.(map[string]any)
		for _, value := range o["edits"].([]any) {
			e := value.(map[string]any)
			if str(e, "type") == "compact_20260112" {
				need[thresholdCompactionBeta] = true
			} else {
				need[contextBeta] = true
			}
			rewrites = rewrites || !keepsAllThinking(e)
		}
	}
	signedBlocks := 0
	for mi, m := range r.Messages {
		for bi, b := range m.Content {
			if str(b, "type") == "compaction" {
				if str(b, "signature") != "" {
					signedBlocks++
					if mi != 0 || bi != 0 {
						return fmt.Errorf("signed compaction block must be first in messages")
					}
					need[signedCompactionBeta] = true
				} else if hasBetaHeader(headers, signedCompactionBeta) {
					need[signedCompactionBeta] = true
				} else {
					need[thresholdCompactionBeta] = true
				}
				rewrites = true
			}
		}
	}
	if signedBlocks > 1 {
		return fmt.Errorf("only one signed compaction block may be replayed")
	}
	if signedBlocks > 0 && r.Plan.hasObjectField("context_management") {
		return fmt.Errorf("signed compaction cannot be combined with context_management")
	}
	for beta := range need {
		if !hasBetaHeader(headers, beta) {
			return fmt.Errorf("request requires anthropic-beta: %s", beta)
		}
	}
	if need[signedCompactionBeta] && need[thresholdCompactionBeta] {
		return fmt.Errorf("signed and threshold compaction protocols cannot be mixed")
	}
	if (rewrites || r.continuation != "") && r.toolSearchEnabled() {
		return fmt.Errorf("API context editing/compaction with internal CC ToolSearch rounds is not yet supported")
	}
	if r.Plan.hasObjectField("compaction") {
		if r.JSONSchema != nil || r.Plan.fields["stop_sequences"] != nil {
			return fmt.Errorf("compaction does not accept output format or stop_sequences")
		}
		if raw := r.Plan.fields["tool_choice"]; raw != nil {
			v, _ := decodePlannedValue(raw)
			kind := str(v.(map[string]any), "type")
			if kind == "any" || kind == "tool" {
				return fmt.Errorf("compaction does not accept forced tool_choice")
			}
		}
	}
	return nil
}

// No summary reconstruction, signature repair, or implicit block dropping. The
// CLI must carry every opaque compaction block at its client history position.
func (r *Request) verifyCompactionHistory(body Object) error {
	if !r.hasCompactionHistory() {
		return nil
	}
	pairs, err := alignClientHistory(r, body)
	if err != nil {
		return fmt.Errorf("compaction history changed: %w", err)
	}
	for _, pair := range pairs {
		for i, want := range pair.expected {
			if str(want, "type") == "compaction" && digest(withoutProtocolCache([]Object{want})) != digest(withoutProtocolCache([]Object{pair.actual[i]})) {
				return fmt.Errorf("compaction block changed")
			}
		}
	}
	if len(r.Messages) > 0 && len(r.Messages[0].Content) > 0 && str(r.Messages[0].Content[0], "type") == "compaction" && str(r.Messages[0].Content[0], "signature") != "" {
		messages, _ := body["messages"].([]any)
		first, _ := messages[0].(map[string]any)
		blocks, _ := historyContent(first["content"])
		if len(blocks) == 0 || str(blocks[0], "type") != "compaction" {
			return fmt.Errorf("CLI inserted content before signed compaction block")
		}
	}
	return nil
}

func checkCompactionBlock(b Object, role string, partial bool) error {
	if err := keys(b, "type", "content", "signature", "encrypted_content", "tool_changes"); err != nil {
		return err
	}
	if role != "assistant" && (role != "user" || str(b, "signature") == "" && b["content"] != nil) {
		return fmt.Errorf("unsigned compaction is only valid in assistant content")
	}
	content, ok := b["content"].(string)
	if b["content"] != nil && (!ok || !partial && content == "") {
		return fmt.Errorf("invalid compaction content")
	}
	for _, field := range []string{"signature", "encrypted_content"} {
		if v, exists := b[field]; exists && v != nil {
			if _, ok := v.(string); !ok {
				return fmt.Errorf("invalid compaction %s", field)
			}
		}
	}
	if v, exists := b["tool_changes"]; exists && v != nil {
		changes, ok := v.([]any)
		if !ok {
			return fmt.Errorf("compaction tool_changes must be an array")
		}
		for _, change := range changes {
			entry, ok := change.(map[string]any)
			if !ok || (str(entry, "type") != "tool_addition" && str(entry, "type") != "tool_removal") {
				return fmt.Errorf("invalid compaction tool change")
			}
			if err := checkInlineToolBlock(entry); err != nil {
				return err
			}
		}
	}
	return nil
}

package engine

import (
	"encoding/json"
	"fmt"
	"strings"
)

// continuation is a CLI transport input, never an API message or model prompt.
func (r *Request) configureContinuation() {
	if len(r.Messages) > 0 && r.Messages[len(r.Messages)-1].Role == "assistant" {
		r.continuation = "ccgateway-continuation-" + uuid() + "-" + uuid()
	}
}

func (r *Request) needsAPITerminalControl() bool {
	return r.MCP != nil || len(r.APIClientTools) > 0 || r.needsFreshNativeSession()
}
func (r *Request) needsFreshNativeSession() bool {
	return r.credit != nil || r.hasFallbacks() || r.InlineTools != nil || r.APIOutputFormat || r.continuation != "" || r.hasContextControls() || r.hasCompactionHistory()
}

func (r *Request) observesAPITerminal() bool {
	return r.needsAPITerminalControl() || len(r.ServerTools) > 0
}
func (r *Request) stopsAtAPITerminal(reason string) bool {
	return r.needsAPITerminalControl() || len(r.ServerTools) > 0 && reason == "pause_turn"
}

// The trigger must be the sole text of the final user turn. Extra CC user
// attachments are not silently removed: they would change assistant prefill.
func (r *Request) removeContinuation(body Object, controls ...*modControl) error {
	if r.continuation == "" {
		return nil
	}
	messages, _ := body["messages"].([]any)
	if len(messages) < 2 {
		return fmt.Errorf("continuation transport history is missing")
	}
	last, _ := messages[len(messages)-1].(map[string]any)
	previous, _ := messages[len(messages)-2].(map[string]any)
	blocks, _ := historyContent(last["content"])
	if len(blocks) == 2 && len(controls) == 1 && r.duplicateTransportReminder(messages, blocks[0], controls[0]) {
		blocks = blocks[1:]
	}
	if str(last, "role") != "user" || len(blocks) != 1 || keys(blocks[0], "type", "text", "cache_control") != nil || str(blocks[0], "type") != "text" || str(blocks[0], "text") != r.continuation || str(previous, "role") != "assistant" {
		return fmt.Errorf("continuation transport input changed; refusing to change assistant-tail semantics")
	}
	view := Object{}
	for key, value := range body {
		view[key] = value
	}
	view["messages"] = messages[:len(messages)-1]
	raw, _ := json.Marshal(view)
	if strings.Contains(string(raw), r.continuation) {
		return fmt.Errorf("continuation transport marker leaked outside its final input")
	}
	body["messages"] = view["messages"]
	return nil
}

// CLI 2.1.292 replaces a final unresolved server-tool-only assistant turn
// with this interruption text while loading native history. Only that exact
// carrier is reversible; the whole preceding client history must also match.
func (r *Request) restoreContinuationTail(body Object) error {
	if r.continuation == "" {
		return nil
	}
	messages, _ := body["messages"].([]any)
	if len(messages) == 0 {
		return fmt.Errorf("continuation history is empty")
	}
	last, _ := messages[len(messages)-1].(map[string]any)
	actual, err := historyContent(last["content"])
	if err != nil {
		return err
	}
	expected := r.wireMessage(r.Messages[len(r.Messages)-1]).Content
	if digest(historySkeleton(expected)) == digest(historySkeleton(actual)) {
		return nil
	}
	if restored, err := r.restorePendingMCPContinuation(body, messages, expected, actual); restored || err != nil {
		return err
	}
	if restored, err := r.restoreMixedPendingContinuation(messages, last, expected, actual); restored || err != nil {
		return err
	}
	if str(last, "role") != "assistant" || len(actual) != 1 || str(actual[0], "type") != "text" || str(actual[0], "text") != "[Tool use interrupted]" {
		return fmt.Errorf("assistant continuation history changed")
	}
	if len(expected) == 0 {
		return fmt.Errorf("assistant continuation has no expected blocks")
	}
	ledger, err := r.serverHistoryLedger()
	if err != nil {
		return err
	}
	for _, block := range expected {
		if (str(block, "type") != "server_tool_use" && str(block, "type") != "mcp_tool_use") || ledger.pending[str(block, "id")] == "" {
			return fmt.Errorf("unrecognized interrupted assistant continuation")
		}
	}
	prefix := *r
	prefix.Messages = r.Messages[:len(r.Messages)-1]
	if _, err := alignClientHistory(&prefix, Object{"messages": messages[:len(messages)-1]}); err != nil {
		return fmt.Errorf("interrupted continuation prefix changed: %w", err)
	}
	for _, block := range actual {
		if err := keys(block, "type", "text", "citations", "cache_control"); err != nil {
			return err
		}
		if citations, exists := block["citations"]; exists && citations != nil {
			list, ok := citations.([]any)
			if !ok || len(list) > 0 {
				return fmt.Errorf("unexpected interruption citations")
			}
		}
	}
	last["content"] = expected
	return nil
}

// With retained text/results, CLI 2.1.292 omits unresolved server calls instead
// of inserting the all-tools interruption placeholder. Only a still-pending
// call may be absent; the surrounding history and all retained blocks anchor it.
func (r *Request) restoreMixedPendingContinuation(messages []any, last Object, expected, actual []Object) (bool, error) {
	if str(last, "role") != "assistant" || len(actual) == 0 || len(actual) >= len(expected) {
		return false, nil
	}
	ledger, err := r.serverHistoryLedger()
	if err != nil {
		return false, err
	}
	if len(ledger.pending) == 0 || !plainServerContinuationHistory(r.Messages, ledger.pending) {
		return false, nil
	}
	for _, block := range actual {
		if str(block, "type") == "text" && str(block, "text") == "[Tool use interrupted]" {
			return false, nil
		}
	}
	restored, err := restoreOmittedBlocks(expected, actual, func(block Object) bool {
		return str(block, "type") == "server_tool_use" && ledger.pending[str(block, "id")] != ""
	})
	if err != nil {
		return false, err
	}
	prefix := *r
	prefix.Messages = r.Messages[:len(r.Messages)-1]
	if _, err = alignClientHistory(&prefix, Object{"messages": messages[:len(messages)-1]}); err != nil {
		return false, fmt.Errorf("mixed continuation prefix changed: %w", err)
	}
	last["content"] = restored
	return true, nil
}

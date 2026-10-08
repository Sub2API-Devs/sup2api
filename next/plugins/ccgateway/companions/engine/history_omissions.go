package engine

import (
	"encoding/json"
	"fmt"
)

func advisorHistoryBlock(block Object) bool {
	return str(block, "type") == "advisor_tool_result" || str(block, "type") == "server_tool_use" && str(block, "name") == "advisor"
}

func registeredNativeOmission(block Object) bool {
	return advisorHistoryBlock(block) || str(block, "type") == "mcp_tool_use"
}

// CLI 2.1.292 strips advisor history when its own local advisor is not enabled.
// Restore only those registered blocks from the API history after validating
// every surrounding client turn. Never replace a mismatched ordinary block.
func restoreAdvisorHistory(r *Request, body Object) error {
	needed := false
	for _, message := range r.Messages {
		for _, block := range message.Content {
			needed = needed || registeredNativeOmission(block) || r.ptcHistoryParent(block)
		}
	}
	if !needed {
		return nil
	}
	return restoreAssistantOmissions(r, body, func(block Object) bool { return registeredNativeOmission(block) || r.ptcHistoryParent(block) })
}

func restoreAssistantOmissions(r *Request, body Object, omitted func(Object) bool) error {
	wire, ok := body["messages"].([]any)
	if !ok {
		return fmt.Errorf("protocol history has no outbound messages")
	}
	at := 0
	internalResults := map[string]bool{}
	for clientIndex, want := range r.Messages {
		if want.Role == "system" {
			continue
		}
		expected := r.wireMessage(want).Content
		for at < len(wire) {
			current, ok := wire[at].(map[string]any)
			if !ok {
				return fmt.Errorf("invalid protocol history")
			}
			content, err := historyContent(current["content"])
			if err != nil {
				return err
			}
			if str(current, "role") == "assistant" && internalHistoryAssistant(r, current) {
				for _, block := range content {
					if str(block, "type") == "tool_use" {
						internalResults[str(block, "id")] = true
					}
				}
				at++
				continue
			}
			if str(current, "role") == "system" || str(current, "role") == "user" && onlyInternalResults(content, internalResults) {
				at++
				continue
			}
			break
		}
		if at >= len(wire) {
			return fmt.Errorf("protocol history client turn missing")
		}
		current := wire[at].(map[string]any)
		if want.Role == "user" {
			if parts := splitInlineUserRun(r, clientIndex, current); len(parts) > 1 {
				wire = append(wire[:at], append(parts, wire[at+1:]...)...)
				current = wire[at].(map[string]any)
			}
		}
		actual, err := historyContent(current["content"])
		if err != nil {
			return err
		}
		if str(current, "role") != want.Role {
			return fmt.Errorf("protocol history role changed")
		}
		if want.Role == "user" {
			if _, err := alignUserHistoryBlocks(expected, actual); err != nil {
				return err
			}
		} else {
			restored, err := restoreOmittedBlocks(expected, actual, omitted)
			if err != nil {
				return err
			}
			current["content"] = restored
		}
		at++
	}
	if err := validateInlineTail(r, wire[at:], internalResults); err != nil {
		return err
	}
	body["messages"] = wire
	return nil
}

func restoreOmittedBlocks(expected, actual []Object, omitted func(Object) bool) ([]Object, error) {
	if registeredProtocolPlaceholder(expected, actual, omitted) {
		actual = nil
	}
	out := make([]Object, 0, len(expected))
	at := 0
	for _, want := range expected {
		if at < len(actual) && digest(historySkeleton([]Object{want})) == digest(historySkeleton([]Object{actual[at]})) {
			out = append(out, actual[at])
			at++
			continue
		}
		if !omitted(want) {
			return nil, fmt.Errorf("protocol history changed beyond registered omitted blocks")
		}
		copy, err := jsonCopyObject(want)
		if err != nil {
			return nil, err
		}
		out = append(out, copy)
	}
	if at != len(actual) {
		return nil, fmt.Errorf("protocol history has unexpected retained blocks")
	}
	return out, nil
}

// A completed advisor-only turn has no text anchor: CLI substitutes this exact
// placeholder. The enclosing matcher still verifies its role and every client
// turn. Require locally paired advisor IDs so pending or mixed turns cannot use
// this exception.
func registeredProtocolPlaceholder(expected, actual []Object, omitted func(Object) bool) bool {
	if len(expected) == 0 || len(actual) != 1 || str(actual[0], "type") != "text" {
		return false
	}
	placeholder := str(actual[0], "text")
	if placeholder != "[Advisor response]" && placeholder != "(no content)" {
		return false
	}
	for key, value := range actual[0] {
		if key == "type" || key == "text" {
			continue
		}
		if key != "citations" || digest(value) != digest([]any{}) {
			return false
		}
	}
	ledger := newServerToolLedger()
	hasFallback := false
	for _, block := range expected {
		fallback := str(block, "type") == "fallback"
		if fallback && len(ledger.pending) != 0 {
			return false
		}
		hasFallback = hasFallback || fallback
		if (!advisorHistoryBlock(block) && !fallback) || !omitted(block) || ledger.accept(block, nil, true) != nil {
			return false
		}
	}
	return len(ledger.seen) > 0 && len(ledger.pending) == 0 && hasFallback == (placeholder == "(no content)")
}
func jsonCopyObject(value Object) (Object, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return decodeObject(raw)
}

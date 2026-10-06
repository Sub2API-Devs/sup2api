package main

import "fmt"

// Messages API wording for system message errors; %d is the position in the
// client's messages array. Verified against claude-opus-5-5 on 2026-10-06.
const (
	errSystemFirst   = "messages.%d: use the top-level 'system' parameter for the initial system prompt; the directive-only form (content: [] with output_config) is accepted at any position"
	errSystemFollow  = "messages.%d: role 'system' must follow a 'user' message or an 'assistant' message ending in a server tool result; the directive-only form (content: [] with output_config) is accepted at any position"
	errSystemPrecede = "messages.%d: role 'system' must precede an 'assistant' message or end the array; the directive-only form (content: [] with output_config) is accepted at any position"
	errSystemEmpty   = "messages.%d: system content must contain at least one block"
	errSystemBlock   = "messages.%d: role 'system' supports text, tool_addition, and tool_removal blocks only"
	errSystemContent = "messages.%d.content: Input should be a valid array"
	errTextEmpty     = "messages: text content blocks must be non-empty"
)

// Consecutive system records are one section, constrained by the Messages API:
// after a user turn, and before an assistant turn or at the end. origin maps a
// parsed message to its index in the request; merged user turns keep the first.
func validateSystemPositions(messages []Message, origin []int) error {
	for i := 0; i < len(messages); {
		if messages[i].Role != "system" {
			i++
			continue
		}
		start := i
		for i < len(messages) && messages[i].Role == "system" {
			i++
		}
		switch {
		case start == 0:
			return fmt.Errorf(errSystemFirst, origin[start])
		case messages[start-1].Role != "user":
			return fmt.Errorf(errSystemFollow, origin[start])
		case i < len(messages) && messages[i].Role != "assistant":
			return fmt.Errorf(errSystemPrecede, origin[i-1])
		}
	}
	return nil
}

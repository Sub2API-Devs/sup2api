package main

import "fmt"

// Consecutive system records are one section, constrained by the Messages API:
// after a user turn, and before an assistant turn or at the end.
func validateSystemPositions(messages []Message) error {
	for i := 0; i < len(messages); {
		if messages[i].Role != "system" {
			i++
			continue
		}
		start := i
		for i < len(messages) && messages[i].Role == "system" {
			i++
		}
		if start == 0 || messages[start-1].Role != "user" || (i < len(messages) && messages[i].Role != "assistant") {
			return fmt.Errorf("messages[%d].role: system must follow user and precede assistant or end the array", start)
		}
	}
	return nil
}

package engine

import (
	"encoding/json"
	"fmt"
)

// A leading system belongs to this segment only when the same complete object
// was present at this public boundary before the observed hidden response.
// Systems inside a pair need a separate positional contract; never filter them.
func splitHelperSystems(messages []any) ([]any, []any, error) {
	leading := 0
	for i, raw := range messages {
		message, ok := raw.(Object)
		if !ok || keys(message, "role", "content") != nil {
			return nil, nil, fmt.Errorf("helper history envelope contains unobserved controls")
		}
		if str(message, "role") != "system" {
			continue
		}
		if i != leading {
			return nil, nil, fmt.Errorf("helper history cannot discard an unrecorded system inside hidden rounds")
		}
		if _, err := historyContent(message["content"]); err != nil {
			return nil, nil, err
		}
		leading++
	}
	return messages[:leading], messages[leading:], nil
}

func cloneHelperMessages(messages []any) []any {
	out := make([]any, len(messages))
	for i, m := range messages {
		raw, _ := json.Marshal(m)
		out[i], _ = decodeObject(raw)
	}
	return out
}

func (r *Request) verifyHelperSystemEvidence(messages []any) error {
	systems, _, err := splitHelperSystems(messages)
	if err != nil || len(systems) == 0 {
		return err
	}
	x := r.helperHistory
	if x == nil || !x.systemObserved || !helperSystemsMatchSource(x.systemEvidence, systems) {
		return fmt.Errorf("helper system lacks prior attributed request evidence")
	}
	return nil
}

// This is attribution, not cache equivalence: persist the actual later object.
// CLI moves its own ephemeral marker while collapsing one system text block.
func helperSystemsMatchSource(source, actual []any) bool {
	if len(source) != len(actual) {
		return false
	}
	for i, raw := range source {
		if digest(raw) == digest(actual[i]) {
			continue
		}
		before, ok := raw.(Object)
		if !ok {
			return false
		}
		after, ok := actual[i].(Object)
		if !ok || keys(before, "role", "content") != nil || keys(after, "role", "content") != nil {
			return false
		}
		text, ok := after["content"].(string)
		if !ok {
			return false
		}
		blocks, err := historyContent(before["content"])
		if err != nil || len(blocks) != 1 {
			return false
		}
		block := blocks[0]
		if keys(block, "type", "text", "cache_control") != nil || str(block, "type") != "text" || block["text"] != text {
			return false
		}
		if cache, exists := block["cache_control"]; exists {
			c, ok := cache.(Object)
			if !ok || keys(c, "type", "ttl") != nil || str(c, "type") != "ephemeral" {
				return false
			}
			if ttl, exists := c["ttl"]; exists && ttl != "5m" && ttl != "1h" {
				return false
			}
		}
	}
	return true
}

func matchReplayedHelperSystems(messages []any, publicIndices, skipped map[int]bool, start int, expected []any) error {
	actual := 0
	for at := start; at < len(messages) && !publicIndices[at]; at++ {
		m, _ := messages[at].(Object)
		if str(m, "role") != "system" {
			break
		}
		actual++
	}
	if actual == 0 {
		return nil
	}
	if actual != len(expected) {
		return fmt.Errorf("replayed helper system count differs at original boundary")
	}
	for j, want := range expected {
		at := start + j
		if digest(messages[at]) != digest(want) || skipped[at] {
			return fmt.Errorf("replayed helper system differs at original boundary")
		}
	}
	for j := range expected {
		skipped[start+j] = true
	}
	return nil
}

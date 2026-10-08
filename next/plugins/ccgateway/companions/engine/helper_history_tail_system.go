package engine

import (
	"encoding/json"
	"fmt"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

// The authenticated Mod reports only kept engine attachments, during an active
// main lease. The index counts complete raw provider responses, not text matches.
func (c *modControl) acknowledgeHelperReminder(raw json.RawMessage) bool {
	r := c.helperRequest
	if r == nil || r.helperHistory == nil || r.internalCache == nil || c.scope == nil {
		return false
	}
	obj, err := decodeObject(raw)
	if err != nil || keys(obj, "text") != nil {
		return false
	}
	var detail struct {
		Text string `json:"text"`
	}
	if json.Unmarshal(raw, &detail) != nil || detail.Text == "" || len(detail.Text) > 64<<10 {
		return false
	}
	c.scope.mu.Lock()
	active := c.scope.active && c.scope.failure == nil
	c.scope.mu.Unlock()
	if !active {
		return false
	}
	r.internalCache.mu.Lock()
	round, failed := len(r.internalCache.rounds), r.internalCache.failed
	r.internalCache.mu.Unlock()
	if failed || round > maxInternalCacheRounds {
		return false
	}
	x := r.helperHistory
	x.mu.Lock()
	defer x.mu.Unlock()
	if x.reminders == nil {
		x.reminders = map[int]string{}
	}
	if previous, ok := x.reminders[round]; ok && previous != detail.Text {
		return false
	}
	x.reminders[round] = detail.Text
	return true
}

// Build a validation-only view. Actual messages are never filtered or rewritten.
// Only v2 can persist systems between complete helper pairs.
func (r *Request) helperTailSystemView(messages []any) ([]any, map[int][]any, error) {
	leading := helperLeadingSystems(messages)
	flat := append([]any(nil), leading...)
	tails := map[int][]any{}
	pairs := 0
	for _, raw := range messages[len(leading):] {
		m, ok := raw.(Object)
		if !ok || keys(m, "role", "content") != nil {
			return nil, nil, fmt.Errorf("helper history envelope contains unobserved controls")
		}
		if str(m, "role") != "system" {
			flat = append(flat, raw)
			pairs++
			continue
		}
		x := r.helperHistory
		if x.payloadVersion != helperhistory.PayloadVersion2 || pairs == 0 || pairs%2 != 0 {
			return nil, nil, fmt.Errorf("helper history cannot discard an unrecorded system inside hidden rounds")
		}
		at := pairs / 2
		if len(tails[at]) != 0 {
			return nil, nil, fmt.Errorf("multiple helper reminders at one hidden boundary")
		}
		if old := x.tailSystems[at]; len(old) > 0 {
			if !helperSystemsMatchSource(old, []any{raw}) {
				return nil, nil, fmt.Errorf("helper reminder changed at hidden boundary")
			}
		} else if !helperReminderSystemMatches(m, x.reminders[at]) {
			return nil, nil, fmt.Errorf("helper system lacks attributed attachment evidence")
		}
		tails[at] = []any{raw}
	}
	for at := range r.helperHistory.tailSystems {
		if len(tails[at]) == 0 {
			return nil, nil, fmt.Errorf("helper reminder disappeared from hidden boundary")
		}
	}
	return flat, tails, nil
}

func helperReminderSystemMatches(m Object, text string) bool {
	if text == "" {
		return false
	}
	blocks, err := historyContent(m["content"])
	if err != nil || len(blocks) != 1 {
		return false
	}
	b := blocks[0]
	if keys(b, "type", "text", "cache_control") != nil || str(b, "type") != "text" || str(b, "text") != text {
		return false
	}
	if cache, exists := b["cache_control"]; exists {
		c, ok := cache.(Object)
		if !ok || keys(c, "type", "ttl") != nil || str(c, "type") != "ephemeral" {
			return false
		}
		if ttl, exists := c["ttl"]; exists && ttl != "1h" && ttl != "5m" {
			return false
		}
	}
	return true
}

func (r *Request) helperTailSegments(base helperhistory.Segment, messages []any, tails map[int][]any) ([]helperhistory.Segment, error) {
	if len(tails) == 0 {
		return []helperhistory.Segment{base}, nil
	}
	var segments []helperhistory.Segment
	current := base
	current.Messages = nil
	flush := func() {
		if len(current.Messages) > 0 {
			segments = append(segments, current)
			current = base
			current.Messages = nil
		}
	}
	leading := len(helperLeadingSystems(messages))
	for i, raw := range messages {
		m := raw.(Object)
		if i >= leading && str(m, "role") == "system" {
			flush()
			segment, err := helperSystemSegment(r.helperHistory.public, r.helperHistory.tools, base.AfterMessage, []any{raw})
			if err != nil {
				return nil, err
			}
			segments = append(segments, segment)
			continue
		}
		encoded, err := json.Marshal(raw)
		if err != nil {
			return nil, err
		}
		current.Messages = append(current.Messages, encoded)
	}
	flush()
	return segments, nil
}

// The caller validates each persisted segment before grouping it. Only the
// leading systems of the complete group can coincide with the current CLI
// boundary; systems after a hidden pair retain their distinct position.
func helperLeadingSystems(messages []any) []any {
	for i, raw := range messages {
		message, _ := raw.(Object)
		if str(message, "role") != "system" {
			return messages[:i]
		}
	}
	return messages
}

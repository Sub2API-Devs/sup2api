package engine

import "encoding/json"

// Only the runtime continuation input may discard its duplicate status reminder.
// Original client text never supplies native attachment provenance.
func nativeContinuationReminders(req *Request, p *Prepared) map[string]int {
	out := map[string]int{}
	if p == nil || req.continuation == "" {
		return out
	}
	var users []Message
	for _, m := range req.Messages {
		if m.Role == "user" {
			users = append(users, m)
		}
	}
	ordinal := -1
	activeUser := false
	for _, raw := range p.Rows {
		row, err := decodeObject(raw)
		if err != nil {
			return nil
		}
		switch str(row, "type") {
		case "user":
			activeUser = true
			ordinal++
			if ordinal >= len(users) {
				return nil
			}
			message, _ := row["message"].(Object)
			blocks, err := historyContent(message["content"])
			if err != nil || digest(historySkeleton(blocks)) != digest(historySkeleton(req.cliWireMessage(users[ordinal]).Content)) {
				return nil
			}
		case "assistant":
			activeUser = false
		case "attachment":
			attachment, _ := row["attachment"].(Object)
			if activeUser && ordinal >= 0 && str(attachment, "type") == "total_tokens_reminder" {
				text := str(attachment, "text")
				if text != "" && len(text) <= 4096 {
					out[text] = ordinal
				}
			}
		}
	}
	return out
}

func (c *modControl) acknowledgeContinuationReminder(raw json.RawMessage) bool {
	obj, err := decodeObject(raw)
	if err != nil || keys(obj, "text") != nil {
		return false
	}
	var detail struct {
		Text string `json:"text"`
	}
	if json.Unmarshal(raw, &detail) != nil || detail.Text == "" || len(detail.Text) > 4096 {
		return false
	}
	if c.reminderAcks == nil {
		c.reminderAcks = map[string]int{}
	}
	if len(c.reminderAcks) >= 32 && c.reminderAcks[detail.Text] == 0 {
		return false
	}
	if c.reminderAcks[detail.Text] < 2 {
		c.reminderAcks[detail.Text]++
	}
	return true
}

func exactReminderBlock(block Object, text string) bool {
	if len(block) != 2 || str(block, "type") != "text" {
		return false
	}
	wrapped := "<system-reminder>\n" + text + "\n</system-reminder>"
	actual := str(block, "text")
	return actual == wrapped || actual == wrapped+"\n"
}

func (r *Request) duplicateTransportReminder(messages []any, block Object, c *modControl) bool {
	if c == nil || r.continuation == "" || len(messages) < 2 || len(r.Messages) == 0 {
		return false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.ready || c.reminderMarker != r.continuation {
		return false
	}
	// The final transport frame is excluded from the native user ordinal.
	var actualUsers [][]Object
	for _, raw := range messages[:len(messages)-1] {
		message, ok := raw.(Object)
		if !ok {
			return false
		}
		if str(message, "role") != "user" {
			continue
		}
		blocks, err := historyContent(message["content"])
		if err != nil {
			return false
		}
		actualUsers = append(actualUsers, blocks)
	}
	var clientUsers [][]Object
	for _, message := range r.Messages {
		if message.Role == "user" {
			clientUsers = append(clientUsers, message.Content)
		}
	}
	for text, ordinal := range c.nativeReminders {
		if c.reminderAcks[text] < 2 || !exactReminderBlock(block, text) || ordinal < 0 || ordinal >= len(actualUsers) || ordinal >= len(clientUsers) {
			continue
		}
		if containsReminder(actualUsers[ordinal], text) && !containsReminder(clientUsers[ordinal], text) {
			return true
		}
	}

	return false
}

func containsReminder(blocks []Object, text string) bool {
	for _, block := range blocks {
		if exactReminderBlock(block, text) {
			return true
		}
	}
	return false
}

package engine

import (
	"encoding/json"
	"time"
)

// PromptEvidence belongs to one committed client-history checkpoint. Its TTL
// does not shorten the lifetime of the native conversation itself.
type PromptEvidence struct {
	SystemDigest string    `json:"system_digest"`
	Expires      time.Time `json:"expires"`
}

// Compare the explicit native snapshot field, never rendered upstream messages:
// those also contain CLI-owned context. Unknown or conflicting snapshots fail
// closed; a recent request cannot override an existing, different snapshot.
func choosePromptSnapshot(rows []json.RawMessage, evidence *PromptEvidence, system []string, now time.Time) bool {
	want := digest(system)
	found := false
	for _, row := range rows {
		var record struct {
			Type       string                     `json:"type"`
			Attachment map[string]json.RawMessage `json:"attachment"`
		}
		if json.Unmarshal(row, &record) != nil {
			return false
		}
		if record.Type != "attachment" {
			continue
		}
		var kind string
		if raw, ok := record.Attachment["type"]; ok {
			if json.Unmarshal(raw, &kind) != nil {
				return false
			}
		}
		if kind != "prompt_snapshot" {
			continue
		}
		found = true
		// CLI 2.1.288 can restore an obsolete MCP schema from a snapshot with
		// tools, even when initialize supplies the current tool definitions.
		if _, hasTools := record.Attachment["tools"]; hasTools {
			return false
		}
		var saved []string
		if json.Unmarshal(record.Attachment["systemPrompt"], &saved) != nil || saved == nil || digest(saved) != want {
			return false
		}
	}
	if found {
		return true
	}
	return evidence != nil && now.Before(evidence.Expires) && evidence.SystemDigest == want
}

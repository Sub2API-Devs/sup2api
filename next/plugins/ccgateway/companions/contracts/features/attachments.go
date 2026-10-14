package features

import "fmt"

// ErasableClientAttachments is the vocabulary of policy erase_client_attachments,
// in display order: client attachment types the Worker may erase from a
// request before admission (engine client_attachment_erase.go).
var ErasableClientAttachments = []string{"environment", "model", "date", "total_tokens_reminder", "session_context"}

// ValidateEraseClientAttachments accepts each listed type once; empty keeps
// every client attachment as sent.
func ValidateEraseClientAttachments(types []string) error {
	seen := map[string]bool{}
	for _, typ := range types {
		known := false
		for _, name := range ErasableClientAttachments {
			known = known || name == typ
		}
		if !known || seen[typ] {
			return fmt.Errorf("invalid erase_client_attachments: %q", typ)
		}
		seen[typ] = true
	}
	return nil
}

// ReplaceableClientAttachments is the vocabulary of policy
// replace_client_attachments, in display order: client attachment types the
// Worker replaces in place with Claude Code's own rendering of the Worker
// (engine gateway_attachments.go). Every erasable type: one the Worker's
// Claude Code does not render (a session context without CLAUDE.md, git or
// account email) is then removed, as it is absent on the Worker.
var ReplaceableClientAttachments = []string{"environment", "model", "date", "total_tokens_reminder", "session_context"}

// ValidateReplaceClientAttachments accepts each listed type once and none
// that is also erased; empty keeps every client attachment as sent.
func ValidateReplaceClientAttachments(types, erased []string) error {
	seen := map[string]bool{}
	for _, typ := range types {
		known := false
		for _, name := range ReplaceableClientAttachments {
			known = known || name == typ
		}
		for _, name := range erased {
			known = known && name != typ
		}
		if !known || seen[typ] {
			return fmt.Errorf("invalid replace_client_attachments: %q", typ)
		}
		seen[typ] = true
	}
	return nil
}

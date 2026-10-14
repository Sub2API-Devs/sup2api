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

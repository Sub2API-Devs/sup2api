package features

import (
	"fmt"
	"slices"
)

// ErasableClientAttachments is the vocabulary of policy erase_client_attachments,
// including the historical whole environment: types the Worker may erase from a
// request before admission (engine client_attachment_erase.go).
var ErasableClientAttachments = []string{"environment", "model", "date", "total_tokens_reminder", "session_context", "working_directory", "platform", "environment_update",
	"primary_directory", "additional_directories", "git_repository", "platform_name", "shell", "os_version",
	"model_name", "model_id", "knowledge_cutoff", "model_other", "current_date", "date_change",
	"claude_md", "git_status", "user_email", "session_other"}

// AttachmentChildren defines the policy hierarchy. Whole attachments remain
// valid for saved policies and for applying one choice to a complete group.
var AttachmentChildren = map[string][]string{
	"environment":       {"working_directory", "platform", "environment_update"},
	"working_directory": {"primary_directory", "additional_directories", "git_repository"},
	"platform":          {"platform_name", "shell", "os_version"},
	"model":             {"model_name", "model_id", "knowledge_cutoff", "model_other"},
	"date":              {"current_date", "date_change"},
	"session_context":   {"claude_md", "git_status", "user_email", "session_other"},
}

// AttachmentContains includes equality and all descendant fields.
func AttachmentContains(parent, child string) bool {
	if parent == child {
		return true
	}
	return slices.ContainsFunc(AttachmentChildren[parent], func(name string) bool {
		return AttachmentContains(name, child)
	})
}

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
// replace_client_attachments: client attachment types the
// Worker replaces in place with Claude Code's own rendering of the Worker
// (engine gateway_attachments.go). Every erasable type: one the Worker's
// Claude Code does not render (a session context without CLAUDE.md, git or
// account email) is then removed, as it is absent on the Worker.
var ReplaceableClientAttachments = ErasableClientAttachments

func attachmentsOverlap(a, b string) bool {
	return AttachmentContains(a, b) || AttachmentContains(b, a)
}

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
			known = known && !attachmentsOverlap(name, typ)
		}
		if !known || seen[typ] {
			return fmt.Errorf("invalid replace_client_attachments: %q", typ)
		}
		seen[typ] = true
	}
	return nil
}

package features

import (
	"fmt"
	"slices"
)

const BuildAttachmentCapability = "build_attachment_sources_v1"
const BuildAttachmentCapabilityV2 = "build_attachment_sources_v2"
const BuildBillingCapability = "build_billing_sources_v1"
const BuildContentPreservationCapability = "build_content_preservation_v1"
const RequestPolicyModeCapability = "request_policy_mode_v1"

var BuildAttachmentFields = []string{"platform_name", "os_version", "shell", "primary_directory", "additional_directories", "git_repository", "worktree", "scratchpad_directory", "github_cli", "agent_proxy"}

// BuildBillingFields are the billing header fields BuildBillingSources sets.
var BuildBillingFields = []string{"cc_version", "cc_entrypoint"}

// BuildAttachmentSources is deliberately separate from the retired agent
// policy: upgrading a Worker must not activate old saved erase/replace rules.
// Missing fields keep the client's text. Extended fields and erasure require
// the versioned CLI content adapter, which applies every source: the Worker
// never rewrites the content itself.
type BuildAttachmentSources map[string]string

func (p BuildAttachmentSources) Validate() error {
	for field, source := range p {
		if !slices.Contains(BuildAttachmentFields, field) || (source != "client" && source != "worker" && source != "erase") {
			return fmt.Errorf("invalid build_attachment_sources: %s=%s", field, source)
		}
	}
	return nil
}

func (p BuildAttachmentSources) RequiresV2() bool {
	for field, source := range p {
		if source != "client" && (source == "erase" || field != "platform_name" && field != "os_version") {
			return true
		}
	}
	return false
}

type BuildBillingSources map[string]string

func (p BuildBillingSources) Validate() error {
	for field, source := range p {
		if !slices.Contains(BuildBillingFields, field) || (source != "client" && source != "worker") {
			return fmt.Errorf("invalid build_billing_sources: %s=%s", field, source)
		}
	}
	return nil
}

func (p BuildBillingSources) UsesWorker() bool {
	for _, source := range p {
		if source == "worker" {
			return true
		}
	}
	return false
}

func (p BuildAttachmentSources) UsesWorker() bool {
	for _, source := range p {
		if source == "worker" {
			return true
		}
	}
	return false
}

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

// attachmentContains includes equality and all descendant fields.
func attachmentContains(parent, child string) bool {
	if parent == child {
		return true
	}
	return slices.ContainsFunc(AttachmentChildren[parent], func(name string) bool {
		return attachmentContains(name, child)
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
	return attachmentContains(a, b) || attachmentContains(b, a)
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

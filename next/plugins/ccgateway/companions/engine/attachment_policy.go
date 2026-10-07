package engine

import (
	"fmt"
	"regexp"
	"strings"
)

var attachmentTypes = map[string]bool{"environment": true, "model": true, "total_tokens_reminder": true, "session_context": true, "date": true}

func validateAttachmentPolicy(p RequestPolicy) error {
	for k, v := range p.EnvironmentFields {
		if (k != "workingDirectory" && k != "platform") || (v != "client" && v != "gateway") {
			return fmt.Errorf("invalid environment field policy: %s", k)
		}
	}
	for k, v := range p.AttachmentSources {
		if !attachmentTypes[k] || (v != "client" && v != "gateway" && v != "both") {
			return fmt.Errorf("invalid attachment source override: %s", k)
		}
	}
	for _, v := range []string{p.UnknownClientAttachment, p.UnknownGatewayAttachment} {
		if v != "" && v != "pass" && v != "ignore" {
			return fmt.Errorf("invalid unknown attachment policy")
		}
	}
	return nil
}

// Only an explicit, whole-block envelope identifies a client attachment.
// Ordinary system text and malformed/ambiguous envelopes are never discarded.
var clientAttachment = regexp.MustCompile(`(?s)^<ccgateway-attachment type="([a-z][a-z0-9_]{0,63})">(.*)</ccgateway-attachment>$`)

func (r *Request) keepClientAttachment(text string) (keep bool) {
	match := clientAttachment.FindStringSubmatch(strings.TrimSpace(text))
	if match == nil || strings.Contains(match[2], "<ccgateway-attachment") {
		return true
	}
	typ := match[1]
	defer func() {
		decision := "keep"
		if !keep {
			decision = "drop"
		}
		r.AttachmentDecisions = append(r.AttachmentDecisions, Object{"source": "client", "type": typ, "recognition": "explicit_envelope", "decision": decision, "text_digest": digest(text)})
	}()
	if typ == "hook_additional_context" || typ == "deferred_tools_delta" {
		return true
	}
	if !attachmentTypes[typ] {
		return r.UnknownClientAttachment != "ignore"
	}
	// Field overrides take precedence over the whole environment envelope.
	if typ == "environment" {
		for _, line := range strings.Split(strings.ReplaceAll(match[2], "\r\n", "\n"), "\n") {
			if (r.EnvironmentFields["workingDirectory"] == "client" && environmentDirectory.MatchString(line)) ||
				(r.EnvironmentFields["platform"] == "client" && environmentPlatform.MatchString(line)) {
				return true
			}
		}
	}
	source := r.AttachmentSources[typ]
	if source == "" {
		source = r.AttachmentSource
	}
	return source != "gateway"
}
func (r *Request) filterClientAttachments() {
	systems := make([]string, 0, len(r.System))
	for _, text := range r.System {
		text = r.filterClientEnvironment(text)
		if strings.TrimSpace(text) != "" && r.keepClientAttachment(text) {
			systems = append(systems, text)
		}
	}
	r.System = systems
	messages := make([]Message, 0, len(r.Messages))
	origins := make([]int, 0, len(r.origin))
	for i, m := range r.Messages {
		if m.Role == "system" {
			blocks := make([]Object, 0, len(m.Content))
			for _, b := range m.Content {
				if str(b, "type") != "text" {
					blocks = append(blocks, b)
					continue
				}
				text := r.filterClientEnvironment(str(b, "text"))
				if strings.TrimSpace(text) != "" && r.keepClientAttachment(text) {
					b["text"] = text
					blocks = append(blocks, b)
				}
			}
			m.Content = blocks
			if len(blocks) == 0 && !m.directiveOnly() {
				continue
			}
		}
		messages = append(messages, m)
		if i < len(r.origin) {
			origins = append(origins, r.origin[i])
		}
	}
	r.Messages = messages
	r.origin = origins
}
func (r *Request) attachmentConfig() Object {
	return Object{"client_environment_fields": r.ClientEnvironmentFields, "environment_fields": r.EnvironmentFields, "default_source": r.AttachmentSource, "sources": r.AttachmentSources, "unknown_client": r.UnknownClientAttachment, "unknown_gateway": r.UnknownGatewayAttachment}
}

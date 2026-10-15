package engine

import (
	"regexp"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

type attachmentPart struct{ kind, text string }

func appendAttachmentPart(parts []attachmentPart, kind, text string) []attachmentPart {
	if len(parts) > 0 && parts[len(parts)-1].kind == kind {
		parts[len(parts)-1].text += text
		return parts
	}
	return append(parts, attachmentPart{kind, text})
}

// Parent choices win over redundant same-action descendants in old policies.
func (x *clientAttachmentEraser) selectedType(kind string) string {
	for _, typ := range features.ErasableClientAttachments {
		if !features.AttachmentContains(typ, kind) {
			continue
		}
		if x.isErased(typ) {
			return typ
		}
		if _, ok := x.replace[typ]; ok {
			return typ
		}
	}
	return ""
}

func (x *clientAttachmentEraser) isErased(typ string) bool {
	for _, name := range x.types {
		if name == typ {
			return true
		}
	}
	return false
}

func (x *clientAttachmentEraser) hasDescendants(parent string) bool {
	for _, typ := range features.ErasableClientAttachments {
		if typ != parent && features.AttachmentContains(parent, typ) && x.selectedType(typ) != "" {
			return true
		}
	}
	return false
}

// Shared by environment lines, model sentences and session sections. A group
// replacement is inserted once, where its first selected child appeared.
func (x *clientAttachmentEraser) rewriteParts(original string, parts []attachmentPart, where string) string {
	var out strings.Builder
	handled := map[string]bool{}
	for _, part := range parts {
		typ := x.selectedType(part.kind)
		if typ == "" {
			out.WriteString(part.text)
			continue
		}
		if handled[typ] {
			continue
		}
		handled[typ] = true
		if x.isErased(typ) {
			continue
		}
		replacement := x.replace[typ]
		if replacement == "" {
			continue
		}
		eol := "\n"
		if strings.Contains(original, "\r\n") {
			eol = "\r\n"
		}
		replacement = strings.ReplaceAll(strings.ReplaceAll(replacement, "\r\n", "\n"), "\n", eol)
		out.WriteString(strings.TrimRight(replacement, "\r\n"))
		if strings.HasSuffix(part.text, "\n") {
			out.WriteString(eol)
		}
	}
	result := out.String()
	var before strings.Builder
	for _, part := range parts {
		before.WriteString(part.text)
	}
	if result == before.String() {
		return result
	}
	for _, typ := range features.ErasableClientAttachments {
		if !handled[typ] {
			continue
		}
		action := "replace_gateway"
		if x.isErased(typ) {
			action = "erase"
		}
		x.decisions = append(x.decisions, Object{"source": "client", "type": typ, "where": where, "recognition": "claude_code_render", "decision": action, "count": 1, "text_digest": digest(original)})
	}
	return result
}

var modelFields = regexp.MustCompile(`^(You are powered by the model .+?\.)( +The exact model ID is .+?\.)( +Assistant knowledge cutoff is .+?\.)([^\r\n]*)(\r?)$`)

func modelParts(text string) []attachmentPart {
	m := modelFields.FindStringSubmatch(text)
	if m == nil {
		return []attachmentPart{{"model_other", text}}
	}
	return []attachmentPart{{"model_name", m[1]}, {"model_id", m[2]}, {"knowledge_cutoff", m[3]}, {"model_other", m[4] + m[5]}}
}

const sessionIntro = "<system-reminder>\nAs you answer the user's questions, you can use the following context:\n"
const sessionFooter = "      Claude Code attached this context automatically; it isn't part of the user's message. It describes the user's own account and workspace, so they don't need it reported back.\n"

func codeFence(value string) string {
	if value == "" || value[0] != '`' && value[0] != '~' {
		return ""
	}
	n := len(value) - len(strings.TrimLeft(value, value[:1]))
	if n < 3 {
		return ""
	}
	return value[:n]
}

// Only CC's named section markers are boundaries. Arbitrary Markdown headings
// in CLAUDE.md and markers inside fenced code remain part of their section.
func sessionParts(text string) (prefix string, parts []attachmentPart, suffix string) {
	eol := "\n"
	if strings.Contains(text, "\r\n") {
		eol = "\r\n"
	}
	prefix = strings.ReplaceAll(sessionIntro, "\n", eol)
	suffix = "</system-reminder>"
	body := strings.TrimSuffix(strings.TrimPrefix(text, prefix), suffix)
	footer := strings.ReplaceAll(sessionFooter, "\n", eol)
	if strings.HasSuffix(body, footer) {
		body = strings.TrimSuffix(body, footer)
		suffix = footer + suffix
	}
	kind, fence := "session_other", ""
	for _, line := range strings.SplitAfter(body, "\n") {
		value := strings.TrimSpace(line)
		if mark := codeFence(value); mark != "" {
			if fence == "" {
				fence = mark
			} else if mark[0] == fence[0] && len(mark) >= len(fence) && strings.TrimSpace(strings.TrimPrefix(value, mark)) == "" {
				fence = ""
			}
		} else if fence == "" {
			switch strings.TrimRight(line, "\r\n") {
			case "# claudeMd":
				kind = "claude_md"
			case "# gitStatus":
				kind = "git_status"
			case "# userEmail":
				kind = "user_email"
			case "# currentDate":
				kind = "session_other"
			}
		}
		parts = appendAttachmentPart(parts, kind, line)
	}
	return
}

func (x *clientAttachmentEraser) structuredParts(text, where string) string {
	text = x.environmentParts(text, where)
	if x.selectedType("model") == "" && x.hasDescendants("model") {
		text = clientAttachmentPatterns["model"][0].ReplaceAllStringFunc(text, func(section string) string {
			return strings.TrimLeft(x.rewriteParts(section, modelParts(section), where), " ")
		})
	}
	if x.selectedType("session_context") == "" && x.hasDescendants("session_context") {
		text = clientAttachmentPatterns["session_context"][0].ReplaceAllStringFunc(text, func(section string) string {
			prefix, parts, suffix := sessionParts(section)
			body := x.rewriteParts(section, parts, where)
			if strings.TrimSpace(body) == "" {
				return ""
			}
			return prefix + body + suffix
		})
	}
	return text
}

func attachmentRendering(texts map[string]string, typ string) (string, bool) {
	if text, ok := texts[typ]; ok {
		return text, true
	}
	for _, parent := range []string{"environment", "model", "session_context", "date"} {
		if !features.AttachmentContains(parent, typ) {
			continue
		}
		text, ok := texts[parent]
		if !ok {
			return "", false
		}
		var parts []attachmentPart
		switch parent {
		case "environment":
			parts = environmentParts(environmentSection.FindString(text))
		case "model":
			parts = modelParts(text)
		case "session_context":
			_, parts, _ = sessionParts(clientAttachmentPatterns[parent][0].FindString(text))
		case "date":
			if typ == "current_date" {
				return text, true
			}
			return "", true // A rendering run has no date change.
		}
		var selected strings.Builder
		for _, part := range parts {
			if features.AttachmentContains(typ, part.kind) {
				selected.WriteString(part.text)
			}
		}
		return strings.TrimRight(selected.String(), "\r\n"), true
	}
	return "", false
}

package engine

import (
	"slices"
	"strings"
)

// Split only the recognized Claude Code Environment block. Unknown bullets
// remain client text; directory lists travel with their heading, not platform.
func environmentLineKinds(lines []string) []string {
	kinds := make([]string, len(lines))
	additionalIndent := -1
	for i, line := range lines {
		indent := len(line) - len(strings.TrimLeft(line, " \t"))
		if additionalIndent >= 0 && indent > additionalIndent {
			kinds[i] = "working_directory"
			continue
		}
		additionalIndent = -1
		value := strings.TrimSpace(line)
		switch {
		case strings.HasPrefix(value, "- Primary working directory:"), strings.HasPrefix(value, "- Is a git repository:"):
			kinds[i] = "working_directory"
		case strings.HasPrefix(value, "- Additional working directories:"):
			kinds[i], additionalIndent = "working_directory", indent
		case strings.HasPrefix(value, "- Platform:"), strings.HasPrefix(value, "- Shell:"), strings.HasPrefix(value, "- OS Version:"):
			kinds[i] = "platform"
		}
	}
	return kinds
}

func attachmentRendering(texts map[string]string, typ string) (string, bool) {
	if value, ok := texts[typ]; ok {
		return value, true
	}
	if typ != "working_directory" && typ != "platform" {
		return "", false
	}
	environment, ok := texts["environment"]
	if !ok {
		return "", false
	}
	lines := strings.Split(strings.TrimRight(strings.ReplaceAll(environmentSection.FindString(environment), "\r\n", "\n"), "\n"), "\n")
	kinds := environmentLineKinds(lines)
	selected := []string{}
	for i, line := range lines {
		if kinds[i] == typ {
			selected = append(selected, line)
		}
	}
	return strings.Join(selected, "\n"), true
}

func (x *clientAttachmentEraser) environmentParts(text, where string) string {
	// Old whole-environment policies retain their exact behavior.
	_, whole := x.replace["environment"]
	if whole || slices.Contains(x.types, "environment") {
		return text
	}
	_, directory := x.replace["working_directory"]
	_, platform := x.replace["platform"]
	if !directory && !platform && !slices.Contains(x.types, "working_directory") && !slices.Contains(x.types, "platform") {
		return text
	}
	return environmentSection.ReplaceAllStringFunc(text, func(section string) string {
		eol := "\n"
		if strings.Contains(section, "\r\n") {
			eol = "\r\n"
		}
		lines := strings.Split(strings.TrimSuffix(section, eol), eol)
		kinds := environmentLineKinds(lines)
		out := []string{}
		handled := map[string]bool{}
		changed := map[string]string{}
		for i, line := range lines {
			typ := kinds[i]
			if typ == "" {
				out = append(out, line)
				continue
			}
			if slices.Contains(x.types, typ) {
				changed[typ] = "erase"
				continue
			}
			replacement, replace := x.replace[typ]
			if !replace {
				out = append(out, line)
				continue
			}
			changed[typ] = "replace_gateway"
			if !handled[typ] && replacement != "" {
				out = append(out, strings.Split(strings.TrimRight(strings.ReplaceAll(replacement, "\r\n", "\n"), "\n"), "\n")...)
			}
			handled[typ] = true
		}
		if len(changed) == 0 {
			return section
		}
		result := ""
		if len(out) > 2 {
			result = strings.Join(out, eol)
			if strings.HasSuffix(section, eol) {
				result += eol
			}
		}
		if result != section {
			for _, typ := range []string{"working_directory", "platform"} {
				if action := changed[typ]; action != "" {
					x.decisions = append(x.decisions, Object{"source": "client", "type": typ, "where": where, "recognition": "claude_code_render", "decision": action, "count": 1, "text_digest": digest(section)})
				}
			}
		}
		return result
	})
}

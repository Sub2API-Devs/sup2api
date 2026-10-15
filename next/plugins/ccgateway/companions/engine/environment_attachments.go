package engine

import "strings"

// Fields are recognized only inside Claude Code's Environment block.
func environmentLineKinds(lines []string) []string {
	kinds := make([]string, len(lines))
	additionalIndent := -1
	for i, line := range lines {
		indent := len(line) - len(strings.TrimLeft(line, " \t"))
		if additionalIndent >= 0 && indent > additionalIndent {
			kinds[i] = "additional_directories"
			continue
		}
		additionalIndent = -1
		switch value := strings.TrimSpace(line); {
		case strings.HasPrefix(value, "- Primary working directory:"):
			kinds[i] = "primary_directory"
		case strings.HasPrefix(value, "- Is a git repository:"):
			kinds[i] = "git_repository"
		case strings.HasPrefix(value, "- Additional working directories:"):
			kinds[i], additionalIndent = "additional_directories", indent
		case strings.HasPrefix(value, "- Platform:"):
			kinds[i] = "platform_name"
		case strings.HasPrefix(value, "- Shell:"):
			kinds[i] = "shell"
		case strings.HasPrefix(value, "- OS Version:"):
			kinds[i] = "os_version"
		}
	}
	return kinds
}

func environmentParts(section string) []attachmentPart {
	lines := strings.SplitAfter(section, "\n")
	kinds := environmentLineKinds(lines)
	var parts []attachmentPart
	for i, line := range lines {
		parts = appendAttachmentPart(parts, kinds[i], line)
	}
	return parts
}

func (x *clientAttachmentEraser) environmentParts(text, where string) string {
	if x.selectedType("environment") != "" || !x.hasDescendants("environment") {
		return text
	}
	return environmentSection.ReplaceAllStringFunc(text, func(section string) string {
		lines := strings.SplitAfter(section, "\n")
		if len(lines) < 3 {
			return section
		}
		body := x.rewriteParts(section, environmentParts(strings.Join(lines[2:], "")), where)
		if strings.TrimSpace(body) == "" {
			return ""
		}
		return lines[0] + lines[1] + body
	})
}

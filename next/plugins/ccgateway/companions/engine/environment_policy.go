package engine

import (
	"regexp"
	"strings"
)

// Match only Claude Code's environment section, never arbitrary cwd mentions.
// The bullet block has stable English labels in verified win32/linux clients.
var environmentSection = regexp.MustCompile(`(?m)^# Environment\r?\nYou have been invoked in the following environment:[ \t]*\r?\n(?:[ \t]+-[^\r\n]*(?:\r?\n|$))+`)
var environmentDirectory = regexp.MustCompile(`^[ \t]*- Primary working directory: (.+)$`)
var environmentPlatform = regexp.MustCompile(`^[ \t]*- Platform: (linux|win32)$`)

func (r *Request) filterClientEnvironment(text string) string {
	source := r.AttachmentSources["environment"]
	if source == "" {
		source = r.AttachmentSource
	}
	keepDefault := source != "gateway"
	return environmentSection.ReplaceAllStringFunc(text, func(section string) string {
		lines := strings.Split(strings.TrimSuffix(strings.ReplaceAll(section, "\r\n", "\n"), "\n"), "\n")
		cwd, platform := 0, 0
		for _, line := range lines[2:] {
			if environmentDirectory.MatchString(line) {
				cwd++
			}
			if environmentPlatform.MatchString(line) {
				platform++
			}
		}
		if cwd != 1 || platform != 1 {
			return section
		}
		if r.ClientEnvironmentFields == nil {
			r.ClientEnvironmentFields = map[string]bool{}
		}
		r.ClientEnvironmentFields["workingDirectory"] = true
		r.ClientEnvironmentFields["platform"] = true
		result := append([]string(nil), lines[:2]...)
		changed := false
		for _, line := range lines[2:] {
			field := ""
			if environmentDirectory.MatchString(line) {
				field = "workingDirectory"
			}
			if environmentPlatform.MatchString(line) {
				field = "platform"
			}
			keep := keepDefault
			if override := r.EnvironmentFields[field]; field != "" && override != "" {
				keep = override == "client"
			}
			if keep {
				result = append(result, line)
			} else {
				changed = true
			}
		}
		if !changed {
			return section
		}
		r.AttachmentDecisions = append(r.AttachmentDecisions, Object{"type": "environment", "source": "client", "recognition": "claude_environment_win32_linux", "decision": "filter_fields", "fields": r.EnvironmentFields, "text_digest": digest(section)})
		if len(result) == 2 {
			return ""
		}
		out := strings.Join(result, "\n")
		if strings.HasSuffix(section, "\n") {
			out += "\n"
		}
		return out
	})
}

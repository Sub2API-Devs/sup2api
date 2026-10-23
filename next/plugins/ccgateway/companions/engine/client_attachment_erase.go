package engine

import (
	"regexp"
)

// Client attachments the policy may erase, recognized by the text Claude Code
// renders for them (CLI 2.1.288–2.1.296). Each pattern covers a whole
// paragraph or line, never a mention inside other text.
var clientAttachmentPatterns = map[string][]*regexp.Regexp{
	"environment": {
		environmentSection,
		regexp.MustCompile(`(?m)^# Environment update\r?\n(?:[ \t]+-[^\r\n]*(?:\r?\n|$))+`),
	},
	"environment_update": {regexp.MustCompile(`(?m)^# Environment update\r?\n(?:[ \t]+-[^\r\n]*(?:\r?\n|$))+`)},
	"model":              {regexp.MustCompile(`(?m)^You are powered by the model [^\r\n]*$`)},
	// Older CLIs render the date inside the session context under "# currentDate".
	"date": {
		regexp.MustCompile(`(?m)^(?:# currentDate\r?\n)?Today's date is [^\r\n]+\.$`),
		regexp.MustCompile(`(?m)^The date has changed\. Today's date is now [^\r\n]+\.[^\r\n]*$`),
	},
	"total_tokens_reminder": {regexp.MustCompile(`(?m)^<total_tokens>(?:\d+|Infinite) tokens left</total_tokens>$`)},
	// CLAUDE.md, git status and the account email: the whole context reminder.
	"session_context": {regexp.MustCompile(`(?s)<system-reminder>\r?\nAs you answer the user's questions, you can use the following context:\r?\n.*?</system-reminder>`)},
}

func init() {
	clientAttachmentPatterns["current_date"] = clientAttachmentPatterns["date"][:1]
	clientAttachmentPatterns["date_change"] = clientAttachmentPatterns["date"][1:]
}

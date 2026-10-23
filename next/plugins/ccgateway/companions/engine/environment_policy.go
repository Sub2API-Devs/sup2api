package engine

import (
	"regexp"
)

// Match only Claude Code's environment section, never arbitrary cwd mentions.
// The bullet block has stable English labels in verified win32/linux clients.
var environmentSection = regexp.MustCompile(`(?m)^# Environment\r?\nYou have been invoked in the following environment:[ \t]*\r?\n(?:[ \t]+-[^\r\n]*(?:\r?\n|$))+`)

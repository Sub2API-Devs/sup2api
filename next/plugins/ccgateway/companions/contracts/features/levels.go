package features

import (
	"fmt"
	"slices"
)

// RequestLevelsCapability: the CLI follows the request levels (2026-10-23):
// direct is the billing header alone (no identity line); a request without a
// billing header is completed as Claude Code's main thread (its full header,
// not a subagent's); and each chosen layer is added only when the request does
// not already carry it (an attachment, the system prompt, a tool by name).
const RequestLevelsCapability = "request_levels_v1"

// Request levels, from the least to the most of Claude Code a request is
// given. Each includes the ones before it:
//
//	none  - the billing header only, in direct (the body otherwise byte for byte)
//	micro - build, plus the identity line
//	low   - plus the environment: attachment fields converted, missing
//	        first-turn attachments added
//	high  - plus Claude Code's system prompt and the chosen tools
const (
	LevelNone  = "none"
	LevelMicro = "micro"
	LevelLow   = "low"
	LevelHigh  = "high"
)

var RequestLevels = []string{LevelNone, LevelMicro, LevelLow, LevelHigh}

// DefaultRequestLevel is the level without a choice: build converting the
// environment. Its first-turn attachments are added at their defaults; a
// policy saved before levels is migrated with explicit choices instead, so
// it adds what it added before (LegacyLevel).
const DefaultRequestLevel = LevelLow

// ValidateRequestLevel accepts "" (inherit/default) or a known level.
func ValidateRequestLevel(value string) error {
	if value != "" && !slices.Contains(RequestLevels, value) {
		return fmt.Errorf("invalid level: %s", value)
	}
	return nil
}

func levelRank(level string) int {
	if level == "" {
		level = DefaultRequestLevel
	}
	return slices.Index(RequestLevels, level)
}

// RelayModeForLevel: none is direct, every other level build.
func RelayModeForLevel(level string) string {
	if levelRank(level) == 0 {
		return "direct"
	}
	return "build"
}

// LevelHasIdentity, LevelHasEnvironment and LevelHasPromptAndTools say which
// layers a level includes; the billing header is in every one.
func LevelHasIdentity(level string) bool       { return levelRank(level) >= 1 }
func LevelHasEnvironment(level string) bool    { return levelRank(level) >= 2 }
func LevelHasPromptAndTools(level string) bool { return levelRank(level) >= 3 }

// DefaultInjectionTools are the tools high adds without a choice: the ones
// Claude Code's system prompt names (2.1.304 "# Using your tools" names Read,
// Edit and Write unconditionally, and Bash when it is present).
var DefaultInjectionTools = []string{"Bash", "Read", "Edit", "Write"}

// LevelInjection is what a level adds to a request without a billing header:
// the configured choices within the level, each omitted one at the level's
// default (every first-turn attachment from low, the system prompt and the
// default tools at high). Nothing outside the level is kept; nil when nothing
// is added.
func LevelInjection(level string, configured *BuildInjection) *BuildInjection {
	if !LevelHasEnvironment(level) {
		return nil
	}
	out := &BuildInjection{Attachments: map[string]bool{}}
	for _, name := range InjectionAttachments {
		out.Attachments[name] = true
	}
	if LevelHasPromptAndTools(level) {
		on := true
		out.SystemPrompt = &on
		out.Tools = map[string]bool{}
		for _, name := range DefaultInjectionTools {
			out.Tools[name] = true
		}
	}
	if configured != nil {
		for name, on := range configured.Attachments {
			out.Attachments[name] = on
		}
		if LevelHasPromptAndTools(level) {
			if configured.SystemPrompt != nil {
				value := *configured.SystemPrompt
				out.SystemPrompt = &value
			}
			for name, on := range configured.Tools {
				out.Tools[name] = on
			}
		}
	}
	return out.Effective()
}

// LegacyLevel is the level of a policy saved before levels: direct is none;
// build adding the prompt or a tool is high, converting or adding the
// environment low, otherwise micro.
func LegacyLevel(relayMode string, attachments BuildAttachmentSources, injection *BuildInjection) string {
	if relayMode == "direct" {
		return LevelNone
	}
	if relayMode != "build" && relayMode != "" {
		return ""
	}
	if added := injection.Effective(); added != nil && (added.SystemPrompt != nil || len(added.Tools) > 0) {
		return LevelHigh
	}
	for _, source := range attachments {
		if source != "client" {
			return LevelLow
		}
	}
	if added := injection.Effective(); added != nil && len(added.Attachments) > 0 {
		return LevelLow
	}
	return LevelMicro
}

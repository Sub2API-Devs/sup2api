package engine

import (
	"regexp"
	"strings"
)

// subscriptionPattern bounds the reported subscription type: "max", "pro",
// "team", "enterprise" today; anything else Claude Code may store later
// passes through as long as it looks like an identifier.
var subscriptionPattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,31}$`)

// storedSubscription is the subscription type of the signed-in Claude
// account, read where Claude Code itself reads it: claudeAiOauth.
// subscriptionType of its credentials, written by the CLI at login and on
// token refresh (claude auth status reports the same field). "" when absent
// or not an identifier. `claude auth status` itself is not run: in the
// account containers it never exits.
func storedSubscription(oauth map[string]any) string {
	value, _ := oauth["subscriptionType"].(string)
	if subscriptionPattern.MatchString(value) {
		return value
	}
	return ""
}

// accountEmailPattern bounds the reported login email: one address, no
// spaces or control characters.
var accountEmailPattern = regexp.MustCompile(`^[^\s@]{1,64}@[^\s@]{1,255}$`)

// storedAccountEmail is the email of the signed-in Claude login, read where
// Claude Code stores it at login: oauthAccount.emailAddress of its global
// config (.claude.json). "" when absent or not one address. It is the
// login's own value: CLAUDE_CODE_USER_EMAIL, which only overrides the mapping
// key (requestIdentityKey), is not read here.
func storedAccountEmail(env []string) string {
	config, err := readSnapshotObject(snapshotGlobalConfigPath(env))
	if err != nil || config == nil {
		return ""
	}
	account, _ := config["oauthAccount"].(map[string]any)
	email := strings.TrimSpace(str(account, "emailAddress"))
	if len(email) > 320 || !accountEmailPattern.MatchString(email) {
		return ""
	}
	return email
}

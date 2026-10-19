package engine

import "regexp"

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

package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"time"
)

// subscriptionFile keeps the subscription type Claude Code reported for the
// signed-in account, next to its credentials. The status snapshot reads it
// because the snapshot itself never spawns the CLI.
const subscriptionFile = ".ccgateway-subscription"

// subscriptionPattern bounds what is kept: "max", "pro", "team",
// "enterprise" today; anything else Claude Code may report later passes
// through as long as it looks like an identifier.
var subscriptionPattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,31}$`)

func subscriptionPathIn(env []string) string {
	return filepath.Join(filepath.Dir(credentialsPathIn(env)), subscriptionFile)
}

// recordSubscription asks Claude Code (claude auth status --json) for the
// subscription of the account it is signed in with and keeps it for the
// status snapshot. It runs after an authorization or a token refresh, when
// the CLI has just written the credentials. Best effort: any failure leaves
// no record, never a stale one.
func (a *authManager) recordSubscription(ctx context.Context) {
	env := a.environment()
	path := subscriptionPathIn(env)
	_ = os.Remove(path)
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 20*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, a.cli, "auth", "status", "--json")
	cmd.Env = env
	out, _ := cmd.Output() // exits 1 when not signed in; the JSON says so too
	if value := parseAuthStatusSubscription(out); value != "" {
		_ = os.WriteFile(path, []byte(value), 0600)
	}
}

// parseAuthStatusSubscription reads subscriptionType from the output of
// claude auth status --json; "" unless signed in with a Claude account.
func parseAuthStatusSubscription(out []byte) string {
	start, end := bytes.IndexByte(out, '{'), bytes.LastIndexByte(out, '}')
	if start < 0 || end < start {
		return ""
	}
	var v struct {
		LoggedIn         bool    `json:"loggedIn"`
		AuthMethod       string  `json:"authMethod"`
		SubscriptionType *string `json:"subscriptionType"`
	}
	if json.Unmarshal(out[start:end+1], &v) != nil || !v.LoggedIn || v.AuthMethod != "claude.ai" || v.SubscriptionType == nil || !subscriptionPattern.MatchString(*v.SubscriptionType) {
		return ""
	}
	return *v.SubscriptionType
}

// storedSubscription is the recorded subscription type; "" when none.
func storedSubscription(env []string) string {
	raw, err := os.ReadFile(subscriptionPathIn(env))
	if err != nil {
		return ""
	}
	if value := string(bytes.TrimSpace(raw)); subscriptionPattern.MatchString(value) {
		return value
	}
	return ""
}

func forgetSubscription(env []string) { _ = os.Remove(subscriptionPathIn(env)) }

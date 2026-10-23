package features

import (
	"fmt"
	"slices"
)

// BuildIdentityCapability: the CLI writes the configured cc_entrypoint into the
// billing header it fills and picks Claude Code's identity line (the system
// line after the header) by the request's entrypoint.
const BuildIdentityCapability = "build_identity_line_v1"

// DirectBillingCapability: direct gets the billing header the way build does
// (missing header or field filled, the rest of the body byte for byte) and the
// identity line chosen for its entrypoint (2026-10-22: the header is required
// in both modes, the identity line optional).
const DirectBillingCapability = "direct_billing_v1"

// BillingEntrypoints are the cc_entrypoint values build may write, in console
// order. DefaultBillingEntrypoint is the request process's own (sdk-cli, the
// value `claude -p` sends) and is also the wire default.
var BillingEntrypoints = []string{"cli", "sdk-cli", "sdk-ts", "sdk-py", "claude-desktop", "claude-vscode"}

const DefaultBillingEntrypoint = "sdk-cli"

// Identity lines name Claude Code's own lines (2.1.304 n1n); the CLI renders
// the text, no layer copies it:
//
//	official_cli     - an interactive session: "...official CLI for Claude."
//	official_cli_sdk - non-interactive with an appended prompt: "..., running within the Claude Agent SDK."
//	agent_sdk        - non-interactive: "You are a Claude agent, built on Anthropic's Claude Agent SDK."
//	none             - no line; upstream accepts a request whose first block is the header
const IdentityLineNone = "none"

// IdentityLineChoices are the lines each entrypoint may be given: the ones
// real clients send with it, the default first (2026-10-22: terminal cli;
// claude -p and the Agent SDKs without an appended prompt; the desktop app and
// the VS Code extension append one). Claude Code picks the line by
// interactivity and an appended prompt, not by entrypoint (2.1.304 n1n); the
// desktop app's and the extension's side requests (WEo) and interactive
// launches send official_cli (2026-10-23 AST), so they may have it too. cli
// has only its own line: a non-interactive cli becomes sdk-cli (g7).
var IdentityLineChoices = map[string][]string{
	"cli":            {"official_cli"},
	"sdk-cli":        {"agent_sdk", "official_cli_sdk"},
	"sdk-ts":         {"agent_sdk", "official_cli_sdk"},
	"sdk-py":         {"agent_sdk", "official_cli_sdk"},
	"claude-desktop": {"official_cli_sdk", "agent_sdk", "official_cli"},
	"claude-vscode":  {"official_cli_sdk", "agent_sdk", "official_cli"},
}

// DefaultIdentityLine is the line an entrypoint gets when no layer chooses one.
func DefaultIdentityLine(entrypoint string) string {
	if choices := IdentityLineChoices[entrypoint]; len(choices) > 0 {
		return choices[0]
	}
	return IdentityLineChoices[DefaultBillingEntrypoint][0]
}

// ValidateBillingEntrypoint accepts "" (inherit/default) or a known value.
func ValidateBillingEntrypoint(value string) error {
	if value != "" && !slices.Contains(BillingEntrypoints, value) {
		return fmt.Errorf("invalid build_billing_entrypoint: %s", value)
	}
	return nil
}

// BuildIdentityLines chooses the identity line per entrypoint; omitted
// entrypoints use their default.
type BuildIdentityLines map[string]string

func (p BuildIdentityLines) Validate() error {
	for entrypoint, line := range p {
		choices, known := IdentityLineChoices[entrypoint]
		if !known || line != IdentityLineNone && !slices.Contains(choices, line) {
			return fmt.Errorf("invalid build_identity_lines: %s=%s", entrypoint, line)
		}
	}
	return nil
}

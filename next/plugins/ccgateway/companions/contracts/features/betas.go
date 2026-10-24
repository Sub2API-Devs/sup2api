package features

type BetaRule struct {
	Name    string `json:"name"`
	Mapping string `json:"mapping"`
}

// BetaRules lists shared mappings for CLI settings, not a native forwarding
// allowlist. A listed beta does not override native feature admission.
func BetaRules() []BetaRule {
	return []BetaRule{
		{"files-api-2025-04-14", "forward"},
		{"code-execution-2025-05-22", "forward"},
		{"code-execution-2025-08-25", "forward"},
		{"skills-2025-10-02", "forward"},
		{"mcp-client-2025-11-20", "forward"},
		{"mcp-client-2026-09-15", "forward"},
		{"fallback-credit-2026-06-01", "forward"},
		{"fallback-credit-2026-07-01", "forward"},
		{"server-side-fallback-2026-06-01", "forward"},
		{"server-side-fallback-2026-07-01", "forward"},
		{"inline-tools-2026-09-15", "forward"},
		{"mid-conversation-tool-changes-2026-07-01", "forward"},
		{"computer-use-2024-10-22", "forward"},
		{"computer-use-2025-01-24", "forward"},
		{"computer-use-2025-11-24", "forward"},
		{"task-budgets-2026-03-13", "forward"},
		{"context-management-2025-06-27", "forward"},
		{"compact-2026-01-12", "forward"},
		{"compact-2026-09-04", "forward"},
		{"advisor-tool-2026-03-01", "forward"},
		{"mid-conversation-system-clear-at-2026-08-21", "forward"},
		{"mid-conversation-output-config-2026-07-01", "forward"},
		// Observed CC 2.1.292 inline-effort beta; preserve independently of
		// the public API beta above, without renaming either protocol.
		{"per-turn-control-2026-07-01", "forward"},
		{"dangerous-tool-use-2026-09-03", "forward"},
		{"interleaved-thinking-2025-05-14", "forward"},
		{"thinking-display-updates-2026-08-18", "forward"},
		{"thinking-binding-controls-2026-08-01", "forward"},
		{"structured-outputs-2025-11-13", "forward"},
		{"fine-grained-tool-streaming-2025-05-14", "fine_grained_tools"},
		{"context-1m-2025-08-07", "forward"},
		{"fast-mode-2026-02-01", "fast"},
		{"advanced-tool-use-2025-11-20", "tool_search"},
		{"dev-full-thinking-2025-05-14", "forward"},
		{"model-context-window-exceeded-2025-08-26", "forward"},
	}
}

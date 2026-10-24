package engine

// Claude Code's non-interactive stream-json scaffolding. Every management
// process (login, stored-OAuth refresh) runs the same command shape: stream-json
// in and out, no tools, no MCP servers, no hooks, no session persistence, no
// browser and no slash commands. The array is returned fresh because
// exec.CommandContext keeps the slice.
func interactiveCLIArgs() []string {
	return []string{"-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", `{"disableAllHooks":true}`, "--no-session-persistence", "--no-chrome", "--disable-slash-commands"}
}

// fallbackCLIVersion is the User-Agent version management calls use when the
// packaged CLI version was never read.
const fallbackCLIVersion = "2.1.7"

// cliUserAgent is the User-Agent of management calls to Anthropic. It mirrors
// the CLI's own user agent string.
func cliUserAgent(version string) string {
	if version == "" {
		version = fallbackCLIVersion
	}
	return "claude-code/" + version
}

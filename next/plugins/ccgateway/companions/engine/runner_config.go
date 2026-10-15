package engine

import (
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

// toolSearchEnabled reports whether the CLI runs its ToolSearch tool for this
// request (policy "true", "auto" or "auto:N").
func (r *Request) toolSearchEnabled() bool { return r.ToolSearch != "" && r.ToolSearch != "false" }

// Native API requests map one client turn to one model call. Historical
// protocol helpers also construct Requests, without a native request policy.
func (r *Request) singleTurn() bool { return r.nativePolicy != nil }

func (r *Request) clientToolSearch() bool {
	for _, tool := range r.Tools {
		if r.wireName(tool.Name) == "ToolSearch" {
			return true
		}
	}
	return false
}

// Reject features that need another model turn. Without client-owned search,
// do not silently turn explicitly deferred tools into eager ones.
func (r *Request) validateSingleTurn() error {
	if !r.singleTurn() {
		return nil
	}
	if r.hasFallbacks() {
		return passthroughRefusal("fallbacks", "single-turn mode does not issue additional model requests; the client decides whether to retry")
	}
	if r.webSearch != nil {
		if _, direct := r.webSearchFastQuery(); !direct {
			return passthroughRefusal("server web_search", "single-turn mode cannot execute hidden search rounds; use a client tool or a dedicated search request")
		}
	}
	if !r.toolSearchEnabled() || r.clientToolSearch() || r.forcedLoadedClientCatalog() {
		return nil
	}
	for _, tool := range r.Tools {
		if tool.DeferLoading != nil && *tool.DeferLoading {
			return fmt.Errorf("defer_loading requires a client-owned native ToolSearch tool in single-turn mode")
		}
	}
	return nil
}

// structuredOutput reports whether the client asked for JSON Schema output.
func (r *Request) structuredOutput() bool { return r.JSONSchema != nil && !r.APIOutputFormat }

// Native requests stream their single response. The remaining branches serve
// historical protocol helpers, which can validate or hide complete messages.
func (r *Request) bufferedResponse() bool {
	if r.singleTurn() {
		return false
	}
	return r.structuredOutput() || r.APIOutputFormat || r.toolSearchEnabled() || r.webSearch != nil
}

// Native requests never authorize a second model turn. Historical protocol
// helpers retain their bounded discovery/formatting rules.
func (r *Request) maxTurns() string {
	if r.singleTurn() {
		return "1"
	}
	if r.webSearch != nil {
		// Each search the Worker answers continues the turn.
		turns := 1 + webSearchMaxRounds
		if r.toolSearchEnabled() {
			turns += 3
		}
		return strconv.Itoa(turns)
	}
	if r.forcedLoadedClientCatalog() {
		return "1"
	}
	switch {
	case r.structuredOutput() && r.toolSearchEnabled():
		return "5"
	case r.structuredOutput():
		return "2"
	case r.toolSearchEnabled():
		return "4"
	}
	return "1"
}

// enabledTools lists the wire names the CLI may offer the model, sorted.
func (r *Request) enabledTools() []string {
	tools := []string{}
	if !r.NoTools {
		for _, tool := range r.Tools {
			if r.runtimeToolSearchable(tool.Name) {
				tools = append(tools, r.wireName(tool.Name))
			}
		}
	}
	if !r.singleTurn() && r.toolSearchEnabled() && !r.forcedLoadedClientCatalog() {
		tools = append(tools, "ToolSearch")
	}
	if r.webSearch != nil {
		tools = append(tools, "WebSearch")
	}
	sort.Strings(tools)
	return tools
}

// responseView is the request the accumulator checks model blocks against:
// with tool discovery, the CLI's own ToolSearch is a declared native tool.
func (r *Request) responseView() *Request {
	if r.singleTurn() {
		return r
	}
	view := *r
	if r.webSearch != nil {
		// Claude Code's WebSearch stands for the client's web_search.
		view.Tools = append(append([]Tool(nil), r.Tools...), Tool{Name: "WebSearch", Schema: Object{"type": "object"}})
		view.Native = map[string]bool{"WebSearch": true}
		for name, allowed := range r.Native {
			view.Native[name] = allowed
		}
		if !r.toolSearchEnabled() || r.forcedLoadedClientCatalog() {
			return &view
		}
		view.Tools = append(view.Tools, Tool{Name: "ToolSearch", Schema: Object{"type": "object"}})
		view.Native["ToolSearch"] = true
		return &view
	}
	if r.toolSearchEnabled() && !r.forcedLoadedClientCatalog() {
		view.Tools = append(append([]Tool(nil), r.Tools...), Tool{Name: "ToolSearch", Schema: Object{"type": "object"}})
		view.Native = map[string]bool{}
		for name, allowed := range r.Native {
			view.Native[name] = allowed
		}
		view.Native["ToolSearch"] = true
	}
	return &view
}

// Inherited variables that would change the request the CLI sends; the gateway
// sets the ones it needs from the request itself.
var inheritedCLIEnv = []string{"_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL", "CLAUDE_CODE_RETRY_WATCHDOG", "CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK", "CLAUDE_CODE_MAX_RETRIES", "ANTHROPIC_CUSTOM_HEADERS", "CLAUDE_CODE_RESUME_INTERRUPTED_TURN", "CLAUDE_CODE_RESUME_FROM_SESSION", "CLAUDE_CODE_PLUGIN_DIRS", "ANTHROPIC_BETAS", "CLAUDE_CODE_EXTRA_BODY", "CLAUDE_CODE_EFFORT_LEVEL", "CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING", "CLAUDE_CODE_PROMPT_CACHE_TTL", "CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL", "FORCE_PROMPT_CACHING_5M", "ENABLE_PROMPT_CACHING_1H", "MAX_THINKING_TOKENS", "CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING", "CLAUDE_CODE_DISABLE_THINKING", "CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS", "MAX_STRUCTURED_OUTPUT_RETRIES", "CLAUDE_CODE_DISABLE_1M_CONTEXT", "CLAUDE_CODE_MAX_CONTEXT_TOKENS", "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS", "CLAUDE_CODE_USE_POWERSHELL_TOOL", "CLAUDE_CODE_SUBAGENT_MODEL_FORCE", "CLAUDE_CODE_SUBAGENT_MODEL", "CLAUDE_CODE_DISABLE_BUNDLED_SKILLS", "BASH_DEFAULT_TIMEOUT_MS", "BASH_MAX_TIMEOUT_MS", "CCGATEWAY_TOOL_DEFERRAL_FILE", "CCGATEWAY_SYSTEM_FILE", "CCGATEWAY_SYSTEM_ACK_FILE", "CCGATEWAY_READY_FILE", "CCGATEWAY_DEBUG_FILE", "CCGATEWAY_ATTACHMENT_TRACE", "CCGATEWAY_MOD_URL", "CCGATEWAY_MOD_TOKEN"}

// runConfig is the per-request CLI and Mod configuration, kept in memory.
type runConfig struct {
	scopeResumed    bool // One same-model boundary, never a fallback attempt.
	searchCalls     int
	helperRequest   *Request
	diagnostic      *requestDiagnostic
	args            []string
	env             map[string]string
	systems         []string
	groups          []systemGroup
	deferral        []byte
	control         *modControl
	native          *nativeRunState
	attachments     Object
	reminderMarker  string
	nativeReminders map[string]int
	tools           Object
	passthrough     *passthroughConfig // the Mod's per-round native request fields
	// reportAttachments asks the Mod for Claude Code's own rendering of the
	// replaceable attachments (gateway_attachments.go).
	reportAttachments bool
}

func newRunConfig(req *Request, p *Prepared, plugin, dir string) *runConfig {
	if !req.singleTurn() && req.Plan != nil && (req.Plan.cache != nil || req.InlineTools != nil || req.helperHistory != nil) && req.toolSearchEnabled() && !req.structuredOutput() {
		req.internalCache = &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
	}
	c := &runConfig{helperRequest: req, reminderMarker: req.continuation, nativeReminders: nativeContinuationReminders(req, p), args: cliArgs(req, p, plugin), systems: req.pendingSystems(), groups: req.systemGroups()}
	c.diagnostic = req.diagnostic
	c.attachments = req.attachmentConfig()
	c.tools = Object{}
	for _, tool := range req.Tools {
		route := Object{"client_name": tool.Name, "native": req.Native[tool.Name], "description": tool.Description}
		c.tools[req.wireName(tool.Name)] = route
	}
	c.diagnostic.artifact("tool-routing.json", c.tools)

	c.env = cliEnv(req, len(c.groups) > 0)
	for key, value := range req.catalogueEnv {
		c.env[key] = value
	}
	if req.toolSearchEnabled() {
		c.deferral = toolDeferral(req)
		if !req.singleTurn() || req.clientToolSearch() || req.forcedLoadedClientCatalog() {
			c.env["ENABLE_TOOL_SEARCH"] = req.ToolSearch
		}
		if !req.singleTurn() && !req.forcedLoadedClientCatalog() {
			c.env["CCGATEWAY_TOOL_SEARCH"] = "1"
		}
	}
	return c
}

func cliArgs(req *Request, p *Prepared, plugin string) []string {
	settings := `{"disableAllHooks":false}`
	values := Object{"disableAllHooks": false}
	if req.Fast != nil {
		values["fastMode"] = *req.Fast
	}
	if req.offersSkill() {
		// With slash commands the CLI lists its skills to the model; the
		// container's own (bundled ones are off by environment, and this
		// built-in plugin's) must not reach the client's conversation.
		values["enabledPlugins"] = Object{"plugin-authoring@builtin": false}
	}
	if len(values) > 1 {
		b, _ := json.Marshal(values)
		settings = string(b)
	}
	snapshotMode := "off"
	if p.SnapshotEnabled {
		snapshotMode = "on"
	}
	args := []string{"-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--permission-prompt-tool", "stdio", "--tools", strings.Join(req.enabledTools(), ","), "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", settings, "--no-chrome", "--max-turns", req.maxTurns(), "--model=" + req.Model, "--plugin-dir", plugin, "--system-prompt-snapshot", snapshotMode}
	if !req.offersSkill() {
		args = append(args, "--disable-slash-commands")
	}
	if req.nativeProfile != nil {
		args = append(args, "--permission-mode", req.nativeProfile.PermissionMode)
	}
	// The session ID never changes within a branch (§53.12): resuming the
	// private copy keeps it, and the CLI appends to that copy.
	if p.Path != "" {
		args = append(args, "--resume", p.Path)
		if p.Anchor != "" {
			args = append(args, "--resume-session-at", p.Anchor)
		}
	} else {
		args = append(args, "--session-id", p.runSession())
	}
	// The client's thinking, output_config and sampling fields travel in
	// CLAUDE_CODE_EXTRA_BODY (passthrough.go); these only set the CLI's mode.
	args = append(args, req.passthroughThinkingArgs()...)
	args = append(args, "--effort", req.passthroughEffort())
	for _, dir := range req.AdditionalDirectories {
		args = append(args, "--add-dir", dir)
	}
	return args
}

// cliEnv is the request's CLI environment, before adding the private Mod
// callback address.
func cliEnv(req *Request, systemTurns bool) map[string]string {
	env := map[string]string{"CLAUDE_CODE_MAX_OUTPUT_TOKENS": strconv.Itoa(req.MaxTokens), "DISABLE_AUTOUPDATER": "1", "DISABLE_AUTO_COMPACT": "1", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "ENABLE_TOOL_SEARCH": "false", "CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION": "0",
		"ANTHROPIC_BETAS": strings.Join(req.Betas, ","), "MAX_STRUCTURED_OUTPUT_RETRIES": "1", "CCGATEWAY_STRUCTURED_OUTPUT": "0", "CCGATEWAY_TOOL_SEARCH": "0", "CCGATEWAY_ATTACHMENT_SOURCE": req.AttachmentSource}
	if systemTurns {
		// Without system turns the CLI folds system text into user messages and
		// tool results, which cannot be undone exactly. Whether the model takes
		// system messages is then the API's decision, as for a direct client.
		env["CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM"] = "1"
	}
	if req.structuredOutput() {
		env["CCGATEWAY_STRUCTURED_OUTPUT"] = "1"
	}
	if req.PromptCacheTTL != "" {
		env["CLAUDE_CODE_PROMPT_CACHE_TTL"] = req.PromptCacheTTL
	}
	// No retries: the client decides (PASSTHROUGH-DESIGN.md section 2).
	// The client's output format goes upstream as sent, never the CLI's.
	env["CLAUDE_CODE_MAX_RETRIES"] = "0"
	env["CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK"] = "1"
	env["CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL"] = "1"
	env["CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS"] = "1"
	if req.singleTurn() {
		env["CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK"] = "1"
		env["CLAUDE_CODE_NO_MODEL_FALLBACK"] = "1"
		env["CLAUDE_CODE_DISABLE_REFUSAL_RETRY"] = "1"
		env["CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK"] = "1"
	}
	if req.upstreamAgent != "" {
		// A client subagent: upstream sees A' from the CLI itself.
		env["ANTHROPIC_CUSTOM_HEADERS"] = "x-claude-code-agent-id: " + req.upstreamAgent
	}
	for _, beta := range req.Betas {
		if beta == "context-1m-2025-08-07" {
			env["CLAUDE_CODE_DISABLE_1M_CONTEXT"] = "0"
			env["CLAUDE_CODE_MAX_CONTEXT_TOKENS"] = "1000000"
		}
	}
	if req.FineGrainedTools {
		env["CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING"] = "1"
	}
	if req.agentTeamsVariant() {
		env["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] = "1"
	}
	if req.offersSkill() {
		// The container's own skills must not be listed to the model.
		env["CLAUDE_CODE_DISABLE_BUNDLED_SKILLS"] = "1"
	}
	for k, v := range req.shellToolEnv() {
		env[k] = v
	}
	if req.cliSnapshot != nil || req.nativeProfile != nil {
		profile := newCLIToolProfile("named", "default")
		if req.nativeProfile != nil {
			profile = *req.nativeProfile
		}
		for key := range profile.Env {
			delete(env, key)
		}
		for key, value := range profile.environment() {
			env[key] = value
		}
	}
	return env
}

// offersSkill reports whether the inner CLI runs with slash commands, which
// is what makes it offer the Skill tool: only when the client's Skill is
// native (client safeguards refuse it under the gateway's MCP name), and
// never when a top-level text block of the input starts with "/", which the
// CLI would run as a command (2.1.292 checks those blocks, not tool results
// nor text after leading whitespace).
func (r *Request) offersSkill() bool {
	if r.NoTools || !r.Native["Skill"] {
		return false
	}
	for _, block := range r.pendingWireMessage().Content {
		if str(block, "type") == "text" && strings.HasPrefix(str(block, "text"), "/") {
			return false
		}
	}
	return true
}

// agentTeamsVariant reports a native Agent tool with the agent teams schema
// (team_name, name, mode), which a client CLI offers with
// CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS. The inner CLI then offers the same
// definition, so Agent stays native instead of falling back to the gateway's
// MCP name (which client safeguards refuse). Agent calls still return to the
// client: the inner CLI never runs a teammate.
func (r *Request) agentTeamsVariant() bool {
	if r.NoTools || !r.Native["Agent"] {
		return false
	}
	for _, tool := range r.Tools {
		if tool.Name == "Agent" {
			properties, _ := tool.Schema["properties"].(map[string]any)
			_, teams := properties["team_name"]
			return teams
		}
	}
	return false
}

// processEnv is the CLI's complete environment: the inherited one without
// request-shaping variables, then loopback proxy exclusions and the request's own settings.
func (c *runConfig) processEnv(base []string) []string {
	noProxy := environmentValue(base, "NO_PROXY")
	if noProxy == "" {
		noProxy = environmentValue(base, "no_proxy")
	}
	noProxy += ",127.0.0.1,localhost"
	values := map[string]string{"NO_PROXY": noProxy, "no_proxy": noProxy}
	for k, v := range c.env {
		values[k] = v
	}
	return envWith(base, values, inheritedCLIEnv...)
}

func toolDeferral(req *Request) []byte {
	deferred := Object{}
	for _, tool := range req.Tools {
		if tool.DeferLoading != nil {
			deferred[req.wireName(tool.Name)] = *tool.DeferLoading
		} else if req.handbackTool(tool.Name) {
			// The subagent's only way to report back: the official CLI never
			// defers it, while the inner CLI would defer it as an MCP tool.
			deferred[req.wireName(tool.Name)] = false
		}
	}
	data, _ := json.Marshal(deferred)
	return data
}

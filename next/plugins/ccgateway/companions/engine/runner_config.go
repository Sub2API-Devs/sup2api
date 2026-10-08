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

// structuredOutput reports whether the client asked for JSON Schema output.
func (r *Request) structuredOutput() bool { return r.JSONSchema != nil && !r.APIOutputFormat }

// bufferedResponse reports whether model events are held back until the
// result frame: structured output is validated first, and tool discovery
// rounds never reach the client.
func (r *Request) bufferedResponse() bool {
	return r.structuredOutput() || r.APIOutputFormat || r.toolSearchEnabled()
}

// maxTurns bounds the CLI's model calls: one answer, plus up to three tool
// discovery rounds, plus one structured-output continuation.
func (r *Request) maxTurns() string {
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
	if r.toolSearchEnabled() && !r.forcedLoadedClientCatalog() {
		tools = append(tools, "ToolSearch")
	}
	sort.Strings(tools)
	return tools
}

// responseView is the request the accumulator checks model blocks against:
// with tool discovery, the CLI's own ToolSearch is a declared native tool.
func (r *Request) responseView() *Request {
	view := *r
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
var inheritedCLIEnv = []string{"CLAUDE_CODE_RESUME_INTERRUPTED_TURN", "CLAUDE_CODE_RESUME_FROM_SESSION", "CLAUDE_CODE_PLUGIN_DIRS", "ANTHROPIC_BETAS", "CLAUDE_CODE_EXTRA_BODY", "CLAUDE_CODE_EFFORT_LEVEL", "CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING", "CLAUDE_CODE_PROMPT_CACHE_TTL", "CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL", "FORCE_PROMPT_CACHING_5M", "ENABLE_PROMPT_CACHING_1H", "MAX_THINKING_TOKENS", "CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING", "CLAUDE_CODE_DISABLE_THINKING", "CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS", "MAX_STRUCTURED_OUTPUT_RETRIES", "CLAUDE_CODE_DISABLE_1M_CONTEXT", "CLAUDE_CODE_MAX_CONTEXT_TOKENS", "CCGATEWAY_TOOL_DEFERRAL_FILE", "CCGATEWAY_SYSTEM_FILE", "CCGATEWAY_SYSTEM_ACK_FILE", "CCGATEWAY_READY_FILE", "CCGATEWAY_DEBUG_FILE", "CCGATEWAY_ATTACHMENT_TRACE", "CCGATEWAY_MOD_URL", "CCGATEWAY_MOD_TOKEN"}

// runConfig is the per-request CLI and Mod configuration, kept in memory.
type runConfig struct {
	helperRequest   *Request
	scope           *mainRequestScope
	diagnostic      *requestDiagnostic
	args            []string
	env             map[string]string
	systems         []string
	groups          []systemGroup
	deferral        []byte
	control         *modControl
	attachments     Object
	reminderMarker  string
	nativeReminders map[string]int
	tools           Object
}

func newRunConfig(req *Request, p *Prepared, plugin, dir string) *runConfig {
	if req.Plan != nil && (req.Plan.cache != nil || req.InlineTools != nil || req.helperHistory != nil) && req.toolSearchEnabled() && !req.structuredOutput() {
		req.internalCache = &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
	}
	c := &runConfig{helperRequest: req, reminderMarker: req.continuation, nativeReminders: nativeContinuationReminders(req, p), args: cliArgs(req, p, plugin), systems: req.pendingSystems(), groups: req.systemGroups()}
	if req.HasMainRequestFeatures() {
		c.scope = newMainRequestScope()
		c.args = append(c.args, "--append-system-prompt", c.scope.marker)
	}
	c.diagnostic = req.diagnostic
	c.attachments = req.attachmentConfig()
	c.tools = Object{}
	for _, tool := range req.Tools {
		route := Object{"client_name": tool.Name, "native": req.Native[tool.Name], "description": tool.Description}
		c.tools[req.wireName(tool.Name)] = route
	}
	c.diagnostic.artifact("tool-routing.json", c.tools)

	c.env = cliEnv(req, len(c.groups) > 0)
	if req.toolSearchEnabled() {
		c.deferral = toolDeferral(req)
		c.env["ENABLE_TOOL_SEARCH"] = req.ToolSearch
		c.env["CCGATEWAY_TOOL_SEARCH"] = "1"
		if req.forcedLoadedClientCatalog() {
			c.env["CCGATEWAY_TOOL_SEARCH"] = "0"
		}
	}
	return c
}

func cliArgs(req *Request, p *Prepared, plugin string) []string {
	settings := `{"disableAllHooks":false}`
	if req.Fast != nil {
		fast := *req.Fast && (req.Plan == nil || !req.Plan.apiGeneration)
		b, _ := json.Marshal(Object{"disableAllHooks": false, "fastMode": fast})
		settings = string(b)
	}
	snapshotMode := "off"
	if p.SnapshotEnabled && !req.HasMainRequestFeatures() {
		snapshotMode = "on"
	}
	args := []string{"-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--permission-prompt-tool", "stdio", "--tools", strings.Join(req.enabledTools(), ","), "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "", "--settings", settings, "--disable-slash-commands", "--no-chrome", "--max-turns", req.maxTurns(), "--model=" + req.Model, "--plugin-dir", plugin, "--system-prompt-snapshot", snapshotMode}
	if p.Path != "" {
		args = append(args, "--resume", p.Path)
		if p.Anchor != "" {
			args = append(args, "--resume-session-at", p.Anchor)
		}
		if p.Fork {
			args = append(args, "--fork-session", "--session-id", p.SessionID)
		}
	} else {
		args = append(args, "--session-id", p.SessionID)
	}
	switch str(req.Thinking, "type") {
	case "enabled":
		args = append(args, "--max-thinking-tokens", fmt.Sprint(req.Thinking["budget_tokens"]))
	case "adaptive":
		args = append(args, "--thinking", "adaptive")
	case "disabled":
		args = append(args, "--thinking", "disabled")
	}
	if display := str(req.Thinking, "display"); display == "omitted" || display == "summarized" {
		args = append(args, "--thinking-display", display)
	}
	if req.structuredOutput() {
		schema, _ := json.Marshal(req.JSONSchema)
		args = append(args, "--json-schema", string(schema))
	}
	if req.Effort != "" {
		args = append(args, "--effort", req.Effort)
	}
	for _, dir := range req.AdditionalDirectories {
		args = append(args, "--add-dir", dir)
	}
	return args
}

// cliEnv is the request's CLI environment, before adding the private Mod
// callback and relay addresses.
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
	switch str(req.Thinking, "type") {
	case "enabled":
		env["MAX_THINKING_TOKENS"] = fmt.Sprint(req.Thinking["budget_tokens"])
		env["CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING"] = "1"
	case "adaptive":
		// Absence of a fixed budget leaves the model in adaptive mode.
	case "disabled":
		env["MAX_THINKING_TOKENS"] = "0"
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
	return env
}

// relayEnv points the CLI at the outbound relay.
func relayEnv(base []string, relay *outboundRelay) map[string]string {
	noProxy := environmentValue(base, "NO_PROXY")
	if noProxy == "" {
		noProxy = environmentValue(base, "no_proxy")
	}
	noProxy += ",127.0.0.1,localhost"
	env := map[string]string{"ANTHROPIC_BASE_URL": relay.URL, "NO_PROXY": noProxy, "no_proxy": noProxy}
	// The loopback carrier still terminates at the original first-party API.
	// The CLI keys some first-party behaviour to the base URL's hostname;
	// this keeps that behaviour. It does not decide system turns, which
	// follow the model, provider and CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM.
	if relay.FirstParty {
		env["_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL"] = "1"
	}
	return env
}

// processEnv is the CLI's complete environment: the inherited one without
// request-shaping variables, then the relay and the request's own settings.
func (c *runConfig) processEnv(base []string, relay *outboundRelay) []string {
	values := relayEnv(base, relay)
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
		}
	}
	data, _ := json.Marshal(deferred)
	return data
}

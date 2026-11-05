/**
 * tools/AgentTool/built-in/claudeCodeGuideAgent.ts
 *
 * claude-code-guide 内建代理（haiku、dontAsk，查官方文档回答 Claude Code/SDK/API 问题）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/built-in/claudeCodeGuideAgent.ts
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: fingerprint 3, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasEmbeddedSearchTools } from "../../../utils/embeddedTools.js";
import { isBashAvailable } from "../../../utils/shell/shellToolUtils.js";
import { READ } from "../../FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../../GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../GrepTool/prompt.js";
import {
  CLAUDE_CODE_DOCS_MAP_URL,
  HTTPS_PLATFORM_CLAUDE_COM_LLMS_TXT,
  HTTPS_CLAUDE_COM_DOCS_LLMS_TXT,
  CLAUDE_TAG_DOCS_URL,
  CLAUDE_CODE_GUIDE,
} from "../../../constants/prompts.js";
import { WEBFETCH } from "../../WebFetchTool/prompt.js";
import { WEBSEARCH } from "../../WebSearchTool/prompt.js";
import { describePluginEvalAvailability, lanternPrismEnabled } from "../../../utils/plugins/pluginGates.js";
import { loadBundledText } from "../../../utils/bundledText.js";
import { isUsing3PServices } from "../../../utils/auth.js";
import { isFeedbackAllowed } from "../../../commands/feedback/feedbackPolicy.js";
import { SENDMESSAGE } from "../../SendMessageTool/constants.js";
import { BASH_TOOL_NAME } from "../../BashTool/toolName.js";
import { uniqByExport } from "../../../../vendor/lodash-es/uniqBy.js";
import { getSettings_DEPRECATED } from "../../../utils/settings/settings.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2379899-2387857 fingerprint (2.1.88 match: getClaudeCodeGuideBasePrompt, 0.756)
function getClaudeCodeGuideBasePrompt() {
  let localSearchHint =
    hasEmbeddedSearchTools() && isBashAvailable()
      ? `${READ}, \`find\`, and \`grep\``
      : `${READ}, ${GLOB_TOOL_NAME}, and ${GREP_TOOL_NAME}`;
  return `You are the Claude guide agent. Your primary responsibility is helping users understand and use Claude Code, the Claude Agent SDK, and the Claude API (formerly the Anthropic API) effectively.

**Your expertise spans five domains:**

1. **Claude Code** (the CLI tool): Installation, configuration, hooks, skills, MCP servers, keyboard shortcuts, IDE integrations, settings, and workflows.

2. **Claude Agent SDK**: Claude Code packaged as a library (\`claude-agent-sdk\` for Python, \`@anthropic-ai/claude-agent-sdk\` for TypeScript) for building custom agents on your own infrastructure. It ships the full Claude Code harness (agent loop, context management, sessions, hooks, subagents, permissions, MCP) plus **built-in tools** \u2014 Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch \u2014 so the agent can act without you implementing tool execution. You host and deploy it. It is a **separate package** from the Anthropic API SDK's Tool Runner (domain 3), and it is **not** Managed Agents (which is Anthropic-hosted with a per-session sandbox). When contrasting it with the Tool Runner, always name the package and the built-in tools; do not ascribe Managed Agents features (a hosted sandbox, memory stores) to it.

3. **Claude API**: The Claude API (formerly known as the Anthropic API) for direct model interaction and for building agents with your own tools. It spans several surfaces: the **Messages API** (direct request/response), the **Tool Runner** (\`client.beta.messages.tool_runner\`) and **manual tool-use loops** for running an agentic loop over tools you define, and **Managed Agents** (server-hosted stateful agents with an Anthropic-managed sandbox). These are distinct from the Claude Agent SDK in domain 2: the Tool Runner and the Agent SDK both supply a harness you host yourself, while Managed Agents also hosts the deployment. The difference in harness scope: the Tool Runner loops over tools you define \u2014 with per-turn hooks for human-in-the-loop approval, error interception, result modification, and retries, but no built-in tools \u2014 while the Agent SDK is the full Claude Code harness with built-in tools. (The Tool Runner is not a bare loop: approval gates and interception do not require dropping to a manual loop.) Do not conflate the Claude API Tool Runner with the Claude Agent SDK \u2014 they are different products. Do not conflate the Claude Agent SDK with Managed Agents either \u2014 the Agent SDK is harness-only and you host it yourself; Managed Agents is the option where Anthropic hosts the deployment.

4. **Claude Tag (Claude in Slack)**: Claude working as a teammate in an organization's Slack channels, with each thread backed by a remote Claude Code session. Covers what it is, how an organization owner enables it (Admin settings \u2192 Claude Tag, or \`@Claude connect\` from Slack), the \`/install-slack-app\` command (only available in Claude.ai-subscriber sessions \u2014 when it is absent, an organization owner enables Claude Tag from Admin settings or with \`@Claude connect\` in Slack), and how its configuration works.

5. **Plugin evaluation and skill diagnostics**: the \`claude plugin eval\` / \`claude plugin eval init\` CLI harness (writing eval cases and graders, running suites, the results JSON and HTML report, the eval sandbox, CI use, availability) and the \`/skill-doctor\` skill usage report. There is no public docs page for these yet: answer them from the "Plugin eval and /skill-doctor" reference embedded at the end of this prompt, not from memory and not from a guessed URL.

**Documentation sources:**

- **Claude Code docs** (${CLAUDE_CODE_DOCS_MAP_URL}): Fetch this for questions about the Claude Code CLI tool, including:
  - Installation, setup, and getting started
  - Hooks (pre/post command execution)
  - Custom skills
  - MCP server configuration
  - IDE integrations (VS Code, JetBrains)
  - Settings files and configuration
  - Keyboard shortcuts and hotkeys
  - Subagents and plugins
  - Sandboxing and security

- **Claude Agent SDK docs** (${CLAUDE_CODE_DOCS_MAP_URL}): Fetch this for questions about building agents with the SDK, including:
  - SDK overview and getting started (Python \`claude-agent-sdk\`, TypeScript \`@anthropic-ai/claude-agent-sdk\`)
  - Built-in tools (Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch) and the agent loop
  - Agent configuration + custom tools
  - Session management and permissions
  - MCP integration in agents
  - Self-hosting and deploying your agent (you host \u2014 Anthropic does not host Agent SDK apps)
  - Cost tracking and context management
  Note: The Agent SDK docs live in the Claude Code docs map (code.claude.com), NOT the Claude API docs at platform.claude.com \u2014 fetch THIS url for any Agent SDK question. The platform.claude.com index does not list the Agent SDK pages.

- **Claude API docs** (${HTTPS_PLATFORM_CLAUDE_COM_LLMS_TXT}): Fetch this for questions about the Claude API (formerly the Anthropic API), including:
  - Messages API and streaming
  - Tool use (function calling) and Anthropic-defined tools (computer use, code execution, web search, text editor, bash, programmatic tool calling, tool search tool, context editing, Files API, structured outputs)
  - Tool Runner (\`client.beta.messages.tool_runner\`): the SDK helper that runs the agentic loop over tools you define \u2014 with per-turn hooks for approval gates, error interception, result modification, retries, and streaming (you do NOT need the manual loop for those)
  - Managed Agents: server-hosted stateful agents with an Anthropic-managed sandbox \u2014 create an agent once, start sessions that reference it; SSE event stream, Skills + MCP, file mounts
  - Prompt caching
  - Vision, PDF support, and citations
  - Extended thinking and structured outputs
  - MCP connector for remote MCP servers
  - Cloud provider integrations (Bedrock, Vertex AI, Foundry)

- **Claude Tag / Claude in Slack docs** (${HTTPS_CLAUDE_COM_DOCS_LLMS_TXT}): Fetch this index for any question about Claude Tag, Claude in Slack, \`@Claude\` in Slack, or \`/install-slack-app\`, then fetch the specific page. Start with the overview at ${CLAUDE_TAG_DOCS_URL}. Note: Claude Tag pages are NOT in the Claude Code docs map above \u2014 they live on the claude.com docs domain.

**Approach:**
1. Determine which domain the user's question falls into
2. Use ${WEBFETCH} to fetch the appropriate docs map
3. Identify the most relevant documentation URLs from the map
4. Fetch the specific documentation pages
5. Provide clear, actionable guidance based on official documentation
6. Use ${WEBSEARCH} if docs don't cover the topic
7. Reference local project files (CLAUDE.md, .claude/ directory) when relevant using ${localSearchHint}

**Guidelines:**
- Always prioritize official documentation over assumptions
- Your training data about Claude Code commands, flags, and settings may be out of date. If ${WEBFETCH} or ${WEBSEARCH} fail or you cannot reach the documentation, do not silently answer from memory: tell the user you could not reach the documentation, give the best answer you have, and explicitly note it may be out of date with a link to https://code.claude.com/docs.
- Claude Tag is newer than your training data and replaces the earlier per-user "Claude in Slack" app. Never answer Claude Tag questions from memory \u2014 fetch the Claude Tag docs above first.
- \`claude plugin eval\` and \`/skill-doctor\` (both generally available) are newer than your training data. Answer them from the embedded reference below; if it says plugin eval is switched off in this session, lead with that rather than saying the command does not exist.
- Keep responses concise and actionable
- Include specific examples or code snippets when helpful
- Reference exact documentation URLs in your responses
- Help users discover features by proactively suggesting related commands, shortcuts, or capabilities

Complete the user's request by providing accurate, documentation-based guidance.`;
}
//@ chunk-5xgkngpb.js:2387857-2388550 layout
function getPluginEvalReferenceSection() {
  let availability = describePluginEvalAvailability();
  let skillDoctorNote = lanternPrismEnabled()
    ? "`/skill-doctor` is available in this session."
    : "`/skill-doctor` is NOT available in this session. It is on by default in current releases; a session lacks it on an older release, or when this client does not receive feature settings (Bedrock/Vertex/Foundry, telemetry or non-essential traffic disabled, or a first launch that has not fetched them yet) and no administrator has switched it on. Describe it if asked and suggest updating or asking their administrator, but do not tell the user to run it here.";
  let bundledText = loadBundledText(() => require("../../../skills/bundled/default_6.lazy.js"));
  return `# Plugin eval and /skill-doctor (embedded offline reference)

In THIS session: ${availability.text} ${skillDoctorNote}

${bundledText}`;
}
//@ chunk-5xgkngpb.js:2388550-2389309 fingerprint (2.1.88 match: getFeedbackGuideline, 0.404)
function getFeedbackGuideline() {
  if (isUsing3PServices() || !isFeedbackAllowed())
    return `- When you cannot find an answer or the feature doesn't exist, direct the user to ${
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.ISSUES_EXPLAINER
    }`;
  return "- When you cannot find an answer or the feature doesn't exist, direct the user to use /feedback to report a feature request or bug";
}
//@ chunk-5xgkngpb.js:2389309-2391801 fingerprint (2.1.88 match: CLAUDE_CODE_GUIDE_AGENT, 0.87)
/**
 * claude-code-guide 内建代理：model haiku、permissionMode dontAsk，工具 Glob/Grep/Read/WebFetch/WebSearch（嵌入搜索时 Bash/Read/WebFetch/WebSearch），系统提示词附带本项目自定义 skills 列表等。
 */
var CLAUDE_CODE_GUIDE_AGENT; // deferred: uses SENDMESSAGE (../../SendMessageTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2389309", () => {
  CLAUDE_CODE_GUIDE_AGENT = {
    agentType: CLAUDE_CODE_GUIDE,
    whenToUse: `Use this agent when the user asks questions ("Can Claude...", "Does Claude...", "How do I...") about: (1) Claude Code (the CLI tool) - features, hooks, slash commands, MCP servers, settings, IDE integrations, keyboard shortcuts; (2) Claude Agent SDK - building custom agents; (3) Claude API (formerly Anthropic API) - Messages API for directly passing messages to Claude, Tool Runner (\`client.beta.messages.tool_runner\`) for running an agentic loop over your own tools, manual tool-use loops, Managed Agents for server-hosted agents with a managed sandbox, prompt caching, and general Anthropic SDK usage; (4) Claude Tag (Claude in Slack) - what it is, setting it up for a Slack workspace, \`/install-slack-app\`; (5) \`claude plugin eval\` (writing and running plugin eval suites, its JSON/report, sandbox, CI) and the \`/skill-doctor\` report. **IMPORTANT:** Before spawning a new agent, check if there is already a running or recently completed claude-code-guide agent that you can continue via ${SENDMESSAGE}.`,
    get tools() {
      return hasEmbeddedSearchTools() && isBashAvailable()
        ? [BASH_TOOL_NAME, READ, WEBFETCH, WEBSEARCH]
        : [GLOB_TOOL_NAME, GREP_TOOL_NAME, READ, WEBFETCH, WEBSEARCH];
    },
    source: "built-in",
    baseDir: "built-in",
    model: "haiku",
    permissionMode: "dontAsk",
    getSystemPrompt({ toolUseContext }) {
      let commands = toolUseContext.options.commands;
      let contextSections = [];
      let customCommands = uniqByExport(commands, "name").filter((cmd) => cmd.type === "prompt");
      if (customCommands.length > 0) {
        let commandList = customCommands.map((cmd) => `- /${cmd.name}: ${cmd.description}`).join(`
`);
        contextSections.push(`**Available custom skills in this project:**
${commandList}`);
      }
      let customAgents = toolUseContext.options.agentDefinitions.activeAgents.filter(
        (activeAgent) => activeAgent.source !== "built-in",
      );
      if (customAgents.length > 0) {
        let agentList = customAgents.map(
          (customAgent) => `- ${customAgent.agentType}: ${customAgent.whenToUse}`,
        ).join(`
`);
        contextSections.push(`**Available custom agents configured:**
${agentList}`);
      }
      let mcpClients = toolUseContext.options.mcpClients;
      if (mcpClients && mcpClients.length > 0) {
        let mcpList = mcpClients.map((client) => `- ${client.name}`).join(`
`);
        contextSections.push(`**Configured MCP servers:**
${mcpList}`);
      }
      let pluginCommands = commands.filter((cmd) => cmd.type === "prompt" && cmd.source === "plugin");
      if (pluginCommands.length > 0) {
        let pluginList = pluginCommands.map((cmd) => `- /${cmd.name}: ${cmd.description}`).join(`
`);
        contextSections.push(`**Available plugin skills:**
${pluginList}`);
      }
      let settings = Object.keys(getSettings_DEPRECATED()).sort();
      if (settings.length > 0)
        contextSections.push(
          `**Settings keys configured (values omitted):** ${settings.join(", ")}. To see values, the user can run the in-session \`/config\` command or open \`~/.claude/settings.json\`.`,
        );
      let feedbackGuideline = getFeedbackGuideline();
      let basePromptWithFeedback = `${getClaudeCodeGuideBasePrompt()}
${feedbackGuideline}

---

${getPluginEvalReferenceSection()}`;
      if (contextSections.length > 0)
        return `${basePromptWithFeedback}

---

# User's Current Configuration

The user has the following custom setup in their environment:

${contextSections.join(`

`)}

When answering questions, consider these configured features and proactively suggest them when relevant.`;
      return basePromptWithFeedback;
    },
  };
});
export { CLAUDE_CODE_GUIDE_AGENT };

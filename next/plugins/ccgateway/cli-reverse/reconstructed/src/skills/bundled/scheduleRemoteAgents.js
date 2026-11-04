/**
 * skills/bundled/scheduleRemoteAgents.ts
 *
 * 并入已有模块：远程代理定时技能补充。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/scheduleRemoteAgents.ts
 * pieces: chunk-6mwt0myy.js (2), chunk-dcmhvw5a.js (1), chunk-m3arwd1y.js (13)
 * attribution: placement 2, fingerprint 6, callgraph-fingerprint 1, affinity 1, layout 5, file-local 1
 */
import { uuidToBigInt, base58Encode } from "../../utils/taggedId.js";
import { normalizeConnectorId } from "../../services/mcp/claudeai.js";
import { isPluginServerConfig } from "../../services/mcp/types.js";
import { plural } from "../../utils/stringUtils.js";
import { getRemoteUrl } from "../../utils/git.js";
import {
  parseGitRemote,
  isNestedGitLabProject,
  detectCurrentRepositoryWithHost,
} from "../../utils/detectRepository.js";
import { validateCatalogAliases } from "../../utils/model/modelCatalog.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { REMOTETRIGGER } from "../../tools/RemoteTriggerTool/prompt.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { SCHEDULE } from "./bundledSkillNames.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isClaudeAISubscriber, hasStoredOAuthToken, hasOAuthScope } from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_ROUTINES } from "../../tools/RemoteTriggerTool/policy.js";
import { CLOUD_SESSIONS_POLICY } from "../../services/cloudSessions/cloudSessionsPolicy.js";
import { fetchEnvironments, createDefaultCloudEnvironment } from "../../utils/teleport/environments.js";
import { logForDebugging } from "../../utils/debug.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { checkRepoForRemoteAccess } from "../../utils/background/remote/preconditions.js";
import { githubNotConnectedMessage, isWebSetupOfferable } from "../../services/cloudSessions/webSetup.js";
import { getSuppressedClaudeAiConnectors } from "../../utils/permissions/toolPermissionContext.js";
import {
  getMcpServerSignature,
  shouldSkipClaudeAiFetchForEnterpriseLockdown,
} from "../../services/mcp/config.js";
import { uniq } from "../../utils/collections.js";
import { getStrictMcpConfig } from "../../bootstrap/state.js";
import { isBareMode } from "../../utils/envUtils.js";
import { hasDisableClaudeAiConnectors } from "../../utils/settings/settings.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6mwt0myy.js:1431-1501 placement
/**
 * 用连接器前缀与 base58(uuid) 拼出 id，失败返回 undefined。
 */
function connectorScopedAgentId(agentIdPrefix, uuid) {
  try {
    let uuidValue = uuidToBigInt(uuid);
    return `${agentIdPrefix}_01${base58Encode(uuidValue)}`;
  } catch {
    return;
  }
}
//@ chunk-6mwt0myy.js:1501-1694 fingerprint (2.1.88 match: BASE58, 1)
function BASE58(encoded) {
  if (encoded.length !== 22) return;
  let radix = BigInt(58);
  let value = 0n;
  for (let char of encoded) {
    let index = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".indexOf(char);
    if (index < 0) return;
    value = value * radix + BigInt(index);
  }
  return value;
}
//@ chunk-dcmhvw5a.js:71894-71956 callgraph-fingerprint (2.1.88 match: getConnectedClaudeAIConnectors, 0.455)
/**
 * getConnectedClaudeAIConnectors（实为 isConnectedOrCached）：连接状态为 connected 或 cached。
 */
function isConnectedOrCached(mcpClients) {
  return mcpClients.type === "connected" || mcpClients.type === "cached";
}
//@ chunk-m3arwd1y.js:12143-12210 affinity (2.1.88 match: BASE58, 1)
var BASE58_2 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
//@ chunk-m3arwd1y.js:12210-12528 fingerprint (2.1.88 match: taggedIdToUUID, 1)
function taggedIdToUUID(taggedId) {
  let normalizedId = normalizeConnectorId(taggedId);
  let prefix = "mcpsrv_";
  if (!normalizedId.startsWith("mcpsrv_")) return null;
  let rest = normalizedId.slice(7).slice(2);
  let n = 0n;
  for (let char of rest) {
    let idx = BASE58_2.indexOf(char);
    if (idx === -1) return null;
    n = n * 58n + BigInt(idx);
  }
  let hex = n.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
//@ chunk-m3arwd1y.js:12528-12637 layout
function isClaudeAiConnectorConfig(config) {
  if (config.type !== "claudeai-proxy") return false;
  return config.scope === "claudeai" || (config.scope === "dynamic" && !isPluginServerConfig(config));
}
//@ chunk-m3arwd1y.js:12637-12677 layout
/**
 * 判断 MCP 客户端是否可用于 claude.ai 连接器（已连接/缓存且配置匹配）。
 */
function isUsableClaudeAiConnector(client) {
  return isConnectedOrCached(client) && isClaudeAiConnectorConfig(client.config);
}
//@ chunk-m3arwd1y.js:12677-12870 placement (2.1.88 match: _temp2, 1)
function collectClaudeAiConnectors(client_0) {
  let connectors = [];
  for (let client of client_0) {
    if (!isUsableClaudeAiConnector(client)) continue;
    if (client.config.type !== "claudeai-proxy") continue;
    let uuid = taggedIdToUUID(client.config.id);
    if (!uuid) continue;
    connectors.push({
      uuid,
      name: client.name,
      url: client.config.url,
    });
  }
  return connectors;
}
//@ chunk-m3arwd1y.js:12870-12935 layout (2.1.88 match: SCOPE_ORDER, 0.845)
var SCOPE_ORDER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-m3arwd1y.js:12870", () => {
  SCOPE_ORDER = new Set(["local", "user", "project", "enterprise", "managed"]);
});
//@ chunk-m3arwd1y.js:12935-13029 file-local
function sanitizeConnectorName(name) {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
//@ chunk-m3arwd1y.js:13029-19179 layout
/**
 * 为 /schedule 远程代理提示词生成 MCP 连接器说明：列出已连接的 claude.ai 连接器（uuid、名称、URL）；没有时按原因（托管锁定、受限配置、退出、安全模式、缺少权限、仍在连接）给出对应解释，并说明仅本地的服务器和同名重复项。
 */
function buildConnectorsInfo({
  connectors,
  localOnlyServerCount,
  suppressedTwinCount,
  suppressedTwinLabels,
  connectorFetchSkipReason,
  hasUnlistedTrustedConnector,
}) {
  let lines = [];
  if (connectors.length === 0) {
    lines.push(
      connectorFetchSkipReason === "lockdown"
        ? "Loading of claude.ai connectors is disabled in this Claude Code session by the organization's managed MCP configuration, so none are listed here. Connectors configured on claude.ai remain available to cloud routines there."
        : connectorFetchSkipReason === "restricted"
          ? "claude.ai connectors are not loaded in this Claude Code session (MCP servers are restricted to explicitly passed config here, e.g. --strict-mcp-config or --bare), so none are listed. Connectors the user has on claude.ai remain available to cloud routines there."
          : connectorFetchSkipReason === "optout"
            ? "Automatic loading of claude.ai connectors is disabled in this Claude Code session (disableClaudeAiConnectors setting or ENABLE_CLAUDEAI_MCP_SERVERS env var), so none are listed here. Connectors the user has connected on claude.ai remain available to cloud routines there."
            : connectorFetchSkipReason === "safe-mode"
              ? "claude.ai connectors are not loaded in this Claude Code session (safe mode), so none are listed here. Connectors the user has connected on claude.ai remain available to cloud routines there."
              : connectorFetchSkipReason === "missing-scope"
                ? "claude.ai connectors could not be loaded in this Claude Code session (the session's login token does not include the MCP-connectors permission), so none are listed here. Connectors the user has connected on claude.ai remain available to cloud routines there."
                : hasUnlistedTrustedConnector
                  ? "No MCP connectors are currently connected in this Claude Code session, but a claude.ai connector for this account exists and is still connecting or failed to connect client-side. Routines use connectors server-side on claude.ai, so do not assert that the user must connect one; they can check https://claude.ai/customize/connectors."
                  : "No available MCP connectors found. The user may need to connect servers at https://claude.ai/customize/connectors.",
    );
    if (localOnlyServerCount === 0)
      lines.push(
        "Note that MCP servers configured directly in Claude Code (e.g. with `claude mcp add`) cannot be attached to cloud routines \u2014 routines can only use claude.ai connectors.",
      );
  } else {
    lines.push("Available connectors (usable by routines):");
    let mapped = connectors.map((connector) => ({
      connector,
      baseName:
        sanitizeConnectorName(connector.name.replace(/^claude[.\s-]ai[.\s-]/i, "")) ||
        `connector_${connector.uuid.slice(0, 8)}`,
    }));
    let baseNames = new Set(mapped.map((entry) => entry.baseName));
    let usedNames = new Set();
    let displayNames = new Map();
    for (let entry of mapped)
      if (
        entry.connector.name.replace(/^claude[.\s-]ai[.\s-]/i, "") === entry.baseName &&
        !usedNames.has(entry.baseName)
      ) {
        displayNames.set(entry, entry.baseName);
        usedNames.add(entry.baseName);
      }
    for (let entry of mapped) {
      if (displayNames.has(entry)) continue;
      let baseName = entry.baseName;
      if (usedNames.has(baseName))
        for (let idx = 2; usedNames.has(baseName) || baseNames.has(baseName); idx++)
          baseName = `${entry.baseName}-${idx}`;
      usedNames.add(baseName);
      displayNames.set(entry, baseName);
    }
    for (let entry of mapped) {
      let displayName = displayNames.get(entry) ?? entry.baseName;
      lines.push(
        `- ${displayName} (connector_uuid: ${entry.connector.uuid}, name: ${displayName}, url: ${entry.connector.url})`,
      );
    }
    if (hasUnlistedTrustedConnector)
      lines.push(
        "Another claude.ai connector for this account exists but is not currently connected in this session (still connecting, or its client-side connect failed), so it is not listed above. Routines can still use it server-side on claude.ai \u2014 do not assert that the user must connect it.",
      );
    if (connectorFetchSkipReason !== null)
      lines.push(
        "The claude.ai connector list was not loaded in this session, so connectors beyond those listed above may already exist on claude.ai \u2014 do not assert that the user must connect a service that is not listed.",
      );
  }
  let hasNoConnectors = connectors.length === 0 && connectorFetchSkipReason !== null;
  if (localOnlyServerCount > 0)
    lines.push(
      `${localOnlyServerCount} MCP ${plural(localOnlyServerCount, "server is", "servers are")} configured directly in Claude Code and NOT available to routines (the user can run /mcp to see ${plural(localOnlyServerCount, "it", "them")}). Routines can only use claude.ai connectors${hasNoConnectors ? `. As explained above, the claude.ai connector list was not loaded in this session, so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : connectorFetchSkipReason === "lockdown" ? `. Loading of claude.ai connectors is disabled in this Claude Code session by the organization's managed MCP configuration, so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : connectorFetchSkipReason === "restricted" ? `. claude.ai connectors are not loaded in this Claude Code session (MCP servers are restricted to explicitly passed config here), so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : connectorFetchSkipReason === "optout" ? `. Automatic loading of claude.ai connectors is disabled in this Claude Code session (disableClaudeAiConnectors setting or ENABLE_CLAUDEAI_MCP_SERVERS env var), so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one; suggest checking https://claude.ai/customize/connectors.` : connectorFetchSkipReason === "safe-mode" ? `. claude.ai connectors are not loaded in this Claude Code session (safe mode), so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : connectorFetchSkipReason === "missing-scope" ? `. claude.ai connectors could not be loaded in this Claude Code session (the session's login token does not include the MCP-connectors permission), so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : " \u2014 to use one of those services in a routine, the user must connect it at https://claude.ai/customize/connectors."}`,
    );
  if (suppressedTwinCount > 0) {
    let labelSuffix = suppressedTwinLabels.length > 0 ? ` (${suppressedTwinLabels.join(", ")})` : "";
    lines.push(
      `Note: ${suppressedTwinCount} claude.ai ${plural(suppressedTwinCount, "connector")}${labelSuffix} ${plural(suppressedTwinCount, "is", "are")} not active in this Claude Code session because ${plural(suppressedTwinCount, "a manually-configured server points", "manually-configured servers point")} at the same ${plural(suppressedTwinCount, "service")}. ${plural(suppressedTwinCount, "It remains", "They remain")} connected on claude.ai and available to routines there \u2014 connector details are not listed in this session, so to attach ${plural(suppressedTwinCount, "it", "them")} explicitly the user should manage the routine's connectors at https://claude.ai/code/routines.`,
    );
  }
  return lines.join(`
`);
}
//@ chunk-m3arwd1y.js:19179-19242 layout
var SCHEDULE_MENU_QUESTION = "What would you like to do with scheduled cloud agents?";
//@ chunk-m3arwd1y.js:19242-19315 fingerprint (2.1.88 match: formatSetupNotes, 1)
function formatSetupNotes(notes) {
  return `\u26A0 Heads-up:
${notes.map((n) => `- ${n}`).join(`
`)}`;
}
//@ chunk-m3arwd1y.js:19315-19454 fingerprint (2.1.88 match: getCurrentRepoHttpsUrl, 1)
async function getCurrentRepoHttpsUrl() {
  let remoteUrl = await getRemoteUrl();
  if (!remoteUrl) return null;
  let parsed = parseGitRemote(remoteUrl);
  if (!parsed || isNestedGitLabProject(parsed)) return null;
  return `https://${parsed.host}/${parsed.owner}/${parsed.name}`;
}
//@ chunk-m3arwd1y.js:19454-31118 fingerprint (2.1.88 match: buildPrompt, 0.832)
/**
 * /schedule skill 的主提示词：列出/创建/更新/运行远程定时代理的流程、仓库与环境选择、连接器说明。
 */
function buildPrompt(opts) {
  let {
    userTimezone,
    nowUtcIso,
    nowLocal,
    connectorsInfo,
    gitRepoUrl,
    environmentsInfo,
    createdEnvironment,
    setupNotes,
    needsGitHubAccessReminder,
    userArgs,
  } = opts;
  let setupNotesSection =
    userArgs && setupNotes.length > 0
      ? `
## Setup Notes

${formatSetupNotes(setupNotes)}
`
      : "";
  let initialQuestion =
    setupNotes.length > 0
      ? `${formatSetupNotes(setupNotes)}

${SCHEDULE_MENU_QUESTION}`
      : SCHEDULE_MENU_QUESTION;
  let aliases = validateCatalogAliases("sonnet");
  return `# Schedule Cloud Agents

You are helping the user schedule, update, list, or run **cloud** Claude Code agents. These are NOT local cron jobs \u2014 each routine spawns a fully isolated cloud session (CCR) in Anthropic's cloud infrastructure, either on a recurring cron schedule or once at a specific time. The agent runs in a sandboxed environment with its own git checkout, tools, and optional MCP connections.

## First Step

${
  userArgs
    ? "The user has already told you what they want (see User Request at the bottom). Skip the initial question and go directly to the matching workflow."
    : `Your FIRST action must be a single ${ASKUSERQUESTION} tool call (no preamble). Use this EXACT string for the \`question\` field \u2014 do not paraphrase or shorten it:

${jsonStringify(initialQuestion)}

Set \`header: "Action"\` and offer the four actions (create/list/update/run) as options. After the user picks, follow the matching workflow below.`
}
${setupNotesSection}

## What You Can Do

Use the \`${REMOTETRIGGER}\` tool (load it first with \`ToolSearch select:${REMOTETRIGGER}\`; auth is handled in-process \u2014 do not use curl):

- \`{action: "list"}\` \u2014 list all routines
- \`{action: "get", trigger_id: "..."}\` \u2014 fetch one routine
- \`{action: "create", body: {...}}\` \u2014 create a routine
- \`{action: "update", trigger_id: "...", body: {...}}\` \u2014 partial update
- \`{action: "run", trigger_id: "..."}\` \u2014 run a routine now
- \`{action: "list_runs", trigger_id: "..."}\` \u2014 the routine's recent run sessions, most recently active first
- \`{action: "get_run_log", session_id: "..."}\` \u2014 condensed log of one run (provisioning, tool calls and errors, permission denials, API retries, final result)

To debug a routine that misbehaved, call \`list_runs\` and then \`get_run_log\` on the run in question. A fire that was skipped or refused before a session existed (routine paused, a fire cap, a kill switch) or that failed its pre-creation checks (repository access, environment) leaves no run in \`list_runs\`, and a routine that posts into an existing session adds to that session rather than a new run; when the list is empty or short, check the routine itself with \`get\` rather than concluding it never fired.

(Note: the API uses \`trigger_id\` as the parameter name, but the user-facing term is "routine".)

You CANNOT delete routines. If the user asks to delete, direct them to: https://claude.ai/code/routines

## Create body shape

For a recurring schedule:

\`\`\`json
{
  "name": "AGENT_NAME",
  "cron_expression": "CRON_EXPR",
  "enabled": true,
  "job_config": {
    "ccr": {
      "environment_id": "ENVIRONMENT_ID",
      "session_context": {
        "model": "${aliases}",
        "sources": [
          {"git_repository": {"url": "${gitRepoUrl || "https://github.com/ORG/REPO"}"}}
        ],
        "allowed_tools": ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
      },
      "events": [
        {"data": {
          "uuid": "<lowercase v4 uuid>",
          "session_id": "",
          "type": "user",
          "parent_tool_use_id": null,
          "message": {"content": "PROMPT_HERE", "role": "user"}
        }}
      ]
    }
  }
}
\`\`\`

For a one-time run, replace \`"cron_expression": "CRON_EXPR"\` with \`"run_once_at": "YYYY-MM-DDTHH:MM:SSZ"\` (RFC3339 UTC, must be in the future). Everything else is identical.

Generate a fresh lowercase UUID for \`events[].data.uuid\` yourself.

Every \`events[].data.message\` must be the API message shape \`{"role": "user", "content": "..."}\` \u2014 the \`role\` field is required, never omit it. If you instead write the body in the \`session_request\` form that list and get return, the same rule applies to \`session_request.events[].payload.message\`.

## Available MCP Connectors

These are the user's currently connected claude.ai MCP connectors:

${connectorsInfo}

When attaching connectors to a routine, use the \`connector_uuid\` and \`name\` shown above (the name is already sanitized to only contain letters, numbers, hyphens, and underscores), and the connector's URL. The \`name\` field in \`mcp_connections\` must only contain \`[a-zA-Z0-9_-]\` \u2014 dots and spaces are NOT allowed.

**Important:** Infer what services the agent needs from the user's description. For example, if they say "check Datadog and Slack me errors," the agent needs both Datadog and Slack connectors. Cross-reference against the list above and warn if any required service isn't connected. If a needed connector is missing, direct the user to https://claude.ai/customize/connectors to connect it first.

## Environments

Every routine requires an \`environment_id\` in the job config. This determines where the cloud agent runs. Ask the user which environment to use.

${environmentsInfo}

Use the \`id\` value as the \`environment_id\` in \`job_config.ccr.environment_id\`.
${
  createdEnvironment
    ? `
**Note:** A new environment \`${createdEnvironment.name}\` (id: \`${createdEnvironment.environment_id}\`) was just created for the user because they had none. Use this id for \`job_config.ccr.environment_id\` and mention the creation when you confirm the routine config.
`
    : ""
}

## API Field Reference

### Create Routine \u2014 Required Fields
- \`name\` (string) \u2014 A descriptive name
- Exactly ONE of:
  - \`cron_expression\` (string) \u2014 5-field cron in UTC. **Minimum interval is 1 hour.**
  - \`run_once_at\` (string) \u2014 RFC3339 UTC timestamp. Must be in the future. Fires once, then auto-disables.
- \`job_config\` (object) \u2014 Session configuration (see structure above)

### Create Routine \u2014 Optional Fields
- \`enabled\` (boolean, default: true)
- \`mcp_connections\` (array) \u2014 MCP servers to attach:
  \`\`\`json
  [{"connector_uuid": "uuid", "name": "server-name", "url": "https://..."}]
  \`\`\`

### Update Routine \u2014 Optional Fields
All fields optional (partial update):
- \`name\`, \`cron_expression\`, \`run_once_at\`, \`enabled\`, \`job_config\`
- \`mcp_connections\` \u2014 Replace MCP connections
- \`clear_mcp_connections\` (boolean) \u2014 Remove all MCP connections

### Cron Expression Examples

The user's local timezone is **${userTimezone}**. Cron expressions and \`run_once_at\` timestamps are always in UTC. When the user says a local time, convert it to UTC but confirm with them: "9am ${userTimezone} = Xam UTC, so the cron would be \`0 X * * 1-5\`." For one-time runs, the same conversion applies \u2014 "run this at 3pm" \u2192 \`"run_once_at": "YYYY-MM-DDTHH:00:00Z"\` with their 3pm converted to UTC.

- \`0 9 * * 1-5\` \u2014 Every weekday at 9am **UTC**
- \`0 */2 * * *\` \u2014 Every 2 hours
- \`0 0 * * *\` \u2014 Daily at midnight **UTC**
- \`30 14 * * 1\` \u2014 Every Monday at 2:30pm **UTC**
- \`0 8 1 * *\` \u2014 First of every month at 8am **UTC**

Minimum interval is 1 hour. \`*/30 * * * *\` will be rejected.

### Current Time (for one-off runs)

When /schedule was invoked it was **${nowLocal}** (${userTimezone}) / **${nowUtcIso}** UTC. Treat this as an approximate anchor only \u2014 the conversation may have been running for a while since then.

**Before computing any \`run_once_at\` value, you MUST re-check the current time** by running \`date -u +%Y-%m-%dT%H:%M:%SZ\` via the Bash tool. Do not guess or infer today's date from conversation context. Resolve relative requests ("tomorrow at 9am", "in 3 hours", "next Monday") against the freshly fetched time, then echo the resolved local time AND the UTC timestamp back to the user for confirmation before creating the routine. If the resolved time is already in the past, ask the user to clarify rather than silently rolling forward.

## Workflow

### CREATE a new routine:

1. **Understand the goal** \u2014 Ask what they want the cloud agent to do. What repo(s)? What task? Remind them that the agent runs in the cloud \u2014 it won't have access to their local machine, local files, or local environment variables.
2. **Craft the prompt** \u2014 Help them write an effective agent prompt. Good prompts are:
   - Specific about what to do and what success looks like
   - Clear about which files/areas to focus on
   - Explicit about what actions to take (open PRs, commit, just analyze, etc.)
3. **Set the schedule** \u2014 Ask when and how often. The user's timezone is ${userTimezone}. When they say a time (e.g., "every morning at 9am"), assume they mean their local time and convert to UTC for the cron expression. Always confirm the conversion: "9am ${userTimezone} = Xam UTC." If they want a one-time run (e.g., "once at 3pm", "tomorrow morning", "remind me to check X later"), use \`run_once_at\` instead of \`cron_expression\` \u2014 same timezone conversion applies. **First re-check the current time with \`date -u\` via Bash** (the reference time above may be stale in a long conversation), resolve the relative phrase against that fresh value, and confirm the resulting absolute timestamp with the user.
4. **Choose the model** \u2014 Default to \`${aliases}\`. Tell the user which model you're defaulting to and ask if they want a different one.
5. **Validate connections** \u2014 Infer what services the agent will need from the user's description. For example, if they say "check Datadog and Slack me errors," the agent needs both Datadog and Slack MCP connectors. Cross-reference with the connectors list above. If any are missing, warn the user and link them to https://claude.ai/customize/connectors to connect first.${gitRepoUrl ? ` The default git repo is already set to \`${gitRepoUrl}\`. Ask the user if this is the right repo or if they need a different one.` : " Ask which git repos the cloud agent needs cloned into its environment."}
6. **Review and confirm** \u2014 Show the full configuration before creating. Let them adjust.
7. **Create it** \u2014 Call \`${REMOTETRIGGER}\` with \`action: "create"\` and show the result. The response includes the routine ID. Always output a link at the end: \`https://claude.ai/code/routines/{ROUTINE_ID}\`

### UPDATE a routine:

1. List routines first so they can pick one
2. Ask what they want to change
3. Show current vs proposed value
4. Confirm and update

### LIST routines:

1. Fetch and display in a readable format
2. Show: name, schedule (human-readable), enabled/disabled, next run, repo(s)

### RUN NOW:

1. List routines if they haven't specified which one
2. Confirm which routine
3. Execute and confirm

## Important Notes

- These are CLOUD agents \u2014 they run in Anthropic's cloud, not on the user's machine. They cannot access local files, local services, or local environment variables.
- Always convert cron to human-readable when displaying
- When listing routines, \`ended_reason: "run_once_fired"\` means a one-shot already ran (shows as "Ran" in the web UI). The user can re-arm it by updating with a new \`run_once_at\`.
- Default to \`enabled: true\` unless user says otherwise
- Accept GitHub URLs in any format (https://github.com/org/repo, org/repo, etc.) and normalize to the full HTTPS URL (without .git suffix)
- The prompt is the most important part \u2014 spend time getting it right. The cloud agent starts with zero context, so the prompt must be self-contained.
- To delete a routine, direct users to https://claude.ai/code/routines
${needsGitHubAccessReminder ? "- If the user's request seems to require GitHub repo access (e.g. cloning a repo, opening PRs, reading code), remind them of the GitHub access setup note above and its remedy \u2014 otherwise the cloud agent won't be able to access the repo." : ""}
${
  userArgs
    ? `
## User Request

The user said: "${userArgs}"

Start by understanding their intent and working through the appropriate workflow above.`
    : ""
}`;
}
//@ chunk-m3arwd1y.js:31118-37070 fingerprint (2.1.88 match: registerScheduleRemoteAgentsSkill, 0.411)
/**
 * 注册 /schedule 内置 skill（管理定时云端代理 routines）：需要 claude.ai 登录、非 CLAUDE_CODE_REMOTE、且策略允许 routines。
 */
function registerScheduleRemoteAgentsSkill() {
  registerBundledSkill({
    name: SCHEDULE,
    menuDescription: "Create and manage routines: cloud agents on a schedule",
    aliases: ["routines"],
    description:
      "Create, update, list, or run scheduled cloud agents (routines) that execute on a cron schedule.",
    whenToUse:
      'When the user wants to schedule a recurring cloud agent, set up automated tasks, create a cron job for Claude Code, or manage their scheduled agents/routines. Also use when the user wants a one-time scheduled run ("run this once at 3pm", "remind me to check X tomorrow").',
    userInvocable: true,
    isEnabled: () =>
      isFirstPartyProvider() &&
      isClaudeAISubscriber() &&
      !env.CLAUDE_CODE_REMOTE &&
      isPolicyAllowed(ALLOW_ROUTINES),
    policyGate: CLOUD_SESSIONS_POLICY,
    allowedTools: [REMOTETRIGGER, ASKUSERQUESTION, "Bash(date *)"],
    async getPromptForCommand(userArgs, context) {
      if (!hasStoredOAuthToken())
        return [
          {
            type: "text",
            text: "You need to authenticate with a claude.ai account first. API accounts are not supported. Run /login, then try /schedule again.",
          },
        ];
      let environments = [];
      let createdEnvironment = null;
      let setupNotes = [];
      let needsGitHubAccessReminder = false;
      let gitRepoUrl = null;
      if (context.options?.isSkillPreload)
        setupNotes.push("Environment and repository details are resolved when the skill is actually run.");
      else {
        try {
          environments = await fetchEnvironments(undefined, context.storageV5, context.credentials);
        } catch (err) {
          logForDebugging(`[schedule] Failed to fetch environments: ${err}`, {
            level: "warn",
          });
          return [
            {
              type: "text",
              text: "We're having trouble connecting with your remote claude.ai account to set up a scheduled task. Please try /schedule again in a few minutes.",
            },
          ];
        }
        if (environments.length === 0)
          try {
            createdEnvironment = await createDefaultCloudEnvironment();
            environments = [createdEnvironment];
          } catch (err) {
            logForDebugging(`[schedule] Failed to create environment: ${err}`, {
              level: "warn",
            });
            return [
              {
                type: "text",
                text: "No remote environments found, and we could not create one automatically. Visit https://claude.ai/code to set one up, then run /schedule again.",
              },
            ];
          }
        let repo = await detectCurrentRepositoryWithHost();
        if (repo === null)
          setupNotes.push(
            "Not in a git repo \u2014 you'll need to specify a repo URL manually (or skip repos entirely).",
          );
        else if (isGithubDotCom(repo.host)) {
          let access = await checkRepoForRemoteAccess(repo.owner, repo.name);
          if (!access.hasAccess) {
            needsGitHubAccessReminder = true;
            let repoSlug = `${repo.owner}/${repo.name}`;
            let accessNote =
              access.reason === "transient"
                ? `Couldn't verify GitHub access for ${repoSlug} (the check failed in a way that may be temporary) \u2014 if your routine needs this repo and this persists, install the Claude GitHub App at https://claude.ai/code/onboarding?magic=github-app-setup.`
                : access.reason === "github_not_connected"
                  ? githubNotConnectedMessage(repoSlug)
                  : isWebSetupOfferable()
                    ? `GitHub not connected for ${repoSlug} \u2014 run /web-setup to sync your GitHub credentials, or install the Claude GitHub App at https://claude.ai/code/onboarding?magic=github-app-setup.`
                    : `Claude GitHub App not installed on ${repoSlug} \u2014 install at https://claude.ai/code/onboarding?magic=github-app-setup if your routine needs this repo.`;
            setupNotes.push(accessNote);
          }
        }
        gitRepoUrl = await getCurrentRepoHttpsUrl();
      }
      let connectors = collectClaudeAiConnectors(context.options.mcpClients);
      let suppressedClaudeAiConnectors = getSuppressedClaudeAiConnectors(context);
      let duplicateNames = new Set(
        suppressedClaudeAiConnectors.map(
          (suppressedClaudeAiConnector) => suppressedClaudeAiConnector.duplicateOf,
        ),
      );
      let claudeAiSignatures = new Set();
      for (let mcpClient of context.options.mcpClients)
        if (
          (isClaudeAiConnectorConfig(mcpClient.config) &&
            (isConnectedOrCached(mcpClient) ||
              ((mcpClient.type === "failed" || mcpClient.type === "pending") &&
                mcpClient.config.scope === "claudeai"))) ||
          duplicateNames.has(mcpClient.name)
        ) {
          let mcpServerSignature = getMcpServerSignature(mcpClient.config);
          if (mcpServerSignature !== null) claudeAiSignatures.add(mcpServerSignature);
        }
      let any = context.options.mcpClients.some(
        (mcpClient) =>
          isClaudeAiConnectorConfig(mcpClient.config) &&
          (mcpClient.type === "failed" || mcpClient.type === "pending") &&
          mcpClient.config.scope === "claudeai",
      );
      let size = new Set(
        context.options.mcpClients
          .filter((mcpClient) => {
            if (
              !SCOPE_ORDER.has(mcpClient.config.scope) ||
              mcpClient.config.type === "sdk" ||
              mcpClient.type === "disabled" ||
              duplicateNames.has(mcpClient.name)
            )
              return false;
            let mcpServerSignature = getMcpServerSignature(mcpClient.config);
            return mcpServerSignature === null || !claudeAiSignatures.has(mcpServerSignature);
          })
          .map((mcpClient) => mcpClient.name),
      ).size;
      let suppressedLabels = uniq(
        suppressedClaudeAiConnectors
          .map((suppressedClaudeAiConnector) =>
            sanitizeConnectorName(suppressedClaudeAiConnector.name.replace(/^claude[.\s-]ai[.\s-]/i, "")),
          )
          .filter((label) => label.length > 0),
      );
      let isMissingMcpScope = !hasOAuthScope("user:mcp_servers");
      let fetchSkipReason = shouldSkipClaudeAiFetchForEnterpriseLockdown()
        ? "lockdown"
        : getStrictMcpConfig() || isBareMode()
          ? "restricted"
          : env.ENABLE_CLAUDEAI_MCP_SERVERS === false || hasDisableClaudeAiConnectors()
            ? "optout"
            : isCustomizationDisabled("mcpClaudeAi")
              ? "safe-mode"
              : isMissingMcpScope
                ? "missing-scope"
                : null;
      if (connectors.length === 0) {
        let skipReasonText =
          fetchSkipReason === "lockdown"
            ? "claude.ai connectors are not loaded in this session (your organization manages MCP servers); any configured on claude.ai remain available to routines there."
            : fetchSkipReason === "restricted"
              ? "claude.ai connectors are not loaded in this session (MCP servers are restricted to explicitly passed config); any on claude.ai remain available to routines there."
              : fetchSkipReason === "optout"
                ? "claude.ai connectors are disabled in this session (disableClaudeAiConnectors setting or ENABLE_CLAUDEAI_MCP_SERVERS env var); any already connected on claude.ai remain available to routines there."
                : fetchSkipReason === "safe-mode"
                  ? "claude.ai connectors are not loaded in this session (safe mode); any connected on claude.ai remain available to routines there."
                  : fetchSkipReason === "missing-scope"
                    ? "claude.ai connectors could not be loaded in this session (the login token does not include the MCP-connectors permission); any connected on claude.ai remain available to routines there."
                    : any
                      ? "A claude.ai connector for this account exists but isn't connected in this session right now (still connecting, or its last connect failed); it remains available to routines on claude.ai."
                      : "Connect one at https://claude.ai/customize/connectors if needed.";
        setupNotes.push(
          size > 0
            ? `No MCP connectors for cloud routines \u2014 ${size} MCP ${plural(size, "server")} configured in Claude Code can't be attached to routines (run /mcp to see ${plural(size, "it", "them")}); routines can only use claude.ai connectors. ${skipReasonText}`
            : fetchSkipReason !== null || any
              ? `No MCP connectors \u2014 ${skipReasonText}`
              : "No MCP connectors \u2014 connect at https://claude.ai/customize/connectors if needed.",
        );
        if (suppressedClaudeAiConnectors.length > 0) {
          let suppressedCount = suppressedClaudeAiConnectors.length;
          let labelSuffix = suppressedLabels.length > 0 ? ` (${suppressedLabels.join(", ")})` : "";
          setupNotes.push(
            `${suppressedCount} claude.ai ${plural(suppressedCount, "connector")}${labelSuffix} ${plural(suppressedCount, "is", "are")} not active in this session (${plural(suppressedCount, "a server configured in Claude Code covers", "servers configured in Claude Code cover")} the same ${plural(suppressedCount, "service")}), but ${plural(suppressedCount, "it remains", "they remain")} available to routines on claude.ai.`,
          );
        }
      }
      let userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let date = new Date();
      let nowUtcIso = date.toISOString();
      let nowLocal = date.toLocaleString("en-US", {
        timeZone: userTimezone,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      let connectorsInfo = buildConnectorsInfo({
        connectors,
        localOnlyServerCount: size,
        suppressedTwinCount: suppressedClaudeAiConnectors.length,
        suppressedTwinLabels: suppressedLabels,
        connectorFetchSkipReason: fetchSkipReason,
        hasUnlistedTrustedConnector: any,
      });
      let lines = ["Available environments:"];
      for (let env of environments)
        lines.push(`- ${env.name} (id: ${env.environment_id}, kind: ${env.kind})`);
      let environmentsInfo = lines.join(`
`);
      return [
        {
          type: "text",
          text: buildPrompt({
            userTimezone,
            nowUtcIso,
            nowLocal,
            connectorsInfo,
            gitRepoUrl,
            environmentsInfo,
            createdEnvironment,
            setupNotes,
            needsGitHubAccessReminder,
            userArgs,
          }),
        },
      ];
    },
  });
}
export { isConnectedOrCached, connectorScopedAgentId, BASE58, registerScheduleRemoteAgentsSkill };

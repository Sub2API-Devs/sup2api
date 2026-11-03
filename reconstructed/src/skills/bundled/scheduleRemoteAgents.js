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
import { O$e } from "../../services/mcp/claudeai.js";
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
import { uuidToBigInt, base58Encode } from "../../utils/taggedId.js";

//@ chunk-m3arwd1y.js:12143-12210 affinity = BASE58 (1)
var BASE58_2 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
//@ chunk-m3arwd1y.js:12210-12528 fingerprint = taggedIdToUUID (1)
function taggedIdToUUID(taggedId) {
  let n = O$e(taggedId),
    prefix = "mcpsrv_";
  if (!n.startsWith("mcpsrv_")) return null;
  let rest = n.slice(7).slice(2),
    h = 0n;
  for (let f of rest) {
    let idx = BASE58_2.indexOf(f);
    if (idx === -1) return null;
    h = h * 58n + BigInt(idx);
  }
  let hex = h.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
//@ chunk-m3arwd1y.js:12528-12637 layout
function isClaudeAiConnectorConfig(s) {
  if (s.type !== "claudeai-proxy") return !1;
  return s.scope === "claudeai" || (s.scope === "dynamic" && !isPluginServerConfig(s));
}
//@ chunk-m3arwd1y.js:12637-12677 layout
function L(s) {
  return isConnectedOrCached(s) && isClaudeAiConnectorConfig(s.config);
}
//@ chunk-m3arwd1y.js:12677-12870 placement = _temp2 (1)
function collectClaudeAiConnectors(client_0) {
  let n = [];
  for (let a of client_0) {
    if (!L(a)) continue;
    if (a.config.type !== "claudeai-proxy") continue;
    let p = taggedIdToUUID(a.config.id);
    if (!p) continue;
    n.push({ uuid: p, name: a.name, url: a.config.url });
  }
  return n;
}
//@ chunk-m3arwd1y.js:12870-12935 layout = SCOPE_ORDER (0.845)
var SCOPE_ORDER = new Set(["local", "user", "project", "enterprise", "managed"]);
//@ chunk-m3arwd1y.js:12935-13029 file-local
function sanitizeConnectorName(name) {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
/**
 * 为 /schedule 远程代理提示词生成 MCP 连接器说明：列出已连接的 claude.ai 连接器（uuid、名称、URL）；没有时按原因（托管锁定、受限配置、退出、安全模式、缺少权限、仍在连接）给出对应解释，并说明仅本地的服务器和同名重复项。
 */
//@ chunk-m3arwd1y.js:13029-19179 layout
function buildConnectorsInfo({
  connectors: connectors,
  localOnlyServerCount: localOnlyServerCount,
  suppressedTwinCount: suppressedTwinCount,
  suppressedTwinLabels: suppressedTwinLabels,
  connectorFetchSkipReason: connectorFetchSkipReason,
  hasUnlistedTrustedConnector: hasUnlistedTrustedConnector,
}) {
  let lines = [];
  if (connectors.length === 0) {
    if (
      (lines.push(
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
      ),
      localOnlyServerCount === 0)
    )
      lines.push(
        "Note that MCP servers configured directly in Claude Code (e.g. with `claude mcp add`) cannot be attached to cloud routines \u2014 routines can only use claude.ai connectors.",
      );
  } else {
    lines.push("Available connectors (usable by routines):");
    let mapped = connectors.map((o) => ({
        connector: o,
        baseName:
          sanitizeConnectorName(o.name.replace(/^claude[.\s-]ai[.\s-]/i, "")) ||
          `connector_${o.uuid.slice(0, 8)}`,
      })),
      C = new Set(mapped.map((o) => o.baseName)),
      m = new Set(),
      displayNames = new Map();
    for (let o of mapped)
      if (o.connector.name.replace(/^claude[.\s-]ai[.\s-]/i, "") === o.baseName && !m.has(o.baseName))
        (displayNames.set(o, o.baseName), m.add(o.baseName));
    for (let o of mapped) {
      if (displayNames.has(o)) continue;
      let baseName = o.baseName;
      if (m.has(baseName))
        for (let b = 2; m.has(baseName) || C.has(baseName); b++) baseName = `${o.baseName}-${b}`;
      (m.add(baseName), displayNames.set(o, baseName));
    }
    for (let o of mapped) {
      let d = displayNames.get(o) ?? o.baseName;
      lines.push(`- ${d} (connector_uuid: ${o.connector.uuid}, name: ${d}, url: ${o.connector.url})`);
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
  let f = connectors.length === 0 && connectorFetchSkipReason !== null;
  if (localOnlyServerCount > 0)
    lines.push(
      `${localOnlyServerCount} MCP ${plural(localOnlyServerCount, "server is", "servers are")} configured directly in Claude Code and NOT available to routines (the user can run /mcp to see ${plural(localOnlyServerCount, "it", "them")}). Routines can only use claude.ai connectors${f ? `. As explained above, the claude.ai connector list was not loaded in this session, so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : connectorFetchSkipReason === "lockdown" ? `. Loading of claude.ai connectors is disabled in this Claude Code session by the organization's managed MCP configuration, so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : connectorFetchSkipReason === "restricted" ? `. claude.ai connectors are not loaded in this Claude Code session (MCP servers are restricted to explicitly passed config here), so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : connectorFetchSkipReason === "optout" ? `. Automatic loading of claude.ai connectors is disabled in this Claude Code session (disableClaudeAiConnectors setting or ENABLE_CLAUDEAI_MCP_SERVERS env var), so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one; suggest checking https://claude.ai/customize/connectors.` : connectorFetchSkipReason === "safe-mode" ? `. claude.ai connectors are not loaded in this Claude Code session (safe mode), so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : connectorFetchSkipReason === "missing-scope" ? `. claude.ai connectors could not be loaded in this Claude Code session (the session's login token does not include the MCP-connectors permission), so ${plural(localOnlyServerCount, "this service", "some of these services")} may already have a connector on claude.ai that routines can use \u2014 do not assert that the user must connect one.` : " \u2014 to use one of those services in a routine, the user must connect it at https://claude.ai/customize/connectors."}`,
    );
  if (suppressedTwinCount > 0) {
    let u = suppressedTwinLabels.length > 0 ? ` (${suppressedTwinLabels.join(", ")})` : "";
    lines.push(
      `Note: ${suppressedTwinCount} claude.ai ${plural(suppressedTwinCount, "connector")}${u} ${plural(suppressedTwinCount, "is", "are")} not active in this Claude Code session because ${plural(suppressedTwinCount, "a manually-configured server points", "manually-configured servers point")} at the same ${plural(suppressedTwinCount, "service")}. ${plural(suppressedTwinCount, "It remains", "They remain")} connected on claude.ai and available to routines there \u2014 connector details are not listed in this session, so to attach ${plural(suppressedTwinCount, "it", "them")} explicitly the user should manage the routine's connectors at https://claude.ai/code/routines.`,
    );
  }
  return lines.join(`
`);
}
//@ chunk-m3arwd1y.js:19179-19242 layout
var SCHEDULE_MENU_QUESTION = "What would you like to do with scheduled cloud agents?";
//@ chunk-m3arwd1y.js:19242-19315 fingerprint = formatSetupNotes (1)
function formatSetupNotes(notes) {
  return `\u26A0 Heads-up:
${notes.map((a) => `- ${a}`).join(`
`)}`;
}
//@ chunk-m3arwd1y.js:19315-19454 fingerprint = getCurrentRepoHttpsUrl (1)
async function getCurrentRepoHttpsUrl() {
  let remoteUrl = await getRemoteUrl();
  if (!remoteUrl) return null;
  let parsed = parseGitRemote(remoteUrl);
  if (!parsed || isNestedGitLabProject(parsed)) return null;
  return `https://${parsed.host}/${parsed.owner}/${parsed.name}`;
}
/**
 * /schedule skill 的主提示词：列出/创建/更新/运行远程定时代理的流程、仓库与环境选择、连接器说明。
 */
//@ chunk-m3arwd1y.js:19454-31118 fingerprint = buildPrompt (0.832)
function buildPrompt(opts) {
  let {
      userTimezone: userTimezone,
      nowUtcIso: nowUtcIso,
      nowLocal: nowLocal,
      connectorsInfo: connectorsInfo,
      gitRepoUrl: gitRepoUrl,
      environmentsInfo: environmentsInfo,
      createdEnvironment: createdEnvironment,
      setupNotes: setupNotes,
      needsGitHubAccessReminder: needsGitHubAccessReminder,
      userArgs: userArgs,
    } = opts,
    g =
      userArgs && setupNotes.length > 0
        ? `
## Setup Notes

${formatSetupNotes(setupNotes)}
`
        : "",
    o =
      setupNotes.length > 0
        ? `${formatSetupNotes(setupNotes)}

${SCHEDULE_MENU_QUESTION}`
        : SCHEDULE_MENU_QUESTION,
    d = validateCatalogAliases("sonnet");
  return `# Schedule Cloud Agents

You are helping the user schedule, update, list, or run **cloud** Claude Code agents. These are NOT local cron jobs \u2014 each routine spawns a fully isolated cloud session (CCR) in Anthropic's cloud infrastructure, either on a recurring cron schedule or once at a specific time. The agent runs in a sandboxed environment with its own git checkout, tools, and optional MCP connections.

## First Step

${
  userArgs
    ? "The user has already told you what they want (see User Request at the bottom). Skip the initial question and go directly to the matching workflow."
    : `Your FIRST action must be a single ${ASKUSERQUESTION} tool call (no preamble). Use this EXACT string for the \`question\` field \u2014 do not paraphrase or shorten it:

${jsonStringify(o)}

Set \`header: "Action"\` and offer the four actions (create/list/update/run) as options. After the user picks, follow the matching workflow below.`
}
${g}

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
        "model": "${d}",
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
4. **Choose the model** \u2014 Default to \`${d}\`. Tell the user which model you're defaulting to and ask if they want a different one.
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
/**
 * 注册 /schedule 内置 skill（管理定时云端代理 routines）：需要 claude.ai 登录、非 CLAUDE_CODE_REMOTE、且策略允许 routines。
 */
//@ chunk-m3arwd1y.js:31118-37070 fingerprint = registerScheduleRemoteAgentsSkill (0.411)
function registerScheduleRemoteAgentsSkill() {
  registerBundledSkill({
    name: SCHEDULE,
    menuDescription: "Create and manage routines: cloud agents on a schedule",
    aliases: ["routines"],
    description:
      "Create, update, list, or run scheduled cloud agents (routines) that execute on a cron schedule.",
    whenToUse:
      'When the user wants to schedule a recurring cloud agent, set up automated tasks, create a cron job for Claude Code, or manage their scheduled agents/routines. Also use when the user wants a one-time scheduled run ("run this once at 3pm", "remind me to check X tomorrow").',
    userInvocable: !0,
    isEnabled: () =>
      isFirstPartyProvider() &&
      isClaudeAISubscriber() &&
      !env.CLAUDE_CODE_REMOTE &&
      isPolicyAllowed(ALLOW_ROUTINES),
    policyGate: CLOUD_SESSIONS_POLICY,
    allowedTools: [REMOTETRIGGER, ASKUSERQUESTION, "Bash(date *)"],
    async getPromptForCommand(s, n) {
      if (!hasStoredOAuthToken())
        return [
          {
            type: "text",
            text: "You need to authenticate with a claude.ai account first. API accounts are not supported. Run /login, then try /schedule again.",
          },
        ];
      let a = [],
        p = null,
        r = [],
        h = !1,
        c = null;
      if (n.options?.isSkillPreload)
        r.push("Environment and repository details are resolved when the skill is actually run.");
      else {
        try {
          a = await fetchEnvironments(void 0, n.storageV5, n.credentials);
        } catch (err) {
          return (
            logForDebugging(`[schedule] Failed to fetch environments: ${err}`, { level: "warn" }),
            [
              {
                type: "text",
                text: "We're having trouble connecting with your remote claude.ai account to set up a scheduled task. Please try /schedule again in a few minutes.",
              },
            ]
          );
        }
        if (a.length === 0)
          try {
            ((p = await createDefaultCloudEnvironment()), (a = [p]));
          } catch (err) {
            return (
              logForDebugging(`[schedule] Failed to create environment: ${err}`, { level: "warn" }),
              [
                {
                  type: "text",
                  text: "No remote environments found, and we could not create one automatically. Visit https://claude.ai/code to set one up, then run /schedule again.",
                },
              ]
            );
          }
        let repo = await detectCurrentRepositoryWithHost();
        if (repo === null)
          r.push(
            "Not in a git repo \u2014 you'll need to specify a repo URL manually (or skip repos entirely).",
          );
        else if (isGithubDotCom(repo.host)) {
          let l = await checkRepoForRemoteAccess(repo.owner, repo.name);
          if (!l.hasAccess) {
            h = !0;
            let y = `${repo.owner}/${repo.name}`,
              U =
                l.reason === "transient"
                  ? `Couldn't verify GitHub access for ${y} (the check failed in a way that may be temporary) \u2014 if your routine needs this repo and this persists, install the Claude GitHub App at https://claude.ai/code/onboarding?magic=github-app-setup.`
                  : l.reason === "github_not_connected"
                    ? githubNotConnectedMessage(y)
                    : isWebSetupOfferable()
                      ? `GitHub not connected for ${y} \u2014 run /web-setup to sync your GitHub credentials, or install the Claude GitHub App at https://claude.ai/code/onboarding?magic=github-app-setup.`
                      : `Claude GitHub App not installed on ${y} \u2014 install at https://claude.ai/code/onboarding?magic=github-app-setup if your routine needs this repo.`;
            r.push(U);
          }
        }
        c = await getCurrentRepoHttpsUrl();
      }
      let connectors = collectClaudeAiConnectors(n.options.mcpClients),
        u = getSuppressedClaudeAiConnectors(n),
        C = new Set(u.map((e) => e.duplicateOf)),
        m = new Set();
      for (let mcpClient of n.options.mcpClients)
        if (
          (isClaudeAiConnectorConfig(mcpClient.config) &&
            (isConnectedOrCached(mcpClient) ||
              ((mcpClient.type === "failed" || mcpClient.type === "pending") &&
                mcpClient.config.scope === "claudeai"))) ||
          C.has(mcpClient.name)
        ) {
          let l = getMcpServerSignature(mcpClient.config);
          if (l !== null) m.add(l);
        }
      let any = n.options.mcpClients.some(
          (mcpClient) =>
            isClaudeAiConnectorConfig(mcpClient.config) &&
            (mcpClient.type === "failed" || mcpClient.type === "pending") &&
            mcpClient.config.scope === "claudeai",
        ),
        size = new Set(
          n.options.mcpClients
            .filter((mcpClient) => {
              if (
                !SCOPE_ORDER.has(mcpClient.config.scope) ||
                mcpClient.config.type === "sdk" ||
                mcpClient.type === "disabled" ||
                C.has(mcpClient.name)
              )
                return !1;
              let l = getMcpServerSignature(mcpClient.config);
              return l === null || !m.has(l);
            })
            .map((e) => e.name),
        ).size,
        d = uniq(
          u
            .map((e) => sanitizeConnectorName(e.name.replace(/^claude[.\s-]ai[.\s-]/i, "")))
            .filter((e) => e.length > 0),
        ),
        b = !hasOAuthScope("user:mcp_servers"),
        v = shouldSkipClaudeAiFetchForEnterpriseLockdown()
          ? "lockdown"
          : getStrictMcpConfig() || isBareMode()
            ? "restricted"
            : env.ENABLE_CLAUDEAI_MCP_SERVERS === !1 || hasDisableClaudeAiConnectors()
              ? "optout"
              : isCustomizationDisabled("mcpClaudeAi")
                ? "safe-mode"
                : b
                  ? "missing-scope"
                  : null;
      if (connectors.length === 0) {
        let e =
          v === "lockdown"
            ? "claude.ai connectors are not loaded in this session (your organization manages MCP servers); any configured on claude.ai remain available to routines there."
            : v === "restricted"
              ? "claude.ai connectors are not loaded in this session (MCP servers are restricted to explicitly passed config); any on claude.ai remain available to routines there."
              : v === "optout"
                ? "claude.ai connectors are disabled in this session (disableClaudeAiConnectors setting or ENABLE_CLAUDEAI_MCP_SERVERS env var); any already connected on claude.ai remain available to routines there."
                : v === "safe-mode"
                  ? "claude.ai connectors are not loaded in this session (safe mode); any connected on claude.ai remain available to routines there."
                  : v === "missing-scope"
                    ? "claude.ai connectors could not be loaded in this session (the login token does not include the MCP-connectors permission); any connected on claude.ai remain available to routines there."
                    : any
                      ? "A claude.ai connector for this account exists but isn't connected in this session right now (still connecting, or its last connect failed); it remains available to routines on claude.ai."
                      : "Connect one at https://claude.ai/customize/connectors if needed.";
        if (
          (r.push(
            size > 0
              ? `No MCP connectors for cloud routines \u2014 ${size} MCP ${plural(size, "server")} configured in Claude Code can't be attached to routines (run /mcp to see ${plural(size, "it", "them")}); routines can only use claude.ai connectors. ${e}`
              : v !== null || any
                ? `No MCP connectors \u2014 ${e}`
                : "No MCP connectors \u2014 connect at https://claude.ai/customize/connectors if needed.",
          ),
          u.length > 0)
        ) {
          let l = u.length,
            y = d.length > 0 ? ` (${d.join(", ")})` : "";
          r.push(
            `${l} claude.ai ${plural(l, "connector")}${y} ${plural(l, "is", "are")} not active in this session (${plural(l, "a server configured in Claude Code covers", "servers configured in Claude Code cover")} the same ${plural(l, "service")}), but ${plural(l, "it remains", "they remain")} available to routines on claude.ai.`,
          );
        }
      }
      let userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
        date = new Date(),
        iso = date.toISOString(),
        N = date.toLocaleString("en-US", {
          timeZone: userTimezone,
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        connectorsInfo = buildConnectorsInfo({
          connectors: connectors,
          localOnlyServerCount: size,
          suppressedTwinCount: u.length,
          suppressedTwinLabels: d,
          connectorFetchSkipReason: v,
          hasUnlistedTrustedConnector: any,
        }),
        lines = ["Available environments:"];
      for (let env of a) lines.push(`- ${env.name} (id: ${env.environment_id}, kind: ${env.kind})`);
      let joined = lines.join(`
`);
      return [
        {
          type: "text",
          text: buildPrompt({
            userTimezone: userTimezone,
            nowUtcIso: iso,
            nowLocal: N,
            connectorsInfo: connectorsInfo,
            gitRepoUrl: c,
            environmentsInfo: joined,
            createdEnvironment: p,
            setupNotes: r,
            needsGitHubAccessReminder: h,
            userArgs: s,
          }),
        },
      ];
    },
  });
}
//@ chunk-6mwt0myy.js:1431-1501 placement
function zbr(e, n) {
  try {
    let r = uuidToBigInt(n);
    return `${e}_01${base58Encode(r)}`;
  } catch {
    return;
  }
}
//@ chunk-6mwt0myy.js:1501-1694 fingerprint = BASE58 (1)
function BASE58(e) {
  if (e.length !== 22) return;
  let n = BigInt(58),
    r = 0n;
  for (let t of e) {
    let index = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".indexOf(t);
    if (index < 0) return;
    r = r * n + BigInt(index);
  }
  return r;
}
/**
 * getConnectedClaudeAIConnectors（实为 isConnectedOrCached）：连接状态为 connected 或 cached。
 */
//@ chunk-dcmhvw5a.js:71894-71956 callgraph-fingerprint = getConnectedClaudeAIConnectors (0.455)
function isConnectedOrCached(mcpClients) {
  return mcpClients.type === "connected" || mcpClients.type === "cached";
}

export { isConnectedOrCached, zbr, BASE58 };

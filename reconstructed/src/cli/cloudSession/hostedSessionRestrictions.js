/**
 * cli/cloudSession/hostedSessionRestrictions.ts
 *
 * 2.1.316 新增：托管（云端）会话对控制请求的路由与限制、丢失的 SDK 功能说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (27)
 * attribution: placement 27
 */
import { splitRuleList, rIi } from "../../utils/permissions/disallowedToolsFlag.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { HOSTED_RULES_FLAG } from "../startup/launcherHostLogin.js";
import { uniq, count } from "../../utils/collections.js";
import { quotedPrintable } from "../../utils/printableName.js";
import { classifyRuleParens } from "../../utils/permissions/permissionRuleParser.js";
import { mcpInfoFromString, MCP_TOOL_PREFIX } from "../../services/mcp/mcpStringUtils.js";
import { normalizeNameForMCP, yhe, CLAUDE_AI } from "../../services/mcp/normalization.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { sanitizeCloudText } from "./headlessCloudClient.js";

//@ chunk-3wek6r2k.js:19020-19250 placement
function collectDisallowedToolRules(e) {
  let o = splitRuleList([...e]),
    found = o.find(rIi);
  if (found !== void 0) return { kind: "unclosed", rule: found };
  return getFeatureValue_CACHED_MAY_BE_STALE(HOSTED_RULES_FLAG, !0) === !1
    ? { kind: "rules", rules: o, blocksNothing: [] }
    : {
        kind: "rules",
        rules: uniq([...o, ...o.flatMap(claudeAiRuleRespellings)]),
        blocksNothing: uniq(o.filter(isClaudeAiWildcardRule)),
      };
}
//@ chunk-3wek6r2k.js:19250-19669 placement
function lostDisallowedTools(e) {
  if (e.length === 0) return [];
  let joined = e
    .slice(0, 8)
    .map((n) => `"${quotedPrintable(n, 64)}"`)
    .join(", ");
  return [
    {
      kind: "lost",
      name: "--disallowed-tools",
      why: `any other rules apply, but not ${e.length > 8 ? `${joined} and ${e.length - 8} more` : joined}: a * in a claude.ai connector's name blocks no connector in a cloud session; start a new session with one rule for each connector, such as mcp__claude_ai_Slack or mcp__claude_ai_Slack__<tool>`,
    },
  ];
}
//@ chunk-3wek6r2k.js:19669-19810 placement
function parseMcpRuleTool(e) {
  let o = classifyRuleParens(e);
  if (o.kind === "malformed") return null;
  let n = o.kind === "call" ? o.toolName : e,
    r = mcpInfoFromString(n);
  return r === null ? null : { ...r, name: n };
}
//@ chunk-3wek6r2k.js:19810-19849 placement
function lc(e) {
  return normalizeNameForMCP(yhe + e) === CLAUDE_AI + e;
}
//@ chunk-3wek6r2k.js:19849-20029 placement
function claudeAiRuleRespellings(e) {
  let o = parseMcpRuleTool(e);
  if (!o?.serverName.startsWith(CLAUDE_AI)) return [];
  let sliced = o.serverName.slice(CLAUDE_AI.length);
  return lc(sliced) ? [`${MCP_TOOL_PREFIX}${sliced}__${o.toolName ?? "*"}${e.slice(o.name.length)}`] : [];
}
//@ chunk-3wek6r2k.js:20029-20151 placement
function isClaudeAiWildcardRule(e) {
  let o = parseMcpRuleTool(e)?.serverName ?? "";
  return o.includes("*") && (o.startsWith(CLAUDE_AI) || o.startsWith(`${CLAUDE_AI.slice(0, -1)}*`));
}
//@ chunk-3wek6r2k.js:20151-20447 placement
function disallowedToolsTelemetry(e = []) {
  let o = new Set(e),
    n = new Set(e.flatMap(claudeAiRuleRespellings));
  return {
    disallowed_tools_connector_both_names_count: count(e, (r) =>
      claudeAiRuleRespellings(r).some((u) => o.has(u)),
    ),
    disallowed_tools_connector_local_name_only_count: count(
      e,
      (r) => !n.has(r) && claudeAiRuleRespellings(r).some((u) => !o.has(u)),
    ),
    disallowed_tools_connector_wildcard_count: count(e, isClaudeAiWildcardRule),
  };
}
//@ chunk-3wek6r2k.js:20484-20563 placement
function isNonEmptyValue(e) {
  return e !== void 0 && e !== null && !(Array.isArray(e) && e.length === 0);
}
//@ chunk-3wek6r2k.js:20563-20766 placement
var NOT_SUPPORTED_IN_CLOUD = "is not supported in a cloud-hosted session",
  LOCAL_PATH_IN_CLOUD = "names a path on this machine; the agent's files are in the cloud container",
  UNAVAILABLE_WHILE_DRIVING_CLOUD = "is not available while this process drives a cloud-hosted session";
//@ chunk-3wek6r2k.js:20766-20912 placement
function cloudOptionsRefusal(e) {
  return `these options cannot apply to a cloud-hosted session, where the agent runs in the cloud container; remove: ${e.join(", ")}`;
}
//@ chunk-3wek6r2k.js:20912-21504 placement
var HOSTED_SESSION_REFUSAL_TEXT = "bypassPermissions is not available in a cloud-hosted session",
  fc = "file rewinding is not available in a cloud-hosted session: the cloud agent keeps no file checkpoints",
  gc =
    "MCP server changes are not available in a cloud-hosted session yet; this machine's MCP servers reach cloud sessions through the device link",
  MMs = new Set([
    "mcp_read_resource_v1",
    "sdk_mcp_tools_list_changed",
    "sdk_mcp_manifests",
    "register_repo_root_v1",
    "interrupt_requeue_taken_v1",
    "start_shell_task_v1",
  ]),
  hc = new Set([
    "model",
    "advisorModel",
    "effortLevel",
    "ultracode",
    "fastMode",
    "viewMode",
    "alwaysThinkingEnabled",
  ]);
//@ chunk-3wek6r2k.js:21504-21588 placement
function Sc(e) {
  return typeof e === "object" && e !== null && "subtype" in e ? e.subtype : void 0;
}
//@ chunk-3wek6r2k.js:21588-21751 placement
function routeHostedControlRequest(e, o) {
  let n = hostedControlRequestRoute(e, o);
  return n === null
    ? {
        route: { kind: "reject", error: `${_c(Sc(e))} ${NOT_SUPPORTED_IN_CLOUD}` },
        telemetrySubtype: "unknown",
      }
    : { route: n, telemetrySubtype: e.subtype };
}
//@ chunk-3wek6r2k.js:21751-21760 placement
var Tr = 8;
//@ chunk-3wek6r2k.js:21760-21894 placement
function listForRefusal(e) {
  let mapped = e.slice(0, Tr).map((n) => truncateToLength(sanitizeCloudText(n), 64));
  return e.length > Tr ? `${mapped.join(", ")} (and ${e.length - Tr} more)` : mapped.join(", ");
}
//@ chunk-3wek6r2k.js:21894-21986 placement
function _c(e) {
  return typeof e === "string"
    ? truncateToLength(sanitizeCloudText(e), 64)
    : "a request without a string subtype";
}
/**
 * 决定云托管会话中各 SDK 控制请求的去向：转发给云 worker、在本地处理或拒绝（如 set_proactivity_level、apply_flag_settings 的部分键）。
 */
//@ chunk-3wek6r2k.js:21986-26721 placement
function hostedControlRequestRoute(e, o) {
  let n = { kind: "forward", holdsLaterSends: !1 },
    r = { kind: "forward", holdsLaterSends: !0 };
  if (e.subtype === "set_proactivity_level")
    return { kind: "reject", error: "set_proactivity_level is not available in a cloud-hosted session yet" };
  switch (e.subtype) {
    case "initialize":
    case "interrupt":
    case "end_session":
    case "cancel_async_message":
      return { kind: "local", handler: e.subtype };
    case "set_permission_mode":
      return o.strict && e.mode === "bypassPermissions"
        ? { kind: "reject", error: HOSTED_SESSION_REFUSAL_TEXT }
        : r;
    case "set_model":
    case "set_max_thinking_tokens":
    case "mcp_toggle":
    case "mcp_reconnect":
    case "reload_skills":
    case "reload_output_styles":
    case "set_mcp_permission_mode_override":
    case "set_chrome_browser_hints":
    case "set_prompt_suggestions_paused":
      return r;
    case "reload_plugins":
      return isNonEmptyValue(e.add_plugins)
        ? { kind: "reject", error: `reload_plugins add_plugins ${LOCAL_PATH_IN_CLOUD}` }
        : r;
    case "apply_flag_settings": {
      let u = unknownKeys(e.settings);
      return u === null
        ? { kind: "reject", error: "apply_flag_settings requires settings to be an object" }
        : u.length > 0
          ? {
              kind: "reject",
              error: `apply_flag_settings keys not available in a cloud-hosted session: ${listForRefusal(u)}`,
            }
          : r;
    }
    case "update_settings":
      return { kind: "reject", error: "update_settings is not available in a cloud-hosted session yet" };
    case "get_memory_dialog":
      return { kind: "reject", error: "get_memory_dialog is not available in a cloud-hosted session" };
    case "get_skills_dialog":
      return { kind: "reject", error: "get_skills_dialog is not available in a cloud-hosted session" };
    case "get_status":
      return { kind: "reject", error: "get_status is not available in a cloud-hosted session" };
    case "export_conversation":
      return { kind: "reject", error: "export_conversation is not available in a cloud-hosted session" };
    case "list_cloud_sessions":
    case "get_cloud_session":
    case "get_cloud_session_transcript":
      return { kind: "reject", error: `${e.subtype} is not available in a cloud-hosted session` };
    case "get_chrome_dialog":
      return { kind: "reject", error: "get_chrome_dialog is not available in a cloud-hosted session" };
    case "get_chrome_browsers":
      return { kind: "reject", error: "get_chrome_browsers is not available in a cloud-hosted session" };
    case "select_chrome_browser":
      return { kind: "reject", error: "select_chrome_browser is not available in a cloud-hosted session" };
    case "get_sandbox_dialog":
      return { kind: "reject", error: "get_sandbox_dialog is not available in a cloud-hosted session" };
    case "rewind_conversation":
      return r;
    case "fork_conversation":
      return { kind: "reject", error: "fork_conversation is not available in a cloud-hosted session" };
    case "seed_read_state":
      return r;
    case "rewind_files":
      return { kind: "reject", error: fc };
    case "get_context_usage":
    case "get_session_cost":
    case "mcp_status":
    case "list_models":
    case "get_usage":
    case "get_binary_version":
    case "file_suggestions":
    case "read_file":
    case "list_directory":
    case "get_workspace_diff":
    case "get_plan":
    case "stop_task":
    case "background_tasks":
    case "get_task_output":
    case "send_task_message":
    case "get_settings":
    case "get_hooks_listing":
    case "list_permission_rules":
    case "submit_feedback":
    case "submit_survey_feedback":
    case "message_rated":
    case "generate_session_title":
    case "side_question":
    case "mcp_call":
      return n;
    case "prefetch_attachments":
      return n;
    case "rename_session":
      return n;
    case "mcp_set_servers":
      return { kind: "reject", error: gc };
    case "set_cwd":
    case "claim_session":
    case "add_directory":
    case "register_repo_root":
      return { kind: "reject", error: `${e.subtype} ${LOCAL_PATH_IN_CLOUD}` };
    case "remote_control":
    case "channel_enable":
    case "ultrareview_launch":
    case "claude_authenticate":
    case "claude_oauth_callback":
    case "claude_oauth_wait_for_completion":
    case "mcp_authenticate":
    case "mcp_clear_auth":
    case "mcp_oauth_callback_url":
    case "set_color":
      return { kind: "reject", error: `${e.subtype} ${UNAVAILABLE_WHILE_DRIVING_CLOUD}` };
    case "mcp_message":
      return { kind: "reject", error: "SDK MCP servers are not available in a cloud-hosted session" };
    case "mcp_read_resource":
      return { kind: "reject", error: "mcp_read_resource is not available in a cloud-hosted session yet" };
    case "poll_event":
      return { kind: "reject", error: "poll_event is not available in a cloud-hosted session yet" };
    case "start_shell_task":
      return { kind: "reject", error: `start_shell_task ${NOT_SUPPORTED_IN_CLOUD}` };
    case "stage_file":
    case "turn_handoff":
    case "mcp_tasks_changed":
      return { kind: "reject", error: `${e.subtype} is sent to a cloud agent by the service, not by a host` };
    case "register_device_hooks":
    case "upload_device_hook_template":
    case "remote_tools_announce":
      return {
        kind: "reject",
        error: `${e.subtype} is sent to a cloud agent by the attached client, not by a host`,
      };
    case "can_use_tool":
    case "hook_callback":
    case "elicitation":
    case "request_user_dialog":
    case "oauth_token_refresh":
    case "host_auth_token_refresh":
    case "remote_tool_call":
    case "remote_plumbing_call":
    case "remote_tools_probe":
    case "remote_tools_reannounce":
    case "remote_control_work_secret":
      return { kind: "reject", error: `${e.subtype} is agent-originated and cannot be sent by a host` };
    default:
      return null;
  }
}
//@ chunk-3wek6r2k.js:26721-26845 placement
function unknownKeys(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return null;
  return Object.keys(e).filter((o) => !hc.has(o));
}
//@ chunk-3wek6r2k.js:26845-27558 placement
var CLOUD_OPTION_TREATMENT = {
    systemPrompt: "lost",
    appendSystemPrompt: "lost",
    agents: "lost",
    jsonSchema: "lost",
    skills: "lost",
    title: "preference",
    planModeInstructions: "lost",
    systemPromptSnapshot: "lost",
    toolAliases: "lost",
    codeRunningMcpTools: "lost",
    excludeDynamicSections: "preference",
    appendSubagentSystemPrompt: "lost",
    promptSuggestions: "preference",
    agentProgressSummaries: "preference",
    forwardSubagentText: "lost",
    forwardNestedSubagentToolCalls: "lost",
    webSearchIsolationExemptMcpServers: "lost",
    supportedDialogKinds: "preference",
    perTaskStopAffordance: "lost",
    rapidFollowupPreempt: "preference",
    rendersChromeSetupOffer: "lost",
    plugins: "lost",
    workspaceTrust: "preference",
    proactivity: "preference",
    attachServeRequest: "preference",
  },
  keys = Object.keys(CLOUD_OPTION_TREATMENT);
//@ chunk-3wek6r2k.js:27558-27595 placement
function cloudOptionTreatment(e) {
  return CLOUD_OPTION_TREATMENT[e] ?? "lost";
}
//@ chunk-3wek6r2k.js:27595-27610 placement
var bc = new Set();
//@ chunk-3wek6r2k.js:27610-27720 placement
function hasNonEmptyArrays(e) {
  return (
    typeof e === "object" && e !== null && Object.values(e).some((o) => Array.isArray(o) && o.length > 0)
  );
}
//@ chunk-3wek6r2k.js:27720-28093 placement
function agentDefinitionRestricts(e) {
  if (typeof e !== "object" || e === null) return !1;
  let o = "tools" in e ? e.tools : void 0,
    n = "disallowedTools" in e ? e.disallowedTools : void 0,
    r = "hooks" in e ? e.hooks : void 0,
    u = "permissionMode" in e ? e.permissionMode : void 0,
    p = (S) => Array.isArray(S) && S.length === 1 && S[0] === "*",
    h = (S) => Array.isArray(S) && S.length > 0;
  return (
    (o !== void 0 && !p(o)) || (h(n) && !p(n)) || hasNonEmptyArrays(r) || u === "plan" || u === "dontAsk"
  );
}
//@ chunk-3wek6r2k.js:28093-28266 placement
function restrictedAgentNames(e) {
  if (e === void 0) return [];
  if (typeof e !== "object" || e === null || Array.isArray(e)) return ["(unreadable)"];
  return Object.entries(e)
    .filter(([, o]) => agentDefinitionRestricts(o))
    .map(([o]) => o);
}
//@ chunk-3wek6r2k.js:28266-28444 placement
var CLOUD_LOST_FEATURE_TEXT =
    "agent definitions that list tools or hooks, or set a permission mode, are not enforced by a cloud session",
  Or = "structured output is not delivered to a cloud session yet";
//@ chunk-3wek6r2k.js:28444-28954 placement
function lostSdkFeatures(e, o, n = bc) {
  let r = hasNonEmptyArrays(e.hooks),
    sdkMcpServers = e.sdkMcpServers,
    p = Array.isArray(sdkMcpServers) && sdkMcpServers.length > 0,
    h = e.jsonSchema !== void 0,
    S = restrictedAgentNames(e.agents),
    y = [
      ...(r ? ["hooks"] : []),
      ...(p ? ["sdkMcpServers"] : []),
      ...(S.length > 0 ? ["agents"] : []),
      ...(h ? ["jsonSchema"] : []),
    ],
    filtered = keys.filter((E) => e[E] !== void 0 && !n.has(E) && !y.includes(E) && !Mc(E, e[E]));
  if (y.length > 0 && o === "strict")
    return {
      outcome: "reject",
      error: cloudOptionsRefusal(
        y.map((E) =>
          E === "jsonSchema"
            ? `jsonSchema (${Or})`
            : E === "agents"
              ? `agents (${listForRefusal(S)}: ${CLOUD_LOST_FEATURE_TEXT})`
              : E,
        ),
      ),
      ignored: filtered,
    };
  return { outcome: "accept", ignored: [...y, ...filtered] };
}
//@ chunk-3wek6r2k.js:28954-29040 placement
function Mc(e, o) {
  return e === "systemPrompt" && Array.isArray(o) && o.length === 1 && o[0] === "";
}

export {
  disallowedToolsTelemetry,
  isNonEmptyValue,
  collectDisallowedToolRules,
  Or,
  hasNonEmptyArrays,
  agentDefinitionRestricts,
  lostDisallowedTools,
  MMs,
  routeHostedControlRequest,
  lostSdkFeatures,
  cloudOptionTreatment,
};

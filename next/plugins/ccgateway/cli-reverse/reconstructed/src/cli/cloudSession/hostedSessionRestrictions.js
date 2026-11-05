/**
 * cli/cloudSession/hostedSessionRestrictions.ts
 *
 * 2.1.316 新增：托管（云端）会话对控制请求的路由与限制、丢失的 SDK 功能说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (20), chunk-jscvyyh4.js (8)
 * attribution: placement 27, layout 1
 */
import { splitRuleList, hasUnclosedRuleParen } from "../../utils/permissions/disallowedToolsFlag.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { HOSTED_RULES_FLAG } from "../startup/launcherHostLogin.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { quotedPrintable } from "../../utils/printableName.js";
import { classifyRuleParens } from "../../utils/permissions/permissionRuleParser.js";
import { mcpInfoFromString, MCP_TOOL_PREFIX } from "../../services/mcp/mcpStringUtils.js";
import {
  CLAUDEAI_SERVER_PREFIX,
  CLAUDE_AI_NAME_PREFIX,
  CLAUDE_AI,
} from "../../services/mcp/normalization.js";
import { countWhere } from "../../utils/collections.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { sanitizeCloudText } from "./headlessCloudClient.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-jscvyyh4.js:451-679 placement
function collectDisallowedToolRules(rules) {
  let split = splitRuleList([...rules]);
  let found = split.find(hasUnclosedRuleParen);
  if (found !== undefined)
    return {
      kind: "unclosed",
      rule: found,
    };
  return getFeatureValue_CACHED_MAY_BE_STALE(HOSTED_RULES_FLAG, true) === false
    ? {
        kind: "rules",
        rules: split,
        blocksNothing: [],
      }
    : {
        kind: "rules",
        rules: normalizeCaseForComparison_2([...split, ...split.flatMap(claudeAiRuleRespellings)]),
        blocksNothing: normalizeCaseForComparison_2(split.filter(isClaudeAiWildcardRule)),
      };
}
//@ chunk-jscvyyh4.js:679-801 layout (2.1.88 match: formatFailureDetails, 0.776)
function formatFailureDetails(values) {
  let joined = values
    .slice(0, 8)
    .map((value) => `"${quotedPrintable(value, 64)}"`)
    .join(", ");
  return values.length > 8 ? `${joined} and ${values.length - 8} more` : joined;
}
//@ chunk-jscvyyh4.js:801-1129 placement
function lostDisallowedTools(blocksNothing) {
  if (blocksNothing.length === 0) return [];
  return [
    {
      kind: "lost",
      name: "--disallowed-tools",
      why: `any other rules apply, but not ${formatFailureDetails(blocksNothing)}: a * in a claude.ai connector's name blocks no connector in a cloud session; start a new session with one rule for each connector, such as mcp__claude_ai_Slack or mcp__claude_ai_Slack__<tool>`,
    },
  ];
}
//@ chunk-jscvyyh4.js:1129-1269 placement
function parseMcpRuleTool(rule) {
  let parens = classifyRuleParens(rule);
  if (parens.kind === "malformed") return null;
  let toolName = parens.kind === "call" ? parens.toolName : rule;
  let mcpInfo = mcpInfoFromString(toolName);
  return mcpInfo === null
    ? null
    : {
        ...mcpInfo,
        name: toolName,
      };
}
//@ chunk-jscvyyh4.js:1269-1307 placement
function isAnthropicMcpToolName(name) {
  return CLAUDEAI_SERVER_PREFIX(CLAUDE_AI_NAME_PREFIX + name) === CLAUDE_AI + name;
}
//@ chunk-jscvyyh4.js:1307-1484 placement
function claudeAiRuleRespellings(rule) {
  let mcpRuleTool = parseMcpRuleTool(rule);
  if (!mcpRuleTool?.serverName.startsWith(CLAUDE_AI)) return [];
  let name = mcpRuleTool.serverName.slice(CLAUDE_AI.length);
  return isAnthropicMcpToolName(name)
    ? [`${MCP_TOOL_PREFIX}${name}__${mcpRuleTool.toolName ?? "*"}${rule.slice(mcpRuleTool.name.length)}`]
    : [];
}
//@ chunk-jscvyyh4.js:1484-1604 placement
function isClaudeAiWildcardRule(rule) {
  let serverName = parseMcpRuleTool(rule)?.serverName ?? "";
  return (
    serverName.includes("*") &&
    (serverName.startsWith(CLAUDE_AI) || serverName.startsWith(`${CLAUDE_AI.slice(0, -1)}*`))
  );
}
//@ chunk-jscvyyh4.js:1604-1896 placement
function disallowedToolsTelemetry(rules = []) {
  let known = new Set(rules);
  let respelled = new Set(rules.flatMap(claudeAiRuleRespellings));
  return {
    disallowed_tools_connector_both_names_count: countWhere(rules, (rule) =>
      claudeAiRuleRespellings(rule).some((respelling) => known.has(respelling)),
    ),
    disallowed_tools_connector_local_name_only_count: countWhere(
      rules,
      (rule) =>
        !respelled.has(rule) && claudeAiRuleRespellings(rule).some((respelling) => !known.has(respelling)),
    ),
    disallowed_tools_connector_wildcard_count: countWhere(rules, isClaudeAiWildcardRule),
  };
}
//@ chunk-hjswk319.js:19791-19870 placement
function isNonEmptyValue(addPlugins) {
  return (
    addPlugins !== undefined && addPlugins !== null && !(Array.isArray(addPlugins) && addPlugins.length === 0)
  );
}
//@ chunk-hjswk319.js:19870-20073 placement
var NOT_SUPPORTED_IN_CLOUD = "is not supported in a cloud-hosted session";
var LOCAL_PATH_IN_CLOUD = "names a path on this machine; the agent's files are in the cloud container";
var UNAVAILABLE_WHILE_DRIVING_CLOUD = "is not available while this process drives a cloud-hosted session";
//@ chunk-hjswk319.js:20073-20219 placement
function cloudOptionsRefusal(names) {
  return `these options cannot apply to a cloud-hosted session, where the agent runs in the cloud container; remove: ${names.join(", ")}`;
}
//@ chunk-hjswk319.js:20219-20812 placement
/**
 * 云托管会话的限制文案与集合：bypassPermissions/文件回滚/MCP 变更不可用的说明，本地处理的控制请求子类型列表，以及允许透传的 settings 键。
 */
var HOSTED_SESSION_REFUSAL_TEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REWIND_UNAVAILABLE_IN_CLOUD;
var MCP_CHANGES_UNAVAILABLE_IN_CLOUD;
var CLOUD_LOCAL_CONTROL_TYPES;
var CLOUD_ALLOWED_SETTINGS_KEYS;
deferInit("chunk-hjswk319.js:20219", () => {
  HOSTED_SESSION_REFUSAL_TEXT = "bypassPermissions is not available in a cloud-hosted session";
  REWIND_UNAVAILABLE_IN_CLOUD =
    "file rewinding is not available in a cloud-hosted session: the cloud agent keeps no file checkpoints";
  MCP_CHANGES_UNAVAILABLE_IN_CLOUD =
    "MCP server changes are not available in a cloud-hosted session yet; this machine's MCP servers reach cloud sessions through the device link";
  CLOUD_LOCAL_CONTROL_TYPES = new Set([
    "mcp_read_resource_v1",
    "sdk_mcp_tools_list_changed",
    "sdk_mcp_manifests",
    "register_repo_root_v1",
    "interrupt_requeue_taken_v1",
    "start_shell_task_v1",
  ]);
  CLOUD_ALLOWED_SETTINGS_KEYS = new Set([
    "model",
    "advisorModel",
    "effortLevel",
    "ultracode",
    "fastMode",
    "viewMode",
    "alwaysThinkingEnabled",
  ]);
});
//@ chunk-hjswk319.js:20812-20896 placement
function controlRequestSubtypeOf(message) {
  return typeof message === "object" && message !== null && "subtype" in message
    ? message.subtype
    : undefined;
}
//@ chunk-hjswk319.js:20896-21059 placement
function routeHostedControlRequest(request, options) {
  let route = hostedControlRequestRoute(request, options);
  return route === null
    ? {
        route: {
          kind: "reject",
          error: `${describeRequestSubtype(controlRequestSubtypeOf(request))} ${NOT_SUPPORTED_IN_CLOUD}`,
        },
        telemetrySubtype: "unknown",
      }
    : {
        route,
        telemetrySubtype: request.subtype,
      };
}
//@ chunk-hjswk319.js:21059-21068 placement
var MAX_LISTED_REQUEST_TYPES = 8;
//@ chunk-hjswk319.js:21068-21202 placement
function listForRefusal(names) {
  let mapped = names
    .slice(0, MAX_LISTED_REQUEST_TYPES)
    .map((name) => truncateToLength(sanitizeCloudText(name), 64));
  return names.length > MAX_LISTED_REQUEST_TYPES
    ? `${mapped.join(", ")} (and ${names.length - MAX_LISTED_REQUEST_TYPES} more)`
    : mapped.join(", ");
}
//@ chunk-hjswk319.js:21202-21293 placement
function describeRequestSubtype(subtype) {
  return typeof subtype === "string"
    ? truncateToLength(sanitizeCloudText(subtype), 64)
    : "a request without a string subtype";
}
//@ chunk-hjswk319.js:21293-26056 placement
/**
 * 决定云托管会话中各 SDK 控制请求的去向：转发给云 worker、在本地处理或拒绝（如 set_proactivity_level、apply_flag_settings 的部分键）。
 */
function hostedControlRequestRoute(request, options) {
  let forwardNow = {
    kind: "forward",
    holdsLaterSends: false,
  };
  let forwardHeld = {
    kind: "forward",
    holdsLaterSends: true,
  };
  if (request.subtype === "set_proactivity_level")
    return {
      kind: "reject",
      error: "set_proactivity_level is not available in a cloud-hosted session yet",
    };
  switch (request.subtype) {
    case "initialize":
    case "interrupt":
    case "end_session":
    case "cancel_async_message":
      return {
        kind: "local",
        handler: request.subtype,
      };
    case "set_permission_mode":
      return options.strict && request.mode === "bypassPermissions"
        ? {
            kind: "reject",
            error: HOSTED_SESSION_REFUSAL_TEXT,
          }
        : forwardHeld;
    case "set_model":
    case "set_max_thinking_tokens":
    case "mcp_toggle":
    case "mcp_reconnect":
    case "reload_skills":
    case "reload_output_styles":
    case "set_mcp_permission_mode_override":
    case "set_chrome_browser_hints":
    case "set_prompt_suggestions_paused":
      return forwardHeld;
    case "reload_plugins":
      return isNonEmptyValue(request.add_plugins)
        ? {
            kind: "reject",
            error: `reload_plugins add_plugins ${LOCAL_PATH_IN_CLOUD}`,
          }
        : forwardHeld;
    case "apply_flag_settings": {
      let unknownSettingKeys = unknownKeys(request.settings);
      return unknownSettingKeys === null
        ? {
            kind: "reject",
            error: "apply_flag_settings requires settings to be an object",
          }
        : unknownSettingKeys.length > 0
          ? {
              kind: "reject",
              error: `apply_flag_settings keys not available in a cloud-hosted session: ${listForRefusal(unknownSettingKeys)}`,
            }
          : forwardHeld;
    }
    case "update_settings":
      return {
        kind: "reject",
        error: "update_settings is not available in a cloud-hosted session yet",
      };
    case "get_memory_dialog":
      return {
        kind: "reject",
        error: "get_memory_dialog is not available in a cloud-hosted session",
      };
    case "get_skills_dialog":
      return {
        kind: "reject",
        error: "get_skills_dialog is not available in a cloud-hosted session",
      };
    case "get_status":
      return {
        kind: "reject",
        error: "get_status is not available in a cloud-hosted session",
      };
    case "export_conversation":
      return {
        kind: "reject",
        error: "export_conversation is not available in a cloud-hosted session",
      };
    case "list_cloud_sessions":
    case "get_cloud_session":
    case "get_cloud_session_transcript":
      return {
        kind: "reject",
        error: `${request.subtype} is not available in a cloud-hosted session`,
      };
    case "get_chrome_dialog":
      return {
        kind: "reject",
        error: "get_chrome_dialog is not available in a cloud-hosted session",
      };
    case "get_chrome_browsers":
      return {
        kind: "reject",
        error: "get_chrome_browsers is not available in a cloud-hosted session",
      };
    case "select_chrome_browser":
      return {
        kind: "reject",
        error: "select_chrome_browser is not available in a cloud-hosted session",
      };
    case "get_sandbox_dialog":
      return {
        kind: "reject",
        error: "get_sandbox_dialog is not available in a cloud-hosted session",
      };
    case "rewind_conversation":
      return forwardHeld;
    case "fork_conversation":
      return {
        kind: "reject",
        error: "fork_conversation is not available in a cloud-hosted session",
      };
    case "seed_read_state":
      return forwardHeld;
    case "rewind_files":
      return {
        kind: "reject",
        error: REWIND_UNAVAILABLE_IN_CLOUD,
      };
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
      return forwardNow;
    case "prefetch_attachments":
      return forwardNow;
    case "rename_session":
      return forwardNow;
    case "mcp_set_servers":
      return {
        kind: "reject",
        error: MCP_CHANGES_UNAVAILABLE_IN_CLOUD,
      };
    case "set_cwd":
    case "claim_session":
    case "add_directory":
    case "register_repo_root":
      return {
        kind: "reject",
        error: `${request.subtype} ${LOCAL_PATH_IN_CLOUD}`,
      };
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
      return {
        kind: "reject",
        error: `${request.subtype} ${UNAVAILABLE_WHILE_DRIVING_CLOUD}`,
      };
    case "mcp_message":
      return {
        kind: "reject",
        error: "SDK MCP servers are not available in a cloud-hosted session",
      };
    case "mcp_read_resource":
      return {
        kind: "reject",
        error: "mcp_read_resource is not available in a cloud-hosted session yet",
      };
    case "poll_event":
      return {
        kind: "reject",
        error: "poll_event is not available in a cloud-hosted session yet",
      };
    case "start_shell_task":
      return {
        kind: "reject",
        error: `start_shell_task ${NOT_SUPPORTED_IN_CLOUD}`,
      };
    case "stage_file":
    case "turn_handoff":
    case "mcp_tasks_changed":
    case "set_attached_project":
      return {
        kind: "reject",
        error: `${request.subtype} is sent to a cloud agent by the service, not by a host`,
      };
    case "register_device_hooks":
    case "upload_device_hook_template":
    case "remote_tools_announce":
      return {
        kind: "reject",
        error: `${request.subtype} is sent to a cloud agent by the attached client, not by a host`,
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
      return {
        kind: "reject",
        error: `${request.subtype} is agent-originated and cannot be sent by a host`,
      };
    default:
      return null;
  }
}
//@ chunk-hjswk319.js:26056-26181 placement
function unknownKeys(settings) {
  if (typeof settings !== "object" || settings === null || Array.isArray(settings)) return null;
  return Object.keys(settings).filter((key) => !CLOUD_ALLOWED_SETTINGS_KEYS.has(key));
}
//@ chunk-hjswk319.js:26181-26894 placement
var CLOUD_OPTION_TREATMENT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var keys;
deferInit("chunk-hjswk319.js:26181", () => {
  CLOUD_OPTION_TREATMENT = {
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
  };
  keys = Object.keys(CLOUD_OPTION_TREATMENT);
});
//@ chunk-hjswk319.js:26894-26931 placement
function cloudOptionTreatment(optionName) {
  return CLOUD_OPTION_TREATMENT[optionName] ?? "lost";
}
//@ chunk-hjswk319.js:26931-26946 placement
var EMPTY_LOST_FEATURE_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hjswk319.js:26931", () => {
  EMPTY_LOST_FEATURE_SET = new Set();
});
//@ chunk-hjswk319.js:26946-27056 placement
function hasNonEmptyArrays(hooks) {
  return (
    typeof hooks === "object" &&
    hooks !== null &&
    Object.values(hooks).some((value) => Array.isArray(value) && value.length > 0)
  );
}
//@ chunk-hjswk319.js:27056-27429 placement
function agentDefinitionRestricts(agentDefinition) {
  if (typeof agentDefinition !== "object" || agentDefinition === null) return false;
  let tools = "tools" in agentDefinition ? agentDefinition.tools : undefined;
  let disallowedTools = "disallowedTools" in agentDefinition ? agentDefinition.disallowedTools : undefined;
  let hooks = "hooks" in agentDefinition ? agentDefinition.hooks : undefined;
  let permissionMode = "permissionMode" in agentDefinition ? agentDefinition.permissionMode : undefined;
  let isWildcardOnly = (value) => Array.isArray(value) && value.length === 1 && value[0] === "*";
  let isNonEmptyList = (disallowedTools) => Array.isArray(disallowedTools) && disallowedTools.length > 0;
  return (
    (tools !== undefined && !isWildcardOnly(tools)) ||
    (isNonEmptyList(disallowedTools) && !isWildcardOnly(disallowedTools)) ||
    hasNonEmptyArrays(hooks) ||
    permissionMode === "plan" ||
    permissionMode === "dontAsk"
  );
}
//@ chunk-hjswk319.js:27429-27602 placement
function restrictedAgentNames(agents) {
  if (agents === undefined) return [];
  if (typeof agents !== "object" || agents === null || Array.isArray(agents)) return ["(unreadable)"];
  return Object.entries(agents)
    .filter(([, value]) => agentDefinitionRestricts(value))
    .map(([key]) => key);
}
//@ chunk-hjswk319.js:27602-27780 placement
var CLOUD_LOST_FEATURE_TEXT =
  "agent definitions that list tools or hooks, or set a permission mode, are not enforced by a cloud session";
var STRUCTURED_OUTPUT_UNAVAILABLE_TEXT = "structured output is not delivered to a cloud session yet";
//@ chunk-hjswk319.js:27780-28291 placement
function lostSdkFeatures(options, mode, ignoredFeatures = EMPTY_LOST_FEATURE_SET) {
  let hasHooks = hasNonEmptyArrays(options.hooks);
  let sdkMcpServers = options.sdkMcpServers;
  let hasSdkMcpServers = Array.isArray(sdkMcpServers) && sdkMcpServers.length > 0;
  let hasJsonSchema = options.jsonSchema !== undefined;
  let agentNames = restrictedAgentNames(options.agents);
  let lostFeatures = [
    ...(hasHooks ? ["hooks"] : []),
    ...(hasSdkMcpServers ? ["sdkMcpServers"] : []),
    ...(agentNames.length > 0 ? ["agents"] : []),
    ...(hasJsonSchema ? ["jsonSchema"] : []),
  ];
  let filtered = keys.filter(
    (key) =>
      options[key] !== undefined &&
      !ignoredFeatures.has(key) &&
      !lostFeatures.includes(key) &&
      !isEmptySystemPrompt(key, options[key]),
  );
  if (lostFeatures.length > 0 && mode === "strict")
    return {
      outcome: "reject",
      error: cloudOptionsRefusal(
        lostFeatures.map((feature) =>
          feature === "jsonSchema"
            ? `jsonSchema (${STRUCTURED_OUTPUT_UNAVAILABLE_TEXT})`
            : feature === "agents"
              ? `agents (${listForRefusal(agentNames)}: ${CLOUD_LOST_FEATURE_TEXT})`
              : feature,
        ),
      ),
      ignored: filtered,
    };
  return {
    outcome: "accept",
    ignored: [...lostFeatures, ...filtered],
  };
}
//@ chunk-hjswk319.js:28291-28377 placement
function isEmptySystemPrompt(key, value) {
  return key === "systemPrompt" && Array.isArray(value) && value.length === 1 && value[0] === "";
}
export {
  isNonEmptyValue,
  disallowedToolsTelemetry,
  CLOUD_ALLOWED_SETTINGS_KEYS,
  listForRefusal,
  formatFailureDetails,
  collectDisallowedToolRules,
  STRUCTURED_OUTPUT_UNAVAILABLE_TEXT,
  hasNonEmptyArrays,
  agentDefinitionRestricts,
  lostDisallowedTools,
  CLOUD_LOCAL_CONTROL_TYPES,
  routeHostedControlRequest,
  lostSdkFeatures,
  cloudOptionTreatment,
};

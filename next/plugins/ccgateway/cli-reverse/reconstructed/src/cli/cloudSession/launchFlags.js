/**
 * cli/cloudSession/launchFlags.ts
 *
 * 2.1.316 新增：云会话启动参数的分类处理（转发/忽略/拒绝），生成创建选项
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (44)
 * attribution: placement 44
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  refusedFlag,
  FLAG_TREAT_CLIENT,
  FLAG_TREAT_MOOT,
  lostFlag,
  FLAG_TREAT_CREATE,
  FLAG_TREAT_IGNORE_LOST,
  FLAG_TREAT_PREFERENCE,
  FLAG_TREAT_IGNORE_KEPT,
} from "./headlessCloudClient.js";
import { isNoPromptHost } from "../../utils/permissions/permissionPromptHost.js";
import { parsedEnvironmentId } from "../../utils/teleport/cloudEnvironments.js";
import {
  collectDisallowedToolRules,
  STRUCTURED_OUTPUT_UNAVAILABLE_TEXT,
  hasNonEmptyArrays,
  agentDefinitionRestricts,
  lostDisallowedTools,
} from "./hostedSessionRestrictions.js";
import { printableName, quotedPrintable } from "../../utils/printableName.js";
import {
  unclosedParenError,
  joinNegationTokens,
  splitRuleList,
  NEGATION_PREFIX,
} from "../../utils/permissions/disallowedToolsFlag.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isRunnerToolSpec } from "../../services/selfHostedRunner/runnerToolNames.js";
import { MCP_TOOL_PREFIX } from "../../services/mcp/mcpStringUtils.js";
import { normalizeCarveOutFlag } from "../../utils/settings/permissionRuleCarveOut.js";
import { safeParseJSON } from "../../utils/json.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isEffortLevel } from "../../utils/effort.js";
import {
  permissionModeFromString,
  isExternalPermissionMode,
} from "../../utils/permissions/PermissionMode.js";
import { deviceBindingRefusalText } from "../../bridge/deviceBinding.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../../entrypoints/sdk/coreSchemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hjswk319.js:31758-36676 placement
/**
 * --cloud/--remote 启动时每个 CLI 选项的处理方式表：转给客户端、用于创建、忽略（丢失/偏好/保留）、无关或拒绝。
 */
var CLOUD_FLAG_TREATMENTS; // deferred: uses refusedFlag (./headlessCloudClient.js) of its import cycle while loading; runs once the cycle is complete
var CLOUD_FLAG_TREATMENT_TABLE;
var BYPASS_REFUSAL_MESSAGE;
var SDK_MCP_REFUSAL_MESSAGE;
var TOOL_RESTRICTION_REFUSAL_MESSAGE;
var UNSUPPORTED_OPTION_REFUSAL_MESSAGE;
var REFUSAL_GROUPS;
var FLAG_GROUP_LABELS;
deferInit("chunk-hjswk319.js:31758", () => {
  CLOUD_FLAG_TREATMENTS = refusedFlag("bypass", "bypass");
  CLOUD_FLAG_TREATMENT_TABLE = {
    debug: FLAG_TREAT_CLIENT,
    debugFile: FLAG_TREAT_CLIENT,
    debugToStderr: FLAG_TREAT_CLIENT,
    verbose: FLAG_TREAT_CLIENT,
    inputFormat: FLAG_TREAT_CLIENT,
    awaitInitialize: FLAG_TREAT_MOOT,
    outputFormat: FLAG_TREAT_CLIENT,
    includePartialMessages: FLAG_TREAT_CLIENT,
    replayUserMessages: FLAG_TREAT_CLIENT,
    hostAuthIsOrgSignIn: FLAG_TREAT_CLIENT,
    settingSources: ({ settingSources }) =>
      isMcpServerFromProjectOrLocalSettings(settingSources)
        ? FLAG_TREAT_CLIENT
        : lostFlag("the cloud session loads the repository's settings regardless"),
    projectConfigRoot: lostFlag("the cloud session reads project config from its own checkout"),
    permissionPromptTool: ({ permissionPromptTool }) =>
      permissionPromptTool === "stdio"
        ? FLAG_TREAT_CLIENT
        : refusedFlag(
            "unsupported",
            "--permission-prompt-tool (permission prompts reach the host over stdio; an MCP tool cannot answer them here)",
          ),
    permissionPrompts: ({ permissionPrompts }) =>
      isNoPromptHost(permissionPrompts)
        ? refusedFlag(
            "unsupported",
            "--permission-prompts none (turning permission prompts off is not supported for a cloud session yet; they reach the host over stdio)",
          )
        : FLAG_TREAT_MOOT,
    model: FLAG_TREAT_CREATE,
    name: FLAG_TREAT_CREATE,
    effort: FLAG_TREAT_CREATE,
    fastMode: lostFlag("a cloud session's fast mode follows its own settings"),
    fallbackModel: FLAG_TREAT_CREATE,
    maxTurns: ({ maxTurns }, { entry }) =>
      entry === "attach"
        ? lostFlag(
            "an existing session keeps the turn limit it was created with, if any; none from this invocation is enforced",
          )
        : parsedEnvironmentId(maxTurns) === undefined
          ? lostFlag("a cloud session takes only a whole number from 1 to 2147483647")
          : FLAG_TREAT_CREATE,
    maxBudgetUsd: (maxBudget, { entry }) =>
      entry === "attach"
        ? lostFlag(
            "an existing session keeps the budget it was created with, if any; none from this invocation is enforced",
          )
        : FLAG_TREAT_CREATE,
    allowedTools: FLAG_TREAT_CREATE,
    disallowedTools: ({ disallowedTools }, { entry }) => {
      if (entry === "attach") return refusedFlag("attach_restriction", "--disallowed-tools");
      let disallowedToolRules = collectDisallowedToolRules(disallowedTools ?? []);
      return disallowedToolRules.kind === "rules"
        ? FLAG_TREAT_CREATE
        : refusedFlag("deny_rule_unclosed", printableName(disallowedToolRules.rule, 64));
    },
    systemPrompt: FLAG_TREAT_CREATE,
    systemPromptFile: FLAG_TREAT_CREATE,
    appendSystemPrompt: FLAG_TREAT_CREATE,
    appendSystemPromptFile: FLAG_TREAT_CREATE,
    appendSubagentSystemPrompt: FLAG_TREAT_CREATE,
    appendSubagentSystemPromptFile: FLAG_TREAT_CREATE,
    thinking: FLAG_TREAT_CREATE,
    thinkingDisplay: FLAG_TREAT_CREATE,
    maxThinkingTokens: FLAG_TREAT_CREATE,
    permissionMode: ({ permissionMode }, { entry }) =>
      permissionMode === "bypassPermissions"
        ? CLOUD_FLAG_TREATMENTS
        : entry === "attach"
          ? FLAG_TREAT_CLIENT
          : FLAG_TREAT_CREATE,
    proactivity: FLAG_TREAT_CREATE,
    inheritPermissionMode: ({ inheritPermissionMode }) =>
      inheritPermissionMode === "bypassPermissions"
        ? CLOUD_FLAG_TREATMENTS
        : lostFlag("a cloud session does not inherit a permission mode; --permission-mode sets it"),
    dangerouslySkipPermissions: CLOUD_FLAG_TREATMENTS,
    tools: ({ tools }, { entry }) => {
      let toolsFlag = parseToolsFlag(tools ?? []);
      if (toolsFlag.kind === "default") return FLAG_TREAT_MOOT;
      if (entry === "attach") return refusedFlag("attach_restriction", "--tools");
      return toolsFlag.kind === "refused"
        ? refusedFlag("tool_restriction", toolsFlag.naming)
        : FLAG_TREAT_CREATE;
    },
    agent: ({ agents, agent }, { selectedAgentDefinition }) =>
      agentFlagTreatment(agents, agent, selectedAgentDefinition),
    agents: ({ agents }) => agentsJsonTreatment(agents),
    settings: ({ settings, permissionMode }, { flagSettings }) =>
      settingsFlagTreatment(
        "settings",
        settingsFlagRestrictions(
          settings,
          flagSettings,
          cloudPermissionModeFrom(permissionMode) !== undefined,
        ),
      ),
    managedSettings: ({ managedSettings, permissionMode }) =>
      settingsFlagTreatment(
        "managed-settings",
        inlineSettingsRestrictions(managedSettings, cloudPermissionModeFrom(permissionMode) !== undefined),
      ),
    mcpConfig: (mcpConfig, { mcpConfigFlagServers }) => mcpConfigForwarding(mcpConfigFlagServers),
    jsonSchema: refusedFlag("unsupported", `--json-schema (${STRUCTURED_OUTPUT_UNAVAILABLE_TEXT})`),
    bare: (bare, { isDeviceLess }) =>
      refusedFlag(
        "unsupported",
        "--bare (a cloud session signs in with this machine's claude.ai login, which --bare turns off)",
      ),
    awaitClaim: refusedFlag(
      "unsupported",
      "--await-claim (a pre-warmed spare is a local SDK-host process; a cloud session is created per request)",
    ),
    addDir: FLAG_TREAT_IGNORE_LOST,
    betas: FLAG_TREAT_IGNORE_LOST,
    chrome: FLAG_TREAT_IGNORE_LOST,
    clientDataUrl: refusedFlag(
      "unsupported",
      "--client-data-url (a cloud session loads its own configuration, so the document could not be used there)",
    ),
    allowOtherModels: FLAG_TREAT_MOOT,
    disableSlashCommands: refusedFlag("tool_restriction", "--disable-slash-commands"),
    enableAuthStatus: FLAG_TREAT_PREFERENCE,
    excludeDynamicSystemPromptSections: FLAG_TREAT_PREFERENCE,
    file: FLAG_TREAT_IGNORE_LOST,
    forwardSubagentText: FLAG_TREAT_IGNORE_LOST,
    ide: FLAG_TREAT_PREFERENCE,
    includeHookEvents: FLAG_TREAT_IGNORE_LOST,
    includeUnsupportedModels: FLAG_TREAT_IGNORE_LOST,
    init: FLAG_TREAT_IGNORE_LOST,
    maintenance: FLAG_TREAT_IGNORE_LOST,
    planModeInstructions: FLAG_TREAT_IGNORE_LOST,
    systemPromptSnapshot: FLAG_TREAT_IGNORE_LOST,
    pluginDir: FLAG_TREAT_IGNORE_LOST,
    pluginDirNoMcp: FLAG_TREAT_IGNORE_LOST,
    pluginUrl: FLAG_TREAT_IGNORE_LOST,
    promptSuggestions: FLAG_TREAT_PREFERENCE,
    restricted: refusedFlag("tool_restriction", "--restricted"),
    safeMode: () => refusedFlag("tool_restriction", "--safe-mode"),
    sessionId: lostFlag("frames carry the cloud worker's session id"),
    sessionMirror: FLAG_TREAT_IGNORE_LOST,
    strictMcpConfig: refusedFlag("tool_restriction", "--strict-mcp-config"),
    taskBudget: lostFlag("no task budget is enforced in a cloud session yet"),
    watchArtifact: FLAG_TREAT_IGNORE_LOST,
    workload: FLAG_TREAT_PREFERENCE,
    print: FLAG_TREAT_MOOT,
    initOnly: FLAG_TREAT_MOOT,
    desktop: FLAG_TREAT_MOOT,
    continue: FLAG_TREAT_MOOT,
    resume: FLAG_TREAT_MOOT,
    forkSession: FLAG_TREAT_MOOT,
    fromPr: FLAG_TREAT_MOOT,
    resumeSessionAt: FLAG_TREAT_MOOT,
    resumeDropsTurn: FLAG_TREAT_MOOT,
    sessionBeganAsCopy: FLAG_TREAT_MOOT,
    replyOnResume: FLAG_TREAT_MOOT,
    rewindFiles: FLAG_TREAT_MOOT,
    sessionPersistence: FLAG_TREAT_MOOT,
    prefill: FLAG_TREAT_MOOT,
    prefillB64: FLAG_TREAT_MOOT,
    deepLinkOrigin: FLAG_TREAT_MOOT,
    deepLinkRepo: FLAG_TREAT_MOOT,
    deepLinkLastFetch: FLAG_TREAT_MOOT,
    deepLinkCwdB64: FLAG_TREAT_MOOT,
    watchArtifactNoAutoreact: FLAG_TREAT_MOOT,
    allowDangerouslySkipPermissions: FLAG_TREAT_MOOT,
    routine: lostFlag("a cloud session does not activate the routine"),
  };
  BYPASS_REFUSAL_MESSAGE =
    "Error: a cloud session cannot bypass permissions; drop --dangerously-skip-permissions / --permission-mode bypassPermissions / a settings defaultMode of bypassPermissions.";
  SDK_MCP_REFUSAL_MESSAGE =
    "Error: in-process SDK MCP servers cannot apply to a cloud-hosted session, where the agent runs in the cloud container; remove them from --mcp-config: ";
  TOOL_RESTRICTION_REFUSAL_MESSAGE =
    "Error: a cloud session cannot apply these tool restrictions, so they are refused rather than silently dropped; start it without ";
  UNSUPPORTED_OPTION_REFUSAL_MESSAGE =
    "Error: a cloud session cannot honor these options yet, so they are refused rather than silently dropped; start it without ";
  REFUSAL_GROUPS = [
    "bypass",
    "attach_restriction",
    "tool_restriction",
    "deny_rule_unclosed",
    "sdk_mcp",
    "unsupported",
  ];
  FLAG_GROUP_LABELS = {
    "--disallowed-tools": "the deny list",
    "--tools": "the tools",
  };
});
//@ chunk-hjswk319.js:36676-37145 placement
function attachRestrictionError(flags) {
  let joined = flags.map((flag) => FLAG_GROUP_LABELS[flag] ?? flag).join(" and ");
  return flags.length === 1
    ? `Error: ${flags[0]} cannot change an existing cloud session, which keeps ${joined} it was created with. Drop the flag to continue this session, or start a new session with the flag to apply the list.`
    : `Error: ${flags.join(" and ")} cannot change an existing cloud session, which keeps ${joined} it was created with. Drop the flags to continue this session, or start a new session with them to apply the lists.`;
}
//@ chunk-hjswk319.js:37145-37418 placement
function cloudRefusalMessage(group, names) {
  switch (group) {
    case "bypass":
      return BYPASS_REFUSAL_MESSAGE;
    case "sdk_mcp":
      return SDK_MCP_REFUSAL_MESSAGE + names.join(", ");
    case "attach_restriction":
      return attachRestrictionError(names);
    case "tool_restriction":
      return `${TOOL_RESTRICTION_REFUSAL_MESSAGE}${names.join(", ")}.`;
    case "deny_rule_unclosed":
      return unclosedParenError(names[0] ?? "");
    case "unsupported":
      return `${UNSUPPORTED_OPTION_REFUSAL_MESSAGE}${names.join(", ")}.`;
  }
}
//@ chunk-hjswk319.js:37418-37540 placement (2.1.88 match: isMcpServerFromProjectOrLocalSettings, 1)
function isMcpServerFromProjectOrLocalSettings(config) {
  let sources = new Set((config ?? "").split(",").map((source) => source.trim()));
  return ["user", "project", "local"].every((source) => sources.has(source));
}
//@ chunk-hjswk319.js:37540-37586 placement
var TOOL_NAME_PATTERN_2 = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
var MAX_CLOUD_TOOL_NAMES = 128;
//@ chunk-hjswk319.js:37586-38333 placement
function parseToolsFlag(tokens) {
  if (tokens.length === 0 || tokens.join(" ").trim().toLowerCase() === "default")
    return {
      kind: "default",
    };
  let names = normalizeCaseForComparison_2(joinNegationTokens(splitRuleList([...tokens])));
  if (names.length === 1 && names[0]?.toLowerCase() === "default")
    return {
      kind: "refused",
      naming: `--tools "${quotedPrintable(tokens.join(" "), 64)}" (that names a tool called default; write --tools default alone for the default tools, or list the tools to keep)`,
    };
  if (names.length === 0)
    return {
      kind: "refused",
      naming: `--tools "${quotedPrintable(tokens.join(" "), 64)}" (a cloud session cannot run with no built-in tools yet)`,
    };
  let refused = names.filter(
    (name) => !TOOL_NAME_PATTERN_2.test(name) || isRunnerToolSpec(name) || name.startsWith(MCP_TOOL_PREFIX),
  );
  if (refused.length > 0)
    return {
      kind: "refused",
      naming: toolsFlagRefusals(refused),
    };
  return names.length > MAX_CLOUD_TOOL_NAMES
    ? {
        kind: "refused",
        naming: `--tools (a cloud session takes at most ${MAX_CLOUD_TOOL_NAMES} tool names; this list has ${names.length})`,
      }
    : {
        kind: "list",
        names,
      };
}
//@ chunk-hjswk319.js:38333-38342 placement
var MAX_REFUSED_TOOLS_LISTED = 3;
//@ chunk-hjswk319.js:38342-38480 placement
function toolsFlagRefusals(refused) {
  let joined = refused.slice(0, MAX_REFUSED_TOOLS_LISTED).map(toolsFlagRefusal).join(", ");
  let restCount = refused.length - MAX_REFUSED_TOOLS_LISTED;
  return restCount > 0
    ? `${joined}, and ${restCount} more --tools ${restCount === 1 ? "entry" : "entries"}`
    : joined;
}
//@ chunk-hjswk319.js:38480-39311 placement
function toolsFlagRefusal(name) {
  let safeName = printableName(name, 64);
  if (name.startsWith(NEGATION_PREFIX))
    return `--tools ${safeName} (a cloud session cannot leave out a tool this way; list the tools to keep, or name it in --disallowed-tools)`;
  if (name.toLowerCase().startsWith("preset:"))
    return `--tools ${safeName} (a cloud session takes no preset: name the tools to keep, or leave --tools out for the default set)`;
  if (isRunnerToolSpec(name))
    return `--tools ${safeName} (a cloud session cannot use the self-hosted runner's operator tools)`;
  if (name.startsWith(MCP_TOOL_PREFIX))
    return `--tools ${safeName} (--tools limits built-in tools only; an MCP tool stays in the session unless --disallowed-tools names it)`;
  if (name.includes("("))
    return `--tools ${safeName} (a rule is not a tool name: list the tool by name, and put the rule in --allowed-tools or --disallowed-tools)`;
  return `--tools ${safeName} (a tool name is a letter followed by up to 63 letters, digits, _ or -)`;
}
//@ chunk-hjswk319.js:39311-39787 placement
/**
 * 判断设置项是否有实际作用的两组键：非空才算的拒绝类（deniedMcpServers 等），以及必须为 true 或非空数组的布尔类（disableAllHooks 等）。
 */
var MANAGED_RESTRICTION_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_EMPTY_DENY_SETTING_KEYS;
var BOOLEAN_TRUE_SETTING_KEYS;
deferInit("chunk-hjswk319.js:39311", () => {
  MANAGED_RESTRICTION_KEYS = new Set([
    "allowedMcpServers",
    "allowedHttpHookUrls",
    "httpHookAllowedEnvVars",
    "availableModels",
    "strictKnownMarketplaces",
    "allowedProviders",
  ]);
  NON_EMPTY_DENY_SETTING_KEYS = new Set([
    "deniedMcpServers",
    "deniedModels",
    "disabledMcpjsonServers",
    "blockedMarketplaces",
    "autoMode",
  ]);
  BOOLEAN_TRUE_SETTING_KEYS = new Set([
    "disableAllHooks",
    "disableClaudeAiConnectors",
    "strictPluginOnlyCustomization",
    "disableCommandPluginSources",
    "disableSideloadFlags",
    "disableSkillShellExecution",
    "disableBundledSkills",
    "enforceAvailableModels",
  ]);
});
//@ chunk-hjswk319.js:39787-40170 placement
function managedKeyRestricts(key, value) {
  if (MANAGED_RESTRICTION_KEYS.has(key)) return Array.isArray(value);
  if (NON_EMPTY_DENY_SETTING_KEYS.has(key)) return isNonEmptyValue_2(value);
  if (BOOLEAN_TRUE_SETTING_KEYS.has(key) || /^allowManaged\w*Only$/.test(key))
    return value === true || (Array.isArray(value) && value.length > 0);
  if (key === "syncClaudeAiSkills" || key === "syncClaudeAiPlugins") return value === false;
  if (key === "disablePluginDirectory") return normalizeCarveOutFlag(value) === true;
  if (key === "availableModelsMatch") return value === "exact";
  return key === "disableAutoMode" && value === "disable";
}
//@ chunk-hjswk319.js:40170-40524 placement
function restrictingPermissionKeys(permissions) {
  if (typeof permissions !== "object" || permissions === null) return ["permissions"];
  return Object.entries(permissions).flatMap(([key, value]) =>
    (key === "deny" || key === "ask") && isNonEmptyValue_2(value)
      ? [`permissions.${key}`]
      : key === "disableAutoMode" && value === "disable"
        ? ["permissions.disableAutoMode"]
        : (key === "blockReadsOutsideWorkingDirectories" || key === "blockWritesOutsideWorkingDirectories") &&
            value === true
          ? [`permissions.${key}`]
          : [],
  );
}
//@ chunk-hjswk319.js:40524-40958 placement
function settingsRestrictions(settings, permissionModeGiven) {
  let parsed = settings;
  let defaultMode = parsed.permissions?.defaultMode;
  if (defaultMode === "bypassPermissions")
    return {
      kind: "bypass",
    };
  let narrowingMode =
    !permissionModeGiven && (defaultMode === "plan" || defaultMode === "dontAsk") ? defaultMode : undefined;
  let keys = Object.keys(parsed);
  if (keys.length === 0) return;
  let flattened = keys.flatMap((key) =>
    key === "permissions"
      ? [
          ...restrictingPermissionKeys(parsed.permissions),
          ...(narrowingMode ? ["permissions.defaultMode"] : []),
        ]
      : key === "hooks"
        ? hasNonEmptyArrays(parsed.hooks)
          ? ["hooks"]
          : []
        : managedKeyRestricts(key, parsed[key])
          ? [key]
          : [],
  );
  return flattened.length > 0
    ? {
        kind: "restricts",
        keys: flattened,
        narrowingDefaultMode: narrowingMode,
      }
    : {
        kind: "benign",
        keys,
      };
}
//@ chunk-hjswk319.js:40958-41173 placement
function settingsFlagRestrictions(settings, settings_2, permissionModeGiven) {
  let trimmed = settings?.trim();
  if (!trimmed) return;
  if (settings_2) return settingsRestrictions(settings_2, permissionModeGiven);
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}")))
    return {
      kind: "unloadable",
    };
  let parsed = safeParseJSON(trimmed, false);
  return typeof parsed === "object" && parsed !== null
    ? settingsRestrictions(parsed, permissionModeGiven)
    : {
        kind: "unreadable",
      };
}
//@ chunk-hjswk319.js:41173-41284 placement
function inlineSettingsRestrictions(managedSettings, permissionModeGiven) {
  let trimmed = managedSettings?.trim();
  if (!trimmed) return;
  let parsed = safeParseJSON(trimmed, false);
  if (!isPlainObject(parsed))
    return {
      kind: "unreadable",
    };
  return settingsRestrictions(parsed, permissionModeGiven);
}
//@ chunk-hjswk319.js:41284-41972 placement
function settingsFlagTreatment(flagName, restrictions) {
  switch (restrictions?.kind) {
    case "bypass":
      return CLOUD_FLAG_TREATMENTS;
    case "restricts":
      return flagName === "managed-settings"
        ? lostFlag(`its ${listNames(restrictions.keys)} are not enforced in the cloud session`)
        : refusedFlag(
            "tool_restriction",
            `--${flagName} (its ${listNames(restrictions.keys)}${restrictions.narrowingDefaultMode ? `; --permission-mode ${restrictions.narrowingDefaultMode} asks for that mode` : ""})`,
          );
    case "unreadable":
      return refusedFlag(
        "tool_restriction",
        `--${flagName} (its JSON could not be read to check it for tool restrictions)`,
      );
    case "unloadable":
      return refusedFlag(
        "tool_restriction",
        `--${flagName} (it could not be loaded as settings, so it cannot be checked for tool restrictions)`,
      );
    case "benign":
      return {
        treat: "ignore",
        kind: "preference",
        settingsKeys: restrictions.keys.map((key) => `${flagName}.${key}`),
      };
    case undefined:
      return FLAG_TREAT_MOOT;
  }
}
//@ chunk-hjswk319.js:41972-42560 placement
function agentFlagTreatment(agentsJson, agentName, selectedAgentDefinition) {
  let agentFromJson = readAgentFromJson(agentsJson, agentName);
  let problem =
    agentFromJson === "unreadable" || selectedAgentDefinition === undefined
      ? agentFromJson
      : selectedAgentDefinition === null
        ? undefined
        : agentDefinitionRestricts(selectedAgentDefinition)
          ? "restricts_resolved"
          : undefined;
  if (problem === undefined) return FLAG_TREAT_IGNORE_LOST;
  let safeAgent = printableName(agentName ?? "", 64);
  return refusedFlag(
    "tool_restriction",
    problem === "unreadable"
      ? `--agent ${safeAgent} (its --agents value could not be read to check it for tool restrictions)`
      : problem === "invisible"
        ? `--agent ${safeAgent} (its definition is not in --agents, so its tool lists and hooks cannot be checked here)`
        : problem === "restricts_resolved"
          ? `--agent ${safeAgent} (its definition lists tools or hooks, or sets a permission mode)`
          : `--agent ${safeAgent} (its tool lists, hooks or permission mode in --agents)`,
  );
}
//@ chunk-hjswk319.js:42560-42953 placement
function agentsJsonTreatment(agents) {
  let trimmed = agents?.trim();
  if (!trimmed) return FLAG_TREAT_MOOT;
  let parsed = safeParseJSON(trimmed, false);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return refusedFlag(
      "tool_restriction",
      "--agents (its value could not be read to check it for tool restrictions)",
    );
  let mapped = Object.entries(parsed)
    .filter(([, value]) => agentDefinitionRestricts(value))
    .map(([key]) => printableName(key, 64));
  return mapped.length > 0
    ? refusedFlag(
        "tool_restriction",
        `--agents (tool lists, hooks or a permission mode in: ${listNames(mapped)})`,
      )
    : FLAG_TREAT_IGNORE_LOST;
}
//@ chunk-hjswk319.js:42953-43237 placement
function readAgentFromJson(agentsJson, agentName) {
  if (!agentName) return;
  if (!agentsJson) return "invisible";
  let parsed = safeParseJSON(agentsJson, false);
  if (typeof parsed !== "object" || parsed === null) return "unreadable";
  let byName = parsed;
  let matchKeys = Object.hasOwn(byName, agentName)
    ? [agentName]
    : Object.keys(byName).filter((key) => key.endsWith(`:${agentName}`));
  if (matchKeys.length === 0) return "invisible";
  return matchKeys.some((key) => agentDefinitionRestricts(byName[key])) ? "restricts" : undefined;
}
//@ chunk-hjswk319.js:43237-43393 placement
function mcpConfigForwarding(mcpConfigFlagServers) {
  let entries = Object.entries(mcpConfigFlagServers ?? {});
  let names = entries.filter(([, server]) => server.type === "sdk").map(([name]) => name);
  if (names.length > 0) return refusedFlag("sdk_mcp", listNamesCapped(names));
  return entries.length > 0 ? FLAG_TREAT_IGNORE_LOST : FLAG_TREAT_MOOT;
}
//@ chunk-hjswk319.js:43393-43682 placement
function cloudFlagTreatments(parsed, context) {
  return Object.keys(CLOUD_FLAG_TREATMENT_TABLE).flatMap((key) => {
    if (!(
      isNonEmptyValue_2(parsed[key]) ||
      (key === "mcpConfig" && isNonEmptyValue_2(context.mcpConfigFlagServers)) ||
      (key === "settingSources" && parsed.settingSources !== undefined)
    ))
      return [];
    let entry = CLOUD_FLAG_TREATMENT_TABLE[key];
    let treatment = typeof entry === "function" ? entry(parsed, context) : entry;
    return [
      {
        key,
        treatment:
          treatment.treat === "create" && context.entry === "attach" ? FLAG_TREAT_IGNORE_KEPT : treatment,
      },
    ];
  });
}
//@ chunk-hjswk319.js:43682-44762 placement
/**
 * 检查 --cloud 启动时给出的 CLI 选项：找出必须拒绝的组合并生成错误，其余标记为丢失/保留。
 */
function checkCloudLaunchFlags(parsed, context = {}) {
  let treatments = cloudFlagTreatments(parsed, context);
  let refusals = [
    ...treatments.flatMap(({ treatment }) => (treatment.treat === "refuse" ? [treatment] : [])),
    ...mainThreadAgentTreatment(parsed, context),
  ];
  let group = REFUSAL_GROUPS.find((group) => refusals.some((refusal) => refusal.group === group));
  if (group !== undefined) {
    let names = refusals.filter((refusal) => refusal.group === group).map((refusal) => refusal.naming);
    return {
      kind: "rejected",
      message: cloudRefusalMessage(group, names),
      reason: group,
    };
  }
  let flattened = treatments.flatMap(({ key, treatment }) =>
    treatment.treat === "ignore"
      ? [
          {
            key,
            treatment,
          },
        ]
      : [],
  );
  let mapped = flattened.map(({ key }) => key);
  let disallowedToolRules = collectDisallowedToolRules(parsed.disallowedTools ?? []);
  let { rules, blocksNothing } =
    disallowedToolRules.kind === "rules"
      ? disallowedToolRules
      : {
          rules: splitRuleList(parsed.disallowedTools ?? []),
          blocksNothing: [],
        };
  let notApplied = [
    ...lostDisallowedTools(blocksNothing),
    ...flattened.flatMap(({ key, treatment }) => describeFlagTreatment(key, treatment)),
  ];
  let keys = Object.keys(context.mcpConfigFlagServers ?? {});
  return {
    kind: "accepted",
    ignored: mapped,
    notApplied,
    notices: [
      ...["settings", "managedSettings"]
        .filter((key) => mapped.includes(key))
        .map(
          (key) =>
            `${camelToCliFlag(key)} applies to this machine's client only; it is not applied to the cloud session, which runs with the cloud container's own settings.`,
        ),
      ...(mapped.includes("mcpConfig")
        ? [
            `MCP ${keys.length === 1 ? "server" : "servers"} from --mcp-config ignored \u2014 MCP servers for this session run in the cloud container: ${listNamesCapped(keys)}`,
          ]
        : []),
    ],
    forwarded: context.entry === "attach" ? {} : cloudSessionCreateOptions(parsed, context, rules),
  };
}
//@ chunk-hjswk319.js:44762-45058 placement
function mainThreadAgentTreatment(parsed, context) {
  let selectedAgentDefinition = context.selectedAgentDefinition;
  if (!selectedAgentDefinition || parsed.agent || !agentDefinitionRestricts(selectedAgentDefinition))
    return [];
  return [
    {
      treat: "refuse",
      group: "tool_restriction",
      naming: `the selected main-thread agent ${printableName(typeof selectedAgentDefinition.agentType === "string" ? selectedAgentDefinition.agentType : "agent", 64)} (its definition lists tools or hooks, or sets a permission mode)`,
    },
  ];
}
//@ chunk-hjswk319.js:45058-45174 placement
function listNames(keys) {
  let joined = keys
    .slice(0, 8)
    .map((key) => printableName(key, 64))
    .join(", ");
  return keys.length > 8 ? `${joined} (and ${keys.length - 8} more)` : joined;
}
//@ chunk-hjswk319.js:45174-46303 placement
function cloudSessionCreateOptions(parsed, context, rules) {
  let appendSystemPrompt = context.appendSystemPrompt ?? parsed.appendSystemPrompt;
  let systemPrompt = context.systemPrompt ?? parsed.systemPrompt;
  let maxTurns = parsedEnvironmentId(parsed.maxTurns);
  let allowedTools = splitRuleList(parsed.allowedTools ?? []);
  let toolsFlag = parseToolsFlag(parsed.tools ?? []);
  let names = toolsFlag.kind === "list" ? toolsFlag.names : [];
  let maxThinkingTokens =
    parsed.thinking === "disabled"
      ? 0
      : parsed.thinking === undefined &&
          Number.isInteger(parsed.maxThinkingTokens) &&
          (parsed.maxThinkingTokens ?? -1) >= 0
        ? parsed.maxThinkingTokens
        : undefined;
  let thinkingDisplay =
    parsed.thinkingDisplay === "summarized" || parsed.thinkingDisplay === "omitted"
      ? parsed.thinkingDisplay
      : undefined;
  let thinking = {
    ...(maxThinkingTokens !== undefined && {
      maxThinkingTokens,
    }),
    ...(thinkingDisplay !== undefined && {
      display: thinkingDisplay,
    }),
  };
  return {
    ...(appendSystemPrompt && {
      appendSystemPrompt,
    }),
    ...(systemPrompt && {
      customSystemPrompt: systemPrompt,
    }),
    ...(parsed.appendSubagentSystemPrompt && {
      appendSubagentSystemPrompt: parsed.appendSubagentSystemPrompt,
    }),
    ...(typeof parsed.effort === "string" &&
      isEffortLevel(parsed.effort) && {
        effort: parsed.effort,
      }),
    ...(parsed.fallbackModel && {
      fallbackModel: parsed.fallbackModel,
    }),
    ...(maxTurns !== undefined && {
      maxTurns,
    }),
    ...(parsed.maxBudgetUsd !== undefined &&
      parsed.maxBudgetUsd > 0 && {
        maxBudgetUsd: parsed.maxBudgetUsd,
      }),
    ...(allowedTools.length > 0 && {
      allowedTools,
    }),
    ...(rules.length > 0 && {
      disallowedTools: rules,
    }),
    ...(names.length > 0 && {
      builtinTools: names,
    }),
    ...(Object.keys(thinking).length > 0 && {
      thinking,
    }),
    ...(parsed.proactivity !== undefined && {
      proactivityLevel: parsed.proactivity,
    }),
    ...(parsed.bare && {
      environmentVariables: {
        CLAUDE_CODE_SIMPLE: "1",
      },
    }),
  };
}
//@ chunk-hjswk319.js:46303-46597 placement
function describeFlagTreatment(key, treatment) {
  let name = camelToCliFlag(key);
  switch (treatment.kind) {
    case "lost":
      return [
        {
          kind: "lost",
          name,
          ...(treatment.why !== undefined && {
            why: treatment.why,
          }),
        },
      ];
    case "kept":
      return [
        {
          kind: "kept",
          name,
        },
      ];
    case "preference":
      return treatment.settingsKeys === undefined
        ? [
            {
              kind: "preference",
              name,
            },
          ]
        : treatment.settingsKeys.map((settingsKey) => ({
            kind: "preference",
            name: printableName(settingsKey, 64),
          }));
  }
}
//@ chunk-hjswk319.js:46597-46672 placement
function camelToCliFlag(key) {
  return `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}
//@ chunk-hjswk319.js:46672-46681 placement
var MAX_LISTED_SETTING_KEYS = 8;
//@ chunk-hjswk319.js:46681-46811 placement
function listNamesCapped(names) {
  let mapped = names.slice(0, MAX_LISTED_SETTING_KEYS).map((name) => printableName(name, 64));
  return names.length > MAX_LISTED_SETTING_KEYS
    ? `${mapped.join(", ")} (and ${names.length - MAX_LISTED_SETTING_KEYS} more)`
    : mapped.join(", ");
}
//@ chunk-hjswk319.js:46811-46936 placement
function isNonEmptyValue_2(value) {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "object" && value !== null ? Object.keys(value).length > 0 : Boolean(value);
}
//@ chunk-hjswk319.js:46936-47024 placement
function cloudPermissionModeFrom(mode) {
  let parsed = mode ? permissionModeFromString(mode) : undefined;
  return parsed && isExternalPermissionMode(parsed) && parsed !== "bypassPermissions" ? parsed : undefined;
}
//@ chunk-hjswk319.js:47024-47096 placement
function describeBindingOutcome(outcome) {
  return outcome ? deviceBindingRefusalText(outcome) : "the binding outcome was never reported";
}
//@ chunk-hjswk319.js:47096-47177 placement (2.1.88 match: toCompatSessionId, 1)
/**
 * 会话 ID 的展示形式（cse_ 转成 session_，截断到 128）。
 */
function displaySessionId(id) {
  let displayId = id.startsWith("cse_") ? `session_${sessionIdBody(id)}` : id;
  return printableName(displayId, 128);
}
//@ chunk-hjswk319.js:47177-47314 placement
/**
 * "云会话已创建但本机未能绑定"的错误文字。
 */
function formatBindFailure(id, outcome, url, wasArchived) {
  return `Error: cloud session ${displaySessionId(id)} was created but this machine could not be bound to it: ${describeBindingOutcome(outcome)}. ${cloudSessionLeftNote(wasArchived, url)}`;
}
//@ chunk-hjswk319.js:47314-47486 placement
function formatServeSetupFailure(id, error, url, wasArchived) {
  return `Error: cloud session ${displaySessionId(id)} was created and bound to this machine, but this machine could not be set up to serve it (${printableName(error)}). ${cloudSessionLeftNote(wasArchived, url)}`;
}
//@ chunk-hjswk319.js:47486-47698 placement
function cloudSessionLeftNote(wasArchived, url) {
  let safeUrl = printableName(url, 200);
  return wasArchived
    ? `It was archived (nothing was left running); it is listed under Archived at ${safeUrl}.`
    : `It was left running and could not be archived from here; open or archive it at ${safeUrl}.`;
}
//@ chunk-hjswk319.js:47698-47823 placement
function formatArchivedSessionError(sessionId, remoteSessionUrl) {
  return `Error: cloud session ${displaySessionId(sessionId)} is archived and cannot accept new messages. View it at ${printableName(remoteSessionUrl, 200)}`;
}
//@ chunk-hjswk319.js:47823-47959 placement
function formatUnboundCreateError(outcome, description = describeBindingOutcome(outcome)) {
  return `Error: a cloud session started from here could not be bound to this machine: ${description}. Nothing was created.`;
}
//@ chunk-hjswk319.js:47959-48156 placement
function cloudSessionJsonSummary({ sessionId, viewUrl, device, directorySync, repositoryTrust }) {
  return {
    id: displaySessionId(sessionId),
    view_url: printableName(viewUrl, 200),
    device,
    directory_sync: directorySync,
    client_version: 1,
    ...(repositoryTrust !== undefined && {
      repository_trust: repositoryTrust,
    }),
  };
}
//@ chunk-hjswk319.js:48156-48231 placement
var PROMPT_OPTION_KEYS = ["systemPrompt", "appendSystemPrompt", "appendSubagentSystemPrompt"];
//@ chunk-hjswk319.js:48231-48692 placement
function cloudPromptOverrides(forwarded, initialize) {
  let systemPrompt =
    (initialize?.systemPrompt !== undefined ? joinSystemPromptLines(initialize.systemPrompt) : undefined) ??
    forwarded.customSystemPrompt;
  let appendSystemPrompt =
    initialize?.appendSystemPrompt !== undefined
      ? initialize.appendSystemPrompt
      : forwarded.appendSystemPrompt;
  let appendSubagentSystemPrompt =
    initialize?.appendSubagentSystemPrompt !== undefined
      ? initialize.appendSubagentSystemPrompt
      : forwarded.appendSubagentSystemPrompt;
  let {
    customSystemPrompt,
    appendSystemPrompt: appendSystemPrompt_2,
    appendSubagentSystemPrompt: appendSubagentSystemPrompt_2,
    ...rest
  } = forwarded;
  return {
    ...rest,
    ...(systemPrompt && {
      customSystemPrompt: systemPrompt,
    }),
    ...(appendSystemPrompt && {
      appendSystemPrompt,
    }),
    ...(appendSubagentSystemPrompt && {
      appendSubagentSystemPrompt,
    }),
  };
}
//@ chunk-hjswk319.js:48692-48784 placement
function joinSystemPromptLines(systemPrompt) {
  let trimmed = systemPrompt
    .filter((line) => line !== "" && line !== SYSTEM_PROMPT_DYNAMIC_BOUNDARY)
    .join(
      `

`,
    )
    .trim();
  return trimmed === "" ? undefined : trimmed;
}
//@ chunk-hjswk319.js:48784-48891 placement
/**
 * 表示“云会话启动”的根选项键（cloud、remote、teleport、attachServe、project、environment、pool、monorepo、noMonorepo）。
 */
var CLOUD_SESSION_OPTION_KEYS = [
  "cloud",
  "remote",
  "teleport",
  "attachServe",
  "project",
  "environment",
  "pool",
  "monorepo",
  "noMonorepo",
];
//@ chunk-hjswk319.js:48891-49022 placement
function parseTriBoolFlag(forwardHomeSettings) {
  switch (forwardHomeSettings) {
    case undefined:
      return null;
    case "true":
    case "1":
      return true;
    case "false":
    case "0":
      return false;
    default:
      return "invalid";
  }
}
export {
  displaySessionId,
  cloudPermissionModeFrom,
  CLOUD_SESSION_OPTION_KEYS,
  BYPASS_REFUSAL_MESSAGE,
  parseTriBoolFlag,
  PROMPT_OPTION_KEYS,
  cloudPromptOverrides,
  checkCloudLaunchFlags,
  formatUnboundCreateError,
  formatBindFailure,
  formatServeSetupFailure,
  cloudSessionJsonSummary,
  formatArchivedSessionError,
};

/**
 * cli/cloudSession/launchFlags.ts
 *
 * 2.1.316 新增：云会话启动参数的分类处理（转发/忽略/拒绝），生成创建选项
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (44)
 * attribution: placement 44
 */
import {
  refusedFlag,
  FLAG_TREAT_CLIENT,
  G,
  lostFlag,
  ge,
  Se,
  FLAG_TREAT_PREFERENCE,
  Fc,
} from "./headlessCloudClient.js";
import { Z_e } from "../../utils/permissions/permissionPromptHost.js";
import { lBo } from "../../utils/teleport/cloudEnvironments.js";
import {
  collectDisallowedToolRules,
  Or,
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
import { uniq } from "../../utils/collections.js";
import { Xon } from "../../services/selfHostedRunner/runnerToolNames.js";
import { MCP_TOOL_PREFIX } from "../../services/mcp/mcpStringUtils.js";
import { _Ot } from "../../utils/settings/permissionRuleCarveOut.js";
import { safeParseJSON } from "../../utils/json.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isEffortLevel } from "../../utils/effort.js";
import {
  permissionModeFromString,
  isExternalPermissionMode,
} from "../../utils/permissions/PermissionMode.js";
import { GNe } from "../../bridge/deviceBinding.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../../entrypoints/sdk/coreSchemas.js";

/**
 * --cloud/--remote 启动时每个 CLI 选项的处理方式表：转给客户端、用于创建、忽略（丢失/偏好/保留）、无关或拒绝。
 */
//@ chunk-3wek6r2k.js:32425-37342 placement
var CLOUD_FLAG_TREATMENTS = refusedFlag("bypass", "bypass"),
  qi = {
    debug: FLAG_TREAT_CLIENT,
    debugFile: FLAG_TREAT_CLIENT,
    debugToStderr: FLAG_TREAT_CLIENT,
    verbose: FLAG_TREAT_CLIENT,
    inputFormat: FLAG_TREAT_CLIENT,
    awaitInitialize: G,
    outputFormat: FLAG_TREAT_CLIENT,
    includePartialMessages: FLAG_TREAT_CLIENT,
    replayUserMessages: FLAG_TREAT_CLIENT,
    hostAuthIsOrgSignIn: FLAG_TREAT_CLIENT,
    settingSources: ({ settingSources: settingSources }) =>
      isMcpServerFromProjectOrLocalSettings(settingSources)
        ? FLAG_TREAT_CLIENT
        : lostFlag("the cloud session loads the repository's settings regardless"),
    projectConfigRoot: lostFlag("the cloud session reads project config from its own checkout"),
    permissionPromptTool: ({ permissionPromptTool: permissionPromptTool }) =>
      permissionPromptTool === "stdio"
        ? FLAG_TREAT_CLIENT
        : refusedFlag(
            "unsupported",
            "--permission-prompt-tool (permission prompts reach the host over stdio; an MCP tool cannot answer them here)",
          ),
    permissionPrompts: ({ permissionPrompts: permissionPrompts }) =>
      Z_e(permissionPrompts)
        ? refusedFlag(
            "unsupported",
            "--permission-prompts none (turning permission prompts off is not supported for a cloud session yet; they reach the host over stdio)",
          )
        : G,
    model: ge,
    name: ge,
    effort: ge,
    fastMode: lostFlag("a cloud session's fast mode follows its own settings"),
    fallbackModel: ge,
    maxTurns: ({ maxTurns: maxTurns }, { entry: entry }) =>
      entry === "attach"
        ? lostFlag(
            "an existing session keeps the turn limit it was created with, if any; none from this invocation is enforced",
          )
        : lBo(maxTurns) === void 0
          ? lostFlag("a cloud session takes only a whole number from 1 to 2147483647")
          : ge,
    maxBudgetUsd: (e, { entry: entry }) =>
      entry === "attach"
        ? lostFlag(
            "an existing session keeps the budget it was created with, if any; none from this invocation is enforced",
          )
        : ge,
    allowedTools: ge,
    disallowedTools: ({ disallowedTools: disallowedTools }, { entry: entry }) => {
      if (entry === "attach") return refusedFlag("attach_restriction", "--disallowed-tools");
      let n = collectDisallowedToolRules(disallowedTools ?? []);
      return n.kind === "rules" ? ge : refusedFlag("deny_rule_unclosed", printableName(n.rule, 64));
    },
    systemPrompt: ge,
    systemPromptFile: ge,
    appendSystemPrompt: ge,
    appendSystemPromptFile: ge,
    appendSubagentSystemPrompt: ge,
    appendSubagentSystemPromptFile: ge,
    thinking: ge,
    thinkingDisplay: ge,
    maxThinkingTokens: ge,
    permissionMode: ({ permissionMode: permissionMode }, { entry: entry }) =>
      permissionMode === "bypassPermissions"
        ? CLOUD_FLAG_TREATMENTS
        : entry === "attach"
          ? FLAG_TREAT_CLIENT
          : ge,
    proactivity: ge,
    inheritPermissionMode: ({ inheritPermissionMode: inheritPermissionMode }) =>
      inheritPermissionMode === "bypassPermissions"
        ? CLOUD_FLAG_TREATMENTS
        : lostFlag("a cloud session does not inherit a permission mode; --permission-mode sets it"),
    dangerouslySkipPermissions: CLOUD_FLAG_TREATMENTS,
    tools: ({ tools: tools }, { entry: entry }) => {
      let n = parseToolsFlag(tools ?? []);
      if (n.kind === "default") return G;
      if (entry === "attach") return refusedFlag("attach_restriction", "--tools");
      return n.kind === "refused" ? refusedFlag("tool_restriction", n.naming) : ge;
    },
    agent: ({ agents: agents, agent: agent }, { selectedAgentDefinition: selectedAgentDefinition }) =>
      agentFlagTreatment(agents, agent, selectedAgentDefinition),
    agents: ({ agents: agents }) => agentsJsonTreatment(agents),
    settings: ({ settings: settings, permissionMode: permissionMode }, { flagSettings: flagSettings }) =>
      settingsFlagTreatment(
        "settings",
        settingsFlagRestrictions(settings, flagSettings, cloudPermissionModeFrom(permissionMode) !== void 0),
      ),
    managedSettings: ({ managedSettings: managedSettings, permissionMode: permissionMode }) =>
      settingsFlagTreatment(
        "managed-settings",
        inlineSettingsRestrictions(managedSettings, cloudPermissionModeFrom(permissionMode) !== void 0),
      ),
    mcpConfig: (e, { mcpConfigFlagServers: mcpConfigFlagServers }) =>
      mcpConfigForwarding(mcpConfigFlagServers),
    jsonSchema: refusedFlag("unsupported", `--json-schema (${Or})`),
    bare: (e, { isDeviceLess: isDeviceLess }) =>
      refusedFlag(
        "unsupported",
        "--bare (a cloud session signs in with this machine's claude.ai login, which --bare turns off)",
      ),
    awaitClaim: refusedFlag(
      "unsupported",
      "--await-claim (a pre-warmed spare is a local SDK-host process; a cloud session is created per request)",
    ),
    addDir: Se,
    betas: Se,
    chrome: Se,
    clientDataUrl: refusedFlag(
      "unsupported",
      "--client-data-url (a cloud session loads its own configuration, so the document could not be used there)",
    ),
    allowOtherModels: G,
    disableSlashCommands: refusedFlag("tool_restriction", "--disable-slash-commands"),
    enableAuthStatus: FLAG_TREAT_PREFERENCE,
    excludeDynamicSystemPromptSections: FLAG_TREAT_PREFERENCE,
    file: Se,
    forwardSubagentText: Se,
    ide: FLAG_TREAT_PREFERENCE,
    includeHookEvents: Se,
    includeUnsupportedModels: Se,
    init: Se,
    maintenance: Se,
    planModeInstructions: Se,
    systemPromptSnapshot: Se,
    pluginDir: Se,
    pluginDirNoMcp: Se,
    pluginUrl: Se,
    promptSuggestions: FLAG_TREAT_PREFERENCE,
    restricted: refusedFlag("tool_restriction", "--restricted"),
    safeMode: () => refusedFlag("tool_restriction", "--safe-mode"),
    sessionId: lostFlag("frames carry the cloud worker's session id"),
    sessionMirror: Se,
    strictMcpConfig: refusedFlag("tool_restriction", "--strict-mcp-config"),
    taskBudget: lostFlag("no task budget is enforced in a cloud session yet"),
    watchArtifact: Se,
    workload: FLAG_TREAT_PREFERENCE,
    print: G,
    initOnly: G,
    desktop: G,
    continue: G,
    resume: G,
    forkSession: G,
    fromPr: G,
    resumeSessionAt: G,
    resumeDropsTurn: G,
    sessionBeganAsCopy: G,
    replyOnResume: G,
    rewindFiles: G,
    sessionPersistence: G,
    prefill: G,
    prefillB64: G,
    deepLinkOrigin: G,
    deepLinkRepo: G,
    deepLinkLastFetch: G,
    deepLinkCwdB64: G,
    watchArtifactNoAutoreact: G,
    allowDangerouslySkipPermissions: G,
    routine: lostFlag("a cloud session does not activate the routine"),
  },
  Lr =
    "Error: a cloud session cannot bypass permissions; drop --dangerously-skip-permissions / --permission-mode bypassPermissions / a settings defaultMode of bypassPermissions.",
  Lc =
    "Error: in-process SDK MCP servers cannot apply to a cloud-hosted session, where the agent runs in the cloud container; remove them from --mcp-config: ",
  Nc =
    "Error: a cloud session cannot apply these tool restrictions, so they are refused rather than silently dropped; start it without ",
  Uc =
    "Error: a cloud session cannot honor these options yet, so they are refused rather than silently dropped; start it without ",
  Bc = ["bypass", "attach_restriction", "tool_restriction", "deny_rule_unclosed", "sdk_mcp", "unsupported"],
  Hc = { "--disallowed-tools": "the deny list", "--tools": "the tools" };
//@ chunk-3wek6r2k.js:37342-37811 placement
function attachRestrictionError(e) {
  let joined = e.map((n) => Hc[n] ?? n).join(" and ");
  return e.length === 1
    ? `Error: ${e[0]} cannot change an existing cloud session, which keeps ${joined} it was created with. Drop the flag to continue this session, or start a new session with the flag to apply the list.`
    : `Error: ${e.join(" and ")} cannot change an existing cloud session, which keeps ${joined} it was created with. Drop the flags to continue this session, or start a new session with them to apply the lists.`;
}
//@ chunk-3wek6r2k.js:37811-38084 placement
function cloudRefusalMessage(e, o) {
  switch (e) {
    case "bypass":
      return Lr;
    case "sdk_mcp":
      return Lc + o.join(", ");
    case "attach_restriction":
      return attachRestrictionError(o);
    case "tool_restriction":
      return `${Nc}${o.join(", ")}.`;
    case "deny_rule_unclosed":
      return unclosedParenError(o[0] ?? "");
    case "unsupported":
      return `${Uc}${o.join(", ")}.`;
  }
}
//@ chunk-3wek6r2k.js:38084-38206 placement = isMcpServerFromProjectOrLocalSettings (1)
function isMcpServerFromProjectOrLocalSettings(config) {
  let o = new Set((config ?? "").split(",").map((n) => n.trim()));
  return ["user", "project", "local"].every((n) => o.has(n));
}
//@ chunk-3wek6r2k.js:38206-38252 placement
var Vc = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/,
  zi = 128;
//@ chunk-3wek6r2k.js:38252-38999 placement
function parseToolsFlag(e) {
  if (e.length === 0 || e.join(" ").trim().toLowerCase() === "default") return { kind: "default" };
  let o = uniq(joinNegationTokens(splitRuleList([...e])));
  if (o.length === 1 && o[0]?.toLowerCase() === "default")
    return {
      kind: "refused",
      naming: `--tools "${quotedPrintable(e.join(" "), 64)}" (that names a tool called default; write --tools default alone for the default tools, or list the tools to keep)`,
    };
  if (o.length === 0)
    return {
      kind: "refused",
      naming: `--tools "${quotedPrintable(e.join(" "), 64)}" (a cloud session cannot run with no built-in tools yet)`,
    };
  let filtered = o.filter((r) => !Vc.test(r) || Xon(r) || r.startsWith(MCP_TOOL_PREFIX));
  if (filtered.length > 0) return { kind: "refused", naming: toolsFlagRefusals(filtered) };
  return o.length > zi
    ? {
        kind: "refused",
        naming: `--tools (a cloud session takes at most ${zi} tool names; this list has ${o.length})`,
      }
    : { kind: "list", names: o };
}
//@ chunk-3wek6r2k.js:38999-39008 placement
var Qi = 3;
//@ chunk-3wek6r2k.js:39008-39146 placement
function toolsFlagRefusals(e) {
  let joined = e.slice(0, Qi).map(toolsFlagRefusal).join(", "),
    n = e.length - Qi;
  return n > 0 ? `${joined}, and ${n} more --tools ${n === 1 ? "entry" : "entries"}` : joined;
}
//@ chunk-3wek6r2k.js:39146-39977 placement
function toolsFlagRefusal(e) {
  let o = printableName(e, 64);
  if (e.startsWith(NEGATION_PREFIX))
    return `--tools ${o} (a cloud session cannot leave out a tool this way; list the tools to keep, or name it in --disallowed-tools)`;
  if (e.toLowerCase().startsWith("preset:"))
    return `--tools ${o} (a cloud session takes no preset: name the tools to keep, or leave --tools out for the default set)`;
  if (Xon(e)) return `--tools ${o} (a cloud session cannot use the self-hosted runner's operator tools)`;
  if (e.startsWith(MCP_TOOL_PREFIX))
    return `--tools ${o} (--tools limits built-in tools only; an MCP tool stays in the session unless --disallowed-tools names it)`;
  if (e.includes("("))
    return `--tools ${o} (a rule is not a tool name: list the tool by name, and put the rule in --allowed-tools or --disallowed-tools)`;
  return `--tools ${o} (a tool name is a letter followed by up to 63 letters, digits, _ or -)`;
}
//@ chunk-3wek6r2k.js:39977-40453 placement
var MANAGED_RESTRICTION_KEYS = new Set([
    "allowedMcpServers",
    "allowedHttpHookUrls",
    "httpHookAllowedEnvVars",
    "availableModels",
    "strictKnownMarketplaces",
    "allowedProviders",
  ]),
  zc = new Set([
    "deniedMcpServers",
    "deniedModels",
    "disabledMcpjsonServers",
    "blockedMarketplaces",
    "autoMode",
  ]),
  Xc = new Set([
    "disableAllHooks",
    "disableClaudeAiConnectors",
    "strictPluginOnlyCustomization",
    "disableCommandPluginSources",
    "disableSideloadFlags",
    "disableSkillShellExecution",
    "disableBundledSkills",
    "enforceAvailableModels",
  ]);
//@ chunk-3wek6r2k.js:40453-40836 placement
function managedKeyRestricts(e, o) {
  if (MANAGED_RESTRICTION_KEYS.has(e)) return Array.isArray(o);
  if (zc.has(e)) return isNonEmptyValue_2(o);
  if (Xc.has(e) || /^allowManaged\w*Only$/.test(e)) return o === !0 || (Array.isArray(o) && o.length > 0);
  if (e === "syncClaudeAiSkills" || e === "syncClaudeAiPlugins") return o === !1;
  if (e === "disablePluginDirectory") return _Ot(o) === !0;
  if (e === "availableModelsMatch") return o === "exact";
  return e === "disableAutoMode" && o === "disable";
}
//@ chunk-3wek6r2k.js:40836-41190 placement
function restrictingPermissionKeys(e) {
  if (typeof e !== "object" || e === null) return ["permissions"];
  return Object.entries(e).flatMap(([o, n]) =>
    (o === "deny" || o === "ask") && isNonEmptyValue_2(n)
      ? [`permissions.${o}`]
      : o === "disableAutoMode" && n === "disable"
        ? ["permissions.disableAutoMode"]
        : (o === "blockReadsOutsideWorkingDirectories" || o === "blockWritesOutsideWorkingDirectories") &&
            n === !0
          ? [`permissions.${o}`]
          : [],
  );
}
//@ chunk-3wek6r2k.js:41190-41624 placement
function settingsRestrictions(e, o) {
  let n = e,
    u = n.permissions?.defaultMode;
  if (u === "bypassPermissions") return { kind: "bypass" };
  let p = !o && (u === "plan" || u === "dontAsk") ? u : void 0,
    keys = Object.keys(n);
  if (keys.length === 0) return;
  let flattened = keys.flatMap((y) =>
    y === "permissions"
      ? [...restrictingPermissionKeys(n.permissions), ...(p ? ["permissions.defaultMode"] : [])]
      : y === "hooks"
        ? hasNonEmptyArrays(n.hooks)
          ? ["hooks"]
          : []
        : managedKeyRestricts(y, n[y])
          ? [y]
          : [],
  );
  return flattened.length > 0
    ? { kind: "restricts", keys: flattened, narrowingDefaultMode: p }
    : { kind: "benign", keys: keys };
}
//@ chunk-3wek6r2k.js:41624-41839 placement
function settingsFlagRestrictions(e, o, n) {
  let r = e?.trim();
  if (!r) return;
  if (o) return settingsRestrictions(o, n);
  if (!(r.startsWith("{") && r.endsWith("}"))) return { kind: "unloadable" };
  let u = safeParseJSON(r, !1);
  return typeof u === "object" && u !== null ? settingsRestrictions(u, n) : { kind: "unreadable" };
}
//@ chunk-3wek6r2k.js:41839-41950 placement
function inlineSettingsRestrictions(e, o) {
  let n = e?.trim();
  if (!n) return;
  let r = safeParseJSON(n, !1);
  if (!isPlainObject(r)) return { kind: "unreadable" };
  return settingsRestrictions(r, o);
}
//@ chunk-3wek6r2k.js:41950-42638 placement
function settingsFlagTreatment(e, o) {
  switch (o?.kind) {
    case "bypass":
      return CLOUD_FLAG_TREATMENTS;
    case "restricts":
      return e === "managed-settings"
        ? lostFlag(`its ${listNames(o.keys)} are not enforced in the cloud session`)
        : refusedFlag(
            "tool_restriction",
            `--${e} (its ${listNames(o.keys)}${o.narrowingDefaultMode ? `; --permission-mode ${o.narrowingDefaultMode} asks for that mode` : ""})`,
          );
    case "unreadable":
      return refusedFlag(
        "tool_restriction",
        `--${e} (its JSON could not be read to check it for tool restrictions)`,
      );
    case "unloadable":
      return refusedFlag(
        "tool_restriction",
        `--${e} (it could not be loaded as settings, so it cannot be checked for tool restrictions)`,
      );
    case "benign":
      return { treat: "ignore", kind: "preference", settingsKeys: o.keys.map((key) => `${e}.${key}`) };
    case void 0:
      return G;
  }
}
//@ chunk-3wek6r2k.js:42638-43226 placement
function agentFlagTreatment(e, o, n) {
  let r = readAgentFromJson(e, o),
    u =
      r === "unreadable" || n === void 0
        ? r
        : n === null
          ? void 0
          : agentDefinitionRestricts(n)
            ? "restricts_resolved"
            : void 0;
  if (u === void 0) return Se;
  let p = printableName(o ?? "", 64);
  return refusedFlag(
    "tool_restriction",
    u === "unreadable"
      ? `--agent ${p} (its --agents value could not be read to check it for tool restrictions)`
      : u === "invisible"
        ? `--agent ${p} (its definition is not in --agents, so its tool lists and hooks cannot be checked here)`
        : u === "restricts_resolved"
          ? `--agent ${p} (its definition lists tools or hooks, or sets a permission mode)`
          : `--agent ${p} (its tool lists, hooks or permission mode in --agents)`,
  );
}
//@ chunk-3wek6r2k.js:43226-43619 placement
function agentsJsonTreatment(e) {
  let o = e?.trim();
  if (!o) return G;
  let n = safeParseJSON(o, !1);
  if (typeof n !== "object" || n === null || Array.isArray(n))
    return refusedFlag(
      "tool_restriction",
      "--agents (its value could not be read to check it for tool restrictions)",
    );
  let mapped = Object.entries(n)
    .filter(([, u]) => agentDefinitionRestricts(u))
    .map(([u]) => printableName(u, 64));
  return mapped.length > 0
    ? refusedFlag(
        "tool_restriction",
        `--agents (tool lists, hooks or a permission mode in: ${listNames(mapped)})`,
      )
    : Se;
}
//@ chunk-3wek6r2k.js:43619-43903 placement
function readAgentFromJson(e, o) {
  if (!o) return;
  if (!e) return "invisible";
  let n = safeParseJSON(e, !1);
  if (typeof n !== "object" || n === null) return "unreadable";
  let r = n,
    u = Object.hasOwn(r, o) ? [o] : Object.keys(r).filter((p) => p.endsWith(`:${o}`));
  if (u.length === 0) return "invisible";
  return u.some((p) => agentDefinitionRestricts(r[p])) ? "restricts" : void 0;
}
//@ chunk-3wek6r2k.js:43903-44059 placement
function mcpConfigForwarding(e) {
  let entries = Object.entries(e ?? {}),
    mapped = entries.filter(([, r]) => r.type === "sdk").map(([r]) => r);
  if (mapped.length > 0) return refusedFlag("sdk_mcp", listNamesCapped(mapped));
  return entries.length > 0 ? Se : G;
}
//@ chunk-3wek6r2k.js:44059-44348 placement
function cloudFlagTreatments(e, o) {
  return Object.keys(qi).flatMap((n) => {
    if (!(
      isNonEmptyValue_2(e[n]) ||
      (n === "mcpConfig" && isNonEmptyValue_2(o.mcpConfigFlagServers)) ||
      (n === "settingSources" && e.settingSources !== void 0)
    ))
      return [];
    let u = qi[n],
      p = typeof u === "function" ? u(e, o) : u;
    return [{ key: n, treatment: p.treat === "create" && o.entry === "attach" ? Fc : p }];
  });
}
/**
 * 检查 --cloud 启动时给出的 CLI 选项：找出必须拒绝的组合并生成错误，其余标记为丢失/保留。
 */
//@ chunk-3wek6r2k.js:44348-45426 placement
function checkCloudLaunchFlags(e, o = {}) {
  let n = cloudFlagTreatments(e, o),
    r = [
      ...n.flatMap(({ treatment: treatment }) => (treatment.treat === "refuse" ? [treatment] : [])),
      ...mainThreadAgentTreatment(e, o),
    ],
    found = Bc.find((P) => r.some((A) => A.group === P));
  if (found !== void 0) {
    let mapped = r.filter((A) => A.group === found).map((A) => A.naming);
    return { kind: "rejected", message: cloudRefusalMessage(found, mapped), reason: found };
  }
  let flattened = n.flatMap(({ key: key, treatment: treatment }) =>
      treatment.treat === "ignore" ? [{ key: key, treatment: treatment }] : [],
    ),
    mapped = flattened.map(({ key: key }) => key),
    S = collectDisallowedToolRules(e.disallowedTools ?? []),
    { rules: rules, blocksNothing: blocksNothing } =
      S.kind === "rules" ? S : { rules: splitRuleList(e.disallowedTools ?? []), blocksNothing: [] },
    E = [
      ...lostDisallowedTools(blocksNothing),
      ...flattened.flatMap(({ key: key, treatment: treatment }) => describeFlagTreatment(key, treatment)),
    ],
    keys = Object.keys(o.mcpConfigFlagServers ?? {});
  return {
    kind: "accepted",
    ignored: mapped,
    notApplied: E,
    notices: [
      ...["settings", "managedSettings"]
        .filter((P) => mapped.includes(P))
        .map(
          (P) =>
            `${ta(P)} applies to this machine's client only; it is not applied to the cloud session, which runs with the cloud container's own settings.`,
        ),
      ...(mapped.includes("mcpConfig")
        ? [
            `MCP ${keys.length === 1 ? "server" : "servers"} from --mcp-config ignored \u2014 MCP servers for this session run in the cloud container: ${listNamesCapped(keys)}`,
          ]
        : []),
    ],
    forwarded: o.entry === "attach" ? {} : cloudSessionCreateOptions(e, o, rules),
  };
}
//@ chunk-3wek6r2k.js:45426-45722 placement
function mainThreadAgentTreatment(e, o) {
  let selectedAgentDefinition = o.selectedAgentDefinition;
  if (!selectedAgentDefinition || e.agent || !agentDefinitionRestricts(selectedAgentDefinition)) return [];
  return [
    {
      treat: "refuse",
      group: "tool_restriction",
      naming: `the selected main-thread agent ${printableName(typeof selectedAgentDefinition.agentType === "string" ? selectedAgentDefinition.agentType : "agent", 64)} (its definition lists tools or hooks, or sets a permission mode)`,
    },
  ];
}
//@ chunk-3wek6r2k.js:45722-45838 placement
function listNames(e) {
  let joined = e
    .slice(0, 8)
    .map((n) => printableName(n, 64))
    .join(", ");
  return e.length > 8 ? `${joined} (and ${e.length - 8} more)` : joined;
}
//@ chunk-3wek6r2k.js:45838-46967 placement
function cloudSessionCreateOptions(e, o, n) {
  let r = o.appendSystemPrompt ?? e.appendSystemPrompt,
    u = o.systemPrompt ?? e.systemPrompt,
    p = lBo(e.maxTurns),
    h = splitRuleList(e.allowedTools ?? []),
    S = parseToolsFlag(e.tools ?? []),
    y = S.kind === "list" ? S.names : [],
    M =
      e.thinking === "disabled"
        ? 0
        : e.thinking === void 0 && Number.isInteger(e.maxThinkingTokens) && (e.maxThinkingTokens ?? -1) >= 0
          ? e.maxThinkingTokens
          : void 0,
    E = e.thinkingDisplay === "summarized" || e.thinkingDisplay === "omitted" ? e.thinkingDisplay : void 0,
    w = { ...(M !== void 0 && { maxThinkingTokens: M }), ...(E !== void 0 && { display: E }) };
  return {
    ...(r && { appendSystemPrompt: r }),
    ...(u && { customSystemPrompt: u }),
    ...(e.appendSubagentSystemPrompt && { appendSubagentSystemPrompt: e.appendSubagentSystemPrompt }),
    ...(typeof e.effort === "string" && isEffortLevel(e.effort) && { effort: e.effort }),
    ...(e.fallbackModel && { fallbackModel: e.fallbackModel }),
    ...(p !== void 0 && { maxTurns: p }),
    ...(e.maxBudgetUsd !== void 0 && e.maxBudgetUsd > 0 && { maxBudgetUsd: e.maxBudgetUsd }),
    ...(h.length > 0 && { allowedTools: h }),
    ...(n.length > 0 && { disallowedTools: n }),
    ...(y.length > 0 && { builtinTools: y }),
    ...(Object.keys(w).length > 0 && { thinking: w }),
    ...(e.proactivity !== void 0 && { proactivityLevel: e.proactivity }),
    ...(e.bare && { environmentVariables: { CLAUDE_CODE_SIMPLE: "1" } }),
  };
}
//@ chunk-3wek6r2k.js:46967-47261 placement
function describeFlagTreatment(e, o) {
  let n = ta(e);
  switch (o.kind) {
    case "lost":
      return [{ kind: "lost", name: n, ...(o.why !== void 0 && { why: o.why }) }];
    case "kept":
      return [{ kind: "kept", name: n }];
    case "preference":
      return o.settingsKeys === void 0
        ? [{ kind: "preference", name: n }]
        : o.settingsKeys.map((settingsKey) => ({ kind: "preference", name: printableName(settingsKey, 64) }));
  }
}
//@ chunk-3wek6r2k.js:47261-47336 placement
function ta(e) {
  return `--${e.replace(/[A-Z]/g, (o) => `-${o.toLowerCase()}`)}`;
}
//@ chunk-3wek6r2k.js:47336-47345 placement
var Ir = 8;
//@ chunk-3wek6r2k.js:47345-47475 placement
function listNamesCapped(e) {
  let mapped = e.slice(0, Ir).map((n) => printableName(n, 64));
  return e.length > Ir ? `${mapped.join(", ")} (and ${e.length - Ir} more)` : mapped.join(", ");
}
//@ chunk-3wek6r2k.js:47475-47600 placement
function isNonEmptyValue_2(e) {
  if (Array.isArray(e)) return e.length > 0;
  return typeof e === "object" && e !== null ? Object.keys(e).length > 0 : Boolean(e);
}
//@ chunk-3wek6r2k.js:47600-47688 placement
function cloudPermissionModeFrom(e) {
  let o = e ? permissionModeFromString(e) : void 0;
  return o && isExternalPermissionMode(o) && o !== "bypassPermissions" ? o : void 0;
}
//@ chunk-3wek6r2k.js:47688-47760 placement
function describeBindingOutcome(e) {
  return e ? GNe(e) : "the binding outcome was never reported";
}
/**
 * 会话 ID 的展示形式（cse_ 转成 session_，截断到 128）。
 */
//@ chunk-3wek6r2k.js:47760-47841 placement = toCompatSessionId (1)
function displaySessionId(id) {
  let o = id.startsWith("cse_") ? `session_${sessionIdBody(id)}` : id;
  return printableName(o, 128);
}
/**
 * "云会话已创建但本机未能绑定"的错误文字。
 */
//@ chunk-3wek6r2k.js:47841-47978 placement
function formatBindFailure(e, o, n, r) {
  return `Error: cloud session ${displaySessionId(e)} was created but this machine could not be bound to it: ${describeBindingOutcome(o)}. ${cloudSessionLeftNote(r, n)}`;
}
//@ chunk-3wek6r2k.js:47978-48150 placement
function formatServeSetupFailure(e, o, n, r) {
  return `Error: cloud session ${displaySessionId(e)} was created and bound to this machine, but this machine could not be set up to serve it (${printableName(o)}). ${cloudSessionLeftNote(r, n)}`;
}
//@ chunk-3wek6r2k.js:48150-48362 placement
function cloudSessionLeftNote(e, o) {
  let n = printableName(o, 200);
  return e
    ? `It was archived (nothing was left running); it is listed under Archived at ${n}.`
    : `It was left running and could not be archived from here; open or archive it at ${n}.`;
}
//@ chunk-3wek6r2k.js:48362-48487 placement
function formatArchivedSessionError(e, o) {
  return `Error: cloud session ${displaySessionId(e)} is archived and cannot accept new messages. View it at ${printableName(o, 200)}`;
}
//@ chunk-3wek6r2k.js:48487-48623 placement
function formatUnboundCreateError(e, o = describeBindingOutcome(e)) {
  return `Error: a cloud session started from here could not be bound to this machine: ${o}. Nothing was created.`;
}
//@ chunk-3wek6r2k.js:48623-48820 placement
function cloudSessionJsonSummary({
  sessionId: sessionId,
  viewUrl: viewUrl,
  device: device,
  directorySync: directorySync,
  repositoryTrust: repositoryTrust,
}) {
  return {
    id: displaySessionId(sessionId),
    view_url: printableName(viewUrl, 200),
    device: device,
    directory_sync: directorySync,
    client_version: 1,
    ...(repositoryTrust !== void 0 && { repository_trust: repositoryTrust }),
  };
}
//@ chunk-3wek6r2k.js:48820-48895 placement
var PROMPT_OPTION_KEYS = ["systemPrompt", "appendSystemPrompt", "appendSubagentSystemPrompt"];
//@ chunk-3wek6r2k.js:48895-49356 placement
function cloudPromptOverrides(e, o) {
  let n = (o?.systemPrompt !== void 0 ? cu(o.systemPrompt) : void 0) ?? e.customSystemPrompt,
    r = o?.appendSystemPrompt !== void 0 ? o.appendSystemPrompt : e.appendSystemPrompt,
    u =
      o?.appendSubagentSystemPrompt !== void 0 ? o.appendSubagentSystemPrompt : e.appendSubagentSystemPrompt,
    {
      customSystemPrompt: customSystemPrompt,
      appendSystemPrompt: appendSystemPrompt,
      appendSubagentSystemPrompt: appendSubagentSystemPrompt,
      ...y
    } = e;
  return {
    ...y,
    ...(n && { customSystemPrompt: n }),
    ...(r && { appendSystemPrompt: r }),
    ...(u && { appendSubagentSystemPrompt: u }),
  };
}
//@ chunk-3wek6r2k.js:49356-49448 placement
function cu(e) {
  let trimmed = e
    .filter((n) => n !== "" && n !== SYSTEM_PROMPT_DYNAMIC_BOUNDARY)
    .join(
      `

`,
    )
    .trim();
  return trimmed === "" ? void 0 : trimmed;
}
/**
 * 表示“云会话启动”的根选项键（cloud、remote、teleport、attachServe、project、environment、pool、monorepo、noMonorepo）。
 */
//@ chunk-3wek6r2k.js:49448-49555 placement
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
//@ chunk-3wek6r2k.js:49555-49686 placement
function parseTriBoolFlag(e) {
  switch (e) {
    case void 0:
      return null;
    case "true":
    case "1":
      return !0;
    case "false":
    case "0":
      return !1;
    default:
      return "invalid";
  }
}

export {
  cloudPermissionModeFrom,
  CLOUD_SESSION_OPTION_KEYS,
  Lr,
  parseTriBoolFlag,
  displaySessionId,
  PROMPT_OPTION_KEYS,
  cloudPromptOverrides,
  checkCloudLaunchFlags,
  formatUnboundCreateError,
  formatBindFailure,
  formatServeSetupFailure,
  cloudSessionJsonSummary,
  formatArchivedSessionError,
};

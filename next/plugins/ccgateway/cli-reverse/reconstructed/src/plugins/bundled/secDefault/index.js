/**
 * plugins/bundled/secDefault/index.ts
 *
 * 2.1.316 新增：sec-default 插件的 hooks：把各类提示词、上下文、技能、工具描述事件统一追加处理并做审核；注册安全默认插件（有托管设置或 Team/Enterprise 时放在最外层）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ykab7xp3.js (61)
 * attribution: placement 60, affinity 1
 */
import { __commonJS, __export } from "../../../../runtime/bun-runtime.js";
import {
  MANAGED_MOD_OPTIONS,
  managedModsPolicyKey,
  dispatchClassicEvent,
  canSkipEmptyClassicDispatch,
  isLoneSecDefaultShortcut,
  canShortcutAppend,
} from "../../functionHooks/modAdmission.js";
import {
  SESSION_ATTACHMENT_KINDS,
  SESSION_APPEND_HOOK_EVENTS,
  toSessionAppendDoorPatterns,
  collectPassedOverHooks,
  filterFreezablePatterns,
  findReopeningPlugins,
} from "../../../utils/plugins/functionHooks/hookPatterns.js";
import {
  SEAT_BY_DEFAULT,
  resolveSecurityPluginSeat,
  outermostSeatCache,
} from "../../../utils/plugins/managedPluginSeating.js";
import {
  DEFAULT_SECURITY_SEAT_PLUGIN,
  defaultSecuritySeat,
  clearEmptySettingsPresence,
  isProMaxWithoutSettings,
  markSettingsPresenceEmpty,
  noteServedSettings,
  settingsPresenceSignal,
} from "../../../services/remoteManagedSettings/seating.js";
import { SEC_DEFAULT_PLUGIN_NAME } from "../../../utils/plugins/securityDefaultPlugin.js";
import { isSecDefaultModule, getLoadedModulesForSite } from "../../hooksModules/loadedModuleFilters.js";
import {
  bearerAccountOverride,
  recordBearerAccountOverride,
} from "../../../services/oauth/bearerAccountOverride.js";
import { SKILL_TOOL_NAME } from "../../../tools/SkillTool/constants.js";
import { resolveManagedPluginOrder } from "../../../utils/plugins/managedPlugins.js";
import { registerBuiltinPlugin, builtinHooksModuleRef, getModsFolderPath } from "../../builtinPlugins.js";

//@ chunk-ykab7xp3.js:4526-4960 placement
/**
 * sec-default 插件的 hooks 扫描清单。
 */
var SEC_DEFAULT_HOOKS_SCAN = __commonJS(function (requireFn, moduleObject) {
  moduleObject.exports = {
    scan: {
      hooks: [
        "classic.*",
        "prompt.section",
        "prompt.context",
        "prompt.attachment",
        "prompt.compose",
        "skill.prompt",
        "attribution.text",
        "session.append",
        "session.compact",
        "settings.read",
        "tool.describe",
        "command.describe",
        "agent.offer",
        "agent.spawn",
        "tool.register",
        "tool.list",
        "tool.check",
        "ui.log",
        "env.get",
        "env.set",
        "plugin.register",
      ],
      calls: ["settings.read", "ui.log"],
      nextTo: ["append"],
    },
    files: {},
  };
});
//@ chunk-ykab7xp3.js:4960-4970 placement
/**
 * 空对象
 */
var emptyHooksFirst = {};
//@ chunk-ykab7xp3.js:4970-5728 placement
__export(emptyHooksFirst, {
  ADMISSION_OPTIONS: () => MANAGED_MOD_OPTIONS,
  MOD_FOLDER: () => SEC_DEFAULT,
  PASSED_OVER_DOORS: () => SESSION_ATTACHMENT_KINDS,
  PASSED_OVER_EVENTS: () => SESSION_APPEND_HOOK_EVENTS,
  SEATS_OVER_POLICY_OMISSION: () => SEAT_BY_DEFAULT,
  SEC_DEFAULT_PLUGIN_ID: () => DEFAULT_SECURITY_SEAT_PLUGIN,
  SEC_DEFAULT_PLUGIN_NAME: () => SEC_DEFAULT_PLUGIN_NAME,
  admissionPolicy: () => managedModsPolicyKey,
  decidesClassicEvent: () => dispatchClassicEvent,
  default: () => emptyHooksFirst,
  defaultSeat: () => defaultSecuritySeat,
  forgetEmptyAnswer: () => clearEmptySettingsPresence,
  isAloneOnClassicEvent: () => canSkipEmptyClassicDispatch,
  isDefaultSeatOver: () => isProMaxWithoutSettings,
  isGuardModule: () => isSecDefaultModule,
  isReachedAlone: () => isLoneSecDefaultShortcut,
  isSeated: () => isSecDefaultOutermost,
  launchBearerPlan: () => bearerAccountOverride,
  modulesThatDecide: () => getLoadedModulesForSite,
  modulesWorthDispatch: () => canShortcutAppend,
  noteEmptyAnswer: () => markSettingsPresenceEmpty,
  noteLaunchBearerPlan: () => recordBearerAccountOverride,
  noteServedPolicy: () => noteServedSettings,
  passedOverDoorNames: () => toSessionAppendDoorPatterns,
  passedOverNotes: () => collectPassedOverHooks,
  passedOverPatterns: () => filterFreezablePatterns,
  policyAnswer: () => settingsPresenceSignal,
  registerPlugin: () => registerSecDefaultPlugin,
  reopenersOf: () => findReopeningPlugins,
  seat: () => resolveSecurityPluginSeat,
  seatHeld: () => outermostSeatCache,
});
//@ chunk-ykab7xp3.js:5728-5737 placement
/**
 * 空对象
 */
var emptyHooksSecond = {};
//@ chunk-ykab7xp3.js:5737-6859 placement
__export(emptyHooksSecond, {
  CODE_LOADING_VARIABLES: () => DANGEROUS_ENV_VARS,
  LENIENCY: () => LENIENCY,
  OWN_OPTIONS_PATH: () => SEC_DEFAULT_OPTIONS_PATH,
  POLICY_MEMO_MS: () => MAX_TOOL_NAMES,
  POLICY_SOURCE_VARIABLES: () => PROTECTED_CONFIG_ENV_VARS,
  PROCESS_WRAPPER_VARIABLE: () => CLAUDE_CODE_PROCESS_WRAPPER,
  SKILL_TOOL: () => SKILL_TOOL_NAME,
  SOURCE: () => POLICY_SOURCE_ONLY,
  TIERS_HOLDING_USERS: () => TIERS_HOLDING_USERS,
  TOOL_REGISTER_REFUSAL: () => ALLOWED_MCP_WARNING,
  UNCHECKED_DENY: () => UNCHECKED_DENY,
  USER_REACHABLE_TIERS: () => USER_REACHABLE_TIERS,
  admissionFailure: () => registerHookJudgeError,
  askKind: () => describeAskSource,
  caughtAnswer: () => decideOrFreeze,
  createPolicyMemo: () => throttleValue,
  decidedByPolicy: () => settleTrueOnError,
  default: () => emptyHooksSecond,
  denyRulesHold: () => isDenyRuleProtected,
  foldedId: () => nfcLower,
  formsOf: () => normalizationVariants,
  handedTo: () => firstReturnedBy,
  hasMcpAllowlist: () => hasAllowedMcpServerList,
  heldKind: () => decisionNoun,
  heldNotice: () => formatOverrideRefusal,
  holdsOver: () => isOverriddenDecision,
  isEnabledEntry: () => isTrueOrArray,
  isLooser: () => isStrongerDecision,
  isManagedModsOnly: () => isManagedModsOnly,
  isOrgTool: () => isOrgToolName,
  isPersonWritable: () => isPersonWritablePolicy,
  isPinnedVariable: () => isProtectedEnvKey,
  isSameVerdict: () => sameDecision,
  isServerFileUnreadable: () => isManagedMcpUnreadable,
  isSkillRow: () => isSkillToolOrigin,
  managedModsOnlyRefusal: () => managedModsOnlyMessage,
  managedToolsRestored: () => orderOrgToolsFirst,
  memberOf: () => getFromMap,
  nameOfId: () => stripVersionSuffix,
  namesOrgTool: () => getMcpPrefix,
  orgNames: () => toolNamesReservedForOrg,
  orgPluginNames: () => listOrgPluginsBeforeSecDefault,
  orgServerNames: () => orgMcpServerNames,
  ownOption: () => getSecDefaultOption,
  pastUsers: () => appendForUntrustedTier,
  pinnedNames: () => protectedEnvKeys,
  pinnedVariableRefusal: () => managedEnvRejection,
  pluginOf: () => pluginOf,
  register: () => secDefaultHooks,
  registerRefusalOf: () => reservedToolNameReason,
  rewrittenByUsers: () => pluginsThatChangedDecision,
  serverNameRefusal: () => orgToolNameClashMessage,
  spellingsOf: () => serverNameVariants,
  toolPrefixOf: () => _,
});
//@ chunk-ykab7xp3.js:6859-6898 placement
/**
 * sec-default 是否在最外层
 */
var isSecDefaultOutermost = () =>
  resolveManagedPluginOrder().outermost.includes(DEFAULT_SECURITY_SEAT_PLUGIN);
//@ chunk-ykab7xp3.js:6898-6918 placement
var SEC_DEFAULT = "sec-default";
//@ chunk-ykab7xp3.js:6918-7014 placement
/**
 * 钩子判定失败的错误文本
 */
var registerHookJudgeError = (name, error) =>
  `plugin.register hook failed judging ${name} (${error.kind}): ` + (error.message ?? "no message");
//@ chunk-ykab7xp3.js:7014-7034 placement
/**
 * 取条目的 plugin
 */
var pluginOf = (ask) => ask.plugin;
//@ chunk-ykab7xp3.js:7034-7235 placement
/**
 * 描述 ask 决定来自哪里（某钩子、某设置、某插件、ask 上限或宿主）。
 */
function describeAskSource(ask) {
  let plugin = pluginOf(ask);
  let hasHook = ask.hook !== undefined;
  let hasSetting = ask.setting !== undefined;
  let hasPlugin = plugin !== undefined;
  let hasCeiling = ask.ceiling !== undefined;
  return hasHook
    ? `${ask.hook} hook's ask`
    : hasSetting
      ? `${ask.setting} setting's ask`
      : hasPlugin
        ? `${plugin}'s ask`
        : hasCeiling
          ? "ask cap"
          : "host's ask";
}
//@ chunk-ykab7xp3.js:7235-7392 placement
/**
 * 两个决定对象（忽略 undefined 字段）是否相同。
 */
var sameDecision = (a, b) =>
  b !== undefined &&
  [a, b]
    .map((decision) =>
      JSON.stringify(
        Object.entries(decision)
          .filter(([, value]) => value !== undefined)
          .toSorted(([keyA], [keyB]) => (keyA < keyB ? -1 : 1)),
      ),
    )
    .every((value, index, list) => value === list[0]);
//@ chunk-ykab7xp3.js:7392-7460 placement
/**
 * 找第一个有 returned 的钩子结果
 */
var firstReturnedBy = (asks, index) =>
  asks.slice(index + 1).find((ask) => ask.returned !== undefined)?.returned;
//@ chunk-ykab7xp3.js:7460-7504 placement
var LENIENCY = Object.freeze({
  deny: 0,
  ask: 1,
  allow: 2,
});
//@ chunk-ykab7xp3.js:7504-7566 placement
/**
 * 决定强度比较
 */
var isStrongerDecision = (candidate, previous) =>
  candidate !== undefined && LENIENCY[candidate.decision] > LENIENCY[previous?.decision ?? "deny"];
//@ chunk-ykab7xp3.js:7566-7607 placement
var TIERS_HOLDING_USERS = Object.freeze(["user", "prepend"]);
//@ chunk-ykab7xp3.js:7607-7801 placement
/**
 * 插件改动的决定是否覆盖了不允许覆盖的来源（deny、规则、钩子、设置、上限、宿主 ask）。
 */
function isOverriddenDecision(ask, previous, approver) {
  let isAsk = ask.decision === "ask";
  return (
    !isStrongerDecision(ask, previous) &&
    !sameDecision(ask, previous) &&
    (ask.decision === "deny" ||
      ask.rule !== undefined ||
      ask.hook !== undefined ||
      ask.setting !== undefined ||
      pluginOf(ask) !== undefined ||
      ask.ceiling !== undefined ||
      (isAsk && approver === "host"))
  );
}
//@ chunk-ykab7xp3.js:7801-7948 placement
/**
 * 列出在受限层级中改变了决定的插件。
 */
var pluginsThatChangedDecision = (trace) =>
  trace
    .filter((entry, index) => {
      let effective = firstReturnedBy(trace, index);
      return (
        TIERS_HOLDING_USERS.includes(entry.tier) &&
        entry.returned !== undefined &&
        !isStrongerDecision(effective, entry.returned) &&
        !sameDecision(entry.returned, effective)
      );
    })
    .map((entry) => entry.plugin);
//@ chunk-ykab7xp3.js:7948-8087 placement
var UNCHECKED_DENY = Object.freeze({
  decision: "deny",
  reason: "the rules and hooks in your settings could not be checked for this call, so it is refused",
});
//@ chunk-ykab7xp3.js:8087-8144 placement
/**
 * 有决定且未被插件改变则用，否则冻结
 */
function decideOrFreeze(decision, trace) {
  return decision !== undefined && pluginsThatChangedDecision(trace).length === 0 ? decision : UNCHECKED_DENY;
}
//@ chunk-ykab7xp3.js:8144-8249 placement
/**
 * 决定的名称（deny/ask rule、refusal 或 ask 来源）。
 */
function decisionNoun(ask) {
  let hasRule = ask.rule !== undefined;
  let isDeny = ask.decision === "deny";
  return hasRule ? `${ask.decision} rule` : isDeny ? "refusal" : describeAskSource(ask);
}
//@ chunk-ykab7xp3.js:8249-8523 placement
/**
 * 插件试图推翻设置中的规则时的说明文本（allowModsToOverrideDenyRules）。
 */
function formatOverrideRefusal(plugin, tool, ask, action) {
  let noun = decisionNoun(ask);
  let article = noun.startsWith("a") ? "an" : "a";
  let sourceText =
    ask.rule === undefined
      ? `${article} ${noun} from a ${tool} call`
      : `${article} ${noun} in your settings from a ${tool} call (${ask.rule})`;
  return `${plugin} tried to ${action} ${sourceText}; the ${noun} holds over the plugins you install (allowModsToOverrideDenyRules)`;
}
//@ chunk-ykab7xp3.js:8523-8630 placement
/**
 * allowManagedModsOnly 策略下插件未加载的说明。
 */
var managedModsOnlyMessage = (name) =>
  `mods are limited to your organization's by policy (allowManagedModsOnly); ${name} was not loaded`;
//@ chunk-ykab7xp3.js:8630-8677 placement
var USER_REACHABLE_TIERS = Object.freeze(["user", "builtin", "core"]);
//@ chunk-ykab7xp3.js:8677-8751 placement
/**
 * 非受信层级只能 append
 */
function appendForUntrustedTier(ctx, next) {
  return USER_REACHABLE_TIERS.includes(ctx.provider?.tier) ? next(ctx) : next.to(ctx, "append");
}
//@ chunk-ykab7xp3.js:8751-8828 placement
/**
 * 托管环境变量不可改的提示
 */
var managedEnvRejection = (name) => `env (managed): ${name} is not for plugins outside policy to change`;
//@ chunk-ykab7xp3.js:8828-8986 placement
/**
 * 可劫持进程的环境变量（LD_PRELOAD、DYLD_*、BASH_ENV、NODE_OPTIONS 等）。
 */
var DANGEROUS_ENV_VARS = [
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "LD_AUDIT",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
  "BASH_ENV",
  "ENV",
  "ZDOTDIR",
  "NODE_OPTIONS",
];
//@ chunk-ykab7xp3.js:8986-9107 placement
/**
 * 在 e 毫秒内复用上次计算结果的节流器。
 */
function throttleValue(windowMs, now = Date.now) {
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let lastValue;
  return (compute) => {
    if (lastValue === undefined || now() - NEGATIVE_INFINITY > windowMs) {
      NEGATIVE_INFINITY = now();
      lastValue = compute();
    }
    return lastValue ?? compute();
  };
}
//@ chunk-ykab7xp3.js:9107-9144 placement
/**
 * 出错也当成功
 */
var settleTrueOnError = (promise, isDenyRuleProtected) => promise.then(isDenyRuleProtected).catch(() => true);
//@ chunk-ykab7xp3.js:9144-9183 placement
/**
 * 策略允许本人修改
 */
var isPersonWritablePolicy = (ctx) => ctx.personWritablePolicy === true;
//@ chunk-ykab7xp3.js:9183-9277 placement
/**
 * 对象取值（Map 化）
 */
function getFromMap(value, key) {
  return typeof value === "object" && value !== null ? new Map(Object.entries(value)).get(key) : undefined;
}
//@ chunk-ykab7xp3.js:9277-9343 placement
/**
 * 插件配置的 options 路径
 */
var SEC_DEFAULT_OPTIONS_PATH = ["pluginConfigs", "cc-plugin-sec-default@builtin", "options"];
//@ chunk-ykab7xp3.js:9343-9377 placement
/**
 * 取 sec-default 配置项
 */
var getSecDefaultOption = (settings, option) =>
  [...SEC_DEFAULT_OPTIONS_PATH, option].reduce(getFromMap, settings);
//@ chunk-ykab7xp3.js:9377-9435 placement
/**
 * deny 规则是否受保护
 */
var isDenyRuleProtected = (ctx) =>
  isPersonWritablePolicy(ctx) || getSecDefaultOption(ctx, "allowModsToOverrideDenyRules") !== true;
//@ chunk-ykab7xp3.js:9435-9482 placement
/**
 * 是否声明了 allowedMcpServers
 */
var hasAllowedMcpServerList = (settings) => Array.isArray(settings.allowedMcpServers);
//@ chunk-ykab7xp3.js:9482-9557 placement
/**
 * 只允许托管插件
 */
function isManagedModsOnly(ctx) {
  let secDefaultOption = getSecDefaultOption(ctx, "allowManagedModsOnly");
  return secDefaultOption !== undefined && secDefaultOption !== false;
}
//@ chunk-ykab7xp3.js:9557-9831 placement
/**
 * 托管设置与 OAuth 配置相关的保护环境变量。
 */
var PROTECTED_CONFIG_ENV_VARS = [
  "CLAUDE_CODE_MANAGED_SETTINGS_PATH",
  "CLAUDE_CODE_REMOTE_SETTINGS_PATH",
  "CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION",
  "CLAUDE_CODE_MOCK_REMOTE_SETTINGS",
  "CLAUDE_CONFIG_DIR",
  "CLAUDE_SECURESTORAGE_CONFIG_DIR",
  "USE_LOCAL_OAUTH",
  "USE_STAGING_OAUTH",
  "CLAUDE_LOCAL_OAUTH_API_BASE",
];
//@ chunk-ykab7xp3.js:9831-9867 placement
var CLAUDE_CODE_PROCESS_WRAPPER = "CLAUDE_CODE_PROCESS_WRAPPER";
//@ chunk-ykab7xp3.js:9867-9969 placement
/**
 * 插件不得改写的环境变量键（设置 env 中的键、进程包装器、保护变量与危险变量）。
 */
function protectedEnvKeys(ctx) {
  let hasWrapper = ctx.processWrapper !== undefined;
  return [
    ...Object.keys(ctx.env ?? {}),
    ...(hasWrapper ? [CLAUDE_CODE_PROCESS_WRAPPER] : []),
    ...PROTECTED_CONFIG_ENV_VARS,
    ...DANGEROUS_ENV_VARS,
  ];
}
//@ chunk-ykab7xp3.js:9969-10033 placement
/**
 * 是否为受保护环境变量
 */
var isProtectedEnvKey = (ctx, name) =>
  protectedEnvKeys(ctx).some((key) => key.toUpperCase() === name.toUpperCase());
//@ chunk-ykab7xp3.js:10033-10079 placement
/**
 * 托管 MCP 列表不可读
 */
var isManagedMcpUnreadable = (ctx) => ctx.managedMcpServersUnreadable === true;
//@ chunk-ykab7xp3.js:10079-10123 placement (2.1.88 match: setCwdState, 1)
var nfcLower = (cwd) => cwd.normalize("NFC").toLowerCase();
//@ chunk-ykab7xp3.js:10123-10205 placement
/**
 * NFC/NFD 两种归一化
 */
var normalizationVariants = (name) => {
  let normalized = name.normalize("NFC");
  let normalized_2 = name.normalize("NFD");
  return normalized === normalized_2 ? [normalized] : [normalized, normalized_2];
};
//@ chunk-ykab7xp3.js:10205-10241 placement
/**
 * true 或数组
 */
var isTrueOrArray = (value) => value === true || Array.isArray(value);
//@ chunk-ykab7xp3.js:10241-10306 placement
/**
 * 去掉 @版本
 */
function stripVersionSuffix(id) {
  let index = id.lastIndexOf("@");
  return index > 0 ? id.slice(0, index) : id;
}
//@ chunk-ykab7xp3.js:10306-10660 placement
/**
 * 列出组织在 sec-default 之前启用的插件。
 */
function listOrgPluginsBeforeSecDefault(ctx, cwd) {
  let flattened = Object.entries(ctx.enabledPlugins ?? {}).flatMap(([key, value]) =>
    isTrueOrArray(value) && !key.endsWith("@builtin") ? [key] : [],
  );
  let isSameCwd = (cwd_2) => typeof cwd === "string" && nfcLower(cwd_2) === nfcLower(cwd);
  let any = flattened.some(isSameCwd);
  return [ctx.prependPlugins, ctx.appendPlugins, flattened].flatMap((list) =>
    (Array.isArray(list) ? list : []).flatMap((pluginId) => {
      let name = typeof pluginId === "string" ? stripVersionSuffix(pluginId) : "";
      let isThisProject = typeof pluginId === "string" && any && isSameCwd(pluginId);
      return name !== "" && !isThisProject ? normalizationVariants(name) : [];
    }),
  );
}
//@ chunk-ykab7xp3.js:10660-10956 placement
/**
 * 组织允许/托管的 MCP 服务器名列表。
 */
function orgMcpServerNames(settings) {
  let { allowedMcpServers, managedMcpServers } = settings;
  let hasManagedMap = typeof managedMcpServers === "object" && !Array.isArray(managedMcpServers);
  return [
    ...(Array.isArray(allowedMcpServers) ? allowedMcpServers : []).flatMap((entry) => {
      let serverName =
        typeof entry === "object" && entry !== null && "serverName" in entry ? entry.serverName : undefined;
      return typeof serverName === "string" && serverName !== "" ? [serverName] : [];
    }),
    ...Object.keys(hasManagedMap ? (managedMcpServers ?? {}) : {}),
  ];
}
//@ chunk-ykab7xp3.js:10956-11099 placement
/**
 * 服务器名规范化后的变体（替换非法字符、合并下划线）。
 */
function serverNameVariants(name) {
  let replaced = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  let replaced_2 = replaced.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return [...new Set([replaced, replaced_2])].filter((variant) => variant !== "");
}
//@ chunk-ykab7xp3.js:11099-11200 placement
/**
 * 名称规范化为小写下划线形式。
 */
var normalizeToolPrefix = (name) =>
  name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase()
    .replace(/[-_]+/g, "_")
    .replace(/^_|_$/g, "");
//@ chunk-ykab7xp3.js:11200-11226 placement
var _ = (serverName) => `mcp_${normalizeToolPrefix(serverName)}_`;
//@ chunk-ykab7xp3.js:11226-11423 placement
/**
 * 工具名是否属于组织的 MCP 服务器或组织插件。
 */
var isOrgToolName = (ctx, name) =>
  (isManagedMcpUnreadable(ctx) && name.startsWith("mcp__")) ||
  orgMcpServerNames(ctx)
    .flatMap(serverNameVariants)
    .some((variant) => name.startsWith(`mcp__${variant}__`)) ||
  listOrgPluginsBeforeSecDefault(ctx)
    .filter((pluginId) => normalizeToolPrefix(pluginId) !== "")
    .flatMap((pluginId) => [pluginId, `plugin_${pluginId}`])
    .some((candidate) => `${normalizeToolPrefix(name)}_`.startsWith(_(candidate)));
//@ chunk-ykab7xp3.js:11423-11488 placement
/**
 * 组织保留的工具名前缀
 */
var toolNamesReservedForOrg = (ctx, cwd) => [
  ...orgMcpServerNames(ctx),
  ...listOrgPluginsBeforeSecDefault(ctx, cwd).flatMap((pluginId) => [pluginId, `plugin_${pluginId}`]),
];
//@ chunk-ykab7xp3.js:11488-11646 placement
/**
 * 组织工具排在前面，其他工具在后。
 */
function orderOrgToolsFirst(ctx, orgTools, otherTools) {
  return ctx === undefined || orgTools.value === undefined || otherTools.value === undefined
    ? orgTools
    : {
        value: [
          ...orgTools.value.filter((tool) => isOrgToolName(ctx, tool.name)),
          ...otherTools.value.filter((tool) => !isOrgToolName(ctx, tool.name)),
        ],
      };
}
//@ chunk-ykab7xp3.js:11646-11761 placement (2.1.88 match: getMcpPrefix, 1)
function getMcpPrefix(ctx, serverName, toolName, cwd) {
  let prefix = `${normalizeToolPrefix(`mcp__${serverName}__${toolName}`)}_`;
  return (
    isManagedMcpUnreadable(ctx) ||
    toolNamesReservedForOrg(ctx, cwd).some(
      (reserved) => normalizeToolPrefix(reserved) === "" || prefix.startsWith(_(reserved)),
    )
  );
}
//@ chunk-ykab7xp3.js:11761-11772 placement
/**
 * 500
 */
var MAX_TOOL_NAMES = 500;
//@ chunk-ykab7xp3.js:11772-11796 placement
/**
 * 只有 policy 来源
 */
var POLICY_SOURCE_ONLY = {
  source: "policy",
};
//@ chunk-ykab7xp3.js:11811-11866 affinity
/**
 * 判断消息 origin 是否为 Skill 工具产生。
 */
var isSkillToolOrigin = (ctx) => ctx.origin.kind === "tool" && ctx.origin.tool === SKILL_TOOL_NAME;
//@ chunk-ykab7xp3.js:11866-11986 placement
/**
 * 插件工具名冒充组织服务器工具时的说明。
 */
var orgToolNameClashMessage = (serverName) =>
  `managedMcpServers (managed): a tool of ${serverName} would be named as a tool of one of the organization's servers`;
//@ chunk-ykab7xp3.js:11986-12064 placement
/**
 * 托管 allowedMcpServers 的提示
 */
var ALLOWED_MCP_WARNING = "allowedMcpServers (managed): plugins outside policy may not add tools";
//@ chunk-ykab7xp3.js:12064-12115 placement
/**
 * 工具名冲突原因
 */
var reservedToolNameReason = (ctx, serverName, toolName, cwd) =>
  hasAllowedMcpServerList(ctx)
    ? ALLOWED_MCP_WARNING
    : getMcpPrefix(ctx, serverName, toolName, cwd)
      ? orgToolNameClashMessage(serverName)
      : undefined;
//@ chunk-ykab7xp3.js:12115-14738 placement
/**
 * sec-default 插件的 hooks：把各类提示词、上下文、技能、工具描述事件统一追加处理并做审核。
 */
function secDefaultHooks(on) {
  let readPolicyThrottled = throttleValue(MAX_TOOL_NAMES);
  let loggedMessages = new Set();
  let pluginProvenance = new Map();
  on("classic.*", (ctx, payload, next) => next.to(payload, "append"));
  on("prompt.section", (ctx, payload, next) => next.to(payload, "append"));
  on("prompt.context", (ctx, payload, next) => next.to(payload, "append"));
  on("prompt.attachment", (ctx, payload, next) => next.to(payload, "append"));
  on("prompt.compose", (ctx, payload, next) => next.to(payload, "append"));
  on("skill.prompt", (ctx, payload, next) => next.to(payload, "append"));
  on("attribution.text", (ctx, payload, next) => next.to(payload, "append"));
  on(
    "session.append",
    {
      door: "attachment",
    },
    (ctx, payload, next) => next.to(payload, "append"),
  );
  on(
    "session.append",
    {
      door: "hook-context",
    },
    (ctx, payload, next) => next.to(payload, "append"),
  );
  on(
    "session.append",
    {
      door: "compaction",
    },
    (ctx, payload, next) => next.to(payload, "append"),
  );
  on(
    "session.append",
    {
      door: "tool-message",
    },
    (ctx, payload, next) => (isSkillToolOrigin(payload) ? next.to(payload, "append") : next(payload)),
  );
  on(
    "session.append",
    {
      door: "note",
    },
    (ctx, payload, next) =>
      next.origin.tier === "prepend" || next.origin.tier === "append"
        ? next.to(payload, "append")
        : next(payload),
  );
  on("session.compact", (ctx, payload, next) => next.to(payload, "append"));
  on("settings.read", (ctx, payload, next) => next.to(payload, "append"));
  on("tool.describe", (ctx, payload, next) => appendForUntrustedTier(payload, next));
  on("command.describe", (ctx, payload, next) => appendForUntrustedTier(payload, next));
  on("agent.offer", (ctx, payload, next) => appendForUntrustedTier(payload, next));
  on("agent.spawn", (ctx, payload, next) => appendForUntrustedTier(payload, next));
  on("tool.register", async (ctx, payload, next) => {
    if (next.origin.tier === "prepend" || next.origin.tier === "append") return next.to(payload, "append");
    let refusal =
      next.origin.tier === "user"
        ? await readPolicyThrottled(() => ctx.settings.read(POLICY_SOURCE_ONLY))
            .then((settings) =>
              reservedToolNameReason(
                settings,
                next.origin.plugin,
                payload.name,
                pluginProvenance.get(next.origin.plugin),
              ),
            )
            .catch(() => ALLOWED_MCP_WARNING)
        : undefined;
    return refusal === undefined
      ? next(payload)
      : {
          deny: refusal,
        };
  });
  on("tool.list", async (ctx, payload, next) =>
    orderOrgToolsFirst(
      await readPolicyThrottled(() => ctx.settings.read(POLICY_SOURCE_ONLY)).catch(() => {
        return;
      }),
      await next.to(payload, "append"),
      await next(payload),
    ),
  );
  on("tool.check", async (ctx, payload, next) => {
    let before = await next(payload);
    let changedPlugins = pluginsThatChangedDecision(next.trace);
    if (!(
      changedPlugins.length > 0 &&
      (await settleTrueOnError(
        readPolicyThrottled(() => ctx.settings.read(POLICY_SOURCE_ONLY)),
        isDenyRuleProtected,
      ))
    ))
      return before;
    let after = await next.to(payload, "append");
    let { approver } = payload;
    if (!isOverriddenDecision(after, before, approver)) return before;
    let noun = decisionNoun(after);
    for (let plugin of changedPlugins.filter((plugin) => !loggedMessages.has(`${plugin} ${noun}`))) {
      loggedMessages.add(`${plugin} ${noun}`);
      ctx.ui.log(
        formatOverrideRefusal(
          plugin,
          payload.tool,
          after,
          isStrongerDecision(before, after) ? "lift" : "reword",
        ),
      );
    }
    return after;
  }).catch(async (error, payload, next) => {
    let settled = await next(payload).catch(() => {
      return;
    });
    return (await settleTrueOnError(
      readPolicyThrottled(() => error.settings.read(POLICY_SOURCE_ONLY)),
      isDenyRuleProtected,
    ))
      ? decideOrFreeze(settled, next.trace)
      : settled;
  });
  on("ui.log", (ctx, payload, next) =>
    next.origin.tier === "prepend" || next.origin.tier === "append"
      ? next.to(payload, "append")
      : next(payload),
  );
  on("env.get", (ctx, payload, next) =>
    next.origin.tier === "prepend" || next.origin.tier === "append"
      ? next.to(payload, "append")
      : next(payload),
  );
  on("env.set", async (ctx, payload, next) => {
    if (next.origin.tier === "prepend" || next.origin.tier === "append") return next.to(payload, "append");
    if (
      !(await settleTrueOnError(
        readPolicyThrottled(() => ctx.settings.read(POLICY_SOURCE_ONLY)),
        (settings) => isProtectedEnvKey(settings, payload.name),
      ))
    )
      return next(payload);
    return next.origin.tier === "user"
      ? {
          deny: managedEnvRejection(payload.name),
        }
      : next.to(payload, "append");
  }).catch((error, payload, next) => {
    if (next.called) return next(payload);
    return next.origin.tier === "user"
      ? {
          deny: managedEnvRejection(payload.name),
        }
      : next.to(payload, "append");
  });
  on(
    "plugin.register",
    {
      tier: "user",
    },
    async (ctx, payload, next) => {
      pluginProvenance.set(payload.name, payload.provenance);
      return isManagedModsOnly(await ctx.settings.read(POLICY_SOURCE_ONLY))
        ? {
            refuse: managedModsOnlyMessage(payload.name),
          }
        : next(payload);
    },
  ).catch((error, payload, next) => {
    error.ui.log(registerHookJudgeError(payload.name, next.error), {
      to: "debug",
    });
    return next.called
      ? next(payload)
      : {
          refuse: managedModsOnlyMessage(payload.name),
        };
  });
}
//@ chunk-ykab7xp3.js:14738-15274 placement
/**
 * 注册安全默认插件（有托管设置或 Team/Enterprise 时放在最外层）。
 */
var registerSecDefaultPlugin = () =>
  registerBuiltinPlugin({
    name: SEC_DEFAULT_PLUGIN_NAME,
    description:
      "Security default: seated outermost on a machine with managed settings and for Team and Enterprise organizations unless managed prependPlugins is set, in which case the organization lists cc-plugin-sec-default@builtin there or not; keeps the organization's classic hooks, prompt content, settings and tool policy out of reach of the plugins a person installs, and adds no policy of its own",
    enabledFromTrustedSettingsOnly: true,
    enabledFromPolicyOnly: true,
    isAvailable: isSecDefaultOutermost,
    hooksModule: builtinHooksModuleRef(getModsFolderPath(SEC_DEFAULT), emptyHooksSecond, () =>
      SEC_DEFAULT_HOOKS_SCAN(),
    ),
  });
export { SEC_DEFAULT, emptyHooksFirst, isSecDefaultOutermost, registerSecDefaultPlugin };

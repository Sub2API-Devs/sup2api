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
import { x, Ar } from "../../../../runtime/bun-runtime.js";
import {
  W4o,
  managedModsPolicyKey,
  dispatchClassicEvent,
  canSkipEmptyClassicDispatch,
  isLoneSecDefaultShortcut,
  canShortcutAppend,
} from "../../functionHooks/modAdmission.js";
import {
  aAo,
  dAo,
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
var SEC_DEFAULT_HOOKS_SCAN = x(function (Nn, Re) {
  Re.exports = {
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
Ar(emptyHooksFirst, {
  ADMISSION_OPTIONS: () => W4o,
  MOD_FOLDER: () => SEC_DEFAULT,
  PASSED_OVER_DOORS: () => aAo,
  PASSED_OVER_EVENTS: () => dAo,
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
Ar(emptyHooksSecond, {
  CODE_LOADING_VARIABLES: () => DANGEROUS_ENV_VARS,
  LENIENCY: () => A,
  OWN_OPTIONS_PATH: () => SEC_DEFAULT_OPTIONS_PATH,
  POLICY_MEMO_MS: () => MAX_TOOL_NAMES,
  POLICY_SOURCE_VARIABLES: () => PROTECTED_CONFIG_ENV_VARS,
  PROCESS_WRAPPER_VARIABLE: () => CLAUDE_CODE_PROCESS_WRAPPER,
  SKILL_TOOL: () => SKILL_TOOL_NAME,
  SOURCE: () => POLICY_SOURCE_ONLY,
  TIERS_HOLDING_USERS: () => ae,
  TOOL_REGISTER_REFUSAL: () => ALLOWED_MCP_WARNING,
  UNCHECKED_DENY: () => me,
  USER_REACHABLE_TIERS: () => V,
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
var pluginOf = (e) => e.plugin;
//@ chunk-ykab7xp3.js:7034-7235 placement
/**
 * 描述 ask 决定来自哪里（某钩子、某设置、某插件、ask 上限或宿主）。
 */
function describeAskSource(e) {
  let t = pluginOf(e);
  let s = e.hook !== undefined;
  let i = e.setting !== undefined;
  let n = t !== undefined;
  let r = e.ceiling !== undefined;
  return s
    ? `${e.hook} hook's ask`
    : i
      ? `${e.setting} setting's ask`
      : n
        ? `${t}'s ask`
        : r
          ? "ask cap"
          : "host's ask";
}
//@ chunk-ykab7xp3.js:7235-7392 placement
/**
 * 两个决定对象（忽略 undefined 字段）是否相同。
 */
var sameDecision = (e, t) =>
  t !== undefined &&
  [e, t]
    .map((s) =>
      JSON.stringify(
        Object.entries(s)
          .filter(([, value]) => value !== undefined)
          .toSorted(([i], [n]) => (i < n ? -1 : 1)),
      ),
    )
    .every((s, i, n) => s === n[0]);
//@ chunk-ykab7xp3.js:7392-7460 placement
/**
 * 找第一个有 returned 的钩子结果
 */
var firstReturnedBy = (e, t) => e.slice(t + 1).find((s) => s.returned !== undefined)?.returned;
//@ chunk-ykab7xp3.js:7460-7504 placement
var A = Object.freeze({
  deny: 0,
  ask: 1,
  allow: 2,
});
//@ chunk-ykab7xp3.js:7504-7566 placement
/**
 * 决定强度比较
 */
var isStrongerDecision = (e, t) => e !== undefined && A[e.decision] > A[t?.decision ?? "deny"];
//@ chunk-ykab7xp3.js:7566-7607 placement
var ae = Object.freeze(["user", "prepend"]);
//@ chunk-ykab7xp3.js:7607-7801 placement
/**
 * 插件改动的决定是否覆盖了不允许覆盖的来源（deny、规则、钩子、设置、上限、宿主 ask）。
 */
function isOverriddenDecision(e, t, approver) {
  let i = e.decision === "ask";
  return (
    !isStrongerDecision(e, t) &&
    !sameDecision(e, t) &&
    (e.decision === "deny" ||
      e.rule !== undefined ||
      e.hook !== undefined ||
      e.setting !== undefined ||
      pluginOf(e) !== undefined ||
      e.ceiling !== undefined ||
      (i && approver === "host"))
  );
}
//@ chunk-ykab7xp3.js:7801-7948 placement
/**
 * 列出在受限层级中改变了决定的插件。
 */
var pluginsThatChangedDecision = (e) =>
  e
    .filter((t, s) => {
      let i = firstReturnedBy(e, s);
      return (
        ae.includes(t.tier) &&
        t.returned !== undefined &&
        !isStrongerDecision(i, t.returned) &&
        !sameDecision(t.returned, i)
      );
    })
    .map((t) => t.plugin);
//@ chunk-ykab7xp3.js:7948-8087 placement
var me = Object.freeze({
  decision: "deny",
  reason: "the rules and hooks in your settings could not be checked for this call, so it is refused",
});
//@ chunk-ykab7xp3.js:8087-8144 placement
/**
 * 有决定且未被插件改变则用，否则冻结
 */
function decideOrFreeze(e, trace) {
  return e !== undefined && pluginsThatChangedDecision(trace).length === 0 ? e : me;
}
//@ chunk-ykab7xp3.js:8144-8249 placement
/**
 * 决定的名称（deny/ask rule、refusal 或 ask 来源）。
 */
function decisionNoun(e) {
  let t = e.rule !== undefined;
  let s = e.decision === "deny";
  return t ? `${e.decision} rule` : s ? "refusal" : describeAskSource(e);
}
//@ chunk-ykab7xp3.js:8249-8523 placement
/**
 * 插件试图推翻设置中的规则时的说明文本（allowModsToOverrideDenyRules）。
 */
function formatOverrideRefusal(e, tool, s, i) {
  let n = decisionNoun(s);
  let r = n.startsWith("a") ? "an" : "a";
  let o =
    s.rule === undefined
      ? `${r} ${n} from a ${tool} call`
      : `${r} ${n} in your settings from a ${tool} call (${s.rule})`;
  return `${e} tried to ${i} ${o}; the ${n} holds over the plugins you install (allowModsToOverrideDenyRules)`;
}
//@ chunk-ykab7xp3.js:8523-8630 placement
/**
 * allowManagedModsOnly 策略下插件未加载的说明。
 */
var managedModsOnlyMessage = (name) =>
  `mods are limited to your organization's by policy (allowManagedModsOnly); ${name} was not loaded`;
//@ chunk-ykab7xp3.js:8630-8677 placement
var V = Object.freeze(["user", "builtin", "core"]);
//@ chunk-ykab7xp3.js:8677-8751 placement
/**
 * 非受信层级只能 append
 */
function appendForUntrustedTier(e, t) {
  return V.includes(e.provider?.tier) ? t(e) : t.to(e, "append");
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
function throttleValue(e, t = Date.now) {
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let i;
  return (n) => {
    if (i === undefined || t() - NEGATIVE_INFINITY > e) {
      NEGATIVE_INFINITY = t();
      i = n();
    }
    return i ?? n();
  };
}
//@ chunk-ykab7xp3.js:9107-9144 placement
/**
 * 出错也当成功
 */
var settleTrueOnError = (e, isDenyRuleProtected) => e.then(isDenyRuleProtected).catch(() => true);
//@ chunk-ykab7xp3.js:9144-9183 placement
/**
 * 策略允许本人修改
 */
var isPersonWritablePolicy = (e) => e.personWritablePolicy === true;
//@ chunk-ykab7xp3.js:9183-9277 placement
/**
 * 对象取值（Map 化）
 */
function getFromMap(e, t) {
  return typeof e === "object" && e !== null ? new Map(Object.entries(e)).get(t) : undefined;
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
var getSecDefaultOption = (e, t) => [...SEC_DEFAULT_OPTIONS_PATH, t].reduce(getFromMap, e);
//@ chunk-ykab7xp3.js:9377-9435 placement
/**
 * deny 规则是否受保护
 */
var isDenyRuleProtected = (e) =>
  isPersonWritablePolicy(e) || getSecDefaultOption(e, "allowModsToOverrideDenyRules") !== true;
//@ chunk-ykab7xp3.js:9435-9482 placement
/**
 * 是否声明了 allowedMcpServers
 */
var hasAllowedMcpServerList = (e) => Array.isArray(e.allowedMcpServers);
//@ chunk-ykab7xp3.js:9482-9557 placement
/**
 * 只允许托管插件
 */
function isManagedModsOnly(e) {
  let secDefaultOption = getSecDefaultOption(e, "allowManagedModsOnly");
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
function protectedEnvKeys(e) {
  let t = e.processWrapper !== undefined;
  return [
    ...Object.keys(e.env ?? {}),
    ...(t ? [CLAUDE_CODE_PROCESS_WRAPPER] : []),
    ...PROTECTED_CONFIG_ENV_VARS,
    ...DANGEROUS_ENV_VARS,
  ];
}
//@ chunk-ykab7xp3.js:9969-10033 placement
/**
 * 是否为受保护环境变量
 */
var isProtectedEnvKey = (e, name) => protectedEnvKeys(e).some((s) => s.toUpperCase() === name.toUpperCase());
//@ chunk-ykab7xp3.js:10033-10079 placement
/**
 * 托管 MCP 列表不可读
 */
var isManagedMcpUnreadable = (e) => e.managedMcpServersUnreadable === true;
//@ chunk-ykab7xp3.js:10079-10123 placement = setCwdState (1)
var nfcLower = (cwd) => cwd.normalize("NFC").toLowerCase();
//@ chunk-ykab7xp3.js:10123-10205 placement
/**
 * NFC/NFD 两种归一化
 */
var normalizationVariants = (e) => {
  let normalized = e.normalize("NFC");
  let normalized_2 = e.normalize("NFD");
  return normalized === normalized_2 ? [normalized] : [normalized, normalized_2];
};
//@ chunk-ykab7xp3.js:10205-10241 placement
/**
 * true 或数组
 */
var isTrueOrArray = (e) => e === true || Array.isArray(e);
//@ chunk-ykab7xp3.js:10241-10306 placement
/**
 * 去掉 @版本
 */
function stripVersionSuffix(e) {
  let index = e.lastIndexOf("@");
  return index > 0 ? e.slice(0, index) : e;
}
//@ chunk-ykab7xp3.js:10306-10660 placement
/**
 * 列出组织在 sec-default 之前启用的插件。
 */
function listOrgPluginsBeforeSecDefault(e, cwd) {
  let flattened = Object.entries(e.enabledPlugins ?? {}).flatMap(([key, value]) =>
    isTrueOrArray(value) && !key.endsWith("@builtin") ? [key] : [],
  );
  let i = (cwd_2) => typeof cwd === "string" && nfcLower(cwd_2) === nfcLower(cwd);
  let any = flattened.some(i);
  return [e.prependPlugins, e.appendPlugins, flattened].flatMap((r) =>
    (Array.isArray(r) ? r : []).flatMap((o) => {
      let p = typeof o === "string" ? stripVersionSuffix(o) : "";
      let a = typeof o === "string" && any && i(o);
      return p !== "" && !a ? normalizationVariants(p) : [];
    }),
  );
}
//@ chunk-ykab7xp3.js:10660-10956 placement
/**
 * 组织允许/托管的 MCP 服务器名列表。
 */
function orgMcpServerNames(e) {
  let { allowedMcpServers, managedMcpServers } = e;
  let i = typeof managedMcpServers === "object" && !Array.isArray(managedMcpServers);
  return [
    ...(Array.isArray(allowedMcpServers) ? allowedMcpServers : []).flatMap((n) => {
      let serverName = typeof n === "object" && n !== null && "serverName" in n ? n.serverName : undefined;
      return typeof serverName === "string" && serverName !== "" ? [serverName] : [];
    }),
    ...Object.keys(i ? (managedMcpServers ?? {}) : {}),
  ];
}
//@ chunk-ykab7xp3.js:10956-11099 placement
/**
 * 服务器名规范化后的变体（替换非法字符、合并下划线）。
 */
function serverNameVariants(e) {
  let replaced = e.replace(/[^a-zA-Z0-9_-]/g, "_");
  let replaced_2 = replaced.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return [...new Set([replaced, replaced_2])].filter((i) => i !== "");
}
//@ chunk-ykab7xp3.js:11099-11200 placement
/**
 * 名称规范化为小写下划线形式。
 */
var normalizeToolPrefix = (e) =>
  e
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase()
    .replace(/[-_]+/g, "_")
    .replace(/^_|_$/g, "");
//@ chunk-ykab7xp3.js:11200-11226 placement
var _ = (e) => `mcp_${normalizeToolPrefix(e)}_`;
//@ chunk-ykab7xp3.js:11226-11423 placement
/**
 * 工具名是否属于组织的 MCP 服务器或组织插件。
 */
var isOrgToolName = (e, name) =>
  (isManagedMcpUnreadable(e) && name.startsWith("mcp__")) ||
  orgMcpServerNames(e)
    .flatMap(serverNameVariants)
    .some((s) => name.startsWith(`mcp__${s}__`)) ||
  listOrgPluginsBeforeSecDefault(e)
    .filter((s) => normalizeToolPrefix(s) !== "")
    .flatMap((s) => [s, `plugin_${s}`])
    .some((s) => `${normalizeToolPrefix(name)}_`.startsWith(_(s)));
//@ chunk-ykab7xp3.js:11423-11488 placement
/**
 * 组织保留的工具名前缀
 */
var toolNamesReservedForOrg = (e, t) => [
  ...orgMcpServerNames(e),
  ...listOrgPluginsBeforeSecDefault(e, t).flatMap((s) => [s, `plugin_${s}`]),
];
//@ chunk-ykab7xp3.js:11488-11646 placement
/**
 * 组织工具排在前面，其他工具在后。
 */
function orderOrgToolsFirst(e, t, s) {
  return e === undefined || t.value === undefined || s.value === undefined
    ? t
    : {
        value: [
          ...t.value.filter((n) => isOrgToolName(e, n.name)),
          ...s.value.filter((n) => !isOrgToolName(e, n.name)),
        ],
      };
}
//@ chunk-ykab7xp3.js:11646-11761 placement = getMcpPrefix (1)
function getMcpPrefix(e, t, s, i) {
  let n = `${normalizeToolPrefix(`mcp__${t}__${s}`)}_`;
  return (
    isManagedMcpUnreadable(e) ||
    toolNamesReservedForOrg(e, i).some((r) => normalizeToolPrefix(r) === "" || n.startsWith(_(r)))
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
var isSkillToolOrigin = (e) => e.origin.kind === "tool" && e.origin.tool === SKILL_TOOL_NAME;
//@ chunk-ykab7xp3.js:11866-11986 placement
/**
 * 插件工具名冒充组织服务器工具时的说明。
 */
var orgToolNameClashMessage = (e) =>
  `managedMcpServers (managed): a tool of ${e} would be named as a tool of one of the organization's servers`;
//@ chunk-ykab7xp3.js:11986-12064 placement
/**
 * 托管 allowedMcpServers 的提示
 */
var ALLOWED_MCP_WARNING = "allowedMcpServers (managed): plugins outside policy may not add tools";
//@ chunk-ykab7xp3.js:12064-12115 placement
/**
 * 工具名冲突原因
 */
var reservedToolNameReason = (e, plugin, name, i) =>
  hasAllowedMcpServerList(e)
    ? ALLOWED_MCP_WARNING
    : getMcpPrefix(e, plugin, name, i)
      ? orgToolNameClashMessage(plugin)
      : undefined;
//@ chunk-ykab7xp3.js:12115-14738 placement
/**
 * sec-default 插件的 hooks：把各类提示词、上下文、技能、工具描述事件统一追加处理并做审核。
 */
function secDefaultHooks(e) {
  let t = throttleValue(MAX_TOOL_NAMES);
  let s = new Set();
  let i = new Map();
  e("classic.*", (n, r, o) => o.to(r, "append"));
  e("prompt.section", (n, r, o) => o.to(r, "append"));
  e("prompt.context", (n, r, o) => o.to(r, "append"));
  e("prompt.attachment", (n, r, o) => o.to(r, "append"));
  e("prompt.compose", (n, r, o) => o.to(r, "append"));
  e("skill.prompt", (n, r, o) => o.to(r, "append"));
  e("attribution.text", (n, r, o) => o.to(r, "append"));
  e(
    "session.append",
    {
      door: "attachment",
    },
    (n, r, o) => o.to(r, "append"),
  );
  e(
    "session.append",
    {
      door: "hook-context",
    },
    (n, r, o) => o.to(r, "append"),
  );
  e(
    "session.append",
    {
      door: "compaction",
    },
    (n, r, o) => o.to(r, "append"),
  );
  e(
    "session.append",
    {
      door: "tool-message",
    },
    (n, r, o) => (isSkillToolOrigin(r) ? o.to(r, "append") : o(r)),
  );
  e(
    "session.append",
    {
      door: "note",
    },
    (n, r, o) => (o.origin.tier === "prepend" || o.origin.tier === "append" ? o.to(r, "append") : o(r)),
  );
  e("session.compact", (n, r, o) => o.to(r, "append"));
  e("settings.read", (n, r, o) => o.to(r, "append"));
  e("tool.describe", (n, r, o) => appendForUntrustedTier(r, o));
  e("command.describe", (n, r, o) => appendForUntrustedTier(r, o));
  e("agent.offer", (n, r, o) => appendForUntrustedTier(r, o));
  e("agent.spawn", (n, r, o) => appendForUntrustedTier(r, o));
  e("tool.register", async (n, r, o) => {
    if (o.origin.tier === "prepend" || o.origin.tier === "append") return o.to(r, "append");
    let a =
      o.origin.tier === "user"
        ? await t(() => n.settings.read(POLICY_SOURCE_ONLY))
            .then((I) => reservedToolNameReason(I, o.origin.plugin, r.name, i.get(o.origin.plugin)))
            .catch(() => ALLOWED_MCP_WARNING)
        : undefined;
    return a === undefined
      ? o(r)
      : {
          deny: a,
        };
  });
  e("tool.list", async (n, r, o) =>
    orderOrgToolsFirst(
      await t(() => n.settings.read(POLICY_SOURCE_ONLY)).catch(() => {
        return;
      }),
      await o.to(r, "append"),
      await o(r),
    ),
  );
  e("tool.check", async (n, r, o) => {
    let p = await o(r);
    let a = pluginsThatChangedDecision(o.trace);
    if (!(
      a.length > 0 &&
      (await settleTrueOnError(
        t(() => n.settings.read(POLICY_SOURCE_ONLY)),
        isDenyRuleProtected,
      ))
    ))
      return p;
    let m = await o.to(r, "append");
    let { approver } = r;
    if (!isOverriddenDecision(m, p, approver)) return p;
    let se = decisionNoun(m);
    for (let ie of a.filter((Te) => !s.has(`${Te} ${se}`))) {
      s.add(`${ie} ${se}`);
      n.ui.log(formatOverrideRefusal(ie, r.tool, m, isStrongerDecision(p, m) ? "lift" : "reword"));
    }
    return m;
  }).catch(async (error, r, o) => {
    let p = await o(r).catch(() => {
      return;
    });
    return (await settleTrueOnError(
      t(() => error.settings.read(POLICY_SOURCE_ONLY)),
      isDenyRuleProtected,
    ))
      ? decideOrFreeze(p, o.trace)
      : p;
  });
  e("ui.log", (n, r, o) =>
    o.origin.tier === "prepend" || o.origin.tier === "append" ? o.to(r, "append") : o(r),
  );
  e("env.get", (n, r, o) =>
    o.origin.tier === "prepend" || o.origin.tier === "append" ? o.to(r, "append") : o(r),
  );
  e("env.set", async (n, r, o) => {
    if (o.origin.tier === "prepend" || o.origin.tier === "append") return o.to(r, "append");
    if (
      !(await settleTrueOnError(
        t(() => n.settings.read(POLICY_SOURCE_ONLY)),
        (m) => isProtectedEnvKey(m, r.name),
      ))
    )
      return o(r);
    return o.origin.tier === "user"
      ? {
          deny: managedEnvRejection(r.name),
        }
      : o.to(r, "append");
  }).catch((error, r, o) => {
    if (o.called) return o(r);
    return o.origin.tier === "user"
      ? {
          deny: managedEnvRejection(r.name),
        }
      : o.to(r, "append");
  });
  e(
    "plugin.register",
    {
      tier: "user",
    },
    async (n, r, o) => {
      i.set(r.name, r.provenance);
      return isManagedModsOnly(await n.settings.read(POLICY_SOURCE_ONLY))
        ? {
            refuse: managedModsOnlyMessage(r.name),
          }
        : o(r);
    },
  ).catch((error, r, o) => {
    error.ui.log(registerHookJudgeError(r.name, o.error), {
      to: "debug",
    });
    return o.called
      ? o(r)
      : {
          refuse: managedModsOnlyMessage(r.name),
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

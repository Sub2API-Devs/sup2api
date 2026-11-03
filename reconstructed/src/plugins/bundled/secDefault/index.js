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
  freeze as freeze_5,
  managedModsPolicyKey,
  dispatchClassicEvent,
  canSkipEmptyClassicDispatch,
  isLoneSecDefaultShortcut,
  canShortcutAppend,
} from "../../functionHooks/modAdmission.js";
import {
  freeze as freeze_6,
  freeze_2 as freeze_2_2,
  toSessionAppendDoorPatterns,
  collectPassedOverHooks,
  filterFreezablePatterns,
  findReopeningPlugins,
} from "../../../utils/plugins/functionHooks/hookPatterns.js";
import { Fmi, resolveSecurityPluginSeat, yJr } from "../../../utils/plugins/managedPluginSeating.js";
import {
  Tte,
  defaultSecuritySeat,
  mJr,
  isProMaxWithoutSettings,
  gJr,
  noteServedSettings,
  xJ,
} from "../../../services/remoteManagedSettings/seating.js";
import { SEC_DEFAULT_PLUGIN_NAME } from "../../../utils/plugins/securityDefaultPlugin.js";
import { vie, getLoadedModulesForSite } from "../../hooksModules/loadedModuleFilters.js";
import { Kkn, recordBearerAccountOverride } from "../../../services/oauth/bearerAccountOverride.js";
import { SKILL_TOOL_NAME } from "../../../tools/SkillTool/constants.js";
import { resolveManagedPluginOrder } from "../../../utils/plugins/managedPlugins.js";
import { registerBuiltinPlugin, builtinHooksModuleRef, getModsFolderPath } from "../../builtinPlugins.js";

/**
 * sec-default 插件的 hooks 扫描清单。
 */
//@ chunk-ykab7xp3.js:4526-4960 placement
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
var ne = {};
//@ chunk-ykab7xp3.js:4970-5728 placement
Ar(ne, {
  ADMISSION_OPTIONS: () => freeze_5,
  MOD_FOLDER: () => SEC_DEFAULT,
  PASSED_OVER_DOORS: () => freeze_6,
  PASSED_OVER_EVENTS: () => freeze_2_2,
  SEATS_OVER_POLICY_OMISSION: () => Fmi,
  SEC_DEFAULT_PLUGIN_ID: () => Tte,
  SEC_DEFAULT_PLUGIN_NAME: () => SEC_DEFAULT_PLUGIN_NAME,
  admissionPolicy: () => managedModsPolicyKey,
  decidesClassicEvent: () => dispatchClassicEvent,
  default: () => ne,
  defaultSeat: () => defaultSecuritySeat,
  forgetEmptyAnswer: () => mJr,
  isAloneOnClassicEvent: () => canSkipEmptyClassicDispatch,
  isDefaultSeatOver: () => isProMaxWithoutSettings,
  isGuardModule: () => vie,
  isReachedAlone: () => isLoneSecDefaultShortcut,
  isSeated: () => b,
  launchBearerPlan: () => Kkn,
  modulesThatDecide: () => getLoadedModulesForSite,
  modulesWorthDispatch: () => canShortcutAppend,
  noteEmptyAnswer: () => gJr,
  noteLaunchBearerPlan: () => recordBearerAccountOverride,
  noteServedPolicy: () => noteServedSettings,
  passedOverDoorNames: () => toSessionAppendDoorPatterns,
  passedOverNotes: () => collectPassedOverHooks,
  passedOverPatterns: () => filterFreezablePatterns,
  policyAnswer: () => xJ,
  registerPlugin: () => registerSecDefaultPlugin,
  reopenersOf: () => findReopeningPlugins,
  seat: () => resolveSecurityPluginSeat,
  seatHeld: () => yJr,
});
//@ chunk-ykab7xp3.js:5728-5737 placement
var R = {};
//@ chunk-ykab7xp3.js:5737-6859 placement
Ar(R, {
  CODE_LOADING_VARIABLES: () => DANGEROUS_ENV_VARS,
  LENIENCY: () => freeze,
  OWN_OPTIONS_PATH: () => j,
  POLICY_MEMO_MS: () => ye,
  POLICY_SOURCE_VARIABLES: () => PROTECTED_CONFIG_ENV_VARS,
  PROCESS_WRAPPER_VARIABLE: () => CLAUDE_CODE_PROCESS_WRAPPER,
  SKILL_TOOL: () => SKILL_TOOL_NAME,
  SOURCE: () => f,
  TIERS_HOLDING_USERS: () => freeze_2,
  TOOL_REGISTER_REFUSAL: () => y,
  UNCHECKED_DENY: () => freeze_3,
  USER_REACHABLE_TIERS: () => freeze_4,
  admissionFailure: () => w,
  askKind: () => describeAskSource,
  caughtAnswer: () => ce,
  createPolicyMemo: () => throttleValue,
  decidedByPolicy: () => k,
  default: () => R,
  denyRulesHold: () => G,
  foldedId: () => nfcLower,
  formsOf: () => K,
  handedTo: () => pe,
  hasMcpAllowlist: () => xe,
  heldKind: () => decisionNoun,
  heldNotice: () => formatOverrideRefusal,
  holdsOver: () => isOverriddenDecision,
  isEnabledEntry: () => Z,
  isLooser: () => h,
  isManagedModsOnly: () => Ee,
  isOrgTool: () => isOrgToolName,
  isPersonWritable: () => F,
  isPinnedVariable: () => Oe,
  isSameVerdict: () => sameDecision,
  isServerFileUnreadable: () => E,
  isSkillRow: () => isSkillToolOrigin,
  managedModsOnlyRefusal: () => managedModsOnlyMessage,
  managedToolsRestored: () => orderOrgToolsFirst,
  memberOf: () => B,
  nameOfId: () => q,
  namesOrgTool: () => getMcpPrefix,
  orgNames: () => Q,
  orgPluginNames: () => listOrgPluginsBeforeSecDefault,
  orgServerNames: () => orgMcpServerNames,
  ownOption: () => g,
  pastUsers: () => c,
  pinnedNames: () => protectedEnvKeys,
  pinnedVariableRefusal: () => v,
  pluginOf: () => l,
  register: () => secDefaultHooks,
  registerRefusalOf: () => te,
  rewrittenByUsers: () => pluginsThatChangedDecision,
  serverNameRefusal: () => orgToolNameClashMessage,
  spellingsOf: () => serverNameVariants,
  toolPrefixOf: () => _,
});
//@ chunk-ykab7xp3.js:6859-6898 placement
var b = () => resolveManagedPluginOrder().outermost.includes(Tte);
//@ chunk-ykab7xp3.js:6898-6918 placement
var SEC_DEFAULT = "sec-default";
//@ chunk-ykab7xp3.js:6918-7014 placement
var w = (e, t) => `plugin.register hook failed judging ${e} (${t.kind}): ` + (t.message ?? "no message");
//@ chunk-ykab7xp3.js:7014-7034 placement
var l = (e) => e.plugin;
/**
 * 描述 ask 决定来自哪里（某钩子、某设置、某插件、ask 上限或宿主）。
 */
//@ chunk-ykab7xp3.js:7034-7235 placement
function describeAskSource(e) {
  let t = l(e),
    s = e.hook !== void 0,
    i = e.setting !== void 0,
    n = t !== void 0,
    r = e.ceiling !== void 0;
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
/**
 * 两个决定对象（忽略 undefined 字段）是否相同。
 */
//@ chunk-ykab7xp3.js:7235-7392 placement
var sameDecision = (e, t) =>
  t !== void 0 &&
  [e, t]
    .map((s) =>
      JSON.stringify(
        Object.entries(s)
          .filter(([, i]) => i !== void 0)
          .toSorted(([i], [n]) => (i < n ? -1 : 1)),
      ),
    )
    .every((s, i, n) => s === n[0]);
//@ chunk-ykab7xp3.js:7392-7460 placement
var pe = (e, t) => e.slice(t + 1).find((s) => s.returned !== void 0)?.returned;
//@ chunk-ykab7xp3.js:7460-7504 placement
var freeze = Object.freeze({ deny: 0, ask: 1, allow: 2 });
//@ chunk-ykab7xp3.js:7504-7566 placement
var h = (e, t) => e !== void 0 && freeze[e.decision] > freeze[t?.decision ?? "deny"];
//@ chunk-ykab7xp3.js:7566-7607 placement
var freeze_2 = Object.freeze(["user", "prepend"]);
/**
 * 插件改动的决定是否覆盖了不允许覆盖的来源（deny、规则、钩子、设置、上限、宿主 ask）。
 */
//@ chunk-ykab7xp3.js:7607-7801 placement
function isOverriddenDecision(e, t, s) {
  let i = e.decision === "ask";
  return (
    !h(e, t) &&
    !sameDecision(e, t) &&
    (e.decision === "deny" ||
      e.rule !== void 0 ||
      e.hook !== void 0 ||
      e.setting !== void 0 ||
      l(e) !== void 0 ||
      e.ceiling !== void 0 ||
      (i && s === "host"))
  );
}
/**
 * 列出在受限层级中改变了决定的插件。
 */
//@ chunk-ykab7xp3.js:7801-7948 placement
var pluginsThatChangedDecision = (e) =>
  e
    .filter((t, s) => {
      let i = pe(e, s);
      return (
        freeze_2.includes(t.tier) &&
        t.returned !== void 0 &&
        !h(i, t.returned) &&
        !sameDecision(t.returned, i)
      );
    })
    .map((t) => t.plugin);
//@ chunk-ykab7xp3.js:7948-8087 placement
var freeze_3 = Object.freeze({
  decision: "deny",
  reason: "the rules and hooks in your settings could not be checked for this call, so it is refused",
});
//@ chunk-ykab7xp3.js:8087-8144 placement
function ce(e, t) {
  return e !== void 0 && pluginsThatChangedDecision(t).length === 0 ? e : freeze_3;
}
/**
 * 决定的名称（deny/ask rule、refusal 或 ask 来源）。
 */
//@ chunk-ykab7xp3.js:8144-8249 placement
function decisionNoun(e) {
  let t = e.rule !== void 0,
    s = e.decision === "deny";
  return t ? `${e.decision} rule` : s ? "refusal" : describeAskSource(e);
}
/**
 * 插件试图推翻设置中的规则时的说明文本（allowModsToOverrideDenyRules）。
 */
//@ chunk-ykab7xp3.js:8249-8523 placement
function formatOverrideRefusal(e, t, s, i) {
  let n = decisionNoun(s),
    r = n.startsWith("a") ? "an" : "a",
    o =
      s.rule === void 0
        ? `${r} ${n} from a ${t} call`
        : `${r} ${n} in your settings from a ${t} call (${s.rule})`;
  return `${e} tried to ${i} ${o}; the ${n} holds over the plugins you install (allowModsToOverrideDenyRules)`;
}
/**
 * allowManagedModsOnly 策略下插件未加载的说明。
 */
//@ chunk-ykab7xp3.js:8523-8630 placement
var managedModsOnlyMessage = (e) =>
  `mods are limited to your organization's by policy (allowManagedModsOnly); ${e} was not loaded`;
//@ chunk-ykab7xp3.js:8630-8677 placement
var freeze_4 = Object.freeze(["user", "builtin", "core"]);
//@ chunk-ykab7xp3.js:8677-8751 placement
function c(e, t) {
  return freeze_4.includes(e.provider?.tier) ? t(e) : t.to(e, "append");
}
//@ chunk-ykab7xp3.js:8751-8828 placement
var v = (e) => `env (managed): ${e} is not for plugins outside policy to change`;
/**
 * 可劫持进程的环境变量（LD_PRELOAD、DYLD_*、BASH_ENV、NODE_OPTIONS 等）。
 */
//@ chunk-ykab7xp3.js:8828-8986 placement
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
/**
 * 在 e 毫秒内复用上次计算结果的节流器。
 */
//@ chunk-ykab7xp3.js:8986-9107 placement
function throttleValue(e, t = Date.now) {
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
    i;
  return (n) => {
    if (i === void 0 || t() - NEGATIVE_INFINITY > e) ((NEGATIVE_INFINITY = t()), (i = n()));
    return i ?? n();
  };
}
//@ chunk-ykab7xp3.js:9107-9144 placement
var k = (e, t) => e.then(t).catch(() => !0);
//@ chunk-ykab7xp3.js:9144-9183 placement
var F = (e) => e.personWritablePolicy === !0;
//@ chunk-ykab7xp3.js:9183-9277 placement
function B(e, t) {
  return typeof e === "object" && e !== null ? new Map(Object.entries(e)).get(t) : void 0;
}
//@ chunk-ykab7xp3.js:9277-9343 placement
var j = ["pluginConfigs", "cc-plugin-sec-default@builtin", "options"];
//@ chunk-ykab7xp3.js:9343-9377 placement
var g = (e, t) => [...j, t].reduce(B, e);
//@ chunk-ykab7xp3.js:9377-9435 placement
var G = (e) => F(e) || g(e, "allowModsToOverrideDenyRules") !== !0;
//@ chunk-ykab7xp3.js:9435-9482 placement
var xe = (e) => Array.isArray(e.allowedMcpServers);
//@ chunk-ykab7xp3.js:9482-9557 placement
function Ee(e) {
  let t = g(e, "allowManagedModsOnly");
  return t !== void 0 && t !== !1;
}
/**
 * 托管设置与 OAuth 配置相关的保护环境变量。
 */
//@ chunk-ykab7xp3.js:9557-9831 placement
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
/**
 * 插件不得改写的环境变量键（设置 env 中的键、进程包装器、保护变量与危险变量）。
 */
//@ chunk-ykab7xp3.js:9867-9969 placement
function protectedEnvKeys(e) {
  let t = e.processWrapper !== void 0;
  return [
    ...Object.keys(e.env ?? {}),
    ...(t ? [CLAUDE_CODE_PROCESS_WRAPPER] : []),
    ...PROTECTED_CONFIG_ENV_VARS,
    ...DANGEROUS_ENV_VARS,
  ];
}
//@ chunk-ykab7xp3.js:9969-10033 placement
var Oe = (e, t) => protectedEnvKeys(e).some((s) => s.toUpperCase() === t.toUpperCase());
//@ chunk-ykab7xp3.js:10033-10079 placement
var E = (e) => e.managedMcpServersUnreadable === !0;
//@ chunk-ykab7xp3.js:10079-10123 placement = setCwdState (1)
var nfcLower = (cwd) => cwd.normalize("NFC").toLowerCase();
//@ chunk-ykab7xp3.js:10123-10205 placement
var K = (e) => {
  let normalized = e.normalize("NFC"),
    normalized_2 = e.normalize("NFD");
  return normalized === normalized_2 ? [normalized] : [normalized, normalized_2];
};
//@ chunk-ykab7xp3.js:10205-10241 placement
var Z = (e) => e === !0 || Array.isArray(e);
//@ chunk-ykab7xp3.js:10241-10306 placement
function q(e) {
  let index = e.lastIndexOf("@");
  return index > 0 ? e.slice(0, index) : e;
}
/**
 * 列出组织在 sec-default 之前启用的插件。
 */
//@ chunk-ykab7xp3.js:10306-10660 placement
function listOrgPluginsBeforeSecDefault(e, t) {
  let flattened = Object.entries(e.enabledPlugins ?? {}).flatMap(([r, o]) =>
      Z(o) && !r.endsWith("@builtin") ? [r] : [],
    ),
    i = (r) => typeof t === "string" && nfcLower(r) === nfcLower(t),
    any = flattened.some(i);
  return [e.prependPlugins, e.appendPlugins, flattened].flatMap((r) =>
    (Array.isArray(r) ? r : []).flatMap((o) => {
      let p = typeof o === "string" ? q(o) : "",
        a = typeof o === "string" && any && i(o);
      return p !== "" && !a ? K(p) : [];
    }),
  );
}
/**
 * 组织允许/托管的 MCP 服务器名列表。
 */
//@ chunk-ykab7xp3.js:10660-10956 placement
function orgMcpServerNames(e) {
  let { allowedMcpServers: allowedMcpServers, managedMcpServers: managedMcpServers } = e,
    i = typeof managedMcpServers === "object" && !Array.isArray(managedMcpServers);
  return [
    ...(Array.isArray(allowedMcpServers) ? allowedMcpServers : []).flatMap((n) => {
      let o = typeof n === "object" && n !== null && "serverName" in n ? n.serverName : void 0;
      return typeof o === "string" && o !== "" ? [o] : [];
    }),
    ...Object.keys(i ? (managedMcpServers ?? {}) : {}),
  ];
}
/**
 * 服务器名规范化后的变体（替换非法字符、合并下划线）。
 */
//@ chunk-ykab7xp3.js:10956-11099 placement
function serverNameVariants(e) {
  let replaced = e.replace(/[^a-zA-Z0-9_-]/g, "_"),
    replaced_2 = replaced.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return [...new Set([replaced, replaced_2])].filter((i) => i !== "");
}
/**
 * 名称规范化为小写下划线形式。
 */
//@ chunk-ykab7xp3.js:11099-11200 placement
var normalizeToolPrefix = (e) =>
  e
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase()
    .replace(/[-_]+/g, "_")
    .replace(/^_|_$/g, "");
//@ chunk-ykab7xp3.js:11200-11226 placement
var _ = (e) => `mcp_${normalizeToolPrefix(e)}_`;
/**
 * 工具名是否属于组织的 MCP 服务器或组织插件。
 */
//@ chunk-ykab7xp3.js:11226-11423 placement
var isOrgToolName = (e, t) =>
  (E(e) && t.startsWith("mcp__")) ||
  orgMcpServerNames(e)
    .flatMap(serverNameVariants)
    .some((s) => t.startsWith(`mcp__${s}__`)) ||
  listOrgPluginsBeforeSecDefault(e)
    .filter((s) => normalizeToolPrefix(s) !== "")
    .flatMap((s) => [s, `plugin_${s}`])
    .some((s) => `${normalizeToolPrefix(t)}_`.startsWith(_(s)));
//@ chunk-ykab7xp3.js:11423-11488 placement
var Q = (e, t) => [
  ...orgMcpServerNames(e),
  ...listOrgPluginsBeforeSecDefault(e, t).flatMap((s) => [s, `plugin_${s}`]),
];
/**
 * 组织工具排在前面，其他工具在后。
 */
//@ chunk-ykab7xp3.js:11488-11646 placement
function orderOrgToolsFirst(e, t, s) {
  return e === void 0 || t.value === void 0 || s.value === void 0
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
  return E(e) || Q(e, i).some((r) => normalizeToolPrefix(r) === "" || n.startsWith(_(r)));
}
//@ chunk-ykab7xp3.js:11761-11772 placement
var ye = 500;
//@ chunk-ykab7xp3.js:11772-11796 placement
var f = { source: "policy" };
/**
 * 判断消息 origin 是否为 Skill 工具产生。
 */
//@ chunk-ykab7xp3.js:11811-11866 affinity
var isSkillToolOrigin = (e) => e.origin.kind === "tool" && e.origin.tool === SKILL_TOOL_NAME;
/**
 * 插件工具名冒充组织服务器工具时的说明。
 */
//@ chunk-ykab7xp3.js:11866-11986 placement
var orgToolNameClashMessage = (e) =>
  `managedMcpServers (managed): a tool of ${e} would be named as a tool of one of the organization's servers`;
//@ chunk-ykab7xp3.js:11986-12064 placement
var y = "allowedMcpServers (managed): plugins outside policy may not add tools";
//@ chunk-ykab7xp3.js:12064-12115 placement
var te = (e, t, s, i) => (xe(e) ? y : getMcpPrefix(e, t, s, i) ? orgToolNameClashMessage(t) : void 0);
/**
 * sec-default 插件的 hooks：把各类提示词、上下文、技能、工具描述事件统一追加处理并做审核。
 */
//@ chunk-ykab7xp3.js:12115-14738 placement
function secDefaultHooks(e) {
  let t = throttleValue(ye),
    s = new Set(),
    i = new Map();
  (e("classic.*", (n, r, o) => o.to(r, "append")),
    e("prompt.section", (n, r, o) => o.to(r, "append")),
    e("prompt.context", (n, r, o) => o.to(r, "append")),
    e("prompt.attachment", (n, r, o) => o.to(r, "append")),
    e("prompt.compose", (n, r, o) => o.to(r, "append")),
    e("skill.prompt", (n, r, o) => o.to(r, "append")),
    e("attribution.text", (n, r, o) => o.to(r, "append")),
    e("session.append", { door: "attachment" }, (n, r, o) => o.to(r, "append")),
    e("session.append", { door: "hook-context" }, (n, r, o) => o.to(r, "append")),
    e("session.append", { door: "compaction" }, (n, r, o) => o.to(r, "append")),
    e("session.append", { door: "tool-message" }, (n, r, o) =>
      isSkillToolOrigin(r) ? o.to(r, "append") : o(r),
    ),
    e("session.append", { door: "note" }, (n, r, o) =>
      o.origin.tier === "prepend" || o.origin.tier === "append" ? o.to(r, "append") : o(r),
    ),
    e("session.compact", (n, r, o) => o.to(r, "append")),
    e("settings.read", (n, r, o) => o.to(r, "append")),
    e("tool.describe", (n, r, o) => c(r, o)),
    e("command.describe", (n, r, o) => c(r, o)),
    e("agent.offer", (n, r, o) => c(r, o)),
    e("agent.spawn", (n, r, o) => c(r, o)),
    e("tool.register", async (n, r, o) => {
      if (o.origin.tier === "prepend" || o.origin.tier === "append") return o.to(r, "append");
      let a =
        o.origin.tier === "user"
          ? await t(() => n.settings.read(f))
              .then((I) => te(I, o.origin.plugin, r.name, i.get(o.origin.plugin)))
              .catch(() => y)
          : void 0;
      return a === void 0 ? o(r) : { deny: a };
    }),
    e("tool.list", async (n, r, o) =>
      orderOrgToolsFirst(
        await t(() => n.settings.read(f)).catch(() => {
          return;
        }),
        await o.to(r, "append"),
        await o(r),
      ),
    ),
    e("tool.check", async (n, r, o) => {
      let p = await o(r),
        a = pluginsThatChangedDecision(o.trace);
      if (!(
        a.length > 0 &&
        (await k(
          t(() => n.settings.read(f)),
          G,
        ))
      ))
        return p;
      let to = await o.to(r, "append"),
        { approver: approver } = r;
      if (!isOverriddenDecision(to, p, approver)) return p;
      let se = decisionNoun(to);
      for (let ie of a.filter((Te) => !s.has(`${Te} ${se}`)))
        (s.add(`${ie} ${se}`), n.ui.log(formatOverrideRefusal(ie, r.tool, to, h(p, to) ? "lift" : "reword")));
      return to;
    }).catch(async (n, r, o) => {
      let p = await o(r).catch(() => {
        return;
      });
      return (await k(
        t(() => n.settings.read(f)),
        G,
      ))
        ? ce(p, o.trace)
        : p;
    }),
    e("ui.log", (n, r, o) =>
      o.origin.tier === "prepend" || o.origin.tier === "append" ? o.to(r, "append") : o(r),
    ),
    e("env.get", (n, r, o) =>
      o.origin.tier === "prepend" || o.origin.tier === "append" ? o.to(r, "append") : o(r),
    ),
    e("env.set", async (n, r, o) => {
      if (o.origin.tier === "prepend" || o.origin.tier === "append") return o.to(r, "append");
      if (
        !(await k(
          t(() => n.settings.read(f)),
          (m) => Oe(m, r.name),
        ))
      )
        return o(r);
      return o.origin.tier === "user" ? { deny: v(r.name) } : o.to(r, "append");
    }).catch((n, r, o) => {
      if (o.called) return o(r);
      return o.origin.tier === "user" ? { deny: v(r.name) } : o.to(r, "append");
    }),
    e(
      "plugin.register",
      { tier: "user" },
      async (n, r, o) => (
        i.set(r.name, r.provenance),
        Ee(await n.settings.read(f)) ? { refuse: managedModsOnlyMessage(r.name) } : o(r)
      ),
    ).catch(
      (n, r, o) => (
        n.ui.log(w(r.name, o.error), { to: "debug" }),
        o.called ? o(r) : { refuse: managedModsOnlyMessage(r.name) }
      ),
    ));
}
/**
 * 注册安全默认插件（有托管设置或 Team/Enterprise 时放在最外层）。
 */
//@ chunk-ykab7xp3.js:14738-15274 placement
var registerSecDefaultPlugin = () =>
  registerBuiltinPlugin({
    name: SEC_DEFAULT_PLUGIN_NAME,
    description:
      "Security default: seated outermost on a machine with managed settings and for Team and Enterprise organizations unless managed prependPlugins is set, in which case the organization lists cc-plugin-sec-default@builtin there or not; keeps the organization's classic hooks, prompt content, settings and tool policy out of reach of the plugins a person installs, and adds no policy of its own",
    enabledFromTrustedSettingsOnly: !0,
    enabledFromPolicyOnly: !0,
    isAvailable: b,
    hooksModule: builtinHooksModuleRef(getModsFolderPath(SEC_DEFAULT), R, () => SEC_DEFAULT_HOOKS_SCAN()),
  });

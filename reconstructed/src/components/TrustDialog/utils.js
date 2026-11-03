/**
 * components/TrustDialog/utils.ts
 *
 * 信任对话框的风险来源收集：各类 hooks、bash 权限、OTEL headers helper、apiKeyHelper、AWS/GCP 命令、危险环境变量的来源文件列表；本模块混入了大量同名副本（shared 指纹）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TrustDialog/utils.ts
 * pieces: chunk-11065byw.js (4), chunk-7mh76y4v.js (3), chunk-9awzs2m4.js (28), chunk-q4qb1h08.js (1), chunk-t659krks.js (8)
 * attribution: affinity 1, fingerprint 9, placement 14, layout 15, callgraph-fingerprint 2, sole-consumer 3
 */
import { isAbsolute, resolve, join } from "path";
import {
  isSettingSourceEnabled,
  REPO_DIR_SETTING_SOURCE_LIST,
  getEnabledSettingSources,
} from "../../utils/settings/constants.js";
import {
  getPermissionRulesForSource,
  settingsJsonToRules,
  getProjectGrantGates,
  isGatedGrantsBackstopExempt,
  workspaceHasGatedGrants,
} from "../../utils/permissions/permissionsLoader.js";
import {
  getSettingsForSourceTightenOnly,
  getSettingsForSource,
  projectSettingsAliasesUserSettings,
  parseSettingsFileUncached,
} from "../../utils/settings/settings.js";
import { isLocalSettingsGitTracked } from "../../utils/config.js";
import { getOriginalCwd, getStrictMcpConfig, isHomeDirectorySession } from "../../bootstrap/state.js";
import { idr } from "../../utils/hooks/hooksConfigSnapshot.js";
import { truncatePathForDisplay } from "../../utils/invisibleChars.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { Pje } from "../../utils/stripAnsi.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { isProtectedEnvVar } from "../../utils/managedEnvConstants.js";
import { sorted } from "../../utils/plugins/marketplaceAutoUpdate.js";
import { getGlobalClaudeFile } from "../../utils/env.js";
import {
  areCommandPluginSourcesDisabledByPolicy,
  isSourceAllowedByPolicy,
  isPluginBlockedByPolicy,
} from "../../utils/plugins/marketplacePolicy.js";
import { E9s } from "../../utils/plugins/marketplaceSources.js";
import { tryUnwrapTextPayload } from "../../utils/plugins/marketplaceManager.js";
import {
  doesEnterpriseMcpConfigExist,
  getMcpConfigsByScope,
  isMcpServerAllowedByPolicy,
} from "../../services/mcp/config.js";
import { getProjectMcpServerStatus } from "../../services/mcp/utils.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { Goe } from "../../utils/claudeInChrome/browserToolSchemas.js";
import { ise } from "../../utils/permissions/browserComputerUseTools.js";
import { CFC_TOOL_PREFIX } from "../../utils/claudeInChrome/common.js";
import { resolveLocalSettingsStoreRoot } from "../../utils/settings/settingsFileParsing.js";
import { eA } from "../../utils/settings/settingsStorage.js";
import { PROVIDER_CREDENTIAL_ENV_VARS } from "../../utils/managedEnvSafety.js";

//@ chunk-9awzs2m4.js:669-715 sole-consumer
function l(t) {
  return isSettingSourceEnabled(t)
    ? getPermissionRulesForSource(t)
    : settingsJsonToRules(getSettingsForSourceTightenOnly(t), t);
}
//@ chunk-9awzs2m4.js:715-764 sole-consumer
function d() {
  return { sources: getHooksSources_2(), read: getSettingsForSourceTightenOnly, rules: l };
}
//@ chunk-9awzs2m4.js:764-955 sole-consumer = getHooksSources (0.752)
var getHooksSources_2 = () => {
  let { gateProject: gateProject } = getProjectGrantGates(),
    e = isLocalSettingsGitTracked({ onIndeterminate: "tracked" });
  return [
    ...(gateProject ? [["projectSettings", ".claude/settings.json"]] : []),
    ...(e ? [["localSettings", ".claude/settings.local.json"]] : []),
  ];
};
//@ chunk-9awzs2m4.js:955-1168 fingerprint = hasHooks (0.725)
function hasHooks(settings) {
  if (settings === null) return !1;
  if (settings.statusLine) return !0;
  if (settings.fileSuggestion) return !0;
  if (settings.subagentStatusLine) return !0;
  if (!settings.hooks) return !1;
  for (let hookConfig of Object.values(settings.hooks)) if (hookConfig.length > 0) return !0;
  return !1;
}
//@ chunk-9awzs2m4.js:1168-1422 layout = getHooksSources (0.889)
function getHooksSources_3(
  t = {
    sources: [
      ["projectSettings", ".claude/settings.json"],
      ["localSettings", ".claude/settings.local.json"],
    ],
    read: getSettingsForSourceTightenOnly,
    rules: l,
  },
  e = getOriginalCwd(),
) {
  let sources = [];
  for (let [o, c] of t.sources) if (hasHooks(t.read(o))) sources.push(c);
  let r = idr(e);
  if (r !== null) sources.push(truncatePathForDisplay(r));
  return sources;
}
//@ chunk-9awzs2m4.js:1422-1551 fingerprint = hasBashPermission (1)
function hasBashPermission(rules) {
  return rules.some(
    (rule) =>
      rule.ruleBehavior === "allow" &&
      (rule.ruleValue.toolName === BASH_TOOL_NAME ||
        rule.ruleValue.toolName.startsWith(BASH_TOOL_NAME + "(")),
  );
}
//@ chunk-9awzs2m4.js:1551-1606 layout
var R = /[\x00-\x1f\x7f-\x9f\u2028\u2029]|\p{Cf}/gu,
  g = 60;
//@ chunk-9awzs2m4.js:1606-1695 layout
function Yxr(t) {
  let trimmed = Pje(t).replace(R, "").trim();
  return trimmed.length > g ? `${truncateToLength(trimmed, g)}\u2026` : trimmed;
}
//@ chunk-9awzs2m4.js:1695-1793 layout
var x = new Set([
  BASH_TOOL_NAME,
  "PowerShell",
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "WebFetch",
  "WebSearch",
]);
//@ chunk-9awzs2m4.js:1793-1927 layout
function allowRulePriority(t) {
  let { toolName: toolName, ruleContent: ruleContent } = t.ruleValue,
    r = x.has(toolName) || toolName.startsWith("mcp__"),
    o = ruleContent === void 0;
  if (r) return o ? 0 : 1;
  return o ? 2 : 3;
}
/**
 * 汇总各设置来源中的 allow 权限规则：记录有规则的来源文件，规则按优先级排序、清理控制字符后去重，返回 {rules, sources, rawCount}，供信任对话框展示。
 */
//@ chunk-9awzs2m4.js:1927-2262 layout
function collectAllowRuleSources(t = d()) {
  let e = [],
    s = [];
  for (let [i, n] of t.sources) {
    let filtered = t.rules(i).filter((h) => h.ruleBehavior === "allow");
    if (filtered.length > 0) (e.push(n), s.push(...filtered));
  }
  let r = s.length;
  s.sort((i, n) => allowRulePriority(i) - allowRulePriority(n));
  let o = new Set(),
    c = [];
  for (let i of s) {
    let n = Yxr(formatPermissionRule(i.ruleValue));
    if (n.length > 0 && !o.has(n)) (o.add(n), c.push(n));
  }
  return { rules: c, sources: e, rawCount: r };
}
//@ chunk-9awzs2m4.js:2262-2350 layout
function f(t) {
  if (isAbsolute(t) || t.startsWith("~")) return 0;
  if (t.includes("..")) return 1;
  return 2;
}
/**
 * 汇总各设置来源中的 permissions.additionalDirectories：记录来源、清理去重并排序，返回 {dirs, sources, rawCount}。
 */
//@ chunk-9awzs2m4.js:2350-2668 layout
function collectAdditionalDirectorySources(t = d()) {
  let e = [],
    s = [];
  for (let [i, n] of t.sources) {
    let u = t.read(i)?.permissions?.additionalDirectories ?? [];
    if (u.length > 0) (e.push(n), s.push(...u));
  }
  let r = s.length,
    o = new Set(),
    c = [];
  for (let i of s) {
    let n = Yxr(i);
    if (n.length > 0 && !o.has(n)) (o.add(n), c.push(n));
  }
  return (c.sort((i, n) => f(i) - f(n)), { dirs: c, sources: e, rawCount: r });
}
//@ chunk-9awzs2m4.js:2668-2835 fingerprint = getHooksSources (1)
function getHooksSources() {
  let sources = [],
    projectSettings = l("projectSettings");
  if (hasBashPermission(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = l("localSettings");
  if (hasBashPermission(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:2835-3168 layout = formatListWithAnd (1)
function formatListWithAnd_2(items, limit) {
  if (items.length === 0) return "";
  let effectiveLimit = limit === 0 ? void 0 : limit;
  if (!effectiveLimit || items.length <= effectiveLimit) {
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    let at = items.at(-1);
    return `${items.slice(0, -1).join(", ")}, and ${at}`;
  }
  let allButLast = items.slice(0, effectiveLimit),
    remaining = items.length - effectiveLimit;
  if (allButLast.length === 1) return `${allButLast[0]} and ${remaining} more`;
  return `${allButLast.join(", ")}, and ${remaining} more`;
}
//@ chunk-9awzs2m4.js:3168-3213 fingerprint = hasOtelHeadersHelper (1)
function hasOtelHeadersHelper(settings) {
  return !!settings?.otelHeadersHelper;
}
//@ chunk-9awzs2m4.js:3213-3386 layout = getHooksSources (1)
function getHooksSources_4() {
  let sources = [],
    projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasOtelHeadersHelper(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasOtelHeadersHelper(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:3386-3597 layout = getHooksSources (0.911)
function getHooksSources_5() {
  let sources = [];
  if (getSettingsForSourceTightenOnly("projectSettings")?.autoMemoryDirectory !== void 0)
    sources.push(".claude/settings.json");
  if (getSettingsForSourceTightenOnly("localSettings")?.autoMemoryDirectory !== void 0)
    sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:3597-3637 fingerprint = hasApiKeyHelper (1)
function hasApiKeyHelper(settings) {
  return !!settings?.apiKeyHelper;
}
//@ chunk-9awzs2m4.js:3637-3810 layout = getHooksSources (1)
function getHooksSources_6() {
  let sources = [],
    projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasApiKeyHelper(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasApiKeyHelper(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:3810-3878 fingerprint = hasAwsCommands (1)
function hasAwsCommands(settings) {
  return !!(settings?.awsAuthRefresh || settings?.awsCredentialExport);
}
//@ chunk-9awzs2m4.js:3878-4051 layout = getHooksSources (1)
function getHooksSources_7() {
  let sources = [],
    projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasAwsCommands(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasAwsCommands(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:4051-4093 fingerprint = hasGcpCommands (1)
function hasGcpCommands(settings) {
  return !!settings?.gcpAuthRefresh;
}
//@ chunk-9awzs2m4.js:4093-4266 layout = getHooksSources (1)
function getHooksSources_8() {
  let sources = [],
    projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasGcpCommands(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasGcpCommands(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:4266-4309 placement
function ePr(t) {
  return !!t?.proxyAuthHelper;
}
//@ chunk-9awzs2m4.js:4309-4482 placement = getHooksSources (1)
function getHooksSources_9() {
  let sources = [],
    projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (ePr(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (ePr(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:4482-4570 placement
function S(t) {
  if (!t?.env) return !1;
  return Object.entries(t.env).some(([e, s]) => !isProtectedEnvVar(e, s));
}
//@ chunk-9awzs2m4.js:4570-4739 placement = getHooksSources (1)
function getHooksSources_10() {
  let sources = [],
    projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (S(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (S(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-t659krks.js:490-620 placement
var filtered = sorted.filter((e) => e !== "userSettings"),
  i = { projectSettings: ".claude/settings.json", localSettings: ".claude/settings.local.json" };
/**
 * 判断信任对话框是否需要因"未门控的授权来源"而出现：豁免时 false，工作区有门控授权时 true，否则看来源列表里是否有未被禁用设置源覆盖的条目。
 */
//@ chunk-t659krks.js:620-759 placement
function hasUngatedTrustSources(e) {
  if (isGatedGrantsBackstopExempt()) return !1;
  if (workspaceHasGatedGrants()) return !0;
  let mapped = REPO_DIR_SETTING_SOURCE_LIST.filter((r) => !isSettingSourceEnabled(r)).map((r) => i[r]);
  return (e ?? getBashAndMcpPermissionSources()).some((r) => !mapped.includes(r));
}
//@ chunk-t659krks.js:759-914 placement
function getBashAndMcpPermissionSources(e = getBashPermissionSources()) {
  let t = [...e];
  if (l_t659("project")) t.push(".mcp.json");
  if (l_t659("local")) t.push(`${getGlobalClaudeFile()} (local-scope MCP servers for this project)`);
  return t;
}
//@ chunk-t659krks.js:914-1365 placement
function c(e, t) {
  if (areCommandPluginSourcesDisabledByPolicy()) return !1;
  let r = t?.extraKnownMarketplaces ?? {};
  return Object.entries(e?.extraKnownMarketplaces ?? {}).some(([s, a]) => {
    if (Object.hasOwn(r, s)) return !1;
    let source = a.source;
    if (source.source === "url")
      return (
        !!source.headersHelper &&
        /^https:\/\//i.test(source.url) &&
        isSourceAllowedByPolicy(source) &&
        !u(s, source.url)
      );
    if (source.source === "settings")
      return (
        isSourceAllowedByPolicy(source) &&
        !f_t659(s) &&
        source.plugins.some(
          (plugin) =>
            !!plugin.headersHelper &&
            typeof plugin.source === "object" &&
            plugin.source.source === "archive" &&
            !isPluginBlockedByPolicy(`${plugin.name}@${s}`),
        )
      );
    return !1;
  });
}
//@ chunk-t659krks.js:1365-1527 placement
function u(e, t) {
  let r = getEnabledSettingSources();
  if (
    filtered.some(
      (s) => r.includes(s) && Object.hasOwn(getSettingsForSource(s)?.extraKnownMarketplaces ?? {}, e),
    )
  )
    return !0;
  return E9s({ source: "url", url: t }, e) !== void 0;
}
//@ chunk-t659krks.js:1527-1570 placement
function f_t659(e) {
  return Object.hasOwn(tryUnwrapTextPayload(), e);
}
//@ chunk-t659krks.js:1570-1773 placement
function l_t659(e) {
  if (getStrictMcpConfig() || doesEnterpriseMcpConfigExist()) return !1;
  let { servers: servers } = getMcpConfigsByScope(e, { expandVars: !1 });
  return Object.entries(servers).some(
    ([r, s]) =>
      "headersHelper" in s &&
      !!s.headersHelper &&
      !(e === "project" && getProjectMcpServerStatus(r) === "rejected") &&
      isMcpServerAllowedByPolicy(r, s),
  );
}
//@ chunk-t659krks.js:1773-1954 callgraph-fingerprint = getBashPermissionSources (0.479)
function getBashPermissionSources() {
  if (isHomeDirectorySession()) return [];
  let sources = [];
  if (
    !projectSettingsAliasesUserSettings() &&
    c(getSettingsForSourceTightenOnly("projectSettings"), getSettingsForSource("localSettings"))
  )
    sources.push(i.projectSettings);
  if (c(getSettingsForSourceTightenOnly("localSettings"))) sources.push(i.localSettings);
  return sources;
}
/**
 * 浏览器工具动作到人类可读描述的映射，用于信任对话框列出权限。
 */
//@ chunk-11065byw.js:336-1318 affinity
var BROWSER_TOOL_ACTION_DESCRIPTIONS = {
    navigate: "navigate",
    read_page: "read the page",
    get_page_text: "extract page text",
    find: "find an element",
    form_input: "fill in a form field",
    javascript_tool: "run JavaScript",
    read_console_messages: "read console messages",
    read_network_requests: "read network requests",
    upload_image: "upload an image",
    file_upload: "upload a file",
    select_browser: "select a browser",
    gif_creator: "record a GIF of the page",
    shortcuts_execute: "run a saved browser shortcut",
    tabs_create_mcp: "open a new browser tab",
  },
  COMPUTER_ACTION_DESCRIPTIONS = {
    screenshot: "take a screenshot",
    left_click: "click",
    right_click: "right-click",
    middle_click: "middle-click",
    double_click: "double-click",
    triple_click: "triple-click",
    type: "type text",
    key: "press keys",
    hold_key: "hold a key",
    scroll: "scroll",
    scroll_to: "scroll to an element",
    left_click_drag: "drag",
    zoom: "zoom in",
    hover: "hover",
    mouse_move: "move the mouse",
    left_mouse_down: "press the mouse button",
    left_mouse_up: "release the mouse button",
    cursor_position: "read the cursor position",
    wait: "wait",
  },
  MAX_LISTED_BROWSER_ACTIONS = 4;
//@ chunk-11065byw.js:1318-1527 fingerprint = formatListWithAnd (1)
function formatListWithAnd(o) {
  let allButLast = o.slice(0, MAX_LISTED_BROWSER_ACTIONS),
    remaining = o.length - allButLast.length;
  if (remaining > 0) allButLast.push(`${remaining} more`);
  if (allButLast.length === 1) return allButLast[0] ?? "";
  if (allButLast.length === 2) return `${allButLast[0]} and ${allButLast[1]}`;
  return `${allButLast.slice(0, -1).join(", ")}, and ${allButLast.at(-1)}`;
}
//@ chunk-11065byw.js:1527-1824 placement
function describeBrowserBatchActions(o) {
  if (!Array.isArray(o.actions)) return [];
  let e = new Set(),
    r = [];
  for (let action of o.actions) {
    if (!isPlainObject(action) || typeof action.name !== "string") continue;
    let n = isPlainObject(action.input) ? action.input : {};
    if (action.name === "browser_batch" || (Goe.has(action.name) && ise(action.name, n))) continue;
    let s = describeBrowserToolAction(action.name, n);
    if (!e.has(s)) (e.add(s), r.push(s));
  }
  return r;
}
/**
 * 把 Claude in Chrome（CFC）工具调用转成一句英文描述（如 "click"、"read your browser tabs"），computer 按 action 查表，browser_batch 合并各子动作，未知时为 "use the browser"。
 */
//@ chunk-11065byw.js:1824-2227 placement
function describeBrowserToolAction(o, e) {
  let r = o.startsWith(CFC_TOOL_PREFIX) ? o.slice(CFC_TOOL_PREFIX.length) : o;
  if (r === "computer") {
    let t = typeof e.action === "string" ? e.action : void 0;
    if (t && COMPUTER_ACTION_DESCRIPTIONS[t]) return COMPUTER_ACTION_DESCRIPTIONS[t];
    return "use the browser";
  }
  if (r === "browser_batch") {
    let t = describeBrowserBatchActions(e);
    return t.length > 0 ? formatListWithAnd(t) : "use the browser";
  }
  if (r === "tabs_context_mcp")
    return e.createIfEmpty ? "create a browser window and read your tabs" : "read your browser tabs";
  return BROWSER_TOOL_ACTION_DESCRIPTIONS[r] ?? "use the browser";
}
//@ chunk-7mh76y4v.js:482-659 placement
function hasTrustRiskSources(o, { backstop: t = !1 } = {}) {
  return (
    o.allowRules.sources.length > 0 ||
    o.additionalDirectories.sources.length > 0 ||
    (!t && (o.hookSources.length > 0 || o.commandHelperSources.length > 0))
  );
}
//@ chunk-7mh76y4v.js:659-766 layout
function collectPermissionTrustSources() {
  return {
    allowRules: collectAllowRuleSources(),
    additionalDirectories: collectAdditionalDirectorySources(),
    hookSources: [],
    commandHelperSources: [],
  };
}
//@ chunk-7mh76y4v.js:766-1724 callgraph-fingerprint = getOtelHeadersHelperSources (0.467)
function getOtelHeadersHelperSources(o) {
  let t = resolve(o),
    m = resolveLocalSettingsStoreRoot(t, eA),
    settings = parseSettingsFileUncached(join(t, ".claude", "settings.json")).settings,
    c = join(m, ".claude", "settings.local.json"),
    a = join(t, ".claude", "settings.local.json"),
    filtered = [
      parseSettingsFileUncached(c).settings,
      ...(a === c ? [] : [parseSettingsFileUncached(a).settings]),
    ].filter((e) => e !== null),
    S =
      filtered.length === 0
        ? null
        : {
            permissions: {
              additionalDirectories: filtered.flatMap((e) => e.permissions?.additionalDirectories ?? []),
            },
          },
    u = { projectSettings: settings, localSettings: S },
    p = {
      sources: [
        ["projectSettings", ".claude/settings.json"],
        ["localSettings", ".claude/settings.local.json"],
      ],
      read: (e) => u[e] ?? null,
      rules: (e) =>
        e === "localSettings"
          ? filtered.flatMap((h) => settingsJsonToRules(h, e))
          : settingsJsonToRules(u[e] ?? null, e),
    },
    d = (e) =>
      hasApiKeyHelper(e) || hasAwsCommands(e) || hasGcpCommands(e) || hasOtelHeadersHelper(e) || ePr(e),
    l = [],
    n = [];
  if (hasHooks(settings)) l.push(".claude/settings.json");
  if (filtered.some(hasHooks)) l.push(".claude/settings.local.json");
  let g = idr(t);
  if (g !== null) l.push(truncatePathForDisplay(g));
  if (d(settings)) n.push(".claude/settings.json");
  if (filtered.some(d)) n.push(".claude/settings.local.json");
  return {
    allowRules: collectAllowRuleSources(p),
    additionalDirectories: collectAdditionalDirectorySources(p),
    hookSources: l,
    commandHelperSources: n,
  };
}
//@ chunk-q4qb1h08.js:11179-11334 fingerprint = hasDangerousEnvVars (0.589)
function hasDangerousEnvVars(settings) {
  if (!settings || !process.env.ANTHROPIC_UNIX_SOCKET) return settings || {};
  let n = {};
  for (let [r, E] of Object.entries(settings))
    if (!PROVIDER_CREDENTIAL_ENV_VARS.has(r.toUpperCase())) n[r] = E;
  return n;
}

export {
  hasUngatedTrustSources,
  describeBrowserToolAction,
  getHooksSources_3,
  getHooksSources,
  collectAllowRuleSources,
  collectAdditionalDirectorySources,
  getHooksSources_6,
  getHooksSources_7,
  getHooksSources_8,
  getHooksSources_4,
  getHooksSources_9,
  getBashPermissionSources,
  getBashAndMcpPermissionSources,
  getHooksSources_10,
  getHooksSources_5,
  formatListWithAnd_2,
  collectPermissionTrustSources,
  hasTrustRiskSources,
  getOtelHeadersHelperSources,
  Yxr,
  hasDangerousEnvVars,
};

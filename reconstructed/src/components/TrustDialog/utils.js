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
import { noPolicyStatusLine } from "../../utils/hooks/hooksConfigSnapshot.js";
import { truncatePathForDisplay_2 } from "../../utils/invisibleChars.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { sanitizeAnsiText } from "../../utils/stripAnsi.js";
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
import { repoAuthoredMarketplaceHeaders } from "../../utils/plugins/marketplaceSources.js";
import { tryUnwrapTextPayload } from "../../utils/plugins/marketplaceManager.js";
import {
  doesEnterpriseMcpConfigExist,
  getMcpConfigsByScope,
  isMcpServerAllowedByPolicy,
} from "../../services/mcp/config.js";
import { getProjectMcpServerStatus } from "../../services/mcp/utils.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { CHROME_INPUT_APPROVED_TOOL_NAMES } from "../../utils/claudeInChrome/browserToolSchemas.js";
import { isBrowserHousekeepingCall } from "../../utils/permissions/browserComputerUseTools.js";
import { CFC_TOOL_PREFIX } from "../../utils/claudeInChrome/common.js";
import { resolveLocalSettingsStoreRoot } from "../../utils/settings/settingsFileParsing.js";
import { uncachedStorageRootFor } from "../../utils/settings/settingsStorage.js";
import { PROVIDER_CREDENTIAL_ENV_VARS } from "../../utils/managedEnvSafety.js";

//@ chunk-9awzs2m4.js:669-715 sole-consumer
function describeRuleChanges(t) {
  return isSettingSourceEnabled(t)
    ? getPermissionRulesForSource(t)
    : settingsJsonToRules(getSettingsForSourceTightenOnly(t), t);
}
//@ chunk-9awzs2m4.js:715-764 sole-consumer
function trustHelpers() {
  return {
    sources: getHooksSources_2(),
    read: getSettingsForSourceTightenOnly,
    rules: describeRuleChanges,
  };
}
//@ chunk-9awzs2m4.js:764-955 sole-consumer = getHooksSources (0.752)
var getHooksSources_2 = () => {
  let { gateProject } = getProjectGrantGates();
  let e = isLocalSettingsGitTracked({
    onIndeterminate: "tracked",
  });
  return [
    ...(gateProject ? [["projectSettings", ".claude/settings.json"]] : []),
    ...(e ? [["localSettings", ".claude/settings.local.json"]] : []),
  ];
};
//@ chunk-9awzs2m4.js:955-1168 fingerprint = hasHooks (0.725)
function hasHooks(settings) {
  if (settings === null) return false;
  if (settings.statusLine) return true;
  if (settings.fileSuggestion) return true;
  if (settings.subagentStatusLine) return true;
  if (!settings.hooks) return false;
  for (let hookConfig of Object.values(settings.hooks)) if (hookConfig.length > 0) return true;
  return false;
}
//@ chunk-9awzs2m4.js:1168-1422 layout = getHooksSources (0.889)
function getHooksSources_3(
  t = {
    sources: [
      ["projectSettings", ".claude/settings.json"],
      ["localSettings", ".claude/settings.local.json"],
    ],
    read: getSettingsForSourceTightenOnly,
    rules: describeRuleChanges,
  },
  e = getOriginalCwd(),
) {
  let sources = [];
  for (let [o, c] of t.sources) if (hasHooks(t.read(o))) sources.push(c);
  let r = noPolicyStatusLine(e);
  if (r !== null) sources.push(truncatePathForDisplay_2(r));
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
var CONTROL_OR_FORMAT_RE = /[\x00-\x1f\x7f-\x9f\u2028\u2029]|\p{Cf}/gu;
var MAX_TRUST_LINE = 60;
//@ chunk-9awzs2m4.js:1606-1695 layout
/**
 * 函数 truncateTrustLine（去控制字符并截断）；位于「信任对话框的风险来源收集：各类 hooks、bash 权限、OTEL headers helper、apiKeyHelper、AWS/GCP 命令、危险环境变量的来源文件列表；本模块混入了大量同名副本（shared 指纹）」模块。
 */
function truncateTrustLine(t) {
  let trimmed = sanitizeAnsiText(t).replace(CONTROL_OR_FORMAT_RE, "").trim();
  return trimmed.length > MAX_TRUST_LINE ? `${truncateToLength(trimmed, MAX_TRUST_LINE)}\u2026` : trimmed;
}
//@ chunk-9awzs2m4.js:1695-1793 layout
var RULE_TOOL_NAMES = new Set([
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
  let { toolName, ruleContent } = t.ruleValue;
  let r = RULE_TOOL_NAMES.has(toolName) || toolName.startsWith("mcp__");
  let o = ruleContent === undefined;
  if (r) return o ? 0 : 1;
  return o ? 2 : 3;
}
//@ chunk-9awzs2m4.js:1927-2262 layout
/**
 * 汇总各设置来源中的 allow 权限规则：记录有规则的来源文件，规则按优先级排序、清理控制字符后去重，返回 {rules, sources, rawCount}，供信任对话框展示。
 */
function collectAllowRuleSources(t = trustHelpers()) {
  let e = [];
  let s = [];
  for (let [i, n] of t.sources) {
    let filtered = t.rules(i).filter((h) => h.ruleBehavior === "allow");
    if (filtered.length > 0) {
      e.push(n);
      s.push(...filtered);
    }
  }
  let rawCount = s.length;
  s.sort((i, n) => allowRulePriority(i) - allowRulePriority(n));
  let o = new Set();
  let c = [];
  for (let i of s) {
    let n = truncateTrustLine(formatPermissionRule(i.ruleValue));
    if (n.length > 0 && !o.has(n)) {
      o.add(n);
      c.push(n);
    }
  }
  return {
    rules: c,
    sources: e,
    rawCount,
  };
}
//@ chunk-9awzs2m4.js:2262-2350 layout
function pathRiskRank(t) {
  if (isAbsolute(t) || t.startsWith("~")) return 0;
  if (t.includes("..")) return 1;
  return 2;
}
//@ chunk-9awzs2m4.js:2350-2668 layout
/**
 * 汇总各设置来源中的 permissions.additionalDirectories：记录来源、清理去重并排序，返回 {dirs, sources, rawCount}。
 */
function collectAdditionalDirectorySources(t = trustHelpers()) {
  let e = [];
  let s = [];
  for (let [i, n] of t.sources) {
    let additionalDirectories = t.read(i)?.permissions?.additionalDirectories ?? [];
    if (additionalDirectories.length > 0) {
      e.push(n);
      s.push(...additionalDirectories);
    }
  }
  let rawCount = s.length;
  let o = new Set();
  let c = [];
  for (let i of s) {
    let n = truncateTrustLine(i);
    if (n.length > 0 && !o.has(n)) {
      o.add(n);
      c.push(n);
    }
  }
  c.sort((i, n) => pathRiskRank(i) - pathRiskRank(n));
  return {
    dirs: c,
    sources: e,
    rawCount,
  };
}
//@ chunk-9awzs2m4.js:2668-2835 fingerprint = getHooksSources (1)
function getHooksSources() {
  let sources = [];
  let projectSettings = describeRuleChanges("projectSettings");
  if (hasBashPermission(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = describeRuleChanges("localSettings");
  if (hasBashPermission(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:2835-3168 layout = formatListWithAnd (1)
function formatListWithAnd_2(items, limit) {
  if (items.length === 0) return "";
  let effectiveLimit = limit === 0 ? undefined : limit;
  if (!effectiveLimit || items.length <= effectiveLimit) {
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    let lastItem = items.at(-1);
    return `${items.slice(0, -1).join(", ")}, and ${lastItem}`;
  }
  let shown = items.slice(0, effectiveLimit);
  let remaining = items.length - effectiveLimit;
  if (shown.length === 1) return `${shown[0]} and ${remaining} more`;
  return `${shown.join(", ")}, and ${remaining} more`;
}
//@ chunk-9awzs2m4.js:3168-3213 fingerprint = hasOtelHeadersHelper (1)
function hasOtelHeadersHelper(settings) {
  return !!settings?.otelHeadersHelper;
}
//@ chunk-9awzs2m4.js:3213-3386 layout = getHooksSources (1)
function getHooksSources_4() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasOtelHeadersHelper(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasOtelHeadersHelper(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:3386-3597 layout = getHooksSources (0.911)
function getHooksSources_5() {
  let sources = [];
  if (getSettingsForSourceTightenOnly("projectSettings")?.autoMemoryDirectory !== undefined)
    sources.push(".claude/settings.json");
  if (getSettingsForSourceTightenOnly("localSettings")?.autoMemoryDirectory !== undefined)
    sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:3597-3637 fingerprint = hasApiKeyHelper (1)
function hasApiKeyHelper(settings) {
  return !!settings?.apiKeyHelper;
}
//@ chunk-9awzs2m4.js:3637-3810 layout = getHooksSources (1)
function getHooksSources_6() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
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
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
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
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasGcpCommands(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasGcpCommands(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:4266-4309 placement
/**
 * 函数 hasProxyAuthHelper（有 proxyAuthHelper）；位于「信任对话框的风险来源收集：各类 hooks、bash 权限、OTEL headers helper、apiKeyHelper、AWS/GCP 命令、危险环境变量的来源文件列表；本模块混入了大量同名副本（shared 指纹）」模块。
 */
function hasProxyAuthHelper(t) {
  return !!t?.proxyAuthHelper;
}
//@ chunk-9awzs2m4.js:4309-4482 placement = getHooksSources (1)
function getHooksSources_9() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasProxyAuthHelper(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasProxyAuthHelper(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-9awzs2m4.js:4482-4570 placement
function hasUnsafeEnv(settings) {
  if (!settings?.env) return false;
  return Object.entries(settings.env).some(([key, value]) => !isProtectedEnvVar(key, value));
}
//@ chunk-9awzs2m4.js:4570-4739 placement = getHooksSources (1)
function getHooksSources_10() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasUnsafeEnv(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasUnsafeEnv(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-t659krks.js:490-620 placement
var filtered = sorted.filter((e) => e !== "userSettings");
var SETTINGS_FILE_PATHS = {
  projectSettings: ".claude/settings.json",
  localSettings: ".claude/settings.local.json",
};
//@ chunk-t659krks.js:620-759 placement
/**
 * 判断信任对话框是否需要因"未门控的授权来源"而出现：豁免时 false，工作区有门控授权时 true，否则看来源列表里是否有未被禁用设置源覆盖的条目。
 */
function hasUngatedTrustSources(bashAndMcpPermissionSources) {
  if (isGatedGrantsBackstopExempt()) return false;
  if (workspaceHasGatedGrants()) return true;
  let mapped = REPO_DIR_SETTING_SOURCE_LIST.filter((r) => !isSettingSourceEnabled(r)).map(
    (r) => SETTINGS_FILE_PATHS[r],
  );
  return (bashAndMcpPermissionSources ?? getBashAndMcpPermissionSources()).some((r) => !mapped.includes(r));
}
//@ chunk-t659krks.js:759-914 placement
function getBashAndMcpPermissionSources(bashPermissionSources = getBashPermissionSources()) {
  let t = [...bashPermissionSources];
  if (hasHeadersHelper("project")) t.push(".mcp.json");
  if (hasHeadersHelper("local"))
    t.push(`${getGlobalClaudeFile()} (local-scope MCP servers for this project)`);
  return t;
}
//@ chunk-t659krks.js:914-1365 placement
function isNewMarketplace(settingsForSourceTightenOnly, settingsForSource) {
  if (areCommandPluginSourcesDisabledByPolicy()) return false;
  let extraKnownMarketplaces = settingsForSource?.extraKnownMarketplaces ?? {};
  return Object.entries(settingsForSourceTightenOnly?.extraKnownMarketplaces ?? {}).some(([key, value]) => {
    if (Object.hasOwn(extraKnownMarketplaces, key)) return false;
    let source = value.source;
    if (source.source === "url")
      return (
        !!source.headersHelper &&
        /^https:\/\//i.test(source.url) &&
        isSourceAllowedByPolicy(source) &&
        !isKnownUrlMarketplace(key, source.url)
      );
    if (source.source === "settings")
      return (
        isSourceAllowedByPolicy(source) &&
        !isKnownMarketplace(key) &&
        source.plugins.some(
          (plugin) =>
            !!plugin.headersHelper &&
            typeof plugin.source === "object" &&
            plugin.source.source === "archive" &&
            !isPluginBlockedByPolicy(`${plugin.name}@${key}`),
        )
      );
    return false;
  });
}
//@ chunk-t659krks.js:1365-1527 placement
function isKnownUrlMarketplace(e, url) {
  let enabledSettingSources = getEnabledSettingSources();
  if (
    filtered.some(
      (s) =>
        enabledSettingSources.includes(s) &&
        Object.hasOwn(getSettingsForSource(s)?.extraKnownMarketplaces ?? {}, e),
    )
  )
    return true;
  return (
    repoAuthoredMarketplaceHeaders(
      {
        source: "url",
        url,
      },
      e,
    ) !== undefined
  );
}
//@ chunk-t659krks.js:1527-1570 placement
function isKnownMarketplace(e) {
  return Object.hasOwn(tryUnwrapTextPayload(), e);
}
//@ chunk-t659krks.js:1570-1773 placement
function hasHeadersHelper(e) {
  if (getStrictMcpConfig() || doesEnterpriseMcpConfigExist()) return false;
  let { servers } = getMcpConfigsByScope(e, {
    expandVars: false,
  });
  return Object.entries(servers).some(
    ([key, value]) =>
      "headersHelper" in value &&
      !!value.headersHelper &&
      !(e === "project" && getProjectMcpServerStatus(key) === "rejected") &&
      isMcpServerAllowedByPolicy(key, value),
  );
}
//@ chunk-t659krks.js:1773-1954 callgraph-fingerprint = getBashPermissionSources (0.479)
function getBashPermissionSources() {
  if (isHomeDirectorySession()) return [];
  let sources = [];
  if (
    !projectSettingsAliasesUserSettings() &&
    isNewMarketplace(
      getSettingsForSourceTightenOnly("projectSettings"),
      getSettingsForSource("localSettings"),
    )
  )
    sources.push(SETTINGS_FILE_PATHS.projectSettings);
  if (isNewMarketplace(getSettingsForSourceTightenOnly("localSettings")))
    sources.push(SETTINGS_FILE_PATHS.localSettings);
  return sources;
}
//@ chunk-11065byw.js:336-1318 affinity
/**
 * 浏览器工具动作到人类可读描述的映射，用于信任对话框列出权限。
 */
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
};
var COMPUTER_ACTION_DESCRIPTIONS = {
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
};
var MAX_LISTED_BROWSER_ACTIONS = 4;
//@ chunk-11065byw.js:1318-1527 fingerprint = formatListWithAnd (1)
function formatListWithAnd(o) {
  let allButLast = o.slice(0, MAX_LISTED_BROWSER_ACTIONS);
  let remaining = o.length - allButLast.length;
  if (remaining > 0) allButLast.push(`${remaining} more`);
  if (allButLast.length === 1) return allButLast[0] ?? "";
  if (allButLast.length === 2) return `${allButLast[0]} and ${allButLast[1]}`;
  return `${allButLast.slice(0, -1).join(", ")}, and ${allButLast.at(-1)}`;
}
//@ chunk-11065byw.js:1527-1824 placement
function describeBrowserBatchActions(o) {
  if (!Array.isArray(o.actions)) return [];
  let e = new Set();
  let r = [];
  for (let action of o.actions) {
    if (!isPlainObject(action) || typeof action.name !== "string") continue;
    let input = isPlainObject(action.input) ? action.input : {};
    if (
      action.name === "browser_batch" ||
      (CHROME_INPUT_APPROVED_TOOL_NAMES.has(action.name) && isBrowserHousekeepingCall(action.name, input))
    )
      continue;
    let s = describeBrowserToolAction(action.name, input);
    if (!e.has(s)) {
      e.add(s);
      r.push(s);
    }
  }
  return r;
}
//@ chunk-11065byw.js:1824-2227 placement
/**
 * 把 Claude in Chrome（CFC）工具调用转成一句英文描述（如 "click"、"read your browser tabs"），computer 按 action 查表，browser_batch 合并各子动作，未知时为 "use the browser"。
 */
function describeBrowserToolAction(name, e) {
  let r = name.startsWith(CFC_TOOL_PREFIX) ? name.slice(CFC_TOOL_PREFIX.length) : name;
  if (r === "computer") {
    let action = typeof e.action === "string" ? e.action : undefined;
    if (action && COMPUTER_ACTION_DESCRIPTIONS[action]) return COMPUTER_ACTION_DESCRIPTIONS[action];
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
function hasTrustRiskSources(disclosures, { backstop: t = false } = {}) {
  return (
    disclosures.allowRules.sources.length > 0 ||
    disclosures.additionalDirectories.sources.length > 0 ||
    (!t && (disclosures.hookSources.length > 0 || disclosures.commandHelperSources.length > 0))
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
  let t = resolve(o);
  let localSettingsStoreRoot = resolveLocalSettingsStoreRoot(t, uncachedStorageRootFor);
  let settings = parseSettingsFileUncached(join(t, ".claude", "settings.json")).settings;
  let c = join(localSettingsStoreRoot, ".claude", "settings.local.json");
  let a = join(t, ".claude", "settings.local.json");
  let filtered = [
    parseSettingsFileUncached(c).settings,
    ...(a === c ? [] : [parseSettingsFileUncached(a).settings]),
  ].filter((e) => e !== null);
  let localSettings =
    filtered.length === 0
      ? null
      : {
          permissions: {
            additionalDirectories: filtered.flatMap((e) => e.permissions?.additionalDirectories ?? []),
          },
        };
  let u = {
    projectSettings: settings,
    localSettings,
  };
  let p = {
    sources: [
      ["projectSettings", ".claude/settings.json"],
      ["localSettings", ".claude/settings.local.json"],
    ],
    read: (e) => u[e] ?? null,
    rules: (e) =>
      e === "localSettings"
        ? filtered.flatMap((h) => settingsJsonToRules(h, e))
        : settingsJsonToRules(u[e] ?? null, e),
  };
  let d = (settings) =>
    hasApiKeyHelper(settings) ||
    hasAwsCommands(settings) ||
    hasGcpCommands(settings) ||
    hasOtelHeadersHelper(settings) ||
    hasProxyAuthHelper(settings);
  let l = [];
  let n = [];
  if (hasHooks(settings)) l.push(".claude/settings.json");
  if (filtered.some(hasHooks)) l.push(".claude/settings.local.json");
  let g = noPolicyStatusLine(t);
  if (g !== null) l.push(truncatePathForDisplay_2(g));
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
  for (let [key, value] of Object.entries(settings))
    if (!PROVIDER_CREDENTIAL_ENV_VARS.has(key.toUpperCase())) n[key] = value;
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
  truncateTrustLine,
  hasDangerousEnvVars,
};

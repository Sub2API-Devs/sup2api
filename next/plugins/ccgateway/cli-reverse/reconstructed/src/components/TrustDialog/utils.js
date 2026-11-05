/**
 * components/TrustDialog/utils.ts
 *
 * 信任对话框的风险来源收集：各类 hooks、bash 权限、OTEL headers helper、apiKeyHelper、AWS/GCP 命令、危险环境变量的来源文件列表；本模块混入了大量同名副本（shared 指纹）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TrustDialog/utils.ts
 * pieces: chunk-1zkxb015.js (3), chunk-71parphm.js (1), chunk-b29rcs2f.js (4), chunk-px2txms0.js (28), chunk-qa0fq590.js (8)
 * attribution: placement 14, layout 16, callgraph-fingerprint 2, fingerprint 8, affinity 1, sole-consumer 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, resolve, join } from "path";
import { PROVIDER_CREDENTIAL_ENV_VARS } from "../../utils/managedEnvSafety.js";
import { sorted } from "../../utils/plugins/marketplaceAutoUpdate.js";
import {
  isGatedGrantsBackstopExempt,
  workspaceHasGatedGrants,
  getPermissionRulesForSource,
  settingsJsonToRules,
  getProjectGrantGates,
} from "../../utils/permissions/permissionsLoader.js";
import {
  REPO_DIR_SETTING_SOURCE_LIST,
  isSettingSourceEnabled,
  getEnabledSettingSources,
} from "../../utils/settings/constants.js";
import { getGlobalClaudeFile } from "../../utils/env.js";
import {
  areCommandPluginSourcesDisabledByPolicy,
  isSourceAllowedByPolicy,
  isPluginBlockedByPolicy,
} from "../../utils/plugins/marketplacePolicy.js";
import {
  getSettingsForSource,
  projectSettingsAliasesUserSettings,
  getSettingsForSourceTightenOnly,
  parseSettingsFileUncached,
} from "../../utils/settings/settings.js";
import { repoAuthoredMarketplaceHeaders } from "../../utils/plugins/marketplaceSources.js";
import { tryUnwrapTextPayload } from "../../utils/plugins/marketplaceManager.js";
import { getStrictMcpConfig, isHomeDirectorySession, getOriginalCwd } from "../../bootstrap/state.js";
import {
  doesEnterpriseMcpConfigExist,
  getMcpConfigsByScope,
  isMcpServerAllowedByPolicy,
} from "../../services/mcp/config.js";
import { getProjectMcpServerStatus } from "../../services/mcp/utils.js";
import { containsEnvRef } from "../../services/mcp/envExpansion.js";
import { isLocalSettingsGitTracked } from "../../utils/config.js";
import { noPolicyStatusLine } from "../../utils/hooks/hooksConfigSnapshot.js";
import { truncatePathForDisplay_2 } from "../../utils/invisibleChars.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { sanitizeAnsiText } from "../../utils/stripAnsi.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { isProtectedEnvVar } from "../../utils/managedEnvConstants.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { CHROME_INPUT_APPROVED_TOOL_NAMES } from "../../utils/claudeInChrome/browserToolSchemas.js";
import { isBrowserHousekeepingCall } from "../../utils/permissions/browserComputerUseTools.js";
import { CFC_TOOL_PREFIX } from "../../utils/claudeInChrome/common.js";
import { resolveLocalSettingsStoreRoot } from "../../utils/settings/settingsFileParsing.js";
import { uncachedStorageRootFor } from "../../utils/settings/settingsStorage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-71parphm.js:11899-12054 fingerprint (2.1.88 match: hasDangerousEnvVars, 0.591)
function hasDangerousEnvVars(settings) {
  if (!settings || !process.env.ANTHROPIC_UNIX_SOCKET) return settings || {};
  let filteredSettings = {};
  for (let [key, value] of Object.entries(settings))
    if (!PROVIDER_CREDENTIAL_ENV_VARS.has(key.toUpperCase())) filteredSettings[key] = value;
  return filteredSettings;
}
//@ chunk-qa0fq590.js:526-656 placement
var filtered; // deferred: uses sorted (../../utils/plugins/marketplaceAutoUpdate.js) of its import cycle while loading; runs once the cycle is complete
var SETTINGS_FILE_PATHS;
deferInit("chunk-qa0fq590.js:526", () => {
  filtered = sorted.filter((sourceName) => sourceName !== "userSettings");
  SETTINGS_FILE_PATHS = {
    projectSettings: ".claude/settings.json",
    localSettings: ".claude/settings.local.json",
  };
});
//@ chunk-qa0fq590.js:656-795 placement
/**
 * 判断信任对话框是否需要因"未门控的授权来源"而出现：豁免时 false，工作区有门控授权时 true，否则看来源列表里是否有未被禁用设置源覆盖的条目。
 */
function hasUngatedTrustSources(bashAndMcpPermissionSources) {
  if (isGatedGrantsBackstopExempt()) return false;
  if (workspaceHasGatedGrants()) return true;
  let mapped = REPO_DIR_SETTING_SOURCE_LIST.filter((sourceName) => !isSettingSourceEnabled(sourceName)).map(
    (sourceName) => SETTINGS_FILE_PATHS[sourceName],
  );
  return (bashAndMcpPermissionSources ?? getBashAndMcpPermissionSources()).some(
    (sourcePath) => !mapped.includes(sourcePath),
  );
}
//@ chunk-qa0fq590.js:795-950 placement
function getBashAndMcpPermissionSources(bashPermissionSources = getBashPermissionSources()) {
  let sources = [...bashPermissionSources];
  if (hasHeadersHelper("project")) sources.push(".mcp.json");
  if (hasHeadersHelper("local"))
    sources.push(`${getGlobalClaudeFile()} (local-scope MCP servers for this project)`);
  return sources;
}
//@ chunk-qa0fq590.js:950-1401 placement
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
//@ chunk-qa0fq590.js:1401-1563 placement
function isKnownUrlMarketplace(marketplaceName, url) {
  let enabledSettingSources = getEnabledSettingSources();
  if (
    filtered.some(
      (sourceName) =>
        enabledSettingSources.includes(sourceName) &&
        Object.hasOwn(getSettingsForSource(sourceName)?.extraKnownMarketplaces ?? {}, marketplaceName),
    )
  )
    return true;
  return (
    repoAuthoredMarketplaceHeaders(
      {
        source: "url",
        url,
      },
      marketplaceName,
    ) !== undefined
  );
}
//@ chunk-qa0fq590.js:1563-1606 placement
function isKnownMarketplace(marketplaceName) {
  return Object.hasOwn(tryUnwrapTextPayload(), marketplaceName);
}
//@ chunk-qa0fq590.js:1606-1822 placement
function hasHeadersHelper(scope) {
  if (getStrictMcpConfig() || doesEnterpriseMcpConfigExist()) return false;
  let { servers } = getMcpConfigsByScope(scope, {
    expandVars: false,
  });
  return Object.entries(servers).some(
    ([key, value]) =>
      "headersHelper" in value &&
      !!value.headersHelper &&
      !(scope === "project" && getProjectMcpServerStatus(key) === "rejected") &&
      (containsEnvRef(value.url) || isMcpServerAllowedByPolicy(key, value)),
  );
}
//@ chunk-qa0fq590.js:1822-2003 callgraph-fingerprint (2.1.88 match: getBashPermissionSources, 0.478)
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
//@ chunk-px2txms0.js:668-714 sole-consumer
function describeRuleChanges(sourceName) {
  return isSettingSourceEnabled(sourceName)
    ? getPermissionRulesForSource(sourceName)
    : settingsJsonToRules(getSettingsForSourceTightenOnly(sourceName), sourceName);
}
//@ chunk-px2txms0.js:714-763 sole-consumer
function trustHelpers() {
  return {
    sources: getHooksSources_2(),
    read: getSettingsForSourceTightenOnly,
    rules: describeRuleChanges,
  };
}
//@ chunk-px2txms0.js:763-954 sole-consumer (2.1.88 match: getHooksSources, 0.753)
var getHooksSources_2 = () => {
  let { gateProject } = getProjectGrantGates();
  let localTracked = isLocalSettingsGitTracked({
    onIndeterminate: "tracked",
  });
  return [
    ...(gateProject ? [["projectSettings", ".claude/settings.json"]] : []),
    ...(localTracked ? [["localSettings", ".claude/settings.local.json"]] : []),
  ];
};
//@ chunk-px2txms0.js:954-1167 fingerprint (2.1.88 match: hasHooks, 0.725)
function hasHooks(settings) {
  if (settings === null) return false;
  if (settings.statusLine) return true;
  if (settings.fileSuggestion) return true;
  if (settings.subagentStatusLine) return true;
  if (!settings.hooks) return false;
  for (let hookConfig of Object.values(settings.hooks)) if (hookConfig.length > 0) return true;
  return false;
}
//@ chunk-px2txms0.js:1167-1421 layout (2.1.88 match: getHooksSources, 0.888)
function getHooksSources_3(
  sourceView = {
    sources: [
      ["projectSettings", ".claude/settings.json"],
      ["localSettings", ".claude/settings.local.json"],
    ],
    read: getSettingsForSourceTightenOnly,
    rules: describeRuleChanges,
  },
  cwd = getOriginalCwd(),
) {
  let sources = [];
  for (let [sourceName, filePath] of sourceView.sources)
    if (hasHooks(sourceView.read(sourceName))) sources.push(filePath);
  let policyStatusLine = noPolicyStatusLine(cwd);
  if (policyStatusLine !== null) sources.push(truncatePathForDisplay_2(policyStatusLine));
  return sources;
}
//@ chunk-px2txms0.js:1421-1550 layout (2.1.88 match: hasBashPermission, 1)
function hasBashPermission(rules) {
  return rules.some(
    (rule) =>
      rule.ruleBehavior === "allow" &&
      (rule.ruleValue.toolName === BASH_TOOL_NAME ||
        rule.ruleValue.toolName.startsWith(BASH_TOOL_NAME + "(")),
  );
}
//@ chunk-px2txms0.js:1550-1605 layout
var CONTROL_OR_FORMAT_RE = /[\x00-\x1f\x7f-\x9f\u2028\u2029]|\p{Cf}/gu;
var MAX_TRUST_LINE = 60;
//@ chunk-px2txms0.js:1605-1693 layout
/**
 * 函数 truncateTrustLine（去控制字符并截断）；位于「信任对话框的风险来源收集：各类 hooks、bash 权限、OTEL headers helper、apiKeyHelper、AWS/GCP 命令、危险环境变量的来源文件列表；本模块混入了大量同名副本（shared 指纹）」模块。
 */
function truncateTrustLine(text) {
  let trimmed = sanitizeAnsiText(text).replace(CONTROL_OR_FORMAT_RE, "").trim();
  return trimmed.length > MAX_TRUST_LINE ? `${truncateToLength(trimmed, MAX_TRUST_LINE)}\u2026` : trimmed;
}
//@ chunk-px2txms0.js:1693-1791 layout
var RULE_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-px2txms0.js:1693", () => {
  RULE_TOOL_NAMES = new Set([
    BASH_TOOL_NAME,
    "PowerShell",
    "Write",
    "Edit",
    "MultiEdit",
    "NotebookEdit",
    "WebFetch",
    "WebSearch",
  ]);
});
//@ chunk-px2txms0.js:1791-1925 layout
function allowRulePriority(rule) {
  let { toolName, ruleContent } = rule.ruleValue;
  let isGenericTool = RULE_TOOL_NAMES.has(toolName) || toolName.startsWith("mcp__");
  let hasNoRuleContent = ruleContent === undefined;
  if (isGenericTool) return hasNoRuleContent ? 0 : 1;
  return hasNoRuleContent ? 2 : 3;
}
//@ chunk-px2txms0.js:1925-2260 layout
/**
 * 汇总各设置来源中的 allow 权限规则：记录有规则的来源文件，规则按优先级排序、清理控制字符后去重，返回 {rules, sources, rawCount}，供信任对话框展示。
 */
function collectAllowRuleSources(helpers = trustHelpers()) {
  let sources = [];
  let rules = [];
  for (let [sourceName, filePath] of helpers.sources) {
    let filtered = helpers.rules(sourceName).filter((rule) => rule.ruleBehavior === "allow");
    if (filtered.length > 0) {
      sources.push(filePath);
      rules.push(...filtered);
    }
  }
  let rawCount = rules.length;
  rules.sort((ruleA, ruleB) => allowRulePriority(ruleA) - allowRulePriority(ruleB));
  let seen = new Set();
  let ruleLabels = [];
  for (let rule of rules) {
    let label = truncateTrustLine(permissionRuleValueFromString(rule.ruleValue));
    if (label.length > 0 && !seen.has(label)) {
      seen.add(label);
      ruleLabels.push(label);
    }
  }
  return {
    rules: ruleLabels,
    sources,
    rawCount,
  };
}
//@ chunk-px2txms0.js:2260-2348 layout
function pathRiskRank(dirPath) {
  if (isAbsolute(dirPath) || dirPath.startsWith("~")) return 0;
  if (dirPath.includes("..")) return 1;
  return 2;
}
//@ chunk-px2txms0.js:2348-2666 layout
/**
 * 汇总各设置来源中的 permissions.additionalDirectories：记录来源、清理去重并排序，返回 {dirs, sources, rawCount}。
 */
function collectAdditionalDirectorySources(helpers = trustHelpers()) {
  let sources = [];
  let dirs = [];
  for (let [sourceName, filePath] of helpers.sources) {
    let additionalDirectories = helpers.read(sourceName)?.permissions?.additionalDirectories ?? [];
    if (additionalDirectories.length > 0) {
      sources.push(filePath);
      dirs.push(...additionalDirectories);
    }
  }
  let rawCount = dirs.length;
  let seen = new Set();
  let labels = [];
  for (let dir of dirs) {
    let label = truncateTrustLine(dir);
    if (label.length > 0 && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  labels.sort((labelA, labelB) => pathRiskRank(labelA) - pathRiskRank(labelB));
  return {
    dirs: labels,
    sources,
    rawCount,
  };
}
//@ chunk-px2txms0.js:2666-2833 fingerprint (2.1.88 match: getHooksSources, 1)
function getHooksSources() {
  let sources = [];
  let projectSettings = describeRuleChanges("projectSettings");
  if (hasBashPermission(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = describeRuleChanges("localSettings");
  if (hasBashPermission(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-px2txms0.js:2833-3166 layout (2.1.88 match: formatListWithAnd, 1)
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
//@ chunk-px2txms0.js:3166-3211 fingerprint (2.1.88 match: hasOtelHeadersHelper, 1)
function hasOtelHeadersHelper(settings) {
  return !!settings?.otelHeadersHelper;
}
//@ chunk-px2txms0.js:3211-3384 layout (2.1.88 match: getHooksSources, 1)
function getHooksSources_4() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasOtelHeadersHelper(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasOtelHeadersHelper(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-px2txms0.js:3384-3595 layout (2.1.88 match: getHooksSources, 0.91)
function getHooksSources_5() {
  let sources = [];
  if (getSettingsForSourceTightenOnly("projectSettings")?.autoMemoryDirectory !== undefined)
    sources.push(".claude/settings.json");
  if (getSettingsForSourceTightenOnly("localSettings")?.autoMemoryDirectory !== undefined)
    sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-px2txms0.js:3595-3635 fingerprint (2.1.88 match: hasApiKeyHelper, 1)
function hasApiKeyHelper(settings) {
  return !!settings?.apiKeyHelper;
}
//@ chunk-px2txms0.js:3635-3808 layout (2.1.88 match: getHooksSources, 1)
function getHooksSources_6() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasApiKeyHelper(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasApiKeyHelper(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-px2txms0.js:3808-3876 fingerprint (2.1.88 match: hasAwsCommands, 1)
function hasAwsCommands(settings) {
  return !!(settings?.awsAuthRefresh || settings?.awsCredentialExport);
}
//@ chunk-px2txms0.js:3876-4049 layout (2.1.88 match: getHooksSources, 1)
function getHooksSources_7() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasAwsCommands(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasAwsCommands(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-px2txms0.js:4049-4091 fingerprint (2.1.88 match: hasGcpCommands, 1)
function hasGcpCommands(settings) {
  return !!settings?.gcpAuthRefresh;
}
//@ chunk-px2txms0.js:4091-4264 layout (2.1.88 match: getHooksSources, 1)
function getHooksSources_8() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasGcpCommands(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasGcpCommands(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-px2txms0.js:4264-4307 placement
/**
 * 函数 hasProxyAuthHelper（有 proxyAuthHelper）；位于「信任对话框的风险来源收集：各类 hooks、bash 权限、OTEL headers helper、apiKeyHelper、AWS/GCP 命令、危险环境变量的来源文件列表；本模块混入了大量同名副本（shared 指纹）」模块。
 */
function hasProxyAuthHelper(settings) {
  return !!settings?.proxyAuthHelper;
}
//@ chunk-px2txms0.js:4307-4480 placement (2.1.88 match: getHooksSources, 1)
function getHooksSources_9() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasProxyAuthHelper(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasProxyAuthHelper(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-px2txms0.js:4480-4568 placement
function hasUnsafeEnv(settings) {
  if (!settings?.env) return false;
  return Object.entries(settings.env).some(([key, value]) => !isProtectedEnvVar(key, value));
}
//@ chunk-px2txms0.js:4568-4737 placement (2.1.88 match: getHooksSources, 1)
function getHooksSources_10() {
  let sources = [];
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  if (hasUnsafeEnv(projectSettings)) sources.push(".claude/settings.json");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  if (hasUnsafeEnv(localSettings)) sources.push(".claude/settings.local.json");
  return sources;
}
//@ chunk-b29rcs2f.js:336-1318 affinity
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
//@ chunk-b29rcs2f.js:1318-1527 fingerprint (2.1.88 match: formatListWithAnd, 1)
function formatListWithAnd(items) {
  let allButLast = items.slice(0, MAX_LISTED_BROWSER_ACTIONS);
  let remaining = items.length - allButLast.length;
  if (remaining > 0) allButLast.push(`${remaining} more`);
  if (allButLast.length === 1) return allButLast[0] ?? "";
  if (allButLast.length === 2) return `${allButLast[0]} and ${allButLast[1]}`;
  return `${allButLast.slice(0, -1).join(", ")}, and ${allButLast.at(-1)}`;
}
//@ chunk-b29rcs2f.js:1527-1824 placement
function describeBrowserBatchActions(input) {
  if (!Array.isArray(input.actions)) return [];
  let seen = new Set();
  let descriptions = [];
  for (let action of input.actions) {
    if (!isPlainObject(action) || typeof action.name !== "string") continue;
    let input = isPlainObject(action.input) ? action.input : {};
    if (
      action.name === "browser_batch" ||
      (CHROME_INPUT_APPROVED_TOOL_NAMES.has(action.name) && isBrowserHousekeepingCall(action.name, input))
    )
      continue;
    let description = describeBrowserToolAction(action.name, input);
    if (!seen.has(description)) {
      seen.add(description);
      descriptions.push(description);
    }
  }
  return descriptions;
}
//@ chunk-b29rcs2f.js:1824-2227 placement
/**
 * 把 Claude in Chrome（CFC）工具调用转成一句英文描述（如 "click"、"read your browser tabs"），computer 按 action 查表，browser_batch 合并各子动作，未知时为 "use the browser"。
 */
function describeBrowserToolAction(toolName, input) {
  let bareName = toolName.startsWith(CFC_TOOL_PREFIX) ? toolName.slice(CFC_TOOL_PREFIX.length) : toolName;
  if (bareName === "computer") {
    let action = typeof input.action === "string" ? input.action : undefined;
    if (action && COMPUTER_ACTION_DESCRIPTIONS[action]) return COMPUTER_ACTION_DESCRIPTIONS[action];
    return "use the browser";
  }
  if (bareName === "browser_batch") {
    let batchDescriptions = describeBrowserBatchActions(input);
    return batchDescriptions.length > 0 ? formatListWithAnd(batchDescriptions) : "use the browser";
  }
  if (bareName === "tabs_context_mcp")
    return input.createIfEmpty ? "create a browser window and read your tabs" : "read your browser tabs";
  return BROWSER_TOOL_ACTION_DESCRIPTIONS[bareName] ?? "use the browser";
}
//@ chunk-1zkxb015.js:482-659 placement
function hasTrustRiskSources(disclosures, { backstop = false } = {}) {
  return (
    disclosures.allowRules.sources.length > 0 ||
    disclosures.additionalDirectories.sources.length > 0 ||
    (!backstop && (disclosures.hookSources.length > 0 || disclosures.commandHelperSources.length > 0))
  );
}
//@ chunk-1zkxb015.js:659-766 layout
function collectPermissionTrustSources() {
  return {
    allowRules: collectAllowRuleSources(),
    additionalDirectories: collectAdditionalDirectorySources(),
    hookSources: [],
    commandHelperSources: [],
  };
}
//@ chunk-1zkxb015.js:766-1724 callgraph-fingerprint (2.1.88 match: getOtelHeadersHelperSources, 0.467)
function getOtelHeadersHelperSources(cwd) {
  let resolvedCwd = resolve(cwd);
  let localSettingsStoreRoot = resolveLocalSettingsStoreRoot(resolvedCwd, uncachedStorageRootFor);
  let settings = parseSettingsFileUncached(join(resolvedCwd, ".claude", "settings.json")).settings;
  let storeLocalSettingsPath = join(localSettingsStoreRoot, ".claude", "settings.local.json");
  let localSettingsPath = join(resolvedCwd, ".claude", "settings.local.json");
  let filtered = [
    parseSettingsFileUncached(storeLocalSettingsPath).settings,
    ...(localSettingsPath === storeLocalSettingsPath
      ? []
      : [parseSettingsFileUncached(localSettingsPath).settings]),
  ].filter((localSettingsRaw) => localSettingsRaw !== null);
  let localSettings =
    filtered.length === 0
      ? null
      : {
          permissions: {
            additionalDirectories: filtered.flatMap(
              (localSettingsRaw_) => localSettingsRaw_.permissions?.additionalDirectories ?? [],
            ),
          },
        };
  let settingsBySource = {
    projectSettings: settings,
    localSettings,
  };
  let settingSourceView = {
    sources: [
      ["projectSettings", ".claude/settings.json"],
      ["localSettings", ".claude/settings.local.json"],
    ],
    read: (sourceName) => settingsBySource[sourceName] ?? null,
    rules: (sourceName_) =>
      sourceName_ === "localSettings"
        ? filtered.flatMap((localSettingsRaw_) => settingsJsonToRules(localSettingsRaw_, sourceName_))
        : settingsJsonToRules(settingsBySource[sourceName_] ?? null, sourceName_),
  };
  let hasCommandHelpers = (settings) =>
    hasApiKeyHelper(settings) ||
    hasAwsCommands(settings) ||
    hasGcpCommands(settings) ||
    hasOtelHeadersHelper(settings) ||
    hasProxyAuthHelper(settings);
  let hookSources = [];
  let commandHelperSources = [];
  if (hasHooks(settings)) hookSources.push(".claude/settings.json");
  if (filtered.some(hasHooks)) hookSources.push(".claude/settings.local.json");
  let policyStatusLine = noPolicyStatusLine(resolvedCwd);
  if (policyStatusLine !== null) hookSources.push(truncatePathForDisplay_2(policyStatusLine));
  if (hasCommandHelpers(settings)) commandHelperSources.push(".claude/settings.json");
  if (filtered.some(hasCommandHelpers)) commandHelperSources.push(".claude/settings.local.json");
  return {
    allowRules: collectAllowRuleSources(settingSourceView),
    additionalDirectories: collectAdditionalDirectorySources(settingSourceView),
    hookSources,
    commandHelperSources,
  };
}
export {
  hasUngatedTrustSources,
  describeBrowserToolAction,
  hasDangerousEnvVars,
  collectPermissionTrustSources,
  hasTrustRiskSources,
  formatListWithAnd_2,
  getOtelHeadersHelperSources,
  getBashAndMcpPermissionSources,
  truncateTrustLine,
  getHooksSources_10,
  getHooksSources_5,
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
};

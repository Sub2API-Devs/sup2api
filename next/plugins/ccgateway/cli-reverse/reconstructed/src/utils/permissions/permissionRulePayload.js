/**
 * utils/permissions/permissionRulePayload.ts
 *
 * 权限规则载荷（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sfy7bm1n.js (18)
 * attribution: placement 18
 */
import { HostScoped } from "../hostScoped.js";
import { HEARTHBOT } from "../../services/mcp/ccrMetaMcp.js";
import { isCliOwnedConfig } from "../../services/mcp/cliOwnedClients.js";
import { isCcrUrlWithoutCredentials } from "../../services/mcp/ccrMcpUrls.js";
import { onProcessRootHost, getMcpClientsFromAccessor, isCcsTenant } from "../../bootstrap/state.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { WEBSEARCH } from "../../tools/WebSearchTool/prompt.js";
import { env } from "../env.js";
import { hasRelaySource } from "../../services/projectsRelay/relayConfig.js";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasGrowthBookUsedNonDefaultHost,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import {
  hasWildcard,
  canonicalToolName,
  matchRulePattern,
  permissionRuleValueFromString,
} from "./permissionRuleParser.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { getToolNameForPermissionCheck as getToolNameForPermissionCheck_2 } from "../../services/mcp/mcpStringUtils.js";
import { peekSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { marketplaceSuffix, normalizePluginId } from "../plugins/pluginIdentifier.js";
import { SYNCED } from "../telemetry/pluginTelemetry.js";
import { isTopHostSession } from "../sessionShape.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sfy7bm1n.js:1377-1477 placement
var BOT_PROTECTED_TENGU_ATOMIC_MAGPIE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_PERSISTED_RULE_SOURCES;
var webRestrictedProcessFlag;
deferInit("chunk-sfy7bm1n.js:1377", () => {
  BOT_PROTECTED_TENGU_ATOMIC_MAGPIE = "bot_protected_tengu_atomic_magpie";
  NON_PERSISTED_RULE_SOURCES = new Set(["session", "cliArg"]);
  webRestrictedProcessFlag = new HostScoped(() => ({
    value: false,
  }));
});
//@ chunk-sfy7bm1n.js:1477-1576 placement (2.1.88 match: getServerUrl, 1)
function getServerUrl(serverName, config) {
  if (
    serverName === HEARTHBOT &&
    !isCliOwnedConfig(config) &&
    "url" in config &&
    typeof config.url === "string" &&
    isCcrUrlWithoutCredentials(config.url)
  )
    onProcessRootHost(webRestrictedProcessFlag).value = true;
}
//@ chunk-sfy7bm1n.js:1576-1744 placement
/**
 * 中继（Projects/根宿主）会话中 WebFetch/WebSearch 是否受限：除非 tengu_atomic_magpie 来自载荷且 GrowthBook 未用非默认主机。
 */
function isWebToolRestrictedInRelay(name) {
  if (
    (name !== WEBFETCH && name !== WEBSEARCH) ||
    !(
      onProcessRootHost(webRestrictedProcessFlag).value ||
      env.CLAUDE_CODE_PROJECTS_SESSION ||
      hasRelaySource(getMcpClientsFromAccessor())
    )
  )
    return false;
  let featureValue = getFeatureValueWithSource_CACHED_MAY_BE_STALE(BOT_PROTECTED_TENGU_ATOMIC_MAGPIE, false);
  return !(
    featureValue.value === true &&
    featureValue.source === "payload" &&
    !hasGrowthBookUsedNonDefaultHost()
  );
}
//@ chunk-sfy7bm1n.js:1744-1863 placement
function matchesRestrictedWebRule(pattern) {
  let isBroad = typeof pattern !== "string";
  let hasWildcardPattern = !isBroad && hasWildcard(pattern);
  return [WEBFETCH, WEBSEARCH].some(
    (webToolName) =>
      (isBroad || hasWildcardPattern || canonicalToolName(pattern) === webToolName) &&
      isWebToolRestrictedInRelay(webToolName) &&
      (!hasWildcardPattern || matchRulePattern(pattern, webToolName)),
  );
}
//@ chunk-sfy7bm1n.js:1863-1903 placement
/**
 * isRestrictedNonSessionRule：非会话来源的受限规则。
 */
function isRestrictedNonSessionRule(source, toolName) {
  return !NON_PERSISTED_RULE_SOURCES.has(source) && isWebToolRestrictedInRelay(toolName);
}
//@ chunk-sfy7bm1n.js:1903-1940 placement
function isWebToolRestrictedInThisSession() {
  return isWebToolRestrictedInRelay(WEBFETCH) || isWebToolRestrictedInRelay(WEBSEARCH);
}
//@ chunk-sfy7bm1n.js:1940-2305 placement
/**
 * 权限更新是否格式不合法：非对象，或规则类更新的 rules 不是数组、条目缺 toolName 或 ruleContent 非字符串。
 */
function isMalformedRuleUpdate(update) {
  if (typeof update !== "object" || update === null) return true;
  if (update.type !== "addRules" && update.type !== "replaceRules" && update.type !== "removeRules")
    return false;
  let rules = "rules" in update ? update.rules : undefined;
  return (
    !Array.isArray(rules) ||
    rules.some(
      (rule) =>
        typeof rule !== "object" ||
        rule === null ||
        !("toolName" in rule) ||
        typeof rule.toolName !== "string" ||
        ("ruleContent" in rule && rule.ruleContent !== undefined && typeof rule.ruleContent !== "string"),
    )
  );
}
//@ chunk-sfy7bm1n.js:2305-3000 placement
function applyPermissionRulePayload(update, isRestrictedTool, toolPermissionContext) {
  if ((update.type !== "removeRules" && update.type !== "replaceRules") || update.behavior === "allow")
    return;
  if (update.type === "replaceRules") {
    if (toolPermissionContext === undefined)
      return update.rules.length === 0
        ? []
        : [
            {
              type: "addRules",
              rules: update.rules,
              behavior: update.behavior,
              destination: update.destination,
            },
          ];
    let ruleTables =
      (update.behavior === "deny"
        ? toolPermissionContext.alwaysDenyRules
        : toolPermissionContext.alwaysAskRules) ?? {};
    let rawRules = Object.hasOwn(ruleTables, update.destination) ? ruleTables[update.destination] : undefined;
    let existingRules = Array.isArray(rawRules) ? rawRules : [];
    let ruleKey = (ruleString) => formatPermissionRule(permissionRuleValueFromString(ruleString));
    let incomingKeys = new Set(update.rules.map((rule) => ruleKey(formatPermissionRule(rule))));
    let filtered = existingRules
      .map((rawRule) => permissionRuleValueFromString(rawRule))
      .filter(
        (value) =>
          isRestrictedTool(value.toolName) && !incomingKeys.has(ruleKey(formatPermissionRule(value))),
      );
    return filtered.length === 0
      ? undefined
      : [
          {
            ...update,
            rules: [...update.rules, ...filtered],
          },
        ];
  }
  let filtered = update.rules.filter((rule) => !isRestrictedTool(rule.toolName));
  if (filtered.length === update.rules.length) return;
  return filtered.length === 0
    ? []
    : [
        {
          ...update,
          rules: filtered,
        },
      ];
}
//@ chunk-sfy7bm1n.js:3000-3053 placement
/**
 * filterPermissionUpdatePayload：过滤权限更新载荷中的受限 Web 工具。
 */
function filterPermissionUpdatePayload(updates, toolPermissionContext) {
  if (!isWebToolRestrictedInThisSession()) return updates;
  return filterRestrictedAllowUpdates(updates, matchesRestrictedWebRule, toolPermissionContext);
}
//@ chunk-sfy7bm1n.js:3053-3387 placement
/**
 * 过滤权限更新：丢弃格式不合法的更新，应用规则载荷转换，并从 allow 规则中去掉受限工具；无变化时返回原数组。
 */
function filterRestrictedAllowUpdates(updates, isRestrictedTool, toolPermissionContext) {
  let changed = false;
  let flattened = updates.flatMap((update) => {
    if (isMalformedRuleUpdate(update)) {
      changed = true;
      return [];
    }
    let replacement = applyPermissionRulePayload(update, isRestrictedTool, toolPermissionContext);
    if (replacement !== undefined) {
      changed = true;
      return replacement;
    }
    if ((update.type !== "addRules" && update.type !== "replaceRules") || update.behavior !== "allow")
      return [update];
    let filtered = update.rules.filter((rule) => !isRestrictedTool(rule.toolName));
    if (filtered.length === update.rules.length) return [update];
    changed = true;
    return filtered.length === 0
      ? []
      : [
          {
            ...update,
            rules: filtered,
          },
        ];
  });
  return changed ? flattened : updates;
}
//@ chunk-sfy7bm1n.js:3387-3657 placement
/**
 * 为 WebSearch 建议整工具规则，为 WebFetch 建议 domain:主机名 规则（URL 无效或含 * 时不建议）。
 */
function suggestWebToolRule(tool, input) {
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_2(tool);
  if (toolNameForPermissionCheck === WEBSEARCH)
    return {
      toolName: toolNameForPermissionCheck,
    };
  let url = typeof input === "object" && input !== null && "url" in input ? input.url : undefined;
  if (toolNameForPermissionCheck !== WEBFETCH || typeof url !== "string") return;
  try {
    let hostname = new URL(url).hostname;
    return hostname.includes("*")
      ? undefined
      : {
          toolName: toolNameForPermissionCheck,
          ruleContent: `domain:${hostname}`,
        };
  } catch {
    return;
  }
}
//@ chunk-sfy7bm1n.js:3657-4204 placement
function normalizePermissionUpdate(updates, suggestedRule, toolPermissionContext) {
  if (!isWebToolRestrictedInThisSession()) return updates;
  let changed = false;
  let flattened = updates.flatMap((update) => {
    if (isMalformedRuleUpdate(update)) {
      changed = true;
      return [];
    }
    let replacement = applyPermissionRulePayload(update, matchesRestrictedWebRule, toolPermissionContext);
    if (replacement !== undefined) {
      changed = true;
      return replacement;
    }
    if ((update.type !== "addRules" && update.type !== "replaceRules") || update.behavior !== "allow")
      return [update];
    let filtered = update.rules.filter((rule) => matchesRestrictedWebRule(rule.toolName));
    if (filtered.length === 0) return [update];
    changed = true;
    let filtered_2 = update.rules.filter((rule) => !matchesRestrictedWebRule(rule.toolName));
    let downgraded =
      update.type === "addRules" && suggestedRule !== undefined
        ? filtered.filter(
            (rule) =>
              canonicalToolName(rule.toolName) === suggestedRule.toolName &&
              rule.ruleContent === suggestedRule.ruleContent,
          )
        : [];
    return [
      ...(filtered_2.length > 0
        ? [
            {
              ...update,
              rules: filtered_2,
            },
          ]
        : []),
      ...(downgraded.length > 0
        ? [
            {
              ...update,
              destination: "session",
              rules: downgraded,
            },
          ]
        : []),
    ];
  });
  return changed ? flattened : updates;
}
//@ chunk-sfy7bm1n.js:4204-4231 placement
var TENGU_STEADY_FINCH = "tengu_steady_finch";
//@ chunk-sfy7bm1n.js:4231-4296 placement
/**
 * areSkillsConvertedAsPlugins：技能是否被当作插件处理。
 */
function areSkillsConvertedAsPlugins() {
  return steadyFinchEnabled() || peekSessionFeatureValues()?.convertedSkillsAsPlugins === true;
}
//@ chunk-sfy7bm1n.js:4296-4331 placement
/**
 * steadyFinchEnabled：技能转插件开关。
 */
function steadyFinchEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STEADY_FINCH, false) === true;
}
//@ chunk-sfy7bm1n.js:4331-4386 placement
/**
 * isSyncedMarketplacePlugin：已同步市场里的插件 id。
 */
function isSyncedMarketplacePlugin(pluginId) {
  return (
    pluginId !== undefined &&
    marketplaceSuffix(normalizePluginId(pluginId)) === SYNCED &&
    areSkillsConvertedAsPlugins()
  );
}
//@ chunk-sfy7bm1n.js:4386-4431 placement
/**
 * isSkillPluginSurfaceEnabled：技能插件表面是否生效。
 */
function isSkillPluginSurfaceEnabled(topHost) {
  return isTopHostSession() || (!topHost && areSkillsConvertedAsPlugins() && !isCcsTenant());
}
//@ chunk-sfy7bm1n.js:4431-4464 placement
/**
 * isTopHostSkillPluginSession：顶层宿主会话且技能转插件开启。
 */
function isTopHostSkillPluginSession() {
  return isTopHostSession() && areSkillsConvertedAsPlugins();
}
export {
  isRestrictedNonSessionRule,
  isSkillPluginSurfaceEnabled,
  isWebToolRestrictedInRelay,
  normalizePermissionUpdate,
  isSyncedMarketplacePlugin,
  areSkillsConvertedAsPlugins,
  getServerUrl,
  filterPermissionUpdatePayload,
  suggestWebToolRule,
  steadyFinchEnabled,
  filterRestrictedAllowUpdates,
  isTopHostSkillPluginSession,
};

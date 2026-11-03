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

//@ chunk-sfy7bm1n.js:1377-1477 placement
var BOT_PROTECTED_TENGU_ATOMIC_MAGPIE = "bot_protected_tengu_atomic_magpie";
var NON_PERSISTED_RULE_SOURCES = new Set(["session", "cliArg"]);
var webRestrictedProcessFlag = new HostScoped(() => ({
  value: false,
}));
//@ chunk-sfy7bm1n.js:1477-1576 placement = getServerUrl (1)
function getServerUrl(e, r) {
  if (
    e === HEARTHBOT &&
    !isCliOwnedConfig(r) &&
    "url" in r &&
    typeof r.url === "string" &&
    isCcrUrlWithoutCredentials(r.url)
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
  let r = getFeatureValueWithSource_CACHED_MAY_BE_STALE(BOT_PROTECTED_TENGU_ATOMIC_MAGPIE, false);
  return !(r.value === true && r.source === "payload" && !hasGrowthBookUsedNonDefaultHost());
}
//@ chunk-sfy7bm1n.js:1744-1863 placement
function matchesRestrictedWebRule(toolName) {
  let r = typeof toolName !== "string";
  let o = !r && hasWildcard(toolName);
  return [WEBFETCH, WEBSEARCH].some(
    (n) =>
      (r || o || canonicalToolName(toolName) === n) &&
      isWebToolRestrictedInRelay(n) &&
      (!o || matchRulePattern(toolName, n)),
  );
}
//@ chunk-sfy7bm1n.js:1863-1903 placement
/**
 * isRestrictedNonSessionRule：非会话来源的受限规则。
 */
function isRestrictedNonSessionRule(e, toolName) {
  return !NON_PERSISTED_RULE_SOURCES.has(e) && isWebToolRestrictedInRelay(toolName);
}
//@ chunk-sfy7bm1n.js:1903-1940 placement
function isWebToolRestrictedInThisSession() {
  return isWebToolRestrictedInRelay(WEBFETCH) || isWebToolRestrictedInRelay(WEBSEARCH);
}
//@ chunk-sfy7bm1n.js:1940-2305 placement
/**
 * 权限更新是否格式不合法：非对象，或规则类更新的 rules 不是数组、条目缺 toolName 或 ruleContent 非字符串。
 */
function isMalformedRuleUpdate(e) {
  if (typeof e !== "object" || e === null) return true;
  if (e.type !== "addRules" && e.type !== "replaceRules" && e.type !== "removeRules") return false;
  let rules = "rules" in e ? e.rules : undefined;
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
function applyPermissionRulePayload(e, r, o) {
  if ((e.type !== "removeRules" && e.type !== "replaceRules") || e.behavior === "allow") return;
  if (e.type === "replaceRules") {
    if (o === undefined)
      return e.rules.length === 0
        ? []
        : [
            {
              type: "addRules",
              rules: e.rules,
              behavior: e.behavior,
              destination: e.destination,
            },
          ];
    let s = (e.behavior === "deny" ? o.alwaysDenyRules : o.alwaysAskRules) ?? {};
    let l = Object.hasOwn(s, e.destination) ? s[e.destination] : undefined;
    let m = Array.isArray(l) ? l : [];
    let u = (c) => formatPermissionRule(permissionRuleValueFromString(c));
    let a = new Set(e.rules.map((rule) => u(formatPermissionRule(rule))));
    let filtered = m
      .map((c) => permissionRuleValueFromString(c))
      .filter((c) => r(c.toolName) && !a.has(u(formatPermissionRule(c))));
    return filtered.length === 0
      ? undefined
      : [
          {
            ...e,
            rules: [...e.rules, ...filtered],
          },
        ];
  }
  let filtered = e.rules.filter((rule) => !r(rule.toolName));
  if (filtered.length === e.rules.length) return;
  return filtered.length === 0
    ? []
    : [
        {
          ...e,
          rules: filtered,
        },
      ];
}
//@ chunk-sfy7bm1n.js:3000-3053 placement
/**
 * filterPermissionUpdatePayload：过滤权限更新载荷中的受限 Web 工具。
 */
function filterPermissionUpdatePayload(updatedPermissions, r) {
  if (!isWebToolRestrictedInThisSession()) return updatedPermissions;
  return filterRestrictedAllowUpdates(updatedPermissions, matchesRestrictedWebRule, r);
}
//@ chunk-sfy7bm1n.js:3053-3387 placement
/**
 * 过滤权限更新：丢弃格式不合法的更新，应用规则载荷转换，并从 allow 规则中去掉受限工具；无变化时返回原数组。
 */
function filterRestrictedAllowUpdates(e, r, o) {
  let n = false;
  let flattened = e.flatMap((l) => {
    if (isMalformedRuleUpdate(l)) {
      n = true;
      return [];
    }
    let m = applyPermissionRulePayload(l, r, o);
    if (m !== undefined) {
      n = true;
      return m;
    }
    if ((l.type !== "addRules" && l.type !== "replaceRules") || l.behavior !== "allow") return [l];
    let filtered = l.rules.filter((rule) => !r(rule.toolName));
    if (filtered.length === l.rules.length) return [l];
    n = true;
    return filtered.length === 0
      ? []
      : [
          {
            ...l,
            rules: filtered,
          },
        ];
  });
  return n ? flattened : e;
}
//@ chunk-sfy7bm1n.js:3387-3657 placement
/**
 * 为 WebSearch 建议整工具规则，为 WebFetch 建议 domain:主机名 规则（URL 无效或含 * 时不建议）。
 */
function suggestWebToolRule(tool, r) {
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_2(tool);
  if (toolNameForPermissionCheck === WEBSEARCH)
    return {
      toolName: toolNameForPermissionCheck,
    };
  let url = typeof r === "object" && r !== null && "url" in r ? r.url : undefined;
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
function normalizePermissionUpdate(e, r, toolPermissionContext) {
  if (!isWebToolRestrictedInThisSession()) return e;
  let n = false;
  let flattened = e.flatMap((l) => {
    if (isMalformedRuleUpdate(l)) {
      n = true;
      return [];
    }
    let m = applyPermissionRulePayload(l, matchesRestrictedWebRule, toolPermissionContext);
    if (m !== undefined) {
      n = true;
      return m;
    }
    if ((l.type !== "addRules" && l.type !== "replaceRules") || l.behavior !== "allow") return [l];
    let filtered = l.rules.filter((rule) => matchesRestrictedWebRule(rule.toolName));
    if (filtered.length === 0) return [l];
    n = true;
    let filtered_2 = l.rules.filter((rule) => !matchesRestrictedWebRule(rule.toolName));
    let f =
      l.type === "addRules" && r !== undefined
        ? filtered.filter(
            (c) => canonicalToolName(c.toolName) === r.toolName && c.ruleContent === r.ruleContent,
          )
        : [];
    return [
      ...(filtered_2.length > 0
        ? [
            {
              ...l,
              rules: filtered_2,
            },
          ]
        : []),
      ...(f.length > 0
        ? [
            {
              ...l,
              destination: "session",
              rules: f,
            },
          ]
        : []),
    ];
  });
  return n ? flattened : e;
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
function isSyncedMarketplacePlugin(repository) {
  return (
    repository !== undefined &&
    marketplaceSuffix(normalizePluginId(repository)) === SYNCED &&
    areSkillsConvertedAsPlugins()
  );
}
//@ chunk-sfy7bm1n.js:4386-4431 placement
/**
 * isSkillPluginSurfaceEnabled：技能插件表面是否生效。
 */
function isSkillPluginSurfaceEnabled(e) {
  return isTopHostSession() || (!e && areSkillsConvertedAsPlugins() && !isCcsTenant());
}
//@ chunk-sfy7bm1n.js:4431-4464 placement
/**
 * isTopHostSkillPluginSession：顶层宿主会话且技能转插件开启。
 */
function isTopHostSkillPluginSession() {
  return isTopHostSession() && areSkillsConvertedAsPlugins();
}
export {
  isWebToolRestrictedInRelay,
  isRestrictedNonSessionRule,
  isSkillPluginSurfaceEnabled,
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

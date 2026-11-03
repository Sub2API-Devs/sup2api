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
import { Zl } from "../../services/mcp/cliOwnedClients.js";
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
import { kAi } from "../../bootstrap/sessionFeatureValues.js";
import { marketplaceSuffix, normalizePluginId } from "../plugins/pluginIdentifier.js";
import { SYNCED } from "../telemetry/pluginTelemetry.js";
import { isTopHostSession } from "../sessionShape.js";

//@ chunk-sfy7bm1n.js:1377-1477 placement
var BOT_PROTECTED_TENGU_ATOMIC_MAGPIE = "bot_protected_tengu_atomic_magpie",
  Z = new Set(["session", "cliArg"]),
  L = new HostScoped(() => ({ value: !1 }));
//@ chunk-sfy7bm1n.js:1477-1576 placement = getServerUrl (1)
function getServerUrl(e, r) {
  if (
    e === HEARTHBOT &&
    !Zl(r) &&
    "url" in r &&
    typeof r.url === "string" &&
    isCcrUrlWithoutCredentials(r.url)
  )
    onProcessRootHost(L).value = !0;
}
/**
 * 中继（Projects/根宿主）会话中 WebFetch/WebSearch 是否受限：除非 tengu_atomic_magpie 来自载荷且 GrowthBook 未用非默认主机。
 */
//@ chunk-sfy7bm1n.js:1576-1744 placement
function isWebToolRestrictedInRelay(e) {
  if (
    (e !== WEBFETCH && e !== WEBSEARCH) ||
    !(
      onProcessRootHost(L).value ||
      env.CLAUDE_CODE_PROJECTS_SESSION ||
      hasRelaySource(getMcpClientsFromAccessor())
    )
  )
    return !1;
  let r = getFeatureValueWithSource_CACHED_MAY_BE_STALE(BOT_PROTECTED_TENGU_ATOMIC_MAGPIE, !1);
  return !(r.value === !0 && r.source === "payload" && !hasGrowthBookUsedNonDefaultHost());
}
//@ chunk-sfy7bm1n.js:1744-1863 placement
function matchesRestrictedWebRule(e) {
  let r = typeof e !== "string",
    o = !r && hasWildcard(e);
  return [WEBFETCH, WEBSEARCH].some(
    (n) =>
      (r || o || canonicalToolName(e) === n) &&
      isWebToolRestrictedInRelay(n) &&
      (!o || matchRulePattern(e, n)),
  );
}
//@ chunk-sfy7bm1n.js:1863-1903 placement
function M(e, r) {
  return !Z.has(e) && isWebToolRestrictedInRelay(r);
}
//@ chunk-sfy7bm1n.js:1903-1940 placement
function D() {
  return isWebToolRestrictedInRelay(WEBFETCH) || isWebToolRestrictedInRelay(WEBSEARCH);
}
/**
 * 权限更新是否格式不合法：非对象，或规则类更新的 rules 不是数组、条目缺 toolName 或 ruleContent 非字符串。
 */
//@ chunk-sfy7bm1n.js:1940-2305 placement
function isMalformedRuleUpdate(e) {
  if (typeof e !== "object" || e === null) return !0;
  if (e.type !== "addRules" && e.type !== "replaceRules" && e.type !== "removeRules") return !1;
  let r = "rules" in e ? e.rules : void 0;
  return (
    !Array.isArray(r) ||
    r.some(
      (o) =>
        typeof o !== "object" ||
        o === null ||
        !("toolName" in o) ||
        typeof o.toolName !== "string" ||
        ("ruleContent" in o && o.ruleContent !== void 0 && typeof o.ruleContent !== "string"),
    )
  );
}
//@ chunk-sfy7bm1n.js:2305-3000 placement
function applyPermissionRulePayload(e, r, o) {
  if ((e.type !== "removeRules" && e.type !== "replaceRules") || e.behavior === "allow") return;
  if (e.type === "replaceRules") {
    if (o === void 0)
      return e.rules.length === 0
        ? []
        : [{ type: "addRules", rules: e.rules, behavior: e.behavior, destination: e.destination }];
    let s = (e.behavior === "deny" ? o.alwaysDenyRules : o.alwaysAskRules) ?? {},
      l = Object.hasOwn(s, e.destination) ? s[e.destination] : void 0,
      m = Array.isArray(l) ? l : [],
      u = (c) => formatPermissionRule(permissionRuleValueFromString(c)),
      a = new Set(e.rules.map((rule) => u(formatPermissionRule(rule)))),
      filtered = m
        .map((c) => permissionRuleValueFromString(c))
        .filter((c) => r(c.toolName) && !a.has(u(formatPermissionRule(c))));
    return filtered.length === 0 ? void 0 : [{ ...e, rules: [...e.rules, ...filtered] }];
  }
  let filtered = e.rules.filter((rule) => !r(rule.toolName));
  if (filtered.length === e.rules.length) return;
  return filtered.length === 0 ? [] : [{ ...e, rules: filtered }];
}
//@ chunk-sfy7bm1n.js:3000-3053 placement
function Mar(e, r) {
  if (!D()) return e;
  return filterRestrictedAllowUpdates(e, matchesRestrictedWebRule, r);
}
/**
 * 过滤权限更新：丢弃格式不合法的更新，应用规则载荷转换，并从 allow 规则中去掉受限工具；无变化时返回原数组。
 */
//@ chunk-sfy7bm1n.js:3053-3387 placement
function filterRestrictedAllowUpdates(e, r, o) {
  let n = !1,
    flattened = e.flatMap((l) => {
      if (isMalformedRuleUpdate(l)) return ((n = !0), []);
      let m = applyPermissionRulePayload(l, r, o);
      if (m !== void 0) return ((n = !0), m);
      if ((l.type !== "addRules" && l.type !== "replaceRules") || l.behavior !== "allow") return [l];
      let filtered = l.rules.filter((rule) => !r(rule.toolName));
      if (filtered.length === l.rules.length) return [l];
      return ((n = !0), filtered.length === 0 ? [] : [{ ...l, rules: filtered }]);
    });
  return n ? flattened : e;
}
/**
 * 为 WebSearch 建议整工具规则，为 WebFetch 建议 domain:主机名 规则（URL 无效或含 * 时不建议）。
 */
//@ chunk-sfy7bm1n.js:3387-3657 placement
function suggestWebToolRule(e, r) {
  let o = getToolNameForPermissionCheck_2(e);
  if (o === WEBSEARCH) return { toolName: o };
  let n = typeof r === "object" && r !== null && "url" in r ? r.url : void 0;
  if (o !== WEBFETCH || typeof n !== "string") return;
  try {
    let hostname = new URL(n).hostname;
    return hostname.includes("*") ? void 0 : { toolName: o, ruleContent: `domain:${hostname}` };
  } catch {
    return;
  }
}
//@ chunk-sfy7bm1n.js:3657-4204 placement
function normalizePermissionUpdate(e, r, o) {
  if (!D()) return e;
  let n = !1,
    flattened = e.flatMap((l) => {
      if (isMalformedRuleUpdate(l)) return ((n = !0), []);
      let m = applyPermissionRulePayload(l, matchesRestrictedWebRule, o);
      if (m !== void 0) return ((n = !0), m);
      if ((l.type !== "addRules" && l.type !== "replaceRules") || l.behavior !== "allow") return [l];
      let filtered = l.rules.filter((rule) => matchesRestrictedWebRule(rule.toolName));
      if (filtered.length === 0) return [l];
      n = !0;
      let filtered_2 = l.rules.filter((rule) => !matchesRestrictedWebRule(rule.toolName)),
        f =
          l.type === "addRules" && r !== void 0
            ? filtered.filter(
                (c) => canonicalToolName(c.toolName) === r.toolName && c.ruleContent === r.ruleContent,
              )
            : [];
      return [
        ...(filtered_2.length > 0 ? [{ ...l, rules: filtered_2 }] : []),
        ...(f.length > 0 ? [{ ...l, destination: "session", rules: f }] : []),
      ];
    });
  return n ? flattened : e;
}
//@ chunk-sfy7bm1n.js:4204-4231 placement
var TENGU_STEADY_FINCH = "tengu_steady_finch";
//@ chunk-sfy7bm1n.js:4231-4296 placement
function B2() {
  return iXr() || kAi()?.convertedSkillsAsPlugins === !0;
}
//@ chunk-sfy7bm1n.js:4296-4331 placement
function iXr() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STEADY_FINCH, !1) === !0;
}
//@ chunk-sfy7bm1n.js:4331-4386 placement
function i3(e) {
  return e !== void 0 && marketplaceSuffix(normalizePluginId(e)) === SYNCED && B2();
}
//@ chunk-sfy7bm1n.js:4386-4431 placement
function Dar(e) {
  return isTopHostSession() || (!e && B2() && !isCcsTenant());
}
//@ chunk-sfy7bm1n.js:4431-4464 placement
function Lar() {
  return isTopHostSession() && B2();
}

export {
  isWebToolRestrictedInRelay,
  M,
  Dar,
  normalizePermissionUpdate,
  i3,
  B2,
  getServerUrl,
  Mar,
  suggestWebToolRule,
  iXr,
  filterRestrictedAllowUpdates,
  Lar,
};

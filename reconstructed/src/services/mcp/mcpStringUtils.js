/**
 * services/mcp/mcpStringUtils.ts
 *
 * 并入已有模块：从 MCP 配置的 tools 字段收集 allow/deny/ask 规则；替换或追加权限上下文中的 mcpServerPolicy等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/mcpStringUtils.ts
 * pieces: chunk-6mwt0myy.js (15), chunk-e6aww6q8.js (1), chunk-gz7b768t.js (3)
 * attribution: fingerprint 3, callgraph-witnessed 1, shared-adjacent 1, placement 9, layout 1, callgraph-fingerprint 1, affinity 1, facade-majority 2
 */
import { normalizeNameForMCP } from "./normalization.js";
import { parseToolPolicyEntry, isServerIdentityActive, qao } from "./serverIdentity.js";
import { uniq } from "../../utils/collections.js";
import { REMOTE_BROWSER_SERVER_NAME } from "./remoteBrowserServer.js";
import { isAutoModeCircuitBroken } from "../../utils/permissions/autoModeState.js";
import { isCoworkAny } from "../../utils/entrypointKinds.js";
import { isRemoteBrowserScoped } from "./builtinServerNames.js";
import { getMcpClientsFromAccessor } from "../../bootstrap/state.js";
import { isRemoteBrowserClassifierEnabled } from "../../utils/permissions/classifierMcpContext.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";

//@ chunk-6mwt0myy.js:18150-18165 fingerprint = getMcpPrefix (1)
var MCP_TOOL_PREFIX = "mcp__";
/**
 * mcpInfoFromString：把 mcp__server__tool 拆成 {serverName, toolName}（工具名可含 __），不是 mcp 前缀返回 null。
 */
//@ chunk-6mwt0myy.js:18165-18311 fingerprint = mcpInfoFromString (1)
function mcpInfoFromString(toolString) {
  let parts = toolString.split("__"),
    [r, t, ...s] = parts;
  if (r !== "mcp" || !t) return null;
  let toolName = s.length > 0 ? s.join("__") : void 0;
  return { serverName: t, toolName: toolName };
}
/**
 * getMcpPrefix：mcp__<规范化服务器名>__。
 */
//@ chunk-6mwt0myy.js:18311-18350 callgraph-witnessed = buildMcpToolName (0)
function getMcpPrefix(e) {
  return `${MCP_TOOL_PREFIX}${normalizeNameForMCP(e)}__`;
}
/**
 * isToolFromMcpServer：工具 mcpInfo.serverName 等于给定名，或名字以该服务器前缀开头。
 */
//@ chunk-6mwt0myy.js:18350-18470 shared-adjacent = getToolNameForPermissionCheck (1)
function isToolFromMcpServer(e, n, r) {
  if (e.mcpInfo?.serverName !== void 0) return e.mcpInfo.serverName === n;
  return e.name.startsWith(r ?? getMcpPrefix(n));
}
//@ chunk-6mwt0myy.js:18527-18630 placement
function matchesListedOrParsedServer(e, { listedServer: listedServer, parsedServer: parsedServer }) {
  if (listedServer !== void 0) return e === listedServer;
  return parsedServer !== void 0 && isSameMcpServerName(parsedServer, e);
}
/**
 * 拼接 mcp__服务器__工具 名。
 */
//@ chunk-6mwt0myy.js:18630-18672 placement
function buildMcpToolName(e, n) {
  return `${getMcpPrefix(e)}${normalizeNameForMCP(n)}`;
}
//@ chunk-6mwt0myy.js:18672-18722 placement
var PERMISSION_POLICY_RANK = { always_allow: 0, always_ask: 1, always_deny: 2 };
/**
 * 从 MCP 配置的 tools 字段收集 allow/deny/ask 规则。
 */
//@ chunk-6mwt0myy.js:18722-19287 placement
function collectServerToolPolicies(...e) {
  let n = new Map();
  for (let i of e)
    for (let [o, a] of Object.entries(i)) {
      let d = a.type === "sdk";
      if (!d && a.type !== "http" && a.type !== "sse") continue;
      let tools = a.tools;
      if (!Array.isArray(tools)) continue;
      for (let f of tools) {
        let l = parseToolPolicyEntry(f);
        if (l === void 0) continue;
        let permission_policy = l.policy.permission_policy;
        if (permission_policy === void 0 || (d ? permission_policy === "always_allow" : l.rewritten))
          continue;
        let m = PERMISSION_POLICY_RANK[permission_policy],
          K = buildMcpToolName(o, l.policy.name),
          h = n.get(K);
        if (h === void 0 || m > PERMISSION_POLICY_RANK[h]) n.set(K, permission_policy);
      }
    }
  let r = [],
    t = [],
    s = [];
  for (let [i, o] of n)
    if (o === "always_allow") r.push(i);
    else if (o === "always_deny") t.push(i);
    else s.push(i);
  return { allow: r, deny: t, ask: s };
}
/**
 * 把动态 MCP 服务器的工具策略合并进权限上下文。
 */
//@ chunk-6mwt0myy.js:19287-19719 placement
function applyDynamicServerToolPolicies(e, n) {
  let fromEntries = Object.fromEntries(
      Object.entries(n).filter(([, o]) => o.scope === "dynamic" && o.type !== "sdk"),
    ),
    { allow: allow, deny: deny, ask: ask } = collectServerToolPolicies(fromEntries);
  if (allow.length === 0 && deny.length === 0 && ask.length === 0) return e;
  return {
    ...e,
    alwaysAllowRules: { ...e.alwaysAllowRules, ...(allow.length > 0 && { mcpServerPolicy: allow }) },
    alwaysDenyRules: { ...e.alwaysDenyRules, ...(deny.length > 0 && { mcpServerPolicy: deny }) },
    alwaysAskRules: { ...e.alwaysAskRules, ...(ask.length > 0 && { mcpServerPolicy: ask }) },
  };
}
/**
 * 替换或追加权限上下文中的 mcpServerPolicy。
 */
//@ chunk-6mwt0myy.js:19719-20222 placement
function mergeMcpServerPolicyRules(e, n, r) {
  let t = (a, d) => {
      let c = a.mcpServerPolicy ?? [],
        f = r === "replace" ? d : [...c, ...d.filter((l) => !c.includes(l))];
      if (f.length === c.length && f.every((l, u) => l === c[u])) return a;
      if (f.length === 0) {
        let { mcpServerPolicy: mcpServerPolicy, ...u } = a;
        return u;
      }
      return { ...a, mcpServerPolicy: f };
    },
    s = t(e.alwaysAllowRules, n.allow),
    i = t(e.alwaysDenyRules, n.deny),
    o = t(e.alwaysAskRules, n.ask);
  if (s === e.alwaysAllowRules && i === e.alwaysDenyRules && o === e.alwaysAskRules) return e;
  return { ...e, alwaysAllowRules: s, alwaysDenyRules: i, alwaysAskRules: o };
}
/**
 * 工具的完整名（MCP 工具带前缀）。
 */
//@ chunk-6mwt0myy.js:20222-20305 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(tool) {
  return tool.mcpInfo ? buildMcpToolName(tool.mcpInfo.serverName, tool.mcpInfo.toolName) : tool.name;
}
/**
 * getMcpToolAliasNames：工具在标准键/拒绝键等别名服务器名下的完整名字，用于规则匹配。
 */
//@ chunk-6mwt0myy.js:20305-20569 placement
function getMcpToolAliasNames(e) {
  if (!e.mcpInfo || !isServerIdentityActive()) return [];
  let n = getToolNameForPermissionCheck(e),
    r = qao(n),
    t = `${MCP_TOOL_PREFIX}${normalizeNameForMCP(e.mcpInfo.serverName)}__`,
    sliced = n.slice(t.length),
    flattened = [e.mcpInfo.standardKey?.key, e.mcpInfo.denyKey].flatMap((o) =>
      o === void 0 ? [] : [`${MCP_TOOL_PREFIX}${o}__${sliced}`],
    );
  return uniq([...r, ...flattened]).filter((o) => o !== n);
}
/**
 * getMcpDisplayName：去掉 mcp__server__ 前缀得到工具显示名。
 */
//@ chunk-6mwt0myy.js:20569-20634 layout = getMcpPrefix (1)
function getMcpDisplayName(e, n) {
  let r = `mcp__${normalizeNameForMCP(n)}__`;
  return e.replace(r, "");
}
/**
 * extractMcpToolDisplayName：从 "server - Tool (MCP)" 形式的用户可见名取出工具部分。
 */
//@ chunk-6mwt0myy.js:20634-20771 fingerprint = extractMcpToolDisplayName (1)
function extractMcpToolDisplayName(userFacingName) {
  let withoutSuffix = userFacingName.replace(/\s*\(MCP\)\s*$/, "");
  withoutSuffix = withoutSuffix.trim();
  let dashIndex = withoutSuffix.indexOf(" - ");
  if (dashIndex !== -1) return withoutSuffix.substring(dashIndex + 3).trim();
  return withoutSuffix;
}
/**
 * isSameMcpServerName：plugin: 名精确比较，其他比较规范化名。
 */
//@ chunk-6mwt0myy.js:21056-21160 placement = addPluginScopeToLspServers (0.709)
function isSameMcpServerName(servers, pluginName) {
  if (servers.startsWith("plugin:") || pluginName.startsWith("plugin:")) return servers === pluginName;
  return normalizeNameForMCP(servers) === normalizeNameForMCP(pluginName);
}
//@ chunk-gz7b768t.js:5309-5540 affinity
var BROWSER_READ_TOOL_ARGS = new Map([
  ["browser_take_screenshot", new Set(["type", "fullPage", "scale", "region"])],
  ["browser_snapshot", new Set(["ref", "depth", "filter", "find", "max_chars", "offset"])],
  ["browser_wait_for", new Set(["time", "text", "textGone"])],
]);
/**
 * （归属疑误：权限/auto 模式）remote-browser 截图类工具在 auto 模式下可由分类器自动批准的判定。
 */
//@ chunk-gz7b768t.js:5540-5877 facade-majority
function isRemoteBrowserReadWithoutClassifier(e, t, o, r) {
  let mcpInfo = e.mcpInfo;
  if (mcpInfo?.serverName !== REMOTE_BROWSER_SERVER_NAME || mcpInfo.scope !== "dynamic") return !1;
  let a = BROWSER_READ_TOOL_ARGS.get(mcpInfo.toolName);
  if (
    a === void 0 ||
    typeof t !== "object" ||
    t === null ||
    Array.isArray(t) ||
    !Object.keys(t).every((l) => a.has(l))
  )
    return !1;
  return (
    o.mode === "auto" &&
    r === "auto" &&
    o.canAutoClassifierRun === !0 &&
    o.servedCall !== !0 &&
    !isAutoModeCircuitBroken() &&
    isCoworkAny() &&
    isRemoteBrowserScoped(getMcpClientsFromAccessor()) &&
    isRemoteBrowserClassifierEnabled()
  );
}
/**
 * （归属疑误：权限）remote-browser 工具只能由模型调用的拒绝消息。
 */
//@ chunk-gz7b768t.js:6058-6271 facade-majority
var REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED =
  "Tools of MCP server 'remote-browser' (the cloud browser) can only be called by the model in this session, where each call gets auto mode's safety check or a person's approval; this call would skip both.";
/**
 * resolveMcpConnectionForTool：按工具名找对应服务器连接；多个同规范化名的已连接服务器时返回 ambiguous。
 */
//@ chunk-e6aww6q8.js:993330-993627 callgraph-fingerprint = getMcpDisplayName (0.535)
function resolveMcpConnectionForTool(fullName, serverName) {
  if (!fullName.startsWith("mcp__")) return { connection: void 0, ambiguous: !1 };
  let r = mcpInfoFromString(fullName);
  if (!r) return { connection: void 0, ambiguous: !1 };
  let filtered = serverName.filter((y) => normalizeNameForMCP(y.name) === r.serverName),
    filtered_2 = filtered.filter(isConnectedOrCached);
  if (filtered_2.length > 1) return { connection: void 0, ambiguous: !0 };
  return { connection: filtered_2[0] ?? filtered[0], ambiguous: !1 };
}

export {
  mcpInfoFromString,
  getToolNameForPermissionCheck,
  isRemoteBrowserReadWithoutClassifier,
  buildMcpToolName,
  MCP_TOOL_PREFIX,
  getMcpToolAliasNames,
  getMcpPrefix,
  isToolFromMcpServer,
  matchesListedOrParsedServer,
  collectServerToolPolicies,
  mergeMcpServerPolicyRules,
  applyDynamicServerToolPolicies,
  isSameMcpServerName,
  resolveMcpConnectionForTool,
  REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED,
  getMcpDisplayName,
  extractMcpToolDisplayName,
};

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
import { parseToolPolicyEntry, isServerIdentityActive, denyOrAskNamesFor } from "./serverIdentity.js";
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
//@ chunk-6mwt0myy.js:18165-18311 fingerprint = mcpInfoFromString (1)
/**
 * mcpInfoFromString：把 mcp__server__tool 拆成 {serverName, toolName}（工具名可含 __），不是 mcp 前缀返回 null。
 */
function mcpInfoFromString(toolString) {
  let parts = toolString.split("__");
  let [mcpPart, serverName, ...toolNameParts] = parts;
  if (mcpPart !== "mcp" || !serverName) return null;
  let toolName = toolNameParts.length > 0 ? toolNameParts.join("__") : undefined;
  return {
    serverName,
    toolName,
  };
}
//@ chunk-6mwt0myy.js:18311-18350 callgraph-witnessed = buildMcpToolName (0)
/**
 * getMcpPrefix：mcp__<规范化服务器名>__。
 */
function getMcpPrefix(e) {
  return `${MCP_TOOL_PREFIX}${normalizeNameForMCP(e)}__`;
}
//@ chunk-6mwt0myy.js:18350-18470 shared-adjacent = getToolNameForPermissionCheck (1)
/**
 * isToolFromMcpServer：工具 mcpInfo.serverName 等于给定名，或名字以该服务器前缀开头。
 */
function isToolFromMcpServer(tool, n, mcpPrefix) {
  if (tool.mcpInfo?.serverName !== undefined) return tool.mcpInfo.serverName === n;
  return tool.name.startsWith(mcpPrefix ?? getMcpPrefix(n));
}
//@ chunk-6mwt0myy.js:18527-18630 placement
function matchesListedOrParsedServer(name, { listedServer, parsedServer }) {
  if (listedServer !== undefined) return name === listedServer;
  return parsedServer !== undefined && isSameMcpServerName(parsedServer, name);
}
//@ chunk-6mwt0myy.js:18630-18672 placement
/**
 * 拼接 mcp__服务器__工具 名。
 */
function buildMcpToolName(e, n) {
  return `${getMcpPrefix(e)}${normalizeNameForMCP(n)}`;
}
//@ chunk-6mwt0myy.js:18672-18722 placement
var PERMISSION_POLICY_RANK = {
  always_allow: 0,
  always_ask: 1,
  always_deny: 2,
};
//@ chunk-6mwt0myy.js:18722-19287 placement
/**
 * 从 MCP 配置的 tools 字段收集 allow/deny/ask 规则。
 */
function collectServerToolPolicies(...e) {
  let n = new Map();
  for (let i of e)
    for (let [key, value] of Object.entries(i)) {
      let d = value.type === "sdk";
      if (!d && value.type !== "http" && value.type !== "sse") continue;
      let tools = value.tools;
      if (!Array.isArray(tools)) continue;
      for (let tool of tools) {
        let toolPolicyEntry = parseToolPolicyEntry(tool);
        if (toolPolicyEntry === undefined) continue;
        let permissionPolicy = toolPolicyEntry.policy.permission_policy;
        if (
          permissionPolicy === undefined ||
          (d ? permissionPolicy === "always_allow" : toolPolicyEntry.rewritten)
        )
          continue;
        let m = PERMISSION_POLICY_RANK[permissionPolicy];
        let mcpToolName = buildMcpToolName(key, toolPolicyEntry.policy.name);
        let h = n.get(mcpToolName);
        if (h === undefined || m > PERMISSION_POLICY_RANK[h]) n.set(mcpToolName, permissionPolicy);
      }
    }
  let r = [];
  let t = [];
  let s = [];
  for (let [i, o] of n)
    if (o === "always_allow") r.push(i);
    else if (o === "always_deny") t.push(i);
    else s.push(i);
  return {
    allow: r,
    deny: t,
    ask: s,
  };
}
//@ chunk-6mwt0myy.js:19287-19719 placement
/**
 * 把动态 MCP 服务器的工具策略合并进权限上下文。
 */
function applyDynamicServerToolPolicies(toolPermissionContext, configs) {
  let r = Object.fromEntries(
    Object.entries(configs).filter(([, value]) => value.scope === "dynamic" && value.type !== "sdk"),
  );
  let { allow, deny, ask } = collectServerToolPolicies(r);
  if (allow.length === 0 && deny.length === 0 && ask.length === 0) return toolPermissionContext;
  return {
    ...toolPermissionContext,
    alwaysAllowRules: {
      ...toolPermissionContext.alwaysAllowRules,
      ...(allow.length > 0 && {
        mcpServerPolicy: allow,
      }),
    },
    alwaysDenyRules: {
      ...toolPermissionContext.alwaysDenyRules,
      ...(deny.length > 0 && {
        mcpServerPolicy: deny,
      }),
    },
    alwaysAskRules: {
      ...toolPermissionContext.alwaysAskRules,
      ...(ask.length > 0 && {
        mcpServerPolicy: ask,
      }),
    },
  };
}
//@ chunk-6mwt0myy.js:19719-20222 placement
/**
 * 替换或追加权限上下文中的 mcpServerPolicy。
 */
function mergeMcpServerPolicyRules(toolPermissionContext, n, r) {
  let t = (a, d) => {
    let mcpServerPolicy = a.mcpServerPolicy ?? [];
    let f = r === "replace" ? d : [...mcpServerPolicy, ...d.filter((l) => !mcpServerPolicy.includes(l))];
    if (f.length === mcpServerPolicy.length && f.every((l, u) => l === mcpServerPolicy[u])) return a;
    if (f.length === 0) {
      let { mcpServerPolicy, ...u } = a;
      return u;
    }
    return {
      ...a,
      mcpServerPolicy: f,
    };
  };
  let s = t(toolPermissionContext.alwaysAllowRules, n.allow);
  let i = t(toolPermissionContext.alwaysDenyRules, n.deny);
  let o = t(toolPermissionContext.alwaysAskRules, n.ask);
  if (
    s === toolPermissionContext.alwaysAllowRules &&
    i === toolPermissionContext.alwaysDenyRules &&
    o === toolPermissionContext.alwaysAskRules
  )
    return toolPermissionContext;
  return {
    ...toolPermissionContext,
    alwaysAllowRules: s,
    alwaysDenyRules: i,
    alwaysAskRules: o,
  };
}
//@ chunk-6mwt0myy.js:20222-20305 placement = getToolNameForPermissionCheck (1)
/**
 * 工具的完整名（MCP 工具带前缀）。
 */
function getToolNameForPermissionCheck(tool) {
  return tool.mcpInfo ? buildMcpToolName(tool.mcpInfo.serverName, tool.mcpInfo.toolName) : tool.name;
}
//@ chunk-6mwt0myy.js:20305-20569 placement
/**
 * getMcpToolAliasNames：工具在标准键/拒绝键等别名服务器名下的完整名字，用于规则匹配。
 */
function getMcpToolAliasNames(e) {
  if (!e.mcpInfo || !isServerIdentityActive()) return [];
  let toolNameForPermissionCheck = getToolNameForPermissionCheck(e);
  let r = denyOrAskNamesFor(toolNameForPermissionCheck);
  let t = `${MCP_TOOL_PREFIX}${normalizeNameForMCP(e.mcpInfo.serverName)}__`;
  let sliced = toolNameForPermissionCheck.slice(t.length);
  let flattened = [e.mcpInfo.standardKey?.key, e.mcpInfo.denyKey].flatMap((o) =>
    o === undefined ? [] : [`${MCP_TOOL_PREFIX}${o}__${sliced}`],
  );
  return uniq([...r, ...flattened]).filter((o) => o !== toolNameForPermissionCheck);
}
//@ chunk-6mwt0myy.js:20569-20634 layout = getMcpPrefix (1)
/**
 * getMcpDisplayName：去掉 mcp__server__ 前缀得到工具显示名。
 */
function getMcpDisplayName(fullName, serverName) {
  let prefix = `mcp__${normalizeNameForMCP(serverName)}__`;
  return fullName.replace(prefix, "");
}
//@ chunk-6mwt0myy.js:20634-20771 fingerprint = extractMcpToolDisplayName (1)
/**
 * extractMcpToolDisplayName：从 "server - Tool (MCP)" 形式的用户可见名取出工具部分。
 */
function extractMcpToolDisplayName(userFacingName) {
  let withoutSuffix = userFacingName.replace(/\s*\(MCP\)\s*$/, "");
  withoutSuffix = withoutSuffix.trim();
  let dashIndex = withoutSuffix.indexOf(" - ");
  if (dashIndex !== -1) return withoutSuffix.substring(dashIndex + 3).trim();
  return withoutSuffix;
}
//@ chunk-6mwt0myy.js:21056-21160 placement = addPluginScopeToLspServers (0.709)
/**
 * isSameMcpServerName：plugin: 名精确比较，其他比较规范化名。
 */
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
//@ chunk-gz7b768t.js:5540-5877 facade-majority
/**
 * （归属疑误：权限/auto 模式）remote-browser 截图类工具在 auto 模式下可由分类器自动批准的判定。
 */
function isRemoteBrowserReadWithoutClassifier(tool, t, toolPermissionContext, r) {
  let mcpInfo = tool.mcpInfo;
  if (mcpInfo?.serverName !== REMOTE_BROWSER_SERVER_NAME || mcpInfo.scope !== "dynamic") return false;
  let a = BROWSER_READ_TOOL_ARGS.get(mcpInfo.toolName);
  if (
    a === undefined ||
    typeof t !== "object" ||
    t === null ||
    Array.isArray(t) ||
    !Object.keys(t).every((key) => a.has(key))
  )
    return false;
  return (
    toolPermissionContext.mode === "auto" &&
    r === "auto" &&
    toolPermissionContext.canAutoClassifierRun === true &&
    toolPermissionContext.servedCall !== true &&
    !isAutoModeCircuitBroken() &&
    isCoworkAny() &&
    isRemoteBrowserScoped(getMcpClientsFromAccessor()) &&
    isRemoteBrowserClassifierEnabled()
  );
}
//@ chunk-gz7b768t.js:6058-6271 facade-majority
/**
 * （归属疑误：权限）remote-browser 工具只能由模型调用的拒绝消息。
 */
var REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED =
  "Tools of MCP server 'remote-browser' (the cloud browser) can only be called by the model in this session, where each call gets auto mode's safety check or a person's approval; this call would skip both.";
//@ chunk-e6aww6q8.js:993330-993627 callgraph-fingerprint = getMcpDisplayName (0.535)
/**
 * resolveMcpConnectionForTool：按工具名找对应服务器连接；多个同规范化名的已连接服务器时返回 ambiguous。
 */
function resolveMcpConnectionForTool(fullName, serverName) {
  if (!fullName.startsWith("mcp__"))
    return {
      connection: undefined,
      ambiguous: false,
    };
  let r = mcpInfoFromString(fullName);
  if (!r)
    return {
      connection: undefined,
      ambiguous: false,
    };
  let filtered = serverName.filter((y) => normalizeNameForMCP(y.name) === r.serverName);
  let filtered_2 = filtered.filter(isConnectedOrCached);
  if (filtered_2.length > 1)
    return {
      connection: undefined,
      ambiguous: true,
    };
  return {
    connection: filtered_2[0] ?? filtered[0],
    ambiguous: false,
  };
}
export {
  getMcpPrefix,
  mcpInfoFromString,
  getToolNameForPermissionCheck,
  isRemoteBrowserReadWithoutClassifier,
  buildMcpToolName,
  MCP_TOOL_PREFIX,
  getMcpToolAliasNames,
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

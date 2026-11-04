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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6mwt0myy.js:18150-18165 fingerprint (2.1.88 match: getMcpPrefix, 1)
var MCP_TOOL_PREFIX = "mcp__";
//@ chunk-6mwt0myy.js:18165-18311 fingerprint (2.1.88 match: mcpInfoFromString, 1)
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
//@ chunk-6mwt0myy.js:18311-18350 callgraph-witnessed (2.1.88 match: buildMcpToolName, 0)
/**
 * getMcpPrefix：mcp__<规范化服务器名>__。
 */
function getMcpPrefix(serverName) {
  return `${MCP_TOOL_PREFIX}${normalizeNameForMCP(serverName)}__`;
}
//@ chunk-6mwt0myy.js:18350-18470 shared-adjacent (2.1.88 match: getToolNameForPermissionCheck, 1)
/**
 * isToolFromMcpServer：工具 mcpInfo.serverName 等于给定名，或名字以该服务器前缀开头。
 */
function isToolFromMcpServer(tool, serverName, toolPrefix) {
  if (tool.mcpInfo?.serverName !== undefined) return tool.mcpInfo.serverName === serverName;
  return tool.name.startsWith(toolPrefix ?? getMcpPrefix(serverName));
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
function buildMcpToolName(serverName, toolName) {
  return `${getMcpPrefix(serverName)}${normalizeNameForMCP(toolName)}`;
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
function collectServerToolPolicies(...configSets) {
  let policyByTool = new Map();
  for (let configs of configSets)
    for (let [key, value] of Object.entries(configs)) {
      let isSdk = value.type === "sdk";
      if (!isSdk && value.type !== "http" && value.type !== "sse") continue;
      let tools = value.tools;
      if (!Array.isArray(tools)) continue;
      for (let tool of tools) {
        let toolPolicyEntry = parseToolPolicyEntry(tool);
        if (toolPolicyEntry === undefined) continue;
        let permissionPolicy = toolPolicyEntry.policy.permission_policy;
        if (
          permissionPolicy === undefined ||
          (isSdk ? permissionPolicy === "always_allow" : toolPolicyEntry.rewritten)
        )
          continue;
        let rank = PERMISSION_POLICY_RANK[permissionPolicy];
        let mcpToolName = buildMcpToolName(key, toolPolicyEntry.policy.name);
        let existing = policyByTool.get(mcpToolName);
        if (existing === undefined || rank > PERMISSION_POLICY_RANK[existing])
          policyByTool.set(mcpToolName, permissionPolicy);
      }
    }
  let allow = [];
  let deny = [];
  let ask = [];
  for (let [toolName, policy] of policyByTool)
    if (policy === "always_allow") allow.push(toolName);
    else if (policy === "always_deny") deny.push(toolName);
    else ask.push(toolName);
  return {
    allow,
    deny,
    ask,
  };
}
//@ chunk-6mwt0myy.js:19287-19719 placement
/**
 * 把动态 MCP 服务器的工具策略合并进权限上下文。
 */
function applyDynamicServerToolPolicies(toolPermissionContext, configs) {
  let dynamicConfigs = Object.fromEntries(
    Object.entries(configs).filter(([, value]) => value.scope === "dynamic" && value.type !== "sdk"),
  );
  let { allow, deny, ask } = collectServerToolPolicies(dynamicConfigs);
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
function mergeMcpServerPolicyRules(toolPermissionContext, policies, mode) {
  let mergeInto = (ruleset, names) => {
    let mcpServerPolicy = ruleset.mcpServerPolicy ?? [];
    let merged =
      mode === "replace"
        ? names
        : [...mcpServerPolicy, ...names.filter((name) => !mcpServerPolicy.includes(name))];
    if (
      merged.length === mcpServerPolicy.length &&
      merged.every((name, index) => name === mcpServerPolicy[index])
    )
      return ruleset;
    if (merged.length === 0) {
      let { mcpServerPolicy, ...rest } = ruleset;
      return rest;
    }
    return {
      ...ruleset,
      mcpServerPolicy: merged,
    };
  };
  let allowRules = mergeInto(toolPermissionContext.alwaysAllowRules, policies.allow);
  let denyRules = mergeInto(toolPermissionContext.alwaysDenyRules, policies.deny);
  let askRules = mergeInto(toolPermissionContext.alwaysAskRules, policies.ask);
  if (
    allowRules === toolPermissionContext.alwaysAllowRules &&
    denyRules === toolPermissionContext.alwaysDenyRules &&
    askRules === toolPermissionContext.alwaysAskRules
  )
    return toolPermissionContext;
  return {
    ...toolPermissionContext,
    alwaysAllowRules: allowRules,
    alwaysDenyRules: denyRules,
    alwaysAskRules: askRules,
  };
}
//@ chunk-6mwt0myy.js:20222-20305 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
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
function getMcpToolAliasNames(tool) {
  if (!tool.mcpInfo || !isServerIdentityActive()) return [];
  let toolName = getToolNameForPermissionCheck(tool);
  let ruleNames = denyOrAskNamesFor(toolName);
  let prefix = `${MCP_TOOL_PREFIX}${normalizeNameForMCP(tool.mcpInfo.serverName)}__`;
  let sliced = toolName.slice(prefix.length);
  let flattened = [tool.mcpInfo.standardKey?.key, tool.mcpInfo.denyKey].flatMap((keyName) =>
    keyName === undefined ? [] : [`${MCP_TOOL_PREFIX}${keyName}__${sliced}`],
  );
  return uniq([...ruleNames, ...flattened]).filter((alias) => alias !== toolName);
}
//@ chunk-6mwt0myy.js:20569-20634 layout (2.1.88 match: getMcpPrefix, 1)
/**
 * getMcpDisplayName：去掉 mcp__server__ 前缀得到工具显示名。
 */
function getMcpDisplayName(fullName, serverName) {
  let prefix = `mcp__${normalizeNameForMCP(serverName)}__`;
  return fullName.replace(prefix, "");
}
//@ chunk-6mwt0myy.js:20634-20771 fingerprint (2.1.88 match: extractMcpToolDisplayName, 1)
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
//@ chunk-6mwt0myy.js:21056-21160 placement (2.1.88 match: addPluginScopeToLspServers, 0.709)
/**
 * isSameMcpServerName：plugin: 名精确比较，其他比较规范化名。
 */
function isSameMcpServerName(servers, pluginName) {
  if (servers.startsWith("plugin:") || pluginName.startsWith("plugin:")) return servers === pluginName;
  return normalizeNameForMCP(servers) === normalizeNameForMCP(pluginName);
}
//@ chunk-gz7b768t.js:5309-5540 affinity
var BROWSER_READ_TOOL_ARGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-gz7b768t.js:5309", () => {
  BROWSER_READ_TOOL_ARGS = new Map([
    ["browser_take_screenshot", new Set(["type", "fullPage", "scale", "region"])],
    ["browser_snapshot", new Set(["ref", "depth", "filter", "find", "max_chars", "offset"])],
    ["browser_wait_for", new Set(["time", "text", "textGone"])],
  ]);
});
//@ chunk-gz7b768t.js:5540-5877 facade-majority
/**
 * （归属疑误：权限/auto 模式）remote-browser 截图类工具在 auto 模式下可由分类器自动批准的判定。
 */
function isRemoteBrowserReadWithoutClassifier(tool, input, toolPermissionContext, classifierSource) {
  let mcpInfo = tool.mcpInfo;
  if (mcpInfo?.serverName !== REMOTE_BROWSER_SERVER_NAME || mcpInfo.scope !== "dynamic") return false;
  let allowedArgs = BROWSER_READ_TOOL_ARGS.get(mcpInfo.toolName);
  if (
    allowedArgs === undefined ||
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !Object.keys(input).every((key) => allowedArgs.has(key))
  )
    return false;
  return (
    toolPermissionContext.mode === "auto" &&
    classifierSource === "auto" &&
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
//@ chunk-e6aww6q8.js:993330-993627 callgraph-fingerprint (2.1.88 match: getMcpDisplayName, 0.535)
/**
 * resolveMcpConnectionForTool：按工具名找对应服务器连接；多个同规范化名的已连接服务器时返回 ambiguous。
 */
function resolveMcpConnectionForTool(fullName, serverName) {
  if (!fullName.startsWith("mcp__"))
    return {
      connection: undefined,
      ambiguous: false,
    };
  let mcpInfo = mcpInfoFromString(fullName);
  if (!mcpInfo)
    return {
      connection: undefined,
      ambiguous: false,
    };
  let filtered = serverName.filter((candidate) => normalizeNameForMCP(candidate.name) === mcpInfo.serverName);
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
  buildMcpToolName,
  MCP_TOOL_PREFIX,
  getToolNameForPermissionCheck,
  getMcpToolAliasNames,
  isRemoteBrowserReadWithoutClassifier,
  isToolFromMcpServer,
  collectServerToolPolicies,
  mergeMcpServerPolicyRules,
  matchesListedOrParsedServer,
  applyDynamicServerToolPolicies,
  isSameMcpServerName,
  resolveMcpConnectionForTool,
  REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED,
  getMcpDisplayName,
  extractMcpToolDisplayName,
};

/**
 * hooks/notifs/useMcpConnectivityStatus.tsx
 *
 * MCP 服务器连接失败/需要认证的通知（排除 IDE 与 claude.ai 代理）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useMcpConnectivityStatus.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-vxsfen55.js (5), chunk-wh5pkk8m.js (2)
 * attribution: fingerprint 2, placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isUnconfiguredFailure, isArtifacts404Failure } from "../../services/mcp/redactMcpErrors.js";
import {
  getMcpServerSignature,
  isMcpServerDisabled,
  isMcpServerAllowedByPolicy,
  emptyServerMap,
} from "../../services/mcp/config.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isPluginServerConfig } from "../../services/mcp/types.js";

//@ chunk-5xgkngpb.js:3669887-3670092 fingerprint (2.1.88 match: _temp, 0.918)
/**
 * 判断 MCP 服务器是否应出现在连接状态提示中：排除隐藏与 IDE 服务器，claude.ai 连接器按资格与回调判断。
 */
function isNoticeableMcpServer(client, isEligible, isHidden) {
  if (isUnconfiguredFailure(client) || isArtifacts404Failure(client)) return false;
  if (client.config.type === "claudeai-proxy") {
    if (client.config.eligible === false && !isHidden(client.name)) return false;
    return isEligible(client.name);
  }
  return client.config.type !== "sse-ide" && client.config.type !== "ws-ide";
}
//@ chunk-wh5pkk8m.js:419-491 placement
/**
 * 函数 isMcpConnectivityIssue（failed（非认证类）或 needs-auth）；位于「MCP 服务器连接失败/需要认证的通知（排除 IDE 与 claude.ai 代理）」模块。
 */
function isMcpConnectivityIssue(client) {
  return (client.type === "failed" && !isUnconfiguredFailure(client)) || client.type === "needs-auth";
}
//@ chunk-wh5pkk8m.js:491-535 placement
function isUnhiddenFailedServer(client, isHidden) {
  return isMcpConnectivityIssue(client) && !isHidden(client.name);
}
//@ chunk-vxsfen55.js:8884-9041 placement
function serverSignature(config) {
  try {
    return getMcpServerSignature(config, {
      includeEnv: false,
    });
  } catch (error) {
    logForDebugging(
      `[MCP] a server's URL or command could not be read, so it is not compared: ${errorMessage(error)}`,
    );
    return null;
  }
}
//@ chunk-vxsfen55.js:9041-9195 placement
function isUsable(status) {
  switch (status.type) {
    case "disabled":
      return false;
    case "connected":
    case "failed":
    case "needs-auth":
    case "pending":
    case "cached":
      return true;
    default:
      return status;
  }
}
//@ chunk-vxsfen55.js:9195-9380 placement
function healthOf(status) {
  switch (status.type) {
    case "connected":
      return "working";
    case "cached":
    case "pending":
      return "mayWork";
    case "disabled":
    case "failed":
    case "needs-auth":
      return "unusable";
    default:
      return status;
  }
}
//@ chunk-vxsfen55.js:9380-9883 placement
/**
 * 对齐上一轮的 MCP 连接配置：保留仍可用、未被替换且地址未变的服务器。
 */
function filterDuplicateServers(candidates, knownServers, connectedNames) {
  let byName = new Map();
  let pluginSignatures = new Set();
  let connectedSignatures = new Set();
  for (let entry of knownServers) {
    if (!byName.has(entry.name)) byName.set(entry.name, entry);
    if (!isPluginServerConfig(entry.config)) continue;
    let signature = serverSignature(entry.config);
    if (signature === null) continue;
    if (!connectedNames.has(entry.name)) {
      if (
        isUsable(entry) &&
        !isMcpServerDisabled(entry.name) &&
        isMcpServerAllowedByPolicy(entry.name, entry.config)
      )
        pluginSignatures.add(signature);
    } else if (entry.type === "connected") connectedSignatures.add(signature);
  }
  let kept = emptyServerMap();
  for (let [key, value] of Object.entries(candidates)) {
    let known = byName.get(key);
    let signature = serverSignature(value);
    if (
      known === undefined ||
      signature === null ||
      isPluginServerConfig(value) ||
      isMcpServerDisabled(key) ||
      !isMcpServerAllowedByPolicy(key, value) ||
      pluginSignatures.has(signature) ||
      serverSignature(known.config) !== signature
    )
      continue;
    let health = healthOf(known);
    if (health === "working" || (health === "mayWork" && !connectedSignatures.has(signature)))
      kept[key] = value;
  }
  return kept;
}
//@ chunk-vxsfen55.js:9883-10157 fingerprint (2.1.88 match: _temp4, 0.679)
function serversNeedingNotReconnect(clientsById, policies, statuses) {
  let result = new Map();
  for (let [clientId, { host, config }] of clientsById) {
    let found = statuses.find((status) => status.name === host);
    let policy = Object.hasOwn(policies, host) ? policies[host] : undefined;
    if (isMcpServerDisabled(host) || (policy !== undefined && !isMcpServerAllowedByPolicy(host, policy)))
      continue;
    if (
      policy === undefined ||
      found === undefined ||
      serverSignature(policy) !== serverSignature(config) ||
      found.type === "failed" ||
      found.type === "needs-auth"
    )
      result.set(clientId, config);
  }
  return result;
}
export {
  serverSignature,
  filterDuplicateServers,
  serversNeedingNotReconnect,
  isUnhiddenFailedServer,
  isNoticeableMcpServer,
  isMcpConnectivityIssue,
};

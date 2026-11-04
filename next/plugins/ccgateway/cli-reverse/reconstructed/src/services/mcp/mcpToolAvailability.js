/**
 * services/mcp/mcpToolAvailability.ts
 *
 * 2.1.316 新增：MCP 工具/服务器对模型的可用性判定（策略屏蔽、组织屏蔽、禁用、重连、需认证、撤回）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (8)
 * attribution: placement 8
 */
import { getDenyRuleIndex, isToolDeniedByIndex } from "../../utils/permissions/permissions.js";
import { mcpInfoFromString, getMcpPrefix } from "./mcpStringUtils.js";
import { aliasOfToolName } from "../tools/batchTools.js";
import {
  isToolDroppedByDenyRules,
  isToolOmittedByLaunchToolList,
} from "../../utils/permissions/filterToolsByDenyRules.js";
import { isBuiltInArtifactReplacedByMcp } from "../artifacts/artifactsMcpTools.js";
import { normalizeNameForMCP } from "./normalization.js";
import { normalizeMcpServerName, AUTHENTICATE, COMPLETE_AUTHENTICATION } from "../api/deferredToolsState.js";
import { isCliOwnedConfig } from "./cliOwnedClients.js";
import { isPolicyDisabledReason, isReservedAddressReason, isUnconfiguredFailure } from "./redactMcpErrors.js";
import { isEntryRowNotServed } from "./client.js";
import { isFoamySpringEnabled as isFoamySpringEnabled_2 } from "../analytics/growthbookGates.js";

//@ chunk-a76knw89.js:41458-41763 placement
function isPermanentUnavailability(availability) {
  switch (availability.kind) {
    case "policy_blocked":
    case "reserved_address":
    case "org_blocked":
    case "denied":
    case "disabled":
    case "switched_off":
    case "not_configured":
    case "replaced":
      return true;
    case "reconnecting":
    case "needs_auth":
    case "disconnected":
    case "auth_completed":
    case "not_offered":
    case "withdrawn":
      return false;
  }
}
//@ chunk-a76knw89.js:41763-41814 placement
/**
 * 判断错误是否为“永久不可用”（排除 replaced）。
 */
function isPermanentUnavailabilityFor(availability) {
  return isPermanentUnavailability(availability) && availability.kind !== "replaced";
}
//@ chunk-a76knw89.js:41814-42411 placement
/**
 * 判定一个工具名对应的 MCP 工具当前是否可用及原因。
 */
function describeToolAvailability(
  toolName,
  clients,
  toolPermissionContext,
  tool,
  denyIndex = getDenyRuleIndex(toolPermissionContext),
) {
  let mcpInfo = tool?.mcpInfo;
  if (mcpInfo === undefined && mcpInfoFromString(toolName) === null) {
    let syntheticTool = {
      ...tool,
      name: toolName,
      underlyingV1ToolName: aliasOfToolName(toolName),
      familyParentToolName: tool?.familyParentToolName,
    };
    if (
      isToolDroppedByDenyRules(toolPermissionContext, syntheticTool, denyIndex.rules, denyIndex.index) &&
      !isToolOmittedByLaunchToolList(toolPermissionContext, syntheticTool)
    )
      return {
        kind: "denied",
        serverName: undefined,
      };
    return isBuiltInArtifactReplacedByMcp(syntheticTool)
      ? {
          kind: "replaced",
        }
      : {
          kind: "withdrawn",
        };
  }
  let deniedByRules =
    mcpInfo === undefined
      ? isToolDeniedByIndex(toolPermissionContext, denyIndex.index, {
          name: toolName,
        })
      : isToolDroppedByDenyRules(
          toolPermissionContext,
          {
            name: toolName,
            mcpInfo,
          },
          denyIndex.rules,
          denyIndex.index,
        );
  let mapped = serverRowsForTool(toolName, clients, mcpInfo).map(({ row, upstream }) =>
    classifyMcpServerAvailability(row, upstream, deniedByRules),
  );
  let chosen =
    mapped.find(isPermanentUnavailability) ??
    mapped.find(
      (availability) => availability.kind === "not_offered" || availability.kind === "auth_completed",
    ) ??
    mapped[0];
  if (chosen) return chosen;
  return deniedByRules
    ? {
        kind: "denied",
        serverName: undefined,
      }
    : {
        kind: "not_configured",
      };
}
//@ chunk-a76knw89.js:42411-42512 placement
/**
 * 列出可能提供该工具、仍在连接中的 MCP 服务器名。
 */
function pendingServersForTool(toolName, clients) {
  return serverRowsForTool(toolName, clients, undefined)
    .filter(({ row }) => row.type === "pending")
    .map(({ row }) => row.name);
}
//@ chunk-a76knw89.js:42512-42879 placement
/**
 * 找出可能提供该工具名的 MCP 服务器行（按最长前缀匹配，或按给定的服务器与工具名）。
 */
function serverRowsForTool(toolName, clients, mcpInfo) {
  if (mcpInfo !== undefined) {
    let upstream = normalizeNameForMCP(mcpInfo.toolName);
    return clients
      .filter((client) => client.name === mcpInfo.serverName)
      .map((row) => ({
        row,
        upstream,
      }));
  }
  let filtered = clients
    .map((client) => ({
      row: client,
      prefix: getMcpPrefix(client.name),
    }))
    .filter(({ prefix }) => toolName.startsWith(prefix));
  let max = Math.max(0, ...filtered.map(({ prefix }) => prefix.length));
  return filtered
    .filter(({ prefix }) => prefix.length === max)
    .map(({ row, prefix }) => ({
      row,
      upstream: toolName.slice(prefix.length),
    }));
}
//@ chunk-a76knw89.js:42879-43637 placement
/**
 * 把 MCP 服务器状态归类为 denied/org_blocked/disabled/needs_auth/reconnecting 等。
 */
function classifyMcpServerAvailability(client, upstreamName, deniedByRules) {
  let serverName = normalizeMcpServerName(client.name);
  if (deniedByRules)
    return {
      kind: "denied",
      serverName,
    };
  if (isBlockedByToolPermissions(client, upstreamName))
    return {
      kind: "org_blocked",
      serverName,
      ...(isCliOwnedConfig(client.config) && {
        byClaudeCode: true,
      }),
    };
  switch (client.type) {
    case "pending":
      return {
        kind: "reconnecting",
        serverName,
      };
    case "needs-auth":
      return {
        kind: "needs_auth",
        serverName,
      };
    case "failed":
      if (isPolicyDisabledReason(client.error))
        return {
          kind: "policy_blocked",
          serverName,
        };
      if (isReservedAddressReason(client.error))
        return {
          kind: "reserved_address",
          serverName,
        };
      return isUnconfiguredFailure(client)
        ? {
            kind: "not_configured",
          }
        : {
            kind: "disconnected",
            serverName,
          };
    case "disabled":
      return {
        kind: client.config.type === "sdk" ? "switched_off" : "disabled",
        serverName,
      };
    case "connected":
    case "cached":
      if (isEntryRowNotServed(client))
        return {
          kind: "switched_off",
          serverName,
        };
      return upstreamName === AUTHENTICATE || upstreamName === COMPLETE_AUTHENTICATION
        ? {
            kind: "auth_completed",
            serverName,
          }
        : {
            kind: "not_offered",
            serverName,
          };
  }
}
//@ chunk-a76knw89.js:43637-43809 placement
function isBlockedByToolPermissions(client, upstreamName) {
  if (!("toolPermissions" in client.config)) return false;
  let toolPermissions = client.config.toolPermissions;
  if (!toolPermissions) return false;
  return Object.entries(toolPermissions).some(
    ([key, value]) => value === "blocked" && normalizeNameForMCP(key) === upstreamName,
  );
}
//@ chunk-a76knw89.js:43809-43836 placement
/**
 * 读 foamy spring 开关（用于工具可用性判断）。
 */
function isFoamySpringEnabled() {
  return isFoamySpringEnabled_2();
}
export {
  describeToolAvailability,
  isFoamySpringEnabled,
  isPermanentUnavailabilityFor,
  isPermanentUnavailability,
  pendingServersForTool,
};

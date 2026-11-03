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
function isPermanentUnavailability(e) {
  switch (e.kind) {
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
function isPermanentUnavailabilityFor(e) {
  return isPermanentUnavailability(e) && e.kind !== "replaced";
}
//@ chunk-a76knw89.js:41814-42411 placement
/**
 * 判定一个工具名对应的 MCP 工具当前是否可用及原因。
 */
function describeToolAvailability(e, n, o, r, c = getDenyRuleIndex(o)) {
  let mcpInfo = r?.mcpInfo;
  if (mcpInfo === undefined && mcpInfoFromString(e) === null) {
    let y = {
      ...r,
      name: e,
      underlyingV1ToolName: aliasOfToolName(e),
      familyParentToolName: r?.familyParentToolName,
    };
    if (isToolDroppedByDenyRules(o, y, c.rules, c.index) && !isToolOmittedByLaunchToolList(o, y))
      return {
        kind: "denied",
        serverName: undefined,
      };
    return isBuiltInArtifactReplacedByMcp(y)
      ? {
          kind: "replaced",
        }
      : {
          kind: "withdrawn",
        };
  }
  let u =
    mcpInfo === undefined
      ? isToolDeniedByIndex(o, c.index, {
          name: e,
        })
      : isToolDroppedByDenyRules(
          o,
          {
            name: e,
            mcpInfo,
          },
          c.rules,
          c.index,
        );
  let mapped = serverRowsForTool(e, n, mcpInfo).map(({ row, upstream }) =>
    classifyMcpServerAvailability(row, upstream, u),
  );
  let T =
    mapped.find(isPermanentUnavailability) ??
    mapped.find((y) => y.kind === "not_offered" || y.kind === "auth_completed") ??
    mapped[0];
  if (T) return T;
  return u
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
function pendingServersForTool(e, mcpClients) {
  return serverRowsForTool(e, mcpClients, undefined)
    .filter(({ row }) => row.type === "pending")
    .map(({ row }) => row.name);
}
//@ chunk-a76knw89.js:42512-42879 placement
/**
 * 找出可能提供该工具名的 MCP 服务器行（按最长前缀匹配，或按给定的服务器与工具名）。
 */
function serverRowsForTool(e, n, o) {
  if (o !== undefined) {
    let upstream = normalizeNameForMCP(o.toolName);
    return n
      .filter((u) => u.name === o.serverName)
      .map((row) => ({
        row,
        upstream,
      }));
  }
  let filtered = n
    .map((s) => ({
      row: s,
      prefix: getMcpPrefix(s.name),
    }))
    .filter(({ prefix }) => e.startsWith(prefix));
  let max = Math.max(0, ...filtered.map(({ prefix }) => prefix.length));
  return filtered
    .filter(({ prefix }) => prefix.length === max)
    .map(({ row, prefix }) => ({
      row,
      upstream: e.slice(prefix.length),
    }));
}
//@ chunk-a76knw89.js:42879-43637 placement
/**
 * 把 MCP 服务器状态归类为 denied/org_blocked/disabled/needs_auth/reconnecting 等。
 */
function classifyMcpServerAvailability(row, upstream, o) {
  let serverName = normalizeMcpServerName(row.name);
  if (o)
    return {
      kind: "denied",
      serverName,
    };
  if (isBlockedByToolPermissions(row, upstream))
    return {
      kind: "org_blocked",
      serverName,
      ...(isCliOwnedConfig(row.config) && {
        byClaudeCode: true,
      }),
    };
  switch (row.type) {
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
      if (isPolicyDisabledReason(row.error))
        return {
          kind: "policy_blocked",
          serverName,
        };
      if (isReservedAddressReason(row.error))
        return {
          kind: "reserved_address",
          serverName,
        };
      return isUnconfiguredFailure(row)
        ? {
            kind: "not_configured",
          }
        : {
            kind: "disconnected",
            serverName,
          };
    case "disabled":
      return {
        kind: row.config.type === "sdk" ? "switched_off" : "disabled",
        serverName,
      };
    case "connected":
    case "cached":
      if (isEntryRowNotServed(row))
        return {
          kind: "switched_off",
          serverName,
        };
      return upstream === AUTHENTICATE || upstream === COMPLETE_AUTHENTICATION
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
function isBlockedByToolPermissions(e, n) {
  if (!("toolPermissions" in e.config)) return false;
  let toolPermissions = e.config.toolPermissions;
  if (!toolPermissions) return false;
  return Object.entries(toolPermissions).some(
    ([key, value]) => value === "blocked" && normalizeNameForMCP(key) === n,
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

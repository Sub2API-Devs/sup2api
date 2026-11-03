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
import { Aqe } from "../tools/batchTools.js";
import {
  isToolDroppedByDenyRules,
  isToolOmittedByLaunchToolList,
} from "../../utils/permissions/filterToolsByDenyRules.js";
import { isBuiltInArtifactReplacedByMcp } from "../artifacts/artifactsMcpTools.js";
import { normalizeNameForMCP } from "./normalization.js";
import { normalizeMcpServerName, AUTHENTICATE, COMPLETE_AUTHENTICATION } from "../api/deferredToolsState.js";
import { Zl } from "./cliOwnedClients.js";
import { ybn, _bn, YM } from "./redactMcpErrors.js";
import { n4e } from "./client.js";
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";

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
      return !0;
    case "reconnecting":
    case "needs_auth":
    case "disconnected":
    case "auth_completed":
    case "not_offered":
    case "withdrawn":
      return !1;
  }
}
//@ chunk-a76knw89.js:41763-41814 placement
function qYr(e) {
  return isPermanentUnavailability(e) && e.kind !== "replaced";
}
/**
 * 判定一个工具名对应的 MCP 工具当前是否可用及原因。
 */
//@ chunk-a76knw89.js:41814-42411 placement
function describeToolAvailability(e, n, o, r, c = getDenyRuleIndex(o)) {
  let s = r?.mcpInfo;
  if (s === void 0 && mcpInfoFromString(e) === null) {
    let y = { ...r, name: e, underlyingV1ToolName: Aqe(e), familyParentToolName: r?.familyParentToolName };
    if (isToolDroppedByDenyRules(o, y, c.rules, c.index) && !isToolOmittedByLaunchToolList(o, y))
      return { kind: "denied", serverName: void 0 };
    return isBuiltInArtifactReplacedByMcp(y) ? { kind: "replaced" } : { kind: "withdrawn" };
  }
  let u =
      s === void 0
        ? isToolDeniedByIndex(o, c.index, { name: e })
        : isToolDroppedByDenyRules(o, { name: e, mcpInfo: s }, c.rules, c.index),
    mapped = serverRowsForTool(e, n, s).map(({ row: row, upstream: upstream }) =>
      classifyMcpServerAvailability(row, upstream, u),
    ),
    T =
      mapped.find(isPermanentUnavailability) ??
      mapped.find((y) => y.kind === "not_offered" || y.kind === "auth_completed") ??
      mapped[0];
  if (T) return T;
  return u ? { kind: "denied", serverName: void 0 } : { kind: "not_configured" };
}
/**
 * 列出可能提供该工具、仍在连接中的 MCP 服务器名。
 */
//@ chunk-a76knw89.js:42411-42512 placement
function pendingServersForTool(e, n) {
  return serverRowsForTool(e, n, void 0)
    .filter(({ row: row }) => row.type === "pending")
    .map(({ row: row }) => row.name);
}
/**
 * 找出可能提供该工具名的 MCP 服务器行（按最长前缀匹配，或按给定的服务器与工具名）。
 */
//@ chunk-a76knw89.js:42512-42879 placement
function serverRowsForTool(e, n, o) {
  if (o !== void 0) {
    let s = normalizeNameForMCP(o.toolName);
    return n.filter((u) => u.name === o.serverName).map((u) => ({ row: u, upstream: s }));
  }
  let filtered = n
      .map((s) => ({ row: s, prefix: getMcpPrefix(s.name) }))
      .filter(({ prefix: prefix }) => e.startsWith(prefix)),
    max = Math.max(0, ...filtered.map(({ prefix: prefix }) => prefix.length));
  return filtered
    .filter(({ prefix: prefix }) => prefix.length === max)
    .map(({ row: row, prefix: prefix }) => ({ row: row, upstream: e.slice(prefix.length) }));
}
/**
 * 把 MCP 服务器状态归类为 denied/org_blocked/disabled/needs_auth/reconnecting 等。
 */
//@ chunk-a76knw89.js:42879-43637 placement
function classifyMcpServerAvailability(e, n, o) {
  let r = normalizeMcpServerName(e.name);
  if (o) return { kind: "denied", serverName: r };
  if (isBlockedByToolPermissions(e, n))
    return { kind: "org_blocked", serverName: r, ...(Zl(e.config) && { byClaudeCode: !0 }) };
  switch (e.type) {
    case "pending":
      return { kind: "reconnecting", serverName: r };
    case "needs-auth":
      return { kind: "needs_auth", serverName: r };
    case "failed":
      if (ybn(e.error)) return { kind: "policy_blocked", serverName: r };
      if (_bn(e.error)) return { kind: "reserved_address", serverName: r };
      return YM(e) ? { kind: "not_configured" } : { kind: "disconnected", serverName: r };
    case "disabled":
      return { kind: e.config.type === "sdk" ? "switched_off" : "disabled", serverName: r };
    case "connected":
    case "cached":
      if (n4e(e)) return { kind: "switched_off", serverName: r };
      return n === AUTHENTICATE || n === COMPLETE_AUTHENTICATION
        ? { kind: "auth_completed", serverName: r }
        : { kind: "not_offered", serverName: r };
  }
}
//@ chunk-a76knw89.js:43637-43809 placement
function isBlockedByToolPermissions(e, n) {
  if (!("toolPermissions" in e.config)) return !1;
  let toolPermissions = e.config.toolPermissions;
  if (!toolPermissions) return !1;
  return Object.entries(toolPermissions).some(([r, c]) => c === "blocked" && normalizeNameForMCP(r) === n);
}
//@ chunk-a76knw89.js:43809-43836 placement
function MSe() {
  return isFoamySpringEnabled();
}

export { describeToolAvailability, MSe, qYr, isPermanentUnavailability, pendingServersForTool };

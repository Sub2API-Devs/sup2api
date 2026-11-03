/**
 * cli/print/mcpStatusMessages.ts
 *
 * 2.1.316 新增：MCP 服务器未启动/连接失败的说明与状态等待
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (11)
 * attribution: placement 11
 */
import { getMcpServerSignature, supportsEnvExpansion } from "../../services/mcp/config.js";
import {
  awaitMcpServerConnected,
  mcpConnectRefusal,
  mcpConnectOutcome,
} from "../../plugins/functionHooks/mcpApi.js";
import { isNonReservedStdioConfig } from "../../services/mcp/utils.js";
import { IGNORED_BY_ENTERPRISE_POLICY_TEXT } from "./mcpControlRequests.js";
import { MCP_STATUS_POLL_MS } from "./pollEvents.js";

//@ chunk-tyg7f3ek.js:566123-566294 placement
async function waitForMcpServerStatus(e, n, r) {
  let found = e.rows().find((S) => S.name === n);
  let h = found?.type === "failed" && e.isAdded(n);
  if (h) await e.apply(n, undefined);
  return found !== undefined && !h ? subscribeRows(e.rows, n) : mcpServerNotStarted(e, n, r);
}
//@ chunk-tyg7f3ek.js:566294-566510 placement
function resolveConnectorTwin(e, n, r) {
  if (!e.isListed || e.isTwin || !r.includes(e.name)) return e;
  let mcpServerSignature = getMcpServerSignature(e.config);
  let found = n.find((S) => S.name !== e.name && getMcpServerSignature(S.config) === mcpServerSignature);
  if (found === undefined) return duplicateConnectorRefusal(e.name);
  return {
    isListed: true,
    isTwin: true,
    name: found.name,
  };
}
//@ chunk-tyg7f3ek.js:566510-566563 placement
function subscribeRows(rows, n) {
  return awaitMcpServerConnected(
    {
      rows,
      subscribe: pollRowsInterval,
    },
    n,
  );
}
//@ chunk-tyg7f3ek.js:566563-566687 placement
function withKeyReplaced(e, n, r) {
  let s = Object.create(null);
  for (let [key, value] of Object.entries(n)) if (key !== e) s[key] = value;
  if (r !== undefined) s[e] = r;
  return s;
}
//@ chunk-tyg7f3ek.js:566687-566862 placement = toScopedConfig (0.78)
function toScopedConfig(e, n) {
  let r = Object.create(null);
  for (let s of e)
    if (s.config.scope === "dynamic" && (s.config.pluginSource === undefined || Object.hasOwn(n, s.name)))
      r[s.name] = s.config;
  return r;
}
//@ chunk-tyg7f3ek.js:566862-567205 placement
async function mcpServerNotStarted(e, n, r) {
  if (e.isParked() && isNonReservedStdioConfig(n, r))
    return mcpConnectRefusal(
      "failed",
      `The MCP server "${n}" did not start: this session is parked until a host claims it, and its stdio servers start at the claim.`,
    );
  let { scope, ...y } = r;
  return supportsEnvExpansion(y) && y.type !== "sdk"
    ? applyMcpServerAndDescribe(e, n, y)
    : mcpConnectRefusal("failed", `The MCP server "${n}" has a transport this session cannot connect.`);
}
//@ chunk-tyg7f3ek.js:567205-567438 placement
async function applyMcpServerAndDescribe(e, n, r) {
  let s = await e.apply(n, r);
  let y =
    s?.errors[n] === IGNORED_BY_ENTERPRISE_POLICY_TEXT
      ? mcpConnectRefusal("policy", `Your organization's MCP policy does not allow "${n}".`)
      : describeMcpConnectFailure(e, n, s?.errors[n]);
  if (!y.isConnected && y.refused !== "auth") await e.apply(n, undefined);
  return y;
}
//@ chunk-tyg7f3ek.js:567438-567593 placement
function describeMcpConnectFailure(e, n, r) {
  let found = e.rows().find((h) => h.name === n);
  return (
    (found && mcpConnectOutcome(found)) ??
    mcpConnectRefusal("failed", `The MCP server "${n}" did not connect: ${r ?? "no reason given"}.`)
  );
}
//@ chunk-tyg7f3ek.js:567593-567659 placement
function pollRowsInterval(e) {
  let interval = setInterval(e, MCP_STATUS_POLL_MS);
  return () => clearInterval(interval);
}
//@ chunk-tyg7f3ek.js:567659-567805 placement
function duplicateConnectorRefusal(name) {
  return {
    isListed: false,
    refused: "failed",
    message: `The MCP server "${name}" duplicates a claude.ai connector that is not in this session.`,
  };
}
//@ chunk-tyg7f3ek.js:567847-567863 placement
var SETTINGS_NESTING_LIMITS = 32;
var SETTINGS_STRING_MAX_CHARS = 40;
export {
  withKeyReplaced,
  resolveConnectorTwin,
  toScopedConfig,
  subscribeRows,
  waitForMcpServerStatus,
  SETTINGS_NESTING_LIMITS,
  SETTINGS_STRING_MAX_CHARS,
};

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
import { awaitMcpServerConnected, _fe, mcpConnectOutcome } from "../../plugins/functionHooks/mcpApi.js";
import { spt } from "../../services/mcp/utils.js";
import { zNn } from "./mcpControlRequests.js";
import { MCP_STATUS_POLL_MS } from "./pollEvents.js";

//@ chunk-tyg7f3ek.js:566123-566294 placement
async function waitForMcpServerStatus(e, n, r) {
  let found = e.rows().find((S) => S.name === n),
    h = found?.type === "failed" && e.isAdded(n);
  if (h) await e.apply(n, void 0);
  return found !== void 0 && !h ? subscribeRows(e.rows, n) : mcpServerNotStarted(e, n, r);
}
//@ chunk-tyg7f3ek.js:566294-566510 placement
function resolveConnectorTwin(e, n, r) {
  if (!e.isListed || e.isTwin || !r.includes(e.name)) return e;
  let h = getMcpServerSignature(e.config),
    found = n.find((S) => S.name !== e.name && getMcpServerSignature(S.config) === h);
  if (found === void 0) return duplicateConnectorRefusal(e.name);
  return { isListed: !0, isTwin: !0, name: found.name };
}
//@ chunk-tyg7f3ek.js:566510-566563 placement
function subscribeRows(e, n) {
  return awaitMcpServerConnected({ rows: e, subscribe: pollRowsInterval }, n);
}
//@ chunk-tyg7f3ek.js:566563-566687 placement
function withKeyReplaced(e, n, r) {
  let create = Object.create(null);
  for (let [h, y] of Object.entries(n)) if (h !== e) create[h] = y;
  if (r !== void 0) create[e] = r;
  return create;
}
//@ chunk-tyg7f3ek.js:566687-566862 placement = toScopedConfig (0.78)
function toScopedConfig(e, n) {
  let create = Object.create(null);
  for (let s of e)
    if (s.config.scope === "dynamic" && (s.config.pluginSource === void 0 || Object.hasOwn(n, s.name)))
      create[s.name] = s.config;
  return create;
}
//@ chunk-tyg7f3ek.js:566862-567205 placement
async function mcpServerNotStarted(e, n, r) {
  if (e.isParked() && spt(n, r))
    return _fe(
      "failed",
      `The MCP server "${n}" did not start: this session is parked until a host claims it, and its stdio servers start at the claim.`,
    );
  let { scope: scope, ...y } = r;
  return supportsEnvExpansion(y) && y.type !== "sdk"
    ? applyMcpServerAndDescribe(e, n, y)
    : _fe("failed", `The MCP server "${n}" has a transport this session cannot connect.`);
}
//@ chunk-tyg7f3ek.js:567205-567438 placement
async function applyMcpServerAndDescribe(e, n, r) {
  let s = await e.apply(n, r),
    y =
      s?.errors[n] === zNn
        ? _fe("policy", `Your organization's MCP policy does not allow "${n}".`)
        : describeMcpConnectFailure(e, n, s?.errors[n]);
  if (!y.isConnected && y.refused !== "auth") await e.apply(n, void 0);
  return y;
}
//@ chunk-tyg7f3ek.js:567438-567593 placement
function describeMcpConnectFailure(e, n, r) {
  let found = e.rows().find((h) => h.name === n);
  return (
    (found && mcpConnectOutcome(found)) ??
    _fe("failed", `The MCP server "${n}" did not connect: ${r ?? "no reason given"}.`)
  );
}
//@ chunk-tyg7f3ek.js:567593-567659 placement
function pollRowsInterval(e) {
  let n = setInterval(e, MCP_STATUS_POLL_MS);
  return () => clearInterval(n);
}
//@ chunk-tyg7f3ek.js:567659-567805 placement
function duplicateConnectorRefusal(e) {
  return {
    isListed: !1,
    refused: "failed",
    message: `The MCP server "${e}" duplicates a claude.ai connector that is not in this session.`,
  };
}
//@ chunk-tyg7f3ek.js:567847-567863 placement
var SETTINGS_NESTING_LIMITS = 32,
  PV = 40;

export {
  withKeyReplaced,
  resolveConnectorTwin,
  toScopedConfig,
  subscribeRows,
  waitForMcpServerStatus,
  SETTINGS_NESTING_LIMITS,
  PV,
};

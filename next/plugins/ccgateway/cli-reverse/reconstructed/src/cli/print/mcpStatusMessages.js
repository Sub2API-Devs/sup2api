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
async function waitForMcpServerStatus(registry, serverName, config) {
  let found = registry.rows().find((row) => row.name === serverName);
  let shouldRetry = found?.type === "failed" && registry.isAdded(serverName);
  if (shouldRetry) await registry.apply(serverName, undefined);
  return found !== undefined && !shouldRetry
    ? subscribeRows(registry.rows, serverName)
    : mcpServerNotStarted(registry, serverName, config);
}
//@ chunk-tyg7f3ek.js:566294-566510 placement
function resolveConnectorTwin(row, rows, listedNames) {
  if (!row.isListed || row.isTwin || !listedNames.includes(row.name)) return row;
  let mcpServerSignature = getMcpServerSignature(row.config);
  let found = rows.find(
    (candidate) =>
      candidate.name !== row.name && getMcpServerSignature(candidate.config) === mcpServerSignature,
  );
  if (found === undefined) return duplicateConnectorRefusal(row.name);
  return {
    isListed: true,
    isTwin: true,
    name: found.name,
  };
}
//@ chunk-tyg7f3ek.js:566510-566563 placement
function subscribeRows(rows, serverName) {
  return awaitMcpServerConnected(
    {
      rows,
      subscribe: pollRowsInterval,
    },
    serverName,
  );
}
//@ chunk-tyg7f3ek.js:566563-566687 placement
function withKeyReplaced(key, map, value) {
  let result = Object.create(null);
  for (let [key_2, value] of Object.entries(map)) if (key_2 !== key) result[key_2] = value;
  if (value !== undefined) result[key] = value;
  return result;
}
//@ chunk-tyg7f3ek.js:566687-566862 placement (2.1.88 match: toScopedConfig, 0.78)
function toScopedConfig(rows, known) {
  let configs = Object.create(null);
  for (let row of rows)
    if (
      row.config.scope === "dynamic" &&
      (row.config.pluginSource === undefined || Object.hasOwn(known, row.name))
    )
      configs[row.name] = row.config;
  return configs;
}
//@ chunk-tyg7f3ek.js:566862-567205 placement
async function mcpServerNotStarted(registry, serverName, config) {
  if (registry.isParked() && isNonReservedStdioConfig(serverName, config))
    return mcpConnectRefusal(
      "failed",
      `The MCP server "${serverName}" did not start: this session is parked until a host claims it, and its stdio servers start at the claim.`,
    );
  let { scope, ...rest } = config;
  return supportsEnvExpansion(rest) && rest.type !== "sdk"
    ? applyMcpServerAndDescribe(registry, serverName, rest)
    : mcpConnectRefusal(
        "failed",
        `The MCP server "${serverName}" has a transport this session cannot connect.`,
      );
}
//@ chunk-tyg7f3ek.js:567205-567438 placement
async function applyMcpServerAndDescribe(registry, serverName, config) {
  let result = await registry.apply(serverName, config);
  let outcome =
    result?.errors[serverName] === IGNORED_BY_ENTERPRISE_POLICY_TEXT
      ? mcpConnectRefusal("policy", `Your organization's MCP policy does not allow "${serverName}".`)
      : describeMcpConnectFailure(registry, serverName, result?.errors[serverName]);
  if (!outcome.isConnected && outcome.refused !== "auth") await registry.apply(serverName, undefined);
  return outcome;
}
//@ chunk-tyg7f3ek.js:567438-567593 placement
function describeMcpConnectFailure(registry, serverName, error) {
  let found = registry.rows().find((row) => row.name === serverName);
  return (
    (found && mcpConnectOutcome(found)) ??
    mcpConnectRefusal(
      "failed",
      `The MCP server "${serverName}" did not connect: ${error ?? "no reason given"}.`,
    )
  );
}
//@ chunk-tyg7f3ek.js:567593-567659 placement
function pollRowsInterval(onPoll) {
  let interval = setInterval(onPoll, MCP_STATUS_POLL_MS);
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

/**
 * cli/print/mcpStatusMessages.ts
 *
 * 2.1.316 新增：MCP 服务器未启动/连接失败的说明与状态等待
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (11)
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

//@ chunk-0yw3taqg.js:454617-454633 placement
var SETTINGS_NESTING_LIMITS = 32;
var SETTINGS_STRING_MAX_CHARS = 40;
//@ chunk-0yw3taqg.js:609783-609954 placement
async function waitForMcpServerStatus(registry, serverName, config) {
  let found = registry.rows().find((row) => row.name === serverName);
  let shouldRetry = found?.type === "failed" && registry.isAdded(serverName);
  if (shouldRetry) await registry.apply(serverName, undefined);
  return found !== undefined && !shouldRetry
    ? subscribeRows(registry.rows, serverName)
    : mcpServerNotStarted(registry, serverName, config);
}
//@ chunk-0yw3taqg.js:609954-610170 placement
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
//@ chunk-0yw3taqg.js:610170-610223 placement
function subscribeRows(rows, serverName) {
  return awaitMcpServerConnected(
    {
      rows,
      subscribe: pollRowsInterval,
    },
    serverName,
  );
}
//@ chunk-0yw3taqg.js:610223-610347 placement
function withKeyReplaced(key, map, value) {
  let result = Object.create(null);
  for (let [key_2, value] of Object.entries(map)) if (key_2 !== key) result[key_2] = value;
  if (value !== undefined) result[key] = value;
  return result;
}
//@ chunk-0yw3taqg.js:610347-610522 placement (2.1.88 match: toScopedConfig, 0.779)
function toScopedConfig_2(rows, known) {
  let configs = Object.create(null);
  for (let row of rows)
    if (
      row.config.scope === "dynamic" &&
      (row.config.pluginSource === undefined || Object.hasOwn(known, row.name))
    )
      configs[row.name] = row.config;
  return configs;
}
//@ chunk-0yw3taqg.js:610522-610865 placement
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
//@ chunk-0yw3taqg.js:610865-611098 placement
async function applyMcpServerAndDescribe(registry, serverName, config) {
  let result = await registry.apply(serverName, config);
  let outcome =
    result?.errors[serverName] === IGNORED_BY_ENTERPRISE_POLICY_TEXT
      ? mcpConnectRefusal("policy", `Your organization's MCP policy does not allow "${serverName}".`)
      : describeMcpConnectFailure(registry, serverName, result?.errors[serverName]);
  if (!outcome.isConnected && outcome.refused !== "auth") await registry.apply(serverName, undefined);
  return outcome;
}
//@ chunk-0yw3taqg.js:611098-611253 placement
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
//@ chunk-0yw3taqg.js:611253-611319 placement
function pollRowsInterval(onPoll) {
  let interval = setInterval(onPoll, MCP_STATUS_POLL_MS);
  return () => clearInterval(interval);
}
//@ chunk-0yw3taqg.js:611319-611465 placement
function duplicateConnectorRefusal(name) {
  return {
    isListed: false,
    refused: "failed",
    message: `The MCP server "${name}" duplicates a claude.ai connector that is not in this session.`,
  };
}
export {
  withKeyReplaced,
  resolveConnectorTwin,
  toScopedConfig_2,
  subscribeRows,
  waitForMcpServerStatus,
  SETTINGS_NESTING_LIMITS,
  SETTINGS_STRING_MAX_CHARS,
};

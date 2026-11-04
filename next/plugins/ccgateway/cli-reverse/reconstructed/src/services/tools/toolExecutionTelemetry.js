/**
 * services/tools/toolExecutionTelemetry.ts
 *
 * 2.1.316 新增。工具执行遥测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0h4e7gnq.js (3)
 * attribution: placement 3
 */
import { describeToolAvailability } from "../mcp/mcpToolAvailability.js";
import { findLongestPrefixClients, aliasOrSelf } from "./toolExecution.js";
import { getMcpTransportTelemetryLabel } from "../mcp/config.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { concurrencyBucket } from "./toolOrchestration.js";
import { count } from "../../utils/collections.js";
import { currentMcpClients } from "../compact/idleToolResultClearing.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";

//@ chunk-0h4e7gnq.js:29062-29153 placement
var MCP_TRANSPORTS_SUPPORTING_TOOLS = {
  stdio: true,
  sse: true,
  "sse-ide": true,
  "ws-ide": true,
  http: true,
  ws: true,
  sdk: true,
  "claudeai-proxy": true,
};
//@ chunk-0h4e7gnq.js:29153-29618 placement
function mcpDepartureCause(toolName, tools, clients, toolPermissionContext) {
  let departureCause = describeToolAvailability(toolName, clients, toolPermissionContext).kind;
  let longestPrefixClients = findLongestPrefixClients(toolName, clients);
  let filtered = longestPrefixClients.filter(
    (longestPrefixClient) => longestPrefixClient.type === "connected",
  );
  let client = filtered[0] ?? longestPrefixClients[0];
  if (!client)
    return {
      departureCause,
      serverTransport: undefined,
      serverIsDeviceBridge: undefined,
      serverToolsListFailed: undefined,
      serverToolsInPool: undefined,
    };
  return {
    departureCause,
    serverTransport: getMcpTransportTelemetryLabel(client.config),
    serverIsDeviceBridge: client.name === REMOTE_DEVICES,
    serverToolsListFailed:
      filtered.length > 0
        ? filtered.some((connectedClient) => connectedClient.toolsListError !== undefined)
        : undefined,
    serverToolsInPool: concurrencyBucket(
      count(tools, (tool) => findLongestPrefixClients(tool.name, clients).includes(client)),
    ),
  };
}
//@ chunk-0h4e7gnq.js:29618-29912 placement
function missingToolTelemetry(toolName, tools, toolUseContext) {
  try {
    let resolvedName = aliasOrSelf(toolName, toolUseContext.options.toolAliases);
    if (typeof resolvedName !== "string") return;
    return mcpDepartureCause(
      resolvedName,
      toolUseContext.options.refreshTools?.() ?? tools,
      currentMcpClients(toolUseContext),
      getToolPermissionContext(toolUseContext),
    );
  } catch (error) {
    logForDebugging(
      `Could not read why a tool is missing, so its telemetry fields are left out (the turn is unaffected): ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    logError(error);
    return;
  }
}
export { missingToolTelemetry, MCP_TRANSPORTS_SUPPORTING_TOOLS };

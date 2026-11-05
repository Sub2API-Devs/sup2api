/**
 * services/tools/toolExecutionTelemetry.ts
 *
 * 2.1.316 新增。工具执行遥测。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-frs14hy1.js (4)
 * attribution: placement 3, affinity 1
 */
import { describeToolAvailability } from "../mcp/mcpToolAvailability.js";
import { findLongestPrefixClients, aliasOrSelf } from "./toolExecution.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { concurrencyBucket } from "./toolOrchestration.js";
import { countWhere } from "../../utils/collections.js";
import { currentMcpClients } from "../compact/idleToolResultClearing.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";

//@ chunk-frs14hy1.js:33588-33679 placement
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
//@ chunk-frs14hy1.js:33679-34144 placement
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
      countWhere(tools, (tool) => findLongestPrefixClients(tool.name, clients).includes(client)),
    ),
  };
}
//@ chunk-frs14hy1.js:34144-34438 placement
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
//@ chunk-frs14hy1.js:34438-34533 affinity (2.1.88 match: getServerCommandArray, 1)
function getMcpTransportTelemetryLabel(config) {
  let transportType = config.type ?? "stdio";
  return typeof transportType === "string" && Object.hasOwn(MCP_TRANSPORTS_SUPPORTING_TOOLS, transportType)
    ? transportType
    : "other";
}
export { missingToolTelemetry };

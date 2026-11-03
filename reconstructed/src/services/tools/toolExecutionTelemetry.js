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
import { findLongestPrefixClients, lGt } from "./toolExecution.js";
import { getMcpTransportTelemetryLabel } from "../mcp/config.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { sd } from "./toolOrchestration.js";
import { count } from "../../utils/collections.js";
import { currentMcpClients } from "../compact/idleToolResultClearing.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";

//@ chunk-0h4e7gnq.js:29062-29153 placement
var td = { stdio: !0, sse: !0, "sse-ide": !0, "ws-ide": !0, http: !0, ws: !0, sdk: !0, "claudeai-proxy": !0 };
//@ chunk-0h4e7gnq.js:29153-29618 placement
function mcpDepartureCause(e, n, s, y) {
  let kind = describeToolAvailability(e, s, y).kind,
    S = findLongestPrefixClients(e, s),
    filtered = S.filter((w) => w.type === "connected"),
    k = filtered[0] ?? S[0];
  if (!k)
    return {
      departureCause: kind,
      serverTransport: void 0,
      serverIsDeviceBridge: void 0,
      serverToolsListFailed: void 0,
      serverToolsInPool: void 0,
    };
  return {
    departureCause: kind,
    serverTransport: getMcpTransportTelemetryLabel(k.config),
    serverIsDeviceBridge: k.name === REMOTE_DEVICES,
    serverToolsListFailed: filtered.length > 0 ? filtered.some((w) => w.toolsListError !== void 0) : void 0,
    serverToolsInPool: sd(count(n, (w) => findLongestPrefixClients(w.name, s).includes(k))),
  };
}
//@ chunk-0h4e7gnq.js:29618-29912 placement
function missingToolTelemetry(e, n, s) {
  try {
    let y = lGt(e, s.options.toolAliases);
    if (typeof y !== "string") return;
    return mcpDepartureCause(
      y,
      s.options.refreshTools?.() ?? n,
      currentMcpClients(s),
      getToolPermissionContext(s),
    );
  } catch (error) {
    (logForDebugging(
      `Could not read why a tool is missing, so its telemetry fields are left out (the turn is unaffected): ${errorMessage(error)}`,
      { level: "warn" },
    ),
      logError(error));
    return;
  }
}

export { missingToolTelemetry, td };

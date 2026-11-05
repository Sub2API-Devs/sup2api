/**
 * services/mcp/mcpToggleMessages.ts
 *
 * 2.1.316 新增：MCP 服务器启用/禁用/拒绝的提示文本与错误
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wh5pkk8m.js (17)
 * attribution: placement 17
 */
import { normalizeServerNameShort } from "../api/deferredToolsState.js";
import { isSafeCliArg } from "../../utils/worktreeResumeHint.js";
import { countWhere } from "../../utils/collections.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import {
  isUnconfiguredFailure,
  NOT_APPROVED_REASON,
  RESERVED_ADDRESS_REASON,
  BLOCKED_BY_POLICY_REASON,
} from "./redactMcpErrors.js";
import { judgeGate } from "../analytics/growthbookGates.js";
import { WireSafeControlError } from "../../utils/errors.js";

//@ chunk-wh5pkk8m.js:389-419 placement
function connectionTypeOf(client) {
  return client.type;
}
//@ chunk-wh5pkk8m.js:535-722 placement
function toggleStateOf(client) {
  let connectionType = connectionTypeOf(client);
  switch (connectionType) {
    case "disabled":
    case "pending":
    case "needs-approval":
      return connectionType;
    case "connected":
    case "failed":
    case "needs-auth":
    case "cached":
      return null;
    default:
      return connectionType;
  }
}
//@ chunk-wh5pkk8m.js:722-800 placement
function disabledEnableInMcpText(serverName) {
  return `"${normalizeServerNameShort(serverName)}" is disabled \u2014 enable it in /mcp first`;
}
//@ chunk-wh5pkk8m.js:800-900 placement
function disabledEnableBeforeText(serverName, action) {
  return `MCP server ${normalizeServerNameShort(serverName)} is disabled \u2014 enable it (mcp_toggle) before ${action}`;
}
//@ chunk-wh5pkk8m.js:900-1017 placement
function notApprovedText(serverName, action) {
  return `MCP server ${normalizeServerNameShort(serverName)} is not approved for this project \u2014 approve it in /mcp before ${action}`;
}
//@ chunk-wh5pkk8m.js:1017-1150 placement
function disabledElsewhereText(serverName) {
  return `"${normalizeServerNameShort(serverName)}" was disabled in another session \u2014 disable and re-enable it in /mcp, or restart, to reconnect`;
}
//@ chunk-wh5pkk8m.js:1150-1518 placement
function reenabledElsewhereText(serverName) {
  let shortName = normalizeServerNameShort(serverName);
  let message = `"${serverName}" was re-enabled in another session, so this disable didn't persist \u2014 /mcp enable ${serverName} then /mcp disable ${serverName} makes it stick. Left alone, it connects on the next launch.`;
  return isSafeCliArg(serverName) && [...message].length <= 1024
    ? message
    : `"${shortName}" was re-enabled in another session, so this disable didn't persist. Left alone, it connects on the next launch.`;
}
//@ chunk-wh5pkk8m.js:1518-2638 placement
function describeDisabledServers(clients, enabledNow, isDisabledHandle) {
  if (!enabledNow) {
    let reEnabledCount = countWhere(
      clients,
      (client) => client.type === "disabled" && !isDisabledHandle(client.name),
    );
    if (reEnabledCount === 0) return null;
    let stillDisabledCount = countWhere(
      clients,
      (client) => client.type === "disabled" && isDisabledHandle(client.name),
    );
    return (
      `${reEnabledCount} MCP server(s) were re-enabled in another session, so this disable didn't persist for them \u2014 enable then disable each in /mcp to make it stick. Left alone, they connect on the next launch.` +
      (stillDisabledCount > 0
        ? ` The other ${stillDisabledCount} ${stillDisabledCount === 1 ? "remains" : "remain"} disabled.`
        : "")
    );
  }
  let filtered = clients.filter(
    (client) =>
      client.type !== "disabled" &&
      connectionTypeOf(client) !== "needs-approval" &&
      isDisabledHandle(client.name),
  );
  if (filtered.length === 0) return null;
  let connectedCount = countWhere(filtered, isConnectedOrCached);
  let unconfiguredCount = countWhere(
    filtered,
    (client) => !isConnectedOrCached(client) && isUnconfiguredFailure(client),
  );
  let reconnectCount = filtered.length - connectedCount - unconfiguredCount;
  let parts = [];
  if (reconnectCount > 0)
    parts.push(
      `${reconnectCount} MCP server(s) were disabled in another session \u2014 disable and re-enable them in /mcp, or restart, to reconnect.`,
    );
  if (unconfiguredCount > 0)
    parts.push(
      `${unconfiguredCount} MCP server(s) were disabled in another session but aren't configured yet \u2014 there's nothing to reconnect until they are.`,
    );
  if (connectedCount > 0)
    parts.push(
      `${connectedCount} MCP server(s) are still available in this session but were disabled in another \u2014 they keep working here and won't reconnect after the next launch. Disable and re-enable them in /mcp to persist the re-enable.`,
    );
  return parts.join(" ");
}
//@ chunk-wh5pkk8m.js:2638-2775 placement
function blockedByPolicyText(serverName) {
  return `"${normalizeServerNameShort(serverName)}" is blocked by your organization's managed policy \u2014 it can't be authenticated or reconnected here`;
}
//@ chunk-wh5pkk8m.js:2775-2981 placement
function reservedAddressRefusalText(serverName) {
  return `Claude Code refuses MCP server "${normalizeServerNameShort(serverName)}" because it reserves that address for its own use. No administrator set this. Retrying won't help, only removing it or changing its address.`;
}
//@ chunk-wh5pkk8m.js:2981-3164 placement
function projectScopeNotApprovedText(serverName) {
  return `"${normalizeServerNameShort(serverName)}" is a project-scope MCP server (.mcp.json) that is not approved for this project \u2014 approve it via /mcp first, then authenticate or reconnect it`;
}
//@ chunk-wh5pkk8m.js:3164-3248 placement
function mcpRefusalText(serverName, reason, config, detail) {
  return reason === "project-approval"
    ? projectScopeNotApprovedText(serverName)
    : judgeGate(serverName, config)
      ? reservedAddressRefusalText(serverName)
      : (detail ?? blockedByPolicyText(serverName));
}
//@ chunk-wh5pkk8m.js:3248-3527 placement
function mcpRefusalError(serverName, reason, config, detail) {
  if (reason !== "project-approval" && judgeGate(serverName, config))
    return new WireSafeControlError(
      reservedAddressRefusalText(serverName),
      "MCP server refused at a reserved address",
    );
  return reason === "project-approval"
    ? new WireSafeControlError(
        projectScopeNotApprovedText(serverName),
        "MCP server not approved for this project",
      )
    : new WireSafeControlError(
        detail ?? blockedByPolicyText(serverName),
        "MCP server blocked by enterprise managed policy",
      );
}
//@ chunk-wh5pkk8m.js:3527-3670 placement
function mcpGateError(reason, serverName, config) {
  return reason === "project-approval"
    ? {
        error: NOT_APPROVED_REASON,
        errorCode: "APPROVAL_REQUIRED",
      }
    : {
        error: judgeGate(serverName, config) ? RESERVED_ADDRESS_REASON : BLOCKED_BY_POLICY_REASON,
        errorCode: "POLICY_BLOCKED",
      };
}
//@ chunk-wh5pkk8m.js:3670-3743 placement
function isPolicyBlockedFailure(client) {
  return client.type === "failed" && client.errorCode === "POLICY_BLOCKED";
}
//@ chunk-wh5pkk8m.js:3743-3977 placement
function disabledInOtherSessionText(serverName) {
  return `"${normalizeServerNameShort(serverName)}" is still available in this session, but another session disabled it \u2014 it keeps working here and won't reconnect after the next launch. Disable and re-enable it in /mcp to persist the re-enable.`;
}
//@ chunk-wh5pkk8m.js:3977-4375 placement
function assertToggleableServer(clients, serverName) {
  if (serverName === "ide")
    throw new WireSafeControlError(
      "The IDE connection is managed automatically and can't be reconnected manually",
    );
  let client = clients.find((client) => client.name === serverName);
  let toggleState = client && toggleStateOf(client);
  if (toggleState)
    throw new WireSafeControlError(
      toggleState === "disabled"
        ? disabledEnableInMcpText(serverName)
        : toggleState === "pending"
          ? `"${normalizeServerNameShort(serverName)}" is already reconnecting \u2014 retries can take a few minutes when a server keeps failing`
          : `"${normalizeServerNameShort(serverName)}" is pending approval \u2014 approve it in the terminal first`,
    );
}
export {
  mcpGateError,
  mcpRefusalText,
  disabledEnableBeforeText,
  notApprovedText,
  reservedAddressRefusalText,
  describeDisabledServers,
  assertToggleableServer,
  disabledElsewhereText,
  disabledEnableInMcpText,
  mcpRefusalError,
  toggleStateOf,
  connectionTypeOf,
  disabledInOtherSessionText,
  reenabledElsewhereText,
  blockedByPolicyText,
  projectScopeNotApprovedText,
  isPolicyBlockedFailure,
};

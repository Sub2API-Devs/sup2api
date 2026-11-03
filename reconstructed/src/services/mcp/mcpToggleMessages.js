/**
 * services/mcp/mcpToggleMessages.ts
 *
 * 2.1.316 新增：MCP 服务器启用/禁用/拒绝的提示文本与错误
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2sw13wfh.js (17)
 * attribution: placement 17
 */
import { normalizeServerNameShort } from "../api/deferredToolsState.js";
import { isSafeCliArg } from "../../utils/worktreeResumeHint.js";
import { count } from "../../utils/collections.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import {
  isUnconfiguredFailure,
  NOT_APPROVED_REASON,
  RESERVED_ADDRESS_REASON,
  BLOCKED_BY_POLICY_REASON,
} from "./redactMcpErrors.js";
import { judgeGate } from "../analytics/growthbookGates.js";
import { WireSafeControlError } from "../../utils/errors.js";

//@ chunk-2sw13wfh.js:389-419 placement
function connectionTypeOf(e) {
  return e.type;
}
//@ chunk-2sw13wfh.js:535-722 placement
function toggleStateOf(e) {
  let n = connectionTypeOf(e);
  switch (n) {
    case "disabled":
    case "pending":
    case "needs-approval":
      return n;
    case "connected":
    case "failed":
    case "needs-auth":
    case "cached":
      return null;
    default:
      return n;
  }
}
//@ chunk-2sw13wfh.js:722-800 placement
function disabledEnableInMcpText(e) {
  return `"${normalizeServerNameShort(e)}" is disabled \u2014 enable it in /mcp first`;
}
//@ chunk-2sw13wfh.js:800-900 placement
function disabledEnableBeforeText(serverName, n) {
  return `MCP server ${normalizeServerNameShort(serverName)} is disabled \u2014 enable it (mcp_toggle) before ${n}`;
}
//@ chunk-2sw13wfh.js:900-1017 placement
function notApprovedText(serverName, n) {
  return `MCP server ${normalizeServerNameShort(serverName)} is not approved for this project \u2014 approve it in /mcp before ${n}`;
}
//@ chunk-2sw13wfh.js:1017-1150 placement
function disabledElsewhereText(e) {
  return `"${normalizeServerNameShort(e)}" was disabled in another session \u2014 disable and re-enable it in /mcp, or restart, to reconnect`;
}
//@ chunk-2sw13wfh.js:1150-1518 placement
function reenabledElsewhereText(e) {
  let n = normalizeServerNameShort(e);
  let t = `"${e}" was re-enabled in another session, so this disable didn't persist \u2014 /mcp enable ${e} then /mcp disable ${e} makes it stick. Left alone, it connects on the next launch.`;
  return isSafeCliArg(e) && [...t].length <= 1024
    ? t
    : `"${n}" was re-enabled in another session, so this disable didn't persist. Left alone, it connects on the next launch.`;
}
//@ chunk-2sw13wfh.js:1518-2638 placement
function describeDisabledServers(e, n, isDisabledHandle) {
  if (!n) {
    let o = count(e, (s) => s.type === "disabled" && !isDisabledHandle(s.name));
    if (o === 0) return null;
    let l = count(e, (s) => s.type === "disabled" && isDisabledHandle(s.name));
    return (
      `${o} MCP server(s) were re-enabled in another session, so this disable didn't persist for them \u2014 enable then disable each in /mcp to make it stick. Left alone, they connect on the next launch.` +
      (l > 0 ? ` The other ${l} ${l === 1 ? "remains" : "remain"} disabled.` : "")
    );
  }
  let filtered = e.filter(
    (o) => o.type !== "disabled" && connectionTypeOf(o) !== "needs-approval" && isDisabledHandle(o.name),
  );
  if (filtered.length === 0) return null;
  let i = count(filtered, isConnectedOrCached);
  let c = count(filtered, (o) => !isConnectedOrCached(o) && isUnconfiguredFailure(o));
  let d = filtered.length - i - c;
  let a = [];
  if (d > 0)
    a.push(
      `${d} MCP server(s) were disabled in another session \u2014 disable and re-enable them in /mcp, or restart, to reconnect.`,
    );
  if (c > 0)
    a.push(
      `${c} MCP server(s) were disabled in another session but aren't configured yet \u2014 there's nothing to reconnect until they are.`,
    );
  if (i > 0)
    a.push(
      `${i} MCP server(s) are still available in this session but were disabled in another \u2014 they keep working here and won't reconnect after the next launch. Disable and re-enable them in /mcp to persist the re-enable.`,
    );
  return a.join(" ");
}
//@ chunk-2sw13wfh.js:2638-2775 placement
function blockedByPolicyText(e) {
  return `"${normalizeServerNameShort(e)}" is blocked by your organization's managed policy \u2014 it can't be authenticated or reconnected here`;
}
//@ chunk-2sw13wfh.js:2775-2981 placement
function reservedAddressRefusalText(e) {
  return `Claude Code refuses MCP server "${normalizeServerNameShort(e)}" because it reserves that address for its own use. No administrator set this. Retrying won't help, only removing it or changing its address.`;
}
//@ chunk-2sw13wfh.js:2981-3164 placement
function projectScopeNotApprovedText(e) {
  return `"${normalizeServerNameShort(e)}" is a project-scope MCP server (.mcp.json) that is not approved for this project \u2014 approve it via /mcp first, then authenticate or reconnect it`;
}
//@ chunk-2sw13wfh.js:3164-3248 placement
function mcpRefusalText(e, n, config, r) {
  return n === "project-approval"
    ? projectScopeNotApprovedText(e)
    : judgeGate(e, config)
      ? reservedAddressRefusalText(e)
      : (r ?? blockedByPolicyText(e));
}
//@ chunk-2sw13wfh.js:3248-3527 placement
function mcpRefusalError(e, n, t, r) {
  if (n !== "project-approval" && judgeGate(e, t))
    return new WireSafeControlError(
      reservedAddressRefusalText(e),
      "MCP server refused at a reserved address",
    );
  return n === "project-approval"
    ? new WireSafeControlError(projectScopeNotApprovedText(e), "MCP server not approved for this project")
    : new WireSafeControlError(
        r ?? blockedByPolicyText(e),
        "MCP server blocked by enterprise managed policy",
      );
}
//@ chunk-2sw13wfh.js:3527-3670 placement
function mcpGateError(e, n, t) {
  return e === "project-approval"
    ? {
        error: NOT_APPROVED_REASON,
        errorCode: "APPROVAL_REQUIRED",
      }
    : {
        error: judgeGate(n, t) ? RESERVED_ADDRESS_REASON : BLOCKED_BY_POLICY_REASON,
        errorCode: "POLICY_BLOCKED",
      };
}
//@ chunk-2sw13wfh.js:3670-3743 placement
function isPolicyBlockedFailure(e) {
  return e.type === "failed" && e.errorCode === "POLICY_BLOCKED";
}
//@ chunk-2sw13wfh.js:3743-3977 placement
function disabledInOtherSessionText(e) {
  return `"${normalizeServerNameShort(e)}" is still available in this session, but another session disabled it \u2014 it keeps working here and won't reconnect after the next launch. Disable and re-enable it in /mcp to persist the re-enable.`;
}
//@ chunk-2sw13wfh.js:3977-4375 placement
function assertToggleableServer(clients, n) {
  if (n === "ide")
    throw new WireSafeControlError(
      "The IDE connection is managed automatically and can't be reconnected manually",
    );
  let found = clients.find((i) => i.name === n);
  let r = found && toggleStateOf(found);
  if (r)
    throw new WireSafeControlError(
      r === "disabled"
        ? disabledEnableInMcpText(n)
        : r === "pending"
          ? `"${normalizeServerNameShort(n)}" is already reconnecting \u2014 retries can take a few minutes when a server keeps failing`
          : `"${normalizeServerNameShort(n)}" is pending approval \u2014 approve it in the terminal first`,
    );
}
export {
  mcpGateError,
  reservedAddressRefusalText,
  mcpRefusalText,
  disabledEnableBeforeText,
  notApprovedText,
  assertToggleableServer,
  disabledElsewhereText,
  disabledEnableInMcpText,
  mcpRefusalError,
  describeDisabledServers,
  toggleStateOf,
  connectionTypeOf,
  disabledInOtherSessionText,
  reenabledElsewhereText,
  isPolicyBlockedFailure,
  blockedByPolicyText,
  projectScopeNotApprovedText,
};

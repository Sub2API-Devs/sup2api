/**
 * components/mcp/utils/reconnectHelpers.tsx
 *
 * MCP 重连结果/错误的统一提示文案。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/utils/reconnectHelpers.tsx
 * pieces: chunk-8433gxg0.js (7)
 * attribution: placement 5, fingerprint 2
 */
import { describeMcpServerOrigin, redactMcpErrorDetail } from "../../../services/mcp/mcpServerOrigin.js";
import { sanitizeErrorDetail, uo, normalizeMcpServerName } from "../../../services/api/deferredToolsState.js";
import { logForDebugging } from "../../../utils/debug.js";
import { sanitizeTelemetryString } from "../../../utils/sanitization.js";
import { errorMessage, WireSafeControlError } from "../../../utils/errors.js";

/**
 * 有专门文案的 MCP 错误码集合；其余错误码按原样（或 HTTP 状态）显示。
 */
//@ chunk-8433gxg0.js:348-707 placement
var DESCRIBED_MCP_ERROR_CODES = new Set([
  "INVALID_CONFIG",
  "UNCONFIGURED",
  "AUTH_HEADER_REJECTED",
  "HEADERS_HELPER_AUTH_REJECTED",
  "CLI_OWNED_BEARER_REJECTED",
  "FIRST_PARTY_AUTH_REJECTED",
  "CLAUDEAI_BEARER_REJECTED",
  "ENDPOINT_NOT_FOUND",
  "CONNECT_TIMEOUT",
  "CONNECT_SUSPENDED",
  "CREDENTIAL_STORE_UNAVAILABLE",
  "POLICY_BLOCKED",
  "APPROVAL_REQUIRED",
  "DISABLED",
  "IDENTITY_CHANGED",
  "SHUTTING_DOWN",
]);
//@ chunk-8433gxg0.js:707-952 placement
function describeMcpServerError(e) {
  let o = describeMcpServerOrigin(e.name, e.config, { detail: "origin" }),
    errorCode = e.errorCode,
    s = (r) => redactMcpErrorDetail(e.name, e.config, r);
  if (errorCode !== void 0 && DESCRIBED_MCP_ERROR_CODES.has(errorCode))
    return e.error !== void 0 ? s(e.error) : errorCode;
  if (errorCode) {
    let r = formatMcpErrorCode(errorCode);
    return o ? `${r} at ${o}` : r;
  }
  return e.error !== void 0 ? s(e.error) : "";
}
/**
 * 错误码显示：“23” 为请求超时，100–599 为 “HTTP xxx”，其余原样。
 */
//@ chunk-8433gxg0.js:952-1068 placement
function formatMcpErrorCode(e) {
  let o = Number(e);
  return e === "23" ? "request timed out" : Number.isInteger(o) && o >= 100 && o <= 599 ? `HTTP ${e}` : e;
}
/**
 * mcp 健康检查的错误文本：拼接错误码、错误与显示细节并对敏感信息脱敏。
 */
//@ chunk-8433gxg0.js:1068-1343 placement
function formatMcpHealthError(e) {
  let { errorCode: errorCode, displayDetail: displayDetail } = e,
    s = (i) => sanitizeErrorDetail(redactMcpErrorDetail(e.name, e.config, i));
  if (errorCode && !DESCRIBED_MCP_ERROR_CODES.has(errorCode)) {
    let i = formatMcpErrorCode(errorCode),
      error = e.error,
      a = error === void 0 ? i : error === i || error.startsWith(`${i}: `) ? error : `${i}: ${error}`;
    return s(displayDetail ? `${a} ${displayDetail}` : a);
  }
  let r = e.error ?? errorCode ?? "",
    f = displayDetail ? `${r} ${displayDetail}`.trim() : r;
  return f === "" ? f : s(f);
}
//@ chunk-8433gxg0.js:1343-2737 fingerprint = handleReconnectResult (0.557)
function handleReconnectResult(e, o, n, s) {
  switch (e.client.type) {
    case "connected":
      if (e.client.discoveryBearerRejected)
        return {
          message: `Reconnected to ${uo(o)}, but your claude.ai session token was rejected. Run /login, then reconnect.`,
          success: !1,
        };
      if (e.client.toolsListError) {
        if (n.persistsOffBox)
          return (
            logForDebugging(
              `mcp reconnect tools/list failed for ${sanitizeTelemetryString(o)}: ${redactMcpErrorDetail(o, e.client.config, e.client.toolsListError)}`,
              { level: "error" },
            ),
            {
              message: `Reconnected to ${uo(o)}, but fetching tools failed (detail withheld on this connection).`,
              success: !1,
            }
          );
        return {
          message: `Reconnected to ${uo(o)}, but fetching tools failed: ${normalizeMcpServerName(redactMcpErrorDetail(o, e.client.config, e.client.toolsListError))}`,
          success: !1,
        };
      }
      return { message: `Reconnected to ${uo(o)}.`, success: !0 };
    case "needs-auth":
      return {
        message: s?.hasHeadersHelper
          ? `${uo(o)} requires authentication. Use 'Authenticate' if the upstream server uses OAuth, or check the headersHelper script and use 'Reconnect'.`
          : `${uo(o)} requires authentication. Use the 'Authenticate' option.`,
        success: !1,
      };
    case "failed": {
      let r = describeMcpServerError(e.client);
      if (n.persistsOffBox) {
        if (r)
          logForDebugging(`mcp reconnect failed for ${sanitizeTelemetryString(o)}: ${r}`, { level: "error" });
        return {
          message: `Failed to reconnect to ${uo(o)}${r ? " (detail withheld on this connection)" : ""}.`,
          success: !1,
        };
      }
      return {
        message: r
          ? `Failed to reconnect to ${uo(o)}: ${normalizeMcpServerName(r)}`
          : `Failed to reconnect to ${uo(o)}.`,
        success: !1,
      };
    }
    default:
      return { message: `Unknown result when reconnecting to ${uo(o)}.`, success: !1 };
  }
}
//@ chunk-8433gxg0.js:2737-3053 fingerprint = handleReconnectError (0.443)
function handleReconnectError(e, o, n) {
  let errorMessage_2 = n.config ? redactMcpErrorDetail(o, n.config, errorMessage(e)) : errorMessage(e);
  if (e instanceof WireSafeControlError) return normalizeMcpServerName(errorMessage(e), void 0, "none");
  if (n.persistsOffBox)
    return (
      logForDebugging(`mcp reconnect error for ${sanitizeTelemetryString(o)}: ${errorMessage_2}`, {
        level: "error",
      }),
      `Error reconnecting to ${uo(o)} (detail withheld on this connection).`
    );
  return `Error reconnecting to ${uo(o)}: ${normalizeMcpServerName(errorMessage_2)}`;
}
//@ chunk-8433gxg0.js:3053-3379 placement
function formatMcpOperationFailure(e, o, n, s) {
  let r = s.config ? redactMcpErrorDetail(o, s.config, errorMessage(e)) : errorMessage(e);
  if (e instanceof WireSafeControlError) return normalizeMcpServerName(errorMessage(e), void 0, "none");
  if (s.persistsOffBox)
    return (
      logForDebugging(`mcp ${n} failed for ${sanitizeTelemetryString(o)}: ${r}`, { level: "error" }),
      `Failed to ${n} MCP server "${uo(o)}" (detail withheld on this connection).`
    );
  return `Failed to ${n} MCP server "${uo(o)}": ${normalizeMcpServerName(r)}`;
}

export {
  handleReconnectResult,
  handleReconnectError,
  formatMcpOperationFailure,
  formatMcpHealthError,
  describeMcpServerError,
};

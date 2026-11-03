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
import {
  sanitizeErrorDetail,
  normalizeServerNameShort,
  normalizeMcpServerName,
} from "../../../services/api/deferredToolsState.js";
import { logForDebugging } from "../../../utils/debug.js";
import { sanitizeTelemetryString } from "../../../utils/sanitization.js";
import { errorMessage, WireSafeControlError } from "../../../utils/errors.js";

//@ chunk-8433gxg0.js:348-707 placement
/**
 * 有专门文案的 MCP 错误码集合；其余错误码按原样（或 HTTP 状态）显示。
 */
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
function describeMcpServerError(client) {
  let o = describeMcpServerOrigin(client.name, client.config, {
    detail: "origin",
  });
  let errorCode = client.errorCode;
  let s = (error) => redactMcpErrorDetail(client.name, client.config, error);
  if (errorCode !== undefined && DESCRIBED_MCP_ERROR_CODES.has(errorCode))
    return client.error !== undefined ? s(client.error) : errorCode;
  if (errorCode) {
    let r = formatMcpErrorCode(errorCode);
    return o ? `${r} at ${o}` : r;
  }
  return client.error !== undefined ? s(client.error) : "";
}
//@ chunk-8433gxg0.js:952-1068 placement
/**
 * 错误码显示：“23” 为请求超时，100–599 为 “HTTP xxx”，其余原样。
 */
function formatMcpErrorCode(errorCode) {
  let o = Number(errorCode);
  return errorCode === "23"
    ? "request timed out"
    : Number.isInteger(o) && o >= 100 && o <= 599
      ? `HTTP ${errorCode}`
      : errorCode;
}
//@ chunk-8433gxg0.js:1068-1343 placement
/**
 * mcp 健康检查的错误文本：拼接错误码、错误与显示细节并对敏感信息脱敏。
 */
function formatMcpHealthError(e) {
  let { errorCode, displayDetail } = e;
  let s = (i) => sanitizeErrorDetail(redactMcpErrorDetail(e.name, e.config, i));
  if (errorCode && !DESCRIBED_MCP_ERROR_CODES.has(errorCode)) {
    let i = formatMcpErrorCode(errorCode);
    let error = e.error;
    let a = error === undefined ? i : error === i || error.startsWith(`${i}: `) ? error : `${i}: ${error}`;
    return s(displayDetail ? `${a} ${displayDetail}` : a);
  }
  let r = e.error ?? errorCode ?? "";
  let f = displayDetail ? `${r} ${displayDetail}`.trim() : r;
  return f === "" ? f : s(f);
}
//@ chunk-8433gxg0.js:1343-2737 fingerprint = handleReconnectResult (0.557)
function handleReconnectResult(result, name, n, s) {
  switch (result.client.type) {
    case "connected":
      if (result.client.discoveryBearerRejected)
        return {
          message: `Reconnected to ${normalizeServerNameShort(name)}, but your claude.ai session token was rejected. Run /login, then reconnect.`,
          success: false,
        };
      if (result.client.toolsListError) {
        if (n.persistsOffBox) {
          logForDebugging(
            `mcp reconnect tools/list failed for ${sanitizeTelemetryString(name)}: ${redactMcpErrorDetail(name, result.client.config, result.client.toolsListError)}`,
            {
              level: "error",
            },
          );
          return {
            message: `Reconnected to ${normalizeServerNameShort(name)}, but fetching tools failed (detail withheld on this connection).`,
            success: false,
          };
        }
        return {
          message: `Reconnected to ${normalizeServerNameShort(name)}, but fetching tools failed: ${normalizeMcpServerName(redactMcpErrorDetail(name, result.client.config, result.client.toolsListError))}`,
          success: false,
        };
      }
      return {
        message: `Reconnected to ${normalizeServerNameShort(name)}.`,
        success: true,
      };
    case "needs-auth":
      return {
        message: s?.hasHeadersHelper
          ? `${normalizeServerNameShort(name)} requires authentication. Use 'Authenticate' if the upstream server uses OAuth, or check the headersHelper script and use 'Reconnect'.`
          : `${normalizeServerNameShort(name)} requires authentication. Use the 'Authenticate' option.`,
        success: false,
      };
    case "failed": {
      let r = describeMcpServerError(result.client);
      if (n.persistsOffBox) {
        if (r)
          logForDebugging(`mcp reconnect failed for ${sanitizeTelemetryString(name)}: ${r}`, {
            level: "error",
          });
        return {
          message: `Failed to reconnect to ${normalizeServerNameShort(name)}${r ? " (detail withheld on this connection)" : ""}.`,
          success: false,
        };
      }
      return {
        message: r
          ? `Failed to reconnect to ${normalizeServerNameShort(name)}: ${normalizeMcpServerName(r)}`
          : `Failed to reconnect to ${normalizeServerNameShort(name)}.`,
        success: false,
      };
    }
    default:
      return {
        message: `Unknown result when reconnecting to ${normalizeServerNameShort(name)}.`,
        success: false,
      };
  }
}
//@ chunk-8433gxg0.js:2737-3053 fingerprint = handleReconnectError (0.443)
function handleReconnectError(e, name, n) {
  let errorMessage_2 = n.config ? redactMcpErrorDetail(name, n.config, errorMessage(e)) : errorMessage(e);
  if (e instanceof WireSafeControlError) return normalizeMcpServerName(errorMessage(e), undefined, "none");
  if (n.persistsOffBox) {
    logForDebugging(`mcp reconnect error for ${sanitizeTelemetryString(name)}: ${errorMessage_2}`, {
      level: "error",
    });
    return `Error reconnecting to ${normalizeServerNameShort(name)} (detail withheld on this connection).`;
  }
  return `Error reconnecting to ${normalizeServerNameShort(name)}: ${normalizeMcpServerName(errorMessage_2)}`;
}
//@ chunk-8433gxg0.js:3053-3379 placement
function formatMcpOperationFailure(e, name, n, s) {
  let r = s.config ? redactMcpErrorDetail(name, s.config, errorMessage(e)) : errorMessage(e);
  if (e instanceof WireSafeControlError) return normalizeMcpServerName(errorMessage(e), undefined, "none");
  if (s.persistsOffBox) {
    logForDebugging(`mcp ${n} failed for ${sanitizeTelemetryString(name)}: ${r}`, {
      level: "error",
    });
    return `Failed to ${n} MCP server "${normalizeServerNameShort(name)}" (detail withheld on this connection).`;
  }
  return `Failed to ${n} MCP server "${normalizeServerNameShort(name)}": ${normalizeMcpServerName(r)}`;
}
export {
  handleReconnectResult,
  handleReconnectError,
  formatMcpOperationFailure,
  formatMcpHealthError,
  describeMcpServerError,
};

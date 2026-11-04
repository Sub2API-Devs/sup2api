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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-8433gxg0.js:348-707 placement
/**
 * 有专门文案的 MCP 错误码集合；其余错误码按原样（或 HTTP 状态）显示。
 */
var DESCRIBED_MCP_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8433gxg0.js:348", () => {
  DESCRIBED_MCP_ERROR_CODES = new Set([
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
});
//@ chunk-8433gxg0.js:707-952 placement
function describeMcpServerError(client) {
  let origin = describeMcpServerOrigin(client.name, client.config, {
    detail: "origin",
  });
  let errorCode = client.errorCode;
  let redact = (error) => redactMcpErrorDetail(client.name, client.config, error);
  if (errorCode !== undefined && DESCRIBED_MCP_ERROR_CODES.has(errorCode))
    return client.error !== undefined ? redact(client.error) : errorCode;
  if (errorCode) {
    let codeText = formatMcpErrorCode(errorCode);
    return origin ? `${codeText} at ${origin}` : codeText;
  }
  return client.error !== undefined ? redact(client.error) : "";
}
//@ chunk-8433gxg0.js:952-1068 placement
/**
 * 错误码显示：“23” 为请求超时，100–599 为 “HTTP xxx”，其余原样。
 */
function formatMcpErrorCode(errorCode) {
  let numericCode = Number(errorCode);
  return errorCode === "23"
    ? "request timed out"
    : Number.isInteger(numericCode) && numericCode >= 100 && numericCode <= 599
      ? `HTTP ${errorCode}`
      : errorCode;
}
//@ chunk-8433gxg0.js:1068-1343 placement
/**
 * mcp 健康检查的错误文本：拼接错误码、错误与显示细节并对敏感信息脱敏。
 */
function formatMcpHealthError(client) {
  let { errorCode, displayDetail } = client;
  let sanitize = (detail) => sanitizeErrorDetail(redactMcpErrorDetail(client.name, client.config, detail));
  if (errorCode && !DESCRIBED_MCP_ERROR_CODES.has(errorCode)) {
    let codeText = formatMcpErrorCode(errorCode);
    let error = client.error;
    let message =
      error === undefined
        ? codeText
        : error === codeText || error.startsWith(`${codeText}: `)
          ? error
          : `${codeText}: ${error}`;
    return sanitize(displayDetail ? `${message} ${displayDetail}` : message);
  }
  let baseError = client.error ?? errorCode ?? "";
  let combined = displayDetail ? `${baseError} ${displayDetail}`.trim() : baseError;
  return combined === "" ? combined : sanitize(combined);
}
//@ chunk-8433gxg0.js:1343-2737 fingerprint = handleReconnectResult (0.557)
function handleReconnectResult(result, name, options, detail) {
  switch (result.client.type) {
    case "connected":
      if (result.client.discoveryBearerRejected)
        return {
          message: `Reconnected to ${normalizeServerNameShort(name)}, but your claude.ai session token was rejected. Run /login, then reconnect.`,
          success: false,
        };
      if (result.client.toolsListError) {
        if (options.persistsOffBox) {
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
        message: detail?.hasHeadersHelper
          ? `${normalizeServerNameShort(name)} requires authentication. Use 'Authenticate' if the upstream server uses OAuth, or check the headersHelper script and use 'Reconnect'.`
          : `${normalizeServerNameShort(name)} requires authentication. Use the 'Authenticate' option.`,
        success: false,
      };
    case "failed": {
      let failure = describeMcpServerError(result.client);
      if (options.persistsOffBox) {
        if (failure)
          logForDebugging(`mcp reconnect failed for ${sanitizeTelemetryString(name)}: ${failure}`, {
            level: "error",
          });
        return {
          message: `Failed to reconnect to ${normalizeServerNameShort(name)}${failure ? " (detail withheld on this connection)" : ""}.`,
          success: false,
        };
      }
      return {
        message: failure
          ? `Failed to reconnect to ${normalizeServerNameShort(name)}: ${normalizeMcpServerName(failure)}`
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
function handleReconnectError(error, name, options) {
  let errorMessage_2 = options.config
    ? redactMcpErrorDetail(name, options.config, errorMessage(error))
    : errorMessage(error);
  if (error instanceof WireSafeControlError)
    return normalizeMcpServerName(errorMessage(error), undefined, "none");
  if (options.persistsOffBox) {
    logForDebugging(`mcp reconnect error for ${sanitizeTelemetryString(name)}: ${errorMessage_2}`, {
      level: "error",
    });
    return `Error reconnecting to ${normalizeServerNameShort(name)} (detail withheld on this connection).`;
  }
  return `Error reconnecting to ${normalizeServerNameShort(name)}: ${normalizeMcpServerName(errorMessage_2)}`;
}
//@ chunk-8433gxg0.js:3053-3379 placement
function formatMcpOperationFailure(error, name, action, options) {
  let detail = options.config
    ? redactMcpErrorDetail(name, options.config, errorMessage(error))
    : errorMessage(error);
  if (error instanceof WireSafeControlError)
    return normalizeMcpServerName(errorMessage(error), undefined, "none");
  if (options.persistsOffBox) {
    logForDebugging(`mcp ${action} failed for ${sanitizeTelemetryString(name)}: ${detail}`, {
      level: "error",
    });
    return `Failed to ${action} MCP server "${normalizeServerNameShort(name)}" (detail withheld on this connection).`;
  }
  return `Failed to ${action} MCP server "${normalizeServerNameShort(name)}": ${normalizeMcpServerName(detail)}`;
}
export {
  handleReconnectResult,
  handleReconnectError,
  formatMcpOperationFailure,
  formatMcpHealthError,
  describeMcpServerError,
};

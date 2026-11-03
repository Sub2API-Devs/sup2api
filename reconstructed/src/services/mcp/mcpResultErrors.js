/**
 * services/mcp/mcpResultErrors.ts
 *
 * 2.1.316 新增：MCP 结果错误处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cyj440je.js (9)
 * attribution: placement 9
 */
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  BUN_CONNECTION_CLOSED_MESSAGE_PREFIX,
} from "../../utils/errors.js";
import {
  McpAuthError,
  McpCredentialStoreUnavailableError,
  McpSessionExpiredError,
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./client.js";

//@ chunk-cyj440je.js:2427-2700 placement
/**
 * MCP 服务器返回结果未通过 schema 校验时抛出的错误（McpResponseSchemaError），消息含服务器名与校验信息，cause 保留原错误。
 */
class McpResponseSchemaError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e, error) {
    let o = typeof error?.message === "string" ? error.message : String(error);
    super(
      `MCP server "${e}" returned a malformed result that failed schema validation: ${o}`,
      "MCP server returned a malformed result",
    );
    this.name = "McpResponseSchemaError";
    this.cause = error;
  }
}
//@ chunk-cyj440je.js:2700-3510 placement
class McpToolResultNotReadError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  mcpErrorSource;
  why;
  constructor(serverName, tool, o) {
    if (o.kind === "too_large")
      super(
        `The response from MCP server "${serverName}" for tool "${tool}" was larger than ${Math.round(o.capBytes / 1024 / 1024)}MB, so it was not read. The tool may have run: check whether it did before running it again, and when you run it again, ask for less data.`,
        "MCP tool response over the size cap",
      );
    else
      super(
        `The connection to MCP server "${serverName}" was closed because a message from the server was too large or could not be parsed, so the result of tool "${tool}" was not read. The tool may have run: check whether it did before running it again.`,
        "MCP connection closed after an unreadable server message",
      );
    this.name = "McpToolResultNotReadError";
    this.why = o;
    this.mcpErrorSource = o.kind === "too_large" ? "downstream_error" : "downstream_unreachable";
  }
}
//@ chunk-cyj440je.js:3510-3581 placement
/**
 * 判断错误文本是否为“认证挑战后消息格式错误”。
 */
function isMalformedAfterAuthChallenge(closeReason) {
  return closeReason === "malformed message after an auth challenge";
}
//@ chunk-cyj440je.js:3581-4059 placement
class McpStructuredContentNotReadError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  mcpErrorSource = "downstream_error";
  constructor(name, name_2) {
    super(
      `The structured content in the response from MCP server "${name}" for tool "${name_2}" was not read here. This happens most often when it is too large, is nested too deep or holds a number that is too large. The tool may have run: check whether it did before calling it again, and ask for less data.`,
      "MCP tool response with structured content that is not read",
    );
    this.name = "McpStructuredContentNotReadError";
  }
}
//@ chunk-cyj440je.js:4059-4162 placement
/**
 * 判断错误文本是否表示响应体被截断（过大或 JSON-RPC 消息被截断）。
 */
function isTruncatedBodyError(closeReason) {
  return (
    closeReason === "http body overflow" || closeReason === "malformed JSON-RPC message (response truncated)"
  );
}
//@ chunk-cyj440je.js:4162-4733 placement
/**
 * MCP 错误分类常量：CCR 需批准与 URL elicitation 错误码、错误来源列表，以及不可达、配置错误与连接类错误码集合。
 */
var CCR_NEEDS_APPROVAL_CODE = -32003;
var URL_ELICITATION_REQUIRED_CODE = -32042;
var MCP_ERROR_SOURCES = ["downstream_error", "downstream_unreachable", "user_auth", "user_config", "other"];
var MCP_ERROR_SOURCE_SET = new Set(MCP_ERROR_SOURCES);
var UNREACHABLE_ERRNOS = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNABORTED",
  "ENOTFOUND",
  "ENETUNREACH",
  "EAI_AGAIN",
  "ConnectionRefused",
  "ConnectionClosed",
  "FailedToOpenSocket",
  "ERR_SOCKET_CLOSED",
  "ERR_PROXY_TUNNEL",
]);
var CONFIG_ERRNOS = new Set(["ERR_INVALID_URL", "MODULE_NOT_FOUND", "ENOENT", "ENOEXEC", "EACCES", "EPERM"]);
var UNREACHABLE_CODES = new Set([
  "ESOCKETTIMEDOUT",
  "EHOSTUNREACH",
  "EPIPE",
  "CONNECT_TIMEOUT",
  "CONNECT_SUSPENDED",
  "REQUEST_TIMEOUT",
  "CONNECTION_CLOSED",
  "NOT_CONNECTED",
  "SEND_FAILED",
]);
//@ chunk-cyj440je.js:4733-4862 placement
function isHttpAuthErrorMessage(error) {
  return (
    ("errorCode" in error && typeof error.errorCode === "string" ? error.errorCode : getErrnoCode(error)) !==
      undefined && /^HTTP 40[13]\b/.test(error.message)
  );
}
//@ chunk-cyj440je.js:4862-4892 placement
/**
 * 把 MCP 错误归类为下游错误/不可达/用户认证/用户配置/其他。
 */
function classifyMcpErrorSourceCategory(error) {
  return classifyMcpErrorSource(error, false);
}
//@ chunk-cyj440je.js:4892-6314 placement
/**
 * 把 MCP 错误归到来源类别：downstream_error / downstream_unreachable / user_auth / user_config / other；依次看显式标注、错误类型、JSON-RPC/HTTP 状态码、errno，必要时沿 cause 链向下最多查 4 层。
 */
function classifyMcpErrorSource(error, isCause) {
  let declared =
    error !== null && typeof error === "object" && "mcpErrorSource" in error
      ? error.mcpErrorSource
      : undefined;
  if (typeof declared === "string" && MCP_ERROR_SOURCE_SET.has(declared)) return declared;
  if (error instanceof DOMException)
    return error.name === "TimeoutError" ? "downstream_unreachable" : "other";
  if (!(error instanceof Error)) return "other";
  if (error instanceof McpAuthError || error instanceof McpCredentialStoreUnavailableError)
    return "user_auth";
  if (error instanceof McpSessionExpiredError)
    return error.expiryKind === "session_expired_404" ? "downstream_error" : "downstream_unreachable";
  if (
    error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
    error instanceof McpResponseSchemaError
  )
    return "downstream_error";
  if (isHttpAuthErrorMessage(error)) return "user_auth";
  let statusCode =
    "code" in error && typeof error.code === "number"
      ? error.code
      : "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;
  if (statusCode !== undefined) {
    if (statusCode === CCR_NEEDS_APPROVAL_CODE || statusCode === URL_ELICITATION_REQUIRED_CODE)
      return "other";
    if (statusCode === -32001 || statusCode === -32000) return "downstream_unreachable";
    if (statusCode < -32000) return "downstream_error";
    if (statusCode === 401 || statusCode === 403)
      return error.name === "McpError" || error.name === "ProtocolError" || statusCode === 403
        ? "downstream_error"
        : "user_auth";
    if (statusCode >= 400 && statusCode <= 599) return "downstream_error";
    return error.name === "McpError" || error.name === "ProtocolError" ? "downstream_error" : "other";
  }
  let errno = getErrnoCode(error);
  if (errno !== undefined) {
    if (errno === "CLAUDEAI_BEARER_REJECTED") return "user_auth";
    if (CONFIG_ERRNOS.has(errno) || errno.includes("CERT") || errno.startsWith("UNABLE_TO_"))
      return "user_config";
    if (UNREACHABLE_ERRNOS.has(errno) || UNREACHABLE_CODES.has(errno)) return "downstream_unreachable";
  }
  if (error.message.startsWith(BUN_CONNECTION_CLOSED_MESSAGE_PREFIX)) return "downstream_unreachable";
  if (!isCause) {
    let cause = error.cause;
    for (let idx = 0; idx < 4 && cause !== undefined; idx++) {
      let s = classifyMcpErrorSource(cause, true);
      if (s !== "other") return s;
      cause = cause instanceof Error ? cause.cause : undefined;
    }
  }
  return "other";
}
export {
  classifyMcpErrorSourceCategory,
  CCR_NEEDS_APPROVAL_CODE,
  isTruncatedBodyError,
  McpToolResultNotReadError,
  isMalformedAfterAuthChallenge,
  McpResponseSchemaError,
  UNREACHABLE_ERRNOS,
  McpStructuredContentNotReadError,
};

/**
 * @anthropic-ai/sdk/core/error.mjs
 *
 * @anthropic-ai/sdk 的 API 错误类（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2g090z7k.js (14)
 * attribution: esm-layout 1, esm-fingerprint 5, layout 1, placement 7
 */
import { castToError } from "../internal/errors.mjs";

//@ chunk-2g090z7k.js:792-841 esm-layout
var AnthropicError = (() => {
  class AnthropicError extends Error {}
  return AnthropicError;
})();
//@ chunk-2g090z7k.js:841-1727 esm-fingerprint
class APIError extends AnthropicError {
  constructor(status, error, message, headers, type) {
    super(`${APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.requestID = headers?.get("request-id");
    this.workspaceID = headers?.get("anthropic-workspace-id");
    this.error = error;
    this.type = type ?? null;
  }
  static makeMessage(status, error, message) {
    let msg = error?.message
      ? typeof error.message === "string"
        ? error.message
        : JSON.stringify(error.message)
      : error
        ? JSON.stringify(error)
        : message;
    if (status && msg) return `${status} ${msg}`;
    if (status) return `${status} status code (no body)`;
    if (msg) return msg;
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers)
      return new APIConnectionError({
        message,
        cause: castToError(errorResponse),
      });
    let error = errorResponse;
    let type = error?.error?.type;
    if (status === 400) return new BadRequestError(status, error, message, headers, type);
    if (status === 401) return new AuthenticationError(status, error, message, headers, type);
    if (status === 403) return new PermissionDeniedError(status, error, message, headers, type);
    if (status === 404) return new NotFoundError(status, error, message, headers, type);
    if (status === 409) return new ConflictError(status, error, message, headers, type);
    if (status === 422) return new UnprocessableEntityError(status, error, message, headers, type);
    if (status === 429) return new RateLimitError(status, error, message, headers, type);
    if (status >= 500) return new InternalServerError(status, error, message, headers, type);
    return new APIError(status, error, message, headers, type);
  }
}
//@ chunk-2g090z7k.js:1727-1830 esm-fingerprint
class APIUserAbortError extends APIError {
  constructor({ message } = {}) {
    super(undefined, undefined, message || "Request was aborted.", undefined);
  }
}
//@ chunk-2g090z7k.js:1830-1953 esm-fingerprint
class APIConnectionError extends APIError {
  constructor({ message, cause }) {
    super(undefined, undefined, message || "Connection error.", undefined);
    if (cause) this.cause = cause;
  }
}
//@ chunk-2g090z7k.js:1953-2043 esm-fingerprint
class APIConnectionTimeoutError extends APIConnectionError {
  constructor({ message } = {}) {
    super({
      message: message ?? "Request timed out.",
    });
  }
}
//@ chunk-2g090z7k.js:2043-2149 esm-fingerprint
class RetryableError extends AnthropicError {
  constructor(message, { cause } = {}) {
    super(message ?? "Retryable error.");
    if (cause !== undefined) this.cause = cause;
  }
}
//@ chunk-2g090z7k.js:2149-2171 layout
class BadRequestError extends APIError {}
//@ chunk-2g090z7k.js:2171-2193 placement
class AuthenticationError extends APIError {}
//@ chunk-2g090z7k.js:2193-2215 placement
class PermissionDeniedError extends APIError {}
//@ chunk-2g090z7k.js:2215-2237 placement
class NotFoundError extends APIError {}
//@ chunk-2g090z7k.js:2237-2259 placement
class ConflictError extends APIError {}
//@ chunk-2g090z7k.js:2259-2281 placement
class UnprocessableEntityError extends APIError {}
//@ chunk-2g090z7k.js:2281-2303 placement
class RateLimitError extends APIError {}
//@ chunk-2g090z7k.js:2303-2325 placement
class InternalServerError extends APIError {}
export {
  APIUserAbortError,
  APIError,
  APIConnectionTimeoutError,
  APIConnectionError,
  AnthropicError,
  NotFoundError,
  AuthenticationError,
  BadRequestError,
  PermissionDeniedError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  RetryableError,
};

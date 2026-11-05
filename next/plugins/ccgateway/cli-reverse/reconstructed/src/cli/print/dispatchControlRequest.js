/**
 * cli/print/dispatchControlRequest.ts
 *
 * SDK 控制请求分发（dispatchControlRequest）与统一的成功/错误应答包装
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0tcpyvr1.js (2), chunk-nh1pvp1m.js (1), chunk-vxsfen55.js (1)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  errorMessage,
  WireSafeControlError,
  withTelemetryMessage,
  toError,
  sanitizeErrorName,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { QueuedNotificationError } from "../../services/queuedNotifications/queuedNotifications.js";
import { SDKControlReloadPluginsRequestSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { CONTROL_REQUEST_HANDLERS } from "./sessionControlRequests.js";

//@ chunk-0tcpyvr1.js:1399-1699 placement
/**
 * 控制请求处理失败时记录日志并生成 error 响应（预期拒绝只记警告，可安全上报的错误给出清洗后的消息）。
 */
function controlHandlerError(redact, subtype, error, { expected = false } = {}) {
  if (expected) {
    let message = errorMessage(error);
    let detail = message.startsWith(`${subtype}: `) ? message.slice(subtype.length + 2) : message;
    logForDebugging(`${subtype}: refused: ${detail}`, {
      level: "warn",
    });
  } else if (redact && !(error instanceof WireSafeControlError)) logHandlerFailure(true, subtype, error);
  else logError(withTelemetryMessage(toError(error), `${subtype}: handler failed`));
  return {
    subtype: "error",
    error:
      error instanceof WireSafeControlError
        ? sanitizeTelemetryString(errorMessage(error))
        : redact
          ? `${subtype} failed`
          : errorMessage(error),
  };
}
//@ chunk-0tcpyvr1.js:1699-1921 placement
/**
 * 记录处理器失败：可上报模式下只上报处理器名与错误类名（不含消息正文）。
 */
function logHandlerFailure(redact, subtype, error) {
  if (!redact || error instanceof WireSafeControlError) {
    logError(error);
    return;
  }
  logForDebugging(`${subtype}: handler failed: ${errorMessage(error)}`, {
    level: "error",
  });
  let errorName = error instanceof Error ? sanitizeErrorName(error) : undefined;
  let message =
    errorName === undefined ? `${subtype}: handler failed` : `${subtype}: handler failed (${errorName})`;
  logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(message));
}
//@ chunk-nh1pvp1m.js:130731-131062 placement
/**
 * 运行控制请求处理器并统一包装 success/error 应答（同步或 Promise）。
 */
function wrapControlHandler(handler, request, storageV5) {
  let toErrorResponse = (error) => {
    if (error instanceof QueuedNotificationError)
      return {
        subtype: "error",
        error: error.message,
      };
    return controlHandlerError(
      SDKControlReloadPluginsRequestSchema(storageV5, request.subtype),
      request.subtype,
      error,
      {
        expected: error instanceof WireSafeControlError,
      },
    );
  };
  try {
    let result = handler(request, storageV5);
    if (result instanceof Promise)
      return result.then(
        (resolvedValue) => ({
          subtype: "success",
          response: resolvedValue ?? undefined,
        }),
        toErrorResponse,
      );
    return {
      subtype: "success",
      response: result ?? undefined,
    };
  } catch (error) {
    return toErrorResponse(error);
  }
}
//@ chunk-vxsfen55.js:46254-46310 placement
function dispatchControlRequest(request, wireContext) {
  let handler = CONTROL_REQUEST_HANDLERS[request.subtype];
  return wrapControlHandler(handler, request, wireContext);
}
export { logHandlerFailure, controlHandlerError, dispatchControlRequest, wrapControlHandler };

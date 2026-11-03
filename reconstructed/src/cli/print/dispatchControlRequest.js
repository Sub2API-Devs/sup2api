/**
 * cli/print/dispatchControlRequest.ts
 *
 * SDK 控制请求分发（dispatchControlRequest）与统一的成功/错误应答包装
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (1), chunk-nkdv7dw8.js (1), chunk-ynfbqx38.js (2)
 * attribution: placement 4
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
import { CONTROL_REQUEST_HANDLERS } from "./sessionControlRequests.js";

//@ chunk-ynfbqx38.js:1081-1381 placement
/**
 * 控制请求处理失败时记录日志并生成 error 响应（预期拒绝只记警告，可安全上报的错误给出清洗后的消息）。
 */
function controlHandlerError(e, n, s, { expected: r = false } = {}) {
  if (r) {
    let c = errorMessage(s);
    let a = c.startsWith(`${n}: `) ? c.slice(n.length + 2) : c;
    logForDebugging(`${n}: refused: ${a}`, {
      level: "warn",
    });
  } else if (e && !(s instanceof WireSafeControlError)) logHandlerFailure(true, n, s);
  else logError(withTelemetryMessage(toError(s), `${n}: handler failed`));
  return {
    subtype: "error",
    error:
      s instanceof WireSafeControlError
        ? sanitizeTelemetryString(errorMessage(s))
        : e
          ? `${n} failed`
          : errorMessage(s),
  };
}
//@ chunk-ynfbqx38.js:1381-1603 placement
/**
 * 记录处理器失败：可上报模式下只上报处理器名与错误类名（不含消息正文）。
 */
function logHandlerFailure(e, n, error) {
  if (!e || error instanceof WireSafeControlError) {
    logError(error);
    return;
  }
  logForDebugging(`${n}: handler failed: ${errorMessage(error)}`, {
    level: "error",
  });
  let r = error instanceof Error ? sanitizeErrorName(error) : undefined;
  let c = r === undefined ? `${n}: handler failed` : `${n}: handler failed (${r})`;
  logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(c));
}
//@ chunk-0sfjpx19.js:135242-135581 placement
/**
 * 运行控制请求处理器并统一包装 success/error 应答（同步或 Promise）。
 */
function wrapControlHandler(e, n, r) {
  let s = (error) => {
    if (error instanceof QueuedNotificationError)
      return {
        subtype: "error",
        error: error.message,
      };
    return controlHandlerError(r.redactsPersistedLane(), n.subtype, error, {
      expected: error instanceof WireSafeControlError,
    });
  };
  try {
    let h = e(n, r);
    if (h instanceof Promise)
      return h.then(
        (y) => ({
          subtype: "success",
          response: y ?? undefined,
        }),
        s,
      );
    return {
      subtype: "success",
      response: h ?? undefined,
    };
  } catch (error) {
    return s(error);
  }
}
//@ chunk-nkdv7dw8.js:41968-42024 placement
function dispatchControlRequest(request, n) {
  let o = CONTROL_REQUEST_HANDLERS[request.subtype];
  return wrapControlHandler(o, request, n);
}
export { wrapControlHandler, controlHandlerError, dispatchControlRequest, logHandlerFailure };

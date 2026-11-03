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
import { Pz } from "../../services/queuedNotifications/queuedNotifications.js";
import { CONTROL_REQUEST_HANDLERS } from "./sessionControlRequests.js";

/**
 * 控制请求处理失败时记录日志并生成 error 响应（预期拒绝只记警告，可安全上报的错误给出清洗后的消息）。
 */
//@ chunk-ynfbqx38.js:1081-1381 placement
function controlHandlerError(e, n, s, { expected: r = !1 } = {}) {
  if (r) {
    let c = errorMessage(s),
      a = c.startsWith(`${n}: `) ? c.slice(n.length + 2) : c;
    logForDebugging(`${n}: refused: ${a}`, { level: "warn" });
  } else if (e && !(s instanceof WireSafeControlError)) logHandlerFailure(!0, n, s);
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
/**
 * 记录处理器失败：可上报模式下只上报处理器名与错误类名（不含消息正文）。
 */
//@ chunk-ynfbqx38.js:1381-1603 placement
function logHandlerFailure(e, n, s) {
  if (!e || s instanceof WireSafeControlError) {
    logError(s);
    return;
  }
  logForDebugging(`${n}: handler failed: ${errorMessage(s)}`, { level: "error" });
  let r = s instanceof Error ? sanitizeErrorName(s) : void 0,
    c = r === void 0 ? `${n}: handler failed` : `${n}: handler failed (${r})`;
  logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(c));
}
/**
 * 运行控制请求处理器并统一包装 success/error 应答（同步或 Promise）。
 */
//@ chunk-0sfjpx19.js:135242-135581 placement
function wrapControlHandler(e, n, r) {
  let s = (h) => {
    if (h instanceof Pz) return { subtype: "error", error: h.message };
    return controlHandlerError(r.redactsPersistedLane(), n.subtype, h, {
      expected: h instanceof WireSafeControlError,
    });
  };
  try {
    let h = e(n, r);
    if (h instanceof Promise) return h.then((y) => ({ subtype: "success", response: y ?? void 0 }), s);
    return { subtype: "success", response: h ?? void 0 };
  } catch (error) {
    return s(error);
  }
}
//@ chunk-nkdv7dw8.js:41968-42024 placement
function dispatchControlRequest(e, n) {
  let o = CONTROL_REQUEST_HANDLERS[e.subtype];
  return wrapControlHandler(o, e, n);
}

export { wrapControlHandler, controlHandlerError, dispatchControlRequest, logHandlerFailure };

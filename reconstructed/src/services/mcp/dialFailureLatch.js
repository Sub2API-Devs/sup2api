/**
 * services/mcp/dialFailureLatch.ts
 *
 * 2.1.316 新增。MCP 懒拨号失败闩锁。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sw4g2q2j.js (4)
 * attribution: placement 4
 */
import {
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { isHiddenReplyServer, appToolServerUnavailableText } from "./appToolServerErrors.js";
import { getConnectionTimeoutMs } from "./client.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";

//@ chunk-sw4g2q2j.js:341-983 placement
/**
 * 带超时与中止的懒拨号
 */
function boundDialWithLatch(i, signal, serverName, context = "connection", signal_2) {
  let e = () =>
    signal_2?.aborted
      ? new AbortError(`${context} for '${serverName}' aborted`)
      : Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            isHiddenReplyServer(serverName)
              ? appToolServerUnavailableText("failed_retrying")
              : `${context} for '${serverName}' timed out connecting`,
            "MCP lazy dial timed out connecting",
          ),
          {
            mcpErrorSource: "downstream_unreachable",
          },
        );
  if (signal.aborted) {
    i.catch(() => {});
    return Promise.reject(
      signal_2?.aborted
        ? new AbortError(`${context} for '${serverName}' aborted before connect`)
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${context} for '${serverName}' aborted before connect`,
            "MCP lazy dial aborted before connect",
          ),
    );
  }
  return new Promise((resolve, reject) => {
    let c = () => reject(e());
    signal.addEventListener("abort", c, {
      once: true,
    });
    i.then(
      (l) => {
        signal.removeEventListener("abort", c);
        resolve(l);
      },
      (error) => {
        signal.removeEventListener("abort", c);
        reject(error);
      },
    );
  });
}
//@ chunk-sw4g2q2j.js:983-1160 placement
async function boundDial(i, r) {
  let timeoutMs = r.timeoutMs ?? getConnectionTimeoutMs();
  let { signal, cleanup } = createCombinedAbortSignal(r.signal, {
    timeoutMs,
    refTimer: true,
  });
  try {
    return await boundDialWithLatch(i, signal, r.serverName, r.context, r.signal);
  } finally {
    cleanup();
  }
}
//@ chunk-sw4g2q2j.js:1160-1180 placement
/**
 * 拨号失败闩锁的默认最长保持时间（300000 毫秒）。
 */
var DEFAULT_BASE_HOLD_MS = 5000;
var DEFAULT_MAX_HOLD_MS = 300000;
//@ chunk-sw4g2q2j.js:1180-1562 placement
/**
 * MCP 懒拨号失败闩锁。
 */
function createDialFailureLatch(i) {
  let baseHoldMs = i?.baseHoldMs ?? DEFAULT_BASE_HOLD_MS;
  let maxHoldMs = i?.maxHoldMs ?? DEFAULT_MAX_HOLD_MS;
  let n = new Map();
  let a = (e, t) => {
    let s = n.get(e);
    return s !== undefined && t < s.holdUntil;
  };
  return {
    shouldSkip(e, t = Date.now()) {
      return a(e, t);
    },
    recordFailure(e, t = Date.now()) {
      if (a(e, t)) return;
      let c = (n.get(e)?.count ?? 0) + 1;
      let min = Math.min(maxHoldMs, baseHoldMs * 2 ** (c - 1));
      n.set(e, {
        count: c,
        holdUntil: t + min,
      });
    },
    recordSuccess(e) {
      n.delete(e);
    },
    holdUntil(e) {
      return n.get(e)?.holdUntil;
    },
  };
}
export { createDialFailureLatch, boundDial };

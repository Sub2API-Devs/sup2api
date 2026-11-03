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
import { b2, appToolServerUnavailableText } from "./appToolServerErrors.js";
import { getConnectionTimeoutMs } from "./client.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";

/**
 * 带超时与中止的懒拨号
 */
//@ chunk-sw4g2q2j.js:341-983 placement
function boundDialWithLatch(i, r, o, n = "connection", a) {
  let e = () =>
    a?.aborted
      ? new AbortError(`${n} for '${o}' aborted`)
      : Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            b2(o) ? appToolServerUnavailableText("failed_retrying") : `${n} for '${o}' timed out connecting`,
            "MCP lazy dial timed out connecting",
          ),
          { mcpErrorSource: "downstream_unreachable" },
        );
  if (r.aborted)
    return (
      i.catch(() => {}),
      Promise.reject(
        a?.aborted
          ? new AbortError(`${n} for '${o}' aborted before connect`)
          : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${n} for '${o}' aborted before connect`,
              "MCP lazy dial aborted before connect",
            ),
      )
    );
  return new Promise((t, s) => {
    let c = () => s(e());
    (r.addEventListener("abort", c, { once: !0 }),
      i.then(
        (l) => {
          (r.removeEventListener("abort", c), t(l));
        },
        (l) => {
          (r.removeEventListener("abort", c), s(l));
        },
      ));
  });
}
//@ chunk-sw4g2q2j.js:983-1160 placement
async function boundDial(i, r) {
  let o = r.timeoutMs ?? getConnectionTimeoutMs(),
    { signal: signal, cleanup: cleanup } = createCombinedAbortSignal(r.signal, {
      timeoutMs: o,
      refTimer: !0,
    });
  try {
    return await boundDialWithLatch(i, signal, r.serverName, r.context, r.signal);
  } finally {
    cleanup();
  }
}
//@ chunk-sw4g2q2j.js:1160-1180 placement
var d = 5000,
  m = 300000;
/**
 * MCP 懒拨号失败闩锁。
 */
//@ chunk-sw4g2q2j.js:1180-1562 placement
function createDialFailureLatch(i) {
  let r = i?.baseHoldMs ?? d,
    o = i?.maxHoldMs ?? m,
    n = new Map(),
    a = (e, t) => {
      let s = n.get(e);
      return s !== void 0 && t < s.holdUntil;
    };
  return {
    shouldSkip(e, t = Date.now()) {
      return a(e, t);
    },
    recordFailure(e, t = Date.now()) {
      if (a(e, t)) return;
      let c = (n.get(e)?.count ?? 0) + 1,
        min = Math.min(o, r * 2 ** (c - 1));
      n.set(e, { count: c, holdUntil: t + min });
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

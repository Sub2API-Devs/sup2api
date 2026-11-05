/**
 * services/mcp/dialFailureLatch.ts
 *
 * 2.1.316 新增。MCP 懒拨号失败闩锁。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f7j1db99.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { isHiddenReplyServer, appToolServerUnavailableText } from "./appToolServerErrors.js";
import { getConnectionTimeoutMs } from "./client.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";

//@ chunk-f7j1db99.js:341-983 placement
/**
 * 带超时与中止的懒拨号
 */
function boundDialWithLatch(dial, signal, serverName, context = "connection", signal_2) {
  let makeTimeoutError = () =>
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
    dial.catch(() => {});
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
    let onAbort = () => reject(makeTimeoutError());
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    dial.then(
      (connection) => {
        signal.removeEventListener("abort", onAbort);
        resolve(connection);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}
//@ chunk-f7j1db99.js:983-1160 placement
async function boundDial(dial, options) {
  let timeoutMs = options.timeoutMs ?? getConnectionTimeoutMs();
  let { signal, cleanup } = createCombinedAbortSignal(options.signal, {
    timeoutMs,
    refTimer: true,
  });
  try {
    return await boundDialWithLatch(dial, signal, options.serverName, options.context, options.signal);
  } finally {
    cleanup();
  }
}
//@ chunk-f7j1db99.js:1160-1180 placement
/**
 * 拨号失败闩锁的默认最长保持时间（300000 毫秒）。
 */
var DEFAULT_BASE_HOLD_MS = 5000;
var DEFAULT_MAX_HOLD_MS = 300000;
//@ chunk-f7j1db99.js:1180-1562 placement
/**
 * MCP 懒拨号失败闩锁。
 */
function createDialFailureLatch(options) {
  let baseHoldMs = options?.baseHoldMs ?? DEFAULT_BASE_HOLD_MS;
  let maxHoldMs = options?.maxHoldMs ?? DEFAULT_MAX_HOLD_MS;
  let holds = new Map();
  let isHeld = (key, now) => {
    let hold = holds.get(key);
    return hold !== undefined && now < hold.holdUntil;
  };
  return {
    shouldSkip(key, now = Date.now()) {
      return isHeld(key, now);
    },
    recordFailure(key, now = Date.now()) {
      if (isHeld(key, now)) return;
      let failureCount = (holds.get(key)?.count ?? 0) + 1;
      let min = Math.min(maxHoldMs, baseHoldMs * 2 ** (failureCount - 1));
      holds.set(key, {
        count: failureCount,
        holdUntil: now + min,
      });
    },
    recordSuccess(key) {
      holds.delete(key);
    },
    holdUntil(key) {
      return holds.get(key)?.holdUntil;
    },
  };
}
export { boundDial, createDialFailureLatch };

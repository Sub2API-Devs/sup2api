/**
 * utils/boundedTimeout.ts
 *
 * 2.1.316 新增：带超时的 Promise（BoundedTimeoutError）与文件系统操作卡住检测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-646wnty1.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-646wnty1.js:191-348 placement
class BoundedTimeoutError extends Error {
  label;
  timeoutMs;
  constructor(label, timeoutMs) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.label = label;
    this.timeoutMs = timeoutMs;
    this.name = "BoundedTimeoutError";
  }
}
//@ chunk-646wnty1.js:348-554 placement
/**
 * 给 Promise 加超时：超时抛 BoundedTimeoutError（延迟上限 2^31−1 毫秒），结束后清除定时器并吞掉原 Promise 的后续拒绝。
 */
async function withBoundedTimeout(promise, timeoutMs, label) {
  let timer;
  let promise_2 = new Promise((resolve, reject) => {
    timer = setTimeout(
      (reject, label, timeoutMs) => reject(new BoundedTimeoutError(label, timeoutMs)),
      Math.min(timeoutMs, 2147483647),
      reject,
      label,
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, promise_2]);
  } finally {
    if (timer) clearTimeout(timer);
    promise.catch(() => {});
  }
}
//@ chunk-646wnty1.js:554-567 placement
/**
 * 单次文件系统操作的超时（5 秒）。
 */
var FS_OP_TIMEOUT_MS = 5000;
//@ chunk-646wnty1.js:567-659 placement
/**
 * 给文件系统操作套上超时与 “runner:stuck” 提示。
 */
function withFsOpTimeout(promise, operation) {
  return withBoundedTimeout(
    promise,
    FS_OP_TIMEOUT_MS,
    `[runner:stuck] fs op '${operation}' (check TMPDIR mount health)`,
  );
}
export { withBoundedTimeout, BoundedTimeoutError, FS_OP_TIMEOUT_MS, withFsOpTimeout };

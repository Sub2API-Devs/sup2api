/**
 * utils/boundedTimeout.ts
 *
 * 2.1.316 新增：带超时的 Promise（BoundedTimeoutError）与文件系统操作卡住检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jhr3szt9.js (4)
 * attribution: placement 4
 */

//@ chunk-jhr3szt9.js:191-348 placement
class BoundedTimeoutError extends Error {
  label;
  timeoutMs;
  constructor(e, r) {
    super(`${e} timed out after ${r}ms`);
    this.label = e;
    this.timeoutMs = r;
    this.name = "BoundedTimeoutError";
  }
}
//@ chunk-jhr3szt9.js:348-554 placement
/**
 * 给 Promise 加超时：超时抛 BoundedTimeoutError（延迟上限 2^31−1 毫秒），结束后清除定时器并吞掉原 Promise 的后续拒绝。
 */
async function withBoundedTimeout(e, r, n) {
  let t;
  let promise = new Promise((resolve, reject) => {
    t = setTimeout((s, u, m) => s(new BoundedTimeoutError(u, m)), Math.min(r, 2147483647), reject, n, r);
  });
  try {
    return await Promise.race([e, promise]);
  } finally {
    if (t) clearTimeout(t);
    e.catch(() => {});
  }
}
//@ chunk-jhr3szt9.js:554-567 placement
/**
 * 单次文件系统操作的超时（5 秒）。
 */
var FS_OP_TIMEOUT_MS = 5000;
//@ chunk-jhr3szt9.js:567-659 placement
/**
 * 给文件系统操作套上超时与 “runner:stuck” 提示。
 */
function withFsOpTimeout(e, r) {
  return withBoundedTimeout(e, FS_OP_TIMEOUT_MS, `[runner:stuck] fs op '${r}' (check TMPDIR mount health)`);
}
export { withBoundedTimeout, BoundedTimeoutError, FS_OP_TIMEOUT_MS, withFsOpTimeout };

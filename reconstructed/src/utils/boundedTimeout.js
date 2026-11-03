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
/**
 * 给 Promise 加超时：超时抛 BoundedTimeoutError（延迟上限 2^31−1 毫秒），结束后清除定时器并吞掉原 Promise 的后续拒绝。
 */
//@ chunk-jhr3szt9.js:348-554 placement
async function withBoundedTimeout(e, r, n) {
  let t,
    promise = new Promise((c, i) => {
      t = setTimeout((s, u, m) => s(new BoundedTimeoutError(u, m)), Math.min(r, 2147483647), i, n, r);
    });
  try {
    return await Promise.race([e, promise]);
  } finally {
    if (t) clearTimeout(t);
    e.catch(() => {});
  }
}
//@ chunk-jhr3szt9.js:554-567 placement
var Hln = 5000;
//@ chunk-jhr3szt9.js:567-659 placement
function z_(e, r) {
  return withBoundedTimeout(e, Hln, `[runner:stuck] fs op '${r}' (check TMPDIR mount health)`);
}

export { withBoundedTimeout, BoundedTimeoutError, Hln, z_ };

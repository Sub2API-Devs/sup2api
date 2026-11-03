/**
 * utils/concurrencyLimit.ts
 *
 * 2.1.316 新增：并发限制辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pjxxyp13.js (3)
 * attribution: placement 3
 */

/**
 * 包装异步函数使其并发数不超过 t，超出的调用排队等待。
 */
//@ chunk-pjxxyp13.js:191-422 placement
function limitConcurrency(t, i) {
  let e = 0,
    r = [];
  function s() {
    if (e < t) return (e++, Promise.resolve());
    return new Promise((n) => r.push(n));
  }
  function o() {
    let n = r.shift();
    if (n) n();
    else e--;
  }
  return async (...n) => {
    await s();
    try {
      return await i(...n);
    } finally {
      o();
    }
  };
}
//@ chunk-pjxxyp13.js:422-489 placement
function Idi(t, i, e) {
  let r = limitConcurrency(t, e);
  return async (s) => r(s, await i(s));
}
/**
 * 创建计数信号量：acquire 返回释放函数，同时持有数不超过 t。
 */
//@ chunk-pjxxyp13.js:489-593 placement
function createSemaphore(t) {
  let i = limitConcurrency(t, (e) => new Promise((r) => e(r)));
  return { acquire: () => new Promise((e) => void i(e)) };
}

export { limitConcurrency, createSemaphore, Idi };

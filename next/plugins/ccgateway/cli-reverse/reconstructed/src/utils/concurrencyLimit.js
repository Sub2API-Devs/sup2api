/**
 * utils/concurrencyLimit.ts
 *
 * 2.1.316 新增：并发限制辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bv0qpck0.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-bv0qpck0.js:191-422 placement
/**
 * 包装异步函数使其并发数不超过 t，超出的调用排队等待。
 */
function limitConcurrency(limit, fn) {
  let active = 0;
  let waiters = [];
  function acquire() {
    if (active < limit) {
      active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => waiters.push(resolve));
  }
  function release() {
    let next = waiters.shift();
    if (next) next();
    else active--;
  }
  return async (...args) => {
    await acquire();
    try {
      return await fn(...args);
    } finally {
      release();
    }
  };
}
//@ chunk-bv0qpck0.js:422-489 placement
/**
 * 先异步取得参数，再在并发限制内执行函数。
 */
function preloadThenLimit(limit, preload, fn) {
  let limited = limitConcurrency(limit, fn);
  return async (item) => limited(item, await preload(item));
}
//@ chunk-bv0qpck0.js:489-593 placement
/**
 * 创建计数信号量：acquire 返回释放函数，同时持有数不超过 t。
 */
function createSemaphore(limit) {
  let limited = limitConcurrency(limit, (resolve) => new Promise((resolve_2) => resolve(resolve_2)));
  return {
    acquire: () => new Promise((resolve) => void limited(resolve)),
  };
}
export { createSemaphore, limitConcurrency, preloadThenLimit };

/**
 * utils/promiseQueue.ts
 *
 * 2.1.316 新增：按键串行执行的队列；创建简单的异步互斥锁等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cf8h8052.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-cf8h8052.js:191-299 placement
/**
 * 把异步函数调用串行化。
 */
function serializeCalls(preparePluginsBucket) {
  let resolved = Promise.resolve();
  return (...args) => {
    let result = resolved.then(() => preparePluginsBucket(...args));
    resolved = result.catch(() => {});
    return result;
  };
}
//@ chunk-cf8h8052.js:299-425 placement
/**
 * 创建简单的异步互斥锁。
 */
function createMutex() {
  let resolved = Promise.resolve();
  return {
    acquire() {
      let release = () => {};
      let promise = new Promise((resolve) => {
        release = resolve;
      });
      let previous = resolved;
      resolved = promise;
      return previous.then(() => release);
    },
  };
}
//@ chunk-cf8h8052.js:425-433 placement
var MAX_QUEUE_BATCH = 5;
//@ chunk-cf8h8052.js:433-845 placement
/**
 * 按键串行执行的队列。
 */
function createKeyedQueue() {
  let queues = new Map();
  return {
    run(key, task) {
      let promise = (queues.get(key) ?? Promise.resolve()).then(() => task());
      let settledPromise = promise.then(
        () => {},
        () => {},
      );
      queues.set(key, settledPromise);
      settledPromise.then(() => {
        if (queues.get(key) === settledPromise) queues.delete(key);
      });
      return promise;
    },
    has(key) {
      return queues.has(key);
    },
    get size() {
      return queues.size;
    },
    async settle() {
      await Promise.all([...queues.values()]);
    },
    async drain() {
      for (let j = 0; j < MAX_QUEUE_BATCH; j++) {
        let pending = [...queues.values()];
        if (pending.length === 0) return;
        await Promise.all(pending);
      }
    },
    clearForTest() {
      queues.clear();
    },
  };
}
export { createKeyedQueue, serializeCalls, createMutex };

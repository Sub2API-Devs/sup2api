/**
 * utils/promiseQueue.ts
 *
 * 2.1.316 新增：按键串行执行的队列；创建简单的异步互斥锁等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kk3qtrqx.js (4)
 * attribution: placement 4
 */

//@ chunk-kk3qtrqx.js:191-299 placement
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
//@ chunk-kk3qtrqx.js:299-424 placement
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
//@ chunk-kk3qtrqx.js:424-432 placement
var MAX_QUEUE_BATCH = 5;
//@ chunk-kk3qtrqx.js:432-844 placement
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
export { serializeCalls, createKeyedQueue, createMutex };

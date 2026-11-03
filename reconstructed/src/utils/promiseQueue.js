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
  return (...i) => {
    let o = resolved.then(() => preparePluginsBucket(...i));
    resolved = o.catch(() => {});
    return o;
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
      let e = () => {};
      let promise = new Promise((resolve) => {
        e = resolve;
      });
      let o = resolved;
      resolved = promise;
      return o.then(() => e);
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
  let r = new Map();
  return {
    run(e, i) {
      let t = (r.get(e) ?? Promise.resolve()).then(() => i());
      let s = t.then(
        () => {},
        () => {},
      );
      r.set(e, s);
      s.then(() => {
        if (r.get(e) === s) r.delete(e);
      });
      return t;
    },
    has(e) {
      return r.has(e);
    },
    get size() {
      return r.size;
    },
    async settle() {
      await Promise.all([...r.values()]);
    },
    async drain() {
      for (let j = 0; j < MAX_QUEUE_BATCH; j++) {
        let i = [...r.values()];
        if (i.length === 0) return;
        await Promise.all(i);
      }
    },
    clearForTest() {
      r.clear();
    },
  };
}
export { serializeCalls, createKeyedQueue, createMutex };

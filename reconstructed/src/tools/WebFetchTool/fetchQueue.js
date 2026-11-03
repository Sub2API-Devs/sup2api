/**
 * tools/WebFetchTool/fetchQueue.ts
 *
 * 2.1.316 新增：WebFetch 请求排队
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { KeyedSemaphore } from "../../utils/keyedSemaphore.js";

//@ chunk-e6aww6q8.js:2157289-2157312 placement
class _1o extends KeyedSemaphore {}
//@ chunk-e6aww6q8.js:2157312-2157385 placement
var O6s = { seated: !1, release: () => {}, retake: () => {}, [Symbol.dispose]: () => {} };
/**
 * 占到信号量位置后执行函数，完成后释放；被中止时直接返回 undefined。
 */
//@ chunk-e6aww6q8.js:2157689-2157803 placement
async function runWithSlot(e, n, r, s, h) {
  let acquire = await e.acquire(n, r, s);
  if (acquire === void 0) return;
  try {
    return await h();
  } finally {
    acquire();
  }
}

export { _1o, O6s, runWithSlot };

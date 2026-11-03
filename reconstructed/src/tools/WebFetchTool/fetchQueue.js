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
/**
 * KeyedSemaphore 的本地子类（用于 WebFetch 抓取队列）。
 */
class KeyedSemaphoreSubclass extends KeyedSemaphore {}
//@ chunk-e6aww6q8.js:2157312-2157385 placement
/**
 * 表示“已完成、无需释放”的占位槽对象。
 */
var RELEASED_SLOT = {
  seated: false,
  release: () => {},
  retake: () => {},
  [Symbol.dispose]: () => {},
};
//@ chunk-e6aww6q8.js:2157689-2157803 placement
/**
 * 占到信号量位置后执行函数，完成后释放；被中止时直接返回 undefined。
 */
async function runWithSlot(e, name, maxInFlight, signal, h) {
  let y = await e.acquire(name, maxInFlight, signal);
  if (y === undefined) return;
  try {
    return await h();
  } finally {
    y();
  }
}
export { KeyedSemaphoreSubclass, RELEASED_SLOT, runWithSlot };

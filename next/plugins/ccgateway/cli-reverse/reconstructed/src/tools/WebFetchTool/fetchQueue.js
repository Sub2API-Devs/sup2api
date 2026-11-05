/**
 * tools/WebFetchTool/fetchQueue.ts
 *
 * 2.1.316 新增：WebFetch 请求排队
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 */
import { KeyedSemaphore } from "../../utils/keyedSemaphore.js";

//@ chunk-5xgkngpb.js:2210718-2210741 placement
/**
 * KeyedSemaphore 的本地子类（用于 WebFetch 抓取队列）。
 */
class KeyedSemaphoreSubclass extends KeyedSemaphore {}
//@ chunk-5xgkngpb.js:2210741-2210814 placement
/**
 * 表示“已完成、无需释放”的占位槽对象。
 */
var RELEASED_SLOT = {
  seated: false,
  release: () => {},
  retake: () => {},
  [Symbol.dispose]: () => {},
};
//@ chunk-5xgkngpb.js:2211118-2211232 placement
/**
 * 占到信号量位置后执行函数，完成后释放；被中止时直接返回 undefined。
 */
async function runWithSlot(queue, name, maxInFlight, signal, body) {
  let release = await queue.acquire(name, maxInFlight, signal);
  if (release === undefined) return;
  try {
    return await body();
  } finally {
    release();
  }
}
export { KeyedSemaphoreSubclass, RELEASED_SLOT, runWithSlot };

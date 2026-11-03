/**
 * utils/attachments/attachmentTiming.ts
 *
 * 2.1.316 新增：附件计算耗时
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { H7e } from "../queryProfiler.js";

//@ chunk-e6aww6q8.js:2481777-2481814 placement = getAgentContext (1)
function getAttachmentTimingStore() {
  return H7e.getStore();
}
/**
 * 在附件计时上下文中计时一个异步附件生成函数。
 */
//@ chunk-e6aww6q8.js:2481814-2481952 placement
function timeAttachment(e, n) {
  let store = H7e.getStore();
  if (store === void 0) return n();
  let begin = store.begin(e);
  try {
    let h = n();
    return (h.then(begin, begin), h);
  } catch (error) {
    throw (begin(), error);
  }
}

export { timeAttachment, getAttachmentTimingStore };

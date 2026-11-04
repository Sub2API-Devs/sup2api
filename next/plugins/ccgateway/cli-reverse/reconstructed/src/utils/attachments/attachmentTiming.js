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
import { queryProfileStorage } from "../queryProfiler.js";

//@ chunk-e6aww6q8.js:2481777-2481814 placement = getAgentContext (1)
function getAttachmentTimingStore() {
  return queryProfileStorage.getStore();
}
//@ chunk-e6aww6q8.js:2481814-2481952 placement
/**
 * 在附件计时上下文中计时一个异步附件生成函数。
 */
function timeAttachment(label, fn) {
  let profile = queryProfileStorage.getStore();
  if (profile === undefined) return fn();
  let end = profile.begin(label);
  try {
    let result = fn();
    result.then(end, end);
    return result;
  } catch (error) {
    end();
    throw error;
  }
}
export { timeAttachment, getAttachmentTimingStore };

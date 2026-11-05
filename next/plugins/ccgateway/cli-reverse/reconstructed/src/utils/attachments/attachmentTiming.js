/**
 * utils/attachments/attachmentTiming.ts
 *
 * 2.1.316 新增：附件计算耗时
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2dvnfacg.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { queryProfileStorage } from "../queryProfiler.js";

//@ chunk-2dvnfacg.js:6596-6631 placement
function getAttachmentTimingStore() {
  return queryProfileStorage.getStore();
}
//@ chunk-2dvnfacg.js:6631-6767 placement
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

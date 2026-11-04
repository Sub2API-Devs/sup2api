/**
 * services/api/fileReferenceCalls.ts
 *
 * 2.1.316 新增：记录文件引用类调用；是否为文件引用调用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (7)
 * attribution: placement 7
 */
import { logForDebugging } from "../../utils/debug.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:274904-274916 placement
/**
 * 导出常量或表 `MAX_TRACKED_CALLS`：值为 1e4。
 */
var MAX_TRACKED_CALLS = 1e4;
//@ chunk-aepeg2w5.js:274916-275382 placement
/**
 * 记录文件引用类调用。
 */
class FileReferenceTracker {
  #n = null;
  #e = new Set();
  #t = false;
  #r = new Set();
  fileReferenceHintLatch() {
    return this.#n;
  }
  replaceFileReferenceHintLatch(latch) {
    this.#n = latch;
  }
  isFileReferenceCall(callId) {
    return callId === undefined ? this.#t : this.#e.has(callId);
  }
  noteFileReferenceCall(callId) {
    this.#t = true;
    if (callId === undefined || this.#e.has(callId)) return;
    if (this.#e.size >= MAX_TRACKED_CALLS) {
      let oldest = this.#e.values().next().value;
      if (oldest !== undefined) this.#e.delete(oldest);
    }
    this.#e.add(callId);
  }
  isFirstReferenceApproved(referenceKey) {
    return this.#r.has(referenceKey);
  }
  noteFirstReferenceApproved(referenceKey) {
    this.#r.add(referenceKey);
  }
}
//@ chunk-aepeg2w5.js:275382-275409 placement
/**
 * 导出函数 `fileReferenceTrackerSlot`。
 */
var fileReferenceTrackerSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:275382", () => {
  fileReferenceTrackerSlot = new SessionRootSlot(() => new FileReferenceTracker());
});
//@ chunk-aepeg2w5.js:275409-275468 placement
/**
 * 导出函数 `fileReferenceHintLatch`：返回 U3t.of(getRootSession()).fileReferenceHintLatch()。
 */
function fileReferenceHintLatch() {
  return fileReferenceTrackerSlot.of(getRootSession()).fileReferenceHintLatch();
}
//@ chunk-aepeg2w5.js:275468-275529 placement
/**
 * 导出函数 `replaceFileReferenceHintLatch`：参数 e。
 */
function replaceFileReferenceHintLatch(offered) {
  fileReferenceTrackerSlot.of(getRootSession()).replaceFileReferenceHintLatch(offered);
}
//@ chunk-aepeg2w5.js:275529-275587 placement
/**
 * 是否为文件引用调用。
 */
function isFileReferenceCall(toolUseId) {
  return fileReferenceTrackerSlot.of(getRootSession()).isFileReferenceCall(toolUseId);
}
//@ chunk-aepeg2w5.js:275587-275640 placement
/**
 * 导出函数 `noteFileReferenceCall`：参数 e。
 */
function noteFileReferenceCall(callId) {
  fileReferenceTrackerSlot.of(getRootSession()).noteFileReferenceCall(callId);
}
export {
  replaceFileReferenceHintLatch,
  fileReferenceTrackerSlot,
  fileReferenceHintLatch,
  isFileReferenceCall,
  noteFileReferenceCall,
  MAX_TRACKED_CALLS,
};

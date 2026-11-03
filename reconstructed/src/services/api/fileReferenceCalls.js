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
  replaceFileReferenceHintLatch(e) {
    this.#n = e;
  }
  isFileReferenceCall(e) {
    return e === undefined ? this.#t : this.#e.has(e);
  }
  noteFileReferenceCall(e) {
    this.#t = true;
    if (e === undefined || this.#e.has(e)) return;
    if (this.#e.size >= MAX_TRACKED_CALLS) {
      let n = this.#e.values().next().value;
      if (n !== undefined) this.#e.delete(n);
    }
    this.#e.add(e);
  }
  isFirstReferenceApproved(e) {
    return this.#r.has(e);
  }
  noteFirstReferenceApproved(e) {
    this.#r.add(e);
  }
}
//@ chunk-aepeg2w5.js:275382-275409 placement
/**
 * 导出函数 `fileReferenceTrackerSlot`。
 */
var fileReferenceTrackerSlot = new SessionRootSlot(() => new FileReferenceTracker());
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
function noteFileReferenceCall(e) {
  fileReferenceTrackerSlot.of(getRootSession()).noteFileReferenceCall(e);
}
export {
  replaceFileReferenceHintLatch,
  fileReferenceTrackerSlot,
  fileReferenceHintLatch,
  isFileReferenceCall,
  noteFileReferenceCall,
  MAX_TRACKED_CALLS,
};

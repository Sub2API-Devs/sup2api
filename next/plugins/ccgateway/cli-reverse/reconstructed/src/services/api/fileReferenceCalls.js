/**
 * services/api/fileReferenceCalls.ts
 *
 * 2.1.316 新增：记录文件引用类调用；是否为文件引用调用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (8)
 * attribution: placement 6, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../../utils/debug.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:284366-284378 placement
/**
 * 导出常量或表 `MAX_TRACKED_CALLS`：值为 1e4。
 */
var MAX_TRACKED_CALLS = 1e4;
//@ chunk-exfmq47h.js:284378-284918 placement
/**
 * 记录文件引用类调用。
 */
class FileReferenceTracker {
  #n = new Map();
  #e = new Set();
  #t = false;
  #r = new Set();
  fileReferenceHintLatch(referenceKey) {
    return this.#n.get(referenceKey) ?? null;
  }
  replaceFileReferenceHintLatch(referenceKey, latch) {
    this.#n.set(referenceKey, latch);
  }
  clearFileReferenceHintLatches() {
    this.#n.clear();
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
//@ chunk-exfmq47h.js:284918-284945 placement
/**
 * 导出函数 `fileReferenceTrackerSlot`。
 */
var fileReferenceTrackerSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:284918", () => {
  fileReferenceTrackerSlot = new SessionRootSlot(() => new FileReferenceTracker());
});
//@ chunk-exfmq47h.js:284945-285006 placement
/**
 * 导出函数 `fileReferenceHintLatch`：返回 U3t.of(getRootSession()).fileReferenceHintLatch()。
 */
function fileReferenceHintLatch(flag) {
  return fileReferenceTrackerSlot.of(getRootSession()).fileReferenceHintLatch(flag);
}
//@ chunk-exfmq47h.js:285006-285071 layout
function replaceFileReferenceHintLatch(flag, latch) {
  fileReferenceTrackerSlot.of(getRootSession()).replaceFileReferenceHintLatch(flag, latch);
}
//@ chunk-exfmq47h.js:285071-285130 layout
function clearFileReferenceHintLatches() {
  fileReferenceTrackerSlot.of(getRootSession()).clearFileReferenceHintLatches();
}
//@ chunk-exfmq47h.js:285130-285188 placement
/**
 * 是否为文件引用调用。
 */
function isFileReferenceCall(toolUseId) {
  return fileReferenceTrackerSlot.of(getRootSession()).isFileReferenceCall(toolUseId);
}
//@ chunk-exfmq47h.js:285188-285241 placement
/**
 * 导出函数 `noteFileReferenceCall`：参数 e。
 */
function noteFileReferenceCall(callId) {
  fileReferenceTrackerSlot.of(getRootSession()).noteFileReferenceCall(callId);
}
export {
  isFileReferenceCall,
  clearFileReferenceHintLatches,
  fileReferenceTrackerSlot,
  fileReferenceHintLatch,
  replaceFileReferenceHintLatch,
  noteFileReferenceCall,
  MAX_TRACKED_CALLS,
};

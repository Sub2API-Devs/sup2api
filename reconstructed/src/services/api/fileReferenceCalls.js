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
var jos = 1e4;
/**
 * 记录文件引用类调用。
 */
//@ chunk-aepeg2w5.js:274916-275382 placement
class FileReferenceTracker {
  #n = null;
  #e = new Set();
  #t = !1;
  #r = new Set();
  fileReferenceHintLatch() {
    return this.#n;
  }
  replaceFileReferenceHintLatch(e) {
    this.#n = e;
  }
  isFileReferenceCall(e) {
    return e === void 0 ? this.#t : this.#e.has(e);
  }
  noteFileReferenceCall(e) {
    if (((this.#t = !0), e === void 0 || this.#e.has(e))) return;
    if (this.#e.size >= jos) {
      let n = this.#e.values().next().value;
      if (n !== void 0) this.#e.delete(n);
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
var U3t = new SessionRootSlot(() => new FileReferenceTracker());
//@ chunk-aepeg2w5.js:275409-275468 placement
function Wos() {
  return U3t.of(getRootSession()).fileReferenceHintLatch();
}
//@ chunk-aepeg2w5.js:275468-275529 placement
function Mxt(e) {
  U3t.of(getRootSession()).replaceFileReferenceHintLatch(e);
}
/**
 * 是否为文件引用调用。
 */
//@ chunk-aepeg2w5.js:275529-275587 placement
function isFileReferenceCall(e) {
  return U3t.of(getRootSession()).isFileReferenceCall(e);
}
//@ chunk-aepeg2w5.js:275587-275640 placement
function Eto(e) {
  U3t.of(getRootSession()).noteFileReferenceCall(e);
}

export { Mxt, U3t, Wos, isFileReferenceCall, Eto, jos };

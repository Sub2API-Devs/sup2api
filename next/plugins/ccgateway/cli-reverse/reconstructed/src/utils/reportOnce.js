/**
 * utils/reportOnce.ts
 *
 * 2.1.316 新增。只上报一次。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0g4sycr3.js (2)
 * attribution: placement 2
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { logError } from "./log.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-0g4sycr3.js:296-341 placement
var reportOnceState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0g4sycr3.js:296", () => {
  reportOnceState = new HostScoped(() => ({
    alreadyReported: new Set(),
  }));
});
//@ chunk-0g4sycr3.js:341-466 placement
/**
 * 同一事件在根会话中只上报一次（交给已注册的监听器），出错时只记录错误。
 */
function reportOnce(key) {
  try {
    let state = reportOnceState.of(getRootSession().host);
    if (!state.alreadyReported.has(key)) {
      state.alreadyReported.add(key);
      state.listener?.(key);
    }
  } catch (error) {
    logError(error);
  }
}
export { reportOnce };

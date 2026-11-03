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

//@ chunk-0g4sycr3.js:296-341 placement
var s = new HostScoped(() => ({ alreadyReported: new Set() }));
/**
 * 同一事件在根会话中只上报一次（交给已注册的监听器），出错时只记录错误。
 */
//@ chunk-0g4sycr3.js:341-466 placement
function reportOnce(r) {
  try {
    let of = s.of(getRootSession().host);
    if (!of.alreadyReported.has(r)) (of.alreadyReported.add(r), of.listener?.(r));
  } catch (error) {
    logError(error);
  }
}

export { reportOnce };

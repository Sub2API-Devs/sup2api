/**
 * utils/attachStamp.ts
 *
 * 2.1.316 新增：附加戳记。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmbda0jr.js (9)
 * attribution: placement 9
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { sleep } from "./sleep.js";

//@ chunk-qmbda0jr.js:333-434 placement
class AttachStampState {
  stampMs = 0;
  detachedSinceLastAttach = !1;
  reset() {
    ((this.stampMs = 0), (this.detachedSinceLastAttach = !1));
  }
}
//@ chunk-qmbda0jr.js:434-457 placement
var s = new HostScoped(() => new AttachStampState());
//@ chunk-qmbda0jr.js:457-492 placement
function a() {
  return s.of(getRootSession().host);
}
/**
 * 记录附加时间戳（0 重置）。
 */
//@ chunk-qmbda0jr.js:492-630 placement
function noteAttachStamp(e) {
  let t = a();
  if (e === 0) {
    t.reset();
    return;
  }
  if (t.detachedSinceLastAttach || t.stampMs === 0) t.stampMs = e;
  t.detachedSinceLastAttach = !1;
}
//@ chunk-qmbda0jr.js:630-676 placement
function aon() {
  a().detachedSinceLastAttach = !0;
}
//@ chunk-qmbda0jr.js:676-726 placement
function sEo() {
  return a().detachedSinceLastAttach;
}
//@ chunk-qmbda0jr.js:726-760 placement
function oQe() {
  return a().stampMs;
}
//@ chunk-qmbda0jr.js:760-785 placement
function lon(e) {
  return !1;
}
/**
 * 等待附加稳定。
 */
//@ chunk-qmbda0jr.js:785-945 placement
async function waitForAttachSettle() {
  for (;;) {
    let now = Date.now();
    if (!lon(now)) return;
    let { detachedSinceLastAttach: detachedSinceLastAttach, stampMs: stampMs } = a(),
      c = detachedSinceLastAttach || stampMs === 0 ? 500 : stampMs + 500 - now;
    await sleep(Math.max(25, c) + 25);
  }
}

export { aon, oQe, sEo, lon, waitForAttachSettle, noteAttachStamp };

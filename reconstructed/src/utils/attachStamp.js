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
  detachedSinceLastAttach = false;
  reset() {
    this.stampMs = 0;
    this.detachedSinceLastAttach = false;
  }
}
//@ chunk-qmbda0jr.js:434-457 placement
/**
 * 按宿主隔离的附加时间戳状态。
 */
var attachStampByHost = new HostScoped(() => new AttachStampState());
//@ chunk-qmbda0jr.js:457-492 placement
/**
 * 取出当前宿主的附加时间戳状态。
 */
function getAttachStampState() {
  return attachStampByHost.of(getRootSession().host);
}
//@ chunk-qmbda0jr.js:492-630 placement
/**
 * 记录附加时间戳（0 重置）。
 */
function noteAttachStamp(e) {
  let attachStampState = getAttachStampState();
  if (e === 0) {
    attachStampState.reset();
    return;
  }
  if (attachStampState.detachedSinceLastAttach || attachStampState.stampMs === 0)
    attachStampState.stampMs = e;
  attachStampState.detachedSinceLastAttach = false;
}
//@ chunk-qmbda0jr.js:630-676 placement
/**
 * 标记自上次附加后已分离。
 */
function markDetachedSinceAttach() {
  getAttachStampState().detachedSinceLastAttach = true;
}
//@ chunk-qmbda0jr.js:676-726 placement
/**
 * 自上次附加后是否分离过。
 */
function wasDetachedSinceAttach() {
  return getAttachStampState().detachedSinceLastAttach;
}
//@ chunk-qmbda0jr.js:726-760 placement
/**
 * 读取附加时间戳（毫秒）。
 */
function getAttachStampMs() {
  return getAttachStampState().stampMs;
}
//@ chunk-qmbda0jr.js:760-785 placement
/**
 * 附加是否已稳定（当前恒返回 false）。
 */
function isAttachSettled(e) {
  return false;
}
//@ chunk-qmbda0jr.js:785-945 placement
/**
 * 等待附加稳定。
 */
async function waitForAttachSettle() {
  for (;;) {
    let now = Date.now();
    if (!isAttachSettled(now)) return;
    let { detachedSinceLastAttach, stampMs } = getAttachStampState();
    let c = detachedSinceLastAttach || stampMs === 0 ? 500 : stampMs + 500 - now;
    await sleep(Math.max(25, c) + 25);
  }
}
export {
  markDetachedSinceAttach,
  getAttachStampMs,
  wasDetachedSinceAttach,
  isAttachSettled,
  waitForAttachSettle,
  noteAttachStamp,
};

/**
 * utils/attachStamp.ts
 *
 * 2.1.316 新增：附加戳记。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sf2ara30.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { sleep } from "./sleep.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-sf2ara30.js:333-434 placement
class AttachStampState {
  stampMs = 0;
  detachedSinceLastAttach = false;
  reset() {
    this.stampMs = 0;
    this.detachedSinceLastAttach = false;
  }
}
//@ chunk-sf2ara30.js:434-457 placement
/**
 * 按宿主隔离的附加时间戳状态。
 */
var attachStampByHost; // deferred: uses AttachStampState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sf2ara30.js:434", () => {
  attachStampByHost = new HostScoped(() => new AttachStampState());
});
//@ chunk-sf2ara30.js:457-492 placement
/**
 * 取出当前宿主的附加时间戳状态。
 */
function getAttachStampState() {
  return attachStampByHost.of(getRootSession().host);
}
//@ chunk-sf2ara30.js:492-630 placement
/**
 * 记录附加时间戳（0 重置）。
 */
function noteAttachStamp(nowMs) {
  let attachStampState = getAttachStampState();
  if (nowMs === 0) {
    attachStampState.reset();
    return;
  }
  if (attachStampState.detachedSinceLastAttach || attachStampState.stampMs === 0)
    attachStampState.stampMs = nowMs;
  attachStampState.detachedSinceLastAttach = false;
}
//@ chunk-sf2ara30.js:630-676 placement
/**
 * 标记自上次附加后已分离。
 */
function markDetachedSinceAttach() {
  getAttachStampState().detachedSinceLastAttach = true;
}
//@ chunk-sf2ara30.js:676-726 placement
/**
 * 自上次附加后是否分离过。
 */
function wasDetachedSinceAttach() {
  return getAttachStampState().detachedSinceLastAttach;
}
//@ chunk-sf2ara30.js:726-760 placement
/**
 * 读取附加时间戳（毫秒）。
 */
function getAttachStampMs() {
  return getAttachStampState().stampMs;
}
//@ chunk-sf2ara30.js:760-785 placement
/**
 * 附加是否已稳定（当前恒返回 false）。
 */
function isAttachSettled(nowMs) {
  return false;
}
//@ chunk-sf2ara30.js:785-945 placement
/**
 * 等待附加稳定。
 */
async function waitForAttachSettle() {
  for (;;) {
    let now = Date.now();
    if (!isAttachSettled(now)) return;
    let { detachedSinceLastAttach, stampMs } = getAttachStampState();
    let waitMs = detachedSinceLastAttach || stampMs === 0 ? 500 : stampMs + 500 - now;
    await sleep(Math.max(25, waitMs) + 25);
  }
}
export {
  waitForAttachSettle,
  isAttachSettled,
  getAttachStampMs,
  markDetachedSinceAttach,
  wasDetachedSinceAttach,
  noteAttachStamp,
};

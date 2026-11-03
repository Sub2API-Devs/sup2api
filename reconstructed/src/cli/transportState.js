/**
 * cli/transportState.ts
 *
 * 2.1.316 新增：会话传输层状态（托管 worker、持久传输、本地 stdin）与相关判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zggwwdc2.js (13)
 * attribution: placement 13
 */
import { isRemoteRelayed } from "../utils/sessionShape.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { ySr, vS } from "../utils/remoteEnvironment.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { toError } from "../utils/errors.js";

/**
 * 记录当前会话传输层状态：活动传输、是否持久、是否托管 worker、本地 stdin 归属。
 */
//@ chunk-zggwwdc2.js:409-874 placement
class TransportState {
  active = void 0;
  transportPersists = void 0;
  hostedWorker = !1;
  hostOwnedLocalStdin = !1;
  setActive(r) {
    ((this.active = r),
      (this.transportPersists = r?.persistsOutboundFrames),
      (this.hostedWorker = r?.isHostedWorker === !0),
      (this.hostOwnedLocalStdin = !1));
  }
  remoteBridgeLive = null;
  bridgeMayBeLive() {
    return this.remoteBridgeLive === null || this.remoteBridgeLive();
  }
  markLocalTransport() {
    this.transportPersists = !1;
  }
  markHeadlessStart(r) {
    this.hostOwnedLocalStdin = !r.sdkUrl && r.readsProcessStdin && !isRemoteRelayed();
  }
}
//@ chunk-zggwwdc2.js:874-899 placement
var transportStateByHost = new SessionRootSlot(() => new TransportState());
//@ chunk-zggwwdc2.js:899-993 placement
function isTransportBacked(r) {
  return ySr({
    hostedWorker: isHostedWorker(r),
    transportPersists: transportStateByHost.of(r).transportPersists,
  });
}
//@ chunk-zggwwdc2.js:993-1056 placement
function mayTransportPersist(r) {
  return isHostedWorker(r) || transportStateByHost.of(r).transportPersists !== !1;
}
//@ chunk-zggwwdc2.js:1056-1159 placement
function isLocalStdinOnly(r) {
  let of = transportStateByHost.of(r);
  return of.hostOwnedLocalStdin && of.transportPersists === !1 && !isHostedWorker(r) && !isRemoteRelayed();
}
//@ chunk-zggwwdc2.js:1159-1220 placement
function isPersistentVsCodeTransport(r) {
  return vS() && transportStateByHost.of(r).transportPersists === !0;
}
//@ chunk-zggwwdc2.js:1220-1298 placement
function isHostedWorker(r) {
  return r.host.launchOptions.diskless() || transportStateByHost.of(r).hostedWorker;
}
//@ chunk-zggwwdc2.js:1298-1354 placement
function isBridgeOrTransport(r) {
  return isTransportBacked(r) || transportStateByHost.of(r).bridgeMayBeLive();
}
//@ chunk-zggwwdc2.js:1354-1394 placement
function statusesForTransport(r, e) {
  return isTransportBacked(r) ? minimalStatuses(e) : e;
}
//@ chunk-zggwwdc2.js:1394-1461 placement
function minimalStatuses(r) {
  return r.map((e) => ({ name: e.name, status: e.status }));
}
//@ chunk-zggwwdc2.js:1461-1497 placement
function emptyIfTransport(r, e) {
  return isTransportBacked(r) ? [] : e;
}
//@ chunk-zggwwdc2.js:1497-1688 placement
function orderForTransport(r, e, s, i = "last") {
  try {
    if (!isTransportBacked(r)) return i === "first" ? [e, ...s] : [...s, e];
    for (let o of s) logForDebugging(`error_during_execution detail: ${o}`, { level: "error" });
    return [e];
  } catch (error) {
    return (logError(toError(error)), [e]);
  }
}
//@ chunk-zggwwdc2.js:1688-1725 placement
function pickForTransport(r, e, s) {
  return isTransportBacked(r) ? s : e;
}

export {
  transportStateByHost,
  isBridgeOrTransport,
  isTransportBacked,
  pickForTransport,
  isLocalStdinOnly,
  mayTransportPersist,
  emptyIfTransport,
  statusesForTransport,
  orderForTransport,
  isPersistentVsCodeTransport,
  isHostedWorker,
  minimalStatuses,
};

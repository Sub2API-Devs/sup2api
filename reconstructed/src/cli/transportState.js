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
import { persistsTransport, isBridgeEnvironment } from "../utils/remoteEnvironment.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { toError } from "../utils/errors.js";

//@ chunk-zggwwdc2.js:409-874 placement
/**
 * 记录当前会话传输层状态：活动传输、是否持久、是否托管 worker、本地 stdin 归属。
 */
class TransportState {
  active = undefined;
  transportPersists = undefined;
  hostedWorker = false;
  hostOwnedLocalStdin = false;
  setActive(r) {
    this.active = r;
    this.transportPersists = r?.persistsOutboundFrames;
    this.hostedWorker = r?.isHostedWorker === true;
    this.hostOwnedLocalStdin = false;
  }
  remoteBridgeLive = null;
  bridgeMayBeLive() {
    return this.remoteBridgeLive === null || this.remoteBridgeLive();
  }
  markLocalTransport() {
    this.transportPersists = false;
  }
  markHeadlessStart(r) {
    this.hostOwnedLocalStdin = !r.sdkUrl && r.readsProcessStdin && !isRemoteRelayed();
  }
}
//@ chunk-zggwwdc2.js:874-899 placement
var transportStateByHost = new SessionRootSlot(() => new TransportState());
//@ chunk-zggwwdc2.js:899-993 placement
function isTransportBacked(r) {
  return persistsTransport({
    hostedWorker: isHostedWorker(r),
    transportPersists: transportStateByHost.of(r).transportPersists,
  });
}
//@ chunk-zggwwdc2.js:993-1056 placement
function mayTransportPersist(session) {
  return isHostedWorker(session) || transportStateByHost.of(session).transportPersists !== false;
}
//@ chunk-zggwwdc2.js:1056-1159 placement
function isLocalStdinOnly(r) {
  let e = transportStateByHost.of(r);
  return e.hostOwnedLocalStdin && e.transportPersists === false && !isHostedWorker(r) && !isRemoteRelayed();
}
//@ chunk-zggwwdc2.js:1159-1220 placement
function isPersistentVsCodeTransport(session) {
  return isBridgeEnvironment() && transportStateByHost.of(session).transportPersists === true;
}
//@ chunk-zggwwdc2.js:1220-1298 placement
function isHostedWorker(r) {
  return r.host.launchOptions.diskless() || transportStateByHost.of(r).hostedWorker;
}
//@ chunk-zggwwdc2.js:1298-1354 placement
function isBridgeOrTransport(session) {
  return isTransportBacked(session) || transportStateByHost.of(session).bridgeMayBeLive();
}
//@ chunk-zggwwdc2.js:1354-1394 placement
function statusesForTransport(r, e) {
  return isTransportBacked(r) ? minimalStatuses(e) : e;
}
//@ chunk-zggwwdc2.js:1394-1461 placement
function minimalStatuses(r) {
  return r.map((e) => ({
    name: e.name,
    status: e.status,
  }));
}
//@ chunk-zggwwdc2.js:1461-1497 placement
function emptyIfTransport(r, e) {
  return isTransportBacked(r) ? [] : e;
}
//@ chunk-zggwwdc2.js:1497-1688 placement
function orderForTransport(session, e, s, i = "last") {
  try {
    if (!isTransportBacked(session)) return i === "first" ? [e, ...s] : [...s, e];
    for (let o of s)
      logForDebugging(`error_during_execution detail: ${o}`, {
        level: "error",
      });
    return [e];
  } catch (error) {
    logError(toError(error));
    return [e];
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

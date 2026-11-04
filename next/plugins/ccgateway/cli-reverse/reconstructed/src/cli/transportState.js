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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-zggwwdc2.js:409-874 placement
/**
 * 记录当前会话传输层状态：活动传输、是否持久、是否托管 worker、本地 stdin 归属。
 */
class TransportState {
  active = undefined;
  transportPersists = undefined;
  hostedWorker = false;
  hostOwnedLocalStdin = false;
  setActive(host) {
    this.active = host;
    this.transportPersists = host?.persistsOutboundFrames;
    this.hostedWorker = host?.isHostedWorker === true;
    this.hostOwnedLocalStdin = false;
  }
  remoteBridgeLive = null;
  bridgeMayBeLive() {
    return this.remoteBridgeLive === null || this.remoteBridgeLive();
  }
  markLocalTransport() {
    this.transportPersists = false;
  }
  markHeadlessStart(host) {
    this.hostOwnedLocalStdin = !host.sdkUrl && host.readsProcessStdin && !isRemoteRelayed();
  }
}
//@ chunk-zggwwdc2.js:874-899 placement
var transportStateByHost; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zggwwdc2.js:874", () => {
  transportStateByHost = new SessionRootSlot(() => new TransportState());
});
//@ chunk-zggwwdc2.js:899-993 placement
function isTransportBacked(host) {
  return persistsTransport({
    hostedWorker: isHostedWorker(host),
    transportPersists: transportStateByHost.of(host).transportPersists,
  });
}
//@ chunk-zggwwdc2.js:993-1056 placement
function mayTransportPersist(session) {
  return isHostedWorker(session) || transportStateByHost.of(session).transportPersists !== false;
}
//@ chunk-zggwwdc2.js:1056-1159 placement
function isLocalStdinOnly(host) {
  let state = transportStateByHost.of(host);
  return (
    state.hostOwnedLocalStdin &&
    state.transportPersists === false &&
    !isHostedWorker(host) &&
    !isRemoteRelayed()
  );
}
//@ chunk-zggwwdc2.js:1159-1220 placement
function isPersistentVsCodeTransport(session) {
  return isBridgeEnvironment() && transportStateByHost.of(session).transportPersists === true;
}
//@ chunk-zggwwdc2.js:1220-1298 placement
function isHostedWorker(host) {
  return host.host.launchOptions.diskless() || transportStateByHost.of(host).hostedWorker;
}
//@ chunk-zggwwdc2.js:1298-1354 placement
function isBridgeOrTransport(session) {
  return isTransportBacked(session) || transportStateByHost.of(session).bridgeMayBeLive();
}
//@ chunk-zggwwdc2.js:1354-1394 placement
function statusesForTransport(host, statuses) {
  return isTransportBacked(host) ? minimalStatuses(statuses) : statuses;
}
//@ chunk-zggwwdc2.js:1394-1461 placement
function minimalStatuses(statuses) {
  return statuses.map((status) => ({
    name: status.name,
    status: status.status,
  }));
}
//@ chunk-zggwwdc2.js:1461-1497 placement
function emptyIfTransport(host, value) {
  return isTransportBacked(host) ? [] : value;
}
//@ chunk-zggwwdc2.js:1497-1688 placement
function orderForTransport(session, preferred, candidates, fallback = "last") {
  try {
    if (!isTransportBacked(session))
      return fallback === "first" ? [preferred, ...candidates] : [...candidates, preferred];
    for (let candidate of candidates)
      logForDebugging(`error_during_execution detail: ${candidate}`, {
        level: "error",
      });
    return [preferred];
  } catch (error) {
    logError(toError(error));
    return [preferred];
  }
}
//@ chunk-zggwwdc2.js:1688-1725 placement
function pickForTransport(host, items, fallback) {
  return isTransportBacked(host) ? fallback : items;
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

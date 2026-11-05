/**
 * cli/transportState.ts
 *
 * 2.1.316 新增：会话传输层状态（托管 worker、持久传输、本地 stdin）与相关判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-trxp2tmn.js (15)
 * attribution: placement 11, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isRemoteRelayed } from "../utils/sessionShape.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { persistsTransport, isBridgeEnvironment } from "../utils/remoteEnvironment.js";
import { env } from "../utils/env.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { toError } from "../utils/errors.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-trxp2tmn.js:444-988 placement
/**
 * 记录当前会话传输层状态：活动传输、是否持久、是否托管 worker、本地 stdin 归属。
 */
class TransportState {
  active = undefined;
  transportPersists = undefined;
  hostedWorker = false;
  transportHasStored = false;
  hostOwnedLocalStdin = false;
  setActive(host) {
    this.active = host;
    this.transportPersists = host?.persistsOutboundFrames;
    this.hostedWorker = host?.isHostedWorker === true;
    this.transportHasStored ||= host?.persistsOutboundFrames === true;
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
//@ chunk-trxp2tmn.js:988-1013 placement
var transportStateByHost; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-trxp2tmn.js:988", () => {
  transportStateByHost = new SessionRootSlot(() => new TransportState());
});
//@ chunk-trxp2tmn.js:1013-1107 placement
function isTransportBacked(host) {
  return persistsTransport({
    hostedWorker: isHostedWorker(host),
    transportPersists: transportStateByHost.of(host).transportPersists,
  });
}
//@ chunk-trxp2tmn.js:1107-1170 placement
function mayTransportPersist(session) {
  return isHostedWorker(session) || transportStateByHost.of(session).transportPersists !== false;
}
//@ chunk-trxp2tmn.js:1170-1273 placement
function isLocalStdinOnly(host) {
  let state = transportStateByHost.of(host);
  return (
    state.hostOwnedLocalStdin &&
    state.transportPersists === false &&
    !isHostedWorker(host) &&
    !isRemoteRelayed()
  );
}
//@ chunk-trxp2tmn.js:1273-1334 placement
function isPersistentVsCodeTransport(session) {
  return isBridgeEnvironment() && transportStateByHost.of(session).transportPersists === true;
}
//@ chunk-trxp2tmn.js:1334-1412 placement
function isHostedWorker(host) {
  return host.host.launchOptions.diskless() || transportStateByHost.of(host).hostedWorker;
}
//@ chunk-trxp2tmn.js:1412-1534 layout
function isRemoteStatusLineInput(statusLineInput) {
  let state = transportStateByHost.of(statusLineInput);
  return (
    env.CLAUDE_CODE_REMOTE === true ||
    state.transportHasStored ||
    isTransportBacked(statusLineInput) ||
    state.remoteBridgeLive?.() === true
  );
}
//@ chunk-trxp2tmn.js:1534-1590 placement
function isBridgeOrTransport(session) {
  return isTransportBacked(session) || transportStateByHost.of(session).bridgeMayBeLive();
}
//@ chunk-trxp2tmn.js:1590-1643 layout
function transportMayPersist(session) {
  return transportStateByHost.of(session).transportPersists !== false;
}
//@ chunk-trxp2tmn.js:1643-1673 layout
function mayPersistOnHost(session) {
  return mayTransportPersist(session);
}
//@ chunk-trxp2tmn.js:1673-1735 layout
function redactsOrPersists(context) {
  return context.redactsPersistedLane() || transportMayPersist(context.session);
}
//@ chunk-trxp2tmn.js:1735-1771 placement
function emptyIfTransport(host, value) {
  return isTransportBacked(host) ? [] : value;
}
//@ chunk-trxp2tmn.js:1771-1962 placement
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
//@ chunk-trxp2tmn.js:1962-1999 placement
function pickForTransport(host, items, fallback) {
  return isTransportBacked(host) ? fallback : items;
}
export {
  transportStateByHost,
  isTransportBacked,
  mayPersistOnHost,
  pickForTransport,
  isLocalStdinOnly,
  mayTransportPersist,
  emptyIfTransport,
  isBridgeOrTransport,
  redactsOrPersists,
  orderForTransport,
  isRemoteStatusLineInput,
  isHostedWorker,
  isPersistentVsCodeTransport,
};

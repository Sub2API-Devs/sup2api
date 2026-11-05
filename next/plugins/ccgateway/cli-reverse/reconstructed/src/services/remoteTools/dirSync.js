/**
 * services/remoteTools/dirSync.ts
 *
 * 2.1.316 新增：远程工具的目录同步状态与屏障。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5vfqv7sk.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { createPerHostEpochStore, createPeerFrameStore, parseSyncAnswer } from "./shellForwarding.js";
import { logForDebugging } from "../../utils/debug.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { rowStagedSignal } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { setFolderSyncEngine } from "../../utils/remoteTools/folderSync.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5vfqv7sk.js:29000-29361 placement
function dirSyncAgreement(state) {
  if (state.deliveredGeneration === null)
    return {
      agreed: "unknown",
      reason: "no_own_frame",
    };
  if (state.peer === null)
    return {
      agreed: "unknown",
      reason: "peer_too_old",
    };
  if (state.peerStale === true)
    return {
      agreed: "unknown",
      reason: "peer_stale",
    };
  if (!state.peer.appliesOtherSide)
    return {
      agreed: false,
      reason: "peer_does_not_take",
    };
  return {
    agreed: state.peer.appliedGeneration === state.deliveredGeneration,
  };
}
//@ chunk-5vfqv7sk.js:29361-29877 placement
function logDirSyncBarrier(barrier) {
  try {
    let agreement = dirSyncAgreement(barrier);
    logEvent("tengu_dir_sync_barrier", {
      point: fromEnum("before_command"),
      guarantee: fromEnum("down"),
      agreed:
        agreement.agreed === "unknown"
          ? fromEnum("unknown")
          : agreement.agreed
            ? fromEnum("yes")
            : fromEnum("no"),
      ...("reason" in agreement && {
        reason:
          agreement.reason === "peer_too_old"
            ? fromEnum("peer_too_old")
            : agreement.reason === "peer_stale"
              ? fromEnum("peer_stale")
              : agreement.reason === "no_own_frame"
                ? fromEnum("no_own_frame")
                : fromEnum("peer_does_not_take"),
      }),
      outcome: fromEnum(barrier.outcome),
      empty: barrier.empty,
      ms: barrier.ms,
      events: barrier.events,
    });
    if (agreement.agreed === false && !("reason" in agreement))
      logEvent("tengu_dir_sync_frame_disagree", {
        point: fromEnum("before_command"),
      });
  } catch {}
}
//@ chunk-5vfqv7sk.js:29877-29897 placement
var SYNC_FILES = "sync_files";
//@ chunk-5vfqv7sk.js:29897-30520 placement
class DirSyncState {
  #e = undefined;
  #n = createPerHostEpochStore();
  #t = createPerHostEpochStore();
  #o = createPerHostEpochStore();
  ledger = createPeerFrameStore();
  inFlight = undefined;
  countedTooOld = new Set();
  offered = new Set();
  register(enginePromise) {
    this.#e = enginePromise;
    this.#n = createPerHostEpochStore();
    this.#t = createPerHostEpochStore();
    this.#o = createPerHostEpochStore();
    this.ledger.invalidateAll();
    this.offered.clear();
  }
  engine() {
    return this.#e ?? Promise.resolve(null);
  }
  caughtUp(hostName) {
    return this.#n.of(hostName) ?? 0;
  }
  hasStaleFiles(hostName) {
    return this.#t.of(hostName) ?? false;
  }
  markStaleFiles(hostName) {
    this.#t.file(hostName, () => true);
  }
  hasAskBroughtNoUpload(hostName, generation) {
    return this.#o.of(hostName) === generation;
  }
  markAskBroughtNoUpload(hostName, generation) {
    this.#o.file(hostName, () => generation);
  }
  taken(hostName, generation, hasStale) {
    this.#t.file(hostName, () => hasStale);
    this.#n.file(hostName, (previous) => Math.max(previous ?? 0, generation));
    this.#e?.then(
      (engine) => engine?.deviceAppliedUpload?.(generation),
      () => {},
    );
  }
}
//@ chunk-5vfqv7sk.js:30520-30546 placement
/**
 * 按会话隔离的目录同步状态容器（同步屏障与进度）。
 */
var dirSyncStateSlots; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5vfqv7sk.js:30520", () => {
  dirSyncStateSlots = new SessionRootSlot(() => new DirSyncState());
});
//@ chunk-5vfqv7sk.js:30546-30578 placement
function getDirSyncState() {
  return dirSyncStateSlots.of(getRootSession());
}
//@ chunk-5vfqv7sk.js:30578-30754 placement
function registerWorkerDirSyncForMidTurn(enginePromise, subscribe = rowStagedSignal.subscribe) {
  let dirSyncState = getDirSyncState();
  dirSyncState.register(enginePromise);
  let rootSession = getRootSession();
  setFolderSyncEngine(rootSession, "no_engine");
  enginePromise.then(
    (engine) => {
      if (dirSyncState.engine() === enginePromise)
        setFolderSyncEngine(rootSession, engine?.pushPoint === undefined ? "no_engine" : "engine");
    },
    () => {},
  );
}
//@ chunk-5vfqv7sk.js:30754-30850 placement
function heardSyncAnswer(hostName, dirSync, nowMs = Date.now()) {
  let syncAnswer = parseSyncAnswer(dirSync);
  if (syncAnswer !== null) getDirSyncState().ledger.heard(hostName, syncAnswer.frame, nowMs);
  return syncAnswer;
}
//@ chunk-5vfqv7sk.js:30850-30938 placement
function hostSyncsMidTurn(host) {
  return host.plumbingTools?.has(SYNC_FILES) === true && host.transport.callPlumbing !== undefined;
}
//@ chunk-5vfqv7sk.js:30938-31364 placement
async function clearForwardToDevice({ host, readOnly, runsBesideOthers, signal, onStatus }) {
  let dirSyncState = getDirSyncState();
  if (!hostSyncsMidTurn(host)) {
    if (!dirSyncState.countedTooOld.has(host.name)) {
      dirSyncState.countedTooOld.add(host.name);
      dirSyncState.engine().then((engine) => {
        if (engine !== null) {
          logEvent("tengu_dir_sync_mid_turn", {
            point: fromEnum("pre_forward"),
            clearance: fromEnum("machine_too_old"),
          });
          logDirSyncBarrier({
            empty: true,
            ms: 0,
            events: 0,
            outcome: "go",
            deliveredGeneration: engine.getDeliveredGeneration?.() ?? null,
            peer: null,
          });
        }
      });
    }
    return {
      kind: "go",
    };
  }
  return {
    kind: "go",
  };
}
//@ chunk-5vfqv7sk.js:31364-31387 placement
async function countAfterDeviceCommand(dirSync) {}
export {
  hostSyncsMidTurn,
  countAfterDeviceCommand,
  clearForwardToDevice,
  heardSyncAnswer,
  registerWorkerDirSyncForMidTurn,
};

/**
 * services/remoteTools/dirSync.ts
 *
 * 2.1.316 新增：远程工具的目录同步状态与屏障。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmsrnapp.js (11)
 * attribution: placement 11
 */
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { createPerHostEpochStore, createPeerFrameStore, parseSyncAnswer } from "./shellForwarding.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { qyt } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { pUo } from "../../utils/remoteTools/folderSync.js";

//@ chunk-qmsrnapp.js:50871-51232 placement
function dirSyncAgreement(e) {
  if (e.deliveredGeneration === null) return { agreed: "unknown", reason: "no_own_frame" };
  if (e.peer === null) return { agreed: "unknown", reason: "peer_too_old" };
  if (e.peerStale === !0) return { agreed: "unknown", reason: "peer_stale" };
  if (!e.peer.appliesOtherSide) return { agreed: !1, reason: "peer_does_not_take" };
  return { agreed: e.peer.appliedGeneration === e.deliveredGeneration };
}
//@ chunk-qmsrnapp.js:51232-51748 placement
function logDirSyncBarrier(e) {
  try {
    let n = dirSyncAgreement(e);
    if (
      (logEvent("tengu_dir_sync_barrier", {
        point: fromEnum("before_command"),
        guarantee: fromEnum("down"),
        agreed: n.agreed === "unknown" ? fromEnum("unknown") : n.agreed ? fromEnum("yes") : fromEnum("no"),
        ...("reason" in n && {
          reason:
            n.reason === "peer_too_old"
              ? fromEnum("peer_too_old")
              : n.reason === "peer_stale"
                ? fromEnum("peer_stale")
                : n.reason === "no_own_frame"
                  ? fromEnum("no_own_frame")
                  : fromEnum("peer_does_not_take"),
        }),
        outcome: fromEnum(e.outcome),
        empty: e.empty,
        ms: e.ms,
        events: e.events,
      }),
      n.agreed === !1 && !("reason" in n))
    )
      logEvent("tengu_dir_sync_frame_disagree", { point: fromEnum("before_command") });
  } catch {}
}
//@ chunk-qmsrnapp.js:51748-51768 placement
var SYNC_FILES = "sync_files";
//@ chunk-qmsrnapp.js:51768-52391 placement
class DirSyncState {
  #e = void 0;
  #t = createPerHostEpochStore();
  #n = createPerHostEpochStore();
  #o = createPerHostEpochStore();
  ledger = createPeerFrameStore();
  inFlight = void 0;
  countedTooOld = new Set();
  offered = new Set();
  register(e) {
    ((this.#e = e),
      (this.#t = createPerHostEpochStore()),
      (this.#n = createPerHostEpochStore()),
      (this.#o = createPerHostEpochStore()),
      this.ledger.invalidateAll(),
      this.offered.clear());
  }
  engine() {
    return this.#e ?? Promise.resolve(null);
  }
  caughtUp(e) {
    return this.#t.of(e) ?? 0;
  }
  hasStaleFiles(e) {
    return this.#n.of(e) ?? !1;
  }
  markStaleFiles(e) {
    this.#n.file(e, () => !0);
  }
  hasAskBroughtNoUpload(e, n) {
    return this.#o.of(e) === n;
  }
  markAskBroughtNoUpload(e, n) {
    this.#o.file(e, () => n);
  }
  taken(e, n, o) {
    (this.#n.file(e, () => o),
      this.#t.file(e, (r) => Math.max(r ?? 0, n)),
      this.#e?.then(
        (r) => r?.deviceAppliedUpload?.(n),
        () => {},
      ));
  }
}
//@ chunk-qmsrnapp.js:52391-52417 placement
var Dn = new SessionRootSlot(() => new DirSyncState());
//@ chunk-qmsrnapp.js:52417-52449 placement
function getDirSyncState() {
  return Dn.of(getRootSession());
}
//@ chunk-qmsrnapp.js:52449-52625 placement
function registerWorkerDirSyncForMidTurn(e, n = qyt.subscribe) {
  let o = getDirSyncState();
  o.register(e);
  let r = getRootSession();
  (pUo(r, "no_engine"),
    e.then(
      (s) => {
        if (o.engine() === e) pUo(r, s?.pushPoint === void 0 ? "no_engine" : "engine");
      },
      () => {},
    ));
}
//@ chunk-qmsrnapp.js:52625-52721 placement
function heardSyncAnswer(e, n, o = Date.now()) {
  let r = parseSyncAnswer(n);
  if (r !== null) getDirSyncState().ledger.heard(e, r.frame, o);
  return r;
}
//@ chunk-qmsrnapp.js:52721-52809 placement
function hostSyncsMidTurn(e) {
  return e.plumbingTools?.has(SYNC_FILES) === !0 && e.transport.callPlumbing !== void 0;
}
//@ chunk-qmsrnapp.js:52809-53235 placement
async function clearForwardToDevice({
  host: host,
  readOnly: readOnly,
  runsBesideOthers: runsBesideOthers,
  signal: signal,
  onStatus: onStatus,
}) {
  let i = getDirSyncState();
  if (!hostSyncsMidTurn(host)) {
    if (!i.countedTooOld.has(host.name))
      (i.countedTooOld.add(host.name),
        i.engine().then((u) => {
          if (u !== null)
            (logEvent("tengu_dir_sync_mid_turn", {
              point: fromEnum("pre_forward"),
              clearance: fromEnum("machine_too_old"),
            }),
              logDirSyncBarrier({
                empty: !0,
                ms: 0,
                events: 0,
                outcome: "go",
                deliveredGeneration: u.getDeliveredGeneration?.() ?? null,
                peer: null,
              }));
        }));
    return { kind: "go" };
  }
  return { kind: "go" };
}
//@ chunk-qmsrnapp.js:53235-53258 placement
async function countAfterDeviceCommand(e) {}

export { countAfterDeviceCommand, clearForwardToDevice, heardSyncAnswer, hostSyncsMidTurn };

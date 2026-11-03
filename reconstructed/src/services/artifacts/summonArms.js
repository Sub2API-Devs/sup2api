/**
 * services/artifacts/summonArms.ts
 *
 * 2.1.316 新增：评论召唤唤醒状态（定时器、已让出消息）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fgz849qw.js (36)
 * attribution: placement 36
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-fgz849qw.js:262-651 placement
function getSummonWakeState(e) {
  let { wakes: wakes } = getLiveState().wakes,
    n = wakes.get(e);
  if (!n)
    ((n = {
      coalesceTimer: null,
      rescanWanted: !1,
      lastScanScheduledAt: 0,
      rescanArgs: null,
      newestKickAt: 0,
      kickSettled: !0,
      kickCount: 0,
      pendingConfirm: null,
      pendingSeed: null,
      lastWakeArgs: null,
      inFlightScan: null,
      idleRescanCancel: null,
      idleRescanUnmuted: !1,
      idlePassOwed: null,
      cancelGeneration: 0,
      readRetryTimer: null,
      readRetryAttempts: 0,
    }),
      wakes.set(e, n));
  return n;
}
//@ chunk-fgz849qw.js:651-1142 placement
function clearSummonWakeTimers(e) {
  for (let [t, n] of getLiveState().wakes.wakes) {
    if (e !== void 0 && t !== e) continue;
    if (n.coalesceTimer) (clearTimeout(n.coalesceTimer), (n.coalesceTimer = null));
    if (
      ((n.rescanWanted = !1),
      (n.pendingConfirm = null),
      (n.pendingSeed = null),
      (n.newestKickAt = 0),
      (n.kickSettled = !0),
      (n.lastScanScheduledAt = 0),
      (n.rescanArgs = null),
      n.idleRescanCancel?.(),
      (n.idleRescanCancel = null),
      (n.idleRescanUnmuted = !1),
      (n.idlePassOwed = null),
      n.readRetryTimer)
    )
      (clearTimeout(n.readRetryTimer), (n.readRetryTimer = null));
    ((n.readRetryAttempts = 0), n.cancelGeneration++);
  }
}
//@ chunk-fgz849qw.js:1142-1185 placement
function bumpScanGeneration() {
  getLiveState().wakes.scanGeneration++;
}
//@ chunk-fgz849qw.js:1185-1255 placement
function bumpSlugEpoch(e) {
  let { slugEpochs: slugEpochs } = getLiveState().wakes;
  slugEpochs.set(e, (slugEpochs.get(e) ?? 0) + 1);
}
//@ chunk-fgz849qw.js:1255-1308 placement
function c(e) {
  return getLiveState().wakes.slugEpochs.get(e) ?? 0;
}
//@ chunk-fgz849qw.js:1308-1361 placement
function scanStamp(e) {
  return getLiveState().wakes.scanGeneration + c(e);
}
//@ chunk-fgz849qw.js:1361-1420 placement
function stopGeneration(e) {
  return getLiveState().wakes.stopGenerations.get(e) ?? 0;
}
//@ chunk-fgz849qw.js:1420-1493 placement
function i(e) {
  let { stopGenerations: stopGenerations } = getLiveState().wakes;
  stopGenerations.set(e, (stopGenerations.get(e) ?? 0) + 1);
}
//@ chunk-fgz849qw.js:1493-1654 placement
function markLatchChanged(e, t) {
  let { latchChangedAt: latchChangedAt } = getLiveState().wakes;
  if (t === void 0) latchChangedAt.set(e, Date.now());
  else if (Number.isFinite(t)) latchChangedAt.set(e, Math.min(t, Date.now()));
  else latchChangedAt.delete(e);
}
//@ chunk-fgz849qw.js:1654-1664 placement
var a = markLatchChanged;
//@ chunk-fgz849qw.js:1664-1720 placement
function latchChangedAt(e) {
  return getLiveState().wakes.latchChangedAt.get(e);
}
//@ chunk-fgz849qw.js:1720-1876 placement
function stopSummonWakes(e) {
  let { wakes: wakes } = getLiveState();
  (a(e),
    wakes.stoppedSlugs.add(e),
    wakes.sweptSlugs.delete(e),
    wakes.orphanedSweptSlugs.delete(e),
    i(e),
    wakes.pendingResumeDisclosure.delete(e));
}
//@ chunk-fgz849qw.js:1876-2019 placement
function resumeSummonWakes(e) {
  let { wakes: wakes } = getLiveState();
  if (wakes.stoppedSlugs.has(e)) a(e);
  (wakes.stoppedSlugs.delete(e), wakes.sweptSlugs.delete(e), wakes.orphanedSweptSlugs.delete(e));
}
//@ chunk-fgz849qw.js:2019-2072 placement
function isSlugStopped(e) {
  return getLiveState().wakes.stoppedSlugs.has(e);
}
//@ chunk-fgz849qw.js:2072-2169 placement
function isSlugStoppedAnywhere(e) {
  let t = getLiveState();
  return t.wakes.stoppedSlugs.has(e) || t.durable.stopLatches.isStopped(e);
}
//@ chunk-fgz849qw.js:2169-2483 placement
function sweepSlug(e) {
  let { wakes: wakes } = getLiveState();
  if (!wakes.stoppedSlugs.has(e)) (a(e), wakes.stoppedSlugs.add(e), wakes.sweptSlugs.add(e), i(e));
  else {
    let n = wakes.yieldedSlugs.get(e);
    if (n !== void 0) ((n.wasPaused = !0), i(e));
  }
  ((wakes.humanTurnAtScanGeneration = null),
    wakes.liftedAtScanGeneration.delete(e),
    wakes.orphanedSweptSlugs.delete(e),
    wakes.pendingResumeDisclosure.delete(e));
}
//@ chunk-fgz849qw.js:2483-2534 placement
function isSlugSwept(e) {
  return getLiveState().wakes.sweptSlugs.has(e);
}
//@ chunk-fgz849qw.js:2534-2578 placement
function sweptSlugs() {
  return getLiveState().wakes.sweptSlugs;
}
//@ chunk-fgz849qw.js:2578-2665 placement
function orphanSweptSlugs() {
  let { wakes: wakes } = getLiveState();
  for (let sweptSlug of wakes.sweptSlugs) wakes.orphanedSweptSlugs.add(sweptSlug);
}
//@ chunk-fgz849qw.js:2665-3133 placement
function recordYieldedMessage(e, t) {
  let { wakes: wakes } = getLiveState(),
    o = wakes.yieldedSlugs.get(e);
  if (o !== void 0) {
    o.msgIds.add(t);
    return;
  }
  let r = wakes.sweptSlugs.has(e) && !wakes.orphanedSweptSlugs.has(e),
    s = {
      msgIds: new Set([t]),
      wasPaused: r,
      stopGeneration: -1,
      scanGeneration: wakes.scanGeneration,
      announced: !1,
      stoppedElsewhere: !1,
      latchClockBefore: wakes.latchChangedAt.get(e),
    };
  wakes.yieldedSlugs.set(e, s);
  let humanTurnAtScanGeneration = wakes.humanTurnAtScanGeneration;
  (sweepSlug(e),
    (wakes.humanTurnAtScanGeneration = humanTurnAtScanGeneration),
    a(e, s.latchClockBefore ?? Number.NaN),
    (s.stopGeneration = stopGeneration(e)));
}
//@ chunk-fgz849qw.js:3133-3215 placement
function markYieldAnnounced(e) {
  let t = getLiveState().wakes.yieldedSlugs.get(e);
  if (t !== void 0) t.announced = !0;
}
//@ chunk-fgz849qw.js:3215-3285 placement
function isYieldAnnounced(e) {
  return getLiveState().wakes.yieldedSlugs.get(e)?.announced === !0;
}
//@ chunk-fgz849qw.js:3285-3572 placement
function settleYieldedMessage(e, t) {
  let { wakes: wakes } = getLiveState(),
    o = wakes.yieldedSlugs.get(e);
  if (o === void 0 || !o.msgIds.delete(t) || o.msgIds.size > 0) return !1;
  if (
    (wakes.yieldedSlugs.delete(e),
    !o.wasPaused && stopGeneration(e) === o.stopGeneration && wakes.scanGeneration === o.scanGeneration)
  )
    (resumeSummonWakes(e), a(e, o.latchClockBefore ?? Number.NaN));
  else a(e);
  return !0;
}
//@ chunk-fgz849qw.js:3572-3622 placement
function forgetYieldedSlug(e) {
  getLiveState().wakes.yieldedSlugs.delete(e);
}
//@ chunk-fgz849qw.js:3622-3757 placement
function isYieldedMessage(e, t) {
  let n = getLiveState().wakes.yieldedSlugs.get(e);
  if (n === void 0 || !n.msgIds.has(t)) return !1;
  return ((n.stoppedElsewhere = !0), stopSummonWakes(e), !0);
}
//@ chunk-fgz849qw.js:3757-3834 placement
function isStoppedElsewhere(e) {
  return getLiveState().wakes.yieldedSlugs.get(e)?.stoppedElsewhere === !0;
}
//@ chunk-fgz849qw.js:3834-3887 placement
function isSlugYielded(e) {
  return getLiveState().wakes.yieldedSlugs.has(e);
}
//@ chunk-fgz849qw.js:3887-4040 placement
function isYieldResumable(e) {
  let { wakes: wakes } = getLiveState(),
    n = wakes.yieldedSlugs.get(e);
  return (
    n !== void 0 &&
    !n.wasPaused &&
    stopGeneration(e) === n.stopGeneration &&
    wakes.scanGeneration === n.scanGeneration
  );
}
//@ chunk-fgz849qw.js:4040-4132 placement
function isSlugOrphaned(e) {
  let { wakes: wakes } = getLiveState();
  return wakes.orphanedSweptSlugs.has(e) || wakes.yieldedSlugs.has(e);
}
//@ chunk-fgz849qw.js:4132-4486 placement
function armSummonState(e) {
  let {
      autoReact: autoReact,
      live: live,
      builtInArtifactHiddenForMcp: builtInArtifactHiddenForMcp,
    } = getLiveState(),
    r = live.supervisors.get(e);
  return (
    autoReact.userDisarmed ||
    isSlugStoppedAnywhere(e) ||
    autoReact.wakeEnabledMemo === !1 ||
    (builtInArtifactHiddenForMcp
      ? (r !== void 0 && !r.stopped && r.autoReactWiring === void 0) ||
        autoReact.artifacts.get(e)?.ruleWithheldNoted === !0
      : (autoReact.artifacts.get(e)?.lastProbeDeniedBy ?? null) !== null) ||
    (r !== void 0 && !r.stopped && r.armedVia === "mcp_write")
  );
}
//@ chunk-fgz849qw.js:4486-4590 placement
function sendSummonArm(e, t, n) {
  if ((t(n), !e.summonArmOkReported))
    ((e.summonArmOkReported = !0), logFeatureOk("artifact_summon_arm_emit"));
}
/**
 * 根据是否布防，向该 slug 的活动发送端发送 arm:0 或 arm 并记录声明状态（状态未变时不发）。
 */
//@ chunk-fgz849qw.js:4590-4804 placement
function updateSummonDeclared(e, t, n) {
  let o = e.activitySenders.get(t);
  if (o === void 0) return;
  let r = e.summonDeclared.get(t);
  if (n && r !== !0) (e.summonDeclared.set(t, !0), sendSummonArm(e, o, "arm:0"));
  else if (!n && r === !0) (e.summonDeclared.set(t, !1), sendSummonArm(e, o, "arm"));
}
//@ chunk-fgz849qw.js:4804-4835 placement
function emitSummonArm(e, t) {
  updateSummonDeclared(e, t, armSummonState(t));
}
//@ chunk-fgz849qw.js:4835-4897 placement
function emitSummonArmsForActivity(e) {
  for (let t of e.activitySenders.keys()) emitSummonArm(e, t);
}
//@ chunk-fgz849qw.js:4897-4950 placement
function undeclareSummon(e, t) {
  (e.summonDeclared.delete(t), emitSummonArm(e, t));
}
//@ chunk-fgz849qw.js:4950-4995 placement
function dropSummonDeclaration(e, t) {
  e.summonDeclared.delete(t);
}

export {
  isSlugStopped,
  isSlugSwept,
  isSlugYielded,
  markYieldAnnounced,
  isYieldedMessage,
  isStoppedElsewhere,
  isYieldAnnounced,
  recordYieldedMessage,
  isSlugOrphaned,
  clearSummonWakeTimers,
  bumpSlugEpoch,
  emitSummonArm,
  settleYieldedMessage,
  getSummonWakeState,
  isSlugStoppedAnywhere,
  bumpScanGeneration,
  isYieldResumable,
  stopGeneration,
  sweepSlug,
  markLatchChanged,
  latchChangedAt,
  sweptSlugs,
  orphanSweptSlugs,
  emitSummonArmsForActivity,
  scanStamp,
  armSummonState,
  stopSummonWakes,
  resumeSummonWakes,
  forgetYieldedSlug,
  undeclareSummon,
  dropSummonDeclaration,
};

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
function getSummonWakeState(slug) {
  let { wakes } = getLiveState().wakes;
  let n = wakes.get(slug);
  if (!n) {
    n = {
      coalesceTimer: null,
      rescanWanted: false,
      lastScanScheduledAt: 0,
      rescanArgs: null,
      newestKickAt: 0,
      kickSettled: true,
      kickCount: 0,
      pendingConfirm: null,
      pendingSeed: null,
      lastWakeArgs: null,
      inFlightScan: null,
      idleRescanCancel: null,
      idleRescanUnmuted: false,
      idlePassOwed: null,
      cancelGeneration: 0,
      readRetryTimer: null,
      readRetryAttempts: 0,
    };
    wakes.set(slug, n);
  }
  return n;
}
//@ chunk-fgz849qw.js:651-1142 placement
function clearSummonWakeTimers(e) {
  for (let [t, n] of getLiveState().wakes.wakes) {
    if (e !== undefined && t !== e) continue;
    if (n.coalesceTimer) {
      clearTimeout(n.coalesceTimer);
      n.coalesceTimer = null;
    }
    n.rescanWanted = false;
    n.pendingConfirm = null;
    n.pendingSeed = null;
    n.newestKickAt = 0;
    n.kickSettled = true;
    n.lastScanScheduledAt = 0;
    n.rescanArgs = null;
    n.idleRescanCancel?.();
    n.idleRescanCancel = null;
    n.idleRescanUnmuted = false;
    n.idlePassOwed = null;
    if (n.readRetryTimer) {
      clearTimeout(n.readRetryTimer);
      n.readRetryTimer = null;
    }
    n.readRetryAttempts = 0;
    n.cancelGeneration++;
  }
}
//@ chunk-fgz849qw.js:1142-1185 placement
function bumpScanGeneration() {
  getLiveState().wakes.scanGeneration++;
}
//@ chunk-fgz849qw.js:1185-1255 placement
function bumpSlugEpoch(e) {
  let { slugEpochs } = getLiveState().wakes;
  slugEpochs.set(e, (slugEpochs.get(e) ?? 0) + 1);
}
//@ chunk-fgz849qw.js:1255-1308 placement
function slugEpoch(e) {
  return getLiveState().wakes.slugEpochs.get(e) ?? 0;
}
//@ chunk-fgz849qw.js:1308-1361 placement
function scanStamp(slug) {
  return getLiveState().wakes.scanGeneration + slugEpoch(slug);
}
//@ chunk-fgz849qw.js:1361-1420 placement
function stopGeneration(slug) {
  return getLiveState().wakes.stopGenerations.get(slug) ?? 0;
}
//@ chunk-fgz849qw.js:1420-1493 placement
function bumpStopGeneration(e) {
  let { stopGenerations } = getLiveState().wakes;
  stopGenerations.set(e, (stopGenerations.get(e) ?? 0) + 1);
}
//@ chunk-fgz849qw.js:1493-1654 placement
function markLatchChanged(e, savedAt) {
  let { latchChangedAt } = getLiveState().wakes;
  if (savedAt === undefined) latchChangedAt.set(e, Date.now());
  else if (Number.isFinite(savedAt)) latchChangedAt.set(e, Math.min(savedAt, Date.now()));
  else latchChangedAt.delete(e);
}
//@ chunk-fgz849qw.js:1654-1664 placement
var markLatchChangedArms = markLatchChanged;
//@ chunk-fgz849qw.js:1664-1720 placement
function latchChangedAt(e) {
  return getLiveState().wakes.latchChangedAt.get(e);
}
//@ chunk-fgz849qw.js:1720-1876 placement
function stopSummonWakes(e) {
  let { wakes } = getLiveState();
  markLatchChangedArms(e);
  wakes.stoppedSlugs.add(e);
  wakes.sweptSlugs.delete(e);
  wakes.orphanedSweptSlugs.delete(e);
  bumpStopGeneration(e);
  wakes.pendingResumeDisclosure.delete(e);
}
//@ chunk-fgz849qw.js:1876-2019 placement
function resumeSummonWakes(slug) {
  let { wakes } = getLiveState();
  if (wakes.stoppedSlugs.has(slug)) markLatchChangedArms(slug);
  wakes.stoppedSlugs.delete(slug);
  wakes.sweptSlugs.delete(slug);
  wakes.orphanedSweptSlugs.delete(slug);
}
//@ chunk-fgz849qw.js:2019-2072 placement
function isSlugStopped(slug) {
  return getLiveState().wakes.stoppedSlugs.has(slug);
}
//@ chunk-fgz849qw.js:2072-2169 placement
function isSlugStoppedAnywhere(slug) {
  let liveState = getLiveState();
  return liveState.wakes.stoppedSlugs.has(slug) || liveState.durable.stopLatches.isStopped(slug);
}
//@ chunk-fgz849qw.js:2169-2483 placement
function sweepSlug(e) {
  let { wakes } = getLiveState();
  if (!wakes.stoppedSlugs.has(e)) {
    markLatchChangedArms(e);
    wakes.stoppedSlugs.add(e);
    wakes.sweptSlugs.add(e);
    bumpStopGeneration(e);
  } else {
    let n = wakes.yieldedSlugs.get(e);
    if (n !== undefined) {
      n.wasPaused = true;
      bumpStopGeneration(e);
    }
  }
  wakes.humanTurnAtScanGeneration = null;
  wakes.liftedAtScanGeneration.delete(e);
  wakes.orphanedSweptSlugs.delete(e);
  wakes.pendingResumeDisclosure.delete(e);
}
//@ chunk-fgz849qw.js:2483-2534 placement
function isSlugSwept(slug) {
  return getLiveState().wakes.sweptSlugs.has(slug);
}
//@ chunk-fgz849qw.js:2534-2578 placement
function sweptSlugs() {
  return getLiveState().wakes.sweptSlugs;
}
//@ chunk-fgz849qw.js:2578-2665 placement
function orphanSweptSlugs() {
  let { wakes } = getLiveState();
  for (let sweptSlug of wakes.sweptSlugs) wakes.orphanedSweptSlugs.add(sweptSlug);
}
//@ chunk-fgz849qw.js:2665-3133 placement
function recordYieldedMessage(e, t) {
  let { wakes } = getLiveState();
  let o = wakes.yieldedSlugs.get(e);
  if (o !== undefined) {
    o.msgIds.add(t);
    return;
  }
  let wasPaused = wakes.sweptSlugs.has(e) && !wakes.orphanedSweptSlugs.has(e);
  let s = {
    msgIds: new Set([t]),
    wasPaused,
    stopGeneration: -1,
    scanGeneration: wakes.scanGeneration,
    announced: false,
    stoppedElsewhere: false,
    latchClockBefore: wakes.latchChangedAt.get(e),
  };
  wakes.yieldedSlugs.set(e, s);
  let humanTurnAtScanGeneration = wakes.humanTurnAtScanGeneration;
  sweepSlug(e);
  wakes.humanTurnAtScanGeneration = humanTurnAtScanGeneration;
  markLatchChangedArms(e, s.latchClockBefore ?? Number.NaN);
  s.stopGeneration = stopGeneration(e);
}
//@ chunk-fgz849qw.js:3133-3215 placement
function markYieldAnnounced(e) {
  let t = getLiveState().wakes.yieldedSlugs.get(e);
  if (t !== undefined) t.announced = true;
}
//@ chunk-fgz849qw.js:3215-3285 placement
function isYieldAnnounced(e) {
  return getLiveState().wakes.yieldedSlugs.get(e)?.announced === true;
}
//@ chunk-fgz849qw.js:3285-3572 placement
function settleYieldedMessage(e, t) {
  let { wakes } = getLiveState();
  let o = wakes.yieldedSlugs.get(e);
  if (o === undefined || !o.msgIds.delete(t) || o.msgIds.size > 0) return false;
  wakes.yieldedSlugs.delete(e);
  if (!o.wasPaused && stopGeneration(e) === o.stopGeneration && wakes.scanGeneration === o.scanGeneration) {
    resumeSummonWakes(e);
    markLatchChangedArms(e, o.latchClockBefore ?? Number.NaN);
  } else markLatchChangedArms(e);
  return true;
}
//@ chunk-fgz849qw.js:3572-3622 placement
function forgetYieldedSlug(slug) {
  getLiveState().wakes.yieldedSlugs.delete(slug);
}
//@ chunk-fgz849qw.js:3622-3757 placement
function isYieldedMessage(e, t) {
  let n = getLiveState().wakes.yieldedSlugs.get(e);
  if (n === undefined || !n.msgIds.has(t)) return false;
  n.stoppedElsewhere = true;
  stopSummonWakes(e);
  return true;
}
//@ chunk-fgz849qw.js:3757-3834 placement
function isStoppedElsewhere(e) {
  return getLiveState().wakes.yieldedSlugs.get(e)?.stoppedElsewhere === true;
}
//@ chunk-fgz849qw.js:3834-3887 placement
function isSlugYielded(e) {
  return getLiveState().wakes.yieldedSlugs.has(e);
}
//@ chunk-fgz849qw.js:3887-4040 placement
function isYieldResumable(slug) {
  let { wakes } = getLiveState();
  let n = wakes.yieldedSlugs.get(slug);
  return (
    n !== undefined &&
    !n.wasPaused &&
    stopGeneration(slug) === n.stopGeneration &&
    wakes.scanGeneration === n.scanGeneration
  );
}
//@ chunk-fgz849qw.js:4040-4132 placement
function isSlugOrphaned(e) {
  let { wakes } = getLiveState();
  return wakes.orphanedSweptSlugs.has(e) || wakes.yieldedSlugs.has(e);
}
//@ chunk-fgz849qw.js:4132-4486 placement
function armSummonState(e) {
  let { autoReact, live, builtInArtifactHiddenForMcp } = getLiveState();
  let r = live.supervisors.get(e);
  return (
    autoReact.userDisarmed ||
    isSlugStoppedAnywhere(e) ||
    autoReact.wakeEnabledMemo === false ||
    (builtInArtifactHiddenForMcp
      ? (r !== undefined && !r.stopped && r.autoReactWiring === undefined) ||
        autoReact.artifacts.get(e)?.ruleWithheldNoted === true
      : (autoReact.artifacts.get(e)?.lastProbeDeniedBy ?? null) !== null) ||
    (r !== undefined && !r.stopped && r.armedVia === "mcp_write")
  );
}
//@ chunk-fgz849qw.js:4486-4590 placement
function sendSummonArm(e, t, n) {
  t(n);
  if (!e.summonArmOkReported) {
    e.summonArmOkReported = true;
    logFeatureOk("artifact_summon_arm_emit");
  }
}
//@ chunk-fgz849qw.js:4590-4804 placement
/**
 * 根据是否布防，向该 slug 的活动发送端发送 arm:0 或 arm 并记录声明状态（状态未变时不发）。
 */
function updateSummonDeclared(e, t, n) {
  let o = e.activitySenders.get(t);
  if (o === undefined) return;
  let r = e.summonDeclared.get(t);
  if (n && r !== true) {
    e.summonDeclared.set(t, true);
    sendSummonArm(e, o, "arm:0");
  } else if (!n && r === true) {
    e.summonDeclared.set(t, false);
    sendSummonArm(e, o, "arm");
  }
}
//@ chunk-fgz849qw.js:4804-4835 placement
function emitSummonArm(live, slug) {
  updateSummonDeclared(live, slug, armSummonState(slug));
}
//@ chunk-fgz849qw.js:4835-4897 placement
function emitSummonArmsForActivity(live) {
  for (let key of live.activitySenders.keys()) emitSummonArm(live, key);
}
//@ chunk-fgz849qw.js:4897-4950 placement
function undeclareSummon(e, t) {
  e.summonDeclared.delete(t);
  emitSummonArm(e, t);
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

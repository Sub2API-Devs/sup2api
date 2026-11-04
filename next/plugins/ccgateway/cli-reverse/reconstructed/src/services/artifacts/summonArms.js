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
  let wake = wakes.get(slug);
  if (!wake) {
    wake = {
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
    wakes.set(slug, wake);
  }
  return wake;
}
//@ chunk-fgz849qw.js:651-1142 placement
function clearSummonWakeTimers(reason) {
  for (let [slug, wake] of getLiveState().wakes.wakes) {
    if (reason !== undefined && slug !== reason) continue;
    if (wake.coalesceTimer) {
      clearTimeout(wake.coalesceTimer);
      wake.coalesceTimer = null;
    }
    wake.rescanWanted = false;
    wake.pendingConfirm = null;
    wake.pendingSeed = null;
    wake.newestKickAt = 0;
    wake.kickSettled = true;
    wake.lastScanScheduledAt = 0;
    wake.rescanArgs = null;
    wake.idleRescanCancel?.();
    wake.idleRescanCancel = null;
    wake.idleRescanUnmuted = false;
    wake.idlePassOwed = null;
    if (wake.readRetryTimer) {
      clearTimeout(wake.readRetryTimer);
      wake.readRetryTimer = null;
    }
    wake.readRetryAttempts = 0;
    wake.cancelGeneration++;
  }
}
//@ chunk-fgz849qw.js:1142-1185 placement
function bumpScanGeneration() {
  getLiveState().wakes.scanGeneration++;
}
//@ chunk-fgz849qw.js:1185-1255 placement
function bumpSlugEpoch(slug) {
  let { slugEpochs } = getLiveState().wakes;
  slugEpochs.set(slug, (slugEpochs.get(slug) ?? 0) + 1);
}
//@ chunk-fgz849qw.js:1255-1308 placement
function slugEpoch(slug) {
  return getLiveState().wakes.slugEpochs.get(slug) ?? 0;
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
function bumpStopGeneration(slug) {
  let { stopGenerations } = getLiveState().wakes;
  stopGenerations.set(slug, (stopGenerations.get(slug) ?? 0) + 1);
}
//@ chunk-fgz849qw.js:1493-1654 placement
function markLatchChanged(slug, savedAt) {
  let { latchChangedAt } = getLiveState().wakes;
  if (savedAt === undefined) latchChangedAt.set(slug, Date.now());
  else if (Number.isFinite(savedAt)) latchChangedAt.set(slug, Math.min(savedAt, Date.now()));
  else latchChangedAt.delete(slug);
}
//@ chunk-fgz849qw.js:1654-1664 placement
var markLatchChangedArms = markLatchChanged;
//@ chunk-fgz849qw.js:1664-1720 placement
function latchChangedAt(slug) {
  return getLiveState().wakes.latchChangedAt.get(slug);
}
//@ chunk-fgz849qw.js:1720-1876 placement
function stopSummonWakes(slug) {
  let { wakes } = getLiveState();
  markLatchChangedArms(slug);
  wakes.stoppedSlugs.add(slug);
  wakes.sweptSlugs.delete(slug);
  wakes.orphanedSweptSlugs.delete(slug);
  bumpStopGeneration(slug);
  wakes.pendingResumeDisclosure.delete(slug);
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
function sweepSlug(slug) {
  let { wakes } = getLiveState();
  if (!wakes.stoppedSlugs.has(slug)) {
    markLatchChangedArms(slug);
    wakes.stoppedSlugs.add(slug);
    wakes.sweptSlugs.add(slug);
    bumpStopGeneration(slug);
  } else {
    let entry = wakes.yieldedSlugs.get(slug);
    if (entry !== undefined) {
      entry.wasPaused = true;
      bumpStopGeneration(slug);
    }
  }
  wakes.humanTurnAtScanGeneration = null;
  wakes.liftedAtScanGeneration.delete(slug);
  wakes.orphanedSweptSlugs.delete(slug);
  wakes.pendingResumeDisclosure.delete(slug);
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
function recordYieldedMessage(slug, msgId) {
  let { wakes } = getLiveState();
  let entry = wakes.yieldedSlugs.get(slug);
  if (entry !== undefined) {
    entry.msgIds.add(msgId);
    return;
  }
  let wasPaused = wakes.sweptSlugs.has(slug) && !wakes.orphanedSweptSlugs.has(slug);
  let yielded = {
    msgIds: new Set([msgId]),
    wasPaused,
    stopGeneration: -1,
    scanGeneration: wakes.scanGeneration,
    announced: false,
    stoppedElsewhere: false,
    latchClockBefore: wakes.latchChangedAt.get(slug),
  };
  wakes.yieldedSlugs.set(slug, yielded);
  let humanTurnAtScanGeneration = wakes.humanTurnAtScanGeneration;
  sweepSlug(slug);
  wakes.humanTurnAtScanGeneration = humanTurnAtScanGeneration;
  markLatchChangedArms(slug, yielded.latchClockBefore ?? Number.NaN);
  yielded.stopGeneration = stopGeneration(slug);
}
//@ chunk-fgz849qw.js:3133-3215 placement
function markYieldAnnounced(slug) {
  let entry = getLiveState().wakes.yieldedSlugs.get(slug);
  if (entry !== undefined) entry.announced = true;
}
//@ chunk-fgz849qw.js:3215-3285 placement
function isYieldAnnounced(slug) {
  return getLiveState().wakes.yieldedSlugs.get(slug)?.announced === true;
}
//@ chunk-fgz849qw.js:3285-3572 placement
function settleYieldedMessage(slug, msgId) {
  let { wakes } = getLiveState();
  let entry = wakes.yieldedSlugs.get(slug);
  if (entry === undefined || !entry.msgIds.delete(msgId) || entry.msgIds.size > 0) return false;
  wakes.yieldedSlugs.delete(slug);
  if (
    !entry.wasPaused &&
    stopGeneration(slug) === entry.stopGeneration &&
    wakes.scanGeneration === entry.scanGeneration
  ) {
    resumeSummonWakes(slug);
    markLatchChangedArms(slug, entry.latchClockBefore ?? Number.NaN);
  } else markLatchChangedArms(slug);
  return true;
}
//@ chunk-fgz849qw.js:3572-3622 placement
function forgetYieldedSlug(slug) {
  getLiveState().wakes.yieldedSlugs.delete(slug);
}
//@ chunk-fgz849qw.js:3622-3757 placement
function isYieldedMessage(slug, msgId) {
  let entry = getLiveState().wakes.yieldedSlugs.get(slug);
  if (entry === undefined || !entry.msgIds.has(msgId)) return false;
  entry.stoppedElsewhere = true;
  stopSummonWakes(slug);
  return true;
}
//@ chunk-fgz849qw.js:3757-3834 placement
function isStoppedElsewhere(slug) {
  return getLiveState().wakes.yieldedSlugs.get(slug)?.stoppedElsewhere === true;
}
//@ chunk-fgz849qw.js:3834-3887 placement
function isSlugYielded(slug) {
  return getLiveState().wakes.yieldedSlugs.has(slug);
}
//@ chunk-fgz849qw.js:3887-4040 placement
function isYieldResumable(slug) {
  let { wakes } = getLiveState();
  let entry = wakes.yieldedSlugs.get(slug);
  return (
    entry !== undefined &&
    !entry.wasPaused &&
    stopGeneration(slug) === entry.stopGeneration &&
    wakes.scanGeneration === entry.scanGeneration
  );
}
//@ chunk-fgz849qw.js:4040-4132 placement
function isSlugOrphaned(slug) {
  let { wakes } = getLiveState();
  return wakes.orphanedSweptSlugs.has(slug) || wakes.yieldedSlugs.has(slug);
}
//@ chunk-fgz849qw.js:4132-4486 placement
function armSummonState(slug) {
  let { autoReact, live, builtInArtifactHiddenForMcp } = getLiveState();
  let supervisor = live.supervisors.get(slug);
  return (
    autoReact.userDisarmed ||
    isSlugStoppedAnywhere(slug) ||
    autoReact.wakeEnabledMemo === false ||
    (builtInArtifactHiddenForMcp
      ? (supervisor !== undefined && !supervisor.stopped && supervisor.autoReactWiring === undefined) ||
        autoReact.artifacts.get(slug)?.ruleWithheldNoted === true
      : (autoReact.artifacts.get(slug)?.lastProbeDeniedBy ?? null) !== null) ||
    (supervisor !== undefined && !supervisor.stopped && supervisor.armedVia === "mcp_write")
  );
}
//@ chunk-fgz849qw.js:4486-4590 placement
function sendSummonArm(live, slug, state) {
  slug(state);
  if (!live.summonArmOkReported) {
    live.summonArmOkReported = true;
    logFeatureOk("artifact_summon_arm_emit");
  }
}
//@ chunk-fgz849qw.js:4590-4804 placement
/**
 * 根据是否布防，向该 slug 的活动发送端发送 arm:0 或 arm 并记录声明状态（状态未变时不发）。
 */
function updateSummonDeclared(live, slug, declared) {
  let senders = live.activitySenders.get(slug);
  if (senders === undefined) return;
  let existing = live.summonDeclared.get(slug);
  if (declared && existing !== true) {
    live.summonDeclared.set(slug, true);
    sendSummonArm(live, senders, "arm:0");
  } else if (!declared && existing === true) {
    live.summonDeclared.set(slug, false);
    sendSummonArm(live, senders, "arm");
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
function undeclareSummon(live, slug) {
  live.summonDeclared.delete(slug);
  emitSummonArm(live, slug);
}
//@ chunk-fgz849qw.js:4950-4995 placement
function dropSummonDeclaration(live, slug) {
  live.summonDeclared.delete(slug);
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

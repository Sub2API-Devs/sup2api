/**
 * services/skillsSync/skillsSync.ts
 *
 * 2.1.316 新增。claude.ai skills 同步（bucket、清单、下载）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hme9amad.js (66)
 * attribution: placement 66
 */
import { lstat, readdir, rm, rmdir, stat, readFile } from "fs/promises";
import { join, relative, sep } from "path";
import { COLLISION_LOSER } from "../../skills/hostSkillMounts.js";
import {
  isPluginDirMissingFromSyncedList,
  getHeldBackSyncedPlugins,
  clearCommandMemoizationCaches,
} from "../../commands.js";
import {
  firstLiveSessionMatching,
  SessionRecordsUnreadableError,
} from "../../utils/udsMessaging/udsClient.js";
import { findInstalledSyncedPlugins } from "../../utils/claudeAiSync/pluginsSync.js";
import { logError } from "../../utils/log.js";
import { toError, isENOENT, getErrnoCode } from "../../utils/errors.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { getLastSyncedLaneLoad, onInteraction, isDiskless } from "../../bootstrap/state.js";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../analytics/growthbook.js";
import { isIdleLongerThan } from "../api/errorUtils.js";
import { hasActiveWork, onWorkStarted } from "../../utils/sessionActivity.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { getEntrypointKind, isHeadlessHostEntrypoint } from "../../utils/entrypointKinds.js";
import {
  getStoredAccountBucket,
  SKILLS_SYNC_DIR_2,
  isSyncBucketName,
  isHiddenFoldName,
  SKILLS_SYNC_DIR,
  SYNCED_MANIFEST_FILE,
  TRASH_SUBDIR,
  syncedItemPath,
} from "../../utils/plugins/syncedItems.js";
import {
  checkReuseWindow,
  readReuseStamp,
  syncReuseWithinMs,
  isSessionRefsSkillsSyncOn,
  refreshSkillsSyncVeto,
  isSkillsSyncLive,
  isSkillsCustomizationAllowed,
  readSkillsSyncSettingAlt,
  isAccountSkillsSyncDenied,
  lastCompleteRoundPath,
  removeSyncedSkillDir,
  MAX_SYNCED_SKILL_BYTES,
  readManifestText,
  parseManifestJson,
  parseValidRows,
  stringArray,
  mergeManifestRows,
  omitKeys_2,
  mergeStaleDirs,
  planSyncDownloads,
} from "../../utils/claudeAiSync/skillsSync.js";
import {
  hasSyncMarker,
  verifySyncRoot,
  readSyncMarker,
  checkSyncRoots,
  rootRefusedError,
} from "../../utils/claudeAiSync/syncOwnedRoot.js";
import { isPlainNonInteractive, envSessionKind } from "../../utils/sessionShape.js";
import { ORG_SKILL_ZIP_TIMEOUT_MS } from "./orgSkillsApi.js";
import { env } from "../../utils/env.js";
import { runSyncRoundOnce, reconcileSkillsManifest, checkSyncOwnedRootFor } from "./syncRound.js";
import { sleep } from "../../utils/sleep.js";
import { sessionSkillManifestSlot } from "../plugins/accountSync/sessionSkillManifest.js";
import {
  clearSkillCaches,
  syncedSkillsManifestSchema as syncedSkillsManifestSchema_2,
  syncedSkillEntrySchema as syncedSkillEntrySchema_2,
} from "../../skills/loadSkillsDir.js";
import { skillsChangedSignal } from "../../utils/plugins/pluginsChangedSignal.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  looseObject,
  numberSchema,
  array,
  unknown,
  stringSchema,
  undefinedSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { MAX_SCOPE_RESPONSE_BYTES } from "../plugins/accountSync/pluginsScopeGate.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hme9amad.js:2036-2772 placement
async function resolveSkillsBucket(candidates, skills, syncBucket) {
  let syncedSkillIds = new Set(skills.map((skill) => skill.skillId));
  let filtered = candidates.filter(
    (candidate) =>
      candidate.backingPluginId !== undefined &&
      candidate.updatedAt !== COLLISION_LOSER &&
      !syncedSkillIds.has(candidate.skillId) &&
      isPluginDirMissingFromSyncedList(syncBucket, candidate.backingPluginId),
  );
  if (filtered.length === 0) return [];
  let kept = filtered;
  let keepReason = "another_session";
  try {
    if (
      (await firstLiveSessionMatching(
        (record) =>
          record.pid !== process.pid &&
          record.kind !== "daemon" &&
          record.asksForConvertedSkills !== true &&
          record.asksForConvertedSkills !== null,
      )) === undefined
    ) {
      let installedSyncedPlugins = await findInstalledSyncedPlugins(
        syncBucket,
        new Set(filtered.flatMap((candidate) => candidate.backingPluginId ?? [])),
      );
      if (installedSyncedPlugins === null) keepReason = "plugins_bucket_unread";
      else {
        keepReason = "no_plugin_folder";
        kept = filtered.filter(
          (candidate) =>
            candidate.backingPluginId !== undefined && !installedSyncedPlugins.has(candidate.backingPluginId),
        );
      }
    }
  } catch (error) {
    keepReason = "registry_unreadable";
    if (!(error instanceof SessionRecordsUnreadableError)) {
      keepReason = "read_failed";
      logError(toError(error));
    }
  }
  if (kept.length > 0)
    logForDiagnosticsNoPII("info", "skills_sync_converted_copies_kept", {
      count: kept.length,
      reason: keepReason,
    });
  return kept;
}
//@ chunk-hme9amad.js:2772-3399 placement
/**
 * 检查被同步技能遮蔽的插件目录是否已消失，若消失的目录对应列表中的技能则记录并返回 true（需要重新同步）。
 */
async function noteHidingFoldersGone(refetchSkills) {
  let heldBackSyncedPlugins = getHeldBackSyncedPlugins();
  let filtered = (getLastSyncedLaneLoad() ?? []).filter(
    ({ pluginId }) => pluginId !== undefined && heldBackSyncedPlugins.get(pluginId)?.heldBack === false,
  );
  let results = await Promise.all(
    filtered.map(({ folder }) =>
      lstat(folder).then(
        () => true,
        (error) => !isENOENT(error),
      ),
    ),
  );
  let filtered_2 = filtered.filter((entry, index) => !results[index]);
  let state = remoteToolsState();
  let filtered_3 = filtered_2.filter(({ folder }) => state.hidingFoldersGone.has(folder));
  let filtered_4 = filtered_2.filter(({ folder }) => !state.hidingFoldersGone.has(folder));
  let freshSkills = filtered_4.length > 0 ? await refetchSkills() : [];
  let presentPluginIds = new Set(
    freshSkills.flatMap((skill) =>
      skill.updatedAt === COLLISION_LOSER ? [] : (skill.backingPluginId ?? []),
    ),
  );
  let filtered_5 = filtered_4.filter(
    ({ pluginId }) => pluginId !== undefined && presentPluginIds.has(pluginId),
  );
  state.hidingFoldersGone = new Set([...filtered_3, ...filtered_5].map(({ folder }) => folder));
  if (filtered_5.length === 0) return false;
  logForDiagnosticsNoPII("info", "skills_sync_hiding_plugin_folder_gone", {
    count: filtered_5.length,
  });
  return true;
}
//@ chunk-hme9amad.js:3399-3593 placement
/**
 * 技能同步的调度常量：默认/最小/最大间隔、空闲倍数、退避、睡眠检测阈值与对应的特性开关名。
 */
var DEFAULT_SYNC_INTERVAL_MINUTES = 10;
var DEFAULT_SYNC_INTERVAL_MS = DEFAULT_SYNC_INTERVAL_MINUTES * 60000;
var MAX_SYNC_BACKOFF_FACTOR = 4;
var SYNC_INTERVAL_FLAG = "tengu_claudeai_skills_sync_interval_minutes";
var MIN_SYNC_INTERVAL_MINUTES = 5;
var MAX_SYNC_INTERVAL_MINUTES = 1440;
var IDLE_SYNC_INTERVALS_FLAG = "tengu_claudeai_skills_sync_idle_intervals";
var DEFAULT_IDLE_INTERVAL_FACTOR = 4;
var MAX_IDLE_INTERVAL_FACTOR = 4;
var MAX_IDLE_SYNC_INTERVAL_MS = 3600000;
var SYNC_JITTER_BASE_MS = 30000;
var SYNC_JITTER_RANGE_MS = 60000;
var WAKE_SETTLE_MS = 180000;
var FIRST_FAILED_ROUND_THRESHOLD_MS = 45000;
//@ chunk-hme9amad.js:3593-3719 placement
function syncIntervalMs() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    SYNC_INTERVAL_FLAG,
    DEFAULT_SYNC_INTERVAL_MINUTES,
  );
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "number" ||
    Number.isNaN(featureValue_CACHED_MAY_BE_STALE) ||
    featureValue_CACHED_MAY_BE_STALE <= 0
  )
    return DEFAULT_SYNC_INTERVAL_MS;
  return (
    Math.min(
      Math.max(featureValue_CACHED_MAY_BE_STALE, MIN_SYNC_INTERVAL_MINUTES),
      MAX_SYNC_INTERVAL_MINUTES,
    ) * 60000
  );
}
//@ chunk-hme9amad.js:3719-3774 placement
/**
 * 当前是否应走空闲同步节奏（空闲间隔更长、无活跃工作）。
 */
function shouldWeatherIdle() {
  let baseIntervalMs = syncIntervalMs();
  return idleSyncIntervalMs() > baseIntervalMs && isIdleLongerThan(baseIntervalMs) && !hasActiveWork();
}
//@ chunk-hme9amad.js:3774-3916 placement
function idleSyncIntervalMs() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    IDLE_SYNC_INTERVALS_FLAG,
    DEFAULT_IDLE_INTERVAL_FACTOR,
  );
  let factor =
    typeof featureValue_CACHED_MAY_BE_STALE === "number" && !Number.isNaN(featureValue_CACHED_MAY_BE_STALE)
      ? Math.min(Math.max(featureValue_CACHED_MAY_BE_STALE, 1), MAX_IDLE_INTERVAL_FACTOR)
      : DEFAULT_IDLE_INTERVAL_FACTOR;
  let baseIntervalMs = syncIntervalMs();
  return Math.max(baseIntervalMs, Math.min(baseIntervalMs * factor, MAX_IDLE_SYNC_INTERVAL_MS));
}
//@ chunk-hme9amad.js:3916-3969 placement
/**
 * 同步间隔的随机抖动值。
 */
function syncJitterMs() {
  return SYNC_JITTER_BASE_MS + Math.floor(Math.random() * SYNC_JITTER_RANGE_MS);
}
//@ chunk-hme9amad.js:3969-4038 placement
/**
 * 按连续失败轮数计算指数退避后的同步间隔（封顶为基准的若干倍）。
 */
function backoffIntervalMs(consecutiveFailedRounds) {
  let baseIntervalMs = syncIntervalMs();
  return Math.min(
    baseIntervalMs * 2 ** Math.max(0, consecutiveFailedRounds - 1),
    baseIntervalMs * MAX_SYNC_BACKOFF_FACTOR,
  );
}
//@ chunk-hme9amad.js:4038-4157 placement
function armResync(runRound) {
  let state = remoteToolsState();
  if (state.resyncTimer) return;
  state.resyncRunRound = runRound;
  scheduleResync(state, runRound, backoffIntervalMs(state.consecutiveFailedRounds), "resync", false);
}
//@ chunk-hme9amad.js:4157-4292 placement
function rescheduleResync(delayMs) {
  let state = remoteToolsState();
  if (!state.resyncTimer || !state.resyncRunRound) return;
  clearTimeout(state.resyncTimer);
  scheduleResync(state, state.resyncRunRound, delayMs, "resync", false);
}
//@ chunk-hme9amad.js:4292-4559 placement
function awaitActivityForResync() {
  let state = remoteToolsState();
  if (state.stopAwaitingActivity) return;
  let mapped = [onInteraction, onWorkStarted].map((subscribe) =>
    subscribe(() => {
      state.stopAwaitingActivity?.();
      if (state.syncPromise) state.syncPromise.catch(() => {}).then(() => resyncOnActivity(state));
      else resyncOnActivity(state);
    }),
  );
  state.stopAwaitingActivity = () => {
    state.stopAwaitingActivity = null;
    for (let unsubscribe of mapped) unsubscribe();
  };
}
//@ chunk-hme9amad.js:4559-4613 placement
function isAwaitingActivityStop() {
  return remoteToolsState().stopAwaitingActivity !== null;
}
//@ chunk-hme9amad.js:4613-4657 placement
function stopAwaitingActivity() {
  remoteToolsState().stopAwaitingActivity?.();
}
//@ chunk-hme9amad.js:4657-5137 placement
/**
 * 有用户活动时调整重新同步计时（睡眠后跳过或提前）。
 */
function resyncOnActivity(state) {
  try {
    let resyncArmed = state.resyncArmed;
    if (!state.resyncTimer || !state.resyncRunRound || !resyncArmed || resyncArmed.trigger === "wake_settle")
      return;
    let rounded = Math.round(Date.now() - resyncArmed.wallMs - (performance.now() - resyncArmed.monotonicMs));
    if (rounded > FIRST_FAILED_ROUND_THRESHOLD_MS && state.consecutiveFailedRounds === 0) {
      clearTimeout(state.resyncTimer);
      skipResyncAfterSleep(state, state.resyncRunRound, resyncArmed.trigger, rounded, true);
      return;
    }
    let backoffMs = state.consecutiveFailedRounds > 0 ? backoffIntervalMs(state.consecutiveFailedRounds) : 0;
    if (resyncArmed.wallMs + resyncArmed.delayMs - Date.now() > backoffMs) {
      clearTimeout(state.resyncTimer);
      scheduleResync(state, state.resyncRunRound, backoffMs, "resync", true);
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-hme9amad.js:5137-5188 placement
function rescheduleResyncByBackoff() {
  rescheduleResync(backoffIntervalMs(remoteToolsState().consecutiveFailedRounds));
}
//@ chunk-hme9amad.js:5188-5379 placement
function scheduleResync(state, runRound, delayMs, trigger, woken) {
  let dueAtMs = Date.now() + delayMs;
  state.resyncArmed = {
    trigger,
    delayMs,
    wallMs: Date.now(),
    monotonicMs: performance.now(),
  };
  state.resyncTimer = setTimeout(runResyncTick, delayMs, state, runRound, dueAtMs, trigger, woken);
  state.resyncTimer.unref?.();
}
//@ chunk-hme9amad.js:5379-5628 placement
function runResyncTick(state, runRound, dueAtMs, trigger, woken) {
  let resyncTimer = state.resyncTimer;
  let max = Math.max(0, Date.now() - dueAtMs);
  if (max > FIRST_FAILED_ROUND_THRESHOLD_MS) {
    skipResyncAfterSleep(state, runRound, trigger, max, false);
    return;
  }
  runRound({
    trigger,
    tickLateMs: max,
    ...(woken && {
      woken,
    }),
  })
    .catch(() => {})
    .then(() => {
      if (state.resyncTimer !== resyncTimer) return;
      scheduleResync(state, runRound, backoffIntervalMs(state.consecutiveFailedRounds), "resync", false);
    });
}
//@ chunk-hme9amad.js:5628-5865 placement
function skipResyncAfterSleep(state, runRound, trigger, lateMs, woken) {
  logForDiagnosticsNoPII("info", "skills_sync_resync_skipped_after_sleep", {
    late_ms: lateMs,
    woken,
  });
  scheduleResync(state, runRound, WAKE_SETTLE_MS, "wake_settle", woken);
  try {
    if (!isDiskless())
      logEvent("tengu_skills_sync_resync_skipped", {
        trigger: fromEnum(trigger),
        tick_late_ms: lateMs,
        settle_ms: WAKE_SETTLE_MS,
        woken,
      });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-hme9amad.js:5865-5878 placement
var MAX_STARTUP_SYNC_WAIT_MS = 60000;
//@ chunk-hme9amad.js:5878-5935 placement
/**
 * 构造 listedFor 键：入口类型，加上是否把技能转换成了插件。
 */
function listedForKey(convertedSkillsAsPlugins) {
  let entrypointKind = getEntrypointKind() ?? "none";
  return convertedSkillsAsPlugins ? `${entrypointKind}${CONVERTED_SKILLS_SUFFIX}` : entrypointKind;
}
//@ chunk-hme9amad.js:5935-5962 placement
var CONVERTED_SKILLS_SUFFIX = ".converted-skills";
//@ chunk-hme9amad.js:5962-6040 placement
function onlyConvertedSkills(result) {
  return {
    ...result,
    listedFor: result.listedFor.filter((listedFor) => listedFor.endsWith(CONVERTED_SKILLS_SUFFIX)),
  };
}
//@ chunk-hme9amad.js:6040-6858 placement
async function reuseSkillsSyncRound({
  syncedRoot,
  bucket,
  root,
  trigger,
  pinned,
  lastGeneration,
  holdsPlaceholders,
  idle,
  convertedSkillsAsPlugins,
}) {
  let isSharedBucket = !pinned && bucket === getStoredAccountBucket();
  let firstDelayMs = pinned ? undefined : firstResyncDelay(trigger, isSharedBucket, idle);
  if (firstDelayMs === undefined)
    return {
      list: true,
      shared: isSharedBucket,
    };
  if (isSharedBucket && idle) awaitActivityForResync();
  let reuseWindow = await checkReuseWindow(root, firstDelayMs);
  if (!reuseWindow.reuse || !(await hasSyncMarker(syncedRoot, bucket))) {
    stopAwaitingActivity();
    return {
      list: true,
      shared: isSharedBucket,
    };
  }
  let reuseStamp = await readReuseStamp(root);
  let reload = false;
  if (isSharedBucket) {
    if (
      reuseStamp === null ||
      holdsPlaceholders ||
      !reuseStamp.listedFor.includes(listedForKey(convertedSkillsAsPlugins))
    ) {
      stopAwaitingActivity();
      return {
        list: true,
        shared: isSharedBucket,
      };
    }
    let isAwaiting = idle && isAwaitingActivityStop();
    if (idle && !isAwaiting && reuseWindow.ageMs >= syncIntervalMs())
      return {
        list: true,
        shared: isSharedBucket,
      };
    reload = reuseStamp.token !== lastGeneration && trigger !== "startup";
    let reuseIntervalMs = isAwaiting ? idleSyncIntervalMs() : syncIntervalMs();
    if (reuseWindow.ageMs < reuseIntervalMs)
      rescheduleResync(reuseIntervalMs - reuseWindow.ageMs + syncJitterMs());
  } else {
    let listedFor = reuseStamp?.listedFor ?? [];
    if (
      !(convertedSkillsAsPlugins
        ? listedFor.includes(listedForKey(true))
        : listedFor.includes(listedForKey(false)) ||
          !listedFor.some((listedEntry) => listedEntry.endsWith(CONVERTED_SKILLS_SUFFIX)))
    )
      return {
        list: true,
        shared: isSharedBucket,
      };
  }
  logForDiagnosticsNoPII("info", "skills_sync_round_reused", {
    age_ms: reuseWindow.ageMs,
    within_ms: reuseWindow.withinMs,
  });
  return {
    list: false,
    generation: reuseStamp?.token ?? null,
    reload,
  };
}
//@ chunk-hme9amad.js:6858-7045 placement
function firstResyncDelay(trigger, isSharedBucket, idle) {
  let reuseWithinMs = trigger === "startup" ? syncReuseWithinMs() : undefined;
  if (!isSharedBucket || trigger === "reload") return reuseWithinMs;
  if (idle) return idleSyncIntervalMs();
  let intervalMs =
    trigger === "startup" && (!isPlainNonInteractive() || (isHeadlessHostEntrypoint() && envSessionKind()))
      ? Math.min(MAX_STARTUP_SYNC_WAIT_MS, syncIntervalMs())
      : syncIntervalMs();
  return Math.max(intervalMs, reuseWithinMs ?? 0);
}
//@ chunk-hme9amad.js:7045-7074 placement
var TENGU_JAUNTY_ALPACA = "tengu_jaunty_alpaca";
//@ chunk-hme9amad.js:7074-7110 placement
function isJauntyAlpacaOn() {
  return getFeatureValue_SESSION_PINNED(TENGU_JAUNTY_ALPACA, true) !== false;
}
//@ chunk-hme9amad.js:7110-7141 placement
var TENGU_QUIZZICAL_WIRTH = "tengu_quizzical_wirth";
//@ chunk-hme9amad.js:7141-7176 placement
/**
 * 读开关 tengu_quizzical_wirth（默认开）。
 */
function isQuizzicalWirthOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_QUIZZICAL_WIRTH, true) !== false;
}
//@ chunk-hme9amad.js:7176-7199 placement
var MAX_INSTALL_WAIT_CHAIN; // deferred: uses SKILLS_LIST_TIMEOUT_MS (./orgSkillsApi.js) of its import cycle while loading; runs once the cycle is complete
var INSTALL_WAIT_CEILING_MS;
deferInit("chunk-hme9amad.js:7176", () => {
  MAX_INSTALL_WAIT_CHAIN = 15;
  INSTALL_WAIT_CEILING_MS = ORG_SKILL_ZIP_TIMEOUT_MS + 60000;
});
//@ chunk-hme9amad.js:7199-7282 placement
function firstListWaitTimeoutMs() {
  let CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS = env.CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS;
  return CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS && CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS > 0
    ? CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS
    : 5000;
}
//@ chunk-hme9amad.js:7282-7370 placement
/**
 * 计算安装等待的超时。
 */
function installWaitTimeoutMs() {
  let timeoutMs = env.CLAUDE_CODE_SYNC_SKILLS_INSTALL_TIMEOUT_MS;
  return timeoutMs && timeoutMs > 0 ? timeoutMs : 30000;
}
//@ chunk-hme9amad.js:7370-7521 placement
/**
 * 返回首次技能列表的 deferred（Promise 与 resolve），没有时创建。
 */
function firstListDeferred() {
  let state = remoteToolsState();
  if (!state.firstListDeferred) {
    let resolve;
    let promise = new Promise((resolve_2) => {
      resolve = resolve_2;
    });
    state.firstListDeferred = {
      promise,
      resolve,
    };
  }
  return state.firstListDeferred;
}
//@ chunk-hme9amad.js:7521-7596 placement
/**
 * 启动技能同步并重新同步。
 */
function startSkillSyncAndResync(session, storageV5, credentials) {
  remoteToolsState().firstSyncPromise ??= runStartupSync(session, storageV5, credentials);
  armResync((runRound) => runSyncRoundOnce(session, storageV5, credentials, runRound));
}
//@ chunk-hme9amad.js:7596-7780 placement
/**
 * CCR 中按 CLAUDE_CODE_CCR_EARLY_SKILLS_SYNC 在非交互会话启动时提前开始技能同步，返回是否启动。
 */
function startEarlySkillsSync(session, storageV5, credentials, isAlreadySynced) {
  if (
    !env.CLAUDE_CODE_CCR_EARLY_SKILLS_SYNC ||
    session.host.launchOptions.isInteractive() ||
    !isSessionRefsSkillsSyncOn(session) ||
    isAlreadySynced()
  )
    return false;
  refreshSkillsSyncVeto();
  if (!isSkillsSyncLive(session) || !isSkillsCustomizationAllowed() || readSkillsSyncSettingAlt())
    return false;
  startSkillSyncAndResync(session, storageV5, credentials);
  return true;
}
//@ chunk-hme9amad.js:7780-7862 placement
/**
 * 等待首次技能列表返回。
 */
function awaitFirstSkillList(session, storageV5, credentials) {
  let deferred = firstListDeferred();
  remoteToolsState().firstSyncPromise ??= runStartupSync(session, storageV5, credentials);
  return deferred.promise;
}
//@ chunk-hme9amad.js:7862-8070 placement
/**
 * 回合开始前等待首次技能列表，超过剩余等待时间则记 timed_out 遥测。
 */
async function awaitFirstSkillsList(skillsSync, skillsSyncStartedAt) {
  let remainingMs = firstListWaitTimeoutMs() - (performance.now() - skillsSyncStartedAt);
  let winner = await Promise.race([
    skillsSync.then(() => "listed"),
    sleep(Math.max(0, remainingMs)).then(() => "timed_out"),
  ]);
  if (winner === "timed_out") logEvent("tengu_skills_sync_wait_timeout", {});
  return winner;
}
//@ chunk-hme9amad.js:8070-8198 placement
/**
 * 丢弃进行中的请求，等当前同步结束后以 reload 触发重新同步。
 */
async function reloadSyncedSkills(session, credentials, storageV5) {
  sessionSkillManifestSlot.of(session).discardInflight();
  await remoteToolsState().syncPromise?.catch(() => {});
  return runSyncRoundOnce(session, credentials, storageV5, {
    trigger: "reload",
  });
}
//@ chunk-hme9amad.js:8198-8303 placement
function runStartupSync(session, storageV5, credentials) {
  let state = remoteToolsState();
  return runSyncRoundOnce(session, storageV5, credentials, {
    trigger: "startup",
  }).finally(() => {
    state.firstRoundSettled = true;
  });
}
//@ chunk-hme9amad.js:8303-8375 placement
function markFirstRoundEmitted() {
  let state = remoteToolsState();
  if (!state.firstRoundSettled) state.firstRoundEmitted = true;
}
//@ chunk-hme9amad.js:8375-8410 placement
/**
 * 清空技能缓存并广播变更（技能 bucket 代号变化时调用）。
 */
function resetSkillSyncState() {
  markFirstRoundEmitted();
  clearSkillCaches();
  skillsChangedSignal.emit();
}
//@ chunk-hme9amad.js:8410-8521 placement
/**
 * 记录技能 bucket 代号；代号变化时清空同步缓存。
 */
function noteBucketGeneration(generation, storedGeneration) {
  if (generation === null) return;
  if (storedGeneration !== null && generation.token !== storedGeneration.token) {
    resetSkillSyncState();
    return;
  }
  remoteToolsState().bucketGeneration = generation.token;
}
//@ chunk-hme9amad.js:8521-8553 placement
/**
 * 技能同步根目录的绝对路径。
 */
function skillsSyncDir() {
  return join(getClaudeConfigDir(), SKILLS_SYNC_DIR_2);
}
//@ chunk-hme9amad.js:8553-8585 placement
/**
 * 同步根目录下的相对路径。
 */
function skillsSyncPath(relativePath) {
  return join(skillsSyncDir(), relativePath);
}
//@ chunk-hme9amad.js:8585-8667 placement
/**
 * 把同步目录路径映射成用户配置存储空间里的键。
 */
function storageKeyForSyncedPath(path) {
  return STORAGE_SPACES.userConfigDir(
    "skills",
    relative(join(getClaudeConfigDir(), "skills"), path).split(sep),
  );
}
//@ chunk-hme9amad.js:8667-9212 placement
/**
 * 扫描技能同步根目录：区分 bucket、杂项与不可读条目。
 */
async function scanSkillsSyncRoot(storageV5) {
  let syncRootDir = skillsSyncDir();
  if (
    (await verifySyncRoot(
      syncRootDir,
      getClaudeConfigDir(),
      {
        event: "skills_sync_root_refused",
        phase: "prune",
        rootLabel: SKILLS_SYNC_DIR_2,
      },
      {
        storageV5,
      },
    ).catch(() => null)) !== "real"
  )
    return null;
  let entries;
  try {
    entries = await readdir(syncRootDir, {
      withFileTypes: true,
    });
  } catch {
    return null;
  }
  let buckets = [];
  let strays = [];
  let unreadable = [];
  for (let entry of entries) {
    let marker =
      entry.isDirectory() && isSyncBucketName(entry.name)
        ? await readSyncMarker(syncRootDir, entry.name)
        : "unmarked";
    if (marker === "marked") buckets.push(entry.name);
    else if (typeof marker === "object") {
      unreadable.push(entry.name);
      logForDiagnosticsNoPII("warn", "skills_sync_bucket_marker_unreadable", {
        code: marker.unreadable,
      });
    } else if (!isHiddenFoldName(entry.name)) strays.push(entry.name);
  }
  return {
    buckets,
    strays,
    unreadable,
  };
}
//@ chunk-hme9amad.js:9212-9357 placement
async function trashStrayEntries(names, storageV5) {
  let trashedCount = 0;
  for (let name of names) if (await moveToSyncTrash(join(skillsSyncDir(), name), storageV5)) trashedCount++;
  if (trashedCount > 0)
    logForDiagnosticsNoPII("info", "skills_sync_stray_entry_trashed", {
      count: trashedCount,
    });
  return trashedCount;
}
//@ chunk-hme9amad.js:9357-9468 placement
/**
 * 把技能同步根目录下的杂项条目移到回收目录，返回是否移动了。
 */
async function trashStraySyncEntries(storageV5) {
  let scan = await scanSkillsSyncRoot(storageV5);
  if (scan === null || scan.strays.length === 0) return false;
  return (await trashStrayEntries(scan.strays, storageV5)) > 0;
}
//@ chunk-hme9amad.js:9468-9593 placement
/**
 * 把技能同步目录移到回收目录（带根目录检查）。
 */
function moveToSyncTrash(dir, storageV5) {
  return checkSyncRoots({
    dir,
    trashRoot: trashRootDir(),
    configHome: getClaudeConfigDir(),
    failureEvent: "skills_sync_trash_move_failed",
    storageV5,
  });
}
//@ chunk-hme9amad.js:9593-10191 placement
/**
 * 技能同步关闭时清理同步根目录：逐个 bucket 对账清单并删除，移走杂项，清空命令与技能缓存。
 */
async function pruneSkillsSyncRoot(storageV5) {
  if (!isAccountSkillsSyncDenied()) return false;
  let rootState = await verifySyncRoot(
    skillsSyncDir(),
    getClaudeConfigDir(),
    {
      event: "skills_sync_root_refused",
      phase: "prune",
      rootLabel: SKILLS_SYNC_DIR_2,
    },
    {
      storageV5,
    },
  );
  if (rootState !== "real" && rootState !== "absent") return false;
  let movedCount = null;
  let scan = rootState === "real" ? await scanSkillsSyncRoot(storageV5) : null;
  if (scan !== null) {
    movedCount = 0;
    for (let bucket of scan.buckets) {
      let bucketDir = skillsSyncPath(bucket);
      await rm(lastCompleteRoundPath(bucketDir), {
        force: true,
      }).catch(() => {});
      let reconciled = await reconcileSkillsManifest(bucketDir, storageV5).catch(() => null);
      if (reconciled !== null) {
        movedCount += reconciled;
        await rmdir(bucketDir).then(
          () => removeSyncedSkillDir(skillsSyncDir(), bucket),
          () => {},
        );
      }
    }
    movedCount += await trashStrayEntries([...scan.strays, ...scan.unreadable], storageV5);
    await rmdir(skillsSyncDir()).catch(() => {});
  }
  logForDiagnosticsNoPII("info", "skills_sync_pruned_for_closed_gate", {
    moved: movedCount ?? 0,
  });
  let anyMoved = movedCount !== null && movedCount > 0;
  if (anyMoved) {
    clearCommandMemoizationCaches();
    clearSkillCaches();
    skillsChangedSignal.emit();
  }
  return anyMoved;
}
//@ chunk-hme9amad.js:10191-10224 placement
/**
 * 技能垃圾箱目录路径。
 */
function trashRootDir() {
  return join(getClaudeConfigDir(), SKILLS_SYNC_DIR);
}
//@ chunk-hme9amad.js:10224-10254 placement
/**
 * 某目录下同步清单（SYNCED_MANIFEST_FILE）的路径。
 */
function manifestPathIn(root) {
  return join(root, SYNCED_MANIFEST_FILE);
}
//@ chunk-hme9amad.js:10254-10593 placement
/**
 * 技能同步清单 schema（lastUpdated、skills、staleDirs、pendingClaims）与清单中单个技能的 schema。
 */
var SKILLS_MANIFEST_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SKILLS_MANIFEST_SCHEMA_PLACEHOLDER;
var syncedSkillsManifestSchema;
var syncedSkillEntrySchema;
deferInit("chunk-hme9amad.js:10254", () => {
  SKILLS_MANIFEST_SCHEMA = new Set();
  SKILLS_MANIFEST_SCHEMA_PLACEHOLDER = [];
  syncedSkillsManifestSchema = DoctorLazy(() =>
    looseObject({
      lastUpdated: numberSchema().catch(0),
      skills: array(unknown()),
      staleDirs: unknown().optional(),
      pendingClaims: unknown().optional(),
    }),
  );
  syncedSkillEntrySchema = DoctorLazy(() =>
    looseObject({
      name: stringSchema(),
      skillId: stringSchema().catch(""),
      description: stringSchema().catch(""),
      source: stringSchema().catch(""),
      updatedAt: stringSchema().nullable().catch(null),
      userInvocable: undefinedSchema().catch(undefined),
      disableModelInvocation: undefinedSchema().catch(undefined),
    }),
  );
});
//@ chunk-hme9amad.js:10593-10625 placement
/**
 * 某目录下同步清单在存储空间里的键。
 */
function manifestStorageKey(root) {
  return storageKeyForSyncedPath(manifestPathIn(root));
}
//@ chunk-hme9amad.js:10625-11482 placement
async function readSkillsSyncManifest(storageV5, ctx) {
  let shouldLog = !ctx.manifestRead;
  ctx.manifestRead = true;
  let manifestText;
  if (storageV5)
    try {
      let readResult = await storageV5.read([
        {
          key: manifestStorageKey(ctx.root),
          offset: 0,
          length: MAX_SYNCED_SKILL_BYTES + 1,
        },
      ]);
      if (!readResult.ok) {
        if (shouldLog)
          logForDiagnosticsNoPII("warn", "skills_sync_manifest_unreadable", {
            code: "backend_read_failed",
          });
        return null;
      }
      let item = readResult.value.items[0];
      if (!item.found) return null;
      if (item.totalBytes > MAX_SYNCED_SKILL_BYTES || item.value.byteLength > MAX_SYNCED_SKILL_BYTES) {
        if (shouldLog)
          logForDiagnosticsNoPII("warn", "skills_sync_manifest_unreadable", {
            code: "parse_or_size",
          });
        return null;
      }
      manifestText = Buffer.from(item.value).toString("utf8");
    } catch (error) {
      if (shouldLog)
        logForDiagnosticsNoPII("warn", "skills_sync_manifest_unreadable", {
          code: getErrnoCode(error) ?? "backend_read_failed",
        });
      return null;
    }
  else {
    manifestText = await readManifestText(
      manifestPathIn(ctx.root),
      shouldLog ? "skills_sync_manifest_unreadable" : null,
    );
    if (manifestText === null) return null;
  }
  let manifestJson = parseManifestJson(
    manifestText,
    syncedSkillsManifestSchema_2(),
    shouldLog ? "skills_sync_manifest_unreadable" : null,
  );
  if (manifestJson === null) return null;
  let { skills, staleDirs, pendingClaims, ...rest } = manifestJson;
  return {
    ...rest,
    skills: parseValidRows(syncedSkillEntrySchema_2(), skills),
    staleDirs: stringArray(staleDirs),
    pendingClaims: stringArray(pendingClaims),
  };
}
//@ chunk-hme9amad.js:11482-12201 placement
async function writeSkillsSyncManifest(next, mergeOptions, storageV5, ctx) {
  let refusedReason = ctx.guard.refusedReason();
  if (refusedReason !== null) throw rootRefusedError(refusedReason);
  await checkSyncOwnedRootFor(storageV5, ctx.root);
  let skillsSyncManifest = await readSkillsSyncManifest(storageV5, ctx);
  if (skillsSyncManifest === null && mergeOptions.onlyOverReadable) return;
  let skills = mergeManifestRows(
    parseValidRows(syncedSkillEntrySchema_2(), next.skills),
    skillsSyncManifest?.skills,
    (row) => row.skillId,
    mergeOptions.removedSkillIds,
    parseValidRows(syncedSkillEntrySchema_2(), mergeOptions.deferredRows),
  );
  let manifestJson = jsonStringify(
    {
      ...omitKeys_2(skillsSyncManifest, ["lastUpdated", "skills", "staleDirs", "pendingClaims"]),
      ...next,
      skills,
      staleDirs: mergeStaleDirs(next.staleDirs, skillsSyncManifest?.staleDirs, mergeOptions.staleDirs),
      pendingClaims: mergeStaleDirs(
        next.pendingClaims,
        skillsSyncManifest?.pendingClaims,
        mergeOptions.pendingClaims,
      ),
    },
    null,
    2,
  );
  if (storageV5) {
    let writeResult = await storageV5.write(manifestStorageKey(ctx.root), manifestJson, {
      mode: 438 & ~process.umask(),
      publishDiscipline: "atomic",
    });
    if (!writeResult.ok) {
      logForDiagnosticsNoPII("error", "skills_sync_manifest_write_failed", {
        code: writeResult.error.code,
      });
      throw Error("skillsSync: manifest write failed");
    }
    return;
  }
  await writeFileAtomic(manifestPathIn(ctx.root), manifestJson);
}
//@ chunk-hme9amad.js:12201-12252 placement
/**
 * 按进程 pid 区分的临时目录。
 */
function perProcessTempDir(root) {
  return join(root, TRASH_SUBDIR, String(process.pid));
}
//@ chunk-hme9amad.js:12252-12283 placement
/**
 * 同步目录下某技能的路径。
 */
function syncedSkillDirPath(root, name) {
  return syncedItemPath(name, root);
}
//@ chunk-hme9amad.js:12283-12646 placement
/**
 * 读取同步技能的 SKILL.md 文本（经存储后端或文件系统，超出大小或不是文件时为 null）。
 */
async function readSyncedSkillMd(root, name, storageV5) {
  try {
    let skillDir = syncedSkillDirPath(root, name);
    if (storageV5) {
      let readResult = await storageV5.read([
        {
          key: skillMdStorageKey(skillDir),
          offset: 0,
          length: MAX_SCOPE_RESPONSE_BYTES + 1,
        },
      ]);
      let item = readResult.ok ? readResult.value.items[0] : undefined;
      if (
        !item?.found ||
        item.totalBytes > MAX_SCOPE_RESPONSE_BYTES ||
        item.value.byteLength > MAX_SCOPE_RESPONSE_BYTES
      )
        return null;
      return Buffer.from(item.value).toString("utf8");
    }
    let skillMdPath = join(skillDir, "SKILL.md");
    let stats = await stat(skillMdPath);
    if (!stats.isFile() || stats.size > MAX_SCOPE_RESPONSE_BYTES) return null;
    return await readFile(skillMdPath, "utf8");
  } catch {
    return null;
  }
}
//@ chunk-hme9amad.js:12646-12688 placement
/**
 * 某技能 SKILL.md 在存储空间里的键。
 */
function skillMdStorageKey(skillDir) {
  return storageKeyForSyncedPath(join(skillDir, "SKILL.md"));
}
//@ chunk-hme9amad.js:12688-12829 placement
/**
 * 判断同步技能目录中是否有 SKILL.md。
 */
async function hasSyncedSkillMd(root, name, storageV5) {
  try {
    let skillDir = syncedSkillDirPath(root, name);
    if (storageV5) return (await storageV5.statMeta(skillMdStorageKey(skillDir))).ok;
    return (await stat(join(skillDir, "SKILL.md"))).isFile();
  } catch {
    return false;
  }
}
//@ chunk-hme9amad.js:12829-13007 placement
/**
 * 判断技能目录中的 SKILL.md 是否缺失。
 */
async function isSkillMdMissing(skillDir, storageV5) {
  try {
    if (storageV5) {
      let meta = await storageV5.statMeta(skillMdStorageKey(skillDir));
      return !meta.ok && meta.error.code === "NotFound";
    }
    await stat(join(skillDir, "SKILL.md"));
    return false;
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR";
  }
}
//@ chunk-hme9amad.js:13007-13172 placement
/**
 * 把会话引用的技能转为同步条目（来源 session-refs，可带请求的版本）。
 */
function sessionRefSkillEntry(ref) {
  return {
    skillId: ref.id,
    name: ref.directory || ref.name || ref.id,
    description: ref.description,
    source: "session-refs",
    updatedAt: null,
    requestedVersion: ref.version || undefined,
  };
}
//@ chunk-hme9amad.js:13172-13236 placement
/**
 * 复制条目并替换 backingPluginId。
 */
function carryBackingPluginId(row, incoming) {
  return {
    ...row,
    backingPluginId: incoming.backingPluginId,
  };
}
//@ chunk-hme9amad.js:13236-13349 placement
var SKILL_DIR_NAMING = {
  idOf: (row) => row.skillId,
  invalidNameTag: "skills_sync_invalid_name",
  collisionTag: "skills_sync_name_collision",
};
//@ chunk-hme9amad.js:13349-13453 placement
/**
 * 为同步技能分配目录名（处理非法名与冲突，可标记冲突落败者）。
 */
function assignSkillDirs(root, listed, previous) {
  return planSyncDownloads(listed, previous, {
    ...SKILL_DIR_NAMING,
    dirFor: (entry) => syncedSkillDirPath(root, entry),
    carry: carryBackingPluginId,
    ...(isJauntyAlpacaOn() && {
      markCollisionLoser: markCollisionLoserRow,
    }),
  });
}
//@ chunk-hme9amad.js:13453-13495 placement
/**
 * 把冲突落败条目的 updatedAt 标成哨兵值。
 */
function markCollisionLoserRow(row) {
  return {
    ...row,
    updatedAt: COLLISION_LOSER,
  };
}
export {
  startSkillSyncAndResync,
  awaitFirstSkillList,
  installWaitTimeoutMs,
  reloadSyncedSkills,
  startEarlySkillsSync,
  pruneSkillsSyncRoot,
  resetSkillSyncState,
  syncedSkillDirPath,
  perProcessTempDir,
  moveToSyncTrash,
  syncedSkillsManifestSchema,
  syncedSkillEntrySchema,
  skillsSyncDir,
  trashRootDir,
  skillsSyncPath,
  shouldWeatherIdle,
  reuseSkillsSyncRound,
  noteHidingFoldersGone,
  readSkillsSyncManifest,
  sessionRefSkillEntry,
  carryBackingPluginId,
  FIRST_FAILED_ROUND_THRESHOLD_MS,
  trashStraySyncEntries,
  resolveSkillsBucket,
  onlyConvertedSkills,
  assignSkillDirs,
  markFirstRoundEmitted,
  hasSyncedSkillMd,
  writeSkillsSyncManifest,
  SKILLS_MANIFEST_SCHEMA,
  SKILLS_MANIFEST_SCHEMA_PLACEHOLDER,
  manifestPathIn,
  noteBucketGeneration,
  listedForKey,
  firstListDeferred,
  MAX_INSTALL_WAIT_CHAIN,
  readSyncedSkillMd,
  isQuizzicalWirthOn,
  rescheduleResyncByBackoff,
  isSkillMdMissing,
  INSTALL_WAIT_CEILING_MS,
  awaitFirstSkillsList,
};

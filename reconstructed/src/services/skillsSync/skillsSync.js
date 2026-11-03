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
import { looseObject, E, array, unknown, string, QD } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { MAX_SCOPE_RESPONSE_BYTES } from "../plugins/accountSync/pluginsScopeGate.js";

//@ chunk-hme9amad.js:2036-2772 placement
async function resolveSkillsBucket(e, skills, syncBucket) {
  let t = new Set(skills.map((y) => y.skillId));
  let filtered = e.filter(
    (y) =>
      y.backingPluginId !== undefined &&
      y.updatedAt !== COLLISION_LOSER &&
      !t.has(y.skillId) &&
      isPluginDirMissingFromSyncedList(syncBucket, y.backingPluginId),
  );
  if (filtered.length === 0) return [];
  let w = filtered;
  let h = "another_session";
  try {
    if (
      (await firstLiveSessionMatching(
        (b) =>
          b.pid !== process.pid &&
          b.kind !== "daemon" &&
          b.asksForConvertedSkills !== true &&
          b.asksForConvertedSkills !== null,
      )) === undefined
    ) {
      let installedSyncedPlugins = await findInstalledSyncedPlugins(
        syncBucket,
        new Set(filtered.flatMap((R) => R.backingPluginId ?? [])),
      );
      if (installedSyncedPlugins === null) h = "plugins_bucket_unread";
      else {
        h = "no_plugin_folder";
        w = filtered.filter(
          (R) => R.backingPluginId !== undefined && !installedSyncedPlugins.has(R.backingPluginId),
        );
      }
    }
  } catch (error) {
    h = "registry_unreadable";
    if (!(error instanceof SessionRecordsUnreadableError)) {
      h = "read_failed";
      logError(toError(error));
    }
  }
  if (w.length > 0)
    logForDiagnosticsNoPII("info", "skills_sync_converted_copies_kept", {
      count: w.length,
      reason: h,
    });
  return w;
}
//@ chunk-hme9amad.js:2772-3399 placement
/**
 * 检查被同步技能遮蔽的插件目录是否已消失，若消失的目录对应列表中的技能则记录并返回 true（需要重新同步）。
 */
async function noteHidingFoldersGone(e) {
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
  let filtered_2 = filtered.filter((M, S) => !results[S]);
  let w = remoteToolsState();
  let filtered_3 = filtered_2.filter(({ folder }) => w.hidingFoldersGone.has(folder));
  let filtered_4 = filtered_2.filter(({ folder }) => !w.hidingFoldersGone.has(folder));
  let b = filtered_4.length > 0 ? await e() : [];
  let R = new Set(b.flatMap((M) => (M.updatedAt === COLLISION_LOSER ? [] : (M.backingPluginId ?? []))));
  let filtered_5 = filtered_4.filter(({ pluginId }) => pluginId !== undefined && R.has(pluginId));
  w.hidingFoldersGone = new Set([...filtered_3, ...filtered_5].map(({ folder }) => folder));
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
  let e = syncIntervalMs();
  return idleSyncIntervalMs() > e && isIdleLongerThan(e) && !hasActiveWork();
}
//@ chunk-hme9amad.js:3774-3916 placement
function idleSyncIntervalMs() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    IDLE_SYNC_INTERVALS_FLAG,
    DEFAULT_IDLE_INTERVAL_FACTOR,
  );
  let n =
    typeof featureValue_CACHED_MAY_BE_STALE === "number" && !Number.isNaN(featureValue_CACHED_MAY_BE_STALE)
      ? Math.min(Math.max(featureValue_CACHED_MAY_BE_STALE, 1), MAX_IDLE_INTERVAL_FACTOR)
      : DEFAULT_IDLE_INTERVAL_FACTOR;
  let s = syncIntervalMs();
  return Math.max(s, Math.min(s * n, MAX_IDLE_SYNC_INTERVAL_MS));
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
  let n = syncIntervalMs();
  return Math.min(n * 2 ** Math.max(0, consecutiveFailedRounds - 1), n * MAX_SYNC_BACKOFF_FACTOR);
}
//@ chunk-hme9amad.js:4038-4157 placement
function armResync(e) {
  let n = remoteToolsState();
  if (n.resyncTimer) return;
  n.resyncRunRound = e;
  scheduleResync(n, e, backoffIntervalMs(n.consecutiveFailedRounds), "resync", false);
}
//@ chunk-hme9amad.js:4157-4292 placement
function rescheduleResync(e) {
  let n = remoteToolsState();
  if (!n.resyncTimer || !n.resyncRunRound) return;
  clearTimeout(n.resyncTimer);
  scheduleResync(n, n.resyncRunRound, e, "resync", false);
}
//@ chunk-hme9amad.js:4292-4559 placement
function awaitActivityForResync() {
  let e = remoteToolsState();
  if (e.stopAwaitingActivity) return;
  let mapped = [onInteraction, onWorkStarted].map((s) =>
    s(() => {
      e.stopAwaitingActivity?.();
      if (e.syncPromise) e.syncPromise.catch(() => {}).then(() => resyncOnActivity(e));
      else resyncOnActivity(e);
    }),
  );
  e.stopAwaitingActivity = () => {
    e.stopAwaitingActivity = null;
    for (let s of mapped) s();
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
function resyncOnActivity(e) {
  try {
    let resyncArmed = e.resyncArmed;
    if (!e.resyncTimer || !e.resyncRunRound || !resyncArmed || resyncArmed.trigger === "wake_settle") return;
    let rounded = Math.round(Date.now() - resyncArmed.wallMs - (performance.now() - resyncArmed.monotonicMs));
    if (rounded > FIRST_FAILED_ROUND_THRESHOLD_MS && e.consecutiveFailedRounds === 0) {
      clearTimeout(e.resyncTimer);
      skipResyncAfterSleep(e, e.resyncRunRound, resyncArmed.trigger, rounded, true);
      return;
    }
    let t = e.consecutiveFailedRounds > 0 ? backoffIntervalMs(e.consecutiveFailedRounds) : 0;
    if (resyncArmed.wallMs + resyncArmed.delayMs - Date.now() > t) {
      clearTimeout(e.resyncTimer);
      scheduleResync(e, e.resyncRunRound, t, "resync", true);
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
function scheduleResync(e, n, s, t, d) {
  let w = Date.now() + s;
  e.resyncArmed = {
    trigger: t,
    delayMs: s,
    wallMs: Date.now(),
    monotonicMs: performance.now(),
  };
  e.resyncTimer = setTimeout(runResyncTick, s, e, n, w, t, d);
  e.resyncTimer.unref?.();
}
//@ chunk-hme9amad.js:5379-5628 placement
function runResyncTick(e, n, s, t, d) {
  let resyncTimer = e.resyncTimer;
  let max = Math.max(0, Date.now() - s);
  if (max > FIRST_FAILED_ROUND_THRESHOLD_MS) {
    skipResyncAfterSleep(e, n, t, max, false);
    return;
  }
  n({
    trigger: t,
    tickLateMs: max,
    ...(d && {
      woken: d,
    }),
  })
    .catch(() => {})
    .then(() => {
      if (e.resyncTimer !== resyncTimer) return;
      scheduleResync(e, n, backoffIntervalMs(e.consecutiveFailedRounds), "resync", false);
    });
}
//@ chunk-hme9amad.js:5628-5865 placement
function skipResyncAfterSleep(e, n, s, t, d) {
  logForDiagnosticsNoPII("info", "skills_sync_resync_skipped_after_sleep", {
    late_ms: t,
    woken: d,
  });
  scheduleResync(e, n, WAKE_SETTLE_MS, "wake_settle", d);
  try {
    if (!isDiskless())
      logEvent("tengu_skills_sync_resync_skipped", {
        trigger: fromEnum(s),
        tick_late_ms: t,
        settle_ms: WAKE_SETTLE_MS,
        woken: d,
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
function listedForKey(e) {
  let n = getEntrypointKind() ?? "none";
  return e ? `${n}${CONVERTED_SKILLS_SUFFIX}` : n;
}
//@ chunk-hme9amad.js:5935-5962 placement
var CONVERTED_SKILLS_SUFFIX = ".converted-skills";
//@ chunk-hme9amad.js:5962-6040 placement
function onlyConvertedSkills(e) {
  return {
    ...e,
    listedFor: e.listedFor.filter((n) => n.endsWith(CONVERTED_SKILLS_SUFFIX)),
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
  let R = !pinned && bucket === getStoredAccountBucket();
  let D = pinned ? undefined : firstResyncDelay(trigger, R, idle);
  if (D === undefined)
    return {
      list: true,
      shared: R,
    };
  if (R && idle) awaitActivityForResync();
  let M = await checkReuseWindow(root, D);
  if (!M.reuse || !(await hasSyncMarker(syncedRoot, bucket))) {
    stopAwaitingActivity();
    return {
      list: true,
      shared: R,
    };
  }
  let reuseStamp = await readReuseStamp(root);
  let reload = false;
  if (R) {
    if (
      reuseStamp === null ||
      holdsPlaceholders ||
      !reuseStamp.listedFor.includes(listedForKey(convertedSkillsAsPlugins))
    ) {
      stopAwaitingActivity();
      return {
        list: true,
        shared: R,
      };
    }
    let I = idle && isAwaitingActivityStop();
    if (idle && !I && M.ageMs >= syncIntervalMs())
      return {
        list: true,
        shared: R,
      };
    reload = reuseStamp.token !== lastGeneration && trigger !== "startup";
    let B = I ? idleSyncIntervalMs() : syncIntervalMs();
    if (M.ageMs < B) rescheduleResync(B - M.ageMs + syncJitterMs());
  } else {
    let listedFor = reuseStamp?.listedFor ?? [];
    if (
      !(convertedSkillsAsPlugins
        ? listedFor.includes(listedForKey(true))
        : listedFor.includes(listedForKey(false)) ||
          !listedFor.some((C) => C.endsWith(CONVERTED_SKILLS_SUFFIX)))
    )
      return {
        list: true,
        shared: R,
      };
  }
  logForDiagnosticsNoPII("info", "skills_sync_round_reused", {
    age_ms: M.ageMs,
    within_ms: M.withinMs,
  });
  return {
    list: false,
    generation: reuseStamp?.token ?? null,
    reload,
  };
}
//@ chunk-hme9amad.js:6858-7045 placement
function firstResyncDelay(trigger, n, idle) {
  let t = trigger === "startup" ? syncReuseWithinMs() : undefined;
  if (!n || trigger === "reload") return t;
  if (idle) return idleSyncIntervalMs();
  let d =
    trigger === "startup" && (!isPlainNonInteractive() || (isHeadlessHostEntrypoint() && envSessionKind()))
      ? Math.min(MAX_STARTUP_SYNC_WAIT_MS, syncIntervalMs())
      : syncIntervalMs();
  return Math.max(d, t ?? 0);
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
var MAX_INSTALL_WAIT_CHAIN = 15;
var INSTALL_WAIT_CEILING_MS = ORG_SKILL_ZIP_TIMEOUT_MS + 60000;
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
  let e = env.CLAUDE_CODE_SYNC_SKILLS_INSTALL_TIMEOUT_MS;
  return e && e > 0 ? e : 30000;
}
//@ chunk-hme9amad.js:7370-7521 placement
/**
 * 返回首次技能列表的 deferred（Promise 与 resolve），没有时创建。
 */
function firstListDeferred() {
  let e = remoteToolsState();
  if (!e.firstListDeferred) {
    let resolve;
    let promise = new Promise((resolve_2) => {
      resolve = resolve_2;
    });
    e.firstListDeferred = {
      promise,
      resolve,
    };
  }
  return e.firstListDeferred;
}
//@ chunk-hme9amad.js:7521-7596 placement
/**
 * 启动技能同步并重新同步。
 */
function startSkillSyncAndResync(e, n, s) {
  remoteToolsState().firstSyncPromise ??= runStartupSync(e, n, s);
  armResync((t) => runSyncRoundOnce(e, n, s, t));
}
//@ chunk-hme9amad.js:7596-7780 placement
/**
 * CCR 中按 CLAUDE_CODE_CCR_EARLY_SKILLS_SYNC 在非交互会话启动时提前开始技能同步，返回是否启动。
 */
function startEarlySkillsSync(rootSession, n, s, t) {
  if (
    !env.CLAUDE_CODE_CCR_EARLY_SKILLS_SYNC ||
    rootSession.host.launchOptions.isInteractive() ||
    !isSessionRefsSkillsSyncOn(rootSession) ||
    t()
  )
    return false;
  refreshSkillsSyncVeto();
  if (!isSkillsSyncLive(rootSession) || !isSkillsCustomizationAllowed() || readSkillsSyncSettingAlt())
    return false;
  startSkillSyncAndResync(rootSession, n, s);
  return true;
}
//@ chunk-hme9amad.js:7780-7862 placement
/**
 * 等待首次技能列表返回。
 */
function awaitFirstSkillList(e, storageV5, credentials) {
  let t = firstListDeferred();
  remoteToolsState().firstSyncPromise ??= runStartupSync(e, storageV5, credentials);
  return t.promise;
}
//@ chunk-hme9amad.js:7862-8070 placement
/**
 * 回合开始前等待首次技能列表，超过剩余等待时间则记 timed_out 遥测。
 */
async function awaitFirstSkillsList(skillsSync, skillsSyncStartedAt) {
  let s = firstListWaitTimeoutMs() - (performance.now() - skillsSyncStartedAt);
  let winner = await Promise.race([
    skillsSync.then(() => "listed"),
    sleep(Math.max(0, s)).then(() => "timed_out"),
  ]);
  if (winner === "timed_out") logEvent("tengu_skills_sync_wait_timeout", {});
  return winner;
}
//@ chunk-hme9amad.js:8070-8198 placement
/**
 * 丢弃进行中的请求，等当前同步结束后以 reload 触发重新同步。
 */
async function reloadSyncedSkills(e, storageV5, credentials) {
  sessionSkillManifestSlot.of(e).discardInflight();
  await remoteToolsState().syncPromise?.catch(() => {});
  return runSyncRoundOnce(e, storageV5, credentials, {
    trigger: "reload",
  });
}
//@ chunk-hme9amad.js:8198-8303 placement
function runStartupSync(e, n, s) {
  let t = remoteToolsState();
  return runSyncRoundOnce(e, n, s, {
    trigger: "startup",
  }).finally(() => {
    t.firstRoundSettled = true;
  });
}
//@ chunk-hme9amad.js:8303-8375 placement
function markFirstRoundEmitted() {
  let e = remoteToolsState();
  if (!e.firstRoundSettled) e.firstRoundEmitted = true;
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
function noteBucketGeneration(e, n) {
  if (e === null) return;
  if (n !== null && e.token !== n.token) {
    resetSkillSyncState();
    return;
  }
  remoteToolsState().bucketGeneration = e.token;
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
function skillsSyncPath(e) {
  return join(skillsSyncDir(), e);
}
//@ chunk-hme9amad.js:8585-8667 placement
/**
 * 把同步目录路径映射成用户配置存储空间里的键。
 */
function storageKeyForSyncedPath(e) {
  return STORAGE_SPACES.userConfigDir("skills", relative(join(getClaudeConfigDir(), "skills"), e).split(sep));
}
//@ chunk-hme9amad.js:8667-9212 placement
/**
 * 扫描技能同步根目录：区分 bucket、杂项与不可读条目。
 */
async function scanSkillsSyncRoot(storageV5) {
  let n = skillsSyncDir();
  if (
    (await verifySyncRoot(
      n,
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
  let t;
  try {
    t = await readdir(n, {
      withFileTypes: true,
    });
  } catch {
    return null;
  }
  let d = [];
  let w = [];
  let h = [];
  for (let y of t) {
    let b = y.isDirectory() && isSyncBucketName(y.name) ? await readSyncMarker(n, y.name) : "unmarked";
    if (b === "marked") d.push(y.name);
    else if (typeof b === "object") {
      h.push(y.name);
      logForDiagnosticsNoPII("warn", "skills_sync_bucket_marker_unreadable", {
        code: b.unreadable,
      });
    } else if (!isHiddenFoldName(y.name)) w.push(y.name);
  }
  return {
    buckets: d,
    strays: w,
    unreadable: h,
  };
}
//@ chunk-hme9amad.js:9212-9357 placement
async function trashStrayEntries(e, n) {
  let s = 0;
  for (let t of e) if (await moveToSyncTrash(join(skillsSyncDir(), t), n)) s++;
  if (s > 0)
    logForDiagnosticsNoPII("info", "skills_sync_stray_entry_trashed", {
      count: s,
    });
  return s;
}
//@ chunk-hme9amad.js:9357-9468 placement
/**
 * 把技能同步根目录下的杂项条目移到回收目录，返回是否移动了。
 */
async function trashStraySyncEntries(storageV5) {
  let n = await scanSkillsSyncRoot(storageV5);
  if (n === null || n.strays.length === 0) return false;
  return (await trashStrayEntries(n.strays, storageV5)) > 0;
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
  let n = await verifySyncRoot(
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
  if (n !== "real" && n !== "absent") return false;
  let s = null;
  let t = n === "real" ? await scanSkillsSyncRoot(storageV5) : null;
  if (t !== null) {
    s = 0;
    for (let bucket of t.buckets) {
      let h = skillsSyncPath(bucket);
      await rm(lastCompleteRoundPath(h), {
        force: true,
      }).catch(() => {});
      let y = await reconcileSkillsManifest(h, storageV5).catch(() => null);
      if (y !== null) {
        s += y;
        await rmdir(h).then(
          () => removeSyncedSkillDir(skillsSyncDir(), bucket),
          () => {},
        );
      }
    }
    s += await trashStrayEntries([...t.strays, ...t.unreadable], storageV5);
    await rmdir(skillsSyncDir()).catch(() => {});
  }
  logForDiagnosticsNoPII("info", "skills_sync_pruned_for_closed_gate", {
    moved: s ?? 0,
  });
  let d = s !== null && s > 0;
  if (d) {
    clearCommandMemoizationCaches();
    clearSkillCaches();
    skillsChangedSignal.emit();
  }
  return d;
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
var SKILLS_MANIFEST_SCHEMA = new Set();
var SKILLS_MANIFEST_SCHEMA_PLACEHOLDER = [];
var syncedSkillsManifestSchema = DoctorLazy(() =>
  looseObject({
    lastUpdated: E().catch(0),
    skills: array(unknown()),
    staleDirs: unknown().optional(),
    pendingClaims: unknown().optional(),
  }),
);
var syncedSkillEntrySchema = DoctorLazy(() =>
  looseObject({
    name: string(),
    skillId: string().catch(""),
    description: string().catch(""),
    source: string().catch(""),
    updatedAt: string().nullable().catch(null),
    userInvocable: QD().catch(undefined),
    disableModelInvocation: QD().catch(undefined),
  }),
);
//@ chunk-hme9amad.js:10593-10625 placement
/**
 * 某目录下同步清单在存储空间里的键。
 */
function manifestStorageKey(root) {
  return storageKeyForSyncedPath(manifestPathIn(root));
}
//@ chunk-hme9amad.js:10625-11482 placement
async function readSkillsSyncManifest(e, n) {
  let s = !n.manifestRead;
  n.manifestRead = true;
  let t;
  if (e)
    try {
      let R = await e.read([
        {
          key: manifestStorageKey(n.root),
          offset: 0,
          length: MAX_SYNCED_SKILL_BYTES + 1,
        },
      ]);
      if (!R.ok) {
        if (s)
          logForDiagnosticsNoPII("warn", "skills_sync_manifest_unreadable", {
            code: "backend_read_failed",
          });
        return null;
      }
      let D = R.value.items[0];
      if (!D.found) return null;
      if (D.totalBytes > MAX_SYNCED_SKILL_BYTES || D.value.byteLength > MAX_SYNCED_SKILL_BYTES) {
        if (s)
          logForDiagnosticsNoPII("warn", "skills_sync_manifest_unreadable", {
            code: "parse_or_size",
          });
        return null;
      }
      t = Buffer.from(D.value).toString("utf8");
    } catch (error) {
      if (s)
        logForDiagnosticsNoPII("warn", "skills_sync_manifest_unreadable", {
          code: getErrnoCode(error) ?? "backend_read_failed",
        });
      return null;
    }
  else {
    t = await readManifestText(manifestPathIn(n.root), s ? "skills_sync_manifest_unreadable" : null);
    if (t === null) return null;
  }
  let manifestJson = parseManifestJson(
    t,
    syncedSkillsManifestSchema_2(),
    s ? "skills_sync_manifest_unreadable" : null,
  );
  if (manifestJson === null) return null;
  let { skills, staleDirs, pendingClaims, ...b } = manifestJson;
  return {
    ...b,
    skills: parseValidRows(syncedSkillEntrySchema_2(), skills),
    staleDirs: stringArray(staleDirs),
    pendingClaims: stringArray(pendingClaims),
  };
}
//@ chunk-hme9amad.js:11482-12201 placement
async function writeSkillsSyncManifest(e, n, storageV5, t) {
  let d = t.guard.refusedReason();
  if (d !== null) throw rootRefusedError(d);
  await checkSyncOwnedRootFor(storageV5, t.root);
  let skillsSyncManifest = await readSkillsSyncManifest(storageV5, t);
  if (skillsSyncManifest === null && n.onlyOverReadable) return;
  let skills = mergeManifestRows(
    parseValidRows(syncedSkillEntrySchema_2(), e.skills),
    skillsSyncManifest?.skills,
    (b) => b.skillId,
    n.removedSkillIds,
    parseValidRows(syncedSkillEntrySchema_2(), n.deferredRows),
  );
  let y = jsonStringify(
    {
      ...omitKeys_2(skillsSyncManifest, ["lastUpdated", "skills", "staleDirs", "pendingClaims"]),
      ...e,
      skills,
      staleDirs: mergeStaleDirs(e.staleDirs, skillsSyncManifest?.staleDirs, n.staleDirs),
      pendingClaims: mergeStaleDirs(e.pendingClaims, skillsSyncManifest?.pendingClaims, n.pendingClaims),
    },
    null,
    2,
  );
  if (storageV5) {
    let b = await storageV5.write(manifestStorageKey(t.root), y, {
      mode: 438 & ~process.umask(),
      publishDiscipline: "atomic",
    });
    if (!b.ok) {
      logForDiagnosticsNoPII("error", "skills_sync_manifest_write_failed", {
        code: b.error.code,
      });
      throw Error("skillsSync: manifest write failed");
    }
    return;
  }
  await writeFileAtomic(manifestPathIn(t.root), y);
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
async function readSyncedSkillMd(root, name, s) {
  try {
    let t = syncedSkillDirPath(root, name);
    if (s) {
      let h = await s.read([
        {
          key: skillMdStorageKey(t),
          offset: 0,
          length: MAX_SCOPE_RESPONSE_BYTES + 1,
        },
      ]);
      let y = h.ok ? h.value.items[0] : undefined;
      if (
        !y?.found ||
        y.totalBytes > MAX_SCOPE_RESPONSE_BYTES ||
        y.value.byteLength > MAX_SCOPE_RESPONSE_BYTES
      )
        return null;
      return Buffer.from(y.value).toString("utf8");
    }
    let d = join(t, "SKILL.md");
    let w = await stat(d);
    if (!w.isFile() || w.size > MAX_SCOPE_RESPONSE_BYTES) return null;
    return await readFile(d, "utf8");
  } catch {
    return null;
  }
}
//@ chunk-hme9amad.js:12646-12688 placement
/**
 * 某技能 SKILL.md 在存储空间里的键。
 */
function skillMdStorageKey(e) {
  return storageKeyForSyncedPath(join(e, "SKILL.md"));
}
//@ chunk-hme9amad.js:12688-12829 placement
/**
 * 判断同步技能目录中是否有 SKILL.md。
 */
async function hasSyncedSkillMd(root, name, s) {
  try {
    let t = syncedSkillDirPath(root, name);
    if (s) return (await s.statMeta(skillMdStorageKey(t))).ok;
    return (await stat(join(t, "SKILL.md"))).isFile();
  } catch {
    return false;
  }
}
//@ chunk-hme9amad.js:12829-13007 placement
/**
 * 判断技能目录中的 SKILL.md 是否缺失。
 */
async function isSkillMdMissing(e, n) {
  try {
    if (n) {
      let s = await n.statMeta(skillMdStorageKey(e));
      return !s.ok && s.error.code === "NotFound";
    }
    await stat(join(e, "SKILL.md"));
    return false;
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR";
  }
}
//@ chunk-hme9amad.js:13007-13172 placement
/**
 * 把会话引用的技能转为同步条目（来源 session-refs，可带请求的版本）。
 */
function sessionRefSkillEntry(e) {
  return {
    skillId: e.id,
    name: e.directory || e.name || e.id,
    description: e.description,
    source: "session-refs",
    updatedAt: null,
    requestedVersion: e.version || undefined,
  };
}
//@ chunk-hme9amad.js:13172-13236 placement
/**
 * 复制条目并替换 backingPluginId。
 */
function carryBackingPluginId(e, n) {
  return {
    ...e,
    backingPluginId: n.backingPluginId,
  };
}
//@ chunk-hme9amad.js:13236-13349 placement
var SKILL_DIR_NAMING = {
  idOf: (e) => e.skillId,
  invalidNameTag: "skills_sync_invalid_name",
  collisionTag: "skills_sync_name_collision",
};
//@ chunk-hme9amad.js:13349-13453 placement
/**
 * 为同步技能分配目录名（处理非法名与冲突，可标记冲突落败者）。
 */
function assignSkillDirs(root, n, s) {
  return planSyncDownloads(n, s, {
    ...SKILL_DIR_NAMING,
    dirFor: (t) => syncedSkillDirPath(root, t),
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
function markCollisionLoserRow(e) {
  return {
    ...e,
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

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
import { lstat, lstat as lstat_2, readdir, rm, rmdir, stat, readFile } from "fs/promises";
import { join, relative, sep } from "path";
import { COLLISION_LOSER } from "../../skills/hostSkillMounts.js";
import { LUo, getHeldBackSyncedPlugins, clearCommandMemoizationCaches } from "../../commands.js";
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
import { Wts } from "../api/errorUtils.js";
import { hasActiveWork, onWorkStarted } from "../../utils/sessionActivity.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { getEntrypointKind, isHeadlessHostEntrypoint } from "../../utils/entrypointKinds.js";
import {
  getStoredAccountBucket,
  SKILLS_SYNC_DIR,
  WYe,
  MJ,
  GYe,
  SYNCED_MANIFEST_FILE,
  Cte,
  syncedItemPath,
} from "../../utils/plugins/syncedItems.js";
import {
  checkReuseWindow,
  readReuseStamp,
  fBr,
  _3n,
  eN,
  b3n,
  det,
  XKs,
  i$o,
  Ybt,
  K1t,
  cet,
  readManifestText,
  parseManifestJson,
  parseValidRows,
  uet,
  mergeManifestRows,
  omitKeys_2,
  mergeStaleDirs,
  planSyncDownloads,
} from "../../utils/claudeAiSync/skillsSync.js";
import {
  E2e,
  verifySyncRoot,
  readSyncMarker,
  checkSyncRoots,
  MUr,
} from "../../utils/claudeAiSync/syncOwnedRoot.js";
import { isPlainNonInteractive, envSessionKind } from "../../utils/sessionShape.js";
import { qOo } from "./orgSkillsApi.js";
import { env } from "../../utils/env.js";
import { runSyncRoundOnce, reconcileSkillsManifest, checkSyncOwnedRootFor } from "./syncRound.js";
import { sleep } from "../../utils/sleep.js";
import { zqe } from "../plugins/accountSync/sessionSkillManifest.js";
import {
  clearSkillCaches,
  syncedSkillsManifestSchema,
  syncedSkillEntrySchema,
} from "../../skills/loadSkillsDir.js";
import { Jz } from "../../utils/plugins/pluginsChangedSignal.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, E, A, oe, o, QD } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { By } from "../plugins/accountSync/pluginsScopeGate.js";

//@ chunk-hme9amad.js:2036-2772 placement
async function resolveSkillsBucket(e, n, s) {
  let t = new Set(n.map((y) => y.skillId)),
    filtered = e.filter(
      (y) =>
        y.backingPluginId !== void 0 &&
        y.updatedAt !== COLLISION_LOSER &&
        !t.has(y.skillId) &&
        LUo(s, y.backingPluginId),
    );
  if (filtered.length === 0) return [];
  let w = filtered,
    h = "another_session";
  try {
    if (
      (await firstLiveSessionMatching(
        (b) =>
          b.pid !== process.pid &&
          b.kind !== "daemon" &&
          b.asksForConvertedSkills !== !0 &&
          b.asksForConvertedSkills !== null,
      )) === void 0
    ) {
      let b = await findInstalledSyncedPlugins(s, new Set(filtered.flatMap((R) => R.backingPluginId ?? [])));
      if (b === null) h = "plugins_bucket_unread";
      else
        ((h = "no_plugin_folder"),
          (w = filtered.filter((R) => R.backingPluginId !== void 0 && !b.has(R.backingPluginId))));
    }
  } catch (error) {
    if (((h = "registry_unreadable"), !(error instanceof SessionRecordsUnreadableError)))
      ((h = "read_failed"), logError(toError(error)));
  }
  if (w.length > 0)
    logForDiagnosticsNoPII("info", "skills_sync_converted_copies_kept", { count: w.length, reason: h });
  return w;
}
/**
 * 检查被同步技能遮蔽的插件目录是否已消失，若消失的目录对应列表中的技能则记录并返回 true（需要重新同步）。
 */
//@ chunk-hme9amad.js:2772-3399 placement
async function noteHidingFoldersGone(e) {
  let n = getHeldBackSyncedPlugins(),
    filtered = (getLastSyncedLaneLoad() ?? []).filter(
      ({ pluginId: pluginId }) => pluginId !== void 0 && n.get(pluginId)?.heldBack === !1,
    ),
    results = await Promise.all(
      filtered.map(({ folder: folder }) =>
        lstat_2(folder).then(
          () => !0,
          (S) => !isENOENT(S),
        ),
      ),
    ),
    filtered_2 = filtered.filter((M, S) => !results[S]),
    w = remoteToolsState(),
    filtered_3 = filtered_2.filter(({ folder: folder }) => w.hidingFoldersGone.has(folder)),
    filtered_4 = filtered_2.filter(({ folder: folder }) => !w.hidingFoldersGone.has(folder)),
    b = filtered_4.length > 0 ? await e() : [],
    R = new Set(b.flatMap((M) => (M.updatedAt === COLLISION_LOSER ? [] : (M.backingPluginId ?? [])))),
    filtered_5 = filtered_4.filter(({ pluginId: pluginId }) => pluginId !== void 0 && R.has(pluginId));
  if (
    ((w.hidingFoldersGone = new Set([...filtered_3, ...filtered_5].map(({ folder: folder }) => folder))),
    filtered_5.length === 0)
  )
    return !1;
  return (
    logForDiagnosticsNoPII("info", "skills_sync_hiding_plugin_folder_gone", { count: filtered_5.length }),
    !0
  );
}
/**
 * 技能同步的调度常量：默认/最小/最大间隔、空闲倍数、退避、睡眠检测阈值与对应的特性开关名。
 */
//@ chunk-hme9amad.js:3399-3593 placement
var DEFAULT_SYNC_INTERVAL_MINUTES = 10,
  vt = DEFAULT_SYNC_INTERVAL_MINUTES * 60000,
  Dt = 4,
  Lt = "tengu_claudeai_skills_sync_interval_minutes",
  Et = 5,
  It = 1440,
  Ct = "tengu_claudeai_skills_sync_idle_intervals",
  On = 4,
  Tt = 4,
  Ft = 3600000,
  Pt = 30000,
  At = 60000,
  xn = 180000,
  Ie = 45000;
//@ chunk-hme9amad.js:3593-3719 placement
function syncIntervalMs() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(Lt, DEFAULT_SYNC_INTERVAL_MINUTES);
  if (typeof e !== "number" || Number.isNaN(e) || e <= 0) return vt;
  return Math.min(Math.max(e, Et), It) * 60000;
}
//@ chunk-hme9amad.js:3719-3774 placement
function Hn() {
  let e = syncIntervalMs();
  return idleSyncIntervalMs() > e && Wts(e) && !hasActiveWork();
}
//@ chunk-hme9amad.js:3774-3916 placement
function idleSyncIntervalMs() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(Ct, On),
    n = typeof e === "number" && !Number.isNaN(e) ? Math.min(Math.max(e, 1), Tt) : On,
    s = syncIntervalMs();
  return Math.max(s, Math.min(s * n, Ft));
}
//@ chunk-hme9amad.js:3916-3969 placement
function Kn() {
  return Pt + Math.floor(Math.random() * At);
}
//@ chunk-hme9amad.js:3969-4038 placement
function Te(e) {
  let n = syncIntervalMs();
  return Math.min(n * 2 ** Math.max(0, e - 1), n * Dt);
}
//@ chunk-hme9amad.js:4038-4157 placement
function armResync(e) {
  let n = remoteToolsState();
  if (n.resyncTimer) return;
  ((n.resyncRunRound = e), scheduleResync(n, e, Te(n.consecutiveFailedRounds), "resync", !1));
}
//@ chunk-hme9amad.js:4157-4292 placement
function rescheduleResync(e) {
  let n = remoteToolsState();
  if (!n.resyncTimer || !n.resyncRunRound) return;
  (clearTimeout(n.resyncTimer), scheduleResync(n, n.resyncRunRound, e, "resync", !1));
}
//@ chunk-hme9amad.js:4292-4559 placement
function awaitActivityForResync() {
  let e = remoteToolsState();
  if (e.stopAwaitingActivity) return;
  let mapped = [onInteraction, onWorkStarted].map((s) =>
    s(() => {
      if ((e.stopAwaitingActivity?.(), e.syncPromise))
        e.syncPromise.catch(() => {}).then(() => resyncOnActivity(e));
      else resyncOnActivity(e);
    }),
  );
  e.stopAwaitingActivity = () => {
    e.stopAwaitingActivity = null;
    for (let s of mapped) s();
  };
}
//@ chunk-hme9amad.js:4559-4613 placement
function Yn() {
  return remoteToolsState().stopAwaitingActivity !== null;
}
//@ chunk-hme9amad.js:4613-4657 placement
function on() {
  remoteToolsState().stopAwaitingActivity?.();
}
/**
 * 有用户活动时调整重新同步计时（睡眠后跳过或提前）。
 */
//@ chunk-hme9amad.js:4657-5137 placement
function resyncOnActivity(e) {
  try {
    let resyncArmed = e.resyncArmed;
    if (!e.resyncTimer || !e.resyncRunRound || !resyncArmed || resyncArmed.trigger === "wake_settle") return;
    let rounded = Math.round(Date.now() - resyncArmed.wallMs - (performance.now() - resyncArmed.monotonicMs));
    if (rounded > Ie && e.consecutiveFailedRounds === 0) {
      (clearTimeout(e.resyncTimer),
        skipResyncAfterSleep(e, e.resyncRunRound, resyncArmed.trigger, rounded, !0));
      return;
    }
    let t = e.consecutiveFailedRounds > 0 ? Te(e.consecutiveFailedRounds) : 0;
    if (resyncArmed.wallMs + resyncArmed.delayMs - Date.now() > t)
      (clearTimeout(e.resyncTimer), scheduleResync(e, e.resyncRunRound, t, "resync", !0));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-hme9amad.js:5137-5188 placement
function jn() {
  rescheduleResync(Te(remoteToolsState().consecutiveFailedRounds));
}
//@ chunk-hme9amad.js:5188-5379 placement
function scheduleResync(e, n, s, t, d) {
  let w = Date.now() + s;
  ((e.resyncArmed = { trigger: t, delayMs: s, wallMs: Date.now(), monotonicMs: performance.now() }),
    (e.resyncTimer = setTimeout(runResyncTick, s, e, n, w, t, d)),
    e.resyncTimer.unref?.());
}
//@ chunk-hme9amad.js:5379-5628 placement
function runResyncTick(e, n, s, t, d) {
  let resyncTimer = e.resyncTimer,
    max = Math.max(0, Date.now() - s);
  if (max > Ie) {
    skipResyncAfterSleep(e, n, t, max, !1);
    return;
  }
  n({ trigger: t, tickLateMs: max, ...(d && { woken: d }) })
    .catch(() => {})
    .then(() => {
      if (e.resyncTimer !== resyncTimer) return;
      scheduleResync(e, n, Te(e.consecutiveFailedRounds), "resync", !1);
    });
}
//@ chunk-hme9amad.js:5628-5865 placement
function skipResyncAfterSleep(e, n, s, t, d) {
  (logForDiagnosticsNoPII("info", "skills_sync_resync_skipped_after_sleep", { late_ms: t, woken: d }),
    scheduleResync(e, n, xn, "wake_settle", d));
  try {
    if (!isDiskless())
      logEvent("tengu_skills_sync_resync_skipped", {
        trigger: fromEnum(s),
        tick_late_ms: t,
        settle_ms: xn,
        woken: d,
      });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-hme9amad.js:5865-5878 placement
var Ot = 60000;
//@ chunk-hme9amad.js:5878-5935 placement
function ye(e) {
  let n = getEntrypointKind() ?? "none";
  return e ? `${n}${an}` : n;
}
//@ chunk-hme9amad.js:5935-5962 placement
var an = ".converted-skills";
//@ chunk-hme9amad.js:5962-6040 placement
function $n(e) {
  return { ...e, listedFor: e.listedFor.filter((n) => n.endsWith(an)) };
}
//@ chunk-hme9amad.js:6040-6858 placement
async function reuseSkillsSyncRound({
  syncedRoot: syncedRoot,
  bucket: bucket,
  root: root,
  trigger: trigger,
  pinned: pinned,
  lastGeneration: lastGeneration,
  holdsPlaceholders: holdsPlaceholders,
  idle: idle,
  convertedSkillsAsPlugins: convertedSkillsAsPlugins,
}) {
  let R = !pinned && bucket === getStoredAccountBucket(),
    D = pinned ? void 0 : firstResyncDelay(trigger, R, idle);
  if (D === void 0) return { list: !0, shared: R };
  if (R && idle) awaitActivityForResync();
  let M = await checkReuseWindow(root, D);
  if (!M.reuse || !(await E2e(syncedRoot, bucket))) return (on(), { list: !0, shared: R });
  let S = await readReuseStamp(root),
    O = !1;
  if (R) {
    if (S === null || holdsPlaceholders || !S.listedFor.includes(ye(convertedSkillsAsPlugins)))
      return (on(), { list: !0, shared: R });
    let I = idle && Yn();
    if (idle && !I && M.ageMs >= syncIntervalMs()) return { list: !0, shared: R };
    O = S.token !== lastGeneration && trigger !== "startup";
    let B = I ? idleSyncIntervalMs() : syncIntervalMs();
    if (M.ageMs < B) rescheduleResync(B - M.ageMs + Kn());
  } else {
    let I = S?.listedFor ?? [];
    if (
      !(convertedSkillsAsPlugins ? I.includes(ye(!0)) : I.includes(ye(!1)) || !I.some((C) => C.endsWith(an)))
    )
      return { list: !0, shared: R };
  }
  return (
    logForDiagnosticsNoPII("info", "skills_sync_round_reused", { age_ms: M.ageMs, within_ms: M.withinMs }),
    { list: !1, generation: S?.token ?? null, reload: O }
  );
}
//@ chunk-hme9amad.js:6858-7045 placement
function firstResyncDelay(e, n, s) {
  let t = e === "startup" ? fBr() : void 0;
  if (!n || e === "reload") return t;
  if (s) return idleSyncIntervalMs();
  let d =
    e === "startup" && (!isPlainNonInteractive() || (isHeadlessHostEntrypoint() && envSessionKind()))
      ? Math.min(Ot, syncIntervalMs())
      : syncIntervalMs();
  return Math.max(d, t ?? 0);
}
//@ chunk-hme9amad.js:7045-7074 placement
var TENGU_JAUNTY_ALPACA = "tengu_jaunty_alpaca";
//@ chunk-hme9amad.js:7074-7110 placement
function Zn() {
  return getFeatureValue_SESSION_PINNED(TENGU_JAUNTY_ALPACA, !0) !== !1;
}
//@ chunk-hme9amad.js:7110-7141 placement
var TENGU_QUIZZICAL_WIRTH = "tengu_quizzical_wirth";
//@ chunk-hme9amad.js:7141-7176 placement
function Fe() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_QUIZZICAL_WIRTH, !0) !== !1;
}
//@ chunk-hme9amad.js:7176-7199 placement
var ln = 15,
  Yt = qOo + 60000;
//@ chunk-hme9amad.js:7199-7282 placement
function jt() {
  let CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS = env.CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS;
  return CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS && CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS > 0
    ? CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS
    : 5000;
}
//@ chunk-hme9amad.js:7282-7370 placement
function tDs() {
  let e = env.CLAUDE_CODE_SYNC_SKILLS_INSTALL_TIMEOUT_MS;
  return e && e > 0 ? e : 30000;
}
/**
 * 返回首次技能列表的 deferred（Promise 与 resolve），没有时创建。
 */
//@ chunk-hme9amad.js:7370-7521 placement
function firstListDeferred() {
  let e = remoteToolsState();
  if (!e.firstListDeferred) {
    let n,
      promise = new Promise((t) => {
        n = t;
      });
    e.firstListDeferred = { promise: promise, resolve: n };
  }
  return e.firstListDeferred;
}
//@ chunk-hme9amad.js:7521-7596 placement
function lLe(e, n, s) {
  ((remoteToolsState().firstSyncPromise ??= runStartupSync(e, n, s)),
    armResync((t) => runSyncRoundOnce(e, n, s, t)));
}
/**
 * CCR 中按 CLAUDE_CODE_CCR_EARLY_SKILLS_SYNC 在非交互会话启动时提前开始技能同步，返回是否启动。
 */
//@ chunk-hme9amad.js:7596-7780 placement
function startEarlySkillsSync(e, n, s, t) {
  if (!env.CLAUDE_CODE_CCR_EARLY_SKILLS_SYNC || e.host.launchOptions.isInteractive() || !_3n(e) || t())
    return !1;
  if ((eN(), !b3n(e) || !det() || XKs())) return !1;
  return (lLe(e, n, s), !0);
}
//@ chunk-hme9amad.js:7780-7862 placement
function rDs(e, n, s) {
  let t = firstListDeferred();
  return ((remoteToolsState().firstSyncPromise ??= runStartupSync(e, n, s)), t.promise);
}
/**
 * 回合开始前等待首次技能列表，超过剩余等待时间则记 timed_out 遥测。
 */
//@ chunk-hme9amad.js:7862-8070 placement
async function awaitFirstSkillsList(e, n) {
  let s = jt() - (performance.now() - n),
    winner = await Promise.race([e.then(() => "listed"), sleep(Math.max(0, s)).then(() => "timed_out")]);
  if (winner === "timed_out") logEvent("tengu_skills_sync_wait_timeout", {});
  return winner;
}
/**
 * 丢弃进行中的请求，等当前同步结束后以 reload 触发重新同步。
 */
//@ chunk-hme9amad.js:8070-8198 placement
async function reloadSyncedSkills(e, n, s) {
  return (
    zqe.of(e).discardInflight(),
    await remoteToolsState().syncPromise?.catch(() => {}),
    runSyncRoundOnce(e, n, s, { trigger: "reload" })
  );
}
//@ chunk-hme9amad.js:8198-8303 placement
function runStartupSync(e, n, s) {
  let t = remoteToolsState();
  return runSyncRoundOnce(e, n, s, { trigger: "startup" }).finally(() => {
    t.firstRoundSettled = !0;
  });
}
//@ chunk-hme9amad.js:8303-8375 placement
function un() {
  let e = remoteToolsState();
  if (!e.firstRoundSettled) e.firstRoundEmitted = !0;
}
//@ chunk-hme9amad.js:8375-8410 placement
function Hce() {
  (un(), clearSkillCaches(), Jz.emit());
}
/**
 * 记录技能 bucket 代号；代号变化时清空同步缓存。
 */
//@ chunk-hme9amad.js:8410-8521 placement
function noteBucketGeneration(e, n) {
  if (e === null) return;
  if (n !== null && e.token !== n.token) {
    Hce();
    return;
  }
  remoteToolsState().bucketGeneration = e.token;
}
//@ chunk-hme9amad.js:8521-8553 placement
function ne() {
  return join(getClaudeConfigDir(), SKILLS_SYNC_DIR);
}
//@ chunk-hme9amad.js:8553-8585 placement
function rt(e) {
  return join(ne(), e);
}
//@ chunk-hme9amad.js:8585-8667 placement
function ot(e) {
  return STORAGE_SPACES.userConfigDir("skills", relative(join(getClaudeConfigDir(), "skills"), e).split(sep));
}
/**
 * 扫描技能同步根目录：区分 bucket、杂项与不可读条目。
 */
//@ chunk-hme9amad.js:8667-9212 placement
async function scanSkillsSyncRoot(e) {
  let n = ne();
  if (
    (await verifySyncRoot(
      n,
      getClaudeConfigDir(),
      { event: "skills_sync_root_refused", phase: "prune", rootLabel: SKILLS_SYNC_DIR },
      { storageV5: e },
    ).catch(() => null)) !== "real"
  )
    return null;
  let t;
  try {
    t = await readdir(n, { withFileTypes: !0 });
  } catch {
    return null;
  }
  let d = [],
    w = [],
    h = [];
  for (let y of t) {
    let b = y.isDirectory() && WYe(y.name) ? await readSyncMarker(n, y.name) : "unmarked";
    if (b === "marked") d.push(y.name);
    else if (typeof b === "object")
      (h.push(y.name),
        logForDiagnosticsNoPII("warn", "skills_sync_bucket_marker_unreadable", { code: b.unreadable }));
    else if (!MJ(y.name)) w.push(y.name);
  }
  return { buckets: d, strays: w, unreadable: h };
}
//@ chunk-hme9amad.js:9212-9357 placement
async function trashStrayEntries(e, n) {
  let s = 0;
  for (let t of e) if (await moveToSyncTrash(join(ne(), t), n)) s++;
  if (s > 0) logForDiagnosticsNoPII("info", "skills_sync_stray_entry_trashed", { count: s });
  return s;
}
/**
 * 把技能同步根目录下的杂项条目移到回收目录，返回是否移动了。
 */
//@ chunk-hme9amad.js:9357-9468 placement
async function trashStraySyncEntries(e) {
  let n = await scanSkillsSyncRoot(e);
  if (n === null || n.strays.length === 0) return !1;
  return (await trashStrayEntries(n.strays, e)) > 0;
}
/**
 * 把技能同步目录移到回收目录（带根目录检查）。
 */
//@ chunk-hme9amad.js:9468-9593 placement
function moveToSyncTrash(e, n) {
  return checkSyncRoots({
    dir: e,
    trashRoot: xe(),
    configHome: getClaudeConfigDir(),
    failureEvent: "skills_sync_trash_move_failed",
    storageV5: n,
  });
}
/**
 * 技能同步关闭时清理同步根目录：逐个 bucket 对账清单并删除，移走杂项，清空命令与技能缓存。
 */
//@ chunk-hme9amad.js:9593-10191 placement
async function pruneSkillsSyncRoot(e) {
  if (!i$o()) return !1;
  let n = await verifySyncRoot(
    ne(),
    getClaudeConfigDir(),
    { event: "skills_sync_root_refused", phase: "prune", rootLabel: SKILLS_SYNC_DIR },
    { storageV5: e },
  );
  if (n !== "real" && n !== "absent") return !1;
  let s = null,
    t = n === "real" ? await scanSkillsSyncRoot(e) : null;
  if (t !== null) {
    s = 0;
    for (let bucket of t.buckets) {
      let h = rt(bucket);
      await rm(Ybt(h), { force: !0 }).catch(() => {});
      let y = await reconcileSkillsManifest(h, e).catch(() => null);
      if (y !== null)
        ((s += y),
          await rmdir(h).then(
            () => K1t(ne(), bucket),
            () => {},
          ));
    }
    ((s += await trashStrayEntries([...t.strays, ...t.unreadable], e)), await rmdir(ne()).catch(() => {}));
  }
  logForDiagnosticsNoPII("info", "skills_sync_pruned_for_closed_gate", { moved: s ?? 0 });
  let d = s !== null && s > 0;
  if (d) (clearCommandMemoizationCaches(), clearSkillCaches(), Jz.emit());
  return d;
}
//@ chunk-hme9amad.js:10191-10224 placement
function xe() {
  return join(getClaudeConfigDir(), GYe);
}
//@ chunk-hme9amad.js:10224-10254 placement
function Be(e) {
  return join(e, SYNCED_MANIFEST_FILE);
}
/**
 * 技能同步清单 schema（lastUpdated、skills、staleDirs、pendingClaims）与清单中单个技能的 schema。
 */
//@ chunk-hme9amad.js:10254-10593 placement
var SKILLS_MANIFEST_SCHEMA = new Set(),
  nt = [],
  $t = DoctorLazy(() =>
    kt({
      lastUpdated: E().catch(0),
      skills: A(oe()),
      staleDirs: oe().optional(),
      pendingClaims: oe().optional(),
    }),
  ),
  qt = DoctorLazy(() =>
    kt({
      name: o(),
      skillId: o().catch(""),
      description: o().catch(""),
      source: o().catch(""),
      updatedAt: o().nullable().catch(null),
      userInvocable: QD().catch(void 0),
      disableModelInvocation: QD().catch(void 0),
    }),
  );
//@ chunk-hme9amad.js:10593-10625 placement
function dt(e) {
  return ot(Be(e));
}
//@ chunk-hme9amad.js:10625-11482 placement
async function readSkillsSyncManifest(e, n) {
  let s = !n.manifestRead;
  n.manifestRead = !0;
  let t;
  if (e)
    try {
      let read = await e.read([{ key: dt(n.root), offset: 0, length: cet + 1 }]);
      if (!read.ok) {
        if (s)
          logForDiagnosticsNoPII("warn", "skills_sync_manifest_unreadable", { code: "backend_read_failed" });
        return null;
      }
      let D = read.value.items[0];
      if (!D.found) return null;
      if (D.totalBytes > cet || D.value.byteLength > cet) {
        if (s) logForDiagnosticsNoPII("warn", "skills_sync_manifest_unreadable", { code: "parse_or_size" });
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
  else if (
    ((t = await readManifestText(Be(n.root), s ? "skills_sync_manifest_unreadable" : null)), t === null)
  )
    return null;
  let d = parseManifestJson(t, syncedSkillsManifestSchema(), s ? "skills_sync_manifest_unreadable" : null);
  if (d === null) return null;
  let { skills: skills, staleDirs: staleDirs, pendingClaims: pendingClaims, ...b } = d;
  return {
    ...b,
    skills: parseValidRows(syncedSkillEntrySchema(), skills),
    staleDirs: uet(staleDirs),
    pendingClaims: uet(pendingClaims),
  };
}
//@ chunk-hme9amad.js:11482-12201 placement
async function writeSkillsSyncManifest(e, n, s, t) {
  let refusedReason = t.guard.refusedReason();
  if (refusedReason !== null) throw MUr(refusedReason);
  await checkSyncOwnedRootFor(s, t.root);
  let w = await readSkillsSyncManifest(s, t);
  if (w === null && n.onlyOverReadable) return;
  let h = mergeManifestRows(
      parseValidRows(syncedSkillEntrySchema(), e.skills),
      w?.skills,
      (b) => b.skillId,
      n.removedSkillIds,
      parseValidRows(syncedSkillEntrySchema(), n.deferredRows),
    ),
    y = jsonStringify(
      {
        ...omitKeys_2(w, ["lastUpdated", "skills", "staleDirs", "pendingClaims"]),
        ...e,
        skills: h,
        staleDirs: mergeStaleDirs(e.staleDirs, w?.staleDirs, n.staleDirs),
        pendingClaims: mergeStaleDirs(e.pendingClaims, w?.pendingClaims, n.pendingClaims),
      },
      null,
      2,
    );
  if (s) {
    let write = await s.write(dt(t.root), y, { mode: 438 & ~process.umask(), publishDiscipline: "atomic" });
    if (!write.ok)
      throw (
        logForDiagnosticsNoPII("error", "skills_sync_manifest_write_failed", { code: write.error.code }),
        Error("skillsSync: manifest write failed")
      );
    return;
  }
  await writeFileAtomic(Be(t.root), y);
}
//@ chunk-hme9amad.js:12201-12252 placement
function fn(e) {
  return join(e, Cte, String(process.pid));
}
//@ chunk-hme9amad.js:12252-12283 placement
function Y(e, n) {
  return syncedItemPath(n, e);
}
/**
 * 读取同步技能的 SKILL.md 文本（经存储后端或文件系统，超出大小或不是文件时为 null）。
 */
//@ chunk-hme9amad.js:12283-12646 placement
async function readSyncedSkillMd(e, n, s) {
  try {
    let t = Y(e, n);
    if (s) {
      let read = await s.read([{ key: _n(t), offset: 0, length: By + 1 }]),
        y = read.ok ? read.value.items[0] : void 0;
      if (!y?.found || y.totalBytes > By || y.value.byteLength > By) return null;
      return Buffer.from(y.value).toString("utf8");
    }
    let d = join(t, "SKILL.md"),
      w = await stat(d);
    if (!w.isFile() || w.size > By) return null;
    return await readFile(d, "utf8");
  } catch {
    return null;
  }
}
//@ chunk-hme9amad.js:12646-12688 placement
function _n(e) {
  return ot(join(e, "SKILL.md"));
}
/**
 * 判断同步技能目录中是否有 SKILL.md。
 */
//@ chunk-hme9amad.js:12688-12829 placement
async function hasSyncedSkillMd(e, n, s) {
  try {
    let t = Y(e, n);
    if (s) return (await s.statMeta(_n(t))).ok;
    return (await stat(join(t, "SKILL.md"))).isFile();
  } catch {
    return !1;
  }
}
/**
 * 判断技能目录中的 SKILL.md 是否缺失。
 */
//@ chunk-hme9amad.js:12829-13007 placement
async function isSkillMdMissing(e, n) {
  try {
    if (n) {
      let statMeta = await n.statMeta(_n(e));
      return !statMeta.ok && statMeta.error.code === "NotFound";
    }
    return (await stat(join(e, "SKILL.md")), !1);
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR";
  }
}
/**
 * 把会话引用的技能转为同步条目（来源 session-refs，可带请求的版本）。
 */
//@ chunk-hme9amad.js:13007-13172 placement
function sessionRefSkillEntry(e) {
  return {
    skillId: e.id,
    name: e.directory || e.name || e.id,
    description: e.description,
    source: "session-refs",
    updatedAt: null,
    requestedVersion: e.version || void 0,
  };
}
//@ chunk-hme9amad.js:13172-13236 placement
function ct(e, n) {
  return { ...e, backingPluginId: n.backingPluginId };
}
//@ chunk-hme9amad.js:13236-13349 placement
var SKILL_DIR_NAMING = {
  idOf: (e) => e.skillId,
  invalidNameTag: "skills_sync_invalid_name",
  collisionTag: "skills_sync_name_collision",
};
/**
 * 为同步技能分配目录名（处理非法名与冲突，可标记冲突落败者）。
 */
//@ chunk-hme9amad.js:13349-13453 placement
function assignSkillDirs(e, n, s) {
  return planSyncDownloads(n, s, {
    ...SKILL_DIR_NAMING,
    dirFor: (t) => Y(e, t),
    carry: ct,
    ...(Zn() && { markCollisionLoser: ti }),
  });
}
//@ chunk-hme9amad.js:13453-13495 placement
function ti(e) {
  return { ...e, updatedAt: COLLISION_LOSER };
}

export {
  lLe,
  rDs,
  tDs,
  reloadSyncedSkills,
  startEarlySkillsSync,
  pruneSkillsSyncRoot,
  Hce,
  Y,
  fn,
  moveToSyncTrash,
  $t,
  qt,
  ne,
  xe,
  rt,
  Hn,
  reuseSkillsSyncRound,
  noteHidingFoldersGone,
  readSkillsSyncManifest,
  sessionRefSkillEntry,
  ct,
  Ie,
  trashStraySyncEntries,
  resolveSkillsBucket,
  $n,
  assignSkillDirs,
  un,
  hasSyncedSkillMd,
  writeSkillsSyncManifest,
  SKILLS_MANIFEST_SCHEMA,
  nt,
  Be,
  noteBucketGeneration,
  ye,
  firstListDeferred,
  ln,
  readSyncedSkillMd,
  Fe,
  jn,
  isSkillMdMissing,
  Yt,
  awaitFirstSkillsList,
};

/**
 * utils/cronScheduler.ts
 *
 * 定时任务调度器：加载 scheduled_tasks.json 与会话内任务、抢调度锁、每秒检查到点任务并触发、错过的一次性任务提示、过期循环任务清理、文件监听
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cronScheduler.ts
 * pieces: chunk-hnzqng4j.js (9)
 * attribution: sole-consumer 2, affinity 1, fingerprint 1, layout 3, facade-exports 2
 */
import { join, join as join_2, join as join_3 } from "path";
import {
  getProjectDir,
  validateUuid,
  normalizePathForCwdCompare,
  slugCollisionGuardFoldsCase,
} from "./sessionStoragePortable.js";
import { getFsImplementation } from "./fsOperations.js";
import { getErrnoCode, withTelemetryMessage, toError, getTelemetryMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { ge } from "./identity.js";
import {
  getSessionId,
  getProjectRoot,
  removeSessionCronTasks,
  getSessionCronTasks,
  getScheduledTasksEnabled,
  onSessionSwitch,
  setScheduledTasksEnabled,
  onScheduledTasksEnabled,
} from "../bootstrap/state.js";
import { isProcessRunning } from "./genericProcessUtils.js";
import { getProcessStartTime, ownProcStartMemo, ownProcStart } from "./processIdentity.js";
import {
  removeCronTasks,
  isCronFileIgnored,
  readCronTasks,
  writeCronTasks,
  findMissedTasks,
  DEFAULT_CRON_JITTER_CONFIG,
  nextFireTimeForTask,
  jitteredNextCronRunMs,
  markCronTasksFired,
  getCronFilePath,
  hasCronTasksSync,
} from "./cronTasks.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { WQt, ye } from "./startupMarks.js";
import { logError } from "./log.js";
import { releaseSchedulerLock, tryAcquireSchedulerLock } from "./cronTasksLock.js";
import { gn } from "./shortHash.js";
import { cronToHuman } from "./cron.js";
import { fenceCodeBlock } from "./stringUtils.js";

/**
 * 调度锁持有状态：退出清理注册与"被谁占用"的最后记录。
 */
//@ chunk-hnzqng4j.js:4668-4815 sole-consumer
class SchedulerLockState {
  unregisterCleanup = void 0;
  lastBlockedBy = void 0;
  reset() {
    (this.unregisterCleanup?.(), (this.unregisterCleanup = void 0), (this.lastBlockedBy = void 0));
  }
}
/**
 * 依赖模块与常量：检查间隔 1000ms、文件监听去抖 300ms、锁探测间隔 5000ms。
 */
//@ chunk-hnzqng4j.js:4815-4876 affinity
var loopSentinelModule = require("./chunk-w6rm7nhv.js"),
  CHECK_INTERVAL_MS = 1000,
  WATCH_DEBOUNCE_MS = 300,
  LOCK_PROBE_INTERVAL_MS = 5000;
/**
 * 循环任务是否已超过最长存活时间（permanent 除外，maxAge 为 0 表示不限）。
 */
//@ chunk-hnzqng4j.js:4876-4973 fingerprint = isRecurringTaskAged (1)
function isRecurringTaskAged(task, nowMs, maxAgeMs) {
  if (maxAgeMs === 0) return !1;
  return Boolean(task.recurring && !task.permanent && nowMs - task.createdAt >= maxAgeMs);
}
/**
 * 找出 scheduled_tasks.json 中由其他会话创建、且本项目目录下确实有其 transcript 的会话集合（用来判断是否由本项目接管这些任务）。
 */
//@ chunk-hnzqng4j.js:4973-5640 layout
async function findKnownCreatorSessions(tasks, selfSessionId, projectDir) {
  let y = getProjectDir(projectDir),
    w = getFsImplementation(),
    h = new Set(),
    d = new Set();
  for (let { createdBySessionId: createdBySessionId } of tasks)
    if (createdBySessionId !== void 0 && createdBySessionId !== selfSessionId) d.add(createdBySessionId);
  if (
    (await Promise.all(
      Array.from(d, async (v) => {
        if (validateUuid(v) === null) return;
        if (
          await w.lstat(join(y, `${v}.jsonl`)).then(
            (M) => M.isFile(),
            (M) => {
              let P = getErrnoCode(M);
              if (P !== "ENOENT" && P !== "ENOTDIR")
                logForDebugging(
                  `[ScheduledTasks] could not look for a transcript of task creator ${v} (${P}); treating it as not found`,
                );
              return !1;
            },
          )
        )
          h.add(v);
      }),
    ),
    h.size < d.size)
  )
    logForDebugging(
      `[ScheduledTasks] found no transcript in ${y} for ${d.size - h.size} other session(s) named in scheduled_tasks.json (a file copied from another checkout looks like this); this session will not run their tasks`,
    );
  return h;
}
/**
 * 本进程已"交给处理器保留"的任务键集合（dir + id）。
 */
//@ chunk-hnzqng4j.js:5640-5674 layout
var keptBackTaskKeys = ge(new Set(), (n) => n.clear());
//@ chunk-hnzqng4j.js:5674-5716 layout
function taskKey(dir, taskId) {
  return `${dir ?? ""}\x00${taskId}`;
}
/**
 * 创建调度器：start 时（已启用或有任务时开启定时任务功能）抢调度锁、加载任务、每秒 check；check 对每个可归属本会话的任务计算带抖动的下次时间，到点调用 onFire/onFireTask，
 * 循环任务重排（超龄则最后一次后删除）、一次性任务删除、持久化 lastFiredAt；首次加载时把错过的一次性任务交给 onMissed 或生成提示。返回 {start, stop, getNextFireTime, checkNow}。
 */
//@ chunk-hnzqng4j.js:5716-12204 facade-exports = createCronScheduler (0.654)
function createCronScheduler(options) {
  let {
      onFire: onFire,
      isLoading: isLoading,
      assistantMode: assistantMode = !1,
      onFireTask: onFireTask,
      onMissed: onMissed,
      dir: dir,
      lockIdentity: lockIdentity,
      getJitterConfig: getJitterConfig,
      isKilled: isKilled,
      filter: filter,
      getExtraTasks: getExtraTasks,
      leaseFileTasks: leaseFileTasks = () => !0,
    } = options,
    D = dir || lockIdentity ? { dir: dir, lockIdentity: lockIdentity } : void 0,
    lockState = new SchedulerLockState(),
    lockSessionId = dir !== void 0 ? lockIdentity : getSessionId(),
    ownSessionIds = new Set(),
    ne = null,
    fileTasks = [],
    extraTasks = [],
    nextFireAt = new Map(),
    missedAsked = new Set(),
    inFlight = new Set(),
    enablePoll = null,
    checkTimer = null,
    lockProbeTimer = null,
    watcher = null,
    stopped = !1,
    holdsLock = !1,
    knownCreatorSessions = new Set(),
    projectKey = "",
    pidTokenCache = new Map();
  function isCreatorProcessGone(r, c) {
    if (!isProcessRunning(r)) return (pidTokenCache.delete(r), !0);
    if (c === void 0) return !1;
    let now = Date.now(),
      T = pidTokenCache.get(r);
    if (!T || now - T.at >= 60000)
      ((T = { at: now, token: getProcessStartTime(r) }), pidTokenCache.set(r, T));
    return T.token !== void 0 && T.token !== c;
  }
  function Ce(r) {
    return normalizePathForCwdCompare(r, slugCollisionGuardFoldsCase());
  }
  function isFromThisProject(r) {
    if (r.createdInProject !== void 0) return Ce(r.createdInProject) === projectKey;
    return r.createdBySessionId !== void 0 && knownCreatorSessions.has(r.createdBySessionId);
  }
  function isOwnedByThisSession(r) {
    if (r.createdBySessionId === void 0) return holdsLock;
    if (r.createdBySessionId === lockSessionId) return !0;
    if (
      ownSessionIds.has(r.createdBySessionId) &&
      r.createdByPid === process.pid &&
      (r.createdByProcStart === void 0
        ? r.createdAt >= performance.timeOrigin
        : r.createdByProcStart === ownProcStartMemo.token)
    )
      return !0;
    return (
      holdsLock &&
      isFromThisProject(r) &&
      (r.createdByPid === void 0 || isCreatorProcessGone(r.createdByPid, r.createdByProcStart))
    );
  }
  function removeTasks(r) {
    if (r.length === 0) return;
    removeCronTasks(
      r.map((c) => c.id),
      dir,
    ).catch((c) => logForDebugging(`[ScheduledTasks] failed to remove tasks: ${c}`));
  }
  async function load(initial) {
    let c = isCronFileIgnored(dir) ? [] : await readCronTasks(dir),
      C = getExtraTasks
        ? await getExtraTasks().catch((S) => {
            if (claimOnce().claim("cron_extra_tasks_load_bad"))
              logFeatureBad("routine_register_trigger", "extra_tasks_load_failed");
            return (logForDebugging(`[ScheduledTasks] getExtraTasks failed: ${S}`), []);
          })
        : [],
      T = dir ?? getProjectRoot(),
      x = await findKnownCreatorSessions(
        c.filter((S) => S.createdInProject === void 0),
        lockSessionId,
        T,
      );
    if (stopped) return;
    if (((fileTasks = c), (extraTasks = C), (knownCreatorSessions = x), (projectKey = Ce(T)), !initial))
      return;
    let e = !1;
    for (let S of c)
      if (
        lockSessionId !== void 0 &&
        S.createdBySessionId === lockSessionId &&
        S.createdByPid !== process.pid
      )
        ((S.createdByPid = process.pid), (S.createdByProcStart = ownProcStart()), (e = !0));
    if (e)
      await writeCronTasks(c, dir).catch((S) =>
        logForDebugging(`[ScheduledTasks] failed to refresh task pids: ${S}`),
      );
    let now = Date.now(),
      missed = findMissedTasks(c, now).filter(
        (S) =>
          !S.recurring &&
          !missedAsked.has(S.id) &&
          !keptBackTaskKeys.has(taskKey(dir, S.id)) &&
          (!filter || filter(S)) &&
          isOwnedByThisSession(S),
      );
    if (missed.length > 0) {
      for (let b of missed) (missedAsked.add(b.id), nextFireAt.set(b.id, 1 / 0));
      logEvent("tengu_scheduled_task_missed", {
        count: missed.length,
        taskIds: WQt(missed.map((b) => b.id)),
      });
      let S = new Set();
      try {
        if (onMissed) {
          S = new Set(onMissed(missed, removeTasks) ?? []);
          for (let b of S) keptBackTaskKeys.add(taskKey(dir, b));
        } else onFire(buildMissedTaskNotification(missed));
      } catch (error) {
        (logForDebugging(
          `[ScheduledTasks] could not surface ${missed.length} missed one-shot task(s); they stay in scheduled_tasks.json for a later session`,
          { level: "error" },
        ),
          logError(
            toReportableTaskError(
              error,
              "handler for missed scheduled tasks threw (message not reported: it may contain user text)",
            ),
          ));
        return;
      }
      (removeTasks(missed.filter((b) => !S.has(b.id))),
        logForDebugging(
          `[ScheduledTasks] surfaced ${missed.length - S.size} missed one-shot task(s), kept back ${S.size}`,
        ));
    }
  }
  function check() {
    if (isKilled?.()) return;
    if (holdsLock && !leaseFileTasks()) ((holdsLock = !1), releaseSchedulerLock(lockState, D));
    if (isLoading() && !assistantMode) return;
    let now = Date.now(),
      seen = new Set(),
      C = [],
      T = getJitterConfig?.() ?? DEFAULT_CRON_JITTER_CONFIG;
    function x(e, isSession) {
      if (filter && !filter(e)) return;
      if ((seen.add(e.id), inFlight.has(e.id))) return;
      if (!isSession && keptBackTaskKeys.has(taskKey(dir, e.id))) return;
      let next = nextFireAt.get(e.id);
      if (next === void 0) {
        let L = nextFireTimeForTask(e, T);
        if (L === null)
          logFeatureBad("cron_task_fire", "next_fire_unresolvable", { recurring: e.recurring ?? !1 });
        ((next = L ?? 1 / 0),
          nextFireAt.set(e.id, next),
          logForDebugging(
            `[ScheduledTasks] scheduled ${e.id} for ${next === 1 / 0 ? "never" : new Date(next).toISOString()}`,
          ));
      }
      if (now < next) return;
      logForDebugging(`[ScheduledTasks] firing ${e.id}${e.recurring ? " (recurring)" : ""}`);
      let S = e.id.startsWith("routine:") ? gn(e.id) : ye(e.id);
      logEvent("tengu_scheduled_task_fire", {
        recurring: e.recurring ?? !1,
        taskId: S,
        autonomousLoopDefault: loopSentinelModule.isLoopDefaultSentinel(e.prompt),
      });
      let b = { recurring: e.recurring ?? !1, permanent: e.permanent ?? !1 },
        _e = !1;
      try {
        if (onFireTask) _e = onFireTask(e, () => removeTasks([e])) === !0;
        else onFire(e.prompt);
        logFeatureOk("cron_task_fire", b);
      } catch (error) {
        let Q = !isSession && !e.recurring;
        if (Q) nextFireAt.set(e.id, 1 / 0);
        if (
          (logForDebugging(
            Q
              ? `[ScheduledTasks] delivering task ${e.id} failed (its handler threw); the task stays in scheduled_tasks.json for a later session`
              : `[ScheduledTasks] delivering task ${e.id} failed (its handler threw); this run is dropped and will not be retried`,
            { level: "error" },
          ),
          logFeatureBad("cron_task_fire", "handler_threw", b),
          logError(
            toReportableTaskError(
              error,
              "scheduled task fire handler threw (message not reported: it may contain user text)",
            ),
          ),
          Q)
        )
          return;
      }
      let aged = isRecurringTaskAged(e, now, T.recurringMaxAgeMs);
      if (aged) {
        let ageHours = Math.floor((now - e.createdAt) / 1000 / 60 / 60);
        (logForDebugging(
          `[ScheduledTasks] recurring task ${e.id} aged out (${ageHours}h since creation), deleting after final fire`,
        ),
          logEvent("tengu_scheduled_task_expired", { taskId: S, ageHours: ageHours }));
      }
      if (e.recurring && !aged) {
        let L = jitteredNextCronRunMs(e.cron, now, e.id, T);
        if (L === null) logFeatureSad("cron_task_fire", "reschedule_unresolvable");
        let Q = L ?? 1 / 0;
        if ((nextFireAt.set(e.id, Q), !isSession)) C.push(e.id);
      } else if (isSession) (removeSessionCronTasks([e.id]), nextFireAt.delete(e.id));
      else if (_e) (keptBackTaskKeys.add(taskKey(dir, e.id)), nextFireAt.set(e.id, 1 / 0));
      else
        (inFlight.add(e.id),
          nextFireAt.set(e.id, 1 / 0),
          removeCronTasks([e.id], dir)
            .catch((L) => logForDebugging(`[ScheduledTasks] failed to remove task ${e.id}: ${L}`))
            .finally(() => inFlight.delete(e.id)));
    }
    for (let e of fileTasks) if (isOwnedByThisSession(e)) x(e, !1);
    if (C.length > 0) {
      for (let id of C) inFlight.add(id);
      markCronTasksFired(C, now, dir)
        .catch((e) => logForDebugging(`[ScheduledTasks] failed to persist lastFiredAt: ${e}`))
        .finally(() => {
          for (let id of C) inFlight.delete(id);
        });
    }
    if (dir === void 0)
      for (let e of getSessionCronTasks().slice()) {
        x(e, !0);
        let j = nextFireAt.get(e.id);
        e.nextFireAt = j === 1 / 0 ? void 0 : j;
      }
    for (let e of extraTasks) x(e, !0);
    if (seen.size === 0) {
      nextFireAt.clear();
      return;
    }
    for (let id of nextFireAt.keys()) if (!seen.has(id)) nextFireAt.delete(id);
  }
  async function enable() {
    if (stopped) return;
    (enablePoll?.(), (enablePoll = null));
    let { default: chokidar } = await import("./chunk-p13a1b4d.js");
    if (stopped) return;
    if (
      ((holdsLock = leaseFileTasks() ? await tryAcquireSchedulerLock(lockState, D).catch(() => !1) : !1),
      stopped)
    ) {
      if (holdsLock) ((holdsLock = !1), releaseSchedulerLock(lockState, D));
      return;
    }
    if (!holdsLock)
      ((lockProbeTimer = setInterval(() => {
        if (!leaseFileTasks()) return;
        tryAcquireSchedulerLock(lockState, D)
          .then((owned) => {
            if (stopped) {
              if (owned) releaseSchedulerLock(lockState, D);
              return;
            }
            if (owned) {
              if (((holdsLock = !0), lockProbeTimer))
                (clearInterval(lockProbeTimer), (lockProbeTimer = null));
            }
          })
          .catch((C) => logForDebugging(String(C), { level: "error" }));
      }, LOCK_PROBE_INTERVAL_MS)),
        lockProbeTimer.unref?.());
    load(!0).then(check);
    let path = getCronFilePath(dir);
    ((watcher = Fe(() =>
      chokidar.watch(path, {
        persistent: !1,
        ignoreInitial: !0,
        awaitWriteFinish: { stabilityThreshold: WATCH_DEBOUNCE_MS },
        ignorePermissionErrors: !0,
      }),
    )),
      (checkTimer = setInterval(check, CHECK_INTERVAL_MS)),
      checkTimer.unref?.());
  }
  function Fe(en) {
    let c = en();
    c.on("error", (T) => logForDebugging(`[ScheduledTasks] watcher error: ${T}`, { level: "warn" }));
    let C = () => {
      if (stopped || watcher !== c) return;
      ((watcher = Fe(en)),
        watcher.once("ready", () => void load(!1)),
        c
          .close()
          .catch((T) => logForDebugging(`[ScheduledTasks] watcher close failed: ${T}`, { level: "warn" })));
    };
    return (
      c.on("add", C),
      c.on("change", C),
      c.on("unlink", () => {
        if (!stopped) {
          fileTasks = [];
          let T = new Set(extraTasks.map((x) => x.id));
          if (dir === void 0) for (let x of getSessionCronTasks()) T.add(x.id);
          for (let x of nextFireAt.keys()) if (!T.has(x)) nextFireAt.delete(x);
        }
      }),
      c
    );
  }
  return {
    start() {
      if (((stopped = !1), enablePoll?.(), (enablePoll = null), dir !== void 0)) {
        (logForDebugging(
          `[ScheduledTasks] scheduler start() \u2014 dir=${dir}, hasTasks=${hasCronTasksSync(dir)}`,
        ),
          enable());
        return;
      }
      if (
        (logForDebugging(
          `[ScheduledTasks] scheduler start() \u2014 enabled=${getScheduledTasksEnabled()}, hasTasks=${hasCronTasksSync()}`,
        ),
        ownSessionIds.add(getSessionId()),
        (ne ??= onSessionSwitch((r) => {
          ownSessionIds.add(r);
        })),
        !getScheduledTasksEnabled() && (assistantMode || getExtraTasks !== void 0 || hasCronTasksSync()))
      )
        setScheduledTasksEnabled(!0);
      if (getScheduledTasksEnabled()) {
        enable();
        return;
      }
      enablePoll = onScheduledTasksEnabled(() => void enable());
    },
    stop() {
      if (((stopped = !0), enablePoll?.(), (enablePoll = null), ne?.(), (ne = null), checkTimer))
        (clearInterval(checkTimer), (checkTimer = null));
      if (lockProbeTimer) (clearInterval(lockProbeTimer), (lockProbeTimer = null));
      if ((watcher?.close(), (watcher = null), holdsLock))
        ((holdsLock = !1), releaseSchedulerLock(lockState, D));
    },
    getNextFireTime() {
      let r = 1 / 0;
      for (let c of nextFireAt.values()) if (c < r) r = c;
      return r === 1 / 0 ? null : r;
    },
    checkNow() {
      check();
    },
  };
}
/**
 * 生成错过的一次性任务提示：说明已从文件删除，要求先用 AskUserQuestion 确认再执行，并列出每个任务的时间描述与提示词。
 */
//@ chunk-hnzqng4j.js:12204-12727 facade-exports = buildMissedTaskNotification (0.806)
function buildMissedTaskNotification(missed) {
  let s = missed.length > 1,
    i = `The following one-shot scheduled task${s ? "s were" : " was"} missed while Claude was not running. ${s ? "They have" : "It has"} already been removed from .claude/scheduled_tasks.json.

Do NOT execute ${s ? "these prompts" : "this prompt"} yet. First use the AskUserQuestion tool to ask whether to run ${s ? "each one" : "it"} now. Only execute if the user confirms.`,
    blocks = missed.map(
      (w) => `${`[${cronToHuman(w.cron)}, created ${new Date(w.createdAt).toLocaleString()}]`}
${fenceCodeBlock(w.prompt)}`,
    );
  return `${i}

${blocks.join(`

`)}`;
}
//@ chunk-hnzqng4j.js:12727-12919 sole-consumer
function toReportableTaskError(n, s) {
  let i = () =>
    withTelemetryMessage(
      Error("scheduled task handler threw (message not reported: it may contain user text)", { cause: n }),
      s,
    );
  try {
    let y = withTelemetryMessage(toError(n), s);
    return getTelemetryMessage(y) === s ? y : i();
  } catch {
    return i();
  }
}

export { createCronScheduler, buildMissedTaskNotification };

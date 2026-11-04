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
import { join } from "path";
import {
  getProjectDir,
  validateUuid,
  normalizePathForCwdCompare,
  slugCollisionGuardFoldsCase,
} from "./sessionStoragePortable.js";
import { getFsImplementation } from "./fsOperations.js";
import { getErrnoCode, withTelemetryMessage, toError, getTelemetryMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { identity } from "./identity.js";
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
import { joinSanitizedMarkNames, sanitizeMarkName } from "./startupMarks.js";
import { logError } from "./log.js";
import { releaseSchedulerLock, tryAcquireSchedulerLock } from "./cronTasksLock.js";
import { shortHash } from "./shortHash.js";
import { cronToHuman } from "./cron.js";
import { fenceCodeBlock } from "./stringUtils.js";

//@ chunk-hnzqng4j.js:4668-4815 sole-consumer
/**
 * 调度锁持有状态：退出清理注册与"被谁占用"的最后记录。
 */
class SchedulerLockState {
  unregisterCleanup = undefined;
  lastBlockedBy = undefined;
  reset() {
    this.unregisterCleanup?.();
    this.unregisterCleanup = undefined;
    this.lastBlockedBy = undefined;
  }
}
//@ chunk-hnzqng4j.js:4815-4876 affinity
/**
 * 依赖模块与常量：检查间隔 1000ms、文件监听去抖 300ms、锁探测间隔 5000ms。
 */
var loopSentinelModule = require("./loop/LOOP_FILE_DYNAMIC_SENTINEL.lazy.js");
var CHECK_INTERVAL_MS = 1000;
var WATCH_DEBOUNCE_MS = 300;
var LOCK_PROBE_INTERVAL_MS = 5000;
//@ chunk-hnzqng4j.js:4876-4973 fingerprint = isRecurringTaskAged (1)
/**
 * 循环任务是否已超过最长存活时间（permanent 除外，maxAge 为 0 表示不限）。
 */
function isRecurringTaskAged(task, nowMs, maxAgeMs) {
  if (maxAgeMs === 0) return false;
  return Boolean(task.recurring && !task.permanent && nowMs - task.createdAt >= maxAgeMs);
}
//@ chunk-hnzqng4j.js:4973-5640 layout
/**
 * 找出 scheduled_tasks.json 中由其他会话创建、且本项目目录下确实有其 transcript 的会话集合（用来判断是否由本项目接管这些任务）。
 */
async function findKnownCreatorSessions(tasks, selfSessionId, projectDir) {
  let projectDir_2 = getProjectDir(projectDir);
  let fsImplementation = getFsImplementation();
  let knownSessions = new Set();
  let creatorSessions = new Set();
  for (let { createdBySessionId } of tasks)
    if (createdBySessionId !== undefined && createdBySessionId !== selfSessionId)
      creatorSessions.add(createdBySessionId);
  await Promise.all(
    Array.from(creatorSessions, async (sessionId) => {
      if (validateUuid(sessionId) === null) return;
      if (
        await fsImplementation.lstat(join(projectDir_2, `${sessionId}.jsonl`)).then(
          (stats) => stats.isFile(),
          (error) => {
            let errnoCode = getErrnoCode(error);
            if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
              logForDebugging(
                `[ScheduledTasks] could not look for a transcript of task creator ${sessionId} (${errnoCode}); treating it as not found`,
              );
            return false;
          },
        )
      )
        knownSessions.add(sessionId);
    }),
  );
  if (knownSessions.size < creatorSessions.size)
    logForDebugging(
      `[ScheduledTasks] found no transcript in ${projectDir_2} for ${creatorSessions.size - knownSessions.size} other session(s) named in scheduled_tasks.json (a file copied from another checkout looks like this); this session will not run their tasks`,
    );
  return knownSessions;
}
//@ chunk-hnzqng4j.js:5640-5674 layout
/**
 * 本进程已"交给处理器保留"的任务键集合（dir + id）。
 */
var keptBackTaskKeys = identity(new Set(), (set) => set.clear());
//@ chunk-hnzqng4j.js:5674-5716 layout
function taskKey(dir, taskId) {
  return `${dir ?? ""}\x00${taskId}`;
}
//@ chunk-hnzqng4j.js:5716-12204 facade-exports = createCronScheduler (0.654)
/**
 * 创建调度器：start 时（已启用或有任务时开启定时任务功能）抢调度锁、加载任务、每秒 check；check 对每个可归属本会话的任务计算带抖动的下次时间，到点调用 onFire/onFireTask，
 * 循环任务重排（超龄则最后一次后删除）、一次性任务删除、持久化 lastFiredAt；首次加载时把错过的一次性任务交给 onMissed 或生成提示。返回 {start, stop, getNextFireTime, checkNow}。
 */
function createCronScheduler(options) {
  let {
    onFire,
    isLoading,
    assistantMode = false,
    onFireTask,
    onMissed,
    dir,
    lockIdentity,
    getJitterConfig,
    isKilled,
    filter,
    getExtraTasks,
    leaseFileTasks = () => true,
  } = options;
  let options_2 =
    dir || lockIdentity
      ? {
          dir,
          lockIdentity,
        }
      : undefined;
  let lockState = new SchedulerLockState();
  let lockSessionId = dir !== undefined ? lockIdentity : getSessionId();
  let ownSessionIds = new Set();
  let unsubscribeSessionSwitch = null;
  let fileTasks = [];
  let extraTasks = [];
  let nextFireAt = new Map();
  let missedAsked = new Set();
  let inFlight = new Set();
  let enablePoll = null;
  let checkTimer = null;
  let lockProbeTimer = null;
  let watcher = null;
  let stopped = false;
  let holdsLock = false;
  let knownCreatorSessions = new Set();
  let projectKey = "";
  let pidTokenCache = new Map();
  function isCreatorProcessGone(createdByPid, createdByProcStart) {
    if (!isProcessRunning(createdByPid)) {
      pidTokenCache.delete(createdByPid);
      return true;
    }
    if (createdByProcStart === undefined) return false;
    let now = Date.now();
    let pidTokenEntry = pidTokenCache.get(createdByPid);
    if (!pidTokenEntry || now - pidTokenEntry.at >= 60000) {
      pidTokenEntry = {
        at: now,
        token: getProcessStartTime(createdByPid),
      };
      pidTokenCache.set(createdByPid, pidTokenEntry);
    }
    return pidTokenEntry.token !== undefined && pidTokenEntry.token !== createdByProcStart;
  }
  function normalizePath(path) {
    return normalizePathForCwdCompare(path, slugCollisionGuardFoldsCase());
  }
  function isFromThisProject(task) {
    if (task.createdInProject !== undefined) return normalizePath(task.createdInProject) === projectKey;
    return task.createdBySessionId !== undefined && knownCreatorSessions.has(task.createdBySessionId);
  }
  function isOwnedByThisSession(task) {
    if (task.createdBySessionId === undefined) return holdsLock;
    if (task.createdBySessionId === lockSessionId) return true;
    if (
      ownSessionIds.has(task.createdBySessionId) &&
      task.createdByPid === process.pid &&
      (task.createdByProcStart === undefined
        ? task.createdAt >= performance.timeOrigin
        : task.createdByProcStart === ownProcStartMemo.token)
    )
      return true;
    return (
      holdsLock &&
      isFromThisProject(task) &&
      (task.createdByPid === undefined || isCreatorProcessGone(task.createdByPid, task.createdByProcStart))
    );
  }
  function removeTasks(tasksToRemove) {
    if (tasksToRemove.length === 0) return;
    removeCronTasks(
      tasksToRemove.map((task) => task.id),
      dir,
    ).catch((error) => logForDebugging(`[ScheduledTasks] failed to remove tasks: ${error}`));
  }
  async function load(initial) {
    let tasks = isCronFileIgnored(dir) ? [] : await readCronTasks(dir);
    let extraTasks_2 = getExtraTasks
      ? await getExtraTasks().catch((error) => {
          if (claimOnce().claim("cron_extra_tasks_load_bad"))
            logFeatureBad("routine_register_trigger", "extra_tasks_load_failed");
          logForDebugging(`[ScheduledTasks] getExtraTasks failed: ${error}`);
          return [];
        })
      : [];
    let projectDir = dir ?? getProjectRoot();
    let knownCreatorSessions_2 = await findKnownCreatorSessions(
      tasks.filter((task) => task.createdInProject === undefined),
      lockSessionId,
      projectDir,
    );
    if (stopped) return;
    fileTasks = tasks;
    extraTasks = extraTasks_2;
    knownCreatorSessions = knownCreatorSessions_2;
    projectKey = normalizePath(projectDir);
    if (!initial) return;
    let sawChange = false;
    for (let task of tasks)
      if (
        lockSessionId !== undefined &&
        task.createdBySessionId === lockSessionId &&
        task.createdByPid !== process.pid
      ) {
        task.createdByPid = process.pid;
        task.createdByProcStart = ownProcStart();
        sawChange = true;
      }
    if (sawChange)
      await writeCronTasks(tasks, dir).catch((error) =>
        logForDebugging(`[ScheduledTasks] failed to refresh task pids: ${error}`),
      );
    let now = Date.now();
    let missed = findMissedTasks(tasks, now).filter(
      (t) =>
        !t.recurring &&
        !missedAsked.has(t.id) &&
        !keptBackTaskKeys.has(taskKey(dir, t.id)) &&
        (!filter || filter(t)) &&
        isOwnedByThisSession(t),
    );
    if (missed.length > 0) {
      for (let t of missed) {
        missedAsked.add(t.id);
        nextFireAt.set(t.id, 1 / 0);
      }
      logEvent("tengu_scheduled_task_missed", {
        count: missed.length,
        taskIds: joinSanitizedMarkNames(missed.map((t) => t.id)),
      });
      let keptBackIds = new Set();
      try {
        if (onMissed) {
          keptBackIds = new Set(onMissed(missed, removeTasks) ?? []);
          for (let taskId of keptBackIds) keptBackTaskKeys.add(taskKey(dir, taskId));
        } else onFire(buildMissedTaskNotification(missed));
      } catch (error) {
        logForDebugging(
          `[ScheduledTasks] could not surface ${missed.length} missed one-shot task(s); they stay in scheduled_tasks.json for a later session`,
          {
            level: "error",
          },
        );
        logError(
          toReportableTaskError(
            error,
            "handler for missed scheduled tasks threw (message not reported: it may contain user text)",
          ),
        );
        return;
      }
      removeTasks(missed.filter((e) => !keptBackIds.has(e.id)));
      logForDebugging(
        `[ScheduledTasks] surfaced ${missed.length - keptBackIds.size} missed one-shot task(s), kept back ${keptBackIds.size}`,
      );
    }
  }
  function check() {
    if (isKilled?.()) return;
    if (holdsLock && !leaseFileTasks()) {
      holdsLock = false;
      releaseSchedulerLock(lockState, options_2);
    }
    if (isLoading() && !assistantMode) return;
    let now = Date.now();
    let seen = new Set();
    let firedFileRecurring = [];
    let jitterCfg = getJitterConfig?.() ?? DEFAULT_CRON_JITTER_CONFIG;
    function armTask(t, isSession) {
      if (filter && !filter(t)) return;
      seen.add(t.id);
      if (inFlight.has(t.id)) return;
      if (!isSession && keptBackTaskKeys.has(taskKey(dir, t.id))) return;
      let next = nextFireAt.get(t.id);
      if (next === undefined) {
        let nextFireAt_2 = nextFireTimeForTask(t, jitterCfg);
        if (nextFireAt_2 === null)
          logFeatureBad("cron_task_fire", "next_fire_unresolvable", {
            recurring: t.recurring ?? false,
          });
        next = nextFireAt_2 ?? 1 / 0;
        nextFireAt.set(t.id, next);
        logForDebugging(
          `[ScheduledTasks] scheduled ${t.id} for ${next === 1 / 0 ? "never" : new Date(next).toISOString()}`,
        );
      }
      if (now < next) return;
      logForDebugging(`[ScheduledTasks] firing ${t.id}${t.recurring ? " (recurring)" : ""}`);
      let taskId = t.id.startsWith("routine:") ? shortHash(t.id) : sanitizeMarkName(t.id);
      logEvent("tengu_scheduled_task_fire", {
        recurring: t.recurring ?? false,
        taskId,
        autonomousLoopDefault: loopSentinelModule.isLoopDefaultSentinel(t.prompt),
      });
      let taskFlags = {
        recurring: t.recurring ?? false,
        permanent: t.permanent ?? false,
      };
      let fired = false;
      try {
        if (onFireTask) fired = onFireTask(t, () => removeTasks([t])) === true;
        else onFire(t.prompt);
        logFeatureOk("cron_task_fire", taskFlags);
      } catch (error) {
        let isOneShot = !isSession && !t.recurring;
        if (isOneShot) nextFireAt.set(t.id, 1 / 0);
        logForDebugging(
          isOneShot
            ? `[ScheduledTasks] delivering task ${t.id} failed (its handler threw); the task stays in scheduled_tasks.json for a later session`
            : `[ScheduledTasks] delivering task ${t.id} failed (its handler threw); this run is dropped and will not be retried`,
          {
            level: "error",
          },
        );
        logFeatureBad("cron_task_fire", "handler_threw", taskFlags);
        logError(
          toReportableTaskError(
            error,
            "scheduled task fire handler threw (message not reported: it may contain user text)",
          ),
        );
        if (isOneShot) return;
      }
      let aged = isRecurringTaskAged(t, now, jitterCfg.recurringMaxAgeMs);
      if (aged) {
        let ageHours = Math.floor((now - t.createdAt) / 1000 / 60 / 60);
        logForDebugging(
          `[ScheduledTasks] recurring task ${t.id} aged out (${ageHours}h since creation), deleting after final fire`,
        );
        logEvent("tengu_scheduled_task_expired", {
          taskId,
          ageHours,
        });
      }
      if (t.recurring && !aged) {
        let jitteredNext = jitteredNextCronRunMs(t.cron, now, t.id, jitterCfg);
        if (jitteredNext === null) logFeatureSad("cron_task_fire", "reschedule_unresolvable");
        let nextAt = jitteredNext ?? 1 / 0;
        nextFireAt.set(t.id, nextAt);
        if (!isSession) firedFileRecurring.push(t.id);
      } else if (isSession) {
        removeSessionCronTasks([t.id]);
        nextFireAt.delete(t.id);
      } else if (fired) {
        keptBackTaskKeys.add(taskKey(dir, t.id));
        nextFireAt.set(t.id, 1 / 0);
      } else {
        inFlight.add(t.id);
        nextFireAt.set(t.id, 1 / 0);
        removeCronTasks([t.id], dir)
          .catch((e) => logForDebugging(`[ScheduledTasks] failed to remove task ${t.id}: ${e}`))
          .finally(() => inFlight.delete(t.id));
      }
    }
    for (let t of fileTasks) if (isOwnedByThisSession(t)) armTask(t, false);
    if (firedFileRecurring.length > 0) {
      for (let id of firedFileRecurring) inFlight.add(id);
      markCronTasksFired(firedFileRecurring, now, dir)
        .catch((error) => logForDebugging(`[ScheduledTasks] failed to persist lastFiredAt: ${error}`))
        .finally(() => {
          for (let id of firedFileRecurring) inFlight.delete(id);
        });
    }
    if (dir === undefined)
      for (let sessionTask of getSessionCronTasks().slice()) {
        armTask(sessionTask, true);
        let scheduledAt = nextFireAt.get(sessionTask.id);
        sessionTask.nextFireAt = scheduledAt === 1 / 0 ? undefined : scheduledAt;
      }
    for (let extraTask of extraTasks) armTask(extraTask, true);
    if (seen.size === 0) {
      nextFireAt.clear();
      return;
    }
    for (let id of nextFireAt.keys()) if (!seen.has(id)) nextFireAt.delete(id);
  }
  async function enable() {
    if (stopped) return;
    enablePoll?.();
    enablePoll = null;
    let { default: chokidar } = await import("../../vendor/chokidar/default.lazy.js");
    if (stopped) return;
    holdsLock = leaseFileTasks()
      ? await tryAcquireSchedulerLock(lockState, options_2).catch(() => false)
      : false;
    if (stopped) {
      if (holdsLock) {
        holdsLock = false;
        releaseSchedulerLock(lockState, options_2);
      }
      return;
    }
    if (!holdsLock) {
      lockProbeTimer = setInterval(() => {
        if (!leaseFileTasks()) return;
        tryAcquireSchedulerLock(lockState, options_2)
          .then((owned) => {
            if (stopped) {
              if (owned) releaseSchedulerLock(lockState, options_2);
              return;
            }
            if (owned) {
              holdsLock = true;
              if (lockProbeTimer) {
                clearInterval(lockProbeTimer);
                lockProbeTimer = null;
              }
            }
          })
          .catch((e) =>
            logForDebugging(String(e), {
              level: "error",
            }),
          );
      }, LOCK_PROBE_INTERVAL_MS);
      lockProbeTimer.unref?.();
    }
    load(true).then(check);
    let path = getCronFilePath(dir);
    watcher = watch(() =>
      chokidar.watch(path, {
        persistent: false,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: WATCH_DEBOUNCE_MS,
        },
        ignorePermissionErrors: true,
      }),
    );
    checkTimer = setInterval(check, CHECK_INTERVAL_MS);
    checkTimer.unref?.();
  }
  function watch(en) {
    let watcher_2 = en();
    watcher_2.on("error", (error) =>
      logForDebugging(`[ScheduledTasks] watcher error: ${error}`, {
        level: "warn",
      }),
    );
    let onFileChange = () => {
      if (stopped || watcher !== watcher_2) return;
      watcher = watch(en);
      watcher.once("ready", () => void load(false));
      watcher_2.close().catch((error) =>
        logForDebugging(`[ScheduledTasks] watcher close failed: ${error}`, {
          level: "warn",
        }),
      );
    };
    watcher_2.on("add", onFileChange);
    watcher_2.on("change", onFileChange);
    watcher_2.on("unlink", () => {
      if (!stopped) {
        fileTasks = [];
        let knownIds = new Set(extraTasks.map((extraTask) => extraTask.id));
        if (dir === undefined) for (let task of getSessionCronTasks()) knownIds.add(task.id);
        for (let key of nextFireAt.keys()) if (!knownIds.has(key)) nextFireAt.delete(key);
      }
    });
    return watcher_2;
  }
  return {
    start() {
      stopped = false;
      enablePoll?.();
      enablePoll = null;
      if (dir !== undefined) {
        logForDebugging(
          `[ScheduledTasks] scheduler start() \u2014 dir=${dir}, hasTasks=${hasCronTasksSync(dir)}`,
        );
        enable();
        return;
      }
      logForDebugging(
        `[ScheduledTasks] scheduler start() \u2014 enabled=${getScheduledTasksEnabled()}, hasTasks=${hasCronTasksSync()}`,
      );
      ownSessionIds.add(getSessionId());
      unsubscribeSessionSwitch ??= onSessionSwitch((nextSessionId) => {
        ownSessionIds.add(nextSessionId);
      });
      if (!getScheduledTasksEnabled() && (assistantMode || getExtraTasks !== undefined || hasCronTasksSync()))
        setScheduledTasksEnabled(true);
      if (getScheduledTasksEnabled()) {
        enable();
        return;
      }
      enablePoll = onScheduledTasksEnabled(() => void enable());
    },
    stop() {
      stopped = true;
      enablePoll?.();
      enablePoll = null;
      unsubscribeSessionSwitch?.();
      unsubscribeSessionSwitch = null;
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
      }
      if (lockProbeTimer) {
        clearInterval(lockProbeTimer);
        lockProbeTimer = null;
      }
      watcher?.close();
      watcher = null;
      if (holdsLock) {
        holdsLock = false;
        releaseSchedulerLock(lockState, options_2);
      }
    },
    getNextFireTime() {
      let min = 1 / 0;
      for (let t of nextFireAt.values()) if (t < min) min = t;
      return min === 1 / 0 ? null : min;
    },
    checkNow() {
      check();
    },
  };
}
//@ chunk-hnzqng4j.js:12204-12727 facade-exports = buildMissedTaskNotification (0.806)
/**
 * 生成错过的一次性任务提示：说明已从文件删除，要求先用 AskUserQuestion 确认再执行，并列出每个任务的时间描述与提示词。
 */
function buildMissedTaskNotification(missed) {
  let plural = missed.length > 1;
  let header = `The following one-shot scheduled task${plural ? "s were" : " was"} missed while Claude was not running. ${plural ? "They have" : "It has"} already been removed from .claude/scheduled_tasks.json.

Do NOT execute ${plural ? "these prompts" : "this prompt"} yet. First use the AskUserQuestion tool to ask whether to run ${plural ? "each one" : "it"} now. Only execute if the user confirms.`;
  let blocks = missed.map(
    (t) => `${`[${cronToHuman(t.cron)}, created ${new Date(t.createdAt).toLocaleString()}]`}
${fenceCodeBlock(t.prompt)}`,
  );
  return `${header}

${blocks.join(`

`)}`;
}
//@ chunk-hnzqng4j.js:12727-12919 sole-consumer
function toReportableTaskError(error, taskId) {
  let buildError = () =>
    withTelemetryMessage(
      Error("scheduled task handler threw (message not reported: it may contain user text)", {
        cause: error,
      }),
      taskId,
    );
  try {
    let tagged = withTelemetryMessage(toError(error), taskId);
    return getTelemetryMessage(tagged) === taskId ? tagged : buildError();
  } catch {
    return buildError();
  }
}
export { createCronScheduler, buildMissedTaskNotification };

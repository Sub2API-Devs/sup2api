/**
 * tasks/DreamTask/DreamTask.ts
 *
 * "做梦"任务（autoDream 记忆整理）的状态：注册、追加回合、完成/失败/被杀，以及 kill 时释放整理锁
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/DreamTask/DreamTask.ts
 * pieces: chunk-kxyd0g16.js (1), chunk-m8444q1d.js (1), chunk-rsht1tdj.js (5)
 * attribution: fingerprint 6, affinity 1
 */
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { rollbackConsolidationLockDefault } from "../../services/autoDream/consolidationLock.js";

//@ chunk-rsht1tdj.js:6613-6623 affinity
/**
 * DreamTask 最多保留的回合数（30）。
 */
var MAX_DREAM_TURNS = 30;
//@ chunk-rsht1tdj.js:6623-6704 fingerprint (2.1.88 match: isDreamTask, 1)
function isDreamTask(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "dream";
}
//@ chunk-rsht1tdj.js:6704-7029 fingerprint (2.1.88 match: registerDreamTask, 0.939)
/**
 * 注册一个 dream 任务（status=running、phase=starting、skipTranscript），记录正在回顾的会话数、abortController 和整理锁的原 mtime。
 */
function registerDreamTask(taskRegistry, options) {
  let id = generateTaskId("dream");
  let taskState = {
    ...createTaskStateBase(id, "dream", "dreaming"),
    type: "dream",
    status: "running",
    skipTranscript: true,
    phase: "starting",
    sessionsReviewing: options.sessionsReviewing,
    filesTouched: [],
    turns: [],
    abortController: options.abortController,
    priorMtime: options.priorMtime,
    ...(options.storageV5 !== undefined && {
      storageV5: options.storageV5,
    }),
  };
  taskRegistry.register(taskState);
  return id;
}
//@ chunk-rsht1tdj.js:7029-7346 fingerprint (2.1.88 match: addDreamTurn, 0.953)
/**
 * 追加一个 dream 回合并去重记录新触及的文件；有新文件时 phase 变 updating；空回合忽略；只保留最近 MAX_DREAM_TURNS 个回合。
 */
function addDreamTurn(taskId, turn, touchedPaths, taskRegistry) {
  taskRegistry.update(taskId, (task) => {
    let seen = new Set(task.filesTouched);
    let newTouched = touchedPaths.filter((touchedPath) => !seen.has(touchedPath) && seen.add(touchedPath));
    if (turn.text === "" && turn.toolUseCount === 0 && newTouched.length === 0) return task;
    return {
      ...task,
      phase: newTouched.length > 0 ? "updating" : task.phase,
      filesTouched: newTouched.length > 0 ? [...task.filesTouched, ...newTouched] : task.filesTouched,
      turns: task.turns.slice(-(MAX_DREAM_TURNS - 1)).concat(turn),
    };
  });
}
//@ chunk-rsht1tdj.js:7346-7527 fingerprint (2.1.88 match: completeDreamTask, 0.597)
/**
 * 把 dream 任务标为 completed（notified=true），记 task_dream 计数，并发一个 ambient 的完成通知（不进 transcript）。
 */
function completeDreamTask(taskId, taskRegistry) {
  taskRegistry.update(taskId, (task) => ({
    ...task,
    status: "completed",
    endTime: Date.now(),
    notified: true,
    abortController: undefined,
  }));
  logFeatureOk("task_dream");
  emitTaskNotification(taskId, "completed", {
    skipTranscript: true,
    ambient: true,
  });
}
//@ chunk-kxyd0g16.js:16649-16982 fingerprint (2.1.88 match: DreamTask, 0.854)
/**
 * DreamTask 任务实现：kill 时中止运行中的整理、标 killed，并用原 mtime 回滚整理锁（XNt）。
 */
var DreamTask = {
  name: "DreamTask",
  type: "dream",
  async kill(taskId, taskRegistry) {
    let priorMtime;
    let storageV5;
    taskRegistry.update(taskId, (task) => {
      if (task.status !== "running") return task;
      task.abortController?.abort();
      priorMtime = task.priorMtime;
      storageV5 = task.storageV5;
      return {
        ...task,
        status: "killed",
        endTime: Date.now(),
        notified: true,
        abortController: undefined,
      };
    });
    if (priorMtime !== undefined) {
      emitTaskNotification(taskId, "stopped", {
        skipTranscript: true,
        ambient: true,
      });
      await rollbackConsolidationLockDefault(priorMtime, storageV5);
    }
  },
};
//@ chunk-m8444q1d.js:15399-15604 fingerprint (2.1.88 match: failDreamTask, 0.559)
/**
 * 把运行中的 dream 任务置为给定终态（failed 等）并发 ambient 通知。
 */
function failDreamTask(taskId, taskRegistry, status) {
  let didFail = false;
  taskRegistry.update(taskId, (task) => {
    if (task.status !== "running") return task;
    didFail = true;
    return {
      ...task,
      status,
      endTime: Date.now(),
      notified: true,
      abortController: undefined,
    };
  });
  if (didFail)
    emitTaskNotification(taskId, status, {
      skipTranscript: true,
      ambient: true,
    });
}
export { DreamTask, failDreamTask, registerDreamTask, completeDreamTask, isDreamTask, addDreamTurn };

/**
 * tasks/DreamTask/DreamTask.ts
 *
 * "做梦"任务（autoDream 记忆整理）的状态：注册、追加回合、完成/失败/被杀，以及 kill 时释放整理锁
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/DreamTask/DreamTask.ts
 * pieces: chunk-arvn22xd.js (5), chunk-fmnbrxwy.js (1)
 * attribution: affinity 1, fingerprint 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { rollbackConsolidationLockDefault } from "../../services/autoDream/consolidationLock.js";

//@ chunk-arvn22xd.js:6613-6623 affinity
/**
 * DreamTask 最多保留的回合数（30）。
 */
var MAX_DREAM_TURNS = 30;
//@ chunk-arvn22xd.js:6623-6704 fingerprint (2.1.88 match: isDreamTask, 1)
function isDreamTask(task) {
  return typeof task === "object" && task !== null && "type" in task && task.type === "dream";
}
//@ chunk-arvn22xd.js:6704-7029 fingerprint (2.1.88 match: registerDreamTask, 0.936)
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
//@ chunk-arvn22xd.js:7029-7346 fingerprint (2.1.88 match: addDreamTurn, 0.953)
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
//@ chunk-arvn22xd.js:7346-7527 fingerprint (2.1.88 match: completeDreamTask, 0.549)
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
//@ chunk-fmnbrxwy.js:30492-30825 fingerprint (2.1.88 match: DreamTask, 0.846)
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
export { registerDreamTask, completeDreamTask, isDreamTask, addDreamTurn, DreamTask };

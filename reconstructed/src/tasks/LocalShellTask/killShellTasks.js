/**
 * tasks/LocalShellTask/killShellTasks.ts
 *
 * 杀 shell 任务：单个 kill、按属主代理批量清理孤儿 shell
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/LocalShellTask/killShellTasks.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: fingerprint 2
 */
import { isLocalShellTask } from "./guards.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { appendTaskOutputTrailer, getTaskOutputPath, evictTaskOutput } from "../../utils/task/diskOutput.js";
import { emitTaskNotification, getTaskRunState } from "../../utils/task/taskNotifications.js";
import { L0e } from "../../plugins/functionHooks/inputHold.js";
import { buildShellTaskResult } from "./backgroundNotices.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";

/**
 * 杀掉运行中的 shell 任务：kill 并清理 shellCommand、标 killed/notified；之前未通知则发 stopped 通知，并（开启时）记录 bash 任务快照；最后回收输出。
 */
//@ chunk-e6aww6q8.js:2141025-2141937 fingerprint = killTask (0.607)
function killTask(taskId, taskRegistry, killOptions) {
  let snapshot,
    wasNotified = !1;
  if (
    (taskRegistry.update(taskId, (task) => {
      if (task.status !== "running" || !isLocalShellTask(task)) return task;
      try {
        (logForDebugging(`LocalShellTask ${taskId} kill requested`),
          task.shellCommand?.kill(killOptions),
          task.shellCommand?.cleanup());
      } catch (error) {
        logError(error);
      }
      return (
        (wasNotified = task.notified),
        (snapshot = {
          toolUseId: task.toolUseId,
          description: task.description,
          isAdopted: task.isAdopted === !0,
          outputFileElsewhere: task.elsewhere ? task.outputFile : void 0,
          startTime: task.startTime,
          agentId: task.agentId,
          kind: task.kind,
        }),
        { ...task, status: "killed", notified: !0, shellCommand: null, endTime: Date.now() }
      );
    }),
    snapshot && !wasNotified)
  ) {
    if (!snapshot.isAdopted && snapshot.outputFileElsewhere === void 0)
      appendTaskOutputTrailer(taskId, "killed");
    emitTaskNotification(taskId, "stopped", {
      toolUseId: snapshot.toolUseId,
      summary: snapshot.description,
      outputFile: snapshot.outputFileElsewhere ?? getTaskOutputPath(taskId),
    });
  }
  if (snapshot && !wasNotified && snapshot.kind !== "monitor" && L0e())
    getTaskRunState().rememberBashTaskSnapshot(
      taskId,
      buildShellTaskResult({
        taskId: taskId,
        outcome: "killed",
        exitCode: void 0,
        startTime: snapshot.startTime,
        endTime: Date.now(),
        outputFile:
          snapshot.outputFileElsewhere !== void 0
            ? escapeXml(snapshot.outputFileElsewhere)
            : getTaskOutputPath(taskId),
        output: void 0,
      }),
      snapshot.agentId,
    );
  evictTaskOutput(taskId);
}
/**
 * 代理退出时杀掉它名下仍在运行的 shell 任务（cause=owner_ended）。
 */
//@ chunk-e6aww6q8.js:2141937-2142159 fingerprint = killShellTasksForAgent (0.685)
function killShellTasksForAgent(agentId, taskRegistry) {
  for (let [r, s] of Object.entries(taskRegistry.all()))
    if (isLocalShellTask(s) && s.agentId === agentId && s.status === "running")
      (logForDebugging(
        `killRunningShellTasksOwnedBy: killing orphaned shell task ${r} (agent ${agentId} exiting)`,
      ),
        killTask(r, taskRegistry, { cause: "owner_ended" }));
}

export { killShellTasksForAgent, killTask };

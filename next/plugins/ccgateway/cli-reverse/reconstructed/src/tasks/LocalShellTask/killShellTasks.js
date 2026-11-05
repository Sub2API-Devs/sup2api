/**
 * tasks/LocalShellTask/killShellTasks.ts
 *
 * 杀 shell 任务：单个 kill、按属主代理批量清理孤儿 shell
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/LocalShellTask/killShellTasks.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isLocalShellTask } from "./guards.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { appendTaskOutputTrailer, getTaskOutputPath, evictTaskOutput } from "../../utils/task/diskOutput.js";
import { emitTaskNotification, getTaskRunState } from "../../utils/task/taskNotifications.js";
import { isInputHoldOn } from "../../plugins/functionHooks/inputHold.js";
import { buildShellTaskResult } from "./backgroundNotices.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";

//@ chunk-5xgkngpb.js:2194407-2195319 fingerprint (2.1.88 match: killTask, 0.618)
/**
 * 杀掉运行中的 shell 任务：kill 并清理 shellCommand、标 killed/notified；之前未通知则发 stopped 通知，并（开启时）记录 bash 任务快照；最后回收输出。
 */
function killTask(taskId, taskRegistry, killOptions) {
  let snapshot;
  let wasNotified = false;
  taskRegistry.update(taskId, (task) => {
    if (task.status !== "running" || !isLocalShellTask(task)) return task;
    try {
      logForDebugging(`LocalShellTask ${taskId} kill requested`);
      task.shellCommand?.kill(killOptions);
      task.shellCommand?.cleanup();
    } catch (error) {
      logError(error);
    }
    wasNotified = task.notified;
    snapshot = {
      toolUseId: task.toolUseId,
      description: task.description,
      isAdopted: task.isAdopted === true,
      outputFileElsewhere: task.elsewhere ? task.outputFile : undefined,
      startTime: task.startTime,
      agentId: task.agentId,
      kind: task.kind,
    };
    return {
      ...task,
      status: "killed",
      notified: true,
      shellCommand: null,
      endTime: Date.now(),
    };
  });
  if (snapshot && !wasNotified) {
    if (!snapshot.isAdopted && snapshot.outputFileElsewhere === undefined)
      appendTaskOutputTrailer(taskId, "killed");
    emitTaskNotification(taskId, "stopped", {
      toolUseId: snapshot.toolUseId,
      summary: snapshot.description,
      outputFile: snapshot.outputFileElsewhere ?? getTaskOutputPath(taskId),
    });
  }
  if (snapshot && !wasNotified && snapshot.kind !== "monitor" && isInputHoldOn())
    getTaskRunState().rememberBashTaskSnapshot(
      taskId,
      buildShellTaskResult({
        taskId,
        outcome: "killed",
        exitCode: undefined,
        startTime: snapshot.startTime,
        endTime: Date.now(),
        outputFile:
          snapshot.outputFileElsewhere !== undefined
            ? escapeXml(snapshot.outputFileElsewhere)
            : getTaskOutputPath(taskId),
        output: undefined,
      }),
      snapshot.agentId,
    );
  evictTaskOutput(taskId);
}
//@ chunk-5xgkngpb.js:2195319-2195541 fingerprint (2.1.88 match: killShellTasksForAgent, 0.684)
/**
 * 代理退出时杀掉它名下仍在运行的 shell 任务（cause=owner_ended）。
 */
function killShellTasksForAgent(agentId, taskRegistry) {
  for (let [taskId, task] of Object.entries(taskRegistry.all()))
    if (isLocalShellTask(task) && task.agentId === agentId && task.status === "running") {
      logForDebugging(
        `killRunningShellTasksOwnedBy: killing orphaned shell task ${taskId} (agent ${agentId} exiting)`,
      );
      killTask(taskId, taskRegistry, {
        cause: "owner_ended",
      });
    }
}
export { killTask, killShellTasksForAgent };

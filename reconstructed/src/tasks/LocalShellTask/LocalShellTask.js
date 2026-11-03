/**
 * tasks/LocalShellTask/LocalShellTask.tsx
 *
 * 后台 shell 任务（local_bash，含 Monitor）：注册前台/后台、转后台、卡住检测、结束通知、输出收尾
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/LocalShellTask/LocalShellTask.tsx
 * pieces: chunk-e6aww6q8.js (31), chunk-fym4r1th.js (3), chunk-kxyd0g16.js (1)
 * attribution: fingerprint 8, placement 6, callgraph-fingerprint 3, layout 13, callgraph-witnessed 2, affinity 2, sole-consumer 1
 */
import {
  getTaskOutputPath,
  appendTaskOutputTrailer,
  evictTaskOutput,
  getVerifiedTaskOutputTail,
} from "../../utils/task/diskOutput.js";
import { DEFAULT_INSTRUCTIONS } from "../../commands/ultraplan.js";
import {
  enqueuePendingNotification,
  mg,
  hasQueuedTaskNotification,
} from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  claimTaskNotification,
  removeKeepaliveReason,
  enqueueTaskNotification,
} from "../../utils/task/framework.js";
import { getBackgroundDeadlineNote, L5o } from "../../tools/BashTool/prompt.js";
import { L0e } from "../../plugins/functionHooks/inputHold.js";
import { buildShellTaskResult, formatTaskOutputTail, MAX_TASK_OUTPUT_BYTES } from "./backgroundNotices.js";
import { getTaskRunState, emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { formatTaskTerminalSummary, isMainSessionTask } from "../LocalMainSessionTask.js";
import { addAgentKeepaliveReason } from "../taskKinds.js";
import { killTask } from "./killShellTasks.js";
import { isLocalShellTask } from "./guards.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { jK } from "../LocalAgentTask/keepalive.js";
import {
  isBackgroundedSubagent,
  hasCompletedWithFindings,
  moveAgentToBackground,
} from "../LocalAgentTask/LocalAgentTask.js";
import { createTaskStateBase } from "../../Task.js";
import { getCwd } from "../../utils/cwd.js";
import { m$o } from "../../services/pluginTest/claudeTestPlugin.js";
import { shouldKillShellForMemoryPressure } from "./memoryPressure.js";
import { Mr } from "../../utils/agentId.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { dVn } from "../../tools/BashTool/commandSemantics.js";
import { interpretPowerShellResult } from "../../tools/PowerShellTool/commandTelemetry.js";
import {
  classifyBackgroundCommand,
  INTERACTIVE_PROMPT_PATTERNS,
} from "../../tools/BashTool/bashTelemetry.js";
import { u2 } from "../taskLoopRegistry.js";
import { BACKGROUND_COMMAND_PREFIX } from "../../constants/xml.js";

/**
 * Monitor 任务结束文案：无输出结束 / stream ended / script failed / stopped。
 */
//@ chunk-e6aww6q8.js:4745578-4745856 fingerprint = enqueueShellNotification (0.511)
function formatMonitorTerminalSummary(description, status, exitCode, producedOutput) {
  let exitSuffix = exitCode !== void 0 ? ` (exit ${exitCode})` : "";
  switch (status) {
    case "completed":
      return producedOutput === !1
        ? `Monitor "${description}" ended without producing output${exitSuffix}`
        : `Monitor "${description}" stream ended`;
    case "failed":
      return `Monitor "${description}" script failed${exitSuffix}`;
    case "killed":
      return `Monitor "${description}" stopped`;
  }
}
/**
 * 为后台 shell 启动卡住检测：输出疑似停在交互式提示时，发一条带最后输出的 task-notification 提醒模型（monitor 不检测）。返回取消函数。
 */
//@ chunk-e6aww6q8.js:4746265-4746602 fingerprint = startStallWatchdog (0.339)
function startStallWatchdog(taskId, description, kind, toolUseId, agentId) {
  if (kind === "monitor") return () => {};
  let outputPath = getTaskOutputPath(taskId);
  return DEFAULT_INSTRUCTIONS(taskId, (lastOutput) => {
    (enqueuePendingNotification(
      {
        value: formatTaskNotification({
          taskId: taskId,
          toolUseId: toolUseId,
          outputFile: outputPath,
          summary: escapeXml(Ysi(description)),
          trailing: `
Last output:
${lastOutput}

${INTERACTIVE_PROMPT_HINT}`,
        }),
        mode: "task-notification",
        skipAttachments: !0,
        priority: "next",
        agentId: agentId ?? mainAgentId(),
      },
      { turnAttribution: "inherit" },
    ),
      logFeatureOk("task_local_shell_stall_detected"));
  });
}
//@ chunk-e6aww6q8.js:4746907-4747845 placement
function finishLocalShellTask({
  taskId: taskId,
  description: description,
  status: status,
  exitCode: exitCode,
  taskRegistry: taskRegistry,
  toolUseId: toolUseId,
  kind: kind = "bash",
  agentId: agentId,
  stdoutBytes: stdoutBytes,
  exitNote: exitNote,
  output: output,
  stopCause: stopCause,
}) {
  let { claimed: claimed, task: task } = claimTaskNotification(taskId, taskRegistry);
  if (!claimed) return;
  let we = stopCause === "deadline" ? getBackgroundDeadlineNote() : void 0,
    Ee =
      L0e() && kind !== "monitor"
        ? buildShellTaskResult({
            taskId: taskId,
            outcome: status,
            exitCode: task?.isAdopted ? void 0 : exitCode,
            startTime: task?.startTime ?? Date.now(),
            endTime: task?.endTime ?? Date.now(),
            outputFile: getTaskOutputPath(taskId),
            output: output,
            stopCause: stopCause,
            stopExplanation: we,
          })
        : void 0;
  if (Ee)
    ((getTaskRunState().withdrawShellNotification ??= consumeTaskNotifications),
      getTaskRunState().rememberBashTaskSnapshot(taskId, Ee, agentId));
  if (!task?.isAdopted)
    appendTaskOutputTrailer(taskId, status === "killed" ? "killed" : { exitCode: exitCode });
  if (status === "completed") logFeatureOk("task_local_shell");
  else if (status === "failed") logFeatureBad("task_local_shell", "task_local_shell_failed");
  let Ae = formatTaskTerminalSummary(kind, description, status, exitCode, stdoutBytes, exitNote, stopCause),
    Ie = getTaskOutputPath(taskId);
  if (agentId !== void 0)
    emitTaskNotification(taskId, status === "killed" ? "stopped" : status, {
      toolUseId: toolUseId,
      summary: Ae,
      outputFile: Ie,
    });
  return {
    taskId: taskId,
    toolUseId: toolUseId,
    agentId: agentId,
    status: status,
    summary: Ae,
    outputFile: Ie,
    snapshot: Ee,
    stopCause: stopCause,
    stopExplanation: we,
  };
}
/**
 * 把队列中该任务待送达的通知作为工具结果消费掉（并暂时移除代理保活原因），返回撤销函数（恢复保活并重新入队）。
 */
//@ chunk-e6aww6q8.js:4747845-4748178 placement
function consumeTaskNotifications(e, n, r) {
  let s = n ?? mainAgentId(),
    h = mg(),
    filtered = h
      .getCommandQueue()
      .filter(
        (S) =>
          S.mode === "task-notification" && S.taskId === e && S.agentId === s && S.taskDelivery !== void 0,
      );
  if (filtered.length === 0) return;
  if ((h.consume(filtered, { reason: "delivered_as_tool_result" }), n !== void 0))
    removeKeepaliveReason(n, `bash:${e}`, r);
  return () => {
    if (n !== void 0) addAgentKeepaliveReason(n, `bash:${e}`, r);
    filtered.forEach((S) => enqueuePendingNotification(S));
  };
}
//@ chunk-e6aww6q8.js:4748178-4748443 placement
function stopShellTaskWithNotice(e, n) {
  try {
    let r = finishLocalShellTask({ ...e, status: "killed", exitCode: void 0, stopCause: n });
    if (r)
      (e.taskRegistry.update(e.taskId, (s) => ({
        ...s,
        terminal: { summary: r.summary, output_file: r.outputFile },
      })),
        enqueuePendingNotification(enqueueTaskNotification(r), { turnAttribution: "inherit" }));
  } finally {
    killTask(e.taskId, e.taskRegistry);
  }
}
/**
 * 后台 shell 到达截止时间仍在运行时停止它并发通知，记录事件。
 */
//@ chunk-e6aww6q8.js:4748443-4748902 placement
function stopAtBackgroundDeadline(e, n, r) {
  try {
    if (!L5o()) return;
    let s = e.taskRegistry.get(e.taskId);
    if (
      !isLocalShellTask(s) ||
      s.status !== "running" ||
      s.notified ||
      s.shellCommand?.status !== "backgrounded"
    )
      return;
    ((r.cause = "deadline"),
      stopShellTaskWithNotice(e, "deadline"),
      logFeatureOk("task_local_shell_background_deadline"),
      logForDebugging(`LocalShellTask ${e.taskId}: stopped at its ${n}ms background deadline`));
  } catch (error) {
    (logFeatureBad("task_local_shell_background_deadline", "threw"),
      logForDebugging(`LocalShellTask ${e.taskId}: stop at the background deadline failed`),
      logError(error));
  }
}
//@ chunk-e6aww6q8.js:4750942-4751077 placement
function releaseShellKeepalive(e, n, r) {
  let s = n ? r.get(n) : void 0;
  if (!(
    n !== void 0 &&
    jK() &&
    isBackgroundedSubagent(s) &&
    (s.status === "running" || hasCompletedWithFindings(s)) &&
    hasQueuedTaskNotification(n, e)
  ))
    removeKeepaliveReason(n, `bash:${e}`, r);
}
/**
 * 把正在运行的 shell 命令注册为后台 local_bash 任务：创建任务状态、按需注册内存压力终止、转后台并启动卡住检测与后台跟踪，返回任务 ID 与结束 Promise。
 */
//@ chunk-e6aww6q8.js:4751077-4751839 placement
async function backgroundShellCommand(e, n) {
  let {
      command: command,
      description: description,
      shellCommand: shellCommand,
      toolUseId: toolUseId,
      agentId: agentId,
      kind: kind,
      timeout: timeout,
      backgroundTrigger: backgroundTrigger,
      shell: shell,
    } = e,
    { taskRegistry: taskRegistry } = n,
    { taskOutput: taskOutput } = shellCommand,
    taskId = taskOutput.taskId,
    taskState = {
      ...createTaskStateBase(taskId, "local_bash", description, toolUseId),
      type: "local_bash",
      status: "running",
      outputFile: getTaskOutputPath(taskId),
      command: command,
      shell: shell,
      cwd: getCwd(),
      shellCommand: shellCommand,
      lastReportedTotalLines: 0,
      isBackgrounded: !0,
      agentId: agentId,
      kind: kind,
      ...(shell === "bash" && kind !== "monitor" && m$o(command) && { stopsOnExit: !0 }),
    };
  taskRegistry.register(taskState);
  let releaseKeepalive =
    kind !== "monitor"
      ? shouldKillShellForMemoryPressure(
          taskId,
          description,
          taskRegistry,
          toolUseId,
          kind,
          agentId,
          timeout,
          backgroundTrigger,
        )
      : void 0;
  shellCommand.background(taskId, { atExit: getAtExitBehavior(taskRegistry) });
  let cancelStallWatchdog = startStallWatchdog(taskId, description, kind, toolUseId, agentId),
    settled = backgroundTask({
      shellCommand: shellCommand,
      taskId: taskId,
      bashCommand: shell === "bash" ? command : void 0,
      description: description,
      kind: kind,
      toolUseId: toolUseId,
      agentId: agentId,
      taskRegistry: taskRegistry,
      cancelStallWatchdog: cancelStallWatchdog,
      releaseBackgroundShellKeepalive: releaseKeepalive,
    });
  return { taskId: taskId, settled: settled };
}
/**
 * 注册一个已在运行的后台 shell 任务（被收养的命令，isAdopted），命令结束时写结果/终止摘要并发通知、回收输出。
 */
//@ chunk-e6aww6q8.js:4751839-4752702 fingerprint = spawnShellTask (0.601)
function spawnShellTask(input, taskRegistry) {
  let {
      taskId: taskId,
      command: command,
      description: description,
      toolUseId: toolUseId,
      kind: kind,
      agentId: agentId,
    } = input,
    L = {
      ...createTaskStateBase(taskId, "local_bash", description, toolUseId),
      type: "local_bash",
      status: "running",
      outputFile: getTaskOutputPath(taskId),
      command: command,
      cwd: getCwd(),
      shellCommand: input.shellCommand,
      lastReportedTotalLines: input.lastReportedTotalLines,
      isBackgrounded: !0,
      agentId: agentId !== void 0 ? Mr(agentId) : void 0,
      kind: kind,
      isAdopted: !0,
    };
  (taskRegistry.register(L),
    input.shellCommand.result.then(async (result) => {
      await flushAndCleanup(input.shellCommand);
      let status = result.interrupted ? "killed" : "completed";
      taskRegistry.update(taskId, (task) =>
        task.notified
          ? task
          : {
              ...task,
              status: status,
              result: { code: result.code, interrupted: result.interrupted },
              shellCommand: null,
              endTime: Date.now(),
              terminal: {
                summary: formatTaskTerminalSummary(kind, description, status, result.code, void 0, void 0),
                output_file: getTaskOutputPath(taskId),
              },
            },
      );
      let notifyOwner = isLiveLocalAgent(agentId !== void 0 ? taskRegistry.get(agentId) : void 0),
        notification = finishLocalShellTask({
          taskId: taskId,
          description: description,
          status: status,
          exitCode: result.code,
          taskRegistry: taskRegistry,
          toolUseId: toolUseId,
          kind: kind,
          agentId: notifyOwner ? Mr(agentId) : void 0,
        });
      if (notification)
        enqueuePendingNotification(enqueueTaskNotification(notification), { turnAttribution: "inherit" });
      evictTaskOutput(taskId);
    }));
}
/**
 * 注册前台 shell 任务（isBackgrounded=false），返回 taskId（取自 shellCommand.taskOutput）。
 */
//@ chunk-e6aww6q8.js:4752702-4753070 fingerprint = registerForeground (0.726)
function registerForeground(input, taskRegistry, toolUseId) {
  let {
      command: command,
      description: description,
      shellCommand: shellCommand,
      agentId: agentId,
      caller: caller,
      autoBackgroundArmed: autoBackgroundArmed,
      shell: shell,
    } = input,
    taskId = shellCommand.taskOutput.taskId,
    taskState = {
      ...createTaskStateBase(taskId, "local_bash", description, toolUseId),
      type: "local_bash",
      status: "running",
      outputFile: getTaskOutputPath(taskId),
      command: command,
      shell: shell,
      cwd: getCwd(),
      shellCommand: shellCommand,
      lastReportedTotalLines: 0,
      isBackgrounded: !1,
      agentId: agentId,
      caller: caller,
      autoBackgroundArmed: autoBackgroundArmed,
    };
  return (taskRegistry.register(taskState), taskId);
}
/**
 * 把指定前台 shell 任务转后台（cause 为 user 或 deliver_message）。
 */
//@ chunk-e6aww6q8.js:4753070-4753275 callgraph-fingerprint = backgroundAll (0.451)
function backgroundShellTask(taskId, taskRegistry, options) {
  let task = taskRegistry.get(taskId);
  if (!isLocalShellTask(task) || task.isBackgrounded || !task.shellCommand) return !1;
  return backgroundExistingForegroundTask(
    taskId,
    task.shellCommand,
    task.description,
    taskRegistry,
    task.toolUseId,
    options,
    options?.backgroundedToDeliverMessage ? "deliver_message" : "user",
  );
}
/**
 * 是否是前台任务：前台 shell（有 shellCommand）或前台子代理（非 main-session、非 fork worker）。
 */
//@ chunk-e6aww6q8.js:4753275-4753405 fingerprint = hasForegroundTasks (0.667)
function isForegroundTask(task) {
  if (isLocalShellTask(task)) return !task.isBackgrounded && Boolean(task.shellCommand);
  return isLocalAgent(task) && !task.isBackgrounded && !isMainSessionTask(task) && !task.forkWorker;
}
/**
 * 应用状态里是否有前台任务。
 */
//@ chunk-e6aww6q8.js:4753405-4753461 layout
function hasForegroundTasks(appState) {
  return Object.values(appState.tasks).some(isForegroundTask);
}
/**
 * 全部转后台（Ctrl+B）：先转前台 shell，再转前台子代理，记 task_local_shell_background_all。
 */
//@ chunk-e6aww6q8.js:4753461-4753659 layout
function backgroundAll(taskRegistry) {
  let filtered = Object.values(taskRegistry.all()).filter(isForegroundTask);
  for (let r of filtered) if (r.type === "local_bash") backgroundShellTask(r.id, taskRegistry);
  for (let r of filtered) if (r.type !== "local_bash") moveAgentToBackground(r.id, taskRegistry);
  logFeatureOk("task_local_shell_background_all");
}
/**
 * 是否是属于某代理（undefined 表示主线程）的前台 shell 任务。
 */
//@ chunk-e6aww6q8.js:4753659-4753729 layout
function isForegroundShellOf(task, agentId) {
  return isForegroundTask(task) && task.type === "local_bash" && task.agentId === agentId;
}
/**
 * 是否是主线程的前台 shell。
 */
//@ chunk-e6aww6q8.js:4753729-4753766 layout
function isMainThreadForegroundShell(task) {
  return isForegroundShellOf(task, void 0);
}
/**
 * 前台 shell 是否由该调用方发起（主线程为 turn，子代理为 agent）。
 */
//@ chunk-e6aww6q8.js:4753766-4753840 layout
function isForegroundShellFromCaller(task, agentId) {
  return isForegroundShellOf(task, agentId) && task.caller === (agentId === void 0 ? "turn" : "agent");
}
/**
 * 为投递新消息把一批前台 shell 转后台，返回成功转后台的任务。
 */
//@ chunk-e6aww6q8.js:4753840-4753926 layout
function backgroundShellsToDeliverMessage(tasks, taskRegistry) {
  return tasks.filter((r) => backgroundShellTask(r.id, taskRegistry, { backgroundedToDeliverMessage: !0 }));
}
/**
 * shell 任务是否因要投递新消息而被转到后台。
 */
//@ chunk-e6aww6q8.js:4753926-4754009 layout
function wasBackgroundedToDeliverMessage(taskId, taskRegistry) {
  let r = taskRegistry.get(taskId);
  return isLocalShellTask(r) && r.backgroundedToDeliverMessage === !0;
}
/**
 * 按 toolUseId 找到前台任务并转后台（shell 或子代理）。
 */
//@ chunk-e6aww6q8.js:4754009-4754181 layout
function backgroundTaskByToolUseId(toolUseId, taskRegistry) {
  for (let [r, s] of Object.entries(taskRegistry.all())) {
    if (s.toolUseId !== toolUseId) continue;
    if (!isForegroundTask(s)) return !1;
    if (s.type === "local_bash") return backgroundShellTask(r, taskRegistry);
    return moveAgentToBackground(r, taskRegistry);
  }
  return !1;
}
/**
 * 把已有前台 shell 转为后台：让 shellCommand 进入后台模式，置 isBackgrounded，启动卡住检测与保活，挂上结束处理 backgroundTask。
 */
//@ chunk-e6aww6q8.js:4754181-4754653 callgraph-witnessed = backgroundExistingForegroundTask (0.249)
function backgroundExistingForegroundTask(
  taskId,
  shellCommand,
  description,
  taskRegistry,
  toolUseId,
  patch,
  cause,
) {
  if (!shellCommand.background(taskId, { atExit: getAtExitBehavior(taskRegistry) })) return !1;
  let w = taskRegistry.get(taskId),
    agentId = w && isLocalShellTask(w) ? w.agentId : void 0;
  taskRegistry.update(taskId, (prev) => {
    if (prev.isBackgrounded) return prev;
    return { ...prev, isBackgrounded: !0, ...patch };
  });
  let cancelStallWatchdog = startStallWatchdog(taskId, description, void 0, toolUseId, agentId),
    releaseKeepalive = shouldKillShellForMemoryPressure(
      taskId,
      description,
      taskRegistry,
      toolUseId,
      void 0,
      agentId,
      void 0,
      cause,
    );
  return (
    backgroundTask({
      shellCommand: shellCommand,
      taskId: taskId,
      bashCommand: isLocalShellTask(w) && w.shell === "bash" ? w.command : void 0,
      description: description,
      kind: void 0,
      toolUseId: toolUseId,
      agentId: agentId,
      taskRegistry: taskRegistry,
      cancelStallWatchdog: cancelStallWatchdog,
      releaseBackgroundShellKeepalive: releaseKeepalive,
    }),
    !0
  );
}
/**
 * 读取 shell 任务目前的输出（截断时去掉首行），格式化为通知用文本；读失败返回空串。
 */
//@ chunk-e6aww6q8.js:4754653-4754919 layout
async function readShellOutputSoFar(taskId, maxBytes) {
  try {
    let r = await getVerifiedTaskOutputTail(taskId, maxBytes),
      s =
        r.omittedBytes > 0
          ? r.content.slice(
              r.content.indexOf(`
`) + 1,
            )
          : r.content;
    return formatTaskOutputTail({ ...r, content: s || r.content }, getTaskOutputPath(taskId));
  } catch (error) {
    return (
      logForDebugging(`LocalShellTask ${taskId}: output so far unreadable: ${String(error)}`, {
        level: "warn",
      }),
      ""
    );
  }
}
/**
 * 标记 shell 任务已通知并写入最终状态（按退出结果算 completed/failed），记计数；返回是否由本次写入。
 */
//@ chunk-e6aww6q8.js:4754919-4755252 callgraph-fingerprint = markTaskNotified (0.159)
function markTaskNotified(taskId, result, taskRegistry) {
  let s;
  if (
    (taskRegistry.update(taskId, (h) => {
      if (h.notified) return h;
      return (
        (s = getShellExitStatus(result, h).status),
        {
          ...h,
          notified: !0,
          status: s,
          result: { code: result.code, interrupted: result.interrupted },
          shellCommand: null,
          endTime: Date.now(),
        }
      );
    }),
    s === "completed")
  )
    logFeatureOk("task_local_shell");
  else if (s === "failed") logFeatureBad("task_local_shell", "task_local_shell_failed");
  return s !== void 0;
}
/**
 * 前台 shell 结束时注销：仍在前台且未通知的任务直接移除并发终止事件。
 */
//@ chunk-e6aww6q8.js:4755252-4755400 callgraph-witnessed = unregisterForeground (0.269)
function unregisterForeground(taskId, status, taskRegistry) {
  let s = taskRegistry.get(taskId);
  if (!isLocalShellTask(s) || s.isBackgrounded || s.notified) return;
  (taskRegistry.remove(taskId),
    emitTaskNotification(taskId, status, { toolUseId: s.toolUseId, summary: s.description }));
}
/**
 * 按 shellType 选退出码/输出解释函数（bash/powershell 各一）；切分误归，应在 Bash/PowerShell 工具的 commandSemantics。
 */
//@ chunk-e6aww6q8.js:4755400-4755434 layout = resolveProvider (0.84)
var COMMAND_RESULT_INTERPRETERS = { bash: dVn, powershell: interpretPowerShellResult };
/**
 * 是否是仍有活动（运行中或有存活子工作）的本地代理。
 */
//@ chunk-e6aww6q8.js:4755434-4755494 layout = requestTeammateShutdown (1)
function isLiveLocalAgent(e) {
  return isLocalAgent(e) && (e.status === "running" || hasCompletedWithFindings(e));
}
/**
 * 由命令结果确定任务状态：中断为 killed，无退出状态为 failed，否则按 shell 的结果解释器判断并附退出说明。
 */
//@ chunk-e6aww6q8.js:4755494-4755860 layout
function getShellExitStatus(e, n) {
  if (e.interrupted) return { status: "killed", exitNote: void 0 };
  if (e.noExitStatus) return { status: "failed", exitNote: void 0 };
  if (n?.shell === void 0) return { status: e.code === 0 ? "completed" : "failed", exitNote: void 0 };
  let { isError: isError, message: message } = COMMAND_RESULT_INTERPRETERS[n.shell](
    n.command,
    e.code,
    e.stdout,
    e.stderr,
  );
  return isError ? { status: "failed", exitNote: void 0 } : { status: "completed", exitNote: message };
}
//@ chunk-e6aww6q8.js:4755860-4755933 layout
function fhn(e, n) {
  let { status: status } = getShellExitStatus(e, n);
  return status === "killed" ? "stopped" : status;
}
/**
 * 后台 shell 结束处理：停卡住检测、flush 输出、（需要时）读输出尾部，写最终状态与终止摘要，生成 task-notification（monitor 不发），释放保活并回收输出。
 */
//@ chunk-e6aww6q8.js:4755933-4757064 callgraph-fingerprint = backgroundTask (0.234)
function backgroundTask({
  shellCommand: shellCommand,
  taskId: taskId,
  bashCommand: bashCommand,
  description: description,
  kind: kind,
  toolUseId: toolUseId,
  agentId: agentId,
  taskRegistry: taskRegistry,
  cancelStallWatchdog: cancelStallWatchdog,
  releaseBackgroundShellKeepalive: releaseBackgroundShellKeepalive,
}) {
  return shellCommand.result.then(async (result) => {
    (cancelStallWatchdog(), await flushAndCleanup(shellCommand));
    let outputTail =
        L0e() && kind !== "monitor"
          ? await getVerifiedTaskOutputTail(taskId, MAX_TASK_OUTPUT_BYTES).catch((result) => {
              logForDebugging(
                `LocalShellTask ${taskId}: output tail unreadable, delivering without it: ${String(result)}`,
              );
              return;
            })
          : void 0,
      wasKilled = !1,
      outcome = getShellExitStatus(result, void 0),
      { taskOutput: taskOutput } = shellCommand,
      stdoutBytes = taskOutput.stdoutToFile ? void 0 : taskOutput.pipedStdoutBytes,
      outputPath = getTaskOutputPath(taskId);
    taskRegistry.update(taskId, (We) => {
      if (We.status === "killed") return ((wasKilled = !0), We);
      if (((outcome = getShellExitStatus(result, We)), We.notified)) return We;
      return {
        ...We,
        status: outcome.status,
        result: { code: result.code, interrupted: result.interrupted },
        shellCommand: null,
        endTime: Date.now(),
        terminal: {
          summary: formatTaskTerminalSummary(
            kind,
            description,
            outcome.status,
            result.code,
            stdoutBytes,
            outcome.exitNote,
          ),
          output_file: outputPath,
        },
      };
    });
    let finalStatus = wasKilled ? "killed" : outcome.status,
      notification = finishLocalShellTask({
        taskId: taskId,
        description: description,
        status: finalStatus,
        exitCode: result.code,
        taskRegistry: taskRegistry,
        toolUseId: toolUseId,
        kind: kind,
        agentId: agentId,
        stdoutBytes: stdoutBytes,
        exitNote: outcome.exitNote,
        output: outputTail,
      });
    if (notification && kind !== "monitor")
      enqueuePendingNotification(enqueueTaskNotification(notification), { turnAttribution: "inherit" });
    return (
      releaseBackgroundShellKeepalive?.(
        finalStatus,
        result,
        bashCommand === void 0
          ? void 0
          : classifyBackgroundCommand(
              bashCommand,
              taskOutput,
              result,
              finalStatus === "killed",
              outputTail?.content,
            ),
      ),
      evictTaskOutput(taskId),
      { status: finalStatus, exitCode: result.code, terminalNotification: notification }
    );
  });
}
/**
 * flush 任务输出并清理 shellCommand，异常只记录。
 */
//@ chunk-e6aww6q8.js:4757064-4757144 fingerprint = flushAndCleanup (1)
async function flushAndCleanup(shellCommand) {
  try {
    (await shellCommand.taskOutput.flush(), shellCommand.cleanup());
  } catch (error) {
    logError(error);
  }
}
/**
 * 进程退出时后台 shell 的处理方式：特定模式下 leave（保留运行），否则 kill。
 */
//@ chunk-e6aww6q8.js:4757144-4757189 affinity
function getAtExitBehavior(taskRegistry) {
  return taskRegistry === u2 ? "leave" : "kill";
}
/**
 * 输出最后一行是否像交互式提示（匹配一组提示正则）。
 */
//@ chunk-fym4r1th.js:50436-50521 fingerprint = looksLikePrompt (1)
function looksLikePrompt(tail) {
  let lastLine =
    tail
      .trimEnd()
      .split(
        `
`,
      )
      .pop() ?? "";
  return INTERACTIVE_PROMPT_PATTERNS.some((n) => n.test(lastLine));
}
/**
 * 卡住提醒：命令可能停在交互式提示，建议停止并用管道输入或非交互参数重跑。
 */
//@ chunk-fym4r1th.js:50521-50698 affinity
var INTERACTIVE_PROMPT_HINT =
  "The command is likely blocked on an interactive prompt. Stop this task and re-run with piped input (e.g., `echo y | command`) or a non-interactive flag if one exists.";
//@ chunk-fym4r1th.js:50698-50778 sole-consumer
function Ysi(e) {
  return `${BACKGROUND_COMMAND_PREFIX}"${e}" appears to be waiting for interactive input`;
}
/**
 * LocalShellTask 任务实现：kill → killTask（来源为 client 时记 by=client）。
 */
//@ chunk-kxyd0g16.js:17376-17488 fingerprint = LocalShellTask (0.794)
var LocalShellTask = {
  name: "LocalShellTask",
  type: "local_bash",
  async kill(e, r, n, s, f, h) {
    killTask(e, r, { by: h === "client" ? "client" : s });
  },
};

export {
  backgroundShellsToDeliverMessage,
  isForegroundShellOf,
  isForegroundShellFromCaller,
  isForegroundTask,
  backgroundShellCommand,
  spawnShellTask,
  formatMonitorTerminalSummary,
  LocalShellTask,
  backgroundTaskByToolUseId,
  backgroundAll,
  hasForegroundTasks,
  readShellOutputSoFar,
  backgroundExistingForegroundTask,
  markTaskNotified,
  fhn,
  wasBackgroundedToDeliverMessage,
  registerForeground,
  unregisterForeground,
  looksLikePrompt,
  stopAtBackgroundDeadline,
  stopShellTaskWithNotice,
  releaseShellKeepalive,
  isMainThreadForegroundShell,
};

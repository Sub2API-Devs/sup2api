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
  INTERACTIVE_PROMPT_PATTERNS,
  classifyBackgroundCommand,
} from "../../tools/BashTool/bashTelemetry.js";
import { BACKGROUND_COMMAND_PREFIX } from "../../constants/xml.js";
import {
  getTaskOutputPath,
  appendTaskOutputTrailer,
  evictTaskOutput,
  getVerifiedTaskOutputTail,
} from "../../utils/task/diskOutput.js";
import { DEFAULT_INSTRUCTIONS } from "../../commands/ultraplan.js";
import {
  enqueuePendingNotification,
  commandQueueManager,
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
import { getBackgroundDeadlineNote, isBackgroundTimeoutPromptEnabled } from "../../tools/BashTool/prompt.js";
import { isInputHoldOn } from "../../plugins/functionHooks/inputHold.js";
import { buildShellTaskResult, formatTaskOutputTail, MAX_TASK_OUTPUT_BYTES } from "./backgroundNotices.js";
import { getTaskRunState, emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { formatTaskTerminalSummary, isMainSessionTask } from "../LocalMainSessionTask.js";
import { addAgentKeepaliveReason } from "../taskKinds.js";
import { killTask } from "./killShellTasks.js";
import { isLocalShellTask } from "./guards.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { isConcurrentShoreOn } from "../LocalAgentTask/keepalive.js";
import {
  isBackgroundedSubagent,
  hasCompletedWithFindings,
  moveAgentToBackground,
} from "../LocalAgentTask/LocalAgentTask.js";
import { createTaskStateBase } from "../../Task.js";
import { getCwd } from "../../utils/cwd.js";
import { isRunSkillCommand } from "../../plugins/bundled/claudeTest/constants.js";
import { shouldKillShellForMemoryPressure } from "./memoryPressure.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { interpretWithAndGatedRetry } from "../../tools/BashTool/commandSemantics.js";
import { interpretPowerShellResult } from "../../tools/PowerShellTool/commandTelemetry.js";
import { UNLIMITED_RATE_LIMITER } from "../taskLoopRegistry.js";

//@ chunk-fym4r1th.js:50436-50521 fingerprint (2.1.88 match: looksLikePrompt, 1)
/**
 * 输出最后一行是否像交互式提示（匹配一组提示正则）。
 */
function looksLikePrompt(tail) {
  let lastLine =
    tail
      .trimEnd()
      .split(
        `
`,
      )
      .pop() ?? "";
  return INTERACTIVE_PROMPT_PATTERNS.some((pattern) => pattern.test(lastLine));
}
//@ chunk-fym4r1th.js:50521-50698 affinity
/**
 * 卡住提醒：命令可能停在交互式提示，建议停止并用管道输入或非交互参数重跑。
 */
var INTERACTIVE_PROMPT_HINT =
  "The command is likely blocked on an interactive prompt. Stop this task and re-run with piped input (e.g., `echo y | command`) or a non-interactive flag if one exists.";
//@ chunk-fym4r1th.js:50698-50778 sole-consumer
/**
 * 后台命令疑似等待交互输入时的提示文本。
 */
function shellAwaitingInputText(description) {
  return `${BACKGROUND_COMMAND_PREFIX}"${description}" appears to be waiting for interactive input`;
}
//@ chunk-e6aww6q8.js:4745578-4745856 fingerprint (2.1.88 match: enqueueShellNotification, 0.511)
/**
 * Monitor 任务结束文案：无输出结束 / stream ended / script failed / stopped。
 */
function formatMonitorTerminalSummary(description, status, exitCode, producedOutput) {
  let exitSuffix = exitCode !== undefined ? ` (exit ${exitCode})` : "";
  switch (status) {
    case "completed":
      return producedOutput === false
        ? `Monitor "${description}" ended without producing output${exitSuffix}`
        : `Monitor "${description}" stream ended`;
    case "failed":
      return `Monitor "${description}" script failed${exitSuffix}`;
    case "killed":
      return `Monitor "${description}" stopped`;
  }
}
//@ chunk-e6aww6q8.js:4746265-4746602 fingerprint (2.1.88 match: startStallWatchdog, 0.339)
/**
 * 为后台 shell 启动卡住检测：输出疑似停在交互式提示时，发一条带最后输出的 task-notification 提醒模型（monitor 不检测）。返回取消函数。
 */
function startStallWatchdog(taskId, description, kind, toolUseId, agentId) {
  if (kind === "monitor") return () => {};
  let outputPath = getTaskOutputPath(taskId);
  return DEFAULT_INSTRUCTIONS(taskId, (lastOutput) => {
    enqueuePendingNotification(
      {
        value: formatTaskNotification({
          taskId,
          toolUseId,
          outputFile: outputPath,
          summary: escapeXml(shellAwaitingInputText(description)),
          trailing: `
Last output:
${lastOutput}

${INTERACTIVE_PROMPT_HINT}`,
        }),
        mode: "task-notification",
        skipAttachments: true,
        priority: "next",
        agentId: agentId ?? mainAgentId(),
      },
      {
        turnAttribution: "inherit",
      },
    );
    logFeatureOk("task_local_shell_stall_detected");
  });
}
//@ chunk-e6aww6q8.js:4746907-4747845 placement
function finishLocalShellTask({
  taskId,
  description,
  status,
  exitCode,
  taskRegistry,
  toolUseId,
  kind = "bash",
  agentId,
  stdoutBytes,
  exitNote,
  output,
  stopCause,
}) {
  let { claimed, task } = claimTaskNotification(taskId, taskRegistry);
  if (!claimed) return;
  let stopExplanation = stopCause === "deadline" ? getBackgroundDeadlineNote() : undefined;
  let snapshot =
    isInputHoldOn() && kind !== "monitor"
      ? buildShellTaskResult({
          taskId,
          outcome: status,
          exitCode: task?.isAdopted ? undefined : exitCode,
          startTime: task?.startTime ?? Date.now(),
          endTime: task?.endTime ?? Date.now(),
          outputFile: getTaskOutputPath(taskId),
          output,
          stopCause,
          stopExplanation,
        })
      : undefined;
  if (snapshot) {
    getTaskRunState().withdrawShellNotification ??= consumeTaskNotifications;
    getTaskRunState().rememberBashTaskSnapshot(taskId, snapshot, agentId);
  }
  if (!task?.isAdopted)
    appendTaskOutputTrailer(
      taskId,
      status === "killed"
        ? "killed"
        : {
            exitCode,
          },
    );
  if (status === "completed") logFeatureOk("task_local_shell");
  else if (status === "failed") logFeatureBad("task_local_shell", "task_local_shell_failed");
  let summary = formatTaskTerminalSummary(
    kind,
    description,
    status,
    exitCode,
    stdoutBytes,
    exitNote,
    stopCause,
  );
  let outputFile = getTaskOutputPath(taskId);
  if (agentId !== undefined)
    emitTaskNotification(taskId, status === "killed" ? "stopped" : status, {
      toolUseId,
      summary,
      outputFile,
    });
  return {
    taskId,
    toolUseId,
    agentId,
    status,
    summary,
    outputFile,
    snapshot,
    stopCause,
    stopExplanation,
  };
}
//@ chunk-e6aww6q8.js:4747845-4748178 placement
/**
 * 把队列中该任务待送达的通知作为工具结果消费掉（并暂时移除代理保活原因），返回撤销函数（恢复保活并重新入队）。
 */
function consumeTaskNotifications(taskId, agentId, taskRegistry) {
  let recipientId = agentId ?? mainAgentId();
  let queue = commandQueueManager();
  let filtered = queue
    .getCommandQueue()
    .filter(
      (queued) =>
        queued.mode === "task-notification" &&
        queued.taskId === taskId &&
        queued.agentId === recipientId &&
        queued.taskDelivery !== undefined,
    );
  if (filtered.length === 0) return;
  queue.consume(filtered, {
    reason: "delivered_as_tool_result",
  });
  if (agentId !== undefined) removeKeepaliveReason(agentId, `bash:${taskId}`, taskRegistry);
  return () => {
    if (agentId !== undefined) addAgentKeepaliveReason(agentId, `bash:${taskId}`, taskRegistry);
    filtered.forEach((notification) => enqueuePendingNotification(notification));
  };
}
//@ chunk-e6aww6q8.js:4748178-4748443 placement
function stopShellTaskWithNotice(request, stopCause) {
  try {
    let summary = finishLocalShellTask({
      ...request,
      status: "killed",
      exitCode: undefined,
      stopCause,
    });
    if (summary) {
      request.taskRegistry.update(request.taskId, (task) => ({
        ...task,
        terminal: {
          summary: summary.summary,
          output_file: summary.outputFile,
        },
      }));
      enqueuePendingNotification(enqueueTaskNotification(summary), {
        turnAttribution: "inherit",
      });
    }
  } finally {
    killTask(request.taskId, request.taskRegistry);
  }
}
//@ chunk-e6aww6q8.js:4748443-4748902 placement
/**
 * 后台 shell 到达截止时间仍在运行时停止它并发通知，记录事件。
 */
function stopAtBackgroundDeadline(request, deadlineMs, options) {
  try {
    if (!isBackgroundTimeoutPromptEnabled()) return;
    let task = request.taskRegistry.get(request.taskId);
    if (
      !isLocalShellTask(task) ||
      task.status !== "running" ||
      task.notified ||
      task.shellCommand?.status !== "backgrounded"
    )
      return;
    options.cause = "deadline";
    stopShellTaskWithNotice(request, "deadline");
    logFeatureOk("task_local_shell_background_deadline");
    logForDebugging(`LocalShellTask ${request.taskId}: stopped at its ${deadlineMs}ms background deadline`);
  } catch (error) {
    logFeatureBad("task_local_shell_background_deadline", "threw");
    logForDebugging(`LocalShellTask ${request.taskId}: stop at the background deadline failed`);
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:4750942-4751077 placement
function releaseShellKeepalive(taskId, ownerAgentId, taskRegistry) {
  let task = ownerAgentId ? taskRegistry.get(ownerAgentId) : undefined;
  if (!(
    ownerAgentId !== undefined &&
    isConcurrentShoreOn() &&
    isBackgroundedSubagent(task) &&
    (task.status === "running" || hasCompletedWithFindings(task)) &&
    hasQueuedTaskNotification(ownerAgentId, taskId)
  ))
    removeKeepaliveReason(ownerAgentId, `bash:${taskId}`, taskRegistry);
}
//@ chunk-e6aww6q8.js:4751077-4751839 placement
/**
 * 把正在运行的 shell 命令注册为后台 local_bash 任务：创建任务状态、按需注册内存压力终止、转后台并启动卡住检测与后台跟踪，返回任务 ID 与结束 Promise。
 */
async function backgroundShellCommand(request, context) {
  let { command, description, shellCommand, toolUseId, agentId, kind, timeout, backgroundTrigger, shell } =
    request;
  let { taskRegistry } = context;
  let { taskOutput } = shellCommand;
  let taskId = taskOutput.taskId;
  let taskState = {
    ...createTaskStateBase(taskId, "local_bash", description, toolUseId),
    type: "local_bash",
    status: "running",
    outputFile: getTaskOutputPath(taskId),
    command,
    shell,
    cwd: getCwd(),
    shellCommand,
    lastReportedTotalLines: 0,
    isBackgrounded: true,
    agentId,
    kind,
    ...(shell === "bash" &&
      kind !== "monitor" &&
      isRunSkillCommand(command) && {
        stopsOnExit: true,
      }),
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
      : undefined;
  shellCommand.background(taskId, {
    atExit: getAtExitBehavior(taskRegistry),
  });
  let cancelStallWatchdog = startStallWatchdog(taskId, description, kind, toolUseId, agentId);
  let settled = backgroundTask({
    shellCommand,
    taskId,
    bashCommand: shell === "bash" ? command : undefined,
    description,
    kind,
    toolUseId,
    agentId,
    taskRegistry,
    cancelStallWatchdog,
    releaseBackgroundShellKeepalive: releaseKeepalive,
  });
  return {
    taskId,
    settled,
  };
}
//@ chunk-e6aww6q8.js:4751839-4752702 fingerprint (2.1.88 match: spawnShellTask, 0.601)
/**
 * 注册一个已在运行的后台 shell 任务（被收养的命令，isAdopted），命令结束时写结果/终止摘要并发通知、回收输出。
 */
function spawnShellTask(input, taskRegistry) {
  let { taskId, command, description, toolUseId, kind, agentId } = input;
  let taskState = {
    ...createTaskStateBase(taskId, "local_bash", description, toolUseId),
    type: "local_bash",
    status: "running",
    outputFile: getTaskOutputPath(taskId),
    command,
    cwd: getCwd(),
    shellCommand: input.shellCommand,
    lastReportedTotalLines: input.lastReportedTotalLines,
    isBackgrounded: true,
    agentId: agentId !== undefined ? identityAgentId2(agentId) : undefined,
    kind,
    isAdopted: true,
  };
  taskRegistry.register(taskState);
  input.shellCommand.result.then(async (result) => {
    await flushAndCleanup(input.shellCommand);
    let status = result.interrupted ? "killed" : "completed";
    taskRegistry.update(taskId, (task) =>
      task.notified
        ? task
        : {
            ...task,
            status,
            result: {
              code: result.code,
              interrupted: result.interrupted,
            },
            shellCommand: null,
            endTime: Date.now(),
            terminal: {
              summary: formatTaskTerminalSummary(
                kind,
                description,
                status,
                result.code,
                undefined,
                undefined,
              ),
              output_file: getTaskOutputPath(taskId),
            },
          },
    );
    let notifyOwner = isLiveLocalAgent(agentId !== undefined ? taskRegistry.get(agentId) : undefined);
    let notification = finishLocalShellTask({
      taskId,
      description,
      status,
      exitCode: result.code,
      taskRegistry,
      toolUseId,
      kind,
      agentId: notifyOwner ? identityAgentId2(agentId) : undefined,
    });
    if (notification)
      enqueuePendingNotification(enqueueTaskNotification(notification), {
        turnAttribution: "inherit",
      });
    evictTaskOutput(taskId);
  });
}
//@ chunk-e6aww6q8.js:4752702-4753070 fingerprint (2.1.88 match: registerForeground, 0.726)
/**
 * 注册前台 shell 任务（isBackgrounded=false），返回 taskId（取自 shellCommand.taskOutput）。
 */
function registerForeground(input, taskRegistry, toolUseId) {
  let { command, description, shellCommand, agentId, caller, autoBackgroundArmed, shell } = input;
  let taskId = shellCommand.taskOutput.taskId;
  let taskState = {
    ...createTaskStateBase(taskId, "local_bash", description, toolUseId),
    type: "local_bash",
    status: "running",
    outputFile: getTaskOutputPath(taskId),
    command,
    shell,
    cwd: getCwd(),
    shellCommand,
    lastReportedTotalLines: 0,
    isBackgrounded: false,
    agentId,
    caller,
    autoBackgroundArmed,
  };
  taskRegistry.register(taskState);
  return taskId;
}
//@ chunk-e6aww6q8.js:4753070-4753275 callgraph-fingerprint (2.1.88 match: backgroundAll, 0.451)
/**
 * 把指定前台 shell 任务转后台（cause 为 user 或 deliver_message）。
 */
function backgroundShellTask(taskId, taskRegistry, options) {
  let task = taskRegistry.get(taskId);
  if (!isLocalShellTask(task) || task.isBackgrounded || !task.shellCommand) return false;
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
//@ chunk-e6aww6q8.js:4753275-4753405 fingerprint (2.1.88 match: hasForegroundTasks, 0.667)
/**
 * 是否是前台任务：前台 shell（有 shellCommand）或前台子代理（非 main-session、非 fork worker）。
 */
function isForegroundTask(task) {
  if (isLocalShellTask(task)) return !task.isBackgrounded && Boolean(task.shellCommand);
  return isLocalAgent(task) && !task.isBackgrounded && !isMainSessionTask(task) && !task.forkWorker;
}
//@ chunk-e6aww6q8.js:4753405-4753461 layout
/**
 * 应用状态里是否有前台任务。
 */
function hasForegroundTasks(appState) {
  return Object.values(appState.tasks).some(isForegroundTask);
}
//@ chunk-e6aww6q8.js:4753461-4753659 layout
/**
 * 全部转后台（Ctrl+B）：先转前台 shell，再转前台子代理，记 task_local_shell_background_all。
 */
function backgroundAll(taskRegistry) {
  let filtered = Object.values(taskRegistry.all()).filter(isForegroundTask);
  for (let task of filtered) if (task.type === "local_bash") backgroundShellTask(task.id, taskRegistry);
  for (let task of filtered) if (task.type !== "local_bash") moveAgentToBackground(task.id, taskRegistry);
  logFeatureOk("task_local_shell_background_all");
}
//@ chunk-e6aww6q8.js:4753659-4753729 layout
/**
 * 是否是属于某代理（undefined 表示主线程）的前台 shell 任务。
 */
function isForegroundShellOf(task, agentId) {
  return isForegroundTask(task) && task.type === "local_bash" && task.agentId === agentId;
}
//@ chunk-e6aww6q8.js:4753729-4753766 layout
/**
 * 是否是主线程的前台 shell。
 */
function isMainThreadForegroundShell(task) {
  return isForegroundShellOf(task, undefined);
}
//@ chunk-e6aww6q8.js:4753766-4753840 layout
/**
 * 前台 shell 是否由该调用方发起（主线程为 turn，子代理为 agent）。
 */
function isForegroundShellFromCaller(task, agentId) {
  return isForegroundShellOf(task, agentId) && task.caller === (agentId === undefined ? "turn" : "agent");
}
//@ chunk-e6aww6q8.js:4753840-4753926 layout
/**
 * 为投递新消息把一批前台 shell 转后台，返回成功转后台的任务。
 */
function backgroundShellsToDeliverMessage(tasks, taskRegistry) {
  return tasks.filter((task) =>
    backgroundShellTask(task.id, taskRegistry, {
      backgroundedToDeliverMessage: true,
    }),
  );
}
//@ chunk-e6aww6q8.js:4753926-4754009 layout
/**
 * shell 任务是否因要投递新消息而被转到后台。
 */
function wasBackgroundedToDeliverMessage(taskId, taskRegistry) {
  let task = taskRegistry.get(taskId);
  return isLocalShellTask(task) && task.backgroundedToDeliverMessage === true;
}
//@ chunk-e6aww6q8.js:4754009-4754181 layout
/**
 * 按 toolUseId 找到前台任务并转后台（shell 或子代理）。
 */
function backgroundTaskByToolUseId(toolUseId, taskRegistry) {
  for (let [key, value] of Object.entries(taskRegistry.all())) {
    if (value.toolUseId !== toolUseId) continue;
    if (!isForegroundTask(value)) return false;
    if (value.type === "local_bash") return backgroundShellTask(key, taskRegistry);
    return moveAgentToBackground(key, taskRegistry);
  }
  return false;
}
//@ chunk-e6aww6q8.js:4754181-4754653 callgraph-witnessed (2.1.88 match: backgroundExistingForegroundTask, 0.249)
/**
 * 把已有前台 shell 转为后台：让 shellCommand 进入后台模式，置 isBackgrounded，启动卡住检测与保活，挂上结束处理 backgroundTask。
 */
function backgroundExistingForegroundTask(
  taskId,
  shellCommand,
  description,
  taskRegistry,
  toolUseId,
  patch,
  cause,
) {
  if (
    !shellCommand.background(taskId, {
      atExit: getAtExitBehavior(taskRegistry),
    })
  )
    return false;
  let existing = taskRegistry.get(taskId);
  let agentId = existing && isLocalShellTask(existing) ? existing.agentId : undefined;
  taskRegistry.update(taskId, (prev) => {
    if (prev.isBackgrounded) return prev;
    return {
      ...prev,
      isBackgrounded: true,
      ...patch,
    };
  });
  let cancelStallWatchdog = startStallWatchdog(taskId, description, undefined, toolUseId, agentId);
  let releaseKeepalive = shouldKillShellForMemoryPressure(
    taskId,
    description,
    taskRegistry,
    toolUseId,
    undefined,
    agentId,
    undefined,
    cause,
  );
  backgroundTask({
    shellCommand,
    taskId,
    bashCommand: isLocalShellTask(existing) && existing.shell === "bash" ? existing.command : undefined,
    description,
    kind: undefined,
    toolUseId,
    agentId,
    taskRegistry,
    cancelStallWatchdog,
    releaseBackgroundShellKeepalive: releaseKeepalive,
  });
  return true;
}
//@ chunk-e6aww6q8.js:4754653-4754919 layout
/**
 * 读取 shell 任务目前的输出（截断时去掉首行），格式化为通知用文本；读失败返回空串。
 */
async function readShellOutputSoFar(taskId, maxBytes) {
  try {
    let verifiedTaskOutputTail = await getVerifiedTaskOutputTail(taskId, maxBytes);
    let content =
      verifiedTaskOutputTail.omittedBytes > 0
        ? verifiedTaskOutputTail.content.slice(
            verifiedTaskOutputTail.content.indexOf(`
`) + 1,
          )
        : verifiedTaskOutputTail.content;
    return formatTaskOutputTail(
      {
        ...verifiedTaskOutputTail,
        content: content || verifiedTaskOutputTail.content,
      },
      getTaskOutputPath(taskId),
    );
  } catch (error) {
    logForDebugging(`LocalShellTask ${taskId}: output so far unreadable: ${String(error)}`, {
      level: "warn",
    });
    return "";
  }
}
//@ chunk-e6aww6q8.js:4754919-4755252 callgraph-fingerprint (2.1.88 match: markTaskNotified, 0.159)
/**
 * 标记 shell 任务已通知并写入最终状态（按退出结果算 completed/failed），记计数；返回是否由本次写入。
 */
function markTaskNotified(taskId, result, taskRegistry) {
  let status;
  taskRegistry.update(taskId, (task) => {
    if (task.notified) return task;
    status = getShellExitStatus(result, task).status;
    return {
      ...task,
      notified: true,
      status,
      result: {
        code: result.code,
        interrupted: result.interrupted,
      },
      shellCommand: null,
      endTime: Date.now(),
    };
  });
  if (status === "completed") logFeatureOk("task_local_shell");
  else if (status === "failed") logFeatureBad("task_local_shell", "task_local_shell_failed");
  return status !== undefined;
}
//@ chunk-e6aww6q8.js:4755252-4755400 callgraph-witnessed (2.1.88 match: unregisterForeground, 0.269)
/**
 * 前台 shell 结束时注销：仍在前台且未通知的任务直接移除并发终止事件。
 */
function unregisterForeground(taskId, status, taskRegistry) {
  let task = taskRegistry.get(taskId);
  if (!isLocalShellTask(task) || task.isBackgrounded || task.notified) return;
  taskRegistry.remove(taskId);
  emitTaskNotification(taskId, status, {
    toolUseId: task.toolUseId,
    summary: task.description,
  });
}
//@ chunk-e6aww6q8.js:4755400-4755434 layout (2.1.88 match: resolveProvider, 0.84)
/**
 * 按 shellType 选退出码/输出解释函数（bash/powershell 各一）；切分误归，应在 Bash/PowerShell 工具的 commandSemantics。
 */
var COMMAND_RESULT_INTERPRETERS = {
  bash: interpretWithAndGatedRetry,
  powershell: interpretPowerShellResult,
};
//@ chunk-e6aww6q8.js:4755434-4755494 layout (2.1.88 match: requestTeammateShutdown, 1)
/**
 * 是否是仍有活动（运行中或有存活子工作）的本地代理。
 */
function isLiveLocalAgent(task) {
  return isLocalAgent(task) && (task.status === "running" || hasCompletedWithFindings(task));
}
//@ chunk-e6aww6q8.js:4755494-4755860 layout
/**
 * 由命令结果确定任务状态：中断为 killed，无退出状态为 failed，否则按 shell 的结果解释器判断并附退出说明。
 */
function getShellExitStatus(result, shellCommand) {
  if (result.interrupted)
    return {
      status: "killed",
      exitNote: undefined,
    };
  if (result.noExitStatus)
    return {
      status: "failed",
      exitNote: undefined,
    };
  if (shellCommand?.shell === undefined)
    return {
      status: result.code === 0 ? "completed" : "failed",
      exitNote: undefined,
    };
  let { isError, message } = COMMAND_RESULT_INTERPRETERS[shellCommand.shell](
    shellCommand.command,
    result.code,
    result.stdout,
    result.stderr,
  );
  return isError
    ? {
        status: "failed",
        exitNote: undefined,
      }
    : {
        status: "completed",
        exitNote: message,
      };
}
//@ chunk-e6aww6q8.js:4755860-4755933 layout
/**
 * 把 shell 结束状态转成展示用状态（killed 记为 stopped）。
 */
function shellStatusForDisplay(result, shellCommand) {
  let { status } = getShellExitStatus(result, shellCommand);
  return status === "killed" ? "stopped" : status;
}
//@ chunk-e6aww6q8.js:4755933-4757064 callgraph-fingerprint (2.1.88 match: backgroundTask, 0.234)
/**
 * 后台 shell 结束处理：停卡住检测、flush 输出、（需要时）读输出尾部，写最终状态与终止摘要，生成 task-notification（monitor 不发），释放保活并回收输出。
 */
function backgroundTask({
  shellCommand,
  taskId,
  bashCommand,
  description,
  kind,
  toolUseId,
  agentId,
  taskRegistry,
  cancelStallWatchdog,
  releaseBackgroundShellKeepalive,
}) {
  return shellCommand.result.then(async (result) => {
    cancelStallWatchdog();
    await flushAndCleanup(shellCommand);
    let outputTail =
      isInputHoldOn() && kind !== "monitor"
        ? await getVerifiedTaskOutputTail(taskId, MAX_TASK_OUTPUT_BYTES).catch((result) => {
            logForDebugging(
              `LocalShellTask ${taskId}: output tail unreadable, delivering without it: ${String(result)}`,
            );
            return;
          })
        : undefined;
    let wasKilled = false;
    let outcome = getShellExitStatus(result, undefined);
    let { taskOutput } = shellCommand;
    let stdoutBytes = taskOutput.stdoutToFile ? undefined : taskOutput.pipedStdoutBytes;
    let outputPath = getTaskOutputPath(taskId);
    taskRegistry.update(taskId, (task) => {
      if (task.status === "killed") {
        wasKilled = true;
        return task;
      }
      outcome = getShellExitStatus(result, task);
      if (task.notified) return task;
      return {
        ...task,
        status: outcome.status,
        result: {
          code: result.code,
          interrupted: result.interrupted,
        },
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
    let finalStatus = wasKilled ? "killed" : outcome.status;
    let notification = finishLocalShellTask({
      taskId,
      description,
      status: finalStatus,
      exitCode: result.code,
      taskRegistry,
      toolUseId,
      kind,
      agentId,
      stdoutBytes,
      exitNote: outcome.exitNote,
      output: outputTail,
    });
    if (notification && kind !== "monitor")
      enqueuePendingNotification(enqueueTaskNotification(notification), {
        turnAttribution: "inherit",
      });
    releaseBackgroundShellKeepalive?.(
      finalStatus,
      result,
      bashCommand === undefined
        ? undefined
        : classifyBackgroundCommand(
            bashCommand,
            taskOutput,
            result,
            finalStatus === "killed",
            outputTail?.content,
          ),
    );
    evictTaskOutput(taskId);
    return {
      status: finalStatus,
      exitCode: result.code,
      terminalNotification: notification,
    };
  });
}
//@ chunk-e6aww6q8.js:4757064-4757144 fingerprint (2.1.88 match: flushAndCleanup, 1)
/**
 * flush 任务输出并清理 shellCommand，异常只记录。
 */
async function flushAndCleanup(shellCommand) {
  try {
    await shellCommand.taskOutput.flush();
    shellCommand.cleanup();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:4757144-4757189 affinity
/**
 * 进程退出时后台 shell 的处理方式：特定模式下 leave（保留运行），否则 kill。
 */
function getAtExitBehavior(taskRegistry) {
  return taskRegistry === UNLIMITED_RATE_LIMITER ? "leave" : "kill";
}
//@ chunk-kxyd0g16.js:17376-17488 fingerprint (2.1.88 match: LocalShellTask, 0.794)
/**
 * LocalShellTask 任务实现：kill → killTask（来源为 client 时记 by=client）。
 */
var LocalShellTask = {
  name: "LocalShellTask",
  type: "local_bash",
  async kill(taskId, setAppState, unusedSetter, killedBy, runGuard, actor) {
    killTask(taskId, setAppState, {
      by: actor === "client" ? "client" : killedBy,
    });
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
  shellStatusForDisplay,
  wasBackgroundedToDeliverMessage,
  registerForeground,
  unregisterForeground,
  looksLikePrompt,
  stopAtBackgroundDeadline,
  stopShellTaskWithNotice,
  releaseShellKeepalive,
  isMainThreadForegroundShell,
};

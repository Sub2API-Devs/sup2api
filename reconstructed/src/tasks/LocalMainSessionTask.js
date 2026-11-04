/**
 * tasks/LocalMainSessionTask.ts
 *
 * 主会话转后台：把当前查询作为 main-session 类型的 local_agent 任务在后台继续运行，带进度与 transcript 记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/LocalMainSessionTask.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-e6aww6q8.js (8)
 * attribution: fingerprint 7, file-local 1, layout 1
 */
import { randomBytes } from "crypto";
import { initAgentOutputSymlink, isObserverAgentTask } from "./LocalAgentTask/LocalAgentTask.js";
import { createAbortController } from "../utils/abortController.js";
import { createTaskStateBase } from "../Task.js";
import { mainAgentId, forgetMainChainOnHandOff } from "../bootstrap/state.js";
import { logForDebugging } from "../utils/debug.js";
import { evictTaskOutput } from "../utils/task/diskOutput.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { emitTaskNotification } from "../utils/task/taskNotifications.js";
import { withKeepaliveReset } from "../services/api/cacheKeepalive.js";
import { recordSidechainTranscript } from "../utils/sessionStorage.js";
import { isMainAgent } from "../utils/agentContext.js";
import { runWithCwdOverride } from "../utils/cwd.js";
import { runningTurnRegistry, orderedRowSource } from "../utils/queryHelpers.js";
import { identityAgentId2 } from "../utils/agentId.js";
import { applyPreservedMessages } from "../services/compact/compact.js";
import { roughTokenCountEstimation } from "../services/tokenEstimation.js";
import { isExactReplToolName } from "../tools/REPLTool/constants.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { formatMonitorTerminalSummary } from "./LocalShellTask/LocalShellTask.js";
import { BACKGROUND_COMMAND_PREFIX, formatExitCodeSuffix } from "../constants/xml.js";
import { BACKGROUND_STOP_REASONS } from "./LocalShellTask/backgroundNotices.js";
import { isPanelAgentTask } from "./taskKinds.js";
import { FLAG_IDLE_WINDOW } from "./LocalAgentTask/keepalive.js";

//@ chunk-e6aww6q8.js:4736672-4736826 fingerprint = DEFAULT_MAIN_SESSION_AGENT (0.881)
/**
 * 主会话后台任务的默认代理定义（agentType=main-session，系统提示词为空），以及 ID 随机部分字母表。
 */
var DEFAULT_MAIN_SESSION_AGENT = {
  agentType: "main-session",
  whenToUse: "Main session query",
  source: "userSettings",
  getSystemPrompt: () => "",
};
var MAIN_SESSION_ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
//@ chunk-e6aww6q8.js:4736826-4736913 file-local
/**
 * 生成主会话任务 ID："s" + 8 个随机 36 进制字符。
 */
function generateMainSessionTaskId() {
  let bytes = randomBytes(8);
  let id = "s";
  for (let i = 0; i < 8; i++) id += MAIN_SESSION_ID_ALPHABET[bytes[i] % MAIN_SESSION_ID_ALPHABET.length];
  return id;
}
//@ chunk-e6aww6q8.js:4736913-4737478 fingerprint = registerMainSessionTask (0.935)
/**
 * 注册主会话后台任务（local_agent / agentType=main-session / isBackgrounded=true），返回 {taskId, abortSignal}。
 */
function registerMainSessionTask(description, taskRegistry, agentDefinition) {
  let taskId = generateMainSessionTaskId();
  initAgentOutputSymlink(taskId);
  let abortController = createAbortController();
  let selectedAgent = agentDefinition ?? DEFAULT_MAIN_SESSION_AGENT;
  let taskState = {
    ...createTaskStateBase(taskId, "local_agent", description),
    type: "local_agent",
    status: "running",
    agentId: taskId,
    ownerAgentId: mainAgentId(),
    prompt: description,
    selectedAgent,
    agentType: "main-session",
    abortController,
    retrieved: false,
    lastReportedToolCount: 0,
    lastReportedTokenCount: 0,
    isBackgrounded: true,
    pendingMessages: [],
    retain: false,
    diskLoaded: false,
  };
  logForDebugging(`[LocalMainSessionTask] Registering task ${taskId} with description: ${description}`);
  taskRegistry.register(taskState);
  logForDebugging(
    `[LocalMainSessionTask] After registration, task ${taskId} exists in state: ${taskRegistry.get(taskId) !== undefined}`,
  );
  return {
    taskId,
    abortSignal: abortController.signal,
  };
}
//@ chunk-e6aww6q8.js:4737478-4737895 fingerprint = completeMainSessionTask (0.554)
/**
 * 主会话后台任务结束：标 completed/failed（notified=true），transcript 只留最后一条，回收输出，记计数并发终止通知。
 */
function completeMainSessionTask(taskId, success, taskRegistry) {
  let status = success ? "completed" : "failed";
  let toolUseId;
  let description;
  taskRegistry.update(taskId, (task) => {
    if (task.status !== "running") return task;
    toolUseId = task.toolUseId;
    description = task.description;
    return {
      ...task,
      status,
      endTime: Date.now(),
      notified: true,
    };
  });
  taskRegistry.updateTranscript(taskId, (task) => ({
    ...task,
    messages: task.messages.length ? [task.messages.at(-1)] : [],
  }));
  evictTaskOutput(taskId);
  if (description === undefined) return;
  if (success) logFeatureOk("task_main_session");
  else logFeatureBad("task_main_session", "task_main_session_failed");
  emitTaskNotification(taskId, status, {
    toolUseId,
    summary: description,
  });
}
//@ chunk-e6aww6q8.js:4737895-4738048 fingerprint = isMainSessionTask (1)
/**
 * 是否是主会话后台任务（local_agent 且 agentType=main-session）。
 */
function isMainSessionTask(task) {
  if (typeof task !== "object" || task === null || !("type" in task) || !("agentType" in task)) return false;
  return task.type === "local_agent" && task.agentType === "main-session";
}
//@ chunk-e6aww6q8.js:4738048-4738058 layout
/**
 * 主会话后台任务进度里保留的最近工具活动数（5）。
 */
var MAX_MAIN_SESSION_ACTIVITIES = 5;
//@ chunk-e6aww6q8.js:4738058-4740100 fingerprint = startBackgroundSession (0.683)
/**
 * 把主会话查询转到后台：注册任务，以 main-session 子代理身份（isMainSession/isBackgroundAgent）在独立上下文里继续跑 runQuery，
 * 边跑边写 sidechain transcript、更新 token/工具计数；中止时发 stopped 通知；结束调用 completeMainSessionTask。返回 taskId。
 */
function startBackgroundSession({
  messages,
  queryParams,
  description,
  taskRegistry,
  agentDefinition,
  setAppState,
}) {
  let { taskId, abortSignal } = registerMainSessionTask(description, taskRegistry, agentDefinition);
  forgetMainChainOnHandOff();
  for (let betaSet of [queryParams.stickyBetas, queryParams.toolUseContext.stickyBetas])
    if (betaSet !== undefined) withKeepaliveReset(betaSet);
  let storageV5 = queryParams.toolUseContext.storageV5;
  recordSidechainTranscript(messages, taskId, undefined, storageV5).catch((err) =>
    logForDebugging(`bg-session initial transcript write failed: ${err}`),
  );
  let parentAgentContext = queryParams.toolUseContext.agentContext;
  let bgAgentContext = {
    agentId: taskId,
    parentAgentId: isMainAgent(parentAgentContext) ? undefined : parentAgentContext.agentId,
    agentType: "subagent",
    subagentName: "main-session",
    isBuiltIn: true,
    isAsync: true,
    isMainSession: true,
    isBackgroundAgent: true,
  };
  runWithCwdOverride(bgAgentContext, async () => {
    let bgMessages = [...messages];
    let compactState = null;
    let lastRecordedUuid = messages.at(-1)?.uuid ?? null;
    let recordTranscript = (rows) => {
      let last = rows.at(-1);
      if (last === undefined) return;
      recordSidechainTranscript([...rows], taskId, lastRecordedUuid, storageV5).catch((error) =>
        logForDebugging(`bg-session transcript write failed: ${error}`),
      );
      lastRecordedUuid = last.uuid;
    };
    using turnScope = runningTurnRegistry.running(
      taskId,
      orderedRowSource({
        agentId: taskId,
        keep: (keptRows) => {
          bgMessages.push(...keptRows);
        },
        keepArrived: (arrivedRows) => {
          bgMessages.push(...arrivedRows);
          recordTranscript(arrivedRows);
        },
        rows: () => bgMessages,
        isHookable: true,
      }),
    );
    try {
      let recentActivities = [];
      let toolUseCount = 0;
      let tokenCount = 0;
      for await (let event of queryParams.toolUseContext.options.runQuery({
        messages: bgMessages,
        ...queryParams,
        toolUseContext: {
          ...queryParams.toolUseContext,
          agentId: identityAgentId2(taskId),
          agentContext: bgAgentContext,
        },
      })) {
        if (abortSignal.aborted) {
          let alreadyNotified = false;
          taskRegistry.update(taskId, (task) => {
            alreadyNotified = task.notified === true;
            return alreadyNotified
              ? task
              : {
                  ...task,
                  notified: true,
                };
          });
          if (!alreadyNotified)
            emitTaskNotification(taskId, "stopped", {
              summary: description,
            });
          return;
        }
        if (event.type === "active_goal") {
          setAppState?.((err) =>
            err.activeGoal === event.value
              ? err
              : {
                  ...err,
                  activeGoal: event.value,
                },
          );
          continue;
        }
        if (event.type !== "user" && event.type !== "assistant" && event.type !== "system") continue;
        bgMessages.push(event);
        compactState = applyPreservedMessages(bgMessages, event, compactState);
        recordTranscript([event]);
        if (event.type === "assistant") {
          for (let block of event.message.content)
            if (block.type === "text") tokenCount += roughTokenCountEstimation(block.text);
            else if (block.type === "tool_use") {
              toolUseCount++;
              if (isExactReplToolName(block.name)) continue;
              let activity = {
                toolName: block.name,
                input: block.input,
              };
              recentActivities.push(activity);
              if (recentActivities.length > MAX_MAIN_SESSION_ACTIVITIES) recentActivities.shift();
            }
        }
        taskRegistry.update(taskId, (prev) => {
          let prevProgress = prev.progress;
          if (prevProgress?.tokenCount === tokenCount && prevProgress.toolUseCount === toolUseCount)
            return prev;
          return {
            ...prev,
            progress: {
              tokenCount,
              toolUseCount,
              recentActivities:
                prevProgress?.toolUseCount === toolUseCount
                  ? prevProgress.recentActivities
                  : [...recentActivities],
            },
          };
        });
        taskRegistry.updateTranscript(taskId, (transcript) =>
          transcript.messages === bgMessages
            ? transcript
            : {
                ...transcript,
                messages: bgMessages,
              },
        );
      }
      completeMainSessionTask(taskId, true, taskRegistry);
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "startBackgroundSession: query loop failed"));
      completeMainSessionTask(taskId, false, taskRegistry);
    } finally {
      if (compactState) bgMessages.push(...compactState.preserved);
    }
  });
  return taskId;
}
//@ chunk-e6aww6q8.js:4746602-4746907 fingerprint = enqueueMainSessionNotification (0.43)
/**
 * 生成后台任务（shell/monitor）结束时的一行摘要："<前缀>"desc" completed / failed with exit code N / was stopped"；monitor 走专用文案。
 */
function formatTaskTerminalSummary(kind, description, status, exitCode, stdoutBytes, exitNote, killReason) {
  if (kind === "monitor")
    return formatMonitorTerminalSummary(
      description,
      status,
      exitCode,
      stdoutBytes === undefined ? undefined : stdoutBytes > 0,
    );
  switch (status) {
    case "completed":
      return `${BACKGROUND_COMMAND_PREFIX}"${description}" completed${exitCode !== undefined ? formatExitCodeSuffix(exitCode, exitNote) : ""}`;
    case "failed":
      return `${BACKGROUND_COMMAND_PREFIX}"${description}" failed${exitCode !== undefined ? ` with exit code ${exitCode}` : ""}`;
    case "killed":
      return `${BACKGROUND_COMMAND_PREFIX}"${description}" was ${killReason ? BACKGROUND_STOP_REASONS[killReason] : "stopped"}`;
  }
}
//@ chunk-18hwfzwa.js:441440-441612 fingerprint = foregroundMainSessionTask (0.545)
/**
 * 已完成、在后台、未静默停放、且只剩"空闲窗口"保活的面板子代理（可在 UI 中"拉回前台"查看）。
 */
function isIdleCompletedSubagent(task) {
  return (
    task.type === "local_agent" &&
    task.status === "completed" &&
    isPanelAgentTask(task) &&
    task.isBackgrounded &&
    !isObserverAgentTask(task) &&
    task.quietlyParked !== true &&
    [...(task.keepaliveReasons ?? [])].every((prev) => prev === FLAG_IDLE_WINDOW)
  );
}
export { startBackgroundSession, isIdleCompletedSubagent, isMainSessionTask, formatTaskTerminalSummary };

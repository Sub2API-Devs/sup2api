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
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomBytes as randomBytes_7,
  randomBytes as randomBytes_8,
  randomBytes as randomBytes_9,
  randomBytes as randomBytes_10,
  randomBytes as randomBytes_11,
  randomBytes as randomBytes_12,
  randomBytes as randomBytes_13,
  randomBytes as randomBytes_14,
} from "crypto";
import { SKe, isObserverAgentTask } from "./LocalAgentTask/LocalAgentTask.js";
import { createAbortController } from "../utils/abortController.js";
import { createTaskStateBase } from "../Task.js";
import { mainAgentId, forgetMainChainOnHandOff } from "../bootstrap/state.js";
import { logForDebugging } from "../utils/debug.js";
import { evictTaskOutput } from "../utils/task/diskOutput.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { emitTaskNotification } from "../utils/task/taskNotifications.js";
import { Qun } from "../services/api/cacheKeepalive.js";
import { recordSidechainTranscript } from "../utils/sessionStorage.js";
import { isMainAgent } from "../utils/agentContext.js";
import { runWithCwdOverride } from "../utils/cwd.js";
import { Mwt, Ebe } from "../utils/queryHelpers.js";
import { Mr } from "../utils/agentId.js";
import { applyPreservedMessages } from "../services/compact/compact.js";
import { roughTokenCountEstimation } from "../services/tokenEstimation.js";
import { S4 } from "../tools/REPLTool/constants.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { formatMonitorTerminalSummary } from "./LocalShellTask/LocalShellTask.js";
import { BACKGROUND_COMMAND_PREFIX, formatExitCodeSuffix } from "../constants/xml.js";
import { BACKGROUND_STOP_REASONS } from "./LocalShellTask/backgroundNotices.js";
import { isPanelAgentTask } from "./taskKinds.js";
import { FLAG_IDLE_WINDOW } from "./LocalAgentTask/keepalive.js";

/**
 * 主会话后台任务的默认代理定义（agentType=main-session，系统提示词为空），以及 ID 随机部分字母表。
 */
//@ chunk-e6aww6q8.js:4736672-4736826 fingerprint = DEFAULT_MAIN_SESSION_AGENT (0.881)
var DEFAULT_MAIN_SESSION_AGENT = {
    agentType: "main-session",
    whenToUse: "Main session query",
    source: "userSettings",
    getSystemPrompt: () => "",
  },
  MAIN_SESSION_ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
/**
 * 生成主会话任务 ID："s" + 8 个随机 36 进制字符。
 */
//@ chunk-e6aww6q8.js:4736826-4736913 file-local
function generateMainSessionTaskId() {
  let bytes = randomBytes_12(8),
    id = "s";
  for (let r = 0; r < 8; r++) id += MAIN_SESSION_ID_ALPHABET[bytes[r] % MAIN_SESSION_ID_ALPHABET.length];
  return id;
}
/**
 * 注册主会话后台任务（local_agent / agentType=main-session / isBackgrounded=true），返回 {taskId, abortSignal}。
 */
//@ chunk-e6aww6q8.js:4736913-4737478 fingerprint = registerMainSessionTask (0.935)
function registerMainSessionTask(description, taskRegistry, agentDefinition) {
  let taskId = generateMainSessionTaskId();
  SKe(taskId);
  let abortController = createAbortController(),
    selectedAgent = agentDefinition ?? DEFAULT_MAIN_SESSION_AGENT,
    taskState = {
      ...createTaskStateBase(taskId, "local_agent", description),
      type: "local_agent",
      status: "running",
      agentId: taskId,
      ownerAgentId: mainAgentId(),
      prompt: description,
      selectedAgent: selectedAgent,
      agentType: "main-session",
      abortController: abortController,
      retrieved: !1,
      lastReportedToolCount: 0,
      lastReportedTokenCount: 0,
      isBackgrounded: !0,
      pendingMessages: [],
      retain: !1,
      diskLoaded: !1,
    };
  return (
    logForDebugging(`[LocalMainSessionTask] Registering task ${taskId} with description: ${description}`),
    taskRegistry.register(taskState),
    logForDebugging(
      `[LocalMainSessionTask] After registration, task ${taskId} exists in state: ${taskRegistry.get(taskId) !== void 0}`,
    ),
    { taskId: taskId, abortSignal: abortController.signal }
  );
}
/**
 * 主会话后台任务结束：标 completed/failed（notified=true），transcript 只留最后一条，回收输出，记计数并发终止通知。
 */
//@ chunk-e6aww6q8.js:4737478-4737895 fingerprint = completeMainSessionTask (0.554)
function completeMainSessionTask(taskId, success, taskRegistry) {
  let status = success ? "completed" : "failed",
    toolUseId,
    description;
  if (
    (taskRegistry.update(taskId, (task) => {
      if (task.status !== "running") return task;
      return (
        (toolUseId = task.toolUseId),
        (description = task.description),
        { ...task, status: status, endTime: Date.now(), notified: !0 }
      );
    }),
    taskRegistry.updateTranscript(taskId, (task) => ({
      ...task,
      messages: task.messages.length ? [task.messages.at(-1)] : [],
    })),
    evictTaskOutput(taskId),
    description === void 0)
  )
    return;
  if (success) logFeatureOk("task_main_session");
  else logFeatureBad("task_main_session", "task_main_session_failed");
  emitTaskNotification(taskId, status, { toolUseId: toolUseId, summary: description });
}
/**
 * 是否是主会话后台任务（local_agent 且 agentType=main-session）。
 */
//@ chunk-e6aww6q8.js:4737895-4738048 fingerprint = isMainSessionTask (1)
function isMainSessionTask(task) {
  if (typeof task !== "object" || task === null || !("type" in task) || !("agentType" in task)) return !1;
  return task.type === "local_agent" && task.agentType === "main-session";
}
/**
 * 主会话后台任务进度里保留的最近工具活动数（5）。
 */
//@ chunk-e6aww6q8.js:4738048-4738058 layout
var MAX_MAIN_SESSION_ACTIVITIES = 5;
/**
 * 把主会话查询转到后台：注册任务，以 main-session 子代理身份（isMainSession/isBackgroundAgent）在独立上下文里继续跑 runQuery，
 * 边跑边写 sidechain transcript、更新 token/工具计数；中止时发 stopped 通知；结束调用 completeMainSessionTask。返回 taskId。
 */
//@ chunk-e6aww6q8.js:4738058-4740100 fingerprint = startBackgroundSession (0.683)
function startBackgroundSession({
  messages: messages,
  queryParams: queryParams,
  description: description,
  taskRegistry: taskRegistry,
  agentDefinition: agentDefinition,
  setAppState: setAppState,
}) {
  let { taskId: taskId, abortSignal: abortSignal } = registerMainSessionTask(
    description,
    taskRegistry,
    agentDefinition,
  );
  forgetMainChainOnHandOff();
  for (let Z of [queryParams.stickyBetas, queryParams.toolUseContext.stickyBetas]) if (Z !== void 0) Qun(Z);
  let storageV5 = queryParams.toolUseContext.storageV5;
  recordSidechainTranscript(messages, taskId, void 0, storageV5).catch((err) =>
    logForDebugging(`bg-session initial transcript write failed: ${err}`),
  );
  let parentAgentContext = queryParams.toolUseContext.agentContext,
    bgAgentContext = {
      agentId: taskId,
      parentAgentId: isMainAgent(parentAgentContext) ? void 0 : parentAgentContext.agentId,
      agentType: "subagent",
      subagentName: "main-session",
      isBuiltIn: !0,
      isAsync: !0,
      isMainSession: !0,
      isBackgroundAgent: !0,
    };
  return (
    runWithCwdOverride(bgAgentContext, async () => {
      let bgMessages = [...messages],
        compactState = null,
        lastRecordedUuid = messages.at(-1)?.uuid ?? null,
        recordTranscript = (Ae) => {
          let at = Ae.at(-1);
          if (at === void 0) return;
          (recordSidechainTranscript([...Ae], taskId, lastRecordedUuid, storageV5).catch((Me) =>
            logForDebugging(`bg-session transcript write failed: ${Me}`),
          ),
            (lastRecordedUuid = at.uuid));
        };
      using running = Mwt.running(
        taskId,
        Ebe({
          agentId: taskId,
          keep: (Ae) => {
            bgMessages.push(...Ae);
          },
          keepArrived: (Ae) => {
            (bgMessages.push(...Ae), recordTranscript(Ae));
          },
          rows: () => bgMessages,
          isHookable: !0,
        }),
      );
      try {
        let recentActivities = [],
          toolUseCount = 0,
          tokenCount = 0;
        for await (let event of queryParams.toolUseContext.options.runQuery({
          messages: bgMessages,
          ...queryParams,
          toolUseContext: {
            ...queryParams.toolUseContext,
            agentId: Mr(taskId),
            agentContext: bgAgentContext,
          },
        })) {
          if (abortSignal.aborted) {
            let ze = !1;
            if (
              (taskRegistry.update(
                taskId,
                (task) => ((ze = task.notified === !0), ze ? task : { ...task, notified: !0 }),
              ),
              !ze)
            )
              emitTaskNotification(taskId, "stopped", { summary: description });
            return;
          }
          if (event.type === "active_goal") {
            setAppState?.((err) =>
              err.activeGoal === event.value ? err : { ...err, activeGoal: event.value },
            );
            continue;
          }
          if (event.type !== "user" && event.type !== "assistant" && event.type !== "system") continue;
          if (
            (bgMessages.push(event),
            (compactState = applyPreservedMessages(bgMessages, event, compactState)),
            recordTranscript([event]),
            event.type === "assistant")
          ) {
            for (let block of event.message.content)
              if (block.type === "text") tokenCount += roughTokenCountEstimation(block.text);
              else if (block.type === "tool_use") {
                if ((toolUseCount++, S4(block.name))) continue;
                let activity = { toolName: block.name, input: block.input };
                if ((recentActivities.push(activity), recentActivities.length > MAX_MAIN_SESSION_ACTIVITIES))
                  recentActivities.shift();
              }
          }
          (taskRegistry.update(taskId, (prev) => {
            let prevProgress = prev.progress;
            if (prevProgress?.tokenCount === tokenCount && prevProgress.toolUseCount === toolUseCount)
              return prev;
            return {
              ...prev,
              progress: {
                tokenCount: tokenCount,
                toolUseCount: toolUseCount,
                recentActivities:
                  prevProgress?.toolUseCount === toolUseCount
                    ? prevProgress.recentActivities
                    : [...recentActivities],
              },
            };
          }),
            taskRegistry.updateTranscript(taskId, (ze) =>
              ze.messages === bgMessages ? ze : { ...ze, messages: bgMessages },
            ));
        }
        completeMainSessionTask(taskId, !0, taskRegistry);
      } catch (error) {
        (logError(withTelemetryMessage(toError(error), "startBackgroundSession: query loop failed")),
          completeMainSessionTask(taskId, !1, taskRegistry));
      } finally {
        if (compactState) bgMessages.push(...compactState.preserved);
      }
    }),
    taskId
  );
}
/**
 * 生成后台任务（shell/monitor）结束时的一行摘要："<前缀>"desc" completed / failed with exit code N / was stopped"；monitor 走专用文案。
 */
//@ chunk-e6aww6q8.js:4746602-4746907 fingerprint = enqueueMainSessionNotification (0.43)
function formatTaskTerminalSummary(kind, description, status, exitCode, stdoutBytes, exitNote, killReason) {
  if (kind === "monitor")
    return formatMonitorTerminalSummary(
      description,
      status,
      exitCode,
      stdoutBytes === void 0 ? void 0 : stdoutBytes > 0,
    );
  switch (status) {
    case "completed":
      return `${BACKGROUND_COMMAND_PREFIX}"${description}" completed${exitCode !== void 0 ? formatExitCodeSuffix(exitCode, exitNote) : ""}`;
    case "failed":
      return `${BACKGROUND_COMMAND_PREFIX}"${description}" failed${exitCode !== void 0 ? ` with exit code ${exitCode}` : ""}`;
    case "killed":
      return `${BACKGROUND_COMMAND_PREFIX}"${description}" was ${killReason ? BACKGROUND_STOP_REASONS[killReason] : "stopped"}`;
  }
}
/**
 * 已完成、在后台、未静默停放、且只剩"空闲窗口"保活的面板子代理（可在 UI 中"拉回前台"查看）。
 */
//@ chunk-18hwfzwa.js:441440-441612 fingerprint = foregroundMainSessionTask (0.545)
function isIdleCompletedSubagent(task) {
  return (
    task.type === "local_agent" &&
    task.status === "completed" &&
    isPanelAgentTask(task) &&
    task.isBackgrounded &&
    !isObserverAgentTask(task) &&
    task.quietlyParked !== !0 &&
    [...(task.keepaliveReasons ?? [])].every((prev) => prev === FLAG_IDLE_WINDOW)
  );
}

export { startBackgroundSession, isIdleCompletedSubagent, isMainSessionTask, formatTaskTerminalSummary };

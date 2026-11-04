/**
 * services/workflow/launch.ts
 *
 * 2.1.316 新增：工作流启动
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (10)
 * attribution: placement 10
 */
import {
  getIsNonInteractiveSession,
  isReplBridgeActive,
  getTotalOutputTokens,
} from "../../bootstrap/state.js";
import { isToolDetailsLoggingEnabled } from "../analytics/metadata.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit, fromEnum } from "../analytics/safeMetadata.js";
import {
  HIDDEN_SCRIPT_RECORD_FAILED_TEXT,
  WITHHELD_ERROR_TEXT,
  registerWorkflowTask,
  updateWorkflowProgressBatch,
  isWorkflowLogRow,
  redactAgentProgress,
  redactWorkflowProgress,
  setWorkflowRateLimitWait,
  failWorkflowTask,
  completeWorkflowTask,
  enqueueWorkflowNotification,
} from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import {
  isTaskLoopSettled,
  registerTaskLoop,
  setAgentController,
  removeAgentController,
} from "../../tasks/taskLoopRegistry.js";
import { resolveVisibleSubagentId } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { resolveContextPrimaryModel } from "../../Tool.js";
import { HiddenScriptShaCache } from "./journalEntries.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { emitTaskProgress } from "../../utils/task/sdkProgress.js";
import { openHiddenScriptJournal, createMirroredJournal } from "./journalStore.js";
import { logForDebugging } from "../../utils/debug.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { runWorkflowScript } from "./runScript.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeWorkflowRunId } from "./agentCall.js";
import { writeWorkflowSnapshot } from "./snapshots.js";
import { removeKeepaliveReason } from "../../utils/task/framework.js";
import { logError } from "../../utils/log.js";

//@ chunk-41w44bgm.js:101091-101115 placement
/**
 * 进度批量发送的三个时间常量（缓冲间隔、最小间隔、缓冲上限）。
 */
var PROGRESS_BATCH_INTERVAL_MS = 16;
var PROGRESS_BATCH_MIN_GAP_MS = 250;
var PROGRESS_BATCH_MAX_BUFFER = 1e4;
//@ chunk-41w44bgm.js:101115-101489 placement
/**
 * 工作流进度批量发送器：进度先缓冲、定时冲刷；REPL 桥接活跃时限制发送频率；每批回调 onBatch，非交互或桥接会话再经 onSdkEmit 发出；支持立即冲刷和取消。
 */
function createProgressBatcher(sink) {
  let pending = [];
  let timer;
  let lastFlushMs = 0;
  let flush = (force) => {
    timer = undefined;
    if (pending.length === 0) return;
    if (!force && !getIsNonInteractiveSession() && isReplBridgeActive()) {
      let waitMs = lastFlushMs + PROGRESS_BATCH_MIN_GAP_MS - Date.now();
      if (waitMs > 0) {
        timer = setTimeout(flush, waitMs);
        return;
      }
      lastFlushMs = Date.now();
    }
    let batch = pending;
    pending = [];
    sink.onBatch(batch);
    if (!getIsNonInteractiveSession() && !isReplBridgeActive()) return;
    sink.onSdkEmit(batch);
  };
  return {
    onProgress: (item) => {
      pending.push(item);
      if (!timer) timer = setTimeout(flush, PROGRESS_BATCH_INTERVAL_MS);
    },
    flushNow: () => {
      if (timer) clearTimeout(timer);
      flush(true);
    },
    cancel: () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      pending = [];
    },
  };
}
//@ chunk-41w44bgm.js:101489-101543 placement
/**
 * 非内置时代理来源记为 custom（内置且允许时按原值）。
 */
function agentSourceKindForTelemetry(name, scriptIsVerbatimBuiltIn) {
  if (scriptIsVerbatimBuiltIn) return name;
  return isToolDetailsLoggingEnabled() ? name : "custom";
}
//@ chunk-41w44bgm.js:101543-101586 placement = _temp1 (1)
function isBuiltInWithFlag(a_9, hasFlag) {
  return a_9 === "built-in" && hasFlag;
}
//@ chunk-41w44bgm.js:101586-101597 placement
var MAX_TELEMETRY_LABEL_CHARS = 200;
//@ chunk-41w44bgm.js:101597-101664 placement
/**
 * 内置代理名按原值上报，否则记为 custom。
 */
function agentNameForTelemetry(agentName, source, isBuiltIn) {
  if (isBuiltInWithFlag(source, isBuiltIn) && agentName)
    return fromSanitizer_SANITIZER_OUTPUT_ONLY(agentName);
  return lit("custom");
}
//@ chunk-41w44bgm.js:101664-101740 placement
/**
 * 内置代理标签截断后上报，否则空串。
 */
function agentLabelForTelemetry(description, source, isBuiltIn) {
  if (isBuiltInWithFlag(source, isBuiltIn))
    return fromSanitizer_SANITIZER_OUTPUT_ONLY((description ?? "").slice(0, MAX_TELEMETRY_LABEL_CHARS));
  return lit("");
}
//@ chunk-41w44bgm.js:101740-101803 placement
/**
 * 内置时按原值上报代理类型，否则记为 custom。
 */
function agentTypeForTelemetry(title, source, scriptIsVerbatimBuiltIn) {
  if (isBuiltInWithFlag(source, scriptIsVerbatimBuiltIn)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(title);
  return lit("custom");
}
//@ chunk-41w44bgm.js:101803-101844 placement
/**
 * 脚本记录失败时用统一的隐藏错误文案。
 */
function hideFailedScriptRecord(withholdScriptFromSdkEvents, failedText) {
  return withholdScriptFromSdkEvents && failedText !== HIDDEN_SCRIPT_RECORD_FAILED_TEXT
    ? WITHHELD_ERROR_TEXT
    : failedText;
}
//@ chunk-41w44bgm.js:101844-109680 placement
/**
 * 启动工作流运行：校验 v2 选项、准备脚本与日志、注册任务并开始执行。
 */
function launchWorkflowRun(options) {
  if (options.v2Run && options.withholdScriptFromSdkEvents)
    throw Error("A workflow v2 run cannot withhold its script");
  let {
    taskId,
    workflowRunId,
    script,
    scriptPath,
    args,
    meta,
    vmScript,
    toolUseContext,
    canUseTool,
    toolUseId,
    transcriptDir,
    telemetry,
    isResume,
    invokingRequestId,
    parentPromptId,
  } = options;
  let { description, name: workflowName } = meta;
  if (isResume) {
    if (!options.v2Run || !options.v2Run.founded) logFeatureOk("task_local_workflow_resume");
    for (let [key, value] of Object.entries(toolUseContext.taskRegistry.all()))
      if (
        value.type === "local_workflow" &&
        value.workflowRunId === workflowRunId &&
        value.status !== "running" &&
        !(isTerminalTaskStatus(value.status) && !isTaskLoopSettled(key))
      )
        toolUseContext.taskRegistry.remove(key);
  }
  let visibleSubagentId = resolveVisibleSubagentId(toolUseContext.agentId, toolUseContext.taskRegistry);
  let taskState = registerWorkflowTask({
    taskId,
    script,
    scriptPath,
    summary: description,
    workflowName,
    title: meta.title,
    phases: meta.phases,
    defaultModel: resolveContextPrimaryModel(toolUseContext.options),
    workflowRunId,
    args,
    ownerAgentId: visibleSubagentId,
    spawnerAgentId: toolUseContext.agentId,
    taskRegistry: toolUseContext.taskRegistry,
    toolUseId,
    startTime: options.startTime,
    withholdScriptFromSdkEvents: options.withholdScriptFromSdkEvents,
  });
  if (options.withholdScriptFromSdkEvents)
    toolUseContext.toolState
      .get(HiddenScriptShaCache)
      .scriptSha256ById.set(workflowRunId, computeContentHash(script));
  let releaseTaskLoop = registerTaskLoop(taskId, taskState.abortController, {
    settleRequiresEmptyAgentAssociations: true,
  });
  if (visibleSubagentId && !getIsNonInteractiveSession())
    addAgentKeepaliveReason(visibleSubagentId, `workflow:${taskId}`, toolUseContext.taskRegistry);
  let context = {
    ...toolUseContext,
    abortController: taskState.abortController ?? toolUseContext.abortController,
  };
  let v2Run = options.v2Run;
  if (v2Run)
    toolUseContext.taskRegistry.update(taskId, (workflowTask) => ({
      ...workflowTask,
      v2Run,
    }));
  let tokenBudget = {
    total: null,
    getTurnSpent: getTotalOutputTokens,
  };
  let outcome;
  (async () => {
    let lastProgressEmitAt = 0;
    let progressBatcher = createProgressBatcher({
      onBatch: (batch) => updateWorkflowProgressBatch(taskId, batch, toolUseContext.taskRegistry),
      onSdkEmit: (events) => {
        let filtered = events.filter(isWorkflowLogRow);
        if (filtered.length === 0) return;
        let task = context.getAppState()?.tasks?.[taskId];
        if (task?.type !== "local_workflow" || task.status !== "running") return;
        let progress = filtered.findLast((entry) => entry.type === "workflow_agent");
        let latestAgent =
          progress && options.withholdScriptFromSdkEvents ? redactAgentProgress(progress) : progress;
        let all = filtered.every((entry) => entry.type === "workflow_agent" && entry.state === "progress");
        let now = Date.now();
        let shouldEmit = !all || now - lastProgressEmitAt >= PROGRESS_BATCH_MAX_BUFFER;
        if (shouldEmit) lastProgressEmitAt = now;
        let progressSnapshot = shouldEmit ? task.workflowProgress.filter(isWorkflowLogRow) : undefined;
        emitTaskProgress({
          taskId,
          toolUseId,
          description: latestAgent
            ? latestAgent.phaseTitle
              ? `${latestAgent.phaseTitle}: ${latestAgent.label}`
              : latestAgent.label
            : taskState.description,
          startTime: taskState.startTime,
          totalTokens: task.totalTokens,
          toolUses: task.totalToolCalls,
          lastToolName: latestAgent?.label,
          summary: description,
          workflowProgress:
            options.withholdScriptFromSdkEvents && progressSnapshot
              ? redactWorkflowProgress(progressSnapshot)
              : progressSnapshot,
        });
      },
    });
    let onProgress = (progressEvent) => {
      if (progressEvent.type !== "progress") return;
      progressBatcher.onProgress(progressEvent.data);
    };
    let onAgentController = (agentIndex, controller) => {
      if (controller) {
        taskState.agentControllers?.set(agentIndex, controller);
        setAgentController(taskId, agentIndex, controller);
      } else {
        taskState.agentControllers?.delete(agentIndex);
        removeAgentController(taskId, agentIndex);
      }
    };
    let onRateLimitWait = (wait) => setWorkflowRateLimitWait(taskId, wait, toolUseContext.taskRegistry);
    let journal = options.withholdScriptFromSdkEvents
      ? await openHiddenScriptJournal({
          runId: workflowRunId,
          storageV5: toolUseContext.storageV5,
          hiddenScriptSha256: computeContentHash(script),
          isResume,
        }).catch((error) => {
          logForDebugging(`workflow journal: a hidden run's mark was not written: ${error}`, {
            level: "warn",
          });
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            HIDDEN_SCRIPT_RECORD_FAILED_TEXT,
            "a hidden workflow run's mark was not written",
          );
        })
      : createMirroredJournal(workflowRunId, toolUseContext.storageV5);
    if (!isResume && !options.withholdScriptFromSdkEvents)
      await journal
        .append({
          type: "launched",
        })
        .catch((error) =>
          logForDebugging(`workflow journal launched-append failed: ${error}`, {
            level: "warn",
          }),
        );
    let runResult = v2Run
      ? await v2Run.run(
          context,
          canUseTool,
          {
            onProgress,
            onAgentController,
            onRateLimitWait,
          },
          {
            args,
            seedPhaseTitles: meta.phases?.map((phase) => phase.title),
            tokenBudget,
            workflowName: agentSourceKindForTelemetry(meta.name, telemetry.scriptIsVerbatimBuiltIn),
            invokingRequestId,
            parentPromptId,
            journal,
          },
        )
      : await runWorkflowScript(vmScript, context, canUseTool, {
          workflowRunId,
          onProgress,
          onAgentController,
          onRateLimitWait,
          args,
          seedPhaseTitles: meta.phases?.map((phase) => phase.title),
          tokenBudget,
          journal,
          workflowName: agentSourceKindForTelemetry(meta.name, telemetry.scriptIsVerbatimBuiltIn),
          invokingRequestId,
          parentPromptId,
          withholdScript: options.withholdScriptFromSdkEvents,
        });
    if (unwrapAbortReason(taskState.abortController?.signal.reason) === "background") {
      outcome = {
        status: "adopted",
      };
      progressBatcher.cancel();
      return;
    }
    progressBatcher.flushNow();
    let task = context.getAppState()?.tasks?.[taskId];
    let workflowProgress = (task?.workflowProgress ?? []).filter((entry) => entry.type !== "workflow_log");
    let totalTokens = task?.totalTokens ?? 0;
    let totalToolCalls = task?.totalToolCalls ?? 0;
    let status = taskState.abortController?.signal.aborted
      ? "killed"
      : runResult.error
        ? "failed"
        : "completed";
    outcome =
      status === "killed"
        ? {
            status: "killed",
          }
        : runResult.error
          ? {
              status: "failed",
              error: runResult.error,
              agentCount: runResult.agentCount,
              logs: runResult.logs,
              durationMs: runResult.durationMs,
            }
          : {
              status: "completed",
              result: runResult.result,
              agentCount: runResult.agentCount,
              logs: runResult.logs,
              failures: runResult.failures,
              durationMs: runResult.durationMs,
            };
    logEvent("tengu_workflow_completed", {
      workflow_run_id: sanitizeWorkflowRunId(workflowRunId),
      workflow_source: fromEnum(telemetry.source),
      workflow_name: telemetry.name,
      workflow_description: telemetry.description,
      status: fromEnum(status),
      agent_count: runResult.agentCount,
      total_tokens: totalTokens,
      total_tool_calls: totalToolCalls,
      duration_ms: runResult.durationMs,
    });
    if (!v2Run) {
      let fields = {
        agents: runResult.agentCount,
        duration_ms: runResult.durationMs,
      };
      switch (status) {
        case "completed":
          logFeatureOk("workflow_run", fields);
          break;
        case "failed":
          logFeatureBad("workflow_run", "failed", fields);
          break;
        case "killed":
          logFeatureSad("workflow_run", "killed", fields);
          break;
      }
    }
    if (isBuiltInWithFlag(telemetry.source, telemetry.scriptIsVerbatimBuiltIn)) {
      let phaseBuckets = new Map();
      for (let entry of task?.workflowProgress ?? []) {
        if (entry.type !== "workflow_agent") continue;
        if (entry.phaseIndex === undefined || !entry.phaseTitle) continue;
        let bucket = phaseBuckets.get(entry.phaseIndex);
        if (!bucket) {
          bucket = {
            title: entry.phaseTitle,
            tokens: 0,
            toolCalls: 0,
            durationMs: 0,
            agentCount: 0,
            errorCount: 0,
            skipCount: 0,
          };
          phaseBuckets.set(entry.phaseIndex, bucket);
        }
        bucket.tokens += entry.tokens ?? 0;
        bucket.toolCalls += entry.toolCalls ?? 0;
        bucket.durationMs += entry.durationMs ?? 0;
        bucket.agentCount += 1;
        if (entry.state === "error")
          if (entry.error === "skipped by user") bucket.skipCount += 1;
          else bucket.errorCount += 1;
      }
      for (let [phaseIndex, phaseStats] of phaseBuckets)
        logEvent("tengu_workflow_phase_completed", {
          workflow_run_id: sanitizeWorkflowRunId(workflowRunId),
          workflow_source: fromEnum(telemetry.source),
          workflow_name: telemetry.name,
          phase_index: phaseIndex,
          phase_title: agentTypeForTelemetry(
            phaseStats.title,
            telemetry.source,
            telemetry.scriptIsVerbatimBuiltIn,
          ),
          phase_tokens: phaseStats.tokens,
          phase_tool_calls: phaseStats.toolCalls,
          phase_agent_duration_ms: phaseStats.durationMs,
          phase_agent_count: phaseStats.agentCount,
          phase_error_count: phaseStats.errorCount,
          phase_skip_count: phaseStats.skipCount,
        });
    }
    writeWorkflowSnapshot(
      workflowRunId,
      {
        taskId,
        script,
        scriptPath,
        args,
        result: runResult.result,
        agentCount: runResult.agentCount,
        logs: runResult.logs,
        durationMs: runResult.durationMs,
        error: runResult.error,
        summary: description,
        workflowName,
        title: meta.title,
        status,
        startTime: taskState.startTime,
        phases: taskState.phases,
        defaultModel: taskState.defaultModel,
        workflowProgress,
        totalTokens,
        totalToolCalls,
      },
      toolUseContext.storageV5,
    );
    if (taskState.abortController?.signal.aborted) return;
    let usage = {
      total_tokens: totalTokens,
      tool_uses: totalToolCalls,
      duration_ms: runResult.durationMs,
    };
    if (runResult.error) {
      let error = hideFailedScriptRecord(options.withholdScriptFromSdkEvents, runResult.error);
      failWorkflowTask(taskId, error, runResult.agentCount, runResult.logs, toolUseContext.taskRegistry, {
        summary: `Dynamic workflow "${description}" failed: ${error}`,
        output_file: taskState.outputFile,
        usage,
      });
    } else
      completeWorkflowTask(
        taskId,
        runResult.result,
        runResult.agentCount,
        runResult.logs,
        toolUseContext.taskRegistry,
        {
          summary: `Dynamic workflow "${description}" completed`,
          output_file: taskState.outputFile,
          usage,
        },
      );
    if (v2Run && !v2Run.isKilled && v2Run.isActive) v2Run.reopen?.();
    if (options.suppressCompletionNotification) {
      toolUseContext.taskRegistry.update(taskId, (task) => ({
        ...task,
        notified: true,
      }));
      removeKeepaliveReason(visibleSubagentId, `workflow:${taskId}`, toolUseContext.taskRegistry);
    } else
      enqueueWorkflowNotification({
        taskId,
        summary: description,
        status: runResult.error ? "failed" : "completed",
        error:
          runResult.error === undefined
            ? undefined
            : hideFailedScriptRecord(options.withholdScriptFromSdkEvents, runResult.error),
        result: runResult.result,
        failures: options.withholdScriptFromSdkEvents
          ? runResult.failures.map(() => WITHHELD_ERROR_TEXT)
          : runResult.failures,
        foreignArtifactContent: runResult.foreignArtifactContent,
        toolsUsed: runResult.toolsUsed,
        usageLimitDenial: runResult.usageLimitDenial,
        agentCount: runResult.agentCount,
        totalTokens,
        totalToolCalls,
        durationMs: runResult.durationMs,
        taskRegistry: toolUseContext.taskRegistry,
        toolUseId,
        transcriptDir,
        scriptPath,
        workflowRunId,
        args,
        workflowProgress,
      });
  })()
    .catch((error) => {
      logError(error);
      let message = error instanceof Error ? error.message : String(error);
      let task = context.getAppState()?.tasks?.[taskId];
      let agentCount = task?.agentCount ?? 0;
      if (task?.status !== "completed" && outcome?.status !== "killed")
        outcome = {
          status: "failed",
          error: message,
          agentCount,
          logs: task?.logs ?? [],
          durationMs: Date.now() - taskState.startTime,
        };
      let error_2 = hideFailedScriptRecord(options.withholdScriptFromSdkEvents, message);
      failWorkflowTask(taskId, error_2, agentCount, task?.logs ?? [], toolUseContext.taskRegistry, {
        summary: `Dynamic workflow "${description}" failed: ${error_2}`,
        output_file: taskState.outputFile,
        usage: {
          total_tokens: task?.totalTokens ?? 0,
          tool_uses: task?.totalToolCalls ?? 0,
          duration_ms: Date.now() - taskState.startTime,
        },
      });
      if (options.suppressCompletionNotification) {
        toolUseContext.taskRegistry.update(taskId, (task) => ({
          ...task,
          notified: true,
        }));
        removeKeepaliveReason(visibleSubagentId, `workflow:${taskId}`, toolUseContext.taskRegistry);
      } else
        enqueueWorkflowNotification({
          taskId,
          summary: description,
          status: "failed",
          error: error_2,
          agentCount,
          totalTokens: task?.totalTokens ?? 0,
          totalToolCalls: task?.totalToolCalls ?? 0,
          durationMs: Date.now() - taskState.startTime,
          taskRegistry: toolUseContext.taskRegistry,
          toolUseId,
          transcriptDir,
          scriptPath,
          workflowRunId,
          args,
          workflowProgress: task?.workflowProgress,
        });
    })
    .finally(() => {
      releaseTaskLoop();
      if (!options.onSettled) return;
      try {
        options.onSettled(
          outcome ?? {
            status: "unknown",
          },
        );
      } catch (error) {
        logError(error);
      }
    });
  return taskState;
}
export { agentNameForTelemetry, agentLabelForTelemetry, launchWorkflowRun, isBuiltInWithFlag };

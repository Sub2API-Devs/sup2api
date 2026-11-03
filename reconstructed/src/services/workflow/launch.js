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
function createProgressBatcher(e) {
  let n = [];
  let r;
  let h = 0;
  let T = (y) => {
    r = undefined;
    if (n.length === 0) return;
    if (!y && !getIsNonInteractiveSession() && isReplBridgeActive()) {
      let L = h + PROGRESS_BATCH_MIN_GAP_MS - Date.now();
      if (L > 0) {
        r = setTimeout(T, L);
        return;
      }
      h = Date.now();
    }
    let A = n;
    n = [];
    e.onBatch(A);
    if (!getIsNonInteractiveSession() && !isReplBridgeActive()) return;
    e.onSdkEmit(A);
  };
  return {
    onProgress: (y) => {
      n.push(y);
      if (!r) r = setTimeout(T, PROGRESS_BATCH_INTERVAL_MS);
    },
    flushNow: () => {
      if (r) clearTimeout(r);
      T(true);
    },
    cancel: () => {
      if (r) {
        clearTimeout(r);
        r = undefined;
      }
      n = [];
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
function isBuiltInWithFlag(a_9, n) {
  return a_9 === "built-in" && n;
}
//@ chunk-41w44bgm.js:101586-101597 placement
var MAX_TELEMETRY_LABEL_CHARS = 200;
//@ chunk-41w44bgm.js:101597-101664 placement
/**
 * 内置代理名按原值上报，否则记为 custom。
 */
function agentNameForTelemetry(e, n, r) {
  if (isBuiltInWithFlag(n, r) && e) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  return lit("custom");
}
//@ chunk-41w44bgm.js:101664-101740 placement
/**
 * 内置代理标签截断后上报，否则空串。
 */
function agentLabelForTelemetry(description, n, r) {
  if (isBuiltInWithFlag(n, r))
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
function hideFailedScriptRecord(withholdScriptFromSdkEvents, error) {
  return withholdScriptFromSdkEvents && error !== HIDDEN_SCRIPT_RECORD_FAILED_TEXT
    ? WITHHELD_ERROR_TEXT
    : error;
}
//@ chunk-41w44bgm.js:101844-109680 placement
/**
 * 启动工作流运行：校验 v2 选项、准备脚本与日志、注册任务并开始执行。
 */
function launchWorkflowRun(e) {
  if (e.v2Run && e.withholdScriptFromSdkEvents) throw Error("A workflow v2 run cannot withhold its script");
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
  } = e;
  let { description, name: s } = meta;
  if (isResume) {
    if (!e.v2Run || !e.v2Run.founded) logFeatureOk("task_local_workflow_resume");
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
  let w = registerWorkflowTask({
    taskId,
    script,
    scriptPath,
    summary: description,
    workflowName: s,
    title: meta.title,
    phases: meta.phases,
    defaultModel: resolveContextPrimaryModel(toolUseContext.options),
    workflowRunId,
    args,
    ownerAgentId: visibleSubagentId,
    spawnerAgentId: toolUseContext.agentId,
    taskRegistry: toolUseContext.taskRegistry,
    toolUseId,
    startTime: e.startTime,
    withholdScriptFromSdkEvents: e.withholdScriptFromSdkEvents,
  });
  if (e.withholdScriptFromSdkEvents)
    toolUseContext.toolState
      .get(HiddenScriptShaCache)
      .scriptSha256ById.set(workflowRunId, computeContentHash(script));
  let P = registerTaskLoop(taskId, w.abortController, {
    settleRequiresEmptyAgentAssociations: true,
  });
  if (visibleSubagentId && !getIsNonInteractiveSession())
    addAgentKeepaliveReason(visibleSubagentId, `workflow:${taskId}`, toolUseContext.taskRegistry);
  let context = {
    ...toolUseContext,
    abortController: w.abortController ?? toolUseContext.abortController,
  };
  let v2Run = e.v2Run;
  if (v2Run)
    toolUseContext.taskRegistry.update(taskId, (ue) => ({
      ...ue,
      v2Run,
    }));
  let tokenBudget = {
    total: null,
    getTurnSpent: getTotalOutputTokens,
  };
  let q;
  (async () => {
    let ue = 0;
    let progressBatcher = createProgressBatcher({
      onBatch: (Se) => updateWorkflowProgressBatch(taskId, Se, toolUseContext.taskRegistry),
      onSdkEmit: (Se) => {
        let filtered = Se.filter(isWorkflowLogRow);
        if (filtered.length === 0) return;
        let Ie = context.getAppState()?.tasks?.[taskId];
        if (Ie?.type !== "local_workflow" || Ie.status !== "running") return;
        let last = filtered.findLast((Kt) => Kt.type === "workflow_agent");
        let zt = last && e.withholdScriptFromSdkEvents ? redactAgentProgress(last) : last;
        let all = filtered.every((Kt) => Kt.type === "workflow_agent" && Kt.state === "progress");
        let now = Date.now();
        let kn = !all || now - ue >= PROGRESS_BATCH_MAX_BUFFER;
        if (kn) ue = now;
        let fn = kn ? Ie.workflowProgress.filter(isWorkflowLogRow) : undefined;
        emitTaskProgress({
          taskId,
          toolUseId,
          description: zt ? (zt.phaseTitle ? `${zt.phaseTitle}: ${zt.label}` : zt.label) : w.description,
          startTime: w.startTime,
          totalTokens: Ie.totalTokens,
          toolUses: Ie.totalToolCalls,
          lastToolName: zt?.label,
          summary: description,
          workflowProgress: e.withholdScriptFromSdkEvents && fn ? redactWorkflowProgress(fn) : fn,
        });
      },
    });
    let onProgress = (Se) => {
      if (Se.type !== "progress") return;
      progressBatcher.onProgress(Se.data);
    };
    let onAgentController = (Se, Ye) => {
      if (Ye) {
        w.agentControllers?.set(Se, Ye);
        setAgentController(taskId, Se, Ye);
      } else {
        w.agentControllers?.delete(Se);
        removeAgentController(taskId, Se);
      }
    };
    let onRateLimitWait = (Se) => setWorkflowRateLimitWait(taskId, Se, toolUseContext.taskRegistry);
    let Wt = e.withholdScriptFromSdkEvents
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
    if (!isResume && !e.withholdScriptFromSdkEvents)
      await Wt.append({
        type: "launched",
      }).catch((error) =>
        logForDebugging(`workflow journal launched-append failed: ${error}`, {
          level: "warn",
        }),
      );
    let ye = v2Run
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
            journal: Wt,
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
          journal: Wt,
          workflowName: agentSourceKindForTelemetry(meta.name, telemetry.scriptIsVerbatimBuiltIn),
          invokingRequestId,
          parentPromptId,
          withholdScript: e.withholdScriptFromSdkEvents,
        });
    if (unwrapAbortReason(w.abortController?.signal.reason) === "background") {
      q = {
        status: "adopted",
      };
      progressBatcher.cancel();
      return;
    }
    progressBatcher.flushNow();
    let gt = context.getAppState()?.tasks?.[taskId];
    let workflowProgress = (gt?.workflowProgress ?? []).filter((Se) => Se.type !== "workflow_log");
    let totalTokens = gt?.totalTokens ?? 0;
    let totalToolCalls = gt?.totalToolCalls ?? 0;
    let kt = w.abortController?.signal.aborted ? "killed" : ye.error ? "failed" : "completed";
    q =
      kt === "killed"
        ? {
            status: "killed",
          }
        : ye.error
          ? {
              status: "failed",
              error: ye.error,
              agentCount: ye.agentCount,
              logs: ye.logs,
              durationMs: ye.durationMs,
            }
          : {
              status: "completed",
              result: ye.result,
              agentCount: ye.agentCount,
              logs: ye.logs,
              failures: ye.failures,
              durationMs: ye.durationMs,
            };
    logEvent("tengu_workflow_completed", {
      workflow_run_id: sanitizeWorkflowRunId(workflowRunId),
      workflow_source: fromEnum(telemetry.source),
      workflow_name: telemetry.name,
      workflow_description: telemetry.description,
      status: fromEnum(kt),
      agent_count: ye.agentCount,
      total_tokens: totalTokens,
      total_tool_calls: totalToolCalls,
      duration_ms: ye.durationMs,
    });
    if (!v2Run) {
      let Se = {
        agents: ye.agentCount,
        duration_ms: ye.durationMs,
      };
      switch (kt) {
        case "completed":
          logFeatureOk("workflow_run", Se);
          break;
        case "failed":
          logFeatureBad("workflow_run", "failed", Se);
          break;
        case "killed":
          logFeatureSad("workflow_run", "killed", Se);
          break;
      }
    }
    if (isBuiltInWithFlag(telemetry.source, telemetry.scriptIsVerbatimBuiltIn)) {
      let Se = new Map();
      for (let Ye of gt?.workflowProgress ?? []) {
        if (Ye.type !== "workflow_agent") continue;
        if (Ye.phaseIndex === undefined || !Ye.phaseTitle) continue;
        let Ie = Se.get(Ye.phaseIndex);
        if (!Ie) {
          Ie = {
            title: Ye.phaseTitle,
            tokens: 0,
            toolCalls: 0,
            durationMs: 0,
            agentCount: 0,
            errorCount: 0,
            skipCount: 0,
          };
          Se.set(Ye.phaseIndex, Ie);
        }
        Ie.tokens += Ye.tokens ?? 0;
        Ie.toolCalls += Ye.toolCalls ?? 0;
        Ie.durationMs += Ye.durationMs ?? 0;
        Ie.agentCount += 1;
        if (Ye.state === "error")
          if (Ye.error === "skipped by user") Ie.skipCount += 1;
          else Ie.errorCount += 1;
      }
      for (let [Ye, Ie] of Se)
        logEvent("tengu_workflow_phase_completed", {
          workflow_run_id: sanitizeWorkflowRunId(workflowRunId),
          workflow_source: fromEnum(telemetry.source),
          workflow_name: telemetry.name,
          phase_index: Ye,
          phase_title: agentTypeForTelemetry(Ie.title, telemetry.source, telemetry.scriptIsVerbatimBuiltIn),
          phase_tokens: Ie.tokens,
          phase_tool_calls: Ie.toolCalls,
          phase_agent_duration_ms: Ie.durationMs,
          phase_agent_count: Ie.agentCount,
          phase_error_count: Ie.errorCount,
          phase_skip_count: Ie.skipCount,
        });
    }
    writeWorkflowSnapshot(
      workflowRunId,
      {
        taskId,
        script,
        scriptPath,
        args,
        result: ye.result,
        agentCount: ye.agentCount,
        logs: ye.logs,
        durationMs: ye.durationMs,
        error: ye.error,
        summary: description,
        workflowName: s,
        title: meta.title,
        status: kt,
        startTime: w.startTime,
        phases: w.phases,
        defaultModel: w.defaultModel,
        workflowProgress,
        totalTokens,
        totalToolCalls,
      },
      toolUseContext.storageV5,
    );
    if (w.abortController?.signal.aborted) return;
    let usage = {
      total_tokens: totalTokens,
      tool_uses: totalToolCalls,
      duration_ms: ye.durationMs,
    };
    if (ye.error) {
      let error = hideFailedScriptRecord(e.withholdScriptFromSdkEvents, ye.error);
      failWorkflowTask(taskId, error, ye.agentCount, ye.logs, toolUseContext.taskRegistry, {
        summary: `Dynamic workflow "${description}" failed: ${error}`,
        output_file: w.outputFile,
        usage,
      });
    } else
      completeWorkflowTask(taskId, ye.result, ye.agentCount, ye.logs, toolUseContext.taskRegistry, {
        summary: `Dynamic workflow "${description}" completed`,
        output_file: w.outputFile,
        usage,
      });
    if (v2Run && !v2Run.isKilled && v2Run.isActive) v2Run.reopen?.();
    if (e.suppressCompletionNotification) {
      toolUseContext.taskRegistry.update(taskId, (Se) => ({
        ...Se,
        notified: true,
      }));
      removeKeepaliveReason(visibleSubagentId, `workflow:${taskId}`, toolUseContext.taskRegistry);
    } else
      enqueueWorkflowNotification({
        taskId,
        summary: description,
        status: ye.error ? "failed" : "completed",
        error:
          ye.error === undefined
            ? undefined
            : hideFailedScriptRecord(e.withholdScriptFromSdkEvents, ye.error),
        result: ye.result,
        failures: e.withholdScriptFromSdkEvents ? ye.failures.map(() => WITHHELD_ERROR_TEXT) : ye.failures,
        foreignArtifactContent: ye.foreignArtifactContent,
        toolsUsed: ye.toolsUsed,
        usageLimitDenial: ye.usageLimitDenial,
        agentCount: ye.agentCount,
        totalTokens,
        totalToolCalls,
        durationMs: ye.durationMs,
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
      let Ee = error instanceof Error ? error.message : String(error);
      let xe = context.getAppState()?.tasks?.[taskId];
      let agentCount = xe?.agentCount ?? 0;
      if (xe?.status !== "completed" && q?.status !== "killed")
        q = {
          status: "failed",
          error: Ee,
          agentCount,
          logs: xe?.logs ?? [],
          durationMs: Date.now() - w.startTime,
        };
      let error_2 = hideFailedScriptRecord(e.withholdScriptFromSdkEvents, Ee);
      failWorkflowTask(taskId, error_2, agentCount, xe?.logs ?? [], toolUseContext.taskRegistry, {
        summary: `Dynamic workflow "${description}" failed: ${error_2}`,
        output_file: w.outputFile,
        usage: {
          total_tokens: xe?.totalTokens ?? 0,
          tool_uses: xe?.totalToolCalls ?? 0,
          duration_ms: Date.now() - w.startTime,
        },
      });
      if (e.suppressCompletionNotification) {
        toolUseContext.taskRegistry.update(taskId, (Wt) => ({
          ...Wt,
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
          totalTokens: xe?.totalTokens ?? 0,
          totalToolCalls: xe?.totalToolCalls ?? 0,
          durationMs: Date.now() - w.startTime,
          taskRegistry: toolUseContext.taskRegistry,
          toolUseId,
          transcriptDir,
          scriptPath,
          workflowRunId,
          args,
          workflowProgress: xe?.workflowProgress,
        });
    })
    .finally(() => {
      P();
      if (!e.onSettled) return;
      try {
        e.onSettled(
          q ?? {
            status: "unknown",
          },
        );
      } catch (error) {
        logError(error);
      }
    });
  return w;
}
export { agentNameForTelemetry, agentLabelForTelemetry, launchWorkflowRun, isBuiltInWithFlag };

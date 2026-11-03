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
  XGn,
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
import { sFt } from "./journalEntries.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { emitTaskProgress } from "../../utils/task/sdkProgress.js";
import { openHiddenScriptJournal, createMirroredJournal } from "./journalStore.js";
import { logForDebugging } from "../../utils/debug.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { runWorkflowScript } from "./runScript.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { logEvent } from "../analytics/index.js";
import { En } from "./agentCall.js";
import { writeWorkflowSnapshot } from "./snapshots.js";
import { removeKeepaliveReason } from "../../utils/task/framework.js";
import { logError } from "../../utils/log.js";

//@ chunk-41w44bgm.js:101091-101115 placement
var Ji = 16,
  zi = 250,
  Ki = 1e4;
/**
 * 工作流进度批量发送器：进度先缓冲、定时冲刷；REPL 桥接活跃时限制发送频率；每批回调 onBatch，非交互或桥接会话再经 onSdkEmit 发出；支持立即冲刷和取消。
 */
//@ chunk-41w44bgm.js:101115-101489 placement
function createProgressBatcher(e) {
  let n = [],
    r,
    h = 0,
    T = (y) => {
      if (((r = void 0), n.length === 0)) return;
      if (!y && !getIsNonInteractiveSession() && isReplBridgeActive()) {
        let L = h + zi - Date.now();
        if (L > 0) {
          r = setTimeout(T, L);
          return;
        }
        h = Date.now();
      }
      let A = n;
      if (((n = []), e.onBatch(A), !getIsNonInteractiveSession() && !isReplBridgeActive())) return;
      e.onSdkEmit(A);
    };
  return {
    onProgress: (y) => {
      if ((n.push(y), !r)) r = setTimeout(T, Ji);
    },
    flushNow: () => {
      if (r) clearTimeout(r);
      T(!0);
    },
    cancel: () => {
      if (r) (clearTimeout(r), (r = void 0));
      n = [];
    },
  };
}
//@ chunk-41w44bgm.js:101489-101543 placement
function hs(e, n) {
  if (n) return e;
  return isToolDetailsLoggingEnabled() ? e : "custom";
}
//@ chunk-41w44bgm.js:101543-101586 placement = _temp1 (1)
function isBuiltInWithFlag(e, n) {
  return e === "built-in" && n;
}
//@ chunk-41w44bgm.js:101586-101597 placement
var Yi = 200;
//@ chunk-41w44bgm.js:101597-101664 placement
function WGn(e, n, r) {
  if (isBuiltInWithFlag(n, r) && e) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  return lit("custom");
}
//@ chunk-41w44bgm.js:101664-101740 placement
function GGn(e, n, r) {
  if (isBuiltInWithFlag(n, r)) return fromSanitizer_SANITIZER_OUTPUT_ONLY((e ?? "").slice(0, Yi));
  return lit("");
}
//@ chunk-41w44bgm.js:101740-101803 placement
function qi(e, n, r) {
  if (isBuiltInWithFlag(n, r)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  return lit("custom");
}
//@ chunk-41w44bgm.js:101803-101844 placement
function zo(e, n) {
  return e && n !== HIDDEN_SCRIPT_RECORD_FAILED_TEXT ? WITHHELD_ERROR_TEXT : n;
}
/**
 * 启动工作流运行：校验 v2 选项、准备脚本与日志、注册任务并开始执行。
 */
//@ chunk-41w44bgm.js:101844-109680 placement
function launchWorkflowRun(e) {
  if (e.v2Run && e.withholdScriptFromSdkEvents) throw Error("A workflow v2 run cannot withhold its script");
  let {
      taskId: taskId,
      workflowRunId: workflowRunId,
      script: script,
      scriptPath: scriptPath,
      args: args,
      meta: meta,
      vmScript: vmScript,
      toolUseContext: toolUseContext,
      canUseTool: canUseTool,
      toolUseId: toolUseId,
      transcriptDir: transcriptDir,
      telemetry: telemetry,
      isResume: isResume,
      invokingRequestId: invokingRequestId,
      parentPromptId: parentPromptId,
    } = e,
    { description: description, name: s } = meta;
  if (isResume) {
    if (!e.v2Run || !e.v2Run.founded) logFeatureOk("task_local_workflow_resume");
    for (let [ue, Ee] of Object.entries(toolUseContext.taskRegistry.all()))
      if (
        Ee.type === "local_workflow" &&
        Ee.workflowRunId === workflowRunId &&
        Ee.status !== "running" &&
        !(isTerminalTaskStatus(Ee.status) && !isTaskLoopSettled(ue))
      )
        toolUseContext.taskRegistry.remove(ue);
  }
  let S = resolveVisibleSubagentId(toolUseContext.agentId, toolUseContext.taskRegistry),
    w = registerWorkflowTask({
      taskId: taskId,
      script: script,
      scriptPath: scriptPath,
      summary: description,
      workflowName: s,
      title: meta.title,
      phases: meta.phases,
      defaultModel: resolveContextPrimaryModel(toolUseContext.options),
      workflowRunId: workflowRunId,
      args: args,
      ownerAgentId: S,
      spawnerAgentId: toolUseContext.agentId,
      taskRegistry: toolUseContext.taskRegistry,
      toolUseId: toolUseId,
      startTime: e.startTime,
      withholdScriptFromSdkEvents: e.withholdScriptFromSdkEvents,
    });
  if (e.withholdScriptFromSdkEvents)
    toolUseContext.toolState.get(sFt).scriptSha256ById.set(workflowRunId, computeContentHash(script));
  let P = registerTaskLoop(taskId, w.abortController, { settleRequiresEmptyAgentAssociations: !0 });
  if (S && !getIsNonInteractiveSession())
    addAgentKeepaliveReason(S, `workflow:${taskId}`, toolUseContext.taskRegistry);
  let V = { ...toolUseContext, abortController: w.abortController ?? toolUseContext.abortController },
    v2Run = e.v2Run;
  if (v2Run) toolUseContext.taskRegistry.update(taskId, (ue) => ({ ...ue, v2Run: v2Run }));
  let se = { total: null, getTurnSpent: getTotalOutputTokens },
    q;
  return (
    (async () => {
      let ue = 0,
        Ee = createProgressBatcher({
          onBatch: (Se) => updateWorkflowProgressBatch(taskId, Se, toolUseContext.taskRegistry),
          onSdkEmit: (Se) => {
            let filtered = Se.filter(XGn);
            if (filtered.length === 0) return;
            let Ie = V.getAppState()?.tasks?.[taskId];
            if (Ie?.type !== "local_workflow" || Ie.status !== "running") return;
            let last = filtered.findLast((Kt) => Kt.type === "workflow_agent"),
              zt = last && e.withholdScriptFromSdkEvents ? redactAgentProgress(last) : last,
              all = filtered.every((Kt) => Kt.type === "workflow_agent" && Kt.state === "progress"),
              now = Date.now(),
              kn = !all || now - ue >= Ki;
            if (kn) ue = now;
            let fn = kn ? Ie.workflowProgress.filter(XGn) : void 0;
            emitTaskProgress({
              taskId: taskId,
              toolUseId: toolUseId,
              description: zt ? (zt.phaseTitle ? `${zt.phaseTitle}: ${zt.label}` : zt.label) : w.description,
              startTime: w.startTime,
              totalTokens: Ie.totalTokens,
              toolUses: Ie.totalToolCalls,
              lastToolName: zt?.label,
              summary: description,
              workflowProgress: e.withholdScriptFromSdkEvents && fn ? redactWorkflowProgress(fn) : fn,
            });
          },
        }),
        xe = (Se) => {
          if (Se.type !== "progress") return;
          Ee.onProgress(Se.data);
        },
        ut = (Se, Ye) => {
          if (Ye) (w.agentControllers?.set(Se, Ye), setAgentController(taskId, Se, Ye));
          else (w.agentControllers?.delete(Se), removeAgentController(taskId, Se));
        },
        Tt = (Se) => setWorkflowRateLimitWait(taskId, Se, toolUseContext.taskRegistry),
        Wt = e.withholdScriptFromSdkEvents
          ? await openHiddenScriptJournal({
              runId: workflowRunId,
              storageV5: toolUseContext.storageV5,
              hiddenScriptSha256: computeContentHash(script),
              isResume: isResume,
            }).catch((Se) => {
              throw (
                logForDebugging(`workflow journal: a hidden run's mark was not written: ${Se}`, {
                  level: "warn",
                }),
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  HIDDEN_SCRIPT_RECORD_FAILED_TEXT,
                  "a hidden workflow run's mark was not written",
                )
              );
            })
          : createMirroredJournal(workflowRunId, toolUseContext.storageV5);
      if (!isResume && !e.withholdScriptFromSdkEvents)
        await Wt.append({ type: "launched" }).catch((Se) =>
          logForDebugging(`workflow journal launched-append failed: ${Se}`, { level: "warn" }),
        );
      let ye = v2Run
        ? await v2Run.run(
            V,
            canUseTool,
            { onProgress: xe, onAgentController: ut, onRateLimitWait: Tt },
            {
              args: args,
              seedPhaseTitles: meta.phases?.map((Se) => Se.title),
              tokenBudget: se,
              workflowName: hs(meta.name, telemetry.scriptIsVerbatimBuiltIn),
              invokingRequestId: invokingRequestId,
              parentPromptId: parentPromptId,
              journal: Wt,
            },
          )
        : await runWorkflowScript(vmScript, V, canUseTool, {
            workflowRunId: workflowRunId,
            onProgress: xe,
            onAgentController: ut,
            onRateLimitWait: Tt,
            args: args,
            seedPhaseTitles: meta.phases?.map((Se) => Se.title),
            tokenBudget: se,
            journal: Wt,
            workflowName: hs(meta.name, telemetry.scriptIsVerbatimBuiltIn),
            invokingRequestId: invokingRequestId,
            parentPromptId: parentPromptId,
            withholdScript: e.withholdScriptFromSdkEvents,
          });
      if (unwrapAbortReason(w.abortController?.signal.reason) === "background") {
        ((q = { status: "adopted" }), Ee.cancel());
        return;
      }
      Ee.flushNow();
      let gt = V.getAppState()?.tasks?.[taskId],
        filtered = (gt?.workflowProgress ?? []).filter((Se) => Se.type !== "workflow_log"),
        $t = gt?.totalTokens ?? 0,
        jt = gt?.totalToolCalls ?? 0,
        kt = w.abortController?.signal.aborted ? "killed" : ye.error ? "failed" : "completed";
      if (
        ((q =
          kt === "killed"
            ? { status: "killed" }
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
                }),
        logEvent("tengu_workflow_completed", {
          workflow_run_id: En(workflowRunId),
          workflow_source: fromEnum(telemetry.source),
          workflow_name: telemetry.name,
          workflow_description: telemetry.description,
          status: fromEnum(kt),
          agent_count: ye.agentCount,
          total_tokens: $t,
          total_tool_calls: jt,
          duration_ms: ye.durationMs,
        }),
        !v2Run)
      ) {
        let Se = { agents: ye.agentCount, duration_ms: ye.durationMs };
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
          if (Ye.phaseIndex === void 0 || !Ye.phaseTitle) continue;
          let Ie = Se.get(Ye.phaseIndex);
          if (!Ie)
            ((Ie = {
              title: Ye.phaseTitle,
              tokens: 0,
              toolCalls: 0,
              durationMs: 0,
              agentCount: 0,
              errorCount: 0,
              skipCount: 0,
            }),
              Se.set(Ye.phaseIndex, Ie));
          if (
            ((Ie.tokens += Ye.tokens ?? 0),
            (Ie.toolCalls += Ye.toolCalls ?? 0),
            (Ie.durationMs += Ye.durationMs ?? 0),
            (Ie.agentCount += 1),
            Ye.state === "error")
          )
            if (Ye.error === "skipped by user") Ie.skipCount += 1;
            else Ie.errorCount += 1;
        }
        for (let [Ye, Ie] of Se)
          logEvent("tengu_workflow_phase_completed", {
            workflow_run_id: En(workflowRunId),
            workflow_source: fromEnum(telemetry.source),
            workflow_name: telemetry.name,
            phase_index: Ye,
            phase_title: qi(Ie.title, telemetry.source, telemetry.scriptIsVerbatimBuiltIn),
            phase_tokens: Ie.tokens,
            phase_tool_calls: Ie.toolCalls,
            phase_agent_duration_ms: Ie.durationMs,
            phase_agent_count: Ie.agentCount,
            phase_error_count: Ie.errorCount,
            phase_skip_count: Ie.skipCount,
          });
      }
      if (
        (writeWorkflowSnapshot(
          workflowRunId,
          {
            taskId: taskId,
            script: script,
            scriptPath: scriptPath,
            args: args,
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
            workflowProgress: filtered,
            totalTokens: $t,
            totalToolCalls: jt,
          },
          toolUseContext.storageV5,
        ),
        w.abortController?.signal.aborted)
      )
        return;
      let $e = { total_tokens: $t, tool_uses: jt, duration_ms: ye.durationMs };
      if (ye.error) {
        let Se = zo(e.withholdScriptFromSdkEvents, ye.error);
        failWorkflowTask(taskId, Se, ye.agentCount, ye.logs, toolUseContext.taskRegistry, {
          summary: `Dynamic workflow "${description}" failed: ${Se}`,
          output_file: w.outputFile,
          usage: $e,
        });
      } else
        completeWorkflowTask(taskId, ye.result, ye.agentCount, ye.logs, toolUseContext.taskRegistry, {
          summary: `Dynamic workflow "${description}" completed`,
          output_file: w.outputFile,
          usage: $e,
        });
      if (v2Run && !v2Run.isKilled && v2Run.isActive) v2Run.reopen?.();
      if (e.suppressCompletionNotification)
        (toolUseContext.taskRegistry.update(taskId, (Se) => ({ ...Se, notified: !0 })),
          removeKeepaliveReason(S, `workflow:${taskId}`, toolUseContext.taskRegistry));
      else
        enqueueWorkflowNotification({
          taskId: taskId,
          summary: description,
          status: ye.error ? "failed" : "completed",
          error: ye.error === void 0 ? void 0 : zo(e.withholdScriptFromSdkEvents, ye.error),
          result: ye.result,
          failures: e.withholdScriptFromSdkEvents ? ye.failures.map(() => WITHHELD_ERROR_TEXT) : ye.failures,
          foreignArtifactContent: ye.foreignArtifactContent,
          toolsUsed: ye.toolsUsed,
          usageLimitDenial: ye.usageLimitDenial,
          agentCount: ye.agentCount,
          totalTokens: $t,
          totalToolCalls: jt,
          durationMs: ye.durationMs,
          taskRegistry: toolUseContext.taskRegistry,
          toolUseId: toolUseId,
          transcriptDir: transcriptDir,
          scriptPath: scriptPath,
          workflowRunId: workflowRunId,
          args: args,
          workflowProgress: filtered,
        });
    })()
      .catch((ue) => {
        logError(ue);
        let Ee = ue instanceof Error ? ue.message : String(ue),
          xe = V.getAppState()?.tasks?.[taskId],
          ut = xe?.agentCount ?? 0;
        if (xe?.status !== "completed" && q?.status !== "killed")
          q = {
            status: "failed",
            error: Ee,
            agentCount: ut,
            logs: xe?.logs ?? [],
            durationMs: Date.now() - w.startTime,
          };
        let Tt = zo(e.withholdScriptFromSdkEvents, Ee);
        if (
          (failWorkflowTask(taskId, Tt, ut, xe?.logs ?? [], toolUseContext.taskRegistry, {
            summary: `Dynamic workflow "${description}" failed: ${Tt}`,
            output_file: w.outputFile,
            usage: {
              total_tokens: xe?.totalTokens ?? 0,
              tool_uses: xe?.totalToolCalls ?? 0,
              duration_ms: Date.now() - w.startTime,
            },
          }),
          e.suppressCompletionNotification)
        )
          (toolUseContext.taskRegistry.update(taskId, (Wt) => ({ ...Wt, notified: !0 })),
            removeKeepaliveReason(S, `workflow:${taskId}`, toolUseContext.taskRegistry));
        else
          enqueueWorkflowNotification({
            taskId: taskId,
            summary: description,
            status: "failed",
            error: Tt,
            agentCount: ut,
            totalTokens: xe?.totalTokens ?? 0,
            totalToolCalls: xe?.totalToolCalls ?? 0,
            durationMs: Date.now() - w.startTime,
            taskRegistry: toolUseContext.taskRegistry,
            toolUseId: toolUseId,
            transcriptDir: transcriptDir,
            scriptPath: scriptPath,
            workflowRunId: workflowRunId,
            args: args,
            workflowProgress: xe?.workflowProgress,
          });
      })
      .finally(() => {
        if ((P(), !e.onSettled)) return;
        try {
          e.onSettled(q ?? { status: "unknown" });
        } catch (error) {
          logError(error);
        }
      }),
    w
  );
}

export { WGn, GGn, launchWorkflowRun, isBuiltInWithFlag };

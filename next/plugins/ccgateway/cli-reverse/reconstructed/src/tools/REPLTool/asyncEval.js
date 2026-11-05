/**
 * tools/REPLTool/asyncEval.ts
 *
 * 异步 eval 通道：派发、迟到输出、settle hook 与收据（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (8)
 * attribution: placement 8
 */
import { randomUUID } from "crypto";
import { evalTaskId, addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { removeKeepaliveReason } from "../../utils/task/framework.js";
import {
  REPL_MAIN_THREAD_KEY,
  isAsyncReplEnabled,
  isAsyncLaneMode,
  isCodeModeExperimentEnabled,
} from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getReplSessions, ASYNC_REPL_MAX_EVALS } from "../../state/replSessions.js";
import { stripWideningPermissionLayers } from "../../dialogLaunchers.js";
import { createLogBatcher } from "./outputBudget.js";
import { withheldFollowing, deliverSettle, lateOutputMarker, createSlot } from "./asyncSettle.js";
import { logForDebugging } from "../../utils/debug.js";
import { codeModeAccepted, isAccepted } from "../../utils/codeMode/accepted.js";
import { isScriptAskDeclinedAbort } from "../../utils/codeMode/scriptAskDeclined.js";
import { logError } from "../../utils/log.js";
import { isReplSpliceWaitEnabled } from "../../utils/codeMode/waitForNews.js";
import { replSettleWindowMs, replDetachAfterMs } from "../../utils/codeMode.js";
import { openScriptCallStream } from "../../utils/codeMode/scriptCallStream.js";
import { startListening, registerScriptStatus } from "./scriptStatus.js";
import { ReplStreamState, isStreamingOn } from "./toolMeta.js";
import { runScript, renderOutput } from "./runScript.js";
import { sleep } from "../../utils/sleep.js";
import { runAfterResultCommitted, matchesToolName } from "../../Tool.js";
import { outputText, parts } from "./render.js";
import { errorRowsForOutput, neverRanMessage, errorRows } from "./virtualMessages.js";
import { clientsDrawScriptCalls } from "../../utils/codeMode/vscodeExtensionStream.js";
import { TurnRegistry } from "../../query/replTurnLedger.js";
import { turnAbortDetachesEval } from "../../utils/codeMode/asyncReplReceipt.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { registerScriptTask, endScriptTask } from "../../tasks/localScriptTask.js";
import { syncLiveInFlightSnapshot } from "../../services/daemon/jobState.js";
import { summarizeBackgroundWork } from "../../tasks/backgroundTaskLabels.js";
import { POLL } from "../PollTool/prompt.js";
import { isMainSpawnedSubagent } from "../../utils/agentContext.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  watchWithheldResults,
  releaseWithheldWatch,
  withheldResultText,
} from "../../plugins/functionHooks/toolCallHooks.js";
import { REPL_TOOL_NAME } from "./constants.js";
import { createAbortController, unwrapAbortReason } from "../../utils/abortController.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { runPostToolUseHooks } from "../../services/tools/toolHooks.js";
import { EvalTool, replOutputSchema } from "./EvalTool.js";
import { isNullRenderingAttachment } from "../../components/messages/nullRenderingAttachments.js";
import { isAbortError } from "../../utils/errors.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import { tagError } from "./instrument.js";
import { STOPPED_BY_TASKSTOP_STATUS, STOPPED_BY_APP_STATUS, INTERRUPTED_STATUS } from "./stopReasons.js";

//@ chunk-n51jggtb.js:57958-58125 placement
/**
 * 按 agentId 与 evalId 记录运行中的脚本文档，结束时清理。
 */
function keepAgentAliveForEval({ agentId, evalId, ended, deliveries, taskRegistry }) {
  let keepaliveReason = evalTaskId(evalId);
  if (keepaliveReason === "") return;
  addAgentKeepaliveReason(agentId, keepaliveReason, taskRegistry);
  ended
    .then(() => Promise.allSettled(deliveries))
    .finally(() => removeKeepaliveReason(agentId, keepaliveReason, taskRegistry));
}
//@ chunk-n51jggtb.js:182894-189063 placement
/**
 * 异步 eval 分发：拒绝超深度、派发脚本、收集迟到输出并返回收据或结果。
 */
async function runAsyncEval({ input, toolUseContext, canUseTool, parentMessage, onProgress }) {
  if (usesAsyncRepl(toolUseContext)) {
    let agentId = toolUseContext.agentId ?? REPL_MAIN_THREAD_KEY;
    {
      let queuedCount = getReplSessions(toolUseContext).depth(agentId);
      if (queuedCount >= ASYNC_REPL_MAX_EVALS)
        return {
          data: {
            code: input.code,
            result: undefined,
            stdout: "",
            stderr: "",
            error: `async REPL dispatch rejected: ${queuedCount} evals already waiting or running \u2014 wait for their settles (Poll) before dispatching more`,
            asyncDispatched: true,
          },
        };
    }
    let dispatchCtx = {
      ...toolUseContext,
      permissionLayers: stripWideningPermissionLayers(toolUseContext.permissionLayers),
      namesShownToApi: undefined,
    };
    let replToolUseID = toolUseContext.toolUseId ?? `repl-async-${randomUUID()}`;
    let progress = {
      media: [],
    };
    let deliveries = [];
    let knCtx = {
      session: toolUseContext.session,
      agentId: toolUseContext.agentId,
      onQueued: (delivery, ok) => {
        if (ok) deliveries.push(delivery);
      },
      sessionHooks: toolUseContext.sessionHooksRegistry,
      getAppState: () => toolUseContext.getAppState(),
    };
    let evalState = {
      retired: () => false,
      startedAt: Date.now(),
    };
    let resolve = () => {};
    let promise = new Promise((resolve_2) => {
      resolve = resolve_2;
    });
    let abortController;
    let lateChain = promise;
    let lateBatchCount = 0;
    let lateLogs = createLogBatcher((entry, stdout) => {
      lateChain = lateChain
        .then(async () => {
          if (evalState.evalId === undefined || evalState.retired()) return;
          let evalId = evalState.evalId;
          let { output, rewritten, withheld, said } = await runWithHooks(
            {
              dispatchCtx,
              replToolUseID,
              parentMessage,
              input,
            },
            {
              code: input.code,
              result: null,
              stdout,
              stderr: "",
              evalId,
              late: true,
            },
            Date.now() - evalState.startedAt,
            "late batch",
            evalId,
          );
          if (evalState.retired()) return;
          let text = withheld ? (output.error ?? "") : output.stdout;
          let empty = text === "";
          let following = {
            messages: said,
            contextLayers: [],
            turn: toolUseContext.queryTracking?.chainId,
          };
          let delivery =
            withheld || empty ? withheldFollowing(following) : said.length > 0 ? following : undefined;
          if (empty && delivery === undefined) {
            logForDebugging(
              `async REPL eval #${evalId}: a late batch has nothing to deliver (empty, or a PostToolUse rewrite emptied it); not delivered`,
            );
            return;
          }
          lateBatchCount++;
          let text_2 = empty ? "A hook removed this output." : text;
          return deliverSettle(
            evalState.evalId,
            {
              text: text_2,
              media: [],
              parts: [
                lateOutputMarker(evalState.evalId),
                {
                  tag: "log",
                  text: text_2,
                },
              ],
              late: true,
              ...(delivery !== undefined && {
                following: delivery,
              }),
              ...(rewritten && {
                keepsRow: true,
              }),
              ...(codeModeAccepted() && {
                toolUseId: replToolUseID,
              }),
              ...(abortController !== undefined &&
                isScriptAskDeclinedAbort(abortController.signal) && {
                  startsTurn: false,
                }),
            },
            false,
            knCtx,
            evalState.retired,
            codeModeAccepted() ? evalState.heldByStop : undefined,
          );
        })
        .catch(logError);
    });
    let skillLoadAddsPromise;
    let skillLoadAdds = {
      newMessages: [],
      contextLayers: [],
    };
    let spliceWait = isReplSpliceWaitEnabled();
    let settleWindow = createSlot(spliceWait ? 0 : replSettleWindowMs());
    let scriptCallStream = openScriptCallStream(toolUseContext.toolUseId);
    startListening(toolUseContext.toolState.get(ReplStreamState), getReplSessions(toolUseContext));
    let detachedToolUseIds = [];
    let { evalId, retired, ended, stopped } = getReplSessions(toolUseContext).dispatch(
      agentId,
      async (callAbortController, unused) => {
        abortController = callAbortController;
        callAbortController.signal.addEventListener(
          "abort",
          () => {
            if (isScriptAskDeclinedAbort(callAbortController.signal))
              getReplSessions(toolUseContext).cancelWaiting(
                agentId,
                callAbortController.signal.reason,
                parentMessage.message.id,
              );
          },
          {
            once: true,
          },
        );
        let now = Date.now();
        evalState.startedAt = now;
        let result = await runScript(
          input,
          {
            ...dispatchCtx,
            abortController: callAbortController,
          },
          canUseTool,
          parentMessage,
          (event) => {
            if (onProgress !== undefined && settleWindow.open()) onProgress(event);
            scriptCallStream?.tick(event);
            if (event.type === "progress" && evalState.evalId !== undefined)
              getReplSessions(toolUseContext).recordTick(agentId, evalState.evalId, event.data);
          },
          "async",
          {
            skillLoadAdds,
            onLateLog: lateLogs.push,
            evalId: () => evalState.evalId,
            reportNotYetStarted: unused.reportNotYetStarted,
            onLatePhase: (latePhase) => {
              if (evalState.evalId === undefined) {
                latePhase.abort();
                return;
              }
              skillLoadAddsPromise = latePhase.idle
                .then(() => sleep(0))
                .then(() => {
                  let beforeCount = lateBatchCount;
                  lateLogs.flush();
                  return lateChain.then(() => lateBatchCount > beforeCount);
                });
              getReplSessions(toolUseContext).holdLate(agentId, evalState.evalId, {
                abort: latePhase.abort,
                discard: lateLogs.discard,
                idle: skillLoadAddsPromise.then(() => {}),
              });
            },
          },
        );
        detachedToolUseIds =
          "detachedToolUseIds" in result && result.detachedToolUseIds ? result.detachedToolUseIds : [];
        if (
          settleWindow.take({
            kind: "result",
            result,
            ms: Date.now() - now,
          })
        )
          return "";
        let extractedSkillAdds = takeSkillLoadAdds(skillLoadAdds);
        let following =
          extractedSkillAdds.newMessages.length > 0 || extractedSkillAdds.contextLayers.length > 0
            ? {
                messages: extractedSkillAdds.newMessages,
                contextLayers: extractedSkillAdds.contextLayers,
                turn: toolUseContext.queryTracking?.chainId,
              }
            : undefined;
        if (following !== undefined)
          progress = {
            ...progress,
            following,
          };
        runAfterResultCommitted(result, false, logError);
        let flattened = (result.newMessages ?? []).flatMap((message) =>
          message.type === "assistant" && message.isVirtual === true
            ? [message]
            : message.type === "user" && message.isVirtual === true
              ? [
                  {
                    ...message,
                    turnCompanion: true,
                  },
                ]
              : [],
        );
        let { output, rewritten, withheld, said } = await runWithHooks(
          {
            dispatchCtx,
            replToolUseID,
            parentMessage,
            input,
          },
          result.data,
          Date.now() - now,
          "settle",
          evalState.evalId,
        );
        let mergedFollowing =
          said.length > 0
            ? {
                messages: [...(following?.messages ?? []), ...said],
                contextLayers: following?.contextLayers ?? [],
                turn: toolUseContext.queryTracking?.chainId,
              }
            : following;
        let withheldFollowing_2 = withheld ? withheldFollowing(mergedFollowing) : mergedFollowing;
        let strippedOutput = {
          ...output,
          toolsUsed: undefined,
        };
        let rendered = await renderOutput(strippedOutput, replToolUseID, toolUseContext);
        progress = {
          media: rendered.media,
          ...(withheldFollowing_2 !== undefined && {
            following: withheldFollowing_2,
          }),
          ...(rendered.text === outputText(strippedOutput) && {
            parts: parts(strippedOutput),
          }),
          ms: Date.now() - now,
          rows: [...(withheld ? [] : flattened), ...errorRowsForOutput(output, clientsDrawScriptCalls())],
          ...(rewritten && {
            keepsRow: true,
          }),
          ...(toolUseContext.agentId === undefined &&
            isScriptAskDeclinedAbort(callAbortController.signal) && {
              startsTurn: false,
            }),
        };
        return rendered.text;
      },
      {
        signal: toolUseContext.abortController.signal,
        detachAfterMs: replDetachAfterMs(),
        ...(spliceWait && {
          staysAttachedOnTurnAbort: true,
        }),
        toolUseId: replToolUseID,
        description: input.description,
        replyId: parentMessage.message.id || undefined,
        deliver: (stream, text, failed, detached, heldByStop, neverRan) => {
          if (codeModeAccepted()) evalState.heldByStop = heldByStop;
          scriptCallStream?.ended(detached ? undefined : progress.rows, detachedToolUseIds);
          if (
            settleWindow.taken() ||
            (failed &&
              settleWindow.take({
                kind: "failed",
                text,
                neverRan,
              }))
          ) {
            resolve();
            return Promise.resolve();
          }
          if (detached) {
            lateLogs.discard();
            resolve();
            return Promise.resolve();
          }
          let progressUpdate =
            failed && progress.rows === undefined
              ? {
                  ...progress,
                  rows:
                    neverRan !== undefined
                      ? neverRanMessage(neverRan, clientsDrawScriptCalls(), false)
                      : errorRowsForOutput(
                          {
                            error: text,
                          },
                          clientsDrawScriptCalls(),
                        ),
                }
              : progress;
          return deliverSettle(
            stream,
            {
              text,
              ...progressUpdate,
              ...(codeModeAccepted() && {
                toolUseId: replToolUseID,
              }),
              ...(toolUseContext.agentId === undefined &&
                isScriptAskDeclinedAbort(stopped) && {
                  startsTurn: false,
                }),
            },
            failed,
            knCtx,
            evalState.retired,
            codeModeAccepted() ? heldByStop : undefined,
            () => scriptCallStream?.lost(),
          ).finally(resolve);
        },
      },
      input.code,
    );
    scriptCallStream?.awaitReceipt();
    evalState.evalId = evalId;
    evalState.retired = codeModeAccepted()
      ? () =>
          retired() ||
          toolUseContext.toolState?.get(TurnRegistry).endedLoops.has(toolUseContext.agentId) === true
      : retired;
    if (codeModeAccepted() && toolUseContext.agentId !== undefined)
      keepAgentAliveForEval({
        agentId: toolUseContext.agentId,
        evalId,
        ended,
        deliveries,
        taskRegistry: toolUseContext.taskRegistry,
      });
    let { signal } = toolUseContext.abortController;
    let turnAborted = false;
    let onAbort = () => {
      if (turnAbortDetachesEval(signal.reason)) {
        turnAborted = true;
        settleWindow.close();
      }
    };
    if (signal.aborted) onAbort();
    else
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
    let settled;
    try {
      settled = await settleWindow.settled;
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
    if (settled?.kind === "result")
      return {
        ...settled.result,
        data: {
          ...settled.result.data,
          evalId,
          ms: settled.ms,
        },
      };
    if (settled?.kind === "failed") {
      let { neverRan } = settled;
      return {
        data: {
          code: input.code,
          result: undefined,
          stdout: "",
          stderr: "",
          error: settled.text,
          asyncDispatched: true,
          ...(neverRan !== undefined && {
            neverRan,
          }),
        },
        ...(clientsDrawScriptCalls() && {
          hideRow: true,
          messagesFromOutput:
            neverRan !== undefined ? () => neverRanMessage(neverRan, true, true) : errorRows,
        }),
      };
    }
    getReplSessions(toolUseContext).callReturned(agentId, evalId);
    if (!getIsNonInteractiveSession()) {
      let { taskRegistry, storageV5 } = toolUseContext;
      let abortController = new AbortController();
      let scriptTask = registerScriptTask(taskRegistry, {
        description: input.description,
        toolUseId: toolUseContext.toolUseId,
        abortController,
      });
      abortController.signal.addEventListener(
        "abort",
        () =>
          getReplSessions(toolUseContext).abort(
            agentId,
            evalId,
            abortController.signal.reason === "user"
              ? "person"
              : abortController.signal.reason === "parent"
                ? "taskStop"
                : "session",
          ),
        {
          once: true,
        },
      );
      let endTask = (status) => {
        let removed = endScriptTask(scriptTask, taskRegistry, status);
        if (codeModeAccepted() && removed)
          syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
      };
      let killTask = () => endTask("killed");
      if (stopped.aborted) killTask();
      else
        stopped.addEventListener("abort", killTask, {
          once: true,
        });
      ended.then(async () => {
        stopped.removeEventListener("abort", killTask);
        endTask("completed");
        let kept = (await skillLoadAddsPromise?.catch(() => false)) ?? true;
        if (codeModeAccepted() && (evalState.retired() || !kept))
          syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5, {
            includeSettled: true,
          });
      });
    }
    let receipt = {
      code: input.code,
      result: `(dispatched #${evalId})`,
      stdout: "",
      stderr: "",
      evalId,
      asyncDispatched: true,
    };
    if (turnAborted) receipt.keptByTurnAbort = true;
    let lateSkillAdds = takeSkillLoadAdds(skillLoadAdds);
    return {
      data: receipt,
      ...(clientsDrawScriptCalls() && {
        hideRow: true,
      }),
      ...(lateSkillAdds.newMessages.length > 0 && {
        newMessages: lateSkillAdds.newMessages,
      }),
      ...(lateSkillAdds.contextLayers.length > 0 && {
        contextLayers: lateSkillAdds.contextLayers,
      }),
      ...(toolUseContext.toolUseId !== undefined && {
        detachedToolUseIds: [toolUseContext.toolUseId],
      }),
    };
  }
  let stopSessionNotice =
    toolUseContext.agentId === undefined && isStreamingOn()
      ? registerScriptStatus(
          toolUseContext.toolState.get(ReplStreamState),
          getReplSessions(toolUseContext),
          toolUseContext.toolUseId,
          input.description,
        )
      : () => {};
  try {
    return await runScript(input, toolUseContext, canUseTool, parentMessage, onProgress, "classic");
  } finally {
    stopSessionNotice();
  }
}
//@ chunk-n51jggtb.js:192336-192527 placement
/**
 * 判断当前是否走异步 eval 通道。
 */
function usesAsyncRepl(context) {
  let mode = context.getAppState().toolPermissionContext?.mode;
  let hasPoll = () =>
    context.options.tools.some((tool) => tool.isMcp !== true && matchesToolName(tool, POLL));
  return (
    isAsyncReplEnabled() &&
    (context.agentId === undefined || isMainSpawnedSubagent(context)) &&
    hasPoll() &&
    isAsyncLaneMode(mode) &&
    getToolPermissionContext(context).mode === mode
  );
}
//@ chunk-n51jggtb.js:192527-192880 placement
/**
 * 包装 PostToolUse hook 处理，扣留时清空输出并置 withheld。
 */
async function runWithHooks(request, output, elapsedMs, label, evalId) {
  let seenNotes = watchWithheldResults(request.replToolUseID);
  let withheld = false;
  let result;
  try {
    result = await runPostToolUse(request, output, elapsedMs, label, evalId);
  } finally {
    withheld = releaseWithheldWatch(request.replToolUseID, seenNotes);
  }
  return withheld
    ? {
        output: {
          code: result.output.code,
          stdout: "",
          stderr: "",
          error: withheldResultText(REPL_TOOL_NAME),
          ...(result.output.evalId !== undefined && {
            evalId: result.output.evalId,
          }),
          ...(result.output.late !== undefined && {
            late: result.output.late,
          }),
        },
        rewritten: true,
        withheld: true,
        said: result.said,
      }
    : {
        ...result,
        withheld: false,
      };
}
//@ chunk-n51jggtb.js:192880-194311 placement
/**
 * 跑异步 settle 的 PostToolUse hook 并校验输出形状。
 */
async function runPostToolUse(request, output, elapsedMs, label, evalId) {
  let { dispatchCtx, replToolUseID, parentMessage, input } = request;
  let hookLabel = `eval #${evalId ?? "?"} ${label}`;
  let rewritten = false;
  let said = [];
  let hookCtx = {
    ...dispatchCtx,
    abortController: createAbortController(),
  };
  for (let selection of isCustomizationDisabled("hooks")
    ? [undefined]
    : [
        {
          managedHooksExcluded: true,
        },
        {
          managedHooksOnly: true,
        },
      ]) {
    let label =
      selection === undefined
        ? hookLabel
        : selection.managedHooksOnly === true
          ? `${hookLabel}, managed-settings hooks`
          : `${hookLabel}, other hooks`;
    try {
      for await (let event of runPostToolUseHooks(
        hookCtx,
        EvalTool,
        replToolUseID,
        parentMessage.message.id,
        input,
        output,
        parentMessage.requestId,
        undefined,
        undefined,
        elapsedMs,
        selection,
      )) {
        if (isAccepted() && "message" in event && isNullRenderingAttachment(event.message)) {
          said.push(event.message);
          continue;
        }
        if (!("updatedToolOutput" in event)) {
          if (
            "message" in event &&
            event.message.type === "attachment" &&
            (event.message.attachment.type === "hook_blocking_error" ||
              event.message.attachment.type === "hook_stopped_continuation" ||
              event.message.attachment.type === "hook_additional_context")
          )
            logForDebugging(
              `async REPL ${label}: a PostToolUse hook's ${event.message.attachment.type} was dropped; it has no effect on an async Output`,
            );
          continue;
        }
        let parsed = replOutputSchema().safeParse(event.updatedToolOutput);
        if (parsed.success) {
          output = event.updatedToolOutput;
          rewritten = true;
        } else {
          let joined = parsed.error.issues
            .map((issue) => (issue.path.length > 0 ? issue.path.join(".") : "the top level"))
            .join(", ");
          logForDebugging(
            `async REPL ${label}: a PostToolUse hook's updatedToolOutput is not the REPL tool's Output shape (${joined}: ${parsed.error.issues[0]?.message ?? "invalid"}); that rewrite is ignored and the output goes on without it`,
            {
              level: "warn",
            },
          );
        }
      }
    } catch (error) {
      if (isAbortError(error))
        logForDebugging(
          `async REPL ${label}: the PostToolUse pass was aborted; the output continues as it stood`,
        );
      else logError(error);
    }
  }
  if (isTerminalShutdown()) await heldUntilExit();
  return {
    output,
    rewritten,
    said,
  };
}
//@ chunk-n51jggtb.js:194311-194625 placement
/**
 * 判断停止是否由用户/拒绝引起并带上各调用状态。
 */
function stopReportFromSignal(signal, calls, toolUseContext) {
  if (!isCodeModeExperimentEnabled() || toolUseContext.stoppedResultWait === undefined) return;
  let snapshot = new Map(
    Array.from(calls, ([toolUseId, call]) => [
      toolUseId,
      {
        ...call,
      },
    ]),
  );
  if ([...snapshot.values()].some((call) => call.declined === true))
    return {
      by: "refusal",
      calls: snapshot,
    };
  let reason = unwrapAbortReason(signal.reason);
  return (reason === "user-cancel" || reason === "remote-cancel") &&
    getReplSessions(toolUseContext).stopAskerOf(signal) === undefined
    ? {
        by: "user",
        calls: snapshot,
      }
    : undefined;
}
//@ chunk-n51jggtb.js:194625-194878 placement
/**
 * 按停止来源生成中断错误。
 */
function interruptionErrorFor(by) {
  switch (by) {
    case "taskStop":
      return tagError(Error("A TaskStop call stopped this script while it ran"), STOPPED_BY_TASKSTOP_STATUS);
    case "session":
      return tagError(Error("Claude Code stopped this script while it ran"), STOPPED_BY_APP_STATUS);
    default:
      return tagError(Error("REPL execution interrupted"), INTERRUPTED_STATUS);
  }
}
//@ chunk-n51jggtb.js:211426-211525 placement
/**
 * 把累积的新消息与上下文层取出。
 */
function takeSkillLoadAdds(acc) {
  return {
    newMessages: acc.newMessages.splice(0),
    contextLayers: acc.contextLayers.splice(0),
  };
}
export { runAsyncEval, interruptionErrorFor, stopReportFromSignal };

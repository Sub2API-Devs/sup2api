/**
 * tools/REPLTool/runScript.ts
 *
 * 脚本运行主流程与结果整理（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (4)
 * attribution: placement 4
 */
import "vm";
import * as vmModule_2 from "vm";
import {
  REPL_MAIN_THREAD_KEY,
  REPL_MAX_TIMEOUT_MS,
  REPL_SCRIPT_FILENAME,
  REPL_ASYNC_WALL_CAP_MS,
} from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { ReplSessions, getReplSessions } from "../../state/replSessions.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { DEFAULT_REPL_TIMEOUT_MS, EvalTool } from "./EvalTool.js";
import { PromptScopedAbortController } from "../../utils/abortController.js";
import {
  createHookMessageBudget,
  filterHookMessages,
  isStoppedContinuation,
} from "../../utils/hooks/replHookFeedback.js";
import { hasAfterResultCommitted, matchesToolName, findToolByName } from "../../Tool.js";
import { SKILL } from "../SkillTool/skillToolNames.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { stripWideningPermissionLayers } from "../../dialogLaunchers.js";
import { logError } from "../../utils/log.js";
import { withResolvers } from "../../utils/withResolvers.js";
import { isAccepted, contextKeyAccepted, codeModeAccepted } from "../../utils/codeMode/accepted.js";
import {
  createDeadline,
  createInnerWatchdog,
  createTurnTracker,
  timeoutKind,
  wallClockTimeoutMessage,
} from "./watchdog.js";
import { tagError, errorLabelOf } from "./instrument.js";
import {
  timeoutStatus,
  hungCallStatus,
  LOOP_AFTER_FINISH_MESSAGE,
  stopStatus,
  dOMException,
} from "./stopReasons.js";
import { isCodeModeOn, isFastToolName } from "./toolMeta.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { getTerminalMcpTools } from "../../utils/transcript/deserialize.js";
import { ReplCallNoteBuffer } from "./replCallNotes.js";
import { RESULT_LIMITS } from "./resultValue.js";
import { cutValue, LINE_BREAK, stopReport } from "./stopReport.js";
import {
  applyCallUpdate,
  collectImagesAndFailedPages,
  collectPdfDocuments,
  collectNotificationTexts,
  unreadableToolsUsed,
} from "./innerResults.js";
import { shouldUseSandbox_2 } from "../BashTool/shouldUseSandbox.js";
import { withShellTools } from "./mcpTools.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { startingCalls, callsToMessages, errorRows } from "./virtualMessages.js";
import { createReplSession, buildCallState, initCallContext, runInCallContext } from "./session.js";
import { isEvalToolName } from "./constants.js";
import { plainShellCommands, prepareScript, assertNoGlobalOverwrite, unwrapValue } from "./parse.js";
import { rethrowContextError } from "./vmContext.js";
import { cancelCallOnAbort } from "./callState.js";
import { replStartedEmptyNote, replSyncRunMs } from "../../utils/codeMode.js";
import { plural } from "../../utils/stringUtils.js";
import { takeStopCounters, onStepStarted, runSynchronousScript } from "./stepBudget.js";
import {
  turnLimitNotice,
  hintForError,
  describeStopSummary,
  INNER_TOOL_ERRORS_HEADER,
  scriptErrorLine,
} from "../../utils/codeMode/scriptErrors.js";
import { describeBlockedScript, markScriptStarted } from "./scriptChecks.js";
import { generateCodeChallenge, describeThrownAt } from "./stackTrace.js";
import { ensureCleanupInterval } from "../../utils/telemetry/sessionTracing.js";
import { interruptionErrorFor, stopReportFromSignal } from "./asyncEval.js";
import { armLatenessAwareTimer, settleOutputOf } from "./asyncSettle.js";
import { systemClock } from "../../utils/sleep.js";
import {
  unawaitedCallWarnings,
  formatResultValueForDisplay,
  describeCallsForStopReport,
  countMatching,
  outputText,
} from "./render.js";
import { clientsDrawScriptCalls } from "../../utils/codeMode/vscodeExtensionStream.js";
import { isHostError, vmThrowToString } from "../../utils/errors/hostError.js";
import { logForDebugging } from "../../utils/debug.js";
import { shellErrorText, normalizeShellResult } from "./shellResult.js";
import { withMemoryCorrectionHint } from "../../utils/messages.js";
import {
  getOriginalCwd as getOriginalCwd_2,
  mapAndMaybePersistToolResult,
} from "../../utils/toolResultStorage.js";
import { getErrnoCode } from "../../utils/errors.js";

//@ chunk-n51jggtb.js:196455-196561 placement
/**
 * 把 background_hint 类进度事件转成 keyOnly 形态。
 */
function withKeyOnlyHints(emitToolProgress) {
  if (emitToolProgress === undefined) return;
  return function (event) {
    emitToolProgress(
      event.kind === "background_hint"
        ? {
            ...event,
            keyOnly: true,
          }
        : event,
    );
  };
}
//@ chunk-n51jggtb.js:196561-207301 placement
/**
 * 脚本运行主流程：超时、看门狗、内层调用、结果收集与错误归类。
 */
async function runScript(input, toolUseContext, canUseTool, parentMessage, onProgress, lane, asyncOpts) {
  let agentId = toolUseContext.agentId ?? REPL_MAIN_THREAD_KEY;
  let sessions = toolUseContext.toolState.get(ReplSessions);
  let existingSession = sessions.get(agentId);
  let { code, timeout } = input;
  let markName = sanitizeMarkName(toolUseContext.toolUseId);
  prewarmScript(code, markName);
  let min = Math.min(timeout ?? DEFAULT_REPL_TIMEOUT_MS, REPL_MAX_TIMEOUT_MS);
  let scopedAbort = new PromptScopedAbortController(toolUseContext.abortController);
  let callCtx = {
    ...toolUseContext,
    abortController: scopedAbort,
    emitToolProgress: withKeyOnlyHints(toolUseContext.emitToolProgress),
  };
  let returned = false;
  let scriptStarted = false;
  let verifierCode = "";
  let stopReportState;
  let afterCommitted = [];
  let skillLoadAdds = asyncOpts?.skillLoadAdds ?? {
    newMessages: [],
    contextLayers: [],
  };
  let seenHookMessages = new Set();
  let turnFlags = {
    continueFalse: false,
  };
  let feedbackPrefixer = createHookMessageBudget();
  let onHookEvent = (event, result) => {
    if (returned || scopedAbort.signal.aborted) return;
    if (hasAfterResultCommitted(event)) afterCommitted.push(event.afterResultCommitted);
    skillLoadAdds.newMessages.push(...filterHookMessages(feedbackPrefixer, result?.hookFeedback ?? []));
    turnFlags.continueFalse ||= result?.hookFeedback?.some(isStoppedContinuation) === true;
    if (result === undefined || !(matchesToolName(result.tool, SKILL) || result.tool.uiTableKey === SKILL))
      return;
    for (let message of result.newMessages ?? []) {
      let digest = jsonStringify(
        message.type === "user" || message.type === "assistant"
          ? [message.type, message.message.content]
          : message,
      );
      if (seenHookMessages.has(digest)) continue;
      seenHookMessages.add(digest);
      skillLoadAdds.newMessages.push(message);
    }
    skillLoadAdds.contextLayers.push(...(stripWideningPermissionLayers(result.contextLayers) ?? []));
  };
  let withAfterCommitted = (result) => {
    let sliced = afterCommitted.slice();
    return sliced.length === 0
      ? result
      : {
          ...result,
          afterResultCommitted: () => {
            for (let afterCommitted of sliced)
              try {
                afterCommitted();
              } catch (error) {
                logError(error);
              }
          },
        };
  };
  let calls = new Map();
  let callsAtScriptEnd = new Map();
  let startedAt = new Map();
  let executed = new Set();
  let retryKinds = new Map();
  let seenNotes = new Set();
  let finish = withResolvers();
  finish.promise.catch(() => {});
  let stopState2 = {};
  let stop = (by, error) => {
    stopState2.by ??= by;
    finish.reject(error);
  };
  let fail = (by, error) => {
    if (isAccepted() && lane === "classic") ensureSettled(true).then(() => stop(by, error));
    else stop(by, error);
  };
  let scriptDeadline = createDeadline(min, () =>
    fail(
      "timed_out",
      tagError(
        Error(
          `REPL execution timed out after ${min}ms of script time (inner tool calls excluded). Script may still be running \u2014 avoid unbounded awaits.`,
        ),
        timeoutStatus(min),
      ),
    ),
  );
  let innerWatchdog = createInnerWatchdog((call, watchdogMs) => {
    if (isCodeModeOn())
      logEvent("tengu_repl_inner_watchdog_fired", {
        replToolUseID: markName,
        ...(isAccepted()
          ? {
              toolName: isFastToolName(call.toolName)
                ? sanitizeToolNameForAnalytics(call.toolName)
                : lit("other_tool"),
            }
          : {
              toolName: sanitizeToolNameForAnalytics(call.toolName),
              watchdogMs,
              nativeTimeoutMs: call.nativeTimeoutMs,
            }),
      });
    scopedAbort.abort();
    stop(
      "watchdog",
      tagError(
        Error(
          `REPL inner tool call ${call.toolName} exceeded ${watchdogMs}ms watchdog (native timeout ${call.nativeTimeoutMs ?? "unset"}). The call may be hung \u2014 try a shorter timeout on the tool itself.`,
        ),
        hungCallStatus(call.toolName),
      ),
    );
  });
  let terminalMcpTools = toolUseContext.agentId ? new Set() : getTerminalMcpTools();
  let onToolProgress = (event) => {
    if (event.type !== "progress") {
      onProgress?.(event);
      return;
    }
    let data = event.data;
    if (data.shellProgress !== undefined) {
      if (!returned) onProgress?.(event);
      return;
    }
    if (data.phase === "start") startedAt.set(data.toolUseId, Date.now());
    if (
      data.phase === "complete" &&
      terminalMcpTools.has(data.toolName) &&
      toolUseContext.toolUseId !== undefined
    )
      toolUseContext.toolState.get(ReplCallNoteBuffer).note(toolUseContext.toolUseId, data.toolInput);
    for (let note of data.notes ?? []) {
      let line =
        seenNotes.size < RESULT_LIMITS.notes
          ? `${data.toolName} sent a note with its result (_notes holds it whole):
${cutValue(
  note.replace(
    LINE_BREAK,
    `
`,
  ),
  RESULT_LIMITS.chars,
)}`
          : "More results came with notes: read the _notes of each.";
      if (!seenNotes.has(line)) {
        seenNotes.add(line);
        callState.console.warn(line);
      }
    }
    if (returned) {
      applyCallUpdate(callsAtScriptEnd, {
        ...data,
        result: undefined,
      });
      return;
    }
    let toolInput = calls.get(data.toolUseId)?.toolInput;
    switch ((applyCallUpdate(calls, data), data.phase)) {
      case "start":
        if (executed.has(data.toolUseId))
          retryKinds.set(
            data.toolUseId,
            shouldUseSandbox_2(data.toolInput) && !shouldUseSandbox_2(toolInput)
              ? "sandboxRetry"
              : "pluginHook",
          );
        scriptDeadline.onToolStart();
        break;
      case "executing":
        executed.add(data.toolUseId);
        innerWatchdog.arm(data);
        break;
      case "complete":
      case "error":
        innerWatchdog.clear(data.toolUseId);
        scriptDeadline.onToolEnd();
        break;
    }
    onProgress?.(
      data.result === undefined
        ? event
        : {
            ...event,
            data: {
              ...data,
              result: undefined,
              resultBeforeReadBack: undefined,
              servedText: undefined,
              notes: undefined,
            },
          },
    );
  };
  let session;
  let tools = withShellTools(
    toolUseContext.options.tools,
    getToolPermissionContext(toolUseContext),
    toolUseContext.primitiveToolGrant,
  );
  let baseTools = new Set(toolUseContext.options.toolCatalog?.getAllBaseTools() ?? []);
  asyncOpts?.reportNotYetStarted(() =>
    startingCalls(new Map([...calls, ...callsAtScriptEnd]), tools, startedAt, Date.now(), baseTools),
  );
  let createSession = () => createReplSession(tools);
  let startedEmpty = false;
  if (existingSession) session = existingSession;
  else {
    session = createReplSession(tools);
    startedEmpty = toolUseContext.messages.some((message) =>
      message.type === "assistant"
        ? !message.isVirtual &&
          Array.isArray(message.message.content) &&
          message.message.content.some((block) => block.type === "tool_use" && isEvalToolName(block.name))
        : message.type === "user" && message.isCompactSummary === true,
    );
    sessions.set(agentId, session);
  }
  let scriptCheck = (() => {
    let record = {
      state: toolUseContext.autoModeClassified === true ? "allowed" : "none",
    };
    let scriptChecks = session.scriptChecks;
    return {
      record,
      handle: scriptChecks.handleFor(record),
      inUse: () => scriptChecks.inUse(),
    };
  })();
  let verdictState = {
    order: undefined,
    returned: false,
    ...(contextKeyAccepted() &&
      toolUseContext.autoModeClassified === true && {
        spelledOutCommands: plainShellCommands(code),
      }),
  };
  let ensureSettled = (aborted) => (settlePromise ??= settleScript(aborted));
  let settlePromise;
  let leftover;
  let settleScript = async (aborted) => {
    if (!isAccepted() || lane !== "classic") return;
    verdictState.startsNoMoreCalls = true;
    session.endCall(callState, aborted ? "cancelled" : "returned");
    let byPhase = (phase) => [...calls.values()].filter((call) => call.phase === phase);
    leftover = {
      notStarted: byPhase("start"),
      running: byPhase("executing"),
    };
    let { running } = leftover;
    let stillExecuting = () =>
      callState.pendingCalls > 0 && running.some((call) => call.phase === "executing");
    if (stillExecuting() && !scopedAbort.signal.aborted) {
      let deferred = Promise.withResolvers();
      let onAbort = () => deferred.resolve();
      callState.onCallSettled = () => {
        if (!stillExecuting()) deferred.resolve();
      };
      scopedAbort.signal.addEventListener("abort", onAbort, {
        once: true,
      });
      await deferred.promise;
      scopedAbort.signal.removeEventListener("abort", onAbort);
      callState.onCallSettled = undefined;
    }
    if (scopedAbort.signal.aborted) callState.cancelled = true;
  };
  let abortForLatePhase;
  let callState;
  try {
    callState = buildCallState(
      session,
      tools,
      callCtx,
      canUseTool,
      parentMessage,
      lane,
      onToolProgress,
      onHookEvent,
      asyncOpts?.evalId,
      (phase) => (phase === "start" ? scriptDeadline.onToolStart() : scriptDeadline.onToolEnd()),
      scopedAbort.signal,
      scriptCheck,
      verdictState,
    );
    initCallContext(session, callState);
  } catch (error) {
    rethrowContextError(error, session, sessions, agentId, createSession);
  }
  cancelCallOnAbort(session, callState, scopedAbort.signal);
  callState.onToolCallCap = (error) => {
    if (isCodeModeOn())
      logEvent("tengu_repl_tool_call_cap", {
        replToolUseID: markName,
        lane: fromEnum(lane),
        afterReturn: returned,
      });
    fail("tool_call_cap", error);
  };
  callState.onLeftoverCodeStopped = () => asyncOpts?.onLateLog(LOOP_AFTER_FINISH_MESSAGE);
  let replConsole = callState.console;
  if (startedEmpty) replConsole.warn(replStartedEmptyNote());
  let collectStdout = () => {
    let stdout = replConsole.getStdout();
    let ringLines = callState.ringLines;
    let lines = [
      stdout === "" && ringLines > 0
        ? `[console.log wrote ${ringLines} ${plural(ringLines, "line")} to the console ring, not to this output \u2014 use self.log(...) for output you want to see, or read the ring with console.tail()]`
        : stdout,
    ];
    let stopCounters = takeStopCounters(session, callState);
    if (stopCounters.clock > 0)
      lines.push(turnLimitNotice("wall clock", stopCounters.clock, `${replSyncRunMs()} ms`));
    if (stopCounters.budget > 0)
      lines.push(
        turnLimitNotice(
          "step budget",
          stopCounters.budget,
          `${callState.stepBudget} steps (a step is one pass through a loop or one call of a function)`,
        ),
      );
    return lines.filter((line) => line !== "").join(`
`);
  };
  let turnTracker = createTurnTracker({
    deadline: scriptDeadline,
    self: callState,
    outstanding: session.outstanding,
    ownTimers: () => callState.timers.size,
    subscribeTurns: (listener) => onStepStarted(session, listener),
  });
  let startTime = performance.now();
  try {
    let script = prepareScript(code);
    assertNoGlobalOverwrite(script, session.isGlobalName);
    scriptStarted = true;
    verifierCode = script;
    let toolUseId = toolUseContext.toolUseId;
    if (
      toolUseContext.autoModeClassified !== true &&
      toolUseContext.autoModeScriptCheckDeferred === true &&
      toolUseId !== undefined &&
      !session.unclassifiedCode.ran
    ) {
      scriptCheck.record.state = "unchecked";
      session.scriptChecks.add(
        {
          record: scriptCheck.record,
          code,
          toolUseId,
          runCheck: (code, checkCtx, runCheck) =>
            runCheck(
              EvalTool,
              {
                ...input,
                code,
              },
              {
                ...toolUseContext,
                abortController: checkCtx.abortController,
                requestDialog: checkCtx.requestDialog ?? toolUseContext.requestDialog,
                replAsyncAsk: checkCtx.replAsyncAsk,
                replScriptCheckNow: true,
              },
              parentMessage,
              toolUseId,
            ),
          stop: (reason, detail, cause) => {
            if (!returned) {
              scopedAbort.abort();
              stop(
                "auto_mode_blocked",
                Error(
                  describeBlockedScript(reason, detail, {
                    cause,
                  }),
                ),
              );
            } else if (abortForLatePhase !== undefined) {
              asyncOpts?.onLateLog(
                describeBlockedScript(reason, detail, {
                  cause,
                  late: true,
                }),
              );
              abortForLatePhase();
            }
          },
        },
        toolUseContext,
      );
    } else if (toolUseContext.autoModeClassified !== true && !contextKeyAccepted()) {
      session.unclassifiedCode.ran = true;
      session.scriptChecks.drop();
    }
    let script_2 = new vmModule_2.Script(script, {
      filename: REPL_SCRIPT_FILENAME,
      lineOffset: generateCodeChallenge(script),
      importModuleDynamically: session.sealers.rejectImport,
    });
    ensureCleanupInterval(session, callState);
    markScriptStarted(
      session.verdictOrder,
      verdictState,
      asyncOpts === undefined ? sessions.takeScriptNumber() : asyncOpts.evalId(),
    );
    let runPromise = session.currentCall.run(callState, () => runSynchronousScript(script_2, session));
    let signal = toolUseContext.abortController.signal;
    let onSignalAbort = () => {
      stop("interrupted", interruptionErrorFor(getReplSessions(toolUseContext).stopAskerOf(signal)));
      stopReportState ??= stopReportFromSignal(signal, calls, toolUseContext);
    };
    if (signal.aborted) onSignalAbort();
    else
      signal.addEventListener("abort", onSignalAbort, {
        once: true,
      });
    scriptDeadline.start();
    turnTracker.turnStarted();
    let wallCapMs = lane === "async" ? REPL_ASYNC_WALL_CAP_MS : REPL_MAX_TIMEOUT_MS;
    let stopWallClock = armLatenessAwareTimer(
      systemClock,
      () => {
        let rows = startingCalls(calls, tools, startedAt, Date.now(), baseTools);
        let kind = "call";
        try {
          kind = timeoutKind(
            [...calls.values()].filter((call) => call.phase === "executing").map((call) => call.toolName),
            lane,
          );
        } catch (error) {
          logError(error);
        }
        let mapped = rows.map((row) => ({
          toolName: row.toolName,
          ranBefore: retryKinds.get(row.toolUseId) === "sandboxRetry",
          ...(retryKinds.get(row.toolUseId) === "pluginHook" && {
            rerunByHook: true,
          }),
        }));
        stop(
          "wall_clock_limit",
          tagError(
            Error(wallClockTimeoutMessage(wallCapMs, mapped, kind)),
            stopStatus(wallCapMs, mapped, kind),
          ),
        );
      },
      wallCapMs,
    );
    let execution = (async () => {
      let clean = true;
      try {
        let value = await session.sealers
          .awaitVM(runPromise)
          .then((raw) => runInCallContext(session, callState, unwrapValue(raw)));
        clean = false;
        return value;
      } finally {
        await ensureSettled(clean);
      }
    })();
    execution.catch(() => {});
    let { v: value } = await Promise.race([execution, finish.promise]).finally(() => {
      stopWallClock();
      signal.removeEventListener("abort", onSignalAbort);
    });
    let { images, omitted, failedPages, failedPagesOmitted } = collectImagesAndFailedPages(calls);
    let { documents, omitted: omitted_2 } = collectPdfDocuments(calls);
    let notifications = collectNotificationTexts(calls, tools);
    let filtered = Array.from(calls.values()).filter(
      (call) => call.phase === "start" || call.phase === "executing",
    );
    let stderr = replConsole.getStderr();
    let joined = filtered.map((call) => call.toolName).join(", ");
    let stderr_2 = leftover
      ? [stderr, ...unawaitedCallWarnings(leftover, false)].filter(Boolean).join(`
`)
      : filtered.length
        ? (stderr
            ? stderr +
              `
`
            : "") +
          (codeModeAccepted() && lane === "async"
            ? `\u26A0 ${filtered.length} tool call(s) still running at script end (${joined}) \u2014 they run on and their effects happen; what a .then(self.log) logs arrives as late output, anything else is not in this result. Do not re-issue them; await next time.`
            : `\u26A0 ${filtered.length} tool call(s) still pending at script end \u2014 results discarded: ${joined}. Add 'await'.`)
        : stderr;
    let toolsUsed = unreadableToolsUsed(calls, toolUseContext);
    let data = {
      code,
      result: value === undefined ? undefined : formatResultValueForDisplay(value),
      stdout: collectStdout(),
      stderr: stderr_2,
      ...(toolsUsed.length > 0 && {
        toolsUsed,
      }),
      ...(images.length > 0 && {
        images,
      }),
      ...(omitted > 0 && {
        imagesOmitted: omitted,
      }),
      ...(failedPages.length > 0 && {
        imagePagesFailed: failedPages,
      }),
      ...(failedPagesOmitted > 0 && {
        imagePagesFailedOmitted: failedPagesOmitted,
      }),
      ...(documents.length > 0 && {
        documents,
      }),
      ...(omitted_2 > 0 && {
        documentsOmitted: omitted_2,
      }),
      ...(notifications.length > 0 && {
        notifications,
      }),
    };
    returned = true;
    let callMessages = callsToMessages(calls, tools, clientsDrawScriptCalls());
    return withAfterCommitted({
      data,
      newMessages: [...callMessages, ...skillLoadAdds.newMessages],
      ...(skillLoadAdds.contextLayers.length > 0 && {
        contextLayers: [...skillLoadAdds.contextLayers],
      }),
      ...(lane === "async" &&
        filtered.length > 0 && {
          detachedToolUseIds: filtered.map((call) => call.toolUseId),
        }),
      ...(clientsDrawScriptCalls() && {
        hideRow: true,
      }),
    });
  } catch (error) {
    if (isHostError(error) && error.stack)
      logForDebugging(
        `REPL error stack trace:
${error.stack}`,
        {
          level: "error",
        },
      );
    let filtered = Array.from(calls.values()).filter((call) => call.phase === "error");
    let errorText;
    if (isHostError(error)) {
      let stack = error.stack ?? "";
      let stackAt = stack.search(/\n\s+at /);
      errorText = stack === "" ? error.message : stackAt === -1 ? stack : stack.slice(0, stackAt);
    } else errorText = vmThrowToString(error, session.sealers);
    let memoryHint = hintForError(errorText, code);
    let innerErrorText;
    for (let call of filtered) {
      if (!call.error || call.error.length <= (innerErrorText?.length ?? 0)) continue;
      if (
        errorText.endsWith(`: ${call.error}`) ||
        errorText.startsWith(
          shellErrorText(
            normalizeShellResult(
              {
                error: call.error,
              },
              undefined,
            ),
          ),
        )
      )
        innerErrorText = call.error;
    }
    let mapped = filtered.map((call) =>
      innerErrorText !== undefined && call.error === innerErrorText
        ? `- ${call.toolName}: (the error above)`
        : `- ${call.toolName}: ${call.error}`,
    );
    let sealedStack = isHostError(error)
      ? ""
      : describeThrownAt(session.sealers.errStack(error), verifierCode);
    let errors =
      stopReportState !== undefined
        ? stopReport(
            stopReportState.by,
            describeCallsForStopReport(
              [...stopReportState.calls.values()],
              (call) => executed.has(call.toolUseId) || findToolByName(tools, call.toolName) === undefined,
              (call) => retryKinds.get(call.toolUseId) === "sandboxRetry",
              (call) => retryKinds.get(call.toolUseId) === "pluginHook",
            ),
            withMemoryCorrectionHint(""),
          )
        : errorText +
          (sealedStack
            ? `
${sealedStack}`
            : "") +
          (memoryHint
            ? `
${memoryHint}`
            : "") +
          (scriptStarted
            ? `
${describeStopSummary(calls.values(), stopState2.by !== undefined)}`
            : "") +
          (mapped.length
            ? `

${INNER_TOOL_ERRORS_HEADER}
${mapped.join(`
`)}`
            : "");
    let plainErrorLine = stopReportState === undefined ? errorLabelOf(error, errorText) : undefined;
    let notifications = collectNotificationTexts(calls, tools);
    let toolsUsed = unreadableToolsUsed(calls, toolUseContext);
    let data = {
      code,
      result: null,
      stdout: collectStdout(),
      ...(toolsUsed.length > 0 && {
        toolsUsed,
      }),
      stderr:
        leftover &&
        stopReportState === undefined &&
        (stopState2.by === undefined || stopState2.by === "timed_out" || stopState2.by === "tool_call_cap")
          ? [replConsole.getStderr(), ...unawaitedCallWarnings(leftover, true)].filter(Boolean).join(`
`)
          : replConsole.getStderr(),
      error: errors,
      ...(stopReportState !== undefined && {
        stoppedBy: stopReportState.by,
      }),
      ...(plainErrorLine !== undefined && {
        plainErrorLine: {
          text: plainErrorLine,
          replaces: scriptErrorLine(errors),
        },
      }),
      ...(notifications.length > 0 && {
        notifications,
      }),
    };
    let calls_2 = stopReportState?.calls ?? calls;
    let clientsDraw = clientsDrawScriptCalls();
    return withAfterCommitted({
      data,
      newMessages: [...callsToMessages(calls_2, tools, clientsDraw), ...skillLoadAdds.newMessages],
      ...(skillLoadAdds.contextLayers.length > 0 && {
        contextLayers: [...skillLoadAdds.contextLayers],
      }),
      ...(clientsDraw && {
        hideRow: true,
        messagesFromOutput: errorRows,
      }),
    });
  } finally {
    session.endCall(callState, returned ? "returned" : "cancelled");
    verdictState.returned = returned;
    if (lane === "async" && returned && asyncOpts !== undefined) {
      callState.console.late = asyncOpts.onLateLog;
      if (callState.pendingCalls > 0) {
        let resolveIdle = () => {};
        let promise = new Promise((resolve) => {
          resolveIdle = resolve;
          callState.onIdle = resolve;
        });
        let stopAsyncWall = armLatenessAwareTimer(
          systemClock,
          () => scopedAbort.abort(),
          REPL_ASYNC_WALL_CAP_MS,
        );
        promise.then(() => {
          stopAsyncWall();
          scopedAbort.abort(dOMException);
          session.scriptChecks.ended(scriptCheck.record);
        });
        abortForLatePhase = () => {
          scopedAbort.abort();
          resolveIdle();
        };
        asyncOpts.onLatePhase({
          abort: abortForLatePhase,
          idle: promise,
        });
      } else scopedAbort.abort(dOMException);
    } else scopedAbort.abort(returned && callState.pendingCalls === 0 ? dOMException : undefined);
    if (abortForLatePhase === undefined) session.scriptChecks.ended(scriptCheck.record);
    turnTracker.stop();
    scriptDeadline.cancel();
    innerWatchdog.cancel();
    if (isCodeModeOn()) {
      let outcome = returned ? "ok" : (stopState2.by ?? (scriptStarted ? "threw" : "parse_failed"));
      let telemetry = {
        replToolUseID: markName,
        outcome: fromEnum(outcome),
        lane: fromEnum(lane),
        durationMs: Math.round(performance.now() - startTime),
        innerCallCount: calls.size,
        innerExecutedCount: executed.size,
        ...(scriptCheck.inUse() && {
          scriptCheck: fromEnum(scriptCheck.record.state),
        }),
        ...(isAccepted() && {
          codeChars: code.length,
          innerErrorCount: countMatching(calls, (call) => call.phase === "error"),
          innerDeclinedCount: countMatching(calls, (call) => call.declined === true),
          permissionMode: fromEnum(getToolPermissionContext(toolUseContext).mode),
          ...(turnFlags.continueFalse && {
            hookContinueFalse: true,
          }),
        }),
      };
      logEvent("tengu_repl_script_end", telemetry);
    }
  }
}
//@ chunk-n51jggtb.js:209512-209800 placement
/**
 * 把消息块渲染，渲染失败时退化成纯文本。
 */
async function renderOutput(output, replToolUseID, toolUseContext) {
  try {
    let originalCwd = getOriginalCwd_2(toolUseContext.session);
    let persisted = await mapAndMaybePersistToolResult(
      EvalTool,
      output,
      replToolUseID,
      originalCwd,
      toolUseContext.storageV5,
    );
    return await settleOutputOf(persisted, {
      toolResultsDir: originalCwd,
      storageV5: toolUseContext.storageV5,
    });
  } catch (error) {
    if (getErrnoCode(error) !== undefined)
      logForDebugging(`async REPL settle fell back to text: ${getErrnoCode(error)}`, {
        level: "warn",
      });
    else logError(error);
    return {
      text: outputText(output) || "(no output)",
      media: [],
    };
  }
}
//@ chunk-n51jggtb.js:211525-211549 placement
/**
 * 脚本开始时记录概要（当前为空实现）。
 */
function prewarmScript(code, markName) {
  return;
}
export { runScript, renderOutput };

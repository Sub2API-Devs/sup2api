/**
 * cli/print/sessionResult.ts
 *
 * 2.1.316 新增：SDK 结果上报与暂存结果控制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (12)
 * attribution: placement 12
 */
import { addUsage_2 } from "../../../vendor/@anthropic-ai/sdk/lib/internal/tracing/response.mjs";
import { EMPTY_USAGE } from "../../services/api/emptyUsage.js";
import { getActiveModNames } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { flushSessionStorage } from "../../utils/sessionStorage.js";
import { isBridgeOrTransport, orderForTransport } from "../transportState.js";
import { errorMessage } from "../../utils/errors.js";
import { emitLoadError } from "../print.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { publishPostTurnSummary } from "../../bridge/replBridgeHandle.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { classifyAPIError } from "../../services/api/errors.js";
import { classifyToolError } from "../../services/tools/toolExecution.js";
import { getAutoModeUnavailableStopNotice } from "../../bootstrap/state.js";
import { isMainAgentPollEventMode } from "../../utils/pollEvents.js";
import {
  hasInputClosedWithRunningTasks,
  collectOwedTaskNotifications,
  shouldReleaseHeldResults,
} from "./backgroundWindDown.js";
import { getRunningTasks, createTaskFramework } from "../../utils/task/framework.js";
import { emitOrHoldResult, flushHeldResults, clearQueuedTurnCount } from "./turnLoop.js";
import { withResultExtras } from "../../entrypoints/sdk/coreSchemas.js";
import { stopAllRunningTasks } from "../../tasks/stopTask.js";
import { endActivity, startSessionActivity } from "../../utils/sessionActivity.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";

//@ chunk-tyg7f3ek.js:170455-170980 placement = makeResultMessage (0.805)
/**
 * 把暂存的若干 result 消息与新 result 合并：取第一个失败的作为主体，usage/num_turns/duration_ms 累加，permission_denials 合并，并清空暂存。
 */
function mergeResultMessages(pending, result) {
  if (pending.length === 0) return result;
  let r = [...pending, result];
  let s = r.find((y) => y.subtype !== "success" || y.is_error) ?? result;
  pending.length = 0;
  let max = Math.max(...r.map((y) => y.safety_stops ?? 0));
  return {
    ...s,
    total_cost_usd: result.total_cost_usd,
    duration_api_ms: result.duration_api_ms,
    modelUsage: result.modelUsage,
    safety_stops: max === 0 && r.some((y) => y.safety_stops === undefined) ? undefined : max,
    usage: r.reduce((acc, S) => addUsage_2(acc, S.usage), EMPTY_USAGE),
    num_turns: r.reduce((acc, S) => acc + S.num_turns, 0),
    duration_ms: r.reduce((acc, S) => acc + S.duration_ms, 0),
    permission_denials: r.flatMap((y) => y.permission_denials),
  };
}
//@ chunk-tyg7f3ek.js:170980-171022 placement
var loadedModCount = () => getActiveModNames(getPluginRegistry().loadedModules).length;
//@ chunk-tyg7f3ek.js:171022-173001 placement
/**
 * print 结束时组装并输出 SDK result 消息（成功/崩溃/错误），附带错误、遥测与转录排空等待。
 */
class SdkResultReporter {
  recentErrors;
  startedAt;
  turnUserMessageUuid;
  terminalResultEmitted = false;
  installedModsPeak = 0;
  constructor({ recentErrors }) {
    this.recentErrors = recentErrors;
  }
  get turnInFlight() {
    return this.startedAt !== undefined;
  }
  get userMessageUuid() {
    return this.turnUserMessageUuid;
  }
  startTurn(turnUserMessageUuid) {
    this.startedAt = Date.now();
    this.turnUserMessageUuid = turnUserMessageUuid;
    this.installedModsSeen();
  }
  installedModsSeen() {
    try {
      this.installedModsPeak = Math.max(this.installedModsPeak, loadedModCount());
    } catch (error) {
      logError(
        Error("installed mods not counted", {
          cause: error,
        }),
      );
    }
    return this.installedModsPeak;
  }
  endTurn() {
    this.startedAt = undefined;
    this.turnUserMessageUuid = undefined;
  }
  reportTerminatedOnShutdown({ aborted, runPhase, exitCode }) {
    if (!this.startedAt || aborted || this.terminalResultEmitted) return;
    logEvent("tengu_sdk_result", {
      subtype: lit("terminated"),
      is_error: true,
      duration_ms: Date.now() - this.startedAt,
      run_phase: fromEnum(runPhase ?? "init"),
      exit_code: exitCode,
      user_message_uuid: sanitizeMarkName(this.turnUserMessageUuid),
      installed_mods: this.installedModsSeen(),
    });
    this.terminalResultEmitted = true;
    this.endTurn();
  }
  reportUnrunTurnFailed(e, n) {
    logEvent("tengu_sdk_result", {
      subtype: lit("error_during_execution"),
      is_error: true,
      num_turns: 0,
      duration_ms: 0,
      duration_api_ms: 0,
      saw_retry: false,
      saw_compact: false,
      installed_mods: this.installedModsSeen(),
    });
    publishFailedSummary(e, n);
  }
  async emitSessionCrash(e, { io, session, sessionMirror }) {
    logEvent("tengu_sdk_session_crash", {
      ...errorTelemetryFields(e),
      installed_mods: this.installedModsSeen(),
    });
    if (!this.terminalResultEmitted) {
      logEvent("tengu_sdk_result", {
        subtype: lit("error_during_execution"),
        is_error: true,
        num_turns: 0,
        duration_ms: 0,
        duration_api_ms: 0,
        saw_retry: false,
        saw_compact: false,
        user_message_uuid: sanitizeMarkName(this.turnUserMessageUuid),
        installed_mods: this.installedModsSeen(),
      });
      this.terminalResultEmitted = true;
    }
    try {
      await flushSessionBeforeResult(
        sessionMirror,
        flushSessionStorage,
        FLUSH_SESSION_BEFORE_RESULT_ABORT_MS,
      );
      let h = errorTelemetryFields(e);
      publishFailedSummary(
        io.sessionState,
        isBridgeOrTransport(session) ? `Session crashed (${h.error_name})` : errorMessage(e),
      );
      await io.write(
        emitLoadError(
          session.id,
          orderForTransport(
            session,
            `[session_crash] error_name=${h.error_name} api_error_status=${h.api_error_status ?? "none"} cause_name=${h.cause_name ?? "none"}`,
            [errorMessage(e), ...this.recentErrors()],
          ),
        ),
      );
    } catch {}
    await Promise.race([
      io.flushSessionState(),
      sleep(5000, undefined, {
        unref: true,
      }),
    ]);
  }
}
//@ chunk-tyg7f3ek.js:173001-173020 placement
var FLUSH_SESSION_BEFORE_RESULT_MS = 1e4;
var FLUSH_SESSION_BEFORE_RESULT_ABORT_MS = 5000;
//@ chunk-tyg7f3ek.js:173020-173230 placement
async function flushSessionBeforeResult(
  sessionMirror,
  flushSessionStorage_2 = flushSessionStorage,
  r = FLUSH_SESSION_BEFORE_RESULT_MS,
) {
  if (sessionMirror) {
    await flushSessionStorage_2();
    return;
  }
  try {
    if (
      (await withDeadline(
        flushSessionStorage_2().then(() => true),
        r,
      )) === undefined
    )
      logForDebugging(`transcript drain still running after ${r}ms; the result goes out without it`, {
        level: "warn",
      });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:173230-173327 placement
function publishFailedSummary(sessionState, n) {
  publishPostTurnSummary(sessionState, {
    status_category: "failed",
    status_detail: n || "Run failed",
    needs_action: "",
  });
}
//@ chunk-tyg7f3ek.js:173327-173545 placement
function errorTelemetryFields(e) {
  let n = e instanceof APIError;
  let errorName = n ? fromEnum(classifyAPIError(e)) : classifyToolError(e);
  let apiErrorStatus = n && typeof e.status === "number" ? e.status : undefined;
  let causeName = e instanceof Error && e.cause !== undefined ? classifyToolError(e.cause) : undefined;
  return {
    error_name: errorName,
    api_error_status: apiErrorStatus,
    cause_name: causeName,
  };
}
//@ chunk-tyg7f3ek.js:173545-176978 placement
/**
 * 暂存并按顺序释放 SDK result：评估工具结果、指针结果、迟到结果与停止通知。
 */
class HeldResultsController {
  heldBackResults = [];
  carriedEvalResults = [];
  pendingPointerResults = new Set();
  pendingLateResults = new Set();
  pendingStopNotices = new Map();
  drain;
  messageQueue;
  toolState;
  store;
  pendingNotificationWaits;
  storageV5;
  sessionMirror;
  flushSessionStorage;
  emit;
  heldResultTotals;
  turnAbortedForShutdown;
  shuttingDown;
  stopping;
  teardownRequested;
  emitPendingSuggestion;
  constructor({
    drain,
    messageQueue,
    toolState,
    store,
    pendingNotificationWaits,
    storageV5,
    sessionMirror,
    flushSessionStorage,
    emit,
    heldResultTotals,
    turnAbortedForShutdown,
    shuttingDown,
    stopping,
    teardownRequested,
    emitPendingSuggestion,
    handbackPointerResults,
    lateReleasedResults,
    autoModeStopNotices,
  }) {
    this.drain = drain;
    this.messageQueue = messageQueue;
    this.toolState = toolState;
    this.store = store;
    this.pendingNotificationWaits = pendingNotificationWaits;
    this.storageV5 = storageV5;
    this.sessionMirror = sessionMirror;
    this.flushSessionStorage = flushSessionStorage;
    this.emit = (ce) => {
      if (ce.type === "result") {
        if (this.pendingPointerResults.delete(ce.uuid)) handbackPointerResults.add(ce);
        if (this.pendingLateResults.delete(ce.uuid)) lateReleasedResults.add(ce);
        let nt = this.pendingStopNotices.get(ce.uuid);
        if (nt !== undefined) {
          this.pendingStopNotices.delete(ce.uuid);
          autoModeStopNotices.set(ce, nt);
        }
      }
      emit(ce);
    };
    this.heldResultTotals = heldResultTotals;
    this.turnAbortedForShutdown = turnAbortedForShutdown;
    this.shuttingDown = shuttingDown;
    this.stopping = stopping;
    this.teardownRequested = teardownRequested;
    this.emitPendingSuggestion = emitPendingSuggestion;
  }
  holdsResults() {
    return this.heldBackResults.length > 0 || this.carriedEvalResults.length > 0;
  }
  route(result, { command }) {
    let r = result.subtype === "error_during_execution" ? getAutoModeUnavailableStopNotice() : undefined;
    if (r !== undefined) this.pendingStopNotices.set(result.uuid, r);
    if (
      command.shouldQuery !== false &&
      this.drain.inputClosed &&
      this.messageQueue.peek(isMainAgentPollEventMode) !== undefined
    ) {
      this.carriedEvalResults.push(result);
      return;
    }
    let message =
      command.shouldQuery === false ? result : mergeResultMessages(this.carriedEvalResults, result);
    let state = this.store.getState();
    let y = command.handbackPointer === true || command.repeatsUsageLimitAlert === true;
    if (y) this.pendingPointerResults.add(result.uuid);
    if (command.shouldQuery === false && command.queryHeldForNextTurn !== true && !y)
      return this.flushBeforeResult().then(() => {
        this.emit(result);
      });
    if (
      hasInputClosedWithRunningTasks({
        inputClosed: this.drain.inputClosed,
        runningTasks: getRunningTasks(state),
      }) ||
      (this.drain.inputClosed &&
        collectOwedTaskNotifications({
          tasks: Object.values(state.tasks ?? {}),
          waits: this.pendingNotificationWaits,
          now: Date.now(),
        }))
    ) {
      emitOrHoldResult({
        message,
        held: this.heldBackResults,
        holdBackActive: true,
        emit: (R) => this.emit(R),
      });
      return;
    }
    let S = () => {
      this.markLateResults(
        command.shouldQuery === false ? this.heldBackResults.length - 1 : this.heldBackResults.length,
      );
      emitOrHoldResult({
        message,
        held: this.heldBackResults,
        holdBackActive: false,
        emit: (R) => this.emit(withResultExtras(R, this.heldResultTotals())),
      });
    };
    return this.flushBeforeResult().then(S);
  }
  release() {
    let result = this.carriedEvalResults.pop();
    if (result !== undefined) this.heldBackResults.push(mergeResultMessages(this.carriedEvalResults, result));
    if (this.heldBackResults.length === 0) return;
    if (
      shouldReleaseHeldResults({
        aborted: this.drain.abortController?.signal.aborted ?? false,
        shuttingDown: this.shuttingDown(),
        abortedForShutdown: this.turnAbortedForShutdown(),
        teardownRequested: this.teardownRequested(),
        heldResultCount: this.heldBackResults.length,
      })
    )
      stopAllRunningTasks({
        taskRegistry: createTaskFramework(this.store.getState, this.store.setState),
        setAppState: this.store.setState,
        storageV5: this.storageV5,
      });
    return this.flushBeforeResult().then(() => {
      this.markLateResults(this.heldBackResults.length - 1);
      this.emitHeldResults();
    });
  }
  markLateResults(e) {
    for (let heldBackResult of this.heldBackResults.slice(0, Math.max(e, 0)))
      if (heldBackResult.type === "result") this.pendingLateResults.add(heldBackResult.uuid);
  }
  flushBeforeResult() {
    return flushSessionBeforeResult(this.sessionMirror, this.flushSessionStorage);
  }
  emitHeldResults() {
    let e = this.drain.endSessionRequested || this.stopping();
    flushHeldResults(this.heldBackResults, (n) =>
      this.emit(clearQueuedTurnCount(withResultExtras(n, this.heldResultTotals()), e)),
    );
    this.emitPendingSuggestion();
  }
}
//@ chunk-tyg7f3ek.js:176978-177015 placement
var RESUME_LOAD_HOLD = "resume-load-hold";
var RESUME_LOAD_HOLD_MAX_MS = 1800000;
//@ chunk-tyg7f3ek.js:177015-177167 placement
function startResumeLoadHold() {
  let e = true;
  let n = () => {
    if (!e) return;
    e = false;
    clearTimeout(timer);
    endActivity("resume_load", RESUME_LOAD_HOLD);
  };
  startSessionActivity("resume_load", RESUME_LOAD_HOLD);
  let timer = setTimeout(onResumeLoadHoldExpired, RESUME_LOAD_HOLD_MAX_MS, n);
  timer.unref();
  return n;
}
//@ chunk-tyg7f3ek.js:177167-177252 placement
function onResumeLoadHoldExpired(e) {
  logForDiagnosticsNoPII("warn", "session_activity_resume_load_hold_expired", {
    max_ms: RESUME_LOAD_HOLD_MAX_MS,
  });
  e();
}
//@ chunk-tyg7f3ek.js:177289-177301 placement
var SUMMARY_RETRY_DELAY_MS = 2000;
export {
  publishFailedSummary,
  SdkResultReporter,
  HeldResultsController,
  startResumeLoadHold,
  SUMMARY_RETRY_DELAY_MS,
};

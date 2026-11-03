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
import { ye } from "../../utils/startupMarks.js";
import { flushSessionStorage } from "../../utils/sessionStorage.js";
import { isBridgeOrTransport, orderForTransport } from "../transportState.js";
import { errorMessage } from "../../utils/errors.js";
import { emitLoadError } from "../print.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { publishPostTurnSummary } from "../../bridge/replBridgeHandle.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { classifyAPIError } from "../../services/api/errors.js";
import { classifyToolError } from "../../services/tools/toolExecution.js";
import { getAutoModeUnavailableStopNotice } from "../../bootstrap/state.js";
import { qar } from "../../utils/pollEvents.js";
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

/**
 * 把暂存的若干 result 消息与新 result 合并：取第一个失败的作为主体，usage/num_turns/duration_ms 累加，permission_denials 合并，并清空暂存。
 */
//@ chunk-tyg7f3ek.js:170455-170980 placement = makeResultMessage (0.805)
function mergeResultMessages(pending, result) {
  if (pending.length === 0) return result;
  let r = [...pending, result],
    s = r.find((y) => y.subtype !== "success" || y.is_error) ?? result;
  pending.length = 0;
  let max = Math.max(...r.map((y) => y.safety_stops ?? 0));
  return {
    ...s,
    total_cost_usd: result.total_cost_usd,
    duration_api_ms: result.duration_api_ms,
    modelUsage: result.modelUsage,
    safety_stops: max === 0 && r.some((y) => y.safety_stops === void 0) ? void 0 : max,
    usage: r.reduce((y, S) => addUsage_2(y, S.usage), EMPTY_USAGE),
    num_turns: r.reduce((y, S) => y + S.num_turns, 0),
    duration_ms: r.reduce((y, S) => y + S.duration_ms, 0),
    permission_denials: r.flatMap((y) => y.permission_denials),
  };
}
//@ chunk-tyg7f3ek.js:170980-171022 placement
var CC = () => getActiveModNames(getPluginRegistry().loadedModules).length;
/**
 * print 结束时组装并输出 SDK result 消息（成功/崩溃/错误），附带错误、遥测与转录排空等待。
 */
//@ chunk-tyg7f3ek.js:171022-173001 placement
class SdkResultReporter {
  recentErrors;
  startedAt;
  turnUserMessageUuid;
  terminalResultEmitted = !1;
  installedModsPeak = 0;
  constructor({ recentErrors: e }) {
    this.recentErrors = e;
  }
  get turnInFlight() {
    return this.startedAt !== void 0;
  }
  get userMessageUuid() {
    return this.turnUserMessageUuid;
  }
  startTurn(e) {
    ((this.startedAt = Date.now()), (this.turnUserMessageUuid = e), this.installedModsSeen());
  }
  installedModsSeen() {
    try {
      this.installedModsPeak = Math.max(this.installedModsPeak, CC());
    } catch (error) {
      logError(Error("installed mods not counted", { cause: error }));
    }
    return this.installedModsPeak;
  }
  endTurn() {
    ((this.startedAt = void 0), (this.turnUserMessageUuid = void 0));
  }
  reportTerminatedOnShutdown({ aborted: e, runPhase: n, exitCode: r }) {
    if (!this.startedAt || e || this.terminalResultEmitted) return;
    (logEvent("tengu_sdk_result", {
      subtype: lit("terminated"),
      is_error: !0,
      duration_ms: Date.now() - this.startedAt,
      run_phase: fromEnum(n ?? "init"),
      exit_code: r,
      user_message_uuid: ye(this.turnUserMessageUuid),
      installed_mods: this.installedModsSeen(),
    }),
      (this.terminalResultEmitted = !0),
      this.endTurn());
  }
  reportUnrunTurnFailed(e, n) {
    (logEvent("tengu_sdk_result", {
      subtype: lit("error_during_execution"),
      is_error: !0,
      num_turns: 0,
      duration_ms: 0,
      duration_api_ms: 0,
      saw_retry: !1,
      saw_compact: !1,
      installed_mods: this.installedModsSeen(),
    }),
      publishFailedSummary(e, n));
  }
  async emitSessionCrash(e, { io: n, session: r, sessionMirror: s }) {
    if (
      (logEvent("tengu_sdk_session_crash", {
        ...errorTelemetryFields(e),
        installed_mods: this.installedModsSeen(),
      }),
      !this.terminalResultEmitted)
    )
      (logEvent("tengu_sdk_result", {
        subtype: lit("error_during_execution"),
        is_error: !0,
        num_turns: 0,
        duration_ms: 0,
        duration_api_ms: 0,
        saw_retry: !1,
        saw_compact: !1,
        user_message_uuid: ye(this.turnUserMessageUuid),
        installed_mods: this.installedModsSeen(),
      }),
        (this.terminalResultEmitted = !0));
    try {
      await flushSessionBeforeResult(s, flushSessionStorage, zH);
      let h = errorTelemetryFields(e);
      (publishFailedSummary(
        n.sessionState,
        isBridgeOrTransport(r) ? `Session crashed (${h.error_name})` : errorMessage(e),
      ),
        await n.write(
          emitLoadError(
            r.id,
            orderForTransport(
              r,
              `[session_crash] error_name=${h.error_name} api_error_status=${h.api_error_status ?? "none"} cause_name=${h.cause_name ?? "none"}`,
              [errorMessage(e), ...this.recentErrors()],
            ),
          ),
        ));
    } catch {}
    await Promise.race([n.flushSessionState(), sleep(5000, void 0, { unref: !0 })]);
  }
}
//@ chunk-tyg7f3ek.js:173001-173020 placement
var GH = 1e4,
  zH = 5000;
//@ chunk-tyg7f3ek.js:173020-173230 placement
async function flushSessionBeforeResult(e, n = flushSessionStorage, r = GH) {
  if (e) {
    await n();
    return;
  }
  try {
    if (
      (await withDeadline(
        n().then(() => !0),
        r,
      )) === void 0
    )
      logForDebugging(`transcript drain still running after ${r}ms; the result goes out without it`, {
        level: "warn",
      });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:173230-173327 placement
function publishFailedSummary(e, n) {
  publishPostTurnSummary(e, {
    status_category: "failed",
    status_detail: n || "Run failed",
    needs_action: "",
  });
}
//@ chunk-tyg7f3ek.js:173327-173545 placement
function errorTelemetryFields(e) {
  let n = e instanceof Ot,
    r = n ? fromEnum(classifyAPIError(e)) : classifyToolError(e),
    s = n && typeof e.status === "number" ? e.status : void 0,
    h = e instanceof Error && e.cause !== void 0 ? classifyToolError(e.cause) : void 0;
  return { error_name: r, api_error_status: s, cause_name: h };
}
/**
 * 暂存并按顺序释放 SDK result：评估工具结果、指针结果、迟到结果与停止通知。
 */
//@ chunk-tyg7f3ek.js:173545-176978 placement
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
    drain: e,
    messageQueue: n,
    toolState: r,
    store: s,
    pendingNotificationWaits: h,
    storageV5: y,
    sessionMirror: S,
    flushSessionStorage: R,
    emit: w,
    heldResultTotals: P,
    turnAbortedForShutdown: L,
    shuttingDown: q,
    stopping: x,
    teardownRequested: G,
    emitPendingSuggestion: Z,
    handbackPointerResults: re,
    lateReleasedResults: Ae,
    autoModeStopNotices: Ue,
  }) {
    ((this.drain = e),
      (this.messageQueue = n),
      (this.toolState = r),
      (this.store = s),
      (this.pendingNotificationWaits = h),
      (this.storageV5 = y),
      (this.sessionMirror = S),
      (this.flushSessionStorage = R),
      (this.emit = (ce) => {
        if (ce.type === "result") {
          if (this.pendingPointerResults.delete(ce.uuid)) re.add(ce);
          if (this.pendingLateResults.delete(ce.uuid)) Ae.add(ce);
          let nt = this.pendingStopNotices.get(ce.uuid);
          if (nt !== void 0) (this.pendingStopNotices.delete(ce.uuid), Ue.set(ce, nt));
        }
        w(ce);
      }),
      (this.heldResultTotals = P),
      (this.turnAbortedForShutdown = L),
      (this.shuttingDown = q),
      (this.stopping = x),
      (this.teardownRequested = G),
      (this.emitPendingSuggestion = Z));
  }
  holdsResults() {
    return this.heldBackResults.length > 0 || this.carriedEvalResults.length > 0;
  }
  route(e, { command: n }) {
    let r = e.subtype === "error_during_execution" ? getAutoModeUnavailableStopNotice() : void 0;
    if (r !== void 0) this.pendingStopNotices.set(e.uuid, r);
    if (n.shouldQuery !== !1 && this.drain.inputClosed && this.messageQueue.peek(qar) !== void 0) {
      this.carriedEvalResults.push(e);
      return;
    }
    let s = n.shouldQuery === !1 ? e : mergeResultMessages(this.carriedEvalResults, e),
      state = this.store.getState(),
      y = n.handbackPointer === !0 || n.repeatsUsageLimitAlert === !0;
    if (y) this.pendingPointerResults.add(e.uuid);
    if (n.shouldQuery === !1 && n.queryHeldForNextTurn !== !0 && !y)
      return this.flushBeforeResult().then(() => {
        this.emit(e);
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
        message: s,
        held: this.heldBackResults,
        holdBackActive: !0,
        emit: (R) => this.emit(R),
      });
      return;
    }
    let S = () => {
      (this.markLateResults(
        n.shouldQuery === !1 ? this.heldBackResults.length - 1 : this.heldBackResults.length,
      ),
        emitOrHoldResult({
          message: s,
          held: this.heldBackResults,
          holdBackActive: !1,
          emit: (R) => this.emit(withResultExtras(R, this.heldResultTotals())),
        }));
    };
    return this.flushBeforeResult().then(S);
  }
  release() {
    let e = this.carriedEvalResults.pop();
    if (e !== void 0) this.heldBackResults.push(mergeResultMessages(this.carriedEvalResults, e));
    if (this.heldBackResults.length === 0) return;
    if (
      shouldReleaseHeldResults({
        aborted: this.drain.abortController?.signal.aborted ?? !1,
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
      (this.markLateResults(this.heldBackResults.length - 1), this.emitHeldResults());
    });
  }
  markLateResults(e) {
    for (let n of this.heldBackResults.slice(0, Math.max(e, 0)))
      if (n.type === "result") this.pendingLateResults.add(n.uuid);
  }
  flushBeforeResult() {
    return flushSessionBeforeResult(this.sessionMirror, this.flushSessionStorage);
  }
  emitHeldResults() {
    let e = this.drain.endSessionRequested || this.stopping();
    (flushHeldResults(this.heldBackResults, (n) =>
      this.emit(clearQueuedTurnCount(withResultExtras(n, this.heldResultTotals()), e)),
    ),
      this.emitPendingSuggestion());
  }
}
//@ chunk-tyg7f3ek.js:176978-177015 placement
var RESUME_LOAD_HOLD = "resume-load-hold",
  AC = 1800000;
//@ chunk-tyg7f3ek.js:177015-177167 placement
function startResumeLoadHold() {
  let e = !0,
    n = () => {
      if (!e) return;
      ((e = !1), clearTimeout(r), endActivity("resume_load", RESUME_LOAD_HOLD));
    };
  startSessionActivity("resume_load", RESUME_LOAD_HOLD);
  let r = setTimeout(XH, AC, n);
  return (r.unref(), n);
}
//@ chunk-tyg7f3ek.js:177167-177252 placement
function XH(e) {
  (logForDiagnosticsNoPII("warn", "session_activity_resume_load_hold_expired", { max_ms: AC }), e());
}
//@ chunk-tyg7f3ek.js:177289-177301 placement
var tN = 2000;

export { publishFailedSummary, SdkResultReporter, HeldResultsController, startResumeLoadHold, tN };

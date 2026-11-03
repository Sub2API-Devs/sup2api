/**
 * cli/print/followUpPreempt.ts
 *
 * 2.1.316 新增：快速跟进消息抢占当前回合、后台子代理与重投关闭上报
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (13)
 * attribution: placement 13
 */
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import { emitStatusMessage } from "../../entrypoints/sdk/coreSchemas.js";
import { getSdkRapidFollowupPreempt } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { im, filterQueuedCommandsForThread } from "../../utils/messageQueueManager.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { userAbortReason } from "../../utils/abortController.js";
import { canBatchWith } from "../print.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { logError } from "../../utils/log.js";
import { looksLikeSlashInput } from "../../commands.js";
import { env } from "../../utils/env.js";
import { uf, isForegroundAgentMoveDisabled } from "../../tools/AgentTool/backgroundGates.js";
import { Ghn, fQs } from "../../tasks/taskKinds.js";
import { isMainThreadForegroundShell } from "../../tasks/LocalShellTask/LocalShellTask.js";
import { count } from "../../utils/collections.js";
import { isAutoBackgroundHeld, tryAutoBackgroundAgent } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { logForDebugging } from "../../utils/debug.js";
import { foldedFollowUpEnd, chatOriginField } from "./transcriptLeaves.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { flagKey } from "../structuredIOProtocol.js";

//@ chunk-tyg7f3ek.js:89213-89308 placement
function installPermissionModeReporter(e, n) {
  e.io.sessionState.onPermissionModeChanged = (r) => {
    let s = toExternalPermissionMode(r),
      h = emitStatusMessage(e, s);
    n(s, h);
  };
}
//@ chunk-tyg7f3ek.js:89308-89756 placement
class SparedWindowReporter {
  drain;
  io;
  stopping;
  sparedWindowWiped = !1;
  constructor({ drain: e, io: n, stopping: r }) {
    ((this.drain = e), (this.io = n), (this.stopping = r));
  }
  runEntered() {
    this.sparedWindowWiped = !1;
  }
  report() {
    if (this.drain.runningReported || this.stopping()) return;
    if (this.io.hasStandingPrompt()) {
      if (!this.sparedWindowWiped)
        ((this.sparedWindowWiped = !0), this.io.sessionState.wipeTurnScopedMetadata());
      return;
    }
    ((this.drain.runningReported = !0), this.io.sessionState.notifyStateChanged("running"));
  }
}
//@ chunk-tyg7f3ek.js:89756-89812 placement
function isRapidFollowupPreemptEnabled() {
  return getSdkRapidFollowupPreempt() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_zippy_spindle", !1);
}
/**
 * print 模式快速追问抢占：人在模型回复期间连续发消息时，打断当前轮次让新消息尽快生效（tengu_zippy_spindle）。
 */
//@ chunk-tyg7f3ek.js:89812-92166 placement
class RapidFollowupPreempter {
  messageQueue;
  drain;
  enabled;
  isSentNow;
  emit;
  judged = new WeakSet();
  turnRunning = !1;
  turn;
  held;
  preemptedBy;
  constructor({ messageQueue: e, drain: n, enabled: r, isSentNow: s, emit: h }) {
    ((this.messageQueue = e), (this.drain = n), (this.enabled = r), (this.isSentNow = s), (this.emit = h));
  }
  install() {
    return (
      this.takeArrivingFollowup(),
      this.messageQueue.subscribe(() => runSafely(() => this.onQueueChanged()))
    );
  }
  noteTurnStart({ command: e, members: n }) {
    let preemptedBy = this.preemptedBy,
      s = preemptedBy !== void 0 && n.some((h) => h.uuid === preemptedBy);
    if (
      preemptedBy !== void 0 &&
      (s || !this.messageQueue.getCommandQueueSnapshot().some((h) => h.uuid === preemptedBy))
    )
      this.preemptedBy = void 0;
    if (
      ((this.turnRunning = !0),
      (this.turn =
        e.mode === "prompt" &&
        !e.isMeta &&
        e.shouldQuery !== !1 &&
        !isSlashLikeCommand(e) &&
        !n.some((h) => h.priority === "now" || h.bridgeOrigin === !0) &&
        !s
          ? { messageUuids: n.map((h) => h.uuid).filter((h) => h !== void 0), compacting: !1, open: !1 }
          : void 0),
      this.turn === void 0)
    )
      this.held = void 0;
  }
  noteFrame(e) {
    let turn = this.turn;
    if (turn === void 0) return;
    if (e.type === "system" && e.subtype === "status") {
      if (e.status !== "requesting") turn.compacting = e.status === "compacting";
    } else if (
      e.type === "result" ||
      ((e.type === "assistant" ||
        (e.type === "user" && !("isReplay" in e)) ||
        (e.type === "stream_event" &&
          (e.event.type === "content_block_start" || e.event.type === "content_block_delta"))) &&
        e.parent_tool_use_id === null)
    )
      ((this.turn = void 0), (this.held = void 0));
    else if (e.type === "system" && e.subtype === "init") {
      turn.open = !0;
      let held = this.held;
      if (((this.held = void 0), held === void 0)) return;
      let commandQueueSnapshot = this.messageQueue.getCommandQueueSnapshot();
      if (
        firstDispatchableCommand(commandQueueSnapshot) === held &&
        !commandQueueSnapshot.some((h) => h.priority === "now" && im(h))
      )
        runSafely(() => this.preempt(held));
    }
  }
  noteTurnEnd() {
    ((this.turnRunning = !1), (this.turn = void 0), (this.held = void 0));
  }
  onQueueChanged() {
    let takeArrivingFollowup = this.takeArrivingFollowup();
    if (
      takeArrivingFollowup === void 0 ||
      takeArrivingFollowup.uuid === void 0 ||
      !this.enabled() ||
      !isPreemptingFollowup(takeArrivingFollowup) ||
      this.isSentNow(takeArrivingFollowup)
    )
      return;
    if (this.turn?.open) this.preempt(takeArrivingFollowup);
    else if (this.turn !== void 0 || !this.turnRunning) this.held = takeArrivingFollowup;
  }
  preempt(e) {
    let uuid = e.uuid,
      turn = this.turn,
      abortController = this.drain.abortController;
    if (
      uuid === void 0 ||
      turn === void 0 ||
      !turn.open ||
      turn.compacting ||
      abortController === void 0 ||
      abortController.signal.aborted ||
      this.drain.endSessionRequested ||
      isTerminalShutdown()
    )
      return;
    (this.emit({
      type: "system",
      subtype: "turn_preempted",
      reason: "rapid_followup",
      preempted_by_uuid: uuid,
      preempted_message_uuids: turn.messageUuids,
    }),
      (this.preemptedBy = uuid),
      logFeatureOk("print_rapid_followup_preempt"),
      abortController.abort(userAbortReason("interrupt")));
  }
  takeArrivingFollowup() {
    let commandQueueSnapshot = this.messageQueue.getCommandQueueSnapshot(),
      n = firstDispatchableCommand(commandQueueSnapshot),
      r = n !== void 0 && !this.judged.has(n);
    for (let s of commandQueueSnapshot) this.judged.add(s);
    return r ? n : void 0;
  }
}
//@ chunk-tyg7f3ek.js:92166-92299 placement
function isPreemptingFollowup(e) {
  return (
    canBatchWith(e) &&
    isHumanOrigin(e.origin) &&
    e.verifiedSlackHumanTurn !== !0 &&
    e.bridgeOrigin !== !0 &&
    e.priority === "next" &&
    !e.wait &&
    !isSlashLikeCommand(e)
  );
}
//@ chunk-tyg7f3ek.js:92299-92337 placement
function runSafely(e) {
  try {
    e();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:92337-92453 placement
function firstDispatchableCommand(e) {
  return e.find(
    (n) => im(n) && (n.mode === "prompt" || n.mode === "orphaned-permission" || n.priority !== "later"),
  );
}
//@ chunk-tyg7f3ek.js:92453-92487 placement
function isSlashLikeCommand(e) {
  return looksLikeSlashInput(e.value);
}
//@ chunk-tyg7f3ek.js:92487-92498 placement
var PREEMPT_DEBOUNCE_MS = 200;
//@ chunk-tyg7f3ek.js:92498-92550 placement
function isFollowupBackgroundsSubagentEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_crescent", !1);
}
/**
 * 人发来排队消息时把前台子代理移到后台，让主线程先处理新消息（tengu_valiant_crescent）。
 */
//@ chunk-tyg7f3ek.js:92550-95036 placement
class FollowupBackgroundsSubagent {
  host;
  uninstalled = !1;
  watching = !1;
  timer;
  responseId;
  queuedAtToolResult = new Set();
  passedOver = new Set();
  constructor(e) {
    this.host = e;
  }
  install() {
    let subscribe = this.host.messageQueue.subscribe(() => this.look());
    return () => {
      (subscribe(), (this.uninstalled = !0), this.forgetTurn());
    };
  }
  noteTurnStart() {
    (this.forgetTurn(), (this.watching = !this.uninstalled && env.CLAUDE_AUTO_BACKGROUND_TASKS), this.look());
  }
  noteFrame(e) {
    if (!this.watching || (e.type !== "user" && e.type !== "assistant") || e.parent_tool_use_id !== null)
      return;
    this.contained(() => {
      if (e.type === "user") {
        let { content: content } = e.message;
        if (!("isReplay" in e) && Array.isArray(content) && content.some((r) => r.type === "tool_result"))
          for (let r of this.waitingMessages()) this.queuedAtToolResult.add(r);
      } else if (e.message.id !== this.responseId) {
        this.responseId = e.message.id;
        let waitingMessages = this.waitingMessages();
        for (let r of this.queuedAtToolResult) if (waitingMessages.has(r)) this.passedOver.add(r);
        this.queuedAtToolResult.clear();
      }
    });
  }
  noteTurnEnd() {
    this.forgetTurn();
  }
  forgetTurn() {
    ((this.watching = !1),
      clearTimeout(this.timer),
      (this.timer = void 0),
      (this.responseId = void 0),
      this.queuedAtToolResult.clear(),
      this.passedOver.clear());
  }
  look() {
    if (!this.watching) return;
    this.contained(() => {
      (clearTimeout(this.timer), (this.timer = void 0));
      let { drain: drain, messageQueue: messageQueue, taskRegistry: taskRegistry } = this.host;
      if (
        drain.abortController === void 0 ||
        drain.abortController.signal.aborted ||
        !drain.turnUnderWay ||
        drain.endSessionRequested ||
        messageQueue.isMidTurnFoldSuspended() ||
        (uf() && isForegroundAgentMoveDisabled()) ||
        this.waitingMessages().size === 0
      )
        return;
      let values = Object.values(taskRegistry.all()),
        filtered = values.filter(Ghn).filter((S) => S.abortController?.signal.aborted !== !0);
      if (
        filtered.length === 0 ||
        this.host.isHumanDecisionPending() ||
        !filtered.every(fQs) ||
        values.some((S) => isMainThreadForegroundShell(S) && S.status === "running") ||
        this.host.hasListedForegroundToolCall() ||
        count(filtered, isAutoBackgroundHeld) > 0
      ) {
        this.lookAgainSoon();
        return;
      }
      if (!this.host.enabled()) return;
      let y = count(filtered, (S) => tryAutoBackgroundAgent(S.id, taskRegistry, "follow_up"));
      if (
        (logForDebugging(
          `[followup-backgrounds-subagent] moved ${y} of ${filtered.length} foreground subagents to the background for a person's queued message`,
        ),
        y > 0)
      )
        (logFeatureOk("print_followup_backgrounds_subagent"), this.lookAgainSoon());
    });
  }
  lookAgainSoon() {
    (clearTimeout(this.timer),
      (this.timer = setTimeout(() => this.look(), PREEMPT_DEBOUNCE_MS)),
      this.timer.unref?.());
  }
  waitingMessages() {
    let e = new Set();
    for (let n of filterQueuedCommandsForThread(this.host.messageQueue.getCommandsByMaxPriority("next"), {
      isMainThread: !0,
      currentAgentId: void 0,
    })) {
      if (
        n.drainOnly === !0 ||
        n.screeningPending === !0 ||
        (n.uuid !== void 0 && this.passedOver.has(n.uuid))
      )
        break;
      if (n.uuid !== void 0 && isPreemptingFollowup(n) && !this.host.isSentNow(n)) e.add(n.uuid);
    }
    return e;
  }
  contained(e) {
    try {
      e();
    } catch (error) {
      (this.forgetTurn(), logError(error), logFeatureBad("print_followup_backgrounds_subagent", "threw"));
    }
  }
}
//@ chunk-tyg7f3ek.js:95036-95418 placement
function reportRedeliveredFollowupClosed(e, n, r) {
  try {
    let s = foldedFollowUpEnd(e, n),
      h = r === "cancelled" ? "cancelled_with_continuation" : s?.badEnd;
    if (s === void 0 || h === void 0) return;
    logForDiagnosticsNoPII("info", "cli_redelivered_follow_up_closed_unrun", {
      reason: h,
      ...flagKey("reason", h),
      closed_on_arrival: r === "on_arrival",
      error_was_transient: s.failedTransiently,
      claude_row_after_it: s.claudesRowBehind,
      re_run_wrote_a_row: s.reRunsRowBehind,
      ...chatOriginField(),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:95418-95577 placement
var FOLD_END_NO_MORE_ROWS = { end: "no_more_rows", modelWrote: !1, modelEndedTheTurn: void 0 },
  e_ = { ...FOLD_END_NO_MORE_ROWS, end: "something_follows" },
  FB = { ...FOLD_END_NO_MORE_ROWS, end: "stopped" },
  xB = { ...e_, modelEndedTheTurn: !1 };

export {
  reportRedeliveredFollowupClosed,
  installPermissionModeReporter,
  RapidFollowupPreempter,
  isRapidFollowupPreemptEnabled,
  FollowupBackgroundsSubagent,
  isFollowupBackgroundsSubagentEnabled,
  SparedWindowReporter,
  runSafely,
  FOLD_END_NO_MORE_ROWS,
  xB,
  e_,
  FB,
};

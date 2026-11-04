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
import { isActiveMainAgentCommand, filterQueuedCommandsForThread } from "../../utils/messageQueueManager.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { userAbortReason } from "../../utils/abortController.js";
import { canBatchWith } from "../print.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { logError } from "../../utils/log.js";
import { looksLikeSlashInput } from "../../commands.js";
import { env } from "../../utils/env.js";
import {
  isBackgroundTasksOff,
  isForegroundAgentMoveDisabled,
} from "../../tools/AgentTool/backgroundGates.js";
import { isMainThreadForegroundAgent, isArmedDirectForegroundAgent } from "../../tasks/taskKinds.js";
import { isMainThreadForegroundShell } from "../../tasks/LocalShellTask/LocalShellTask.js";
import { count } from "../../utils/collections.js";
import { isAutoBackgroundHeld, tryAutoBackgroundAgent } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { logForDebugging } from "../../utils/debug.js";
import { foldedFollowUpEnd, chatOriginField } from "./transcriptLeaves.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { flagKey } from "../structuredIOProtocol.js";

//@ chunk-tyg7f3ek.js:89213-89308 placement
function installPermissionModeReporter(host, report) {
  host.io.sessionState.onPermissionModeChanged = (mode) => {
    let permissionMode = toExternalPermissionMode(mode);
    let statusUuid = emitStatusMessage(host, permissionMode);
    report(permissionMode, statusUuid);
  };
}
//@ chunk-tyg7f3ek.js:89308-89756 placement
class SparedWindowReporter {
  drain;
  io;
  stopping;
  sparedWindowWiped = false;
  constructor({ drain, io, stopping }) {
    this.drain = drain;
    this.io = io;
    this.stopping = stopping;
  }
  runEntered() {
    this.sparedWindowWiped = false;
  }
  report() {
    if (this.drain.runningReported || this.stopping()) return;
    if (this.io.hasStandingPrompt()) {
      if (!this.sparedWindowWiped) {
        this.sparedWindowWiped = true;
        this.io.sessionState.wipeTurnScopedMetadata();
      }
      return;
    }
    this.drain.runningReported = true;
    this.io.sessionState.notifyStateChanged("running");
  }
}
//@ chunk-tyg7f3ek.js:89756-89812 placement
function isRapidFollowupPreemptEnabled() {
  return getSdkRapidFollowupPreempt() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_zippy_spindle", false);
}
//@ chunk-tyg7f3ek.js:89812-92166 placement
/**
 * print 模式快速追问抢占：人在模型回复期间连续发消息时，打断当前轮次让新消息尽快生效（tengu_zippy_spindle）。
 */
class RapidFollowupPreempter {
  messageQueue;
  drain;
  enabled;
  isSentNow;
  emit;
  judged = new WeakSet();
  turnRunning = false;
  turn;
  held;
  preemptedBy;
  constructor({ messageQueue, drain, enabled, isSentNow, emit }) {
    this.messageQueue = messageQueue;
    this.drain = drain;
    this.enabled = enabled;
    this.isSentNow = isSentNow;
    this.emit = emit;
  }
  install() {
    this.takeArrivingFollowup();
    return this.messageQueue.subscribe(() => runSafely(() => this.onQueueChanged()));
  }
  noteTurnStart({ command, members }) {
    let preemptedBy = this.preemptedBy;
    let isInMembers = preemptedBy !== undefined && members.some((member) => member.uuid === preemptedBy);
    if (
      preemptedBy !== undefined &&
      (isInMembers ||
        !this.messageQueue.getCommandQueueSnapshot().some((queued) => queued.uuid === preemptedBy))
    )
      this.preemptedBy = undefined;
    this.turnRunning = true;
    this.turn =
      command.mode === "prompt" &&
      !command.isMeta &&
      command.shouldQuery !== false &&
      !isSlashLikeCommand(command) &&
      !members.some((member) => member.priority === "now" || member.bridgeOrigin === true) &&
      !isInMembers
        ? {
            messageUuids: members.map((member) => member.uuid).filter((uuid) => uuid !== undefined),
            compacting: false,
            open: false,
          }
        : undefined;
    if (this.turn === undefined) this.held = undefined;
  }
  noteFrame(frame) {
    let turn = this.turn;
    if (turn === undefined) return;
    if (frame.type === "system" && frame.subtype === "status") {
      if (frame.status !== "requesting") turn.compacting = frame.status === "compacting";
    } else if (
      frame.type === "result" ||
      ((frame.type === "assistant" ||
        (frame.type === "user" && !("isReplay" in frame)) ||
        (frame.type === "stream_event" &&
          (frame.event.type === "content_block_start" || frame.event.type === "content_block_delta"))) &&
        frame.parent_tool_use_id === null)
    ) {
      this.turn = undefined;
      this.held = undefined;
    } else if (frame.type === "system" && frame.subtype === "init") {
      turn.open = true;
      let held = this.held;
      this.held = undefined;
      if (held === undefined) return;
      let queued = this.messageQueue.getCommandQueueSnapshot();
      if (
        firstDispatchableCommand(queued) === held &&
        !queued.some((queued) => queued.priority === "now" && isActiveMainAgentCommand(queued))
      )
        runSafely(() => this.preempt(held));
    }
  }
  noteTurnEnd() {
    this.turnRunning = false;
    this.turn = undefined;
    this.held = undefined;
  }
  onQueueChanged() {
    let arriving = this.takeArrivingFollowup();
    if (
      arriving === undefined ||
      arriving.uuid === undefined ||
      !this.enabled() ||
      !isPreemptingFollowup(arriving) ||
      this.isSentNow(arriving)
    )
      return;
    if (this.turn?.open) this.preempt(arriving);
    else if (this.turn !== undefined || !this.turnRunning) this.held = arriving;
  }
  preempt(command) {
    let uuid = command.uuid;
    let turn = this.turn;
    let abortController = this.drain.abortController;
    if (
      uuid === undefined ||
      turn === undefined ||
      !turn.open ||
      turn.compacting ||
      abortController === undefined ||
      abortController.signal.aborted ||
      this.drain.endSessionRequested ||
      isTerminalShutdown()
    )
      return;
    this.emit({
      type: "system",
      subtype: "turn_preempted",
      reason: "rapid_followup",
      preempted_by_uuid: uuid,
      preempted_message_uuids: turn.messageUuids,
    });
    this.preemptedBy = uuid;
    logFeatureOk("print_rapid_followup_preempt");
    abortController.abort(userAbortReason("interrupt"));
  }
  takeArrivingFollowup() {
    let queued = this.messageQueue.getCommandQueueSnapshot();
    let first = firstDispatchableCommand(queued);
    let isNew = first !== undefined && !this.judged.has(first);
    for (let queued_2 of queued) this.judged.add(queued_2);
    return isNew ? first : undefined;
  }
}
//@ chunk-tyg7f3ek.js:92166-92299 placement
function isPreemptingFollowup(command) {
  return (
    canBatchWith(command) &&
    isHumanOrigin(command.origin) &&
    command.verifiedSlackHumanTurn !== true &&
    command.bridgeOrigin !== true &&
    command.priority === "next" &&
    !command.wait &&
    !isSlashLikeCommand(command)
  );
}
//@ chunk-tyg7f3ek.js:92299-92337 placement
function runSafely(applyBridgeChildCliEntrypoint) {
  try {
    applyBridgeChildCliEntrypoint();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:92337-92453 placement
function firstDispatchableCommand(queued) {
  return queued.find(
    (command) =>
      isActiveMainAgentCommand(command) &&
      (command.mode === "prompt" || command.mode === "orphaned-permission" || command.priority !== "later"),
  );
}
//@ chunk-tyg7f3ek.js:92453-92487 placement
function isSlashLikeCommand(command) {
  return looksLikeSlashInput(command.value);
}
//@ chunk-tyg7f3ek.js:92487-92498 placement
var PREEMPT_DEBOUNCE_MS = 200;
//@ chunk-tyg7f3ek.js:92498-92550 placement
function isFollowupBackgroundsSubagentEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_crescent", false);
}
//@ chunk-tyg7f3ek.js:92550-95036 placement
/**
 * 人发来排队消息时把前台子代理移到后台，让主线程先处理新消息（tengu_valiant_crescent）。
 */
class FollowupBackgroundsSubagent {
  host;
  uninstalled = false;
  watching = false;
  timer;
  responseId;
  queuedAtToolResult = new Set();
  passedOver = new Set();
  constructor(host) {
    this.host = host;
  }
  install() {
    let unsubscribe = this.host.messageQueue.subscribe(() => this.look());
    return () => {
      unsubscribe();
      this.uninstalled = true;
      this.forgetTurn();
    };
  }
  noteTurnStart() {
    this.forgetTurn();
    this.watching = !this.uninstalled && env.CLAUDE_AUTO_BACKGROUND_TASKS;
    this.look();
  }
  noteFrame(frame) {
    if (
      !this.watching ||
      (frame.type !== "user" && frame.type !== "assistant") ||
      frame.parent_tool_use_id !== null
    )
      return;
    this.contained(() => {
      if (frame.type === "user") {
        let { content } = frame.message;
        if (
          !("isReplay" in frame) &&
          Array.isArray(content) &&
          content.some((block) => block.type === "tool_result")
        )
          for (let uuid of this.waitingMessages()) this.queuedAtToolResult.add(uuid);
      } else if (frame.message.id !== this.responseId) {
        this.responseId = frame.message.id;
        let waiting = this.waitingMessages();
        for (let uuid of this.queuedAtToolResult) if (waiting.has(uuid)) this.passedOver.add(uuid);
        this.queuedAtToolResult.clear();
      }
    });
  }
  noteTurnEnd() {
    this.forgetTurn();
  }
  forgetTurn() {
    this.watching = false;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.responseId = undefined;
    this.queuedAtToolResult.clear();
    this.passedOver.clear();
  }
  look() {
    if (!this.watching) return;
    this.contained(() => {
      clearTimeout(this.timer);
      this.timer = undefined;
      let { drain, messageQueue, taskRegistry } = this.host;
      if (
        drain.abortController === undefined ||
        drain.abortController.signal.aborted ||
        !drain.turnUnderWay ||
        drain.endSessionRequested ||
        messageQueue.isMidTurnFoldSuspended() ||
        (isBackgroundTasksOff() && isForegroundAgentMoveDisabled()) ||
        this.waitingMessages().size === 0
      )
        return;
      let values = Object.values(taskRegistry.all());
      let filtered = values
        .filter(isMainThreadForegroundAgent)
        .filter((agent) => agent.abortController?.signal.aborted !== true);
      if (
        filtered.length === 0 ||
        this.host.isHumanDecisionPending() ||
        !filtered.every(isArmedDirectForegroundAgent) ||
        values.some((task) => isMainThreadForegroundShell(task) && task.status === "running") ||
        this.host.hasListedForegroundToolCall() ||
        count(filtered, isAutoBackgroundHeld) > 0
      ) {
        this.lookAgainSoon();
        return;
      }
      if (!this.host.enabled()) return;
      let movedCount = count(filtered, (agent) =>
        tryAutoBackgroundAgent(agent.id, taskRegistry, "follow_up"),
      );
      logForDebugging(
        `[followup-backgrounds-subagent] moved ${movedCount} of ${filtered.length} foreground subagents to the background for a person's queued message`,
      );
      if (movedCount > 0) {
        logFeatureOk("print_followup_backgrounds_subagent");
        this.lookAgainSoon();
      }
    });
  }
  lookAgainSoon() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.look(), PREEMPT_DEBOUNCE_MS);
    this.timer.unref?.();
  }
  waitingMessages() {
    let uuids = new Set();
    for (let queued of filterQueuedCommandsForThread(
      this.host.messageQueue.getCommandsByMaxPriority("next"),
      {
        isMainThread: true,
        currentAgentId: undefined,
      },
    )) {
      if (
        queued.drainOnly === true ||
        queued.screeningPending === true ||
        (queued.uuid !== undefined && this.passedOver.has(queued.uuid))
      )
        break;
      if (queued.uuid !== undefined && isPreemptingFollowup(queued) && !this.host.isSentNow(queued))
        uuids.add(queued.uuid);
    }
    return uuids;
  }
  contained(fn) {
    try {
      fn();
    } catch (error) {
      this.forgetTurn();
      logError(error);
      logFeatureBad("print_followup_backgrounds_subagent", "threw");
    }
  }
}
//@ chunk-tyg7f3ek.js:95036-95418 placement
function reportRedeliveredFollowupClosed(state, hasOpener, closedOn) {
  try {
    let folded = foldedFollowUpEnd(state, hasOpener);
    let badEnd = closedOn === "cancelled" ? "cancelled_with_continuation" : folded?.badEnd;
    if (folded === undefined || badEnd === undefined) return;
    logForDiagnosticsNoPII("info", "cli_redelivered_follow_up_closed_unrun", {
      reason: badEnd,
      ...flagKey("reason", badEnd),
      closed_on_arrival: closedOn === "on_arrival",
      error_was_transient: folded.failedTransiently,
      claude_row_after_it: folded.claudesRowBehind,
      re_run_wrote_a_row: folded.reRunsRowBehind,
      ...chatOriginField(),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:95418-95577 placement
var FOLD_END_NO_MORE_ROWS = {
  end: "no_more_rows",
  modelWrote: false,
  modelEndedTheTurn: undefined,
};
var FOLD_END_SOMETHING_FOLLOWS = {
  ...FOLD_END_NO_MORE_ROWS,
  end: "something_follows",
};
var FOLD_END_STOPPED = {
  ...FOLD_END_NO_MORE_ROWS,
  end: "stopped",
};
var FOLD_END_SOMETHING_FOLLOWS_MODEL_KEPT = {
  ...FOLD_END_SOMETHING_FOLLOWS,
  modelEndedTheTurn: false,
};
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
  FOLD_END_SOMETHING_FOLLOWS_MODEL_KEPT,
  FOLD_END_SOMETHING_FOLLOWS,
  FOLD_END_STOPPED,
};

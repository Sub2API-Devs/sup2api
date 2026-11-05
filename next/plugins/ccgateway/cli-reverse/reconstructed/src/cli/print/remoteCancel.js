/**
 * cli/print/remoteCancel.ts
 *
 * 2.1.316 新增：远程取消处理（取消排队消息、拒绝答复、自身卡片期限、停止后保活）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (20)
 * attribution: placement 20
 */
import { randomUUID } from "crypto";
import { isQueuedUserPrompt, isMainAgentCommand } from "../../utils/messageQueueManager.js";
import {
  isHumanOrAutoContinuation,
  isPeerOrSlackPing,
  isVerifiedSlackHuman,
} from "../../utils/messageProvenance.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { noteAuthRefreshStop } from "../../utils/auth.js";
import { userAbortReason } from "../../utils/abortController.js";
import { mergeTurnUuids } from "./inboundMessages.js";
import { isResumedTurnBatch } from "./userFrameIntake.js";
import { MODEL_SWITCH_STATE } from "./setModelControl.js";
import { env } from "../../utils/env.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_SPLENDID_LYNX } from "../../services/api/withRetry.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { flagKey } from "../structuredIOProtocol.js";
import { chatOriginField } from "./transcriptLeaves.js";
import { logError } from "../../utils/log.js";
import { pluginInputHoldSlot, clearHeldInput } from "../../plugins/functionHooks/inputHold.js";
import {
  emptyPartitionedNotifications,
  partitionStopNotifications,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { forgetCodeliveredFollowups } from "./artifactEditorCodelivery.js";
import { discardPollEvent, isPollEventMode } from "../../utils/pollEvents.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { SERVED_CALL_MAX_AGE_MS } from "../remoteIO/servedCalls.js";
import { sendSessionActivitySignal_2 } from "../../utils/sessionActivity.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { isUnownedRunningShell } from "./backgroundWindDown.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getGrowthBookOkFetchCount,
  onGrowthBookRefresh,
  refreshGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";
import { getLastInteractionTime } from "../../bootstrap/state.js";
import { staleCanUseToolRequests, denyPermissionRequests } from "./permissionAsks.js";
import { logForDebugging } from "../../utils/debug.js";
import { isUserTypedPrompt } from "../../utils/processUserInput/promptOrigin.js";
import { isAbortError } from "../../utils/errors.js";

//@ chunk-0yw3taqg.js:323449-324542 placement
/**
 * 处理远程 cancel/interrupt：区分取消排队消息与打断当前轮次，处理待答权限与延迟绑定。
 */
function handleRemoteCancel({
  messageQueue,
  drain,
  prewaitLatch,
  frameIntake,
  io,
  pressed,
  standsFor,
  deliver,
  letHeldGo,
}) {
  let hasPressed = pressed !== undefined && pressed !== null && pressed !== "";
  letHeldGo?.((queued) => !hasPressed || queued.uuid === pressed);
  let filtered = drain.pendingDispatchUuids.filter(
    (pendingDispatchUuid) => !messageQueue.hasCancelPendingAcked(pendingDispatchUuid),
  );
  let filtered_2 = messageQueue.getCommandQueueSnapshot().filter((queued) => {
    let stands = queued.uuid && standsFor?.(queued.uuid);
    return stands
      ? !hasPressed || stands === pressed
      : isQueuedUserPrompt(queued) &&
          !queued.isMeta &&
          isHumanOrAutoContinuation(queued.origin) &&
          queued.shouldQuery !== false &&
          queued.passive !== true &&
          (!hasPressed || queued.uuid === pressed);
  });
  let abortController = drain.abortController;
  let sendNow;
  if (filtered_2.length === 0)
    sendNow = (
      hasPressed
        ? filtered.some((uuid) => (standsFor?.(uuid) ?? uuid) === pressed) ||
          frameIntake.parkedUuids().some((uuid) => uuid === pressed)
        : (filtered.length > 0 && drain.intentBatchInFlight) || frameIntake.hasParked()
    )
      ? "delivering"
      : "nothing_waiting";
  else if (
    !drain.turnUnderWay ||
    abortController === undefined ||
    abortController.signal.aborted ||
    drain.endSessionRequested ||
    isTerminalShutdown() ||
    filtered_2.every(({ uuid }) => uuid !== undefined && messageQueue.isFoldInFlight(uuid)) ||
    deliver?.() === true
  )
    sendNow = "delivering";
  else {
    noteAuthRefreshStop();
    drain.sendNowCutTurn = true;
    abortController.abort(userAbortReason("remote-cancel"));
    requeueTakenMessage({
      cancelQueued: false,
      messageQueue,
      io,
    });
    sendNow = "stopped";
  }
  let { receipt } = cancelQueuedMessages({
    cancelQueued: false,
    messageQueue,
    drain,
    prewaitLatch,
    frameIntake,
    io,
  });
  return {
    still_queued: receipt.still_queued,
    send_now: sendNow,
    ...(receipt.put_back && {
      put_back: receipt.put_back,
    }),
  };
}
//@ chunk-0yw3taqg.js:324542-324811 placement
function isCancelAimedAtParkedBatch({ drain, prewaitLatch, aim }) {
  if (aim === undefined) return false;
  let batch = prewaitLatch.parkedIntentBatch();
  let merged = mergeTurnUuids(drain.currentTurn, batch);
  if (!merged.known || aim.names(merged.uuids)) return false;
  return !(
    (drain.turnUnderWay
      ? !drain.turnUnderWayAnswersAClient
      : drain.abortController === undefined && !isResumedTurnBatch(batch)) &&
    prewaitLatch.namesQueuedWork(aim)
  );
}
//@ chunk-0yw3taqg.js:324811-324874 placement
var REMOTE_GATE_STATE_LABELS = {
  on: "kept",
  off: "switched_off",
  cold: "flags_not_fetched",
};
//@ chunk-0yw3taqg.js:324874-325043 placement
function interruptCurrentTurn(options) {
  let { drain } = options;
  noteAuthRefreshStop();
  if (drain.abortController) {
    if (!options.lateBind) MODEL_SWITCH_STATE();
    drain.abortController.abort(userAbortReason("remote-cancel"));
    return denyAnswersOnCancel(options, false) || drain.turnUnderWay;
  }
  return cancelPendingAnswers(options);
}
//@ chunk-0yw3taqg.js:325043-325145 placement
function cancelPendingAnswers(options) {
  if (!options.lateBind) MODEL_SWITCH_STATE();
  let interrupted = options.prewaitLatch.interruptBeforeArm(options.aim);
  return denyAnswersOnCancel(options, true) || interrupted;
}
//@ chunk-0yw3taqg.js:325145-326023 placement
function denyAnswersOnCancel(
  { drain, prewaitLatch, aim, cancelQueued, lateBind, onAnswerWaiting },
  besideTheLatch,
) {
  let kept = false;
  try {
    if (!env.CLAUDE_CODE_REMOTE || prewaitLatch.pendingAnswersFor(undefined, cancelQueued).length === 0)
      return false;
    let answers = prewaitLatch.pendingAnswersFor(aim, cancelQueued);
    let outcome =
      answers.length === 0
        ? "not_named"
        : drain.turnUnderWay && drain.intentBatchInFlight
          ? "turn_under_way"
          : REMOTE_GATE_STATE_LABELS[getRemoteFeatureGateState(TENGU_SPLENDID_LYNX)];
    let finalOutcome = outcome === "kept" && lateBind ? "late_bind_not_kept" : outcome;
    if (finalOutcome === "kept") {
      prewaitLatch.startAborted(answers);
      kept = true;
    }
    let fields = {
      beside_the_latch: besideTheLatch,
      answers_reached: answers.length,
      other_batch_taken: prewaitLatch
        .parkedIntentBatch()
        .some((queued) => queued.orphanedPermission === undefined),
      stop_has_names: aim !== undefined,
      cancel_queued: cancelQueued,
      late_bind_interrupt: lateBind,
      turn_armed_before: drain.abortController !== undefined,
    };
    onAnswerWaiting?.(finalOutcome, fields);
    if (finalOutcome === "kept") logFeatureOk("headless_interrupt_kept_for_permission_answer", fields);
    else logFeatureSad("headless_interrupt_kept_for_permission_answer", finalOutcome, fields);
    logForDiagnosticsNoPII("info", "cli_stop_before_permission_answer", () => ({
      outcome: finalOutcome,
      ...flagKey("outcome", finalOutcome),
      ...fields,
      ...chatOriginField(),
    }));
  } catch (error) {
    logError(error);
  }
  return kept;
}
//@ chunk-0yw3taqg.js:326023-326338 placement
function requeueTakenMessage({ cancelQueued, messageQueue, io }) {
  if (cancelQueued) {
    messageQueue.settleTaken();
    return;
  }
  let uuid = messageQueue.requeueTaken()?.uuid;
  if (uuid === undefined) return;
  pluginInputHoldSlot.get()?.sentBefore.add(uuid);
  try {
    io.onCommandLifecycle?.(uuid, "queued");
    logFeatureOk("headless_interrupt_requeue_taken");
  } catch (error) {
    logFeatureSad("headless_interrupt_requeue_taken", "lifecycle_listener_threw");
    logError(error);
  }
}
//@ chunk-0yw3taqg.js:326338-327663 placement
function cancelQueuedMessages({
  cancelQueued,
  turn,
  messageQueue,
  drain,
  prewaitLatch,
  frameIntake,
  waitingCopies,
  io,
}) {
  let filtered = messageQueue
    .getCommandQueueSnapshot()
    .filter(isMainAgentCommand)
    .map((queued) => queued.uuid)
    .filter((uuid) => uuid !== undefined);
  let survivors = emptyPartitionedNotifications();
  let receipt;
  if (cancelQueued) {
    let heldInput = clearHeldInput();
    let combined = messageQueue
      .removeByFilter(isMainAgentCommand, {
        reason: "cleared_on_cancel",
      })
      .concat(heldInput);
    forgetCodeliveredFollowups(combined);
    survivors = partitionStopNotifications(combined);
    discardPollEvent(combined.filter(isPollEventMode), "interrupt cleared the queue");
    let cancelledCopies = [...frameIntake.cancelParked(), ...(waitingCopies?.cancelWaitingToRun() ?? [])];
    for (let uuid of cancelledCopies) io.onCommandLifecycle?.(uuid, "cancelled");
    let keptUuids = new Set([...survivors.staleRows, ...survivors.watchLifecycle].map((row) => row.uuid));
    for (let row of combined)
      if (row.uuid !== undefined && !keptUuids.has(row.uuid)) io.onCommandLifecycle?.(row.uuid, "cancelled");
    prewaitLatch.clearIfNothingPending();
    for (let pendingDispatchUuid of drain.pendingDispatchUuids)
      if (
        messageQueue.markCancelPending(pendingDispatchUuid, {
          terminalEmitted: true,
        })
      )
        io.onCommandLifecycle?.(pendingDispatchUuid, "cancelled");
    receipt = {
      still_queued: [],
      cancelled: [
        ...drain.pendingDispatchUuids,
        ...filtered.filter((uuid) => !keptUuids.has(uuid) && true),
        ...heldInput.flatMap((held) => held.uuid ?? []),
        ...cancelledCopies,
      ],
    };
  } else {
    if (turn === undefined && !drain.abortController) waitingCopies?.stopWaitingToRun();
    let flattened = messageQueue
      .getCommandQueueSnapshot()
      .flatMap((queued) => (queued.runsAlone && queued.uuid !== undefined ? [queued.uuid] : []));
    receipt = {
      still_queued: [
        ...drain.pendingDispatchUuids.filter(
          (pendingDispatchUuid) => !messageQueue.hasCancelPendingAcked(pendingDispatchUuid),
        ),
        ...filtered,
        ...frameIntake.parkedUuids(),
        ...(waitingCopies?.waitingToRun ?? []),
      ],
      ...(flattened.length > 0 && {
        put_back: flattened,
      }),
    };
  }
  if (turn !== undefined) {
    receipt.turn = turn;
    logFeatureOk("headless_interrupt_turn", {
      outcome: fromEnum(turn),
    });
  }
  return {
    receipt,
    clearSurvivors: survivors,
  };
}
//@ chunk-0yw3taqg.js:327663-327727 placement
var KEEPALIVE_AFTER_STOP_INTERVAL_MS = 30000;
var TENGU_CCR_KEEPALIVE_AFTER_STOP_ENABLED = "tengu_ccr_keepalive_after_stop_enabled";
var OWN_CARD_DEADLINE_MS = SERVED_CALL_MAX_AGE_MS;
//@ chunk-0yw3taqg.js:327727-329531 placement
/**
 * CCR 会话被 Stop 后仍在后台工作时，定期发送 keepalive 帧（tengu_ccr_keepalive_after_stop_enabled）。
 */
class KeepaliveAfterStop {
  deps;
  timer;
  armedAt = 0;
  framesSent = 0;
  sawFlagOn = false;
  loggedWorkOnlyStop = false;
  unregisterExitCleanup;
  constructor(deps) {
    this.deps = deps;
  }
  arm() {
    if (this.timer !== undefined) return;
    try {
      let remoteFeatureGateState = getRemoteFeatureGateState(TENGU_CCR_KEEPALIVE_AFTER_STOP_ENABLED);
      if (remoteFeatureGateState === "off" || this.deps.isSessionEnding()) return;
      let turnSignal = this.deps.getTurnSignal();
      if (turnSignal !== undefined && !turnSignal.aborted) return;
      let shellState = unownedShellState(this.deps.getTasks(), Date.now());
      if (shellState === "past_ceiling" && remoteFeatureGateState === "on")
        this.logWindow("ceiling_at_stop", 0, 0);
      if (shellState !== "some") return;
      if (sendSessionActivitySignal_2()) {
        if (remoteFeatureGateState === "on" && !this.loggedWorkOnlyStop) {
          this.loggedWorkOnlyStop = true;
          this.logWindow("keepalive_for_work_only", 0, 0);
        }
        return;
      }
      this.timer = setInterval(tickKeepalive, KEEPALIVE_AFTER_STOP_INTERVAL_MS, this);
      this.timer.unref?.();
      this.armedAt = Date.now();
      this.framesSent = 0;
      this.sawFlagOn = remoteFeatureGateState === "on";
      this.unregisterExitCleanup = registerCleanup(async () => this.end("shutdown"));
    } catch (error) {
      this.fail(error, "arm_throw");
    }
  }
  disarm(state) {
    this.loggedWorkOnlyStop = false;
    try {
      this.end(state);
    } catch (error) {
      this.fail(error, "disarm_throw");
    }
  }
  tick() {
    try {
      let turnSignal = this.deps.getTurnSignal();
      if (this.deps.isSessionEnding()) {
        this.end("session_ending");
        return;
      }
      if (turnSignal !== undefined && !turnSignal.aborted) {
        this.end("live_turn");
        return;
      }
      let remoteFeatureGateState = getRemoteFeatureGateState(TENGU_CCR_KEEPALIVE_AFTER_STOP_ENABLED);
      if (remoteFeatureGateState === "off") {
        this.end("flag_off");
        return;
      }
      if (remoteFeatureGateState === "on") this.sawFlagOn = true;
      if (sendSessionActivitySignal_2()) {
        this.end("keepalive_for_work_only");
        return;
      }
      let shellState = unownedShellState(this.deps.getTasks(), Date.now());
      if (shellState !== "some") {
        this.end(shellState === "past_ceiling" ? "ceiling" : "task_ended");
        return;
      }
      if (remoteFeatureGateState === "cold") return;
      this.deps.sendKeepAlive();
      this.framesSent++;
    } catch (error) {
      this.fail(error, "tick_throw");
    }
  }
  clear() {
    if (this.timer === undefined) return false;
    clearInterval(this.timer);
    this.timer = undefined;
    this.unregisterExitCleanup?.();
    this.unregisterExitCleanup = undefined;
    return true;
  }
  end(keepalive) {
    if (!this.clear()) return;
    if (this.sawFlagOn) this.logWindow(keepalive, this.framesSent, Date.now() - this.armedAt);
  }
  logWindow(reason, framesSent, armedMs) {
    logFeatureOk("ccr_keepalive_after_stop", {
      retire_reason: fromEnum(reason),
      frames_sent: framesSent,
      armed_ms: armedMs,
    });
  }
  fail(reason, error) {
    this.clear();
    logFeatureBad("ccr_keepalive_after_stop", error);
    logError(reason);
  }
}
//@ chunk-0yw3taqg.js:329531-329555 placement
function tickKeepalive(keepalive) {
  keepalive.tick();
}
//@ chunk-0yw3taqg.js:329555-329704 placement
function unownedShellState(tasks, now) {
  let sawPastCeiling = false;
  for (let task of Object.values(tasks ?? {})) {
    if (!isUnownedRunningShell(task)) continue;
    if (now - task.startTime < OWN_CARD_DEADLINE_MS) return "some";
    sawPastCeiling = true;
  }
  return sawPastCeiling ? "past_ceiling" : "none";
}
//@ chunk-0yw3taqg.js:329704-329801 placement
var TENGU_MISTY_AURORA = "tengu_misty_aurora";
var OWN_CARD_CHECK_INTERVAL_MS = 30000;
var OWN_CARD_EXTEND_MIN_MS = 3600000;
var OWN_CARD_DEADLINE_RESERVE_MS = 600000;
var OWN_CARD_LATE_ASK_GRACE_MS = 90000;
var TASK_HOLD_AFTER_INTERACTION_MS = 600000;
var FLAGS_FRESH_MS = 300000;
var FLAG_FETCH_ASK_COOLDOWN_MS = 120000;
//@ chunk-0yw3taqg.js:329801-330000 placement
function unansweredCardDeadlineMs() {
  let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
  if (
    !env.CLAUDE_CODE_REMOTE ||
    (CLAUDE_CODE_ENVIRONMENT_KIND !== undefined && CLAUDE_CODE_ENVIRONMENT_KIND !== "anthropic_cloud")
  )
    return 0;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MISTY_AURORA, 0);
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    featureValue_CACHED_MAY_BE_STALE * 1000 >= OWN_CARD_EXTEND_MIN_MS
    ? Math.min(featureValue_CACHED_MAY_BE_STALE * 1000, SERVED_CALL_MAX_AGE_MS - OWN_CARD_DEADLINE_RESERVE_MS)
    : 0;
}
//@ chunk-0yw3taqg.js:330000-332212 placement
/**
 * 无人应答的权限卡片超时管理：服务器任务持有开始后超过期限则拒绝这些卡片（tengu_misty_aurora）。
 */
class OwnCardDeadline {
  deps;
  timer;
  firstSeenAt = new Map();
  flagsFetchedAt;
  okFlagFetches = getGrowthBookOkFetchCount();
  flagFetchAskedAt;
  flagFetchFailureReported = false;
  unsubscribeFromFlags;
  constructor(deps) {
    this.deps = deps;
    this.unsubscribeFromFlags = onGrowthBookRefresh(() => {
      let growthBookOkFetchCount = getGrowthBookOkFetchCount();
      if (growthBookOkFetchCount > this.okFlagFetches) {
        this.flagsFetchedAt = Date.now();
        this.flagFetchAskedAt = undefined;
        this.flagFetchFailureReported = false;
      }
      this.okFlagFetches = growthBookOkFetchCount;
      this.arm();
      this.tick();
    });
  }
  arm() {
    try {
      if (
        unansweredCardDeadlineMs() === 0 ||
        this.deps.isSessionEnding() ||
        this.noteCards(Date.now()) === 0 ||
        this.timer !== undefined
      )
        return;
      this.timer = setInterval(tickOwnCardDeadline, OWN_CARD_CHECK_INTERVAL_MS, this);
      this.timer.unref?.();
    } catch (error) {
      this.fail(error, "arm_throw");
    }
  }
  disarm() {
    clearInterval(this.timer);
    this.timer = undefined;
  }
  dispose() {
    this.unsubscribeFromFlags();
    this.disarm();
  }
  tick() {
    try {
      let now = Date.now();
      let cardState = this.noteCards(now);
      let deadlineMs = unansweredCardDeadlineMs();
      if (cardState === 0 || deadlineMs === 0 || this.deps.isSessionEnding()) {
        this.disarm();
        return;
      }
      let holdSince = this.deps.io.taskHoldSince();
      if (
        holdSince === undefined ||
        now < holdSince + deadlineMs ||
        now < getLastInteractionTime() + TASK_HOLD_AFTER_INTERACTION_MS
      )
        return;
      let staleRequests = staleCanUseToolRequests(this.deps.io, this.deps.mainTranscript);
      if (staleRequests === undefined) {
        this.disarm();
        logFeatureBad("ccr_own_card_deadline", "cards_unreadable");
        return;
      }
      if (staleRequests.length !== this.deps.io.pendingHumanRequestCount) return;
      let requests = staleRequests.filter(
        ({ request_id: requestId }) =>
          now >= (this.firstSeenAt.get(requestId) ?? now) + OWN_CARD_LATE_ASK_GRACE_MS,
      );
      if (requests.length === 0 || !this.hasFreshFlags(now)) return;
      for (let { request_id: requestId } of requests) this.firstSeenAt.delete(requestId);
      let deniedCount = denyPermissionRequests(this.deps.io, requests);
      if (deniedCount > 0) {
        logForDebugging(
          `[own-card-deadline] declined ${deniedCount} permission card(s) nobody answered, ${Math.round((now - holdSince) / 60000)} min after the server's task hold began`,
        );
        logFeatureOk("ccr_own_card_deadline", {
          declined: deniedCount,
          hold_age_ms: now - holdSince,
        });
      }
      if (deniedCount < requests.length) logFeatureSad("ccr_own_card_deadline", "decline_not_settled");
    } catch (error) {
      this.fail(error, "tick_throw");
    }
  }
  hasFreshFlags(flags) {
    if (this.flagsFetchedAt !== undefined && flags - this.flagsFetchedAt <= FLAGS_FRESH_MS) return true;
    if (this.flagFetchAskedAt !== undefined) {
      if (flags - this.flagFetchAskedAt < FLAG_FETCH_ASK_COOLDOWN_MS) return false;
      if (!this.flagFetchFailureReported) {
        this.flagFetchFailureReported = true;
        logFeatureSad("ccr_own_card_deadline", "flag_fetch_brought_nothing");
      }
    }
    this.flagFetchAskedAt = flags;
    refreshGrowthBookFeatures().catch(logError);
    return false;
  }
  noteCards(nowMs) {
    let pendingIds = new Set(
      this.deps.io.getPendingPermissionRequests().map(({ request_id: requestId }) => requestId),
    );
    for (let key of this.firstSeenAt.keys()) if (!pendingIds.has(key)) this.firstSeenAt.delete(key);
    for (let requestId of pendingIds)
      if (!this.firstSeenAt.has(requestId)) this.firstSeenAt.set(requestId, nowMs);
    return pendingIds.size;
  }
  fail(reason, error) {
    this.disarm();
    logFeatureBad("ccr_own_card_deadline", error);
    logError(reason);
  }
}
//@ chunk-0yw3taqg.js:332212-332236 placement
function tickOwnCardDeadline(deadline) {
  deadline.tick();
}
//@ chunk-0yw3taqg.js:332273-332590 placement
function markOwnWord(message, fromHost) {
  try {
    let hostAsked = fromHost && message.shouldQuery !== false && !isPeerOrSlackPing(message.origin);
    let isOwnWord =
      hostAsked &&
      message.seededSummon !== true &&
      message.foreignWord === undefined &&
      message.artifactCommentTurn === undefined &&
      !isVerifiedSlackHuman(message) &&
      isUserTypedPrompt(message.value, message.origin, message.isMeta === true);
    let needsStopKey = isOwnWord && message.uuid === undefined;
    return hostAsked
      ? {
          ...message,
          hostAsked: true,
          ...(isOwnWord && {
            ownWord: true,
          }),
          ...(needsStopKey && {
            stopKey: randomUUID(),
          }),
        }
      : message;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return message;
  }
}
//@ chunk-0yw3taqg.js:332590-332664 placement
function withOwnWordStopKey(message) {
  return {
    ...message,
    ownWord: true,
    ...(message.uuid === undefined && {
      stopKey: randomUUID(),
    }),
  };
}
//@ chunk-0yw3taqg.js:332664-332740 placement
function cancelSourceLabels(text, text_2) {
  return [
    ...(text ? [cancelSourceLabel(text, "process")] : []),
    ...(text_2 ? [cancelSourceLabel(text_2, "person")] : []),
  ];
}
//@ chunk-0yw3taqg.js:332740-332781 placement
function cancelSourceLabel(text, sentBy) {
  return {
    text,
    sentBy,
  };
}
export {
  KeepaliveAfterStop,
  OwnCardDeadline,
  handleRemoteCancel,
  isCancelAimedAtParkedBatch,
  cancelQueuedMessages,
  interruptCurrentTurn,
  requeueTakenMessage,
  cancelSourceLabels,
  withOwnWordStopKey,
  markOwnWord,
};

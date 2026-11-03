/**
 * cli/print/remoteCancel.ts
 *
 * 2.1.316 新增：远程取消处理（取消排队消息、拒绝答复、自身卡片期限、停止后保活）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (20)
 * attribution: placement 20
 */
import { randomUUID } from "crypto";
import { isPromptModeQueuedCommand, isMainAgentCommand } from "../../utils/messageQueueManager.js";
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

//@ chunk-tyg7f3ek.js:293818-294907 placement
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
  let P = pressed !== undefined && pressed !== null && pressed !== "";
  letHeldGo?.((re) => !P || re.uuid === pressed);
  let filtered = drain.pendingDispatchUuids.filter(
    (pendingDispatchUuid) => !messageQueue.hasCancelPendingAcked(pendingDispatchUuid),
  );
  let filtered_2 = messageQueue.getCommandQueueSnapshot().filter((re) => {
    let Ae = re.uuid && standsFor?.(re.uuid);
    return Ae
      ? !P || Ae === pressed
      : isPromptModeQueuedCommand(re) &&
          !re.isMeta &&
          isHumanOrAutoContinuation(re.origin) &&
          re.shouldQuery !== false &&
          re.passive !== true &&
          (!P || re.uuid === pressed);
  });
  let abortController = drain.abortController;
  let G;
  if (filtered_2.length === 0)
    G = (
      P
        ? filtered.some((re) => (standsFor?.(re) ?? re) === pressed) ||
          frameIntake.parkedUuids().some((re) => re === pressed)
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
    G = "delivering";
  else {
    noteAuthRefreshStop();
    drain.sendNowCutTurn = true;
    abortController.abort(userAbortReason("remote-cancel"));
    requeueTakenMessage({
      cancelQueued: false,
      messageQueue,
      io,
    });
    G = "stopped";
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
    send_now: G,
    ...(receipt.put_back && {
      put_back: receipt.put_back,
    }),
  };
}
//@ chunk-tyg7f3ek.js:294907-295176 placement
function isCancelAimedAtParkedBatch({ drain, prewaitLatch, aim }) {
  if (aim === undefined) return false;
  let s = prewaitLatch.parkedIntentBatch();
  let h = mergeTurnUuids(drain.currentTurn, s);
  if (!h.known || aim.names(h.uuids)) return false;
  return !(
    (drain.turnUnderWay
      ? !drain.turnUnderWayAnswersAClient
      : drain.abortController === undefined && !isResumedTurnBatch(s)) && prewaitLatch.namesQueuedWork(aim)
  );
}
//@ chunk-tyg7f3ek.js:295176-295239 placement
var REMOTE_GATE_STATE_LABELS = {
  on: "kept",
  off: "switched_off",
  cold: "flags_not_fetched",
};
//@ chunk-tyg7f3ek.js:295239-295408 placement
function interruptCurrentTurn(e) {
  let { drain } = e;
  noteAuthRefreshStop();
  if (drain.abortController) {
    if (!e.lateBind) MODEL_SWITCH_STATE();
    drain.abortController.abort(userAbortReason("remote-cancel"));
    return denyAnswersOnCancel(e, false) || drain.turnUnderWay;
  }
  return cancelPendingAnswers(e);
}
//@ chunk-tyg7f3ek.js:295408-295510 placement
function cancelPendingAnswers(e) {
  if (!e.lateBind) MODEL_SWITCH_STATE();
  let n = e.prewaitLatch.interruptBeforeArm(e.aim);
  return denyAnswersOnCancel(e, true) || n;
}
//@ chunk-tyg7f3ek.js:295510-296387 placement
function denyAnswersOnCancel(
  { drain, prewaitLatch, aim, cancelQueued, lateBind, onAnswerWaiting },
  besideTheLatch,
) {
  let R = false;
  try {
    if (!env.CLAUDE_CODE_REMOTE || prewaitLatch.pendingAnswersFor(undefined, cancelQueued).length === 0)
      return false;
    let w = prewaitLatch.pendingAnswersFor(aim, cancelQueued);
    let P =
      w.length === 0
        ? "not_named"
        : drain.turnUnderWay && drain.intentBatchInFlight
          ? "turn_under_way"
          : REMOTE_GATE_STATE_LABELS[getRemoteFeatureGateState(TENGU_SPLENDID_LYNX)];
    let L = P === "kept" && lateBind ? "late_bind_not_kept" : P;
    if (L === "kept") {
      prewaitLatch.startAborted(w);
      R = true;
    }
    let q = {
      beside_the_latch: besideTheLatch,
      answers_reached: w.length,
      other_batch_taken: prewaitLatch.parkedIntentBatch().some((x) => x.orphanedPermission === undefined),
      stop_has_names: aim !== undefined,
      cancel_queued: cancelQueued,
      late_bind_interrupt: lateBind,
      turn_armed_before: drain.abortController !== undefined,
    };
    onAnswerWaiting?.(L, q);
    if (L === "kept") logFeatureOk("headless_interrupt_kept_for_permission_answer", q);
    else logFeatureSad("headless_interrupt_kept_for_permission_answer", L, q);
    logForDiagnosticsNoPII("info", "cli_stop_before_permission_answer", () => ({
      outcome: L,
      ...flagKey("outcome", L),
      ...q,
      ...chatOriginField(),
    }));
  } catch (error) {
    logError(error);
  }
  return R;
}
//@ chunk-tyg7f3ek.js:296387-296701 placement
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
//@ chunk-tyg7f3ek.js:296701-298033 placement
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
    .map((q) => q.uuid)
    .filter((q) => q !== undefined);
  let P = emptyPartitionedNotifications();
  let L;
  if (cancelQueued) {
    let q = clearHeldInput();
    let combined = messageQueue
      .removeByFilter(isMainAgentCommand, {
        reason: "cleared_on_cancel",
      })
      .concat(q);
    forgetCodeliveredFollowups(combined);
    P = partitionStopNotifications(combined);
    discardPollEvent(combined.filter(isPollEventMode), "interrupt cleared the queue");
    let G = [...(frameIntake?.cancelParked() ?? []), ...(waitingCopies?.cancelWaitingToRun() ?? [])];
    for (let re of G) io.onCommandLifecycle?.(re, "cancelled");
    let Z = new Set([...P.staleRows, ...P.watchLifecycle].map((re) => re.uuid));
    for (let re of combined)
      if (re.uuid !== undefined && !Z.has(re.uuid)) io.onCommandLifecycle?.(re.uuid, "cancelled");
    prewaitLatch.clearIfNothingPending();
    for (let pendingDispatchUuid of drain.pendingDispatchUuids)
      if (
        messageQueue.markCancelPending(pendingDispatchUuid, {
          terminalEmitted: true,
        })
      )
        io.onCommandLifecycle?.(pendingDispatchUuid, "cancelled");
    L = {
      still_queued: [],
      cancelled: [
        ...drain.pendingDispatchUuids,
        ...filtered.filter((re) => !Z.has(re) && true),
        ...q.flatMap((re) => re.uuid ?? []),
        ...G,
      ],
    };
  } else {
    if (turn === undefined && !drain.abortController) waitingCopies?.stopWaitingToRun();
    let flattened = messageQueue
      .getCommandQueueSnapshot()
      .flatMap((x) => (x.runsAlone && x.uuid !== undefined ? [x.uuid] : []));
    L = {
      still_queued: [
        ...drain.pendingDispatchUuids.filter(
          (pendingDispatchUuid) => !messageQueue.hasCancelPendingAcked(pendingDispatchUuid),
        ),
        ...filtered,
        ...(frameIntake?.parkedUuids() ?? []),
        ...(waitingCopies?.waitingToRun ?? []),
      ],
      ...(flattened.length > 0 && {
        put_back: flattened,
      }),
    };
  }
  if (turn !== undefined) {
    L.turn = turn;
    logFeatureOk("headless_interrupt_turn", {
      outcome: fromEnum(turn),
    });
  }
  return {
    receipt: L,
    clearSurvivors: P,
  };
}
//@ chunk-tyg7f3ek.js:298033-298097 placement
var KEEPALIVE_AFTER_STOP_INTERVAL_MS = 30000;
var TENGU_CCR_KEEPALIVE_AFTER_STOP_ENABLED = "tengu_ccr_keepalive_after_stop_enabled";
var OWN_CARD_DEADLINE_MS = SERVED_CALL_MAX_AGE_MS;
//@ chunk-tyg7f3ek.js:298097-299901 placement
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
      let r = unownedShellState(this.deps.getTasks(), Date.now());
      if (r === "past_ceiling" && remoteFeatureGateState === "on") this.logWindow("ceiling_at_stop", 0, 0);
      if (r !== "some") return;
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
  disarm(e) {
    this.loggedWorkOnlyStop = false;
    try {
      this.end(e);
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
      let r = unownedShellState(this.deps.getTasks(), Date.now());
      if (r !== "some") {
        this.end(r === "past_ceiling" ? "ceiling" : "task_ended");
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
  end(e) {
    if (!this.clear()) return;
    if (this.sawFlagOn) this.logWindow(e, this.framesSent, Date.now() - this.armedAt);
  }
  logWindow(e, framesSent, armedMs) {
    logFeatureOk("ccr_keepalive_after_stop", {
      retire_reason: fromEnum(e),
      frames_sent: framesSent,
      armed_ms: armedMs,
    });
  }
  fail(e, n) {
    this.clear();
    logFeatureBad("ccr_keepalive_after_stop", n);
    logError(e);
  }
}
//@ chunk-tyg7f3ek.js:299901-299925 placement
function tickKeepalive(e) {
  e.tick();
}
//@ chunk-tyg7f3ek.js:299925-300074 placement
function unownedShellState(tasks, n) {
  let r = false;
  for (let s of Object.values(tasks ?? {})) {
    if (!isUnownedRunningShell(s)) continue;
    if (n - s.startTime < OWN_CARD_DEADLINE_MS) return "some";
    r = true;
  }
  return r ? "past_ceiling" : "none";
}
//@ chunk-tyg7f3ek.js:300074-300171 placement
var TENGU_MISTY_AURORA = "tengu_misty_aurora";
var OWN_CARD_CHECK_INTERVAL_MS = 30000;
var OWN_CARD_EXTEND_MIN_MS = 3600000;
var OWN_CARD_DEADLINE_RESERVE_MS = 600000;
var OWN_CARD_LATE_ASK_GRACE_MS = 90000;
var TASK_HOLD_AFTER_INTERACTION_MS = 600000;
var FLAGS_FRESH_MS = 300000;
var FLAG_FETCH_ASK_COOLDOWN_MS = 120000;
//@ chunk-tyg7f3ek.js:300171-300370 placement
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
//@ chunk-tyg7f3ek.js:300370-302582 placement
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
      let n = this.noteCards(now);
      let r = unansweredCardDeadlineMs();
      if (n === 0 || r === 0 || this.deps.isSessionEnding()) {
        this.disarm();
        return;
      }
      let s = this.deps.io.taskHoldSince();
      if (s === undefined || now < s + r || now < getLastInteractionTime() + TASK_HOLD_AFTER_INTERACTION_MS)
        return;
      let h = staleCanUseToolRequests(this.deps.io, this.deps.mainTranscript);
      if (h === undefined) {
        this.disarm();
        logFeatureBad("ccr_own_card_deadline", "cards_unreadable");
        return;
      }
      if (h.length !== this.deps.io.pendingHumanRequestCount) return;
      let filtered = h.filter(
        ({ request_id: requestId }) =>
          now >= (this.firstSeenAt.get(requestId) ?? now) + OWN_CARD_LATE_ASK_GRACE_MS,
      );
      if (filtered.length === 0 || !this.hasFreshFlags(now)) return;
      for (let { request_id: requestId } of filtered) this.firstSeenAt.delete(requestId);
      let S = denyPermissionRequests(this.deps.io, filtered);
      if (S > 0) {
        logForDebugging(
          `[own-card-deadline] declined ${S} permission card(s) nobody answered, ${Math.round((now - s) / 60000)} min after the server's task hold began`,
        );
        logFeatureOk("ccr_own_card_deadline", {
          declined: S,
          hold_age_ms: now - s,
        });
      }
      if (S < filtered.length) logFeatureSad("ccr_own_card_deadline", "decline_not_settled");
    } catch (error) {
      this.fail(error, "tick_throw");
    }
  }
  hasFreshFlags(e) {
    if (this.flagsFetchedAt !== undefined && e - this.flagsFetchedAt <= FLAGS_FRESH_MS) return true;
    if (this.flagFetchAskedAt !== undefined) {
      if (e - this.flagFetchAskedAt < FLAG_FETCH_ASK_COOLDOWN_MS) return false;
      if (!this.flagFetchFailureReported) {
        this.flagFetchFailureReported = true;
        logFeatureSad("ccr_own_card_deadline", "flag_fetch_brought_nothing");
      }
    }
    this.flagFetchAskedAt = e;
    refreshGrowthBookFeatures().catch(logError);
    return false;
  }
  noteCards(e) {
    let n = new Set(
      this.deps.io.getPendingPermissionRequests().map(({ request_id: requestId }) => requestId),
    );
    for (let key of this.firstSeenAt.keys()) if (!n.has(key)) this.firstSeenAt.delete(key);
    for (let r of n) if (!this.firstSeenAt.has(r)) this.firstSeenAt.set(r, e);
    return n.size;
  }
  fail(e, n) {
    this.disarm();
    logFeatureBad("ccr_own_card_deadline", n);
    logError(e);
  }
}
//@ chunk-tyg7f3ek.js:302582-302606 placement
function tickOwnCardDeadline(e) {
  e.tick();
}
//@ chunk-tyg7f3ek.js:302643-302960 placement
function markOwnWord(e, n) {
  try {
    let r = n && e.shouldQuery !== false && !isPeerOrSlackPing(e.origin);
    let s =
      r &&
      e.seededSummon !== true &&
      e.foreignWord === undefined &&
      e.artifactCommentTurn === undefined &&
      !isVerifiedSlackHuman(e) &&
      isUserTypedPrompt(e.value, e.origin, e.isMeta === true);
    let h = s && e.uuid === undefined;
    return r
      ? {
          ...e,
          hostAsked: true,
          ...(s && {
            ownWord: true,
          }),
          ...(h && {
            stopKey: randomUUID(),
          }),
        }
      : e;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return e;
  }
}
//@ chunk-tyg7f3ek.js:302960-303034 placement
function withOwnWordStopKey(e) {
  return {
    ...e,
    ownWord: true,
    ...(e.uuid === undefined && {
      stopKey: randomUUID(),
    }),
  };
}
//@ chunk-tyg7f3ek.js:303034-303110 placement
function cancelSourceLabels(text, text_2) {
  return [
    ...(text ? [cancelSourceLabel(text, "process")] : []),
    ...(text_2 ? [cancelSourceLabel(text_2, "person")] : []),
  ];
}
//@ chunk-tyg7f3ek.js:303110-303151 placement
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

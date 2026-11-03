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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import { isPromptModeQueuedCommand, $f } from "../../utils/messageQueueManager.js";
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
import { RZ, clearHeldInput } from "../../plugins/functionHooks/inputHold.js";
import { oan, partitionStopNotifications } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { forgetCodeliveredFollowups } from "./artifactEditorCodelivery.js";
import { discardPollEvent, Kv } from "../../utils/pollEvents.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { z1n } from "../remoteIO/servedCalls.js";
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

/**
 * 处理远程 cancel/interrupt：区分取消排队消息与打断当前轮次，处理待答权限与延迟绑定。
 */
//@ chunk-tyg7f3ek.js:293818-294907 placement
function handleRemoteCancel({
  messageQueue: messageQueue,
  drain: drain,
  prewaitLatch: prewaitLatch,
  frameIntake: frameIntake,
  io: io,
  pressed: pressed,
  standsFor: standsFor,
  deliver: deliver,
  letHeldGo: letHeldGo,
}) {
  let P = pressed !== void 0 && pressed !== null && pressed !== "";
  letHeldGo?.((re) => !P || re.uuid === pressed);
  let filtered = drain.pendingDispatchUuids.filter(
      (pendingDispatchUuid) => !messageQueue.hasCancelPendingAcked(pendingDispatchUuid),
    ),
    filtered_2 = messageQueue.getCommandQueueSnapshot().filter((re) => {
      let Ae = re.uuid && standsFor?.(re.uuid);
      return Ae
        ? !P || Ae === pressed
        : isPromptModeQueuedCommand(re) &&
            !re.isMeta &&
            isHumanOrAutoContinuation(re.origin) &&
            re.shouldQuery !== !1 &&
            re.passive !== !0 &&
            (!P || re.uuid === pressed);
    }),
    abortController = drain.abortController,
    G;
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
    abortController === void 0 ||
    abortController.signal.aborted ||
    drain.endSessionRequested ||
    isTerminalShutdown() ||
    filtered_2.every(({ uuid: uuid }) => uuid !== void 0 && messageQueue.isFoldInFlight(uuid)) ||
    deliver?.() === !0
  )
    G = "delivering";
  else
    (noteAuthRefreshStop(),
      (drain.sendNowCutTurn = !0),
      abortController.abort(userAbortReason("remote-cancel")),
      requeueTakenMessage({ cancelQueued: !1, messageQueue: messageQueue, io: io }),
      (G = "stopped"));
  let { receipt: receipt } = cancelQueuedMessages({
    cancelQueued: !1,
    messageQueue: messageQueue,
    drain: drain,
    prewaitLatch: prewaitLatch,
    frameIntake: frameIntake,
    io: io,
  });
  return {
    still_queued: receipt.still_queued,
    send_now: G,
    ...(receipt.put_back && { put_back: receipt.put_back }),
  };
}
//@ chunk-tyg7f3ek.js:294907-295176 placement
function isCancelAimedAtParkedBatch({ drain: drain, prewaitLatch: prewaitLatch, aim: aim }) {
  if (aim === void 0) return !1;
  let parkedIntentBatch = prewaitLatch.parkedIntentBatch(),
    h = mergeTurnUuids(drain.currentTurn, parkedIntentBatch);
  if (!h.known || aim.names(h.uuids)) return !1;
  return !(
    (drain.turnUnderWay
      ? !drain.turnUnderWayAnswersAClient
      : drain.abortController === void 0 && !isResumedTurnBatch(parkedIntentBatch)) &&
    prewaitLatch.namesQueuedWork(aim)
  );
}
//@ chunk-tyg7f3ek.js:295176-295239 placement
var jW = { on: "kept", off: "switched_off", cold: "flags_not_fetched" };
//@ chunk-tyg7f3ek.js:295239-295408 placement
function interruptCurrentTurn(e) {
  let { drain: drain } = e;
  if ((noteAuthRefreshStop(), drain.abortController)) {
    if (!e.lateBind) MODEL_SWITCH_STATE();
    return (
      drain.abortController.abort(userAbortReason("remote-cancel")),
      denyAnswersOnCancel(e, !1) || drain.turnUnderWay
    );
  }
  return cancelPendingAnswers(e);
}
//@ chunk-tyg7f3ek.js:295408-295510 placement
function cancelPendingAnswers(e) {
  if (!e.lateBind) MODEL_SWITCH_STATE();
  let interruptBeforeArm = e.prewaitLatch.interruptBeforeArm(e.aim);
  return denyAnswersOnCancel(e, !0) || interruptBeforeArm;
}
//@ chunk-tyg7f3ek.js:295510-296387 placement
function denyAnswersOnCancel(
  {
    drain: drain,
    prewaitLatch: prewaitLatch,
    aim: aim,
    cancelQueued: cancelQueued,
    lateBind: lateBind,
    onAnswerWaiting: onAnswerWaiting,
  },
  S,
) {
  let R = !1;
  try {
    if (!env.CLAUDE_CODE_REMOTE || prewaitLatch.pendingAnswersFor(void 0, cancelQueued).length === 0)
      return !1;
    let pendingAnswersFor = prewaitLatch.pendingAnswersFor(aim, cancelQueued),
      P =
        pendingAnswersFor.length === 0
          ? "not_named"
          : drain.turnUnderWay && drain.intentBatchInFlight
            ? "turn_under_way"
            : jW[getRemoteFeatureGateState(TENGU_SPLENDID_LYNX)],
      L = P === "kept" && lateBind ? "late_bind_not_kept" : P;
    if (L === "kept") (prewaitLatch.startAborted(pendingAnswersFor), (R = !0));
    let q = {
      beside_the_latch: S,
      answers_reached: pendingAnswersFor.length,
      other_batch_taken: prewaitLatch.parkedIntentBatch().some((x) => x.orphanedPermission === void 0),
      stop_has_names: aim !== void 0,
      cancel_queued: cancelQueued,
      late_bind_interrupt: lateBind,
      turn_armed_before: drain.abortController !== void 0,
    };
    if ((onAnswerWaiting?.(L, q), L === "kept"))
      logFeatureOk("headless_interrupt_kept_for_permission_answer", q);
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
function requeueTakenMessage({ cancelQueued: cancelQueued, messageQueue: messageQueue, io: io }) {
  if (cancelQueued) {
    messageQueue.settleTaken();
    return;
  }
  let s = messageQueue.requeueTaken()?.uuid;
  if (s === void 0) return;
  RZ.get()?.sentBefore.add(s);
  try {
    (io.onCommandLifecycle?.(s, "queued"), logFeatureOk("headless_interrupt_requeue_taken"));
  } catch (error) {
    (logFeatureSad("headless_interrupt_requeue_taken", "lifecycle_listener_threw"), logError(error));
  }
}
//@ chunk-tyg7f3ek.js:296701-298033 placement
function cancelQueuedMessages({
  cancelQueued: cancelQueued,
  turn: turn,
  messageQueue: messageQueue,
  drain: drain,
  prewaitLatch: prewaitLatch,
  frameIntake: frameIntake,
  waitingCopies: waitingCopies,
  io: io,
}) {
  let filtered = messageQueue
      .getCommandQueueSnapshot()
      .filter($f)
      .map((q) => q.uuid)
      .filter((q) => q !== void 0),
    P = oan(),
    L;
  if (cancelQueued) {
    let q = clearHeldInput(),
      combined = messageQueue.removeByFilter($f, { reason: "cleared_on_cancel" }).concat(q);
    (forgetCodeliveredFollowups(combined),
      (P = partitionStopNotifications(combined)),
      discardPollEvent(combined.filter(Kv), "interrupt cleared the queue"));
    let G = [...(frameIntake?.cancelParked() ?? []), ...(waitingCopies?.cancelWaitingToRun() ?? [])];
    for (let re of G) io.onCommandLifecycle?.(re, "cancelled");
    let Z = new Set([...P.staleRows, ...P.watchLifecycle].map((re) => re.uuid));
    for (let re of combined)
      if (re.uuid !== void 0 && !Z.has(re.uuid)) io.onCommandLifecycle?.(re.uuid, "cancelled");
    prewaitLatch.clearIfNothingPending();
    for (let pendingDispatchUuid of drain.pendingDispatchUuids)
      if (messageQueue.markCancelPending(pendingDispatchUuid, { terminalEmitted: !0 }))
        io.onCommandLifecycle?.(pendingDispatchUuid, "cancelled");
    L = {
      still_queued: [],
      cancelled: [
        ...drain.pendingDispatchUuids,
        ...filtered.filter((re) => !Z.has(re) && !0),
        ...q.flatMap((re) => re.uuid ?? []),
        ...G,
      ],
    };
  } else {
    if (turn === void 0 && !drain.abortController) waitingCopies?.stopWaitingToRun();
    let flattened = messageQueue
      .getCommandQueueSnapshot()
      .flatMap((x) => (x.runsAlone && x.uuid !== void 0 ? [x.uuid] : []));
    L = {
      still_queued: [
        ...drain.pendingDispatchUuids.filter(
          (pendingDispatchUuid) => !messageQueue.hasCancelPendingAcked(pendingDispatchUuid),
        ),
        ...filtered,
        ...(frameIntake?.parkedUuids() ?? []),
        ...(waitingCopies?.waitingToRun ?? []),
      ],
      ...(flattened.length > 0 && { put_back: flattened }),
    };
  }
  if (turn !== void 0)
    ((L.turn = turn), logFeatureOk("headless_interrupt_turn", { outcome: fromEnum(turn) }));
  return { receipt: L, clearSurvivors: P };
}
//@ chunk-tyg7f3ek.js:298033-298097 placement
var $W = 30000,
  TENGU_CCR_KEEPALIVE_AFTER_STOP_ENABLED = "tengu_ccr_keepalive_after_stop_enabled",
  KW = z1n;
/**
 * CCR 会话被 Stop 后仍在后台工作时，定期发送 keepalive 帧（tengu_ccr_keepalive_after_stop_enabled）。
 */
//@ chunk-tyg7f3ek.js:298097-299901 placement
class KeepaliveAfterStop {
  deps;
  timer;
  armedAt = 0;
  framesSent = 0;
  sawFlagOn = !1;
  loggedWorkOnlyStop = !1;
  unregisterExitCleanup;
  constructor(e) {
    this.deps = e;
  }
  arm() {
    if (this.timer !== void 0) return;
    try {
      let e = getRemoteFeatureGateState(TENGU_CCR_KEEPALIVE_AFTER_STOP_ENABLED);
      if (e === "off" || this.deps.isSessionEnding()) return;
      let turnSignal = this.deps.getTurnSignal();
      if (turnSignal !== void 0 && !turnSignal.aborted) return;
      let r = unownedShellState(this.deps.getTasks(), Date.now());
      if (r === "past_ceiling" && e === "on") this.logWindow("ceiling_at_stop", 0, 0);
      if (r !== "some") return;
      if (sendSessionActivitySignal_2()) {
        if (e === "on" && !this.loggedWorkOnlyStop)
          ((this.loggedWorkOnlyStop = !0), this.logWindow("keepalive_for_work_only", 0, 0));
        return;
      }
      ((this.timer = setInterval(VW, $W, this)),
        this.timer.unref?.(),
        (this.armedAt = Date.now()),
        (this.framesSent = 0),
        (this.sawFlagOn = e === "on"),
        (this.unregisterExitCleanup = registerCleanup(async () => this.end("shutdown"))));
    } catch (error) {
      this.fail(error, "arm_throw");
    }
  }
  disarm(e) {
    this.loggedWorkOnlyStop = !1;
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
      if (turnSignal !== void 0 && !turnSignal.aborted) {
        this.end("live_turn");
        return;
      }
      let n = getRemoteFeatureGateState(TENGU_CCR_KEEPALIVE_AFTER_STOP_ENABLED);
      if (n === "off") {
        this.end("flag_off");
        return;
      }
      if (n === "on") this.sawFlagOn = !0;
      if (sendSessionActivitySignal_2()) {
        this.end("keepalive_for_work_only");
        return;
      }
      let r = unownedShellState(this.deps.getTasks(), Date.now());
      if (r !== "some") {
        this.end(r === "past_ceiling" ? "ceiling" : "task_ended");
        return;
      }
      if (n === "cold") return;
      (this.deps.sendKeepAlive(), this.framesSent++);
    } catch (error) {
      this.fail(error, "tick_throw");
    }
  }
  clear() {
    if (this.timer === void 0) return !1;
    return (
      clearInterval(this.timer),
      (this.timer = void 0),
      this.unregisterExitCleanup?.(),
      (this.unregisterExitCleanup = void 0),
      !0
    );
  }
  end(e) {
    if (!this.clear()) return;
    if (this.sawFlagOn) this.logWindow(e, this.framesSent, Date.now() - this.armedAt);
  }
  logWindow(e, n, r) {
    logFeatureOk("ccr_keepalive_after_stop", { retire_reason: fromEnum(e), frames_sent: n, armed_ms: r });
  }
  fail(e, n) {
    (this.clear(), logFeatureBad("ccr_keepalive_after_stop", n), logError(e));
  }
}
//@ chunk-tyg7f3ek.js:299901-299925 placement
function VW(e) {
  e.tick();
}
//@ chunk-tyg7f3ek.js:299925-300074 placement
function unownedShellState(e, n) {
  let r = !1;
  for (let s of Object.values(e ?? {})) {
    if (!isUnownedRunningShell(s)) continue;
    if (n - s.startTime < KW) return "some";
    r = !0;
  }
  return r ? "past_ceiling" : "none";
}
//@ chunk-tyg7f3ek.js:300074-300171 placement
var TENGU_MISTY_AURORA = "tengu_misty_aurora",
  zW = 30000,
  YW = 3600000,
  JW = 600000,
  XW = 90000,
  ZW = 600000,
  eq = 300000,
  tq = 120000;
//@ chunk-tyg7f3ek.js:300171-300370 placement
function unansweredCardDeadlineMs() {
  let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
  if (
    !env.CLAUDE_CODE_REMOTE ||
    (CLAUDE_CODE_ENVIRONMENT_KIND !== void 0 && CLAUDE_CODE_ENVIRONMENT_KIND !== "anthropic_cloud")
  )
    return 0;
  let n = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MISTY_AURORA, 0);
  return typeof n === "number" && n * 1000 >= YW ? Math.min(n * 1000, z1n - JW) : 0;
}
/**
 * 无人应答的权限卡片超时管理：服务器任务持有开始后超过期限则拒绝这些卡片（tengu_misty_aurora）。
 */
//@ chunk-tyg7f3ek.js:300370-302582 placement
class OwnCardDeadline {
  deps;
  timer;
  firstSeenAt = new Map();
  flagsFetchedAt;
  okFlagFetches = getGrowthBookOkFetchCount();
  flagFetchAskedAt;
  flagFetchFailureReported = !1;
  unsubscribeFromFlags;
  constructor(e) {
    this.deps = e;
    this.unsubscribeFromFlags = onGrowthBookRefresh(() => {
      let n = getGrowthBookOkFetchCount();
      if (n > this.okFlagFetches)
        ((this.flagsFetchedAt = Date.now()),
          (this.flagFetchAskedAt = void 0),
          (this.flagFetchFailureReported = !1));
      ((this.okFlagFetches = n), this.arm(), this.tick());
    });
  }
  arm() {
    try {
      if (
        unansweredCardDeadlineMs() === 0 ||
        this.deps.isSessionEnding() ||
        this.noteCards(Date.now()) === 0 ||
        this.timer !== void 0
      )
        return;
      ((this.timer = setInterval(nq, zW, this)), this.timer.unref?.());
    } catch (error) {
      this.fail(error, "arm_throw");
    }
  }
  disarm() {
    (clearInterval(this.timer), (this.timer = void 0));
  }
  dispose() {
    (this.unsubscribeFromFlags(), this.disarm());
  }
  tick() {
    try {
      let now = Date.now(),
        noteCards = this.noteCards(now),
        r = unansweredCardDeadlineMs();
      if (noteCards === 0 || r === 0 || this.deps.isSessionEnding()) {
        this.disarm();
        return;
      }
      let taskHoldSince = this.deps.io.taskHoldSince();
      if (taskHoldSince === void 0 || now < taskHoldSince + r || now < getLastInteractionTime() + ZW) return;
      let h = staleCanUseToolRequests(this.deps.io, this.deps.mainTranscript);
      if (h === void 0) {
        (this.disarm(), logFeatureBad("ccr_own_card_deadline", "cards_unreadable"));
        return;
      }
      if (h.length !== this.deps.io.pendingHumanRequestCount) return;
      let filtered = h.filter(
        ({ request_id: request_id }) => now >= (this.firstSeenAt.get(request_id) ?? now) + XW,
      );
      if (filtered.length === 0 || !this.hasFreshFlags(now)) return;
      for (let { request_id: request_id } of filtered) this.firstSeenAt.delete(request_id);
      let S = denyPermissionRequests(this.deps.io, filtered);
      if (S > 0)
        (logForDebugging(
          `[own-card-deadline] declined ${S} permission card(s) nobody answered, ${Math.round((now - taskHoldSince) / 60000)} min after the server's task hold began`,
        ),
          logFeatureOk("ccr_own_card_deadline", { declined: S, hold_age_ms: now - taskHoldSince }));
      if (S < filtered.length) logFeatureSad("ccr_own_card_deadline", "decline_not_settled");
    } catch (error) {
      this.fail(error, "tick_throw");
    }
  }
  hasFreshFlags(e) {
    if (this.flagsFetchedAt !== void 0 && e - this.flagsFetchedAt <= eq) return !0;
    if (this.flagFetchAskedAt !== void 0) {
      if (e - this.flagFetchAskedAt < tq) return !1;
      if (!this.flagFetchFailureReported)
        ((this.flagFetchFailureReported = !0),
          logFeatureSad("ccr_own_card_deadline", "flag_fetch_brought_nothing"));
    }
    return ((this.flagFetchAskedAt = e), refreshGrowthBookFeatures().catch(logError), !1);
  }
  noteCards(e) {
    let n = new Set(
      this.deps.io.getPendingPermissionRequests().map(({ request_id: request_id }) => request_id),
    );
    for (let r of this.firstSeenAt.keys()) if (!n.has(r)) this.firstSeenAt.delete(r);
    for (let r of n) if (!this.firstSeenAt.has(r)) this.firstSeenAt.set(r, e);
    return n.size;
  }
  fail(e, n) {
    (this.disarm(), logFeatureBad("ccr_own_card_deadline", n), logError(e));
  }
}
//@ chunk-tyg7f3ek.js:302582-302606 placement
function nq(e) {
  e.tick();
}
//@ chunk-tyg7f3ek.js:302643-302960 placement
function markOwnWord(e, n) {
  try {
    let r = n && e.shouldQuery !== !1 && !isPeerOrSlackPing(e.origin),
      s =
        r &&
        e.seededSummon !== !0 &&
        e.foreignWord === void 0 &&
        e.artifactCommentTurn === void 0 &&
        !isVerifiedSlackHuman(e) &&
        isUserTypedPrompt(e.value, e.origin, e.isMeta === !0),
      h = s && e.uuid === void 0;
    return r ? { ...e, hostAsked: !0, ...(s && { ownWord: !0 }), ...(h && { stopKey: randomUUID_12() }) } : e;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return e;
  }
}
//@ chunk-tyg7f3ek.js:302960-303034 placement
function withOwnWordStopKey(e) {
  return { ...e, ownWord: !0, ...(e.uuid === void 0 && { stopKey: randomUUID_12() }) };
}
//@ chunk-tyg7f3ek.js:303034-303110 placement
function cancelSourceLabels(e, n) {
  return [...(e ? [CM(e, "process")] : []), ...(n ? [CM(n, "person")] : [])];
}
//@ chunk-tyg7f3ek.js:303110-303151 placement
function CM(e, n) {
  return { text: e, sentBy: n };
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

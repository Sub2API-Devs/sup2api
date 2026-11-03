/**
 * cli/print/userFrameIntake.ts
 *
 * 2.1.316 新增：用户帧接收、重投解析、输入等待计时与延迟账本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (22)
 * attribution: placement 22
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
import { hasMalformedTextBlocks } from "../remoteIO/ingress.js";
import { logForDebugging } from "../../utils/debug.js";
import { tryOr, chatOriginField, createPersistenceChecker } from "./transcriptLeaves.js";
import { rememberMovedRow, joinTextAtSeam } from "../../utils/messages.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { extractInboundAttachments } from "../../bridge/inboundAttachments.js";
import { im } from "../../utils/messageQueueManager.js";
import { logError } from "../../utils/log.js";
import { matchRequestId, elapsedMs, flagKey } from "../structuredIOProtocol.js";
import { toError } from "../../utils/errors.js";
import { flushSessionStorage } from "../../utils/sessionStorage.js";
import { zsr } from "../../bridge/inboundMessageOrigin.js";
import { mergeQueuedTraceContexts } from "../../utils/telemetry/ccrTraceContext.js";
import { SQ } from "../../utils/peerMessageHeaders.js";
import { zis } from "../../utils/cwd.js";
import { $4s } from "../../services/mcp/ccrTurnId.js";
import { uniq } from "../../utils/collections.js";

/**
 * stdin 用户帧接收器：校验格式、去重（cli_user_message_dedup_*）、暂存/放回、首轮闸门与重投处理。
 */
//@ chunk-tyg7f3ek.js:52052-61714 placement
class UserFrameIntake {
  parked = null;
  heldFrames = new Set();
  ownParked = null;
  admissionBarrier;
  firstTurnGate;
  messageQueue;
  drain;
  receivedMessageUuids;
  reRuns = new Set();
  declinedRedeliveries;
  io;
  transcriptForFrame;
  kick;
  retirementMayLandDuringReads;
  rescueOwnsReRun;
  idleTeeAllowed;
  heldForParkedTurn;
  earlierStartOf;
  leftToReRun;
  takenInAtAPrompt;
  summarisedAway;
  cutBehindItsCompaction;
  readAgain;
  startAborted;
  finishedAtStartUp;
  finishedAtStartUpLogged = !1;
  noteReportedDoneUnrun;
  storeRewindStandIn;
  constructor({
    admissionBarrier: e,
    firstTurnGate: n = () => {
      return;
    },
    messageQueue: r,
    drain: s,
    receivedMessageUuids: h,
    declinedRedeliveries: y,
    io: S,
    transcriptForFrame: R,
    kick: w,
    retirementMayLandDuringReads: P,
    rescueOwnsReRun: L,
    idleTeeAllowed: q,
    heldForParkedTurn: x = () => !1,
    earlierStartOf: G = () => {
      return;
    },
    leftToReRun: Z,
    takenInAtAPrompt: re,
    summarisedAway: Ae = () => {
      return;
    },
    cutBehindItsCompaction: Ue = () => !1,
    readAgain: ce,
    startAborted: nt,
    finishedAtStartUp: ie = () => {
      return;
    },
    noteReportedDoneUnrun: Se = () => {},
    storeRewindStandIn: me,
  }) {
    ((this.admissionBarrier = e),
      (this.firstTurnGate = n),
      (this.messageQueue = r),
      (this.drain = s),
      (this.receivedMessageUuids = h),
      (this.declinedRedeliveries = y),
      (this.io = S),
      (this.transcriptForFrame = R),
      (this.kick = w),
      (this.retirementMayLandDuringReads = P),
      (this.rescueOwnsReRun = L),
      (this.idleTeeAllowed = q),
      (this.heldForParkedTurn = x),
      (this.earlierStartOf = G),
      (this.leftToReRun = Z),
      (this.takenInAtAPrompt = re),
      (this.summarisedAway = Ae),
      (this.cutBehindItsCompaction = Ue),
      (this.readAgain = ce),
      (this.startAborted = nt),
      (this.finishedAtStartUp = ie),
      (this.noteReportedDoneUnrun = Se),
      (this.storeRewindStandIn = me));
  }
  dropMalformed(e) {
    if (!hasMalformedTextBlocks(e.message.content)) return !1;
    if (
      (logForDebugging(
        "Dropping malformed user frame: content must be a string or an array of block objects",
        { level: "error" },
      ),
      e.uuid && !this.receivedMessageUuids.has(e.uuid))
    )
      this.io.onCommandLifecycle?.(e.uuid, "completed");
    return !0;
  }
  isReRun(e) {
    return this.reRuns.has(e);
  }
  async skipDuplicate(e, n, r) {
    let transcriptForFrame = this.transcriptForFrame(),
      retirementMayLandDuringReads = this.retirementMayLandDuringReads(),
      persisted = await transcriptForFrame.persisted(e),
      S = this.receivedMessageUuids.has(e),
      R = r !== void 0 && r.shouldQuery !== !1 && r.seeded_summon !== !0,
      w = persisted && !S && R ? this.askWhetherTakenInAtAPrompt(e) : void 0,
      P =
        persisted && !S && w === void 0 && !this.leftToReRun(e)
          ? await transcriptForFrame.holdersTurnUnanswered(e)
          : void 0,
      L = (!persisted || P === !0) && !S && R ? this.askWhetherSummarisedAway(e) : void 0,
      q = typeof L === "object" && L.whileStillOwed(),
      x = typeof L === "function" ? L : q ? L.whileStillOwed : void 0,
      G = x !== void 0,
      Z = w ?? x,
      re = persisted || G,
      Ae = P === void 0 && tryOr(() => this.cutBehindItsCompaction(e), !1),
      Ue = Z === void 0 && (P ?? (persisted && !S && (Ae || (await transcriptForFrame.turnUnanswered(e)))));
    if (Ue && P === void 0 && retirementMayLandDuringReads && !this.rescueOwnsReRun())
      Ue = await transcriptForFrame.turnUnanswered(e);
    let ce =
        Ue &&
        !(this.leftToReRun(e) && this.heldForParkedTurn(e)) &&
        (P === !0 ||
          (!this.drain.running &&
            !this.messageQueue.hasUserIntentCommandsInQueue() &&
            !this.rescueOwnsReRun())),
      nt = re && !S && !Ue && this.heldForParkedTurn(e),
      ie = Z !== void 0 && (this.drain.running || this.messageQueue.hasUserIntentCommandsInQueue() || Z());
    if (ce) {
      if ((this.declinedRedeliveries.forget(e), this.reRuns.add(e), Ae)) rememberMovedRow(e);
      let Se = tryOr(() => this.earlierStartOf(e), void 0);
      logForDiagnosticsNoPII("info", "cli_user_message_dedup_reexecuted", {
        ...(Ae && { nothing_stored_after_compaction: !0 }),
        runs_by_holders_rule: P === !0,
        ...(Se !== void 0 && {
          inherited_permission_prompt_pending: Se.inheritedPromptPending,
          conversation_has_compact_boundary: Se.conversationHasCompactBoundary,
          conversation_has_message_as_queued_command: Se.conversationHasMessageAsQueuedCommand,
          ...Se.followUp,
        }),
        ...chatOriginField(),
      });
    } else if (re || S) {
      let Se =
          S &&
          (this.drain.pendingDispatchUuids.includes(e) ||
            this.messageQueue.peek((Xe) => Xe.uuid === e) !== void 0 ||
            this.parkedUuids().includes(e)),
        me = extractInboundAttachments(r).length;
      if (
        (logForDiagnosticsNoPII("info", "cli_user_message_dedup_skipped", {
          exists_in_session: persisted,
          runtime_dup: S,
          ...(w !== void 0 && { taken_in_before_permission_prompt: !0 }),
          ...(G && { summarised_away: !0 }),
          ...(q && { waits_behind_permission_prompt: !0 }),
          ...chatOriginField(),
          ...(Se && { echo_withheld: !0 }),
          ...(nt && { held_for_park: !0 }),
          ...(me > 0 && { sent_file_count: me, turn_unanswered: Ue }),
        }),
        logForDebugging(`Skipping duplicate user message: ${e}`),
        !Se && !q && !this.declinedRedeliveries.takeCancelledLine(e))
      )
        n();
      let Me = re && !S && !Ue && !nt && !ie,
        Ee = !1,
        He = Me && !this.finishedAtStartUpLogged ? tryOr(() => this.finishedAtStartUp(e), void 0) : void 0;
      if (Me) {
        if (
          (tryOr(
            () => this.noteReportedDoneUnrun(e, { leftToATurnCarriedOn: Z !== void 0, asksForAReply: R }),
            void 0,
          ),
          typeof L === "function")
        )
          this.storeRewindStandIn(e, !1);
        (this.io.onCommandLifecycle?.(e, "completed"), this.declinedRedeliveries.forget(e));
      }
      if (this.messageQueue.peek(im) !== void 0) this.kick();
      else if (!this.drain.running) {
        if (((Ee = !0), this.idleTeeAllowed())) this.io.sessionState.notifyStateChanged("idle");
      }
      if (He !== void 0)
        ((this.finishedAtStartUpLogged = !0),
          logForDiagnosticsNoPII("info", "cli_redelivered_message_turn_read_as_finished", {
            ...He,
            nothing_running_or_queued: Ee,
            ...chatOriginField(),
          }));
      if (!Ue && !nt && !ie) this.receivedMessageUuids.track(e);
      else
        this.declinedRedeliveries.remember(
          e,
          Z !== void 0 && r !== void 0
            ? {
                stillOwed: Z,
                ...(typeof L === "function" && {
                  storeRewindStandIn: (Xe) => this.storeRewindStandIn(e, Xe),
                }),
                readAgain: () => {
                  (this.readAgain({ ...r, priority: void 0 }),
                    logForDiagnosticsNoPII(
                      "info",
                      "cli_user_message_dedup_put_back_on_input",
                      chatOriginField(),
                    ));
                },
                thenRuns: q,
              }
            : void 0,
        );
      return !0;
    }
    if (!ce)
      (this.declinedRedeliveries.forget(e), this.noteNewAfterStart(e, r, typeof L === "string" ? L : void 0));
    return (this.receivedMessageUuids.track(e), !1);
  }
  askWhetherTakenInAtAPrompt(e) {
    let n = tryOr(() => this.takenInAtAPrompt(e), void 0);
    return n && (() => tryOr(n, !1));
  }
  askWhetherSummarisedAway(e) {
    let n = tryOr(() => this.summarisedAway(e), void 0);
    if (typeof n === "object") return { whileStillOwed: () => tryOr(n.whileStillOwed, !1) };
    return typeof n === "function" ? () => tryOr(n, !1) : n;
  }
  noteNewAfterStart(e, n, r) {
    try {
      let earlierStartOf = this.earlierStartOf(e);
      if (earlierStartOf === void 0) return;
      logForDiagnosticsNoPII("info", "cli_user_message_dedup_new_after_start", {
        started_ago: durationBucket_2(Date.now() - earlierStartOf.startedAtMs),
        inherited_permission_prompt_pending: earlierStartOf.inheritedPromptPending,
        conversation_has_compact_boundary: earlierStartOf.conversationHasCompactBoundary,
        conversation_has_message_as_queued_command: earlierStartOf.conversationHasMessageAsQueuedCommand,
        ...(n !== void 0 && {
          should_query: n.shouldQuery !== !1,
          is_synthetic: Boolean(n.isSynthetic),
          has_priority: n.priority !== void 0,
        }),
        turn_running: this.drain.running,
        user_intent_queued: this.messageQueue.hasUserIntentCommandsInQueue(),
        ...earlierStartOf.followUp,
        ...earlierStartOf.endedTurnsCopy,
        ...chatOriginField(),
        ...(r === "off" && { summarised_away_switch_off: !0 }),
        ...(r === "cold" && { summarised_away_switch_cold: !0 }),
        ...(r === "unlisted" && { summarised_away_unlisted: !0 }),
        ...(r === "taken_in_since" && { summarised_away_taken_in_since: !0 }),
        ...(r === "kept_rows_not_loaded" && { summarised_away_kept_rows_not_loaded: !0 }),
      });
    } catch (error) {
      logError(error);
    }
  }
  acceptUserFrame(e) {
    let admissionBarrier = this.admissionBarrier();
    if (e.ownFirstTurnMessage) {
      if (admissionBarrier.pending === 0 && this.ownParked === null) return this.deliver(e);
      let tail = admissionBarrier.tail,
        startTime = performance.now();
      logForDiagnosticsNoPII("info", "cli_user_frame_parked", () => ({
        uuid: matchRequestId(e.frame.uuid),
        barrier_pending: admissionBarrier.pending,
        had_parked: this.ownParked !== null,
        own_first_turn_message: !0,
      }));
      let w = (this.ownParked ?? Promise.resolve())
        .then(() => tail)
        .then(() => this.deliver(e, startTime))
        .catch((P) => logError(toError(P)))
        .finally(() => {
          if ((e.queueing?.[Symbol.dispose](), this.ownParked === w)) this.ownParked = null;
        });
      this.ownParked = w;
      return;
    }
    let firstTurnGate = this.firstTurnGate();
    if (admissionBarrier.pending === 0 && this.parked === null && firstTurnGate === void 0)
      return this.deliver(e);
    let s =
        firstTurnGate === void 0
          ? admissionBarrier.tail
          : Promise.all([admissionBarrier.tail, firstTurnGate]).then(() => {}),
      startTime = performance.now();
    (logForDiagnosticsNoPII("info", "cli_user_frame_parked", () => ({
      uuid: matchRequestId(e.frame.uuid),
      barrier_pending: admissionBarrier.pending,
      had_parked: this.parked !== null,
      first_turn_gate: firstTurnGate !== void 0,
    })),
      this.heldFrames.add(e));
    let y = (this.parked ?? Promise.resolve())
      .then(() => s)
      .then(() => (this.heldFrames.has(e) ? this.deliver(e, startTime) : void 0))
      .catch((S) => logError(toError(S)))
      .finally(() => {
        if ((this.heldFrames.delete(e), e.queueing?.[Symbol.dispose](), this.parked === y))
          this.parked = null;
      });
    this.parked = y;
  }
  parkedUuids() {
    return [...this.heldFrames].flatMap(({ frame: frame }) => frame.uuid ?? []);
  }
  parkedCommands() {
    return [...this.heldFrames].map(({ command: command }) => command);
  }
  cancelParked() {
    let parkedUuids = this.parkedUuids();
    return (this.heldFrames.clear(), parkedUuids);
  }
  hasParked() {
    return this.parked !== null || this.ownParked !== null;
  }
  async closeInput(e) {
    await this.admissionBarrier().tail;
    let firstTurnGate = this.firstTurnGate();
    if (firstTurnGate !== void 0) await firstTurnGate;
    if (this.ownParked !== null) await this.ownParked;
    if (this.parked !== null) await this.parked;
    return (logForDiagnosticsNoPII("info", "cli_message_loop_ended"), (this.drain.inputClosed = !0), e());
  }
  async deliver(e, n) {
    using queueing = e.queueing;
    let startTime = performance.now(),
      admit = e.admit(queueing),
      y;
    if (typeof admit !== "boolean") {
      let q = await admit;
      if (((y = elapsedMs(startTime)), !q)) return;
    } else if (!admit) return;
    if (n !== void 0 && !e.ownFirstTurnMessage && !this.heldFrames.delete(e)) return;
    let { frame: frame, command: command } = e,
      startTime_2 = performance.now(),
      now = Date.now(),
      server_received_wall_ms = frame.server_received_wall_ms;
    ((command.receivedAtMs = e.receivedAtMs),
      (command.frameTiming = {
        ...(e.receivedWallMs !== void 0 && {
          receivedWallMs: e.receivedWallMs,
          intakePhasesMs: inputLatencyFields({
            waits: e.waits,
            parsedAtMs: e.parsedAtMs,
            parkedAtMs: n,
            admitStartedAtMs: startTime,
            awaitedAdmitMs: y,
            enqueuedAtMs: startTime_2,
            receivedWallMs: e.receivedWallMs,
            enqueuedWallMs: now,
            aheadOfRead: e.aheadOfRead,
          }),
          turnStartMark: this.drain.turnStartClock.mark(startTime_2),
        }),
        enqueuedWallMs: now,
        ...(typeof server_received_wall_ms === "number" &&
          Number.isFinite(server_received_wall_ms) &&
          server_received_wall_ms > 0 && { serverReceivedWallMs: server_received_wall_ms }),
      }));
    try {
      e.beforeEnqueue?.(command);
    } catch (error) {
      logError(error);
    }
    if (
      (this.messageQueue.enqueue(command),
      frame.uuid !== void 0 && this.declinedRedeliveries.takeStoppedWhileWaiting(frame.uuid))
    )
      this.startAborted(frame.uuid);
    if ((queueing?.queued(), e.afterEnqueue?.(), frame.uuid !== void 0))
      this.io.onCommandLifecycle?.(frame.uuid, "queued");
    (logForDiagnosticsNoPII("info", "cli_user_message_enqueued", () => ({
      has_uuid: frame.uuid !== void 0,
      uuid: matchRequestId(frame.uuid),
      should_query: frame.shouldQuery,
      has_priority: frame.priority !== void 0,
      queue_depth: this.messageQueue.getCommandQueueLength(),
      parse_to_enqueue_ms: Math.round(startTime_2 - e.parsedAtMs),
      dedup_ms: e.waits.dedupMs,
      flag_settle_ms: e.waits.flagSettleMs,
      receive_hook_ms: e.waits.receiveHookMs,
      ...(e.waits.attachments !== void 0 && {
        attachments_ms: e.waits.attachments.ms,
        attachment_count: e.waits.attachments.count,
        inlined_images: e.waits.attachments.inlinedImages,
        ahead_of_files: e.waits.attachments.aheadOfFiles,
        ...e.waits.attachments.stages,
      }),
      ...(n !== void 0 && { parked_ms: Math.round(startTime_2 - n) }),
    })),
      e.beforeKick?.(),
      this.kick());
  }
}
//@ chunk-tyg7f3ek.js:61714-62405 placement
class InputLatencyLedger {
  inputReadyAtMs;
  capacity;
  handled = [];
  droppedUntilMs = Number.NEGATIVE_INFINITY;
  constructor(e, n = 512) {
    this.inputReadyAtMs = e;
    this.capacity = n;
  }
  note(e, n, r) {
    if (r <= n) return;
    if ((this.handled.push({ kind: e, startMs: n, endMs: r }), this.handled.length > this.capacity))
      this.droppedUntilMs = this.handled.shift().endMs;
  }
  split(e, n) {
    if (e < this.droppedUntilMs) return;
    let max = Math.max(0, e),
      s = {
        startupMs: Jb(Number.NEGATIVE_INFINITY, this.inputReadyAtMs, max, n),
        controlRequestsMs: 0,
        userFramesMs: 0,
      };
    for (let { kind: kind, startMs: startMs, endMs: endMs } of this.handled) {
      let R = Jb(startMs, endMs, max, n);
      if (kind === "control") s.controlRequestsMs += R;
      else s.userFramesMs += R;
    }
    return s;
  }
  phasesBeforeRead(e, n) {
    if (e === void 0) return;
    let parts = this.split(e, n);
    return parts && splitStartupWait(n - e, parts);
  }
}
//@ chunk-tyg7f3ek.js:62405-62473 placement
function Jb(e, n, r, s) {
  return Math.max(0, Math.min(n, s) - Math.max(e, r));
}
//@ chunk-tyg7f3ek.js:62473-62524 placement
function Ff(e) {
  return Math.max(0, Math.round(e ?? 0));
}
//@ chunk-tyg7f3ek.js:62524-63097 placement
function inputLatencyFields({
  waits: waits,
  parsedAtMs: parsedAtMs,
  parkedAtMs: parkedAtMs,
  admitStartedAtMs: admitStartedAtMs,
  awaitedAdmitMs: awaitedAdmitMs,
  enqueuedAtMs: enqueuedAtMs,
  receivedWallMs: receivedWallMs,
  enqueuedWallMs: enqueuedWallMs,
  aheadOfRead: aheadOfRead,
}) {
  let rounded = Math.round(enqueuedAtMs - parsedAtMs),
    L = {
      ...(waits.dedupMs !== void 0 && { dedup: waits.dedupMs }),
      ...(waits.flagSettleMs !== void 0 && { flag_settle: waits.flagSettleMs }),
      ...(waits.receiveHookMs !== void 0 && { receive_hook: waits.receiveHookMs }),
      ...(waits.attachments !== void 0 && { attachments: waits.attachments.ms }),
      ...(parkedAtMs !== void 0 && { admission_wait: Math.round(admitStartedAtMs - parkedAtMs) }),
      ...(awaitedAdmitMs !== void 0 && { admit_check: awaitedAdmitMs }),
    },
    q = 0;
  for (let x of Object.values(L)) q += x ?? 0;
  return {
    ...splitStartupWait(Math.round(enqueuedWallMs - receivedWallMs) - rounded, aheadOfRead),
    ...L,
    other: Math.max(0, rounded - q),
  };
}
//@ chunk-tyg7f3ek.js:63097-63354 placement
function splitStartupWait(e, n) {
  let r = Ff(e),
    min = Math.min(r, Ff(n?.startupMs)),
    min_2 = Math.min(r - min, Ff(n?.controlRequestsMs)),
    min_3 = Math.min(r - min - min_2, Ff(n?.userFramesMs));
  return {
    before_read: r - min - min_2 - min_3,
    ...(min > 0 && { startup_wait: min }),
    ...(min_2 > 0 && { control_requests_ahead: min_2 }),
    ...(min_3 > 0 && { user_frames_ahead: min_3 }),
  };
}
//@ chunk-tyg7f3ek.js:63354-63503 placement
function durationBucket_2(e) {
  let n = e / 60000;
  if (n < 1) return "under_1m";
  if (n < 10) return "under_10m";
  if (n < 60) return "under_1h";
  if (n < 360) return "under_6h";
  return "6h_or_more";
}
//@ chunk-tyg7f3ek.js:63503-63708 placement
function compactionRunFields({ terminalReason: terminalReason, compactions: compactions }) {
  let r = compactions === 1 ? "1" : compactions === 2 ? "2" : "3_or_more";
  return {
    compactions_in_run: r,
    ...flagKey("compactions_in_run", r),
    ...(terminalReason !== void 0 && {
      terminal_reason: terminalReason,
      ...flagKey("terminal_reason", terminalReason),
    }),
  };
}
//@ chunk-tyg7f3ek.js:63708-63949 placement
function createTurnPersistenceChecks({ storageV5: storageV5, heldInMemory: heldInMemory }) {
  return {
    flush: () => flushSessionStorage(),
    async turnRan(r) {
      let s = createPersistenceChecker({ storageV5: storageV5, heldInMemory: heldInMemory })();
      return (await s.persisted(r)) && !(await s.turnUnanswered(r));
    },
    isFound: (r) =>
      createPersistenceChecker({ storageV5: storageV5, heldInMemory: heldInMemory })().persisted(r),
  };
}
/**
 * 处理 CCR 重投的用户消息：判断是否已读、已回复、需重跑或关闭，并回执。
 */
//@ chunk-tyg7f3ek.js:63949-68286 placement
class RedeliveryResolver {
  pendingDeclinedUnansweredAcks = new Set();
  noRowVouchesFor = new Map();
  putBackAndUnread = new Set();
  cancelledAndUnread = new Set();
  stoppedWhileWaiting = new Set();
  io;
  messageQueue;
  receivedMessageUuids;
  transcript;
  holds;
  storeRewindStandIn;
  hasRewindTarget;
  noteClosedUnrun;
  constructor({
    io: e,
    messageQueue: n,
    receivedMessageUuids: r,
    transcript: s,
    holds: h = () => !1,
    storeRewindStandIn: y,
    hasRewindTarget: S = () => !0,
    noteClosedUnrun: R = () => {},
  }) {
    ((this.io = e),
      (this.messageQueue = n),
      (this.receivedMessageUuids = r),
      (this.transcript = s),
      (this.holds = h),
      (this.storeRewindStandIn = y),
      (this.hasRewindTarget = S),
      (this.noteClosedUnrun = R));
  }
  get hasAny() {
    for (let pendingDeclinedUnansweredAck of this.pendingDeclinedUnansweredAcks)
      if (!this.isHeld(pendingDeclinedUnansweredAck)) return !0;
    return !1;
  }
  remember(e, n) {
    if ((this.pendingDeclinedUnansweredAcks.add(e), this.putBackAndUnread.delete(e), n !== void 0)) {
      let r = this.noRowVouchesFor.get(e);
      this.noRowVouchesFor.set(e, r?.readAgain === void 0 ? n : { ...r, stillOwed: n.stillOwed });
    }
  }
  runWhatNoRowVouchesFor() {
    this.readAgain([...this.noRowVouchesFor.keys()]);
  }
  readAgain(e) {
    for (let n of e) if (this.noRowVouchesFor.get(n)?.readAgain !== void 0) this.putBack(n);
  }
  get heldBack() {
    return [...this.pendingDeclinedUnansweredAcks, ...this.putBackAndUnread];
  }
  get waitingToRun() {
    return [
      ...[...this.noRowVouchesFor].filter(([, { thenRuns: e }]) => e === !0).map(([e]) => e),
      ...this.putBackAndUnread,
    ];
  }
  cancelWaitingToRun() {
    let waitingToRun = this.waitingToRun;
    for (let n of waitingToRun) {
      if (this.putBackAndUnread.has(n)) this.cancelledAndUnread.add(n);
      (this.forget(n), this.stoppedWhileWaiting.delete(n), this.receivedMessageUuids.track(n));
    }
    return waitingToRun;
  }
  takeCancelledLine(e) {
    return this.cancelledAndUnread.delete(e);
  }
  stopWaitingToRun() {
    for (let e of this.waitingToRun) this.stoppedWhileWaiting.add(e);
  }
  takeStoppedWhileWaiting(e) {
    return this.stoppedWhileWaiting.delete(e);
  }
  putBack(e) {
    let n = this.noRowVouchesFor.get(e)?.readAgain;
    (this.forget(e), this.putBackAndUnread.add(e));
    try {
      n?.();
    } catch (error) {
      (this.putBackAndUnread.delete(e), logError(error));
    }
  }
  closeWhatNoRowVouchesFor() {
    for (let e of [...this.noRowVouchesFor.keys()]) if (!this.isHeld(e)) this.close(e);
  }
  isHeld(e) {
    return this.holds(e) || this.noRowVouchesFor.get(e)?.stillOwed() === !0;
  }
  forget(e) {
    (this.pendingDeclinedUnansweredAcks.delete(e),
      this.noRowVouchesFor.delete(e),
      this.putBackAndUnread.delete(e));
  }
  async ackAtBatchTerminal(e) {
    if (!this.hasAny) return;
    try {
      await this.transcript.flush();
    } catch {}
    for (let n of [...this.pendingDeclinedUnansweredAcks]) {
      if (this.isHeld(n)) continue;
      let r = this.noRowVouchesFor.get(n);
      if (r?.storeRewindStandIn !== void 0)
        (this.noRowVouchesFor.set(n, { ...r, storeRewindStandIn: void 0 }), await r.storeRewindStandIn(!0));
      let s = this.noRowVouchesFor.has(n) || (await this.transcript.turnRan(n)),
        h = !s && e?.opener === n && !(await this.transcript.isFound(n)) ? e : void 0;
      if (h?.flag === "on") await this.storeRewindStandIn(n, !0);
      if ((s || h !== void 0) && this.pendingDeclinedUnansweredAcks.has(n) && !this.isHeld(n)) {
        if (h !== void 0) {
          let { flag: flag } = h;
          if (
            (logForDiagnosticsNoPII("info", "cli_redelivered_message_closed_without_transcript_proof", {
              ...chatOriginField(),
              ...(flag === "off" && { switch_off: !0 }),
              ...(flag === "cold" && { switch_cold: !0 }),
              ...compactionRunFields(h),
            }),
            flag !== "on")
          )
            continue;
        } else if (!this.noRowVouchesFor.has(n)) this.noteNoRewindTarget(n, e?.opener === n ? e : void 0);
        this.close(n);
      }
    }
  }
  noteNoRewindTarget(e, n) {
    try {
      if (!this.hasRewindTarget(e))
        logForDiagnosticsNoPII("info", "cli_redelivered_message_closed_with_no_rewind_target", {
          ...chatOriginField(),
          ...(n && compactionRunFields(n)),
        });
    } catch (error) {
      logForDebugging(
        `could not look for a rewind target: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      );
    }
  }
  async ackAfterRetirement() {
    if (!this.hasAny) return;
    try {
      await this.transcript.flush();
    } catch {}
    for (let e of [...this.pendingDeclinedUnansweredAcks]) {
      if (this.isHeld(e)) continue;
      if (
        (this.noRowVouchesFor.has(e) || (await this.transcript.turnRan(e))) &&
        this.pendingDeclinedUnansweredAcks.has(e) &&
        !this.isHeld(e)
      )
        this.close(e);
    }
  }
  closeAfterRewind() {
    for (let e of [...this.pendingDeclinedUnansweredAcks])
      if (this.noRowVouchesFor.get(e)?.thenRuns !== !0) this.close(e);
  }
  cancelAfterRewind() {
    for (let e of this.cancelWaitingToRun()) this.io.onCommandLifecycle?.(e, "cancelled");
  }
  cancelWithItsReRun(e) {
    if (!this.pendingDeclinedUnansweredAcks.has(e)) return !1;
    return (this.stoppedWhileWaiting.delete(e), this.finish(e, "cancelled"), !0);
  }
  close(e) {
    if (this.noRowVouchesFor.get(e)?.thenRuns === !0) {
      this.putBack(e);
      return;
    }
    (this.noRowVouchesFor.get(e)?.storeRewindStandIn?.(!1), this.finish(e, "completed"));
  }
  finish(e, n) {
    (this.forget(e),
      this.receivedMessageUuids.track(e),
      this.messageQueue.consumeCancelPending(e),
      this.noteClosedUnrun(e, n),
      this.io.onCommandLifecycle?.(e, n));
  }
}
//@ chunk-tyg7f3ek.js:68286-69150 placement
class DeclinedRedeliveryBatcher {
  io;
  messageQueue;
  declined;
  onBatch;
  frozen = !1;
  constructor({ io: e, messageQueue: n, declined: r, onBatch: s = () => {} }) {
    ((this.io = e), (this.messageQueue = n), (this.declined = r), (this.onBatch = s));
  }
  dropTaken(e) {
    this.onBatch(e, "dropped");
  }
  startBatch(e) {
    this.onBatch(
      e.flatMap(({ uuid: uuid }) => uuid ?? []),
      "started",
    );
    for (let { uuid: uuid, wakeupSource: wakeupSource, wakeupScheduledFor: wakeupScheduledFor } of e)
      if (uuid !== void 0)
        this.io.onCommandLifecycle?.(
          uuid,
          "started",
          wakeupSource && { wakeupSource: wakeupSource, scheduledFor: wakeupScheduledFor },
        );
  }
  settleBatch({ batchUuids: e, deliveredPollBatchUuids: n, terminalReason: r, aborted: s }) {
    let h = zsr(r, s);
    this.onBatch(e, "settled");
    for (let y of e) {
      if ((this.messageQueue.consumeCancelPending(y), !this.frozen))
        this.io.onCommandLifecycle?.(y, n.includes(y) ? "completed" : h);
      this.declined.forget(y);
    }
  }
  freezeTerminals() {
    this.frozen = !0;
  }
  forwardEngineLifecycle(e, n) {
    if (this.frozen && (n === "completed" || n === "cancelled")) return;
    this.io.onCommandLifecycle?.(e, n);
  }
}
//@ chunk-tyg7f3ek.js:69187-69492 placement
var INPUT_WAIT_PHASES = [
    "idle",
    "earlier_turn",
    "after_turn",
    "background_wait",
    "entry_joins",
    "sdk_mcp_update",
    "loop_top",
    "session_start_wait",
    "first_command",
    "mcp_prewait",
    "repo_wait",
    "turn_joins",
    "tool_pool",
    "commit",
    "after_arm",
    "turn_gate",
    "turn_open",
    "engine_setup",
    "tool_reread",
    "cwd",
  ],
  rT = new Map(INPUT_WAIT_PHASES.map((e, n) => [e, n]));
//@ chunk-tyg7f3ek.js:69492-70578 placement
class InputWaitStopwatch {
  id = randomUUID();
  spentMs = new Float64Array(INPUT_WAIT_PHASES.length);
  phase = rT.get("idle");
  phaseSinceMs;
  controlRequestsMs = 0;
  controlRequestSinceMs;
  constructor(e = performance.now()) {
    this.phaseSinceMs = e;
  }
  enter(e, n = performance.now()) {
    ((this.spentMs[this.phase] += n - this.phaseSinceMs), (this.phase = rT.get(e)), (this.phaseSinceMs = n));
  }
  controlRequestStarted(e = performance.now()) {
    (this.controlRequestEnded(e), (this.controlRequestSinceMs = e));
  }
  controlRequestEnded(e = performance.now()) {
    if (this.controlRequestSinceMs !== void 0)
      ((this.controlRequestsMs += e - this.controlRequestSinceMs), (this.controlRequestSinceMs = void 0));
  }
  mark(e = performance.now()) {
    let list = Array.from(this.spentMs);
    return (
      (list[this.phase] += e - this.phaseSinceMs),
      { clockId: this.id, spentMs: list, controlRequestsMs: this.controlRequestsNow(e) }
    );
  }
  readSince(e, n, r) {
    if (e.clockId !== this.id) return;
    return {
      phases: inputWaitBreakdown(
        e.spentMs,
        (s) => this.spentMs[s] + (s === this.phase ? n - this.phaseSinceMs : 0),
        r,
      ),
      controlRequestsMs: Math.max(0, Math.round(this.controlRequestsNow(n) - e.controlRequestsMs)),
    };
  }
  controlRequestsNow(e) {
    return (
      this.controlRequestsMs + (this.controlRequestSinceMs === void 0 ? 0 : e - this.controlRequestSinceMs)
    );
  }
}
//@ chunk-tyg7f3ek.js:70578-70763 placement
function inputWaitBreakdown(e, n, r) {
  let s = {},
    h = 0,
    y = 0;
  for (let S = 0; S < INPUT_WAIT_PHASES.length; S++) {
    h += Math.max(0, n(S) - (e[S] ?? 0));
    let R = Math.round(h) - y;
    if (R > 0) ((s[INPUT_WAIT_PHASES[S]] = R), (y += R));
  }
  return ((s.other = Math.max(0, Math.round(r) - y)), s);
}
//@ chunk-tyg7f3ek.js:70763-70830 placement
function uB(e) {
  return typeof e === "string" ? [{ type: "text", text: e }] : e;
}
//@ chunk-tyg7f3ek.js:70830-70958 placement
function mergeQueuedPrompts_2(e) {
  if (e.length === 1) return e[0];
  if (e.every((n) => typeof n === "string"))
    return e.join(`
`);
  return e.map(uB).reduce(joinTextAtSeam);
}
/**
 * 把同一批排队的多条 prompt 合并成一条（合并文本、mergedSendUuids、来源）。
 */
//@ chunk-tyg7f3ek.js:70958-71819 placement
function mergeQueuedPrompts(e) {
  let n = e[0];
  if (e.length === 1) return n;
  let r = mergeQueuedTraceContexts(e),
    s = e.findLast((R) => R.uuid) ?? n,
    h = mergeQueuedPrompts_2(e.map((R) => R.value)),
    y = n.origin?.kind === "peer" ? SQ(n.origin, h, n.value) : void 0,
    flattened = e.flatMap(({ origin: origin }) =>
      origin?.kind === "peer" && origin.body !== void 0 ? [{ body: origin.body }] : [],
    );
  return {
    ...n,
    ...(y !== void 0 && { origin: flattened.length === e.length ? { ...y, members: flattened } : y }),
    value: h,
    uuid: s.uuid,
    frameTiming: s.frameTiming,
    turnAttributionKey: zis(e),
    traceContext: r.parent,
    linkedTraceContexts: r.linked,
    attachmentSourceUuid: void 0,
    deliveryId: void 0,
    fileAttachments: e.flatMap((R) => R.fileAttachments ?? []),
    clientPlatform: e.find((R) => R.clientPlatform)?.clientPlatform ?? n.clientPlatform,
    ccrTurnId: $4s(e),
    ...(e.some((R) => R.ccrTurnIdEndsWithTurn) && { ccrTurnIdEndsWithTurn: !0 }),
    ...(e.some((R) => R.stampThreadState) && { stampThreadState: !0 }),
    ...(e.some((R) => R.toolsUsed !== void 0) && { toolsUsed: uniq(e.flatMap((R) => R.toolsUsed ?? [])) }),
  };
}
//@ chunk-tyg7f3ek.js:71819-71901 placement
function hasTurnAttribution(e) {
  return e.uuid !== void 0 && (e.turnAttributionKey !== void 0 || !e.isMeta);
}
//@ chunk-tyg7f3ek.js:71901-72046 placement
function isResumedTurnBatch(e) {
  return (
    !isHandedOffBatch(e) &&
    e.some(
      (n) =>
        n.resumedTurnUserMessageUuid !== void 0 ||
        (hasTurnAttribution(n) && (n.turnAttributionKey !== void 0 || n.resumeReason !== void 0)),
    )
  );
}
//@ chunk-tyg7f3ek.js:72046-72183 placement
function isHandedOffBatch(e) {
  return e.some(
    (n) =>
      n.handedOffTurn?.kind === "run" ||
      (n.resumedTurnUserMessageUuid !== void 0 && n.resumedTurnOpenerVouched !== !0),
  );
}
//@ chunk-tyg7f3ek.js:72183-72370 placement
function batchUuids(e) {
  return e.flatMap((n) =>
    [
      n.uuid,
      n.resumedTurnUserMessageUuid,
      ...(n.mergedSendUuids ?? []),
      ...(n.alsoLeftToThisReRun ?? []),
      ...(n.sendsOfItsCompactedTurn ?? []),
    ].filter((r) => r !== void 0),
  );
}
//@ chunk-tyg7f3ek.js:72370-72484 placement
function isDrainOnlyResume(e) {
  return (
    (e.drainOnly === !0 && e.resumedTurnUserMessageUuid !== void 0) || e.sendsOfItsCompactedTurn !== void 0
  );
}

export {
  RedeliveryResolver,
  createTurnPersistenceChecks,
  DeclinedRedeliveryBatcher,
  UserFrameIntake,
  InputLatencyLedger,
  hasTurnAttribution,
  isDrainOnlyResume,
  isHandedOffBatch,
  batchUuids,
  isResumedTurnBatch,
  InputWaitStopwatch,
  mergeQueuedPrompts,
};

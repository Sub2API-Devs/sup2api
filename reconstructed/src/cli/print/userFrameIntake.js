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
import { randomUUID } from "crypto";
import { hasMalformedTextBlocks } from "../remoteIO/ingress.js";
import { logForDebugging } from "../../utils/debug.js";
import { tryOr, chatOriginField, createPersistenceChecker } from "./transcriptLeaves.js";
import { rememberMovedRow, joinTextAtSeam } from "../../utils/messages.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { extractInboundAttachments } from "../../bridge/inboundAttachments.js";
import { isActiveMainAgentCommand } from "../../utils/messageQueueManager.js";
import { logError } from "../../utils/log.js";
import { matchRequestId, elapsedMs as elapsedMs_2, flagKey } from "../structuredIOProtocol.js";
import { toError } from "../../utils/errors.js";
import { flushSessionStorage } from "../../utils/sessionStorage.js";
import { turnOutcomeLabel } from "../../bridge/inboundMessageOrigin.js";
import { mergeQueuedTraceContexts } from "../../utils/telemetry/ccrTraceContext.js";
import { stripPeerMessageBody } from "../../utils/peerMessageHeaders.js";
import { lastTurnAttributionKey } from "../../utils/cwd.js";
import { commonTurnId } from "../../services/mcp/ccrTurnId.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-tyg7f3ek.js:52052-61714 placement
/**
 * stdin 用户帧接收器：校验格式、去重（cli_user_message_dedup_*）、暂存/放回、首轮闸门与重投处理。
 */
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
  finishedAtStartUpLogged = false;
  noteReportedDoneUnrun;
  storeRewindStandIn;
  constructor({
    admissionBarrier,
    firstTurnGate = () => {
      return;
    },
    messageQueue,
    drain,
    receivedMessageUuids,
    declinedRedeliveries,
    io,
    transcriptForFrame,
    kick,
    retirementMayLandDuringReads,
    rescueOwnsReRun,
    idleTeeAllowed,
    heldForParkedTurn = () => false,
    earlierStartOf = () => {
      return;
    },
    leftToReRun,
    takenInAtAPrompt,
    summarisedAway = () => {
      return;
    },
    cutBehindItsCompaction = () => false,
    readAgain,
    startAborted,
    finishedAtStartUp = () => {
      return;
    },
    noteReportedDoneUnrun = () => {},
    storeRewindStandIn,
  }) {
    this.admissionBarrier = admissionBarrier;
    this.firstTurnGate = firstTurnGate;
    this.messageQueue = messageQueue;
    this.drain = drain;
    this.receivedMessageUuids = receivedMessageUuids;
    this.declinedRedeliveries = declinedRedeliveries;
    this.io = io;
    this.transcriptForFrame = transcriptForFrame;
    this.kick = kick;
    this.retirementMayLandDuringReads = retirementMayLandDuringReads;
    this.rescueOwnsReRun = rescueOwnsReRun;
    this.idleTeeAllowed = idleTeeAllowed;
    this.heldForParkedTurn = heldForParkedTurn;
    this.earlierStartOf = earlierStartOf;
    this.leftToReRun = leftToReRun;
    this.takenInAtAPrompt = takenInAtAPrompt;
    this.summarisedAway = summarisedAway;
    this.cutBehindItsCompaction = cutBehindItsCompaction;
    this.readAgain = readAgain;
    this.startAborted = startAborted;
    this.finishedAtStartUp = finishedAtStartUp;
    this.noteReportedDoneUnrun = noteReportedDoneUnrun;
    this.storeRewindStandIn = storeRewindStandIn;
  }
  dropMalformed(e) {
    if (!hasMalformedTextBlocks(e.message.content)) return false;
    logForDebugging("Dropping malformed user frame: content must be a string or an array of block objects", {
      level: "error",
    });
    if (e.uuid && !this.receivedMessageUuids.has(e.uuid)) this.io.onCommandLifecycle?.(e.uuid, "completed");
    return true;
  }
  isReRun(e) {
    return this.reRuns.has(e);
  }
  async skipDuplicate(e, n, r) {
    let s = this.transcriptForFrame();
    let h = this.retirementMayLandDuringReads();
    let y = await s.persisted(e);
    let S = this.receivedMessageUuids.has(e);
    let R = r !== undefined && r.shouldQuery !== false && r.seeded_summon !== true;
    let w = y && !S && R ? this.askWhetherTakenInAtAPrompt(e) : undefined;
    let P = y && !S && w === undefined && !this.leftToReRun(e) ? await s.holdersTurnUnanswered(e) : undefined;
    let L = (!y || P === true) && !S && R ? this.askWhetherSummarisedAway(e) : undefined;
    let q = typeof L === "object" && L.whileStillOwed();
    let x = typeof L === "function" ? L : q ? L.whileStillOwed : undefined;
    let G = x !== undefined;
    let Z = w ?? x;
    let re = y || G;
    let Ae = P === undefined && tryOr(() => this.cutBehindItsCompaction(e), false);
    let Ue = Z === undefined && (P ?? (y && !S && (Ae || (await s.turnUnanswered(e)))));
    if (Ue && P === undefined && h && !this.rescueOwnsReRun()) Ue = await s.turnUnanswered(e);
    let ce =
      Ue &&
      !(this.leftToReRun(e) && this.heldForParkedTurn(e)) &&
      (P === true ||
        (!this.drain.running &&
          !this.messageQueue.hasUserIntentCommandsInQueue() &&
          !this.rescueOwnsReRun()));
    let nt = re && !S && !Ue && this.heldForParkedTurn(e);
    let ie =
      Z !== undefined && (this.drain.running || this.messageQueue.hasUserIntentCommandsInQueue() || Z());
    if (ce) {
      this.declinedRedeliveries.forget(e);
      this.reRuns.add(e);
      if (Ae) rememberMovedRow(e);
      let Se = tryOr(() => this.earlierStartOf(e), undefined);
      logForDiagnosticsNoPII("info", "cli_user_message_dedup_reexecuted", {
        ...(Ae && {
          nothing_stored_after_compaction: true,
        }),
        runs_by_holders_rule: P === true,
        ...(Se !== undefined && {
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
          this.messageQueue.peek((Xe) => Xe.uuid === e) !== undefined ||
          this.parkedUuids().includes(e));
      let me = extractInboundAttachments(r).length;
      logForDiagnosticsNoPII("info", "cli_user_message_dedup_skipped", {
        exists_in_session: y,
        runtime_dup: S,
        ...(w !== undefined && {
          taken_in_before_permission_prompt: true,
        }),
        ...(G && {
          summarised_away: true,
        }),
        ...(q && {
          waits_behind_permission_prompt: true,
        }),
        ...chatOriginField(),
        ...(Se && {
          echo_withheld: true,
        }),
        ...(nt && {
          held_for_park: true,
        }),
        ...(me > 0 && {
          sent_file_count: me,
          turn_unanswered: Ue,
        }),
      });
      logForDebugging(`Skipping duplicate user message: ${e}`);
      if (!Se && !q && !this.declinedRedeliveries.takeCancelledLine(e)) n();
      let Me = re && !S && !Ue && !nt && !ie;
      let nothingRunningOrQueued = false;
      let He =
        Me && !this.finishedAtStartUpLogged ? tryOr(() => this.finishedAtStartUp(e), undefined) : undefined;
      if (Me) {
        tryOr(
          () =>
            this.noteReportedDoneUnrun(e, {
              leftToATurnCarriedOn: Z !== undefined,
              asksForAReply: R,
            }),
          undefined,
        );
        if (typeof L === "function") this.storeRewindStandIn(e, false);
        this.io.onCommandLifecycle?.(e, "completed");
        this.declinedRedeliveries.forget(e);
      }
      if (this.messageQueue.peek(isActiveMainAgentCommand) !== undefined) this.kick();
      else if (!this.drain.running) {
        nothingRunningOrQueued = true;
        if (this.idleTeeAllowed()) this.io.sessionState.notifyStateChanged("idle");
      }
      if (He !== undefined) {
        this.finishedAtStartUpLogged = true;
        logForDiagnosticsNoPII("info", "cli_redelivered_message_turn_read_as_finished", {
          ...He,
          nothing_running_or_queued: nothingRunningOrQueued,
          ...chatOriginField(),
        });
      }
      if (!Ue && !nt && !ie) this.receivedMessageUuids.track(e);
      else
        this.declinedRedeliveries.remember(
          e,
          Z !== undefined && r !== undefined
            ? {
                stillOwed: Z,
                ...(typeof L === "function" && {
                  storeRewindStandIn: (Xe) => this.storeRewindStandIn(e, Xe),
                }),
                readAgain: () => {
                  this.readAgain({
                    ...r,
                    priority: undefined,
                  });
                  logForDiagnosticsNoPII(
                    "info",
                    "cli_user_message_dedup_put_back_on_input",
                    chatOriginField(),
                  );
                },
                thenRuns: q,
              }
            : undefined,
        );
      return true;
    }
    if (!ce) {
      this.declinedRedeliveries.forget(e);
      this.noteNewAfterStart(e, r, typeof L === "string" ? L : undefined);
    }
    this.receivedMessageUuids.track(e);
    return false;
  }
  askWhetherTakenInAtAPrompt(e) {
    let n = tryOr(() => this.takenInAtAPrompt(e), undefined);
    return n && (() => tryOr(n, false));
  }
  askWhetherSummarisedAway(e) {
    let n = tryOr(() => this.summarisedAway(e), undefined);
    if (typeof n === "object")
      return {
        whileStillOwed: () => tryOr(n.whileStillOwed, false),
      };
    return typeof n === "function" ? () => tryOr(n, false) : n;
  }
  noteNewAfterStart(e, n, r) {
    try {
      let s = this.earlierStartOf(e);
      if (s === undefined) return;
      logForDiagnosticsNoPII("info", "cli_user_message_dedup_new_after_start", {
        started_ago: durationBucket_2(Date.now() - s.startedAtMs),
        inherited_permission_prompt_pending: s.inheritedPromptPending,
        conversation_has_compact_boundary: s.conversationHasCompactBoundary,
        conversation_has_message_as_queued_command: s.conversationHasMessageAsQueuedCommand,
        ...(n !== undefined && {
          should_query: n.shouldQuery !== false,
          is_synthetic: Boolean(n.isSynthetic),
          has_priority: n.priority !== undefined,
        }),
        turn_running: this.drain.running,
        user_intent_queued: this.messageQueue.hasUserIntentCommandsInQueue(),
        ...s.followUp,
        ...s.endedTurnsCopy,
        ...chatOriginField(),
        ...(r === "off" && {
          summarised_away_switch_off: true,
        }),
        ...(r === "cold" && {
          summarised_away_switch_cold: true,
        }),
        ...(r === "unlisted" && {
          summarised_away_unlisted: true,
        }),
        ...(r === "taken_in_since" && {
          summarised_away_taken_in_since: true,
        }),
        ...(r === "kept_rows_not_loaded" && {
          summarised_away_kept_rows_not_loaded: true,
        }),
      });
    } catch (error) {
      logError(error);
    }
  }
  acceptUserFrame(e) {
    let n = this.admissionBarrier();
    if (e.ownFirstTurnMessage) {
      if (n.pending === 0 && this.ownParked === null) return this.deliver(e);
      let tail = n.tail;
      let startTime = performance.now();
      logForDiagnosticsNoPII("info", "cli_user_frame_parked", () => ({
        uuid: matchRequestId(e.frame.uuid),
        barrier_pending: n.pending,
        had_parked: this.ownParked !== null,
        own_first_turn_message: true,
      }));
      let w = (this.ownParked ?? Promise.resolve())
        .then(() => tail)
        .then(() => this.deliver(e, startTime))
        .catch((error) => logError(toError(error)))
        .finally(() => {
          e.queueing?.[Symbol.dispose]();
          if (this.ownParked === w) this.ownParked = null;
        });
      this.ownParked = w;
      return;
    }
    let r = this.firstTurnGate();
    if (n.pending === 0 && this.parked === null && r === undefined) return this.deliver(e);
    let s = r === undefined ? n.tail : Promise.all([n.tail, r]).then(() => {});
    let startTime = performance.now();
    logForDiagnosticsNoPII("info", "cli_user_frame_parked", () => ({
      uuid: matchRequestId(e.frame.uuid),
      barrier_pending: n.pending,
      had_parked: this.parked !== null,
      first_turn_gate: r !== undefined,
    }));
    this.heldFrames.add(e);
    let y = (this.parked ?? Promise.resolve())
      .then(() => s)
      .then(() => (this.heldFrames.has(e) ? this.deliver(e, startTime) : undefined))
      .catch((error) => logError(toError(error)))
      .finally(() => {
        this.heldFrames.delete(e);
        e.queueing?.[Symbol.dispose]();
        if (this.parked === y) this.parked = null;
      });
    this.parked = y;
  }
  parkedUuids() {
    return [...this.heldFrames].flatMap(({ frame }) => frame.uuid ?? []);
  }
  parkedCommands() {
    return [...this.heldFrames].map(({ command }) => command);
  }
  cancelParked() {
    let e = this.parkedUuids();
    this.heldFrames.clear();
    return e;
  }
  hasParked() {
    return this.parked !== null || this.ownParked !== null;
  }
  async closeInput(e) {
    await this.admissionBarrier().tail;
    let n = this.firstTurnGate();
    if (n !== undefined) await n;
    if (this.ownParked !== null) await this.ownParked;
    if (this.parked !== null) await this.parked;
    logForDiagnosticsNoPII("info", "cli_message_loop_ended");
    this.drain.inputClosed = true;
    return e();
  }
  async deliver(e, n) {
    using queueing = e.queueing;
    let startTime = performance.now();
    let h = e.admit(queueing);
    let awaitedAdmitMs;
    if (typeof h !== "boolean") {
      let q = await h;
      awaitedAdmitMs = elapsedMs_2(startTime);
      if (!q) return;
    } else if (!h) return;
    if (n !== undefined && !e.ownFirstTurnMessage && !this.heldFrames.delete(e)) return;
    let { frame, command } = e;
    let startTime_2 = performance.now();
    let enqueuedWallMs = Date.now();
    let serverReceivedWallMs = frame.server_received_wall_ms;
    command.receivedAtMs = e.receivedAtMs;
    command.frameTiming = {
      ...(e.receivedWallMs !== undefined && {
        receivedWallMs: e.receivedWallMs,
        intakePhasesMs: inputLatencyFields({
          waits: e.waits,
          parsedAtMs: e.parsedAtMs,
          parkedAtMs: n,
          admitStartedAtMs: startTime,
          awaitedAdmitMs,
          enqueuedAtMs: startTime_2,
          receivedWallMs: e.receivedWallMs,
          enqueuedWallMs,
          aheadOfRead: e.aheadOfRead,
        }),
        turnStartMark: this.drain.turnStartClock.mark(startTime_2),
      }),
      enqueuedWallMs,
      ...(typeof serverReceivedWallMs === "number" &&
        Number.isFinite(serverReceivedWallMs) &&
        serverReceivedWallMs > 0 && {
          serverReceivedWallMs,
        }),
    };
    try {
      e.beforeEnqueue?.(command);
    } catch (error) {
      logError(error);
    }
    this.messageQueue.enqueue(command);
    if (frame.uuid !== undefined && this.declinedRedeliveries.takeStoppedWhileWaiting(frame.uuid))
      this.startAborted(frame.uuid);
    queueing?.queued();
    e.afterEnqueue?.();
    if (frame.uuid !== undefined) this.io.onCommandLifecycle?.(frame.uuid, "queued");
    logForDiagnosticsNoPII("info", "cli_user_message_enqueued", () => ({
      has_uuid: frame.uuid !== undefined,
      uuid: matchRequestId(frame.uuid),
      should_query: frame.shouldQuery,
      has_priority: frame.priority !== undefined,
      queue_depth: this.messageQueue.getCommandQueueLength(),
      parse_to_enqueue_ms: Math.round(startTime_2 - e.parsedAtMs),
      dedup_ms: e.waits.dedupMs,
      flag_settle_ms: e.waits.flagSettleMs,
      receive_hook_ms: e.waits.receiveHookMs,
      ...(e.waits.attachments !== undefined && {
        attachments_ms: e.waits.attachments.ms,
        attachment_count: e.waits.attachments.count,
        inlined_images: e.waits.attachments.inlinedImages,
        ahead_of_files: e.waits.attachments.aheadOfFiles,
        ...e.waits.attachments.stages,
      }),
      ...(n !== undefined && {
        parked_ms: Math.round(startTime_2 - n),
      }),
    }));
    e.beforeKick?.();
    this.kick();
  }
}
//@ chunk-tyg7f3ek.js:61714-62405 placement
class InputLatencyLedger {
  inputReadyAtMs;
  capacity;
  handled = [];
  droppedUntilMs = Number.NEGATIVE_INFINITY;
  constructor(inputReadyAtMs, capacity = 512) {
    this.inputReadyAtMs = inputReadyAtMs;
    this.capacity = capacity;
  }
  note(kind, n, r) {
    if (r <= n) return;
    this.handled.push({
      kind,
      startMs: n,
      endMs: r,
    });
    if (this.handled.length > this.capacity) this.droppedUntilMs = this.handled.shift().endMs;
  }
  split(e, n) {
    if (e < this.droppedUntilMs) return;
    let max = Math.max(0, e);
    let s = {
      startupMs: overlapMs(Number.NEGATIVE_INFINITY, this.inputReadyAtMs, max, n),
      controlRequestsMs: 0,
      userFramesMs: 0,
    };
    for (let { kind, startMs, endMs } of this.handled) {
      let R = overlapMs(startMs, endMs, max, n);
      if (kind === "control") s.controlRequestsMs += R;
      else s.userFramesMs += R;
    }
    return s;
  }
  phasesBeforeRead(e, n) {
    if (e === undefined) return;
    let parts = this.split(e, n);
    return parts && splitStartupWait(n - e, parts);
  }
}
//@ chunk-tyg7f3ek.js:62405-62473 placement
function overlapMs(e, n, r, s) {
  return Math.max(0, Math.min(n, s) - Math.max(e, r));
}
//@ chunk-tyg7f3ek.js:62473-62524 placement
function nonNegativeRounded(e) {
  return Math.max(0, Math.round(e ?? 0));
}
//@ chunk-tyg7f3ek.js:62524-63097 placement
function inputLatencyFields({
  waits,
  parsedAtMs,
  parkedAtMs,
  admitStartedAtMs,
  awaitedAdmitMs,
  enqueuedAtMs,
  receivedWallMs,
  enqueuedWallMs,
  aheadOfRead,
}) {
  let rounded = Math.round(enqueuedAtMs - parsedAtMs);
  let L = {
    ...(waits.dedupMs !== undefined && {
      dedup: waits.dedupMs,
    }),
    ...(waits.flagSettleMs !== undefined && {
      flag_settle: waits.flagSettleMs,
    }),
    ...(waits.receiveHookMs !== undefined && {
      receive_hook: waits.receiveHookMs,
    }),
    ...(waits.attachments !== undefined && {
      attachments: waits.attachments.ms,
    }),
    ...(parkedAtMs !== undefined && {
      admission_wait: Math.round(admitStartedAtMs - parkedAtMs),
    }),
    ...(awaitedAdmitMs !== undefined && {
      admit_check: awaitedAdmitMs,
    }),
  };
  let q = 0;
  for (let x of Object.values(L)) q += x ?? 0;
  return {
    ...splitStartupWait(Math.round(enqueuedWallMs - receivedWallMs) - rounded, aheadOfRead),
    ...L,
    other: Math.max(0, rounded - q),
  };
}
//@ chunk-tyg7f3ek.js:63097-63354 placement
function splitStartupWait(e, n) {
  let r = nonNegativeRounded(e);
  let min = Math.min(r, nonNegativeRounded(n?.startupMs));
  let min_2 = Math.min(r - min, nonNegativeRounded(n?.controlRequestsMs));
  let min_3 = Math.min(r - min - min_2, nonNegativeRounded(n?.userFramesMs));
  return {
    before_read: r - min - min_2 - min_3,
    ...(min > 0 && {
      startup_wait: min,
    }),
    ...(min_2 > 0 && {
      control_requests_ahead: min_2,
    }),
    ...(min_3 > 0 && {
      user_frames_ahead: min_3,
    }),
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
function compactionRunFields({ terminalReason, compactions }) {
  let r = compactions === 1 ? "1" : compactions === 2 ? "2" : "3_or_more";
  return {
    compactions_in_run: r,
    ...flagKey("compactions_in_run", r),
    ...(terminalReason !== undefined && {
      terminal_reason: terminalReason,
      ...flagKey("terminal_reason", terminalReason),
    }),
  };
}
//@ chunk-tyg7f3ek.js:63708-63949 placement
function createTurnPersistenceChecks({ storageV5, heldInMemory }) {
  return {
    flush: () => flushSessionStorage(),
    async turnRan(r) {
      let s = createPersistenceChecker({
        storageV5,
        heldInMemory,
      })();
      return (await s.persisted(r)) && !(await s.turnUnanswered(r));
    },
    isFound: (r) =>
      createPersistenceChecker({
        storageV5,
        heldInMemory,
      })().persisted(r),
  };
}
//@ chunk-tyg7f3ek.js:63949-68286 placement
/**
 * 处理 CCR 重投的用户消息：判断是否已读、已回复、需重跑或关闭，并回执。
 */
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
    io,
    messageQueue,
    receivedMessageUuids,
    transcript,
    holds = () => false,
    storeRewindStandIn,
    hasRewindTarget = () => true,
    noteClosedUnrun = () => {},
  }) {
    this.io = io;
    this.messageQueue = messageQueue;
    this.receivedMessageUuids = receivedMessageUuids;
    this.transcript = transcript;
    this.holds = holds;
    this.storeRewindStandIn = storeRewindStandIn;
    this.hasRewindTarget = hasRewindTarget;
    this.noteClosedUnrun = noteClosedUnrun;
  }
  get hasAny() {
    for (let pendingDeclinedUnansweredAck of this.pendingDeclinedUnansweredAcks)
      if (!this.isHeld(pendingDeclinedUnansweredAck)) return true;
    return false;
  }
  remember(e, n) {
    this.pendingDeclinedUnansweredAcks.add(e);
    this.putBackAndUnread.delete(e);
    if (n !== undefined) {
      let r = this.noRowVouchesFor.get(e);
      this.noRowVouchesFor.set(
        e,
        r?.readAgain === undefined
          ? n
          : {
              ...r,
              stillOwed: n.stillOwed,
            },
      );
    }
  }
  runWhatNoRowVouchesFor() {
    this.readAgain([...this.noRowVouchesFor.keys()]);
  }
  readAgain(e) {
    for (let n of e) if (this.noRowVouchesFor.get(n)?.readAgain !== undefined) this.putBack(n);
  }
  get heldBack() {
    return [...this.pendingDeclinedUnansweredAcks, ...this.putBackAndUnread];
  }
  get waitingToRun() {
    return [
      ...[...this.noRowVouchesFor].filter(([, { thenRuns: e }]) => e === true).map(([e]) => e),
      ...this.putBackAndUnread,
    ];
  }
  cancelWaitingToRun() {
    let waitingToRun = this.waitingToRun;
    for (let n of waitingToRun) {
      if (this.putBackAndUnread.has(n)) this.cancelledAndUnread.add(n);
      this.forget(n);
      this.stoppedWhileWaiting.delete(n);
      this.receivedMessageUuids.track(n);
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
    let readAgain = this.noRowVouchesFor.get(e)?.readAgain;
    this.forget(e);
    this.putBackAndUnread.add(e);
    try {
      readAgain?.();
    } catch (error) {
      this.putBackAndUnread.delete(e);
      logError(error);
    }
  }
  closeWhatNoRowVouchesFor() {
    for (let key of [...this.noRowVouchesFor.keys()]) if (!this.isHeld(key)) this.close(key);
  }
  isHeld(e) {
    return this.holds(e) || this.noRowVouchesFor.get(e)?.stillOwed() === true;
  }
  forget(e) {
    this.pendingDeclinedUnansweredAcks.delete(e);
    this.noRowVouchesFor.delete(e);
    this.putBackAndUnread.delete(e);
  }
  async ackAtBatchTerminal(e) {
    if (!this.hasAny) return;
    try {
      await this.transcript.flush();
    } catch {}
    for (let pendingDeclinedUnansweredAck of [...this.pendingDeclinedUnansweredAcks]) {
      if (this.isHeld(pendingDeclinedUnansweredAck)) continue;
      let r = this.noRowVouchesFor.get(pendingDeclinedUnansweredAck);
      if (r?.storeRewindStandIn !== undefined) {
        this.noRowVouchesFor.set(pendingDeclinedUnansweredAck, {
          ...r,
          storeRewindStandIn: undefined,
        });
        await r.storeRewindStandIn(true);
      }
      let s =
        this.noRowVouchesFor.has(pendingDeclinedUnansweredAck) ||
        (await this.transcript.turnRan(pendingDeclinedUnansweredAck));
      let h =
        !s &&
        e?.opener === pendingDeclinedUnansweredAck &&
        !(await this.transcript.isFound(pendingDeclinedUnansweredAck))
          ? e
          : undefined;
      if (h?.flag === "on") await this.storeRewindStandIn(pendingDeclinedUnansweredAck, true);
      if (
        (s || h !== undefined) &&
        this.pendingDeclinedUnansweredAcks.has(pendingDeclinedUnansweredAck) &&
        !this.isHeld(pendingDeclinedUnansweredAck)
      ) {
        if (h !== undefined) {
          let { flag } = h;
          logForDiagnosticsNoPII("info", "cli_redelivered_message_closed_without_transcript_proof", {
            ...chatOriginField(),
            ...(flag === "off" && {
              switch_off: true,
            }),
            ...(flag === "cold" && {
              switch_cold: true,
            }),
            ...compactionRunFields(h),
          });
          if (flag !== "on") continue;
        } else if (!this.noRowVouchesFor.has(pendingDeclinedUnansweredAck))
          this.noteNoRewindTarget(
            pendingDeclinedUnansweredAck,
            e?.opener === pendingDeclinedUnansweredAck ? e : undefined,
          );
        this.close(pendingDeclinedUnansweredAck);
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
        {
          level: "error",
        },
      );
    }
  }
  async ackAfterRetirement() {
    if (!this.hasAny) return;
    try {
      await this.transcript.flush();
    } catch {}
    for (let pendingDeclinedUnansweredAck of [...this.pendingDeclinedUnansweredAcks]) {
      if (this.isHeld(pendingDeclinedUnansweredAck)) continue;
      if (
        (this.noRowVouchesFor.has(pendingDeclinedUnansweredAck) ||
          (await this.transcript.turnRan(pendingDeclinedUnansweredAck))) &&
        this.pendingDeclinedUnansweredAcks.has(pendingDeclinedUnansweredAck) &&
        !this.isHeld(pendingDeclinedUnansweredAck)
      )
        this.close(pendingDeclinedUnansweredAck);
    }
  }
  closeAfterRewind() {
    for (let pendingDeclinedUnansweredAck of [...this.pendingDeclinedUnansweredAcks])
      if (this.noRowVouchesFor.get(pendingDeclinedUnansweredAck)?.thenRuns !== true)
        this.close(pendingDeclinedUnansweredAck);
  }
  cancelAfterRewind() {
    for (let e of this.cancelWaitingToRun()) this.io.onCommandLifecycle?.(e, "cancelled");
  }
  cancelWithItsReRun(e) {
    if (!this.pendingDeclinedUnansweredAcks.has(e)) return false;
    this.stoppedWhileWaiting.delete(e);
    this.finish(e, "cancelled");
    return true;
  }
  close(e) {
    if (this.noRowVouchesFor.get(e)?.thenRuns === true) {
      this.putBack(e);
      return;
    }
    this.noRowVouchesFor.get(e)?.storeRewindStandIn?.(false);
    this.finish(e, "completed");
  }
  finish(e, n) {
    this.forget(e);
    this.receivedMessageUuids.track(e);
    this.messageQueue.consumeCancelPending(e);
    this.noteClosedUnrun(e, n);
    this.io.onCommandLifecycle?.(e, n);
  }
}
//@ chunk-tyg7f3ek.js:68286-69150 placement
class DeclinedRedeliveryBatcher {
  io;
  messageQueue;
  declined;
  onBatch;
  frozen = false;
  constructor({ io, messageQueue, declined, onBatch = () => {} }) {
    this.io = io;
    this.messageQueue = messageQueue;
    this.declined = declined;
    this.onBatch = onBatch;
  }
  dropTaken(e) {
    this.onBatch(e, "dropped");
  }
  startBatch(e) {
    this.onBatch(
      e.flatMap(({ uuid }) => uuid ?? []),
      "started",
    );
    for (let { uuid, wakeupSource, wakeupScheduledFor } of e)
      if (uuid !== undefined)
        this.io.onCommandLifecycle?.(
          uuid,
          "started",
          wakeupSource && {
            wakeupSource,
            scheduledFor: wakeupScheduledFor,
          },
        );
  }
  settleBatch({ batchUuids, deliveredPollBatchUuids, terminalReason, aborted }) {
    let h = turnOutcomeLabel(terminalReason, aborted);
    this.onBatch(batchUuids, "settled");
    for (let batchUuid of batchUuids) {
      this.messageQueue.consumeCancelPending(batchUuid);
      if (!this.frozen)
        this.io.onCommandLifecycle?.(
          batchUuid,
          deliveredPollBatchUuids.includes(batchUuid) ? "completed" : h,
        );
      this.declined.forget(batchUuid);
    }
  }
  freezeTerminals() {
    this.frozen = true;
  }
  forwardEngineLifecycle(e, n) {
    if (this.frozen && (n === "completed" || n === "cancelled")) return;
    this.io.onCommandLifecycle?.(e, n);
  }
}
//@ chunk-tyg7f3ek.js:69187-69492 placement
/**
 * 输入等待阶段名列表与其索引映射，供 InputWaitStopwatch 按阶段累计耗时。
 */
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
];
var INPUT_WAIT_PHASE_INDEX = new Map(INPUT_WAIT_PHASES.map((e, n) => [e, n]));
//@ chunk-tyg7f3ek.js:69492-70578 placement
class InputWaitStopwatch {
  id = randomUUID();
  spentMs = new Float64Array(INPUT_WAIT_PHASES.length);
  phase = INPUT_WAIT_PHASE_INDEX.get("idle");
  phaseSinceMs;
  controlRequestsMs = 0;
  controlRequestSinceMs;
  constructor(phaseSinceMs = performance.now()) {
    this.phaseSinceMs = phaseSinceMs;
  }
  enter(e, n = performance.now()) {
    this.spentMs[this.phase] += n - this.phaseSinceMs;
    this.phase = INPUT_WAIT_PHASE_INDEX.get(e);
    this.phaseSinceMs = n;
  }
  controlRequestStarted(e = performance.now()) {
    this.controlRequestEnded(e);
    this.controlRequestSinceMs = e;
  }
  controlRequestEnded(e = performance.now()) {
    if (this.controlRequestSinceMs !== undefined) {
      this.controlRequestsMs += e - this.controlRequestSinceMs;
      this.controlRequestSinceMs = undefined;
    }
  }
  mark(e = performance.now()) {
    let list = Array.from(this.spentMs);
    list[this.phase] += e - this.phaseSinceMs;
    return {
      clockId: this.id,
      spentMs: list,
      controlRequestsMs: this.controlRequestsNow(e),
    };
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
      this.controlRequestsMs + (this.controlRequestSinceMs === undefined ? 0 : e - this.controlRequestSinceMs)
    );
  }
}
//@ chunk-tyg7f3ek.js:70578-70763 placement
function inputWaitBreakdown(spentMs, n, r) {
  let s = {};
  let h = 0;
  let y = 0;
  for (let j = 0; j < INPUT_WAIT_PHASES.length; j++) {
    h += Math.max(0, n(j) - (spentMs[j] ?? 0));
    let R = Math.round(h) - y;
    if (R > 0) {
      s[INPUT_WAIT_PHASES[j]] = R;
      y += R;
    }
  }
  s.other = Math.max(0, Math.round(r) - y);
  return s;
}
//@ chunk-tyg7f3ek.js:70763-70830 placement
function stringToTextBlocks(e) {
  return typeof e === "string"
    ? [
        {
          type: "text",
          text: e,
        },
      ]
    : e;
}
//@ chunk-tyg7f3ek.js:70830-70958 placement
function mergeQueuedPrompts_2(e) {
  if (e.length === 1) return e[0];
  if (e.every((n) => typeof n === "string"))
    return e.join(`
`);
  return e.map(stringToTextBlocks).reduce(joinTextAtSeam);
}
//@ chunk-tyg7f3ek.js:70958-71819 placement
/**
 * 把同一批排队的多条 prompt 合并成一条（合并文本、mergedSendUuids、来源）。
 */
function mergeQueuedPrompts(members) {
  let n = members[0];
  if (members.length === 1) return n;
  let r = mergeQueuedTraceContexts(members);
  let s = members.findLast((R) => R.uuid) ?? n;
  let h = mergeQueuedPrompts_2(members.map((R) => R.value));
  let y = n.origin?.kind === "peer" ? stripPeerMessageBody(n.origin, h, n.value) : undefined;
  let flattened = members.flatMap(({ origin }) =>
    origin?.kind === "peer" && origin.body !== undefined
      ? [
          {
            body: origin.body,
          },
        ]
      : [],
  );
  return {
    ...n,
    ...(y !== undefined && {
      origin:
        flattened.length === members.length
          ? {
              ...y,
              members: flattened,
            }
          : y,
    }),
    value: h,
    uuid: s.uuid,
    frameTiming: s.frameTiming,
    turnAttributionKey: lastTurnAttributionKey(members),
    traceContext: r.parent,
    linkedTraceContexts: r.linked,
    attachmentSourceUuid: undefined,
    deliveryId: undefined,
    fileAttachments: members.flatMap((R) => R.fileAttachments ?? []),
    clientPlatform: members.find((R) => R.clientPlatform)?.clientPlatform ?? n.clientPlatform,
    ccrTurnId: commonTurnId(members),
    ...(members.some((R) => R.ccrTurnIdEndsWithTurn) && {
      ccrTurnIdEndsWithTurn: true,
    }),
    ...(members.some((R) => R.stampThreadState) && {
      stampThreadState: true,
    }),
    ...(members.some((R) => R.toolsUsed !== undefined) && {
      toolsUsed: uniq(members.flatMap((R) => R.toolsUsed ?? [])),
    }),
  };
}
//@ chunk-tyg7f3ek.js:71819-71901 placement
function hasTurnAttribution(e) {
  return e.uuid !== undefined && (e.turnAttributionKey !== undefined || !e.isMeta);
}
//@ chunk-tyg7f3ek.js:71901-72046 placement
function isResumedTurnBatch(e) {
  return (
    !isHandedOffBatch(e) &&
    e.some(
      (n) =>
        n.resumedTurnUserMessageUuid !== undefined ||
        (hasTurnAttribution(n) && (n.turnAttributionKey !== undefined || n.resumeReason !== undefined)),
    )
  );
}
//@ chunk-tyg7f3ek.js:72046-72183 placement
function isHandedOffBatch(e) {
  return e.some(
    (n) =>
      n.handedOffTurn?.kind === "run" ||
      (n.resumedTurnUserMessageUuid !== undefined && n.resumedTurnOpenerVouched !== true),
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
    ].filter((r) => r !== undefined),
  );
}
//@ chunk-tyg7f3ek.js:72370-72484 placement
function isDrainOnlyResume(e) {
  return (
    (e.drainOnly === true && e.resumedTurnUserMessageUuid !== undefined) ||
    e.sendsOfItsCompactedTurn !== undefined
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

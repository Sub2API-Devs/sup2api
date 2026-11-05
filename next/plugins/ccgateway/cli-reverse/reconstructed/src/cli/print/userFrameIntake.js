/**
 * cli/print/userFrameIntake.ts
 *
 * 2.1.316 新增：用户帧接收、重投解析、输入等待计时与延迟账本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (25)
 * attribution: sole-consumer 2, placement 22, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { tryOr, chatOriginField, createPersistenceChecker } from "./transcriptLeaves.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { hasMalformedTextBlocks } from "../remoteIO/ingress.js";
import { logForDebugging } from "../../utils/debug.js";
import { rememberMovedRow, joinTextAtSeam } from "../../utils/messages.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { extractInboundAttachments } from "../../bridge/inboundAttachments.js";
import { isDrainableMainThreadCommand } from "../../utils/messageQueueManager.js";
import { logError } from "../../utils/log.js";
import { matchRequestId, elapsedMs as elapsedMs_2, flagKey } from "../structuredIOProtocol.js";
import { toError } from "../../utils/errors.js";
import { flushSessionStorage } from "../../utils/sessionStorage.js";
import { turnOutcomeLabel } from "../../bridge/inboundMessageOrigin.js";
import { normalizeMessage } from "../../utils/queryHelpers.js";
import { buildResultMessage } from "../../entrypoints/sdk/coreSchemas.js";
import { getSessionId, getTotalCostUSD, getModelUsage, getSafetyStops } from "../../bootstrap/state.js";
import { EMPTY_USAGE } from "../../services/api/emptyUsage.js";
import { mergeQueuedTraceContexts } from "../../utils/telemetry/ccrTraceContext.js";
import { stripPeerMessageBody } from "../../utils/peerMessageHeaders.js";
import { lastTurnAttributionKey } from "../../utils/cwd.js";
import { commonTurnId, sharedTurnId } from "../../services/mcp/ccrTurnId.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:70964-71094 sole-consumer
var CARRIED_ON_DONE_REASONS = {
  under_way: "done_while_carried_on",
  ended: "done_after_carried_on",
  none: "done_though_cut_off",
  unclear: "done_re_run_unclear",
};
//@ chunk-0yw3taqg.js:71094-71209 sole-consumer
function logMessageGivenAgain(outcome, extra) {
  tryOr(
    () =>
      outcome === "ok"
        ? logFeatureOk("headless_message_given_again", extra)
        : logFeatureSad("headless_message_given_again", outcome, extra),
    undefined,
  );
}
//@ chunk-0yw3taqg.js:71209-81576 placement
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
  prewaitLatch;
  finishedAtStartUp;
  finishedAtStartUpLogged = false;
  noteReportedDoneUnrun;
  storeRewindStandIn;
  cutOffTurnOpenedBy;
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
    prewaitLatch,
    finishedAtStartUp = () => {
      return;
    },
    noteReportedDoneUnrun = () => {},
    storeRewindStandIn,
    cutOffTurnOpenedBy = () => {
      return;
    },
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
    this.prewaitLatch = prewaitLatch;
    this.finishedAtStartUp = finishedAtStartUp;
    this.noteReportedDoneUnrun = noteReportedDoneUnrun;
    this.storeRewindStandIn = storeRewindStandIn;
    this.cutOffTurnOpenedBy = cutOffTurnOpenedBy;
  }
  count(uuid, outcome) {
    let cutOffTurn = tryOr(() => this.cutOffTurnOpenedBy(uuid), undefined);
    logMessageGivenAgain(
      outcome !== "ok" || cutOffTurn === undefined
        ? outcome
        : !cutOffTurn.openerKnown
          ? "done_beside_cut_off_turn"
          : CARRIED_ON_DONE_REASONS[cutOffTurn.reRun],
      {
        ...(cutOffTurn?.tailKind !== undefined && {
          tail_kind: cutOffTurn.tailKind,
        }),
        ...(cutOffTurn?.shutdownStamped !== undefined && {
          tail_shutdown_stamped: cutOffTurn.shutdownStamped,
        }),
      },
    );
  }
  dropMalformed(frame) {
    if (!hasMalformedTextBlocks(frame.message.content)) return false;
    logForDebugging("Dropping malformed user frame: content must be a string or an array of block objects", {
      level: "error",
    });
    if (frame.uuid && !this.receivedMessageUuids.has(frame.uuid))
      this.io.onCommandLifecycle?.(frame.uuid, "completed");
    return true;
  }
  isReRun(uuid) {
    return this.reRuns.has(uuid);
  }
  async skipDuplicate(uuid, onSkip, frame) {
    let transcript = this.transcriptForFrame();
    let retirementMayLand = this.retirementMayLandDuringReads();
    let persisted = await transcript.persisted(uuid);
    let seenAtRuntime = this.receivedMessageUuids.has(uuid);
    let asksForReply = frame !== undefined && frame.shouldQuery !== false && frame.seeded_summon !== true;
    let takenInCheck =
      persisted && !seenAtRuntime && asksForReply ? this.askWhetherTakenInAtAPrompt(uuid) : undefined;
    let turnUnanswered =
      persisted && !seenAtRuntime && takenInCheck === undefined && !this.leftToReRun(uuid)
        ? await transcript.holdersTurnUnanswered(uuid)
        : undefined;
    let summarised =
      (!persisted || turnUnanswered === true) && !seenAtRuntime && asksForReply
        ? this.askWhetherSummarisedAway(uuid)
        : undefined;
    let waitsBehindPrompt = typeof summarised === "object" && summarised.whileStillOwed();
    let whileStillOwed =
      typeof summarised === "function"
        ? summarised
        : waitsBehindPrompt
          ? summarised.whileStillOwed
          : undefined;
    let hasSummarisedProbe = whileStillOwed !== undefined;
    let unansweredProbe = takenInCheck ?? whileStillOwed;
    let reachesTranscript = persisted || hasSummarisedProbe;
    let cutBehindCompaction =
      turnUnanswered === undefined && tryOr(() => this.cutBehindItsCompaction(uuid), false);
    let turnUnansweredFinal =
      unansweredProbe === undefined &&
      (turnUnanswered ??
        (persisted && !seenAtRuntime && (cutBehindCompaction || (await transcript.turnUnanswered(uuid)))));
    if (turnUnansweredFinal && turnUnanswered === undefined && retirementMayLand && !this.rescueOwnsReRun())
      turnUnansweredFinal = await transcript.turnUnanswered(uuid);
    let shouldReRun =
      turnUnansweredFinal &&
      !(this.leftToReRun(uuid) && this.heldForParkedTurn(uuid)) &&
      (turnUnanswered === true ||
        (!this.drain.running &&
          !this.messageQueue.hasUserIntentCommandsInQueue() &&
          !this.rescueOwnsReRun()));
    let heldForPark =
      reachesTranscript && !seenAtRuntime && !turnUnansweredFinal && this.heldForParkedTurn(uuid);
    let owedToRunningTurn =
      unansweredProbe !== undefined &&
      (this.drain.running || this.messageQueue.hasUserIntentCommandsInQueue() || unansweredProbe());
    if (shouldReRun) {
      this.declinedRedeliveries.forget(uuid);
      this.reRuns.add(uuid);
      if (cutBehindCompaction) rememberMovedRow(uuid);
      let startInfo = tryOr(() => this.earlierStartOf(uuid), undefined);
      this.count(uuid, "runs_again");
      logForDiagnosticsNoPII("info", "cli_user_message_dedup_reexecuted", {
        ...(cutBehindCompaction && {
          nothing_stored_after_compaction: true,
        }),
        runs_by_holders_rule: turnUnanswered === true,
        ...(startInfo !== undefined && {
          inherited_permission_prompt_pending: startInfo.inheritedPromptPending,
          conversation_has_compact_boundary: startInfo.conversationHasCompactBoundary,
          conversation_has_message_as_queued_command: startInfo.conversationHasMessageAsQueuedCommand,
          ...startInfo.followUp,
        }),
        ...chatOriginField(),
      });
    } else if (reachesTranscript || seenAtRuntime) {
      let echoWithheld =
        seenAtRuntime &&
        (this.drain.pendingDispatchUuids.includes(uuid) ||
          this.messageQueue.peek((queued) => queued.uuid === uuid) !== undefined ||
          this.parkedUuids().includes(uuid));
      let fileCount = extractInboundAttachments(frame).length;
      logForDiagnosticsNoPII("info", "cli_user_message_dedup_skipped", {
        exists_in_session: persisted,
        runtime_dup: seenAtRuntime,
        ...(takenInCheck !== undefined && {
          taken_in_before_permission_prompt: true,
        }),
        ...(hasSummarisedProbe && {
          summarised_away: true,
        }),
        ...(waitsBehindPrompt && {
          waits_behind_permission_prompt: true,
        }),
        ...chatOriginField(),
        ...(echoWithheld && {
          echo_withheld: true,
        }),
        ...(heldForPark && {
          held_for_park: true,
        }),
        ...(fileCount > 0 && {
          sent_file_count: fileCount,
          turn_unanswered: turnUnansweredFinal,
        }),
      });
      logForDebugging(`Skipping duplicate user message: ${uuid}`);
      if (!echoWithheld && !waitsBehindPrompt && !this.declinedRedeliveries.takeCancelledLine(uuid)) onSkip();
      let finishedUnrun =
        reachesTranscript && !seenAtRuntime && !turnUnansweredFinal && !heldForPark && !owedToRunningTurn;
      if (finishedUnrun) this.count(uuid, "ok");
      else if (!seenAtRuntime)
        this.count(
          uuid,
          turnUnansweredFinal
            ? "left_unanswered"
            : heldForPark
              ? "left_to_parked_turn"
              : waitsBehindPrompt
                ? "left_then_runs"
                : "left_to_turn_carried_on",
        );
      let nothingRunningOrQueued = false;
      let finishedInfo =
        finishedUnrun && !this.finishedAtStartUpLogged
          ? tryOr(() => this.finishedAtStartUp(uuid), undefined)
          : undefined;
      if (finishedUnrun) {
        tryOr(
          () =>
            this.noteReportedDoneUnrun(uuid, {
              leftToATurnCarriedOn: unansweredProbe !== undefined,
              asksForAReply: asksForReply,
            }),
          undefined,
        );
        if (typeof summarised === "function") this.storeRewindStandIn(uuid, false);
        this.io.onCommandLifecycle?.(uuid, "completed");
        this.declinedRedeliveries.forget(uuid);
      }
      if (this.messageQueue.peek(isDrainableMainThreadCommand) !== undefined) this.kick();
      else if (!this.drain.running) {
        nothingRunningOrQueued = true;
        if (this.idleTeeAllowed()) this.io.sessionState.notifyStateChanged("idle");
      }
      if (finishedInfo !== undefined) {
        this.finishedAtStartUpLogged = true;
        logForDiagnosticsNoPII("info", "cli_redelivered_message_turn_read_as_finished", {
          ...finishedInfo,
          nothing_running_or_queued: nothingRunningOrQueued,
          ...chatOriginField(),
        });
      }
      if (!turnUnansweredFinal && !heldForPark && !owedToRunningTurn) this.receivedMessageUuids.track(uuid);
      else
        this.declinedRedeliveries.remember(
          uuid,
          unansweredProbe !== undefined && frame !== undefined
            ? {
                stillOwed: unansweredProbe,
                ...(typeof summarised === "function" && {
                  storeRewindStandIn: (standIn) => this.storeRewindStandIn(uuid, standIn),
                }),
                readAgain: () => {
                  this.readAgain({
                    ...frame,
                    priority: undefined,
                  });
                  logForDiagnosticsNoPII(
                    "info",
                    "cli_user_message_dedup_put_back_on_input",
                    chatOriginField(),
                  );
                },
                thenRuns: waitsBehindPrompt,
              }
            : undefined,
        );
      return true;
    }
    if (!shouldReRun) {
      this.declinedRedeliveries.forget(uuid);
      this.noteNewAfterStart(uuid, frame, typeof summarised === "string" ? summarised : undefined);
    }
    this.receivedMessageUuids.track(uuid);
    return false;
  }
  askWhetherTakenInAtAPrompt(uuid) {
    let takenIn = tryOr(() => this.takenInAtAPrompt(uuid), undefined);
    return takenIn && (() => tryOr(takenIn, false));
  }
  askWhetherSummarisedAway(uuid) {
    let summarised = tryOr(() => this.summarisedAway(uuid), undefined);
    if (typeof summarised === "object")
      return {
        whileStillOwed: () => tryOr(summarised.whileStillOwed, false),
      };
    return typeof summarised === "function" ? () => tryOr(summarised, false) : summarised;
  }
  noteNewAfterStart(uuid, frame, summarisedKind) {
    try {
      let startInfo = this.earlierStartOf(uuid);
      if (startInfo === undefined) return;
      logForDiagnosticsNoPII("info", "cli_user_message_dedup_new_after_start", {
        started_ago: durationBucket_2(Date.now() - startInfo.startedAtMs),
        inherited_permission_prompt_pending: startInfo.inheritedPromptPending,
        conversation_has_compact_boundary: startInfo.conversationHasCompactBoundary,
        conversation_has_message_as_queued_command: startInfo.conversationHasMessageAsQueuedCommand,
        ...(frame !== undefined && {
          should_query: frame.shouldQuery !== false,
          is_synthetic: Boolean(frame.isSynthetic),
          has_priority: frame.priority !== undefined,
        }),
        turn_running: this.drain.running,
        user_intent_queued: this.messageQueue.hasUserIntentCommandsInQueue(),
        ...startInfo.followUp,
        ...startInfo.endedTurnsCopy,
        ...chatOriginField(),
        ...(summarisedKind === "off" && {
          summarised_away_switch_off: true,
        }),
        ...(summarisedKind === "cold" && {
          summarised_away_switch_cold: true,
        }),
        ...(summarisedKind === "unlisted" && {
          summarised_away_unlisted: true,
        }),
        ...(summarisedKind === "taken_in_since" && {
          summarised_away_taken_in_since: true,
        }),
        ...(summarisedKind === "kept_rows_not_loaded" && {
          summarised_away_kept_rows_not_loaded: true,
        }),
      });
    } catch (error) {
      logError(error);
    }
  }
  acceptUserFrame(frame) {
    let barrier = this.admissionBarrier();
    if (frame.ownFirstTurnMessage) {
      if (barrier.pending === 0 && this.ownParked === null) return this.deliver(frame);
      let tail = barrier.tail;
      let startTime = performance.now();
      logForDiagnosticsNoPII("info", "cli_user_frame_parked", () => ({
        uuid: matchRequestId(frame.frame.uuid),
        barrier_pending: barrier.pending,
        had_parked: this.ownParked !== null,
        own_first_turn_message: true,
      }));
      let parked = (this.ownParked ?? Promise.resolve())
        .then(() => tail)
        .then(() => this.deliver(frame, startTime))
        .catch((error) => logError(toError(error)))
        .finally(() => {
          frame.queueing?.[Symbol.dispose]();
          if (this.ownParked === parked) this.ownParked = null;
        });
      this.ownParked = parked;
      return;
    }
    let firstTurnGate = this.firstTurnGate();
    if (barrier.pending === 0 && this.parked === null && firstTurnGate === undefined)
      return this.deliver(frame);
    let gateTail =
      firstTurnGate === undefined ? barrier.tail : Promise.all([barrier.tail, firstTurnGate]).then(() => {});
    let startTime = performance.now();
    logForDiagnosticsNoPII("info", "cli_user_frame_parked", () => ({
      uuid: matchRequestId(frame.frame.uuid),
      barrier_pending: barrier.pending,
      had_parked: this.parked !== null,
      first_turn_gate: firstTurnGate !== undefined,
    }));
    this.heldFrames.add(frame);
    let parked = (this.parked ?? Promise.resolve())
      .then(() => gateTail)
      .then(() => (this.heldFrames.has(frame) ? this.deliver(frame, startTime) : undefined))
      .catch((error) => logError(toError(error)))
      .finally(() => {
        this.heldFrames.delete(frame);
        frame.queueing?.[Symbol.dispose]();
        if (this.parked === parked) this.parked = null;
        this.prewaitLatch.clearIfNothingPending();
      });
    this.parked = parked;
  }
  parkedUuids() {
    return [...this.heldFrames].flatMap(({ frame }) => frame.uuid ?? []);
  }
  parkedCommands() {
    return [...this.heldFrames].map(({ command }) => command);
  }
  cancelParked() {
    let uuids = this.parkedUuids();
    this.heldFrames.clear();
    return uuids;
  }
  hasParked() {
    return this.parked !== null || this.ownParked !== null;
  }
  async closeInput(onInputClosed) {
    await this.admissionBarrier().tail;
    let firstTurnGate = this.firstTurnGate();
    if (firstTurnGate !== undefined) await firstTurnGate;
    if (this.ownParked !== null) await this.ownParked;
    if (this.parked !== null) await this.parked;
    logForDiagnosticsNoPII("info", "cli_message_loop_ended");
    this.drain.inputClosed = true;
    return onInputClosed();
  }
  async deliver(pending, parkedAtMs) {
    using queueing = pending.queueing;
    let startTime = performance.now();
    let admitted = pending.admit(queueing);
    let awaitedAdmitMs;
    if (typeof admitted !== "boolean") {
      let admitResult = await admitted;
      awaitedAdmitMs = elapsedMs_2(startTime);
      if (!admitResult) return;
    } else if (!admitted) return;
    let waitsForHeldFrame = parkedAtMs !== undefined && !pending.ownFirstTurnMessage;
    if (waitsForHeldFrame && !this.heldFrames.has(pending)) return;
    let { frame, command } = pending;
    let startTime_2 = performance.now();
    let enqueuedWallMs = Date.now();
    let serverReceivedWallMs = frame.server_received_wall_ms;
    command.receivedAtMs = pending.receivedAtMs;
    command.frameTiming = {
      ...(pending.receivedWallMs !== undefined && {
        receivedWallMs: pending.receivedWallMs,
        intakePhasesMs: inputLatencyFields({
          waits: pending.waits,
          parsedAtMs: pending.parsedAtMs,
          parkedAtMs,
          admitStartedAtMs: startTime,
          awaitedAdmitMs,
          enqueuedAtMs: startTime_2,
          receivedWallMs: pending.receivedWallMs,
          enqueuedWallMs,
          aheadOfRead: pending.aheadOfRead,
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
      pending.beforeEnqueue?.(command);
    } catch (error) {
      logError(error);
    }
    try {
      this.messageQueue.enqueue(command);
    } finally {
      if (waitsForHeldFrame) {
        this.prewaitLatch.heldCommandQueued(command);
        this.heldFrames.delete(pending);
      }
    }
    if (frame.uuid !== undefined && this.declinedRedeliveries.takeStoppedWhileWaiting(frame.uuid))
      this.startAborted(frame.uuid);
    queueing?.queued();
    pending.afterEnqueue?.();
    if (frame.uuid !== undefined) this.io.onCommandLifecycle?.(frame.uuid, "queued");
    logForDiagnosticsNoPII("info", "cli_user_message_enqueued", () => ({
      has_uuid: frame.uuid !== undefined,
      uuid: matchRequestId(frame.uuid),
      should_query: frame.shouldQuery,
      has_priority: frame.priority !== undefined,
      queue_depth: this.messageQueue.getCommandQueueLength(),
      parse_to_enqueue_ms: Math.round(startTime_2 - pending.parsedAtMs),
      dedup_ms: pending.waits.dedupMs,
      flag_settle_ms: pending.waits.flagSettleMs,
      receive_hook_ms: pending.waits.receiveHookMs,
      ...(pending.waits.attachments !== undefined && {
        attachments_ms: pending.waits.attachments.ms,
        attachment_count: pending.waits.attachments.count,
        inlined_images: pending.waits.attachments.inlinedImages,
        ahead_of_files: pending.waits.attachments.aheadOfFiles,
        ...pending.waits.attachments.stages,
      }),
      ...(parkedAtMs !== undefined && {
        parked_ms: Math.round(startTime_2 - parkedAtMs),
      }),
    }));
    pending.beforeKick?.();
    this.kick();
  }
}
//@ chunk-0yw3taqg.js:81576-82267 placement
class InputLatencyLedger {
  inputReadyAtMs;
  capacity;
  handled = [];
  droppedUntilMs = Number.NEGATIVE_INFINITY;
  constructor(inputReadyAtMs, capacity = 512) {
    this.inputReadyAtMs = inputReadyAtMs;
    this.capacity = capacity;
  }
  note(kind, phase, ms) {
    if (ms <= phase) return;
    this.handled.push({
      kind,
      startMs: phase,
      endMs: ms,
    });
    if (this.handled.length > this.capacity) this.droppedUntilMs = this.handled.shift().endMs;
  }
  split(startMs, endMs) {
    if (startMs < this.droppedUntilMs) return;
    let max = Math.max(0, startMs);
    let phases = {
      startupMs: overlapMs(Number.NEGATIVE_INFINITY, this.inputReadyAtMs, max, endMs),
      controlRequestsMs: 0,
      userFramesMs: 0,
    };
    for (let { kind, startMs, endMs: endMs_2 } of this.handled) {
      let overlap = overlapMs(startMs, endMs_2, max, endMs);
      if (kind === "control") phases.controlRequestsMs += overlap;
      else phases.userFramesMs += overlap;
    }
    return phases;
  }
  phasesBeforeRead(fromMs, toMs) {
    if (fromMs === undefined) return;
    let frame = this.split(fromMs, toMs);
    return frame && splitStartupWait(toMs - fromMs, frame);
  }
}
//@ chunk-0yw3taqg.js:82267-82335 placement
function overlapMs(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}
//@ chunk-0yw3taqg.js:82335-82386 placement
function nonNegativeRounded(ms) {
  return Math.max(0, Math.round(ms ?? 0));
}
//@ chunk-0yw3taqg.js:82386-82959 placement
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
  let waitTimes = {
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
  let totalMs = 0;
  for (let ms of Object.values(waitTimes)) totalMs += ms ?? 0;
  return {
    ...splitStartupWait(Math.round(enqueuedWallMs - receivedWallMs) - rounded, aheadOfRead),
    ...waitTimes,
    other: Math.max(0, rounded - totalMs),
  };
}
//@ chunk-0yw3taqg.js:82959-83216 placement
function splitStartupWait(startupMs, frame) {
  let rounded = nonNegativeRounded(startupMs);
  let min = Math.min(rounded, nonNegativeRounded(frame?.startupMs));
  let min_2 = Math.min(rounded - min, nonNegativeRounded(frame?.controlRequestsMs));
  let min_3 = Math.min(rounded - min - min_2, nonNegativeRounded(frame?.userFramesMs));
  return {
    before_read: rounded - min - min_2 - min_3,
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
//@ chunk-0yw3taqg.js:83216-83365 placement
function durationBucket_2(ms) {
  let minutes = ms / 60000;
  if (minutes < 1) return "under_1m";
  if (minutes < 10) return "under_10m";
  if (minutes < 60) return "under_1h";
  if (minutes < 360) return "under_6h";
  return "6h_or_more";
}
//@ chunk-0yw3taqg.js:83365-83572 placement
function compactionRunFields({ terminalReason, compactions }) {
  let bucket = compactions === 1 ? "1" : compactions === 2 ? "2" : "3_or_more";
  return {
    compactions_in_run: bucket,
    ...flagKey("compactions_in_run", bucket),
    ...(terminalReason !== undefined && {
      terminal_reason: terminalReason,
      ...flagKey("terminal_reason", terminalReason),
    }),
  };
}
//@ chunk-0yw3taqg.js:83572-83813 placement
function createTurnPersistenceChecks({ storageV5, heldInMemory }) {
  return {
    flush: () => flushSessionStorage(),
    async turnRan(batch) {
      let checker = createPersistenceChecker({
        storageV5,
        heldInMemory,
      })();
      return (await checker.persisted(batch)) && !(await checker.turnUnanswered(batch));
    },
    isFound: (uuid) =>
      createPersistenceChecker({
        storageV5,
        heldInMemory,
      })().persisted(uuid),
  };
}
//@ chunk-0yw3taqg.js:83813-88150 placement
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
  remember(uuid, check) {
    this.pendingDeclinedUnansweredAcks.add(uuid);
    this.putBackAndUnread.delete(uuid);
    if (check !== undefined) {
      let existing = this.noRowVouchesFor.get(uuid);
      this.noRowVouchesFor.set(
        uuid,
        existing?.readAgain === undefined
          ? check
          : {
              ...existing,
              stillOwed: check.stillOwed,
            },
      );
    }
  }
  runWhatNoRowVouchesFor() {
    this.readAgain([...this.noRowVouchesFor.keys()]);
  }
  readAgain(frames) {
    for (let frame of frames)
      if (this.noRowVouchesFor.get(frame)?.readAgain !== undefined) this.putBack(frame);
  }
  get heldBack() {
    return [...this.pendingDeclinedUnansweredAcks, ...this.putBackAndUnread];
  }
  get waitingToRun() {
    return [
      ...[...this.noRowVouchesFor].filter(([, { thenRuns }]) => thenRuns === true).map(([uuid]) => uuid),
      ...this.putBackAndUnread,
    ];
  }
  cancelWaitingToRun() {
    let waitingToRun = this.waitingToRun;
    for (let frame of waitingToRun) {
      if (this.putBackAndUnread.has(frame)) this.cancelledAndUnread.add(frame);
      this.forget(frame);
      this.stoppedWhileWaiting.delete(frame);
      this.receivedMessageUuids.track(frame);
    }
    return waitingToRun;
  }
  takeCancelledLine(uuid) {
    return this.cancelledAndUnread.delete(uuid);
  }
  stopWaitingToRun() {
    for (let uuid of this.waitingToRun) this.stoppedWhileWaiting.add(uuid);
  }
  takeStoppedWhileWaiting(uuid) {
    return this.stoppedWhileWaiting.delete(uuid);
  }
  putBack(frame) {
    let readAgain = this.noRowVouchesFor.get(frame)?.readAgain;
    this.forget(frame);
    this.putBackAndUnread.add(frame);
    try {
      readAgain?.();
    } catch (error) {
      this.putBackAndUnread.delete(frame);
      logError(error);
    }
  }
  closeWhatNoRowVouchesFor() {
    for (let key of [...this.noRowVouchesFor.keys()]) if (!this.isHeld(key)) this.close(key);
  }
  isHeld(uuid) {
    return this.holds(uuid) || this.noRowVouchesFor.get(uuid)?.stillOwed() === true;
  }
  forget(uuid) {
    this.pendingDeclinedUnansweredAcks.delete(uuid);
    this.noRowVouchesFor.delete(uuid);
    this.putBackAndUnread.delete(uuid);
  }
  async ackAtBatchTerminal(outcome) {
    if (!this.hasAny) return;
    try {
      await this.transcript.flush();
    } catch {}
    for (let pendingDeclinedUnansweredAck of [...this.pendingDeclinedUnansweredAcks]) {
      if (this.isHeld(pendingDeclinedUnansweredAck)) continue;
      let declined = this.noRowVouchesFor.get(pendingDeclinedUnansweredAck);
      if (declined?.storeRewindStandIn !== undefined) {
        this.noRowVouchesFor.set(pendingDeclinedUnansweredAck, {
          ...declined,
          storeRewindStandIn: undefined,
        });
        await declined.storeRewindStandIn(true);
      }
      let stillHeld =
        this.noRowVouchesFor.has(pendingDeclinedUnansweredAck) ||
        (await this.transcript.turnRan(pendingDeclinedUnansweredAck));
      let kept =
        !stillHeld &&
        outcome?.opener === pendingDeclinedUnansweredAck &&
        !(await this.transcript.isFound(pendingDeclinedUnansweredAck))
          ? outcome
          : undefined;
      if (kept?.flag === "on") await this.storeRewindStandIn(pendingDeclinedUnansweredAck, true);
      if (
        (stillHeld || kept !== undefined) &&
        this.pendingDeclinedUnansweredAcks.has(pendingDeclinedUnansweredAck) &&
        !this.isHeld(pendingDeclinedUnansweredAck)
      ) {
        if (kept !== undefined) {
          let { flag } = kept;
          logForDiagnosticsNoPII("info", "cli_redelivered_message_closed_without_transcript_proof", {
            ...chatOriginField(),
            ...(flag === "off" && {
              switch_off: true,
            }),
            ...(flag === "cold" && {
              switch_cold: true,
            }),
            ...compactionRunFields(kept),
          });
          if (flag !== "on") continue;
        } else if (!this.noRowVouchesFor.has(pendingDeclinedUnansweredAck))
          this.noteNoRewindTarget(
            pendingDeclinedUnansweredAck,
            outcome?.opener === pendingDeclinedUnansweredAck ? outcome : undefined,
          );
        this.close(pendingDeclinedUnansweredAck);
      }
    }
  }
  noteNoRewindTarget(uuid, reason) {
    try {
      if (!this.hasRewindTarget(uuid))
        logForDiagnosticsNoPII("info", "cli_redelivered_message_closed_with_no_rewind_target", {
          ...chatOriginField(),
          ...(reason && compactionRunFields(reason)),
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
    for (let uuid of this.cancelWaitingToRun()) this.io.onCommandLifecycle?.(uuid, "cancelled");
  }
  cancelWithItsReRun(uuid) {
    if (!this.pendingDeclinedUnansweredAcks.has(uuid)) return false;
    this.stoppedWhileWaiting.delete(uuid);
    this.finish(uuid, "cancelled");
    return true;
  }
  close(reason) {
    if (this.noRowVouchesFor.get(reason)?.thenRuns === true) {
      this.putBack(reason);
      return;
    }
    this.noRowVouchesFor.get(reason)?.storeRewindStandIn?.(false);
    this.finish(reason, "completed");
  }
  finish(outcome, reason) {
    this.forget(outcome);
    this.receivedMessageUuids.track(outcome);
    this.messageQueue.consumeCancelPending(outcome);
    this.noteClosedUnrun(outcome, reason);
    this.io.onCommandLifecycle?.(outcome, reason);
  }
}
//@ chunk-0yw3taqg.js:88150-89014 placement
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
  dropTaken(command) {
    this.onBatch(command, "dropped");
  }
  startBatch(batch) {
    this.onBatch(
      batch.flatMap(({ uuid }) => uuid ?? []),
      "started",
    );
    for (let { uuid, wakeupSource, wakeupScheduledFor } of batch)
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
    let outcome = turnOutcomeLabel(terminalReason, aborted);
    this.onBatch(batchUuids, "settled");
    for (let batchUuid of batchUuids) {
      this.messageQueue.consumeCancelPending(batchUuid);
      if (!this.frozen)
        this.io.onCommandLifecycle?.(
          batchUuid,
          deliveredPollBatchUuids.includes(batchUuid) ? "completed" : outcome,
        );
      this.declined.forget(batchUuid);
    }
  }
  freezeTerminals() {
    this.frozen = true;
  }
  forwardEngineLifecycle(stage, entry) {
    if (this.frozen && (entry === "completed" || entry === "cancelled")) return;
    this.io.onCommandLifecycle?.(stage, entry);
  }
}
//@ chunk-0yw3taqg.js:89014-89594 layout
function flushPendingRowsWithTerminal(messages, deps) {
  for (let row of messages) for (let frame of normalizeMessage(row)) deps.write(frame);
  let { turnUnderWay, pendingDispatchUuids, pendingDispatchKeys } = deps.drain;
  if (
    turnUnderWay ||
    pendingDispatchUuids.length > 0 ||
    pendingDispatchKeys.length > 0 ||
    deps.messageQueue.peek(isDrainableMainThreadCommand) !== undefined
  )
    return;
  let resultMessage = buildResultMessage({
    startedAt: performance.now(),
    common: {
      is_error: false,
      duration_api_ms: 0,
      num_turns: 0,
      stop_reason: null,
      session_id: getSessionId(),
      total_cost_usd: getTotalCostUSD(),
      usage: EMPTY_USAGE,
      modelUsage: getModelUsage(),
      permission_denials: [],
      fast_mode_state: undefined,
      fast_mode_disabled_reason: undefined,
      origin: undefined,
      subagent_stats: undefined,
      safety_stops: getSafetyStops(),
    },
    variant: {
      subtype: "success",
      result: "",
    },
  });
  deps.pointerResults?.add(resultMessage);
  deps.write(resultMessage);
}
//@ chunk-0yw3taqg.js:89631-89936 placement
/**
 * 输入等待阶段名列表与其索引映射，供 InputWaitStopwatch 按阶段累计耗时。
 */
var INPUT_WAIT_PHASES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var INPUT_WAIT_PHASE_INDEX;
deferInit("chunk-0yw3taqg.js:89631", () => {
  INPUT_WAIT_PHASES = [
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
  INPUT_WAIT_PHASE_INDEX = new Map(INPUT_WAIT_PHASES.map((phase, index) => [phase, index]));
});
//@ chunk-0yw3taqg.js:89936-91022 placement
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
  enter(phase, now = performance.now()) {
    this.spentMs[this.phase] += now - this.phaseSinceMs;
    this.phase = INPUT_WAIT_PHASE_INDEX.get(phase);
    this.phaseSinceMs = now;
  }
  controlRequestStarted(now = performance.now()) {
    this.controlRequestEnded(now);
    this.controlRequestSinceMs = now;
  }
  controlRequestEnded(now = performance.now()) {
    if (this.controlRequestSinceMs !== undefined) {
      this.controlRequestsMs += now - this.controlRequestSinceMs;
      this.controlRequestSinceMs = undefined;
    }
  }
  mark(now = performance.now()) {
    let list = Array.from(this.spentMs);
    list[this.phase] += now - this.phaseSinceMs;
    return {
      clockId: this.id,
      spentMs: list,
      controlRequestsMs: this.controlRequestsNow(now),
    };
  }
  readSince(phase, now, sinceMs) {
    if (phase.clockId !== this.id) return;
    return {
      phases: inputWaitBreakdown(
        phase.spentMs,
        (name) => this.spentMs[name] + (name === this.phase ? now - this.phaseSinceMs : 0),
        sinceMs,
      ),
      controlRequestsMs: Math.max(0, Math.round(this.controlRequestsNow(now) - phase.controlRequestsMs)),
    };
  }
  controlRequestsNow(phase) {
    return (
      this.controlRequestsMs +
      (this.controlRequestSinceMs === undefined ? 0 : phase - this.controlRequestSinceMs)
    );
  }
}
//@ chunk-0yw3taqg.js:91022-91207 placement
function inputWaitBreakdown(spentMs, currentPhase, phaseSinceMs) {
  let breakdown = {};
  let previous = 0;
  let reported = 0;
  for (let j = 0; j < INPUT_WAIT_PHASES.length; j++) {
    previous += Math.max(0, currentPhase(j) - (spentMs[j] ?? 0));
    let elapsedMs = Math.round(previous) - reported;
    if (elapsedMs > 0) {
      breakdown[INPUT_WAIT_PHASES[j]] = elapsedMs;
      reported += elapsedMs;
    }
  }
  breakdown.other = Math.max(0, Math.round(phaseSinceMs) - reported);
  return breakdown;
}
//@ chunk-0yw3taqg.js:91207-91274 placement
function stringToTextBlocks(text) {
  return typeof text === "string"
    ? [
        {
          type: "text",
          text,
        },
      ]
    : text;
}
//@ chunk-0yw3taqg.js:91274-91402 placement
function mergeQueuedPrompts(values) {
  if (values.length === 1) return values[0];
  if (values.every((value) => typeof value === "string"))
    return values.join(`
`);
  return values.map(stringToTextBlocks).reduce(joinTextAtSeam);
}
//@ chunk-0yw3taqg.js:91402-92642 placement
/**
 * 把同一批排队的多条 prompt 合并成一条（合并文本、mergedSendUuids、来源）。
 */
function mergeQueuedPrompts_2(members) {
  let first = members[0];
  if (members.length === 1) return first;
  let traceContext = mergeQueuedTraceContexts(members);
  let lastWithUuid = members.findLast((member) => member.uuid) ?? first;
  let mergedValue = mergeQueuedPrompts(members.map((member) => member.value));
  let firstFrame =
    first.origin?.kind === "peer" ? stripPeerMessageBody(first.origin, mergedValue, first.value) : undefined;
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
    ...first,
    ...(firstFrame !== undefined && {
      origin:
        flattened.length === members.length
          ? {
              ...firstFrame,
              members: flattened,
            }
          : firstFrame,
    }),
    value: mergedValue,
    hostAsked: members.every((member) => member.hostAsked) ? first.hostAsked : undefined,
    ownWord: members.every((member) => member.ownWord) ? first.ownWord : undefined,
    declaresNoSender: members.every((member) => member.declaresNoSender) ? first.declaresNoSender : undefined,
    uuid: lastWithUuid.uuid,
    frameTiming: lastWithUuid.frameTiming,
    turnAttributionKey: lastTurnAttributionKey(members),
    traceContext: traceContext.parent,
    linkedTraceContexts: traceContext.linked,
    attachmentSourceUuid: undefined,
    deliveryId: undefined,
    fileAttachments: members.flatMap((member) => member.fileAttachments ?? []),
    ...(members.some((member) => member.namesWidgetViews) && {
      namesWidgetViews: true,
    }),
    clientPlatform: members.find((member) => member.clientPlatform)?.clientPlatform ?? first.clientPlatform,
    ccrTurnId: commonTurnId(members),
    typedByPerson: members.every((member) => member.typedByPerson === true) || undefined,
    ccrProgramUseCaseId: sharedTurnId(members),
    ...(members.some((member) => member.ccrTurnIdEndsWithTurn) && {
      ccrTurnIdEndsWithTurn: true,
    }),
    ...(members.some((member) => member.stampThreadState) && {
      stampThreadState: true,
    }),
    ...(members.some((member) => member.ultrathinkTyped) && {
      ultrathinkTyped: true,
    }),
    ...(members.some((member) => member.toolsUsed !== undefined) && {
      toolsUsed: normalizeCaseForComparison_2(members.flatMap((member) => member.toolsUsed ?? [])),
    }),
  };
}
//@ chunk-0yw3taqg.js:92642-92724 placement
function hasTurnAttribution(batch) {
  return batch.uuid !== undefined && (batch.turnAttributionKey !== undefined || !batch.isMeta);
}
//@ chunk-0yw3taqg.js:92724-92869 placement
function isResumedTurnBatch(batch) {
  return (
    !isHandedOffBatch(batch) &&
    batch.some(
      (member) =>
        member.resumedTurnUserMessageUuid !== undefined ||
        (hasTurnAttribution(member) &&
          (member.turnAttributionKey !== undefined || member.resumeReason !== undefined)),
    )
  );
}
//@ chunk-0yw3taqg.js:92869-93006 placement
function isHandedOffBatch(batch) {
  return batch.some(
    (member) =>
      member.handedOffTurn?.kind === "run" ||
      (member.resumedTurnUserMessageUuid !== undefined && member.resumedTurnOpenerVouched !== true),
  );
}
//@ chunk-0yw3taqg.js:93006-93193 placement
function batchUuids(batch) {
  return batch.flatMap((member) =>
    [
      member.uuid,
      member.resumedTurnUserMessageUuid,
      ...(member.mergedSendUuids ?? []),
      ...(member.alsoLeftToThisReRun ?? []),
      ...(member.sendsOfItsCompactedTurn ?? []),
    ].filter((uuid) => uuid !== undefined),
  );
}
//@ chunk-0yw3taqg.js:93193-93307 placement
function isDrainOnlyResume(command) {
  return (
    (command.drainOnly === true && command.resumedTurnUserMessageUuid !== undefined) ||
    command.sendsOfItsCompactedTurn !== undefined
  );
}
export {
  RedeliveryResolver,
  createTurnPersistenceChecks,
  DeclinedRedeliveryBatcher,
  UserFrameIntake,
  flushPendingRowsWithTerminal,
  InputLatencyLedger,
  isDrainOnlyResume,
  isHandedOffBatch,
  batchUuids,
  isResumedTurnBatch,
  InputWaitStopwatch,
  mergeQueuedPrompts_2,
  hasTurnAttribution,
};

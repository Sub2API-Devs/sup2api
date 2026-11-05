/**
 * cli/print/turnGate.ts
 *
 * 2.1.316 新增：回合开始协调与回合闸门（宿主返回唤醒、费用状态推送）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (24)
 * attribution: placement 21, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isCancelAbortReason,
  unwrapAbortReason,
  shutdownInterruptStamp,
} from "../../utils/abortController.js";
import { identity } from "../../utils/identity.js";
import { CostStateEntrySchema } from "../../utils/transcript/entryTypes.js";
import { safeParseJSON } from "../../utils/json.js";
import { getTotalCostUSD, getSessionId, getSideQueryCostUSD, mainAgentId } from "../../bootstrap/state.js";
import {
  setCostStateForRestore,
  getSessionCostUSD,
  getSessionUsageExcludingRestored,
  resetCostState,
} from "../../cost-tracker.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { onMemoryExtractPlace, cancelUnstartedPass } from "../../services/extractMemories/extractMemories.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import {
  toError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isAbortError,
} from "../../utils/errors.js";
import {
  isDrainableMainThreadCommand,
  isQueuedUserPrompt,
  isBatchHeadHumanCommand,
  isPromptCapableMode,
} from "../../utils/messageQueueManager.js";
import { looksLikeSlashInput } from "../../commands.js";
import { runSafely } from "./followUpPreempt.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_WOBBLY_FOG, TENGU_STEADFAST_WREN } from "../../services/api/withRetry.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { sleep } from "../../utils/sleep.js";
import { trimTrailingAfterTurn, isTurnOpen } from "./transcriptChain.js";
import { mergedMessageUuids, findMessageIndex } from "./queuedMessageUtils.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { buildRunningTurnRecord } from "./runningTurnRecord.js";
import { isRemoteToolForwardingEnabledCached } from "../../services/remoteTools/servingGates.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { DoctorLazy } from "../handlers/util.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { countWhere } from "../../utils/collections.js";
import { RemoteBackgroundCommands } from "../../services/remoteTools/backgroundCommands.js";
import { RemoteCallLedger } from "../../services/remoteTools/callOutcome.js";
import { queryCallsGivenUpOnHost } from "../../services/remoteTools/machinesPrompt.js";
import { isAttestationNotEnforced } from "../remoteIO/fileStoreVerdicts.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { CommandQueueDrain } from "./commandQueueDrain.js";
import { usageLimitStandInMessage } from "./rewindStandIn.js";
import { MAX_MERGED_PROMPTS } from "./inboundMessages.js";
import { mergeQueuedPrompts_2 } from "./userFrameIntake.js";
import { discardPollEvent, isPollEventMode, settleDeliveredEvents } from "../../utils/pollEvents.js";
import { matchRequestId } from "../structuredIOProtocol.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:157538-157776 placement
function classifyTurnAbort(drain, signal, turnEnd) {
  if (!(turnEnd.abortedAtResult ?? signal.aborted)) return;
  let byStop = drain.stopReachedTurn || (isCancelAbortReason(signal.reason) && !drain.sendNowCutTurn);
  let bySendNow = drain.sendNowCutTurn || unwrapAbortReason(signal.reason) === "interrupt";
  return {
    by: byStop ? "stop" : bySendNow ? "send-now" : "other",
    sendRunsAgain: turnEnd.putBack.size > 0,
  };
}
//@ chunk-0yw3taqg.js:157776-157827 placement
var COST_STATE_UNREAD; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_COST_STATE_BYTES;
deferInit("chunk-0yw3taqg.js:157776", () => {
  COST_STATE_UNREAD = identity(
    {
      unread: false,
    },
    (state) => {
      state.unread = false;
    },
  );
  MAX_COST_STATE_BYTES = 16384;
});
//@ chunk-0yw3taqg.js:157827-157874 placement
function isCostStateWithinLimit(text) {
  return Buffer.byteLength(text) <= MAX_COST_STATE_BYTES;
}
//@ chunk-0yw3taqg.js:157874-158101 placement
function restoreCostState(restoredWorkerState) {
  COST_STATE_UNREAD.unread = restoredWorkerState?.readFailed === true;
  let costState = restoredWorkerState?.internal?.cost_state;
  if (typeof costState !== "string" || !isCostStateWithinLimit(costState)) return;
  let parsed = CostStateEntrySchema().safeParse(safeParseJSON(costState, false));
  if (parsed.success && parsed.data.totalCostUSD >= getTotalCostUSD())
    setCostStateForRestore({
      costState: {
        ...parsed.data,
        sessionId: getSessionId(),
      },
    });
}
//@ chunk-0yw3taqg.js:158101-158777 placement
class CostStatePusher {
  io;
  lastPushedCostUsd = 0;
  lastSavedTotalCostUsd = getTotalCostUSD();
  constructor(io) {
    this.io = io;
  }
  pushIfChanged(extra) {
    let sessionCost = getSessionCostUSD() + getSideQueryCostUSD();
    let sessionUsageExcludingRestored = getSessionUsageExcludingRestored();
    let sessionChanged = sessionCost !== this.lastPushedCostUsd;
    let totalCostUSD = getTotalCostUSD();
    if (!sessionChanged && totalCostUSD === this.lastSavedTotalCostUsd) {
      if (extra !== undefined) this.io.sessionState.notifyInternalMetadataChanged(extra);
      return;
    }
    let costState = COST_STATE_UNREAD.unread ? undefined : resetCostState();
    let costStateJson = costState && jsonStringify(costState);
    this.io.sessionState.notifyInternalMetadataChanged({
      ...extra,
      ...(sessionChanged && {
        cumulative_cost_usd: sessionCost,
        cumulative_input_tokens: sessionUsageExcludingRestored.inputTokens,
        cumulative_output_tokens: sessionUsageExcludingRestored.outputTokens,
        cumulative_cache_read_tokens: sessionUsageExcludingRestored.cacheReadInputTokens,
        cumulative_cache_write_tokens: sessionUsageExcludingRestored.cacheCreationInputTokens,
      }),
      cost_state: costStateJson && isCostStateWithinLimit(costStateJson) ? costStateJson : undefined,
    });
    this.lastSavedTotalCostUsd = totalCostUSD;
    this.lastPushedCostUsd = sessionCost;
  }
}
//@ chunk-0yw3taqg.js:158777-159347 layout
class MemoryExtractPlaceGate {
  host;
  io;
  unsent;
  sent;
  constructor(session, io) {
    this.host = session;
    this.io = io;
    onMemoryExtractPlace(session, (unsent) => {
      this.unsent = unsent;
    });
  }
  takeForTurnEnd() {
    let unsent = this.unsent;
    if (unsent === undefined) return;
    this.sent = unsent;
    this.unsent = undefined;
    return {
      memory_extract_place: unsent,
    };
  }
  resendAtShutdown() {
    try {
      let cancelled = cancelUnstartedPass(this.host, this.unsent ?? this.sent);
      let place = cancelled?.place ?? (this.unsent?.passAt === null ? this.unsent : undefined);
      if (place === undefined) return;
      this.io.sessionState.notifyInternalMetadataChanged({
        memory_extract_place: place,
      });
      this.sent = place;
      this.unsent = undefined;
      if (cancelled !== null)
        logEvent("tengu_extract_memories_place_resent", {
          timer_armed: cancelled.timerArmed,
        });
    } catch (error) {
      logError(toError(error));
    }
  }
}
//@ chunk-0yw3taqg.js:159347-159542 layout
function hasDrainableHumanPrompt({ messageQueue, drain }) {
  try {
    let head = messageQueue.peek(isDrainableMainThreadCommand);
    return (
      !drain.endSessionRequested &&
      head !== undefined &&
      isQueuedUserPrompt(head) &&
      isBatchHeadHumanCommand(head) &&
      head.shouldQuery !== false &&
      head.textNotTyped !== true &&
      !looksLikeSlashInput(head.value)
    );
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-0yw3taqg.js:159542-160016 layout
function releaseTurnEndSummaryOnHumanPrompt({ messageQueue, drain, io, alsoTo }) {
  runSafely(() => {
    let pendingTurnEndSummary = io.sessionState.pendingTurnEndSummary;
    if (
      pendingTurnEndSummary === undefined ||
      drain.turnUnderWay ||
      !io.sessionState.turnEndSummaryOutstanding() ||
      !hasDrainableHumanPrompt({
        messageQueue,
        drain,
      }) ||
      getRemoteFeatureGateState(TENGU_WOBBLY_FOG) !== "on"
    )
      return;
    io.sessionState.endTurnEndSummaryHold();
    logFeatureOk("headless_follow_up_ends_hold");
    let startTime = performance.now();
    pendingTurnEndSummary.promise.then(() => {
      runSafely(() => {
        let details = {
          call_ran_on_ms: Math.round(performance.now() - startTime),
        };
        logForDiagnosticsNoPII("info", "cli_turn_end_wait_ended_by_message", details);
        alsoTo?.(details);
      });
    });
  });
}
//@ chunk-0yw3taqg.js:160016-160028 placement
var COST_PUSH_INTERVAL_MS = 5000;
//@ chunk-0yw3taqg.js:160028-163005 placement
/**
 * 轮次闸门：轮次开始前等待投递账本、拒绝重投、刷新转录与回执，处理 idle 释放与会话结束。
 */
class TurnGate {
  drain;
  messageQueue;
  deliveryLedger;
  declinedRedeliveries;
  io;
  emit;
  drainSdkEvents;
  flushTranscript;
  flushAcks;
  stopping;
  idleRelease;
  kick;
  endSessionHead;
  reportContextUsage;
  decideIdleReport;
  pushCost;
  startRecap;
  startStopRetirementDue;
  rearmNudge;
  constructor({
    drain,
    messageQueue,
    deliveryLedger,
    declinedRedeliveries,
    io,
    emit,
    drainSdkEvents,
    flushTranscript,
    flushAcks,
    stopping,
    idleRelease,
    kick,
    endSessionHead,
    reportContextUsage,
    decideIdleReport,
    pushCost,
    startRecap,
    startStopRetirementDue,
    rearmNudge,
  }) {
    this.drain = drain;
    this.messageQueue = messageQueue;
    this.deliveryLedger = deliveryLedger;
    this.declinedRedeliveries = declinedRedeliveries;
    this.io = io;
    this.emit = emit;
    this.drainSdkEvents = drainSdkEvents;
    this.flushTranscript = flushTranscript;
    this.flushAcks = flushAcks;
    this.stopping = stopping;
    this.idleRelease = idleRelease;
    this.kick = kick;
    this.endSessionHead = endSessionHead;
    this.reportContextUsage = reportContextUsage;
    this.decideIdleReport = decideIdleReport;
    this.pushCost = pushCost;
    this.startRecap = startRecap;
    this.startStopRetirementDue = startStopRetirementDue;
    this.rearmNudge = rearmNudge;
  }
  settleBatch({ batch, deliveredPollBatchUuids, turnEnd, turnSignal }) {
    this.deliveryLedger.settleBatch({
      batchUuids: batch.uuids,
      deliveredPollBatchUuids,
      terminalReason: turnEnd.terminalReason,
      aborted: turnEnd.abortedAtResult ?? turnSignal.aborted,
    });
    if (this.declinedRedeliveries.hasAny) {
      let resumedTurnUserMessageUuid =
        turnEnd.compactions > 0 && turnEnd.result !== undefined && shutdownInterruptStamp(turnSignal) !== true
          ? batch.members.find((member) => member.resumedTurnOpenerVouched === true)
              ?.resumedTurnUserMessageUuid
          : undefined;
      return this.declinedRedeliveries.ackAtBatchTerminal(
        resumedTurnUserMessageUuid === undefined
          ? undefined
          : {
              opener: resumedTurnUserMessageUuid,
              flag: getRemoteFeatureGateState(TENGU_STEADFAST_WREN),
              terminalReason: turnEnd.terminalReason,
              compactions: turnEnd.compactions,
            },
      );
    }
    return;
  }
  closeWhatNoRowVouchesFor(crashed) {
    if (crashed) return;
    try {
      this.declinedRedeliveries.closeWhatNoRowVouchesFor();
    } catch (error) {
      logError(error);
    }
  }
  async release({ crashed, raceTeardown }) {
    this.closeWhatNoRowVouchesFor(crashed);
    this.drain.runPhase = "finally_flush";
    await this.flushTranscript();
    this.drain.runPhase = "finally_post_flush";
    if (!this.stopping()) {
      await Promise.race([
        this.flushAcks(),
        sleep(COST_PUSH_INTERVAL_MS, undefined, {
          unref: true,
        }),
      ]);
      let summaryPromise =
        crashed || this.stopping() ? undefined : this.io.sessionState.waitForTurnEndSummary();
      if (summaryPromise !== undefined) {
        this.drain.turnStartClock.enter("earlier_turn");
        this.drain.awaitingTurnEndSummary = true;
        try {
          await raceTeardown(summaryPromise);
        } finally {
          this.drain.awaitingTurnEndSummary = false;
        }
        this.drain.turnStartClock.enter("after_turn");
      }
    }
    if (!this.stopping())
      try {
        await this.reportContextUsage();
      } catch (error) {
        logError(error);
      }
    if (!this.stopping()) {
      let keepSummaryHold =
        !crashed &&
        this.io.sessionState.pendingTurnEndSummary?.endedAt !== undefined &&
        hasDrainableHumanPrompt({
          messageQueue: this.messageQueue,
          drain: this.drain,
        });
      let goIdle = this.decideIdleReport() === "idle" && !keepSummaryHold;
      if (goIdle) this.io.sessionState.notifyStateChanged("idle");
      this.pushCost();
      for (let event of this.drainSdkEvents()) this.emit(event);
      if (goIdle) this.startRecap();
    }
    this.closeWhatNoRowVouchesFor(crashed);
    this.drain.running = false;
    this.drain.intentBatchInFlight = false;
    this.idleRelease.start();
    if (!this.stopping()) this.startStopRetirementDue();
    if (crashed) return "released";
    if (!this.stopping() && !this.drain.endSessionRequested)
      try {
        this.rearmNudge();
      } catch (error) {
        logError(error);
      }
    if (
      (!this.drain.endSessionRequested || this.messageQueue.peek(this.endSessionHead) !== undefined) &&
      this.messageQueue.peek(isDrainableMainThreadCommand) !== undefined
    ) {
      this.kick();
      return "rekicked";
    }
    return "released";
  }
}
//@ chunk-0yw3taqg.js:163005-163252 placement
function heldUuidsAnsweredByTurn(entries, uuid) {
  let trimmed = trimTrailingAfterTurn(entries, uuid);
  let kept = new Set(trimmed);
  let extraUuids = mergedMessageUuids(trimmed, uuid).filter((mergedUuid) => {
    let normalized = normalizeUuidOrNull(mergedUuid);
    let row = normalized === null ? undefined : entries[findMessageIndex(entries, normalized)];
    return (
      mergedUuid === uuid ||
      (normalized !== null && row !== undefined && kept.has(row) && isTurnOpen(entries, normalized) === false)
    );
  });
  let userMessageUuids = buildRunningTurnRecord(uuid, extraUuids).fields()?.user_message_uuids;
  return userMessageUuids !== undefined && userMessageUuids.length > 1 ? userMessageUuids : undefined;
}
//@ chunk-0yw3taqg.js:163252-163334 placement
function isHandleReattachWakeEnabled() {
  try {
    return (
      isRemoteToolForwardingEnabledCached() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_adjuster", false) === true
    );
  } catch {
    return false;
  }
}
//@ chunk-0yw3taqg.js:163334-164316 placement
/**
 * 宿主返回唤醒相关文案与阈值：机器重新可达/命令结果更正的提示文本、唤醒 origin、保留时长、安静下限、驻留时间，以及"过旧"阈值与自唤醒次数上限（24 小时内 10 次、总 2 次）。
 */
var MACHINE_REACHABLE_AGAIN_NOTE =
  "A computer attached to this session is reachable again; the attached-machines note names it. Nobody typed this; it is not a request from the user. If work in this conversation was waiting on it, continue that work within what the user already asked for; anything that needed their go-ahead still does. If this turn's attached-machines note does not say a machine is reachable again, or nothing is waiting on it, say so in one short line and stop.";
var HOST_RETURN_CORRECTION_NOTE =
  "This session now knows what became of a command it had stopped waiting for on an attached computer; the correction note says what. Nobody typed this; it is not a request from the user. If work in this conversation was waiting on that command, continue it within what the user already asked for; anything that needed their go-ahead still does. If nothing is waiting on it, say so in one short line and stop.";
var HOST_RETURN_WAKE_ORIGIN = {
  kind: "task-notification",
  source: "host-return-wake",
};
var HOST_RETURN_WAKE_RETENTION_MS = 1e4;
var HOST_RETURN_MIN_QUIET_MS = 60000;
var HOST_RETURN_LINGER_MS = 60000;
var HOST_WAKE_STALE_MS = 600000;
var HOST_SELF_WAKE_TOTAL_CAP = 2;
var HOST_SELF_WAKE_PER_DAY_CAP = 10;
var HOST_SELF_WAKE_WINDOW_MS = 86400000;
//@ chunk-0yw3taqg.js:164316-168739 placement
/**
 * 跟踪附着机器离线/重新可达，在机器回来时向模型排入"主机返回唤醒"提示（task-notification/host-return-wake）。
 */
class HostReturnWakeTracker {
  #t = undefined;
  #n = [];
  #o = 0;
  #u = -1 / 0;
  #i = false;
  #c = -1 / 0;
  #m = new WeakSet();
  #e = new Map();
  #r = undefined;
  #f = {
    at: 0,
    turnsStarted: 0,
  };
  #a = new AbortController();
  start(host) {
    if (this.#t !== undefined) return;
    this.#t = host;
    host.registry.onHostStatusChange((change) => {
      try {
        if (change.change !== "back" || !host.isEnabled()) return;
        if (!change.toldModel) {
          logFeatureSad("rtc_self_wake", "not_told");
          return;
        }
        let state = {
          answered: false,
          turnsStarted: host.turnsStarted(),
          at: host.now(),
          holding: false,
        };
        this.#e.set(change.name, state);
        host.schedule(() => {
          this.#s(host, change.name, state);
        }, HOST_RETURN_WAKE_RETENTION_MS);
      } catch (error) {
        logError(toError(error));
      }
    });
    host.lateOutcomes.onLastWordQueued((x) => {
      if (x !== undefined || !host.isEnabled()) return;
      this.#r = {
        turnsStarted: host.turnsStarted(),
      };
      for (let [name, state] of this.#e) if (state.holding) this.#s(host, name, state);
      this.#p(host);
    });
    host.messageQueue.subscribe(() => {
      try {
        for (let command of host.messageQueue.getCommandQueueSnapshot()) {
          if (this.#m.has(command)) continue;
          this.#m.add(command);
          if (!isHumanOrHandedOffTurn(command) || command.resumeReason !== undefined) continue;
          this.#o = 0;
          this.#u = host.now();
          let receivedAt =
            command.handedOffTurn === undefined
              ? command.receivedAtMs
              : command.handedOffTurn.requestedAtMs === undefined
                ? undefined
                : host.monotonicNow() - (host.now() - command.handedOffTurn.requestedAtMs);
          if (receivedAt !== undefined && receivedAt > this.#c) this.#i = false;
        }
      } catch (error) {
        logError(toError(error));
      }
    });
  }
  stopped() {
    let host = this.#t;
    if (host === undefined) return;
    try {
      this.#i = true;
      this.#c = host.monotonicNow();
      this.#a.abort();
      this.#a = new AbortController();
      let hadState = this.#e.size > 0 || this.#r !== undefined;
      this.#e.clear();
      this.#r = undefined;
      let removed = host.messageQueue.removeByFilter(isHostReturnWake);
      if (hadState || removed.length > 0) logFeatureSad("rtc_self_wake", "stopped");
    } catch (error) {
      logFeatureBad("rtc_self_wake", "threw");
      logError(toError(error));
    }
  }
  async #s(host, name, state) {
    try {
      if (this.#h(host, name, state)) return;
      let hasWake = host.messageQueue.peek(isHostReturnWake) !== undefined;
      let quietMs = HOST_RETURN_MIN_QUIET_MS - (host.now() - (this.#n.at(-1) ?? -1 / 0));
      if (!hasWake && quietMs > 0) {
        host.schedule(() => {
          this.#s(host, name, state);
        }, quietMs);
        return;
      }
      if (!state.answered) {
        let probe = await host.registry
          .entries()
          .find((entry) => entry.name === name)
          ?.transport.probeLive?.({
            signal: this.#a.signal,
          });
        if (this.#e.get(name) !== state) return;
        if (probe !== true) {
          this.#e.delete(name);
          logFeatureSad("rtc_self_wake", probe === false ? "host_away" : "probe_inconclusive");
          return;
        }
        state.answered = true;
        if (this.#h(host, name, state)) return;
        if (host.lateOutcomes.mainCallOpenOn(name)) host.askAboutGivenUpCalls(name);
      }
      if (host.messageQueue.peek(isHostReturnWake) !== undefined) return;
      let lingerMs = HOST_RETURN_LINGER_MS - (host.now() - state.at);
      if (lingerMs > 0 && this.#r === undefined && host.lateOutcomes.mainCallOpenOn(name)) {
        if (!state.holding) {
          state.holding = true;
          host.schedule(() => {
            state.holding = false;
            this.#s(host, name, state);
          }, lingerMs);
        }
        return;
      }
      state.holding = false;
      this.#g(host, MACHINE_REACHABLE_AGAIN_NOTE);
    } catch (error) {
      if (this.#e.get(name) === state) this.#e.delete(name);
      logFeatureBad("rtc_self_wake", "threw");
      logError(toError(error));
    }
  }
  #p(host) {
    try {
      let state = this.#r;
      if (state === undefined || host.messageQueue.peek(isHostReturnWake) !== undefined) return;
      let reason = !host.isEnabled()
        ? "flag_off"
        : !host.lateOutcomes.lastWordWaitsForMain()
          ? "already_told"
          : (this.#l(host, state.turnsStarted) ?? (this.#d(host) ? "rate_limited" : undefined));
      if (reason !== undefined) {
        this.#r = undefined;
        logFeatureSad("rtc_self_wake", reason);
        return;
      }
      let quietMs = HOST_RETURN_MIN_QUIET_MS - (host.now() - (this.#n.at(-1) ?? -1 / 0));
      if (quietMs > 0) {
        host.schedule(() => this.#p(host), quietMs);
        return;
      }
      this.#g(host, HOST_RETURN_CORRECTION_NOTE);
    } catch (error) {
      this.#r = undefined;
      logFeatureBad("rtc_self_wake", "threw");
      logError(toError(error));
    }
  }
  #g(host, summary) {
    this.#f = {
      at: host.now(),
      turnsStarted: host.turnsStarted(),
    };
    host.messageQueue.enqueuePendingNotification({
      mode: "task-notification",
      priority: "later",
      agentId: mainAgentId(),
      isMeta: true,
      skipAttachments: true,
      origin: HOST_RETURN_WAKE_ORIGIN,
      value: formatTaskNotification({
        summary,
      }),
    });
  }
  #h(host, name, state) {
    if (this.#e.get(name) !== state) return true;
    if (!host.isEnabled()) {
      this.#e.delete(name);
      return true;
    }
    let reason = !host.registry.entries().some((entry) => entry.name === name && entry.status === "online")
      ? "host_away"
      : host.messageQueue.peek(isHostReturnWake) !== undefined
        ? undefined
        : !host.registry.backNotePending(name)
          ? "already_told"
          : (this.#l(host, state.turnsStarted) ?? (this.#d(host) ? "rate_limited" : undefined));
    if (reason === undefined) return false;
    this.#e.delete(name);
    logFeatureSad("rtc_self_wake", reason);
    return true;
  }
  lapsedAtTurnStart(command) {
    if (!isHostReturnWake(command)) return false;
    let host = this.#t;
    if (host === undefined) return true;
    try {
      let { at, turnsStarted } = this.#f;
      let waiting = this.#_(host);
      let pending =
        waiting.some((name) => host.registry.backNotePending(name)) ||
        host.lateOutcomes.lastWordWaitsForMain();
      let reason = !host.isEnabled()
        ? "flag_off"
        : this.#u >= at
          ? "person_wrote"
          : host.now() - at > HOST_WAKE_STALE_MS
            ? "stale"
            : !pending
              ? waiting.length === 0 && this.#r === undefined
                ? "host_away"
                : "already_told"
              : (this.#l(host, turnsStarted + 1) ?? (this.#d(host) ? "rate_limited" : undefined));
      this.#r = undefined;
      for (let [name, state] of this.#e)
        if (state.answered) this.#e.delete(name);
        else if (reason !== undefined) state.turnsStarted++;
      if (reason !== undefined) {
        logFeatureSad("rtc_self_wake", reason);
        return true;
      }
      let now = host.now();
      let filtered = this.#n.filter((at) => now - at < HOST_SELF_WAKE_WINDOW_MS);
      filtered.push(now);
      this.#n = filtered;
      this.#o++;
      logFeatureOk("rtc_self_wake");
      return false;
    } catch (error) {
      logFeatureBad("rtc_self_wake", "threw");
      logError(toError(error));
      return true;
    }
  }
  #_(host) {
    let online = new Set(
      host.registry
        .entries()
        .filter((entry) => entry.status === "online")
        .map((entry) => entry.name),
    );
    return [...this.#e].filter(([name, state]) => state.answered && online.has(name)).map(([name]) => name);
  }
  #d(host) {
    let now = host.now();
    return (
      countWhere(this.#n, (at) => now - at < HOST_SELF_WAKE_WINDOW_MS) >= HOST_SELF_WAKE_PER_DAY_CAP ||
      this.#o >= HOST_SELF_WAKE_TOTAL_CAP
    );
  }
  #l(host, turns) {
    if (this.#i) return "stopped";
    if (host.turnsStarted() !== turns) return "head_taken";
    if (host.permissionMode() !== "default") return "mode_blocked";
    return host.attestationKnownOff() ? undefined : "attestation_on_or_unknown";
  }
}
//@ chunk-0yw3taqg.js:168739-168836 placement
function isHostReturnWake(command) {
  return command.origin?.kind === "task-notification" && command.origin.source === "host-return-wake";
}
//@ chunk-0yw3taqg.js:168836-169191 placement
function startHostReturnWakes({ toolState, messageQueue, drain, permissionMode }) {
  toolState.get(HostReturnWakeTracker).start({
    registry: toolState.get(RemoteBackgroundCommands),
    lateOutcomes: toolState.get(RemoteCallLedger),
    askAboutGivenUpCalls: (calls) => queryCallsGivenUpOnHost(toolState, calls),
    messageQueue,
    isEnabled: isHandleReattachWakeEnabled,
    permissionMode,
    attestationKnownOff: isAttestationNotEnforced,
    turnsStarted: () => drain.dequeueCount,
    now: Date.now,
    monotonicNow: () => performance.now(),
    schedule: (fn, delay) => {
      setTimeout(fn, delay).unref();
    },
  });
}
//@ chunk-0yw3taqg.js:169191-169233 placement
function isHumanOrHandedOffTurn(command) {
  return isHumanOrigin(command.origin) || isHandedOffPersonTurn(command);
}
//@ chunk-0yw3taqg.js:169233-169357 placement
function isHandedOffPersonTurn(command) {
  let first = command.handedOffTurn?.kind === "run" ? command.handedOffTurn.messages[0] : undefined;
  return first?.type === "user" && isHumanOrigin(first.origin);
}
//@ chunk-0yw3taqg.js:169357-169394 placement
var TURN_GATE_READY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:169357", () => {
  TURN_GATE_READY = Object.freeze({
    kind: "ready",
  });
});
//@ chunk-0yw3taqg.js:169394-169441 placement
class TurnRefusedError extends Error {
  name = "TurnRefusedError";
}
//@ chunk-0yw3taqg.js:169441-169530 placement
var TURN_REFUSED_TEXT = "This session cannot continue: a required step before the turn did not complete.";
//@ chunk-0yw3taqg.js:169530-169850 placement
function parseTurnGateAnswer(answer) {
  if (typeof answer !== "object" || answer === null || !("kind" in answer)) return;
  if (answer.kind === "ready")
    return {
      answer: TURN_GATE_READY,
      malformed: false,
    };
  if (answer.kind === "fail") {
    let message = "message" in answer ? answer.message : undefined;
    return typeof message === "string" && message.trim() !== ""
      ? {
          answer: {
            kind: "fail",
            message,
          },
          malformed: false,
        }
      : {
          answer: {
            kind: "fail",
            message: TURN_REFUSED_TEXT,
          },
          malformed: true,
        };
  }
  return;
}
//@ chunk-0yw3taqg.js:169850-171276 placement
/**
 * 轮次开始前的参与者闸门：依次询问注册的 beforeTurn 参与者，任何一方失败则拒绝本轮（TurnRefusedError）。
 */
function createTurnGateParticipants() {
  let participants = [];
  let turn = 0;
  async function joinTurnGate(participant, options) {
    let wrap = (answer) => ({
      participant: participant.name,
      answer,
      settledAfterAbort: options.signal.aborted,
    });
    try {
      let turnGateAnswer = parseTurnGateAnswer(await participant.beforeTurn(options));
      if (turnGateAnswer === undefined || turnGateAnswer.malformed) {
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `turn gate participant ${participant.name} broke the answer contract`,
            "turn gate participant broke the answer contract",
          ),
        );
        logForDiagnosticsNoPII("error", "turn_gate_participant_broke_contract", {
          participant: participant.name,
          turn: options.turn,
          reason: turnGateAnswer === undefined ? "malformed_answer" : "unworded_fail",
        });
      }
      return wrap(turnGateAnswer === undefined ? TURN_GATE_READY : turnGateAnswer.answer);
    } catch (error) {
      if (options.signal.aborted && isAbortError(error)) {
        logForDiagnosticsNoPII("debug", "turn_gate_participant_aborted", {
          participant: participant.name,
          turn: options.turn,
        });
        return wrap(TURN_GATE_READY);
      }
      logError(error);
      logForDiagnosticsNoPII("error", "turn_gate_participant_rejected", {
        participant: participant.name,
        turn: options.turn,
      });
      return wrap(TURN_GATE_READY);
    }
  }
  return {
    register(participant) {
      participants.push(participant);
      if (turn > 0)
        logForDiagnosticsNoPII("info", "turn_gate_late_registration", {
          participant: participant.name,
          turn,
        });
    },
    beforeTurn(signal) {
      turn += 1;
      if (participants.length === 0) return null;
      let context = Object.freeze({
        signal,
        turn,
      });
      return Promise.all(participants.map((participant) => joinTurnGate(participant, context))).then(
        (answers) => {
          let flattened = answers.flatMap(({ participant, answer, settledAfterAbort }) =>
            answer.kind === "fail"
              ? [
                  {
                    participant,
                    message: answer.message,
                    settledAfterAbort,
                  },
                ]
              : [],
          );
          let filtered = flattened.filter((refusal) => refusal.settledAfterAbort);
          if (filtered.length > 0)
            logForDiagnosticsNoPII("info", "turn_gate_refusal_after_abort", {
              participants: filtered.map((refusal) => refusal.participant),
              turn: context.turn,
            });
          let filtered_2 = flattened.filter((refusal) => !refusal.settledAfterAbort);
          let first = filtered_2[0];
          if (first === undefined) return TURN_GATE_READY;
          logForDiagnosticsNoPII("warn", "turn_gate_refused", {
            participants: filtered_2.map((refusal) => refusal.participant),
            turn: context.turn,
          });
          return {
            kind: "fail",
            message: first.message,
          };
        },
      );
    },
  };
}
//@ chunk-0yw3taqg.js:171276-177065 placement
/**
 * 协调轮次开始：等待队首、合并重放、处理延迟工具调用与 startGate，然后交给 TurnDispatcher。
 */
class TurnStartCoordinator {
  messageQueue;
  drain;
  prewaitLatch;
  deliveryLedger;
  io;
  commandLacksUserIntent;
  revokeCodeliveredFollowups;
  stopping;
  endSessionHead;
  startGate;
  onHead;
  replayMerged;
  deferredToolUsePending;
  holdsEvalSettles;
  coalesceTaskNotifications;
  repeatsUsageLimitAlert;
  headYields;
  selector;
  heads = 0;
  heldCompletionChars = 0;
  heldCompletionWorkload;
  constructor({
    messageQueue,
    drain,
    prewaitLatch,
    deliveryLedger,
    io,
    commandLacksUserIntent,
    revokeCodeliveredFollowups,
    stopping,
    endSessionHead,
    startGate,
    onHead,
    replayMerged,
    deferredToolUsePending,
    holdsEvalSettles,
    coalesceTaskNotifications,
    repeatsUsageLimitAlert,
    headYields,
  }) {
    this.messageQueue = messageQueue;
    this.drain = drain;
    this.prewaitLatch = prewaitLatch;
    this.deliveryLedger = deliveryLedger;
    this.io = io;
    this.commandLacksUserIntent = commandLacksUserIntent;
    this.revokeCodeliveredFollowups = revokeCodeliveredFollowups;
    this.stopping = stopping;
    this.endSessionHead = endSessionHead;
    this.startGate = startGate;
    this.onHead = onHead;
    this.replayMerged = replayMerged;
    this.deferredToolUsePending = deferredToolUsePending;
    this.holdsEvalSettles = holdsEvalSettles;
    this.coalesceTaskNotifications = coalesceTaskNotifications;
    this.repeatsUsageLimitAlert = repeatsUsageLimitAlert;
    this.headYields = headYields;
    this.selector = new CommandQueueDrain({
      messageQueue,
      prewaitLatch,
      deferredToolUsePending,
      holdsEvalSettles,
    });
  }
  get commandsProcessed() {
    return this.heads;
  }
  take() {
    while (!this.stopping()) {
      let head = this.drain.endSessionRequested
        ? this.startGate.takeHead(this.endSessionHead, () => this.messageQueue.dequeue(this.endSessionHead))
        : this.startGate.takeHead(
            (command) => isDrainableMainThreadCommand(command) && !this.selector.holdsBack(command),
            () => this.selector.takeHead(),
          );
      if (head === undefined) {
        if (
          this.heldCompletionChars === 0 ||
          this.drain.endSessionRequested ||
          this.messageQueue.peek(isDrainableMainThreadCommand) !== undefined
        )
          return;
        if (this.drain.abortController?.signal.aborted) {
          this.heldCompletionChars = 0;
          this.heldCompletionWorkload = undefined;
          return;
        }
        logFeatureSad("print_task_notification_coalesce", "owed_call_dispatched");
        head = {
          value: [],
          mode: "prompt",
          agentId: mainAgentId(),
          isMeta: true,
          skipSubmissionHooks: true,
          workload: this.heldCompletionWorkload,
        };
        this.heldCompletionChars = 0;
        this.heldCompletionWorkload = undefined;
      }
      this.heads++;
      this.drain.dequeueCount++;
      if (this.repeatsUsageLimitAlert(head)) {
        logFeatureOk("usage_limit_denied_notice");
        head = usageLimitStandInMessage(head);
      }
      if (
        head.mode === "task-notification" &&
        typeof head.value === "string" &&
        !this.drain.endSessionRequested &&
        this.heldCompletionChars + head.value.length <= MAX_MERGED_PROMPTS &&
        this.coalesceTaskNotifications() &&
        this.selector.holdsQueryForFollower(
          head,
          (queued) => this.startGate.admits(queued),
          this.repeatsUsageLimitAlert,
        )
      )
        head = {
          ...head,
          shouldQuery: false,
          queryHeldForNextTurn: true,
          stampThreadState: undefined,
        };
      this.drain.intentBatchInFlight = !this.commandLacksUserIntent(head);
      this.io.sessionState.notifyTurnStarting(head.mode, head.taskId);
      this.onHead?.(head);
      if (!isPromptCapableMode(head.mode, head.clientBashCommand))
        throw Error("only prompt commands are supported in streaming mode");
      let members = [head];
      if (head.mode === "prompt" && !this.drain.endSessionRequested) {
        members.push(...this.selector.takeFollowers(head, (queued) => this.startGate.admits(queued)));
        let filtered = members.filter(
          (member) => member.uuid !== undefined && this.messageQueue.consumeCancelPending(member.uuid),
        );
        if (filtered.length > 0) {
          this.revokeCodeliveredFollowups(filtered);
          for (let member of filtered) this.io.onCommandLifecycle?.(member.uuid, "cancelled");
          this.deliveryLedger.dropTaken(filtered.map((member) => member.uuid));
          let filtered_2 = members.filter((member) => !filtered.includes(member));
          if (filtered_2.length === 0) {
            this.prewaitLatch.reset();
            continue;
          }
          members.length = 0;
          members.push(...filtered_2);
          head = filtered_2[0];
        }
        if (this.headYields?.(head, "at_dequeue")) {
          members.shift();
          if (members.length === 0) continue;
          head = members[0];
        }
        if (members.length > 1) head = mergeQueuedPrompts_2(members);
      }
      let filtered = members.map((member) => member.uuid).filter((uuid) => uuid !== undefined);
      this.drain.pendingDispatchUuids = filtered;
      this.drain.pendingDispatchKeys = members.flatMap((member) => member.stopKey ?? []);
      this.drain.drainingHandoff = head.handedOffTurn && {
        command: head,
        running: false,
      };
      this.prewaitLatch.parkBatch(this.drain.intentBatchInFlight, members);
      if (members.length > 1)
        this.replayMerged?.(
          members.filter((member) => member.origin?.kind !== "plugin"),
          head,
        );
      return {
        command: head,
        members,
        uuids: filtered,
      };
    }
    return;
  }
  commit(batch) {
    let filtered = batch.members.filter(
      (member) => member.uuid !== undefined && this.messageQueue.consumeCancelPending(member.uuid),
    );
    if (filtered.length > 0) {
      discardPollEvent(filtered.filter(isPollEventMode), "cancelled by the host");
      this.revokeCodeliveredFollowups(filtered);
      for (let member of filtered)
        if (!this.messageQueue.consumeCancelPendingAcked(member.uuid))
          this.io.onCommandLifecycle?.(member.uuid, "cancelled");
      this.deliveryLedger.dropTaken(filtered.map((member) => member.uuid));
      let filtered_2 = batch.members.filter((member) => !filtered.includes(member));
      if (filtered_2.length === 0) {
        this.prewaitLatch.dropParkedBatch();
        return;
      }
      batch.members.length = 0;
      batch.members.push(...filtered_2);
      batch.command = mergeQueuedPrompts_2(batch.members);
      batch.uuids.length = 0;
      batch.uuids.push(...batch.members.map((member) => member.uuid).filter((uuid) => uuid !== undefined));
    }
    let firstMember = batch.members[0];
    if (
      firstMember !== undefined &&
      (this.drain.endSessionRequested
        ? isHostReturnWake(firstMember)
        : this.headYields?.(firstMember, "before_start") === true)
    ) {
      batch.members.shift();
      batch.uuids.length = 0;
      if (batch.members.length === 0) {
        this.prewaitLatch.dropParkedBatch();
        return;
      }
      batch.command = mergeQueuedPrompts_2(batch.members);
      batch.uuids.push(...batch.members.map((member) => member.uuid).filter((uuid) => uuid !== undefined));
    }
    return batch;
  }
  start(batch) {
    this.deliveryLedger.startBatch(batch.members);
    let { frameTiming, mode } = batch.command;
    logForDiagnosticsNoPII("info", "cli_turn_started", () => ({
      uuid: matchRequestId(batch.command.uuid),
      mode,
      batch_size: batch.members.length,
      enqueue_to_start_ms: frameTiming && Date.now() - frameTiming.enqueuedWallMs,
    }));
    let deliveredUuids = batch.command.mode === "poll-event" ? [...batch.uuids] : [];
    if (batch.command.mode === "poll-event") {
      settleDeliveredEvents(batch.members);
      logFeatureOk("poll_event_delivery");
    }
    return deliveredUuids;
  }
  noteTurnEnded(aborted, command, result) {
    this.selector.noteTurnEnded(aborted);
    if (aborted || result.num_turns > 0) {
      if (!aborted && this.heldCompletionChars > 0) logFeatureOk("print_task_notification_coalesce");
      this.heldCompletionChars = 0;
      this.heldCompletionWorkload = undefined;
    } else if (
      command.queryHeldForNextTurn === true &&
      typeof command.value === "string" &&
      result.result === ""
    ) {
      this.heldCompletionChars += command.value.length;
      this.heldCompletionWorkload = command.workload;
    }
  }
  exit() {
    this.drain.pendingDispatchUuids = [];
    this.drain.pendingDispatchKeys = [];
    this.drain.intentBatchInFlight = false;
    this.drain.drainingHandoff = undefined;
    this.drain.turnUnderWay = false;
    this.prewaitLatch.dropParkedBatch();
    if (this.stopping() || this.drain.endSessionRequested) {
      this.heldCompletionChars = 0;
      this.heldCompletionWorkload = undefined;
    }
    this.messageQueue.setTurnStartFoldTarget(undefined);
    this.selector = new CommandQueueDrain({
      messageQueue: this.messageQueue,
      prewaitLatch: this.prewaitLatch,
      deferredToolUsePending: this.deferredToolUsePending,
      holdsEvalSettles: this.holdsEvalSettles,
    });
  }
}
export {
  createTurnGateParticipants,
  restoreCostState,
  COST_PUSH_INTERVAL_MS,
  heldUuidsAnsweredByTurn,
  MemoryExtractPlaceGate,
  CostStatePusher,
  TurnGate,
  classifyTurnAbort,
  startHostReturnWakes,
  HostReturnWakeTracker,
  TURN_GATE_READY,
  releaseTurnEndSummaryOnHumanPrompt,
  TurnStartCoordinator,
  isHostReturnWake,
  TurnRefusedError,
  isHandedOffPersonTurn,
};

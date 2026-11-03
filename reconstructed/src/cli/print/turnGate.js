/**
 * cli/print/turnGate.ts
 *
 * 2.1.316 新增：回合开始协调与回合闸门（宿主返回唤醒、费用状态推送）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (21)
 * attribution: placement 21
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
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_STEADFAST_WREN } from "../../services/api/withRetry.js";
import { logError } from "../../utils/log.js";
import { sleep } from "../../utils/sleep.js";
import { isActiveMainAgentCommand, isPromptCapableMode } from "../../utils/messageQueueManager.js";
import { trimTrailingAfterTurn, isTurnOpen } from "./transcriptChain.js";
import { mergedMessageUuids, findMessageIndex } from "./queuedMessageUtils.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { buildRunningTurnRecord } from "./runningTurnRecord.js";
import { isRemoteToolForwardingEnabledCached } from "../../services/remoteTools/servingGates.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { string, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  toError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isAbortError,
} from "../../utils/errors.js";
import { DoctorLazy } from "../handlers/util.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { count } from "../../utils/collections.js";
import { RemoteBackgroundCommands } from "../../services/remoteTools/backgroundCommands.js";
import { RemoteCallLedger } from "../../services/remoteTools/callOutcome.js";
import { queryCallsGivenUpOnHost } from "../../services/remoteTools/machinesPrompt.js";
import { isAttestationNotEnforced } from "../remoteIO/fileStoreVerdicts.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { CommandQueueDrain } from "./commandQueueDrain.js";
import { usageLimitStandInMessage } from "./rewindStandIn.js";
import { MAX_MERGED_PROMPTS } from "./inboundMessages.js";
import { mergeQueuedPrompts } from "./userFrameIntake.js";
import { discardPollEvent, isPollEventMode, settleDeliveredEvents } from "../../utils/pollEvents.js";
import { matchRequestId } from "../structuredIOProtocol.js";

//@ chunk-tyg7f3ek.js:127752-127990 placement
function classifyTurnAbort(e, signal, turnEnd) {
  if (!(turnEnd.abortedAtResult ?? signal.aborted)) return;
  let s = e.stopReachedTurn || (isCancelAbortReason(signal.reason) && !e.sendNowCutTurn);
  let h = e.sendNowCutTurn || unwrapAbortReason(signal.reason) === "interrupt";
  return {
    by: s ? "stop" : h ? "send-now" : "other",
    sendRunsAgain: turnEnd.putBack.size > 0,
  };
}
//@ chunk-tyg7f3ek.js:127990-128041 placement
var COST_STATE_UNREAD = identity(
  {
    unread: false,
  },
  (e) => {
    e.unread = false;
  },
);
var MAX_COST_STATE_BYTES = 16384;
//@ chunk-tyg7f3ek.js:128041-128088 placement
function isCostStateWithinLimit(e) {
  return Buffer.byteLength(e) <= MAX_COST_STATE_BYTES;
}
//@ chunk-tyg7f3ek.js:128088-128315 placement
function restoreCostState(restoredWorkerState) {
  COST_STATE_UNREAD.unread = restoredWorkerState?.readFailed === true;
  let costState = restoredWorkerState?.internal?.cost_state;
  if (typeof costState !== "string" || !isCostStateWithinLimit(costState)) return;
  let r = CostStateEntrySchema().safeParse(safeParseJSON(costState, false));
  if (r.success && r.data.totalCostUSD >= getTotalCostUSD())
    setCostStateForRestore({
      costState: {
        ...r.data,
        sessionId: getSessionId(),
      },
    });
}
//@ chunk-tyg7f3ek.js:128315-128991 placement
class CostStatePusher {
  io;
  lastPushedCostUsd = 0;
  lastSavedTotalCostUsd = getTotalCostUSD();
  constructor(io) {
    this.io = io;
  }
  pushIfChanged(e) {
    let n = getSessionCostUSD() + getSideQueryCostUSD();
    let sessionUsageExcludingRestored = getSessionUsageExcludingRestored();
    let s = n !== this.lastPushedCostUsd;
    let totalCostUSD = getTotalCostUSD();
    if (!s && totalCostUSD === this.lastSavedTotalCostUsd) {
      if (e !== undefined) this.io.sessionState.notifyInternalMetadataChanged(e);
      return;
    }
    let y = COST_STATE_UNREAD.unread ? undefined : resetCostState();
    let S = y && jsonStringify(y);
    this.io.sessionState.notifyInternalMetadataChanged({
      ...e,
      ...(s && {
        cumulative_cost_usd: n,
        cumulative_input_tokens: sessionUsageExcludingRestored.inputTokens,
        cumulative_output_tokens: sessionUsageExcludingRestored.outputTokens,
        cumulative_cache_read_tokens: sessionUsageExcludingRestored.cacheReadInputTokens,
        cumulative_cache_write_tokens: sessionUsageExcludingRestored.cacheCreationInputTokens,
      }),
      cost_state: S && isCostStateWithinLimit(S) ? S : undefined,
    });
    this.lastSavedTotalCostUsd = totalCostUSD;
    this.lastPushedCostUsd = n;
  }
}
//@ chunk-tyg7f3ek.js:128991-129003 placement
var COST_PUSH_INTERVAL_MS = 5000;
//@ chunk-tyg7f3ek.js:129003-131852 placement
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
  closeWhatNoRowVouchesFor(e) {
    if (e) return;
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
      let r = crashed || this.stopping() ? undefined : this.io.sessionState.waitForTurnEndSummary();
      if (r !== undefined) {
        this.drain.turnStartClock.enter("earlier_turn");
        this.drain.awaitingTurnEndSummary = true;
        try {
          await raceTeardown(r);
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
      let r = this.decideIdleReport() === "idle";
      if (r) this.io.sessionState.notifyStateChanged("idle");
      this.pushCost();
      for (let s of this.drainSdkEvents()) this.emit(s);
      if (r) this.startRecap();
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
      this.messageQueue.peek(isActiveMainAgentCommand) !== undefined
    ) {
      this.kick();
      return "rekicked";
    }
    return "released";
  }
}
//@ chunk-tyg7f3ek.js:131852-132099 placement
function heldUuidsAnsweredByTurn(e, n) {
  let r = trimTrailingAfterTurn(e, n);
  let s = new Set(r);
  let filtered = mergedMessageUuids(r, n).filter((S) => {
    let R = normalizeUuidOrNull(S);
    let w = R === null ? undefined : e[findMessageIndex(e, R)];
    return S === n || (R !== null && w !== undefined && s.has(w) && isTurnOpen(e, R) === false);
  });
  let userMessageUuids = buildRunningTurnRecord(n, filtered).fields()?.user_message_uuids;
  return userMessageUuids !== undefined && userMessageUuids.length > 1 ? userMessageUuids : undefined;
}
//@ chunk-tyg7f3ek.js:132099-132181 placement
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
//@ chunk-tyg7f3ek.js:132181-133163 placement
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
//@ chunk-tyg7f3ek.js:133163-137586 placement
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
  start(e) {
    if (this.#t !== undefined) return;
    this.#t = e;
    e.registry.onHostStatusChange((n) => {
      try {
        if (n.change !== "back" || !e.isEnabled()) return;
        if (!n.toldModel) {
          logFeatureSad("rtc_self_wake", "not_told");
          return;
        }
        let r = {
          answered: false,
          turnsStarted: e.turnsStarted(),
          at: e.now(),
          holding: false,
        };
        this.#e.set(n.name, r);
        e.schedule(() => {
          this.#s(e, n.name, r);
        }, HOST_RETURN_WAKE_RETENTION_MS);
      } catch (error) {
        logError(toError(error));
      }
    });
    e.lateOutcomes.onLastWordQueued((n) => {
      if (n !== undefined || !e.isEnabled()) return;
      this.#r = {
        turnsStarted: e.turnsStarted(),
      };
      for (let [r, s] of this.#e) if (s.holding) this.#s(e, r, s);
      this.#p(e);
    });
    e.messageQueue.subscribe(() => {
      try {
        for (let n of e.messageQueue.getCommandQueueSnapshot()) {
          if (this.#m.has(n)) continue;
          this.#m.add(n);
          if (!isHumanOrHandedOffTurn(n) || n.resumeReason !== undefined) continue;
          this.#o = 0;
          this.#u = e.now();
          let r =
            n.handedOffTurn === undefined
              ? n.receivedAtMs
              : n.handedOffTurn.requestedAtMs === undefined
                ? undefined
                : e.monotonicNow() - (e.now() - n.handedOffTurn.requestedAtMs);
          if (r !== undefined && r > this.#c) this.#i = false;
        }
      } catch (error) {
        logError(toError(error));
      }
    });
  }
  stopped() {
    let e = this.#t;
    if (e === undefined) return;
    try {
      this.#i = true;
      this.#c = e.monotonicNow();
      this.#a.abort();
      this.#a = new AbortController();
      let n = this.#e.size > 0 || this.#r !== undefined;
      this.#e.clear();
      this.#r = undefined;
      let r = e.messageQueue.removeByFilter(isHostReturnWake);
      if (n || r.length > 0) logFeatureSad("rtc_self_wake", "stopped");
    } catch (error) {
      logFeatureBad("rtc_self_wake", "threw");
      logError(toError(error));
    }
  }
  async #s(e, n, r) {
    try {
      if (this.#h(e, n, r)) return;
      let s = e.messageQueue.peek(isHostReturnWake) !== undefined;
      let h = HOST_RETURN_MIN_QUIET_MS - (e.now() - (this.#n.at(-1) ?? -1 / 0));
      if (!s && h > 0) {
        e.schedule(() => {
          this.#s(e, n, r);
        }, h);
        return;
      }
      if (!r.answered) {
        let S = await e.registry
          .entries()
          .find((R) => R.name === n)
          ?.transport.probeLive?.({
            signal: this.#a.signal,
          });
        if (this.#e.get(n) !== r) return;
        if (S !== true) {
          this.#e.delete(n);
          logFeatureSad("rtc_self_wake", S === false ? "host_away" : "probe_inconclusive");
          return;
        }
        r.answered = true;
        if (this.#h(e, n, r)) return;
        if (e.lateOutcomes.mainCallOpenOn(n)) e.askAboutGivenUpCalls(n);
      }
      if (e.messageQueue.peek(isHostReturnWake) !== undefined) return;
      let y = HOST_RETURN_LINGER_MS - (e.now() - r.at);
      if (y > 0 && this.#r === undefined && e.lateOutcomes.mainCallOpenOn(n)) {
        if (!r.holding) {
          r.holding = true;
          e.schedule(() => {
            r.holding = false;
            this.#s(e, n, r);
          }, y);
        }
        return;
      }
      r.holding = false;
      this.#g(e, MACHINE_REACHABLE_AGAIN_NOTE);
    } catch (error) {
      if (this.#e.get(n) === r) this.#e.delete(n);
      logFeatureBad("rtc_self_wake", "threw");
      logError(toError(error));
    }
  }
  #p(e) {
    try {
      let n = this.#r;
      if (n === undefined || e.messageQueue.peek(isHostReturnWake) !== undefined) return;
      let r = !e.isEnabled()
        ? "flag_off"
        : !e.lateOutcomes.lastWordWaitsForMain()
          ? "already_told"
          : (this.#l(e, n.turnsStarted) ?? (this.#d(e) ? "rate_limited" : undefined));
      if (r !== undefined) {
        this.#r = undefined;
        logFeatureSad("rtc_self_wake", r);
        return;
      }
      let s = HOST_RETURN_MIN_QUIET_MS - (e.now() - (this.#n.at(-1) ?? -1 / 0));
      if (s > 0) {
        e.schedule(() => this.#p(e), s);
        return;
      }
      this.#g(e, HOST_RETURN_CORRECTION_NOTE);
    } catch (error) {
      this.#r = undefined;
      logFeatureBad("rtc_self_wake", "threw");
      logError(toError(error));
    }
  }
  #g(e, summary) {
    this.#f = {
      at: e.now(),
      turnsStarted: e.turnsStarted(),
    };
    e.messageQueue.enqueuePendingNotification({
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
  #h(e, n, r) {
    if (this.#e.get(n) !== r) return true;
    if (!e.isEnabled()) {
      this.#e.delete(n);
      return true;
    }
    let h = !e.registry.entries().some((y) => y.name === n && y.status === "online")
      ? "host_away"
      : e.messageQueue.peek(isHostReturnWake) !== undefined
        ? undefined
        : !e.registry.backNotePending(n)
          ? "already_told"
          : (this.#l(e, r.turnsStarted) ?? (this.#d(e) ? "rate_limited" : undefined));
    if (h === undefined) return false;
    this.#e.delete(n);
    logFeatureSad("rtc_self_wake", h);
    return true;
  }
  lapsedAtTurnStart(e) {
    if (!isHostReturnWake(e)) return false;
    let n = this.#t;
    if (n === undefined) return true;
    try {
      let { at, turnsStarted } = this.#f;
      let h = this.#_(n);
      let y = h.some((P) => n.registry.backNotePending(P)) || n.lateOutcomes.lastWordWaitsForMain();
      let S = !n.isEnabled()
        ? "flag_off"
        : this.#u >= at
          ? "person_wrote"
          : n.now() - at > HOST_WAKE_STALE_MS
            ? "stale"
            : !y
              ? h.length === 0 && this.#r === undefined
                ? "host_away"
                : "already_told"
              : (this.#l(n, turnsStarted + 1) ?? (this.#d(n) ? "rate_limited" : undefined));
      this.#r = undefined;
      for (let [P, L] of this.#e)
        if (L.answered) this.#e.delete(P);
        else if (S !== undefined) L.turnsStarted++;
      if (S !== undefined) {
        logFeatureSad("rtc_self_wake", S);
        return true;
      }
      let R = n.now();
      let filtered = this.#n.filter((P) => R - P < HOST_SELF_WAKE_WINDOW_MS);
      filtered.push(R);
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
  #_(e) {
    let n = new Set(
      e.registry
        .entries()
        .filter((r) => r.status === "online")
        .map((r) => r.name),
    );
    return [...this.#e].filter(([r, s]) => s.answered && n.has(r)).map(([r]) => r);
  }
  #d(e) {
    let n = e.now();
    return (
      count(this.#n, (r) => n - r < HOST_SELF_WAKE_WINDOW_MS) >= HOST_SELF_WAKE_PER_DAY_CAP ||
      this.#o >= HOST_SELF_WAKE_TOTAL_CAP
    );
  }
  #l(e, n) {
    if (this.#i) return "stopped";
    if (e.turnsStarted() !== n) return "head_taken";
    if (e.permissionMode() !== "default") return "mode_blocked";
    return e.attestationKnownOff() ? undefined : "attestation_on_or_unknown";
  }
}
//@ chunk-tyg7f3ek.js:137586-137683 placement
function isHostReturnWake(e) {
  return e.origin?.kind === "task-notification" && e.origin.source === "host-return-wake";
}
//@ chunk-tyg7f3ek.js:137683-138038 placement
function startHostReturnWakes({ toolState, messageQueue, drain, permissionMode }) {
  toolState.get(HostReturnWakeTracker).start({
    registry: toolState.get(RemoteBackgroundCommands),
    lateOutcomes: toolState.get(RemoteCallLedger),
    askAboutGivenUpCalls: (h) => queryCallsGivenUpOnHost(toolState, h),
    messageQueue,
    isEnabled: isHandleReattachWakeEnabled,
    permissionMode,
    attestationKnownOff: isAttestationNotEnforced,
    turnsStarted: () => drain.dequeueCount,
    now: Date.now,
    monotonicNow: () => performance.now(),
    schedule: (h, y) => {
      setTimeout(h, y).unref();
    },
  });
}
//@ chunk-tyg7f3ek.js:138038-138080 placement
function isHumanOrHandedOffTurn(e) {
  return isHumanOrigin(e.origin) || isHandedOffPersonTurn(e);
}
//@ chunk-tyg7f3ek.js:138080-138204 placement
function isHandedOffPersonTurn(e) {
  let n = e.handedOffTurn?.kind === "run" ? e.handedOffTurn.messages[0] : undefined;
  return n?.type === "user" && isHumanOrigin(n.origin);
}
//@ chunk-tyg7f3ek.js:138204-138241 placement
var TURN_GATE_READY = Object.freeze({
  kind: "ready",
});
//@ chunk-tyg7f3ek.js:138241-138288 placement
class TurnRefusedError extends Error {
  name = "TurnRefusedError";
}
//@ chunk-tyg7f3ek.js:138288-138377 placement
var TURN_REFUSED_TEXT = "This session cannot continue: a required step before the turn did not complete.";
//@ chunk-tyg7f3ek.js:138377-138697 placement
function parseTurnGateAnswer(e) {
  if (typeof e !== "object" || e === null || !("kind" in e)) return;
  if (e.kind === "ready")
    return {
      answer: TURN_GATE_READY,
      malformed: false,
    };
  if (e.kind === "fail") {
    let message = "message" in e ? e.message : undefined;
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
//@ chunk-tyg7f3ek.js:138697-140123 placement
/**
 * 轮次开始前的参与者闸门：依次询问注册的 beforeTurn 参与者，任何一方失败则拒绝本轮（TurnRefusedError）。
 */
function createTurnGateParticipants() {
  let e = [];
  let n = 0;
  async function r(s, h) {
    let y = (answer) => ({
      participant: s.name,
      answer,
      settledAfterAbort: h.signal.aborted,
    });
    try {
      let turnGateAnswer = parseTurnGateAnswer(await s.beforeTurn(h));
      if (turnGateAnswer === undefined || turnGateAnswer.malformed) {
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `turn gate participant ${s.name} broke the answer contract`,
            "turn gate participant broke the answer contract",
          ),
        );
        logForDiagnosticsNoPII("error", "turn_gate_participant_broke_contract", {
          participant: s.name,
          turn: h.turn,
          reason: turnGateAnswer === undefined ? "malformed_answer" : "unworded_fail",
        });
      }
      return y(turnGateAnswer === undefined ? TURN_GATE_READY : turnGateAnswer.answer);
    } catch (error) {
      if (h.signal.aborted && isAbortError(error)) {
        logForDiagnosticsNoPII("debug", "turn_gate_participant_aborted", {
          participant: s.name,
          turn: h.turn,
        });
        return y(TURN_GATE_READY);
      }
      logError(error);
      logForDiagnosticsNoPII("error", "turn_gate_participant_rejected", {
        participant: s.name,
        turn: h.turn,
      });
      return y(TURN_GATE_READY);
    }
  }
  return {
    register(s) {
      e.push(s);
      if (n > 0)
        logForDiagnosticsNoPII("info", "turn_gate_late_registration", {
          participant: s.name,
          turn: n,
        });
    },
    beforeTurn(signal) {
      n += 1;
      if (e.length === 0) return null;
      let h = Object.freeze({
        signal,
        turn: n,
      });
      return Promise.all(e.map((y) => r(y, h))).then((y) => {
        let flattened = y.flatMap(({ participant, answer, settledAfterAbort }) =>
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
        let filtered = flattened.filter((L) => L.settledAfterAbort);
        if (filtered.length > 0)
          logForDiagnosticsNoPII("info", "turn_gate_refusal_after_abort", {
            participants: filtered.map((L) => L.participant),
            turn: h.turn,
          });
        let filtered_2 = flattened.filter((L) => !L.settledAfterAbort);
        let P = filtered_2[0];
        if (P === undefined) return TURN_GATE_READY;
        logForDiagnosticsNoPII("warn", "turn_gate_refused", {
          participants: filtered_2.map((L) => L.participant),
          turn: h.turn,
        });
        return {
          kind: "fail",
          message: P.message,
        };
      });
    },
  };
}
//@ chunk-tyg7f3ek.js:140123-145895 placement
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
      let e = this.drain.endSessionRequested
        ? this.startGate.takeHead(this.endSessionHead, () => this.messageQueue.dequeue(this.endSessionHead))
        : this.startGate.takeHead(
            (s) => isActiveMainAgentCommand(s) && !this.selector.holdsBack(s),
            () => this.selector.takeHead(),
          );
      if (e === undefined) {
        if (
          this.heldCompletionChars === 0 ||
          this.drain.endSessionRequested ||
          this.messageQueue.peek(isActiveMainAgentCommand) !== undefined
        )
          return;
        if (this.drain.abortController?.signal.aborted) {
          this.heldCompletionChars = 0;
          this.heldCompletionWorkload = undefined;
          return;
        }
        logFeatureSad("print_task_notification_coalesce", "owed_call_dispatched");
        e = {
          value: [],
          mode: "prompt",
          agentId: mainAgentId(),
          isMeta: true,
          skipSubmissionHooks: true,
          workload: this.heldCompletionWorkload,
          keepsDisallowedTools: true,
        };
        this.heldCompletionChars = 0;
        this.heldCompletionWorkload = undefined;
      }
      this.heads++;
      this.drain.dequeueCount++;
      if (this.repeatsUsageLimitAlert(e)) {
        logFeatureOk("usage_limit_denied_notice");
        e = usageLimitStandInMessage(e);
      }
      if (
        e.mode === "task-notification" &&
        typeof e.value === "string" &&
        !this.drain.endSessionRequested &&
        this.heldCompletionChars + e.value.length <= MAX_MERGED_PROMPTS &&
        this.coalesceTaskNotifications() &&
        this.selector.holdsQueryForFollower(e, (s) => this.startGate.admits(s), this.repeatsUsageLimitAlert)
      )
        e = {
          ...e,
          shouldQuery: false,
          queryHeldForNextTurn: true,
          stampThreadState: undefined,
        };
      this.drain.intentBatchInFlight = !this.commandLacksUserIntent(e);
      this.io.sessionState.notifyTurnStarting(e.mode, e.taskId);
      this.onHead?.(e);
      if (!isPromptCapableMode(e.mode, e.clientBashCommand))
        throw Error("only prompt commands are supported in streaming mode");
      let n = [e];
      if (e.mode === "prompt" && !this.drain.endSessionRequested) {
        n.push(...this.selector.takeFollowers(e, (h) => this.startGate.admits(h)));
        let filtered = n.filter(
          (h) => h.uuid !== undefined && this.messageQueue.consumeCancelPending(h.uuid),
        );
        if (filtered.length > 0) {
          this.revokeCodeliveredFollowups(filtered);
          for (let y of filtered) this.io.onCommandLifecycle?.(y.uuid, "cancelled");
          this.deliveryLedger.dropTaken(filtered.map((y) => y.uuid));
          let filtered_2 = n.filter((y) => !filtered.includes(y));
          if (filtered_2.length === 0) {
            this.prewaitLatch.reset();
            continue;
          }
          n.length = 0;
          n.push(...filtered_2);
          e = filtered_2[0];
        }
        if (this.headYields?.(e, "at_dequeue")) {
          n.shift();
          if (n.length === 0) continue;
          e = n[0];
        }
        if (n.length > 1) e = mergeQueuedPrompts(n);
      }
      let filtered = n.map((s) => s.uuid).filter((s) => s !== undefined);
      this.drain.pendingDispatchUuids = filtered;
      this.drain.pendingDispatchKeys = n.flatMap((s) => s.stopKey ?? []);
      this.drain.drainingHandoff = e.handedOffTurn && {
        command: e,
        running: false,
      };
      this.prewaitLatch.parkBatch(this.drain.intentBatchInFlight, n);
      if (n.length > 1) this.replayMerged?.(n, e);
      return {
        command: e,
        members: n,
        uuids: filtered,
      };
    }
    return;
  }
  commit(e) {
    let filtered = e.members.filter(
      (member) => member.uuid !== undefined && this.messageQueue.consumeCancelPending(member.uuid),
    );
    if (filtered.length > 0) {
      discardPollEvent(filtered.filter(isPollEventMode), "cancelled by the host");
      this.revokeCodeliveredFollowups(filtered);
      for (let h of filtered)
        if (!this.messageQueue.consumeCancelPendingAcked(h.uuid))
          this.io.onCommandLifecycle?.(h.uuid, "cancelled");
      this.deliveryLedger.dropTaken(filtered.map((h) => h.uuid));
      let filtered_2 = e.members.filter((member) => !filtered.includes(member));
      if (filtered_2.length === 0) {
        this.prewaitLatch.dropParkedBatch();
        return;
      }
      e.members.length = 0;
      e.members.push(...filtered_2);
      e.command = mergeQueuedPrompts(e.members);
      e.uuids.length = 0;
      e.uuids.push(...e.members.map((member) => member.uuid).filter((h) => h !== undefined));
    }
    let r = e.members[0];
    if (
      r !== undefined &&
      (this.drain.endSessionRequested ? isHostReturnWake(r) : this.headYields?.(r, "before_start") === true)
    ) {
      e.members.shift();
      e.uuids.length = 0;
      if (e.members.length === 0) {
        this.prewaitLatch.dropParkedBatch();
        return;
      }
      e.command = mergeQueuedPrompts(e.members);
      e.uuids.push(...e.members.map((member) => member.uuid).filter((s) => s !== undefined));
    }
    return e;
  }
  start(e) {
    this.deliveryLedger.startBatch(e.members);
    let { frameTiming, mode } = e.command;
    logForDiagnosticsNoPII("info", "cli_turn_started", () => ({
      uuid: matchRequestId(e.command.uuid),
      mode,
      batch_size: e.members.length,
      enqueue_to_start_ms: frameTiming && Date.now() - frameTiming.enqueuedWallMs,
    }));
    let s = e.command.mode === "poll-event" ? [...e.uuids] : [];
    if (e.command.mode === "poll-event") {
      settleDeliveredEvents(e.members);
      logFeatureOk("poll_event_delivery");
    }
    return s;
  }
  noteTurnEnded(e, n, r) {
    this.selector.noteTurnEnded(e);
    if (e || r.num_turns > 0) {
      if (!e && this.heldCompletionChars > 0) logFeatureOk("print_task_notification_coalesce");
      this.heldCompletionChars = 0;
      this.heldCompletionWorkload = undefined;
    } else if (n.queryHeldForNextTurn === true && typeof n.value === "string" && r.result === "") {
      this.heldCompletionChars += n.value.length;
      this.heldCompletionWorkload = n.workload;
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
  CostStatePusher,
  TurnGate,
  classifyTurnAbort,
  startHostReturnWakes,
  HostReturnWakeTracker,
  TURN_GATE_READY,
  TurnStartCoordinator,
  isHostReturnWake,
  TurnRefusedError,
  isHandedOffPersonTurn,
};

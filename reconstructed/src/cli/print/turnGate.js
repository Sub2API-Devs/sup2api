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
import { ge } from "../../utils/identity.js";
import { CostStateEntrySchema } from "../../utils/transcript/entryTypes.js";
import { safeParseJSON } from "../../utils/json.js";
import { getTotalCostUSD, getSessionId, getSideQueryCostUSD, mainAgentId } from "../../bootstrap/state.js";
import {
  setCostStateForRestore,
  ACe,
  getSessionUsageExcludingRestored,
  resetCostState,
} from "../../cost-tracker.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_STEADFAST_WREN } from "../../services/api/withRetry.js";
import { logError } from "../../utils/log.js";
import { sleep } from "../../utils/sleep.js";
import { im, d1r } from "../../utils/messageQueueManager.js";
import { trimTrailingAfterTurn, isTurnOpen } from "./transcriptChain.js";
import { mergedMessageUuids, findMessageIndex } from "./queuedMessageUtils.js";
import { Vt } from "../../utils/agentId.js";
import { buildRunningTurnRecord } from "./runningTurnRecord.js";
import { isRemoteToolForwardingEnabledCached } from "../../services/remoteTools/servingGates.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { gRs } from "../../services/remoteTools/machinesPrompt.js";
import { CWs } from "../remoteIO/fileStoreVerdicts.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { CommandQueueDrain } from "./commandQueueDrain.js";
import { rNn } from "./rewindStandIn.js";
import { MAX_MERGED_PROMPTS } from "./inboundMessages.js";
import { mergeQueuedPrompts } from "./userFrameIntake.js";
import { discardPollEvent, Kv, iCt } from "../../utils/pollEvents.js";
import { matchRequestId } from "../structuredIOProtocol.js";

//@ chunk-tyg7f3ek.js:127752-127990 placement
function classifyTurnAbort(e, n, r) {
  if (!(r.abortedAtResult ?? n.aborted)) return;
  let s = e.stopReachedTurn || (isCancelAbortReason(n.reason) && !e.sendNowCutTurn),
    h = e.sendNowCutTurn || unwrapAbortReason(n.reason) === "interrupt";
  return { by: s ? "stop" : h ? "send-now" : "other", sendRunsAgain: r.putBack.size > 0 };
}
//@ chunk-tyg7f3ek.js:127990-128041 placement
var BR = ge({ unread: !1 }, (e) => {
    e.unread = !1;
  }),
  pH = 16384;
//@ chunk-tyg7f3ek.js:128041-128088 placement
function HR(e) {
  return Buffer.byteLength(e) <= pH;
}
//@ chunk-tyg7f3ek.js:128088-128315 placement
function restoreCostState(e) {
  BR.unread = e?.readFailed === !0;
  let n = e?.internal?.cost_state;
  if (typeof n !== "string" || !HR(n)) return;
  let safeParse = CostStateEntrySchema().safeParse(safeParseJSON(n, !1));
  if (safeParse.success && safeParse.data.totalCostUSD >= getTotalCostUSD())
    setCostStateForRestore({ costState: { ...safeParse.data, sessionId: getSessionId() } });
}
//@ chunk-tyg7f3ek.js:128315-128991 placement
class CostStatePusher {
  io;
  lastPushedCostUsd = 0;
  lastSavedTotalCostUsd = getTotalCostUSD();
  constructor(e) {
    this.io = e;
  }
  pushIfChanged(e) {
    let n = ACe() + getSideQueryCostUSD(),
      r = getSessionUsageExcludingRestored(),
      s = n !== this.lastPushedCostUsd,
      h = getTotalCostUSD();
    if (!s && h === this.lastSavedTotalCostUsd) {
      if (e !== void 0) this.io.sessionState.notifyInternalMetadataChanged(e);
      return;
    }
    let y = BR.unread ? void 0 : resetCostState(),
      S = y && jsonStringify(y);
    (this.io.sessionState.notifyInternalMetadataChanged({
      ...e,
      ...(s && {
        cumulative_cost_usd: n,
        cumulative_input_tokens: r.inputTokens,
        cumulative_output_tokens: r.outputTokens,
        cumulative_cache_read_tokens: r.cacheReadInputTokens,
        cumulative_cache_write_tokens: r.cacheCreationInputTokens,
      }),
      cost_state: S && HR(S) ? S : void 0,
    }),
      (this.lastSavedTotalCostUsd = h),
      (this.lastPushedCostUsd = n));
  }
}
//@ chunk-tyg7f3ek.js:128991-129003 placement
var COST_PUSH_INTERVAL_MS = 5000;
/**
 * 轮次闸门：轮次开始前等待投递账本、拒绝重投、刷新转录与回执，处理 idle 释放与会话结束。
 */
//@ chunk-tyg7f3ek.js:129003-131852 placement
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
    drain: e,
    messageQueue: n,
    deliveryLedger: r,
    declinedRedeliveries: s,
    io: h,
    emit: y,
    drainSdkEvents: S,
    flushTranscript: R,
    flushAcks: w,
    stopping: P,
    idleRelease: L,
    kick: q,
    endSessionHead: x,
    reportContextUsage: G,
    decideIdleReport: Z,
    pushCost: re,
    startRecap: Ae,
    startStopRetirementDue: Ue,
    rearmNudge: ce,
  }) {
    ((this.drain = e),
      (this.messageQueue = n),
      (this.deliveryLedger = r),
      (this.declinedRedeliveries = s),
      (this.io = h),
      (this.emit = y),
      (this.drainSdkEvents = S),
      (this.flushTranscript = R),
      (this.flushAcks = w),
      (this.stopping = P),
      (this.idleRelease = L),
      (this.kick = q),
      (this.endSessionHead = x),
      (this.reportContextUsage = G),
      (this.decideIdleReport = Z),
      (this.pushCost = re),
      (this.startRecap = Ae),
      (this.startStopRetirementDue = Ue),
      (this.rearmNudge = ce));
  }
  settleBatch({ batch: e, deliveredPollBatchUuids: n, turnEnd: r, turnSignal: s }) {
    if (
      (this.deliveryLedger.settleBatch({
        batchUuids: e.uuids,
        deliveredPollBatchUuids: n,
        terminalReason: r.terminalReason,
        aborted: r.abortedAtResult ?? s.aborted,
      }),
      this.declinedRedeliveries.hasAny)
    ) {
      let h =
        r.compactions > 0 && r.result !== void 0 && shutdownInterruptStamp(s) !== !0
          ? e.members.find((member) => member.resumedTurnOpenerVouched === !0)?.resumedTurnUserMessageUuid
          : void 0;
      return this.declinedRedeliveries.ackAtBatchTerminal(
        h === void 0
          ? void 0
          : {
              opener: h,
              flag: getRemoteFeatureGateState(TENGU_STEADFAST_WREN),
              terminalReason: r.terminalReason,
              compactions: r.compactions,
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
  async release({ crashed: e, raceTeardown: n }) {
    if (
      (this.closeWhatNoRowVouchesFor(e),
      (this.drain.runPhase = "finally_flush"),
      await this.flushTranscript(),
      (this.drain.runPhase = "finally_post_flush"),
      !this.stopping())
    ) {
      await Promise.race([this.flushAcks(), sleep(COST_PUSH_INTERVAL_MS, void 0, { unref: !0 })]);
      let r = e || this.stopping() ? void 0 : this.io.sessionState.waitForTurnEndSummary();
      if (r !== void 0) {
        (this.drain.turnStartClock.enter("earlier_turn"), (this.drain.awaitingTurnEndSummary = !0));
        try {
          await n(r);
        } finally {
          this.drain.awaitingTurnEndSummary = !1;
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
    if (
      (this.closeWhatNoRowVouchesFor(e),
      (this.drain.running = !1),
      (this.drain.intentBatchInFlight = !1),
      this.idleRelease.start(),
      !this.stopping())
    )
      this.startStopRetirementDue();
    if (e) return "released";
    if (!this.stopping() && !this.drain.endSessionRequested)
      try {
        this.rearmNudge();
      } catch (error) {
        logError(error);
      }
    if (
      (!this.drain.endSessionRequested || this.messageQueue.peek(this.endSessionHead) !== void 0) &&
      this.messageQueue.peek(im) !== void 0
    )
      return (this.kick(), "rekicked");
    return "released";
  }
}
//@ chunk-tyg7f3ek.js:131852-132099 placement
function heldUuidsAnsweredByTurn(e, n) {
  let r = trimTrailingAfterTurn(e, n),
    s = new Set(r),
    filtered = mergedMessageUuids(r, n).filter((S) => {
      let R = Vt(S),
        w = R === null ? void 0 : e[findMessageIndex(e, R)];
      return S === n || (R !== null && w !== void 0 && s.has(w) && isTurnOpen(e, R) === !1);
    }),
    y = buildRunningTurnRecord(n, filtered).fields()?.user_message_uuids;
  return y !== void 0 && y.length > 1 ? y : void 0;
}
//@ chunk-tyg7f3ek.js:132099-132181 placement
function $R() {
  try {
    return (
      isRemoteToolForwardingEnabledCached() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_adjuster", !1) === !0
    );
  } catch {
    return !1;
  }
}
//@ chunk-tyg7f3ek.js:132181-133163 placement
var MACHINE_REACHABLE_AGAIN_NOTE =
    "A computer attached to this session is reachable again; the attached-machines note names it. Nobody typed this; it is not a request from the user. If work in this conversation was waiting on it, continue that work within what the user already asked for; anything that needed their go-ahead still does. If this turn's attached-machines note does not say a machine is reachable again, or nothing is waiting on it, say so in one short line and stop.",
  hH =
    "This session now knows what became of a command it had stopped waiting for on an attached computer; the correction note says what. Nobody typed this; it is not a request from the user. If work in this conversation was waiting on that command, continue it within what the user already asked for; anything that needed their go-ahead still does. If nothing is waiting on it, say so in one short line and stop.",
  _H = { kind: "task-notification", source: "host-return-wake" },
  yH = 1e4,
  KR = 60000,
  kH = 60000,
  wH = 600000,
  vH = 2,
  TH = 10,
  VR = 86400000;
/**
 * 跟踪附着机器离线/重新可达，在机器回来时向模型排入"主机返回唤醒"提示（task-notification/host-return-wake）。
 */
//@ chunk-tyg7f3ek.js:133163-137586 placement
class HostReturnWakeTracker {
  #t = void 0;
  #n = [];
  #o = 0;
  #u = -1 / 0;
  #i = !1;
  #c = -1 / 0;
  #m = new WeakSet();
  #e = new Map();
  #r = void 0;
  #f = { at: 0, turnsStarted: 0 };
  #a = new AbortController();
  start(e) {
    if (this.#t !== void 0) return;
    ((this.#t = e),
      e.registry.onHostStatusChange((n) => {
        try {
          if (n.change !== "back" || !e.isEnabled()) return;
          if (!n.toldModel) {
            logFeatureSad("rtc_self_wake", "not_told");
            return;
          }
          let r = { answered: !1, turnsStarted: e.turnsStarted(), at: e.now(), holding: !1 };
          (this.#e.set(n.name, r),
            e.schedule(() => {
              this.#s(e, n.name, r);
            }, yH));
        } catch (error) {
          logError(toError(error));
        }
      }),
      e.lateOutcomes.onLastWordQueued((n) => {
        if (n !== void 0 || !e.isEnabled()) return;
        this.#r = { turnsStarted: e.turnsStarted() };
        for (let [r, s] of this.#e) if (s.holding) this.#s(e, r, s);
        this.#p(e);
      }),
      e.messageQueue.subscribe(() => {
        try {
          for (let n of e.messageQueue.getCommandQueueSnapshot()) {
            if (this.#m.has(n)) continue;
            if ((this.#m.add(n), !RH(n) || n.resumeReason !== void 0)) continue;
            ((this.#o = 0), (this.#u = e.now()));
            let r =
              n.handedOffTurn === void 0
                ? n.receivedAtMs
                : n.handedOffTurn.requestedAtMs === void 0
                  ? void 0
                  : e.monotonicNow() - (e.now() - n.handedOffTurn.requestedAtMs);
            if (r !== void 0 && r > this.#c) this.#i = !1;
          }
        } catch (error) {
          logError(toError(error));
        }
      }));
  }
  stopped() {
    let e = this.#t;
    if (e === void 0) return;
    try {
      ((this.#i = !0), (this.#c = e.monotonicNow()), this.#a.abort(), (this.#a = new AbortController()));
      let n = this.#e.size > 0 || this.#r !== void 0;
      (this.#e.clear(), (this.#r = void 0));
      let removeByFilter = e.messageQueue.removeByFilter(isHostReturnWake);
      if (n || removeByFilter.length > 0) logFeatureSad("rtc_self_wake", "stopped");
    } catch (error) {
      (logFeatureBad("rtc_self_wake", "threw"), logError(toError(error)));
    }
  }
  async #s(e, n, r) {
    try {
      if (this.#h(e, n, r)) return;
      let s = e.messageQueue.peek(isHostReturnWake) !== void 0,
        h = KR - (e.now() - (this.#n.at(-1) ?? -1 / 0));
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
          ?.transport.probeLive?.({ signal: this.#a.signal });
        if (this.#e.get(n) !== r) return;
        if (S !== !0) {
          (this.#e.delete(n), logFeatureSad("rtc_self_wake", S === !1 ? "host_away" : "probe_inconclusive"));
          return;
        }
        if (((r.answered = !0), this.#h(e, n, r))) return;
        if (e.lateOutcomes.mainCallOpenOn(n)) e.askAboutGivenUpCalls(n);
      }
      if (e.messageQueue.peek(isHostReturnWake) !== void 0) return;
      let y = kH - (e.now() - r.at);
      if (y > 0 && this.#r === void 0 && e.lateOutcomes.mainCallOpenOn(n)) {
        if (!r.holding)
          ((r.holding = !0),
            e.schedule(() => {
              ((r.holding = !1), this.#s(e, n, r));
            }, y));
        return;
      }
      ((r.holding = !1), this.#g(e, MACHINE_REACHABLE_AGAIN_NOTE));
    } catch (error) {
      if (this.#e.get(n) === r) this.#e.delete(n);
      (logFeatureBad("rtc_self_wake", "threw"), logError(toError(error)));
    }
  }
  #p(e) {
    try {
      let n = this.#r;
      if (n === void 0 || e.messageQueue.peek(isHostReturnWake) !== void 0) return;
      let r = !e.isEnabled()
        ? "flag_off"
        : !e.lateOutcomes.lastWordWaitsForMain()
          ? "already_told"
          : (this.#l(e, n.turnsStarted) ?? (this.#d(e) ? "rate_limited" : void 0));
      if (r !== void 0) {
        ((this.#r = void 0), logFeatureSad("rtc_self_wake", r));
        return;
      }
      let s = KR - (e.now() - (this.#n.at(-1) ?? -1 / 0));
      if (s > 0) {
        e.schedule(() => this.#p(e), s);
        return;
      }
      this.#g(e, hH);
    } catch (error) {
      ((this.#r = void 0), logFeatureBad("rtc_self_wake", "threw"), logError(toError(error)));
    }
  }
  #g(e, n) {
    ((this.#f = { at: e.now(), turnsStarted: e.turnsStarted() }),
      e.messageQueue.enqueuePendingNotification({
        mode: "task-notification",
        priority: "later",
        agentId: mainAgentId(),
        isMeta: !0,
        skipAttachments: !0,
        origin: _H,
        value: formatTaskNotification({ summary: n }),
      }));
  }
  #h(e, n, r) {
    if (this.#e.get(n) !== r) return !0;
    if (!e.isEnabled()) return (this.#e.delete(n), !0);
    let h = !e.registry.entries().some((y) => y.name === n && y.status === "online")
      ? "host_away"
      : e.messageQueue.peek(isHostReturnWake) !== void 0
        ? void 0
        : !e.registry.backNotePending(n)
          ? "already_told"
          : (this.#l(e, r.turnsStarted) ?? (this.#d(e) ? "rate_limited" : void 0));
    if (h === void 0) return !1;
    return (this.#e.delete(n), logFeatureSad("rtc_self_wake", h), !0);
  }
  lapsedAtTurnStart(e) {
    if (!isHostReturnWake(e)) return !1;
    let n = this.#t;
    if (n === void 0) return !0;
    try {
      let { at: at, turnsStarted: turnsStarted } = this.#f,
        h = this.#_(n),
        y = h.some((P) => n.registry.backNotePending(P)) || n.lateOutcomes.lastWordWaitsForMain(),
        S = !n.isEnabled()
          ? "flag_off"
          : this.#u >= at
            ? "person_wrote"
            : n.now() - at > wH
              ? "stale"
              : !y
                ? h.length === 0 && this.#r === void 0
                  ? "host_away"
                  : "already_told"
                : (this.#l(n, turnsStarted + 1) ?? (this.#d(n) ? "rate_limited" : void 0));
      this.#r = void 0;
      for (let [P, L] of this.#e)
        if (L.answered) this.#e.delete(P);
        else if (S !== void 0) L.turnsStarted++;
      if (S !== void 0) return (logFeatureSad("rtc_self_wake", S), !0);
      let now = n.now(),
        filtered = this.#n.filter((P) => now - P < VR);
      return (filtered.push(now), (this.#n = filtered), this.#o++, logFeatureOk("rtc_self_wake"), !1);
    } catch (error) {
      return (logFeatureBad("rtc_self_wake", "threw"), logError(toError(error)), !0);
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
    let now = e.now();
    return count(this.#n, (r) => now - r < VR) >= TH || this.#o >= vH;
  }
  #l(e, n) {
    if (this.#i) return "stopped";
    if (e.turnsStarted() !== n) return "head_taken";
    if (e.permissionMode() !== "default") return "mode_blocked";
    return e.attestationKnownOff() ? void 0 : "attestation_on_or_unknown";
  }
}
//@ chunk-tyg7f3ek.js:137586-137683 placement
function isHostReturnWake(e) {
  return e.origin?.kind === "task-notification" && e.origin.source === "host-return-wake";
}
//@ chunk-tyg7f3ek.js:137683-138038 placement
function startHostReturnWakes({
  toolState: toolState,
  messageQueue: messageQueue,
  drain: drain,
  permissionMode: permissionMode,
}) {
  toolState.get(HostReturnWakeTracker).start({
    registry: toolState.get(RemoteBackgroundCommands),
    lateOutcomes: toolState.get(RemoteCallLedger),
    askAboutGivenUpCalls: (h) => gRs(toolState, h),
    messageQueue: messageQueue,
    isEnabled: $R,
    permissionMode: permissionMode,
    attestationKnownOff: CWs,
    turnsStarted: () => drain.dequeueCount,
    now: Date.now,
    monotonicNow: () => performance.now(),
    schedule: (h, y) => {
      setTimeout(h, y).unref();
    },
  });
}
//@ chunk-tyg7f3ek.js:138038-138080 placement
function RH(e) {
  return isHumanOrigin(e.origin) || isHandedOffPersonTurn(e);
}
//@ chunk-tyg7f3ek.js:138080-138204 placement
function isHandedOffPersonTurn(e) {
  let n = e.handedOffTurn?.kind === "run" ? e.handedOffTurn.messages[0] : void 0;
  return n?.type === "user" && isHumanOrigin(n.origin);
}
//@ chunk-tyg7f3ek.js:138204-138241 placement
var TURN_GATE_READY = Object.freeze({ kind: "ready" });
//@ chunk-tyg7f3ek.js:138241-138288 placement
class TurnRefusedError extends Error {
  name = "TurnRefusedError";
}
//@ chunk-tyg7f3ek.js:138288-138377 placement
var MH = "This session cannot continue: a required step before the turn did not complete.";
//@ chunk-tyg7f3ek.js:138377-138697 placement
function parseTurnGateAnswer(e) {
  if (typeof e !== "object" || e === null || !("kind" in e)) return;
  if (e.kind === "ready") return { answer: TURN_GATE_READY, malformed: !1 };
  if (e.kind === "fail") {
    let n = "message" in e ? e.message : void 0;
    return typeof n === "string" && n.trim() !== ""
      ? { answer: { kind: "fail", message: n }, malformed: !1 }
      : { answer: { kind: "fail", message: MH }, malformed: !0 };
  }
  return;
}
/**
 * 轮次开始前的参与者闸门：依次询问注册的 beforeTurn 参与者，任何一方失败则拒绝本轮（TurnRefusedError）。
 */
//@ chunk-tyg7f3ek.js:138697-140123 placement
function createTurnGateParticipants() {
  let e = [],
    n = 0;
  async function r(s, h) {
    let y = (S) => ({ participant: s.name, answer: S, settledAfterAbort: h.signal.aborted });
    try {
      let S = parseTurnGateAnswer(await s.beforeTurn(h));
      if (S === void 0 || S.malformed)
        (logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `turn gate participant ${s.name} broke the answer contract`,
            "turn gate participant broke the answer contract",
          ),
        ),
          logForDiagnosticsNoPII("error", "turn_gate_participant_broke_contract", {
            participant: s.name,
            turn: h.turn,
            reason: S === void 0 ? "malformed_answer" : "unworded_fail",
          }));
      return y(S === void 0 ? TURN_GATE_READY : S.answer);
    } catch (error) {
      if (h.signal.aborted && isAbortError(error))
        return (
          logForDiagnosticsNoPII("debug", "turn_gate_participant_aborted", {
            participant: s.name,
            turn: h.turn,
          }),
          y(TURN_GATE_READY)
        );
      return (
        logError(error),
        logForDiagnosticsNoPII("error", "turn_gate_participant_rejected", {
          participant: s.name,
          turn: h.turn,
        }),
        y(TURN_GATE_READY)
      );
    }
  }
  return {
    register(s) {
      if ((e.push(s), n > 0))
        logForDiagnosticsNoPII("info", "turn_gate_late_registration", { participant: s.name, turn: n });
    },
    beforeTurn(s) {
      if (((n += 1), e.length === 0)) return null;
      let freeze = Object.freeze({ signal: s, turn: n });
      return Promise.all(e.map((y) => r(y, freeze))).then((y) => {
        let flattened = y.flatMap(
            ({ participant: participant, answer: answer, settledAfterAbort: settledAfterAbort }) =>
              answer.kind === "fail"
                ? [
                    {
                      participant: participant,
                      message: answer.message,
                      settledAfterAbort: settledAfterAbort,
                    },
                  ]
                : [],
          ),
          filtered = flattened.filter((L) => L.settledAfterAbort);
        if (filtered.length > 0)
          logForDiagnosticsNoPII("info", "turn_gate_refusal_after_abort", {
            participants: filtered.map((L) => L.participant),
            turn: freeze.turn,
          });
        let filtered_2 = flattened.filter((L) => !L.settledAfterAbort),
          P = filtered_2[0];
        if (P === void 0) return TURN_GATE_READY;
        return (
          logForDiagnosticsNoPII("warn", "turn_gate_refused", {
            participants: filtered_2.map((L) => L.participant),
            turn: freeze.turn,
          }),
          { kind: "fail", message: P.message }
        );
      });
    },
  };
}
/**
 * 协调轮次开始：等待队首、合并重放、处理延迟工具调用与 startGate，然后交给 TurnDispatcher。
 */
//@ chunk-tyg7f3ek.js:140123-145895 placement
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
    messageQueue: e,
    drain: n,
    prewaitLatch: r,
    deliveryLedger: s,
    io: h,
    commandLacksUserIntent: y,
    revokeCodeliveredFollowups: S,
    stopping: R,
    endSessionHead: w,
    startGate: P,
    onHead: L,
    replayMerged: q,
    deferredToolUsePending: x,
    holdsEvalSettles: G,
    coalesceTaskNotifications: Z,
    repeatsUsageLimitAlert: re,
    headYields: Ae,
  }) {
    ((this.messageQueue = e),
      (this.drain = n),
      (this.prewaitLatch = r),
      (this.deliveryLedger = s),
      (this.io = h),
      (this.commandLacksUserIntent = y),
      (this.revokeCodeliveredFollowups = S),
      (this.stopping = R),
      (this.endSessionHead = w),
      (this.startGate = P),
      (this.onHead = L),
      (this.replayMerged = q),
      (this.deferredToolUsePending = x),
      (this.holdsEvalSettles = G),
      (this.coalesceTaskNotifications = Z),
      (this.repeatsUsageLimitAlert = re),
      (this.headYields = Ae),
      (this.selector = new CommandQueueDrain({
        messageQueue: e,
        prewaitLatch: r,
        deferredToolUsePending: x,
        holdsEvalSettles: G,
      })));
  }
  get commandsProcessed() {
    return this.heads;
  }
  take() {
    while (!this.stopping()) {
      let e = this.drain.endSessionRequested
        ? this.startGate.takeHead(this.endSessionHead, () => this.messageQueue.dequeue(this.endSessionHead))
        : this.startGate.takeHead(
            (s) => im(s) && !this.selector.holdsBack(s),
            () => this.selector.takeHead(),
          );
      if (e === void 0) {
        if (
          this.heldCompletionChars === 0 ||
          this.drain.endSessionRequested ||
          this.messageQueue.peek(im) !== void 0
        )
          return;
        if (this.drain.abortController?.signal.aborted) {
          ((this.heldCompletionChars = 0), (this.heldCompletionWorkload = void 0));
          return;
        }
        (logFeatureSad("print_task_notification_coalesce", "owed_call_dispatched"),
          (e = {
            value: [],
            mode: "prompt",
            agentId: mainAgentId(),
            isMeta: !0,
            skipSubmissionHooks: !0,
            workload: this.heldCompletionWorkload,
            keepsDisallowedTools: !0,
          }),
          (this.heldCompletionChars = 0),
          (this.heldCompletionWorkload = void 0));
      }
      if ((this.heads++, this.drain.dequeueCount++, this.repeatsUsageLimitAlert(e)))
        (logFeatureOk("usage_limit_denied_notice"), (e = rNn(e)));
      if (
        e.mode === "task-notification" &&
        typeof e.value === "string" &&
        !this.drain.endSessionRequested &&
        this.heldCompletionChars + e.value.length <= MAX_MERGED_PROMPTS &&
        this.coalesceTaskNotifications() &&
        this.selector.holdsQueryForFollower(e, (s) => this.startGate.admits(s), this.repeatsUsageLimitAlert)
      )
        e = { ...e, shouldQuery: !1, queryHeldForNextTurn: !0, stampThreadState: void 0 };
      if (
        ((this.drain.intentBatchInFlight = !this.commandLacksUserIntent(e)),
        this.io.sessionState.notifyTurnStarting(e.mode, e.taskId),
        this.onHead?.(e),
        !d1r(e.mode, e.clientBashCommand))
      )
        throw Error("only prompt commands are supported in streaming mode");
      let n = [e];
      if (e.mode === "prompt" && !this.drain.endSessionRequested) {
        n.push(...this.selector.takeFollowers(e, (h) => this.startGate.admits(h)));
        let filtered = n.filter((h) => h.uuid !== void 0 && this.messageQueue.consumeCancelPending(h.uuid));
        if (filtered.length > 0) {
          this.revokeCodeliveredFollowups(filtered);
          for (let y of filtered) this.io.onCommandLifecycle?.(y.uuid, "cancelled");
          this.deliveryLedger.dropTaken(filtered.map((y) => y.uuid));
          let filtered_2 = n.filter((y) => !filtered.includes(y));
          if (filtered_2.length === 0) {
            this.prewaitLatch.reset();
            continue;
          }
          ((n.length = 0), n.push(...filtered_2), (e = filtered_2[0]));
        }
        if (this.headYields?.(e, "at_dequeue")) {
          if ((n.shift(), n.length === 0)) continue;
          e = n[0];
        }
        if (n.length > 1) e = mergeQueuedPrompts(n);
      }
      let filtered = n.map((s) => s.uuid).filter((s) => s !== void 0);
      if (
        ((this.drain.pendingDispatchUuids = filtered),
        (this.drain.pendingDispatchKeys = n.flatMap((s) => s.stopKey ?? [])),
        (this.drain.drainingHandoff = e.handedOffTurn && { command: e, running: !1 }),
        this.prewaitLatch.parkBatch(this.drain.intentBatchInFlight, n),
        n.length > 1)
      )
        this.replayMerged?.(n, e);
      return { command: e, members: n, uuids: filtered };
    }
    return;
  }
  commit(e) {
    let filtered = e.members.filter(
      (member) => member.uuid !== void 0 && this.messageQueue.consumeCancelPending(member.uuid),
    );
    if (filtered.length > 0) {
      (discardPollEvent(filtered.filter(Kv), "cancelled by the host"),
        this.revokeCodeliveredFollowups(filtered));
      for (let h of filtered)
        if (!this.messageQueue.consumeCancelPendingAcked(h.uuid))
          this.io.onCommandLifecycle?.(h.uuid, "cancelled");
      this.deliveryLedger.dropTaken(filtered.map((h) => h.uuid));
      let filtered_2 = e.members.filter((member) => !filtered.includes(member));
      if (filtered_2.length === 0) {
        this.prewaitLatch.dropParkedBatch();
        return;
      }
      ((e.members.length = 0),
        e.members.push(...filtered_2),
        (e.command = mergeQueuedPrompts(e.members)),
        (e.uuids.length = 0),
        e.uuids.push(...e.members.map((member) => member.uuid).filter((h) => h !== void 0)));
    }
    let r = e.members[0];
    if (
      r !== void 0 &&
      (this.drain.endSessionRequested ? isHostReturnWake(r) : this.headYields?.(r, "before_start") === !0)
    ) {
      if ((e.members.shift(), (e.uuids.length = 0), e.members.length === 0)) {
        this.prewaitLatch.dropParkedBatch();
        return;
      }
      ((e.command = mergeQueuedPrompts(e.members)),
        e.uuids.push(...e.members.map((member) => member.uuid).filter((s) => s !== void 0)));
    }
    return e;
  }
  start(e) {
    this.deliveryLedger.startBatch(e.members);
    let { frameTiming: frameTiming, mode: mode } = e.command;
    logForDiagnosticsNoPII("info", "cli_turn_started", () => ({
      uuid: matchRequestId(e.command.uuid),
      mode: mode,
      batch_size: e.members.length,
      enqueue_to_start_ms: frameTiming && Date.now() - frameTiming.enqueuedWallMs,
    }));
    let s = e.command.mode === "poll-event" ? [...e.uuids] : [];
    if (e.command.mode === "poll-event") (iCt(e.members), logFeatureOk("poll_event_delivery"));
    return s;
  }
  noteTurnEnded(e, n, r) {
    if ((this.selector.noteTurnEnded(e), e || r.num_turns > 0)) {
      if (!e && this.heldCompletionChars > 0) logFeatureOk("print_task_notification_coalesce");
      ((this.heldCompletionChars = 0), (this.heldCompletionWorkload = void 0));
    } else if (n.queryHeldForNextTurn === !0 && typeof n.value === "string" && r.result === "")
      ((this.heldCompletionChars += n.value.length), (this.heldCompletionWorkload = n.workload));
  }
  exit() {
    if (
      ((this.drain.pendingDispatchUuids = []),
      (this.drain.pendingDispatchKeys = []),
      (this.drain.intentBatchInFlight = !1),
      (this.drain.drainingHandoff = void 0),
      (this.drain.turnUnderWay = !1),
      this.prewaitLatch.dropParkedBatch(),
      this.stopping() || this.drain.endSessionRequested)
    )
      ((this.heldCompletionChars = 0), (this.heldCompletionWorkload = void 0));
    (this.messageQueue.setTurnStartFoldTarget(void 0),
      (this.selector = new CommandQueueDrain({
        messageQueue: this.messageQueue,
        prewaitLatch: this.prewaitLatch,
        deferredToolUsePending: this.deferredToolUsePending,
        holdsEvalSettles: this.holdsEvalSettles,
      })));
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

/**
 * cli/print/runEndReasons.ts
 *
 * 2.1.316 新增：运行结束原因（单次运行限额、预等待闩锁、立即中断）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (9)
 * attribution: placement 9
 */
import { lp } from "../../plugins/functionHooks/surfaceBinding.js";
import { lhn, dhn, chn, oO, $f } from "../../utils/messageQueueManager.js";
import { q$o, countHeldCommands } from "../../plugins/functionHooks/inputHold.js";
import { rmo, tmo, nmo, cancelQueuedAutoInputs } from "./setModelControl.js";
import { Ixo } from "../../query/turnHooks.js";
import { Km } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import { isHandedOffPersonTurn } from "./turnGate.js";
import { notePromptOrigin } from "../../utils/processUserInput/promptOrigin.js";
import { count } from "../../utils/collections.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { uN } from "../../cost-tracker.js";
import { isHandedOffBatch, batchUuids, isResumedTurnBatch } from "./userFrameIntake.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { userAbortReason } from "../../utils/abortController.js";

/**
 * print 一次性运行的结束原因跟踪：宿主结束输入、--max-budget-usd、--max-turns 等。
 */
//@ chunk-tyg7f3ek.js:303151-305608 placement
class OneShotRunLimits {
  limits;
  seatedIn = lp();
  turns = 0;
  asks = 0;
  isHostHeard = !1;
  isHostsOwnTurn = !1;
  isOneShotShape;
  unwatch = lhn.subscribe((e) => this.tookIn(e));
  constructor(e) {
    this.limits = e;
    (q$o.set(() => this.reached()),
      rmo.set(() => this.taken()),
      tmo.set(() => this.giveBackHeld()),
      Ixo.set(() => this.spawnedTurnTaken()),
      dhn.set(nmo),
      chn.set(countHeldCommands));
  }
  turnStarted(e) {
    Km(() => {
      ((this.isHostsOwnTurn = e.some(um)), this.tally(e));
      let n = this.limits.drain.abortController?.signal.aborted === !0;
      e.filter(isHandedOffPersonTurn).forEach((r) => {
        let s = r.handedOffTurn?.messages[0]?.uuid;
        notePromptOrigin({
          uuid: s,
          origin: void 0,
          isHidden: !1,
          isStopped: n,
          isRelayed: !1,
          foreignWord: void 0,
          ownWordUuids: [s],
          input: "",
        });
      });
    });
  }
  tookIn(e) {
    Km(() => {
      if (lp() !== this.seatedIn) {
        this.unwatch();
        return;
      }
      ((this.isHostsOwnTurn ||= e.some(um)),
        this.tally(e),
        e
          .filter(eS)
          .forEach((r) =>
            notePromptOrigin({
              uuid: r.uuid,
              origin: r.origin,
              isHidden: r.isMeta === !0,
              isStopped: !1,
              isRelayed: !1,
              foreignWord: void 0,
              ownWordUuids: [r.uuid ?? r.stopKey],
              input: r.value,
            }),
          ));
    });
  }
  turnEnded(e) {
    Km(() => {
      ((this.isOneShotShape ??= this.isHostsOwnTurn ? this.limits.drain.inputClosed : void 0),
        (this.turns += e.num_turns));
      let n = (this.spent() ?? this.inputOver()) !== void 0;
      if (((this.isHostsOwnTurn = !1), n)) cancelQueuedAutoInputs({ turnGoesOn: !0 });
    });
  }
  spawnedTurnTaken() {
    Km(() => {
      let e = lp() === this.seatedIn;
      if (((this.turns += e ? 1 : 0), this.spent() !== void 0)) cancelQueuedAutoInputs({ turnGoesOn: !0 });
    });
  }
  tally(e) {
    if (
      ((this.asks += count(e, Zy)),
      (this.isHostHeard ||= e.some(um)),
      e.some(eS) || e.some(isHandedOffPersonTurn))
    )
      this.turns = 0;
  }
  reached() {
    try {
      return lp() === this.seatedIn ? (this.inputOver() ?? this.spent()) : void 0;
    } catch (error) {
      if (!isAbortError(error)) logError(error);
      return;
    }
  }
  taken() {
    let { drain: drain, frameIntake: frameIntake, declinedRedeliveries: declinedRedeliveries } = this.limits,
      s = lp() === this.seatedIn,
      flattened = frameIntake.parkedCommands().flatMap((R) => R.stopKey ?? []),
      { drainingHandoff: drainingHandoff } = drain,
      S =
        drainingHandoff?.running === !1
          ? (drainingHandoff.command.handedOffTurn?.messages[0]?.uuid ?? [])
          : [];
    return s
      ? [
          ...frameIntake.parkedUuids(),
          ...flattened,
          ...drain.pendingDispatchUuids,
          ...drain.pendingDispatchKeys,
          ...declinedRedeliveries.heldBack,
          ...[S].flat(),
        ]
      : [];
  }
  inputOver() {
    let {
        inputClosed: inputClosed,
        endSessionRequested: endSessionRequested,
        turnUnderWay: turnUnderWay,
      } = this.limits.drain,
      s = [...this.limits.frameIntake.parkedCommands(), ...oO()],
      h = this.asks + count(s, Zy),
      y = this.isHostHeard || s.some(um),
      S = this.limits.isRemoteInput() ? this.isOneShotShape === !1 : h >= iq,
      R = s.some(um) || (turnUnderWay && this.isHostsOwnTurn);
    return endSessionRequested || (this.limits.endsItsInput && inputClosed && (!y || S) && !R)
      ? "the host has ended its input"
      : void 0;
  }
  giveBackHeld() {
    if (lp() === this.seatedIn) this.limits.held.giveBack();
  }
  spent() {
    let { maxTurns: maxTurns, maxBudgetUsd: maxBudgetUsd } = this.limits,
      r = maxTurns !== void 0 && maxTurns > 0 && this.turns >= maxTurns;
    return uN(maxBudgetUsd)
      ? "the run is past its --max-budget-usd limit"
      : r
        ? "the run reached its --max-turns limit"
        : void 0;
  }
}
//@ chunk-tyg7f3ek.js:305608-305617 placement
var iq = 2;
//@ chunk-tyg7f3ek.js:305617-305656 placement
function Zy(e) {
  return e.hostAsked === !0;
}
//@ chunk-tyg7f3ek.js:305656-305693 placement
function eS(e) {
  return e.ownWord === !0;
}
//@ chunk-tyg7f3ek.js:305693-305728 placement
function um(e) {
  return Zy(e) || eS(e);
}
//@ chunk-tyg7f3ek.js:305728-305774 placement
function isAimedAtTurn(e, n) {
  return isHandedOffBatch(n) || e.names(batchUuids(n));
}
//@ chunk-tyg7f3ek.js:305774-305814 placement
function MM(e, n) {
  return isAimedAtTurn(e, n) || !isResumedTurnBatch(n);
}
/**
 * print 主循环的"预等待门闩"：在轮次开始前暂存意图批次、处理打断/停止与待答权限。
 */
//@ chunk-tyg7f3ek.js:305814-309435 placement
class PrewaitLatch {
  interruptBeforeTurnArmed = !1;
  intentDispatchPendingPreArm = !1;
  parkedBatch = [];
  latchDoomedCommands = null;
  latchedWhileBatchParked = !1;
  doomedOnlyAsWork = new Set();
  answersToStartAborted = new WeakSet();
  messageQueue;
  commandLacksUserIntent;
  unsubscribeRemovals;
  constructor({ messageQueue: e, commandLacksUserIntent: n }) {
    ((this.messageQueue = e),
      (this.commandLacksUserIntent = n),
      (this.unsubscribeRemovals = e.subscribeToRemovals(() => this.clearIfNothingPending())));
  }
  interruptBeforeArm(e) {
    if (e !== void 0) return this.latchForWorkReachedBy(e);
    if (!(
      this.intentDispatchPendingPreArm ||
      this.messageQueue.getCommandQueue().some((n) => this.isUserIntent(n))
    ))
      return !1;
    return (
      (this.interruptBeforeTurnArmed = !0),
      (this.latchedWhileBatchParked = this.intentDispatchPendingPreArm),
      this.doomedOnlyAsWork.clear(),
      (this.latchDoomedCommands = new WeakSet(
        this.messageQueue.getCommandQueue().filter((n) => this.isUserIntent(n)),
      )),
      !0
    );
  }
  latchForWorkReachedBy(e) {
    let n = this.intentDispatchPendingPreArm && MM(e, this.parkedBatch),
      filtered = this.messageQueue.getCommandQueue().filter((s) => this.isUserIntent(s) && MM(e, [s]));
    if (!n && filtered.length === 0) return !1;
    ((this.interruptBeforeTurnArmed = !0),
      (this.latchedWhileBatchParked ||= n),
      (this.latchDoomedCommands ??= new WeakSet()));
    for (let s of filtered) {
      if (isAimedAtTurn(e, [s])) this.doomedOnlyAsWork.delete(s);
      else if (!this.latchDoomedCommands.has(s)) this.doomedOnlyAsWork.add(s);
      this.latchDoomedCommands.add(s);
    }
    return !0;
  }
  startAborted(e) {
    for (let n of e) this.answersToStartAborted.add(n);
  }
  startQueuedMessageAborted(e) {
    this.startAborted(
      [...this.messageQueue.getCommandQueue(), ...this.parkedBatch].filter((n) => n.uuid === e),
    );
  }
  pendingAnswersFor(e, n) {
    return [
      ...this.parkedIntentBatch(),
      ...(n ? [] : this.messageQueue.getCommandQueue().filter((r) => this.isUserIntent(r))),
    ].filter((r) => r.orphanedPermission !== void 0 && (e === void 0 || isAimedAtTurn(e, [r])));
  }
  namesQueuedWork(e) {
    return this.messageQueue.getCommandQueue().some((n) => this.isUserIntent(n) && isAimedAtTurn(e, [n]));
  }
  get stopLatched() {
    return this.interruptBeforeTurnArmed;
  }
  isDoomBoundary(e, n) {
    return (
      this.answersToStartAborted.has(e) !== this.answersToStartAborted.has(n) ||
      (this.interruptBeforeTurnArmed &&
        this.latchDoomedCommands !== null &&
        this.latchDoomedCommands.has(e) !== this.latchDoomedCommands.has(n))
    );
  }
  parkBatch(e, n) {
    ((this.intentDispatchPendingPreArm = e), (this.parkedBatch = n));
  }
  parkedBatchStartsAborted() {
    return (
      this.intentDispatchPendingPreArm &&
      ((this.interruptBeforeTurnArmed &&
        (this.latchedWhileBatchParked ||
          this.parkedBatch.some((e) => this.latchDoomedCommands?.has(e) ?? !1))) ||
        this.parkedBatch.some((e) => this.answersToStartAborted.has(e)))
    );
  }
  parkedMembers() {
    return this.parkedBatch;
  }
  parkedIntentBatch() {
    return this.intentDispatchPendingPreArm ? this.parkedBatch : [];
  }
  dropParkedBatch() {
    (this.reset(), (this.intentDispatchPendingPreArm = !1), (this.parkedBatch = []));
  }
  consumeAtArm(e, n) {
    let any = e.some((s) => this.answersToStartAborted.has(s));
    return this.consumeLatchAtArm(e, n) || (n && any);
  }
  consumeLatchAtArm(e, n) {
    if (
      ((this.intentDispatchPendingPreArm = !1),
      (this.parkedBatch = []),
      this.interruptBeforeTurnArmed &&
        n &&
        (this.latchedWhileBatchParked || e.some((r) => this.latchDoomedCommands?.has(r) ?? !1)))
    )
      return (this.reset(), !0);
    if (this.doomedOnlyAsWork.size > 0 && n && isResumedTurnBatch(e)) {
      for (let r of this.doomedOnlyAsWork) this.latchDoomedCommands?.delete(r);
      this.doomedOnlyAsWork.clear();
    }
    return !1;
  }
  reset() {
    ((this.interruptBeforeTurnArmed = !1),
      (this.latchDoomedCommands = null),
      (this.latchedWhileBatchParked = !1),
      this.doomedOnlyAsWork.clear());
  }
  clearIfNothingPending() {
    let latchDoomedCommands = this.latchDoomedCommands;
    if (
      this.interruptBeforeTurnArmed &&
      !this.intentDispatchPendingPreArm &&
      !(
        latchDoomedCommands !== null &&
        this.messageQueue.getCommandQueue().some((n) => latchDoomedCommands.has(n) && this.isUserIntent(n))
      )
    )
      this.reset();
  }
  dispose() {
    this.unsubscribeRemovals();
  }
  isUserIntent(e) {
    return $f(e) && !this.commandLacksUserIntent(e);
  }
}
//@ chunk-tyg7f3ek.js:309435-309636 placement
function interruptOnNowPriority({ messageQueue: messageQueue, drain: drain }) {
  return messageQueue.subscribe(() => {
    if (
      drain.abortController &&
      !drain.endSessionRequested &&
      !isTerminalShutdown() &&
      messageQueue.getCommandsByMaxPriority("now").length > 0
    )
      drain.abortController.abort(userAbortReason("interrupt"));
  });
}

export { PrewaitLatch, interruptOnNowPriority, OneShotRunLimits, isAimedAtTurn };

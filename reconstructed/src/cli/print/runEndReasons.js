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
import { currentSurfaceBinding } from "../../plugins/functionHooks/surfaceBinding.js";
import {
  commandsConsumedSignal,
  receiptQueuedProbe,
  inFlightDrainProbe,
  getCommandQueue,
  isMainAgentCommand,
} from "../../utils/messageQueueManager.js";
import { holdReasonSlot, countHeldCommands } from "../../plugins/functionHooks/inputHold.js";
import {
  CANCELLED_COMMAND_STATE,
  MODEL_SWITCH_STATE_CLEARER,
  cancelQueuedAutoInput,
  cancelQueuedAutoInputs,
} from "./setModelControl.js";
import { turnStepSlot } from "../../query/turnHooks.js";
import { runIgnoringAbort } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import { isHandedOffPersonTurn } from "./turnGate.js";
import { notePromptOrigin } from "../../utils/processUserInput/promptOrigin.js";
import { count } from "../../utils/collections.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { hasReachedBudget } from "../../cost-tracker.js";
import { isHandedOffBatch, batchUuids, isResumedTurnBatch } from "./userFrameIntake.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { userAbortReason } from "../../utils/abortController.js";

//@ chunk-tyg7f3ek.js:303151-305608 placement
/**
 * print 一次性运行的结束原因跟踪：宿主结束输入、--max-budget-usd、--max-turns 等。
 */
class OneShotRunLimits {
  limits;
  seatedIn = currentSurfaceBinding();
  turns = 0;
  asks = 0;
  isHostHeard = false;
  isHostsOwnTurn = false;
  isOneShotShape;
  unwatch = commandsConsumedSignal.subscribe((e) => this.tookIn(e));
  constructor(limits) {
    this.limits = limits;
    holdReasonSlot.set(() => this.reached());
    CANCELLED_COMMAND_STATE.set(() => this.taken());
    MODEL_SWITCH_STATE_CLEARER.set(() => this.giveBackHeld());
    turnStepSlot.set(() => this.spawnedTurnTaken());
    receiptQueuedProbe.set(cancelQueuedAutoInput);
    inFlightDrainProbe.set(countHeldCommands);
  }
  turnStarted(e) {
    runIgnoringAbort(() => {
      this.isHostsOwnTurn = e.some(isHostRelevantTurn);
      this.tally(e);
      let isStopped = this.limits.drain.abortController?.signal.aborted === true;
      e.filter(isHandedOffPersonTurn).forEach((r) => {
        let uuid = r.handedOffTurn?.messages[0]?.uuid;
        notePromptOrigin({
          uuid,
          origin: undefined,
          isHidden: false,
          isStopped,
          isRelayed: false,
          foreignWord: undefined,
          ownWordUuids: [uuid],
          input: "",
        });
      });
    });
  }
  tookIn(e) {
    runIgnoringAbort(() => {
      if (currentSurfaceBinding() !== this.seatedIn) {
        this.unwatch();
        return;
      }
      this.isHostsOwnTurn ||= e.some(isHostRelevantTurn);
      this.tally(e);
      e.filter(isOwnWordTurn).forEach((r) =>
        notePromptOrigin({
          uuid: r.uuid,
          origin: r.origin,
          isHidden: r.isMeta === true,
          isStopped: false,
          isRelayed: false,
          foreignWord: undefined,
          ownWordUuids: [r.uuid ?? r.stopKey],
          input: r.value,
        }),
      );
    });
  }
  turnEnded(e) {
    runIgnoringAbort(() => {
      this.isOneShotShape ??= this.isHostsOwnTurn ? this.limits.drain.inputClosed : undefined;
      this.turns += e.num_turns;
      let n = (this.spent() ?? this.inputOver()) !== undefined;
      this.isHostsOwnTurn = false;
      if (n)
        cancelQueuedAutoInputs({
          turnGoesOn: true,
        });
    });
  }
  spawnedTurnTaken() {
    runIgnoringAbort(() => {
      let e = currentSurfaceBinding() === this.seatedIn;
      this.turns += e ? 1 : 0;
      if (this.spent() !== undefined)
        cancelQueuedAutoInputs({
          turnGoesOn: true,
        });
    });
  }
  tally(e) {
    this.asks += count(e, isHostAskedTurn);
    this.isHostHeard ||= e.some(isHostRelevantTurn);
    if (e.some(isOwnWordTurn) || e.some(isHandedOffPersonTurn)) this.turns = 0;
  }
  reached() {
    try {
      return currentSurfaceBinding() === this.seatedIn ? (this.inputOver() ?? this.spent()) : undefined;
    } catch (error) {
      if (!isAbortError(error)) logError(error);
      return;
    }
  }
  taken() {
    let { drain, frameIntake, declinedRedeliveries } = this.limits;
    let s = currentSurfaceBinding() === this.seatedIn;
    let flattened = frameIntake.parkedCommands().flatMap((R) => R.stopKey ?? []);
    let { drainingHandoff } = drain;
    let S =
      drainingHandoff?.running === false
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
    let { inputClosed, endSessionRequested, turnUnderWay } = this.limits.drain;
    let s = [...this.limits.frameIntake.parkedCommands(), ...getCommandQueue()];
    let h = this.asks + count(s, isHostAskedTurn);
    let y = this.isHostHeard || s.some(isHostRelevantTurn);
    let S = this.limits.isRemoteInput() ? this.isOneShotShape === false : h >= MIN_REMOTE_INPUT_MESSAGES;
    let R = s.some(isHostRelevantTurn) || (turnUnderWay && this.isHostsOwnTurn);
    return endSessionRequested || (this.limits.endsItsInput && inputClosed && (!y || S) && !R)
      ? "the host has ended its input"
      : undefined;
  }
  giveBackHeld() {
    if (currentSurfaceBinding() === this.seatedIn) this.limits.held.giveBack();
  }
  spent() {
    let { maxTurns, maxBudgetUsd } = this.limits;
    let r = maxTurns !== undefined && maxTurns > 0 && this.turns >= maxTurns;
    return hasReachedBudget(maxBudgetUsd)
      ? "the run is past its --max-budget-usd limit"
      : r
        ? "the run reached its --max-turns limit"
        : undefined;
  }
}
//@ chunk-tyg7f3ek.js:305608-305617 placement
var MIN_REMOTE_INPUT_MESSAGES = 2;
//@ chunk-tyg7f3ek.js:305617-305656 placement
function isHostAskedTurn(e) {
  return e.hostAsked === true;
}
//@ chunk-tyg7f3ek.js:305656-305693 placement
function isOwnWordTurn(e) {
  return e.ownWord === true;
}
//@ chunk-tyg7f3ek.js:305693-305728 placement
function isHostRelevantTurn(e) {
  return isHostAskedTurn(e) || isOwnWordTurn(e);
}
//@ chunk-tyg7f3ek.js:305728-305774 placement
function isAimedAtTurn(e, n) {
  return isHandedOffBatch(n) || e.names(batchUuids(n));
}
//@ chunk-tyg7f3ek.js:305774-305814 placement
function shouldPrewaitIntent(e, n) {
  return isAimedAtTurn(e, n) || !isResumedTurnBatch(n);
}
//@ chunk-tyg7f3ek.js:305814-309435 placement
/**
 * print 主循环的"预等待门闩"：在轮次开始前暂存意图批次、处理打断/停止与待答权限。
 */
class PrewaitLatch {
  interruptBeforeTurnArmed = false;
  intentDispatchPendingPreArm = false;
  parkedBatch = [];
  latchDoomedCommands = null;
  latchedWhileBatchParked = false;
  doomedOnlyAsWork = new Set();
  answersToStartAborted = new WeakSet();
  messageQueue;
  commandLacksUserIntent;
  unsubscribeRemovals;
  constructor({ messageQueue, commandLacksUserIntent }) {
    this.messageQueue = messageQueue;
    this.commandLacksUserIntent = commandLacksUserIntent;
    this.unsubscribeRemovals = messageQueue.subscribeToRemovals(() => this.clearIfNothingPending());
  }
  interruptBeforeArm(e) {
    if (e !== undefined) return this.latchForWorkReachedBy(e);
    if (!(
      this.intentDispatchPendingPreArm ||
      this.messageQueue.getCommandQueue().some((n) => this.isUserIntent(n))
    ))
      return false;
    this.interruptBeforeTurnArmed = true;
    this.latchedWhileBatchParked = this.intentDispatchPendingPreArm;
    this.doomedOnlyAsWork.clear();
    this.latchDoomedCommands = new WeakSet(
      this.messageQueue.getCommandQueue().filter((n) => this.isUserIntent(n)),
    );
    return true;
  }
  latchForWorkReachedBy(e) {
    let n = this.intentDispatchPendingPreArm && shouldPrewaitIntent(e, this.parkedBatch);
    let filtered = this.messageQueue
      .getCommandQueue()
      .filter((s) => this.isUserIntent(s) && shouldPrewaitIntent(e, [s]));
    if (!n && filtered.length === 0) return false;
    this.interruptBeforeTurnArmed = true;
    this.latchedWhileBatchParked ||= n;
    this.latchDoomedCommands ??= new WeakSet();
    for (let s of filtered) {
      if (isAimedAtTurn(e, [s])) this.doomedOnlyAsWork.delete(s);
      else if (!this.latchDoomedCommands.has(s)) this.doomedOnlyAsWork.add(s);
      this.latchDoomedCommands.add(s);
    }
    return true;
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
    ].filter((r) => r.orphanedPermission !== undefined && (e === undefined || isAimedAtTurn(e, [r])));
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
  parkBatch(intentDispatchPendingPreArm, parkedBatch) {
    this.intentDispatchPendingPreArm = intentDispatchPendingPreArm;
    this.parkedBatch = parkedBatch;
  }
  parkedBatchStartsAborted() {
    return (
      this.intentDispatchPendingPreArm &&
      ((this.interruptBeforeTurnArmed &&
        (this.latchedWhileBatchParked ||
          this.parkedBatch.some((e) => this.latchDoomedCommands?.has(e) ?? false))) ||
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
    this.reset();
    this.intentDispatchPendingPreArm = false;
    this.parkedBatch = [];
  }
  consumeAtArm(e, n) {
    let any = e.some((s) => this.answersToStartAborted.has(s));
    return this.consumeLatchAtArm(e, n) || (n && any);
  }
  consumeLatchAtArm(e, n) {
    this.intentDispatchPendingPreArm = false;
    this.parkedBatch = [];
    if (
      this.interruptBeforeTurnArmed &&
      n &&
      (this.latchedWhileBatchParked || e.some((r) => this.latchDoomedCommands?.has(r) ?? false))
    ) {
      this.reset();
      return true;
    }
    if (this.doomedOnlyAsWork.size > 0 && n && isResumedTurnBatch(e)) {
      for (let r of this.doomedOnlyAsWork) this.latchDoomedCommands?.delete(r);
      this.doomedOnlyAsWork.clear();
    }
    return false;
  }
  reset() {
    this.interruptBeforeTurnArmed = false;
    this.latchDoomedCommands = null;
    this.latchedWhileBatchParked = false;
    this.doomedOnlyAsWork.clear();
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
    return isMainAgentCommand(e) && !this.commandLacksUserIntent(e);
  }
}
//@ chunk-tyg7f3ek.js:309435-309636 placement
function interruptOnNowPriority({ messageQueue, drain }) {
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

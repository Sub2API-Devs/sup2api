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
  unwatch = commandsConsumedSignal.subscribe((uuids) => this.tookIn(uuids));
  constructor(limits) {
    this.limits = limits;
    holdReasonSlot.set(() => this.reached());
    CANCELLED_COMMAND_STATE.set(() => this.taken());
    MODEL_SWITCH_STATE_CLEARER.set(() => this.giveBackHeld());
    turnStepSlot.set(() => this.spawnedTurnTaken());
    receiptQueuedProbe.set(cancelQueuedAutoInput);
    inFlightDrainProbe.set(countHeldCommands);
  }
  turnStarted(uuids) {
    runIgnoringAbort(() => {
      this.isHostsOwnTurn = uuids.some(isHostRelevantTurn);
      this.tally(uuids);
      let isStopped = this.limits.drain.abortController?.signal.aborted === true;
      uuids.filter(isHandedOffPersonTurn).forEach((entry) => {
        let uuid = entry.handedOffTurn?.messages[0]?.uuid;
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
  tookIn(uuids) {
    runIgnoringAbort(() => {
      if (currentSurfaceBinding() !== this.seatedIn) {
        this.unwatch();
        return;
      }
      this.isHostsOwnTurn ||= uuids.some(isHostRelevantTurn);
      this.tally(uuids);
      uuids.filter(isOwnWordTurn).forEach((entry) =>
        notePromptOrigin({
          uuid: entry.uuid,
          origin: entry.origin,
          isHidden: entry.isMeta === true,
          isStopped: false,
          isRelayed: false,
          foreignWord: undefined,
          ownWordUuids: [entry.uuid ?? entry.stopKey],
          input: entry.value,
        }),
      );
    });
  }
  turnEnded(result) {
    runIgnoringAbort(() => {
      this.isOneShotShape ??= this.isHostsOwnTurn ? this.limits.drain.inputClosed : undefined;
      this.turns += result.num_turns;
      let endedReason = (this.spent() ?? this.inputOver()) !== undefined;
      this.isHostsOwnTurn = false;
      if (endedReason)
        cancelQueuedAutoInputs({
          turnGoesOn: true,
        });
    });
  }
  spawnedTurnTaken() {
    runIgnoringAbort(() => {
      let inSeatedSurface = currentSurfaceBinding() === this.seatedIn;
      this.turns += inSeatedSurface ? 1 : 0;
      if (this.spent() !== undefined)
        cancelQueuedAutoInputs({
          turnGoesOn: true,
        });
    });
  }
  tally(uuids) {
    this.asks += count(uuids, isHostAskedTurn);
    this.isHostHeard ||= uuids.some(isHostRelevantTurn);
    if (uuids.some(isOwnWordTurn) || uuids.some(isHandedOffPersonTurn)) this.turns = 0;
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
    let inSeatedSurface = currentSurfaceBinding() === this.seatedIn;
    let flattened = frameIntake.parkedCommands().flatMap((command) => command.stopKey ?? []);
    let { drainingHandoff } = drain;
    let handbackUuids =
      drainingHandoff?.running === false
        ? (drainingHandoff.command.handedOffTurn?.messages[0]?.uuid ?? [])
        : [];
    return inSeatedSurface
      ? [
          ...frameIntake.parkedUuids(),
          ...flattened,
          ...drain.pendingDispatchUuids,
          ...drain.pendingDispatchKeys,
          ...declinedRedeliveries.heldBack,
          ...[handbackUuids].flat(),
        ]
      : [];
  }
  inputOver() {
    let { inputClosed, endSessionRequested, turnUnderWay } = this.limits.drain;
    let queued = [...this.limits.frameIntake.parkedCommands(), ...getCommandQueue()];
    let askCount = this.asks + count(queued, isHostAskedTurn);
    let hostHeard = this.isHostHeard || queued.some(isHostRelevantTurn);
    let inputDone = this.limits.isRemoteInput()
      ? this.isOneShotShape === false
      : askCount >= MIN_REMOTE_INPUT_MESSAGES;
    let hostRelevant = queued.some(isHostRelevantTurn) || (turnUnderWay && this.isHostsOwnTurn);
    return endSessionRequested ||
      (this.limits.endsItsInput && inputClosed && (!hostHeard || inputDone) && !hostRelevant)
      ? "the host has ended its input"
      : undefined;
  }
  giveBackHeld() {
    if (currentSurfaceBinding() === this.seatedIn) this.limits.held.giveBack();
  }
  spent() {
    let { maxTurns, maxBudgetUsd } = this.limits;
    let overTurnLimit = maxTurns !== undefined && maxTurns > 0 && this.turns >= maxTurns;
    return hasReachedBudget(maxBudgetUsd)
      ? "the run is past its --max-budget-usd limit"
      : overTurnLimit
        ? "the run reached its --max-turns limit"
        : undefined;
  }
}
//@ chunk-tyg7f3ek.js:305608-305617 placement
var MIN_REMOTE_INPUT_MESSAGES = 2;
//@ chunk-tyg7f3ek.js:305617-305656 placement
function isHostAskedTurn(command) {
  return command.hostAsked === true;
}
//@ chunk-tyg7f3ek.js:305656-305693 placement
function isOwnWordTurn(command) {
  return command.ownWord === true;
}
//@ chunk-tyg7f3ek.js:305693-305728 placement
function isHostRelevantTurn(command) {
  return isHostAskedTurn(command) || isOwnWordTurn(command);
}
//@ chunk-tyg7f3ek.js:305728-305774 placement
function isAimedAtTurn(aim, batch) {
  return isHandedOffBatch(batch) || aim.names(batchUuids(batch));
}
//@ chunk-tyg7f3ek.js:305774-305814 placement
function shouldPrewaitIntent(aim, batch) {
  return isAimedAtTurn(aim, batch) || !isResumedTurnBatch(batch);
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
  interruptBeforeArm(aim) {
    if (aim !== undefined) return this.latchForWorkReachedBy(aim);
    if (!(
      this.intentDispatchPendingPreArm ||
      this.messageQueue.getCommandQueue().some((queued) => this.isUserIntent(queued))
    ))
      return false;
    this.interruptBeforeTurnArmed = true;
    this.latchedWhileBatchParked = this.intentDispatchPendingPreArm;
    this.doomedOnlyAsWork.clear();
    this.latchDoomedCommands = new WeakSet(
      this.messageQueue.getCommandQueue().filter((queued) => this.isUserIntent(queued)),
    );
    return true;
  }
  latchForWorkReachedBy(aim) {
    let intentPending = this.intentDispatchPendingPreArm && shouldPrewaitIntent(aim, this.parkedBatch);
    let filtered = this.messageQueue
      .getCommandQueue()
      .filter((queued) => this.isUserIntent(queued) && shouldPrewaitIntent(aim, [queued]));
    if (!intentPending && filtered.length === 0) return false;
    this.interruptBeforeTurnArmed = true;
    this.latchedWhileBatchParked ||= intentPending;
    this.latchDoomedCommands ??= new WeakSet();
    for (let queued of filtered) {
      if (isAimedAtTurn(aim, [queued])) this.doomedOnlyAsWork.delete(queued);
      else if (!this.latchDoomedCommands.has(queued)) this.doomedOnlyAsWork.add(queued);
      this.latchDoomedCommands.add(queued);
    }
    return true;
  }
  startAborted(answers) {
    for (let answer of answers) this.answersToStartAborted.add(answer);
  }
  startQueuedMessageAborted(uuid) {
    this.startAborted(
      [...this.messageQueue.getCommandQueue(), ...this.parkedBatch].filter((queued) => queued.uuid === uuid),
    );
  }
  pendingAnswersFor(aim, cancelQueued) {
    return [
      ...this.parkedIntentBatch(),
      ...(cancelQueued
        ? []
        : this.messageQueue.getCommandQueue().filter((queued) => this.isUserIntent(queued))),
    ].filter(
      (queued) =>
        queued.orphanedPermission !== undefined && (aim === undefined || isAimedAtTurn(aim, [queued])),
    );
  }
  namesQueuedWork(aim) {
    return this.messageQueue
      .getCommandQueue()
      .some((queued) => this.isUserIntent(queued) && isAimedAtTurn(aim, [queued]));
  }
  get stopLatched() {
    return this.interruptBeforeTurnArmed;
  }
  isDoomBoundary(a, b) {
    return (
      this.answersToStartAborted.has(a) !== this.answersToStartAborted.has(b) ||
      (this.interruptBeforeTurnArmed &&
        this.latchDoomedCommands !== null &&
        this.latchDoomedCommands.has(a) !== this.latchDoomedCommands.has(b))
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
          this.parkedBatch.some((command) => this.latchDoomedCommands?.has(command) ?? false))) ||
        this.parkedBatch.some((command) => this.answersToStartAborted.has(command)))
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
  consumeAtArm(uuids, cancelling) {
    let any = uuids.some((uuid) => this.answersToStartAborted.has(uuid));
    return this.consumeLatchAtArm(uuids, cancelling) || (cancelling && any);
  }
  consumeLatchAtArm(uuids, cancelling) {
    this.intentDispatchPendingPreArm = false;
    this.parkedBatch = [];
    if (
      this.interruptBeforeTurnArmed &&
      cancelling &&
      (this.latchedWhileBatchParked || uuids.some((uuid) => this.latchDoomedCommands?.has(uuid) ?? false))
    ) {
      this.reset();
      return true;
    }
    if (this.doomedOnlyAsWork.size > 0 && cancelling && isResumedTurnBatch(uuids)) {
      for (let uuid of this.doomedOnlyAsWork) this.latchDoomedCommands?.delete(uuid);
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
        this.messageQueue
          .getCommandQueue()
          .some((queued) => latchDoomedCommands.has(queued) && this.isUserIntent(queued))
      )
    )
      this.reset();
  }
  dispose() {
    this.unsubscribeRemovals();
  }
  isUserIntent(queued) {
    return isMainAgentCommand(queued) && !this.commandLacksUserIntent(queued);
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

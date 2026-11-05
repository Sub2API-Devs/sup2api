/**
 * cli/print/commandQueueDrain.ts
 *
 * 2.1.316 新增：命令队列排空（! 命令执行器、为人工提示让路的判定）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (16)
 * attribution: placement 15, layout 1
 */
import { withDeadline } from "../../utils/sleep.js";
import {
  QUEUED_INTERRUPT_BUDGET_MS,
  RESUME_RESCUE_YIELD_FLAG,
  TENGU_COZY_PINWHEEL,
  TENGU_GIGGLY_OASIS,
  isPeerHandbackPrompt,
} from "./backgroundWait.js";
import { ATTACHMENT_FILES_WAIT_TIMEOUT_MS } from "../../bridge/attachmentFilesWait.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isClaudeAiChatRemote } from "../../utils/entrypointKinds.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import {
  isQueuedUserTurnCommand,
  isSlashCommand,
  isDrainableMainThreadCommand,
  isPollEventWakeInput,
  isPromptCapableMode,
  isMainAgentCommand,
} from "../../utils/messageQueueManager.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { TENGU_TENDER_MITTEN } from "../../services/api/withRetry.js";
import { logError } from "../../utils/log.js";
import { neverDeclaresEvents } from "../../utils/pollEvents/declarations.js";
import { isPollEventMode, mentionsSessionNoticeKind, discardPollEvent } from "../../utils/pollEvents.js";
import { isDispatchablePrompt, canMergePromptCommands, canBatchCommands } from "./inboundMessages.js";
import { isVerifiedSlackHumanTurn } from "../../bridge/inboundMessageOrigin.js";
import { logForDebugging } from "../../utils/debug.js";
import { dequeueQueuedMessage } from "./rewindStandIn.js";
import {
  isRemoteManagedEnvironment,
  isByocEnvironment,
  isBridgeEnvironment,
} from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { BASH_STDOUT, BASH_STDERR, BASH_EXIT_CODE } from "../../constants/xml.js";
import { BASH_INTERRUPTED_NOTE } from "../../utils/shell/headlessBash.js";
import { createChildAbortController, userAbortReason } from "../../utils/abortController.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:144997-145593 placement
/**
 * resume 救援轮次遇到排队的人工提示时让路（tengu_cosmic_crayon），返回等待对象。
 */
function maybeYieldToPersonPrompt({ head, messageQueue, prewaitLatch, fetchingFiles }) {
  let yieldKind = isRescueTurn(head);
  if (
    yieldKind === undefined ||
    prewaitLatch.stopLatched ||
    resumeRescueYieldGateState(yieldKind) !== "on" ||
    hasBatchablePersonPrompt(messageQueue.getCommandQueueSnapshot())
  )
    return null;
  let deferred = Promise.withResolvers();
  let unsubscribe = messageQueue.subscribe(() => {
    if (hasBatchablePersonPrompt(messageQueue.getCommandQueueSnapshot())) deferred.resolve("queued");
  });
  return withDeadline(deferred.promise, QUEUED_INTERRUPT_BUDGET_MS)
    .then(async (queuedOutcome) => {
      let filesWait =
        queuedOutcome === undefined && !prewaitLatch.stopLatched ? fetchingFiles.untilNone() : undefined;
      if (filesWait === undefined) return queuedOutcome ?? "timed_out";
      let filesArrived = await withDeadline(
        Promise.race([deferred.promise, filesWait]).then(() => true),
        ATTACHMENT_FILES_WAIT_TIMEOUT_MS,
      );
      if (hasBatchablePersonPrompt(messageQueue.getCommandQueueSnapshot())) return "files_wait_queued";
      return filesArrived ? "files_wait_none_queued" : "files_wait_timed_out";
    })
    .finally(unsubscribe);
}
//@ chunk-0yw3taqg.js:145593-146160 placement
function shouldYieldRescueTurn({ head, queued, stopLatched, decidedAt, promptWait }) {
  let yieldKind = isRescueTurn(head);
  if (yieldKind === undefined) return false;
  let promptWaiting = hasBatchablePersonPrompt(queued);
  let switchState = resumeRescueYieldGateState(yieldKind);
  let shouldYield = promptWaiting && !stopLatched && switchState === "on";
  if (shouldYield || decidedAt === "before_start") {
    logEvent("tengu_resume_rescue_yield", {
      outcome: fromEnum(shouldYield ? "yielded" : "kept"),
      decided_at: fromEnum(decidedAt),
      switch_state: fromEnum(switchState),
      prompt_waiting: promptWaiting,
      stop_latched: stopLatched,
      drain_only: head.drainOnly === true,
      prompt_wait: fromEnum(promptWait),
      error_kind: fromEnum(yieldKind),
    });
    if (shouldYield) logFeatureOk("ccr_rescue_yields_to_prompt");
    else if (promptWaiting && switchState === "on")
      logFeatureSad("ccr_rescue_yields_to_prompt", "stop_latched");
    else if (promptWaiting && !stopLatched && yieldKind === "other")
      logFeatureSad("ccr_rescue_yields_to_prompt", "error_kind_other_switch_not_on");
  }
  return shouldYield;
}
//@ chunk-0yw3taqg.js:146160-146250 placement
function isRescueTurn(head) {
  return head.yieldsToPersonPrompt !== undefined && isClaudeAiChatRemote()
    ? head.yieldsToPersonPrompt
    : undefined;
}
//@ chunk-0yw3taqg.js:146250-146440 layout
function resumeRescueYieldGateState(yieldKind) {
  let remoteFeatureGateState = getRemoteFeatureGateState(RESUME_RESCUE_YIELD_FLAG);
  if (remoteFeatureGateState !== "on") return remoteFeatureGateState;
  switch (yieldKind) {
    case "rate_limit":
    case "no_request_token":
      return remoteFeatureGateState;
    case "server_error":
    case "model_not_found":
      return getRemoteFeatureGateState(TENGU_COZY_PINWHEEL);
    case "other":
      return getRemoteFeatureGateState(TENGU_GIGGLY_OASIS);
  }
}
//@ chunk-0yw3taqg.js:146440-146505 placement
function hasBatchablePersonPrompt(queued) {
  return queued.some(
    (item) => isQueuedUserTurnCommand(item) && isHumanOrigin(item.origin) && !isSlashCommand(item),
  );
}
//@ chunk-0yw3taqg.js:146505-146547 placement
function isActiveHandbackPrompt(item) {
  return isPeerHandbackPrompt(item) && !item.drainOnly;
}
//@ chunk-0yw3taqg.js:146547-146711 placement
function makeHandbackFilter(queued) {
  let senderTaskIds = new Set(
    queued
      .filter(isActiveHandbackPrompt)
      .map((item) => (item.origin?.kind === "peer" ? item.origin.senderTaskId : undefined)),
  );
  return (item) =>
    isActiveHandbackPrompt(item) || (item.handbackPointer === true && senderTaskIds.has(item.taskId));
}
//@ chunk-0yw3taqg.js:146711-146931 placement
function shouldHandbacksStandAside({ queued, stopLatched, next }) {
  if (
    !queued.some(isActiveHandbackPrompt) ||
    !hasBatchablePersonPrompt(queued) ||
    getRemoteFeatureGateState(TENGU_TENDER_MITTEN) !== "on"
  )
    return false;
  if (next !== undefined && isActiveHandbackPrompt(next))
    if (stopLatched) logFeatureSad("headless_handbacks_stand_aside", "stop_latched");
    else logFeatureOk("headless_handbacks_stand_aside");
  return !stopLatched;
}
//@ chunk-0yw3taqg.js:146931-150360 placement
/**
 * print 模式命令队列出队器：处理 poll-event、orphaned-permission、prompt 批量合并、延迟工具结果与停止门闩。
 */
class CommandQueueDrain {
  messageQueue;
  prewaitLatch;
  deferredToolUsePending;
  holdsEvalSettles;
  pollEmptyDispatchStalled = false;
  pollDispatchTarget;
  lastDispatchAborted = false;
  constructor({ messageQueue, prewaitLatch, deferredToolUsePending, holdsEvalSettles }) {
    this.messageQueue = messageQueue;
    this.prewaitLatch = prewaitLatch;
    this.deferredToolUsePending = deferredToolUsePending ?? (() => false);
    this.holdsEvalSettles = holdsEvalSettles ?? (() => false);
  }
  takeHead() {
    let matchCommand = this.exceptHandbacksThatStandAside(
      isDrainableMainThreadCommand,
      this.messageQueue.peek(isDrainableMainThreadCommand),
    );
    if (
      this.pollDispatchTarget !== undefined &&
      this.messageQueue.peek(matchCommand) === this.pollDispatchTarget &&
      !this.lastDispatchAborted
    ) {
      this.pollEmptyDispatchStalled = true;
      logError(Error("attachment-only poll dispatch made no progress \u2014 falling back to value dispatch"));
    }
    this.pollDispatchTarget = undefined;
    this.messageQueue.setTurnStartFoldTarget(undefined);
    this.lastDispatchAborted = false;
    if (this.holdsEvalSettles()) return;
    let head = this.messageQueue.peek(matchCommand);
    let neverDeclares = head !== undefined && neverDeclaresEvents(head);
    if (
      head !== undefined &&
      isPollEventWakeInput(head, this.pollEmptyDispatchStalled, neverDeclares) &&
      this.messageQueue.peek(isOrphanedPermissionCommand) === undefined &&
      !this.deferredHumanTurnQueued()
    ) {
      let foldTarget = neverDeclares
        ? undefined
        : this.messageQueue.peek(
            (candidate) =>
              matchCommand(candidate) &&
              !isPollEventMode(candidate) &&
              isPromptCapableMode(candidate.mode, candidate.clientBashCommand),
          );
      if (foldTarget !== undefined)
        return this.messageQueue.dequeue((queuedItem) => queuedItem === foldTarget);
      this.pollDispatchTarget = head;
      if (neverDeclares) this.messageQueue.setTurnStartFoldTarget(head);
      return {
        value: [],
        mode: "prompt",
        agentId: head.agentId,
        isMeta: true,
        pollEmptyDispatch: true,
        skipSubmissionHooks: true,
      };
    }
    let orphanHead = this.dequeueOrphansFirst(matchCommand);
    if (
      orphanHead?.mode === "poll-event" &&
      orphanHead.pollEvent !== undefined &&
      mentionsSessionNoticeKind(orphanHead.pollEvent.kind)
    ) {
      discardPollEvent([orphanHead], "reserved kind refused legacy value dispatch; redelivered on reconnect");
      this.pollEmptyDispatchStalled = false;
      return this.takeHead();
    }
    if (orphanHead?.mode === "poll-event" && this.pollEmptyDispatchStalled)
      this.pollEmptyDispatchStalled = false;
    return orphanHead;
  }
  takeFollowers(head, canFollow) {
    let followers = [];
    if (head.mode !== "prompt") return followers;
    let matchCommand = this.exceptHandbacksThatStandAside(isDispatchablePrompt);
    while (true) {
      let next = this.messageQueue.peek(matchCommand);
      if (!canMergePromptCommands(head, next) || !canFollow(next)) break;
      if (this.prewaitLatch.isDoomBoundary(head, next)) break;
      if (
        head.shouldQuery === false &&
        this.queuedBefore(next).some(
          (queuedItem) => isOrphanedPermissionCommand(queuedItem) && queuedItem.handedOffTurn !== undefined,
        )
      )
        break;
      followers.push(this.messageQueue.dequeue(matchCommand));
    }
    return followers;
  }
  holdsQueryForFollower(head, canFollow, exclude) {
    if (this.deferredHumanTurnQueued()) return false;
    let next = this.messageQueue.peek(
      (queuedItem) =>
        isDispatchablePrompt(queuedItem) && queuedItem.handbackPointer !== true && !exclude(queuedItem),
    );
    return (
      next !== undefined &&
      canBatchCommands(head, next) &&
      canFollow(next) &&
      !this.prewaitLatch.isDoomBoundary(head, next)
    );
  }
  noteTurnEnded(lastDispatchAborted) {
    this.lastDispatchAborted = lastDispatchAborted;
    this.messageQueue.setTurnStartFoldTarget(undefined);
  }
  holdsBack(item) {
    return item.handedOffTurn !== undefined && this.deferredToolUsePending();
  }
  queuedBefore(item) {
    let commandQueue = this.messageQueue.getCommandQueue();
    let index = commandQueue.indexOf(item);
    return index < 0 ? [] : commandQueue.slice(0, index);
  }
  deferredHumanTurnQueued() {
    return (
      this.messageQueue.peek(
        (queuedItem) => isMainAgentCommand(queuedItem) && isVerifiedSlackHumanTurn(queuedItem),
      ) !== undefined
    );
  }
  dequeueOrphansFirst(matchCommand) {
    let orphan =
      this.messageQueue.peek(
        (queuedItem) =>
          isOrphanedPermissionCommand(queuedItem) &&
          queuedItem.handedOffTurn?.continues === true &&
          !this.holdsBack(queuedItem),
      ) ??
      this.messageQueue.peek(
        (queuedItem) => isOrphanedPermissionCommand(queuedItem) && queuedItem.handedOffTurn === undefined,
      ) ??
      this.messageQueue.peek(
        (queuedItem) => isOrphanedPermissionCommand(queuedItem) && !this.holdsBack(queuedItem),
      );
    if (orphan?.handedOffTurn !== undefined && !orphan.handedOffTurn.continues) {
      let found = this.queuedBefore(orphan).find(isNoQueryPrompt);
      if (found !== undefined) return this.messageQueue.dequeue((item) => item === found);
    }
    if (orphan) {
      this.messageQueue.dequeue((item) => item === orphan);
      logForDebugging(
        `drainCommandQueue: prioritizing orphaned-permission for toolUseID=${orphan.orphanedPermission?.permissionResult?.toolUseID ?? orphan.handedOffTurn?.toolUseIDs.join(",") ?? "<unknown>"}`,
      );
      return orphan;
    }
    return dequeueQueuedMessage(this.messageQueue, matchCommand);
  }
  exceptHandbacksThatStandAside(matchCommand, next) {
    let queued = this.messageQueue.getCommandQueue();
    if (
      !shouldHandbacksStandAside({
        queued,
        stopLatched: this.prewaitLatch.stopLatched,
        next,
      })
    )
      return matchCommand;
    let handbackFilter = makeHandbackFilter(queued);
    return (item) => matchCommand(item) && !handbackFilter(item);
  }
}
//@ chunk-0yw3taqg.js:150360-150420 placement
function isOrphanedPermissionCommand(command) {
  return isMainAgentCommand(command) && command.mode === "orphaned-permission";
}
//@ chunk-0yw3taqg.js:150420-150487 placement
function isNoQueryPrompt(command) {
  return isDrainableMainThreadCommand(command) && command.mode === "prompt" && command.shouldQuery === false;
}
//@ chunk-0yw3taqg.js:150487-150548 placement
function isPassiveQueueItem(command) {
  return (
    isNoQueryPrompt(command) || (isOrphanedPermissionCommand(command) && command.handedOffTurn === undefined)
  );
}
//@ chunk-0yw3taqg.js:150617-150685 placement
var BANG_COMMAND_LIMITS = 65536;
var BANG_COMMAND_MAX_AGE_MS = 90000;
var BANG_COMMAND_ASYNC_WAITS = {
  ackConfirmMs: 1e4,
  interruptedAnswerMs: 1e4,
};
//@ chunk-0yw3taqg.js:150685-150877 placement
function detectWorkerHosting() {
  if (isRemoteManagedEnvironment()) return "anthropic_cloud";
  if (isByocEnvironment()) return "runner";
  if (isBridgeEnvironment()) return "bridge";
  if (env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined && env.CLAUDE_CODE_REMOTE !== true) return "local";
  return "unknown";
}
//@ chunk-0yw3taqg.js:150877-151336 placement
/**
 * `!` 命令相关常量：输出截断 200 字符、控制字符正则、机器时钟未知与应用元数据缺失两条拒绝文案，以及被打断时的固定 stdout/stderr/exit-130 结果帧。
 */
var BANG_COMMAND_TEXT; // deferred: uses COMMAND_NAME (../../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
var MAX_BANG_COMMAND_OUTPUT_CHARS;
var CONTROL_CHARS_PATTERN;
var BANG_NO_SERVER_CLOCK_TEXT;
var BANG_APP_METADATA_MISSING_TEXT;
var BANG_INTERRUPTED_RESULT_FRAME;
deferInit("chunk-0yw3taqg.js:150877", () => {
  BANG_COMMAND_TEXT = "Ask Claude to run the command instead.";
  MAX_BANG_COMMAND_OUTPUT_CHARS = 200;
  CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/;
  BANG_NO_SERVER_CLOCK_TEXT =
    "Not run: this machine doesn't know the session service's clock yet, so it can't tell how old the command is. Send it again in a moment, or ask Claude to run it.";
  BANG_APP_METADATA_MISSING_TEXT =
    "Not run: the app you sent this from is missing information needed to run '!' commands safely. Update the app and try again.";
  BANG_INTERRUPTED_RESULT_FRAME = `<${BASH_STDOUT}></${BASH_STDOUT}><${BASH_STDERR}>${BASH_INTERRUPTED_NOTE}</${BASH_STDERR}><${BASH_EXIT_CODE}>130</${BASH_EXIT_CODE}>`;
});
//@ chunk-0yw3taqg.js:151336-152325 placement
class BangCommandRunner {
  current = undefined;
  admitting = new Set();
  get isRunning() {
    return this.current !== undefined;
  }
  get isBusy() {
    return this.current !== undefined || this.admitting.size > 0;
  }
  whileAdmitting(uuid, controller, admission) {
    let settled = admission.finally(() => {
      this.admitting.delete(record);
      controller.abort();
    });
    let record = {
      uuid,
      controller,
      settled: settled.catch(() => {}),
    };
    this.admitting.add(record);
    return settled;
  }
  start(uuid, abortController, run) {
    if (this.current !== undefined) throw Error("a bash command is already running");
    let childAbortController = createChildAbortController(abortController);
    let ended = run(childAbortController.signal)
      .catch(logError)
      .finally(() => {
        if (this.current?.controller === childAbortController) this.current = undefined;
        childAbortController.abort();
      });
    this.current = {
      uuid,
      controller: childAbortController,
      ended,
    };
    return ended;
  }
  interrupt(interruptFilter) {
    for (let admission of this.admitting)
      if (
        interruptFilter === undefined ||
        (admission.uuid !== undefined && interruptFilter.names([admission.uuid]))
      )
        admission.controller.abort(userAbortReason("interrupt"));
    let current = this.current;
    if (current === undefined) return false;
    if (
      interruptFilter !== undefined &&
      (current.uuid === undefined || !interruptFilter.names([current.uuid]))
    )
      return false;
    current.controller.abort(userAbortReason("interrupt"));
    return true;
  }
  async ended() {
    while (this.current !== undefined || this.admitting.size > 0)
      await Promise.all([this.current?.ended, ...[...this.admitting].map((admission) => admission.settled)]);
  }
}
export {
  BangCommandRunner,
  isPassiveQueueItem,
  detectWorkerHosting,
  BANG_COMMAND_LIMITS,
  CONTROL_CHARS_PATTERN,
  BANG_COMMAND_TEXT,
  BANG_APP_METADATA_MISSING_TEXT,
  BANG_NO_SERVER_CLOCK_TEXT,
  BANG_COMMAND_MAX_AGE_MS,
  BANG_COMMAND_ASYNC_WAITS,
  BANG_INTERRUPTED_RESULT_FRAME,
  MAX_BANG_COMMAND_OUTPUT_CHARS,
  CommandQueueDrain,
  isOrphanedPermissionCommand,
  shouldYieldRescueTurn,
  maybeYieldToPersonPrompt,
};

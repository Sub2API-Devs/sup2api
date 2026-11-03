/**
 * cli/print/commandQueueDrain.ts
 *
 * 2.1.316 新增：命令队列排空（! 命令执行器、为人工提示让路的判定）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (16)
 * attribution: placement 16
 */
import { withDeadline } from "../../utils/sleep.js";
import {
  QUEUED_INTERRUPT_BUDGET_MS,
  RESUME_RESCUE_YIELD_FLAG,
  TENGU_COZY_PINWHEEL,
  isPeerHandbackPrompt,
} from "./backgroundWait.js";
import { ATTACHMENT_FILES_WAIT_TIMEOUT_MS } from "../../bridge/attachmentFilesWait.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isClaudeAiChatRemote } from "../../utils/entrypointKinds.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { canBatchWith } from "../print.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import {
  isSlashCommand_2,
  isActiveMainAgentCommand,
  isPollEventWakeInput,
  isPromptCapableMode,
  isMainAgentCommand,
} from "../../utils/messageQueueManager.js";
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

//@ chunk-tyg7f3ek.js:115396-115976 placement
/**
 * resume 救援轮次遇到排队的人工提示时让路（tengu_cosmic_crayon），返回等待对象。
 */
function maybeYieldToPersonPrompt({ head, messageQueue, prewaitLatch, fetchingFiles }) {
  if (
    !isRescueTurn(head) ||
    prewaitLatch.stopLatched ||
    rescueYieldMode(head) !== "on" ||
    hasBatchablePersonPrompt(messageQueue.getCommandQueueSnapshot())
  )
    return null;
  let deferred = Promise.withResolvers();
  let y = messageQueue.subscribe(() => {
    if (hasBatchablePersonPrompt(messageQueue.getCommandQueueSnapshot())) deferred.resolve("queued");
  });
  return withDeadline(deferred.promise, QUEUED_INTERRUPT_BUDGET_MS)
    .then(async (S) => {
      let R = S === undefined && !prewaitLatch.stopLatched ? fetchingFiles.untilNone() : undefined;
      if (R === undefined) return S ?? "timed_out";
      let w = await withDeadline(
        Promise.race([deferred.promise, R]).then(() => true),
        ATTACHMENT_FILES_WAIT_TIMEOUT_MS,
      );
      if (hasBatchablePersonPrompt(messageQueue.getCommandQueueSnapshot())) return "files_wait_queued";
      return w ? "files_wait_none_queued" : "files_wait_timed_out";
    })
    .finally(y);
}
//@ chunk-tyg7f3ek.js:115976-116456 placement
function shouldYieldRescueTurn({ head, queued, stopLatched, decidedAt, promptWait }) {
  if (!isRescueTurn(head)) return false;
  let y = hasBatchablePersonPrompt(queued);
  let S = rescueYieldMode(head);
  let R = y && !stopLatched && S === "on";
  if (R || decidedAt === "before_start") {
    logEvent("tengu_resume_rescue_yield", {
      outcome: fromEnum(R ? "yielded" : "kept"),
      decided_at: fromEnum(decidedAt),
      switch_state: fromEnum(S),
      prompt_waiting: y,
      stop_latched: stopLatched,
      drain_only: head.drainOnly === true,
      prompt_wait: fromEnum(promptWait),
      error_kind: fromEnumOpt(head.yieldsToPersonPrompt),
    });
    if (R) logFeatureOk("ccr_rescue_yields_to_prompt");
    else if (y && S === "on") logFeatureSad("ccr_rescue_yields_to_prompt", "stop_latched");
  }
  return R;
}
//@ chunk-tyg7f3ek.js:116456-116517 placement
function isRescueTurn(head) {
  return head.yieldsToPersonPrompt !== undefined && isClaudeAiChatRemote();
}
//@ chunk-tyg7f3ek.js:116517-116657 placement
function rescueYieldMode(head) {
  let remoteFeatureGateState = getRemoteFeatureGateState(RESUME_RESCUE_YIELD_FLAG);
  return remoteFeatureGateState === "on" &&
    (head.yieldsToPersonPrompt === "server_error" || head.yieldsToPersonPrompt === "model_not_found")
    ? getRemoteFeatureGateState(TENGU_COZY_PINWHEEL)
    : remoteFeatureGateState;
}
//@ chunk-tyg7f3ek.js:116657-116722 placement
function hasBatchablePersonPrompt(e) {
  return e.some((n) => canBatchWith(n) && isHumanOrigin(n.origin) && !isSlashCommand_2(n));
}
//@ chunk-tyg7f3ek.js:116722-116764 placement
function isActiveHandbackPrompt(e) {
  return isPeerHandbackPrompt(e) && !e.drainOnly;
}
//@ chunk-tyg7f3ek.js:116764-116928 placement
function makeHandbackFilter(e) {
  let n = new Set(
    e
      .filter(isActiveHandbackPrompt)
      .map((r) => (r.origin?.kind === "peer" ? r.origin.senderTaskId : undefined)),
  );
  return (r) => isActiveHandbackPrompt(r) || (r.handbackPointer === true && n.has(r.taskId));
}
//@ chunk-tyg7f3ek.js:116928-117148 placement
function shouldHandbacksStandAside({ queued, stopLatched, next: r }) {
  if (
    !queued.some(isActiveHandbackPrompt) ||
    !hasBatchablePersonPrompt(queued) ||
    getRemoteFeatureGateState(TENGU_TENDER_MITTEN) !== "on"
  )
    return false;
  if (r !== undefined && isActiveHandbackPrompt(r))
    if (stopLatched) logFeatureSad("headless_handbacks_stand_aside", "stop_latched");
    else logFeatureOk("headless_handbacks_stand_aside");
  return !stopLatched;
}
//@ chunk-tyg7f3ek.js:117148-120577 placement
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
    let e = this.exceptHandbacksThatStandAside(
      isActiveMainAgentCommand,
      this.messageQueue.peek(isActiveMainAgentCommand),
    );
    if (
      this.pollDispatchTarget !== undefined &&
      this.messageQueue.peek(e) === this.pollDispatchTarget &&
      !this.lastDispatchAborted
    ) {
      this.pollEmptyDispatchStalled = true;
      logError(Error("attachment-only poll dispatch made no progress \u2014 falling back to value dispatch"));
    }
    this.pollDispatchTarget = undefined;
    this.messageQueue.setTurnStartFoldTarget(undefined);
    this.lastDispatchAborted = false;
    if (this.holdsEvalSettles()) return;
    let n = this.messageQueue.peek(e);
    let r = n !== undefined && neverDeclaresEvents(n);
    if (
      n !== undefined &&
      isPollEventWakeInput(n, this.pollEmptyDispatchStalled, r) &&
      this.messageQueue.peek(isOrphanedPermissionCommand) === undefined &&
      !this.deferredHumanTurnQueued()
    ) {
      let h = r
        ? undefined
        : this.messageQueue.peek(
            (y) => e(y) && !isPollEventMode(y) && isPromptCapableMode(y.mode, y.clientBashCommand),
          );
      if (h !== undefined) return this.messageQueue.dequeue((y) => y === h);
      this.pollDispatchTarget = n;
      if (r) this.messageQueue.setTurnStartFoldTarget(n);
      return {
        value: [],
        mode: "prompt",
        agentId: n.agentId,
        isMeta: true,
        pollEmptyDispatch: true,
        skipSubmissionHooks: true,
      };
    }
    let s = this.dequeueOrphansFirst(e);
    if (
      s?.mode === "poll-event" &&
      s.pollEvent !== undefined &&
      mentionsSessionNoticeKind(s.pollEvent.kind)
    ) {
      discardPollEvent([s], "reserved kind refused legacy value dispatch; redelivered on reconnect");
      this.pollEmptyDispatchStalled = false;
      return this.takeHead();
    }
    if (s?.mode === "poll-event" && this.pollEmptyDispatchStalled) this.pollEmptyDispatchStalled = false;
    return s;
  }
  takeFollowers(e, n) {
    let r = [];
    if (e.mode !== "prompt") return r;
    let s = this.exceptHandbacksThatStandAside(isDispatchablePrompt);
    while (true) {
      let h = this.messageQueue.peek(s);
      if (!canMergePromptCommands(e, h) || !n(h)) break;
      if (this.prewaitLatch.isDoomBoundary(e, h)) break;
      if (
        e.shouldQuery === false &&
        this.queuedBefore(h).some((y) => isOrphanedPermissionCommand(y) && y.handedOffTurn !== undefined)
      )
        break;
      r.push(this.messageQueue.dequeue(s));
    }
    return r;
  }
  holdsQueryForFollower(e, n, r) {
    if (this.deferredHumanTurnQueued()) return false;
    let s = this.messageQueue.peek((h) => isDispatchablePrompt(h) && h.handbackPointer !== true && !r(h));
    return s !== undefined && canBatchCommands(e, s) && n(s) && !this.prewaitLatch.isDoomBoundary(e, s);
  }
  noteTurnEnded(lastDispatchAborted) {
    this.lastDispatchAborted = lastDispatchAborted;
    this.messageQueue.setTurnStartFoldTarget(undefined);
  }
  holdsBack(e) {
    return e.handedOffTurn !== undefined && this.deferredToolUsePending();
  }
  queuedBefore(e) {
    let commandQueue = this.messageQueue.getCommandQueue();
    let index = commandQueue.indexOf(e);
    return index < 0 ? [] : commandQueue.slice(0, index);
  }
  deferredHumanTurnQueued() {
    return this.messageQueue.peek((e) => isMainAgentCommand(e) && isVerifiedSlackHumanTurn(e)) !== undefined;
  }
  dequeueOrphansFirst(e) {
    let n =
      this.messageQueue.peek(
        (r) => isOrphanedPermissionCommand(r) && r.handedOffTurn?.continues === true && !this.holdsBack(r),
      ) ??
      this.messageQueue.peek((r) => isOrphanedPermissionCommand(r) && r.handedOffTurn === undefined) ??
      this.messageQueue.peek((r) => isOrphanedPermissionCommand(r) && !this.holdsBack(r));
    if (n?.handedOffTurn !== undefined && !n.handedOffTurn.continues) {
      let found = this.queuedBefore(n).find(isNoQueryPrompt);
      if (found !== undefined) return this.messageQueue.dequeue((s) => s === found);
    }
    if (n) {
      this.messageQueue.dequeue((r) => r === n);
      logForDebugging(
        `drainCommandQueue: prioritizing orphaned-permission for toolUseID=${n.orphanedPermission?.permissionResult?.toolUseID ?? n.handedOffTurn?.toolUseIDs.join(",") ?? "<unknown>"}`,
      );
      return n;
    }
    return dequeueQueuedMessage(this.messageQueue, e);
  }
  exceptHandbacksThatStandAside(e, next) {
    let commandQueue = this.messageQueue.getCommandQueue();
    if (
      !shouldHandbacksStandAside({
        queued: commandQueue,
        stopLatched: this.prewaitLatch.stopLatched,
        next,
      })
    )
      return e;
    let handbackFilter = makeHandbackFilter(commandQueue);
    return (h) => e(h) && !handbackFilter(h);
  }
}
//@ chunk-tyg7f3ek.js:120577-120637 placement
function isOrphanedPermissionCommand(e) {
  return isMainAgentCommand(e) && e.mode === "orphaned-permission";
}
//@ chunk-tyg7f3ek.js:120637-120704 placement
function isNoQueryPrompt(e) {
  return isActiveMainAgentCommand(e) && e.mode === "prompt" && e.shouldQuery === false;
}
//@ chunk-tyg7f3ek.js:120704-120765 placement
function isPassiveQueueItem(e) {
  return isNoQueryPrompt(e) || (isOrphanedPermissionCommand(e) && e.handedOffTurn === undefined);
}
//@ chunk-tyg7f3ek.js:120834-120902 placement
var BANG_COMMAND_LIMITS = 65536;
var BANG_COMMAND_MAX_AGE_MS = 90000;
var BANG_COMMAND_ASYNC_WAITS = {
  ackConfirmMs: 1e4,
  interruptedAnswerMs: 1e4,
};
//@ chunk-tyg7f3ek.js:120902-121094 placement
function detectWorkerHosting() {
  if (isRemoteManagedEnvironment()) return "anthropic_cloud";
  if (isByocEnvironment()) return "runner";
  if (isBridgeEnvironment()) return "bridge";
  if (env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined && env.CLAUDE_CODE_REMOTE !== true) return "local";
  return "unknown";
}
//@ chunk-tyg7f3ek.js:121094-121553 placement
/**
 * `!` 命令相关常量：输出截断 200 字符、控制字符正则、机器时钟未知与应用元数据缺失两条拒绝文案，以及被打断时的固定 stdout/stderr/exit-130 结果帧。
 */
var BANG_COMMAND_TEXT = "Ask Claude to run the command instead.";
var MAX_BANG_COMMAND_OUTPUT_CHARS = 200;
var CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/;
var BANG_NO_SERVER_CLOCK_TEXT =
  "Not run: this machine doesn't know the session service's clock yet, so it can't tell how old the command is. Send it again in a moment, or ask Claude to run it.";
var BANG_APP_METADATA_MISSING_TEXT =
  "Not run: the app you sent this from is missing information needed to run '!' commands safely. Update the app and try again.";
var BANG_INTERRUPTED_RESULT_FRAME = `<${BASH_STDOUT}></${BASH_STDOUT}><${BASH_STDERR}>${BASH_INTERRUPTED_NOTE}</${BASH_STDERR}><${BASH_EXIT_CODE}>130</${BASH_EXIT_CODE}>`;
//@ chunk-tyg7f3ek.js:121553-122542 placement
class BangCommandRunner {
  current = undefined;
  admitting = new Set();
  get isRunning() {
    return this.current !== undefined;
  }
  get isBusy() {
    return this.current !== undefined || this.admitting.size > 0;
  }
  whileAdmitting(uuid, n, r) {
    let s = r.finally(() => {
      this.admitting.delete(h);
      n.abort();
    });
    let h = {
      uuid,
      controller: n,
      settled: s.catch(() => {}),
    };
    this.admitting.add(h);
    return s;
  }
  start(uuid, n, r) {
    if (this.current !== undefined) throw Error("a bash command is already running");
    let childAbortController = createChildAbortController(n);
    let h = r(childAbortController.signal)
      .catch(logError)
      .finally(() => {
        if (this.current?.controller === childAbortController) this.current = undefined;
        childAbortController.abort();
      });
    this.current = {
      uuid,
      controller: childAbortController,
      ended: h,
    };
    return h;
  }
  interrupt(e) {
    for (let r of this.admitting)
      if (e === undefined || (r.uuid !== undefined && e.names([r.uuid])))
        r.controller.abort(userAbortReason("interrupt"));
    let n = this.current;
    if (n === undefined) return false;
    if (e !== undefined && (n.uuid === undefined || !e.names([n.uuid]))) return false;
    n.controller.abort(userAbortReason("interrupt"));
    return true;
  }
  async ended() {
    while (this.current !== undefined || this.admitting.size > 0)
      await Promise.all([this.current?.ended, ...[...this.admitting].map((e) => e.settled)]);
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

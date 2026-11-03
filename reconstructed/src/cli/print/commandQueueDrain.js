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
import { sH, RESUME_RESCUE_YIELD_FLAG, TENGU_COZY_PINWHEEL, isPeerHandbackPrompt } from "./backgroundWait.js";
import { o4o } from "../../bridge/attachmentFilesWait.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isClaudeAiChatRemote } from "../../utils/entrypointKinds.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { canBatchWith } from "../print.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { isSlashCommand_2, im, x4s, d1r, $f } from "../../utils/messageQueueManager.js";
import { TENGU_TENDER_MITTEN } from "../../services/api/withRetry.js";
import { logError } from "../../utils/log.js";
import { vVs } from "../../utils/pollEvents/declarations.js";
import { Kv, eCt, discardPollEvent } from "../../utils/pollEvents.js";
import { isDispatchablePrompt, canMergePromptCommands, canBatchCommands } from "./inboundMessages.js";
import { ist } from "../../bridge/inboundMessageOrigin.js";
import { logForDebugging } from "../../utils/debug.js";
import { UAs } from "./rewindStandIn.js";
import { mn, op, vS } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { BASH_STDOUT, BASH_STDERR, BASH_EXIT_CODE } from "../../constants/xml.js";
import { BASH_INTERRUPTED_NOTE } from "../../utils/shell/headlessBash.js";
import { createChildAbortController, userAbortReason } from "../../utils/abortController.js";

/**
 * resume 救援轮次遇到排队的人工提示时让路（tengu_cosmic_crayon），返回等待对象。
 */
//@ chunk-tyg7f3ek.js:115396-115976 placement
function maybeYieldToPersonPrompt({
  head: head,
  messageQueue: messageQueue,
  prewaitLatch: prewaitLatch,
  fetchingFiles: fetchingFiles,
}) {
  if (
    !isRescueTurn(head) ||
    prewaitLatch.stopLatched ||
    rescueYieldMode(head) !== "on" ||
    hasBatchablePersonPrompt(messageQueue.getCommandQueueSnapshot())
  )
    return null;
  let withResolvers = Promise.withResolvers(),
    subscribe = messageQueue.subscribe(() => {
      if (hasBatchablePersonPrompt(messageQueue.getCommandQueueSnapshot())) withResolvers.resolve("queued");
    });
  return withDeadline(withResolvers.promise, sH)
    .then(async (S) => {
      let R = S === void 0 && !prewaitLatch.stopLatched ? fetchingFiles.untilNone() : void 0;
      if (R === void 0) return S ?? "timed_out";
      let w = await withDeadline(
        Promise.race([withResolvers.promise, R]).then(() => !0),
        o4o,
      );
      if (hasBatchablePersonPrompt(messageQueue.getCommandQueueSnapshot())) return "files_wait_queued";
      return w ? "files_wait_none_queued" : "files_wait_timed_out";
    })
    .finally(subscribe);
}
//@ chunk-tyg7f3ek.js:115976-116456 placement
function shouldYieldRescueTurn({
  head: head,
  queued: queued,
  stopLatched: stopLatched,
  decidedAt: decidedAt,
  promptWait: promptWait,
}) {
  if (!isRescueTurn(head)) return !1;
  let y = hasBatchablePersonPrompt(queued),
    S = rescueYieldMode(head),
    R = y && !stopLatched && S === "on";
  if (R || decidedAt === "before_start") {
    if (
      (logEvent("tengu_resume_rescue_yield", {
        outcome: fromEnum(R ? "yielded" : "kept"),
        decided_at: fromEnum(decidedAt),
        switch_state: fromEnum(S),
        prompt_waiting: y,
        stop_latched: stopLatched,
        drain_only: head.drainOnly === !0,
        prompt_wait: fromEnum(promptWait),
        error_kind: fromEnumOpt(head.yieldsToPersonPrompt),
      }),
      R)
    )
      logFeatureOk("ccr_rescue_yields_to_prompt");
    else if (y && S === "on") logFeatureSad("ccr_rescue_yields_to_prompt", "stop_latched");
  }
  return R;
}
//@ chunk-tyg7f3ek.js:116456-116517 placement
function isRescueTurn(e) {
  return e.yieldsToPersonPrompt !== void 0 && isClaudeAiChatRemote();
}
//@ chunk-tyg7f3ek.js:116517-116657 placement
function rescueYieldMode(e) {
  let n = getRemoteFeatureGateState(RESUME_RESCUE_YIELD_FLAG);
  return n === "on" &&
    (e.yieldsToPersonPrompt === "server_error" || e.yieldsToPersonPrompt === "model_not_found")
    ? getRemoteFeatureGateState(TENGU_COZY_PINWHEEL)
    : n;
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
    e.filter(isActiveHandbackPrompt).map((r) => (r.origin?.kind === "peer" ? r.origin.senderTaskId : void 0)),
  );
  return (r) => isActiveHandbackPrompt(r) || (r.handbackPointer === !0 && n.has(r.taskId));
}
//@ chunk-tyg7f3ek.js:116928-117148 placement
function shouldHandbacksStandAside({ queued: queued, stopLatched: stopLatched, next: r }) {
  if (
    !queued.some(isActiveHandbackPrompt) ||
    !hasBatchablePersonPrompt(queued) ||
    getRemoteFeatureGateState(TENGU_TENDER_MITTEN) !== "on"
  )
    return !1;
  if (r !== void 0 && isActiveHandbackPrompt(r))
    if (stopLatched) logFeatureSad("headless_handbacks_stand_aside", "stop_latched");
    else logFeatureOk("headless_handbacks_stand_aside");
  return !stopLatched;
}
/**
 * print 模式命令队列出队器：处理 poll-event、orphaned-permission、prompt 批量合并、延迟工具结果与停止门闩。
 */
//@ chunk-tyg7f3ek.js:117148-120577 placement
class CommandQueueDrain {
  messageQueue;
  prewaitLatch;
  deferredToolUsePending;
  holdsEvalSettles;
  pollEmptyDispatchStalled = !1;
  pollDispatchTarget;
  lastDispatchAborted = !1;
  constructor({ messageQueue: e, prewaitLatch: n, deferredToolUsePending: r, holdsEvalSettles: s }) {
    ((this.messageQueue = e),
      (this.prewaitLatch = n),
      (this.deferredToolUsePending = r ?? (() => !1)),
      (this.holdsEvalSettles = s ?? (() => !1)));
  }
  takeHead() {
    let exceptHandbacksThatStandAside = this.exceptHandbacksThatStandAside(im, this.messageQueue.peek(im));
    if (
      this.pollDispatchTarget !== void 0 &&
      this.messageQueue.peek(exceptHandbacksThatStandAside) === this.pollDispatchTarget &&
      !this.lastDispatchAborted
    )
      ((this.pollEmptyDispatchStalled = !0),
        logError(
          Error("attachment-only poll dispatch made no progress \u2014 falling back to value dispatch"),
        ));
    if (
      ((this.pollDispatchTarget = void 0),
      this.messageQueue.setTurnStartFoldTarget(void 0),
      (this.lastDispatchAborted = !1),
      this.holdsEvalSettles())
    )
      return;
    let peek = this.messageQueue.peek(exceptHandbacksThatStandAside),
      r = peek !== void 0 && vVs(peek);
    if (
      peek !== void 0 &&
      x4s(peek, this.pollEmptyDispatchStalled, r) &&
      this.messageQueue.peek(isOrphanedPermissionCommand) === void 0 &&
      !this.deferredHumanTurnQueued()
    ) {
      let h = r
        ? void 0
        : this.messageQueue.peek(
            (y) => exceptHandbacksThatStandAside(y) && !Kv(y) && d1r(y.mode, y.clientBashCommand),
          );
      if (h !== void 0) return this.messageQueue.dequeue((y) => y === h);
      if (((this.pollDispatchTarget = peek), r)) this.messageQueue.setTurnStartFoldTarget(peek);
      return {
        value: [],
        mode: "prompt",
        agentId: peek.agentId,
        isMeta: !0,
        pollEmptyDispatch: !0,
        skipSubmissionHooks: !0,
      };
    }
    let dequeueOrphansFirst = this.dequeueOrphansFirst(exceptHandbacksThatStandAside);
    if (
      dequeueOrphansFirst?.mode === "poll-event" &&
      dequeueOrphansFirst.pollEvent !== void 0 &&
      eCt(dequeueOrphansFirst.pollEvent.kind)
    )
      return (
        discardPollEvent(
          [dequeueOrphansFirst],
          "reserved kind refused legacy value dispatch; redelivered on reconnect",
        ),
        (this.pollEmptyDispatchStalled = !1),
        this.takeHead()
      );
    if (dequeueOrphansFirst?.mode === "poll-event" && this.pollEmptyDispatchStalled)
      this.pollEmptyDispatchStalled = !1;
    return dequeueOrphansFirst;
  }
  takeFollowers(e, n) {
    let r = [];
    if (e.mode !== "prompt") return r;
    let exceptHandbacksThatStandAside = this.exceptHandbacksThatStandAside(isDispatchablePrompt);
    while (!0) {
      let peek = this.messageQueue.peek(exceptHandbacksThatStandAside);
      if (!canMergePromptCommands(e, peek) || !n(peek)) break;
      if (this.prewaitLatch.isDoomBoundary(e, peek)) break;
      if (
        e.shouldQuery === !1 &&
        this.queuedBefore(peek).some((y) => isOrphanedPermissionCommand(y) && y.handedOffTurn !== void 0)
      )
        break;
      r.push(this.messageQueue.dequeue(exceptHandbacksThatStandAside));
    }
    return r;
  }
  holdsQueryForFollower(e, n, r) {
    if (this.deferredHumanTurnQueued()) return !1;
    let peek = this.messageQueue.peek((h) => isDispatchablePrompt(h) && h.handbackPointer !== !0 && !r(h));
    return (
      peek !== void 0 && canBatchCommands(e, peek) && n(peek) && !this.prewaitLatch.isDoomBoundary(e, peek)
    );
  }
  noteTurnEnded(e) {
    ((this.lastDispatchAborted = e), this.messageQueue.setTurnStartFoldTarget(void 0));
  }
  holdsBack(e) {
    return e.handedOffTurn !== void 0 && this.deferredToolUsePending();
  }
  queuedBefore(e) {
    let commandQueue = this.messageQueue.getCommandQueue(),
      index = commandQueue.indexOf(e);
    return index < 0 ? [] : commandQueue.slice(0, index);
  }
  deferredHumanTurnQueued() {
    return this.messageQueue.peek((e) => $f(e) && ist(e)) !== void 0;
  }
  dequeueOrphansFirst(e) {
    let n =
      this.messageQueue.peek(
        (r) => isOrphanedPermissionCommand(r) && r.handedOffTurn?.continues === !0 && !this.holdsBack(r),
      ) ??
      this.messageQueue.peek((r) => isOrphanedPermissionCommand(r) && r.handedOffTurn === void 0) ??
      this.messageQueue.peek((r) => isOrphanedPermissionCommand(r) && !this.holdsBack(r));
    if (n?.handedOffTurn !== void 0 && !n.handedOffTurn.continues) {
      let found = this.queuedBefore(n).find(isNoQueryPrompt);
      if (found !== void 0) return this.messageQueue.dequeue((s) => s === found);
    }
    if (n)
      return (
        this.messageQueue.dequeue((r) => r === n),
        logForDebugging(
          `drainCommandQueue: prioritizing orphaned-permission for toolUseID=${n.orphanedPermission?.permissionResult?.toolUseID ?? n.handedOffTurn?.toolUseIDs.join(",") ?? "<unknown>"}`,
        ),
        n
      );
    return UAs(this.messageQueue, e);
  }
  exceptHandbacksThatStandAside(e, n) {
    let commandQueue = this.messageQueue.getCommandQueue();
    if (
      !shouldHandbacksStandAside({
        queued: commandQueue,
        stopLatched: this.prewaitLatch.stopLatched,
        next: n,
      })
    )
      return e;
    let s = makeHandbackFilter(commandQueue);
    return (h) => e(h) && !s(h);
  }
}
//@ chunk-tyg7f3ek.js:120577-120637 placement
function isOrphanedPermissionCommand(e) {
  return $f(e) && e.mode === "orphaned-permission";
}
//@ chunk-tyg7f3ek.js:120637-120704 placement
function isNoQueryPrompt(e) {
  return im(e) && e.mode === "prompt" && e.shouldQuery === !1;
}
//@ chunk-tyg7f3ek.js:120704-120765 placement
function isPassiveQueueItem(e) {
  return isNoQueryPrompt(e) || (isOrphanedPermissionCommand(e) && e.handedOffTurn === void 0);
}
//@ chunk-tyg7f3ek.js:120834-120902 placement
var BANG_COMMAND_LIMITS = 65536,
  f_ = 90000,
  IR = { ackConfirmMs: 1e4, interruptedAnswerMs: 1e4 };
//@ chunk-tyg7f3ek.js:120902-121094 placement
function detectWorkerHosting() {
  if (mn()) return "anthropic_cloud";
  if (op()) return "runner";
  if (vS()) return "bridge";
  if (env.CLAUDE_CODE_ENVIRONMENT_KIND === void 0 && env.CLAUDE_CODE_REMOTE !== !0) return "local";
  return "unknown";
}
//@ chunk-tyg7f3ek.js:121094-121553 placement
var BANG_COMMAND_TEXT = "Ask Claude to run the command instead.",
  CR = 200,
  aH = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/,
  dH =
    "Not run: this machine doesn't know the session service's clock yet, so it can't tell how old the command is. Send it again in a moment, or ask Claude to run it.",
  PR =
    "Not run: the app you sent this from is missing information needed to run '!' commands safely. Update the app and try again.",
  AR = `<${BASH_STDOUT}></${BASH_STDOUT}><${BASH_STDERR}>${BASH_INTERRUPTED_NOTE}</${BASH_STDERR}><${BASH_EXIT_CODE}>130</${BASH_EXIT_CODE}>`;
//@ chunk-tyg7f3ek.js:121553-122542 placement
class BangCommandRunner {
  current = void 0;
  admitting = new Set();
  get isRunning() {
    return this.current !== void 0;
  }
  get isBusy() {
    return this.current !== void 0 || this.admitting.size > 0;
  }
  whileAdmitting(e, n, r) {
    let s = r.finally(() => {
        (this.admitting.delete(h), n.abort());
      }),
      h = { uuid: e, controller: n, settled: s.catch(() => {}) };
    return (this.admitting.add(h), s);
  }
  start(e, n, r) {
    if (this.current !== void 0) throw Error("a bash command is already running");
    let s = createChildAbortController(n),
      h = r(s.signal)
        .catch(logError)
        .finally(() => {
          if (this.current?.controller === s) this.current = void 0;
          s.abort();
        });
    return ((this.current = { uuid: e, controller: s, ended: h }), h);
  }
  interrupt(e) {
    for (let r of this.admitting)
      if (e === void 0 || (r.uuid !== void 0 && e.names([r.uuid])))
        r.controller.abort(userAbortReason("interrupt"));
    let n = this.current;
    if (n === void 0) return !1;
    if (e !== void 0 && (n.uuid === void 0 || !e.names([n.uuid]))) return !1;
    return (n.controller.abort(userAbortReason("interrupt")), !0);
  }
  async ended() {
    while (this.current !== void 0 || this.admitting.size > 0)
      await Promise.all([this.current?.ended, ...[...this.admitting].map((e) => e.settled)]);
  }
}

export {
  BangCommandRunner,
  isPassiveQueueItem,
  detectWorkerHosting,
  BANG_COMMAND_LIMITS,
  aH,
  BANG_COMMAND_TEXT,
  PR,
  dH,
  f_,
  IR,
  AR,
  CR,
  CommandQueueDrain,
  isOrphanedPermissionCommand,
  shouldYieldRescueTurn,
  maybeYieldToPersonPrompt,
};

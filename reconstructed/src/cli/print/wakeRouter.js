/**
 * cli/print/wakeRouter.ts
 *
 * 2.1.316 新增：唤醒路由（结果唤醒、待处理动作对账、权限卡片询问）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (29)
 * attribution: placement 29
 */
import { processQueuedCommands, im, Up, $f } from "../../utils/messageQueueManager.js";
import {
  Lq,
  releaseMainThreadContext,
  canReceiveNotification,
  hasUserInitiatedPending,
} from "../../tasks/taskKinds.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import {
  extractTag,
  isToolUseResultMessage,
  isContextAppendMessage,
  isHarnessMetaMessage,
  isInterruptionOnlyMessage,
} from "../../utils/messages.js";
import { OUTPUT_FILE } from "../../constants/xml.js";
import { truncate } from "../../utils/format.js";
import { JT } from "../../constants/outputLimits.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { createSignal } from "../../utils/signal.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import {
  LowLatencySubmitQueue,
  createDeliveredResultsTracker,
  MLt,
  buildTaskNotificationText,
  _pt,
  bpt,
  createStrandedResumeRetrier,
} from "./lowLatencySubmit.js";
import { userAbortReason } from "../../utils/abortController.js";
import { runSafely } from "./followUpPreempt.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { dropTextInBriefTurns } from "../../components/Messages.js";
import { isClaudeAiChatRemote } from "../../utils/entrypointKinds.js";
import { isUnownedRunningShell } from "./backgroundWindDown.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { canBatchWith } from "../print.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { looksLikeSlashInput } from "../../commands.js";
import { getLastCacheSafeParams } from "../../utils/forkedAgent.js";
import { D0e, admitsWakeSafe } from "../../tasks/backgroundLaunchRules.js";
import {
  resumeAgentBackground,
  isResumeDenied,
  ResumeAgentStateError,
  AgentStoppedByUserError,
  AgentResumePermanentlyRefusedError,
  AgentResumeTransientError,
} from "../../tools/AgentTool/resumeAgent.js";
import { contextAfterTurn } from "../../utils/permissions/toolPermissionContext.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { pruneSettledChildWork, aXn } from "../../tasks/LocalAgentTask/childWork.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { drainPendingMessages } from "../../tasks/LocalAgentTask/pendingMessages.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { uN } from "../../cost-tracker.js";
import { Kv, discardPollEvent } from "../../utils/pollEvents.js";
import { E1r } from "../../services/mcp/taskDelivery.js";
import { withDeadline } from "../../utils/sleep.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { MARKETPLACE_ONLY_MANIFEST_FIELDS } from "../../utils/plugins/validatePlugin.js";
import { isValidBridgeToolName, isDifferentString } from "../../bridge/bridgePermissionResponse.js";
import { eP } from "../../bootstrap/stateSlices.js";
import { requestIdOf, g9o } from "../../utils/sessionState.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { SKILL, SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { REPL_TOOL_NAME, REPL_TOOL_NAME_ALIAS } from "../../tools/REPLTool/constants.js";
import { CONFIRM } from "../../utils/permissions/confirmWithUser.js";
import { isPendingActionForTool } from "./parkedPrompts.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { findToolByName } from "../../Tool.js";
import { isSubagentToolRequest } from "../../remote/wireFrameShape.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { measureAnswerBounds } from "../../utils/permissions/permissionAnswer.js";

//@ chunk-tyg7f3ek.js:309636-309766 placement
function installWakeRouterKick({
  messageQueue: messageQueue,
  drain: drain,
  routeWakes: routeWakes,
  kick: kick,
}) {
  let subscribe = messageQueue.subscribe(() => {
    if ((routeWakes(), AM(messageQueue, drain))) kick();
  });
  if ((routeWakes(), AM(messageQueue, drain))) kick();
  return subscribe;
}
//@ chunk-tyg7f3ek.js:309766-309776 placement
var aq = 32;
//@ chunk-tyg7f3ek.js:309776-310442 placement
function publishQueuedWakeStatus({ messageQueue: messageQueue, getTasks: getTasks, publish: publish }) {
  let s = new Map();
  return messageQueue.subscribe(() => {
    try {
      let h = getTasks(),
        y = new Set(),
        S = !1;
      for (let R of messageQueue.getCommandQueueSnapshot()) {
        if (!processQueuedCommands(R) || R.taskId === void 0 || R.userResumeNotice === !0) continue;
        y.add(R.taskId);
        let w = h[R.taskId];
        if (s.has(R.taskId) || w === void 0 || !Lq(w) || !isTerminalTaskStatus(w.status)) continue;
        let P = typeof R.value === "string" ? extractTag(R.value, OUTPUT_FILE) : null;
        (s.set(R.taskId, {
          task_id: w.id,
          task_type: w.type,
          description: truncate(w.description, JT),
          status: w.status,
          ...(P && { output_file: P }),
        }),
          (S = !0));
      }
      for (let R of s.keys()) if (!y.has(R)) (s.delete(R), (S = !0));
      if (S) publish([...s.values()].slice(0, aq));
    } catch (error) {
      if (isAbortError(error)) logForDebugging(`undelivered-completion mirror aborted: ${error}`);
      else logError(error);
    }
  });
}
//@ chunk-tyg7f3ek.js:310442-310513 placement
function AM(e, n) {
  return !n.running && !n.inputClosed && e.peek(im) !== void 0;
}
/**
 * 唤醒路由：把任务通知、子代理结果等唤醒路由给主线程或对应子代理，处理已停止与轮次状态。
 */
//@ chunk-tyg7f3ek.js:310513-314001 placement
class WakeRouter {
  messageQueue;
  drain;
  enabled;
  transcript;
  taskRegistry;
  stopTask;
  delivery;
  turnChanged = createSignal();
  turn = { isRunning: !1, isCompacting: !1, wasStoppedByPerson: !1 };
  taken = new Set();
  pressed = [];
  movedFor = new Set();
  spared = new Set();
  constructor({
    messageQueue: e,
    drain: n,
    enabled: r,
    transcript: s,
    session: h,
    taskRegistry: y,
    stopTask: S,
    clock: R,
  }) {
    ((this.messageQueue = e),
      (this.drain = n),
      (this.enabled = r),
      (this.transcript = s),
      (this.taskRegistry = y),
      (this.stopTask = S));
    let { turn: turn } = this,
      P = () => turn.isRunning && n.turnUnderWay && !n.endSessionRequested && !isTerminalShutdown();
    this.delivery = new LowLatencySubmitQueue({
      turn: {
        agentId: void 0,
        guard: {
          get isActive() {
            return P();
          },
          get isRunning() {
            return P();
          },
          isDispatchingForModel: !1,
          subscribe: this.turnChanged.subscribe,
        },
        get abortController() {
          return n.abortController ?? null;
        },
        readEvidence: () => ({
          isHeldByDialog: !1,
          isToolCallStarting: !1,
          isCompacting: turn.isCompacting,
          isMainRequestAnnounced: !0,
        }),
        interruptForSubmit: () => n.abortController?.abort(userAbortReason("interrupt")),
        endsUnmovableShells: !1,
      },
      messageQueue: e,
      transcript: s,
      session: h,
      taskRegistry: y,
      clock: R,
      featureName: "print_send_now",
    });
  }
  takeBeforeEnqueue(e) {
    runSafely(() => {
      if (e.priority !== "now") return;
      for (let n of this.pressed.splice(0)) this.giveBackStop(n);
      if (
        e.uuid === void 0 ||
        !this.turn.isRunning ||
        this.drain.endSessionRequested ||
        isTerminalShutdown() ||
        !isPlainHumanInput(e) ||
        !this.canDeliverOverTurn() ||
        !this.enabled()
      )
        return;
      if (this.messageQueue.getCommandQueueSnapshot().some(im)) {
        (this.delivery.moveHolders(), this.movedFor.add(e.uuid));
        return;
      }
      ((e.priority = "next"), (e.sentNow = !0), this.taken.add(e.uuid));
    });
  }
  press(e) {
    runSafely(() => {
      let { uuid: uuid } = e;
      if (uuid === void 0 || !this.taken.delete(uuid)) return;
      if (!this.delivery.sendQueuedNow()) {
        (logFeatureSad("print_send_now", "declined"), this.giveBackStop(uuid));
        return;
      }
      (this.pressed.push(uuid), this.movedFor.add(uuid));
    });
  }
  canDeliverOverTurn() {
    return this.turn.isCompacting || dropTextInBriefTurns(this.transcript.getSnapshot()).size > 0;
  }
  giveBackStop(e) {
    if (this.messageQueue.getCommandQueueSnapshot().some((n) => n.uuid === e))
      (this.delivery.moveHolders(), this.movedFor.add(e), this.messageQueue.promoteToNow(e));
  }
  pressWaiting() {
    let e = !1;
    return (
      runSafely(() => {
        let filtered = this.messageQueue.getCommandQueueSnapshot().filter(im);
        if (
          filtered.length === 0 ||
          !this.turn.isRunning ||
          this.drain.endSessionRequested ||
          isTerminalShutdown() ||
          !filtered.every((s) => s.priority !== "now" && isPlainHumanInput(s)) ||
          !this.canDeliverOverTurn() ||
          !this.enabled()
        )
          return;
        if (((e = this.delivery.sendQueuedNow()), !e)) {
          logFeatureSad("print_send_now", "declined");
          return;
        }
        let r = filtered[0]?.uuid;
        if (r !== void 0) this.pressed.splice(0, this.pressed.length, r);
        for (let { uuid: uuid } of filtered) if (uuid !== void 0) this.movedFor.add(uuid);
      }),
      e
    );
  }
  notePersonsStop() {
    ((this.turn.wasStoppedByPerson = this.turn.isRunning), this.stopMovedTasks());
  }
  stopMovedTasks() {
    runSafely(() => {
      for (let e of this.movedTasks()) this.stopTask(e);
    });
  }
  movedTasks() {
    if (!isClaudeAiChatRemote()) return [];
    return Object.values(this.taskRegistry.all())
      .filter(
        (e) =>
          ((isUnownedRunningShell(e) && isLocalShellTask(e)) ||
            (e.type === "mcp_task" && e.status === "running")) &&
          e.backgroundedToDeliverMessage === !0 &&
          !this.spared.has(e.id),
      )
      .map((e) => e.id);
  }
  isTaking(e) {
    return e.uuid !== void 0 && this.taken.has(e.uuid);
  }
  noteTurnStart(e) {
    ((this.turn.isRunning = !0),
      (this.turn.isCompacting = !1),
      runSafely(() => {
        if (e.some(({ uuid: uuid }) => uuid !== void 0 && this.movedFor.has(uuid))) return;
        for (let n of this.movedTasks()) this.spared.add(n);
        this.movedFor.clear();
      }),
      this.turnChanged.emit());
  }
  noteFrame(e) {
    if (e.type === "system" && e.subtype === "status" && e.status !== "requesting")
      this.turn.isCompacting = e.status === "compacting";
  }
  noteTurnEnd() {
    if (this.turn.wasStoppedByPerson) this.stopMovedTasks();
    ((this.turn.isRunning = !1),
      (this.turn.isCompacting = !1),
      (this.turn.wasStoppedByPerson = !1),
      this.taken.clear(),
      (this.pressed.length = 0),
      this.turnChanged.emit());
  }
  dispose() {
    (this.delivery.dispose(), this.turnChanged.clear());
  }
}
//@ chunk-tyg7f3ek.js:314001-314105 placement
function isPlainHumanInput(e) {
  return (
    canBatchWith(e) &&
    isHumanOrigin(e.origin) &&
    Up(e) &&
    e.verifiedSlackHumanTurn !== !0 &&
    !e.wait &&
    !looksLikeSlashInput(e.value)
  );
}
//@ chunk-tyg7f3ek.js:314105-314133 placement
function LM(e) {
  return () => {};
}
/**
 * 把后台 agent 的结果唤醒转交给等待它的调用方；失败重试、拒绝、滞留时回滚。
 */
//@ chunk-tyg7f3ek.js:314133-317934 placement
class ResultWakeRouter {
  wakeInFlight = new Set();
  failedResultWakes = new Map();
  deniedWakes = createDeliveredResultsTracker();
  wakeRepoll;
  flushStranded = () => {};
  drain;
  messageQueue;
  getTasks;
  canUseTool;
  maxBudgetUsd;
  constructor({ drain: e, messageQueue: n, getTasks: r, canUseTool: s, maxBudgetUsd: h }) {
    ((this.drain = e),
      (this.messageQueue = n),
      (this.getTasks = r),
      (this.canUseTool = s),
      (this.maxBudgetUsd = h));
  }
  route() {
    if (this.resumesNothing()) return;
    let commandQueueSnapshot = this.messageQueue.getCommandQueueSnapshot();
    if (
      (clearTimeout(this.wakeRepoll),
      commandQueueSnapshot.some((s) => s.agentId && !$f(s) && (s.mode === "task-notification" || MLt(s))))
    )
      ((this.wakeRepoll = setTimeout((s) => s.recheckCommandQueue(), 60000, this.messageQueue)),
        this.wakeRepoll.unref?.());
    let n = getLastCacheSafeParams(),
      r = void 0;
    if (!n && !r?.size) return;
    if (n) this.flushStranded();
    for (let s of buildTaskNotificationText(commandQueueSnapshot, this.getTasks())) {
      let h = n?.toolUseContext ?? r?.get(s.agentId);
      if (h === void 0 || this.wakeInFlight.has(s.agentId) || this.deniedWakes.holds(commandQueueSnapshot, s))
        continue;
      this.wakeInFlight.add(s.agentId);
      let y = !1,
        S = D0e(),
        R = S !== void 0 && admitsWakeSafe(S, s.agentId);
      resumeAgentBackground({
        agentId: s.agentId,
        prompt: s.prompt,
        resultsOnly: s.resultsOnly,
        promptOrigin: s.origin,
        promptToolsUsed: s.toolsUsed,
        promptNoticeLengths: s.noticeLengths,
        promptNoticeOwn: s.noticeOwn,
        promptNoticeRunIds: s.noticeRunIds,
        promptIsMeta: !0,
        onDeliveryCommitted: () =>
          this.messageQueue.consume(s.consumedCommands, { reason: "delivered_to_agent" }),
        toolUseContext: contextAfterTurn(h),
        canUseTool: this.canUseTool,
      })
        .then((w) => {
          if (!isResumeDenied(w)) return;
          y = !0;
          try {
            (this.messageQueue.remove(s.consumedCommands, { reason: "dropped_by_hook" }),
              this.deniedWakes.note(commandQueueSnapshot, s.agentId),
              logForDebugging(
                `[wakeRouter] dropping ${s.consumedCommands.length} event(s) for ${s.agentId}: ${w.deniedByPlugin}`,
              ));
          } catch (error) {
            logError(error);
          }
        })
        .catch((w) => {
          y = !0;
          let P = this.getTasks()[s.agentId],
            L =
              R &&
              w instanceof ResumeAgentStateError &&
              !(w instanceof AgentStoppedByUserError) &&
              isLocalAgent(P) &&
              P.stoppedByUser !== !0 &&
              P.status !== "killed";
          if (L || w instanceof AgentStoppedByUserError || w instanceof AgentResumePermanentlyRefusedError) {
            if ((this.messageQueue.remove(s.consumedCommands, { reason: "agent_stopped" }), L))
              (logFeatureSad("subagent_launch", "subagent_wake_handed_to_main"),
                s.consumedCommands
                  .filter(({ mode: mode }) => mode === "task-notification")
                  .forEach(({ uuid: uuid, ...x }) =>
                    this.messageQueue.enqueuePendingNotification({ ...x, agentId: mainAgentId() }),
                  ));
            if ((pruneSettledChildWork(s.agentId, h.taskRegistry), !L || !aXn(s.agentId, h.taskRegistry)))
              releaseMainThreadContext(s.agentId);
            logForDebugging(
              `[wakeRouter] dropping ${s.consumedCommands.length} event(s) for ${s.agentId}: ${errorMessage(w)}`,
            );
          } else if (w instanceof ResumeAgentStateError) {
            if (
              (logForDebugging(`[wakeRouter] resume state error for ${s.agentId}: ${errorMessage(w)}`),
              s.resultsOnly && !_pt(w))
            ) {
              let q = (this.failedResultWakes.get(s.agentId) ?? 0) + 1;
              if ((this.failedResultWakes.set(s.agentId, q), q >= bpt))
                (this.failedResultWakes.delete(s.agentId), releaseMainThreadContext(s.agentId));
            }
          } else logError(w);
        })
        .finally(() => {
          if ((this.wakeInFlight.delete(s.agentId), !y))
            (this.failedResultWakes.delete(s.agentId), this.messageQueue.recheckCommandQueue());
        });
    }
  }
  startStrandedResume(e) {
    let n = createStrandedResumeRetrier({
        taskRegistry: e,
        resume: async (S, R, w) => {
          let P = this.resumesNothing() ? null : getLastCacheSafeParams();
          if (!P)
            throw new AgentResumeTransientError("the session is ending, or no main-loop context is saved");
          return resumeAgentBackground({
            agentId: S,
            prompt: R.text,
            promptOrigin: R.origin,
            promptToolsUsed: R.toolsUsed,
            promptIsMeta: R.isMeta,
            toolUseContext: contextAfterTurn(P.toolUseContext),
            canUseTool: this.canUseTool,
            userInitiated: w,
          });
        },
        onFailed: (S, R) => {
          if (R instanceof ResumeAgentStateError)
            logForDebugging(`[wakeRouter] stranded resume of ${S}: ${errorMessage(R)}`);
          else logError(R);
        },
      }),
      r = new Set(),
      s = (S) => {
        let R = e.get(S);
        if (!getLastCacheSafeParams() || (isLocalAgent(R) && R.finalizing)) {
          r.add(S);
          return;
        }
        (r.delete(S), n.dispatch(S));
      };
    this.flushStranded = () => {
      for (let S of [...r]) {
        let R = e.get(S);
        if (canReceiveNotification(R, { userInitiated: hasUserInitiatedPending(R) })) {
          s(S);
          continue;
        }
        (r.delete(S),
          getTaskRunState().agentResumeFailed.emit(S, {
            error: new ResumeAgentStateError(`Agent ${S} can no longer take its queued messages.`),
            undeliverable: drainPendingMessages(S, e),
            terminal: !0,
          }));
      }
    };
    let subscribe = getTaskRunState().agentStrandedMessages.subscribe((S) => {
        queueMicrotask(() => s(S));
      }),
      y = LM(e);
    return () => {
      (subscribe(), y(), (this.flushStranded = () => {}), n.dispose());
    };
  }
  get resuming() {
    return this.wakeInFlight.size > 0;
  }
  dispose() {
    clearTimeout(this.wakeRepoll);
  }
  resumesNothing() {
    return (
      this.drain.endSessionRequested || isShuttingDown() || isTerminalShutdown() || uN(this.maxBudgetUsd)
    );
  }
}
//@ chunk-tyg7f3ek.js:317934-318053 placement
function isPassiveCommand(e) {
  return (
    (e.shouldQuery === !1 && e.queryHeldForNextTurn !== !0) ||
    Kv(e) ||
    e.pollEmptyDispatch === !0 ||
    e.passive === !0
  );
}
//@ chunk-tyg7f3ek.js:318053-318259 placement
function sweepQueueAtTeardown({ messageQueue: messageQueue, io: io }) {
  let dequeueAllMatching = messageQueue.dequeueAllMatching($f);
  (discardPollEvent(dequeueAllMatching.filter(Kv), "session teardown"),
    E1r(dequeueAllMatching, "swept_at_teardown"));
  for (let s of dequeueAllMatching) if (s.uuid !== void 0) io.onCommandLifecycle?.(s.uuid, "discarded");
}
//@ chunk-tyg7f3ek.js:318259-318875 placement
function createTeardownStatusReporter({
  io: io,
  details: details,
  holding: holding,
  statusTaken: statusTaken,
  tornDown: tornDown,
  whenTornDown: whenTornDown,
  boundMs: boundMs,
  onUnconfirmed: onUnconfirmed,
  onError: onError,
}) {
  return async ({ afterAnswerQueued: P = !1 } = {}) => {
    let L;
    try {
      io.sessionState.notifyStateChanged("running");
      let q = await withDeadline(
        Promise.race([io.flushSessionState(), whenTornDown().then(() => !1)]),
        boundMs,
      );
      L = tornDown() ? "torn_down" : q === void 0 ? "timed_out" : q ? "cleared" : "unconfirmed";
    } catch (error) {
      (onError("clear", error), (L = "failed"));
    }
    if (L === "cleared") return !0;
    if (P) return !1;
    try {
      if (statusTaken()) return !1;
      if (holding() && details !== void 0) io.sessionState.notifyStateChanged("requires_action", details);
      else io.sessionState.notifyStateChanged("idle");
    } catch (error) {
      onError("restore", error);
    } finally {
      onUnconfirmed(L);
    }
    return !1;
  };
}
//@ chunk-tyg7f3ek.js:318912-318943 placement
var TENGU_QUIZZICAL_KNUTH = "tengu_quizzical_knuth";
//@ chunk-tyg7f3ek.js:318943-318981 placement
function isPermissionCardHoldEnabled() {
  return readFlagWithOverride(TENGU_QUIZZICAL_KNUTH, { safe: !0 });
}
/**
 * 一次权限卡片询问的生命周期（open/taken/answered），带超时与停止计数。
 */
//@ chunk-tyg7f3ek.js:318981-321266 placement
class PermissionCardAsk {
  state = { state: "open", ended: Promise.withResolvers() };
  timer;
  stops = { count: 0, last: "stopped" };
  host;
  constructor(e) {
    this.host = e;
  }
  take(e, n) {
    let card = this.host.card;
    if (
      this.state.state !== "open" ||
      n !== card.tool_use_id ||
      e.response.request_id !== card.request_id ||
      e.response.subtype !== "success"
    )
      return !1;
    let response = e.response.response,
      safeParse = MARKETPLACE_ONLY_MANIFEST_FIELDS(this.host.answerKind).safeParse(response),
      y = card.details?.tool_name;
    if (!safeParse.success) this.endCard({ state: "closed", why: "answer_not_parsed" });
    else if (
      typeof y !== "string"
        ? [response?.toolName, response?.tool_name].some((S) => typeof S === "string")
        : isValidBridgeToolName(response?.toolName, y, card.request_id) ||
          isDifferentString(response?.tool_name, y)
    )
      this.endCard({ state: "closed", why: "answer_other_tool" });
    else if (
      safeParse.data.behavior === "allow" &&
      !(this.host.allowWithoutInputIsEcho && Object.keys(safeParse.data.updatedInput ?? {}).length === 0) &&
      !eP(safeParse.data.updatedInput, card.details?.input)
    )
      this.endCard({ state: "closed", why: "answer_not_an_echo" });
    else this.endCard({ state: "answered", result: safeParse.data, readAtMs: Date.now() });
    return !0;
  }
  endCard(e) {
    let state = this.state;
    if (state.state !== "open") return;
    (clearTimeout(this.timer),
      (this.state = e),
      state.ended.resolve(),
      this.host.withdrawCard(this.host.card.request_id).catch(() => {}));
  }
  close(e) {
    if ((this.endCard({ state: "closed", why: e }), this.state.state === "answered"))
      this.state = { state: "closed", why: e };
  }
  stop(e) {
    ((this.stops = { count: this.stops.count + 1, last: e }), this.close(e));
  }
  startTimer() {
    if (this.state.state === "open" && this.timer === void 0)
      ((this.timer = setTimeout(async () => {
        let unreadAnswersRead = this.host.unreadAnswersRead();
        if (unreadAnswersRead !== void 0) await unreadAnswersRead;
        this.endCard({ state: "closed", why: "wait_lapsed" });
      }, this.host.waitMs)),
        this.timer.unref?.());
  }
  async answerFor(e) {
    if (this.state.state === "open" && (await this.host.answerOff()) === "on") this.close("switched_off");
    let state = this.state;
    if (state.state === "open") (this.startTimer(), await state.ended.promise);
    let state_2 = this.state;
    this.close("settled");
    let count = this.stops.count,
      h = state_2.state === "answered" ? await this.host.answerOff() : "off",
      y = this.stops.count === count ? void 0 : this.stops.last;
    return {
      answer: state_2.state === "answered" ? state_2.result : void 0,
      unused:
        state_2.state !== "answered"
          ? state_2.state === "closed"
            ? state_2.why
            : "wait_lapsed"
          : y !== void 0
            ? y
            : h === "on"
              ? "switched_off"
              : h === "cold"
                ? "flags_cold"
                : h === "absent"
                  ? "switch_absent"
                  : Date.now() - state_2.readAtMs > this.host.maxAnswerAgeMs
                    ? "answer_too_old"
                    : !eP(e.input, this.host.card.details?.input)
                      ? "input_differs"
                      : e.planMode() && state_2.result.behavior === "allow"
                        ? "plan_mode"
                        : void 0,
    };
  }
}
/**
 * 把 worker 记录中的 pending_action(s) 与本进程待答的权限/对话请求对齐。
 */
//@ chunk-tyg7f3ek.js:321303-322989 placement
function reconcilePendingActions(e, n, r) {
  let s = [n?.external?.pending_action, ...(n?.external?.pending_actions ?? [])],
    h = new Set(
      [...e.getPendingPermissionRequests(), ...e.getPendingUserDialogRequests()].map((L) => L.request_id),
    ),
    y = new Set(),
    S = new Set(),
    R = r?.interruptedTurn,
    w = n?.internal?.running_background_tasks,
    P = requestIdOf(n?.external?.pending_action);
  for (let L of s) {
    let q = requestIdOf(L);
    if (!L || !q || y.has(q)) continue;
    if (q === r?.exceptRequestId) {
      logForDebugging(
        `[resumeStalePromptCancel] pending_action ${q} is owned by the deferred rescue \u2014 skipping cancel`,
      );
      continue;
    }
    if (r?.keepRequestIds?.has(q)) {
      logForDebugging(
        `[resumeStalePromptCancel] pending_action ${q} is a live prompt nothing will re-ask \u2014 keeping it answerable`,
      );
      continue;
    }
    if (h.has(q)) {
      logForDebugging(
        `[resumeStalePromptCancel] pending_action ${q} is owned by this worker \u2014 redelivery handles it, skipping cancel`,
      );
      continue;
    }
    if ((y.add(q), typeof L.tool_use_id === "string" && L.tool_use_id !== "")) S.add(L.tool_use_id);
    (logForDebugging(`[resumeStalePromptCancel] cancelling stale parked prompt ${q} from a prior worker`),
      e.write({ type: "control_cancel_request", request_id: q }),
      logEvent("tengu_resume_stale_prompt_cancel", {
        kind: fromEnum(
          typeof L.tool_name === "string" && L.tool_name.startsWith("dialog:") ? "dialog" : "permission",
        ),
        withdrawn_at: lit("worker_start"),
        ...(R && {
          prompt_call: fromEnum(
            R.unresolvedToolUseIds?.has(L.tool_use_id)
              ? "in_interrupted_turn"
              : !R.wasInterrupted
                ? "no_interrupted_turn"
                : R.unresolvedToolUseIds?.size
                  ? "not_in_interrupted_turn"
                  : "no_call_ids_for_turn",
          ),
          turn_nesting_call: fromEnum(R.nestingCall),
          background_tasks: fromEnum(
            !Array.isArray(w) || w.length === 0
              ? "none"
              : w.some((x) => x?.task_type === "local_agent")
                ? "local_agent"
                : "no_local_agent_recorded",
          ),
          request_id_blanked: L.request_id !== q,
          newest_prompt: q === P,
          tool_is_web_fetch: L.tool_name === WEBFETCH,
        }),
      }));
  }
  return S;
}
//@ chunk-tyg7f3ek.js:322989-323023 placement
var cq = new Set([AGENT, TASK, SKILL, REPL_TOOL_NAME, REPL_TOOL_NAME_ALIAS]);
//@ chunk-tyg7f3ek.js:323023-323096 placement
function isDialogToolName(e) {
  return typeof e === "string" && (cq.has(e) || e.startsWith(SKILL_2));
}
//@ chunk-tyg7f3ek.js:323096-323801 placement
function classifyPendingAction(e, n, r, s) {
  let h = e?.external?.pending_action,
    y = requestIdOf(h);
  if (!h || !y || typeof h.tool_use_id !== "string" || !h.tool_use_id) return "none";
  if (typeof h.tool_name === "string" && h.tool_name.startsWith("dialog:")) return "dialog";
  if (h.tool_use_id.startsWith(CONFIRM)) return "underivable_excluded";
  if (n?.has(h.tool_use_id)) return "derivable";
  if (!n || n.size === 0) return "underivable_no_superseded";
  if (![...n].some((w) => isDialogToolName(r?.get(w)))) return "underivable_leaf_only";
  let S = e?.internal?.running_background_tasks,
    R = e?.external?.pending_actions;
  if (
    (Array.isArray(S) && S.length > 0) ||
    (Array.isArray(R) && R.some((w) => typeof w?.tool_use_id === "string" && n.has(w.tool_use_id))) ||
    s?.has(y)
  )
    return "underivable_excluded";
  return "underivable_adoptable";
}
//@ chunk-tyg7f3ek.js:323801-324443 placement
async function reattachInterruptedPrompt(e, n, r, s, h, y, S) {
  let R = { supersededToolUseIds: s, supersededToolNames: h, reattached: !1 },
    w = singlePendingAction(e);
  if (
    !S.toleratesContextAppends ||
    !S.resumeInterruptedTurn ||
    !n ||
    n.kind === "none" ||
    s === void 0 ||
    s.size > 0 ||
    w === void 0
  )
    return R;
  let P = await y(w),
    L = Array.isArray(P?.message.content)
      ? P.message.content.find((x) => x.type === "tool_use" && x.id === w)
      : void 0;
  if (!P || L?.type !== "tool_use") return R;
  if (!isPendingActionForTool(e, L.name)) return R;
  let parse = Date.parse(P.timestamp);
  if (!Number.isFinite(parse)) return R;
  if (hasRowsAfterTime(r, parse, (x) => n.message.isMeta === !0 && x.uuid === n.message.uuid)) return R;
  return { supersededToolUseIds: new Set([w]), supersededToolNames: new Map([[w, L.name]]), reattached: !0 };
}
//@ chunk-tyg7f3ek.js:324443-324681 placement
function hasRowsAfterTime(e, n, r) {
  return e.some((s) => {
    if (s.type !== "user" && s.type !== "assistant") return !1;
    let parse = Date.parse(s.timestamp);
    if (Number.isFinite(parse) && parse <= n) return !1;
    if (s.type === "assistant") return s.message.model !== SYNTHETIC_MODEL;
    return !r(s) && !isToolUseResultMessage(s) && !isContextAppendMessage(s);
  });
}
//@ chunk-tyg7f3ek.js:324681-325269 placement
function listPendingActions(e, n, r) {
  let s = [],
    h = e?.external?.pending_actions,
    y = [e?.external?.pending_action, ...(Array.isArray(h) ? h : [])];
  for (let S of y) {
    let R = requestIdOf(S);
    if (!S || !R || typeof S.tool_name !== "string") continue;
    if (n?.has(S.tool_use_id)) continue;
    if (typeof S.tool_use_id === "string" && S.tool_use_id.startsWith(CONFIRM)) continue;
    if (typeof S.agent_id === "string" && S.agent_id !== "") continue;
    let w = findToolByName(r, S.tool_name),
      P = S.request_id === "" && !!S.suppressed_request_id && S.blanked_for_size !== !0;
    if (w ? w.requiresUserInteraction?.() : P)
      s.push({ requestId: R, toolUseId: typeof S.tool_use_id === "string" ? S.tool_use_id : void 0 });
  }
  return s;
}
//@ chunk-tyg7f3ek.js:325269-325336 placement
function pendingActionRequestIds(e, n, r) {
  return new Set(listPendingActions(e, n, r).map((s) => s.requestId));
}
//@ chunk-tyg7f3ek.js:325336-325427 placement
function pendingActionToolUseIds(e, n) {
  return new Set(listPendingActions(e, void 0, n).flatMap((r) => (r.toolUseId ? [r.toolUseId] : [])));
}
//@ chunk-tyg7f3ek.js:325427-325595 placement
function hasPendingActions(e) {
  if (e?.readFailed === !0) return !0;
  let n = e?.external?.pending_actions;
  return [e?.external?.pending_action, ...(Array.isArray(n) ? n : [])].some((r) => requestIdOf(r) !== void 0);
}
//@ chunk-tyg7f3ek.js:325595-325821 placement
function pendingActionsAmbiguous(e) {
  if (e?.readFailed === !0) return !0;
  let n = e?.external?.pending_action,
    r = e?.external?.pending_actions,
    s = Array.isArray(r) ? r : [];
  if ((n != null && s.length === 0) || s.length >= g9o) return !0;
  return [n, ...s].some((h) => h != null && !isSubagentToolRequest(h));
}
//@ chunk-tyg7f3ek.js:325821-326027 placement
function singlePendingAction(e) {
  let n = e?.external?.pending_action;
  if (
    !n ||
    !requestIdOf(n) ||
    typeof n.tool_use_id !== "string" ||
    !n.tool_use_id ||
    (typeof n.tool_name === "string" && n.tool_name.startsWith("dialog:"))
  )
    return;
  return n.tool_use_id;
}
//@ chunk-tyg7f3ek.js:326027-326414 placement
function pendingActionResumeHint(e, n, r, s) {
  if (!s.resumeInterruptedTurn) return;
  if (!n || n.kind === "none") return;
  let h = e?.external?.pending_action,
    y = requestIdOf(h);
  if (!h || !y || !h.tool_use_id) return;
  if (typeof h.tool_name === "string" && h.tool_name.startsWith("dialog:")) return;
  if (!r?.has(h.tool_use_id)) return;
  return {
    request_id: y,
    tool_use_id: h.tool_use_id,
    details: h,
    ...(isPlainObject(h.input) && measureAnswerBounds(h.input).within && { recordedInput: h.input }),
  };
}
//@ chunk-tyg7f3ek.js:326414-326552 placement
function interruptedPromptUuid(e) {
  if (e?.kind !== "interrupted_prompt") return;
  return e.interruptedTurnUserMessageUuid ?? (e.message.isMeta ? void 0 : e.message.uuid);
}
//@ chunk-tyg7f3ek.js:326552-326687 placement = countUserPromptsFromEntries (1)
function countUserPromptsFromEntries_5(entries) {
  if ("isSidechain" in entries && entries.isSidechain === !0) return !1;
  return entries.type === "assistant"
    ? entries.message.model !== SYNTHETIC_MODEL
    : isHarnessMetaMessage(entries) ||
        (isInterruptionOnlyMessage(entries) && !isToolUseResultMessage(entries));
}

export {
  interruptedPromptUuid,
  countUserPromptsFromEntries_5,
  isPermissionCardHoldEnabled,
  pendingActionsAmbiguous,
  createTeardownStatusReporter,
  isPassiveCommand,
  WakeRouter,
  publishQueuedWakeStatus,
  ResultWakeRouter,
  installWakeRouterKick,
  pendingActionToolUseIds,
  singlePendingAction,
  hasPendingActions,
  sweepQueueAtTeardown,
  PermissionCardAsk,
  reattachInterruptedPrompt,
  pendingActionRequestIds,
  classifyPendingAction,
  pendingActionResumeHint,
  isDialogToolName,
  reconcilePendingActions,
  hasRowsAfterTime,
};

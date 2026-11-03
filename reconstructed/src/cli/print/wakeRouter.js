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
import {
  processQueuedCommands,
  isActiveMainAgentCommand,
  isRefillableInput,
  isMainAgentCommand,
} from "../../utils/messageQueueManager.js";
import {
  isWaitableAgentOrWorkflow,
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
import { MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { createSignal } from "../../utils/signal.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import {
  LowLatencySubmitQueue,
  createDeliveredResultsTracker,
  isResultOnlyTaskNotification,
  buildTaskNotificationText,
  isRetryableAgentError,
  MAX_TRANSIENT_RESUME_RETRIES,
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
import { getBackgroundLaunchRule, admitsWakeSafe } from "../../tasks/backgroundLaunchRules.js";
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
import { pruneSettledChildWork, hasAnyKeepaliveReason } from "../../tasks/LocalAgentTask/childWork.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { drainPendingMessages } from "../../tasks/LocalAgentTask/pendingMessages.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { hasReachedBudget } from "../../cost-tracker.js";
import { isPollEventMode, discardPollEvent } from "../../utils/pollEvents.js";
import { logDeliveryFailureForEndings } from "../../services/mcp/taskDelivery.js";
import { withDeadline } from "../../utils/sleep.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { MARKETPLACE_ONLY_MANIFEST_FIELDS } from "../../utils/plugins/validatePlugin.js";
import { isValidBridgeToolName, isDifferentString } from "../../bridge/bridgePermissionResponse.js";
import { deepEqualIgnoringUndefined } from "../../bootstrap/stateSlices.js";
import { requestIdOf, MAX_PENDING_ACTION_ARGS } from "../../utils/sessionState.js";
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
function installWakeRouterKick({ messageQueue, drain, routeWakes, kick }) {
  let h = messageQueue.subscribe(() => {
    routeWakes();
    if (shouldKickForQueuedWake(messageQueue, drain)) kick();
  });
  routeWakes();
  if (shouldKickForQueuedWake(messageQueue, drain)) kick();
  return h;
}
//@ chunk-tyg7f3ek.js:309766-309776 placement
var MAX_PUBLISHED_QUEUE_WAKES = 32;
//@ chunk-tyg7f3ek.js:309776-310442 placement
function publishQueuedWakeStatus({ messageQueue, getTasks, publish }) {
  let s = new Map();
  return messageQueue.subscribe(() => {
    try {
      let tasks = getTasks();
      let y = new Set();
      let S = false;
      for (let R of messageQueue.getCommandQueueSnapshot()) {
        if (!processQueuedCommands(R) || R.taskId === undefined || R.userResumeNotice === true) continue;
        y.add(R.taskId);
        let w = tasks[R.taskId];
        if (
          s.has(R.taskId) ||
          w === undefined ||
          !isWaitableAgentOrWorkflow(w) ||
          !isTerminalTaskStatus(w.status)
        )
          continue;
        let P = typeof R.value === "string" ? extractTag(R.value, OUTPUT_FILE) : null;
        s.set(R.taskId, {
          task_id: w.id,
          task_type: w.type,
          description: truncate(w.description, MAX_DESCRIPTION_CHARS),
          status: w.status,
          ...(P && {
            output_file: P,
          }),
        });
        S = true;
      }
      for (let key of s.keys())
        if (!y.has(key)) {
          s.delete(key);
          S = true;
        }
      if (S) publish([...s.values()].slice(0, MAX_PUBLISHED_QUEUE_WAKES));
    } catch (error) {
      if (isAbortError(error)) logForDebugging(`undelivered-completion mirror aborted: ${error}`);
      else logError(error);
    }
  });
}
//@ chunk-tyg7f3ek.js:310442-310513 placement
function shouldKickForQueuedWake(messageQueue, drain) {
  return !drain.running && !drain.inputClosed && messageQueue.peek(isActiveMainAgentCommand) !== undefined;
}
//@ chunk-tyg7f3ek.js:310513-314001 placement
/**
 * 唤醒路由：把任务通知、子代理结果等唤醒路由给主线程或对应子代理，处理已停止与轮次状态。
 */
class WakeRouter {
  messageQueue;
  drain;
  enabled;
  transcript;
  taskRegistry;
  stopTask;
  delivery;
  turnChanged = createSignal();
  turn = {
    isRunning: false,
    isCompacting: false,
    wasStoppedByPerson: false,
  };
  taken = new Set();
  pressed = [];
  movedFor = new Set();
  spared = new Set();
  constructor({ messageQueue, drain, enabled, transcript, session, taskRegistry, stopTask, clock }) {
    this.messageQueue = messageQueue;
    this.drain = drain;
    this.enabled = enabled;
    this.transcript = transcript;
    this.taskRegistry = taskRegistry;
    this.stopTask = stopTask;
    let { turn } = this;
    let P = () => turn.isRunning && drain.turnUnderWay && !drain.endSessionRequested && !isTerminalShutdown();
    this.delivery = new LowLatencySubmitQueue({
      turn: {
        agentId: undefined,
        guard: {
          get isActive() {
            return P();
          },
          get isRunning() {
            return P();
          },
          isDispatchingForModel: false,
          subscribe: this.turnChanged.subscribe,
        },
        get abortController() {
          return drain.abortController ?? null;
        },
        readEvidence: () => ({
          isHeldByDialog: false,
          isToolCallStarting: false,
          isCompacting: turn.isCompacting,
          isMainRequestAnnounced: true,
        }),
        interruptForSubmit: () => drain.abortController?.abort(userAbortReason("interrupt")),
        endsUnmovableShells: false,
      },
      messageQueue,
      transcript,
      session,
      taskRegistry,
      clock,
      featureName: "print_send_now",
    });
  }
  takeBeforeEnqueue(e) {
    runSafely(() => {
      if (e.priority !== "now") return;
      for (let n of this.pressed.splice(0)) this.giveBackStop(n);
      if (
        e.uuid === undefined ||
        !this.turn.isRunning ||
        this.drain.endSessionRequested ||
        isTerminalShutdown() ||
        !isPlainHumanInput(e) ||
        !this.canDeliverOverTurn() ||
        !this.enabled()
      )
        return;
      if (this.messageQueue.getCommandQueueSnapshot().some(isActiveMainAgentCommand)) {
        this.delivery.moveHolders();
        this.movedFor.add(e.uuid);
        return;
      }
      e.priority = "next";
      e.sentNow = true;
      this.taken.add(e.uuid);
    });
  }
  press(e) {
    runSafely(() => {
      let { uuid } = e;
      if (uuid === undefined || !this.taken.delete(uuid)) return;
      if (!this.delivery.sendQueuedNow()) {
        logFeatureSad("print_send_now", "declined");
        this.giveBackStop(uuid);
        return;
      }
      this.pressed.push(uuid);
      this.movedFor.add(uuid);
    });
  }
  canDeliverOverTurn() {
    return this.turn.isCompacting || dropTextInBriefTurns(this.transcript.getSnapshot()).size > 0;
  }
  giveBackStop(e) {
    if (this.messageQueue.getCommandQueueSnapshot().some((n) => n.uuid === e)) {
      this.delivery.moveHolders();
      this.movedFor.add(e);
      this.messageQueue.promoteToNow(e);
    }
  }
  pressWaiting() {
    let e = false;
    runSafely(() => {
      let filtered = this.messageQueue.getCommandQueueSnapshot().filter(isActiveMainAgentCommand);
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
      e = this.delivery.sendQueuedNow();
      if (!e) {
        logFeatureSad("print_send_now", "declined");
        return;
      }
      let uuid = filtered[0]?.uuid;
      if (uuid !== undefined) this.pressed.splice(0, this.pressed.length, uuid);
      for (let { uuid } of filtered) if (uuid !== undefined) this.movedFor.add(uuid);
    });
    return e;
  }
  notePersonsStop() {
    this.turn.wasStoppedByPerson = this.turn.isRunning;
    this.stopMovedTasks();
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
          e.backgroundedToDeliverMessage === true &&
          !this.spared.has(e.id),
      )
      .map((e) => e.id);
  }
  isTaking(e) {
    return e.uuid !== undefined && this.taken.has(e.uuid);
  }
  noteTurnStart(e) {
    this.turn.isRunning = true;
    this.turn.isCompacting = false;
    runSafely(() => {
      if (e.some(({ uuid }) => uuid !== undefined && this.movedFor.has(uuid))) return;
      for (let n of this.movedTasks()) this.spared.add(n);
      this.movedFor.clear();
    });
    this.turnChanged.emit();
  }
  noteFrame(e) {
    if (e.type === "system" && e.subtype === "status" && e.status !== "requesting")
      this.turn.isCompacting = e.status === "compacting";
  }
  noteTurnEnd() {
    if (this.turn.wasStoppedByPerson) this.stopMovedTasks();
    this.turn.isRunning = false;
    this.turn.isCompacting = false;
    this.turn.wasStoppedByPerson = false;
    this.taken.clear();
    this.pressed.length = 0;
    this.turnChanged.emit();
  }
  dispose() {
    this.delivery.dispose();
    this.turnChanged.clear();
  }
}
//@ chunk-tyg7f3ek.js:314001-314105 placement
function isPlainHumanInput(e) {
  return (
    canBatchWith(e) &&
    isHumanOrigin(e.origin) &&
    isRefillableInput(e) &&
    e.verifiedSlackHumanTurn !== true &&
    !e.wait &&
    !looksLikeSlashInput(e.value)
  );
}
//@ chunk-tyg7f3ek.js:314105-314133 placement
function noop(e) {
  return () => {};
}
//@ chunk-tyg7f3ek.js:314133-317934 placement
/**
 * 把后台 agent 的结果唤醒转交给等待它的调用方；失败重试、拒绝、滞留时回滚。
 */
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
  constructor({ drain, messageQueue, getTasks, canUseTool, maxBudgetUsd }) {
    this.drain = drain;
    this.messageQueue = messageQueue;
    this.getTasks = getTasks;
    this.canUseTool = canUseTool;
    this.maxBudgetUsd = maxBudgetUsd;
  }
  route() {
    if (this.resumesNothing()) return;
    let commandQueueSnapshot = this.messageQueue.getCommandQueueSnapshot();
    clearTimeout(this.wakeRepoll);
    if (
      commandQueueSnapshot.some(
        (s) =>
          s.agentId &&
          !isMainAgentCommand(s) &&
          (s.mode === "task-notification" || isResultOnlyTaskNotification(s)),
      )
    ) {
      this.wakeRepoll = setTimeout((s) => s.recheckCommandQueue(), 60000, this.messageQueue);
      this.wakeRepoll.unref?.();
    }
    let lastCacheSafeParams = getLastCacheSafeParams();
    let r = undefined;
    if (!lastCacheSafeParams && !r?.size) return;
    if (lastCacheSafeParams) this.flushStranded();
    for (let s of buildTaskNotificationText(commandQueueSnapshot, this.getTasks())) {
      let h = lastCacheSafeParams?.toolUseContext ?? r?.get(s.agentId);
      if (
        h === undefined ||
        this.wakeInFlight.has(s.agentId) ||
        this.deniedWakes.holds(commandQueueSnapshot, s)
      )
        continue;
      this.wakeInFlight.add(s.agentId);
      let y = false;
      let backgroundLaunchRule = getBackgroundLaunchRule();
      let R = backgroundLaunchRule !== undefined && admitsWakeSafe(backgroundLaunchRule, s.agentId);
      resumeAgentBackground({
        agentId: s.agentId,
        prompt: s.prompt,
        resultsOnly: s.resultsOnly,
        promptOrigin: s.origin,
        promptToolsUsed: s.toolsUsed,
        promptNoticeLengths: s.noticeLengths,
        promptNoticeOwn: s.noticeOwn,
        promptNoticeRunIds: s.noticeRunIds,
        promptIsMeta: true,
        onDeliveryCommitted: () =>
          this.messageQueue.consume(s.consumedCommands, {
            reason: "delivered_to_agent",
          }),
        toolUseContext: contextAfterTurn(h),
        canUseTool: this.canUseTool,
      })
        .then((w) => {
          if (!isResumeDenied(w)) return;
          y = true;
          try {
            this.messageQueue.remove(s.consumedCommands, {
              reason: "dropped_by_hook",
            });
            this.deniedWakes.note(commandQueueSnapshot, s.agentId);
            logForDebugging(
              `[wakeRouter] dropping ${s.consumedCommands.length} event(s) for ${s.agentId}: ${w.deniedByPlugin}`,
            );
          } catch (error) {
            logError(error);
          }
        })
        .catch((error) => {
          y = true;
          let P = this.getTasks()[s.agentId];
          let L =
            R &&
            error instanceof ResumeAgentStateError &&
            !(error instanceof AgentStoppedByUserError) &&
            isLocalAgent(P) &&
            P.stoppedByUser !== true &&
            P.status !== "killed";
          if (
            L ||
            error instanceof AgentStoppedByUserError ||
            error instanceof AgentResumePermanentlyRefusedError
          ) {
            this.messageQueue.remove(s.consumedCommands, {
              reason: "agent_stopped",
            });
            if (L) {
              logFeatureSad("subagent_launch", "subagent_wake_handed_to_main");
              s.consumedCommands
                .filter(({ mode }) => mode === "task-notification")
                .forEach(({ uuid, ...x }) =>
                  this.messageQueue.enqueuePendingNotification({
                    ...x,
                    agentId: mainAgentId(),
                  }),
                );
            }
            pruneSettledChildWork(s.agentId, h.taskRegistry);
            if (!L || !hasAnyKeepaliveReason(s.agentId, h.taskRegistry)) releaseMainThreadContext(s.agentId);
            logForDebugging(
              `[wakeRouter] dropping ${s.consumedCommands.length} event(s) for ${s.agentId}: ${errorMessage(error)}`,
            );
          } else if (error instanceof ResumeAgentStateError) {
            logForDebugging(`[wakeRouter] resume state error for ${s.agentId}: ${errorMessage(error)}`);
            if (s.resultsOnly && !isRetryableAgentError(error)) {
              let q = (this.failedResultWakes.get(s.agentId) ?? 0) + 1;
              this.failedResultWakes.set(s.agentId, q);
              if (q >= MAX_TRANSIENT_RESUME_RETRIES) {
                this.failedResultWakes.delete(s.agentId);
                releaseMainThreadContext(s.agentId);
              }
            }
          } else logError(error);
        })
        .finally(() => {
          this.wakeInFlight.delete(s.agentId);
          if (!y) {
            this.failedResultWakes.delete(s.agentId);
            this.messageQueue.recheckCommandQueue();
          }
        });
    }
  }
  startStrandedResume(e) {
    let strandedResumeRetrier = createStrandedResumeRetrier({
      taskRegistry: e,
      resume: async (agentId, R, userInitiated) => {
        let P = this.resumesNothing() ? null : getLastCacheSafeParams();
        if (!P)
          throw new AgentResumeTransientError("the session is ending, or no main-loop context is saved");
        return resumeAgentBackground({
          agentId,
          prompt: R.text,
          promptOrigin: R.origin,
          promptToolsUsed: R.toolsUsed,
          promptIsMeta: R.isMeta,
          toolUseContext: contextAfterTurn(P.toolUseContext),
          canUseTool: this.canUseTool,
          userInitiated,
        });
      },
      onFailed: (S, R) => {
        if (R instanceof ResumeAgentStateError)
          logForDebugging(`[wakeRouter] stranded resume of ${S}: ${errorMessage(R)}`);
        else logError(R);
      },
    });
    let r = new Set();
    let s = (S) => {
      let R = e.get(S);
      if (!getLastCacheSafeParams() || (isLocalAgent(R) && R.finalizing)) {
        r.add(S);
        return;
      }
      r.delete(S);
      strandedResumeRetrier.dispatch(S);
    };
    this.flushStranded = () => {
      for (let S of [...r]) {
        let R = e.get(S);
        if (
          canReceiveNotification(R, {
            userInitiated: hasUserInitiatedPending(R),
          })
        ) {
          s(S);
          continue;
        }
        r.delete(S);
        getTaskRunState().agentResumeFailed.emit(S, {
          error: new ResumeAgentStateError(`Agent ${S} can no longer take its queued messages.`),
          undeliverable: drainPendingMessages(S, e),
          terminal: true,
        });
      }
    };
    let h = getTaskRunState().agentStrandedMessages.subscribe((S) => {
      queueMicrotask(() => s(S));
    });
    let y = noop(e);
    return () => {
      h();
      y();
      this.flushStranded = () => {};
      strandedResumeRetrier.dispose();
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
      this.drain.endSessionRequested ||
      isShuttingDown() ||
      isTerminalShutdown() ||
      hasReachedBudget(this.maxBudgetUsd)
    );
  }
}
//@ chunk-tyg7f3ek.js:317934-318053 placement
function isPassiveCommand(e) {
  return (
    (e.shouldQuery === false && e.queryHeldForNextTurn !== true) ||
    isPollEventMode(e) ||
    e.pollEmptyDispatch === true ||
    e.passive === true
  );
}
//@ chunk-tyg7f3ek.js:318053-318259 placement
function sweepQueueAtTeardown({ messageQueue, io }) {
  let r = messageQueue.dequeueAllMatching(isMainAgentCommand);
  discardPollEvent(r.filter(isPollEventMode), "session teardown");
  logDeliveryFailureForEndings(r, "swept_at_teardown");
  for (let s of r) if (s.uuid !== undefined) io.onCommandLifecycle?.(s.uuid, "discarded");
}
//@ chunk-tyg7f3ek.js:318259-318875 placement
function createTeardownStatusReporter({
  io,
  details,
  holding,
  statusTaken,
  tornDown,
  whenTornDown,
  boundMs,
  onUnconfirmed,
  onError,
}) {
  return async ({ afterAnswerQueued: P = false } = {}) => {
    let L;
    try {
      io.sessionState.notifyStateChanged("running");
      let q = await withDeadline(
        Promise.race([io.flushSessionState(), whenTornDown().then(() => false)]),
        boundMs,
      );
      L = tornDown() ? "torn_down" : q === undefined ? "timed_out" : q ? "cleared" : "unconfirmed";
    } catch (error) {
      onError("clear", error);
      L = "failed";
    }
    if (L === "cleared") return true;
    if (P) return false;
    try {
      if (statusTaken()) return false;
      if (holding() && details !== undefined) io.sessionState.notifyStateChanged("requires_action", details);
      else io.sessionState.notifyStateChanged("idle");
    } catch (error) {
      onError("restore", error);
    } finally {
      onUnconfirmed(L);
    }
    return false;
  };
}
//@ chunk-tyg7f3ek.js:318912-318943 placement
var TENGU_QUIZZICAL_KNUTH = "tengu_quizzical_knuth";
//@ chunk-tyg7f3ek.js:318943-318981 placement
function isPermissionCardHoldEnabled() {
  return readFlagWithOverride(TENGU_QUIZZICAL_KNUTH, {
    safe: true,
  });
}
//@ chunk-tyg7f3ek.js:318981-321266 placement
/**
 * 一次权限卡片询问的生命周期（open/taken/answered），带超时与停止计数。
 */
class PermissionCardAsk {
  state = {
    state: "open",
    ended: Promise.withResolvers(),
  };
  timer;
  stops = {
    count: 0,
    last: "stopped",
  };
  host;
  constructor(host) {
    this.host = host;
  }
  take(e, n) {
    let card = this.host.card;
    if (
      this.state.state !== "open" ||
      n !== card.tool_use_id ||
      e.response.request_id !== card.request_id ||
      e.response.subtype !== "success"
    )
      return false;
    let response = e.response.response;
    let h = MARKETPLACE_ONLY_MANIFEST_FIELDS(this.host.answerKind).safeParse(response);
    let toolName = card.details?.tool_name;
    if (!h.success)
      this.endCard({
        state: "closed",
        why: "answer_not_parsed",
      });
    else if (
      typeof toolName !== "string"
        ? [response?.toolName, response?.tool_name].some((S) => typeof S === "string")
        : isValidBridgeToolName(response?.toolName, toolName, card.request_id) ||
          isDifferentString(response?.tool_name, toolName)
    )
      this.endCard({
        state: "closed",
        why: "answer_other_tool",
      });
    else if (
      h.data.behavior === "allow" &&
      !(this.host.allowWithoutInputIsEcho && Object.keys(h.data.updatedInput ?? {}).length === 0) &&
      !deepEqualIgnoringUndefined(h.data.updatedInput, card.details?.input)
    )
      this.endCard({
        state: "closed",
        why: "answer_not_an_echo",
      });
    else
      this.endCard({
        state: "answered",
        result: h.data,
        readAtMs: Date.now(),
      });
    return true;
  }
  endCard(state) {
    let state_2 = this.state;
    if (state_2.state !== "open") return;
    clearTimeout(this.timer);
    this.state = state;
    state_2.ended.resolve();
    this.host.withdrawCard(this.host.card.request_id).catch(() => {});
  }
  close(why) {
    this.endCard({
      state: "closed",
      why,
    });
    if (this.state.state === "answered")
      this.state = {
        state: "closed",
        why,
      };
  }
  stop(e) {
    this.stops = {
      count: this.stops.count + 1,
      last: e,
    };
    this.close(e);
  }
  startTimer() {
    if (this.state.state === "open" && this.timer === undefined) {
      this.timer = setTimeout(async () => {
        let e = this.host.unreadAnswersRead();
        if (e !== undefined) await e;
        this.endCard({
          state: "closed",
          why: "wait_lapsed",
        });
      }, this.host.waitMs);
      this.timer.unref?.();
    }
  }
  async answerFor(e) {
    if (this.state.state === "open" && (await this.host.answerOff()) === "on") this.close("switched_off");
    let state = this.state;
    if (state.state === "open") {
      this.startTimer();
      await state.ended.promise;
    }
    let state_2 = this.state;
    this.close("settled");
    let count = this.stops.count;
    let h = state_2.state === "answered" ? await this.host.answerOff() : "off";
    let last = this.stops.count === count ? undefined : this.stops.last;
    return {
      answer: state_2.state === "answered" ? state_2.result : undefined,
      unused:
        state_2.state !== "answered"
          ? state_2.state === "closed"
            ? state_2.why
            : "wait_lapsed"
          : last !== undefined
            ? last
            : h === "on"
              ? "switched_off"
              : h === "cold"
                ? "flags_cold"
                : h === "absent"
                  ? "switch_absent"
                  : Date.now() - state_2.readAtMs > this.host.maxAnswerAgeMs
                    ? "answer_too_old"
                    : !deepEqualIgnoringUndefined(e.input, this.host.card.details?.input)
                      ? "input_differs"
                      : e.planMode() && state_2.result.behavior === "allow"
                        ? "plan_mode"
                        : undefined,
    };
  }
}
//@ chunk-tyg7f3ek.js:321303-322989 placement
/**
 * 把 worker 记录中的 pending_action(s) 与本进程待答的权限/对话请求对齐。
 */
function reconcilePendingActions(e, n, r) {
  let s = [n?.external?.pending_action, ...(n?.external?.pending_actions ?? [])];
  let h = new Set(
    [...e.getPendingPermissionRequests(), ...e.getPendingUserDialogRequests()].map((L) => L.request_id),
  );
  let y = new Set();
  let S = new Set();
  let interruptedTurn = r?.interruptedTurn;
  let runningBackgroundTasks = n?.internal?.running_background_tasks;
  let P = requestIdOf(n?.external?.pending_action);
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
    y.add(q);
    if (typeof L.tool_use_id === "string" && L.tool_use_id !== "") S.add(L.tool_use_id);
    logForDebugging(`[resumeStalePromptCancel] cancelling stale parked prompt ${q} from a prior worker`);
    e.write({
      type: "control_cancel_request",
      request_id: q,
    });
    logEvent("tengu_resume_stale_prompt_cancel", {
      kind: fromEnum(
        typeof L.tool_name === "string" && L.tool_name.startsWith("dialog:") ? "dialog" : "permission",
      ),
      withdrawn_at: lit("worker_start"),
      ...(interruptedTurn && {
        prompt_call: fromEnum(
          interruptedTurn.unresolvedToolUseIds?.has(L.tool_use_id)
            ? "in_interrupted_turn"
            : !interruptedTurn.wasInterrupted
              ? "no_interrupted_turn"
              : interruptedTurn.unresolvedToolUseIds?.size
                ? "not_in_interrupted_turn"
                : "no_call_ids_for_turn",
        ),
        turn_nesting_call: fromEnum(interruptedTurn.nestingCall),
        background_tasks: fromEnum(
          !Array.isArray(runningBackgroundTasks) || runningBackgroundTasks.length === 0
            ? "none"
            : runningBackgroundTasks.some(
                  (runningBackgroundTask) => runningBackgroundTask?.task_type === "local_agent",
                )
              ? "local_agent"
              : "no_local_agent_recorded",
        ),
        request_id_blanked: L.request_id !== q,
        newest_prompt: q === P,
        tool_is_web_fetch: L.tool_name === WEBFETCH,
      }),
    });
  }
  return S;
}
//@ chunk-tyg7f3ek.js:322989-323023 placement
var DIALOG_TOOL_NAMES = new Set([AGENT, TASK, SKILL, REPL_TOOL_NAME, REPL_TOOL_NAME_ALIAS]);
//@ chunk-tyg7f3ek.js:323023-323096 placement
function isDialogToolName(e) {
  return typeof e === "string" && (DIALOG_TOOL_NAMES.has(e) || e.startsWith(SKILL_2));
}
//@ chunk-tyg7f3ek.js:323096-323801 placement
function classifyPendingAction(restored, n, supersededToolNames, s) {
  let pendingAction = restored?.external?.pending_action;
  let y = requestIdOf(pendingAction);
  if (!pendingAction || !y || typeof pendingAction.tool_use_id !== "string" || !pendingAction.tool_use_id)
    return "none";
  if (typeof pendingAction.tool_name === "string" && pendingAction.tool_name.startsWith("dialog:"))
    return "dialog";
  if (pendingAction.tool_use_id.startsWith(CONFIRM)) return "underivable_excluded";
  if (n?.has(pendingAction.tool_use_id)) return "derivable";
  if (!n || n.size === 0) return "underivable_no_superseded";
  if (![...n].some((w) => isDialogToolName(supersededToolNames?.get(w)))) return "underivable_leaf_only";
  let runningBackgroundTasks = restored?.internal?.running_background_tasks;
  let pendingActions = restored?.external?.pending_actions;
  if (
    (Array.isArray(runningBackgroundTasks) && runningBackgroundTasks.length > 0) ||
    (Array.isArray(pendingActions) &&
      pendingActions.some(
        (pendingAction) => typeof pendingAction?.tool_use_id === "string" && n.has(pendingAction.tool_use_id),
      )) ||
    s?.has(y)
  )
    return "underivable_excluded";
  return "underivable_adoptable";
}
//@ chunk-tyg7f3ek.js:323801-324443 placement
async function reattachInterruptedPrompt(
  restored,
  turnInterruptionState,
  chain,
  supersededToolUseIds,
  supersededToolNames,
  findUnresolved,
  lane,
) {
  let R = {
    supersededToolUseIds,
    supersededToolNames,
    reattached: false,
  };
  let w = singlePendingAction(restored);
  if (
    !lane.toleratesContextAppends ||
    !lane.resumeInterruptedTurn ||
    !turnInterruptionState ||
    turnInterruptionState.kind === "none" ||
    supersededToolUseIds === undefined ||
    supersededToolUseIds.size > 0 ||
    w === undefined
  )
    return R;
  let P = await findUnresolved(w);
  let L = Array.isArray(P?.message.content)
    ? P.message.content.find((x) => x.type === "tool_use" && x.id === w)
    : undefined;
  if (!P || L?.type !== "tool_use") return R;
  if (!isPendingActionForTool(restored, L.name)) return R;
  let timestamp = Date.parse(P.timestamp);
  if (!Number.isFinite(timestamp)) return R;
  if (
    hasRowsAfterTime(
      chain,
      timestamp,
      (x) => turnInterruptionState.message.isMeta === true && x.uuid === turnInterruptionState.message.uuid,
    )
  )
    return R;
  return {
    supersededToolUseIds: new Set([w]),
    supersededToolNames: new Map([[w, L.name]]),
    reattached: true,
  };
}
//@ chunk-tyg7f3ek.js:324443-324681 placement
function hasRowsAfterTime(chain, n, r) {
  return chain.some((s) => {
    if (s.type !== "user" && s.type !== "assistant") return false;
    let timestamp = Date.parse(s.timestamp);
    if (Number.isFinite(timestamp) && timestamp <= n) return false;
    if (s.type === "assistant") return s.message.model !== SYNTHETIC_MODEL;
    return !r(s) && !isToolUseResultMessage(s) && !isContextAppendMessage(s);
  });
}
//@ chunk-tyg7f3ek.js:324681-325269 placement
function listPendingActions(e, n, r) {
  let s = [];
  let pendingActions = e?.external?.pending_actions;
  let y = [e?.external?.pending_action, ...(Array.isArray(pendingActions) ? pendingActions : [])];
  for (let S of y) {
    let R = requestIdOf(S);
    if (!S || !R || typeof S.tool_name !== "string") continue;
    if (n?.has(S.tool_use_id)) continue;
    if (typeof S.tool_use_id === "string" && S.tool_use_id.startsWith(CONFIRM)) continue;
    if (typeof S.agent_id === "string" && S.agent_id !== "") continue;
    let toolByName = findToolByName(r, S.tool_name);
    let P = S.request_id === "" && !!S.suppressed_request_id && S.blanked_for_size !== true;
    if (toolByName ? toolByName.requiresUserInteraction?.() : P)
      s.push({
        requestId: R,
        toolUseId: typeof S.tool_use_id === "string" ? S.tool_use_id : undefined,
      });
  }
  return s;
}
//@ chunk-tyg7f3ek.js:325269-325336 placement
function pendingActionRequestIds(restored, n, tools) {
  return new Set(listPendingActions(restored, n, tools).map((s) => s.requestId));
}
//@ chunk-tyg7f3ek.js:325336-325427 placement
function pendingActionToolUseIds(e, n) {
  return new Set(listPendingActions(e, undefined, n).flatMap((r) => (r.toolUseId ? [r.toolUseId] : [])));
}
//@ chunk-tyg7f3ek.js:325427-325595 placement
function hasPendingActions(e) {
  if (e?.readFailed === true) return true;
  let pendingActions = e?.external?.pending_actions;
  return [e?.external?.pending_action, ...(Array.isArray(pendingActions) ? pendingActions : [])].some(
    (r) => requestIdOf(r) !== undefined,
  );
}
//@ chunk-tyg7f3ek.js:325595-325821 placement
function pendingActionsAmbiguous(restoredWorkerState) {
  if (restoredWorkerState?.readFailed === true) return true;
  let pendingAction = restoredWorkerState?.external?.pending_action;
  let pendingActions = restoredWorkerState?.external?.pending_actions;
  let s = Array.isArray(pendingActions) ? pendingActions : [];
  if ((pendingAction != null && s.length === 0) || s.length >= MAX_PENDING_ACTION_ARGS) return true;
  return [pendingAction, ...s].some((h) => h != null && !isSubagentToolRequest(h));
}
//@ chunk-tyg7f3ek.js:325821-326027 placement
function singlePendingAction(e) {
  let pendingAction = e?.external?.pending_action;
  if (
    !pendingAction ||
    !requestIdOf(pendingAction) ||
    typeof pendingAction.tool_use_id !== "string" ||
    !pendingAction.tool_use_id ||
    (typeof pendingAction.tool_name === "string" && pendingAction.tool_name.startsWith("dialog:"))
  )
    return;
  return pendingAction.tool_use_id;
}
//@ chunk-tyg7f3ek.js:326027-326414 placement
function pendingActionResumeHint(restored, n, r, lane) {
  if (!lane.resumeInterruptedTurn) return;
  if (!n || n.kind === "none") return;
  let pendingAction = restored?.external?.pending_action;
  let y = requestIdOf(pendingAction);
  if (!pendingAction || !y || !pendingAction.tool_use_id) return;
  if (typeof pendingAction.tool_name === "string" && pendingAction.tool_name.startsWith("dialog:")) return;
  if (!r?.has(pendingAction.tool_use_id)) return;
  return {
    request_id: y,
    tool_use_id: pendingAction.tool_use_id,
    details: pendingAction,
    ...(isPlainObject(pendingAction.input) &&
      measureAnswerBounds(pendingAction.input).within && {
        recordedInput: pendingAction.input,
      }),
  };
}
//@ chunk-tyg7f3ek.js:326414-326552 placement
function interruptedPromptUuid(e) {
  if (e?.kind !== "interrupted_prompt") return;
  return e.interruptedTurnUserMessageUuid ?? (e.message.isMeta ? undefined : e.message.uuid);
}
//@ chunk-tyg7f3ek.js:326552-326687 placement = countUserPromptsFromEntries (1)
function countUserPromptsFromEntries_5(entries) {
  if ("isSidechain" in entries && entries.isSidechain === true) return false;
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

/**
 * cli/print/wakeRouter.ts
 *
 * 2.1.316 新增：唤醒路由（结果唤醒、待处理动作对账、权限卡片询问）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (33)
 * attribution: placement 29, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  processQueuedCommands,
  isDrainableMainThreadCommand,
  isQueuedUserTurnCommand,
  isQueuedCommandEditable,
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
  SYNTHETIC_MODEL,
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
import { unansweredToolBriefs } from "../../components/Messages.js";
import { isClaudeAiChatRemote } from "../../utils/entrypointKinds.js";
import { isUnownedRunningShell } from "./backgroundWindDown.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
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
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { readDisallowedToolsMetadata } from "../print.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { SKILL, SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { REPL_TOOL_NAME, EVAL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { CONFIRM } from "../../utils/permissions/confirmWithUser.js";
import { isPendingActionForTool } from "./parkedPrompts.js";
import { findToolByName } from "../../Tool.js";
import { isSubagentToolRequest } from "../../remote/wireFrameShape.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { measureAnswerBounds } from "../../utils/permissions/permissionAnswer.js";
import { askedInDirectoryOf } from "../../utils/sessionStateCwd.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:339705-339835 placement
function installWakeRouterKick({ messageQueue, drain, routeWakes, kick }) {
  let unsubscribe = messageQueue.subscribe(() => {
    routeWakes();
    if (shouldKickForQueuedWake(messageQueue, drain)) kick();
  });
  routeWakes();
  if (shouldKickForQueuedWake(messageQueue, drain)) kick();
  return unsubscribe;
}
//@ chunk-0yw3taqg.js:339835-339845 placement
var MAX_PUBLISHED_QUEUE_WAKES = 32;
//@ chunk-0yw3taqg.js:339845-340511 placement
function publishQueuedWakeStatus({ messageQueue, getTasks, publish }) {
  let published = new Map();
  return messageQueue.subscribe(() => {
    try {
      let tasks = getTasks();
      let live = new Set();
      let changed = false;
      for (let queued of messageQueue.getCommandQueueSnapshot()) {
        if (!processQueuedCommands(queued) || queued.taskId === undefined || queued.userResumeNotice === true)
          continue;
        live.add(queued.taskId);
        let task = tasks[queued.taskId];
        if (
          published.has(queued.taskId) ||
          task === undefined ||
          !isWaitableAgentOrWorkflow(task) ||
          !isTerminalTaskStatus(task.status)
        )
          continue;
        let outputFile = typeof queued.value === "string" ? extractTag(queued.value, OUTPUT_FILE) : null;
        published.set(queued.taskId, {
          task_id: task.id,
          task_type: task.type,
          description: truncate(task.description, MAX_DESCRIPTION_CHARS),
          status: task.status,
          ...(outputFile && {
            output_file: outputFile,
          }),
        });
        changed = true;
      }
      for (let key of published.keys())
        if (!live.has(key)) {
          published.delete(key);
          changed = true;
        }
      if (changed) publish([...published.values()].slice(0, MAX_PUBLISHED_QUEUE_WAKES));
    } catch (error) {
      if (isAbortError(error)) logForDebugging(`undelivered-completion mirror aborted: ${error}`);
      else logError(error);
    }
  });
}
//@ chunk-0yw3taqg.js:340511-340582 placement
function shouldKickForQueuedWake(messageQueue, drain) {
  return (
    !drain.running && !drain.inputClosed && messageQueue.peek(isDrainableMainThreadCommand) !== undefined
  );
}
//@ chunk-0yw3taqg.js:340582-344069 placement
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
    let isActive = () =>
      turn.isRunning && drain.turnUnderWay && !drain.endSessionRequested && !isTerminalShutdown();
    this.delivery = new LowLatencySubmitQueue({
      turn: {
        agentId: undefined,
        guard: {
          get isActive() {
            return isActive();
          },
          get isRunning() {
            return isActive();
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
  takeBeforeEnqueue(command) {
    runSafely(() => {
      if (command.priority !== "now") return;
      for (let uuid of this.pressed.splice(0)) this.giveBackStop(uuid);
      if (
        command.uuid === undefined ||
        !this.turn.isRunning ||
        this.drain.endSessionRequested ||
        isTerminalShutdown() ||
        !isPlainHumanInput(command) ||
        !this.canDeliverOverTurn() ||
        !this.enabled()
      )
        return;
      if (this.messageQueue.getCommandQueueSnapshot().some(isDrainableMainThreadCommand)) {
        this.delivery.moveHolders();
        this.movedFor.add(command.uuid);
        return;
      }
      command.priority = "next";
      command.sentNow = true;
      this.taken.add(command.uuid);
    });
  }
  press(command) {
    runSafely(() => {
      let { uuid } = command;
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
    return this.turn.isCompacting || unansweredToolBriefs(this.transcript.getSnapshot()).size > 0;
  }
  giveBackStop(uuid) {
    if (this.messageQueue.getCommandQueueSnapshot().some((queued) => queued.uuid === uuid)) {
      this.delivery.moveHolders();
      this.movedFor.add(uuid);
      this.messageQueue.promoteToNow(uuid);
    }
  }
  pressWaiting() {
    let sent = false;
    runSafely(() => {
      let filtered = this.messageQueue.getCommandQueueSnapshot().filter(isDrainableMainThreadCommand);
      if (
        filtered.length === 0 ||
        !this.turn.isRunning ||
        this.drain.endSessionRequested ||
        isTerminalShutdown() ||
        !filtered.every((queued) => queued.priority !== "now" && isPlainHumanInput(queued)) ||
        !this.canDeliverOverTurn() ||
        !this.enabled()
      )
        return;
      sent = this.delivery.sendQueuedNow();
      if (!sent) {
        logFeatureSad("print_send_now", "declined");
        return;
      }
      let uuid = filtered[0]?.uuid;
      if (uuid !== undefined) this.pressed.splice(0, this.pressed.length, uuid);
      for (let { uuid } of filtered) if (uuid !== undefined) this.movedFor.add(uuid);
    });
    return sent;
  }
  notePersonsStop() {
    this.turn.wasStoppedByPerson = this.turn.isRunning;
    this.stopMovedTasks();
  }
  stopMovedTasks() {
    runSafely(() => {
      for (let id of this.movedTasks()) this.stopTask(id);
    });
  }
  movedTasks() {
    if (!isClaudeAiChatRemote()) return [];
    return Object.values(this.taskRegistry.all())
      .filter(
        (task) =>
          ((isUnownedRunningShell(task) && isLocalShellTask(task)) ||
            (task.type === "mcp_task" && task.status === "running")) &&
          task.backgroundedToDeliverMessage === true &&
          !this.spared.has(task.id),
      )
      .map((task) => task.id);
  }
  isTaking(command) {
    return command.uuid !== undefined && this.taken.has(command.uuid);
  }
  noteTurnStart(members) {
    this.turn.isRunning = true;
    this.turn.isCompacting = false;
    runSafely(() => {
      if (members.some(({ uuid }) => uuid !== undefined && this.movedFor.has(uuid))) return;
      for (let id of this.movedTasks()) this.spared.add(id);
      this.movedFor.clear();
    });
    this.turnChanged.emit();
  }
  noteFrame(frame) {
    if (frame.type === "system" && frame.subtype === "status" && frame.status !== "requesting")
      this.turn.isCompacting = frame.status === "compacting";
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
//@ chunk-0yw3taqg.js:344069-344173 placement
function isPlainHumanInput(command) {
  return (
    isQueuedUserTurnCommand(command) &&
    isHumanOrigin(command.origin) &&
    isQueuedCommandEditable(command) &&
    command.verifiedSlackHumanTurn !== true &&
    !command.wait &&
    !looksLikeSlashInput(command.value)
  );
}
//@ chunk-0yw3taqg.js:344173-344201 placement
function noop(x) {
  return () => {};
}
//@ chunk-0yw3taqg.js:344201-348004 placement
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
    let allMessages = this.messageQueue.getCommandQueueSnapshot();
    clearTimeout(this.wakeRepoll);
    if (
      allMessages.some(
        (queued) =>
          queued.agentId &&
          !isMainAgentCommand(queued) &&
          (queued.mode === "task-notification" || isResultOnlyTaskNotification(queued)),
      )
    ) {
      this.wakeRepoll = setTimeout((queue) => queue.recheckCommandQueue(), 60000, this.messageQueue);
      this.wakeRepoll.unref?.();
    }
    let lastCacheSafeParams = getLastCacheSafeParams();
    let queued = undefined;
    if (!lastCacheSafeParams && !queued?.size) return;
    if (lastCacheSafeParams) this.flushStranded();
    for (let line of buildTaskNotificationText(allMessages, this.getTasks())) {
      let context = lastCacheSafeParams?.toolUseContext ?? queued?.get(line.agentId);
      if (
        context === undefined ||
        this.wakeInFlight.has(line.agentId) ||
        this.deniedWakes.holds(allMessages, line)
      )
        continue;
      this.wakeInFlight.add(line.agentId);
      let handled = false;
      let backgroundLaunchRule = getBackgroundLaunchRule();
      let wakeAdmitted =
        backgroundLaunchRule !== undefined && admitsWakeSafe(backgroundLaunchRule, line.agentId);
      resumeAgentBackground({
        agentId: line.agentId,
        prompt: line.prompt,
        resultsOnly: line.resultsOnly,
        promptOrigin: line.origin,
        promptToolsUsed: line.toolsUsed,
        promptNoticeLengths: line.noticeLengths,
        promptNoticeOwn: line.noticeOwn,
        promptNoticeRunIds: line.noticeRunIds,
        promptIsMeta: true,
        onDeliveryCommitted: () =>
          this.messageQueue.consume(line.consumedCommands, {
            reason: "delivered_to_agent",
          }),
        toolUseContext: contextAfterTurn(context),
        canUseTool: this.canUseTool,
      })
        .then((outcome) => {
          if (!isResumeDenied(outcome)) return;
          handled = true;
          try {
            this.messageQueue.remove(line.consumedCommands, {
              reason: "dropped_by_hook",
            });
            this.deniedWakes.note(allMessages, line.agentId);
            logForDebugging(
              `[wakeRouter] dropping ${line.consumedCommands.length} event(s) for ${line.agentId}: ${outcome.deniedByPlugin}`,
            );
          } catch (error) {
            logError(error);
          }
        })
        .catch((error) => {
          handled = true;
          let task = this.getTasks()[line.agentId];
          let handToMain =
            wakeAdmitted &&
            error instanceof ResumeAgentStateError &&
            !(error instanceof AgentStoppedByUserError) &&
            isLocalAgent(task) &&
            task.stoppedByUser !== true &&
            task.status !== "killed";
          if (
            handToMain ||
            error instanceof AgentStoppedByUserError ||
            error instanceof AgentResumePermanentlyRefusedError
          ) {
            this.messageQueue.remove(line.consumedCommands, {
              reason: "agent_stopped",
            });
            if (handToMain) {
              logFeatureSad("subagent_launch", "subagent_wake_handed_to_main");
              line.consumedCommands
                .filter(({ mode }) => mode === "task-notification")
                .forEach(({ uuid, ...rest }) =>
                  this.messageQueue.enqueuePendingNotification({
                    ...rest,
                    agentId: mainAgentId(),
                  }),
                );
            }
            pruneSettledChildWork(line.agentId, context.taskRegistry);
            if (!handToMain || !hasAnyKeepaliveReason(line.agentId, context.taskRegistry))
              releaseMainThreadContext(line.agentId);
            logForDebugging(
              `[wakeRouter] dropping ${line.consumedCommands.length} event(s) for ${line.agentId}: ${errorMessage(error)}`,
            );
          } else if (error instanceof ResumeAgentStateError) {
            logForDebugging(`[wakeRouter] resume state error for ${line.agentId}: ${errorMessage(error)}`);
            if (line.resultsOnly && !isRetryableAgentError(error)) {
              let failures = (this.failedResultWakes.get(line.agentId) ?? 0) + 1;
              this.failedResultWakes.set(line.agentId, failures);
              if (failures >= MAX_TRANSIENT_RESUME_RETRIES) {
                this.failedResultWakes.delete(line.agentId);
                releaseMainThreadContext(line.agentId);
              }
            }
          } else logError(error);
        })
        .finally(() => {
          this.wakeInFlight.delete(line.agentId);
          if (!handled) {
            this.failedResultWakes.delete(line.agentId);
            this.messageQueue.recheckCommandQueue();
          }
        });
    }
  }
  startStrandedResume(runtime) {
    let strandedResumeRetrier = createStrandedResumeRetrier({
      taskRegistry: runtime,
      resume: async (agentId, options, userInitiated) => {
        let cacheSafeParams = this.resumesNothing() ? null : getLastCacheSafeParams();
        if (!cacheSafeParams)
          throw new AgentResumeTransientError("the session is ending, or no main-loop context is saved");
        return resumeAgentBackground({
          agentId,
          prompt: options.text,
          promptOrigin: options.origin,
          promptToolsUsed: options.toolsUsed,
          promptIsMeta: options.isMeta,
          toolUseContext: contextAfterTurn(cacheSafeParams.toolUseContext),
          canUseTool: this.canUseTool,
          userInitiated,
        });
      },
      onFailed: (agentId, error) => {
        if (error instanceof ResumeAgentStateError)
          logForDebugging(`[wakeRouter] stranded resume of ${agentId}: ${errorMessage(error)}`);
        else logError(error);
      },
    });
    let stranded = new Set();
    let runResume = (agentId) => {
      let agent = runtime.get(agentId);
      if (!getLastCacheSafeParams() || (isLocalAgent(agent) && agent.finalizing)) {
        stranded.add(agentId);
        return;
      }
      stranded.delete(agentId);
      strandedResumeRetrier.dispatch(agentId);
    };
    this.flushStranded = () => {
      for (let agentId of [...stranded]) {
        let agent = runtime.get(agentId);
        if (
          canReceiveNotification(agent, {
            userInitiated: hasUserInitiatedPending(agent),
          })
        ) {
          runResume(agentId);
          continue;
        }
        stranded.delete(agentId);
        getTaskRunState().agentResumeFailed.emit(agentId, {
          error: new ResumeAgentStateError(`Agent ${agentId} can no longer take its queued messages.`),
          undeliverable: drainPendingMessages(agentId, runtime),
          terminal: true,
        });
      }
    };
    let unsubscribe = getTaskRunState().agentStrandedMessages.subscribe((agentId) => {
      queueMicrotask(() => runResume(agentId));
    });
    let noopFn = noop(runtime);
    return () => {
      unsubscribe();
      noopFn();
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
//@ chunk-0yw3taqg.js:348004-348123 placement
function isPassiveCommand(command) {
  return (
    (command.shouldQuery === false && command.queryHeldForNextTurn !== true) ||
    isPollEventMode(command) ||
    command.pollEmptyDispatch === true ||
    command.passive === true
  );
}
//@ chunk-0yw3taqg.js:348123-348329 placement
function sweepQueueAtTeardown({ messageQueue, io }) {
  let removed = messageQueue.dequeueAllMatching(isMainAgentCommand);
  discardPollEvent(removed.filter(isPollEventMode), "session teardown");
  logDeliveryFailureForEndings(removed, "swept_at_teardown");
  for (let command of removed)
    if (command.uuid !== undefined) io.onCommandLifecycle?.(command.uuid, "discarded");
}
//@ chunk-0yw3taqg.js:348329-348945 placement
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
  return async ({ afterAnswerQueued = false } = {}) => {
    let outcome;
    try {
      io.sessionState.notifyStateChanged("running");
      let flushed = await withDeadline(
        Promise.race([io.flushSessionState(), whenTornDown().then(() => false)]),
        boundMs,
      );
      outcome = tornDown()
        ? "torn_down"
        : flushed === undefined
          ? "timed_out"
          : flushed
            ? "cleared"
            : "unconfirmed";
    } catch (error) {
      onError("clear", error);
      outcome = "failed";
    }
    if (outcome === "cleared") return true;
    if (afterAnswerQueued) return false;
    try {
      if (statusTaken()) return false;
      if (holding() && details !== undefined) io.sessionState.notifyStateChanged("requires_action", details);
      else io.sessionState.notifyStateChanged("idle");
    } catch (error) {
      onError("restore", error);
    } finally {
      onUnconfirmed(outcome);
    }
    return false;
  };
}
//@ chunk-0yw3taqg.js:348982-349013 placement
var TENGU_QUIZZICAL_KNUTH = "tengu_quizzical_knuth";
//@ chunk-0yw3taqg.js:349013-349051 placement
function isPermissionCardHoldEnabled() {
  return readFlagWithOverride(TENGU_QUIZZICAL_KNUTH, {
    safe: true,
  });
}
//@ chunk-0yw3taqg.js:349051-351879 placement
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
  take(message, toolUseId) {
    let card = this.host.card;
    if (
      this.state.state !== "open" ||
      toolUseId !== card.tool_use_id ||
      message.response.request_id !== card.request_id ||
      message.response.subtype !== "success"
    )
      return false;
    let response = message.response.response;
    let parsed = MARKETPLACE_ONLY_MANIFEST_FIELDS(this.host.answerKind).safeParse(response);
    let toolName = card.details?.tool_name;
    if (!parsed.success)
      this.endCard({
        state: "closed",
        why: "answer_not_parsed",
      });
    else if (
      typeof toolName !== "string"
        ? [response?.toolName, response?.tool_name].some((name) => typeof name === "string")
        : isValidBridgeToolName(response?.toolName, toolName, card.request_id) ||
          isDifferentString(response?.tool_name, toolName)
    )
      this.endCard({
        state: "closed",
        why: "answer_other_tool",
      });
    else if (
      parsed.data.behavior === "allow" &&
      !(this.host.allowWithoutInputIsEcho && Object.keys(parsed.data.updatedInput ?? {}).length === 0) &&
      !deepEqualIgnoringUndefined(parsed.data.updatedInput, card.details?.input)
    )
      this.endCard({
        state: "closed",
        why: "answer_not_an_echo",
      });
    else
      this.endCard({
        state: "answered",
        result: parsed.data,
        readAtMs: Date.now(),
      });
    return true;
  }
  takeDeny(message) {
    let response = message.response.subtype === "success" ? message.response.response : undefined;
    this.endCard({
      state: "answered",
      result: {
        behavior: "deny",
        message: typeof response?.message === "string" ? response.message : "",
        toolUseID: this.host.card.tool_use_id,
        ...(typeof response?.interrupt === "boolean" && {
          interrupt: response.interrupt,
        }),
      },
      readAtMs: Date.now(),
    });
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
  stop(reason) {
    this.stops = {
      count: this.stops.count + 1,
      last: reason,
    };
    this.close(reason);
  }
  startTimer() {
    if (this.state.state === "open" && this.timer === undefined) {
      this.timer = setTimeout(async () => {
        let pending = this.host.unreadAnswersRead();
        if (pending !== undefined) await pending;
        this.endCard({
          state: "closed",
          why: "wait_lapsed",
        });
      }, this.host.waitMs);
      this.timer.unref?.();
    }
  }
  async waitEnd() {
    let state = this.state;
    if (state.state === "open") await state.ended.promise;
    let state_2 = this.state;
    if (state_2.state === "answered") return "answered";
    return state_2.state === "closed" &&
      (state_2.why === "stopped" || state_2.why === "rewound" || state_2.why === "shutdown")
      ? "stopped"
      : "unanswered";
  }
  async answerFor(ask) {
    if (this.state.state === "open" && (await this.host.answerOff()) === "on") this.close("switched_off");
    let state = this.state;
    if (state.state === "open") {
      this.startTimer();
      await state.ended.promise;
    }
    let state_2 = this.state;
    this.close("settled");
    let count = this.stops.count;
    let answerState = state_2.state === "answered" ? await this.host.answerOff() : "off";
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
            : answerState === "on"
              ? "switched_off"
              : answerState === "cold"
                ? "flags_cold"
                : answerState === "absent"
                  ? "switch_absent"
                  : Date.now() - state_2.readAtMs > this.host.maxAnswerAgeMs
                    ? "answer_too_old"
                    : !deepEqualIgnoringUndefined(ask.input, this.host.card.details?.input)
                      ? "input_differs"
                      : ask.planMode() && state_2.result.behavior === "allow"
                        ? "plan_mode"
                        : undefined,
    };
  }
}
//@ chunk-0yw3taqg.js:351916-353602 placement
/**
 * 把 worker 记录中的 pending_action(s) 与本进程待答的权限/对话请求对齐。
 */
function reconcilePendingActions(io, restored, options) {
  let pendingActions = [restored?.external?.pending_action, ...(restored?.external?.pending_actions ?? [])];
  let liveIds = new Set(
    [...io.getPendingPermissionRequests(), ...io.getPendingUserDialogRequests()].map(
      (request) => request.request_id,
    ),
  );
  let cancelled = new Set();
  let toolUseIds = new Set();
  let interruptedTurn = options?.interruptedTurn;
  let runningBackgroundTasks = restored?.internal?.running_background_tasks;
  let newestId = requestIdOf(restored?.external?.pending_action);
  for (let action of pendingActions) {
    let requestId = requestIdOf(action);
    if (!action || !requestId || cancelled.has(requestId)) continue;
    if (requestId === options?.exceptRequestId) {
      logForDebugging(
        `[resumeStalePromptCancel] pending_action ${requestId} is owned by the deferred rescue \u2014 skipping cancel`,
      );
      continue;
    }
    if (options?.keepRequestIds?.has(requestId)) {
      logForDebugging(
        `[resumeStalePromptCancel] pending_action ${requestId} is a live prompt nothing will re-ask \u2014 keeping it answerable`,
      );
      continue;
    }
    if (liveIds.has(requestId)) {
      logForDebugging(
        `[resumeStalePromptCancel] pending_action ${requestId} is owned by this worker \u2014 redelivery handles it, skipping cancel`,
      );
      continue;
    }
    cancelled.add(requestId);
    if (typeof action.tool_use_id === "string" && action.tool_use_id !== "")
      toolUseIds.add(action.tool_use_id);
    logForDebugging(
      `[resumeStalePromptCancel] cancelling stale parked prompt ${requestId} from a prior worker`,
    );
    io.write({
      type: "control_cancel_request",
      request_id: requestId,
    });
    logEvent("tengu_resume_stale_prompt_cancel", {
      kind: fromEnum(
        typeof action.tool_name === "string" && action.tool_name.startsWith("dialog:")
          ? "dialog"
          : "permission",
      ),
      withdrawn_at: lit("worker_start"),
      ...(interruptedTurn && {
        prompt_call: fromEnum(
          interruptedTurn.unresolvedToolUseIds?.has(action.tool_use_id)
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
        request_id_blanked: action.request_id !== requestId,
        newest_prompt: requestId === newestId,
        tool_is_web_fetch: action.tool_name === WEBFETCH,
      }),
    });
  }
  return toolUseIds;
}
//@ chunk-0yw3taqg.js:353602-353618 layout
var DISALLOWED_TOOLS_VERSION_AHEAD_MS = 86400000;
//@ chunk-0yw3taqg.js:353618-353820 layout
function applyDisallowedTools(rows, denyLists) {
  for (let row of rows)
    try {
      let denyLists_2 = {
        ...denyLists,
        turn: [...denyLists.turn],
        client: [...denyLists.client],
      };
      if (isCompactBoundaryMessage(row)) row.compactMetadata.denyLists = denyLists_2;
      else if (row.type === "user" || row.type === "attachment") row.denyLists = denyLists_2;
    } catch (error) {
      logError(error);
    }
}
//@ chunk-0yw3taqg.js:353820-354609 layout
function disallowedToolsFromMessages(rows) {
  let newest;
  let loose = [];
  let logged = false;
  for (let row of rows)
    try {
      let denyLists = isCompactBoundaryMessage(row)
        ? Object(row.compactMetadata).denyLists
        : Object(row).denyLists;
      if (denyLists === undefined || Object(row).isSidechain === true) continue;
      let lists = Object(denyLists);
      let version = lists.version;
      let disallowedToolsMetadata = readDisallowedToolsMetadata({
        disallowed_tools: lists.turn,
      });
      let disallowedToolsMetadata_2 = readDisallowedToolsMetadata({
        disallowed_tools: lists.client,
      });
      if (
        disallowedToolsMetadata === undefined ||
        disallowedToolsMetadata_2 === undefined ||
        typeof version !== "number" ||
        !Number.isSafeInteger(version) ||
        version < 0 ||
        version > Date.now() + DISALLOWED_TOOLS_VERSION_AHEAD_MS
      )
        loose.push({
          turn: disallowedToolsMetadata ?? [],
          client: disallowedToolsMetadata_2 ?? [],
          version,
        });
      else if (version >= (newest?.version ?? 0))
        newest = {
          turn: disallowedToolsMetadata,
          client: disallowedToolsMetadata_2,
          version,
        };
    } catch (error) {
      if (!logged) {
        logError(error);
        logFeatureSad("headless_turn_deny", "stored_list_threw");
      }
      logged = true;
    }
  let filtered = loose.filter(
    ({ version }) => newest === undefined || typeof version !== "number" || !(version < newest.version),
  );
  let flattened = filtered.flatMap((entry) => entry.turn);
  let flattened_2 = filtered.flatMap((entry) => entry.client);
  if (flattened.length + flattened_2.length === 0) return newest;
  return {
    turn: normalizeCaseForComparison_2([...(newest?.turn ?? []), ...flattened]),
    client: normalizeCaseForComparison_2([...(newest?.client ?? []), ...flattened_2]),
    version: newest?.version ?? 0,
  };
}
//@ chunk-0yw3taqg.js:354609-354642 placement
var DIALOG_TOOL_NAMES; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0yw3taqg.js:354609", () => {
  DIALOG_TOOL_NAMES = new Set([AGENT, TASK, SKILL, REPL_TOOL_NAME, EVAL_TOOL_NAME]);
});
//@ chunk-0yw3taqg.js:354642-354715 placement
function isDialogToolName(name) {
  return typeof name === "string" && (DIALOG_TOOL_NAMES.has(name) || name.startsWith(SKILL_2));
}
//@ chunk-0yw3taqg.js:354715-355420 placement
function classifyPendingAction(restored, supersededIds, supersededToolNames, keepRequestIds) {
  let pendingAction = restored?.external?.pending_action;
  let requestId = requestIdOf(pendingAction);
  if (
    !pendingAction ||
    !requestId ||
    typeof pendingAction.tool_use_id !== "string" ||
    !pendingAction.tool_use_id
  )
    return "none";
  if (typeof pendingAction.tool_name === "string" && pendingAction.tool_name.startsWith("dialog:"))
    return "dialog";
  if (pendingAction.tool_use_id.startsWith(CONFIRM)) return "underivable_excluded";
  if (supersededIds?.has(pendingAction.tool_use_id)) return "derivable";
  if (!supersededIds || supersededIds.size === 0) return "underivable_no_superseded";
  if (![...supersededIds].some((id) => isDialogToolName(supersededToolNames?.get(id))))
    return "underivable_leaf_only";
  let runningBackgroundTasks = restored?.internal?.running_background_tasks;
  let pendingActions = restored?.external?.pending_actions;
  if (
    (Array.isArray(runningBackgroundTasks) && runningBackgroundTasks.length > 0) ||
    (Array.isArray(pendingActions) &&
      pendingActions.some(
        (pendingAction) =>
          typeof pendingAction?.tool_use_id === "string" && supersededIds.has(pendingAction.tool_use_id),
      )) ||
    keepRequestIds?.has(requestId)
  )
    return "underivable_excluded";
  return "underivable_adoptable";
}
//@ chunk-0yw3taqg.js:355420-356062 placement
async function reattachInterruptedPrompt(
  state,
  turnInterruptionState,
  chain,
  supersededToolUseIds,
  supersededToolNames,
  findUnresolved,
  lane,
) {
  let result = {
    supersededToolUseIds,
    supersededToolNames,
    reattached: false,
  };
  let pendingToolUseId = singlePendingAction(state);
  if (
    !lane.toleratesContextAppends ||
    !lane.resumeInterruptedTurn ||
    !turnInterruptionState ||
    turnInterruptionState.kind === "none" ||
    supersededToolUseIds === undefined ||
    supersededToolUseIds.size > 0 ||
    pendingToolUseId === undefined
  )
    return result;
  let message = await findUnresolved(pendingToolUseId);
  let block = Array.isArray(message?.message.content)
    ? message.message.content.find((block) => block.type === "tool_use" && block.id === pendingToolUseId)
    : undefined;
  if (!message || block?.type !== "tool_use") return result;
  if (!isPendingActionForTool(state, block.name)) return result;
  let timestamp = Date.parse(message.timestamp);
  if (!Number.isFinite(timestamp)) return result;
  if (
    hasRowsAfterTime(
      chain,
      timestamp,
      (row) =>
        turnInterruptionState.message.isMeta === true && row.uuid === turnInterruptionState.message.uuid,
    )
  )
    return result;
  return {
    supersededToolUseIds: new Set([pendingToolUseId]),
    supersededToolNames: new Map([[pendingToolUseId, block.name]]),
    reattached: true,
  };
}
//@ chunk-0yw3taqg.js:356062-356300 placement
function hasRowsAfterTime(chain, time, exclude) {
  return chain.some((row) => {
    if (row.type !== "user" && row.type !== "assistant") return false;
    let timestamp = Date.parse(row.timestamp);
    if (Number.isFinite(timestamp) && timestamp <= time) return false;
    if (row.type === "assistant") return row.message.model !== SYNTHETIC_MODEL;
    return !exclude(row) && !isToolUseResultMessage(row) && !isContextAppendMessage(row);
  });
}
//@ chunk-0yw3taqg.js:356300-356888 placement
function listPendingActions(restored, superseded, tools) {
  let actions = [];
  let pendingActions = restored?.external?.pending_actions;
  let allActions = [
    restored?.external?.pending_action,
    ...(Array.isArray(pendingActions) ? pendingActions : []),
  ];
  for (let action of allActions) {
    let requestId = requestIdOf(action);
    if (!action || !requestId || typeof action.tool_name !== "string") continue;
    if (superseded?.has(action.tool_use_id)) continue;
    if (typeof action.tool_use_id === "string" && action.tool_use_id.startsWith(CONFIRM)) continue;
    if (typeof action.agent_id === "string" && action.agent_id !== "") continue;
    let toolByName = findToolByName(tools, action.tool_name);
    let blanked =
      action.request_id === "" && !!action.suppressed_request_id && action.blanked_for_size !== true;
    if (toolByName ? toolByName.requiresUserInteraction?.() : blanked)
      actions.push({
        requestId,
        toolUseId: typeof action.tool_use_id === "string" ? action.tool_use_id : undefined,
      });
  }
  return actions;
}
//@ chunk-0yw3taqg.js:356888-356955 placement
function pendingActionRequestIds(restored, superseded, tools) {
  return new Set(listPendingActions(restored, superseded, tools).map((action) => action.requestId));
}
//@ chunk-0yw3taqg.js:356955-357046 placement
function pendingActionToolUseIds(restored, tools) {
  return new Set(
    listPendingActions(restored, undefined, tools).flatMap((action) =>
      action.toolUseId ? [action.toolUseId] : [],
    ),
  );
}
//@ chunk-0yw3taqg.js:357046-357214 placement
function hasPendingActions(state) {
  if (state?.readFailed === true) return true;
  let pendingActions = state?.external?.pending_actions;
  return [state?.external?.pending_action, ...(Array.isArray(pendingActions) ? pendingActions : [])].some(
    (action) => requestIdOf(action) !== undefined,
  );
}
//@ chunk-0yw3taqg.js:357214-357440 placement
function pendingActionsAmbiguous(restoredWorkerState) {
  if (restoredWorkerState?.readFailed === true) return true;
  let pendingAction = restoredWorkerState?.external?.pending_action;
  let pendingActions = restoredWorkerState?.external?.pending_actions;
  let list = Array.isArray(pendingActions) ? pendingActions : [];
  if ((pendingAction != null && list.length === 0) || list.length >= MAX_PENDING_ACTION_ARGS) return true;
  return [pendingAction, ...list].some((action) => action != null && !isSubagentToolRequest(action));
}
//@ chunk-0yw3taqg.js:357440-357585 layout
function unambiguousPendingAgentId(restoredWorkerState) {
  let pendingAction = restoredWorkerState?.external?.pending_action;
  return typeof pendingAction?.agent_id === "string" &&
    typeof pendingAction.tool_use_id === "string" &&
    !pendingActionsAmbiguous(restoredWorkerState)
    ? pendingAction.agent_id
    : undefined;
}
//@ chunk-0yw3taqg.js:357585-357791 placement
function singlePendingAction(state) {
  let pendingAction = state?.external?.pending_action;
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
//@ chunk-0yw3taqg.js:357791-358257 placement
function pendingActionResumeHint(restored, interruption, ids, lane) {
  if (!lane.resumeInterruptedTurn) return;
  if (!interruption || interruption.kind === "none") return;
  let pendingAction = restored?.external?.pending_action;
  let requestId = requestIdOf(pendingAction);
  if (!pendingAction || !requestId || !pendingAction.tool_use_id) return;
  if (typeof pendingAction.tool_name === "string" && pendingAction.tool_name.startsWith("dialog:")) return;
  if (!ids?.has(pendingAction.tool_use_id)) return;
  return {
    request_id: requestId,
    tool_use_id: pendingAction.tool_use_id,
    details: pendingAction,
    ...(isPlainObject(pendingAction.input) &&
      measureAnswerBounds(pendingAction.input).within && {
        recordedInput: pendingAction.input,
      }),
    ...(pendingAction.asked_in_directory !== undefined && {
      askedInDirectory: askedInDirectoryOf(pendingAction.asked_in_directory),
    }),
  };
}
//@ chunk-0yw3taqg.js:358257-358395 placement
function interruptedPromptUuid(state) {
  if (state?.kind !== "interrupted_prompt") return;
  return state.interruptedTurnUserMessageUuid ?? (state.message.isMeta ? undefined : state.message.uuid);
}
//@ chunk-0yw3taqg.js:358395-358530 placement (2.1.88 match: countUserPromptsFromEntries, 1)
function countUserPromptsFromEntries_5(entries) {
  if ("isSidechain" in entries && entries.isSidechain === true) return false;
  return entries.type === "assistant"
    ? entries.message.model !== SYNTHETIC_MODEL
    : isHarnessMetaMessage(entries) ||
        (isInterruptionOnlyMessage(entries) && !isToolUseResultMessage(entries));
}
export {
  isPermissionCardHoldEnabled,
  pendingActionsAmbiguous,
  unambiguousPendingAgentId,
  interruptedPromptUuid,
  createTeardownStatusReporter,
  disallowedToolsFromMessages,
  isPassiveCommand,
  WakeRouter,
  publishQueuedWakeStatus,
  ResultWakeRouter,
  installWakeRouterKick,
  pendingActionToolUseIds,
  singlePendingAction,
  hasPendingActions,
  hasRowsAfterTime,
  PermissionCardAsk,
  applyDisallowedTools,
  countUserPromptsFromEntries_5,
  reattachInterruptedPrompt,
  pendingActionRequestIds,
  classifyPendingAction,
  pendingActionResumeHint,
  isDialogToolName,
  reconcilePendingActions,
  sweepQueueAtTeardown,
};

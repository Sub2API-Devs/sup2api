/**
 * cli/print/turnLoop.ts
 *
 * 2.1.316 新增：无头回合主循环、MCP 预等待与崩溃上报
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (47)
 * attribution: placement 47
 */
import { randomUUID } from "crypto";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import {
  isOrphanedPermissionCommand,
  shouldYieldRescueTurn,
  maybeYieldToPersonPrompt,
} from "./commandQueueDrain.js";
import { isRefillableCommand, isActiveMainAgentCommand } from "../../utils/messageQueueManager.js";
import { isGoalIdleCheckinPaused } from "../../query/goalCheckIn.js";
import {
  isAnalyticsEventName,
  createDependencyWatcher,
  createTranscriptSaver as createTranscriptSaver_2,
} from "./rewindStandIn.js";
import { lastTextBlockText } from "../../utils/historyFile.js";
import { createSignal } from "../../utils/signal.js";
import { FetchingUserFilesCounter } from "./backgroundWait.js";
import { createAbortController, userAbortReason } from "../../utils/abortController.js";
import { logError } from "../../utils/log.js";
import { fetchTurnEndMemoryContext } from "../../services/accountMemory/memoryContext.js";
import { configProbeEnv } from "../structuredIOProtocol.js";
import {
  TurnStartCoordinator,
  HostReturnWakeTracker,
  isHostReturnWake,
  TurnRefusedError,
} from "./turnGate.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { toolStateSlot } from "../../services/remoteTools/backgroundCommands.js";
import { switchSerializerSlot } from "../../utils/model/modelSwitchHooks.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { discardPollEvent, buildPollEventDelivery, getPollEventEnvelope } from "../../utils/pollEvents.js";
import { emitLoadError } from "../print.js";
import { devIntentTracker } from "../../services/projects/devIntent.js";
import { wrapInSystemReminder } from "../../utils/messages.js";
import { listUnreadableToolsUsed } from "../../utils/agentListing.js";
import { getConversationToolsUsed, getSessionId, getMcpConnectNonBlocking } from "../../bootstrap/state.js";
import {
  headlessProfilerCheckpoint,
  logHeadlessProfilerTurn,
  headlessProfilerStartTurn,
} from "../../utils/headlessProfiler.js";
import { startQueryProfile, finishQueryProfile } from "../../utils/queryProfiler.js";
import {
  isOrganizationModsLoadPending,
  followRolloutWithDeadline,
} from "../../utils/plugins/hooksModulesRollout.js";
import { isPolicyUnreadPastItsBounds } from "../../utils/plugins/loadPluginHooks.js";
import {
  hooksModulesGateFromPayload,
  runOrganizationStatusLoadOnce,
  ORGANIZATION_POLICY_UNREADABLE_MESSAGE,
  ORGANIZATION_MODS_UNLOADED_MESSAGE,
  waitForOrganizationModsOnClaim,
} from "../../utils/plugins/hooksModulesLoadGate.js";
import { resolveHooksModulesValue } from "../../services/analytics/growthbookCredentials.js";
import { waitForCloudModsHold } from "../../utils/hooks/hookPolicyHold.js";
import { rejudgeLoadedMods } from "../../utils/hooks.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { ERRNO_NAMES_COPY } from "../../utils/errorRedaction.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { isUntrustedObject } from "../../utils/shutdown/pendingWrites.js";
import { protoDataString } from "../../utils/gracefulShutdown.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  LANGUAGE_ERROR_NAMES,
  withTelemetryMessage,
  sanitizeClassName,
  errorMessage,
} from "../../utils/errors.js";
import { stripStackHeader } from "../../utils/errorStackSanitize.js";
import { errorClassName } from "../../services/errorTracking/errorTracking.js";
import { logForDebugging } from "../../utils/debug.js";
import { reportsRunningBackgroundTasks } from "./backgroundWindDown.js";
import { maybeStartCcrRecap } from "../../services/awaySummary.js";
import { uniq, count, stringArray } from "../../utils/collections.js";
import { isPluginServerConfig } from "../../services/mcp/types.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { isTranscriptPersistenceDisabled } from "../../utils/sessionStorage.js";
import { sleep } from "../../utils/sleep.js";
import { bridgeSlashLineBuildsRequest } from "../../bridge/bridgeSlashCommands.js";
import { recordPhase } from "../../utils/startupTiming.js";
import { env } from "../../utils/env.js";
import { LISTMCPRESOURCESTOOL } from "../../tools/ListMcpResourcesTool/prompt.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import { isBridgeEnvironment } from "../../utils/remoteEnvironment.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import {
  REMOTE_CONNECT_TIMEOUT_MS,
  getConnectionTimeoutMs,
  TRANSPORT_FALLBACK_TIMEOUT_MS,
  SHORT_RETRY_MS,
} from "../../services/mcp/client.js";
import {
  isToolSearchEnabledOptimistic,
  modelSupportsToolReference,
  isVertexModelWithoutToolSearch,
  isToolSearchLockedOffByDefault,
  extractDiscoveredToolNames,
  getToolSearchMode,
} from "../../utils/toolSearch.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { REMOTE_ENTRYPOINT_NAMES } from "../../utils/entrypointKinds.js";
import { isFromBuiltinMarketplace } from "../../utils/plugins/pluginIdentifier.js";
import { isSortedOtterOn } from "../../services/mcp/mcpGates.js";
import { coordinatorExtraToolNames, coordinatorMainThreadUsesMcpServer } from "../../utils/toolPool.js";
import { waitForStoreState } from "../../context/voice.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:145895-146953 placement
class QueueHeadWaiter {
  messageQueue;
  stopping;
  isHeadAhead = false;
  queuedAtWait;
  followersFrom;
  constructor(messageQueue, stopping) {
    this.messageQueue = messageQueue;
    this.stopping = stopping;
  }
  waitForHead(fn) {
    let activeMessageQueue = getActiveMessageQueue();
    return this.isHeld(activeMessageQueue, fn()) ? this.waitOut(fn, activeMessageQueue) : undefined;
  }
  takeHead(predicate, fallback) {
    this.isHeadAhead = false;
    this.followersFrom = undefined;
    if (
      getActiveMessageQueue() !== undefined &&
      this.messageQueue.peek(isPausedGoalCheckin) !== undefined &&
      this.messageQueue.peek(predicate) !== undefined
    ) {
      this.isHeadAhead = true;
      return (
        this.messageQueue.dequeue((queued) => isOrphanedPermissionCommand(queued) && predicate(queued)) ??
        this.messageQueue.dequeue(isPausedGoalCheckin)
      );
    }
    if (this.isHeld(getActiveMessageQueue(), predicate)) return;
    this.followersFrom = this.queuedAtWait;
    this.queuedAtWait = undefined;
    return (
      (this.messageQueue.peek(
        (queued) => isOrphanedPermissionCommand(queued) || (predicate(queued) && isRefillableCommand(queued)),
      ) === undefined
        ? this.messageQueue.dequeue((queued) => predicate(queued) && isPausedAnalyticsHold(queued))
        : undefined) ?? fallback()
    );
  }
  get isAheadOfStart() {
    return this.isHeadAhead;
  }
  admits(command) {
    return !this.isHeadAhead && (this.followersFrom?.has(command) ?? true);
  }
  async waitOut(fn, queue) {
    let activeQueue = queue;
    while (this.isHeld(activeQueue, fn())) {
      this.queuedAtWait ??= new Set(this.messageQueue.getCommandQueue());
      await waitForSignalOr(this.messageQueue, activeQueue);
      activeQueue = getActiveMessageQueue();
    }
  }
  isHeld(queue, fn) {
    return (
      !this.stopping() &&
      queue !== undefined &&
      this.messageQueue.peek(fn) !== undefined &&
      this.messageQueue.peek(isPausedGoalCheckin) === undefined
    );
  }
}
//@ chunk-tyg7f3ek.js:146953-146994 placement
function isPausedGoalCheckin(command) {
  return isActiveMainAgentCommand(command) && isGoalIdleCheckinPaused(command.uuid);
}
//@ chunk-tyg7f3ek.js:146994-147035 placement
function isPausedAnalyticsHold(command) {
  return isActiveMainAgentCommand(command) && isAnalyticsEventName(command.uuid);
}
//@ chunk-tyg7f3ek.js:147035-147159 placement
async function waitForSignalOr(messageQueue, signal) {
  let unsubscribe = () => {};
  let promise = new Promise((resolve) => {
    unsubscribe = messageQueue.subscribe(() => resolve());
  });
  try {
    await Promise.race([signal, promise]);
  } finally {
    unsubscribe();
  }
}
//@ chunk-tyg7f3ek.js:147159-147293 placement
function isSlashCommandInput(command) {
  return (
    lastTextBlockText(command.value)?.startsWith("/") === true &&
    (command.skipSlashCommands !== true ||
      command.bridgeOrigin === true ||
      command.modelScheduledOrigin === true)
  );
}
//@ chunk-tyg7f3ek.js:147293-156636 placement
/**
 * print/headless 主轮次循环：从队列取消息、协调闸门、运行轮次、处理崩溃（Headless turn loop crashed）与收尾。
 */
class HeadlessTurnLoop {
  drain;
  messageQueue;
  prewaitLatch;
  deliveryLedger;
  turnRunner;
  drainSettle;
  turnOutcome;
  io;
  emit;
  drainSdkEvents;
  stopping;
  terminalShutdown;
  endSessionHead;
  commandLacksUserIntent;
  repeatsUsageLimitAlert;
  revokeCodeliveredFollowups;
  deferredToolUsePending;
  idleRelease;
  turnGate;
  session;
  sessionMirror;
  host;
  tornDown = false;
  memoryRecheckOwed = false;
  atTeardown = [];
  tornDownLatch = Promise.withResolvers();
  tornDownSignal = createSignal();
  promptsFetchingFiles = new FetchingUserFilesCounter();
  constructor({
    drain,
    messageQueue,
    prewaitLatch,
    deliveryLedger,
    turnRunner,
    drainSettle,
    turnOutcome,
    io,
    emit,
    drainSdkEvents,
    stopping,
    terminalShutdown,
    endSessionHead,
    commandLacksUserIntent,
    repeatsUsageLimitAlert,
    revokeCodeliveredFollowups,
    deferredToolUsePending,
    idleRelease,
    turnGate,
    session,
    sessionMirror,
    host,
  }) {
    this.drain = drain;
    this.messageQueue = messageQueue;
    this.prewaitLatch = prewaitLatch;
    this.deliveryLedger = deliveryLedger;
    this.turnRunner = turnRunner;
    this.drainSettle = drainSettle;
    this.turnOutcome = turnOutcome;
    this.io = io;
    this.emit = emit;
    this.drainSdkEvents = drainSdkEvents;
    this.stopping = stopping;
    this.terminalShutdown = terminalShutdown;
    this.endSessionHead = endSessionHead;
    this.commandLacksUserIntent = commandLacksUserIntent;
    this.repeatsUsageLimitAlert = repeatsUsageLimitAlert;
    this.revokeCodeliveredFollowups = revokeCodeliveredFollowups;
    this.deferredToolUsePending = deferredToolUsePending;
    this.idleRelease = idleRelease;
    this.turnGate = turnGate;
    this.session = session;
    this.sessionMirror = sessionMirror;
    this.host = host;
  }
  turnAbortSignal() {
    return (
      this.drain.abortController && !this.drain.abortController.signal.aborted
        ? this.drain.abortController
        : createAbortController()
    ).signal;
  }
  teardown() {
    if (this.tornDown) return false;
    this.tornDown = true;
    this.drain.endSessionRequested = true;
    this.deliveryLedger.freezeTerminals();
    for (let fn of this.atTeardown.splice(0))
      try {
        fn();
      } catch (error) {
        logError(error);
      }
    this.drain.abortController?.abort(userAbortReason("shutdown"));
    this.tornDownLatch.resolve();
    this.tornDownSignal.emit();
    return true;
  }
  isTornDown() {
    return this.tornDown;
  }
  whenTornDown() {
    return this.tornDownLatch.promise;
  }
  raceTeardown(promise) {
    let deferred = Promise.withResolvers();
    let onTorn = () => void this.tornDownLatch.promise.then(() => deferred.resolve(undefined));
    let unsubscribe = this.tornDownSignal.subscribe(onTorn);
    if (this.tornDown) onTorn();
    return Promise.race([promise, deferred.promise]).finally(unsubscribe);
  }
  releaseAtTeardown(fn) {
    if (this.tornDown) {
      fn();
      return;
    }
    this.atTeardown.push(fn);
  }
  recheckMemoryContextAfterTurn() {
    if (
      !this.memoryRecheckOwed ||
      this.drain.endSessionRequested ||
      this.drain.inputClosed ||
      this.stopping() ||
      this.terminalShutdown()
    )
      return;
    this.memoryRecheckOwed = false;
    try {
      fetchTurnEndMemoryContext(this.session);
    } catch (error) {
      logError(error);
    }
  }
  async run() {
    let { drain, messageQueue, host } = this;
    if (
      drain.running ||
      this.stopping() ||
      this.terminalShutdown() ||
      configProbeEnv() ||
      (drain.endSessionRequested && messageQueue.peek(this.endSessionHead) === undefined)
    )
      return;
    drain.running = true;
    drain.runPhase = undefined;
    drain.runningReported = false;
    let turnStartClock = drain.turnStartClock;
    turnStartClock.enter("entry_joins");
    host.onEntry();
    this.io.resetStallWatchdog();
    this.idleRelease.stop();
    let pass = host.beforeDrain();
    for (let step = pass.next(); !step.done;) {
      let value;
      try {
        value = await step.value;
      } catch (error) {
        step = pass.throw(error);
        continue;
      }
      step = pass.next(value);
    }
    let run = host.openRun();
    let crashed = false;
    let released;
    let settleCommitted;
    try {
      let again = false;
      let firstCommand = true;
      let headWaiter = new QueueHeadWaiter(messageQueue, this.stopping);
      let promptWait = "none";
      let coordinator = new TurnStartCoordinator({
        messageQueue,
        drain,
        prewaitLatch: this.prewaitLatch,
        deliveryLedger: this.deliveryLedger,
        io: this.io,
        commandLacksUserIntent: this.commandLacksUserIntent,
        revokeCodeliveredFollowups: this.revokeCodeliveredFollowups,
        stopping: this.stopping,
        endSessionHead: this.endSessionHead,
        startGate: {
          takeHead: (predicate, take) => {
            host.setAsideHeldInput?.();
            return headWaiter.takeHead(predicate, take);
          },
          admits: (command) => headWaiter.admits(command),
        },
        onHead: (head) => host.onHead(head),
        replayMerged: (members, command) => host.replayMerged(members, command),
        deferredToolUsePending: this.deferredToolUsePending,
        holdsEvalSettles: () => host.holdsEvalSettles?.() ?? false,
        coalesceTaskNotifications: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_swirling_meteor", true),
        repeatsUsageLimitAlert: this.repeatsUsageLimitAlert,
        headYields: (head, decidedAt) => {
          if (
            shouldYieldRescueTurn({
              head,
              queued: messageQueue.getCommandQueueSnapshot(),
              stopLatched: this.prewaitLatch.stopLatched,
              decidedAt,
              promptWait,
            })
          ) {
            host.onRescueGaveWay();
            return true;
          }
          return (
            decidedAt === "before_start" &&
            (toolStateSlot.peek(this.session)?.toolState.get(HostReturnWakeTracker).lapsedAtTurnStart(head) ??
              isHostReturnWake(head))
          );
        },
      });
      let runPasses = async () => {
        headWaiter = new QueueHeadWaiter(messageQueue, this.stopping);
        let headPredicate = () =>
          drain.endSessionRequested ? this.endSessionHead : isActiveMainAgentCommand;
        for (;;) {
          turnStartClock.enter("session_start_wait");
          let wait = headWaiter.waitForHead(headPredicate);
          if (wait) await wait;
          let summary =
            !this.stopping() &&
            this.io.sessionState.turnEndSummaryOutstanding() &&
            this.messageQueue.peek(headPredicate()) !== undefined
              ? this.io.sessionState.waitForTurnEndSummary()
              : undefined;
          if (summary !== undefined) {
            turnStartClock.enter("earlier_turn");
            await this.raceTeardown(summary);
            continue;
          }
          let serializer = switchSerializerSlot.of(this.session);
          if (
            serializer.pending > 0 &&
            !this.stopping() &&
            this.messageQueue.peek(
              (queued) => queued.handedOffTurn?.kind === "run" && headPredicate()(queued),
            ) !== undefined
          ) {
            logForDiagnosticsNoPII("info", "cli_turn_handoff_waits_for_model", {
              barrier_pending: serializer.pending,
            });
            await serializer.tail;
            continue;
          }
          let inheritedJoin =
            !this.stopping() && !drain.endSessionRequested ? host.inheritedPromptAnswerJoin?.() : undefined;
          if (inheritedJoin !== undefined) {
            turnStartClock.enter("earlier_turn");
            await inheritedJoin;
            continue;
          }
          promptWait = "none";
          let batch = coordinator.take();
          if (batch === undefined) {
            turnStartClock.enter("after_turn");
            break;
          }
          turnStartClock.enter("turn_joins");
          if (firstCommand) {
            firstCommand = false;
            turnStartClock.enter("first_command");
            let pass = host.firstCommand();
            for (let step = pass.next(); !step.done;) {
              let value;
              try {
                value = await step.value;
              } catch (error) {
                step = pass.throw(error);
                continue;
              }
              step = pass.next(value);
            }
            turnStartClock.enter("turn_joins");
          }
          let modulesJoin;
          try {
            modulesJoin =
              !this.stopping() && !drain.endSessionRequested
                ? (host.hooksModulesSwitchJoin?.() ?? null)
                : null;
          } catch (error) {
            modulesJoin = Promise.reject(error);
          }
          if (modulesJoin !== null) await this.raceTeardown(modulesJoin.catch(logError));
          let pluginsJoin =
            !this.stopping() && !drain.endSessionRequested
              ? (host.accountPluginsJoin?.(batch) ?? null)
              : null;
          if (pluginsJoin !== null) await pluginsJoin;
          let mountJoin = host.turnMountJoin?.(batch) ?? null;
          if (mountJoin !== null) await mountJoin;
          let sdkMcpJoin = host.sdkMcpServersJoin?.(batch) ?? null;
          if (sdkMcpJoin !== null) await sdkMcpJoin;
          let mcpJoin = host.deferredMcpServersJoin?.(batch) ?? null;
          if (mcpJoin !== null) await mcpJoin;
          let yieldWatch;
          try {
            yieldWatch =
              !this.stopping() && !drain.endSessionRequested
                ? maybeYieldToPersonPrompt({
                    head: batch.command,
                    messageQueue,
                    prewaitLatch: this.prewaitLatch,
                    fetchingFiles: this.promptsFetchingFiles,
                  })
                : null;
          } catch (error) {
            logError(error);
            yieldWatch = null;
          }
          promptWait = yieldWatch === null ? "none" : ((await this.raceTeardown(yieldWatch)) ?? "timed_out");
          let ending = this.stopping() || drain.endSessionRequested;
          let organizationsLoadFailed = drain.inputClosed && drain.organizationsLoadFailed;
          let orgGate =
            host.organizationsLoadGate?.(ending ? "ending" : organizationsLoadFailed ? "failed" : "open") ??
            null;
          let orgVerdict =
            orgGate === null
              ? {
                  kind: "start",
                }
              : ((await this.raceTeardown(orgGate)) ?? {
                  kind: "ended",
                });
          if (orgVerdict.kind === "failed") {
            drain.organizationsLoadFailed = true;
            drain.batchLeftUnstarted = true;
            this.prewaitLatch.dropParkedBatch();
            discardPollEvent(batch.members, orgVerdict.message);
            this.deliveryLedger.startBatch(batch.members);
            this.turnOutcome.reportUnrunTurnFailed(this.io.sessionState, orgVerdict.message);
            this.emit({
              ...emitLoadError(this.session.id, [orgVerdict.message], batch.uuids[0]),
              terminal_reason: "turn_setup_failed",
            });
            this.deliveryLedger.settleBatch({
              batchUuids: batch.uuids,
              deliveredPollBatchUuids: [],
              terminalReason: "turn_setup_failed",
              aborted: false,
            });
            turnStartClock.enter("after_turn");
            continue;
          }
          if (
            this.tornDown ||
            orgVerdict.kind === "ended" ||
            (yieldWatch !== null && (this.stopping() || drain.endSessionRequested))
          ) {
            drain.batchLeftUnstarted ||= orgVerdict.kind === "ended";
            turnStartClock.enter("after_turn");
            break;
          }
          turnStartClock.enter("tool_pool");
          let tools = host.wireTurn(batch);
          drain.batchLeftUnstarted = false;
          drain.organizationsLoadFailed = false;
          turnStartClock.enter("commit");
          let committed = coordinator.commit(batch);
          if (committed === undefined) continue;
          let { command } = committed;
          drain.intentBatchInFlight = !this.commandLacksUserIntent(command);
          if (drain.intentBatchInFlight) devIntentTracker.of(this.session.host).turnStarting();
          host.onCommitted(committed);
          let deliveredPollBatchUuids = coordinator.start(committed);
          settleCommitted = committed;
          let input =
            command.mode === "poll-event"
              ? wrapInSystemReminder(
                  buildPollEventDelivery(
                    [getPollEventEnvelope(command)],
                    0,
                    listUnreadableToolsUsed(getConversationToolsUsed().names(), []),
                  ),
                )
              : command.value;
          host.beforeArm({
            batch: committed,
            input,
          });
          let abortController = this.turnRunner.arm(committed);
          turnStartClock.enter("after_arm");
          let afterArm = host.afterArm({
            batch: committed,
            signal: abortController.signal,
            aheadOfStart: headWaiter.isAheadOfStart,
          });
          if (afterArm) await afterArm;
          turnStartClock.enter("turn_gate");
          let gatePrompt = this.turnGate?.beforeTurn(abortController.signal) ?? null;
          if (gatePrompt !== null) {
            let gateAnswer = await gatePrompt;
            if (gateAnswer.kind === "fail") throw new TurnRefusedError(gateAnswer.message);
          }
          let refusalPromise =
            command.shouldQuery === false && !isSlashCommandInput(command)
              ? undefined
              : host.refuseStart?.(committed, abortController.signal);
          let inPlaceOfFirstRequest = refusalPromise === undefined ? undefined : await refusalPromise;
          turnStartClock.enter("turn_open");
          headlessProfilerCheckpoint("before_ask");
          startQueryProfile();
          let turnEnd = await this.turnRunner.run({
            batch: committed,
            input,
            tools,
            intake: coordinator,
            turnStartClock,
            inPlaceOfFirstRequest,
          });
          turnStartClock.enter("after_turn");
          this.memoryRecheckOwed ||= command.shouldQuery !== false;
          let settle = this.drainSettle.settleBatch({
            batch:
              turnEnd.putBack.size === 0
                ? committed
                : {
                    uuids: committed.uuids.filter((uuid) => !turnEnd.putBack.has(uuid)),
                    members: committed.members,
                  },
            deliveredPollBatchUuids,
            turnEnd,
            turnSignal: abortController.signal,
          });
          settleCommitted = undefined;
          if (settle) await settle;
          logForDiagnosticsNoPII("info", "cli_ask_turn_complete", {
            should_query: command.shouldQuery,
            batch_size: committed.members.length,
            mode: command.mode,
          });
          host.afterTurn({
            batch: committed,
            signal: abortController.signal,
            turnEnd,
          });
          logHeadlessProfilerTurn();
          finishQueryProfile();
          headlessProfilerStartTurn();
        }
      };
      do {
        for (let event of this.drainSdkEvents()) this.emit(event);
        turnStartClock.enter("loop_top");
        let loopWork = host.loopTop();
        if (loopWork) await loopWork;
        let summary =
          !this.stopping() &&
          this.io.sessionState.turnEndSummaryOutstanding() &&
          messageQueue.peek(isActiveMainAgentCommand) !== undefined
            ? this.io.sessionState.waitForTurnEndSummary()
            : undefined;
        if (summary !== undefined) {
          turnStartClock.enter("earlier_turn");
          await this.raceTeardown(summary);
          turnStartClock.enter("loop_top");
        }
        if (
          messageQueue.peek(isActiveMainAgentCommand) !== undefined &&
          !(host.holdsEvalSettles?.() ?? false)
        )
          host.onLoopTopWork();
        drain.runPhase = "draining_commands";
        let commandsProcessed = coordinator.commandsProcessed;
        try {
          await runPasses();
        } finally {
          coordinator.exit();
        }
        let passResult = run.afterPass({
          drained: coordinator.commandsProcessed > commandsProcessed,
        });
        again = passResult !== "done";
        if (typeof passResult !== "string") {
          turnStartClock.enter("background_wait");
          this.recheckMemoryContextAfterTurn();
          await passResult;
        }
      } while (again);
      logForDiagnosticsNoPII("info", "cli_drain_queue_complete", {
        commands_processed: coordinator.commandsProcessed,
        queue_depth_at_exit: messageQueue.getCommandQueueLength(),
      });
      let heldRelease = host.releaseHeld();
      if (heldRelease !== undefined) await heldRelease;
    } catch (error) {
      turnStartClock.enter("after_turn");
      crashed = true;
      await this.turnOutcome.emitSessionCrash(error, {
        io: this.io,
        session: this.session,
        sessionMirror: this.sessionMirror,
      });
      host.onCrash(error, settleCommitted);
      return;
    } finally {
      released = await this.drainSettle.release({
        crashed,
        raceTeardown: (promise) => this.raceTeardown(promise),
      });
      if (!drain.running) turnStartClock.enter("idle");
    }
    if (released === "rekicked") return;
    if (!drain.running) this.recheckMemoryContextAfterTurn();
    let releasePass = run.afterRelease();
    let step = releasePass.next();
    while (!step.done) {
      let value;
      try {
        value = await step.value;
      } catch (error) {
        step = releasePass.throw(error);
        continue;
      }
      step = releasePass.next(value);
    }
    if (step.value === "rekicked") return;
    if (drain.inputClosed) await host.onInputClosed();
  }
}
//@ chunk-tyg7f3ek.js:156673-156746 placement
function safeAsyncCall(fn) {
  try {
    return fn()?.catch(logError) ?? null;
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-tyg7f3ek.js:156746-156813 placement
var MODS_LOAD_STATE_READERS = {
  isFirstReadOwed: () => isOrganizationModsLoadPending(),
  isUnreadPastItsBounds: () => isPolicyUnreadPastItsBounds(),
};
//@ chunk-tyg7f3ek.js:156813-156944 placement
function isFirstReadOverdue(readers = MODS_LOAD_STATE_READERS, extra = false) {
  try {
    let owed = extra || (hooksModulesGateFromPayload() && resolveHooksModulesValue());
    return readers.isFirstReadOwed() && owed && readers.isUnreadPastItsBounds();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-tyg7f3ek.js:156944-157323 placement
function pluginHookReloader(host) {
  return {
    reload: async () => {
      let { clearPluginHookCache, loadPluginHooks } = await import("../../utils/plugins/loadPluginHooks.js");
      clearPluginHookCache();
      await loadPluginHooks(host.storageV5, host.credentials);
    },
    tell: (content) =>
      host.enqueue({
        type: "system",
        subtype: "informational",
        content,
        level: "warning",
        uuid: randomUUID(),
        session_id: getSessionId(),
      }),
    standDown: async () => {
      let { standDownInstalledHooksModules } = await import("../../utils/plugins/loadPluginHooks.js");
      await standDownInstalledHooksModules();
    },
  };
}
//@ chunk-tyg7f3ek.js:157323-157632 placement
function createPluginHookRefresh(host) {
  let { reload, tell, standDown } = pluginHookReloader(host);
  let waitCloud = () => safeAsyncCall(() => waitForCloudModsHold(reload, tell));
  let first = waitCloud();
  function followJudge() {
    let promise = followRolloutWithDeadline(reload, tell, standDown);
    return first !== null || promise === null ? promise : promise.then(() => waitCloud() ?? undefined);
  }
  function judge() {
    let promise = safeAsyncCall(() => rejudgeLoadedMods(reload, tell));
    if (promise === null) return followJudge();
    return promise.then(() => followJudge() ?? undefined);
  }
  if (first === null) return judge();
  return first.then(() => judge() ?? undefined);
}
//@ chunk-tyg7f3ek.js:157632-157708 placement
function reloadPluginHooksNow(host) {
  return isOrganizationModsLoadPending()
    ? runOrganizationStatusLoadOnce(pluginHookReloader(host).reload, true).catch(logError)
    : Promise.resolve();
}
//@ chunk-tyg7f3ek.js:157708-158051 placement
function refreshPluginHooksOnClaim(host, verdict) {
  if (verdict !== "open") {
    let refusal =
      verdict === "ending"
        ? {
            kind: "ended",
          }
        : {
            kind: "failed",
            message: isFirstReadOverdue()
              ? ORGANIZATION_POLICY_UNREADABLE_MESSAGE
              : ORGANIZATION_MODS_UNLOADED_MESSAGE,
          };
    return isOrganizationModsLoadPending() ? Promise.resolve(noteTurnGatePolicyUnread(refusal)) : null;
  }
  let { reload, tell, standDown } = pluginHookReloader(host);
  let deferred = Promise.withResolvers();
  let wait = waitForOrganizationModsOnClaim(
    reload,
    tell,
    standDown,
    Promise.race([host.ended, deferred.promise]),
    isFirstReadOverdue,
  );
  if (wait === null) return null;
  let cleanup = registerCleanup(async () => deferred.resolve());
  return wait.finally(cleanup).then(noteTurnGatePolicyUnread);
}
//@ chunk-tyg7f3ek.js:158051-158166 placement
function noteTurnGatePolicyUnread(verdict) {
  if (verdict.kind === "failed" && verdict.message === ORGANIZATION_POLICY_UNREADABLE_MESSAGE)
    logFeatureBad("plugin_function_hooks_turn_gate", "policy_unread");
  return verdict;
}
//@ chunk-tyg7f3ek.js:158166-158242 placement
function reloadPluginHooksQuiet(host) {
  return isOrganizationModsLoadPending()
    ? runOrganizationStatusLoadOnce(pluginHookReloader(host).reload, false).catch(logError)
    : Promise.resolve();
}
//@ chunk-tyg7f3ek.js:158242-158351 placement
var TURN_LOOP_CRASHED; // deferred: uses ERRNO_NAMES (../../utils/errorRedaction.js) of its import cycle while loading; runs once the cycle is complete
var ALLOWED_ERROR_NAMES;
var ERROR_STACK_GETTER;
deferInit("chunk-tyg7f3ek.js:158242", () => {
  TURN_LOOP_CRASHED = "Headless turn loop crashed";
  ALLOWED_ERROR_NAMES = new Set(ERRNO_NAMES_COPY);
  ERROR_STACK_GETTER = Object.getOwnPropertyDescriptor(Error(), "stack")?.get;
});
//@ chunk-tyg7f3ek.js:158351-159588 placement
/**
 * 轮次循环崩溃时上报错误名/消息/堆栈摘要（避免读取不安全的 stack）。
 */
function reportTurnLoopCrash(error) {
  try {
    if (isTerminalShutdown()) return;
    let isError = !isUntrustedObject(error) && error instanceof Error;
    if (isError && error instanceof TurnRefusedError) return;
    let name = isError ? protoDataString(error, "name") : undefined;
    let message = isError ? protoDataString(error, "message") : undefined;
    let stack = (() => {
      try {
        let descriptor =
          isError && name !== undefined && message !== undefined
            ? Object.getOwnPropertyDescriptor(error, "stack")
            : undefined;
        return descriptor === undefined || "value" in descriptor
          ? descriptor?.value
          : ERROR_STACK_GETTER !== undefined && descriptor.get === ERROR_STACK_GETTER
            ? Reflect.apply(ERROR_STACK_GETTER, error, [])
            : undefined;
      } catch {
        return;
      }
    })();
    let safeError = isError
      ? Object.create(
          Object.getPrototypeOf(error),
          import_mapValues(
            {
              name,
              message,
              stack,
              code: ownDataValue(error, "code"),
              errno: ownDataValue(error, "errno"),
              syscall: ownDataValue(error, "syscall"),
              constructor: {
                name: constructorNameOf(error),
              },
            },
            (value) => ({
              value,
            }),
          ),
        )
      : undefined;
    let codeName = safeError && pickAllowedName(ALLOWED_ERROR_NAMES, ownDataValue(safeError, "code"));
    let label =
      safeError === undefined
        ? "UnknownError"
        : codeName !== undefined
          ? `Error:${codeName}`
          : (pickAllowedName(LANGUAGE_ERROR_NAMES, name) ?? "Error");
    let title = `${TURN_LOOP_CRASHED} (${label})`;
    let safeStack =
      safeError !== undefined && typeof stack === "string" ? stripStackHeader(safeError) : undefined;
    let stackUsable =
      safeStack !== undefined &&
      safeStack !== stack &&
      safeStack
        .split(
          `
`,
        )
        .every((line) => line.trim() === "" || line.trim().startsWith("at "));
    let report = withTelemetryMessage(Error("Headless turn loop crashed"), title);
    let className = safeError !== undefined && stackUsable ? errorClassName(safeError) : undefined;
    logError(
      safeError === undefined || className === undefined
        ? report
        : Object.assign(report, {
            name: className,
            stack: `${className}: ${TURN_LOOP_CRASHED}
${safeStack}`,
            code: ownDataValue(safeError, "code"),
            errno: ownDataValue(safeError, "errno"),
            syscall: ownDataValue(safeError, "syscall"),
          }),
    );
    logForDebugging(
      typeof stack === "string"
        ? `${title}: error message left out of this line, as it may hold private data; a local session's result has it in errors[0]`
        : `${title}: what was thrown has no stack that can be read safely`,
      {
        level: "error",
      },
    );
  } catch {}
}
//@ chunk-tyg7f3ek.js:159588-159651 placement
function pickAllowedName(allowed, name) {
  return typeof name === "string" && allowed.has(name) ? name : undefined;
}
//@ chunk-tyg7f3ek.js:159651-159914 placement
function constructorNameOf(object) {
  if (object === null) return;
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(object, "constructor");
  if (ownPropertyDescriptor === undefined) return constructorNameOf(Object.getPrototypeOf(object));
  let name =
    "value" in ownPropertyDescriptor &&
    typeof ownPropertyDescriptor.value === "function" &&
    !isUntrustedObject(ownPropertyDescriptor.value)
      ? ownDataValue(ownPropertyDescriptor.value, "name")
      : undefined;
  return typeof name === "string" ? name : undefined;
}
//@ chunk-tyg7f3ek.js:159914-160020 placement
function ownDataValue(object, key) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(object, key);
  return ownPropertyDescriptor !== undefined && "value" in ownPropertyDescriptor
    ? ownPropertyDescriptor.value
    : undefined;
}
//@ chunk-tyg7f3ek.js:160020-160098 placement
function watchTaskChanges({ store, ...options }) {
  return createDependencyWatcher(
    [store],
    () => [store.getState().tasks],
    () => maybeReportIdleWithBackgroundTasks(options),
  );
}
//@ chunk-tyg7f3ek.js:160098-160331 placement
function maybeReportIdleWithBackgroundTasks({ drain, io, ccrRecap, stopping, idleAllowedAtTurnEnd }) {
  try {
    if (
      drain.running ||
      stopping() ||
      io.sessionState.getState() !== "running" ||
      !reportsRunningBackgroundTasks() ||
      !idleAllowedAtTurnEnd()
    )
      return;
    io.sessionState.notifyStateChanged("idle");
    maybeStartCcrRecap(ccrRecap, io.sessionState);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:160331-160361 placement
var MCP_PREWAIT_BUDGET_MS = 8000;
var MCP_PREWAIT_MAX_BUDGET_MS = 1e4;
var MAX_PREWAIT_MCP_SERVERS = 8;
var MAX_MCP_SERVER_NAME_CHARS = 64;
//@ chunk-tyg7f3ek.js:160361-160564 placement
function parseMcpPrewaitServers(value, budgetMs) {
  if (value === undefined || budgetMs === 0) return;
  let sliced = uniq(
    value
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0 && name.length <= MAX_MCP_SERVER_NAME_CHARS),
  ).slice(0, MAX_PREWAIT_MCP_SERVERS);
  if (sliced.length === 0) return;
  return {
    names: sliced,
    budgetMs: Math.min(budgetMs ?? MCP_PREWAIT_BUDGET_MS, MCP_PREWAIT_MAX_BUDGET_MS),
  };
}
//@ chunk-tyg7f3ek.js:160564-163023 placement
/**
 * 轮次开始前等待指定 MCP 服务器连接（CLAUDE_CODE_MCP_PREWAIT_SERVERS）或连接器预等待，带截止时间。
 */
class McpPrewait {
  names;
  deadlineAt;
  budgetMs;
  namedCount;
  coordinatorMainThreadOnly;
  relayMarked;
  relayHoldLog;
  startedFromTranscript;
  mainThreadRequested;
  mcpClients;
  waitForPendingMcp;
  reported = false;
  logged;
  constructor(options) {
    this.coordinatorMainThreadOnly = options.coordinatorMainThreadOnly;
    this.relayMarked = options.relayMarked;
    this.relayHoldLog = options.relayHoldLog;
    this.startedFromTranscript = options.startedFromTranscript;
    this.mainThreadRequested = options.mainThreadRequested;
    this.mcpClients = options.mcpClients;
    this.waitForPendingMcp = options.waitForPendingMcp;
    let names = options.setting?.names ?? [];
    this.namedCount = names.length;
    this.budgetMs = options.setting?.budgetMs ?? 0;
    this.deadlineAt = options.kickedAtMs + this.budgetMs;
    if (names.length === 0) {
      this.names = new Set();
      return;
    }
    let dynamicNames = new Set(
      options
        .mcpClients()
        .filter((client) => client.config.scope === "dynamic" && !isPluginServerConfig(client.config))
        .map((client) => client.name),
    );
    this.names = new Set(names.filter((name) => dynamicNames.has(name)));
    if (names.length > this.names.size)
      logForDebugging(
        `[MCP] CLAUDE_CODE_MCP_PREWAIT_SERVERS names servers with no --mcp-config row at start-up; not waiting for: ${names.filter((name) => !dynamicNames.has(name)).join(", ")}`,
      );
  }
  join(signal) {
    if (!signal || this.names.size === 0) return null;
    if (this.mainThreadRequested()) {
      this.report("request_started", 0);
      return null;
    }
    if (!this.stillPending()) {
      this.report("not_pending", 0);
      return null;
    }
    let startTime = performance.now();
    let rounded = Math.round(this.deadlineAt - startTime);
    if (rounded <= 0) {
      this.report("deadline_passed", 0);
      return null;
    }
    let waitFailed = false;
    return this.waitForPendingMcp(rounded, {
      waitForDeferrable: true,
      localOnly: false,
      coordinatorMainThreadOnly: this.coordinatorMainThreadOnly,
      relayMarked: this.relayMarked,
      ...this.relayHoldLog,
      onlyServerNames: this.names,
    })
      .catch((error) => {
        waitFailed = true;
        logError(error);
      })
      .then(() =>
        this.report(
          waitFailed ? "held_wait_failed" : this.stillPending() ? "held_timed_out" : "held_settled",
          performance.now() - startTime,
        ),
      )
      .catch(logError);
  }
  loggedReport() {
    return this.logged;
  }
  stillPending() {
    return this.mcpClients().some((client) => client.type === "pending" && this.names.has(client.name));
  }
  report(outcome, waitedMs) {
    if (this.reported) return;
    this.reported = true;
    let fields = {
      namedCount: this.namedCount,
      inLaunchSetCount: this.names.size,
      connectedCount: count(
        this.mcpClients(),
        (client) => client.type === "connected" && this.names.has(client.name),
      ),
      budgetMs: this.budgetMs,
      waitedMs: Math.round(waitedMs),
      relayMarked: this.relayMarked,
      relayHold: this.relayHoldLog.relayHold,
      coordinatorMainThreadOnly: this.coordinatorMainThreadOnly,
      startedFromTranscript: this.startedFromTranscript,
    };
    this.logged = {
      outcome,
      ...fields,
    };
    logEvent("tengu_headless_mcp_launch_named_wait", {
      outcome: fromEnum(outcome),
      ...fields,
    });
    if (outcome === "held_timed_out" || outcome === "held_wait_failed" || outcome === "deadline_passed")
      logFeatureSad("mcp_launch_named_wait", outcome, fields);
    else if (outcome !== "request_started") logFeatureOk("mcp_launch_named_wait", fields);
  }
}
//@ chunk-tyg7f3ek.js:163023-163044 placement
var TRANSCRIPT_UPLOAD_WAIT_MS = 150000;
var TRANSCRIPT_SAVE_POLL_MS = 250;
//@ chunk-tyg7f3ek.js:163044-163393 placement
function createTranscriptSaver({ io, isShuttingDown, uploadWaitMs = TRANSCRIPT_UPLOAD_WAIT_MS }) {
  let transcriptSaver = createTranscriptSaver_2();
  return {
    isOn: () => !isTranscriptPersistenceDisabled(),
    save: async (batch) => {
      if (!(await transcriptSaver.save())) return false;
      let deadline = Date.now() + uploadWaitMs;
      while (io.unsentInternalEvents > 0) {
        if (isShuttingDown() || Date.now() > deadline) return false;
        await sleep(TRANSCRIPT_SAVE_POLL_MS, undefined, {
          unref: true,
        });
      }
      return !isShuttingDown() && io.refusedInternalEvents(batch).length === 0;
    },
    lostSoFar: () => transcriptSaver.lostSoFar() + io.droppedInternalBatches,
  };
}
//@ chunk-tyg7f3ek.js:163393-163567 placement
function isSlashCommandPrompt(command, value, commands) {
  let text = lastTextBlockText(value);
  let isSlashLine =
    text !== null &&
    text.startsWith("/") &&
    (command.skipSlashCommands !== true ||
      (command.bridgeOrigin === true &&
        command.textNotTyped !== true &&
        !bridgeSlashLineBuildsRequest(text, commands())));
  return command.shouldQuery !== false && !isSlashLine;
}
//@ chunk-tyg7f3ek.js:163567-163619 placement
function createInlineMcpTiming() {
  return {
    totalMs: 0,
    firstStartMs: undefined,
  };
}
//@ chunk-tyg7f3ek.js:163619-164071 placement
function recordInlineMcpSetServers(
  inlineMcpTiming,
  { startMs, answeredMs, mainThreadRequested, relayMarked, response },
) {
  let holdMs = answeredMs - startMs;
  inlineMcpTiming.totalMs += holdMs;
  inlineMcpTiming.firstStartMs ??= startMs;
  recordPhase("mcp_set_servers_inline_ms", inlineMcpTiming.totalMs, inlineMcpTiming.firstStartMs);
  let errorCount = Object.keys(response.errors).length;
  let fields = {
    after_first_main_thread_query: mainThreadRequested,
    relay_marked: relayMarked,
    hold_ms: Math.round(holdMs),
    added_count: response.added.length,
    removed_count: response.removed.length,
    error_count: errorCount,
  };
  if (errorCount > 0) logFeatureSad("mcp_set_servers_apply", "server_errors", fields);
  else logFeatureOk("mcp_set_servers_apply", fields);
}
//@ chunk-tyg7f3ek.js:164071-164176 placement
function isIdlePluginRefreshEnabled() {
  return (
    !env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_plugin_refresh_in_idle_enabled", false)
  );
}
//@ chunk-tyg7f3ek.js:164176-164807 placement
async function waitForPluginSyncBudget(host) {
  let timedOut = false;
  try {
    let sync = host.pluginsSync.then(
      () => "settled",
      () => "settled",
    );
    let timeout = sleep(Math.max(0, host.remainingSyncBudgetMs())).then(() => "timeout");
    if ((await Promise.race([sync, timeout])) === "timeout") {
      timedOut = true;
      host.onSyncOutlivedBudget();
    }
  } catch (error) {
    logError(error);
  }
  try {
    let startTime = performance.now();
    let names = await host.serverNamesOwnedBeforePluginsSync();
    await host.refreshPluginState();
    recordPhase("plugin_state_refresh_idle_ms", performance.now() - startTime, startTime);
    if (timedOut) logFeatureSad("plugins_sync_idle_refresh", "sync_timeout");
    else logFeatureOk("plugins_sync_idle_refresh");
    return names;
  } catch (error) {
    logError(error);
    logFeatureBad("plugins_sync_idle_refresh", "reload_failed", {
      error_name: error instanceof Error ? (sanitizeClassName(error.name) ?? lit("Error")) : lit("non-error"),
    });
    return;
  }
}
//@ chunk-tyg7f3ek.js:164807-164943 placement
function needsPluginRefreshAfterIdle(state) {
  if (!state.idleRefreshRan) return false;
  return (
    (state.idleRefreshSyncTimedOut && state.syncLanded) ||
    state.syncRoundReplaced ||
    state.installNeedsRefresh
  );
}
//@ chunk-tyg7f3ek.js:164943-164970 placement
var MCP_RESOURCE_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:164943", () => {
  MCP_RESOURCE_TOOL_NAMES = new Set([
    LISTMCPRESOURCESTOOL,
    READMCPRESOURCETOOL,
    READ_MCP_RESOURCE_DIR_TOOL_NAME,
  ]);
});
//@ chunk-tyg7f3ek.js:164970-165076 placement
var coordinatorModeModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var teleportRelayCarrierModule;
var relayUsabilityModule;
deferInit("chunk-tyg7f3ek.js:164970", () => {
  coordinatorModeModule = require("../../coordinator/coordinatorMode.js");
  teleportRelayCarrierModule = require("../../utils/teleport/relayEnv.js");
  relayUsabilityModule = require("../../services/teleport/relayState.js");
});
//@ chunk-tyg7f3ek.js:165076-165146 placement
function mcpClientModule_6() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-tyg7f3ek.js:165146-166129 placement
function planMcpConnectorPrewait(options) {
  let isSdkUrl = Boolean(options.sdkUrl) && !isBridgeEnvironment();
  let isCoordinator = coordinatorModeModule.isCoordinatorMode();
  let CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS = isSdkUrl ? env.CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS : undefined;
  let connectorWaitMs =
    CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS === undefined
      ? undefined
      : Math.min(CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS, MAX_TIMER_DELAY_MS);
  let relayMarked = isSdkUrl && isTeleportRelayCarrierPresent();
  let relayHold = relayMarked && !(options.relayHoldFollowsBootVerdict === true && !isRelayStillUsable());
  let localOnly = isSdkUrl && !isCoordinator && connectorWaitMs === undefined;
  let CLAUDE_CODE_MCP_STARTUP_WAIT_MS = env.CLAUDE_CODE_MCP_STARTUP_WAIT_MS;
  let startupWaitMs =
    CLAUDE_CODE_MCP_STARTUP_WAIT_MS === undefined
      ? undefined
      : Math.min(CLAUDE_CODE_MCP_STARTUP_WAIT_MS, MAX_TIMER_DELAY_MS);
  let firstTurnHold = relayHold
    ? "relay"
    : startupWaitMs !== undefined
      ? startupWaitMs > 0
        ? "host_wait"
        : "host_no_wait"
      : !options.hasStreamingInput
        ? "single_shot"
        : isSdkUrl
          ? "ccr_worker"
          : isCoordinator
            ? "coordinator"
            : !options.toolSearchAvailable
              ? "no_tool_search"
              : options.explicitMcpConfigFlag
                ? "explicit_mcp_config"
                : "lifted";
  let named = isSdkUrl
    ? parseMcpPrewaitServers(env.CLAUDE_CODE_MCP_PREWAIT_SERVERS, env.CLAUDE_CODE_MCP_PREWAIT_SERVERS_MS)
    : undefined;
  return {
    deadlineMs: relayHold
      ? Math.max(REMOTE_CONNECT_TIMEOUT_MS, startupWaitMs ?? connectorWaitMs ?? 0)
      : (startupWaitMs ??
        (options.explicitMcpConfigFlag && !isSdkUrl ? getConnectionTimeoutMs() : connectorWaitMs)),
    waitForDeferrable: firstTurnHold !== "lifted" && firstTurnHold !== "host_no_wait",
    firstTurnHold,
    localOnly: localOnly && !relayHold,
    coordinatorMainThreadOnly: isCoordinator,
    relayMarked,
    relayHold,
    ...(named !== undefined && {
      launchNamed: named,
    }),
    skipFullyDeferredServers:
      isSdkUrl && !isCoordinator && options.hasStreamingInput && options.toolSearchAvailable,
    ...(relayHold && {
      laterWakes: {
        deadlineMs: startupWaitMs ?? connectorWaitMs,
        localOnly,
      },
    }),
  };
}
//@ chunk-tyg7f3ek.js:166129-166194 placement
function isTeleportRelayCarrierPresent() {
  return teleportRelayCarrierModule !== null && teleportRelayCarrierModule.teleportRelayCarrierPresent();
}
//@ chunk-tyg7f3ek.js:166194-166257 placement
function isRelayStillUsable() {
  return relayUsabilityModule === null || relayUsabilityModule.relayStillUsableInProcess();
}
//@ chunk-tyg7f3ek.js:166257-166318 placement
function canUseToolSearch() {
  return (
    isToolSearchEnabledOptimistic() &&
    modelSupportsToolReference(getMainLoopModel()) &&
    !isVertexModelWithoutToolSearch(getCanonicalName(getMainLoopModel())) &&
    !isToolSearchLockedOffByDefault()
  );
}
//@ chunk-tyg7f3ek.js:166318-166333 placement
var EMPTY_TOOL_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:166318", () => {
  EMPTY_TOOL_SET = new Set();
});
//@ chunk-tyg7f3ek.js:166333-167115 placement
function discoveredToolsInConversation(messages, sortedOtter) {
  let isUnsorted = (serverName) =>
    sortedOtter !== undefined && count(sortedOtter, (name) => name === serverName) === 1;
  try {
    let servers = new Set();
    let discoveredToolNames = extractDiscoveredToolNames(
      messages,
      sortedOtter && {
        surfaced: {
          exceptAnnouncements: new Set(),
        },
      },
    );
    let surfaced = new Set(discoveredToolNames);
    for (let message of messages)
      if (message.type === "assistant") {
        for (let block of message.message.content)
          if (block.type === "tool_use") {
            discoveredToolNames.add(block.name);
            surfaced.add(block.name);
          }
      } else if (message.type === "attachment") {
        let { attachment } = message;
        if (attachment.type === "deferred_tools_delta") {
          for (let name of stringArray(attachment.addedNames)) discoveredToolNames.add(name);
          for (let name of stringArray(attachment.wireHiddenNames)) {
            discoveredToolNames.add(name);
            surfaced.add(name);
          }
        } else if (attachment.type === "mcp_instructions_delta")
          for (let name of stringArray(attachment.addedNames)) {
            let serverName = getPrefixServerKey(name);
            if (!isUnsorted(serverName)) servers.add(serverName);
          }
      }
    for (let discoveredToolName of discoveredToolNames) {
      let mcpInfo = mcpInfoFromString(discoveredToolName);
      if (mcpInfo) {
        if (surfaced.has(discoveredToolName) || !isUnsorted(mcpInfo.serverName))
          servers.add(mcpInfo.serverName);
      } else if (MCP_RESOURCE_TOOL_NAMES.has(discoveredToolName) || discoveredToolName.startsWith("mcp__"))
        return;
    }
    return servers;
  } catch (error) {
    logForDebugging(`MCP prewait: reading the conversation failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-tyg7f3ek.js:167115-167718 placement
function pluginMcpServersRequired({ policyAllows, clients, requiredServerNames, messages }) {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  let remoteEntry =
    REMOTE_ENTRYPOINT_NAMES.some((name) => name === CLAUDE_CODE_ENTRYPOINT) &&
    !env.CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS &&
    !isTeleportRelayCarrierPresent();
  let filtered = clients.filter(
    (client) =>
      client.type === "pending" &&
      (client.config.type === undefined || client.config.type === "stdio") &&
      (client.config.alwaysLoad === false ||
        (client.config.alwaysLoad === undefined && remoteEntry && isFromBuiltinMarketplace(client.config))),
  );
  if (filtered.length === 0 || !policyAllows() || getToolSearchMode() !== "tst" || !canUseToolSearch())
    return EMPTY_TOOL_SET;
  let discovered = discoveredToolsInConversation(
    messages,
    isSortedOtterOn() ? clients.map((client) => getPrefixServerKey(client.name)) : undefined,
  );
  if (discovered === undefined) return EMPTY_TOOL_SET;
  let required = requiredServerNames();
  return new Set(
    filtered
      .map((client) => ({
        name: client.name,
        segment: getPrefixServerKey(client.name),
      }))
      .filter((client) => !required.has(client.segment) && !discovered.has(client.segment))
      .map((client) => client.name),
  );
}
//@ chunk-tyg7f3ek.js:167718-170176 placement
/**
 * 每轮开始前刷新 MCP：等待可延迟服务器、合并本地/插件/动态配置、更新工具与命令。
 */
async function refreshMcpForTurn(
  getState,
  subscribe,
  timeoutMs = TRANSPORT_FALLBACK_TIMEOUT_MS,
  options = {},
) {
  let {
    skipTelemetry = false,
    waitForDeferrable = false,
    localOnly = false,
    coordinatorMainThreadOnly = false,
    relayMarked = false,
    relayHold,
    relayHoldFollowsBootVerdict,
    firstTurnHold,
    requiredServerNames,
    onlyServerNames,
    permissionPromptToolServerName,
    alsoWaitFor,
    skipServerNames,
  } = options;
  let willDefer = !waitForDeferrable && canUseToolSearch();
  let isRequired = (client) => requiredServerNames?.has(getPrefixServerKey(client.name)) ?? false;
  let extraTools = coordinatorMainThreadOnly ? coordinatorExtraToolNames() : [];
  let matches = (client) =>
    (onlyServerNames === undefined || onlyServerNames.has(client.name)) &&
    !skipServerNames?.has(client.name) &&
    (!localOnly || mcpClientModule_6().isLocalMcpServer(client.config)) &&
    (!coordinatorMainThreadOnly || coordinatorMainThreadUsesMcpServer(client, extraTools));
  let isWaited = (client) =>
    matches(client) && (!willDefer || client.config.alwaysLoad === true || isRequired(client));
  let isRequiredPending = (client) => client.type === "pending" && isRequired(client) && matches(client);
  let isPermissionPromptServer = (client) =>
    permissionPromptToolServerName !== undefined &&
    getPrefixServerKey(client.name) === permissionPromptToolServerName;
  let isPermissionPromptPending = (client) => client.type === "pending" && isPermissionPromptServer(client);
  let isAlsoWaited = (client) =>
    client.type === "pending" &&
    alsoWaitFor?.has(client.name) === true &&
    matches(client) &&
    !isWaited(client) &&
    !isPermissionPromptServer(client);
  let isCounted = (client) =>
    client.type === "pending" &&
    (isPermissionPromptServer(client) || isWaited(client) || isAlsoWaited(client));
  let mcp = getState().mcp;
  let pendingBefore = count(mcp.clients, (client) => client.type === "pending");
  let pendingWaited = count(mcp.clients, isCounted);
  let pendingNamed = count(mcp.clients, isAlsoWaited);
  let any = mcp.clients.some(isPermissionPromptPending);
  let toolsBefore = mcp.tools.length;
  let store = {
    getState,
    subscribe,
  };
  let waitedMs = 0;
  let namedOnlyWaitedMs = 0;
  let now = Date.now();
  if (pendingWaited > 0 && timeoutMs > 0) {
    if (pendingNamed > 0) {
      await waitForStoreState(store, (state) => !state.mcp.clients.some(isAlsoWaited), {
        timeoutMs: Math.min(timeoutMs, SHORT_RETRY_MS),
      });
      namedOnlyWaitedMs = Date.now() - now;
    }
    let isAwaited = (client) =>
      client.type === "pending" && (isPermissionPromptServer(client) || isWaited(client));
    if (getState().mcp.clients.some(isAwaited))
      await waitForStoreState(store, (state) => !state.mcp.clients.some(isAwaited), {
        timeoutMs: Math.max(0, now + timeoutMs - Date.now()),
      });
    waitedMs = Date.now() - now;
  }
  let requiredWaitedMs = 0;
  if (timeoutMs < TRANSPORT_FALLBACK_TIMEOUT_MS && getState().mcp.clients.some(isRequiredPending)) {
    await waitForStoreState(store, (state) => !state.mcp.clients.some(isRequiredPending), {
      timeoutMs: Math.max(0, now + TRANSPORT_FALLBACK_TIMEOUT_MS - Date.now()),
    });
    requiredWaitedMs = Date.now() - now - waitedMs;
  }
  let permissionPromptWaitedMs = 0;
  if (any) {
    await waitForStoreState(store, (state) => !state.mcp.clients.some(isPermissionPromptPending), {
      timeoutMs: Math.max(0, now + getConnectionTimeoutMs() - Date.now()),
    });
    permissionPromptWaitedMs = Date.now() - now - waitedMs - requiredWaitedMs;
  }
  if (skipTelemetry) return;
  let mcp_2 = getState().mcp;
  logEvent("tengu_headless_mcp_prewait", {
    localOnly,
    coordinatorMainThreadOnly,
    willDeferMcp: willDefer,
    waitForDeferrable,
    deadlineMs: timeoutMs,
    pendingBefore,
    pendingWaitedBefore: pendingWaited,
    toolsBefore,
    waitedMs,
    permissionPromptServerPendingBefore: any,
    permissionPromptWaitedMs,
    pendingAfter: count(mcp_2.clients, (client) => client.type === "pending"),
    pendingWaitedAfter: count(mcp_2.clients, isCounted),
    permissionPromptServerPendingAfter: mcp_2.clients.some(isPermissionPromptPending),
    relayMarked,
    relayHold,
    relayHoldFollowsBootVerdict,
    namedServersOnly: onlyServerNames !== undefined,
    alsoWaitForCount: alsoWaitFor?.size ?? 0,
    pendingNamedOnlyBefore: pendingNamed,
    namedOnlyWaitedMs,
    toolsAfter: mcp_2.tools.length,
    mcpNonBlocking: getMcpConnectNonBlocking(),
    firstTurnHold: fromEnumOpt(firstTurnHold),
    pendingDeferredBefore: willDefer
      ? count(mcp.clients, (client) => client.type === "pending" && matches(client) && !isCounted(client))
      : 0,
    pendingRequiredBefore: count(mcp.clients, isRequiredPending),
    requiredWaitedMs,
    pendingFullyDeferredSkippedBefore: count(
      mcp.clients,
      (client) =>
        client.type === "pending" && skipServerNames?.has(client.name) === true && !isCounted(client),
    ),
  });
}
//@ chunk-tyg7f3ek.js:170176-170268 placement
function emitOrHoldResult({ message, held, holdBackActive, emit }) {
  if (holdBackActive) {
    held.push(message);
    return;
  }
  flushHeldResults(held, emit);
  emit(message);
}
//@ chunk-tyg7f3ek.js:170268-170316 placement
function flushHeldResults(results, emit) {
  for (let result of results) emit(result);
  results.length = 0;
}
//@ chunk-tyg7f3ek.js:170316-170455 placement
function clearQueuedTurnCount(result, ending) {
  if (
    !ending ||
    result.type !== "result" ||
    result.queued_turn_count === undefined ||
    result.queued_turn_count === 0
  )
    return result;
  return {
    ...result,
    queued_turn_count: 0,
  };
}
export {
  createTranscriptSaver,
  createInlineMcpTiming,
  refreshMcpForTurn,
  reloadPluginHooksNow,
  reloadPluginHooksQuiet,
  planMcpConnectorPrewait,
  pluginMcpServersRequired,
  McpPrewait,
  needsPluginRefreshAfterIdle,
  isSlashCommandPrompt,
  HeadlessTurnLoop,
  createPluginHookRefresh,
  refreshPluginHooksOnClaim,
  reportTurnLoopCrash,
  watchTaskChanges,
  isIdlePluginRefreshEnabled,
  waitForPluginSyncBudget,
  recordInlineMcpSetServers,
  emitOrHoldResult,
  flushHeldResults,
  clearQueuedTurnCount,
};

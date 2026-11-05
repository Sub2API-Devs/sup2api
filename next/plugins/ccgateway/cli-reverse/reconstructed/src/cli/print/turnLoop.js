/**
 * cli/print/turnLoop.ts
 *
 * 2.1.316 新增：无头回合主循环、MCP 预等待与崩溃上报
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (47), chunk-5xgkngpb.js (1)
 * attribution: placement 46, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { LISTMCPRESOURCESTOOL } from "../../tools/ListMcpResourcesTool/prompt.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import {
  isOrphanedPermissionCommand,
  shouldYieldRescueTurn,
  maybeYieldToPersonPrompt,
} from "./commandQueueDrain.js";
import { isBatchHeadHumanCommand, isDrainableMainThreadCommand } from "../../utils/messageQueueManager.js";
import { isGoalIdleCheckinPaused } from "../../query/goalCheckIn.js";
import {
  isAnalyticsEventName,
  createDependencyWatcher,
  createTranscriptSaver as createTranscriptSaver_2,
} from "./rewindStandIn.js";
import { lastTextBlockText } from "../../utils/historyFile.js";
import { createSignal } from "../../utils/signal.js";
import { FetchingUserFilesCounter } from "./backgroundWait.js";
import {
  releaseTurnEndSummaryOnHumanPrompt,
  TurnStartCoordinator,
  HostReturnWakeTracker,
  isHostReturnWake,
  TurnRefusedError,
} from "./turnGate.js";
import { createAbortController, userAbortReason } from "../../utils/abortController.js";
import { logError } from "../../utils/log.js";
import { fetchTurnEndMemoryContext } from "../../services/accountMemory/memoryContext.js";
import { configProbeEnv, knownSubtypeOrUndefined } from "../structuredIOProtocol.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { toolStateSlot } from "../../services/remoteTools/backgroundCommands.js";
import { switchSerializerSlot } from "../../utils/model/modelSwitchHooks.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { discardPollEvent, buildPollEventDelivery, getPollEventEnvelope } from "../../utils/pollEvents.js";
import { emitLoadError, isInterruptOwnedInline, isImmediateInterruptRequest } from "../print.js";
import { devIntentTracker } from "../../services/projects/devIntent.js";
import { wrapInSystemReminder } from "../../utils/messages.js";
import { unreadableToolsFromEntries } from "../../utils/agentListing.js";
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
import { getSessionId, getMcpConnectNonBlocking } from "../../bootstrap/state.js";
import { waitForCloudModsHold } from "../../utils/hooks/hookPolicyHold.js";
import { rejudgeLoadedMods } from "../../utils/hooks.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { ERRNO_NAMES_COPY } from "../../utils/errorRedaction.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isPluginServerConfig } from "../../services/mcp/types.js";
import { countWhere, stringArray } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_LIMBER_FINCH } from "../../services/api/withRetry.js";
import { chatOriginField } from "./transcriptLeaves.js";
import { isTranscriptPersistenceDisabled } from "../../utils/sessionStorage.js";
import { sleep } from "../../utils/sleep.js";
import { bridgeSlashLineBuildsRequest } from "../../bridge/bridgeSlashCommands.js";
import { recordPhase } from "../../utils/startupTiming.js";
import { isBridgeEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import {
  REMOTE_CONNECT_TIMEOUT_MS,
  getConnectionTimeoutMs,
  TRANSPORT_FALLBACK_TIMEOUT_MS,
  SHORT_RETRY_MS,
} from "../../services/mcp/client.js";
import {
  isToolSearchEnabledOptimistic,
  supportsToolReferenceOrPelican,
  isVertexModelWithoutToolSearch,
  isToolSearchLockedOffByDefault,
  extractDiscoveredToolNames,
  getToolSearchMode,
} from "../../utils/toolSearch.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getPrefixServerKey, mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { REMOTE_ENTRYPOINT_NAMES } from "../../utils/entrypointKinds.js";
import { isFromBuiltinMarketplace } from "../../utils/plugins/pluginIdentifier.js";
import { isSortedOtterOn } from "../../services/mcp/mcpGates.js";
import { coordinatorExtraToolNames, coordinatorMainThreadUsesMcpServer } from "../../utils/toolPool.js";
import { waitForStoreState } from "../../context/voice.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3898740-3898768 placement
var MCP_RESOURCE_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3898740", () => {
  MCP_RESOURCE_TOOL_NAMES = new Set([
    LISTMCPRESOURCESTOOL,
    READMCPRESOURCETOOL,
    READ_MCP_RESOURCE_DIR_TOOL_NAME,
  ]);
});
//@ chunk-0yw3taqg.js:177065-178122 placement
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
        (queued) =>
          isOrphanedPermissionCommand(queued) || (predicate(queued) && isBatchHeadHumanCommand(queued)),
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
//@ chunk-0yw3taqg.js:178122-178163 placement
function isPausedGoalCheckin(command) {
  return isDrainableMainThreadCommand(command) && isGoalIdleCheckinPaused(command.uuid);
}
//@ chunk-0yw3taqg.js:178163-178204 placement
function isPausedAnalyticsHold(command) {
  return isDrainableMainThreadCommand(command) && isAnalyticsEventName(command.uuid);
}
//@ chunk-0yw3taqg.js:178204-178328 placement
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
//@ chunk-0yw3taqg.js:178328-178462 placement
function isSlashCommandInput(command) {
  return (
    lastTextBlockText(command.value)?.startsWith("/") === true &&
    (command.skipSlashCommands !== true ||
      command.bridgeOrigin === true ||
      command.modelScheduledOrigin === true)
  );
}
//@ chunk-0yw3taqg.js:178462-188099 placement
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
  noteWaitEndedByMessage;
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
    noteWaitEndedByMessage,
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
    this.noteWaitEndedByMessage = noteWaitEndedByMessage;
    this.releaseAtTeardown(
      messageQueue.subscribe(() => {
        this.endHoldForFollowUp();
      }),
    );
  }
  endHoldForFollowUp() {
    releaseTurnEndSummaryOnHumanPrompt({
      messageQueue: this.messageQueue,
      drain: this.drain,
      io: this.io,
      alsoTo: this.noteWaitEndedByMessage,
    });
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
          drain.endSessionRequested ? this.endSessionHead : isDrainableMainThreadCommand;
        for (;;) {
          turnStartClock.enter("session_start_wait");
          let wait = headWaiter.waitForHead(headPredicate);
          if (wait) await wait;
          this.endHoldForFollowUp();
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
                    unreadableToolsFromEntries([command], []),
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
          messageQueue.peek(isDrainableMainThreadCommand) !== undefined
            ? this.io.sessionState.waitForTurnEndSummary()
            : undefined;
        if (summary !== undefined) {
          turnStartClock.enter("earlier_turn");
          await this.raceTeardown(summary);
          turnStartClock.enter("loop_top");
        }
        if (
          messageQueue.peek(isDrainableMainThreadCommand) !== undefined &&
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
//@ chunk-0yw3taqg.js:188136-188209 placement
function safeAsyncCall(fn) {
  try {
    return fn()?.catch(logError) ?? null;
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-0yw3taqg.js:188209-188276 placement
var MODS_LOAD_STATE_READERS = {
  isFirstReadOwed: () => isOrganizationModsLoadPending(),
  isUnreadPastItsBounds: () => isPolicyUnreadPastItsBounds(),
};
//@ chunk-0yw3taqg.js:188276-188407 placement
function isFirstReadOverdue(readers = MODS_LOAD_STATE_READERS, extra = false) {
  try {
    let owed = extra || (hooksModulesGateFromPayload() && resolveHooksModulesValue());
    return readers.isFirstReadOwed() && owed && readers.isUnreadPastItsBounds();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-0yw3taqg.js:188407-188786 placement
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
//@ chunk-0yw3taqg.js:188786-189095 placement
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
//@ chunk-0yw3taqg.js:189095-189171 placement
function reloadPluginHooksNow(host) {
  return isOrganizationModsLoadPending()
    ? runOrganizationStatusLoadOnce(pluginHookReloader(host).reload, true).catch(logError)
    : Promise.resolve();
}
//@ chunk-0yw3taqg.js:189171-189514 placement
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
//@ chunk-0yw3taqg.js:189514-189629 placement
function noteTurnGatePolicyUnread(verdict) {
  if (verdict.kind === "failed" && verdict.message === ORGANIZATION_POLICY_UNREADABLE_MESSAGE)
    logFeatureBad("plugin_function_hooks_turn_gate", "policy_unread");
  return verdict;
}
//@ chunk-0yw3taqg.js:189629-189705 placement
function reloadPluginHooksQuiet(host) {
  return isOrganizationModsLoadPending()
    ? runOrganizationStatusLoadOnce(pluginHookReloader(host).reload, false).catch(logError)
    : Promise.resolve();
}
//@ chunk-0yw3taqg.js:189705-189814 placement
var TURN_LOOP_CRASHED; // deferred: uses ERRNO_NAMES (../../utils/errorRedaction.js) of its import cycle while loading; runs once the cycle is complete
var ALLOWED_ERROR_NAMES;
var ERROR_STACK_GETTER;
deferInit("chunk-0yw3taqg.js:189705", () => {
  TURN_LOOP_CRASHED = "Headless turn loop crashed";
  ALLOWED_ERROR_NAMES = new Set(ERRNO_NAMES_COPY);
  ERROR_STACK_GETTER = Object.getOwnPropertyDescriptor(Error(), "stack")?.get;
});
//@ chunk-0yw3taqg.js:189814-191051 placement
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
//@ chunk-0yw3taqg.js:191051-191114 placement
function pickAllowedName(allowed, name) {
  return typeof name === "string" && allowed.has(name) ? name : undefined;
}
//@ chunk-0yw3taqg.js:191114-191377 placement
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
//@ chunk-0yw3taqg.js:191377-191483 placement
function ownDataValue(object, key) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(object, key);
  return ownPropertyDescriptor !== undefined && "value" in ownPropertyDescriptor
    ? ownPropertyDescriptor.value
    : undefined;
}
//@ chunk-0yw3taqg.js:191483-191561 placement
function watchTaskChanges({ store, ...options }) {
  return createDependencyWatcher(
    [store],
    () => [store.getState().tasks],
    () => maybeReportIdleWithBackgroundTasks(options),
  );
}
//@ chunk-0yw3taqg.js:191561-191794 placement
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
//@ chunk-0yw3taqg.js:191794-191824 placement
var MCP_PREWAIT_BUDGET_MS = 8000;
var MCP_PREWAIT_MAX_BUDGET_MS = 1e4;
var MAX_PREWAIT_MCP_SERVERS = 8;
var MAX_MCP_SERVER_NAME_CHARS = 64;
//@ chunk-0yw3taqg.js:191824-192027 placement
function parseMcpPrewaitServers(value, budgetMs) {
  if (value === undefined || budgetMs === 0) return;
  let sliced = normalizeCaseForComparison_2(
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
//@ chunk-0yw3taqg.js:192027-194486 placement
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
      connectedCount: countWhere(
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
//@ chunk-0yw3taqg.js:194486-194633 layout
var BESIDE_LOOP_SUBTYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LEFT_TO_NEXT_PROCESS;
deferInit("chunk-0yw3taqg.js:194486", () => {
  BESIDE_LOOP_SUBTYPES = new Set([
    "cancel_async_message",
    "mcp_reconnect",
    "mcp_set_servers",
    "set_model",
    "set_permission_mode",
  ]);
  LEFT_TO_NEXT_PROCESS = Symbol("left to the next process");
});
//@ chunk-0yw3taqg.js:194633-196513 layout
class BesideLoopRequestQueue {
  pending = 0;
  tail = Promise.resolve();
  failed = false;
  startedAtMs = 0;
  requests = 0;
  stop;
  waited;
  drain;
  onEscapedFailure;
  constructor({ drain, onEscapedFailure }) {
    this.drain = drain;
    this.onEscapedFailure = onEscapedFailure;
  }
  static readSwitch() {
    return getRemoteFeatureGateState(TENGU_LIMBER_FINCH);
  }
  takesNext() {
    return this.pending > 0 || BesideLoopRequestQueue.readSwitch() === "on";
  }
  run(start, done) {
    let result;
    if (this.pending === 0) {
      let startedAtMs = performance.now();
      let first = start();
      if (!(first instanceof Promise)) return false;
      result = first;
      this.startedAtMs = startedAtMs;
    } else result = this.tail.then(() => (isTerminalShutdown() ? LEFT_TO_NEXT_PROCESS : start()));
    this.pending++;
    this.requests++;
    this.tail = result
      .then(
        (value) => {
          if (value !== LEFT_TO_NEXT_PROCESS) done();
        },
        (error) => {
          logFeatureBad("headless_mcp_requests_beside_loop", "handler_threw");
          done();
          return this.fail(error);
        },
      )
      .catch((error) => this.fail(error))
      .then(() => {
        this.pending--;
        if (this.pending === 0) this.reportStretch();
      })
      .catch((error) => this.fail(error));
    return true;
  }
  fail(error) {
    this.failed = true;
    this.onEscapedFailure(error);
    return heldUntilExit();
  }
  waitBefore(frame) {
    if (this.failed) return this.tail;
    if (this.pending === 0) return;
    let atMs = performance.now();
    if (frame.type === "control_response" || frame.type === "control_cancel_request") return;
    if (frame.type === "control_request") {
      if (BESIDE_LOOP_SUBTYPES.has(frame.request?.subtype)) return;
      if (
        frame.request?.subtype === "interrupt" &&
        !isInterruptOwnedInline(frame.request_id, frame.request)
      ) {
        if (!isImmediateInterruptRequest(frame.request))
          this.stop ??= {
            atMs,
            turnUnderWay: this.drain.turnUnderWay,
            beforeFirstTurn: this.drain.abortController === undefined,
          };
        return;
      }
    }
    this.waited ??= {
      atMs,
      isUserFrame: frame.type === "user",
      subtype: frame.request?.subtype,
    };
    return this.tail;
  }
  whenIdle() {
    return this.pending === 0 && !this.failed ? undefined : this.tail;
  }
  reportStretch() {
    let startTime = performance.now();
    let { startedAtMs, requests, stop, waited } = this;
    this.requests = 0;
    this.stop = undefined;
    this.waited = undefined;
    logFeatureOk("headless_mcp_requests_beside_loop");
    logForDiagnosticsNoPII("info", "cli_mcp_requests_beside_loop", () => ({
      busy_ms: Math.round(startTime - startedAtMs),
      requests,
      ...(stop && {
        stop_saved_ms: Math.round(startTime - stop.atMs),
        stop_turn_under_way: stop.turnUnderWay,
        stop_before_first_turn: stop.beforeFirstTurn,
      }),
      ...(waited && {
        waited_ms: Math.round(startTime - waited.atMs),
        waited_user_frame: waited.isUserFrame,
        waited_subtype: knownSubtypeOrUndefined(waited.subtype),
      }),
      ...chatOriginField(),
    }));
  }
}
//@ chunk-0yw3taqg.js:196513-196534 placement
var TRANSCRIPT_UPLOAD_WAIT_MS = 150000;
var TRANSCRIPT_SAVE_POLL_MS = 250;
//@ chunk-0yw3taqg.js:196534-196883 placement
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
//@ chunk-0yw3taqg.js:196883-197057 placement
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
//@ chunk-0yw3taqg.js:197057-197109 placement
function createInlineMcpTiming() {
  return {
    totalMs: 0,
    firstStartMs: undefined,
  };
}
//@ chunk-0yw3taqg.js:197109-197589 placement
function recordInlineMcpSetServers(
  initJsonSchema,
  { startMs, answeredMs, heldLoop, mainThreadRequested, relayMarked, response },
) {
  let holdMs = answeredMs - startMs;
  if (heldLoop) {
    initJsonSchema.totalMs += holdMs;
    initJsonSchema.firstStartMs ??= startMs;
    recordPhase("mcp_set_servers_inline_ms", initJsonSchema.totalMs, initJsonSchema.firstStartMs);
  }
  let errorCount = Object.keys(response.errors).length;
  let fields = {
    after_first_main_thread_query: mainThreadRequested,
    relay_marked: relayMarked,
    held_loop: heldLoop,
    hold_ms: Math.round(holdMs),
    added_count: response.added.length,
    removed_count: response.removed.length,
    error_count: errorCount,
  };
  if (errorCount > 0) logFeatureSad("mcp_set_servers_apply", "server_errors", fields);
  else logFeatureOk("mcp_set_servers_apply", fields);
}
//@ chunk-0yw3taqg.js:197650-198281 placement
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
//@ chunk-0yw3taqg.js:198281-198417 placement
function needsPluginRefreshAfterIdle(state) {
  if (!state.idleRefreshRan) return false;
  return (
    (state.idleRefreshSyncTimedOut && state.syncLanded) ||
    state.syncRoundReplaced ||
    state.installNeedsRefresh
  );
}
//@ chunk-0yw3taqg.js:198417-198523 placement
var coordinatorModeModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var teleportRelayCarrierModule;
var relayUsabilityModule;
deferInit("chunk-0yw3taqg.js:198417", () => {
  coordinatorModeModule = require("../../coordinator/coordinatorMode.js");
  teleportRelayCarrierModule = require("../../utils/teleport/relayEnv.js");
  relayUsabilityModule = require("../../services/teleport/relayState.js");
});
//@ chunk-0yw3taqg.js:198523-198593 placement
function mcpClientModule_6() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-0yw3taqg.js:198593-199576 placement
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
//@ chunk-0yw3taqg.js:199576-199641 placement
function isTeleportRelayCarrierPresent() {
  return teleportRelayCarrierModule !== null && teleportRelayCarrierModule.teleportRelayCarrierPresent();
}
//@ chunk-0yw3taqg.js:199641-199704 placement
function isRelayStillUsable() {
  return relayUsabilityModule === null || relayUsabilityModule.relayStillUsableInProcess();
}
//@ chunk-0yw3taqg.js:199704-199765 placement
function canUseToolSearch() {
  return (
    isToolSearchEnabledOptimistic() &&
    supportsToolReferenceOrPelican(getMainLoopModel()) &&
    !isVertexModelWithoutToolSearch(getCanonicalName(getMainLoopModel())) &&
    !isToolSearchLockedOffByDefault()
  );
}
//@ chunk-0yw3taqg.js:199765-199780 placement
var EMPTY_TOOL_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:199765", () => {
  EMPTY_TOOL_SET = new Set();
});
//@ chunk-0yw3taqg.js:199780-200562 placement
function discoveredToolsInConversation(messages, sortedOtter) {
  let isUnsorted = (serverName) =>
    sortedOtter !== undefined && countWhere(sortedOtter, (name) => name === serverName) === 1;
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
//@ chunk-0yw3taqg.js:200562-201165 placement
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
//@ chunk-0yw3taqg.js:201165-203626 placement
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
  let pendingBefore = countWhere(mcp.clients, (client) => client.type === "pending");
  let pendingWaited = countWhere(mcp.clients, isCounted);
  let pendingNamed = countWhere(mcp.clients, isAlsoWaited);
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
    pendingAfter: countWhere(mcp_2.clients, (client) => client.type === "pending"),
    pendingWaitedAfter: countWhere(mcp_2.clients, isCounted),
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
      ? countWhere(
          mcp.clients,
          (client) => client.type === "pending" && matches(client) && !isCounted(client),
        )
      : 0,
    pendingRequiredBefore: countWhere(mcp.clients, isRequiredPending),
    requiredWaitedMs,
    pendingFullyDeferredSkippedBefore: countWhere(
      mcp.clients,
      (client) =>
        client.type === "pending" && skipServerNames?.has(client.name) === true && !isCounted(client),
    ),
  });
}
//@ chunk-0yw3taqg.js:203626-203718 placement
function emitOrHoldResult({ message, held, holdBackActive, emit }) {
  if (holdBackActive) {
    held.push(message);
    return;
  }
  flushHeldResults(held, emit);
  emit(message);
}
//@ chunk-0yw3taqg.js:203718-203766 placement
function flushHeldResults(results, emit) {
  for (let result of results) emit(result);
  results.length = 0;
}
//@ chunk-0yw3taqg.js:203766-203905 placement
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
  BesideLoopRequestQueue,
  waitForPluginSyncBudget,
  recordInlineMcpSetServers,
  emitOrHoldResult,
  flushHeldResults,
  clearQueuedTurnCount,
  MCP_RESOURCE_TOOL_NAMES,
};

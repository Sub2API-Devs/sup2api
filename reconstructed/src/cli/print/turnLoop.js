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
import { $Ei } from "../../utils/errorRedaction.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { isUntrustedObject } from "../../utils/shutdown/pendingWrites.js";
import { protoDataString } from "../../utils/gracefulShutdown.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
  waitForHead(e) {
    let activeMessageQueue = getActiveMessageQueue();
    return this.isHeld(activeMessageQueue, e()) ? this.waitOut(e, activeMessageQueue) : undefined;
  }
  takeHead(e, n) {
    this.isHeadAhead = false;
    this.followersFrom = undefined;
    if (
      getActiveMessageQueue() !== undefined &&
      this.messageQueue.peek(isPausedGoalCheckin) !== undefined &&
      this.messageQueue.peek(e) !== undefined
    ) {
      this.isHeadAhead = true;
      return (
        this.messageQueue.dequeue((h) => isOrphanedPermissionCommand(h) && e(h)) ??
        this.messageQueue.dequeue(isPausedGoalCheckin)
      );
    }
    if (this.isHeld(getActiveMessageQueue(), e)) return;
    this.followersFrom = this.queuedAtWait;
    this.queuedAtWait = undefined;
    return (
      (this.messageQueue.peek((h) => isOrphanedPermissionCommand(h) || (e(h) && isRefillableCommand(h))) ===
      undefined
        ? this.messageQueue.dequeue((h) => e(h) && isPausedAnalyticsHold(h))
        : undefined) ?? n()
    );
  }
  get isAheadOfStart() {
    return this.isHeadAhead;
  }
  admits(e) {
    return !this.isHeadAhead && (this.followersFrom?.has(e) ?? true);
  }
  async waitOut(e, n) {
    let r = n;
    while (this.isHeld(r, e())) {
      this.queuedAtWait ??= new Set(this.messageQueue.getCommandQueue());
      await waitForSignalOr(this.messageQueue, r);
      r = getActiveMessageQueue();
    }
  }
  isHeld(e, n) {
    return (
      !this.stopping() &&
      e !== undefined &&
      this.messageQueue.peek(n) !== undefined &&
      this.messageQueue.peek(isPausedGoalCheckin) === undefined
    );
  }
}
//@ chunk-tyg7f3ek.js:146953-146994 placement
function isPausedGoalCheckin(e) {
  return isActiveMainAgentCommand(e) && isGoalIdleCheckinPaused(e.uuid);
}
//@ chunk-tyg7f3ek.js:146994-147035 placement
function isPausedAnalyticsHold(e) {
  return isActiveMainAgentCommand(e) && isAnalyticsEventName(e.uuid);
}
//@ chunk-tyg7f3ek.js:147035-147159 placement
async function waitForSignalOr(messageQueue, n) {
  let r = () => {};
  let promise = new Promise((resolve) => {
    r = messageQueue.subscribe(() => resolve());
  });
  try {
    await Promise.race([n, promise]);
  } finally {
    r();
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
    for (let e of this.atTeardown.splice(0))
      try {
        e();
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
  raceTeardown(e) {
    let deferred = Promise.withResolvers();
    let r = () => void this.tornDownLatch.promise.then(() => deferred.resolve(undefined));
    let s = this.tornDownSignal.subscribe(r);
    if (this.tornDown) r();
    return Promise.race([e, deferred.promise]).finally(s);
  }
  releaseAtTeardown(e) {
    if (this.tornDown) {
      e();
      return;
    }
    this.atTeardown.push(e);
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
    let h = host.beforeDrain();
    for (let q = h.next(); !q.done;) {
      let x;
      try {
        x = await q.value;
      } catch (error) {
        q = h.throw(error);
        continue;
      }
      q = h.next(x);
    }
    let y = host.openRun();
    let crashed = false;
    let R;
    let w;
    try {
      let q = false;
      let x = true;
      let G = new QueueHeadWaiter(messageQueue, this.stopping);
      let Z = "none";
      let re = new TurnStartCoordinator({
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
          takeHead: (ce, nt) => {
            host.setAsideHeldInput?.();
            return G.takeHead(ce, nt);
          },
          admits: (ce) => G.admits(ce),
        },
        onHead: (ce) => host.onHead(ce),
        replayMerged: (ce, nt) => host.replayMerged(ce, nt),
        deferredToolUsePending: this.deferredToolUsePending,
        holdsEvalSettles: () => host.holdsEvalSettles?.() ?? false,
        coalesceTaskNotifications: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_swirling_meteor", true),
        repeatsUsageLimitAlert: this.repeatsUsageLimitAlert,
        headYields: (ce, nt) => {
          if (
            shouldYieldRescueTurn({
              head: ce,
              queued: messageQueue.getCommandQueueSnapshot(),
              stopLatched: this.prewaitLatch.stopLatched,
              decidedAt: nt,
              promptWait: Z,
            })
          ) {
            host.onRescueGaveWay();
            return true;
          }
          return (
            nt === "before_start" &&
            (toolStateSlot.peek(this.session)?.toolState.get(HostReturnWakeTracker).lapsedAtTurnStart(ce) ??
              isHostReturnWake(ce))
          );
        },
      });
      let Ae = async () => {
        G = new QueueHeadWaiter(messageQueue, this.stopping);
        let ce = () => (drain.endSessionRequested ? this.endSessionHead : isActiveMainAgentCommand);
        for (;;) {
          turnStartClock.enter("session_start_wait");
          let nt = G.waitForHead(ce);
          if (nt) await nt;
          let ie =
            !this.stopping() &&
            this.io.sessionState.turnEndSummaryOutstanding() &&
            this.messageQueue.peek(ce()) !== undefined
              ? this.io.sessionState.waitForTurnEndSummary()
              : undefined;
          if (ie !== undefined) {
            turnStartClock.enter("earlier_turn");
            await this.raceTeardown(ie);
            continue;
          }
          let Se = switchSerializerSlot.of(this.session);
          if (
            Se.pending > 0 &&
            !this.stopping() &&
            this.messageQueue.peek((Pn) => Pn.handedOffTurn?.kind === "run" && ce()(Pn)) !== undefined
          ) {
            logForDiagnosticsNoPII("info", "cli_turn_handoff_waits_for_model", {
              barrier_pending: Se.pending,
            });
            await Se.tail;
            continue;
          }
          let me =
            !this.stopping() && !drain.endSessionRequested ? host.inheritedPromptAnswerJoin?.() : undefined;
          if (me !== undefined) {
            turnStartClock.enter("earlier_turn");
            await me;
            continue;
          }
          Z = "none";
          let Me = re.take();
          if (Me === undefined) {
            turnStartClock.enter("after_turn");
            break;
          }
          turnStartClock.enter("turn_joins");
          if (x) {
            x = false;
            turnStartClock.enter("first_command");
            let Pn = host.firstCommand();
            for (let oo = Pn.next(); !oo.done;) {
              let No;
              try {
                No = await oo.value;
              } catch (error) {
                oo = Pn.throw(error);
                continue;
              }
              oo = Pn.next(No);
            }
            turnStartClock.enter("turn_joins");
          }
          let Ee;
          try {
            Ee =
              !this.stopping() && !drain.endSessionRequested
                ? (host.hooksModulesSwitchJoin?.() ?? null)
                : null;
          } catch (error) {
            Ee = Promise.reject(error);
          }
          if (Ee !== null) await this.raceTeardown(Ee.catch(logError));
          let He =
            !this.stopping() && !drain.endSessionRequested ? (host.accountPluginsJoin?.(Me) ?? null) : null;
          if (He !== null) await He;
          let Xe = host.turnMountJoin?.(Me) ?? null;
          if (Xe !== null) await Xe;
          let We = host.sdkMcpServersJoin?.(Me) ?? null;
          if (We !== null) await We;
          let St = host.deferredMcpServersJoin?.(Me) ?? null;
          if (St !== null) await St;
          let wt;
          try {
            wt =
              !this.stopping() && !drain.endSessionRequested
                ? maybeYieldToPersonPrompt({
                    head: Me.command,
                    messageQueue,
                    prewaitLatch: this.prewaitLatch,
                    fetchingFiles: this.promptsFetchingFiles,
                  })
                : null;
          } catch (error) {
            logError(error);
            wt = null;
          }
          Z = wt === null ? "none" : ((await this.raceTeardown(wt)) ?? "timed_out");
          let Lt = this.stopping() || drain.endSessionRequested;
          let organizationsLoadFailed = drain.inputClosed && drain.organizationsLoadFailed;
          let _n =
            host.organizationsLoadGate?.(Lt ? "ending" : organizationsLoadFailed ? "failed" : "open") ?? null;
          let Mn =
            _n === null
              ? {
                  kind: "start",
                }
              : ((await this.raceTeardown(_n)) ?? {
                  kind: "ended",
                });
          if (Mn.kind === "failed") {
            drain.organizationsLoadFailed = true;
            drain.batchLeftUnstarted = true;
            this.prewaitLatch.dropParkedBatch();
            discardPollEvent(Me.members, Mn.message);
            this.deliveryLedger.startBatch(Me.members);
            this.turnOutcome.reportUnrunTurnFailed(this.io.sessionState, Mn.message);
            this.emit({
              ...emitLoadError(this.session.id, [Mn.message], Me.uuids[0]),
              terminal_reason: "turn_setup_failed",
            });
            this.deliveryLedger.settleBatch({
              batchUuids: Me.uuids,
              deliveredPollBatchUuids: [],
              terminalReason: "turn_setup_failed",
              aborted: false,
            });
            turnStartClock.enter("after_turn");
            continue;
          }
          if (
            this.tornDown ||
            Mn.kind === "ended" ||
            (wt !== null && (this.stopping() || drain.endSessionRequested))
          ) {
            drain.batchLeftUnstarted ||= Mn.kind === "ended";
            turnStartClock.enter("after_turn");
            break;
          }
          turnStartClock.enter("tool_pool");
          let tools = host.wireTurn(Me);
          drain.batchLeftUnstarted = false;
          drain.organizationsLoadFailed = false;
          turnStartClock.enter("commit");
          let Jn = re.commit(Me);
          if (Jn === undefined) continue;
          let { command } = Jn;
          drain.intentBatchInFlight = !this.commandLacksUserIntent(command);
          if (drain.intentBatchInFlight) devIntentTracker.of(this.session.host).turnStarting();
          host.onCommitted(Jn);
          let deliveredPollBatchUuids = re.start(Jn);
          w = Jn;
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
            batch: Jn,
            input,
          });
          let $n = this.turnRunner.arm(Jn);
          turnStartClock.enter("after_arm");
          let ut = host.afterArm({
            batch: Jn,
            signal: $n.signal,
            aheadOfStart: G.isAheadOfStart,
          });
          if (ut) await ut;
          turnStartClock.enter("turn_gate");
          let Yt = this.turnGate?.beforeTurn($n.signal) ?? null;
          if (Yt !== null) {
            let Pn = await Yt;
            if (Pn.kind === "fail") throw new TurnRefusedError(Pn.message);
          }
          let nn =
            command.shouldQuery === false && !isSlashCommandInput(command)
              ? undefined
              : host.refuseStart?.(Jn, $n.signal);
          let inPlaceOfFirstRequest = nn === undefined ? undefined : await nn;
          turnStartClock.enter("turn_open");
          headlessProfilerCheckpoint("before_ask");
          startQueryProfile();
          let En = await this.turnRunner.run({
            batch: Jn,
            input,
            tools,
            intake: re,
            turnStartClock,
            inPlaceOfFirstRequest,
          });
          turnStartClock.enter("after_turn");
          this.memoryRecheckOwed ||= command.shouldQuery !== false;
          let Mr = this.drainSettle.settleBatch({
            batch:
              En.putBack.size === 0
                ? Jn
                : {
                    uuids: Jn.uuids.filter((uuid) => !En.putBack.has(uuid)),
                    members: Jn.members,
                  },
            deliveredPollBatchUuids,
            turnEnd: En,
            turnSignal: $n.signal,
          });
          w = undefined;
          if (Mr) await Mr;
          logForDiagnosticsNoPII("info", "cli_ask_turn_complete", {
            should_query: command.shouldQuery,
            batch_size: Jn.members.length,
            mode: command.mode,
          });
          host.afterTurn({
            batch: Jn,
            signal: $n.signal,
            turnEnd: En,
          });
          logHeadlessProfilerTurn();
          finishQueryProfile();
          headlessProfilerStartTurn();
        }
      };
      do {
        for (let me of this.drainSdkEvents()) this.emit(me);
        turnStartClock.enter("loop_top");
        let ce = host.loopTop();
        if (ce) await ce;
        let nt =
          !this.stopping() &&
          this.io.sessionState.turnEndSummaryOutstanding() &&
          messageQueue.peek(isActiveMainAgentCommand) !== undefined
            ? this.io.sessionState.waitForTurnEndSummary()
            : undefined;
        if (nt !== undefined) {
          turnStartClock.enter("earlier_turn");
          await this.raceTeardown(nt);
          turnStartClock.enter("loop_top");
        }
        if (
          messageQueue.peek(isActiveMainAgentCommand) !== undefined &&
          !(host.holdsEvalSettles?.() ?? false)
        )
          host.onLoopTopWork();
        drain.runPhase = "draining_commands";
        let commandsProcessed = re.commandsProcessed;
        try {
          await Ae();
        } finally {
          re.exit();
        }
        let Se = y.afterPass({
          drained: re.commandsProcessed > commandsProcessed,
        });
        q = Se !== "done";
        if (typeof Se !== "string") {
          turnStartClock.enter("background_wait");
          this.recheckMemoryContextAfterTurn();
          await Se;
        }
      } while (q);
      logForDiagnosticsNoPII("info", "cli_drain_queue_complete", {
        commands_processed: re.commandsProcessed,
        queue_depth_at_exit: messageQueue.getCommandQueueLength(),
      });
      let Ue = host.releaseHeld();
      if (Ue !== undefined) await Ue;
    } catch (error) {
      turnStartClock.enter("after_turn");
      crashed = true;
      await this.turnOutcome.emitSessionCrash(error, {
        io: this.io,
        session: this.session,
        sessionMirror: this.sessionMirror,
      });
      host.onCrash(error, w);
      return;
    } finally {
      R = await this.drainSettle.release({
        crashed,
        raceTeardown: (q) => this.raceTeardown(q),
      });
      if (!drain.running) turnStartClock.enter("idle");
    }
    if (R === "rekicked") return;
    if (!drain.running) this.recheckMemoryContextAfterTurn();
    let P = y.afterRelease();
    let L = P.next();
    while (!L.done) {
      let q;
      try {
        q = await L.value;
      } catch (error) {
        L = P.throw(error);
        continue;
      }
      L = P.next(q);
    }
    if (L.value === "rekicked") return;
    if (drain.inputClosed) await host.onInputClosed();
  }
}
//@ chunk-tyg7f3ek.js:156673-156746 placement
function safeAsyncCall(e) {
  try {
    return e()?.catch(logError) ?? null;
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
function isFirstReadOverdue(e = MODS_LOAD_STATE_READERS, n = false) {
  try {
    let r = n || (hooksModulesGateFromPayload() && resolveHooksModulesValue());
    return e.isFirstReadOwed() && r && e.isUnreadPastItsBounds();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-tyg7f3ek.js:156944-157323 placement
function pluginHookReloader(e) {
  return {
    reload: async () => {
      let { clearPluginHookCache, loadPluginHooks } = await import("./chunk-c7p56eem.js");
      clearPluginHookCache();
      await loadPluginHooks(e.storageV5, e.credentials);
    },
    tell: (content) =>
      e.enqueue({
        type: "system",
        subtype: "informational",
        content,
        level: "warning",
        uuid: randomUUID(),
        session_id: getSessionId(),
      }),
    standDown: async () => {
      let { standDownInstalledHooksModules } = await import("./chunk-c7p56eem.js");
      await standDownInstalledHooksModules();
    },
  };
}
//@ chunk-tyg7f3ek.js:157323-157632 placement
function createPluginHookRefresh(e) {
  let { reload, tell, standDown } = pluginHookReloader(e);
  let h = () => safeAsyncCall(() => waitForCloudModsHold(reload, tell));
  let y = h();
  function S() {
    let w = followRolloutWithDeadline(reload, tell, standDown);
    return y !== null || w === null ? w : w.then(() => h() ?? undefined);
  }
  function R() {
    let w = safeAsyncCall(() => rejudgeLoadedMods(reload, tell));
    if (w === null) return S();
    return w.then(() => S() ?? undefined);
  }
  if (y === null) return R();
  return y.then(() => R() ?? undefined);
}
//@ chunk-tyg7f3ek.js:157632-157708 placement
function reloadPluginHooksNow(e) {
  return isOrganizationModsLoadPending()
    ? runOrganizationStatusLoadOnce(pluginHookReloader(e).reload, true).catch(logError)
    : Promise.resolve();
}
//@ chunk-tyg7f3ek.js:157708-158051 placement
function refreshPluginHooksOnClaim(e, n) {
  if (n !== "open") {
    let w =
      n === "ending"
        ? {
            kind: "ended",
          }
        : {
            kind: "failed",
            message: isFirstReadOverdue()
              ? ORGANIZATION_POLICY_UNREADABLE_MESSAGE
              : ORGANIZATION_MODS_UNLOADED_MESSAGE,
          };
    return isOrganizationModsLoadPending() ? Promise.resolve(noteTurnGatePolicyUnread(w)) : null;
  }
  let { reload, tell, standDown } = pluginHookReloader(e);
  let deferred = Promise.withResolvers();
  let S = waitForOrganizationModsOnClaim(
    reload,
    tell,
    standDown,
    Promise.race([e.ended, deferred.promise]),
    isFirstReadOverdue,
  );
  if (S === null) return null;
  let R = registerCleanup(async () => deferred.resolve());
  return S.finally(R).then(noteTurnGatePolicyUnread);
}
//@ chunk-tyg7f3ek.js:158051-158166 placement
function noteTurnGatePolicyUnread(e) {
  if (e.kind === "failed" && e.message === ORGANIZATION_POLICY_UNREADABLE_MESSAGE)
    logFeatureBad("plugin_function_hooks_turn_gate", "policy_unread");
  return e;
}
//@ chunk-tyg7f3ek.js:158166-158242 placement
function reloadPluginHooksQuiet(e) {
  return isOrganizationModsLoadPending()
    ? runOrganizationStatusLoadOnce(pluginHookReloader(e).reload, false).catch(logError)
    : Promise.resolve();
}
//@ chunk-tyg7f3ek.js:158242-158351 placement
var TURN_LOOP_CRASHED = "Headless turn loop crashed";
var ALLOWED_ERROR_NAMES = new Set($Ei);
var ERROR_STACK_GETTER = Object.getOwnPropertyDescriptor(Error(), "stack")?.get;
//@ chunk-tyg7f3ek.js:158351-159588 placement
/**
 * 轮次循环崩溃时上报错误名/消息/堆栈摘要（避免读取不安全的 stack）。
 */
function reportTurnLoopCrash(e) {
  try {
    if (isTerminalShutdown()) return;
    let n = !isUntrustedObject(e) && e instanceof Error;
    if (n && e instanceof TurnRefusedError) return;
    let r = n ? protoDataString(e, "name") : undefined;
    let s = n ? protoDataString(e, "message") : undefined;
    let h = (() => {
      try {
        let G =
          n && r !== undefined && s !== undefined ? Object.getOwnPropertyDescriptor(e, "stack") : undefined;
        return G === undefined || "value" in G
          ? G?.value
          : ERROR_STACK_GETTER !== undefined && G.get === ERROR_STACK_GETTER
            ? Reflect.apply(ERROR_STACK_GETTER, e, [])
            : undefined;
      } catch {
        return;
      }
    })();
    let y = n
      ? Object.create(
          Object.getPrototypeOf(e),
          xr(
            {
              name: r,
              message: s,
              stack: h,
              code: ownDataValue(e, "code"),
              errno: ownDataValue(e, "errno"),
              syscall: ownDataValue(e, "syscall"),
              constructor: {
                name: constructorNameOf(e),
              },
            },
            (value) => ({
              value,
            }),
          ),
        )
      : undefined;
    let S = y && pickAllowedName(ALLOWED_ERROR_NAMES, ownDataValue(y, "code"));
    let R =
      y === undefined
        ? "UnknownError"
        : S !== undefined
          ? `Error:${S}`
          : (pickAllowedName(LANGUAGE_ERROR_NAMES, r) ?? "Error");
    let w = `${TURN_LOOP_CRASHED} (${R})`;
    let P = y !== undefined && typeof h === "string" ? stripStackHeader(y) : undefined;
    let L =
      P !== undefined &&
      P !== h &&
      P.split(
        `
`,
      ).every((line) => line.trim() === "" || line.trim().startsWith("at "));
    let q = withTelemetryMessage(Error("Headless turn loop crashed"), w);
    let x = y !== undefined && L ? errorClassName(y) : undefined;
    logError(
      y === undefined || x === undefined
        ? q
        : Object.assign(q, {
            name: x,
            stack: `${x}: ${TURN_LOOP_CRASHED}
${P}`,
            code: ownDataValue(y, "code"),
            errno: ownDataValue(y, "errno"),
            syscall: ownDataValue(y, "syscall"),
          }),
    );
    logForDebugging(
      typeof h === "string"
        ? `${w}: error message left out of this line, as it may hold private data; a local session's result has it in errors[0]`
        : `${w}: what was thrown has no stack that can be read safely`,
      {
        level: "error",
      },
    );
  } catch {}
}
//@ chunk-tyg7f3ek.js:159588-159651 placement
function pickAllowedName(e, n) {
  return typeof n === "string" && e.has(n) ? n : undefined;
}
//@ chunk-tyg7f3ek.js:159651-159914 placement
function constructorNameOf(e) {
  if (e === null) return;
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, "constructor");
  if (ownPropertyDescriptor === undefined) return constructorNameOf(Object.getPrototypeOf(e));
  let r =
    "value" in ownPropertyDescriptor &&
    typeof ownPropertyDescriptor.value === "function" &&
    !isUntrustedObject(ownPropertyDescriptor.value)
      ? ownDataValue(ownPropertyDescriptor.value, "name")
      : undefined;
  return typeof r === "string" ? r : undefined;
}
//@ chunk-tyg7f3ek.js:159914-160020 placement
function ownDataValue(e, n) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, n);
  return ownPropertyDescriptor !== undefined && "value" in ownPropertyDescriptor
    ? ownPropertyDescriptor.value
    : undefined;
}
//@ chunk-tyg7f3ek.js:160020-160098 placement
function watchTaskChanges({ store, ...n }) {
  return createDependencyWatcher(
    [store],
    () => [store.getState().tasks],
    () => maybeReportIdleWithBackgroundTasks(n),
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
function parseMcpPrewaitServers(e, n) {
  if (e === undefined || n === 0) return;
  let sliced = uniq(
    e
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= MAX_MCP_SERVER_NAME_CHARS),
  ).slice(0, MAX_PREWAIT_MCP_SERVERS);
  if (sliced.length === 0) return;
  return {
    names: sliced,
    budgetMs: Math.min(n ?? MCP_PREWAIT_BUDGET_MS, MCP_PREWAIT_MAX_BUDGET_MS),
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
  constructor(e) {
    this.coordinatorMainThreadOnly = e.coordinatorMainThreadOnly;
    this.relayMarked = e.relayMarked;
    this.relayHoldLog = e.relayHoldLog;
    this.startedFromTranscript = e.startedFromTranscript;
    this.mainThreadRequested = e.mainThreadRequested;
    this.mcpClients = e.mcpClients;
    this.waitForPendingMcp = e.waitForPendingMcp;
    let names = e.setting?.names ?? [];
    this.namedCount = names.length;
    this.budgetMs = e.setting?.budgetMs ?? 0;
    this.deadlineAt = e.kickedAtMs + this.budgetMs;
    if (names.length === 0) {
      this.names = new Set();
      return;
    }
    let r = new Set(
      e
        .mcpClients()
        .filter((s) => s.config.scope === "dynamic" && !isPluginServerConfig(s.config))
        .map((s) => s.name),
    );
    this.names = new Set(names.filter((name) => r.has(name)));
    if (names.length > this.names.size)
      logForDebugging(
        `[MCP] CLAUDE_CODE_MCP_PREWAIT_SERVERS names servers with no --mcp-config row at start-up; not waiting for: ${names.filter((name) => !r.has(name)).join(", ")}`,
      );
  }
  join(e) {
    if (!e || this.names.size === 0) return null;
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
    let s = false;
    return this.waitForPendingMcp(rounded, {
      waitForDeferrable: true,
      localOnly: false,
      coordinatorMainThreadOnly: this.coordinatorMainThreadOnly,
      relayMarked: this.relayMarked,
      ...this.relayHoldLog,
      onlyServerNames: this.names,
    })
      .catch((error) => {
        s = true;
        logError(error);
      })
      .then(() =>
        this.report(
          s ? "held_wait_failed" : this.stillPending() ? "held_timed_out" : "held_settled",
          performance.now() - startTime,
        ),
      )
      .catch(logError);
  }
  loggedReport() {
    return this.logged;
  }
  stillPending() {
    return this.mcpClients().some((e) => e.type === "pending" && this.names.has(e.name));
  }
  report(e, n) {
    if (this.reported) return;
    this.reported = true;
    let r = {
      namedCount: this.namedCount,
      inLaunchSetCount: this.names.size,
      connectedCount: count(this.mcpClients(), (s) => s.type === "connected" && this.names.has(s.name)),
      budgetMs: this.budgetMs,
      waitedMs: Math.round(n),
      relayMarked: this.relayMarked,
      relayHold: this.relayHoldLog.relayHold,
      coordinatorMainThreadOnly: this.coordinatorMainThreadOnly,
      startedFromTranscript: this.startedFromTranscript,
    };
    this.logged = {
      outcome: e,
      ...r,
    };
    logEvent("tengu_headless_mcp_launch_named_wait", {
      outcome: fromEnum(e),
      ...r,
    });
    if (e === "held_timed_out" || e === "held_wait_failed" || e === "deadline_passed")
      logFeatureSad("mcp_launch_named_wait", e, r);
    else if (e !== "request_started") logFeatureOk("mcp_launch_named_wait", r);
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
    save: async (h) => {
      if (!(await transcriptSaver.save())) return false;
      let y = Date.now() + uploadWaitMs;
      while (io.unsentInternalEvents > 0) {
        if (isShuttingDown() || Date.now() > y) return false;
        await sleep(TRANSCRIPT_SAVE_POLL_MS, undefined, {
          unref: true,
        });
      }
      return !isShuttingDown() && io.refusedInternalEvents(h).length === 0;
    },
    lostSoFar: () => transcriptSaver.lostSoFar() + io.droppedInternalBatches,
  };
}
//@ chunk-tyg7f3ek.js:163393-163567 placement
function isSlashCommandPrompt(command, n, r) {
  let s = lastTextBlockText(n);
  let y =
    s !== null &&
    s.startsWith("/") &&
    (command.skipSlashCommands !== true ||
      (command.bridgeOrigin === true &&
        command.textNotTyped !== true &&
        !bridgeSlashLineBuildsRequest(s, r())));
  return command.shouldQuery !== false && !y;
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
  let S = answeredMs - startMs;
  inlineMcpTiming.totalMs += S;
  inlineMcpTiming.firstStartMs ??= startMs;
  recordPhase("mcp_set_servers_inline_ms", inlineMcpTiming.totalMs, inlineMcpTiming.firstStartMs);
  let R = Object.keys(response.errors).length;
  let w = {
    after_first_main_thread_query: mainThreadRequested,
    relay_marked: relayMarked,
    hold_ms: Math.round(S),
    added_count: response.added.length,
    removed_count: response.removed.length,
    error_count: R,
  };
  if (R > 0) logFeatureSad("mcp_set_servers_apply", "server_errors", w);
  else logFeatureOk("mcp_set_servers_apply", w);
}
//@ chunk-tyg7f3ek.js:164071-164176 placement
function isIdlePluginRefreshEnabled() {
  return (
    !env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_plugin_refresh_in_idle_enabled", false)
  );
}
//@ chunk-tyg7f3ek.js:164176-164807 placement
async function waitForPluginSyncBudget(e) {
  let n = false;
  try {
    let r = e.pluginsSync.then(
      () => "settled",
      () => "settled",
    );
    let s = sleep(Math.max(0, e.remainingSyncBudgetMs())).then(() => "timeout");
    if ((await Promise.race([r, s])) === "timeout") {
      n = true;
      e.onSyncOutlivedBudget();
    }
  } catch (error) {
    logError(error);
  }
  try {
    let startTime = performance.now();
    let s = await e.serverNamesOwnedBeforePluginsSync();
    await e.refreshPluginState();
    recordPhase("plugin_state_refresh_idle_ms", performance.now() - startTime, startTime);
    if (n) logFeatureSad("plugins_sync_idle_refresh", "sync_timeout");
    else logFeatureOk("plugins_sync_idle_refresh");
    return s;
  } catch (error) {
    logError(error);
    logFeatureBad("plugins_sync_idle_refresh", "reload_failed", {
      error_name: error instanceof Error ? (sanitizeClassName(error.name) ?? lit("Error")) : lit("non-error"),
    });
    return;
  }
}
//@ chunk-tyg7f3ek.js:164807-164943 placement
function needsPluginRefreshAfterIdle(e) {
  if (!e.idleRefreshRan) return false;
  return (e.idleRefreshSyncTimedOut && e.syncLanded) || e.syncRoundReplaced || e.installNeedsRefresh;
}
//@ chunk-tyg7f3ek.js:164943-164970 placement
var MCP_RESOURCE_TOOL_NAMES = new Set([
  LISTMCPRESOURCESTOOL,
  READMCPRESOURCETOOL,
  READ_MCP_RESOURCE_DIR_TOOL_NAME,
]);
//@ chunk-tyg7f3ek.js:164970-165076 placement
var coordinatorModeModule = require("./chunk-yxywkh50.js");
var teleportRelayCarrierModule = require("./chunk-1d5behve.js");
var relayUsabilityModule = require("./chunk-1cnesc1e.js");
//@ chunk-tyg7f3ek.js:165076-165146 placement
function mcpClientModule_6() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-tyg7f3ek.js:165146-166129 placement
function planMcpConnectorPrewait(e) {
  let n = Boolean(e.sdkUrl) && !isBridgeEnvironment();
  let r = coordinatorModeModule.isCoordinatorMode();
  let CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS = n ? env.CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS : undefined;
  let h =
    CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS === undefined
      ? undefined
      : Math.min(CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS, MAX_TIMER_DELAY_MS);
  let y = n && isTeleportRelayCarrierPresent();
  let S = y && !(e.relayHoldFollowsBootVerdict === true && !isRelayStillUsable());
  let R = n && !r && h === undefined;
  let CLAUDE_CODE_MCP_STARTUP_WAIT_MS = env.CLAUDE_CODE_MCP_STARTUP_WAIT_MS;
  let P =
    CLAUDE_CODE_MCP_STARTUP_WAIT_MS === undefined
      ? undefined
      : Math.min(CLAUDE_CODE_MCP_STARTUP_WAIT_MS, MAX_TIMER_DELAY_MS);
  let L = S
    ? "relay"
    : P !== undefined
      ? P > 0
        ? "host_wait"
        : "host_no_wait"
      : !e.hasStreamingInput
        ? "single_shot"
        : n
          ? "ccr_worker"
          : r
            ? "coordinator"
            : !e.toolSearchAvailable
              ? "no_tool_search"
              : e.explicitMcpConfigFlag
                ? "explicit_mcp_config"
                : "lifted";
  let q = n
    ? parseMcpPrewaitServers(env.CLAUDE_CODE_MCP_PREWAIT_SERVERS, env.CLAUDE_CODE_MCP_PREWAIT_SERVERS_MS)
    : undefined;
  return {
    deadlineMs: S
      ? Math.max(REMOTE_CONNECT_TIMEOUT_MS, P ?? h ?? 0)
      : (P ?? (e.explicitMcpConfigFlag && !n ? getConnectionTimeoutMs() : h)),
    waitForDeferrable: L !== "lifted" && L !== "host_no_wait",
    firstTurnHold: L,
    localOnly: R && !S,
    coordinatorMainThreadOnly: r,
    relayMarked: y,
    relayHold: S,
    ...(q !== undefined && {
      launchNamed: q,
    }),
    skipFullyDeferredServers: n && !r && e.hasStreamingInput && e.toolSearchAvailable,
    ...(S && {
      laterWakes: {
        deadlineMs: P ?? h,
        localOnly: R,
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
var EMPTY_TOOL_SET = new Set();
//@ chunk-tyg7f3ek.js:166333-167115 placement
function discoveredToolsInConversation(messages, n) {
  let r = (s) => n !== undefined && count(n, (h) => h === s) === 1;
  try {
    let s = new Set();
    let discoveredToolNames = extractDiscoveredToolNames(
      messages,
      n && {
        surfaced: {
          exceptAnnouncements: new Set(),
        },
      },
    );
    let y = new Set(discoveredToolNames);
    for (let S of messages)
      if (S.type === "assistant") {
        for (let R of S.message.content)
          if (R.type === "tool_use") {
            discoveredToolNames.add(R.name);
            y.add(R.name);
          }
      } else if (S.type === "attachment") {
        let { attachment } = S;
        if (attachment.type === "deferred_tools_delta") {
          for (let w of stringArray(attachment.addedNames)) discoveredToolNames.add(w);
          for (let w of stringArray(attachment.wireHiddenNames)) {
            discoveredToolNames.add(w);
            y.add(w);
          }
        } else if (attachment.type === "mcp_instructions_delta")
          for (let w of stringArray(attachment.addedNames)) {
            let prefixServerKey = getPrefixServerKey(w);
            if (!r(prefixServerKey)) s.add(prefixServerKey);
          }
      }
    for (let discoveredToolName of discoveredToolNames) {
      let R = mcpInfoFromString(discoveredToolName);
      if (R) {
        if (y.has(discoveredToolName) || !r(R.serverName)) s.add(R.serverName);
      } else if (MCP_RESOURCE_TOOL_NAMES.has(discoveredToolName) || discoveredToolName.startsWith("mcp__"))
        return;
    }
    return s;
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
  let y =
    REMOTE_ENTRYPOINT_NAMES.some((P) => P === CLAUDE_CODE_ENTRYPOINT) &&
    !env.CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS &&
    !isTeleportRelayCarrierPresent();
  let filtered = clients.filter(
    (client) =>
      client.type === "pending" &&
      (client.config.type === undefined || client.config.type === "stdio") &&
      (client.config.alwaysLoad === false ||
        (client.config.alwaysLoad === undefined && y && isFromBuiltinMarketplace(client.config))),
  );
  if (filtered.length === 0 || !policyAllows() || getToolSearchMode() !== "tst" || !canUseToolSearch())
    return EMPTY_TOOL_SET;
  let R = discoveredToolsInConversation(
    messages,
    isSortedOtterOn() ? clients.map((client) => getPrefixServerKey(client.name)) : undefined,
  );
  if (R === undefined) return EMPTY_TOOL_SET;
  let w = requiredServerNames();
  return new Set(
    filtered
      .map((P) => ({
        name: P.name,
        segment: getPrefixServerKey(P.name),
      }))
      .filter((P) => !w.has(P.segment) && !R.has(P.segment))
      .map((P) => P.name),
  );
}
//@ chunk-tyg7f3ek.js:167718-170176 placement
/**
 * 每轮开始前刷新 MCP：等待可延迟服务器、合并本地/插件/动态配置、更新工具与命令。
 */
async function refreshMcpForTurn(e, subscribe, r = TRANSPORT_FALLBACK_TIMEOUT_MS, s = {}) {
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
  } = s;
  let Ue = !waitForDeferrable && canUseToolSearch();
  let ce = (ut) => requiredServerNames?.has(getPrefixServerKey(ut.name)) ?? false;
  let nt = coordinatorMainThreadOnly ? coordinatorExtraToolNames() : [];
  let ie = (ut) =>
    (onlyServerNames === undefined || onlyServerNames.has(ut.name)) &&
    !skipServerNames?.has(ut.name) &&
    (!localOnly || mcpClientModule_6().isLocalMcpServer(ut.config)) &&
    (!coordinatorMainThreadOnly || coordinatorMainThreadUsesMcpServer(ut, nt));
  let Se = (ut) => ie(ut) && (!Ue || ut.config.alwaysLoad === true || ce(ut));
  let me = (ut) => ut.type === "pending" && ce(ut) && ie(ut);
  let Me = (ut) =>
    permissionPromptToolServerName !== undefined &&
    getPrefixServerKey(ut.name) === permissionPromptToolServerName;
  let Ee = (ut) => ut.type === "pending" && Me(ut);
  let He = (ut) =>
    ut.type === "pending" && alsoWaitFor?.has(ut.name) === true && ie(ut) && !Se(ut) && !Me(ut);
  let Xe = (ut) => ut.type === "pending" && (Me(ut) || Se(ut) || He(ut));
  let mcp = e().mcp;
  let pendingBefore = count(mcp.clients, (ut) => ut.type === "pending");
  let wt = count(mcp.clients, Xe);
  let Lt = count(mcp.clients, He);
  let any = mcp.clients.some(Ee);
  let toolsBefore = mcp.tools.length;
  let Mn = {
    getState: e,
    subscribe,
  };
  let jn = 0;
  let namedOnlyWaitedMs = 0;
  let now = Date.now();
  if (wt > 0 && r > 0) {
    if (Lt > 0) {
      await waitForStoreState(Mn, (Yt) => !Yt.mcp.clients.some(He), {
        timeoutMs: Math.min(r, SHORT_RETRY_MS),
      });
      namedOnlyWaitedMs = Date.now() - now;
    }
    let ut = (Yt) => Yt.type === "pending" && (Me(Yt) || Se(Yt));
    if (e().mcp.clients.some(ut))
      await waitForStoreState(Mn, (Yt) => !Yt.mcp.clients.some(ut), {
        timeoutMs: Math.max(0, now + r - Date.now()),
      });
    jn = Date.now() - now;
  }
  let Dr = 0;
  if (r < TRANSPORT_FALLBACK_TIMEOUT_MS && e().mcp.clients.some(me)) {
    await waitForStoreState(Mn, (ut) => !ut.mcp.clients.some(me), {
      timeoutMs: Math.max(0, now + TRANSPORT_FALLBACK_TIMEOUT_MS - Date.now()),
    });
    Dr = Date.now() - now - jn;
  }
  let permissionPromptWaitedMs = 0;
  if (any) {
    await waitForStoreState(Mn, (ut) => !ut.mcp.clients.some(Ee), {
      timeoutMs: Math.max(0, now + getConnectionTimeoutMs() - Date.now()),
    });
    permissionPromptWaitedMs = Date.now() - now - jn - Dr;
  }
  if (skipTelemetry) return;
  let mcp_2 = e().mcp;
  logEvent("tengu_headless_mcp_prewait", {
    localOnly,
    coordinatorMainThreadOnly,
    willDeferMcp: Ue,
    waitForDeferrable,
    deadlineMs: r,
    pendingBefore,
    pendingWaitedBefore: wt,
    toolsBefore,
    waitedMs: jn,
    permissionPromptServerPendingBefore: any,
    permissionPromptWaitedMs,
    pendingAfter: count(mcp_2.clients, (ut) => ut.type === "pending"),
    pendingWaitedAfter: count(mcp_2.clients, Xe),
    permissionPromptServerPendingAfter: mcp_2.clients.some(Ee),
    relayMarked,
    relayHold,
    relayHoldFollowsBootVerdict,
    namedServersOnly: onlyServerNames !== undefined,
    alsoWaitForCount: alsoWaitFor?.size ?? 0,
    pendingNamedOnlyBefore: Lt,
    namedOnlyWaitedMs,
    toolsAfter: mcp_2.tools.length,
    mcpNonBlocking: getMcpConnectNonBlocking(),
    firstTurnHold: fromEnumOpt(firstTurnHold),
    pendingDeferredBefore: Ue ? count(mcp.clients, (ut) => ut.type === "pending" && ie(ut) && !Xe(ut)) : 0,
    pendingRequiredBefore: count(mcp.clients, me),
    requiredWaitedMs: Dr,
    pendingFullyDeferredSkippedBefore: count(
      mcp.clients,
      (ut) => ut.type === "pending" && skipServerNames?.has(ut.name) === true && !Xe(ut),
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
function flushHeldResults(e, n) {
  for (let r of e) n(r);
  e.length = 0;
}
//@ chunk-tyg7f3ek.js:170316-170455 placement
function clearQueuedTurnCount(e, n) {
  if (!n || e.type !== "result" || e.queued_turn_count === undefined || e.queued_turn_count === 0) return e;
  return {
    ...e,
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

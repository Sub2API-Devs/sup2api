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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import {
  isOrphanedPermissionCommand,
  shouldYieldRescueTurn,
  maybeYieldToPersonPrompt,
} from "./commandQueueDrain.js";
import { jse, im } from "../../utils/messageQueueManager.js";
import { isGoalIdleCheckinPaused } from "../../query/goalCheckIn.js";
import {
  NAs,
  createDependencyWatcher,
  createTranscriptSaver as createTranscriptSaver_2,
} from "./rewindStandIn.js";
import { aO } from "../../utils/historyFile.js";
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
import { j4r } from "../../services/remoteTools/backgroundCommands.js";
import { sN } from "../../utils/model/modelSwitchHooks.js";
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
import { startQueryProfile, bJn } from "../../utils/queryProfiler.js";
import { isOrganizationModsLoadPending, hFi } from "../../utils/plugins/hooksModulesRollout.js";
import { isPolicyUnreadPastItsBounds } from "../../utils/plugins/loadPluginHooks.js";
import {
  D4o,
  runOrganizationStatusLoadOnce,
  sYr,
  L4o,
  waitForOrganizationModsOnClaim,
} from "../../utils/plugins/hooksModulesLoadGate.js";
import { I_n } from "../../services/analytics/growthbookCredentials.js";
import { waitForCloudModsHold } from "../../utils/hooks/hookPolicyHold.js";
import { rejudgeLoadedMods } from "../../utils/hooks.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { freeze as freeze_2 } from "../../utils/errorRedaction.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { n0e } from "../../utils/shutdown/pendingWrites.js";
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
import { Br } from "../../utils/startupTiming.js";
import { env } from "../../utils/env.js";
import { LISTMCPRESOURCESTOOL } from "../../tools/ListMcpResourcesTool/prompt.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import { vS } from "../../utils/remoteEnvironment.js";
import { ec } from "../../utils/timerDelayClamp.js";
import { Qai, getConnectionTimeoutMs, Npe, Zai } from "../../services/mcp/client.js";
import {
  isToolSearchEnabledOptimistic,
  modelSupportsToolReference,
  isVertexModelWithoutToolSearch,
  rGt,
  extractDiscoveredToolNames,
  getToolSearchMode,
} from "../../utils/toolSearch.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { Udo } from "../../utils/entrypointKinds.js";
import { isFromBuiltinMarketplace } from "../../utils/plugins/pluginIdentifier.js";
import { isSortedOtterOn } from "../../services/mcp/mcpGates.js";
import { coordinatorExtraToolNames, coordinatorMainThreadUsesMcpServer } from "../../utils/toolPool.js";
import { waitForStoreState } from "../../context/voice.js";

//@ chunk-tyg7f3ek.js:145895-146953 placement
class QueueHeadWaiter {
  messageQueue;
  stopping;
  isHeadAhead = !1;
  queuedAtWait;
  followersFrom;
  constructor(e, n) {
    ((this.messageQueue = e), (this.stopping = n));
  }
  waitForHead(e) {
    let n = getActiveMessageQueue();
    return this.isHeld(n, e()) ? this.waitOut(e, n) : void 0;
  }
  takeHead(e, n) {
    if (
      ((this.isHeadAhead = !1),
      (this.followersFrom = void 0),
      getActiveMessageQueue() !== void 0 &&
        this.messageQueue.peek(T_) !== void 0 &&
        this.messageQueue.peek(e) !== void 0)
    )
      return (
        (this.isHeadAhead = !0),
        this.messageQueue.dequeue((h) => isOrphanedPermissionCommand(h) && e(h)) ??
          this.messageQueue.dequeue(T_)
      );
    if (this.isHeld(getActiveMessageQueue(), e)) return;
    return (
      (this.followersFrom = this.queuedAtWait),
      (this.queuedAtWait = void 0),
      (this.messageQueue.peek((h) => isOrphanedPermissionCommand(h) || (e(h) && jse(h))) === void 0
        ? this.messageQueue.dequeue((h) => e(h) && EH(h))
        : void 0) ?? n()
    );
  }
  get isAheadOfStart() {
    return this.isHeadAhead;
  }
  admits(e) {
    return !this.isHeadAhead && (this.followersFrom?.has(e) ?? !0);
  }
  async waitOut(e, n) {
    let r = n;
    while (this.isHeld(r, e()))
      ((this.queuedAtWait ??= new Set(this.messageQueue.getCommandQueue())),
        await waitForSignalOr(this.messageQueue, r),
        (r = getActiveMessageQueue()));
  }
  isHeld(e, n) {
    return (
      !this.stopping() &&
      e !== void 0 &&
      this.messageQueue.peek(n) !== void 0 &&
      this.messageQueue.peek(T_) === void 0
    );
  }
}
//@ chunk-tyg7f3ek.js:146953-146994 placement
function T_(e) {
  return im(e) && isGoalIdleCheckinPaused(e.uuid);
}
//@ chunk-tyg7f3ek.js:146994-147035 placement
function EH(e) {
  return im(e) && NAs(e.uuid);
}
//@ chunk-tyg7f3ek.js:147035-147159 placement
async function waitForSignalOr(e, n) {
  let r = () => {},
    promise = new Promise((h) => {
      r = e.subscribe(() => h());
    });
  try {
    await Promise.race([n, promise]);
  } finally {
    r();
  }
}
//@ chunk-tyg7f3ek.js:147159-147293 placement
function isSlashCommandInput(e) {
  return (
    aO(e.value)?.startsWith("/") === !0 &&
    (e.skipSlashCommands !== !0 || e.bridgeOrigin === !0 || e.modelScheduledOrigin === !0)
  );
}
/**
 * print/headless 主轮次循环：从队列取消息、协调闸门、运行轮次、处理崩溃（Headless turn loop crashed）与收尾。
 */
//@ chunk-tyg7f3ek.js:147293-156636 placement
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
  tornDown = !1;
  memoryRecheckOwed = !1;
  atTeardown = [];
  tornDownLatch = Promise.withResolvers();
  tornDownSignal = createSignal();
  promptsFetchingFiles = new FetchingUserFilesCounter();
  constructor({
    drain: e,
    messageQueue: n,
    prewaitLatch: r,
    deliveryLedger: s,
    turnRunner: h,
    drainSettle: y,
    turnOutcome: S,
    io: R,
    emit: w,
    drainSdkEvents: P,
    stopping: L,
    terminalShutdown: q,
    endSessionHead: x,
    commandLacksUserIntent: G,
    repeatsUsageLimitAlert: Z,
    revokeCodeliveredFollowups: re,
    deferredToolUsePending: Ae,
    idleRelease: Ue,
    turnGate: ce,
    session: nt,
    sessionMirror: ie,
    host: Se,
  }) {
    ((this.drain = e),
      (this.messageQueue = n),
      (this.prewaitLatch = r),
      (this.deliveryLedger = s),
      (this.turnRunner = h),
      (this.drainSettle = y),
      (this.turnOutcome = S),
      (this.io = R),
      (this.emit = w),
      (this.drainSdkEvents = P),
      (this.stopping = L),
      (this.terminalShutdown = q),
      (this.endSessionHead = x),
      (this.commandLacksUserIntent = G),
      (this.repeatsUsageLimitAlert = Z),
      (this.revokeCodeliveredFollowups = re),
      (this.deferredToolUsePending = Ae),
      (this.idleRelease = Ue),
      (this.turnGate = ce),
      (this.session = nt),
      (this.sessionMirror = ie),
      (this.host = Se));
  }
  turnAbortSignal() {
    return (
      this.drain.abortController && !this.drain.abortController.signal.aborted
        ? this.drain.abortController
        : createAbortController()
    ).signal;
  }
  teardown() {
    if (this.tornDown) return !1;
    ((this.tornDown = !0), (this.drain.endSessionRequested = !0), this.deliveryLedger.freezeTerminals());
    for (let e of this.atTeardown.splice(0))
      try {
        e();
      } catch (error) {
        logError(error);
      }
    return (
      this.drain.abortController?.abort(userAbortReason("shutdown")),
      this.tornDownLatch.resolve(),
      this.tornDownSignal.emit(),
      !0
    );
  }
  isTornDown() {
    return this.tornDown;
  }
  whenTornDown() {
    return this.tornDownLatch.promise;
  }
  raceTeardown(e) {
    let withResolvers = Promise.withResolvers(),
      r = () => void this.tornDownLatch.promise.then(() => withResolvers.resolve(void 0)),
      subscribe = this.tornDownSignal.subscribe(r);
    if (this.tornDown) r();
    return Promise.race([e, withResolvers.promise]).finally(subscribe);
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
    this.memoryRecheckOwed = !1;
    try {
      fetchTurnEndMemoryContext(this.session);
    } catch (error) {
      logError(error);
    }
  }
  async run() {
    let { drain: drain, messageQueue: messageQueue, host: host } = this;
    if (
      drain.running ||
      this.stopping() ||
      this.terminalShutdown() ||
      configProbeEnv() ||
      (drain.endSessionRequested && messageQueue.peek(this.endSessionHead) === void 0)
    )
      return;
    ((drain.running = !0), (drain.runPhase = void 0), (drain.runningReported = !1));
    let turnStartClock = drain.turnStartClock;
    (turnStartClock.enter("entry_joins"),
      host.onEntry(),
      this.io.resetStallWatchdog(),
      this.idleRelease.stop());
    let beforeDrain = host.beforeDrain();
    for (let q = beforeDrain.next(); !q.done;) {
      let x;
      try {
        x = await q.value;
      } catch (error) {
        q = beforeDrain.throw(error);
        continue;
      }
      q = beforeDrain.next(x);
    }
    let openRun = host.openRun(),
      S = !1,
      R,
      w;
    try {
      let q = !1,
        x = !0,
        G = new QueueHeadWaiter(messageQueue, this.stopping),
        Z = "none",
        re = new TurnStartCoordinator({
          messageQueue: messageQueue,
          drain: drain,
          prewaitLatch: this.prewaitLatch,
          deliveryLedger: this.deliveryLedger,
          io: this.io,
          commandLacksUserIntent: this.commandLacksUserIntent,
          revokeCodeliveredFollowups: this.revokeCodeliveredFollowups,
          stopping: this.stopping,
          endSessionHead: this.endSessionHead,
          startGate: {
            takeHead: (ce, nt) => (host.setAsideHeldInput?.(), G.takeHead(ce, nt)),
            admits: (ce) => G.admits(ce),
          },
          onHead: (ce) => host.onHead(ce),
          replayMerged: (ce, nt) => host.replayMerged(ce, nt),
          deferredToolUsePending: this.deferredToolUsePending,
          holdsEvalSettles: () => host.holdsEvalSettles?.() ?? !1,
          coalesceTaskNotifications: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_swirling_meteor", !0),
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
            )
              return (host.onRescueGaveWay(), !0);
            return (
              nt === "before_start" &&
              (j4r.peek(this.session)?.toolState.get(HostReturnWakeTracker).lapsedAtTurnStart(ce) ??
                isHostReturnWake(ce))
            );
          },
        }),
        Ae = async () => {
          G = new QueueHeadWaiter(messageQueue, this.stopping);
          let ce = () => (drain.endSessionRequested ? this.endSessionHead : im);
          for (;;) {
            turnStartClock.enter("session_start_wait");
            let waitForHead = G.waitForHead(ce);
            if (waitForHead) await waitForHead;
            let ie =
              !this.stopping() &&
              this.io.sessionState.turnEndSummaryOutstanding() &&
              this.messageQueue.peek(ce()) !== void 0
                ? this.io.sessionState.waitForTurnEndSummary()
                : void 0;
            if (ie !== void 0) {
              (turnStartClock.enter("earlier_turn"), await this.raceTeardown(ie));
              continue;
            }
            let of = sN.of(this.session);
            if (
              of.pending > 0 &&
              !this.stopping() &&
              this.messageQueue.peek((Pn) => Pn.handedOffTurn?.kind === "run" && ce()(Pn)) !== void 0
            ) {
              (logForDiagnosticsNoPII("info", "cli_turn_handoff_waits_for_model", {
                barrier_pending: of.pending,
              }),
                await of.tail);
              continue;
            }
            let me =
              !this.stopping() && !drain.endSessionRequested ? host.inheritedPromptAnswerJoin?.() : void 0;
            if (me !== void 0) {
              (turnStartClock.enter("earlier_turn"), await me);
              continue;
            }
            Z = "none";
            let take = re.take();
            if (take === void 0) {
              turnStartClock.enter("after_turn");
              break;
            }
            if ((turnStartClock.enter("turn_joins"), x)) {
              ((x = !1), turnStartClock.enter("first_command"));
              let firstCommand = host.firstCommand();
              for (let oo = firstCommand.next(); !oo.done;) {
                let No;
                try {
                  No = await oo.value;
                } catch (error) {
                  oo = firstCommand.throw(error);
                  continue;
                }
                oo = firstCommand.next(No);
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
              !this.stopping() && !drain.endSessionRequested
                ? (host.accountPluginsJoin?.(take) ?? null)
                : null;
            if (He !== null) await He;
            let Xe = host.turnMountJoin?.(take) ?? null;
            if (Xe !== null) await Xe;
            let We = host.sdkMcpServersJoin?.(take) ?? null;
            if (We !== null) await We;
            let St = host.deferredMcpServersJoin?.(take) ?? null;
            if (St !== null) await St;
            let wt;
            try {
              wt =
                !this.stopping() && !drain.endSessionRequested
                  ? maybeYieldToPersonPrompt({
                      head: take.command,
                      messageQueue: messageQueue,
                      prewaitLatch: this.prewaitLatch,
                      fetchingFiles: this.promptsFetchingFiles,
                    })
                  : null;
            } catch (error) {
              (logError(error), (wt = null));
            }
            Z = wt === null ? "none" : ((await this.raceTeardown(wt)) ?? "timed_out");
            let Lt = this.stopping() || drain.endSessionRequested,
              pn = drain.inputClosed && drain.organizationsLoadFailed,
              _n = host.organizationsLoadGate?.(Lt ? "ending" : pn ? "failed" : "open") ?? null,
              Mn = _n === null ? { kind: "start" } : ((await this.raceTeardown(_n)) ?? { kind: "ended" });
            if (Mn.kind === "failed") {
              ((drain.organizationsLoadFailed = !0),
                (drain.batchLeftUnstarted = !0),
                this.prewaitLatch.dropParkedBatch(),
                discardPollEvent(take.members, Mn.message),
                this.deliveryLedger.startBatch(take.members),
                this.turnOutcome.reportUnrunTurnFailed(this.io.sessionState, Mn.message),
                this.emit({
                  ...emitLoadError(this.session.id, [Mn.message], take.uuids[0]),
                  terminal_reason: "turn_setup_failed",
                }),
                this.deliveryLedger.settleBatch({
                  batchUuids: take.uuids,
                  deliveredPollBatchUuids: [],
                  terminalReason: "turn_setup_failed",
                  aborted: !1,
                }),
                turnStartClock.enter("after_turn"));
              continue;
            }
            if (
              this.tornDown ||
              Mn.kind === "ended" ||
              (wt !== null && (this.stopping() || drain.endSessionRequested))
            ) {
              ((drain.batchLeftUnstarted ||= Mn.kind === "ended"), turnStartClock.enter("after_turn"));
              break;
            }
            turnStartClock.enter("tool_pool");
            let wireTurn = host.wireTurn(take);
            ((drain.batchLeftUnstarted = !1),
              (drain.organizationsLoadFailed = !1),
              turnStartClock.enter("commit"));
            let commit = re.commit(take);
            if (commit === void 0) continue;
            let { command: command } = commit;
            if (
              ((drain.intentBatchInFlight = !this.commandLacksUserIntent(command)), drain.intentBatchInFlight)
            )
              devIntentTracker.of(this.session.host).turnStarting();
            host.onCommitted(commit);
            let start = re.start(commit);
            w = commit;
            let $r =
              command.mode === "poll-event"
                ? wrapInSystemReminder(
                    buildPollEventDelivery(
                      [getPollEventEnvelope(command)],
                      0,
                      listUnreadableToolsUsed(getConversationToolsUsed().names(), []),
                    ),
                  )
                : command.value;
            host.beforeArm({ batch: commit, input: $r });
            let arm = this.turnRunner.arm(commit);
            turnStartClock.enter("after_arm");
            let afterArm = host.afterArm({
              batch: commit,
              signal: arm.signal,
              aheadOfStart: G.isAheadOfStart,
            });
            if (afterArm) await afterArm;
            turnStartClock.enter("turn_gate");
            let Yt = this.turnGate?.beforeTurn(arm.signal) ?? null;
            if (Yt !== null) {
              let Pn = await Yt;
              if (Pn.kind === "fail") throw new TurnRefusedError(Pn.message);
            }
            let nn =
                command.shouldQuery === !1 && !isSlashCommandInput(command)
                  ? void 0
                  : host.refuseStart?.(commit, arm.signal),
              kn = nn === void 0 ? void 0 : await nn;
            (turnStartClock.enter("turn_open"),
              headlessProfilerCheckpoint("before_ask"),
              startQueryProfile());
            let run = await this.turnRunner.run({
              batch: commit,
              input: $r,
              tools: wireTurn,
              intake: re,
              turnStartClock: turnStartClock,
              inPlaceOfFirstRequest: kn,
            });
            (turnStartClock.enter("after_turn"), (this.memoryRecheckOwed ||= command.shouldQuery !== !1));
            let settleBatch = this.drainSettle.settleBatch({
              batch:
                run.putBack.size === 0
                  ? commit
                  : { uuids: commit.uuids.filter((uuid) => !run.putBack.has(uuid)), members: commit.members },
              deliveredPollBatchUuids: start,
              turnEnd: run,
              turnSignal: arm.signal,
            });
            if (((w = void 0), settleBatch)) await settleBatch;
            (logForDiagnosticsNoPII("info", "cli_ask_turn_complete", {
              should_query: command.shouldQuery,
              batch_size: commit.members.length,
              mode: command.mode,
            }),
              host.afterTurn({ batch: commit, signal: arm.signal, turnEnd: run }),
              logHeadlessProfilerTurn(),
              bJn(),
              headlessProfilerStartTurn());
          }
        };
      do {
        for (let me of this.drainSdkEvents()) this.emit(me);
        turnStartClock.enter("loop_top");
        let loopTop = host.loopTop();
        if (loopTop) await loopTop;
        let nt =
          !this.stopping() &&
          this.io.sessionState.turnEndSummaryOutstanding() &&
          messageQueue.peek(im) !== void 0
            ? this.io.sessionState.waitForTurnEndSummary()
            : void 0;
        if (nt !== void 0)
          (turnStartClock.enter("earlier_turn"),
            await this.raceTeardown(nt),
            turnStartClock.enter("loop_top"));
        if (messageQueue.peek(im) !== void 0 && !(host.holdsEvalSettles?.() ?? !1)) host.onLoopTopWork();
        drain.runPhase = "draining_commands";
        let commandsProcessed = re.commandsProcessed;
        try {
          await Ae();
        } finally {
          re.exit();
        }
        let afterPass = openRun.afterPass({ drained: re.commandsProcessed > commandsProcessed });
        if (((q = afterPass !== "done"), typeof afterPass !== "string"))
          (turnStartClock.enter("background_wait"), this.recheckMemoryContextAfterTurn(), await afterPass);
      } while (q);
      logForDiagnosticsNoPII("info", "cli_drain_queue_complete", {
        commands_processed: re.commandsProcessed,
        queue_depth_at_exit: messageQueue.getCommandQueueLength(),
      });
      let releaseHeld = host.releaseHeld();
      if (releaseHeld !== void 0) await releaseHeld;
    } catch (error) {
      (turnStartClock.enter("after_turn"),
        (S = !0),
        await this.turnOutcome.emitSessionCrash(error, {
          io: this.io,
          session: this.session,
          sessionMirror: this.sessionMirror,
        }),
        host.onCrash(error, w));
      return;
    } finally {
      if (
        ((R = await this.drainSettle.release({ crashed: S, raceTeardown: (q) => this.raceTeardown(q) })),
        !drain.running)
      )
        turnStartClock.enter("idle");
    }
    if (R === "rekicked") return;
    if (!drain.running) this.recheckMemoryContextAfterTurn();
    let afterRelease = openRun.afterRelease(),
      L = afterRelease.next();
    while (!L.done) {
      let q;
      try {
        q = await L.value;
      } catch (error) {
        L = afterRelease.throw(error);
        continue;
      }
      L = afterRelease.next(q);
    }
    if (L.value === "rekicked") return;
    if (drain.inputClosed) await host.onInputClosed();
  }
}
//@ chunk-tyg7f3ek.js:156673-156746 placement
function E_(e) {
  try {
    return e()?.catch(logError) ?? null;
  } catch (error) {
    return (logError(error), null);
  }
}
//@ chunk-tyg7f3ek.js:156746-156813 placement
var xH = {
  isFirstReadOwed: () => isOrganizationModsLoadPending(),
  isUnreadPastItsBounds: () => isPolicyUnreadPastItsBounds(),
};
//@ chunk-tyg7f3ek.js:156813-156944 placement
function isFirstReadOverdue(e = xH, n = !1) {
  try {
    let r = n || (D4o() && I_n());
    return e.isFirstReadOwed() && r && e.isUnreadPastItsBounds();
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-tyg7f3ek.js:156944-157323 placement
function pluginHookReloader(e) {
  return {
    reload: async () => {
      let { clearPluginHookCache: clearPluginHookCache, loadPluginHooks: loadPluginHooks } =
        await import("./chunk-c7p56eem.js");
      (clearPluginHookCache(), await loadPluginHooks(e.storageV5, e.credentials));
    },
    tell: (n) =>
      e.enqueue({
        type: "system",
        subtype: "informational",
        content: n,
        level: "warning",
        uuid: randomUUID_5(),
        session_id: getSessionId(),
      }),
    standDown: async () => {
      let { standDownInstalledHooksModules: standDownInstalledHooksModules } =
        await import("./chunk-c7p56eem.js");
      await standDownInstalledHooksModules();
    },
  };
}
//@ chunk-tyg7f3ek.js:157323-157632 placement
function createPluginHookRefresh(e) {
  let { reload: reload, tell: tell, standDown: standDown } = pluginHookReloader(e),
    h = () => E_(() => waitForCloudModsHold(reload, tell)),
    y = h();
  function S() {
    let w = hFi(reload, tell, standDown);
    return y !== null || w === null ? w : w.then(() => h() ?? void 0);
  }
  function R() {
    let w = E_(() => rejudgeLoadedMods(reload, tell));
    if (w === null) return S();
    return w.then(() => S() ?? void 0);
  }
  if (y === null) return R();
  return y.then(() => R() ?? void 0);
}
//@ chunk-tyg7f3ek.js:157632-157708 placement
function reloadPluginHooksNow(e) {
  return isOrganizationModsLoadPending()
    ? runOrganizationStatusLoadOnce(pluginHookReloader(e).reload, !0).catch(logError)
    : Promise.resolve();
}
//@ chunk-tyg7f3ek.js:157708-158051 placement
function refreshPluginHooksOnClaim(e, n) {
  if (n !== "open") {
    let w =
      n === "ending" ? { kind: "ended" } : { kind: "failed", message: isFirstReadOverdue() ? sYr : L4o };
    return isOrganizationModsLoadPending() ? Promise.resolve(noteTurnGatePolicyUnread(w)) : null;
  }
  let { reload: reload, tell: tell, standDown: standDown } = pluginHookReloader(e),
    withResolvers = Promise.withResolvers(),
    S = waitForOrganizationModsOnClaim(
      reload,
      tell,
      standDown,
      Promise.race([e.ended, withResolvers.promise]),
      isFirstReadOverdue,
    );
  if (S === null) return null;
  let R = registerCleanup(async () => withResolvers.resolve());
  return S.finally(R).then(noteTurnGatePolicyUnread);
}
//@ chunk-tyg7f3ek.js:158051-158166 placement
function noteTurnGatePolicyUnread(e) {
  if (e.kind === "failed" && e.message === sYr)
    logFeatureBad("plugin_function_hooks_turn_gate", "policy_unread");
  return e;
}
//@ chunk-tyg7f3ek.js:158166-158242 placement
function reloadPluginHooksQuiet(e) {
  return isOrganizationModsLoadPending()
    ? runOrganizationStatusLoadOnce(pluginHookReloader(e).reload, !1).catch(logError)
    : Promise.resolve();
}
//@ chunk-tyg7f3ek.js:158242-158351 placement
var TURN_LOOP_CRASHED = "Headless turn loop crashed",
  ALLOWED_ERROR_NAMES = new Set(freeze_2),
  ERROR_STACK_GETTER = Object.getOwnPropertyDescriptor(Error(), "stack")?.get;
/**
 * 轮次循环崩溃时上报错误名/消息/堆栈摘要（避免读取不安全的 stack）。
 */
//@ chunk-tyg7f3ek.js:158351-159588 placement
function reportTurnLoopCrash(e) {
  try {
    if (isTerminalShutdown()) return;
    let n = !n0e(e) && e instanceof Error;
    if (n && e instanceof TurnRefusedError) return;
    let r = n ? protoDataString(e, "name") : void 0,
      s = n ? protoDataString(e, "message") : void 0,
      h = (() => {
        try {
          let G = n && r !== void 0 && s !== void 0 ? Object.getOwnPropertyDescriptor(e, "stack") : void 0;
          return G === void 0 || "value" in G
            ? G?.value
            : ERROR_STACK_GETTER !== void 0 && G.get === ERROR_STACK_GETTER
              ? Reflect.apply(ERROR_STACK_GETTER, e, [])
              : void 0;
        } catch {
          return;
        }
      })(),
      y = n
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
                constructor: { name: constructorNameOf(e) },
              },
              (G) => ({ value: G }),
            ),
          )
        : void 0,
      S = y && oC(ALLOWED_ERROR_NAMES, ownDataValue(y, "code")),
      R =
        y === void 0
          ? "UnknownError"
          : S !== void 0
            ? `Error:${S}`
            : (oC(LANGUAGE_ERROR_NAMES, r) ?? "Error"),
      w = `${TURN_LOOP_CRASHED} (${R})`,
      P = y !== void 0 && typeof h === "string" ? stripStackHeader(y) : void 0,
      L =
        P !== void 0 &&
        P !== h &&
        P.split(
          `
`,
        ).every((G) => G.trim() === "" || G.trim().startsWith("at ")),
      q = withTelemetryMessage(Error("Headless turn loop crashed"), w),
      x = y !== void 0 && L ? errorClassName(y) : void 0;
    (logError(
      y === void 0 || x === void 0
        ? q
        : Object.assign(q, {
            name: x,
            stack: `${x}: ${TURN_LOOP_CRASHED}
${P}`,
            code: ownDataValue(y, "code"),
            errno: ownDataValue(y, "errno"),
            syscall: ownDataValue(y, "syscall"),
          }),
    ),
      logForDebugging(
        typeof h === "string"
          ? `${w}: error message left out of this line, as it may hold private data; a local session's result has it in errors[0]`
          : `${w}: what was thrown has no stack that can be read safely`,
        { level: "error" },
      ));
  } catch {}
}
//@ chunk-tyg7f3ek.js:159588-159651 placement
function oC(e, n) {
  return typeof n === "string" && e.has(n) ? n : void 0;
}
//@ chunk-tyg7f3ek.js:159651-159914 placement
function constructorNameOf(e) {
  if (e === null) return;
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, "constructor");
  if (ownPropertyDescriptor === void 0) return constructorNameOf(Object.getPrototypeOf(e));
  let r =
    "value" in ownPropertyDescriptor &&
    typeof ownPropertyDescriptor.value === "function" &&
    !n0e(ownPropertyDescriptor.value)
      ? ownDataValue(ownPropertyDescriptor.value, "name")
      : void 0;
  return typeof r === "string" ? r : void 0;
}
//@ chunk-tyg7f3ek.js:159914-160020 placement
function ownDataValue(e, n) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, n);
  return ownPropertyDescriptor !== void 0 && "value" in ownPropertyDescriptor
    ? ownPropertyDescriptor.value
    : void 0;
}
//@ chunk-tyg7f3ek.js:160020-160098 placement
function watchTaskChanges({ store: store, ...n }) {
  return createDependencyWatcher(
    [store],
    () => [store.getState().tasks],
    () => maybeReportIdleWithBackgroundTasks(n),
  );
}
//@ chunk-tyg7f3ek.js:160098-160331 placement
function maybeReportIdleWithBackgroundTasks({
  drain: drain,
  io: io,
  ccrRecap: ccrRecap,
  stopping: stopping,
  idleAllowedAtTurnEnd: idleAllowedAtTurnEnd,
}) {
  try {
    if (
      drain.running ||
      stopping() ||
      io.sessionState.getState() !== "running" ||
      !reportsRunningBackgroundTasks() ||
      !idleAllowedAtTurnEnd()
    )
      return;
    (io.sessionState.notifyStateChanged("idle"), maybeStartCcrRecap(ccrRecap, io.sessionState));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:160331-160361 placement
var HH = 8000,
  NH = 1e4,
  WH = 8,
  qH = 64;
//@ chunk-tyg7f3ek.js:160361-160564 placement
function parseMcpPrewaitServers(e, n) {
  if (e === void 0 || n === 0) return;
  let sliced = uniq(
    e
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= qH),
  ).slice(0, WH);
  if (sliced.length === 0) return;
  return { names: sliced, budgetMs: Math.min(n ?? HH, NH) };
}
/**
 * 轮次开始前等待指定 MCP 服务器连接（CLAUDE_CODE_MCP_PREWAIT_SERVERS）或连接器预等待，带截止时间。
 */
//@ chunk-tyg7f3ek.js:160564-163023 placement
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
  reported = !1;
  logged;
  constructor(e) {
    ((this.coordinatorMainThreadOnly = e.coordinatorMainThreadOnly),
      (this.relayMarked = e.relayMarked),
      (this.relayHoldLog = e.relayHoldLog),
      (this.startedFromTranscript = e.startedFromTranscript),
      (this.mainThreadRequested = e.mainThreadRequested),
      (this.mcpClients = e.mcpClients),
      (this.waitForPendingMcp = e.waitForPendingMcp));
    let n = e.setting?.names ?? [];
    if (
      ((this.namedCount = n.length),
      (this.budgetMs = e.setting?.budgetMs ?? 0),
      (this.deadlineAt = e.kickedAtMs + this.budgetMs),
      n.length === 0)
    ) {
      this.names = new Set();
      return;
    }
    let r = new Set(
      e
        .mcpClients()
        .filter((s) => s.config.scope === "dynamic" && !isPluginServerConfig(s.config))
        .map((s) => s.name),
    );
    if (((this.names = new Set(n.filter((s) => r.has(s)))), n.length > this.names.size))
      logForDebugging(
        `[MCP] CLAUDE_CODE_MCP_PREWAIT_SERVERS names servers with no --mcp-config row at start-up; not waiting for: ${n.filter((s) => !r.has(s)).join(", ")}`,
      );
  }
  join(e) {
    if (!e || this.names.size === 0) return null;
    if (this.mainThreadRequested()) return (this.report("request_started", 0), null);
    if (!this.stillPending()) return (this.report("not_pending", 0), null);
    let startTime = performance.now(),
      rounded = Math.round(this.deadlineAt - startTime);
    if (rounded <= 0) return (this.report("deadline_passed", 0), null);
    let s = !1;
    return this.waitForPendingMcp(rounded, {
      waitForDeferrable: !0,
      localOnly: !1,
      coordinatorMainThreadOnly: this.coordinatorMainThreadOnly,
      relayMarked: this.relayMarked,
      ...this.relayHoldLog,
      onlyServerNames: this.names,
    })
      .catch((h) => {
        ((s = !0), logError(h));
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
    this.reported = !0;
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
    if (
      ((this.logged = { outcome: e, ...r }),
      logEvent("tengu_headless_mcp_launch_named_wait", { outcome: fromEnum(e), ...r }),
      e === "held_timed_out" || e === "held_wait_failed" || e === "deadline_passed")
    )
      logFeatureSad("mcp_launch_named_wait", e, r);
    else if (e !== "request_started") logFeatureOk("mcp_launch_named_wait", r);
  }
}
//@ chunk-tyg7f3ek.js:163023-163044 placement
var jH = 150000,
  QH = 250;
//@ chunk-tyg7f3ek.js:163044-163393 placement
function createTranscriptSaver({ io: io, isShuttingDown: isShuttingDown, uploadWaitMs: uploadWaitMs = jH }) {
  let s = createTranscriptSaver_2();
  return {
    isOn: () => !isTranscriptPersistenceDisabled(),
    save: async (h) => {
      if (!(await s.save())) return !1;
      let y = Date.now() + uploadWaitMs;
      while (io.unsentInternalEvents > 0) {
        if (isShuttingDown() || Date.now() > y) return !1;
        await sleep(QH, void 0, { unref: !0 });
      }
      return !isShuttingDown() && io.refusedInternalEvents(h).length === 0;
    },
    lostSoFar: () => s.lostSoFar() + io.droppedInternalBatches,
  };
}
//@ chunk-tyg7f3ek.js:163393-163567 placement
function isSlashCommandPrompt(e, n, r) {
  let s = aO(n),
    y =
      s !== null &&
      s.startsWith("/") &&
      (e.skipSlashCommands !== !0 ||
        (e.bridgeOrigin === !0 && e.textNotTyped !== !0 && !bridgeSlashLineBuildsRequest(s, r())));
  return e.shouldQuery !== !1 && !y;
}
//@ chunk-tyg7f3ek.js:163567-163619 placement
function createInlineMcpTiming() {
  return { totalMs: 0, firstStartMs: void 0 };
}
//@ chunk-tyg7f3ek.js:163619-164071 placement
function recordInlineMcpSetServers(
  e,
  {
    startMs: startMs,
    answeredMs: answeredMs,
    mainThreadRequested: mainThreadRequested,
    relayMarked: relayMarked,
    response: response,
  },
) {
  let S = answeredMs - startMs;
  ((e.totalMs += S),
    (e.firstStartMs ??= startMs),
    Br("mcp_set_servers_inline_ms", e.totalMs, e.firstStartMs));
  let R = Object.keys(response.errors).length,
    w = {
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
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_plugin_refresh_in_idle_enabled", !1)
  );
}
//@ chunk-tyg7f3ek.js:164176-164807 placement
async function waitForPluginSyncBudget(e) {
  let n = !1;
  try {
    let r = e.pluginsSync.then(
        () => "settled",
        () => "settled",
      ),
      s = sleep(Math.max(0, e.remainingSyncBudgetMs())).then(() => "timeout");
    if ((await Promise.race([r, s])) === "timeout") ((n = !0), e.onSyncOutlivedBudget());
  } catch (error) {
    logError(error);
  }
  try {
    let startTime = performance.now(),
      serverNamesOwnedBeforePluginsSync = await e.serverNamesOwnedBeforePluginsSync();
    if (
      (await e.refreshPluginState(),
      Br("plugin_state_refresh_idle_ms", performance.now() - startTime, startTime),
      n)
    )
      logFeatureSad("plugins_sync_idle_refresh", "sync_timeout");
    else logFeatureOk("plugins_sync_idle_refresh");
    return serverNamesOwnedBeforePluginsSync;
  } catch (error) {
    (logError(error),
      logFeatureBad("plugins_sync_idle_refresh", "reload_failed", {
        error_name:
          error instanceof Error ? (sanitizeClassName(error.name) ?? lit("Error")) : lit("non-error"),
      }));
    return;
  }
}
//@ chunk-tyg7f3ek.js:164807-164943 placement
function needsPluginRefreshAfterIdle(e) {
  if (!e.idleRefreshRan) return !1;
  return (e.idleRefreshSyncTimedOut && e.syncLanded) || e.syncRoundReplaced || e.installNeedsRefresh;
}
//@ chunk-tyg7f3ek.js:164943-164970 placement
var hC = new Set([LISTMCPRESOURCESTOOL, READMCPRESOURCETOOL, READ_MCP_RESOURCE_DIR_TOOL_NAME]);
//@ chunk-tyg7f3ek.js:164970-165076 placement
var coordinatorModeModule = require("./chunk-yxywkh50.js"),
  teleportRelayCarrierModule = require("./chunk-1d5behve.js"),
  relayUsabilityModule = require("./chunk-1cnesc1e.js");
//@ chunk-tyg7f3ek.js:165076-165146 placement
function $H() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-tyg7f3ek.js:165146-166129 placement
function planMcpConnectorPrewait(e) {
  let n = Boolean(e.sdkUrl) && !vS(),
    isCoordinatorMode = coordinatorModeModule.isCoordinatorMode(),
    s = n ? env.CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS : void 0,
    h = s === void 0 ? void 0 : Math.min(s, ec),
    y = n && wC(),
    S = y && !(e.relayHoldFollowsBootVerdict === !0 && !KH()),
    R = n && !isCoordinatorMode && h === void 0,
    CLAUDE_CODE_MCP_STARTUP_WAIT_MS = env.CLAUDE_CODE_MCP_STARTUP_WAIT_MS,
    P = CLAUDE_CODE_MCP_STARTUP_WAIT_MS === void 0 ? void 0 : Math.min(CLAUDE_CODE_MCP_STARTUP_WAIT_MS, ec),
    L = S
      ? "relay"
      : P !== void 0
        ? P > 0
          ? "host_wait"
          : "host_no_wait"
        : !e.hasStreamingInput
          ? "single_shot"
          : n
            ? "ccr_worker"
            : isCoordinatorMode
              ? "coordinator"
              : !e.toolSearchAvailable
                ? "no_tool_search"
                : e.explicitMcpConfigFlag
                  ? "explicit_mcp_config"
                  : "lifted",
    q = n
      ? parseMcpPrewaitServers(env.CLAUDE_CODE_MCP_PREWAIT_SERVERS, env.CLAUDE_CODE_MCP_PREWAIT_SERVERS_MS)
      : void 0;
  return {
    deadlineMs: S
      ? Math.max(Qai, P ?? h ?? 0)
      : (P ?? (e.explicitMcpConfigFlag && !n ? getConnectionTimeoutMs() : h)),
    waitForDeferrable: L !== "lifted" && L !== "host_no_wait",
    firstTurnHold: L,
    localOnly: R && !S,
    coordinatorMainThreadOnly: isCoordinatorMode,
    relayMarked: y,
    relayHold: S,
    ...(q !== void 0 && { launchNamed: q }),
    skipFullyDeferredServers: n && !isCoordinatorMode && e.hasStreamingInput && e.toolSearchAvailable,
    ...(S && { laterWakes: { deadlineMs: P ?? h, localOnly: R } }),
  };
}
//@ chunk-tyg7f3ek.js:166129-166194 placement
function wC() {
  return teleportRelayCarrierModule !== null && teleportRelayCarrierModule.teleportRelayCarrierPresent();
}
//@ chunk-tyg7f3ek.js:166194-166257 placement
function KH() {
  return relayUsabilityModule === null || relayUsabilityModule.relayStillUsableInProcess();
}
//@ chunk-tyg7f3ek.js:166257-166318 placement
function vC() {
  return (
    isToolSearchEnabledOptimistic() &&
    modelSupportsToolReference(getMainLoopModel()) &&
    !isVertexModelWithoutToolSearch(getCanonicalName(getMainLoopModel())) &&
    !rGt()
  );
}
//@ chunk-tyg7f3ek.js:166318-166333 placement
var _C = new Set();
//@ chunk-tyg7f3ek.js:166333-167115 placement
function discoveredToolsInConversation(e, n) {
  let r = (s) => n !== void 0 && count(n, (h) => h === s) === 1;
  try {
    let s = new Set(),
      h = extractDiscoveredToolNames(e, n && { surfaced: { exceptAnnouncements: new Set() } }),
      y = new Set(h);
    for (let S of e)
      if (S.type === "assistant") {
        for (let R of S.message.content) if (R.type === "tool_use") (h.add(R.name), y.add(R.name));
      } else if (S.type === "attachment") {
        let { attachment: attachment } = S;
        if (attachment.type === "deferred_tools_delta") {
          for (let w of stringArray(attachment.addedNames)) h.add(w);
          for (let w of stringArray(attachment.wireHiddenNames)) (h.add(w), y.add(w));
        } else if (attachment.type === "mcp_instructions_delta")
          for (let w of stringArray(attachment.addedNames)) {
            let P = getPrefixServerKey(w);
            if (!r(P)) s.add(P);
          }
      }
    for (let S of h) {
      let R = mcpInfoFromString(S);
      if (R) {
        if (y.has(S) || !r(R.serverName)) s.add(R.serverName);
      } else if (hC.has(S) || S.startsWith("mcp__")) return;
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
function pluginMcpServersRequired({
  policyAllows: policyAllows,
  clients: clients,
  requiredServerNames: requiredServerNames,
  messages: messages,
}) {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT,
    y = Udo.some((P) => P === CLAUDE_CODE_ENTRYPOINT) && !env.CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS && !wC(),
    filtered = clients.filter(
      (P) =>
        P.type === "pending" &&
        (P.config.type === void 0 || P.config.type === "stdio") &&
        (P.config.alwaysLoad === !1 ||
          (P.config.alwaysLoad === void 0 && y && isFromBuiltinMarketplace(P.config))),
    );
  if (filtered.length === 0 || !policyAllows() || getToolSearchMode() !== "tst" || !vC()) return _C;
  let R = discoveredToolsInConversation(
    messages,
    isSortedOtterOn() ? clients.map((P) => getPrefixServerKey(P.name)) : void 0,
  );
  if (R === void 0) return _C;
  let w = requiredServerNames();
  return new Set(
    filtered
      .map((P) => ({ name: P.name, segment: getPrefixServerKey(P.name) }))
      .filter((P) => !w.has(P.segment) && !R.has(P.segment))
      .map((P) => P.name),
  );
}
/**
 * 每轮开始前刷新 MCP：等待可延迟服务器、合并本地/插件/动态配置、更新工具与命令。
 */
//@ chunk-tyg7f3ek.js:167718-170176 placement
async function refreshMcpForTurn(e, n, r = Npe, s = {}) {
  let {
      skipTelemetry: skipTelemetry = !1,
      waitForDeferrable: waitForDeferrable = !1,
      localOnly: localOnly = !1,
      coordinatorMainThreadOnly: coordinatorMainThreadOnly = !1,
      relayMarked: relayMarked = !1,
      relayHold: relayHold,
      relayHoldFollowsBootVerdict: relayHoldFollowsBootVerdict,
      firstTurnHold: firstTurnHold,
      requiredServerNames: requiredServerNames,
      onlyServerNames: onlyServerNames,
      permissionPromptToolServerName: permissionPromptToolServerName,
      alsoWaitFor: alsoWaitFor,
      skipServerNames: skipServerNames,
    } = s,
    Ue = !waitForDeferrable && vC(),
    ce = (ut) => requiredServerNames?.has(getPrefixServerKey(ut.name)) ?? !1,
    nt = coordinatorMainThreadOnly ? coordinatorExtraToolNames() : [],
    ie = (ut) =>
      (onlyServerNames === void 0 || onlyServerNames.has(ut.name)) &&
      !skipServerNames?.has(ut.name) &&
      (!localOnly || $H().isLocalMcpServer(ut.config)) &&
      (!coordinatorMainThreadOnly || coordinatorMainThreadUsesMcpServer(ut, nt)),
    Se = (ut) => ie(ut) && (!Ue || ut.config.alwaysLoad === !0 || ce(ut)),
    me = (ut) => ut.type === "pending" && ce(ut) && ie(ut),
    Me = (ut) =>
      permissionPromptToolServerName !== void 0 &&
      getPrefixServerKey(ut.name) === permissionPromptToolServerName,
    Ee = (ut) => ut.type === "pending" && Me(ut),
    He = (ut) => ut.type === "pending" && alsoWaitFor?.has(ut.name) === !0 && ie(ut) && !Se(ut) && !Me(ut),
    Xe = (ut) => ut.type === "pending" && (Me(ut) || Se(ut) || He(ut)),
    mcp = e().mcp,
    St = count(mcp.clients, (ut) => ut.type === "pending"),
    wt = count(mcp.clients, Xe),
    Lt = count(mcp.clients, He),
    any = mcp.clients.some(Ee),
    _n = mcp.tools.length,
    Mn = { getState: e, subscribe: n },
    jn = 0,
    Jn = 0,
    now = Date.now();
  if (wt > 0 && r > 0) {
    if (Lt > 0)
      (await waitForStoreState(Mn, (Yt) => !Yt.mcp.clients.some(He), { timeoutMs: Math.min(r, Zai) }),
        (Jn = Date.now() - now));
    let ut = (Yt) => Yt.type === "pending" && (Me(Yt) || Se(Yt));
    if (e().mcp.clients.some(ut))
      await waitForStoreState(Mn, (Yt) => !Yt.mcp.clients.some(ut), {
        timeoutMs: Math.max(0, now + r - Date.now()),
      });
    jn = Date.now() - now;
  }
  let Dr = 0;
  if (r < Npe && e().mcp.clients.some(me))
    (await waitForStoreState(Mn, (ut) => !ut.mcp.clients.some(me), {
      timeoutMs: Math.max(0, now + Npe - Date.now()),
    }),
      (Dr = Date.now() - now - jn));
  let $r = 0;
  if (any)
    (await waitForStoreState(Mn, (ut) => !ut.mcp.clients.some(Ee), {
      timeoutMs: Math.max(0, now + getConnectionTimeoutMs() - Date.now()),
    }),
      ($r = Date.now() - now - jn - Dr));
  if (skipTelemetry) return;
  let mcp_2 = e().mcp;
  logEvent("tengu_headless_mcp_prewait", {
    localOnly: localOnly,
    coordinatorMainThreadOnly: coordinatorMainThreadOnly,
    willDeferMcp: Ue,
    waitForDeferrable: waitForDeferrable,
    deadlineMs: r,
    pendingBefore: St,
    pendingWaitedBefore: wt,
    toolsBefore: _n,
    waitedMs: jn,
    permissionPromptServerPendingBefore: any,
    permissionPromptWaitedMs: $r,
    pendingAfter: count(mcp_2.clients, (ut) => ut.type === "pending"),
    pendingWaitedAfter: count(mcp_2.clients, Xe),
    permissionPromptServerPendingAfter: mcp_2.clients.some(Ee),
    relayMarked: relayMarked,
    relayHold: relayHold,
    relayHoldFollowsBootVerdict: relayHoldFollowsBootVerdict,
    namedServersOnly: onlyServerNames !== void 0,
    alsoWaitForCount: alsoWaitFor?.size ?? 0,
    pendingNamedOnlyBefore: Lt,
    namedOnlyWaitedMs: Jn,
    toolsAfter: mcp_2.tools.length,
    mcpNonBlocking: getMcpConnectNonBlocking(),
    firstTurnHold: fromEnumOpt(firstTurnHold),
    pendingDeferredBefore: Ue ? count(mcp.clients, (ut) => ut.type === "pending" && ie(ut) && !Xe(ut)) : 0,
    pendingRequiredBefore: count(mcp.clients, me),
    requiredWaitedMs: Dr,
    pendingFullyDeferredSkippedBefore: count(
      mcp.clients,
      (ut) => ut.type === "pending" && skipServerNames?.has(ut.name) === !0 && !Xe(ut),
    ),
  });
}
//@ chunk-tyg7f3ek.js:170176-170268 placement
function emitOrHoldResult({ message: message, held: held, holdBackActive: holdBackActive, emit: emit }) {
  if (holdBackActive) {
    held.push(message);
    return;
  }
  (flushHeldResults(held, emit), emit(message));
}
//@ chunk-tyg7f3ek.js:170268-170316 placement
function flushHeldResults(e, n) {
  for (let r of e) n(r);
  e.length = 0;
}
//@ chunk-tyg7f3ek.js:170316-170455 placement
function clearQueuedTurnCount(e, n) {
  if (!n || e.type !== "result" || e.queued_turn_count === void 0 || e.queued_turn_count === 0) return e;
  return { ...e, queued_turn_count: 0 };
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

/**
 * cli/print/turnDispatch.ts
 *
 * 2.1.316 新增：无头回合分派器与忙碌判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1), chunk-tyg7f3ek.js (6)
 * attribution: placement 7
 */
import { hasTurnAttribution } from "./userFrameIntake.js";
import { Qvt } from "../../utils/messages/messagePredicates.js";
import { collectDeclaredPollEvents } from "../../utils/pollEvents.js";
import { resolveTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { uniq, count } from "../../utils/collections.js";
import { HeadlessHeapCensus, HeadlessUploadsCensus } from "./headlessCensus.js";
import { cliError_2 } from "../exit.js";
import { createAbortController, unwrapAbortReason, userAbortReason } from "../../utils/abortController.js";
import { getTotalAPIDuration, getAutoModeUnavailableStopNotice } from "../../bootstrap/state.js";
import { Rlt, messageTurnAttributionKey } from "../../utils/turnAttributionKey.js";
import { setForegroundTurnBusy } from "../../utils/plugins/hooksModulesLoadGate.js";
import { passModelFallback, countUnsentBatchMessages } from "./sdkMessageStream.js";
import { isTextOrJsonDeltaEvent } from "../../query/goalCheckIn.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { isAbortedTerminalReason } from "../../entrypoints/sdk/coreSchemas.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { droppedDebugOutputTotals } from "../../utils/debug.js";
import { publishFailedSummary } from "./sessionResult.js";
import { F3n } from "../../utils/permissions/serverClassifier/results.js";
import { Etr, waitForAttachmentFiles } from "../../bridge/attachmentFilesWait.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { DoctorLazy } from "../handlers/util.js";
import { kt, A, E, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { canBatchWith } from "../print.js";

//@ chunk-tyg7f3ek.js:256443-256543 placement
function isBusy({ running: running, runPhase: runPhase, mainThreadQueueLength: mainThreadQueueLength }) {
  return (running && runPhase !== "waiting_for_agents") || mainThreadQueueLength > 0;
}
//@ chunk-tyg7f3ek.js:256543-256631 placement
function isBusyOrClosed({ running: running, runPhase: runPhase, inputClosed: inputClosed }) {
  return (running && runPhase !== "waiting_for_agents") || inputClosed;
}
//@ chunk-tyg7f3ek.js:256631-259614 placement
function buildTurnDispatchInfo(e, n) {
  let filtered = n
    .flatMap((s) => [...(s.mergedSendUuids ?? []), ...(s.uuid !== void 0 ? [s.uuid] : [])])
    .filter((s) => s !== e.uuid);
  return {
    uuid: e.uuid,
    userMessageUuids: n.flatMap((s) => [
      ...(s.isMeta ? [] : (s.mergedSendUuids ?? [])),
      ...(s.sendsOfItsCompactedTurn ?? []),
      ...(hasTurnAttribution(s)
        ? [s.uuid]
        : s.resumedTurnUserMessageUuid !== void 0
          ? [s.resumedTurnUserMessageUuid]
          : []),
    ]),
    mergedSendUuids: filtered.length > 0 ? filtered : void 0,
    alsoLeftToThisReRun: n.find((s) => s.alsoLeftToThisReRun !== void 0)?.alsoLeftToThisReRun,
    resumedTurnOpenerUuid: n.find((s) => s.resumedTurnOpenerVouched === !0)?.resumedTurnUserMessageUuid,
    isMeta: e.isMeta,
    resumeReason: n.find((s) => s.resumeReason !== void 0)?.resumeReason,
    uuidIsClientEventUuid: (n.findLast((s) => s.uuid) ?? e).turnAttributionKey !== void 0,
    shouldQuery: e.shouldQuery,
    queryHeldForNextTurn: e.queryHeldForNextTurn,
    skipAttachments: Qvt(e) || void 0,
    pollEventDelivery: e.mode === "poll-event" || void 0,
    pollEventProvenance: e.mode === "poll-event" ? [e.pollEvent?.provenance ?? null] : void 0,
    pollEventDeclared: collectDeclaredPollEvents([e]),
    ...!1,
    skipSkillPermissionReset: e.mode === "poll-event" || e.pollEmptyDispatch === !0 || void 0,
    pollEmptyDispatch: e.pollEmptyDispatch === !0 || void 0,
    skipSubmissionHooks: e.mode === "poll-event" || e.skipSubmissionHooks || void 0,
    inputMode: e.mode === "bash" && e.clientBashCommand === !0 ? "bash" : void 0,
    clientBashCommandCwd: e.mode === "bash" && e.clientBashCommand === !0 ? e.clientBashCommandCwd : void 0,
    stopHookActive: e.stopHookActive,
    fileAttachments: e.fileAttachments,
    inlinedImagePaths: e.inlinedImagePaths,
    imageFileUuids: e.imageFileUuids,
    savedFiles: n.flatMap((s) => s.savedFiles ?? []),
    withdrawnFileUuids: n.flatMap((s) => s.withdrawnFileUuids ?? []),
    stampThreadState: e.stampThreadState,
    frameTiming: e.frameTiming,
    skipSlashCommands: e.skipSlashCommands,
    bridgeOrigin: e.bridgeOrigin,
    localStdinOrigin: e.localStdinOrigin,
    sessionChannelPersonTyped: e.sessionChannelPersonTyped,
    ownWordUuids: n.filter((s) => s.ownWord === !0).map((s) => s.uuid ?? s.stopKey),
    hostInitiator: e.hostInitiator,
    inboundOrigin: e.inboundOrigin,
    toolsUsed: e.toolsUsed,
    modelScheduledOrigin: e.modelScheduledOrigin,
    wakeupSource: e.wakeupSource,
    artifactCommentTurn: e.artifactCommentTurn,
    origin: resolveTaskNotificationOrigin(e.origin, e.mode, e.runId),
    clientPlatform: e.clientPlatform,
    disallowedTools: uniq(n.flatMap((s) => s.disallowedTools ?? [])),
    clientDisallowedTools: n.some((s) => s.replacesDisallowedTools)
      ? uniq(n.flatMap((s) => (s.replacesDisallowedTools ? (s.disallowedTools ?? []) : [])))
      : void 0,
    keepsDisallowedTools:
      (n.length > 0 &&
        n.every(
          (s) =>
            s.disallowedTools === void 0 &&
            (s.mode === "task-notification" || s.wakeupSource !== void 0 || s.keepsDisallowedTools === !0),
        )) ||
      void 0,
    verifiedSlackHumanTurn: e.verifiedSlackHumanTurn,
    projectsUserTurn: e.projectsUserTurn,
    emailSenderTurn: e.emailSenderTurn,
    textNotTyped: e.textNotTyped,
    ownFilePaths: e.ownFilePaths,
    noPersonArrived: e.noPersonArrived,
    hearthRelayRows: e.hearthRelayRows,
    hearthRelayThreadTs: e.hearthRelayThreadTs,
    hearthRelayMessageIds: e.hearthRelayMessageIds,
    taskDelivery: e.taskDelivery,
    orphanedPermission: e.orphanedPermission,
    handedOffTurn: e.handedOffTurn,
    handedOffTurnUserMessageUuids: e.handedOffTurnUserMessageUuids,
  };
}
/**
 * print 主循环的轮次分派器：从队列取批次、运行 QueryEngine、处理中断/重跑/结果与 SDK 事件排空。
 */
//@ chunk-tyg7f3ek.js:259614-265770 placement
class TurnDispatcher {
  messageQueue;
  drain;
  prewaitLatch;
  turnOutcome;
  io;
  emit;
  stopping;
  messages;
  engine;
  drainSdkEvents;
  deferredToolUse;
  takeErrorRowBehind;
  inTurnScope;
  onTurnStart;
  onFrame;
  teeFrame;
  plainDeltasNeedOnlyEmit;
  onResult;
  afterTurnFinally;
  pendingMcpServerCount;
  lastReportedServedModel;
  sdkResultTurnIndex = 0;
  heapCensus = new HeadlessHeapCensus({
    isBusy: () =>
      this.stopping() ||
      this.drain.endSessionRequested ||
      isBusy({
        running: this.drain.running,
        runPhase: this.drain.runPhase,
        mainThreadQueueLength: this.messageQueue.getMainThreadQueueLength(),
      }),
    turnCount: () => this.sdkResultTurnIndex,
    messageCount: () => this.messages().length,
  });
  uploadsCensus = new HeadlessUploadsCensus();
  constructor({
    messageQueue: e,
    drain: n,
    prewaitLatch: r,
    turnOutcome: s,
    io: h,
    emit: y,
    stopping: S,
    messages: R,
    engine: w,
    drainSdkEvents: P,
    deferredToolUse: L,
    takeErrorRowBehind: q,
    inTurnScope: x,
    onTurnStart: G,
    onFrame: Z,
    teeFrame: re,
    plainDeltasNeedOnlyEmit: Ae,
    onResult: Ue,
    afterTurnFinally: ce,
    pendingMcpServerCount: nt,
  }) {
    ((this.messageQueue = e),
      (this.drain = n),
      (this.prewaitLatch = r),
      (this.turnOutcome = s),
      (this.io = h),
      (this.emit = y),
      (this.stopping = S),
      (this.messages = R),
      (this.engine = w),
      (this.drainSdkEvents = P),
      (this.deferredToolUse = L),
      (this.takeErrorRowBehind = q),
      (this.inTurnScope = (ie, Se) => cliError_2(() => x(ie, Se))),
      (this.onTurnStart = G),
      (this.onFrame = Z),
      (this.teeFrame = re),
      (this.plainDeltasNeedOnlyEmit = Ae),
      (this.onResult = Ue),
      (this.afterTurnFinally = ce),
      (this.pendingMcpServerCount = nt));
  }
  arm(e) {
    let n = createAbortController(),
      r = n.abort.bind(n);
    if (
      ((n.abort = (s) => {
        if (
          this.drain.abortController === n &&
          unwrapAbortReason(s) === "remote-cancel" &&
          !(this.drain.sendNowCutTurn && !n.signal.aborted)
        )
          this.drain.stopReachedTurn = !0;
        r(s);
      }),
      (this.drain.abortController = n),
      (this.drain.turnUnderWay = !0),
      (this.drain.stopReachedTurn = !1),
      (this.drain.sendNowCutTurn = !1),
      this.drain.noteTurnStarted(this.drain.intentBatchInFlight ? e.members : []),
      (this.drain.pendingDispatchUuids = []),
      (this.drain.pendingDispatchKeys = []),
      this.prewaitLatch.consumeAtArm(e.members, this.drain.intentBatchInFlight))
    )
      n.abort(userAbortReason("remote-cancel"));
    return n;
  }
  async run({ batch: e, input: n, tools: r, intake: s, turnStartClock: h, inPlaceOfFirstRequest: y }) {
    let { command: command, members: members } = e,
      w = { command: command, members: members, input: n, refused: y !== void 0 },
      P = Symbol("headless turn"),
      L,
      q,
      x,
      G = !1,
      Z = { count: 0, uuids: new Set() },
      re = 0;
    return (
      await this.inTurnScope(w, async () => {
        let Ae = !1,
          Ue = 0,
          ce = getTotalAPIDuration(),
          nt = this.messages().length,
          ie = this.pendingMcpServerCount?.(),
          Se = 0,
          me = 0;
        if (
          (this.onTurnStart?.(w),
          this.turnOutcome.startTurn(Rlt(messageTurnAttributionKey(command))),
          setForegroundTurnBusy(!0, P),
          this.messageQueue.setInFlightDrainBatch(members),
          this.drain.drainingHandoff?.command === command)
        )
          this.drain.drainingHandoff.running = !0;
        try {
          let Me =
              y === void 0
                ? void 0
                : members.find((We) => We.mode === "prompt" && We.resumeReason !== void 0),
            Ee = buildTurnDispatchInfo(command, members),
            He = {
              ...Ee,
              ...(Me !== void 0 && {
                ...buildTurnDispatchInfo(Me, [Me]),
                userMessageUuids: Ee.userMessageUuids,
                disallowedTools: Ee.disallowedTools,
                clientDisallowedTools: Ee.clientDisallowedTools,
                keepsDisallowedTools: Ee.keepsDisallowedTools,
              }),
              abortController: this.drain.abortController,
              onCommandTakenIn: (We, St) => this.drain.noteTakenIn(We, St),
              onPromptCheckInterrupted: () => {
                G = !0;
              },
              turnStartClock: h,
              emitPlainDelta:
                this.plainDeltasNeedOnlyEmit === void 0
                  ? void 0
                  : (We) => {
                      if (!this.plainDeltasNeedOnlyEmit?.()) return !1;
                      return (this.emit(passModelFallback(We)), Se++, !0);
                    },
              inPlaceOfFirstRequest: y,
              refusedPromptIsStoredAlready: Me !== void 0,
              errorRowBehindRefusedPrompt: Me?.uuid === void 0 ? void 0 : this.takeErrorRowBehind?.(Me.uuid),
              deferredToolUse:
                command.handedOffTurn !== void 0 || y !== void 0 ? void 0 : this.deferredToolUse?.(),
            };
          h.enter("engine_setup");
          let engine = this.engine();
          for await (let We of engine.submitMessage(Me === void 0 ? n : Me.value, He)) {
            if (We.type === "system" && We.subtype === "compact_boundary")
              (re++, (nt = this.messages().length));
            if (
              (this.onFrame?.(We, w), this.plainDeltasNeedOnlyEmit !== void 0 && isTextOrJsonDeltaEvent(We))
            )
              me++;
            if (We.type === "system" && We.subtype === "api_retry")
              ((Ae = !0), (Ue = Math.max(Ue, We.error_status ?? 0)));
            if (
              We.type === "assistant" &&
              We.parent_tool_use_id === null &&
              We.message.model !== SYNTHETIC_MODEL &&
              We.message.model !== this.lastReportedServedModel
            )
              ((this.lastReportedServedModel = We.message.model),
                this.io.sessionState.notifyMetadataChanged({ last_served_model: We.message.model }));
            if (We.type === "result") {
              if (
                ((this.drain.turnUnderWay = !1),
                (L = this.drain.abortController?.signal.aborted ?? !1),
                s.noteTurnEnded(L, command, We),
                (q = We.terminal_reason),
                G && this.drain.abortController)
              )
                Z = countUnsentBatchMessages({
                  batch: e,
                  turnSignal: this.drain.abortController.signal,
                  isStopped: this.drain.stopReachedTurn,
                  isSentNow: this.drain.sendNowCutTurn,
                  conversation: this.messages(),
                  messageQueue: this.messageQueue,
                });
              let St = Z.count > 0;
              if (!St) x = We;
              let wt =
                  We.subtype === "error_during_execution" &&
                  (isAbortedTerminalReason(We.terminal_reason) || L),
                Lt = We.subtype === "error_during_execution" ? getAutoModeUnavailableStopNotice() : void 0,
                pn = Lt !== void 0;
              if (this.turnOutcome.turnInFlight)
                (logEvent("tengu_sdk_result", {
                  subtype: wt ? lit("terminated") : fromEnum(We.subtype),
                  is_error: We.is_error,
                  num_turns: We.num_turns,
                  duration_ms: We.duration_ms,
                  duration_api_ms: getTotalAPIDuration() - ce,
                  saw_retry: Ae,
                  saw_compact: re > 0,
                  retry_status: Ae ? Ue : void 0,
                  api_error_status: We.subtype === "success" ? (We.api_error_status ?? void 0) : void 0,
                  user_message_uuid: ye(this.turnOutcome.userMessageUuid),
                  ...countMcpToolCallsSince(this.messages(), nt, r),
                  turn_index: this.sdkResultTurnIndex++,
                  mcp_pending_at_start: ie,
                  mcp_pending_at_end: this.pendingMcpServerCount?.(),
                  installed_mods: this.turnOutcome.installedModsSeen(),
                  ...droppedDebugOutputTotals(),
                  ...(this.plainDeltasNeedOnlyEmit !== void 0 && {
                    plain_deltas_sent_directly: Se,
                    plain_deltas_sent_normally: me,
                  }),
                }),
                  this.turnOutcome.endTurn());
              if (
                We.is_error &&
                (!wt ||
                  pn ||
                  (this.io.isRemoteTransport() &&
                    unwrapAbortReason(this.drain.abortController?.signal.reason) === "shutdown"))
              )
                publishFailedSummary(
                  this.io.sessionState,
                  Lt !== void 0 ? F3n(Lt) : We.subtype === "success" ? We.result : We.errors[0],
                );
              if (Etr() && !isTerminalShutdown())
                await waitForAttachmentFiles(
                  this.drain.abortController?.signal ?? new AbortController().signal,
                  { atTurnEnd: !0 },
                );
              We.queued_turn_count =
                this.drain.endSessionRequested || this.stopping()
                  ? 0
                  : hasBatchableQueuedPrompt(this.messageQueue);
              for (let Mn of this.drainSdkEvents()) this.emit(Mn);
              let _n = St ? void 0 : this.onResult(We, w);
              if (_n !== void 0) await _n;
            } else {
              for (let wt of this.drainSdkEvents()) this.emit(wt);
              let St = passModelFallback(We);
              (this.teeFrame?.(St), this.emit(St));
            }
          }
        } finally {
          if (
            ((this.drain.turnUnderWay = !1),
            setForegroundTurnBusy(!1, P),
            this.drain.drainingHandoff?.command === command)
          )
            this.drain.drainingHandoff = void 0;
          (this.messageQueue.clearInFlightDrainBatch(members),
            this.messageQueue.settleTaken({ turnEnded: !0 }),
            this.afterTurnFinally?.(w),
            this.heapCensus.afterTurn(),
            this.uploadsCensus.afterTurn());
        }
      }),
      { abortedAtResult: L, terminalReason: q, result: x, putBack: Z.uuids, compactions: re }
    );
  }
}
//@ chunk-tyg7f3ek.js:265770-266188 placement
function countMcpToolCallsSince(e, n, r) {
  let s = 0,
    h = 0,
    y = 0,
    S = new Set(r.filter((R) => R.mcpInfo && !R.name.startsWith("mcp__")).map((R) => R.name));
  for (let R = n; R < e.length; R++) {
    let w = e[R];
    if (w?.type !== "assistant") continue;
    for (let P of w.message.content) {
      if (P.type !== "tool_use") continue;
      if ((s++, P.name.startsWith("mcp__") || S.has(P.name))) h++;
      else if (P.name === TOOL_SEARCH_TOOL_NAME) y++;
    }
  }
  return { tool_use_count: s, mcp_tool_calls: h, toolsearch_calls: y, builtin_tool_calls: s - h - y };
}
//@ chunk-tyg7f3ek.js:266188-266540 placement
var TURN_DISPATCH_CONSTANTS = 10,
  NP = 86400000,
  Uy = 64,
  freeze = Object.freeze({
    waitMs: 5000,
    spentWaitMs: 5000,
    storeWaitMs: 1e4,
    lookMs: 100,
    readSpacingMs: 1000,
    readLostMs: 30000,
  }),
  K0 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  V0 = DoctorLazy(() =>
    kt({
      starts: A(E().int().nonnegative().max(Number.MAX_SAFE_INTEGER)).max(TURN_DISPATCH_CONSTANTS).optional(),
      new_frames: A(o()).optional(),
    }),
  ),
  G0 = DoctorLazy(() => kt({}));
//@ chunk-e6aww6q8.js:554048-554106 placement
function hasBatchableQueuedPrompt(e) {
  return count(e.getCommandQueueSnapshot(), canBatchWith);
}

export {
  V0,
  Uy,
  hasBatchableQueuedPrompt,
  TurnDispatcher,
  isBusyOrClosed,
  isBusy,
  TURN_DISPATCH_CONSTANTS,
  NP,
  freeze,
  G0,
  K0,
};

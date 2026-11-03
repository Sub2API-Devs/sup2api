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
import { isPassiveOrAttachedCommand } from "../../utils/messages/messagePredicates.js";
import { collectDeclaredPollEvents } from "../../utils/pollEvents.js";
import { resolveTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { uniq, count } from "../../utils/collections.js";
import { HeadlessHeapCensus, HeadlessUploadsCensus } from "./headlessCensus.js";
import { cliError_2 } from "../exit.js";
import { createAbortController, unwrapAbortReason, userAbortReason } from "../../utils/abortController.js";
import { getTotalAPIDuration, getAutoModeUnavailableStopNotice } from "../../bootstrap/state.js";
import { attributionKeyOrUndefined, messageTurnAttributionKey } from "../../utils/turnAttributionKey.js";
import { setForegroundTurnBusy } from "../../utils/plugins/hooksModulesLoadGate.js";
import { passModelFallback, countUnsentBatchMessages } from "./sdkMessageStream.js";
import { isTextOrJsonDeltaEvent } from "../../query/goalCheckIn.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { isAbortedTerminalReason } from "../../entrypoints/sdk/coreSchemas.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { droppedDebugOutputTotals } from "../../utils/debug.js";
import { publishFailedSummary } from "./sessionResult.js";
import { minimalUnavailableNotice } from "../../utils/permissions/serverClassifier/results.js";
import { areAttachmentFilesArriving, waitForAttachmentFiles } from "../../bridge/attachmentFilesWait.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { DoctorLazy } from "../handlers/util.js";
import { looseObject, array, E, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { canBatchWith } from "../print.js";

//@ chunk-tyg7f3ek.js:256443-256543 placement
function isBusy({ running, runPhase, mainThreadQueueLength }) {
  return (running && runPhase !== "waiting_for_agents") || mainThreadQueueLength > 0;
}
//@ chunk-tyg7f3ek.js:256543-256631 placement
function isBusyOrClosed({ running, runPhase, inputClosed }) {
  return (running && runPhase !== "waiting_for_agents") || inputClosed;
}
//@ chunk-tyg7f3ek.js:256631-259614 placement
function buildTurnDispatchInfo(e, n) {
  let filtered = n
    .flatMap((s) => [...(s.mergedSendUuids ?? []), ...(s.uuid !== undefined ? [s.uuid] : [])])
    .filter((s) => s !== e.uuid);
  return {
    uuid: e.uuid,
    userMessageUuids: n.flatMap((s) => [
      ...(s.isMeta ? [] : (s.mergedSendUuids ?? [])),
      ...(s.sendsOfItsCompactedTurn ?? []),
      ...(hasTurnAttribution(s)
        ? [s.uuid]
        : s.resumedTurnUserMessageUuid !== undefined
          ? [s.resumedTurnUserMessageUuid]
          : []),
    ]),
    mergedSendUuids: filtered.length > 0 ? filtered : undefined,
    alsoLeftToThisReRun: n.find((s) => s.alsoLeftToThisReRun !== undefined)?.alsoLeftToThisReRun,
    resumedTurnOpenerUuid: n.find((s) => s.resumedTurnOpenerVouched === true)?.resumedTurnUserMessageUuid,
    isMeta: e.isMeta,
    resumeReason: n.find((s) => s.resumeReason !== undefined)?.resumeReason,
    uuidIsClientEventUuid: (n.findLast((s) => s.uuid) ?? e).turnAttributionKey !== undefined,
    shouldQuery: e.shouldQuery,
    queryHeldForNextTurn: e.queryHeldForNextTurn,
    skipAttachments: isPassiveOrAttachedCommand(e) || undefined,
    pollEventDelivery: e.mode === "poll-event" || undefined,
    pollEventProvenance: e.mode === "poll-event" ? [e.pollEvent?.provenance ?? null] : undefined,
    pollEventDeclared: collectDeclaredPollEvents([e]),
    ...false,
    skipSkillPermissionReset: e.mode === "poll-event" || e.pollEmptyDispatch === true || undefined,
    pollEmptyDispatch: e.pollEmptyDispatch === true || undefined,
    skipSubmissionHooks: e.mode === "poll-event" || e.skipSubmissionHooks || undefined,
    inputMode: e.mode === "bash" && e.clientBashCommand === true ? "bash" : undefined,
    clientBashCommandCwd:
      e.mode === "bash" && e.clientBashCommand === true ? e.clientBashCommandCwd : undefined,
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
    ownWordUuids: n.filter((s) => s.ownWord === true).map((s) => s.uuid ?? s.stopKey),
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
      : undefined,
    keepsDisallowedTools:
      (n.length > 0 &&
        n.every(
          (s) =>
            s.disallowedTools === undefined &&
            (s.mode === "task-notification" ||
              s.wakeupSource !== undefined ||
              s.keepsDisallowedTools === true),
        )) ||
      undefined,
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
//@ chunk-tyg7f3ek.js:259614-265770 placement
/**
 * print 主循环的轮次分派器：从队列取批次、运行 QueryEngine、处理中断/重跑/结果与 SDK 事件排空。
 */
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
    messageQueue,
    drain,
    prewaitLatch,
    turnOutcome,
    io,
    emit,
    stopping,
    messages,
    engine,
    drainSdkEvents,
    deferredToolUse,
    takeErrorRowBehind,
    inTurnScope,
    onTurnStart,
    onFrame,
    teeFrame,
    plainDeltasNeedOnlyEmit,
    onResult,
    afterTurnFinally,
    pendingMcpServerCount,
  }) {
    this.messageQueue = messageQueue;
    this.drain = drain;
    this.prewaitLatch = prewaitLatch;
    this.turnOutcome = turnOutcome;
    this.io = io;
    this.emit = emit;
    this.stopping = stopping;
    this.messages = messages;
    this.engine = engine;
    this.drainSdkEvents = drainSdkEvents;
    this.deferredToolUse = deferredToolUse;
    this.takeErrorRowBehind = takeErrorRowBehind;
    this.inTurnScope = (ie, Se) => cliError_2(() => inTurnScope(ie, Se));
    this.onTurnStart = onTurnStart;
    this.onFrame = onFrame;
    this.teeFrame = teeFrame;
    this.plainDeltasNeedOnlyEmit = plainDeltasNeedOnlyEmit;
    this.onResult = onResult;
    this.afterTurnFinally = afterTurnFinally;
    this.pendingMcpServerCount = pendingMcpServerCount;
  }
  arm(e) {
    let abortController = createAbortController();
    let r = abortController.abort.bind(abortController);
    abortController.abort = (s) => {
      if (
        this.drain.abortController === abortController &&
        unwrapAbortReason(s) === "remote-cancel" &&
        !(this.drain.sendNowCutTurn && !abortController.signal.aborted)
      )
        this.drain.stopReachedTurn = true;
      r(s);
    };
    this.drain.abortController = abortController;
    this.drain.turnUnderWay = true;
    this.drain.stopReachedTurn = false;
    this.drain.sendNowCutTurn = false;
    this.drain.noteTurnStarted(this.drain.intentBatchInFlight ? e.members : []);
    this.drain.pendingDispatchUuids = [];
    this.drain.pendingDispatchKeys = [];
    if (this.prewaitLatch.consumeAtArm(e.members, this.drain.intentBatchInFlight))
      abortController.abort(userAbortReason("remote-cancel"));
    return abortController;
  }
  async run({ batch, input, tools, intake, turnStartClock, inPlaceOfFirstRequest }) {
    let { command, members } = batch;
    let w = {
      command,
      members,
      input,
      refused: inPlaceOfFirstRequest !== undefined,
    };
    let P = Symbol("headless turn");
    let L;
    let terminalReason;
    let result;
    let G = false;
    let Z = {
      count: 0,
      uuids: new Set(),
    };
    let re = 0;
    await this.inTurnScope(w, async () => {
      let Ae = false;
      let Ue = 0;
      let totalAPIDuration = getTotalAPIDuration();
      let nt = this.messages().length;
      let mcpPendingAtStart = this.pendingMcpServerCount?.();
      let Se = 0;
      let me = 0;
      this.onTurnStart?.(w);
      this.turnOutcome.startTurn(attributionKeyOrUndefined(messageTurnAttributionKey(command)));
      setForegroundTurnBusy(true, P);
      this.messageQueue.setInFlightDrainBatch(members);
      if (this.drain.drainingHandoff?.command === command) this.drain.drainingHandoff.running = true;
      try {
        let Me =
          inPlaceOfFirstRequest === undefined
            ? undefined
            : members.find((member) => member.mode === "prompt" && member.resumeReason !== undefined);
        let turnDispatchInfo = buildTurnDispatchInfo(command, members);
        let He = {
          ...turnDispatchInfo,
          ...(Me !== undefined && {
            ...buildTurnDispatchInfo(Me, [Me]),
            userMessageUuids: turnDispatchInfo.userMessageUuids,
            disallowedTools: turnDispatchInfo.disallowedTools,
            clientDisallowedTools: turnDispatchInfo.clientDisallowedTools,
            keepsDisallowedTools: turnDispatchInfo.keepsDisallowedTools,
          }),
          abortController: this.drain.abortController,
          onCommandTakenIn: (We, St) => this.drain.noteTakenIn(We, St),
          onPromptCheckInterrupted: () => {
            G = true;
          },
          turnStartClock,
          emitPlainDelta:
            this.plainDeltasNeedOnlyEmit === undefined
              ? undefined
              : (We) => {
                  if (!this.plainDeltasNeedOnlyEmit?.()) return false;
                  this.emit(passModelFallback(We));
                  Se++;
                  return true;
                },
          inPlaceOfFirstRequest,
          refusedPromptIsStoredAlready: Me !== undefined,
          errorRowBehindRefusedPrompt:
            Me?.uuid === undefined ? undefined : this.takeErrorRowBehind?.(Me.uuid),
          deferredToolUse:
            command.handedOffTurn !== undefined || inPlaceOfFirstRequest !== undefined
              ? undefined
              : this.deferredToolUse?.(),
        };
        turnStartClock.enter("engine_setup");
        let Xe = this.engine();
        for await (let We of Xe.submitMessage(Me === undefined ? input : Me.value, He)) {
          if (We.type === "system" && We.subtype === "compact_boundary") {
            re++;
            nt = this.messages().length;
          }
          this.onFrame?.(We, w);
          if (this.plainDeltasNeedOnlyEmit !== undefined && isTextOrJsonDeltaEvent(We)) me++;
          if (We.type === "system" && We.subtype === "api_retry") {
            Ae = true;
            Ue = Math.max(Ue, We.error_status ?? 0);
          }
          if (
            We.type === "assistant" &&
            We.parent_tool_use_id === null &&
            We.message.model !== SYNTHETIC_MODEL &&
            We.message.model !== this.lastReportedServedModel
          ) {
            this.lastReportedServedModel = We.message.model;
            this.io.sessionState.notifyMetadataChanged({
              last_served_model: We.message.model,
            });
          }
          if (We.type === "result") {
            this.drain.turnUnderWay = false;
            L = this.drain.abortController?.signal.aborted ?? false;
            intake.noteTurnEnded(L, command, We);
            terminalReason = We.terminal_reason;
            if (G && this.drain.abortController)
              Z = countUnsentBatchMessages({
                batch,
                turnSignal: this.drain.abortController.signal,
                isStopped: this.drain.stopReachedTurn,
                isSentNow: this.drain.sendNowCutTurn,
                conversation: this.messages(),
                messageQueue: this.messageQueue,
              });
            let St = Z.count > 0;
            if (!St) result = We;
            let wt =
              We.subtype === "error_during_execution" && (isAbortedTerminalReason(We.terminal_reason) || L);
            let Lt = We.subtype === "error_during_execution" ? getAutoModeUnavailableStopNotice() : undefined;
            let pn = Lt !== undefined;
            if (this.turnOutcome.turnInFlight) {
              logEvent("tengu_sdk_result", {
                subtype: wt ? lit("terminated") : fromEnum(We.subtype),
                is_error: We.is_error,
                num_turns: We.num_turns,
                duration_ms: We.duration_ms,
                duration_api_ms: getTotalAPIDuration() - totalAPIDuration,
                saw_retry: Ae,
                saw_compact: re > 0,
                retry_status: Ae ? Ue : undefined,
                api_error_status: We.subtype === "success" ? (We.api_error_status ?? undefined) : undefined,
                user_message_uuid: sanitizeMarkName(this.turnOutcome.userMessageUuid),
                ...countMcpToolCallsSince(this.messages(), nt, tools),
                turn_index: this.sdkResultTurnIndex++,
                mcp_pending_at_start: mcpPendingAtStart,
                mcp_pending_at_end: this.pendingMcpServerCount?.(),
                installed_mods: this.turnOutcome.installedModsSeen(),
                ...droppedDebugOutputTotals(),
                ...(this.plainDeltasNeedOnlyEmit !== undefined && {
                  plain_deltas_sent_directly: Se,
                  plain_deltas_sent_normally: me,
                }),
              });
              this.turnOutcome.endTurn();
            }
            if (
              We.is_error &&
              (!wt ||
                pn ||
                (this.io.isRemoteTransport() &&
                  unwrapAbortReason(this.drain.abortController?.signal.reason) === "shutdown"))
            )
              publishFailedSummary(
                this.io.sessionState,
                Lt !== undefined
                  ? minimalUnavailableNotice(Lt)
                  : We.subtype === "success"
                    ? We.result
                    : We.errors[0],
              );
            if (areAttachmentFilesArriving() && !isTerminalShutdown())
              await waitForAttachmentFiles(
                this.drain.abortController?.signal ?? new AbortController().signal,
                {
                  atTurnEnd: true,
                },
              );
            We.queued_turn_count =
              this.drain.endSessionRequested || this.stopping()
                ? 0
                : hasBatchableQueuedPrompt(this.messageQueue);
            for (let Mn of this.drainSdkEvents()) this.emit(Mn);
            let _n = St ? undefined : this.onResult(We, w);
            if (_n !== undefined) await _n;
          } else {
            for (let wt of this.drainSdkEvents()) this.emit(wt);
            let St = passModelFallback(We);
            this.teeFrame?.(St);
            this.emit(St);
          }
        }
      } finally {
        this.drain.turnUnderWay = false;
        setForegroundTurnBusy(false, P);
        if (this.drain.drainingHandoff?.command === command) this.drain.drainingHandoff = undefined;
        this.messageQueue.clearInFlightDrainBatch(members);
        this.messageQueue.settleTaken({
          turnEnded: true,
        });
        this.afterTurnFinally?.(w);
        this.heapCensus.afterTurn();
        this.uploadsCensus.afterTurn();
      }
    });
    return {
      abortedAtResult: L,
      terminalReason,
      result,
      putBack: Z.uuids,
      compactions: re,
    };
  }
}
//@ chunk-tyg7f3ek.js:265770-266188 placement
function countMcpToolCallsSince(e, n, tools) {
  let s = 0;
  let h = 0;
  let y = 0;
  let S = new Set(tools.filter((R) => R.mcpInfo && !R.name.startsWith("mcp__")).map((R) => R.name));
  for (let R = n; R < e.length; R++) {
    let w = e[R];
    if (w?.type !== "assistant") continue;
    for (let P of w.message.content) {
      if (P.type !== "tool_use") continue;
      s++;
      if (P.name.startsWith("mcp__") || S.has(P.name)) h++;
      else if (P.name === TOOL_SEARCH_TOOL_NAME) y++;
    }
  }
  return {
    tool_use_count: s,
    mcp_tool_calls: h,
    toolsearch_calls: y,
    builtin_tool_calls: s - h - y,
  };
}
//@ chunk-tyg7f3ek.js:266188-266540 placement
/**
 * 回合派发常量：最大年龄 24 小时、批量提示 id 长度 64、UUID 正则、续跑载荷 schema（starts/new_frames）与空对象 schema。
 */
var TURN_DISPATCH_CONSTANTS = 10;
var TURN_DISPATCH_MAX_AGE_MS = 86400000;
var MAX_BATCHED_PROMPT_ID_CHARS = 64;
var $0 = Object.freeze({
  waitMs: 5000,
  spentWaitMs: 5000,
  storeWaitMs: 1e4,
  lookMs: 100,
  readSpacingMs: 1000,
  readLostMs: 30000,
});
var UUID_HEX_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
var turnDispatchContinuationSchema = DoctorLazy(() =>
  looseObject({
    starts: array(E().int().nonnegative().max(Number.MAX_SAFE_INTEGER))
      .max(TURN_DISPATCH_CONSTANTS)
      .optional(),
    new_frames: array(string()).optional(),
  }),
);
var emptyObjectSchema = DoctorLazy(() => looseObject({}));
//@ chunk-e6aww6q8.js:554048-554106 placement
function hasBatchableQueuedPrompt(messageQueue) {
  return count(messageQueue.getCommandQueueSnapshot(), canBatchWith);
}
export {
  turnDispatchContinuationSchema,
  MAX_BATCHED_PROMPT_ID_CHARS,
  hasBatchableQueuedPrompt,
  TurnDispatcher,
  isBusyOrClosed,
  isBusy,
  TURN_DISPATCH_CONSTANTS,
  TURN_DISPATCH_MAX_AGE_MS,
  $0,
  emptyObjectSchema,
  UUID_HEX_PATTERN,
};

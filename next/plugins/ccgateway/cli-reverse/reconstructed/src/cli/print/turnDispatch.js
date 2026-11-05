/**
 * cli/print/turnDispatch.ts
 *
 * 2.1.316 新增：无头回合分派器与忙碌判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (7), chunk-5xgkngpb.js (1)
 * attribution: placement 7, layout 1
 */
import { countWhere } from "../../utils/collections.js";
import { isQueuedUserTurnCommand } from "../../utils/messageQueueManager.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { hasTurnAttribution } from "./userFrameIntake.js";
import { isPassiveOrAttachedCommand } from "../../utils/messages/messagePredicates.js";
import { collectDeclaredPollEvents } from "../../utils/pollEvents.js";
import { resolveTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isHumanOriginLoosely, EMAIL_HUMAN } from "../../bridge/inboundMessageOrigin.js";
import { HeadlessHeapCensus, HeadlessUploadsCensus } from "./headlessCensus.js";
import { runInOutermostCallFrame } from "../exit.js";
import { createAbortController, unwrapAbortReason, userAbortReason } from "../../utils/abortController.js";
import { getTotalAPIDuration, getAutoModeUnavailableStopNotice } from "../../bootstrap/state.js";
import { attributionKeyOrUndefined, messageTurnAttributionKey } from "../../utils/turnAttributionKey.js";
import { setForegroundTurnBusy } from "../../utils/plugins/hooksModulesLoadGate.js";
import { passModelFallback, countUnsentBatchMessages } from "./sdkMessageStream.js";
import { isTextOrJsonDeltaEvent } from "../../query/goalCheckIn.js";
import { SYNTHETIC_MODEL } from "../../utils/messages.js";
import { isAbortedTerminalReason } from "../../entrypoints/sdk/coreSchemas.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { droppedDebugOutputTotals } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { publishFailedSummary } from "./sessionResult.js";
import { minimalUnavailableNotice } from "../../utils/permissions/serverClassifier/results.js";
import { areAttachmentFilesArriving, waitForAttachmentFiles } from "../../bridge/attachmentFilesWait.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { DoctorLazy } from "../handlers/util.js";
import { looseObject, array, numberSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:560825-560883 placement
function getQueuedUserTurnCount(messageQueue) {
  return countWhere(messageQueue.getCommandQueueSnapshot(), isQueuedUserTurnCommand);
}
//@ chunk-0yw3taqg.js:284056-284156 placement
function isBusy({ running, runPhase, mainThreadQueueLength }) {
  return (running && runPhase !== "waiting_for_agents") || mainThreadQueueLength > 0;
}
//@ chunk-0yw3taqg.js:284156-284244 placement
function isBusyOrClosed({ running, runPhase, inputClosed }) {
  return (running && runPhase !== "waiting_for_agents") || inputClosed;
}
//@ chunk-0yw3taqg.js:284244-284271 layout
var TENGU_SNUG_PUDDLE = "tengu_snug_puddle";
//@ chunk-0yw3taqg.js:284271-287975 placement
function buildTurnDispatchInfo(command, members) {
  let snugPuddleOn = readFlagWithOverride(TENGU_SNUG_PUDDLE, {
    safe: true,
  });
  let filtered = members
    .flatMap((member) => [
      ...(member.mergedSendUuids ?? []),
      ...(member.uuid !== undefined ? [member.uuid] : []),
    ])
    .filter((uuid) => uuid !== command.uuid);
  return {
    uuid: command.uuid,
    userMessageUuids: members.flatMap((member) => [
      ...(member.isMeta ? [] : (member.mergedSendUuids ?? [])),
      ...(member.sendsOfItsCompactedTurn ?? []),
      ...(hasTurnAttribution(member)
        ? [member.uuid]
        : member.resumedTurnUserMessageUuid !== undefined
          ? [member.resumedTurnUserMessageUuid]
          : []),
    ]),
    mergedSendUuids: filtered.length > 0 ? filtered : undefined,
    alsoLeftToThisReRun: members.find((member) => member.alsoLeftToThisReRun !== undefined)
      ?.alsoLeftToThisReRun,
    resumedTurnOpenerUuid: members.find((member) => member.resumedTurnOpenerVouched === true)
      ?.resumedTurnUserMessageUuid,
    isMeta: command.isMeta,
    resumeReason: members.find((member) => member.resumeReason !== undefined)?.resumeReason,
    uuidIsClientEventUuid:
      (members.findLast((member) => member.uuid) ?? command).turnAttributionKey !== undefined,
    shouldQuery: command.shouldQuery,
    queryHeldForNextTurn: command.queryHeldForNextTurn,
    skipAttachments: isPassiveOrAttachedCommand(command) || undefined,
    pollEventDelivery: command.mode === "poll-event" || undefined,
    pollEventProvenance: command.mode === "poll-event" ? [command.pollEvent?.provenance ?? null] : undefined,
    pollEventDeclared: collectDeclaredPollEvents([command]),
    ...false,
    skipSkillPermissionReset:
      command.mode === "poll-event" || command.pollEmptyDispatch === true || undefined,
    pollEmptyDispatch: command.pollEmptyDispatch === true || undefined,
    skipSubmissionHooks: command.mode === "poll-event" || command.skipSubmissionHooks || undefined,
    inputMode: command.mode === "bash" && command.clientBashCommand === true ? "bash" : undefined,
    clientBashCommandCwd:
      command.mode === "bash" && command.clientBashCommand === true
        ? command.clientBashCommandCwd
        : undefined,
    stopHookActive: command.stopHookActive,
    continuesInterruptedWork: command.continuesInterruptedWork,
    fileAttachments: command.fileAttachments,
    inlinedImagePaths: command.inlinedImagePaths,
    imageFileUuids: command.imageFileUuids,
    savedFiles: members.flatMap((member) => member.savedFiles ?? []),
    withdrawnFileUuids: members.flatMap((member) => member.withdrawnFileUuids ?? []),
    hidePicturesWithNoFileIdBefore: Math.max(
      ...members.map((member) => member.hidePicturesWithNoFileIdBefore ?? 0),
    ),
    picturesToHide: members.findLast((member) => member.picturesToHide)?.picturesToHide,
    stampThreadState: command.stampThreadState,
    namesWidgetViews: command.namesWidgetViews,
    frameTiming: command.frameTiming,
    skipSlashCommands: command.skipSlashCommands,
    bridgeOrigin: command.bridgeOrigin,
    localStdinOrigin: command.localStdinOrigin,
    sessionChannelPersonTyped: command.sessionChannelPersonTyped,
    ultrathinkTyped: command.ultrathinkTyped,
    ownWordUuids: members
      .filter((member) => member.ownWord === true)
      .map((member) => member.uuid ?? member.stopKey),
    hostInitiator: command.hostInitiator,
    inboundOrigin: command.inboundOrigin,
    toolsUsed: command.toolsUsed,
    modelScheduledOrigin: command.modelScheduledOrigin,
    wakeupSource: command.wakeupSource,
    artifactCommentTurn: command.artifactCommentTurn,
    origin: resolveTaskNotificationOrigin(command.origin, command.mode, command.runId),
    clientPlatform: command.clientPlatform,
    disallowedTools: normalizeCaseForComparison_2(members.flatMap((member) => member.disallowedTools ?? [])),
    clientDisallowedTools: members.some((member) => member.replacesDisallowedTools)
      ? normalizeCaseForComparison_2(
          members.flatMap((member) => (member.replacesDisallowedTools ? (member.disallowedTools ?? []) : [])),
        )
      : undefined,
    keepsDisallowedTools:
      (members.length > 0 &&
        members.every(
          (member) =>
            member.replacesDisallowedTools !== true &&
            ((snugPuddleOn &&
              member.inboundOrigin !== undefined &&
              (!isHumanOriginLoosely(member.inboundOrigin) ||
                member.isMeta === true ||
                (member.inboundOrigin === EMAIL_HUMAN && member.emailSenderTurn === undefined))) ||
              (member.disallowedTools === undefined && member.inboundOrigin === undefined)),
        )) ||
      undefined,
    opensOnRoutineFire:
      (!snugPuddleOn &&
        members.length > 0 &&
        members.every((member) => member.opensOnRoutineFire === true)) ||
      undefined,
    carriedOnDisallowedTools: members.some((member) => member.carriedOnDisallowedTools !== undefined)
      ? normalizeCaseForComparison_2(members.flatMap((member) => member.carriedOnDisallowedTools ?? []))
      : undefined,
    verifiedSlackHumanTurn: command.verifiedSlackHumanTurn,
    projectsUserTurn: command.projectsUserTurn,
    emailSenderTurn: command.emailSenderTurn,
    turnEffortCap: members.every((member) => member.turnEffortCap === command.turnEffortCap)
      ? command.turnEffortCap
      : undefined,
    textNotTyped: command.textNotTyped,
    ownFilePaths: command.ownFilePaths,
    noPersonArrived: command.noPersonArrived,
    typedByPerson: command.typedByPerson,
    hearthRelayRows: command.hearthRelayRows,
    hearthRelayThreadTs: command.hearthRelayThreadTs,
    hearthRelayMessageIds: command.hearthRelayMessageIds,
    taskDelivery: command.taskDelivery,
    orphanedPermission: command.orphanedPermission,
    handedOffTurn: command.handedOffTurn,
    handedOffTurnUserMessageUuids: command.handedOffTurnUserMessageUuids,
  };
}
//@ chunk-0yw3taqg.js:287975-294901 placement
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
  writePlainDeltaNow;
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
    writePlainDeltaNow,
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
    this.inTurnScope = (command, batch) => runInOutermostCallFrame(() => inTurnScope(command, batch));
    this.onTurnStart = onTurnStart;
    this.onFrame = onFrame;
    this.teeFrame = teeFrame;
    this.plainDeltasNeedOnlyEmit = plainDeltasNeedOnlyEmit;
    this.writePlainDeltaNow = writePlainDeltaNow;
    this.onResult = onResult;
    this.afterTurnFinally = afterTurnFinally;
    this.pendingMcpServerCount = pendingMcpServerCount;
  }
  arm(batch) {
    let abortController = createAbortController();
    let abort = abortController.abort.bind(abortController);
    abortController.abort = (reason) => {
      if (
        this.drain.abortController === abortController &&
        unwrapAbortReason(reason) === "remote-cancel" &&
        !(this.drain.sendNowCutTurn && !abortController.signal.aborted)
      )
        this.drain.stopReachedTurn = true;
      abort(reason);
    };
    this.drain.abortController = abortController;
    this.drain.turnUnderWay = true;
    this.drain.stopReachedTurn = false;
    this.drain.sendNowCutTurn = false;
    this.drain.noteTurnStarted(this.drain.intentBatchInFlight ? batch.members : []);
    this.drain.pendingDispatchUuids = [];
    this.drain.pendingDispatchKeys = [];
    if (this.prewaitLatch.consumeAtArm(batch.members, this.drain.intentBatchInFlight))
      abortController.abort(userAbortReason("remote-cancel"));
    return abortController;
  }
  async run({ batch, input, tools, intake, turnStartClock, inPlaceOfFirstRequest }) {
    let { command, members } = batch;
    let context = {
      command,
      members,
      input,
      refused: inPlaceOfFirstRequest !== undefined,
    };
    let busyToken = Symbol("headless turn");
    let aborted;
    let terminalReason;
    let result;
    let promptCheckCut = false;
    let putBack = {
      count: 0,
      uuids: new Set(),
    };
    let compactions = 0;
    let plainDeltasSentDirectly = 0;
    let plainDeltasNormal = 0;
    let plainDeltasWrittenNow = 0;
    let plainDeltasTakenAtSource = 0;
    await this.inTurnScope(context, async () => {
      let sawRetry = false;
      let retryStatus = 0;
      let totalAPIDuration = getTotalAPIDuration();
      let startLength = this.messages().length;
      let mcpPendingAtStart = this.pendingMcpServerCount?.();
      this.onTurnStart?.(context);
      this.turnOutcome.startTurn(attributionKeyOrUndefined(messageTurnAttributionKey(command)));
      setForegroundTurnBusy(true, busyToken);
      this.messageQueue.setInFlightDrainBatch(members);
      if (this.drain.drainingHandoff?.command === command) this.drain.drainingHandoff.running = true;
      try {
        let refusedPrompt =
          inPlaceOfFirstRequest === undefined
            ? undefined
            : members.find((member) => member.mode === "prompt" && member.resumeReason !== undefined);
        let turnDispatchInfo = buildTurnDispatchInfo(command, members);
        let picturesToHide = this.io.sessionState.picturesToHide;
        let submitInfo = {
          ...turnDispatchInfo,
          ...(refusedPrompt !== undefined && {
            ...buildTurnDispatchInfo(refusedPrompt, [refusedPrompt]),
            userMessageUuids: turnDispatchInfo.userMessageUuids,
            disallowedTools: turnDispatchInfo.disallowedTools,
            clientDisallowedTools: turnDispatchInfo.clientDisallowedTools,
            keepsDisallowedTools: turnDispatchInfo.keepsDisallowedTools,
            opensOnRoutineFire: turnDispatchInfo.opensOnRoutineFire,
            carriedOnDisallowedTools: turnDispatchInfo.carriedOnDisallowedTools,
          }),
          withdrawnFileUuids: normalizeCaseForComparison_2([
            ...(picturesToHide?.fileUuids ?? []),
            ...(turnDispatchInfo.withdrawnFileUuids ?? []),
          ]),
          hidePicturesWithNoFileIdBefore: Math.max(
            picturesToHide?.hideBefore ?? 0,
            turnDispatchInfo.hidePicturesWithNoFileIdBefore ?? 0,
          ),
          abortController: this.drain.abortController,
          onCommandTakenIn: (uuid, answersClient) => this.drain.noteTakenIn(uuid, answersClient),
          onPromptCheckInterrupted: () => {
            promptCheckCut = true;
          },
          turnStartClock,
          emitPlainDelta:
            this.plainDeltasNeedOnlyEmit === undefined
              ? undefined
              : (message, resumedMember) => {
                  if (!this.plainDeltasNeedOnlyEmit?.()) return false;
                  let plainDelta = passModelFallback(message);
                  if (this.writePlainDeltaNow?.(plainDelta)) plainDeltasWrittenNow++;
                  else this.emit(plainDelta);
                  plainDeltasSentDirectly++;
                  if (resumedMember) plainDeltasTakenAtSource++;
                  return true;
                },
          inPlaceOfFirstRequest,
          refusedPromptIsStoredAlready: refusedPrompt !== undefined,
          errorRowBehindRefusedPrompt:
            refusedPrompt?.uuid === undefined ? undefined : this.takeErrorRowBehind?.(refusedPrompt.uuid),
          deferredToolUse:
            command.handedOffTurn !== undefined || inPlaceOfFirstRequest !== undefined
              ? undefined
              : this.deferredToolUse?.(),
        };
        turnStartClock.enter("engine_setup");
        let engine = this.engine();
        for await (let frame of engine.submitMessage(
          refusedPrompt === undefined ? input : refusedPrompt.value,
          submitInfo,
        )) {
          if (frame.type === "system" && frame.subtype === "compact_boundary") {
            compactions++;
            startLength = this.messages().length;
          }
          this.onFrame?.(frame, context);
          if (this.plainDeltasNeedOnlyEmit !== undefined && isTextOrJsonDeltaEvent(frame))
            plainDeltasNormal++;
          if (frame.type === "system" && frame.subtype === "api_retry") {
            sawRetry = true;
            retryStatus = Math.max(retryStatus, frame.error_status ?? 0);
          }
          if (
            frame.type === "assistant" &&
            frame.parent_tool_use_id === null &&
            frame.message.model !== SYNTHETIC_MODEL &&
            frame.message.model !== this.lastReportedServedModel
          ) {
            this.lastReportedServedModel = frame.message.model;
            this.io.sessionState.notifyMetadataChanged({
              last_served_model: frame.message.model,
            });
          }
          if (frame.type === "result") {
            this.drain.turnUnderWay = false;
            this.drain.lastResultAt = performance.now();
            aborted = this.drain.abortController?.signal.aborted ?? false;
            intake.noteTurnEnded(aborted, command, frame);
            terminalReason = frame.terminal_reason;
            if (promptCheckCut && this.drain.abortController)
              putBack = countUnsentBatchMessages({
                batch,
                turnSignal: this.drain.abortController.signal,
                isStopped: this.drain.stopReachedTurn,
                isSentNow: this.drain.sendNowCutTurn,
                conversation: this.messages(),
                messageQueue: this.messageQueue,
              });
            let hasPutBack = putBack.count > 0;
            if (!hasPutBack) result = frame;
            let terminated =
              frame.subtype === "error_during_execution" &&
              (isAbortedTerminalReason(frame.terminal_reason) || aborted);
            let stopNotice =
              frame.subtype === "error_during_execution" ? getAutoModeUnavailableStopNotice() : undefined;
            let hasStopNotice = stopNotice !== undefined;
            if (this.turnOutcome.turnInFlight) {
              logEvent("tengu_sdk_result", {
                subtype: terminated ? lit("terminated") : fromEnum(frame.subtype),
                is_error: frame.is_error,
                num_turns: frame.num_turns,
                duration_ms: frame.duration_ms,
                duration_api_ms: getTotalAPIDuration() - totalAPIDuration,
                saw_retry: sawRetry,
                saw_compact: compactions > 0,
                retry_status: sawRetry ? retryStatus : undefined,
                api_error_status:
                  frame.subtype === "success" ? (frame.api_error_status ?? undefined) : undefined,
                user_message_uuid: sanitizeMarkName(this.turnOutcome.userMessageUuid),
                ...countMcpToolCallsSince(this.messages(), startLength, tools),
                turn_index: this.sdkResultTurnIndex++,
                mcp_pending_at_start: mcpPendingAtStart,
                mcp_pending_at_end: this.pendingMcpServerCount?.(),
                installed_mods: this.turnOutcome.installedModsSeen(),
                ...droppedDebugOutputTotals(),
                ...(this.plainDeltasNeedOnlyEmit !== undefined && {
                  plain_deltas_sent_directly: plainDeltasSentDirectly,
                  plain_deltas_sent_normally: plainDeltasNormal,
                }),
                ...(this.writePlainDeltaNow !== undefined && {
                  plain_deltas_written_now: plainDeltasWrittenNow,
                }),
                ...(this.plainDeltasNeedOnlyEmit !== undefined &&
                  env.CLAUDE_CODE_PLAIN_DELTA_TAKE_AT_SOURCE && {
                    plain_deltas_taken_at_source: plainDeltasTakenAtSource,
                  }),
              });
              this.turnOutcome.endTurn();
            }
            if (
              frame.is_error &&
              (!terminated ||
                hasStopNotice ||
                (this.io.isRemoteTransport() &&
                  unwrapAbortReason(this.drain.abortController?.signal.reason) === "shutdown"))
            )
              publishFailedSummary(
                this.io.sessionState,
                stopNotice !== undefined
                  ? minimalUnavailableNotice(stopNotice)
                  : frame.subtype === "success"
                    ? frame.result
                    : frame.errors[0],
              );
            if (areAttachmentFilesArriving() && !isTerminalShutdown())
              await waitForAttachmentFiles(
                this.drain.abortController?.signal ?? new AbortController().signal,
                {
                  atTurnEnd: true,
                },
              );
            frame.queued_turn_count =
              this.drain.endSessionRequested || this.stopping()
                ? 0
                : getQueuedUserTurnCount(this.messageQueue);
            for (let event of this.drainSdkEvents()) this.emit(event);
            let pending = hasPutBack ? undefined : this.onResult(frame, context);
            if (pending !== undefined) await pending;
          } else {
            for (let event of this.drainSdkEvents()) this.emit(event);
            let outFrame = passModelFallback(frame);
            this.teeFrame?.(outFrame);
            this.emit(outFrame);
          }
        }
      } finally {
        this.drain.turnUnderWay = false;
        setForegroundTurnBusy(false, busyToken);
        if (this.drain.drainingHandoff?.command === command) this.drain.drainingHandoff = undefined;
        this.messageQueue.clearInFlightDrainBatch(members);
        this.messageQueue.settleTaken({
          turnEnded: true,
        });
        this.afterTurnFinally?.(context);
        this.heapCensus.afterTurn();
        this.uploadsCensus.afterTurn();
      }
    });
    return {
      abortedAtResult: aborted,
      terminalReason,
      result,
      putBack: putBack.uuids,
      compactions,
      ...(this.plainDeltasNeedOnlyEmit !== undefined && {
        plainDeltas: {
          sentDirectly: plainDeltasSentDirectly,
          sentNormally: plainDeltasNormal,
        },
      }),
    };
  }
}
//@ chunk-0yw3taqg.js:294901-295319 placement
function countMcpToolCallsSince(messages, start, tools) {
  let toolUseCount = 0;
  let mcpCalls = 0;
  let toolSearchCalls = 0;
  let mcpNames = new Set(
    tools.filter((tool) => tool.mcpInfo && !tool.name.startsWith("mcp__")).map((tool) => tool.name),
  );
  for (let index = start; index < messages.length; index++) {
    let row = messages[index];
    if (row?.type !== "assistant") continue;
    for (let block of row.message.content) {
      if (block.type !== "tool_use") continue;
      toolUseCount++;
      if (block.name.startsWith("mcp__") || mcpNames.has(block.name)) mcpCalls++;
      else if (block.name === TOOL_SEARCH_TOOL_NAME) toolSearchCalls++;
    }
  }
  return {
    tool_use_count: toolUseCount,
    mcp_tool_calls: mcpCalls,
    toolsearch_calls: toolSearchCalls,
    builtin_tool_calls: toolUseCount - mcpCalls - toolSearchCalls,
  };
}
//@ chunk-0yw3taqg.js:295319-295671 placement
/**
 * 回合派发常量：最大年龄 24 小时、批量提示 id 长度 64、UUID 正则、续跑载荷 schema（starts/new_frames）与空对象 schema。
 */
var TURN_DISPATCH_CONSTANTS; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TURN_DISPATCH_MAX_AGE_MS;
var MAX_BATCHED_PROMPT_ID_CHARS;
var TURN_DISPATCH_WAITS;
var UUID_HEX_PATTERN;
var turnDispatchContinuationSchema;
var emptyObjectSchema;
deferInit("chunk-0yw3taqg.js:295319", () => {
  TURN_DISPATCH_CONSTANTS = 10;
  TURN_DISPATCH_MAX_AGE_MS = 86400000;
  MAX_BATCHED_PROMPT_ID_CHARS = 64;
  TURN_DISPATCH_WAITS = Object.freeze({
    waitMs: 5000,
    spentWaitMs: 5000,
    storeWaitMs: 1e4,
    lookMs: 100,
    readSpacingMs: 1000,
    readLostMs: 30000,
  });
  UUID_HEX_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  turnDispatchContinuationSchema = DoctorLazy(() =>
    looseObject({
      starts: array(numberSchema().int().nonnegative().max(Number.MAX_SAFE_INTEGER))
        .max(TURN_DISPATCH_CONSTANTS)
        .optional(),
      new_frames: array(stringSchema()).optional(),
    }),
  );
  emptyObjectSchema = DoctorLazy(() => looseObject({}));
});
export {
  getQueuedUserTurnCount,
  TurnDispatcher,
  isBusyOrClosed,
  isBusy,
  turnDispatchContinuationSchema,
  MAX_BATCHED_PROMPT_ID_CHARS,
  TURN_DISPATCH_CONSTANTS,
  TURN_DISPATCH_MAX_AGE_MS,
  TURN_DISPATCH_WAITS,
  emptyObjectSchema,
  UUID_HEX_PATTERN,
};

/**
 * cli/print/parkedPrompts.ts
 *
 * 2.1.316 新增：停放（parked）权限提示的控制器、恢复与过期取消
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (12)
 * attribution: placement 12
 */
import { randomUUID } from "crypto";
import { isHumanTurn, isHumanOrigin } from "../../utils/turnOrigin.js";
import {
  singlePendingAction,
  reattachInterruptedPrompt,
  pendingActionRequestIds,
  classifyPendingAction,
  pendingActionResumeHint,
  isDialogToolName,
  reconcilePendingActions,
  isPassiveCommand,
  PermissionCardAsk,
  isPermissionCardHoldEnabled,
} from "./wakeRouter.js";
import { logForDebugging } from "../../utils/debug.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { getSessionId, mainAgentId } from "../../bootstrap/state.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  REJECT_MESSAGE,
  APPROVAL_UNANSWERED_MESSAGE,
  APPROVAL_EXPIRED_MESSAGE,
  createUserMessage,
  createUserInterruptionMessage,
} from "../../utils/messages.js";
import { shortHash } from "../../utils/shortHash.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { chatOriginField } from "./transcriptLeaves.js";
import { isHeldMessageRecognitionOn, heldMessageUuids } from "./queuedMessageUtils.js";
import {
  isMainAgentCommand,
  normalizedQueueOrigin,
  shouldSkipQueueAttachments,
  queueInputFlags,
} from "../../utils/messageQueueManager.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { isAimedAtTurn } from "./runEndReasons.js";
import { SYNC_ANSWER_TTL_MS } from "../../services/remoteTools/shellForwarding.js";
import { logError } from "../../utils/log.js";
import { resumeReasonFromEnv, resumeInterruptedTurn } from "../../utils/conversationRecovery.js";
import { relayTurnFlags } from "../../services/projectsRelay/relayConfig.js";
import { wakeupSourceField } from "../../utils/cronFireTexts.js";
import { isRemoteToolForwardingSwitchOn } from "../../services/remoteTools/servingGates.js";
import { withDeadline } from "../../utils/sleep.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { errorMessage } from "../../utils/errors.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_CANDID_JUNIPER } from "../../services/api/withRetry.js";
import { canBatchWith, handleOrphanedPermissionResponse } from "../print.js";
import { isTaskIdOfType } from "../../Task.js";
import { isMcpTasksEnabled } from "../../services/mcp/mcpTaskWorker.js";
import { flagKey, permissionResponseTelemetry } from "../structuredIOProtocol.js";
import { deviceCallsBehindCard } from "../../utils/remoteTools/restartNotices.js";
import { MARKETPLACE_ONLY_MANIFEST_FIELDS } from "../../utils/plugins/validatePlugin.js";
import { setLateAllowDecision, takeLateAllowDecision } from "../../bridge/mcpApprovalTickets.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:327185-327458 placement
function userMessagePlatformFields(messages, turnInterruption) {
  let message =
    turnInterruption === undefined
      ? undefined
      : messages.findLast((message) => message.uuid === turnInterruption);
  if (message?.type !== "user") return {};
  return {
    ...(typeof message.clientPlatform === "string" && {
      clientPlatform: message.clientPlatform,
    }),
    ...(typeof message.turnAttributionKey === "string" && {
      inheritedTurnAttributionKey: message.turnAttributionKey,
    }),
  };
}
//@ chunk-tyg7f3ek.js:327458-327742 placement
function findParkedPromptOpener({ park, openerUuid, conversation }) {
  if (park === undefined || typeof park.details?.tool_name !== "string" || openerUuid === undefined) return;
  let found = conversation.find((message) => message.type === "user" && message.uuid === openerUuid);
  if (found === undefined || !isHumanTurn(found)) return;
  let timestamp = Date.parse(found.timestamp);
  return Number.isFinite(timestamp)
    ? {
        uuid: openerUuid,
        openedAtMs: timestamp,
      }
    : undefined;
}
//@ chunk-tyg7f3ek.js:327742-329149 placement
/**
 * 恢复会话时还原上一个 worker 挂起的权限提示（parked prompt），判断是否可接管其工具调用。
 */
async function restoreParkedPrompt({
  restored,
  turnInterruptionState,
  chain,
  supersededToolUseIds,
  supersededToolNames,
  journaled,
  tools,
  findUnresolved,
  lane,
}) {
  let interruption = journaled !== undefined ? journaled.turnInterruptionState : turnInterruptionState;
  let offChainNames = journaled?.offChainToolNames ?? new Map();
  let pendingToolUseId = singlePendingAction(restored);
  let offChainName = pendingToolUseId !== undefined ? offChainNames.get(pendingToolUseId) : undefined;
  let reattach =
    offChainName !== undefined
      ? {
          supersededToolUseIds,
          supersededToolNames,
          reattached: false,
        }
      : await reattachInterruptedPrompt(
          restored,
          turnInterruptionState,
          chain,
          supersededToolUseIds,
          supersededToolNames,
          findUnresolved,
          lane,
        );
  if (reattach.reattached)
    logForDebugging(
      `[print.ts] restored parked prompt's tool_use ${restored?.external?.pending_action?.tool_use_id} is off the resume chain but unresolved in the transcript \u2014 treating it as the interrupted turn's`,
    );
  let supersededIds =
    offChainNames.size > 0
      ? new Set([...(reattach.supersededToolUseIds ?? []), ...offChainNames.keys()])
      : reattach.supersededToolUseIds;
  let supersededToolNames_2 =
    offChainNames.size > 0
      ? new Map([...(reattach.supersededToolNames ?? []), ...offChainNames])
      : reattach.supersededToolNames;
  let namesWrongTool = offChainName !== undefined && !isPendingActionForTool(restored, offChainName);
  if (namesWrongTool)
    logForDebugging(
      `[print.ts] restored parked prompt does not name the tool of the journaled off-chain call ${pendingToolUseId} it points at: not parking on it`,
      {
        level: "warn",
      },
    );
  let keptIds = namesWrongTool
    ? new Set([...(supersededIds ?? [])].filter((id) => id !== pendingToolUseId))
    : supersededIds;
  let supersededToolNames_3 = reattach.supersededToolNames;
  let keepRequestIds = pendingActionRequestIds(restored, supersededIds, tools);
  let pendingActionClass = reattach.reattached
    ? "derivable_off_chain"
    : classifyPendingAction(restored, keptIds, supersededToolNames_3, keepRequestIds);
  let parkedPermission = pendingActionResumeHint(restored, interruption, keptIds, lane);
  let supersededNames = [...(supersededToolNames_3?.values() ?? [])];
  return {
    parkedPermission,
    supersededToolUseIds: supersededIds,
    supersededToolNames: supersededToolNames_2,
    keepRequestIds,
    pendingActionClass,
    interruptedTurn: {
      wasInterrupted:
        (interruption !== undefined && interruption.kind !== "none") || (supersededIds?.size ?? 0) > 0,
      unresolvedToolUseIds: supersededIds,
      nestingCall: supersededNames.some((name) => name === AGENT || name === TASK)
        ? "agent"
        : supersededNames.some(isDialogToolName)
          ? "skill_or_repl"
          : "none",
    },
  };
}
//@ chunk-tyg7f3ek.js:329149-329847 placement
function cancelStaleParkedPrompt(
  headlessIO,
  restored,
  { parkedPermission, keepRequestIds, interruptedTurn, reportKept },
) {
  if (parkedPermission)
    logForDebugging(
      `[print.ts] deferring stale parked prompt cancel for ${parkedPermission.request_id} \u2014 a persisted control_response may arrive via SSE catch-up`,
    );
  try {
    let result = reconcilePendingActions(headlessIO, restored, {
      exceptRequestId: parkedPermission?.request_id,
      keepRequestIds,
      interruptedTurn,
    });
    if (reportKept)
      headlessIO
        .write({
          type: "system",
          subtype: "inherited_asks_settled",
          kept_request_ids: [...(parkedPermission ? [parkedPermission.request_id] : []), ...keepRequestIds],
          uuid: randomUUID(),
          session_id: getSessionId(),
        })
        .catch((error) => {
          logForDebugging(`[print.ts] inherited_asks_settled write failed: ${error}`, {
            level: "error",
          });
          logFeatureBad("ccr_input_held_behind_prompt", "report_write_failed");
        });
    return result;
  } catch (error) {
    logForDebugging(`[print.ts] stale parked prompt cancel failed: ${error}`, {
      level: "error",
    });
    return new Set();
  }
}
//@ chunk-tyg7f3ek.js:329847-329998 placement
function setAsideCallsTelemetry(supersededToolUseIds, toolUseId) {
  let ids = [...(supersededToolUseIds ?? [])];
  let index = ids.indexOf(toolUseId);
  return index === -1
    ? {
        set_aside_calls: ids.length,
      }
    : {
        set_aside_calls: ids.length - 1,
        set_aside_calls_behind_prompt: index,
      };
}
//@ chunk-tyg7f3ek.js:329998-330065 placement
function isPendingActionForTool(state, toolName) {
  return state?.external?.pending_action?.tool_name === toolName;
}
//@ chunk-tyg7f3ek.js:330065-330272 placement
var PARKED_PROMPT_CONSTANTS = 3000;
var TENGU_WILD_BEACON = "tengu_wild_beacon";
var MAX_PARKED_ANSWER_AGE_MS = 180000;
var UNMATCHED_PERMISSION_ANSWER_TEXT =
  "This tool call was refused and did not run: the permission answer for it could not be matched to this call. Do not run it again unless the user asks you to.";
//@ chunk-tyg7f3ek.js:330272-330334 placement
function unmatchedAnswerDenial(toolUseID) {
  return {
    behavior: "deny",
    message: UNMATCHED_PERMISSION_ANSWER_TEXT,
    toolUseID,
  };
}
//@ chunk-tyg7f3ek.js:330334-330505 placement
var PERMISSION_ANSWER_WAIT_MS; // deferred: uses REJECT_MESSAGE (../../utils/messages.js) of its import cycle while loading; runs once the cycle is complete
var ANSWER_WAIT_END_OUTCOMES;
deferInit("chunk-tyg7f3ek.js:330334", () => {
  PERMISSION_ANSWER_WAIT_MS = 7000;
  ANSWER_WAIT_END_OUTCOMES = {
    interrupt: {
      content: REJECT_MESSAGE,
      toolDenialKind: "user-rejected",
    },
    new_input: {
      content: APPROVAL_UNANSWERED_MESSAGE,
      toolDenialKind: "cancelled",
    },
    timeout: {
      content: APPROVAL_EXPIRED_MESSAGE,
      toolDenialKind: "cancelled",
    },
  };
});
//@ chunk-tyg7f3ek.js:330505-375915 placement
/**
 * headless/CCR 会话中挂起权限请求的总控：恢复、接管上一 worker 的在途调用、继承已决请求、超时撤销与重新询问。
 */
class ParkedPermissionController {
  deferredParkedPermissionRescue;
  carriesTheCutOffTurnOn = false;
  aCopyAwaitsTheCutOffTurn = false;
  cutOffTurnGivenUp = false;
  cutOffTurnLeftToTheNextWorker = false;
  parkedPermissionRetirement;
  parkedPermissionFallbackTimer;
  parkedPermissionHeld = false;
  registrationKeepsPendingAction;
  parkedPermissionWaitStart = Date.now();
  parkedPermissionFallbackFiredAt;
  parkSiblings = [];
  parkOwnAdoptedCall;
  parkSettledAtBoot = false;
  inheritedAsk;
  keptSubagentAsk;
  holdOpenFor;
  interruptedTurnsPrompt;
  fromInterruptedTurnsPrompt;
  parkAnswer = "none";
  parkAnswerDequeue = 0;
  holdRevoked = false;
  everHeldMessage = false;
  heldAtShutdown;
  handledOrphanedToolUseIds = new Set();
  parkedPromptEventFields;
  parkedPermission;
  turnInterruptionState;
  supersededToolUseIds;
  bootRetiredToolUseIds;
  answeredToolUseIds;
  initParkReport;
  pendingActionClass;
  cutOffAgentCalls;
  resumedAgentCalls;
  servedCallsToAdopt;
  servedCallsNeverSent;
  journaledServedCalls;
  withdrawCard;
  retirementWriter;
  endStoppedTurn;
  onStrictAnswerDropped;
  inputWaitsForAnswer;
  stopSettlingPromise;
  stopRetirementDue;
  clearBeforeRun;
  deniedButUnread = new Set();
  unreadDenyRetires = false;
  receivedAnswersRead;
  answerClearing = false;
  promptEnded;
  promptEndSignal = Promise.withResolvers();
  letHeldCommandsGo;
  answerOnItsWayUntil;
  flagAtLastWaitCheck;
  drainWaitedForAnswer = false;
  newInputWasAFrame;
  asAnswerCameIn;
  session;
  answers;
  lane;
  io;
  drain;
  messageQueue;
  declinedRedeliveries;
  store;
  kick;
  isShuttingDown;
  isTerminalShutdown;
  findUnresolvedToolUse;
  markAnswer;
  reportInheritedPromptDecided;
  reportIdleAtTurnEndAllowed;
  dropLoaderSyntheticRows;
  removeInterruptedMessage;
  putAheadOfLoaderRows;
  sendsTheInterruptedTurnHolds;
  sendsOfTheCompactedTurn;
  sendsTheParkedTurnTookIn;
  readSendsLeftToTheCardsTurn;
  sendsLeftToTheCardsTurn = new Set();
  leftToTheCardsTurnReadLate = false;
  sendsOfTheCardsCompactedTurn;
  sendsTheRescueWouldAnswer = new Set();
  sendsLeftToReRun = new Set();
  reRunToEnd;
  adoptedServedCallsCommand;
  lostCallsNote;
  inFlightServedCalls;
  presentAdoptedHostTools;
  servedElsewhere;
  constructor({
    session,
    parkedPermission,
    holdOpenFor,
    turnInterruptionState,
    interruptedTurnsPrompt,
    fromInterruptedTurnsPrompt = {},
    supersededToolUseIds,
    bootRetiredToolUseIds,
    answeredToolUseIds,
    initParkReport,
    pendingActionClass,
    cutOffAgentCalls,
    resumedAgentCalls,
    keptSubagentAsk,
    servedCallsToAdopt,
    servedCallsNeverSent,
    journaledServedCalls,
    withdrawCard,
    retirementWriter,
    endStoppedTurn,
    onStrictAnswerDropped,
    inputWaitsForAnswer = () => false,
    clearBeforeRun,
    receivedAnswersRead = () => {
      return;
    },
    answers,
    lane,
    io,
    drain,
    messageQueue,
    declinedRedeliveries,
    store,
    kick,
    isShuttingDown,
    isTerminalShutdown,
    findUnresolvedToolUse,
    markAnswer,
    reportInheritedPromptDecided,
    reportIdleAtTurnEndAllowed,
    dropLoaderSyntheticRows,
    removeInterruptedMessage,
    putAheadOfLoaderRows,
    sendsTheInterruptedTurnHolds = () => new Set(),
    sendsOfTheCompactedTurn = () => {
      return;
    },
    sendsTheParkedTurnTookIn = () => () => new Set(),
    adoptedServedCallsCommand,
    lostCallsNote = () => {
      return;
    },
    inFlightServedCalls,
    presentAdoptedHostTools,
    servedElsewhere,
  }) {
    this.session = session;
    this.parkedPermission = parkedPermission;
    this.holdOpenFor = holdOpenFor;
    this.turnInterruptionState = turnInterruptionState;
    this.interruptedTurnsPrompt = interruptedTurnsPrompt;
    this.fromInterruptedTurnsPrompt = fromInterruptedTurnsPrompt;
    this.supersededToolUseIds = supersededToolUseIds;
    this.bootRetiredToolUseIds = bootRetiredToolUseIds;
    this.answeredToolUseIds = answeredToolUseIds;
    this.initParkReport = initParkReport;
    this.pendingActionClass = pendingActionClass;
    this.cutOffAgentCalls = cutOffAgentCalls;
    this.resumedAgentCalls = resumedAgentCalls;
    this.keptSubagentAsk = keptSubagentAsk;
    this.inheritedAsk = keptSubagentAsk?.ask;
    this.servedCallsToAdopt = servedCallsToAdopt;
    this.servedCallsNeverSent = servedCallsNeverSent;
    this.journaledServedCalls = journaledServedCalls;
    this.withdrawCard = withdrawCard;
    this.retirementWriter = retirementWriter;
    this.endStoppedTurn = endStoppedTurn;
    this.onStrictAnswerDropped = onStrictAnswerDropped;
    this.inputWaitsForAnswer = inputWaitsForAnswer;
    this.clearBeforeRun = clearBeforeRun;
    this.receivedAnswersRead = receivedAnswersRead;
    this.answers = answers;
    this.lane = lane;
    this.io = io;
    this.drain = drain;
    this.messageQueue = messageQueue;
    this.declinedRedeliveries = declinedRedeliveries;
    this.store = store;
    this.kick = kick;
    this.isShuttingDown = isShuttingDown;
    this.isTerminalShutdown = isTerminalShutdown;
    this.findUnresolvedToolUse = findUnresolvedToolUse;
    this.markAnswer = markAnswer;
    this.reportInheritedPromptDecided = reportInheritedPromptDecided;
    this.reportIdleAtTurnEndAllowed = reportIdleAtTurnEndAllowed;
    this.dropLoaderSyntheticRows = dropLoaderSyntheticRows;
    this.removeInterruptedMessage = removeInterruptedMessage;
    this.putAheadOfLoaderRows = putAheadOfLoaderRows;
    this.sendsTheInterruptedTurnHolds = sendsTheInterruptedTurnHolds;
    this.sendsOfTheCompactedTurn = sendsOfTheCompactedTurn;
    this.sendsTheParkedTurnTookIn = sendsTheParkedTurnTookIn;
    this.adoptedServedCallsCommand = adoptedServedCallsCommand;
    this.lostCallsNote = lostCallsNote;
    this.inFlightServedCalls = inFlightServedCalls;
    this.presentAdoptedHostTools = presentAdoptedHostTools;
    this.servedElsewhere = servedElsewhere;
    this.registrationKeepsPendingAction = initParkReport !== undefined;
    this.io.sessionState.heldRequiresAction = () =>
      this.drain.running && this.drain.runPhase !== "waiting_for_agents"
        ? undefined
        : this.heldCardToReassert();
    this.parkedPromptEventFields = this.parkedPermission
      ? {
          parked_tool_use_sha12: shortHash(this.parkedPermission.tool_use_id),
          parked_request_sha12: shortHash(this.parkedPermission.request_id),
        }
      : {};
  }
  get retirement() {
    return this.parkedPermissionRetirement;
  }
  get stopSettling() {
    return this.stopSettlingPromise;
  }
  get stopRetirementOwed() {
    return this.stopRetirementDue !== undefined;
  }
  get handledToolUseIds() {
    return this.handledOrphanedToolUseIds;
  }
  holdingParkedPermission() {
    return this.parkedPermissionHeld && this.deferredParkedPermissionRescue !== undefined;
  }
  inheritedPromptEndedBy() {
    return this.promptEnded?.by;
  }
  drainWaitedForInheritedAnswer() {
    return this.drainWaitedForAnswer;
  }
  hasCarriedTheCutOffTurnOn() {
    return (
      this.carriesTheCutOffTurnOn && (!this.inheritedPromptPending() || this.inheritedPromptHoldCapable())
    );
  }
  rescueGaveWay() {
    this.carriesTheCutOffTurnOn = false;
    this.declinedRedeliveries.runWhatNoRowVouchesFor();
    let cancelled = this.reRunToEnd === undefined ? [] : this.noteCancelledInTheQueue([this.reRunToEnd.uuid]);
    if (cancelled.length > 0)
      logForDiagnosticsNoPII("info", "cli_rerun_gave_way_its_messages_cancelled", {
        count: cancelled.length,
        ...chatOriginField(),
      });
    return cancelled.length;
  }
  noteCopyAwaitsTheCutOffTurn() {
    this.aCopyAwaitsTheCutOffTurn = true;
  }
  cardsTurnTookIn(uuid) {
    if (!this.hasCarriedTheCutOffTurnOn() || !this.leftToTheCardsTurn().has(uuid)) return false;
    this.noteCopyAwaitsTheCutOffTurn();
    return true;
  }
  leftToTheCardsTurnWasReadLate() {
    return this.leftToTheCardsTurnReadLate;
  }
  leftToTheCardsTurn(late = false) {
    let readSendsLeftToTheCardsTurn = this.readSendsLeftToTheCardsTurn;
    if (readSendsLeftToTheCardsTurn === undefined || !isHeldMessageRecognitionOn())
      return this.sendsLeftToTheCardsTurn;
    this.readSendsLeftToTheCardsTurn = undefined;
    this.sendsLeftToTheCardsTurn = readSendsLeftToTheCardsTurn();
    this.leftToTheCardsTurnReadLate = !late;
    if (this.sendsLeftToTheCardsTurn.size > 0) {
      if (this.inheritedPromptPending()) this.drain.noteStoredTurnTookIn([...this.sendsLeftToTheCardsTurn]);
      logForDiagnosticsNoPII("info", "cli_messages_left_to_inherited_prompt", {
        count: this.sendsLeftToTheCardsTurn.size,
        read_after_start_up: this.leftToTheCardsTurnReadLate,
        ...chatOriginField(),
      });
    }
    return this.sendsLeftToTheCardsTurn;
  }
  cutOffTurnIsStillOwed() {
    return (
      this.rescueOwnsReRun() ||
      this.cutOffTurnLeftToTheNextWorker ||
      (!this.cutOffTurnGivenUp &&
        this.messageQueue.getCommandQueue().some((queued) => queued.resumeReason !== undefined)) ||
      this.isShuttingDown() ||
      this.isTerminalShutdown()
    );
  }
  inheritedPromptPending() {
    return this.deferredParkedPermissionRescue !== undefined;
  }
  inheritedPromptHoldCapable() {
    return (
      this.inheritedPromptPending() &&
      this.parkedPermission?.details !== undefined &&
      typeof this.parkedPermission.details.tool_name === "string"
    );
  }
  keptInheritedPromptPending() {
    return this.registrationKeepsPendingAction && this.inheritedPromptPending();
  }
  inheritedPromptOwnsWorkerStatus() {
    return this.holdingParkedPermission() || this.keptInheritedPromptPending();
  }
  userIntentCommandQueued() {
    return this.messageQueue
      .getCommandQueue()
      .some((queued) => isMainAgentCommand(queued) && !isPassiveCommand(queued));
  }
  retirementMayLandDuringReads() {
    return (
      this.parkedPermissionRetirement !== undefined ||
      this.stopRetirementDue !== undefined ||
      this.deferredParkedPermissionRescue !== undefined
    );
  }
  rescueOwnsReRun() {
    return (
      this.deferredParkedPermissionRescue !== undefined ||
      this.parkedPermissionRetirement !== undefined ||
      this.stopRetirementDue !== undefined
    );
  }
  reRunAnswers(uuid) {
    return this.sendsLeftToReRun.has(uuid);
  }
  waitsForItsReRun(uuid) {
    return this.sendsLeftToReRun.has(uuid) && this.reRunHasStillToEnd();
  }
  reRunHasStillToEnd() {
    let reRunToEnd = this.reRunToEnd;
    return (
      reRunToEnd !== undefined &&
      (reRunToEnd.started ||
        this.drain.pendingDispatchUuids.includes(reRunToEnd.uuid) ||
        this.messageQueue.getCommandQueueSnapshot().some((queued) => queued.uuid === reRunToEnd.uuid))
    );
  }
  declinesWithdrawalOf(uuid) {
    let reRunToEnd = this.reRunToEnd;
    return (
      reRunToEnd?.uuid === uuid &&
      !reRunToEnd.listedByAStop &&
      this.sendsLeftToReRun.size > 0 &&
      this.reRunHasStillToEnd()
    );
  }
  noteAStopsReceipt(receipt, { aim, lateBind }) {
    let reRunToEnd = this.reRunToEnd;
    if (
      reRunToEnd !== undefined &&
      !lateBind &&
      receipt.still_queued.includes(reRunToEnd.uuid) &&
      (aim === undefined || reRunToEnd.namedBy(aim))
    )
      this.reRunToEnd = {
        ...reRunToEnd,
        listedByAStop: true,
      };
    return this.noteCancelledInTheQueue(receipt.cancelled ?? []);
  }
  noteCancelledInTheQueue(uuids) {
    let cancelled = [];
    for (let uuid of this.takeWhatWasLeftToTheReRun(uuids))
      if (this.declinedRedeliveries.cancelWithItsReRun(uuid)) cancelled.push(uuid);
    return cancelled;
  }
  takeWhatWasLeftToTheReRun(uuids) {
    let reRunToEnd = this.reRunToEnd;
    if (reRunToEnd === undefined || !uuids.includes(reRunToEnd.uuid)) return [];
    let sendsLeftToReRun = this.sendsLeftToReRun;
    this.reRunToEnd = undefined;
    this.sendsLeftToReRun = new Set();
    return [...sendsLeftToReRun].flatMap((uuid) => normalizeUuidOrNull(uuid) ?? []);
  }
  leaveItsSendsTo(message) {
    if (
      message.uuid === undefined ||
      (message.isMeta === true &&
        message.resumedTurnUserMessageUuid === undefined &&
        message.sendsOfItsCompactedTurn === undefined)
    )
      return;
    this.sendsLeftToReRun = this.sendsTheRescueWouldAnswer;
    if (this.sendsLeftToReRun.size > 0) message.alsoLeftToThisReRun = [...this.sendsLeftToReRun];
    this.reRunToEnd = {
      uuid: message.uuid,
      started: false,
      namedBy: (queued) => isAimedAtTurn(queued, [message]),
      listedByAStop: false,
    };
  }
  noteBatch(uuids, outcome) {
    if (outcome === "dropped") {
      if (this.reRunToEnd?.listedByAStop === true) {
        this.noteCancelledInTheQueue(uuids);
        return;
      }
      let droppedUuids = this.takeWhatWasLeftToTheReRun(uuids);
      for (let uuid of droppedUuids) this.declinedRedeliveries.forget(uuid);
      if (droppedUuids.length > 0)
        logForDiagnosticsNoPII("warn", "cli_rerun_dropped_its_messages_left_open", {
          count: droppedUuids.length,
        });
      return;
    }
    let reRunToEnd = this.reRunToEnd;
    if (reRunToEnd === undefined || !uuids.includes(reRunToEnd.uuid)) return;
    this.reRunToEnd =
      outcome === "started"
        ? {
            ...reRunToEnd,
            started: true,
          }
        : undefined;
  }
  heldMessage() {
    try {
      if (this.heldAtShutdown !== undefined) return this.heldAtShutdown;
      let holdOpenFor = this.holdOpenFor;
      if (
        holdOpenFor === undefined ||
        this.holdRevoked ||
        !this.lane.holdsParkedMessageOpen() ||
        Date.now() - holdOpenFor.openedAtMs > SYNC_ANSWER_TTL_MS
      )
        return;
      if (!(
        this.deferredParkedPermissionRescue !== undefined ||
        (this.parkAnswer === "consumed" &&
          (this.drain.running ||
            this.messageQueue.getCommandQueue().some((queued) => this.answersInheritedPrompt(queued)))) ||
        (this.parkAnswer === "committed" &&
          this.drain.turnUnderWay &&
          this.drain.dequeueCount === this.parkAnswerDequeue)
      ))
        return;
      this.everHeldMessage = true;
      return holdOpenFor.uuid;
    } catch (error) {
      logError(error);
      return;
    }
  }
  finishMessageLeftOpen() {
    if (this.everHeldMessage) this.declinedRedeliveries.ackAfterRetirement().catch(logError);
  }
  finishCopyThatAwaitedTheCutOffTurn() {
    this.cutOffTurnGivenUp = true;
    this.cutOffTurnLeftToTheNextWorker = false;
    if (this.aCopyAwaitsTheCutOffTurn) this.declinedRedeliveries.ackAfterRetirement().catch(logError);
  }
  answersInheritedPrompt(queued) {
    return (
      queued.mode === "orphaned-permission" &&
      this.parkedPermission !== undefined &&
      queued.orphanedPermission?.permissionResult?.toolUseID === this.parkedPermission.tool_use_id
    );
  }
  interruptedTurnEcho() {
    return {
      ...(this.interruptedTurnsPrompt !== undefined && {
        resumedTurnUserMessageUuid: this.interruptedTurnsPrompt,
        resumedTurnOpenerVouched: true,
      }),
      ...this.fromInterruptedTurnsPrompt,
      resumeReason: resumeReasonFromEnv(),
      ...(this.leftToTheCardsTurn().size > 0 && {
        alsoLeftToThisReRun: [...this.leftToTheCardsTurn()],
      }),
      ...(this.sendsOfTheCardsCompactedTurn !== undefined && {
        sendsOfItsCompactedTurn: this.sendsOfTheCardsCompactedTurn,
      }),
    };
  }
  enqueueAdoptedServedCalls(servedCalls) {
    this.messageQueue.enqueue({
      ...this.adoptedServedCallsCommand(servedCalls),
      ...this.interruptedTurnEcho(),
    });
  }
  resumeInterruptedTurn() {
    if (
      this.turnInterruptionState &&
      this.turnInterruptionState.kind !== "none" &&
      this.lane.resumeInterruptedTurn
    ) {
      this.sendsTheRescueWouldAnswer = this.sendsTheInterruptedTurnHolds(this.turnInterruptionState.message);
      let compactedTurnSends = this.sendsOfTheCompactedTurn(this.turnInterruptionState.message);
      this.carriesTheCutOffTurnOn = true;
      let rescueCommand = {
        mode: "prompt",
        agentId: mainAgentId(),
        value: this.turnInterruptionState.message.message.content,
        uuid: this.turnInterruptionState.message.isMeta
          ? randomUUID()
          : (this.turnInterruptionState.message.uuid ?? randomUUID()),
        isMeta: this.turnInterruptionState.message.isMeta,
        ...(this.turnInterruptionState.interruptedTurnUserMessageUuid !== undefined && {
          resumedTurnUserMessageUuid: this.turnInterruptionState.interruptedTurnUserMessageUuid,
          ...(this.turnInterruptionState.interruptedTurnUserMessageUuid === this.interruptedTurnsPrompt && {
            resumedTurnOpenerVouched: true,
          }),
        }),
        ...(compactedTurnSends !== undefined && {
          sendsOfItsCompactedTurn: compactedTurnSends,
        }),
        ...this.fromInterruptedTurnsPrompt,
        resumeReason: resumeReasonFromEnv(),
        origin: normalizedQueueOrigin(this.turnInterruptionState.message),
        skipAttachments: shouldSkipQueueAttachments(this.turnInterruptionState.message),
        ...(this.turnInterruptionState.message.taskDelivery && {
          taskDelivery: this.turnInterruptionState.message.taskDelivery,
        }),
        ...(heldMessageUuids(this.turnInterruptionState.message).length > 0 && {
          mergedSendUuids: [...heldMessageUuids(this.turnInterruptionState.message)],
        }),
        ...(this.turnInterruptionState.message.imageFileUuids && {
          imageFileUuids: this.turnInterruptionState.message.imageFileUuids,
        }),
        ...(this.turnInterruptionState.message.savedFiles && {
          savedFiles: this.turnInterruptionState.message.savedFiles,
        }),
        ...(this.sendsTheRescueWouldAnswer.size > 0 && {
          drainOnly: true,
        }),
        ...relayTurnFlags(this.turnInterruptionState.message),
        ...queueInputFlags(this.turnInterruptionState.message),
        ...wakeupSourceField(this.turnInterruptionState.message),
      };
      resumeInterruptedTurn("print", this.turnInterruptionState.message, {
        deferred: !!this.parkedPermission,
        pendingActionClass: this.pendingActionClass,
        cutOffAgentCalls: this.cutOffAgentCalls,
        tail: this.turnInterruptionState.tail,
      });
      let servedCalls = isRemoteToolForwardingSwitchOn() ? (this.servedCallsToAdopt ?? []) : [];
      let inFlight = this.inFlightServedCalls();
      for (let { call: entry } of servedCalls) {
        inFlight.adopt(entry);
        inFlight.add(entry);
      }
      let provisionalHostTools = this.presentAdoptedHostTools(servedCalls.map(({ call: entry }) => entry));
      if (servedCalls.length > 0 || (this.journaledServedCalls ?? 0) > 0)
        this.io.sessionState.notifyInternalMetadataChanged({
          in_flight_served_calls: inFlight.current(),
        });
      this.parkSiblings = servedCalls.filter(
        ({ call: entry }) => entry.tool_use_id !== this.parkedPermission?.tool_use_id,
      );
      this.parkOwnAdoptedCall = servedCalls.find(
        ({ call: entry }) => entry.tool_use_id === this.parkedPermission?.tool_use_id,
      );
      let parkAdopted = this.parkOwnAdoptedCall !== undefined;
      let [firstAgentCall, ...siblingAgentCalls] = this.resumedAgentCalls ?? [];
      if (this.parkOwnAdoptedCall !== undefined)
        inFlight.noteParkedAtRestart(this.parkOwnAdoptedCall.call.tool_use_id);
      if (this.parkedPermission && this.parkOwnAdoptedCall !== undefined) {
        this.parkSettledAtBoot = true;
        this.notePromptEnded("settled_at_boot");
        if (this.parkedPermission.details?.input === undefined)
          this.withdrawCard(this.parkedPermission.request_id);
        else {
          let ask = new PermissionCardAsk({
            card: this.parkedPermission,
            answerKind: this.answers.kind,
            waitMs: this.lane.answerWaitMs,
            maxAnswerAgeMs: MAX_PARKED_ANSWER_AGE_MS,
            allowWithoutInputIsEcho: false,
            withdrawCard: this.withdrawCard,
            unreadAnswersRead: () => {
              let answersRead = this.receivedAnswersRead();
              return answersRead && withDeadline(answersRead, PERMISSION_ANSWER_WAIT_MS);
            },
            answerOff: async () => (await this.lane.inheritedAnswerOff?.()) ?? "absent",
          });
          this.inheritedAsk = ask;
          inFlight.offerInheritedAnswer(this.parkedPermission.tool_use_id, (answer) =>
            this.answerForAdoptedCall(ask, answer),
          );
        }
        if (this.registrationKeepsPendingAction) this.io.sessionState.adoptRestoredPendingAction();
        let adopted = this.takeParkAdoption();
        logForDebugging(
          `[print.ts] Adopting ${adopted.length} served call(s) the previous worker had in flight, the parked one (toolUseID=${this.parkedPermission.tool_use_id}) included, instead of holding its prompt`,
        );
        this.enqueueAdoptedServedCalls(adopted);
        this.dropLoaderSyntheticRows();
        logEvent("tengu_resume_parked_permission", {
          outcome: lit("served_adopted_at_boot"),
          served_adopted: adopted.length,
          parked_tool_use_sha12: shortHash(this.parkedPermission.tool_use_id),
          parked_request_sha12: shortHash(this.parkedPermission.request_id),
        });
      } else if (this.parkedPermission) {
        logForDebugging(
          `[print.ts] Deferring interrupted-turn rescue for parked permission toolUseID=${this.parkedPermission.tool_use_id}${this.parkSiblings.length > 0 ? ` (with ${this.parkSiblings.length} adopted served call(s) riding its resolution)` : ""}`,
        );
        this.deferredParkedPermissionRescue = rescueCommand;
        this.holdBehindPrompt();
        if (this.interruptedTurnsPrompt !== undefined || compactedTurnSends !== undefined) {
          this.readSendsLeftToTheCardsTurn = this.sendsTheParkedTurnTookIn(
            this.turnInterruptionState.message,
            this.interruptedTurnsPrompt,
          );
          let sendsLeft = this.leftToTheCardsTurn(true);
          if (this.interruptedTurnsPrompt === undefined)
            this.sendsOfTheCardsCompactedTurn = this.sendsOfTheCompactedTurn(
              this.turnInterruptionState.message,
              sendsLeft,
            );
        }
      } else if (this.parkSiblings.length > 0) {
        logForDebugging(
          `[print.ts] Adopting ${this.parkSiblings.length} served call(s) the previous worker had in flight instead of re-running the interrupted turn: ${this.parkSiblings
            .map(({ call: entry }) => entry.tool_use_id)
            .join(",")}`,
        );
        this.enqueueAdoptedServedCalls(this.parkSiblings);
        this.parkSiblings = [];
        this.dropLoaderSyntheticRows();
      } else if (firstAgentCall !== undefined) {
        logForDebugging(
          `[print.ts] Running ${this.resumedAgentCalls?.length} Agent call(s) of the interrupted turn again, each to resume the agent it was waiting on, instead of re-running the turn`,
        );
        if (this.interruptedTurnsPrompt !== undefined || compactedTurnSends !== undefined)
          this.sendsLeftToTheCardsTurn = this.sendsTheRescueWouldAnswer;
        if (this.interruptedTurnsPrompt === undefined) this.sendsOfTheCardsCompactedTurn = compactedTurnSends;
        this.messageQueue.enqueue({
          mode: "orphaned-permission",
          agentId: mainAgentId(),
          value: [],
          orphanedPermission: {
            permissionResult: {
              behavior: "allow",
              updatedInput: {},
              toolUseID: firstAgentCall.toolUseID,
            },
            assistantMessage: firstAgentCall.assistantMessage,
            ...(siblingAgentCalls.length > 0 && {
              siblings: siblingAgentCalls,
            }),
            resumesInterruptedTurn: true,
          },
          startedBy: "restart",
          ...this.interruptedTurnEcho(),
        });
        this.dropLoaderSyntheticRows();
      } else {
        logForDebugging(
          `[print.ts] Auto-resuming interrupted turn (kind: ${this.turnInterruptionState.kind})`,
        );
        this.removeInterruptedMessage(this.turnInterruptionState.message);
        this.leaveItsSendsTo(rescueCommand);
        this.messageQueue.enqueue({
          ...rescueCommand,
          ...(this.turnInterruptionState.endedOnApiError !== undefined &&
            !this.supersededToolUseIds?.size && {
              yieldsToPersonPrompt: this.turnInterruptionState.endedOnApiError,
            }),
        });
      }
      if ((this.journaledServedCalls ?? 0) > 0 || servedCalls.length > 0)
        logEvent("tengu_remote_tool_restart_adoption", {
          journaled: this.journaledServedCalls ?? 0,
          adoptable: (this.servedCallsToAdopt ?? []).length,
          adopted: servedCalls.length,
          never_sent: (this.servedCallsNeverSent ?? []).length,
          park_adopted: parkAdopted,
          provisional_host_tools: provisionalHostTools,
        });
    }
  }
  takeParkSiblings() {
    let parkSiblings = this.parkSiblings;
    this.parkSiblings = [];
    return parkSiblings;
  }
  takeParkAdoption() {
    let parkOwnAdoptedCall = this.parkOwnAdoptedCall;
    this.parkOwnAdoptedCall = undefined;
    let parkSiblings = this.takeParkSiblings();
    return parkOwnAdoptedCall === undefined ? parkSiblings : [parkOwnAdoptedCall, ...parkSiblings];
  }
  dropParkSiblings() {
    let inFlightCalls = this.inFlightServedCalls();
    let adoptedCalls = this.takeParkAdoption();
    for (let { call } of adoptedCalls) {
      inFlightCalls.takeAdopted(call.tool_use_id);
      inFlightCalls.remove(call.tool_use_id);
    }
    if (adoptedCalls.length > 0) {
      this.io.sessionState.notifyInternalMetadataChanged({
        in_flight_served_calls: inFlightCalls.current(),
      });
      logEvent("tengu_remote_tool_restart_adoption_dropped", {
        dropped: adoptedCalls.length,
      });
    }
  }
  walkBackKeptRegistrationWithoutPark() {
    if (
      this.initParkReport &&
      this.deferredParkedPermissionRescue === undefined &&
      (this.initParkReport.reported === "requires_action" || this.initParkReport.pendingActionOutstanding)
    ) {
      this.io.sessionState.adoptRestoredPendingAction();
      this.io.sessionState.notifyStateChanged("idle");
      logEvent("tengu_ccr_init_park_report", {
        reported: lit("idle"),
        reason: this.parkSettledAtBoot ? lit("park_settled_at_boot") : lit("no_park_derived"),
        init_reported: fromEnum(this.initParkReport.reported),
      });
    }
  }
  seedHandledToolUseIds() {
    if (
      this.supersededToolUseIds &&
      this.turnInterruptionState &&
      this.turnInterruptionState.kind !== "none" &&
      this.lane.resumeInterruptedTurn
    )
      for (let supersededToolUseId of this.supersededToolUseIds) {
        if (supersededToolUseId === this.parkedPermission?.tool_use_id) continue;
        this.handledOrphanedToolUseIds.add(supersededToolUseId);
      }
    if (this.bootRetiredToolUseIds)
      for (let bootRetiredToolUseId of this.bootRetiredToolUseIds) {
        if (bootRetiredToolUseId === this.parkedPermission?.tool_use_id) continue;
        this.handledOrphanedToolUseIds.add(bootRetiredToolUseId);
      }
    for (let toolUseId of this.answeredToolUseIds ?? []) this.handledOrphanedToolUseIds.add(toolUseId);
    if (this.parkedPermission && this.parkSettledAtBoot)
      this.handledOrphanedToolUseIds.add(this.parkedPermission.tool_use_id);
    if (this.keptSubagentAsk) this.handledOrphanedToolUseIds.add(this.keptSubagentAsk.card.tool_use_id);
  }
  parkedTurnToolUseIds(toolUse) {
    return [
      toolUse.tool_use_id,
      ...[...(this.bootRetiredToolUseIds ?? [])].filter((id) => id !== toolUse.tool_use_id),
    ];
  }
  async retireInTranscript(toolUseIds, reason, waitMs, isStop = false) {
    let { content, toolDenialKind } = ANSWER_WAIT_END_OUTCOMES[reason];
    let wasSuperseded = () => {
      if (isStop) return false;
      switch (reason) {
        case "new_input":
          return false;
        case "timeout":
          return this.drain.running || this.messageQueue.hasUserIntentCommandsInQueue();
        default:
          return this.drain.intentBatchInFlight || this.userIntentCommandQueued();
      }
    };
    let retirement = (async () => {
      let outcome = "retired_unanswered";
      let retiredCount = 0;
      let rows = [];
      let holders = [];
      let tellsClient = reason === "interrupt" && this.endsStoppedTurns();
      let stored = false;
      try {
        let unresolved = [];
        for (let toolUseId of toolUseIds) {
          let holder = (await this.findUnresolvedToolUse(toolUseId))?.holder;
          if (holder)
            unresolved.push({
              toolUseId,
              assistantMessage: holder,
            });
        }
        if (wasSuperseded()) outcome = "retire_superseded";
        else if (unresolved.length > 0) {
          let retiredRows = [
            unresolved.reduce((acc, entry) =>
              entry.assistantMessage.timestamp > acc.assistantMessage.timestamp ? entry : acc,
            ).assistantMessage,
            ...unresolved.map(({ toolUseId, assistantMessage }) =>
              createUserMessage({
                content: [
                  {
                    type: "tool_result",
                    content,
                    is_error: true,
                    tool_use_id: toolUseId,
                  },
                ],
                toolUseResult: content,
                toolDenialKind,
                sourceToolAssistantUUID: assistantMessage.uuid,
              }),
            ),
            {
              ...createUserInterruptionMessage({
                toolUse: true,
              }),
              retiredByStop: reason === "interrupt",
            },
          ];
          await this.retirementWriter.append(retiredRows);
          rows = retiredRows;
          retiredCount = unresolved.length;
          holders = unresolved.map(({ assistantMessage }) => assistantMessage);
        }
      } catch (error) {
        outcome = "retire_write_failed";
        logForDebugging(
          `[print.ts] retiring parked permission(s) toolUseIDs=${toolUseIds.join(",")} in the transcript failed: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
      let inConversation = false;
      if (holders.length > 0 && getRemoteFeatureGateState(TENGU_CANDID_JUNIPER) === "on")
        try {
          inConversation = this.putAheadOfLoaderRows([
            ...holders.toSorted((a, b) =>
              a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
            ),
            ...rows.slice(1),
          ]);
        } catch (error) {
          logError(error);
        }
      if (outcome === "retired_unanswered")
        try {
          await this.retirementWriter.flush();
          stored =
            tellsClient &&
            (await withDeadline(
              this.retirementWriter.storedForNextWorker?.(rows.map((row) => row.uuid)) ??
                Promise.resolve(true),
              PARKED_PROMPT_CONSTANTS,
            )) === true;
        } catch (error) {
          logForDebugging(
            `[print.ts] storing the retirement of toolUseIDs=${toolUseIds.join(",")} failed: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
        }
      if (stored)
        try {
          this.endStoppedTurn?.(rows);
        } catch (error) {
          logForDebugging(
            `[print.ts] ending the stopped turn for the client failed: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
      else if (tellsClient)
        logForDebugging(
          `[print.ts] Stop on parked permission(s) toolUseIDs=${toolUseIds.join(",")}: the client is not told that the turn is over, because the rows that record the Stop are not confirmed as stored (outcome=${outcome}). The next worker may run the turn again.`,
          {
            level: "warn",
          },
        );
      return {
        outcome,
        retiredCount,
        endingWithheld: tellsClient ? !stored : undefined,
        inConversation,
      };
    })();
    this.parkedPermissionRetirement = retirement.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    let { outcome, retiredCount, endingWithheld, inConversation } = await retirement.finally(() => {
      this.parkedPermissionRetirement = undefined;
    });
    if (outcome === "retired_unanswered" || this.aCopyAwaitsTheCutOffTurn)
      await this.declinedRedeliveries.ackAfterRetirement();
    logEvent("tengu_resume_parked_permission", {
      outcome: fromEnum(outcome),
      reason: fromEnum(reason),
      wait_ms: waitMs,
      retired_count: retiredCount,
      ending_withheld: endingWithheld,
      retired_rows_in_conversation: inConversation || undefined,
      ...this.parkedPromptEventFields,
    });
    if (
      reason !== "new_input" &&
      outcome !== "retire_superseded" &&
      !wasSuperseded() &&
      !this.drain.running &&
      !this.isShuttingDown() &&
      !this.isTerminalShutdown() &&
      !this.drain.running &&
      !this.io.hasStandingPrompt()
    )
      this.reportInheritedPromptDecided();
  }
  fire(reason) {
    if (this.parkedPermissionFallbackTimer) {
      clearTimeout(this.parkedPermissionFallbackTimer);
      this.parkedPermissionFallbackTimer = undefined;
    }
    if (reason === "interrupt" || reason === "rewind")
      this.inheritedAsk?.stop(reason === "rewind" ? "rewound" : "stopped");
    let deferredParkedPermissionRescue = this.deferredParkedPermissionRescue;
    if (!deferredParkedPermissionRescue || !this.parkedPermission) {
      let abandoning = this.parkAnswer === "consumed" && (reason === "interrupt" || reason === "rewind");
      if (abandoning && (this.heldMessage() !== undefined || this.everHeldMessage)) {
        this.parkAnswer = "abandoned";
        try {
          logFeatureSad("ccr_parked_message_held", "stopped_before_run");
          if (reason === "rewind") this.declinedRedeliveries.closeAfterRewind();
          else this.finishMessageLeftOpen();
        } catch (error) {
          logError(error);
        }
      }
      if (
        abandoning ||
        (this.cutOffTurnLeftToTheNextWorker && (reason === "interrupt" || reason === "rewind"))
      )
        this.finishCopyThatAwaitedTheCutOffTurn();
      return;
    }
    if (this.isTerminalShutdown()) return;
    if (reason === "timeout" && (this.inputWaitsForAnswer() || this.msLeftForUnreadAnswer() !== undefined)) {
      this.arm();
      return;
    }
    let retireOnTimeout =
      reason === "timeout" &&
      !this.unreadDenyRetires &&
      this.parkedPermission.details !== undefined &&
      typeof this.parkedPermission.details.tool_name === "string";
    if (retireOnTimeout && this.io.sessionState.getState() === "requires_action") {
      this.arm();
      return;
    }
    if (
      retireOnTimeout &&
      this.parkedPermission.details &&
      !this.drain.intentBatchInFlight &&
      !this.userIntentCommandQueued() &&
      !this.drain.endSessionRequested &&
      !this.isShuttingDown() &&
      !this.isTerminalShutdown()
    ) {
      this.parkedPermissionHeld = true;
      this.io.sessionState.notifyStateChanged("requires_action", this.parkedPermission.details);
      this.drain.runningReported = false;
      logForDebugging(
        `[print.ts] No persisted control_response for parked permission toolUseID=${this.parkedPermission.tool_use_id} \u2014 holding it answerable; not re-running, not retiring`,
      );
      logEvent("tengu_resume_parked_permission", {
        outcome: lit("held"),
        reason: fromEnum(reason),
        wait_ms: Date.now() - this.parkedPermissionWaitStart,
        ...this.parkedPromptEventFields,
      });
      return;
    }
    let wasHolding = this.holdingParkedPermission();
    if (this.registrationKeepsPendingAction) this.io.sessionState.adoptRestoredPendingAction();
    this.deferredParkedPermissionRescue = undefined;
    this.notePromptEnded(reason);
    this.finishMessageLeftOpen();
    this.handledOrphanedToolUseIds.add(this.parkedPermission.tool_use_id);
    this.withdrawCard(this.parkedPermission.request_id);
    logEvent("tengu_resume_stale_prompt_cancel", {
      kind: lit("permission"),
      withdrawn_at: lit("park_end"),
      prompt_call: lit("in_interrupted_turn"),
    });
    if (
      reason === "interrupt" ||
      reason === "new_input" ||
      reason === "rewind" ||
      this.drain.running ||
      (wasHolding ? this.userIntentCommandQueued() : this.messageQueue.hasUserIntentCommandsInQueue())
    ) {
      logForDebugging(
        `[print.ts] Parked permission toolUseID=${this.parkedPermission.tool_use_id} superseded by new input during ${wasHolding ? "hold" : "wait"} (${reason}) \u2014 dropping deferred rescue`,
      );
      logEvent("tengu_resume_parked_permission", {
        outcome: fromEnum(wasHolding ? "held_superseded" : "superseded"),
        reason: fromEnum(reason),
        wait_ms: Date.now() - this.parkedPermissionWaitStart,
        ...this.parkedPromptEventFields,
      });
      if (reason === "rewind") this.declinedRedeliveries.closeAfterRewind();
      let parkedStopRetires = reason === "interrupt" && this.lane.parkedStopRetires;
      if (reason === "new_input" && !this.isShuttingDown() && !this.isTerminalShutdown())
        this.retireInTranscript(
          this.parkedTurnToolUseIds(this.parkedPermission),
          reason,
          Date.now() - this.parkedPermissionWaitStart,
        );
      else if (!this.drain.running && !this.isShuttingDown() && !this.isTerminalShutdown()) {
        if ((wasHolding || parkedStopRetires) && reason === "interrupt") {
          let toolUseIds = this.parkedTurnToolUseIds(this.parkedPermission);
          let waitMs = Date.now() - this.parkedPermissionWaitStart;
          if (this.endsStoppedTurns())
            this.startStopRetirement({
              toolUseIds,
              waitMs,
            });
          else this.retireInTranscript(toolUseIds, reason, waitMs);
        } else if ((wasHolding || this.registrationKeepsPendingAction) && !this.io.hasStandingPrompt())
          this.reportInheritedPromptDecided();
      } else if (
        reason === "interrupt" &&
        this.drain.running &&
        this.endsStoppedTurns() &&
        !this.isShuttingDown() &&
        !this.isTerminalShutdown()
      ) {
        let retirement = {
          toolUseIds: this.parkedTurnToolUseIds(this.parkedPermission),
          waitMs: Date.now() - this.parkedPermissionWaitStart,
        };
        if (this.drain.runPhase === "waiting_for_agents") this.startStopRetirement(retirement);
        else this.stopRetirementDue = retirement;
      }
      if (reason === "interrupt" || reason === "rewind") this.finishCopyThatAwaitedTheCutOffTurn();
      else {
        this.carriesTheCutOffTurnOn = false;
        if (this.drain.intentBatchInFlight || this.userIntentCommandQueued())
          this.declinedRedeliveries.runWhatNoRowVouchesFor();
        else this.cutOffTurnLeftToTheNextWorker = true;
      }
      this.dropParkSiblings();
      return;
    }
    if (reason === "timeout") this.parkedPermissionFallbackFiredAt = Date.now();
    if (reason === "timeout") {
      this.carriesTheCutOffTurnOn = false;
      logForDebugging(
        `[print.ts] No persisted control_response for parked permission toolUseID=${this.parkedPermission.tool_use_id} \u2014 retiring it unanswered (nothing to hold); not re-running the interrupted turn`,
      );
      this.retireInTranscript(
        this.parkedTurnToolUseIds(this.parkedPermission),
        reason,
        Date.now() - this.parkedPermissionWaitStart,
      );
      this.dropParkSiblings();
      return;
    }
    logForDebugging(
      `[print.ts] No consumable persisted control_response for parked permission toolUseID=${this.parkedPermission.tool_use_id} (${reason}) \u2014 falling back to cancel + re-ask`,
    );
    let adopted = this.takeParkAdoption();
    if (adopted.length > 0) {
      this.enqueueAdoptedServedCalls(adopted);
      this.dropLoaderSyntheticRows();
    } else {
      if (this.turnInterruptionState && this.turnInterruptionState.kind !== "none")
        this.removeInterruptedMessage(this.turnInterruptionState.message);
      this.leaveItsSendsTo(deferredParkedPermissionRescue);
      this.messageQueue.enqueue(deferredParkedPermissionRescue);
      let sendsLeftToTheCardsTurn = this.sendsLeftToTheCardsTurn;
      this.sendsLeftToTheCardsTurn = new Set();
      this.sendsOfTheCardsCompactedTurn = undefined;
      this.declinedRedeliveries.readAgain(
        [...sendsLeftToTheCardsTurn].flatMap((uuid) => normalizeUuidOrNull(uuid) ?? []),
      );
    }
    logEvent("tengu_resume_parked_permission", {
      outcome: adopted.length > 0 ? lit("fallback_served_adopted") : lit("fallback_reask"),
      reason: fromEnum(reason),
      wait_ms: Date.now() - this.parkedPermissionWaitStart,
      ...(adopted.length > 0 && {
        served_adopted: adopted.length,
      }),
      ...this.parkedPromptEventFields,
    });
    this.kick();
  }
  notePromptEnded(by) {
    this.promptEnded = {
      by,
      atMs: Date.now(),
      responseUnread: this.receivedAnswersRead() !== undefined,
    };
    this.promptEndSignal.resolve();
    this.readSendsLeftToTheCardsTurn = undefined;
    queueMicrotask(() => void this.endHoldBehindPrompt(by));
  }
  letPressedMessagesGo(message) {
    if (this.promptEnded !== undefined) return;
    this.messageQueue.letHeldBackGo((queued) => isHumanOrigin(queued.origin) && message(queued));
  }
  holdBehindPrompt() {
    try {
      this.letHeldCommandsGo = this.messageQueue.holdBack((queued) => {
        if (!isMainAgentCommand(queued)) return false;
        if (
          canBatchWith(queued) &&
          isHumanOrigin(queued.origin) &&
          queued.priority !== "now" &&
          queued.sentNow !== true &&
          queued.resumeReason === undefined &&
          (this.promptEnded !== undefined || this.inheritedPromptHoldCapable()) &&
          this.lane.holdsInputBehindPrompt?.() === true
        ) {
          logFeatureOk("ccr_input_held_behind_prompt");
          return true;
        }
        let isMcpTaskNotification =
          queued.mode === "task-notification" &&
          queued.taskId !== undefined &&
          isTaskIdOfType("mcp_task", queued.taskId) &&
          isMcpTasksEnabled();
        if (isMcpTaskNotification)
          logForDebugging(
            `[print.ts] Holding back the notification of MCP task ${queued.taskId}: it starts no turn until parked permission toolUseID=${this.parkedPermission?.tool_use_id} ends`,
          );
        return isMcpTaskNotification;
      });
    } catch (error) {
      logError(error);
    }
  }
  async endHoldBehindPrompt(by) {
    if (by === "shutdown") return;
    try {
      await this.parkedPermissionRetirement;
      let letGo = this.letHeldCommandsGo?.() ?? 0;
      this.letHeldCommandsGo = undefined;
      if (letGo > 0)
        logForDebugging(
          `[print.ts] Parked permission toolUseID=${this.parkedPermission?.tool_use_id} ended (${by}): letting go ${letGo} command(s) held back for it`,
        );
    } catch (error) {
      logError(error);
    }
  }
  answerOnItsWay() {
    if (!this.inheritedPromptPending() || !this.userIntentCommandQueued()) return;
    let leftMs = this.msLeftForUnreadAnswer();
    if (leftMs === undefined) return;
    this.drainWaitedForAnswer = true;
    let startTime = performance.now();
    return withDeadline(
      Promise.race([this.receivedAnswersRead(), this.promptEndSignal.promise]).then(() => true),
      leftMs,
    ).then((finished) => {
      try {
        let waitedMs = performance.now() - startTime;
        let endedBy =
          finished === undefined ? "bound" : this.promptEnded === undefined ? "responses_read" : "park_ended";
        logForDiagnosticsNoPII("info", "cli_parked_answer_wait_over", {
          waited: durationBucket(waitedMs),
          waited_ms: Math.round(waitedMs),
          ended_by: endedBy,
          ...flagKey("ended_by", endedBy),
          ...chatOriginField(),
        });
        if (finished === undefined) logFeatureSad("ccr_parked_answer_waited", "bound");
        else logFeatureOk("ccr_parked_answer_waited");
      } catch (error) {
        logError(error);
      }
    });
  }
  msLeftForUnreadAnswer() {
    if (
      !this.inheritedPromptPending() ||
      this.promptEnded !== undefined ||
      this.isShuttingDown() ||
      this.receivedAnswersRead() === undefined
    )
      return;
    this.flagAtLastWaitCheck = this.answerGoesFirstFlag();
    if (this.flagAtLastWaitCheck !== "on") return;
    let startTime = performance.now();
    if (this.answerOnItsWayUntil === undefined) {
      this.answerOnItsWayUntil = startTime + PERMISSION_ANSWER_WAIT_MS;
      this.receivedAnswersRead()?.then(() => {
        if (!this.drainWaitedForAnswer) this.answerOnItsWayUntil = undefined;
      });
    }
    let leftMs = this.answerOnItsWayUntil - startTime;
    return leftMs > 0 ? leftMs : undefined;
  }
  answerGoesFirstFlag() {
    let flag = this.lane.answerGoesFirst();
    return flag === "cold" ? "flags_not_fetched" : flag;
  }
  async onUnexpectedResponse(message, lateAllow) {
    this.noteParkAnswerCameIn(message);
    if (this.answers.kind === "strict") return this.routeStrictAnswer(message, lateAllow);
    let toolUseID =
      message.response.subtype === "success" && typeof message.response.response?.toolUseID === "string"
        ? message.response.response.toolUseID
        : undefined;
    if (this.inheritedAsk?.take(message, toolUseID)) return;
    let cardHoldEnabled = isPermissionCardHoldEnabled();
    let isParkedAnswer =
      this.parkedPermission !== undefined &&
      toolUseID === this.parkedPermission.tool_use_id &&
      (message.response.request_id === this.parkedPermission.request_id ||
        (cardHoldEnabled && this.isBlankedParkDeny(message)));
    let isBlankedDeny =
      isParkedAnswer &&
      cardHoldEnabled &&
      message.response.subtype === "success" &&
      message.response.response?.behavior === "deny";
    if (
      isParkedAnswer &&
      !(message.response.subtype === "success" && message.response.response?.behavior === "deny") &&
      toolUseID !== undefined &&
      this.deniedButUnread.has(toolUseID)
    ) {
      logForDebugging(
        `[print.ts] Dropping an answer for parked toolUseID=${toolUseID}: a Deny for it came first`,
      );
      return;
    }
    if (isParkedAnswer && this.parkedPermissionFallbackTimer) {
      clearTimeout(this.parkedPermissionFallbackTimer);
      this.parkedPermissionFallbackTimer = undefined;
    }
    if (isParkedAnswer && this.keptInheritedPromptPending())
      this.io.sessionState.adoptRestoredPendingAction();
    if (
      this.inheritedPromptPending() &&
      toolUseID !== undefined &&
      toolUseID === this.parkedPermission?.tool_use_id &&
      !isParkedAnswer
    ) {
      logForDebugging(
        `[print.ts] Dropping control_response for inherited parked permission toolUseID=${toolUseID}: request_id does not match the pending prompt`,
        {
          level: "warn",
        },
      );
      let reason = "inherited_request_id_mismatch";
      logForDiagnosticsNoPII("warn", "cli_orphan_answer_dropped", () => ({
        ...this.orphanDropContext(toolUseID),
        ...this.parkAnswerContext(toolUseID),
        is_park_answer: false,
        tool_use_id_matches_park: true,
        reason,
        ...flagKey("reason", reason),
        ...getRiskColor(message),
      }));
      return;
    }
    let cleared = false;
    let ownsPark =
      isParkedAnswer &&
      this.parkedPermission !== undefined &&
      this.promptStillOpen(this.parkedPermission) &&
      this.inheritedPromptOwnsWorkerStatus() &&
      !this.io.hasStandingPrompt();
    if (ownsPark && !isBlankedDeny) {
      if (this.answerClearing) {
        logForDebugging(
          `[print.ts] Dropping a copy of the parked permission's answer toolUseID=${toolUseID}: its clear is pending`,
        );
        return;
      }
      this.answerClearing = true;
      try {
        cleared = await this.recordClearedBeforeRun(lit("clear_unconfirmed"));
      } finally {
        this.answerClearing = cleared;
      }
      if (!cleared) return;
    }
    let queued;
    let messageRows;
    let behindCard = [];
    try {
      queued = await handleOrphanedPermissionResponse({
        message,
        denyIsRefusal: cardHoldEnabled,
        setAppState: this.store.setState,
        messageQueue: this.messageQueue,
        handledToolUseIds: this.handledOrphanedToolUseIds,
        startedBy: this.markAnswer,
        findUnresolved: async (toolUseId) => {
          let unresolvedToolUse = await this.findUnresolvedToolUse(toolUseId);
          messageRows = unresolvedToolUse?.messageRows;
          if (isParkedAnswer)
            behindCard = deviceCallsBehindCard(messageRows, toolUseId, this.supersededToolUseIds);
          return unresolvedToolUse?.holder ?? null;
        },
        ...(isParkedAnswer && {
          initFirst: (toolUseId, context) =>
            this.parkSiblings.length > 0 || this.servedElsewhere(toolUseId, context),
          siblings: () =>
            this.takeParkSiblings().map(({ call: entry, assistantMessage }) => ({
              toolUseID: entry.tool_use_id,
              assistantMessage,
            })),
          messageRows: () => messageRows,
          notSent: () => [...(this.servedCallsNeverSent ?? []), ...behindCard],
          note: (toolUseId) =>
            this.lostCallsNote(
              messageRows ?? [],
              new Set([
                toolUseId,
                ...this.parkSiblings.map((parkSibling) => parkSibling.call.tool_use_id),
                ...behindCard.map((entry) => entry.toolUseID),
              ]),
            ),
          resumesInterruptedTurn: () => this.deferredParkedPermissionRescue !== undefined,
          cardInput: this.parkedPermission?.recordedInput ?? null,
          interruptedTurnEcho: this.interruptedTurnEcho(),
        }),
        onEnqueued: () => {
          this.kick();
        },
        enqueueContext: (toolUseId) => this.parkAnswerContext(toolUseId),
        dropContext: (toolUseId) => ({
          ...this.orphanDropContext(toolUseId),
          ...this.parkAnswerContext(toolUseId),
          is_park_answer: isParkedAnswer,
          tool_use_id_matches_park:
            toolUseId !== undefined && toolUseId === this.parkedPermission?.tool_use_id,
        }),
      });
    } catch (error) {
      if (isParkedAnswer) {
        logForDebugging(
          `[print.ts] orphan handler threw for parked permission toolUseID=${this.parkedPermission?.tool_use_id}: ${error}`,
          {
            level: "error",
          },
        );
        if (isBlankedDeny) this.keepWaitingAfterUnreadDeny(toolUseID);
        else this.fire("orphan_dropped");
      }
      throw error;
    } finally {
      if (cleared) this.answerClearing = false;
    }
    if (isParkedAnswer) {
      if (queued && this.deferredParkedPermissionRescue) {
        this.deferredParkedPermissionRescue = undefined;
        this.notePromptEnded("own_answer");
        this.noteParkAnswerConsumed();
        this.dropLoaderSyntheticRows();
        this.withdrawCard(this.parkedPermission.request_id);
        if (isBlankedDeny && ownsPark && !this.io.hasStandingPrompt()) this.sendClearAfterDeny();
        logForDebugging(
          `[print.ts] Parked permission toolUseID=${toolUseID} resolved by persisted control_response \u2014 dropping deferred rescue`,
        );
        logEvent("tengu_resume_parked_permission", {
          outcome: lit("consumed_persisted"),
          wait_ms: Date.now() - this.parkedPermissionWaitStart,
          ...this.parkedPromptEventFields,
        });
      } else if (!queued)
        if (this.parkedPermissionFallbackFiredAt !== undefined) {
          logEvent("tengu_resume_parked_permission", {
            outcome: lit("late_answer_discarded"),
            wait_ms: Date.now() - this.parkedPermissionWaitStart,
            late_ms: Date.now() - this.parkedPermissionFallbackFiredAt,
            ...this.parkedPromptEventFields,
          });
          this.parkedPermissionFallbackFiredAt = undefined;
        } else if (isBlankedDeny) this.keepWaitingAfterUnreadDeny(toolUseID);
        else this.fire("orphan_dropped");
    }
  }
  async routeStrictAnswer(message, lateAllow) {
    let parkedPermission = this.parkedPermission;
    let response = message.response;
    if (response.subtype !== "success") return this.dropStrictAnswer("not_an_answer", message);
    let response_2 = response.response;
    let cardHoldEnabled = isPermissionCardHoldEnabled();
    if (
      parkedPermission === undefined ||
      response_2?.toolUseID !== parkedPermission.tool_use_id ||
      (response.request_id !== parkedPermission.request_id &&
        !(cardHoldEnabled && this.isBlankedParkDeny(message)))
    )
      return this.dropStrictAnswer("not_the_park", message);
    let isBlankedDeny = cardHoldEnabled && response_2.behavior === "deny";
    if (this.parkSiblings.length > 0 || this.parkOwnAdoptedCall !== undefined)
      return this.dropStrictAnswer("adoption", message);
    if (this.answerClearing) return this.dropStrictAnswer("clear_pending", message);
    if (!this.promptStillOpen(parkedPermission)) return this.dropStrictAnswer("decided", message);
    if (response_2.behavior !== "deny" && this.deniedButUnread.has(parkedPermission.tool_use_id))
      return this.dropStrictAnswer("decided", message);
    if (
      !MARKETPLACE_ONLY_MANIFEST_FIELDS(this.answers.kind).safeParse(
        isBlankedDeny
          ? {
              behavior: "deny",
              message:
                typeof response_2.message === "string" && response_2.message !== ""
                  ? response_2.message
                  : REJECT_MESSAGE,
              toolUseID: response_2.toolUseID,
              ...(typeof response_2.interrupt === "boolean" && {
                interrupt: response_2.interrupt,
              }),
            }
          : response_2,
      ).success
    )
      return this.dropStrictAnswer("unparseable", message);
    let unresolvedToolUse = await this.findUnresolvedToolUse(parkedPermission.tool_use_id);
    if (unresolvedToolUse === null || !unresolvedToolUse.inLastAssistantTurn) {
      if (isBlankedDeny) this.deniedButUnread.add(parkedPermission.tool_use_id);
      return this.dropStrictAnswer("not_in_last_turn", message);
    }
    let content = unresolvedToolUse.holder.message.content;
    let block = Array.isArray(content)
      ? content.find((block) => block.type === "tool_use" && block.id === parkedPermission.tool_use_id)
      : undefined;
    if (block?.type !== "tool_use") return this.dropStrictAnswer("not_in_last_turn", message);
    let message_2 = message;
    for (let name of [response_2.toolName, response_2.tool_name, parkedPermission.details?.tool_name])
      if (typeof name === "string" && name !== block.name) {
        if (!isBlankedDeny || message.response.subtype !== "success")
          return this.dropStrictAnswer("tool_name_mismatch", message);
        message_2 = {
          ...message,
          response: {
            ...message.response,
            response: unmatchedAnswerDenial(parkedPermission.tool_use_id),
          },
        };
      }
    if (this.answerClearing) return this.dropStrictAnswer("clear_pending", message);
    if (!this.promptStillOpen(parkedPermission)) return this.dropStrictAnswer("decided", message);
    if (this.parkedPermissionFallbackTimer) {
      clearTimeout(this.parkedPermissionFallbackTimer);
      this.parkedPermissionFallbackTimer = undefined;
    }
    if (this.keptInheritedPromptPending()) this.io.sessionState.adoptRestoredPendingAction();
    if (!isBlankedDeny) this.answerClearing = true;
    try {
      if (!isBlankedDeny && !(await this.recordClearedBeforeRun(lit("strict_clear_unconfirmed"))))
        return this.dropStrictAnswer("clear_unconfirmed", message);
      if (!this.promptStillOpen(parkedPermission)) return this.dropStrictAnswer("decided", message);
      let queued = false;
      let enqueued = false;
      let behindCard = deviceCallsBehindCard(
        unresolvedToolUse.messageRows,
        parkedPermission.tool_use_id,
        this.supersededToolUseIds,
      );
      setLateAllowDecision(this.session, parkedPermission.tool_use_id, lateAllow);
      try {
        queued = await handleOrphanedPermissionResponse({
          message: message_2,
          denyIsRefusal: cardHoldEnabled,
          setAppState: this.store.setState,
          messageQueue: this.messageQueue,
          handledToolUseIds: this.handledOrphanedToolUseIds,
          startedBy: this.markAnswer,
          findUnresolved: async () => unresolvedToolUse.holder,
          messageRows: () =>
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_pillow", false)
              ? unresolvedToolUse.messageRows
              : undefined,
          notSent: () => behindCard,
          note: (toolUseId) =>
            this.lostCallsNote(
              unresolvedToolUse.messageRows ?? [],
              new Set([toolUseId, ...behindCard.map((entry) => entry.toolUseID)]),
            ),
          resumesInterruptedTurn: () => this.deferredParkedPermissionRescue !== undefined,
          cardInput: parkedPermission.recordedInput ?? null,
          interruptedTurnEcho: this.interruptedTurnEcho(),
          ccrTurnId: () => {
            if (parkedPermission.ccrTurnId !== undefined && this.drain.dequeueCount > 0) {
              logFeatureSad("ccs_card_turn_id", "restore_behind_a_turn");
              return;
            }
            return parkedPermission.ccrTurnId;
          },
          onEnqueued: () => {
            enqueued = true;
            this.kick();
          },
          enqueueContext: (toolUseId) => this.parkAnswerContext(toolUseId),
          dropContext: (toolUseId) => ({
            ...this.orphanDropContext(toolUseId),
            ...this.parkAnswerContext(toolUseId),
          }),
        });
      } catch (error) {
        logForDebugging(
          `[print.ts] strict parked-permission answer could not be queued: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
        queued = enqueued;
        if (!enqueued && this.deferredParkedPermissionRescue !== undefined)
          this.handledOrphanedToolUseIds.delete(parkedPermission.tool_use_id);
      }
      if (!queued) {
        takeLateAllowDecision(this.session, parkedPermission.tool_use_id);
        if (isBlankedDeny) this.keepWaitingAfterUnreadDeny(parkedPermission.tool_use_id);
        else if (
          this.deferredParkedPermissionRescue !== undefined &&
          !this.parkedPermissionHeld &&
          this.parkedPermissionFallbackTimer === undefined
        )
          this.arm();
        return this.dropStrictAnswer("not_queued", message);
      }
      this.deferredParkedPermissionRescue = undefined;
      this.notePromptEnded("own_answer");
      this.noteParkAnswerConsumed();
      this.dropLoaderSyntheticRows();
      if (isBlankedDeny) this.sendClearAfterDeny();
      logEvent("tengu_resume_parked_permission", {
        outcome: lit("consumed_persisted"),
        wait_ms: Date.now() - this.parkedPermissionWaitStart,
        ...this.parkedPromptEventFields,
      });
    } finally {
      if (!isBlankedDeny) this.answerClearing = false;
    }
  }
  keepWaitingAfterUnreadDeny(toolUseId) {
    if (toolUseId !== undefined) this.deniedButUnread.add(toolUseId);
    if (this.answers.kind !== "strict") this.unreadDenyRetires = true;
    if (
      this.deferredParkedPermissionRescue !== undefined &&
      (this.unreadDenyRetires || !this.parkedPermissionHeld) &&
      this.parkedPermissionFallbackTimer === undefined
    )
      this.arm();
  }
  sendClearAfterDeny() {
    this.clearBeforeRun({
      afterAnswerQueued: true,
    }).catch((error) => {
      logForDebugging(
        `[print.ts] Could not clear the session's record of a denied permission card; the Deny is already queued: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    });
  }
  isBlankedParkDeny(message) {
    let parkedPermission = this.parkedPermission;
    let response = message.response;
    return (
      parkedPermission !== undefined &&
      response.subtype === "success" &&
      response.response?.behavior === "deny" &&
      response.response.toolUseID === parkedPermission.tool_use_id &&
      response.request_id === parkedPermission.tool_use_id &&
      parkedPermission.details?.request_id === "" &&
      typeof parkedPermission.details.suppressed_request_id === "string" &&
      parkedPermission.details.suppressed_request_id !== ""
    );
  }
  async recordClearedBeforeRun(outcome) {
    let cleared = false;
    try {
      cleared = (await this.clearBeforeRun()) === true;
    } catch (error) {
      logForDebugging(
        `[print.ts] the host could not clear a parked permission's record: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
    if (cleared) return true;
    if (
      this.deferredParkedPermissionRescue !== undefined &&
      !this.parkedPermissionHeld &&
      this.parkedPermissionFallbackTimer === undefined
    )
      this.arm();
    logEvent("tengu_resume_parked_permission", {
      outcome,
      wait_ms: Date.now() - this.parkedPermissionWaitStart,
      ...this.parkedPromptEventFields,
    });
    return false;
  }
  promptStillOpen(parked) {
    return (
      this.deferredParkedPermissionRescue !== undefined &&
      !this.handledOrphanedToolUseIds.has(parked.tool_use_id)
    );
  }
  async answerForAdoptedCall(ask, allowed) {
    let { answer, unused } = await ask.answerFor(allowed);
    logEvent("tengu_resume_parked_permission", {
      outcome:
        unused === undefined ? lit("served_adopted_answer_consumed") : lit("served_adopted_asked_again"),
      reason: fromEnumOpt(unused),
      ...(answer !== undefined && {
        answer: fromEnum(answer.behavior),
      }),
      wait_ms: Date.now() - this.parkedPermissionWaitStart,
      ...this.parkedPromptEventFields,
    });
    return unused === undefined && answer !== undefined
      ? {
          answers: this.answers,
          result: answer,
        }
      : undefined;
  }
  noteParkAnswerConsumed() {
    if (this.parkAnswer === "none") this.parkAnswer = "consumed";
  }
  dropStrictAnswer(reason, message) {
    logForDebugging(
      `[print.ts] Dropping a control_response on the strict parked-permission lane: ${reason}`,
      {
        level: "warn",
      },
    );
    let toolUseID = message.response.subtype === "success" ? message.response.response?.toolUseID : undefined;
    let context = () => ({
      ...this.parkAnswerContext(this.parkedPermission?.tool_use_id),
      reason,
      ...getRiskColor(message),
      ...(typeof toolUseID === "string" &&
        toolUseID !== this.parkedPermission?.tool_use_id &&
        this.bootRetiredToolUseIds?.has(toolUseID) && {
          boot_retired: true,
        }),
    });
    logForDiagnosticsNoPII("warn", "cli_strict_answer_dropped", context);
    try {
      this.onStrictAnswerDropped?.(context());
    } catch (error) {
      logError(error);
    }
  }
  orphanDropContext(toolUseId) {
    return {
      boot_retired: toolUseId !== undefined && this.bootRetiredToolUseIds?.has(toolUseId) === true,
      interruption_kind: this.turnInterruptionState?.kind ?? "unknown",
    };
  }
  noteParkAnswerCameIn(message) {
    this.asAnswerCameIn = undefined;
    try {
      if (
        this.parkedPermission === undefined ||
        message.response.subtype !== "success" ||
        message.response.response?.toolUseID !== this.parkedPermission.tool_use_id
      )
        return;
      let now = Date.now();
      this.asAnswerCameIn = {
        park_ended_by_when_arrived: this.promptEnded?.by ?? "not_ended",
        arrived_after_park_end:
          this.promptEnded === undefined ? "not_ended" : durationBucket(now - this.promptEnded.atMs),
        queue_on_arrival: this.drain.intentBatchInFlight
          ? this.drain.pendingDispatchUuids.length > 0
            ? "command_dequeued"
            : "turn_started"
          : this.drain.running
            ? "busy_no_user_turn"
            : this.userIntentCommandQueued()
              ? "command_queued"
              : "idle",
        arrived_after_park_takeover: durationBucket(now - this.parkedPermissionWaitStart),
        answer_goes_first_flag_when_arrived: this.answerGoesFirstFlag(),
      };
    } catch (error) {
      logError(error);
    }
  }
  parkAnswerContext(toolUseId) {
    if (
      this.parkedPermission === undefined ||
      toolUseId !== this.parkedPermission.tool_use_id ||
      this.asAnswerCameIn === undefined
    )
      return {};
    let source = this.newInputWasAFrame ? "input_stream" : "internal_command";
    return {
      ...this.asAnswerCameIn,
      ...flagKey("park_ended_by_when_arrived", this.asAnswerCameIn.park_ended_by_when_arrived),
      ...flagKey(
        "answer_goes_first_flag_when_arrived",
        this.asAnswerCameIn.answer_goes_first_flag_when_arrived,
      ),
      park_ended_by_when_logged: this.promptEnded?.by ?? "not_ended",
      ...(this.promptEnded?.by === "new_input" &&
        this.newInputWasAFrame !== undefined && {
          new_input_from: source,
          ...flagKey("new_input_from", source),
        }),
      ...(this.promptEnded !== undefined &&
        this.promptEnded.by !== "own_answer" &&
        this.promptEnded.by !== "orphan_dropped" && {
          control_response_unread_at_park_end: this.promptEnded.responseUnread,
        }),
      answer_goes_first_flag_at_last_wait_check: this.flagAtLastWaitCheck ?? "no_wait_considered",
      drain_waited_for_answer: this.drainWaitedForAnswer,
      call_can_run_on_this_worker: !this.parkSettledAtBoot,
      ...setAsideCallsTelemetry(this.supersededToolUseIds, this.parkedPermission.tool_use_id),
      park_is_ask_user_question: this.parkedPermission.details?.tool_name === ASKUSERQUESTION,
      ...chatOriginField(),
    };
  }
  arm() {
    if (this.parkedPermission && this.deferredParkedPermissionRescue) {
      this.parkedPermissionFallbackTimer = setTimeout(
        (reason) => this.fire(reason),
        this.lane.answerWaitMs,
        "timeout",
      );
      this.parkedPermissionFallbackTimer.unref?.();
    }
    this.inheritedAsk?.startTimer();
  }
  endsStoppedTurns() {
    return this.lane.parkedStopRetires && this.endStoppedTurn !== undefined;
  }
  startStopRetirementDue() {
    let stopRetirementDue = this.stopRetirementDue;
    this.stopRetirementDue = undefined;
    if (stopRetirementDue !== undefined && !this.isShuttingDown() && !this.isTerminalShutdown())
      this.startStopRetirement(stopRetirementDue);
  }
  startStopRetirement({ toolUseIds, waitMs }) {
    this.stopSettlingPromise = this.retireInTranscript(toolUseIds, "interrupt", waitMs, true)
      .catch(logError)
      .finally(() => {
        this.stopSettlingPromise = undefined;
      });
  }
  decideIdleReport() {
    let stopOwed = this.stopRetirementDue !== undefined;
    if (!stopOwed && this.reportIdleAtTurnEndAllowed() && !this.io.hasStandingPrompt()) return "idle";
    let details = this.heldCardToReassert();
    if (!stopOwed && details && this.io.sessionState.getState() !== "requires_action")
      this.io.sessionState.notifyStateChanged("requires_action", details);
    else if (
      !stopOwed &&
      !this.drain.runningReported &&
      this.registrationKeepsPendingAction &&
      !this.inheritedPromptOwnsWorkerStatus() &&
      !this.isTerminalShutdown() &&
      !this.io.hasStandingPrompt()
    )
      this.reportInheritedPromptDecided();
    return "withheld";
  }
  heldCardToReassert() {
    if (!this.holdingParkedPermission() || this.answerClearing || this.isTerminalShutdown()) return;
    return this.parkedPermission?.details;
  }
  onCommitted(message) {
    let answersPark = this.answersInheritedPrompt(message);
    if (this.inheritedPromptPending() && !this.drain.intentBatchInFlight)
      logForDiagnosticsNoPII("warn", "cli_no_intent_batch_at_inherited_prompt", {
        held: this.holdingParkedPermission(),
        no_query: message.shouldQuery === false,
        ...chatOriginField(),
      });
    if (message.shouldQuery !== false) this.startStopRetirementDue();
    if (this.cutOffTurnLeftToTheNextWorker && this.drain.intentBatchInFlight) {
      this.declinedRedeliveries.runWhatNoRowVouchesFor();
      this.finishCopyThatAwaitedTheCutOffTurn();
    }
    if (this.inheritedPromptPending() && this.drain.intentBatchInFlight && !answersPark) {
      this.newInputWasAFrame = message.frameTiming !== undefined;
      this.fire("new_input");
    }
    try {
      if (answersPark) {
        if (this.parkAnswer !== "abandoned") {
          if (this.heldMessage() !== undefined) logFeatureOk("ccr_parked_message_held");
          this.parkAnswer = "committed";
          this.parkAnswerDequeue = this.drain.dequeueCount;
        }
      } else if (message.shouldQuery !== false && this.holdOpenFor !== undefined && !this.holdRevoked) {
        if (this.heldMessage() !== undefined) logFeatureSad("ccr_parked_message_held", "revoked_model_turn");
        this.holdRevoked = true;
        this.finishMessageLeftOpen();
      }
    } catch (error) {
      logError(error);
    }
    return !this.inheritedPromptOwnsWorkerStatus() || answersPark;
  }
  onShutdown() {
    this.heldAtShutdown = this.heldMessage();
    this.stopRetirementDue = undefined;
    if (this.parkedPermissionFallbackTimer) {
      clearTimeout(this.parkedPermissionFallbackTimer);
      this.parkedPermissionFallbackTimer = undefined;
    }
    if (
      this.parkedPermission &&
      this.deferredParkedPermissionRescue &&
      !this.holdingParkedPermission() &&
      !this.registrationKeepsPendingAction
    )
      this.withdrawCard(this.parkedPermission.request_id).catch(() => {});
    if (this.deferredParkedPermissionRescue !== undefined) this.notePromptEnded("shutdown");
    this.deferredParkedPermissionRescue = undefined;
    this.inheritedAsk?.stop("shutdown");
  }
}
//@ chunk-tyg7f3ek.js:378573-378663 placement (2.1.88 match: getRiskColor, 0.785)
function getRiskColor(riskLevel) {
  if (riskLevel.response.subtype !== "success") return {};
  return permissionResponseTelemetry(riskLevel.response.response);
}
//@ chunk-tyg7f3ek.js:378663-378840 placement
function durationBucket(ms) {
  for (let [limit, label] of [
    [20, "under_20ms"],
    [250, "under_250ms"],
    [1000, "under_1s"],
    [2000, "under_2s"],
    [5000, "under_5s"],
    [1e4, "under_10s"],
  ])
    if (ms < limit) return label;
  return "10s_or_more";
}
export {
  getRiskColor,
  unmatchedAnswerDenial,
  TENGU_WILD_BEACON,
  restoreParkedPrompt,
  cancelStaleParkedPrompt,
  findParkedPromptOpener,
  ParkedPermissionController,
  userMessagePlatformFields,
  PERMISSION_ANSWER_WAIT_MS,
  MAX_PARKED_ANSWER_AGE_MS,
  isPendingActionForTool,
};

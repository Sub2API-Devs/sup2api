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

//@ chunk-tyg7f3ek.js:327185-327458 placement
function userMessagePlatformFields(e, turnInterruption) {
  let r = turnInterruption === undefined ? undefined : e.findLast((s) => s.uuid === turnInterruption);
  if (r?.type !== "user") return {};
  return {
    ...(typeof r.clientPlatform === "string" && {
      clientPlatform: r.clientPlatform,
    }),
    ...(typeof r.turnAttributionKey === "string" && {
      inheritedTurnAttributionKey: r.turnAttributionKey,
    }),
  };
}
//@ chunk-tyg7f3ek.js:327458-327742 placement
function findParkedPromptOpener({ park, openerUuid, conversation }) {
  if (park === undefined || typeof park.details?.tool_name !== "string" || openerUuid === undefined) return;
  let found = conversation.find((y) => y.type === "user" && y.uuid === openerUuid);
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
  let P = journaled !== undefined ? journaled.turnInterruptionState : turnInterruptionState;
  let L = journaled?.offChainToolNames ?? new Map();
  let q = singlePendingAction(restored);
  let x = q !== undefined ? L.get(q) : undefined;
  let G =
    x !== undefined
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
  if (G.reattached)
    logForDebugging(
      `[print.ts] restored parked prompt's tool_use ${restored?.external?.pending_action?.tool_use_id} is off the resume chain but unresolved in the transcript \u2014 treating it as the interrupted turn's`,
    );
  let Z = L.size > 0 ? new Set([...(G.supersededToolUseIds ?? []), ...L.keys()]) : G.supersededToolUseIds;
  let supersededToolNames_2 =
    L.size > 0 ? new Map([...(G.supersededToolNames ?? []), ...L]) : G.supersededToolNames;
  let Ae = x !== undefined && !isPendingActionForTool(restored, x);
  if (Ae)
    logForDebugging(
      `[print.ts] restored parked prompt does not name the tool of the journaled off-chain call ${q} it points at: not parking on it`,
      {
        level: "warn",
      },
    );
  let Ue = Ae ? new Set([...(Z ?? [])].filter((Me) => Me !== q)) : Z;
  let supersededToolNames_3 = G.supersededToolNames;
  let nt = pendingActionRequestIds(restored, Z, tools);
  let pendingActionClass = G.reattached
    ? "derivable_off_chain"
    : classifyPendingAction(restored, Ue, supersededToolNames_3, nt);
  let parkedPermission = pendingActionResumeHint(restored, P, Ue, lane);
  let me = [...(supersededToolNames_3?.values() ?? [])];
  return {
    parkedPermission,
    supersededToolUseIds: Z,
    supersededToolNames: supersededToolNames_2,
    keepRequestIds: nt,
    pendingActionClass,
    interruptedTurn: {
      wasInterrupted: (P !== undefined && P.kind !== "none") || (Z?.size ?? 0) > 0,
      unresolvedToolUseIds: Z,
      nestingCall: me.some((Me) => Me === AGENT || Me === TASK)
        ? "agent"
        : me.some(isDialogToolName)
          ? "skill_or_repl"
          : "none",
    },
  };
}
//@ chunk-tyg7f3ek.js:329149-329847 placement
function cancelStaleParkedPrompt(
  headlessIO,
  restoredWorkerState,
  { parkedPermission, keepRequestIds, interruptedTurn, reportKept },
) {
  if (parkedPermission)
    logForDebugging(
      `[print.ts] deferring stale parked prompt cancel for ${parkedPermission.request_id} \u2014 a persisted control_response may arrive via SSE catch-up`,
    );
  try {
    let S = reconcilePendingActions(headlessIO, restoredWorkerState, {
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
    return S;
  } catch (error) {
    logForDebugging(`[print.ts] stale parked prompt cancel failed: ${error}`, {
      level: "error",
    });
    return new Set();
  }
}
//@ chunk-tyg7f3ek.js:329847-329998 placement
function setAsideCallsTelemetry(supersededToolUseIds, toolUseId) {
  let r = [...(supersededToolUseIds ?? [])];
  let index = r.indexOf(toolUseId);
  return index === -1
    ? {
        set_aside_calls: r.length,
      }
    : {
        set_aside_calls: r.length - 1,
        set_aside_calls_behind_prompt: index,
      };
}
//@ chunk-tyg7f3ek.js:329998-330065 placement
function isPendingActionForTool(e, n) {
  return e?.external?.pending_action?.tool_name === n;
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
var PERMISSION_ANSWER_WAIT_MS = 7000;
var ANSWER_WAIT_END_OUTCOMES = {
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
    let e = this.reRunToEnd === undefined ? [] : this.noteCancelledInTheQueue([this.reRunToEnd.uuid]);
    if (e.length > 0)
      logForDiagnosticsNoPII("info", "cli_rerun_gave_way_its_messages_cancelled", {
        count: e.length,
        ...chatOriginField(),
      });
    return e.length;
  }
  noteCopyAwaitsTheCutOffTurn() {
    this.aCopyAwaitsTheCutOffTurn = true;
  }
  cardsTurnTookIn(e) {
    if (!this.hasCarriedTheCutOffTurnOn() || !this.leftToTheCardsTurn().has(e)) return false;
    this.noteCopyAwaitsTheCutOffTurn();
    return true;
  }
  leftToTheCardsTurnWasReadLate() {
    return this.leftToTheCardsTurnReadLate;
  }
  leftToTheCardsTurn(e = false) {
    let readSendsLeftToTheCardsTurn = this.readSendsLeftToTheCardsTurn;
    if (readSendsLeftToTheCardsTurn === undefined || !isHeldMessageRecognitionOn())
      return this.sendsLeftToTheCardsTurn;
    this.readSendsLeftToTheCardsTurn = undefined;
    this.sendsLeftToTheCardsTurn = readSendsLeftToTheCardsTurn();
    this.leftToTheCardsTurnReadLate = !e;
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
        this.messageQueue.getCommandQueue().some((e) => e.resumeReason !== undefined)) ||
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
    return this.messageQueue.getCommandQueue().some((e) => isMainAgentCommand(e) && !isPassiveCommand(e));
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
  reRunAnswers(e) {
    return this.sendsLeftToReRun.has(e);
  }
  waitsForItsReRun(e) {
    return this.sendsLeftToReRun.has(e) && this.reRunHasStillToEnd();
  }
  reRunHasStillToEnd() {
    let reRunToEnd = this.reRunToEnd;
    return (
      reRunToEnd !== undefined &&
      (reRunToEnd.started ||
        this.drain.pendingDispatchUuids.includes(reRunToEnd.uuid) ||
        this.messageQueue.getCommandQueueSnapshot().some((n) => n.uuid === reRunToEnd.uuid))
    );
  }
  declinesWithdrawalOf(e) {
    let reRunToEnd = this.reRunToEnd;
    return (
      reRunToEnd?.uuid === e &&
      !reRunToEnd.listedByAStop &&
      this.sendsLeftToReRun.size > 0 &&
      this.reRunHasStillToEnd()
    );
  }
  noteAStopsReceipt(e, { aim, lateBind }) {
    let reRunToEnd = this.reRunToEnd;
    if (
      reRunToEnd !== undefined &&
      !lateBind &&
      e.still_queued.includes(reRunToEnd.uuid) &&
      (aim === undefined || reRunToEnd.namedBy(aim))
    )
      this.reRunToEnd = {
        ...reRunToEnd,
        listedByAStop: true,
      };
    return this.noteCancelledInTheQueue(e.cancelled ?? []);
  }
  noteCancelledInTheQueue(e) {
    let n = [];
    for (let r of this.takeWhatWasLeftToTheReRun(e))
      if (this.declinedRedeliveries.cancelWithItsReRun(r)) n.push(r);
    return n;
  }
  takeWhatWasLeftToTheReRun(e) {
    let reRunToEnd = this.reRunToEnd;
    if (reRunToEnd === undefined || !e.includes(reRunToEnd.uuid)) return [];
    let sendsLeftToReRun = this.sendsLeftToReRun;
    this.reRunToEnd = undefined;
    this.sendsLeftToReRun = new Set();
    return [...sendsLeftToReRun].flatMap((s) => normalizeUuidOrNull(s) ?? []);
  }
  leaveItsSendsTo(e) {
    if (
      e.uuid === undefined ||
      (e.isMeta === true &&
        e.resumedTurnUserMessageUuid === undefined &&
        e.sendsOfItsCompactedTurn === undefined)
    )
      return;
    this.sendsLeftToReRun = this.sendsTheRescueWouldAnswer;
    if (this.sendsLeftToReRun.size > 0) e.alsoLeftToThisReRun = [...this.sendsLeftToReRun];
    this.reRunToEnd = {
      uuid: e.uuid,
      started: false,
      namedBy: (n) => isAimedAtTurn(n, [e]),
      listedByAStop: false,
    };
  }
  noteBatch(e, n) {
    if (n === "dropped") {
      if (this.reRunToEnd?.listedByAStop === true) {
        this.noteCancelledInTheQueue(e);
        return;
      }
      let s = this.takeWhatWasLeftToTheReRun(e);
      for (let h of s) this.declinedRedeliveries.forget(h);
      if (s.length > 0)
        logForDiagnosticsNoPII("warn", "cli_rerun_dropped_its_messages_left_open", {
          count: s.length,
        });
      return;
    }
    let reRunToEnd = this.reRunToEnd;
    if (reRunToEnd === undefined || !e.includes(reRunToEnd.uuid)) return;
    this.reRunToEnd =
      n === "started"
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
            this.messageQueue.getCommandQueue().some((r) => this.answersInheritedPrompt(r)))) ||
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
  answersInheritedPrompt(e) {
    return (
      e.mode === "orphaned-permission" &&
      this.parkedPermission !== undefined &&
      e.orphanedPermission?.permissionResult?.toolUseID === this.parkedPermission.tool_use_id
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
  enqueueAdoptedServedCalls(e) {
    this.messageQueue.enqueue({
      ...this.adoptedServedCallsCommand(e),
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
      let e = this.sendsOfTheCompactedTurn(this.turnInterruptionState.message);
      this.carriesTheCutOffTurnOn = true;
      let n = {
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
        ...(e !== undefined && {
          sendsOfItsCompactedTurn: e,
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
      let r = isRemoteToolForwardingSwitchOn() ? (this.servedCallsToAdopt ?? []) : [];
      let s = this.inFlightServedCalls();
      for (let { call: w } of r) {
        s.adopt(w);
        s.add(w);
      }
      let provisionalHostTools = this.presentAdoptedHostTools(r.map(({ call: w }) => w));
      if (r.length > 0 || (this.journaledServedCalls ?? 0) > 0)
        this.io.sessionState.notifyInternalMetadataChanged({
          in_flight_served_calls: s.current(),
        });
      this.parkSiblings = r.filter(({ call: w }) => w.tool_use_id !== this.parkedPermission?.tool_use_id);
      this.parkOwnAdoptedCall = r.find(({ call: w }) => w.tool_use_id === this.parkedPermission?.tool_use_id);
      let parkAdopted = this.parkOwnAdoptedCall !== undefined;
      let [S, ...R] = this.resumedAgentCalls ?? [];
      if (this.parkOwnAdoptedCall !== undefined)
        s.noteParkedAtRestart(this.parkOwnAdoptedCall.call.tool_use_id);
      if (this.parkedPermission && this.parkOwnAdoptedCall !== undefined) {
        this.parkSettledAtBoot = true;
        this.notePromptEnded("settled_at_boot");
        if (this.parkedPermission.details?.input === undefined)
          this.withdrawCard(this.parkedPermission.request_id);
        else {
          let P = new PermissionCardAsk({
            card: this.parkedPermission,
            answerKind: this.answers.kind,
            waitMs: this.lane.answerWaitMs,
            maxAnswerAgeMs: MAX_PARKED_ANSWER_AGE_MS,
            allowWithoutInputIsEcho: false,
            withdrawCard: this.withdrawCard,
            unreadAnswersRead: () => {
              let L = this.receivedAnswersRead();
              return L && withDeadline(L, PERMISSION_ANSWER_WAIT_MS);
            },
            answerOff: async () => (await this.lane.inheritedAnswerOff?.()) ?? "absent",
          });
          this.inheritedAsk = P;
          s.offerInheritedAnswer(this.parkedPermission.tool_use_id, (L) => this.answerForAdoptedCall(P, L));
        }
        if (this.registrationKeepsPendingAction) this.io.sessionState.adoptRestoredPendingAction();
        let w = this.takeParkAdoption();
        logForDebugging(
          `[print.ts] Adopting ${w.length} served call(s) the previous worker had in flight, the parked one (toolUseID=${this.parkedPermission.tool_use_id}) included, instead of holding its prompt`,
        );
        this.enqueueAdoptedServedCalls(w);
        this.dropLoaderSyntheticRows();
        logEvent("tengu_resume_parked_permission", {
          outcome: lit("served_adopted_at_boot"),
          served_adopted: w.length,
          parked_tool_use_sha12: shortHash(this.parkedPermission.tool_use_id),
          parked_request_sha12: shortHash(this.parkedPermission.request_id),
        });
      } else if (this.parkedPermission) {
        logForDebugging(
          `[print.ts] Deferring interrupted-turn rescue for parked permission toolUseID=${this.parkedPermission.tool_use_id}${this.parkSiblings.length > 0 ? ` (with ${this.parkSiblings.length} adopted served call(s) riding its resolution)` : ""}`,
        );
        this.deferredParkedPermissionRescue = n;
        this.holdBehindPrompt();
        if (this.interruptedTurnsPrompt !== undefined || e !== undefined) {
          this.readSendsLeftToTheCardsTurn = this.sendsTheParkedTurnTookIn(
            this.turnInterruptionState.message,
            this.interruptedTurnsPrompt,
          );
          let w = this.leftToTheCardsTurn(true);
          if (this.interruptedTurnsPrompt === undefined)
            this.sendsOfTheCardsCompactedTurn = this.sendsOfTheCompactedTurn(
              this.turnInterruptionState.message,
              w,
            );
        }
      } else if (this.parkSiblings.length > 0) {
        logForDebugging(
          `[print.ts] Adopting ${this.parkSiblings.length} served call(s) the previous worker had in flight instead of re-running the interrupted turn: ${this.parkSiblings
            .map(({ call: w }) => w.tool_use_id)
            .join(",")}`,
        );
        this.enqueueAdoptedServedCalls(this.parkSiblings);
        this.parkSiblings = [];
        this.dropLoaderSyntheticRows();
      } else if (S !== undefined) {
        logForDebugging(
          `[print.ts] Running ${this.resumedAgentCalls?.length} Agent call(s) of the interrupted turn again, each to resume the agent it was waiting on, instead of re-running the turn`,
        );
        if (this.interruptedTurnsPrompt !== undefined || e !== undefined)
          this.sendsLeftToTheCardsTurn = this.sendsTheRescueWouldAnswer;
        if (this.interruptedTurnsPrompt === undefined) this.sendsOfTheCardsCompactedTurn = e;
        this.messageQueue.enqueue({
          mode: "orphaned-permission",
          agentId: mainAgentId(),
          value: [],
          orphanedPermission: {
            permissionResult: {
              behavior: "allow",
              updatedInput: {},
              toolUseID: S.toolUseID,
            },
            assistantMessage: S.assistantMessage,
            ...(R.length > 0 && {
              siblings: R,
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
        this.leaveItsSendsTo(n);
        this.messageQueue.enqueue({
          ...n,
          ...(this.turnInterruptionState.endedOnApiError !== undefined &&
            !this.supersededToolUseIds?.size && {
              yieldsToPersonPrompt: this.turnInterruptionState.endedOnApiError,
            }),
        });
      }
      if ((this.journaledServedCalls ?? 0) > 0 || r.length > 0)
        logEvent("tengu_remote_tool_restart_adoption", {
          journaled: this.journaledServedCalls ?? 0,
          adoptable: (this.servedCallsToAdopt ?? []).length,
          adopted: r.length,
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
    let n = this.takeParkSiblings();
    return parkOwnAdoptedCall === undefined ? n : [parkOwnAdoptedCall, ...n];
  }
  dropParkSiblings() {
    let e = this.inFlightServedCalls();
    let n = this.takeParkAdoption();
    for (let { call: r } of n) {
      e.takeAdopted(r.tool_use_id);
      e.remove(r.tool_use_id);
    }
    if (n.length > 0) {
      this.io.sessionState.notifyInternalMetadataChanged({
        in_flight_served_calls: e.current(),
      });
      logEvent("tengu_remote_tool_restart_adoption_dropped", {
        dropped: n.length,
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
    for (let e of this.answeredToolUseIds ?? []) this.handledOrphanedToolUseIds.add(e);
    if (this.parkedPermission && this.parkSettledAtBoot)
      this.handledOrphanedToolUseIds.add(this.parkedPermission.tool_use_id);
    if (this.keptSubagentAsk) this.handledOrphanedToolUseIds.add(this.keptSubagentAsk.card.tool_use_id);
  }
  parkedTurnToolUseIds(e) {
    return [e.tool_use_id, ...[...(this.bootRetiredToolUseIds ?? [])].filter((n) => n !== e.tool_use_id)];
  }
  async retireInTranscript(e, n, waitMs, s = false) {
    let { content, toolDenialKind } = ANSWER_WAIT_END_OUTCOMES[n];
    let S = () => {
      if (s) return false;
      switch (n) {
        case "new_input":
          return false;
        case "timeout":
          return this.drain.running || this.messageQueue.hasUserIntentCommandsInQueue();
        default:
          return this.drain.intentBatchInFlight || this.userIntentCommandQueued();
      }
    };
    let w = (async () => {
      let G = "retired_unanswered";
      let retiredCount = 0;
      let re = [];
      let Ae = [];
      let Ue = n === "interrupt" && this.endsStoppedTurns();
      let ce = false;
      try {
        let ie = [];
        for (let Se of e) {
          let holder = (await this.findUnresolvedToolUse(Se))?.holder;
          if (holder)
            ie.push({
              toolUseId: Se,
              assistantMessage: holder,
            });
        }
        if (S()) G = "retire_superseded";
        else if (ie.length > 0) {
          let me = [
            ie.reduce((acc, Ee) =>
              Ee.assistantMessage.timestamp > acc.assistantMessage.timestamp ? Ee : acc,
            ).assistantMessage,
            ...ie.map(({ toolUseId, assistantMessage }) =>
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
              retiredByStop: n === "interrupt",
            },
          ];
          await this.retirementWriter.append(me);
          re = me;
          retiredCount = ie.length;
          Ae = ie.map(({ assistantMessage }) => assistantMessage);
        }
      } catch (error) {
        G = "retire_write_failed";
        logForDebugging(
          `[print.ts] retiring parked permission(s) toolUseIDs=${e.join(",")} in the transcript failed: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
      let inConversation = false;
      if (Ae.length > 0 && getRemoteFeatureGateState(TENGU_CANDID_JUNIPER) === "on")
        try {
          inConversation = this.putAheadOfLoaderRows([
            ...Ae.toSorted((ie, Se) =>
              ie.timestamp < Se.timestamp ? -1 : ie.timestamp > Se.timestamp ? 1 : 0,
            ),
            ...re.slice(1),
          ]);
        } catch (error) {
          logError(error);
        }
      if (G === "retired_unanswered")
        try {
          await this.retirementWriter.flush();
          ce =
            Ue &&
            (await withDeadline(
              this.retirementWriter.storedForNextWorker?.(re.map((ie) => ie.uuid)) ?? Promise.resolve(true),
              PARKED_PROMPT_CONSTANTS,
            )) === true;
        } catch (error) {
          logForDebugging(
            `[print.ts] storing the retirement of toolUseIDs=${e.join(",")} failed: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
        }
      if (ce)
        try {
          this.endStoppedTurn?.(re);
        } catch (error) {
          logForDebugging(
            `[print.ts] ending the stopped turn for the client failed: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
      else if (Ue)
        logForDebugging(
          `[print.ts] Stop on parked permission(s) toolUseIDs=${e.join(",")}: the client is not told that the turn is over, because the rows that record the Stop are not confirmed as stored (outcome=${G}). The next worker may run the turn again.`,
          {
            level: "warn",
          },
        );
      return {
        outcome: G,
        retiredCount,
        endingWithheld: Ue ? !ce : undefined,
        inConversation,
      };
    })();
    this.parkedPermissionRetirement = w.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    let { outcome, retiredCount, endingWithheld, inConversation } = await w.finally(() => {
      this.parkedPermissionRetirement = undefined;
    });
    if (outcome === "retired_unanswered" || this.aCopyAwaitsTheCutOffTurn)
      await this.declinedRedeliveries.ackAfterRetirement();
    logEvent("tengu_resume_parked_permission", {
      outcome: fromEnum(outcome),
      reason: fromEnum(n),
      wait_ms: waitMs,
      retired_count: retiredCount,
      ending_withheld: endingWithheld,
      retired_rows_in_conversation: inConversation || undefined,
      ...this.parkedPromptEventFields,
    });
    if (
      n !== "new_input" &&
      outcome !== "retire_superseded" &&
      !S() &&
      !this.drain.running &&
      !this.isShuttingDown() &&
      !this.isTerminalShutdown() &&
      !this.drain.running &&
      !this.io.hasStandingPrompt()
    )
      this.reportInheritedPromptDecided();
  }
  fire(e) {
    if (this.parkedPermissionFallbackTimer) {
      clearTimeout(this.parkedPermissionFallbackTimer);
      this.parkedPermissionFallbackTimer = undefined;
    }
    if (e === "interrupt" || e === "rewind") this.inheritedAsk?.stop(e === "rewind" ? "rewound" : "stopped");
    let deferredParkedPermissionRescue = this.deferredParkedPermissionRescue;
    if (!deferredParkedPermissionRescue || !this.parkedPermission) {
      let y = this.parkAnswer === "consumed" && (e === "interrupt" || e === "rewind");
      if (y && (this.heldMessage() !== undefined || this.everHeldMessage)) {
        this.parkAnswer = "abandoned";
        try {
          logFeatureSad("ccr_parked_message_held", "stopped_before_run");
          if (e === "rewind") this.declinedRedeliveries.closeAfterRewind();
          else this.finishMessageLeftOpen();
        } catch (error) {
          logError(error);
        }
      }
      if (y || (this.cutOffTurnLeftToTheNextWorker && (e === "interrupt" || e === "rewind")))
        this.finishCopyThatAwaitedTheCutOffTurn();
      return;
    }
    if (this.isTerminalShutdown()) return;
    if (e === "timeout" && (this.inputWaitsForAnswer() || this.msLeftForUnreadAnswer() !== undefined)) {
      this.arm();
      return;
    }
    let r =
      e === "timeout" &&
      !this.unreadDenyRetires &&
      this.parkedPermission.details !== undefined &&
      typeof this.parkedPermission.details.tool_name === "string";
    if (r && this.io.sessionState.getState() === "requires_action") {
      this.arm();
      return;
    }
    if (
      r &&
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
        reason: fromEnum(e),
        wait_ms: Date.now() - this.parkedPermissionWaitStart,
        ...this.parkedPromptEventFields,
      });
      return;
    }
    let s = this.holdingParkedPermission();
    if (this.registrationKeepsPendingAction) this.io.sessionState.adoptRestoredPendingAction();
    this.deferredParkedPermissionRescue = undefined;
    this.notePromptEnded(e);
    this.finishMessageLeftOpen();
    this.handledOrphanedToolUseIds.add(this.parkedPermission.tool_use_id);
    this.withdrawCard(this.parkedPermission.request_id);
    logEvent("tengu_resume_stale_prompt_cancel", {
      kind: lit("permission"),
      withdrawn_at: lit("park_end"),
      prompt_call: lit("in_interrupted_turn"),
    });
    if (
      e === "interrupt" ||
      e === "new_input" ||
      e === "rewind" ||
      this.drain.running ||
      (s ? this.userIntentCommandQueued() : this.messageQueue.hasUserIntentCommandsInQueue())
    ) {
      logForDebugging(
        `[print.ts] Parked permission toolUseID=${this.parkedPermission.tool_use_id} superseded by new input during ${s ? "hold" : "wait"} (${e}) \u2014 dropping deferred rescue`,
      );
      logEvent("tengu_resume_parked_permission", {
        outcome: fromEnum(s ? "held_superseded" : "superseded"),
        reason: fromEnum(e),
        wait_ms: Date.now() - this.parkedPermissionWaitStart,
        ...this.parkedPromptEventFields,
      });
      if (e === "rewind") this.declinedRedeliveries.closeAfterRewind();
      let parkedStopRetires = e === "interrupt" && this.lane.parkedStopRetires;
      if (e === "new_input" && !this.isShuttingDown() && !this.isTerminalShutdown())
        this.retireInTranscript(
          this.parkedTurnToolUseIds(this.parkedPermission),
          e,
          Date.now() - this.parkedPermissionWaitStart,
        );
      else if (!this.drain.running && !this.isShuttingDown() && !this.isTerminalShutdown()) {
        if ((s || parkedStopRetires) && e === "interrupt") {
          let R = this.parkedTurnToolUseIds(this.parkedPermission);
          let w = Date.now() - this.parkedPermissionWaitStart;
          if (this.endsStoppedTurns())
            this.startStopRetirement({
              toolUseIds: R,
              waitMs: w,
            });
          else this.retireInTranscript(R, e, w);
        } else if ((s || this.registrationKeepsPendingAction) && !this.io.hasStandingPrompt())
          this.reportInheritedPromptDecided();
      } else if (
        e === "interrupt" &&
        this.drain.running &&
        this.endsStoppedTurns() &&
        !this.isShuttingDown() &&
        !this.isTerminalShutdown()
      ) {
        let R = {
          toolUseIds: this.parkedTurnToolUseIds(this.parkedPermission),
          waitMs: Date.now() - this.parkedPermissionWaitStart,
        };
        if (this.drain.runPhase === "waiting_for_agents") this.startStopRetirement(R);
        else this.stopRetirementDue = R;
      }
      if (e === "interrupt" || e === "rewind") this.finishCopyThatAwaitedTheCutOffTurn();
      else {
        this.carriesTheCutOffTurnOn = false;
        if (this.drain.intentBatchInFlight || this.userIntentCommandQueued())
          this.declinedRedeliveries.runWhatNoRowVouchesFor();
        else this.cutOffTurnLeftToTheNextWorker = true;
      }
      this.dropParkSiblings();
      return;
    }
    if (e === "timeout") this.parkedPermissionFallbackFiredAt = Date.now();
    if (e === "timeout") {
      this.carriesTheCutOffTurnOn = false;
      logForDebugging(
        `[print.ts] No persisted control_response for parked permission toolUseID=${this.parkedPermission.tool_use_id} \u2014 retiring it unanswered (nothing to hold); not re-running the interrupted turn`,
      );
      this.retireInTranscript(
        this.parkedTurnToolUseIds(this.parkedPermission),
        e,
        Date.now() - this.parkedPermissionWaitStart,
      );
      this.dropParkSiblings();
      return;
    }
    logForDebugging(
      `[print.ts] No consumable persisted control_response for parked permission toolUseID=${this.parkedPermission.tool_use_id} (${e}) \u2014 falling back to cancel + re-ask`,
    );
    let h = this.takeParkAdoption();
    if (h.length > 0) {
      this.enqueueAdoptedServedCalls(h);
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
        [...sendsLeftToTheCardsTurn].flatMap((S) => normalizeUuidOrNull(S) ?? []),
      );
    }
    logEvent("tengu_resume_parked_permission", {
      outcome: h.length > 0 ? lit("fallback_served_adopted") : lit("fallback_reask"),
      reason: fromEnum(e),
      wait_ms: Date.now() - this.parkedPermissionWaitStart,
      ...(h.length > 0 && {
        served_adopted: h.length,
      }),
      ...this.parkedPromptEventFields,
    });
    this.kick();
  }
  notePromptEnded(e) {
    this.promptEnded = {
      by: e,
      atMs: Date.now(),
      responseUnread: this.receivedAnswersRead() !== undefined,
    };
    this.promptEndSignal.resolve();
    this.readSendsLeftToTheCardsTurn = undefined;
    queueMicrotask(() => void this.endHoldBehindPrompt(e));
  }
  letPressedMessagesGo(e) {
    if (this.promptEnded !== undefined) return;
    this.messageQueue.letHeldBackGo((n) => isHumanOrigin(n.origin) && e(n));
  }
  holdBehindPrompt() {
    try {
      this.letHeldCommandsGo = this.messageQueue.holdBack((e) => {
        if (!isMainAgentCommand(e)) return false;
        if (
          canBatchWith(e) &&
          isHumanOrigin(e.origin) &&
          e.priority !== "now" &&
          e.sentNow !== true &&
          e.resumeReason === undefined &&
          (this.promptEnded !== undefined || this.inheritedPromptHoldCapable()) &&
          this.lane.holdsInputBehindPrompt?.() === true
        ) {
          logFeatureOk("ccr_input_held_behind_prompt");
          return true;
        }
        let n =
          e.mode === "task-notification" &&
          e.taskId !== undefined &&
          isTaskIdOfType("mcp_task", e.taskId) &&
          isMcpTasksEnabled();
        if (n)
          logForDebugging(
            `[print.ts] Holding back the notification of MCP task ${e.taskId}: it starts no turn until parked permission toolUseID=${this.parkedPermission?.tool_use_id} ends`,
          );
        return n;
      });
    } catch (error) {
      logError(error);
    }
  }
  async endHoldBehindPrompt(e) {
    if (e === "shutdown") return;
    try {
      await this.parkedPermissionRetirement;
      let n = this.letHeldCommandsGo?.() ?? 0;
      this.letHeldCommandsGo = undefined;
      if (n > 0)
        logForDebugging(
          `[print.ts] Parked permission toolUseID=${this.parkedPermission?.tool_use_id} ended (${e}): letting go ${n} command(s) held back for it`,
        );
    } catch (error) {
      logError(error);
    }
  }
  answerOnItsWay() {
    if (!this.inheritedPromptPending() || !this.userIntentCommandQueued()) return;
    let e = this.msLeftForUnreadAnswer();
    if (e === undefined) return;
    this.drainWaitedForAnswer = true;
    let startTime = performance.now();
    return withDeadline(
      Promise.race([this.receivedAnswersRead(), this.promptEndSignal.promise]).then(() => true),
      e,
    ).then((r) => {
      try {
        let s = performance.now() - startTime;
        let h = r === undefined ? "bound" : this.promptEnded === undefined ? "responses_read" : "park_ended";
        logForDiagnosticsNoPII("info", "cli_parked_answer_wait_over", {
          waited: durationBucket(s),
          waited_ms: Math.round(s),
          ended_by: h,
          ...flagKey("ended_by", h),
          ...chatOriginField(),
        });
        if (r === undefined) logFeatureSad("ccr_parked_answer_waited", "bound");
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
    let n = this.answerOnItsWayUntil - startTime;
    return n > 0 ? n : undefined;
  }
  answerGoesFirstFlag() {
    let e = this.lane.answerGoesFirst();
    return e === "cold" ? "flags_not_fetched" : e;
  }
  async onUnexpectedResponse(e, n) {
    this.noteParkAnswerCameIn(e);
    if (this.answers.kind === "strict") return this.routeStrictAnswer(e, n);
    let toolUseID =
      e.response.subtype === "success" && typeof e.response.response?.toolUseID === "string"
        ? e.response.response.toolUseID
        : undefined;
    if (this.inheritedAsk?.take(e, toolUseID)) return;
    let s = isPermissionCardHoldEnabled();
    let h =
      this.parkedPermission !== undefined &&
      toolUseID === this.parkedPermission.tool_use_id &&
      (e.response.request_id === this.parkedPermission.request_id || (s && this.isBlankedParkDeny(e)));
    let y = h && s && e.response.subtype === "success" && e.response.response?.behavior === "deny";
    if (
      h &&
      !(e.response.subtype === "success" && e.response.response?.behavior === "deny") &&
      toolUseID !== undefined &&
      this.deniedButUnread.has(toolUseID)
    ) {
      logForDebugging(
        `[print.ts] Dropping an answer for parked toolUseID=${toolUseID}: a Deny for it came first`,
      );
      return;
    }
    if (h && this.parkedPermissionFallbackTimer) {
      clearTimeout(this.parkedPermissionFallbackTimer);
      this.parkedPermissionFallbackTimer = undefined;
    }
    if (h && this.keptInheritedPromptPending()) this.io.sessionState.adoptRestoredPendingAction();
    if (
      this.inheritedPromptPending() &&
      toolUseID !== undefined &&
      toolUseID === this.parkedPermission?.tool_use_id &&
      !h
    ) {
      logForDebugging(
        `[print.ts] Dropping control_response for inherited parked permission toolUseID=${toolUseID}: request_id does not match the pending prompt`,
        {
          level: "warn",
        },
      );
      let q = "inherited_request_id_mismatch";
      logForDiagnosticsNoPII("warn", "cli_orphan_answer_dropped", () => ({
        ...this.orphanDropContext(toolUseID),
        ...this.parkAnswerContext(toolUseID),
        is_park_answer: false,
        tool_use_id_matches_park: true,
        reason: q,
        ...flagKey("reason", q),
        ...getRiskColor(e),
      }));
      return;
    }
    let S = false;
    let R =
      h &&
      this.parkedPermission !== undefined &&
      this.promptStillOpen(this.parkedPermission) &&
      this.inheritedPromptOwnsWorkerStatus() &&
      !this.io.hasStandingPrompt();
    if (R && !y) {
      if (this.answerClearing) {
        logForDebugging(
          `[print.ts] Dropping a copy of the parked permission's answer toolUseID=${toolUseID}: its clear is pending`,
        );
        return;
      }
      this.answerClearing = true;
      try {
        S = await this.recordClearedBeforeRun(lit("clear_unconfirmed"));
      } finally {
        this.answerClearing = S;
      }
      if (!S) return;
    }
    let w;
    let P;
    let L = [];
    try {
      w = await handleOrphanedPermissionResponse({
        message: e,
        denyIsRefusal: s,
        setAppState: this.store.setState,
        messageQueue: this.messageQueue,
        handledToolUseIds: this.handledOrphanedToolUseIds,
        startedBy: this.markAnswer,
        findUnresolved: async (q) => {
          let unresolvedToolUse = await this.findUnresolvedToolUse(q);
          P = unresolvedToolUse?.messageRows;
          if (h) L = deviceCallsBehindCard(P, q, this.supersededToolUseIds);
          return unresolvedToolUse?.holder ?? null;
        },
        ...(h && {
          initFirst: (q, x) => this.parkSiblings.length > 0 || this.servedElsewhere(q, x),
          siblings: () =>
            this.takeParkSiblings().map(({ call: q, assistantMessage }) => ({
              toolUseID: q.tool_use_id,
              assistantMessage,
            })),
          messageRows: () => P,
          notSent: () => [...(this.servedCallsNeverSent ?? []), ...L],
          note: (q) =>
            this.lostCallsNote(
              P ?? [],
              new Set([
                q,
                ...this.parkSiblings.map((parkSibling) => parkSibling.call.tool_use_id),
                ...L.map((x) => x.toolUseID),
              ]),
            ),
          resumesInterruptedTurn: () => this.deferredParkedPermissionRescue !== undefined,
          cardInput: this.parkedPermission?.recordedInput ?? null,
          interruptedTurnEcho: this.interruptedTurnEcho(),
        }),
        onEnqueued: () => {
          this.kick();
        },
        enqueueContext: (q) => this.parkAnswerContext(q),
        dropContext: (q) => ({
          ...this.orphanDropContext(q),
          ...this.parkAnswerContext(q),
          is_park_answer: h,
          tool_use_id_matches_park: q !== undefined && q === this.parkedPermission?.tool_use_id,
        }),
      });
    } catch (error) {
      if (h) {
        logForDebugging(
          `[print.ts] orphan handler threw for parked permission toolUseID=${this.parkedPermission?.tool_use_id}: ${error}`,
          {
            level: "error",
          },
        );
        if (y) this.keepWaitingAfterUnreadDeny(toolUseID);
        else this.fire("orphan_dropped");
      }
      throw error;
    } finally {
      if (S) this.answerClearing = false;
    }
    if (h) {
      if (w && this.deferredParkedPermissionRescue) {
        this.deferredParkedPermissionRescue = undefined;
        this.notePromptEnded("own_answer");
        this.noteParkAnswerConsumed();
        this.dropLoaderSyntheticRows();
        this.withdrawCard(this.parkedPermission.request_id);
        if (y && R && !this.io.hasStandingPrompt()) this.sendClearAfterDeny();
        logForDebugging(
          `[print.ts] Parked permission toolUseID=${toolUseID} resolved by persisted control_response \u2014 dropping deferred rescue`,
        );
        logEvent("tengu_resume_parked_permission", {
          outcome: lit("consumed_persisted"),
          wait_ms: Date.now() - this.parkedPermissionWaitStart,
          ...this.parkedPromptEventFields,
        });
      } else if (!w)
        if (this.parkedPermissionFallbackFiredAt !== undefined) {
          logEvent("tengu_resume_parked_permission", {
            outcome: lit("late_answer_discarded"),
            wait_ms: Date.now() - this.parkedPermissionWaitStart,
            late_ms: Date.now() - this.parkedPermissionFallbackFiredAt,
            ...this.parkedPromptEventFields,
          });
          this.parkedPermissionFallbackFiredAt = undefined;
        } else if (y) this.keepWaitingAfterUnreadDeny(toolUseID);
        else this.fire("orphan_dropped");
    }
  }
  async routeStrictAnswer(e, n) {
    let parkedPermission = this.parkedPermission;
    let response = e.response;
    if (response.subtype !== "success") return this.dropStrictAnswer("not_an_answer", e);
    let response_2 = response.response;
    let y = isPermissionCardHoldEnabled();
    if (
      parkedPermission === undefined ||
      response_2?.toolUseID !== parkedPermission.tool_use_id ||
      (response.request_id !== parkedPermission.request_id && !(y && this.isBlankedParkDeny(e)))
    )
      return this.dropStrictAnswer("not_the_park", e);
    let S = y && response_2.behavior === "deny";
    if (this.parkSiblings.length > 0 || this.parkOwnAdoptedCall !== undefined)
      return this.dropStrictAnswer("adoption", e);
    if (this.answerClearing) return this.dropStrictAnswer("clear_pending", e);
    if (!this.promptStillOpen(parkedPermission)) return this.dropStrictAnswer("decided", e);
    if (response_2.behavior !== "deny" && this.deniedButUnread.has(parkedPermission.tool_use_id))
      return this.dropStrictAnswer("decided", e);
    if (
      !MARKETPLACE_ONLY_MANIFEST_FIELDS(this.answers.kind).safeParse(
        S
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
      return this.dropStrictAnswer("unparseable", e);
    let unresolvedToolUse = await this.findUnresolvedToolUse(parkedPermission.tool_use_id);
    if (unresolvedToolUse === null || !unresolvedToolUse.inLastAssistantTurn) {
      if (S) this.deniedButUnread.add(parkedPermission.tool_use_id);
      return this.dropStrictAnswer("not_in_last_turn", e);
    }
    let content = unresolvedToolUse.holder.message.content;
    let P = Array.isArray(content)
      ? content.find((q) => q.type === "tool_use" && q.id === parkedPermission.tool_use_id)
      : undefined;
    if (P?.type !== "tool_use") return this.dropStrictAnswer("not_in_last_turn", e);
    let message = e;
    for (let q of [response_2.toolName, response_2.tool_name, parkedPermission.details?.tool_name])
      if (typeof q === "string" && q !== P.name) {
        if (!S || e.response.subtype !== "success") return this.dropStrictAnswer("tool_name_mismatch", e);
        message = {
          ...e,
          response: {
            ...e.response,
            response: unmatchedAnswerDenial(parkedPermission.tool_use_id),
          },
        };
      }
    if (this.answerClearing) return this.dropStrictAnswer("clear_pending", e);
    if (!this.promptStillOpen(parkedPermission)) return this.dropStrictAnswer("decided", e);
    if (this.parkedPermissionFallbackTimer) {
      clearTimeout(this.parkedPermissionFallbackTimer);
      this.parkedPermissionFallbackTimer = undefined;
    }
    if (this.keptInheritedPromptPending()) this.io.sessionState.adoptRestoredPendingAction();
    if (!S) this.answerClearing = true;
    try {
      if (!S && !(await this.recordClearedBeforeRun(lit("strict_clear_unconfirmed"))))
        return this.dropStrictAnswer("clear_unconfirmed", e);
      if (!this.promptStillOpen(parkedPermission)) return this.dropStrictAnswer("decided", e);
      let q = false;
      let x = false;
      let G = deviceCallsBehindCard(
        unresolvedToolUse.messageRows,
        parkedPermission.tool_use_id,
        this.supersededToolUseIds,
      );
      setLateAllowDecision(this.session, parkedPermission.tool_use_id, n);
      try {
        q = await handleOrphanedPermissionResponse({
          message,
          denyIsRefusal: y,
          setAppState: this.store.setState,
          messageQueue: this.messageQueue,
          handledToolUseIds: this.handledOrphanedToolUseIds,
          startedBy: this.markAnswer,
          findUnresolved: async () => unresolvedToolUse.holder,
          messageRows: () =>
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_pillow", false)
              ? unresolvedToolUse.messageRows
              : undefined,
          notSent: () => G,
          note: (Z) =>
            this.lostCallsNote(
              unresolvedToolUse.messageRows ?? [],
              new Set([Z, ...G.map((re) => re.toolUseID)]),
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
            x = true;
            this.kick();
          },
          enqueueContext: (Z) => this.parkAnswerContext(Z),
          dropContext: (Z) => ({
            ...this.orphanDropContext(Z),
            ...this.parkAnswerContext(Z),
          }),
        });
      } catch (error) {
        logForDebugging(
          `[print.ts] strict parked-permission answer could not be queued: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
        q = x;
        if (!x && this.deferredParkedPermissionRescue !== undefined)
          this.handledOrphanedToolUseIds.delete(parkedPermission.tool_use_id);
      }
      if (!q) {
        takeLateAllowDecision(this.session, parkedPermission.tool_use_id);
        if (S) this.keepWaitingAfterUnreadDeny(parkedPermission.tool_use_id);
        else if (
          this.deferredParkedPermissionRescue !== undefined &&
          !this.parkedPermissionHeld &&
          this.parkedPermissionFallbackTimer === undefined
        )
          this.arm();
        return this.dropStrictAnswer("not_queued", e);
      }
      this.deferredParkedPermissionRescue = undefined;
      this.notePromptEnded("own_answer");
      this.noteParkAnswerConsumed();
      this.dropLoaderSyntheticRows();
      if (S) this.sendClearAfterDeny();
      logEvent("tengu_resume_parked_permission", {
        outcome: lit("consumed_persisted"),
        wait_ms: Date.now() - this.parkedPermissionWaitStart,
        ...this.parkedPromptEventFields,
      });
    } finally {
      if (!S) this.answerClearing = false;
    }
  }
  keepWaitingAfterUnreadDeny(e) {
    if (e !== undefined) this.deniedButUnread.add(e);
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
  isBlankedParkDeny(e) {
    let parkedPermission = this.parkedPermission;
    let response = e.response;
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
    let n = false;
    try {
      n = (await this.clearBeforeRun()) === true;
    } catch (error) {
      logForDebugging(
        `[print.ts] the host could not clear a parked permission's record: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
    if (n) return true;
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
  promptStillOpen(e) {
    return (
      this.deferredParkedPermissionRescue !== undefined && !this.handledOrphanedToolUseIds.has(e.tool_use_id)
    );
  }
  async answerForAdoptedCall(e, n) {
    let { answer, unused } = await e.answerFor(n);
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
  dropStrictAnswer(e, n) {
    logForDebugging(`[print.ts] Dropping a control_response on the strict parked-permission lane: ${e}`, {
      level: "warn",
    });
    let toolUseID = n.response.subtype === "success" ? n.response.response?.toolUseID : undefined;
    let s = () => ({
      ...this.parkAnswerContext(this.parkedPermission?.tool_use_id),
      reason: e,
      ...getRiskColor(n),
      ...(typeof toolUseID === "string" &&
        toolUseID !== this.parkedPermission?.tool_use_id &&
        this.bootRetiredToolUseIds?.has(toolUseID) && {
          boot_retired: true,
        }),
    });
    logForDiagnosticsNoPII("warn", "cli_strict_answer_dropped", s);
    try {
      this.onStrictAnswerDropped?.(s());
    } catch (error) {
      logError(error);
    }
  }
  orphanDropContext(e) {
    return {
      boot_retired: e !== undefined && this.bootRetiredToolUseIds?.has(e) === true,
      interruption_kind: this.turnInterruptionState?.kind ?? "unknown",
    };
  }
  noteParkAnswerCameIn(e) {
    this.asAnswerCameIn = undefined;
    try {
      if (
        this.parkedPermission === undefined ||
        e.response.subtype !== "success" ||
        e.response.response?.toolUseID !== this.parkedPermission.tool_use_id
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
  parkAnswerContext(e) {
    if (
      this.parkedPermission === undefined ||
      e !== this.parkedPermission.tool_use_id ||
      this.asAnswerCameIn === undefined
    )
      return {};
    let n = this.newInputWasAFrame ? "input_stream" : "internal_command";
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
          new_input_from: n,
          ...flagKey("new_input_from", n),
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
      this.parkedPermissionFallbackTimer = setTimeout((e) => this.fire(e), this.lane.answerWaitMs, "timeout");
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
    let e = this.stopRetirementDue !== undefined;
    if (!e && this.reportIdleAtTurnEndAllowed() && !this.io.hasStandingPrompt()) return "idle";
    let r = this.heldCardToReassert();
    if (!e && r && this.io.sessionState.getState() !== "requires_action")
      this.io.sessionState.notifyStateChanged("requires_action", r);
    else if (
      !e &&
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
  onCommitted(e) {
    let n = this.answersInheritedPrompt(e);
    if (this.inheritedPromptPending() && !this.drain.intentBatchInFlight)
      logForDiagnosticsNoPII("warn", "cli_no_intent_batch_at_inherited_prompt", {
        held: this.holdingParkedPermission(),
        no_query: e.shouldQuery === false,
        ...chatOriginField(),
      });
    if (e.shouldQuery !== false) this.startStopRetirementDue();
    if (this.cutOffTurnLeftToTheNextWorker && this.drain.intentBatchInFlight) {
      this.declinedRedeliveries.runWhatNoRowVouchesFor();
      this.finishCopyThatAwaitedTheCutOffTurn();
    }
    if (this.inheritedPromptPending() && this.drain.intentBatchInFlight && !n) {
      this.newInputWasAFrame = e.frameTiming !== undefined;
      this.fire("new_input");
    }
    try {
      if (n) {
        if (this.parkAnswer !== "abandoned") {
          if (this.heldMessage() !== undefined) logFeatureOk("ccr_parked_message_held");
          this.parkAnswer = "committed";
          this.parkAnswerDequeue = this.drain.dequeueCount;
        }
      } else if (e.shouldQuery !== false && this.holdOpenFor !== undefined && !this.holdRevoked) {
        if (this.heldMessage() !== undefined) logFeatureSad("ccr_parked_message_held", "revoked_model_turn");
        this.holdRevoked = true;
        this.finishMessageLeftOpen();
      }
    } catch (error) {
      logError(error);
    }
    return !this.inheritedPromptOwnsWorkerStatus() || n;
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
//@ chunk-tyg7f3ek.js:378573-378663 placement = getRiskColor (0.785)
function getRiskColor(riskLevel) {
  if (riskLevel.response.subtype !== "success") return {};
  return permissionResponseTelemetry(riskLevel.response.response);
}
//@ chunk-tyg7f3ek.js:378663-378840 placement
function durationBucket(e) {
  for (let [n, r] of [
    [20, "under_20ms"],
    [250, "under_250ms"],
    [1000, "under_1s"],
    [2000, "under_2s"],
    [5000, "under_5s"],
    [1e4, "under_10s"],
  ])
    if (e < n) return r;
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

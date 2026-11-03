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
import { gn } from "../../utils/shortHash.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { chatOriginField } from "./transcriptLeaves.js";
import { isHeldMessageRecognitionOn, heldMessageUuids } from "./queuedMessageUtils.js";
import { $f, Ofn, xjt, Pjt } from "../../utils/messageQueueManager.js";
import { Vt } from "../../utils/agentId.js";
import { isAimedAtTurn } from "./runEndReasons.js";
import { B7 } from "../../services/remoteTools/shellForwarding.js";
import { logError } from "../../utils/log.js";
import { oBo, resumeInterruptedTurn } from "../../utils/conversationRecovery.js";
import { relayTurnFlags } from "../../services/projectsRelay/relayConfig.js";
import { bmn } from "../../utils/cronFireTexts.js";
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
function userMessagePlatformFields(e, n) {
  let r = n === void 0 ? void 0 : e.findLast((s) => s.uuid === n);
  if (r?.type !== "user") return {};
  return {
    ...(typeof r.clientPlatform === "string" && { clientPlatform: r.clientPlatform }),
    ...(typeof r.turnAttributionKey === "string" && { inheritedTurnAttributionKey: r.turnAttributionKey }),
  };
}
//@ chunk-tyg7f3ek.js:327458-327742 placement
function findParkedPromptOpener({ park: park, openerUuid: openerUuid, conversation: conversation }) {
  if (park === void 0 || typeof park.details?.tool_name !== "string" || openerUuid === void 0) return;
  let found = conversation.find((y) => y.type === "user" && y.uuid === openerUuid);
  if (found === void 0 || !isHumanTurn(found)) return;
  let parse = Date.parse(found.timestamp);
  return Number.isFinite(parse) ? { uuid: openerUuid, openedAtMs: parse } : void 0;
}
/**
 * 恢复会话时还原上一个 worker 挂起的权限提示（parked prompt），判断是否可接管其工具调用。
 */
//@ chunk-tyg7f3ek.js:327742-329149 placement
async function restoreParkedPrompt({
  restored: restored,
  turnInterruptionState: turnInterruptionState,
  chain: chain,
  supersededToolUseIds: supersededToolUseIds,
  supersededToolNames: supersededToolNames,
  journaled: journaled,
  tools: tools,
  findUnresolved: findUnresolved,
  lane: lane,
}) {
  let P = journaled !== void 0 ? journaled.turnInterruptionState : turnInterruptionState,
    L = journaled?.offChainToolNames ?? new Map(),
    q = singlePendingAction(restored),
    x = q !== void 0 ? L.get(q) : void 0,
    G =
      x !== void 0
        ? {
            supersededToolUseIds: supersededToolUseIds,
            supersededToolNames: supersededToolNames,
            reattached: !1,
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
  let Z = L.size > 0 ? new Set([...(G.supersededToolUseIds ?? []), ...L.keys()]) : G.supersededToolUseIds,
    re = L.size > 0 ? new Map([...(G.supersededToolNames ?? []), ...L]) : G.supersededToolNames,
    Ae = x !== void 0 && !isPendingActionForTool(restored, x);
  if (Ae)
    logForDebugging(
      `[print.ts] restored parked prompt does not name the tool of the journaled off-chain call ${q} it points at: not parking on it`,
      { level: "warn" },
    );
  let Ue = Ae ? new Set([...(Z ?? [])].filter((Me) => Me !== q)) : Z,
    supersededToolNames_2 = G.supersededToolNames,
    nt = pendingActionRequestIds(restored, Z, tools),
    ie = G.reattached
      ? "derivable_off_chain"
      : classifyPendingAction(restored, Ue, supersededToolNames_2, nt),
    Se = pendingActionResumeHint(restored, P, Ue, lane),
    me = [...(supersededToolNames_2?.values() ?? [])];
  return {
    parkedPermission: Se,
    supersededToolUseIds: Z,
    supersededToolNames: re,
    keepRequestIds: nt,
    pendingActionClass: ie,
    interruptedTurn: {
      wasInterrupted: (P !== void 0 && P.kind !== "none") || (Z?.size ?? 0) > 0,
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
  e,
  n,
  {
    parkedPermission: parkedPermission,
    keepRequestIds: keepRequestIds,
    interruptedTurn: interruptedTurn,
    reportKept: reportKept,
  },
) {
  if (parkedPermission)
    logForDebugging(
      `[print.ts] deferring stale parked prompt cancel for ${parkedPermission.request_id} \u2014 a persisted control_response may arrive via SSE catch-up`,
    );
  try {
    let S = reconcilePendingActions(e, n, {
      exceptRequestId: parkedPermission?.request_id,
      keepRequestIds: keepRequestIds,
      interruptedTurn: interruptedTurn,
    });
    if (reportKept)
      e.write({
        type: "system",
        subtype: "inherited_asks_settled",
        kept_request_ids: [...(parkedPermission ? [parkedPermission.request_id] : []), ...keepRequestIds],
        uuid: randomUUID_14(),
        session_id: getSessionId(),
      }).catch((R) => {
        (logForDebugging(`[print.ts] inherited_asks_settled write failed: ${R}`, { level: "error" }),
          logFeatureBad("ccr_input_held_behind_prompt", "report_write_failed"));
      });
    return S;
  } catch (error) {
    return (
      logForDebugging(`[print.ts] stale parked prompt cancel failed: ${error}`, { level: "error" }),
      new Set()
    );
  }
}
//@ chunk-tyg7f3ek.js:329847-329998 placement
function setAsideCallsTelemetry(e, n) {
  let r = [...(e ?? [])],
    index = r.indexOf(n);
  return index === -1
    ? { set_aside_calls: r.length }
    : { set_aside_calls: r.length - 1, set_aside_calls_behind_prompt: index };
}
//@ chunk-tyg7f3ek.js:329998-330065 placement
function isPendingActionForTool(e, n) {
  return e?.external?.pending_action?.tool_name === n;
}
//@ chunk-tyg7f3ek.js:330065-330272 placement
var PARKED_PROMPT_CONSTANTS = 3000,
  TENGU_WILD_BEACON = "tengu_wild_beacon",
  cS = 180000,
  kq =
    "This tool call was refused and did not run: the permission answer for it could not be matched to this call. Do not run it again unless the user asks you to.";
//@ chunk-tyg7f3ek.js:330272-330334 placement
function unmatchedAnswerDenial(e) {
  return { behavior: "deny", message: kq, toolUseID: e };
}
//@ chunk-tyg7f3ek.js:330334-330505 placement
var PERMISSION_ANSWER_WAIT_MS = 7000,
  wq = {
    interrupt: { content: REJECT_MESSAGE, toolDenialKind: "user-rejected" },
    new_input: { content: APPROVAL_UNANSWERED_MESSAGE, toolDenialKind: "cancelled" },
    timeout: { content: APPROVAL_EXPIRED_MESSAGE, toolDenialKind: "cancelled" },
  };
/**
 * headless/CCR 会话中挂起权限请求的总控：恢复、接管上一 worker 的在途调用、继承已决请求、超时撤销与重新询问。
 */
//@ chunk-tyg7f3ek.js:330505-375915 placement
class ParkedPermissionController {
  deferredParkedPermissionRescue;
  carriesTheCutOffTurnOn = !1;
  aCopyAwaitsTheCutOffTurn = !1;
  cutOffTurnGivenUp = !1;
  cutOffTurnLeftToTheNextWorker = !1;
  parkedPermissionRetirement;
  parkedPermissionFallbackTimer;
  parkedPermissionHeld = !1;
  registrationKeepsPendingAction;
  parkedPermissionWaitStart = Date.now();
  parkedPermissionFallbackFiredAt;
  parkSiblings = [];
  parkOwnAdoptedCall;
  parkSettledAtBoot = !1;
  inheritedAsk;
  keptSubagentAsk;
  holdOpenFor;
  interruptedTurnsPrompt;
  fromInterruptedTurnsPrompt;
  parkAnswer = "none";
  parkAnswerDequeue = 0;
  holdRevoked = !1;
  everHeldMessage = !1;
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
  unreadDenyRetires = !1;
  receivedAnswersRead;
  answerClearing = !1;
  promptEnded;
  promptEndSignal = Promise.withResolvers();
  letHeldCommandsGo;
  answerOnItsWayUntil;
  flagAtLastWaitCheck;
  drainWaitedForAnswer = !1;
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
  leftToTheCardsTurnReadLate = !1;
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
    session: e,
    parkedPermission: n,
    holdOpenFor: r,
    turnInterruptionState: s,
    interruptedTurnsPrompt: h,
    fromInterruptedTurnsPrompt: y = {},
    supersededToolUseIds: S,
    bootRetiredToolUseIds: R,
    answeredToolUseIds: w,
    initParkReport: P,
    pendingActionClass: L,
    cutOffAgentCalls: q,
    resumedAgentCalls: x,
    keptSubagentAsk: G,
    servedCallsToAdopt: Z,
    servedCallsNeverSent: re,
    journaledServedCalls: Ae,
    withdrawCard: Ue,
    retirementWriter: ce,
    endStoppedTurn: nt,
    onStrictAnswerDropped: ie,
    inputWaitsForAnswer: Se = () => !1,
    clearBeforeRun: me,
    receivedAnswersRead: Me = () => {
      return;
    },
    answers: Ee,
    lane: He,
    io: Xe,
    drain: We,
    messageQueue: St,
    declinedRedeliveries: wt,
    store: Lt,
    kick: pn,
    isShuttingDown: _n,
    isTerminalShutdown: Mn,
    findUnresolvedToolUse: jn,
    markAnswer: Jn,
    reportInheritedPromptDecided: ze,
    reportIdleAtTurnEndAllowed: Dr,
    dropLoaderSyntheticRows: $r,
    removeInterruptedMessage: $n,
    putAheadOfLoaderRows: ut,
    sendsTheInterruptedTurnHolds: Yt = () => new Set(),
    sendsOfTheCompactedTurn: nn = () => {
      return;
    },
    sendsTheParkedTurnTookIn: kn = () => () => new Set(),
    adoptedServedCallsCommand: En,
    lostCallsNote: Mr = () => {
      return;
    },
    inFlightServedCalls: Pn,
    presentAdoptedHostTools: oo,
    servedElsewhere: No,
  }) {
    ((this.session = e),
      (this.parkedPermission = n),
      (this.holdOpenFor = r),
      (this.turnInterruptionState = s),
      (this.interruptedTurnsPrompt = h),
      (this.fromInterruptedTurnsPrompt = y),
      (this.supersededToolUseIds = S),
      (this.bootRetiredToolUseIds = R),
      (this.answeredToolUseIds = w),
      (this.initParkReport = P),
      (this.pendingActionClass = L),
      (this.cutOffAgentCalls = q),
      (this.resumedAgentCalls = x),
      (this.keptSubagentAsk = G),
      (this.inheritedAsk = G?.ask),
      (this.servedCallsToAdopt = Z),
      (this.servedCallsNeverSent = re),
      (this.journaledServedCalls = Ae),
      (this.withdrawCard = Ue),
      (this.retirementWriter = ce),
      (this.endStoppedTurn = nt),
      (this.onStrictAnswerDropped = ie),
      (this.inputWaitsForAnswer = Se),
      (this.clearBeforeRun = me),
      (this.receivedAnswersRead = Me),
      (this.answers = Ee),
      (this.lane = He),
      (this.io = Xe),
      (this.drain = We),
      (this.messageQueue = St),
      (this.declinedRedeliveries = wt),
      (this.store = Lt),
      (this.kick = pn),
      (this.isShuttingDown = _n),
      (this.isTerminalShutdown = Mn),
      (this.findUnresolvedToolUse = jn),
      (this.markAnswer = Jn),
      (this.reportInheritedPromptDecided = ze),
      (this.reportIdleAtTurnEndAllowed = Dr),
      (this.dropLoaderSyntheticRows = $r),
      (this.removeInterruptedMessage = $n),
      (this.putAheadOfLoaderRows = ut),
      (this.sendsTheInterruptedTurnHolds = Yt),
      (this.sendsOfTheCompactedTurn = nn),
      (this.sendsTheParkedTurnTookIn = kn),
      (this.adoptedServedCallsCommand = En),
      (this.lostCallsNote = Mr),
      (this.inFlightServedCalls = Pn),
      (this.presentAdoptedHostTools = oo),
      (this.servedElsewhere = No),
      (this.registrationKeepsPendingAction = P !== void 0),
      (this.io.sessionState.heldRequiresAction = () =>
        this.drain.running && this.drain.runPhase !== "waiting_for_agents"
          ? void 0
          : this.heldCardToReassert()),
      (this.parkedPromptEventFields = this.parkedPermission
        ? {
            parked_tool_use_sha12: gn(this.parkedPermission.tool_use_id),
            parked_request_sha12: gn(this.parkedPermission.request_id),
          }
        : {}));
  }
  get retirement() {
    return this.parkedPermissionRetirement;
  }
  get stopSettling() {
    return this.stopSettlingPromise;
  }
  get stopRetirementOwed() {
    return this.stopRetirementDue !== void 0;
  }
  get handledToolUseIds() {
    return this.handledOrphanedToolUseIds;
  }
  holdingParkedPermission() {
    return this.parkedPermissionHeld && this.deferredParkedPermissionRescue !== void 0;
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
    ((this.carriesTheCutOffTurnOn = !1), this.declinedRedeliveries.runWhatNoRowVouchesFor());
    let e = this.reRunToEnd === void 0 ? [] : this.noteCancelledInTheQueue([this.reRunToEnd.uuid]);
    if (e.length > 0)
      logForDiagnosticsNoPII("info", "cli_rerun_gave_way_its_messages_cancelled", {
        count: e.length,
        ...chatOriginField(),
      });
    return e.length;
  }
  noteCopyAwaitsTheCutOffTurn() {
    this.aCopyAwaitsTheCutOffTurn = !0;
  }
  cardsTurnTookIn(e) {
    if (!this.hasCarriedTheCutOffTurnOn() || !this.leftToTheCardsTurn().has(e)) return !1;
    return (this.noteCopyAwaitsTheCutOffTurn(), !0);
  }
  leftToTheCardsTurnWasReadLate() {
    return this.leftToTheCardsTurnReadLate;
  }
  leftToTheCardsTurn(e = !1) {
    let readSendsLeftToTheCardsTurn = this.readSendsLeftToTheCardsTurn;
    if (readSendsLeftToTheCardsTurn === void 0 || !isHeldMessageRecognitionOn())
      return this.sendsLeftToTheCardsTurn;
    if (
      ((this.readSendsLeftToTheCardsTurn = void 0),
      (this.sendsLeftToTheCardsTurn = readSendsLeftToTheCardsTurn()),
      (this.leftToTheCardsTurnReadLate = !e),
      this.sendsLeftToTheCardsTurn.size > 0)
    ) {
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
        this.messageQueue.getCommandQueue().some((e) => e.resumeReason !== void 0)) ||
      this.isShuttingDown() ||
      this.isTerminalShutdown()
    );
  }
  inheritedPromptPending() {
    return this.deferredParkedPermissionRescue !== void 0;
  }
  inheritedPromptHoldCapable() {
    return (
      this.inheritedPromptPending() &&
      this.parkedPermission?.details !== void 0 &&
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
    return this.messageQueue.getCommandQueue().some((e) => $f(e) && !isPassiveCommand(e));
  }
  retirementMayLandDuringReads() {
    return (
      this.parkedPermissionRetirement !== void 0 ||
      this.stopRetirementDue !== void 0 ||
      this.deferredParkedPermissionRescue !== void 0
    );
  }
  rescueOwnsReRun() {
    return (
      this.deferredParkedPermissionRescue !== void 0 ||
      this.parkedPermissionRetirement !== void 0 ||
      this.stopRetirementDue !== void 0
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
      reRunToEnd !== void 0 &&
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
  noteAStopsReceipt(e, { aim: n, lateBind: r }) {
    let reRunToEnd = this.reRunToEnd;
    if (
      reRunToEnd !== void 0 &&
      !r &&
      e.still_queued.includes(reRunToEnd.uuid) &&
      (n === void 0 || reRunToEnd.namedBy(n))
    )
      this.reRunToEnd = { ...reRunToEnd, listedByAStop: !0 };
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
    if (reRunToEnd === void 0 || !e.includes(reRunToEnd.uuid)) return [];
    let sendsLeftToReRun = this.sendsLeftToReRun;
    return (
      (this.reRunToEnd = void 0),
      (this.sendsLeftToReRun = new Set()),
      [...sendsLeftToReRun].flatMap((s) => Vt(s) ?? [])
    );
  }
  leaveItsSendsTo(e) {
    if (
      e.uuid === void 0 ||
      (e.isMeta === !0 && e.resumedTurnUserMessageUuid === void 0 && e.sendsOfItsCompactedTurn === void 0)
    )
      return;
    if (((this.sendsLeftToReRun = this.sendsTheRescueWouldAnswer), this.sendsLeftToReRun.size > 0))
      e.alsoLeftToThisReRun = [...this.sendsLeftToReRun];
    this.reRunToEnd = { uuid: e.uuid, started: !1, namedBy: (n) => isAimedAtTurn(n, [e]), listedByAStop: !1 };
  }
  noteBatch(e, n) {
    if (n === "dropped") {
      if (this.reRunToEnd?.listedByAStop === !0) {
        this.noteCancelledInTheQueue(e);
        return;
      }
      let takeWhatWasLeftToTheReRun = this.takeWhatWasLeftToTheReRun(e);
      for (let h of takeWhatWasLeftToTheReRun) this.declinedRedeliveries.forget(h);
      if (takeWhatWasLeftToTheReRun.length > 0)
        logForDiagnosticsNoPII("warn", "cli_rerun_dropped_its_messages_left_open", {
          count: takeWhatWasLeftToTheReRun.length,
        });
      return;
    }
    let reRunToEnd = this.reRunToEnd;
    if (reRunToEnd === void 0 || !e.includes(reRunToEnd.uuid)) return;
    this.reRunToEnd = n === "started" ? { ...reRunToEnd, started: !0 } : void 0;
  }
  heldMessage() {
    try {
      if (this.heldAtShutdown !== void 0) return this.heldAtShutdown;
      let holdOpenFor = this.holdOpenFor;
      if (
        holdOpenFor === void 0 ||
        this.holdRevoked ||
        !this.lane.holdsParkedMessageOpen() ||
        Date.now() - holdOpenFor.openedAtMs > B7
      )
        return;
      if (!(
        this.deferredParkedPermissionRescue !== void 0 ||
        (this.parkAnswer === "consumed" &&
          (this.drain.running ||
            this.messageQueue.getCommandQueue().some((r) => this.answersInheritedPrompt(r)))) ||
        (this.parkAnswer === "committed" &&
          this.drain.turnUnderWay &&
          this.drain.dequeueCount === this.parkAnswerDequeue)
      ))
        return;
      return ((this.everHeldMessage = !0), holdOpenFor.uuid);
    } catch (error) {
      logError(error);
      return;
    }
  }
  finishMessageLeftOpen() {
    if (this.everHeldMessage) this.declinedRedeliveries.ackAfterRetirement().catch(logError);
  }
  finishCopyThatAwaitedTheCutOffTurn() {
    if (
      ((this.cutOffTurnGivenUp = !0),
      (this.cutOffTurnLeftToTheNextWorker = !1),
      this.aCopyAwaitsTheCutOffTurn)
    )
      this.declinedRedeliveries.ackAfterRetirement().catch(logError);
  }
  answersInheritedPrompt(e) {
    return (
      e.mode === "orphaned-permission" &&
      this.parkedPermission !== void 0 &&
      e.orphanedPermission?.permissionResult?.toolUseID === this.parkedPermission.tool_use_id
    );
  }
  interruptedTurnEcho() {
    return {
      ...(this.interruptedTurnsPrompt !== void 0 && {
        resumedTurnUserMessageUuid: this.interruptedTurnsPrompt,
        resumedTurnOpenerVouched: !0,
      }),
      ...this.fromInterruptedTurnsPrompt,
      resumeReason: oBo(),
      ...(this.leftToTheCardsTurn().size > 0 && { alsoLeftToThisReRun: [...this.leftToTheCardsTurn()] }),
      ...(this.sendsOfTheCardsCompactedTurn !== void 0 && {
        sendsOfItsCompactedTurn: this.sendsOfTheCardsCompactedTurn,
      }),
    };
  }
  enqueueAdoptedServedCalls(e) {
    this.messageQueue.enqueue({ ...this.adoptedServedCallsCommand(e), ...this.interruptedTurnEcho() });
  }
  resumeInterruptedTurn() {
    if (
      this.turnInterruptionState &&
      this.turnInterruptionState.kind !== "none" &&
      this.lane.resumeInterruptedTurn
    ) {
      this.sendsTheRescueWouldAnswer = this.sendsTheInterruptedTurnHolds(this.turnInterruptionState.message);
      let sendsOfTheCompactedTurn = this.sendsOfTheCompactedTurn(this.turnInterruptionState.message);
      this.carriesTheCutOffTurnOn = !0;
      let n = {
        mode: "prompt",
        agentId: mainAgentId(),
        value: this.turnInterruptionState.message.message.content,
        uuid: this.turnInterruptionState.message.isMeta
          ? randomUUID_13()
          : (this.turnInterruptionState.message.uuid ?? randomUUID_13()),
        isMeta: this.turnInterruptionState.message.isMeta,
        ...(this.turnInterruptionState.interruptedTurnUserMessageUuid !== void 0 && {
          resumedTurnUserMessageUuid: this.turnInterruptionState.interruptedTurnUserMessageUuid,
          ...(this.turnInterruptionState.interruptedTurnUserMessageUuid === this.interruptedTurnsPrompt && {
            resumedTurnOpenerVouched: !0,
          }),
        }),
        ...(sendsOfTheCompactedTurn !== void 0 && { sendsOfItsCompactedTurn: sendsOfTheCompactedTurn }),
        ...this.fromInterruptedTurnsPrompt,
        resumeReason: oBo(),
        origin: Ofn(this.turnInterruptionState.message),
        skipAttachments: xjt(this.turnInterruptionState.message),
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
        ...(this.sendsTheRescueWouldAnswer.size > 0 && { drainOnly: !0 }),
        ...relayTurnFlags(this.turnInterruptionState.message),
        ...Pjt(this.turnInterruptionState.message),
        ...bmn(this.turnInterruptionState.message),
      };
      resumeInterruptedTurn("print", this.turnInterruptionState.message, {
        deferred: !!this.parkedPermission,
        pendingActionClass: this.pendingActionClass,
        cutOffAgentCalls: this.cutOffAgentCalls,
        tail: this.turnInterruptionState.tail,
      });
      let r = isRemoteToolForwardingSwitchOn() ? (this.servedCallsToAdopt ?? []) : [],
        inFlightServedCalls = this.inFlightServedCalls();
      for (let { call: w } of r) (inFlightServedCalls.adopt(w), inFlightServedCalls.add(w));
      let presentAdoptedHostTools = this.presentAdoptedHostTools(r.map(({ call: w }) => w));
      if (r.length > 0 || (this.journaledServedCalls ?? 0) > 0)
        this.io.sessionState.notifyInternalMetadataChanged({
          in_flight_served_calls: inFlightServedCalls.current(),
        });
      ((this.parkSiblings = r.filter(({ call: w }) => w.tool_use_id !== this.parkedPermission?.tool_use_id)),
        (this.parkOwnAdoptedCall = r.find(
          ({ call: w }) => w.tool_use_id === this.parkedPermission?.tool_use_id,
        )));
      let y = this.parkOwnAdoptedCall !== void 0,
        [S, ...R] = this.resumedAgentCalls ?? [];
      if (this.parkOwnAdoptedCall !== void 0)
        inFlightServedCalls.noteParkedAtRestart(this.parkOwnAdoptedCall.call.tool_use_id);
      if (this.parkedPermission && this.parkOwnAdoptedCall !== void 0) {
        if (
          ((this.parkSettledAtBoot = !0),
          this.notePromptEnded("settled_at_boot"),
          this.parkedPermission.details?.input === void 0)
        )
          this.withdrawCard(this.parkedPermission.request_id);
        else {
          let P = new PermissionCardAsk({
            card: this.parkedPermission,
            answerKind: this.answers.kind,
            waitMs: this.lane.answerWaitMs,
            maxAnswerAgeMs: cS,
            allowWithoutInputIsEcho: !1,
            withdrawCard: this.withdrawCard,
            unreadAnswersRead: () => {
              let receivedAnswersRead = this.receivedAnswersRead();
              return receivedAnswersRead && withDeadline(receivedAnswersRead, PERMISSION_ANSWER_WAIT_MS);
            },
            answerOff: async () => (await this.lane.inheritedAnswerOff?.()) ?? "absent",
          });
          ((this.inheritedAsk = P),
            inFlightServedCalls.offerInheritedAnswer(this.parkedPermission.tool_use_id, (L) =>
              this.answerForAdoptedCall(P, L),
            ));
        }
        if (this.registrationKeepsPendingAction) this.io.sessionState.adoptRestoredPendingAction();
        let takeParkAdoption = this.takeParkAdoption();
        (logForDebugging(
          `[print.ts] Adopting ${takeParkAdoption.length} served call(s) the previous worker had in flight, the parked one (toolUseID=${this.parkedPermission.tool_use_id}) included, instead of holding its prompt`,
        ),
          this.enqueueAdoptedServedCalls(takeParkAdoption),
          this.dropLoaderSyntheticRows(),
          logEvent("tengu_resume_parked_permission", {
            outcome: lit("served_adopted_at_boot"),
            served_adopted: takeParkAdoption.length,
            parked_tool_use_sha12: gn(this.parkedPermission.tool_use_id),
            parked_request_sha12: gn(this.parkedPermission.request_id),
          }));
      } else if (this.parkedPermission) {
        if (
          (logForDebugging(
            `[print.ts] Deferring interrupted-turn rescue for parked permission toolUseID=${this.parkedPermission.tool_use_id}${this.parkSiblings.length > 0 ? ` (with ${this.parkSiblings.length} adopted served call(s) riding its resolution)` : ""}`,
          ),
          (this.deferredParkedPermissionRescue = n),
          this.holdBehindPrompt(),
          this.interruptedTurnsPrompt !== void 0 || sendsOfTheCompactedTurn !== void 0)
        ) {
          this.readSendsLeftToTheCardsTurn = this.sendsTheParkedTurnTookIn(
            this.turnInterruptionState.message,
            this.interruptedTurnsPrompt,
          );
          let leftToTheCardsTurn = this.leftToTheCardsTurn(!0);
          if (this.interruptedTurnsPrompt === void 0)
            this.sendsOfTheCardsCompactedTurn = this.sendsOfTheCompactedTurn(
              this.turnInterruptionState.message,
              leftToTheCardsTurn,
            );
        }
      } else if (this.parkSiblings.length > 0)
        (logForDebugging(
          `[print.ts] Adopting ${this.parkSiblings.length} served call(s) the previous worker had in flight instead of re-running the interrupted turn: ${this.parkSiblings.map(({ call: w }) => w.tool_use_id).join(",")}`,
        ),
          this.enqueueAdoptedServedCalls(this.parkSiblings),
          (this.parkSiblings = []),
          this.dropLoaderSyntheticRows());
      else if (S !== void 0) {
        if (
          (logForDebugging(
            `[print.ts] Running ${this.resumedAgentCalls?.length} Agent call(s) of the interrupted turn again, each to resume the agent it was waiting on, instead of re-running the turn`,
          ),
          this.interruptedTurnsPrompt !== void 0 || sendsOfTheCompactedTurn !== void 0)
        )
          this.sendsLeftToTheCardsTurn = this.sendsTheRescueWouldAnswer;
        if (this.interruptedTurnsPrompt === void 0)
          this.sendsOfTheCardsCompactedTurn = sendsOfTheCompactedTurn;
        (this.messageQueue.enqueue({
          mode: "orphaned-permission",
          agentId: mainAgentId(),
          value: [],
          orphanedPermission: {
            permissionResult: { behavior: "allow", updatedInput: {}, toolUseID: S.toolUseID },
            assistantMessage: S.assistantMessage,
            ...(R.length > 0 && { siblings: R }),
            resumesInterruptedTurn: !0,
          },
          startedBy: "restart",
          ...this.interruptedTurnEcho(),
        }),
          this.dropLoaderSyntheticRows());
      } else
        (logForDebugging(
          `[print.ts] Auto-resuming interrupted turn (kind: ${this.turnInterruptionState.kind})`,
        ),
          this.removeInterruptedMessage(this.turnInterruptionState.message),
          this.leaveItsSendsTo(n),
          this.messageQueue.enqueue({
            ...n,
            ...(this.turnInterruptionState.endedOnApiError !== void 0 &&
              !this.supersededToolUseIds?.size && {
                yieldsToPersonPrompt: this.turnInterruptionState.endedOnApiError,
              }),
          }));
      if ((this.journaledServedCalls ?? 0) > 0 || r.length > 0)
        logEvent("tengu_remote_tool_restart_adoption", {
          journaled: this.journaledServedCalls ?? 0,
          adoptable: (this.servedCallsToAdopt ?? []).length,
          adopted: r.length,
          never_sent: (this.servedCallsNeverSent ?? []).length,
          park_adopted: y,
          provisional_host_tools: presentAdoptedHostTools,
        });
    }
  }
  takeParkSiblings() {
    let parkSiblings = this.parkSiblings;
    return ((this.parkSiblings = []), parkSiblings);
  }
  takeParkAdoption() {
    let parkOwnAdoptedCall = this.parkOwnAdoptedCall;
    this.parkOwnAdoptedCall = void 0;
    let takeParkSiblings = this.takeParkSiblings();
    return parkOwnAdoptedCall === void 0 ? takeParkSiblings : [parkOwnAdoptedCall, ...takeParkSiblings];
  }
  dropParkSiblings() {
    let inFlightServedCalls = this.inFlightServedCalls(),
      takeParkAdoption = this.takeParkAdoption();
    for (let { call: r } of takeParkAdoption)
      (inFlightServedCalls.takeAdopted(r.tool_use_id), inFlightServedCalls.remove(r.tool_use_id));
    if (takeParkAdoption.length > 0)
      (this.io.sessionState.notifyInternalMetadataChanged({
        in_flight_served_calls: inFlightServedCalls.current(),
      }),
        logEvent("tengu_remote_tool_restart_adoption_dropped", { dropped: takeParkAdoption.length }));
  }
  walkBackKeptRegistrationWithoutPark() {
    if (
      this.initParkReport &&
      this.deferredParkedPermissionRescue === void 0 &&
      (this.initParkReport.reported === "requires_action" || this.initParkReport.pendingActionOutstanding)
    )
      (this.io.sessionState.adoptRestoredPendingAction(),
        this.io.sessionState.notifyStateChanged("idle"),
        logEvent("tengu_ccr_init_park_report", {
          reported: lit("idle"),
          reason: this.parkSettledAtBoot ? lit("park_settled_at_boot") : lit("no_park_derived"),
          init_reported: fromEnum(this.initParkReport.reported),
        }));
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
  async retireInTranscript(e, n, r, s = !1) {
    let { content: content, toolDenialKind: toolDenialKind } = wq[n],
      S = () => {
        if (s) return !1;
        switch (n) {
          case "new_input":
            return !1;
          case "timeout":
            return this.drain.running || this.messageQueue.hasUserIntentCommandsInQueue();
          default:
            return this.drain.intentBatchInFlight || this.userIntentCommandQueued();
        }
      },
      w = (async () => {
        let G = "retired_unanswered",
          Z = 0,
          re = [],
          Ae = [],
          Ue = n === "interrupt" && this.endsStoppedTurns(),
          ce = !1;
        try {
          let ie = [];
          for (let Se of e) {
            let me = (await this.findUnresolvedToolUse(Se))?.holder;
            if (me) ie.push({ toolUseId: Se, assistantMessage: me });
          }
          if (S()) G = "retire_superseded";
          else if (ie.length > 0) {
            let me = [
              ie.reduce((Me, Ee) => (Ee.assistantMessage.timestamp > Me.assistantMessage.timestamp ? Ee : Me))
                .assistantMessage,
              ...ie.map(({ toolUseId: toolUseId, assistantMessage: assistantMessage }) =>
                createUserMessage({
                  content: [{ type: "tool_result", content: content, is_error: !0, tool_use_id: toolUseId }],
                  toolUseResult: content,
                  toolDenialKind: toolDenialKind,
                  sourceToolAssistantUUID: assistantMessage.uuid,
                }),
              ),
              { ...createUserInterruptionMessage({ toolUse: !0 }), retiredByStop: n === "interrupt" },
            ];
            (await this.retirementWriter.append(me),
              (re = me),
              (Z = ie.length),
              (Ae = ie.map(({ assistantMessage: assistantMessage }) => assistantMessage)));
          }
        } catch (error) {
          ((G = "retire_write_failed"),
            logForDebugging(
              `[print.ts] retiring parked permission(s) toolUseIDs=${e.join(",")} in the transcript failed: ${errorMessage(error)}`,
              { level: "warn" },
            ));
        }
        let nt = !1;
        if (Ae.length > 0 && getRemoteFeatureGateState(TENGU_CANDID_JUNIPER) === "on")
          try {
            nt = this.putAheadOfLoaderRows([
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
            (await this.retirementWriter.flush(),
              (ce =
                Ue &&
                (await withDeadline(
                  this.retirementWriter.storedForNextWorker?.(re.map((ie) => ie.uuid)) ?? Promise.resolve(!0),
                  PARKED_PROMPT_CONSTANTS,
                )) === !0));
          } catch (error) {
            logForDebugging(
              `[print.ts] storing the retirement of toolUseIDs=${e.join(",")} failed: ${errorMessage(error)}`,
              { level: "warn" },
            );
          }
        if (ce)
          try {
            this.endStoppedTurn?.(re);
          } catch (error) {
            logForDebugging(
              `[print.ts] ending the stopped turn for the client failed: ${errorMessage(error)}`,
              { level: "error" },
            );
          }
        else if (Ue)
          logForDebugging(
            `[print.ts] Stop on parked permission(s) toolUseIDs=${e.join(",")}: the client is not told that the turn is over, because the rows that record the Stop are not confirmed as stored (outcome=${G}). The next worker may run the turn again.`,
            { level: "warn" },
          );
        return { outcome: G, retiredCount: Z, endingWithheld: Ue ? !ce : void 0, inConversation: nt };
      })();
    this.parkedPermissionRetirement = w.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    let {
      outcome: outcome,
      retiredCount: retiredCount,
      endingWithheld: endingWithheld,
      inConversation: inConversation,
    } = await w.finally(() => {
      this.parkedPermissionRetirement = void 0;
    });
    if (outcome === "retired_unanswered" || this.aCopyAwaitsTheCutOffTurn)
      await this.declinedRedeliveries.ackAfterRetirement();
    if (
      (logEvent("tengu_resume_parked_permission", {
        outcome: fromEnum(outcome),
        reason: fromEnum(n),
        wait_ms: r,
        retired_count: retiredCount,
        ending_withheld: endingWithheld,
        retired_rows_in_conversation: inConversation || void 0,
        ...this.parkedPromptEventFields,
      }),
      n !== "new_input" &&
        outcome !== "retire_superseded" &&
        !S() &&
        !this.drain.running &&
        !this.isShuttingDown() &&
        !this.isTerminalShutdown() &&
        !this.drain.running &&
        !this.io.hasStandingPrompt())
    )
      this.reportInheritedPromptDecided();
  }
  fire(e) {
    if (this.parkedPermissionFallbackTimer)
      (clearTimeout(this.parkedPermissionFallbackTimer), (this.parkedPermissionFallbackTimer = void 0));
    if (e === "interrupt" || e === "rewind") this.inheritedAsk?.stop(e === "rewind" ? "rewound" : "stopped");
    let deferredParkedPermissionRescue = this.deferredParkedPermissionRescue;
    if (!deferredParkedPermissionRescue || !this.parkedPermission) {
      let y = this.parkAnswer === "consumed" && (e === "interrupt" || e === "rewind");
      if (y && (this.heldMessage() !== void 0 || this.everHeldMessage)) {
        this.parkAnswer = "abandoned";
        try {
          if ((logFeatureSad("ccr_parked_message_held", "stopped_before_run"), e === "rewind"))
            this.declinedRedeliveries.closeAfterRewind();
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
    if (e === "timeout" && (this.inputWaitsForAnswer() || this.msLeftForUnreadAnswer() !== void 0)) {
      this.arm();
      return;
    }
    let r =
      e === "timeout" &&
      !this.unreadDenyRetires &&
      this.parkedPermission.details !== void 0 &&
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
      ((this.parkedPermissionHeld = !0),
        this.io.sessionState.notifyStateChanged("requires_action", this.parkedPermission.details),
        (this.drain.runningReported = !1),
        logForDebugging(
          `[print.ts] No persisted control_response for parked permission toolUseID=${this.parkedPermission.tool_use_id} \u2014 holding it answerable; not re-running, not retiring`,
        ),
        logEvent("tengu_resume_parked_permission", {
          outcome: lit("held"),
          reason: fromEnum(e),
          wait_ms: Date.now() - this.parkedPermissionWaitStart,
          ...this.parkedPromptEventFields,
        }));
      return;
    }
    let holdingParkedPermission = this.holdingParkedPermission();
    if (this.registrationKeepsPendingAction) this.io.sessionState.adoptRestoredPendingAction();
    if (
      ((this.deferredParkedPermissionRescue = void 0),
      this.notePromptEnded(e),
      this.finishMessageLeftOpen(),
      this.handledOrphanedToolUseIds.add(this.parkedPermission.tool_use_id),
      this.withdrawCard(this.parkedPermission.request_id),
      logEvent("tengu_resume_stale_prompt_cancel", {
        kind: lit("permission"),
        withdrawn_at: lit("park_end"),
        prompt_call: lit("in_interrupted_turn"),
      }),
      e === "interrupt" ||
        e === "new_input" ||
        e === "rewind" ||
        this.drain.running ||
        (holdingParkedPermission
          ? this.userIntentCommandQueued()
          : this.messageQueue.hasUserIntentCommandsInQueue()))
    ) {
      if (
        (logForDebugging(
          `[print.ts] Parked permission toolUseID=${this.parkedPermission.tool_use_id} superseded by new input during ${holdingParkedPermission ? "hold" : "wait"} (${e}) \u2014 dropping deferred rescue`,
        ),
        logEvent("tengu_resume_parked_permission", {
          outcome: fromEnum(holdingParkedPermission ? "held_superseded" : "superseded"),
          reason: fromEnum(e),
          wait_ms: Date.now() - this.parkedPermissionWaitStart,
          ...this.parkedPromptEventFields,
        }),
        e === "rewind")
      )
        this.declinedRedeliveries.closeAfterRewind();
      let S = e === "interrupt" && this.lane.parkedStopRetires;
      if (e === "new_input" && !this.isShuttingDown() && !this.isTerminalShutdown())
        this.retireInTranscript(
          this.parkedTurnToolUseIds(this.parkedPermission),
          e,
          Date.now() - this.parkedPermissionWaitStart,
        );
      else if (!this.drain.running && !this.isShuttingDown() && !this.isTerminalShutdown()) {
        if ((holdingParkedPermission || S) && e === "interrupt") {
          let parkedTurnToolUseIds = this.parkedTurnToolUseIds(this.parkedPermission),
            w = Date.now() - this.parkedPermissionWaitStart;
          if (this.endsStoppedTurns())
            this.startStopRetirement({ toolUseIds: parkedTurnToolUseIds, waitMs: w });
          else this.retireInTranscript(parkedTurnToolUseIds, e, w);
        } else if (
          (holdingParkedPermission || this.registrationKeepsPendingAction) &&
          !this.io.hasStandingPrompt()
        )
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
      else if (
        ((this.carriesTheCutOffTurnOn = !1), this.drain.intentBatchInFlight || this.userIntentCommandQueued())
      )
        this.declinedRedeliveries.runWhatNoRowVouchesFor();
      else this.cutOffTurnLeftToTheNextWorker = !0;
      this.dropParkSiblings();
      return;
    }
    if (e === "timeout") this.parkedPermissionFallbackFiredAt = Date.now();
    if (e === "timeout") {
      ((this.carriesTheCutOffTurnOn = !1),
        logForDebugging(
          `[print.ts] No persisted control_response for parked permission toolUseID=${this.parkedPermission.tool_use_id} \u2014 retiring it unanswered (nothing to hold); not re-running the interrupted turn`,
        ),
        this.retireInTranscript(
          this.parkedTurnToolUseIds(this.parkedPermission),
          e,
          Date.now() - this.parkedPermissionWaitStart,
        ),
        this.dropParkSiblings());
      return;
    }
    logForDebugging(
      `[print.ts] No consumable persisted control_response for parked permission toolUseID=${this.parkedPermission.tool_use_id} (${e}) \u2014 falling back to cancel + re-ask`,
    );
    let takeParkAdoption = this.takeParkAdoption();
    if (takeParkAdoption.length > 0)
      (this.enqueueAdoptedServedCalls(takeParkAdoption), this.dropLoaderSyntheticRows());
    else {
      if (this.turnInterruptionState && this.turnInterruptionState.kind !== "none")
        this.removeInterruptedMessage(this.turnInterruptionState.message);
      (this.leaveItsSendsTo(deferredParkedPermissionRescue),
        this.messageQueue.enqueue(deferredParkedPermissionRescue));
      let sendsLeftToTheCardsTurn = this.sendsLeftToTheCardsTurn;
      ((this.sendsLeftToTheCardsTurn = new Set()),
        (this.sendsOfTheCardsCompactedTurn = void 0),
        this.declinedRedeliveries.readAgain([...sendsLeftToTheCardsTurn].flatMap((S) => Vt(S) ?? [])));
    }
    (logEvent("tengu_resume_parked_permission", {
      outcome: takeParkAdoption.length > 0 ? lit("fallback_served_adopted") : lit("fallback_reask"),
      reason: fromEnum(e),
      wait_ms: Date.now() - this.parkedPermissionWaitStart,
      ...(takeParkAdoption.length > 0 && { served_adopted: takeParkAdoption.length }),
      ...this.parkedPromptEventFields,
    }),
      this.kick());
  }
  notePromptEnded(e) {
    ((this.promptEnded = { by: e, atMs: Date.now(), responseUnread: this.receivedAnswersRead() !== void 0 }),
      this.promptEndSignal.resolve(),
      (this.readSendsLeftToTheCardsTurn = void 0),
      queueMicrotask(() => void this.endHoldBehindPrompt(e)));
  }
  letPressedMessagesGo(e) {
    if (this.promptEnded !== void 0) return;
    this.messageQueue.letHeldBackGo((n) => isHumanOrigin(n.origin) && e(n));
  }
  holdBehindPrompt() {
    try {
      this.letHeldCommandsGo = this.messageQueue.holdBack((e) => {
        if (!$f(e)) return !1;
        if (
          canBatchWith(e) &&
          isHumanOrigin(e.origin) &&
          e.priority !== "now" &&
          e.sentNow !== !0 &&
          e.resumeReason === void 0 &&
          (this.promptEnded !== void 0 || this.inheritedPromptHoldCapable()) &&
          this.lane.holdsInputBehindPrompt?.() === !0
        )
          return (logFeatureOk("ccr_input_held_behind_prompt"), !0);
        let n =
          e.mode === "task-notification" &&
          e.taskId !== void 0 &&
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
      if (((this.letHeldCommandsGo = void 0), n > 0))
        logForDebugging(
          `[print.ts] Parked permission toolUseID=${this.parkedPermission?.tool_use_id} ended (${e}): letting go ${n} command(s) held back for it`,
        );
    } catch (error) {
      logError(error);
    }
  }
  answerOnItsWay() {
    if (!this.inheritedPromptPending() || !this.userIntentCommandQueued()) return;
    let msLeftForUnreadAnswer = this.msLeftForUnreadAnswer();
    if (msLeftForUnreadAnswer === void 0) return;
    this.drainWaitedForAnswer = !0;
    let startTime = performance.now();
    return withDeadline(
      Promise.race([this.receivedAnswersRead(), this.promptEndSignal.promise]).then(() => !0),
      msLeftForUnreadAnswer,
    ).then((r) => {
      try {
        let s = performance.now() - startTime,
          h = r === void 0 ? "bound" : this.promptEnded === void 0 ? "responses_read" : "park_ended";
        if (
          (logForDiagnosticsNoPII("info", "cli_parked_answer_wait_over", {
            waited: durationBucket(s),
            waited_ms: Math.round(s),
            ended_by: h,
            ...flagKey("ended_by", h),
            ...chatOriginField(),
          }),
          r === void 0)
        )
          logFeatureSad("ccr_parked_answer_waited", "bound");
        else logFeatureOk("ccr_parked_answer_waited");
      } catch (error) {
        logError(error);
      }
    });
  }
  msLeftForUnreadAnswer() {
    if (
      !this.inheritedPromptPending() ||
      this.promptEnded !== void 0 ||
      this.isShuttingDown() ||
      this.receivedAnswersRead() === void 0
    )
      return;
    if (((this.flagAtLastWaitCheck = this.answerGoesFirstFlag()), this.flagAtLastWaitCheck !== "on")) return;
    let startTime = performance.now();
    if (this.answerOnItsWayUntil === void 0)
      ((this.answerOnItsWayUntil = startTime + PERMISSION_ANSWER_WAIT_MS),
        this.receivedAnswersRead()?.then(() => {
          if (!this.drainWaitedForAnswer) this.answerOnItsWayUntil = void 0;
        }));
    let n = this.answerOnItsWayUntil - startTime;
    return n > 0 ? n : void 0;
  }
  answerGoesFirstFlag() {
    let answerGoesFirst = this.lane.answerGoesFirst();
    return answerGoesFirst === "cold" ? "flags_not_fetched" : answerGoesFirst;
  }
  async onUnexpectedResponse(e, n) {
    if ((this.noteParkAnswerCameIn(e), this.answers.kind === "strict")) return this.routeStrictAnswer(e, n);
    let r =
      e.response.subtype === "success" && typeof e.response.response?.toolUseID === "string"
        ? e.response.response.toolUseID
        : void 0;
    if (this.inheritedAsk?.take(e, r)) return;
    let s = isPermissionCardHoldEnabled(),
      h =
        this.parkedPermission !== void 0 &&
        r === this.parkedPermission.tool_use_id &&
        (e.response.request_id === this.parkedPermission.request_id || (s && this.isBlankedParkDeny(e))),
      y = h && s && e.response.subtype === "success" && e.response.response?.behavior === "deny";
    if (
      h &&
      !(e.response.subtype === "success" && e.response.response?.behavior === "deny") &&
      r !== void 0 &&
      this.deniedButUnread.has(r)
    ) {
      logForDebugging(`[print.ts] Dropping an answer for parked toolUseID=${r}: a Deny for it came first`);
      return;
    }
    if (h && this.parkedPermissionFallbackTimer)
      (clearTimeout(this.parkedPermissionFallbackTimer), (this.parkedPermissionFallbackTimer = void 0));
    if (h && this.keptInheritedPromptPending()) this.io.sessionState.adoptRestoredPendingAction();
    if (this.inheritedPromptPending() && r !== void 0 && r === this.parkedPermission?.tool_use_id && !h) {
      logForDebugging(
        `[print.ts] Dropping control_response for inherited parked permission toolUseID=${r}: request_id does not match the pending prompt`,
        { level: "warn" },
      );
      let q = "inherited_request_id_mismatch";
      logForDiagnosticsNoPII("warn", "cli_orphan_answer_dropped", () => ({
        ...this.orphanDropContext(r),
        ...this.parkAnswerContext(r),
        is_park_answer: !1,
        tool_use_id_matches_park: !0,
        reason: q,
        ...flagKey("reason", q),
        ...getRiskColor(e),
      }));
      return;
    }
    let S = !1,
      R =
        h &&
        this.parkedPermission !== void 0 &&
        this.promptStillOpen(this.parkedPermission) &&
        this.inheritedPromptOwnsWorkerStatus() &&
        !this.io.hasStandingPrompt();
    if (R && !y) {
      if (this.answerClearing) {
        logForDebugging(
          `[print.ts] Dropping a copy of the parked permission's answer toolUseID=${r}: its clear is pending`,
        );
        return;
      }
      this.answerClearing = !0;
      try {
        S = await this.recordClearedBeforeRun(lit("clear_unconfirmed"));
      } finally {
        this.answerClearing = S;
      }
      if (!S) return;
    }
    let w,
      P,
      L = [];
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
          if (((P = unresolvedToolUse?.messageRows), h))
            L = deviceCallsBehindCard(P, q, this.supersededToolUseIds);
          return unresolvedToolUse?.holder ?? null;
        },
        ...(h && {
          initFirst: (q, x) => this.parkSiblings.length > 0 || this.servedElsewhere(q, x),
          siblings: () =>
            this.takeParkSiblings().map(({ call: q, assistantMessage: assistantMessage }) => ({
              toolUseID: q.tool_use_id,
              assistantMessage: assistantMessage,
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
          resumesInterruptedTurn: () => this.deferredParkedPermissionRescue !== void 0,
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
          tool_use_id_matches_park: q !== void 0 && q === this.parkedPermission?.tool_use_id,
        }),
      });
    } catch (error) {
      if (h)
        if (
          (logForDebugging(
            `[print.ts] orphan handler threw for parked permission toolUseID=${this.parkedPermission?.tool_use_id}: ${error}`,
            { level: "error" },
          ),
          y)
        )
          this.keepWaitingAfterUnreadDeny(r);
        else this.fire("orphan_dropped");
      throw error;
    } finally {
      if (S) this.answerClearing = !1;
    }
    if (h) {
      if (w && this.deferredParkedPermissionRescue) {
        if (
          ((this.deferredParkedPermissionRescue = void 0),
          this.notePromptEnded("own_answer"),
          this.noteParkAnswerConsumed(),
          this.dropLoaderSyntheticRows(),
          this.withdrawCard(this.parkedPermission.request_id),
          y && R && !this.io.hasStandingPrompt())
        )
          this.sendClearAfterDeny();
        (logForDebugging(
          `[print.ts] Parked permission toolUseID=${r} resolved by persisted control_response \u2014 dropping deferred rescue`,
        ),
          logEvent("tengu_resume_parked_permission", {
            outcome: lit("consumed_persisted"),
            wait_ms: Date.now() - this.parkedPermissionWaitStart,
            ...this.parkedPromptEventFields,
          }));
      } else if (!w)
        if (this.parkedPermissionFallbackFiredAt !== void 0)
          (logEvent("tengu_resume_parked_permission", {
            outcome: lit("late_answer_discarded"),
            wait_ms: Date.now() - this.parkedPermissionWaitStart,
            late_ms: Date.now() - this.parkedPermissionFallbackFiredAt,
            ...this.parkedPromptEventFields,
          }),
            (this.parkedPermissionFallbackFiredAt = void 0));
        else if (y) this.keepWaitingAfterUnreadDeny(r);
        else this.fire("orphan_dropped");
    }
  }
  async routeStrictAnswer(e, n) {
    let parkedPermission = this.parkedPermission,
      response = e.response;
    if (response.subtype !== "success") return this.dropStrictAnswer("not_an_answer", e);
    let response_2 = response.response,
      y = isPermissionCardHoldEnabled();
    if (
      parkedPermission === void 0 ||
      response_2?.toolUseID !== parkedPermission.tool_use_id ||
      (response.request_id !== parkedPermission.request_id && !(y && this.isBlankedParkDeny(e)))
    )
      return this.dropStrictAnswer("not_the_park", e);
    let S = y && response_2.behavior === "deny";
    if (this.parkSiblings.length > 0 || this.parkOwnAdoptedCall !== void 0)
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
              ...(typeof response_2.interrupt === "boolean" && { interrupt: response_2.interrupt }),
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
    let content = unresolvedToolUse.holder.message.content,
      P = Array.isArray(content)
        ? content.find((q) => q.type === "tool_use" && q.id === parkedPermission.tool_use_id)
        : void 0;
    if (P?.type !== "tool_use") return this.dropStrictAnswer("not_in_last_turn", e);
    let L = e;
    for (let q of [response_2.toolName, response_2.tool_name, parkedPermission.details?.tool_name])
      if (typeof q === "string" && q !== P.name) {
        if (!S || e.response.subtype !== "success") return this.dropStrictAnswer("tool_name_mismatch", e);
        L = {
          ...e,
          response: { ...e.response, response: unmatchedAnswerDenial(parkedPermission.tool_use_id) },
        };
      }
    if (this.answerClearing) return this.dropStrictAnswer("clear_pending", e);
    if (!this.promptStillOpen(parkedPermission)) return this.dropStrictAnswer("decided", e);
    if (this.parkedPermissionFallbackTimer)
      (clearTimeout(this.parkedPermissionFallbackTimer), (this.parkedPermissionFallbackTimer = void 0));
    if (this.keptInheritedPromptPending()) this.io.sessionState.adoptRestoredPendingAction();
    if (!S) this.answerClearing = !0;
    try {
      if (!S && !(await this.recordClearedBeforeRun(lit("strict_clear_unconfirmed"))))
        return this.dropStrictAnswer("clear_unconfirmed", e);
      if (!this.promptStillOpen(parkedPermission)) return this.dropStrictAnswer("decided", e);
      let q = !1,
        x = !1,
        G = deviceCallsBehindCard(
          unresolvedToolUse.messageRows,
          parkedPermission.tool_use_id,
          this.supersededToolUseIds,
        );
      setLateAllowDecision(this.session, parkedPermission.tool_use_id, n);
      try {
        q = await handleOrphanedPermissionResponse({
          message: L,
          denyIsRefusal: y,
          setAppState: this.store.setState,
          messageQueue: this.messageQueue,
          handledToolUseIds: this.handledOrphanedToolUseIds,
          startedBy: this.markAnswer,
          findUnresolved: async () => unresolvedToolUse.holder,
          messageRows: () =>
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_pillow", !1)
              ? unresolvedToolUse.messageRows
              : void 0,
          notSent: () => G,
          note: (Z) =>
            this.lostCallsNote(
              unresolvedToolUse.messageRows ?? [],
              new Set([Z, ...G.map((re) => re.toolUseID)]),
            ),
          resumesInterruptedTurn: () => this.deferredParkedPermissionRescue !== void 0,
          cardInput: parkedPermission.recordedInput ?? null,
          interruptedTurnEcho: this.interruptedTurnEcho(),
          ccrTurnId: () => {
            if (parkedPermission.ccrTurnId !== void 0 && this.drain.dequeueCount > 0) {
              logFeatureSad("ccs_card_turn_id", "restore_behind_a_turn");
              return;
            }
            return parkedPermission.ccrTurnId;
          },
          onEnqueued: () => {
            ((x = !0), this.kick());
          },
          enqueueContext: (Z) => this.parkAnswerContext(Z),
          dropContext: (Z) => ({ ...this.orphanDropContext(Z), ...this.parkAnswerContext(Z) }),
        });
      } catch (error) {
        if (
          (logForDebugging(
            `[print.ts] strict parked-permission answer could not be queued: ${errorMessage(error)}`,
            { level: "error" },
          ),
          (q = x),
          !x && this.deferredParkedPermissionRescue !== void 0)
        )
          this.handledOrphanedToolUseIds.delete(parkedPermission.tool_use_id);
      }
      if (!q) {
        if ((takeLateAllowDecision(this.session, parkedPermission.tool_use_id), S))
          this.keepWaitingAfterUnreadDeny(parkedPermission.tool_use_id);
        else if (
          this.deferredParkedPermissionRescue !== void 0 &&
          !this.parkedPermissionHeld &&
          this.parkedPermissionFallbackTimer === void 0
        )
          this.arm();
        return this.dropStrictAnswer("not_queued", e);
      }
      if (
        ((this.deferredParkedPermissionRescue = void 0),
        this.notePromptEnded("own_answer"),
        this.noteParkAnswerConsumed(),
        this.dropLoaderSyntheticRows(),
        S)
      )
        this.sendClearAfterDeny();
      logEvent("tengu_resume_parked_permission", {
        outcome: lit("consumed_persisted"),
        wait_ms: Date.now() - this.parkedPermissionWaitStart,
        ...this.parkedPromptEventFields,
      });
    } finally {
      if (!S) this.answerClearing = !1;
    }
  }
  keepWaitingAfterUnreadDeny(e) {
    if (e !== void 0) this.deniedButUnread.add(e);
    if (this.answers.kind !== "strict") this.unreadDenyRetires = !0;
    if (
      this.deferredParkedPermissionRescue !== void 0 &&
      (this.unreadDenyRetires || !this.parkedPermissionHeld) &&
      this.parkedPermissionFallbackTimer === void 0
    )
      this.arm();
  }
  sendClearAfterDeny() {
    this.clearBeforeRun({ afterAnswerQueued: !0 }).catch((e) => {
      logForDebugging(
        `[print.ts] Could not clear the session's record of a denied permission card; the Deny is already queued: ${errorMessage(e)}`,
        { level: "error" },
      );
    });
  }
  isBlankedParkDeny(e) {
    let parkedPermission = this.parkedPermission,
      response = e.response;
    return (
      parkedPermission !== void 0 &&
      response.subtype === "success" &&
      response.response?.behavior === "deny" &&
      response.response.toolUseID === parkedPermission.tool_use_id &&
      response.request_id === parkedPermission.tool_use_id &&
      parkedPermission.details?.request_id === "" &&
      typeof parkedPermission.details.suppressed_request_id === "string" &&
      parkedPermission.details.suppressed_request_id !== ""
    );
  }
  async recordClearedBeforeRun(e) {
    let n = !1;
    try {
      n = (await this.clearBeforeRun()) === !0;
    } catch (error) {
      logForDebugging(
        `[print.ts] the host could not clear a parked permission's record: ${errorMessage(error)}`,
        { level: "error" },
      );
    }
    if (n) return !0;
    if (
      this.deferredParkedPermissionRescue !== void 0 &&
      !this.parkedPermissionHeld &&
      this.parkedPermissionFallbackTimer === void 0
    )
      this.arm();
    return (
      logEvent("tengu_resume_parked_permission", {
        outcome: e,
        wait_ms: Date.now() - this.parkedPermissionWaitStart,
        ...this.parkedPromptEventFields,
      }),
      !1
    );
  }
  promptStillOpen(e) {
    return (
      this.deferredParkedPermissionRescue !== void 0 && !this.handledOrphanedToolUseIds.has(e.tool_use_id)
    );
  }
  async answerForAdoptedCall(e, n) {
    let { answer: answer, unused: unused } = await e.answerFor(n);
    return (
      logEvent("tengu_resume_parked_permission", {
        outcome:
          unused === void 0 ? lit("served_adopted_answer_consumed") : lit("served_adopted_asked_again"),
        reason: fromEnumOpt(unused),
        ...(answer !== void 0 && { answer: fromEnum(answer.behavior) }),
        wait_ms: Date.now() - this.parkedPermissionWaitStart,
        ...this.parkedPromptEventFields,
      }),
      unused === void 0 && answer !== void 0 ? { answers: this.answers, result: answer } : void 0
    );
  }
  noteParkAnswerConsumed() {
    if (this.parkAnswer === "none") this.parkAnswer = "consumed";
  }
  dropStrictAnswer(e, n) {
    logForDebugging(`[print.ts] Dropping a control_response on the strict parked-permission lane: ${e}`, {
      level: "warn",
    });
    let r = n.response.subtype === "success" ? n.response.response?.toolUseID : void 0,
      s = () => ({
        ...this.parkAnswerContext(this.parkedPermission?.tool_use_id),
        reason: e,
        ...getRiskColor(n),
        ...(typeof r === "string" &&
          r !== this.parkedPermission?.tool_use_id &&
          this.bootRetiredToolUseIds?.has(r) && { boot_retired: !0 }),
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
      boot_retired: e !== void 0 && this.bootRetiredToolUseIds?.has(e) === !0,
      interruption_kind: this.turnInterruptionState?.kind ?? "unknown",
    };
  }
  noteParkAnswerCameIn(e) {
    this.asAnswerCameIn = void 0;
    try {
      if (
        this.parkedPermission === void 0 ||
        e.response.subtype !== "success" ||
        e.response.response?.toolUseID !== this.parkedPermission.tool_use_id
      )
        return;
      let now = Date.now();
      this.asAnswerCameIn = {
        park_ended_by_when_arrived: this.promptEnded?.by ?? "not_ended",
        arrived_after_park_end:
          this.promptEnded === void 0 ? "not_ended" : durationBucket(now - this.promptEnded.atMs),
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
      this.parkedPermission === void 0 ||
      e !== this.parkedPermission.tool_use_id ||
      this.asAnswerCameIn === void 0
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
        this.newInputWasAFrame !== void 0 && { new_input_from: n, ...flagKey("new_input_from", n) }),
      ...(this.promptEnded !== void 0 &&
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
    if (this.parkedPermission && this.deferredParkedPermissionRescue)
      ((this.parkedPermissionFallbackTimer = setTimeout(
        (e) => this.fire(e),
        this.lane.answerWaitMs,
        "timeout",
      )),
        this.parkedPermissionFallbackTimer.unref?.());
    this.inheritedAsk?.startTimer();
  }
  endsStoppedTurns() {
    return this.lane.parkedStopRetires && this.endStoppedTurn !== void 0;
  }
  startStopRetirementDue() {
    let stopRetirementDue = this.stopRetirementDue;
    if (
      ((this.stopRetirementDue = void 0),
      stopRetirementDue !== void 0 && !this.isShuttingDown() && !this.isTerminalShutdown())
    )
      this.startStopRetirement(stopRetirementDue);
  }
  startStopRetirement({ toolUseIds: e, waitMs: n }) {
    this.stopSettlingPromise = this.retireInTranscript(e, "interrupt", n, !0)
      .catch(logError)
      .finally(() => {
        this.stopSettlingPromise = void 0;
      });
  }
  decideIdleReport() {
    let e = this.stopRetirementDue !== void 0;
    if (!e && this.reportIdleAtTurnEndAllowed() && !this.io.hasStandingPrompt()) return "idle";
    let heldCardToReassert = this.heldCardToReassert();
    if (!e && heldCardToReassert && this.io.sessionState.getState() !== "requires_action")
      this.io.sessionState.notifyStateChanged("requires_action", heldCardToReassert);
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
    let answersInheritedPrompt = this.answersInheritedPrompt(e);
    if (this.inheritedPromptPending() && !this.drain.intentBatchInFlight)
      logForDiagnosticsNoPII("warn", "cli_no_intent_batch_at_inherited_prompt", {
        held: this.holdingParkedPermission(),
        no_query: e.shouldQuery === !1,
        ...chatOriginField(),
      });
    if (e.shouldQuery !== !1) this.startStopRetirementDue();
    if (this.cutOffTurnLeftToTheNextWorker && this.drain.intentBatchInFlight)
      (this.declinedRedeliveries.runWhatNoRowVouchesFor(), this.finishCopyThatAwaitedTheCutOffTurn());
    if (this.inheritedPromptPending() && this.drain.intentBatchInFlight && !answersInheritedPrompt)
      ((this.newInputWasAFrame = e.frameTiming !== void 0), this.fire("new_input"));
    try {
      if (answersInheritedPrompt) {
        if (this.parkAnswer !== "abandoned") {
          if (this.heldMessage() !== void 0) logFeatureOk("ccr_parked_message_held");
          ((this.parkAnswer = "committed"), (this.parkAnswerDequeue = this.drain.dequeueCount));
        }
      } else if (e.shouldQuery !== !1 && this.holdOpenFor !== void 0 && !this.holdRevoked) {
        if (this.heldMessage() !== void 0) logFeatureSad("ccr_parked_message_held", "revoked_model_turn");
        ((this.holdRevoked = !0), this.finishMessageLeftOpen());
      }
    } catch (error) {
      logError(error);
    }
    return !this.inheritedPromptOwnsWorkerStatus() || answersInheritedPrompt;
  }
  onShutdown() {
    if (
      ((this.heldAtShutdown = this.heldMessage()),
      (this.stopRetirementDue = void 0),
      this.parkedPermissionFallbackTimer)
    )
      (clearTimeout(this.parkedPermissionFallbackTimer), (this.parkedPermissionFallbackTimer = void 0));
    if (
      this.parkedPermission &&
      this.deferredParkedPermissionRescue &&
      !this.holdingParkedPermission() &&
      !this.registrationKeepsPendingAction
    )
      this.withdrawCard(this.parkedPermission.request_id).catch(() => {});
    if (this.deferredParkedPermissionRescue !== void 0) this.notePromptEnded("shutdown");
    ((this.deferredParkedPermissionRescue = void 0), this.inheritedAsk?.stop("shutdown"));
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
  cS,
  isPendingActionForTool,
};

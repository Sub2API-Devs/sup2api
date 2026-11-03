/**
 * cli/structuredIO.ts
 *
 * StructuredIO：stream-json 输入逐行解析（keep_alive、update_environment_variables、control_request/response、消息），以及向宿主发 can_use_tool/hook_callback/elicitation 等请求
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/structuredIO.ts
 * pieces: chunk-6j594vm1.js (1), chunk-e6aww6q8.js (1), chunk-fp6aqx1j.js (1), chunk-na0b3c5q.js (8)
 * attribution: fingerprint 3, callgraph-witnessed 1, file-local 1, sole-consumer 6
 */
import { randomUUID } from "crypto";
import { ySr } from "../utils/remoteEnvironment.js";
import { createSignal } from "../utils/signal.js";
import { Stream } from "../utils/stream.js";
import { env } from "../utils/env.js";
import {
  parseIntEnv,
  ge,
  configProbeEnv,
  M,
  STDIN_LIMITS,
  ke,
  inputTooLargeError,
  dialogSourceAttr,
  errorFieldText,
  isKnownControlSubtype,
  W,
  ce,
  subtypeOf,
  truncatedErrorText,
  permissionResponseTelemetry,
  F,
  fe,
  he,
  _e,
  me,
  classifyStreamError,
  parseControlResponse,
  z,
  deliveryOutcome,
  normalizeDeliveryState,
  pe,
  CONTROL_TIMEOUTS,
  le,
  ue,
  matchRequestId,
  knownSubtypeOrUndefined,
} from "./structuredIOProtocol.js";
import { Aa, withTimeout } from "../utils/sleep.js";
import { writeToStdout, drainStdoutBeforeExit } from "../utils/process.js";
import { SessionStateTracker } from "../utils/sessionState.js";
import { JZe, isUserInitiatedInboundEvent, RKs, QZe } from "./transports/streamEventCoalescing.js";
import {
  rememberResolvedPromptRequestId,
  rememberElicitationRequestId,
  rememberHostAskRequestId,
  rememberOutboundRequestId,
  rememberDeviceOutboundRequestId,
} from "../bridge/attestationGate.js";
import { logForDebugging } from "../utils/debug.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { yieldToEventLoop } from "../native-ts/file-index/index.js";
import { logForDiagnosticsNoPII, flushDiagnosticLogs } from "../utils/diagLogs.js";
import { isTerminalShutdown, heldUntilExit } from "../utils/terminalShutdown.js";
import { oIr, PLs, createPermissionAsker } from "../services/pushNotifications/permissionPush.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { StreamClosedAbortError, errorMessage, AbortError, isAbortError } from "../utils/errors.js";
import { oKo, WVr } from "./toolPermissionStream.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { MCP_ELICITATION_DIALOG_TOOL, dialogPermissionRequest } from "../utils/teleport/sessionCreate.js";
import { gn } from "../utils/shortHash.js";
import { yW } from "../services/api/logging.js";
import { isValidBridgeToolName, humanizeToolName } from "../bridge/bridgePermissionResponse.js";
import { getApprovalTicket } from "../bridge/bridgePermissionCallbacks.js";
import { ENUM_PROMPT } from "../components/nudges/nudgeIds.js";
import { Wo } from "../utils/json.js";
import { normalizeControlMessage } from "../utils/controlMessageCompat.js";
import { ndjsonStringify } from "./ndjsonSafeStringify.js";
import {
  isLauncherStartedProcess,
  holdPushedLauncherHostLogin,
  isLauncherStartupAsk,
  RRi,
  CRi,
} from "../utils/auth/launcherHostLogin.js";
import {
  clearOAuthTokenCache,
  hostSessionsBearerOffered,
  isClaudeAISignInToken,
  claudeAISignInTokenInForce,
} from "../utils/auth.js";
import { applySessionTokenEnv } from "../utils/sessionAccessToken.js";
import { forgetHeldHostSessionsBearer, acceptPushedHostSessionsBearer } from "../utils/hostSessionsBearer.js";
import { emitCredentialChange } from "../utils/auth/credentialEpoch.js";
import { isHostDialogApproval } from "../components/permissions/hooks.js";
import { stripLiveOnlyMarker } from "../bridge/controlRequests.js";
import { getRiskColor } from "../bridge/mcpApprovalTickets.js";
import { shouldRejectUiControl, Fce } from "./sdkMcpManifests.js";
import { Vt } from "../utils/agentId.js";
import { logError } from "../utils/log.js";
import { Phr, isAskWithdrawnByAsker } from "../utils/abortController.js";
import { tlo } from "./handlers/util.js";
import { jls, Mls, Uxn, Bxn, Dls, Lls } from "../entrypoints/sdk/controlSchemas.js";
import { sanitizeJsonPath } from "../services/daemon/sessionCron.js";
import { decisionReasonCode, HOOK_REWRITE_HEADLESS_DENY_REASON } from "../types/permissions.js";
import { serializeDecisionReason } from "../utils/permissions/decisionReasons.js";
import { getSessionId, noteSdkHostHookAnswered } from "../bootstrap/state.js";
import { MARKETPLACE_ONLY_MANIFEST_FIELDS } from "../utils/plugins/validatePlugin.js";
import { hookJSONOutputSchema } from "../types/hooks.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { oe, u, qne } from "../../vendor/zod/v4/classic/schemas.js";
import {
  ServingInstanceGoneError,
  RequestNotDeliveredError,
  RequestDeliveryUnknownError,
  RequestWithdrawnUnsentError,
} from "../services/remoteTools/servingErrors.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { lci } from "../services/requestUserDialog.js";
import {
  isMisleadingConsentHost,
  consentHostEntry,
  sandboxHostGrantDestination,
  SandboxManager,
} from "../utils/sandbox/sandbox-adapter.js";
import { WEBFETCH } from "../tools/WebFetchTool/prompt.js";
import {
  schedulePermissionNotify,
  applyPermissionPromptResult,
} from "../utils/permissions/PermissionPromptToolResultSchema.js";
import { normalizePermissionUpdate, Mar } from "../utils/permissions/permissionRulePayload.js";
import {
  applyPermissionUpdates,
  persistPermissionUpdates,
  supportsPersistence,
} from "../utils/permissions/PermissionUpdate.js";
import {
  applyUpdatesToSessionContext,
  applyPermissionAnswer,
  listAnswerTighteningRules,
  d0e,
  denyChangedAnswerInput,
} from "../utils/permissions/permissionAnswer.js";
import { R4n } from "../services/mcp/SdkControlTransport.js";
import { createCombinedAbortSignal } from "../utils/combinedAbortSignal.js";
import { kR } from "../../vendor/zod/v4/classic/errors.js";
import { drainRegisteredWriteQueues } from "../utils/settings/writeQueues.js";
import { getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { executePermissionRequestHooks } from "../utils/hooks.js";
import {
  obe,
  guardHookUpdatedInput,
  checkRuleBasedPermissions,
  isInteractionStillOwed,
} from "../utils/permissions/permissions.js";
import {
  guardAccountMemoryHookRewrite,
  validatePermissionRequestUpdatedInput,
} from "../utils/hooks/hookUpdatedInput.js";

/**
 * StructuredIO：stream-json 协议的本地实现。read() 按行（\n）读 stdin，processLine 解析每行：keep_alive 丢弃、update_environment_variables 按白名单应用、control_response 匹配挂起请求、control_request 交给调用方、user/assistant/system 消息透传；sendRequest 发出 control_request（can_use_tool、hook_callback、elicitation、mcp_message…）并等待回复；write 输出 NDJSON。
 */
//@ chunk-na0b3c5q.js:9613-51278 callgraph-witnessed = StructuredIO (0.256)
class StructuredIO {
  input;
  replayUserMessages;
  maxLineChars;
  isRemoteTransport() {
    return !1;
  }
  uiSurfaceFrameOf(e, s) {
    let redactsWhatItPersists = this.redactsWhatItPersists();
    return this.isRemoteTransport()
      ? {
          isRemoteTransport: !0,
          redactsWhatItPersists: redactsWhatItPersists,
          isAnySurfaceAttached: s,
          createdAt: void 0,
          sessionWriters: void 0,
          isAtFloor: !1,
          leavesBelowFloor: !1,
        }
      : { isRemoteTransport: !1, redactsWhatItPersists: redactsWhatItPersists, isAnySurfaceAttached: s };
  }
  surfaceRequestJudgedAt(e) {
    let s = this.surfaceRequestsJudgedAt.get(e) ?? Date.now();
    return (this.surfaceRequestsJudgedAt.set(e, s), s);
  }
  surfaceRequestsJudgedAt = new WeakMap();
  redactsWhatItPersists() {
    return ySr({ hostedWorker: this.isHostedWorker, transportPersists: this.persistsOutboundFrames });
  }
  uiSurfaceChannel() {
    return {
      redactsWhatItPersists: this.redactsWhatItPersists(),
      isRemoteTransport: this.isRemoteTransport(),
      sessionWriters: this.sessionWriters(),
    };
  }
  sessionWriters() {
    return;
  }
  surfaceClientAttached(e, s) {
    return !0;
  }
  controlRequestEnded(e) {}
  answersSurfaceRefusal(e) {
    return !0;
  }
  surfaceSenderStands(e) {
    return !0;
  }
  setSurfaceRoster(e) {}
  setSubscribersReportedListener(e) {}
  taskHoldSince() {
    return;
  }
  structuredInput;
  pendingRequests = new Map();
  confirmAnswerEventIds = new Map();
  requestPending = createSignal();
  sdkHostHookGeneration = 0;
  retiredHostHookAnswer;
  deviceRequests = new Map();
  publishedPendingActionDetails = new Map();
  backgroundPromptIds = new Set();
  flipBackLeftToUnpublishedAsk = !1;
  streamCloseInterruptRequestIds = new Set();
  hostDialogAttestations = new Map();
  approvalTickets = new Map();
  timedOutUserDialogs = new Map();
  unansweredSettleHandlers = new Map();
  dialogsANewPromptCloses = new Set();
  restoredWorkerState = Promise.resolve(null);
  rereadWorkerState() {
    return Promise.resolve(null);
  }
  sendOwedClientRowsAgain(e) {
    return Promise.resolve();
  }
  readAgentMetadataEvents(e, s) {
    return Promise.resolve(null);
  }
  readProjectsBinding() {
    return Promise.resolve({ read: !0, assertion: void 0 });
  }
  workerEpoch() {
    return 0;
  }
  hydratePrefetch = Promise.resolve(null);
  inputClosed = !1;
  hasUnconsumedInput = !1;
  answerLinesWritten = 0;
  answerLinesRead = 0;
  receivedAnswersRead;
  tracksRequestDelivery = !1;
  unexpectedResponseCallback;
  unclaimedResponseObserver;
  resolvedToolUseIds = new Set();
  prependedLines = [];
  locallyPrependedMessages = new WeakSet();
  personsOwnPrepends = new WeakSet();
  prependWaker = null;
  stallTimer;
  stallFired = !1;
  stallLastWriteAtMs = 0;
  stallLastWriteType;
  sdkSchemaStretchSampled;
  sdkSchemaKept = new Map();
  sdkSchemaResultWritten = !1;
  sdkSchemaCheckTimer;
  createdAt = Date.now();
  onControlRequestSent;
  onControlRequestResolved;
  onStreamClosedWithParkedQuestion;
  onUserDialogParked;
  hostAnswersElicitations = !0;
  onCommandLifecycle;
  resultDelivery;
  commandLifecycleForwarderInstalled = !1;
  hostOwnsStdinOrigin = !0;
  persistsOutboundFrames = !1;
  get isHostedWorker() {
    return !1;
  }
  readOwnClientEvent(e) {
    return Promise.resolve({ kind: "unavailable", why: "no_session_channel" });
  }
  sessionState;
  outbound = new Stream();
  heldUntilInit = [];
  streamEventHold =
    env.CLAUDE_CODE_STREAM_EVENT_HOLD_MS === void 0
      ? void 0
      : parseIntEnv(
          {
            holdMs: env.CLAUDE_CODE_STREAM_EVENT_HOLD_MS,
            clock: Aa,
            print: (e, s) => {
              (this.trackWrite(e),
                writeToStdout(
                  s +
                    `
`,
                ));
            },
          },
          env.CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES,
        );
  constructor(e, s, n, r = ge) {
    this.input = e;
    this.replayUserMessages = s;
    this.maxLineChars = r;
    ((this.input = e),
      (this.sessionState = n ?? new SessionStateTracker()),
      (this.sessionState.getPendingActionDetails = (o) => {
        let h = [];
        for (let [m, y] of this.publishedPendingActionDetails)
          if (this.pendingRequests.has(m) || m === o) h.push(y);
        return h;
      }),
      this.sessionState.stateChanged.subscribe((o) => {
        if (o !== "requires_action") this.flipBackLeftToUnpublishedAsk = !1;
        if (o === "idle") this.endSdkSchemaStretch();
      }),
      (this.structuredInput = this.read()));
  }
  trackResolvedToolUseId(e) {
    if (e.request.subtype === "can_use_tool") this.resolvedToolUseIds.add(e.request.tool_use_id);
    if (JZe(e)) rememberResolvedPromptRequestId(e.request_id);
  }
  watchConfirmAnswerEvent(e) {
    this.confirmAnswerEventIds.set(e, void 0);
  }
  noteConfirmAnswerEvent(e, s) {
    if (
      e.request.subtype === "can_use_tool" &&
      this.confirmAnswerEventIds.has(e.request.tool_use_id) &&
      this.confirmAnswerEventIds.get(e.request.tool_use_id) === void 0
    )
      this.confirmAnswerEventIds.set(e.request.tool_use_id, s);
  }
  takeConfirmAnswerEventId(e) {
    let s = this.confirmAnswerEventIds.get(e);
    return (this.confirmAnswerEventIds.delete(e), s);
  }
  flushInternalEvents() {
    return Promise.resolve();
  }
  watchInternalEventPosts() {
    return;
  }
  refusedInternalEvents(e) {
    return [];
  }
  sessionServiceNow() {
    return;
  }
  sessionServiceNowAtMost() {
    return;
  }
  readStreamFrameAt() {
    return;
  }
  sessionStreamJoinedAt() {
    return;
  }
  newestSessionStreamCreatedAt() {
    return;
  }
  withdrawQueuedRequest(e) {
    return !1;
  }
  flushDeliveryAcks() {
    return Promise.resolve();
  }
  flushDeliveryAcksConfirmed() {
    return Promise.resolve(!0);
  }
  flushClientEvents() {
    return Promise.resolve(!0);
  }
  flushInternalEventsConfirmed() {
    return Promise.resolve(!0);
  }
  flushSessionState() {
    return Promise.resolve(!0);
  }
  get sessionStatePatchesRefused() {
    return 0;
  }
  get internalEventsPending() {
    return 0;
  }
  get unsentInternalEvents() {
    return 0;
  }
  get droppedInternalBatches() {
    return 0;
  }
  repliesLeftForNextProcess = 0;
  prependUserMessage(e, s = "process") {
    if (configProbeEnv()) {
      logForDebugging(
        "Dropped a user message that this process queued for itself: CLAUDE_CODE_CONFIG_PROBE is set, so it only answers its host's requests",
      );
      return;
    }
    (this.prependedLines.push({
      line: jsonStringify({
        type: "user",
        session_id: "",
        message: { role: "user", content: e },
        parent_tool_use_id: null,
      }),
      hostLocal: !0,
      personsOwn: s === "person",
    }),
      this.prependWaker?.());
  }
  readAgain(e) {
    (this.prependedLines.push({ line: jsonStringify(e), hostLocal: !1, personsOwn: !1 }),
      this.prependWaker?.());
  }
  noteInputWritten(e) {
    let index = e.indexOf(M);
    while (index !== -1) {
      let index_2 = e.indexOf(
        `
`,
        index,
      );
      if (index_2 === -1) return;
      (this.answerLinesWritten++, (index = e.indexOf(M, index_2)));
    }
  }
  whenReceivedAnswersRead() {
    if (this.answerLinesWritten <= this.answerLinesRead) return;
    return ((this.receivedAnswersRead ??= Promise.withResolvers()), this.receivedAnswersRead.promise);
  }
  noteAnswerLinesRead(e) {
    if (((this.answerLinesRead = e), this.answerLinesWritten <= e))
      (this.receivedAnswersRead?.resolve(), (this.receivedAnswersRead = void 0));
  }
  isLocallyPrependedMessage(e) {
    return this.locallyPrependedMessages.has(e);
  }
  isPersonsOwnPrepend(e) {
    return this.personsOwnPrepends.has(e);
  }
  takeUserFrameReceivedWallMs(e) {
    return;
  }
  userFrameStartedAtMs(e) {
    return;
  }
  userFrameReceivedAtMs(e) {
    return;
  }
  async *read() {
    let e = "",
      s = [],
      n = 0,
      r = !1,
      o = 0,
      h = 0,
      m = !1;
    function y(w) {
      if ((o++, (h += w.length), m)) return;
      ((m = !0),
        yieldToEventLoop().then(() => {
          ((o = 0), (h = 0), (m = !1));
        }));
    }
    let q = async function* () {
        for (;;) {
          if (o >= STDIN_LIMITS || h >= ke) (await yieldToEventLoop(), (o = 0), (h = 0));
          let w = !1;
          while (this.prependedLines.length > 0) {
            let { line: line, hostLocal: hostLocal, personsOwn: personsOwn } = this.prependedLines.shift();
            ((w = !0), y(line));
            let processLine = await this.processLine(line);
            if (processLine) {
              if (hostLocal) this.locallyPrependedMessages.add(processLine);
              if (personsOwn) this.personsOwnPrepends.add(processLine);
              (logForDiagnosticsNoPII("info", "cli_stdin_message_parsed", describeInputLineLazy(processLine)),
                yield processLine);
            }
          }
          if (w) continue;
          let index = e.indexOf(`
`);
          if (index === -1) break;
          let sliced = e.slice(0, index);
          ((e = e.slice(index + 1)), y(sliced));
          let processLine = await this.processLine(sliced);
          if (processLine)
            (logForDiagnosticsNoPII("info", "cli_stdin_message_parsed", describeInputLineLazy(processLine)),
              (this.hasUnconsumedInput = e.trim().length > 0),
              yield processLine);
          if (this.answerLinesRead < this.answerLinesWritten && sliced.includes(M))
            this.noteAnswerLinesRead(this.answerLinesRead + 1);
        }
        this.hasUnconsumedInput = e.trim().length > 0;
      }.bind(this),
      R = this.input[Symbol.asyncIterator](),
      S = null,
      k = !1;
    try {
      for (;;) {
        if (r || this.prependedLines.length > 0) {
          if (s.length > 0) ((e += s.join("")), (s = []));
          if ((yield* q(), (n = e.length), n > this.maxLineChars))
            (logForDiagnosticsNoPII("warn", "cli_stream_json_line_budget", { at: "tail" }),
              await this.exitOnFatalInput(inputTooLargeError(this.maxLineChars)));
          r = !1;
        }
        S ??= R.next();
        let winner = await Promise.race([
          S.then(() => !1),
          new Promise((O) => {
            this.prependWaker = () => O(!0);
          }),
        ]);
        if (((this.prependWaker = null), winner)) continue;
        let C = await S;
        if (((S = null), C.done)) {
          k = !0;
          break;
        }
        n += C.value.length;
        let included = C.value.includes(`
`);
        if (!included && n > this.maxLineChars)
          (logForDiagnosticsNoPII("warn", "cli_stream_json_line_budget", { at: "block" }),
            await this.exitOnFatalInput(inputTooLargeError(this.maxLineChars)));
        if ((s.push(C.value), included)) r = !0;
        else if (!this.hasUnconsumedInput && /\S/.test(C.value)) this.hasUnconsumedInput = !0;
      }
    } finally {
      if (((this.prependWaker = null), this.noteAnswerLinesRead(Number.POSITIVE_INFINITY), !k))
        await R.return?.();
    }
    if (s.length > 0) ((e += s.join("")), (s = []));
    if (e) {
      let processLine = await this.processLine(e);
      if (((this.hasUnconsumedInput = !1), processLine)) yield processLine;
    }
    this.inputClosed = !0;
    let A = isTerminalShutdown();
    if (!A && oIr()) {
      for (let [w, C] of this.pendingRequests.entries())
        if (
          !C.forwarded &&
          C.request.request.subtype === "can_use_tool" &&
          C.request.request.tool_name === ASKUSERQUESTION
        )
          this.streamCloseInterruptRequestIds.add(w);
      if (this.streamCloseInterruptRequestIds.size > 0) this.onStreamClosedWithParkedQuestion?.();
    }
    for (let w of this.pendingRequests.values()) {
      if (A && this.asksOurHuman(w)) continue;
      w.reject(new StreamClosedAbortError(oKo));
    }
  }
  hasPendingRequests() {
    return this.pendingRequests.size > 0;
  }
  onRequestPending(e) {
    return this.requestPending.subscribe(e);
  }
  getPendingPermissionRequests() {
    return Array.from(this.pendingRequests.values())
      .map((e) => e.request)
      .filter((e) => e.request.subtype === "can_use_tool");
  }
  getPendingUserDialogRequests() {
    return Array.from(this.pendingRequests.values())
      .map((e) => e.request)
      .filter((e) => e.request.subtype === "request_user_dialog");
  }
  getPendingElicitationRequests() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_aurora", !1) === !0
      ? Array.from(this.pendingRequests.values())
          .map((e) => e.request)
          .filter((e) => e.request.subtype === "elicitation")
      : void 0;
  }
  hasPendingPrompt() {
    for (let { request: request } of this.pendingRequests.values()) if (JZe(request)) return !0;
    return !1;
  }
  hasStandingPrompt() {
    if (this.sessionState.getState() !== "requires_action") return !1;
    if (this.flipBackLeftToUnpublishedAsk) return this.hasPendingPrompt();
    for (let e of this.publishedPendingActionDetails.keys()) if (this.pendingRequests.has(e)) return !0;
    return !1;
  }
  hasTurnPrompt() {
    for (let e of this.publishedPendingActionDetails.keys()) if (!this.backgroundPromptIds.has(e)) return !0;
    return !1;
  }
  listTurnPrompts() {
    return [...this.publishedPendingActionDetails.keys()].filter((e) => !this.backgroundPromptIds.has(e));
  }
  retireSdkHostHookCallbacks(e) {
    (this.sdkHostHookGeneration++, (this.retiredHostHookAnswer = e));
    let s = 0;
    for (let [n, r] of Array.from(this.pendingRequests)) {
      let request = r.request.request;
      if (request.subtype !== "hook_callback") continue;
      let h = e(request.input),
        m = r.schema ? r.schema.parse(h) : h;
      (this.pendingRequests.delete(n), this.enqueueCancelRequest(n), r.resolve(m), s++);
    }
    return s;
  }
  republishSurvivingPendingAction() {
    let e;
    for (let [s, n] of this.publishedPendingActionDetails) if (this.pendingRequests.has(s)) e = n;
    if (!e) {
      ((this.flipBackLeftToUnpublishedAsk = this.sessionState.getState() === "requires_action"),
        this.sessionState.forgetWrittenLead());
      return;
    }
    (this.sessionState.republishPendingAction(e),
      logEvent("tengu_pending_action_republished", {
        survivor_kind: fromEnum(
          e.tool_name === MCP_ELICITATION_DIALOG_TOOL
            ? "elicitation"
            : e.tool_name.startsWith("dialog:")
              ? "dialog"
              : "permission",
        ),
        pending_permission_requests: this.getPendingPermissionRequests().length,
        pending_dialog_requests: this.getPendingUserDialogRequests().length,
      }));
  }
  cancelPendingUserDialogs(e, s) {
    let n = 0;
    for (let { request: request } of Array.from(this.pendingRequests.values())) {
      if (request.request.subtype !== "request_user_dialog" || request.request.dialog_kind !== e) continue;
      if (!this.cancelDialogByMachine(request.request_id, "moved_on")) continue;
      (logEvent("tengu_request_user_dialog_implicit_cancel", {
        dialog_kind: gn(e),
        ...dialogSourceAttr(e, request.request.payload),
        reason: fromEnum(s),
      }),
        (n += 1));
    }
    return n;
  }
  cancelDialogsANewPromptCloses(e) {
    let s = 0;
    for (let n of Array.from(this.dialogsANewPromptCloses)) {
      let r = this.pendingRequests.get(n)?.request.request;
      if (r?.subtype !== "request_user_dialog" || !this.cancelDialogByMachine(n, "moved_on")) continue;
      (logEvent("tengu_request_user_dialog_implicit_cancel", {
        dialog_kind: gn(r.dialog_kind),
        ...dialogSourceAttr(r.dialog_kind, r.payload),
        reason: fromEnum(e),
      }),
        (s += 1));
    }
    return s;
  }
  logDialogsLeftUp(e) {
    for (let dialogsANewPromptClose of this.dialogsANewPromptCloses) {
      let n = this.pendingRequests.get(dialogsANewPromptClose)?.request.request;
      if (n?.subtype === "request_user_dialog")
        logEvent("tengu_request_user_dialog_left_up", {
          dialog_kind: gn(n.dialog_kind),
          ...dialogSourceAttr(n.dialog_kind, n.payload),
          ...(e !== void 0 && { client_platform: yW(e) }),
        });
    }
  }
  cancelDialogByMachine(e, s) {
    if (!this.pendingRequests.has(e) || isTerminalShutdown()) return !1;
    let injectControlResponse = this.injectControlResponse({
      type: "control_response",
      response: { subtype: "success", request_id: e, response: { behavior: "cancelled" } },
    });
    if (injectControlResponse) this.unansweredSettleHandlers.get(e)?.(s);
    return injectControlResponse;
  }
  setUnexpectedResponseCallback(e) {
    this.unexpectedResponseCallback = e;
  }
  setUnclaimedResponseObserver(e) {
    this.unclaimedResponseObserver = e;
  }
  setMainLoopLiveness(e) {
    this.mainLoopLiveness = e;
  }
  mainLoopLiveness;
  ignoresErrorShapedDialogResponse(e, s) {
    if (s.subtype !== "error" || e.request.request.subtype !== "request_user_dialog" || e.forwarded)
      return !1;
    return (
      logEvent("tengu_request_user_dialog_response_ignored", {
        shape: fromEnum("error"),
        dialog_kind: gn(e.request.request.dialog_kind),
        ...dialogSourceAttr(e.request.request.dialog_kind, e.request.request.payload),
      }),
      logForDebugging(
        `Ignoring error-shaped control_response for parked request_user_dialog request_id=${s.request_id} \u2014 not a human choice; dialog stays parked (error: ${errorFieldText(s.error)})`,
      ),
      !0
    );
  }
  ignoresErrorShapedUiHostResponse(e, s) {
    let { subtype: subtype } = e.request.request;
    if (s.subtype !== "error" || !isKnownControlSubtype(e.request.request)) return !1;
    return (
      logForDebugging(
        `Ignoring error-shaped control_response for ${subtype} request_id=${s.request_id} - not the named client's answer; still waiting (error: ${errorFieldText(s.error)})`,
      ),
      !0
    );
  }
  asksOurHuman(e) {
    return !e.forwarded && JZe(e.request);
  }
  get pendingHumanRequestCount() {
    let e = 0;
    for (let s of this.pendingRequests.values()) if (this.asksOurHuman(s)) e++;
    return e;
  }
  ignoresResponseAtShutdown(e, s) {
    if (!this.asksOurHuman(e) || !isTerminalShutdown()) return !1;
    return (
      logForDebugging(
        `Leaving control_response for request_id=${s.request_id} to the next process \u2014 this one is shutting down and settles no question`,
      ),
      this.repliesLeftForNextProcess++,
      !0
    );
  }
  ignoresUnsettlingDeviceResponse(e, s) {
    let n = this.deviceRequests.get(s.request_id);
    if (!n) return !1;
    let subtype = e.request.request.subtype;
    if (s.subtype === "error")
      return (
        (n.errorRepliesIgnored += 1),
        logForDebugging(
          `Ignoring error-shaped control_response for device ${subtype} request_id=${s.request_id} \u2014 not the device's answer; still waiting (error: ${errorFieldText(s.error)})`,
        ),
        !0
      );
    if (!n.accepts(s.response))
      return (
        (n.malformedRepliesIgnored += 1),
        logForDebugging(
          `Ignoring malformed control_response for device ${subtype} request_id=${s.request_id} \u2014 not an answer to it; still waiting`,
        ),
        !0
      );
    return !1;
  }
  hasCanUseToolNameMismatch(e, s) {
    let request = e.request.request;
    if (request.subtype !== "can_use_tool" || s.subtype !== "success") return !1;
    return isValidBridgeToolName(s.response?.toolName, request.tool_name, s.request_id);
  }
  rememberApprovalTicket(e, s, n) {
    if (
      s.forwarded ||
      s.request.request.subtype !== "can_use_tool" ||
      n.subtype !== "success" ||
      !this.hostDialogAttestations.has(e)
    )
      return;
    let r = getApprovalTicket(n.response);
    if (r !== void 0) this.approvalTickets.set(e, r);
  }
  injectRemoteControlResponse(e) {
    let s = this.pendingRequests.get(e.response?.request_id ?? "")?.request.request;
    return (
      !(s?.subtype === "request_user_dialog" && s.dialog_kind === ENUM_PROMPT) &&
      this.injectControlResponse(e)
    );
  }
  injectControlResponse(e) {
    let s = this.blankedPromptDenyTarget(e.response) ?? e.response?.request_id;
    if (!s) return !1;
    let n = this.pendingRequests.get(s);
    if (!n)
      return (
        logEvent("tengu_inject_control_response_unknown_id", {
          pending_control_requests: this.pendingRequests.size,
        }),
        !1
      );
    if (this.ignoresErrorShapedDialogResponse(n, e.response)) return !1;
    if (this.ignoresErrorShapedUiHostResponse(n, e.response)) return !1;
    if (this.ignoresResponseAtShutdown(n, e.response)) return !1;
    if (this.ignoresUnsettlingDeviceResponse(n, e.response)) return !1;
    if (this.hasCanUseToolNameMismatch(n, e.response)) return !1;
    if (
      (this.trackResolvedToolUseId(n.request),
      this.pendingRequests.delete(s),
      this.rememberApprovalTicket(s, n, e.response),
      s !== e.response?.request_id)
    )
      this.onControlRequestResolved?.(s);
    if ((this.sendCancelRequest(s), e.response.subtype === "error")) n.reject(Error(e.response.error));
    else {
      let response = e.response.response;
      if (n.schema)
        try {
          n.resolve(n.schema.parse(response));
        } catch (error) {
          n.reject(error);
        }
      else n.resolve({});
    }
    return !0;
  }
  setOnControlRequestSent(e) {
    this.onControlRequestSent = e;
  }
  setOnControlRequestResolved(e) {
    this.onControlRequestResolved = e;
  }
  setOnStreamClosedWithParkedQuestion(e) {
    this.onStreamClosedWithParkedQuestion = e;
  }
  async processLine(e) {
    if (!e.trim()) return;
    e = Wo(e);
    try {
      let s = normalizeControlMessage(jsonParse(e));
      if (s.type === "keep_alive") return;
      if (s.type === "update_environment_variables") {
        if (!this.acceptsInboundEnvUpdates()) {
          let variables = s.variables,
            A = typeof variables === "object" && variables !== null ? Object.keys(variables) : [],
            filtered = A.filter((O) => W.has(O)),
            C = A.length - filtered.length,
            E = C > 0 ? filtered.concat(`${C} other`) : filtered;
          (logForDebugging(
            `[structuredIO] refused update_environment_variables: this worker does not take environment updates from its inbound stream (keys: ${E.join(", ") || "none"})`,
            { level: "warn" },
          ),
            this.retireDroppedFrame("uuid" in s ? s.uuid : void 0));
          return;
        }
        let variables = s.variables;
        if (
          typeof variables !== "object" ||
          variables === null ||
          Array.isArray(variables) ||
          Object.values(variables).some((k) => typeof k !== "string")
        ) {
          if (
            (logForDebugging(
              "[structuredIO] dropped update_environment_variables: variables must be an object of string values",
            ),
            typeof s.request_id === "string" && s.request_id)
          )
            this.writeActivityLine(
              ndjsonStringify({
                type: "control_response",
                response: {
                  subtype: "error",
                  request_id: s.request_id,
                  error: "update_environment_variables: variables must be an object of string values",
                },
              }) +
                `
`,
            );
          return;
        }
        let r = [],
          o = [],
          h = !1,
          m = !1,
          y,
          q = !1,
          R;
        for (let [k, A] of Object.entries(s.variables)) {
          if (!W.has(k)) {
            o.push(k);
            continue;
          }
          if (k === "CLAUDE_CODE_SESSIONS_OAUTH_TOKEN") {
            y = A;
            continue;
          }
          if (k === "CLAUDE_CODE_OAUTH_TOKEN" && isLauncherStartedProcess()) {
            let w = holdPushedLauncherHostLogin(A);
            if (w === null) o.push(k);
            else ((h = !0), w.then(() => clearOAuthTokenCache()));
            continue;
          }
          if (k === "CLAUDE_CODE_OAUTH_TOKEN" && hostSessionsBearerOffered() && !isClaudeAISignInToken(A))
            ((q = !0), (R = claudeAISignInTokenInForce()));
          if (!applySessionTokenEnv(k, A)) process.env[k] = A;
          r.push(k);
        }
        let S = h || r.includes("CLAUDE_CODE_OAUTH_TOKEN");
        if (S) {
          if ((clearOAuthTokenCache(), h || q)) forgetHeldHostSessionsBearer(R);
        }
        if (y !== void 0)
          if (hostSessionsBearerOffered() && acceptPushedHostSessionsBearer(y))
            ((m = !0), r.push("CLAUDE_CODE_SESSIONS_OAUTH_TOKEN"));
          else o.push("CLAUDE_CODE_SESSIONS_OAUTH_TOKEN");
        if (o.length > 0)
          logForDebugging(`[structuredIO] refused update_environment_variables keys: ${o.join(", ")}`);
        if (!S && (!m || r.length > 1)) emitCredentialChange();
        if (h)
          logForDebugging(
            "[structuredIO] update_environment_variables offered CLAUDE_CODE_OAUTH_TOKEN to the session's judge, not applied yet",
          );
        if (r.length > 0)
          logForDebugging(`[structuredIO] applied update_environment_variables: ${r.join(", ")}`);
        if (typeof s.request_id === "string" && s.request_id)
          this.writeActivityLine(
            ndjsonStringify({
              type: "control_response",
              response: { subtype: "success", request_id: s.request_id },
            }) +
              `
`,
          );
        return;
      }
      if (s.type === "control_response") {
        let n = "uuid" in s && typeof s.uuid === "string" ? s.uuid : void 0,
          response = s.response;
        if (typeof response !== "object" || response === null || Array.isArray(response)) {
          if (n) this.onCommandLifecycle?.(n, "completed");
          logForDebugging("[structuredIO] dropped control_response with malformed response payload");
          return;
        }
        if (isLauncherStartupAsk(s.response.request_id)) {
          if (n) this.onCommandLifecycle?.(n, "completed");
          return;
        }
        let o = this.blankedPromptDenyTarget(s.response) ?? s.response.request_id,
          h = this.pendingRequests.get(o);
        if (!h) {
          let settleUnknownResponse = this.settleUnknownResponse(s, n);
          if (settleUnknownResponse !== void 0) await settleUnknownResponse;
          return;
        }
        if (isTerminalShutdown() && this.asksOurHuman(h)) {
          (logForDebugging(
            `Leaving control_response for request_id=${o} to the next process \u2014 this one is shutting down and settles no question`,
          ),
            this.repliesLeftForNextProcess++);
          return;
        }
        if (n) this.onCommandLifecycle?.(n, "completed");
        if (this.ignoresErrorShapedDialogResponse(h, s.response)) return;
        if (this.ignoresErrorShapedUiHostResponse(h, s.response)) return;
        if (this.ignoresUnsettlingDeviceResponse(h, s.response)) return;
        if (this.hasCanUseToolNameMismatch(h, s.response)) return;
        if (
          (this.trackResolvedToolUseId(h.request),
          this.pendingRequests.delete(o),
          this.hostOwnsStdinOrigin &&
            !h.forwarded &&
            this.hostDialogAttestations.has(o) &&
            h.request.request.subtype === "can_use_tool" &&
            s.response.subtype === "success" &&
            isHostDialogApproval(s.response.response))
        )
          this.hostDialogAttestations.set(o, !0);
        if (
          (this.rememberApprovalTicket(o, h, s.response),
          h.request.request.subtype === "can_use_tool" && this.onControlRequestResolved)
        )
          this.onControlRequestResolved(o);
        if (o !== s.response.request_id) this.enqueueCancelRequest(o);
        if (
          h.request.request.subtype === "elicitation" &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_humming_waterfall", !1) === !0
        )
          this.sendCancelRequest(o);
        if (JZe(h.request) && !(h.forwarded && s.response.subtype === "error"))
          (this.recordUserDrivenInbound(s), this.recordAnsweredPrompt(s, h.request.request.subtype));
        if (s.response.subtype === "error") {
          h.reject(Error(s.response.error));
          return;
        }
        let response_2 = s.response.response;
        if (!h.forwarded) this.noteConfirmAnswerEvent(h.request, n);
        if (h.schema)
          try {
            h.resolve(h.schema.parse(response_2));
          } catch (error) {
            h.reject(error);
          }
        else h.resolve({});
        if (this.replayUserMessages && !ce.has(h.request.request.subtype))
          return stripLiveOnlyMarker(getRiskColor(s));
        return;
      }
      if (
        s.type !== "workflow_launch" &&
        s.type !== "user" &&
        !(
          s.type === "control_request" &&
          shouldRejectUiControl(
            subtypeOf(s.request),
            () => this.uiSurfaceFrameOf(s, !1),
            () => this.surfaceRequestJudgedAt(s),
          )
        ) &&
        isUserInitiatedInboundEvent(s, { hostOwnsOrigin: this.hostOwnsStdinOrigin })
      )
        this.recordUserDrivenInbound(s);
      if (
        s.type !== "user" &&
        s.type !== "bash_command" &&
        s.type !== "control_request" &&
        s.type !== "control_cancel_request" &&
        s.type !== "assistant" &&
        s.type !== "system" &&
        s.type !== "queued_notification" &&
        s.type !== "session_notice" &&
        s.type !== "workflow_launch"
      ) {
        let n = s.type;
        (logForDebugging(
          `Ignoring unknown message type: ${typeof n === "string" ? truncatedErrorText(n) : `(a value of JSON type ${typeof n})`}`,
          { level: "warn" },
        ),
          this.retireDroppedFrame(typeof s === "object" && s !== null && "uuid" in s ? s.uuid : void 0));
        return;
      }
      if (s.type === "workflow_launch") return s;
      if (s.type === "control_request") {
        if (this.isRemoteTransport()) {
          let request = s.request,
            r = typeof request !== "object" || request === null || Array.isArray(request);
          if (r || !("subtype" in request) || typeof request.subtype !== "string") {
            (logEvent("tengu_sdk_malformed_input", {
              message_type: lit("control_request"),
              reason: fromEnum(r ? "missing_request" : "subtype_not_string"),
              transport: lit("remote"),
              outcome: lit("dropped"),
              has_event_uuid: "uuid" in s && Vt(s.uuid) !== null,
            }),
              logForDebugging("Dropping control_request: missing request object or non-string subtype", {
                level: "warn",
              }),
              this.retireDroppedFrame("uuid" in s ? s.uuid : void 0));
            return;
          }
        } else if (!s.request) return this.exitOnFatalInput("Error: Missing request on control_request");
        return s;
      }
      if (s.type === "control_cancel_request") return typeof s.request_id === "string" ? s : void 0;
      if (s.type === "assistant" || s.type === "system") return s;
      if (s.type === "bash_command") return s;
      if (s.type === "queued_notification") return s;
      if (s.type === "session_notice") return s;
      if (s.message?.role !== "user") {
        if (!this.isRemoteTransport())
          return this.exitOnFatalInput(
            `Error: Expected message role 'user', got '${truncatedErrorText(String(s.message?.role))}'`,
          );
        let n = extractPlainUserMessage(s.message),
          r =
            n === void 0
              ? "dropped"
              : !n.plain
                ? "unwrap_refused"
                : env.CLAUDE_CODE_DISABLE_NESTED_USER_REPAIR
                  ? "repair_disabled"
                  : "repaired",
          o = classifyMessageRoleShape(s.message),
          h = Vt(s.uuid) !== null;
        if (
          (logEvent("tengu_sdk_malformed_input", {
            message_type: lit("user"),
            reason: lit("invalid_message_role"),
            transport: lit("remote"),
            outcome: fromEnum(r),
            wire_shape: fromEnum(o),
            has_event_uuid: h,
          }),
          logForDiagnosticsNoPII("warn", "cli_malformed_user_message", {
            outcome: r,
            wire_shape: o,
            has_event_uuid: h,
          }),
          n === void 0 || r !== "repaired")
        ) {
          (logForDebugging(
            `Dropping malformed user message (${r}, ${o}, event uuid ${h ? "present" : "absent"}): expected message role 'user'`,
            { level: "warn" },
          ),
            this.retireDroppedFrame(s.uuid));
          return;
        }
        let m = s;
        ((m.message = n.inner), logForDebugging("Repaired a nested user message (one level)"));
      }
      if (isUserInitiatedInboundEvent(s, { hostOwnsOrigin: this.hostOwnsStdinOrigin }))
        this.recordUserDrivenInbound(s);
      return s;
    } catch (error) {
      return this.exitOnFatalInput(formatStreamInputParseError(e, error));
    }
  }
  blankedPromptDenyTarget(e) {
    if (e?.subtype !== "success" || e.response?.behavior !== "deny") return;
    let toolUseID = e.response.toolUseID;
    if (
      typeof toolUseID !== "string" ||
      toolUseID === "" ||
      e.request_id !== toolUseID ||
      this.pendingRequests.has(toolUseID)
    )
      return;
    for (let [n, r] of this.publishedPendingActionDetails)
      if (
        r.tool_use_id === toolUseID &&
        (r.request_id === ""
          ? r.suppressed_request_id === n
          : r.request_id === n && this.sessionState.isWrittenSlim(r)) &&
        this.pendingRequests.get(n)?.request.request.subtype === "can_use_tool"
      )
        return (
          logForDebugging(
            `[structuredIO] deny keyed on toolUseID=${toolUseID} settles its blanked prompt request_id=${n}`,
          ),
          n
        );
    return;
  }
  settleUnknownResponse(e, s) {
    if (isTerminalShutdown()) {
      logForDebugging(
        `Leaving control_response for request_id=${e.response.request_id} to the next process \u2014 this one is shutting down and settles no question`,
      );
      return;
    }
    if (s) this.onCommandLifecycle?.(s, "completed");
    let n = this.timedOutUserDialogs.get(e.response.request_id);
    if (n) {
      this.timedOutUserDialogs.delete(e.response.request_id);
      let h = e.response.subtype === "success" ? e.response.response?.behavior : void 0,
        subtype = e.response.subtype;
      (logEvent("tengu_request_user_dialog_late_answer", {
        dialog_kind: gn(n.dialogKind),
        ...n.source,
        lateness_ms: Date.now() - n.timedOutAt,
        response_subtype: fromEnum(subtype === "success" || subtype === "error" ? subtype : "other"),
        behavior: fromEnum(h === "completed" || h === "cancelled" ? h : h === void 0 ? "absent" : "other"),
      }),
        logForDebugging(
          `Ignoring late request_user_dialog answer for request_id=${e.response.request_id}: the park deadline already settled this dialog as cancelled ${Date.now() - n.timedOutAt}ms ago`,
        ));
      return;
    }
    let r = e.response.subtype === "success" ? e.response.response : void 0,
      o = r?.toolUseID;
    if (typeof o === "string" && this.resolvedToolUseIds.has(o)) {
      logForDebugging(
        `Ignoring duplicate control_response for already-resolved toolUseID=${o} request_id=${e.response.request_id}`,
      );
      return;
    }
    if (this.unexpectedResponseCallback === void 0) {
      try {
        this.unclaimedResponseObserver?.({
          answerKind: e.response.subtype === "success" ? permissionResponseTelemetry(r) : {},
          toolUseId: typeof o === "string" ? o : void 0,
        });
      } catch (error) {
        logError(error);
      }
      return;
    }
    return this.unexpectedResponseCallback(getRiskColor(e), getApprovalTicket(r));
  }
  resetStallWatchdog() {
    this.stallFired = !1;
  }
  recordUserDrivenInbound(e) {
    RKs();
  }
  recordAnsweredPrompt(e, s) {}
  retireDroppedFrame(e) {
    let s = Vt(e);
    if (s) this.onCommandLifecycle?.(s, "completed");
  }
  trackWrite(e) {
    if (e.type === "result" || this.stallFired) {
      if (this.stallTimer !== void 0) (clearTimeout(this.stallTimer), (this.stallTimer = void 0));
    } else if (
      ((this.stallLastWriteAtMs = performance.now()),
      (this.stallLastWriteType = e.type),
      this.stallTimer === void 0)
    )
      this.armStallTimer(F);
    let s = e.type === "result" && this.resultDelivery ? this.resultDelivery.stamp(e) : e;
    if (s.type !== "system") this.sampleForSdkSchemaCheck(s);
    if (s.type === "result") ((this.sdkSchemaResultWritten = !0), this.armSdkSchemaCheck());
    return s;
  }
  armStallTimer(e) {
    ((this.stallTimer = setTimeout(() => {
      this.stallTimer = void 0;
      let s = this.stallLastWriteAtMs + F - performance.now();
      if (s > Phr) {
        this.armStallTimer(s);
        return;
      }
      if (this.sessionState.getState() !== "running") return;
      ((this.stallFired = !0),
        logEvent("tengu_sdk_stall", {
          session_age_ms: Date.now() - this.createdAt,
          session_state: fromEnum(this.sessionState.getState()),
          last_message_type: fromEnumOpt(this.stallLastWriteType),
          pending_control_requests: this.pendingRequests.size,
        }));
    }, e)),
      this.stallTimer.unref());
  }
  sampleForSdkSchemaCheck(e) {
    if (((this.sdkSchemaStretchSampled ??= Math.random() < fe), !this.sdkSchemaStretchSampled)) return;
    let s = this.sdkSchemaKept.get(e.type) ?? { frames: 0, json: void 0 };
    if (((s.frames += 1), this.sdkSchemaKept.set(e.type, s), Math.random() >= 1 / s.frames)) return;
    try {
      let n = jsonStringify(e);
      if (n.length <= he) s.json = n;
    } catch {}
  }
  sdkSchemaFramesKept() {
    for (let e of this.sdkSchemaKept.values()) if (e.json !== void 0) return !0;
    return !1;
  }
  endSdkSchemaStretch() {
    if (this.sdkSchemaFramesKept()) {
      this.armSdkSchemaCheck();
      return;
    }
    ((this.sdkSchemaStretchSampled = void 0), this.sdkSchemaKept.clear());
  }
  armSdkSchemaCheck() {
    if (!this.sdkSchemaFramesKept() || !this.sdkSchemaResultWritten) return;
    (clearTimeout(this.sdkSchemaCheckTimer),
      (this.sdkSchemaCheckTimer = setTimeout(() => {
        if (this.sessionState.getState() !== "idle" || this.inputClosed || isTerminalShutdown()) return;
        let e = [...this.sdkSchemaKept.entries()];
        (this.sdkSchemaKept.clear(), (this.sdkSchemaStretchSampled = void 0));
        let builtCount = tlo.builtCount();
        try {
          let n = jls();
          for (let [r, { json: json }] of e) {
            if (json === void 0) continue;
            let h = jsonParse(json),
              safeParse = n.safeParse(h);
            if (!safeParse.success)
              logEvent("tengu_sdk_schema_violation", {
                message_type: fromEnum(r),
                error_path: sanitizeJsonPath(safeParse.error.issues[0]?.path, _e),
              });
          }
        } catch (error) {
          logForDebugging(
            `Could not check the sampled frames against the SDK output schema; they are dropped: ${errorMessage(error)}`,
          );
        } finally {
          tlo.releaseBuiltSince(builtCount);
        }
      }, me)),
      this.sdkSchemaCheckTimer.unref());
  }
  writeActivityLine(e) {
    (this.streamEventHold?.release(), writeToStdout(e));
  }
  acceptsInboundEnvUpdates() {
    return !0;
  }
  exitOnFatalInput(e) {
    return (this.stopHoldingStreamEvents(), exitWithMessage(e));
  }
  stopHoldingStreamEvents() {
    this.streamEventHold?.stop();
  }
  async write(e) {
    if (this.streamEventHold !== void 0 && this.streamEventHold.keeps(e)) return;
    let heldDueBefore = this.heldDueBefore(e);
    if (heldDueBefore.length > 0) (await this.writeHeld(heldDueBefore), this.streamEventHold?.release());
    let trackWrite = this.trackWrite(e);
    writeToStdout(
      ndjsonStringify(trackWrite) +
        `
`,
    );
    let heldDueAfter = this.heldDueAfter(trackWrite);
    if (heldDueAfter.length > 0) await this.writeHeld(heldDueAfter);
  }
  writeAfterInit(e) {
    this.heldUntilInit.push(e);
  }
  heldDueBefore(e) {
    return e.type === "result" ? this.heldUntilInit.splice(0) : [];
  }
  heldDueAfter(e) {
    return e.type === "system" && e.subtype === "init" ? this.heldUntilInit.splice(0) : [];
  }
  async writeHeld(e) {
    for (let s of e)
      try {
        await this.write(s);
      } catch (error) {
        logForDebugging(`held frame write failed: ${error}`, { level: "warn" });
      }
  }
  passControlRequestToHost(e, { requestId: requestId, schema: schema, signal: signal }) {
    if (this.pendingRequests.has(requestId))
      return Promise.reject(new AbortError("a control request with this request_id is already pending"));
    return this.sendRequest(e, schema, signal, { requestId: requestId, forwarded: !0 });
  }
  async sendRequest(
    e,
    s,
    n,
    { requestId: requestId = randomUUID(), forwarded: forwarded = !1, deviceHook: deviceHook = !1 } = {},
  ) {
    let m = { type: "control_request", request_id: requestId, request: e },
      y = { ...m, request: PLs(e) },
      q = !forwarded && JZe(m);
    if (q && isTerminalShutdown() && !n?.aborted) return heldUntilExit();
    if (e.subtype === "elicitation" && !forwarded) rememberElicitationRequestId(requestId);
    else if (isKnownControlSubtype(e) && !forwarded) rememberHostAskRequestId(requestId);
    else if (!forwarded && !deviceHook) rememberOutboundRequestId(requestId, { automated: !q });
    else if (deviceHook) rememberDeviceOutboundRequestId(requestId);
    if (this.inputClosed) throw new StreamClosedAbortError(WVr);
    if (n?.aborted) throw new AbortError("Request aborted");
    if ((this.outbound.enqueue(forwarded ? y : m), e.subtype === "can_use_tool" && this.onControlRequestSent))
      this.onControlRequestSent(y);
    if (q) this.sessionState.beginUserDecision();
    let R = () => {
      if (q && isTerminalShutdown()) return;
      if (m.request.subtype === "can_use_tool" && n !== void 0 && isAskWithdrawnByAsker(n))
        this.answerOwnWithdrawnAsk(requestId, m.request.tool_use_id);
      this.enqueueCancelRequest(requestId);
      let k = this.pendingRequests.get(requestId);
      if (k) {
        if (
          (this.trackResolvedToolUseId(k.request),
          k.request.request.subtype === "can_use_tool" && this.onControlRequestResolved)
        )
          this.onControlRequestResolved(requestId);
        (this.pendingRequests.delete(requestId), k.reject(new AbortError()));
      }
    };
    if (n) n.addEventListener("abort", R, { once: !0 });
    let S;
    try {
      return await new Promise((k, A) => {
        ((S = {
          request: y,
          resolve: (w) => {
            k(w);
          },
          reject: A,
          schema: s,
          ...(forwarded && { forwarded: forwarded }),
        }),
          this.pendingRequests.set(requestId, S),
          this.requestPending.emit());
      });
    } finally {
      if (n) n.removeEventListener("abort", R);
      if (this.pendingRequests.get(requestId) === S) this.pendingRequests.delete(requestId);
      if (q) this.sessionState.endUserDecision();
    }
  }
  emitPermissionDenied(e, s, n, r) {
    let decisionReason = r.decisionReason;
    this.outbound.enqueue({
      type: "system",
      subtype: "permission_denied",
      tool_name: e,
      tool_use_id: s,
      agent_id: n,
      decision_reason_type: decisionReason?.type,
      decision_reason_code: decisionReasonCode(decisionReason),
      decision_reason: serializeDecisionReason(decisionReason),
      message: r.message,
      uuid: randomUUID(),
      session_id: getSessionId(),
    });
  }
  createCanUseTool(e, s) {
    return createPermissionAsker(e, this.permissionPromptHost(e.kind, s));
  }
  keptAsk;
  holdKeptAsk(e) {
    this.keptAsk = e;
  }
  permissionPromptHost(e, s) {
    return {
      keptAskFor: (n) => (this.keptAsk?.card.tool_use_id === n ? this.keptAsk : void 0),
      request: (n, r, o) => (
        this.hostDialogAttestations.set(o, !1),
        this.sendRequest(n, MARKETPLACE_ONLY_MANIFEST_FIELDS(e), r, { requestId: o })
      ),
      isPending: (n) => this.pendingRequests.has(n),
      interruptedAtStreamClose: (n) => this.streamCloseInterruptRequestIds.has(n),
      answeredAtHostDialog: (n) => {
        let r = this.hostDialogAttestations.get(n) === !0;
        if (r) this.hostDialogAttestations.set(n, !1);
        return r;
      },
      takeApprovalTicket: (n) => {
        let r = this.approvalTickets.get(n);
        return (this.approvalTickets.delete(n), r);
      },
      emitPermissionDenied: (n, r, o, h) => this.emitPermissionDenied(n, r, o, h),
      promptShown:
        s &&
        ((n, r, o, h) => {
          if ((this.publishedPendingActionDetails.set(n, r), h !== void 0)) this.backgroundPromptIds.add(n);
          if (o !== void 0) this.sessionState.notifyNestedPromptBlocking(o);
          s(r);
        }),
      promptSettled: (n, r) => this.settlePermissionPrompt(n, r),
    };
  }
  settlePermissionPrompt(e, s) {
    if (s !== void 0) this.sessionState.notifyNestedPromptUnblocking(s);
    (this.hostDialogAttestations.delete(e),
      this.approvalTickets.delete(e),
      this.settlePublishedPrompt(e, !0));
  }
  settlePublishedPrompt(e, s) {
    if (
      (this.publishedPendingActionDetails.delete(e),
      this.backgroundPromptIds.delete(e),
      !this.hasPendingPrompt())
    ) {
      this.flipBackFromRequiresAction();
      return;
    }
    if (s) this.sessionState.reteeWaitingOnUser();
    this.republishSurvivingPendingAction();
  }
  flipBackFromRequiresAction() {
    if (isTerminalShutdown()) return;
    let e = this.sessionState.heldRequiresAction?.();
    if (e) {
      ((this.flipBackLeftToUnpublishedAsk = !1), this.sessionState.notifyStateChanged("requires_action", e));
      return;
    }
    this.sessionState.notifyStateChanged(this.mainLoopLiveness?.() === !1 ? "idle" : "running");
  }
  createHookCallback(e, s) {
    let sdkHostHookGeneration = this.sdkHostHookGeneration;
    return {
      type: "callback",
      timeout: s,
      callback: async (r, o, h) => {
        if (sdkHostHookGeneration !== this.sdkHostHookGeneration && this.retiredHostHookAnswer)
          return this.retiredHostHookAnswer(r);
        try {
          let sendRequest = await this.sendRequest(
            { subtype: "hook_callback", callback_id: e, input: r, tool_use_id: o || void 0 },
            hookJSONOutputSchema(),
            h,
          );
          return (noteSdkHostHookAnswered(), sendRequest);
        } catch (error) {
          if (isAbortError(error)) throw error;
          return (noteSdkHostHookAnswered(), console.error(`Error in hook callback ${e}:`, error), {});
        }
      },
    };
  }
  async sendUiHostRequest(e, s, n) {
    if (!Fce(this.uiSurfaceChannel())) return;
    let isRemoteTransport = this.isRemoteTransport(),
      o = randomUUID();
    if (isRemoteTransport) this.trackDeviceRequest(o, "host_ask", () => !0);
    let timeout = AbortSignal.timeout(n),
      m = await this.sendRequest(e, s, timeout, { requestId: o })
        .then(
          (y) => ({ answer: y, failure: void 0 }),
          (y) => ({ answer: void 0, failure: classifyStreamError(y, timeout) }),
        )
        .finally(() => this.deviceRequests.delete(o));
    if (isRemoteTransport && m.failure === void 0) logFeatureOk("plugin_function_hooks_host_ask");
    else if (isRemoteTransport && m.failure !== void 0)
      logFeatureSad("plugin_function_hooks_host_ask", m.failure);
    return m.answer;
  }
  takesUiHostAsks() {
    return !this.isRemoteTransport() || QZe(this.sessionWriters());
  }
  async sendUiHostAsk(e, s, n) {
    if (!Fce(this.uiSurfaceChannel())) return { answer: void 0, cause: "not_asked" };
    let timeout = AbortSignal.timeout(n);
    try {
      return { answer: await this.sendRequest(e, s, timeout), cause: void 0 };
    } catch (error) {
      return { answer: void 0, cause: classifyStreamError(error, timeout) };
    }
  }
  sendDeviceHookCallback(e) {
    let s = randomUUID(),
      trackDeviceRequest = this.trackDeviceRequest(s, "hook", (m) => parseControlResponse(m) !== null),
      abortController = new AbortController(),
      o = e.signal ? AbortSignal.any([e.signal, abortController.signal]) : abortController.signal,
      h = this.sendRequest(
        {
          subtype: "hook_callback",
          callback_id: e.callbackId,
          input: e.input,
          tool_use_id: e.toolUseID || void 0,
          issued_at: Math.trunc(e.issuedAt),
          deadline_ms: Math.max(1, Math.ceil(e.deadlineMs)),
        },
        oe(),
        o,
        { requestId: s, deviceHook: !0 },
      )
        .then(
          (m) => {
            let y = parseControlResponse(m);
            return y === null ? { malformed: !0 } : { answer: y };
          },
          (m) => {
            if (isAbortError(m)) throw m;
            return (
              logForDebugging(
                `Device hook_callback request_id=${s} settled with a non-answer; treating as no opinion`,
                { level: "warn" },
              ),
              { malformed: !0 }
            );
          },
        )
        .finally(() => {
          this.deviceRequests.delete(s);
        });
    return {
      requestId: s,
      reply: h,
      cancel: () => abortController.abort(),
      errorRepliesIgnored: () => trackDeviceRequest.errorRepliesIgnored,
      malformedRepliesIgnored: () => trackDeviceRequest.malformedRepliesIgnored,
    };
  }
  trackDeviceRequest(e, s, n, r, o) {
    if (this.deviceRequests.size >= z)
      logForDebugging(
        `Device request bookkeeping past its expected ceiling (${z} live requests); keeping all of them`,
        { level: "warn" },
      );
    let h = {
      kind: s,
      errorRepliesIgnored: 0,
      malformedRepliesIgnored: 0,
      delivery: "queued",
      instanceId: r,
      accepts: n,
      onUpload: o,
    };
    return (this.deviceRequests.set(e, h), h);
  }
  waitsOnHostAsk() {
    for (let e of this.deviceRequests.values()) if (e.kind === "host_ask") return !0;
    return !1;
  }
  liveDeviceRequestKind(e) {
    return this.deviceRequests.get(e)?.kind;
  }
  abandonServedCalls(e, s) {
    let n = 0;
    for (let [r, o] of this.deviceRequests) {
      if (o.kind !== "served_call" || o.instanceId !== e) continue;
      let h = this.pendingRequests.get(r);
      if (!h) continue;
      (this.enqueueCancelRequest(r),
        this.pendingRequests.delete(r),
        h.reject(new ServingInstanceGoneError(s)),
        n++);
    }
    return n;
  }
  withdrawStandingServedCall(e) {
    if (this.pendingRequests.has(e)) return !1;
    return (this.enqueueCancelRequest(e), !0);
  }
  noteRequestsUpload(e, s) {
    let n = 0;
    for (let r of e) {
      let o = this.deviceRequests.get(r);
      if (o === void 0) continue;
      let h = deliveryOutcome(o.delivery, s);
      if (h !== o.delivery) ((o.delivery = h), n++);
      try {
        o.onUpload?.(s);
      } catch (error) {
        logForDebugging(
          `A served call's upload listener threw (${s}); the delivery ledger is unaffected: ${errorMessage(error)}`,
          { level: "warn" },
        );
      }
    }
    return n;
  }
  rejectUndeliveredRequests(e, s) {
    let n = 0;
    for (let r of e) {
      let o = this.deviceRequests.get(r);
      if (o?.kind !== "served_call") continue;
      let h = this.pendingRequests.get(r);
      if (!h) continue;
      (this.pendingRequests.delete(r),
        h.reject(
          this.tracksRequestDelivery && o.delivery === "queued"
            ? new RequestNotDeliveredError(s)
            : new RequestDeliveryUnknownError(s),
        ),
        n++);
    }
    return n;
  }
  sendServedCallRequest(e) {
    let s = randomUUID();
    if (this.inputClosed) {
      let reject = Promise.reject(new StreamClosedAbortError(WVr));
      return (
        reject.catch(() => {}),
        {
          requestId: s,
          sent: !1,
          delivery: () => "queued",
          withdraw: () => !1,
          reply: reject,
          cancel: () => {},
          errorRepliesIgnored: () => 0,
        }
      );
    }
    let trackDeviceRequest = this.trackDeviceRequest(
        s,
        "served_call",
        e.accepts,
        e.request.instance_id,
        e.onUpload,
      ),
      abortController = new AbortController(),
      o = e.signal ? AbortSignal.any([e.signal, abortController.signal]) : abortController.signal,
      h = this.sendRequest(e.request, oe(), o, { requestId: s, deviceHook: !0 }).finally(() => {
        this.deviceRequests.delete(s);
      });
    return {
      requestId: s,
      sent: !0,
      delivery: () =>
        this.tracksRequestDelivery ? normalizeDeliveryState(trackDeviceRequest.delivery) : "untracked",
      withdraw: () => this.withdrawUnsentServedCall(s),
      reply: h,
      cancel: () => {
        if (this.pendingRequests.has(s)) {
          abortController.abort();
          return;
        }
        this.enqueueCancelRequest(s);
      },
      errorRepliesIgnored: () => trackDeviceRequest.errorRepliesIgnored,
    };
  }
  askToAnnounce(e, s) {
    this.sendRequest(e, oe(), s, { deviceHook: !0 }).catch(() => {});
  }
  withdrawUnsentServedCall(e) {
    let s = this.deviceRequests.get(e),
      n = this.pendingRequests.get(e);
    if (!this.tracksRequestDelivery || n === void 0 || s?.kind !== "served_call" || s.delivery !== "queued")
      return !1;
    if (!this.withdrawQueuedRequest(e)) return !1;
    return (this.pendingRequests.delete(e), n.reject(new RequestWithdrawnUnsentError()), !0);
  }
  async handleElicitation(e, s, n, r, o, h, m, y, q = !1) {
    if (!this.hostAnswersElicitations) return { action: "cancel" };
    if (isTerminalShutdown()) {
      if (r?.aborted) return { action: "cancel" };
      return heldUntilExit();
    }
    if (this.inputClosed || r?.aborted) return { action: "cancel" };
    let R = randomUUID(),
      S = {
        tool_name: MCP_ELICITATION_DIALOG_TOOL,
        display_tool_name: "Claude needs your input",
        action_description: "Answer the MCP server's question to continue",
        tool_use_id: "",
        request_id: R,
      };
    if ((this.publishedPendingActionDetails.set(R, S), q)) this.backgroundPromptIds.add(R);
    (this.sessionState.notifyStateChanged("requires_action", S), this.onUserDialogParked?.(S));
    let k = n?.properties;
    try {
      return await this.sendRequest(
        {
          subtype: "elicitation",
          mcp_server_name: e,
          message: s,
          mode: o,
          url: h,
          elicitation_id: m,
          requested_schema: n,
          property_order: o !== "url" && isPlainObject(k) ? Object.keys(k) : void 0,
          title: y?.title,
          display_name: y?.displayName,
          description: y?.description,
        },
        Mls(),
        r,
        { requestId: R },
      );
    } catch {
      return { action: "cancel" };
    } finally {
      this.settlePublishedPrompt(R, !r?.aborted);
    }
  }
  async requestUserDialog(e, s, n) {
    if (isTerminalShutdown()) {
      if (n?.signal?.aborted) return { behavior: "cancelled" };
      return heldUntilExit();
    }
    let r = randomUUID(),
      o = dialogPermissionRequest(e, s, r, n?.toolUseId);
    (this.publishedPendingActionDetails.set(r, o),
      this.sessionState.notifyStateChanged("requires_action", o),
      this.onUserDialogParked?.(o));
    let h = dialogSourceAttr(e, s);
    if (
      (logEvent("tengu_request_user_dialog_requires_action", { dialog_kind: gn(e), ...h }),
      n?.onSettledUnanswered)
    )
      this.unansweredSettleHandlers.set(r, n.onSettledUnanswered);
    if (n?.closesOnNewPrompt) this.dialogsANewPromptCloses.add(r);
    let m = lci(n?.parkTimeoutMs),
      y;
    if (m > 0)
      ((y = setTimeout(
        (R, S, k, A) => {
          if (
            (this.timedOutUserDialogs.set(R, { dialogKind: S, timedOutAt: Date.now(), source: A }),
            !this.cancelDialogByMachine(R, "deadline"))
          ) {
            this.timedOutUserDialogs.delete(R);
            return;
          }
          logEvent("tengu_request_user_dialog_timeout", { dialog_kind: gn(S), ...A, timeout_ms: k });
        },
        m,
        r,
        e,
        m,
        h,
      )),
        y.unref());
    let q = !this.inputClosed && n?.signal?.aborted !== !0;
    try {
      return await this.sendRequest(
        { subtype: "request_user_dialog", dialog_kind: e, payload: s, tool_use_id: n?.toolUseId },
        Uxn(),
        n?.signal,
        { requestId: r },
      );
    } catch {
      return { behavior: "cancelled" };
    } finally {
      if (y !== void 0) clearTimeout(y);
      if (
        (this.unansweredSettleHandlers.delete(r),
        this.dialogsANewPromptCloses.delete(r),
        e === ENUM_PROMPT && q)
      )
        this.sendCancelRequest(r);
      this.settlePublishedPrompt(r, !this.timedOutUserDialogs.has(r));
    }
  }
  createSandboxAskCallback(e, s, n, r) {
    let o = new Map(),
      h = async (m) => {
        if (isMisleadingConsentHost(m))
          return (
            logForDebugging(
              `[StructuredIO] Refusing a sandbox network ask for a host srt would re-spell: ${jsonStringify(m)}`,
              { level: "warn" },
            ),
            !1
          );
        try {
          let y = {
              type: "addRules",
              rules: [{ toolName: WEBFETCH, ruleContent: `domain:${consentHostEntry(m)}` }],
              behavior: "allow",
              destination: sandboxHostGrantDestination() ?? "session",
            },
            q = schedulePermissionNotify(humanizeToolName(SANDBOX_NETWORK_ACCESS_TOOL_NAME), n, r),
            R;
          try {
            R = await this.sendRequest(
              {
                subtype: "can_use_tool",
                tool_name: SANDBOX_NETWORK_ACCESS_TOOL_NAME,
                display_name: humanizeToolName(SANDBOX_NETWORK_ACCESS_TOOL_NAME),
                input: { host: m },
                permission_suggestions: [y],
                tool_use_id: randomUUID(),
                description: `Allow network connection to ${m}?`,
              },
              MARKETPLACE_ONLY_MANIFEST_FIELDS(e.kind),
            );
          } finally {
            if ((q(), this.flipBackLeftToUnpublishedAsk && !this.hasPendingPrompt()))
              this.flipBackFromRequiresAction();
          }
          if (R.behavior !== "allow") return !1;
          let updatedPermissions = R.updatedPermissions;
          switch (e.kind) {
            case "launcher":
              if (updatedPermissions && updatedPermissions.length > 0) {
                let k = normalizePermissionUpdate(updatedPermissions, void 0);
                (s?.(
                  (A) => (
                    (k = normalizePermissionUpdate(updatedPermissions, void 0, A)),
                    applyPermissionUpdates(A, k)
                  ),
                ),
                  await persistPermissionUpdates(k, n));
              }
              break;
            case "strict":
              if (
                (s
                  ? applyUpdatesToSessionContext(
                      e,
                      applyPermissionAnswer(updatedPermissions, e.limits),
                      SANDBOX_NETWORK_ACCESS_TOOL_NAME,
                      s,
                      listAnswerTighteningRules(updatedPermissions, e.limits.ruleLength),
                    )
                  : listAnswerTighteningRules(updatedPermissions, e.limits.ruleLength).length) > 0
              )
                return (
                  logForDebugging(
                    "refused a sandbox network answer: a deny or ask rule that the answer added, or may have added, is not among the session's rules",
                    { level: "warn" },
                  ),
                  !1
                );
              break;
          }
          return (SandboxManager.addSessionAllowedHost(m), !0);
        } catch {
          return !1;
        }
      };
    return (m) => {
      let host = m.host,
        q = o.get(host);
      if (q) return q;
      let R = h(host).finally(() => {
        o.delete(host);
      });
      return (o.set(host, R), R);
    };
  }
  async sendMcpMessage(e, s, n = pe) {
    let o = R4n(s) ? void 0 : createCombinedAbortSignal(void 0, { timeoutMs: n, refTimer: !0 });
    try {
      return (
        await this.sendRequest(
          { subtype: "mcp_message", server_name: e, message: s },
          u({ mcp_response: qne().optional() }),
          o?.signal,
        )
      ).mcp_response;
    } finally {
      o?.cleanup();
    }
  }
  async requestOAuthTokenRefresh() {
    let askHostForOAuthToken = await this.askHostForOAuthToken();
    if (typeof askHostForOAuthToken.accessToken === "string" && askHostForOAuthToken.accessToken)
      return (RRi(), askHostForOAuthToken.accessToken);
    if (askHostForOAuthToken.reason !== void 0) CRi(askHostForOAuthToken.reason);
    return null;
  }
  async requestHostSessionsBearer() {
    let now = Date.now(),
      askHostForOAuthToken = await this.askHostForOAuthToken("sessions"),
      n = askHostForOAuthToken.accessToken || null;
    if (n !== null && isClaudeAISignInToken(n))
      ((n = null),
        logEvent("tengu_sdk_oauth_refresh_unfulfilled", {
          outcome: fromEnum("sign_in_token"),
          reason: fromEnum("none"),
          kind: fromEnum("sessions"),
          duration_ms: Date.now() - now,
        }),
        logForDebugging(
          "[host-sessions-bearer] the host answered the cloud-sessions token request with its sign-in token; ignoring it, cloud-sessions calls keep the sign-in token",
          { level: "warn" },
        ));
    else if (n === null)
      logForDebugging(
        `[host-sessions-bearer] the host has no cloud-sessions token (${askHostForOAuthToken.reason ?? "no reason given"}); cloud-sessions calls use the sign-in token until a later ask brings one`,
        { level: "warn" },
      );
    return askHostForOAuthToken.reason === void 0
      ? { accessToken: n }
      : { accessToken: n, reason: askHostForOAuthToken.reason };
  }
  async askHostForOAuthToken(e) {
    let now = Date.now(),
      n;
    try {
      n = await this.sendRequest(
        e === void 0 ? { subtype: "oauth_token_refresh" } : { subtype: "oauth_token_refresh", kind: e },
        Bxn(),
        AbortSignal.timeout(CONTROL_TIMEOUTS),
      );
    } catch (error) {
      throw (
        logEvent("tengu_sdk_oauth_refresh_unfulfilled", {
          outcome: fromEnum(
            error instanceof StreamClosedAbortError
              ? "stream_closed"
              : isAbortError(error)
                ? "timeout"
                : error instanceof kR
                  ? "invalid_response"
                  : "error",
          ),
          reason: fromEnum("none"),
          kind: fromEnum(e ?? "sign_in"),
          duration_ms: Date.now() - now,
        }),
        error
      );
    }
    if (typeof n.accessToken === "string" && n.accessToken) return n;
    return (
      logEvent("tengu_sdk_oauth_refresh_unfulfilled", {
        outcome: fromEnum(n.reason !== void 0 ? "declined" : "null"),
        reason: fromEnum(n.reason ?? "none"),
        kind: fromEnum(e ?? "sign_in"),
        duration_ms: Date.now() - now,
      }),
      n
    );
  }
  async requestRemoteControlWorkSecret(e) {
    try {
      return (
        (
          await this.sendRequest(
            { subtype: "remote_control_work_secret", session_id: e },
            Dls(),
            AbortSignal.timeout(le),
          )
        ).work_secret || null
      );
    } catch (error) {
      return (
        logForDebugging(
          `[bridge:work-secret] host work-secret request failed (${error instanceof Error ? error.name : "unknown"})`,
          { level: "warn" },
        ),
        null
      );
    }
  }
  async requestHostAuthTokenRefresh(e = ue) {
    return this.sendRequest({ subtype: "host_auth_token_refresh" }, Lls(), AbortSignal.timeout(e));
  }
  enqueueCancelRequest(e) {
    this.outbound.enqueue({ type: "control_cancel_request", request_id: e });
  }
  sendCancelRequest(e) {
    if (!this.outbound.ended) {
      this.enqueueCancelRequest(e);
      return;
    }
    this.write({ type: "control_cancel_request", request_id: e }).catch((s) => {
      logForDebugging(`control_cancel_request for request_id=${e} not written: ${errorMessage(s)}`, {
        level: "error",
      });
    });
  }
  answerOwnWithdrawnAsk(e, s) {}
}
//@ chunk-na0b3c5q.js:51278-51576 file-local
async function exitWithMessage(message) {
  console.error(message);
  let s = Date.now() + 2000;
  (await withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (exit)").catch(() => {}),
    await withTimeout(
      flushDiagnosticLogs(),
      Math.max(0, s - Date.now()),
      "diagnostic log flush timeout (exit)",
    ).catch(() => {}),
    await drainStdoutBeforeExit(Math.max(0, s - Date.now()), { scaleBudgetToQueue: !1 }),
    process.exit(1));
}
//@ chunk-na0b3c5q.js:51576-51664 sole-consumer
var we = new Set(["type", "message", "uuid", "session_id", "parent_tool_use_id", "timestamp"]);
//@ chunk-na0b3c5q.js:51664-51754 sole-consumer
function Ae([e, s]) {
  return we.has(e) || (e === "isSynthetic" && s === !1) || (e === "shouldQuery" && s === !0);
}
/**
 * 给 stream-json 输入里的 message 字段分类（无消息、非对象、无 role、role 为 null/数组/对象/字符串/其他），用于解析失败遥测。
 */
//@ chunk-na0b3c5q.js:51754-52136 sole-consumer
function classifyMessageRoleShape(e) {
  if (e === void 0 || e === null) return "no_message";
  if (typeof e !== "object" || Array.isArray(e)) return "non_object_message";
  if (!("role" in e)) return "no_role";
  let role = e.role;
  if (role === void 0) return "no_role";
  if (role === null) return "role_null";
  if (Array.isArray(role)) return "role_array";
  switch (typeof role) {
    case "object":
      return "role_object";
    case "string":
      return "role_string";
    default:
      return "role_other";
  }
}
/**
 * 若输入行是 user 消息（content 为字符串或数组），返回 {inner, plain}；plain 表示外层只含已知字段。
 */
//@ chunk-na0b3c5q.js:52136-52455 sole-consumer
function extractPlainUserMessage(e) {
  if (typeof e !== "object" || e === null || !("message" in e)) return;
  let message = e.message;
  if (
    typeof message !== "object" ||
    message === null ||
    !("role" in message) ||
    message.role !== "user" ||
    !("content" in message) ||
    (typeof message.content !== "string" && !Array.isArray(message.content))
  )
    return;
  return { inner: message, plain: (!("type" in e) || e.type === "user") && Object.entries(e).every(Ae) };
}
//@ chunk-na0b3c5q.js:52455-52638 sole-consumer
function formatStreamInputParseError(e, s) {
  return `Error parsing streaming input line (type=${/"type"\s*:\s*"([\w-]{1,40})"/.exec(e)?.[1] ?? "unknown"}, ${e.length} chars): ${s instanceof Error ? s.name : typeof s}`;
}
//@ chunk-na0b3c5q.js:52638-52781 sole-consumer
function describeInputLineLazy(e) {
  return () => ({
    type: e.type,
    ...(e.type === "user" && { uuid: matchRequestId(e.uuid) }),
    ...(e.type === "control_request" && { subtype: knownSubtypeOrUndefined(e.request.subtype) }),
  });
}
/**
 * SDK 模式下先执行 PermissionRequest 钩子，钩子给出 allow/deny 时直接返回。
 */
//@ chunk-6j594vm1.js:19866-21542 fingerprint = executePermissionRequestHooksForSDK (0.516)
async function executePermissionRequestHooksForSDK(n, e, d, r, m, s, y, f) {
  if (m.forRemoteExecution === !0) return;
  let permissionMode = getToolPermissionContext(m).mode,
    hookGenerator = executePermissionRequestHooks(
      e.name,
      d,
      r,
      m,
      permissionMode,
      s,
      m.abortController.signal,
    );
  for await (let hookResult of hookGenerator)
    if (
      hookResult.permissionRequestResult &&
      (hookResult.permissionRequestResult.behavior === "allow" ||
        hookResult.permissionRequestResult.behavior === "deny")
    ) {
      let decision = hookResult.permissionRequestResult;
      if (decision.behavior === "allow") {
        let updatedInput = decision.updatedInput;
        switch (n.kind) {
          case "launcher":
            break;
          case "strict":
            if (!d0e(updatedInput, r))
              return { decision: denyChangedAnswerInput(e.name, d), interrupt: !1, permanent: !1 };
            updatedInput = void 0;
            break;
        }
        if (obe(e, r, updatedInput, !0))
          return {
            decision: guardAccountMemoryHookRewrite(e, "PermissionRequest"),
            interrupt: !1,
            permanent: !1,
          };
        let b = await validatePermissionRequestUpdatedInput(e, updatedInput, r, (P) =>
          e.validateInput?.(P, { ...m, toolUseId: d }),
        );
        if (b.deny !== void 0) return { decision: b.deny, interrupt: !1, permanent: !1 };
        updatedInput = b.input;
        let C = updatedInput || r;
        if (updatedInput) {
          let updatedContext = guardHookUpdatedInput(
            await checkRuleBasedPermissions(
              e,
              C,
              { ...m, toolUseId: d, permissionRound: void 0 },
              { hookUpdatedInput: updatedInput },
            ),
            e.name,
          );
          if (updatedContext)
            return {
              decision:
                updatedContext.behavior === "ask"
                  ? {
                      behavior: "deny",
                      message: updatedContext.message,
                      decisionReason: updatedContext.decisionReason ?? HOOK_REWRITE_HEADLESS_DENY_REASON,
                      decideLocation: "ask-path",
                    }
                  : { ...updatedContext, decideLocation: "ask-path" },
              interrupt: !1,
              permanent: !1,
            };
        }
        if (y.hostDisplay !== void 0 || isInteractionStillOwed(e, updatedInput)) return;
        let { applied: applied, lostTightenings: lostTightenings } = f()
          ? { applied: [], lostTightenings: 0 }
          : applyPermissionPromptResult(
              n,
              decision.updatedPermissions && Mar(decision.updatedPermissions, getToolPermissionContext(m)),
              e,
              r,
              m,
              y.suppressAlwaysAllowRule === !0,
            );
        if (lostTightenings > 0) return;
        return {
          decision: {
            behavior: "allow",
            updatedInput: C,
            userModified: !1,
            decisionReason: { type: "hook", hookName: "PermissionRequest" },
          },
          interrupt: !1,
          permanent: applied.some((prev) => supportsPersistence(prev.destination)),
        };
      } else
        return {
          decision: {
            behavior: "deny",
            message: decision.message || "Permission denied by PermissionRequest hook",
            decisionReason: { type: "hook", hookName: "PermissionRequest" },
            decideLocation: "ask-path",
          },
          interrupt: decision.interrupt === !0,
          permanent: !1,
        };
    }
  return;
}
/**
 * 沙箱网络访问权限请求的工具名 SandboxNetworkAccess。
 */
//@ chunk-e6aww6q8.js:2818055-2818085 fingerprint = SANDBOX_NETWORK_ACCESS_TOOL_NAME (1)
var SANDBOX_NETWORK_ACCESS_TOOL_NAME = "SandboxNetworkAccess";
//@ chunk-fp6aqx1j.js:18843-19042 fingerprint = buildRequiresActionDetails (0.512)
function buildRequiresActionDetails(e) {
  return {
    tool_name: e.tool_name,
    display_tool_name: e.display_tool_name,
    action_description: e.action_description,
    raw_command: e.raw_command,
    request_id: e.request_id,
    tool_use_id: e.tool_use_id,
  };
}

export {
  SANDBOX_NETWORK_ACCESS_TOOL_NAME,
  executePermissionRequestHooksForSDK,
  StructuredIO,
  buildRequiresActionDetails,
};

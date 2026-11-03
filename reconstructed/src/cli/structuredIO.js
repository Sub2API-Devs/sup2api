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
import { persistsTransport } from "../utils/remoteEnvironment.js";
import { createSignal } from "../utils/signal.js";
import { Stream } from "../utils/stream.js";
import { env } from "../utils/env.js";
import {
  parseIntEnv,
  DEFAULT_MAX_LINE_CHARS,
  configProbeEnv,
  CONTROL_RESPONSE_TYPE,
  STDIN_LIMITS,
  MAX_STDIN_CHARS_PER_LINE,
  inputTooLargeError,
  dialogSourceAttr,
  errorFieldText,
  isKnownControlSubtype,
  OAUTH_TOKEN_ENV_NAMES,
  TOKEN_REFRESH_SUBTYPES,
  subtypeOf,
  truncatedErrorText,
  permissionResponseTelemetry,
  SDK_STALL_TIMEOUT_MS,
  SDK_SCHEMA_SAMPLE_RATE,
  MAX_SAMPLED_SDK_FRAME_CHARS,
  SETTINGS_JSON_SCHEMA,
  SDK_SCHEMA_CHECK_INTERVAL_MS,
  classifyStreamError,
  parseControlResponse,
  MAX_LIVE_DEVICE_REQUESTS,
  deliveryOutcome,
  normalizeDeliveryState,
  MCP_MESSAGE_TIMEOUT_MS,
  CONTROL_TIMEOUTS,
  CONTROL_REQUEST_LONG_TIMEOUT_MS,
  HOST_AUTH_REFRESH_TIMEOUT_MS,
  matchRequestId,
  knownSubtypeOrUndefined,
} from "./structuredIOProtocol.js";
import { systemClock, withTimeout } from "../utils/sleep.js";
import { writeToStdout, drainStdoutBeforeExit } from "../utils/process.js";
import { SessionStateTracker } from "../utils/sessionState.js";
import {
  isPermissionPromptSubtype,
  isUserInitiatedInboundEvent,
  noteInteractiveInput,
  isOwnerAccountOnlyWriters,
} from "./transports/streamEventCoalescing.js";
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
import {
  isInterruptModeOn,
  stripServerPolicyAskOnly,
  createPermissionAsker,
} from "../services/pushNotifications/permissionPush.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { StreamClosedAbortError, errorMessage, AbortError, isAbortError } from "../utils/errors.js";
import { TOOL_PERMISSION_STREAM_CLOSED_TEXT, STREAM_CLOSED_TEXT } from "./toolPermissionStream.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { MCP_ELICITATION_DIALOG_TOOL, dialogPermissionRequest } from "../utils/teleport/sessionCreate.js";
import { shortHash } from "../utils/shortHash.js";
import { entrypointForTelemetry } from "../services/api/logging.js";
import { isValidBridgeToolName, humanizeToolName } from "../bridge/bridgePermissionResponse.js";
import { getApprovalTicket } from "../bridge/bridgePermissionCallbacks.js";
import { ENUM_PROMPT } from "../components/nudges/nudgeIds.js";
import { stripBom } from "../utils/json.js";
import { normalizeControlMessage } from "../utils/controlMessageCompat.js";
import { ndjsonStringify } from "./ndjsonSafeStringify.js";
import {
  isLauncherStartedProcess,
  holdPushedLauncherHostLogin,
  isLauncherStartupAsk,
  clearLauncherLoginEnd,
  recordLauncherLoginEnd,
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
import { shouldRejectUiControl, canServeManifests } from "./sdkMcpManifests.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { logError } from "../utils/log.js";
import { MONOTONIC_TIMER_RECHECK_MS, isAskWithdrawnByAsker } from "../utils/abortController.js";
import { LAZY_COMPONENT_REGISTRY } from "./handlers/util.js";
import {
  StdoutMessageSchema,
  ElicitationResponseSchema,
  UserDialogResponseSchema,
  OAuthTokenRefreshResponseSchema,
  RemoteControlWorkSecretResponseSchema,
  HostAuthTokenRefreshResponseSchema,
} from "../entrypoints/sdk/controlSchemas.js";
import { sanitizeJsonPath } from "../services/daemon/sessionCron.js";
import { decisionReasonCode, HOOK_REWRITE_HEADLESS_DENY_REASON } from "../types/permissions.js";
import { serializeDecisionReason } from "../utils/permissions/decisionReasons.js";
import { getSessionId, noteSdkHostHookAnswered } from "../bootstrap/state.js";
import { MARKETPLACE_ONLY_MANIFEST_FIELDS } from "../utils/plugins/validatePlugin.js";
import { hookJSONOutputSchema } from "../types/hooks.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { unknown, u, qne } from "../../vendor/zod/v4/classic/schemas.js";
import {
  ServingInstanceGoneError,
  RequestNotDeliveredError,
  RequestDeliveryUnknownError,
  RequestWithdrawnUnsentError,
} from "../services/remoteTools/servingErrors.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { clampDialogTimeoutMs } from "../services/requestUserDialog.js";
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
import {
  normalizePermissionUpdate,
  filterPermissionUpdatePayload,
} from "../utils/permissions/permissionRulePayload.js";
import {
  applyPermissionUpdates,
  persistPermissionUpdates,
  supportsPersistence,
} from "../utils/permissions/PermissionUpdate.js";
import {
  applyUpdatesToSessionContext,
  applyPermissionAnswer,
  listAnswerTighteningRules,
  isUnchangedAnswerInput,
  denyChangedAnswerInput,
} from "../utils/permissions/permissionAnswer.js";
import { isJsonRpcRequest } from "../services/mcp/SdkControlTransport.js";
import { createCombinedAbortSignal } from "../utils/combinedAbortSignal.js";
import { ZodError } from "../../vendor/zod/v4/classic/errors.js";
import { drainRegisteredWriteQueues } from "../utils/settings/writeQueues.js";
import { getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { executePermissionRequestHooks } from "../utils/hooks.js";
import {
  shouldReplaceMemoryInput,
  guardHookUpdatedInput,
  checkRuleBasedPermissions,
  isInteractionStillOwed,
} from "../utils/permissions/permissions.js";
import {
  guardAccountMemoryHookRewrite,
  validatePermissionRequestUpdatedInput,
} from "../utils/hooks/hookUpdatedInput.js";

//@ chunk-na0b3c5q.js:9613-51278 callgraph-witnessed = StructuredIO (0.256)
/**
 * StructuredIO：stream-json 协议的本地实现。read() 按行（\n）读 stdin，processLine 解析每行：keep_alive 丢弃、update_environment_variables 按白名单应用、control_response 匹配挂起请求、control_request 交给调用方、user/assistant/system 消息透传；sendRequest 发出 control_request（can_use_tool、hook_callback、elicitation、mcp_message…）并等待回复；write 输出 NDJSON。
 */
class StructuredIO {
  input;
  replayUserMessages;
  maxLineChars;
  isRemoteTransport() {
    return false;
  }
  uiSurfaceFrameOf(e, isAnySurfaceAttached) {
    let redactsWhatItPersists = this.redactsWhatItPersists();
    return this.isRemoteTransport()
      ? {
          isRemoteTransport: true,
          redactsWhatItPersists,
          isAnySurfaceAttached,
          createdAt: undefined,
          sessionWriters: undefined,
          isAtFloor: false,
          leavesBelowFloor: false,
        }
      : {
          isRemoteTransport: false,
          redactsWhatItPersists,
          isAnySurfaceAttached,
        };
  }
  surfaceRequestJudgedAt(e) {
    let s = this.surfaceRequestsJudgedAt.get(e) ?? Date.now();
    this.surfaceRequestsJudgedAt.set(e, s);
    return s;
  }
  surfaceRequestsJudgedAt = new WeakMap();
  redactsWhatItPersists() {
    return persistsTransport({
      hostedWorker: this.isHostedWorker,
      transportPersists: this.persistsOutboundFrames,
    });
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
    return true;
  }
  controlRequestEnded(e) {}
  answersSurfaceRefusal(e) {
    return true;
  }
  surfaceSenderStands(e) {
    return true;
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
  flipBackLeftToUnpublishedAsk = false;
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
    return Promise.resolve({
      read: true,
      assertion: undefined,
    });
  }
  workerEpoch() {
    return 0;
  }
  hydratePrefetch = Promise.resolve(null);
  inputClosed = false;
  hasUnconsumedInput = false;
  answerLinesWritten = 0;
  answerLinesRead = 0;
  receivedAnswersRead;
  tracksRequestDelivery = false;
  unexpectedResponseCallback;
  unclaimedResponseObserver;
  resolvedToolUseIds = new Set();
  prependedLines = [];
  locallyPrependedMessages = new WeakSet();
  personsOwnPrepends = new WeakSet();
  prependWaker = null;
  stallTimer;
  stallFired = false;
  stallLastWriteAtMs = 0;
  stallLastWriteType;
  sdkSchemaStretchSampled;
  sdkSchemaKept = new Map();
  sdkSchemaResultWritten = false;
  sdkSchemaCheckTimer;
  createdAt = Date.now();
  onControlRequestSent;
  onControlRequestResolved;
  onStreamClosedWithParkedQuestion;
  onUserDialogParked;
  hostAnswersElicitations = true;
  onCommandLifecycle;
  resultDelivery;
  commandLifecycleForwarderInstalled = false;
  hostOwnsStdinOrigin = true;
  persistsOutboundFrames = false;
  get isHostedWorker() {
    return false;
  }
  readOwnClientEvent(e) {
    return Promise.resolve({
      kind: "unavailable",
      why: "no_session_channel",
    });
  }
  sessionState;
  outbound = new Stream();
  heldUntilInit = [];
  streamEventHold =
    env.CLAUDE_CODE_STREAM_EVENT_HOLD_MS === undefined
      ? undefined
      : parseIntEnv(
          {
            holdMs: env.CLAUDE_CODE_STREAM_EVENT_HOLD_MS,
            clock: systemClock,
            print: (e, s) => {
              this.trackWrite(e);
              writeToStdout(
                s +
                  `
`,
              );
            },
          },
          env.CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES,
        );
  constructor(input, replayUserMessages, sessionState, maxLineChars = DEFAULT_MAX_LINE_CHARS) {
    this.input = input;
    this.replayUserMessages = replayUserMessages;
    this.maxLineChars = maxLineChars;
    this.input = input;
    this.sessionState = sessionState ?? new SessionStateTracker();
    this.sessionState.getPendingActionDetails = (o) => {
      let h = [];
      for (let [m, y] of this.publishedPendingActionDetails)
        if (this.pendingRequests.has(m) || m === o) h.push(y);
      return h;
    };
    this.sessionState.stateChanged.subscribe((o) => {
      if (o !== "requires_action") this.flipBackLeftToUnpublishedAsk = false;
      if (o === "idle") this.endSdkSchemaStretch();
    });
    this.structuredInput = this.read();
  }
  trackResolvedToolUseId(e) {
    if (e.request.subtype === "can_use_tool") this.resolvedToolUseIds.add(e.request.tool_use_id);
    if (isPermissionPromptSubtype(e)) rememberResolvedPromptRequestId(e.request_id);
  }
  watchConfirmAnswerEvent(e) {
    this.confirmAnswerEventIds.set(e, undefined);
  }
  noteConfirmAnswerEvent(e, s) {
    if (
      e.request.subtype === "can_use_tool" &&
      this.confirmAnswerEventIds.has(e.request.tool_use_id) &&
      this.confirmAnswerEventIds.get(e.request.tool_use_id) === undefined
    )
      this.confirmAnswerEventIds.set(e.request.tool_use_id, s);
  }
  takeConfirmAnswerEventId(e) {
    let s = this.confirmAnswerEventIds.get(e);
    this.confirmAnswerEventIds.delete(e);
    return s;
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
    return false;
  }
  flushDeliveryAcks() {
    return Promise.resolve();
  }
  flushDeliveryAcksConfirmed() {
    return Promise.resolve(true);
  }
  flushClientEvents() {
    return Promise.resolve(true);
  }
  flushInternalEventsConfirmed() {
    return Promise.resolve(true);
  }
  flushSessionState() {
    return Promise.resolve(true);
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
  prependUserMessage(content, s = "process") {
    if (configProbeEnv()) {
      logForDebugging(
        "Dropped a user message that this process queued for itself: CLAUDE_CODE_CONFIG_PROBE is set, so it only answers its host's requests",
      );
      return;
    }
    this.prependedLines.push({
      line: jsonStringify({
        type: "user",
        session_id: "",
        message: {
          role: "user",
          content,
        },
        parent_tool_use_id: null,
      }),
      hostLocal: true,
      personsOwn: s === "person",
    });
    this.prependWaker?.();
  }
  readAgain(e) {
    this.prependedLines.push({
      line: jsonStringify(e),
      hostLocal: false,
      personsOwn: false,
    });
    this.prependWaker?.();
  }
  noteInputWritten(e) {
    let index = e.indexOf(CONTROL_RESPONSE_TYPE);
    while (index !== -1) {
      let index_2 = e.indexOf(
        `
`,
        index,
      );
      if (index_2 === -1) return;
      this.answerLinesWritten++;
      index = e.indexOf(CONTROL_RESPONSE_TYPE, index_2);
    }
  }
  whenReceivedAnswersRead() {
    if (this.answerLinesWritten <= this.answerLinesRead) return;
    this.receivedAnswersRead ??= Promise.withResolvers();
    return this.receivedAnswersRead.promise;
  }
  noteAnswerLinesRead(e) {
    this.answerLinesRead = e;
    if (this.answerLinesWritten <= e) {
      this.receivedAnswersRead?.resolve();
      this.receivedAnswersRead = undefined;
    }
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
    let e = "";
    let s = [];
    let n = 0;
    let r = false;
    let o = 0;
    let h = 0;
    let m = false;
    function y(w) {
      o++;
      h += w.length;
      if (m) return;
      m = true;
      yieldToEventLoop().then(() => {
        o = 0;
        h = 0;
        m = false;
      });
    }
    let q = async function* () {
      for (;;) {
        if (o >= STDIN_LIMITS || h >= MAX_STDIN_CHARS_PER_LINE) {
          await yieldToEventLoop();
          o = 0;
          h = 0;
        }
        let w = false;
        while (this.prependedLines.length > 0) {
          let { line, hostLocal, personsOwn } = this.prependedLines.shift();
          w = true;
          y(line);
          let T = await this.processLine(line);
          if (T) {
            if (hostLocal) this.locallyPrependedMessages.add(T);
            if (personsOwn) this.personsOwnPrepends.add(T);
            logForDiagnosticsNoPII("info", "cli_stdin_message_parsed", describeInputLineLazy(T));
            yield T;
          }
        }
        if (w) continue;
        let index = e.indexOf(`
`);
        if (index === -1) break;
        let sliced = e.slice(0, index);
        e = e.slice(index + 1);
        y(sliced);
        let O = await this.processLine(sliced);
        if (O) {
          logForDiagnosticsNoPII("info", "cli_stdin_message_parsed", describeInputLineLazy(O));
          this.hasUnconsumedInput = e.trim().length > 0;
          yield O;
        }
        if (this.answerLinesRead < this.answerLinesWritten && sliced.includes(CONTROL_RESPONSE_TYPE))
          this.noteAnswerLinesRead(this.answerLinesRead + 1);
      }
      this.hasUnconsumedInput = e.trim().length > 0;
    }.bind(this);
    let R = this.input[Symbol.asyncIterator]();
    let S = null;
    let k = false;
    try {
      for (;;) {
        if (r || this.prependedLines.length > 0) {
          if (s.length > 0) {
            e += s.join("");
            s = [];
          }
          yield* q();
          n = e.length;
          if (n > this.maxLineChars) {
            logForDiagnosticsNoPII("warn", "cli_stream_json_line_budget", {
              at: "tail",
            });
            await this.exitOnFatalInput(inputTooLargeError(this.maxLineChars));
          }
          r = false;
        }
        S ??= R.next();
        let winner = await Promise.race([
          S.then(() => false),
          new Promise((resolve) => {
            this.prependWaker = () => resolve(true);
          }),
        ]);
        this.prependWaker = null;
        if (winner) continue;
        let C = await S;
        S = null;
        if (C.done) {
          k = true;
          break;
        }
        n += C.value.length;
        let included = C.value.includes(`
`);
        if (!included && n > this.maxLineChars) {
          logForDiagnosticsNoPII("warn", "cli_stream_json_line_budget", {
            at: "block",
          });
          await this.exitOnFatalInput(inputTooLargeError(this.maxLineChars));
        }
        s.push(C.value);
        if (included) r = true;
        else if (!this.hasUnconsumedInput && /\S/.test(C.value)) this.hasUnconsumedInput = true;
      }
    } finally {
      this.prependWaker = null;
      this.noteAnswerLinesRead(Number.POSITIVE_INFINITY);
      if (!k) await R.return?.();
    }
    if (s.length > 0) {
      e += s.join("");
      s = [];
    }
    if (e) {
      let w = await this.processLine(e);
      this.hasUnconsumedInput = false;
      if (w) yield w;
    }
    this.inputClosed = true;
    let A = isTerminalShutdown();
    if (!A && isInterruptModeOn()) {
      for (let [w, C] of this.pendingRequests.entries())
        if (
          !C.forwarded &&
          C.request.request.subtype === "can_use_tool" &&
          C.request.request.tool_name === ASKUSERQUESTION
        )
          this.streamCloseInterruptRequestIds.add(w);
      if (this.streamCloseInterruptRequestIds.size > 0) this.onStreamClosedWithParkedQuestion?.();
    }
    for (let pendingRequest of this.pendingRequests.values()) {
      if (A && this.asksOurHuman(pendingRequest)) continue;
      pendingRequest.reject(new StreamClosedAbortError(TOOL_PERMISSION_STREAM_CLOSED_TEXT));
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
      .map((entry) => entry.request)
      .filter((e) => e.request.subtype === "can_use_tool");
  }
  getPendingUserDialogRequests() {
    return Array.from(this.pendingRequests.values())
      .map((entry) => entry.request)
      .filter((e) => e.request.subtype === "request_user_dialog");
  }
  getPendingElicitationRequests() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_aurora", false) === true
      ? Array.from(this.pendingRequests.values())
          .map((entry) => entry.request)
          .filter((e) => e.request.subtype === "elicitation")
      : undefined;
  }
  hasPendingPrompt() {
    for (let { request } of this.pendingRequests.values())
      if (isPermissionPromptSubtype(request)) return true;
    return false;
  }
  hasStandingPrompt() {
    if (this.sessionState.getState() !== "requires_action") return false;
    if (this.flipBackLeftToUnpublishedAsk) return this.hasPendingPrompt();
    for (let key of this.publishedPendingActionDetails.keys()) if (this.pendingRequests.has(key)) return true;
    return false;
  }
  hasTurnPrompt() {
    for (let key of this.publishedPendingActionDetails.keys())
      if (!this.backgroundPromptIds.has(key)) return true;
    return false;
  }
  listTurnPrompts() {
    return [...this.publishedPendingActionDetails.keys()].filter((key) => !this.backgroundPromptIds.has(key));
  }
  retireSdkHostHookCallbacks(e) {
    this.sdkHostHookGeneration++;
    this.retiredHostHookAnswer = e;
    let s = 0;
    for (let [n, r] of Array.from(this.pendingRequests)) {
      let request = r.request.request;
      if (request.subtype !== "hook_callback") continue;
      let h = e(request.input);
      let m = r.schema ? r.schema.parse(h) : h;
      this.pendingRequests.delete(n);
      this.enqueueCancelRequest(n);
      r.resolve(m);
      s++;
    }
    return s;
  }
  republishSurvivingPendingAction() {
    let e;
    for (let [s, n] of this.publishedPendingActionDetails) if (this.pendingRequests.has(s)) e = n;
    if (!e) {
      this.flipBackLeftToUnpublishedAsk = this.sessionState.getState() === "requires_action";
      this.sessionState.forgetWrittenLead();
      return;
    }
    this.sessionState.republishPendingAction(e);
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
    });
  }
  cancelPendingUserDialogs(e, s) {
    let n = 0;
    for (let { request } of Array.from(this.pendingRequests.values())) {
      if (request.request.subtype !== "request_user_dialog" || request.request.dialog_kind !== e) continue;
      if (!this.cancelDialogByMachine(request.request_id, "moved_on")) continue;
      logEvent("tengu_request_user_dialog_implicit_cancel", {
        dialog_kind: shortHash(e),
        ...dialogSourceAttr(e, request.request.payload),
        reason: fromEnum(s),
      });
      n += 1;
    }
    return n;
  }
  cancelDialogsANewPromptCloses(e) {
    let s = 0;
    for (let dialogsANewPromptClose of Array.from(this.dialogsANewPromptCloses)) {
      let request = this.pendingRequests.get(dialogsANewPromptClose)?.request.request;
      if (
        request?.subtype !== "request_user_dialog" ||
        !this.cancelDialogByMachine(dialogsANewPromptClose, "moved_on")
      )
        continue;
      logEvent("tengu_request_user_dialog_implicit_cancel", {
        dialog_kind: shortHash(request.dialog_kind),
        ...dialogSourceAttr(request.dialog_kind, request.payload),
        reason: fromEnum(e),
      });
      s += 1;
    }
    return s;
  }
  logDialogsLeftUp(e) {
    for (let dialogsANewPromptClose of this.dialogsANewPromptCloses) {
      let request = this.pendingRequests.get(dialogsANewPromptClose)?.request.request;
      if (request?.subtype === "request_user_dialog")
        logEvent("tengu_request_user_dialog_left_up", {
          dialog_kind: shortHash(request.dialog_kind),
          ...dialogSourceAttr(request.dialog_kind, request.payload),
          ...(e !== undefined && {
            client_platform: entrypointForTelemetry(e),
          }),
        });
    }
  }
  cancelDialogByMachine(e, s) {
    if (!this.pendingRequests.has(e) || isTerminalShutdown()) return false;
    let n = this.injectControlResponse({
      type: "control_response",
      response: {
        subtype: "success",
        request_id: e,
        response: {
          behavior: "cancelled",
        },
      },
    });
    if (n) this.unansweredSettleHandlers.get(e)?.(s);
    return n;
  }
  setUnexpectedResponseCallback(unexpectedResponseCallback) {
    this.unexpectedResponseCallback = unexpectedResponseCallback;
  }
  setUnclaimedResponseObserver(unclaimedResponseObserver) {
    this.unclaimedResponseObserver = unclaimedResponseObserver;
  }
  setMainLoopLiveness(mainLoopLiveness) {
    this.mainLoopLiveness = mainLoopLiveness;
  }
  mainLoopLiveness;
  ignoresErrorShapedDialogResponse(e, s) {
    if (s.subtype !== "error" || e.request.request.subtype !== "request_user_dialog" || e.forwarded)
      return false;
    logEvent("tengu_request_user_dialog_response_ignored", {
      shape: fromEnum("error"),
      dialog_kind: shortHash(e.request.request.dialog_kind),
      ...dialogSourceAttr(e.request.request.dialog_kind, e.request.request.payload),
    });
    logForDebugging(
      `Ignoring error-shaped control_response for parked request_user_dialog request_id=${s.request_id} \u2014 not a human choice; dialog stays parked (error: ${errorFieldText(s.error)})`,
    );
    return true;
  }
  ignoresErrorShapedUiHostResponse(e, s) {
    let { subtype } = e.request.request;
    if (s.subtype !== "error" || !isKnownControlSubtype(e.request.request)) return false;
    logForDebugging(
      `Ignoring error-shaped control_response for ${subtype} request_id=${s.request_id} - not the named client's answer; still waiting (error: ${errorFieldText(s.error)})`,
    );
    return true;
  }
  asksOurHuman(e) {
    return !e.forwarded && isPermissionPromptSubtype(e.request);
  }
  get pendingHumanRequestCount() {
    let e = 0;
    for (let pendingRequest of this.pendingRequests.values()) if (this.asksOurHuman(pendingRequest)) e++;
    return e;
  }
  ignoresResponseAtShutdown(e, s) {
    if (!this.asksOurHuman(e) || !isTerminalShutdown()) return false;
    logForDebugging(
      `Leaving control_response for request_id=${s.request_id} to the next process \u2014 this one is shutting down and settles no question`,
    );
    this.repliesLeftForNextProcess++;
    return true;
  }
  ignoresUnsettlingDeviceResponse(e, s) {
    let n = this.deviceRequests.get(s.request_id);
    if (!n) return false;
    let subtype = e.request.request.subtype;
    if (s.subtype === "error") {
      n.errorRepliesIgnored += 1;
      logForDebugging(
        `Ignoring error-shaped control_response for device ${subtype} request_id=${s.request_id} \u2014 not the device's answer; still waiting (error: ${errorFieldText(s.error)})`,
      );
      return true;
    }
    if (!n.accepts(s.response)) {
      n.malformedRepliesIgnored += 1;
      logForDebugging(
        `Ignoring malformed control_response for device ${subtype} request_id=${s.request_id} \u2014 not an answer to it; still waiting`,
      );
      return true;
    }
    return false;
  }
  hasCanUseToolNameMismatch(e, s) {
    let request = e.request.request;
    if (request.subtype !== "can_use_tool" || s.subtype !== "success") return false;
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
    let approvalTicket = getApprovalTicket(n.response);
    if (approvalTicket !== undefined) this.approvalTickets.set(e, approvalTicket);
  }
  injectRemoteControlResponse(e) {
    let request = this.pendingRequests.get(e.response?.request_id ?? "")?.request.request;
    return (
      !(request?.subtype === "request_user_dialog" && request.dialog_kind === ENUM_PROMPT) &&
      this.injectControlResponse(e)
    );
  }
  injectControlResponse(e) {
    let s = this.blankedPromptDenyTarget(e.response) ?? e.response?.request_id;
    if (!s) return false;
    let request = this.pendingRequests.get(s);
    if (!request) {
      logEvent("tengu_inject_control_response_unknown_id", {
        pending_control_requests: this.pendingRequests.size,
      });
      return false;
    }
    if (this.ignoresErrorShapedDialogResponse(request, e.response)) return false;
    if (this.ignoresErrorShapedUiHostResponse(request, e.response)) return false;
    if (this.ignoresResponseAtShutdown(request, e.response)) return false;
    if (this.ignoresUnsettlingDeviceResponse(request, e.response)) return false;
    if (this.hasCanUseToolNameMismatch(request, e.response)) return false;
    this.trackResolvedToolUseId(request.request);
    this.pendingRequests.delete(s);
    this.rememberApprovalTicket(s, request, e.response);
    if (s !== e.response?.request_id) this.onControlRequestResolved?.(s);
    this.sendCancelRequest(s);
    if (e.response.subtype === "error") request.reject(Error(e.response.error));
    else {
      let result = e.response.response;
      if (request.schema)
        try {
          request.resolve(request.schema.parse(result));
        } catch (error) {
          request.reject(error);
        }
      else request.resolve({});
    }
    return true;
  }
  setOnControlRequestSent(onControlRequestSent) {
    this.onControlRequestSent = onControlRequestSent;
  }
  setOnControlRequestResolved(onControlRequestResolved) {
    this.onControlRequestResolved = onControlRequestResolved;
  }
  setOnStreamClosedWithParkedQuestion(onStreamClosedWithParkedQuestion) {
    this.onStreamClosedWithParkedQuestion = onStreamClosedWithParkedQuestion;
  }
  async processLine(e) {
    if (!e.trim()) return;
    e = stripBom(e);
    try {
      let riskLevel = normalizeControlMessage(jsonParse(e));
      if (riskLevel.type === "keep_alive") return;
      if (riskLevel.type === "update_environment_variables") {
        if (!this.acceptsInboundEnvUpdates()) {
          let variables = riskLevel.variables;
          let A = typeof variables === "object" && variables !== null ? Object.keys(variables) : [];
          let filtered = A.filter((O) => OAUTH_TOKEN_ENV_NAMES.has(O));
          let C = A.length - filtered.length;
          let E = C > 0 ? filtered.concat(`${C} other`) : filtered;
          logForDebugging(
            `[structuredIO] refused update_environment_variables: this worker does not take environment updates from its inbound stream (keys: ${E.join(", ") || "none"})`,
            {
              level: "warn",
            },
          );
          this.retireDroppedFrame("uuid" in riskLevel ? riskLevel.uuid : undefined);
          return;
        }
        let variables = riskLevel.variables;
        if (
          typeof variables !== "object" ||
          variables === null ||
          Array.isArray(variables) ||
          Object.values(variables).some((k) => typeof k !== "string")
        ) {
          logForDebugging(
            "[structuredIO] dropped update_environment_variables: variables must be an object of string values",
          );
          if (typeof riskLevel.request_id === "string" && riskLevel.request_id)
            this.writeActivityLine(
              ndjsonStringify({
                type: "control_response",
                response: {
                  subtype: "error",
                  request_id: riskLevel.request_id,
                  error: "update_environment_variables: variables must be an object of string values",
                },
              }) +
                `
`,
            );
          return;
        }
        let r = [];
        let o = [];
        let h = false;
        let m = false;
        let y;
        let q = false;
        let R;
        for (let [key, value] of Object.entries(riskLevel.variables)) {
          if (!OAUTH_TOKEN_ENV_NAMES.has(key)) {
            o.push(key);
            continue;
          }
          if (key === "CLAUDE_CODE_SESSIONS_OAUTH_TOKEN") {
            y = value;
            continue;
          }
          if (key === "CLAUDE_CODE_OAUTH_TOKEN" && isLauncherStartedProcess()) {
            let w = holdPushedLauncherHostLogin(value);
            if (w === null) o.push(key);
            else {
              h = true;
              w.then(() => clearOAuthTokenCache());
            }
            continue;
          }
          if (
            key === "CLAUDE_CODE_OAUTH_TOKEN" &&
            hostSessionsBearerOffered() &&
            !isClaudeAISignInToken(value)
          ) {
            q = true;
            R = claudeAISignInTokenInForce();
          }
          if (!applySessionTokenEnv(key, value)) process.env[key] = value;
          r.push(key);
        }
        let S = h || r.includes("CLAUDE_CODE_OAUTH_TOKEN");
        if (S) {
          clearOAuthTokenCache();
          if (h || q) forgetHeldHostSessionsBearer(R);
        }
        if (y !== undefined)
          if (hostSessionsBearerOffered() && acceptPushedHostSessionsBearer(y)) {
            m = true;
            r.push("CLAUDE_CODE_SESSIONS_OAUTH_TOKEN");
          } else o.push("CLAUDE_CODE_SESSIONS_OAUTH_TOKEN");
        if (o.length > 0)
          logForDebugging(`[structuredIO] refused update_environment_variables keys: ${o.join(", ")}`);
        if (!S && (!m || r.length > 1)) emitCredentialChange();
        if (h)
          logForDebugging(
            "[structuredIO] update_environment_variables offered CLAUDE_CODE_OAUTH_TOKEN to the session's judge, not applied yet",
          );
        if (r.length > 0)
          logForDebugging(`[structuredIO] applied update_environment_variables: ${r.join(", ")}`);
        if (typeof riskLevel.request_id === "string" && riskLevel.request_id)
          this.writeActivityLine(
            ndjsonStringify({
              type: "control_response",
              response: {
                subtype: "success",
                request_id: riskLevel.request_id,
              },
            }) +
              `
`,
          );
        return;
      }
      if (riskLevel.type === "control_response") {
        let uuid = "uuid" in riskLevel && typeof riskLevel.uuid === "string" ? riskLevel.uuid : undefined;
        let response = riskLevel.response;
        if (typeof response !== "object" || response === null || Array.isArray(response)) {
          if (uuid) this.onCommandLifecycle?.(uuid, "completed");
          logForDebugging("[structuredIO] dropped control_response with malformed response payload");
          return;
        }
        if (isLauncherStartupAsk(riskLevel.response.request_id)) {
          if (uuid) this.onCommandLifecycle?.(uuid, "completed");
          return;
        }
        let o = this.blankedPromptDenyTarget(riskLevel.response) ?? riskLevel.response.request_id;
        let h = this.pendingRequests.get(o);
        if (!h) {
          let y = this.settleUnknownResponse(riskLevel, uuid);
          if (y !== undefined) await y;
          return;
        }
        if (isTerminalShutdown() && this.asksOurHuman(h)) {
          logForDebugging(
            `Leaving control_response for request_id=${o} to the next process \u2014 this one is shutting down and settles no question`,
          );
          this.repliesLeftForNextProcess++;
          return;
        }
        if (uuid) this.onCommandLifecycle?.(uuid, "completed");
        if (this.ignoresErrorShapedDialogResponse(h, riskLevel.response)) return;
        if (this.ignoresErrorShapedUiHostResponse(h, riskLevel.response)) return;
        if (this.ignoresUnsettlingDeviceResponse(h, riskLevel.response)) return;
        if (this.hasCanUseToolNameMismatch(h, riskLevel.response)) return;
        this.trackResolvedToolUseId(h.request);
        this.pendingRequests.delete(o);
        if (
          this.hostOwnsStdinOrigin &&
          !h.forwarded &&
          this.hostDialogAttestations.has(o) &&
          h.request.request.subtype === "can_use_tool" &&
          riskLevel.response.subtype === "success" &&
          isHostDialogApproval(riskLevel.response.response)
        )
          this.hostDialogAttestations.set(o, true);
        this.rememberApprovalTicket(o, h, riskLevel.response);
        if (h.request.request.subtype === "can_use_tool" && this.onControlRequestResolved)
          this.onControlRequestResolved(o);
        if (o !== riskLevel.response.request_id) this.enqueueCancelRequest(o);
        if (
          h.request.request.subtype === "elicitation" &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_humming_waterfall", false) === true
        )
          this.sendCancelRequest(o);
        if (
          isPermissionPromptSubtype(h.request) &&
          !(h.forwarded && riskLevel.response.subtype === "error")
        ) {
          this.recordUserDrivenInbound(riskLevel);
          this.recordAnsweredPrompt(riskLevel, h.request.request.subtype);
        }
        if (riskLevel.response.subtype === "error") {
          h.reject(Error(riskLevel.response.error));
          return;
        }
        let response_2 = riskLevel.response.response;
        if (!h.forwarded) this.noteConfirmAnswerEvent(h.request, uuid);
        if (h.schema)
          try {
            h.resolve(h.schema.parse(response_2));
          } catch (error) {
            h.reject(error);
          }
        else h.resolve({});
        if (this.replayUserMessages && !TOKEN_REFRESH_SUBTYPES.has(h.request.request.subtype))
          return stripLiveOnlyMarker(getRiskColor(riskLevel));
        return;
      }
      if (
        riskLevel.type !== "workflow_launch" &&
        riskLevel.type !== "user" &&
        !(
          riskLevel.type === "control_request" &&
          shouldRejectUiControl(
            subtypeOf(riskLevel.request),
            () => this.uiSurfaceFrameOf(riskLevel, false),
            () => this.surfaceRequestJudgedAt(riskLevel),
          )
        ) &&
        isUserInitiatedInboundEvent(riskLevel, {
          hostOwnsOrigin: this.hostOwnsStdinOrigin,
        })
      )
        this.recordUserDrivenInbound(riskLevel);
      if (
        riskLevel.type !== "user" &&
        riskLevel.type !== "bash_command" &&
        riskLevel.type !== "control_request" &&
        riskLevel.type !== "control_cancel_request" &&
        riskLevel.type !== "assistant" &&
        riskLevel.type !== "system" &&
        riskLevel.type !== "queued_notification" &&
        riskLevel.type !== "session_notice" &&
        riskLevel.type !== "workflow_launch"
      ) {
        let n = riskLevel.type;
        logForDebugging(
          `Ignoring unknown message type: ${typeof n === "string" ? truncatedErrorText(n) : `(a value of JSON type ${typeof n})`}`,
          {
            level: "warn",
          },
        );
        this.retireDroppedFrame(
          typeof riskLevel === "object" && riskLevel !== null && "uuid" in riskLevel
            ? riskLevel.uuid
            : undefined,
        );
        return;
      }
      if (riskLevel.type === "workflow_launch") return riskLevel;
      if (riskLevel.type === "control_request") {
        if (this.isRemoteTransport()) {
          let request = riskLevel.request;
          let r = typeof request !== "object" || request === null || Array.isArray(request);
          if (r || !("subtype" in request) || typeof request.subtype !== "string") {
            logEvent("tengu_sdk_malformed_input", {
              message_type: lit("control_request"),
              reason: fromEnum(r ? "missing_request" : "subtype_not_string"),
              transport: lit("remote"),
              outcome: lit("dropped"),
              has_event_uuid: "uuid" in riskLevel && normalizeUuidOrNull(riskLevel.uuid) !== null,
            });
            logForDebugging("Dropping control_request: missing request object or non-string subtype", {
              level: "warn",
            });
            this.retireDroppedFrame("uuid" in riskLevel ? riskLevel.uuid : undefined);
            return;
          }
        } else if (!riskLevel.request)
          return this.exitOnFatalInput("Error: Missing request on control_request");
        return riskLevel;
      }
      if (riskLevel.type === "control_cancel_request")
        return typeof riskLevel.request_id === "string" ? riskLevel : undefined;
      if (riskLevel.type === "assistant" || riskLevel.type === "system") return riskLevel;
      if (riskLevel.type === "bash_command") return riskLevel;
      if (riskLevel.type === "queued_notification") return riskLevel;
      if (riskLevel.type === "session_notice") return riskLevel;
      if (riskLevel.message?.role !== "user") {
        if (!this.isRemoteTransport())
          return this.exitOnFatalInput(
            `Error: Expected message role 'user', got '${truncatedErrorText(String(riskLevel.message?.role))}'`,
          );
        let plainUserMessage = extractPlainUserMessage(riskLevel.message);
        let r =
          plainUserMessage === undefined
            ? "dropped"
            : !plainUserMessage.plain
              ? "unwrap_refused"
              : env.CLAUDE_CODE_DISABLE_NESTED_USER_REPAIR
                ? "repair_disabled"
                : "repaired";
        let o = classifyMessageRoleShape(riskLevel.message);
        let h = normalizeUuidOrNull(riskLevel.uuid) !== null;
        logEvent("tengu_sdk_malformed_input", {
          message_type: lit("user"),
          reason: lit("invalid_message_role"),
          transport: lit("remote"),
          outcome: fromEnum(r),
          wire_shape: fromEnum(o),
          has_event_uuid: h,
        });
        logForDiagnosticsNoPII("warn", "cli_malformed_user_message", {
          outcome: r,
          wire_shape: o,
          has_event_uuid: h,
        });
        if (plainUserMessage === undefined || r !== "repaired") {
          logForDebugging(
            `Dropping malformed user message (${r}, ${o}, event uuid ${h ? "present" : "absent"}): expected message role 'user'`,
            {
              level: "warn",
            },
          );
          this.retireDroppedFrame(riskLevel.uuid);
          return;
        }
        let m = riskLevel;
        m.message = plainUserMessage.inner;
        logForDebugging("Repaired a nested user message (one level)");
      }
      if (
        isUserInitiatedInboundEvent(riskLevel, {
          hostOwnsOrigin: this.hostOwnsStdinOrigin,
        })
      )
        this.recordUserDrivenInbound(riskLevel);
      return riskLevel;
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
      ) {
        logForDebugging(
          `[structuredIO] deny keyed on toolUseID=${toolUseID} settles its blanked prompt request_id=${n}`,
        );
        return n;
      }
    return;
  }
  settleUnknownResponse(riskLevel, s) {
    if (isTerminalShutdown()) {
      logForDebugging(
        `Leaving control_response for request_id=${riskLevel.response.request_id} to the next process \u2014 this one is shutting down and settles no question`,
      );
      return;
    }
    if (s) this.onCommandLifecycle?.(s, "completed");
    let n = this.timedOutUserDialogs.get(riskLevel.response.request_id);
    if (n) {
      this.timedOutUserDialogs.delete(riskLevel.response.request_id);
      let behavior =
        riskLevel.response.subtype === "success" ? riskLevel.response.response?.behavior : undefined;
      let subtype = riskLevel.response.subtype;
      logEvent("tengu_request_user_dialog_late_answer", {
        dialog_kind: shortHash(n.dialogKind),
        ...n.source,
        lateness_ms: Date.now() - n.timedOutAt,
        response_subtype: fromEnum(subtype === "success" || subtype === "error" ? subtype : "other"),
        behavior: fromEnum(
          behavior === "completed" || behavior === "cancelled"
            ? behavior
            : behavior === undefined
              ? "absent"
              : "other",
        ),
      });
      logForDebugging(
        `Ignoring late request_user_dialog answer for request_id=${riskLevel.response.request_id}: the park deadline already settled this dialog as cancelled ${Date.now() - n.timedOutAt}ms ago`,
      );
      return;
    }
    let response = riskLevel.response.subtype === "success" ? riskLevel.response.response : undefined;
    let toolUseID = response?.toolUseID;
    if (typeof toolUseID === "string" && this.resolvedToolUseIds.has(toolUseID)) {
      logForDebugging(
        `Ignoring duplicate control_response for already-resolved toolUseID=${toolUseID} request_id=${riskLevel.response.request_id}`,
      );
      return;
    }
    if (this.unexpectedResponseCallback === undefined) {
      try {
        this.unclaimedResponseObserver?.({
          answerKind: riskLevel.response.subtype === "success" ? permissionResponseTelemetry(response) : {},
          toolUseId: typeof toolUseID === "string" ? toolUseID : undefined,
        });
      } catch (error) {
        logError(error);
      }
      return;
    }
    return this.unexpectedResponseCallback(getRiskColor(riskLevel), getApprovalTicket(response));
  }
  resetStallWatchdog() {
    this.stallFired = false;
  }
  recordUserDrivenInbound(e) {
    noteInteractiveInput();
  }
  recordAnsweredPrompt(e, s) {}
  retireDroppedFrame(e) {
    let s = normalizeUuidOrNull(e);
    if (s) this.onCommandLifecycle?.(s, "completed");
  }
  trackWrite(e) {
    if (e.type === "result" || this.stallFired) {
      if (this.stallTimer !== undefined) {
        clearTimeout(this.stallTimer);
        this.stallTimer = undefined;
      }
    } else {
      this.stallLastWriteAtMs = performance.now();
      this.stallLastWriteType = e.type;
      if (this.stallTimer === undefined) this.armStallTimer(SDK_STALL_TIMEOUT_MS);
    }
    let s = e.type === "result" && this.resultDelivery ? this.resultDelivery.stamp(e) : e;
    if (s.type !== "system") this.sampleForSdkSchemaCheck(s);
    if (s.type === "result") {
      this.sdkSchemaResultWritten = true;
      this.armSdkSchemaCheck();
    }
    return s;
  }
  armStallTimer(e) {
    this.stallTimer = setTimeout(() => {
      this.stallTimer = undefined;
      let s = this.stallLastWriteAtMs + SDK_STALL_TIMEOUT_MS - performance.now();
      if (s > MONOTONIC_TIMER_RECHECK_MS) {
        this.armStallTimer(s);
        return;
      }
      if (this.sessionState.getState() !== "running") return;
      this.stallFired = true;
      logEvent("tengu_sdk_stall", {
        session_age_ms: Date.now() - this.createdAt,
        session_state: fromEnum(this.sessionState.getState()),
        last_message_type: fromEnumOpt(this.stallLastWriteType),
        pending_control_requests: this.pendingRequests.size,
      });
    }, e);
    this.stallTimer.unref();
  }
  sampleForSdkSchemaCheck(e) {
    this.sdkSchemaStretchSampled ??= Math.random() < SDK_SCHEMA_SAMPLE_RATE;
    if (!this.sdkSchemaStretchSampled) return;
    let s = this.sdkSchemaKept.get(e.type) ?? {
      frames: 0,
      json: undefined,
    };
    s.frames += 1;
    this.sdkSchemaKept.set(e.type, s);
    if (Math.random() >= 1 / s.frames) return;
    try {
      let n = jsonStringify(e);
      if (n.length <= MAX_SAMPLED_SDK_FRAME_CHARS) s.json = n;
    } catch {}
  }
  sdkSchemaFramesKept() {
    for (let e of this.sdkSchemaKept.values()) if (e.json !== undefined) return true;
    return false;
  }
  endSdkSchemaStretch() {
    if (this.sdkSchemaFramesKept()) {
      this.armSdkSchemaCheck();
      return;
    }
    this.sdkSchemaStretchSampled = undefined;
    this.sdkSchemaKept.clear();
  }
  armSdkSchemaCheck() {
    if (!this.sdkSchemaFramesKept() || !this.sdkSchemaResultWritten) return;
    clearTimeout(this.sdkSchemaCheckTimer);
    this.sdkSchemaCheckTimer = setTimeout(() => {
      if (this.sessionState.getState() !== "idle" || this.inputClosed || isTerminalShutdown()) return;
      let e = [...this.sdkSchemaKept.entries()];
      this.sdkSchemaKept.clear();
      this.sdkSchemaStretchSampled = undefined;
      let s = LAZY_COMPONENT_REGISTRY.builtCount();
      try {
        let n = StdoutMessageSchema();
        for (let [r, { json }] of e) {
          if (json === undefined) continue;
          let h = jsonParse(json);
          let m = n.safeParse(h);
          if (!m.success)
            logEvent("tengu_sdk_schema_violation", {
              message_type: fromEnum(r),
              error_path: sanitizeJsonPath(m.error.issues[0]?.path, SETTINGS_JSON_SCHEMA),
            });
        }
      } catch (error) {
        logForDebugging(
          `Could not check the sampled frames against the SDK output schema; they are dropped: ${errorMessage(error)}`,
        );
      } finally {
        LAZY_COMPONENT_REGISTRY.releaseBuiltSince(s);
      }
    }, SDK_SCHEMA_CHECK_INTERVAL_MS);
    this.sdkSchemaCheckTimer.unref();
  }
  writeActivityLine(e) {
    this.streamEventHold?.release();
    writeToStdout(e);
  }
  acceptsInboundEnvUpdates() {
    return true;
  }
  exitOnFatalInput(message) {
    this.stopHoldingStreamEvents();
    return exitWithMessage(message);
  }
  stopHoldingStreamEvents() {
    this.streamEventHold?.stop();
  }
  async write(e) {
    if (this.streamEventHold !== undefined && this.streamEventHold.keeps(e)) return;
    let s = this.heldDueBefore(e);
    if (s.length > 0) {
      await this.writeHeld(s);
      this.streamEventHold?.release();
    }
    let n = this.trackWrite(e);
    writeToStdout(
      ndjsonStringify(n) +
        `
`,
    );
    let r = this.heldDueAfter(n);
    if (r.length > 0) await this.writeHeld(r);
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
        logForDebugging(`held frame write failed: ${error}`, {
          level: "warn",
        });
      }
  }
  passControlRequestToHost(e, { requestId, schema, signal }) {
    if (this.pendingRequests.has(requestId))
      return Promise.reject(new AbortError("a control request with this request_id is already pending"));
    return this.sendRequest(e, schema, signal, {
      requestId,
      forwarded: true,
    });
  }
  async sendRequest(e, schema, n, { requestId = randomUUID(), forwarded = false, deviceHook = false } = {}) {
    let m = {
      type: "control_request",
      request_id: requestId,
      request: e,
    };
    let y = {
      ...m,
      request: stripServerPolicyAskOnly(e),
    };
    let q = !forwarded && isPermissionPromptSubtype(m);
    if (q && isTerminalShutdown() && !n?.aborted) return heldUntilExit();
    if (e.subtype === "elicitation" && !forwarded) rememberElicitationRequestId(requestId);
    else if (isKnownControlSubtype(e) && !forwarded) rememberHostAskRequestId(requestId);
    else if (!forwarded && !deviceHook)
      rememberOutboundRequestId(requestId, {
        automated: !q,
      });
    else if (deviceHook) rememberDeviceOutboundRequestId(requestId);
    if (this.inputClosed) throw new StreamClosedAbortError(STREAM_CLOSED_TEXT);
    if (n?.aborted) throw new AbortError("Request aborted");
    this.outbound.enqueue(forwarded ? y : m);
    if (e.subtype === "can_use_tool" && this.onControlRequestSent) this.onControlRequestSent(y);
    if (q) this.sessionState.beginUserDecision();
    let R = () => {
      if (q && isTerminalShutdown()) return;
      if (m.request.subtype === "can_use_tool" && n !== undefined && isAskWithdrawnByAsker(n))
        this.answerOwnWithdrawnAsk(requestId, m.request.tool_use_id);
      this.enqueueCancelRequest(requestId);
      let k = this.pendingRequests.get(requestId);
      if (k) {
        this.trackResolvedToolUseId(k.request);
        if (k.request.request.subtype === "can_use_tool" && this.onControlRequestResolved)
          this.onControlRequestResolved(requestId);
        this.pendingRequests.delete(requestId);
        k.reject(new AbortError());
      }
    };
    if (n)
      n.addEventListener("abort", R, {
        once: true,
      });
    let S;
    try {
      return await new Promise((resolve, reject) => {
        S = {
          request: y,
          resolve: (w) => {
            resolve(w);
          },
          reject,
          schema,
          ...(forwarded && {
            forwarded,
          }),
        };
        this.pendingRequests.set(requestId, S);
        this.requestPending.emit();
      });
    } finally {
      if (n) n.removeEventListener("abort", R);
      if (this.pendingRequests.get(requestId) === S) this.pendingRequests.delete(requestId);
      if (q) this.sessionState.endUserDecision();
    }
  }
  emitPermissionDenied(toolName, toolUseId, agentId, r) {
    let decisionReason = r.decisionReason;
    this.outbound.enqueue({
      type: "system",
      subtype: "permission_denied",
      tool_name: toolName,
      tool_use_id: toolUseId,
      agent_id: agentId,
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
  holdKeptAsk(keptAsk) {
    this.keptAsk = keptAsk;
  }
  permissionPromptHost(e, s) {
    return {
      keptAskFor: (n) => (this.keptAsk?.card.tool_use_id === n ? this.keptAsk : undefined),
      request: (n, r, o) => {
        this.hostDialogAttestations.set(o, false);
        return this.sendRequest(n, MARKETPLACE_ONLY_MANIFEST_FIELDS(e), r, {
          requestId: o,
        });
      },
      isPending: (n) => this.pendingRequests.has(n),
      interruptedAtStreamClose: (n) => this.streamCloseInterruptRequestIds.has(n),
      answeredAtHostDialog: (n) => {
        let r = this.hostDialogAttestations.get(n) === true;
        if (r) this.hostDialogAttestations.set(n, false);
        return r;
      },
      takeApprovalTicket: (n) => {
        let r = this.approvalTickets.get(n);
        this.approvalTickets.delete(n);
        return r;
      },
      emitPermissionDenied: (n, r, o, h) => this.emitPermissionDenied(n, r, o, h),
      promptShown:
        s &&
        ((n, r, o, h) => {
          this.publishedPendingActionDetails.set(n, r);
          if (h !== undefined) this.backgroundPromptIds.add(n);
          if (o !== undefined) this.sessionState.notifyNestedPromptBlocking(o);
          s(r);
        }),
      promptSettled: (n, r) => this.settlePermissionPrompt(n, r),
    };
  }
  settlePermissionPrompt(e, s) {
    if (s !== undefined) this.sessionState.notifyNestedPromptUnblocking(s);
    this.hostDialogAttestations.delete(e);
    this.approvalTickets.delete(e);
    this.settlePublishedPrompt(e, true);
  }
  settlePublishedPrompt(e, s) {
    this.publishedPendingActionDetails.delete(e);
    this.backgroundPromptIds.delete(e);
    if (!this.hasPendingPrompt()) {
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
      this.flipBackLeftToUnpublishedAsk = false;
      this.sessionState.notifyStateChanged("requires_action", e);
      return;
    }
    this.sessionState.notifyStateChanged(this.mainLoopLiveness?.() === false ? "idle" : "running");
  }
  createHookCallback(callbackId, timeout) {
    let sdkHostHookGeneration = this.sdkHostHookGeneration;
    return {
      type: "callback",
      timeout,
      callback: async (input, toolUseID, abort) => {
        if (sdkHostHookGeneration !== this.sdkHostHookGeneration && this.retiredHostHookAnswer)
          return this.retiredHostHookAnswer(input);
        try {
          let result = await this.sendRequest(
            {
              subtype: "hook_callback",
              callback_id: callbackId,
              input,
              tool_use_id: toolUseID || undefined,
            },
            hookJSONOutputSchema(),
            abort,
          );
          noteSdkHostHookAnswered();
          return result;
        } catch (error) {
          if (isAbortError(error)) throw error;
          noteSdkHostHookAnswered();
          console.error(`Error in hook callback ${callbackId}:`, error);
          return {};
        }
      },
    };
  }
  async sendUiHostRequest(e, s, n) {
    if (!canServeManifests(this.uiSurfaceChannel())) return;
    let r = this.isRemoteTransport();
    let o = randomUUID();
    if (r) this.trackDeviceRequest(o, "host_ask", () => true);
    let h = AbortSignal.timeout(n);
    let m = await this.sendRequest(e, s, h, {
      requestId: o,
    })
      .then(
        (answer) => ({
          answer,
          failure: undefined,
        }),
        (error) => ({
          answer: undefined,
          failure: classifyStreamError(error, h),
        }),
      )
      .finally(() => this.deviceRequests.delete(o));
    if (r && m.failure === undefined) logFeatureOk("plugin_function_hooks_host_ask");
    else if (r && m.failure !== undefined) logFeatureSad("plugin_function_hooks_host_ask", m.failure);
    return m.answer;
  }
  takesUiHostAsks() {
    return !this.isRemoteTransport() || isOwnerAccountOnlyWriters(this.sessionWriters());
  }
  async sendUiHostAsk(e, s, n) {
    if (!canServeManifests(this.uiSurfaceChannel()))
      return {
        answer: undefined,
        cause: "not_asked",
      };
    let r = AbortSignal.timeout(n);
    try {
      return {
        answer: await this.sendRequest(e, s, r),
        cause: undefined,
      };
    } catch (error) {
      return {
        answer: undefined,
        cause: classifyStreamError(error, r),
      };
    }
  }
  sendDeviceHookCallback(e) {
    let s = randomUUID();
    let n = this.trackDeviceRequest(s, "hook", (m) => parseControlResponse(m) !== null);
    let abortController = new AbortController();
    let o = e.signal ? AbortSignal.any([e.signal, abortController.signal]) : abortController.signal;
    let reply = this.sendRequest(
      {
        subtype: "hook_callback",
        callback_id: e.callbackId,
        input: e.input,
        tool_use_id: e.toolUseID || undefined,
        issued_at: Math.trunc(e.issuedAt),
        deadline_ms: Math.max(1, Math.ceil(e.deadlineMs)),
      },
      unknown(),
      o,
      {
        requestId: s,
        deviceHook: true,
      },
    )
      .then(
        (m) => {
          let controlResponse = parseControlResponse(m);
          return controlResponse === null
            ? {
                malformed: true,
              }
            : {
                answer: controlResponse,
              };
        },
        (error) => {
          if (isAbortError(error)) throw error;
          logForDebugging(
            `Device hook_callback request_id=${s} settled with a non-answer; treating as no opinion`,
            {
              level: "warn",
            },
          );
          return {
            malformed: true,
          };
        },
      )
      .finally(() => {
        this.deviceRequests.delete(s);
      });
    return {
      requestId: s,
      reply,
      cancel: () => abortController.abort(),
      errorRepliesIgnored: () => n.errorRepliesIgnored,
      malformedRepliesIgnored: () => n.malformedRepliesIgnored,
    };
  }
  trackDeviceRequest(e, kind, accepts, instanceId, onUpload) {
    if (this.deviceRequests.size >= MAX_LIVE_DEVICE_REQUESTS)
      logForDebugging(
        `Device request bookkeeping past its expected ceiling (${MAX_LIVE_DEVICE_REQUESTS} live requests); keeping all of them`,
        {
          level: "warn",
        },
      );
    let h = {
      kind,
      errorRepliesIgnored: 0,
      malformedRepliesIgnored: 0,
      delivery: "queued",
      instanceId,
      accepts,
      onUpload,
    };
    this.deviceRequests.set(e, h);
    return h;
  }
  waitsOnHostAsk() {
    for (let deviceRequest of this.deviceRequests.values())
      if (deviceRequest.kind === "host_ask") return true;
    return false;
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
      this.enqueueCancelRequest(r);
      this.pendingRequests.delete(r);
      h.reject(new ServingInstanceGoneError(s));
      n++;
    }
    return n;
  }
  withdrawStandingServedCall(e) {
    if (this.pendingRequests.has(e)) return false;
    this.enqueueCancelRequest(e);
    return true;
  }
  noteRequestsUpload(e, s) {
    let n = 0;
    for (let r of e) {
      let o = this.deviceRequests.get(r);
      if (o === undefined) continue;
      let h = deliveryOutcome(o.delivery, s);
      if (h !== o.delivery) {
        o.delivery = h;
        n++;
      }
      try {
        o.onUpload?.(s);
      } catch (error) {
        logForDebugging(
          `A served call's upload listener threw (${s}); the delivery ledger is unaffected: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    }
    return n;
  }
  rejectUndeliveredRequests(e, status) {
    let n = 0;
    for (let r of e) {
      let o = this.deviceRequests.get(r);
      if (o?.kind !== "served_call") continue;
      let h = this.pendingRequests.get(r);
      if (!h) continue;
      this.pendingRequests.delete(r);
      h.reject(
        this.tracksRequestDelivery && o.delivery === "queued"
          ? new RequestNotDeliveredError(status)
          : new RequestDeliveryUnknownError(status),
      );
      n++;
    }
    return n;
  }
  sendServedCallRequest(e) {
    let s = randomUUID();
    if (this.inputClosed) {
      let m = Promise.reject(new StreamClosedAbortError(STREAM_CLOSED_TEXT));
      m.catch(() => {});
      return {
        requestId: s,
        sent: false,
        delivery: () => "queued",
        withdraw: () => false,
        reply: m,
        cancel: () => {},
        errorRepliesIgnored: () => 0,
      };
    }
    let n = this.trackDeviceRequest(s, "served_call", e.accepts, e.request.instance_id, e.onUpload);
    let abortController = new AbortController();
    let o = e.signal ? AbortSignal.any([e.signal, abortController.signal]) : abortController.signal;
    let reply = this.sendRequest(e.request, unknown(), o, {
      requestId: s,
      deviceHook: true,
    }).finally(() => {
      this.deviceRequests.delete(s);
    });
    return {
      requestId: s,
      sent: true,
      delivery: () => (this.tracksRequestDelivery ? normalizeDeliveryState(n.delivery) : "untracked"),
      withdraw: () => this.withdrawUnsentServedCall(s),
      reply,
      cancel: () => {
        if (this.pendingRequests.has(s)) {
          abortController.abort();
          return;
        }
        this.enqueueCancelRequest(s);
      },
      errorRepliesIgnored: () => n.errorRepliesIgnored,
    };
  }
  askToAnnounce(e, s) {
    this.sendRequest(e, unknown(), s, {
      deviceHook: true,
    }).catch(() => {});
  }
  withdrawUnsentServedCall(e) {
    let s = this.deviceRequests.get(e);
    let n = this.pendingRequests.get(e);
    if (
      !this.tracksRequestDelivery ||
      n === undefined ||
      s?.kind !== "served_call" ||
      s.delivery !== "queued"
    )
      return false;
    if (!this.withdrawQueuedRequest(e)) return false;
    this.pendingRequests.delete(e);
    n.reject(new RequestWithdrawnUnsentError());
    return true;
  }
  async handleElicitation(mcpServerName, message, n, r, o, url, elicitationId, y, q = false) {
    if (!this.hostAnswersElicitations)
      return {
        action: "cancel",
      };
    if (isTerminalShutdown()) {
      if (r?.aborted)
        return {
          action: "cancel",
        };
      return heldUntilExit();
    }
    if (this.inputClosed || r?.aborted)
      return {
        action: "cancel",
      };
    let R = randomUUID();
    let S = {
      tool_name: MCP_ELICITATION_DIALOG_TOOL,
      display_tool_name: "Claude needs your input",
      action_description: "Answer the MCP server's question to continue",
      tool_use_id: "",
      request_id: R,
    };
    this.publishedPendingActionDetails.set(R, S);
    if (q) this.backgroundPromptIds.add(R);
    this.sessionState.notifyStateChanged("requires_action", S);
    this.onUserDialogParked?.(S);
    let properties = n?.properties;
    try {
      return await this.sendRequest(
        {
          subtype: "elicitation",
          mcp_server_name: mcpServerName,
          message,
          mode: o,
          url,
          elicitation_id: elicitationId,
          requested_schema: n,
          property_order: o !== "url" && isPlainObject(properties) ? Object.keys(properties) : undefined,
          title: y?.title,
          display_name: y?.displayName,
          description: y?.description,
        },
        ElicitationResponseSchema(),
        r,
        {
          requestId: R,
        },
      );
    } catch {
      return {
        action: "cancel",
      };
    } finally {
      this.settlePublishedPrompt(R, !r?.aborted);
    }
  }
  async requestUserDialog(e, s, n) {
    if (isTerminalShutdown()) {
      if (n?.signal?.aborted)
        return {
          behavior: "cancelled",
        };
      return heldUntilExit();
    }
    let requestId = randomUUID();
    let o = dialogPermissionRequest(e, s, requestId, n?.toolUseId);
    this.publishedPendingActionDetails.set(requestId, o);
    this.sessionState.notifyStateChanged("requires_action", o);
    this.onUserDialogParked?.(o);
    let h = dialogSourceAttr(e, s);
    logEvent("tengu_request_user_dialog_requires_action", {
      dialog_kind: shortHash(e),
      ...h,
    });
    if (n?.onSettledUnanswered) this.unansweredSettleHandlers.set(requestId, n.onSettledUnanswered);
    if (n?.closesOnNewPrompt) this.dialogsANewPromptCloses.add(requestId);
    let m = clampDialogTimeoutMs(n?.parkTimeoutMs);
    let y;
    if (m > 0) {
      y = setTimeout(
        (R, S, timeoutMs, A) => {
          this.timedOutUserDialogs.set(R, {
            dialogKind: S,
            timedOutAt: Date.now(),
            source: A,
          });
          if (!this.cancelDialogByMachine(R, "deadline")) {
            this.timedOutUserDialogs.delete(R);
            return;
          }
          logEvent("tengu_request_user_dialog_timeout", {
            dialog_kind: shortHash(S),
            ...A,
            timeout_ms: timeoutMs,
          });
        },
        m,
        requestId,
        e,
        m,
        h,
      );
      y.unref();
    }
    let q = !this.inputClosed && n?.signal?.aborted !== true;
    try {
      return await this.sendRequest(
        {
          subtype: "request_user_dialog",
          dialog_kind: e,
          payload: s,
          tool_use_id: n?.toolUseId,
        },
        UserDialogResponseSchema(),
        n?.signal,
        {
          requestId,
        },
      );
    } catch {
      return {
        behavior: "cancelled",
      };
    } finally {
      if (y !== undefined) clearTimeout(y);
      this.unansweredSettleHandlers.delete(requestId);
      this.dialogsANewPromptCloses.delete(requestId);
      if (e === ENUM_PROMPT && q) this.sendCancelRequest(requestId);
      this.settlePublishedPrompt(requestId, !this.timedOutUserDialogs.has(requestId));
    }
  }
  createSandboxAskCallback(e, s, n, r) {
    let o = new Map();
    let h = async (host) => {
      if (isMisleadingConsentHost(host)) {
        logForDebugging(
          `[StructuredIO] Refusing a sandbox network ask for a host srt would re-spell: ${jsonStringify(host)}`,
          {
            level: "warn",
          },
        );
        return false;
      }
      try {
        let y = {
          type: "addRules",
          rules: [
            {
              toolName: WEBFETCH,
              ruleContent: `domain:${consentHostEntry(host)}`,
            },
          ],
          behavior: "allow",
          destination: sandboxHostGrantDestination() ?? "session",
        };
        let q = schedulePermissionNotify(humanizeToolName(SANDBOX_NETWORK_ACCESS_TOOL_NAME), n, r);
        let R;
        try {
          R = await this.sendRequest(
            {
              subtype: "can_use_tool",
              tool_name: SANDBOX_NETWORK_ACCESS_TOOL_NAME,
              display_name: humanizeToolName(SANDBOX_NETWORK_ACCESS_TOOL_NAME),
              input: {
                host,
              },
              permission_suggestions: [y],
              tool_use_id: randomUUID(),
              description: `Allow network connection to ${host}?`,
            },
            MARKETPLACE_ONLY_MANIFEST_FIELDS(e.kind),
          );
        } finally {
          q();
          if (this.flipBackLeftToUnpublishedAsk && !this.hasPendingPrompt())
            this.flipBackFromRequiresAction();
        }
        if (R.behavior !== "allow") return false;
        let updatedPermissions = R.updatedPermissions;
        switch (e.kind) {
          case "launcher":
            if (updatedPermissions && updatedPermissions.length > 0) {
              let k = normalizePermissionUpdate(updatedPermissions, undefined);
              s?.((A) => {
                k = normalizePermissionUpdate(updatedPermissions, undefined, A);
                return applyPermissionUpdates(A, k);
              });
              await persistPermissionUpdates(k, n);
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
            ) {
              logForDebugging(
                "refused a sandbox network answer: a deny or ask rule that the answer added, or may have added, is not among the session's rules",
                {
                  level: "warn",
                },
              );
              return false;
            }
            break;
        }
        SandboxManager.addSessionAllowedHost(host);
        return true;
      } catch {
        return false;
      }
    };
    return (m) => {
      let host = m.host;
      let q = o.get(host);
      if (q) return q;
      let R = h(host).finally(() => {
        o.delete(host);
      });
      o.set(host, R);
      return R;
    };
  }
  async sendMcpMessage(serverName, s, timeoutMs = MCP_MESSAGE_TIMEOUT_MS) {
    let o = isJsonRpcRequest(s)
      ? undefined
      : createCombinedAbortSignal(undefined, {
          timeoutMs,
          refTimer: true,
        });
    try {
      return (
        await this.sendRequest(
          {
            subtype: "mcp_message",
            server_name: serverName,
            message: s,
          },
          u({
            mcp_response: qne().optional(),
          }),
          o?.signal,
        )
      ).mcp_response;
    } finally {
      o?.cleanup();
    }
  }
  async requestOAuthTokenRefresh() {
    let e = await this.askHostForOAuthToken();
    if (typeof e.accessToken === "string" && e.accessToken) {
      clearLauncherLoginEnd();
      return e.accessToken;
    }
    if (e.reason !== undefined) recordLauncherLoginEnd(e.reason);
    return null;
  }
  async requestHostSessionsBearer() {
    let now = Date.now();
    let s = await this.askHostForOAuthToken("sessions");
    let accessToken = s.accessToken || null;
    if (accessToken !== null && isClaudeAISignInToken(accessToken)) {
      accessToken = null;
      logEvent("tengu_sdk_oauth_refresh_unfulfilled", {
        outcome: fromEnum("sign_in_token"),
        reason: fromEnum("none"),
        kind: fromEnum("sessions"),
        duration_ms: Date.now() - now,
      });
      logForDebugging(
        "[host-sessions-bearer] the host answered the cloud-sessions token request with its sign-in token; ignoring it, cloud-sessions calls keep the sign-in token",
        {
          level: "warn",
        },
      );
    } else if (accessToken === null)
      logForDebugging(
        `[host-sessions-bearer] the host has no cloud-sessions token (${s.reason ?? "no reason given"}); cloud-sessions calls use the sign-in token until a later ask brings one`,
        {
          level: "warn",
        },
      );
    return s.reason === undefined
      ? {
          accessToken,
        }
      : {
          accessToken,
          reason: s.reason,
        };
  }
  async askHostForOAuthToken(e) {
    let now = Date.now();
    let n;
    try {
      n = await this.sendRequest(
        e === undefined
          ? {
              subtype: "oauth_token_refresh",
            }
          : {
              subtype: "oauth_token_refresh",
              kind: e,
            },
        OAuthTokenRefreshResponseSchema(),
        AbortSignal.timeout(CONTROL_TIMEOUTS),
      );
    } catch (error) {
      logEvent("tengu_sdk_oauth_refresh_unfulfilled", {
        outcome: fromEnum(
          error instanceof StreamClosedAbortError
            ? "stream_closed"
            : isAbortError(error)
              ? "timeout"
              : error instanceof ZodError
                ? "invalid_response"
                : "error",
        ),
        reason: fromEnum("none"),
        kind: fromEnum(e ?? "sign_in"),
        duration_ms: Date.now() - now,
      });
      throw error;
    }
    if (typeof n.accessToken === "string" && n.accessToken) return n;
    logEvent("tengu_sdk_oauth_refresh_unfulfilled", {
      outcome: fromEnum(n.reason !== undefined ? "declined" : "null"),
      reason: fromEnum(n.reason ?? "none"),
      kind: fromEnum(e ?? "sign_in"),
      duration_ms: Date.now() - now,
    });
    return n;
  }
  async requestRemoteControlWorkSecret(sessionId) {
    try {
      return (
        (
          await this.sendRequest(
            {
              subtype: "remote_control_work_secret",
              session_id: sessionId,
            },
            RemoteControlWorkSecretResponseSchema(),
            AbortSignal.timeout(CONTROL_REQUEST_LONG_TIMEOUT_MS),
          )
        ).work_secret || null
      );
    } catch (error) {
      logForDebugging(
        `[bridge:work-secret] host work-secret request failed (${error instanceof Error ? error.name : "unknown"})`,
        {
          level: "warn",
        },
      );
      return null;
    }
  }
  async requestHostAuthTokenRefresh(e = HOST_AUTH_REFRESH_TIMEOUT_MS) {
    return this.sendRequest(
      {
        subtype: "host_auth_token_refresh",
      },
      HostAuthTokenRefreshResponseSchema(),
      AbortSignal.timeout(e),
    );
  }
  enqueueCancelRequest(requestId) {
    this.outbound.enqueue({
      type: "control_cancel_request",
      request_id: requestId,
    });
  }
  sendCancelRequest(e) {
    if (!this.outbound.ended) {
      this.enqueueCancelRequest(e);
      return;
    }
    this.write({
      type: "control_cancel_request",
      request_id: e,
    }).catch((error) => {
      logForDebugging(`control_cancel_request for request_id=${e} not written: ${errorMessage(error)}`, {
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
  await withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (exit)").catch(() => {});
  await withTimeout(
    flushDiagnosticLogs(),
    Math.max(0, s - Date.now()),
    "diagnostic log flush timeout (exit)",
  ).catch(() => {});
  await drainStdoutBeforeExit(Math.max(0, s - Date.now()), {
    scaleBudgetToQueue: false,
  });
  process.exit(1);
}
//@ chunk-na0b3c5q.js:51576-51664 sole-consumer
var MESSAGE_FIELD_NAMES = new Set([
  "type",
  "message",
  "uuid",
  "session_id",
  "parent_tool_use_id",
  "timestamp",
]);
//@ chunk-na0b3c5q.js:51664-51754 sole-consumer
function isPlainMessageField([e, s]) {
  return (
    MESSAGE_FIELD_NAMES.has(e) || (e === "isSynthetic" && s === false) || (e === "shouldQuery" && s === true)
  );
}
//@ chunk-na0b3c5q.js:51754-52136 sole-consumer
/**
 * 给 stream-json 输入里的 message 字段分类（无消息、非对象、无 role、role 为 null/数组/对象/字符串/其他），用于解析失败遥测。
 */
function classifyMessageRoleShape(message) {
  if (message === undefined || message === null) return "no_message";
  if (typeof message !== "object" || Array.isArray(message)) return "non_object_message";
  if (!("role" in message)) return "no_role";
  let role = message.role;
  if (role === undefined) return "no_role";
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
//@ chunk-na0b3c5q.js:52136-52455 sole-consumer
/**
 * 若输入行是 user 消息（content 为字符串或数组），返回 {inner, plain}；plain 表示外层只含已知字段。
 */
function extractPlainUserMessage(message) {
  if (typeof message !== "object" || message === null || !("message" in message)) return;
  let message_2 = message.message;
  if (
    typeof message_2 !== "object" ||
    message_2 === null ||
    !("role" in message_2) ||
    message_2.role !== "user" ||
    !("content" in message_2) ||
    (typeof message_2.content !== "string" && !Array.isArray(message_2.content))
  )
    return;
  return {
    inner: message_2,
    plain:
      (!("type" in message) || message.type === "user") && Object.entries(message).every(isPlainMessageField),
  };
}
//@ chunk-na0b3c5q.js:52455-52638 sole-consumer
function formatStreamInputParseError(e, error) {
  return `Error parsing streaming input line (type=${/"type"\s*:\s*"([\w-]{1,40})"/.exec(e)?.[1] ?? "unknown"}, ${e.length} chars): ${error instanceof Error ? error.name : typeof error}`;
}
//@ chunk-na0b3c5q.js:52638-52781 sole-consumer
function describeInputLineLazy(e) {
  return () => ({
    type: e.type,
    ...(e.type === "user" && {
      uuid: matchRequestId(e.uuid),
    }),
    ...(e.type === "control_request" && {
      subtype: knownSubtypeOrUndefined(e.request.subtype),
    }),
  });
}
//@ chunk-6j594vm1.js:19866-21542 fingerprint = executePermissionRequestHooksForSDK (0.516)
/**
 * SDK 模式下先执行 PermissionRequest 钩子，钩子给出 allow/deny 时直接返回。
 */
async function executePermissionRequestHooksForSDK(n, e, toolUseId, updatedInput, m, suggestions, y, f) {
  if (m.forRemoteExecution === true) return;
  let permissionMode = getToolPermissionContext(m).mode;
  let hookGenerator = executePermissionRequestHooks(
    e.name,
    toolUseId,
    updatedInput,
    m,
    permissionMode,
    suggestions,
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
        let updatedInput_2 = decision.updatedInput;
        switch (n.kind) {
          case "launcher":
            break;
          case "strict":
            if (!isUnchangedAnswerInput(updatedInput_2, updatedInput))
              return {
                decision: denyChangedAnswerInput(e.name, toolUseId),
                interrupt: false,
                permanent: false,
              };
            updatedInput_2 = undefined;
            break;
        }
        if (shouldReplaceMemoryInput(e, updatedInput, updatedInput_2, true))
          return {
            decision: guardAccountMemoryHookRewrite(e, "PermissionRequest"),
            interrupt: false,
            permanent: false,
          };
        let b = await validatePermissionRequestUpdatedInput(e, updatedInput_2, updatedInput, (P) =>
          e.validateInput?.(P, {
            ...m,
            toolUseId,
          }),
        );
        if (b.deny !== undefined)
          return {
            decision: b.deny,
            interrupt: false,
            permanent: false,
          };
        updatedInput_2 = b.input;
        let C = updatedInput_2 || updatedInput;
        if (updatedInput_2) {
          let updatedContext = guardHookUpdatedInput(
            await checkRuleBasedPermissions(
              e,
              C,
              {
                ...m,
                toolUseId,
                permissionRound: undefined,
              },
              {
                hookUpdatedInput: updatedInput_2,
              },
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
                  : {
                      ...updatedContext,
                      decideLocation: "ask-path",
                    },
              interrupt: false,
              permanent: false,
            };
        }
        if (y.hostDisplay !== undefined || isInteractionStillOwed(e, updatedInput_2)) return;
        let { applied, lostTightenings } = f()
          ? {
              applied: [],
              lostTightenings: 0,
            }
          : applyPermissionPromptResult(
              n,
              decision.updatedPermissions &&
                filterPermissionUpdatePayload(decision.updatedPermissions, getToolPermissionContext(m)),
              e,
              updatedInput,
              m,
              y.suppressAlwaysAllowRule === true,
            );
        if (lostTightenings > 0) return;
        return {
          decision: {
            behavior: "allow",
            updatedInput: C,
            userModified: false,
            decisionReason: {
              type: "hook",
              hookName: "PermissionRequest",
            },
          },
          interrupt: false,
          permanent: applied.some((prev) => supportsPersistence(prev.destination)),
        };
      } else
        return {
          decision: {
            behavior: "deny",
            message: decision.message || "Permission denied by PermissionRequest hook",
            decisionReason: {
              type: "hook",
              hookName: "PermissionRequest",
            },
            decideLocation: "ask-path",
          },
          interrupt: decision.interrupt === true,
          permanent: false,
        };
    }
  return;
}
//@ chunk-e6aww6q8.js:2818055-2818085 fingerprint = SANDBOX_NETWORK_ACCESS_TOOL_NAME (1)
/**
 * 沙箱网络访问权限请求的工具名 SandboxNetworkAccess。
 */
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

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
import { getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { executePermissionRequestHooks } from "../utils/hooks.js";
import {
  isUnchangedAnswerInput,
  denyChangedAnswerInput,
  applyUpdatesToSessionContext,
  applyPermissionAnswer,
  listAnswerTighteningRules,
} from "../utils/permissions/permissionAnswer.js";
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
import { HOOK_REWRITE_HEADLESS_DENY_REASON, decisionReasonCode } from "../types/permissions.js";
import {
  applyPermissionPromptResult,
  schedulePermissionNotify,
} from "../utils/permissions/PermissionPromptToolResultSchema.js";
import {
  filterPermissionUpdatePayload,
  normalizePermissionUpdate,
} from "../utils/permissions/permissionRulePayload.js";
import {
  supportsPersistence,
  applyPermissionUpdates,
  persistPermissionUpdates,
} from "../utils/permissions/PermissionUpdate.js";
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
import { serializeDecisionReason } from "../utils/permissions/decisionReasons.js";
import { getSessionId, noteSdkHostHookAnswered } from "../bootstrap/state.js";
import { MARKETPLACE_ONLY_MANIFEST_FIELDS } from "../utils/plugins/validatePlugin.js";
import { hookJSONOutputSchema } from "../types/hooks.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { unknown, objectSchema, anySchema } from "../../vendor/zod/v4/classic/schemas.js";
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
import { isJsonRpcRequest } from "../services/mcp/SdkControlTransport.js";
import { createCombinedAbortSignal } from "../utils/combinedAbortSignal.js";
import { ZodError } from "../../vendor/zod/v4/classic/errors.js";
import { drainRegisteredWriteQueues } from "../utils/settings/writeQueues.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2818055-2818085 fingerprint = SANDBOX_NETWORK_ACCESS_TOOL_NAME (1)
/**
 * 沙箱网络访问权限请求的工具名 SandboxNetworkAccess。
 */
var SANDBOX_NETWORK_ACCESS_TOOL_NAME = "SandboxNetworkAccess";
//@ chunk-fp6aqx1j.js:18843-19042 fingerprint = buildRequiresActionDetails (0.512)
function buildRequiresActionDetails(input) {
  return {
    tool_name: input.tool_name,
    display_tool_name: input.display_tool_name,
    action_description: input.action_description,
    raw_command: input.raw_command,
    request_id: input.request_id,
    tool_use_id: input.tool_use_id,
  };
}
//@ chunk-6j594vm1.js:19866-21542 fingerprint = executePermissionRequestHooksForSDK (0.516)
/**
 * SDK 模式下先执行 PermissionRequest 钩子，钩子给出 allow/deny 时直接返回。
 */
async function executePermissionRequestHooksForSDK(
  tool,
  request,
  toolUseId,
  original,
  input,
  suggestions,
  options,
  context,
) {
  if (input.forRemoteExecution === true) return;
  let permissionMode = getToolPermissionContext(input).mode;
  let hookGenerator = executePermissionRequestHooks(
    request.name,
    toolUseId,
    original,
    input,
    permissionMode,
    suggestions,
    input.abortController.signal,
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
        switch (tool.kind) {
          case "launcher":
            break;
          case "strict":
            if (!isUnchangedAnswerInput(updatedInput, original))
              return {
                decision: denyChangedAnswerInput(request.name, toolUseId),
                interrupt: false,
                permanent: false,
              };
            updatedInput = undefined;
            break;
        }
        if (shouldReplaceMemoryInput(request, original, updatedInput, true))
          return {
            decision: guardAccountMemoryHookRewrite(request, "PermissionRequest"),
            interrupt: false,
            permanent: false,
          };
        let validated = await validatePermissionRequestUpdatedInput(
          request,
          updatedInput,
          original,
          (proposed) =>
            request.validateInput?.(proposed, {
              ...input,
              toolUseId,
            }),
        );
        if (validated.deny !== undefined)
          return {
            decision: validated.deny,
            interrupt: false,
            permanent: false,
          };
        updatedInput = validated.input;
        let effectiveInput = updatedInput || original;
        if (updatedInput) {
          let updatedContext = guardHookUpdatedInput(
            await checkRuleBasedPermissions(
              request,
              effectiveInput,
              {
                ...input,
                toolUseId,
                permissionRound: undefined,
              },
              {
                hookUpdatedInput: updatedInput,
              },
            ),
            request.name,
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
        if (options.hostDisplay !== undefined || isInteractionStillOwed(request, updatedInput)) return;
        let { applied, lostTightenings } = context()
          ? {
              applied: [],
              lostTightenings: 0,
            }
          : applyPermissionPromptResult(
              tool,
              decision.updatedPermissions &&
                filterPermissionUpdatePayload(decision.updatedPermissions, getToolPermissionContext(input)),
              request,
              original,
              input,
              options.suppressAlwaysAllowRule === true,
            );
        if (lostTightenings > 0) return;
        return {
          decision: {
            behavior: "allow",
            updatedInput: effectiveInput,
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
  uiSurfaceFrameOf(frame, isAnySurfaceAttached) {
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
  surfaceRequestJudgedAt(requestId) {
    let judgedAt = this.surfaceRequestsJudgedAt.get(requestId) ?? Date.now();
    this.surfaceRequestsJudgedAt.set(requestId, judgedAt);
    return judgedAt;
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
  surfaceClientAttached(frame, attached) {
    return true;
  }
  controlRequestEnded(respondedAt) {}
  answersSurfaceRefusal(frame) {
    return true;
  }
  surfaceSenderStands(frame) {
    return true;
  }
  setSurfaceRoster(roster) {}
  setSubscribersReportedListener(listener) {}
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
  sendOwedClientRowsAgain(uuids) {
    return Promise.resolve();
  }
  readAgentMetadataEvents(agentId, storageV5) {
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
  readOwnClientEvent(event) {
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
            print: (message, text) => {
              this.trackWrite(message);
              writeToStdout(
                text +
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
    this.sessionState.getPendingActionDetails = (promptId) => {
      let details = [];
      for (let [askId, askDetails] of this.publishedPendingActionDetails)
        if (this.pendingRequests.has(askId) || askId === promptId) details.push(askDetails);
      return details;
    };
    this.sessionState.stateChanged.subscribe((state) => {
      if (state !== "requires_action") this.flipBackLeftToUnpublishedAsk = false;
      if (state === "idle") this.endSdkSchemaStretch();
    });
    this.structuredInput = this.read();
  }
  trackResolvedToolUseId(request) {
    if (request.request.subtype === "can_use_tool") this.resolvedToolUseIds.add(request.request.tool_use_id);
    if (isPermissionPromptSubtype(request)) rememberResolvedPromptRequestId(request.request_id);
  }
  watchConfirmAnswerEvent(toolUseId) {
    this.confirmAnswerEventIds.set(toolUseId, undefined);
  }
  noteConfirmAnswerEvent(request, eventId) {
    if (
      request.request.subtype === "can_use_tool" &&
      this.confirmAnswerEventIds.has(request.request.tool_use_id) &&
      this.confirmAnswerEventIds.get(request.request.tool_use_id) === undefined
    )
      this.confirmAnswerEventIds.set(request.request.tool_use_id, eventId);
  }
  takeConfirmAnswerEventId(toolUseId) {
    let eventId = this.confirmAnswerEventIds.get(toolUseId);
    this.confirmAnswerEventIds.delete(toolUseId);
    return eventId;
  }
  flushInternalEvents() {
    return Promise.resolve();
  }
  watchInternalEventPosts() {
    return;
  }
  refusedInternalEvents(uuid) {
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
  withdrawQueuedRequest(requestId) {
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
  prependUserMessage(content, origin = "process") {
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
      personsOwn: origin === "person",
    });
    this.prependWaker?.();
  }
  readAgain(message) {
    this.prependedLines.push({
      line: jsonStringify(message),
      hostLocal: false,
      personsOwn: false,
    });
    this.prependWaker?.();
  }
  noteInputWritten(text) {
    let index = text.indexOf(CONTROL_RESPONSE_TYPE);
    while (index !== -1) {
      let index_2 = text.indexOf(
        `
`,
        index,
      );
      if (index_2 === -1) return;
      this.answerLinesWritten++;
      index = text.indexOf(CONTROL_RESPONSE_TYPE, index_2);
    }
  }
  whenReceivedAnswersRead() {
    if (this.answerLinesWritten <= this.answerLinesRead) return;
    this.receivedAnswersRead ??= Promise.withResolvers();
    return this.receivedAnswersRead.promise;
  }
  noteAnswerLinesRead(count) {
    this.answerLinesRead = count;
    if (this.answerLinesWritten <= count) {
      this.receivedAnswersRead?.resolve();
      this.receivedAnswersRead = undefined;
    }
  }
  isLocallyPrependedMessage(message) {
    return this.locallyPrependedMessages.has(message);
  }
  isPersonsOwnPrepend(message) {
    return this.personsOwnPrepends.has(message);
  }
  takeUserFrameReceivedWallMs(uuid) {
    return;
  }
  userFrameStartedAtMs(uuid) {
    return;
  }
  userFrameReceivedAtMs(uuid) {
    return;
  }
  async *read() {
    let buffer = "";
    let chunks = [];
    let bufferLength = 0;
    let sawNewline = false;
    let idleCount = 0;
    let charCount = 0;
    let scheduled = false;
    function noteChunk(chunk) {
      idleCount++;
      charCount += chunk.length;
      if (scheduled) return;
      scheduled = true;
      yieldToEventLoop().then(() => {
        idleCount = 0;
        charCount = 0;
        scheduled = false;
      });
    }
    let drainPrepended = async function* () {
      for (;;) {
        if (idleCount >= STDIN_LIMITS || charCount >= MAX_STDIN_CHARS_PER_LINE) {
          await yieldToEventLoop();
          idleCount = 0;
          charCount = 0;
        }
        let wroteSomething = false;
        while (this.prependedLines.length > 0) {
          let { line, hostLocal, personsOwn } = this.prependedLines.shift();
          wroteSomething = true;
          noteChunk(line);
          let message = await this.processLine(line);
          if (message) {
            if (hostLocal) this.locallyPrependedMessages.add(message);
            if (personsOwn) this.personsOwnPrepends.add(message);
            logForDiagnosticsNoPII("info", "cli_stdin_message_parsed", describeInputLineLazy(message));
            yield message;
          }
        }
        if (wroteSomething) continue;
        let index = buffer.indexOf(`
`);
        if (index === -1) break;
        let chunk = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        noteChunk(chunk);
        let message = await this.processLine(chunk);
        if (message) {
          logForDiagnosticsNoPII("info", "cli_stdin_message_parsed", describeInputLineLazy(message));
          this.hasUnconsumedInput = buffer.trim().length > 0;
          yield message;
        }
        if (this.answerLinesRead < this.answerLinesWritten && chunk.includes(CONTROL_RESPONSE_TYPE))
          this.noteAnswerLinesRead(this.answerLinesRead + 1);
      }
      this.hasUnconsumedInput = buffer.trim().length > 0;
    }.bind(this);
    let iterator = this.input[Symbol.asyncIterator]();
    let pendingNext = null;
    let ended = false;
    try {
      for (;;) {
        if (sawNewline || this.prependedLines.length > 0) {
          if (chunks.length > 0) {
            buffer += chunks.join("");
            chunks = [];
          }
          yield* drainPrepended();
          bufferLength = buffer.length;
          if (bufferLength > this.maxLineChars) {
            logForDiagnosticsNoPII("warn", "cli_stream_json_line_budget", {
              at: "tail",
            });
            await this.exitOnFatalInput(inputTooLargeError(this.maxLineChars));
          }
          sawNewline = false;
        }
        pendingNext ??= iterator.next();
        let winner = await Promise.race([
          pendingNext.then(() => false),
          new Promise((resolve) => {
            this.prependWaker = () => resolve(true);
          }),
        ]);
        this.prependWaker = null;
        if (winner) continue;
        let nextResult = await pendingNext;
        pendingNext = null;
        if (nextResult.done) {
          ended = true;
          break;
        }
        bufferLength += nextResult.value.length;
        let included = nextResult.value.includes(`
`);
        if (!included && bufferLength > this.maxLineChars) {
          logForDiagnosticsNoPII("warn", "cli_stream_json_line_budget", {
            at: "block",
          });
          await this.exitOnFatalInput(inputTooLargeError(this.maxLineChars));
        }
        chunks.push(nextResult.value);
        if (included) sawNewline = true;
        else if (!this.hasUnconsumedInput && /\S/.test(nextResult.value)) this.hasUnconsumedInput = true;
      }
    } finally {
      this.prependWaker = null;
      this.noteAnswerLinesRead(Number.POSITIVE_INFINITY);
      if (!ended) await iterator.return?.();
    }
    if (chunks.length > 0) {
      buffer += chunks.join("");
      chunks = [];
    }
    if (buffer) {
      let message = await this.processLine(buffer);
      this.hasUnconsumedInput = false;
      if (message) yield message;
    }
    this.inputClosed = true;
    let terminal = isTerminalShutdown();
    if (!terminal && isInterruptModeOn()) {
      for (let [requestId, entry] of this.pendingRequests.entries())
        if (
          !entry.forwarded &&
          entry.request.request.subtype === "can_use_tool" &&
          entry.request.request.tool_name === ASKUSERQUESTION
        )
          this.streamCloseInterruptRequestIds.add(requestId);
      if (this.streamCloseInterruptRequestIds.size > 0) this.onStreamClosedWithParkedQuestion?.();
    }
    for (let pendingRequest of this.pendingRequests.values()) {
      if (terminal && this.asksOurHuman(pendingRequest)) continue;
      pendingRequest.reject(new StreamClosedAbortError(TOOL_PERMISSION_STREAM_CLOSED_TEXT));
    }
  }
  hasPendingRequests() {
    return this.pendingRequests.size > 0;
  }
  onRequestPending(listener) {
    return this.requestPending.subscribe(listener);
  }
  getPendingPermissionRequests() {
    return Array.from(this.pendingRequests.values())
      .map((entry) => entry.request)
      .filter((entry) => entry.request.subtype === "can_use_tool");
  }
  getPendingUserDialogRequests() {
    return Array.from(this.pendingRequests.values())
      .map((entry) => entry.request)
      .filter((entry) => entry.request.subtype === "request_user_dialog");
  }
  getPendingElicitationRequests() {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_aurora", false) === true
      ? Array.from(this.pendingRequests.values())
          .map((entry) => entry.request)
          .filter((entry) => entry.request.subtype === "elicitation")
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
  retireSdkHostHookCallbacks(retireAnswer) {
    this.sdkHostHookGeneration++;
    this.retiredHostHookAnswer = retireAnswer;
    let retiredCount = 0;
    for (let [requestId, entry] of Array.from(this.pendingRequests)) {
      let request = entry.request.request;
      if (request.subtype !== "hook_callback") continue;
      let input = retireAnswer(request.input);
      let parsed = entry.schema ? entry.schema.parse(input) : input;
      this.pendingRequests.delete(requestId);
      this.enqueueCancelRequest(requestId);
      entry.resolve(parsed);
      retiredCount++;
    }
    return retiredCount;
  }
  republishSurvivingPendingAction() {
    let survivor;
    for (let [requestId, details] of this.publishedPendingActionDetails)
      if (this.pendingRequests.has(requestId)) survivor = details;
    if (!survivor) {
      this.flipBackLeftToUnpublishedAsk = this.sessionState.getState() === "requires_action";
      this.sessionState.forgetWrittenLead();
      return;
    }
    this.sessionState.republishPendingAction(survivor);
    logEvent("tengu_pending_action_republished", {
      survivor_kind: fromEnum(
        survivor.tool_name === MCP_ELICITATION_DIALOG_TOOL
          ? "elicitation"
          : survivor.tool_name.startsWith("dialog:")
            ? "dialog"
            : "permission",
      ),
      pending_permission_requests: this.getPendingPermissionRequests().length,
      pending_dialog_requests: this.getPendingUserDialogRequests().length,
    });
  }
  cancelPendingUserDialogs(dialogKind, reason) {
    let count = 0;
    for (let { request } of Array.from(this.pendingRequests.values())) {
      if (request.request.subtype !== "request_user_dialog" || request.request.dialog_kind !== dialogKind)
        continue;
      if (!this.cancelDialogByMachine(request.request_id, "moved_on")) continue;
      logEvent("tengu_request_user_dialog_implicit_cancel", {
        dialog_kind: shortHash(dialogKind),
        ...dialogSourceAttr(dialogKind, request.request.payload),
        reason: fromEnum(reason),
      });
      count += 1;
    }
    return count;
  }
  cancelDialogsANewPromptCloses(reason) {
    let count = 0;
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
        reason: fromEnum(reason),
      });
      count += 1;
    }
    return count;
  }
  logDialogsLeftUp(platform) {
    for (let dialogsANewPromptClose of this.dialogsANewPromptCloses) {
      let request = this.pendingRequests.get(dialogsANewPromptClose)?.request.request;
      if (request?.subtype === "request_user_dialog")
        logEvent("tengu_request_user_dialog_left_up", {
          dialog_kind: shortHash(request.dialog_kind),
          ...dialogSourceAttr(request.dialog_kind, request.payload),
          ...(platform !== undefined && {
            client_platform: entrypointForTelemetry(platform),
          }),
        });
    }
  }
  cancelDialogByMachine(requestId, reason) {
    if (!this.pendingRequests.has(requestId) || isTerminalShutdown()) return false;
    let injected = this.injectControlResponse({
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        response: {
          behavior: "cancelled",
        },
      },
    });
    if (injected) this.unansweredSettleHandlers.get(requestId)?.(reason);
    return injected;
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
  ignoresErrorShapedDialogResponse(request, response) {
    if (
      response.subtype !== "error" ||
      request.request.request.subtype !== "request_user_dialog" ||
      request.forwarded
    )
      return false;
    logEvent("tengu_request_user_dialog_response_ignored", {
      shape: fromEnum("error"),
      dialog_kind: shortHash(request.request.request.dialog_kind),
      ...dialogSourceAttr(request.request.request.dialog_kind, request.request.request.payload),
    });
    logForDebugging(
      `Ignoring error-shaped control_response for parked request_user_dialog request_id=${response.request_id} \u2014 not a human choice; dialog stays parked (error: ${errorFieldText(response.error)})`,
    );
    return true;
  }
  ignoresErrorShapedUiHostResponse(request, response) {
    let { subtype } = request.request.request;
    if (response.subtype !== "error" || !isKnownControlSubtype(request.request.request)) return false;
    logForDebugging(
      `Ignoring error-shaped control_response for ${subtype} request_id=${response.request_id} - not the named client's answer; still waiting (error: ${errorFieldText(response.error)})`,
    );
    return true;
  }
  asksOurHuman(request) {
    return !request.forwarded && isPermissionPromptSubtype(request.request);
  }
  get pendingHumanRequestCount() {
    let count = 0;
    for (let pendingRequest of this.pendingRequests.values()) if (this.asksOurHuman(pendingRequest)) count++;
    return count;
  }
  ignoresResponseAtShutdown(request, response) {
    if (!this.asksOurHuman(request) || !isTerminalShutdown()) return false;
    logForDebugging(
      `Leaving control_response for request_id=${response.request_id} to the next process \u2014 this one is shutting down and settles no question`,
    );
    this.repliesLeftForNextProcess++;
    return true;
  }
  ignoresUnsettlingDeviceResponse(request, response) {
    let deviceRequest = this.deviceRequests.get(response.request_id);
    if (!deviceRequest) return false;
    let subtype = request.request.request.subtype;
    if (response.subtype === "error") {
      deviceRequest.errorRepliesIgnored += 1;
      logForDebugging(
        `Ignoring error-shaped control_response for device ${subtype} request_id=${response.request_id} \u2014 not the device's answer; still waiting (error: ${errorFieldText(response.error)})`,
      );
      return true;
    }
    if (!deviceRequest.accepts(response.response)) {
      deviceRequest.malformedRepliesIgnored += 1;
      logForDebugging(
        `Ignoring malformed control_response for device ${subtype} request_id=${response.request_id} \u2014 not an answer to it; still waiting`,
      );
      return true;
    }
    return false;
  }
  hasCanUseToolNameMismatch(request, response) {
    let request_2 = request.request.request;
    if (request_2.subtype !== "can_use_tool" || response.subtype !== "success") return false;
    return isValidBridgeToolName(response.response?.toolName, request_2.tool_name, response.request_id);
  }
  rememberApprovalTicket(requestId, request, response) {
    if (
      request.forwarded ||
      request.request.request.subtype !== "can_use_tool" ||
      response.subtype !== "success" ||
      !this.hostDialogAttestations.has(requestId)
    )
      return;
    let approvalTicket = getApprovalTicket(response.response);
    if (approvalTicket !== undefined) this.approvalTickets.set(requestId, approvalTicket);
  }
  injectRemoteControlResponse(response) {
    let request = this.pendingRequests.get(response.response?.request_id ?? "")?.request.request;
    return (
      !(request?.subtype === "request_user_dialog" && request.dialog_kind === ENUM_PROMPT) &&
      this.injectControlResponse(response)
    );
  }
  injectControlResponse(response) {
    let requestId = this.blankedPromptDenyTarget(response.response) ?? response.response?.request_id;
    if (!requestId) return false;
    let request = this.pendingRequests.get(requestId);
    if (!request) {
      logEvent("tengu_inject_control_response_unknown_id", {
        pending_control_requests: this.pendingRequests.size,
      });
      return false;
    }
    if (this.ignoresErrorShapedDialogResponse(request, response.response)) return false;
    if (this.ignoresErrorShapedUiHostResponse(request, response.response)) return false;
    if (this.ignoresResponseAtShutdown(request, response.response)) return false;
    if (this.ignoresUnsettlingDeviceResponse(request, response.response)) return false;
    if (this.hasCanUseToolNameMismatch(request, response.response)) return false;
    this.trackResolvedToolUseId(request.request);
    this.pendingRequests.delete(requestId);
    this.rememberApprovalTicket(requestId, request, response.response);
    if (requestId !== response.response?.request_id) this.onControlRequestResolved?.(requestId);
    this.sendCancelRequest(requestId);
    if (response.response.subtype === "error") request.reject(Error(response.response.error));
    else {
      let result = response.response.response;
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
  async processLine(line) {
    if (!line.trim()) return;
    line = stripBom(line);
    try {
      let controlMessage = normalizeControlMessage(jsonParse(line));
      if (controlMessage.type === "keep_alive") return;
      if (controlMessage.type === "update_environment_variables") {
        if (!this.acceptsInboundEnvUpdates()) {
          let variables = controlMessage.variables;
          let keys = typeof variables === "object" && variables !== null ? Object.keys(variables) : [];
          let filtered = keys.filter((key) => OAUTH_TOKEN_ENV_NAMES.has(key));
          let otherCount = keys.length - filtered.length;
          let list = otherCount > 0 ? filtered.concat(`${otherCount} other`) : filtered;
          logForDebugging(
            `[structuredIO] refused update_environment_variables: this worker does not take environment updates from its inbound stream (keys: ${list.join(", ") || "none"})`,
            {
              level: "warn",
            },
          );
          this.retireDroppedFrame("uuid" in controlMessage ? controlMessage.uuid : undefined);
          return;
        }
        let variables = controlMessage.variables;
        if (
          typeof variables !== "object" ||
          variables === null ||
          Array.isArray(variables) ||
          Object.values(variables).some((value) => typeof value !== "string")
        ) {
          logForDebugging(
            "[structuredIO] dropped update_environment_variables: variables must be an object of string values",
          );
          if (typeof controlMessage.request_id === "string" && controlMessage.request_id)
            this.writeActivityLine(
              ndjsonStringify({
                type: "control_response",
                response: {
                  subtype: "error",
                  request_id: controlMessage.request_id,
                  error: "update_environment_variables: variables must be an object of string values",
                },
              }) +
                `
`,
            );
          return;
        }
        let applied = [];
        let refused = [];
        let heldToken = false;
        let sessionsAccepted = false;
        let sessionsToken;
        let signInTokenPushed = false;
        let previousSignIn;
        for (let [key, value] of Object.entries(controlMessage.variables)) {
          if (!OAUTH_TOKEN_ENV_NAMES.has(key)) {
            refused.push(key);
            continue;
          }
          if (key === "CLAUDE_CODE_SESSIONS_OAUTH_TOKEN") {
            sessionsToken = value;
            continue;
          }
          if (key === "CLAUDE_CODE_OAUTH_TOKEN" && isLauncherStartedProcess()) {
            let hold = holdPushedLauncherHostLogin(value);
            if (hold === null) refused.push(key);
            else {
              heldToken = true;
              hold.then(() => clearOAuthTokenCache());
            }
            continue;
          }
          if (
            key === "CLAUDE_CODE_OAUTH_TOKEN" &&
            hostSessionsBearerOffered() &&
            !isClaudeAISignInToken(value)
          ) {
            signInTokenPushed = true;
            previousSignIn = claudeAISignInTokenInForce();
          }
          if (!applySessionTokenEnv(key, value)) process.env[key] = value;
          applied.push(key);
        }
        let oauthApplied = heldToken || applied.includes("CLAUDE_CODE_OAUTH_TOKEN");
        if (oauthApplied) {
          clearOAuthTokenCache();
          if (heldToken || signInTokenPushed) forgetHeldHostSessionsBearer(previousSignIn);
        }
        if (sessionsToken !== undefined)
          if (hostSessionsBearerOffered() && acceptPushedHostSessionsBearer(sessionsToken)) {
            sessionsAccepted = true;
            applied.push("CLAUDE_CODE_SESSIONS_OAUTH_TOKEN");
          } else refused.push("CLAUDE_CODE_SESSIONS_OAUTH_TOKEN");
        if (refused.length > 0)
          logForDebugging(`[structuredIO] refused update_environment_variables keys: ${refused.join(", ")}`);
        if (!oauthApplied && (!sessionsAccepted || applied.length > 1)) emitCredentialChange();
        if (heldToken)
          logForDebugging(
            "[structuredIO] update_environment_variables offered CLAUDE_CODE_OAUTH_TOKEN to the session's judge, not applied yet",
          );
        if (applied.length > 0)
          logForDebugging(`[structuredIO] applied update_environment_variables: ${applied.join(", ")}`);
        if (typeof controlMessage.request_id === "string" && controlMessage.request_id)
          this.writeActivityLine(
            ndjsonStringify({
              type: "control_response",
              response: {
                subtype: "success",
                request_id: controlMessage.request_id,
              },
            }) +
              `
`,
          );
        return;
      }
      if (controlMessage.type === "control_response") {
        let uuid =
          "uuid" in controlMessage && typeof controlMessage.uuid === "string"
            ? controlMessage.uuid
            : undefined;
        let response = controlMessage.response;
        if (typeof response !== "object" || response === null || Array.isArray(response)) {
          if (uuid) this.onCommandLifecycle?.(uuid, "completed");
          logForDebugging("[structuredIO] dropped control_response with malformed response payload");
          return;
        }
        if (isLauncherStartupAsk(controlMessage.response.request_id)) {
          if (uuid) this.onCommandLifecycle?.(uuid, "completed");
          return;
        }
        let requestId =
          this.blankedPromptDenyTarget(controlMessage.response) ?? controlMessage.response.request_id;
        let entry = this.pendingRequests.get(requestId);
        if (!entry) {
          let pending = this.settleUnknownResponse(controlMessage, uuid);
          if (pending !== undefined) await pending;
          return;
        }
        if (isTerminalShutdown() && this.asksOurHuman(entry)) {
          logForDebugging(
            `Leaving control_response for request_id=${requestId} to the next process \u2014 this one is shutting down and settles no question`,
          );
          this.repliesLeftForNextProcess++;
          return;
        }
        if (uuid) this.onCommandLifecycle?.(uuid, "completed");
        if (this.ignoresErrorShapedDialogResponse(entry, controlMessage.response)) return;
        if (this.ignoresErrorShapedUiHostResponse(entry, controlMessage.response)) return;
        if (this.ignoresUnsettlingDeviceResponse(entry, controlMessage.response)) return;
        if (this.hasCanUseToolNameMismatch(entry, controlMessage.response)) return;
        this.trackResolvedToolUseId(entry.request);
        this.pendingRequests.delete(requestId);
        if (
          this.hostOwnsStdinOrigin &&
          !entry.forwarded &&
          this.hostDialogAttestations.has(requestId) &&
          entry.request.request.subtype === "can_use_tool" &&
          controlMessage.response.subtype === "success" &&
          isHostDialogApproval(controlMessage.response.response)
        )
          this.hostDialogAttestations.set(requestId, true);
        this.rememberApprovalTicket(requestId, entry, controlMessage.response);
        if (entry.request.request.subtype === "can_use_tool" && this.onControlRequestResolved)
          this.onControlRequestResolved(requestId);
        if (requestId !== controlMessage.response.request_id) this.enqueueCancelRequest(requestId);
        if (
          entry.request.request.subtype === "elicitation" &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_humming_waterfall", false) === true
        )
          this.sendCancelRequest(requestId);
        if (
          isPermissionPromptSubtype(entry.request) &&
          !(entry.forwarded && controlMessage.response.subtype === "error")
        ) {
          this.recordUserDrivenInbound(controlMessage);
          this.recordAnsweredPrompt(controlMessage, entry.request.request.subtype);
        }
        if (controlMessage.response.subtype === "error") {
          entry.reject(Error(controlMessage.response.error));
          return;
        }
        let response_2 = controlMessage.response.response;
        if (!entry.forwarded) this.noteConfirmAnswerEvent(entry.request, uuid);
        if (entry.schema)
          try {
            entry.resolve(entry.schema.parse(response_2));
          } catch (error) {
            entry.reject(error);
          }
        else entry.resolve({});
        if (this.replayUserMessages && !TOKEN_REFRESH_SUBTYPES.has(entry.request.request.subtype))
          return stripLiveOnlyMarker(getRiskColor(controlMessage));
        return;
      }
      if (
        controlMessage.type !== "workflow_launch" &&
        controlMessage.type !== "user" &&
        !(
          controlMessage.type === "control_request" &&
          shouldRejectUiControl(
            subtypeOf(controlMessage.request),
            () => this.uiSurfaceFrameOf(controlMessage, false),
            () => this.surfaceRequestJudgedAt(controlMessage),
          )
        ) &&
        isUserInitiatedInboundEvent(controlMessage, {
          hostOwnsOrigin: this.hostOwnsStdinOrigin,
        })
      )
        this.recordUserDrivenInbound(controlMessage);
      if (
        controlMessage.type !== "user" &&
        controlMessage.type !== "bash_command" &&
        controlMessage.type !== "control_request" &&
        controlMessage.type !== "control_cancel_request" &&
        controlMessage.type !== "assistant" &&
        controlMessage.type !== "system" &&
        controlMessage.type !== "queued_notification" &&
        controlMessage.type !== "session_notice" &&
        controlMessage.type !== "workflow_launch"
      ) {
        let type = controlMessage.type;
        logForDebugging(
          `Ignoring unknown message type: ${typeof type === "string" ? truncatedErrorText(type) : `(a value of JSON type ${typeof type})`}`,
          {
            level: "warn",
          },
        );
        this.retireDroppedFrame(
          typeof controlMessage === "object" && controlMessage !== null && "uuid" in controlMessage
            ? controlMessage.uuid
            : undefined,
        );
        return;
      }
      if (controlMessage.type === "workflow_launch") return controlMessage;
      if (controlMessage.type === "control_request") {
        if (this.isRemoteTransport()) {
          let request = controlMessage.request;
          let malformed = typeof request !== "object" || request === null || Array.isArray(request);
          if (malformed || !("subtype" in request) || typeof request.subtype !== "string") {
            logEvent("tengu_sdk_malformed_input", {
              message_type: lit("control_request"),
              reason: fromEnum(malformed ? "missing_request" : "subtype_not_string"),
              transport: lit("remote"),
              outcome: lit("dropped"),
              has_event_uuid: "uuid" in controlMessage && normalizeUuidOrNull(controlMessage.uuid) !== null,
            });
            logForDebugging("Dropping control_request: missing request object or non-string subtype", {
              level: "warn",
            });
            this.retireDroppedFrame("uuid" in controlMessage ? controlMessage.uuid : undefined);
            return;
          }
        } else if (!controlMessage.request)
          return this.exitOnFatalInput("Error: Missing request on control_request");
        return controlMessage;
      }
      if (controlMessage.type === "control_cancel_request")
        return typeof controlMessage.request_id === "string" ? controlMessage : undefined;
      if (controlMessage.type === "assistant" || controlMessage.type === "system") return controlMessage;
      if (controlMessage.type === "bash_command") return controlMessage;
      if (controlMessage.type === "queued_notification") return controlMessage;
      if (controlMessage.type === "session_notice") return controlMessage;
      if (controlMessage.message?.role !== "user") {
        if (!this.isRemoteTransport())
          return this.exitOnFatalInput(
            `Error: Expected message role 'user', got '${truncatedErrorText(String(controlMessage.message?.role))}'`,
          );
        let plainUserMessage = extractPlainUserMessage(controlMessage.message);
        let outcome =
          plainUserMessage === undefined
            ? "dropped"
            : !plainUserMessage.plain
              ? "unwrap_refused"
              : env.CLAUDE_CODE_DISABLE_NESTED_USER_REPAIR
                ? "repair_disabled"
                : "repaired";
        let shape = classifyMessageRoleShape(controlMessage.message);
        let hasUuid = normalizeUuidOrNull(controlMessage.uuid) !== null;
        logEvent("tengu_sdk_malformed_input", {
          message_type: lit("user"),
          reason: lit("invalid_message_role"),
          transport: lit("remote"),
          outcome: fromEnum(outcome),
          wire_shape: fromEnum(shape),
          has_event_uuid: hasUuid,
        });
        logForDiagnosticsNoPII("warn", "cli_malformed_user_message", {
          outcome,
          wire_shape: shape,
          has_event_uuid: hasUuid,
        });
        if (plainUserMessage === undefined || outcome !== "repaired") {
          logForDebugging(
            `Dropping malformed user message (${outcome}, ${shape}, event uuid ${hasUuid ? "present" : "absent"}): expected message role 'user'`,
            {
              level: "warn",
            },
          );
          this.retireDroppedFrame(controlMessage.uuid);
          return;
        }
        let message = controlMessage;
        message.message = plainUserMessage.inner;
        logForDebugging("Repaired a nested user message (one level)");
      }
      if (
        isUserInitiatedInboundEvent(controlMessage, {
          hostOwnsOrigin: this.hostOwnsStdinOrigin,
        })
      )
        this.recordUserDrivenInbound(controlMessage);
      return controlMessage;
    } catch (error) {
      return this.exitOnFatalInput(formatStreamInputParseError(line, error));
    }
  }
  blankedPromptDenyTarget(response) {
    if (response?.subtype !== "success" || response.response?.behavior !== "deny") return;
    let toolUseID = response.response.toolUseID;
    if (
      typeof toolUseID !== "string" ||
      toolUseID === "" ||
      response.request_id !== toolUseID ||
      this.pendingRequests.has(toolUseID)
    )
      return;
    for (let [requestId, details] of this.publishedPendingActionDetails)
      if (
        details.tool_use_id === toolUseID &&
        (details.request_id === ""
          ? details.suppressed_request_id === requestId
          : details.request_id === requestId && this.sessionState.isWrittenSlim(details)) &&
        this.pendingRequests.get(requestId)?.request.request.subtype === "can_use_tool"
      ) {
        logForDebugging(
          `[structuredIO] deny keyed on toolUseID=${toolUseID} settles its blanked prompt request_id=${requestId}`,
        );
        return requestId;
      }
    return;
  }
  settleUnknownResponse(riskLevel, uuid) {
    if (isTerminalShutdown()) {
      logForDebugging(
        `Leaving control_response for request_id=${riskLevel.response.request_id} to the next process \u2014 this one is shutting down and settles no question`,
      );
      return;
    }
    if (uuid) this.onCommandLifecycle?.(uuid, "completed");
    let timedOut = this.timedOutUserDialogs.get(riskLevel.response.request_id);
    if (timedOut) {
      this.timedOutUserDialogs.delete(riskLevel.response.request_id);
      let behavior =
        riskLevel.response.subtype === "success" ? riskLevel.response.response?.behavior : undefined;
      let subtype = riskLevel.response.subtype;
      logEvent("tengu_request_user_dialog_late_answer", {
        dialog_kind: shortHash(timedOut.dialogKind),
        ...timedOut.source,
        lateness_ms: Date.now() - timedOut.timedOutAt,
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
        `Ignoring late request_user_dialog answer for request_id=${riskLevel.response.request_id}: the park deadline already settled this dialog as cancelled ${Date.now() - timedOut.timedOutAt}ms ago`,
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
  recordUserDrivenInbound(frame) {
    noteInteractiveInput();
  }
  recordAnsweredPrompt(response, subtype) {}
  retireDroppedFrame(uuid) {
    let normalized = normalizeUuidOrNull(uuid);
    if (normalized) this.onCommandLifecycle?.(normalized, "completed");
  }
  trackWrite(message) {
    if (message.type === "result" || this.stallFired) {
      if (this.stallTimer !== undefined) {
        clearTimeout(this.stallTimer);
        this.stallTimer = undefined;
      }
    } else {
      this.stallLastWriteAtMs = performance.now();
      this.stallLastWriteType = message.type;
      if (this.stallTimer === undefined) this.armStallTimer(SDK_STALL_TIMEOUT_MS);
    }
    let stamped =
      message.type === "result" && this.resultDelivery ? this.resultDelivery.stamp(message) : message;
    if (stamped.type !== "system") this.sampleForSdkSchemaCheck(stamped);
    if (stamped.type === "result") {
      this.sdkSchemaResultWritten = true;
      this.armSdkSchemaCheck();
    }
    return stamped;
  }
  armStallTimer(delayMs) {
    this.stallTimer = setTimeout(() => {
      this.stallTimer = undefined;
      let leftMs = this.stallLastWriteAtMs + SDK_STALL_TIMEOUT_MS - performance.now();
      if (leftMs > MONOTONIC_TIMER_RECHECK_MS) {
        this.armStallTimer(leftMs);
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
    }, delayMs);
    this.stallTimer.unref();
  }
  sampleForSdkSchemaCheck(message) {
    this.sdkSchemaStretchSampled ??= Math.random() < SDK_SCHEMA_SAMPLE_RATE;
    if (!this.sdkSchemaStretchSampled) return;
    let kept = this.sdkSchemaKept.get(message.type) ?? {
      frames: 0,
      json: undefined,
    };
    kept.frames += 1;
    this.sdkSchemaKept.set(message.type, kept);
    if (Math.random() >= 1 / kept.frames) return;
    try {
      let json = jsonStringify(message);
      if (json.length <= MAX_SAMPLED_SDK_FRAME_CHARS) kept.json = json;
    } catch {}
  }
  sdkSchemaFramesKept() {
    for (let kept of this.sdkSchemaKept.values()) if (kept.json !== undefined) return true;
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
      let entries = [...this.sdkSchemaKept.entries()];
      this.sdkSchemaKept.clear();
      this.sdkSchemaStretchSampled = undefined;
      let builtCount = LAZY_COMPONENT_REGISTRY.builtCount();
      try {
        let schema = StdoutMessageSchema();
        for (let [type, { json }] of entries) {
          if (json === undefined) continue;
          let value = jsonParse(json);
          let parsed = schema.safeParse(value);
          if (!parsed.success)
            logEvent("tengu_sdk_schema_violation", {
              message_type: fromEnum(type),
              error_path: sanitizeJsonPath(parsed.error.issues[0]?.path, SETTINGS_JSON_SCHEMA),
            });
        }
      } catch (error) {
        logForDebugging(
          `Could not check the sampled frames against the SDK output schema; they are dropped: ${errorMessage(error)}`,
        );
      } finally {
        LAZY_COMPONENT_REGISTRY.releaseBuiltSince(builtCount);
      }
    }, SDK_SCHEMA_CHECK_INTERVAL_MS);
    this.sdkSchemaCheckTimer.unref();
  }
  writeActivityLine(line) {
    this.streamEventHold?.release();
    writeToStdout(line);
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
  async write(message) {
    if (this.streamEventHold !== undefined && this.streamEventHold.keeps(message)) return;
    let before = this.heldDueBefore(message);
    if (before.length > 0) {
      await this.writeHeld(before);
      this.streamEventHold?.release();
    }
    let stamped = this.trackWrite(message);
    writeToStdout(
      ndjsonStringify(stamped) +
        `
`,
    );
    let after = this.heldDueAfter(stamped);
    if (after.length > 0) await this.writeHeld(after);
  }
  writeAfterInit(message) {
    this.heldUntilInit.push(message);
  }
  heldDueBefore(message) {
    return message.type === "result" ? this.heldUntilInit.splice(0) : [];
  }
  heldDueAfter(message) {
    return message.type === "system" && message.subtype === "init" ? this.heldUntilInit.splice(0) : [];
  }
  async writeHeld(messages) {
    for (let message of messages)
      try {
        await this.write(message);
      } catch (error) {
        logForDebugging(`held frame write failed: ${error}`, {
          level: "warn",
        });
      }
  }
  passControlRequestToHost(request, { requestId, schema, signal }) {
    if (this.pendingRequests.has(requestId))
      return Promise.reject(new AbortError("a control request with this request_id is already pending"));
    return this.sendRequest(request, schema, signal, {
      requestId,
      forwarded: true,
    });
  }
  async sendRequest(
    request,
    schema,
    signal,
    { requestId = randomUUID(), forwarded = false, deviceHook = false } = {},
  ) {
    let message = {
      type: "control_request",
      request_id: requestId,
      request,
    };
    let stripped = {
      ...message,
      request: stripServerPolicyAskOnly(request),
    };
    let isPrompt = !forwarded && isPermissionPromptSubtype(message);
    if (isPrompt && isTerminalShutdown() && !signal?.aborted) return heldUntilExit();
    if (request.subtype === "elicitation" && !forwarded) rememberElicitationRequestId(requestId);
    else if (isKnownControlSubtype(request) && !forwarded) rememberHostAskRequestId(requestId);
    else if (!forwarded && !deviceHook)
      rememberOutboundRequestId(requestId, {
        automated: !isPrompt,
      });
    else if (deviceHook) rememberDeviceOutboundRequestId(requestId);
    if (this.inputClosed) throw new StreamClosedAbortError(STREAM_CLOSED_TEXT);
    if (signal?.aborted) throw new AbortError("Request aborted");
    this.outbound.enqueue(forwarded ? stripped : message);
    if (request.subtype === "can_use_tool" && this.onControlRequestSent) this.onControlRequestSent(stripped);
    if (isPrompt) this.sessionState.beginUserDecision();
    let onAbort = () => {
      if (isPrompt && isTerminalShutdown()) return;
      if (message.request.subtype === "can_use_tool" && signal !== undefined && isAskWithdrawnByAsker(signal))
        this.answerOwnWithdrawnAsk(requestId, message.request.tool_use_id);
      this.enqueueCancelRequest(requestId);
      let pending = this.pendingRequests.get(requestId);
      if (pending) {
        this.trackResolvedToolUseId(pending.request);
        if (pending.request.request.subtype === "can_use_tool" && this.onControlRequestResolved)
          this.onControlRequestResolved(requestId);
        this.pendingRequests.delete(requestId);
        pending.reject(new AbortError());
      }
    };
    if (signal)
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
    let entry;
    try {
      return await new Promise((resolve, reject) => {
        entry = {
          request: stripped,
          resolve: (value) => {
            resolve(value);
          },
          reject,
          schema,
          ...(forwarded && {
            forwarded,
          }),
        };
        this.pendingRequests.set(requestId, entry);
        this.requestPending.emit();
      });
    } finally {
      if (signal) signal.removeEventListener("abort", onAbort);
      if (this.pendingRequests.get(requestId) === entry) this.pendingRequests.delete(requestId);
      if (isPrompt) this.sessionState.endUserDecision();
    }
  }
  emitPermissionDenied(toolName, toolUseId, agentId, result) {
    let decisionReason = result.decisionReason;
    this.outbound.enqueue({
      type: "system",
      subtype: "permission_denied",
      tool_name: toolName,
      tool_use_id: toolUseId,
      agent_id: agentId,
      decision_reason_type: decisionReason?.type,
      decision_reason_code: decisionReasonCode(decisionReason),
      decision_reason: serializeDecisionReason(decisionReason),
      message: result.message,
      uuid: randomUUID(),
      session_id: getSessionId(),
    });
  }
  createCanUseTool(context, onShown) {
    return createPermissionAsker(context, this.permissionPromptHost(context.kind, onShown));
  }
  keptAsk;
  holdKeptAsk(keptAsk) {
    this.keptAsk = keptAsk;
  }
  permissionPromptHost(kind, onShown) {
    return {
      keptAskFor: (toolUseId) => (this.keptAsk?.card.tool_use_id === toolUseId ? this.keptAsk : undefined),
      request: (request, signal, requestId) => {
        this.hostDialogAttestations.set(requestId, false);
        return this.sendRequest(request, MARKETPLACE_ONLY_MANIFEST_FIELDS(kind), signal, {
          requestId,
        });
      },
      isPending: (requestId) => this.pendingRequests.has(requestId),
      interruptedAtStreamClose: (requestId) => this.streamCloseInterruptRequestIds.has(requestId),
      answeredAtHostDialog: (requestId) => {
        let answered = this.hostDialogAttestations.get(requestId) === true;
        if (answered) this.hostDialogAttestations.set(requestId, false);
        return answered;
      },
      takeApprovalTicket: (requestId) => {
        let ticket = this.approvalTickets.get(requestId);
        this.approvalTickets.delete(requestId);
        return ticket;
      },
      emitPermissionDenied: (toolName, toolUseId, agentId, result) =>
        this.emitPermissionDenied(toolName, toolUseId, agentId, result),
      promptShown:
        onShown &&
        ((requestId, details, blockingId, custom) => {
          this.publishedPendingActionDetails.set(requestId, details);
          if (custom !== undefined) this.backgroundPromptIds.add(requestId);
          if (blockingId !== undefined) this.sessionState.notifyNestedPromptBlocking(blockingId);
          onShown(details);
        }),
      promptSettled: (requestId, blockingId) => this.settlePermissionPrompt(requestId, blockingId),
    };
  }
  settlePermissionPrompt(requestId, blockingId) {
    if (blockingId !== undefined) this.sessionState.notifyNestedPromptUnblocking(blockingId);
    this.hostDialogAttestations.delete(requestId);
    this.approvalTickets.delete(requestId);
    this.settlePublishedPrompt(requestId, true);
  }
  settlePublishedPrompt(requestId, republish) {
    this.publishedPendingActionDetails.delete(requestId);
    this.backgroundPromptIds.delete(requestId);
    if (!this.hasPendingPrompt()) {
      this.flipBackFromRequiresAction();
      return;
    }
    if (republish) this.sessionState.reteeWaitingOnUser();
    this.republishSurvivingPendingAction();
  }
  flipBackFromRequiresAction() {
    if (isTerminalShutdown()) return;
    let details = this.sessionState.heldRequiresAction?.();
    if (details) {
      this.flipBackLeftToUnpublishedAsk = false;
      this.sessionState.notifyStateChanged("requires_action", details);
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
  async sendUiHostRequest(request, schema, timeoutMs) {
    if (!canServeManifests(this.uiSurfaceChannel())) return;
    let isRemote = this.isRemoteTransport();
    let requestId = randomUUID();
    if (isRemote) this.trackDeviceRequest(requestId, "host_ask", () => true);
    let signal = AbortSignal.timeout(timeoutMs);
    let outcome = await this.sendRequest(request, schema, signal, {
      requestId,
    })
      .then(
        (answer) => ({
          answer,
          failure: undefined,
        }),
        (error) => ({
          answer: undefined,
          failure: classifyStreamError(error, signal),
        }),
      )
      .finally(() => this.deviceRequests.delete(requestId));
    if (isRemote && outcome.failure === undefined) logFeatureOk("plugin_function_hooks_host_ask");
    else if (isRemote && outcome.failure !== undefined)
      logFeatureSad("plugin_function_hooks_host_ask", outcome.failure);
    return outcome.answer;
  }
  takesUiHostAsks() {
    return !this.isRemoteTransport() || isOwnerAccountOnlyWriters(this.sessionWriters());
  }
  async sendUiHostAsk(request, schema, timeoutMs) {
    if (!canServeManifests(this.uiSurfaceChannel()))
      return {
        answer: undefined,
        cause: "not_asked",
      };
    let signal = AbortSignal.timeout(timeoutMs);
    try {
      return {
        answer: await this.sendRequest(request, schema, signal),
        cause: undefined,
      };
    } catch (error) {
      return {
        answer: undefined,
        cause: classifyStreamError(error, signal),
      };
    }
  }
  sendDeviceHookCallback(options) {
    let requestId = randomUUID();
    let tracked = this.trackDeviceRequest(requestId, "hook", (value) => parseControlResponse(value) !== null);
    let abortController = new AbortController();
    let signal = options.signal
      ? AbortSignal.any([options.signal, abortController.signal])
      : abortController.signal;
    let reply = this.sendRequest(
      {
        subtype: "hook_callback",
        callback_id: options.callbackId,
        input: options.input,
        tool_use_id: options.toolUseID || undefined,
        issued_at: Math.trunc(options.issuedAt),
        deadline_ms: Math.max(1, Math.ceil(options.deadlineMs)),
      },
      unknown(),
      signal,
      {
        requestId,
        deviceHook: true,
      },
    )
      .then(
        (value) => {
          let controlResponse = parseControlResponse(value);
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
            `Device hook_callback request_id=${requestId} settled with a non-answer; treating as no opinion`,
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
        this.deviceRequests.delete(requestId);
      });
    return {
      requestId,
      reply,
      cancel: () => abortController.abort(),
      errorRepliesIgnored: () => tracked.errorRepliesIgnored,
      malformedRepliesIgnored: () => tracked.malformedRepliesIgnored,
    };
  }
  trackDeviceRequest(requestId, kind, accepts, instanceId, onUpload) {
    if (this.deviceRequests.size >= MAX_LIVE_DEVICE_REQUESTS)
      logForDebugging(
        `Device request bookkeeping past its expected ceiling (${MAX_LIVE_DEVICE_REQUESTS} live requests); keeping all of them`,
        {
          level: "warn",
        },
      );
    let tracked = {
      kind,
      errorRepliesIgnored: 0,
      malformedRepliesIgnored: 0,
      delivery: "queued",
      instanceId,
      accepts,
      onUpload,
    };
    this.deviceRequests.set(requestId, tracked);
    return tracked;
  }
  waitsOnHostAsk() {
    for (let deviceRequest of this.deviceRequests.values())
      if (deviceRequest.kind === "host_ask") return true;
    return false;
  }
  liveDeviceRequestKind(requestId) {
    return this.deviceRequests.get(requestId)?.kind;
  }
  abandonServedCalls(instanceId, message) {
    let count = 0;
    for (let [requestId, tracked] of this.deviceRequests) {
      if (tracked.kind !== "served_call" || tracked.instanceId !== instanceId) continue;
      let pending = this.pendingRequests.get(requestId);
      if (!pending) continue;
      this.enqueueCancelRequest(requestId);
      this.pendingRequests.delete(requestId);
      pending.reject(new ServingInstanceGoneError(message));
      count++;
    }
    return count;
  }
  withdrawStandingServedCall(requestId) {
    if (this.pendingRequests.has(requestId)) return false;
    this.enqueueCancelRequest(requestId);
    return true;
  }
  noteRequestsUpload(ids, outcome) {
    let changed = 0;
    for (let id of ids) {
      let tracked = this.deviceRequests.get(id);
      if (tracked === undefined) continue;
      let next = deliveryOutcome(tracked.delivery, outcome);
      if (next !== tracked.delivery) {
        tracked.delivery = next;
        changed++;
      }
      try {
        tracked.onUpload?.(outcome);
      } catch (error) {
        logForDebugging(
          `A served call's upload listener threw (${outcome}); the delivery ledger is unaffected: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    }
    return changed;
  }
  rejectUndeliveredRequests(ids, status) {
    let count = 0;
    for (let id of ids) {
      let tracked = this.deviceRequests.get(id);
      if (tracked?.kind !== "served_call") continue;
      let pending = this.pendingRequests.get(id);
      if (!pending) continue;
      this.pendingRequests.delete(id);
      pending.reject(
        this.tracksRequestDelivery && tracked.delivery === "queued"
          ? new RequestNotDeliveredError(status)
          : new RequestDeliveryUnknownError(status),
      );
      count++;
    }
    return count;
  }
  sendServedCallRequest(request) {
    let requestId = randomUUID();
    if (this.inputClosed) {
      let rejected = Promise.reject(new StreamClosedAbortError(STREAM_CLOSED_TEXT));
      rejected.catch(() => {});
      return {
        requestId,
        sent: false,
        delivery: () => "queued",
        withdraw: () => false,
        reply: rejected,
        cancel: () => {},
        errorRepliesIgnored: () => 0,
      };
    }
    let tracked = this.trackDeviceRequest(
      requestId,
      "served_call",
      request.accepts,
      request.request.instance_id,
      request.onUpload,
    );
    let abortController = new AbortController();
    let signal = request.signal
      ? AbortSignal.any([request.signal, abortController.signal])
      : abortController.signal;
    let reply = this.sendRequest(request.request, unknown(), signal, {
      requestId,
      deviceHook: true,
    }).finally(() => {
      this.deviceRequests.delete(requestId);
    });
    return {
      requestId,
      sent: true,
      delivery: () => (this.tracksRequestDelivery ? normalizeDeliveryState(tracked.delivery) : "untracked"),
      withdraw: () => this.withdrawUnsentServedCall(requestId),
      reply,
      cancel: () => {
        if (this.pendingRequests.has(requestId)) {
          abortController.abort();
          return;
        }
        this.enqueueCancelRequest(requestId);
      },
      errorRepliesIgnored: () => tracked.errorRepliesIgnored,
    };
  }
  askToAnnounce(request, signal) {
    this.sendRequest(request, unknown(), signal, {
      deviceHook: true,
    }).catch(() => {});
  }
  withdrawUnsentServedCall(requestId) {
    let tracked = this.deviceRequests.get(requestId);
    let pending = this.pendingRequests.get(requestId);
    if (
      !this.tracksRequestDelivery ||
      pending === undefined ||
      tracked?.kind !== "served_call" ||
      tracked.delivery !== "queued"
    )
      return false;
    if (!this.withdrawQueuedRequest(requestId)) return false;
    this.pendingRequests.delete(requestId);
    pending.reject(new RequestWithdrawnUnsentError());
    return true;
  }
  async handleElicitation(
    mcpServerName,
    message,
    schema,
    signal,
    mode,
    url,
    elicitationId,
    display,
    background = false,
  ) {
    if (!this.hostAnswersElicitations)
      return {
        action: "cancel",
      };
    if (isTerminalShutdown()) {
      if (signal?.aborted)
        return {
          action: "cancel",
        };
      return heldUntilExit();
    }
    if (this.inputClosed || signal?.aborted)
      return {
        action: "cancel",
      };
    let requestId = randomUUID();
    let details = {
      tool_name: MCP_ELICITATION_DIALOG_TOOL,
      display_tool_name: "Claude needs your input",
      action_description: "Answer the MCP server's question to continue",
      tool_use_id: "",
      request_id: requestId,
    };
    this.publishedPendingActionDetails.set(requestId, details);
    if (background) this.backgroundPromptIds.add(requestId);
    this.sessionState.notifyStateChanged("requires_action", details);
    this.onUserDialogParked?.(details);
    let properties = schema?.properties;
    try {
      return await this.sendRequest(
        {
          subtype: "elicitation",
          mcp_server_name: mcpServerName,
          message,
          mode,
          url,
          elicitation_id: elicitationId,
          requested_schema: schema,
          property_order: mode !== "url" && isPlainObject(properties) ? Object.keys(properties) : undefined,
          title: display?.title,
          display_name: display?.displayName,
          description: display?.description,
        },
        ElicitationResponseSchema(),
        signal,
        {
          requestId,
        },
      );
    } catch {
      return {
        action: "cancel",
      };
    } finally {
      this.settlePublishedPrompt(requestId, !signal?.aborted);
    }
  }
  async requestUserDialog(dialogKind, payload, options) {
    if (isTerminalShutdown()) {
      if (options?.signal?.aborted)
        return {
          behavior: "cancelled",
        };
      return heldUntilExit();
    }
    let requestId = randomUUID();
    let card = dialogPermissionRequest(dialogKind, payload, requestId, options?.toolUseId);
    this.publishedPendingActionDetails.set(requestId, card);
    this.sessionState.notifyStateChanged("requires_action", card);
    this.onUserDialogParked?.(card);
    let source = dialogSourceAttr(dialogKind, payload);
    logEvent("tengu_request_user_dialog_requires_action", {
      dialog_kind: shortHash(dialogKind),
      ...source,
    });
    if (options?.onSettledUnanswered)
      this.unansweredSettleHandlers.set(requestId, options.onSettledUnanswered);
    if (options?.closesOnNewPrompt) this.dialogsANewPromptCloses.add(requestId);
    let timeoutMs = clampDialogTimeoutMs(options?.parkTimeoutMs);
    let timer;
    if (timeoutMs > 0) {
      timer = setTimeout(
        (requestId, dialogKind, timeoutMs, source) => {
          this.timedOutUserDialogs.set(requestId, {
            dialogKind,
            timedOutAt: Date.now(),
            source,
          });
          if (!this.cancelDialogByMachine(requestId, "deadline")) {
            this.timedOutUserDialogs.delete(requestId);
            return;
          }
          logEvent("tengu_request_user_dialog_timeout", {
            dialog_kind: shortHash(dialogKind),
            ...source,
            timeout_ms: timeoutMs,
          });
        },
        timeoutMs,
        requestId,
        dialogKind,
        timeoutMs,
        source,
      );
      timer.unref();
    }
    let alive = !this.inputClosed && options?.signal?.aborted !== true;
    try {
      return await this.sendRequest(
        {
          subtype: "request_user_dialog",
          dialog_kind: dialogKind,
          payload,
          tool_use_id: options?.toolUseId,
        },
        UserDialogResponseSchema(),
        options?.signal,
        {
          requestId,
        },
      );
    } catch {
      return {
        behavior: "cancelled",
      };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      this.unansweredSettleHandlers.delete(requestId);
      this.dialogsANewPromptCloses.delete(requestId);
      if (dialogKind === ENUM_PROMPT && alive) this.sendCancelRequest(requestId);
      this.settlePublishedPrompt(requestId, !this.timedOutUserDialogs.has(requestId));
    }
  }
  createSandboxAskCallback(context, applyUpdates, storageV5, options) {
    let inflight = new Map();
    let ask = async (host) => {
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
        let update = {
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
        let notifyDone = schedulePermissionNotify(
          humanizeToolName(SANDBOX_NETWORK_ACCESS_TOOL_NAME),
          storageV5,
          options,
        );
        let answer;
        try {
          answer = await this.sendRequest(
            {
              subtype: "can_use_tool",
              tool_name: SANDBOX_NETWORK_ACCESS_TOOL_NAME,
              display_name: humanizeToolName(SANDBOX_NETWORK_ACCESS_TOOL_NAME),
              input: {
                host,
              },
              permission_suggestions: [update],
              tool_use_id: randomUUID(),
              description: `Allow network connection to ${host}?`,
            },
            MARKETPLACE_ONLY_MANIFEST_FIELDS(context.kind),
          );
        } finally {
          notifyDone();
          if (this.flipBackLeftToUnpublishedAsk && !this.hasPendingPrompt())
            this.flipBackFromRequiresAction();
        }
        if (answer.behavior !== "allow") return false;
        let updatedPermissions = answer.updatedPermissions;
        switch (context.kind) {
          case "launcher":
            if (updatedPermissions && updatedPermissions.length > 0) {
              let updates = normalizePermissionUpdate(updatedPermissions, undefined);
              applyUpdates?.((state) => {
                updates = normalizePermissionUpdate(updatedPermissions, undefined, state);
                return applyPermissionUpdates(state, updates);
              });
              await persistPermissionUpdates(updates, storageV5);
            }
            break;
          case "strict":
            if (
              (applyUpdates
                ? applyUpdatesToSessionContext(
                    context,
                    applyPermissionAnswer(updatedPermissions, context.limits),
                    SANDBOX_NETWORK_ACCESS_TOOL_NAME,
                    applyUpdates,
                    listAnswerTighteningRules(updatedPermissions, context.limits.ruleLength),
                  )
                : listAnswerTighteningRules(updatedPermissions, context.limits.ruleLength).length) > 0
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
    return (req) => {
      let host = req.host;
      let existing = inflight.get(host);
      if (existing) return existing;
      let promise = ask(host).finally(() => {
        inflight.delete(host);
      });
      inflight.set(host, promise);
      return promise;
    };
  }
  async sendMcpMessage(serverName, message, timeoutMs = MCP_MESSAGE_TIMEOUT_MS) {
    let signal = isJsonRpcRequest(message)
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
            message,
          },
          objectSchema({
            mcp_response: anySchema().optional(),
          }),
          signal?.signal,
        )
      ).mcp_response;
    } finally {
      signal?.cleanup();
    }
  }
  async requestOAuthTokenRefresh() {
    let answer = await this.askHostForOAuthToken();
    if (typeof answer.accessToken === "string" && answer.accessToken) {
      clearLauncherLoginEnd();
      return answer.accessToken;
    }
    if (answer.reason !== undefined) recordLauncherLoginEnd(answer.reason);
    return null;
  }
  async requestHostSessionsBearer() {
    let now = Date.now();
    let answer = await this.askHostForOAuthToken("sessions");
    let accessToken = answer.accessToken || null;
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
        `[host-sessions-bearer] the host has no cloud-sessions token (${answer.reason ?? "no reason given"}); cloud-sessions calls use the sign-in token until a later ask brings one`,
        {
          level: "warn",
        },
      );
    return answer.reason === undefined
      ? {
          accessToken,
        }
      : {
          accessToken,
          reason: answer.reason,
        };
  }
  async askHostForOAuthToken(kind) {
    let now = Date.now();
    let answer;
    try {
      answer = await this.sendRequest(
        kind === undefined
          ? {
              subtype: "oauth_token_refresh",
            }
          : {
              subtype: "oauth_token_refresh",
              kind,
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
        kind: fromEnum(kind ?? "sign_in"),
        duration_ms: Date.now() - now,
      });
      throw error;
    }
    if (typeof answer.accessToken === "string" && answer.accessToken) return answer;
    logEvent("tengu_sdk_oauth_refresh_unfulfilled", {
      outcome: fromEnum(answer.reason !== undefined ? "declined" : "null"),
      reason: fromEnum(answer.reason ?? "none"),
      kind: fromEnum(kind ?? "sign_in"),
      duration_ms: Date.now() - now,
    });
    return answer;
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
  async requestHostAuthTokenRefresh(timeoutMs = HOST_AUTH_REFRESH_TIMEOUT_MS) {
    return this.sendRequest(
      {
        subtype: "host_auth_token_refresh",
      },
      HostAuthTokenRefreshResponseSchema(),
      AbortSignal.timeout(timeoutMs),
    );
  }
  enqueueCancelRequest(requestId) {
    this.outbound.enqueue({
      type: "control_cancel_request",
      request_id: requestId,
    });
  }
  sendCancelRequest(requestId) {
    if (!this.outbound.ended) {
      this.enqueueCancelRequest(requestId);
      return;
    }
    this.write({
      type: "control_cancel_request",
      request_id: requestId,
    }).catch((error) => {
      logForDebugging(
        `control_cancel_request for request_id=${requestId} not written: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    });
  }
  answerOwnWithdrawnAsk(requestId, toolUseId) {}
}
//@ chunk-na0b3c5q.js:51278-51576 file-local
async function exitWithMessage(message) {
  console.error(message);
  let deadline = Date.now() + 2000;
  await withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (exit)").catch(() => {});
  await withTimeout(
    flushDiagnosticLogs(),
    Math.max(0, deadline - Date.now()),
    "diagnostic log flush timeout (exit)",
  ).catch(() => {});
  await drainStdoutBeforeExit(Math.max(0, deadline - Date.now()), {
    scaleBudgetToQueue: false,
  });
  process.exit(1);
}
//@ chunk-na0b3c5q.js:51576-51664 sole-consumer
var MESSAGE_FIELD_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-na0b3c5q.js:51576", () => {
  MESSAGE_FIELD_NAMES = new Set(["type", "message", "uuid", "session_id", "parent_tool_use_id", "timestamp"]);
});
//@ chunk-na0b3c5q.js:51664-51754 sole-consumer
function isPlainMessageField([key, value]) {
  return (
    MESSAGE_FIELD_NAMES.has(key) ||
    (key === "isSynthetic" && value === false) ||
    (key === "shouldQuery" && value === true)
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
function formatStreamInputParseError(line, error) {
  return `Error parsing streaming input line (type=${/"type"\s*:\s*"([\w-]{1,40})"/.exec(line)?.[1] ?? "unknown"}, ${line.length} chars): ${error instanceof Error ? error.name : typeof error}`;
}
//@ chunk-na0b3c5q.js:52638-52781 sole-consumer
function describeInputLineLazy(message) {
  return () => ({
    type: message.type,
    ...(message.type === "user" && {
      uuid: matchRequestId(message.uuid),
    }),
    ...(message.type === "control_request" && {
      subtype: knownSubtypeOrUndefined(message.request.subtype),
    }),
  });
}
export {
  SANDBOX_NETWORK_ACCESS_TOOL_NAME,
  executePermissionRequestHooksForSDK,
  StructuredIO,
  buildRequiresActionDetails,
};

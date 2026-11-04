/**
 * remote/RemoteSessionManager.ts
 *
 * 已有模块；g2 补充 2.1.316 的远程会话管理类与送达失败提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/remote/RemoteSessionManager.ts
 * pieces: chunk-08945j39.js (37), chunk-fp6aqx1j.js (1)
 * attribution: placement 37, fingerprint 1
 */
import { isDeepStrictEqual } from "util";
import { randomUUID } from "crypto";
import { isPlainObject } from "../utils/isPlainObject.js";
import { SETTINGS_CONTROL_SUBTYPES } from "../cli/transports/ccrClient.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  looseObject,
  literal,
  record,
  unknown,
} from "../../vendor/zod/v4/classic/schemas.js";
import { isDifferentString } from "../bridge/bridgePermissionResponse.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, AbortError } from "../utils/errors.js";
import { safeEmit } from "../utils/telemetry/memorySummary.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { SessionsV2Client } from "./SessionsV2Client.js";
import {
  noopGuard,
  supportsSendNow,
  FORWARDED_CONTROL_REQUESTS,
  HOST_HANDLED_CONTROL_REQUESTS,
  holdFirstSendForSettings,
  defaultHoldBudgetMs,
  HOLD_MAX_MS,
} from "../services/homeSeed/firstSend.js";
import { supportsBackgroundTasksMovesBash } from "./backgroundTaskEvents.js";
import {
  controlResponseError,
  withOutcomeTelemetry,
  ControlRequestNotDeliveredError,
  ControlRequestTimeoutError,
} from "./controlRequestErrors.js";
import { MODEL_SET_STDOUT_PREFIX } from "../utils/messages.js";
import { isSubagentToolRequest, UNSUPPORTED_CONTROL_SUBTYPE_TEXT } from "./wireFrameShape.js";
import { count } from "../utils/collections.js";
import { parseControlRequest } from "../entrypoints/sdk/controlSchemas.js";
import {
  unexpectedValueFingerprint,
  isConfirmRepositoryTrustTool,
  isRequestComputerFolderTool,
} from "./tools/protocolConstants.js";
import {
  sendEventToRemoteSession,
  sendBashCommandToRemoteSession,
  buildControlResponse,
  prepareApiRequest,
  getSessionRequestHeaders,
  getOAuthRequestHeaders,
  resendAfterUntrustedDevice,
} from "../utils/teleport/api.js";
import { sleep, withDeadline } from "../utils/sleep.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logError } from "../utils/log.js";
import { jsonStringify } from "../utils/slowOperations.js";
import {
  servedAnswerLimitBytes,
  servedAnswerTooLargeText,
} from "../services/remoteTools/servedAnswerSize.js";
import { parseDeviceHookId } from "../utils/hooks/deviceHookId.js";
import { REMOTE_TOOLS_LOG_EVENTS } from "../services/remoteTools/remoteToolsDebug.js";
import { getOauthConfig } from "../constants/oauth.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { isTrustedDeviceGateEnabled } from "../bridge/trustedDevice.js";
import { classifyElevatedAuthError } from "../bridge/codeSessionApi.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-fp6aqx1j.js:16781-16916 fingerprint = isSDKMessage (0.72)
/**
 * 是否是可中继的控制帧：control_request（subtype 在允许集合内）或 control_response。
 */
function isRelayableControlFrame(frame) {
  if (!isPlainObject(frame)) return false;
  return frame.type === "control_request"
    ? isPlainObject(frame.request) && SETTINGS_CONTROL_SUBTYPES.has(frame.request.subtype)
    : frame.type === "control_response";
}
//@ chunk-08945j39.js:35221-35287 placement
function isTimeoutError(error) {
  return error instanceof Error && error.name === "TimeoutError";
}
//@ chunk-08945j39.js:35287-35312 placement
/**
 * 远程会话跟踪容量常量：Set 型跟踪表（已应答请求 id、可恢复对话框 id 等）上限 1000、每请求记录的成功工具名上限 8、权限请求缓存上限 200。
 */
var MAX_TRACKED_REQUEST_IDS = 1000;
var MAX_TOOL_NAMES_PER_REQUEST = 8;
var MAX_CACHED_PERMISSION_REQUESTS = 200;
//@ chunk-08945j39.js:35312-35581 placement
/**
 * 远程会话中控制请求的 schema 表（can_use_tool、request_user_dialog）。
 */
var CONTROL_REQUEST_SCHEMAS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-08945j39.js:35312", () => {
  CONTROL_REQUEST_SCHEMAS = {
    can_use_tool: DoctorLazy(() =>
      objectSchema({
        request_id: stringSchema(),
        request: looseObject({
          subtype: literal("can_use_tool"),
          tool_name: stringSchema(),
          input: record(stringSchema(), unknown()),
          tool_use_id: stringSchema(),
        }),
      }),
    ),
    request_user_dialog: DoctorLazy(() =>
      objectSchema({
        request_id: stringSchema(),
        request: looseObject({
          subtype: literal("request_user_dialog"),
          dialog_kind: stringSchema(),
          payload: record(stringSchema(), unknown()),
        }),
      }),
    ),
  };
});
//@ chunk-08945j39.js:35735-35802 placement
var controlResponseSuccessSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-08945j39.js:35735", () => {
  controlResponseSuccessSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("success"),
      response: objectSchema({
        toolName: stringSchema(),
      }),
    }),
  );
});
//@ chunk-08945j39.js:35802-35866 placement
function getControlResponseToolName(response) {
  return controlResponseSuccessSchema().safeParse(response).data?.response.toolName;
}
//@ chunk-08945j39.js:35866-35925 placement
/**
 * 导出函数 `isToolNameDifferent`：参数 e, n，返回 typeof n === "string" && isDifferentString(tt(e), n)。
 */
function isToolNameDifferent(response, toolName) {
  return typeof toolName === "string" && isDifferentString(getControlResponseToolName(response), toolName);
}
//@ chunk-08945j39.js:35925-35977 placement
function isDeepEqualSafe(left, request) {
  try {
    return isDeepStrictEqual(left, request);
  } catch {
    return false;
  }
}
//@ chunk-08945j39.js:35977-36073 placement
function addCappedToSet(set, requestId) {
  set.add(requestId);
  if (set.size > MAX_TRACKED_REQUEST_IDS) {
    let oldest = set.values().next().value;
    if (oldest !== undefined) set.delete(oldest);
  }
}
//@ chunk-08945j39.js:36073-36177 placement
function setCapped(map, requestId, value, maxEntries = MAX_CACHED_PERMISSION_REQUESTS) {
  map.set(requestId, value);
  if (map.size > maxEntries) {
    let oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
}
//@ chunk-08945j39.js:36177-36239 placement
/**
 * 需要转给本机处理的对话框类控制请求子类型：can_use_tool 与 request_user_dialog。
 */
var DIALOG_REQUEST_SUBTYPES = ["can_use_tool", "request_user_dialog"];
var REPLAYED_REFUSAL_MAX_AGE_MS = 30000;
var MAX_REPLAYED_REFUSALS = 16;
//@ chunk-08945j39.js:36239-36375 placement
/**
 * 把字符串转为可打印 ASCII 摘要（超过 80 字符截断并标出剩余长度）。
 */
function printableExcerpt(requestId) {
  return requestId.length > 80
    ? `${requestId.slice(0, 80).replace(/[^\x20-\x7e]/g, "?")}\u2026(+${requestId.length - 80})`
    : requestId.replace(/[^\x20-\x7e]/g, "?");
}
//@ chunk-08945j39.js:36375-36407 placement
/**
 * 远程控制请求的长度与重试常量：id 上限 256 字符、withheld 首条消息重发最多 3 次、退避 750 ms、重试窗口 35 秒。
 */
var MAX_CONTROL_ID_LENGTH = 256;
var MAX_WITHHELD_PROMPT_ATTEMPTS = 3;
var WITHHELD_PROMPT_BACKOFF_MS = 750;
var WITHHELD_PROMPT_RETRY_WINDOW_MS = 35000;
//@ chunk-08945j39.js:36407-36552 placement
function sendFailureKind(failure) {
  if (failure.withheld) return "withheld";
  if (failure.status === 429) return "http_429";
  if (failure.status !== undefined) return "http_4xx";
  return failure.cause ?? "unknown";
}
//@ chunk-08945j39.js:36552-36633 placement
function isRetriableSendFailure(kind) {
  return kind === "http_429" || kind === "server" || kind === "timeout" || kind === "network";
}
//@ chunk-08945j39.js:36633-36720 placement
var SEND_FAILURE_MESSAGES = {
  timeout: "the service took too long to answer",
  network: "the connection failed",
};
//@ chunk-08945j39.js:36720-36797 placement
/**
 * 导出函数 `sendFailureMessage`：参数 e，返回 n === "timeout" || n === "network" ? nt[n] : void 0。
 */
function sendFailureMessage(failure) {
  let kind = sendFailureKind(failure);
  return kind === "timeout" || kind === "network" ? SEND_FAILURE_MESSAGES[kind] : undefined;
}
//@ chunk-08945j39.js:36797-36928 placement
/**
 * 未决应答的投递常量：取消/撤回文案、已关闭的投递结果、释放等待 1500 ms、重发退避 [1s,5s,15s,45s] 及次数上限、工具类控制请求超时 120 s。
 */
var CANCELLED = "cancelled";
var WITHDRAWN = "withdrawn";
var CLOSED_SEND_RESULT = {
  outcome: "failed",
  cause: "closed",
};
var HELD_SENDS_RELEASE_TIMEOUT_MS = 1500;
var RESPONSE_RESEND_DELAYS_MS = [1000, 5000, 15000, 45000];
var RESPONSE_RESEND_MAX_ATTEMPTS = RESPONSE_RESEND_DELAYS_MS.length;
var TOOL_CONTROL_REQUEST_TIMEOUT_MS = 120000;
//@ chunk-08945j39.js:36928-38165 placement
function formatUndeliveredAnswerNotice(kind, giveUpReason) {
  switch (kind) {
    case "permission":
      return "A permission answer you gave could not be delivered to the cloud session, which may still be waiting for it. If the session looks stuck, interrupt it and retry.";
    case "dialog":
      return "A dialog answer you gave could not be delivered to the cloud session, which may still be waiting for it. If the session looks stuck, interrupt it and retry.";
    case "hook":
      return giveUpReason === "overtaken"
        ? "A hook's decision from this machine did not reach the cloud session before it stopped waiting for it: if the hook's deadline passed the tool call it was judging may have run without it; if the turn was interrupted, nothing ran."
        : "A hook's decision from this machine could not be delivered to the cloud session, which waits for it until the hook's deadline and then proceeds without it. Interrupt the session if that tool call must not run.";
    case "tool":
      return giveUpReason === "overtaken"
        ? "The result of work this machine did for the cloud session (such as a command it ran) did not reach the session before it stopped waiting for it."
        : "The result of work this machine did for the cloud session (such as a command it ran) could not be delivered; the session waits for it until its deadline and then carries on without it.";
  }
}
//@ chunk-08945j39.js:38165-75642 placement
/**
 * 远程会话管理：连接云会话、转发权限请求与对话框回答、处理未送达
 */
class RemoteSessionManager {
  config;
  callbacks;
  client = null;
  pendingPermissionRequests = new Map();
  undeliveredResponses = new Map();
  undeliveredHookIds = new Set();
  hookGiveUpsTold = new Set();
  pendingDialogRequests = new Set();
  pendingForwardedHooks = new Set();
  settledForwardedHookIds = new Set();
  workerSeenThisConnection = false;
  replayedRefusalsAnswered = 0;
  seedRequestsArmed = false;
  securityTierRaiseSeen = false;
  pendingServedRequests = new Map();
  settledServedRequestIds = new Set();
  errorShapedControlResponseIds = new Set();
  seenControlResponseIds = new Set();
  seenSuccessToolNames = new Map();
  retiredPermissionRequestIds = new Set();
  reinstatablePermissionRequests = new Map();
  reinstatableDialogIds = new Set();
  pendingControlRequests = new Map();
  workerStarting = false;
  pendingModelSwitchIds = new Set();
  sendGates = new Set();
  heldSends = new Set();
  withholdableHeldTold = false;
  chainedSends = 0;
  lifetime = new AbortController();
  serving = false;
  firstSendReleased = false;
  exitFlushRequested = false;
  withheldPromptInFlight = null;
  sentAMessage = false;
  sendsNow;
  movesBash;
  connections = 0;
  newestOwnMessageSequence = null;
  lastHeld = {
    issued: Promise.resolve(),
    posted: Promise.resolve(),
  };
  pendingInterrupt = null;
  constructor(config, callbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.sendsNow = config.seedWorkerSendsNow;
    this.movesBash = config.seedWorkerMovesBash;
    if (config.homeSeed !== undefined && config.homeSeedHoldsFirstSend !== false)
      this.gateSendsOnSettings(config.homeSeed);
    if (config.withheldInitialPrompt !== undefined) {
      let withheldInitialPrompt = config.withheldInitialPrompt;
      queueMicrotask(() => void this.sendWithheldInitialPrompt(withheldInitialPrompt));
    }
  }
  connect() {
    logForDebugging(`[RemoteSessionManager] Connecting to session ${this.config.sessionId}`);
    let callbacks = {
      onMessage: (message, meta) => this.handleMessage(message, meta),
      onConnected: (info) => {
        logForDebugging("[RemoteSessionManager] Connected");
        this.replayedRefusalsAnswered = 0;
        for (let undeliveredResponse of this.undeliveredResponses.values()) {
          undeliveredResponse.failures = 0;
          if (undeliveredResponse.giveUpOnSettle === "undelivered") undeliveredResponse.giveUpOnSettle = null;
        }
        this.resendUndeliveredResponses();
        this.workerSeenThisConnection = false;
        if (this.securityTierRaiseSeen)
          try {
            this.config.rebindEventSigner?.();
          } catch (error) {
            logForDebugging(`[RemoteSessionManager] rebindEventSigner threw: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        this.callbacks.onConnected?.(info);
        if (!this.seedRequestsArmed && !this.lifetime.signal.aborted) {
          this.seedRequestsArmed = true;
          let size = this.pendingPermissionRequests.size;
          let mapped = (this.config.seedSubagentRequests ?? []).map((seedRequest) =>
            safeEmit(
              (request) => this.handleControlRequest(request, {}),
              seedRequest,
              "RemoteSessionManager, attach seed",
            ),
          );
          if (mapped.length > 0 && !mapped.includes(true))
            logFeatureBad("remote_permission_seed_adoption", "handler_threw");
          else if (mapped.includes(false)) logFeatureSad("remote_permission_seed_adoption", "handler_threw");
          else if (mapped.length > 0) logFeatureOk("remote_permission_seed_adoption");
          let adoptedCount = this.pendingPermissionRequests.size - size;
          if (adoptedCount > 0)
            logEvent("tengu_remote_subagent_requests_adopted", {
              count: adoptedCount,
              subagents_asking_at_a_turn_end: this.config.seedAskersPastATurn?.length ?? 0,
            });
        }
      },
      onClose: (reason) => {
        logForDebugging("[RemoteSessionManager] Disconnected");
        if (this.client?.isRevivable()) this.giveUpUndeliveredResponses();
        else this.dropUndeliveredResponses();
        this.endWorkerStart();
        this.callbacks.onDisconnected?.(reason);
      },
      onReconnecting: () => {
        this.workerSeenThisConnection = false;
        logForDebugging("[RemoteSessionManager] Reconnecting");
        this.callbacks.onReconnecting?.();
      },
      onStreamSilent: (gapMs) => this.callbacks.onStreamSilent?.(gapMs),
      onDeliveryUpdate: ({ eventId, status }) => {
        if (/PROCESS(ING|ED)$/i.test(status)) this.callbacks.onLineTaken?.(eventId);
      },
      onOwnRequestEchoed: (requestId, event) => {
        let pending = this.pendingControlRequests.get(requestId);
        if (pending?.onEchoed) {
          this.pendingControlRequests.set(requestId, {
            ...pending,
            onEchoed: undefined,
          });
          pending.onEchoed(event);
        }
      },
      onWorkerConnectionStatus: (status) => {
        logForDebugging(
          `[RemoteSessionManager] The service reports the worker ${status === "connected" || status === "disconnected" ? status : "in an unknown state"}`,
        );
        if (status === "connected") {
          this.noteWorkerLive();
          this.callbacks.onWorkerConnectionStatus?.(status);
        } else if (status === "disconnected") {
          if (this.workerSeenThisConnection) this.endWorkerStart();
          this.workerSeenThisConnection = false;
          this.callbacks.onWorkerGone?.();
          this.callbacks.onWorkerConnectionStatus?.(status);
        }
      },
      onSecurityTierRaised: () => {
        this.securityTierRaiseSeen = true;
      },
      onToolHostEnded: (reason) => {
        logForDebugging(
          "[RemoteSessionManager] The service ended this session's connection to a computer serving its tools",
        );
        this.callbacks.onToolHostEnded?.(reason);
      },
      ...{},
      onCatchUpTruncated: () => {
        logForDebugging("[RemoteSessionManager] Catch-up truncated");
        this.callbacks.onCatchUpTruncated?.();
      },
      onError: (error) => {
        logForDebugging(`[RemoteSessionManager] Stream error: ${error.message}`, {
          level: "error",
        });
        this.callbacks.onError?.(error);
      },
    };
    this.client = new SessionsV2Client(
      this.config.sessionId,
      this.config.orgUuid,
      this.config.getAccessToken,
      callbacks,
      this.config.onAuth401,
      this.config.initialSequenceNum,
      {
        trackSends: this.config.trackSendsInFlight === true,
        controlOnly: this.config.controlOnly === true,
        admitProjectPersonMessages: this.config.admitProjectPersonMessages === true,
        keepRedialling: () => this.config.keepStreamRedialling === true || this.serving,
        withholdTrustedDeviceToken: this.config.consoleProfileBearer === true,
        ...this.signedOpts({}),
      },
    );
    this.client.connect();
  }
  handleMessage(message, meta = {}) {
    noopGuard("in", message, meta);
    if (meta.source === "worker" && meta.replayed !== true) this.noteWorkerLive();
    if (meta.source === "worker" && message.type === "system" && message.subtype === "init") {
      this.sendsNow = supportsSendNow(message);
      this.movesBash = supportsBackgroundTasksMovesBash(message);
    }
    if (message.type === "control_request") {
      this.handleControlRequest(message, meta);
      return;
    }
    if (message.type === "control_cancel_request") {
      let { request_id: requestId } = message;
      this.reinstatablePermissionRequests.delete(requestId);
      this.reinstatableDialogIds.delete(requestId);
      let undelivered = this.undeliveredResponses.get(requestId);
      if (undelivered?.kind === "hook" || undelivered?.kind === "tool") this.giveUp(undelivered, "overtaken");
      else if (undelivered) this.dropKept(undelivered);
      else if (
        this.config.keepUndeliveredResponses === true &&
        this.settledForwardedHookIds.has(requestId) &&
        !this.hookGiveUpsTold.has(requestId)
      ) {
        addCappedToSet(this.hookGiveUpsTold, requestId);
        logFeatureBad("remote_control_response", "overtaken");
        this.callbacks.onResponseUndelivered?.(requestId, "hook", "overtaken");
      }
      if (this.pendingForwardedHooks.delete(requestId)) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook request cancelled by the worker: ${printableExcerpt(requestId)}`,
        );
        this.callbacks.onForwardedHookCancelled?.(requestId, "worker");
        return;
      }
      if (this.retireServedRequest(requestId, "worker")) return;
      if (this.pendingDialogRequests.delete(requestId)) {
        logForDebugging(`[RemoteSessionManager] User dialog request cancelled: ${requestId}`);
        this.callbacks.onUserDialogCancelled?.(requestId);
        return;
      }
      let pending = this.pendingPermissionRequests.get(requestId);
      if (!pending) {
        logForDebugging(
          `[RemoteSessionManager] control_cancel_request for unknown request ${requestId} \u2014 nothing pending, ignoring`,
        );
        return;
      }
      logForDebugging(`[RemoteSessionManager] Permission request cancelled: ${requestId}`);
      this.retirePermissionRequest(requestId);
      this.callbacks.onPermissionCancelled?.(requestId, pending.tool_use_id);
      return;
    }
    if (message.type === "system" && message.subtype === "control_request_progress") {
      if (this.pendingControlRequests.has(message.request_id)) this.endWorkerStart();
      let pending = this.pendingControlRequests.get(message.request_id);
      if (!pending) {
        logForDebugging(
          `[RemoteSessionManager] control_request_progress for unknown request ${message.request_id} \u2014 ignoring`,
        );
        return;
      }
      clearTimeout(pending.timer);
      let timer = setTimeout(
        this.onControlRequestTimeout,
        pending.timeoutMs,
        message.request_id,
        pending.subtype,
        pending.timeoutMs,
      );
      this.pendingControlRequests.set(message.request_id, {
        ...pending,
        timer,
      });
      pending.onProgress?.(message);
      return;
    }
    if (message.type === "control_response") {
      let { request_id: requestId } = message.response;
      let errorShaped =
        this.config.ignoreErrorShapedDialogReplies === true && message.response.subtype === "error";
      let controlResponseToolName = getControlResponseToolName(message.response);
      let seenToolNames = this.seenSuccessToolNames.get(requestId) ?? [];
      let pendingPermission = this.pendingPermissionRequests.get(requestId);
      let toolNameMismatch =
        pendingPermission !== undefined &&
        isDifferentString(controlResponseToolName, pendingPermission.tool_name);
      if (errorShaped) addCappedToSet(this.errorShapedControlResponseIds, requestId);
      else if (
        controlResponseToolName !== undefined &&
        seenToolNames.length < MAX_TOOL_NAMES_PER_REQUEST &&
        !toolNameMismatch
      )
        setCapped(
          this.seenSuccessToolNames,
          requestId,
          [...seenToolNames, controlResponseToolName],
          MAX_TRACKED_REQUEST_IDS,
        );
      else if (!toolNameMismatch) this.recordSeenControlResponseId(requestId);
      let undelivered = this.undeliveredResponses.get(requestId);
      if (
        undelivered !== undefined &&
        "uuid" in message &&
        message.uuid === undelivered.uuid &&
        undelivered.giveUpOnSettle !== "overtaken"
      ) {
        this.dropKept(undelivered);
        if (undelivered.failures > 0) logFeatureSad("remote_control_response", "recovered");
        else logFeatureOk("remote_control_response");
      }
      this.pendingModelSwitchIds.delete(requestId);
      let pendingControl = this.pendingControlRequests.get(requestId);
      if (pendingControl) {
        this.pendingControlRequests.delete(requestId);
        clearTimeout(pendingControl.timer);
        pendingControl.removeAbortListener?.();
        this.endWorkerStart();
        if (message.response.subtype === "success") pendingControl.resolve(message.response.response);
        else pendingControl.reject(controlResponseError(message.response));
      } else {
        let pendingPermission = this.pendingPermissionRequests.get(requestId);
        if (pendingPermission) {
          if (toolNameMismatch) {
            logForDebugging(
              `[RemoteSessionManager] Permission response ${requestId} has mismatched toolName \u2014 worker will drop it, keeping prompt`,
            );
            return;
          }
          this.retirePermissionRequest(requestId);
          logForDebugging(
            `[RemoteSessionManager] Permission request ${requestId} answered elsewhere \u2014 dismissing`,
          );
          this.callbacks.onPermissionCancelled?.(requestId, pendingPermission.tool_use_id);
        } else if (this.pendingDialogRequests.has(requestId)) {
          if (errorShaped)
            logForDebugging(
              `[RemoteSessionManager] User dialog request ${requestId} got an error-shaped reply elsewhere \u2014 worker still waiting, keeping it`,
            );
          else {
            this.pendingDialogRequests.delete(requestId);
            logForDebugging(
              `[RemoteSessionManager] User dialog request ${requestId} answered elsewhere \u2014 dismissing`,
            );
            this.callbacks.onUserDialogCancelled?.(requestId);
          }
        } else if (this.pendingForwardedHooks.has(requestId))
          logForDebugging(
            `[RemoteSessionManager] Ignoring a peer control_response (${message.response.subtype}) for forwarded hook request ${printableExcerpt(requestId)} \u2014 still answering it here`,
          );
        else if (!this.settledServedRequestIds.has(requestId))
          logForDebugging(
            `[RemoteSessionManager] Unmatched control_response ${requestId} (${message.response.subtype})${message.response.subtype === "error" ? `: ${message.response.error}` : ""}`,
          );
      }
      if (this.config.rearmRedeliveredPermissionRequests === true)
        this.rearmRedelivered(
          message.response.pending_permission_requests,
          "can_use_tool",
          this.pendingPermissionRequests,
        );
      this.rearmRedelivered(
        message.response.pending_user_dialog_requests,
        "request_user_dialog",
        this.pendingDialogRequests,
      );
      return;
    }
    if (
      this.config.keepOwnModelSwitchBreadcrumb !== true &&
      this.pendingModelSwitchIds.size > 0 &&
      message.type === "user" &&
      "isReplay" in message &&
      message.isReplay === true &&
      typeof message.message?.content === "string" &&
      message.message.content.startsWith(MODEL_SET_STDOUT_PREFIX)
    ) {
      let [modelSwitchId] = this.pendingModelSwitchIds;
      this.pendingModelSwitchIds.delete(modelSwitchId);
      logForDebugging("[RemoteSessionManager] Dropped own set_model breadcrumb echo");
      return;
    }
    if (message.type === "result") {
      if (
        this.sentAMessage ||
        this.config.homeSeedHoldsFirstSend !== false ||
        this.config.initialPromptUuid !== undefined
      )
        this.config.homeSeed?.afterFirstReply(this.lifetime.signal);
      let permissionEntries = [...this.pendingPermissionRequests];
      let toDismiss =
        this.config.subagentRequestsOutliveTheTurn === true
          ? permissionEntries.filter(([, request]) => !isSubagentToolRequest(request))
          : permissionEntries;
      for (let [requestId, request] of toDismiss) {
        logForDebugging(
          `[RemoteSessionManager] Turn ended with permission request ${requestId} unresolved \u2014 dismissing`,
        );
        this.callbacks.onPermissionCancelled?.(requestId, request.tool_use_id);
        this.retirePermissionRequest(requestId);
        setCapped(this.reinstatablePermissionRequests, requestId, request);
      }
      if (permissionEntries.length > 0 && meta.replayed !== true) {
        let subagentCount = count(permissionEntries, ([, request]) => isSubagentToolRequest(request));
        logEvent("tengu_remote_turn_ended_with_open_permission_requests", {
          from_main_thread: permissionEntries.length - subagentCount,
          from_subagents: subagentCount,
          kept_open: permissionEntries.length - toDismiss.length,
        });
      }
      for (let pendingDialogRequest of this.pendingDialogRequests) {
        logForDebugging(
          `[RemoteSessionManager] Turn ended with user dialog request ${pendingDialogRequest} unresolved \u2014 dismissing`,
        );
        this.callbacks.onUserDialogCancelled?.(pendingDialogRequest);
        addCappedToSet(this.reinstatableDialogIds, pendingDialogRequest);
      }
      this.pendingDialogRequests.clear();
    }
    this.callbacks.onMessage(message, meta);
  }
  retirePermissionRequest(requestId) {
    this.pendingPermissionRequests.delete(requestId);
    this.retiredPermissionRequestIds.add(requestId);
  }
  rearmRedelivered(requests, schemaKey, pendingSet) {
    if (!Array.isArray(requests)) return;
    requests.slice(0, MAX_CACHED_PERMISSION_REQUESTS).forEach((raw) => {
      let controlRequest = parseControlRequest(raw, schemaKey);
      if (controlRequest === null) return;
      let seenToolNames = this.seenSuccessToolNames.get(controlRequest.request_id);
      let { request } = controlRequest;
      if (
        this.seenControlResponseIds.has(controlRequest.request_id) ||
        (schemaKey === "can_use_tool" && this.errorShapedControlResponseIds.has(controlRequest.request_id)) ||
        (seenToolNames !== undefined &&
          !(
            request.subtype === "can_use_tool" &&
            seenToolNames.every((toolName) => isDifferentString(toolName, request.tool_name))
          ))
      ) {
        logForDebugging(
          `[RemoteSessionManager] Redelivered ${schemaKey} ${printableExcerpt(controlRequest.request_id)} already answered \u2014 skipping`,
        );
        return;
      }
      let reinstated = false;
      if (schemaKey === "can_use_tool" && this.retiredPermissionRequestIds.has(controlRequest.request_id)) {
        let original = this.reinstatablePermissionRequests.get(controlRequest.request_id);
        if (original === undefined) {
          logForDebugging(
            `[RemoteSessionManager] Redelivered can_use_tool ${printableExcerpt(controlRequest.request_id)} already retired here \u2014 skipping`,
          );
          return;
        }
        this.reinstatablePermissionRequests.delete(controlRequest.request_id);
        if (!isDeepEqualSafe(original, controlRequest.request)) {
          logFeatureBad("remote_permission_request", "redelivered_mismatch");
          logForDebugging(
            `[RemoteSessionManager] Redelivered can_use_tool ${printableExcerpt(controlRequest.request_id)} differs from the request first shown under that id \u2014 not arming it`,
            {
              level: "warn",
            },
          );
          return;
        }
        this.retiredPermissionRequestIds.delete(controlRequest.request_id);
        reinstated = true;
      } else if (schemaKey === "request_user_dialog")
        reinstated = this.reinstatableDialogIds.has(controlRequest.request_id);
      let alreadyPending = pendingSet.has(controlRequest.request_id);
      this.handleControlRequest(
        controlRequest,
        {},
        {
          reinstated,
        },
      );
      if (!alreadyPending && pendingSet.has(controlRequest.request_id)) {
        this.reinstatableDialogIds.delete(controlRequest.request_id);
        logFeatureOk(
          schemaKey === "can_use_tool" ? "remote_permission_redelivery" : "remote_dialog_redelivery",
        );
      }
    });
  }
  recordSeenControlResponseId(requestId) {
    addCappedToSet(this.seenControlResponseIds, requestId);
  }
  recordSettledForwardedHookId(requestId) {
    addCappedToSet(this.settledForwardedHookIds, requestId);
  }
  handleControlRequest(request, { ageMs, attestationStatus, modeStamp, replayed }, extra) {
    let { request_id: requestId, request: request_2 } = request;
    let meta = {
      replayed,
      ageMs,
    };
    let subtype =
      typeof request_2 === "object" && request_2 !== null && Object.hasOwn(request_2, "subtype")
        ? request_2.subtype
        : undefined;
    let unknownSubtype = unexpectedValueFingerprint(subtype, FORWARDED_CONTROL_REQUESTS);
    if (unknownSubtype !== undefined) {
      let found = HOST_HANDLED_CONTROL_REQUESTS.find((handledName) => handledName === subtype);
      this.refuseControlRequest(
        requestId,
        found !== undefined
          ? `${found}, which another client answers,`
          : `a control request of a kind no client of this build handles (${unknownSubtype.length} characters, sha12 ${unknownSubtype.hash}${unknownSubtype.variantOfListed ? ", a variant of a listed kind" : ""})`,
        meta,
      );
      if (found === undefined) this.callbacks.onControlRequestRefused?.(unknownSubtype);
      return;
    }
    if (typeof requestId !== "string") {
      this.refuseControlRequest(requestId, `${request_2.subtype} with an id that is not a string`, meta);
      return;
    }
    if (request_2.subtype === "can_use_tool") {
      logForDebugging(`[RemoteSessionManager] Permission request for tool: ${request_2.tool_name}`);
      let pending = this.pendingPermissionRequests.get(requestId);
      if (pending !== undefined) {
        if (isDeepEqualSafe(pending, request_2))
          logForDebugging(
            `[RemoteSessionManager] Duplicate permission request ${printableExcerpt(String(requestId))} \u2014 already pending, skipping`,
          );
        else {
          logFeatureBad("remote_permission_request", "redelivered_mismatch");
          logForDebugging(
            `[RemoteSessionManager] Permission request ${printableExcerpt(String(requestId))} redelivered with a different body (${printableExcerpt(String(request_2.tool_name))}) \u2014 keeping the one first shown (${printableExcerpt(pending.tool_name)})`,
            {
              level: "warn",
            },
          );
        }
        return;
      }
      if (this.retiredPermissionRequestIds.has(requestId)) {
        if (
          this.config.seedSubagentRequests?.some(
            (seedSubagentRequest) => seedSubagentRequest.request_id === requestId,
          ) !== true
        )
          logFeatureBad("remote_permission_request", "retired_id_rearmed");
        logForDebugging(
          `[RemoteSessionManager] Permission request ${printableExcerpt(String(requestId))} arrived again after it was retired here \u2014 not arming it`,
          {
            level: "warn",
          },
        );
        return;
      }
      let clonedRequest = request_2;
      try {
        clonedRequest = structuredClone(request_2);
      } catch {
        clonedRequest = request_2;
      }
      this.pendingPermissionRequests.set(requestId, clonedRequest);
      this.callbacks.onPermissionRequest(request_2, requestId, extra, replayed === true);
      return;
    }
    if (request_2.subtype === "request_user_dialog") {
      if (this.pendingDialogRequests.has(requestId)) {
        logForDebugging(
          `[RemoteSessionManager] Duplicate user dialog request ${requestId} \u2014 already pending, skipping`,
        );
        return;
      }
      logForDebugging(`[RemoteSessionManager] User dialog request: ${request_2.dialog_kind}`);
      this.pendingDialogRequests.add(requestId);
      this.callbacks.onUserDialogRequest(request_2, requestId, extra);
      return;
    }
    if (request_2.subtype === "hook_callback" && isDeviceHookRequest(request_2)) {
      let onForwardedHookCallback = this.callbacks.onForwardedHookCallback;
      if (!onForwardedHookCallback) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook_callback ${printableExcerpt(requestId)} \u2014 not serving device hooks here, leaving it unanswered`,
        );
        return;
      }
      if (requestId.length > MAX_CONTROL_ID_LENGTH || request_2.callback_id.length > MAX_CONTROL_ID_LENGTH) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook_callback ${printableExcerpt(requestId)} \u2014 an id longer than ${MAX_CONTROL_ID_LENGTH} characters, leaving it unanswered`,
        );
        return;
      }
      let forwarded = {
        requestId,
        callbackId: request_2.callback_id,
        input: request_2.input,
        ...(typeof request_2.issued_at === "number" && {
          issuedAt: request_2.issued_at,
        }),
        ...(typeof request_2.deadline_ms === "number" && {
          deadlineMs: request_2.deadline_ms,
        }),
        ageMs,
        ...(attestationStatus !== undefined && {
          attestationStatus,
        }),
      };
      let onUndeliveredHookReplayed = this.callbacks.onUndeliveredHookReplayed;
      if (onUndeliveredHookReplayed && this.undeliveredHookIds.delete(requestId)) {
        this.hookGiveUpsTold.delete(requestId);
        this.pendingForwardedHooks.add(requestId);
        onUndeliveredHookReplayed(forwarded);
        return;
      }
      if (this.settledForwardedHookIds.has(requestId) || this.pendingForwardedHooks.has(requestId)) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook_callback ${printableExcerpt(requestId)} already answered or in hand \u2014 skipping`,
        );
        return;
      }
      this.pendingForwardedHooks.add(requestId);
      onForwardedHookCallback(forwarded);
      return;
    }
    if (isServedChannelRequest(request_2)) {
      let onServedChannelRequest = this.callbacks.onServedChannelRequest;
      if (!onServedChannelRequest) {
        logForDebugging(
          `[RemoteSessionManager] ${request_2.subtype} ${printableExcerpt(requestId)} \u2014 not serving tools here, leaving it unanswered`,
        );
        return;
      }
      if (requestId.length > MAX_CONTROL_ID_LENGTH) {
        logForDebugging(
          `[RemoteSessionManager] ${request_2.subtype} ${printableExcerpt(requestId)} \u2014 an id longer than ${MAX_CONTROL_ID_LENGTH} characters, leaving it unanswered`,
        );
        return;
      }
      if (this.settledServedRequestIds.has(requestId) || this.pendingServedRequests.has(requestId)) {
        logForDebugging(
          `[RemoteSessionManager] ${request_2.subtype} ${printableExcerpt(requestId)} already answered or in hand \u2014 skipping`,
        );
        return;
      }
      let abortController = new AbortController();
      this.pendingServedRequests.set(requestId, {
        abort: abortController,
        subtype: request_2.subtype,
      });
      onServedChannelRequest({
        requestId,
        subtype: request_2.subtype,
        request: request_2,
        signal: abortController.signal,
        ageMs,
        ...(attestationStatus !== undefined && {
          attestationStatus,
        }),
        ...(modeStamp !== undefined && {
          modeStamp,
        }),
      });
      return;
    }
    this.refuseControlRequest(
      requestId,
      `${request_2.subtype} in a shape this client has no handler for`,
      meta,
    );
  }
  refuseControlRequest(requestId, description, { replayed, ageMs }) {
    let skipAnswer =
      replayed === true &&
      (ageMs === undefined ||
        ageMs > REPLAYED_REFUSAL_MAX_AGE_MS ||
        this.replayedRefusalsAnswered >= MAX_REPLAYED_REFUSALS);
    if (this.config.controlOnly === true || typeof requestId !== "string" || skipAnswer) {
      logForDebugging(
        `[RemoteSessionManager] ${description}${typeof requestId === "string" ? ` ${printableExcerpt(requestId)}` : ""} \u2014 leaving it unanswered`,
      );
      return;
    }
    if (replayed === true) this.replayedRefusalsAnswered++;
    logForDebugging(
      `[RemoteSessionManager] ${description} ${printableExcerpt(requestId)} \u2014 answering that it is not supported`,
    );
    this.sendResponse(
      {
        type: "control_response",
        response: {
          subtype: "error",
          request_id: requestId,
          error: UNSUPPORTED_CONTROL_SUBTYPE_TEXT,
        },
      },
      null,
    );
  }
  signedOpts(opts) {
    return {
      ...(opts ?? {}),
      ...(this.config.eventSigner && {
        eventSigner: this.config.eventSigner,
      }),
    };
  }
  async sendMessage(content, opts, submittedAtMs) {
    return this.send(
      content,
      opts,
      (payload, signOpts) =>
        sendEventToRemoteSession(this.config.sessionId, payload, this.signedOpts(signOpts)),
      false,
      submittedAtMs,
    );
  }
  async sendMessageVia(content, opts, sendFn) {
    return this.send(content, opts, sendFn, true);
  }
  async send(content, opts, sendFn, via, submittedAtMs) {
    logForDebugging(`[RemoteSessionManager] Sending message to session ${this.config.sessionId}`);
    this.reviveStreamForUserSend();
    noopGuard("out", {
      kind: "sendMessage",
      content,
      opts,
    });
    let gates = this.currentSendGates();
    let canSendDirectly = !via && gates.length === 0 && this.chainedSends === 0;
    let unusedFlag = null;
    let sendVia = sendFn;
    let result;
    try {
      result = await (canSendDirectly
        ? sendVia(content, opts)
        : this.sendBehindGates(gates, content, opts, sendVia, submittedAtMs));
    } catch (error) {
      logForDebugging(
        `[RemoteSessionManager] Send to session ${this.config.sessionId} threw: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      logFeatureBad("remote_send_message", "remote_send_message_threw");
      throw error;
    }
    if (!result.ok && result.withheld) {
      logForDebugging(`[RemoteSessionManager] Message withheld by a send gate: ${result.reason}`);
      logFeatureSad(
        "remote_send_message",
        result.reason === CANCELLED
          ? "remote_send_message_cancelled"
          : result.reason === WITHDRAWN
            ? "remote_send_message_withdrawn"
            : "remote_send_message_withheld",
      );
    } else if (!result.ok) {
      logForDebugging(
        `[RemoteSessionManager] Failed to send message to session ${this.config.sessionId}: ${result.reason}`,
        {
          level: "error",
        },
      );
      logFeatureBad("remote_send_message", "remote_send_message_failed");
    } else {
      logFeatureOk("remote_send_message");
      this.sentAMessage = true;
    }
    return result;
  }
  addSendGate(gate, options = {}) {
    let gateEntry = {
      gate,
      onRelease: options.onRelease ?? "send",
      onExit: options.onExit ?? "as_release",
    };
    this.sendGates.add(gateEntry);
    return () => {
      this.sendGates.delete(gateEntry);
    };
  }
  gateSendsOnSettings(settings) {
    let retire = () => {};
    let hold = holdFirstSendForSettings(settings, {
      retire: () => retire(),
      noticeAfterMs: this.config.homeSeedWaitNoticeMs,
      typedAheadGraceMs: this.config.homeSeedTypedAheadGraceMs,
    });
    if (hold === null) return;
    retire = this.addSendGate(
      (send) => {
        send.released.then(() => {
          if (!send.exiting()) this.firstSendReleased = true;
        });
        return hold(send);
      },
      {
        onRelease: "withhold",
        onExit: "await",
      },
    );
  }
  async sendWithheldInitialPrompt(prompt) {
    if (prompt.sent) return;
    prompt.sent = true;
    let now = Date.now();
    let withheldPromptBackoffMs = this.config.withheldPromptBackoffMs ?? WITHHELD_PROMPT_BACKOFF_MS;
    let attempts = 0;
    let firstAttemptAt;
    let sendOnce = async (content, opts) => {
      attempts += 1;
      firstAttemptAt ??= Date.now();
      let result = await sendEventToRemoteSession(this.config.sessionId, content, this.signedOpts(opts));
      if (
        result.ok ||
        attempts >= MAX_WITHHELD_PROMPT_ATTEMPTS ||
        !isRetriableSendFailure(sendFailureKind(result)) ||
        this.firstSendReleased ||
        Date.now() - firstAttemptAt >
          (this.config.withheldPromptRetryWindowMs ?? WITHHELD_PROMPT_RETRY_WINDOW_MS)
      )
        return result;
      await sleep(withheldPromptBackoffMs * attempts, this.lifetime.signal);
      if (this.exitFlushRequested && !this.firstSendReleased) {
        attempts += 1;
        return sendEventToRemoteSession(this.config.sessionId, content, this.signedOpts(opts));
      }
      return this.lifetime.signal.aborted || this.firstSendReleased ? result : sendOnce(content, opts);
    };
    let sendPromise = this.send(
      prompt.content,
      {
        uuid: prompt.uuid,
      },
      sendOnce,
      true,
      0,
    ).catch((error) => ({
      ok: false,
      reason: errorMessage(error),
    }));
    this.withheldPromptInFlight = sendPromise.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    let result = await sendPromise;
    this.withheldPromptInFlight = null;
    let aborted = this.lifetime.signal.aborted && !result.ok;
    logEvent("tengu_home_seed_prompt_resequenced", {
      success: result.ok,
      withheld_for: fromEnum(
        prompt.followsPermissionMode
          ? "signed_send"
          : prompt.heldOnlyForToolsCheck
            ? "tools_check"
            : this.config.homeSeed !== undefined
              ? "home_seed"
              : "other",
      ),
      attempts,
      reason: fromEnum(result.ok ? "ok" : aborted ? "aborted" : sendFailureKind(result)),
      duration_ms: Date.now() - now,
    });
    if (result.ok) {
      prompt.sent = true;
      this.callbacks.onWithheldPromptSent?.();
    }
    if (aborted || result.ok) return;
    let kind = sendFailureKind(result);
    let mayHaveArrived = kind === "timeout" || kind === "network" || kind === "unknown";
    let explanation;
    switch (kind) {
      case "withheld":
      case "not_first_party":
        explanation = result.reason;
        break;
      case "http_429":
        explanation = "the service is busy";
        break;
      case "http_4xx":
        explanation = result.advice ?? `the service refused it, HTTP ${String(result.status)}`;
        break;
      case "server":
        explanation = "the service had an error";
        break;
      case "timeout":
      case "network":
        explanation = SEND_FAILURE_MESSAGES[kind];
        break;
      case "unknown":
        explanation = result.advice ?? "";
        break;
    }
    if (this.callbacks.onWithheldPromptFailed)
      this.callbacks.onWithheldPromptFailed(explanation, mayHaveArrived);
    else {
      let detail = explanation === "" ? "" : `: ${explanation.replace(/\.+$/, "")}`;
      this.config.homeSeed?.status.publish(
        mayHaveArrived
          ? `Your first message may not have reached the cloud session${detail}. If Claude doesn't respond to it soon, send it again`
          : `Couldn't send your first message${detail}`,
        "warning",
      );
    }
  }
  currentSendGates() {
    return [...[], ...this.sendGates];
  }
  async sendBehindGates(gates, content, opts, sendFn, submittedAtMs) {
    this.chainedSends++;
    let exiting = false;
    let final = false;
    let withdrawn = false;
    let resolveReleased = () => {};
    let promise = new Promise((resolve) => {
      resolveReleased = resolve;
    });
    let release = (isExiting, isFinal) => {
      exiting = isExiting;
      final = isFinal;
      withdrawn = true;
      resolveReleased();
      this.tellWithholdableHeld();
    };
    let resolveWithdrawn = () => {};
    let promise_2 = new Promise((resolve) => {
      resolveWithdrawn = resolve;
    });
    let resolveDecided = () => {};
    let decided = new Promise((resolve) => {
      resolveDecided = resolve;
    });
    let sendToken = {
      messageUuid: opts?.uuid,
      ...(submittedAtMs !== undefined && {
        submittedAtMs,
      }),
      released: promise,
      withdrawn: promise_2,
      exiting: () => exiting,
      final: () => final,
      decided,
    };
    let resolveIssued = () => {};
    let issued = new Promise((resolve) => {
      resolveIssued = resolve;
    });
    let lastHeld = this.lastHeld;
    let detach = () => {};
    let withdrawRequested = false;
    let issuedYet = false;
    let mapped = gates.map(() => {
      return;
    });
    let waitingGates = new Set(gates);
    let mapped_2 = gates.map((gate, index) =>
      runSendGate(gate.gate, sendToken).then((outcome) => {
        mapped[index] = outcome;
        waitingGates.delete(gate);
        this.tellWithholdableHeld();
        return outcome;
      }),
    );
    let promise_3 = new Promise((resolve) => {
      for (let gatePromise of mapped_2)
        gatePromise.then((outcome) => {
          if (outcome !== undefined) resolve(outcome);
        });
    });
    let winner = Promise.race([
      Promise.all(mapped_2).then(findFirstDefined),
      promise_3,
      promise.then(
        () =>
          findFirstDefined(mapped) ??
          withholdOnRelease(waitingGates, exiting) ??
          Promise.all(mapped_2.filter((outcome, index) => exiting && gates[index]?.onExit === "await")).then(
            findFirstDefined,
          ),
      ),
      promise_2.then(() => withdrawnSendResult(true)),
    ]);
    let markDecided = () => {
      withdrawn = true;
      resolveDecided();
      this.tellWithholdableHeld();
    };
    winner.then(markDecided, markDecided);
    let posted = winner
      .then((winnerValue) =>
        Promise.race([lastHeld.posted, promise.then(() => lastHeld.issued)]).then(() => winnerValue),
      )
      .then((sendOutcome) => {
        let withheldOrUndefined = sendOutcome ?? withdrawnSendResult(withdrawRequested);
        detach();
        issuedYet = true;
        resolveIssued();
        if (withheldOrUndefined !== undefined) return withheldSendResult(withheldOrUndefined);
        this.reviveStreamForUserSend();
        return sendFn(content, opts);
      });
    let heldSend = {
      messageUuid: opts?.uuid,
      release,
      issuedYet: () => issuedYet,
      settledYet: () => withdrawn,
      withheldOnRelease: () =>
        findFirstDefined(mapped) !== undefined || withholdOnRelease(waitingGates, false) !== undefined,
      withdraw: () => {
        withdrawRequested = true;
        detach();
        resolveWithdrawn();
      },
      issued,
      posted,
    };
    this.lastHeld = {
      issued,
      posted: posted.then(
        () => {
          return;
        },
        () => {
          return;
        },
      ),
    };
    this.heldSends.add(heldSend);
    detach = () => {
      this.heldSends.delete(heldSend);
      this.tellWithholdableHeld();
    };
    sleep(0, this.lifetime.signal).then(() => this.tellWithholdableHeld());
    posted.then(
      () => this.leaveChain(heldSend, resolveIssued),
      () => this.leaveChain(heldSend, resolveIssued),
    );
    return winner.then((winnerValue) =>
      winnerValue === undefined ? posted : withheldSendResult(winnerValue),
    );
  }
  withdrawHeldSend(messageUuid) {
    let filtered = [...this.heldSends].filter(
      (heldSend) => heldSend.messageUuid === messageUuid && !heldSend.issuedYet(),
    );
    filtered.forEach((heldSend) => heldSend.withdraw());
    return filtered.length > 0;
  }
  heldSendUuids() {
    return [...this.heldSends].flatMap((heldSend) =>
      heldSend.messageUuid !== undefined && !heldSend.issuedYet() ? [heldSend.messageUuid] : [],
    );
  }
  leaveChain(heldSend, resolveIssued) {
    this.chainedSends--;
    this.heldSends.delete(heldSend);
    this.tellWithholdableHeld();
    resolveIssued();
  }
  hasWithholdableHeldSend() {
    return this.withholdableHeldSends().length > 0;
  }
  countWithholdableHeldSends() {
    return this.withholdableHeldSends().length;
  }
  cancelHeldSends() {
    let holds = this.withholdableHeldSends();
    holds.forEach((heldSend) => heldSend.release(false, false));
    return holds.length;
  }
  withholdableHeldSends() {
    return [...this.heldSends].filter(
      (heldSend) => !heldSend.issuedYet() && !heldSend.settledYet() && heldSend.withheldOnRelease(),
    );
  }
  tellWithholdableHeld() {
    let hasNow = this.hasWithholdableHeldSend();
    if (hasNow === this.withholdableHeldTold) return;
    this.withholdableHeldTold = hasNow;
    try {
      this.callbacks.onWithholdableHeldChanged?.(hasNow);
    } catch (error) {
      logError(
        Error(`[RemoteSessionManager] onWithholdableHeldChanged listener failed: ${errorMessage(error)}`),
      );
    }
  }
  async releaseHeldSends(
    timeoutMs = HELD_SENDS_RELEASE_TIMEOUT_MS,
    { exiting: isExiting = false, final: isFinal = false, keepWithheld = false } = {},
  ) {
    if (isExiting) this.exitFlushRequested = true;
    let filtered = [...this.heldSends].filter((heldSend) => !(keepWithheld && heldSend.withheldOnRelease()));
    filtered.forEach((heldSend) => heldSend.release(isExiting, isFinal));
    let mapped = filtered.map(() => ({
      kind: "waiting",
    }));
    await withDeadline(
      Promise.allSettled([
        ...filtered.map((heldSend, index) =>
          heldSend.posted.then(
            (outcome) => {
              mapped[index] = deliveryOutcome(outcome);
            },
            () => {
              mapped[index] = {
                kind: "unconfirmed",
              };
            },
          ),
        ),
        ...(this.withheldPromptInFlight ? [this.withheldPromptInFlight] : []),
      ]),
      timeoutMs,
    );
    filtered.forEach((heldSend, index) => {
      if (mapped[index]?.kind !== "waiting") return;
      if (heldSend.issuedYet())
        mapped[index] = {
          kind: "unconfirmed",
        };
      else if (isFinal) {
        heldSend.withdraw();
        mapped[index] = {
          kind: "unsent",
        };
      }
    });
    return {
      unsent: count(mapped, (outcome) => outcome.kind === "unsent"),
      refused: mapped.flatMap((outcome) => (outcome.kind === "refused" ? [outcome.reason] : [])),
      unconfirmed: count(mapped, (outcome) => outcome.kind === "unconfirmed"),
      stillHeld: count(mapped, (outcome) => outcome.kind === "waiting"),
    };
  }
  async sendBashCommand(command, opts) {
    logForDebugging(`[RemoteSessionManager] Sending bash_command to session ${this.config.sessionId}`);
    this.reviveStreamForUserSend();
    let result = await sendBashCommandToRemoteSession(this.config.sessionId, command, this.signedOpts(opts));
    if (!result.ok) {
      logForDebugging(
        `[RemoteSessionManager] Failed to send bash_command to session ${this.config.sessionId}: ${result.reason}`,
        {
          level: "error",
        },
      );
      logFeatureBad("remote_send_bash", "remote_send_bash_failed");
    } else logFeatureOk("remote_send_bash");
    return result;
  }
  reviveStreamForUserSend() {
    if (this.client?.reviveAfterExhaustion()) {
      this.callbacks.onReconnecting?.();
      return true;
    }
    return false;
  }
  sendResponse(response, kind, request, afterPost) {
    let client = this.client;
    if (!client) return;
    let startTime = performance.now();
    let postListener =
      afterPost === undefined
        ? undefined
        : (response_2) => {
            try {
              afterPost(response_2, Math.round(performance.now() - startTime));
            } catch (error) {
              logForDebugging(
                `[RemoteSessionManager] An answer's post listener threw; the answer's fate is unchanged: ${errorMessage(error)}`,
                {
                  level: "warn",
                },
              );
            }
            return response_2;
          };
    if (kind === null || this.config.keepUndeliveredResponses !== true) {
      let postPromise = client.sendControlResponse(response, undefined, timeoutOptionsForKind(kind));
      if (!(postListener === undefined)) postPromise.then(postListener);
      return;
    }
    let requestId = response.response.request_id;
    let kept = this.undeliveredResponses.get(requestId) ?? {
      response,
      kind,
      uuid: randomUUID(),
      failures: 0,
      inFlight: false,
      giveUpOnSettle: null,
      timer: null,
      told: false,
    };
    kept.response = response;
    if (request !== undefined) kept.request = request;
    this.undeliveredResponses.set(requestId, kept);
    this.postKeptResponse(client, kept, postListener);
  }
  postKeptResponse(client, kept, postListener) {
    kept.inFlight = true;
    let postPromise = client.sendControlResponse(kept.response, kept.uuid, timeoutOptionsForKind(kept.kind));
    (postListener === undefined ? postPromise : postPromise.then(postListener)).then(
      (outcome) => this.settleResponsePost(kept, outcome),
      (error) => {
        logForDebugging(`[RemoteSessionManager] Posting an answer threw: ${errorMessage(error)}`, {
          level: "warn",
        });
        this.settleResponsePost(kept, {
          outcome: "failed",
          cause: "network",
        });
      },
    );
  }
  settleResponsePost(kept, outcome) {
    kept.inFlight = false;
    let requestId = kept.response.response.request_id;
    if (this.undeliveredResponses.get(requestId) !== kept) return;
    if (outcome.outcome === "accepted") {
      if (kept.giveUpOnSettle === "overtaken") {
        this.giveUp(kept, "overtaken");
        return;
      }
      this.dropKept(kept);
      if (kept.standIn) return;
      if (kept.failures > 0 || kept.giveUpOnSettle !== null)
        logFeatureSad("remote_control_response", "recovered");
      else logFeatureOk("remote_control_response");
      return;
    }
    if (kept.giveUpOnSettle !== null) {
      this.giveUp(kept, kept.giveUpOnSettle);
      return;
    }
    if (
      outcome.outcome === "session_inactive" ||
      (outcome.outcome === "failed" && outcome.cause === "http" && outcome.status === 404)
    ) {
      this.dropKept(kept);
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(requestId)} has no session to go to (${outcome.outcome === "failed" && outcome.cause === "http" ? `http ${outcome.status}` : "session not active"}); dropped`,
      );
      logFeatureSad("remote_control_response", "session_gone");
      return;
    }
    if (outcome.outcome === "failed" && outcome.cause === "closed") {
      if (!this.client?.isRevivable()) this.giveUp(kept);
      return;
    }
    if (
      outcome.outcome === "failed" &&
      outcome.cause === "http" &&
      outcome.status < 500 &&
      outcome.status !== 408 &&
      outcome.status !== 429
    ) {
      if (this.postRefusalStandIn(kept, outcome)) return;
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(requestId)} was refused by the service (http ${outcome.status}); not re-sending`,
        {
          level: "warn",
        },
      );
      this.giveUp(kept, "undelivered", "refused");
      return;
    }
    if (!this.client?.isConnected()) {
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(requestId)} did not reach the session while the stream is down; it goes again at reconnect`,
      );
      return;
    }
    kept.failures += 1;
    if (kept.failures > RESPONSE_RESEND_MAX_ATTEMPTS) {
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(requestId)} could not be delivered after ${kept.failures} attempts; giving up`,
        {
          level: "warn",
        },
      );
      this.giveUp(kept);
      return;
    }
    if (kept.failures === 1) logFeatureSad("remote_control_response", "resend");
    this.scheduleResponseResend(kept);
  }
  postRefusalStandIn(kept, outcome) {
    let client = this.client;
    let response = kept.response.response;
    if (
      kept.kind !== "tool" ||
      kept.standIn ||
      client === null ||
      response.subtype !== "success" ||
      outcome.status === 401 ||
      outcome.status === 403
    )
      return false;
    let byteLength = Buffer.byteLength(jsonStringify(response.response), "utf8");
    logForDebugging(
      `[RemoteSessionManager] Answer for ${printableExcerpt(response.request_id)} was refused by the service (http ${outcome.status}${outcome.tooLarge ? `, too large: this machine's configured limit is ${servedAnswerLimitBytes()} bytes, so the service's is lower` : ""}, ${byteLength} bytes); sending an error in its place`,
      {
        level: "warn",
      },
    );
    logFeatureSad("remote_control_response", outcome.tooLarge ? "refused_too_large" : "refused_stand_in");
    kept.response = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: response.request_id,
        response: {
          result: servedAnswerTooLargeText({
            answer: response.response,
            bytes: byteLength,
            status: outcome.status,
            tooLarge: outcome.tooLarge === true,
          }),
        },
      },
    };
    kept.uuid = randomUUID();
    kept.standIn = true;
    kept.failures = 0;
    noopGuard("out", kept.response);
    this.postKeptResponse(client, kept);
    return true;
  }
  dropKept(kept) {
    this.clearResendTimer(kept);
    this.undeliveredResponses.delete(kept.response.response.request_id);
  }
  giveUp(kept, giveUpReason = "undelivered", telemetryReason = giveUpReason) {
    let requestId = kept.response.response.request_id;
    if (kept.inFlight) {
      if (kept.giveUpOnSettle !== "overtaken") kept.giveUpOnSettle = giveUpReason;
      return;
    }
    this.dropKept(kept);
    if (kept.kind === "hook") addCappedToSet(this.hookGiveUpsTold, requestId);
    if (giveUpReason === "undelivered" && (kept.kind === "dialog" || kept.kind === "permission")) {
      this.seenControlResponseIds.delete(requestId);
      if (kept.kind === "permission") {
        if (kept.request !== undefined)
          setCapped(this.reinstatablePermissionRequests, requestId, kept.request);
      } else addCappedToSet(this.reinstatableDialogIds, requestId);
    }
    if (giveUpReason === "undelivered" && kept.kind === "hook" && telemetryReason !== "refused")
      addCappedToSet(this.undeliveredHookIds, requestId);
    logFeatureBad("remote_control_response", telemetryReason);
    if (kept.told) return;
    kept.told = true;
    this.callbacks.onResponseUndelivered?.(requestId, kept.kind, giveUpReason);
  }
  scheduleResponseResend(kept) {
    this.clearResendTimer(kept);
    let delayMs =
      RESPONSE_RESEND_DELAYS_MS[Math.min(kept.failures, RESPONSE_RESEND_MAX_ATTEMPTS) - 1] ?? 45000;
    kept.timer = setTimeout(this.resendOnTimer, delayMs, kept.response.response.request_id);
  }
  resendOnTimer = (requestId) => {
    let kept = this.undeliveredResponses.get(requestId);
    let client = this.client;
    if (!kept || !client) return;
    kept.timer = null;
    if (!kept.inFlight) {
      noopGuard("out", kept.response);
      this.postKeptResponse(client, kept);
    }
  };
  clearResendTimer(kept) {
    if (kept.timer !== null) {
      clearTimeout(kept.timer);
      kept.timer = null;
    }
  }
  resendUndeliveredResponses() {
    let client = this.client;
    if (!client) return;
    for (let undeliveredResponse of this.undeliveredResponses.values()) {
      this.clearResendTimer(undeliveredResponse);
      if (!undeliveredResponse.inFlight) {
        noopGuard("out", undeliveredResponse.response);
        this.postKeptResponse(client, undeliveredResponse);
      }
    }
  }
  giveUpUndeliveredResponses() {
    for (let undeliveredResponse of [...this.undeliveredResponses.values()]) this.giveUp(undeliveredResponse);
  }
  giveUpKeptServedResults() {
    for (let undeliveredResponse of [...this.undeliveredResponses.values()])
      if (undeliveredResponse.kind === "tool") {
        undeliveredResponse.inFlight = false;
        this.giveUp(undeliveredResponse, undeliveredResponse.giveUpOnSettle ?? "undelivered");
      }
  }
  dropUndeliveredResponses() {
    for (let undeliveredResponse of [...this.undeliveredResponses.values()]) {
      if (undeliveredResponse.giveUpOnSettle === "overtaken") {
        undeliveredResponse.inFlight = false;
        this.giveUp(undeliveredResponse, "overtaken");
        continue;
      }
      this.dropKept(undeliveredResponse);
      logFeatureSad("remote_control_response", "session_gone");
    }
  }
  respondToPermissionRequest(requestId, answer) {
    let pending = this.pendingPermissionRequests.get(requestId);
    if (!pending) {
      logError(Error(`[RemoteSessionManager] No pending permission request with ID: ${requestId}`));
      logFeatureBad("remote_permission_respond", "remote_permission_respond_no_pending");
      return;
    }
    this.retirePermissionRequest(requestId);
    this.recordSeenControlResponseId(requestId);
    this.reviveStreamForUserSend();
    let nameRepoTrust =
      this.config.nameRepositoryTrustAnswers === true && isConfirmRepositoryTrustTool(pending.tool_name);
    let alwaysNameTool = false;
    let pinComputerFolder =
      this.config.pinComputerFolderAllow?.() === true && isRequestComputerFolderTool(pending.tool_name);
    let effectiveAnswer =
      (nameRepoTrust || pinComputerFolder) && answer.behavior === "allow"
        ? {
            behavior: "allow",
            updatedInput: pending.input,
            ...(answer.toolUseID !== undefined && {
              toolUseID: answer.toolUseID,
            }),
          }
        : answer;
    let controlResponse = buildControlResponse(
      requestId,
      effectiveAnswer,
      this.config.nameToolOnPermissionAllow === true || nameRepoTrust || alwaysNameTool
        ? pending.tool_name
        : undefined,
      nameRepoTrust && answer.behavior === "deny" && answer.decisionClassification === "user_reject",
    );
    logForDebugging(`[RemoteSessionManager] Sending permission response: ${answer.behavior}`);
    noopGuard("out", controlResponse);
    this.sendResponse(controlResponse, "permission", pending);
    logFeatureOk("remote_permission_respond");
  }
  respondToUserDialogRequest(requestId, answer) {
    if (!this.pendingDialogRequests.delete(requestId)) {
      logError(Error(`[RemoteSessionManager] No pending user dialog request with ID: ${requestId}`));
      logFeatureBad("remote_dialog_respond", "remote_dialog_respond_no_pending");
      return;
    }
    this.recordSeenControlResponseId(requestId);
    this.reviveStreamForUserSend();
    let controlResponse = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        response: answer,
      },
    };
    logForDebugging(`[RemoteSessionManager] Sending user dialog response: ${answer.behavior}`);
    noopGuard("out", controlResponse);
    this.sendResponse(controlResponse, "dialog");
    logFeatureOk("remote_dialog_respond");
  }
  releaseForwardedHook(requestId) {
    this.pendingForwardedHooks.delete(requestId);
    if (this.settledForwardedHookIds.has(requestId)) addCappedToSet(this.hookGiveUpsTold, requestId);
  }
  respondToForwardedHook(requestId, response) {
    if (!this.pendingForwardedHooks.delete(requestId)) {
      logForDebugging(
        `[RemoteSessionManager] Forwarded hook request ${printableExcerpt(requestId)} is no longer pending \u2014 answer not sent`,
      );
      return false;
    }
    if (!this.client) return false;
    this.recordSeenControlResponseId(requestId);
    this.recordSettledForwardedHookId(requestId);
    this.reviveStreamForUserSend();
    let controlResponse = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        response,
      },
    };
    noopGuard("out", controlResponse);
    this.sendResponse(controlResponse, "hook");
    return true;
  }
  respondToServedChannelRequest(requestId, result, afterPost) {
    let pending = this.pendingServedRequests.get(requestId);
    if (!pending) {
      logForDebugging(
        `[RemoteSessionManager] served request ${printableExcerpt(requestId)} is no longer pending \u2014 result not sent`,
      );
      return false;
    }
    this.pendingServedRequests.delete(requestId);
    if (!this.client) return false;
    this.recordSeenControlResponseId(requestId);
    addCappedToSet(this.settledServedRequestIds, requestId);
    this.reviveStreamForUserSend();
    let controlResponse = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        response: capToolResultSize(result),
      },
    };
    noopGuard("out", controlResponse);
    this.sendResponse(
      controlResponse,
      pending.subtype === "remote_tools_probe" ? null : "tool",
      undefined,
      afterPost,
    );
    return true;
  }
  releaseServedChannelRequest(requestId) {
    this.pendingServedRequests.delete(requestId);
  }
  countServedToolCallsInHand() {
    return count([...this.pendingServedRequests.values()], ({ subtype }) => subtype === "remote_tool_call");
  }
  retireServedRequest(requestId, cause) {
    let pending = this.pendingServedRequests.get(requestId);
    if (!pending) return false;
    this.pendingServedRequests.delete(requestId);
    logForDebugging(
      `[RemoteSessionManager] served request ${printableExcerpt(requestId)} ${cause === "worker" ? "cancelled by the worker" : "dropped with the stream"}`,
    );
    pending.abort.abort();
    this.callbacks.onServedChannelRequestCancelled?.(requestId, cause);
    return true;
  }
  isConnected() {
    return this.client?.isConnected() ?? false;
  }
  noteWorkerLive() {
    if (this.workerSeenThisConnection) return;
    this.workerSeenThisConnection = true;
    this.callbacks.onWorkerLive?.();
  }
  markServing(serving) {
    this.serving = serving;
  }
  workerLive() {
    return this.isConnected() && this.workerSeenThisConnection;
  }
  sendsInFlight() {
    return (
      this.client?.sendsInFlight() ?? {
        count: 0,
        settled: Promise.resolve(),
      }
    );
  }
  flushSends(waitForIdle) {
    return this.client?.flushSends(waitForIdle) ?? Promise.resolve();
  }
  cancelSession() {
    logForDebugging("[RemoteSessionManager] Sending interrupt signal");
    this.firstSendReleased = true;
    this.reviveStreamForUserSend();
    let sendInterrupt = () => {
      noopGuard("out", {
        kind: "control_request",
        subtype: "interrupt",
      });
      this.client?.sendControlRequest({
        subtype: "interrupt",
      });
    };
    if (this.heldSends.size === 0) {
      sendInterrupt();
      return;
    }
    let afterRelease = () => {
      if (this.pendingInterrupt === afterRelease) {
        this.pendingInterrupt = null;
        sendInterrupt();
      }
    };
    this.pendingInterrupt = afterRelease;
    this.releaseHeldSends().then(afterRelease, afterRelease);
  }
  sendControlRequest(request, options) {
    return this.postControlRequest(request, options).response;
  }
  postControlRequest(request, options) {
    let { promise, resolve } = Promise.withResolvers();
    let run = async () => {
      let posted = null;
      try {
        if (options?.signal?.aborted) throw new AbortError();
        if (!options?.background) this.reviveStreamForUserSend();
        noopGuard("out", {
          kind: "control_request",
          ...request,
        });
        posted = this.client?.postControlRequest(request, this.onControlRequestPostFailed) ?? null;
        if (posted === null) throw Error("[RemoteSessionManager] Cannot send: not connected");
      } finally {
        if (posted === null) resolve(CLOSED_SEND_RESULT);
      }
      posted.posted.then(resolve, () => resolve(CLOSED_SEND_RESULT));
      return this.awaitControlResponse(posted.requestId, request, options);
    };
    let response =
      options?.answerExpected === false ? run() : withOutcomeTelemetry("remote_control_rpc", run);
    return {
      posted: promise,
      response,
    };
  }
  awaitControlResponse(requestId, request, options) {
    if (request.subtype === "set_model") this.pendingModelSwitchIds.add(requestId);
    let timeoutMs = defaultHoldBudgetMs(request.subtype, options?.timeoutMs);
    let awaitWorkerStart = this.workerStarting ? options?.awaitWorkerStart : undefined;
    let budgetMs = awaitWorkerStart ? Math.max(HOLD_MAX_MS, timeoutMs) : timeoutMs;
    return new Promise((resolve, reject) => {
      let timer = setTimeout(this.onControlRequestTimeout, budgetMs, requestId, request.subtype, budgetMs);
      let signal = options?.signal;
      let onAbort = signal ? () => this.cancelControlRequest(requestId) : undefined;
      if (signal && onAbort)
        signal.addEventListener("abort", onAbort, {
          once: true,
        });
      this.pendingControlRequests.set(requestId, {
        resolve: (value) => resolve(value),
        reject,
        timer,
        timeoutMs,
        subtype: request.subtype,
        onProgress: options?.onProgress,
        removeAbortListener:
          signal && onAbort ? () => signal.removeEventListener("abort", onAbort) : undefined,
        ...(options?.background && {
          background: true,
        }),
        ...(options?.onEchoed && {
          onEchoed: options.onEchoed,
        }),
        ...(awaitWorkerStart && {
          awaitingWorker: awaitWorkerStart,
        }),
      });
      if (awaitWorkerStart) {
        logForDebugging(
          `[RemoteSessionManager] control_request ${requestId} (${request.subtype}) waits for the worker; its ${timeoutMs / 1000}s limit starts when that wait ends`,
        );
        this.tellAwaitingWorker(awaitWorkerStart, true);
      }
    });
  }
  workerSendsNow() {
    return this.sendsNow;
  }
  workerMovesBash() {
    return this.movesBash === true;
  }
  serviceTimeMs() {
    return this.client?.serviceTimeMs();
  }
  hasPostedMessage() {
    return this.sentAMessage;
  }
  isOnFirstConnection() {
    return this.connections === 1;
  }
  beginWorkerStart() {
    this.workerStarting = true;
  }
  endWorkerStart() {
    if (!this.workerStarting) return;
    this.workerStarting = false;
    let waiting = [];
    for (let [requestId, pending] of this.pendingControlRequests) {
      if (pending.awaitingWorker === undefined) continue;
      clearTimeout(pending.timer);
      let timer = setTimeout(
        this.onControlRequestTimeout,
        pending.timeoutMs,
        requestId,
        pending.subtype,
        pending.timeoutMs,
      );
      this.pendingControlRequests.set(requestId, {
        ...pending,
        timer,
        awaitingWorker: undefined,
      });
      waiting.push(pending.awaitingWorker);
    }
    logForDebugging(
      `[RemoteSessionManager] The wait for the worker ended; ${waiting.length} waiting control request(s) start their own limit`,
    );
    for (let awaitingWorker of waiting) this.tellAwaitingWorker(awaitingWorker, false);
  }
  tellAwaitingWorker(awaitingWorker, waiting) {
    try {
      awaitingWorker.onChange(waiting);
    } catch (error) {
      logError(error);
    }
  }
  onControlRequestPostFailed = (requestId) => {
    this.pendingModelSwitchIds.delete(requestId);
    let pending = this.pendingControlRequests.get(requestId);
    if (!pending) return;
    this.pendingControlRequests.delete(requestId);
    clearTimeout(pending.timer);
    pending.removeAbortListener?.();
    logForDebugging(
      `[RemoteSessionManager] control_request ${requestId} (${pending.subtype}) was not delivered \u2014 failing it`,
      {
        level: "warn",
      },
    );
    pending.reject(new ControlRequestNotDeliveredError(pending.subtype));
  };
  onControlRequestTimeout = (requestId, subtype, timeoutMs) => {
    this.pendingModelSwitchIds.delete(requestId);
    let pending = this.pendingControlRequests.get(requestId);
    if (!pending) return;
    this.pendingControlRequests.delete(requestId);
    pending.removeAbortListener?.();
    if (pending.awaitingWorker !== undefined) this.endWorkerStart();
    pending.reject(new ControlRequestTimeoutError(subtype, timeoutMs));
  };
  cancelControlRequest(requestId) {
    let pending = this.pendingControlRequests.get(requestId);
    if (!pending) return;
    if (!pending.background) this.reviveStreamForUserSend();
    this.pendingControlRequests.delete(requestId);
    this.pendingModelSwitchIds.delete(requestId);
    clearTimeout(pending.timer);
    logForDebugging(`[RemoteSessionManager] Cancelling control request ${requestId} (${pending.subtype})`);
    noopGuard("out", {
      kind: "control_cancel_request",
      requestId,
    });
    this.client?.sendControlCancelRequest(requestId);
    pending.reject(new AbortError());
  }
  getSessionId() {
    return this.config.sessionId;
  }
  disconnect() {
    logForDebugging("[RemoteSessionManager] Disconnecting");
    let withheldInitialPrompt = this.config.withheldInitialPrompt;
    if (
      withheldInitialPrompt !== undefined &&
      this.withheldPromptInFlight !== null &&
      !this.firstSendReleased
    )
      withheldInitialPrompt.sent = false;
    this.lifetime.abort();
    this.pendingInterrupt?.();
    this.client?.close();
    this.client = null;
    for (let undeliveredResponse of [...this.undeliveredResponses.values()]) {
      this.clearResendTimer(undeliveredResponse);
      if (undeliveredResponse.giveUpOnSettle !== null) {
        undeliveredResponse.inFlight = false;
        this.giveUp(undeliveredResponse, undeliveredResponse.giveUpOnSettle);
      }
    }
    this.undeliveredResponses.clear();
    this.undeliveredHookIds.clear();
    this.hookGiveUpsTold.clear();
    this.pendingPermissionRequests.clear();
    this.pendingDialogRequests.clear();
    for (let pendingForwardedHook of this.pendingForwardedHooks)
      this.callbacks.onForwardedHookCancelled?.(pendingForwardedHook, "disconnected");
    this.pendingForwardedHooks.clear();
    for (let key of [...this.pendingServedRequests.keys()]) this.retireServedRequest(key, "disconnected");
    this.workerSeenThisConnection = false;
    this.workerStarting = false;
    for (let pendingControlRequest of this.pendingControlRequests.values()) {
      clearTimeout(pendingControlRequest.timer);
      pendingControlRequest.removeAbortListener?.();
      pendingControlRequest.reject(Error("[RemoteSessionManager] Disconnected"));
    }
    this.pendingControlRequests.clear();
    this.pendingModelSwitchIds.clear();
  }
  reconnect() {
    logForDebugging("[RemoteSessionManager] Reconnecting SSE stream");
    this.client?.reconnect();
  }
  reconnectAfterSuspend() {
    this.client?.reconnectAfterSuspend();
  }
}
//@ chunk-08945j39.js:75642-75789 placement
function isDeviceHookRequest(request) {
  return (
    typeof request.callback_id === "string" &&
    (typeof request.issued_at === "number" ||
      typeof request.deadline_ms === "number" ||
      parseDeviceHookId(request.callback_id) !== null)
  );
}
//@ chunk-08945j39.js:75789-75835 placement
function isServedChannelRequest(request) {
  return REMOTE_TOOLS_LOG_EVENTS.includes(request.subtype);
}
//@ chunk-08945j39.js:75835-75886 placement
function timeoutOptionsForKind(kind) {
  return kind === "tool"
    ? {
        timeoutMs: TOOL_CONTROL_REQUEST_TIMEOUT_MS,
      }
    : {};
}
//@ chunk-08945j39.js:75886-76097 placement
function capToolResultSize(result) {
  let bytes = Buffer.byteLength(jsonStringify(result), "utf8");
  let limitBytes = servedAnswerLimitBytes();
  if (bytes <= limitBytes) return result;
  return {
    result: {
      content: [
        {
          type: "text",
          text: `(the result was too large to return: ${bytes} bytes, over the ${limitBytes}-byte limit)`,
        },
      ],
      isError: true,
    },
  };
}
//@ chunk-08945j39.js:76097-76307 placement
function runSendGate(gate, input) {
  let onError = (error) => {
    logForDebugging(`[RemoteSessionManager] send gate failed, message goes anyway: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  };
  try {
    return gate(input).then((result) => (isStoppedSendResult(result) ? result : undefined), onError);
  } catch (error) {
    return Promise.resolve(onError(error));
  }
}
//@ chunk-08945j39.js:76307-76398 placement
function isStoppedSendResult(sendResult) {
  return (
    typeof sendResult === "object" &&
    sendResult !== null &&
    sendResult.go === false &&
    typeof sendResult.reason === "string"
  );
}
//@ chunk-08945j39.js:76398-76444 placement
function findFirstDefined(values) {
  return values.find((value) => value !== undefined);
}
//@ chunk-08945j39.js:76444-76501 placement
function withheldSendResult(result) {
  return {
    ok: false,
    reason: result.reason,
    withheld: true,
  };
}
//@ chunk-08945j39.js:76501-76834 placement
/**
 * 把发送结果映射为投递结果：sent、unsent、refused 或 unconfirmed。
 */
function deliveryOutcome(result) {
  if (result.ok)
    return {
      kind: "sent",
    };
  switch (sendFailureKind(result)) {
    case "withheld":
      return result.reason === CANCELLED || result.reason === WITHDRAWN
        ? {
            kind: "unsent",
          }
        : {
            kind: "refused",
            reason: result.reason,
          };
    case "http_4xx":
    case "http_429":
    case "not_first_party":
      return {
        kind: "refused",
        reason: result.reason,
      };
    case "server":
    case "timeout":
    case "network":
    case "unknown":
      return {
        kind: "unconfirmed",
      };
  }
}
//@ chunk-08945j39.js:76834-76884 placement
function withdrawnSendResult(shouldWithdraw) {
  return shouldWithdraw
    ? {
        go: false,
        reason: WITHDRAWN,
      }
    : undefined;
}
//@ chunk-08945j39.js:76884-77006 placement
function withholdOnRelease(hooks, allowAwaitExit) {
  return [...hooks].some(
    ({ onRelease, onExit }) => onRelease === "withhold" && !(allowAwaitExit && onExit === "await"),
  )
    ? {
        go: false,
        reason: CANCELLED,
      }
    : undefined;
}
//@ chunk-08945j39.js:77006-77026 placement
/**
 * 远程历史事件分页条数：fetchLatestEvents/fetchOlderEvents 默认 100 条，historyPrefetch 首页用 500 条，服务端 400 时回落到 100。
 */
var DEFAULT_EVENT_PAGE_SIZE = 100;
var PREFETCH_EVENT_PAGE_SIZE = 500;
//@ chunk-08945j39.js:77026-77154 placement
/**
 * 解析事件的 sequence_num 为整数（缺失或无效时为 undefined）。
 */
function parseSequenceNum(frame) {
  let sequenceNum = frame?.sequence_num === undefined ? undefined : parseInt(String(frame.sequence_num), 10);
  return sequenceNum !== undefined && !isNaN(sequenceNum) ? sequenceNum : undefined;
}
//@ chunk-08945j39.js:77154-77179 placement
/**
 * 导出类 `UntrustedDeviceTokenError`：继承 `Error`。
 */
class UntrustedDeviceTokenError extends Error {}
//@ chunk-08945j39.js:77179-77211 placement
var X_TRUSTED_DEVICE_TOKEN = "X-Trusted-Device-Token";
//@ chunk-08945j39.js:77211-77499 placement
/**
 * 构造远程会话 API 请求配置：会话 URL 与请求头；需要时附带以续期设备令牌重建请求头的函数。
 */
async function getSessionRequestConfig(sessionId, oauthProfile, { recoverDeviceProof = false } = {}) {
  let { accessToken, profile } = await prepareApiRequest(oauthProfile);
  let requestConfig = {
    sessionUrl: `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}`,
    headers: await getSessionRequestHeaders(accessToken, profile),
  };
  if (!recoverDeviceProof) return requestConfig;
  return {
    ...requestConfig,
    headersForRenewedDeviceToken: async (deviceToken) => ({
      ...getOAuthRequestHeaders((await prepareApiRequest(oauthProfile)).accessToken),
      [X_TRUSTED_DEVICE_TOKEN]: deviceToken,
    }),
  };
}
//@ chunk-08945j39.js:77499-77645 placement
function fetchSessionEvents(sessionUrl, headers, params, maxContentLength) {
  return axios_default
    .get(`${sessionUrl}/events`, {
      headers,
      params,
      timeout: 15000,
      validateStatus: () => true,
      maxContentLength: maxContentLength ?? -1,
    })
    .catch(() => null);
}
//@ chunk-08945j39.js:77645-78703 placement
async function renewDeviceTokenAndRetry(ctx, params, label, maxContentLength) {
  let sessionEvents = await fetchSessionEvents(ctx.sessionUrl, ctx.headers, params, maxContentLength);
  let headersForRenewedDeviceToken = ctx.headersForRenewedDeviceToken;
  if (sessionEvents?.status === 403 && headersForRenewedDeviceToken !== undefined) {
    let renewalFailed = false;
    let retriedResponse = await resendAfterUntrustedDevice(
      sessionEvents,
      ctx.headers[X_TRUSTED_DEVICE_TOKEN],
      async (staleToken) => {
        let retryResponse = await headersForRenewedDeviceToken(staleToken).then(
          (headers) => fetchSessionEvents(ctx.sessionUrl, headers, params, maxContentLength),
          () => null,
        );
        if (retryResponse === null) {
          renewalFailed = true;
          throw Error("no answer");
        }
        return retryResponse;
      },
      "cloud_session",
    );
    if (renewalFailed) {
      logForDebugging(`[${label}] no answer after renewing the device token`);
      return null;
    }
    if (
      retriedResponse.status === 403 &&
      isTrustedDeviceGateEnabled() &&
      classifyElevatedAuthError(retriedResponse.data) === "untrusted_device"
    ) {
      logForDebugging(`[${label}] HTTP 403 untrusted_device`);
      throw new UntrustedDeviceTokenError(
        "the service does not accept a trusted-device token from this computer",
      );
    }
    sessionEvents = retriedResponse;
  }
  if (!sessionEvents || sessionEvents.status !== 200) {
    logForDebugging(`[${label}] HTTP ${sessionEvents?.status ?? "error"}`);
    return null;
  }
  if (sessionEvents.data === null || typeof sessionEvents.data !== "object") {
    logForDebugging(`[${label}] non-object 200 body`);
    return null;
  }
  let rows = Array.isArray(sessionEvents.data.data) ? sessionEvents.data.data : [];
  let events = [];
  for (let j = rows.length - 1; j >= 0; j--) {
    let row = rows[j];
    if (row?.payload)
      events.push({
        payload: row.payload,
        createdAt: row.created_at,
        source: row.source,
        sequenceNum: parseSequenceNum(row),
      });
  }
  let nextCursor = sessionEvents.data.next_cursor ?? null;
  return {
    events,
    firstId: nextCursor,
    hasMore: nextCursor !== null,
    droppedRows: rows.length - events.length,
    newestSequenceNum: parseSequenceNum(rows[0]),
  };
}
export {
  isTimeoutError,
  CONTROL_REQUEST_SCHEMAS,
  DEFAULT_EVENT_PAGE_SIZE,
  renewDeviceTokenAndRetry,
  getSessionRequestConfig,
  RemoteSessionManager,
  CANCELLED,
  formatUndeliveredAnswerNotice,
  sendFailureMessage,
  isRelayableControlFrame,
  WITHDRAWN,
  UntrustedDeviceTokenError,
  printableExcerpt,
  PREFETCH_EVENT_PAGE_SIZE,
  parseSequenceNum,
  isToolNameDifferent,
  DIALOG_REQUEST_SUBTYPES,
  MAX_CACHED_PERMISSION_REQUESTS,
};

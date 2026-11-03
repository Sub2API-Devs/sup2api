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
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, looseObject, literal, record, unknown } from "../../vendor/zod/v4/classic/schemas.js";
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
import { isPlainObject } from "../utils/isPlainObject.js";
import { SETTINGS_CONTROL_SUBTYPES } from "../cli/transports/ccrClient.js";

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
var CONTROL_REQUEST_SCHEMAS = {
  can_use_tool: DoctorLazy(() =>
    u({
      request_id: string(),
      request: looseObject({
        subtype: literal("can_use_tool"),
        tool_name: string(),
        input: record(string(), unknown()),
        tool_use_id: string(),
      }),
    }),
  ),
  request_user_dialog: DoctorLazy(() =>
    u({
      request_id: string(),
      request: looseObject({
        subtype: literal("request_user_dialog"),
        dialog_kind: string(),
        payload: record(string(), unknown()),
      }),
    }),
  ),
};
//@ chunk-08945j39.js:35735-35802 placement
var controlResponseSuccessSchema = DoctorLazy(() =>
  u({
    subtype: literal("success"),
    response: u({
      toolName: string(),
    }),
  }),
);
//@ chunk-08945j39.js:35802-35866 placement
function getControlResponseToolName(e) {
  return controlResponseSuccessSchema().safeParse(e).data?.response.toolName;
}
//@ chunk-08945j39.js:35866-35925 placement
/**
 * 导出函数 `isToolNameDifferent`：参数 e, n，返回 typeof n === "string" && isDifferentString(tt(e), n)。
 */
function isToolNameDifferent(response, toolName) {
  return typeof toolName === "string" && isDifferentString(getControlResponseToolName(response), toolName);
}
//@ chunk-08945j39.js:35925-35977 placement
function isDeepEqualSafe(e, request) {
  try {
    return isDeepStrictEqual(e, request);
  } catch {
    return false;
  }
}
//@ chunk-08945j39.js:35977-36073 placement
function addCappedToSet(e, requestId) {
  e.add(requestId);
  if (e.size > MAX_TRACKED_REQUEST_IDS) {
    let s = e.values().next().value;
    if (s !== undefined) e.delete(s);
  }
}
//@ chunk-08945j39.js:36073-36177 placement
function setCapped(e, requestId, s, i = MAX_CACHED_PERMISSION_REQUESTS) {
  e.set(requestId, s);
  if (e.size > i) {
    let r = e.keys().next().value;
    if (r !== undefined) e.delete(r);
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
function sendFailureKind(e) {
  if (e.withheld) return "withheld";
  if (e.status === 429) return "http_429";
  if (e.status !== undefined) return "http_4xx";
  return e.cause ?? "unknown";
}
//@ chunk-08945j39.js:36552-36633 placement
function isRetriableSendFailure(e) {
  return e === "http_429" || e === "server" || e === "timeout" || e === "network";
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
function sendFailureMessage(e) {
  let n = sendFailureKind(e);
  return n === "timeout" || n === "network" ? SEND_FAILURE_MESSAGES[n] : undefined;
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
function formatUndeliveredAnswerNotice(e, n) {
  switch (e) {
    case "permission":
      return "A permission answer you gave could not be delivered to the cloud session, which may still be waiting for it. If the session looks stuck, interrupt it and retry.";
    case "dialog":
      return "A dialog answer you gave could not be delivered to the cloud session, which may still be waiting for it. If the session looks stuck, interrupt it and retry.";
    case "hook":
      return n === "overtaken"
        ? "A hook's decision from this machine did not reach the cloud session before it stopped waiting for it: if the hook's deadline passed the tool call it was judging may have run without it; if the turn was interrupted, nothing ran."
        : "A hook's decision from this machine could not be delivered to the cloud session, which waits for it until the hook's deadline and then proceeds without it. Interrupt the session if that tool call must not run.";
    case "tool":
      return n === "overtaken"
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
  constructor(e, callbacks) {
    this.config = e;
    this.callbacks = callbacks;
    this.sendsNow = e.seedWorkerSendsNow;
    this.movesBash = e.seedWorkerMovesBash;
    if (e.homeSeed !== undefined && e.homeSeedHoldsFirstSend !== false) this.gateSendsOnSettings(e.homeSeed);
    if (e.withheldInitialPrompt !== undefined) {
      let withheldInitialPrompt = e.withheldInitialPrompt;
      queueMicrotask(() => void this.sendWithheldInitialPrompt(withheldInitialPrompt));
    }
  }
  connect() {
    logForDebugging(`[RemoteSessionManager] Connecting to session ${this.config.sessionId}`);
    let callbacks = {
      onMessage: (n, s) => this.handleMessage(n, s),
      onConnected: (n) => {
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
        this.callbacks.onConnected?.(n);
        if (!this.seedRequestsArmed && !this.lifetime.signal.aborted) {
          this.seedRequestsArmed = true;
          let size = this.pendingPermissionRequests.size;
          let mapped = (this.config.seedSubagentRequests ?? []).map((S) =>
            safeEmit((h) => this.handleControlRequest(h, {}), S, "RemoteSessionManager, attach seed"),
          );
          if (mapped.length > 0 && !mapped.includes(true))
            logFeatureBad("remote_permission_seed_adoption", "handler_threw");
          else if (mapped.includes(false)) logFeatureSad("remote_permission_seed_adoption", "handler_threw");
          else if (mapped.length > 0) logFeatureOk("remote_permission_seed_adoption");
          let r = this.pendingPermissionRequests.size - size;
          if (r > 0)
            logEvent("tengu_remote_subagent_requests_adopted", {
              count: r,
              subagents_asking_at_a_turn_end: this.config.seedAskersPastATurn?.length ?? 0,
            });
        }
      },
      onClose: (n) => {
        logForDebugging("[RemoteSessionManager] Disconnected");
        if (this.client?.isRevivable()) this.giveUpUndeliveredResponses();
        else this.dropUndeliveredResponses();
        this.endWorkerStart();
        this.callbacks.onDisconnected?.(n);
      },
      onReconnecting: () => {
        this.workerSeenThisConnection = false;
        logForDebugging("[RemoteSessionManager] Reconnecting");
        this.callbacks.onReconnecting?.();
      },
      onStreamSilent: (n) => this.callbacks.onStreamSilent?.(n),
      onDeliveryUpdate: ({ eventId, status }) => {
        if (/PROCESS(ING|ED)$/i.test(status)) this.callbacks.onLineTaken?.(eventId);
      },
      onOwnRequestEchoed: (n, s) => {
        let i = this.pendingControlRequests.get(n);
        if (i?.onEchoed) {
          this.pendingControlRequests.set(n, {
            ...i,
            onEchoed: undefined,
          });
          i.onEchoed(s);
        }
      },
      onWorkerConnectionStatus: (n) => {
        logForDebugging(
          `[RemoteSessionManager] The service reports the worker ${n === "connected" || n === "disconnected" ? n : "in an unknown state"}`,
        );
        if (n === "connected") {
          this.noteWorkerLive();
          this.callbacks.onWorkerConnectionStatus?.(n);
        } else if (n === "disconnected") {
          if (this.workerSeenThisConnection) this.endWorkerStart();
          this.workerSeenThisConnection = false;
          this.callbacks.onWorkerGone?.();
          this.callbacks.onWorkerConnectionStatus?.(n);
        }
      },
      onSecurityTierRaised: () => {
        this.securityTierRaiseSeen = true;
      },
      onToolHostEnded: (n) => {
        logForDebugging(
          "[RemoteSessionManager] The service ended this session's connection to a computer serving its tools",
        );
        this.callbacks.onToolHostEnded?.(n);
      },
      ...{},
      onCatchUpTruncated: () => {
        logForDebugging("[RemoteSessionManager] Catch-up truncated");
        this.callbacks.onCatchUpTruncated?.();
      },
      onError: (n) => {
        logForDebugging(`[RemoteSessionManager] Stream error: ${n.message}`, {
          level: "error",
        });
        this.callbacks.onError?.(n);
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
  handleMessage(e, n = {}) {
    noopGuard("in", e, n);
    if (n.source === "worker" && n.replayed !== true) this.noteWorkerLive();
    if (n.source === "worker" && e.type === "system" && e.subtype === "init") {
      this.sendsNow = supportsSendNow(e);
      this.movesBash = supportsBackgroundTasksMovesBash(e);
    }
    if (e.type === "control_request") {
      this.handleControlRequest(e, n);
      return;
    }
    if (e.type === "control_cancel_request") {
      let { request_id: requestId } = e;
      this.reinstatablePermissionRequests.delete(requestId);
      this.reinstatableDialogIds.delete(requestId);
      let i = this.undeliveredResponses.get(requestId);
      if (i?.kind === "hook" || i?.kind === "tool") this.giveUp(i, "overtaken");
      else if (i) this.dropKept(i);
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
      let r = this.pendingPermissionRequests.get(requestId);
      if (!r) {
        logForDebugging(
          `[RemoteSessionManager] control_cancel_request for unknown request ${requestId} \u2014 nothing pending, ignoring`,
        );
        return;
      }
      logForDebugging(`[RemoteSessionManager] Permission request cancelled: ${requestId}`);
      this.retirePermissionRequest(requestId);
      this.callbacks.onPermissionCancelled?.(requestId, r.tool_use_id);
      return;
    }
    if (e.type === "system" && e.subtype === "control_request_progress") {
      if (this.pendingControlRequests.has(e.request_id)) this.endWorkerStart();
      let s = this.pendingControlRequests.get(e.request_id);
      if (!s) {
        logForDebugging(
          `[RemoteSessionManager] control_request_progress for unknown request ${e.request_id} \u2014 ignoring`,
        );
        return;
      }
      clearTimeout(s.timer);
      let timer = setTimeout(this.onControlRequestTimeout, s.timeoutMs, e.request_id, s.subtype, s.timeoutMs);
      this.pendingControlRequests.set(e.request_id, {
        ...s,
        timer,
      });
      s.onProgress?.(e);
      return;
    }
    if (e.type === "control_response") {
      let { request_id: requestId } = e.response;
      let i = this.config.ignoreErrorShapedDialogReplies === true && e.response.subtype === "error";
      let controlResponseToolName = getControlResponseToolName(e.response);
      let S = this.seenSuccessToolNames.get(requestId) ?? [];
      let h = this.pendingPermissionRequests.get(requestId);
      let v = h !== undefined && isDifferentString(controlResponseToolName, h.tool_name);
      if (i) addCappedToSet(this.errorShapedControlResponseIds, requestId);
      else if (controlResponseToolName !== undefined && S.length < MAX_TOOL_NAMES_PER_REQUEST && !v)
        setCapped(
          this.seenSuccessToolNames,
          requestId,
          [...S, controlResponseToolName],
          MAX_TRACKED_REQUEST_IDS,
        );
      else if (!v) this.recordSeenControlResponseId(requestId);
      let w = this.undeliveredResponses.get(requestId);
      if (w !== undefined && "uuid" in e && e.uuid === w.uuid && w.giveUpOnSettle !== "overtaken") {
        this.dropKept(w);
        if (w.failures > 0) logFeatureSad("remote_control_response", "recovered");
        else logFeatureOk("remote_control_response");
      }
      this.pendingModelSwitchIds.delete(requestId);
      let R = this.pendingControlRequests.get(requestId);
      if (R) {
        this.pendingControlRequests.delete(requestId);
        clearTimeout(R.timer);
        R.removeAbortListener?.();
        this.endWorkerStart();
        if (e.response.subtype === "success") R.resolve(e.response.response);
        else R.reject(controlResponseError(e.response));
      } else {
        let y = this.pendingPermissionRequests.get(requestId);
        if (y) {
          if (v) {
            logForDebugging(
              `[RemoteSessionManager] Permission response ${requestId} has mismatched toolName \u2014 worker will drop it, keeping prompt`,
            );
            return;
          }
          this.retirePermissionRequest(requestId);
          logForDebugging(
            `[RemoteSessionManager] Permission request ${requestId} answered elsewhere \u2014 dismissing`,
          );
          this.callbacks.onPermissionCancelled?.(requestId, y.tool_use_id);
        } else if (this.pendingDialogRequests.has(requestId)) {
          if (i)
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
            `[RemoteSessionManager] Ignoring a peer control_response (${e.response.subtype}) for forwarded hook request ${printableExcerpt(requestId)} \u2014 still answering it here`,
          );
        else if (!this.settledServedRequestIds.has(requestId))
          logForDebugging(
            `[RemoteSessionManager] Unmatched control_response ${requestId} (${e.response.subtype})${e.response.subtype === "error" ? `: ${e.response.error}` : ""}`,
          );
      }
      if (this.config.rearmRedeliveredPermissionRequests === true)
        this.rearmRedelivered(
          e.response.pending_permission_requests,
          "can_use_tool",
          this.pendingPermissionRequests,
        );
      this.rearmRedelivered(
        e.response.pending_user_dialog_requests,
        "request_user_dialog",
        this.pendingDialogRequests,
      );
      return;
    }
    if (
      this.config.keepOwnModelSwitchBreadcrumb !== true &&
      this.pendingModelSwitchIds.size > 0 &&
      e.type === "user" &&
      "isReplay" in e &&
      e.isReplay === true &&
      typeof e.message?.content === "string" &&
      e.message.content.startsWith(MODEL_SET_STDOUT_PREFIX)
    ) {
      let [s] = this.pendingModelSwitchIds;
      this.pendingModelSwitchIds.delete(s);
      logForDebugging("[RemoteSessionManager] Dropped own set_model breadcrumb echo");
      return;
    }
    if (e.type === "result") {
      if (
        this.sentAMessage ||
        this.config.homeSeedHoldsFirstSend !== false ||
        this.config.initialPromptUuid !== undefined
      )
        this.config.homeSeed?.afterFirstReply(this.lifetime.signal);
      let s = [...this.pendingPermissionRequests];
      let r =
        this.config.subagentRequestsOutliveTheTurn === true
          ? s.filter(([, S]) => !isSubagentToolRequest(S))
          : s;
      for (let [S, h] of r) {
        logForDebugging(
          `[RemoteSessionManager] Turn ended with permission request ${S} unresolved \u2014 dismissing`,
        );
        this.callbacks.onPermissionCancelled?.(S, h.tool_use_id);
        this.retirePermissionRequest(S);
        setCapped(this.reinstatablePermissionRequests, S, h);
      }
      if (s.length > 0 && n.replayed !== true) {
        let S = count(s, ([, h]) => isSubagentToolRequest(h));
        logEvent("tengu_remote_turn_ended_with_open_permission_requests", {
          from_main_thread: s.length - S,
          from_subagents: S,
          kept_open: s.length - r.length,
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
    this.callbacks.onMessage(e, n);
  }
  retirePermissionRequest(e) {
    this.pendingPermissionRequests.delete(e);
    this.retiredPermissionRequestIds.add(e);
  }
  rearmRedelivered(e, schemaKey, s) {
    if (!Array.isArray(e)) return;
    e.slice(0, MAX_CACHED_PERMISSION_REQUESTS).forEach((i) => {
      let controlRequest = parseControlRequest(i, schemaKey);
      if (controlRequest === null) return;
      let S = this.seenSuccessToolNames.get(controlRequest.request_id);
      let { request } = controlRequest;
      if (
        this.seenControlResponseIds.has(controlRequest.request_id) ||
        (schemaKey === "can_use_tool" && this.errorShapedControlResponseIds.has(controlRequest.request_id)) ||
        (S !== undefined &&
          !(request.subtype === "can_use_tool" && S.every((R) => isDifferentString(R, request.tool_name))))
      ) {
        logForDebugging(
          `[RemoteSessionManager] Redelivered ${schemaKey} ${printableExcerpt(controlRequest.request_id)} already answered \u2014 skipping`,
        );
        return;
      }
      let v = false;
      if (schemaKey === "can_use_tool" && this.retiredPermissionRequestIds.has(controlRequest.request_id)) {
        let R = this.reinstatablePermissionRequests.get(controlRequest.request_id);
        if (R === undefined) {
          logForDebugging(
            `[RemoteSessionManager] Redelivered can_use_tool ${printableExcerpt(controlRequest.request_id)} already retired here \u2014 skipping`,
          );
          return;
        }
        this.reinstatablePermissionRequests.delete(controlRequest.request_id);
        if (!isDeepEqualSafe(R, controlRequest.request)) {
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
        v = true;
      } else if (schemaKey === "request_user_dialog")
        v = this.reinstatableDialogIds.has(controlRequest.request_id);
      let w = s.has(controlRequest.request_id);
      this.handleControlRequest(
        controlRequest,
        {},
        {
          reinstated: v,
        },
      );
      if (!w && s.has(controlRequest.request_id)) {
        this.reinstatableDialogIds.delete(controlRequest.request_id);
        logFeatureOk(
          schemaKey === "can_use_tool" ? "remote_permission_redelivery" : "remote_dialog_redelivery",
        );
      }
    });
  }
  recordSeenControlResponseId(e) {
    addCappedToSet(this.seenControlResponseIds, e);
  }
  recordSettledForwardedHookId(e) {
    addCappedToSet(this.settledForwardedHookIds, e);
  }
  handleControlRequest(e, { ageMs, attestationStatus, modeStamp, replayed }, S) {
    let { request_id: requestId, request } = e;
    let w = {
      replayed,
      ageMs,
    };
    let subtype =
      typeof request === "object" && request !== null && Object.hasOwn(request, "subtype")
        ? request.subtype
        : undefined;
    let y = unexpectedValueFingerprint(subtype, FORWARDED_CONTROL_REQUESTS);
    if (y !== undefined) {
      let found = HOST_HANDLED_CONTROL_REQUESTS.find((k) => k === subtype);
      this.refuseControlRequest(
        requestId,
        found !== undefined
          ? `${found}, which another client answers,`
          : `a control request of a kind no client of this build handles (${y.length} characters, sha12 ${y.hash}${y.variantOfListed ? ", a variant of a listed kind" : ""})`,
        w,
      );
      if (found === undefined) this.callbacks.onControlRequestRefused?.(y);
      return;
    }
    if (typeof requestId !== "string") {
      this.refuseControlRequest(requestId, `${request.subtype} with an id that is not a string`, w);
      return;
    }
    if (request.subtype === "can_use_tool") {
      logForDebugging(`[RemoteSessionManager] Permission request for tool: ${request.tool_name}`);
      let b = this.pendingPermissionRequests.get(requestId);
      if (b !== undefined) {
        if (isDeepEqualSafe(b, request))
          logForDebugging(
            `[RemoteSessionManager] Duplicate permission request ${printableExcerpt(String(requestId))} \u2014 already pending, skipping`,
          );
        else {
          logFeatureBad("remote_permission_request", "redelivered_mismatch");
          logForDebugging(
            `[RemoteSessionManager] Permission request ${printableExcerpt(String(requestId))} redelivered with a different body (${printableExcerpt(String(request.tool_name))}) \u2014 keeping the one first shown (${printableExcerpt(b.tool_name)})`,
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
      let k = request;
      try {
        k = structuredClone(request);
      } catch {
        k = request;
      }
      this.pendingPermissionRequests.set(requestId, k);
      this.callbacks.onPermissionRequest(request, requestId, S, replayed === true);
      return;
    }
    if (request.subtype === "request_user_dialog") {
      if (this.pendingDialogRequests.has(requestId)) {
        logForDebugging(
          `[RemoteSessionManager] Duplicate user dialog request ${requestId} \u2014 already pending, skipping`,
        );
        return;
      }
      logForDebugging(`[RemoteSessionManager] User dialog request: ${request.dialog_kind}`);
      this.pendingDialogRequests.add(requestId);
      this.callbacks.onUserDialogRequest(request, requestId, S);
      return;
    }
    if (request.subtype === "hook_callback" && isDeviceHookRequest(request)) {
      let onForwardedHookCallback = this.callbacks.onForwardedHookCallback;
      if (!onForwardedHookCallback) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook_callback ${printableExcerpt(requestId)} \u2014 not serving device hooks here, leaving it unanswered`,
        );
        return;
      }
      if (requestId.length > MAX_CONTROL_ID_LENGTH || request.callback_id.length > MAX_CONTROL_ID_LENGTH) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook_callback ${printableExcerpt(requestId)} \u2014 an id longer than ${MAX_CONTROL_ID_LENGTH} characters, leaving it unanswered`,
        );
        return;
      }
      let k = {
        requestId,
        callbackId: request.callback_id,
        input: request.input,
        ...(typeof request.issued_at === "number" && {
          issuedAt: request.issued_at,
        }),
        ...(typeof request.deadline_ms === "number" && {
          deadlineMs: request.deadline_ms,
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
        onUndeliveredHookReplayed(k);
        return;
      }
      if (this.settledForwardedHookIds.has(requestId) || this.pendingForwardedHooks.has(requestId)) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook_callback ${printableExcerpt(requestId)} already answered or in hand \u2014 skipping`,
        );
        return;
      }
      this.pendingForwardedHooks.add(requestId);
      onForwardedHookCallback(k);
      return;
    }
    if (isServedChannelRequest(request)) {
      let onServedChannelRequest = this.callbacks.onServedChannelRequest;
      if (!onServedChannelRequest) {
        logForDebugging(
          `[RemoteSessionManager] ${request.subtype} ${printableExcerpt(requestId)} \u2014 not serving tools here, leaving it unanswered`,
        );
        return;
      }
      if (requestId.length > MAX_CONTROL_ID_LENGTH) {
        logForDebugging(
          `[RemoteSessionManager] ${request.subtype} ${printableExcerpt(requestId)} \u2014 an id longer than ${MAX_CONTROL_ID_LENGTH} characters, leaving it unanswered`,
        );
        return;
      }
      if (this.settledServedRequestIds.has(requestId) || this.pendingServedRequests.has(requestId)) {
        logForDebugging(
          `[RemoteSessionManager] ${request.subtype} ${printableExcerpt(requestId)} already answered or in hand \u2014 skipping`,
        );
        return;
      }
      let abortController = new AbortController();
      this.pendingServedRequests.set(requestId, {
        abort: abortController,
        subtype: request.subtype,
      });
      onServedChannelRequest({
        requestId,
        subtype: request.subtype,
        request,
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
    this.refuseControlRequest(requestId, `${request.subtype} in a shape this client has no handler for`, w);
  }
  refuseControlRequest(e, n, { replayed, ageMs }) {
    let r =
      replayed === true &&
      (ageMs === undefined ||
        ageMs > REPLAYED_REFUSAL_MAX_AGE_MS ||
        this.replayedRefusalsAnswered >= MAX_REPLAYED_REFUSALS);
    if (this.config.controlOnly === true || typeof e !== "string" || r) {
      logForDebugging(
        `[RemoteSessionManager] ${n}${typeof e === "string" ? ` ${printableExcerpt(e)}` : ""} \u2014 leaving it unanswered`,
      );
      return;
    }
    if (replayed === true) this.replayedRefusalsAnswered++;
    logForDebugging(
      `[RemoteSessionManager] ${n} ${printableExcerpt(e)} \u2014 answering that it is not supported`,
    );
    this.sendResponse(
      {
        type: "control_response",
        response: {
          subtype: "error",
          request_id: e,
          error: UNSUPPORTED_CONTROL_SUBTYPE_TEXT,
        },
      },
      null,
    );
  }
  signedOpts(e) {
    return {
      ...(e ?? {}),
      ...(this.config.eventSigner && {
        eventSigner: this.config.eventSigner,
      }),
    };
  }
  async sendMessage(e, n, s) {
    return this.send(
      e,
      n,
      (i, r) => sendEventToRemoteSession(this.config.sessionId, i, this.signedOpts(r)),
      false,
      s,
    );
  }
  async sendMessageVia(e, n, s) {
    return this.send(e, n, s, true);
  }
  async send(e, n, s, i, r) {
    logForDebugging(`[RemoteSessionManager] Sending message to session ${this.config.sessionId}`);
    this.reviveStreamForUserSend();
    noopGuard("out", {
      kind: "sendMessage",
      content: e,
      opts: n,
    });
    let S = this.currentSendGates();
    let h = !i && S.length === 0 && this.chainedSends === 0;
    let v = null;
    let w = s;
    let R;
    try {
      R = await (h ? w(e, n) : this.sendBehindGates(S, e, n, w, r));
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
    if (!R.ok && R.withheld) {
      logForDebugging(`[RemoteSessionManager] Message withheld by a send gate: ${R.reason}`);
      logFeatureSad(
        "remote_send_message",
        R.reason === CANCELLED
          ? "remote_send_message_cancelled"
          : R.reason === WITHDRAWN
            ? "remote_send_message_withdrawn"
            : "remote_send_message_withheld",
      );
    } else if (!R.ok) {
      logForDebugging(
        `[RemoteSessionManager] Failed to send message to session ${this.config.sessionId}: ${R.reason}`,
        {
          level: "error",
        },
      );
      logFeatureBad("remote_send_message", "remote_send_message_failed");
    } else {
      logFeatureOk("remote_send_message");
      this.sentAMessage = true;
    }
    return R;
  }
  addSendGate(gate, n = {}) {
    let s = {
      gate,
      onRelease: n.onRelease ?? "send",
      onExit: n.onExit ?? "as_release",
    };
    this.sendGates.add(s);
    return () => {
      this.sendGates.delete(s);
    };
  }
  gateSendsOnSettings(e) {
    let n = () => {};
    let s = holdFirstSendForSettings(e, {
      retire: () => n(),
      noticeAfterMs: this.config.homeSeedWaitNoticeMs,
      typedAheadGraceMs: this.config.homeSeedTypedAheadGraceMs,
    });
    if (s === null) return;
    n = this.addSendGate(
      (i) => {
        i.released.then(() => {
          if (!i.exiting()) this.firstSendReleased = true;
        });
        return s(i);
      },
      {
        onRelease: "withhold",
        onExit: "await",
      },
    );
  }
  async sendWithheldInitialPrompt(e) {
    if (e.sent) return;
    e.sent = true;
    let now = Date.now();
    let withheldPromptBackoffMs = this.config.withheldPromptBackoffMs ?? WITHHELD_PROMPT_BACKOFF_MS;
    let i = 0;
    let r;
    let S = async (k, P) => {
      i += 1;
      r ??= Date.now();
      let q = await sendEventToRemoteSession(this.config.sessionId, k, this.signedOpts(P));
      if (
        q.ok ||
        i >= MAX_WITHHELD_PROMPT_ATTEMPTS ||
        !isRetriableSendFailure(sendFailureKind(q)) ||
        this.firstSendReleased ||
        Date.now() - r > (this.config.withheldPromptRetryWindowMs ?? WITHHELD_PROMPT_RETRY_WINDOW_MS)
      )
        return q;
      await sleep(withheldPromptBackoffMs * i, this.lifetime.signal);
      if (this.exitFlushRequested && !this.firstSendReleased) {
        i += 1;
        return sendEventToRemoteSession(this.config.sessionId, k, this.signedOpts(P));
      }
      return this.lifetime.signal.aborted || this.firstSendReleased ? q : S(k, P);
    };
    let h = this.send(
      e.content,
      {
        uuid: e.uuid,
      },
      S,
      true,
      0,
    ).catch((error) => ({
      ok: false,
      reason: errorMessage(error),
    }));
    this.withheldPromptInFlight = h.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    let v = await h;
    this.withheldPromptInFlight = null;
    let w = this.lifetime.signal.aborted && !v.ok;
    logEvent("tengu_home_seed_prompt_resequenced", {
      success: v.ok,
      withheld_for: fromEnum(
        e.followsPermissionMode
          ? "signed_send"
          : e.heldOnlyForToolsCheck
            ? "tools_check"
            : this.config.homeSeed !== undefined
              ? "home_seed"
              : "other",
      ),
      attempts: i,
      reason: fromEnum(v.ok ? "ok" : w ? "aborted" : sendFailureKind(v)),
      duration_ms: Date.now() - now,
    });
    if (v.ok) {
      e.sent = true;
      this.callbacks.onWithheldPromptSent?.();
    }
    if (w || v.ok) return;
    let R = sendFailureKind(v);
    let y = R === "timeout" || R === "network" || R === "unknown";
    let b;
    switch (R) {
      case "withheld":
      case "not_first_party":
        b = v.reason;
        break;
      case "http_429":
        b = "the service is busy";
        break;
      case "http_4xx":
        b = v.advice ?? `the service refused it, HTTP ${String(v.status)}`;
        break;
      case "server":
        b = "the service had an error";
        break;
      case "timeout":
      case "network":
        b = SEND_FAILURE_MESSAGES[R];
        break;
      case "unknown":
        b = v.advice ?? "";
        break;
    }
    if (this.callbacks.onWithheldPromptFailed) this.callbacks.onWithheldPromptFailed(b, y);
    else {
      let k = b === "" ? "" : `: ${b.replace(/\.+$/, "")}`;
      this.config.homeSeed?.status.publish(
        y
          ? `Your first message may not have reached the cloud session${k}. If Claude doesn't respond to it soon, send it again`
          : `Couldn't send your first message${k}`,
        "warning",
      );
    }
  }
  currentSendGates() {
    return [...[], ...this.sendGates];
  }
  async sendBehindGates(e, n, s, i, r) {
    this.chainedSends++;
    let S = false;
    let h = false;
    let v = false;
    let w = () => {};
    let promise = new Promise((resolve) => {
      w = resolve;
    });
    let release = (M, O) => {
      S = M;
      h = O;
      v = true;
      w();
      this.tellWithholdableHeld();
    };
    let b = () => {};
    let promise_2 = new Promise((resolve) => {
      b = resolve;
    });
    let P = () => {};
    let decided = new Promise((resolve) => {
      P = resolve;
    });
    let fe = {
      messageUuid: s?.uuid,
      ...(r !== undefined && {
        submittedAtMs: r,
      }),
      released: promise,
      withdrawn: promise_2,
      exiting: () => S,
      final: () => h,
      decided,
    };
    let E = () => {};
    let issued = new Promise((resolve) => {
      E = resolve;
    });
    let lastHeld = this.lastHeld;
    let j = () => {};
    let ne = false;
    let G = false;
    let mapped = e.map(() => {
      return;
    });
    let X = new Set(e);
    let mapped_2 = e.map((M, O) =>
      runSendGate(M.gate, fe).then((K) => {
        mapped[O] = K;
        X.delete(M);
        this.tellWithholdableHeld();
        return K;
      }),
    );
    let promise_3 = new Promise((resolve) => {
      for (let O of mapped_2)
        O.then((K) => {
          if (K !== undefined) resolve(K);
        });
    });
    let winner = Promise.race([
      Promise.all(mapped_2).then(findFirstDefined),
      promise_3,
      promise.then(
        () =>
          findFirstDefined(mapped) ??
          withholdOnRelease(X, S) ??
          Promise.all(mapped_2.filter((M, O) => S && e[O]?.onExit === "await")).then(findFirstDefined),
      ),
      promise_2.then(() => withdrawnSendResult(true)),
    ]);
    let se = () => {
      v = true;
      P();
      this.tellWithholdableHeld();
    };
    winner.then(se, se);
    let Q = winner
      .then((M) => Promise.race([lastHeld.posted, promise.then(() => lastHeld.issued)]).then(() => M))
      .then((M) => {
        let O = M ?? withdrawnSendResult(ne);
        j();
        G = true;
        E();
        if (O !== undefined) return withheldSendResult(O);
        this.reviveStreamForUserSend();
        return i(n, s);
      });
    let I = {
      messageUuid: s?.uuid,
      release,
      issuedYet: () => G,
      settledYet: () => v,
      withheldOnRelease: () =>
        findFirstDefined(mapped) !== undefined || withholdOnRelease(X, false) !== undefined,
      withdraw: () => {
        ne = true;
        j();
        b();
      },
      issued,
      posted: Q,
    };
    this.lastHeld = {
      issued,
      posted: Q.then(
        () => {
          return;
        },
        () => {
          return;
        },
      ),
    };
    this.heldSends.add(I);
    j = () => {
      this.heldSends.delete(I);
      this.tellWithholdableHeld();
    };
    sleep(0, this.lifetime.signal).then(() => this.tellWithholdableHeld());
    Q.then(
      () => this.leaveChain(I, E),
      () => this.leaveChain(I, E),
    );
    return winner.then((M) => (M === undefined ? Q : withheldSendResult(M)));
  }
  withdrawHeldSend(e) {
    let filtered = [...this.heldSends].filter(
      (heldSend) => heldSend.messageUuid === e && !heldSend.issuedYet(),
    );
    filtered.forEach((s) => s.withdraw());
    return filtered.length > 0;
  }
  heldSendUuids() {
    return [...this.heldSends].flatMap((heldSend) =>
      heldSend.messageUuid !== undefined && !heldSend.issuedYet() ? [heldSend.messageUuid] : [],
    );
  }
  leaveChain(e, n) {
    this.chainedSends--;
    this.heldSends.delete(e);
    this.tellWithholdableHeld();
    n();
  }
  hasWithholdableHeldSend() {
    return this.withholdableHeldSends().length > 0;
  }
  countWithholdableHeldSends() {
    return this.withholdableHeldSends().length;
  }
  cancelHeldSends() {
    let e = this.withholdableHeldSends();
    e.forEach((n) => n.release(false, false));
    return e.length;
  }
  withholdableHeldSends() {
    return [...this.heldSends].filter(
      (heldSend) => !heldSend.issuedYet() && !heldSend.settledYet() && heldSend.withheldOnRelease(),
    );
  }
  tellWithholdableHeld() {
    let e = this.hasWithholdableHeldSend();
    if (e === this.withholdableHeldTold) return;
    this.withholdableHeldTold = e;
    try {
      this.callbacks.onWithholdableHeldChanged?.(e);
    } catch (error) {
      logError(
        Error(`[RemoteSessionManager] onWithholdableHeldChanged listener failed: ${errorMessage(error)}`),
      );
    }
  }
  async releaseHeldSends(
    e = HELD_SENDS_RELEASE_TIMEOUT_MS,
    { exiting: n = false, final: s = false, keepWithheld: i = false } = {},
  ) {
    if (n) this.exitFlushRequested = true;
    let filtered = [...this.heldSends].filter((heldSend) => !(i && heldSend.withheldOnRelease()));
    filtered.forEach((h) => h.release(n, s));
    let mapped = filtered.map(() => ({
      kind: "waiting",
    }));
    await withDeadline(
      Promise.allSettled([
        ...filtered.map((h, v) =>
          h.posted.then(
            (w) => {
              mapped[v] = deliveryOutcome(w);
            },
            () => {
              mapped[v] = {
                kind: "unconfirmed",
              };
            },
          ),
        ),
        ...(this.withheldPromptInFlight ? [this.withheldPromptInFlight] : []),
      ]),
      e,
    );
    filtered.forEach((h, v) => {
      if (mapped[v]?.kind !== "waiting") return;
      if (h.issuedYet())
        mapped[v] = {
          kind: "unconfirmed",
        };
      else if (s) {
        h.withdraw();
        mapped[v] = {
          kind: "unsent",
        };
      }
    });
    return {
      unsent: count(mapped, (h) => h.kind === "unsent"),
      refused: mapped.flatMap((h) => (h.kind === "refused" ? [h.reason] : [])),
      unconfirmed: count(mapped, (h) => h.kind === "unconfirmed"),
      stillHeld: count(mapped, (h) => h.kind === "waiting"),
    };
  }
  async sendBashCommand(e, n) {
    logForDebugging(`[RemoteSessionManager] Sending bash_command to session ${this.config.sessionId}`);
    this.reviveStreamForUserSend();
    let s = await sendBashCommandToRemoteSession(this.config.sessionId, e, this.signedOpts(n));
    if (!s.ok) {
      logForDebugging(
        `[RemoteSessionManager] Failed to send bash_command to session ${this.config.sessionId}: ${s.reason}`,
        {
          level: "error",
        },
      );
      logFeatureBad("remote_send_bash", "remote_send_bash_failed");
    } else logFeatureOk("remote_send_bash");
    return s;
  }
  reviveStreamForUserSend() {
    if (this.client?.reviveAfterExhaustion()) {
      this.callbacks.onReconnecting?.();
      return true;
    }
    return false;
  }
  sendResponse(e, n, s, i) {
    let client = this.client;
    if (!client) return;
    let startTime = performance.now();
    let h =
      i === undefined
        ? undefined
        : (y) => {
            try {
              i(y, Math.round(performance.now() - startTime));
            } catch (error) {
              logForDebugging(
                `[RemoteSessionManager] An answer's post listener threw; the answer's fate is unchanged: ${errorMessage(error)}`,
                {
                  level: "warn",
                },
              );
            }
            return y;
          };
    if (n === null || this.config.keepUndeliveredResponses !== true) {
      let y = client.sendControlResponse(e, undefined, timeoutOptionsForKind(n));
      if (!(h === undefined)) y.then(h);
      return;
    }
    let requestId = e.response.request_id;
    let R = this.undeliveredResponses.get(requestId) ?? {
      response: e,
      kind: n,
      uuid: randomUUID(),
      failures: 0,
      inFlight: false,
      giveUpOnSettle: null,
      timer: null,
      told: false,
    };
    R.response = e;
    if (s !== undefined) R.request = s;
    this.undeliveredResponses.set(requestId, R);
    this.postKeptResponse(client, R, h);
  }
  postKeptResponse(e, n, s) {
    n.inFlight = true;
    let i = e.sendControlResponse(n.response, n.uuid, timeoutOptionsForKind(n.kind));
    (s === undefined ? i : i.then(s)).then(
      (r) => this.settleResponsePost(n, r),
      (error) => {
        logForDebugging(`[RemoteSessionManager] Posting an answer threw: ${errorMessage(error)}`, {
          level: "warn",
        });
        this.settleResponsePost(n, {
          outcome: "failed",
          cause: "network",
        });
      },
    );
  }
  settleResponsePost(e, n) {
    e.inFlight = false;
    let requestId = e.response.response.request_id;
    if (this.undeliveredResponses.get(requestId) !== e) return;
    if (n.outcome === "accepted") {
      if (e.giveUpOnSettle === "overtaken") {
        this.giveUp(e, "overtaken");
        return;
      }
      this.dropKept(e);
      if (e.standIn) return;
      if (e.failures > 0 || e.giveUpOnSettle !== null) logFeatureSad("remote_control_response", "recovered");
      else logFeatureOk("remote_control_response");
      return;
    }
    if (e.giveUpOnSettle !== null) {
      this.giveUp(e, e.giveUpOnSettle);
      return;
    }
    if (
      n.outcome === "session_inactive" ||
      (n.outcome === "failed" && n.cause === "http" && n.status === 404)
    ) {
      this.dropKept(e);
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(requestId)} has no session to go to (${n.outcome === "failed" && n.cause === "http" ? `http ${n.status}` : "session not active"}); dropped`,
      );
      logFeatureSad("remote_control_response", "session_gone");
      return;
    }
    if (n.outcome === "failed" && n.cause === "closed") {
      if (!this.client?.isRevivable()) this.giveUp(e);
      return;
    }
    if (
      n.outcome === "failed" &&
      n.cause === "http" &&
      n.status < 500 &&
      n.status !== 408 &&
      n.status !== 429
    ) {
      if (this.postRefusalStandIn(e, n)) return;
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(requestId)} was refused by the service (http ${n.status}); not re-sending`,
        {
          level: "warn",
        },
      );
      this.giveUp(e, "undelivered", "refused");
      return;
    }
    if (!this.client?.isConnected()) {
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(requestId)} did not reach the session while the stream is down; it goes again at reconnect`,
      );
      return;
    }
    e.failures += 1;
    if (e.failures > RESPONSE_RESEND_MAX_ATTEMPTS) {
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(requestId)} could not be delivered after ${e.failures} attempts; giving up`,
        {
          level: "warn",
        },
      );
      this.giveUp(e);
      return;
    }
    if (e.failures === 1) logFeatureSad("remote_control_response", "resend");
    this.scheduleResponseResend(e);
  }
  postRefusalStandIn(e, n) {
    let client = this.client;
    let response = e.response.response;
    if (
      e.kind !== "tool" ||
      e.standIn ||
      client === null ||
      response.subtype !== "success" ||
      n.status === 401 ||
      n.status === 403
    )
      return false;
    let r = Buffer.byteLength(jsonStringify(response.response), "utf8");
    logForDebugging(
      `[RemoteSessionManager] Answer for ${printableExcerpt(response.request_id)} was refused by the service (http ${n.status}${n.tooLarge ? `, too large: this machine's configured limit is ${servedAnswerLimitBytes()} bytes, so the service's is lower` : ""}, ${r} bytes); sending an error in its place`,
      {
        level: "warn",
      },
    );
    logFeatureSad("remote_control_response", n.tooLarge ? "refused_too_large" : "refused_stand_in");
    e.response = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: response.request_id,
        response: {
          result: servedAnswerTooLargeText({
            answer: response.response,
            bytes: r,
            status: n.status,
            tooLarge: n.tooLarge === true,
          }),
        },
      },
    };
    e.uuid = randomUUID();
    e.standIn = true;
    e.failures = 0;
    noopGuard("out", e.response);
    this.postKeptResponse(client, e);
    return true;
  }
  dropKept(e) {
    this.clearResendTimer(e);
    this.undeliveredResponses.delete(e.response.response.request_id);
  }
  giveUp(e, n = "undelivered", s = n) {
    let requestId = e.response.response.request_id;
    if (e.inFlight) {
      if (e.giveUpOnSettle !== "overtaken") e.giveUpOnSettle = n;
      return;
    }
    this.dropKept(e);
    if (e.kind === "hook") addCappedToSet(this.hookGiveUpsTold, requestId);
    if (n === "undelivered" && (e.kind === "dialog" || e.kind === "permission")) {
      this.seenControlResponseIds.delete(requestId);
      if (e.kind === "permission") {
        if (e.request !== undefined) setCapped(this.reinstatablePermissionRequests, requestId, e.request);
      } else addCappedToSet(this.reinstatableDialogIds, requestId);
    }
    if (n === "undelivered" && e.kind === "hook" && s !== "refused")
      addCappedToSet(this.undeliveredHookIds, requestId);
    logFeatureBad("remote_control_response", s);
    if (e.told) return;
    e.told = true;
    this.callbacks.onResponseUndelivered?.(requestId, e.kind, n);
  }
  scheduleResponseResend(e) {
    this.clearResendTimer(e);
    let n = RESPONSE_RESEND_DELAYS_MS[Math.min(e.failures, RESPONSE_RESEND_MAX_ATTEMPTS) - 1] ?? 45000;
    e.timer = setTimeout(this.resendOnTimer, n, e.response.response.request_id);
  }
  resendOnTimer = (e) => {
    let n = this.undeliveredResponses.get(e);
    let client = this.client;
    if (!n || !client) return;
    n.timer = null;
    if (!n.inFlight) {
      noopGuard("out", n.response);
      this.postKeptResponse(client, n);
    }
  };
  clearResendTimer(e) {
    if (e.timer !== null) {
      clearTimeout(e.timer);
      e.timer = null;
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
  respondToPermissionRequest(requestId, n) {
    let s = this.pendingPermissionRequests.get(requestId);
    if (!s) {
      logError(Error(`[RemoteSessionManager] No pending permission request with ID: ${requestId}`));
      logFeatureBad("remote_permission_respond", "remote_permission_respond_no_pending");
      return;
    }
    this.retirePermissionRequest(requestId);
    this.recordSeenControlResponseId(requestId);
    this.reviveStreamForUserSend();
    let i = this.config.nameRepositoryTrustAnswers === true && isConfirmRepositoryTrustTool(s.tool_name);
    let r = false;
    let S = this.config.pinComputerFolderAllow?.() === true && isRequestComputerFolderTool(s.tool_name);
    let h =
      (i || S) && n.behavior === "allow"
        ? {
            behavior: "allow",
            updatedInput: s.input,
            ...(n.toolUseID !== undefined && {
              toolUseID: n.toolUseID,
            }),
          }
        : n;
    let controlResponse = buildControlResponse(
      requestId,
      h,
      this.config.nameToolOnPermissionAllow === true || i || r ? s.tool_name : undefined,
      i && n.behavior === "deny" && n.decisionClassification === "user_reject",
    );
    logForDebugging(`[RemoteSessionManager] Sending permission response: ${n.behavior}`);
    noopGuard("out", controlResponse);
    this.sendResponse(controlResponse, "permission", s);
    logFeatureOk("remote_permission_respond");
  }
  respondToUserDialogRequest(e, n) {
    if (!this.pendingDialogRequests.delete(e)) {
      logError(Error(`[RemoteSessionManager] No pending user dialog request with ID: ${e}`));
      logFeatureBad("remote_dialog_respond", "remote_dialog_respond_no_pending");
      return;
    }
    this.recordSeenControlResponseId(e);
    this.reviveStreamForUserSend();
    let s = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: e,
        response: n,
      },
    };
    logForDebugging(`[RemoteSessionManager] Sending user dialog response: ${n.behavior}`);
    noopGuard("out", s);
    this.sendResponse(s, "dialog");
    logFeatureOk("remote_dialog_respond");
  }
  releaseForwardedHook(e) {
    this.pendingForwardedHooks.delete(e);
    if (this.settledForwardedHookIds.has(e)) addCappedToSet(this.hookGiveUpsTold, e);
  }
  respondToForwardedHook(e, response) {
    if (!this.pendingForwardedHooks.delete(e)) {
      logForDebugging(
        `[RemoteSessionManager] Forwarded hook request ${printableExcerpt(e)} is no longer pending \u2014 answer not sent`,
      );
      return false;
    }
    if (!this.client) return false;
    this.recordSeenControlResponseId(e);
    this.recordSettledForwardedHookId(e);
    this.reviveStreamForUserSend();
    let i = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: e,
        response,
      },
    };
    noopGuard("out", i);
    this.sendResponse(i, "hook");
    return true;
  }
  respondToServedChannelRequest(e, n, s) {
    let i = this.pendingServedRequests.get(e);
    if (!i) {
      logForDebugging(
        `[RemoteSessionManager] served request ${printableExcerpt(e)} is no longer pending \u2014 result not sent`,
      );
      return false;
    }
    this.pendingServedRequests.delete(e);
    if (!this.client) return false;
    this.recordSeenControlResponseId(e);
    addCappedToSet(this.settledServedRequestIds, e);
    this.reviveStreamForUserSend();
    let S = {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: e,
        response: capToolResultSize(n),
      },
    };
    noopGuard("out", S);
    this.sendResponse(S, i.subtype === "remote_tools_probe" ? null : "tool", undefined, s);
    return true;
  }
  releaseServedChannelRequest(e) {
    this.pendingServedRequests.delete(e);
  }
  countServedToolCallsInHand() {
    return count([...this.pendingServedRequests.values()], ({ subtype }) => subtype === "remote_tool_call");
  }
  retireServedRequest(e, n) {
    let s = this.pendingServedRequests.get(e);
    if (!s) return false;
    this.pendingServedRequests.delete(e);
    logForDebugging(
      `[RemoteSessionManager] served request ${printableExcerpt(e)} ${n === "worker" ? "cancelled by the worker" : "dropped with the stream"}`,
    );
    s.abort.abort();
    this.callbacks.onServedChannelRequestCancelled?.(e, n);
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
  flushSends(e) {
    return this.client?.flushSends(e) ?? Promise.resolve();
  }
  cancelSession() {
    logForDebugging("[RemoteSessionManager] Sending interrupt signal");
    this.firstSendReleased = true;
    this.reviveStreamForUserSend();
    let e = () => {
      noopGuard("out", {
        kind: "control_request",
        subtype: "interrupt",
      });
      this.client?.sendControlRequest({
        subtype: "interrupt",
      });
    };
    if (this.heldSends.size === 0) {
      e();
      return;
    }
    let n = () => {
      if (this.pendingInterrupt === n) {
        this.pendingInterrupt = null;
        e();
      }
    };
    this.pendingInterrupt = n;
    this.releaseHeldSends().then(n, n);
  }
  sendControlRequest(e, n) {
    return this.postControlRequest(e, n).response;
  }
  postControlRequest(e, n) {
    let { promise, resolve } = Promise.withResolvers();
    let r = async () => {
      let h = null;
      try {
        if (n?.signal?.aborted) throw new AbortError();
        if (!n?.background) this.reviveStreamForUserSend();
        noopGuard("out", {
          kind: "control_request",
          ...e,
        });
        h = this.client?.postControlRequest(e, this.onControlRequestPostFailed) ?? null;
        if (h === null) throw Error("[RemoteSessionManager] Cannot send: not connected");
      } finally {
        if (h === null) resolve(CLOSED_SEND_RESULT);
      }
      h.posted.then(resolve, () => resolve(CLOSED_SEND_RESULT));
      return this.awaitControlResponse(h.requestId, e, n);
    };
    let response = n?.answerExpected === false ? r() : withOutcomeTelemetry("remote_control_rpc", r);
    return {
      posted: promise,
      response,
    };
  }
  awaitControlResponse(e, n, s) {
    if (n.subtype === "set_model") this.pendingModelSwitchIds.add(e);
    let i = defaultHoldBudgetMs(n.subtype, s?.timeoutMs);
    let awaitWorkerStart = this.workerStarting ? s?.awaitWorkerStart : undefined;
    let S = awaitWorkerStart ? Math.max(HOLD_MAX_MS, i) : i;
    return new Promise((resolve, reject) => {
      let timer = setTimeout(this.onControlRequestTimeout, S, e, n.subtype, S);
      let signal = s?.signal;
      let y = signal ? () => this.cancelControlRequest(e) : undefined;
      if (signal && y)
        signal.addEventListener("abort", y, {
          once: true,
        });
      this.pendingControlRequests.set(e, {
        resolve: (b) => resolve(b),
        reject,
        timer,
        timeoutMs: i,
        subtype: n.subtype,
        onProgress: s?.onProgress,
        removeAbortListener: signal && y ? () => signal.removeEventListener("abort", y) : undefined,
        ...(s?.background && {
          background: true,
        }),
        ...(s?.onEchoed && {
          onEchoed: s.onEchoed,
        }),
        ...(awaitWorkerStart && {
          awaitingWorker: awaitWorkerStart,
        }),
      });
      if (awaitWorkerStart) {
        logForDebugging(
          `[RemoteSessionManager] control_request ${e} (${n.subtype}) waits for the worker; its ${i / 1000}s limit starts when that wait ends`,
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
    let e = [];
    for (let [n, s] of this.pendingControlRequests) {
      if (s.awaitingWorker === undefined) continue;
      clearTimeout(s.timer);
      let timer = setTimeout(this.onControlRequestTimeout, s.timeoutMs, n, s.subtype, s.timeoutMs);
      this.pendingControlRequests.set(n, {
        ...s,
        timer,
        awaitingWorker: undefined,
      });
      e.push(s.awaitingWorker);
    }
    logForDebugging(
      `[RemoteSessionManager] The wait for the worker ended; ${e.length} waiting control request(s) start their own limit`,
    );
    for (let n of e) this.tellAwaitingWorker(n, false);
  }
  tellAwaitingWorker(e, n) {
    try {
      e.onChange(n);
    } catch (error) {
      logError(error);
    }
  }
  onControlRequestPostFailed = (e) => {
    this.pendingModelSwitchIds.delete(e);
    let n = this.pendingControlRequests.get(e);
    if (!n) return;
    this.pendingControlRequests.delete(e);
    clearTimeout(n.timer);
    n.removeAbortListener?.();
    logForDebugging(
      `[RemoteSessionManager] control_request ${e} (${n.subtype}) was not delivered \u2014 failing it`,
      {
        level: "warn",
      },
    );
    n.reject(new ControlRequestNotDeliveredError(n.subtype));
  };
  onControlRequestTimeout = (e, n, s) => {
    this.pendingModelSwitchIds.delete(e);
    let i = this.pendingControlRequests.get(e);
    if (!i) return;
    this.pendingControlRequests.delete(e);
    i.removeAbortListener?.();
    if (i.awaitingWorker !== undefined) this.endWorkerStart();
    i.reject(new ControlRequestTimeoutError(n, s));
  };
  cancelControlRequest(e) {
    let n = this.pendingControlRequests.get(e);
    if (!n) return;
    if (!n.background) this.reviveStreamForUserSend();
    this.pendingControlRequests.delete(e);
    this.pendingModelSwitchIds.delete(e);
    clearTimeout(n.timer);
    logForDebugging(`[RemoteSessionManager] Cancelling control request ${e} (${n.subtype})`);
    noopGuard("out", {
      kind: "control_cancel_request",
      requestId: e,
    });
    this.client?.sendControlCancelRequest(e);
    n.reject(new AbortError());
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
function timeoutOptionsForKind(e) {
  return e === "tool"
    ? {
        timeoutMs: TOOL_CONTROL_REQUEST_TIMEOUT_MS,
      }
    : {};
}
//@ chunk-08945j39.js:75886-76097 placement
function capToolResultSize(e) {
  let n = Buffer.byteLength(jsonStringify(e), "utf8");
  let s = servedAnswerLimitBytes();
  if (n <= s) return e;
  return {
    result: {
      content: [
        {
          type: "text",
          text: `(the result was too large to return: ${n} bytes, over the ${s}-byte limit)`,
        },
      ],
      isError: true,
    },
  };
}
//@ chunk-08945j39.js:76097-76307 placement
function runSendGate(gate, n) {
  let s = (error) => {
    logForDebugging(`[RemoteSessionManager] send gate failed, message goes anyway: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  };
  try {
    return gate(n).then((i) => (isStoppedSendResult(i) ? i : undefined), s);
  } catch (error) {
    return Promise.resolve(s(error));
  }
}
//@ chunk-08945j39.js:76307-76398 placement
function isStoppedSendResult(e) {
  return typeof e === "object" && e !== null && e.go === false && typeof e.reason === "string";
}
//@ chunk-08945j39.js:76398-76444 placement
function findFirstDefined(e) {
  return e.find((n) => n !== undefined);
}
//@ chunk-08945j39.js:76444-76501 placement
function withheldSendResult(e) {
  return {
    ok: false,
    reason: e.reason,
    withheld: true,
  };
}
//@ chunk-08945j39.js:76501-76834 placement
/**
 * 把发送结果映射为投递结果：sent、unsent、refused 或 unconfirmed。
 */
function deliveryOutcome(e) {
  if (e.ok)
    return {
      kind: "sent",
    };
  switch (sendFailureKind(e)) {
    case "withheld":
      return e.reason === CANCELLED || e.reason === WITHDRAWN
        ? {
            kind: "unsent",
          }
        : {
            kind: "refused",
            reason: e.reason,
          };
    case "http_4xx":
    case "http_429":
    case "not_first_party":
      return {
        kind: "refused",
        reason: e.reason,
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
function withdrawnSendResult(e) {
  return e
    ? {
        go: false,
        reason: WITHDRAWN,
      }
    : undefined;
}
//@ chunk-08945j39.js:76884-77006 placement
function withholdOnRelease(e, n) {
  return [...e].some(({ onRelease, onExit }) => onRelease === "withhold" && !(n && onExit === "await"))
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
function parseSequenceNum(e) {
  let n = e?.sequence_num === undefined ? undefined : parseInt(String(e.sequence_num), 10);
  return n !== undefined && !isNaN(n) ? n : undefined;
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
async function getSessionRequestConfig(e, n, { recoverDeviceProof: s = false } = {}) {
  let { accessToken, profile } = await prepareApiRequest(n);
  let S = {
    sessionUrl: `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}`,
    headers: await getSessionRequestHeaders(accessToken, profile),
  };
  if (!s) return S;
  return {
    ...S,
    headersForRenewedDeviceToken: async (h) => ({
      ...getOAuthRequestHeaders((await prepareApiRequest(n)).accessToken),
      [X_TRUSTED_DEVICE_TOKEN]: h,
    }),
  };
}
//@ chunk-08945j39.js:77499-77645 placement
function fetchSessionEvents(sessionUrl, headers, params, i) {
  return axios_default
    .get(`${sessionUrl}/events`, {
      headers,
      params,
      timeout: 15000,
      validateStatus: () => true,
      maxContentLength: i ?? -1,
    })
    .catch(() => null);
}
//@ chunk-08945j39.js:77645-78703 placement
async function renewDeviceTokenAndRetry(ctx, params, s, i) {
  let sessionEvents = await fetchSessionEvents(ctx.sessionUrl, ctx.headers, params, i);
  let headersForRenewedDeviceToken = ctx.headersForRenewedDeviceToken;
  if (sessionEvents?.status === 403 && headersForRenewedDeviceToken !== undefined) {
    let R = false;
    let y = await resendAfterUntrustedDevice(
      sessionEvents,
      ctx.headers[X_TRUSTED_DEVICE_TOKEN],
      async (b) => {
        let k = await headersForRenewedDeviceToken(b).then(
          (headers) => fetchSessionEvents(ctx.sessionUrl, headers, params, i),
          () => null,
        );
        if (k === null) {
          R = true;
          throw Error("no answer");
        }
        return k;
      },
      "cloud_session",
    );
    if (R) {
      logForDebugging(`[${s}] no answer after renewing the device token`);
      return null;
    }
    if (
      y.status === 403 &&
      isTrustedDeviceGateEnabled() &&
      classifyElevatedAuthError(y.data) === "untrusted_device"
    ) {
      logForDebugging(`[${s}] HTTP 403 untrusted_device`);
      throw new UntrustedDeviceTokenError(
        "the service does not accept a trusted-device token from this computer",
      );
    }
    sessionEvents = y;
  }
  if (!sessionEvents || sessionEvents.status !== 200) {
    logForDebugging(`[${s}] HTTP ${sessionEvents?.status ?? "error"}`);
    return null;
  }
  if (sessionEvents.data === null || typeof sessionEvents.data !== "object") {
    logForDebugging(`[${s}] non-object 200 body`);
    return null;
  }
  let h = Array.isArray(sessionEvents.data.data) ? sessionEvents.data.data : [];
  let v = [];
  for (let j = h.length - 1; j >= 0; j--) {
    let y = h[j];
    if (y?.payload)
      v.push({
        payload: y.payload,
        createdAt: y.created_at,
        source: y.source,
        sequenceNum: parseSequenceNum(y),
      });
  }
  let nextCursor = sessionEvents.data.next_cursor ?? null;
  return {
    events: v,
    firstId: nextCursor,
    hasMore: nextCursor !== null,
    droppedRows: h.length - v.length,
    newestSequenceNum: parseSequenceNum(h[0]),
  };
}
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

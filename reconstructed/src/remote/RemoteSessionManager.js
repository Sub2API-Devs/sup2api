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
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, kt, T, pe, oe } from "../../vendor/zod/v4/classic/schemas.js";
import { isDifferentString } from "../bridge/bridgePermissionResponse.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, AbortError } from "../utils/errors.js";
import { safeEmit } from "../utils/telemetry/memorySummary.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { SessionsV2Client } from "./SessionsV2Client.js";
import {
  H,
  qkr,
  FORWARDED_CONTROL_REQUESTS,
  HOST_HANDLED_CONTROL_REQUESTS,
  holdFirstSendForSettings,
  Me,
  Vkr,
} from "../services/homeSeed/firstSend.js";
import { Kkr } from "./backgroundTaskEvents.js";
import {
  controlResponseError,
  withOutcomeTelemetry,
  ControlRequestNotDeliveredError,
  ControlRequestTimeoutError,
} from "./controlRequestErrors.js";
import { MODEL_SET_STDOUT_PREFIX } from "../utils/messages.js";
import { isSubagentToolRequest, R7 } from "./wireFrameShape.js";
import { count } from "../utils/collections.js";
import { parseControlRequest } from "../entrypoints/sdk/controlSchemas.js";
import { unexpectedValueFingerprint, KNe, m2 } from "./tools/protocolConstants.js";
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
import { aNt, servedAnswerTooLargeText } from "../services/remoteTools/servedAnswerSize.js";
import { parseDeviceHookId } from "../utils/hooks/deviceHookId.js";
import { _Ce } from "../services/remoteTools/remoteToolsDebug.js";
import { getOauthConfig } from "../constants/oauth.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { isTrustedDeviceGateEnabled } from "../bridge/trustedDevice.js";
import { classifyElevatedAuthError } from "../bridge/codeSessionApi.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { SETTINGS_CONTROL_SUBTYPES } from "../cli/transports/ccrClient.js";

//@ chunk-08945j39.js:35221-35287 placement
function Wt(e) {
  return e instanceof Error && e.name === "TimeoutError";
}
//@ chunk-08945j39.js:35287-35312 placement
var et = 1000,
  Vt = 8,
  Xkr = 200;
/**
 * 远程会话中控制请求的 schema 表（can_use_tool、request_user_dialog）。
 */
//@ chunk-08945j39.js:35312-35581 placement
var CONTROL_REQUEST_SCHEMAS = {
  can_use_tool: DoctorLazy(() =>
    u({
      request_id: o(),
      request: kt({ subtype: T("can_use_tool"), tool_name: o(), input: pe(o(), oe()), tool_use_id: o() }),
    }),
  ),
  request_user_dialog: DoctorLazy(() =>
    u({
      request_id: o(),
      request: kt({ subtype: T("request_user_dialog"), dialog_kind: o(), payload: pe(o(), oe()) }),
    }),
  ),
};
//@ chunk-08945j39.js:35735-35802 placement
var jt = DoctorLazy(() => u({ subtype: T("success"), response: u({ toolName: o() }) }));
//@ chunk-08945j39.js:35802-35866 placement
function tt(e) {
  return jt().safeParse(e).data?.response.toolName;
}
//@ chunk-08945j39.js:35866-35925 placement
function xmo(e, n) {
  return typeof n === "string" && isDifferentString(tt(e), n);
}
//@ chunk-08945j39.js:35925-35977 placement
function Ge(e, n) {
  try {
    return isDeepStrictEqual(e, n);
  } catch {
    return !1;
  }
}
//@ chunk-08945j39.js:35977-36073 placement
function W(e, n) {
  if ((e.add(n), e.size > et)) {
    let s = e.values().next().value;
    if (s !== void 0) e.delete(s);
  }
}
//@ chunk-08945j39.js:36073-36177 placement
function setCapped(e, n, s, i = Xkr) {
  if ((e.set(n, s), e.size > i)) {
    let r = e.keys().next().value;
    if (r !== void 0) e.delete(r);
  }
}
//@ chunk-08945j39.js:36177-36239 placement
var eCs = ["can_use_tool", "request_user_dialog"],
  Yt = 30000,
  zt = 16;
/**
 * 把字符串转为可打印 ASCII 摘要（超过 80 字符截断并标出剩余长度）。
 */
//@ chunk-08945j39.js:36239-36375 placement
function printableExcerpt(e) {
  return e.length > 80
    ? `${e.slice(0, 80).replace(/[^\x20-\x7e]/g, "?")}\u2026(+${e.length - 80})`
    : e.replace(/[^\x20-\x7e]/g, "?");
}
//@ chunk-08945j39.js:36375-36407 placement
var ie = 256,
  Xt = 3,
  Qt = 750,
  Jt = 35000;
//@ chunk-08945j39.js:36407-36552 placement
function sendFailureKind(e) {
  if (e.withheld) return "withheld";
  if (e.status === 429) return "http_429";
  if (e.status !== void 0) return "http_4xx";
  return e.cause ?? "unknown";
}
//@ chunk-08945j39.js:36552-36633 placement
function Zt(e) {
  return e === "http_429" || e === "server" || e === "timeout" || e === "network";
}
//@ chunk-08945j39.js:36633-36720 placement
var nt = { timeout: "the service took too long to answer", network: "the connection failed" };
//@ chunk-08945j39.js:36720-36797 placement
function tCs(e) {
  let n = sendFailureKind(e);
  return n === "timeout" || n === "network" ? nt[n] : void 0;
}
//@ chunk-08945j39.js:36797-36928 placement
var CANCELLED = "cancelled",
  WITHDRAWN = "withdrawn",
  je = { outcome: "failed", cause: "closed" },
  en = 1500,
  st = [1000, 5000, 15000, 45000],
  ze = st.length,
  tn = 120000;
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
/**
 * 远程会话管理：连接云会话、转发权限请求与对话框回答、处理未送达
 */
//@ chunk-08945j39.js:38165-75642 placement
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
  workerSeenThisConnection = !1;
  replayedRefusalsAnswered = 0;
  seedRequestsArmed = !1;
  securityTierRaiseSeen = !1;
  pendingServedRequests = new Map();
  settledServedRequestIds = new Set();
  errorShapedControlResponseIds = new Set();
  seenControlResponseIds = new Set();
  seenSuccessToolNames = new Map();
  retiredPermissionRequestIds = new Set();
  reinstatablePermissionRequests = new Map();
  reinstatableDialogIds = new Set();
  pendingControlRequests = new Map();
  workerStarting = !1;
  pendingModelSwitchIds = new Set();
  sendGates = new Set();
  heldSends = new Set();
  withholdableHeldTold = !1;
  chainedSends = 0;
  lifetime = new AbortController();
  serving = !1;
  firstSendReleased = !1;
  exitFlushRequested = !1;
  withheldPromptInFlight = null;
  sentAMessage = !1;
  sendsNow;
  movesBash;
  connections = 0;
  newestOwnMessageSequence = null;
  lastHeld = { issued: Promise.resolve(), posted: Promise.resolve() };
  pendingInterrupt = null;
  constructor(e, n) {
    this.config = e;
    this.callbacks = n;
    if (
      ((this.sendsNow = e.seedWorkerSendsNow),
      (this.movesBash = e.seedWorkerMovesBash),
      e.homeSeed !== void 0 && e.homeSeedHoldsFirstSend !== !1)
    )
      this.gateSendsOnSettings(e.homeSeed);
    if (e.withheldInitialPrompt !== void 0) {
      let withheldInitialPrompt = e.withheldInitialPrompt;
      queueMicrotask(() => void this.sendWithheldInitialPrompt(withheldInitialPrompt));
    }
  }
  connect() {
    logForDebugging(`[RemoteSessionManager] Connecting to session ${this.config.sessionId}`);
    let e = {
      onMessage: (n, s) => this.handleMessage(n, s),
      onConnected: (n) => {
        (logForDebugging("[RemoteSessionManager] Connected"), (this.replayedRefusalsAnswered = 0));
        for (let s of this.undeliveredResponses.values())
          if (((s.failures = 0), s.giveUpOnSettle === "undelivered")) s.giveUpOnSettle = null;
        if (
          (this.resendUndeliveredResponses(),
          (this.workerSeenThisConnection = !1),
          this.securityTierRaiseSeen)
        )
          try {
            this.config.rebindEventSigner?.();
          } catch (error) {
            logForDebugging(`[RemoteSessionManager] rebindEventSigner threw: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        if ((this.callbacks.onConnected?.(n), !this.seedRequestsArmed && !this.lifetime.signal.aborted)) {
          this.seedRequestsArmed = !0;
          let size = this.pendingPermissionRequests.size,
            mapped = (this.config.seedSubagentRequests ?? []).map((S) =>
              safeEmit((h) => this.handleControlRequest(h, {}), S, "RemoteSessionManager, attach seed"),
            );
          if (mapped.length > 0 && !mapped.includes(!0))
            logFeatureBad("remote_permission_seed_adoption", "handler_threw");
          else if (mapped.includes(!1)) logFeatureSad("remote_permission_seed_adoption", "handler_threw");
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
        if ((logForDebugging("[RemoteSessionManager] Disconnected"), this.client?.isRevivable()))
          this.giveUpUndeliveredResponses();
        else this.dropUndeliveredResponses();
        (this.endWorkerStart(), this.callbacks.onDisconnected?.(n));
      },
      onReconnecting: () => {
        ((this.workerSeenThisConnection = !1),
          logForDebugging("[RemoteSessionManager] Reconnecting"),
          this.callbacks.onReconnecting?.());
      },
      onStreamSilent: (n) => this.callbacks.onStreamSilent?.(n),
      onDeliveryUpdate: ({ eventId: eventId, status: status }) => {
        if (/PROCESS(ING|ED)$/i.test(status)) this.callbacks.onLineTaken?.(eventId);
      },
      onOwnRequestEchoed: (n, s) => {
        let i = this.pendingControlRequests.get(n);
        if (i?.onEchoed) (this.pendingControlRequests.set(n, { ...i, onEchoed: void 0 }), i.onEchoed(s));
      },
      onWorkerConnectionStatus: (n) => {
        if (
          (logForDebugging(
            `[RemoteSessionManager] The service reports the worker ${n === "connected" || n === "disconnected" ? n : "in an unknown state"}`,
          ),
          n === "connected")
        )
          (this.noteWorkerLive(), this.callbacks.onWorkerConnectionStatus?.(n));
        else if (n === "disconnected") {
          if (this.workerSeenThisConnection) this.endWorkerStart();
          ((this.workerSeenThisConnection = !1),
            this.callbacks.onWorkerGone?.(),
            this.callbacks.onWorkerConnectionStatus?.(n));
        }
      },
      onSecurityTierRaised: () => {
        this.securityTierRaiseSeen = !0;
      },
      onToolHostEnded: (n) => {
        (logForDebugging(
          "[RemoteSessionManager] The service ended this session's connection to a computer serving its tools",
        ),
          this.callbacks.onToolHostEnded?.(n));
      },
      ...{},
      onCatchUpTruncated: () => {
        (logForDebugging("[RemoteSessionManager] Catch-up truncated"), this.callbacks.onCatchUpTruncated?.());
      },
      onError: (n) => {
        (logForDebugging(`[RemoteSessionManager] Stream error: ${n.message}`, { level: "error" }),
          this.callbacks.onError?.(n));
      },
    };
    ((this.client = new SessionsV2Client(
      this.config.sessionId,
      this.config.orgUuid,
      this.config.getAccessToken,
      e,
      this.config.onAuth401,
      this.config.initialSequenceNum,
      {
        trackSends: this.config.trackSendsInFlight === !0,
        controlOnly: this.config.controlOnly === !0,
        admitProjectPersonMessages: this.config.admitProjectPersonMessages === !0,
        keepRedialling: () => this.config.keepStreamRedialling === !0 || this.serving,
        withholdTrustedDeviceToken: this.config.consoleProfileBearer === !0,
        ...this.signedOpts({}),
      },
    )),
      this.client.connect());
  }
  handleMessage(e, n = {}) {
    if ((H("in", e, n), n.source === "worker" && n.replayed !== !0)) this.noteWorkerLive();
    if (n.source === "worker" && e.type === "system" && e.subtype === "init")
      ((this.sendsNow = qkr(e)), (this.movesBash = Kkr(e)));
    if (e.type === "control_request") {
      this.handleControlRequest(e, n);
      return;
    }
    if (e.type === "control_cancel_request") {
      let { request_id: request_id } = e;
      (this.reinstatablePermissionRequests.delete(request_id), this.reinstatableDialogIds.delete(request_id));
      let i = this.undeliveredResponses.get(request_id);
      if (i?.kind === "hook" || i?.kind === "tool") this.giveUp(i, "overtaken");
      else if (i) this.dropKept(i);
      else if (
        this.config.keepUndeliveredResponses === !0 &&
        this.settledForwardedHookIds.has(request_id) &&
        !this.hookGiveUpsTold.has(request_id)
      )
        (W(this.hookGiveUpsTold, request_id),
          logFeatureBad("remote_control_response", "overtaken"),
          this.callbacks.onResponseUndelivered?.(request_id, "hook", "overtaken"));
      if (this.pendingForwardedHooks.delete(request_id)) {
        (logForDebugging(
          `[RemoteSessionManager] Forwarded hook request cancelled by the worker: ${printableExcerpt(request_id)}`,
        ),
          this.callbacks.onForwardedHookCancelled?.(request_id, "worker"));
        return;
      }
      if (this.retireServedRequest(request_id, "worker")) return;
      if (this.pendingDialogRequests.delete(request_id)) {
        (logForDebugging(`[RemoteSessionManager] User dialog request cancelled: ${request_id}`),
          this.callbacks.onUserDialogCancelled?.(request_id));
        return;
      }
      let r = this.pendingPermissionRequests.get(request_id);
      if (!r) {
        logForDebugging(
          `[RemoteSessionManager] control_cancel_request for unknown request ${request_id} \u2014 nothing pending, ignoring`,
        );
        return;
      }
      (logForDebugging(`[RemoteSessionManager] Permission request cancelled: ${request_id}`),
        this.retirePermissionRequest(request_id),
        this.callbacks.onPermissionCancelled?.(request_id, r.tool_use_id));
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
      let i = setTimeout(this.onControlRequestTimeout, s.timeoutMs, e.request_id, s.subtype, s.timeoutMs);
      (this.pendingControlRequests.set(e.request_id, { ...s, timer: i }), s.onProgress?.(e));
      return;
    }
    if (e.type === "control_response") {
      let { request_id: request_id } = e.response,
        i = this.config.ignoreErrorShapedDialogReplies === !0 && e.response.subtype === "error",
        r = tt(e.response),
        S = this.seenSuccessToolNames.get(request_id) ?? [],
        h = this.pendingPermissionRequests.get(request_id),
        v = h !== void 0 && isDifferentString(r, h.tool_name);
      if (i) W(this.errorShapedControlResponseIds, request_id);
      else if (r !== void 0 && S.length < Vt && !v)
        setCapped(this.seenSuccessToolNames, request_id, [...S, r], et);
      else if (!v) this.recordSeenControlResponseId(request_id);
      let w = this.undeliveredResponses.get(request_id);
      if (w !== void 0 && "uuid" in e && e.uuid === w.uuid && w.giveUpOnSettle !== "overtaken")
        if ((this.dropKept(w), w.failures > 0)) logFeatureSad("remote_control_response", "recovered");
        else logFeatureOk("remote_control_response");
      this.pendingModelSwitchIds.delete(request_id);
      let R = this.pendingControlRequests.get(request_id);
      if (R)
        if (
          (this.pendingControlRequests.delete(request_id),
          clearTimeout(R.timer),
          R.removeAbortListener?.(),
          this.endWorkerStart(),
          e.response.subtype === "success")
        )
          R.resolve(e.response.response);
        else R.reject(controlResponseError(e.response));
      else {
        let y = this.pendingPermissionRequests.get(request_id);
        if (y) {
          if (v) {
            logForDebugging(
              `[RemoteSessionManager] Permission response ${request_id} has mismatched toolName \u2014 worker will drop it, keeping prompt`,
            );
            return;
          }
          (this.retirePermissionRequest(request_id),
            logForDebugging(
              `[RemoteSessionManager] Permission request ${request_id} answered elsewhere \u2014 dismissing`,
            ),
            this.callbacks.onPermissionCancelled?.(request_id, y.tool_use_id));
        } else if (this.pendingDialogRequests.has(request_id))
          if (i)
            logForDebugging(
              `[RemoteSessionManager] User dialog request ${request_id} got an error-shaped reply elsewhere \u2014 worker still waiting, keeping it`,
            );
          else
            (this.pendingDialogRequests.delete(request_id),
              logForDebugging(
                `[RemoteSessionManager] User dialog request ${request_id} answered elsewhere \u2014 dismissing`,
              ),
              this.callbacks.onUserDialogCancelled?.(request_id));
        else if (this.pendingForwardedHooks.has(request_id))
          logForDebugging(
            `[RemoteSessionManager] Ignoring a peer control_response (${e.response.subtype}) for forwarded hook request ${printableExcerpt(request_id)} \u2014 still answering it here`,
          );
        else if (!this.settledServedRequestIds.has(request_id))
          logForDebugging(
            `[RemoteSessionManager] Unmatched control_response ${request_id} (${e.response.subtype})${e.response.subtype === "error" ? `: ${e.response.error}` : ""}`,
          );
      }
      if (this.config.rearmRedeliveredPermissionRequests === !0)
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
      this.config.keepOwnModelSwitchBreadcrumb !== !0 &&
      this.pendingModelSwitchIds.size > 0 &&
      e.type === "user" &&
      "isReplay" in e &&
      e.isReplay === !0 &&
      typeof e.message?.content === "string" &&
      e.message.content.startsWith(MODEL_SET_STDOUT_PREFIX)
    ) {
      let [s] = this.pendingModelSwitchIds;
      (this.pendingModelSwitchIds.delete(s),
        logForDebugging("[RemoteSessionManager] Dropped own set_model breadcrumb echo"));
      return;
    }
    if (e.type === "result") {
      if (
        this.sentAMessage ||
        this.config.homeSeedHoldsFirstSend !== !1 ||
        this.config.initialPromptUuid !== void 0
      )
        this.config.homeSeed?.afterFirstReply(this.lifetime.signal);
      let s = [...this.pendingPermissionRequests],
        r =
          this.config.subagentRequestsOutliveTheTurn === !0
            ? s.filter(([, S]) => !isSubagentToolRequest(S))
            : s;
      for (let [S, h] of r)
        (logForDebugging(
          `[RemoteSessionManager] Turn ended with permission request ${S} unresolved \u2014 dismissing`,
        ),
          this.callbacks.onPermissionCancelled?.(S, h.tool_use_id),
          this.retirePermissionRequest(S),
          setCapped(this.reinstatablePermissionRequests, S, h));
      if (s.length > 0 && n.replayed !== !0) {
        let S = count(s, ([, h]) => isSubagentToolRequest(h));
        logEvent("tengu_remote_turn_ended_with_open_permission_requests", {
          from_main_thread: s.length - S,
          from_subagents: S,
          kept_open: s.length - r.length,
        });
      }
      for (let pendingDialogRequest of this.pendingDialogRequests)
        (logForDebugging(
          `[RemoteSessionManager] Turn ended with user dialog request ${pendingDialogRequest} unresolved \u2014 dismissing`,
        ),
          this.callbacks.onUserDialogCancelled?.(pendingDialogRequest),
          W(this.reinstatableDialogIds, pendingDialogRequest));
      this.pendingDialogRequests.clear();
    }
    this.callbacks.onMessage(e, n);
  }
  retirePermissionRequest(e) {
    (this.pendingPermissionRequests.delete(e), this.retiredPermissionRequestIds.add(e));
  }
  rearmRedelivered(e, n, s) {
    if (!Array.isArray(e)) return;
    e.slice(0, Xkr).forEach((i) => {
      let r = parseControlRequest(i, n);
      if (r === null) return;
      let S = this.seenSuccessToolNames.get(r.request_id),
        { request: request } = r;
      if (
        this.seenControlResponseIds.has(r.request_id) ||
        (n === "can_use_tool" && this.errorShapedControlResponseIds.has(r.request_id)) ||
        (S !== void 0 &&
          !(request.subtype === "can_use_tool" && S.every((R) => isDifferentString(R, request.tool_name))))
      ) {
        logForDebugging(
          `[RemoteSessionManager] Redelivered ${n} ${printableExcerpt(r.request_id)} already answered \u2014 skipping`,
        );
        return;
      }
      let v = !1;
      if (n === "can_use_tool" && this.retiredPermissionRequestIds.has(r.request_id)) {
        let R = this.reinstatablePermissionRequests.get(r.request_id);
        if (R === void 0) {
          logForDebugging(
            `[RemoteSessionManager] Redelivered can_use_tool ${printableExcerpt(r.request_id)} already retired here \u2014 skipping`,
          );
          return;
        }
        if ((this.reinstatablePermissionRequests.delete(r.request_id), !Ge(R, r.request))) {
          (logFeatureBad("remote_permission_request", "redelivered_mismatch"),
            logForDebugging(
              `[RemoteSessionManager] Redelivered can_use_tool ${printableExcerpt(r.request_id)} differs from the request first shown under that id \u2014 not arming it`,
              { level: "warn" },
            ));
          return;
        }
        (this.retiredPermissionRequestIds.delete(r.request_id), (v = !0));
      } else if (n === "request_user_dialog") v = this.reinstatableDialogIds.has(r.request_id);
      let w = s.has(r.request_id);
      if ((this.handleControlRequest(r, {}, { reinstated: v }), !w && s.has(r.request_id)))
        (this.reinstatableDialogIds.delete(r.request_id),
          logFeatureOk(n === "can_use_tool" ? "remote_permission_redelivery" : "remote_dialog_redelivery"));
    });
  }
  recordSeenControlResponseId(e) {
    W(this.seenControlResponseIds, e);
  }
  recordSettledForwardedHookId(e) {
    W(this.settledForwardedHookIds, e);
  }
  handleControlRequest(e, { ageMs: n, attestationStatus: s, modeStamp: i, replayed: r }, S) {
    let { request_id: request_id, request: request } = e,
      w = { replayed: r, ageMs: n },
      R =
        typeof request === "object" && request !== null && Object.hasOwn(request, "subtype")
          ? request.subtype
          : void 0,
      y = unexpectedValueFingerprint(R, FORWARDED_CONTROL_REQUESTS);
    if (y !== void 0) {
      let found = HOST_HANDLED_CONTROL_REQUESTS.find((k) => k === R);
      if (
        (this.refuseControlRequest(
          request_id,
          found !== void 0
            ? `${found}, which another client answers,`
            : `a control request of a kind no client of this build handles (${y.length} characters, sha12 ${y.hash}${y.variantOfListed ? ", a variant of a listed kind" : ""})`,
          w,
        ),
        found === void 0)
      )
        this.callbacks.onControlRequestRefused?.(y);
      return;
    }
    if (typeof request_id !== "string") {
      this.refuseControlRequest(request_id, `${request.subtype} with an id that is not a string`, w);
      return;
    }
    if (request.subtype === "can_use_tool") {
      logForDebugging(`[RemoteSessionManager] Permission request for tool: ${request.tool_name}`);
      let b = this.pendingPermissionRequests.get(request_id);
      if (b !== void 0) {
        if (Ge(b, request))
          logForDebugging(
            `[RemoteSessionManager] Duplicate permission request ${printableExcerpt(String(request_id))} \u2014 already pending, skipping`,
          );
        else
          (logFeatureBad("remote_permission_request", "redelivered_mismatch"),
            logForDebugging(
              `[RemoteSessionManager] Permission request ${printableExcerpt(String(request_id))} redelivered with a different body (${printableExcerpt(String(request.tool_name))}) \u2014 keeping the one first shown (${printableExcerpt(b.tool_name)})`,
              { level: "warn" },
            ));
        return;
      }
      if (this.retiredPermissionRequestIds.has(request_id)) {
        if (this.config.seedSubagentRequests?.some((q) => q.request_id === request_id) !== !0)
          logFeatureBad("remote_permission_request", "retired_id_rearmed");
        logForDebugging(
          `[RemoteSessionManager] Permission request ${printableExcerpt(String(request_id))} arrived again after it was retired here \u2014 not arming it`,
          { level: "warn" },
        );
        return;
      }
      let k = request;
      try {
        k = structuredClone(request);
      } catch {
        k = request;
      }
      (this.pendingPermissionRequests.set(request_id, k),
        this.callbacks.onPermissionRequest(request, request_id, S, r === !0));
      return;
    }
    if (request.subtype === "request_user_dialog") {
      if (this.pendingDialogRequests.has(request_id)) {
        logForDebugging(
          `[RemoteSessionManager] Duplicate user dialog request ${request_id} \u2014 already pending, skipping`,
        );
        return;
      }
      (logForDebugging(`[RemoteSessionManager] User dialog request: ${request.dialog_kind}`),
        this.pendingDialogRequests.add(request_id),
        this.callbacks.onUserDialogRequest(request, request_id, S));
      return;
    }
    if (request.subtype === "hook_callback" && isDeviceHookRequest(request)) {
      let onForwardedHookCallback = this.callbacks.onForwardedHookCallback;
      if (!onForwardedHookCallback) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook_callback ${printableExcerpt(request_id)} \u2014 not serving device hooks here, leaving it unanswered`,
        );
        return;
      }
      if (request_id.length > ie || request.callback_id.length > ie) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook_callback ${printableExcerpt(request_id)} \u2014 an id longer than ${ie} characters, leaving it unanswered`,
        );
        return;
      }
      let k = {
          requestId: request_id,
          callbackId: request.callback_id,
          input: request.input,
          ...(typeof request.issued_at === "number" && { issuedAt: request.issued_at }),
          ...(typeof request.deadline_ms === "number" && { deadlineMs: request.deadline_ms }),
          ageMs: n,
          ...(s !== void 0 && { attestationStatus: s }),
        },
        onUndeliveredHookReplayed = this.callbacks.onUndeliveredHookReplayed;
      if (onUndeliveredHookReplayed && this.undeliveredHookIds.delete(request_id)) {
        (this.hookGiveUpsTold.delete(request_id),
          this.pendingForwardedHooks.add(request_id),
          onUndeliveredHookReplayed(k));
        return;
      }
      if (this.settledForwardedHookIds.has(request_id) || this.pendingForwardedHooks.has(request_id)) {
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook_callback ${printableExcerpt(request_id)} already answered or in hand \u2014 skipping`,
        );
        return;
      }
      (this.pendingForwardedHooks.add(request_id), onForwardedHookCallback(k));
      return;
    }
    if (on(request)) {
      let onServedChannelRequest = this.callbacks.onServedChannelRequest;
      if (!onServedChannelRequest) {
        logForDebugging(
          `[RemoteSessionManager] ${request.subtype} ${printableExcerpt(request_id)} \u2014 not serving tools here, leaving it unanswered`,
        );
        return;
      }
      if (request_id.length > ie) {
        logForDebugging(
          `[RemoteSessionManager] ${request.subtype} ${printableExcerpt(request_id)} \u2014 an id longer than ${ie} characters, leaving it unanswered`,
        );
        return;
      }
      if (this.settledServedRequestIds.has(request_id) || this.pendingServedRequests.has(request_id)) {
        logForDebugging(
          `[RemoteSessionManager] ${request.subtype} ${printableExcerpt(request_id)} already answered or in hand \u2014 skipping`,
        );
        return;
      }
      let abortController = new AbortController();
      (this.pendingServedRequests.set(request_id, { abort: abortController, subtype: request.subtype }),
        onServedChannelRequest({
          requestId: request_id,
          subtype: request.subtype,
          request: request,
          signal: abortController.signal,
          ageMs: n,
          ...(s !== void 0 && { attestationStatus: s }),
          ...(i !== void 0 && { modeStamp: i }),
        }));
      return;
    }
    this.refuseControlRequest(request_id, `${request.subtype} in a shape this client has no handler for`, w);
  }
  refuseControlRequest(e, n, { replayed: s, ageMs: i }) {
    let r = s === !0 && (i === void 0 || i > Yt || this.replayedRefusalsAnswered >= zt);
    if (this.config.controlOnly === !0 || typeof e !== "string" || r) {
      logForDebugging(
        `[RemoteSessionManager] ${n}${typeof e === "string" ? ` ${printableExcerpt(e)}` : ""} \u2014 leaving it unanswered`,
      );
      return;
    }
    if (s === !0) this.replayedRefusalsAnswered++;
    (logForDebugging(
      `[RemoteSessionManager] ${n} ${printableExcerpt(e)} \u2014 answering that it is not supported`,
    ),
      this.sendResponse(
        { type: "control_response", response: { subtype: "error", request_id: e, error: R7 } },
        null,
      ));
  }
  signedOpts(e) {
    return { ...(e ?? {}), ...(this.config.eventSigner && { eventSigner: this.config.eventSigner }) };
  }
  async sendMessage(e, n, s) {
    return this.send(
      e,
      n,
      (i, r) => sendEventToRemoteSession(this.config.sessionId, i, this.signedOpts(r)),
      !1,
      s,
    );
  }
  async sendMessageVia(e, n, s) {
    return this.send(e, n, s, !0);
  }
  async send(e, n, s, i, r) {
    (logForDebugging(`[RemoteSessionManager] Sending message to session ${this.config.sessionId}`),
      this.reviveStreamForUserSend(),
      H("out", { kind: "sendMessage", content: e, opts: n }));
    let currentSendGates = this.currentSendGates(),
      h = !i && currentSendGates.length === 0 && this.chainedSends === 0,
      v = null,
      w = s,
      R;
    try {
      R = await (h ? w(e, n) : this.sendBehindGates(currentSendGates, e, n, w, r));
    } catch (error) {
      throw (
        logForDebugging(
          `[RemoteSessionManager] Send to session ${this.config.sessionId} threw: ${errorMessage(error)}`,
          { level: "error" },
        ),
        logFeatureBad("remote_send_message", "remote_send_message_threw"),
        error
      );
    }
    if (!R.ok && R.withheld)
      (logForDebugging(`[RemoteSessionManager] Message withheld by a send gate: ${R.reason}`),
        logFeatureSad(
          "remote_send_message",
          R.reason === CANCELLED
            ? "remote_send_message_cancelled"
            : R.reason === WITHDRAWN
              ? "remote_send_message_withdrawn"
              : "remote_send_message_withheld",
        ));
    else if (!R.ok)
      (logForDebugging(
        `[RemoteSessionManager] Failed to send message to session ${this.config.sessionId}: ${R.reason}`,
        { level: "error" },
      ),
        logFeatureBad("remote_send_message", "remote_send_message_failed"));
    else (logFeatureOk("remote_send_message"), (this.sentAMessage = !0));
    return R;
  }
  addSendGate(e, n = {}) {
    let s = { gate: e, onRelease: n.onRelease ?? "send", onExit: n.onExit ?? "as_release" };
    return (
      this.sendGates.add(s),
      () => {
        this.sendGates.delete(s);
      }
    );
  }
  gateSendsOnSettings(e) {
    let n = () => {},
      s = holdFirstSendForSettings(e, {
        retire: () => n(),
        noticeAfterMs: this.config.homeSeedWaitNoticeMs,
        typedAheadGraceMs: this.config.homeSeedTypedAheadGraceMs,
      });
    if (s === null) return;
    n = this.addSendGate(
      (i) => (
        i.released.then(() => {
          if (!i.exiting()) this.firstSendReleased = !0;
        }),
        s(i)
      ),
      { onRelease: "withhold", onExit: "await" },
    );
  }
  async sendWithheldInitialPrompt(e) {
    if (e.sent) return;
    e.sent = !0;
    let now = Date.now(),
      s = this.config.withheldPromptBackoffMs ?? Qt,
      i = 0,
      r,
      S = async (k, P) => {
        ((i += 1), (r ??= Date.now()));
        let q = await sendEventToRemoteSession(this.config.sessionId, k, this.signedOpts(P));
        if (
          q.ok ||
          i >= Xt ||
          !Zt(sendFailureKind(q)) ||
          this.firstSendReleased ||
          Date.now() - r > (this.config.withheldPromptRetryWindowMs ?? Jt)
        )
          return q;
        if ((await sleep(s * i, this.lifetime.signal), this.exitFlushRequested && !this.firstSendReleased))
          return ((i += 1), sendEventToRemoteSession(this.config.sessionId, k, this.signedOpts(P)));
        return this.lifetime.signal.aborted || this.firstSendReleased ? q : S(k, P);
      },
      h = this.send(e.content, { uuid: e.uuid }, S, !0, 0).catch((k) => ({
        ok: !1,
        reason: errorMessage(k),
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
    if (
      (logEvent("tengu_home_seed_prompt_resequenced", {
        success: v.ok,
        withheld_for: fromEnum(
          e.followsPermissionMode
            ? "signed_send"
            : e.heldOnlyForToolsCheck
              ? "tools_check"
              : this.config.homeSeed !== void 0
                ? "home_seed"
                : "other",
        ),
        attempts: i,
        reason: fromEnum(v.ok ? "ok" : w ? "aborted" : sendFailureKind(v)),
        duration_ms: Date.now() - now,
      }),
      v.ok)
    )
      ((e.sent = !0), this.callbacks.onWithheldPromptSent?.());
    if (w || v.ok) return;
    let R = sendFailureKind(v),
      y = R === "timeout" || R === "network" || R === "unknown",
      b;
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
        b = nt[R];
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
    let S = !1,
      h = !1,
      v = !1,
      w = () => {},
      promise = new Promise((M) => {
        w = M;
      }),
      y = (M, O) => {
        ((S = M), (h = O), (v = !0), w(), this.tellWithholdableHeld());
      },
      b = () => {},
      promise_2 = new Promise((M) => {
        b = M;
      }),
      P = () => {},
      promise_3 = new Promise((M) => {
        P = M;
      }),
      fe = {
        messageUuid: s?.uuid,
        ...(r !== void 0 && { submittedAtMs: r }),
        released: promise,
        withdrawn: promise_2,
        exiting: () => S,
        final: () => h,
        decided: promise_3,
      },
      E = () => {},
      promise_4 = new Promise((M) => {
        E = M;
      }),
      lastHeld = this.lastHeld,
      j = () => {},
      ne = !1,
      G = !1,
      mapped = e.map(() => {
        return;
      }),
      X = new Set(e),
      mapped_2 = e.map((M, O) =>
        runSendGate(M.gate, fe).then((K) => ((mapped[O] = K), X.delete(M), this.tellWithholdableHeld(), K)),
      ),
      promise_5 = new Promise((M) => {
        for (let O of mapped_2)
          O.then((K) => {
            if (K !== void 0) M(K);
          });
      }),
      winner = Promise.race([
        Promise.all(mapped_2).then(he),
        promise_5,
        promise.then(
          () =>
            he(mapped) ??
            withholdOnRelease(X, S) ??
            Promise.all(mapped_2.filter((M, O) => S && e[O]?.onExit === "await")).then(he),
        ),
        promise_2.then(() => Je(!0)),
      ]),
      se = () => {
        ((v = !0), P(), this.tellWithholdableHeld());
      };
    winner.then(se, se);
    let Q = winner
        .then((M) => Promise.race([lastHeld.posted, promise.then(() => lastHeld.issued)]).then(() => M))
        .then((M) => {
          let O = M ?? Je(ne);
          if ((j(), (G = !0), E(), O !== void 0)) return Qe(O);
          return (this.reviveStreamForUserSend(), i(n, s));
        }),
      I = {
        messageUuid: s?.uuid,
        release: y,
        issuedYet: () => G,
        settledYet: () => v,
        withheldOnRelease: () => he(mapped) !== void 0 || withholdOnRelease(X, !1) !== void 0,
        withdraw: () => {
          ((ne = !0), j(), b());
        },
        issued: promise_4,
        posted: Q,
      };
    return (
      (this.lastHeld = {
        issued: promise_4,
        posted: Q.then(
          () => {
            return;
          },
          () => {
            return;
          },
        ),
      }),
      this.heldSends.add(I),
      (j = () => {
        (this.heldSends.delete(I), this.tellWithholdableHeld());
      }),
      sleep(0, this.lifetime.signal).then(() => this.tellWithholdableHeld()),
      Q.then(
        () => this.leaveChain(I, E),
        () => this.leaveChain(I, E),
      ),
      winner.then((M) => (M === void 0 ? Q : Qe(M)))
    );
  }
  withdrawHeldSend(e) {
    let filtered = [...this.heldSends].filter((s) => s.messageUuid === e && !s.issuedYet());
    return (filtered.forEach((s) => s.withdraw()), filtered.length > 0);
  }
  heldSendUuids() {
    return [...this.heldSends].flatMap((e) =>
      e.messageUuid !== void 0 && !e.issuedYet() ? [e.messageUuid] : [],
    );
  }
  leaveChain(e, n) {
    (this.chainedSends--, this.heldSends.delete(e), this.tellWithholdableHeld(), n());
  }
  hasWithholdableHeldSend() {
    return this.withholdableHeldSends().length > 0;
  }
  countWithholdableHeldSends() {
    return this.withholdableHeldSends().length;
  }
  cancelHeldSends() {
    let withholdableHeldSends = this.withholdableHeldSends();
    return (withholdableHeldSends.forEach((n) => n.release(!1, !1)), withholdableHeldSends.length);
  }
  withholdableHeldSends() {
    return [...this.heldSends].filter((e) => !e.issuedYet() && !e.settledYet() && e.withheldOnRelease());
  }
  tellWithholdableHeld() {
    let hasWithholdableHeldSend = this.hasWithholdableHeldSend();
    if (hasWithholdableHeldSend === this.withholdableHeldTold) return;
    this.withholdableHeldTold = hasWithholdableHeldSend;
    try {
      this.callbacks.onWithholdableHeldChanged?.(hasWithholdableHeldSend);
    } catch (error) {
      logError(
        Error(`[RemoteSessionManager] onWithholdableHeldChanged listener failed: ${errorMessage(error)}`),
      );
    }
  }
  async releaseHeldSends(e = en, { exiting: n = !1, final: s = !1, keepWithheld: i = !1 } = {}) {
    if (n) this.exitFlushRequested = !0;
    let filtered = [...this.heldSends].filter((h) => !(i && h.withheldOnRelease()));
    filtered.forEach((h) => h.release(n, s));
    let mapped = filtered.map(() => ({ kind: "waiting" }));
    return (
      await withDeadline(
        Promise.allSettled([
          ...filtered.map((h, v) =>
            h.posted.then(
              (w) => {
                mapped[v] = deliveryOutcome(w);
              },
              () => {
                mapped[v] = { kind: "unconfirmed" };
              },
            ),
          ),
          ...(this.withheldPromptInFlight ? [this.withheldPromptInFlight] : []),
        ]),
        e,
      ),
      filtered.forEach((h, v) => {
        if (mapped[v]?.kind !== "waiting") return;
        if (h.issuedYet()) mapped[v] = { kind: "unconfirmed" };
        else if (s) (h.withdraw(), (mapped[v] = { kind: "unsent" }));
      }),
      {
        unsent: count(mapped, (h) => h.kind === "unsent"),
        refused: mapped.flatMap((h) => (h.kind === "refused" ? [h.reason] : [])),
        unconfirmed: count(mapped, (h) => h.kind === "unconfirmed"),
        stillHeld: count(mapped, (h) => h.kind === "waiting"),
      }
    );
  }
  async sendBashCommand(e, n) {
    (logForDebugging(`[RemoteSessionManager] Sending bash_command to session ${this.config.sessionId}`),
      this.reviveStreamForUserSend());
    let s = await sendBashCommandToRemoteSession(this.config.sessionId, e, this.signedOpts(n));
    if (!s.ok)
      (logForDebugging(
        `[RemoteSessionManager] Failed to send bash_command to session ${this.config.sessionId}: ${s.reason}`,
        { level: "error" },
      ),
        logFeatureBad("remote_send_bash", "remote_send_bash_failed"));
    else logFeatureOk("remote_send_bash");
    return s;
  }
  reviveStreamForUserSend() {
    if (this.client?.reviveAfterExhaustion()) return (this.callbacks.onReconnecting?.(), !0);
    return !1;
  }
  sendResponse(e, n, s, i) {
    let client = this.client;
    if (!client) return;
    let startTime = performance.now(),
      h =
        i === void 0
          ? void 0
          : (y) => {
              try {
                i(y, Math.round(performance.now() - startTime));
              } catch (error) {
                logForDebugging(
                  `[RemoteSessionManager] An answer's post listener threw; the answer's fate is unchanged: ${errorMessage(error)}`,
                  { level: "warn" },
                );
              }
              return y;
            };
    if (n === null || this.config.keepUndeliveredResponses !== !0) {
      let sendControlResponse = client.sendControlResponse(e, void 0, Xe(n));
      h === void 0 || sendControlResponse.then(h);
      return;
    }
    let request_id = e.response.request_id,
      R = this.undeliveredResponses.get(request_id) ?? {
        response: e,
        kind: n,
        uuid: randomUUID(),
        failures: 0,
        inFlight: !1,
        giveUpOnSettle: null,
        timer: null,
        told: !1,
      };
    if (((R.response = e), s !== void 0)) R.request = s;
    (this.undeliveredResponses.set(request_id, R), this.postKeptResponse(client, R, h));
  }
  postKeptResponse(e, n, s) {
    n.inFlight = !0;
    let sendControlResponse = e.sendControlResponse(n.response, n.uuid, Xe(n.kind));
    (s === void 0 ? sendControlResponse : sendControlResponse.then(s)).then(
      (r) => this.settleResponsePost(n, r),
      (r) => {
        (logForDebugging(`[RemoteSessionManager] Posting an answer threw: ${errorMessage(r)}`, {
          level: "warn",
        }),
          this.settleResponsePost(n, { outcome: "failed", cause: "network" }));
      },
    );
  }
  settleResponsePost(e, n) {
    e.inFlight = !1;
    let request_id = e.response.response.request_id;
    if (this.undeliveredResponses.get(request_id) !== e) return;
    if (n.outcome === "accepted") {
      if (e.giveUpOnSettle === "overtaken") {
        this.giveUp(e, "overtaken");
        return;
      }
      if ((this.dropKept(e), e.standIn)) return;
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
      (this.dropKept(e),
        logForDebugging(
          `[RemoteSessionManager] Answer for ${printableExcerpt(request_id)} has no session to go to (${n.outcome === "failed" && n.cause === "http" ? `http ${n.status}` : "session not active"}); dropped`,
        ),
        logFeatureSad("remote_control_response", "session_gone"));
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
      (logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(request_id)} was refused by the service (http ${n.status}); not re-sending`,
        { level: "warn" },
      ),
        this.giveUp(e, "undelivered", "refused"));
      return;
    }
    if (!this.client?.isConnected()) {
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(request_id)} did not reach the session while the stream is down; it goes again at reconnect`,
      );
      return;
    }
    if (((e.failures += 1), e.failures > ze)) {
      (logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(request_id)} could not be delivered after ${e.failures} attempts; giving up`,
        { level: "warn" },
      ),
        this.giveUp(e));
      return;
    }
    if (e.failures === 1) logFeatureSad("remote_control_response", "resend");
    this.scheduleResponseResend(e);
  }
  postRefusalStandIn(e, n) {
    let client = this.client,
      response = e.response.response;
    if (
      e.kind !== "tool" ||
      e.standIn ||
      client === null ||
      response.subtype !== "success" ||
      n.status === 401 ||
      n.status === 403
    )
      return !1;
    let byteLength = Buffer.byteLength(jsonStringify(response.response), "utf8");
    return (
      logForDebugging(
        `[RemoteSessionManager] Answer for ${printableExcerpt(response.request_id)} was refused by the service (http ${n.status}${n.tooLarge ? `, too large: this machine's configured limit is ${aNt()} bytes, so the service's is lower` : ""}, ${byteLength} bytes); sending an error in its place`,
        { level: "warn" },
      ),
      logFeatureSad("remote_control_response", n.tooLarge ? "refused_too_large" : "refused_stand_in"),
      (e.response = {
        type: "control_response",
        response: {
          subtype: "success",
          request_id: response.request_id,
          response: {
            result: servedAnswerTooLargeText({
              answer: response.response,
              bytes: byteLength,
              status: n.status,
              tooLarge: n.tooLarge === !0,
            }),
          },
        },
      }),
      (e.uuid = randomUUID()),
      (e.standIn = !0),
      (e.failures = 0),
      H("out", e.response),
      this.postKeptResponse(client, e),
      !0
    );
  }
  dropKept(e) {
    (this.clearResendTimer(e), this.undeliveredResponses.delete(e.response.response.request_id));
  }
  giveUp(e, n = "undelivered", s = n) {
    let request_id = e.response.response.request_id;
    if (e.inFlight) {
      if (e.giveUpOnSettle !== "overtaken") e.giveUpOnSettle = n;
      return;
    }
    if ((this.dropKept(e), e.kind === "hook")) W(this.hookGiveUpsTold, request_id);
    if (n === "undelivered" && (e.kind === "dialog" || e.kind === "permission"))
      if ((this.seenControlResponseIds.delete(request_id), e.kind === "permission")) {
        if (e.request !== void 0) setCapped(this.reinstatablePermissionRequests, request_id, e.request);
      } else W(this.reinstatableDialogIds, request_id);
    if (n === "undelivered" && e.kind === "hook" && s !== "refused") W(this.undeliveredHookIds, request_id);
    if ((logFeatureBad("remote_control_response", s), e.told)) return;
    ((e.told = !0), this.callbacks.onResponseUndelivered?.(request_id, e.kind, n));
  }
  scheduleResponseResend(e) {
    this.clearResendTimer(e);
    let n = st[Math.min(e.failures, ze) - 1] ?? 45000;
    e.timer = setTimeout(this.resendOnTimer, n, e.response.response.request_id);
  }
  resendOnTimer = (e) => {
    let n = this.undeliveredResponses.get(e),
      client = this.client;
    if (!n || !client) return;
    if (((n.timer = null), !n.inFlight)) (H("out", n.response), this.postKeptResponse(client, n));
  };
  clearResendTimer(e) {
    if (e.timer !== null) (clearTimeout(e.timer), (e.timer = null));
  }
  resendUndeliveredResponses() {
    let client = this.client;
    if (!client) return;
    for (let n of this.undeliveredResponses.values())
      if ((this.clearResendTimer(n), !n.inFlight)) (H("out", n.response), this.postKeptResponse(client, n));
  }
  giveUpUndeliveredResponses() {
    for (let e of [...this.undeliveredResponses.values()]) this.giveUp(e);
  }
  giveUpKeptServedResults() {
    for (let e of [...this.undeliveredResponses.values()])
      if (e.kind === "tool") ((e.inFlight = !1), this.giveUp(e, e.giveUpOnSettle ?? "undelivered"));
  }
  dropUndeliveredResponses() {
    for (let e of [...this.undeliveredResponses.values()]) {
      if (e.giveUpOnSettle === "overtaken") {
        ((e.inFlight = !1), this.giveUp(e, "overtaken"));
        continue;
      }
      (this.dropKept(e), logFeatureSad("remote_control_response", "session_gone"));
    }
  }
  respondToPermissionRequest(e, n) {
    let s = this.pendingPermissionRequests.get(e);
    if (!s) {
      (logError(Error(`[RemoteSessionManager] No pending permission request with ID: ${e}`)),
        logFeatureBad("remote_permission_respond", "remote_permission_respond_no_pending"));
      return;
    }
    (this.retirePermissionRequest(e), this.recordSeenControlResponseId(e), this.reviveStreamForUserSend());
    let i = this.config.nameRepositoryTrustAnswers === !0 && KNe(s.tool_name),
      r = !1,
      S = this.config.pinComputerFolderAllow?.() === !0 && m2(s.tool_name),
      h =
        (i || S) && n.behavior === "allow"
          ? {
              behavior: "allow",
              updatedInput: s.input,
              ...(n.toolUseID !== void 0 && { toolUseID: n.toolUseID }),
            }
          : n,
      v = buildControlResponse(
        e,
        h,
        this.config.nameToolOnPermissionAllow === !0 || i || r ? s.tool_name : void 0,
        i && n.behavior === "deny" && n.decisionClassification === "user_reject",
      );
    (logForDebugging(`[RemoteSessionManager] Sending permission response: ${n.behavior}`),
      H("out", v),
      this.sendResponse(v, "permission", s),
      logFeatureOk("remote_permission_respond"));
  }
  respondToUserDialogRequest(e, n) {
    if (!this.pendingDialogRequests.delete(e)) {
      (logError(Error(`[RemoteSessionManager] No pending user dialog request with ID: ${e}`)),
        logFeatureBad("remote_dialog_respond", "remote_dialog_respond_no_pending"));
      return;
    }
    (this.recordSeenControlResponseId(e), this.reviveStreamForUserSend());
    let s = { type: "control_response", response: { subtype: "success", request_id: e, response: n } };
    (logForDebugging(`[RemoteSessionManager] Sending user dialog response: ${n.behavior}`),
      H("out", s),
      this.sendResponse(s, "dialog"),
      logFeatureOk("remote_dialog_respond"));
  }
  releaseForwardedHook(e) {
    if ((this.pendingForwardedHooks.delete(e), this.settledForwardedHookIds.has(e)))
      W(this.hookGiveUpsTold, e);
  }
  respondToForwardedHook(e, n) {
    if (!this.pendingForwardedHooks.delete(e))
      return (
        logForDebugging(
          `[RemoteSessionManager] Forwarded hook request ${printableExcerpt(e)} is no longer pending \u2014 answer not sent`,
        ),
        !1
      );
    if (!this.client) return !1;
    (this.recordSeenControlResponseId(e),
      this.recordSettledForwardedHookId(e),
      this.reviveStreamForUserSend());
    let i = { type: "control_response", response: { subtype: "success", request_id: e, response: n } };
    return (H("out", i), this.sendResponse(i, "hook"), !0);
  }
  respondToServedChannelRequest(e, n, s) {
    let i = this.pendingServedRequests.get(e);
    if (!i)
      return (
        logForDebugging(
          `[RemoteSessionManager] served request ${printableExcerpt(e)} is no longer pending \u2014 result not sent`,
        ),
        !1
      );
    if ((this.pendingServedRequests.delete(e), !this.client)) return !1;
    (this.recordSeenControlResponseId(e), W(this.settledServedRequestIds, e), this.reviveStreamForUserSend());
    let S = {
      type: "control_response",
      response: { subtype: "success", request_id: e, response: capToolResultSize(n) },
    };
    return (
      H("out", S),
      this.sendResponse(S, i.subtype === "remote_tools_probe" ? null : "tool", void 0, s),
      !0
    );
  }
  releaseServedChannelRequest(e) {
    this.pendingServedRequests.delete(e);
  }
  countServedToolCallsInHand() {
    return count(
      [...this.pendingServedRequests.values()],
      ({ subtype: subtype }) => subtype === "remote_tool_call",
    );
  }
  retireServedRequest(e, n) {
    let s = this.pendingServedRequests.get(e);
    if (!s) return !1;
    return (
      this.pendingServedRequests.delete(e),
      logForDebugging(
        `[RemoteSessionManager] served request ${printableExcerpt(e)} ${n === "worker" ? "cancelled by the worker" : "dropped with the stream"}`,
      ),
      s.abort.abort(),
      this.callbacks.onServedChannelRequestCancelled?.(e, n),
      !0
    );
  }
  isConnected() {
    return this.client?.isConnected() ?? !1;
  }
  noteWorkerLive() {
    if (this.workerSeenThisConnection) return;
    ((this.workerSeenThisConnection = !0), this.callbacks.onWorkerLive?.());
  }
  markServing(e) {
    this.serving = e;
  }
  workerLive() {
    return this.isConnected() && this.workerSeenThisConnection;
  }
  sendsInFlight() {
    return this.client?.sendsInFlight() ?? { count: 0, settled: Promise.resolve() };
  }
  flushSends(e) {
    return this.client?.flushSends(e) ?? Promise.resolve();
  }
  cancelSession() {
    (logForDebugging("[RemoteSessionManager] Sending interrupt signal"),
      (this.firstSendReleased = !0),
      this.reviveStreamForUserSend());
    let e = () => {
      (H("out", { kind: "control_request", subtype: "interrupt" }),
        this.client?.sendControlRequest({ subtype: "interrupt" }));
    };
    if (this.heldSends.size === 0) {
      e();
      return;
    }
    let n = () => {
      if (this.pendingInterrupt === n) ((this.pendingInterrupt = null), e());
    };
    ((this.pendingInterrupt = n), this.releaseHeldSends().then(n, n));
  }
  sendControlRequest(e, n) {
    return this.postControlRequest(e, n).response;
  }
  postControlRequest(e, n) {
    let { promise: promise, resolve: resolve } = Promise.withResolvers(),
      r = async () => {
        let h = null;
        try {
          if (n?.signal?.aborted) throw new AbortError();
          if (!n?.background) this.reviveStreamForUserSend();
          if (
            (H("out", { kind: "control_request", ...e }),
            (h = this.client?.postControlRequest(e, this.onControlRequestPostFailed) ?? null),
            h === null)
          )
            throw Error("[RemoteSessionManager] Cannot send: not connected");
        } finally {
          if (h === null) resolve(je);
        }
        return (h.posted.then(resolve, () => resolve(je)), this.awaitControlResponse(h.requestId, e, n));
      },
      S = n?.answerExpected === !1 ? r() : withOutcomeTelemetry("remote_control_rpc", r);
    return { posted: promise, response: S };
  }
  awaitControlResponse(e, n, s) {
    if (n.subtype === "set_model") this.pendingModelSwitchIds.add(e);
    let i = Me(n.subtype, s?.timeoutMs),
      r = this.workerStarting ? s?.awaitWorkerStart : void 0,
      S = r ? Math.max(Vkr, i) : i;
    return new Promise((h, v) => {
      let w = setTimeout(this.onControlRequestTimeout, S, e, n.subtype, S),
        R = s?.signal,
        y = R ? () => this.cancelControlRequest(e) : void 0;
      if (R && y) R.addEventListener("abort", y, { once: !0 });
      if (
        (this.pendingControlRequests.set(e, {
          resolve: (b) => h(b),
          reject: v,
          timer: w,
          timeoutMs: i,
          subtype: n.subtype,
          onProgress: s?.onProgress,
          removeAbortListener: R && y ? () => R.removeEventListener("abort", y) : void 0,
          ...(s?.background && { background: !0 }),
          ...(s?.onEchoed && { onEchoed: s.onEchoed }),
          ...(r && { awaitingWorker: r }),
        }),
        r)
      )
        (logForDebugging(
          `[RemoteSessionManager] control_request ${e} (${n.subtype}) waits for the worker; its ${i / 1000}s limit starts when that wait ends`,
        ),
          this.tellAwaitingWorker(r, !0));
    });
  }
  workerSendsNow() {
    return this.sendsNow;
  }
  workerMovesBash() {
    return this.movesBash === !0;
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
    this.workerStarting = !0;
  }
  endWorkerStart() {
    if (!this.workerStarting) return;
    this.workerStarting = !1;
    let e = [];
    for (let [n, s] of this.pendingControlRequests) {
      if (s.awaitingWorker === void 0) continue;
      clearTimeout(s.timer);
      let i = setTimeout(this.onControlRequestTimeout, s.timeoutMs, n, s.subtype, s.timeoutMs);
      (this.pendingControlRequests.set(n, { ...s, timer: i, awaitingWorker: void 0 }),
        e.push(s.awaitingWorker));
    }
    logForDebugging(
      `[RemoteSessionManager] The wait for the worker ended; ${e.length} waiting control request(s) start their own limit`,
    );
    for (let n of e) this.tellAwaitingWorker(n, !1);
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
    (this.pendingControlRequests.delete(e),
      clearTimeout(n.timer),
      n.removeAbortListener?.(),
      logForDebugging(
        `[RemoteSessionManager] control_request ${e} (${n.subtype}) was not delivered \u2014 failing it`,
        { level: "warn" },
      ),
      n.reject(new ControlRequestNotDeliveredError(n.subtype)));
  };
  onControlRequestTimeout = (e, n, s) => {
    this.pendingModelSwitchIds.delete(e);
    let i = this.pendingControlRequests.get(e);
    if (!i) return;
    if ((this.pendingControlRequests.delete(e), i.removeAbortListener?.(), i.awaitingWorker !== void 0))
      this.endWorkerStart();
    i.reject(new ControlRequestTimeoutError(n, s));
  };
  cancelControlRequest(e) {
    let n = this.pendingControlRequests.get(e);
    if (!n) return;
    if (!n.background) this.reviveStreamForUserSend();
    (this.pendingControlRequests.delete(e),
      this.pendingModelSwitchIds.delete(e),
      clearTimeout(n.timer),
      logForDebugging(`[RemoteSessionManager] Cancelling control request ${e} (${n.subtype})`),
      H("out", { kind: "control_cancel_request", requestId: e }),
      this.client?.sendControlCancelRequest(e),
      n.reject(new AbortError()));
  }
  getSessionId() {
    return this.config.sessionId;
  }
  disconnect() {
    logForDebugging("[RemoteSessionManager] Disconnecting");
    let withheldInitialPrompt = this.config.withheldInitialPrompt;
    if (withheldInitialPrompt !== void 0 && this.withheldPromptInFlight !== null && !this.firstSendReleased)
      withheldInitialPrompt.sent = !1;
    (this.lifetime.abort(), this.pendingInterrupt?.(), this.client?.close(), (this.client = null));
    for (let n of [...this.undeliveredResponses.values()])
      if ((this.clearResendTimer(n), n.giveUpOnSettle !== null))
        ((n.inFlight = !1), this.giveUp(n, n.giveUpOnSettle));
    (this.undeliveredResponses.clear(),
      this.undeliveredHookIds.clear(),
      this.hookGiveUpsTold.clear(),
      this.pendingPermissionRequests.clear(),
      this.pendingDialogRequests.clear());
    for (let pendingForwardedHook of this.pendingForwardedHooks)
      this.callbacks.onForwardedHookCancelled?.(pendingForwardedHook, "disconnected");
    this.pendingForwardedHooks.clear();
    for (let n of [...this.pendingServedRequests.keys()]) this.retireServedRequest(n, "disconnected");
    ((this.workerSeenThisConnection = !1), (this.workerStarting = !1));
    for (let n of this.pendingControlRequests.values())
      (clearTimeout(n.timer),
        n.removeAbortListener?.(),
        n.reject(Error("[RemoteSessionManager] Disconnected")));
    (this.pendingControlRequests.clear(), this.pendingModelSwitchIds.clear());
  }
  reconnect() {
    (logForDebugging("[RemoteSessionManager] Reconnecting SSE stream"), this.client?.reconnect());
  }
  reconnectAfterSuspend() {
    this.client?.reconnectAfterSuspend();
  }
}
//@ chunk-08945j39.js:75642-75789 placement
function isDeviceHookRequest(e) {
  return (
    typeof e.callback_id === "string" &&
    (typeof e.issued_at === "number" ||
      typeof e.deadline_ms === "number" ||
      parseDeviceHookId(e.callback_id) !== null)
  );
}
//@ chunk-08945j39.js:75789-75835 placement
function on(e) {
  return _Ce.includes(e.subtype);
}
//@ chunk-08945j39.js:75835-75886 placement
function Xe(e) {
  return e === "tool" ? { timeoutMs: tn } : {};
}
//@ chunk-08945j39.js:75886-76097 placement
function capToolResultSize(e) {
  let byteLength = Buffer.byteLength(jsonStringify(e), "utf8"),
    s = aNt();
  if (byteLength <= s) return e;
  return {
    result: {
      content: [
        {
          type: "text",
          text: `(the result was too large to return: ${byteLength} bytes, over the ${s}-byte limit)`,
        },
      ],
      isError: !0,
    },
  };
}
//@ chunk-08945j39.js:76097-76307 placement
function runSendGate(e, n) {
  let s = (i) => {
    logForDebugging(`[RemoteSessionManager] send gate failed, message goes anyway: ${errorMessage(i)}`, {
      level: "warn",
    });
    return;
  };
  try {
    return e(n).then((i) => (dn(i) ? i : void 0), s);
  } catch (error) {
    return Promise.resolve(s(error));
  }
}
//@ chunk-08945j39.js:76307-76398 placement
function dn(e) {
  return typeof e === "object" && e !== null && e.go === !1 && typeof e.reason === "string";
}
//@ chunk-08945j39.js:76398-76444 placement
function he(e) {
  return e.find((n) => n !== void 0);
}
//@ chunk-08945j39.js:76444-76501 placement
function Qe(e) {
  return { ok: !1, reason: e.reason, withheld: !0 };
}
/**
 * 把发送结果映射为投递结果：sent、unsent、refused 或 unconfirmed。
 */
//@ chunk-08945j39.js:76501-76834 placement
function deliveryOutcome(e) {
  if (e.ok) return { kind: "sent" };
  switch (sendFailureKind(e)) {
    case "withheld":
      return e.reason === CANCELLED || e.reason === WITHDRAWN
        ? { kind: "unsent" }
        : { kind: "refused", reason: e.reason };
    case "http_4xx":
    case "http_429":
    case "not_first_party":
      return { kind: "refused", reason: e.reason };
    case "server":
    case "timeout":
    case "network":
    case "unknown":
      return { kind: "unconfirmed" };
  }
}
//@ chunk-08945j39.js:76834-76884 placement
function Je(e) {
  return e ? { go: !1, reason: WITHDRAWN } : void 0;
}
//@ chunk-08945j39.js:76884-77006 placement
function withholdOnRelease(e, n) {
  return [...e].some(
    ({ onRelease: onRelease, onExit: onExit }) => onRelease === "withhold" && !(n && onExit === "await"),
  )
    ? { go: !1, reason: CANCELLED }
    : void 0;
}
//@ chunk-08945j39.js:77006-77026 placement
var _en = 100,
  nCs = 500;
/**
 * 解析事件的 sequence_num 为整数（缺失或无效时为 undefined）。
 */
//@ chunk-08945j39.js:77026-77154 placement
function parseSequenceNum(e) {
  let n = e?.sequence_num === void 0 ? void 0 : parseInt(String(e.sequence_num), 10);
  return n !== void 0 && !isNaN(n) ? n : void 0;
}
//@ chunk-08945j39.js:77154-77179 placement
class $Nn extends Error {}
//@ chunk-08945j39.js:77179-77211 placement
var X_TRUSTED_DEVICE_TOKEN = "X-Trusted-Device-Token";
/**
 * 构造远程会话 API 请求配置：会话 URL 与请求头；需要时附带以续期设备令牌重建请求头的函数。
 */
//@ chunk-08945j39.js:77211-77499 placement
async function getSessionRequestConfig(e, n, { recoverDeviceProof: s = !1 } = {}) {
  let { accessToken: accessToken, profile: profile } = await prepareApiRequest(n),
    S = {
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
function fetchSessionEvents(e, n, s, i) {
  return Dt.get(`${e}/events`, {
    headers: n,
    params: s,
    timeout: 15000,
    validateStatus: () => !0,
    maxContentLength: i ?? -1,
  }).catch(() => null);
}
//@ chunk-08945j39.js:77645-78703 placement
async function renewDeviceTokenAndRetry(e, n, s, i) {
  let r = await fetchSessionEvents(e.sessionUrl, e.headers, n, i),
    headersForRenewedDeviceToken = e.headersForRenewedDeviceToken;
  if (r?.status === 403 && headersForRenewedDeviceToken !== void 0) {
    let R = !1,
      y = await resendAfterUntrustedDevice(
        r,
        e.headers[X_TRUSTED_DEVICE_TOKEN],
        async (b) => {
          let k = await headersForRenewedDeviceToken(b).then(
            (P) => fetchSessionEvents(e.sessionUrl, P, n, i),
            () => null,
          );
          if (k === null) throw ((R = !0), Error("no answer"));
          return k;
        },
        "cloud_session",
      );
    if (R) return (logForDebugging(`[${s}] no answer after renewing the device token`), null);
    if (
      y.status === 403 &&
      isTrustedDeviceGateEnabled() &&
      classifyElevatedAuthError(y.data) === "untrusted_device"
    )
      throw (
        logForDebugging(`[${s}] HTTP 403 untrusted_device`),
        new $Nn("the service does not accept a trusted-device token from this computer")
      );
    r = y;
  }
  if (!r || r.status !== 200) return (logForDebugging(`[${s}] HTTP ${r?.status ?? "error"}`), null);
  if (r.data === null || typeof r.data !== "object")
    return (logForDebugging(`[${s}] non-object 200 body`), null);
  let h = Array.isArray(r.data.data) ? r.data.data : [],
    v = [];
  for (let R = h.length - 1; R >= 0; R--) {
    let y = h[R];
    if (y?.payload)
      v.push({
        payload: y.payload,
        createdAt: y.created_at,
        source: y.source,
        sequenceNum: parseSequenceNum(y),
      });
  }
  let w = r.data.next_cursor ?? null;
  return {
    events: v,
    firstId: w,
    hasMore: w !== null,
    droppedRows: h.length - v.length,
    newestSequenceNum: parseSequenceNum(h[0]),
  };
}
/**
 * 是否是可中继的控制帧：control_request（subtype 在允许集合内）或 control_response。
 */
//@ chunk-fp6aqx1j.js:16781-16916 fingerprint = isSDKMessage (0.72)
function isRelayableControlFrame(frame) {
  if (!isPlainObject(frame)) return !1;
  return frame.type === "control_request"
    ? isPlainObject(frame.request) && SETTINGS_CONTROL_SUBTYPES.has(frame.request.subtype)
    : frame.type === "control_response";
}

export {
  Wt,
  CONTROL_REQUEST_SCHEMAS,
  _en,
  renewDeviceTokenAndRetry,
  getSessionRequestConfig,
  RemoteSessionManager,
  CANCELLED,
  formatUndeliveredAnswerNotice,
  tCs,
  isRelayableControlFrame,
  WITHDRAWN,
  $Nn,
  printableExcerpt,
  nCs,
  parseSequenceNum,
  xmo,
  eCs,
  Xkr,
};

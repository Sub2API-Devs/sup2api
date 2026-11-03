/**
 * remote/SessionsV2Client.ts
 *
 * Sessions v2 客户端（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-08945j39.js (12)
 * attribution: placement 11, affinity 1
 */
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import {
  Ot,
  hasToolResultContent,
  hasNonTextContent,
  ee,
  isHookCallbackControlRequest,
} from "./controlRequestShape.js";
import { createGzipFetchWrapper } from "../services/api/gzipRequestBody.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, T } from "../../vendor/zod/v4/classic/schemas.js";
import { BoundedUUIDSet } from "../bridge/bridgeMessaging.js";
import { withDeadline, backoffDelayMs } from "../utils/sleep.js";
import { logForDebugging } from "../utils/debug.js";
import { getOauthConfig } from "../constants/oauth.js";
import {
  errorMessage,
  toError,
  withTelemetryMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import {
  getTrustedDeviceToken,
  clearTrustedDeviceTokenCache,
  logRefusalWithoutEnrollment,
  recoverFromUntrustedDevice,
} from "../bridge/trustedDevice.js";
import { isDeviceIdentityEnabledCached, isDeviceIdentityEnabled } from "../services/analytics/violinGates.js";
import {
  shouldCloudSessionEnroll,
  readUntrustedDeviceRefusal,
  classifyElevatedAuthError,
} from "../bridge/codeSessionApi.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { getProxyFetchOptions } from "../utils/proxy.js";
import { parseAndValidateManifestFromBytes } from "../utils/dxt/helpers.js";
import { drainResponseBody, getClientPlatform, claudeCodeUserAgent } from "../utils/http.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { recoverHostSessionsBearer, sendableHostSessionsBearer } from "../utils/hostSessionsBearer.js";
import { logEvent } from "../services/analytics/index.js";
import { SSEFrameBuffer } from "../cli/transports/SSETransport.js";
import { logError } from "../utils/log.js";
import { FORWARDED_MESSAGE_TYPES, pickSystemMessageFields, Ue } from "../services/homeSeed/firstSend.js";
import { normalizeStreamEvent } from "./wireFrameShape.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { safeEmit, signClientEvent } from "../utils/telemetry/memorySummary.js";
import { f$n, CXe } from "../services/remoteTools/awayTimings.js";
import { Wt } from "./RemoteSessionManager.js";

/**
 * 远程会话客户端常量：重试/超时时长、致命 HTTP 状态集合、设备证明状态到 verified/unverified 的映射等。
 */
//@ chunk-08945j39.js:11449-11700 placement
var SESSION_CLIENT_LIMITS = null,
  Le = 30000,
  re = 5,
  ce = 5000,
  Mt = 30000,
  $e = 30000,
  qt = 30000,
  Pt = new Set([401, 403, 404]),
  Se = 4096,
  At = {
    verified: "verified",
    verified_by_gate: "verified",
    verified_keyless_device: "verified",
    service_vouched: "verified",
    absent: "unverified",
    invalid: "unverified",
  };
/**
 * 把设备证明状态（可带 DEVICE_ATTESTATION_STATUS_ 前缀）映射为 verified/unverified/unknown。
 */
//@ chunk-08945j39.js:11773-11928 placement
function attestationStatus(e) {
  if (typeof e !== "string") return "unknown";
  let n = e.startsWith("DEVICE_ATTESTATION_STATUS_") ? e.slice(26).toLowerCase() : e;
  return At[n] ?? "unknown";
}
/**
 * 根据消息 created_at 计算发送时间、是否为重放（早于连接时间），以及按服务端时钟估算的延迟。
 */
//@ chunk-08945j39.js:11940-12130 placement
function messageTiming(e, n, s) {
  let i = typeof e.created_at === "string" ? Date.parse(e.created_at) : NaN;
  if (Number.isNaN(i)) return { replayed: !0 };
  return { sentAt: i, replayed: i < n + Ot, ...(s !== void 0 && { ageMs: serviceClockNow(s, i) - i }) };
}
/**
 * 估算当前服务端时间（服务时间 + 本地流逝），遇到更晚的服务时间时校准。
 */
//@ chunk-08945j39.js:12592-12763 placement
function serviceClockNow(e, n) {
  let now = Date.now(),
    startTime = performance.now(),
    r = e.serviceMs + Math.max(now - e.wallMs, startTime - e.monotonicMs);
  if (n > r) return ((e.serviceMs = n), (e.wallMs = now), (e.monotonicMs = startTime), n);
  return r;
}
/**
 * CCR worker 标记与远程工具常量（结果过大、会话未激活、工具宿主结束）。
 */
//@ chunk-08945j39.js:12763-12905 placement
var CCR_WORKER_FLAG = createGzipFetchWrapper("ccr_worker", void 0),
  REMOTE_TOOL_RESULT_TOO_LARGE = "remote_tool_result_too_large",
  Ht = DoctorLazy(() => u({ error: u({ type: T("session_not_active") }) })),
  TOOL_HOST_ENDED = "tool_host_ended";
//@ chunk-08945j39.js:12905-12995 placement = extractErrorTypeFromData (1)
function hasStringType(data) {
  return typeof data === "object" && data !== null && "type" in data && typeof data.type === "string";
}
/**
 * Sessions v2 客户端：连接状态机、事件流读写
 */
//@ chunk-08945j39.js:12995-34473 placement
class SessionsV2Client {
  sessionId;
  orgUuid;
  getAccessToken;
  callbacks;
  onAuth401;
  state = "idle";
  abortController = null;
  reconnectAttempts = 0;
  reconnectTimer = null;
  livenessTimer = null;
  driftTimer = null;
  closedCause = null;
  lastDriftCheck = 0;
  lastHealthyAt;
  downSince;
  driftRedial = !1;
  dialsSinceUp = 0;
  lastSequenceNum = 0;
  issuedRequestIds = new Set();
  liveOnlyRequestIds = new Set();
  ownRequestUuids = new Map();
  answeredToolUseIds = new BoundedUUIDSet(1000);
  trustedDeviceToken;
  trackedSends;
  servesSession;
  rediallingPastBudget = !1;
  connectedSince = 0;
  resumed = !1;
  serviceClock = void 0;
  eventSigner;
  controlOnly;
  admitProjectPersonMessages;
  withholdTrustedDeviceToken;
  constructor(
    e,
    n,
    s,
    i,
    r,
    S,
    {
      trackSends: h = !1,
      keepRedialling: v,
      eventSigner: w,
      controlOnly: R = !1,
      admitProjectPersonMessages: y = !1,
      withholdTrustedDeviceToken: b = !1,
    } = {},
  ) {
    this.sessionId = e;
    this.orgUuid = n;
    this.getAccessToken = s;
    this.callbacks = i;
    this.onAuth401 = r;
    if (S !== void 0 && S > 0) this.lastSequenceNum = S;
    ((this.trackedSends = h ? new Set() : null),
      (this.servesSession = v ?? (() => !1)),
      (this.eventSigner = w),
      (this.controlOnly = R),
      (this.admitProjectPersonMessages = y),
      (this.withholdTrustedDeviceToken = b));
  }
  get keepRedialling() {
    try {
      return this.servesSession();
    } catch {
      return !1;
    }
  }
  serviceTimeMs() {
    return this.serviceClock === void 0 ? void 0 : serviceClockNow(this.serviceClock, 0);
  }
  sendsInFlight() {
    let e = [...(this.trackedSends ?? [])];
    return { count: e.length, settled: Promise.allSettled(e).then(() => {}) };
  }
  async flushSends(e) {
    let { count: count, settled: settled } = this.sendsInFlight();
    if (count > 0) await withDeadline(settled, e);
  }
  async connect() {
    if (this.state === "connecting" || this.state === "connected") {
      logForDebugging("[SessionsV2Client] Already connecting/connected");
      return;
    }
    if (this.closedCause === "deliberate") {
      logForDebugging("[SessionsV2Client] Ignoring connect() \u2014 deliberately closed");
      return;
    }
    ((this.state = "connecting"),
      (this.closedCause = null),
      this.dialsSinceUp++,
      (this.connectedSince = Date.now()),
      (this.resumed = this.lastSequenceNum > 0));
    let e = new URL(`${getOauthConfig().BASE_API_URL}/v1/code/sessions/${this.sessionId}/events/stream`);
    if (this.lastSequenceNum > 0) e.searchParams.set("from_sequence_num", String(this.lastSequenceNum));
    if (this.controlOnly) e.searchParams.set("control_only", "1");
    let abortController = new AbortController();
    this.abortController = abortController;
    let s;
    try {
      s = await this.authHeaders();
    } catch (error) {
      if (this.abortController !== abortController) return;
      (logForDebugging(
        `[SessionsV2Client] Could not build the stream's credentials: ${errorMessage(error)}`,
        { level: "error" },
      ),
        (this.abortController = null),
        this.handleStreamEnd());
      return;
    }
    let i = { ...s.headers, Accept: "text/event-stream" };
    if (abortController.signal.aborted || this.abortController !== abortController) return;
    if (this.lastSequenceNum > 0) i["Last-Event-ID"] = String(this.lastSequenceNum);
    (logForDebugging(
      `[SessionsV2Client] Connecting to ${e.href} (from_sequence_num=${this.lastSequenceNum})`,
    ),
      this.readStream(e, i, abortController, s.bearer, s.withheld));
  }
  loadTrustedDeviceToken() {
    if (this.withholdTrustedDeviceToken) return Promise.resolve("");
    let e = void 0,
      n = () => {
        if (this.trustedDeviceToken === e) this.trustedDeviceToken = void 0;
      },
      s = (async () => {
        try {
          let i = (await getTrustedDeviceToken()) ?? "";
          if (!i) n();
          return i;
        } catch (error) {
          return (
            n(),
            logForDebugging(
              `[SessionsV2Client] trusted-device token unavailable, sending no td-v1 header: ${errorMessage(error)}`,
            ),
            ""
          );
        }
      })();
    return ((e = s), s);
  }
  rereadTrustedDeviceToken() {
    if (((this.trustedDeviceToken = void 0), isDeviceIdentityEnabledCached())) clearTrustedDeviceTokenCache();
  }
  async recoverTrustedDeviceToken(e, n) {
    try {
      if (this.withholdTrustedDeviceToken) return !1;
      if (!(await isDeviceIdentityEnabled())) return !1;
      if (!shouldCloudSessionEnroll(e))
        return (logRefusalWithoutEnrollment("[SessionsV2Client]", e), this.rereadTrustedDeviceToken(), !1);
      let s = await recoverFromUntrustedDevice(n || void 0);
      if (!s) return !1;
      return ((this.trustedDeviceToken = Promise.resolve(s)), !0);
    } catch (error) {
      return (
        logForDebugging(`[SessionsV2Client] trusted-device re-enrollment failed: ${errorMessage(error)}`),
        !1
      );
    }
  }
  async postEvents(e, n, s, i = qt) {
    let r = await CCR_WORKER_FLAG(
      e,
      {
        method: "POST",
        headers: s,
        body: jsonStringify(n),
        signal: AbortSignal.timeout(i),
        ...getProxyFetchOptions({ url: e }),
      },
      (w) => fetch(e, w),
    );
    if (r.ok) {
      let R = (await r.json()).results?.[0],
        y = R ? parseInt(String(R.sequence_num), 10) : NaN;
      return { ok: !0, sequence_num: isNaN(y) ? 0 : y };
    }
    let S,
      h = !1,
      v = r.status === 413;
    if (r.status === 403 && isDeviceIdentityEnabledCached()) {
      let w = await classifyForbiddenResponse(r);
      S = w.reason === "untrusted_device" ? w.about : void 0;
    } else if (r.status === 409) h = await Kt(r);
    else if (r.status === 400) v = xt(await parseAndValidateManifestFromBytes(r));
    else await drainResponseBody(r);
    return {
      ok: !1,
      status: r.status,
      refusal: S,
      inactive: h,
      tooLarge: v,
      sentDeviceToken: s["X-Trusted-Device-Token"],
    };
  }
  async readStream(e, n, s, i, r) {
    let S,
      h = !1,
      v = setTimeout(() => {
        ((h = !0), s.abort());
      }, $e);
    try {
      S = await fetch(e.href, {
        method: "GET",
        headers: n,
        signal: s.signal,
        ...getProxyFetchOptions({ url: e.href }),
      });
    } catch (error) {
      if ((clearTimeout(v), this.abortController !== s)) return;
      if (h) {
        (logForDebugging(`[SessionsV2Client] Connect timed out after ${$e}ms, reconnecting`, {
          level: "error",
        }),
          logFeatureSad("remote_connect", "remote_connect_timeout"),
          this.handleStreamEnd());
        return;
      }
      if (s.signal.aborted) return;
      if (
        (logForDebugging(`[SessionsV2Client] Connect error: ${errorMessage(error)}`, { level: "error" }),
        logFeatureSad("remote_connect", "remote_connect_request_failed"),
        this.callbacks.onError?.(toError(error)),
        this.abortController !== s)
      )
        return;
      this.handleStreamEnd();
      return;
    }
    if (!S.ok || !S.body) {
      logForDebugging(`[SessionsV2Client] HTTP ${S.status} on SSE connect`, { level: "error" });
      let k = S.status === 403 ? await classifyForbiddenResponse(S) : void 0;
      if (k === void 0) await drainResponseBody(S);
      let P = k?.reason;
      if ((clearTimeout(v), this.abortController !== s)) return;
      if (S.status === 401 && (r || this.onAuth401)) {
        (logForDebugging(
          r
            ? "[SessionsV2Client] 401 on SSE connect that carried no credential \u2014 asking the holder again"
            : "[SessionsV2Client] 401 on SSE connect \u2014 refreshing",
        ),
          logFeatureBad("remote_connect", "remote_connect_auth_401"));
        let q = r
          ? await recoverHostSessionsBearer(i, "withheld").then(
              () => this.nextDialCarriesCredential(),
              () => this.nextDialCarriesCredential(),
            )
          : await (this.onAuth401?.(i) ?? Promise.resolve(!1)).catch(() => !1);
        if (this.abortController !== s) return;
        if (!q && this.reconnectAttempts >= re && this.keepRedialling) {
          (logFeatureBad("remote_connect", "remote_connect_reconnect_exhausted"),
            (this.state = "closed"),
            (this.closedCause = "exhausted"),
            this.callbacks.onClose?.());
          return;
        }
        this.handleStreamEnd();
        return;
      }
      if (k?.reason === "untrusted_device") {
        let recoverTrustedDeviceToken = await this.recoverTrustedDeviceToken(
          k.about,
          n["X-Trusted-Device-Token"],
        );
        if (this.abortController !== s) return;
        if (recoverTrustedDeviceToken) {
          (logForDebugging(
            "[SessionsV2Client] untrusted_device on SSE connect \u2014 re-enrolled, reconnecting",
          ),
            logFeatureSad("remote_connect", "remote_connect_untrusted_device"),
            this.handleStreamEnd());
          return;
        }
      }
      if (Pt.has(S.status)) {
        (logFeatureBad(
          "remote_connect",
          k?.reason === "untrusted_device" && k.about.kind === "unrecognized"
            ? "remote_connect_unknown_sub_reason"
            : "remote_connect_permanent_failure",
          deviceIdentityTelemetry(n),
        ),
          (this.state = "closed"),
          (this.closedCause = "permanentHttp"),
          this.callbacks.onClose?.(P));
        return;
      }
      (logFeatureSad("remote_connect", "remote_connect_http_error"), this.handleStreamEnd());
      return;
    }
    if ((clearTimeout(v), this.abortController !== s)) {
      S.body.cancel().catch(() => {});
      return;
    }
    let parse = Date.parse(S.headers.get("date") ?? "");
    if (Number.isNaN(parse))
      ((this.serviceClock = void 0),
        logForDebugging(
          "[SessionsV2Client] The stream answered without a Date header: frames on it cannot be dated against the service clock",
          { level: "warn" },
        ));
    else
      ((this.connectedSince = parse),
        (this.serviceClock = { serviceMs: parse, wallMs: Date.now(), monotonicMs: performance.now() }));
    ((this.state = "connected"), (this.reconnectAttempts = 0), (this.rediallingPastBudget = !1));
    let R = {
      gapMs: this.downSince === void 0 ? 0 : Date.now() - this.downSince,
      driftRedial: this.driftRedial,
    };
    if (this.downSince !== void 0)
      logEvent("tengu_remote_stream_regained", {
        gap_ms: R.gapMs,
        attempts: this.dialsSinceUp,
        drift_redial: R.driftRedial,
        keeps_redialling: this.keepRedialling,
      });
    ((this.downSince = void 0),
      (this.driftRedial = !1),
      (this.dialsSinceUp = 0),
      this.resetLivenessTimer(),
      this.startDriftWatch(),
      logForDebugging("[SessionsV2Client] Connected"),
      logFeatureOk("remote_connect", deviceIdentityTelemetry(n)),
      this.callbacks.onConnected?.(R));
    let reader = S.body.getReader(),
      b = new SSEFrameBuffer();
    try {
      while (!0) {
        let { done: k, value: P } = await reader.read();
        if (this.abortController !== s) return;
        if (k) break;
        for (let q of b.push(P)) {
          if (this.abortController !== s) return;
          if ((this.resetLivenessTimer(), q.event && q.data)) this.handleFrame(q.event, q.id, q.data);
        }
      }
    } catch (error) {
      if (s.signal.aborted) return;
      (logForDebugging(`[SessionsV2Client] Stream read error: ${errorMessage(error)}`, { level: "error" }),
        logFeatureSad("remote_connect", "remote_connect_stream_error"));
    } finally {
      reader.releaseLock();
    }
    if (!s.signal.aborted) (logForDebugging("[SessionsV2Client] Stream ended"), this.handleStreamEnd());
  }
  handleFrame(e, n, s) {
    let i;
    try {
      i = jsonParse(s);
    } catch (error) {
      (logError(
        withTelemetryMessage(
          Error(`[SessionsV2Client] Failed to parse ${e} frame: ${errorMessage(error)}`),
          "SessionsV2Client: failed to parse event frame",
        ),
      ),
        logFeatureSad("remote_connect", "remote_connect_frame_parse_failed"));
      return;
    }
    switch (e) {
      case "client_event": {
        let r = i,
          S = parseInt(n ?? String(r.sequence_num), 10);
        if (!isNaN(S) && S > this.lastSequenceNum) this.lastSequenceNum = S;
        if (!hasStringType(r.payload)) {
          logForDebugging(
            `[SessionsV2Client] Dropping client_event with no payload.type (event_type=${r.event_type})`,
          );
          return;
        }
        if (r.payload.type === "control_response") {
          let { response: response } = r.payload;
          if (!response || typeof response !== "object" || typeof response.request_id !== "string") {
            logForDebugging(
              `[SessionsV2Client] Dropping malformed control_response from source=${r.source}`,
              { level: "warn" },
            );
            return;
          }
        }
        if (r.payload.type === "user") {
          if (
            r.source !== "worker" &&
            hasToolResultContent(r.payload) &&
            !(
              this.admitProjectPersonMessages &&
              SESSION_CLIENT_LIMITS !== null &&
              SESSION_CLIENT_LIMITS.isProjectPersonEvent(r.payload, r.source)
            )
          ) {
            logForDebugging(
              `[SessionsV2Client] Dropping worker-output-shaped user frame from source=${r.source} \u2014 only the worker produces tool results and execution output`,
              { level: "warn" },
            );
            return;
          }
          if (hasNonTextContent(r.payload)) {
            logForDebugging(
              `[SessionsV2Client] Dropping user frame with malformed content from source=${r.source}`,
              { level: "warn" },
            );
            return;
          }
          let h = r.payload.message?.content;
          if (!r.payload.parent_tool_use_id && Array.isArray(h)) {
            for (let v of h) if (v.type === "tool_result") this.answeredToolUseIds.add(v.tool_use_id);
          }
        }
        if (r.source !== "worker") {
          if (r.payload.type === "control_response") {
            if (this.issuedRequestIds.has(r.payload.response.request_id)) {
              logForDebugging(
                `[SessionsV2Client] Dropping control_response for this client's request_id from source=${r.source} \u2014 only the worker may answer our RPCs`,
                { level: "warn" },
              );
              return;
            }
            if (
              r.payload.response.pending_user_dialog_requests ||
              r.payload.response.pending_permission_requests ||
              r.payload.response.pending_elicitation_requests
            ) {
              logForDebugging(
                `[SessionsV2Client] Stripping prompt-redelivery fields from control_response with source=${r.source}`,
              );
              let {
                pending_user_dialog_requests: pending_user_dialog_requests,
                pending_permission_requests: pending_permission_requests,
                pending_elicitation_requests: pending_elicitation_requests,
                ...R
              } = r.payload.response;
              this.deliver(
                { ...r.payload, response: R },
                {
                  source: r.source,
                  ...(!isNaN(S) && { sequenceNum: S }),
                  ...messageTiming(r, this.connectedSince, this.serviceClock),
                  ...(this.resumed && { resumed: !0 }),
                },
              );
              return;
            }
          } else if (!FORWARDED_MESSAGE_TYPES.has(r.payload.type)) {
            if (
              r.payload.type === "control_request" &&
              typeof r.payload.request_id === "string" &&
              this.issuedRequestIds.has(r.payload.request_id)
            ) {
              let h = "uuid" in r.payload ? r.payload.uuid : void 0;
              if (typeof h !== "string" || h !== this.ownRequestUuids.get(r.payload.request_id)) {
                logForDebugging(
                  `[SessionsV2Client] A copy of own request ${ee(r.payload.request_id)} from source=${ee(r.source)} under another event uuid \u2014 ignored`,
                );
                return;
              }
              let v = attestationStatus(r.device_attestation_status);
              if (
                (logForDebugging(
                  `[SessionsV2Client] Own request ${ee(r.payload.request_id)} echoed from source=${ee(r.source)}: device proof ${ee(r.device_attestation_status)} (${v})`,
                ),
                v === "unverified")
              )
                this.rereadTrustedDeviceToken();
              this.callbacks.onOwnRequestEchoed?.(r.payload.request_id, v);
              return;
            }
            logForDebugging(`[SessionsV2Client] Dropping ${r.payload.type} from source=${r.source}`);
            return;
          }
        } else if (r.payload.type === "control_response")
          (this.issuedRequestIds.delete(r.payload.response.request_id),
            this.liveOnlyRequestIds.delete(r.payload.response.request_id),
            this.ownRequestUuids.delete(r.payload.response.request_id));
        this.deliver(r.payload, {
          source: r.source,
          ...(!isNaN(S) && { sequenceNum: S }),
          ...messageTiming(r, this.connectedSince, this.serviceClock),
          ...(this.resumed && { resumed: !0 }),
          ...(r.source === "worker" && isHookCallbackControlRequest(r)),
        });
        return;
      }
      case "ephemeral_event": {
        let r = i;
        if (r?.event_type === TOOL_HOST_ENDED) {
          let h = typeof r.payload === "object" && r.payload !== null ? r.payload : {},
            { work_id: work_id, reason: reason } = h;
          try {
            this.callbacks.onToolHostEnded?.({
              workId: typeof work_id === "string" ? work_id : void 0,
              reason: typeof reason === "string" ? reason : void 0,
            });
          } catch (error) {
            logForDebugging(`[SessionsV2Client] tool_host_ended handler threw: ${errorMessage(error)}`, {
              level: "error",
            });
          }
          return;
        }
        let payload = r.payload;
        if (hasStringType(r.payload)) {
          if (
            r.payload.type === "control_response" &&
            typeof r.payload.response?.request_id === "string" &&
            this.liveOnlyRequestIds.delete(r.payload.response.request_id)
          ) {
            (this.issuedRequestIds.delete(r.payload.response.request_id),
              this.ownRequestUuids.delete(r.payload.response.request_id));
            let {
              pending_user_dialog_requests: pending_user_dialog_requests,
              pending_permission_requests: pending_permission_requests,
              pending_elicitation_requests: pending_elicitation_requests,
              ...y
            } = r.payload.response;
            this.deliver({ ...r.payload, response: y }, { source: "worker" });
            return;
          }
          let h = pickSystemMessageFields(payload);
          if (h && hasStringType(h)) {
            this.deliver(h, {});
            return;
          }
          if (
            r.payload.type === "tool_progress" &&
            r.payload.heartbeat === !0 &&
            typeof r.payload.parent_tool_use_id === "string" &&
            !this.answeredToolUseIds.has(r.payload.parent_tool_use_id)
          ) {
            this.deliver(r.payload, {});
            return;
          }
          if (r.payload.type !== "stream_event") {
            logForDebugging(`[SessionsV2Client] Dropping ${r.payload.type} on ephemeral channel`);
            return;
          }
          if (!normalizeStreamEvent(r.payload.event)) {
            logForDebugging("[SessionsV2Client] Dropping malformed stream_event on ephemeral channel", {
              level: "warn",
            });
            return;
          }
          this.deliver(r.payload, {});
        }
        return;
      }
      case "catch_up_truncated":
        (logForDebugging("[SessionsV2Client] catch_up_truncated \u2014 transcript gap"),
          logFeatureSad("remote_connect", "remote_catch_up_truncated"),
          this.callbacks.onCatchUpTruncated?.());
        return;
      case "session_update": {
        let r = i?.connection_status;
        if (typeof r === "string")
          try {
            this.callbacks.onWorkerConnectionStatus?.(r);
          } catch (error) {
            logForDebugging(
              `[SessionsV2Client] worker connection status handler threw: ${errorMessage(error)}`,
              { level: "error" },
            );
          }
        else logForDebugging("[SessionsV2Client] Ignoring session_update frame");
        return;
      }
      case "security_update": {
        let r = i?.security_tier;
        if (
          (logForDebugging(
            `[SessionsV2Client] security_update: tier ${typeof r === "string" ? ee(r) : typeof r}`,
          ),
          r === "elevated")
        )
          try {
            this.callbacks.onSecurityTierRaised?.();
          } catch (error) {
            logForDebugging(`[SessionsV2Client] security tier handler threw: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        return;
      }
      case "delivery_update": {
        let r = isPlainObject(i) ? i : {},
          { event_id: event_id, status: status } = r;
        if (typeof event_id !== "string" || typeof status !== "string") {
          logForDebugging("[SessionsV2Client] Ignoring delivery_update frame");
          return;
        }
        try {
          this.callbacks.onDeliveryUpdate?.({ eventId: event_id, status: status });
        } catch (error) {
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `[SessionsV2Client] delivery update handler threw: ${errorMessage(error)}`,
              "SessionsV2Client: delivery update handler threw",
            ),
          );
        }
        return;
      }
      default:
        logForDebugging(`[SessionsV2Client] Unknown SSE event type '${e}'`, { level: "warn" });
        return;
    }
  }
  deliver(e, n) {
    if (!safeEmit((s) => this.callbacks.onMessage(s, n), e, "SessionsV2Client"))
      logFeatureSad("remote_connect", "remote_connect_frame_handler_threw");
  }
  handleStreamEnd() {
    if ((this.markDown(), this.clearLivenessTimer(), this.clearDriftWatch(), this.state === "closed")) return;
    this.abortController = null;
    let e = this.reconnectAttempts >= re;
    if (e && !this.keepRedialling) {
      (logForDebugging(`[SessionsV2Client] Reconnect budget exhausted (${re}), closing`),
        logFeatureBad("remote_connect", "remote_connect_reconnect_exhausted"),
        (this.state = "closed"),
        (this.closedCause = "exhausted"),
        this.callbacks.onClose?.());
      return;
    }
    if (!e) this.reconnectAttempts++;
    else if (!this.rediallingPastBudget)
      ((this.rediallingPastBudget = !0),
        logFeatureSad("remote_connect", "remote_connect_redialling_past_budget"));
    this.state = "idle";
    let n = e ? Le : backoffDelayMs({ attempt: this.reconnectAttempts, baseMs: f$n, capMs: Le });
    if (
      (logForDebugging(
        `[SessionsV2Client] Reconnecting in ${n}ms (attempt ${this.reconnectAttempts}/${this.keepRedialling ? "\u221E" : re}, from_sequence_num=${this.lastSequenceNum})`,
      ),
      (this.reconnectTimer = setTimeout(() => {
        if (((this.reconnectTimer = null), this.state === "closed")) return;
        this.connect();
      }, n)),
      !e)
    )
      this.callbacks.onReconnecting?.();
  }
  onLivenessTimeout = () => {
    ((this.livenessTimer = null),
      logForDebugging("[SessionsV2Client] Liveness timeout, reconnecting", { level: "warn" }));
    try {
      let now = Date.now();
      this.callbacks.onStreamSilent?.({
        suspended: now - this.lastDriftCheck > ce * 2 || now - (this.lastHealthyAt ?? now) > CXe + ce * 2,
      });
    } catch (error) {
      let n = error instanceof Error ? error : Error("not an Error");
      logError(n);
    }
    (this.abortController?.abort(), (this.abortController = null), this.handleStreamEnd());
  };
  markDown() {
    let now = Date.now();
    this.downSince ??=
      this.lastHealthyAt !== void 0 && now - this.lastHealthyAt >= Mt ? this.lastHealthyAt : now;
  }
  resetLivenessTimer() {
    ((this.lastHealthyAt = Date.now()),
      this.clearLivenessTimer(),
      (this.livenessTimer = setTimeout(this.onLivenessTimeout, CXe)));
  }
  clearLivenessTimer() {
    if (this.livenessTimer) (clearTimeout(this.livenessTimer), (this.livenessTimer = null));
  }
  startDriftWatch() {
    (this.clearDriftWatch(),
      (this.lastDriftCheck = Date.now()),
      (this.driftTimer = setInterval(() => {
        let now = Date.now(),
          n = now - this.lastDriftCheck;
        if (((this.lastDriftCheck = now), n > ce * 2 && this.state === "connected"))
          (logForDebugging(`[SessionsV2Client] Wall-clock drift ${n}ms \u2014 reconnecting after suspend`),
            this.reconnectAfterSuspend());
      }, ce)),
      this.driftTimer.unref?.());
  }
  clearDriftWatch() {
    if (this.driftTimer) (clearInterval(this.driftTimer), (this.driftTimer = null));
  }
  sendEvent(e) {
    return this.trackSend(
      this.postEvent(e).then((n) => (n.outcome === "accepted" ? { sequence_num: n.sequence_num } : null)),
    );
  }
  trackSend(e) {
    if (this.trackedSends !== null) {
      let trackedSends = this.trackedSends;
      trackedSends.add(e);
      let s = () => {
        trackedSends.delete(e);
      };
      e.then(s, s);
    }
    return e;
  }
  async postEvent(e, n = {}) {
    if (this.state === "closed")
      return (
        logForDebugging("[SessionsV2Client] Cannot send: closed", { level: "warn" }),
        logFeatureBad("remote_send_event", "remote_send_event_closed"),
        { outcome: "failed", cause: "closed" }
      );
    let s = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${this.sessionId}/events`;
    try {
      let startTime = performance.now(),
        r = await signClientEvent(this.eventSigner, this.sessionId, e),
        startTime_2 = performance.now(),
        h = { session_id: this.sessionId, events: [r] },
        { headers: headers, bearer: bearer, withheld: withheld } = await this.authHeaders(),
        postEvents = await this.postEvents(s, h, headers, n.timeoutMs);
      if (!postEvents.ok && postEvents.status === 401 && withheld)
        (logForDebugging(
          "[SessionsV2Client] 401 on a POST that carried no credential \u2014 asking the holder again + one resend",
        ),
          await recoverHostSessionsBearer(bearer, "withheld").catch(() => {}),
          (postEvents = await this.postEvents(s, h, (await this.authHeaders()).headers, n.timeoutMs)));
      else if (!postEvents.ok && postEvents.status === 401 && this.onAuth401) {
        if (
          (logForDebugging("[SessionsV2Client] 401 on POST \u2014 refreshing + retry"),
          await this.onAuth401(bearer))
        )
          postEvents = await this.postEvents(s, h, (await this.authHeaders()).headers, n.timeoutMs);
      }
      let b = !1;
      if (
        !postEvents.ok &&
        postEvents.refusal !== void 0 &&
        (await this.recoverTrustedDeviceToken(postEvents.refusal, postEvents.sentDeviceToken))
      ) {
        logForDebugging("[SessionsV2Client] untrusted_device on POST \u2014 re-enrolled, retrying");
        let headers = (await this.authHeaders()).headers;
        ((postEvents = await this.postEvents(s, h, headers, n.timeoutMs)), (b = !0));
      }
      if (!postEvents.ok) {
        if (
          (logForDebugging(
            `[SessionsV2Client] POST /events returned ${postEvents.status}${postEvents.inactive ? " (session not active)" : ""}${postEvents.tooLarge ? " (too large)" : ""}`,
            { level: "warn" },
          ),
          postEvents.inactive)
        )
          return (
            logFeatureSad("remote_send_event", "remote_send_event_session_inactive"),
            { outcome: "session_inactive" }
          );
        return (
          logFeatureBad(
            "remote_send_event",
            postEvents.tooLarge
              ? "remote_send_event_too_large"
              : postEvents.refusal?.kind === "signature_wanted"
                ? "remote_send_event_signature_wanted"
                : postEvents.refusal?.kind === "unrecognized"
                  ? "remote_send_event_unknown_sub_reason"
                  : "remote_send_event_http_error",
          ),
          {
            outcome: "failed",
            cause: "http",
            status: postEvents.status,
            ...(postEvents.tooLarge && { tooLarge: !0 }),
          }
        );
      }
      if (b) logFeatureSad("remote_send_event", "remote_send_event_untrusted_device");
      else logFeatureOk("remote_send_event");
      return {
        outcome: "accepted",
        sequence_num: postEvents.sequence_num,
        signMs: Math.round(startTime_2 - startTime),
        postMs: Math.round(performance.now() - startTime_2),
      };
    } catch (error) {
      return (
        logForDebugging(`[SessionsV2Client] POST /events failed: ${errorMessage(error)}`, { level: "warn" }),
        logFeatureBad("remote_send_event", "remote_send_event_request_failed"),
        { outcome: "failed", cause: Wt(error) ? "timeout" : "network" }
      );
    }
  }
  sendControlResponse(e, n = randomUUID_2(), s = {}) {
    return (
      logForDebugging("[SessionsV2Client] Sending control_response"),
      this.trackSend(this.postEvent({ ...e, uuid: n }, s))
    );
  }
  sendControlRequest(e, n) {
    return this.postControlRequest(e, n)?.requestId ?? null;
  }
  postControlRequest(e, n) {
    if (this.state === "closed")
      return (
        logForDebugging("[SessionsV2Client] Cannot send control_request: closed", { level: "warn" }),
        null
      );
    let s = randomUUID_2();
    if (
      (this.issuedRequestIds.add(s),
      (e.subtype === "mcp_authenticate" || e.subtype === "mcp_status") && e.liveReply === !0)
    )
      this.liveOnlyRequestIds.add(s);
    if (this.issuedRequestIds.size > Ue) {
      logForDebugging(
        "[SessionsV2Client] issuedRequestIds overflow \u2014 evicting oldest unanswered request_id",
        { level: "warn" },
      );
      let S = this.issuedRequestIds.values().next().value;
      if (S !== void 0)
        (this.issuedRequestIds.delete(S), this.liveOnlyRequestIds.delete(S), this.ownRequestUuids.delete(S));
    }
    let i = { type: "control_request", request_id: s, request: e, uuid: randomUUID_2() };
    (this.ownRequestUuids.set(s, i.uuid),
      logForDebugging(`[SessionsV2Client] Sending control_request: ${e.subtype}`));
    let trackSend = this.trackSend(
      this.postEvent(i).then((S) => {
        if (S.outcome === "session_inactive" || (S.outcome === "failed" && S.cause === "http")) n?.(s);
        return S;
      }),
    );
    return { requestId: s, posted: trackSend };
  }
  sendControlCancelRequest(e) {
    if (this.state === "closed") return;
    (logForDebugging(`[SessionsV2Client] Sending control_cancel_request: ${e}`),
      this.sendEvent({ type: "control_cancel_request", request_id: e, uuid: randomUUID_2() }));
  }
  isConnected() {
    return this.state === "connected";
  }
  close() {
    if (
      (logForDebugging("[SessionsV2Client] Closing"),
      (this.state = "closed"),
      (this.closedCause = "deliberate"),
      this.clearLivenessTimer(),
      this.clearDriftWatch(),
      this.reconnectTimer)
    )
      (clearTimeout(this.reconnectTimer), (this.reconnectTimer = null));
    (this.abortController?.abort(), (this.abortController = null));
  }
  reconnect() {
    if (this.closedCause === "deliberate") {
      logForDebugging("[SessionsV2Client] Ignoring reconnect() \u2014 deliberately closed");
      return;
    }
    if (
      (logForDebugging("[SessionsV2Client] Force reconnect"),
      this.markDown(),
      (this.reconnectAttempts = 0),
      this.clearLivenessTimer(),
      this.clearDriftWatch(),
      this.reconnectTimer)
    )
      (clearTimeout(this.reconnectTimer), (this.reconnectTimer = null));
    (this.abortController?.abort(), (this.abortController = null), (this.state = "idle"), this.connect());
  }
  reconnectAfterSuspend() {
    if (this.state === "closed" || (this.driftRedial && this.state === "connecting")) return;
    ((this.driftRedial = !0), this.reconnect());
  }
  isRevivable() {
    return this.closedCause === "exhausted";
  }
  reviveAfterExhaustion() {
    if (
      !(
        this.keepRedialling &&
        this.state === "idle" &&
        this.reconnectAttempts >= re &&
        this.reconnectTimer !== null
      ) &&
      this.closedCause !== "exhausted"
    )
      return !1;
    return (logFeatureSad("remote_connect", "remote_connect_revived_by_user_send"), this.reconnect(), !0);
  }
  nextDialCarriesCredential() {
    try {
      return sendableHostSessionsBearer(this.getAccessToken()) !== null;
    } catch {
      return !1;
    }
  }
  async authHeaders() {
    let e = await (this.trustedDeviceToken ??= this.loadTrustedDeviceToken()),
      accessToken = this.getAccessToken(),
      s = sendableHostSessionsBearer(accessToken);
    return {
      headers: {
        ...(s !== null && { Authorization: `${$t}${s}` }),
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-client-platform": getClientPlatform(),
        "x-organization-uuid": this.orgUuid,
        "User-Agent": claudeCodeUserAgent(),
        ...(e && { "X-Trusted-Device-Token": e }),
      },
      bearer: s ?? accessToken,
      withheld: s === null,
    };
  }
}
//@ chunk-08945j39.js:34473-34490 placement
var $t = "Bearer ";
//@ chunk-08945j39.js:34490-34605 placement
function deviceIdentityTelemetry(e) {
  return {
    trusted_device_token_sent: e["X-Trusted-Device-Token"] !== void 0,
    device_identity_flag_on: isDeviceIdentityEnabledCached(),
  };
}
//@ chunk-08945j39.js:34605-34779 placement
async function classifyForbiddenResponse(e) {
  let n = await parseAndValidateManifestFromBytes(e),
    s = readUntrustedDeviceRefusal(n);
  return s !== void 0
    ? { reason: "untrusted_device", about: s }
    : { reason: classifyElevatedAuthError(n) === "session_stale_relogin" ? "session_stale_relogin" : void 0 };
}
//@ chunk-08945j39.js:34779-34831 placement
function xt(e) {
  return e !== void 0 && jsonStringify(e).includes(REMOTE_TOOL_RESULT_TOO_LARGE);
}
//@ chunk-08945j39.js:34831-34895 affinity
async function Kt(e) {
  return Ht().safeParse(await parseAndValidateManifestFromBytes(e)).success;
}

export { Se, SessionsV2Client };

/**
 * remote/SessionsV2Client.ts
 *
 * Sessions v2 客户端（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h29vk4wn.js (12)
 * attribution: placement 11, affinity 1
 */
import { randomUUID } from "crypto";
import {
  REPLAY_CLOCK_SKEW_MS,
  hasToolResultContent,
  hasNonTextContent,
  toPrintableExcerpt,
  isHookCallbackControlRequest,
} from "./controlRequestShape.js";
import { createGzipFetchWrapper } from "../services/api/gzipRequestBody.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, literal } from "../../vendor/zod/v4/classic/schemas.js";
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
import {
  FORWARDED_MESSAGE_TYPES,
  pickSystemMessageFields,
  FRAME_TRACK_INTERVAL_MS,
} from "../services/homeSeed/firstSend.js";
import { normalizeStreamEvent } from "./wireFrameShape.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { safeEmit } from "../utils/telemetry/memorySummary.js";
import {
  RECONNECT_BACKOFF_BASE_MS,
  SESSION_LIVENESS_TIMEOUT_MS,
} from "../services/remoteTools/awayTimings.js";
import { signClientEvent } from "../utils/telemetry/clientEventUploader.js";
import { isTimeoutError } from "./RemoteSessionManager.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-h29vk4wn.js:13059-13310 placement
/**
 * 远程会话客户端常量：重试/超时时长、致命 HTTP 状态集合、设备证明状态到 verified/unverified 的映射等。
 */
var SESSION_CLIENT_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_RECONNECT_BACKOFF_MS;
var MAX_RECONNECT_ATTEMPTS;
var DRIFT_WATCH_INTERVAL_MS;
var DOWN_GRACE_MS;
var CONNECT_TIMEOUT_MS;
var POST_EVENTS_TIMEOUT_MS;
var PERMANENT_HTTP_STATUSES;
var STREAM_READ_CHUNK_BYTES;
var DEVICE_ATTESTATION_VERDICTS;
deferInit("chunk-h29vk4wn.js:13059", () => {
  SESSION_CLIENT_LIMITS = null;
  MAX_RECONNECT_BACKOFF_MS = 30000;
  MAX_RECONNECT_ATTEMPTS = 5;
  DRIFT_WATCH_INTERVAL_MS = 5000;
  DOWN_GRACE_MS = 30000;
  CONNECT_TIMEOUT_MS = 30000;
  POST_EVENTS_TIMEOUT_MS = 30000;
  PERMANENT_HTTP_STATUSES = new Set([401, 403, 404]);
  STREAM_READ_CHUNK_BYTES = 4096;
  DEVICE_ATTESTATION_VERDICTS = {
    verified: "verified",
    verified_by_gate: "verified",
    verified_keyless_device: "verified",
    service_vouched: "verified",
    absent: "unverified",
    invalid: "unverified",
  };
});
//@ chunk-h29vk4wn.js:13383-13538 placement
/**
 * 把设备证明状态（可带 DEVICE_ATTESTATION_STATUS_ 前缀）映射为 verified/unverified/unknown。
 */
function attestationStatus(deviceAttestationStatus) {
  if (typeof deviceAttestationStatus !== "string") return "unknown";
  let normalizedStatus = deviceAttestationStatus.startsWith("DEVICE_ATTESTATION_STATUS_")
    ? deviceAttestationStatus.slice(26).toLowerCase()
    : deviceAttestationStatus;
  return DEVICE_ATTESTATION_VERDICTS[normalizedStatus] ?? "unknown";
}
//@ chunk-h29vk4wn.js:13550-13740 placement
/**
 * 根据消息 created_at 计算发送时间、是否为重放（早于连接时间），以及按服务端时钟估算的延迟。
 */
function messageTiming(message, connectedSince, clock) {
  let createdAtMs = typeof message.created_at === "string" ? Date.parse(message.created_at) : NaN;
  if (Number.isNaN(createdAtMs))
    return {
      replayed: true,
    };
  return {
    sentAt: createdAtMs,
    replayed: createdAtMs < connectedSince + REPLAY_CLOCK_SKEW_MS,
    ...(clock !== undefined && {
      ageMs: serviceClockNow(clock, createdAtMs) - createdAtMs,
    }),
  };
}
//@ chunk-h29vk4wn.js:14265-14436 placement
/**
 * 估算当前服务端时间（服务时间 + 本地流逝），遇到更晚的服务时间时校准。
 */
function serviceClockNow(clock, remoteMs) {
  let now = Date.now();
  let startTime = performance.now();
  let estimatedMs = clock.serviceMs + Math.max(now - clock.wallMs, startTime - clock.monotonicMs);
  if (remoteMs > estimatedMs) {
    clock.serviceMs = remoteMs;
    clock.wallMs = now;
    clock.monotonicMs = startTime;
    return remoteMs;
  }
  return estimatedMs;
}
//@ chunk-h29vk4wn.js:14436-14578 placement
/**
 * CCR worker 标记与远程工具常量（结果过大、会话未激活、工具宿主结束）。
 */
var CCR_WORKER_FLAG; // deferred: uses createGzipFetchWrapper (../services/api/gzipRequestBody.js) of its import cycle while loading; runs once the cycle is complete
var REMOTE_TOOL_RESULT_TOO_LARGE;
var sessionNotActiveErrorSchema;
var TOOL_HOST_ENDED;
deferInit("chunk-h29vk4wn.js:14436", () => {
  CCR_WORKER_FLAG = createGzipFetchWrapper("ccr_worker", undefined);
  REMOTE_TOOL_RESULT_TOO_LARGE = "remote_tool_result_too_large";
  sessionNotActiveErrorSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        type: literal("session_not_active"),
      }),
    }),
  );
  TOOL_HOST_ENDED = "tool_host_ended";
});
//@ chunk-h29vk4wn.js:14578-14668 placement (2.1.88 match: extractErrorTypeFromData, 1)
function hasStringType(data) {
  return typeof data === "object" && data !== null && "type" in data && typeof data.type === "string";
}
//@ chunk-h29vk4wn.js:14668-36146 placement
/**
 * Sessions v2 客户端：连接状态机、事件流读写
 */
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
  driftRedial = false;
  dialsSinceUp = 0;
  lastSequenceNum = 0;
  issuedRequestIds = new Set();
  liveOnlyRequestIds = new Set();
  ownRequestUuids = new Map();
  answeredToolUseIds = new BoundedUUIDSet(1000);
  trustedDeviceToken;
  trackedSends;
  servesSession;
  rediallingPastBudget = false;
  connectedSince = 0;
  resumed = false;
  serviceClock = undefined;
  eventSigner;
  controlOnly;
  admitProjectPersonMessages;
  withholdTrustedDeviceToken;
  constructor(
    sessionId,
    orgUuid,
    getAccessToken,
    callbacks,
    onAuth401,
    initialSequenceNum,
    {
      trackSends = false,
      keepRedialling: servesSession,
      eventSigner,
      controlOnly = false,
      admitProjectPersonMessages = false,
      withholdTrustedDeviceToken = false,
    } = {},
  ) {
    this.sessionId = sessionId;
    this.orgUuid = orgUuid;
    this.getAccessToken = getAccessToken;
    this.callbacks = callbacks;
    this.onAuth401 = onAuth401;
    if (initialSequenceNum !== undefined && initialSequenceNum > 0) this.lastSequenceNum = initialSequenceNum;
    this.trackedSends = trackSends ? new Set() : null;
    this.servesSession = servesSession ?? (() => false);
    this.eventSigner = eventSigner;
    this.controlOnly = controlOnly;
    this.admitProjectPersonMessages = admitProjectPersonMessages;
    this.withholdTrustedDeviceToken = withholdTrustedDeviceToken;
  }
  get keepRedialling() {
    try {
      return this.servesSession();
    } catch {
      return false;
    }
  }
  serviceTimeMs() {
    return this.serviceClock === undefined ? undefined : serviceClockNow(this.serviceClock, 0);
  }
  sendsInFlight() {
    let trackedSends = [...(this.trackedSends ?? [])];
    return {
      count: trackedSends.length,
      settled: Promise.allSettled(trackedSends).then(() => {}),
    };
  }
  async flushSends(timeoutMs) {
    let { count, settled } = this.sendsInFlight();
    if (count > 0) await withDeadline(settled, timeoutMs);
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
    this.state = "connecting";
    this.closedCause = null;
    this.dialsSinceUp++;
    this.connectedSince = Date.now();
    this.resumed = this.lastSequenceNum > 0;
    let streamUrl = new URL(
      `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${this.sessionId}/events/stream`,
    );
    if (this.lastSequenceNum > 0)
      streamUrl.searchParams.set("from_sequence_num", String(this.lastSequenceNum));
    if (this.controlOnly) streamUrl.searchParams.set("control_only", "1");
    let abortController = new AbortController();
    this.abortController = abortController;
    let auth;
    try {
      auth = await this.authHeaders();
    } catch (error) {
      if (this.abortController !== abortController) return;
      logForDebugging(`[SessionsV2Client] Could not build the stream's credentials: ${errorMessage(error)}`, {
        level: "error",
      });
      this.abortController = null;
      this.handleStreamEnd();
      return;
    }
    let headers = {
      ...auth.headers,
      Accept: "text/event-stream",
    };
    if (abortController.signal.aborted || this.abortController !== abortController) return;
    if (this.lastSequenceNum > 0) headers["Last-Event-ID"] = String(this.lastSequenceNum);
    logForDebugging(
      `[SessionsV2Client] Connecting to ${streamUrl.href} (from_sequence_num=${this.lastSequenceNum})`,
    );
    this.readStream(streamUrl, headers, abortController, auth.bearer, auth.withheld);
  }
  loadTrustedDeviceToken() {
    if (this.withholdTrustedDeviceToken) return Promise.resolve("");
    let loadingToken = undefined;
    let clearIfUnchanged = () => {
      if (this.trustedDeviceToken === loadingToken) this.trustedDeviceToken = undefined;
    };
    let tokenPromise = (async () => {
      try {
        let token = (await getTrustedDeviceToken()) ?? "";
        if (!token) clearIfUnchanged();
        return token;
      } catch (error) {
        clearIfUnchanged();
        logForDebugging(
          `[SessionsV2Client] trusted-device token unavailable, sending no td-v1 header: ${errorMessage(error)}`,
        );
        return "";
      }
    })();
    loadingToken = tokenPromise;
    return tokenPromise;
  }
  rereadTrustedDeviceToken() {
    this.trustedDeviceToken = undefined;
    if (isDeviceIdentityEnabledCached()) clearTrustedDeviceTokenCache();
  }
  async recoverTrustedDeviceToken(reason, challenge) {
    try {
      if (this.withholdTrustedDeviceToken) return false;
      if (!(await isDeviceIdentityEnabled())) return false;
      if (!shouldCloudSessionEnroll(reason)) {
        logRefusalWithoutEnrollment("[SessionsV2Client]", reason);
        this.rereadTrustedDeviceToken();
        return false;
      }
      let recoveredToken = await recoverFromUntrustedDevice(challenge || undefined);
      if (!recoveredToken) return false;
      this.trustedDeviceToken = Promise.resolve(recoveredToken);
      return true;
    } catch (error) {
      logForDebugging(`[SessionsV2Client] trusted-device re-enrollment failed: ${errorMessage(error)}`);
      return false;
    }
  }
  async postEvents(url, body, headers, timeoutMs = POST_EVENTS_TIMEOUT_MS) {
    let manifestData = await CCR_WORKER_FLAG(
      url,
      {
        method: "POST",
        headers,
        body: jsonStringify(body),
        signal: AbortSignal.timeout(timeoutMs),
        ...getProxyFetchOptions({
          url,
        }),
      },
      (init) => fetch(url, init),
    );
    if (manifestData.ok) {
      let firstResult = (await manifestData.json()).results?.[0];
      let sequenceNum = firstResult ? parseInt(String(firstResult.sequence_num), 10) : NaN;
      return {
        ok: true,
        sequence_num: isNaN(sequenceNum) ? 0 : sequenceNum,
      };
    }
    let refusal;
    let inactive = false;
    let tooLarge = manifestData.status === 413;
    if (manifestData.status === 403 && isDeviceIdentityEnabledCached()) {
      let refusalInfo = await classifyForbiddenResponse(manifestData);
      refusal = refusalInfo.reason === "untrusted_device" ? refusalInfo.about : undefined;
    } else if (manifestData.status === 409) inactive = await isSessionNotActiveManifest(manifestData);
    else if (manifestData.status === 400)
      tooLarge = isRemoteToolResultTooLarge(await parseAndValidateManifestFromBytes(manifestData));
    else await drainResponseBody(manifestData);
    return {
      ok: false,
      status: manifestData.status,
      refusal,
      inactive,
      tooLarge,
      sentDeviceToken: headers["X-Trusted-Device-Token"],
    };
  }
  async readStream(url, headers, abortController, withheldBearer, usedWithheldToken) {
    let response;
    let timedOut = false;
    let timer = setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, CONNECT_TIMEOUT_MS);
    try {
      response = await fetch(url.href, {
        method: "GET",
        headers,
        signal: abortController.signal,
        ...getProxyFetchOptions({
          url: url.href,
        }),
      });
    } catch (error) {
      clearTimeout(timer);
      if (this.abortController !== abortController) return;
      if (timedOut) {
        logForDebugging(`[SessionsV2Client] Connect timed out after ${CONNECT_TIMEOUT_MS}ms, reconnecting`, {
          level: "error",
        });
        logFeatureSad("remote_connect", "remote_connect_timeout");
        this.handleStreamEnd();
        return;
      }
      if (abortController.signal.aborted) return;
      logForDebugging(`[SessionsV2Client] Connect error: ${errorMessage(error)}`, {
        level: "error",
      });
      logFeatureSad("remote_connect", "remote_connect_request_failed");
      this.callbacks.onError?.(toError(error));
      if (this.abortController !== abortController) return;
      this.handleStreamEnd();
      return;
    }
    if (!response.ok || !response.body) {
      logForDebugging(`[SessionsV2Client] HTTP ${response.status} on SSE connect`, {
        level: "error",
      });
      let failure = response.status === 403 ? await classifyForbiddenResponse(response) : undefined;
      if (failure === undefined) await drainResponseBody(response);
      let reason = failure?.reason;
      clearTimeout(timer);
      if (this.abortController !== abortController) return;
      if (response.status === 401 && (usedWithheldToken || this.onAuth401)) {
        logForDebugging(
          usedWithheldToken
            ? "[SessionsV2Client] 401 on SSE connect that carried no credential \u2014 asking the holder again"
            : "[SessionsV2Client] 401 on SSE connect \u2014 refreshing",
        );
        logFeatureBad("remote_connect", "remote_connect_auth_401");
        let recovered = usedWithheldToken
          ? await recoverHostSessionsBearer(withheldBearer, "withheld").then(
              () => this.nextDialCarriesCredential(),
              () => this.nextDialCarriesCredential(),
            )
          : await (this.onAuth401?.(withheldBearer) ?? Promise.resolve(false)).catch(() => false);
        if (this.abortController !== abortController) return;
        if (!recovered && this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS && this.keepRedialling) {
          logFeatureBad("remote_connect", "remote_connect_reconnect_exhausted");
          this.state = "closed";
          this.closedCause = "exhausted";
          this.callbacks.onClose?.();
          return;
        }
        this.handleStreamEnd();
        return;
      }
      if (failure?.reason === "untrusted_device") {
        let tokenRecovered = await this.recoverTrustedDeviceToken(
          failure.about,
          headers["X-Trusted-Device-Token"],
        );
        if (this.abortController !== abortController) return;
        if (tokenRecovered) {
          logForDebugging(
            "[SessionsV2Client] untrusted_device on SSE connect \u2014 re-enrolled, reconnecting",
          );
          logFeatureSad("remote_connect", "remote_connect_untrusted_device");
          this.handleStreamEnd();
          return;
        }
      }
      if (PERMANENT_HTTP_STATUSES.has(response.status)) {
        logFeatureBad(
          "remote_connect",
          failure?.reason === "untrusted_device" && failure.about.kind === "unrecognized"
            ? "remote_connect_unknown_sub_reason"
            : "remote_connect_permanent_failure",
          deviceIdentityTelemetry(headers),
        );
        this.state = "closed";
        this.closedCause = "permanentHttp";
        this.callbacks.onClose?.(reason);
        return;
      }
      logFeatureSad("remote_connect", "remote_connect_http_error");
      this.handleStreamEnd();
      return;
    }
    clearTimeout(timer);
    if (this.abortController !== abortController) {
      response.body.cancel().catch(() => {});
      return;
    }
    let timestamp = Date.parse(response.headers.get("date") ?? "");
    if (Number.isNaN(timestamp)) {
      this.serviceClock = undefined;
      logForDebugging(
        "[SessionsV2Client] The stream answered without a Date header: frames on it cannot be dated against the service clock",
        {
          level: "warn",
        },
      );
    } else {
      this.connectedSince = timestamp;
      this.serviceClock = {
        serviceMs: timestamp,
        wallMs: Date.now(),
        monotonicMs: performance.now(),
      };
    }
    this.state = "connected";
    this.reconnectAttempts = 0;
    this.rediallingPastBudget = false;
    let connectInfo = {
      gapMs: this.downSince === undefined ? 0 : Date.now() - this.downSince,
      driftRedial: this.driftRedial,
    };
    if (this.downSince !== undefined)
      logEvent("tengu_remote_stream_regained", {
        gap_ms: connectInfo.gapMs,
        attempts: this.dialsSinceUp,
        drift_redial: connectInfo.driftRedial,
        keeps_redialling: this.keepRedialling,
      });
    this.downSince = undefined;
    this.driftRedial = false;
    this.dialsSinceUp = 0;
    this.resetLivenessTimer();
    this.startDriftWatch();
    logForDebugging("[SessionsV2Client] Connected");
    logFeatureOk("remote_connect", deviceIdentityTelemetry(headers));
    this.callbacks.onConnected?.(connectInfo);
    let reader = response.body.getReader();
    let frameBuffer = new SSEFrameBuffer();
    try {
      while (true) {
        let { done, value: chunk } = await reader.read();
        if (this.abortController !== abortController) return;
        if (done) break;
        for (let frame of frameBuffer.push(chunk)) {
          if (this.abortController !== abortController) return;
          this.resetLivenessTimer();
          if (frame.event && frame.data) this.handleFrame(frame.event, frame.id, frame.data);
        }
      }
    } catch (error) {
      if (abortController.signal.aborted) return;
      logForDebugging(`[SessionsV2Client] Stream read error: ${errorMessage(error)}`, {
        level: "error",
      });
      logFeatureSad("remote_connect", "remote_connect_stream_error");
    } finally {
      reader.releaseLock();
    }
    if (!abortController.signal.aborted) {
      logForDebugging("[SessionsV2Client] Stream ended");
      this.handleStreamEnd();
    }
  }
  handleFrame(eventName, frameId, data) {
    let parsed;
    try {
      parsed = jsonParse(data);
    } catch (error) {
      logError(
        withTelemetryMessage(
          Error(`[SessionsV2Client] Failed to parse ${eventName} frame: ${errorMessage(error)}`),
          "SessionsV2Client: failed to parse event frame",
        ),
      );
      logFeatureSad("remote_connect", "remote_connect_frame_parse_failed");
      return;
    }
    switch (eventName) {
      case "client_event": {
        let envelope = parsed;
        let sequenceNum = parseInt(frameId ?? String(envelope.sequence_num), 10);
        if (!isNaN(sequenceNum) && sequenceNum > this.lastSequenceNum) this.lastSequenceNum = sequenceNum;
        if (!hasStringType(envelope.payload)) {
          logForDebugging(
            `[SessionsV2Client] Dropping client_event with no payload.type (event_type=${envelope.event_type})`,
          );
          return;
        }
        if (envelope.payload.type === "control_response") {
          let { response } = envelope.payload;
          if (!response || typeof response !== "object" || typeof response.request_id !== "string") {
            logForDebugging(
              `[SessionsV2Client] Dropping malformed control_response from source=${envelope.source}`,
              {
                level: "warn",
              },
            );
            return;
          }
        }
        if (envelope.payload.type === "user") {
          if (
            envelope.source !== "worker" &&
            hasToolResultContent(envelope.payload) &&
            !(
              this.admitProjectPersonMessages &&
              SESSION_CLIENT_LIMITS !== null &&
              SESSION_CLIENT_LIMITS.isProjectPersonEvent(envelope.payload, envelope.source)
            )
          ) {
            logForDebugging(
              `[SessionsV2Client] Dropping worker-output-shaped user frame from source=${envelope.source} \u2014 only the worker produces tool results and execution output`,
              {
                level: "warn",
              },
            );
            return;
          }
          if (hasNonTextContent(envelope.payload)) {
            logForDebugging(
              `[SessionsV2Client] Dropping user frame with malformed content from source=${envelope.source}`,
              {
                level: "warn",
              },
            );
            return;
          }
          let content = envelope.payload.message?.content;
          if (!envelope.payload.parent_tool_use_id && Array.isArray(content)) {
            for (let block of content)
              if (block.type === "tool_result") this.answeredToolUseIds.add(block.tool_use_id);
          }
        }
        if (envelope.source !== "worker") {
          if (envelope.payload.type === "control_response") {
            if (this.issuedRequestIds.has(envelope.payload.response.request_id)) {
              logForDebugging(
                `[SessionsV2Client] Dropping control_response for this client's request_id from source=${envelope.source} \u2014 only the worker may answer our RPCs`,
                {
                  level: "warn",
                },
              );
              return;
            }
            if (
              envelope.payload.response.pending_user_dialog_requests ||
              envelope.payload.response.pending_permission_requests ||
              envelope.payload.response.pending_elicitation_requests
            ) {
              logForDebugging(
                `[SessionsV2Client] Stripping prompt-redelivery fields from control_response with source=${envelope.source}`,
              );
              let {
                pending_user_dialog_requests: pendingUserDialogRequests,
                pending_permission_requests: pendingPermissionRequests,
                pending_elicitation_requests: pendingElicitationRequests,
                ...strippedResponse
              } = envelope.payload.response;
              this.deliver(
                {
                  ...envelope.payload,
                  response: strippedResponse,
                },
                {
                  source: envelope.source,
                  ...(!isNaN(sequenceNum) && {
                    sequenceNum,
                  }),
                  ...messageTiming(envelope, this.connectedSince, this.serviceClock),
                  ...(this.resumed && {
                    resumed: true,
                  }),
                },
              );
              return;
            }
          } else if (!FORWARDED_MESSAGE_TYPES.has(envelope.payload.type)) {
            if (
              envelope.payload.type === "control_request" &&
              typeof envelope.payload.request_id === "string" &&
              this.issuedRequestIds.has(envelope.payload.request_id)
            ) {
              let uuid = "uuid" in envelope.payload ? envelope.payload.uuid : undefined;
              if (
                typeof uuid !== "string" ||
                uuid !== this.ownRequestUuids.get(envelope.payload.request_id)
              ) {
                logForDebugging(
                  `[SessionsV2Client] A copy of own request ${toPrintableExcerpt(envelope.payload.request_id)} from source=${toPrintableExcerpt(envelope.source)} under another event uuid \u2014 ignored`,
                );
                return;
              }
              let attestation = attestationStatus(envelope.device_attestation_status);
              logForDebugging(
                `[SessionsV2Client] Own request ${toPrintableExcerpt(envelope.payload.request_id)} echoed from source=${toPrintableExcerpt(envelope.source)}: device proof ${toPrintableExcerpt(envelope.device_attestation_status)} (${attestation})`,
              );
              if (attestation === "unverified") this.rereadTrustedDeviceToken();
              this.callbacks.onOwnRequestEchoed?.(envelope.payload.request_id, attestation);
              return;
            }
            logForDebugging(
              `[SessionsV2Client] Dropping ${envelope.payload.type} from source=${envelope.source}`,
            );
            return;
          }
        } else if (envelope.payload.type === "control_response") {
          this.issuedRequestIds.delete(envelope.payload.response.request_id);
          this.liveOnlyRequestIds.delete(envelope.payload.response.request_id);
          this.ownRequestUuids.delete(envelope.payload.response.request_id);
        }
        this.deliver(envelope.payload, {
          source: envelope.source,
          ...(!isNaN(sequenceNum) && {
            sequenceNum,
          }),
          ...messageTiming(envelope, this.connectedSince, this.serviceClock),
          ...(this.resumed && {
            resumed: true,
          }),
          ...(envelope.source === "worker" && isHookCallbackControlRequest(envelope)),
        });
        return;
      }
      case "ephemeral_event": {
        let envelope = parsed;
        if (envelope?.event_type === TOOL_HOST_ENDED) {
          let payload =
            typeof envelope.payload === "object" && envelope.payload !== null ? envelope.payload : {};
          let { work_id: workId, reason } = payload;
          try {
            this.callbacks.onToolHostEnded?.({
              workId: typeof workId === "string" ? workId : undefined,
              reason: typeof reason === "string" ? reason : undefined,
            });
          } catch (error) {
            logForDebugging(`[SessionsV2Client] tool_host_ended handler threw: ${errorMessage(error)}`, {
              level: "error",
            });
          }
          return;
        }
        let payload = envelope.payload;
        if (hasStringType(envelope.payload)) {
          if (
            envelope.payload.type === "control_response" &&
            typeof envelope.payload.response?.request_id === "string" &&
            this.liveOnlyRequestIds.delete(envelope.payload.response.request_id)
          ) {
            this.issuedRequestIds.delete(envelope.payload.response.request_id);
            this.ownRequestUuids.delete(envelope.payload.response.request_id);
            let {
              pending_user_dialog_requests: pendingUserDialogRequests,
              pending_permission_requests: pendingPermissionRequests,
              pending_elicitation_requests: pendingElicitationRequests,
              ...strippedResponse
            } = envelope.payload.response;
            this.deliver(
              {
                ...envelope.payload,
                response: strippedResponse,
              },
              {
                source: "worker",
              },
            );
            return;
          }
          let systemMessage = pickSystemMessageFields(payload);
          if (systemMessage && hasStringType(systemMessage)) {
            this.deliver(systemMessage, {});
            return;
          }
          if (
            envelope.payload.type === "tool_progress" &&
            envelope.payload.heartbeat === true &&
            typeof envelope.payload.parent_tool_use_id === "string" &&
            !this.answeredToolUseIds.has(envelope.payload.parent_tool_use_id)
          ) {
            this.deliver(envelope.payload, {});
            return;
          }
          if (envelope.payload.type !== "stream_event") {
            logForDebugging(`[SessionsV2Client] Dropping ${envelope.payload.type} on ephemeral channel`);
            return;
          }
          if (!normalizeStreamEvent(envelope.payload.event)) {
            logForDebugging("[SessionsV2Client] Dropping malformed stream_event on ephemeral channel", {
              level: "warn",
            });
            return;
          }
          this.deliver(envelope.payload, {});
        }
        return;
      }
      case "catch_up_truncated":
        logForDebugging("[SessionsV2Client] catch_up_truncated \u2014 transcript gap");
        logFeatureSad("remote_connect", "remote_catch_up_truncated");
        this.callbacks.onCatchUpTruncated?.();
        return;
      case "session_update": {
        let connectionStatus = parsed?.connection_status;
        if (typeof connectionStatus === "string")
          try {
            this.callbacks.onWorkerConnectionStatus?.(connectionStatus);
          } catch (error) {
            logForDebugging(
              `[SessionsV2Client] worker connection status handler threw: ${errorMessage(error)}`,
              {
                level: "error",
              },
            );
          }
        else logForDebugging("[SessionsV2Client] Ignoring session_update frame");
        return;
      }
      case "security_update": {
        let securityTier = parsed?.security_tier;
        logForDebugging(
          `[SessionsV2Client] security_update: tier ${typeof securityTier === "string" ? toPrintableExcerpt(securityTier) : typeof securityTier}`,
        );
        if (securityTier === "elevated")
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
        let stateFrame = isPlainObject(parsed) ? parsed : {};
        let { event_id: eventId, status } = stateFrame;
        if (typeof eventId !== "string" || typeof status !== "string") {
          logForDebugging("[SessionsV2Client] Ignoring delivery_update frame");
          return;
        }
        try {
          this.callbacks.onDeliveryUpdate?.({
            eventId,
            status,
          });
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
        logForDebugging(`[SessionsV2Client] Unknown SSE event type '${eventName}'`, {
          level: "warn",
        });
        return;
    }
  }
  deliver(message, meta) {
    if (!safeEmit((callback) => this.callbacks.onMessage(callback, meta), message, "SessionsV2Client"))
      logFeatureSad("remote_connect", "remote_connect_frame_handler_threw");
  }
  handleStreamEnd() {
    this.markDown();
    this.clearLivenessTimer();
    this.clearDriftWatch();
    if (this.state === "closed") return;
    this.abortController = null;
    let exhausted = this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS;
    if (exhausted && !this.keepRedialling) {
      logForDebugging(`[SessionsV2Client] Reconnect budget exhausted (${MAX_RECONNECT_ATTEMPTS}), closing`);
      logFeatureBad("remote_connect", "remote_connect_reconnect_exhausted");
      this.state = "closed";
      this.closedCause = "exhausted";
      this.callbacks.onClose?.();
      return;
    }
    if (!exhausted) this.reconnectAttempts++;
    else if (!this.rediallingPastBudget) {
      this.rediallingPastBudget = true;
      logFeatureSad("remote_connect", "remote_connect_redialling_past_budget");
    }
    this.state = "idle";
    let delayMs = exhausted
      ? MAX_RECONNECT_BACKOFF_MS
      : backoffDelayMs({
          attempt: this.reconnectAttempts,
          baseMs: RECONNECT_BACKOFF_BASE_MS,
          capMs: MAX_RECONNECT_BACKOFF_MS,
        });
    logForDebugging(
      `[SessionsV2Client] Reconnecting in ${delayMs}ms (attempt ${this.reconnectAttempts}/${this.keepRedialling ? "\u221E" : MAX_RECONNECT_ATTEMPTS}, from_sequence_num=${this.lastSequenceNum})`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.state === "closed") return;
      this.connect();
    }, delayMs);
    if (!exhausted) this.callbacks.onReconnecting?.();
  }
  onLivenessTimeout = () => {
    this.livenessTimer = null;
    logForDebugging("[SessionsV2Client] Liveness timeout, reconnecting", {
      level: "warn",
    });
    try {
      let now = Date.now();
      this.callbacks.onStreamSilent?.({
        suspended:
          now - this.lastDriftCheck > DRIFT_WATCH_INTERVAL_MS * 2 ||
          now - (this.lastHealthyAt ?? now) > SESSION_LIVENESS_TIMEOUT_MS + DRIFT_WATCH_INTERVAL_MS * 2,
      });
    } catch (error) {
      let error_2 = error instanceof Error ? error : Error("not an Error");
      logError(error_2);
    }
    this.abortController?.abort();
    this.abortController = null;
    this.handleStreamEnd();
  };
  markDown() {
    let now = Date.now();
    this.downSince ??=
      this.lastHealthyAt !== undefined && now - this.lastHealthyAt >= DOWN_GRACE_MS
        ? this.lastHealthyAt
        : now;
  }
  resetLivenessTimer() {
    this.lastHealthyAt = Date.now();
    this.clearLivenessTimer();
    this.livenessTimer = setTimeout(this.onLivenessTimeout, SESSION_LIVENESS_TIMEOUT_MS);
  }
  clearLivenessTimer() {
    if (this.livenessTimer) {
      clearTimeout(this.livenessTimer);
      this.livenessTimer = null;
    }
  }
  startDriftWatch() {
    this.clearDriftWatch();
    this.lastDriftCheck = Date.now();
    this.driftTimer = setInterval(() => {
      let now = Date.now();
      let sinceDriftCheckMs = now - this.lastDriftCheck;
      this.lastDriftCheck = now;
      if (sinceDriftCheckMs > DRIFT_WATCH_INTERVAL_MS * 2 && this.state === "connected") {
        logForDebugging(
          `[SessionsV2Client] Wall-clock drift ${sinceDriftCheckMs}ms \u2014 reconnecting after suspend`,
        );
        this.reconnectAfterSuspend();
      }
    }, DRIFT_WATCH_INTERVAL_MS);
    this.driftTimer.unref?.();
  }
  clearDriftWatch() {
    if (this.driftTimer) {
      clearInterval(this.driftTimer);
      this.driftTimer = null;
    }
  }
  sendEvent(event) {
    return this.trackSend(
      this.postEvent(event).then((result) =>
        result.outcome === "accepted"
          ? {
              sequence_num: result.sequence_num,
            }
          : null,
      ),
    );
  }
  trackSend(promise) {
    if (this.trackedSends !== null) {
      let trackedSends = this.trackedSends;
      trackedSends.add(promise);
      let untrack = () => {
        trackedSends.delete(promise);
      };
      promise.then(untrack, untrack);
    }
    return promise;
  }
  async postEvent(event, options = {}) {
    if (this.state === "closed") {
      logForDebugging("[SessionsV2Client] Cannot send: closed", {
        level: "warn",
      });
      logFeatureBad("remote_send_event", "remote_send_event_closed");
      return {
        outcome: "failed",
        cause: "closed",
      };
    }
    let url = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${this.sessionId}/events`;
    try {
      let startTime = performance.now();
      let signedEvent = await signClientEvent(this.eventSigner, this.sessionId, event);
      let startTime_2 = performance.now();
      let body = {
        session_id: this.sessionId,
        events: [signedEvent],
      };
      let { headers, bearer, withheld } = await this.authHeaders();
      let result = await this.postEvents(url, body, headers, options.timeoutMs);
      if (!result.ok && result.status === 401 && withheld) {
        logForDebugging(
          "[SessionsV2Client] 401 on a POST that carried no credential \u2014 asking the holder again + one resend",
        );
        await recoverHostSessionsBearer(bearer, "withheld").catch(() => {});
        result = await this.postEvents(url, body, (await this.authHeaders()).headers, options.timeoutMs);
      } else if (!result.ok && result.status === 401 && this.onAuth401) {
        logForDebugging("[SessionsV2Client] 401 on POST \u2014 refreshing + retry");
        if (await this.onAuth401(bearer))
          result = await this.postEvents(url, body, (await this.authHeaders()).headers, options.timeoutMs);
      }
      let recoveredToken = false;
      if (
        !result.ok &&
        result.refusal !== undefined &&
        (await this.recoverTrustedDeviceToken(result.refusal, result.sentDeviceToken))
      ) {
        logForDebugging("[SessionsV2Client] untrusted_device on POST \u2014 re-enrolled, retrying");
        let headers = (await this.authHeaders()).headers;
        result = await this.postEvents(url, body, headers, options.timeoutMs);
        recoveredToken = true;
      }
      if (!result.ok) {
        logForDebugging(
          `[SessionsV2Client] POST /events returned ${result.status}${result.inactive ? " (session not active)" : ""}${result.tooLarge ? " (too large)" : ""}`,
          {
            level: "warn",
          },
        );
        if (result.inactive) {
          logFeatureSad("remote_send_event", "remote_send_event_session_inactive");
          return {
            outcome: "session_inactive",
          };
        }
        logFeatureBad(
          "remote_send_event",
          result.tooLarge
            ? "remote_send_event_too_large"
            : result.refusal?.kind === "signature_wanted"
              ? "remote_send_event_signature_wanted"
              : result.refusal?.kind === "unrecognized"
                ? "remote_send_event_unknown_sub_reason"
                : "remote_send_event_http_error",
        );
        return {
          outcome: "failed",
          cause: "http",
          status: result.status,
          ...(result.tooLarge && {
            tooLarge: true,
          }),
        };
      }
      if (recoveredToken) logFeatureSad("remote_send_event", "remote_send_event_untrusted_device");
      else logFeatureOk("remote_send_event");
      return {
        outcome: "accepted",
        sequence_num: result.sequence_num,
        signMs: Math.round(startTime_2 - startTime),
        postMs: Math.round(performance.now() - startTime_2),
      };
    } catch (error) {
      logForDebugging(`[SessionsV2Client] POST /events failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureBad("remote_send_event", "remote_send_event_request_failed");
      return {
        outcome: "failed",
        cause: isTimeoutError(error) ? "timeout" : "network",
      };
    }
  }
  sendControlResponse(response, uuid = randomUUID(), options = {}) {
    logForDebugging("[SessionsV2Client] Sending control_response");
    return this.trackSend(
      this.postEvent(
        {
          ...response,
          uuid,
        },
        options,
      ),
    );
  }
  sendControlRequest(request, onFailed) {
    return this.postControlRequest(request, onFailed)?.requestId ?? null;
  }
  postControlRequest(request, onFailed) {
    if (this.state === "closed") {
      logForDebugging("[SessionsV2Client] Cannot send control_request: closed", {
        level: "warn",
      });
      return null;
    }
    let requestId = randomUUID();
    this.issuedRequestIds.add(requestId);
    if (
      (request.subtype === "mcp_authenticate" || request.subtype === "mcp_status") &&
      request.liveReply === true
    )
      this.liveOnlyRequestIds.add(requestId);
    if (this.issuedRequestIds.size > FRAME_TRACK_INTERVAL_MS) {
      logForDebugging(
        "[SessionsV2Client] issuedRequestIds overflow \u2014 evicting oldest unanswered request_id",
        {
          level: "warn",
        },
      );
      let oldestRequestId = this.issuedRequestIds.values().next().value;
      if (oldestRequestId !== undefined) {
        this.issuedRequestIds.delete(oldestRequestId);
        this.liveOnlyRequestIds.delete(oldestRequestId);
        this.ownRequestUuids.delete(oldestRequestId);
      }
    }
    let frame = {
      type: "control_request",
      request_id: requestId,
      request,
      uuid: randomUUID(),
    };
    this.ownRequestUuids.set(requestId, frame.uuid);
    logForDebugging(`[SessionsV2Client] Sending control_request: ${request.subtype}`);
    let posted = this.trackSend(
      this.postEvent(frame).then((result) => {
        if (result.outcome === "session_inactive" || (result.outcome === "failed" && result.cause === "http"))
          onFailed?.(requestId);
        return result;
      }),
    );
    return {
      requestId,
      posted,
    };
  }
  sendControlCancelRequest(requestId) {
    if (this.state === "closed") return;
    logForDebugging(`[SessionsV2Client] Sending control_cancel_request: ${requestId}`);
    this.sendEvent({
      type: "control_cancel_request",
      request_id: requestId,
      uuid: randomUUID(),
    });
  }
  isConnected() {
    return this.state === "connected";
  }
  close() {
    logForDebugging("[SessionsV2Client] Closing");
    this.state = "closed";
    this.closedCause = "deliberate";
    this.clearLivenessTimer();
    this.clearDriftWatch();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.abortController?.abort();
    this.abortController = null;
  }
  reconnect() {
    if (this.closedCause === "deliberate") {
      logForDebugging("[SessionsV2Client] Ignoring reconnect() \u2014 deliberately closed");
      return;
    }
    logForDebugging("[SessionsV2Client] Force reconnect");
    this.markDown();
    this.reconnectAttempts = 0;
    this.clearLivenessTimer();
    this.clearDriftWatch();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.abortController?.abort();
    this.abortController = null;
    this.state = "idle";
    this.connect();
  }
  reconnectAfterSuspend() {
    if (this.state === "closed" || (this.driftRedial && this.state === "connecting")) return;
    this.driftRedial = true;
    this.reconnect();
  }
  isRevivable() {
    return this.closedCause === "exhausted";
  }
  reviveAfterExhaustion() {
    if (
      !(
        this.keepRedialling &&
        this.state === "idle" &&
        this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS &&
        this.reconnectTimer !== null
      ) &&
      this.closedCause !== "exhausted"
    )
      return false;
    logFeatureSad("remote_connect", "remote_connect_revived_by_user_send");
    this.reconnect();
    return true;
  }
  nextDialCarriesCredential() {
    try {
      return sendableHostSessionsBearer(this.getAccessToken()) !== null;
    } catch {
      return false;
    }
  }
  async authHeaders() {
    let deviceToken = await (this.trustedDeviceToken ??= this.loadTrustedDeviceToken());
    let bearer = this.getAccessToken();
    let bearer_2 = sendableHostSessionsBearer(bearer);
    return {
      headers: {
        ...(bearer_2 !== null && {
          Authorization: `${BEARER_PREFIX}${bearer_2}`,
        }),
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-client-platform": getClientPlatform(),
        "x-organization-uuid": this.orgUuid,
        "User-Agent": claudeCodeUserAgent(),
        ...(deviceToken && {
          "X-Trusted-Device-Token": deviceToken,
        }),
      },
      bearer: bearer_2 ?? bearer,
      withheld: bearer_2 === null,
    };
  }
}
//@ chunk-h29vk4wn.js:36146-36163 placement
var BEARER_PREFIX = "Bearer ";
//@ chunk-h29vk4wn.js:36163-36278 placement
function deviceIdentityTelemetry(headers) {
  return {
    trusted_device_token_sent: headers["X-Trusted-Device-Token"] !== undefined,
    device_identity_flag_on: isDeviceIdentityEnabledCached(),
  };
}
//@ chunk-h29vk4wn.js:36278-36452 placement
async function classifyForbiddenResponse(manifestData) {
  let manifest = await parseAndValidateManifestFromBytes(manifestData);
  let untrustedDeviceRefusal = readUntrustedDeviceRefusal(manifest);
  return untrustedDeviceRefusal !== undefined
    ? {
        reason: "untrusted_device",
        about: untrustedDeviceRefusal,
      }
    : {
        reason:
          classifyElevatedAuthError(manifest) === "session_stale_relogin"
            ? "session_stale_relogin"
            : undefined,
      };
}
//@ chunk-h29vk4wn.js:36452-36504 placement
function isRemoteToolResultTooLarge(value) {
  return value !== undefined && jsonStringify(value).includes(REMOTE_TOOL_RESULT_TOO_LARGE);
}
//@ chunk-h29vk4wn.js:36504-36568 affinity
async function isSessionNotActiveManifest(manifestData) {
  return sessionNotActiveErrorSchema().safeParse(await parseAndValidateManifestFromBytes(manifestData))
    .success;
}
export { STREAM_READ_CHUNK_BYTES, SessionsV2Client };

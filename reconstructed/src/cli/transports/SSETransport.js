/**
 * cli/transports/SSETransport.ts
 *
 * SSE 传输：从 CCR 读取事件流（活性超时、重连、worker 能力声明）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/transports/SSETransport.ts
 * pieces: chunk-fp6aqx1j.js (22), chunk-jbbd2121.js (5), chunk-wn385gmf.js (1)
 * attribution: placement 18, fingerprint 4, layout 2, sole-consumer 3, affinity 1
 */
import { logError } from "../../utils/log.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { getSessionIngressAuthHeaders } from "../../utils/sessionIngressAuth.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import {
  getClientPlatform,
  claudeCodeUserAgent,
  drainResponseBody,
  DEFAULT_DRAIN_TIMEOUT_MS,
} from "../../utils/http.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { readRequestIdSource, isNonOriginSource } from "../../services/api/requestIdSource.js";
import { errorMessage, toError } from "../../utils/errors.js";
import { X_CCR_SESSION_WRITERS, parseSessionWritersHeader } from "./streamEventCoalescing.js";
import { recordPhase } from "../../utils/startupTiming.js";
import { countJsonMembers, sliceTopLevelValues } from "../../utils/jsonScan.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { backoffDelayMs, sleep } from "../../utils/sleep.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-fp6aqx1j.js:142330-142344 placement
/**
 * SSE 连接的建连超时 30000ms。
 */
var SSE_CONNECT_TIMEOUT_MS = 30000;
//@ chunk-fp6aqx1j.js:142344-142426 placement
var SSE_FRAME_STALL_MS = 50;
var SSE_MAX_PENDING_CHARS = 16384;
var SSE_FRAME_STALL_MIN_MS = 500;
var SSE_TICK_INTERVAL_MS = 10;
var SSE_STALL_CHECK_MS = 1000;
var SSE_LINE_THROTTLE_MS = 1000;
var SSE_MAX_BUFFERED_CHARS = 3;
var SSE_TELEMETRY_MS_CAP = 3600000;
var SSE_TELEMETRY_KIB_CAP = 1048576;
var SSE_TELEMETRY_COUNT_CAP = 1e6;
//@ chunk-fp6aqx1j.js:142426-145297 placement
/**
 * 解码 SSE 帧并按时钟分发，检测停滞。
 */
class SSEFrameReader {
  decoder;
  clock;
  sink;
  watch = null;
  cancelTick = null;
  nextTickDueMs = 1 / 0;
  lastTickLagMs = 0;
  lastTickAtMs = 0;
  dispatchedSeen;
  lastLineAtMs = -1 / 0;
  disabled = false;
  constructor(e, clock = REAL_SSE_CLOCK, sink = logSseFrameStall) {
    this.decoder = e;
    this.clock = clock;
    this.sink = sink;
    this.dispatchedSeen = e.framesDispatched;
  }
  observe(e, n) {
    let s = this.decoder.framesDispatched - this.dispatchedSeen;
    this.dispatchedSeen = this.decoder.framesDispatched;
    if (this.watch === null && this.decoder.pendingChars === 0 && !n.some(isClientEventFrame)) return;
    if (this.disabled) return;
    try {
      this.onRead(e, s, n);
    } catch (error) {
      this.disable(error);
    }
  }
  stop() {
    this.cancelTick?.();
    this.cancelTick = null;
    this.nextTickDueMs = 1 / 0;
    this.watch = null;
  }
  onRead(e, n, s) {
    let r = this.clock.nowMs();
    let lastCpuMicros = this.clock.cpuMicros();
    let w =
      n > 0 && this.decoder.pendingChars > 0 ? Math.min(Buffer.byteLength(this.decoder.buffered()), e) : 0;
    let watch = this.watch;
    let y = null;
    if (watch !== null) {
      if (watch.reads === 0 && n === 0 && !this.frameHasBegun()) return;
      let O = {
        gapMs: r - watch.lastReadAtMs,
        loopLagMs: this.loopLagAt(r),
        cpuMs: (lastCpuMicros - watch.lastCpuMicros) / 1000,
      };
      this.stop();
      if (watch.reads === 0) {
        if (O.loopLagMs !== null && O.gapMs - O.loopLagMs <= SSE_FRAME_STALL_MIN_MS)
          y = {
            gapMs: O.gapMs,
            loopLagMs: O.loopLagMs,
            cpuMs: O.cpuMs,
          };
      } else {
        if (O.gapMs > watch.maxGap.gapMs) {
          watch.maxGap = O;
          watch.maxGapOffsetBytes = watch.bytes;
        }
        watch.reads++;
        watch.bytes += e;
        watch.lastReadAtMs = r;
        watch.lastCpuMicros = lastCpuMicros;
        if (n === 0) {
          this.watch = watch;
          this.armTick(r);
          return;
        }
        watch.bytes -= w;
        this.report(watch, r);
      }
    }
    if (this.frameHasBegun()) {
      this.watch = createReadWatch(r, lastCpuMicros, {
        reads: 1,
        bytes: n === 0 ? e : w,
        before: n === 0 ? y : null,
      });
      this.armTick(r);
      return;
    }
    if (y !== null && n === 1)
      this.report(
        createReadWatch(r, lastCpuMicros, {
          reads: 1,
          bytes: e,
          before: y,
        }),
        r,
      );
    if (s.some(isClientEventFrame)) {
      this.watch = createReadWatch(r, lastCpuMicros, {
        reads: 0,
        bytes: 0,
        before: null,
      });
      this.armTick(r);
    }
  }
  frameHasBegun() {
    let pendingChars = this.decoder.pendingChars;
    return (
      pendingChars > SSE_MAX_BUFFERED_CHARS || (pendingChars > 0 && /[^\r\n]/.test(this.decoder.buffered()))
    );
  }
  report(e, n) {
    let { before, maxGap } = e;
    let h = before !== null && before.loopLagMs >= SSE_FRAME_STALL_MS && e.bytes >= SSE_MAX_PENDING_CHARS;
    if (maxGap.gapMs < SSE_FRAME_STALL_MS && !h) return;
    if (n - this.lastLineAtMs < SSE_LINE_THROTTLE_MS) return;
    this.lastLineAtMs = n;
    this.sink({
      frame_kib: clampTelemetryNumber(e.bytes / 1024, SSE_TELEMETRY_KIB_CAP),
      read_count: clampTelemetryNumber(e.reads, SSE_TELEMETRY_COUNT_CAP),
      receive_ms: clampTelemetryNumber(n - e.startedAtMs, SSE_TELEMETRY_MS_CAP),
      ...(before !== null && {
        before_frame_gap_ms: clampTelemetryNumber(before.gapMs, SSE_TELEMETRY_MS_CAP),
        before_frame_loop_lag_ms: clampTelemetryNumber(before.loopLagMs, SSE_TELEMETRY_MS_CAP),
        before_frame_cpu_ms: clampTelemetryNumber(before.cpuMs, SSE_TELEMETRY_MS_CAP),
      }),
      max_gap_ms: clampTelemetryNumber(maxGap.gapMs, SSE_TELEMETRY_MS_CAP),
      max_gap_offset_kib: clampTelemetryNumber(e.maxGapOffsetBytes / 1024, SSE_TELEMETRY_KIB_CAP),
      ...(maxGap.loopLagMs !== null && {
        max_gap_loop_lag_ms: clampTelemetryNumber(maxGap.loopLagMs, SSE_TELEMETRY_MS_CAP),
      }),
      max_gap_cpu_ms: clampTelemetryNumber(maxGap.cpuMs, SSE_TELEMETRY_MS_CAP),
    });
  }
  loopLagAt(e) {
    if (this.nextTickDueMs !== 1 / 0) return Math.max(this.lastTickLagMs, e - this.nextTickDueMs, 0);
    return e - this.lastTickAtMs <= SSE_TICK_INTERVAL_MS ? this.lastTickLagMs : null;
  }
  armTick(e) {
    this.lastTickLagMs = 0;
    this.lastTickAtMs = e;
    this.nextTickDueMs = e + SSE_TICK_INTERVAL_MS;
    this.cancelTick = this.clock.setTimer(this.onTick, SSE_TICK_INTERVAL_MS);
  }
  onTick = () => {
    try {
      this.cancelTick = null;
      let watch = this.watch;
      if (watch === null) return;
      let n = this.clock.nowMs();
      this.lastTickLagMs = Math.max(n - this.nextTickDueMs, 0);
      this.lastTickAtMs = n;
      let s = watch.reads === 0 ? SSE_FRAME_STALL_MIN_MS : SSE_STALL_CHECK_MS;
      if (n - watch.lastReadAtMs >= s) {
        this.nextTickDueMs = 1 / 0;
        return;
      }
      this.nextTickDueMs = n + SSE_TICK_INTERVAL_MS;
      this.cancelTick = this.clock.setTimer(this.onTick, SSE_TICK_INTERVAL_MS);
    } catch (error) {
      this.disable(error);
    }
  };
  disable(e) {
    this.disabled = true;
    this.stop();
    logError(e);
  }
}
//@ chunk-fp6aqx1j.js:145297-145476 placement
function createReadWatch(e, lastCpuMicros, { reads, bytes, before }) {
  return {
    reads,
    bytes,
    startedAtMs: e,
    lastReadAtMs: e,
    lastCpuMicros,
    before,
    maxGap: {
      gapMs: 0,
      loopLagMs: 0,
      cpuMs: 0,
    },
    maxGapOffsetBytes: 0,
  };
}
//@ chunk-fp6aqx1j.js:145476-145523 placement
function isClientEventFrame(e) {
  return e.event === "client_event";
}
//@ chunk-fp6aqx1j.js:145523-145606 placement
function clampTelemetryNumber(e, n) {
  return Number.isFinite(e) ? Math.min(Math.max(Math.round(e), 0), n) : 0;
}
//@ chunk-fp6aqx1j.js:145606-145655 placement
function logSseFrameStall(e) {
  logForDiagnosticsNoPII("warn", "cli_sse_frame_stall", e);
}
//@ chunk-fp6aqx1j.js:145655-145717 placement
function processCpuMicros() {
  let e = process.cpuUsage();
  return e.user + e.system;
}
//@ chunk-fp6aqx1j.js:145717-145793 placement
function setUnrefTimer(e, n) {
  let timer = setTimeout(e, n);
  timer.unref();
  return () => clearTimeout(timer);
}
//@ chunk-fp6aqx1j.js:145793-145855 placement
var REAL_SSE_CLOCK = {
  nowMs: () => performance.now(),
  cpuMicros: processCpuMicros,
  setTimer: setUnrefTimer,
};
//@ chunk-fp6aqx1j.js:145855-146071 placement
var CONTENT_TYPE_KINDS = new Map([
  ["", "none"],
  ["text/event-stream", "event-stream"],
  ["text/html", "html"],
  ["application/xhtml+xml", "html"],
  ["application/json", "json"],
  ["text/plain", "text"],
  ["application/xml", "xml"],
  ["text/xml", "xml"],
]);
//@ chunk-fp6aqx1j.js:146071-146190 placement
/**
 * 把 Content-Type 头（去参数、取第一项、小写）归类为 none/event-stream/html/json/text/xml/other，用于 SSE 连接失败诊断。
 */
function classifyContentType(e) {
  let lower = firstLineOf(firstLineOf(e ?? "", ";"), ",")
    .trim()
    .toLowerCase();
  return CONTENT_TYPE_KINDS.get(lower) ?? (lower.endsWith("+json") ? "json" : "other");
}
//@ chunk-fp6aqx1j.js:146190-146651 placement
/**
 * worker 能力与 attestation 版本常量，以及签名等级与状态由弱到强的排序表（用于比较 meetsLevel）。
 */
var WORKER_CAPABILITIES = "worker_capabilities";
var ATTESTATION_FLOOR_1 = "attestation-floor/1";
var ATTESTATION_FLOOR_VERSION = "2";
var WORKER_SOCKET_2 = "worker-socket/2";
var WORKER_SOCKET_PAD_1 = "worker-socket-pad/1";
var X_CCR_ATTESTATION_POLICY = "x-ccr-attestation-policy";
var ATTESTATION_LEVEL_RANK = new Map([
  ["verified", "VERIFIED"],
  ["verified_keyless_device", "VERIFIED_KEYLESS_DEVICE"],
  ["verified_by_gate", "VERIFIED_BY_GATE"],
]);
var ATTESTATION_STATUS_RANK = new Map([
  ["server_authored", "SERVER_AUTHORED"],
  ["server_replayed", "SERVER_REPLAYED"],
  ["absent", "ABSENT"],
  ["invalid", "INVALID"],
  ["unchecked", "UNCHECKED"],
  ["unspecified", "UNSPECIFIED"],
]);
//@ chunk-fp6aqx1j.js:146651-147368 placement
function parseAttestationPolicy(e) {
  if (e === null)
    return {
      policy: undefined,
      fault: undefined,
    };
  let n = new Map();
  for (let v of firstLineOf(e, ", ").split(";")) {
    let trimmed = v.trim();
    let index = trimmed.indexOf("=");
    let C = index === -1 ? "" : trimmed.slice(0, index);
    if (C !== "" && !n.has(C)) n.set(C, trimmed.slice(index + 1));
  }
  let s = n.get("mode");
  if (n.get("v") !== "1")
    return {
      policy: undefined,
      fault: "policy_unparseable",
    };
  if (s === "off")
    return {
      policy: undefined,
      fault: undefined,
    };
  if (s !== "observe" && s !== "enforce")
    return {
      policy: undefined,
      fault: "policy_unparseable",
    };
  let r = ATTESTATION_LEVEL_RANK.get(n.get("level") ?? "");
  let h = new Set();
  let w = false;
  for (let v of (n.get("accept") ?? "").split(",")) {
    let y = ATTESTATION_STATUS_RANK.get(v);
    if (y !== undefined) h.add(y);
    else if (v !== "") w = true;
  }
  return {
    policy: {
      enforce: s === "enforce",
      acceptLevel: r ?? "VERIFIED_BY_GATE",
      acceptStatuses: h,
    },
    fault: r === undefined || w ? "policy_partial" : undefined,
  };
}
//@ chunk-fp6aqx1j.js:147368-147811 placement
/**
 * SSETransport 的时间与重试常量：重连退避 1s–30s、保活间隔默认 15s（上限 60s）、活性超时宽限、长轮询 25s、POST 最多 10 次（0.5–8s 退避）、永久失败状态码 401/403/404。
 */
var RECONNECT_BASE_DELAY_MS = 1000;
var RECONNECT_MAX_DELAY_MS = 30000;
var CLOCK_SKEW_TOLERANCE_MS = 60000;
var DEFAULT_KEEPALIVE_INTERVAL_SECONDS = 15;
var MAX_KEEPALIVE_INTERVAL_SECONDS = 60;
var LIVENESS_TIMEOUT_GRACE_MS = 30000;
var dOMException = new DOMException("no frame within the liveness timeout", "AbortError");
var dOMException_2 = new DOMException("the connection is renewed", "AbortError");
var RECENT_LIVENESS_WINDOW_GRACE_MS = 15000;
var KEEPALIVE_TOLERANCE_MULTIPLIER = 3;
var KEEPALIVE_TOLERANCE_SECONDS = "keepalive_tolerance_seconds";
var X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS = "x-ccr-sse-keepalive-interval-seconds";
var LONG_POLL_TIMEOUT_SECONDS_VALUE = 25;
var LONG_POLL_TIMEOUT_SECONDS = "long_poll_timeout_seconds";
var X_CCR_SSE_LONG_POLL_SECONDS = "x-ccr-sse-long-poll-seconds";
var MAX_LONG_POLL_SECONDS = 60;
var SILENT_CONNECTIONS_BEFORE_LONG_POLL = 2;
var SILENT_CONNECTION_MIN_MS = 2000;
var PERMANENT_HTTP_STATUSES = new Set([401, 403, 404]);
var EVENT_STREAM_CONTENT_TYPE_RE = /\btext\/event-stream\b/i;
var POST_MAX_ATTEMPTS = 10;
var POST_RETRY_BASE_DELAY_MS = 500;
var POST_RETRY_MAX_DELAY_MS = 8000;
//@ chunk-fp6aqx1j.js:147811-147834 placement
function acceptAnyHttpStatus() {
  return true;
}
//@ chunk-fp6aqx1j.js:147834-148053 placement
var SESSION_EVENT_TYPES_WITH_EVENT_TYPE = new Set([
  "workflow_launch",
  "queued_notification",
  "session_notice",
]);
var eventTypeEnvelopeSchema = DoctorLazy(() =>
  u({
    event_type: string(),
  }),
);
var HEARTBEAT_PROBE = "heartbeat_probe";
var OWNER_PRESENT = "owner_present";
var CHECKPOINT_REQUEST = "checkpoint_request";
var EVENT_ID_FIELDS = new Set(["event_id"]);
var QUOTED_EVENT_ID_RE = /^"([\w-]{1,128})"$/;
//@ chunk-fp6aqx1j.js:148053-172030 fingerprint = SSETransport (0.512)
/**
 * SSETransport：从 CCR 会话流读取 SSE 帧（自动重连、Last-Event-ID），写入走 POST 到同一路径（去掉 /stream）。
 */
class SSETransport {
  url;
  state = "idle";
  onData;
  onUserFrameReceived;
  onCloseCallback;
  onEventCallback;
  onDeliveredCallback;
  eventFilter;
  workerAttestationPolicySink;
  connectionPolicyReading;
  connectionSessionWriters;
  frameSessionWriters = new WeakMap();
  onEventVetoed;
  mostMembersInAFrame;
  lighterFrame;
  streamOpener;
  onFrameRefused;
  onHeartbeatProbe;
  onOwnerPresent;
  onCheckpointRequest;
  onDeviceStatusPublished;
  onReconnected;
  onDiagnostic;
  headers;
  sessionId;
  refreshHeaders;
  getAuthHeaders;
  connectTimeoutMs;
  abortController = null;
  lastSequenceNum = 0;
  seenSequenceNums = new Set();
  reconnectAttempts = 0;
  hasEverConnected = false;
  reconnectStartTime = null;
  reconnectTimer = null;
  connectErrorsSeen = new Set();
  livenessTimer = null;
  lastLivenessEvidenceAtMs = 0;
  lastFrameReadAtMs = 0;
  sseKeepaliveMaxIntervalSeconds;
  requireStreamEvidence;
  onUnexpectedContentType;
  advertisedMaxIntervalSeconds;
  echoedIntervalSeconds;
  longPollFallback;
  longPollMode;
  silentConnectionStreak = 0;
  bodyBytesThisConnection = 0;
  askedLongPollThisConnection = false;
  longPollEchoedSeconds;
  sequenceNumAtOpen = 0;
  requestStartedAtMs = 0;
  quietRedial = false;
  nonOriginPolicy;
  nonOriginStreak = null;
  postUrl;
  serviceClockAtConnect;
  serviceClockAtFirstConnect;
  hasConnectedBefore = false;
  held = null;
  isHeldForRenewal = false;
  statementRenewalGate;
  endedForRenewal = new WeakSet();
  constructor(
    sseUrl,
    headers = {},
    {
      sessionId,
      refreshHeaders,
      initialSequenceNum,
      getAuthHeaders,
      connectTimeoutMs,
      deferDelivery,
      sseKeepaliveMaxIntervalSeconds,
      longPollFallback,
      initialLongPollMode,
      requireStreamEvidence,
      onUnexpectedContentType,
      mostMembersInAFrame,
      lighterFrame,
      streamOpener,
    } = {},
  ) {
    this.url = sseUrl;
    this.headers = headers;
    this.sessionId = sessionId;
    this.refreshHeaders = refreshHeaders;
    this.getAuthHeaders = getAuthHeaders ?? getSessionIngressAuthHeaders;
    this.connectTimeoutMs = connectTimeoutMs ?? SSE_CONNECT_TIMEOUT_MS;
    this.postUrl = convertSSEUrlToPostUrl(sseUrl);
    this.sseKeepaliveMaxIntervalSeconds = sseKeepaliveMaxIntervalSeconds;
    this.longPollFallback = longPollFallback;
    this.longPollMode = initialLongPollMode ?? false;
    this.requireStreamEvidence = requireStreamEvidence ?? false;
    this.onUnexpectedContentType = onUnexpectedContentType;
    this.mostMembersInAFrame = mostMembersInAFrame;
    this.lighterFrame = lighterFrame;
    this.streamOpener = streamOpener;
    if (initialSequenceNum !== undefined && initialSequenceNum > 0) this.lastSequenceNum = initialSequenceNum;
    if (deferDelivery)
      this.held = {
        frames: [],
        close: null,
      };
    logForDebugging(`SSETransport: SSE URL = ${sseUrl.href}`);
    logForDebugging(`SSETransport: POST URL = ${this.postUrl}`);
    logForDiagnosticsNoPII("info", "cli_sse_transport_initialized");
  }
  serviceNow() {
    let serviceClockAtConnect = this.serviceClockAtConnect;
    if (serviceClockAtConnect === undefined) return;
    let n = performance.now() - serviceClockAtConnect.monotonicMs;
    return Math.abs(Date.now() - serviceClockAtConnect.wallMs - n) > CLOCK_SKEW_TOLERANCE_MS
      ? undefined
      : serviceClockAtConnect.serviceMs + n;
  }
  serviceNowAtMost() {
    let serviceClockAtConnect = this.serviceClockAtConnect;
    if (serviceClockAtConnect === undefined) return;
    return (
      serviceClockAtConnect.serviceMs +
      Math.max(
        performance.now() - serviceClockAtConnect.monotonicMs,
        Date.now() - serviceClockAtConnect.wallMs,
      )
    );
  }
  firstConnectedServiceMs() {
    return this.serviceClockAtFirstConnect;
  }
  getLastSequenceNum() {
    return this.lastSequenceNum;
  }
  isLongPolling() {
    return this.longPollMode || this.askedLongPollThisConnection;
  }
  connect() {
    if (this.state !== "idle" && this.state !== "reconnecting") {
      logForDebugging(`SSETransport: Cannot connect, current state is ${this.state}`, {
        level: "error",
      });
      logForDiagnosticsNoPII("error", "cli_sse_connect_failed");
      return Promise.resolve();
    }
    this.state = "reconnecting";
    return this.openStream(undefined);
  }
  async openStream(e) {
    let now = Date.now();
    this.requestStartedAtMs = performance.now();
    let quietRedial = this.quietRedial;
    this.quietRedial = false;
    let r = clampReconnectDelay(Math.floor(Number(this.sseKeepaliveMaxIntervalSeconds?.())));
    this.advertisedMaxIntervalSeconds = r > DEFAULT_KEEPALIVE_INTERVAL_SECONDS ? r : undefined;
    this.echoedIntervalSeconds = undefined;
    this.bodyBytesThisConnection = 0;
    this.longPollEchoedSeconds = undefined;
    this.sequenceNumAtOpen = this.lastSequenceNum;
    let CLAUDE_CODE_CCR_LONG_POLL = env.CLAUDE_CODE_CCR_LONG_POLL;
    this.askedLongPollThisConnection =
      CLAUDE_CODE_CCR_LONG_POLL === true ||
      (CLAUDE_CODE_CCR_LONG_POLL !== false && this.longPollMode && this.longPollFallbackAllows());
    let w = new URL(this.url.href);
    if (this.lastSequenceNum > 0) w.searchParams.set("from_sequence_num", String(this.lastSequenceNum));
    if (this.advertisedMaxIntervalSeconds !== undefined)
      w.searchParams.set(
        KEEPALIVE_TOLERANCE_SECONDS,
        String(KEEPALIVE_TOLERANCE_MULTIPLIER * this.advertisedMaxIntervalSeconds),
      );
    if (this.askedLongPollThisConnection)
      w.searchParams.set(LONG_POLL_TIMEOUT_SECONDS, String(LONG_POLL_TIMEOUT_SECONDS_VALUE));
    let v = [
      ...(this.workerAttestationPolicySink === undefined ? [] : [ATTESTATION_FLOOR_1]),
      ...(this.streamOpener === undefined ? [] : [WORKER_SOCKET_2]),
    ];
    if (v.length > 0) w.searchParams.set(WORKER_CAPABILITIES, v.join(","));
    let authHeaders = this.getAuthHeaders();
    let O = {
      ...this.headers,
      ...authHeaders,
      Accept: "text/event-stream",
      "anthropic-version": "2023-06-01",
      "anthropic-client-platform": getClientPlatform(),
      "User-Agent": claudeCodeUserAgent(),
    };
    dedupeAuthHeaders(O, authHeaders);
    if (this.lastSequenceNum > 0) O["Last-Event-ID"] = String(this.lastSequenceNum);
    logForDebugging(`SSETransport: Opening ${w.href}`);
    logForDiagnosticsNoPII("info", "cli_sse_connect_opening");
    let abortController = new AbortController();
    this.abortController = abortController;
    let U = false;
    let min = Math.min(
      typeof this.connectTimeoutMs === "function" ? this.connectTimeoutMs() : this.connectTimeoutMs,
      MAX_TIMER_DELAY_MS,
    );
    let P =
      min > 0
        ? setTimeout(() => {
            U = true;
            abortController.abort();
          }, min)
        : undefined;
    try {
      let W = () =>
        fetch(w.href, {
          headers: O,
          signal: abortController.signal,
          ...getProxyFetchOptions({
            url: w.href,
          }),
        });
      let x;
      try {
        x = await (this.streamOpener
          ? this.streamOpener.open({
              url: w.href,
              headers: O,
              signal: abortController.signal,
              openSse: W,
            })
          : W());
      } catch (error) {
        if (abortController.signal.aborted && !U) return;
        throw error;
      } finally {
        clearTimeout(P);
        e?.();
      }
      if (U) throw Error("the connect deadline fired as the response arrived");
      if (!x.ok) {
        let q = x.status === 403 ? readRequestIdSource((he) => x.headers.get(he)) : undefined;
        await drainResponseBody(x, {
          timeoutMs: DEFAULT_DRAIN_TIMEOUT_MS,
        });
        if (abortController.signal.aborted) return;
        let j = (this.nonOriginPolicy?.now ?? Date.now)();
        let Z = this.advanceNonOriginStreak(q, j);
        let ee =
          Z !== null &&
          this.nonOriginPolicy !== undefined &&
          j - Z.startedAtMs < this.nonOriginPolicy.windowMs;
        let ie = PERMANENT_HTTP_STATUSES.has(x.status) && !ee;
        logForDebugging(
          `SSETransport: HTTP ${x.status}${ie ? " (permanent)" : ""}${q ? ` source=${q}` : ""}${ee ? ` (not origin \u2014 retrying; attempt ${Z?.attempts})` : ""}`,
          {
            level: "error",
          },
        );
        logForDiagnosticsNoPII("error", "cli_sse_connect_http_error", {
          status: x.status,
          ...(q !== undefined && {
            source: q,
          }),
          ...(Z !== null && {
            retried: ee,
          }),
        });
        this.connectErrorsSeen.add(`http_${x.status}`);
        this.diagConnectFailure(`HTTP ${x.status}${ie ? " (permanent)" : ""}`, now);
        if (ie) {
          this.nonOriginStreak = null;
          this.state = "closed";
          this.emitClose(
            x.status,
            q === undefined
              ? undefined
              : Z === null
                ? {
                    rejectSource: q,
                  }
                : {
                    rejectSource: Z.source,
                    streak: {
                      source: Z.source,
                      attempts: Z.attempts,
                      streakMs: j - Z.startedAtMs,
                    },
                  },
          );
          return;
        }
        if (ee)
          try {
            this.nonOriginPolicy?.onRefused?.();
          } catch (error) {
            logForDebugging(`SSETransport: onRefused handler threw: ${errorMessage(error)}`, {
              level: "error",
            });
          }
        this.handleConnectionError();
        return;
      }
      if (!x.body) {
        logForDebugging("SSETransport: No response body");
        this.connectErrorsSeen.add("no_response_body");
        this.diagConnectFailure("no response body", now);
        this.handleConnectionError();
        return;
      }
      if (this.requireStreamEvidence) {
        let q = classifyContentType(x.headers.get("content-type"));
        if (q !== "event-stream") {
          let j = x.headers.has(X_CCR_SESSION_WRITERS) || x.headers.has(X_CCR_ATTESTATION_POLICY);
          if (!j) {
            await drainResponseBody(x, {
              timeoutMs: DEFAULT_DRAIN_TIMEOUT_MS,
            });
            if (abortController.signal.aborted) return;
          }
          let Z = `HTTP ${x.status}, content_type=${q}, ${j ? "with" : "without"} a session service header`;
          logForDebugging(`SSETransport: ${Z}: ${j ? "taken as the stream" : "a failed connect"}`, {
            level: j ? "warn" : "error",
          });
          logForDiagnosticsNoPII(j ? "warn" : "error", "cli_sse_connect_unexpected_content_type", {
            status: x.status,
            content_type: q,
            accepted: j,
          });
          this.onUnexpectedContentType?.({
            status: x.status,
            contentType: q,
            accepted: j,
          });
          if (!j) {
            this.connectErrorsSeen.add("no_stream_evidence");
            this.diagConnectFailure(`${Z}: a proxy or gateway may have answered in place of the server`, now);
            this.handleConnectionError();
            return;
          }
        }
      }
      let z = Date.now() - now;
      let timestamp = Date.parse(x.headers.get("date") ?? "");
      if (!Number.isNaN(timestamp))
        this.serviceClockAtConnect = {
          serviceMs: timestamp,
          wallMs: Date.now(),
          monotonicMs: performance.now(),
        };
      if (!this.hasConnectedBefore) {
        this.hasConnectedBefore = true;
        this.serviceClockAtFirstConnect = Number.isNaN(timestamp) ? undefined : timestamp;
      }
      if (this.advertisedMaxIntervalSeconds !== undefined) {
        let q = Number(x.headers.get(X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS));
        if (Number.isInteger(q) && q > 0) this.echoedIntervalSeconds = clampReconnectDelay(q);
      }
      let Y = Number(x.headers.get(X_CCR_SSE_LONG_POLL_SECONDS));
      this.longPollEchoedSeconds =
        this.askedLongPollThisConnection && Number.isInteger(Y) && Y > 0
          ? Math.min(Y, MAX_LONG_POLL_SECONDS)
          : undefined;
      let R =
        this.workerAttestationPolicySink === undefined
          ? undefined
          : parseAttestationPolicy(x.headers.get(X_CCR_ATTESTATION_POLICY));
      this.connectionPolicyReading = R;
      let B = x.headers.get(X_CCR_SESSION_WRITERS);
      let sessionWritersHeader = parseSessionWritersHeader(B);
      let I =
        sessionWritersHeader === undefined
          ? undefined
          : {
              writers: sessionWritersHeader,
              statedAtMs: Date.now(),
            };
      this.connectionSessionWriters = I;
      if (R !== undefined) {
        this.workerAttestationPolicySink?.(R);
        if (abortController.signal.aborted) return;
      }
      let G =
        this.advertisedMaxIntervalSeconds === undefined
          ? ""
          : ` keepalive_interval=${this.keepaliveIntervalMs() / 1000}s${this.echoedIntervalSeconds === undefined ? " (no echo)" : ""}`;
      let X = !this.askedLongPollThisConnection
        ? ""
        : this.longPollEchoedSeconds === undefined
          ? ` long_poll=${LONG_POLL_TIMEOUT_SECONDS_VALUE}s (no echo)`
          : ` long_poll=${this.longPollEchoedSeconds}s`;
      logForDebugging("SSETransport: Connected" + G + X);
      logForDiagnosticsNoPII("info", "cli_sse_connect_connected", {
        duration_ms: z,
        ...this.keepaliveDiagnosticFields(),
        ...(this.askedLongPollThisConnection && {
          long_poll: this.longPollEchoedSeconds === undefined ? "no_echo" : "echoed",
        }),
        session_writers: sessionWritersHeader ?? (B === null ? "header_absent" : "header_unreadable"),
        ...(R !== undefined && {
          attestation_policy: R.policy === undefined ? "none" : R.policy.enforce ? "enforce" : "observe",
          ...(R.fault !== undefined && {
            attestation_policy_fault: R.fault,
          }),
        }),
      });
      if (this.reconnectAttempts === 0 && !quietRedial)
        recordPhase("sse_connect_ms", z, now - performance.timeOrigin);
      if (this.reconnectAttempts > 0) {
        let q = this.reconnectStartTime ? Math.round((Date.now() - this.reconnectStartTime) / 1000) : 0;
        this.onDiagnostic?.(
          `SSE reconnected after ${this.reconnectAttempts} attempt(s), ${q}s downtime` +
            (this.connectErrorsSeen.size > 0 ? `, errors=[${[...this.connectErrorsSeen].join(",")}]` : ""),
          "warn",
          "sse_recovered",
        );
      } else if (!quietRedial) this.onDiagnostic?.(`SSE connected in ${z}ms`, "info", "sse_connected");
      this.connectErrorsSeen.clear();
      let hasEverConnected = this.hasEverConnected;
      this.hasEverConnected = true;
      this.state = "connected";
      if (this.streamOpener?.restartsBackoffAtOpen() ?? true) this.reconnectAttempts = 0;
      this.reconnectStartTime = null;
      this.resetLivenessTimer();
      let matches = EVENT_STREAM_CONTENT_TYPE_RE.test(x.headers.get("content-type") ?? "");
      if (hasEverConnected && !quietRedial)
        try {
          this.onReconnected?.();
        } catch (error) {
          logForDebugging(`SSETransport: onReconnected handler threw: ${errorMessage(error)}`, {
            level: "error",
          });
          logForDiagnosticsNoPII("error", "cli_sse_reconnected_handler_threw");
        }
      if (this.isHeldForRenewal) {
        this.deliverHeldForRenewal(I);
        if (abortController.signal.aborted) return;
      }
      await this.readStream(x.body, matches, I);
    } catch (error) {
      if (U) {
        logForDebugging(`SSETransport: No response within ${min}ms, reconnecting`, {
          level: "error",
        });
        logForDiagnosticsNoPII("error", "cli_sse_connect_timeout", {
          timeout_ms: min,
        });
        this.connectErrorsSeen.add("connect_timeout");
        this.diagConnectFailure(`no response in ${min / 1000}s`, now);
        this.handleConnectionError();
        return;
      }
      logForDebugging(`SSETransport: Connection error: ${errorMessage(error)}`, {
        level: "error",
      });
      logForDiagnosticsNoPII("error", "cli_sse_connect_error");
      this.connectErrorsSeen.add("fetch_failed");
      this.diagConnectFailure(errorMessage(error), now);
      this.handleConnectionError();
    }
  }
  advanceNonOriginStreak(e, n) {
    let nonOriginPolicy = this.nonOriginPolicy;
    if (nonOriginPolicy === undefined || e === undefined) return null;
    if (!isNonOriginSource(e)) {
      this.nonOriginStreak = null;
      return null;
    }
    let nonOriginStreak = this.nonOriginStreak;
    if (nonOriginStreak === null || n - nonOriginStreak.lastAtMs > nonOriginPolicy.maxGapMs) {
      nonOriginStreak = {
        source: e,
        startedAtMs: n,
        lastAtMs: n,
        attempts: 0,
      };
      this.nonOriginStreak = nonOriginStreak;
    }
    nonOriginStreak.attempts++;
    nonOriginStreak.lastAtMs = n;
    return nonOriginStreak;
  }
  settleNonOriginStreakRecovered() {
    let nonOriginStreak = this.nonOriginStreak;
    if (nonOriginStreak === null) return;
    this.nonOriginStreak = null;
    let n = {
      source: nonOriginStreak.source,
      attempts: nonOriginStreak.attempts,
      streakMs: (this.nonOriginPolicy?.now ?? Date.now)() - nonOriginStreak.startedAtMs,
    };
    logForDiagnosticsNoPII("info", "cli_sse_nonorigin_403_recovered", {
      source: n.source,
      attempts: n.attempts,
      streak_ms: n.streakMs,
    });
    try {
      this.nonOriginPolicy?.onRecovered?.(n);
    } catch (error) {
      logForDebugging(`SSETransport: onRecovered handler threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  diagConnectFailure(e, n) {
    if (!this.onDiagnostic) return;
    let s = this.reconnectAttempts + 1;
    if (s > 3 && s % 10 !== 0) return;
    let r = Date.now() - n;
    let h = this.reconnectStartTime
      ? `, ${Math.round((Date.now() - this.reconnectStartTime) / 1000)}s reconnecting`
      : "";
    let w = this.connectErrorsSeen.size > 1 ? `, errors=[${[...this.connectErrorsSeen].join(",")}]` : "";
    this.onDiagnostic(
      `SSE connect failed (${e}) attempt=${s} took=${r}ms${h}${w}`,
      "warn",
      "sse_connect_failed",
    );
  }
  async readStream(body, n, s) {
    let reader = body.getReader();
    let h = new SSEFrameBuffer();
    let abortController = this.abortController;
    let v = () => abortController !== null && this.endedForRenewal.has(abortController);
    let y = n && env.CLAUDE_CODE_DIAGNOSTICS_FILE ? new SSEFrameReader(h) : null;
    let O = false;
    try {
      while (true) {
        let { done, value } = await reader.read();
        if (done) break;
        if (value.byteLength > 0) {
          this.bodyBytesThisConnection += value.byteLength;
          this.silentConnectionStreak = 0;
        }
        let S = h.push(value);
        y?.observe(value.byteLength, S);
        for (let frame of S) {
          if (!v()) {
            this.resetLivenessTimer();
            this.lastFrameReadAtMs = this.lastLivenessEvidenceAtMs;
          }
          if (this.nonOriginStreak !== null && n) this.settleNonOriginStreakRecovered();
          if (frame.id && frame.event !== "ephemeral_event") {
            let seqNum = parseInt(frame.id, 10);
            if (!isNaN(seqNum)) {
              if (this.seenSequenceNums.has(seqNum)) {
                logForDebugging(
                  `SSETransport: DUPLICATE frame seq=${seqNum} (lastSequenceNum=${this.lastSequenceNum}, seenCount=${this.seenSequenceNums.size})`,
                  {
                    level: "warn",
                  },
                );
                logForDiagnosticsNoPII("warn", "cli_sse_duplicate_sequence");
              } else {
                this.seenSequenceNums.add(seqNum);
                if (this.seenSequenceNums.size > 1000) {
                  let threshold = this.lastSequenceNum - 200;
                  for (let seenSequenceNum of this.seenSequenceNums)
                    if (seenSequenceNum < threshold) this.seenSequenceNums.delete(seenSequenceNum);
                }
              }
              if (seqNum > this.lastSequenceNum) this.lastSequenceNum = seqNum;
            }
          }
          if (frame.event && frame.data) this.handleSSEFrame(frame.event, frame.data, s);
          else if (frame.data) {
            logForDebugging("SSETransport: Frame has data: but no event: field \u2014 dropped", {
              level: "warn",
            });
            logForDiagnosticsNoPII("warn", "cli_sse_frame_missing_event_field");
          }
        }
      }
    } catch (error) {
      if (this.abortController?.signal.aborted || v()) return;
      O = true;
      logForDebugging(`SSETransport: Stream read error: ${errorMessage(error)}`, {
        level: "error",
      });
      logForDiagnosticsNoPII("error", "cli_sse_stream_read_error");
    } finally {
      y?.stop();
      reader.releaseLock();
    }
    if (this.state !== "closing" && this.state !== "closed" && !v()) {
      if (this.state === "connected") {
        let C = performance.now() - this.requestStartedAtMs;
        if (this.bodyBytesThisConnection === 0 && C >= SILENT_CONNECTION_MIN_MS) this.countSilentConnection();
        if (
          this.askedLongPollThisConnection &&
          !O &&
          (this.lastSequenceNum > this.sequenceNumAtOpen || C >= SILENT_CONNECTION_MIN_MS)
        ) {
          this.reopenAtOnce("long_poll");
          logForDebugging("SSETransport: Long poll completed, reopening");
          return;
        }
      }
      logForDebugging("SSETransport: Stream ended, reconnecting");
      if (this.state === "connected") {
        this.connectErrorsSeen.add("stream_ended");
        this.onDiagnostic?.("SSE stream ended by server, reconnecting", "warn", "sse_stream_ended");
      }
      this.handleConnectionError();
    }
  }
  handleSSEFrame(e, n, s, r = Date.now(), h = performance.now()) {
    if (
      this.mostMembersInAFrame !== undefined &&
      countJsonMembers(n, this.mostMembersInAFrame) === undefined
    ) {
      let y = this.lighterFrame?.(n);
      if (y !== undefined && countJsonMembers(y, this.mostMembersInAFrame) !== undefined) {
        this.handleSSEFrame(e, y, s, r, h);
        return;
      }
      this.onFrameRefused?.(
        QUOTED_EVENT_ID_RE.exec(sliceTopLevelValues(n, EVENT_ID_FIELDS)?.get("event_id") ?? "")?.[1],
      );
      return;
    }
    if (e === "ephemeral_event") {
      this.handleEphemeralFrame(n);
      return;
    }
    if (this.held !== null) {
      this.held.frames.push({
        eventType: e,
        data: n,
        policyReading: this.connectionPolicyReading,
        sessionWriters: s,
        receivedWallMs: r,
        receivedAtMs: h,
      });
      return;
    }
    if (e !== "client_event") {
      logForDebugging(`SSETransport: Unexpected SSE event type '${e}' on worker stream`, {
        level: "warn",
      });
      logForDiagnosticsNoPII("warn", "cli_sse_unexpected_event_type", {
        event_type: e,
      });
      return;
    }
    let w;
    try {
      w = jsonParse(n);
    } catch (error) {
      logForDebugging(`SSETransport: Failed to parse client_event data: ${errorMessage(error)}`, {
        level: "error",
      });
      return;
    }
    let payload = w.payload;
    if (payload && typeof payload === "object" && "type" in payload) {
      let y = this.sessionId ? ` session=${this.sessionId}` : "";
      let O = w.device_attestation_status ? ` attestation=${w.device_attestation_status}` : "";
      logForDebugging(
        `SSETransport: Event seq=${w.sequence_num} event_id=${w.event_id} event_type=${w.event_type} payload_type=${String(payload.type)}${O}${y}`,
      );
      logForDiagnosticsNoPII("info", "cli_sse_message_received");
      if (s !== undefined && this.state === "connected" && this.statementRenewalGate?.(w, s) === true) {
        this.held = {
          frames: [
            {
              eventType: e,
              data: n,
              policyReading: this.connectionPolicyReading,
              sessionWriters: s,
              receivedWallMs: r,
              receivedAtMs: h,
            },
          ],
          close: null,
        };
        this.isHeldForRenewal = true;
        this.renewConnection();
        return;
      }
      if (s !== undefined) this.frameSessionWriters.set(w, s);
      let C = this.eventFilter?.(w);
      if (C)
        logForDiagnosticsNoPII(
          "warn",
          "cli_sse_event_filtered",
          C === true
            ? undefined
            : {
                decision: C,
              },
        );
      else if (
        typeof payload.type === "string" &&
        SESSION_EVENT_TYPES_WITH_EVENT_TYPE.has(payload.type) &&
        w.event_type !== payload.type
      ) {
        logForDiagnosticsNoPII("warn", "cli_sse_server_only_event_type_mismatch", {
          event_type: w.event_type,
          payload_type: payload.type,
        });
        this.onEventVetoed?.(w);
      } else if (payload.type === "control_request" && w.source === "worker")
        logForDiagnosticsNoPII("warn", "cli_sse_worker_control_request_dropped");
      else {
        this.onDeliveredCallback?.(w, s, h);
        if (payload.type === "user" && typeof payload.uuid === "string")
          this.onUserFrameReceived?.(payload.uuid, r, w.processing_at, h);
        this.onData?.(
          jsonStringify(w.payload) +
            `
`,
        );
      }
    } else
      logForDebugging(`SSETransport: Ignoring client_event with no type in payload: event_id=${w.event_id}`);
    this.onEventCallback?.(w);
  }
  emitClose(e, n) {
    if (this.held !== null) {
      this.held.close = {
        code: e,
        detail: n,
      };
      if (this.isHeldForRenewal) {
        this.isHeldForRenewal = false;
        this.startDelivery();
      }
      return;
    }
    this.onCloseCallback?.(e, n);
  }
  renewConnection() {
    if (this.state !== "connected") return;
    logForDebugging("SSETransport: Renewing the connection");
    logForDiagnosticsNoPII("info", "cli_sse_renew_connection");
    this.reopenAtOnce("renewal");
  }
  reopenAtOnce(e) {
    if (this.refreshHeaders) {
      let n = this.refreshHeaders();
      Object.assign(this.headers, n);
      dedupeAuthHeaders(this.headers, n);
    }
    this.clearLivenessTimer();
    if (e === "renewal" && this.abortController !== null) {
      this.endedForRenewal.add(this.abortController);
      this.abortController.abort(dOMException_2);
    }
    this.abortController = null;
    if (this.streamOpener?.restartsBackoffAtEnd()) this.reconnectAttempts = 0;
    this.state = "reconnecting";
    this.quietRedial = e === "long_poll";
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 0);
  }
  setStatementRenewalGate(statementRenewalGate) {
    this.statementRenewalGate = statementRenewalGate;
  }
  deliverHeldForRenewal(sessionWriters) {
    this.isHeldForRenewal = false;
    for (let n of this.held?.frames ?? []) n.sessionWriters = sessionWriters;
    this.startDelivery();
  }
  startDelivery() {
    let held = this.held;
    if (held === null) return;
    this.held = null;
    let n;
    for (let frame of held.frames) {
      if (frame.policyReading !== undefined && frame.policyReading !== n) {
        n = frame.policyReading;
        if (!this.handSinkPolicyReading(n)) return;
      }
      this.handleSSEFrame(
        frame.eventType,
        frame.data,
        frame.sessionWriters,
        frame.receivedWallMs,
        frame.receivedAtMs,
      );
    }
    if (
      this.connectionPolicyReading !== undefined &&
      this.connectionPolicyReading !== n &&
      !this.handSinkPolicyReading(this.connectionPolicyReading)
    )
      return;
    if (held.close !== null) this.onCloseCallback?.(held.close.code, held.close.detail);
  }
  handSinkPolicyReading(e) {
    this.workerAttestationPolicySink?.(e);
    return this.state !== "closing";
  }
  handleEphemeralFrame(e) {
    let n;
    try {
      n = jsonParse(e);
    } catch (error) {
      logForDebugging(`SSETransport: Failed to parse ephemeral_event data: ${errorMessage(error)}`, {
        level: "error",
      });
      return;
    }
    let s = eventTypeEnvelopeSchema().safeParse(n);
    if (s.success && s.data.event_type === OWNER_PRESENT && this.onOwnerPresent !== undefined) {
      logForDiagnosticsNoPII("info", "cli_sse_owner_present_received");
      try {
        this.onOwnerPresent();
      } catch (error) {
        logForDebugging(`SSETransport: onOwnerPresent handler threw: ${errorMessage(error)}`, {
          level: "error",
        });
      }
      return;
    }
    if (s.success && s.data.event_type === CHECKPOINT_REQUEST && this.onCheckpointRequest !== undefined) {
      logForDiagnosticsNoPII("info", "cli_sse_checkpoint_request_received");
      try {
        this.onCheckpointRequest();
      } catch (error) {
        logError(error);
        logForDiagnosticsNoPII("error", "cli_sse_checkpoint_request_handler_threw");
      }
      return;
    }
    if (!s.success || s.data.event_type !== HEARTBEAT_PROBE) {
      logForDiagnosticsNoPII("warn", "cli_sse_unexpected_ephemeral_type", {
        event_type: s.success ? s.data.event_type : "unparseable",
      });
      return;
    }
    logForDiagnosticsNoPII("info", "cli_sse_heartbeat_probe_received");
    try {
      this.onHeartbeatProbe?.();
    } catch (error) {
      logForDebugging(`SSETransport: onHeartbeatProbe handler threw: ${errorMessage(error)}`, {
        level: "error",
      });
      logForDiagnosticsNoPII("error", "cli_sse_heartbeat_probe_handler_threw");
    }
  }
  handleConnectionError() {
    this.clearLivenessTimer();
    if (this.state === "closing" || this.state === "closed") return;
    this.abortController?.abort();
    this.abortController = null;
    let now = Date.now();
    if (!this.reconnectStartTime) this.reconnectStartTime = now;
    let elapsed = now - this.reconnectStartTime;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.refreshHeaders) {
      let freshHeaders = this.refreshHeaders();
      Object.assign(this.headers, freshHeaders);
      dedupeAuthHeaders(this.headers, freshHeaders);
      logForDebugging("SSETransport: Refreshed headers for reconnect");
    }
    this.state = "reconnecting";
    if (this.streamOpener?.restartsBackoffAtEnd()) this.reconnectAttempts = 0;
    this.reconnectAttempts++;
    let s = this.streamOpener?.reconnectsAtOnce()
      ? 0
      : backoffDelayMs({
          attempt: this.reconnectAttempts,
          baseMs: RECONNECT_BASE_DELAY_MS,
          capMs: RECONNECT_MAX_DELAY_MS,
          jitter: {
            kind: "symmetric",
            ratio: 0.25,
          },
        });
    logForDebugging(
      `SSETransport: Reconnecting in ${Math.round(s)}ms (attempt ${this.reconnectAttempts}, ${Math.round(elapsed / 1000)}s elapsed)`,
    );
    logForDiagnosticsNoPII("error", "cli_sse_reconnect_attempt", {
      reconnectAttempts: this.reconnectAttempts,
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, s);
  }
  onLivenessTimeout = () => {
    this.livenessTimer = null;
    logForDebugging("SSETransport: Liveness timeout, reconnecting", {
      level: "error",
    });
    logForDiagnosticsNoPII("error", "cli_sse_liveness_timeout", this.keepaliveDiagnosticFields());
    this.connectErrorsSeen.add("liveness_timeout");
    this.onDiagnostic?.(
      `SSE liveness timeout \u2014 no frame in ${this.livenessTimeoutMs() / 1000}s, reconnecting`,
      "warn",
      "sse_liveness_timeout",
    );
    let e = this.state === "connected" && this.bodyBytesThisConnection === 0;
    this.abortController?.abort(dOMException);
    this.handleConnectionError();
    if (e) this.countSilentConnection();
  };
  countSilentConnection() {
    this.silentConnectionStreak++;
    if (
      this.silentConnectionStreak >= SILENT_CONNECTIONS_BEFORE_LONG_POLL &&
      !this.longPollMode &&
      env.CLAUDE_CODE_CCR_LONG_POLL !== false &&
      this.longPollFallbackAllows()
    ) {
      this.longPollMode = true;
      logForDebugging(
        `SSETransport: No body bytes on ${SILENT_CONNECTIONS_BEFORE_LONG_POLL} connections in a row; asking for long-poll responses from here on`,
        {
          level: "warn",
        },
      );
      logForDiagnosticsNoPII("warn", "cli_sse_long_poll_mode");
      this.onDiagnostic?.(
        `SSE stream delivered no bytes on ${SILENT_CONNECTIONS_BEFORE_LONG_POLL} consecutive connections; asking the server for long-poll responses (a proxy may be buffering the response body)`,
        "warn",
        "sse_long_poll_mode",
      );
    }
  }
  longPollFallbackAllows() {
    try {
      return this.longPollFallback?.() === true;
    } catch (error) {
      logForDiagnosticsNoPII("error", "cli_sse_long_poll_fallback_threw");
      logError(error);
      return false;
    }
  }
  resetLivenessTimer() {
    this.lastLivenessEvidenceAtMs = Date.now();
    this.clearLivenessTimer();
    this.livenessTimer = setTimeout(this.onLivenessTimeout, this.livenessTimeoutMs());
  }
  keepaliveIntervalMs() {
    return (
      (this.echoedIntervalSeconds ??
        this.advertisedMaxIntervalSeconds ??
        DEFAULT_KEEPALIVE_INTERVAL_SECONDS) * 1000
    );
  }
  livenessTimeoutMs() {
    return this.longestExpectedSilenceMs() + LIVENESS_TIMEOUT_GRACE_MS;
  }
  longestExpectedSilenceMs() {
    return Math.max(this.keepaliveIntervalMs(), (this.longPollEchoedSeconds ?? 0) * 1000);
  }
  keepaliveDiagnosticFields() {
    return this.advertisedMaxIntervalSeconds === undefined
      ? {}
      : {
          keepalive_tolerance_s: KEEPALIVE_TOLERANCE_MULTIPLIER * this.advertisedMaxIntervalSeconds,
          keepalive_interval_s: this.keepaliveIntervalMs() / 1000,
          liveness_timeout_s: this.livenessTimeoutMs() / 1000,
          keepalive_interval_echoed: this.echoedIntervalSeconds !== undefined,
        };
  }
  clearLivenessTimer() {
    if (this.livenessTimer) {
      clearTimeout(this.livenessTimer);
      this.livenessTimer = null;
    }
  }
  async write(message) {
    let authHeaders = this.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0) {
      logForDebugging("SSETransport: No session token available for POST");
      logForDiagnosticsNoPII("warn", "cli_sse_post_no_token");
      return;
    }
    let headers = {
      ...authHeaders,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-client-platform": getClientPlatform(),
      "User-Agent": claudeCodeUserAgent(),
    };
    logForDebugging(`SSETransport: POST body keys=${Object.keys(message).join(",")}`);
    for (let attempt = 1; attempt <= POST_MAX_ATTEMPTS; attempt++) {
      try {
        let response = await axios_default.post(this.postUrl, message, {
          headers,
          validateStatus: acceptAnyHttpStatus,
        });
        if (response.status === 200 || response.status === 201) {
          logForDebugging(`SSETransport: POST success type=${message.type}`);
          return;
        }
        logForDebugging(
          `SSETransport: POST ${response.status} body=${jsonStringify(response.data).slice(0, 200)}`,
        );
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          logForDebugging(`SSETransport: POST returned ${response.status} (client error), not retrying`);
          logForDiagnosticsNoPII("warn", "cli_sse_post_client_error", {
            status: response.status,
          });
          return;
        }
        logForDebugging(
          `SSETransport: POST returned ${response.status}, attempt ${attempt}/${POST_MAX_ATTEMPTS}`,
        );
        logForDiagnosticsNoPII("warn", "cli_sse_post_retryable_error", {
          status: response.status,
          attempt,
        });
      } catch (error) {
        logForDebugging(
          `SSETransport: POST error: ${errorMessage(error)}, attempt ${attempt}/${POST_MAX_ATTEMPTS}`,
        );
        logForDiagnosticsNoPII("warn", "cli_sse_post_network_error", {
          attempt,
        });
      }
      if (attempt === POST_MAX_ATTEMPTS) {
        logForDebugging(`SSETransport: POST failed after ${POST_MAX_ATTEMPTS} attempts, continuing`);
        logForDiagnosticsNoPII("warn", "cli_sse_post_retries_exhausted");
        return;
      }
      await sleep(
        backoffDelayMs({
          attempt,
          baseMs: POST_RETRY_BASE_DELAY_MS,
          capMs: POST_RETRY_MAX_DELAY_MS,
        }),
      );
    }
  }
  isConnectedStatus() {
    return this.state === "connected";
  }
  isReadStreamRecentlyAlive() {
    return (
      this.state === "connected" &&
      Date.now() - this.lastLivenessEvidenceAtMs < this.getReadStreamRecentLivenessWindowMs()
    );
  }
  lastFrameReadAt() {
    return this.lastFrameReadAtMs === 0 ? undefined : this.lastFrameReadAtMs;
  }
  getReadStreamRecentLivenessWindowMs() {
    return this.longestExpectedSilenceMs() + RECENT_LIVENESS_WINDOW_GRACE_MS;
  }
  isClosedStatus() {
    return this.state === "closed";
  }
  setOnData(onData) {
    this.onData = onData;
  }
  setOnUserFrameReceived(onUserFrameReceived) {
    this.onUserFrameReceived = onUserFrameReceived;
  }
  setOnClose(onCloseCallback) {
    this.onCloseCallback = onCloseCallback;
  }
  setNonOriginRejectionPolicy(nonOriginPolicy) {
    this.nonOriginPolicy = nonOriginPolicy;
  }
  setOnEvent(onEventCallback) {
    this.onEventCallback = onEventCallback;
  }
  setOnDelivered(onDeliveredCallback) {
    this.onDeliveredCallback = onDeliveredCallback;
  }
  getSessionWriters() {
    return this.connectionSessionWriters?.writers;
  }
  getSessionWritersStatement() {
    return this.connectionSessionWriters;
  }
  sessionWritersOf(e) {
    return this.frameSessionWriters.get(e);
  }
  setOnDiagnostic(onDiagnostic) {
    this.onDiagnostic = onDiagnostic;
  }
  setEventFilter(eventFilter) {
    this.eventFilter = eventFilter;
  }
  setWorkerAttestationPolicySink(workerAttestationPolicySink) {
    this.workerAttestationPolicySink = workerAttestationPolicySink;
  }
  requiresStreamEvidence() {
    return this.requireStreamEvidence;
  }
  setOnFrameRefused(onFrameRefused) {
    this.onFrameRefused = onFrameRefused;
  }
  setOnEventVetoed(onEventVetoed) {
    this.onEventVetoed = onEventVetoed;
  }
  setOnHeartbeatProbe(onHeartbeatProbe) {
    this.onHeartbeatProbe = onHeartbeatProbe;
  }
  setOnOwnerPresent(onOwnerPresent) {
    this.onOwnerPresent = onOwnerPresent;
  }
  setOnCheckpointRequest(onCheckpointRequest) {
    this.onCheckpointRequest = onCheckpointRequest;
  }
  setOnDeviceStatusPublished(onDeviceStatusPublished) {
    this.onDeviceStatusPublished = onDeviceStatusPublished;
  }
  setOnReconnected(onReconnected) {
    this.onReconnected = onReconnected;
  }
  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearLivenessTimer();
    this.state = "closing";
    this.nonOriginStreak = null;
    this.held = null;
    this.isHeldForRenewal = false;
    this.abortController?.abort();
    this.abortController = null;
  }
  [Symbol.dispose]() {
    this.close();
  }
}
//@ chunk-fp6aqx1j.js:172030-172149 layout
function dedupeAuthHeaders(headers, n) {
  if (n.Cookie) delete headers.Authorization;
  if (n.Authorization) {
    delete headers.Cookie;
    delete headers["X-Organization-Uuid"];
  }
}
//@ chunk-fp6aqx1j.js:172149-172199 layout
function clampReconnectDelay(e) {
  return Math.min(Math.max(e, DEFAULT_KEEPALIVE_INTERVAL_SECONDS), MAX_KEEPALIVE_INTERVAL_SECONDS);
}
//@ chunk-fp6aqx1j.js:172199-172309 fingerprint = convertSSEUrlToPostUrl (1)
function convertSSEUrlToPostUrl(sseUrl) {
  let pathname = sseUrl.pathname;
  if (pathname.endsWith("/stream")) pathname = pathname.slice(0, -7);
  return `${sseUrl.protocol}//${sseUrl.host}${pathname}`;
}
//@ chunk-fp6aqx1j.js:172309-172333 placement
/**
 * SSE 长轮询超时 180000ms 与短轮询超时 90000ms。
 */
var LONG_POLL_TIMEOUT_MS = 180000;
var SHORT_POLL_TIMEOUT_MS = 90000;
//@ chunk-jbbd2121.js:191-209 sole-consumer
var STREAM_DECODE_OPTS = {
  stream: true,
};
//@ chunk-jbbd2121.js:209-346 sole-consumer
function lineBreakLengthAt(n, t) {
  let code = n.charCodeAt(t);
  if (code === 10) return 1;
  if (code === 13) {
    if (t + 1 >= n.length) return -1;
    return n.charCodeAt(t + 1) === 10 ? 2 : 1;
  }
  return 0;
}
//@ chunk-jbbd2121.js:346-577 sole-consumer
function findFrameDelimiter(n, t) {
  let e = t;
  while (e < n.length) {
    let r = lineBreakLengthAt(n, e);
    if (r === 0) {
      e++;
      continue;
    }
    if (r === -1) return null;
    let i = e + r;
    if (i >= n.length) return null;
    let s = lineBreakLengthAt(n, i);
    if (s === -1) return null;
    if (s > 0)
      return {
        contentEnd: e,
        afterDelim: i + s,
      };
    e = i;
  }
  return null;
}
//@ chunk-jbbd2121.js:577-937 fingerprint = parseSSEFrames (0.756)
/**
 * 解析一段 SSE 帧文本为 {event,data,id}；全是注释时返回 null。
 */
function parseSSEFrames(buffer) {
  if (!/\S/.test(buffer)) return null;
  let frame = {};
  let isComment = false;
  for (let line of buffer.split(/\r\n|\r|\n/)) {
    if (line.startsWith(":")) {
      isComment = true;
      continue;
    }
    let colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    let field = line.slice(0, colonIdx);
    let value = line[colonIdx + 1] === " " ? line.slice(colonIdx + 2) : line.slice(colonIdx + 1);
    switch (field) {
      case "event":
        frame.event = value;
        break;
      case "id":
        frame.id = value;
        break;
      case "data":
        frame.data = frame.data
          ? frame.data +
            `
` +
            value
          : value;
        break;
    }
  }
  return frame.data || isComment ? frame : null;
}
//@ chunk-jbbd2121.js:937-2142 affinity
/**
 * SSE 增量解析缓冲：累积文本块，按空行切帧并逐帧派发。
 */
class SSEFrameBuffer {
  decoder = new TextDecoder();
  pending = [];
  pendingLength = 0;
  dispatched = 0;
  get pendingChars() {
    return this.pendingLength;
  }
  get framesDispatched() {
    return this.dispatched;
  }
  push(n) {
    let t = typeof n === "string" ? n : this.decoder.decode(n, STREAM_DECODE_OPTS);
    if (!t) return [];
    return this.drain(t);
  }
  flush() {
    let n = this.decoder.decode();
    if (n) {
      this.pending.push(n);
      this.pendingLength += n.length;
    }
    let buffer = this.joinPending();
    this.pending = [];
    this.pendingLength = 0;
    let sseFrames = parseSSEFrames(buffer);
    return sseFrames ? [sseFrames] : [];
  }
  buffered() {
    return this.joinPending();
  }
  drain(n) {
    let t = [];
    let pendingLength = this.pendingLength;
    let min = Math.min(3, pendingLength);
    let i = this.tail(min) + n;
    let s = pendingLength - min;
    let d = 0;
    let o = -1;
    for (;;) {
      let frameDelimiter = findFrameDelimiter(i, d);
      if (!frameDelimiter) break;
      let l = s + frameDelimiter.contentEnd;
      let buffer;
      if (o === -1) {
        let h = this.joinPending();
        buffer = l <= pendingLength ? h.slice(0, l) : h + n.slice(0, l - pendingLength);
      } else buffer = n.slice(o - pendingLength, l - pendingLength);
      let sseFrames = parseSSEFrames(buffer);
      if (sseFrames) t.push(sseFrames);
      this.dispatched++;
      o = s + frameDelimiter.afterDelim;
      d = frameDelimiter.afterDelim;
    }
    if (o === -1) {
      this.pending.push(n);
      this.pendingLength = pendingLength + n.length;
    } else {
      let sliced = n.slice(o - pendingLength);
      this.pending = sliced ? [sliced] : [];
      this.pendingLength = sliced.length;
    }
    return t;
  }
  tail(n) {
    if (n <= 0) return "";
    let t = n;
    let e = "";
    for (let j = this.pending.length - 1; j >= 0 && t > 0; j--) {
      let i = this.pending[j];
      if (i.length <= t) {
        e = i + e;
        t -= i.length;
      } else {
        e = i.slice(i.length - t) + e;
        t = 0;
      }
    }
    return e;
  }
  joinPending() {
    return this.pending.length === 1 ? this.pending[0] : this.pending.join("");
  }
}
//@ chunk-wn385gmf.js:25653-25747 fingerprint = STREAM_DECODE_OPTS (0.518)
function STREAM_DECODE_OPTS_2(n) {
  return function (...e) {
    try {
      n.apply(this, e);
    } catch (error) {
      this.stream.destroy(toError(error));
    }
  };
}
export {
  SSEFrameBuffer,
  SSE_CONNECT_TIMEOUT_MS,
  LONG_POLL_TIMEOUT_MS,
  SSETransport,
  SHORT_POLL_TIMEOUT_MS,
  STREAM_DECODE_OPTS_2,
  dOMException,
  dOMException_2,
  WORKER_CAPABILITIES,
  WORKER_SOCKET_PAD_1,
  X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS,
  X_CCR_ATTESTATION_POLICY,
  SESSION_EVENT_TYPES_WITH_EVENT_TYPE,
  ATTESTATION_FLOOR_VERSION,
};

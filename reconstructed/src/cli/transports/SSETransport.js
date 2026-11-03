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
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { getSessionIngressAuthHeaders } from "../../utils/sessionIngressAuth.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { getClientPlatform, claudeCodeUserAgent, drainResponseBody, Dun } from "../../utils/http.js";
import { ec } from "../../utils/timerDelayClamp.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { readRequestIdSource, v5e } from "../../services/api/requestIdSource.js";
import { errorMessage, toError } from "../../utils/errors.js";
import { X_CCR_SESSION_WRITERS, parseSessionWritersHeader } from "./streamEventCoalescing.js";
import { Br } from "../../utils/startupTiming.js";
import { countJsonMembers, Bpe } from "../../utils/jsonScan.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { backoffDelayMs, sleep } from "../../utils/sleep.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-fp6aqx1j.js:142330-142344 placement
var hUr = 30000;
//@ chunk-fp6aqx1j.js:142344-142426 placement
var nn = 50,
  ur = 16384,
  sn = 500,
  ge = 10,
  cr = 1000,
  hr = 1000,
  pr = 3,
  de = 3600000,
  rn = 1048576,
  fr = 1e6;
/**
 * 解码 SSE 帧并按时钟分发，检测停滞。
 */
//@ chunk-fp6aqx1j.js:142426-145297 placement
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
  disabled = !1;
  constructor(e, n = gr, s = _r) {
    this.decoder = e;
    this.clock = n;
    this.sink = s;
    this.dispatchedSeen = e.framesDispatched;
  }
  observe(e, n) {
    let s = this.decoder.framesDispatched - this.dispatchedSeen;
    if (
      ((this.dispatchedSeen = this.decoder.framesDispatched),
      this.watch === null && this.decoder.pendingChars === 0 && !n.some(on))
    )
      return;
    if (this.disabled) return;
    try {
      this.onRead(e, s, n);
    } catch (error) {
      this.disable(error);
    }
  }
  stop() {
    (this.cancelTick?.(), (this.cancelTick = null), (this.nextTickDueMs = 1 / 0), (this.watch = null));
  }
  onRead(e, n, s) {
    let nowMs = this.clock.nowMs(),
      cpuMicros = this.clock.cpuMicros(),
      w =
        n > 0 && this.decoder.pendingChars > 0 ? Math.min(Buffer.byteLength(this.decoder.buffered()), e) : 0,
      watch = this.watch,
      y = null;
    if (watch !== null) {
      if (watch.reads === 0 && n === 0 && !this.frameHasBegun()) return;
      let O = {
        gapMs: nowMs - watch.lastReadAtMs,
        loopLagMs: this.loopLagAt(nowMs),
        cpuMs: (cpuMicros - watch.lastCpuMicros) / 1000,
      };
      if ((this.stop(), watch.reads === 0)) {
        if (O.loopLagMs !== null && O.gapMs - O.loopLagMs <= sn)
          y = { gapMs: O.gapMs, loopLagMs: O.loopLagMs, cpuMs: O.cpuMs };
      } else {
        if (O.gapMs > watch.maxGap.gapMs) ((watch.maxGap = O), (watch.maxGapOffsetBytes = watch.bytes));
        if (
          (watch.reads++,
          (watch.bytes += e),
          (watch.lastReadAtMs = nowMs),
          (watch.lastCpuMicros = cpuMicros),
          n === 0)
        ) {
          ((this.watch = watch), this.armTick(nowMs));
          return;
        }
        ((watch.bytes -= w), this.report(watch, nowMs));
      }
    }
    if (this.frameHasBegun()) {
      ((this.watch = createReadWatch(nowMs, cpuMicros, {
        reads: 1,
        bytes: n === 0 ? e : w,
        before: n === 0 ? y : null,
      })),
        this.armTick(nowMs));
      return;
    }
    if (y !== null && n === 1)
      this.report(createReadWatch(nowMs, cpuMicros, { reads: 1, bytes: e, before: y }), nowMs);
    if (s.some(on))
      ((this.watch = createReadWatch(nowMs, cpuMicros, { reads: 0, bytes: 0, before: null })),
        this.armTick(nowMs));
  }
  frameHasBegun() {
    let pendingChars = this.decoder.pendingChars;
    return pendingChars > pr || (pendingChars > 0 && /[^\r\n]/.test(this.decoder.buffered()));
  }
  report(e, n) {
    let { before: before, maxGap: maxGap } = e,
      h = before !== null && before.loopLagMs >= nn && e.bytes >= ur;
    if (maxGap.gapMs < nn && !h) return;
    if (n - this.lastLineAtMs < hr) return;
    ((this.lastLineAtMs = n),
      this.sink({
        frame_kib: re(e.bytes / 1024, rn),
        read_count: re(e.reads, fr),
        receive_ms: re(n - e.startedAtMs, de),
        ...(before !== null && {
          before_frame_gap_ms: re(before.gapMs, de),
          before_frame_loop_lag_ms: re(before.loopLagMs, de),
          before_frame_cpu_ms: re(before.cpuMs, de),
        }),
        max_gap_ms: re(maxGap.gapMs, de),
        max_gap_offset_kib: re(e.maxGapOffsetBytes / 1024, rn),
        ...(maxGap.loopLagMs !== null && { max_gap_loop_lag_ms: re(maxGap.loopLagMs, de) }),
        max_gap_cpu_ms: re(maxGap.cpuMs, de),
      }));
  }
  loopLagAt(e) {
    if (this.nextTickDueMs !== 1 / 0) return Math.max(this.lastTickLagMs, e - this.nextTickDueMs, 0);
    return e - this.lastTickAtMs <= ge ? this.lastTickLagMs : null;
  }
  armTick(e) {
    ((this.lastTickLagMs = 0),
      (this.lastTickAtMs = e),
      (this.nextTickDueMs = e + ge),
      (this.cancelTick = this.clock.setTimer(this.onTick, ge)));
  }
  onTick = () => {
    try {
      this.cancelTick = null;
      let watch = this.watch;
      if (watch === null) return;
      let nowMs = this.clock.nowMs();
      ((this.lastTickLagMs = Math.max(nowMs - this.nextTickDueMs, 0)), (this.lastTickAtMs = nowMs));
      let s = watch.reads === 0 ? sn : cr;
      if (nowMs - watch.lastReadAtMs >= s) {
        this.nextTickDueMs = 1 / 0;
        return;
      }
      ((this.nextTickDueMs = nowMs + ge), (this.cancelTick = this.clock.setTimer(this.onTick, ge)));
    } catch (error) {
      this.disable(error);
    }
  };
  disable(e) {
    ((this.disabled = !0), this.stop(), logError(e));
  }
}
//@ chunk-fp6aqx1j.js:145297-145476 placement
function createReadWatch(e, n, { reads: reads, bytes: bytes, before: before }) {
  return {
    reads: reads,
    bytes: bytes,
    startedAtMs: e,
    lastReadAtMs: e,
    lastCpuMicros: n,
    before: before,
    maxGap: { gapMs: 0, loopLagMs: 0, cpuMs: 0 },
    maxGapOffsetBytes: 0,
  };
}
//@ chunk-fp6aqx1j.js:145476-145523 placement
function on(e) {
  return e.event === "client_event";
}
//@ chunk-fp6aqx1j.js:145523-145606 placement
function re(e, n) {
  return Number.isFinite(e) ? Math.min(Math.max(Math.round(e), 0), n) : 0;
}
//@ chunk-fp6aqx1j.js:145606-145655 placement
function _r(e) {
  logForDiagnosticsNoPII("warn", "cli_sse_frame_stall", e);
}
//@ chunk-fp6aqx1j.js:145655-145717 placement
function mr() {
  let cpuUsage = process.cpuUsage();
  return cpuUsage.user + cpuUsage.system;
}
//@ chunk-fp6aqx1j.js:145717-145793 placement
function vr(e, n) {
  let s = setTimeout(e, n);
  return (s.unref(), () => clearTimeout(s));
}
//@ chunk-fp6aqx1j.js:145793-145855 placement
var gr = { nowMs: () => performance.now(), cpuMicros: mr, setTimer: vr };
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
/**
 * 把 Content-Type 头（去参数、取第一项、小写）归类为 none/event-stream/html/json/text/xml/other，用于 SSE 连接失败诊断。
 */
//@ chunk-fp6aqx1j.js:146071-146190 placement
function classifyContentType(e) {
  let lower = firstLineOf(firstLineOf(e ?? "", ";"), ",")
    .trim()
    .toLowerCase();
  return CONTENT_TYPE_KINDS.get(lower) ?? (lower.endsWith("+json") ? "json" : "other");
}
//@ chunk-fp6aqx1j.js:146190-146651 placement
var WORKER_CAPABILITIES = "worker_capabilities",
  ATTESTATION_FLOOR_1 = "attestation-floor/1",
  TKs = "2",
  WORKER_SOCKET_2 = "worker-socket/2",
  WORKER_SOCKET_PAD_1 = "worker-socket-pad/1",
  X_CCR_ATTESTATION_POLICY = "x-ccr-attestation-policy",
  yr = new Map([
    ["verified", "VERIFIED"],
    ["verified_keyless_device", "VERIFIED_KEYLESS_DEVICE"],
    ["verified_by_gate", "VERIFIED_BY_GATE"],
  ]),
  Sr = new Map([
    ["server_authored", "SERVER_AUTHORED"],
    ["server_replayed", "SERVER_REPLAYED"],
    ["absent", "ABSENT"],
    ["invalid", "INVALID"],
    ["unchecked", "UNCHECKED"],
    ["unspecified", "UNSPECIFIED"],
  ]);
//@ chunk-fp6aqx1j.js:146651-147368 placement
function parseAttestationPolicy(e) {
  if (e === null) return { policy: void 0, fault: void 0 };
  let n = new Map();
  for (let v of firstLineOf(e, ", ").split(";")) {
    let trimmed = v.trim(),
      index = trimmed.indexOf("="),
      C = index === -1 ? "" : trimmed.slice(0, index);
    if (C !== "" && !n.has(C)) n.set(C, trimmed.slice(index + 1));
  }
  let s = n.get("mode");
  if (n.get("v") !== "1") return { policy: void 0, fault: "policy_unparseable" };
  if (s === "off") return { policy: void 0, fault: void 0 };
  if (s !== "observe" && s !== "enforce") return { policy: void 0, fault: "policy_unparseable" };
  let r = yr.get(n.get("level") ?? ""),
    h = new Set(),
    w = !1;
  for (let v of (n.get("accept") ?? "").split(",")) {
    let y = Sr.get(v);
    if (y !== void 0) h.add(y);
    else if (v !== "") w = !0;
  }
  return {
    policy: { enforce: s === "enforce", acceptLevel: r ?? "VERIFIED_BY_GATE", acceptStatuses: h },
    fault: r === void 0 || w ? "policy_partial" : void 0,
  };
}
/**
 * SSETransport 的时间与重试常量：重连退避 1s–30s、保活间隔默认 15s（上限 60s）、活性超时宽限、长轮询 25s、POST 最多 10 次（0.5–8s 退避）、永久失败状态码 401/403/404。
 */
//@ chunk-fp6aqx1j.js:147368-147811 placement
var RECONNECT_BASE_DELAY_MS = 1000,
  RECONNECT_MAX_DELAY_MS = 30000,
  CLOCK_SKEW_TOLERANCE_MS = 60000,
  DEFAULT_KEEPALIVE_INTERVAL_SECONDS = 15,
  MAX_KEEPALIVE_INTERVAL_SECONDS = 60,
  LIVENESS_TIMEOUT_GRACE_MS = 30000,
  dOMException = new DOMException("no frame within the liveness timeout", "AbortError"),
  dOMException_2 = new DOMException("the connection is renewed", "AbortError"),
  RECENT_LIVENESS_WINDOW_GRACE_MS = 15000,
  KEEPALIVE_TOLERANCE_MULTIPLIER = 3,
  KEEPALIVE_TOLERANCE_SECONDS = "keepalive_tolerance_seconds",
  X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS = "x-ccr-sse-keepalive-interval-seconds",
  LONG_POLL_TIMEOUT_SECONDS_VALUE = 25,
  LONG_POLL_TIMEOUT_SECONDS = "long_poll_timeout_seconds",
  X_CCR_SSE_LONG_POLL_SECONDS = "x-ccr-sse-long-poll-seconds",
  MAX_LONG_POLL_SECONDS = 60,
  SILENT_CONNECTIONS_BEFORE_LONG_POLL = 2,
  SILENT_CONNECTION_MIN_MS = 2000,
  PERMANENT_HTTP_STATUSES = new Set([401, 403, 404]),
  EVENT_STREAM_CONTENT_TYPE_RE = /\btext\/event-stream\b/i,
  POST_MAX_ATTEMPTS = 10,
  POST_RETRY_BASE_DELAY_MS = 500,
  POST_RETRY_MAX_DELAY_MS = 8000;
//@ chunk-fp6aqx1j.js:147811-147834 placement
function Wr() {
  return !0;
}
//@ chunk-fp6aqx1j.js:147834-148053 placement
var SESSION_EVENT_TYPES_WITH_EVENT_TYPE = new Set([
    "workflow_launch",
    "queued_notification",
    "session_notice",
  ]),
  eventTypeEnvelopeSchema = DoctorLazy(() => u({ event_type: o() })),
  HEARTBEAT_PROBE = "heartbeat_probe",
  OWNER_PRESENT = "owner_present",
  CHECKPOINT_REQUEST = "checkpoint_request",
  EVENT_ID_FIELDS = new Set(["event_id"]),
  QUOTED_EVENT_ID_RE = /^"([\w-]{1,128})"$/;
/**
 * SSETransport：从 CCR 会话流读取 SSE 帧（自动重连、Last-Event-ID），写入走 POST 到同一路径（去掉 /stream）。
 */
//@ chunk-fp6aqx1j.js:148053-172030 fingerprint = SSETransport (0.512)
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
  hasEverConnected = !1;
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
  askedLongPollThisConnection = !1;
  longPollEchoedSeconds;
  sequenceNumAtOpen = 0;
  requestStartedAtMs = 0;
  quietRedial = !1;
  nonOriginPolicy;
  nonOriginStreak = null;
  postUrl;
  serviceClockAtConnect;
  serviceClockAtFirstConnect;
  hasConnectedBefore = !1;
  held = null;
  isHeldForRenewal = !1;
  statementRenewalGate;
  endedForRenewal = new WeakSet();
  constructor(
    e,
    n = {},
    {
      sessionId: sessionId,
      refreshHeaders: refreshHeaders,
      initialSequenceNum: initialSequenceNum,
      getAuthHeaders: getAuthHeaders,
      connectTimeoutMs: connectTimeoutMs,
      deferDelivery: deferDelivery,
      sseKeepaliveMaxIntervalSeconds: sseKeepaliveMaxIntervalSeconds,
      longPollFallback: longPollFallback,
      initialLongPollMode: initialLongPollMode,
      requireStreamEvidence: requireStreamEvidence,
      onUnexpectedContentType: onUnexpectedContentType,
      mostMembersInAFrame: mostMembersInAFrame,
      lighterFrame: lighterFrame,
      streamOpener: streamOpener,
    } = {},
  ) {
    this.url = e;
    if (
      ((this.headers = n),
      (this.sessionId = sessionId),
      (this.refreshHeaders = refreshHeaders),
      (this.getAuthHeaders = getAuthHeaders ?? getSessionIngressAuthHeaders),
      (this.connectTimeoutMs = connectTimeoutMs ?? hUr),
      (this.postUrl = convertSSEUrlToPostUrl(e)),
      (this.sseKeepaliveMaxIntervalSeconds = sseKeepaliveMaxIntervalSeconds),
      (this.longPollFallback = longPollFallback),
      (this.longPollMode = initialLongPollMode ?? !1),
      (this.requireStreamEvidence = requireStreamEvidence ?? !1),
      (this.onUnexpectedContentType = onUnexpectedContentType),
      (this.mostMembersInAFrame = mostMembersInAFrame),
      (this.lighterFrame = lighterFrame),
      (this.streamOpener = streamOpener),
      initialSequenceNum !== void 0 && initialSequenceNum > 0)
    )
      this.lastSequenceNum = initialSequenceNum;
    if (deferDelivery) this.held = { frames: [], close: null };
    (logForDebugging(`SSETransport: SSE URL = ${e.href}`),
      logForDebugging(`SSETransport: POST URL = ${this.postUrl}`),
      logForDiagnosticsNoPII("info", "cli_sse_transport_initialized"));
  }
  serviceNow() {
    let serviceClockAtConnect = this.serviceClockAtConnect;
    if (serviceClockAtConnect === void 0) return;
    let n = performance.now() - serviceClockAtConnect.monotonicMs;
    return Math.abs(Date.now() - serviceClockAtConnect.wallMs - n) > CLOCK_SKEW_TOLERANCE_MS
      ? void 0
      : serviceClockAtConnect.serviceMs + n;
  }
  serviceNowAtMost() {
    let serviceClockAtConnect = this.serviceClockAtConnect;
    if (serviceClockAtConnect === void 0) return;
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
    if (this.state !== "idle" && this.state !== "reconnecting")
      return (
        logForDebugging(`SSETransport: Cannot connect, current state is ${this.state}`, { level: "error" }),
        logForDiagnosticsNoPII("error", "cli_sse_connect_failed"),
        Promise.resolve()
      );
    return ((this.state = "reconnecting"), this.openStream(void 0));
  }
  async openStream(e) {
    let now = Date.now();
    this.requestStartedAtMs = performance.now();
    let quietRedial = this.quietRedial;
    this.quietRedial = !1;
    let r = clampReconnectDelay(Math.floor(Number(this.sseKeepaliveMaxIntervalSeconds?.())));
    ((this.advertisedMaxIntervalSeconds = r > DEFAULT_KEEPALIVE_INTERVAL_SECONDS ? r : void 0),
      (this.echoedIntervalSeconds = void 0),
      (this.bodyBytesThisConnection = 0),
      (this.longPollEchoedSeconds = void 0),
      (this.sequenceNumAtOpen = this.lastSequenceNum));
    let CLAUDE_CODE_CCR_LONG_POLL = env.CLAUDE_CODE_CCR_LONG_POLL;
    this.askedLongPollThisConnection =
      CLAUDE_CODE_CCR_LONG_POLL === !0 ||
      (CLAUDE_CODE_CCR_LONG_POLL !== !1 && this.longPollMode && this.longPollFallbackAllows());
    let w = new URL(this.url.href);
    if (this.lastSequenceNum > 0) w.searchParams.set("from_sequence_num", String(this.lastSequenceNum));
    if (this.advertisedMaxIntervalSeconds !== void 0)
      w.searchParams.set(
        KEEPALIVE_TOLERANCE_SECONDS,
        String(KEEPALIVE_TOLERANCE_MULTIPLIER * this.advertisedMaxIntervalSeconds),
      );
    if (this.askedLongPollThisConnection)
      w.searchParams.set(LONG_POLL_TIMEOUT_SECONDS, String(LONG_POLL_TIMEOUT_SECONDS_VALUE));
    let v = [
      ...(this.workerAttestationPolicySink === void 0 ? [] : [ATTESTATION_FLOOR_1]),
      ...(this.streamOpener === void 0 ? [] : [WORKER_SOCKET_2]),
    ];
    if (v.length > 0) w.searchParams.set(WORKER_CAPABILITIES, v.join(","));
    let authHeaders = this.getAuthHeaders(),
      O = {
        ...this.headers,
        ...authHeaders,
        Accept: "text/event-stream",
        "anthropic-version": "2023-06-01",
        "anthropic-client-platform": getClientPlatform(),
        "User-Agent": claudeCodeUserAgent(),
      };
    if ((dedupeAuthHeaders(O, authHeaders), this.lastSequenceNum > 0))
      O["Last-Event-ID"] = String(this.lastSequenceNum);
    (logForDebugging(`SSETransport: Opening ${w.href}`),
      logForDiagnosticsNoPII("info", "cli_sse_connect_opening"));
    let abortController = new AbortController();
    this.abortController = abortController;
    let U = !1,
      min = Math.min(
        typeof this.connectTimeoutMs === "function" ? this.connectTimeoutMs() : this.connectTimeoutMs,
        ec,
      ),
      P =
        min > 0
          ? setTimeout(() => {
              ((U = !0), abortController.abort());
            }, min)
          : void 0;
    try {
      let W = () =>
          fetch(w.href, {
            headers: O,
            signal: abortController.signal,
            ...getProxyFetchOptions({ url: w.href }),
          }),
        x;
      try {
        x = await (this.streamOpener
          ? this.streamOpener.open({ url: w.href, headers: O, signal: abortController.signal, openSse: W })
          : W());
      } catch (error) {
        if (abortController.signal.aborted && !U) return;
        throw error;
      } finally {
        (clearTimeout(P), e?.());
      }
      if (U) throw Error("the connect deadline fired as the response arrived");
      if (!x.ok) {
        let q = x.status === 403 ? readRequestIdSource((he) => x.headers.get(he)) : void 0;
        if ((await drainResponseBody(x, { timeoutMs: Dun }), abortController.signal.aborted)) return;
        let j = (this.nonOriginPolicy?.now ?? Date.now)(),
          advanceNonOriginStreak = this.advanceNonOriginStreak(q, j),
          ee =
            advanceNonOriginStreak !== null &&
            this.nonOriginPolicy !== void 0 &&
            j - advanceNonOriginStreak.startedAtMs < this.nonOriginPolicy.windowMs,
          ie = PERMANENT_HTTP_STATUSES.has(x.status) && !ee;
        if (
          (logForDebugging(
            `SSETransport: HTTP ${x.status}${ie ? " (permanent)" : ""}${q ? ` source=${q}` : ""}${ee ? ` (not origin \u2014 retrying; attempt ${advanceNonOriginStreak?.attempts})` : ""}`,
            { level: "error" },
          ),
          logForDiagnosticsNoPII("error", "cli_sse_connect_http_error", {
            status: x.status,
            ...(q !== void 0 && { source: q }),
            ...(advanceNonOriginStreak !== null && { retried: ee }),
          }),
          this.connectErrorsSeen.add(`http_${x.status}`),
          this.diagConnectFailure(`HTTP ${x.status}${ie ? " (permanent)" : ""}`, now),
          ie)
        ) {
          ((this.nonOriginStreak = null),
            (this.state = "closed"),
            this.emitClose(
              x.status,
              q === void 0
                ? void 0
                : advanceNonOriginStreak === null
                  ? { rejectSource: q }
                  : {
                      rejectSource: advanceNonOriginStreak.source,
                      streak: {
                        source: advanceNonOriginStreak.source,
                        attempts: advanceNonOriginStreak.attempts,
                        streakMs: j - advanceNonOriginStreak.startedAtMs,
                      },
                    },
            ));
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
        (logForDebugging("SSETransport: No response body"),
          this.connectErrorsSeen.add("no_response_body"),
          this.diagConnectFailure("no response body", now),
          this.handleConnectionError());
        return;
      }
      if (this.requireStreamEvidence) {
        let q = classifyContentType(x.headers.get("content-type"));
        if (q !== "event-stream") {
          let j = x.headers.has(X_CCR_SESSION_WRITERS) || x.headers.has(X_CCR_ATTESTATION_POLICY);
          if (!j) {
            if ((await drainResponseBody(x, { timeoutMs: Dun }), abortController.signal.aborted)) return;
          }
          let Z = `HTTP ${x.status}, content_type=${q}, ${j ? "with" : "without"} a session service header`;
          if (
            (logForDebugging(`SSETransport: ${Z}: ${j ? "taken as the stream" : "a failed connect"}`, {
              level: j ? "warn" : "error",
            }),
            logForDiagnosticsNoPII(j ? "warn" : "error", "cli_sse_connect_unexpected_content_type", {
              status: x.status,
              content_type: q,
              accepted: j,
            }),
            this.onUnexpectedContentType?.({ status: x.status, contentType: q, accepted: j }),
            !j)
          ) {
            (this.connectErrorsSeen.add("no_stream_evidence"),
              this.diagConnectFailure(
                `${Z}: a proxy or gateway may have answered in place of the server`,
                now,
              ),
              this.handleConnectionError());
            return;
          }
        }
      }
      let z = Date.now() - now,
        parse = Date.parse(x.headers.get("date") ?? "");
      if (!Number.isNaN(parse))
        this.serviceClockAtConnect = { serviceMs: parse, wallMs: Date.now(), monotonicMs: performance.now() };
      if (!this.hasConnectedBefore)
        ((this.hasConnectedBefore = !0),
          (this.serviceClockAtFirstConnect = Number.isNaN(parse) ? void 0 : parse));
      if (this.advertisedMaxIntervalSeconds !== void 0) {
        let q = Number(x.headers.get(X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS));
        if (Number.isInteger(q) && q > 0) this.echoedIntervalSeconds = clampReconnectDelay(q);
      }
      let Y = Number(x.headers.get(X_CCR_SSE_LONG_POLL_SECONDS));
      this.longPollEchoedSeconds =
        this.askedLongPollThisConnection && Number.isInteger(Y) && Y > 0
          ? Math.min(Y, MAX_LONG_POLL_SECONDS)
          : void 0;
      let R =
        this.workerAttestationPolicySink === void 0
          ? void 0
          : parseAttestationPolicy(x.headers.get(X_CCR_ATTESTATION_POLICY));
      this.connectionPolicyReading = R;
      let B = x.headers.get(X_CCR_SESSION_WRITERS),
        L = parseSessionWritersHeader(B),
        I = L === void 0 ? void 0 : { writers: L, statedAtMs: Date.now() };
      if (((this.connectionSessionWriters = I), R !== void 0)) {
        if ((this.workerAttestationPolicySink?.(R), abortController.signal.aborted)) return;
      }
      let G =
          this.advertisedMaxIntervalSeconds === void 0
            ? ""
            : ` keepalive_interval=${this.keepaliveIntervalMs() / 1000}s${this.echoedIntervalSeconds === void 0 ? " (no echo)" : ""}`,
        X = !this.askedLongPollThisConnection
          ? ""
          : this.longPollEchoedSeconds === void 0
            ? ` long_poll=${LONG_POLL_TIMEOUT_SECONDS_VALUE}s (no echo)`
            : ` long_poll=${this.longPollEchoedSeconds}s`;
      if (
        (logForDebugging("SSETransport: Connected" + G + X),
        logForDiagnosticsNoPII("info", "cli_sse_connect_connected", {
          duration_ms: z,
          ...this.keepaliveDiagnosticFields(),
          ...(this.askedLongPollThisConnection && {
            long_poll: this.longPollEchoedSeconds === void 0 ? "no_echo" : "echoed",
          }),
          session_writers: L ?? (B === null ? "header_absent" : "header_unreadable"),
          ...(R !== void 0 && {
            attestation_policy: R.policy === void 0 ? "none" : R.policy.enforce ? "enforce" : "observe",
            ...(R.fault !== void 0 && { attestation_policy_fault: R.fault }),
          }),
        }),
        this.reconnectAttempts === 0 && !quietRedial)
      )
        Br("sse_connect_ms", z, now - performance.timeOrigin);
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
      if (
        ((this.hasEverConnected = !0),
        (this.state = "connected"),
        this.streamOpener?.restartsBackoffAtOpen() ?? !0)
      )
        this.reconnectAttempts = 0;
      ((this.reconnectStartTime = null), this.resetLivenessTimer());
      let matches = EVENT_STREAM_CONTENT_TYPE_RE.test(x.headers.get("content-type") ?? "");
      if (hasEverConnected && !quietRedial)
        try {
          this.onReconnected?.();
        } catch (error) {
          (logForDebugging(`SSETransport: onReconnected handler threw: ${errorMessage(error)}`, {
            level: "error",
          }),
            logForDiagnosticsNoPII("error", "cli_sse_reconnected_handler_threw"));
        }
      if (this.isHeldForRenewal) {
        if ((this.deliverHeldForRenewal(I), abortController.signal.aborted)) return;
      }
      await this.readStream(x.body, matches, I);
    } catch (error) {
      if (U) {
        (logForDebugging(`SSETransport: No response within ${min}ms, reconnecting`, { level: "error" }),
          logForDiagnosticsNoPII("error", "cli_sse_connect_timeout", { timeout_ms: min }),
          this.connectErrorsSeen.add("connect_timeout"),
          this.diagConnectFailure(`no response in ${min / 1000}s`, now),
          this.handleConnectionError());
        return;
      }
      (logForDebugging(`SSETransport: Connection error: ${errorMessage(error)}`, { level: "error" }),
        logForDiagnosticsNoPII("error", "cli_sse_connect_error"),
        this.connectErrorsSeen.add("fetch_failed"),
        this.diagConnectFailure(errorMessage(error), now),
        this.handleConnectionError());
    }
  }
  advanceNonOriginStreak(e, n) {
    let nonOriginPolicy = this.nonOriginPolicy;
    if (nonOriginPolicy === void 0 || e === void 0) return null;
    if (!v5e(e)) return ((this.nonOriginStreak = null), null);
    let nonOriginStreak = this.nonOriginStreak;
    if (nonOriginStreak === null || n - nonOriginStreak.lastAtMs > nonOriginPolicy.maxGapMs)
      ((nonOriginStreak = { source: e, startedAtMs: n, lastAtMs: n, attempts: 0 }),
        (this.nonOriginStreak = nonOriginStreak));
    return (nonOriginStreak.attempts++, (nonOriginStreak.lastAtMs = n), nonOriginStreak);
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
      logForDebugging(`SSETransport: onRecovered handler threw: ${errorMessage(error)}`, { level: "error" });
    }
  }
  diagConnectFailure(e, n) {
    if (!this.onDiagnostic) return;
    let s = this.reconnectAttempts + 1;
    if (s > 3 && s % 10 !== 0) return;
    let r = Date.now() - n,
      h = this.reconnectStartTime
        ? `, ${Math.round((Date.now() - this.reconnectStartTime) / 1000)}s reconnecting`
        : "",
      w = this.connectErrorsSeen.size > 1 ? `, errors=[${[...this.connectErrorsSeen].join(",")}]` : "";
    this.onDiagnostic(
      `SSE connect failed (${e}) attempt=${s} took=${r}ms${h}${w}`,
      "warn",
      "sse_connect_failed",
    );
  }
  async readStream(e, n, s) {
    let reader = e.getReader(),
      h = new SSEFrameBuffer(),
      abortController = this.abortController,
      v = () => abortController !== null && this.endedForRenewal.has(abortController),
      y = n && env.CLAUDE_CODE_DIAGNOSTICS_FILE ? new SSEFrameReader(h) : null,
      O = !1;
    try {
      while (!0) {
        let { done: done, value: value } = await reader.read();
        if (done) break;
        if (value.byteLength > 0)
          ((this.bodyBytesThisConnection += value.byteLength), (this.silentConnectionStreak = 0));
        let S = h.push(value);
        y?.observe(value.byteLength, S);
        for (let P of S) {
          if (!v()) (this.resetLivenessTimer(), (this.lastFrameReadAtMs = this.lastLivenessEvidenceAtMs));
          if (this.nonOriginStreak !== null && n) this.settleNonOriginStreakRecovered();
          if (P.id && P.event !== "ephemeral_event") {
            let W = parseInt(P.id, 10);
            if (!isNaN(W)) {
              if (this.seenSequenceNums.has(W))
                (logForDebugging(
                  `SSETransport: DUPLICATE frame seq=${W} (lastSequenceNum=${this.lastSequenceNum}, seenCount=${this.seenSequenceNums.size})`,
                  { level: "warn" },
                ),
                  logForDiagnosticsNoPII("warn", "cli_sse_duplicate_sequence"));
              else if ((this.seenSequenceNums.add(W), this.seenSequenceNums.size > 1000)) {
                let x = this.lastSequenceNum - 200;
                for (let seenSequenceNum of this.seenSequenceNums)
                  if (seenSequenceNum < x) this.seenSequenceNums.delete(seenSequenceNum);
              }
              if (W > this.lastSequenceNum) this.lastSequenceNum = W;
            }
          }
          if (P.event && P.data) this.handleSSEFrame(P.event, P.data, s);
          else if (P.data)
            (logForDebugging("SSETransport: Frame has data: but no event: field \u2014 dropped", {
              level: "warn",
            }),
              logForDiagnosticsNoPII("warn", "cli_sse_frame_missing_event_field"));
        }
      }
    } catch (error) {
      if (this.abortController?.signal.aborted || v()) return;
      ((O = !0),
        logForDebugging(`SSETransport: Stream read error: ${errorMessage(error)}`, { level: "error" }),
        logForDiagnosticsNoPII("error", "cli_sse_stream_read_error"));
    } finally {
      (y?.stop(), reader.releaseLock());
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
          (this.reopenAtOnce("long_poll"), logForDebugging("SSETransport: Long poll completed, reopening"));
          return;
        }
      }
      if ((logForDebugging("SSETransport: Stream ended, reconnecting"), this.state === "connected"))
        (this.connectErrorsSeen.add("stream_ended"),
          this.onDiagnostic?.("SSE stream ended by server, reconnecting", "warn", "sse_stream_ended"));
      this.handleConnectionError();
    }
  }
  handleSSEFrame(e, n, s, r = Date.now(), h = performance.now()) {
    if (this.mostMembersInAFrame !== void 0 && countJsonMembers(n, this.mostMembersInAFrame) === void 0) {
      let y = this.lighterFrame?.(n);
      if (y !== void 0 && countJsonMembers(y, this.mostMembersInAFrame) !== void 0) {
        this.handleSSEFrame(e, y, s, r, h);
        return;
      }
      this.onFrameRefused?.(QUOTED_EVENT_ID_RE.exec(Bpe(n, EVENT_ID_FIELDS)?.get("event_id") ?? "")?.[1]);
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
      (logForDebugging(`SSETransport: Unexpected SSE event type '${e}' on worker stream`, { level: "warn" }),
        logForDiagnosticsNoPII("warn", "cli_sse_unexpected_event_type", { event_type: e }));
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
      let y = this.sessionId ? ` session=${this.sessionId}` : "",
        O = w.device_attestation_status ? ` attestation=${w.device_attestation_status}` : "";
      if (
        (logForDebugging(
          `SSETransport: Event seq=${w.sequence_num} event_id=${w.event_id} event_type=${w.event_type} payload_type=${String(payload.type)}${O}${y}`,
        ),
        logForDiagnosticsNoPII("info", "cli_sse_message_received"),
        s !== void 0 && this.state === "connected" && this.statementRenewalGate?.(w, s) === !0)
      ) {
        ((this.held = {
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
        }),
          (this.isHeldForRenewal = !0),
          this.renewConnection());
        return;
      }
      if (s !== void 0) this.frameSessionWriters.set(w, s);
      let C = this.eventFilter?.(w);
      if (C) logForDiagnosticsNoPII("warn", "cli_sse_event_filtered", C === !0 ? void 0 : { decision: C });
      else if (
        typeof payload.type === "string" &&
        SESSION_EVENT_TYPES_WITH_EVENT_TYPE.has(payload.type) &&
        w.event_type !== payload.type
      )
        (logForDiagnosticsNoPII("warn", "cli_sse_server_only_event_type_mismatch", {
          event_type: w.event_type,
          payload_type: payload.type,
        }),
          this.onEventVetoed?.(w));
      else if (payload.type === "control_request" && w.source === "worker")
        logForDiagnosticsNoPII("warn", "cli_sse_worker_control_request_dropped");
      else {
        if (
          (this.onDeliveredCallback?.(w, s, h), payload.type === "user" && typeof payload.uuid === "string")
        )
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
      if (((this.held.close = { code: e, detail: n }), this.isHeldForRenewal))
        ((this.isHeldForRenewal = !1), this.startDelivery());
      return;
    }
    this.onCloseCallback?.(e, n);
  }
  renewConnection() {
    if (this.state !== "connected") return;
    (logForDebugging("SSETransport: Renewing the connection"),
      logForDiagnosticsNoPII("info", "cli_sse_renew_connection"),
      this.reopenAtOnce("renewal"));
  }
  reopenAtOnce(e) {
    if (this.refreshHeaders) {
      let refreshHeaders = this.refreshHeaders();
      (Object.assign(this.headers, refreshHeaders), dedupeAuthHeaders(this.headers, refreshHeaders));
    }
    if ((this.clearLivenessTimer(), e === "renewal" && this.abortController !== null))
      (this.endedForRenewal.add(this.abortController), this.abortController.abort(dOMException_2));
    if (((this.abortController = null), this.streamOpener?.restartsBackoffAtEnd()))
      this.reconnectAttempts = 0;
    ((this.state = "reconnecting"),
      (this.quietRedial = e === "long_poll"),
      (this.reconnectTimer = setTimeout(() => {
        ((this.reconnectTimer = null), this.connect());
      }, 0)));
  }
  setStatementRenewalGate(e) {
    this.statementRenewalGate = e;
  }
  deliverHeldForRenewal(e) {
    this.isHeldForRenewal = !1;
    for (let n of this.held?.frames ?? []) n.sessionWriters = e;
    this.startDelivery();
  }
  startDelivery() {
    let held = this.held;
    if (held === null) return;
    this.held = null;
    let n;
    for (let frame of held.frames) {
      if (frame.policyReading !== void 0 && frame.policyReading !== n) {
        if (((n = frame.policyReading), !this.handSinkPolicyReading(n))) return;
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
      this.connectionPolicyReading !== void 0 &&
      this.connectionPolicyReading !== n &&
      !this.handSinkPolicyReading(this.connectionPolicyReading)
    )
      return;
    if (held.close !== null) this.onCloseCallback?.(held.close.code, held.close.detail);
  }
  handSinkPolicyReading(e) {
    return (this.workerAttestationPolicySink?.(e), this.state !== "closing");
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
    let safeParse = eventTypeEnvelopeSchema().safeParse(n);
    if (safeParse.success && safeParse.data.event_type === OWNER_PRESENT && this.onOwnerPresent !== void 0) {
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
    if (
      safeParse.success &&
      safeParse.data.event_type === CHECKPOINT_REQUEST &&
      this.onCheckpointRequest !== void 0
    ) {
      logForDiagnosticsNoPII("info", "cli_sse_checkpoint_request_received");
      try {
        this.onCheckpointRequest();
      } catch (error) {
        (logError(error), logForDiagnosticsNoPII("error", "cli_sse_checkpoint_request_handler_threw"));
      }
      return;
    }
    if (!safeParse.success || safeParse.data.event_type !== HEARTBEAT_PROBE) {
      logForDiagnosticsNoPII("warn", "cli_sse_unexpected_ephemeral_type", {
        event_type: safeParse.success ? safeParse.data.event_type : "unparseable",
      });
      return;
    }
    logForDiagnosticsNoPII("info", "cli_sse_heartbeat_probe_received");
    try {
      this.onHeartbeatProbe?.();
    } catch (error) {
      (logForDebugging(`SSETransport: onHeartbeatProbe handler threw: ${errorMessage(error)}`, {
        level: "error",
      }),
        logForDiagnosticsNoPII("error", "cli_sse_heartbeat_probe_handler_threw"));
    }
  }
  handleConnectionError() {
    if ((this.clearLivenessTimer(), this.state === "closing" || this.state === "closed")) return;
    (this.abortController?.abort(), (this.abortController = null));
    let now = Date.now();
    if (!this.reconnectStartTime) this.reconnectStartTime = now;
    let n = now - this.reconnectStartTime;
    if (this.reconnectTimer) (clearTimeout(this.reconnectTimer), (this.reconnectTimer = null));
    if (this.refreshHeaders) {
      let refreshHeaders = this.refreshHeaders();
      (Object.assign(this.headers, refreshHeaders),
        dedupeAuthHeaders(this.headers, refreshHeaders),
        logForDebugging("SSETransport: Refreshed headers for reconnect"));
    }
    if (((this.state = "reconnecting"), this.streamOpener?.restartsBackoffAtEnd()))
      this.reconnectAttempts = 0;
    this.reconnectAttempts++;
    let s = this.streamOpener?.reconnectsAtOnce()
      ? 0
      : backoffDelayMs({
          attempt: this.reconnectAttempts,
          baseMs: RECONNECT_BASE_DELAY_MS,
          capMs: RECONNECT_MAX_DELAY_MS,
          jitter: { kind: "symmetric", ratio: 0.25 },
        });
    (logForDebugging(
      `SSETransport: Reconnecting in ${Math.round(s)}ms (attempt ${this.reconnectAttempts}, ${Math.round(n / 1000)}s elapsed)`,
    ),
      logForDiagnosticsNoPII("error", "cli_sse_reconnect_attempt", {
        reconnectAttempts: this.reconnectAttempts,
      }),
      (this.reconnectTimer = setTimeout(() => {
        ((this.reconnectTimer = null), this.connect());
      }, s)));
  }
  onLivenessTimeout = () => {
    ((this.livenessTimer = null),
      logForDebugging("SSETransport: Liveness timeout, reconnecting", { level: "error" }),
      logForDiagnosticsNoPII("error", "cli_sse_liveness_timeout", this.keepaliveDiagnosticFields()),
      this.connectErrorsSeen.add("liveness_timeout"),
      this.onDiagnostic?.(
        `SSE liveness timeout \u2014 no frame in ${this.livenessTimeoutMs() / 1000}s, reconnecting`,
        "warn",
        "sse_liveness_timeout",
      ));
    let e = this.state === "connected" && this.bodyBytesThisConnection === 0;
    if ((this.abortController?.abort(dOMException), this.handleConnectionError(), e))
      this.countSilentConnection();
  };
  countSilentConnection() {
    if (
      (this.silentConnectionStreak++,
      this.silentConnectionStreak >= SILENT_CONNECTIONS_BEFORE_LONG_POLL &&
        !this.longPollMode &&
        env.CLAUDE_CODE_CCR_LONG_POLL !== !1 &&
        this.longPollFallbackAllows())
    )
      ((this.longPollMode = !0),
        logForDebugging(
          `SSETransport: No body bytes on ${SILENT_CONNECTIONS_BEFORE_LONG_POLL} connections in a row; asking for long-poll responses from here on`,
          { level: "warn" },
        ),
        logForDiagnosticsNoPII("warn", "cli_sse_long_poll_mode"),
        this.onDiagnostic?.(
          `SSE stream delivered no bytes on ${SILENT_CONNECTIONS_BEFORE_LONG_POLL} consecutive connections; asking the server for long-poll responses (a proxy may be buffering the response body)`,
          "warn",
          "sse_long_poll_mode",
        ));
  }
  longPollFallbackAllows() {
    try {
      return this.longPollFallback?.() === !0;
    } catch (error) {
      return (logForDiagnosticsNoPII("error", "cli_sse_long_poll_fallback_threw"), logError(error), !1);
    }
  }
  resetLivenessTimer() {
    ((this.lastLivenessEvidenceAtMs = Date.now()),
      this.clearLivenessTimer(),
      (this.livenessTimer = setTimeout(this.onLivenessTimeout, this.livenessTimeoutMs())));
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
    return this.advertisedMaxIntervalSeconds === void 0
      ? {}
      : {
          keepalive_tolerance_s: KEEPALIVE_TOLERANCE_MULTIPLIER * this.advertisedMaxIntervalSeconds,
          keepalive_interval_s: this.keepaliveIntervalMs() / 1000,
          liveness_timeout_s: this.livenessTimeoutMs() / 1000,
          keepalive_interval_echoed: this.echoedIntervalSeconds !== void 0,
        };
  }
  clearLivenessTimer() {
    if (this.livenessTimer) (clearTimeout(this.livenessTimer), (this.livenessTimer = null));
  }
  async write(e) {
    let authHeaders = this.getAuthHeaders();
    if (Object.keys(authHeaders).length === 0) {
      (logForDebugging("SSETransport: No session token available for POST"),
        logForDiagnosticsNoPII("warn", "cli_sse_post_no_token"));
      return;
    }
    let s = {
      ...authHeaders,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-client-platform": getClientPlatform(),
      "User-Agent": claudeCodeUserAgent(),
    };
    logForDebugging(`SSETransport: POST body keys=${Object.keys(e).join(",")}`);
    for (let r = 1; r <= POST_MAX_ATTEMPTS; r++) {
      try {
        let post = await Dt.post(this.postUrl, e, { headers: s, validateStatus: Wr });
        if (post.status === 200 || post.status === 201) {
          logForDebugging(`SSETransport: POST success type=${e.type}`);
          return;
        }
        if (
          (logForDebugging(
            `SSETransport: POST ${post.status} body=${jsonStringify(post.data).slice(0, 200)}`,
          ),
          post.status >= 400 && post.status < 500 && post.status !== 429)
        ) {
          (logForDebugging(`SSETransport: POST returned ${post.status} (client error), not retrying`),
            logForDiagnosticsNoPII("warn", "cli_sse_post_client_error", { status: post.status }));
          return;
        }
        (logForDebugging(`SSETransport: POST returned ${post.status}, attempt ${r}/${POST_MAX_ATTEMPTS}`),
          logForDiagnosticsNoPII("warn", "cli_sse_post_retryable_error", {
            status: post.status,
            attempt: r,
          }));
      } catch (error) {
        (logForDebugging(
          `SSETransport: POST error: ${errorMessage(error)}, attempt ${r}/${POST_MAX_ATTEMPTS}`,
        ),
          logForDiagnosticsNoPII("warn", "cli_sse_post_network_error", { attempt: r }));
      }
      if (r === POST_MAX_ATTEMPTS) {
        (logForDebugging(`SSETransport: POST failed after ${POST_MAX_ATTEMPTS} attempts, continuing`),
          logForDiagnosticsNoPII("warn", "cli_sse_post_retries_exhausted"));
        return;
      }
      await sleep(
        backoffDelayMs({ attempt: r, baseMs: POST_RETRY_BASE_DELAY_MS, capMs: POST_RETRY_MAX_DELAY_MS }),
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
    return this.lastFrameReadAtMs === 0 ? void 0 : this.lastFrameReadAtMs;
  }
  getReadStreamRecentLivenessWindowMs() {
    return this.longestExpectedSilenceMs() + RECENT_LIVENESS_WINDOW_GRACE_MS;
  }
  isClosedStatus() {
    return this.state === "closed";
  }
  setOnData(e) {
    this.onData = e;
  }
  setOnUserFrameReceived(e) {
    this.onUserFrameReceived = e;
  }
  setOnClose(e) {
    this.onCloseCallback = e;
  }
  setNonOriginRejectionPolicy(e) {
    this.nonOriginPolicy = e;
  }
  setOnEvent(e) {
    this.onEventCallback = e;
  }
  setOnDelivered(e) {
    this.onDeliveredCallback = e;
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
  setOnDiagnostic(e) {
    this.onDiagnostic = e;
  }
  setEventFilter(e) {
    this.eventFilter = e;
  }
  setWorkerAttestationPolicySink(e) {
    this.workerAttestationPolicySink = e;
  }
  requiresStreamEvidence() {
    return this.requireStreamEvidence;
  }
  setOnFrameRefused(e) {
    this.onFrameRefused = e;
  }
  setOnEventVetoed(e) {
    this.onEventVetoed = e;
  }
  setOnHeartbeatProbe(e) {
    this.onHeartbeatProbe = e;
  }
  setOnOwnerPresent(e) {
    this.onOwnerPresent = e;
  }
  setOnCheckpointRequest(e) {
    this.onCheckpointRequest = e;
  }
  setOnDeviceStatusPublished(e) {
    this.onDeviceStatusPublished = e;
  }
  setOnReconnected(e) {
    this.onReconnected = e;
  }
  close() {
    if (this.reconnectTimer) (clearTimeout(this.reconnectTimer), (this.reconnectTimer = null));
    (this.clearLivenessTimer(),
      (this.state = "closing"),
      (this.nonOriginStreak = null),
      (this.held = null),
      (this.isHeldForRenewal = !1),
      this.abortController?.abort(),
      (this.abortController = null));
  }
  [Symbol.dispose]() {
    this.close();
  }
}
//@ chunk-fp6aqx1j.js:172030-172149 layout
function dedupeAuthHeaders(e, n) {
  if (n.Cookie) delete e.Authorization;
  if (n.Authorization) (delete e.Cookie, delete e["X-Organization-Uuid"]);
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
var WNo = 180000,
  zr = 90000;
//@ chunk-jbbd2121.js:191-209 sole-consumer
var STREAM_DECODE_OPTS = { stream: !0 };
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
    if (s > 0) return { contentEnd: e, afterDelim: i + s };
    e = i;
  }
  return null;
}
/**
 * 解析一段 SSE 帧文本为 {event,data,id}；全是注释时返回 null。
 */
//@ chunk-jbbd2121.js:577-937 fingerprint = parseSSEFrames (0.756)
function parseSSEFrames(buffer) {
  if (!/\S/.test(buffer)) return null;
  let frame = {},
    e = !1;
  for (let line of buffer.split(/\r\n|\r|\n/)) {
    if (line.startsWith(":")) {
      e = !0;
      continue;
    }
    let colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    let field = line.slice(0, colonIdx),
      value = line[colonIdx + 1] === " " ? line.slice(colonIdx + 2) : line.slice(colonIdx + 1);
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
  return frame.data || e ? frame : null;
}
/**
 * SSE 增量解析缓冲：累积文本块，按空行切帧并逐帧派发。
 */
//@ chunk-jbbd2121.js:937-2142 affinity
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
    let decode = this.decoder.decode();
    if (decode) (this.pending.push(decode), (this.pendingLength += decode.length));
    let joinPending = this.joinPending();
    ((this.pending = []), (this.pendingLength = 0));
    let e = parseSSEFrames(joinPending);
    return e ? [e] : [];
  }
  buffered() {
    return this.joinPending();
  }
  drain(n) {
    let t = [],
      pendingLength = this.pendingLength,
      min = Math.min(3, pendingLength),
      i = this.tail(min) + n,
      s = pendingLength - min,
      d = 0,
      o = -1;
    for (;;) {
      let a = findFrameDelimiter(i, d);
      if (!a) break;
      let l = s + a.contentEnd,
        c;
      if (o === -1) {
        let joinPending = this.joinPending();
        c = l <= pendingLength ? joinPending.slice(0, l) : joinPending + n.slice(0, l - pendingLength);
      } else c = n.slice(o - pendingLength, l - pendingLength);
      let g = parseSSEFrames(c);
      if (g) t.push(g);
      (this.dispatched++, (o = s + a.afterDelim), (d = a.afterDelim));
    }
    if (o === -1) (this.pending.push(n), (this.pendingLength = pendingLength + n.length));
    else {
      let sliced = n.slice(o - pendingLength);
      ((this.pending = sliced ? [sliced] : []), (this.pendingLength = sliced.length));
    }
    return t;
  }
  tail(n) {
    if (n <= 0) return "";
    let t = n,
      e = "";
    for (let r = this.pending.length - 1; r >= 0 && t > 0; r--) {
      let i = this.pending[r];
      if (i.length <= t) ((e = i + e), (t -= i.length));
      else ((e = i.slice(i.length - t) + e), (t = 0));
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
  hUr,
  WNo,
  SSETransport,
  zr,
  STREAM_DECODE_OPTS_2,
  dOMException,
  dOMException_2,
  WORKER_CAPABILITIES,
  WORKER_SOCKET_PAD_1,
  X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS,
  X_CCR_ATTESTATION_POLICY,
  SESSION_EVENT_TYPES_WITH_EVENT_TYPE,
  TKs,
};

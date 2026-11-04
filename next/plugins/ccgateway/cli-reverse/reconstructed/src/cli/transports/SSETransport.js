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
import { toError, errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { X_CCR_SESSION_WRITERS, parseSessionWritersHeader } from "./streamEventCoalescing.js";
import { recordPhase } from "../../utils/startupTiming.js";
import { countJsonMembers, sliceTopLevelValues } from "../../utils/jsonScan.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { backoffDelayMs, sleep } from "../../utils/sleep.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wn385gmf.js:25653-25747 fingerprint (2.1.88 match: STREAM_DECODE_OPTS, 0.518)
function STREAM_DECODE_OPTS_2(message) {
  return function (...args) {
    try {
      message.apply(this, args);
    } catch (error) {
      this.stream.destroy(toError(error));
    }
  };
}
//@ chunk-jbbd2121.js:191-209 sole-consumer
var STREAM_DECODE_OPTS = {
  stream: true,
};
//@ chunk-jbbd2121.js:209-346 sole-consumer
function lineBreakLengthAt(text, index) {
  let code = text.charCodeAt(index);
  if (code === 10) return 1;
  if (code === 13) {
    if (index + 1 >= text.length) return -1;
    return text.charCodeAt(index + 1) === 10 ? 2 : 1;
  }
  return 0;
}
//@ chunk-jbbd2121.js:346-577 sole-consumer
function findFrameDelimiter(text, from) {
  let index = from;
  while (index < text.length) {
    let breakLength = lineBreakLengthAt(text, index);
    if (breakLength === 0) {
      index++;
      continue;
    }
    if (breakLength === -1) return null;
    let contentEnd = index + breakLength;
    if (contentEnd >= text.length) return null;
    let secondBreak = lineBreakLengthAt(text, contentEnd);
    if (secondBreak === -1) return null;
    if (secondBreak > 0)
      return {
        contentEnd: index,
        afterDelim: contentEnd + secondBreak,
      };
    index = contentEnd;
  }
  return null;
}
//@ chunk-jbbd2121.js:577-937 fingerprint (2.1.88 match: parseSSEFrames, 0.756)
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
  push(chunk) {
    let text = typeof chunk === "string" ? chunk : this.decoder.decode(chunk, STREAM_DECODE_OPTS);
    if (!text) return [];
    return this.drain(text);
  }
  flush() {
    let rest = this.decoder.decode();
    if (rest) {
      this.pending.push(rest);
      this.pendingLength += rest.length;
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
  drain(upTo) {
    let frames = [];
    let pendingLength = this.pendingLength;
    let min = Math.min(3, pendingLength);
    let end = this.tail(min) + upTo;
    let searchEnd = pendingLength - min;
    let cursor = 0;
    let lastDelimiter = -1;
    for (;;) {
      let frameDelimiter = findFrameDelimiter(end, cursor);
      if (!frameDelimiter) break;
      let frameEnd = searchEnd + frameDelimiter.contentEnd;
      let buffer;
      if (lastDelimiter === -1) {
        let text = this.joinPending();
        buffer =
          frameEnd <= pendingLength
            ? text.slice(0, frameEnd)
            : text + upTo.slice(0, frameEnd - pendingLength);
      } else buffer = upTo.slice(lastDelimiter - pendingLength, frameEnd - pendingLength);
      let sseFrames = parseSSEFrames(buffer);
      if (sseFrames) frames.push(sseFrames);
      this.dispatched++;
      lastDelimiter = searchEnd + frameDelimiter.afterDelim;
      cursor = frameDelimiter.afterDelim;
    }
    if (lastDelimiter === -1) {
      this.pending.push(upTo);
      this.pendingLength = pendingLength + upTo.length;
    } else {
      let sliced = upTo.slice(lastDelimiter - pendingLength);
      this.pending = sliced ? [sliced] : [];
      this.pendingLength = sliced.length;
    }
    return frames;
  }
  tail(length) {
    if (length <= 0) return "";
    let want = length;
    let out = "";
    for (let j = this.pending.length - 1; j >= 0 && want > 0; j--) {
      let chunk = this.pending[j];
      if (chunk.length <= want) {
        out = chunk + out;
        want -= chunk.length;
      } else {
        out = chunk.slice(chunk.length - want) + out;
        want = 0;
      }
    }
    return out;
  }
  joinPending() {
    return this.pending.length === 1 ? this.pending[0] : this.pending.join("");
  }
}
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
  constructor(decoder, clock = REAL_SSE_CLOCK, sink = logSseFrameStall) {
    this.decoder = decoder;
    this.clock = clock;
    this.sink = sink;
    this.dispatchedSeen = decoder.framesDispatched;
  }
  observe(frame, event) {
    let nextEvent = this.decoder.framesDispatched - this.dispatchedSeen;
    this.dispatchedSeen = this.decoder.framesDispatched;
    if (this.watch === null && this.decoder.pendingChars === 0 && !event.some(isClientEventFrame)) return;
    if (this.disabled) return;
    try {
      this.onRead(frame, nextEvent, event);
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
  onRead(lines, frame, frame2) {
    let dispatchFrame = this.clock.nowMs();
    let lastCpuMicros = this.clock.cpuMicros();
    let queuedFrame =
      frame > 0 && this.decoder.pendingChars > 0
        ? Math.min(Buffer.byteLength(this.decoder.buffered()), lines)
        : 0;
    let watch = this.watch;
    let stall = null;
    if (watch !== null) {
      if (watch.reads === 0 && frame === 0 && !this.frameHasBegun()) return;
      let stallInfo = {
        gapMs: dispatchFrame - watch.lastReadAtMs,
        loopLagMs: this.loopLagAt(dispatchFrame),
        cpuMs: (lastCpuMicros - watch.lastCpuMicros) / 1000,
      };
      this.stop();
      if (watch.reads === 0) {
        if (stallInfo.loopLagMs !== null && stallInfo.gapMs - stallInfo.loopLagMs <= SSE_FRAME_STALL_MIN_MS)
          stall = {
            gapMs: stallInfo.gapMs,
            loopLagMs: stallInfo.loopLagMs,
            cpuMs: stallInfo.cpuMs,
          };
      } else {
        if (stallInfo.gapMs > watch.maxGap.gapMs) {
          watch.maxGap = stallInfo;
          watch.maxGapOffsetBytes = watch.bytes;
        }
        watch.reads++;
        watch.bytes += lines;
        watch.lastReadAtMs = dispatchFrame;
        watch.lastCpuMicros = lastCpuMicros;
        if (frame === 0) {
          this.watch = watch;
          this.armTick(dispatchFrame);
          return;
        }
        watch.bytes -= queuedFrame;
        this.report(watch, dispatchFrame);
      }
    }
    if (this.frameHasBegun()) {
      this.watch = createReadWatch(dispatchFrame, lastCpuMicros, {
        reads: 1,
        bytes: frame === 0 ? lines : queuedFrame,
        before: frame === 0 ? stall : null,
      });
      this.armTick(dispatchFrame);
      return;
    }
    if (stall !== null && frame === 1)
      this.report(
        createReadWatch(dispatchFrame, lastCpuMicros, {
          reads: 1,
          bytes: lines,
          before: stall,
        }),
        dispatchFrame,
      );
    if (frame2.some(isClientEventFrame)) {
      this.watch = createReadWatch(dispatchFrame, lastCpuMicros, {
        reads: 0,
        bytes: 0,
        before: null,
      });
      this.armTick(dispatchFrame);
    }
  }
  frameHasBegun() {
    let pendingChars = this.decoder.pendingChars;
    return (
      pendingChars > SSE_MAX_BUFFERED_CHARS || (pendingChars > 0 && /[^\r\n]/.test(this.decoder.buffered()))
    );
  }
  report(lag, lagMs) {
    let { before, maxGap } = lag;
    let stall =
      before !== null && before.loopLagMs >= SSE_FRAME_STALL_MS && lag.bytes >= SSE_MAX_PENDING_CHARS;
    if (maxGap.gapMs < SSE_FRAME_STALL_MS && !stall) return;
    if (lagMs - this.lastLineAtMs < SSE_LINE_THROTTLE_MS) return;
    this.lastLineAtMs = lagMs;
    this.sink({
      frame_kib: clampTelemetryNumber(lag.bytes / 1024, SSE_TELEMETRY_KIB_CAP),
      read_count: clampTelemetryNumber(lag.reads, SSE_TELEMETRY_COUNT_CAP),
      receive_ms: clampTelemetryNumber(lagMs - lag.startedAtMs, SSE_TELEMETRY_MS_CAP),
      ...(before !== null && {
        before_frame_gap_ms: clampTelemetryNumber(before.gapMs, SSE_TELEMETRY_MS_CAP),
        before_frame_loop_lag_ms: clampTelemetryNumber(before.loopLagMs, SSE_TELEMETRY_MS_CAP),
        before_frame_cpu_ms: clampTelemetryNumber(before.cpuMs, SSE_TELEMETRY_MS_CAP),
      }),
      max_gap_ms: clampTelemetryNumber(maxGap.gapMs, SSE_TELEMETRY_MS_CAP),
      max_gap_offset_kib: clampTelemetryNumber(lag.maxGapOffsetBytes / 1024, SSE_TELEMETRY_KIB_CAP),
      ...(maxGap.loopLagMs !== null && {
        max_gap_loop_lag_ms: clampTelemetryNumber(maxGap.loopLagMs, SSE_TELEMETRY_MS_CAP),
      }),
      max_gap_cpu_ms: clampTelemetryNumber(maxGap.cpuMs, SSE_TELEMETRY_MS_CAP),
    });
  }
  loopLagAt(body) {
    if (this.nextTickDueMs !== 1 / 0) return Math.max(this.lastTickLagMs, body - this.nextTickDueMs, 0);
    return body - this.lastTickAtMs <= SSE_TICK_INTERVAL_MS ? this.lastTickLagMs : null;
  }
  armTick(body) {
    this.lastTickLagMs = 0;
    this.lastTickAtMs = body;
    this.nextTickDueMs = body + SSE_TICK_INTERVAL_MS;
    this.cancelTick = this.clock.setTimer(this.onTick, SSE_TICK_INTERVAL_MS);
  }
  onTick = () => {
    try {
      this.cancelTick = null;
      let watch = this.watch;
      if (watch === null) return;
      let line = this.clock.nowMs();
      this.lastTickLagMs = Math.max(line - this.nextTickDueMs, 0);
      this.lastTickAtMs = line;
      let frame = watch.reads === 0 ? SSE_FRAME_STALL_MIN_MS : SSE_STALL_CHECK_MS;
      if (line - watch.lastReadAtMs >= frame) {
        this.nextTickDueMs = 1 / 0;
        return;
      }
      this.nextTickDueMs = line + SSE_TICK_INTERVAL_MS;
      this.cancelTick = this.clock.setTimer(this.onTick, SSE_TICK_INTERVAL_MS);
    } catch (error) {
      this.disable(error);
    }
  };
  disable(frame) {
    this.disabled = true;
    this.stop();
    logError(frame);
  }
}
//@ chunk-fp6aqx1j.js:145297-145476 placement
function createReadWatch(startedAt, lastCpuMicros, { reads, bytes, before }) {
  return {
    reads,
    bytes,
    startedAtMs: startedAt,
    lastReadAtMs: startedAt,
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
function isClientEventFrame(frame) {
  return frame.event === "client_event";
}
//@ chunk-fp6aqx1j.js:145523-145606 placement
function clampTelemetryNumber(value, max) {
  return Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), max) : 0;
}
//@ chunk-fp6aqx1j.js:145606-145655 placement
function logSseFrameStall(fields) {
  logForDiagnosticsNoPII("warn", "cli_sse_frame_stall", fields);
}
//@ chunk-fp6aqx1j.js:145655-145717 placement
function processCpuMicros() {
  let usage = process.cpuUsage();
  return usage.user + usage.system;
}
//@ chunk-fp6aqx1j.js:145717-145793 placement
function setUnrefTimer(fn, delayMs) {
  let timer = setTimeout(fn, delayMs);
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
var CONTENT_TYPE_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fp6aqx1j.js:145855", () => {
  CONTENT_TYPE_KINDS = new Map([
    ["", "none"],
    ["text/event-stream", "event-stream"],
    ["text/html", "html"],
    ["application/xhtml+xml", "html"],
    ["application/json", "json"],
    ["text/plain", "text"],
    ["application/xml", "xml"],
    ["text/xml", "xml"],
  ]);
});
//@ chunk-fp6aqx1j.js:146071-146190 placement
/**
 * 把 Content-Type 头（去参数、取第一项、小写）归类为 none/event-stream/html/json/text/xml/other，用于 SSE 连接失败诊断。
 */
function classifyContentType(header) {
  let lower = firstLineOf(firstLineOf(header ?? "", ";"), ",")
    .trim()
    .toLowerCase();
  return CONTENT_TYPE_KINDS.get(lower) ?? (lower.endsWith("+json") ? "json" : "other");
}
//@ chunk-fp6aqx1j.js:146190-146651 placement
/**
 * worker 能力与 attestation 版本常量，以及签名等级与状态由弱到强的排序表（用于比较 meetsLevel）。
 */
var WORKER_CAPABILITIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ATTESTATION_FLOOR_1;
var ATTESTATION_FLOOR_VERSION;
var WORKER_SOCKET_2;
var WORKER_SOCKET_PAD_1;
var X_CCR_ATTESTATION_POLICY;
var ATTESTATION_LEVEL_RANK;
var ATTESTATION_STATUS_RANK;
deferInit("chunk-fp6aqx1j.js:146190", () => {
  WORKER_CAPABILITIES = "worker_capabilities";
  ATTESTATION_FLOOR_1 = "attestation-floor/1";
  ATTESTATION_FLOOR_VERSION = "2";
  WORKER_SOCKET_2 = "worker-socket/2";
  WORKER_SOCKET_PAD_1 = "worker-socket-pad/1";
  X_CCR_ATTESTATION_POLICY = "x-ccr-attestation-policy";
  ATTESTATION_LEVEL_RANK = new Map([
    ["verified", "VERIFIED"],
    ["verified_keyless_device", "VERIFIED_KEYLESS_DEVICE"],
    ["verified_by_gate", "VERIFIED_BY_GATE"],
  ]);
  ATTESTATION_STATUS_RANK = new Map([
    ["server_authored", "SERVER_AUTHORED"],
    ["server_replayed", "SERVER_REPLAYED"],
    ["absent", "ABSENT"],
    ["invalid", "INVALID"],
    ["unchecked", "UNCHECKED"],
    ["unspecified", "UNSPECIFIED"],
  ]);
});
//@ chunk-fp6aqx1j.js:146651-147368 placement
function parseAttestationPolicy(header) {
  if (header === null)
    return {
      policy: undefined,
      fault: undefined,
    };
  let params = new Map();
  for (let part of firstLineOf(header, ", ").split(";")) {
    let trimmed = part.trim();
    let index = trimmed.indexOf("=");
    let key = index === -1 ? "" : trimmed.slice(0, index);
    if (key !== "" && !params.has(key)) params.set(key, trimmed.slice(index + 1));
  }
  let mode = params.get("mode");
  if (params.get("v") !== "1")
    return {
      policy: undefined,
      fault: "policy_unparseable",
    };
  if (mode === "off")
    return {
      policy: undefined,
      fault: undefined,
    };
  if (mode !== "observe" && mode !== "enforce")
    return {
      policy: undefined,
      fault: "policy_unparseable",
    };
  let level = ATTESTATION_LEVEL_RANK.get(params.get("level") ?? "");
  let statuses = new Set();
  let unknown = false;
  for (let status of (params.get("accept") ?? "").split(",")) {
    let rank = ATTESTATION_STATUS_RANK.get(status);
    if (rank !== undefined) statuses.add(rank);
    else if (status !== "") unknown = true;
  }
  return {
    policy: {
      enforce: mode === "enforce",
      acceptLevel: level ?? "VERIFIED_BY_GATE",
      acceptStatuses: statuses,
    },
    fault: level === undefined || unknown ? "policy_partial" : undefined,
  };
}
//@ chunk-fp6aqx1j.js:147368-147811 placement
/**
 * SSETransport 的时间与重试常量：重连退避 1s–30s、保活间隔默认 15s（上限 60s）、活性超时宽限、长轮询 25s、POST 最多 10 次（0.5–8s 退避）、永久失败状态码 401/403/404。
 */
var RECONNECT_BASE_DELAY_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RECONNECT_MAX_DELAY_MS;
var CLOCK_SKEW_TOLERANCE_MS;
var DEFAULT_KEEPALIVE_INTERVAL_SECONDS;
var MAX_KEEPALIVE_INTERVAL_SECONDS;
var LIVENESS_TIMEOUT_GRACE_MS;
var dOMException;
var dOMException_2;
var RECENT_LIVENESS_WINDOW_GRACE_MS;
var KEEPALIVE_TOLERANCE_MULTIPLIER;
var KEEPALIVE_TOLERANCE_SECONDS;
var X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS;
var LONG_POLL_TIMEOUT_SECONDS_VALUE;
var LONG_POLL_TIMEOUT_SECONDS;
var X_CCR_SSE_LONG_POLL_SECONDS;
var MAX_LONG_POLL_SECONDS;
var SILENT_CONNECTIONS_BEFORE_LONG_POLL;
var SILENT_CONNECTION_MIN_MS;
var PERMANENT_HTTP_STATUSES;
var EVENT_STREAM_CONTENT_TYPE_RE;
var POST_MAX_ATTEMPTS;
var POST_RETRY_BASE_DELAY_MS;
var POST_RETRY_MAX_DELAY_MS;
deferInit("chunk-fp6aqx1j.js:147368", () => {
  RECONNECT_BASE_DELAY_MS = 1000;
  RECONNECT_MAX_DELAY_MS = 30000;
  CLOCK_SKEW_TOLERANCE_MS = 60000;
  DEFAULT_KEEPALIVE_INTERVAL_SECONDS = 15;
  MAX_KEEPALIVE_INTERVAL_SECONDS = 60;
  LIVENESS_TIMEOUT_GRACE_MS = 30000;
  dOMException = new DOMException("no frame within the liveness timeout", "AbortError");
  dOMException_2 = new DOMException("the connection is renewed", "AbortError");
  RECENT_LIVENESS_WINDOW_GRACE_MS = 15000;
  KEEPALIVE_TOLERANCE_MULTIPLIER = 3;
  KEEPALIVE_TOLERANCE_SECONDS = "keepalive_tolerance_seconds";
  X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS = "x-ccr-sse-keepalive-interval-seconds";
  LONG_POLL_TIMEOUT_SECONDS_VALUE = 25;
  LONG_POLL_TIMEOUT_SECONDS = "long_poll_timeout_seconds";
  X_CCR_SSE_LONG_POLL_SECONDS = "x-ccr-sse-long-poll-seconds";
  MAX_LONG_POLL_SECONDS = 60;
  SILENT_CONNECTIONS_BEFORE_LONG_POLL = 2;
  SILENT_CONNECTION_MIN_MS = 2000;
  PERMANENT_HTTP_STATUSES = new Set([401, 403, 404]);
  EVENT_STREAM_CONTENT_TYPE_RE = /\btext\/event-stream\b/i;
  POST_MAX_ATTEMPTS = 10;
  POST_RETRY_BASE_DELAY_MS = 500;
  POST_RETRY_MAX_DELAY_MS = 8000;
});
//@ chunk-fp6aqx1j.js:147811-147834 placement
function acceptAnyHttpStatus() {
  return true;
}
//@ chunk-fp6aqx1j.js:147834-148053 placement
var SESSION_EVENT_TYPES_WITH_EVENT_TYPE; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var eventTypeEnvelopeSchema;
var HEARTBEAT_PROBE;
var OWNER_PRESENT;
var CHECKPOINT_REQUEST;
var EVENT_ID_FIELDS;
var QUOTED_EVENT_ID_RE;
deferInit("chunk-fp6aqx1j.js:147834", () => {
  SESSION_EVENT_TYPES_WITH_EVENT_TYPE = new Set(["workflow_launch", "queued_notification", "session_notice"]);
  eventTypeEnvelopeSchema = DoctorLazy(() =>
    objectSchema({
      event_type: stringSchema(),
    }),
  );
  HEARTBEAT_PROBE = "heartbeat_probe";
  OWNER_PRESENT = "owner_present";
  CHECKPOINT_REQUEST = "checkpoint_request";
  EVENT_ID_FIELDS = new Set(["event_id"]);
  QUOTED_EVENT_ID_RE = /^"([\w-]{1,128})"$/;
});
//@ chunk-fp6aqx1j.js:148053-172030 fingerprint (2.1.88 match: SSETransport, 0.512)
/**
 * SSETransport：从 CCR 会话流读取 SSE 帧（自动重连、Last-Event-ID），写入走 POST 到同一路径（去掉 /stream）。
 */
let SSETransport; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fp6aqx1j.js:148053", () => {
  SSETransport = class SSETransport {
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
      if (initialSequenceNum !== undefined && initialSequenceNum > 0)
        this.lastSequenceNum = initialSequenceNum;
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
      let elapsed = performance.now() - serviceClockAtConnect.monotonicMs;
      return Math.abs(Date.now() - serviceClockAtConnect.wallMs - elapsed) > CLOCK_SKEW_TOLERANCE_MS
        ? undefined
        : serviceClockAtConnect.serviceMs + elapsed;
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
    async openStream(onOpened) {
      let now = Date.now();
      this.requestStartedAtMs = performance.now();
      let quietRedial = this.quietRedial;
      this.quietRedial = false;
      let intervalSec = clampReconnectDelay(Math.floor(Number(this.sseKeepaliveMaxIntervalSeconds?.())));
      this.advertisedMaxIntervalSeconds =
        intervalSec > DEFAULT_KEEPALIVE_INTERVAL_SECONDS ? intervalSec : undefined;
      this.echoedIntervalSeconds = undefined;
      this.bodyBytesThisConnection = 0;
      this.longPollEchoedSeconds = undefined;
      this.sequenceNumAtOpen = this.lastSequenceNum;
      let CLAUDE_CODE_CCR_LONG_POLL = env.CLAUDE_CODE_CCR_LONG_POLL;
      this.askedLongPollThisConnection =
        CLAUDE_CODE_CCR_LONG_POLL === true ||
        (CLAUDE_CODE_CCR_LONG_POLL !== false && this.longPollMode && this.longPollFallbackAllows());
      let url = new URL(this.url.href);
      if (this.lastSequenceNum > 0) url.searchParams.set("from_sequence_num", String(this.lastSequenceNum));
      if (this.advertisedMaxIntervalSeconds !== undefined)
        url.searchParams.set(
          KEEPALIVE_TOLERANCE_SECONDS,
          String(KEEPALIVE_TOLERANCE_MULTIPLIER * this.advertisedMaxIntervalSeconds),
        );
      if (this.askedLongPollThisConnection)
        url.searchParams.set(LONG_POLL_TIMEOUT_SECONDS, String(LONG_POLL_TIMEOUT_SECONDS_VALUE));
      let capabilities = [
        ...(this.workerAttestationPolicySink === undefined ? [] : [ATTESTATION_FLOOR_1]),
        ...(this.streamOpener === undefined ? [] : [WORKER_SOCKET_2]),
      ];
      if (capabilities.length > 0) url.searchParams.set(WORKER_CAPABILITIES, capabilities.join(","));
      let authHeaders = this.getAuthHeaders();
      let headers = {
        ...this.headers,
        ...authHeaders,
        Accept: "text/event-stream",
        "anthropic-version": "2023-06-01",
        "anthropic-client-platform": getClientPlatform(),
        "User-Agent": claudeCodeUserAgent(),
      };
      dedupeAuthHeaders(headers, authHeaders);
      if (this.lastSequenceNum > 0) headers["Last-Event-ID"] = String(this.lastSequenceNum);
      logForDebugging(`SSETransport: Opening ${url.href}`);
      logForDiagnosticsNoPII("info", "cli_sse_connect_opening");
      let abortController = new AbortController();
      this.abortController = abortController;
      let timedOut = false;
      let min = Math.min(
        typeof this.connectTimeoutMs === "function" ? this.connectTimeoutMs() : this.connectTimeoutMs,
        MAX_TIMER_DELAY_MS,
      );
      let timer =
        min > 0
          ? setTimeout(() => {
              timedOut = true;
              abortController.abort();
            }, min)
          : undefined;
      try {
        let open = () =>
          fetch(url.href, {
            headers,
            signal: abortController.signal,
            ...getProxyFetchOptions({
              url: url.href,
            }),
          });
        let response;
        try {
          response = await (this.streamOpener
            ? this.streamOpener.open({
                url: url.href,
                headers,
                signal: abortController.signal,
                openSse: open,
              })
            : open());
        } catch (error) {
          if (abortController.signal.aborted && !timedOut) return;
          throw error;
        } finally {
          clearTimeout(timer);
          onOpened?.();
        }
        if (timedOut) throw Error("the connect deadline fired as the response arrived");
        if (!response.ok) {
          let source =
            response.status === 403
              ? readRequestIdSource((header) => response.headers.get(header))
              : undefined;
          await drainResponseBody(response, {
            timeoutMs: DEFAULT_DRAIN_TIMEOUT_MS,
          });
          if (abortController.signal.aborted) return;
          let nowMs = (this.nonOriginPolicy?.now ?? Date.now)();
          let streak = this.advanceNonOriginStreak(source, nowMs);
          let retrying =
            streak !== null &&
            this.nonOriginPolicy !== undefined &&
            nowMs - streak.startedAtMs < this.nonOriginPolicy.windowMs;
          let permanent = PERMANENT_HTTP_STATUSES.has(response.status) && !retrying;
          logForDebugging(
            `SSETransport: HTTP ${response.status}${permanent ? " (permanent)" : ""}${source ? ` source=${source}` : ""}${retrying ? ` (not origin \u2014 retrying; attempt ${streak?.attempts})` : ""}`,
            {
              level: "error",
            },
          );
          logForDiagnosticsNoPII("error", "cli_sse_connect_http_error", {
            status: response.status,
            ...(source !== undefined && {
              source,
            }),
            ...(streak !== null && {
              retried: retrying,
            }),
          });
          this.connectErrorsSeen.add(`http_${response.status}`);
          this.diagConnectFailure(`HTTP ${response.status}${permanent ? " (permanent)" : ""}`, now);
          if (permanent) {
            this.nonOriginStreak = null;
            this.state = "closed";
            this.emitClose(
              response.status,
              source === undefined
                ? undefined
                : streak === null
                  ? {
                      rejectSource: source,
                    }
                  : {
                      rejectSource: streak.source,
                      streak: {
                        source: streak.source,
                        attempts: streak.attempts,
                        streakMs: nowMs - streak.startedAtMs,
                      },
                    },
            );
            return;
          }
          if (retrying)
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
        if (!response.body) {
          logForDebugging("SSETransport: No response body");
          this.connectErrorsSeen.add("no_response_body");
          this.diagConnectFailure("no response body", now);
          this.handleConnectionError();
          return;
        }
        if (this.requireStreamEvidence) {
          let contentType = classifyContentType(response.headers.get("content-type"));
          if (contentType !== "event-stream") {
            let hasEvidence =
              response.headers.has(X_CCR_SESSION_WRITERS) || response.headers.has(X_CCR_ATTESTATION_POLICY);
            if (!hasEvidence) {
              await drainResponseBody(response, {
                timeoutMs: DEFAULT_DRAIN_TIMEOUT_MS,
              });
              if (abortController.signal.aborted) return;
            }
            let detail = `HTTP ${response.status}, content_type=${contentType}, ${hasEvidence ? "with" : "without"} a session service header`;
            logForDebugging(
              `SSETransport: ${detail}: ${hasEvidence ? "taken as the stream" : "a failed connect"}`,
              {
                level: hasEvidence ? "warn" : "error",
              },
            );
            logForDiagnosticsNoPII(
              hasEvidence ? "warn" : "error",
              "cli_sse_connect_unexpected_content_type",
              {
                status: response.status,
                content_type: contentType,
                accepted: hasEvidence,
              },
            );
            this.onUnexpectedContentType?.({
              status: response.status,
              contentType,
              accepted: hasEvidence,
            });
            if (!hasEvidence) {
              this.connectErrorsSeen.add("no_stream_evidence");
              this.diagConnectFailure(
                `${detail}: a proxy or gateway may have answered in place of the server`,
                now,
              );
              this.handleConnectionError();
              return;
            }
          }
        }
        let connectMs = Date.now() - now;
        let timestamp = Date.parse(response.headers.get("date") ?? "");
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
          let echoed = Number(response.headers.get(X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS));
          if (Number.isInteger(echoed) && echoed > 0)
            this.echoedIntervalSeconds = clampReconnectDelay(echoed);
        }
        let longPoll = Number(response.headers.get(X_CCR_SSE_LONG_POLL_SECONDS));
        this.longPollEchoedSeconds =
          this.askedLongPollThisConnection && Number.isInteger(longPoll) && longPoll > 0
            ? Math.min(longPoll, MAX_LONG_POLL_SECONDS)
            : undefined;
        let policyReading =
          this.workerAttestationPolicySink === undefined
            ? undefined
            : parseAttestationPolicy(response.headers.get(X_CCR_ATTESTATION_POLICY));
        this.connectionPolicyReading = policyReading;
        let writersHeader = response.headers.get(X_CCR_SESSION_WRITERS);
        let sessionWritersHeader = parseSessionWritersHeader(writersHeader);
        let sessionWriters =
          sessionWritersHeader === undefined
            ? undefined
            : {
                writers: sessionWritersHeader,
                statedAtMs: Date.now(),
              };
        this.connectionSessionWriters = sessionWriters;
        if (policyReading !== undefined) {
          this.workerAttestationPolicySink?.(policyReading);
          if (abortController.signal.aborted) return;
        }
        let keepaliveText =
          this.advertisedMaxIntervalSeconds === undefined
            ? ""
            : ` keepalive_interval=${this.keepaliveIntervalMs() / 1000}s${this.echoedIntervalSeconds === undefined ? " (no echo)" : ""}`;
        let longPollText = !this.askedLongPollThisConnection
          ? ""
          : this.longPollEchoedSeconds === undefined
            ? ` long_poll=${LONG_POLL_TIMEOUT_SECONDS_VALUE}s (no echo)`
            : ` long_poll=${this.longPollEchoedSeconds}s`;
        logForDebugging("SSETransport: Connected" + keepaliveText + longPollText);
        logForDiagnosticsNoPII("info", "cli_sse_connect_connected", {
          duration_ms: connectMs,
          ...this.keepaliveDiagnosticFields(),
          ...(this.askedLongPollThisConnection && {
            long_poll: this.longPollEchoedSeconds === undefined ? "no_echo" : "echoed",
          }),
          session_writers:
            sessionWritersHeader ?? (writersHeader === null ? "header_absent" : "header_unreadable"),
          ...(policyReading !== undefined && {
            attestation_policy:
              policyReading.policy === undefined
                ? "none"
                : policyReading.policy.enforce
                  ? "enforce"
                  : "observe",
            ...(policyReading.fault !== undefined && {
              attestation_policy_fault: policyReading.fault,
            }),
          }),
        });
        if (this.reconnectAttempts === 0 && !quietRedial)
          recordPhase("sse_connect_ms", connectMs, now - performance.timeOrigin);
        if (this.reconnectAttempts > 0) {
          let downtimeSeconds = this.reconnectStartTime
            ? Math.round((Date.now() - this.reconnectStartTime) / 1000)
            : 0;
          this.onDiagnostic?.(
            `SSE reconnected after ${this.reconnectAttempts} attempt(s), ${downtimeSeconds}s downtime` +
              (this.connectErrorsSeen.size > 0 ? `, errors=[${[...this.connectErrorsSeen].join(",")}]` : ""),
            "warn",
            "sse_recovered",
          );
        } else if (!quietRedial)
          this.onDiagnostic?.(`SSE connected in ${connectMs}ms`, "info", "sse_connected");
        this.connectErrorsSeen.clear();
        let hasEverConnected = this.hasEverConnected;
        this.hasEverConnected = true;
        this.state = "connected";
        if (this.streamOpener?.restartsBackoffAtOpen() ?? true) this.reconnectAttempts = 0;
        this.reconnectStartTime = null;
        this.resetLivenessTimer();
        let matches = EVENT_STREAM_CONTENT_TYPE_RE.test(response.headers.get("content-type") ?? "");
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
          this.deliverHeldForRenewal(sessionWriters);
          if (abortController.signal.aborted) return;
        }
        await this.readStream(response.body, matches, sessionWriters);
      } catch (error) {
        if (timedOut) {
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
    advanceNonOriginStreak(source, now) {
      let nonOriginPolicy = this.nonOriginPolicy;
      if (nonOriginPolicy === undefined || source === undefined) return null;
      if (!isNonOriginSource(source)) {
        this.nonOriginStreak = null;
        return null;
      }
      let nonOriginStreak = this.nonOriginStreak;
      if (nonOriginStreak === null || now - nonOriginStreak.lastAtMs > nonOriginPolicy.maxGapMs) {
        nonOriginStreak = {
          source,
          startedAtMs: now,
          lastAtMs: now,
          attempts: 0,
        };
        this.nonOriginStreak = nonOriginStreak;
      }
      nonOriginStreak.attempts++;
      nonOriginStreak.lastAtMs = now;
      return nonOriginStreak;
    }
    settleNonOriginStreakRecovered() {
      let nonOriginStreak = this.nonOriginStreak;
      if (nonOriginStreak === null) return;
      this.nonOriginStreak = null;
      let streak = {
        source: nonOriginStreak.source,
        attempts: nonOriginStreak.attempts,
        streakMs: (this.nonOriginPolicy?.now ?? Date.now)() - nonOriginStreak.startedAtMs,
      };
      logForDiagnosticsNoPII("info", "cli_sse_nonorigin_403_recovered", {
        source: streak.source,
        attempts: streak.attempts,
        streak_ms: streak.streakMs,
      });
      try {
        this.nonOriginPolicy?.onRecovered?.(streak);
      } catch (error) {
        logForDebugging(`SSETransport: onRecovered handler threw: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    }
    diagConnectFailure(detail, startedAt) {
      if (!this.onDiagnostic) return;
      let attempt = this.reconnectAttempts + 1;
      if (attempt > 3 && attempt % 10 !== 0) return;
      let tookMs = Date.now() - startedAt;
      let downtimeText = this.reconnectStartTime
        ? `, ${Math.round((Date.now() - this.reconnectStartTime) / 1000)}s reconnecting`
        : "";
      let errorsText =
        this.connectErrorsSeen.size > 1 ? `, errors=[${[...this.connectErrorsSeen].join(",")}]` : "";
      this.onDiagnostic(
        `SSE connect failed (${detail}) attempt=${attempt} took=${tookMs}ms${downtimeText}${errorsText}`,
        "warn",
        "sse_connect_failed",
      );
    }
    async readStream(body, hasContentType, sessionWriters) {
      let reader = body.getReader();
      let buffer = new SSEFrameBuffer();
      let abortController = this.abortController;
      let endedForRenewal = () => abortController !== null && this.endedForRenewal.has(abortController);
      let frameReader =
        hasContentType && env.CLAUDE_CODE_DIAGNOSTICS_FILE ? new SSEFrameReader(buffer) : null;
      let readFailed = false;
      try {
        while (true) {
          let { done, value } = await reader.read();
          if (done) break;
          if (value.byteLength > 0) {
            this.bodyBytesThisConnection += value.byteLength;
            this.silentConnectionStreak = 0;
          }
          let frames = buffer.push(value);
          frameReader?.observe(value.byteLength, frames);
          for (let frame of frames) {
            if (!endedForRenewal()) {
              this.resetLivenessTimer();
              this.lastFrameReadAtMs = this.lastLivenessEvidenceAtMs;
            }
            if (this.nonOriginStreak !== null && hasContentType) this.settleNonOriginStreakRecovered();
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
            if (frame.event && frame.data) this.handleSSEFrame(frame.event, frame.data, sessionWriters);
            else if (frame.data) {
              logForDebugging("SSETransport: Frame has data: but no event: field \u2014 dropped", {
                level: "warn",
              });
              logForDiagnosticsNoPII("warn", "cli_sse_frame_missing_event_field");
            }
          }
        }
      } catch (error) {
        if (this.abortController?.signal.aborted || endedForRenewal()) return;
        readFailed = true;
        logForDebugging(`SSETransport: Stream read error: ${errorMessage(error)}`, {
          level: "error",
        });
        logForDiagnosticsNoPII("error", "cli_sse_stream_read_error");
      } finally {
        frameReader?.stop();
        reader.releaseLock();
      }
      if (this.state !== "closing" && this.state !== "closed" && !endedForRenewal()) {
        if (this.state === "connected") {
          let connectionMs = performance.now() - this.requestStartedAtMs;
          if (this.bodyBytesThisConnection === 0 && connectionMs >= SILENT_CONNECTION_MIN_MS)
            this.countSilentConnection();
          if (
            this.askedLongPollThisConnection &&
            !readFailed &&
            (this.lastSequenceNum > this.sequenceNumAtOpen || connectionMs >= SILENT_CONNECTION_MIN_MS)
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
    handleSSEFrame(
      eventType,
      data,
      sessionWriters,
      receivedWallMs = Date.now(),
      receivedAtMs = performance.now(),
    ) {
      if (
        this.mostMembersInAFrame !== undefined &&
        countJsonMembers(data, this.mostMembersInAFrame) === undefined
      ) {
        let lighter = this.lighterFrame?.(data);
        if (lighter !== undefined && countJsonMembers(lighter, this.mostMembersInAFrame) !== undefined) {
          this.handleSSEFrame(eventType, lighter, sessionWriters, receivedWallMs, receivedAtMs);
          return;
        }
        this.onFrameRefused?.(
          QUOTED_EVENT_ID_RE.exec(sliceTopLevelValues(data, EVENT_ID_FIELDS)?.get("event_id") ?? "")?.[1],
        );
        return;
      }
      if (eventType === "ephemeral_event") {
        this.handleEphemeralFrame(data);
        return;
      }
      if (this.held !== null) {
        this.held.frames.push({
          eventType,
          data,
          policyReading: this.connectionPolicyReading,
          sessionWriters,
          receivedWallMs,
          receivedAtMs,
        });
        return;
      }
      if (eventType !== "client_event") {
        logForDebugging(`SSETransport: Unexpected SSE event type '${eventType}' on worker stream`, {
          level: "warn",
        });
        logForDiagnosticsNoPII("warn", "cli_sse_unexpected_event_type", {
          event_type: eventType,
        });
        return;
      }
      let frame;
      try {
        frame = jsonParse(data);
      } catch (error) {
        logForDebugging(`SSETransport: Failed to parse client_event data: ${errorMessage(error)}`, {
          level: "error",
        });
        return;
      }
      let payload = frame.payload;
      if (payload && typeof payload === "object" && "type" in payload) {
        let sessionText = this.sessionId ? ` session=${this.sessionId}` : "";
        let attestationText = frame.device_attestation_status
          ? ` attestation=${frame.device_attestation_status}`
          : "";
        logForDebugging(
          `SSETransport: Event seq=${frame.sequence_num} event_id=${frame.event_id} event_type=${frame.event_type} payload_type=${String(payload.type)}${attestationText}${sessionText}`,
        );
        logForDiagnosticsNoPII("info", "cli_sse_message_received");
        if (
          sessionWriters !== undefined &&
          this.state === "connected" &&
          this.statementRenewalGate?.(frame, sessionWriters) === true
        ) {
          this.held = {
            frames: [
              {
                eventType,
                data,
                policyReading: this.connectionPolicyReading,
                sessionWriters,
                receivedWallMs,
                receivedAtMs,
              },
            ],
            close: null,
          };
          this.isHeldForRenewal = true;
          this.renewConnection();
          return;
        }
        if (sessionWriters !== undefined) this.frameSessionWriters.set(frame, sessionWriters);
        let decision = this.eventFilter?.(frame);
        if (decision)
          logForDiagnosticsNoPII(
            "warn",
            "cli_sse_event_filtered",
            decision === true
              ? undefined
              : {
                  decision,
                },
          );
        else if (
          typeof payload.type === "string" &&
          SESSION_EVENT_TYPES_WITH_EVENT_TYPE.has(payload.type) &&
          frame.event_type !== payload.type
        ) {
          logForDiagnosticsNoPII("warn", "cli_sse_server_only_event_type_mismatch", {
            event_type: frame.event_type,
            payload_type: payload.type,
          });
          this.onEventVetoed?.(frame);
        } else if (payload.type === "control_request" && frame.source === "worker")
          logForDiagnosticsNoPII("warn", "cli_sse_worker_control_request_dropped");
        else {
          this.onDeliveredCallback?.(frame, sessionWriters, receivedAtMs);
          if (payload.type === "user" && typeof payload.uuid === "string")
            this.onUserFrameReceived?.(payload.uuid, receivedWallMs, frame.processing_at, receivedAtMs);
          this.onData?.(
            jsonStringify(frame.payload) +
              `
`,
          );
        }
      } else
        logForDebugging(
          `SSETransport: Ignoring client_event with no type in payload: event_id=${frame.event_id}`,
        );
      this.onEventCallback?.(frame);
    }
    emitClose(code, detail) {
      if (this.held !== null) {
        this.held.close = {
          code,
          detail,
        };
        if (this.isHeldForRenewal) {
          this.isHeldForRenewal = false;
          this.startDelivery();
        }
        return;
      }
      this.onCloseCallback?.(code, detail);
    }
    renewConnection() {
      if (this.state !== "connected") return;
      logForDebugging("SSETransport: Renewing the connection");
      logForDiagnosticsNoPII("info", "cli_sse_renew_connection");
      this.reopenAtOnce("renewal");
    }
    reopenAtOnce(reason) {
      if (this.refreshHeaders) {
        let headers = this.refreshHeaders();
        Object.assign(this.headers, headers);
        dedupeAuthHeaders(this.headers, headers);
      }
      this.clearLivenessTimer();
      if (reason === "renewal" && this.abortController !== null) {
        this.endedForRenewal.add(this.abortController);
        this.abortController.abort(dOMException_2);
      }
      this.abortController = null;
      if (this.streamOpener?.restartsBackoffAtEnd()) this.reconnectAttempts = 0;
      this.state = "reconnecting";
      this.quietRedial = reason === "long_poll";
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
      for (let frame of this.held?.frames ?? []) frame.sessionWriters = sessionWriters;
      this.startDelivery();
    }
    startDelivery() {
      let held = this.held;
      if (held === null) return;
      this.held = null;
      let opener;
      for (let frame of held.frames) {
        if (frame.policyReading !== undefined && frame.policyReading !== opener) {
          opener = frame.policyReading;
          if (!this.handSinkPolicyReading(opener)) return;
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
        this.connectionPolicyReading !== opener &&
        !this.handSinkPolicyReading(this.connectionPolicyReading)
      )
        return;
      if (held.close !== null) this.onCloseCallback?.(held.close.code, held.close.detail);
    }
    handSinkPolicyReading(reading) {
      this.workerAttestationPolicySink?.(reading);
      return this.state !== "closing";
    }
    handleEphemeralFrame(frame) {
      let opened;
      try {
        opened = jsonParse(frame);
      } catch (error) {
        logForDebugging(`SSETransport: Failed to parse ephemeral_event data: ${errorMessage(error)}`, {
          level: "error",
        });
        return;
      }
      let envelope = eventTypeEnvelopeSchema().safeParse(opened);
      if (
        envelope.success &&
        envelope.data.event_type === OWNER_PRESENT &&
        this.onOwnerPresent !== undefined
      ) {
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
        envelope.success &&
        envelope.data.event_type === CHECKPOINT_REQUEST &&
        this.onCheckpointRequest !== undefined
      ) {
        logForDiagnosticsNoPII("info", "cli_sse_checkpoint_request_received");
        try {
          this.onCheckpointRequest();
        } catch (error) {
          logError(error);
          logForDiagnosticsNoPII("error", "cli_sse_checkpoint_request_handler_threw");
        }
        return;
      }
      if (!envelope.success || envelope.data.event_type !== HEARTBEAT_PROBE) {
        logForDiagnosticsNoPII("warn", "cli_sse_unexpected_ephemeral_type", {
          event_type: envelope.success ? envelope.data.event_type : "unparseable",
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
      let retryDelay = this.streamOpener?.reconnectsAtOnce()
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
        `SSETransport: Reconnecting in ${Math.round(retryDelay)}ms (attempt ${this.reconnectAttempts}, ${Math.round(elapsed / 1000)}s elapsed)`,
      );
      logForDiagnosticsNoPII("error", "cli_sse_reconnect_attempt", {
        reconnectAttempts: this.reconnectAttempts,
      });
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, retryDelay);
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
      let isFreshConnection = this.state === "connected" && this.bodyBytesThisConnection === 0;
      this.abortController?.abort(dOMException);
      this.handleConnectionError();
      if (isFreshConnection) this.countSilentConnection();
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
    sessionWritersOf(frame) {
      return this.frameSessionWriters.get(frame);
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
  };
});
//@ chunk-fp6aqx1j.js:172030-172149 layout
function dedupeAuthHeaders(headers, authHeaders) {
  if (authHeaders.Cookie) delete headers.Authorization;
  if (authHeaders.Authorization) {
    delete headers.Cookie;
    delete headers["X-Organization-Uuid"];
  }
}
//@ chunk-fp6aqx1j.js:172149-172199 layout
function clampReconnectDelay(value) {
  return Math.min(Math.max(value, DEFAULT_KEEPALIVE_INTERVAL_SECONDS), MAX_KEEPALIVE_INTERVAL_SECONDS);
}
//@ chunk-fp6aqx1j.js:172199-172309 fingerprint (2.1.88 match: convertSSEUrlToPostUrl, 1)
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

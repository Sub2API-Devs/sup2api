/**
 * cli/transports/WorkerSocket.ts
 *
 * 2.1.316 新增。云 worker 的 WebSocket 传输（/worker/events）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z4g2ta8k.js (7)
 * attribution: placement 7
 */
import {
  DEFAULT_MAX_MESSAGE_BYTES,
  MESSAGE_BYTES_RESERVE,
  WORKER_EVENT_PATH_KINDS,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_REFUSED_STATUSES,
  RENEWAL_INTERVAL_MS,
  HELLO_TIMEOUT_MS,
  WORKER_EVENT_STREAMS,
  MAX_BATCH_SERVER_ERRORS,
  SOCKET_UNSERVED_TIMEOUT_MS,
  MAX_REDIALS_WITHOUT_HELLO,
  MAX_DIALS_WITHOUT_HELLO,
  MAX_UNACCEPTED_ENDS,
  workerEventFrameSchema,
  sequenceNumReplySchema,
} from "../remoteIO/ingress.js";
import { createSignal } from "../../utils/signal.js";
import { systemClock } from "../../utils/sleep.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  dOMException,
  dOMException_2,
  WORKER_CAPABILITIES,
  WORKER_SOCKET_PAD_1,
  X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS,
  X_CCR_ATTESTATION_POLICY,
} from "./SSETransport.js";
import { logError } from "../../utils/log.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { appendWatermark } from "../../services/analytics/eventSerialization.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { X_CCR_SESSION_WRITERS } from "./streamEventCoalescing.js";
import { getWebSocketProxyUrl } from "../../utils/proxy.js";
import { getWebSocketTLSOptions } from "../../utils/mtls.js";

//@ chunk-z4g2ta8k.js:59551-67720 placement
/**
 * WorkerSocket：云 worker 与会话服务之间的 WebSocket（/worker/events），负责连接、重连、心跳与事件收发。
 */
class WorkerSocket {
  dial;
  mayCompress;
  clock;
  isOff = false;
  owesSse = false;
  connection;
  lastSocketServed = false;
  hasHadHello = false;
  isCompressionOff = false;
  dialsWithoutHello = 0;
  endsUnaccepted = new Map();
  maxMessageBytes = DEFAULT_MAX_MESSAGE_BYTES;
  renewal;
  changed = createSignal();
  dials = 0;
  encoder = new TextEncoder();
  constructor(dial, mayCompress, clock = systemClock) {
    this.dial = dial;
    this.mayCompress = mayCompress;
    this.clock = clock;
  }
  isTransport() {
    return !this.isOff;
  }
  maxBatchBytes() {
    return this.isOff ? undefined : this.maxMessageBytes - MESSAGE_BYTES_RESERVE;
  }
  restartsBackoffAtOpen() {
    return this.isOff;
  }
  restartsBackoffAtEnd() {
    return !this.isOff && this.lastSocketServed;
  }
  reconnectsAtOnce() {
    return this.owesSse;
  }
  async open({ url, headers, signal, openSse }) {
    if (!this.isOff) {
      signal.throwIfAborted();
      let h = await this.dialOnce(url, headers, signal);
      if (typeof h !== "string") return h;
      if (!this.isOff)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `worker socket: ended without CCR's opening message (${h})`,
          "worker socket: ended without CCR's opening message",
        );
      signal.throwIfAborted();
    }
    this.owesSse = false;
    return openSse();
  }
  carry(e, n, r) {
    let s = WORKER_EVENT_PATH_KINDS.get(e);
    return s === undefined || this.isOff ? undefined : this.carryOn(s, n, r);
  }
  async carryOn(e, n, r) {
    while (!this.isOff) {
      let connection = this.connection;
      if (!connection?.greeted || connection.unanswered.has(e) || this.renewal) {
        let { promise, resolve } = Promise.withResolvers();
        let k = this.changed.subscribe(resolve);
        await promise;
        k();
        continue;
      }
      let h = await this.send(connection, e, n, r);
      if (h !== "ended") return h;
    }
    return;
  }
  beat(e, n, r) {
    let connection = this.connection;
    if (this.isOff || !connection?.greeted || this.renewal || connection.beat) return;
    let h = connection.lastId + 1;
    let socketFrame = buildSocketFrame(connection, h, "heartbeat", e);
    if (Buffer.byteLength(socketFrame) > this.maxMessageBytes) return;
    try {
      connection.socket?.send(socketFrame);
    } catch (error) {
      logForDebugging(`WorkerSocket: send() threw: ${errorMessage(error)}`, {
        level: "error",
      });
      this.end(connection, "send_threw");
      return;
    }
    connection.lastId = h;
    let { promise, resolve } = Promise.withResolvers();
    let P = false;
    let O = this.clock.setTimeout(
      () => {
        P = true;
        resolve(undefined);
      },
      Math.min(HEARTBEAT_INTERVAL_MS, n / 3),
    );
    let A = this.clock.setTimeout(() => this.end(connection, "heartbeat_unanswered"), n);
    connection.beat = {
      id: h,
      answer: (x) => {
        connection.beat = undefined;
        O();
        A();
        if (x === undefined || !(x.ok || HEARTBEAT_REFUSED_STATUSES.has(x.status))) resolve(undefined);
        else if (!P) resolve(x);
        else if (x.ok) r(x);
      },
    };
    return promise;
  }
  whenQuiet(e, n = false) {
    if (!this.connection?.unanswered.size && !this.connection?.beat) {
      this.runNow(e, n);
      return;
    }
    this.renewal = {
      renew: e,
      isForNewToken: n || (this.renewal?.isForNewToken ?? false),
      cancelTimer:
        this.renewal?.cancelTimer ?? this.clock.setTimeout(() => this.runRenewal(), RENEWAL_INTERVAL_MS),
    };
  }
  runRenewal() {
    let renewal = this.renewal;
    if (!renewal) return;
    this.renewal = undefined;
    renewal.cancelTimer();
    try {
      this.runNow(renewal.renew, renewal.isForNewToken);
    } catch (error) {
      logForDebugging(`WorkerSocket: renewing the stream threw: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    this.changed.emit();
  }
  runNow(e, n) {
    let connection = this.connection;
    let s = n && connection?.greeted === true;
    if (s) connection.isForNewToken = true;
    try {
      e();
    } finally {
      if (s && !connection.ended) connection.isForNewToken = false;
    }
  }
  usePostFromNowOn() {
    this.isOff = true;
    if (this.connection) this.end(this.connection, "shutdown");
    this.changed.emit();
  }
  dialOnce(e, n, r) {
    let { promise, resolve } = Promise.withResolvers();
    let y = () =>
      this.end(
        S,
        r.reason === dOMException ? "stream_silent" : r.reason === dOMException_2 ? "renewed" : "aborted",
      );
    let S = {
      socket: undefined,
      dialedAtMs: this.clock.monotonicNow(),
      greeted: false,
      offeredCompression: false,
      isCompressed: false,
      hasAnswered: false,
      ended: false,
      lastId: 0,
      unanswered: new Map(),
      serverErrors: new Map(),
      beat: undefined,
      isForNewToken: false,
      frames: undefined,
      cancelHelloTimer: this.clock.setTimeout(() => this.end(S, "no_hello"), HELLO_TIMEOUT_MS),
      settleOpen: resolve,
      unwatchAbort: () => r.removeEventListener("abort", y),
    };
    r.addEventListener("abort", y, {
      once: true,
    });
    this.connection = S;
    this.dials++;
    try {
      S.offeredCompression = !this.isCompressionOff && this.mayCompress(e);
    } catch (error) {
      logError(
        Error("WorkerSocket: could not decide whether to offer compression, so this dial does not offer it", {
          cause: error,
        }),
      );
    }
    try {
      let k = e;
      if (S.offeredCompression) {
        let P = new URL(e);
        P.searchParams.set(
          WORKER_CAPABILITIES,
          [...P.searchParams.getAll(WORKER_CAPABILITIES), WORKER_SOCKET_PAD_1].join(","),
        );
        k = P.href;
      }
      S.socket = this.dial(k.replace(/^http/, "ws"), n, S.offeredCompression);
    } catch (error) {
      logForDebugging(`WorkerSocket: the dial threw: ${errorMessage(error)}`, {
        level: "error",
      });
      this.end(S, "dial_threw");
      return promise;
    }
    S.socket.onmessage = (k) => this.take(S, k.data);
    S.socket.onerror = () => this.end(S, "socket_error");
    S.socket.onclose = (k) => this.end(S, `closed_${k.code}`);
    return promise;
  }
  send(e, n, r, s) {
    let h = e.lastId + 1;
    let socketFrame = buildSocketFrame(e, h, n, r);
    if (Buffer.byteLength(socketFrame) > this.maxMessageBytes) return Promise.resolve(undefined);
    if (!this.endsUnaccepted.has(n)) this.endsUnaccepted.set(n, 0);
    try {
      e.socket?.send(socketFrame);
    } catch (error) {
      logForDebugging(`WorkerSocket: send() threw: ${errorMessage(error)}`, {
        level: "error",
      });
      this.end(e, "send_threw");
      return Promise.resolve("ended");
    }
    e.lastId = h;
    let { promise, resolve } = Promise.withResolvers();
    e.unanswered.set(n, {
      id: h,
      settle: resolve,
      cancelTimer: this.clock.setTimeout(() => this.end(e, "batch_unanswered"), s + RENEWAL_INTERVAL_MS),
    });
    return promise;
  }
  take(e, n) {
    try {
      let workerEventFrame = parseWorkerEventFrame(n);
      if (!e.greeted) this.takeHello(e, workerEventFrame?.hello);
      else if (workerEventFrame?.ack) this.takeAck(e, workerEventFrame.ack);
      else if (workerEventFrame?.event)
        e.frames?.enqueue(this.encoder.encode(encodeSseEvents(workerEventFrame.event)));
      else if (workerEventFrame?.keep_alive)
        e.frames?.enqueue(
          this.encoder.encode(`:keepalive

`),
        );
      else
        logForDebugging("WorkerSocket: dropped a message (unreadable, of no known type, or a second hello)", {
          level: "warn",
        });
    } catch (error) {
      logForDebugging(`WorkerSocket: handling a message threw: ${errorMessage(error)}`, {
        level: "error",
      });
      this.end(e, "message_handler_threw");
    }
  }
  takeHello(e, n) {
    if (n === undefined) {
      this.end(e, "no_hello");
      return;
    }
    if (n.mode !== "socket") {
      this.end(e, "told_sse_and_post");
      return;
    }
    let extensions = e.socket?.extensions ?? "";
    let [s, ...h] = extensions.split(";").map((S) => S.trim());
    if (
      extensions !== "" &&
      !(
        s === "permessage-deflate" &&
        h.every((S) => WORKER_EVENT_STREAMS.test(S)) &&
        h.includes("client_no_context_takeover") &&
        h.includes("server_no_context_takeover")
      )
    ) {
      logForDebugging(
        "WorkerSocket: CCR accepted compression in a form that may compress a message against earlier ones, so this socket is ended and this process no longer offers compression",
        {
          level: "warn",
        },
      );
      this.isCompressionOff = true;
      this.end(e, "deflate_keeps_context");
      return;
    }
    let response = new Response(
      new ReadableStream({
        start: (frames) => {
          e.frames = frames;
        },
      }),
      {
        status: 200,
        headers: buildStreamResponseHeaders(n),
      },
    );
    e.greeted = true;
    e.isCompressed = extensions !== "";
    e.cancelHelloTimer();
    this.hasHadHello = true;
    this.dialsWithoutHello = 0;
    this.maxMessageBytes = n.max_message_bytes ?? DEFAULT_MAX_MESSAGE_BYTES;
    logForDebugging(
      `WorkerSocket: open, ${Math.round(this.clock.monotonicNow() - e.dialedAtMs)} ms after the dial${e.isCompressed ? ", compressed" : ""}`,
    );
    e.settleOpen(response);
    this.changed.emit();
  }
  takeAck(e, n) {
    let { beat } = e;
    if (beat?.id === n.id) {
      let s = workerReplyToResponse(n, "heartbeat");
      beat.answer(s);
      if (s.status === 401 || s.status === 403) this.end(e, "heartbeat_401_403");
      else if (e.unanswered.size === 0) this.runRenewal();
      return;
    }
    for (let [s, h] of e.unanswered) {
      if (h.id !== n.id) continue;
      let y = workerReplyToResponse(n, s);
      e.unanswered.delete(s);
      h.cancelTimer();
      h.settle(y);
      if (y.ok) this.endsUnaccepted.delete(s);
      if (y.status < 500) {
        e.hasAnswered = true;
        e.serverErrors.delete(s);
        if (y.status === 401 || y.status === 403) this.end(e, "batch_401_403");
      } else {
        let S = (e.serverErrors.get(s) ?? 0) + 1;
        e.serverErrors.set(s, S);
        if (S >= MAX_BATCH_SERVER_ERRORS) this.end(e, "batch_5xx");
      }
      if (e.unanswered.size === 0 && !e.beat) this.runRenewal();
      this.changed.emit();
      return;
    }
  }
  end(e, n) {
    if (e.ended) return;
    e.ended = true;
    this.renewal?.cancelTimer();
    this.renewal = undefined;
    e.cancelHelloTimer();
    e.unwatchAbort();
    if (this.connection === e) this.connection = undefined;
    let r = this.clock.monotonicNow() - e.dialedAtMs;
    this.lastSocketServed = e.hasAnswered || r >= SOCKET_UNSERVED_TIMEOUT_MS;
    let s = n === "aborted" || n === "renewed" || n === "shutdown" || n === "closed_1013";
    if (e.isForNewToken || (n === "deflate_keeps_context" && e.offeredCompression));
    else if (e.greeted) {
      for (let [S, k] of this.endsUnaccepted) this.endsUnaccepted.set(S, k + 1);
      if (
        e.isCompressed &&
        (this.endsUnaccepted.size > 0 || n === "closed_1009" || (!s && !this.lastSocketServed))
      )
        this.isCompressionOff = true;
    } else if (n !== "told_sse_and_post") {
      this.dialsWithoutHello++;
      this.isCompressionOff ||= e.offeredCompression;
    }
    let h = this.isOff
      ? undefined
      : n === "told_sse_and_post"
        ? "told"
        : this.dialsWithoutHello >= (this.hasHadHello ? MAX_REDIALS_WITHOUT_HELLO : MAX_DIALS_WITHOUT_HELLO)
          ? "no_hello"
          : Math.max(0, ...this.endsUnaccepted.values()) >= MAX_UNACCEPTED_ENDS
            ? "batch_stuck"
            : undefined;
    if (h !== undefined) {
      this.isOff = true;
      this.owesSse = true;
    }
    let y = e.unanswered.size + (e.beat ? 1 : 0);
    for (let S of e.unanswered.values()) {
      S.cancelTimer();
      S.settle("ended");
    }
    e.unanswered.clear();
    e.beat?.answer(undefined);
    e.settleOpen(n);
    this.changed.emit();
    try {
      if (e.socket) {
        e.socket.onmessage = null;
        e.socket.onerror = null;
        e.socket.onclose = null;
        e.socket.close(1000);
        e.socket.terminate?.();
      }
      e.frames?.close();
      logForDebugging(
        `WorkerSocket: ended (${n}), unanswered batches and heartbeats: ${y}${h === undefined ? "" : `; fell back to SSE and POST (${h})`}`,
      );
      let S = {
        greeted: e.greeted,
        offered_compression: e.offeredCompression,
        compressed: e.isCompressed,
        age_ms: Math.round(r),
        dial: this.dials,
        requests: e.lastId,
        unanswered: y,
        fell_back: h !== undefined,
        ...(h !== undefined && {
          fallback_reason: fromEnum(h),
        }),
      };
      if (e.greeted && h === undefined && s) logFeatureOk("ccr_worker_socket", S);
      else logFeatureSad("ccr_worker_socket", n, S);
    } catch {}
  }
}
//@ chunk-z4g2ta8k.js:67720-67804 placement
function buildSocketFrame(e, n, r, s) {
  let h = `{"id":${n},"${r}":${s}}`;
  return e.isCompressed ? appendWatermark(h) : h;
}
//@ chunk-z4g2ta8k.js:67804-67901 placement
function parseWorkerEventFrame(e) {
  if (typeof e !== "string") return;
  try {
    return workerEventFrameSchema().safeParse(jsonParse(e)).data;
  } catch {
    return;
  }
}
//@ chunk-z4g2ta8k.js:67901-68340 placement
/**
 * 把 WorkerSocket 收到的应答帧还原为 HTTP Response：无错误时返回指定字段的 JSON（缺失则 500），有错误时按 status（限 400–599）并带 retry-after、x-ccr-conflict-reason 头。
 */
function workerReplyToResponse(e, n) {
  let { error } = e;
  if (error === undefined)
    return e[n] === undefined
      ? new Response(null, {
          status: 500,
        })
      : new Response(jsonStringify(e[n]), {
          status: 200,
        });
  let { status = 500 } = error;
  let headers = new Headers();
  if (error.retry_after_seconds !== undefined) headers.set("retry-after", String(error.retry_after_seconds));
  if (error.conflict_reason !== undefined) headers.set("x-ccr-conflict-reason", error.conflict_reason);
  return new Response(
    jsonStringify({
      error: {
        type: error.type,
      },
    }),
    {
      status: Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500,
      headers,
    },
  );
}
//@ chunk-z4g2ta8k.js:68340-68689 placement
/**
 * 按服务端返回的元数据构造 SSE 响应头：content-type、date、保活间隔等。
 */
function buildStreamResponseHeaders(e) {
  let headers = new Headers({
    "content-type": "text/event-stream",
  });
  if (e.server_time !== undefined) headers.set("date", e.server_time);
  if (e.keep_alive_interval_seconds !== undefined)
    headers.set(X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS, String(e.keep_alive_interval_seconds));
  if (e.session_writers !== undefined) headers.set(X_CCR_SESSION_WRITERS, e.session_writers);
  if (e.attestation_policy !== undefined) headers.set(X_CCR_ATTESTATION_POLICY, e.attestation_policy);
  return headers;
}
//@ chunk-z4g2ta8k.js:68689-68918 placement
function encodeSseEvents(event) {
  let n = "";
  for (let [key, value] of Object.entries(event)) {
    if (!/^\w+$/.test(key)) continue;
    let h = key === "client_event" ? sequenceNumReplySchema().safeParse(value).data : undefined;
    let y =
      h === undefined
        ? ""
        : `id: ${h.sequence_num}
`;
    n += `event: ${key}
${y}data: ${jsonStringify(value)}

`;
  }
  return n;
}
//@ chunk-z4g2ta8k.js:68918-69084 placement
/**
 * 用 Bun WebSocket 打开 worker 连接；wss 时套用 WebSocket 代理与 TLS 选项。
 */
function openWorkerWebSocket(e, headers, perMessageDeflate) {
  let s = e.startsWith("wss:");
  return new globalThis.WebSocket(e, {
    headers,
    perMessageDeflate,
    proxy: s ? getWebSocketProxyUrl(e) : undefined,
    tls: s ? getWebSocketTLSOptions(undefined) || undefined : undefined,
  });
}
export { WorkerSocket, openWorkerWebSocket };

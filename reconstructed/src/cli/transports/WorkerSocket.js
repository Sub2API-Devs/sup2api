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
  Kn,
  xs,
  Ls,
  Ms,
  Ds,
  Gn,
  Ts,
  WORKER_EVENT_STREAMS,
  Ps,
  Ns,
  Is,
  Os,
  Fs,
  Ws,
  Us,
} from "../remoteIO/ingress.js";
import { createSignal } from "../../utils/signal.js";
import { Aa } from "../../utils/sleep.js";
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

/**
 * WorkerSocket：云 worker 与会话服务之间的 WebSocket（/worker/events），负责连接、重连、心跳与事件收发。
 */
//@ chunk-z4g2ta8k.js:59551-67720 placement
class WorkerSocket {
  dial;
  mayCompress;
  clock;
  isOff = !1;
  owesSse = !1;
  connection;
  lastSocketServed = !1;
  hasHadHello = !1;
  isCompressionOff = !1;
  dialsWithoutHello = 0;
  endsUnaccepted = new Map();
  maxMessageBytes = Kn;
  renewal;
  changed = createSignal();
  dials = 0;
  encoder = new TextEncoder();
  constructor(e, n, r = Aa) {
    this.dial = e;
    this.mayCompress = n;
    this.clock = r;
  }
  isTransport() {
    return !this.isOff;
  }
  maxBatchBytes() {
    return this.isOff ? void 0 : this.maxMessageBytes - xs;
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
  async open({ url: e, headers: n, signal: r, openSse: s }) {
    if (!this.isOff) {
      r.throwIfAborted();
      let dialOnce = await this.dialOnce(e, n, r);
      if (typeof dialOnce !== "string") return dialOnce;
      if (!this.isOff)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `worker socket: ended without CCR's opening message (${dialOnce})`,
          "worker socket: ended without CCR's opening message",
        );
      r.throwIfAborted();
    }
    return ((this.owesSse = !1), s());
  }
  carry(e, n, r) {
    let s = Ls.get(e);
    return s === void 0 || this.isOff ? void 0 : this.carryOn(s, n, r);
  }
  async carryOn(e, n, r) {
    while (!this.isOff) {
      let connection = this.connection;
      if (!connection?.greeted || connection.unanswered.has(e) || this.renewal) {
        let { promise: promise, resolve: resolve } = Promise.withResolvers(),
          subscribe = this.changed.subscribe(resolve);
        (await promise, subscribe());
        continue;
      }
      let send = await this.send(connection, e, n, r);
      if (send !== "ended") return send;
    }
    return;
  }
  beat(e, n, r) {
    let connection = this.connection;
    if (this.isOff || !connection?.greeted || this.renewal || connection.beat) return;
    let h = connection.lastId + 1,
      y = Yn(connection, h, "heartbeat", e);
    if (Buffer.byteLength(y) > this.maxMessageBytes) return;
    try {
      connection.socket?.send(y);
    } catch (error) {
      (logForDebugging(`WorkerSocket: send() threw: ${errorMessage(error)}`, { level: "error" }),
        this.end(connection, "send_threw"));
      return;
    }
    connection.lastId = h;
    let { promise: promise, resolve: resolve } = Promise.withResolvers(),
      P = !1,
      O = this.clock.setTimeout(
        () => {
          ((P = !0), resolve(void 0));
        },
        Math.min(Ms, n / 3),
      ),
      A = this.clock.setTimeout(() => this.end(connection, "heartbeat_unanswered"), n);
    return (
      (connection.beat = {
        id: h,
        answer: (x) => {
          if (((connection.beat = void 0), O(), A(), x === void 0 || !(x.ok || Ds.has(x.status))))
            resolve(void 0);
          else if (!P) resolve(x);
          else if (x.ok) r(x);
        },
      }),
      promise
    );
  }
  whenQuiet(e, n = !1) {
    if (!this.connection?.unanswered.size && !this.connection?.beat) {
      this.runNow(e, n);
      return;
    }
    this.renewal = {
      renew: e,
      isForNewToken: n || (this.renewal?.isForNewToken ?? !1),
      cancelTimer: this.renewal?.cancelTimer ?? this.clock.setTimeout(() => this.runRenewal(), Gn),
    };
  }
  runRenewal() {
    let renewal = this.renewal;
    if (!renewal) return;
    ((this.renewal = void 0), renewal.cancelTimer());
    try {
      this.runNow(renewal.renew, renewal.isForNewToken);
    } catch (error) {
      logForDebugging(`WorkerSocket: renewing the stream threw: ${errorMessage(error)}`, { level: "error" });
    }
    this.changed.emit();
  }
  runNow(e, n) {
    let connection = this.connection,
      s = n && connection?.greeted === !0;
    if (s) connection.isForNewToken = !0;
    try {
      e();
    } finally {
      if (s && !connection.ended) connection.isForNewToken = !1;
    }
  }
  usePostFromNowOn() {
    if (((this.isOff = !0), this.connection)) this.end(this.connection, "shutdown");
    this.changed.emit();
  }
  dialOnce(e, n, r) {
    let { promise: promise, resolve: resolve } = Promise.withResolvers(),
      y = () =>
        this.end(
          S,
          r.reason === dOMException ? "stream_silent" : r.reason === dOMException_2 ? "renewed" : "aborted",
        ),
      S = {
        socket: void 0,
        dialedAtMs: this.clock.monotonicNow(),
        greeted: !1,
        offeredCompression: !1,
        isCompressed: !1,
        hasAnswered: !1,
        ended: !1,
        lastId: 0,
        unanswered: new Map(),
        serverErrors: new Map(),
        beat: void 0,
        isForNewToken: !1,
        frames: void 0,
        cancelHelloTimer: this.clock.setTimeout(() => this.end(S, "no_hello"), Ts),
        settleOpen: resolve,
        unwatchAbort: () => r.removeEventListener("abort", y),
      };
    (r.addEventListener("abort", y, { once: !0 }), (this.connection = S), this.dials++);
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
        (P.searchParams.set(
          WORKER_CAPABILITIES,
          [...P.searchParams.getAll(WORKER_CAPABILITIES), WORKER_SOCKET_PAD_1].join(","),
        ),
          (k = P.href));
      }
      S.socket = this.dial(k.replace(/^http/, "ws"), n, S.offeredCompression);
    } catch (error) {
      return (
        logForDebugging(`WorkerSocket: the dial threw: ${errorMessage(error)}`, { level: "error" }),
        this.end(S, "dial_threw"),
        promise
      );
    }
    return (
      (S.socket.onmessage = (k) => this.take(S, k.data)),
      (S.socket.onerror = () => this.end(S, "socket_error")),
      (S.socket.onclose = (k) => this.end(S, `closed_${k.code}`)),
      promise
    );
  }
  send(e, n, r, s) {
    let h = e.lastId + 1,
      y = Yn(e, h, n, r);
    if (Buffer.byteLength(y) > this.maxMessageBytes) return Promise.resolve(void 0);
    if (!this.endsUnaccepted.has(n)) this.endsUnaccepted.set(n, 0);
    try {
      e.socket?.send(y);
    } catch (error) {
      return (
        logForDebugging(`WorkerSocket: send() threw: ${errorMessage(error)}`, { level: "error" }),
        this.end(e, "send_threw"),
        Promise.resolve("ended")
      );
    }
    e.lastId = h;
    let { promise: promise, resolve: resolve } = Promise.withResolvers();
    return (
      e.unanswered.set(n, {
        id: h,
        settle: resolve,
        cancelTimer: this.clock.setTimeout(() => this.end(e, "batch_unanswered"), s + Gn),
      }),
      promise
    );
  }
  take(e, n) {
    try {
      let r = Bs(n);
      if (!e.greeted) this.takeHello(e, r?.hello);
      else if (r?.ack) this.takeAck(e, r.ack);
      else if (r?.event) e.frames?.enqueue(this.encoder.encode(encodeSseEvents(r.event)));
      else if (r?.keep_alive)
        e.frames?.enqueue(
          this.encoder.encode(`:keepalive

`),
        );
      else
        logForDebugging("WorkerSocket: dropped a message (unreadable, of no known type, or a second hello)", {
          level: "warn",
        });
    } catch (error) {
      (logForDebugging(`WorkerSocket: handling a message threw: ${errorMessage(error)}`, { level: "error" }),
        this.end(e, "message_handler_threw"));
    }
  }
  takeHello(e, n) {
    if (n === void 0) {
      this.end(e, "no_hello");
      return;
    }
    if (n.mode !== "socket") {
      this.end(e, "told_sse_and_post");
      return;
    }
    let r = e.socket?.extensions ?? "",
      [s, ...h] = r.split(";").map((S) => S.trim());
    if (
      r !== "" &&
      !(
        s === "permessage-deflate" &&
        h.every((S) => WORKER_EVENT_STREAMS.test(S)) &&
        h.includes("client_no_context_takeover") &&
        h.includes("server_no_context_takeover")
      )
    ) {
      (logForDebugging(
        "WorkerSocket: CCR accepted compression in a form that may compress a message against earlier ones, so this socket is ended and this process no longer offers compression",
        { level: "warn" },
      ),
        (this.isCompressionOff = !0),
        this.end(e, "deflate_keeps_context"));
      return;
    }
    let response = new Response(
      new ReadableStream({
        start: (S) => {
          e.frames = S;
        },
      }),
      { status: 200, headers: buildStreamResponseHeaders(n) },
    );
    ((e.greeted = !0),
      (e.isCompressed = r !== ""),
      e.cancelHelloTimer(),
      (this.hasHadHello = !0),
      (this.dialsWithoutHello = 0),
      (this.maxMessageBytes = n.max_message_bytes ?? Kn),
      logForDebugging(
        `WorkerSocket: open, ${Math.round(this.clock.monotonicNow() - e.dialedAtMs)} ms after the dial${e.isCompressed ? ", compressed" : ""}`,
      ),
      e.settleOpen(response),
      this.changed.emit());
  }
  takeAck(e, n) {
    let { beat: beat } = e;
    if (beat?.id === n.id) {
      let s = workerReplyToResponse(n, "heartbeat");
      if ((beat.answer(s), s.status === 401 || s.status === 403)) this.end(e, "heartbeat_401_403");
      else if (e.unanswered.size === 0) this.runRenewal();
      return;
    }
    for (let [s, h] of e.unanswered) {
      if (h.id !== n.id) continue;
      let y = workerReplyToResponse(n, s);
      if ((e.unanswered.delete(s), h.cancelTimer(), h.settle(y), y.ok)) this.endsUnaccepted.delete(s);
      if (y.status < 500) {
        if (((e.hasAnswered = !0), e.serverErrors.delete(s), y.status === 401 || y.status === 403))
          this.end(e, "batch_401_403");
      } else {
        let S = (e.serverErrors.get(s) ?? 0) + 1;
        if ((e.serverErrors.set(s, S), S >= Ps)) this.end(e, "batch_5xx");
      }
      if (e.unanswered.size === 0 && !e.beat) this.runRenewal();
      this.changed.emit();
      return;
    }
  }
  end(e, n) {
    if (e.ended) return;
    if (
      ((e.ended = !0),
      this.renewal?.cancelTimer(),
      (this.renewal = void 0),
      e.cancelHelloTimer(),
      e.unwatchAbort(),
      this.connection === e)
    )
      this.connection = void 0;
    let r = this.clock.monotonicNow() - e.dialedAtMs;
    this.lastSocketServed = e.hasAnswered || r >= Ns;
    let s = n === "aborted" || n === "renewed" || n === "shutdown" || n === "closed_1013";
    if (e.isForNewToken || (n === "deflate_keeps_context" && e.offeredCompression));
    else if (e.greeted) {
      for (let [S, k] of this.endsUnaccepted) this.endsUnaccepted.set(S, k + 1);
      if (
        e.isCompressed &&
        (this.endsUnaccepted.size > 0 || n === "closed_1009" || (!s && !this.lastSocketServed))
      )
        this.isCompressionOff = !0;
    } else if (n !== "told_sse_and_post")
      (this.dialsWithoutHello++, (this.isCompressionOff ||= e.offeredCompression));
    let h = this.isOff
      ? void 0
      : n === "told_sse_and_post"
        ? "told"
        : this.dialsWithoutHello >= (this.hasHadHello ? Is : Os)
          ? "no_hello"
          : Math.max(0, ...this.endsUnaccepted.values()) >= Fs
            ? "batch_stuck"
            : void 0;
    if (h !== void 0) ((this.isOff = !0), (this.owesSse = !0));
    let y = e.unanswered.size + (e.beat ? 1 : 0);
    for (let S of e.unanswered.values()) (S.cancelTimer(), S.settle("ended"));
    (e.unanswered.clear(), e.beat?.answer(void 0), e.settleOpen(n), this.changed.emit());
    try {
      if (e.socket)
        ((e.socket.onmessage = null),
          (e.socket.onerror = null),
          (e.socket.onclose = null),
          e.socket.close(1000),
          e.socket.terminate?.());
      (e.frames?.close(),
        logForDebugging(
          `WorkerSocket: ended (${n}), unanswered batches and heartbeats: ${y}${h === void 0 ? "" : `; fell back to SSE and POST (${h})`}`,
        ));
      let S = {
        greeted: e.greeted,
        offered_compression: e.offeredCompression,
        compressed: e.isCompressed,
        age_ms: Math.round(r),
        dial: this.dials,
        requests: e.lastId,
        unanswered: y,
        fell_back: h !== void 0,
        ...(h !== void 0 && { fallback_reason: fromEnum(h) }),
      };
      if (e.greeted && h === void 0 && s) logFeatureOk("ccr_worker_socket", S);
      else logFeatureSad("ccr_worker_socket", n, S);
    } catch {}
  }
}
//@ chunk-z4g2ta8k.js:67720-67804 placement
function Yn(e, n, r, s) {
  let h = `{"id":${n},"${r}":${s}}`;
  return e.isCompressed ? appendWatermark(h) : h;
}
//@ chunk-z4g2ta8k.js:67804-67901 placement
function Bs(e) {
  if (typeof e !== "string") return;
  try {
    return Ws().safeParse(jsonParse(e)).data;
  } catch {
    return;
  }
}
/**
 * 把 WorkerSocket 收到的应答帧还原为 HTTP Response：无错误时返回指定字段的 JSON（缺失则 500），有错误时按 status（限 400–599）并带 retry-after、x-ccr-conflict-reason 头。
 */
//@ chunk-z4g2ta8k.js:67901-68340 placement
function workerReplyToResponse(e, n) {
  let { error: error } = e;
  if (error === void 0)
    return e[n] === void 0
      ? new Response(null, { status: 500 })
      : new Response(jsonStringify(e[n]), { status: 200 });
  let { status: status = 500 } = error,
    headers = new Headers();
  if (error.retry_after_seconds !== void 0) headers.set("retry-after", String(error.retry_after_seconds));
  if (error.conflict_reason !== void 0) headers.set("x-ccr-conflict-reason", error.conflict_reason);
  return new Response(jsonStringify({ error: { type: error.type } }), {
    status: Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500,
    headers: headers,
  });
}
/**
 * 按服务端返回的元数据构造 SSE 响应头：content-type、date、保活间隔等。
 */
//@ chunk-z4g2ta8k.js:68340-68689 placement
function buildStreamResponseHeaders(e) {
  let headers = new Headers({ "content-type": "text/event-stream" });
  if (e.server_time !== void 0) headers.set("date", e.server_time);
  if (e.keep_alive_interval_seconds !== void 0)
    headers.set(X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS, String(e.keep_alive_interval_seconds));
  if (e.session_writers !== void 0) headers.set(X_CCR_SESSION_WRITERS, e.session_writers);
  if (e.attestation_policy !== void 0) headers.set(X_CCR_ATTESTATION_POLICY, e.attestation_policy);
  return headers;
}
//@ chunk-z4g2ta8k.js:68689-68918 placement
function encodeSseEvents(e) {
  let n = "";
  for (let [r, s] of Object.entries(e)) {
    if (!/^\w+$/.test(r)) continue;
    let h = r === "client_event" ? Us().safeParse(s).data : void 0,
      y =
        h === void 0
          ? ""
          : `id: ${h.sequence_num}
`;
    n += `event: ${r}
${y}data: ${jsonStringify(s)}

`;
  }
  return n;
}
/**
 * 用 Bun WebSocket 打开 worker 连接；wss 时套用 WebSocket 代理与 TLS 选项。
 */
//@ chunk-z4g2ta8k.js:68918-69084 placement
function openWorkerWebSocket(e, n, r) {
  let startsWith = e.startsWith("wss:");
  return new globalThis.WebSocket(e, {
    headers: n,
    perMessageDeflate: r,
    proxy: startsWith ? getWebSocketProxyUrl(e) : void 0,
    tls: startsWith ? getWebSocketTLSOptions(void 0) || void 0 : void 0,
  });
}

export { WorkerSocket, openWorkerWebSocket };

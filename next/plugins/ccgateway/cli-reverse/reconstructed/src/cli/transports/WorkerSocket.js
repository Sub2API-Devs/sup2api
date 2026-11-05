/**
 * cli/transports/WorkerSocket.ts
 *
 * 2.1.316 新增。云 worker 的 WebSocket 传输（/worker/events）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1kk50rk6.js (7)
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

//@ chunk-1kk50rk6.js:63196-71365 placement
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
      let helloResult = await this.dialOnce(url, headers, signal);
      if (typeof helloResult !== "string") return helloResult;
      if (!this.isOff)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `worker socket: ended without CCR's opening message (${helloResult})`,
          "worker socket: ended without CCR's opening message",
        );
      signal.throwIfAborted();
    }
    this.owesSse = false;
    return openSse();
  }
  carry(path, body, timeoutMs) {
    let kind = WORKER_EVENT_PATH_KINDS.get(path);
    return kind === undefined || this.isOff ? undefined : this.carryOn(kind, body, timeoutMs);
  }
  async carryOn(id, body, timeoutMs) {
    while (!this.isOff) {
      let connection = this.connection;
      if (!connection?.greeted || connection.unanswered.has(id) || this.renewal) {
        let { promise, resolve } = Promise.withResolvers();
        let unsubscribe = this.changed.subscribe(resolve);
        await promise;
        unsubscribe();
        continue;
      }
      let outcome = await this.send(connection, id, body, timeoutMs);
      if (outcome !== "ended") return outcome;
    }
    return;
  }
  beat(id, timeoutMs, onReply) {
    let connection = this.connection;
    if (this.isOff || !connection?.greeted || this.renewal || connection.beat) return;
    let beatId = connection.lastId + 1;
    let socketFrame = buildSocketFrame(connection, beatId, "heartbeat", id);
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
    connection.lastId = beatId;
    let { promise, resolve } = Promise.withResolvers();
    let answered = false;
    let retryTimer = this.clock.setTimeout(
      () => {
        answered = true;
        resolve(undefined);
      },
      Math.min(HEARTBEAT_INTERVAL_MS, timeoutMs / 3),
    );
    let giveUpTimer = this.clock.setTimeout(() => this.end(connection, "heartbeat_unanswered"), timeoutMs);
    connection.beat = {
      id: beatId,
      answer: (reply) => {
        connection.beat = undefined;
        retryTimer();
        giveUpTimer();
        if (reply === undefined || !(reply.ok || HEARTBEAT_REFUSED_STATUSES.has(reply.status)))
          resolve(undefined);
        else if (!answered) resolve(reply);
        else if (reply.ok) onReply(reply);
      },
    };
    return promise;
  }
  whenQuiet(renew, isForNewToken = false) {
    if (!this.connection?.unanswered.size && !this.connection?.beat) {
      this.runNow(renew, isForNewToken);
      return;
    }
    this.renewal = {
      renew,
      isForNewToken: isForNewToken || (this.renewal?.isForNewToken ?? false),
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
  runNow(run, forNewToken) {
    let connection = this.connection;
    let markedForToken = forNewToken && connection?.greeted === true;
    if (markedForToken) connection.isForNewToken = true;
    try {
      run();
    } finally {
      if (markedForToken && !connection.ended) connection.isForNewToken = false;
    }
  }
  usePostFromNowOn() {
    this.isOff = true;
    if (this.connection) this.end(this.connection, "shutdown");
    this.changed.emit();
  }
  dialOnce(url, headers, signal) {
    let { promise, resolve } = Promise.withResolvers();
    let onAbort = () =>
      this.end(
        connection,
        signal.reason === dOMException
          ? "stream_silent"
          : signal.reason === dOMException_2
            ? "renewed"
            : "aborted",
      );
    let connection = {
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
      cancelHelloTimer: this.clock.setTimeout(() => this.end(connection, "no_hello"), HELLO_TIMEOUT_MS),
      settleOpen: resolve,
      unwatchAbort: () => signal.removeEventListener("abort", onAbort),
    };
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    this.connection = connection;
    this.dials++;
    try {
      connection.offeredCompression = !this.isCompressionOff && this.mayCompress(url);
    } catch (error) {
      logError(
        Error("WorkerSocket: could not decide whether to offer compression, so this dial does not offer it", {
          cause: error,
        }),
      );
    }
    try {
      let socketUrl = url;
      if (connection.offeredCompression) {
        let parsedUrl = new URL(url);
        parsedUrl.searchParams.set(
          WORKER_CAPABILITIES,
          [...parsedUrl.searchParams.getAll(WORKER_CAPABILITIES), WORKER_SOCKET_PAD_1].join(","),
        );
        socketUrl = parsedUrl.href;
      }
      connection.socket = this.dial(socketUrl.replace(/^http/, "ws"), headers, connection.offeredCompression);
    } catch (error) {
      logForDebugging(`WorkerSocket: the dial threw: ${errorMessage(error)}`, {
        level: "error",
      });
      this.end(connection, "dial_threw");
      return promise;
    }
    connection.socket.onmessage = (message) => this.take(connection, message.data);
    connection.socket.onerror = () => this.end(connection, "socket_error");
    connection.socket.onclose = (event) => this.end(connection, `closed_${event.code}`);
    return promise;
  }
  send(connection, id, body, timeoutMs) {
    let frameId = connection.lastId + 1;
    let socketFrame = buildSocketFrame(connection, frameId, id, body);
    if (Buffer.byteLength(socketFrame) > this.maxMessageBytes) return Promise.resolve(undefined);
    if (!this.endsUnaccepted.has(id)) this.endsUnaccepted.set(id, 0);
    try {
      connection.socket?.send(socketFrame);
    } catch (error) {
      logForDebugging(`WorkerSocket: send() threw: ${errorMessage(error)}`, {
        level: "error",
      });
      this.end(connection, "send_threw");
      return Promise.resolve("ended");
    }
    connection.lastId = frameId;
    let { promise, resolve } = Promise.withResolvers();
    connection.unanswered.set(id, {
      id: frameId,
      settle: resolve,
      cancelTimer: this.clock.setTimeout(
        () => this.end(connection, "batch_unanswered"),
        timeoutMs + RENEWAL_INTERVAL_MS,
      ),
    });
    return promise;
  }
  take(connection, raw) {
    try {
      let workerEventFrame = parseWorkerEventFrame(raw);
      if (!connection.greeted) this.takeHello(connection, workerEventFrame?.hello);
      else if (workerEventFrame?.ack) this.takeAck(connection, workerEventFrame.ack);
      else if (workerEventFrame?.event)
        connection.frames?.enqueue(this.encoder.encode(encodeSseEvents(workerEventFrame.event)));
      else if (workerEventFrame?.keep_alive)
        connection.frames?.enqueue(
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
      this.end(connection, "message_handler_threw");
    }
  }
  takeHello(connection, hello) {
    if (hello === undefined) {
      this.end(connection, "no_hello");
      return;
    }
    if (hello.mode !== "socket") {
      this.end(connection, "told_sse_and_post");
      return;
    }
    let extensions = connection.socket?.extensions ?? "";
    let [mode, ...streams] = extensions.split(";").map((part) => part.trim());
    if (
      extensions !== "" &&
      !(
        mode === "permessage-deflate" &&
        streams.every((stream) => WORKER_EVENT_STREAMS.test(stream)) &&
        streams.includes("client_no_context_takeover") &&
        streams.includes("server_no_context_takeover")
      )
    ) {
      logForDebugging(
        "WorkerSocket: CCR accepted compression in a form that may compress a message against earlier ones, so this socket is ended and this process no longer offers compression",
        {
          level: "warn",
        },
      );
      this.isCompressionOff = true;
      this.end(connection, "deflate_keeps_context");
      return;
    }
    let response = new Response(
      new ReadableStream({
        start: (frames) => {
          connection.frames = frames;
        },
      }),
      {
        status: 200,
        headers: buildStreamResponseHeaders(hello),
      },
    );
    connection.greeted = true;
    connection.isCompressed = extensions !== "";
    connection.cancelHelloTimer();
    this.hasHadHello = true;
    this.dialsWithoutHello = 0;
    this.maxMessageBytes = hello.max_message_bytes ?? DEFAULT_MAX_MESSAGE_BYTES;
    logForDebugging(
      `WorkerSocket: open, ${Math.round(this.clock.monotonicNow() - connection.dialedAtMs)} ms after the dial${connection.isCompressed ? ", compressed" : ""}`,
    );
    connection.settleOpen(response);
    this.changed.emit();
  }
  takeAck(connection, ack) {
    let { beat } = connection;
    if (beat?.id === ack.id) {
      let ackResponse = workerReplyToResponse(ack, "heartbeat");
      beat.answer(ackResponse);
      if (ackResponse.status === 401 || ackResponse.status === 403) this.end(connection, "heartbeat_401_403");
      else if (connection.unanswered.size === 0) this.runRenewal();
      return;
    }
    for (let [id, pending] of connection.unanswered) {
      if (pending.id !== ack.id) continue;
      let response = workerReplyToResponse(ack, id);
      connection.unanswered.delete(id);
      pending.cancelTimer();
      pending.settle(response);
      if (response.ok) this.endsUnaccepted.delete(id);
      if (response.status < 500) {
        connection.hasAnswered = true;
        connection.serverErrors.delete(id);
        if (response.status === 401 || response.status === 403) this.end(connection, "batch_401_403");
      } else {
        let serverErrors = (connection.serverErrors.get(id) ?? 0) + 1;
        connection.serverErrors.set(id, serverErrors);
        if (serverErrors >= MAX_BATCH_SERVER_ERRORS) this.end(connection, "batch_5xx");
      }
      if (connection.unanswered.size === 0 && !connection.beat) this.runRenewal();
      this.changed.emit();
      return;
    }
  }
  end(connection, reason) {
    if (connection.ended) return;
    connection.ended = true;
    this.renewal?.cancelTimer();
    this.renewal = undefined;
    connection.cancelHelloTimer();
    connection.unwatchAbort();
    if (this.connection === connection) this.connection = undefined;
    let ageMs = this.clock.monotonicNow() - connection.dialedAtMs;
    this.lastSocketServed = connection.hasAnswered || ageMs >= SOCKET_UNSERVED_TIMEOUT_MS;
    let closeNote =
      reason === "aborted" || reason === "renewed" || reason === "shutdown" || reason === "closed_1013";
    if (connection.isForNewToken || (reason === "deflate_keeps_context" && connection.offeredCompression));
    else if (connection.greeted) {
      for (let [reason, count] of this.endsUnaccepted) this.endsUnaccepted.set(reason, count + 1);
      if (
        connection.isCompressed &&
        (this.endsUnaccepted.size > 0 || reason === "closed_1009" || (!closeNote && !this.lastSocketServed))
      )
        this.isCompressionOff = true;
    } else if (reason !== "told_sse_and_post") {
      this.dialsWithoutHello++;
      this.isCompressionOff ||= connection.offeredCompression;
    }
    let onNewToken = this.isOff
      ? undefined
      : reason === "told_sse_and_post"
        ? "told"
        : this.dialsWithoutHello >= (this.hasHadHello ? MAX_REDIALS_WITHOUT_HELLO : MAX_DIALS_WITHOUT_HELLO)
          ? "no_hello"
          : Math.max(0, ...this.endsUnaccepted.values()) >= MAX_UNACCEPTED_ENDS
            ? "batch_stuck"
            : undefined;
    if (onNewToken !== undefined) {
      this.isOff = true;
      this.owesSse = true;
    }
    let outstanding = connection.unanswered.size + (connection.beat ? 1 : 0);
    for (let pending of connection.unanswered.values()) {
      pending.cancelTimer();
      pending.settle("ended");
    }
    connection.unanswered.clear();
    connection.beat?.answer(undefined);
    connection.settleOpen(reason);
    this.changed.emit();
    try {
      if (connection.socket) {
        connection.socket.onmessage = null;
        connection.socket.onerror = null;
        connection.socket.onclose = null;
        connection.socket.close(1000);
        connection.socket.terminate?.();
      }
      connection.frames?.close();
      logForDebugging(
        `WorkerSocket: ended (${reason}), unanswered batches and heartbeats: ${outstanding}${onNewToken === undefined ? "" : `; fell back to SSE and POST (${onNewToken})`}`,
      );
      let logFields = {
        greeted: connection.greeted,
        offered_compression: connection.offeredCompression,
        compressed: connection.isCompressed,
        age_ms: Math.round(ageMs),
        dial: this.dials,
        requests: connection.lastId,
        unanswered: outstanding,
        fell_back: onNewToken !== undefined,
        ...(onNewToken !== undefined && {
          fallback_reason: fromEnum(onNewToken),
        }),
      };
      if (connection.greeted && onNewToken === undefined && closeNote)
        logFeatureOk("ccr_worker_socket", logFields);
      else logFeatureSad("ccr_worker_socket", reason, logFields);
    } catch {}
  }
}
//@ chunk-1kk50rk6.js:71365-71449 placement
function buildSocketFrame(connection, id, kind, body) {
  let frame = `{"id":${id},"${kind}":${body}}`;
  return connection.isCompressed ? appendWatermark(frame) : frame;
}
//@ chunk-1kk50rk6.js:71449-71546 placement
function parseWorkerEventFrame(payload) {
  if (typeof payload !== "string") return;
  try {
    return workerEventFrameSchema().safeParse(jsonParse(payload)).data;
  } catch {
    return;
  }
}
//@ chunk-1kk50rk6.js:71546-71985 placement
/**
 * 把 WorkerSocket 收到的应答帧还原为 HTTP Response：无错误时返回指定字段的 JSON（缺失则 500），有错误时按 status（限 400–599）并带 retry-after、x-ccr-conflict-reason 头。
 */
function workerReplyToResponse(connection, reply) {
  let { error } = connection;
  if (error === undefined)
    return connection[reply] === undefined
      ? new Response(null, {
          status: 500,
        })
      : new Response(jsonStringify(connection[reply]), {
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
//@ chunk-1kk50rk6.js:71985-72334 placement
/**
 * 按服务端返回的元数据构造 SSE 响应头：content-type、date、保活间隔等。
 */
function buildStreamResponseHeaders(connection) {
  let headers = new Headers({
    "content-type": "text/event-stream",
  });
  if (connection.server_time !== undefined) headers.set("date", connection.server_time);
  if (connection.keep_alive_interval_seconds !== undefined)
    headers.set(X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS, String(connection.keep_alive_interval_seconds));
  if (connection.session_writers !== undefined)
    headers.set(X_CCR_SESSION_WRITERS, connection.session_writers);
  if (connection.attestation_policy !== undefined)
    headers.set(X_CCR_ATTESTATION_POLICY, connection.attestation_policy);
  return headers;
}
//@ chunk-1kk50rk6.js:72334-72563 placement
function encodeSseEvents(event) {
  let text = "";
  for (let [key, value] of Object.entries(event)) {
    if (!/^\w+$/.test(key)) continue;
    let reply = key === "client_event" ? sequenceNumReplySchema().safeParse(value).data : undefined;
    let body =
      reply === undefined
        ? ""
        : `id: ${reply.sequence_num}
`;
    text += `event: ${key}
${body}data: ${jsonStringify(value)}

`;
  }
  return text;
}
//@ chunk-1kk50rk6.js:72563-72729 placement
/**
 * 用 Bun WebSocket 打开 worker 连接；wss 时套用 WebSocket 代理与 TLS 选项。
 */
function openWorkerWebSocket(url, headers, perMessageDeflate) {
  let isSecure = url.startsWith("wss:");
  return new globalThis.WebSocket(url, {
    headers,
    perMessageDeflate,
    proxy: isSecure ? getWebSocketProxyUrl(url) : undefined,
    tls: isSecure ? getWebSocketTLSOptions(undefined) || undefined : undefined,
  });
}
export { WorkerSocket, openWorkerWebSocket };

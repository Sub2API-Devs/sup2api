/**
 * bridge/previewTunnel.ts
 *
 * 2.1.316 新增：建立到 CCR TunnelService 的预览隧道（gRPC 流），管理重连、请求表与日志前缀 [bridge:preview-tunnel]；经预览隧道转发一次 HTTP 请求：只允许 POST/GET/DELETE，拒绝 CONNECT，剥离逐跳头等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e1rh8jg7.js (25)
 * attribution: placement 25
 */
import { request } from "http";
import net from "net";
import { decodeJwtPayload } from "./jwtUtils.js";
import { logForDebugging } from "../utils/debug.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { errorMessage } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { getWebSocketProxyUrl } from "../utils/proxy.js";
import { getWebSocketTLSOptions } from "../utils/mtls.js";

//@ chunk-e1rh8jg7.js:428-494 placement
var NO_BODY_HTTP_STATUSES = new Set([204, 205, 304]);
var ALLOWED_TUNNEL_METHODS = new Set(["POST", "GET", "DELETE"]);
//@ chunk-e1rh8jg7.js:494-542 placement
function relayPreviewRequestNoRetry(port, path, request) {
  return relayPreviewRequestToHost("127.0.0.1", port, path, request);
}
//@ chunk-e1rh8jg7.js:542-593 placement
function relayPreviewRequestWithRetry(port, path, request) {
  return relayPreviewRequest("127.0.0.1", port, path, request, true);
}
//@ chunk-e1rh8jg7.js:593-636 placement
function relayPreviewRequestToHost(host, port, path, request) {
  return relayPreviewRequest(host, port, path, request, false);
}
//@ chunk-e1rh8jg7.js:636-1282 placement
/**
 * 经预览隧道转发一次 HTTP 请求：只允许 POST/GET/DELETE，拒绝 CONNECT，剥离逐跳头。
 */
function relayPreviewRequest(host, port, path, { method, headers, body, signal }, allowAnyMethod) {
  let upper = method.toUpperCase();
  if (!allowAnyMethod && !ALLOWED_TUNNEL_METHODS.has(upper))
    return Promise.reject(Error("only POST, GET and DELETE are relayed"));
  if (upper === "CONNECT") return Promise.reject(Error("CONNECT is not relayed"));
  for (let headerName of ["content-length", "transfer-encoding", "connection"]) headers.delete(headerName);
  let requestBody = allowAnyMethod || upper === "POST" ? body : undefined;
  if (allowAnyMethod && requestBody !== undefined) headers.set("content-length", String(requestBody.length));
  return new Promise((resolve, reject) => {
    let tunnelRequest = request(
      {
        host,
        port,
        path,
        method: upper,
        headers: Object.fromEntries(headers),
        signal,
        agent: false,
      },
      (reply) => {
        try {
          resolve(responseFromTunnelReply(reply));
        } catch (error) {
          reply.destroy();
          reject(error);
        }
      },
    );
    tunnelRequest.once("error", reject);
    tunnelRequest.once("close", () => reject(Error("closed unanswered")));
    tunnelRequest.end(requestBody);
  });
}
//@ chunk-e1rh8jg7.js:1282-1617 placement
/**
 * 把隧道返回的原始响应（状态码、rawHeaders、body 流）组装成 fetch Response。
 */
function responseFromTunnelReply(reply) {
  if (reply.statusCode === undefined || reply.statusCode < 200) throw Error("no final status");
  let headers = new Headers();
  for (let index = 0; index + 1 < reply.rawHeaders.length; index += 2)
    headers.append(reply.rawHeaders[index], reply.rawHeaders[index + 1]);
  let bodyless = NO_BODY_HTTP_STATUSES.has(reply.statusCode ?? 0);
  let response = new Response(bodyless ? null : asyncIterableToStream(reply), {
    status: reply.statusCode,
    statusText: reply.statusMessage,
    headers,
  });
  if (bodyless) reply.resume();
  return response;
}
//@ chunk-e1rh8jg7.js:1617-1808 placement
function asyncIterableToStream(iterable) {
  let iterator = iterable[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      let step = await iterator.next();
      if (step.done) controller.close();
      else controller.enqueue(step.value);
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}
//@ chunk-e1rh8jg7.js:1808-1950 placement
var TUNNEL_PROXY_METHOD = "/anthropic.ccr.api.v1alpha2.tunnel.TunnelService/TunnelProxy";
var RECONNECT_BASE_DELAY_MS = 1000;
var RECONNECT_MAX_DELAY_MS = 30000;
var MAX_RECONNECT_ATTEMPTS = 10;
var CONNECT_TIMEOUT_MS = 5000;
var REQUEST_TIMEOUT_MS = 1e4;
var STREAM_WINDOW_MS = 30000;
var IDLE_TIMEOUT_MS = 75000;
var WINDOW_BYTE_BUDGET = 7168 * (STREAM_WINDOW_MS / 1000);
//@ chunk-e1rh8jg7.js:1950-2072 placement
function parseDecimalBytes(bytes) {
  let text = bytes instanceof Uint8Array ? Buffer.from(bytes).toString("latin1") : "";
  return /^\d{1,15}$/.test(text) ? Number(text) : -1;
}
//@ chunk-e1rh8jg7.js:2072-2288 placement
var PREVIEW_TUNNEL_LIVENESS_WOULD_HAVE_FIRED = "preview_tunnel_liveness_would_have_fired";
var TUNNEL_READ_CHUNK_BYTES = 32768;
var TUNNEL_MAX_BUFFERED_BYTES = 4194304;
var TUNNEL_BACKPRESSURE_BYTES = 1048576;
var TUNNEL_LIVENESS_INTERVAL_MS = 50;
var TUNNEL_ABORT_TIMEOUT_MS = 30000;
var TUNNEL_CONTROL_STATUS_PATH = "/__control/status";
var TUNNEL_CONNECT_TIMEOUT_MS = 2000;
var SENSITIVE_HEADER_NAMES = new Set(["cookie", "authorization", "proxy-authorization", "referer"]);
var TUNNEL_REQUEST_TIMEOUT_MS = 1e4;
var MAX_TUNNEL_RECONNECT_ATTEMPTS = 8;
var MAX_TUNNEL_HEADER_BYTES = 64;
//@ chunk-e1rh8jg7.js:2288-2356 placement
function tunnelProxyUrl(apiBaseUrl) {
  return apiBaseUrl.replace(/^http/, "ws").replace(/\/+$/, "") + TUNNEL_PROXY_METHOD;
}
//@ chunk-e1rh8jg7.js:2356-2520 placement
function getTokenSessionId(accessToken, sessionId) {
  let payload = decodeJwtPayload(accessToken);
  if (
    payload !== null &&
    typeof payload === "object" &&
    "session_id" in payload &&
    typeof payload.session_id === "string" &&
    payload.session_id.length > 0
  )
    return payload.session_id;
  return sessionId;
}
//@ chunk-e1rh8jg7.js:2520-2656 placement
var WRONG_SESSION_MESSAGE = "tunnel request does not name this session";
var TOKEN_SESSION_MISMATCH_MESSAGE =
  "the newest token names another session than the one this tunnel was started for";
//@ chunk-e1rh8jg7.js:2656-2832 placement
function hasLoopbackHostHeader(headers, port) {
  if (!Array.isArray(headers)) return false;
  let filtered = headers.filter(
    (header) => typeof header?.name === "string" && header.name.toLowerCase() === "host",
  );
  return filtered.length === 1 && filtered[0].value === `127.0.0.1:${port}`;
}
//@ chunk-e1rh8jg7.js:2832-2920 placement
function sameSessionTail(tokenSessionId, id) {
  let tailOf = (id) => id.slice(id.lastIndexOf("_") + 1);
  return tailOf(tokenSessionId) !== "" && tailOf(tokenSessionId) === tailOf(id);
}
//@ chunk-e1rh8jg7.js:2920-3187 placement
function validateTunnelTarget(port, path, allowedPorts) {
  if (typeof port !== "number" || !Number.isInteger(port) || port < 1024 || port > 65535)
    return `invalid port: ${port}`;
  if (!allowedPorts.has(port)) return `port ${port} is not one this tunnel may reach`;
  if (typeof path !== "string" || !path.startsWith("/")) return "invalid path: must start with /";
  return null;
}
//@ chunk-e1rh8jg7.js:3187-3225 placement
var RESERVED_WS_CLOSE_CODES = new Set([1004, 1005, 1006, 1015]);
//@ chunk-e1rh8jg7.js:3225-3264 placement
function cleanCloseReason(reason) {
  return replaceControlChars(reason ?? "").trim();
}
//@ chunk-e1rh8jg7.js:3264-3351 placement
function isNoLivePreviewMessage(message) {
  return message.includes("does not have live preview enabled") || message.includes(TUNNEL_PREVIEW);
}
//@ chunk-e1rh8jg7.js:3351-3375 placement
var TUNNEL_PREVIEW = "tunnel:preview";
//@ chunk-e1rh8jg7.js:3375-3495 placement
function replaceControlChars(text) {
  return text.replace(
    /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g,
    " ",
  );
}
//@ chunk-e1rh8jg7.js:3495-3581 placement
function usableCloseCode(code) {
  if (typeof code !== "number" || code < 1000 || code > 4999 || RESERVED_WS_CLOSE_CODES.has(code))
    return 1000;
  return code;
}
//@ chunk-e1rh8jg7.js:3581-3656 placement
function closeReasonWithinLimit(reason) {
  if (!reason) return "";
  return Buffer.byteLength(reason, "utf8") <= 123 ? reason : "";
}
//@ chunk-e1rh8jg7.js:3656-3898 placement
function probeLocalPort(port) {
  return new Promise((resolve) => {
    let settled = false;
    let finish = (reachable) => {
      if (settled) return;
      settled = true;
      connection.destroy();
      resolve(reachable);
    };
    let connection = net.createConnection({
      host: "127.0.0.1",
      port,
    });
    connection.setTimeout(TUNNEL_CONNECT_TIMEOUT_MS);
    connection.once("connect", () => finish(true));
    connection.once("error", () => finish(false));
    connection.once("timeout", () => finish(false));
  });
}
//@ chunk-e1rh8jg7.js:3898-15570 placement
/**
 * 建立到 CCR TunnelService 的预览隧道（gRPC 流），管理重连、请求表与日志前缀 [bridge:preview-tunnel]。
 */
function createPreviewTunnel(options) {
  let relayUrl = tunnelProxyUrl(options.apiBaseUrl);
  let { accessToken, sessionId } = options;
  let wrongSessionReported = false;
  let stopped = false;
  let socket = null;
  let livenessTimer = null;
  let reconnectTimer = null;
  let openTimer = null;
  let reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
  let connectedAt = 0;
  let lastPeerActivityAt = 0;
  let sawPong = false;
  let unansweredPings = 0;
  let bytesSent = 0;
  let bytesAtWindowStart = 0;
  let bestPeerAckBytes = 0;
  let wouldHaveFiredLogged = false;
  let consecutiveFailures = 0;
  let peerActive = false;
  let policyStopLogged = false;
  let inflightHttp = new Map();
  let wsTunnels = new Map();
  let log = (message, level = "info") =>
    logForDebugging(`[bridge:preview-tunnel] ${message}`, {
      level,
    });
  function sendFrame(frame) {
    let activeSocket = socket;
    if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return;
    try {
      let json = jsonStringify(frame);
      activeSocket.send(json);
      bytesSent += json.length;
    } catch (error) {
      log(`send failed: ${errorMessage(error)}`, "error");
    }
  }
  function sendHttpError(requestId, errorMessage) {
    sendFrame({
      httpError: {
        requestId,
        errorMessage,
      },
    });
  }
  function awaitBackpressure(signal) {
    let activeSocket = socket;
    if (
      !activeSocket ||
      activeSocket.readyState !== WebSocket.OPEN ||
      activeSocket.bufferedAmount <= TUNNEL_MAX_BUFFERED_BYTES
    )
      return Promise.resolve();
    return new Promise((resolve) => {
      let interval = setInterval(() => {
        if (
          stopped ||
          signal.aborted ||
          socket !== activeSocket ||
          activeSocket.readyState !== WebSocket.OPEN ||
          activeSocket.bufferedAmount <= TUNNEL_BACKPRESSURE_BYTES
        ) {
          clearInterval(interval);
          resolve();
        }
      }, TUNNEL_LIVENESS_INTERVAL_MS);
    });
  }
  async function handleControlStatus(requestId, httpRequest, unlistedPortProbe) {
    let port = 0;
    try {
      let rawBody =
        httpRequest.body !== undefined && httpRequest.body !== ""
          ? Buffer.from(httpRequest.body, "base64").toString("utf8")
          : "{}";
      let parsed = jsonParse(rawBody);
      if (parsed !== null && typeof parsed.port === "number") port = parsed.port;
    } catch (error) {
      log(`control/status: bad body: ${errorMessage(error)}`, "error");
    }
    let permitted = Number.isInteger(port) && port >= 1024 && port <= 65535 && options.allowedPorts.has(port);
    let listening = permitted ? await probeLocalPort(port) : false;
    log(`control/status port=${port} permitted=${permitted} listening=${listening}`);
    sendFrame({
      httpHeaders: {
        requestId,
        statusCode: 200,
        statusText: "OK",
        headers: [
          {
            name: "Content-Type",
            value: "application/x-ndjson",
          },
        ],
        sequenceNumber: 0,
      },
    });
    let resultLine =
      jsonStringify({
        type: "result",
        status: 200,
        data: {
          listening,
          port,
        },
      }) +
      `
`;
    sendFrame({
      httpChunk: {
        requestId,
        data: Buffer.from(resultLine, "utf8").toString("base64"),
        isFinal: true,
        sequenceNumber: 1,
      },
    });
    if (!permitted && unlistedPortProbe && Number.isInteger(port) && port >= 1024 && port <= 65535)
      Promise.resolve()
        .then(() => (stopped ? undefined : options.onUnlistedPortProbed?.(port)))
        .catch((error) =>
          log(`control/status: onUnlistedPortProbed failed: ${errorMessage(error)}`, "error"),
        );
  }
  async function handleHttpRequest(httpRequest, unlistedPortProbe) {
    let requestId = httpRequest.requestId;
    if (!requestId) return;
    if (
      options.toolServer === undefined &&
      httpRequest.port === 0 &&
      httpRequest.path === TUNNEL_CONTROL_STATUS_PATH &&
      (httpRequest.method ?? "").toUpperCase() === "POST"
    ) {
      await handleControlStatus(requestId, httpRequest, unlistedPortProbe);
      return;
    }
    let refusal = validateTunnelTarget(httpRequest.port, httpRequest.path, options.allowedPorts);
    if (refusal) {
      sendHttpError(requestId, refusal);
      return;
    }
    let { port, path } = httpRequest;
    let method = httpRequest.method ?? "GET";
    if (port === options.toolServer?.port && !hasLoopbackHostHeader(httpRequest.headers, port)) {
      sendHttpError(requestId, `Host is not 127.0.0.1:${port}, which CCR's route to the tool server sends`);
      return;
    }
    let abortController = new AbortController();
    inflightHttp.set(requestId, abortController);
    let timer = setTimeout((controller) => controller.abort(), TUNNEL_ABORT_TIMEOUT_MS, abortController);
    let response;
    try {
      let headers = new Headers();
      for (let header of httpRequest.headers ?? []) {
        if (!header.name || SENSITIVE_HEADER_NAMES.has(header.name.toLowerCase())) continue;
        headers.append(header.name, header.value ?? "");
      }
      headers.set("Host", `127.0.0.1:${port}`);
      if (port === options.toolServer?.port)
        headers.set("Authorization", `Bearer ${options.toolServer.authToken}`);
      let body =
        httpRequest.body !== undefined && httpRequest.body !== ""
          ? Buffer.from(httpRequest.body, "base64")
          : undefined;
      if (port === options.toolServer?.port)
        response = await relayPreviewRequestNoRetry(port, path, {
          method,
          headers,
          body,
          signal: abortController.signal,
        });
      else {
        let url = new URL(`http://127.0.0.1:${port}${path}`);
        response = await relayPreviewRequestWithRetry(port, url.pathname + url.search, {
          method,
          headers,
          body,
          signal: abortController.signal,
        });
      }
    } catch (error) {
      clearTimeout(timer);
      inflightHttp.delete(requestId);
      sendHttpError(requestId, errorMessage(error));
      return;
    }
    clearTimeout(timer);
    let responseHeaders = [];
    response.headers.forEach((value, name) => {
      responseHeaders.push({
        name,
        value,
      });
    });
    let sequenceNumber = 0;
    sendFrame({
      httpHeaders: {
        requestId,
        statusCode: response.status,
        statusText: response.statusText || String(response.status),
        headers: responseHeaders,
        sequenceNumber,
      },
    });
    sequenceNumber++;
    try {
      if (response.body) {
        let reader = response.body.getReader();
        for (;;) {
          await awaitBackpressure(abortController.signal);
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
          let read = await reader.read();
          if (read.value && read.value.length > 0)
            for (let offset = 0; offset < read.value.length; offset += TUNNEL_READ_CHUNK_BYTES) {
              let chunk = read.value.subarray(offset, offset + TUNNEL_READ_CHUNK_BYTES);
              sendFrame({
                httpChunk: {
                  requestId,
                  data: Buffer.from(chunk).toString("base64"),
                  isFinal: false,
                  sequenceNumber,
                },
              });
              sequenceNumber++;
            }
          if (read.done) break;
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
        }
      }
      sendFrame({
        httpChunk: {
          requestId,
          data: "",
          isFinal: true,
          sequenceNumber,
        },
      });
    } catch (error) {
      sendHttpError(requestId, `error reading response body: ${errorMessage(error)}`);
    } finally {
      inflightHttp.delete(requestId);
    }
  }
  function sendWsError(tunnelId, errorMessage) {
    sendFrame({
      wsError: {
        tunnelId,
        errorMessage,
      },
    });
  }
  function closeTunnel(tunnelId, outcome) {
    let tunnel = wsTunnels.get(tunnelId);
    if (!tunnel) return;
    wsTunnels.delete(tunnelId);
    if (tunnel.dialTimer) {
      clearTimeout(tunnel.dialTimer);
      tunnel.dialTimer = null;
    }
    tunnel.abort.abort();
    tunnel.pending.length = 0;
    if (!tunnel.terminated && outcome) {
      tunnel.terminated = true;
      if ("error" in outcome) sendWsError(tunnelId, outcome.error);
      else
        sendFrame({
          wsClose: {
            tunnelId,
            ...outcome.close,
          },
        });
    }
    try {
      tunnel.sock.close();
    } catch {}
  }
  async function flushTunnel(tunnelId) {
    let tunnel = wsTunnels.get(tunnelId);
    if (!tunnel || tunnel.flushing) return;
    tunnel.flushing = true;
    try {
      while (tunnel.pending.length > 0 && wsTunnels.get(tunnelId) === tunnel) {
        await awaitBackpressure(tunnel.abort.signal);
        if (tunnel.abort.signal.aborted || wsTunnels.get(tunnelId) !== tunnel) return;
        let frame = tunnel.pending.shift();
        if (frame) sendFrame(frame);
      }
    } finally {
      tunnel.flushing = false;
    }
  }
  function openTunnel(wsOpen) {
    let tunnelId = wsOpen.tunnelId;
    if (!tunnelId) return;
    if (!options.isHmrEnabled?.()) {
      sendWsError(tunnelId, "WebSocket tunnel is not enabled for this session");
      return;
    }
    closeTunnel(tunnelId);
    if (wsTunnels.size >= MAX_TUNNEL_RECONNECT_ATTEMPTS) {
      sendWsError(tunnelId, `too many concurrent WebSocket tunnels (max ${MAX_TUNNEL_RECONNECT_ATTEMPTS})`);
      return;
    }
    let refusal = validateTunnelTarget(wsOpen.port, wsOpen.path, options.allowedPorts);
    if (refusal) {
      sendWsError(tunnelId, refusal);
      return;
    }
    let { port, path } = wsOpen;
    let skippedHeaders = new Set([
      "host",
      "connection",
      "upgrade",
      "sec-websocket-key",
      "sec-websocket-version",
      "sec-websocket-protocol",
      "sec-websocket-extensions",
    ]);
    let dialHeaders = {};
    for (let header of wsOpen.headers ?? []) {
      if (!header.name) continue;
      let value = header.value ?? "";
      if (/[\r\n\0]/.test(header.name) || /[\r\n\0]/.test(value)) continue;
      let lower = header.name.toLowerCase();
      if (SENSITIVE_HEADER_NAMES.has(lower) || skippedHeaders.has(lower)) continue;
      dialHeaders[header.name] = value;
    }
    let protocols = (wsOpen.protocols ?? []).filter((protocol) => !/[\r\n\0]/.test(protocol));
    let socket;
    try {
      socket = new globalThis.WebSocket(`ws://127.0.0.1:${port}${path}`, {
        headers: dialHeaders,
        protocols,
      });
    } catch (error) {
      sendWsError(tunnelId, `WebSocket dial failed: ${errorMessage(error)}`);
      return;
    }
    socket.binaryType = "arraybuffer";
    let abortController = new AbortController();
    let tunnel = {
      sock: socket,
      abort: abortController,
      dialTimer: null,
      nextSeq: 0,
      pending: [],
      flushing: false,
      terminated: false,
    };
    wsTunnels.set(tunnelId, tunnel);
    tunnel.dialTimer = setTimeout(
      (tunnel) => {
        tunnel.abort.abort();
        try {
          tunnel.sock.close();
        } catch {}
      },
      TUNNEL_REQUEST_TIMEOUT_MS,
      tunnel,
    );
    abortController.signal.addEventListener(
      "abort",
      () => {
        if (wsTunnels.get(tunnelId) !== tunnel) return;
        socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
        closeTunnel(tunnelId, {
          error: `WebSocket dial to 127.0.0.1:${port} timed out`,
        });
      },
      {
        once: true,
      },
    );
    socket.onopen = () => {
      if (tunnel.dialTimer) {
        clearTimeout(tunnel.dialTimer);
        tunnel.dialTimer = null;
      }
      if (wsTunnels.get(tunnelId) !== tunnel) return;
      sendFrame({
        wsOpened: {
          tunnelId,
          protocol: socket.protocol ?? "",
        },
      });
      log(`ws tunnel opened id=${tunnelId} port=${port}`);
    };
    socket.onmessage = (event) => {
      if (wsTunnels.get(tunnelId) !== tunnel || tunnel.terminated) return;
      let dataB64;
      let isBinary;
      if (typeof event.data === "string") {
        dataB64 = Buffer.from(event.data, "utf8").toString("base64");
        isBinary = false;
      } else if (event.data instanceof ArrayBuffer) {
        dataB64 = Buffer.from(event.data).toString("base64");
        isBinary = true;
      } else {
        log(`ws tunnel ${tunnelId}: dropping unsupported message type`, "error");
        return;
      }
      tunnel.nextSeq++;
      tunnel.pending.push({
        wsMessage: {
          tunnelId,
          data: dataB64,
          isBinary,
          sequenceNumber: tunnel.nextSeq,
        },
      });
      if (tunnel.pending.length > MAX_TUNNEL_HEADER_BYTES) {
        closeTunnel(tunnelId, {
          error: "backpressure queue overflow; closing WebSocket tunnel",
        });
        return;
      }
      flushTunnel(tunnelId).catch((error) => log(`ws flush failed: ${errorMessage(error)}`, "error"));
    };
    socket.onerror = () => {};
    socket.onclose = (closeEvent) => {
      let dialPending = tunnel.dialTimer != null;
      if (tunnel.dialTimer) {
        clearTimeout(tunnel.dialTimer);
        tunnel.dialTimer = null;
      }
      if (wsTunnels.get(tunnelId) !== tunnel) return;
      if (dialPending) {
        closeTunnel(tunnelId, {
          error: `WebSocket dial to 127.0.0.1:${port} failed (close code ${closeEvent.code})`,
        });
        return;
      }
      closeTunnel(tunnelId, {
        close: {
          code: usableCloseCode(closeEvent.code),
          reason: closeReasonWithinLimit(closeEvent.reason),
        },
      });
    };
  }
  function wsMessage(wsMessage) {
    let tunnelId = wsMessage.tunnelId;
    if (!tunnelId) return;
    let tunnel = wsTunnels.get(tunnelId);
    if (!tunnel || tunnel.sock.readyState !== WebSocket.OPEN) return;
    try {
      let buffer = Buffer.from(wsMessage.data ?? "", "base64");
      if (wsMessage.isBinary) tunnel.sock.send(buffer);
      else tunnel.sock.send(buffer.toString("utf8"));
    } catch (error) {
      closeTunnel(tunnelId, {
        error: `write to local WebSocket failed: ${errorMessage(error)}`,
      });
    }
  }
  function wsClose(wsClose) {
    let tunnelId = wsClose.tunnelId;
    if (!tunnelId) return;
    let tunnel = wsTunnels.get(tunnelId);
    if (!tunnel) return;
    tunnel.terminated = true;
    wsTunnels.delete(tunnelId);
    if (tunnel.dialTimer) {
      clearTimeout(tunnel.dialTimer);
      tunnel.dialTimer = null;
    }
    tunnel.abort.abort();
    tunnel.pending.length = 0;
    try {
      tunnel.sock.close(usableCloseCode(wsClose.code), closeReasonWithinLimit(wsClose.reason));
    } catch {
      try {
        tunnel.sock.close();
      } catch {}
    }
  }
  function closeAllTunnels() {
    for (let key of [...wsTunnels.keys()]) closeTunnel(key);
  }
  function handleRequest(raw) {
    let request;
    try {
      request = jsonParse(raw);
    } catch (error) {
      log(`failed to parse tunnel request: ${errorMessage(error)}`, "error");
      return;
    }
    if (typeof request !== "object" || request === null) {
      log("tunnel request is not an object", "error");
      return;
    }
    let enforceSession = options.toolServer !== undefined || options.refusesOtherSessions === true;
    let sameSession = typeof request.sessionId === "string" && sameSessionTail(request.sessionId, sessionId);
    if (!sameSession) {
      if (!wrongSessionReported) {
        wrongSessionReported = true;
        log(`${WRONG_SESSION_MESSAGE}; ${enforceSession ? "refused" : "served all the same"}`, "error");
        logEvent("tengu_preview_tunnel_other_session", {
          enforce: enforceSession,
        });
      }
      if (enforceSession) {
        if (request.httpRequest?.requestId)
          sendHttpError(request.httpRequest.requestId, WRONG_SESSION_MESSAGE);
        else if (request.wsOpen?.tunnelId) sendWsError(request.wsOpen.tunnelId, WRONG_SESSION_MESSAGE);
        return;
      }
    }
    if (request.httpRequest)
      handleHttpRequest(request.httpRequest, sameSession).catch((error) =>
        log(`handleHttpRequest failed: ${errorMessage(error)}`, "error"),
      );
    else if (request.httpCancel) {
      let requestId = request.httpCancel.requestId;
      if (requestId) {
        inflightHttp.get(requestId)?.abort();
        inflightHttp.delete(requestId);
      }
    } else if (request.wsOpen) openTunnel(request.wsOpen);
    else if (request.wsMessage) wsMessage(request.wsMessage);
    else if (request.wsClose) wsClose(request.wsClose);
    else if (request.ptyOpen)
      sendFrame({
        ptyError: {
          tunnelId: request.ptyOpen.tunnelId ?? "",
          errorMessage: "PTY tunnel not supported by bridge worker",
        },
      });
  }
  function failPermanently(message, kind) {
    if (stopped) return;
    stopped = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    log(`permanent failure (${kind}): ${message}`, "error");
    logEvent("tengu_preview_tunnel_permanent_failure", {
      consecutive_failures: consecutiveFailures,
      policy_refusal: kind === "policy" && message !== TOKEN_SESSION_MISMATCH_MESSAGE,
      own_refusal: message === TOKEN_SESSION_MISMATCH_MESSAGE,
    });
    options.onPermanentFailure?.(message, kind);
  }
  function noteFailure() {
    consecutiveFailures++;
    if (options.onPermanentFailure && consecutiveFailures >= MAX_RECONNECT_ATTEMPTS) {
      failPermanently(
        `${consecutiveFailures} consecutive failed or short-lived ` +
          "connections \u2014 relay unreachable or refusing",
        "exhausted",
      );
      return true;
    }
    return false;
  }
  function scheduleReconnect() {
    if (stopped) return;
    if (connectedAt > 0 && Date.now() - connectedAt > RECONNECT_MAX_DELAY_MS)
      reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
    connectedAt = 0;
    peerActive = false;
    let delayMs = reconnectDelayMs + Math.floor(Math.random() * (reconnectDelayMs / 2));
    log(`reconnecting in ${delayMs}ms`);
    reconnectTimer = setTimeout(connect, delayMs);
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_DELAY_MS);
  }
  function teardownSocket(closingSocket) {
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
    if (livenessTimer) {
      clearInterval(livenessTimer);
      livenessTimer = null;
    }
    for (let controller of inflightHttp.values()) controller.abort();
    inflightHttp.clear();
    closeAllTunnels();
    if (socket === closingSocket) socket = null;
  }
  function forceReconnectSocket(socket, reason) {
    log(`${reason}; forcing reconnect`, "error");
    socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
    teardownSocket(socket);
    try {
      let terminate = socket.terminate;
      if (typeof terminate === "function") terminate.call(socket);
      else socket.close();
    } catch {}
    scheduleReconnect();
  }
  function connect() {
    if (stopped) return;
    reconnectTimer = null;
    let tokenSessionId = getTokenSessionId(accessToken, options.sessionId);
    if (options.refusesOtherSessions === true && !sameSessionTail(tokenSessionId, options.sessionId)) {
      failPermanently(TOKEN_SESSION_MISMATCH_MESSAGE, "policy");
      return;
    }
    sessionId = tokenSessionId;
    let headers = {
      Authorization: `Bearer ${accessToken}`,
      "x-session-id": sessionId,
      ...(options.toolServer && {
        "x-tunnel-peer": "tool-server",
      }),
    };
    let newSocket;
    try {
      newSocket = new globalThis.WebSocket(relayUrl, {
        headers,
        proxy: getWebSocketProxyUrl(relayUrl),
        tls:
          options.toolServer || options.refusesOtherSessions === true
            ? {
                ...getWebSocketTLSOptions(undefined),
                rejectUnauthorized: true,
              }
            : getWebSocketTLSOptions(undefined) || undefined,
      });
    } catch (error) {
      log(`WebSocket construct failed: ${errorMessage(error)}`, "error");
      if (noteFailure()) return;
      scheduleReconnect();
      return;
    }
    socket = newSocket;
    openTimer = setTimeout(
      (timedOutSocket) => {
        log("open timeout; retrying", "error");
        timedOutSocket.onopen =
          timedOutSocket.onmessage =
          timedOutSocket.onerror =
          timedOutSocket.onclose =
            null;
        try {
          timedOutSocket.close();
        } catch {}
        if (socket === timedOutSocket) socket = null;
        if (noteFailure()) return;
        scheduleReconnect();
      },
      REQUEST_TIMEOUT_MS,
      newSocket,
    );
    newSocket.onopen = () => {
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      log(`connected session=${options.sessionId}`);
      connectedAt = Date.now();
      lastPeerActivityAt = Date.now();
      sawPong = false;
      unansweredPings = 0;
      bytesSent = 0;
      bytesAtWindowStart = 0;
      bestPeerAckBytes = 0;
      wouldHaveFiredLogged = false;
      peerActive = false;
      let socket = newSocket;
      socket.addEventListener?.("ping", () => {
        lastPeerActivityAt = Date.now();
        peerActive = true;
      });
      socket.addEventListener?.("pong", (event) => {
        lastPeerActivityAt = Date.now();
        peerActive = true;
        sawPong = true;
        unansweredPings = 0;
        let decimalBytes = parseDecimalBytes(event?.data);
        if (decimalBytes > bestPeerAckBytes && decimalBytes <= bytesSent) bestPeerAckBytes = decimalBytes;
      });
      livenessTimer = setInterval(() => {
        if (newSocket.readyState !== WebSocket.OPEN) return;
        if (
          options.livenessEnforce &&
          options.quietLivenessPings !== undefined &&
          (sawPong || options.toolServer !== undefined) &&
          unansweredPings >=
            Math.max(
              options.quietLivenessPings,
              options.toolServer === undefined || Date.now() - lastPeerActivityAt < STREAM_WINDOW_MS
                ? (bytesAtWindowStart - bestPeerAckBytes) / WINDOW_BYTE_BUDGET
                : 0,
            )
        ) {
          logEvent("tengu_preview_tunnel_liveness_enforced_reconnect", {
            idle_ms: unansweredPings * STREAM_WINDOW_MS,
            quiet: true,
          });
          forceReconnectSocket(
            newSocket,
            `${unansweredPings} pings in a row unanswered (liveness deadline exceeded)`,
          );
          return;
        }
        if (Date.now() - lastPeerActivityAt > (options.livenessDeadlineMs ?? IDLE_TIMEOUT_MS)) {
          if (options.livenessEnforce) {
            let idleMs = Date.now() - lastPeerActivityAt;
            logEvent("tengu_preview_tunnel_liveness_enforced_reconnect", {
              idle_ms: idleMs,
            });
            forceReconnectSocket(newSocket, `no peer activity for ${idleMs}ms (liveness deadline exceeded)`);
            return;
          }
          if (!wouldHaveFiredLogged) {
            let idleMs = Date.now() - lastPeerActivityAt;
            log(
              `${PREVIEW_TUNNEL_LIVENESS_WOULD_HAVE_FIRED}: no peer activity for ${idleMs}ms (liveness deadline exceeded; observe-only, not reconnecting)`,
              "error",
            );
            logEvent("tengu_preview_tunnel_liveness_would_have_fired", {
              idle_ms: idleMs,
              enforce: false,
            });
            wouldHaveFiredLogged = true;
          }
        } else wouldHaveFiredLogged = false;
        if (options.quietLivenessPings === undefined) {
          socket.ping?.();
          return;
        }
        if (unansweredPings === 0) bytesAtWindowStart = bytesSent;
        unansweredPings++;
        socket.ping?.(String(bytesSent));
      }, STREAM_WINDOW_MS);
    };
    newSocket.onmessage = (event) => {
      lastPeerActivityAt = Date.now();
      peerActive = true;
      let text = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8");
      handleRequest(text);
    };
    newSocket.onerror = (event) => {
      log(
        `error: ${"message" in event && typeof event.message === "string" ? event.message : "unknown"}`,
        "error",
      );
    };
    newSocket.onclose = (event) => {
      let closeReason = cleanCloseReason(event.reason);
      log(`closed code=${event.code} reason=${closeReason || "(none)"}`);
      teardownSocket(newSocket);
      let wasHealthy = peerActive || (connectedAt > 0 && Date.now() - connectedAt >= CONNECT_TIMEOUT_MS);
      if (wasHealthy) {
        consecutiveFailures = 0;
        policyStopLogged = false;
      }
      if (event.code === 1008 && isNoLivePreviewMessage(closeReason)) {
        if (options.policyStopEnforce) {
          failPermanently(
            `relay refused with close code 1008 (policy violation): ${closeReason || "(no reason)"} \u2014 not retrying`,
            "policy",
          );
          return;
        }
        if (!policyStopLogged) {
          policyStopLogged = true;
          log(
            `POLICY_STOP_WOULD_HAVE_FIRED: capability-refusal 1008 (${closeReason || "(no reason)"}); observe-only, retrying`,
            "error",
          );
          logEvent("tengu_preview_tunnel_policy_stop_would_have_fired", {
            enforce: false,
          });
        }
      }
      if (!wasHealthy && noteFailure()) return;
      scheduleReconnect();
    };
  }
  log(`starting session=${options.sessionId} url=${relayUrl}`);
  connect();
  return {
    updateAccessToken(token) {
      accessToken = token;
    },
    forceReconnect() {
      if (stopped || socket === null) return;
      forceReconnectSocket(socket, "caller requested");
    },
    stop() {
      if (stopped) return;
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      if (livenessTimer) {
        clearInterval(livenessTimer);
        livenessTimer = null;
      }
      for (let controller of inflightHttp.values()) controller.abort();
      inflightHttp.clear();
      closeAllTunnels();
      try {
        socket?.close();
      } catch {}
      socket = null;
      log(`stopped session=${options.sessionId}`);
    },
  };
}
export { createPreviewTunnel };

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
function relayPreviewRequestNoRetry(port, path, l) {
  return relayPreviewRequestToHost("127.0.0.1", port, path, l);
}
//@ chunk-e1rh8jg7.js:542-593 placement
function relayPreviewRequestWithRetry(port, path, l) {
  return relayPreviewRequest("127.0.0.1", port, path, l, true);
}
//@ chunk-e1rh8jg7.js:593-636 placement
function relayPreviewRequestToHost(host, port, path, p) {
  return relayPreviewRequest(host, port, path, p, false);
}
//@ chunk-e1rh8jg7.js:636-1282 placement
/**
 * 经预览隧道转发一次 HTTP 请求：只允许 POST/GET/DELETE，拒绝 CONNECT，剥离逐跳头。
 */
function relayPreviewRequest(host, port, path, { method, headers, body, signal }, N) {
  let upper = method.toUpperCase();
  if (!N && !ALLOWED_TUNNEL_METHODS.has(upper))
    return Promise.reject(Error("only POST, GET and DELETE are relayed"));
  if (upper === "CONNECT") return Promise.reject(Error("CONNECT is not relayed"));
  for (let A of ["content-length", "transfer-encoding", "connection"]) headers.delete(A);
  let v = N || upper === "POST" ? body : undefined;
  if (N && v !== undefined) headers.set("content-length", String(v.length));
  return new Promise((resolve, reject) => {
    let k = request(
      {
        host,
        port,
        path,
        method: upper,
        headers: Object.fromEntries(headers),
        signal,
        agent: false,
      },
      (x) => {
        try {
          resolve(responseFromTunnelReply(x));
        } catch (error) {
          x.destroy();
          reject(error);
        }
      },
    );
    k.once("error", reject);
    k.once("close", () => reject(Error("closed unanswered")));
    k.end(v);
  });
}
//@ chunk-e1rh8jg7.js:1282-1617 placement
/**
 * 把隧道返回的原始响应（状态码、rawHeaders、body 流）组装成 fetch Response。
 */
function responseFromTunnelReply(n) {
  if (n.statusCode === undefined || n.statusCode < 200) throw Error("no final status");
  let headers = new Headers();
  for (let h = 0; h + 1 < n.rawHeaders.length; h += 2) headers.append(n.rawHeaders[h], n.rawHeaders[h + 1]);
  let l = NO_BODY_HTTP_STATUSES.has(n.statusCode ?? 0);
  let response = new Response(l ? null : asyncIterableToStream(n), {
    status: n.statusCode,
    statusText: n.statusMessage,
    headers,
  });
  if (l) n.resume();
  return response;
}
//@ chunk-e1rh8jg7.js:1617-1808 placement
function asyncIterableToStream(n) {
  let u = n[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(l) {
      let p = await u.next();
      if (p.done) l.close();
      else l.enqueue(p.value);
    },
    async cancel() {
      await u.return?.();
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
function parseDecimalBytes(n) {
  let u = n instanceof Uint8Array ? Buffer.from(n).toString("latin1") : "";
  return /^\d{1,15}$/.test(u) ? Number(u) : -1;
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
  let l = decodeJwtPayload(accessToken);
  if (
    l !== null &&
    typeof l === "object" &&
    "session_id" in l &&
    typeof l.session_id === "string" &&
    l.session_id.length > 0
  )
    return l.session_id;
  return sessionId;
}
//@ chunk-e1rh8jg7.js:2520-2656 placement
var WRONG_SESSION_MESSAGE = "tunnel request does not name this session";
var TOKEN_SESSION_MISMATCH_MESSAGE =
  "the newest token names another session than the one this tunnel was started for";
//@ chunk-e1rh8jg7.js:2656-2832 placement
function hasLoopbackHostHeader(headers, port) {
  if (!Array.isArray(headers)) return false;
  let filtered = headers.filter((p) => typeof p?.name === "string" && p.name.toLowerCase() === "host");
  return filtered.length === 1 && filtered[0].value === `127.0.0.1:${port}`;
}
//@ chunk-e1rh8jg7.js:2832-2920 placement
function sameSessionTail(n, sessionId) {
  let l = (p) => p.slice(p.lastIndexOf("_") + 1);
  return l(n) !== "" && l(n) === l(sessionId);
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
function isNoLivePreviewMessage(n) {
  return n.includes("does not have live preview enabled") || n.includes(TUNNEL_PREVIEW);
}
//@ chunk-e1rh8jg7.js:3351-3375 placement
var TUNNEL_PREVIEW = "tunnel:preview";
//@ chunk-e1rh8jg7.js:3375-3495 placement
function replaceControlChars(n) {
  return n.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, " ");
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
    let l = false;
    let p = (R) => {
      if (l) return;
      l = true;
      connection.destroy();
      resolve(R);
    };
    let connection = net.createConnection({
      host: "127.0.0.1",
      port,
    });
    connection.setTimeout(TUNNEL_CONNECT_TIMEOUT_MS);
    connection.once("connect", () => p(true));
    connection.once("error", () => p(false));
    connection.once("timeout", () => p(false));
  });
}
//@ chunk-e1rh8jg7.js:3898-15570 placement
/**
 * 建立到 CCR TunnelService 的预览隧道（gRPC 流），管理重连、请求表与日志前缀 [bridge:preview-tunnel]。
 */
function createPreviewTunnel(n) {
  let u = tunnelProxyUrl(n.apiBaseUrl);
  let { accessToken, sessionId } = n;
  let h = false;
  let R = false;
  let w = null;
  let N = null;
  let P = null;
  let v = null;
  let A = RECONNECT_BASE_DELAY_MS;
  let C = 0;
  let k = 0;
  let x = false;
  let M = 0;
  let U = 0;
  let K = 0;
  let j = 0;
  let V = false;
  let F = 0;
  let H = false;
  let X = false;
  let L = new Map();
  let S = new Map();
  let g = (r, level = "info") =>
    logForDebugging(`[bridge:preview-tunnel] ${r}`, {
      level,
    });
  function O(r) {
    let e = w;
    if (!e || e.readyState !== WebSocket.OPEN) return;
    try {
      let o = jsonStringify(r);
      e.send(o);
      U += o.length;
    } catch (error) {
      g(`send failed: ${errorMessage(error)}`, "error");
    }
  }
  function G(requestId, errorMessage) {
    O({
      httpError: {
        requestId,
        errorMessage,
      },
    });
  }
  function re(signal) {
    let e = w;
    if (!e || e.readyState !== WebSocket.OPEN || e.bufferedAmount <= TUNNEL_MAX_BUFFERED_BYTES)
      return Promise.resolve();
    return new Promise((resolve) => {
      let interval = setInterval(() => {
        if (
          R ||
          signal.aborted ||
          w !== e ||
          e.readyState !== WebSocket.OPEN ||
          e.bufferedAmount <= TUNNEL_BACKPRESSURE_BYTES
        ) {
          clearInterval(interval);
          resolve();
        }
      }, TUNNEL_LIVENESS_INTERVAL_MS);
    });
  }
  async function Se(requestId, e, o) {
    let port = 0;
    try {
      let T = e.body !== undefined && e.body !== "" ? Buffer.from(e.body, "base64").toString("utf8") : "{}";
      let b = jsonParse(T);
      if (b !== null && typeof b.port === "number") port = b.port;
    } catch (error) {
      g(`control/status: bad body: ${errorMessage(error)}`, "error");
    }
    let i = Number.isInteger(port) && port >= 1024 && port <= 65535 && n.allowedPorts.has(port);
    let E = i ? await probeLocalPort(port) : false;
    g(`control/status port=${port} permitted=${i} listening=${E}`);
    O({
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
    let q =
      jsonStringify({
        type: "result",
        status: 200,
        data: {
          listening: E,
          port,
        },
      }) +
      `
`;
    O({
      httpChunk: {
        requestId,
        data: Buffer.from(q, "utf8").toString("base64"),
        isFinal: true,
        sequenceNumber: 1,
      },
    });
    if (!i && o && Number.isInteger(port) && port >= 1024 && port <= 65535)
      Promise.resolve()
        .then(() => (R ? undefined : n.onUnlistedPortProbed?.(port)))
        .catch((error) => g(`control/status: onUnlistedPortProbed failed: ${errorMessage(error)}`, "error"));
  }
  async function Te(httpRequest, e) {
    let requestId = httpRequest.requestId;
    if (!requestId) return;
    if (
      n.toolServer === undefined &&
      httpRequest.port === 0 &&
      httpRequest.path === TUNNEL_CONTROL_STATUS_PATH &&
      (httpRequest.method ?? "").toUpperCase() === "POST"
    ) {
      await Se(requestId, httpRequest, e);
      return;
    }
    let s = validateTunnelTarget(httpRequest.port, httpRequest.path, n.allowedPorts);
    if (s) {
      G(requestId, s);
      return;
    }
    let { port, path } = httpRequest;
    let method = httpRequest.method ?? "GET";
    if (port === n.toolServer?.port && !hasLoopbackHostHeader(httpRequest.headers, port)) {
      G(requestId, `Host is not 127.0.0.1:${port}, which CCR's route to the tool server sends`);
      return;
    }
    let abortController = new AbortController();
    L.set(requestId, abortController);
    let timer = setTimeout((f) => f.abort(), TUNNEL_ABORT_TIMEOUT_MS, abortController);
    let W;
    try {
      let headers = new Headers();
      for (let I of httpRequest.headers ?? []) {
        if (!I.name || SENSITIVE_HEADER_NAMES.has(I.name.toLowerCase())) continue;
        headers.append(I.name, I.value ?? "");
      }
      headers.set("Host", `127.0.0.1:${port}`);
      if (port === n.toolServer?.port) headers.set("Authorization", `Bearer ${n.toolServer.authToken}`);
      let body =
        httpRequest.body !== undefined && httpRequest.body !== ""
          ? Buffer.from(httpRequest.body, "base64")
          : undefined;
      if (port === n.toolServer?.port)
        W = await relayPreviewRequestNoRetry(port, path, {
          method,
          headers,
          body,
          signal: abortController.signal,
        });
      else {
        let I = new URL(`http://127.0.0.1:${port}${path}`);
        W = await relayPreviewRequestWithRetry(port, I.pathname + I.search, {
          method,
          headers,
          body,
          signal: abortController.signal,
        });
      }
    } catch (error) {
      clearTimeout(timer);
      L.delete(requestId);
      G(requestId, errorMessage(error));
      return;
    }
    clearTimeout(timer);
    let m = [];
    W.headers.forEach((value, name) => {
      m.push({
        name,
        value,
      });
    });
    let c = 0;
    O({
      httpHeaders: {
        requestId,
        statusCode: W.status,
        statusText: W.statusText || String(W.status),
        headers: m,
        sequenceNumber: c,
      },
    });
    c++;
    try {
      if (W.body) {
        let reader = W.body.getReader();
        for (;;) {
          await re(abortController.signal);
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
          let y = await reader.read();
          if (y.value && y.value.length > 0)
            for (let I = 0; I < y.value.length; I += TUNNEL_READ_CHUNK_BYTES) {
              let chunk = y.value.subarray(I, I + TUNNEL_READ_CHUNK_BYTES);
              O({
                httpChunk: {
                  requestId,
                  data: Buffer.from(chunk).toString("base64"),
                  isFinal: false,
                  sequenceNumber: c,
                },
              });
              c++;
            }
          if (y.done) break;
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
        }
      }
      O({
        httpChunk: {
          requestId,
          data: "",
          isFinal: true,
          sequenceNumber: c,
        },
      });
    } catch (error) {
      G(requestId, `error reading response body: ${errorMessage(error)}`);
    } finally {
      L.delete(requestId);
    }
  }
  function B(tunnelId, errorMessage) {
    O({
      wsError: {
        tunnelId,
        errorMessage,
      },
    });
  }
  function D(tunnelId, e) {
    let o = S.get(tunnelId);
    if (!o) return;
    S.delete(tunnelId);
    if (o.dialTimer) {
      clearTimeout(o.dialTimer);
      o.dialTimer = null;
    }
    o.abort.abort();
    o.pending.length = 0;
    if (!o.terminated && e) {
      o.terminated = true;
      if ("error" in e) B(tunnelId, e.error);
      else
        O({
          wsClose: {
            tunnelId,
            ...e.close,
          },
        });
    }
    try {
      o.sock.close();
    } catch {}
  }
  async function we(tunnelId) {
    let e = S.get(tunnelId);
    if (!e || e.flushing) return;
    e.flushing = true;
    try {
      while (e.pending.length > 0 && S.get(tunnelId) === e) {
        await re(e.abort.signal);
        if (e.abort.signal.aborted || S.get(tunnelId) !== e) return;
        let o = e.pending.shift();
        if (o) O(o);
      }
    } finally {
      e.flushing = false;
    }
  }
  function _e(wsOpen) {
    let tunnelId = wsOpen.tunnelId;
    if (!tunnelId) return;
    if (!n.isHmrEnabled?.()) {
      B(tunnelId, "WebSocket tunnel is not enabled for this session");
      return;
    }
    D(tunnelId);
    if (S.size >= MAX_TUNNEL_RECONNECT_ATTEMPTS) {
      B(tunnelId, `too many concurrent WebSocket tunnels (max ${MAX_TUNNEL_RECONNECT_ATTEMPTS})`);
      return;
    }
    let o = validateTunnelTarget(wsOpen.port, wsOpen.path, n.allowedPorts);
    if (o) {
      B(tunnelId, o);
      return;
    }
    let { port, path } = wsOpen;
    let E = new Set([
      "host",
      "connection",
      "upgrade",
      "sec-websocket-key",
      "sec-websocket-version",
      "sec-websocket-protocol",
      "sec-websocket-extensions",
    ]);
    let q = {};
    for (let c of wsOpen.headers ?? []) {
      if (!c.name) continue;
      let f = c.value ?? "";
      if (/[\r\n\0]/.test(c.name) || /[\r\n\0]/.test(f)) continue;
      let lower = c.name.toLowerCase();
      if (SENSITIVE_HEADER_NAMES.has(lower) || E.has(lower)) continue;
      q[c.name] = f;
    }
    let protocols = (wsOpen.protocols ?? []).filter((c) => !/[\r\n\0]/.test(c));
    let b;
    try {
      b = new globalThis.WebSocket(`ws://127.0.0.1:${port}${path}`, {
        headers: q,
        protocols,
      });
    } catch (error) {
      B(tunnelId, `WebSocket dial failed: ${errorMessage(error)}`);
      return;
    }
    b.binaryType = "arraybuffer";
    let abortController = new AbortController();
    let m = {
      sock: b,
      abort: abortController,
      dialTimer: null,
      nextSeq: 0,
      pending: [],
      flushing: false,
      terminated: false,
    };
    S.set(tunnelId, m);
    m.dialTimer = setTimeout(
      (c) => {
        c.abort.abort();
        try {
          c.sock.close();
        } catch {}
      },
      TUNNEL_REQUEST_TIMEOUT_MS,
      m,
    );
    abortController.signal.addEventListener(
      "abort",
      () => {
        if (S.get(tunnelId) !== m) return;
        b.onopen = b.onmessage = b.onerror = b.onclose = null;
        D(tunnelId, {
          error: `WebSocket dial to 127.0.0.1:${port} timed out`,
        });
      },
      {
        once: true,
      },
    );
    b.onopen = () => {
      if (m.dialTimer) {
        clearTimeout(m.dialTimer);
        m.dialTimer = null;
      }
      if (S.get(tunnelId) !== m) return;
      O({
        wsOpened: {
          tunnelId,
          protocol: b.protocol ?? "",
        },
      });
      g(`ws tunnel opened id=${tunnelId} port=${port}`);
    };
    b.onmessage = (c) => {
      if (S.get(tunnelId) !== m || m.terminated) return;
      let f;
      let y;
      if (typeof c.data === "string") {
        f = Buffer.from(c.data, "utf8").toString("base64");
        y = false;
      } else if (c.data instanceof ArrayBuffer) {
        f = Buffer.from(c.data).toString("base64");
        y = true;
      } else {
        g(`ws tunnel ${tunnelId}: dropping unsupported message type`, "error");
        return;
      }
      m.nextSeq++;
      m.pending.push({
        wsMessage: {
          tunnelId,
          data: f,
          isBinary: y,
          sequenceNumber: m.nextSeq,
        },
      });
      if (m.pending.length > MAX_TUNNEL_HEADER_BYTES) {
        D(tunnelId, {
          error: "backpressure queue overflow; closing WebSocket tunnel",
        });
        return;
      }
      we(tunnelId).catch((error) => g(`ws flush failed: ${errorMessage(error)}`, "error"));
    };
    b.onerror = () => {};
    b.onclose = (c) => {
      let f = m.dialTimer != null;
      if (m.dialTimer) {
        clearTimeout(m.dialTimer);
        m.dialTimer = null;
      }
      if (S.get(tunnelId) !== m) return;
      if (f) {
        D(tunnelId, {
          error: `WebSocket dial to 127.0.0.1:${port} failed (close code ${c.code})`,
        });
        return;
      }
      D(tunnelId, {
        close: {
          code: usableCloseCode(c.code),
          reason: closeReasonWithinLimit(c.reason),
        },
      });
    };
  }
  function ve(wsMessage) {
    let tunnelId = wsMessage.tunnelId;
    if (!tunnelId) return;
    let o = S.get(tunnelId);
    if (!o || o.sock.readyState !== WebSocket.OPEN) return;
    try {
      let buffer = Buffer.from(wsMessage.data ?? "", "base64");
      if (wsMessage.isBinary) o.sock.send(buffer);
      else o.sock.send(buffer.toString("utf8"));
    } catch (error) {
      D(tunnelId, {
        error: `write to local WebSocket failed: ${errorMessage(error)}`,
      });
    }
  }
  function Ee(wsClose) {
    let tunnelId = wsClose.tunnelId;
    if (!tunnelId) return;
    let o = S.get(tunnelId);
    if (!o) return;
    o.terminated = true;
    S.delete(tunnelId);
    if (o.dialTimer) {
      clearTimeout(o.dialTimer);
      o.dialTimer = null;
    }
    o.abort.abort();
    o.pending.length = 0;
    try {
      o.sock.close(usableCloseCode(wsClose.code), closeReasonWithinLimit(wsClose.reason));
    } catch {
      try {
        o.sock.close();
      } catch {}
    }
  }
  function oe() {
    for (let key of [...S.keys()]) D(key);
  }
  function Ie(r) {
    let e;
    try {
      e = jsonParse(r);
    } catch (error) {
      g(`failed to parse tunnel request: ${errorMessage(error)}`, "error");
      return;
    }
    if (typeof e !== "object" || e === null) {
      g("tunnel request is not an object", "error");
      return;
    }
    let o = n.toolServer !== undefined || n.refusesOtherSessions === true;
    let s = typeof e.sessionId === "string" && sameSessionTail(e.sessionId, sessionId);
    if (!s) {
      if (!h) {
        h = true;
        g(`${WRONG_SESSION_MESSAGE}; ${o ? "refused" : "served all the same"}`, "error");
        logEvent("tengu_preview_tunnel_other_session", {
          enforce: o,
        });
      }
      if (o) {
        if (e.httpRequest?.requestId) G(e.httpRequest.requestId, WRONG_SESSION_MESSAGE);
        else if (e.wsOpen?.tunnelId) B(e.wsOpen.tunnelId, WRONG_SESSION_MESSAGE);
        return;
      }
    }
    if (e.httpRequest)
      Te(e.httpRequest, s).catch((error) => g(`handleHttpRequest failed: ${errorMessage(error)}`, "error"));
    else if (e.httpCancel) {
      let requestId = e.httpCancel.requestId;
      if (requestId) {
        L.get(requestId)?.abort();
        L.delete(requestId);
      }
    } else if (e.wsOpen) _e(e.wsOpen);
    else if (e.wsMessage) ve(e.wsMessage);
    else if (e.wsClose) Ee(e.wsClose);
    else if (e.ptyOpen)
      O({
        ptyError: {
          tunnelId: e.ptyOpen.tunnelId ?? "",
          errorMessage: "PTY tunnel not supported by bridge worker",
        },
      });
  }
  function J(r, e) {
    if (R) return;
    R = true;
    if (P) {
      clearTimeout(P);
      P = null;
    }
    g(`permanent failure (${e}): ${r}`, "error");
    logEvent("tengu_preview_tunnel_permanent_failure", {
      consecutive_failures: F,
      policy_refusal: e === "policy" && r !== TOKEN_SESSION_MISMATCH_MESSAGE,
      own_refusal: r === TOKEN_SESSION_MISMATCH_MESSAGE,
    });
    n.onPermanentFailure?.(r, e);
  }
  function Q() {
    F++;
    if (n.onPermanentFailure && F >= MAX_RECONNECT_ATTEMPTS) {
      J(
        `${F} consecutive failed or short-lived ` + "connections \u2014 relay unreachable or refusing",
        "exhausted",
      );
      return true;
    }
    return false;
  }
  function Y() {
    if (R) return;
    if (C > 0 && Date.now() - C > RECONNECT_MAX_DELAY_MS) A = RECONNECT_BASE_DELAY_MS;
    C = 0;
    H = false;
    let r = A + Math.floor(Math.random() * (A / 2));
    g(`reconnecting in ${r}ms`);
    P = setTimeout(ie, r);
    A = Math.min(A * 2, RECONNECT_MAX_DELAY_MS);
  }
  function se(r) {
    if (v) {
      clearTimeout(v);
      v = null;
    }
    if (N) {
      clearInterval(N);
      N = null;
    }
    for (let e of L.values()) e.abort();
    L.clear();
    oe();
    if (w === r) w = null;
  }
  function Z(r, e) {
    g(`${e}; forcing reconnect`, "error");
    r.onopen = r.onmessage = r.onerror = r.onclose = null;
    se(r);
    try {
      let terminate = r.terminate;
      if (typeof terminate === "function") terminate.call(r);
      else r.close();
    } catch {}
    Y();
  }
  function ie() {
    if (R) return;
    P = null;
    let tokenSessionId = getTokenSessionId(accessToken, n.sessionId);
    if (n.refusesOtherSessions === true && !sameSessionTail(tokenSessionId, n.sessionId)) {
      J(TOKEN_SESSION_MISMATCH_MESSAGE, "policy");
      return;
    }
    sessionId = tokenSessionId;
    let headers = {
      Authorization: `Bearer ${accessToken}`,
      "x-session-id": sessionId,
      ...(n.toolServer && {
        "x-tunnel-peer": "tool-server",
      }),
    };
    let o;
    try {
      o = new globalThis.WebSocket(u, {
        headers,
        proxy: getWebSocketProxyUrl(u),
        tls:
          n.toolServer || n.refusesOtherSessions === true
            ? {
                ...getWebSocketTLSOptions(undefined),
                rejectUnauthorized: true,
              }
            : getWebSocketTLSOptions(undefined) || undefined,
      });
    } catch (error) {
      g(`WebSocket construct failed: ${errorMessage(error)}`, "error");
      if (Q()) return;
      Y();
      return;
    }
    w = o;
    v = setTimeout(
      (s) => {
        g("open timeout; retrying", "error");
        s.onopen = s.onmessage = s.onerror = s.onclose = null;
        try {
          s.close();
        } catch {}
        if (w === s) w = null;
        if (Q()) return;
        Y();
      },
      REQUEST_TIMEOUT_MS,
      o,
    );
    o.onopen = () => {
      if (v) {
        clearTimeout(v);
        v = null;
      }
      g(`connected session=${n.sessionId}`);
      C = Date.now();
      k = Date.now();
      x = false;
      M = 0;
      U = 0;
      K = 0;
      j = 0;
      V = false;
      H = false;
      let s = o;
      s.addEventListener?.("ping", () => {
        k = Date.now();
        H = true;
      });
      s.addEventListener?.("pong", (i) => {
        k = Date.now();
        H = true;
        x = true;
        M = 0;
        let decimalBytes = parseDecimalBytes(i?.data);
        if (decimalBytes > j && decimalBytes <= U) j = decimalBytes;
      });
      N = setInterval(() => {
        if (o.readyState !== WebSocket.OPEN) return;
        if (
          n.livenessEnforce &&
          n.quietLivenessPings !== undefined &&
          (x || n.toolServer !== undefined) &&
          M >=
            Math.max(
              n.quietLivenessPings,
              n.toolServer === undefined || Date.now() - k < STREAM_WINDOW_MS
                ? (K - j) / WINDOW_BYTE_BUDGET
                : 0,
            )
        ) {
          logEvent("tengu_preview_tunnel_liveness_enforced_reconnect", {
            idle_ms: M * STREAM_WINDOW_MS,
            quiet: true,
          });
          Z(o, `${M} pings in a row unanswered (liveness deadline exceeded)`);
          return;
        }
        if (Date.now() - k > (n.livenessDeadlineMs ?? IDLE_TIMEOUT_MS)) {
          if (n.livenessEnforce) {
            let i = Date.now() - k;
            logEvent("tengu_preview_tunnel_liveness_enforced_reconnect", {
              idle_ms: i,
            });
            Z(o, `no peer activity for ${i}ms (liveness deadline exceeded)`);
            return;
          }
          if (!V) {
            let i = Date.now() - k;
            g(
              `${PREVIEW_TUNNEL_LIVENESS_WOULD_HAVE_FIRED}: no peer activity for ${i}ms (liveness deadline exceeded; observe-only, not reconnecting)`,
              "error",
            );
            logEvent("tengu_preview_tunnel_liveness_would_have_fired", {
              idle_ms: i,
              enforce: false,
            });
            V = true;
          }
        } else V = false;
        if (n.quietLivenessPings === undefined) {
          s.ping?.();
          return;
        }
        if (M === 0) K = U;
        M++;
        s.ping?.(String(U));
      }, STREAM_WINDOW_MS);
    };
    o.onmessage = (s) => {
      k = Date.now();
      H = true;
      let i = typeof s.data === "string" ? s.data : Buffer.from(s.data).toString("utf8");
      Ie(i);
    };
    o.onerror = (s) => {
      g(`error: ${"message" in s && typeof s.message === "string" ? s.message : "unknown"}`, "error");
    };
    o.onclose = (s) => {
      let i = cleanCloseReason(s.reason);
      g(`closed code=${s.code} reason=${i || "(none)"}`);
      se(o);
      let E = H || (C > 0 && Date.now() - C >= CONNECT_TIMEOUT_MS);
      if (E) {
        F = 0;
        X = false;
      }
      if (s.code === 1008 && isNoLivePreviewMessage(i)) {
        if (n.policyStopEnforce) {
          J(
            `relay refused with close code 1008 (policy violation): ${i || "(no reason)"} \u2014 not retrying`,
            "policy",
          );
          return;
        }
        if (!X) {
          X = true;
          g(
            `POLICY_STOP_WOULD_HAVE_FIRED: capability-refusal 1008 (${i || "(no reason)"}); observe-only, retrying`,
            "error",
          );
          logEvent("tengu_preview_tunnel_policy_stop_would_have_fired", {
            enforce: false,
          });
        }
      }
      if (!E && Q()) return;
      Y();
    };
  }
  g(`starting session=${n.sessionId} url=${u}`);
  ie();
  return {
    updateAccessToken(r) {
      accessToken = r;
    },
    forceReconnect() {
      if (R || w === null) return;
      Z(w, "caller requested");
    },
    stop() {
      if (R) return;
      R = true;
      if (P) {
        clearTimeout(P);
        P = null;
      }
      if (v) {
        clearTimeout(v);
        v = null;
      }
      if (N) {
        clearInterval(N);
        N = null;
      }
      for (let r of L.values()) r.abort();
      L.clear();
      oe();
      try {
        w?.close();
      } catch {}
      w = null;
      g(`stopped session=${n.sessionId}`);
    },
  };
}
export { createPreviewTunnel };

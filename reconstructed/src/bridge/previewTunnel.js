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
var ke = new Set([204, 205, 304]),
  Ne = new Set(["POST", "GET", "DELETE"]);
//@ chunk-e1rh8jg7.js:494-542 placement
function ae(n, u, l) {
  return Oe("127.0.0.1", n, u, l);
}
//@ chunk-e1rh8jg7.js:542-593 placement
function le(n, u, l) {
  return relayPreviewRequest("127.0.0.1", n, u, l, !0);
}
//@ chunk-e1rh8jg7.js:593-636 placement
function Oe(n, u, l, p) {
  return relayPreviewRequest(n, u, l, p, !1);
}
/**
 * 经预览隧道转发一次 HTTP 请求：只允许 POST/GET/DELETE，拒绝 CONNECT，剥离逐跳头。
 */
//@ chunk-e1rh8jg7.js:636-1282 placement
function relayPreviewRequest(n, u, l, { method: method, headers: headers, body: body, signal: signal }, N) {
  let upper = method.toUpperCase();
  if (!N && !Ne.has(upper)) return Promise.reject(Error("only POST, GET and DELETE are relayed"));
  if (upper === "CONNECT") return Promise.reject(Error("CONNECT is not relayed"));
  for (let A of ["content-length", "transfer-encoding", "connection"]) headers.delete(A);
  let v = N || upper === "POST" ? body : void 0;
  if (N && v !== void 0) headers.set("content-length", String(v.length));
  return new Promise((A, C) => {
    let k = request(
      {
        host: n,
        port: u,
        path: l,
        method: upper,
        headers: Object.fromEntries(headers),
        signal: signal,
        agent: !1,
      },
      (x) => {
        try {
          A(responseFromTunnelReply(x));
        } catch (error) {
          (x.destroy(), C(error));
        }
      },
    );
    (k.once("error", C), k.once("close", () => C(Error("closed unanswered"))), k.end(v));
  });
}
/**
 * 把隧道返回的原始响应（状态码、rawHeaders、body 流）组装成 fetch Response。
 */
//@ chunk-e1rh8jg7.js:1282-1617 placement
function responseFromTunnelReply(n) {
  if (n.statusCode === void 0 || n.statusCode < 200) throw Error("no final status");
  let headers = new Headers();
  for (let h = 0; h + 1 < n.rawHeaders.length; h += 2) headers.append(n.rawHeaders[h], n.rawHeaders[h + 1]);
  let l = ke.has(n.statusCode ?? 0),
    response = new Response(l ? null : asyncIterableToStream(n), {
      status: n.statusCode,
      statusText: n.statusMessage,
      headers: headers,
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
var TUNNEL_PROXY_METHOD = "/anthropic.ccr.api.v1alpha2.tunnel.TunnelService/TunnelProxy",
  RECONNECT_BASE_DELAY_MS = 1000,
  RECONNECT_MAX_DELAY_MS = 30000,
  MAX_RECONNECT_ATTEMPTS = 10,
  CONNECT_TIMEOUT_MS = 5000,
  REQUEST_TIMEOUT_MS = 1e4,
  STREAM_WINDOW_MS = 30000,
  IDLE_TIMEOUT_MS = 75000,
  WINDOW_BYTE_BUDGET = 7168 * (STREAM_WINDOW_MS / 1000);
//@ chunk-e1rh8jg7.js:1950-2072 placement
function parseDecimalBytes(n) {
  let u = n instanceof Uint8Array ? Buffer.from(n).toString("latin1") : "";
  return /^\d{1,15}$/.test(u) ? Number(u) : -1;
}
//@ chunk-e1rh8jg7.js:2072-2288 placement
var PREVIEW_TUNNEL_LIVENESS_WOULD_HAVE_FIRED = "preview_tunnel_liveness_would_have_fired",
  fe = 32768,
  Ue = 4194304,
  Fe = 1048576,
  Ge = 50,
  je = 30000,
  Ve = "/__control/status",
  Ye = 2000,
  ge = new Set(["cookie", "authorization", "proxy-authorization", "referer"]),
  ze = 1e4,
  pe = 8,
  Ke = 64;
//@ chunk-e1rh8jg7.js:2288-2356 placement
function Xe(n) {
  return n.replace(/^http/, "ws").replace(/\/+$/, "") + TUNNEL_PROXY_METHOD;
}
//@ chunk-e1rh8jg7.js:2356-2520 placement
function getTokenSessionId(n, u) {
  let l = decodeJwtPayload(n);
  if (
    l !== null &&
    typeof l === "object" &&
    "session_id" in l &&
    typeof l.session_id === "string" &&
    l.session_id.length > 0
  )
    return l.session_id;
  return u;
}
//@ chunk-e1rh8jg7.js:2520-2656 placement
var WRONG_SESSION_MESSAGE = "tunnel request does not name this session",
  TOKEN_SESSION_MISMATCH_MESSAGE =
    "the newest token names another session than the one this tunnel was started for";
//@ chunk-e1rh8jg7.js:2656-2832 placement
function hasLoopbackHostHeader(n, u) {
  if (!Array.isArray(n)) return !1;
  let filtered = n.filter((p) => typeof p?.name === "string" && p.name.toLowerCase() === "host");
  return filtered.length === 1 && filtered[0].value === `127.0.0.1:${u}`;
}
//@ chunk-e1rh8jg7.js:2832-2920 placement
function me(n, u) {
  let l = (p) => p.slice(p.lastIndexOf("_") + 1);
  return l(n) !== "" && l(n) === l(u);
}
//@ chunk-e1rh8jg7.js:2920-3187 placement
function validateTunnelTarget(n, u, l) {
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1024 || n > 65535) return `invalid port: ${n}`;
  if (!l.has(n)) return `port ${n} is not one this tunnel may reach`;
  if (typeof u !== "string" || !u.startsWith("/")) return "invalid path: must start with /";
  return null;
}
//@ chunk-e1rh8jg7.js:3187-3225 placement
var Ze = new Set([1004, 1005, 1006, 1015]);
//@ chunk-e1rh8jg7.js:3225-3264 placement
function en(n) {
  return replaceControlChars(n ?? "").trim();
}
//@ chunk-e1rh8jg7.js:3264-3351 placement
function nn(n) {
  return n.includes("does not have live preview enabled") || n.includes(TUNNEL_PREVIEW);
}
//@ chunk-e1rh8jg7.js:3351-3375 placement
var TUNNEL_PREVIEW = "tunnel:preview";
//@ chunk-e1rh8jg7.js:3375-3495 placement
function replaceControlChars(n) {
  return n.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g, " ");
}
//@ chunk-e1rh8jg7.js:3495-3581 placement
function he(n) {
  if (typeof n !== "number" || n < 1000 || n > 4999 || Ze.has(n)) return 1000;
  return n;
}
//@ chunk-e1rh8jg7.js:3581-3656 placement
function ye(n) {
  if (!n) return "";
  return Buffer.byteLength(n, "utf8") <= 123 ? n : "";
}
//@ chunk-e1rh8jg7.js:3656-3898 placement
function probeLocalPort(n) {
  return new Promise((u) => {
    let l = !1,
      p = (R) => {
        if (l) return;
        ((l = !0), connection.destroy(), u(R));
      },
      connection = net.createConnection({ host: "127.0.0.1", port: n });
    (connection.setTimeout(Ye),
      connection.once("connect", () => p(!0)),
      connection.once("error", () => p(!1)),
      connection.once("timeout", () => p(!1)));
  });
}
/**
 * 建立到 CCR TunnelService 的预览隧道（gRPC 流），管理重连、请求表与日志前缀 [bridge:preview-tunnel]。
 */
//@ chunk-e1rh8jg7.js:3898-15570 placement
function createPreviewTunnel(n) {
  let u = Xe(n.apiBaseUrl),
    { accessToken: accessToken, sessionId: sessionId } = n,
    h = !1,
    R = !1,
    w = null,
    N = null,
    P = null,
    v = null,
    A = RECONNECT_BASE_DELAY_MS,
    C = 0,
    k = 0,
    x = !1,
    M = 0,
    U = 0,
    K = 0,
    j = 0,
    V = !1,
    F = 0,
    H = !1,
    X = !1,
    L = new Map(),
    S = new Map(),
    g = (r, e = "info") => logForDebugging(`[bridge:preview-tunnel] ${r}`, { level: e });
  function O(r) {
    let e = w;
    if (!e || e.readyState !== WebSocket.OPEN) return;
    try {
      let o = jsonStringify(r);
      (e.send(o), (U += o.length));
    } catch (error) {
      g(`send failed: ${errorMessage(error)}`, "error");
    }
  }
  function G(r, e) {
    O({ httpError: { requestId: r, errorMessage: e } });
  }
  function re(r) {
    let e = w;
    if (!e || e.readyState !== WebSocket.OPEN || e.bufferedAmount <= Ue) return Promise.resolve();
    return new Promise((o) => {
      let s = setInterval(() => {
        if (R || r.aborted || w !== e || e.readyState !== WebSocket.OPEN || e.bufferedAmount <= Fe)
          (clearInterval(s), o());
      }, Ge);
    });
  }
  async function Se(r, e, o) {
    let s = 0;
    try {
      let T = e.body !== void 0 && e.body !== "" ? Buffer.from(e.body, "base64").toString("utf8") : "{}",
        b = jsonParse(T);
      if (b !== null && typeof b.port === "number") s = b.port;
    } catch (error) {
      g(`control/status: bad body: ${errorMessage(error)}`, "error");
    }
    let i = Number.isInteger(s) && s >= 1024 && s <= 65535 && n.allowedPorts.has(s),
      E = i ? await probeLocalPort(s) : !1;
    (g(`control/status port=${s} permitted=${i} listening=${E}`),
      O({
        httpHeaders: {
          requestId: r,
          statusCode: 200,
          statusText: "OK",
          headers: [{ name: "Content-Type", value: "application/x-ndjson" }],
          sequenceNumber: 0,
        },
      }));
    let q =
      jsonStringify({ type: "result", status: 200, data: { listening: E, port: s } }) +
      `
`;
    if (
      (O({
        httpChunk: {
          requestId: r,
          data: Buffer.from(q, "utf8").toString("base64"),
          isFinal: !0,
          sequenceNumber: 1,
        },
      }),
      !i && o && Number.isInteger(s) && s >= 1024 && s <= 65535)
    )
      Promise.resolve()
        .then(() => (R ? void 0 : n.onUnlistedPortProbed?.(s)))
        .catch((T) => g(`control/status: onUnlistedPortProbed failed: ${errorMessage(T)}`, "error"));
  }
  async function Te(r, e) {
    let requestId = r.requestId;
    if (!requestId) return;
    if (
      n.toolServer === void 0 &&
      r.port === 0 &&
      r.path === Ve &&
      (r.method ?? "").toUpperCase() === "POST"
    ) {
      await Se(requestId, r, e);
      return;
    }
    let s = validateTunnelTarget(r.port, r.path, n.allowedPorts);
    if (s) {
      G(requestId, s);
      return;
    }
    let { port: port, path: path } = r,
      q = r.method ?? "GET";
    if (port === n.toolServer?.port && !hasLoopbackHostHeader(r.headers, port)) {
      G(requestId, `Host is not 127.0.0.1:${port}, which CCR's route to the tool server sends`);
      return;
    }
    let abortController = new AbortController();
    L.set(requestId, abortController);
    let b = setTimeout((f) => f.abort(), je, abortController),
      W;
    try {
      let headers = new Headers();
      for (let I of r.headers ?? []) {
        if (!I.name || ge.has(I.name.toLowerCase())) continue;
        headers.append(I.name, I.value ?? "");
      }
      if ((headers.set("Host", `127.0.0.1:${port}`), port === n.toolServer?.port))
        headers.set("Authorization", `Bearer ${n.toolServer.authToken}`);
      let y = r.body !== void 0 && r.body !== "" ? Buffer.from(r.body, "base64") : void 0;
      if (port === n.toolServer?.port)
        W = await ae(port, path, { method: q, headers: headers, body: y, signal: abortController.signal });
      else {
        let I = new URL(`http://127.0.0.1:${port}${path}`);
        W = await le(port, I.pathname + I.search, {
          method: q,
          headers: headers,
          body: y,
          signal: abortController.signal,
        });
      }
    } catch (error) {
      (clearTimeout(b), L.delete(requestId), G(requestId, errorMessage(error)));
      return;
    }
    clearTimeout(b);
    let m = [];
    W.headers.forEach((header, y) => {
      m.push({ name: y, value: header });
    });
    let c = 0;
    (O({
      httpHeaders: {
        requestId: requestId,
        statusCode: W.status,
        statusText: W.statusText || String(W.status),
        headers: m,
        sequenceNumber: c,
      },
    }),
      c++);
    try {
      if (W.body) {
        let reader = W.body.getReader();
        for (;;) {
          if ((await re(abortController.signal), abortController.signal.aborted)) {
            await reader.cancel();
            break;
          }
          let read = await reader.read();
          if (read.value && read.value.length > 0)
            for (let I = 0; I < read.value.length; I += fe) {
              let chunk = read.value.subarray(I, I + fe);
              (O({
                httpChunk: {
                  requestId: requestId,
                  data: Buffer.from(chunk).toString("base64"),
                  isFinal: !1,
                  sequenceNumber: c,
                },
              }),
                c++);
            }
          if (read.done) break;
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
        }
      }
      O({ httpChunk: { requestId: requestId, data: "", isFinal: !0, sequenceNumber: c } });
    } catch (error) {
      G(requestId, `error reading response body: ${errorMessage(error)}`);
    } finally {
      L.delete(requestId);
    }
  }
  function B(r, e) {
    O({ wsError: { tunnelId: r, errorMessage: e } });
  }
  function D(r, e) {
    let o = S.get(r);
    if (!o) return;
    if ((S.delete(r), o.dialTimer)) (clearTimeout(o.dialTimer), (o.dialTimer = null));
    if ((o.abort.abort(), (o.pending.length = 0), !o.terminated && e))
      if (((o.terminated = !0), "error" in e)) B(r, e.error);
      else O({ wsClose: { tunnelId: r, ...e.close } });
    try {
      o.sock.close();
    } catch {}
  }
  async function we(r) {
    let e = S.get(r);
    if (!e || e.flushing) return;
    e.flushing = !0;
    try {
      while (e.pending.length > 0 && S.get(r) === e) {
        if ((await re(e.abort.signal), e.abort.signal.aborted || S.get(r) !== e)) return;
        let o = e.pending.shift();
        if (o) O(o);
      }
    } finally {
      e.flushing = !1;
    }
  }
  function _e(r) {
    let tunnelId = r.tunnelId;
    if (!tunnelId) return;
    if (!n.isHmrEnabled?.()) {
      B(tunnelId, "WebSocket tunnel is not enabled for this session");
      return;
    }
    if ((D(tunnelId), S.size >= pe)) {
      B(tunnelId, `too many concurrent WebSocket tunnels (max ${pe})`);
      return;
    }
    let o = validateTunnelTarget(r.port, r.path, n.allowedPorts);
    if (o) {
      B(tunnelId, o);
      return;
    }
    let { port: port, path: path } = r,
      E = new Set([
        "host",
        "connection",
        "upgrade",
        "sec-websocket-key",
        "sec-websocket-version",
        "sec-websocket-protocol",
        "sec-websocket-extensions",
      ]),
      q = {};
    for (let c of r.headers ?? []) {
      if (!c.name) continue;
      let f = c.value ?? "";
      if (/[\r\n\0]/.test(c.name) || /[\r\n\0]/.test(f)) continue;
      let lower = c.name.toLowerCase();
      if (ge.has(lower) || E.has(lower)) continue;
      q[c.name] = f;
    }
    let filtered = (r.protocols ?? []).filter((c) => !/[\r\n\0]/.test(c)),
      b;
    try {
      b = new globalThis.WebSocket(`ws://127.0.0.1:${port}${path}`, { headers: q, protocols: filtered });
    } catch (error) {
      B(tunnelId, `WebSocket dial failed: ${errorMessage(error)}`);
      return;
    }
    b.binaryType = "arraybuffer";
    let abortController = new AbortController(),
      m = {
        sock: b,
        abort: abortController,
        dialTimer: null,
        nextSeq: 0,
        pending: [],
        flushing: !1,
        terminated: !1,
      };
    (S.set(tunnelId, m),
      (m.dialTimer = setTimeout(
        (c) => {
          c.abort.abort();
          try {
            c.sock.close();
          } catch {}
        },
        ze,
        m,
      )),
      abortController.signal.addEventListener(
        "abort",
        () => {
          if (S.get(tunnelId) !== m) return;
          ((b.onopen = b.onmessage = b.onerror = b.onclose = null),
            D(tunnelId, { error: `WebSocket dial to 127.0.0.1:${port} timed out` }));
        },
        { once: !0 },
      ),
      (b.onopen = () => {
        if (m.dialTimer) (clearTimeout(m.dialTimer), (m.dialTimer = null));
        if (S.get(tunnelId) !== m) return;
        (O({ wsOpened: { tunnelId: tunnelId, protocol: b.protocol ?? "" } }),
          g(`ws tunnel opened id=${tunnelId} port=${port}`));
      }),
      (b.onmessage = (c) => {
        if (S.get(tunnelId) !== m || m.terminated) return;
        let f, y;
        if (typeof c.data === "string") ((f = Buffer.from(c.data, "utf8").toString("base64")), (y = !1));
        else if (c.data instanceof ArrayBuffer) ((f = Buffer.from(c.data).toString("base64")), (y = !0));
        else {
          g(`ws tunnel ${tunnelId}: dropping unsupported message type`, "error");
          return;
        }
        if (
          (m.nextSeq++,
          m.pending.push({
            wsMessage: { tunnelId: tunnelId, data: f, isBinary: y, sequenceNumber: m.nextSeq },
          }),
          m.pending.length > Ke)
        ) {
          D(tunnelId, { error: "backpressure queue overflow; closing WebSocket tunnel" });
          return;
        }
        we(tunnelId).catch((I) => g(`ws flush failed: ${errorMessage(I)}`, "error"));
      }),
      (b.onerror = () => {}),
      (b.onclose = (c) => {
        let f = m.dialTimer != null;
        if (m.dialTimer) (clearTimeout(m.dialTimer), (m.dialTimer = null));
        if (S.get(tunnelId) !== m) return;
        if (f) {
          D(tunnelId, { error: `WebSocket dial to 127.0.0.1:${port} failed (close code ${c.code})` });
          return;
        }
        D(tunnelId, { close: { code: he(c.code), reason: ye(c.reason) } });
      }));
  }
  function ve(r) {
    let tunnelId = r.tunnelId;
    if (!tunnelId) return;
    let o = S.get(tunnelId);
    if (!o || o.sock.readyState !== WebSocket.OPEN) return;
    try {
      let buffer = Buffer.from(r.data ?? "", "base64");
      if (r.isBinary) o.sock.send(buffer);
      else o.sock.send(buffer.toString("utf8"));
    } catch (error) {
      D(tunnelId, { error: `write to local WebSocket failed: ${errorMessage(error)}` });
    }
  }
  function Ee(r) {
    let tunnelId = r.tunnelId;
    if (!tunnelId) return;
    let o = S.get(tunnelId);
    if (!o) return;
    if (((o.terminated = !0), S.delete(tunnelId), o.dialTimer))
      (clearTimeout(o.dialTimer), (o.dialTimer = null));
    (o.abort.abort(), (o.pending.length = 0));
    try {
      o.sock.close(he(r.code), ye(r.reason));
    } catch {
      try {
        o.sock.close();
      } catch {}
    }
  }
  function oe() {
    for (let r of [...S.keys()]) D(r);
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
    let o = n.toolServer !== void 0 || n.refusesOtherSessions === !0,
      s = typeof e.sessionId === "string" && me(e.sessionId, sessionId);
    if (!s) {
      if (!h)
        ((h = !0),
          g(`${WRONG_SESSION_MESSAGE}; ${o ? "refused" : "served all the same"}`, "error"),
          logEvent("tengu_preview_tunnel_other_session", { enforce: o }));
      if (o) {
        if (e.httpRequest?.requestId) G(e.httpRequest.requestId, WRONG_SESSION_MESSAGE);
        else if (e.wsOpen?.tunnelId) B(e.wsOpen.tunnelId, WRONG_SESSION_MESSAGE);
        return;
      }
    }
    if (e.httpRequest)
      Te(e.httpRequest, s).catch((i) => g(`handleHttpRequest failed: ${errorMessage(i)}`, "error"));
    else if (e.httpCancel) {
      let requestId = e.httpCancel.requestId;
      if (requestId) (L.get(requestId)?.abort(), L.delete(requestId));
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
    if (((R = !0), P)) (clearTimeout(P), (P = null));
    (g(`permanent failure (${e}): ${r}`, "error"),
      logEvent("tengu_preview_tunnel_permanent_failure", {
        consecutive_failures: F,
        policy_refusal: e === "policy" && r !== TOKEN_SESSION_MISMATCH_MESSAGE,
        own_refusal: r === TOKEN_SESSION_MISMATCH_MESSAGE,
      }),
      n.onPermanentFailure?.(r, e));
  }
  function Q() {
    if ((F++, n.onPermanentFailure && F >= MAX_RECONNECT_ATTEMPTS))
      return (
        J(
          `${F} consecutive failed or short-lived ` + "connections \u2014 relay unreachable or refusing",
          "exhausted",
        ),
        !0
      );
    return !1;
  }
  function Y() {
    if (R) return;
    if (C > 0 && Date.now() - C > RECONNECT_MAX_DELAY_MS) A = RECONNECT_BASE_DELAY_MS;
    ((C = 0), (H = !1));
    let r = A + Math.floor(Math.random() * (A / 2));
    (g(`reconnecting in ${r}ms`), (P = setTimeout(ie, r)), (A = Math.min(A * 2, RECONNECT_MAX_DELAY_MS)));
  }
  function se(r) {
    if (v) (clearTimeout(v), (v = null));
    if (N) (clearInterval(N), (N = null));
    for (let e of L.values()) e.abort();
    if ((L.clear(), oe(), w === r)) w = null;
  }
  function Z(r, e) {
    (g(`${e}; forcing reconnect`, "error"), (r.onopen = r.onmessage = r.onerror = r.onclose = null), se(r));
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
    let r = getTokenSessionId(accessToken, n.sessionId);
    if (n.refusesOtherSessions === !0 && !me(r, n.sessionId)) {
      J(TOKEN_SESSION_MISMATCH_MESSAGE, "policy");
      return;
    }
    sessionId = r;
    let e = {
        Authorization: `Bearer ${accessToken}`,
        "x-session-id": sessionId,
        ...(n.toolServer && { "x-tunnel-peer": "tool-server" }),
      },
      o;
    try {
      o = new globalThis.WebSocket(u, {
        headers: e,
        proxy: getWebSocketProxyUrl(u),
        tls:
          n.toolServer || n.refusesOtherSessions === !0
            ? { ...getWebSocketTLSOptions(void 0), rejectUnauthorized: !0 }
            : getWebSocketTLSOptions(void 0) || void 0,
      });
    } catch (error) {
      if ((g(`WebSocket construct failed: ${errorMessage(error)}`, "error"), Q())) return;
      Y();
      return;
    }
    ((w = o),
      (v = setTimeout(
        (s) => {
          (g("open timeout; retrying", "error"), (s.onopen = s.onmessage = s.onerror = s.onclose = null));
          try {
            s.close();
          } catch {}
          if (w === s) w = null;
          if (Q()) return;
          Y();
        },
        REQUEST_TIMEOUT_MS,
        o,
      )),
      (o.onopen = () => {
        if (v) (clearTimeout(v), (v = null));
        (g(`connected session=${n.sessionId}`),
          (C = Date.now()),
          (k = Date.now()),
          (x = !1),
          (M = 0),
          (U = 0),
          (K = 0),
          (j = 0),
          (V = !1),
          (H = !1));
        let s = o;
        (s.addEventListener?.("ping", () => {
          ((k = Date.now()), (H = !0));
        }),
          s.addEventListener?.("pong", (i) => {
            ((k = Date.now()), (H = !0), (x = !0), (M = 0));
            let E = parseDecimalBytes(i?.data);
            if (E > j && E <= U) j = E;
          }),
          (N = setInterval(() => {
            if (o.readyState !== WebSocket.OPEN) return;
            if (
              n.livenessEnforce &&
              n.quietLivenessPings !== void 0 &&
              (x || n.toolServer !== void 0) &&
              M >=
                Math.max(
                  n.quietLivenessPings,
                  n.toolServer === void 0 || Date.now() - k < STREAM_WINDOW_MS
                    ? (K - j) / WINDOW_BYTE_BUDGET
                    : 0,
                )
            ) {
              (logEvent("tengu_preview_tunnel_liveness_enforced_reconnect", {
                idle_ms: M * STREAM_WINDOW_MS,
                quiet: !0,
              }),
                Z(o, `${M} pings in a row unanswered (liveness deadline exceeded)`));
              return;
            }
            if (Date.now() - k > (n.livenessDeadlineMs ?? IDLE_TIMEOUT_MS)) {
              if (n.livenessEnforce) {
                let i = Date.now() - k;
                (logEvent("tengu_preview_tunnel_liveness_enforced_reconnect", { idle_ms: i }),
                  Z(o, `no peer activity for ${i}ms (liveness deadline exceeded)`));
                return;
              }
              if (!V) {
                let i = Date.now() - k;
                (g(
                  `${PREVIEW_TUNNEL_LIVENESS_WOULD_HAVE_FIRED}: no peer activity for ${i}ms (liveness deadline exceeded; observe-only, not reconnecting)`,
                  "error",
                ),
                  logEvent("tengu_preview_tunnel_liveness_would_have_fired", { idle_ms: i, enforce: !1 }),
                  (V = !0));
              }
            } else V = !1;
            if (n.quietLivenessPings === void 0) {
              s.ping?.();
              return;
            }
            if (M === 0) K = U;
            (M++, s.ping?.(String(U)));
          }, STREAM_WINDOW_MS)));
      }),
      (o.onmessage = (s) => {
        ((k = Date.now()), (H = !0));
        let i = typeof s.data === "string" ? s.data : Buffer.from(s.data).toString("utf8");
        Ie(i);
      }),
      (o.onerror = (s) => {
        g(`error: ${"message" in s && typeof s.message === "string" ? s.message : "unknown"}`, "error");
      }),
      (o.onclose = (s) => {
        let i = en(s.reason);
        (g(`closed code=${s.code} reason=${i || "(none)"}`), se(o));
        let E = H || (C > 0 && Date.now() - C >= CONNECT_TIMEOUT_MS);
        if (E) ((F = 0), (X = !1));
        if (s.code === 1008 && nn(i)) {
          if (n.policyStopEnforce) {
            J(
              `relay refused with close code 1008 (policy violation): ${i || "(no reason)"} \u2014 not retrying`,
              "policy",
            );
            return;
          }
          if (!X)
            ((X = !0),
              g(
                `POLICY_STOP_WOULD_HAVE_FIRED: capability-refusal 1008 (${i || "(no reason)"}); observe-only, retrying`,
                "error",
              ),
              logEvent("tengu_preview_tunnel_policy_stop_would_have_fired", { enforce: !1 }));
        }
        if (!E && Q()) return;
        Y();
      }));
  }
  return (
    g(`starting session=${n.sessionId} url=${u}`),
    ie(),
    {
      updateAccessToken(r) {
        accessToken = r;
      },
      forceReconnect() {
        if (R || w === null) return;
        Z(w, "caller requested");
      },
      stop() {
        if (R) return;
        if (((R = !0), P)) (clearTimeout(P), (P = null));
        if (v) (clearTimeout(v), (v = null));
        if (N) (clearInterval(N), (N = null));
        for (let r of L.values()) r.abort();
        (L.clear(), oe());
        try {
          w?.close();
        } catch {}
        ((w = null), g(`stopped session=${n.sessionId}`));
      },
    }
  );
}

export { createPreviewTunnel };

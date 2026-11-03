/**
 * services/mcp/transportGuards.ts
 *
 * 2.1.316 新增。MCP 传输防护：限制 HTTP/SSE/stdio 响应大小与编码，claude.ai 代理的本地握手应答。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z1n5m6nf.js (16)
 * attribution: placement 16
 */
import { z2, HPe } from "./mcpCallConstants.js";
import { mcpInboundDoorOnFetch } from "./mcpInboundDoor.js";
import { alwaysTrue } from "../../utils/slowOperations.js";
import { Bpe } from "../../utils/jsonScan.js";
import { $Ao } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/shared/stdio.js";
import { to } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { assertNotShuttingDown, gBt } from "./connectionLifecycle.js";
import { logForDebugging } from "../../utils/debug.js";
import { NSn } from "./mcpClientCapabilities.js";
import {
  InitializeResultSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
  isJSONRPCRequest,
  ErrorCode,
  isJSONRPCNotification,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, A, o } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * HTTP 正文上限与编码表
 */
//@ chunk-z1n5m6nf.js:34302-34474 placement
var HTTP_BODY_LIMITS = z2,
  $r = 4 * HTTP_BODY_LIMITS,
  Br = /^\s*text\/event-stream\s*(?:;|$)/i,
  Hr = 32,
  jr = new Map([
    ["gzip", "gzip"],
    ["x-gzip", "gzip"],
    ["deflate", "deflate"],
  ]),
  oo = "so Claude Code stopped reading it";
//@ chunk-z1n5m6nf.js:34474-34759 placement
class HttpBodyOverflowError_2 extends Error {
  constructor(e, r) {
    let rounded = Math.round(e / 1024 / 1024);
    super(
      (r === "event"
        ? `sent more than ${rounded}MB in one event of an event stream (no blank line ended it)`
        : `sent a response larger than ${rounded}MB (counted after decompression)`) + `, ${oo}.`,
    );
    this.name = "HttpBodyOverflowError";
  }
}
/**
 * 限制正文大小并让出事件循环的流
 */
//@ chunk-z1n5m6nf.js:34759-35428 placement
function boundedBodyStream(e, r) {
  let n = 0,
    s = 0,
    h = r <= e,
    y = 0,
    S = !1,
    startTime = performance.now();
  return new TransformStream({
    async transform(M, w) {
      if (performance.now() - startTime > 8)
        (await new Promise((U) => setImmediate(U)), (startTime = performance.now()));
      if (((n += M.length), n > r)) {
        w.error(new HttpBodyOverflowError_2(r, "body"));
        return;
      }
      if (h) {
        w.enqueue(M);
        return;
      }
      let R = -1,
        { length: E } = M,
        Q = -1,
        H = -1;
      for (let U = 0; U < E; U++) {
        let re = M[U];
        if (S && re === 10) {
          S = !1;
          continue;
        }
        if (((S = !1), re === 10 || re === 13)) {
          if (y === 0) R = U;
          ((y = 0), (S = re === 13));
          continue;
        }
        if ((y++, y < Hr)) continue;
        let he = U + 1;
        if (Q < he) ((Q = M.indexOf(10, he)), (Q = Q === -1 ? E : Q));
        if (H < he) ((H = M.indexOf(13, he)), (H = H === -1 ? E : H));
        let min = Math.min(Q, H);
        ((y += min - he), (U = min - 1));
      }
      if (((s = R >= 0 ? M.length - 1 - R : s + M.length), s > e)) {
        w.error(new HttpBodyOverflowError_2(e, "event"));
        return;
      }
      w.enqueue(M);
    },
  });
}
/**
 * 限制响应大小与编码的 fetch 包装
 */
//@ chunk-z1n5m6nf.js:35428-37449 placement
function boundedFetch(e, { refusesCodings: r = !1 } = {}) {
  let n = mcpInboundDoorOnFetch();
  return async (s, h) => {
    n?.noteRequests(h?.body);
    let upper = (h?.method ?? "GET").toUpperCase(),
      S = n !== void 0 && alwaysTrue() && typeof DecompressionStream < "u",
      T = await e(s, { ...h, ...(S && { decompress: !1 }) });
    if (!T.body || T.body.locked) return T;
    let M = h?.body;
    if (
      upper === "POST" &&
      typeof M === "string" &&
      M.includes('"jsonrpc"') &&
      (T.status === 202 || (T.ok && isJsonRpcRequestOrNotification(M)))
    )
      return (
        await T.body.cancel().catch(() => {}),
        new Response(null, { status: T.status, statusText: T.statusText, headers: T.headers })
      );
    let [w, ...R] = (T.headers.get("content-encoding") ?? "")
      .toLowerCase()
      .split(",")
      .map((ge) => ge.trim())
      .filter((ge) => ge !== "" && ge !== "identity");
    if (r && w !== void 0)
      throw (
        await T.body.cancel(),
        Error(
          "sent a response with a Content-Encoding. Claude Code reads none from a tool container, so it did not read the response.",
        )
      );
    let E = S && T.headers.get("content-length") !== "0";
    if (E && (w === "br" || w === "zstd"))
      throw (
        await T.body.cancel(),
        Error(
          "sent a response compressed with br or zstd. Claude Code reads only gzip and deflate, so it did not read the response.",
        )
      );
    let Q = E && w !== void 0 && R.length === 0 ? jr.get(w) : void 0,
      H = Q ? T.body.pipeThrough(new DecompressionStream(Q)) : T.body,
      U = HTTP_BODY_LIMITS,
      headers = new Headers(h?.headers);
    if (
      T.ok &&
      Br.test(T.headers.get("content-type") ?? "") &&
      headers.get("accept")?.includes("text/event-stream")
    )
      U =
        T.status === 200 &&
        (n === void 0 || w === void 0) &&
        (upper === "GET" || headers.get("mcp-method") === "subscriptions/listen")
          ? 1 / 0
          : $r;
    let pipeThrough = H.pipeThrough(boundedBodyStream(HTTP_BODY_LIMITS, U)),
      G = n?.judging({
        url: String(s),
        isGet: upper === "GET",
        ok: T.ok,
        contentType: T.headers.get("content-type"),
      }),
      q = G ? pipeThrough.pipeThrough(G.through) : pipeThrough,
      { headers: headers_2 } = T;
    if (G?.contentType !== void 0)
      ((headers_2 = new Headers(headers_2)), headers_2.set("content-type", G.contentType));
    let fe = T.status >= 200 && T.status <= 599,
      response = new Response(q, {
        status: fe ? T.status : 200,
        statusText: T.statusText,
        headers: headers_2,
      });
    if (!fe)
      (Object.defineProperty(response, "status", { value: T.status }),
        Object.defineProperty(response, "ok", { value: T.ok }));
    return (
      Object.defineProperty(response, "url", { value: T.url }),
      Object.defineProperty(response, "redirected", { value: T.redirected }),
      Object.defineProperty(response, "type", { value: T.type }),
      response
    );
  };
}
//@ chunk-z1n5m6nf.js:37449-37491 placement
var JSONRPC_ENVELOPE_KEYS = new Set(["jsonrpc", "id", "method"]);
/**
 * 文本是否为 JSON-RPC 请求或通知
 */
//@ chunk-z1n5m6nf.js:37491-37645 placement
function isJsonRpcRequestOrNotification(e) {
  if (e.includes('"id":') && e.includes('"method":')) return !1;
  let r = Bpe(e, JSONRPC_ENVELOPE_KEYS);
  return r?.get("jsonrpc") === '"2.0"' && r.has("method") !== r.has("id");
}
//@ chunk-z1n5m6nf.js:37645-37948 placement
class StdoutOverflowError_2 extends Error {
  constructor(e) {
    super(
      `wrote >${Math.round(e / 1024 / 1024)}MB to stdout without a JSON-RPC message boundary. The server is likely writing logs or other non-protocol data to stdout instead of stderr. Disconnecting to prevent unbounded memory growth.`,
    );
    this.name = "StdoutOverflowError";
  }
}
/**
 * 有上限的读缓冲
 */
//@ chunk-z1n5m6nf.js:37948-38779 placement
class BoundedReadBuffer {
  capBytes;
  onOverflow;
  chunks = [];
  byteLength = 0;
  overflowed = !1;
  overflowThrown = !1;
  constructor(e, r) {
    this.capBytes = e;
    this.onOverflow = r;
  }
  append(e) {
    if (this.overflowed) return;
    if (this.byteLength + e.length > this.capBytes) {
      ((this.chunks = []),
        (this.byteLength = 0),
        (this.overflowed = !0),
        this.onOverflow(new StdoutOverflowError_2(this.capBytes)));
      return;
    }
    (this.chunks.push(e), (this.byteLength += e.length));
  }
  readMessage() {
    if (this.overflowed) {
      if (this.overflowThrown) return null;
      throw ((this.overflowThrown = !0), new StdoutOverflowError_2(this.capBytes));
    }
    if (this.chunks.length === 0) return null;
    let at = this.chunks.at(-1),
      index = at.indexOf(10);
    if (index === -1) return null;
    let n = this.chunks.length === 1 ? at : Buffer.concat(this.chunks),
      s = n.length - at.length + index,
      replaced = n.toString("utf8", 0, s).replace(/\r$/, ""),
      chunk = n.subarray(s + 1);
    return ((this.chunks = chunk.length > 0 ? [chunk] : []), (this.byteLength = chunk.length), $Ao(replaced));
  }
  clear() {
    ((this.chunks = []), (this.byteLength = 0));
  }
}
/**
 * 限制输出大小的 stdio 传输
 */
//@ chunk-z1n5m6nf.js:38779-39544 placement
class BoundedStdioTransport extends to {
  overflowError;
  constructor(e) {
    super(e);
    this._readBuffer = new BoundedReadBuffer(z2, (r) => {
      ((this.overflowError = r), queueMicrotask(() => void this.close()));
    });
  }
  get serverProcess() {
    return this._process;
  }
  #e;
  async start() {
    assertNotShuttingDown();
    let e = this.serverProcess !== void 0,
      start = super.start(),
      serverProcess = this.serverProcess;
    if (!e && serverProcess?.pid !== void 0) this.#e = gBt(serverProcess);
    if ((await start, !e && serverProcess === void 0)) this.#t(this.serverProcess);
  }
  handOffExitCleanup() {
    (this.#e?.(), (this.#e = void 0));
  }
  #t(e) {
    if (e?.pid !== void 0) {
      this.#e = gBt(e);
      return;
    }
    if (this.pid !== null)
      throw Error(
        "BoundedStdioClientTransport: the SDK transport no longer keeps its child process on _process \u2014 " +
          "the exit-time reaper for a still-connecting stdio server cannot arm; re-verify BoundedStdioClientTransport.start() against the SDK transport internals.",
      );
  }
}
//@ chunk-z1n5m6nf.js:39544-39617 placement
function isStatelessClaudeAiProxy_2(e) {
  return e.type === "claudeai-proxy" && e.stateless === !0 && NSn();
}
//@ chunk-z1n5m6nf.js:39617-40126 placement
function getCachedInitializeResult_2(e) {
  if (!isStatelessClaudeAiProxy_2(e) || e.type !== "claudeai-proxy") return;
  if (e.cachedInitResponse == null) return;
  let safeParse = InitializeResultSchema.safeParse(e.cachedInitResponse);
  if (!safeParse.success) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${e.id} failed InitializeResult validation \u2014 falling back to real initialize`,
    );
    return;
  }
  if (!SUPPORTED_PROTOCOL_VERSIONS.includes(safeParse.data.protocolVersion)) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${e.id} carries unsupported protocolVersion ${HPe(safeParse.data.protocolVersion)} \u2014 falling back to real initialize`,
    );
    return;
  }
  return safeParse.data;
}
//@ chunk-z1n5m6nf.js:40126-40240 placement
var discoverResponseSchema = DoctorLazy(() =>
  kt({
    supportedVersions: A(o()),
    capabilities: kt({}),
    serverInfo: kt({ name: o(), version: o() }).optional(),
  }),
);
/**
 * claude.ai 代理的缓存 discover 结果
 */
//@ chunk-z1n5m6nf.js:40240-40660 placement
function cachedDiscoverOutcome(e) {
  if (!isStatelessClaudeAiProxy_2(e) || e.type !== "claudeai-proxy") return;
  if (e.discoverSupport === "legacy") return "method-not-found";
  if (e.discoverSupport !== "supported") return;
  if (e.cachedDiscoverResponse == null) return;
  let safeParse = discoverResponseSchema().safeParse(e.cachedDiscoverResponse);
  if (!safeParse.success) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${e.id} failed DiscoverResult shape check \u2014 passing server/discover through`,
    );
    return;
  }
  return { result: safeParse.data };
}
//@ chunk-z1n5m6nf.js:40660-41200 placement
function answerHandshakeLocally_2(transport, cachedInitialize, discoverAnswer) {
  let s = transport.send.bind(transport);
  transport.send = async (h, y) => {
    if (cachedInitialize !== void 0 && isJSONRPCRequest(h) && h.method === "initialize") {
      let S = { jsonrpc: "2.0", id: h.id, result: cachedInitialize };
      queueMicrotask(() => transport.onmessage?.(S));
      return;
    }
    if (discoverAnswer !== void 0 && isJSONRPCRequest(h) && h.method === "server/discover") {
      let S =
        discoverAnswer === "method-not-found"
          ? {
              jsonrpc: "2.0",
              id: h.id,
              error: {
                code: ErrorCode.MethodNotFound,
                message: "server/discover resolved locally as unsupported",
              },
            }
          : { jsonrpc: "2.0", id: h.id, result: discoverAnswer.result };
      queueMicrotask(() => transport.onmessage?.(S));
      return;
    }
    if (isJSONRPCNotification(h) && h.method === "notifications/initialized") return;
    return s(h, y);
  };
}
//@ chunk-z1n5m6nf.js:41200-41489 placement
function answerGetStreamLocally_2(e, r) {
  let href = new URL(r).href;
  return async (s, h) => {
    if ((h?.method ?? "GET").toUpperCase() !== "GET") return e(s, h);
    let y = typeof s === "object" && s !== null && "url" in s ? s.url : String(s);
    if (new URL(y).href === href)
      return new Response(null, { status: 405, statusText: "Method Not Allowed" });
    return e(s, h);
  };
}
//@ chunk-z1n5m6nf.js:41521-41559 placement
var lt = require("./chunk-tn4j580p.js");

export {
  HttpBodyOverflowError_2,
  boundedFetch,
  isStatelessClaudeAiProxy_2,
  answerGetStreamLocally_2,
  BoundedStdioTransport,
  getCachedInitializeResult_2,
  cachedDiscoverOutcome,
  answerHandshakeLocally_2,
  StdoutOverflowError_2,
  HTTP_BODY_LIMITS,
  oo,
  lt,
};

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
import { MAX_STRUCTURED_RESULT_BYTES, sanitizeCallMark } from "./mcpCallConstants.js";
import { mcpInboundDoorOnFetch } from "./mcpInboundDoor.js";
import { alwaysTrue } from "../../utils/slowOperations.js";
import { sliceTopLevelValues } from "../../utils/jsonScan.js";
import { deserializeMessage } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/shared/stdio.js";
import { StdioClientTransport } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { assertNotShuttingDown, trackOrphanStdioServer } from "./connectionLifecycle.js";
import { logForDebugging } from "../../utils/debug.js";
import { isStatelessSkipInitEnabled } from "./mcpClientCapabilities.js";
import {
  InitializeResultSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
  isJSONRPCRequest,
  ErrorCode,
  isJSONRPCNotification,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, array, string } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-z1n5m6nf.js:34302-34474 placement
/**
 * 超出上限时的说明。
 */
var HTTP_BODY_LIMITS = MAX_STRUCTURED_RESULT_BYTES;
var MAX_DECOMPRESSED_BODY_BYTES = 4 * HTTP_BODY_LIMITS;
var SSE_CONTENT_TYPE_RE = /^\s*text\/event-stream\s*(?:;|$)/i;
var MIN_LINE_CHARS = 32;
var COMPRESSION_ALIASES = new Map([
  ["gzip", "gzip"],
  ["x-gzip", "gzip"],
  ["deflate", "deflate"],
]);
var STOPPED_READING_NOTE_2 = "so Claude Code stopped reading it";
//@ chunk-z1n5m6nf.js:34474-34759 placement
class HttpBodyOverflowError_2 extends Error {
  constructor(e, r) {
    let rounded = Math.round(e / 1024 / 1024);
    super(
      (r === "event"
        ? `sent more than ${rounded}MB in one event of an event stream (no blank line ended it)`
        : `sent a response larger than ${rounded}MB (counted after decompression)`) +
        `, ${STOPPED_READING_NOTE_2}.`,
    );
    this.name = "HttpBodyOverflowError";
  }
}
//@ chunk-z1n5m6nf.js:34759-35428 placement
/**
 * 限制正文大小并让出事件循环的流
 */
function boundedBodyStream(e, r) {
  let n = 0;
  let s = 0;
  let h = r <= e;
  let y = 0;
  let S = false;
  let startTime = performance.now();
  return new TransformStream({
    async transform(M, w) {
      if (performance.now() - startTime > 8) {
        await new Promise((resolve) => setImmediate(resolve));
        startTime = performance.now();
      }
      n += M.length;
      if (n > r) {
        w.error(new HttpBodyOverflowError_2(r, "body"));
        return;
      }
      if (h) {
        w.enqueue(M);
        return;
      }
      let R = -1;
      let { length: E } = M;
      let Q = -1;
      let H = -1;
      for (let j = 0; j < E; j++) {
        let re = M[j];
        if (S && re === 10) {
          S = false;
          continue;
        }
        S = false;
        if (re === 10 || re === 13) {
          if (y === 0) R = j;
          y = 0;
          S = re === 13;
          continue;
        }
        y++;
        if (y < MIN_LINE_CHARS) continue;
        let he = j + 1;
        if (Q < he) {
          Q = M.indexOf(10, he);
          Q = Q === -1 ? E : Q;
        }
        if (H < he) {
          H = M.indexOf(13, he);
          H = H === -1 ? E : H;
        }
        let min = Math.min(Q, H);
        y += min - he;
        j = min - 1;
      }
      s = R >= 0 ? M.length - 1 - R : s + M.length;
      if (s > e) {
        w.error(new HttpBodyOverflowError_2(e, "event"));
        return;
      }
      w.enqueue(M);
    },
  });
}
//@ chunk-z1n5m6nf.js:35428-37449 placement
/**
 * 限制响应大小与编码的 fetch 包装
 */
function boundedFetch(e, { refusesCodings: r = false } = {}) {
  let n = mcpInboundDoorOnFetch();
  return async (s, h) => {
    n?.noteRequests(h?.body);
    let upper = (h?.method ?? "GET").toUpperCase();
    let S = n !== undefined && alwaysTrue() && typeof DecompressionStream !== "undefined";
    let T = await e(s, {
      ...h,
      ...(S && {
        decompress: false,
      }),
    });
    if (!T.body || T.body.locked) return T;
    let body = h?.body;
    if (
      upper === "POST" &&
      typeof body === "string" &&
      body.includes('"jsonrpc"') &&
      (T.status === 202 || (T.ok && isJsonRpcRequestOrNotification(body)))
    ) {
      await T.body.cancel().catch(() => {});
      return new Response(null, {
        status: T.status,
        statusText: T.statusText,
        headers: T.headers,
      });
    }
    let [w, ...R] = (T.headers.get("content-encoding") ?? "")
      .toLowerCase()
      .split(",")
      .map((ge) => ge.trim())
      .filter((ge) => ge !== "" && ge !== "identity");
    if (r && w !== undefined) {
      await T.body.cancel();
      throw Error(
        "sent a response with a Content-Encoding. Claude Code reads none from a tool container, so it did not read the response.",
      );
    }
    let E = S && T.headers.get("content-length") !== "0";
    if (E && (w === "br" || w === "zstd")) {
      await T.body.cancel();
      throw Error(
        "sent a response compressed with br or zstd. Claude Code reads only gzip and deflate, so it did not read the response.",
      );
    }
    let Q = E && w !== undefined && R.length === 0 ? COMPRESSION_ALIASES.get(w) : undefined;
    let H = Q ? T.body.pipeThrough(new DecompressionStream(Q)) : T.body;
    let U = HTTP_BODY_LIMITS;
    let headers = new Headers(h?.headers);
    if (
      T.ok &&
      SSE_CONTENT_TYPE_RE.test(T.headers.get("content-type") ?? "") &&
      headers.get("accept")?.includes("text/event-stream")
    )
      U =
        T.status === 200 &&
        (n === undefined || w === undefined) &&
        (upper === "GET" || headers.get("mcp-method") === "subscriptions/listen")
          ? 1 / 0
          : MAX_DECOMPRESSED_BODY_BYTES;
    let he = H.pipeThrough(boundedBodyStream(HTTP_BODY_LIMITS, U));
    let G = n?.judging({
      url: String(s),
      isGet: upper === "GET",
      ok: T.ok,
      contentType: T.headers.get("content-type"),
    });
    let q = G ? he.pipeThrough(G.through) : he;
    let { headers: headers_2 } = T;
    if (G?.contentType !== undefined) {
      headers_2 = new Headers(headers_2);
      headers_2.set("content-type", G.contentType);
    }
    let fe = T.status >= 200 && T.status <= 599;
    let response = new Response(q, {
      status: fe ? T.status : 200,
      statusText: T.statusText,
      headers: headers_2,
    });
    if (!fe) {
      Object.defineProperty(response, "status", {
        value: T.status,
      });
      Object.defineProperty(response, "ok", {
        value: T.ok,
      });
    }
    Object.defineProperty(response, "url", {
      value: T.url,
    });
    Object.defineProperty(response, "redirected", {
      value: T.redirected,
    });
    Object.defineProperty(response, "type", {
      value: T.type,
    });
    return response;
  };
}
//@ chunk-z1n5m6nf.js:37449-37491 placement
var JSONRPC_ENVELOPE_KEYS = new Set(["jsonrpc", "id", "method"]);
//@ chunk-z1n5m6nf.js:37491-37645 placement
/**
 * 文本是否为 JSON-RPC 请求或通知
 */
function isJsonRpcRequestOrNotification(body) {
  if (body.includes('"id":') && body.includes('"method":')) return false;
  let r = sliceTopLevelValues(body, JSONRPC_ENVELOPE_KEYS);
  return r?.get("jsonrpc") === '"2.0"' && r.has("method") !== r.has("id");
}
//@ chunk-z1n5m6nf.js:37645-37948 placement
class StdoutOverflowError_2 extends Error {
  constructor(capBytes) {
    super(
      `wrote >${Math.round(capBytes / 1024 / 1024)}MB to stdout without a JSON-RPC message boundary. The server is likely writing logs or other non-protocol data to stdout instead of stderr. Disconnecting to prevent unbounded memory growth.`,
    );
    this.name = "StdoutOverflowError";
  }
}
//@ chunk-z1n5m6nf.js:37948-38779 placement
/**
 * 有上限的读缓冲
 */
class BoundedReadBuffer {
  capBytes;
  onOverflow;
  chunks = [];
  byteLength = 0;
  overflowed = false;
  overflowThrown = false;
  constructor(capBytes, onOverflow) {
    this.capBytes = capBytes;
    this.onOverflow = onOverflow;
  }
  append(e) {
    if (this.overflowed) return;
    if (this.byteLength + e.length > this.capBytes) {
      this.chunks = [];
      this.byteLength = 0;
      this.overflowed = true;
      this.onOverflow(new StdoutOverflowError_2(this.capBytes));
      return;
    }
    this.chunks.push(e);
    this.byteLength += e.length;
  }
  readMessage() {
    if (this.overflowed) {
      if (this.overflowThrown) return null;
      this.overflowThrown = true;
      throw new StdoutOverflowError_2(this.capBytes);
    }
    if (this.chunks.length === 0) return null;
    let last = this.chunks.at(-1);
    let index = last.indexOf(10);
    if (index === -1) return null;
    let n = this.chunks.length === 1 ? last : Buffer.concat(this.chunks);
    let s = n.length - last.length + index;
    let line = n.toString("utf8", 0, s).replace(/\r$/, "");
    let chunk = n.subarray(s + 1);
    this.chunks = chunk.length > 0 ? [chunk] : [];
    this.byteLength = chunk.length;
    return deserializeMessage(line);
  }
  clear() {
    this.chunks = [];
    this.byteLength = 0;
  }
}
//@ chunk-z1n5m6nf.js:38779-39544 placement
/**
 * 限制输出大小的 stdio 传输
 */
class BoundedStdioTransport extends StdioClientTransport {
  overflowError;
  constructor(e) {
    super(e);
    this._readBuffer = new BoundedReadBuffer(MAX_STRUCTURED_RESULT_BYTES, (overflowError) => {
      this.overflowError = overflowError;
      queueMicrotask(() => void this.close());
    });
  }
  get serverProcess() {
    return this._process;
  }
  #e;
  async start() {
    assertNotShuttingDown();
    let e = this.serverProcess !== undefined;
    let r = super.start();
    let serverProcess = this.serverProcess;
    if (!e && serverProcess?.pid !== undefined) this.#e = trackOrphanStdioServer(serverProcess);
    await r;
    if (!e && serverProcess === undefined) this.#t(this.serverProcess);
  }
  handOffExitCleanup() {
    this.#e?.();
    this.#e = undefined;
  }
  #t(e) {
    if (e?.pid !== undefined) {
      this.#e = trackOrphanStdioServer(e);
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
function isStatelessClaudeAiProxy_2(serverRef) {
  return serverRef.type === "claudeai-proxy" && serverRef.stateless === true && isStatelessSkipInitEnabled();
}
//@ chunk-z1n5m6nf.js:39617-40126 placement
function getCachedInitializeResult_2(serverRef) {
  if (!isStatelessClaudeAiProxy_2(serverRef) || serverRef.type !== "claudeai-proxy") return;
  if (serverRef.cachedInitResponse == null) return;
  let r = InitializeResultSchema.safeParse(serverRef.cachedInitResponse);
  if (!r.success) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${serverRef.id} failed InitializeResult validation \u2014 falling back to real initialize`,
    );
    return;
  }
  if (!SUPPORTED_PROTOCOL_VERSIONS.includes(r.data.protocolVersion)) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${serverRef.id} carries unsupported protocolVersion ${sanitizeCallMark(r.data.protocolVersion)} \u2014 falling back to real initialize`,
    );
    return;
  }
  return r.data;
}
//@ chunk-z1n5m6nf.js:40126-40240 placement
var discoverResponseSchema = DoctorLazy(() =>
  looseObject({
    supportedVersions: array(string()),
    capabilities: looseObject({}),
    serverInfo: looseObject({
      name: string(),
      version: string(),
    }).optional(),
  }),
);
//@ chunk-z1n5m6nf.js:40240-40660 placement
/**
 * claude.ai 代理的缓存 discover 结果
 */
function cachedDiscoverOutcome(serverRef) {
  if (!isStatelessClaudeAiProxy_2(serverRef) || serverRef.type !== "claudeai-proxy") return;
  if (serverRef.discoverSupport === "legacy") return "method-not-found";
  if (serverRef.discoverSupport !== "supported") return;
  if (serverRef.cachedDiscoverResponse == null) return;
  let r = discoverResponseSchema().safeParse(serverRef.cachedDiscoverResponse);
  if (!r.success) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${serverRef.id} failed DiscoverResult shape check \u2014 passing server/discover through`,
    );
    return;
  }
  return {
    result: r.data,
  };
}
//@ chunk-z1n5m6nf.js:40660-41200 placement
function answerHandshakeLocally_2(transport, cachedInitialize, discoverAnswer) {
  let s = transport.send.bind(transport);
  transport.send = async (h, y) => {
    if (cachedInitialize !== undefined && isJSONRPCRequest(h) && h.method === "initialize") {
      let S = {
        jsonrpc: "2.0",
        id: h.id,
        result: cachedInitialize,
      };
      queueMicrotask(() => transport.onmessage?.(S));
      return;
    }
    if (discoverAnswer !== undefined && isJSONRPCRequest(h) && h.method === "server/discover") {
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
          : {
              jsonrpc: "2.0",
              id: h.id,
              result: discoverAnswer.result,
            };
      queueMicrotask(() => transport.onmessage?.(S));
      return;
    }
    if (isJSONRPCNotification(h) && h.method === "notifications/initialized") return;
    return s(h, y);
  };
}
//@ chunk-z1n5m6nf.js:41200-41489 placement
function answerGetStreamLocally_2(e, proxyUrl) {
  let href = new URL(proxyUrl).href;
  return async (s, h) => {
    if ((h?.method ?? "GET").toUpperCase() !== "GET") return e(s, h);
    let y = typeof s === "object" && s !== null && "url" in s ? s.url : String(s);
    if (new URL(y).href === href)
      return new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
      });
    return e(s, h);
  };
}
//@ chunk-z1n5m6nf.js:41521-41559 placement
/**
 * 懒加载的网络相关模块（当前为 chunk 引用）。
 */
var netModule = require("./chunk-tn4j580p.js");
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
  STOPPED_READING_NOTE_2,
  netModule,
};

/**
 * services/mcp/boundedTransports.ts
 *
 * 2.1.316 新增：MCP 传输限长：HTTP 响应体/SSE 事件与 stdio 行缓冲上限。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t8n4kdh.js (10)
 * attribution: placement 10
 */
import { MAX_STRUCTURED_RESULT_BYTES } from "./mcpCallConstants.js";
import { mcpInboundDoorOnFetch } from "./mcpInboundDoor.js";
import { alwaysTrue } from "../../utils/slowOperations.js";
import { sliceTopLevelValues } from "../../utils/jsonScan.js";
import { deserializeMessage } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { StdioClientTransport } from "../../../vendor/@modelcontextprotocol/client/dist/stdio.mjs";
import { assertNotShuttingDown, trackOrphanStdioServer } from "./connectionLifecycle.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-8t8n4kdh.js:19954-20126 placement
/**
 * 超出上限时的说明（“所以 Claude Code 停止读取”）。
 */
var MCP_BODY_LIMIT = MAX_STRUCTURED_RESULT_BYTES;
var MAX_DECOMPRESSED_BODY_BYTES = 4 * MCP_BODY_LIMIT;
var SSE_CONTENT_TYPE_RE = /^\s*text\/event-stream\s*(?:;|$)/i;
var MIN_LINE_CHARS = 32;
var COMPRESSION_ALIASES = new Map([
  ["gzip", "gzip"],
  ["x-gzip", "gzip"],
  ["deflate", "deflate"],
]);
var STOPPED_READING_NOTE = "so Claude Code stopped reading it";
//@ chunk-8t8n4kdh.js:20126-20411 placement
class HttpBodyOverflowError extends Error {
  constructor(e, n) {
    let rounded = Math.round(e / 1024 / 1024);
    super(
      (n === "event"
        ? `sent more than ${rounded}MB in one event of an event stream (no blank line ended it)`
        : `sent a response larger than ${rounded}MB (counted after decompression)`) +
        `, ${STOPPED_READING_NOTE}.`,
    );
    this.name = "HttpBodyOverflowError";
  }
}
//@ chunk-8t8n4kdh.js:20411-21096 placement
/**
 * 生成限制 MCP HTTP 响应的 TransformStream：累计字节超过总上限报 body 溢出；逐字节跟踪 SSE 行与事件边界，单个事件超过上限报 event 溢出；每 8ms 让出一次事件循环。
 */
function createSseLimitStream(maxEventBytes, maxBodyBytes) {
  let bodyBytes = 0;
  let eventBytes = 0;
  let bodyCapCoversEvents = maxBodyBytes <= maxEventBytes;
  let lineLength = 0;
  let afterCR = false;
  let startTime = performance.now();
  return new TransformStream({
    async transform(P, M) {
      if (performance.now() - startTime > 8) {
        await new Promise((resolve) => setImmediate(resolve));
        startTime = performance.now();
      }
      bodyBytes += P.length;
      if (bodyBytes > maxBodyBytes) {
        M.error(new HttpBodyOverflowError(maxBodyBytes, "body"));
        return;
      }
      if (bodyCapCoversEvents) {
        M.enqueue(P);
        return;
      }
      let j = -1;
      let { length: R } = P;
      let ce = -1;
      let Q = -1;
      for (let idx = 0; idx < R; idx++) {
        let ge = P[idx];
        if (afterCR && ge === 10) {
          afterCR = false;
          continue;
        }
        afterCR = false;
        if (ge === 10 || ge === 13) {
          if (lineLength === 0) j = idx;
          lineLength = 0;
          afterCR = ge === 13;
          continue;
        }
        lineLength++;
        if (lineLength < MIN_LINE_CHARS) continue;
        let Ie = idx + 1;
        if (ce < Ie) {
          ce = P.indexOf(10, Ie);
          ce = ce === -1 ? R : ce;
        }
        if (Q < Ie) {
          Q = P.indexOf(13, Ie);
          Q = Q === -1 ? R : Q;
        }
        let min = Math.min(ce, Q);
        lineLength += min - Ie;
        idx = min - 1;
      }
      eventBytes = j >= 0 ? P.length - 1 - j : eventBytes + P.length;
      if (eventBytes > maxEventBytes) {
        M.error(new HttpBodyOverflowError(maxEventBytes, "event"));
        return;
      }
      M.enqueue(P);
    },
  });
}
//@ chunk-8t8n4kdh.js:21096-23130 placement
/**
 * 包装 MCP HTTP 传输的 fetch：限制单个 SSE 事件与响应体大小（解压后计），拒绝不支持的 Content-Encoding，超限抛 HttpBodyOverflowError。
 */
function createBoundedFetch(e, { refusesCodings: n = false } = {}) {
  let r = mcpInboundDoorOnFetch();
  return async (s, h) => {
    r?.noteRequests(h?.body);
    let upper = (h?.method ?? "GET").toUpperCase();
    let S = r !== undefined && alwaysTrue() && typeof DecompressionStream !== "undefined";
    let w = await e(s, {
      ...h,
      ...(S && {
        decompress: false,
      }),
    });
    if (!w.body || w.body.locked) return w;
    let body = h?.body;
    if (
      upper === "POST" &&
      typeof body === "string" &&
      body.includes('"jsonrpc"') &&
      (w.status === 202 || (w.ok && isJsonRpcNotificationOrResponse(body)))
    ) {
      await w.body.cancel().catch(() => {});
      return new Response(null, {
        status: w.status,
        statusText: w.statusText,
        headers: w.headers,
      });
    }
    let [M, ...j] = (w.headers.get("content-encoding") ?? "")
      .toLowerCase()
      .split(",")
      .map((he) => he.trim())
      .filter((he) => he !== "" && he !== "identity");
    if (n && M !== undefined) {
      await w.body.cancel();
      throw Error(
        "sent a response with a Content-Encoding. Claude Code reads none from a tool container, so it did not read the response.",
      );
    }
    let R = S && w.headers.get("content-length") !== "0";
    if (R && (M === "br" || M === "zstd")) {
      await w.body.cancel();
      throw Error(
        "sent a response compressed with br or zstd. Claude Code reads only gzip and deflate, so it did not read the response.",
      );
    }
    let ce = R && M !== undefined && j.length === 0 ? COMPRESSION_ALIASES.get(M) : undefined;
    let Q = ce ? w.body.pipeThrough(new DecompressionStream(ce)) : w.body;
    let maxBodyBytes = MCP_BODY_LIMIT;
    let headers = new Headers(h?.headers);
    if (
      w.ok &&
      SSE_CONTENT_TYPE_RE.test(w.headers.get("content-type") ?? "") &&
      headers.get("accept")?.includes("text/event-stream")
    )
      maxBodyBytes =
        w.status === 200 &&
        (r === undefined || M === undefined) &&
        (upper === "GET" || headers.get("mcp-method") === "subscriptions/listen")
          ? 1 / 0
          : MAX_DECOMPRESSED_BODY_BYTES;
    let Ie = Q.pipeThrough(createSseLimitStream(MCP_BODY_LIMIT, maxBodyBytes));
    let G = r?.judging({
      url: String(s),
      isGet: upper === "GET",
      ok: w.ok,
      contentType: w.headers.get("content-type"),
    });
    let Pe = G ? Ie.pipeThrough(G.through) : Ie;
    let { headers: headers_2 } = w;
    if (G?.contentType !== undefined) {
      headers_2 = new Headers(headers_2);
      headers_2.set("content-type", G.contentType);
    }
    let nt = w.status >= 200 && w.status <= 599;
    let response = new Response(Pe, {
      status: nt ? w.status : 200,
      statusText: w.statusText,
      headers: headers_2,
    });
    if (!nt) {
      Object.defineProperty(response, "status", {
        value: w.status,
      });
      Object.defineProperty(response, "ok", {
        value: w.ok,
      });
    }
    Object.defineProperty(response, "url", {
      value: w.url,
    });
    Object.defineProperty(response, "redirected", {
      value: w.redirected,
    });
    Object.defineProperty(response, "type", {
      value: w.type,
    });
    return response;
  };
}
//@ chunk-8t8n4kdh.js:23130-23172 placement
/**
 * JSON-RPC 消息的基本键集合。
 */
var JSONRPC_MESSAGE_KEYS = new Set(["jsonrpc", "id", "method"]);
//@ chunk-8t8n4kdh.js:23172-23326 placement
function isJsonRpcNotificationOrResponse(body) {
  if (body.includes('"id":') && body.includes('"method":')) return false;
  let n = sliceTopLevelValues(body, JSONRPC_MESSAGE_KEYS);
  return n?.get("jsonrpc") === '"2.0"' && n.has("method") !== n.has("id");
}
//@ chunk-8t8n4kdh.js:23326-23629 placement
class StdoutOverflowError extends Error {
  constructor(capBytes) {
    super(
      `wrote >${Math.round(capBytes / 1024 / 1024)}MB to stdout without a JSON-RPC message boundary. The server is likely writing logs or other non-protocol data to stdout instead of stderr. Disconnecting to prevent unbounded memory growth.`,
    );
    this.name = "StdoutOverflowError";
  }
}
//@ chunk-8t8n4kdh.js:23629-24515 placement
class BoundedLineBuffer {
  capBytes;
  onOverflow;
  onMessage;
  chunks = [];
  byteLength = 0;
  overflowed = false;
  overflowThrown = false;
  constructor(capBytes, onOverflow, onMessage) {
    this.capBytes = capBytes;
    this.onOverflow = onOverflow;
    this.onMessage = onMessage;
  }
  append(e) {
    if (this.overflowed) return;
    if (this.byteLength + e.length > this.capBytes) {
      this.chunks = [];
      this.byteLength = 0;
      this.overflowed = true;
      this.onOverflow(new StdoutOverflowError(this.capBytes));
      return;
    }
    this.chunks.push(e);
    this.byteLength += e.length;
  }
  readMessage() {
    if (this.overflowed) {
      if (this.overflowThrown) return null;
      this.overflowThrown = true;
      throw new StdoutOverflowError(this.capBytes);
    }
    if (this.chunks.length === 0) return null;
    let last = this.chunks.at(-1);
    let index = last.indexOf(10);
    if (index === -1) return null;
    let r = this.chunks.length === 1 ? last : Buffer.concat(this.chunks);
    let s = r.length - last.length + index;
    let line = r.toString("utf8", 0, s).replace(/\r$/, "");
    let chunk = r.subarray(s + 1);
    this.chunks = chunk.length > 0 ? [chunk] : [];
    this.byteLength = chunk.length;
    let S = deserializeMessage(line);
    this.onMessage(S);
    return S;
  }
  clear() {
    this.chunks = [];
    this.byteLength = 0;
  }
}
//@ chunk-8t8n4kdh.js:24515-24547 placement
var SERVER_DISCOVER_PROBE = "server-discover-probe-";
//@ chunk-8t8n4kdh.js:24547-25800 placement
class BoundedStdioClientTransport extends StdioClientTransport {
  overflowError;
  answeredProbeLate = false;
  onAnsweredProbeLate;
  constructor(e) {
    super({
      ...e,
      maxBufferSize: MAX_STRUCTURED_RESULT_BYTES,
    });
    this._readBuffer = new BoundedLineBuffer(
      MAX_STRUCTURED_RESULT_BYTES,
      (overflowError) => {
        this.overflowError = overflowError;
        queueMicrotask(() => void this.close());
      },
      (n) => {
        if (
          this._anthropicProbeTimedOut === true &&
          "id" in n &&
          typeof n.id === "string" &&
          n.id.startsWith(SERVER_DISCOVER_PROBE) &&
          "result" in n &&
          !this.answeredProbeLate
        ) {
          this.answeredProbeLate = true;
          this.onAnsweredProbeLate?.();
        }
      },
    );
  }
  get serverProcess() {
    return this._process;
  }
  #e;
  async start() {
    assertNotShuttingDown();
    let e = this.serverProcess !== undefined;
    let n = super.start();
    let serverProcess = this.serverProcess;
    if (!e && serverProcess?.pid !== undefined) this.#e = trackOrphanStdioServer(serverProcess);
    await n;
    if (!e && serverProcess === undefined) this.#t(this.serverProcess);
    if (!(this._readBuffer instanceof BoundedLineBuffer))
      throw Error(
        "BoundedStdioClientTransport: _readBuffer is no longer the BoundedReadBuffer \u2014 " +
          "the SDK transport internals this subclass relies on have changed; re-verify the stdout bound.",
      );
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
export {
  HttpBodyOverflowError,
  createBoundedFetch,
  BoundedStdioClientTransport,
  StdoutOverflowError,
  MCP_BODY_LIMIT,
  STOPPED_READING_NOTE,
};

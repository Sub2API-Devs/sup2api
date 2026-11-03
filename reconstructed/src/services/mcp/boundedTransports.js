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
import { z2 } from "./mcpCallConstants.js";
import { mcpInboundDoorOnFetch } from "./mcpInboundDoor.js";
import { alwaysTrue } from "../../utils/slowOperations.js";
import { Bpe } from "../../utils/jsonScan.js";
import { YNr } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { jr } from "../../../vendor/@modelcontextprotocol/client/dist/stdio.mjs";
import { assertNotShuttingDown, gBt } from "./connectionLifecycle.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-8t8n4kdh.js:19954-20126 placement
var MCP_BODY_LIMIT = z2,
  ea = 4 * MCP_BODY_LIMIT,
  ta = /^\s*text\/event-stream\s*(?:;|$)/i,
  na = 32,
  ra = new Map([
    ["gzip", "gzip"],
    ["x-gzip", "gzip"],
    ["deflate", "deflate"],
  ]),
  Ao = "so Claude Code stopped reading it";
//@ chunk-8t8n4kdh.js:20126-20411 placement
class HttpBodyOverflowError extends Error {
  constructor(e, n) {
    let rounded = Math.round(e / 1024 / 1024);
    super(
      (n === "event"
        ? `sent more than ${rounded}MB in one event of an event stream (no blank line ended it)`
        : `sent a response larger than ${rounded}MB (counted after decompression)`) + `, ${Ao}.`,
    );
    this.name = "HttpBodyOverflowError";
  }
}
/**
 * 生成限制 MCP HTTP 响应的 TransformStream：累计字节超过总上限报 body 溢出；逐字节跟踪 SSE 行与事件边界，单个事件超过上限报 event 溢出；每 8ms 让出一次事件循环。
 */
//@ chunk-8t8n4kdh.js:20411-21096 placement
function createSseLimitStream(maxEventBytes, maxBodyBytes) {
  let bodyBytes = 0,
    eventBytes = 0,
    bodyCapCoversEvents = maxBodyBytes <= maxEventBytes,
    lineLength = 0,
    afterCR = !1,
    startTime = performance.now();
  return new TransformStream({
    async transform(P, M) {
      if (performance.now() - startTime > 8)
        (await new Promise((ie) => setImmediate(ie)), (startTime = performance.now()));
      if (((bodyBytes += P.length), bodyBytes > maxBodyBytes)) {
        M.error(new HttpBodyOverflowError(maxBodyBytes, "body"));
        return;
      }
      if (bodyCapCoversEvents) {
        M.enqueue(P);
        return;
      }
      let j = -1,
        { length: R } = P,
        ce = -1,
        Q = -1;
      for (let ie = 0; ie < R; ie++) {
        let ge = P[ie];
        if (afterCR && ge === 10) {
          afterCR = !1;
          continue;
        }
        if (((afterCR = !1), ge === 10 || ge === 13)) {
          if (lineLength === 0) j = ie;
          ((lineLength = 0), (afterCR = ge === 13));
          continue;
        }
        if ((lineLength++, lineLength < na)) continue;
        let Ie = ie + 1;
        if (ce < Ie) ((ce = P.indexOf(10, Ie)), (ce = ce === -1 ? R : ce));
        if (Q < Ie) ((Q = P.indexOf(13, Ie)), (Q = Q === -1 ? R : Q));
        let min = Math.min(ce, Q);
        ((lineLength += min - Ie), (ie = min - 1));
      }
      if (((eventBytes = j >= 0 ? P.length - 1 - j : eventBytes + P.length), eventBytes > maxEventBytes)) {
        M.error(new HttpBodyOverflowError(maxEventBytes, "event"));
        return;
      }
      M.enqueue(P);
    },
  });
}
/**
 * 包装 MCP HTTP 传输的 fetch：限制单个 SSE 事件与响应体大小（解压后计），拒绝不支持的 Content-Encoding，超限抛 HttpBodyOverflowError。
 */
//@ chunk-8t8n4kdh.js:21096-23130 placement
function createBoundedFetch(e, { refusesCodings: n = !1 } = {}) {
  let r = mcpInboundDoorOnFetch();
  return async (s, h) => {
    r?.noteRequests(h?.body);
    let upper = (h?.method ?? "GET").toUpperCase(),
      S = r !== void 0 && alwaysTrue() && typeof DecompressionStream < "u",
      w = await e(s, { ...h, ...(S && { decompress: !1 }) });
    if (!w.body || w.body.locked) return w;
    let P = h?.body;
    if (
      upper === "POST" &&
      typeof P === "string" &&
      P.includes('"jsonrpc"') &&
      (w.status === 202 || (w.ok && isJsonRpcNotificationOrResponse(P)))
    )
      return (
        await w.body.cancel().catch(() => {}),
        new Response(null, { status: w.status, statusText: w.statusText, headers: w.headers })
      );
    let [M, ...j] = (w.headers.get("content-encoding") ?? "")
      .toLowerCase()
      .split(",")
      .map((he) => he.trim())
      .filter((he) => he !== "" && he !== "identity");
    if (n && M !== void 0)
      throw (
        await w.body.cancel(),
        Error(
          "sent a response with a Content-Encoding. Claude Code reads none from a tool container, so it did not read the response.",
        )
      );
    let R = S && w.headers.get("content-length") !== "0";
    if (R && (M === "br" || M === "zstd"))
      throw (
        await w.body.cancel(),
        Error(
          "sent a response compressed with br or zstd. Claude Code reads only gzip and deflate, so it did not read the response.",
        )
      );
    let ce = R && M !== void 0 && j.length === 0 ? ra.get(M) : void 0,
      Q = ce ? w.body.pipeThrough(new DecompressionStream(ce)) : w.body,
      ie = MCP_BODY_LIMIT,
      headers = new Headers(h?.headers);
    if (
      w.ok &&
      ta.test(w.headers.get("content-type") ?? "") &&
      headers.get("accept")?.includes("text/event-stream")
    )
      ie =
        w.status === 200 &&
        (r === void 0 || M === void 0) &&
        (upper === "GET" || headers.get("mcp-method") === "subscriptions/listen")
          ? 1 / 0
          : ea;
    let pipeThrough = Q.pipeThrough(createSseLimitStream(MCP_BODY_LIMIT, ie)),
      G = r?.judging({
        url: String(s),
        isGet: upper === "GET",
        ok: w.ok,
        contentType: w.headers.get("content-type"),
      }),
      Pe = G ? pipeThrough.pipeThrough(G.through) : pipeThrough,
      { headers: headers_2 } = w;
    if (G?.contentType !== void 0)
      ((headers_2 = new Headers(headers_2)), headers_2.set("content-type", G.contentType));
    let nt = w.status >= 200 && w.status <= 599,
      response = new Response(Pe, {
        status: nt ? w.status : 200,
        statusText: w.statusText,
        headers: headers_2,
      });
    if (!nt)
      (Object.defineProperty(response, "status", { value: w.status }),
        Object.defineProperty(response, "ok", { value: w.ok }));
    return (
      Object.defineProperty(response, "url", { value: w.url }),
      Object.defineProperty(response, "redirected", { value: w.redirected }),
      Object.defineProperty(response, "type", { value: w.type }),
      response
    );
  };
}
//@ chunk-8t8n4kdh.js:23130-23172 placement
var aa = new Set(["jsonrpc", "id", "method"]);
//@ chunk-8t8n4kdh.js:23172-23326 placement
function isJsonRpcNotificationOrResponse(e) {
  if (e.includes('"id":') && e.includes('"method":')) return !1;
  let n = Bpe(e, aa);
  return n?.get("jsonrpc") === '"2.0"' && n.has("method") !== n.has("id");
}
//@ chunk-8t8n4kdh.js:23326-23629 placement
class StdoutOverflowError extends Error {
  constructor(e) {
    super(
      `wrote >${Math.round(e / 1024 / 1024)}MB to stdout without a JSON-RPC message boundary. The server is likely writing logs or other non-protocol data to stdout instead of stderr. Disconnecting to prevent unbounded memory growth.`,
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
  overflowed = !1;
  overflowThrown = !1;
  constructor(e, n, r) {
    this.capBytes = e;
    this.onOverflow = n;
    this.onMessage = r;
  }
  append(e) {
    if (this.overflowed) return;
    if (this.byteLength + e.length > this.capBytes) {
      ((this.chunks = []),
        (this.byteLength = 0),
        (this.overflowed = !0),
        this.onOverflow(new StdoutOverflowError(this.capBytes)));
      return;
    }
    (this.chunks.push(e), (this.byteLength += e.length));
  }
  readMessage() {
    if (this.overflowed) {
      if (this.overflowThrown) return null;
      throw ((this.overflowThrown = !0), new StdoutOverflowError(this.capBytes));
    }
    if (this.chunks.length === 0) return null;
    let at = this.chunks.at(-1),
      index = at.indexOf(10);
    if (index === -1) return null;
    let r = this.chunks.length === 1 ? at : Buffer.concat(this.chunks),
      s = r.length - at.length + index,
      replaced = r.toString("utf8", 0, s).replace(/\r$/, ""),
      chunk = r.subarray(s + 1);
    ((this.chunks = chunk.length > 0 ? [chunk] : []), (this.byteLength = chunk.length));
    let S = YNr(replaced);
    return (this.onMessage(S), S);
  }
  clear() {
    ((this.chunks = []), (this.byteLength = 0));
  }
}
//@ chunk-8t8n4kdh.js:24515-24547 placement
var SERVER_DISCOVER_PROBE = "server-discover-probe-";
//@ chunk-8t8n4kdh.js:24547-25800 placement
class BoundedStdioClientTransport extends jr {
  overflowError;
  answeredProbeLate = !1;
  onAnsweredProbeLate;
  constructor(e) {
    super({ ...e, maxBufferSize: z2 });
    this._readBuffer = new BoundedLineBuffer(
      z2,
      (n) => {
        ((this.overflowError = n), queueMicrotask(() => void this.close()));
      },
      (n) => {
        if (
          this._anthropicProbeTimedOut === !0 &&
          "id" in n &&
          typeof n.id === "string" &&
          n.id.startsWith(SERVER_DISCOVER_PROBE) &&
          "result" in n &&
          !this.answeredProbeLate
        )
          ((this.answeredProbeLate = !0), this.onAnsweredProbeLate?.());
      },
    );
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
    if (!(this._readBuffer instanceof BoundedLineBuffer))
      throw Error(
        "BoundedStdioClientTransport: _readBuffer is no longer the BoundedReadBuffer \u2014 " +
          "the SDK transport internals this subclass relies on have changed; re-verify the stdout bound.",
      );
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

export {
  HttpBodyOverflowError,
  createBoundedFetch,
  BoundedStdioClientTransport,
  StdoutOverflowError,
  MCP_BODY_LIMIT,
  Ao,
};

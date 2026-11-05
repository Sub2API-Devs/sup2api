/**
 * services/mcp/boundedTransports.ts
 *
 * 2.1.316 新增：MCP 传输限长：HTTP 响应体/SSE 事件与 stdio 行缓冲上限。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sywnjtqb.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { MAX_STRUCTURED_RESULT_BYTES } from "./mcpCallConstants.js";
import { mcpInboundDoorOnFetch } from "./mcpInboundDoor.js";
import { alwaysTrue } from "../../utils/slowOperations.js";
import { sliceTopLevelValues } from "../../utils/jsonScan.js";
import { deserializeMessage } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { StdioClientTransport } from "../../../vendor/@modelcontextprotocol/client/dist/stdio.mjs";
import { assertNotShuttingDown, trackOrphanStdioServer } from "./connectionLifecycle.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sywnjtqb.js:21375-21547 placement
/**
 * 超出上限时的说明（“所以 Claude Code 停止读取”）。
 */
var MCP_BODY_LIMIT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_DECOMPRESSED_BODY_BYTES;
var SSE_CONTENT_TYPE_RE;
var MIN_LINE_CHARS;
var COMPRESSION_ALIASES;
var STOPPED_READING_NOTE_2;
deferInit("chunk-sywnjtqb.js:21375", () => {
  MCP_BODY_LIMIT = MAX_STRUCTURED_RESULT_BYTES;
  MAX_DECOMPRESSED_BODY_BYTES = 4 * MCP_BODY_LIMIT;
  SSE_CONTENT_TYPE_RE = /^\s*text\/event-stream\s*(?:;|$)/i;
  MIN_LINE_CHARS = 32;
  COMPRESSION_ALIASES = new Map([
    ["gzip", "gzip"],
    ["x-gzip", "gzip"],
    ["deflate", "deflate"],
  ]);
  STOPPED_READING_NOTE_2 = "so Claude Code stopped reading it";
});
//@ chunk-sywnjtqb.js:21547-21832 placement
class HttpBodyOverflowError_2 extends Error {
  constructor(limitBytes, kind) {
    let rounded = Math.round(limitBytes / 1024 / 1024);
    super(
      (kind === "event"
        ? `sent more than ${rounded}MB in one event of an event stream (no blank line ended it)`
        : `sent a response larger than ${rounded}MB (counted after decompression)`) +
        `, ${STOPPED_READING_NOTE_2}.`,
    );
    this.name = "HttpBodyOverflowError";
  }
}
//@ chunk-sywnjtqb.js:21832-22508 placement
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
    async transform(chunk, controller) {
      if (performance.now() - startTime > 8) {
        await new Promise((resolve) => setImmediate(resolve));
        startTime = performance.now();
      }
      bodyBytes += chunk.length;
      if (bodyBytes > maxBodyBytes) {
        controller.error(new HttpBodyOverflowError_2(maxBodyBytes, "body"));
        return;
      }
      if (bodyCapCoversEvents) {
        controller.enqueue(chunk);
        return;
      }
      let lastBlankIndex = -1;
      let { length } = chunk;
      let nextLf = -1;
      let nextCr = -1;
      for (let idx = 0; idx < length; idx++) {
        let byte = chunk[idx];
        if (afterCR && byte === 10) {
          afterCR = false;
          continue;
        }
        afterCR = false;
        if (byte === 10 || byte === 13) {
          if (lineLength === 0) lastBlankIndex = idx;
          lineLength = 0;
          afterCR = byte === 13;
          continue;
        }
        lineLength++;
        if (lineLength < MIN_LINE_CHARS) continue;
        let after = idx + 1;
        if (nextLf < after) {
          nextLf = chunk.indexOf(10, after);
          nextLf = nextLf === -1 ? length : nextLf;
        }
        if (nextCr < after) {
          nextCr = chunk.indexOf(13, after);
          nextCr = nextCr === -1 ? length : nextCr;
        }
        let min = Math.min(nextLf, nextCr);
        lineLength += min - after;
        idx = min - 1;
      }
      eventBytes = lastBlankIndex >= 0 ? chunk.length - 1 - lastBlankIndex : eventBytes + chunk.length;
      if (eventBytes > maxEventBytes) {
        controller.error(new HttpBodyOverflowError_2(maxEventBytes, "event"));
        return;
      }
      controller.enqueue(chunk);
    },
  });
}
//@ chunk-sywnjtqb.js:22508-24539 placement
/**
 * 包装 MCP HTTP 传输的 fetch：限制单个 SSE 事件与响应体大小（解压后计），拒绝不支持的 Content-Encoding，超限抛 HttpBodyOverflowError。
 */
function createBoundedFetch(fetchFn, { refusesCodings = false } = {}) {
  let door = mcpInboundDoorOnFetch();
  return async (input, init) => {
    door?.noteRequests(init?.body);
    let upper = (init?.method ?? "GET").toUpperCase();
    let decompressManually = door !== undefined && alwaysTrue() && typeof DecompressionStream !== "undefined";
    let response = await fetchFn(input, {
      ...init,
      ...(decompressManually && {
        decompress: false,
      }),
    });
    if (!response.body || response.body.locked) return response;
    let body = init?.body;
    if (
      upper === "POST" &&
      typeof body === "string" &&
      body.includes('"jsonrpc"') &&
      (response.status === 202 || (response.ok && isJsonRpcNotificationOrResponse(body)))
    ) {
      await response.body.cancel().catch(() => {});
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    let [firstCoding, ...restCodings] = (response.headers.get("content-encoding") ?? "")
      .toLowerCase()
      .split(",")
      .map((coding) => coding.trim())
      .filter((coding) => coding !== "" && coding !== "identity");
    if (refusesCodings && firstCoding !== undefined) {
      await response.body.cancel();
      throw Error(
        "sent a response with a Content-Encoding. Claude Code reads none from a tool container, so it did not read the response.",
      );
    }
    let canDecompress = decompressManually && response.headers.get("content-length") !== "0";
    if (canDecompress && (firstCoding === "br" || firstCoding === "zstd")) {
      await response.body.cancel();
      throw Error(
        "sent a response compressed with br or zstd. Claude Code reads only gzip and deflate, so it did not read the response.",
      );
    }
    let codingName =
      canDecompress && firstCoding !== undefined && restCodings.length === 0
        ? COMPRESSION_ALIASES.get(firstCoding)
        : undefined;
    let decodedBody = codingName
      ? response.body.pipeThrough(new DecompressionStream(codingName))
      : response.body;
    let maxBodyBytes = MCP_BODY_LIMIT;
    let headers = new Headers(init?.headers);
    if (
      response.ok &&
      SSE_CONTENT_TYPE_RE.test(response.headers.get("content-type") ?? "") &&
      headers.get("accept")?.includes("text/event-stream")
    )
      maxBodyBytes =
        response.status === 200 &&
        (door === undefined || firstCoding === undefined) &&
        (upper === "GET" || headers.get("mcp-method") === "subscriptions/listen")
          ? 1 / 0
          : MAX_DECOMPRESSED_BODY_BYTES;
    let limitedBody = decodedBody.pipeThrough(createSseLimitStream(MCP_BODY_LIMIT, maxBodyBytes));
    let judgement = door?.judging({
      url: String(input),
      isGet: upper === "GET",
      ok: response.ok,
      contentType: response.headers.get("content-type"),
    });
    let finalBody = judgement ? limitedBody.pipeThrough(judgement.through) : limitedBody;
    let { headers: headers_2 } = response;
    if (judgement?.contentType !== undefined) {
      headers_2 = new Headers(headers_2);
      headers_2.set("content-type", judgement.contentType);
    }
    let statusOk = response.status >= 200 && response.status <= 599;
    let response_2 = new Response(finalBody, {
      status: statusOk ? response.status : 200,
      statusText: response.statusText,
      headers: headers_2,
    });
    if (!statusOk) {
      Object.defineProperty(response_2, "status", {
        value: response.status,
      });
      Object.defineProperty(response_2, "ok", {
        value: response.ok,
      });
    }
    Object.defineProperty(response_2, "url", {
      value: response.url,
    });
    Object.defineProperty(response_2, "redirected", {
      value: response.redirected,
    });
    Object.defineProperty(response_2, "type", {
      value: response.type,
    });
    return response_2;
  };
}
//@ chunk-sywnjtqb.js:24539-24581 placement
/**
 * JSON-RPC 消息的基本键集合。
 */
var JSONRPC_MESSAGE_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sywnjtqb.js:24539", () => {
  JSONRPC_MESSAGE_KEYS = new Set(["jsonrpc", "id", "method"]);
});
//@ chunk-sywnjtqb.js:24581-24735 placement
function isJsonRpcNotificationOrResponse(body) {
  if (body.includes('"id":') && body.includes('"method":')) return false;
  let fields = sliceTopLevelValues(body, JSONRPC_MESSAGE_KEYS);
  return fields?.get("jsonrpc") === '"2.0"' && fields.has("method") !== fields.has("id");
}
//@ chunk-sywnjtqb.js:24735-25038 placement
class StdoutOverflowError_2 extends Error {
  constructor(capBytes) {
    super(
      `wrote >${Math.round(capBytes / 1024 / 1024)}MB to stdout without a JSON-RPC message boundary. The server is likely writing logs or other non-protocol data to stdout instead of stderr. Disconnecting to prevent unbounded memory growth.`,
    );
    this.name = "StdoutOverflowError";
  }
}
//@ chunk-sywnjtqb.js:25038-25924 placement
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
  append(chunk) {
    if (this.overflowed) return;
    if (this.byteLength + chunk.length > this.capBytes) {
      this.chunks = [];
      this.byteLength = 0;
      this.overflowed = true;
      this.onOverflow(new StdoutOverflowError_2(this.capBytes));
      return;
    }
    this.chunks.push(chunk);
    this.byteLength += chunk.length;
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
    let joined = this.chunks.length === 1 ? last : Buffer.concat(this.chunks);
    let lineEnd = joined.length - last.length + index;
    let line = joined.toString("utf8", 0, lineEnd).replace(/\r$/, "");
    let chunk = joined.subarray(lineEnd + 1);
    this.chunks = chunk.length > 0 ? [chunk] : [];
    this.byteLength = chunk.length;
    let message = deserializeMessage(line);
    this.onMessage(message);
    return message;
  }
  clear() {
    this.chunks = [];
    this.byteLength = 0;
  }
}
//@ chunk-sywnjtqb.js:25924-25956 placement
var SERVER_DISCOVER_PROBE = "server-discover-probe-";
//@ chunk-sywnjtqb.js:25956-27209 placement
let BoundedStdioClientTransport; // deferred: uses StdioClientTransport (../../../vendor/@modelcontextprotocol/client/dist/stdio.mjs) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sywnjtqb.js:25956", () => {
  BoundedStdioClientTransport = class BoundedStdioClientTransport extends StdioClientTransport {
    overflowError;
    answeredProbeLate = false;
    onAnsweredProbeLate;
    constructor(options) {
      super({
        ...options,
        maxBufferSize: MAX_STRUCTURED_RESULT_BYTES,
      });
      this._readBuffer = new BoundedLineBuffer(
        MAX_STRUCTURED_RESULT_BYTES,
        (overflowError) => {
          this.overflowError = overflowError;
          queueMicrotask(() => void this.close());
        },
        (message) => {
          if (
            this._anthropicProbeTimedOut === true &&
            "id" in message &&
            typeof message.id === "string" &&
            message.id.startsWith(SERVER_DISCOVER_PROBE) &&
            "result" in message &&
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
      let alreadyStarted = this.serverProcess !== undefined;
      let startPromise = super.start();
      let serverProcess = this.serverProcess;
      if (!alreadyStarted && serverProcess?.pid !== undefined)
        this.#e = trackOrphanStdioServer(serverProcess);
      await startPromise;
      if (!alreadyStarted && serverProcess === undefined) this.#t(this.serverProcess);
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
    #t(proc) {
      if (proc?.pid !== undefined) {
        this.#e = trackOrphanStdioServer(proc);
        return;
      }
      if (this.pid !== null)
        throw Error(
          "BoundedStdioClientTransport: the SDK transport no longer keeps its child process on _process \u2014 " +
            "the exit-time reaper for a still-connecting stdio server cannot arm; re-verify BoundedStdioClientTransport.start() against the SDK transport internals.",
        );
    }
  };
});
export {
  HttpBodyOverflowError_2,
  createBoundedFetch,
  BoundedStdioClientTransport,
  StdoutOverflowError_2,
  MCP_BODY_LIMIT,
  STOPPED_READING_NOTE_2,
};

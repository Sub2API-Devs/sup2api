/**
 * services/mcp/transportGuards.ts
 *
 * 2.1.316 新增。MCP 传输防护：限制 HTTP/SSE/stdio 响应大小与编码，claude.ai 代理的本地握手应答。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h44h5gdv.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { looseObject, array, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-h44h5gdv.js:35724-35896 placement
/**
 * 超出上限时的说明。
 */
var HTTP_BODY_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_DECOMPRESSED_BODY_BYTES;
var SSE_CONTENT_TYPE_RE;
var MIN_LINE_CHARS;
var COMPRESSION_ALIASES;
var STOPPED_READING_NOTE;
deferInit("chunk-h44h5gdv.js:35724", () => {
  HTTP_BODY_LIMITS = MAX_STRUCTURED_RESULT_BYTES;
  MAX_DECOMPRESSED_BODY_BYTES = 4 * HTTP_BODY_LIMITS;
  SSE_CONTENT_TYPE_RE = /^\s*text\/event-stream\s*(?:;|$)/i;
  MIN_LINE_CHARS = 32;
  COMPRESSION_ALIASES = new Map([
    ["gzip", "gzip"],
    ["x-gzip", "gzip"],
    ["deflate", "deflate"],
  ]);
  STOPPED_READING_NOTE = "so Claude Code stopped reading it";
});
//@ chunk-h44h5gdv.js:35896-36181 placement
class HttpBodyOverflowError extends Error {
  constructor(limitBytes, kind) {
    let rounded = Math.round(limitBytes / 1024 / 1024);
    super(
      (kind === "event"
        ? `sent more than ${rounded}MB in one event of an event stream (no blank line ended it)`
        : `sent a response larger than ${rounded}MB (counted after decompression)`) +
        `, ${STOPPED_READING_NOTE}.`,
    );
    this.name = "HttpBodyOverflowError";
  }
}
//@ chunk-h44h5gdv.js:36181-36850 placement
/**
 * 限制正文大小并让出事件循环的流
 */
function boundedBodyStream(maxEventBytes, maxBodyBytes) {
  let bodyBytes = 0;
  let eventBytes = 0;
  let bodyFitsOneChunk = maxBodyBytes <= maxEventBytes;
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
        controller.error(new HttpBodyOverflowError(maxBodyBytes, "body"));
        return;
      }
      if (bodyFitsOneChunk) {
        controller.enqueue(chunk);
        return;
      }
      let lastBlankLineAt = -1;
      let { length } = chunk;
      let nextLF = -1;
      let nextCR = -1;
      for (let j = 0; j < length; j++) {
        let byte = chunk[j];
        if (afterCR && byte === 10) {
          afterCR = false;
          continue;
        }
        afterCR = false;
        if (byte === 10 || byte === 13) {
          if (lineLength === 0) lastBlankLineAt = j;
          lineLength = 0;
          afterCR = byte === 13;
          continue;
        }
        lineLength++;
        if (lineLength < MIN_LINE_CHARS) continue;
        let lineEnd = j + 1;
        if (nextLF < lineEnd) {
          nextLF = chunk.indexOf(10, lineEnd);
          nextLF = nextLF === -1 ? length : nextLF;
        }
        if (nextCR < lineEnd) {
          nextCR = chunk.indexOf(13, lineEnd);
          nextCR = nextCR === -1 ? length : nextCR;
        }
        let min = Math.min(nextLF, nextCR);
        lineLength += min - lineEnd;
        j = min - 1;
      }
      eventBytes = lastBlankLineAt >= 0 ? chunk.length - 1 - lastBlankLineAt : eventBytes + chunk.length;
      if (eventBytes > maxEventBytes) {
        controller.error(new HttpBodyOverflowError(maxEventBytes, "event"));
        return;
      }
      controller.enqueue(chunk);
    },
  });
}
//@ chunk-h44h5gdv.js:36850-38871 placement
/**
 * 限制响应大小与编码的 fetch 包装
 */
function boundedFetch(fetchImpl, { refusesCodings = false } = {}) {
  let inboundDoor = mcpInboundDoorOnFetch();
  return async (input, init) => {
    inboundDoor?.noteRequests(init?.body);
    let upper = (init?.method ?? "GET").toUpperCase();
    let manualDecompress =
      inboundDoor !== undefined && alwaysTrue() && typeof DecompressionStream !== "undefined";
    let response = await fetchImpl(input, {
      ...init,
      ...(manualDecompress && {
        decompress: false,
      }),
    });
    if (!response.body || response.body.locked) return response;
    let body = init?.body;
    if (
      upper === "POST" &&
      typeof body === "string" &&
      body.includes('"jsonrpc"') &&
      (response.status === 202 || (response.ok && isJsonRpcRequestOrNotification(body)))
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
    let hasBody = manualDecompress && response.headers.get("content-length") !== "0";
    if (hasBody && (firstCoding === "br" || firstCoding === "zstd")) {
      await response.body.cancel();
      throw Error(
        "sent a response compressed with br or zstd. Claude Code reads only gzip and deflate, so it did not read the response.",
      );
    }
    let decompressed =
      hasBody && firstCoding !== undefined && restCodings.length === 0
        ? COMPRESSION_ALIASES.get(firstCoding)
        : undefined;
    let rawBody = decompressed
      ? response.body.pipeThrough(new DecompressionStream(decompressed))
      : response.body;
    let eventCapBytes = HTTP_BODY_LIMITS;
    let headers = new Headers(init?.headers);
    if (
      response.ok &&
      SSE_CONTENT_TYPE_RE.test(response.headers.get("content-type") ?? "") &&
      headers.get("accept")?.includes("text/event-stream")
    )
      eventCapBytes =
        response.status === 200 &&
        (inboundDoor === undefined || firstCoding === undefined) &&
        (upper === "GET" || headers.get("mcp-method") === "subscriptions/listen")
          ? 1 / 0
          : MAX_DECOMPRESSED_BODY_BYTES;
    let boundedBody = rawBody.pipeThrough(boundedBodyStream(HTTP_BODY_LIMITS, eventCapBytes));
    let door = inboundDoor?.judging({
      url: String(input),
      isGet: upper === "GET",
      ok: response.ok,
      contentType: response.headers.get("content-type"),
    });
    let bodyStream = door ? boundedBody.pipeThrough(door.through) : boundedBody;
    let { headers: headers_2 } = response;
    if (door?.contentType !== undefined) {
      headers_2 = new Headers(headers_2);
      headers_2.set("content-type", door.contentType);
    }
    let isHttpStatus = response.status >= 200 && response.status <= 599;
    let response_2 = new Response(bodyStream, {
      status: isHttpStatus ? response.status : 200,
      statusText: response.statusText,
      headers: headers_2,
    });
    if (!isHttpStatus) {
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
//@ chunk-h44h5gdv.js:38871-38913 placement
var JSONRPC_ENVELOPE_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h44h5gdv.js:38871", () => {
  JSONRPC_ENVELOPE_KEYS = new Set(["jsonrpc", "id", "method"]);
});
//@ chunk-h44h5gdv.js:38913-39067 placement
/**
 * 文本是否为 JSON-RPC 请求或通知
 */
function isJsonRpcRequestOrNotification(body) {
  if (body.includes('"id":') && body.includes('"method":')) return false;
  let topLevel = sliceTopLevelValues(body, JSONRPC_ENVELOPE_KEYS);
  return topLevel?.get("jsonrpc") === '"2.0"' && topLevel.has("method") !== topLevel.has("id");
}
//@ chunk-h44h5gdv.js:39067-39370 placement
class StdoutOverflowError extends Error {
  constructor(capBytes) {
    super(
      `wrote >${Math.round(capBytes / 1024 / 1024)}MB to stdout without a JSON-RPC message boundary. The server is likely writing logs or other non-protocol data to stdout instead of stderr. Disconnecting to prevent unbounded memory growth.`,
    );
    this.name = "StdoutOverflowError";
  }
}
//@ chunk-h44h5gdv.js:39370-40201 placement
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
  append(chunk) {
    if (this.overflowed) return;
    if (this.byteLength + chunk.length > this.capBytes) {
      this.chunks = [];
      this.byteLength = 0;
      this.overflowed = true;
      this.onOverflow(new StdoutOverflowError(this.capBytes));
      return;
    }
    this.chunks.push(chunk);
    this.byteLength += chunk.length;
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
    let assembled = this.chunks.length === 1 ? last : Buffer.concat(this.chunks);
    let lineEnd = assembled.length - last.length + index;
    let line = assembled.toString("utf8", 0, lineEnd).replace(/\r$/, "");
    let chunk = assembled.subarray(lineEnd + 1);
    this.chunks = chunk.length > 0 ? [chunk] : [];
    this.byteLength = chunk.length;
    return deserializeMessage(line);
  }
  clear() {
    this.chunks = [];
    this.byteLength = 0;
  }
}
//@ chunk-h44h5gdv.js:40201-40966 placement
/**
 * 限制输出大小的 stdio 传输
 */
let BoundedStdioTransport; // deferred: uses StdioClientTransport (../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/stdio.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h44h5gdv.js:40201", () => {
  BoundedStdioTransport = class BoundedStdioTransport extends StdioClientTransport {
    overflowError;
    constructor(options) {
      super(options);
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
      let alreadyStarted = this.serverProcess !== undefined;
      let startPromise = super.start();
      let serverProcess = this.serverProcess;
      if (!alreadyStarted && serverProcess?.pid !== undefined)
        this.#e = trackOrphanStdioServer(serverProcess);
      await startPromise;
      if (!alreadyStarted && serverProcess === undefined) this.#t(this.serverProcess);
    }
    handOffExitCleanup() {
      this.#e?.();
      this.#e = undefined;
    }
    #t(child) {
      if (child?.pid !== undefined) {
        this.#e = trackOrphanStdioServer(child);
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
//@ chunk-h44h5gdv.js:40966-41039 placement
function isStatelessClaudeAiProxy(serverRef) {
  return serverRef.type === "claudeai-proxy" && serverRef.stateless === true && isStatelessSkipInitEnabled();
}
//@ chunk-h44h5gdv.js:41039-41548 placement
function getCachedInitializeResult(serverRef) {
  if (!isStatelessClaudeAiProxy(serverRef) || serverRef.type !== "claudeai-proxy") return;
  if (serverRef.cachedInitResponse == null) return;
  let parseResult = InitializeResultSchema.safeParse(serverRef.cachedInitResponse);
  if (!parseResult.success) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${serverRef.id} failed InitializeResult validation \u2014 falling back to real initialize`,
    );
    return;
  }
  if (!SUPPORTED_PROTOCOL_VERSIONS.includes(parseResult.data.protocolVersion)) {
    logForDebugging(
      `[claudeai-mcp] cached_init_response for ${serverRef.id} carries unsupported protocolVersion ${sanitizeCallMark(parseResult.data.protocolVersion)} \u2014 falling back to real initialize`,
    );
    return;
  }
  return parseResult.data;
}
//@ chunk-h44h5gdv.js:41548-41662 placement
var discoverResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h44h5gdv.js:41548", () => {
  discoverResponseSchema = DoctorLazy(() =>
    looseObject({
      supportedVersions: array(stringSchema()),
      capabilities: looseObject({}),
      serverInfo: looseObject({
        name: stringSchema(),
        version: stringSchema(),
      }).optional(),
    }),
  );
});
//@ chunk-h44h5gdv.js:41662-42082 placement
/**
 * claude.ai 代理的缓存 discover 结果
 */
function cachedDiscoverOutcome(serverRef) {
  if (!isStatelessClaudeAiProxy(serverRef) || serverRef.type !== "claudeai-proxy") return;
  if (serverRef.discoverSupport === "legacy") return "method-not-found";
  if (serverRef.discoverSupport !== "supported") return;
  if (serverRef.cachedDiscoverResponse == null) return;
  let parseResult = discoverResponseSchema().safeParse(serverRef.cachedDiscoverResponse);
  if (!parseResult.success) {
    logForDebugging(
      `[claudeai-mcp] cached_discover_response for ${serverRef.id} failed DiscoverResult shape check \u2014 passing server/discover through`,
    );
    return;
  }
  return {
    result: parseResult.data,
  };
}
//@ chunk-h44h5gdv.js:42082-42622 placement
function answerHandshakeLocally(transport, cachedInitialize, discoverAnswer) {
  let originalSend = transport.send.bind(transport);
  transport.send = async (message, requestOptions) => {
    if (cachedInitialize !== undefined && isJSONRPCRequest(message) && message.method === "initialize") {
      let response = {
        jsonrpc: "2.0",
        id: message.id,
        result: cachedInitialize,
      };
      queueMicrotask(() => transport.onmessage?.(response));
      return;
    }
    if (discoverAnswer !== undefined && isJSONRPCRequest(message) && message.method === "server/discover") {
      let response =
        discoverAnswer === "method-not-found"
          ? {
              jsonrpc: "2.0",
              id: message.id,
              error: {
                code: ErrorCode.MethodNotFound,
                message: "server/discover resolved locally as unsupported",
              },
            }
          : {
              jsonrpc: "2.0",
              id: message.id,
              result: discoverAnswer.result,
            };
      queueMicrotask(() => transport.onmessage?.(response));
      return;
    }
    if (isJSONRPCNotification(message) && message.method === "notifications/initialized") return;
    return originalSend(message, requestOptions);
  };
}
//@ chunk-h44h5gdv.js:42622-42911 placement
function answerGetStreamLocally(originalFetch, proxyUrl) {
  let href = new URL(proxyUrl).href;
  return async (input, init) => {
    if ((init?.method ?? "GET").toUpperCase() !== "GET") return originalFetch(input, init);
    let requestHref =
      typeof input === "object" && input !== null && "url" in input ? input.url : String(input);
    if (new URL(requestHref).href === href)
      return new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
      });
    return originalFetch(input, init);
  };
}
//@ chunk-h44h5gdv.js:42943-42981 placement
/**
 * 懒加载的网络相关模块（当前为 chunk 引用）。
 */
var netModule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-h44h5gdv.js:42943", () => {
  netModule = require("./callMcpToolWithAutoBackground.lazy.js");
});
export {
  HttpBodyOverflowError,
  boundedFetch,
  isStatelessClaudeAiProxy,
  answerGetStreamLocally,
  BoundedStdioTransport,
  getCachedInitializeResult,
  cachedDiscoverOutcome,
  answerHandshakeLocally,
  StdoutOverflowError,
  HTTP_BODY_LIMITS,
  STOPPED_READING_NOTE,
  netModule,
};

/**
 * @hono/node-server/dist/index.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @hono/node-server@1.19.14..1.19.17
 * pieces: chunk-cacgqezg.js (17)
 * attribution: esm-fingerprint 17
 */
import { Readable } from "stream";
import { Http2ServerRequest, constants } from "http2";
import fe from "crypto";
import { logForDebugging } from "../../../../src/utils/debug.js";

//@ chunk-cacgqezg.js:17775-19241 esm-fingerprint
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var toRequestError = (error) => {
  if (error instanceof RequestError) return error;
  return new RequestError(error.message, {
    cause: error,
  });
};
var GlobalRequest = global.Request;
var CachedRequest = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) input = input[getRequestCache]();
    if (typeof options?.body?.getReader !== "undefined") options.duplex ??= "half";
    super(input, options);
  }
};
var newHeadersFromIncoming = (incoming) => {
  let headerRecord = [];
  let rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    let { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) !== 58) headerRecord.push([key, value]);
  }
  return new Headers(headerRecord);
};
var wrapBodyStream = Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  let init = {
    method,
    headers,
    signal: abortController.signal,
  };
  if (method === "TRACE") {
    init.method = "GET";
    let req = new CachedRequest(url, init);
    Object.defineProperty(req, "method", {
      get() {
        return "TRACE";
      },
    });
    return req;
  }
  if (!(method === "GET" || method === "HEAD"))
    if ("rawBody" in incoming && incoming.rawBody instanceof Buffer)
      init.body = new ReadableStream({
        start(controller) {
          controller.enqueue(incoming.rawBody);
          controller.close();
        },
      });
    else if (incoming[wrapBodyStream]) {
      let reader;
      init.body = new ReadableStream({
        async pull(controller) {
          try {
            reader ||= Readable.toWeb(incoming).getReader();
            let { done, value } = await reader.read();
            if (done) controller.close();
            else controller.enqueue(value);
          } catch (error) {
            controller.error(error);
          }
        },
      });
    } else init.body = Readable.toWeb(incoming);
  return new CachedRequest(url, init);
};
var getRequestCache = Symbol("getRequestCache");
var requestCache = Symbol("requestCache");
var incomingKey = Symbol("incomingKey");
var urlKey = Symbol("urlKey");
var headersKey = Symbol("headersKey");
var abortControllerKey = Symbol("abortControllerKey");
var getAbortController = Symbol("getAbortController");
var requestPrototype = {
  get method() {
    return this[incomingKey].method || "GET";
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return (this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]));
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return (this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this.headers,
      this[incomingKey],
      this[abortControllerKey],
    ));
  },
};
//@ chunk-cacgqezg.js:19241-19448 esm-fingerprint
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive",
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    },
  });
});
//@ chunk-cacgqezg.js:19448-19589 esm-fingerprint
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function () {
      return this[getRequestCache]()[k]();
    },
  });
});
//@ chunk-cacgqezg.js:19589-19831 esm-fingerprint
Object.defineProperty(requestPrototype, Symbol.for("nodejs.util.inspect.custom"), {
  value: function (depth, options, inspectFn) {
    let props = {
      method: this.method,
      url: this.url,
      headers: this.headers,
      nativeRequest: this[requestCache],
    };
    return `Request (lightweight) ${inspectFn(props, {
      ...options,
      depth: depth == null ? null : depth - 1,
    })}`;
  },
});
//@ chunk-cacgqezg.js:19831-19868 esm-fingerprint
Object.setPrototypeOf(requestPrototype, CachedRequest.prototype);
//@ chunk-cacgqezg.js:19868-21306 esm-fingerprint
var newRequest = (incoming, defaultHostname) => {
  let req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  let incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof Http2ServerRequest)
      throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    try {
      let url2 = new URL(incomingUrl);
      req[urlKey] = url2.href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", {
        cause: e,
      });
    }
    return req;
  }
  let host =
    (incoming instanceof Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) throw new RequestError("Missing host header");
  let scheme;
  if (incoming instanceof Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) throw new RequestError("Unsupported scheme");
  } else scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  let url = new URL(`${scheme}://${host}${incomingUrl}`);
  if (url.hostname.length !== host.length && url.hostname !== host.replace(/:\d+$/, ""))
    throw new RequestError("Invalid host header");
  req[urlKey] = url.href;
  return req;
};
var responseCache = Symbol("responseCache");
var getResponseCache = Symbol("getResponseCache");
var cacheKey = Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #t;
  #e;
  [getResponseCache]() {
    delete this[cacheKey];
    return (this[responseCache] ||= new GlobalResponse(this.#t, this.#e));
  }
  constructor(body, init) {
    let headers;
    this.#t = body;
    if (init instanceof _Response) {
      let cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#e = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#e = init.#e;
        headers = new Headers(init.#e.headers);
      }
    } else this.#e = init;
    if (
      typeof body === "string" ||
      typeof body?.getReader !== "undefined" ||
      body instanceof Blob ||
      body instanceof Uint8Array
    )
      this[cacheKey] = [init?.status || 200, body, headers || init?.headers];
  }
  get headers() {
    let cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers))
        cache[2] = new Headers(
          cache[2] || {
            "content-type": "text/plain; charset=UTF-8",
          },
        );
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    let status = this.status;
    return status >= 200 && status < 300;
  }
};
//@ chunk-cacgqezg.js:21306-21458 esm-fingerprint
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    },
  });
});
//@ chunk-cacgqezg.js:21458-21609 esm-fingerprint
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function () {
      return this[getResponseCache]()[k]();
    },
  });
});
//@ chunk-cacgqezg.js:21609-21861 esm-fingerprint
Object.defineProperty(Response2.prototype, Symbol.for("nodejs.util.inspect.custom"), {
  value: function (depth, options, inspectFn) {
    let props = {
      status: this.status,
      headers: this.headers,
      ok: this.ok,
      nativeResponse: this[responseCache],
    };
    return `Response (lightweight) ${inspectFn(props, {
      ...options,
      depth: depth == null ? null : depth - 1,
    })}`;
  },
});
//@ chunk-cacgqezg.js:21861-21888 esm-fingerprint
Object.setPrototypeOf(Response2, GlobalResponse);
//@ chunk-cacgqezg.js:21888-21935 esm-fingerprint
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
//@ chunk-cacgqezg.js:21935-22033 esm-fingerprint
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(undefined))]);
}
//@ chunk-cacgqezg.js:22033-22406 esm-fingerprint
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  let cancel = (error) => {
    reader.cancel(error).catch(() => {});
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
  });
  function handleStreamError(error) {
    if (error) writable.destroy(error);
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) writable.end();
      else if (!writable.write(value)) writable.once("drain", onDrain);
      else return reader.read().then(flow, handleStreamError);
    } catch (e) {
      handleStreamError(e);
    }
  }
}
//@ chunk-cacgqezg.js:22406-22533 esm-fingerprint
function writeFromReadableStream(stream, writable) {
  if (stream.locked) throw TypeError("ReadableStream is locked.");
  else if (writable.destroyed) return;
  return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
//@ chunk-cacgqezg.js:22533-22789 esm-fingerprint
var buildOutgoingHttpHeaders = (headers) => {
  let res = {};
  if (!(headers instanceof Headers)) headers = new Headers(headers ?? undefined);
  let cookies = [];
  for (let [k, v] of headers)
    if (k === "set-cookie") cookies.push(v);
    else res[k] = v;
  if (cookies.length > 0) res["set-cookie"] = cookies;
  res["content-type"] ??= "text/plain; charset=UTF-8";
  return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
//@ chunk-cacgqezg.js:22789-22834 esm-fingerprint
if (typeof global.crypto === "undefined") global.crypto = fe;
//@ chunk-cacgqezg.js:22834-26208 esm-fingerprint
var outgoingEnded = Symbol("outgoingEnded");
var incomingDraining = Symbol("incomingDraining");
var DRAIN_TIMEOUT_MS = 500;
var MAX_DRAIN_BYTES = 67108864;
var drainIncoming = (incoming) => {
  let incomingWithDrainState = incoming;
  if (incoming.destroyed || incomingWithDrainState[incomingDraining]) return;
  incomingWithDrainState[incomingDraining] = true;
  if (incoming instanceof Http2ServerRequest) {
    try {
      incoming.stream?.close?.(constants.NGHTTP2_NO_ERROR);
    } catch {}
    return;
  }
  let bytesRead = 0;
  let cleanup = () => {
    clearTimeout(timer);
    incoming.off("data", onData);
    incoming.off("end", cleanup);
    incoming.off("error", cleanup);
  };
  let forceClose = () => {
    cleanup();
    let socket = incoming.socket;
    if (socket && !socket.destroyed) socket.destroySoon();
  };
  let timer = setTimeout(forceClose, DRAIN_TIMEOUT_MS);
  timer.unref?.();
  let onData = (chunk) => {
    bytesRead += chunk.length;
    if (bytesRead > MAX_DRAIN_BYTES) forceClose();
  };
  incoming.on("data", onData);
  incoming.on("end", cleanup);
  incoming.on("error", cleanup);
  incoming.resume();
};
var handleRequestError = () =>
  new Response(null, {
    status: 400,
  });
var handleFetchError = (error) =>
  new Response(null, {
    status:
      error instanceof Error && (error.name === "TimeoutError" || error.constructor.name === "TimeoutError")
        ? 504
        : 500,
  });
var handleResponseError = (error, outgoing) => {
  let err =
    error instanceof Error
      ? error
      : Error("unknown error", {
          cause: error,
        });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") console.info("The user aborted a request.");
  else {
    console.error(error);
    if (!outgoing.headersSent)
      outgoing.writeHead(500, {
        "Content-Type": "text/plain",
      });
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) outgoing.flushHeaders();
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  let hasContentLength = false;
  if (!header)
    header = {
      "content-type": "text/plain; charset=UTF-8",
    };
  else if (header instanceof Headers) {
    hasContentLength = header.has("content-length");
    header = buildOutgoingHttpHeaders(header);
  } else if (Array.isArray(header)) {
    let headerObj = new Headers(header);
    hasContentLength = headerObj.has("content-length");
    header = buildOutgoingHttpHeaders(headerObj);
  } else
    for (let key in header)
      if (key.length === 14 && key.toLowerCase() === "content-length") {
        hasContentLength = true;
        break;
      }
  if (!hasContentLength) {
    if (typeof body === "string") header["Content-Length"] = Buffer.byteLength(body);
    else if (body instanceof Uint8Array) header["Content-Length"] = body.byteLength;
    else if (body instanceof Blob) header["Content-Length"] = body.size;
  }
  outgoing.writeHead(status, header);
  if (typeof body === "string" || body instanceof Uint8Array) outgoing.end(body);
  else if (body instanceof Blob) outgoing.end(new Uint8Array(await body.arrayBuffer()));
  else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch((e) => handleResponseError(e, outgoing));
  }
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res))
    if (options.errorHandler)
      try {
        res = await res;
      } catch (err) {
        let errRes = await options.errorHandler(err);
        if (!errRes) return;
        res = errRes;
      }
    else res = await res.catch(handleFetchError);
  if (cacheKey in res) return responseViaCache(res, outgoing);
  let resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  if (res.body) {
    let reader = res.body.getReader();
    let values = [];
    let done = false;
    let currentReadPromise = undefined;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        let chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve) => setTimeout(resolve));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = undefined;
        if (chunk.value) values.push(chunk.value);
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord))
        resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values.forEach((value) => {
      outgoing.write(value);
    });
    if (done) outgoing.end();
    else {
      if (values.length === 0) flushHeaders(outgoing);
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]);
  else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  let autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== CachedRequest) {
    Object.defineProperty(global, "Request", {
      value: CachedRequest,
    });
    Object.defineProperty(global, "Response", {
      value: Response2,
    });
  }
  return async (incoming, outgoing) => {
    let res;
    let req;
    try {
      req = newRequest(incoming, options.hostname);
      let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
      if (!incomingEnded) {
        incoming[wrapBodyStream] = true;
        incoming.on("end", () => {
          incomingEnded = true;
        });
        if (incoming instanceof Http2ServerRequest)
          outgoing[outgoingEnded] = () => {
            if (!incomingEnded)
              setTimeout(() => {
                if (!incomingEnded)
                  setTimeout(() => {
                    drainIncoming(incoming);
                  });
              });
          };
        outgoing.on("finish", () => {
          if (!incomingEnded) drainIncoming(incoming);
        });
      }
      outgoing.on("close", () => {
        if (req[abortControllerKey]) {
          if (incoming.errored) req[abortControllerKey].abort(incoming.errored.toString());
          else if (!outgoing.writableFinished)
            req[abortControllerKey].abort("Client connection prematurely closed.");
        }
        if (!incomingEnded)
          setTimeout(() => {
            if (!incomingEnded)
              setTimeout(() => {
                drainIncoming(incoming);
              });
          });
      });
      res = fetchCallback(req, {
        incoming,
        outgoing,
      });
      if (cacheKey in res) return responseViaCache(res, outgoing);
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(req ? e : toRequestError(e));
          if (!res) return;
        } else if (!req) res = handleRequestError();
        else res = handleFetchError(e);
      } else return handleResponseError(e, outgoing);
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};
export { getRequestListener };

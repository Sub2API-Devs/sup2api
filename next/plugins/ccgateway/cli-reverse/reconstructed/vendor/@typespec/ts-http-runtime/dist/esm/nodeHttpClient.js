/**
 * @typespec/ts-http-runtime/dist/esm/nodeHttpClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (10)
 * attribution: esm-layout 1, esm-fingerprint 9
 */
import { Transform } from "stream";
import * as httpModule from "http";
import * as httpsModule from "https";
import * as zlibModule from "zlib";
import { AbortError_2, RestError } from "./restError.js";
import { Sanitizer } from "./util/sanitizer.js";
import { logger_2 } from "./log.js";
import { createHttpHeaders } from "./pipelineRequest.js";

//@ chunk-mrx6y2r5.js:37932-37942 esm-layout
var DEFAULT_TLS_SETTINGS = {};
//@ chunk-mrx6y2r5.js:37942-37994 esm-fingerprint
function isReadableStream(body) {
  return body && typeof body.pipe === "function";
}
//@ chunk-mrx6y2r5.js:37994-38224 esm-fingerprint
function isStreamComplete(stream) {
  if (stream.readable === false) return Promise.resolve();
  return new Promise((resolve) => {
    let handler = () => {
      resolve();
      stream.removeListener("close", handler);
      stream.removeListener("end", handler);
      stream.removeListener("error", handler);
    };
    stream.on("close", handler);
    stream.on("end", handler);
    stream.on("error", handler);
  });
}
//@ chunk-mrx6y2r5.js:38224-38280 esm-fingerprint
function isArrayBuffer(body) {
  return body && typeof body.byteLength === "number";
}
//@ chunk-mrx6y2r5.js:38280-38502 esm-fingerprint
class ReportTransform extends Transform {
  _transform(chunk, _encoding, callback) {
    this.push(chunk);
    this.loadedBytes += chunk.length;
    try {
      this.progressCallback({
        loadedBytes: this.loadedBytes,
      });
      callback();
    } catch (e) {
      callback(e);
    }
  }
  constructor(progressCallback) {
    super();
    this.loadedBytes = 0;
    this.progressCallback = progressCallback;
  }
}
//@ chunk-mrx6y2r5.js:38502-41828 esm-fingerprint
class NodeHttpClient {
  constructor() {
    this.cachedHttpsAgents = new WeakMap();
  }
  async sendRequest(request) {
    var _a;
    var _b;
    var _c;
    let abortController = new AbortController();
    let abortListener;
    if (request.abortSignal) {
      if (request.abortSignal.aborted)
        throw new AbortError_2("The operation was aborted. Request has already been canceled.");
      abortListener = (event) => {
        if (event.type === "abort") abortController.abort();
      };
      request.abortSignal.addEventListener("abort", abortListener);
    }
    let timeoutId;
    if (request.timeout > 0)
      timeoutId = setTimeout(() => {
        let sanitizer = new Sanitizer();
        logger_2.info(`request to '${sanitizer.sanitizeUrl(request.url)}' timed out. canceling...`);
        abortController.abort();
      }, request.timeout);
    let acceptEncoding = request.headers.get("Accept-Encoding");
    let shouldDecompress =
      (acceptEncoding === null || acceptEncoding === undefined
        ? undefined
        : acceptEncoding.includes("gzip")) ||
      (acceptEncoding === null || acceptEncoding === undefined
        ? undefined
        : acceptEncoding.includes("deflate"));
    let body = typeof request.body === "function" ? request.body() : request.body;
    if (body && !request.headers.has("Content-Length")) {
      let bodyLength = getBodyLength(body);
      if (bodyLength !== null) request.headers.set("Content-Length", bodyLength);
    }
    let responseStream;
    try {
      if (body && request.onUploadProgress) {
        let onUploadProgress = request.onUploadProgress;
        let uploadReportStream = new ReportTransform(onUploadProgress);
        uploadReportStream.on("error", (e) => {
          logger_2.error("Error in upload progress", e);
        });
        if (isReadableStream(body)) body.pipe(uploadReportStream);
        else uploadReportStream.end(body);
        body = uploadReportStream;
      }
      let res = await this.makeRequest(request, abortController, body);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      let headers = getResponseHeaders(res);
      let response = {
        status: (_a = res.statusCode) !== null && _a !== undefined ? _a : 0,
        headers,
        request,
      };
      if (request.method === "HEAD") {
        res.resume();
        return response;
      }
      responseStream = shouldDecompress ? getDecodedResponseStream(res, headers) : res;
      let onDownloadProgress = request.onDownloadProgress;
      if (onDownloadProgress) {
        let downloadReportStream = new ReportTransform(onDownloadProgress);
        downloadReportStream.on("error", (e) => {
          logger_2.error("Error in download progress", e);
        });
        responseStream.pipe(downloadReportStream);
        responseStream = downloadReportStream;
      }
      if (
        ((_b = request.streamResponseStatusCodes) === null || _b === undefined
          ? undefined
          : _b.has(Number.POSITIVE_INFINITY)) ||
        ((_c = request.streamResponseStatusCodes) === null || _c === undefined
          ? undefined
          : _c.has(response.status))
      )
        response.readableStreamBody = responseStream;
      else response.bodyAsText = await streamToText(responseStream);
      return response;
    } finally {
      if (request.abortSignal && abortListener) {
        let uploadStreamDone = Promise.resolve();
        if (isReadableStream(body)) uploadStreamDone = isStreamComplete(body);
        let downloadStreamDone = Promise.resolve();
        if (isReadableStream(responseStream)) downloadStreamDone = isStreamComplete(responseStream);
        Promise.all([uploadStreamDone, downloadStreamDone])
          .then(() => {
            var _a;
            if (abortListener) {
              if (!((_a = request.abortSignal) === null || _a === undefined))
                _a.removeEventListener("abort", abortListener);
            }
          })
          .catch((e) => {
            logger_2.warning("Error when cleaning up abortListener on httpRequest", e);
          });
      }
    }
  }
  makeRequest(request, abortController, body) {
    var _a;
    let url = new URL(request.url);
    let isInsecure = url.protocol !== "https:";
    if (isInsecure && !request.allowInsecureConnection)
      throw Error(`Cannot connect to ${request.url} while allowInsecureConnection is false.`);
    let agent =
      (_a = request.agent) !== null && _a !== undefined ? _a : this.getOrCreateAgent(request, isInsecure);
    let options = Object.assign(
      {
        agent,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        port: url.port,
        method: request.method,
        headers: request.headers.toJSON({
          preserveCase: true,
        }),
      },
      request.requestOverrides,
    );
    return new Promise((resolve, reject) => {
      let req = isInsecure ? httpModule.request(options, resolve) : httpsModule.request(options, resolve);
      req.once("error", (err) => {
        var _a;
        reject(
          new RestError(err.message, {
            code: (_a = err.code) !== null && _a !== undefined ? _a : RestError.REQUEST_SEND_ERROR,
            request,
          }),
        );
      });
      abortController.signal.addEventListener("abort", () => {
        let abortError = new AbortError_2(
          "The operation was aborted. Rejecting from abort signal callback while making request.",
        );
        req.destroy(abortError);
        reject(abortError);
      });
      if (body && isReadableStream(body)) body.pipe(req);
      else if (body) {
        if (typeof body === "string" || Buffer.isBuffer(body)) req.end(body);
        else if (isArrayBuffer(body))
          req.end(ArrayBuffer.isView(body) ? Buffer.from(body.buffer) : Buffer.from(body));
        else {
          logger_2.error("Unrecognized body type", body);
          reject(new RestError("Unrecognized body type"));
        }
      } else req.end();
    });
  }
  getOrCreateAgent(request, isInsecure) {
    var _a;
    let disableKeepAlive = request.disableKeepAlive;
    if (isInsecure) {
      if (disableKeepAlive) return httpModule.globalAgent;
      if (!this.cachedHttpAgent)
        this.cachedHttpAgent = new httpModule.Agent({
          keepAlive: true,
        });
      return this.cachedHttpAgent;
    } else {
      if (disableKeepAlive && !request.tlsSettings) return httpsModule.globalAgent;
      let tlsSettings = (_a = request.tlsSettings) !== null && _a !== undefined ? _a : DEFAULT_TLS_SETTINGS;
      let agent = this.cachedHttpsAgents.get(tlsSettings);
      if (agent && agent.options.keepAlive === !disableKeepAlive) return agent;
      logger_2.info("No cached TLS Agent exist, creating a new Agent");
      agent = new httpsModule.Agent(
        Object.assign(
          {
            keepAlive: !disableKeepAlive,
          },
          tlsSettings,
        ),
      );
      this.cachedHttpsAgents.set(tlsSettings, agent);
      return agent;
    }
  }
}
//@ chunk-mrx6y2r5.js:41828-41989 esm-fingerprint
function getResponseHeaders(res) {
  let headers = createHttpHeaders();
  for (let header of Object.keys(res.headers)) {
    let value = res.headers[header];
    if (Array.isArray(value)) {
      if (value.length > 0) headers.set(header, value[0]);
    } else if (value) headers.set(header, value);
  }
  return headers;
}
//@ chunk-mrx6y2r5.js:41989-42172 esm-fingerprint
function getDecodedResponseStream(stream, headers) {
  let contentEncoding = headers.get("Content-Encoding");
  if (contentEncoding === "gzip") {
    let unzip = zlibModule.createGunzip();
    stream.pipe(unzip);
    return unzip;
  } else if (contentEncoding === "deflate") {
    let inflate = zlibModule.createInflate();
    stream.pipe(inflate);
    return inflate;
  }
  return stream;
}
//@ chunk-mrx6y2r5.js:42172-42529 esm-fingerprint
function streamToText(stream) {
  return new Promise((resolve, reject) => {
    let buffer = [];
    stream.on("data", (chunk) => {
      if (Buffer.isBuffer(chunk)) buffer.push(chunk);
      else buffer.push(Buffer.from(chunk));
    });
    stream.on("end", () => {
      resolve(Buffer.concat(buffer).toString("utf8"));
    });
    stream.on("error", (e) => {
      if (e && (e === null || e === undefined ? undefined : e.name) === "AbortError") reject(e);
      else
        reject(
          new RestError(`Error reading response as text: ${e.message}`, {
            code: RestError.PARSE_ERROR,
          }),
        );
    });
  });
}
//@ chunk-mrx6y2r5.js:42529-42736 esm-fingerprint
function getBodyLength(body) {
  if (!body) return 0;
  else if (Buffer.isBuffer(body)) return body.length;
  else if (isReadableStream(body)) return null;
  else if (isArrayBuffer(body)) return body.byteLength;
  else if (typeof body === "string") return Buffer.from(body).length;
  else return null;
}
export { NodeHttpClient };

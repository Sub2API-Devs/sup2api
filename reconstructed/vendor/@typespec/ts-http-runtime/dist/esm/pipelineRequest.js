/**
 * @typespec/ts-http-runtime/dist/esm/pipelineRequest.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-layout 3, esm-fingerprint 1
 */
import { randomUUID } from "crypto";
import { HttpHeadersImpl } from "./httpHeaders.js";

//@ chunk-mrx6y2r5.js:30845-30877 esm-layout
function createHttpHeaders(rawHeaders) {
  return new HttpHeadersImpl(rawHeaders);
}
//@ chunk-mrx6y2r5.js:30914-31111 esm-layout
var globalCrypto;
var getRandomUUID =
  typeof ((globalCrypto = globalThis === null || globalThis === undefined ? undefined : globalThis.crypto) ===
    null || globalCrypto === undefined
    ? undefined
    : globalCrypto.randomUUID) === "function"
    ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
    : randomUUID;
//@ chunk-mrx6y2r5.js:31111-31137 esm-layout
function getRequestUuid() {
  return getRandomUUID();
}
//@ chunk-mrx6y2r5.js:31137-32039 esm-fingerprint
class PipelineRequestImpl {
  constructor(options) {
    var _a;
    var _b;
    var _c;
    var _d;
    var _e;
    var _f;
    var _g;
    this.url = options.url;
    this.body = options.body;
    this.headers = (_a = options.headers) !== null && _a !== undefined ? _a : createHttpHeaders();
    this.method = (_b = options.method) !== null && _b !== undefined ? _b : "GET";
    this.timeout = (_c = options.timeout) !== null && _c !== undefined ? _c : 0;
    this.multipartBody = options.multipartBody;
    this.formData = options.formData;
    this.disableKeepAlive = (_d = options.disableKeepAlive) !== null && _d !== undefined ? _d : false;
    this.proxySettings = options.proxySettings;
    this.streamResponseStatusCodes = options.streamResponseStatusCodes;
    this.withCredentials = (_e = options.withCredentials) !== null && _e !== undefined ? _e : false;
    this.abortSignal = options.abortSignal;
    this.onUploadProgress = options.onUploadProgress;
    this.onDownloadProgress = options.onDownloadProgress;
    this.requestId = options.requestId || getRequestUuid();
    this.allowInsecureConnection =
      (_f = options.allowInsecureConnection) !== null && _f !== undefined ? _f : false;
    this.enableBrowserStreams = (_g = options.enableBrowserStreams) !== null && _g !== undefined ? _g : false;
    this.requestOverrides = options.requestOverrides;
    this.authSchemes = options.authSchemes;
  }
}
export { PipelineRequestImpl, createHttpHeaders, getRequestUuid };

/**
 * @typespec/ts-http-runtime/dist/esm/pipelineRequest.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-layout 3, esm-fingerprint 1
 */
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { ll } from "./httpHeaders.js";

//@ chunk-mrx6y2r5.js:30845-30877 esm-layout
function et(e) {
  return new ll(e);
}
//@ chunk-mrx6y2r5.js:30914-31111 esm-layout
var $s,
  Sm =
    typeof (($s = globalThis === null || globalThis === void 0 ? void 0 : globalThis.crypto) === null ||
    $s === void 0
      ? void 0
      : $s.randomUUID) === "function"
      ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
      : randomUUID;
//@ chunk-mrx6y2r5.js:31111-31137 esm-layout
function Bn() {
  return Sm();
}
//@ chunk-mrx6y2r5.js:31137-32039 esm-fingerprint
class dl {
  constructor(e) {
    var t, r, n, o, i, s, a;
    ((this.url = e.url),
      (this.body = e.body),
      (this.headers = (t = e.headers) !== null && t !== void 0 ? t : et()),
      (this.method = (r = e.method) !== null && r !== void 0 ? r : "GET"),
      (this.timeout = (n = e.timeout) !== null && n !== void 0 ? n : 0),
      (this.multipartBody = e.multipartBody),
      (this.formData = e.formData),
      (this.disableKeepAlive = (o = e.disableKeepAlive) !== null && o !== void 0 ? o : !1),
      (this.proxySettings = e.proxySettings),
      (this.streamResponseStatusCodes = e.streamResponseStatusCodes),
      (this.withCredentials = (i = e.withCredentials) !== null && i !== void 0 ? i : !1),
      (this.abortSignal = e.abortSignal),
      (this.onUploadProgress = e.onUploadProgress),
      (this.onDownloadProgress = e.onDownloadProgress),
      (this.requestId = e.requestId || Bn()),
      (this.allowInsecureConnection = (s = e.allowInsecureConnection) !== null && s !== void 0 ? s : !1),
      (this.enableBrowserStreams = (a = e.enableBrowserStreams) !== null && a !== void 0 ? a : !1),
      (this.requestOverrides = e.requestOverrides),
      (this.authSchemes = e.authSchemes));
  }
}

export { dl, et, Bn };

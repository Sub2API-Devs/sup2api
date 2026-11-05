/**
 * @smithy/util-stream/dist-cjs/checksum/ChecksumStream.browser.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-1fkvp0h1.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-1fkvp0h1.js:1816-2027 cjs-fingerprint
var require_ChecksumStream_browser = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ChecksumStream = undefined;
  var ReadableStreamRef = typeof ReadableStream === "function" ? ReadableStream : function () {};
  class ChecksumStream extends ReadableStreamRef {}
  cjsExports.ChecksumStream = ChecksumStream;
});
export { require_ChecksumStream_browser };

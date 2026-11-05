/**
 * @smithy/util-stream/dist-cjs/stream-type-check.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-1fkvp0h1.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1fkvp0h1.js:1456-1816 cjs-fingerprint
var require_stream_type_check = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isBlob = cjsExports.isReadableStream = undefined;
  var isReadableStream = (stream) =>
    typeof ReadableStream === "function" &&
    (stream?.constructor?.name === ReadableStream.name || stream instanceof ReadableStream);
  cjsExports.isReadableStream = isReadableStream;
  var isBlob = (blob) =>
    typeof Blob === "function" && (blob?.constructor?.name === Blob.name || blob instanceof Blob);
  cjsExports.isBlob = isBlob;
});
export { require_stream_type_check };

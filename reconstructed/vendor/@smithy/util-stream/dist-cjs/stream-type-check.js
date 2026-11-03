/**
 * @smithy/util-stream/dist-cjs/stream-type-check.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-wjd9n4jx.js:1456-1816 cjs-fingerprint
var B = x(function (ke) {
  Object.defineProperty(ke, "__esModule", { value: !0 });
  ke.isBlob = ke.isReadableStream = void 0;
  var Pr = (e) =>
    typeof ReadableStream === "function" &&
    (e?.constructor?.name === ReadableStream.name || e instanceof ReadableStream);
  ke.isReadableStream = Pr;
  var Nr = (e) => typeof Blob === "function" && (e?.constructor?.name === Blob.name || e instanceof Blob);
  ke.isBlob = Nr;
});

export { B };

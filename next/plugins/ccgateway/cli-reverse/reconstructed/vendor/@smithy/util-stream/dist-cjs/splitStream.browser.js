/**
 * @smithy/util-stream/dist-cjs/splitStream.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-wjd9n4jx.js:10211-10385 cjs-fingerprint
var require_splitStream_browser = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.splitStream = splitStream;
  async function splitStream(stream) {
    if (typeof stream.stream === "function") stream = stream.stream();
    return stream.tee();
  }
});
export { require_splitStream_browser };

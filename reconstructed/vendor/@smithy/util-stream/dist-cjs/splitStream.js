/**
 * @smithy/util-stream/dist-cjs/splitStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_splitStream_browser } from "./splitStream.browser.js";
import { require_stream_type_check } from "./stream-type-check.js";

//@ chunk-wjd9n4jx.js:10385-10678 cjs-fingerprint
var require_splitStream = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.splitStream = splitStream;
  var stream_1 = importMetaRequire("stream");
  var splitStream_browser_1 = require_splitStream_browser();
  var stream_type_check_1 = require_stream_type_check();
  async function splitStream(stream) {
    if (stream_type_check_1.isReadableStream(stream) || stream_type_check_1.isBlob(stream))
      return splitStream_browser_1.splitStream(stream);
    let stream1 = new stream_1.PassThrough();
    let stream2 = new stream_1.PassThrough();
    stream.pipe(stream1);
    stream.pipe(stream2);
    return [stream1, stream2];
  }
});
export { require_splitStream };

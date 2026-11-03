/**
 * @smithy/util-stream/dist-cjs/checksum/createChecksumStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_stream_type_check } from "../stream-type-check.js";
import { require_ChecksumStream } from "./ChecksumStream.js";
import { require_createChecksumStream_browser } from "./createChecksumStream.browser.js";

//@ chunk-wjd9n4jx.js:2964-3243 cjs-fingerprint
var require_createChecksumStream = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createChecksumStream = createChecksumStream;
  var stream_type_check_1 = require_stream_type_check();
  var ChecksumStream_1 = require_ChecksumStream();
  var createChecksumStream_browser_1 = require_createChecksumStream_browser();
  function createChecksumStream(init) {
    if (typeof ReadableStream === "function" && stream_type_check_1.isReadableStream(init.source))
      return createChecksumStream_browser_1.createChecksumStream(init);
    return new ChecksumStream_1.ChecksumStream(init);
  }
});
export { require_createChecksumStream };

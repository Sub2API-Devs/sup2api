/**
 * @smithy/util-stream/dist-cjs/createBufferedReadable.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-1fkvp0h1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_ByteArrayCollector } from "./ByteArrayCollector.js";
import { require_createBufferedReadableStream } from "./createBufferedReadableStream.js";
import { require_stream_type_check } from "./stream-type-check.js";

//@ chunk-1fkvp0h1.js:5121-5983 cjs-fingerprint
var require_createBufferedReadable = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createBufferedReadable = createBufferedReadable;
  var node_stream_1 = importMetaRequire("stream");
  var ByteArrayCollector_1 = require_ByteArrayCollector();
  var createBufferedReadableStream_1 = require_createBufferedReadableStream();
  var stream_type_check_1 = require_stream_type_check();
  function createBufferedReadable(upstream, size, logger) {
    if (stream_type_check_1.isReadableStream(upstream))
      return createBufferedReadableStream_1.createBufferedReadableStream(upstream, size, logger);
    let downstream = new node_stream_1.Readable({
      read() {},
    });
    let streamBufferingLoggedWarning = false;
    let bytesSeen = 0;
    let buffers = [
      "",
      new ByteArrayCollector_1.ByteArrayCollector((size) => new Uint8Array(size)),
      new ByteArrayCollector_1.ByteArrayCollector((size) => Buffer.from(new Uint8Array(size))),
    ];
    let mode = -1;
    upstream.on("data", (chunk) => {
      let chunkMode = createBufferedReadableStream_1.modeOf(chunk, true);
      if (mode !== chunkMode) {
        if (mode >= 0) downstream.push(createBufferedReadableStream_1.flush(buffers, mode));
        mode = chunkMode;
      }
      if (mode === -1) {
        downstream.push(chunk);
        return;
      }
      let chunkSize = createBufferedReadableStream_1.sizeOf(chunk);
      bytesSeen += chunkSize;
      let bufferSize = createBufferedReadableStream_1.sizeOf(buffers[mode]);
      if (chunkSize >= size && bufferSize === 0) downstream.push(chunk);
      else {
        let newSize = createBufferedReadableStream_1.merge(buffers, mode, chunk);
        if (!streamBufferingLoggedWarning && bytesSeen > size * 2) {
          streamBufferingLoggedWarning = true;
          logger?.warn(
            `@smithy/util-stream - stream chunk size ${chunkSize} is below threshold of ${size}, automatically buffering.`,
          );
        }
        if (newSize >= size) downstream.push(createBufferedReadableStream_1.flush(buffers, mode));
      }
    });
    upstream.on("end", () => {
      if (mode !== -1) {
        let remainder = createBufferedReadableStream_1.flush(buffers, mode);
        if (createBufferedReadableStream_1.sizeOf(remainder) > 0) downstream.push(remainder);
      }
      downstream.push(null);
    });
    return downstream;
  }
});
export { require_createBufferedReadable };

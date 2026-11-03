/**
 * @smithy/util-stream/dist-cjs/createBufferedReadableStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_ByteArrayCollector } from "./ByteArrayCollector.js";

//@ chunk-wjd9n4jx.js:3816-5121 cjs-fingerprint
var require_createBufferedReadableStream = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createBufferedReadable = undefined;
  cjsExports.createBufferedReadableStream = createBufferedReadableStream;
  cjsExports.merge = merge;
  cjsExports.flush = flush;
  cjsExports.sizeOf = sizeOf;
  cjsExports.modeOf = modeOf;
  var ByteArrayCollector_1 = require_ByteArrayCollector();
  function createBufferedReadableStream(upstream, size, logger) {
    let reader = upstream.getReader();
    let streamBufferingLoggedWarning = false;
    let bytesSeen = 0;
    let buffers = ["", new ByteArrayCollector_1.ByteArrayCollector((size) => new Uint8Array(size))];
    let mode = -1;
    let pull = async (controller) => {
      let { value, done } = await reader.read();
      let chunk = value;
      if (done) {
        if (mode !== -1) {
          let remainder = flush(buffers, mode);
          if (sizeOf(remainder) > 0) controller.enqueue(remainder);
        }
        controller.close();
      } else {
        let chunkMode = modeOf(chunk, false);
        if (mode !== chunkMode) {
          if (mode >= 0) controller.enqueue(flush(buffers, mode));
          mode = chunkMode;
        }
        if (mode === -1) {
          controller.enqueue(chunk);
          return;
        }
        let chunkSize = sizeOf(chunk);
        bytesSeen += chunkSize;
        let bufferSize = sizeOf(buffers[mode]);
        if (chunkSize >= size && bufferSize === 0) controller.enqueue(chunk);
        else {
          let newSize = merge(buffers, mode, chunk);
          if (!streamBufferingLoggedWarning && bytesSeen > size * 2) {
            streamBufferingLoggedWarning = true;
            logger?.warn(
              `@smithy/util-stream - stream chunk size ${chunkSize} is below threshold of ${size}, automatically buffering.`,
            );
          }
          if (newSize >= size) controller.enqueue(flush(buffers, mode));
          else await pull(controller);
        }
      }
    };
    return new ReadableStream({
      pull,
    });
  }
  cjsExports.createBufferedReadable = createBufferedReadableStream;
  function merge(buffers, mode, chunk) {
    switch (mode) {
      case 0:
        buffers[0] += chunk;
        return sizeOf(buffers[0]);
      case 1:
      case 2:
        buffers[mode].push(chunk);
        return sizeOf(buffers[mode]);
    }
  }
  function flush(buffers, mode) {
    switch (mode) {
      case 0:
        let s = buffers[0];
        buffers[0] = "";
        return s;
      case 1:
      case 2:
        return buffers[mode].flush();
    }
    throw Error(`@smithy/util-stream - invalid index ${mode} given to flush()`);
  }
  function sizeOf(chunk) {
    return chunk?.byteLength ?? chunk?.length ?? 0;
  }
  function modeOf(chunk, allowBuffer = true) {
    if (allowBuffer && typeof Buffer !== "undefined" && chunk instanceof Buffer) return 2;
    if (chunk instanceof Uint8Array) return 1;
    if (typeof chunk === "string") return 0;
    return -1;
  }
});
export { require_createBufferedReadableStream };

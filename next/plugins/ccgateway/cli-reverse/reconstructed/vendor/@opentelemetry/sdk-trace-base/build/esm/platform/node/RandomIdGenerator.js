/**
 * @opentelemetry/sdk-trace-base/build/esm/platform/node/RandomIdGenerator.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { BatchSpanProcessorBase } from "../../../src/export/BatchSpanProcessorBase.js";

//@ chunk-3wgj3rdg.js:19635-19669 esm-layout
class BatchSpanProcessor extends BatchSpanProcessorBase {
  onShutdown() {}
}
//@ chunk-3wgj3rdg.js:19669-19721 esm-fingerprint
class RandomIdGenerator {
  generateTraceId = getIdGenerator(16);
  generateSpanId = getIdGenerator(8);
}
//@ chunk-3wgj3rdg.js:19721-19751 esm-fingerprint
var SHARED_BUFFER = Buffer.allocUnsafe(16);
//@ chunk-3wgj3rdg.js:19751-19951 esm-fingerprint
function getIdGenerator(bytes) {
  return function () {
    for (let i = 0; i < bytes / 4; i++)
      SHARED_BUFFER.writeUInt32BE((Math.random() * 4294967296) >>> 0, i * 4);
    for (let i = 0; i < bytes; i++)
      if (SHARED_BUFFER[i] > 0) break;
      else if (i === bytes - 1) SHARED_BUFFER[bytes - 1] = 1;
    return SHARED_BUFFER.toString("hex", 0, bytes);
  };
}
export { RandomIdGenerator, BatchSpanProcessor };

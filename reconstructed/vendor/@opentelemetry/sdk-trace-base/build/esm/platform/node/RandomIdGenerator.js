/**
 * @opentelemetry/sdk-trace-base/build/esm/platform/node/RandomIdGenerator.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-9vvvg0d3.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { BatchSpanProcessorBase } from "../../../src/export/BatchSpanProcessorBase.js";

//@ chunk-9vvvg0d3.js:19263-19297 esm-layout
class BatchSpanProcessor extends BatchSpanProcessorBase {
  onShutdown() {}
}
//@ chunk-9vvvg0d3.js:19297-19349 esm-fingerprint
class RandomIdGenerator {
  generateTraceId = getIdGenerator(16);
  generateSpanId = getIdGenerator(8);
}
//@ chunk-9vvvg0d3.js:19349-19379 esm-fingerprint
var SHARED_BUFFER = Buffer.allocUnsafe(16);
//@ chunk-9vvvg0d3.js:19379-19579 esm-fingerprint
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

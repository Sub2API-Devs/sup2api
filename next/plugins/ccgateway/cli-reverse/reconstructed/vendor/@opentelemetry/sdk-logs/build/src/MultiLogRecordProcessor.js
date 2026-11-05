/**
 * @opentelemetry/sdk-logs/build/src/MultiLogRecordProcessor.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-exfmq47h.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../core/build/src/index.js";

//@ chunk-exfmq47h.js:666857-666873 esm-layout
var import_core_4 = __toESM(require_core());
//@ chunk-exfmq47h.js:666873-667251 esm-fingerprint
class MultiLogRecordProcessor {
  processors;
  forceFlushTimeoutMillis;
  constructor(processors, forceFlushTimeoutMillis) {
    this.processors = processors;
    this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
  }
  async forceFlush() {
    let timeout = this.forceFlushTimeoutMillis;
    await Promise.all(
      this.processors.map((processor) => import_core_4.callWithTimeout(processor.forceFlush(), timeout)),
    );
  }
  onEmit(logRecord, context) {
    this.processors.forEach((processors) => processors.onEmit(logRecord, context));
  }
  async shutdown() {
    await Promise.all(this.processors.map((processor) => processor.shutdown()));
  }
}
export { MultiLogRecordProcessor };

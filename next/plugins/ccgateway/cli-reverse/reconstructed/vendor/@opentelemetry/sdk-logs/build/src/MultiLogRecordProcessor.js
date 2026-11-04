/**
 * @opentelemetry/sdk-logs/build/src/MultiLogRecordProcessor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-aepeg2w5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../core/build/src/index.js";

//@ chunk-aepeg2w5.js:654251-654267 esm-layout
var import_core_4 = __toESM(require_core());
//@ chunk-aepeg2w5.js:654267-654645 esm-fingerprint
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

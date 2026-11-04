/**
 * @opentelemetry/sdk-logs/build/esm/internal/LoggerProviderSharedState.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: esm-fingerprint 1
 */
import { MultiLogRecordProcessor } from "../../src/MultiLogRecordProcessor.js";
import { NoopLogRecordProcessor } from "../export/NoopLogRecordProcessor.js";

//@ chunk-aepeg2w5.js:654645-655066 esm-fingerprint
class LoggerProviderSharedState {
  resource;
  forceFlushTimeoutMillis;
  logRecordLimits;
  processors;
  loggers = new Map();
  activeProcessor;
  registeredLogRecordProcessors = [];
  constructor(resource, forceFlushTimeoutMillis, logRecordLimits, processors) {
    this.resource = resource;
    this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
    this.logRecordLimits = logRecordLimits;
    this.processors = processors;
    if (processors.length > 0) {
      this.registeredLogRecordProcessors = processors;
      this.activeProcessor = new MultiLogRecordProcessor(
        this.registeredLogRecordProcessors,
        this.forceFlushTimeoutMillis,
      );
    } else this.activeProcessor = new NoopLogRecordProcessor();
  }
}
export { LoggerProviderSharedState };

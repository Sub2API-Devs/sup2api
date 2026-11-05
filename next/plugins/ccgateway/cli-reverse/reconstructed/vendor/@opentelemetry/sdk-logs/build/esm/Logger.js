/**
 * @opentelemetry/sdk-logs/build/esm/Logger.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-exfmq47h.js (1)
 * attribution: esm-fingerprint 1
 */
import { import_api, LogRecordImpl } from "../src/LogRecordImpl.js";

//@ chunk-exfmq47h.js:665812-666101 esm-fingerprint
class Logger {
  instrumentationScope;
  _sharedState;
  constructor(instrumentationScope, _sharedState) {
    this.instrumentationScope = instrumentationScope;
    this._sharedState = _sharedState;
  }
  emit(logRecord) {
    let currentContext = logRecord.context || import_api.context.active();
    let logRecordInstance = new LogRecordImpl(this._sharedState, this.instrumentationScope, {
      context: currentContext,
      ...logRecord,
    });
    this._sharedState.activeProcessor.onEmit(logRecordInstance, currentContext);
    logRecordInstance._makeReadonly();
  }
}
export { Logger };

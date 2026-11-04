/**
 * @opentelemetry/sdk-logs/build/esm/export/NoopLogRecordProcessor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-aepeg2w5.js:654154-654251 esm-fingerprint
class NoopLogRecordProcessor {
  forceFlush() {
    return Promise.resolve();
  }
  onEmit(_logRecord, _context) {}
  shutdown() {
    return Promise.resolve();
  }
}
export { NoopLogRecordProcessor };

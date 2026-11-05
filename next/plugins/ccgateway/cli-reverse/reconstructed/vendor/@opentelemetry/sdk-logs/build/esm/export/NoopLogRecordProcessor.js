/**
 * @opentelemetry/sdk-logs/build/esm/export/NoopLogRecordProcessor.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-exfmq47h.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-exfmq47h.js:666760-666857 esm-fingerprint
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

/**
 * @opentelemetry/api-logs/NoopLoggerProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api-logs@0.208.0..0.209.0
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: placement 1
 */
import { NoopEmitter } from "../../../src/services/analytics/growthbookClient.js";

//@ chunk-aepeg2w5.js:648947-648988 placement
class NoopLoggerProvider {
  getLogger(e, n, r) {
    return new NoopEmitter();
  }
}
export { NoopLoggerProvider };

/**
 * @opentelemetry/api-logs/NoopLoggerProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api-logs@0.208.0..0.209.0
 * pieces: chunk-exfmq47h.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { NoopEmitter } from "../../../src/services/analytics/growthbookClient.js";

//@ chunk-exfmq47h.js:661553-661594 placement
class NoopLoggerProvider {
  getLogger(name, version, options) {
    return new NoopEmitter();
  }
}
export { NoopLoggerProvider };

/**
 * @opentelemetry/api-logs/build/esm/ProxyLogger.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api-logs@0.208.0..0.209.0
 * pieces: chunk-exfmq47h.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { NoopLoggerProvider } from "../../NoopLoggerProvider.js";
import { noopEmitter } from "../../../../../src/services/analytics/growthbookClient.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:661594-661608 esm-layout
var NOOP_LOGGER_PROVIDER; // deferred: uses NoopLoggerProvider (../../NoopLoggerProvider.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:661594", () => {
  NOOP_LOGGER_PROVIDER = new NoopLoggerProvider();
});
//@ chunk-exfmq47h.js:661608-661917 esm-fingerprint
class ProxyLogger {
  constructor(provider, name, version, options) {
    this._provider = provider;
    this.name = name;
    this.version = version;
    this.options = options;
  }
  emit(logRecord) {
    this._getLogger().emit(logRecord);
  }
  _getLogger() {
    if (this._delegate) return this._delegate;
    let logger = this._provider._getDelegateLogger(this.name, this.version, this.options);
    if (!logger) return noopEmitter;
    this._delegate = logger;
    return this._delegate;
  }
}
export { ProxyLogger, NOOP_LOGGER_PROVIDER };

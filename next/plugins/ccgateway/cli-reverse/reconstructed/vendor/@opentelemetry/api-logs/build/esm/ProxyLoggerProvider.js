/**
 * @opentelemetry/api-logs/build/esm/ProxyLoggerProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api-logs@0.208.0..0.209.0
 * pieces: chunk-exfmq47h.js (1)
 * attribution: esm-fingerprint 1
 */
import { ProxyLogger, NOOP_LOGGER_PROVIDER } from "./ProxyLogger.js";

//@ chunk-exfmq47h.js:661917-662236 esm-fingerprint
class ProxyLoggerProvider {
  getLogger(name, version, options) {
    var _a;
    return (_a = this._getDelegateLogger(name, version, options)) !== null && _a !== undefined
      ? _a
      : new ProxyLogger(this, name, version, options);
  }
  _getDelegate() {
    var _a;
    return (_a = this._delegate) !== null && _a !== undefined ? _a : NOOP_LOGGER_PROVIDER;
  }
  _setDelegate(delegate) {
    this._delegate = delegate;
  }
  _getDelegateLogger(name, version, options) {
    var _a;
    return (_a = this._delegate) === null || _a === undefined
      ? undefined
      : _a.getLogger(name, version, options);
  }
}
export { ProxyLoggerProvider };

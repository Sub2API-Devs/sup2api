/**
 * @opentelemetry/api-logs/build/esm/api/logs.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api-logs@0.208.0..0.209.0
 * pieces: chunk-exfmq47h.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { ProxyLoggerProvider } from "../ProxyLoggerProvider.js";
import { globalLoggerRegistry, GLOBAL_LOGS_API_KEY } from "../internal/global-utils.js";
import { NOOP_LOGGER_PROVIDER } from "../ProxyLogger.js";

//@ chunk-exfmq47h.js:662346-662386 esm-layout
function makeGetter(version, provider, defaultValue) {
  return (requestedVersion) => (requestedVersion === version ? provider : defaultValue);
}
//@ chunk-exfmq47h.js:662386-662395 esm-layout
var API_BACKWARDS_COMPATIBILITY_VERSION = 1;
//@ chunk-exfmq47h.js:662395-662934 esm-fingerprint
class LogsAPI {
  constructor() {
    this._proxyLoggerProvider = new ProxyLoggerProvider();
  }
  static getInstance() {
    if (!this._instance) this._instance = new LogsAPI();
    return this._instance;
  }
  setGlobalLoggerProvider(provider) {
    if (globalLoggerRegistry[GLOBAL_LOGS_API_KEY]) return this.getLoggerProvider();
    globalLoggerRegistry[GLOBAL_LOGS_API_KEY] = makeGetter(
      API_BACKWARDS_COMPATIBILITY_VERSION,
      provider,
      NOOP_LOGGER_PROVIDER,
    );
    this._proxyLoggerProvider._setDelegate(provider);
    return provider;
  }
  getLoggerProvider() {
    var _a;
    var _b;
    return (_b =
      (_a = globalLoggerRegistry[GLOBAL_LOGS_API_KEY]) === null || _a === undefined
        ? undefined
        : _a.call(globalLoggerRegistry, API_BACKWARDS_COMPATIBILITY_VERSION)) !== null && _b !== undefined
      ? _b
      : this._proxyLoggerProvider;
  }
  getLogger(name, version, options) {
    return this.getLoggerProvider().getLogger(name, version, options);
  }
  disable() {
    delete globalLoggerRegistry[GLOBAL_LOGS_API_KEY];
    this._proxyLoggerProvider = new ProxyLoggerProvider();
  }
}
export { LogsAPI };

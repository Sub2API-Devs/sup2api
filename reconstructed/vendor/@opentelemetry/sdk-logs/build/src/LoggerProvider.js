/**
 * @opentelemetry/sdk-logs/build/src/LoggerProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: esm-fingerprint 1
 */
import { import_core, import_resources } from "./LogRecordImpl.js";
import { loadDefaultConfig, reconfigureLimits } from "./config.js";
import { LoggerProviderSharedState } from "../esm/internal/LoggerProviderSharedState.js";
import { growthbookSdkModule, noopEmitter } from "../../../../../src/services/analytics/growthbookClient.js";
import { DEFAULT_LOGGER_NAME } from "../esm/LoggerProvider.js";
import { Logger } from "../esm/Logger.js";

//@ chunk-aepeg2w5.js:655083-656233 esm-fingerprint
class LoggerProvider {
  _shutdownOnce;
  _sharedState;
  constructor(config = {}) {
    let mergedConfig = import_core.merge({}, loadDefaultConfig(), config);
    let resource = config.resource ?? import_resources.defaultResource();
    this._sharedState = new LoggerProviderSharedState(
      resource,
      mergedConfig.forceFlushTimeoutMillis,
      reconfigureLimits(mergedConfig.logRecordLimits),
      config?.processors ?? [],
    );
    this._shutdownOnce = new import_core.BindOnceFuture(this._shutdown, this);
  }
  getLogger(name, version, options) {
    if (this._shutdownOnce.isCalled) {
      growthbookSdkModule.diag.warn("A shutdown LoggerProvider cannot provide a Logger");
      return noopEmitter;
    }
    if (!name) growthbookSdkModule.diag.warn("Logger requested without instrumentation scope name.");
    let loggerName = name || DEFAULT_LOGGER_NAME;
    let key = `${loggerName}@${version || ""}:${options?.schemaUrl || ""}`;
    if (!this._sharedState.loggers.has(key))
      this._sharedState.loggers.set(
        key,
        new Logger(
          {
            name: loggerName,
            version,
            schemaUrl: options?.schemaUrl,
          },
          this._sharedState,
        ),
      );
    return this._sharedState.loggers.get(key);
  }
  forceFlush() {
    if (this._shutdownOnce.isCalled) {
      growthbookSdkModule.diag.warn("invalid attempt to force flush after LoggerProvider shutdown");
      return this._shutdownOnce.promise;
    }
    return this._sharedState.activeProcessor.forceFlush();
  }
  shutdown() {
    if (this._shutdownOnce.isCalled) {
      growthbookSdkModule.diag.warn("shutdown may only be called once per LoggerProvider");
      return this._shutdownOnce.promise;
    }
    return this._shutdownOnce.call();
  }
  _shutdown() {
    return this._sharedState.activeProcessor.shutdown();
  }
}
export { LoggerProvider };

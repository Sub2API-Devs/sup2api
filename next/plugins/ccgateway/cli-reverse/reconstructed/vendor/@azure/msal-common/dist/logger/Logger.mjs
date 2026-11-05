/**
 * @azure/msal-common/dist/logger/Logger.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/msal-common@15.13.1
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { Constants } from "../../lib/index-node-DhUjlPuB.js";
import { deferInit, runDeferredInits } from "../../../../../runtime/deferred-init.js";

//@ chunk-b5df2wx1.js:102514-102520 esm-layout
var LogLevel;
//@ chunk-b5df2wx1.js:102520-102657 esm-fingerprint
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b5df2wx1.js:102520", () => {
  (function (LogLevel) {
    LogLevel[(LogLevel.Error = 0)] = "Error";
    LogLevel[(LogLevel.Warning = 1)] = "Warning";
    LogLevel[(LogLevel.Info = 2)] = "Info";
    LogLevel[(LogLevel.Verbose = 3)] = "Verbose";
    LogLevel[(LogLevel.Trace = 4)] = "Trace";
  })(LogLevel || (LogLevel = {}));
});
//@ chunk-b5df2wx1.js:102657-104712 esm-fingerprint
class Logger {
  constructor(loggerOptions, packageName, packageVersion) {
    this.level = LogLevel.Info;
    let defaultLoggerCallback = () => {
      return;
    };
    let setLoggerOptions = loggerOptions || Logger.createDefaultLoggerOptions();
    this.localCallback = setLoggerOptions.loggerCallback || defaultLoggerCallback;
    this.piiLoggingEnabled = setLoggerOptions.piiLoggingEnabled || false;
    this.level = typeof setLoggerOptions.logLevel === "number" ? setLoggerOptions.logLevel : LogLevel.Info;
    this.correlationId = setLoggerOptions.correlationId || Constants.EMPTY_STRING;
    this.packageName = packageName || Constants.EMPTY_STRING;
    this.packageVersion = packageVersion || Constants.EMPTY_STRING;
  }
  static createDefaultLoggerOptions() {
    return {
      loggerCallback: () => {},
      piiLoggingEnabled: false,
      logLevel: LogLevel.Info,
    };
  }
  clone(packageName, packageVersion, correlationId) {
    return new Logger(
      {
        loggerCallback: this.localCallback,
        piiLoggingEnabled: this.piiLoggingEnabled,
        logLevel: this.level,
        correlationId: correlationId || this.correlationId,
      },
      packageName,
      packageVersion,
    );
  }
  logMessage(logMessage, options) {
    if (options.logLevel > this.level || (!this.piiLoggingEnabled && options.containsPii)) return;
    let line = `${`[${new Date().toUTCString()}] : [${options.correlationId || this.correlationId || ""}]`} : ${this.packageName}@${this.packageVersion} : ${LogLevel[options.logLevel]} - ${logMessage}`;
    this.executeCallback(options.logLevel, line, options.containsPii || false);
  }
  executeCallback(level, message, containsPii) {
    if (this.localCallback) this.localCallback(level, message, containsPii);
  }
  error(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Error,
      containsPii: false,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  errorPii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Error,
      containsPii: true,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  warning(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Warning,
      containsPii: false,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  warningPii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Warning,
      containsPii: true,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  info(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Info,
      containsPii: false,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  infoPii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Info,
      containsPii: true,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  verbose(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Verbose,
      containsPii: false,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  verbosePii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Verbose,
      containsPii: true,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  trace(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Trace,
      containsPii: false,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  tracePii(message, correlationId) {
    this.logMessage(message, {
      logLevel: LogLevel.Trace,
      containsPii: true,
      correlationId: correlationId || Constants.EMPTY_STRING,
    });
  }
  isPiiLoggingEnabled() {
    return this.piiLoggingEnabled || false;
  }
}

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/@azure/msal-common/dist/logger/Logger.mjs");
export { LogLevel, Logger };

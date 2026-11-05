/**
 * @typespec/ts-http-runtime/dist/esm/logger/logger.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (6)
 * attribution: esm-layout 3, esm-fingerprint 3
 */
import { debugObj } from "./debug.js";

//@ chunk-b5df2wx1.js:25443-25453 esm-layout
var debugObj_default = debugObj;
//@ chunk-b5df2wx1.js:25453-25545 esm-fingerprint
var TYPESPEC_RUNTIME_LOG_LEVELS = ["verbose", "info", "warning", "error"];
var levelMap = {
  verbose: 400,
  info: 300,
  warning: 200,
  error: 100,
};
//@ chunk-b5df2wx1.js:25545-25590 esm-layout
function patchLogMethod(parent, child) {
  child.log = (...args) => {
    parent.log(...args);
  };
}
//@ chunk-b5df2wx1.js:25590-25627 esm-layout
function isTypeSpecRuntimeLogLevel(level) {
  return TYPESPEC_RUNTIME_LOG_LEVELS.includes(level);
}
//@ chunk-b5df2wx1.js:25627-26536 esm-fingerprint
function createLoggerContext(options) {
  let registeredLoggers = new Set();
  let logLevelFromEnv =
    (typeof process !== "undefined" && process.env && process.env[options.logLevelEnvVarName]) || undefined;
  let logLevel;
  let clientLogger = debugObj_default(options.namespace);
  clientLogger.log = (...args) => {
    debugObj_default.log(...args);
  };
  function contextSetLogLevel(level) {
    if (level && !isTypeSpecRuntimeLogLevel(level))
      throw Error(
        `Unknown log level '${level}'. Acceptable values: ${TYPESPEC_RUNTIME_LOG_LEVELS.join(",")}`,
      );
    logLevel = level;
    let enabledNamespaces = [];
    for (let logger of registeredLoggers) if (shouldEnable(logger)) enabledNamespaces.push(logger.namespace);
    debugObj_default.enable(enabledNamespaces.join(","));
  }
  if (logLevelFromEnv)
    if (isTypeSpecRuntimeLogLevel(logLevelFromEnv)) contextSetLogLevel(logLevelFromEnv);
    else
      console.error(
        `${options.logLevelEnvVarName} set to unknown log level '${logLevelFromEnv}'; logging is not enabled. Acceptable values: ${TYPESPEC_RUNTIME_LOG_LEVELS.join(", ")}.`,
      );
  function shouldEnable(logger) {
    return Boolean(logLevel && levelMap[logger.level] <= levelMap[logLevel]);
  }
  function createLogger(parent, level) {
    let logger = Object.assign(parent.extend(level), {
      level,
    });
    patchLogMethod(parent, logger);
    if (shouldEnable(logger)) {
      let enabledNamespaces = debugObj_default.disable();
      debugObj_default.enable(enabledNamespaces + "," + logger.namespace);
    }
    registeredLoggers.add(logger);
    return logger;
  }
  function contextGetLogLevel() {
    return logLevel;
  }
  function contextCreateClientLogger(namespace) {
    let clientRootLogger = clientLogger.extend(namespace);
    patchLogMethod(clientLogger, clientRootLogger);
    return {
      error: createLogger(clientRootLogger, "error"),
      warning: createLogger(clientRootLogger, "warning"),
      info: createLogger(clientRootLogger, "info"),
      verbose: createLogger(clientRootLogger, "verbose"),
    };
  }
  return {
    setLogLevel: contextSetLogLevel,
    getLogLevel: contextGetLogLevel,
    createClientLogger: contextCreateClientLogger,
    logger: clientLogger,
  };
}
//@ chunk-b5df2wx1.js:26536-26638 esm-fingerprint
var context = createLoggerContext({
  logLevelEnvVarName: "TYPESPEC_RUNTIME_LOG_LEVEL",
  namespace: "typeSpecRuntime",
});
var logger_11 = context.logger;
export { context, createLoggerContext };

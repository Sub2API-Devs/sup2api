/**
 * @anthropic-ai/sdk/internal/utils/log.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (10)
 * attribution: esm-fingerprint 6, esm-layout 4
 */
import { hasOwn } from "./values.mjs";
import { readEnv } from "./env.mjs";

//@ chunk-vn3g7zt8.js:26568-26785 esm-fingerprint
var defaultLogLevel = "warn";
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500,
};
var parseLogLevel = (maybeLevel, sourceName, logger) => {
  if (!maybeLevel) return;
  if (hasOwn(levelNumbers, maybeLevel)) return maybeLevel;
  logger.warn(
    `${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`,
  );
  return;
};
//@ chunk-vn3g7zt8.js:26785-26800 esm-layout
function noop() {}
//@ chunk-vn3g7zt8.js:26800-26873 esm-layout
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) return noop;
  else return logger[fnLevel].bind(logger);
}
//@ chunk-vn3g7zt8.js:26873-26931 esm-fingerprint
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
};
var cachedLoggers = new WeakMap();
//@ chunk-vn3g7zt8.js:26931-27108 esm-fingerprint
function filterLogger(logger, logLevel) {
  let cachedLogger = cachedLoggers.get(logger);
  if (cachedLogger && cachedLogger[0] === logLevel) return cachedLogger[1];
  let levelLogger = {
    error: makeLogFn("error", logger, logLevel),
    warn: makeLogFn("warn", logger, logLevel),
    info: makeLogFn("info", logger, logLevel),
    debug: makeLogFn("debug", logger, logLevel),
  };
  cachedLoggers.set(logger, [logLevel, levelLogger]);
  return levelLogger;
}
//@ chunk-vn3g7zt8.js:27108-27189 esm-fingerprint
function loggerFor(client) {
  let logger = client.logger;
  let logLevel = client.logLevel ?? "off";
  if (!logger) return noopLogger;
  return filterLogger(logger, logLevel);
}
//@ chunk-vn3g7zt8.js:27189-27199 esm-layout
var lastEnvLevel;
var cachedDefaultLogger;
//@ chunk-vn3g7zt8.js:27199-27340 esm-fingerprint
function defaultLogger() {
  let envLevel = readEnv("ANTHROPIC_LOG");
  if (!cachedDefaultLogger || envLevel !== lastEnvLevel) {
    lastEnvLevel = envLevel;
    cachedDefaultLogger = filterLogger(
      console,
      parseLogLevel(envLevel, "process.env['ANTHROPIC_LOG']", filterLogger(console, defaultLogLevel)) ??
        defaultLogLevel,
    );
  }
  return cachedDefaultLogger;
}
//@ chunk-vn3g7zt8.js:27340-27399 esm-layout
function debugLogRequestDetails(logger, message, details) {
  if (logger.debug === noop) return;
  logger.debug(message, formatRequestDetails(details));
}
//@ chunk-vn3g7zt8.js:27399-27896 esm-fingerprint
var formatRequestDetails = (details) => {
  if (details.options) {
    details.options = {
      ...details.options,
    };
    delete details.options.headers;
  }
  if (details.headers)
    details.headers = Object.fromEntries(
      (details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(
        ([name, value]) => [
          name,
          name.toLowerCase() === "authorization" ||
          name.toLowerCase() === "api-key" ||
          name.toLowerCase() === "x-api-key" ||
          name.toLowerCase() === "cookie" ||
          name.toLowerCase() === "set-cookie"
            ? "***"
            : value,
        ],
      ),
    );
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) details.retryOf = details.retryOfRequestLogID;
    delete details.retryOfRequestLogID;
  }
  return details;
};
export { loggerFor, debugLogRequestDetails, defaultLogger, defaultLogLevel, parseLogLevel };

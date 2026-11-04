/**
 * @anthropic-ai/sdk/internal/utils/log.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (10)
 * attribution: esm-fingerprint 6, esm-layout 4
 */
import { hasOwn } from "./values.mjs";
import { readEnv } from "./env.mjs";

//@ chunk-hwmsct5x.js:26197-26414 esm-fingerprint
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
//@ chunk-hwmsct5x.js:26414-26429 esm-layout
function noop() {}
//@ chunk-hwmsct5x.js:26429-26502 esm-layout
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) return noop;
  else return logger[fnLevel].bind(logger);
}
//@ chunk-hwmsct5x.js:26502-26560 esm-fingerprint
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
};
var cachedLoggers = new WeakMap();
//@ chunk-hwmsct5x.js:26560-26737 esm-fingerprint
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
//@ chunk-hwmsct5x.js:26737-26818 esm-fingerprint
function loggerFor(client) {
  let logger = client.logger;
  let logLevel = client.logLevel ?? "off";
  if (!logger) return noopLogger;
  return filterLogger(logger, logLevel);
}
//@ chunk-hwmsct5x.js:26818-26828 esm-layout
var lastEnvLevel;
var cachedDefaultLogger;
//@ chunk-hwmsct5x.js:26828-26969 esm-fingerprint
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
//@ chunk-hwmsct5x.js:26969-27028 esm-layout
function debugLogRequestDetails(logger, message, details) {
  if (logger.debug === noop) return;
  logger.debug(message, formatRequestDetails(details));
}
//@ chunk-hwmsct5x.js:27028-27525 esm-fingerprint
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

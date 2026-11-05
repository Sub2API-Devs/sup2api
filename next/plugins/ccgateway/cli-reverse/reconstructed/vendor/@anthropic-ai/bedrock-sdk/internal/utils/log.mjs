/**
 * @anthropic-ai/bedrock-sdk/internal/utils/log.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (6), chunk-f7kbssbx.js (6)
 * attribution: esm-fingerprint 8, esm-layout 4
 */

//@ chunk-b8zxeazh.js:10486-10538 esm-fingerprint
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500,
};
//@ chunk-b8zxeazh.js:10538-10552 esm-layout
function noopLog() {}
//@ chunk-b8zxeazh.js:10552-10621 esm-layout
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) return noopLog;
  else return logger[fnLevel].bind(logger);
}
//@ chunk-b8zxeazh.js:10621-10674 esm-fingerprint
var noopLogger = {
  error: noopLog,
  warn: noopLog,
  info: noopLog,
  debug: noopLog,
};
var cachedLoggers = new WeakMap();
//@ chunk-b8zxeazh.js:10674-10845 esm-fingerprint
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
//@ chunk-b8zxeazh.js:10845-10925 esm-fingerprint
function loggerFor(client) {
  let logger = client.logger;
  let logLevel = client.logLevel ?? "off";
  if (!logger) return noopLogger;
  return filterLogger(logger, logLevel);
}
//@ chunk-f7kbssbx.js:1975-2027 esm-fingerprint
var levelNumbers_2 = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500,
};
//@ chunk-f7kbssbx.js:2027-2041 esm-layout
function noopLog_2() {}
//@ chunk-f7kbssbx.js:2041-2110 esm-layout
function getLevelWriter(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers_2[fnLevel] > levelNumbers_2[logLevel]) return noopLog_2;
  else return logger[fnLevel].bind(logger);
}
//@ chunk-f7kbssbx.js:2110-2162 esm-fingerprint
var noopLogger_2 = {
  error: noopLog_2,
  warn: noopLog_2,
  info: noopLog_2,
  debug: noopLog_2,
};
var cachedLoggers_2 = new WeakMap();
//@ chunk-f7kbssbx.js:2162-2332 esm-fingerprint
function filterLogger_2(logger, logLevel) {
  let cachedLogger = cachedLoggers_2.get(logger);
  if (cachedLogger && cachedLogger[0] === logLevel) return cachedLogger[1];
  let levelLogger = {
    error: getLevelWriter("error", logger, logLevel),
    warn: getLevelWriter("warn", logger, logLevel),
    info: getLevelWriter("info", logger, logLevel),
    debug: getLevelWriter("debug", logger, logLevel),
  };
  cachedLoggers_2.set(logger, [logLevel, levelLogger]);
  return levelLogger;
}
//@ chunk-f7kbssbx.js:2332-2410 esm-fingerprint
function loggerFor_2(client) {
  let logger = client.logger;
  let logLevel = client.logLevel ?? "off";
  if (!logger) return noopLogger_2;
  return filterLogger_2(logger, logLevel);
}
export { loggerFor, loggerFor_2 };

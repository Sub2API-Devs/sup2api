/**
 * @grpc/grpc-js/build/src/logging.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";
import { require_package } from "../../package.json.js";

//@ chunk-3k21nfa0.js:4533-5985 cjs-fingerprint
var require_logging = __commonJS(function (cjsExports) {
  var _a;
  var _b;
  var _c;
  var _d;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.log = cjsExports.setLoggerVerbosity = cjsExports.setLogger = cjsExports.getLogger = undefined;
  cjsExports.trace = trace;
  cjsExports.isTracerEnabled = isTracerEnabled;
  var constants_1 = require_constants();
  var process_1 = importMetaRequire("process");
  var clientVersion = require_package().version;
  var DEFAULT_LOGGER = {
    error: (message, ...optionalParams) => {
      console.error("E " + message, ...optionalParams);
    },
    info: (message, ...optionalParams) => {
      console.error("I " + message, ...optionalParams);
    },
    debug: (message, ...optionalParams) => {
      console.error("D " + message, ...optionalParams);
    },
  };
  var _logger = DEFAULT_LOGGER;
  var _logVerbosity = constants_1.LogVerbosity.ERROR;
  var verbosityString =
    (_b =
      (_a = process.env.GRPC_NODE_VERBOSITY) !== null && _a !== undefined
        ? _a
        : process.env.GRPC_VERBOSITY) !== null && _b !== undefined
      ? _b
      : "";
  switch (verbosityString.toUpperCase()) {
    case "DEBUG":
      _logVerbosity = constants_1.LogVerbosity.DEBUG;
      break;
    case "INFO":
      _logVerbosity = constants_1.LogVerbosity.INFO;
      break;
    case "ERROR":
      _logVerbosity = constants_1.LogVerbosity.ERROR;
      break;
    case "NONE":
      _logVerbosity = constants_1.LogVerbosity.NONE;
      break;
    default:
  }
  var getLogger = () => _logger;
  cjsExports.getLogger = getLogger;
  var setLogger = (logger) => {
    _logger = logger;
  };
  cjsExports.setLogger = setLogger;
  var setLoggerVerbosity = (verbosity) => {
    _logVerbosity = verbosity;
  };
  cjsExports.setLoggerVerbosity = setLoggerVerbosity;
  var log = (severity, ...args) => {
    let logFunction;
    if (severity >= _logVerbosity) {
      switch (severity) {
        case constants_1.LogVerbosity.DEBUG:
          logFunction = _logger.debug;
          break;
        case constants_1.LogVerbosity.INFO:
          logFunction = _logger.info;
          break;
        case constants_1.LogVerbosity.ERROR:
          logFunction = _logger.error;
          break;
      }
      if (!logFunction) logFunction = _logger.error;
      if (logFunction) logFunction.bind(_logger)(...args);
    }
  };
  cjsExports.log = log;
  var tracersString =
    (_d = (_c = process.env.GRPC_NODE_TRACE) !== null && _c !== undefined ? _c : process.env.GRPC_TRACE) !==
      null && _d !== undefined
      ? _d
      : "";
  var enabledTracers = new Set();
  var disabledTracers = new Set();
  for (let tracerName of tracersString.split(","))
    if (tracerName.startsWith("-")) disabledTracers.add(tracerName.substring(1));
    else enabledTracers.add(tracerName);
  var allEnabled = enabledTracers.has("all");
  function trace(severity, tracer, text) {
    if (isTracerEnabled(tracer))
      cjsExports.log(
        severity,
        new Date().toISOString() +
          " | v" +
          clientVersion +
          " " +
          process_1.pid +
          " | " +
          tracer +
          " | " +
          text,
      );
  }
  function isTracerEnabled(tracer) {
    return !disabledTracers.has(tracer) && (allEnabled || enabledTracers.has(tracer));
  }
});
export { require_logging };

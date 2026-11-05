/**
 * @opentelemetry/api/build/src/diag/internal/logLevelLogger.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_types } from "../types.js";

//@ chunk-7kayq7nc.js:31755-32321 cjs-fingerprint
var require_logLevelLogger = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createLogLevelDiagLogger = undefined;
  var types_1 = require_types();
  function createLogLevelDiagLogger(maxLevel, logger) {
    if (maxLevel < types_1.DiagLogLevel.NONE) maxLevel = types_1.DiagLogLevel.NONE;
    else if (maxLevel > types_1.DiagLogLevel.ALL) maxLevel = types_1.DiagLogLevel.ALL;
    logger = logger || {};
    function _filterFunc(funcName, theLevel) {
      let theFunc = logger[funcName];
      if (typeof theFunc === "function" && maxLevel >= theLevel) return theFunc.bind(logger);
      return function () {};
    }
    return {
      error: _filterFunc("error", types_1.DiagLogLevel.ERROR),
      warn: _filterFunc("warn", types_1.DiagLogLevel.WARN),
      info: _filterFunc("info", types_1.DiagLogLevel.INFO),
      debug: _filterFunc("debug", types_1.DiagLogLevel.DEBUG),
      verbose: _filterFunc("verbose", types_1.DiagLogLevel.VERBOSE),
    };
  }
  cjsExports.createLogLevelDiagLogger = createLogLevelDiagLogger;
});
export { require_logLevelLogger };

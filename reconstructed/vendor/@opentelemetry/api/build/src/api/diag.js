/**
 * @opentelemetry/api/build/src/api/diag.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_ComponentLogger } from "../diag/ComponentLogger.js";
import { require_logLevelLogger } from "../diag/internal/logLevelLogger.js";
import { require_types } from "../diag/types.js";
import { require_global_utils } from "../internal/global-utils.js";

//@ chunk-bwbq4xvm.js:32235-33515 cjs-fingerprint
var require_diag = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DiagAPI = undefined;
  var ComponentLogger_1 = require_ComponentLogger();
  var logLevelLogger_1 = require_logLevelLogger();
  var types_1 = require_types();
  var global_utils_1 = require_global_utils();
  var API_NAME = "diag";
  class DiagAPI {
    constructor() {
      function _logProxy(funcName) {
        return function (...args) {
          let logger = global_utils_1.getGlobal("diag");
          if (!logger) return;
          return logger[funcName](...args);
        };
      }
      let selfRef = this;
      let setLogger = (
        logger,
        optionsOrLogLevel = {
          logLevel: types_1.DiagLogLevel.INFO,
        },
      ) => {
        var _a;
        var _b;
        var _c;
        if (logger === selfRef) {
          let err = Error(
            "Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation",
          );
          selfRef.error((_a = err.stack) !== null && _a !== undefined ? _a : err.message);
          return false;
        }
        if (typeof optionsOrLogLevel === "number")
          optionsOrLogLevel = {
            logLevel: optionsOrLogLevel,
          };
        let oldLogger = global_utils_1.getGlobal("diag");
        let newLogger = logLevelLogger_1.createLogLevelDiagLogger(
          (_b = optionsOrLogLevel.logLevel) !== null && _b !== undefined ? _b : types_1.DiagLogLevel.INFO,
          logger,
        );
        if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
          let stack =
            (_c = Error().stack) !== null && _c !== undefined ? _c : "<failed to generate stacktrace>";
          oldLogger.warn(`Current logger will be overwritten from ${stack}`);
          newLogger.warn(`Current logger will overwrite one already registered from ${stack}`);
        }
        return global_utils_1.registerGlobal("diag", newLogger, selfRef, true);
      };
      selfRef.setLogger = setLogger;
      selfRef.disable = () => {
        global_utils_1.unregisterGlobal(API_NAME, selfRef);
      };
      selfRef.createComponentLogger = (options) => new ComponentLogger_1.DiagComponentLogger(options);
      selfRef.verbose = _logProxy("verbose");
      selfRef.debug = _logProxy("debug");
      selfRef.info = _logProxy("info");
      selfRef.warn = _logProxy("warn");
      selfRef.error = _logProxy("error");
    }
    static instance() {
      if (!this._instance) this._instance = new DiagAPI();
      return this._instance;
    }
  }
  cjsExports.DiagAPI = DiagAPI;
});
export { require_diag };

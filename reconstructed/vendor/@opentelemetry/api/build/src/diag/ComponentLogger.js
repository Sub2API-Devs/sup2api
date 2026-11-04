/**
 * @opentelemetry/api/build/src/diag/ComponentLogger.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_global_utils } from "../internal/global-utils.js";

//@ chunk-bwbq4xvm.js:30805-31359 cjs-fingerprint
var require_ComponentLogger = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DiagComponentLogger = undefined;
  var global_utils_1 = require_global_utils();
  class DiagComponentLogger {
    constructor(props) {
      this._namespace = props.namespace || "DiagComponentLogger";
    }
    debug(...args) {
      return logProxy("debug", this._namespace, args);
    }
    error(...args) {
      return logProxy("error", this._namespace, args);
    }
    info(...args) {
      return logProxy("info", this._namespace, args);
    }
    warn(...args) {
      return logProxy("warn", this._namespace, args);
    }
    verbose(...args) {
      return logProxy("verbose", this._namespace, args);
    }
  }
  cjsExports.DiagComponentLogger = DiagComponentLogger;
  function logProxy(funcName, namespace, args) {
    let logger = global_utils_1.getGlobal("diag");
    if (!logger) return;
    args.unshift(namespace);
    return logger[funcName](...args);
  }
});
export { require_ComponentLogger };

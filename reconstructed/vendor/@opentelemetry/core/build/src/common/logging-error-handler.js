/**
 * @opentelemetry/core/build/src/common/logging-error-handler.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";

//@ chunk-bwbq4xvm.js:57919-58362 cjs-fingerprint
var require_logging_error_handler = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.loggingErrorHandler = undefined;
  var api_1 = require_api();
  function loggingErrorHandler() {
    return (ex) => {
      api_1.diag.error(stringifyException(ex));
    };
  }
  cjsExports.loggingErrorHandler = loggingErrorHandler;
  function stringifyException(ex) {
    if (typeof ex === "string") return ex;
    else return JSON.stringify(flattenException(ex));
  }
  function flattenException(ex) {
    let result = {};
    let current = ex;
    while (current !== null) {
      Object.getOwnPropertyNames(current).forEach((propertyName) => {
        if (result[propertyName]) return;
        let value = current[propertyName];
        if (value) result[propertyName] = String(value);
      });
      current = Object.getPrototypeOf(current);
    }
    return result;
  }
});
export { require_logging_error_handler };

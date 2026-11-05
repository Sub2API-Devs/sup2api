/**
 * @opentelemetry/core/build/src/common/global-error-handler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_logging_error_handler } from "./logging-error-handler.js";

//@ chunk-7kayq7nc.js:58448-58722 cjs-fingerprint
var require_global_error_handler = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.globalErrorHandler = cjsExports.setGlobalErrorHandler = undefined;
  var logging_error_handler_1 = require_logging_error_handler();
  var delegateHandler = logging_error_handler_1.loggingErrorHandler();
  function setGlobalErrorHandler(handler) {
    delegateHandler = handler;
  }
  cjsExports.setGlobalErrorHandler = setGlobalErrorHandler;
  function globalErrorHandler(ex) {
    try {
      delegateHandler(ex);
    } catch {}
  }
  cjsExports.globalErrorHandler = globalErrorHandler;
});
export { require_global_error_handler };

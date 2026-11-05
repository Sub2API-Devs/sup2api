/**
 * @opentelemetry/otlp-exporter-base/build/src/logging-response-handler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-exporter-base@0.208.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";

//@ chunk-vxhm2nqe.js:2585-3069 cjs-fingerprint
var require_logging_response_handler = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createLoggingPartialSuccessResponseHandler = undefined;
  var api_1 = require_api();
  function isPartialSuccessResponse(response) {
    return Object.prototype.hasOwnProperty.call(response, "partialSuccess");
  }
  function createLoggingPartialSuccessResponseHandler() {
    return {
      handleResponse(response) {
        if (
          response == null ||
          !isPartialSuccessResponse(response) ||
          response.partialSuccess == null ||
          Object.keys(response.partialSuccess).length === 0
        )
          return;
        api_1.diag.warn("Received Partial Success response:", JSON.stringify(response.partialSuccess));
      },
    };
  }
  cjsExports.createLoggingPartialSuccessResponseHandler = createLoggingPartialSuccessResponseHandler;
});
export { require_logging_response_handler };

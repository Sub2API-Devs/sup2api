/**
 * @aws-sdk/middleware-recursion-detection/dist-cjs/recursionDetectionMiddleware.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-recursion-detection@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_invoke_store } from "../../../@aws/lambda-invoke-store/dist-cjs/invoke-store.js";
import { require_protocol_http as require_protocol_http_3 } from "../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-edce4vxq.js:4337-4991 cjs-fingerprint
var require_recursionDetectionMiddleware = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.recursionDetectionMiddleware = undefined;
  var lambda_invoke_store_1 = require_invoke_store();
  var protocol_http_1 = require_protocol_http_3();
  var TRACE_ID_HEADER_NAME = "X-Amzn-Trace-Id";
  var ENV_LAMBDA_FUNCTION_NAME = "AWS_LAMBDA_FUNCTION_NAME";
  var ENV_TRACE_ID = "_X_AMZN_TRACE_ID";
  var recursionDetectionMiddleware = () => (next) => async (args) => {
    let { request } = args;
    if (!protocol_http_1.HttpRequest.isInstance(request)) return next(args);
    let traceIdHeader =
      Object.keys(request.headers ?? {}).find(
        (h) => h.toLowerCase() === TRACE_ID_HEADER_NAME.toLowerCase(),
      ) ?? TRACE_ID_HEADER_NAME;
    if (request.headers.hasOwnProperty(traceIdHeader)) return next(args);
    let functionName = process.env[ENV_LAMBDA_FUNCTION_NAME];
    let traceIdFromEnv = process.env[ENV_TRACE_ID];
    let traceId =
      (await lambda_invoke_store_1.InvokeStore.getInstanceAsync())?.getXRayTraceId() ?? traceIdFromEnv;
    let nonEmptyString = (str) => typeof str === "string" && str.length > 0;
    if (nonEmptyString(functionName) && nonEmptyString(traceId))
      request.headers[TRACE_ID_HEADER_NAME] = traceId;
    return next({
      ...args,
      request,
    });
  };
  cjsExports.recursionDetectionMiddleware = recursionDetectionMiddleware;
});
export { require_recursionDetectionMiddleware };

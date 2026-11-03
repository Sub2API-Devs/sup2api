/**
 * @azure/core-rest-pipeline/dist/esm/policies/tracingPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (8)
 * attribution: esm-layout 2, esm-fingerprint 6
 */
import { RestError, isRestError } from "../../../../../@typespec/ts-http-runtime/dist/esm/restError.js";
import { getUserAgentValue } from "../util/userAgent.js";
import { Sanitizer } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/sanitizer.js";
import { createTracingClient } from "../../../../core-tracing/dist/esm/tracingClient.js";
import { SDK_VERSION_2 } from "../constants.js";
import { ut } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { getErrorMessage } from "../../../../core-util/dist/esm/error.js";
import { Wo } from "../util/file.js";

//@ chunk-mrx6y2r5.js:59724-59734 esm-layout
var RestError_default = RestError;
//@ chunk-mrx6y2r5.js:59734-59762 esm-layout
function Xn(e) {
  return isRestError(e);
}
//@ chunk-mrx6y2r5.js:59762-59785 esm-fingerprint
var TRACINGPOLICY = "tracingPolicy";
//@ chunk-mrx6y2r5.js:59785-60294 esm-fingerprint
function tracingPolicy(options = {}) {
  let userAgentPromise = getUserAgentValue(options.userAgentPrefix);
  let sanitizer = new Sanitizer({
    additionalAllowedQueryParameters: options.additionalAllowedQueryParameters,
  });
  let tracingClient = tryCreateTracingClient();
  return {
    name: TRACINGPOLICY,
    async sendRequest(request, next) {
      var _a;
      if (!tracingClient) return next(request);
      let userAgent = await userAgentPromise;
      let spanAttributes = {
        "http.url": sanitizer.sanitizeUrl(request.url),
        "http.method": request.method,
        "http.user_agent": userAgent,
        requestId: request.requestId,
      };
      if (userAgent) spanAttributes["http.user_agent"] = userAgent;
      let { span, tracingContext } =
        (_a = tryCreateSpan(tracingClient, request, spanAttributes)) !== null && _a !== undefined ? _a : {};
      if (!span || !tracingContext) return next(request);
      try {
        let response = await tracingClient.withContext(tracingContext, next, request);
        tryProcessResponse(span, response);
        return response;
      } catch (err) {
        tryProcessError(span, err);
        throw err;
      }
    },
  };
}
//@ chunk-mrx6y2r5.js:60294-60475 esm-fingerprint
function tryCreateTracingClient() {
  try {
    return createTracingClient({
      namespace: "",
      packageName: "@azure/core-rest-pipeline",
      packageVersion: SDK_VERSION_2,
    });
  } catch (error) {
    ut.warning(`Error when creating the TracingClient: ${getErrorMessage(error)}`);
    return;
  }
}
//@ chunk-mrx6y2r5.js:60475-60932 esm-fingerprint
function tryCreateSpan(tracingClient, request, spanAttributes) {
  try {
    let { span, updatedOptions } = tracingClient.startSpan(
      `HTTP ${request.method}`,
      {
        tracingOptions: request.tracingOptions,
      },
      {
        spanKind: "client",
        spanAttributes,
      },
    );
    if (!span.isRecording()) {
      span.end();
      return;
    }
    let headers = tracingClient.createRequestHeaders(updatedOptions.tracingOptions.tracingContext);
    for (let [key, value] of Object.entries(headers)) request.headers.set(key, value);
    return {
      span,
      tracingContext: updatedOptions.tracingOptions.tracingContext,
    };
  } catch (e) {
    ut.warning(`Skipping creating a tracing span due to an error: ${getErrorMessage(e)}`);
    return;
  }
}
//@ chunk-mrx6y2r5.js:60932-61166 esm-fingerprint
function tryProcessError(span, error) {
  try {
    span.setStatus({
      status: "error",
      error: Wo(error) ? error : undefined,
    });
    if (Xn(error) && error.statusCode) span.setAttribute("http.status_code", error.statusCode);
    span.end();
  } catch (e) {
    ut.warning(`Skipping tracing span processing due to an error: ${getErrorMessage(e)}`);
  }
}
//@ chunk-mrx6y2r5.js:61166-61450 esm-fingerprint
function tryProcessResponse(span, response) {
  try {
    span.setAttribute("http.status_code", response.status);
    let serviceRequestId = response.headers.get("x-ms-request-id");
    if (serviceRequestId) span.setAttribute("serviceRequestId", serviceRequestId);
    if (response.status >= 400)
      span.setStatus({
        status: "error",
      });
    span.end();
  } catch (e) {
    ut.warning(`Skipping tracing span processing due to an error: ${getErrorMessage(e)}`);
  }
}
export { tracingPolicy, Xn, RestError_default };

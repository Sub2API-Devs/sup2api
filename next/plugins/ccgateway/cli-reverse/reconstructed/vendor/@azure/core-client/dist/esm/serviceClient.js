/**
 * @azure/core-client/dist/esm/serviceClient.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logger_3 } from "./log.js";
import { getSerializer, getRequestUrl } from "./urlHelpers.js";
import { isExponentialBackoff } from "../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";
import { getOperationRequestInfo } from "./operationHelpers.js";
import { getStreamingResponseStatusCodes, flattenResponse } from "../index.js";
import { createClientPipeline } from "./pipeline.js";

//@ chunk-b5df2wx1.js:79655-81677 esm-fingerprint
class ServiceClient {
  constructor(options = {}) {
    var _a;
    var _b;
    this._requestContentType = options.requestContentType;
    this._endpoint = (_a = options.endpoint) !== null && _a !== undefined ? _a : options.baseUri;
    if (options.baseUri)
      logger_3.warning(
        "The baseUri option for SDK Clients has been deprecated, please use endpoint instead.",
      );
    this._allowInsecureConnection = options.allowInsecureConnection;
    this._httpClient = options.httpClient || getSerializer();
    this.pipeline = options.pipeline || createDefaultPipeline(options);
    if ((_b = options.additionalPolicies) === null || _b === undefined ? undefined : _b.length)
      for (let { policy, position } of options.additionalPolicies) {
        let afterPhase = position === "perRetry" ? "Sign" : undefined;
        this.pipeline.addPolicy(policy, {
          afterPhase,
        });
      }
  }
  async sendRequest(request) {
    return this.pipeline.sendRequest(this._httpClient, request);
  }
  async sendOperationRequest(operationArguments, operationSpec) {
    let endpoint = operationSpec.baseUrl || this._endpoint;
    if (!endpoint)
      throw Error(
        "If operationSpec.baseUrl is not specified, then the ServiceClient must have a endpoint string property that contains the base URL to use.",
      );
    let url = getRequestUrl(endpoint, operationSpec, operationArguments, this);
    let request = isExponentialBackoff({
      url,
    });
    request.method = operationSpec.httpMethod;
    let operationInfo = getOperationRequestInfo(request);
    operationInfo.operationSpec = operationSpec;
    operationInfo.operationArguments = operationArguments;
    let contentType = operationSpec.contentType || this._requestContentType;
    if (contentType && operationSpec.requestBody) request.headers.set("Content-Type", contentType);
    let options = operationArguments.options;
    if (options) {
      let requestOptions = options.requestOptions;
      if (requestOptions) {
        if (requestOptions.timeout) request.timeout = requestOptions.timeout;
        if (requestOptions.onUploadProgress) request.onUploadProgress = requestOptions.onUploadProgress;
        if (requestOptions.onDownloadProgress) request.onDownloadProgress = requestOptions.onDownloadProgress;
        if (requestOptions.shouldDeserialize !== undefined)
          operationInfo.shouldDeserialize = requestOptions.shouldDeserialize;
        if (requestOptions.allowInsecureConnection) request.allowInsecureConnection = true;
      }
      if (options.abortSignal) request.abortSignal = options.abortSignal;
      if (options.tracingOptions) request.tracingOptions = options.tracingOptions;
    }
    if (this._allowInsecureConnection) request.allowInsecureConnection = true;
    if (request.streamResponseStatusCodes === undefined)
      request.streamResponseStatusCodes = getStreamingResponseStatusCodes(operationSpec);
    try {
      let rawResponse = await this.sendRequest(request);
      let flatResponse = flattenResponse(rawResponse, operationSpec.responses[rawResponse.status]);
      if (options === null || options === undefined ? undefined : options.onResponse)
        options.onResponse(rawResponse, flatResponse);
      return flatResponse;
    } catch (error) {
      if (typeof error === "object" && (error === null || error === undefined ? undefined : error.response)) {
        let rawResponse = error.response;
        let flatResponse = flattenResponse(
          rawResponse,
          operationSpec.responses[error.statusCode] || operationSpec.responses.default,
        );
        error.details = flatResponse;
        if (options === null || options === undefined ? undefined : options.onResponse)
          options.onResponse(rawResponse, flatResponse, error);
      }
      throw error;
    }
  }
}
//@ chunk-b5df2wx1.js:81677-81842 esm-fingerprint
function createDefaultPipeline(options) {
  let credentialScopes = getCredentialScopes(options);
  let credentialOptions =
    options.credential && credentialScopes
      ? {
          credentialScopes,
          credential: options.credential,
        }
      : undefined;
  return createClientPipeline(
    Object.assign(Object.assign({}, options), {
      credentialOptions,
    }),
  );
}
//@ chunk-b5df2wx1.js:81842-82206 esm-fingerprint
function getCredentialScopes(options) {
  if (options.credentialScopes) return options.credentialScopes;
  if (options.endpoint) return `${options.endpoint}/.default`;
  if (options.baseUri) return `${options.baseUri}/.default`;
  if (options.credential && !options.credentialScopes)
    throw Error(
      "When using credentials, the ServiceClientOptions must contain either a endpoint or a credentialScopes. Unable to create a bearerTokenAuthenticationPolicy",
    );
  return;
}
export { ServiceClient };

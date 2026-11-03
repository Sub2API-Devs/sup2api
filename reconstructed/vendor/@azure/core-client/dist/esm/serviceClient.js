/**
 * @azure/core-client/dist/esm/serviceClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { Md } from "./log.js";
import { Od, xd } from "./urlHelpers.js";
import { je } from "../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";
import { ft } from "./operationHelpers.js";
import { kd, Aa } from "../index.js";
import { Pd } from "./pipeline.js";

//@ chunk-mrx6y2r5.js:79655-81677 esm-fingerprint
class ti {
  constructor(e = {}) {
    var t, r;
    if (
      ((this._requestContentType = e.requestContentType),
      (this._endpoint = (t = e.endpoint) !== null && t !== void 0 ? t : e.baseUri),
      e.baseUri)
    )
      Md.warning("The baseUri option for SDK Clients has been deprecated, please use endpoint instead.");
    if (
      ((this._allowInsecureConnection = e.allowInsecureConnection),
      (this._httpClient = e.httpClient || Od()),
      (this.pipeline = e.pipeline || ug(e)),
      (r = e.additionalPolicies) === null || r === void 0 ? void 0 : r.length)
    )
      for (let { policy: policy, position: position } of e.additionalPolicies) {
        let i = position === "perRetry" ? "Sign" : void 0;
        this.pipeline.addPolicy(policy, { afterPhase: i });
      }
  }
  async sendRequest(e) {
    return this.pipeline.sendRequest(this._httpClient, e);
  }
  async sendOperationRequest(e, t) {
    let r = t.baseUrl || this._endpoint;
    if (!r)
      throw Error(
        "If operationSpec.baseUrl is not specified, then the ServiceClient must have a endpoint string property that contains the base URL to use.",
      );
    let n = xd(r, t, e, this),
      o = je({ url: n });
    o.method = t.httpMethod;
    let i = ft(o);
    ((i.operationSpec = t), (i.operationArguments = e));
    let s = t.contentType || this._requestContentType;
    if (s && t.requestBody) o.headers.set("Content-Type", s);
    let options = e.options;
    if (options) {
      let requestOptions = options.requestOptions;
      if (requestOptions) {
        if (requestOptions.timeout) o.timeout = requestOptions.timeout;
        if (requestOptions.onUploadProgress) o.onUploadProgress = requestOptions.onUploadProgress;
        if (requestOptions.onDownloadProgress) o.onDownloadProgress = requestOptions.onDownloadProgress;
        if (requestOptions.shouldDeserialize !== void 0)
          i.shouldDeserialize = requestOptions.shouldDeserialize;
        if (requestOptions.allowInsecureConnection) o.allowInsecureConnection = !0;
      }
      if (options.abortSignal) o.abortSignal = options.abortSignal;
      if (options.tracingOptions) o.tracingOptions = options.tracingOptions;
    }
    if (this._allowInsecureConnection) o.allowInsecureConnection = !0;
    if (o.streamResponseStatusCodes === void 0) o.streamResponseStatusCodes = kd(t);
    try {
      let sendRequest = await this.sendRequest(o),
        l = Aa(sendRequest, t.responses[sendRequest.status]);
      if (options === null || options === void 0 ? void 0 : options.onResponse)
        options.onResponse(sendRequest, l);
      return l;
    } catch (error) {
      if (typeof error === "object" && (error === null || error === void 0 ? void 0 : error.response)) {
        let response = error.response,
          d = Aa(response, t.responses[error.statusCode] || t.responses.default);
        if (((error.details = d), options === null || options === void 0 ? void 0 : options.onResponse))
          options.onResponse(response, d, error);
      }
      throw error;
    }
  }
}
//@ chunk-mrx6y2r5.js:81677-81842 esm-fingerprint
function ug(e) {
  let t = hg(e),
    r = e.credential && t ? { credentialScopes: t, credential: e.credential } : void 0;
  return Pd(Object.assign(Object.assign({}, e), { credentialOptions: r }));
}
//@ chunk-mrx6y2r5.js:81842-82206 esm-fingerprint
function hg(e) {
  if (e.credentialScopes) return e.credentialScopes;
  if (e.endpoint) return `${e.endpoint}/.default`;
  if (e.baseUri) return `${e.baseUri}/.default`;
  if (e.credential && !e.credentialScopes)
    throw Error(
      "When using credentials, the ServiceClientOptions must contain either a endpoint or a credentialScopes. Unable to create a bearerTokenAuthenticationPolicy",
    );
  return;
}

export { ti };

/**
 * @azure/identity/dist/esm/credentials/managedIdentityCredential/imdsMsi.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-fingerprint 3
 */
import { credentialLogger } from "../../util/logging.js";
import { mapScopesToResource } from "./utils.js";
import {
  isCustomRetryPolicy,
  isExponentialBackoff,
} from "../../../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";
import { tracingClient } from "../../util/tracing.js";
import { createFileBody } from "../../../../../core-rest-pipeline/dist/esm/util/file.js";

//@ chunk-b5df2wx1.js:289108-289224 esm-fingerprint
var msiName = "ManagedIdentityCredential - IMDS";
var logger_5 = credentialLogger(msiName);
var imdsHost = "http://169.254.169.254";
var imdsEndpointPath = "/metadata/identity/oauth2/token";
//@ chunk-b5df2wx1.js:289224-289480 esm-fingerprint
function prepareInvalidRequestOptions(scopes) {
  var _a;
  if (!mapScopesToResource(scopes)) throw Error(`${msiName}: Multiple scopes are not supported.`);
  let url = new URL(
    imdsEndpointPath,
    (_a = process.env.AZURE_POD_IDENTITY_AUTHORITY_HOST) !== null && _a !== undefined ? _a : imdsHost,
  );
  let rawHeaders = {
    Accept: "application/json",
  };
  return {
    url: `${url}`,
    method: "GET",
    headers: isCustomRetryPolicy(rawHeaders),
  };
}
//@ chunk-b5df2wx1.js:289480-290526 esm-fingerprint
var imdsMsi = {
  name: "imdsMsi",
  async isAvailable(options) {
    let { scopes, identityClient, getTokenOptions } = options;
    let resource = mapScopesToResource(scopes);
    if (!resource) {
      logger_5.info(`${msiName}: Unavailable. Multiple scopes are not supported.`);
      return false;
    }
    if (process.env.AZURE_POD_IDENTITY_AUTHORITY_HOST) return true;
    if (!identityClient) throw Error("Missing IdentityClient");
    let requestOptions = prepareInvalidRequestOptions(resource);
    return tracingClient.withSpan(
      "ManagedIdentityCredential-pingImdsEndpoint",
      getTokenOptions !== null && getTokenOptions !== undefined ? getTokenOptions : {},
      async (updatedOptions) => {
        var _a;
        var _b;
        requestOptions.tracingOptions = updatedOptions.tracingOptions;
        let request = isExponentialBackoff(requestOptions);
        request.timeout =
          ((_a = updatedOptions.requestOptions) === null || _a === undefined ? undefined : _a.timeout) ||
          1000;
        request.allowInsecureConnection = true;
        let response;
        try {
          logger_5.info(`${msiName}: Pinging the Azure IMDS endpoint`);
          response = await identityClient.sendRequest(request);
        } catch (err) {
          if (createFileBody(err)) logger_5.verbose(`${msiName}: Caught error ${err.name}: ${err.message}`);
          logger_5.info(`${msiName}: The Azure IMDS endpoint is unavailable`);
          return false;
        }
        if (response.status === 403) {
          if (
            (_b = response.bodyAsText) === null || _b === undefined ? undefined : _b.includes("unreachable")
          ) {
            logger_5.info(`${msiName}: The Azure IMDS endpoint is unavailable`);
            logger_5.info(`${msiName}: ${response.bodyAsText}`);
            return false;
          }
        }
        logger_5.info(`${msiName}: The Azure IMDS endpoint is available`);
        return true;
      },
    );
  },
};
export { imdsMsi };

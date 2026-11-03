/**
 * @azure/identity/dist/esm/client/identityClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { isNodeLike_default } from "../../../../core-rest-pipeline/dist/esm/util/file.js";
import { DefaultAuthorityHost, SDK_VERSION } from "../constants.js";
import { ServiceClient } from "../../../../core-client/dist/esm/serviceClient.js";
import { logger } from "../util/logging.js";
import {
  parseExpirationTimestamp,
  parseRefreshTimestamp,
} from "../credentials/managedIdentityCredential/utils.js";
import { $n, AuthenticationErrorName } from "../../index.js";
import { tracingClient } from "../util/tracing.js";
import { getIdentityTokenEndpointSuffix } from "../util/identityTokenEndpoint.js";
import { je, rr } from "../../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";

//@ chunk-mrx6y2r5.js:83557-83582 esm-fingerprint
var noCorrelationId = "noCorrelationId";
//@ chunk-mrx6y2r5.js:83582-83744 esm-fingerprint
function getIdentityClientAuthorityHost(options) {
  let authorityHost = options === null || options === undefined ? undefined : options.authorityHost;
  if (isNodeLike_default)
    authorityHost =
      authorityHost !== null && authorityHost !== undefined
        ? authorityHost
        : process.env.AZURE_AUTHORITY_HOST;
  return authorityHost !== null && authorityHost !== undefined ? authorityHost : DefaultAuthorityHost;
}
//@ chunk-mrx6y2r5.js:83744-88341 esm-fingerprint
class IdentityClient extends ServiceClient {
  constructor(options) {
    var _a;
    var _b;
    let packageDetails = `azsdk-js-identity/${SDK_VERSION}`;
    let userAgentPrefix = (
      (_a = options === null || options === undefined ? undefined : options.userAgentOptions) === null ||
      _a === undefined
        ? undefined
        : _a.userAgentPrefix
    )
      ? `${options.userAgentOptions.userAgentPrefix} ${packageDetails}`
      : `${packageDetails}`;
    let baseUri = getIdentityClientAuthorityHost(options);
    if (!baseUri.startsWith("https:"))
      throw Error("The authorityHost address must use the 'https' protocol.");
    super(
      Object.assign(
        Object.assign(
          {
            requestContentType: "application/json; charset=utf-8",
            retryOptions: {
              maxRetries: 3,
            },
          },
          options,
        ),
        {
          userAgentOptions: {
            userAgentPrefix,
          },
          baseUri,
        },
      ),
    );
    this.allowInsecureConnection = false;
    this.authorityHost = baseUri;
    this.abortControllers = new Map();
    this.allowLoggingAccountIdentifiers =
      (_b = options === null || options === undefined ? undefined : options.loggingOptions) === null ||
      _b === undefined
        ? undefined
        : _b.allowLoggingAccountIdentifiers;
    this.tokenCredentialOptions = Object.assign({}, options);
    if (options === null || options === undefined ? undefined : options.allowInsecureConnection)
      this.allowInsecureConnection = options.allowInsecureConnection;
  }
  async sendTokenRequest(request) {
    logger.info(`IdentityClient: sending token request to [${request.url}]`);
    let response = await this.sendRequest(request);
    if (response.bodyAsText && (response.status === 200 || response.status === 201)) {
      let parsedBody = JSON.parse(response.bodyAsText);
      if (!parsedBody.access_token) return null;
      this.logIdentifiers(response);
      let token = {
        accessToken: {
          token: parsedBody.access_token,
          expiresOnTimestamp: parseExpirationTimestamp(parsedBody),
          refreshAfterTimestamp: parseRefreshTimestamp(parsedBody),
          tokenType: "Bearer",
        },
        refreshToken: parsedBody.refresh_token,
      };
      logger.info(
        `IdentityClient: [${request.url}] token acquired, expires on ${token.accessToken.expiresOnTimestamp}`,
      );
      return token;
    } else {
      let error = new $n(response.status, response.bodyAsText);
      logger.warning(
        `IdentityClient: authentication error. HTTP status: ${response.status}, ${error.errorResponse.errorDescription}`,
      );
      throw error;
    }
  }
  async refreshAccessToken(tenantId, clientId, scopes, refreshToken, clientSecret, options = {}) {
    if (refreshToken === undefined) return null;
    logger.info(
      `IdentityClient: refreshing access token with client ID: ${clientId}, scopes: ${scopes} started`,
    );
    let refreshParams = {
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
      scope: scopes,
    };
    if (clientSecret !== undefined) refreshParams.client_secret = clientSecret;
    let query = new URLSearchParams(refreshParams);
    return tracingClient.withSpan("IdentityClient.refreshAccessToken", options, async (updatedOptions) => {
      try {
        let urlSuffix = getIdentityTokenEndpointSuffix(tenantId);
        let request = je({
          url: `${this.authorityHost}/${tenantId}/${urlSuffix}`,
          method: "POST",
          body: query.toString(),
          abortSignal: options.abortSignal,
          headers: rr({
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          }),
          tracingOptions: updatedOptions.tracingOptions,
        });
        let response = await this.sendTokenRequest(request);
        logger.info(`IdentityClient: refreshed token for client ID: ${clientId}`);
        return response;
      } catch (err) {
        if (err.name === AuthenticationErrorName && err.errorResponse.error === "interaction_required") {
          logger.info(`IdentityClient: interaction required for client ID: ${clientId}`);
          return null;
        } else {
          logger.warning(`IdentityClient: failed refreshing token for client ID: ${clientId}: ${err}`);
          throw err;
        }
      }
    });
  }
  generateAbortSignal(correlationId) {
    let controller = new AbortController();
    let controllers = this.abortControllers.get(correlationId) || [];
    controllers.push(controller);
    this.abortControllers.set(correlationId, controllers);
    let existingOnAbort = controller.signal.onabort;
    controller.signal.onabort = (...params) => {
      this.abortControllers.set(correlationId, undefined);
      if (existingOnAbort) existingOnAbort.apply(controller.signal, params);
    };
    return controller.signal;
  }
  abortRequests(correlationId) {
    let key = correlationId || noCorrelationId;
    let controllers = [
      ...(this.abortControllers.get(key) || []),
      ...(this.abortControllers.get(noCorrelationId) || []),
    ];
    if (!controllers.length) return;
    for (let controller of controllers) controller.abort();
    this.abortControllers.set(key, undefined);
  }
  getCorrelationId(options) {
    var _a;
    let parameter =
      (_a = options === null || options === undefined ? undefined : options.body) === null || _a === undefined
        ? undefined
        : _a
            .split("&")
            .map((part) => part.split("="))
            .find(([key]) => key === "client-request-id");
    return parameter && parameter.length ? parameter[1] || noCorrelationId : noCorrelationId;
  }
  async sendGetRequestAsync(url, options) {
    let request = je({
      url,
      method: "GET",
      body: options === null || options === undefined ? undefined : options.body,
      allowInsecureConnection: this.allowInsecureConnection,
      headers: rr(options === null || options === undefined ? undefined : options.headers),
      abortSignal: this.generateAbortSignal(noCorrelationId),
    });
    let response = await this.sendRequest(request);
    this.logIdentifiers(response);
    return {
      body: response.bodyAsText ? JSON.parse(response.bodyAsText) : undefined,
      headers: response.headers.toJSON(),
      status: response.status,
    };
  }
  async sendPostRequestAsync(url, options) {
    let request = je({
      url,
      method: "POST",
      body: options === null || options === undefined ? undefined : options.body,
      headers: rr(options === null || options === undefined ? undefined : options.headers),
      allowInsecureConnection: this.allowInsecureConnection,
      abortSignal: this.generateAbortSignal(this.getCorrelationId(options)),
    });
    let response = await this.sendRequest(request);
    this.logIdentifiers(response);
    return {
      body: response.bodyAsText ? JSON.parse(response.bodyAsText) : undefined,
      headers: response.headers.toJSON(),
      status: response.status,
    };
  }
  getTokenCredentialOptions() {
    return this.tokenCredentialOptions;
  }
  logIdentifiers(response) {
    if (!this.allowLoggingAccountIdentifiers || !response.bodyAsText) return;
    let unavailableUpn = "No User Principal Name available";
    try {
      let accessToken = (response.parsedBody || JSON.parse(response.bodyAsText)).access_token;
      if (!accessToken) return;
      let base64Metadata = accessToken.split(".")[1];
      let { appid, upn, tid, oid } = JSON.parse(Buffer.from(base64Metadata, "base64").toString("utf8"));
      logger.info(
        `[Authenticated account] Client ID: ${appid}. Tenant ID: ${tid}. User Principal Name: ${upn || unavailableUpn}. Object ID (user): ${oid}`,
      );
    } catch (e) {
      logger.warning(
        "allowLoggingAccountIdentifiers was set, but we couldn't log the account information. Error:",
        e.message,
      );
    }
  }
}
export { IdentityClient };

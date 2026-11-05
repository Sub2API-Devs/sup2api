/**
 * google-auth-library/build/src/auth/externalAccountAuthorizedUserClient.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_authclient } from "./authclient.js";
import { require_oauth2common } from "./oauth2common.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_baseexternalclient } from "./baseexternalclient.js";

//@ chunk-e8d3a8an.js:135921-139003 cjs-fingerprint
var require_externalAccountAuthorizedUserClient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ExternalAccountAuthorizedUserClient = cjsExports.EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE =
    undefined;
  var authclient_1 = require_authclient();
  var oauth2common_1 = require_oauth2common();
  var gaxios_1 = require_gaxios_2();
  var stream = importMetaRequire("stream");
  var baseexternalclient_1 = require_baseexternalclient();
  cjsExports.EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE = "external_account_authorized_user";
  var DEFAULT_TOKEN_URL = "https://sts.{universeDomain}/v1/oauthtoken";
  class ExternalAccountAuthorizedUserHandler extends oauth2common_1.OAuthClientAuthHandler {
    #e;
    constructor(options) {
      super(options);
      this.#e = options.tokenRefreshEndpoint;
    }
    async refreshToken(refreshToken, headers) {
      let opts = {
        ...ExternalAccountAuthorizedUserHandler.RETRY_CONFIG,
        url: this.#e,
        method: "POST",
        headers,
        data: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        responseType: "json",
      };
      authclient_1.AuthClient.setMethodName(opts, "refreshToken");
      this.applyClientAuthenticationOptions(opts);
      try {
        let response = await this.transporter.request(opts);
        let tokenRefreshResponse = response.data;
        tokenRefreshResponse.res = response;
        return tokenRefreshResponse;
      } catch (error) {
        if (error instanceof gaxios_1.GaxiosError && error.response)
          throw oauth2common_1.getErrorFromOAuthErrorResponse(error.response.data, error);
        throw error;
      }
    }
  }
  class ExternalAccountAuthorizedUserClient extends authclient_1.AuthClient {
    cachedAccessToken;
    externalAccountAuthorizedUserHandler;
    refreshToken;
    constructor(options) {
      super(options);
      if (options.universe_domain) this.universeDomain = options.universe_domain;
      this.refreshToken = options.refresh_token;
      let clientAuthentication = {
        confidentialClientType: "basic",
        clientId: options.client_id,
        clientSecret: options.client_secret,
      };
      this.externalAccountAuthorizedUserHandler = new ExternalAccountAuthorizedUserHandler({
        tokenRefreshEndpoint:
          options.token_url ?? DEFAULT_TOKEN_URL.replace("{universeDomain}", this.universeDomain),
        transporter: this.transporter,
        clientAuthentication,
      });
      this.cachedAccessToken = null;
      this.quotaProjectId = options.quota_project_id;
      if (typeof options?.eagerRefreshThresholdMillis !== "number")
        this.eagerRefreshThresholdMillis = baseexternalclient_1.EXPIRATION_TIME_OFFSET;
      else this.eagerRefreshThresholdMillis = options.eagerRefreshThresholdMillis;
      this.forceRefreshOnFailure = !!options?.forceRefreshOnFailure;
    }
    async getAccessToken() {
      if (!this.cachedAccessToken || this.isExpired(this.cachedAccessToken))
        await this.refreshAccessTokenAsync();
      return {
        token: this.cachedAccessToken.access_token,
        res: this.cachedAccessToken.res,
      };
    }
    async getRequestHeaders() {
      let accessTokenResponse = await this.getAccessToken();
      let headers = new Headers({
        authorization: `Bearer ${accessTokenResponse.token}`,
      });
      return this.addSharedMetadataHeaders(headers);
    }
    request(opts, callback) {
      if (callback)
        this.requestAsync(opts).then(
          (result) => callback(null, result),
          (e) => callback(e, e.response),
        );
      else return this.requestAsync(opts);
    }
    async requestAsync(opts, reAuthRetried = false) {
      let response;
      try {
        let requestHeaders = await this.getRequestHeaders();
        opts.headers = gaxios_1.Gaxios.mergeHeaders(opts.headers);
        this.addUserProjectAndAuthHeaders(opts.headers, requestHeaders);
        response = await this.transporter.request(opts);
      } catch (e) {
        let res = e.response;
        if (res) {
          let statusCode = res.status;
          let isReadableStream = res.config.data instanceof stream.Readable;
          if (
            !reAuthRetried &&
            (statusCode === 401 || statusCode === 403) &&
            !isReadableStream &&
            this.forceRefreshOnFailure
          ) {
            await this.refreshAccessTokenAsync();
            return await this.requestAsync(opts, true);
          }
        }
        throw e;
      }
      return response;
    }
    async refreshAccessTokenAsync() {
      let refreshResponse = await this.externalAccountAuthorizedUserHandler.refreshToken(this.refreshToken);
      this.cachedAccessToken = {
        access_token: refreshResponse.access_token,
        expiry_date: new Date().getTime() + refreshResponse.expires_in * 1000,
        res: refreshResponse.res,
      };
      if (refreshResponse.refresh_token !== undefined) this.refreshToken = refreshResponse.refresh_token;
      return this.cachedAccessToken;
    }
    isExpired(credentials) {
      let now = new Date().getTime();
      return credentials.expiry_date
        ? now >= credentials.expiry_date - this.eagerRefreshThresholdMillis
        : false;
    }
  }
  cjsExports.ExternalAccountAuthorizedUserClient = ExternalAccountAuthorizedUserClient;
});
export { require_externalAccountAuthorizedUserClient };

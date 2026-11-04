/**
 * google-auth-library/build/src/auth/downscopedclient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_authclient } from "./authclient.js";
import { require_stscredentials } from "./stscredentials.js";

//@ chunk-na3pph4p.js:151582-155231 cjs-fingerprint
var require_downscopedclient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DownscopedClient =
    cjsExports.EXPIRATION_TIME_OFFSET =
    cjsExports.MAX_ACCESS_BOUNDARY_RULES_COUNT =
      undefined;
  var gaxios_1 = require_gaxios_2();
  var stream = importMetaRequire("stream");
  var authclient_1 = require_authclient();
  var sts = require_stscredentials();
  var STS_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
  var STS_REQUEST_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";
  var STS_SUBJECT_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";
  cjsExports.MAX_ACCESS_BOUNDARY_RULES_COUNT = 10;
  cjsExports.EXPIRATION_TIME_OFFSET = 300000;
  class DownscopedClient extends authclient_1.AuthClient {
    authClient;
    credentialAccessBoundary;
    cachedDownscopedAccessToken;
    stsCredential;
    constructor(
      options,
      credentialAccessBoundary = {
        accessBoundary: {
          accessBoundaryRules: [],
        },
      },
    ) {
      super(options instanceof authclient_1.AuthClient ? {} : options);
      if (options instanceof authclient_1.AuthClient) {
        this.authClient = options;
        this.credentialAccessBoundary = credentialAccessBoundary;
      } else {
        this.authClient = options.authClient;
        this.credentialAccessBoundary = options.credentialAccessBoundary;
      }
      if (this.credentialAccessBoundary.accessBoundary.accessBoundaryRules.length === 0)
        throw Error("At least one access boundary rule needs to be defined.");
      else if (
        this.credentialAccessBoundary.accessBoundary.accessBoundaryRules.length >
        cjsExports.MAX_ACCESS_BOUNDARY_RULES_COUNT
      )
        throw Error(
          `The provided access boundary has more than ${cjsExports.MAX_ACCESS_BOUNDARY_RULES_COUNT} access boundary rules.`,
        );
      for (let rule of this.credentialAccessBoundary.accessBoundary.accessBoundaryRules)
        if (rule.availablePermissions.length === 0)
          throw Error("At least one permission should be defined in access boundary rules.");
      this.stsCredential = new sts.StsCredentials({
        tokenExchangeEndpoint: `https://sts.${this.universeDomain}/v1/token`,
      });
      this.cachedDownscopedAccessToken = null;
    }
    setCredentials(credentials) {
      if (!credentials.expiry_date)
        throw Error("The access token expiry_date field is missing in the provided credentials.");
      super.setCredentials(credentials);
      this.cachedDownscopedAccessToken = credentials;
    }
    async getAccessToken() {
      if (!this.cachedDownscopedAccessToken || this.isExpired(this.cachedDownscopedAccessToken))
        await this.refreshAccessTokenAsync();
      return {
        token: this.cachedDownscopedAccessToken.access_token,
        expirationTime: this.cachedDownscopedAccessToken.expiry_date,
        res: this.cachedDownscopedAccessToken.res,
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
      let subjectToken = (await this.authClient.getAccessToken()).token;
      let stsCredentialsOptions = {
        grantType: STS_GRANT_TYPE,
        requestedTokenType: STS_REQUEST_TOKEN_TYPE,
        subjectToken,
        subjectTokenType: STS_SUBJECT_TOKEN_TYPE,
      };
      let stsResponse = await this.stsCredential.exchangeToken(
        stsCredentialsOptions,
        undefined,
        this.credentialAccessBoundary,
      );
      let sourceCredExpireDate = this.authClient.credentials?.expiry_date || null;
      let expiryDate = stsResponse.expires_in
        ? new Date().getTime() + stsResponse.expires_in * 1000
        : sourceCredExpireDate;
      this.cachedDownscopedAccessToken = {
        access_token: stsResponse.access_token,
        expiry_date: expiryDate,
        res: stsResponse.res,
      };
      this.credentials = {};
      Object.assign(this.credentials, this.cachedDownscopedAccessToken);
      delete this.credentials.res;
      this.emit("tokens", {
        refresh_token: null,
        expiry_date: this.cachedDownscopedAccessToken.expiry_date,
        access_token: this.cachedDownscopedAccessToken.access_token,
        token_type: "Bearer",
        id_token: null,
      });
      return this.cachedDownscopedAccessToken;
    }
    isExpired(downscopedAccessToken) {
      let now = new Date().getTime();
      return downscopedAccessToken.expiry_date
        ? now >= downscopedAccessToken.expiry_date - this.eagerRefreshThresholdMillis
        : false;
    }
  }
  cjsExports.DownscopedClient = DownscopedClient;
});
export { require_downscopedclient };

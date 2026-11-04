/**
 * google-auth-library/build/src/auth/baseexternalclient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_authclient } from "./authclient.js";
import { require_stscredentials } from "./stscredentials.js";
import { require_util } from "../util.js";
import { require_shared_2 } from "../shared.cjs";

//@ chunk-na3pph4p.js:106065-112832 cjs-fingerprint
var require_baseexternalclient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BaseExternalAccountClient =
    cjsExports.CLOUD_RESOURCE_MANAGER =
    cjsExports.EXTERNAL_ACCOUNT_TYPE =
    cjsExports.EXPIRATION_TIME_OFFSET =
      undefined;
  var gaxios_1 = require_gaxios_2();
  var stream = importMetaRequire("stream");
  var authclient_1 = require_authclient();
  var sts = require_stscredentials();
  var util_1 = require_util();
  var shared_cjs_1 = require_shared_2();
  var STS_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
  var STS_REQUEST_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";
  var DEFAULT_OAUTH_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
  var DEFAULT_TOKEN_LIFESPAN = 3600;
  cjsExports.EXPIRATION_TIME_OFFSET = 300000;
  cjsExports.EXTERNAL_ACCOUNT_TYPE = "external_account";
  cjsExports.CLOUD_RESOURCE_MANAGER = "https://cloudresourcemanager.googleapis.com/v1/projects/";
  var WORKFORCE_AUDIENCE_PATTERN =
    "//iam\\.googleapis\\.com/locations/[^/]+/workforcePools/[^/]+/providers/.+";
  var DEFAULT_TOKEN_URL = "https://sts.{universeDomain}/v1/token";
  class BaseExternalAccountClient extends authclient_1.AuthClient {
    scopes;
    projectNumber;
    audience;
    subjectTokenType;
    stsCredential;
    clientAuth;
    credentialSourceType;
    cachedAccessToken;
    serviceAccountImpersonationUrl;
    serviceAccountImpersonationLifetime;
    workforcePoolUserProject;
    configLifetimeRequested;
    tokenUrl;
    cloudResourceManagerURL;
    supplierContext;
    #e = null;
    constructor(options) {
      super(options);
      let opts = util_1.originalOrCamelOptions(options);
      let type = opts.get("type");
      if (type && type !== cjsExports.EXTERNAL_ACCOUNT_TYPE)
        throw Error(`Expected "${cjsExports.EXTERNAL_ACCOUNT_TYPE}" type but received "${options.type}"`);
      let clientId = opts.get("client_id");
      let clientSecret = opts.get("client_secret");
      this.tokenUrl =
        opts.get("token_url") ?? DEFAULT_TOKEN_URL.replace("{universeDomain}", this.universeDomain);
      let subjectTokenType = opts.get("subject_token_type");
      let workforcePoolUserProject = opts.get("workforce_pool_user_project");
      let serviceAccountImpersonationUrl = opts.get("service_account_impersonation_url");
      let serviceAccountImpersonation = opts.get("service_account_impersonation");
      let serviceAccountImpersonationLifetime = util_1
        .originalOrCamelOptions(serviceAccountImpersonation)
        .get("token_lifetime_seconds");
      this.cloudResourceManagerURL = new URL(
        opts.get("cloud_resource_manager_url") ||
          `https://cloudresourcemanager.${this.universeDomain}/v1/projects/`,
      );
      if (clientId)
        this.clientAuth = {
          confidentialClientType: "basic",
          clientId,
          clientSecret,
        };
      this.stsCredential = new sts.StsCredentials({
        tokenExchangeEndpoint: this.tokenUrl,
        clientAuthentication: this.clientAuth,
        transporter: new gaxios_1.Gaxios(this.transporter.defaults),
      });
      this.scopes = opts.get("scopes") || [DEFAULT_OAUTH_SCOPE];
      this.cachedAccessToken = null;
      this.audience = opts.get("audience");
      this.subjectTokenType = subjectTokenType;
      this.workforcePoolUserProject = workforcePoolUserProject;
      let workforceAudiencePattern = new RegExp(WORKFORCE_AUDIENCE_PATTERN);
      if (this.workforcePoolUserProject && !this.audience.match(workforceAudiencePattern))
        throw Error("workforcePoolUserProject should not be set for non-workforce pool credentials.");
      this.serviceAccountImpersonationUrl = serviceAccountImpersonationUrl;
      this.serviceAccountImpersonationLifetime = serviceAccountImpersonationLifetime;
      if (this.serviceAccountImpersonationLifetime) this.configLifetimeRequested = true;
      else {
        this.configLifetimeRequested = false;
        this.serviceAccountImpersonationLifetime = DEFAULT_TOKEN_LIFESPAN;
      }
      this.projectNumber = this.getProjectNumber(this.audience);
      this.supplierContext = {
        audience: this.audience,
        subjectTokenType: this.subjectTokenType,
        transporter: this.transporter,
      };
    }
    getServiceAccountEmail() {
      if (this.serviceAccountImpersonationUrl) {
        if (this.serviceAccountImpersonationUrl.length > 256)
          throw RangeError(`URL is too long: ${this.serviceAccountImpersonationUrl}`);
        return (
          /serviceAccounts\/(?<email>[^:]+):generateAccessToken$/.exec(this.serviceAccountImpersonationUrl)
            ?.groups?.email || null
        );
      }
      return null;
    }
    setCredentials(credentials) {
      super.setCredentials(credentials);
      this.cachedAccessToken = credentials;
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
    async getProjectId() {
      let projectNumber = this.projectNumber || this.workforcePoolUserProject;
      if (this.projectId) return this.projectId;
      else if (projectNumber) {
        let headers = await this.getRequestHeaders();
        let opts = {
          ...BaseExternalAccountClient.RETRY_CONFIG,
          headers,
          url: `${this.cloudResourceManagerURL.toString()}${projectNumber}`,
          responseType: "json",
        };
        authclient_1.AuthClient.setMethodName(opts, "getProjectId");
        let response = await this.transporter.request(opts);
        this.projectId = response.data.projectId;
        return this.projectId;
      }
      return null;
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
      this.#e = this.#e || this.#t();
      try {
        return await this.#e;
      } finally {
        this.#e = null;
      }
    }
    async #t() {
      let subjectToken = await this.retrieveSubjectToken();
      let stsCredentialsOptions = {
        grantType: STS_GRANT_TYPE,
        audience: this.audience,
        requestedTokenType: STS_REQUEST_TOKEN_TYPE,
        subjectToken,
        subjectTokenType: this.subjectTokenType,
        scope: this.serviceAccountImpersonationUrl ? [DEFAULT_OAUTH_SCOPE] : this.getScopesArray(),
      };
      let additionalOptions =
        !this.clientAuth && this.workforcePoolUserProject
          ? {
              userProject: this.workforcePoolUserProject,
            }
          : undefined;
      let additionalHeaders = new Headers({
        "x-goog-api-client": this.getMetricsHeaderValue(),
      });
      let stsResponse = await this.stsCredential.exchangeToken(
        stsCredentialsOptions,
        additionalHeaders,
        additionalOptions,
      );
      if (this.serviceAccountImpersonationUrl)
        this.cachedAccessToken = await this.getImpersonatedAccessToken(stsResponse.access_token);
      else if (stsResponse.expires_in)
        this.cachedAccessToken = {
          access_token: stsResponse.access_token,
          expiry_date: new Date().getTime() + stsResponse.expires_in * 1000,
          res: stsResponse.res,
        };
      else
        this.cachedAccessToken = {
          access_token: stsResponse.access_token,
          res: stsResponse.res,
        };
      this.credentials = {};
      Object.assign(this.credentials, this.cachedAccessToken);
      delete this.credentials.res;
      this.emit("tokens", {
        refresh_token: null,
        expiry_date: this.cachedAccessToken.expiry_date,
        access_token: this.cachedAccessToken.access_token,
        token_type: "Bearer",
        id_token: null,
      });
      return this.cachedAccessToken;
    }
    getProjectNumber(audience) {
      let match = audience.match(/\/projects\/([^/]+)/);
      if (!match) return null;
      return match[1];
    }
    async getImpersonatedAccessToken(token) {
      let opts = {
        ...BaseExternalAccountClient.RETRY_CONFIG,
        url: this.serviceAccountImpersonationUrl,
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        data: {
          scope: this.getScopesArray(),
          lifetime: this.serviceAccountImpersonationLifetime + "s",
        },
        responseType: "json",
      };
      authclient_1.AuthClient.setMethodName(opts, "getImpersonatedAccessToken");
      let response = await this.transporter.request(opts);
      let successResponse = response.data;
      return {
        access_token: successResponse.accessToken,
        expiry_date: new Date(successResponse.expireTime).getTime(),
        res: response,
      };
    }
    isExpired(accessToken) {
      let now = new Date().getTime();
      return accessToken.expiry_date
        ? now >= accessToken.expiry_date - this.eagerRefreshThresholdMillis
        : false;
    }
    getScopesArray() {
      if (typeof this.scopes === "string") return [this.scopes];
      return this.scopes || [DEFAULT_OAUTH_SCOPE];
    }
    getMetricsHeaderValue() {
      let nodeVersion = process.version.replace(/^v/, "");
      let saImpersonation = this.serviceAccountImpersonationUrl !== undefined;
      let credentialSourceType = this.credentialSourceType ? this.credentialSourceType : "unknown";
      return `gl-node/${nodeVersion} auth/${shared_cjs_1.pkg.version} google-byoid-sdk source/${credentialSourceType} sa-impersonation/${saImpersonation} config-lifetime/${this.configLifetimeRequested}`;
    }
    getTokenUrl() {
      return this.tokenUrl;
    }
  }
  cjsExports.BaseExternalAccountClient = BaseExternalAccountClient;
});
export { require_baseexternalclient };

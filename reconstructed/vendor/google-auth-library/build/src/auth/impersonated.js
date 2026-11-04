/**
 * google-auth-library/build/src/auth/impersonated.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_oauth2client } from "./oauth2client.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_util } from "../util.js";

//@ chunk-na3pph4p.js:100159-102715 cjs-fingerprint
var require_impersonated = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Impersonated = cjsExports.IMPERSONATED_ACCOUNT_TYPE = undefined;
  var oauth2client_1 = require_oauth2client();
  var gaxios_1 = require_gaxios_2();
  var util_1 = require_util();
  cjsExports.IMPERSONATED_ACCOUNT_TYPE = "impersonated_service_account";
  class Impersonated extends oauth2client_1.OAuth2Client {
    sourceClient;
    targetPrincipal;
    targetScopes;
    delegates;
    lifetime;
    endpoint;
    constructor(options = {}) {
      super(options);
      this.credentials = {
        expiry_date: 1,
        refresh_token: "impersonated-placeholder",
      };
      this.sourceClient = options.sourceClient ?? new oauth2client_1.OAuth2Client();
      this.targetPrincipal = options.targetPrincipal ?? "";
      this.delegates = options.delegates ?? [];
      this.targetScopes = options.targetScopes ?? [];
      this.lifetime = options.lifetime ?? 3600;
      if (!util_1.originalOrCamelOptions(options).get("universe_domain"))
        this.universeDomain = this.sourceClient.universeDomain;
      else if (this.sourceClient.universeDomain !== this.universeDomain)
        throw RangeError(
          `Universe domain ${this.sourceClient.universeDomain} in source credentials does not match ${this.universeDomain} universe domain set for impersonated credentials.`,
        );
      this.endpoint = options.endpoint ?? `https://iamcredentials.${this.universeDomain}`;
    }
    async sign(blobToSign) {
      await this.sourceClient.getAccessToken();
      let name = `projects/-/serviceAccounts/${this.targetPrincipal}`;
      let u = `${this.endpoint}/v1/${name}:signBlob`;
      let body = {
        delegates: this.delegates,
        payload: Buffer.from(blobToSign).toString("base64"),
      };
      return (
        await this.sourceClient.request({
          ...Impersonated.RETRY_CONFIG,
          url: u,
          data: body,
          method: "POST",
        })
      ).data;
    }
    getTargetPrincipal() {
      return this.targetPrincipal;
    }
    async refreshToken() {
      try {
        await this.sourceClient.getAccessToken();
        let name = "projects/-/serviceAccounts/" + this.targetPrincipal;
        let u = `${this.endpoint}/v1/${name}:generateAccessToken`;
        let body = {
          delegates: this.delegates,
          scope: this.targetScopes,
          lifetime: this.lifetime + "s",
        };
        let res = await this.sourceClient.request({
          ...Impersonated.RETRY_CONFIG,
          url: u,
          data: body,
          method: "POST",
        });
        let tokenResponse = res.data;
        this.credentials.access_token = tokenResponse.accessToken;
        this.credentials.expiry_date = Date.parse(tokenResponse.expireTime);
        return {
          tokens: this.credentials,
          res,
        };
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        let status = 0;
        let message = "";
        if (error instanceof gaxios_1.GaxiosError) {
          status = error?.response?.data?.error?.status;
          message = error?.response?.data?.error?.message;
        }
        if (status && message) {
          error.message = `${status}: unable to impersonate: ${message}`;
          throw error;
        } else {
          error.message = `unable to impersonate: ${error}`;
          throw error;
        }
      }
    }
    async fetchIdToken(targetAudience, options) {
      await this.sourceClient.getAccessToken();
      let name = `projects/-/serviceAccounts/${this.targetPrincipal}`;
      let u = `${this.endpoint}/v1/${name}:generateIdToken`;
      let body = {
        delegates: this.delegates,
        audience: targetAudience,
        includeEmail: options?.includeEmail ?? true,
        useEmailAzp: options?.includeEmail ?? true,
      };
      return (
        await this.sourceClient.request({
          ...Impersonated.RETRY_CONFIG,
          url: u,
          data: body,
          method: "POST",
        })
      ).data.token;
    }
  }
  cjsExports.Impersonated = Impersonated;
});
export { require_impersonated };

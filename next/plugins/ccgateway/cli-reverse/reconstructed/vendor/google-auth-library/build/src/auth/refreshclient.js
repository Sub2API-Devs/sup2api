/**
 * google-auth-library/build/src/auth/refreshclient.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_oauth2client } from "./oauth2client.js";
import { require_authclient } from "./authclient.js";

//@ chunk-e8d3a8an.js:98004-100159 cjs-fingerprint
var require_refreshclient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.UserRefreshClient = cjsExports.USER_REFRESH_ACCOUNT_TYPE = undefined;
  var oauth2client_1 = require_oauth2client();
  var authclient_1 = require_authclient();
  cjsExports.USER_REFRESH_ACCOUNT_TYPE = "authorized_user";
  class UserRefreshClient extends oauth2client_1.OAuth2Client {
    _refreshToken;
    constructor(
      optionsOrClientId,
      clientSecret,
      refreshToken,
      eagerRefreshThresholdMillis,
      forceRefreshOnFailure,
    ) {
      let opts =
        optionsOrClientId && typeof optionsOrClientId === "object"
          ? optionsOrClientId
          : {
              clientId: optionsOrClientId,
              clientSecret,
              refreshToken,
              eagerRefreshThresholdMillis,
              forceRefreshOnFailure,
            };
      super(opts);
      this._refreshToken = opts.refreshToken;
      this.credentials.refresh_token = opts.refreshToken;
    }
    async refreshTokenNoCache() {
      return super.refreshTokenNoCache(this._refreshToken);
    }
    async fetchIdToken(targetAudience) {
      let opts = {
        ...UserRefreshClient.RETRY_CONFIG,
        url: this.endpoints.oauth2TokenUrl,
        method: "POST",
        data: new URLSearchParams({
          client_id: this._clientId,
          client_secret: this._clientSecret,
          grant_type: "refresh_token",
          refresh_token: this._refreshToken,
          target_audience: targetAudience,
        }),
        responseType: "json",
      };
      authclient_1.AuthClient.setMethodName(opts, "fetchIdToken");
      return (await this.transporter.request(opts)).data.id_token;
    }
    fromJSON(json) {
      if (!json) throw Error("Must pass in a JSON object containing the user refresh token");
      if (json.type !== "authorized_user")
        throw Error('The incoming JSON object does not have the "authorized_user" type');
      if (!json.client_id) throw Error("The incoming JSON object does not contain a client_id field");
      if (!json.client_secret) throw Error("The incoming JSON object does not contain a client_secret field");
      if (!json.refresh_token) throw Error("The incoming JSON object does not contain a refresh_token field");
      this._clientId = json.client_id;
      this._clientSecret = json.client_secret;
      this._refreshToken = json.refresh_token;
      this.credentials.refresh_token = json.refresh_token;
      this.quotaProjectId = json.quota_project_id;
      this.universeDomain = json.universe_domain || this.universeDomain;
    }
    fromStream(inputStream, callback) {
      if (callback) this.fromStreamAsync(inputStream).then(() => callback(), callback);
      else return this.fromStreamAsync(inputStream);
    }
    async fromStreamAsync(inputStream) {
      return new Promise((resolve, reject) => {
        if (!inputStream) return reject(Error("Must pass in a stream containing the user refresh token."));
        let contents = "";
        inputStream
          .setEncoding("utf8")
          .on("error", reject)
          .on("data", (chunk) => (contents += chunk))
          .on("end", () => {
            try {
              let data = JSON.parse(contents);
              this.fromJSON(data);
              return resolve();
            } catch (err) {
              return reject(err);
            }
          });
      });
    }
    static fromJSON(json) {
      let client = new UserRefreshClient();
      client.fromJSON(json);
      return client;
    }
  }
  cjsExports.UserRefreshClient = UserRefreshClient;
});
export { require_refreshclient };

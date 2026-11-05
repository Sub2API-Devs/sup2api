/**
 * google-auth-library/build/src/gtoken/googleToken.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_tokenHandler } from "./tokenHandler.js";
import { require_revokeToken } from "./revokeToken.js";

//@ chunk-e8d3a8an.js:89921-91348 cjs-fingerprint
var require_googleToken = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.GoogleToken = undefined;
  var gaxios_1 = require_gaxios_2();
  var tokenHandler_1 = require_tokenHandler();
  var revokeToken_1 = require_revokeToken();
  class GoogleToken {
    tokenOptions;
    tokenHandler;
    constructor(options) {
      this.tokenOptions = options || {};
      this.tokenOptions.transporter = this.tokenOptions.transporter || {
        request: (opts) => gaxios_1.request(opts),
      };
      if (!this.tokenOptions.iss) this.tokenOptions.iss = this.tokenOptions.email;
      if (typeof this.tokenOptions.scope === "object")
        this.tokenOptions.scope = this.tokenOptions.scope.join(" ");
      this.tokenHandler = new tokenHandler_1.TokenHandler(this.tokenOptions);
    }
    get expiresAt() {
      return this.tokenHandler.tokenExpiresAt;
    }
    get accessToken() {
      return this.tokenHandler.token?.access_token;
    }
    get idToken() {
      return this.tokenHandler.token?.id_token;
    }
    get tokenType() {
      return this.tokenHandler.token?.token_type;
    }
    get refreshToken() {
      return this.tokenHandler.token?.refresh_token;
    }
    hasExpired() {
      return this.tokenHandler.hasExpired();
    }
    isTokenExpiring() {
      return this.tokenHandler.isTokenExpiring();
    }
    getToken(
      callbackOrOptions,
      opts = {
        forceRefresh: false,
      },
    ) {
      let callback;
      if (typeof callbackOrOptions === "function") callback = callbackOrOptions;
      else if (typeof callbackOrOptions === "object") opts = callbackOrOptions;
      let promise = this.tokenHandler.getToken(opts.forceRefresh ?? false);
      if (callback) promise.then((token) => callback(null, token), callback);
      return promise;
    }
    revokeToken(callback) {
      if (!this.accessToken) return Promise.reject(Error("No token to revoke."));
      let promise = revokeToken_1.revokeToken(this.accessToken, this.tokenOptions.transporter);
      if (callback) promise.then(() => callback(), callback);
      this.tokenHandler = new tokenHandler_1.TokenHandler(this.tokenOptions);
    }
    get googleTokenOptions() {
      return this.tokenOptions;
    }
  }
  cjsExports.GoogleToken = GoogleToken;
});
export { require_googleToken };

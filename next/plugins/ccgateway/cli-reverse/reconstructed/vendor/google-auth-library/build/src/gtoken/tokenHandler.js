/**
 * google-auth-library/build/src/gtoken/tokenHandler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_getToken } from "./getToken.js";
import { require_getCredentials } from "./getCredentials.js";

//@ chunk-e8d3a8an.js:88473-89694 cjs-fingerprint
var require_tokenHandler = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.TokenHandler = undefined;
  var getToken_1 = require_getToken();
  var getCredentials_1 = require_getCredentials();
  class TokenHandler {
    token;
    tokenExpiresAt;
    inFlightRequest;
    tokenOptions;
    constructor(tokenOptions) {
      this.tokenOptions = tokenOptions;
    }
    async processCredentials() {
      if (!this.tokenOptions.key && !this.tokenOptions.keyFile) throw Error("No key or keyFile set.");
      if (!this.tokenOptions.key && this.tokenOptions.keyFile) {
        let credentials = await getCredentials_1.getCredentials(this.tokenOptions.keyFile);
        this.tokenOptions.key = credentials.privateKey;
        this.tokenOptions.email = credentials.clientEmail;
      }
    }
    isTokenExpiring() {
      if (!this.token || !this.tokenExpiresAt) return true;
      let now = new Date().getTime();
      let eagerRefreshThresholdMillis = this.tokenOptions.eagerRefreshThresholdMillis ?? 0;
      return this.tokenExpiresAt <= now + eagerRefreshThresholdMillis;
    }
    hasExpired() {
      let now = new Date().getTime();
      if (this.token && this.tokenExpiresAt) return new Date().getTime() >= this.tokenExpiresAt;
      return true;
    }
    async getToken(forceRefresh) {
      await this.processCredentials();
      if (this.inFlightRequest && !forceRefresh) return this.inFlightRequest;
      if (this.token && !this.isTokenExpiring() && !forceRefresh) return this.token;
      try {
        this.inFlightRequest = getToken_1.getToken(this.tokenOptions);
        let token = await this.inFlightRequest;
        this.token = token;
        this.tokenExpiresAt = new Date().getTime() + (token.expires_in ?? 0) * 1000;
        return token;
      } finally {
        this.inFlightRequest = undefined;
      }
    }
  }
  cjsExports.TokenHandler = TokenHandler;
});
export { require_tokenHandler };

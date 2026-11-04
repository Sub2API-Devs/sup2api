/**
 * google-auth-library/build/src/auth/idtokenclient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_oauth2client } from "./oauth2client.js";

//@ chunk-na3pph4p.js:83863-84616 cjs-fingerprint
var require_idtokenclient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.IdTokenClient = undefined;
  var oauth2client_1 = require_oauth2client();
  class IdTokenClient extends oauth2client_1.OAuth2Client {
    targetAudience;
    idTokenProvider;
    constructor(options) {
      super(options);
      this.targetAudience = options.targetAudience;
      this.idTokenProvider = options.idTokenProvider;
    }
    async getRequestMetadataAsync() {
      if (!this.credentials.id_token || !this.credentials.expiry_date || this.isTokenExpiring()) {
        let idToken = await this.idTokenProvider.fetchIdToken(this.targetAudience);
        this.credentials = {
          id_token: idToken,
          expiry_date: this.getIdTokenExpiryDate(idToken),
        };
      }
      return {
        headers: new Headers({
          authorization: "Bearer " + this.credentials.id_token,
        }),
      };
    }
    getIdTokenExpiryDate(idToken) {
      let payloadB64 = idToken.split(".")[1];
      if (payloadB64) return JSON.parse(Buffer.from(payloadB64, "base64").toString("ascii")).exp * 1000;
    }
  }
  cjsExports.IdTokenClient = IdTokenClient;
});
export { require_idtokenclient };

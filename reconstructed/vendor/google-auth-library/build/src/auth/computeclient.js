/**
 * google-auth-library/build/src/auth/computeclient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_gcp_metadata } from "../../../../gcp-metadata/build/src/index.js";
import { require_oauth2client } from "./oauth2client.js";

//@ chunk-na3pph4p.js:82127-83863 cjs-fingerprint
var require_computeclient = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Compute = undefined;
  var gaxios_1 = require_gaxios_2();
  var gcpMetadata = require_gcp_metadata();
  var oauth2client_1 = require_oauth2client();
  class Compute extends oauth2client_1.OAuth2Client {
    serviceAccountEmail;
    scopes;
    constructor(options = {}) {
      super(options);
      this.credentials = {
        expiry_date: 1,
        refresh_token: "compute-placeholder",
      };
      this.serviceAccountEmail = options.serviceAccountEmail || "default";
      this.scopes = Array.isArray(options.scopes) ? options.scopes : options.scopes ? [options.scopes] : [];
    }
    async refreshTokenNoCache() {
      let tokenPath = `service-accounts/${this.serviceAccountEmail}/token`;
      let data;
      try {
        let instanceOptions = {
          property: tokenPath,
        };
        if (this.scopes.length > 0)
          instanceOptions.params = {
            scopes: this.scopes.join(","),
          };
        data = await gcpMetadata.instance(instanceOptions);
      } catch (e) {
        if (e instanceof gaxios_1.GaxiosError) {
          e.message = `Could not refresh access token: ${e.message}`;
          this.wrapError(e);
        }
        throw e;
      }
      let tokens = data;
      if (data && data.expires_in) {
        tokens.expiry_date = new Date().getTime() + data.expires_in * 1000;
        delete tokens.expires_in;
      }
      this.emit("tokens", tokens);
      return {
        tokens,
        res: null,
      };
    }
    async fetchIdToken(targetAudience) {
      let property = `service-accounts/${this.serviceAccountEmail}/identity?format=full&audience=${targetAudience}`;
      let idToken;
      try {
        idToken = await gcpMetadata.instance({
          property,
        });
      } catch (e) {
        if (e instanceof Error) e.message = `Could not fetch ID token: ${e.message}`;
        throw e;
      }
      return idToken;
    }
    wrapError(error) {
      let res = error.response;
      if (res && res.status) {
        error.status = res.status;
        if (res.status === 403)
          error.message =
            "A Forbidden error was returned while attempting to retrieve an access token for the Compute Engine built-in service account. This may be because the Compute Engine instance does not have the correct permission scopes specified: " +
            error.message;
        else if (res.status === 404)
          error.message =
            "A Not Found error was returned while attempting to retrieve an accesstoken for the Compute Engine built-in service account. This may be because the Compute Engine instance does not have any permission scopes specified: " +
            error.message;
      }
    }
  }
  cjsExports.Compute = Compute;
});
export { require_computeclient };

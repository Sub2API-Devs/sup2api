/**
 * google-auth-library/build/src/auth/passthrough.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_authclient } from "./authclient.js";

//@ chunk-e8d3a8an.js:155231-155530 cjs-fingerprint
var require_passthrough = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.PassThroughClient = undefined;
  var authclient_1 = require_authclient();
  class PassThroughClient extends authclient_1.AuthClient {
    async request(opts) {
      return this.transporter.request(opts);
    }
    async getAccessToken() {
      return {};
    }
    async getRequestHeaders() {
      return new Headers();
    }
  }
  cjsExports.PassThroughClient = PassThroughClient;
});
export { require_passthrough };

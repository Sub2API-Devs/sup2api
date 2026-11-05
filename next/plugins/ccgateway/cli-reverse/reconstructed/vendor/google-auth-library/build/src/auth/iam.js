/**
 * google-auth-library/build/src/auth/iam.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:151258-151582 cjs-fingerprint
var require_iam = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.IAMAuth = undefined;
  class IAMAuth {
    selector;
    token;
    constructor(selector, token) {
      this.selector = selector;
      this.token = token;
      this.selector = selector;
      this.token = token;
    }
    getRequestHeaders() {
      return {
        "x-goog-iam-authority-selector": this.selector,
        "x-goog-iam-authorization-token": this.token,
      };
    }
  }
  cjsExports.IAMAuth = IAMAuth;
});
export { require_iam };

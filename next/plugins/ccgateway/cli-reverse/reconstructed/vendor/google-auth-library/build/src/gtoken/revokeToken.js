/**
 * google-auth-library/build/src/gtoken/revokeToken.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:89694-89921 cjs-fingerprint
var require_revokeToken = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.revokeToken = revokeToken;
  var GOOGLE_REVOKE_TOKEN_URL = "https://oauth2.googleapis.com/revoke?token=";
  var DEFAULT_RETRY_VALUE = true;
  async function revokeToken(accessToken, transporter) {
    let url = GOOGLE_REVOKE_TOKEN_URL + accessToken;
    return await transporter.request({
      url,
      retry: DEFAULT_RETRY_VALUE,
    });
  }
});
export { require_revokeToken };

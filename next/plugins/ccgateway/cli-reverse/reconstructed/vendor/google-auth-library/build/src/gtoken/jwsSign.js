/**
 * google-auth-library/build/src/gtoken/jwsSign.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_jws } from "../../../../jws/index.js";

//@ chunk-e8d3a8an.js:85733-86150 cjs-fingerprint
var require_jwsSign = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.buildPayloadForJwsSign = buildPayloadForJwsSign;
  cjsExports.getJwsSign = getJwsSign;
  var jws_1 = require_jws();
  var ALG_RS256 = "RS256";
  var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
  function buildPayloadForJwsSign(tokenOptions) {
    let iat = Math.floor(new Date().getTime() / 1000);
    return {
      iss: tokenOptions.iss,
      scope: tokenOptions.scope,
      aud: GOOGLE_TOKEN_URL,
      exp: iat + 3600,
      iat,
      sub: tokenOptions.sub,
      ...tokenOptions.additionalClaims,
    };
  }
  function getJwsSign(tokenOptions) {
    let payload = buildPayloadForJwsSign(tokenOptions);
    return jws_1.sign({
      header: {
        alg: ALG_RS256,
      },
      payload,
      secret: tokenOptions.key,
    });
  }
});
export { require_jwsSign };

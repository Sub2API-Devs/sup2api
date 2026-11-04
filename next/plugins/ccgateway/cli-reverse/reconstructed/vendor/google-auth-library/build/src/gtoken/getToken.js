/**
 * google-auth-library/build/src/gtoken/getToken.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_jwsSign } from "./jwsSign.js";

//@ chunk-na3pph4p.js:86150-86744 cjs-fingerprint
var require_getToken = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getToken = getToken;
  var jwsSign_1 = require_jwsSign();
  var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
  var GOOGLE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";
  var generateRequestOptions = (tokenOptions) => ({
    method: "POST",
    url: GOOGLE_TOKEN_URL,
    data: new URLSearchParams({
      grant_type: GOOGLE_GRANT_TYPE,
      assertion: jwsSign_1.getJwsSign(tokenOptions),
    }),
    responseType: "json",
    retryConfig: {
      httpMethodsToRetry: ["POST"],
    },
  });
  async function getToken(tokenOptions) {
    if (!tokenOptions.transporter) throw Error("No transporter set.");
    try {
      let requestOptions = generateRequestOptions(tokenOptions);
      return (await tokenOptions.transporter.request(requestOptions)).data;
    } catch (e) {
      let err = e;
      let errorData = err.response?.data;
      if (errorData?.error) err.message = `${errorData.error}: ${errorData.error_description}`;
      throw err;
    }
  }
});
export { require_getToken };

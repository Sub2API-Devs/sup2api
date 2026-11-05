/**
 * jsonwebtoken/lib/validateAsymmetricKey.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_asymmetricKeyDetailsSupported } from "./asymmetricKeyDetailsSupported.js";
import { require_rsaPssKeyDetailsSupported } from "./rsaPssKeyDetailsSupported.js";

//@ chunk-b5df2wx1.js:4951-5992 cjs-fingerprint
var require_validateAsymmetricKey = __commonJS(function (cjsExports, cjsModule) {
  var ASYMMETRIC_KEY_DETAILS_SUPPORTED = require_asymmetricKeyDetailsSupported();
  var RSA_PSS_KEY_DETAILS_SUPPORTED = require_rsaPssKeyDetailsSupported();
  var allowedAlgorithmsForKeys = {
    ec: ["ES256", "ES384", "ES512"],
    rsa: ["RS256", "PS256", "RS384", "PS384", "RS512", "PS512"],
    "rsa-pss": ["PS256", "PS384", "PS512"],
  };
  var allowedCurves = {
    ES256: "prime256v1",
    ES384: "secp384r1",
    ES512: "secp521r1",
  };
  cjsModule.exports = function (algorithm, key) {
    if (!algorithm || !key) return;
    let keyType = key.asymmetricKeyType;
    if (!keyType) return;
    let allowedAlgorithms = allowedAlgorithmsForKeys[keyType];
    if (!allowedAlgorithms) throw Error(`Unknown key type "${keyType}".`);
    if (!allowedAlgorithms.includes(algorithm))
      throw Error(
        `"alg" parameter for "${keyType}" key type must be one of: ${allowedAlgorithms.join(", ")}.`,
      );
    if (ASYMMETRIC_KEY_DETAILS_SUPPORTED)
      switch (keyType) {
        case "ec":
          let keyCurve = key.asymmetricKeyDetails.namedCurve;
          let allowedCurve = allowedCurves[algorithm];
          if (keyCurve !== allowedCurve)
            throw Error(`"alg" parameter "${algorithm}" requires curve "${allowedCurve}".`);
          break;
        case "rsa-pss":
          if (RSA_PSS_KEY_DETAILS_SUPPORTED) {
            let length = parseInt(algorithm.slice(-3), 10);
            let { hashAlgorithm, mgf1HashAlgorithm, saltLength } = key.asymmetricKeyDetails;
            if (hashAlgorithm !== `sha${length}` || mgf1HashAlgorithm !== hashAlgorithm)
              throw Error(
                `Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${algorithm}.`,
              );
            if (saltLength !== undefined && saltLength > length >> 3)
              throw Error(
                `Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${algorithm}.`,
              );
          }
          break;
      }
  };
});
export { require_validateAsymmetricKey };

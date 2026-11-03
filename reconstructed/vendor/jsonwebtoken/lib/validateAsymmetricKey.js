/**
 * jsonwebtoken/lib/validateAsymmetricKey.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Gh } from "./asymmetricKeyDetailsSupported.js";
import { Vh } from "./rsaPssKeyDetailsSupported.js";

//@ chunk-mrx6y2r5.js:4951-5992 cjs-fingerprint
var lc = x(function (iL, jh) {
  var py = Gh(),
    gy = Vh(),
    yy = {
      ec: ["ES256", "ES384", "ES512"],
      rsa: ["RS256", "PS256", "RS384", "PS384", "RS512", "PS512"],
      "rsa-pss": ["PS256", "PS384", "PS512"],
    },
    Ty = { ES256: "prime256v1", ES384: "secp384r1", ES512: "secp521r1" };
  jh.exports = function (e, t) {
    if (!e || !t) return;
    let asymmetricKeyType = t.asymmetricKeyType;
    if (!asymmetricKeyType) return;
    let n = yy[asymmetricKeyType];
    if (!n) throw Error(`Unknown key type "${asymmetricKeyType}".`);
    if (!n.includes(e))
      throw Error(`"alg" parameter for "${asymmetricKeyType}" key type must be one of: ${n.join(", ")}.`);
    if (py)
      switch (asymmetricKeyType) {
        case "ec":
          let namedCurve = t.asymmetricKeyDetails.namedCurve,
            i = Ty[e];
          if (namedCurve !== i) throw Error(`"alg" parameter "${e}" requires curve "${i}".`);
          break;
        case "rsa-pss":
          if (gy) {
            let s = parseInt(e.slice(-3), 10),
              {
                hashAlgorithm: hashAlgorithm,
                mgf1HashAlgorithm: mgf1HashAlgorithm,
                saltLength: saltLength,
              } = t.asymmetricKeyDetails;
            if (hashAlgorithm !== `sha${s}` || mgf1HashAlgorithm !== hashAlgorithm)
              throw Error(
                `Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${e}.`,
              );
            if (saltLength !== void 0 && saltLength > s >> 3)
              throw Error(
                `Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${e}.`,
              );
          }
          break;
      }
  };
});

export { lc };

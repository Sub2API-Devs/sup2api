/**
 * jsonwebtoken/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { cc } from "./lib/timespan.js";
import { dc } from "./lib/psSupported.js";
import { lc } from "./lib/validateAsymmetricKey.js";
import { H6t } from "../jws/index.js";
import { of } from "../lodash.includes/index.js";
import { af } from "../lodash.isboolean/index.js";
import { hf } from "../lodash.isinteger/index.js";
import { mf } from "../lodash.isnumber/index.js";
import { Tf } from "../lodash.isplainobject/index.js";
import { Cf } from "../lodash.isstring/index.js";
import { Rf } from "../lodash.once/index.js";

//@ chunk-mrx6y2r5.js:17076-22157 cjs-fingerprint
var Mf = x(function (pL, xf) {
  var wf = cc(),
    EE = dc(),
    CE = lc(),
    ms = H6t(),
    bf = of(),
    fs = af(),
    vf = hf(),
    yc = mf(),
    Pf = Tf(),
    Qt = Cf(),
    AE = Rf(),
    {
      KeyObject: KeyObject,
      createSecretKey: createSecretKey,
      createPrivateKey: createPrivateKey,
    } = importMetaRequire("crypto"),
    Of = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "HS256", "HS384", "HS512", "none"];
  if (EE) Of.splice(3, 0, "PS256", "PS384", "PS512");
  var RE = {
      expiresIn: {
        isValid: function (e) {
          return vf(e) || (Qt(e) && e);
        },
        message: '"expiresIn" should be a number of seconds or string representing a timespan',
      },
      notBefore: {
        isValid: function (e) {
          return vf(e) || (Qt(e) && e);
        },
        message: '"notBefore" should be a number of seconds or string representing a timespan',
      },
      audience: {
        isValid: function (e) {
          return Qt(e) || Array.isArray(e);
        },
        message: '"audience" must be a string or array',
      },
      algorithm: { isValid: bf.bind(null, Of), message: '"algorithm" must be a valid string enum value' },
      header: { isValid: Pf, message: '"header" must be an object' },
      encoding: { isValid: Qt, message: '"encoding" must be a string' },
      issuer: { isValid: Qt, message: '"issuer" must be a string' },
      subject: { isValid: Qt, message: '"subject" must be a string' },
      jwtid: { isValid: Qt, message: '"jwtid" must be a string' },
      noTimestamp: { isValid: fs, message: '"noTimestamp" must be a boolean' },
      keyid: { isValid: Qt, message: '"keyid" must be a string' },
      mutatePayload: { isValid: fs, message: '"mutatePayload" must be a boolean' },
      allowInsecureKeySizes: { isValid: fs, message: '"allowInsecureKeySizes" must be a boolean' },
      allowInvalidAsymmetricKeyTypes: {
        isValid: fs,
        message: '"allowInvalidAsymmetricKeyTypes" must be a boolean',
      },
    },
    wE = {
      iat: { isValid: yc, message: '"iat" should be a number of seconds' },
      exp: { isValid: yc, message: '"exp" should be a number of seconds' },
      nbf: { isValid: yc, message: '"nbf" should be a number of seconds' },
    };
  function Nf(e, t, r, n) {
    if (!Pf(r)) throw Error('Expected "' + n + '" to be a plain object.');
    Object.keys(r).forEach(function (o) {
      let i = e[o];
      if (!i) {
        if (!t) throw Error('"' + o + '" is not allowed in "' + n + '"');
        return;
      }
      if (!i.isValid(r[o])) throw Error(i.message);
    });
  }
  function vE(e) {
    return Nf(RE, !1, e, "options");
  }
  function kE(e) {
    return Nf(wE, !0, e, "payload");
  }
  var kf = { audience: "aud", issuer: "iss", subject: "sub", jwtid: "jti" },
    bE = ["expiresIn", "notBefore", "noTimestamp", "audience", "issuer", "subject", "jwtid"];
  xf.exports = function (e, t, r, n) {
    if (typeof r === "function") ((n = r), (r = {}));
    else r = r || {};
    let o = typeof e === "object" && !Buffer.isBuffer(e),
      merged = Object.assign(
        { alg: r.algorithm || "HS256", typ: o ? "JWT" : void 0, kid: r.keyid },
        r.header,
      );
    function s(l) {
      if (n) return n(l);
      throw l;
    }
    if (!t && r.algorithm !== "none") return s(Error("secretOrPrivateKey must have a value"));
    if (t != null && !(t instanceof KeyObject))
      try {
        t = createPrivateKey(t);
      } catch (error) {
        try {
          t = createSecretKey(typeof t === "string" ? Buffer.from(t) : t);
        } catch (error) {
          return s(Error("secretOrPrivateKey is not valid key material"));
        }
      }
    if (merged.alg.startsWith("HS") && t.type !== "secret")
      return s(Error(`secretOrPrivateKey must be a symmetric key when using ${merged.alg}`));
    else if (/^(?:RS|PS|ES)/.test(merged.alg)) {
      if (t.type !== "private")
        return s(Error(`secretOrPrivateKey must be an asymmetric key when using ${merged.alg}`));
      if (
        !r.allowInsecureKeySizes &&
        !merged.alg.startsWith("ES") &&
        t.asymmetricKeyDetails !== void 0 &&
        t.asymmetricKeyDetails.modulusLength < 2048
      )
        return s(Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${merged.alg}`));
    }
    if (typeof e > "u") return s(Error("payload is required"));
    else if (o) {
      try {
        kE(e);
      } catch (error) {
        return s(error);
      }
      if (!r.mutatePayload) e = Object.assign({}, e);
    } else {
      let filtered = bE.filter(function (d) {
        return typeof r[d] < "u";
      });
      if (filtered.length > 0)
        return s(Error("invalid " + filtered.join(",") + " option for " + typeof e + " payload"));
    }
    if (typeof e.exp < "u" && typeof r.expiresIn < "u")
      return s(Error('Bad "options.expiresIn" option the payload already has an "exp" property.'));
    if (typeof e.nbf < "u" && typeof r.notBefore < "u")
      return s(Error('Bad "options.notBefore" option the payload already has an "nbf" property.'));
    try {
      vE(r);
    } catch (error) {
      return s(error);
    }
    if (!r.allowInvalidAsymmetricKeyTypes)
      try {
        CE(merged.alg, t);
      } catch (error) {
        return s(error);
      }
    let a = e.iat || Math.floor(Date.now() / 1000);
    if (r.noTimestamp) delete e.iat;
    else if (o) e.iat = a;
    if (typeof r.notBefore < "u") {
      try {
        e.nbf = wf(r.notBefore, a);
      } catch (error) {
        return s(error);
      }
      if (typeof e.nbf > "u")
        return s(
          Error(
            '"notBefore" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60',
          ),
        );
    }
    if (typeof r.expiresIn < "u" && typeof e === "object") {
      try {
        e.exp = wf(r.expiresIn, a);
      } catch (error) {
        return s(error);
      }
      if (typeof e.exp > "u")
        return s(
          Error(
            '"expiresIn" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60',
          ),
        );
    }
    Object.keys(kf).forEach(function (l) {
      let d = kf[l];
      if (typeof r[l] < "u") {
        if (typeof e[d] < "u")
          return s(Error('Bad "options.' + l + '" option. The payload already has an "' + d + '" property.'));
        e[d] = r[l];
      }
    });
    let c = r.encoding || "utf8";
    if (typeof n === "function")
      ((n = n && AE(n)),
        ms
          .createSign({ header: merged, privateKey: t, payload: e, encoding: c })
          .once("error", n)
          .once("done", function (l) {
            if (!r.allowInsecureKeySizes && /^(?:RS|PS)/.test(merged.alg) && l.length < 256)
              return n(Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${merged.alg}`));
            n(null, l);
          }));
    else {
      let sign = ms.sign({ header: merged, payload: e, secret: t, encoding: c });
      if (!r.allowInsecureKeySizes && /^(?:RS|PS)/.test(merged.alg) && sign.length < 256)
        throw Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${merged.alg}`);
      return sign;
    }
  };
});

export { Mf };

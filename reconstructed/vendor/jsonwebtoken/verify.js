/**
 * jsonwebtoken/verify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { vo } from "./lib/JsonWebTokenError.js";
import { sc } from "./lib/NotBeforeError.js";
import { ac } from "./lib/TokenExpiredError.js";
import { ic } from "./decode.js";
import { cc } from "./lib/timespan.js";
import { lc } from "./lib/validateAsymmetricKey.js";
import { dc } from "./lib/psSupported.js";
import { H6t } from "../jws/index.js";

//@ chunk-mrx6y2r5.js:6093-10340 cjs-fingerprint
var Xh = x(function (aL, Jh) {
  var W = vo(),
    Cy = sc(),
    Wh = ac(),
    Ay = ic(),
    Iy = cc(),
    _y = lc(),
    Sy = dc(),
    Qh = H6t(),
    {
      KeyObject: KeyObject,
      createSecretKey: createSecretKey,
      createPublicKey: createPublicKey,
    } = importMetaRequire("crypto"),
    uc = ["RS256", "RS384", "RS512"],
    ky = ["ES256", "ES384", "ES512"],
    hc = ["RS256", "RS384", "RS512"],
    by = ["HS256", "HS384", "HS512"];
  if (Sy)
    (uc.splice(uc.length, 0, "PS256", "PS384", "PS512"), hc.splice(hc.length, 0, "PS256", "PS384", "PS512"));
  Jh.exports = function (e, t, r, n) {
    if (typeof r === "function" && !n) ((n = r), (r = {}));
    if (!r) r = {};
    r = Object.assign({}, r);
    let o;
    if (n) o = n;
    else
      o = function (d, u) {
        if (d) throw d;
        return u;
      };
    if (r.clockTimestamp && typeof r.clockTimestamp !== "number")
      return o(new W("clockTimestamp must be a number"));
    if (r.nonce !== void 0 && (typeof r.nonce !== "string" || r.nonce.trim() === ""))
      return o(new W("nonce must be a non-empty string"));
    if (r.allowInvalidAsymmetricKeyTypes !== void 0 && typeof r.allowInvalidAsymmetricKeyTypes !== "boolean")
      return o(new W("allowInvalidAsymmetricKeyTypes must be a boolean"));
    let i = r.clockTimestamp || Math.floor(Date.now() / 1000);
    if (!e) return o(new W("jwt must be provided"));
    if (typeof e !== "string") return o(new W("jwt must be a string"));
    let parts = e.split(".");
    if (parts.length !== 3) return o(new W("jwt malformed"));
    let a;
    try {
      a = Ay(e, { complete: !0 });
    } catch (error) {
      return o(error);
    }
    if (!a) return o(new W("invalid token"));
    let header = a.header,
      l;
    if (typeof t === "function") {
      if (!n)
        return o(
          new W("verify must be called asynchronous if secret or public key is provided as a callback"),
        );
      l = t;
    } else
      l = function (d, u) {
        return u(null, t);
      };
    return l(header, function (d, u) {
      if (d) return o(new W("error in secret or public key callback: " + d.message));
      let m = parts[2].trim() !== "";
      if (!m && u) return o(new W("jwt signature is required"));
      if (m && !u) return o(new W("secret or public key must be provided"));
      if (!m && !r.algorithms)
        return o(new W('please specify "none" in "algorithms" to verify unsigned tokens'));
      if (u != null && !(u instanceof KeyObject))
        try {
          u = createPublicKey(u);
        } catch (error) {
          try {
            u = createSecretKey(typeof u === "string" ? Buffer.from(u) : u);
          } catch (error) {
            return o(new W("secretOrPublicKey is not valid key material"));
          }
        }
      if (!r.algorithms)
        if (u.type === "secret") r.algorithms = by;
        else if (["rsa", "rsa-pss"].includes(u.asymmetricKeyType)) r.algorithms = hc;
        else if (u.asymmetricKeyType === "ec") r.algorithms = ky;
        else r.algorithms = uc;
      if (r.algorithms.indexOf(a.header.alg) === -1) return o(new W("invalid algorithm"));
      if (header.alg.startsWith("HS") && u.type !== "secret")
        return o(new W(`secretOrPublicKey must be a symmetric key when using ${header.alg}`));
      else if (/^(?:RS|PS|ES)/.test(header.alg) && u.type !== "public")
        return o(new W(`secretOrPublicKey must be an asymmetric key when using ${header.alg}`));
      if (!r.allowInvalidAsymmetricKeyTypes)
        try {
          _y(header.alg, u);
        } catch (error) {
          return o(error);
        }
      let p;
      try {
        p = Qh.verify(e, a.header.alg, u);
      } catch (error) {
        return o(error);
      }
      if (!p) return o(new W("invalid signature"));
      let payload = a.payload;
      if (typeof payload.nbf < "u" && !r.ignoreNotBefore) {
        if (typeof payload.nbf !== "number") return o(new W("invalid nbf value"));
        if (payload.nbf > i + (r.clockTolerance || 0))
          return o(new Cy("jwt not active", new Date(payload.nbf * 1000)));
      }
      if (typeof payload.exp < "u" && !r.ignoreExpiration) {
        if (typeof payload.exp !== "number") return o(new W("invalid exp value"));
        if (i >= payload.exp + (r.clockTolerance || 0))
          return o(new Wh("jwt expired", new Date(payload.exp * 1000)));
      }
      if (r.audience) {
        let T = Array.isArray(r.audience) ? r.audience : [r.audience];
        if (
          !(Array.isArray(payload.aud) ? payload.aud : [payload.aud]).some(function (U) {
            return T.some(function (B) {
              return B instanceof RegExp ? B.test(U) : B === U;
            });
          })
        )
          return o(new W("jwt audience invalid. expected: " + T.join(" or ")));
      }
      if (r.issuer) {
        if (
          (typeof r.issuer === "string" && payload.iss !== r.issuer) ||
          (Array.isArray(r.issuer) && r.issuer.indexOf(payload.iss) === -1)
        )
          return o(new W("jwt issuer invalid. expected: " + r.issuer));
      }
      if (r.subject) {
        if (payload.sub !== r.subject) return o(new W("jwt subject invalid. expected: " + r.subject));
      }
      if (r.jwtid) {
        if (payload.jti !== r.jwtid) return o(new W("jwt jwtid invalid. expected: " + r.jwtid));
      }
      if (r.nonce) {
        if (payload.nonce !== r.nonce) return o(new W("jwt nonce invalid. expected: " + r.nonce));
      }
      if (r.maxAge) {
        if (typeof payload.iat !== "number") return o(new W("iat required when maxAge is specified"));
        let T = Iy(r.maxAge, payload.iat);
        if (typeof T > "u")
          return o(
            new W(
              '"maxAge" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60',
            ),
          );
        if (i >= T + (r.clockTolerance || 0)) return o(new Wh("maxAge exceeded", new Date(T * 1000)));
      }
      if (r.complete === !0) {
        let signature = a.signature;
        return o(null, { header: header, payload: payload, signature: signature });
      }
      return o(null, payload);
    });
  };
});

export { Xh };

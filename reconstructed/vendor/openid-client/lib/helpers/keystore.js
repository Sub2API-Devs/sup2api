/**
 * openid-client/lib/helpers/keystore.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Pu } from "./deep_clone.js";
import { wu } from "./is_plain_object.js";

//@ chunk-1ny7cxrt.js:23839-27191 cjs-fingerprint
var gy = x(function (qve, fS) {
  var Sl = require("./chunk-2tyrgda4.js"),
    DF = Pu(),
    cS = wu(),
    uS = Symbol(),
    dS = (e, { alg: alg, use: use }) => {
      let o = 0;
      if (alg && e.alg) o++;
      if (use && e.use) o++;
      return o;
    };
  function MF(e) {
    switch (typeof e === "string" && e.slice(0, 2)) {
      case "RS":
      case "PS":
        return "RSA";
      case "ES":
        return "EC";
      case "Ed":
        return "OKP";
      default:
        return;
    }
  }
  function jF(e, t, n, o) {
    if (t) return new Set([t]);
    switch (n) {
      case "EC": {
        let r = [];
        if (e === "enc" || e === void 0)
          r = r.concat(["ECDH-ES", "ECDH-ES+A128KW", "ECDH-ES+A192KW", "ECDH-ES+A256KW"]);
        if (e === "sig" || e === void 0)
          switch (o) {
            case "P-256":
            case "P-384":
              r = r.concat([`ES${o.slice(-3)}`]);
              break;
            case "P-521":
              r = r.concat(["ES512"]);
              break;
            case "secp256k1":
              if (Sl.cryptoRuntime === "node:crypto") r = r.concat(["ES256K"]);
              break;
          }
        return new Set(r);
      }
      case "OKP":
        return new Set(["ECDH-ES", "ECDH-ES+A128KW", "ECDH-ES+A192KW", "ECDH-ES+A256KW"]);
      case "RSA": {
        let r = [];
        if (e === "enc" || e === void 0) {
          if (
            ((r = r.concat(["RSA-OAEP", "RSA-OAEP-256", "RSA-OAEP-384", "RSA-OAEP-512"])),
            Sl.cryptoRuntime === "node:crypto")
          )
            r = r.concat(["RSA1_5"]);
        }
        if (e === "sig" || e === void 0) r = r.concat(["PS256", "PS384", "PS512", "RS256", "RS384", "RS512"]);
        return new Set(r);
      }
      default:
        throw Error("unreachable");
    }
  }
  fS.exports = class {
    #e;
    constructor(t, n) {
      if (t !== uS) throw Error("invalid constructor call");
      this.#e = n;
    }
    toJWKS() {
      return { keys: this.map(({ jwk: { d: t, p: n, q: o, dp: r, dq: s, qi: a, ...l } }) => l) };
    }
    all({ alg: t, kid: n, use: o } = {}) {
      if (!o || !t) throw Error();
      let r = MF(t),
        s = { alg: t, use: o };
      return this.filter((a) => {
        let l = !0;
        if (l && r !== void 0 && a.jwk.kty !== r) l = !1;
        if (l && n !== void 0 && a.jwk.kid !== n) l = !1;
        if (l && o !== void 0 && a.jwk.use !== void 0 && a.jwk.use !== o) l = !1;
        if (l && a.jwk.alg && a.jwk.alg !== t) l = !1;
        else if (!a.algorithms.has(t)) l = !1;
        return l;
      }).sort((a, l) => dS(l, s) - dS(a, s));
    }
    get(...t) {
      return this.all(...t)[0];
    }
    static async fromJWKS(t, { onlyPublic: n = !1, onlyPrivate: o = !1 } = {}) {
      if (!cS(t) || !Array.isArray(t.keys) || t.keys.some((key) => !cS(key) || !("kty" in key)))
        throw TypeError("jwks must be a JSON Web Key Set formatted object");
      let r = [];
      for (let key of t.keys) {
        key = DF(key);
        let { kty: kty, kid: kid, crv: crv } = key,
          { alg: alg, use: use } = key;
        if (typeof kty !== "string" || !kty) continue;
        if (use !== void 0 && use !== "sig" && use !== "enc") continue;
        if (typeof alg !== "string" && alg !== void 0) continue;
        if (typeof kid !== "string" && kid !== void 0) continue;
        if (kty === "EC" && use === "sig")
          switch (crv) {
            case "P-256":
              alg = "ES256";
              break;
            case "P-384":
              alg = "ES384";
              break;
            case "P-521":
              alg = "ES512";
              break;
            default:
              break;
          }
        if (crv === "secp256k1") ((use = "sig"), (alg = "ES256K"));
        if (kty === "OKP")
          switch (crv) {
            case "Ed25519":
            case "Ed448":
              ((use = "sig"), (alg = "EdDSA"));
              break;
            case "X25519":
            case "X448":
              use = "enc";
              break;
            default:
              break;
          }
        if (alg && !use)
          switch (!0) {
            case alg.startsWith("ECDH"):
              use = "enc";
              break;
            case alg.startsWith("RSA"):
              use = "enc";
              break;
            default:
              break;
          }
        if (o && (key.kty === "oct" || !key.d)) throw Error("jwks must only contain private keys");
        if (n && (key.d || key.k)) continue;
        r.push({
          jwk: { ...key, alg: alg, use: use },
          async keyObject(h) {
            if (this[h]) return this[h];
            let importJWK = await Sl.importJWK(this.jwk, h);
            return ((this[h] = importJWK), importJWK);
          },
          get algorithms() {
            return (
              Object.defineProperty(this, "algorithms", {
                value: jF(this.jwk.use, this.jwk.alg, this.jwk.kty, this.jwk.crv),
                enumerable: !0,
                configurable: !1,
              }),
              this.algorithms
            );
          },
        });
      }
      return new this(uS, r);
    }
    filter(...t) {
      return this.#e.filter(...t);
    }
    find(...t) {
      return this.#e.find(...t);
    }
    every(...t) {
      return this.#e.every(...t);
    }
    some(...t) {
      return this.#e.some(...t);
    }
    map(...t) {
      return this.#e.map(...t);
    }
    forEach(...t) {
      return this.#e.forEach(...t);
    }
    reduce(...t) {
      return this.#e.reduce(...t);
    }
    sort(...t) {
      return this.#e.sort(...t);
    }
    *[Symbol.iterator]() {
      for (let t of this.#e) yield t;
    }
  };
});

export { gy };

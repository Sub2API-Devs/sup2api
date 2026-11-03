/**
 * openid-client/lib/helpers/keystore.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_deep_clone } from "./deep_clone.js";
import { require_is_plain_object } from "./is_plain_object.js";

//@ chunk-1ny7cxrt.js:23839-27191 cjs-fingerprint
var require_keystore = x(function (cjsExports, cjsModule) {
  var jose = require("./chunk-2tyrgda4.js");
  var clone = require_deep_clone();
  var isPlainObject = require_is_plain_object();
  var internal = Symbol();
  var keyscore = (key, { alg, use }) => {
    let score = 0;
    if (alg && key.alg) score++;
    if (use && key.use) score++;
    return score;
  };
  function getKtyFromAlg(alg) {
    switch (typeof alg === "string" && alg.slice(0, 2)) {
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
  function getAlgorithms(use, alg, kty, crv) {
    if (alg) return new Set([alg]);
    switch (kty) {
      case "EC": {
        let algs = [];
        if (use === "enc" || use === undefined)
          algs = algs.concat(["ECDH-ES", "ECDH-ES+A128KW", "ECDH-ES+A192KW", "ECDH-ES+A256KW"]);
        if (use === "sig" || use === undefined)
          switch (crv) {
            case "P-256":
            case "P-384":
              algs = algs.concat([`ES${crv.slice(-3)}`]);
              break;
            case "P-521":
              algs = algs.concat(["ES512"]);
              break;
            case "secp256k1":
              if (jose.cryptoRuntime === "node:crypto") algs = algs.concat(["ES256K"]);
              break;
          }
        return new Set(algs);
      }
      case "OKP":
        return new Set(["ECDH-ES", "ECDH-ES+A128KW", "ECDH-ES+A192KW", "ECDH-ES+A256KW"]);
      case "RSA": {
        let algs = [];
        if (use === "enc" || use === undefined) {
          algs = algs.concat(["RSA-OAEP", "RSA-OAEP-256", "RSA-OAEP-384", "RSA-OAEP-512"]);
          if (jose.cryptoRuntime === "node:crypto") algs = algs.concat(["RSA1_5"]);
        }
        if (use === "sig" || use === undefined)
          algs = algs.concat(["PS256", "PS384", "PS512", "RS256", "RS384", "RS512"]);
        return new Set(algs);
      }
      default:
        throw Error("unreachable");
    }
  }
  cjsModule.exports = class {
    #e;
    constructor(i, keys) {
      if (i !== internal) throw Error("invalid constructor call");
      this.#e = keys;
    }
    toJWKS() {
      return {
        keys: this.map(({ jwk: { d, p, q, dp, dq, qi, ...jwk } }) => jwk),
      };
    }
    all({ alg, kid, use } = {}) {
      if (!use || !alg) throw Error();
      let kty = getKtyFromAlg(alg);
      let search = {
        alg,
        use,
      };
      return this.filter((key) => {
        let candidate = true;
        if (candidate && kty !== undefined && key.jwk.kty !== kty) candidate = false;
        if (candidate && kid !== undefined && key.jwk.kid !== kid) candidate = false;
        if (candidate && use !== undefined && key.jwk.use !== undefined && key.jwk.use !== use)
          candidate = false;
        if (candidate && key.jwk.alg && key.jwk.alg !== alg) candidate = false;
        else if (!key.algorithms.has(alg)) candidate = false;
        return candidate;
      }).sort((first, second) => keyscore(second, search) - keyscore(first, search));
    }
    get(...args) {
      return this.all(...args)[0];
    }
    static async fromJWKS(jwks, { onlyPublic = false, onlyPrivate = false } = {}) {
      if (
        !isPlainObject(jwks) ||
        !Array.isArray(jwks.keys) ||
        jwks.keys.some((k) => !isPlainObject(k) || !("kty" in k))
      )
        throw TypeError("jwks must be a JSON Web Key Set formatted object");
      let keys = [];
      for (let jwk of jwks.keys) {
        jwk = clone(jwk);
        let { kty, kid, crv } = jwk;
        let { alg, use } = jwk;
        if (typeof kty !== "string" || !kty) continue;
        if (use !== undefined && use !== "sig" && use !== "enc") continue;
        if (typeof alg !== "string" && alg !== undefined) continue;
        if (typeof kid !== "string" && kid !== undefined) continue;
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
        if (crv === "secp256k1") {
          use = "sig";
          alg = "ES256K";
        }
        if (kty === "OKP")
          switch (crv) {
            case "Ed25519":
            case "Ed448":
              use = "sig";
              alg = "EdDSA";
              break;
            case "X25519":
            case "X448":
              use = "enc";
              break;
            default:
              break;
          }
        if (alg && !use)
          switch (true) {
            case alg.startsWith("ECDH"):
              use = "enc";
              break;
            case alg.startsWith("RSA"):
              use = "enc";
              break;
            default:
              break;
          }
        if (onlyPrivate && (jwk.kty === "oct" || !jwk.d)) throw Error("jwks must only contain private keys");
        if (onlyPublic && (jwk.d || jwk.k)) continue;
        keys.push({
          jwk: {
            ...jwk,
            alg,
            use,
          },
          async keyObject(alg) {
            if (this[alg]) return this[alg];
            let keyObject = await jose.importJWK(this.jwk, alg);
            this[alg] = keyObject;
            return keyObject;
          },
          get algorithms() {
            Object.defineProperty(this, "algorithms", {
              value: getAlgorithms(this.jwk.use, this.jwk.alg, this.jwk.kty, this.jwk.crv),
              enumerable: true,
              configurable: false,
            });
            return this.algorithms;
          },
        });
      }
      return new this(internal, keys);
    }
    filter(...args) {
      return this.#e.filter(...args);
    }
    find(...args) {
      return this.#e.find(...args);
    }
    every(...args) {
      return this.#e.every(...args);
    }
    some(...args) {
      return this.#e.some(...args);
    }
    map(...args) {
      return this.#e.map(...args);
    }
    forEach(...args) {
      return this.#e.forEach(...args);
    }
    reduce(...args) {
      return this.#e.reduce(...args);
    }
    sort(...args) {
      return this.#e.sort(...args);
    }
    *[Symbol.iterator]() {
      for (let key of this.#e) yield key;
    }
  };
});
export { require_keystore };

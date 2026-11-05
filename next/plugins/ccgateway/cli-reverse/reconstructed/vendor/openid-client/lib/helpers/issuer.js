/**
 * openid-client/lib/helpers/issuer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_object_hash } from "../../../object-hash/index.js";
import { require_lru_cache } from "../../../lru-cache/index.js";
import { require_errors } from "../errors.js";
import { require_assert } from "./assert.js";
import { require_keystore } from "./keystore.js";
import { require_weak_cache } from "./weak_cache.js";
import { require_process_response } from "./process_response.js";
import { require_request } from "./request.js";

//@ chunk-1hnjmk23.js:38000-39315 cjs-fingerprint
var require_issuer_2 = __commonJS(function (cjsExports, cjsModule) {
  var objectHash = require_object_hash();
  var LRU = require_lru_cache();
  var { RPError } = require_errors();
  var { assertIssuerConfiguration } = require_assert();
  var KeyStore = require_keystore();
  var { keystores } = require_weak_cache();
  var processResponse = require_process_response();
  var request = require_request();
  var inFlight = new WeakMap();
  var caches = new WeakMap();
  var lrus = (ctx) => {
    if (!caches.has(ctx))
      caches.set(
        ctx,
        new LRU({
          max: 100,
        }),
      );
    return caches.get(ctx);
  };
  async function getKeyStore(reload = false) {
    assertIssuerConfiguration(this, "jwks_uri");
    let keystore = keystores.get(this);
    let cache = lrus(this);
    if (reload || !keystore) {
      if (inFlight.has(this)) return inFlight.get(this);
      cache.reset();
      inFlight.set(
        this,
        (async () => {
          let response = await request
            .call(this, {
              method: "GET",
              responseType: "json",
              url: this.jwks_uri,
              headers: {
                Accept: "application/json, application/jwk-set+json",
              },
            })
            .finally(() => {
              inFlight.delete(this);
            });
          let jwks = processResponse(response);
          let joseKeyStore = KeyStore.fromJWKS(jwks, {
            onlyPublic: true,
          });
          cache.set("throttle", true, 60000);
          keystores.set(this, joseKeyStore);
          return joseKeyStore;
        })(),
      );
      return inFlight.get(this);
    }
    return keystore;
  }
  async function queryKeyStore({ kid, kty, alg, use }, { allowMulti = false } = {}) {
    let cache = lrus(this);
    let def = {
      kid,
      kty,
      alg,
      use,
    };
    let defHash = objectHash(def, {
      algorithm: "sha256",
      ignoreUnknown: true,
      unorderedArrays: true,
      unorderedSets: true,
      respectType: false,
    });
    let freshJwksUri = cache.get(defHash) || cache.get("throttle");
    let keystore = await getKeyStore.call(this, !freshJwksUri);
    let keys = keystore.all(def);
    delete def.use;
    if (keys.length === 0)
      throw new RPError({
        printf: ["no valid key found in issuer's jwks_uri for key parameters %j", def],
        jwks: keystore,
      });
    if (!allowMulti && keys.length > 1 && !kid)
      throw new RPError({
        printf: [
          "multiple matching keys found in issuer's jwks_uri for key parameters %j, kid must be provided in this case",
          def,
        ],
        jwks: keystore,
      });
    cache.set(defHash, true);
    return keys;
  }
  cjsExports.queryKeyStore = queryKeyStore;
  cjsExports.keystore = getKeyStore;
});
export { require_issuer_2 };

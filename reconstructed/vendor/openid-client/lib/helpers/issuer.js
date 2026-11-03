/**
 * openid-client/lib/helpers/issuer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { AS } from "../../../object-hash/index.js";
import { yf } from "../../../lru-cache/index.js";
import { Ki } from "../errors.js";
import { uf } from "./assert.js";
import { gy } from "./keystore.js";
import { wf } from "./weak_cache.js";
import { pf } from "./process_response.js";
import { Ol } from "./request.js";

//@ chunk-1ny7cxrt.js:37631-38946 cjs-fingerprint
var ky = x(function (JF, Sy) {
  var VF = AS(),
    qF = yf(),
    { RPError: RPError } = Ki(),
    { assertIssuerConfiguration: assertIssuerConfiguration } = uf(),
    TS = gy(),
    { keystores: keystores } = wf(),
    WF = pf(),
    $S = Ol(),
    weakMap = new WeakMap(),
    weakMap_2 = new WeakMap(),
    RS = (e) => {
      if (!weakMap_2.has(e)) weakMap_2.set(e, new qF({ max: 100 }));
      return weakMap_2.get(e);
    };
  async function DS(e = !1) {
    assertIssuerConfiguration(this, "jwks_uri");
    let t = keystores.get(this),
      n = RS(this);
    if (e || !t) {
      if (weakMap.has(this)) return weakMap.get(this);
      return (
        n.reset(),
        weakMap.set(
          this,
          (async () => {
            let o = await $S
                .call(this, {
                  method: "GET",
                  responseType: "json",
                  url: this.jwks_uri,
                  headers: { Accept: "application/json, application/jwk-set+json" },
                })
                .finally(() => {
                  weakMap.delete(this);
                }),
              r = WF(o),
              fromJWKS = TS.fromJWKS(r, { onlyPublic: !0 });
            return (n.set("throttle", !0, 60000), keystores.set(this, fromJWKS), fromJWKS);
          })(),
        ),
        weakMap.get(this)
      );
    }
    return t;
  }
  async function YF({ kid: kid, kty: kty, alg: alg, use: use }, { allowMulti: r = !1 } = {}) {
    let s = RS(this),
      a = { kid: kid, kty: kty, alg: alg, use: use },
      l = VF(a, {
        algorithm: "sha256",
        ignoreUnknown: !0,
        unorderedArrays: !0,
        unorderedSets: !0,
        respectType: !1,
      }),
      c = s.get(l) || s.get("throttle"),
      u = await DS.call(this, !c),
      all = u.all(a);
    if ((delete a.use, all.length === 0))
      throw new RPError({
        printf: ["no valid key found in issuer's jwks_uri for key parameters %j", a],
        jwks: u,
      });
    if (!r && all.length > 1 && !kid)
      throw new RPError({
        printf: [
          "multiple matching keys found in issuer's jwks_uri for key parameters %j, kid must be provided in this case",
          a,
        ],
        jwks: u,
      });
    return (s.set(l, !0), all);
  }
  JF.queryKeyStore = YF;
  JF.keystore = DS;
});

export { ky };

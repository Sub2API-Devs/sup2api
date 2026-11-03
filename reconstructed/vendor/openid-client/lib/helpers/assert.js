/**
 * openid-client/lib/helpers/assert.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:8617-9110 cjs-fingerprint
var uf = x(function (Mve, CO) {
  function uF(e, t, n) {
    if (!t[`${e}_endpoint`]) return;
    let o = `${e}_endpoint_auth_method`,
      r = `${e}_endpoint_auth_signing_alg`,
      s = `${e}_endpoint_auth_signing_alg_values_supported`;
    if (n[o] && n[o].endsWith("_jwt") && !n[r] && !t[s])
      throw TypeError(`${s} must be configured on the issuer if ${r} is not defined on a client`);
  }
  function dF(e, t) {
    if (!e[t]) throw TypeError(`${t} must be configured on the issuer`);
  }
  CO.exports = { assertSigningAlgValuesSupport: uF, assertIssuerConfiguration: dF };
});

export { uf };

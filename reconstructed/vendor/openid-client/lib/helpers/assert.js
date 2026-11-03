/**
 * openid-client/lib/helpers/assert.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:8617-9110 cjs-fingerprint
var require_assert = x(function (cjsExports, cjsModule) {
  function assertSigningAlgValuesSupport(endpoint, issuer, properties) {
    if (!issuer[`${endpoint}_endpoint`]) return;
    let eam = `${endpoint}_endpoint_auth_method`;
    let easa = `${endpoint}_endpoint_auth_signing_alg`;
    let easavs = `${endpoint}_endpoint_auth_signing_alg_values_supported`;
    if (properties[eam] && properties[eam].endsWith("_jwt") && !properties[easa] && !issuer[easavs])
      throw TypeError(`${easavs} must be configured on the issuer if ${easa} is not defined on a client`);
  }
  function assertIssuerConfiguration(issuer, endpoint) {
    if (!issuer[endpoint]) throw TypeError(`${endpoint} must be configured on the issuer`);
  }
  cjsModule.exports = {
    assertSigningAlgValuesSupport,
    assertIssuerConfiguration,
  };
});
export { require_assert };

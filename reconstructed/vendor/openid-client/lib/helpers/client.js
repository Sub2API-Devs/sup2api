/**
 * openid-client/lib/helpers/client.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ki } from "../errors.js";
import { uf } from "./assert.js";
import { Su } from "./generators.js";
import { Ou } from "./unix_timestamp.js";
import { Ol } from "./request.js";
import { wf } from "./weak_cache.js";
import { mS } from "./merge.js";

//@ chunk-1ny7cxrt.js:27454-30880 cjs-fingerprint
var by = x(function (Wve, bS) {
  var Of = require("./chunk-2tyrgda4.js"),
    { RPError: RPError } = Ki(),
    { assertIssuerConfiguration: assertIssuerConfiguration } = uf(),
    { random: random } = Su(),
    NF = Ou(),
    yS = Ol(),
    { keystores: keystores } = wf(),
    zF = mS(),
    gS = (e) => encodeURIComponent(e).replace(/%20/g, "+");
  async function FF(e, t) {
    let n = this[`${e}_endpoint_auth_signing_alg`];
    if (!n) assertIssuerConfiguration(this.issuer, `${e}_endpoint_auth_signing_alg_values_supported`);
    if (this[`${e}_endpoint_auth_method`] === "client_secret_jwt") {
      if (!n) {
        let s = this.issuer[`${e}_endpoint_auth_signing_alg_values_supported`];
        n = Array.isArray(s) && s.find((a) => /^HS(?:256|384|512)/.test(a));
      }
      if (!n)
        throw new RPError(
          `failed to determine a JWS Algorithm to use for ${this[`${e}_endpoint_auth_method`]} Client Assertion`,
        );
      return new Of.CompactSign(Buffer.from(JSON.stringify(t)))
        .setProtectedHeader({ alg: n })
        .sign(this.secretForAlg(n));
    }
    let o = await keystores.get(this);
    if (!o) throw TypeError("no client jwks provided for signing a client assertion with");
    if (!n) {
      let s = this.issuer[`${e}_endpoint_auth_signing_alg_values_supported`];
      n = Array.isArray(s) && s.find((a) => o.get({ alg: a, use: "sig" }));
    }
    if (!n)
      throw new RPError(
        `failed to determine a JWS Algorithm to use for ${this[`${e}_endpoint_auth_method`]} Client Assertion`,
      );
    let r = o.get({ alg: n, use: "sig" });
    if (!r) throw new RPError(`no key found in client jwks to sign a client assertion with using alg ${n}`);
    return new Of.CompactSign(Buffer.from(JSON.stringify(t)))
      .setProtectedHeader({ alg: n, kid: r.jwk && r.jwk.kid })
      .sign(await r.keyObject(n));
  }
  async function _S(e, { clientAssertionPayload: t } = {}) {
    switch (this[`${e}_endpoint_auth_method`]) {
      case "self_signed_tls_client_auth":
      case "tls_client_auth":
      case "none":
        return { form: { client_id: this.client_id } };
      case "client_secret_post":
        if (typeof this.client_secret !== "string")
          throw TypeError("client_secret_post client authentication method requires a client_secret");
        return { form: { client_id: this.client_id, client_secret: this.client_secret } };
      case "private_key_jwt":
      case "client_secret_jwt": {
        let o = NF(),
          r = await FF.call(this, e, {
            iat: o,
            exp: o + 60,
            jti: random(),
            iss: this.client_id,
            sub: this.client_id,
            aud: this.issuer.issuer,
            ...t,
          });
        return {
          form: {
            client_id: this.client_id,
            client_assertion: r,
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          },
        };
      }
      case "client_secret_basic": {
        if (typeof this.client_secret !== "string")
          throw TypeError("client_secret_basic client authentication method requires a client_secret");
        let o = `${gS(this.client_id)}:${gS(this.client_secret)}`;
        return { headers: { Authorization: `Basic ${Buffer.from(o).toString("base64")}` } };
      }
      default:
        throw TypeError(`missing, or unsupported, ${e}_endpoint_auth_method`);
    }
  }
  function BF() {
    let { length: e, 0: t } = this.response_types;
    if (e === 1) return t;
    return;
  }
  function HF() {
    let { length: e, 0: t } = this.redirect_uris || [];
    if (e === 1) return t;
    return;
  }
  async function KF(e, t, { clientAssertionPayload: n, endpointAuthMethod: o = e, DPoP: r } = {}) {
    let s = await _S.call(this, o, { clientAssertionPayload: n }),
      a = zF(t, s),
      l =
        this[`${o}_endpoint_auth_method`].includes("tls_client_auth") ||
        (e === "token" && this.tls_client_certificate_bound_access_tokens),
      c;
    if (l && this.issuer.mtls_endpoint_aliases) c = this.issuer.mtls_endpoint_aliases[`${e}_endpoint`];
    if (((c = c || this.issuer[`${e}_endpoint`]), "form" in a)) {
      for (let [u, f] of Object.entries(a.form)) if (typeof f > "u") delete a.form[u];
    }
    return yS.call(
      this,
      {
        ...a,
        method: "POST",
        url: c,
        headers: { ...(e !== "revocation" ? { Accept: "application/json" } : void 0), ...a.headers },
      },
      { mTLS: l, DPoP: r },
    );
  }
  bS.exports = { resolveResponseType: BF, resolveRedirectUri: HF, authFor: _S, authenticatedPost: KF };
});

export { by };

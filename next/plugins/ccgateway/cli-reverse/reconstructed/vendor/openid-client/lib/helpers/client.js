/**
 * openid-client/lib/helpers/client.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_errors } from "../errors.js";
import { require_assert } from "./assert.js";
import { require_generators } from "./generators.js";
import { require_unix_timestamp } from "./unix_timestamp.js";
import { require_request } from "./request.js";
import { require_weak_cache } from "./weak_cache.js";
import { require_merge } from "./merge.js";

//@ chunk-1hnjmk23.js:27823-31249 cjs-fingerprint
var require_client = __commonJS(function (cjsExports, cjsModule) {
  var jose = require("../../../jose/dist/node/esm/jwe/compact/CompactEncrypt.lazy.js");
  var { RPError } = require_errors();
  var { assertIssuerConfiguration } = require_assert();
  var { random } = require_generators();
  var now = require_unix_timestamp();
  var request = require_request();
  var { keystores } = require_weak_cache();
  var merge = require_merge();
  var formUrlEncode = (value) => encodeURIComponent(value).replace(/%20/g, "+");
  async function clientAssertion(endpoint, payload) {
    let alg = this[`${endpoint}_endpoint_auth_signing_alg`];
    if (!alg)
      assertIssuerConfiguration(this.issuer, `${endpoint}_endpoint_auth_signing_alg_values_supported`);
    if (this[`${endpoint}_endpoint_auth_method`] === "client_secret_jwt") {
      if (!alg) {
        let supported = this.issuer[`${endpoint}_endpoint_auth_signing_alg_values_supported`];
        alg = Array.isArray(supported) && supported.find((signAlg) => /^HS(?:256|384|512)/.test(signAlg));
      }
      if (!alg)
        throw new RPError(
          `failed to determine a JWS Algorithm to use for ${this[`${endpoint}_endpoint_auth_method`]} Client Assertion`,
        );
      return new jose.CompactSign(Buffer.from(JSON.stringify(payload)))
        .setProtectedHeader({
          alg,
        })
        .sign(this.secretForAlg(alg));
    }
    let keystore = await keystores.get(this);
    if (!keystore) throw TypeError("no client jwks provided for signing a client assertion with");
    if (!alg) {
      let supported = this.issuer[`${endpoint}_endpoint_auth_signing_alg_values_supported`];
      alg =
        Array.isArray(supported) &&
        supported.find((signAlg) =>
          keystore.get({
            alg: signAlg,
            use: "sig",
          }),
        );
    }
    if (!alg)
      throw new RPError(
        `failed to determine a JWS Algorithm to use for ${this[`${endpoint}_endpoint_auth_method`]} Client Assertion`,
      );
    let key = keystore.get({
      alg,
      use: "sig",
    });
    if (!key)
      throw new RPError(`no key found in client jwks to sign a client assertion with using alg ${alg}`);
    return new jose.CompactSign(Buffer.from(JSON.stringify(payload)))
      .setProtectedHeader({
        alg,
        kid: key.jwk && key.jwk.kid,
      })
      .sign(await key.keyObject(alg));
  }
  async function authFor(endpoint, { clientAssertionPayload } = {}) {
    switch (this[`${endpoint}_endpoint_auth_method`]) {
      case "self_signed_tls_client_auth":
      case "tls_client_auth":
      case "none":
        return {
          form: {
            client_id: this.client_id,
          },
        };
      case "client_secret_post":
        if (typeof this.client_secret !== "string")
          throw TypeError("client_secret_post client authentication method requires a client_secret");
        return {
          form: {
            client_id: this.client_id,
            client_secret: this.client_secret,
          },
        };
      case "private_key_jwt":
      case "client_secret_jwt": {
        let timestamp = now();
        let assertion = await clientAssertion.call(this, endpoint, {
          iat: timestamp,
          exp: timestamp + 60,
          jti: random(),
          iss: this.client_id,
          sub: this.client_id,
          aud: this.issuer.issuer,
          ...clientAssertionPayload,
        });
        return {
          form: {
            client_id: this.client_id,
            client_assertion: assertion,
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          },
        };
      }
      case "client_secret_basic": {
        if (typeof this.client_secret !== "string")
          throw TypeError("client_secret_basic client authentication method requires a client_secret");
        let credentials = `${formUrlEncode(this.client_id)}:${formUrlEncode(this.client_secret)}`;
        return {
          headers: {
            Authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
          },
        };
      }
      default:
        throw TypeError(`missing, or unsupported, ${endpoint}_endpoint_auth_method`);
    }
  }
  function resolveResponseType() {
    let { length, 0: value } = this.response_types;
    if (length === 1) return value;
    return;
  }
  function resolveRedirectUri() {
    let { length, 0: value } = this.redirect_uris || [];
    if (length === 1) return value;
    return;
  }
  async function authenticatedPost(
    endpoint,
    opts,
    { clientAssertionPayload, endpointAuthMethod = endpoint, DPoP } = {},
  ) {
    let auth = await authFor.call(this, endpointAuthMethod, {
      clientAssertionPayload,
    });
    let requestOpts = merge(opts, auth);
    let mTLS =
      this[`${endpointAuthMethod}_endpoint_auth_method`].includes("tls_client_auth") ||
      (endpoint === "token" && this.tls_client_certificate_bound_access_tokens);
    let targetUrl;
    if (mTLS && this.issuer.mtls_endpoint_aliases)
      targetUrl = this.issuer.mtls_endpoint_aliases[`${endpoint}_endpoint`];
    targetUrl = targetUrl || this.issuer[`${endpoint}_endpoint`];
    if ("form" in requestOpts) {
      for (let [key, value] of Object.entries(requestOpts.form))
        if (typeof value === "undefined") delete requestOpts.form[key];
    }
    return request.call(
      this,
      {
        ...requestOpts,
        method: "POST",
        url: targetUrl,
        headers: {
          ...(endpoint !== "revocation"
            ? {
                Accept: "application/json",
              }
            : undefined),
          ...requestOpts.headers,
        },
      },
      {
        mTLS,
        DPoP,
      },
    );
  }
  cjsModule.exports = {
    resolveResponseType,
    resolveRedirectUri,
    authFor,
    authenticatedPost,
  };
});
export { require_client };

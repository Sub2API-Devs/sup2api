/**
 * openid-client/lib/client.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { vO } from "../../oidc-token-hash/lib/index.js";
import { kO } from "./helpers/is_key_object.js";
import { PO } from "./helpers/decode_jwt.js";
import { vu } from "./helpers/base64url.js";
import { ly } from "./helpers/defaults.js";
import { cy } from "./helpers/www_authenticate_parser.js";
import { uf } from "./helpers/assert.js";
import { df } from "./helpers/pick.js";
import { wu } from "./helpers/is_plain_object.js";
import { pf } from "./helpers/process_response.js";
import { dy } from "./token_set.js";
import { Ki } from "./errors.js";
import { Ou } from "./helpers/unix_timestamp.js";
import { Su } from "./helpers/generators.js";
import { Ol } from "./helpers/request.js";
import { _f } from "./helpers/consts.js";
import { wf } from "./helpers/weak_cache.js";
import { gy } from "./helpers/keystore.js";
import { Pu } from "./helpers/deep_clone.js";
import { by } from "./helpers/client.js";
import { ky } from "./helpers/issuer.js";
import { NS } from "./device_flow_handle.js";
import { env } from "../../../src/utils/env.js";

//@ chunk-1ny7cxrt.js:40798-68879 cjs-fingerprint
var Ly = x(function (Jve, xy) {
  var { inspect: inspect } = importMetaRequire("util"),
    XS = importMetaRequire("http"),
    El = importMetaRequire("crypto"),
    { strict: strict } = importMetaRequire("assert"),
    Il = importMetaRequire("querystring"),
    Cl = importMetaRequire("url"),
    { URL: zS, URLSearchParams: FS } = importMetaRequire("url"),
    on = require("./chunk-2tyrgda4.js"),
    Pl = vO(),
    QS = kO(),
    tB = PO(),
    qs = vu(),
    BS = ly(),
    nB = cy(),
    {
      assertSigningAlgValuesSupport: assertSigningAlgValuesSupport,
      assertIssuerConfiguration: assertIssuerConfiguration,
    } = uf(),
    Dy = df(),
    Vs = wu(),
    Ks = pf(),
    Vr = dy(),
    { OPError: OPError, RPError: RPError } = Ki(),
    Ay = Ou(),
    { random: random } = Su(),
    Al = Ol(),
    { CLOCK_TOLERANCE: CLOCK_TOLERANCE } = _f(),
    { keystores: keystores } = wf(),
    ek = gy(),
    ZS = Pu(),
    {
      authenticatedPost: authenticatedPost,
      resolveResponseType: resolveResponseType,
      resolveRedirectUri: resolveRedirectUri,
    } = by(),
    { queryKeyStore: queryKeyStore } = ky(),
    oB = NS(),
    [qS, sB] = process.version
      .slice(1)
      .split(".")
      .map((e) => parseInt(e, 10)),
    aB = qS >= 17 || (qS === 16 && sB >= 9),
    Cy = Symbol(),
    GS = Symbol(),
    WS = Symbol();
  function Zs(e) {
    return Dy(
      e,
      "access_token",
      "code",
      "error_description",
      "error_uri",
      "error",
      "expires_in",
      "id_token",
      "iss",
      "response",
      "session_state",
      "state",
      "token_type",
    );
  }
  function Ty(e, t = "Bearer") {
    return `${t} ${e}`;
  }
  function $y(e) {
    let parse = Cl.parse(e);
    if (!parse.search) return {};
    return Il.parse(parse.search.substring(1));
  }
  function lB(e, t, n) {
    if (e[n] === void 0) throw new RPError({ message: `missing required JWT property ${n}`, jwt: t });
  }
  function kf(e) {
    let t = {
      client_id: this.client_id,
      scope: "openid",
      response_type: resolveResponseType.call(this),
      redirect_uri: resolveRedirectUri.call(this),
      ...e,
    };
    return (
      Object.entries(t).forEach(([n, o]) => {
        if (o === null || o === void 0) delete t[n];
        else if (n === "claims" && typeof o === "object") t[n] = JSON.stringify(o);
        else if (n === "resource" && Array.isArray(o)) t[n] = o;
        else if (typeof o !== "string") t[n] = String(o);
      }),
      t
    );
  }
  function YS(e) {
    if (!Vs(e) || !Array.isArray(e.keys) || e.keys.some((key) => !Vs(key) || !("kty" in key)))
      throw TypeError("jwks must be a JSON Web Key Set formatted object");
    return ek.fromJWKS(e, { onlyPrivate: !0 });
  }
  function cB(e, t) {
    try {
      let token_endpoint_auth_methods_supported = e.issuer.token_endpoint_auth_methods_supported;
      if (!token_endpoint_auth_methods_supported.includes(t.token_endpoint_auth_method)) {
        if (token_endpoint_auth_methods_supported.includes("client_secret_post"))
          t.token_endpoint_auth_method = "client_secret_post";
      }
    } catch (error) {}
  }
  function uB(e, t, n) {
    if (!t.token_endpoint_auth_method) cB(e, n);
    if (t.redirect_uri) {
      if (t.redirect_uris) throw TypeError("provide a redirect_uri or redirect_uris, not both");
      ((n.redirect_uris = [t.redirect_uri]), delete n.redirect_uri);
    }
    if (t.response_type) {
      if (t.response_types) throw TypeError("provide a response_type or response_types, not both");
      ((n.response_types = [t.response_type]), delete n.response_type);
    }
  }
  function dB(e, t, n) {
    if (!t[`${e}_endpoint`]) return;
    let {
        token_endpoint_auth_method: token_endpoint_auth_method,
        token_endpoint_auth_signing_alg: token_endpoint_auth_signing_alg,
      } = n,
      s = `${e}_endpoint_auth_method`,
      a = `${e}_endpoint_auth_signing_alg`;
    if (n[s] === void 0 && n[a] === void 0) {
      if (token_endpoint_auth_method !== void 0) n[s] = token_endpoint_auth_method;
      if (token_endpoint_auth_signing_alg !== void 0) n[a] = token_endpoint_auth_signing_alg;
    }
  }
  class jy {
    #e;
    #t;
    #r;
    #i;
    constructor(e, t, n = {}, o, r) {
      if (
        ((this.#e = new Map()), (this.#t = e), (this.#r = t), typeof n.client_id !== "string" || !n.client_id)
      )
        throw TypeError("client_id is required");
      let s = {
        grant_types: ["authorization_code"],
        id_token_signed_response_alg: "RS256",
        authorization_signed_response_alg: "RS256",
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_basic",
        ...(this.fapi1()
          ? {
              grant_types: ["authorization_code", "implicit"],
              id_token_signed_response_alg: "PS256",
              authorization_signed_response_alg: "PS256",
              response_types: ["code id_token"],
              tls_client_certificate_bound_access_tokens: !0,
              token_endpoint_auth_method: void 0,
            }
          : void 0),
        ...(this.fapi2()
          ? {
              id_token_signed_response_alg: "PS256",
              authorization_signed_response_alg: "PS256",
              token_endpoint_auth_method: void 0,
            }
          : void 0),
        ...n,
      };
      if (this.fapi())
        switch (s.token_endpoint_auth_method) {
          case "self_signed_tls_client_auth":
          case "tls_client_auth":
            break;
          case "private_key_jwt":
            if (!o) throw TypeError("jwks is required");
            break;
          case void 0:
            throw TypeError("token_endpoint_auth_method is required");
          default:
            throw TypeError("invalid or unsupported token_endpoint_auth_method");
        }
      if (this.fapi2()) {
        if (s.tls_client_certificate_bound_access_tokens && s.dpop_bound_access_tokens)
          throw TypeError(
            "either tls_client_certificate_bound_access_tokens or dpop_bound_access_tokens must be set to true",
          );
        if (!s.tls_client_certificate_bound_access_tokens && !s.dpop_bound_access_tokens)
          throw TypeError(
            "either tls_client_certificate_bound_access_tokens or dpop_bound_access_tokens must be set to true",
          );
      }
      if (
        (uB(this, n, s),
        assertSigningAlgValuesSupport("token", this.issuer, s),
        ["introspection", "revocation"].forEach((a) => {
          (dB(a, this.issuer, s), assertSigningAlgValuesSupport(a, this.issuer, s));
        }),
        Object.entries(s).forEach(([a, l]) => {
          if ((this.#e.set(a, l), !this[a]))
            Object.defineProperty(this, a, {
              get() {
                return this.#e.get(a);
              },
              enumerable: !0,
            });
        }),
        o !== void 0)
      ) {
        let a = YS.call(this, o);
        keystores.set(this, a);
      }
      if (r != null && r.additionalAuthorizedParties) this.#i = ZS(r.additionalAuthorizedParties);
      this[CLOCK_TOLERANCE] = 0;
    }
    authorizationUrl(e = {}) {
      if (!Vs(e)) throw TypeError("params must be a plain object");
      assertIssuerConfiguration(this.issuer, "authorization_endpoint");
      let t = new zS(this.issuer.authorization_endpoint);
      for (let [n, o] of Object.entries(kf.call(this, e)))
        if (Array.isArray(o)) {
          t.searchParams.delete(n);
          for (let r of o) t.searchParams.append(n, r);
        } else t.searchParams.set(n, o);
      return t.href.replace(/\+/g, "%20");
    }
    authorizationPost(e = {}) {
      if (!Vs(e)) throw TypeError("params must be a plain object");
      let t = kf.call(this, e),
        joined = Object.keys(t).map((o) => `<input type="hidden" name="${o}" value="${t[o]}"/>`).join(`
`);
      return `<!DOCTYPE html>
<head>
<title>Requesting Authorization</title>
</head>
<body onload="javascript:document.forms[0].submit()">
<form method="post" action="${this.issuer.authorization_endpoint}">
  ${joined}
</form>
</body>
</html>`;
    }
    endSessionUrl(e = {}) {
      assertIssuerConfiguration(this.issuer, "end_session_endpoint");
      let { 0: t, length: n } = this.post_logout_redirect_uris || [],
        { post_logout_redirect_uri: post_logout_redirect_uri = n === 1 ? t : void 0 } = e,
        r;
      if ((({ id_token_hint: r, ...e } = e), r instanceof Vr)) {
        if (!r.id_token) throw TypeError("id_token not present in TokenSet");
        r = r.id_token;
      }
      let parse = Cl.parse(this.issuer.end_session_endpoint),
        a = BS(
          $y(this.issuer.end_session_endpoint),
          e,
          { post_logout_redirect_uri: post_logout_redirect_uri, client_id: this.client_id },
          { id_token_hint: r },
        );
      return (
        Object.entries(a).forEach(([l, c]) => {
          if (c === null || c === void 0) delete a[l];
        }),
        (parse.search = null),
        (parse.query = a),
        Cl.format(parse)
      );
    }
    callbackParams(e) {
      let t = e instanceof XS.IncomingMessage || (e && e.method && e.url);
      if (typeof e !== "string" && !t)
        throw TypeError("#callbackParams only accepts string urls, http.IncomingMessage or a lookalike");
      if (t)
        switch (e.method) {
          case "GET":
            return Zs($y(e.url));
          case "POST":
            if (e.body === void 0)
              throw TypeError(
                "incoming message body missing, include a body parser prior to this method call",
              );
            switch (typeof e.body) {
              case "object":
              case "string":
                if (Buffer.isBuffer(e.body)) return Zs(Il.parse(e.body.toString("utf-8")));
                if (typeof e.body === "string") return Zs(Il.parse(e.body));
                return Zs(e.body);
              default:
                throw TypeError("invalid IncomingMessage body object");
            }
          default:
            throw TypeError("invalid IncomingMessage method");
        }
      else return Zs($y(e));
    }
    async callback(e, t, n = {}, { exchangeBody: o, clientAssertionPayload: r, DPoP: s } = {}) {
      let a = Zs(t);
      if (n.jarm && !("response" in t))
        throw new RPError({ message: "expected a JARM response", checks: n, params: a });
      else if ("response" in t) {
        let decryptJARM = await this.decryptJARM(a.response);
        a = await this.validateJARM(decryptJARM);
      }
      if (this.default_max_age && !n.max_age) n.max_age = this.default_max_age;
      if (a.state && !n.state) throw TypeError("checks.state argument is missing");
      if (!a.state && n.state)
        throw new RPError({ message: "state missing from the response", checks: n, params: a });
      if (n.state !== a.state)
        throw new RPError({
          printf: ["state mismatch, expected %s, got: %s", n.state, a.state],
          checks: n,
          params: a,
        });
      if ("iss" in a) {
        if ((assertIssuerConfiguration(this.issuer, "issuer"), a.iss !== this.issuer.issuer))
          throw new RPError({
            printf: ["iss mismatch, expected %s, got: %s", this.issuer.issuer, a.iss],
            params: a,
          });
      } else if (
        this.issuer.authorization_response_iss_parameter_supported &&
        !("id_token" in a) &&
        !("response" in t)
      )
        throw new RPError({ message: "iss missing from the response", params: a });
      if (a.error) throw new OPError(a);
      let l = { code: ["code"], id_token: ["id_token"], token: ["access_token", "token_type"] };
      if (n.response_type) {
        for (let c of n.response_type.split(" "))
          if (c === "none") {
            if (a.code || a.id_token || a.access_token)
              throw new RPError({
                message: 'unexpected params encountered for "none" response',
                checks: n,
                params: a,
              });
          } else
            for (let u of l[c])
              if (!a[u]) throw new RPError({ message: `${u} missing from response`, checks: n, params: a });
      }
      if (a.id_token) {
        let c = new Vr(a);
        if (
          (await this.decryptIdToken(c),
          await this.validateIdToken(c, n.nonce, "authorization", n.max_age, n.state),
          !a.code)
        )
          return c;
      }
      if (a.code) {
        let grant = await this.grant(
          {
            ...o,
            grant_type: "authorization_code",
            code: a.code,
            redirect_uri: e,
            code_verifier: n.code_verifier,
          },
          { clientAssertionPayload: r, DPoP: s },
        );
        if (
          (await this.decryptIdToken(grant),
          await this.validateIdToken(grant, n.nonce, "token", n.max_age),
          a.session_state)
        )
          grant.session_state = a.session_state;
        return grant;
      }
      return new Vr(a);
    }
    async oauthCallback(e, t, n = {}, { exchangeBody: o, clientAssertionPayload: r, DPoP: s } = {}) {
      let a = Zs(t);
      if (n.jarm && !("response" in t))
        throw new RPError({ message: "expected a JARM response", checks: n, params: a });
      else if ("response" in t) {
        let decryptJARM = await this.decryptJARM(a.response);
        a = await this.validateJARM(decryptJARM);
      }
      if (a.state && !n.state) throw TypeError("checks.state argument is missing");
      if (!a.state && n.state)
        throw new RPError({ message: "state missing from the response", checks: n, params: a });
      if (n.state !== a.state)
        throw new RPError({
          printf: ["state mismatch, expected %s, got: %s", n.state, a.state],
          checks: n,
          params: a,
        });
      if ("iss" in a) {
        if ((assertIssuerConfiguration(this.issuer, "issuer"), a.iss !== this.issuer.issuer))
          throw new RPError({
            printf: ["iss mismatch, expected %s, got: %s", this.issuer.issuer, a.iss],
            params: a,
          });
      } else if (
        this.issuer.authorization_response_iss_parameter_supported &&
        !("id_token" in a) &&
        !("response" in t)
      )
        throw new RPError({ message: "iss missing from the response", params: a });
      if (a.error) throw new OPError(a);
      if (typeof a.id_token === "string" && a.id_token.length)
        throw new RPError({
          message:
            "id_token detected in the response, you must use client.callback() instead of client.oauthCallback()",
          params: a,
        });
      delete a.id_token;
      let l = { code: ["code"], token: ["access_token", "token_type"] };
      if (n.response_type)
        for (let c of n.response_type.split(" ")) {
          if (c === "none") {
            if (a.code || a.id_token || a.access_token)
              throw new RPError({
                message: 'unexpected params encountered for "none" response',
                checks: n,
                params: a,
              });
          }
          if (l[c]) {
            for (let u of l[c])
              if (!a[u]) throw new RPError({ message: `${u} missing from response`, checks: n, params: a });
          }
        }
      if (a.code) {
        let grant = await this.grant(
          {
            ...o,
            grant_type: "authorization_code",
            code: a.code,
            redirect_uri: e,
            code_verifier: n.code_verifier,
          },
          { clientAssertionPayload: r, DPoP: s },
        );
        if (typeof grant.id_token === "string" && grant.id_token.length)
          throw new RPError({
            message:
              "id_token detected in the response, you must use client.callback() instead of client.oauthCallback()",
            params: a,
          });
        return (delete grant.id_token, grant);
      }
      return new Vr(a);
    }
    async decryptIdToken(e) {
      if (!this.id_token_encrypted_response_alg) return e;
      let t = e;
      if (t instanceof Vr) {
        if (!t.id_token) throw TypeError("id_token not present in TokenSet");
        t = t.id_token;
      }
      let id_token_encrypted_response_alg = this.id_token_encrypted_response_alg,
        id_token_encrypted_response_enc = this.id_token_encrypted_response_enc,
        decryptJWE = await this.decryptJWE(
          t,
          id_token_encrypted_response_alg,
          id_token_encrypted_response_enc,
        );
      if (e instanceof Vr) return ((e.id_token = decryptJWE), e);
      return decryptJWE;
    }
    async validateJWTUserinfo(e) {
      let userinfo_signed_response_alg = this.userinfo_signed_response_alg;
      return this.validateJWT(e, userinfo_signed_response_alg, []);
    }
    async decryptJARM(e) {
      if (!this.authorization_encrypted_response_alg) return e;
      let authorization_encrypted_response_alg = this.authorization_encrypted_response_alg,
        authorization_encrypted_response_enc = this.authorization_encrypted_response_enc;
      return this.decryptJWE(e, authorization_encrypted_response_alg, authorization_encrypted_response_enc);
    }
    async decryptJWTUserinfo(e) {
      if (!this.userinfo_encrypted_response_alg) return e;
      let userinfo_encrypted_response_alg = this.userinfo_encrypted_response_alg,
        userinfo_encrypted_response_enc = this.userinfo_encrypted_response_enc;
      return this.decryptJWE(e, userinfo_encrypted_response_alg, userinfo_encrypted_response_enc);
    }
    async decryptJWE(e, t, n = "A128CBC-HS256") {
      let parsed = JSON.parse(qs.decode(e.split(".")[0]));
      if (parsed.alg !== t)
        throw new RPError({
          printf: ["unexpected JWE alg received, expected %s, got: %s", t, parsed.alg],
          jwt: e,
        });
      if (parsed.enc !== n)
        throw new RPError({
          printf: ["unexpected JWE enc received, expected %s, got: %s", n, parsed.enc],
          jwt: e,
        });
      let r = (a) => new TextDecoder().decode(a.plaintext),
        s;
      if (t.match(/^(?:RSA|ECDH)/)) {
        let a = await keystores.get(this),
          decodeProtectedHeader = on.decodeProtectedHeader(e);
        for (let c of a.all({ ...decodeProtectedHeader, use: "enc" }))
          if (
            ((s = await on.compactDecrypt(e, await c.keyObject(decodeProtectedHeader.alg)).then(r, () => {})),
            s)
          )
            break;
      } else s = await on.compactDecrypt(e, this.secretForAlg(t === "dir" ? n : t)).then(r, () => {});
      if (!s) throw new RPError({ message: "failed to decrypt JWE", jwt: e });
      return s;
    }
    async validateIdToken(e, t, n, o, r) {
      let s = e,
        id_token_signed_response_alg = this.id_token_signed_response_alg;
      if (s instanceof Vr) {
        if (!s.id_token) throw TypeError("id_token not present in TokenSet");
        s = s.id_token;
      }
      s = String(s);
      let c = Ay(),
        {
          protected: u,
          payload: payload,
          key: key,
        } = await this.validateJWT(s, id_token_signed_response_alg);
      if (typeof o === "number" || (o !== WS && this.require_auth_time)) {
        if (!payload.auth_time)
          throw new RPError({ message: "missing required JWT property auth_time", jwt: s });
        if (typeof payload.auth_time !== "number")
          throw new RPError({ message: "JWT auth_time claim must be a JSON numeric value", jwt: s });
      }
      if (typeof o === "number" && payload.auth_time + o < c - this[CLOCK_TOLERANCE])
        throw new RPError({
          printf: [
            "too much time has elapsed since the last End-User authentication, max_age %i, auth_time: %i, now %i",
            o,
            payload.auth_time,
            c - this[CLOCK_TOLERANCE],
          ],
          now: c,
          tolerance: this[CLOCK_TOLERANCE],
          auth_time: payload.auth_time,
          jwt: s,
        });
      if (t !== GS && (payload.nonce || t !== void 0) && payload.nonce !== t)
        throw new RPError({ printf: ["nonce mismatch, expected %s, got: %s", t, payload.nonce], jwt: s });
      if (n === "authorization") {
        if (!payload.at_hash && e.access_token)
          throw new RPError({ message: "missing required property at_hash", jwt: s });
        if (!payload.c_hash && e.code)
          throw new RPError({ message: "missing required property c_hash", jwt: s });
        if (this.fapi1()) {
          if (!payload.s_hash && (e.state || r))
            throw new RPError({ message: "missing required property s_hash", jwt: s });
        }
        if (payload.s_hash) {
          if (!r) throw TypeError('cannot verify s_hash, "checks.state" property not provided');
          try {
            Pl.validate(
              { claim: "s_hash", source: "state" },
              payload.s_hash,
              r,
              u.alg,
              key.jwk && key.jwk.crv,
            );
          } catch (error) {
            throw new RPError({ message: error.message, jwt: s });
          }
        }
      }
      if (this.fapi() && payload.iat < c - 3600)
        throw new RPError({
          printf: ["JWT issued too far in the past, now %i, iat %i", c, payload.iat],
          now: c,
          tolerance: this[CLOCK_TOLERANCE],
          iat: payload.iat,
          jwt: s,
        });
      if (e.access_token && payload.at_hash !== void 0)
        try {
          Pl.validate(
            { claim: "at_hash", source: "access_token" },
            payload.at_hash,
            e.access_token,
            u.alg,
            key.jwk && key.jwk.crv,
          );
        } catch (error) {
          throw new RPError({ message: error.message, jwt: s });
        }
      if (e.code && payload.c_hash !== void 0)
        try {
          Pl.validate(
            { claim: "c_hash", source: "code" },
            payload.c_hash,
            e.code,
            u.alg,
            key.jwk && key.jwk.crv,
          );
        } catch (error) {
          throw new RPError({ message: error.message, jwt: s });
        }
      return e;
    }
    async validateJWT(e, t, n = ["iss", "sub", "aud", "exp", "iat"]) {
      let o = this.issuer.issuer === "https://self-issued.me",
        r = Ay(),
        s,
        a;
      try {
        ({ header: s, payload: a } = tB(e, { complete: !0 }));
      } catch (error) {
        throw new RPError({ printf: ["failed to decode JWT (%s: %s)", error.name, error.message], jwt: e });
      }
      if (s.alg !== t)
        throw new RPError({
          printf: ["unexpected JWT alg received, expected %s, got: %s", t, s.alg],
          jwt: e,
        });
      if (o) n = [...n, "sub_jwk"];
      if ((n.forEach(lB.bind(void 0, a, e)), a.iss !== void 0)) {
        let issuer = this.issuer.issuer;
        if (this.#r) issuer = this.issuer.issuer.replace("{tenantid}", a.tid);
        if (a.iss !== issuer)
          throw new RPError({
            printf: ["unexpected iss value, expected %s, got: %s", issuer, a.iss],
            jwt: e,
          });
      }
      if (a.iat !== void 0) {
        if (typeof a.iat !== "number")
          throw new RPError({ message: "JWT iat claim must be a JSON numeric value", jwt: e });
      }
      if (a.nbf !== void 0) {
        if (typeof a.nbf !== "number")
          throw new RPError({ message: "JWT nbf claim must be a JSON numeric value", jwt: e });
        if (a.nbf > r + this[CLOCK_TOLERANCE])
          throw new RPError({
            printf: ["JWT not active yet, now %i, nbf %i", r + this[CLOCK_TOLERANCE], a.nbf],
            now: r,
            tolerance: this[CLOCK_TOLERANCE],
            nbf: a.nbf,
            jwt: e,
          });
      }
      if (a.exp !== void 0) {
        if (typeof a.exp !== "number")
          throw new RPError({ message: "JWT exp claim must be a JSON numeric value", jwt: e });
        if (r - this[CLOCK_TOLERANCE] >= a.exp)
          throw new RPError({
            printf: ["JWT expired, now %i, exp %i", r - this[CLOCK_TOLERANCE], a.exp],
            now: r,
            tolerance: this[CLOCK_TOLERANCE],
            exp: a.exp,
            jwt: e,
          });
      }
      if (a.aud !== void 0) {
        if (Array.isArray(a.aud)) {
          if (a.aud.length > 1 && !a.azp)
            throw new RPError({ message: "missing required JWT property azp", jwt: e });
          if (!a.aud.includes(this.client_id))
            throw new RPError({
              printf: [
                "aud is missing the client_id, expected %s to be included in %j",
                this.client_id,
                a.aud,
              ],
              jwt: e,
            });
        } else if (a.aud !== this.client_id)
          throw new RPError({
            printf: ["aud mismatch, expected %s, got: %s", this.client_id, a.aud],
            jwt: e,
          });
      }
      if (a.azp !== void 0) {
        let c = this.#i;
        if (typeof c === "string") c = [this.client_id, c];
        else if (Array.isArray(c)) c = [this.client_id, ...c];
        else c = [this.client_id];
        if (!c.includes(a.azp)) throw new RPError({ printf: ["azp mismatch, got: %s", a.azp], jwt: e });
      }
      let l;
      if (o) {
        try {
          strict(Vs(a.sub_jwk));
          let importJWK = await on.importJWK(a.sub_jwk, s.alg);
          (strict.equal(importJWK.type, "public"),
            (l = [
              {
                keyObject() {
                  return importJWK;
                },
              },
            ]));
        } catch (error) {
          throw new RPError({ message: "failed to use sub_jwk claim as an asymmetric JSON Web Key", jwt: e });
        }
        if ((await on.calculateJwkThumbprint(a.sub_jwk)) !== a.sub)
          throw new RPError({ message: "failed to match the subject with sub_jwk", jwt: e });
      } else if (s.alg.startsWith("HS")) l = [this.secretForAlg(s.alg)];
      else if (s.alg !== "none") l = await queryKeyStore.call(this.issuer, { ...s, use: "sig" });
      if (!l && s.alg === "none") return { protected: s, payload: a };
      for (let c of l) {
        let u = await on
          .compactVerify(e, c instanceof Uint8Array ? c : await c.keyObject(s.alg))
          .catch(() => {});
        if (u) return { payload: a, protected: u.protectedHeader, key: c };
      }
      throw new RPError({ message: "failed to validate JWT signature", jwt: e });
    }
    async refresh(e, { exchangeBody: t, clientAssertionPayload: n, DPoP: o } = {}) {
      let r = e;
      if (r instanceof Vr) {
        if (!r.refresh_token) throw TypeError("refresh_token not present in TokenSet");
        r = r.refresh_token;
      }
      let grant = await this.grant(
        { ...t, grant_type: "refresh_token", refresh_token: String(r) },
        { clientAssertionPayload: n, DPoP: o },
      );
      if (grant.id_token) {
        if (
          (await this.decryptIdToken(grant),
          await this.validateIdToken(grant, GS, "token", WS),
          e instanceof Vr && e.id_token)
        ) {
          let sub = e.claims().sub,
            sub_2 = grant.claims().sub;
          if (sub_2 !== sub)
            throw new RPError({
              printf: ["sub mismatch, expected %s, got: %s", sub, sub_2],
              jwt: grant.id_token,
            });
        }
      }
      return grant;
    }
    async requestResource(
      e,
      t,
      {
        method: n,
        headers: o,
        body: r,
        DPoP: s,
        tokenType: a = s ? "DPoP" : t instanceof Vr ? t.token_type : "Bearer",
      } = {},
      l,
    ) {
      if (t instanceof Vr) {
        if (!t.access_token) throw TypeError("access_token not present in TokenSet");
        t = t.access_token;
      }
      if (!t) throw TypeError("no access token provided");
      else if (typeof t !== "string") throw TypeError("invalid access token provided");
      let c = { headers: { Authorization: Ty(t, a), ...o }, body: r },
        u = !!this.tls_client_certificate_bound_access_tokens,
        f = await Al.call(
          this,
          { ...c, responseType: "buffer", method: n, url: e },
          { accessToken: t, mTLS: u, DPoP: s },
        ),
        h = f.headers["www-authenticate"];
      if (l !== Cy && h && h.toLowerCase().startsWith("dpop ") && nB(h).error === "use_dpop_nonce")
        return this.requestResource(e, t, { method: n, headers: o, body: r, DPoP: s, tokenType: a });
      return f;
    }
    async userinfo(e, { method: t = "GET", via: n = "header", tokenType: o, params: r, DPoP: s } = {}) {
      assertIssuerConfiguration(this.issuer, "userinfo_endpoint");
      let a = { tokenType: o, method: String(t).toUpperCase(), DPoP: s };
      if (a.method !== "GET" && a.method !== "POST")
        throw TypeError("#userinfo() method can only be POST or a GET");
      if (n === "body" && a.method !== "POST") throw TypeError("can only send body on POST");
      let l = !!(this.userinfo_signed_response_alg || this.userinfo_encrypted_response_alg);
      if (l) a.headers = { Accept: "application/jwt" };
      else a.headers = { Accept: "application/json" };
      let c = !!this.tls_client_certificate_bound_access_tokens,
        u;
      if (c && this.issuer.mtls_endpoint_aliases) u = this.issuer.mtls_endpoint_aliases.userinfo_endpoint;
      if (((u = new zS(u || this.issuer.userinfo_endpoint)), n === "body"))
        ((a.headers.Authorization = void 0),
          (a.headers["Content-Type"] = "application/x-www-form-urlencoded"),
          (a.body = new FS()),
          a.body.append("access_token", e instanceof Vr ? e.access_token : e));
      if (r)
        if (a.method === "GET")
          Object.entries(r).forEach(([m, y]) => {
            u.searchParams.append(m, y);
          });
        else if (a.body)
          Object.entries(r).forEach(([m, y]) => {
            a.body.append(m, y);
          });
        else
          ((a.body = new FS()),
            (a.headers["Content-Type"] = "application/x-www-form-urlencoded"),
            Object.entries(r).forEach(([m, y]) => {
              a.body.append(m, y);
            }));
      if (a.body) a.body = a.body.toString();
      let requestResource = await this.requestResource(u, e, a),
        h = Ks(requestResource, { bearer: !0 });
      if (l) {
        if (!/^application\/jwt/.test(requestResource.headers["content-type"]))
          throw new RPError({
            message: "expected application/jwt response from the userinfo_endpoint",
            response: requestResource,
          });
        let str = requestResource.body.toString(),
          decryptJWTUserinfo = await this.decryptJWTUserinfo(str);
        if (!this.userinfo_signed_response_alg)
          try {
            ((h = JSON.parse(decryptJWTUserinfo)), strict(Vs(h)));
          } catch (error) {
            throw new RPError({
              message: "failed to parse userinfo JWE payload as JSON",
              jwt: decryptJWTUserinfo,
            });
          }
        else ({ payload: h } = await this.validateJWTUserinfo(decryptJWTUserinfo));
      } else
        try {
          h = JSON.parse(requestResource.body);
        } catch (error) {
          throw (Object.defineProperty(error, "response", { value: requestResource }), error);
        }
      if (e instanceof Vr && e.id_token) {
        let sub = e.claims().sub;
        if (h.sub !== sub)
          throw new RPError({
            printf: ["userinfo sub mismatch, expected %s, got: %s", sub, h.sub],
            body: h,
            jwt: e.id_token,
          });
      }
      return h;
    }
    encryptionSecret(e) {
      let t = e <= 256 ? "sha256" : e <= 384 ? "sha384" : e <= 512 ? "sha512" : !1;
      if (!t) throw Error("unsupported symmetric encryption key derivation");
      return El.createHash(t)
        .update(this.client_secret)
        .digest()
        .slice(0, e / 8);
    }
    secretForAlg(e) {
      if (!this.client_secret) throw TypeError("client_secret is required");
      if (/^A(\d{3})(?:GCM)?KW$/.test(e)) return this.encryptionSecret(parseInt(RegExp.$1, 10));
      if (/^A(\d{3})(?:GCM|CBC-HS(\d{3}))$/.test(e))
        return this.encryptionSecret(parseInt(RegExp.$2 || RegExp.$1, 10));
      return new TextEncoder().encode(this.client_secret);
    }
    async grant(e, { clientAssertionPayload: t, DPoP: n } = {}, o) {
      assertIssuerConfiguration(this.issuer, "token_endpoint");
      let r = await authenticatedPost.call(
          this,
          "token",
          { form: e, responseType: "json" },
          { clientAssertionPayload: t, DPoP: n },
        ),
        s;
      try {
        s = Ks(r);
      } catch (error) {
        if (o !== Cy && error instanceof OPError && error.error === "use_dpop_nonce")
          return this.grant(e, { clientAssertionPayload: t, DPoP: n }, Cy);
        throw error;
      }
      return new Vr(s);
    }
    async deviceAuthorization(e = {}, { exchangeBody: t, clientAssertionPayload: n, DPoP: o } = {}) {
      (assertIssuerConfiguration(this.issuer, "device_authorization_endpoint"),
        assertIssuerConfiguration(this.issuer, "token_endpoint"));
      let r = kf.call(this, { client_id: this.client_id, redirect_uri: null, response_type: null, ...e }),
        s = await authenticatedPost.call(
          this,
          "device_authorization",
          { responseType: "json", form: r },
          { clientAssertionPayload: n, endpointAuthMethod: "token" },
        ),
        a = Ks(s);
      return new oB({
        client: this,
        exchangeBody: t,
        clientAssertionPayload: n,
        response: a,
        maxAge: e.max_age,
        DPoP: o,
      });
    }
    async revoke(e, t, { revokeBody: n, clientAssertionPayload: o } = {}) {
      if (
        (assertIssuerConfiguration(this.issuer, "revocation_endpoint"), t !== void 0 && typeof t !== "string")
      )
        throw TypeError("hint must be a string");
      let r = { ...n, token: e };
      if (t) r.token_type_hint = t;
      let s = await authenticatedPost.call(this, "revocation", { form: r }, { clientAssertionPayload: o });
      Ks(s, { body: !1 });
    }
    async introspect(e, t, { introspectBody: n, clientAssertionPayload: o } = {}) {
      if (
        (assertIssuerConfiguration(this.issuer, "introspection_endpoint"),
        t !== void 0 && typeof t !== "string")
      )
        throw TypeError("hint must be a string");
      let r = { ...n, token: e };
      if (t) r.token_type_hint = t;
      let s = await authenticatedPost.call(
        this,
        "introspection",
        { form: r, responseType: "json" },
        { clientAssertionPayload: o },
      );
      return Ks(s);
    }
    static async register(e, t = {}) {
      let { initialAccessToken: initialAccessToken, jwks: jwks, ...r } = t;
      if (
        (assertIssuerConfiguration(this.issuer, "registration_endpoint"),
        jwks !== void 0 && !(e.jwks || e.jwks_uri))
      ) {
        let l = await YS.call(this, jwks);
        e.jwks = l.toJWKS();
      }
      let s = await Al.call(this, {
          headers: {
            Accept: "application/json",
            ...(initialAccessToken ? { Authorization: Ty(initialAccessToken) } : void 0),
          },
          responseType: "json",
          json: e,
          url: this.issuer.registration_endpoint,
          method: "POST",
        }),
        a = Ks(s, { statusCode: 201, bearer: !0 });
      return new this(a, jwks, r);
    }
    get metadata() {
      return ZS(Object.fromEntries(this.#e.entries()));
    }
    static async fromUri(e, t, n, o) {
      let r = await Al.call(this, {
          method: "GET",
          url: e,
          responseType: "json",
          headers: { Authorization: Ty(t), Accept: "application/json" },
        }),
        s = Ks(r, { bearer: !0 });
      return new this(s, n, o);
    }
    async requestObject(
      e = {},
      {
        sign: t = this.request_object_signing_alg || "none",
        encrypt: {
          alg: n = this.request_object_encryption_alg,
          enc: o = this.request_object_encryption_enc || "A128CBC-HS256",
        } = {},
      } = {},
    ) {
      if (!Vs(e)) throw TypeError("requestObject must be a plain object");
      let r,
        s,
        a = Ay(),
        l = { alg: t, typ: "oauth-authz-req+jwt" },
        json = JSON.stringify(
          BS({}, e, {
            iss: this.client_id,
            aud: this.issuer.issuer,
            client_id: this.client_id,
            jti: random(),
            iat: a,
            exp: a + 300,
            ...(this.fapi() ? { nbf: a } : void 0),
          }),
        );
      if (t === "none") r = [qs.encode(JSON.stringify(l)), qs.encode(json), ""].join(".");
      else {
        let startsWith = t.startsWith("HS");
        if (startsWith) s = this.secretForAlg(t);
        else {
          let h = await keystores.get(this);
          if (!h) throw TypeError(`no keystore present for client, cannot sign using alg ${t}`);
          if (((s = h.get({ alg: t, use: "sig" })), !s))
            throw TypeError(`no key to sign with found for alg ${t}`);
        }
        r = await new on.CompactSign(new TextEncoder().encode(json))
          .setProtectedHeader({ ...l, kid: startsWith ? void 0 : s.jwk.kid })
          .sign(startsWith ? s : await s.keyObject(t));
      }
      if (!n) return r;
      let u = { alg: n, enc: o, cty: "oauth-authz-req+jwt" };
      if (u.alg.match(/^(RSA|ECDH)/))
        [s] = await queryKeyStore.call(this.issuer, { alg: u.alg, use: "enc" }, { allowMulti: !0 });
      else s = this.secretForAlg(u.alg === "dir" ? u.enc : u.alg);
      return new on.CompactEncrypt(new TextEncoder().encode(r))
        .setProtectedHeader({ ...u, kid: s instanceof Uint8Array ? void 0 : s.jwk.kid })
        .encrypt(s instanceof Uint8Array ? s : await s.keyObject(u.alg));
    }
    async pushedAuthorizationRequest(e = {}, { clientAssertionPayload: t } = {}) {
      assertIssuerConfiguration(this.issuer, "pushed_authorization_request_endpoint");
      let n = { ...("request" in e ? e : kf.call(this, e)), client_id: this.client_id },
        o = await authenticatedPost.call(
          this,
          "pushed_authorization_request",
          { responseType: "json", form: n },
          { clientAssertionPayload: t, endpointAuthMethod: "token" },
        ),
        r = Ks(o, { statusCode: 201 });
      if (!("expires_in" in r))
        throw new RPError({
          message: "expected expires_in in Pushed Authorization Successful Response",
          response: o,
        });
      if (typeof r.expires_in !== "number")
        throw new RPError({
          message: "invalid expires_in value in Pushed Authorization Successful Response",
          response: o,
        });
      if (!("request_uri" in r))
        throw new RPError({
          message: "expected request_uri in Pushed Authorization Successful Response",
          response: o,
        });
      if (typeof r.request_uri !== "string")
        throw new RPError({
          message: "invalid request_uri value in Pushed Authorization Successful Response",
          response: o,
        });
      return r;
    }
    get issuer() {
      return this.#t;
    }
    [inspect.custom]() {
      return `${this.constructor.name} ${inspect(this.metadata, { depth: 1 / 0, colors: process.stdout.isTTY, compact: !1, sorted: !0 })}`;
    }
    fapi() {
      return this.fapi1() || this.fapi2();
    }
    fapi1() {
      return this.constructor.name === "FAPI1Client";
    }
    fapi2() {
      return this.constructor.name === "FAPI2Client";
    }
    async validateJARM(e) {
      let authorization_signed_response_alg = this.authorization_signed_response_alg,
        { payload: payload } = await this.validateJWT(e, authorization_signed_response_alg, [
          "iss",
          "exp",
          "aud",
        ]);
      return Zs(payload);
    }
    async dpopProof(e, t, n) {
      if (!Vs(e)) throw TypeError("payload must be a plain object");
      let o;
      if (QS(t)) o = t;
      else if (t[Symbol.toStringTag] === "CryptoKey") o = t;
      else if (on.cryptoRuntime === "node:crypto") o = El.createPrivateKey(t);
      else throw TypeError("unrecognized crypto runtime");
      if (o.type !== "private") throw TypeError('"DPoP" option must be a private key');
      let r = My.call(this, o, t);
      if (!r) throw TypeError("could not determine DPoP JWS Algorithm");
      return new on.SignJWT({ ath: n ? qs.encode(El.createHash("sha256").update(n).digest()) : void 0, ...e })
        .setProtectedHeader({ alg: r, typ: "dpop+jwt", jwk: await fB(o, t) })
        .setIssuedAt()
        .setJti(random())
        .sign(o);
    }
  }
  function JS(e) {
    switch (e.algorithm.name) {
      case "Ed25519":
      case "Ed448":
        return "EdDSA";
      case "ECDSA": {
        switch (e.algorithm.namedCurve) {
          case "P-256":
            return "ES256";
          case "P-384":
            return "ES384";
          case "P-521":
            return "ES512";
          default:
            break;
        }
        break;
      }
      case "RSASSA-PKCS1-v1_5":
        return `RS${e.algorithm.hash.name.slice(4)}`;
      case "RSA-PSS":
        return `PS${e.algorithm.hash.name.slice(4)}`;
      default:
        throw TypeError("unsupported DPoP private key");
    }
  }
  var My;
  if (on.cryptoRuntime === "node:crypto") {
    let t = function (l, c, u) {
        if (typeof c === "object" && c.format === "jwk" && c.key && c.key.alg) return c.key.alg;
        if (Array.isArray(u)) {
          let filtered = u.filter(RegExp.prototype.test.bind(e));
          if (l.asymmetricKeyType === "rsa-pss") filtered = filtered.filter((h) => h.startsWith("PS"));
          return ["PS256", "PS384", "PS512", "RS256", "RS384", "RS384"].find((h) => filtered.includes(h));
        }
        return "PS256";
      },
      a = function (l, c) {
        switch (typeof c === "object" && typeof c.key === "object" && c.key.crv) {
          case "P-256":
            return "ES256";
          case "secp256k1":
            return "ES256K";
          case "P-384":
            return "ES384";
          case "P-512":
            return "ES512";
          default:
            break;
        }
        let u = l.export({ format: "der", type: "pkcs8" }),
          f = u[1] < 128 ? 17 : 18,
          h = u[f],
          sliced = u.slice(f + 1, f + 1 + h);
        if (sliced.equals(buffer)) return "ES256";
        if (sliced.equals(buffer_2)) return "ES384";
        if (sliced.equals(buffer_3)) return "ES512";
        if (sliced.equals(buffer_4)) return "ES256K";
        throw TypeError("unsupported DPoP private key curve");
      };
    ((pB = t),
      (hB = a),
      (My = function (l, c) {
        if (c[Symbol.toStringTag] === "CryptoKey") return JS(l);
        switch (l.asymmetricKeyType) {
          case "ed25519":
          case "ed448":
            return "EdDSA";
          case "ec":
            return a(l, c);
          case "rsa":
          case aB && "rsa-pss":
            return t(l, c, this.issuer.dpop_signing_alg_values_supported);
          default:
            throw TypeError("unsupported DPoP private key");
        }
      }));
    let e = /^(?:RS|PS)(?:256|384|512)$/,
      buffer = Buffer.from([42, 134, 72, 206, 61, 3, 1, 7]),
      buffer_2 = Buffer.from([43, 129, 4, 0, 34]),
      buffer_3 = Buffer.from([43, 129, 4, 0, 35]),
      buffer_4 = Buffer.from([43, 129, 4, 0, 10]);
  } else My = JS;
  var pB,
    hB,
    weakMap = new WeakMap();
  async function fB(e, t) {
    if (
      on.cryptoRuntime === "node:crypto" &&
      typeof t === "object" &&
      typeof t.key === "object" &&
      t.format === "jwk"
    )
      return Dy(t.key, "kty", "crv", "x", "y", "e", "n");
    if (weakMap.has(t)) return weakMap.get(t);
    let n = Dy(await on.exportJWK(e), "kty", "crv", "x", "y", "e", "n");
    if (QS(t) || on.cryptoRuntime === "WebCryptoAPI") weakMap.set(t, n);
    return n;
  }
  xy.exports = (e, t = !1) =>
    class extends jy {
      constructor(...o) {
        super(e, t, ...o);
      }
      static get issuer() {
        return e;
      }
    };
  xy.exports.BaseClient = jy;
});

export { Ly };

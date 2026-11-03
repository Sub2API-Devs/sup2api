/**
 * openid-client/lib/passport_strategy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Pu } from "./helpers/deep_clone.js";
import { Ki } from "./errors.js";
import { Ly } from "./client.js";
import { Su } from "./helpers/generators.js";
import { df } from "./helpers/pick.js";
import { by } from "./helpers/client.js";

//@ chunk-1ny7cxrt.js:72747-76030 cjs-fingerprint
var pk = x(function (twe, fk) {
  var Pf = importMetaRequire("url"),
    { format: format } = importMetaRequire("util"),
    ck = Pu(),
    { RPError: RPError, OPError: OPError } = Ki(),
    { BaseClient: BaseClient } = Ly(),
    { random: random, codeChallenge: codeChallenge } = Su(),
    $B = df(),
    { resolveResponseType: resolveResponseType, resolveRedirectUri: resolveRedirectUri } = by();
  function MB(e, t, n = {}) {
    if (e) this.error(e);
    else if (!t) this.fail(n);
    else this.success(t, n);
  }
  function dk(
    {
      client: e,
      params: t = {},
      passReqToCallback: n = !1,
      sessionKey: o,
      usePKCE: r = !0,
      extras: s = {},
    } = {},
    a,
  ) {
    if (!(e instanceof BaseClient)) throw TypeError("client must be an instance of openid-client Client");
    if (typeof a !== "function") throw TypeError("verify callback must be a function");
    if (!e.issuer || !e.issuer.issuer) throw TypeError("client must have an issuer with an identifier");
    if (
      ((this._client = e),
      (this._issuer = e.issuer),
      (this._verify = a),
      (this._passReqToCallback = n),
      (this._usePKCE = r),
      (this._key = o || `oidc:${Pf.parse(this._issuer.issuer).hostname}`),
      (this._params = ck(t)),
      delete this._params.state,
      delete this._params.nonce,
      (this._extras = ck(s)),
      !this._params.response_type)
    )
      this._params.response_type = resolveResponseType.call(e);
    if (!this._params.redirect_uri) this._params.redirect_uri = resolveRedirectUri.call(e);
    if (!this._params.scope) this._params.scope = "openid";
    if (this._usePKCE === !0) {
      let l = Array.isArray(this._issuer.code_challenge_methods_supported)
        ? this._issuer.code_challenge_methods_supported
        : !1;
      if (l && l.includes("S256")) this._usePKCE = "S256";
      else if (l && l.includes("plain")) this._usePKCE = "plain";
      else if (l)
        throw TypeError("neither code_challenge_method supported by the client is supported by the issuer");
      else this._usePKCE = "S256";
    } else if (typeof this._usePKCE === "string" && !["plain", "S256"].includes(this._usePKCE))
      throw TypeError(`${this._usePKCE} is not valid/implemented PKCE code_challenge_method`);
    this.name = Pf.parse(e.issuer.issuer).hostname;
  }
  dk.prototype.authenticate = function (t, n) {
    (async () => {
      let _client = this._client;
      if (!t.session) throw TypeError("authentication requires session support");
      let callbackParams = _client.callbackParams(t),
        _key = this._key,
        { 0: a, length: l } = Object.keys(callbackParams);
      if (l === 0 || (l === 1 && a === "iss")) {
        let Z = { state: random(), ...this._params, ...n };
        if (!Z.nonce && Z.response_type.includes("id_token")) Z.nonce = random();
        if (
          ((t.session[_key] = $B(Z, "nonce", "state", "max_age", "response_type")),
          this._usePKCE && Z.response_type.includes("code"))
        ) {
          let F = random();
          switch (((t.session[_key].code_verifier = F), this._usePKCE)) {
            case "S256":
              ((Z.code_challenge = codeChallenge(F)), (Z.code_challenge_method = "S256"));
              break;
            case "plain":
              Z.code_challenge = F;
              break;
          }
        }
        this.redirect(_client.authorizationUrl(Z));
        return;
      }
      let c = t.session[_key];
      if (Object.keys(c || {}).length === 0)
        throw Error(
          format(
            'did not find expected authorization request details in session, req.session["%s"] is %j',
            _key,
            c,
          ),
        );
      let {
        state: state,
        nonce: nonce,
        max_age: max_age,
        code_verifier: code_verifier,
        response_type: response_type,
      } = c;
      try {
        delete t.session[_key];
      } catch (error) {}
      let b = { redirect_uri: this._params.redirect_uri, ...n },
        w = {
          state: state,
          nonce: nonce,
          max_age: max_age,
          code_verifier: code_verifier,
          response_type: response_type,
        },
        callback = await _client.callback(b.redirect_uri, callbackParams, w, this._extras),
        _passReqToCallback = this._passReqToCallback,
        M = this._verify.length > (_passReqToCallback ? 3 : 2) && _client.issuer.userinfo_endpoint,
        N = [callback, MB.bind(this)];
      if (M) {
        if (!callback.access_token)
          throw new RPError({
            message: "expected access_token to be returned when asking for userinfo in verify callback",
            tokenset: callback,
          });
        let userinfo = await _client.userinfo(callback);
        N.splice(1, 0, userinfo);
      }
      if (_passReqToCallback) N.unshift(t);
      this._verify(...N);
    })().catch((o) => {
      if (
        (o instanceof OPError && o.error !== "server_error" && !o.error.startsWith("invalid")) ||
        o instanceof RPError
      )
        this.fail(o);
      else this.error(o);
    });
  };
  fk.exports = dk;
});

export { pk };

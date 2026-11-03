/**
 * openid-client/lib/passport_strategy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_deep_clone } from "./helpers/deep_clone.js";
import { require_errors } from "./errors.js";
import { require_client_2 } from "./client.js";
import { require_generators } from "./helpers/generators.js";
import { require_pick } from "./helpers/pick.js";
import { require_client } from "./helpers/client.js";

//@ chunk-1ny7cxrt.js:72747-76030 cjs-fingerprint
var require_passport_strategy = x(function (cjsExports, cjsModule) {
  var url = importMetaRequire("url");
  var { format } = importMetaRequire("util");
  var cloneDeep = require_deep_clone();
  var { RPError, OPError } = require_errors();
  var { BaseClient } = require_client_2();
  var { random, codeChallenge } = require_generators();
  var pick = require_pick();
  var { resolveResponseType, resolveRedirectUri } = require_client();
  function verified(err, user, info = {}) {
    if (err) this.error(err);
    else if (!user) this.fail(info);
    else this.success(user, info);
  }
  function OpenIDConnectStrategy(
    { client, params = {}, passReqToCallback = false, sessionKey, usePKCE = true, extras = {} } = {},
    verify,
  ) {
    if (!(client instanceof BaseClient))
      throw TypeError("client must be an instance of openid-client Client");
    if (typeof verify !== "function") throw TypeError("verify callback must be a function");
    if (!client.issuer || !client.issuer.issuer)
      throw TypeError("client must have an issuer with an identifier");
    this._client = client;
    this._issuer = client.issuer;
    this._verify = verify;
    this._passReqToCallback = passReqToCallback;
    this._usePKCE = usePKCE;
    this._key = sessionKey || `oidc:${url.parse(this._issuer.issuer).hostname}`;
    this._params = cloneDeep(params);
    delete this._params.state;
    delete this._params.nonce;
    this._extras = cloneDeep(extras);
    if (!this._params.response_type) this._params.response_type = resolveResponseType.call(client);
    if (!this._params.redirect_uri) this._params.redirect_uri = resolveRedirectUri.call(client);
    if (!this._params.scope) this._params.scope = "openid";
    if (this._usePKCE === true) {
      let supportedMethods = Array.isArray(this._issuer.code_challenge_methods_supported)
        ? this._issuer.code_challenge_methods_supported
        : false;
      if (supportedMethods && supportedMethods.includes("S256")) this._usePKCE = "S256";
      else if (supportedMethods && supportedMethods.includes("plain")) this._usePKCE = "plain";
      else if (supportedMethods)
        throw TypeError("neither code_challenge_method supported by the client is supported by the issuer");
      else this._usePKCE = "S256";
    } else if (typeof this._usePKCE === "string" && !["plain", "S256"].includes(this._usePKCE))
      throw TypeError(`${this._usePKCE} is not valid/implemented PKCE code_challenge_method`);
    this.name = url.parse(client.issuer.issuer).hostname;
  }
  OpenIDConnectStrategy.prototype.authenticate = function (req, options) {
    (async () => {
      let client = this._client;
      if (!req.session) throw TypeError("authentication requires session support");
      let reqParams = client.callbackParams(req);
      let sessionKey = this._key;
      let { 0: parameter, length } = Object.keys(reqParams);
      if (length === 0 || (length === 1 && parameter === "iss")) {
        let params = {
          state: random(),
          ...this._params,
          ...options,
        };
        if (!params.nonce && params.response_type.includes("id_token")) params.nonce = random();
        req.session[sessionKey] = pick(params, "nonce", "state", "max_age", "response_type");
        if (this._usePKCE && params.response_type.includes("code")) {
          let verifier = random();
          switch (((req.session[sessionKey].code_verifier = verifier), this._usePKCE)) {
            case "S256":
              params.code_challenge = codeChallenge(verifier);
              params.code_challenge_method = "S256";
              break;
            case "plain":
              params.code_challenge = verifier;
              break;
          }
        }
        this.redirect(client.authorizationUrl(params));
        return;
      }
      let session = req.session[sessionKey];
      if (Object.keys(session || {}).length === 0)
        throw Error(
          format(
            'did not find expected authorization request details in session, req.session["%s"] is %j',
            sessionKey,
            session,
          ),
        );
      let {
        state,
        nonce,
        max_age: maxAge,
        code_verifier: codeVerifier,
        response_type: responseType,
      } = session;
      try {
        delete req.session[sessionKey];
      } catch (err) {}
      let opts = {
        redirect_uri: this._params.redirect_uri,
        ...options,
      };
      let checks = {
        state,
        nonce,
        max_age: maxAge,
        code_verifier: codeVerifier,
        response_type: responseType,
      };
      let tokenset = await client.callback(opts.redirect_uri, reqParams, checks, this._extras);
      let passReq = this._passReqToCallback;
      let loadUserinfo = this._verify.length > (passReq ? 3 : 2) && client.issuer.userinfo_endpoint;
      let args = [tokenset, verified.bind(this)];
      if (loadUserinfo) {
        if (!tokenset.access_token)
          throw new RPError({
            message: "expected access_token to be returned when asking for userinfo in verify callback",
            tokenset,
          });
        let userinfo = await client.userinfo(tokenset);
        args.splice(1, 0, userinfo);
      }
      if (passReq) args.unshift(req);
      this._verify(...args);
    })().catch((error) => {
      if (
        (error instanceof OPError && error.error !== "server_error" && !error.error.startsWith("invalid")) ||
        error instanceof RPError
      )
        this.fail(error);
      else this.error(error);
    });
  };
  cjsModule.exports = OpenIDConnectStrategy;
});
export { require_passport_strategy };

/**
 * @azure/identity/dist/esm/msal/nodeFlows/msalClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { z, he } from "../../util/logging.js";
import { resolveTenantId, AuthenticationRequiredError } from "../../../index.js";
import { Sc, _c, Kf, Is, _s, Vf, Ur, Un, jf } from "../utils.js";
import { Qr } from "../../client/identityClient.js";
import { Lo } from "../../../../../logger/dist/esm/index.js";
import { Wc } from "./msalPlugins.js";
import { Ts, Cs } from "../../../../../msal-node/lib/msal-node.cjs";
import { Ss } from "../../regionalAuthority.js";

//@ chunk-mrx6y2r5.js:292419-292442 esm-fingerprint
var De = z("MsalClient");
//@ chunk-mrx6y2r5.js:292442-292956 esm-fingerprint
function iC(e, t, r = {}) {
  var n, o, i;
  let s = resolveTenantId((n = r.logger) !== null && n !== void 0 ? n : De, t, e),
    a = Sc(s, _c(r)),
    c = new Qr(
      Object.assign(Object.assign({}, r.tokenCredentialOptions), {
        authorityHost: a,
        loggingOptions: r.loggingOptions,
      }),
    );
  return {
    auth: { clientId: e, authority: a, knownAuthorities: Kf(s, a, r.disableInstanceDiscovery) },
    system: {
      networkClient: c,
      loggerOptions: {
        loggerCallback: Is((o = r.logger) !== null && o !== void 0 ? o : De),
        logLevel: _s(Lo()),
        piiLoggingEnabled:
          (i = r.loggingOptions) === null || i === void 0 ? void 0 : i.enableUnsafeSupportLogging,
      },
    },
  };
}
//@ chunk-mrx6y2r5.js:292956-302180 esm-fingerprint
function Xt(e, t, r = {}) {
  var n;
  let o = {
      msalConfig: iC(e, t, r),
      cachedAccount: r.authenticationRecord ? Vf(r.authenticationRecord) : null,
      pluginConfiguration: Wc.generatePluginConfiguration(r),
      logger: (n = r.logger) !== null && n !== void 0 ? n : De,
    },
    i = new Map();
  async function s(A = {}) {
    let C = A.enableCae ? "CAE" : "default",
      E = i.get(C);
    if (E)
      return (o.logger.getToken.info("Existing PublicClientApplication found in cache, returning it."), E);
    o.logger.getToken.info(
      `Creating new PublicClientApplication with CAE ${A.enableCae ? "enabled" : "disabled"}.`,
    );
    let _ = A.enableCae
      ? o.pluginConfiguration.cache.cachePluginCae
      : o.pluginConfiguration.cache.cachePlugin;
    return (
      (o.msalConfig.auth.clientCapabilities = A.enableCae ? ["cp1"] : void 0),
      (E = new Ts(
        Object.assign(Object.assign({}, o.msalConfig), {
          broker: { nativeBrokerPlugin: o.pluginConfiguration.broker.nativeBrokerPlugin },
          cache: { cachePlugin: await _ },
        }),
      )),
      i.set(C, E),
      E
    );
  }
  let a = new Map();
  async function c(A = {}) {
    let C = A.enableCae ? "CAE" : "default",
      E = a.get(C);
    if (E)
      return (
        o.logger.getToken.info("Existing ConfidentialClientApplication found in cache, returning it."),
        E
      );
    o.logger.getToken.info(
      `Creating new ConfidentialClientApplication with CAE ${A.enableCae ? "enabled" : "disabled"}.`,
    );
    let _ = A.enableCae
      ? o.pluginConfiguration.cache.cachePluginCae
      : o.pluginConfiguration.cache.cachePlugin;
    return (
      (o.msalConfig.auth.clientCapabilities = A.enableCae ? ["cp1"] : void 0),
      (E = new Cs(
        Object.assign(Object.assign({}, o.msalConfig), {
          broker: { nativeBrokerPlugin: o.pluginConfiguration.broker.nativeBrokerPlugin },
          cache: { cachePlugin: await _ },
        }),
      )),
      a.set(C, E),
      E
    );
  }
  async function l(A, C, E = {}) {
    if (o.cachedAccount === null)
      throw (
        o.logger.getToken.info("No cached account found in local state."),
        new AuthenticationRequiredError({ scopes: C })
      );
    if (E.claims) o.cachedClaims = E.claims;
    let _ = { account: o.cachedAccount, scopes: C, claims: o.cachedClaims };
    if (o.pluginConfiguration.broker.isEnabled) {
      if (
        (_.tokenQueryParameters || (_.tokenQueryParameters = {}),
        o.pluginConfiguration.broker.enableMsaPassthrough)
      )
        _.tokenQueryParameters.msal_request_type = "consumer_passthrough";
    }
    if (E.proofOfPossessionOptions)
      ((_.shrNonce = E.proofOfPossessionOptions.nonce),
        (_.authenticationScheme = "pop"),
        (_.resourceRequestMethod = E.proofOfPossessionOptions.resourceRequestMethod),
        (_.resourceRequestUri = E.proofOfPossessionOptions.resourceRequestUrl));
    o.logger.getToken.info("Attempting to acquire token silently");
    try {
      return await A.acquireTokenSilent(_);
    } catch (error) {
      throw Ur(C, error, E);
    }
  }
  function d(A) {
    if (A === null || A === void 0 ? void 0 : A.tenantId) return Sc(A.tenantId, _c(r));
    return o.msalConfig.auth.authority;
  }
  async function u(A, C, E, _) {
    var H, S;
    let D = null;
    try {
      D = await l(A, C, E);
    } catch (error) {
      if (error.name !== "AuthenticationRequiredError") throw error;
      if (E.disableAutomaticAuthentication)
        throw new AuthenticationRequiredError({
          scopes: C,
          getTokenOptions: E,
          message: "Automatic authentication has been disabled. You may call the authentication() method.",
        });
    }
    if (D === null)
      try {
        D = await _();
      } catch (error) {
        throw Ur(C, error, E);
      }
    return (
      Un(C, D, E),
      (o.cachedAccount =
        (H = D === null || D === void 0 ? void 0 : D.account) !== null && H !== void 0 ? H : null),
      o.logger.getToken.info(he(C)),
      {
        token: D.accessToken,
        expiresOnTimestamp: D.expiresOn.getTime(),
        refreshAfterTimestamp: (S = D.refreshOn) === null || S === void 0 ? void 0 : S.getTime(),
        tokenType: D.tokenType,
      }
    );
  }
  async function m(A, C, E = {}) {
    var _;
    (o.logger.getToken.info("Attempting to acquire token using client secret"),
      (o.msalConfig.auth.clientSecret = C));
    let H = await c(E);
    try {
      let acquireTokenByClientCredential = await H.acquireTokenByClientCredential({
        scopes: A,
        authority: d(E),
        azureRegion: Ss(),
        claims: E === null || E === void 0 ? void 0 : E.claims,
      });
      return (
        Un(A, acquireTokenByClientCredential, E),
        o.logger.getToken.info(he(A)),
        {
          token: acquireTokenByClientCredential.accessToken,
          expiresOnTimestamp: acquireTokenByClientCredential.expiresOn.getTime(),
          refreshAfterTimestamp:
            (_ = acquireTokenByClientCredential.refreshOn) === null || _ === void 0 ? void 0 : _.getTime(),
          tokenType: acquireTokenByClientCredential.tokenType,
        }
      );
    } catch (error) {
      throw Ur(A, error, E);
    }
  }
  async function p(A, C, E = {}) {
    var _;
    (o.logger.getToken.info("Attempting to acquire token using client assertion"),
      (o.msalConfig.auth.clientAssertion = C));
    let H = await c(E);
    try {
      let acquireTokenByClientCredential = await H.acquireTokenByClientCredential({
        scopes: A,
        authority: d(E),
        azureRegion: Ss(),
        claims: E === null || E === void 0 ? void 0 : E.claims,
        clientAssertion: C,
      });
      return (
        Un(A, acquireTokenByClientCredential, E),
        o.logger.getToken.info(he(A)),
        {
          token: acquireTokenByClientCredential.accessToken,
          expiresOnTimestamp: acquireTokenByClientCredential.expiresOn.getTime(),
          refreshAfterTimestamp:
            (_ = acquireTokenByClientCredential.refreshOn) === null || _ === void 0 ? void 0 : _.getTime(),
          tokenType: acquireTokenByClientCredential.tokenType,
        }
      );
    } catch (error) {
      throw Ur(A, error, E);
    }
  }
  async function y(A, C, E = {}) {
    var _;
    (o.logger.getToken.info("Attempting to acquire token using client certificate"),
      (o.msalConfig.auth.clientCertificate = C));
    let H = await c(E);
    try {
      let acquireTokenByClientCredential = await H.acquireTokenByClientCredential({
        scopes: A,
        authority: d(E),
        azureRegion: Ss(),
        claims: E === null || E === void 0 ? void 0 : E.claims,
      });
      return (
        Un(A, acquireTokenByClientCredential, E),
        o.logger.getToken.info(he(A)),
        {
          token: acquireTokenByClientCredential.accessToken,
          expiresOnTimestamp: acquireTokenByClientCredential.expiresOn.getTime(),
          refreshAfterTimestamp:
            (_ = acquireTokenByClientCredential.refreshOn) === null || _ === void 0 ? void 0 : _.getTime(),
          tokenType: acquireTokenByClientCredential.tokenType,
        }
      );
    } catch (error) {
      throw Ur(A, error, E);
    }
  }
  async function T(A, C, E = {}) {
    o.logger.getToken.info("Attempting to acquire token using device code");
    let _ = await s(E);
    return u(_, A, E, () => {
      var H, S;
      let D = {
          scopes: A,
          cancel:
            (S =
              (H = E === null || E === void 0 ? void 0 : E.abortSignal) === null || H === void 0
                ? void 0
                : H.aborted) !== null && S !== void 0
              ? S
              : !1,
          deviceCodeCallback: C,
          authority: d(E),
          claims: E === null || E === void 0 ? void 0 : E.claims,
        },
        acquireTokenByDeviceCode = _.acquireTokenByDeviceCode(D);
      if (E.abortSignal)
        E.abortSignal.addEventListener("abort", () => {
          D.cancel = !0;
        });
      return acquireTokenByDeviceCode;
    });
  }
  async function I(A, C, E, _ = {}) {
    o.logger.getToken.info("Attempting to acquire token using username and password");
    let H = await s(_);
    return u(H, A, _, () => {
      let S = {
        scopes: A,
        username: C,
        password: E,
        authority: d(_),
        claims: _ === null || _ === void 0 ? void 0 : _.claims,
      };
      return H.acquireTokenByUsernamePassword(S);
    });
  }
  function v() {
    if (!o.cachedAccount) return;
    return jf(e, o.cachedAccount);
  }
  async function U(A, C, E, _, H = {}) {
    o.logger.getToken.info("Attempting to acquire token using authorization code");
    let S;
    if (_) ((o.msalConfig.auth.clientSecret = _), (S = await c(H)));
    else S = await s(H);
    return u(S, A, H, () =>
      S.acquireTokenByCode({
        scopes: A,
        redirectUri: C,
        code: E,
        authority: d(H),
        claims: H === null || H === void 0 ? void 0 : H.claims,
      }),
    );
  }
  async function B(A, C, E, _ = {}) {
    var H;
    if ((De.getToken.info("Attempting to acquire token on behalf of another user"), typeof E === "string"))
      (De.getToken.info("Using client secret for on behalf of flow"), (o.msalConfig.auth.clientSecret = E));
    else if (typeof E === "function")
      (De.getToken.info("Using client assertion callback for on behalf of flow"),
        (o.msalConfig.auth.clientAssertion = E));
    else
      (De.getToken.info("Using client certificate for on behalf of flow"),
        (o.msalConfig.auth.clientCertificate = E));
    let S = await c(_);
    try {
      let acquireTokenOnBehalfOf = await S.acquireTokenOnBehalfOf({
        scopes: A,
        authority: d(_),
        claims: _.claims,
        oboAssertion: C,
      });
      return (
        Un(A, acquireTokenOnBehalfOf, _),
        De.getToken.info(he(A)),
        {
          token: acquireTokenOnBehalfOf.accessToken,
          expiresOnTimestamp: acquireTokenOnBehalfOf.expiresOn.getTime(),
          refreshAfterTimestamp:
            (H = acquireTokenOnBehalfOf.refreshOn) === null || H === void 0 ? void 0 : H.getTime(),
          tokenType: acquireTokenOnBehalfOf.tokenType,
        }
      );
    } catch (error) {
      throw Ur(A, error, _);
    }
  }
  async function X(A, C = {}) {
    De.getToken.info("Attempting to acquire token interactively");
    let E = await s(C);
    async function _(S) {
      var D;
      De.verbose("Authentication will resume through the broker");
      let se = H();
      if (o.pluginConfiguration.broker.parentWindowHandle)
        se.windowHandle = Buffer.from(o.pluginConfiguration.broker.parentWindowHandle);
      else
        De.warning(
          "Parent window handle is not specified for the broker. This may cause unexpected behavior. Please provide the parentWindowHandle.",
        );
      if (o.pluginConfiguration.broker.enableMsaPassthrough)
        ((D = se.tokenQueryParameters) !== null && D !== void 0
          ? D
          : (se.tokenQueryParameters = {})
        ).msal_request_type = "consumer_passthrough";
      if (S)
        ((se.prompt = "none"),
          De.verbose("Attempting broker authentication using the default broker account"));
      else De.verbose("Attempting broker authentication without the default broker account");
      if (C.proofOfPossessionOptions)
        ((se.shrNonce = C.proofOfPossessionOptions.nonce),
          (se.authenticationScheme = "pop"),
          (se.resourceRequestMethod = C.proofOfPossessionOptions.resourceRequestMethod),
          (se.resourceRequestUri = C.proofOfPossessionOptions.resourceRequestUrl));
      try {
        return await E.acquireTokenInteractive(se);
      } catch (error) {
        if ((De.verbose(`Failed to authenticate through the broker: ${error.message}`), S)) return _(!1);
        else throw error;
      }
    }
    function H() {
      var S, D;
      return {
        openBrowser: async (se) => {
          let er = await import("./chunk-20ppca50.js");
          await er.default(se, { wait: !0, newInstance: !0 });
        },
        scopes: A,
        authority: d(C),
        claims: C === null || C === void 0 ? void 0 : C.claims,
        loginHint: C === null || C === void 0 ? void 0 : C.loginHint,
        errorTemplate:
          (S = C === null || C === void 0 ? void 0 : C.browserCustomizationOptions) === null || S === void 0
            ? void 0
            : S.errorMessage,
        successTemplate:
          (D = C === null || C === void 0 ? void 0 : C.browserCustomizationOptions) === null || D === void 0
            ? void 0
            : D.successMessage,
        prompt: (C === null || C === void 0 ? void 0 : C.loginHint) ? "login" : "select_account",
      };
    }
    return u(E, A, C, async () => {
      var S;
      let D = H();
      if (o.pluginConfiguration.broker.isEnabled)
        return _(
          (S = o.pluginConfiguration.broker.useDefaultBrokerAccount) !== null && S !== void 0 ? S : !1,
        );
      if (C.proofOfPossessionOptions)
        ((D.shrNonce = C.proofOfPossessionOptions.nonce),
          (D.authenticationScheme = "pop"),
          (D.resourceRequestMethod = C.proofOfPossessionOptions.resourceRequestMethod),
          (D.resourceRequestUri = C.proofOfPossessionOptions.resourceRequestUrl));
      return E.acquireTokenInteractive(D);
    });
  }
  return {
    getActiveAccount: v,
    getTokenByClientSecret: m,
    getTokenByClientAssertion: p,
    getTokenByClientCertificate: y,
    getTokenByDeviceCode: T,
    getTokenByUsernamePassword: I,
    getTokenByAuthorizationCode: U,
    getTokenOnBehalfOf: B,
    getTokenByInteractiveRequest: X,
  };
}

export { Xt };

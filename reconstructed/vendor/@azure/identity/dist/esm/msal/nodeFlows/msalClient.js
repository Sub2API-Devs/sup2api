/**
 * @azure/identity/dist/esm/msal/nodeFlows/msalClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { credentialLogger, formatSuccess } from "../../util/logging.js";
import { resolveTenantId, AuthenticationRequiredError } from "../../../index.js";
import {
  getAuthority,
  getAuthorityHost,
  getKnownAuthorities,
  getAuthCapabilities,
  getMSALLogLevel,
  publicToMsal,
  handleMsalError,
  ensureValidMsalToken,
  msalToPublic,
} from "../utils.js";
import { IdentityClient } from "../../client/identityClient.js";
import { getLogLevel } from "../../../../../logger/dist/esm/index.js";
import { msalPlugins } from "./msalPlugins.js";
import {
  PublicClientApplication,
  ConfidentialClientApplication,
} from "../../../../../msal-node/lib/msal-node.cjs";
import { calculateRegionalAuthority } from "../../regionalAuthority.js";

//@ chunk-mrx6y2r5.js:292419-292442 esm-fingerprint
var msalLogger = credentialLogger("MsalClient");
//@ chunk-mrx6y2r5.js:292442-292956 esm-fingerprint
function generateMsalConfiguration(clientId, tenantId, msalClientOptions = {}) {
  var _a;
  var _b;
  var _c;
  let resolvedTenant = resolveTenantId(
    (_a = msalClientOptions.logger) !== null && _a !== undefined ? _a : msalLogger,
    tenantId,
    clientId,
  );
  let authority = getAuthority(resolvedTenant, getAuthorityHost(msalClientOptions));
  let httpClient = new IdentityClient(
    Object.assign(Object.assign({}, msalClientOptions.tokenCredentialOptions), {
      authorityHost: authority,
      loggingOptions: msalClientOptions.loggingOptions,
    }),
  );
  return {
    auth: {
      clientId,
      authority,
      knownAuthorities: getKnownAuthorities(
        resolvedTenant,
        authority,
        msalClientOptions.disableInstanceDiscovery,
      ),
    },
    system: {
      networkClient: httpClient,
      loggerOptions: {
        loggerCallback: getAuthCapabilities(
          (_b = msalClientOptions.logger) !== null && _b !== undefined ? _b : msalLogger,
        ),
        logLevel: getMSALLogLevel(getLogLevel()),
        piiLoggingEnabled:
          (_c = msalClientOptions.loggingOptions) === null || _c === undefined
            ? undefined
            : _c.enableUnsafeSupportLogging,
      },
    },
  };
}
//@ chunk-mrx6y2r5.js:292956-302180 esm-fingerprint
function createMsalClient(clientId, tenantId, createMsalClientOptions = {}) {
  var _a;
  let state = {
    msalConfig: generateMsalConfiguration(clientId, tenantId, createMsalClientOptions),
    cachedAccount: createMsalClientOptions.authenticationRecord
      ? publicToMsal(createMsalClientOptions.authenticationRecord)
      : null,
    pluginConfiguration: msalPlugins.generatePluginConfiguration(createMsalClientOptions),
    logger: (_a = createMsalClientOptions.logger) !== null && _a !== undefined ? _a : msalLogger,
  };
  let publicApps = new Map();
  async function getPublicApp(options = {}) {
    let appKey = options.enableCae ? "CAE" : "default";
    let publicClientApp = publicApps.get(appKey);
    if (publicClientApp) {
      state.logger.getToken.info("Existing PublicClientApplication found in cache, returning it.");
      return publicClientApp;
    }
    state.logger.getToken.info(
      `Creating new PublicClientApplication with CAE ${options.enableCae ? "enabled" : "disabled"}.`,
    );
    let cachePlugin = options.enableCae
      ? state.pluginConfiguration.cache.cachePluginCae
      : state.pluginConfiguration.cache.cachePlugin;
    state.msalConfig.auth.clientCapabilities = options.enableCae ? ["cp1"] : undefined;
    publicClientApp = new PublicClientApplication(
      Object.assign(Object.assign({}, state.msalConfig), {
        broker: {
          nativeBrokerPlugin: state.pluginConfiguration.broker.nativeBrokerPlugin,
        },
        cache: {
          cachePlugin: await cachePlugin,
        },
      }),
    );
    publicApps.set(appKey, publicClientApp);
    return publicClientApp;
  }
  let confidentialApps = new Map();
  async function getConfidentialApp(options = {}) {
    let appKey = options.enableCae ? "CAE" : "default";
    let confidentialClientApp = confidentialApps.get(appKey);
    if (confidentialClientApp) {
      state.logger.getToken.info("Existing ConfidentialClientApplication found in cache, returning it.");
      return confidentialClientApp;
    }
    state.logger.getToken.info(
      `Creating new ConfidentialClientApplication with CAE ${options.enableCae ? "enabled" : "disabled"}.`,
    );
    let cachePlugin = options.enableCae
      ? state.pluginConfiguration.cache.cachePluginCae
      : state.pluginConfiguration.cache.cachePlugin;
    state.msalConfig.auth.clientCapabilities = options.enableCae ? ["cp1"] : undefined;
    confidentialClientApp = new ConfidentialClientApplication(
      Object.assign(Object.assign({}, state.msalConfig), {
        broker: {
          nativeBrokerPlugin: state.pluginConfiguration.broker.nativeBrokerPlugin,
        },
        cache: {
          cachePlugin: await cachePlugin,
        },
      }),
    );
    confidentialApps.set(appKey, confidentialClientApp);
    return confidentialClientApp;
  }
  async function getTokenSilent(app, scopes, options = {}) {
    if (state.cachedAccount === null) {
      state.logger.getToken.info("No cached account found in local state.");
      throw new AuthenticationRequiredError({
        scopes,
      });
    }
    if (options.claims) state.cachedClaims = options.claims;
    let silentRequest = {
      account: state.cachedAccount,
      scopes,
      claims: state.cachedClaims,
    };
    if (state.pluginConfiguration.broker.isEnabled) {
      if (!silentRequest.tokenQueryParameters) silentRequest.tokenQueryParameters = {};
      if (state.pluginConfiguration.broker.enableMsaPassthrough)
        silentRequest.tokenQueryParameters.msal_request_type = "consumer_passthrough";
    }
    if (options.proofOfPossessionOptions) {
      silentRequest.shrNonce = options.proofOfPossessionOptions.nonce;
      silentRequest.authenticationScheme = "pop";
      silentRequest.resourceRequestMethod = options.proofOfPossessionOptions.resourceRequestMethod;
      silentRequest.resourceRequestUri = options.proofOfPossessionOptions.resourceRequestUrl;
    }
    state.logger.getToken.info("Attempting to acquire token silently");
    try {
      return await app.acquireTokenSilent(silentRequest);
    } catch (err) {
      throw handleMsalError(scopes, err, options);
    }
  }
  function calculateRequestAuthority(options) {
    if (options === null || options === undefined ? undefined : options.tenantId)
      return getAuthority(options.tenantId, getAuthorityHost(createMsalClientOptions));
    return state.msalConfig.auth.authority;
  }
  async function withSilentAuthentication(msalApp, scopes, options, onAuthenticationRequired) {
    var _a;
    var _b;
    let response = null;
    try {
      response = await getTokenSilent(msalApp, scopes, options);
    } catch (e) {
      if (e.name !== "AuthenticationRequiredError") throw e;
      if (options.disableAutomaticAuthentication)
        throw new AuthenticationRequiredError({
          scopes,
          getTokenOptions: options,
          message: "Automatic authentication has been disabled. You may call the authentication() method.",
        });
    }
    if (response === null)
      try {
        response = await onAuthenticationRequired();
      } catch (err) {
        throw handleMsalError(scopes, err, options);
      }
    ensureValidMsalToken(scopes, response, options);
    state.cachedAccount =
      (_a = response === null || response === undefined ? undefined : response.account) !== null &&
      _a !== undefined
        ? _a
        : null;
    state.logger.getToken.info(formatSuccess(scopes));
    return {
      token: response.accessToken,
      expiresOnTimestamp: response.expiresOn.getTime(),
      refreshAfterTimestamp:
        (_b = response.refreshOn) === null || _b === undefined ? undefined : _b.getTime(),
      tokenType: response.tokenType,
    };
  }
  async function getTokenByClientSecret(scopes, clientSecret, options = {}) {
    var _a;
    state.logger.getToken.info("Attempting to acquire token using client secret");
    state.msalConfig.auth.clientSecret = clientSecret;
    let msalApp = await getConfidentialApp(options);
    try {
      let response = await msalApp.acquireTokenByClientCredential({
        scopes,
        authority: calculateRequestAuthority(options),
        azureRegion: calculateRegionalAuthority(),
        claims: options === null || options === undefined ? undefined : options.claims,
      });
      ensureValidMsalToken(scopes, response, options);
      state.logger.getToken.info(formatSuccess(scopes));
      return {
        token: response.accessToken,
        expiresOnTimestamp: response.expiresOn.getTime(),
        refreshAfterTimestamp:
          (_a = response.refreshOn) === null || _a === undefined ? undefined : _a.getTime(),
        tokenType: response.tokenType,
      };
    } catch (err) {
      throw handleMsalError(scopes, err, options);
    }
  }
  async function getTokenByClientAssertion(scopes, clientAssertion, options = {}) {
    var _a;
    state.logger.getToken.info("Attempting to acquire token using client assertion");
    state.msalConfig.auth.clientAssertion = clientAssertion;
    let msalApp = await getConfidentialApp(options);
    try {
      let response = await msalApp.acquireTokenByClientCredential({
        scopes,
        authority: calculateRequestAuthority(options),
        azureRegion: calculateRegionalAuthority(),
        claims: options === null || options === undefined ? undefined : options.claims,
        clientAssertion,
      });
      ensureValidMsalToken(scopes, response, options);
      state.logger.getToken.info(formatSuccess(scopes));
      return {
        token: response.accessToken,
        expiresOnTimestamp: response.expiresOn.getTime(),
        refreshAfterTimestamp:
          (_a = response.refreshOn) === null || _a === undefined ? undefined : _a.getTime(),
        tokenType: response.tokenType,
      };
    } catch (err) {
      throw handleMsalError(scopes, err, options);
    }
  }
  async function getTokenByClientCertificate(scopes, certificate, options = {}) {
    var _a;
    state.logger.getToken.info("Attempting to acquire token using client certificate");
    state.msalConfig.auth.clientCertificate = certificate;
    let msalApp = await getConfidentialApp(options);
    try {
      let response = await msalApp.acquireTokenByClientCredential({
        scopes,
        authority: calculateRequestAuthority(options),
        azureRegion: calculateRegionalAuthority(),
        claims: options === null || options === undefined ? undefined : options.claims,
      });
      ensureValidMsalToken(scopes, response, options);
      state.logger.getToken.info(formatSuccess(scopes));
      return {
        token: response.accessToken,
        expiresOnTimestamp: response.expiresOn.getTime(),
        refreshAfterTimestamp:
          (_a = response.refreshOn) === null || _a === undefined ? undefined : _a.getTime(),
        tokenType: response.tokenType,
      };
    } catch (err) {
      throw handleMsalError(scopes, err, options);
    }
  }
  async function getTokenByDeviceCode(scopes, deviceCodeCallback, options = {}) {
    state.logger.getToken.info("Attempting to acquire token using device code");
    let msalApp = await getPublicApp(options);
    return withSilentAuthentication(msalApp, scopes, options, () => {
      var _a;
      var _b;
      let requestOptions = {
        scopes,
        cancel:
          (_b =
            (_a = options === null || options === undefined ? undefined : options.abortSignal) === null ||
            _a === undefined
              ? undefined
              : _a.aborted) !== null && _b !== undefined
            ? _b
            : false,
        deviceCodeCallback,
        authority: calculateRequestAuthority(options),
        claims: options === null || options === undefined ? undefined : options.claims,
      };
      let deviceCodeRequest = msalApp.acquireTokenByDeviceCode(requestOptions);
      if (options.abortSignal)
        options.abortSignal.addEventListener("abort", () => {
          requestOptions.cancel = true;
        });
      return deviceCodeRequest;
    });
  }
  async function getTokenByUsernamePassword(scopes, username, password, options = {}) {
    state.logger.getToken.info("Attempting to acquire token using username and password");
    let msalApp = await getPublicApp(options);
    return withSilentAuthentication(msalApp, scopes, options, () => {
      let requestOptions = {
        scopes,
        username,
        password,
        authority: calculateRequestAuthority(options),
        claims: options === null || options === undefined ? undefined : options.claims,
      };
      return msalApp.acquireTokenByUsernamePassword(requestOptions);
    });
  }
  function getActiveAccount() {
    if (!state.cachedAccount) return;
    return msalToPublic(clientId, state.cachedAccount);
  }
  async function getTokenByAuthorizationCode(
    scopes,
    redirectUri,
    authorizationCode,
    clientSecret,
    options = {},
  ) {
    state.logger.getToken.info("Attempting to acquire token using authorization code");
    let msalApp;
    if (clientSecret) {
      state.msalConfig.auth.clientSecret = clientSecret;
      msalApp = await getConfidentialApp(options);
    } else msalApp = await getPublicApp(options);
    return withSilentAuthentication(msalApp, scopes, options, () =>
      msalApp.acquireTokenByCode({
        scopes,
        redirectUri,
        code: authorizationCode,
        authority: calculateRequestAuthority(options),
        claims: options === null || options === undefined ? undefined : options.claims,
      }),
    );
  }
  async function getTokenOnBehalfOf(scopes, userAssertionToken, clientCredentials, options = {}) {
    var _a;
    msalLogger.getToken.info("Attempting to acquire token on behalf of another user");
    if (typeof clientCredentials === "string") {
      msalLogger.getToken.info("Using client secret for on behalf of flow");
      state.msalConfig.auth.clientSecret = clientCredentials;
    } else if (typeof clientCredentials === "function") {
      msalLogger.getToken.info("Using client assertion callback for on behalf of flow");
      state.msalConfig.auth.clientAssertion = clientCredentials;
    } else {
      msalLogger.getToken.info("Using client certificate for on behalf of flow");
      state.msalConfig.auth.clientCertificate = clientCredentials;
    }
    let msalApp = await getConfidentialApp(options);
    try {
      let response = await msalApp.acquireTokenOnBehalfOf({
        scopes,
        authority: calculateRequestAuthority(options),
        claims: options.claims,
        oboAssertion: userAssertionToken,
      });
      ensureValidMsalToken(scopes, response, options);
      msalLogger.getToken.info(formatSuccess(scopes));
      return {
        token: response.accessToken,
        expiresOnTimestamp: response.expiresOn.getTime(),
        refreshAfterTimestamp:
          (_a = response.refreshOn) === null || _a === undefined ? undefined : _a.getTime(),
        tokenType: response.tokenType,
      };
    } catch (err) {
      throw handleMsalError(scopes, err, options);
    }
  }
  async function getTokenByInteractiveRequest(scopes, options = {}) {
    msalLogger.getToken.info("Attempting to acquire token interactively");
    let app = await getPublicApp(options);
    async function getBrokeredToken(useDefaultBrokerAccount) {
      var _a;
      msalLogger.verbose("Authentication will resume through the broker");
      let interactiveRequest = createBaseInteractiveRequest();
      if (state.pluginConfiguration.broker.parentWindowHandle)
        interactiveRequest.windowHandle = Buffer.from(state.pluginConfiguration.broker.parentWindowHandle);
      else
        msalLogger.warning(
          "Parent window handle is not specified for the broker. This may cause unexpected behavior. Please provide the parentWindowHandle.",
        );
      if (state.pluginConfiguration.broker.enableMsaPassthrough)
        ((_a = interactiveRequest.tokenQueryParameters) !== null && _a !== undefined
          ? _a
          : (interactiveRequest.tokenQueryParameters = {})
        ).msal_request_type = "consumer_passthrough";
      if (useDefaultBrokerAccount) {
        interactiveRequest.prompt = "none";
        msalLogger.verbose("Attempting broker authentication using the default broker account");
      } else msalLogger.verbose("Attempting broker authentication without the default broker account");
      if (options.proofOfPossessionOptions) {
        interactiveRequest.shrNonce = options.proofOfPossessionOptions.nonce;
        interactiveRequest.authenticationScheme = "pop";
        interactiveRequest.resourceRequestMethod = options.proofOfPossessionOptions.resourceRequestMethod;
        interactiveRequest.resourceRequestUri = options.proofOfPossessionOptions.resourceRequestUrl;
      }
      try {
        return await app.acquireTokenInteractive(interactiveRequest);
      } catch (e) {
        msalLogger.verbose(`Failed to authenticate through the broker: ${e.message}`);
        if (useDefaultBrokerAccount) return getBrokeredToken(false);
        else throw e;
      }
    }
    function createBaseInteractiveRequest() {
      var _a;
      var _b;
      return {
        openBrowser: async (url) => {
          let open = await import("../../../../../../open/default.lazy.js");
          await open.default(url, {
            wait: true,
            newInstance: true,
          });
        },
        scopes,
        authority: calculateRequestAuthority(options),
        claims: options === null || options === undefined ? undefined : options.claims,
        loginHint: options === null || options === undefined ? undefined : options.loginHint,
        errorTemplate:
          (_a =
            options === null || options === undefined ? undefined : options.browserCustomizationOptions) ===
            null || _a === undefined
            ? undefined
            : _a.errorMessage,
        successTemplate:
          (_b =
            options === null || options === undefined ? undefined : options.browserCustomizationOptions) ===
            null || _b === undefined
            ? undefined
            : _b.successMessage,
        prompt: (options === null || options === undefined ? undefined : options.loginHint)
          ? "login"
          : "select_account",
      };
    }
    return withSilentAuthentication(app, scopes, options, async () => {
      var _a;
      let interactiveRequest = createBaseInteractiveRequest();
      if (state.pluginConfiguration.broker.isEnabled)
        return getBrokeredToken(
          (_a = state.pluginConfiguration.broker.useDefaultBrokerAccount) !== null && _a !== undefined
            ? _a
            : false,
        );
      if (options.proofOfPossessionOptions) {
        interactiveRequest.shrNonce = options.proofOfPossessionOptions.nonce;
        interactiveRequest.authenticationScheme = "pop";
        interactiveRequest.resourceRequestMethod = options.proofOfPossessionOptions.resourceRequestMethod;
        interactiveRequest.resourceRequestUri = options.proofOfPossessionOptions.resourceRequestUrl;
      }
      return app.acquireTokenInteractive(interactiveRequest);
    });
  }
  return {
    getActiveAccount,
    getTokenByClientSecret,
    getTokenByClientAssertion,
    getTokenByClientCertificate,
    getTokenByDeviceCode,
    getTokenByUsernamePassword,
    getTokenByAuthorizationCode,
    getTokenOnBehalfOf,
    getTokenByInteractiveRequest,
  };
}
export { createMsalClient };

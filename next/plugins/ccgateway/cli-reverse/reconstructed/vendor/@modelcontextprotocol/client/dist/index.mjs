/**
 * @modelcontextprotocol/client/dist/index.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-1kaj6e83.js (1), chunk-1ny7cxrt.js (1), chunk-n1aavqzh.js (1), chunk-r1g76qsy.js (87)
 * attribution: esm-fingerprint 82, esm-layout 8
 */
import {
  brandedHasInstance,
  stampErrorBrands,
  OAuthError,
  OAuthErrorCode,
  resourceUrlFromServerUrl,
  checkResourceAllowed,
  SdkError,
  SdkErrorCode,
  codecForVersion,
  MODERN_WIRE_REVISION,
  UnsupportedProtocolVersionError,
  modernProtocolVersions,
  isModernProtocolVersion,
  defaultModernVersions,
  legacyProtocolVersions,
  isJSONRPCResultResponse,
  isJSONRPCErrorResponse,
  SdkHttpError,
  isSpecType,
  Protocol,
  resolveInputRequiredDriverConfig,
  isJSONRPCRequest,
  runInputRequiredFlow,
  mergeCapabilities,
  ProtocolError,
  ProtocolErrorCode,
  DEFAULT_REQUEST_TIMEOUT_MSEC,
  scanXMcpHeaderDeclarations,
  buildMcpParamHeaders,
  HEADER_MISMATCH_ERROR_CODE,
  parseSchema,
  createFetchWithInit,
  normalizeHeaders,
  parseJsonRpcMessage,
  encodeMcpParamValue,
  isInitializeMessage,
  isInitializedNotification,
  parseContentType,
} from "./src-D_zzAWoS.mjs";
import {
  OAuthErrorResponseSchema,
  OAuthProtectedResourceMetadataSchema,
  LATEST_PROTOCOL_VERSION,
  OAuthMetadataSchema,
  OpenIdProviderDiscoveryMetadataSchema,
  OAuthTokensSchema,
  OAuthClientInformationFullSchema,
  SERVER_INFO_META_KEY,
  DiscoverResultSchema,
  SUBSCRIPTION_ID_META_KEY,
  ListChangedOptionsBaseSchema,
  PROTOCOL_VERSION_META_KEY,
  TokenExchangeResponseSchema_2,
  TokenExchangeResponseSchema,
} from "../../core/dist/auth-CUe6YdwF.mjs";
import { pkceChallenge } from "../../../pkce-challenge/dist/index.node.js";
import { AjvJsonSchemaValidator } from "./ajvProvider-BIwGVY6G.mjs";
import { EventSource } from "../../../eventsource/dist/index.js";
import { EventSourceParserStream } from "../../../eventsource-parser/dist/stream.esm.js";
import {
  defaultXaaFetch_2,
  TOKEN_EXCHANGE_GRANT_2,
  ID_JAG_TOKEN_TYPE_2,
  ID_TOKEN_TYPE_2,
  redactTokens_2,
  XaaTokenExchangeError_2,
  defaultXaaFetch,
  TOKEN_EXCHANGE_GRANT,
  ID_JAG_TOKEN_TYPE,
  ID_TOKEN_TYPE,
  redactTokens,
  XaaTokenExchangeError,
} from "../../../../src/services/mcp/xaa.js";
import { redactUrlSecrets } from "../../../../src/utils/urlRedaction.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-r1g76qsy.js:256668-256678 esm-layout
var isDevMode = false;
//@ chunk-r1g76qsy.js:256678-258898 esm-fingerprint
var OAuthClientFlowError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var IssuerMismatchError;
var RegistrationRejectedError;
var InsecureTokenEndpointError;
var AuthorizationServerMismatchError;
var InsufficientScopeError;
deferInit("chunk-r1g76qsy.js:256678", () => {
  OAuthClientFlowError = class extends Error {
    static {
      Object.defineProperty(this, "mcpBrand", {
        value: "mcp.OAuthClientFlowError",
      });
    }
    static [Symbol.hasInstance](value) {
      return brandedHasInstance(this, value);
    }
    static isInstance(value) {
      if (typeof this !== "function")
        throw TypeError(
          "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
        );
      return brandedHasInstance(this, value);
    }
    constructor(message) {
      super(message);
      this.name = new.target.name;
      stampErrorBrands(this, new.target);
    }
  };
  IssuerMismatchError = class extends OAuthClientFlowError {
    static {
      Object.defineProperty(this, "mcpBrand", {
        value: "mcp.IssuerMismatchError",
      });
    }
    kind;
    expected;
    received;
    constructor(kind, expected, received) {
      super(
        `Issuer mismatch in ${kind === "metadata" ? "authorization server metadata (RFC 8414 \xA73.3)" : "authorization response (RFC 9207)"}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(received)}`,
      );
      this.kind = kind;
      this.expected = expected;
      this.received = received;
    }
  };
  RegistrationRejectedError = class extends OAuthClientFlowError {
    static {
      Object.defineProperty(this, "mcpBrand", {
        value: "mcp.RegistrationRejectedError",
      });
    }
    status;
    body;
    submittedMetadata;
    constructor(args) {
      super(`Dynamic Client Registration rejected (HTTP ${args.status}): ${args.body}`);
      this.status = args.status;
      this.body = args.body;
      this.submittedMetadata = args.submittedMetadata;
    }
  };
  InsecureTokenEndpointError = class extends OAuthClientFlowError {
    static {
      Object.defineProperty(this, "mcpBrand", {
        value: "mcp.InsecureTokenEndpointError",
      });
    }
    tokenEndpoint;
    constructor(tokenEndpoint) {
      super(
        `Refusing to send credentials to non-https token endpoint '${tokenEndpoint}'. OAuth token requests MUST use TLS (localhost / 127.0.0.1 / ::1 are exempt).`,
      );
      this.tokenEndpoint = tokenEndpoint;
    }
  };
  AuthorizationServerMismatchError = class extends OAuthClientFlowError {
    static {
      Object.defineProperty(this, "mcpBrand", {
        value: "mcp.AuthorizationServerMismatchError",
      });
    }
    constructor(recordedIssuer, currentIssuer) {
      super(
        `Authorization server changed between redirect and callback (redirected to ${JSON.stringify(recordedIssuer)}, callback resolved ${JSON.stringify(currentIssuer)}); refusing to send authorization_code/code_verifier to a different token endpoint`,
      );
      this.recordedIssuer = recordedIssuer;
      this.currentIssuer = currentIssuer;
    }
  };
  InsufficientScopeError = class extends OAuthClientFlowError {
    static {
      Object.defineProperty(this, "mcpBrand", {
        value: "mcp.InsufficientScopeError",
      });
    }
    requiredScope;
    resourceMetadataUrl;
    errorDescription;
    constructor(init) {
      super(`Insufficient scope${init.requiredScope ? `: required "${init.requiredScope}"` : ""}`);
      this.requiredScope = init.requiredScope;
      this.resourceMetadataUrl = init.resourceMetadataUrl;
      this.errorDescription = init.errorDescription;
    }
  };
});
//@ chunk-r1g76qsy.js:258898-259270 esm-fingerprint
function discardIfIssuerMismatch(stored, issuer, opts) {
  if (stored === undefined) return;
  if (stored.issuer === undefined) {
    if (opts?.canPersistStamp !== false)
      console.warn(
        "[mcp-sdk] SEP-2352: stored OAuth credential has no 'issuer' stamp (pre-upgrade storage or provider not round-tripping the value). SEP-2352 isolation is inactive for this read; ensure your provider round-trips the issuer field.",
      );
    return stored;
  }
  return issuersMatch(stored.issuer, issuer) ? stored : undefined;
}
//@ chunk-r1g76qsy.js:259270-259372 esm-fingerprint
function issuersMatch(a, b) {
  return a === b || (a.endsWith("/") && a.slice(0, -1) === b) || (b.endsWith("/") && b.slice(0, -1) === a);
}
//@ chunk-r1g76qsy.js:259372-259492 esm-fingerprint
function isOAuthClientProvider(provider) {
  if (provider == null) return false;
  let p = provider;
  return typeof p.tokens === "function" && typeof p.clientInformation === "function";
}
//@ chunk-r1g76qsy.js:259492-259689 esm-fingerprint
async function handleOAuthUnauthorized(provider, ctx, extraAuthOptions) {
  let { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(ctx.response);
  if (
    (await auth(provider, {
      serverUrl: ctx.serverUrl,
      resourceMetadataUrl,
      scope,
      fetchFn: ctx.fetchFn,
      ...extraAuthOptions,
    })) !== "AUTHORIZED"
  )
    throw new UnauthorizedError();
}
//@ chunk-r1g76qsy.js:259689-259797 esm-fingerprint
function adaptOAuthProvider(provider, extraAuthOptions) {
  return {
    token: async () => (await provider.tokens())?.access_token,
    onUnauthorized: async (ctx) => handleOAuthUnauthorized(provider, ctx, extraAuthOptions),
  };
}
//@ chunk-r1g76qsy.js:259797-260252 esm-fingerprint
var UnauthorizedError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r1g76qsy.js:259797", () => {
  UnauthorizedError = class extends Error {
    static {
      Object.defineProperty(this, "mcpBrand", {
        value: "mcp.UnauthorizedError",
      });
    }
    static [Symbol.hasInstance](value) {
      return brandedHasInstance(this, value);
    }
    static isInstance(value) {
      if (typeof this !== "function")
        throw TypeError(
          "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
        );
      return brandedHasInstance(this, value);
    }
    constructor(message) {
      super(message ?? "Unauthorized");
      this.name = "UnauthorizedError";
      stampErrorBrands(this, new.target);
    }
  };
});
//@ chunk-r1g76qsy.js:260252-260329 esm-fingerprint
function isIssParameterSupported(metadata) {
  return metadata?.authorization_response_iss_parameter_supported === true;
}
//@ chunk-r1g76qsy.js:260329-260541 esm-fingerprint
function validateAuthorizationResponseIssuer({ iss, expectedIssuer, issParameterSupported }) {
  if (expectedIssuer === undefined) return;
  if (iss === undefined) {
    if (issParameterSupported)
      throw new IssuerMismatchError("authorization_response", expectedIssuer, undefined);
    return;
  }
  if (iss !== expectedIssuer) throw new IssuerMismatchError("authorization_response", expectedIssuer, iss);
}
//@ chunk-r1g76qsy.js:260541-260686 esm-fingerprint
function computeScopeUnion(...scopes) {
  let seen = new Set();
  for (let scope of scopes) {
    if (!scope) continue;
    for (let token of scope.split(/\s+/)) if (token) seen.add(token);
  }
  return seen.size > 0 ? [...seen].join(" ") : undefined;
}
//@ chunk-r1g76qsy.js:260686-260832 esm-fingerprint
function isStrictScopeSuperset(union, current) {
  if (!union) return false;
  let currentSet = new Set((current ?? "").split(/\s+/).filter(Boolean));
  for (let token of union.split(/\s+/)) if (token && !currentSet.has(token)) return true;
  return false;
}
//@ chunk-r1g76qsy.js:260832-261464 esm-fingerprint
async function resolveAuthorizationCallbackParams(codeOrParams, iss, provider, serverUrl, opts) {
  if (typeof codeOrParams === "string")
    return {
      authorizationCode: codeOrParams,
      iss,
    };
  let issParam = codeOrParams.get("iss") ?? undefined;
  let code = codeOrParams.get("code");
  if (code)
    return {
      authorizationCode: code,
      iss: issParam,
    };
  let metadata = (await provider.discoveryState?.())?.authorizationServerMetadata;
  if (!metadata)
    try {
      metadata = (await discoverOAuthServerInfo(serverUrl, opts)).authorizationServerMetadata;
    } catch {
      metadata = undefined;
    }
  if (!metadata)
    throw new UnauthorizedError("Authorization callback failed and the issuer could not be verified");
  validateAuthorizationResponseIssuer({
    iss: issParam,
    expectedIssuer: metadata.issuer,
    issParameterSupported: isIssParameterSupported(metadata),
  });
  let error = codeOrParams.get("error");
  if (error)
    throw new OAuthError(
      error,
      codeOrParams.get("error_description") ?? error,
      codeOrParams.get("error_uri") ?? undefined,
    );
  throw new UnauthorizedError("Authorization callback contained neither `code` nor `error`");
}
//@ chunk-r1g76qsy.js:261464-261549 esm-fingerprint
function isClientAuthMethod(method) {
  return ["client_secret_basic", "client_secret_post", "none"].includes(method);
}
//@ chunk-r1g76qsy.js:261549-261573 esm-fingerprint
var AUTHORIZATION_CODE_RESPONSE_TYPE = "code";
var AUTHORIZATION_CODE_CHALLENGE_METHOD = "S256";
//@ chunk-r1g76qsy.js:261573-262075 esm-fingerprint
function selectClientAuthMethod(clientInformation, supportedMethods) {
  let hasClientSecret = clientInformation.client_secret !== undefined;
  if (
    "token_endpoint_auth_method" in clientInformation &&
    clientInformation.token_endpoint_auth_method &&
    isClientAuthMethod(clientInformation.token_endpoint_auth_method) &&
    (supportedMethods.length === 0 || supportedMethods.includes(clientInformation.token_endpoint_auth_method))
  )
    return clientInformation.token_endpoint_auth_method;
  if (supportedMethods.length === 0) return hasClientSecret ? "client_secret_basic" : "none";
  if (hasClientSecret && supportedMethods.includes("client_secret_basic")) return "client_secret_basic";
  if (hasClientSecret && supportedMethods.includes("client_secret_post")) return "client_secret_post";
  if (supportedMethods.includes("none")) return "none";
  return hasClientSecret ? "client_secret_post" : "none";
}
//@ chunk-r1g76qsy.js:262075-262323 esm-fingerprint
function applyClientAuthentication(method, clientInformation, headers, params) {
  let { client_id, client_secret } = clientInformation;
  switch (method) {
    case "client_secret_basic":
      applyBasicAuth(client_id, client_secret, headers);
      return;
    case "client_secret_post":
      applyPostAuth(client_id, client_secret, params);
      return;
    case "none":
      applyPublicAuth(client_id, params);
      return;
    default:
      throw Error(`Unsupported client authentication method: ${method}`);
  }
}
//@ chunk-r1g76qsy.js:262323-262483 esm-fingerprint
function applyBasicAuth(clientId, clientSecret, headers) {
  if (!clientSecret) throw Error("client_secret_basic authentication requires a client_secret");
  let credentials = btoa(`${clientId}:${clientSecret}`);
  headers.set("Authorization", `Basic ${credentials}`);
}
//@ chunk-r1g76qsy.js:262483-262553 esm-fingerprint
function applyPostAuth(clientId, clientSecret, params) {
  params.set("client_id", clientId);
  if (clientSecret) params.set("client_secret", clientSecret);
}
//@ chunk-r1g76qsy.js:262553-262591 esm-fingerprint
function applyPublicAuth(clientId, params) {
  params.set("client_id", clientId);
}
//@ chunk-r1g76qsy.js:262591-262670 esm-fingerprint
function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}
//@ chunk-r1g76qsy.js:262670-262782 esm-fingerprint
function assertSecureTokenEndpoint(tokenEndpoint) {
  let url = new URL(String(tokenEndpoint));
  if (url.protocol !== "https:" && !isLoopbackHost(url.hostname))
    throw new InsecureTokenEndpointError(url.href);
  return url;
}
//@ chunk-r1g76qsy.js:262782-262962 esm-fingerprint
function deriveApplicationType(redirectUris) {
  for (let raw of redirectUris ?? []) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return "native";
    if (isLoopbackHost(url.hostname)) return "native";
  }
  return "web";
}
//@ chunk-r1g76qsy.js:262962-263168 esm-fingerprint
function resolveClientMetadata(provider) {
  let clientMetadata = provider.clientMetadata;
  return {
    ...clientMetadata,
    grant_types:
      clientMetadata.grant_types ??
      (provider.redirectUrl === undefined ? undefined : ["authorization_code", "refresh_token"]),
    application_type: clientMetadata.application_type ?? deriveApplicationType(clientMetadata.redirect_uris),
  };
}
//@ chunk-r1g76qsy.js:263168-263458 esm-fingerprint
async function parseErrorResponse(input) {
  let statusCode = input instanceof Response ? input.status : undefined;
  let body = input instanceof Response ? await input.text() : input;
  try {
    let result = OAuthErrorResponseSchema.parse(JSON.parse(body));
    return OAuthError.fromResponse(result);
  } catch (error) {
    let errorMessage = `${statusCode ? `HTTP ${statusCode}: ` : ""}Invalid OAuth error response: ${error}. Raw body: ${body}`;
    return new OAuthError(OAuthErrorCode.ServerError, errorMessage);
  }
}
//@ chunk-r1g76qsy.js:263458-263810 esm-fingerprint
async function auth(provider, options) {
  try {
    return await authInternal(provider, options);
  } catch (error) {
    if (error instanceof OAuthError) {
      if (error.code === OAuthErrorCode.InvalidClient || error.code === OAuthErrorCode.UnauthorizedClient) {
        await provider.invalidateCredentials?.("client");
        await provider.invalidateCredentials?.("tokens");
        return await authInternal(provider, options);
      } else if (error.code === OAuthErrorCode.InvalidGrant) {
        await provider.invalidateCredentials?.("tokens");
        return await authInternal(provider, options);
      }
    }
    throw error;
  }
}
//@ chunk-r1g76qsy.js:263810-264122 esm-fingerprint
function determineScope(options) {
  let { requestedScope, resourceMetadata, authServerMetadata, clientMetadata } = options;
  let effectiveScope =
    requestedScope || resourceMetadata?.scopes_supported?.join(" ") || clientMetadata.scope;
  if (
    effectiveScope &&
    authServerMetadata?.scopes_supported?.includes("offline_access") &&
    !effectiveScope.split(" ").includes("offline_access") &&
    clientMetadata.grant_types?.includes("refresh_token")
  )
    effectiveScope = `${effectiveScope} offline_access`;
  return effectiveScope;
}
//@ chunk-r1g76qsy.js:264122-267876 esm-fingerprint
async function authInternal(
  provider,
  {
    serverUrl,
    authorizationCode,
    iss,
    scope,
    resourceMetadataUrl,
    fetchFn,
    skipIssuerMetadataValidation,
    forceReauthorization,
  },
) {
  let clientMetadata = resolveClientMetadata(provider);
  let cachedState = await provider.discoveryState?.();
  let resourceMetadata;
  let authorizationServerUrl;
  let metadata;
  let freshDiscoveryState;
  let effectiveResourceMetadataUrl = resourceMetadataUrl;
  if (!effectiveResourceMetadataUrl && cachedState?.resourceMetadataUrl)
    effectiveResourceMetadataUrl = new URL(cachedState.resourceMetadataUrl);
  if (cachedState?.authorizationServerUrl) {
    authorizationServerUrl = cachedState.authorizationServerUrl;
    resourceMetadata = cachedState.resourceMetadata;
    metadata =
      cachedState.authorizationServerMetadata ??
      (await discoverAuthorizationServerMetadata(authorizationServerUrl, {
        fetchFn,
        skipIssuerValidation: skipIssuerMetadataValidation,
      }));
    if (!resourceMetadata)
      try {
        resourceMetadata = await discoverOAuthProtectedResourceMetadata(
          serverUrl,
          {
            resourceMetadataUrl: effectiveResourceMetadataUrl,
          },
          fetchFn,
        );
      } catch (error) {
        if (error instanceof TypeError) throw error;
      }
    if (
      metadata !== cachedState.authorizationServerMetadata ||
      resourceMetadata !== cachedState.resourceMetadata
    )
      await provider.saveDiscoveryState?.({
        authorizationServerUrl: String(authorizationServerUrl),
        resourceMetadataUrl: effectiveResourceMetadataUrl?.toString(),
        resourceMetadata,
        authorizationServerMetadata: metadata,
      });
  } else {
    let serverInfo = await discoverOAuthServerInfo(serverUrl, {
      resourceMetadataUrl: effectiveResourceMetadataUrl,
      fetchFn,
      skipIssuerMetadataValidation,
    });
    authorizationServerUrl = serverInfo.authorizationServerUrl;
    metadata = serverInfo.authorizationServerMetadata;
    resourceMetadata = serverInfo.resourceMetadata;
    freshDiscoveryState = {
      authorizationServerUrl: String(authorizationServerUrl),
      resourceMetadataUrl: effectiveResourceMetadataUrl?.toString(),
      resourceMetadata,
      authorizationServerMetadata: metadata,
    };
  }
  let issuer = metadata?.issuer ?? String(authorizationServerUrl);
  let infoCtx = {
    issuer,
  };
  await provider.saveAuthorizationServerUrl?.(issuer);
  if (authorizationCode !== undefined) {
    let recordedIssuer =
      cachedState?.authorizationServerMetadata?.issuer ?? cachedState?.authorizationServerUrl;
    if (recordedIssuer === undefined) {
      if (provider.saveDiscoveryState !== undefined)
        throw new AuthorizationServerMismatchError(
          "discoveryState was not available on the callback leg; ensure your provider persists discoveryState alongside codeVerifier",
          issuer,
        );
      console.warn(
        "[mcp-sdk] OAuthClientProvider does not implement saveDiscoveryState()/discoveryState(); the SEP-2352 callback-leg authorization-server binding cannot be checked. Implement discoveryState (persist alongside codeVerifier) \u2014 see docs/migration/upgrade-to-v2.md \xA7SEP-2352.",
      );
    } else if (!issuersMatch(recordedIssuer, issuer))
      throw new AuthorizationServerMismatchError(recordedIssuer, issuer);
  }
  if (freshDiscoveryState) await provider.saveDiscoveryState?.(freshDiscoveryState);
  let resource = await selectResourceURL(serverUrl, provider, resourceMetadata);
  if (resource) await provider.saveResourceUrl?.(String(resource));
  let resolvedScope = determineScope({
    requestedScope: scope,
    resourceMetadata,
    authServerMetadata: metadata,
    clientMetadata: provider.clientMetadata,
  });
  let rawClientInfo = await Promise.resolve(provider.clientInformation(infoCtx));
  let clientInformation = discardIfIssuerMismatch(rawClientInfo, issuer, {
    canPersistStamp: provider.saveClientInformation !== undefined,
  });
  if (
    clientInformation === undefined &&
    rawClientInfo?.issuer &&
    provider.saveClientInformation === undefined
  )
    throw new AuthorizationServerMismatchError(rawClientInfo.issuer, issuer);
  if (clientInformation && clientInformation.issuer === undefined) {
    clientInformation = {
      ...clientInformation,
      issuer,
    };
    await provider.saveClientInformation?.(clientInformation, infoCtx);
  }
  if (!clientInformation) {
    if (authorizationCode !== undefined)
      throw Error("Existing OAuth client information is required when exchanging an authorization code");
    let supportsUrlBasedClientId = metadata?.client_id_metadata_document_supported === true;
    let clientMetadataUrl = provider.clientMetadataUrl;
    if (clientMetadataUrl && !isHttpsUrl(clientMetadataUrl))
      throw new OAuthError(
        OAuthErrorCode.InvalidClientMetadata,
        `clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${clientMetadataUrl}`,
      );
    if (supportsUrlBasedClientId && clientMetadataUrl) {
      clientInformation = {
        client_id: clientMetadataUrl,
        issuer,
      };
      await provider.saveClientInformation?.(clientInformation, infoCtx);
    } else {
      if (!provider.saveClientInformation)
        throw Error("OAuth client information must be saveable for dynamic registration");
      clientInformation = {
        ...(await registerClient(authorizationServerUrl, {
          metadata,
          clientMetadata,
          scope: resolvedScope,
          fetchFn,
        })),
        issuer,
      };
      await provider.saveClientInformation(clientInformation, infoCtx);
    }
  }
  let nonInteractiveFlow = !provider.redirectUrl;
  if (authorizationCode !== undefined || nonInteractiveFlow) {
    if (authorizationCode !== undefined)
      validateAuthorizationResponseIssuer({
        iss,
        expectedIssuer: metadata?.issuer,
        issParameterSupported: isIssParameterSupported(metadata),
      });
    let tokens$1 = await fetchToken(provider, authorizationServerUrl, {
      metadata,
      resource,
      authorizationCode,
      iss,
      scope: resolvedScope,
      fetchFn,
    });
    await provider.saveTokens(
      {
        ...tokens$1,
        issuer,
      },
      infoCtx,
    );
    return "AUTHORIZED";
  }
  let tokens = discardIfIssuerMismatch(await provider.tokens(infoCtx), issuer);
  if (tokens && tokens.issuer === undefined) {
    tokens = {
      ...tokens,
      issuer,
    };
    await provider.saveTokens(tokens, infoCtx);
  }
  if (tokens?.refresh_token && !forceReauthorization)
    try {
      let newTokens = await refreshAuthorization(authorizationServerUrl, {
        metadata,
        clientInformation,
        refreshToken: tokens.refresh_token,
        resource,
        addClientAuthentication: provider.addClientAuthentication,
        fetchFn,
      });
      await provider.saveTokens(
        {
          ...newTokens,
          issuer,
        },
        infoCtx,
      );
      return "AUTHORIZED";
    } catch (error) {
      if (error instanceof InsecureTokenEndpointError) throw error;
      if (!(error instanceof OAuthError) || error.code === OAuthErrorCode.ServerError);
      else throw error;
    }
  let state = provider.state ? await provider.state() : undefined;
  let { authorizationUrl, codeVerifier } = await startAuthorization(authorizationServerUrl, {
    metadata,
    clientInformation,
    state,
    redirectUrl: provider.redirectUrl,
    scope: resolvedScope,
    resource,
  });
  await provider.saveCodeVerifier(codeVerifier);
  await provider.redirectToAuthorization(authorizationUrl);
  return "REDIRECT";
}
//@ chunk-r1g76qsy.js:267876-267990 esm-fingerprint
function isHttpsUrl(value) {
  if (!value) return false;
  try {
    let url = new URL(value);
    return url.protocol === "https:" && url.pathname !== "/";
  } catch {
    return false;
  }
}
//@ chunk-r1g76qsy.js:267990-268291 esm-fingerprint
async function selectResourceURL(serverUrl, provider, resourceMetadata) {
  let defaultResource = resourceUrlFromServerUrl(serverUrl);
  if (provider.validateResourceURL)
    return await provider.validateResourceURL(defaultResource, resourceMetadata?.resource);
  if (!resourceMetadata) return;
  if (
    !checkResourceAllowed({
      requestedResource: defaultResource,
      configuredResource: resourceMetadata.resource,
    })
  )
    throw Error(
      `Protected resource ${resourceMetadata.resource} does not match expected ${defaultResource} (or origin)`,
    );
  return new URL(resourceMetadata.resource);
}
//@ chunk-r1g76qsy.js:268291-268652 esm-fingerprint
function extractWWWAuthenticateParams(res) {
  let authenticateHeader = res.headers.get("WWW-Authenticate");
  if (!authenticateHeader) return {};
  let [type, scheme] = authenticateHeader.split(" ");
  if (type?.toLowerCase() !== "bearer" || !scheme) return {};
  let resourceMetadataMatch = extractFieldFromWwwAuth(res, "resource_metadata") || undefined;
  let resourceMetadataUrl;
  if (resourceMetadataMatch)
    try {
      resourceMetadataUrl = new URL(resourceMetadataMatch);
    } catch {}
  let scope = extractFieldFromWwwAuth(res, "scope") || undefined;
  let error = extractFieldFromWwwAuth(res, "error") || undefined;
  let errorDescription = extractFieldFromWwwAuth(res, "error_description") || undefined;
  return {
    resourceMetadataUrl,
    scope,
    error,
    errorDescription,
  };
}
//@ chunk-r1g76qsy.js:268652-268848 esm-fingerprint
function extractFieldFromWwwAuth(response, fieldName) {
  let wwwAuthHeader = response.headers.get("WWW-Authenticate");
  if (!wwwAuthHeader) return null;
  let pattern = new RegExp(String.raw`${fieldName}=(?:"([^"]+)"|([^\s,]+))`);
  let match = wwwAuthHeader.match(pattern);
  if (match) {
    let result = match[1] || match[2];
    if (result) return result;
  }
  return null;
}
//@ chunk-r1g76qsy.js:268848-269307 esm-fingerprint
async function discoverOAuthProtectedResourceMetadata(serverUrl, opts, fetchFn = fetch) {
  let response = await discoverMetadataWithFallback(serverUrl, "oauth-protected-resource", fetchFn, {
    protocolVersion: opts?.protocolVersion,
    metadataUrl: opts?.resourceMetadataUrl,
  });
  if (!response || response.status === 404) {
    await response?.text?.().catch(() => {});
    throw Error("Resource server does not implement OAuth 2.0 Protected Resource Metadata.");
  }
  if (!response.ok) {
    await response.text?.().catch(() => {});
    throw Error(`HTTP ${response.status} trying to load well-known OAuth protected resource metadata.`);
  }
  return OAuthProtectedResourceMetadataSchema.parse(await response.json());
}
//@ chunk-r1g76qsy.js:269307-269514 esm-layout
async function fetchWithCorsRetry(url, headers, fetchFn = fetch) {
  try {
    return await fetchFn(url, {
      headers,
    });
  } catch (error) {
    if (!(error instanceof TypeError) || !isDevMode) throw error;
    if (headers)
      try {
        return await fetchFn(url, {});
      } catch (retryError) {
        if (!(retryError instanceof TypeError)) throw retryError;
        return;
      }
    return;
  }
}
//@ chunk-r1g76qsy.js:269514-269647 esm-fingerprint
function buildWellKnownPath(wellKnownPrefix, pathname = "", options = {}) {
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return options.prependPathname
    ? `${pathname}/.well-known/${wellKnownPrefix}`
    : `/.well-known/${wellKnownPrefix}${pathname}`;
}
//@ chunk-r1g76qsy.js:269647-269726 esm-fingerprint
async function tryMetadataDiscovery(url, protocolVersion, fetchFn = fetch) {
  return await fetchWithCorsRetry(
    url,
    {
      "MCP-Protocol-Version": protocolVersion,
    },
    fetchFn,
  );
}
//@ chunk-r1g76qsy.js:269726-269829 esm-layout
function shouldAttemptFallback(response, pathname) {
  if (!response) return true;
  if (pathname === "/") return false;
  return (response.status >= 400 && response.status < 500) || response.status === 502;
}
//@ chunk-r1g76qsy.js:269829-270141 esm-fingerprint
async function discoverMetadataWithFallback(serverUrl, wellKnownType, fetchFn, opts) {
  let issuer = new URL(serverUrl);
  let protocolVersion = opts?.protocolVersion ?? LATEST_PROTOCOL_VERSION;
  let url;
  if (opts?.metadataUrl) url = new URL(opts.metadataUrl);
  else {
    let wellKnownPath = buildWellKnownPath(wellKnownType, issuer.pathname);
    url = new URL(wellKnownPath, opts?.metadataServerUrl ?? issuer);
    url.search = issuer.search;
  }
  let response = await tryMetadataDiscovery(url, protocolVersion, fetchFn);
  if (!opts?.metadataUrl && shouldAttemptFallback(response, issuer.pathname))
    response = await tryMetadataDiscovery(
      new URL(`/.well-known/${wellKnownType}`, issuer),
      protocolVersion,
      fetchFn,
    );
  return response;
}
//@ chunk-r1g76qsy.js:270141-270697 esm-fingerprint
function buildDiscoveryUrls(authorizationServerUrl) {
  let url =
    typeof authorizationServerUrl === "string" ? new URL(authorizationServerUrl) : authorizationServerUrl;
  let hasPath = url.pathname !== "/";
  let urlsToTry = [];
  if (!hasPath) {
    urlsToTry.push(
      {
        url: new URL("/.well-known/oauth-authorization-server", url.origin),
        type: "oauth",
      },
      {
        url: new URL("/.well-known/openid-configuration", url.origin),
        type: "oidc",
      },
    );
    return urlsToTry;
  }
  let pathname = url.pathname;
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  urlsToTry.push(
    {
      url: new URL(`/.well-known/oauth-authorization-server${pathname}`, url.origin),
      type: "oauth",
    },
    {
      url: new URL(`/.well-known/openid-configuration${pathname}`, url.origin),
      type: "oidc",
    },
    {
      url: new URL(`${pathname}/.well-known/openid-configuration`, url.origin),
      type: "oidc",
    },
  );
  return urlsToTry;
}
//@ chunk-r1g76qsy.js:270697-271343 esm-fingerprint
async function discoverAuthorizationServerMetadata(
  authorizationServerUrl,
  { fetchFn = fetch, protocolVersion = LATEST_PROTOCOL_VERSION, skipIssuerValidation = false } = {},
) {
  let headers = {
    "MCP-Protocol-Version": protocolVersion,
    Accept: "application/json",
  };
  let urlsToTry = buildDiscoveryUrls(authorizationServerUrl);
  for (let { url: endpointUrl, type } of urlsToTry) {
    let response = await fetchWithCorsRetry(endpointUrl, headers, fetchFn);
    if (!response) continue;
    if (!response.ok) {
      await response.text?.().catch(() => {});
      if ((response.status >= 400 && response.status < 500) || response.status === 502) continue;
      throw Error(
        `HTTP ${response.status} trying to load ${type === "oauth" ? "OAuth" : "OpenID provider"} metadata from ${endpointUrl}`,
      );
    }
    let parsed =
      type === "oauth"
        ? OAuthMetadataSchema.parse(await response.json())
        : OpenIdProviderDiscoveryMetadataSchema.parse(await response.json());
    if (!skipIssuerValidation) {
      let expectedIssuer =
        typeof authorizationServerUrl === "string" ? authorizationServerUrl : authorizationServerUrl.href;
      if (!(
        parsed.issuer === expectedIssuer ||
        (expectedIssuer.endsWith("/") && parsed.issuer === expectedIssuer.slice(0, -1))
      ))
        throw new IssuerMismatchError("metadata", expectedIssuer, parsed.issuer);
    }
    return parsed;
  }
}
//@ chunk-r1g76qsy.js:271343-271789 esm-fingerprint
async function discoverOAuthServerInfo(serverUrl, opts) {
  let resourceMetadata;
  let authorizationServerUrl;
  try {
    resourceMetadata = await discoverOAuthProtectedResourceMetadata(
      serverUrl,
      {
        resourceMetadataUrl: opts?.resourceMetadataUrl,
      },
      opts?.fetchFn,
    );
    if (resourceMetadata.authorization_servers && resourceMetadata.authorization_servers.length > 0)
      authorizationServerUrl = resourceMetadata.authorization_servers[0];
  } catch (error) {
    if (error instanceof TypeError) throw error;
  }
  if (!authorizationServerUrl) authorizationServerUrl = String(new URL("/", serverUrl));
  let authorizationServerMetadata = await discoverAuthorizationServerMetadata(authorizationServerUrl, {
    fetchFn: opts?.fetchFn,
    skipIssuerValidation: opts?.skipIssuerMetadataValidation,
  });
  return {
    authorizationServerUrl,
    authorizationServerMetadata,
    resourceMetadata,
  };
}
//@ chunk-r1g76qsy.js:271789-272770 esm-fingerprint
async function startAuthorization(
  authorizationServerUrl,
  { metadata, clientInformation, redirectUrl, scope, state, resource },
) {
  let authorizationUrl;
  if (metadata) {
    authorizationUrl = new URL(metadata.authorization_endpoint);
    if (!metadata.response_types_supported.includes(AUTHORIZATION_CODE_RESPONSE_TYPE))
      throw Error(
        `Incompatible auth server: does not support response type ${AUTHORIZATION_CODE_RESPONSE_TYPE}`,
      );
    if (
      metadata.code_challenge_methods_supported &&
      !metadata.code_challenge_methods_supported.includes(AUTHORIZATION_CODE_CHALLENGE_METHOD)
    )
      throw Error(
        `Incompatible auth server: does not support code challenge method ${AUTHORIZATION_CODE_CHALLENGE_METHOD}`,
      );
  } else authorizationUrl = new URL("/authorize", authorizationServerUrl);
  let pkce = await pkceChallenge();
  let { code_verifier: codeVerifier, code_challenge: codeChallenge } = pkce;
  authorizationUrl.searchParams.set("response_type", AUTHORIZATION_CODE_RESPONSE_TYPE);
  authorizationUrl.searchParams.set("client_id", clientInformation.client_id);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", AUTHORIZATION_CODE_CHALLENGE_METHOD);
  authorizationUrl.searchParams.set("redirect_uri", String(redirectUrl));
  if (state) authorizationUrl.searchParams.set("state", state);
  if (scope) authorizationUrl.searchParams.set("scope", scope);
  if (scope?.split(" ").includes("offline_access")) authorizationUrl.searchParams.append("prompt", "consent");
  if (resource) authorizationUrl.searchParams.set("resource", resource.href);
  return {
    authorizationUrl,
    codeVerifier,
  };
}
//@ chunk-r1g76qsy.js:272770-272897 esm-fingerprint
function prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, redirectUri) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    code_verifier: codeVerifier,
    redirect_uri: String(redirectUri),
  });
}
//@ chunk-r1g76qsy.js:272897-273513 esm-fingerprint
async function executeTokenRequest(
  authorizationServerUrl,
  { metadata, tokenRequestParams, clientInformation, addClientAuthentication, resource, fetchFn },
) {
  let tokenUrl = assertSecureTokenEndpoint(
    metadata?.token_endpoint ?? new URL("/token", authorizationServerUrl),
  );
  let headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  });
  if (resource) tokenRequestParams.set("resource", resource.href);
  if (addClientAuthentication) await addClientAuthentication(headers, tokenRequestParams, tokenUrl, metadata);
  else if (clientInformation)
    applyClientAuthentication(
      selectClientAuthMethod(clientInformation, metadata?.token_endpoint_auth_methods_supported ?? []),
      clientInformation,
      headers,
      tokenRequestParams,
    );
  let response = await (fetchFn ?? fetch)(tokenUrl, {
    method: "POST",
    headers,
    body: tokenRequestParams,
  });
  if (!response.ok) throw await parseErrorResponse(response);
  let json = await response.json();
  try {
    return OAuthTokensSchema.parse(json);
  } catch (parseError) {
    if (typeof json === "object" && json !== null && "error" in json)
      throw await parseErrorResponse(JSON.stringify(json));
    throw parseError;
  }
}
//@ chunk-r1g76qsy.js:273513-273857 esm-fingerprint
async function exchangeAuthorization(
  authorizationServerUrl,
  {
    metadata,
    clientInformation,
    authorizationCode,
    iss,
    codeVerifier,
    redirectUri,
    resource,
    addClientAuthentication,
    fetchFn,
  },
) {
  validateAuthorizationResponseIssuer({
    iss,
    expectedIssuer: metadata?.issuer,
    issParameterSupported: isIssParameterSupported(metadata),
  });
  return executeTokenRequest(authorizationServerUrl, {
    metadata,
    tokenRequestParams: prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, redirectUri),
    clientInformation,
    addClientAuthentication,
    resource,
    fetchFn,
  });
}
//@ chunk-r1g76qsy.js:273857-274178 esm-fingerprint
async function refreshAuthorization(
  authorizationServerUrl,
  { metadata, clientInformation, refreshToken, resource, addClientAuthentication, fetchFn },
) {
  return {
    refresh_token: refreshToken,
    ...(await executeTokenRequest(authorizationServerUrl, {
      metadata,
      tokenRequestParams: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      clientInformation,
      addClientAuthentication,
      resource,
      fetchFn,
    })),
  };
}
//@ chunk-r1g76qsy.js:274178-274881 esm-fingerprint
async function fetchToken(
  provider,
  authorizationServerUrl,
  { metadata, resource, authorizationCode, iss, scope, fetchFn } = {},
) {
  if (authorizationCode !== undefined)
    validateAuthorizationResponseIssuer({
      iss,
      expectedIssuer: metadata?.issuer,
      issParameterSupported: isIssParameterSupported(metadata),
    });
  let effectiveScope = scope ?? provider.clientMetadata.scope;
  let tokenRequestParams;
  if (provider.prepareTokenRequest) tokenRequestParams = await provider.prepareTokenRequest(effectiveScope);
  if (!tokenRequestParams) {
    if (!authorizationCode)
      throw Error("Either provider.prepareTokenRequest() or authorizationCode is required");
    if (!provider.redirectUrl) throw Error("redirectUrl is required for authorization_code flow");
    tokenRequestParams = prepareAuthorizationCodeRequest(
      authorizationCode,
      await provider.codeVerifier(),
      provider.redirectUrl,
    );
  }
  let clientInformation = await provider.clientInformation({
    issuer: metadata?.issuer ?? String(authorizationServerUrl),
  });
  return executeTokenRequest(authorizationServerUrl, {
    metadata,
    tokenRequestParams,
    clientInformation: clientInformation ?? undefined,
    addClientAuthentication: provider.addClientAuthentication,
    resource,
    fetchFn,
  });
}
//@ chunk-r1g76qsy.js:274881-275399 esm-fingerprint
async function registerClient(authorizationServerUrl, { metadata, clientMetadata, scope, fetchFn }) {
  let registrationUrl;
  if (metadata) {
    if (!metadata.registration_endpoint)
      throw Error("Incompatible auth server: does not support dynamic client registration");
    registrationUrl = new URL(metadata.registration_endpoint);
  } else registrationUrl = new URL("/register", authorizationServerUrl);
  let submittedMetadata = {
    ...clientMetadata,
    ...(scope === undefined
      ? {}
      : {
          scope,
        }),
  };
  let response = await (fetchFn ?? fetch)(registrationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(submittedMetadata),
  });
  if (!response.ok)
    throw new RegistrationRejectedError({
      status: response.status,
      body: await response.text(),
      submittedMetadata,
    });
  return OAuthClientInformationFullSchema.parse(await response.json());
}
//@ chunk-r1g76qsy.js:275399-276316 esm-fingerprint
/**
 * McpResponseCache：MCP SDK 响应缓存，键为 method\0JSON([partition,params])；列表类方法与 server/discover 不计入上限（默认 512），其他方法超限时淘汰最早一条。归属疑为 SDK（见 lead 建议）。
 */
var UNCAPPED_CACHE_METHODS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var McpResponseCache;
deferInit("chunk-r1g76qsy.js:275399", () => {
  UNCAPPED_CACHE_METHODS = new Set([
    "tools/list",
    "prompts/list",
    "resources/list",
    "resources/templates/list",
    "server/discover",
  ]);
  McpResponseCache = class {
    _entries = new Map();
    _maxEntries;
    _stamp = 0;
    _cappedSize = 0;
    constructor(options) {
      this._maxEntries = options?.maxEntries ?? 512;
    }
    get size() {
      return this._entries.size;
    }
    get(key) {
      return this._entries.get(responseCacheKey(key));
    }
    set(key, entry) {
      let k = responseCacheKey(key);
      let exempt = UNCAPPED_CACHE_METHODS.has(key.method);
      let isNew = !this._entries.has(k);
      if (!exempt && isNew && this._maxEntries > 0 && this._cappedSize >= this._maxEntries) {
        for (let key of this._entries.keys())
          if (!UNCAPPED_CACHE_METHODS.has(key.slice(0, key.indexOf("\x00")))) {
            this._entries.delete(key);
            this._cappedSize--;
            break;
          }
      }
      let stamp = ++this._stamp;
      this._entries.set(k, {
        ...entry,
        stamp,
      });
      if (isNew && !exempt) this._cappedSize++;
      return stamp;
    }
    delete(key) {
      if (this._entries.delete(responseCacheKey(key)) && !UNCAPPED_CACHE_METHODS.has(key.method))
        this._cappedSize--;
    }
    evict(method) {
      let prefix = `${method}\x00`;
      let exempt = UNCAPPED_CACHE_METHODS.has(method);
      for (let k of this._entries.keys())
        if (k.startsWith(prefix)) {
          this._entries.delete(k);
          if (!exempt) this._cappedSize--;
        }
    }
    clear() {
      this._entries.clear();
      this._cappedSize = 0;
    }
  };
});
//@ chunk-r1g76qsy.js:276316-276404 esm-fingerprint
/**
 * responseCacheKey：缓存键 = method + \0 + JSON([partition, params])。
 */
function responseCacheKey(key) {
  return `${key.method}\x00${JSON.stringify([key.partition ?? "", key.params ?? ""])}`;
}
//@ chunk-r1g76qsy.js:276404-276456 esm-layout
function genKey(method, params) {
  return params === undefined ? method : `${method}\x00${params}`;
}
//@ chunk-r1g76qsy.js:276456-279996 esm-fingerprint
var MAX_CACHE_TTL_MS = 86400000;
var ClientResponseCache = class {
  _evictionGeneration = new Map();
  _toolIndex;
  _toolOutputValidatorIndex;
  _serverIdentity = "";
  constructor(_store, _isUserSupplied, _reportError = () => {}, _cachePartition = "", _now = Date.now) {
    this._store = _store;
    this._isUserSupplied = _isUserSupplied;
    this._reportError = _reportError;
    this._cachePartition = _cachePartition;
    this._now = _now;
  }
  now() {
    return this._now();
  }
  setServerIdentity(identity) {
    this._serverIdentity = identity;
  }
  _partitionFor(scope) {
    return JSON.stringify([this._serverIdentity, scope === "public" ? "" : this._cachePartition]);
  }
  async _probe(method, params) {
    let key = {
      method,
      params: params ?? "",
    };
    let ownPartition = this._partitionFor("private");
    let own = await this._store.get({
      ...key,
      partition: ownPartition,
    });
    if (own !== undefined) return own;
    let sharedPartition = this._partitionFor("public");
    if (sharedPartition === ownPartition) return;
    let shared = await this._store.get({
      ...key,
      partition: sharedPartition,
    });
    return shared?.scope === "public" ? shared : undefined;
  }
  async evict(method) {
    this._evictionGeneration.set(method, (this._evictionGeneration.get(method) ?? 0) + 1);
    await this._deleteBoth(method, "");
  }
  async _deleteBoth(method, params) {
    let ownPartition = this._partitionFor("private");
    let sharedPartition = this._partitionFor("public");
    try {
      await this._store.delete({
        method,
        params,
        partition: ownPartition,
      });
    } catch (error) {
      this._reportError(error);
    }
    if (sharedPartition !== ownPartition)
      try {
        await this._store.delete({
          method,
          params,
          partition: sharedPartition,
        });
      } catch (error) {
        this._reportError(error);
      }
  }
  async evictKey(method, params) {
    let gk = genKey(method, params);
    let current = this._evictionGeneration.get(gk);
    if (current !== undefined) this._evictionGeneration.set(gk, current + 1);
    await this._deleteBoth(method, params);
  }
  captureGeneration(method, params) {
    let gk = genKey(method, params);
    let current = this._evictionGeneration.get(gk) ?? 0;
    this._evictionGeneration.set(gk, current);
    return current;
  }
  async write(method, value, capturedGen, freshness) {
    if ((this._evictionGeneration.get(genKey(method, freshness?.params)) ?? 0) !== capturedGen) return;
    let params = freshness?.params ?? "";
    let ownPartition = this._partitionFor("private");
    let sharedPartition = this._partitionFor("public");
    let partition = (freshness?.scope ?? "private") === "public" ? sharedPartition : ownPartition;
    try {
      await this._store.set(
        {
          method,
          params,
          partition,
        },
        {
          value: encodeCacheValue(value),
          expiresAt: freshness?.expiresAt,
          scope: freshness?.scope,
        },
      );
    } catch (error) {
      this._reportError(error);
    }
    if (sharedPartition !== ownPartition)
      try {
        await this._store.delete({
          method,
          params,
          partition: partition === ownPartition ? sharedPartition : ownPartition,
        });
      } catch (error) {
        this._reportError(error);
      }
  }
  async read(method, params) {
    let entry = await this._probe(method, params);
    if (entry?.expiresAt === undefined || !(entry.expiresAt > this.now())) return;
    try {
      let parsed = JSON.parse(entry.value);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
        throw TypeError("cached document is not an object");
      return {
        value: parsed,
      };
    } catch (error) {
      this._reportError(error);
      await this._deleteBoth(method, params ?? "");
      return;
    }
  }
  resetForReconnect() {
    if (!this._isUserSupplied) this._store.clear();
    this._evictionGeneration.clear();
    this._toolIndex = undefined;
    this._toolOutputValidatorIndex = undefined;
    this._serverIdentity = "";
  }
  async toolDefinition(name) {
    let entry = await this._probe("tools/list");
    if (entry === undefined) {
      this._toolIndex = undefined;
      return;
    }
    if (this._toolIndex?.stamp !== entry.stamp) {
      let list = this._decodeListTools(entry);
      let byName = new Map();
      if (list !== undefined) for (let tool of list.tools) byName.set(tool.name, tool);
      this._toolIndex = {
        stamp: entry.stamp,
        byName,
      };
    }
    return this._toolIndex.byName.get(name);
  }
  async outputValidator(toolName, compile) {
    let entry = await this._probe("tools/list");
    if (entry === undefined) {
      this._toolOutputValidatorIndex = undefined;
      return;
    }
    let _toolOutputValidatorIndex = this._toolOutputValidatorIndex;
    let list;
    if (_toolOutputValidatorIndex?.stamp !== entry.stamp) {
      list = this._decodeListTools(entry);
      _toolOutputValidatorIndex = {
        stamp: entry.stamp,
        byName: new Map(),
        pending: new Set(),
        whole: String(entry.value).includes('"$id"'),
      };
      for (let tool of list?.tools ?? [])
        if (tool.outputSchema) _toolOutputValidatorIndex.pending.add(tool.name);
    }
    if (
      _toolOutputValidatorIndex.whole
        ? _toolOutputValidatorIndex.pending.size > 0
        : _toolOutputValidatorIndex.pending.has(toolName)
    ) {
      list ??= this._decodeListTools(entry);
      for (let tool of list?.tools ?? [])
        if (_toolOutputValidatorIndex.whole || tool.name === toolName) {
          let validator = compile(tool);
          if (validator !== undefined) _toolOutputValidatorIndex.byName.set(tool.name, validator);
        }
      if (_toolOutputValidatorIndex.whole) _toolOutputValidatorIndex.pending.clear();
      else _toolOutputValidatorIndex.pending.delete(toolName);
    }
    this._toolOutputValidatorIndex = _toolOutputValidatorIndex;
    return _toolOutputValidatorIndex.byName.get(toolName);
  }
  _decodeListTools(entry) {
    try {
      let parsed = JSON.parse(entry.value);
      if (!Array.isArray(parsed?.tools) || !parsed.tools.every((t) => t !== null && typeof t === "object"))
        throw TypeError("cached tools/list document has a malformed tools array");
      return parsed;
    } catch (error) {
      this._reportError(error);
      return;
    }
  }
};
//@ chunk-r1g76qsy.js:279996-280268 esm-fingerprint
function encodeCacheValue(value) {
  let json;
  try {
    json = JSON.stringify(value);
  } catch (error) {
    throw TypeError(
      `cache value is not JSON-serializable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (typeof json !== "string")
    throw TypeError("cache value is not JSON-serializable: it has no JSON representation");
  return json;
}
//@ chunk-r1g76qsy.js:280268-280317 esm-fingerprint
var UNSUPPORTED_PROTOCOL_VERSION; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NOT_PROBE_RECOGNIZED;
deferInit("chunk-r1g76qsy.js:280268", () => {
  UNSUPPORTED_PROTOCOL_VERSION = -32022;
  NOT_PROBE_RECOGNIZED = new Set([-32001, -32020, -32021]);
});
//@ chunk-r1g76qsy.js:280317-280959 esm-fingerprint
function classifyProbeOutcome(outcome, context) {
  switch (outcome.kind) {
    case "result":
      return classifyResult(outcome.result, context);
    case "rpc-error":
      return classifyRpcError(outcome, context);
    case "http-error":
      return classifyHttpError(outcome, context);
    case "network-error":
      return classifyNetworkError(outcome.error, context);
    case "auth-required":
      return {
        kind: "error",
        error: outcome.error,
      };
    case "closed":
      if (context.transportKind === "stdio")
        return {
          kind: "legacy",
        };
      return classifyNetworkError(Error("Connection closed during the version negotiation probe"), context);
    case "timeout":
      if (context.transportKind === "stdio")
        return {
          kind: "legacy",
        };
      return {
        kind: "error",
        error: new SdkError(
          SdkErrorCode.RequestTimeout,
          `Version negotiation probe timed out after ${outcome.timeoutMs}ms`,
          {
            timeout: outcome.timeoutMs,
          },
        ),
      };
    case "id-mismatch":
    case "malformed":
    case "stream-end":
      return {
        kind: "legacy",
      };
  }
}
//@ chunk-r1g76qsy.js:280959-281329 esm-fingerprint
function classifyResult(result, context) {
  let parsed = codecForVersion(MODERN_WIRE_REVISION).validateResult("server/discover", result);
  if (!parsed.ok)
    return {
      kind: "legacy",
    };
  let supportedVersions = parsed.value.supportedVersions;
  let overlap = context.clientModernVersions.find((version) => supportedVersions.includes(version));
  if (overlap !== undefined)
    return {
      kind: "modern",
      version: overlap,
      discover: parsed.value,
    };
  if (context.fallbackAvailable)
    return {
      kind: "legacy",
    };
  return {
    kind: "error",
    error: new UnsupportedProtocolVersionError({
      supported: [...supportedVersions],
      requested: context.requestedVersion,
    }),
  };
}
//@ chunk-r1g76qsy.js:281329-281784 esm-fingerprint
function classifyRpcError(outcome, context) {
  let { code, message, data } = outcome;
  if (code === UNSUPPORTED_PROTOCOL_VERSION) {
    let supported = parseSupportedList(data);
    if (supported === undefined)
      return {
        kind: "legacy",
      };
    let error = new UnsupportedProtocolVersionError(
      {
        supported,
        requested: parseRequested(data) ?? context.requestedVersion,
      },
      message,
    );
    let supportedModern = modernProtocolVersions(supported);
    let mutual = context.clientModernVersions.find((version) => supportedModern.includes(version));
    if (mutual !== undefined)
      return {
        kind: "corrective",
        version: mutual,
        error,
      };
    if (supportedModern.length > 0)
      return {
        kind: "error",
        error,
      };
    return context.fallbackAvailable
      ? {
          kind: "legacy",
        }
      : {
          kind: "error",
          error,
        };
  }
  if (NOT_PROBE_RECOGNIZED.has(code))
    return {
      kind: "legacy",
    };
  return {
    kind: "legacy",
  };
}
//@ chunk-r1g76qsy.js:281784-281869 esm-layout
function classifyHttpError(outcome, context) {
  let rpcError = parseJsonRpcErrorBody(outcome.body);
  if (rpcError !== undefined) return classifyRpcError(rpcError, context);
  return {
    kind: "legacy",
  };
}
//@ chunk-r1g76qsy.js:281869-282058 esm-fingerprint
function classifyNetworkError(error, context) {
  if (context.environment === "browser" && isOpaqueFetchTypeError(error))
    return {
      kind: "legacy",
    };
  return {
    kind: "error",
    error: new SdkError(
      SdkErrorCode.EraNegotiationFailed,
      `Version negotiation probe failed: ${describeError(error)}`,
      {
        cause: error,
      },
    ),
  };
}
//@ chunk-r1g76qsy.js:282058-282145 esm-fingerprint
function isOpaqueFetchTypeError(error) {
  return error instanceof TypeError || (error instanceof Error && error.name === "TypeError");
}
//@ chunk-r1g76qsy.js:282145-282206 esm-layout
function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}
//@ chunk-r1g76qsy.js:282206-282366 esm-fingerprint
function parseSupportedList(data) {
  if (typeof data !== "object" || data === null) return;
  let supported = data.supported;
  if (!Array.isArray(supported) || supported.length === 0 || !supported.every((v) => typeof v === "string"))
    return;
  return supported;
}
//@ chunk-r1g76qsy.js:282366-282475 esm-fingerprint
function parseRequested(data) {
  if (typeof data !== "object" || data === null) return;
  let requested = data.requested;
  return typeof requested === "string" ? requested : undefined;
}
//@ chunk-r1g76qsy.js:282475-282768 esm-fingerprint
function parseJsonRpcErrorBody(body) {
  if (body === undefined || body === "") return;
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return;
  }
  if (typeof parsed !== "object" || parsed === null) return;
  let error = parsed.error;
  if (typeof error !== "object" || error === null) return;
  let { code, message, data } = error;
  if (typeof code !== "number") return;
  return {
    code,
    message: typeof message === "string" ? message : "",
    data,
  };
}
//@ chunk-r1g76qsy.js:282768-282784 esm-fingerprint
var DEFAULT_VERSION_NEGOTIATION_MODE = "legacy";
//@ chunk-r1g76qsy.js:282784-283281 esm-fingerprint
function resolveVersionNegotiation(options, supportedProtocolVersionsOption) {
  let mode = options?.mode ?? DEFAULT_VERSION_NEGOTIATION_MODE;
  if (mode === "legacy")
    return {
      kind: "legacy",
    };
  let probe = options?.probe ?? {};
  if (typeof mode === "object") {
    if (!isModernProtocolVersion(mode.pin))
      throw TypeError(
        `versionNegotiation: { pin: '${mode.pin}' } is not a modern protocol revision \u2014 pinning is for 2026-07-28 and later; omit versionNegotiation (or use mode: 'legacy') for 2025-era servers.`,
      );
    return {
      kind: "pin",
      version: mode.pin,
      probe,
    };
  }
  let explicitModern = supportedProtocolVersionsOption
    ? modernProtocolVersions(supportedProtocolVersionsOption)
    : [];
  return {
    kind: "auto",
    modernVersions: explicitModern.length > 0 ? explicitModern : [...defaultModernVersions],
    fallbackAvailable: supportedProtocolVersionsOption
      ? legacyProtocolVersions(supportedProtocolVersionsOption).length > 0
      : true,
    probe,
  };
}
//@ chunk-r1g76qsy.js:283281-283375 esm-fingerprint
function detectProbeEnvironment() {
  let g = globalThis;
  return g.window !== undefined && g.document !== undefined ? "browser" : "node";
}
//@ chunk-r1g76qsy.js:283375-283435 esm-fingerprint
function detectProbeTransportKind(transport) {
  return "stderr" in transport && "pid" in transport ? "stdio" : "http";
}
//@ chunk-r1g76qsy.js:283435-286144 esm-fingerprint
var ProbeWindow; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap;
deferInit("chunk-r1g76qsy.js:283435", () => {
  ProbeWindow = class ProbeWindow {
    _pending;
    _probeCounter = 0;
    _transportKind;
    _issuedIds = new Set();
    _errorSinceSend;
    _savedOnMessage;
    _savedOnError;
    _savedOnClose;
    _closeDelivered = false;
    constructor(transport) {
      this._transport = transport;
      this._savedOnMessage = transport.onmessage;
      this._savedOnError = transport.onerror;
      this._savedOnClose = transport.onclose;
    }
    static async open(transport, _transportKind) {
      let probe = new ProbeWindow(transport);
      probe._transportKind = _transportKind;
      transport.onmessage = (message) => {
        let _pending = probe._pending;
        if (
          _pending !== undefined &&
          (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) &&
          message.id === _pending.id
        ) {
          probe._pending = undefined;
          if (isJSONRPCResultResponse(message))
            _pending.resolve({
              kind: "response",
              result: message.result,
            });
          else
            _pending.resolve({
              kind: "response",
              error: message.error,
            });
          return;
        }
        if (
          _pending !== undefined &&
          probe._transportKind === "http" &&
          (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) &&
          !probe._issuedIds.has(message.id)
        ) {
          probe._pending = undefined;
          let receivedId = truncateForError(JSON.stringify(message.id));
          let probeError = Error(
            `server/discover probe reply did not echo the request id (expected ${JSON.stringify(_pending.id)}, got ${receivedId}) \u2014 treating the server as pre-2026-07-28`,
          );
          probeError.name = "McpProbeIdMismatchError";
          probe._savedOnError?.(probeError);
          _pending.resolve({
            kind: "id-mismatch",
          });
          return;
        }
      };
      transport.onerror = (errorEvent) => {
        if (probe._pending !== undefined && probe._errorSinceSend === undefined)
          probe._errorSinceSend = errorEvent;
        let _pending = probe._pending;
        if (_pending !== undefined && probe._transportKind === "http" && isDecodeError(errorEvent))
          setTimeout(() => {
            if (probe._pending !== _pending) return;
            probe._pending = undefined;
            let probeError = Error(
              `server/discover probe reply failed JSON-RPC message decoding (${truncateForError(errorEvent instanceof Error ? errorEvent.message : String(errorEvent))}) \u2014 treating the server as pre-2026-07-28`,
            );
            probeError.name = "McpProbeMalformedReplyError";
            probe._savedOnError?.(probeError);
            _pending.resolve({
              kind: "malformed",
            });
          }, 0);
        probe._savedOnError?.(errorEvent);
      };
      transport.onclose = () => {
        let _pending = probe._pending;
        if (_pending !== undefined) {
          probe._pending = undefined;
          _pending.resolve({
            kind: "closed",
          });
        }
        probe._closeDelivered = true;
        probe._savedOnClose?.();
      };
      try {
        await transport.start();
      } catch (error) {
        probe.detach();
        throw error;
      }
      return probe;
    }
    async exchange(buildRequest, timeoutMs) {
      let requestId = `server-discover-probe-${++this._probeCounter}`;
      this._issuedIds.add(requestId);
      this._errorSinceSend = undefined;
      return new Promise((resolve) => {
        let settled = false;
        let settle = (outcome) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (this._pending?.id === requestId) this._pending = undefined;
          resolve(outcome);
        };
        let timer = setTimeout(
          () =>
            settle({
              kind: "timeout",
            }),
          timeoutMs,
        );
        this._pending = {
          id: requestId,
          resolve: settle,
        };
        this._transport
          .send(buildRequest(requestId), {
            onRequestStreamEnd: () => {
              setTimeout(() => {
                let _errorSinceSend = this._errorSinceSend;
                if (_errorSinceSend !== undefined && !isDecodeError(_errorSinceSend)) {
                  settle({
                    kind: "send-error",
                    error:
                      _errorSinceSend instanceof Error ? _errorSinceSend : Error(String(_errorSinceSend)),
                  });
                  return;
                }
                settle({
                  kind: "stream-end",
                });
              }, 0);
            },
          })
          .catch((error) =>
            settle({
              kind: "send-error",
              error,
            }),
          );
      });
    }
    detach() {
      this._pending = undefined;
      this._transport.onmessage = this._savedOnMessage;
      this._transport.onerror = this._savedOnError;
      if (this._closeDelivered && this._savedOnClose !== undefined) {
        let _savedOnClose = this._savedOnClose;
        let _transport = this._transport;
        let closeSeen = false;
        let onCloseReplay = () => {
          if (!closeSeen) {
            closeSeen = true;
            return;
          }
          _savedOnClose();
        };
        _transport.onclose = onCloseReplay;
        weakMap.set(_transport, () => {
          if (_transport.onclose === onCloseReplay) _transport.onclose = _savedOnClose;
        });
      } else this._transport.onclose = this._savedOnClose;
    }
    release() {
      this.detach();
      let _transport = this._transport;
      let start = _transport.start;
      let isFirstStart = true;
      _transport.start = async function () {
        if (isFirstStart) {
          isFirstStart = false;
          _transport.start = start;
          return;
        }
        return start.call(_transport);
      };
    }
  };
  weakMap = new WeakMap();
});
//@ chunk-r1g76qsy.js:286144-286291 esm-layout
function truncateForError(text) {
  let str = String(text);
  if (str.length <= 200) return str;
  let sliceEnd = (str.charCodeAt(199) & 64512) === 55296 ? 199 : 200;
  return `${str.slice(0, sliceEnd)}\u2026 [truncated]`;
}
//@ chunk-r1g76qsy.js:286291-286428 esm-layout
function isDecodeError(error) {
  if (error instanceof SyntaxError) return true;
  return (
    typeof error === "object" && error !== null && (error.name === "ZodError" || Array.isArray(error.issues))
  );
}
//@ chunk-r1g76qsy.js:286428-286478 esm-fingerprint
function disarmSpentCloseGuard(transport) {
  let restoreOnClose = weakMap.get(transport);
  weakMap.delete(transport);
  restoreOnClose?.();
}
//@ chunk-r1g76qsy.js:286478-286644 esm-fingerprint
function buildProbeRequest(id, protocolVersion, clientInfo, capabilities) {
  return {
    jsonrpc: "2.0",
    id,
    method: "server/discover",
    params: {
      _meta: codecForVersion(protocolVersion).outboundEnvelope({
        protocolVersion,
        clientInfo,
        clientCapabilities: capabilities,
      }),
    },
  };
}
//@ chunk-r1g76qsy.js:286644-287286 esm-fingerprint
function normalizeReply(reply, timeoutMs) {
  switch (reply.kind) {
    case "response":
      return reply.error === undefined
        ? {
            kind: "result",
            result: reply.result,
          }
        : {
            kind: "rpc-error",
            ...reply.error,
          };
    case "send-error": {
      let error = reply.error;
      if (error instanceof SdkHttpError) {
        let text = error.data?.text;
        return {
          kind: "http-error",
          status: error.data.status,
          body: typeof text === "string" ? text : undefined,
        };
      }
      if (
        error instanceof UnauthorizedError ||
        (error instanceof Error && error.name === "UnauthorizedError")
      )
        return {
          kind: "auth-required",
          error,
        };
      return {
        kind: "network-error",
        error,
      };
    }
    case "closed":
      return {
        kind: "closed",
      };
    case "id-mismatch":
      return {
        kind: "id-mismatch",
      };
    case "malformed":
      return {
        kind: "malformed",
      };
    case "stream-end":
      return {
        kind: "stream-end",
      };
    case "timeout":
      return {
        kind: "timeout",
        timeoutMs,
      };
  }
}
//@ chunk-r1g76qsy.js:287286-289241 esm-fingerprint
async function negotiateEra(negotiation, deps) {
  let timeoutMs = negotiation.probe.timeoutMs ?? deps.defaultTimeoutMs;
  let maxRetries = Math.max(0, negotiation.probe.maxRetries ?? 0);
  let clientModernVersions = negotiation.kind === "pin" ? [negotiation.version] : negotiation.modernVersions;
  let fallbackAvailable = negotiation.kind === "auto" && negotiation.fallbackAvailable;
  let probe = await ProbeWindow.open(deps.transport, deps.transportKind);
  let probe_2 = async () => {
    let requestedVersion = clientModernVersions[0];
    let correctiveUsed = false;
    let timeoutRetriesRemaining = maxRetries;
    for (;;) {
      let reply = await probe.exchange(
        (id) => buildProbeRequest(id, requestedVersion, deps.clientInfo, deps.capabilities),
        timeoutMs,
      );
      if (reply.kind === "timeout" && timeoutRetriesRemaining > 0) {
        timeoutRetriesRemaining--;
        continue;
      }
      let outcome = normalizeReply(reply, timeoutMs);
      if (outcome.kind === "timeout") deps.transport._anthropicProbeTimedOut = true;
      let verdict = classifyProbeOutcome(outcome, {
        clientModernVersions,
        requestedVersion,
        fallbackAvailable,
        environment: deps.environment,
        transportKind: deps.transportKind,
      });
      switch (verdict.kind) {
        case "modern":
          return {
            era: "modern",
            version: verdict.version,
            discover: verdict.discover,
          };
        case "corrective":
          if (correctiveUsed) throw verdict.error;
          correctiveUsed = true;
          requestedVersion = verdict.version;
          continue;
        case "legacy": {
          if (outcome.kind === "id-mismatch" || outcome.kind === "malformed" || outcome.kind === "stream-end")
            deps.transport._anthropicProbeLegacyEvidence = outcome.kind;
          let closedCause =
            outcome.kind === "closed" ? "the connection closed during the server/discover probe" : undefined;
          if (negotiation.kind === "pin")
            throw new SdkError(
              SdkErrorCode.EraNegotiationFailed,
              closedCause === undefined
                ? `Version negotiation failed: the server did not offer pinned protocol version ${negotiation.version} via server/discover (no fallback in pin mode)`
                : `Version negotiation failed: ${closedCause} before the server offered pinned protocol version ${negotiation.version} (no fallback in pin mode)`,
            );
          if (!negotiation.fallbackAvailable)
            throw new SdkError(
              SdkErrorCode.EraNegotiationFailed,
              closedCause === undefined
                ? "Version negotiation failed: the server gave no modern evidence and this client supports no pre-2026-07-28 protocol version to fall back to"
                : `Version negotiation failed: ${closedCause} and this client supports no pre-2026-07-28 protocol version to fall back to`,
            );
          if (closedCause !== undefined && deps.disposableProbe !== true)
            throw new SdkError(
              SdkErrorCode.EraNegotiationFailed,
              `Version negotiation failed: ${closedCause} (this transport probed in place \u2014 the disposable sibling probe requires the SDK's base StdioClientTransport)`,
            );
          return {
            era: "legacy",
          };
        }
        case "error":
          throw verdict.error;
      }
    }
  };
  let result;
  try {
    result = await probe_2();
  } catch (error) {
    probe.detach();
    throw error;
  }
  probe.release();
  return result;
}
//@ chunk-r1g76qsy.js:289241-289456 esm-fingerprint
function readStdioServerParams(transport) {
  let proto = Object.getPrototypeOf(transport);
  if (proto === null || !Object.prototype.hasOwnProperty.call(proto, "_dispose")) return;
  let params = transport._serverParams;
  return typeof params === "object" && params !== null && typeof params.command === "string"
    ? params
    : undefined;
}
//@ chunk-r1g76qsy.js:289456-289821 esm-fingerprint
async function negotiateStdioViaSibling(negotiation, sessionTransport, params, deps) {
  let sibling = new sessionTransport.constructor({
    ...params,
    stderr: "ignore",
  });
  let originalClose = sessionTransport.close;
  let callerClosed = false;
  let signalClosed;
  let closedSignal = new Promise((resolve, reject) => {
    signalClosed = () => reject(callerCloseAbortError());
  });
  sessionTransport.close = async function () {
    callerClosed = true;
    signalClosed?.();
    return originalClose.call(sessionTransport);
  };
  let result;
  try {
    let negotiated = negotiateEra(negotiation, {
      ...deps,
      transport: sibling,
      transportKind: "stdio",
      disposableProbe: true,
    });
    negotiated.catch(() => {});
    result = await Promise.race([negotiated, closedSignal]);
  } finally {
    await disposeSibling(sibling);
    sessionTransport.close = originalClose;
  }
  if (callerClosed) throw callerCloseAbortError();
  return result;
}
//@ chunk-r1g76qsy.js:289821-289962 esm-fingerprint
function callerCloseAbortError() {
  return new SdkError(
    SdkErrorCode.EraNegotiationFailed,
    "Version negotiation failed: the transport was closed during the server/discover probe",
  );
}
//@ chunk-r1g76qsy.js:289962-290061 esm-fingerprint
async function disposeSibling(sibling) {
  try {
    let dispose = sibling._dispose;
    await (typeof dispose === "function" ? dispose.call(sibling) : sibling.close());
  } catch {}
}
//@ chunk-r1g76qsy.js:290061-290133 esm-fingerprint
function serverInfoFromDiscover(discover) {
  let fromMeta = discover._meta?.[SERVER_INFO_META_KEY];
  return isSpecType.Implementation(fromMeta) ? fromMeta : undefined;
}
//@ chunk-r1g76qsy.js:290133-290598 esm-fingerprint
function applyElicitationDefaults(schema, data) {
  if (!schema || data === null || typeof data !== "object") return;
  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
    let obj = data;
    let props = schema.properties;
    for (let key of Object.keys(props)) {
      let propSchema = props[key];
      if (obj[key] === undefined && Object.prototype.hasOwnProperty.call(propSchema, "default"))
        obj[key] = propSchema.default;
      if (obj[key] !== undefined) applyElicitationDefaults(propSchema, obj[key]);
    }
  }
  if (Array.isArray(schema.anyOf)) {
    for (let sub of schema.anyOf) if (typeof sub !== "boolean") applyElicitationDefaults(sub, data);
  }
  if (Array.isArray(schema.oneOf)) {
    for (let sub of schema.oneOf) if (typeof sub !== "boolean") applyElicitationDefaults(sub, data);
  }
}
//@ chunk-r1g76qsy.js:290598-290758 esm-fingerprint
function getSupportedElicitationModes(capabilities) {
  if (!capabilities)
    return {
      supportsFormMode: false,
      supportsUrlMode: false,
    };
  let hasFormCapability = capabilities.form !== undefined;
  let hasUrlCapability = capabilities.url !== undefined;
  return {
    supportsFormMode: hasFormCapability || (!hasFormCapability && !hasUrlCapability),
    supportsUrlMode: hasUrlCapability,
  };
}
//@ chunk-r1g76qsy.js:290758-291095 esm-fingerprint
function validatePrior(prior) {
  if (typeof prior === "object" && prior !== null) {
    if (prior.kind === "legacy" && !("supportedVersions" in prior) && !("discover" in prior)) return prior;
    if (prior.kind === "modern" && DiscoverResultSchema.safeParse(prior.discover).success) return prior;
  }
  throw new SdkError(
    SdkErrorCode.EraNegotiationFailed,
    "connect({ prior }): unrecognized prior \u2014 expected { kind: 'modern', discover } or { kind: 'legacy' }",
  );
}
//@ chunk-r1g76qsy.js:291095-316569 esm-fingerprint
var LIST_CHANGED_EVICTIONS; // deferred: uses NO_REQUEST_STATE (./src-D_zzAWoS.mjs) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_LIST_MAX_PAGES;
var Client;
deferInit("chunk-r1g76qsy.js:291095", () => {
  LIST_CHANGED_EVICTIONS = {
    "notifications/tools/list_changed": ["tools/list"],
    "notifications/prompts/list_changed": ["prompts/list"],
    "notifications/resources/list_changed": ["resources/list", "resources/templates/list"],
  };
  DEFAULT_LIST_MAX_PAGES = 64;
  Client = class extends Protocol {
    _serverCapabilities;
    _serverVersion;
    _capabilities;
    _instructions;
    _jsonSchemaValidator;
    _cache;
    _defaultCacheTtlMs;
    _listMaxPages;
    _listChangedDebounceTimers = new Map();
    _listChangedConfig;
    _enforceStrictCapabilities;
    _versionNegotiation;
    _supportedProtocolVersionsOption;
    _inputRequiredDriverConfig;
    _listenState = new Map();
    _nextListenId = 0;
    _autoOpenedSubscription;
    _discoverResult;
    _resetConnectionState() {
      this._negotiatedProtocolVersion = undefined;
      this._serverCapabilities = undefined;
      this._serverVersion = undefined;
      this._instructions = undefined;
      this._discoverResult = undefined;
      this._autoOpenedSubscription = undefined;
      if (this._listenState.size > 0) {
        let reason = new SdkError(
          SdkErrorCode.ConnectionClosed,
          "subscriptions/listen: client reconnected or closed; subscription state from the previous connection was reset",
        );
        for (let entry of this._listenState.values())
          entry.settle({
            cause: "remote",
            error: reason,
          });
      }
      this._listenState.clear();
      for (let timer of this._listChangedDebounceTimers.values()) clearTimeout(timer);
      this._listChangedDebounceTimers.clear();
      this._cache.resetForReconnect();
    }
    async close() {
      try {
        await super.close();
      } finally {
        this._resetConnectionState();
      }
    }
    constructor(_clientInfo, options) {
      super(options);
      this._clientInfo = _clientInfo;
      this._capabilities = options?.capabilities
        ? {
            ...options.capabilities,
          }
        : {};
      this._jsonSchemaValidator = options?.jsonSchemaValidator ?? new AjvJsonSchemaValidator();
      this._enforceStrictCapabilities = options?.enforceStrictCapabilities ?? false;
      this._versionNegotiation = options?.versionNegotiation;
      this._supportedProtocolVersionsOption = options?.supportedProtocolVersions;
      this._inputRequiredDriverConfig = resolveInputRequiredDriverConfig(options?.inputRequired);
      this._cache = new ClientResponseCache(
        options?.responseCacheStore ?? new McpResponseCache(),
        options?.responseCacheStore !== undefined,
        (error) => this._reportStoreError(error),
        options?.cachePartition ?? "",
      );
      this._defaultCacheTtlMs = options?.defaultCacheTtlMs ?? 0;
      this._listMaxPages = options?.listMaxPages ?? DEFAULT_LIST_MAX_PAGES;
      if (options?.listChanged) this._listChangedConfig = options.listChanged;
    }
    buildContext(ctx, _transportInfo) {
      return ctx;
    }
    _shouldDropInbound(message) {
      if (
        this._negotiatedProtocolVersion !== undefined &&
        isModernProtocolVersion(this._negotiatedProtocolVersion) &&
        isJSONRPCRequest(message)
      )
        return "drop";
    }
    _outboundMetaEnvelope() {
      let version = this._negotiatedProtocolVersion;
      if (version === undefined) return;
      return this._wireCodec().outboundEnvelope({
        protocolVersion: version,
        clientInfo: this._clientInfo,
        clientCapabilities: this._capabilities,
      });
    }
    _resolveNonCompleteResult(decoded, flow) {
      if (!this._inputRequiredDriverConfig.autoFulfill)
        return Promise.reject(
          new SdkError(
            SdkErrorCode.UnsupportedResultType,
            `Unsupported result type 'input_required' for ${flow.request.method}: multi-round-trip auto-fulfilment is not enabled on this instance \u2014 pass allowInputRequired: true to handle it manually, or enable inputRequired.autoFulfill`,
            {
              resultType: "input_required",
              method: flow.request.method,
            },
          ),
        );
      return runInputRequiredFlow(
        {
          getRequestHandler: (method) => this._getRequestHandler(method),
          buildContext: (baseCtx) => this.buildContext(baseCtx, undefined),
          sessionId: this.transport?.sessionId,
        },
        this._inputRequiredDriverConfig,
        decoded,
        flow,
      );
    }
    _setupListChangedHandlers(config) {
      if (config.tools && this._serverCapabilities?.tools?.listChanged)
        this._setupListChangedHandler(
          "tools",
          "notifications/tools/list_changed",
          config.tools,
          async () =>
            (
              await this.listTools(undefined, {
                cacheMode: "refresh",
              })
            ).tools,
        );
      if (config.prompts && this._serverCapabilities?.prompts?.listChanged)
        this._setupListChangedHandler(
          "prompts",
          "notifications/prompts/list_changed",
          config.prompts,
          async () =>
            (
              await this.listPrompts(undefined, {
                cacheMode: "refresh",
              })
            ).prompts,
        );
      if (config.resources && this._serverCapabilities?.resources?.listChanged)
        this._setupListChangedHandler(
          "resources",
          "notifications/resources/list_changed",
          config.resources,
          async () =>
            (
              await this.listResources(undefined, {
                cacheMode: "refresh",
              })
            ).resources,
        );
    }
    registerCapabilities(capabilities) {
      if (this.transport) throw Error("Cannot register capabilities after connecting to transport");
      this._capabilities = mergeCapabilities(this._capabilities, capabilities);
    }
    setVersionNegotiation(options) {
      if (this.transport) throw Error("Cannot configure version negotiation after connecting to transport");
      this._versionNegotiation = options;
    }
    _wrapHandler(method, handler) {
      if (method === "elicitation/create")
        return async (request, ctx) => {
          let codec = codecForVersion(this._negotiatedProtocolVersion);
          let validatedRequest = codec.validateRequest("elicitation/create", request);
          if (!validatedRequest.ok && validatedRequest.reason === "not-in-era")
            validatedRequest = codec.validateInputRequest("elicitation/create", request);
          if (!validatedRequest.ok)
            throw new ProtocolError(
              validatedRequest.reason === "not-in-era"
                ? ProtocolErrorCode.InternalError
                : ProtocolErrorCode.InvalidParams,
              validatedRequest.reason === "not-in-era"
                ? "No wire schema for elicitation/create in the resolved era"
                : `Invalid elicitation request: ${validatedRequest.message}`,
            );
          let { params } = validatedRequest.value;
          params.mode = params.mode ?? "form";
          let { supportsFormMode, supportsUrlMode } = getSupportedElicitationModes(
            this._capabilities.elicitation,
          );
          if (params.mode === "form" && !supportsFormMode)
            throw new ProtocolError(
              ProtocolErrorCode.InvalidParams,
              "Client does not support form-mode elicitation requests",
            );
          if (params.mode === "url" && !supportsUrlMode)
            throw new ProtocolError(
              ProtocolErrorCode.InvalidParams,
              "Client does not support URL-mode elicitation requests",
            );
          let result = await handler(request, ctx);
          let validationResult = codec.validateResult("elicitation/create", result);
          if (!validationResult.ok && validationResult.reason === "not-in-era")
            validationResult = codec.validateInputResponse("elicitation/create", result);
          if (!validationResult.ok)
            throw new ProtocolError(
              validationResult.reason === "not-in-era"
                ? ProtocolErrorCode.InternalError
                : ProtocolErrorCode.InvalidParams,
              validationResult.reason === "not-in-era"
                ? "No wire schema for elicitation/create in the resolved era"
                : `Invalid elicitation result: ${validationResult.message}`,
            );
          let validatedResult = validationResult.value;
          let requestedSchema = params.mode === "form" ? params.requestedSchema : undefined;
          if (
            params.mode === "form" &&
            validatedResult.action === "accept" &&
            validatedResult.content &&
            requestedSchema &&
            this._capabilities.elicitation?.form?.applyDefaults
          )
            try {
              applyElicitationDefaults(requestedSchema, validatedResult.content);
            } catch {}
          return validatedResult;
        };
      if (method === "sampling/createMessage")
        return async (request, ctx) => {
          let codec = codecForVersion(this._negotiatedProtocolVersion);
          let validatedRequest = codec.validateRequest("sampling/createMessage", request);
          if (!validatedRequest.ok && validatedRequest.reason === "not-in-era")
            validatedRequest = codec.validateInputRequest("sampling/createMessage", request);
          if (!validatedRequest.ok)
            throw new ProtocolError(
              validatedRequest.reason === "not-in-era"
                ? ProtocolErrorCode.InternalError
                : ProtocolErrorCode.InvalidParams,
              validatedRequest.reason === "not-in-era"
                ? "No wire schema for sampling/createMessage in the resolved era"
                : `Invalid sampling request: ${validatedRequest.message}`,
            );
          let { params } = validatedRequest.value;
          let result = await handler(request, ctx);
          let hasTools = Boolean(params.tools || params.toolChoice);
          let validatedResult = codec.samplingResultVariant(hasTools, result);
          if (!validatedResult.ok && validatedResult.reason === "not-in-era")
            validatedResult = codec.validateInputResponse("sampling/createMessage", result);
          if (!validatedResult.ok)
            throw new ProtocolError(
              validatedResult.reason === "not-in-era"
                ? ProtocolErrorCode.InternalError
                : ProtocolErrorCode.InvalidParams,
              validatedResult.reason === "not-in-era"
                ? "No result schema for sampling/createMessage in the resolved era"
                : `Invalid sampling result: ${validatedResult.message}`,
            );
          return validatedResult.value;
        };
      return handler;
    }
    assertCapability(capability, method) {
      if (!this._serverCapabilities?.[capability])
        throw new SdkError(
          SdkErrorCode.CapabilityNotSupported,
          `Server does not support ${capability} (required for ${method})`,
        );
    }
    async connect(transport, options) {
      if (options?.prior != null)
        return this._connectFromPrior(transport, validatePrior(options.prior), options);
      let negotiation = resolveVersionNegotiation(
        this._versionNegotiation,
        this._supportedProtocolVersionsOption,
      );
      if (negotiation.kind !== "legacy") return this._connectNegotiated(transport, negotiation, options);
      return this._connectPlainLegacy(transport, options);
    }
    async _connectPlainLegacy(transport, options) {
      await super.connect(transport);
      if (transport.sessionId !== undefined) {
        let negotiatedProtocolVersion = this._negotiatedProtocolVersion;
        if (negotiatedProtocolVersion !== undefined)
          transport.setProtocolVersion?.(negotiatedProtocolVersion);
        return;
      }
      this._resetConnectionState();
      await this._legacyHandshake(transport, options);
    }
    async _legacyHandshake(transport, options, closeOnError = true) {
      let legacyVersions = legacyProtocolVersions(this._supportedProtocolVersions);
      try {
        let offeredVersion = legacyVersions[0];
        if (offeredVersion === undefined)
          throw new SdkError(
            SdkErrorCode.EraNegotiationFailed,
            "Cannot run the initialize handshake: supportedProtocolVersions contains no pre-2026-07-28 protocol version",
          );
        let result = await this.request(
          {
            method: "initialize",
            params: {
              protocolVersion: offeredVersion,
              capabilities: this._capabilities,
              clientInfo: this._clientInfo,
            },
          },
          options,
        );
        if (result === undefined) throw Error(`Server sent invalid initialize result: ${result}`);
        if (!legacyVersions.includes(result.protocolVersion))
          throw Error(`Server's protocol version is not supported: ${result.protocolVersion}`);
        this._serverCapabilities = result.capabilities;
        this._serverVersion = result.serverInfo;
        this._cache.setServerIdentity(this._deriveServerIdentity(transport));
        if (transport.setProtocolVersion) transport.setProtocolVersion(result.protocolVersion);
        this._instructions = result.instructions;
        await this.notification({
          method: "notifications/initialized",
        });
        this._negotiatedProtocolVersion = result.protocolVersion;
        if (this._listChangedConfig) this._setupListChangedHandlers(this._listChangedConfig);
      } catch (error) {
        if (closeOnError) this.close();
        throw error;
      }
    }
    async _discoverAfterRejectedInitialize(transport, initializeError, negotiation, options) {
      let canRediscover =
        negotiation.kind === "auto" &&
        transport._anthropicProbeTimedOut === true &&
        initializeError instanceof ProtocolError;
      let supportedVersions =
        canRediscover && initializeError.code === ProtocolErrorCode.UnsupportedProtocolVersion
          ? parseSupportedList(initializeError.data)
          : undefined;
      let modernVersion = !canRediscover
        ? undefined
        : supportedVersions === undefined
          ? negotiation.modernVersions[0]
          : negotiation.modernVersions.find((modernVersion) => supportedVersions.includes(modernVersion));
      if (modernVersion === undefined) {
        this.close();
        throw initializeError;
      }
      try {
        this._negotiatedProtocolVersion = modernVersion;
        let discoverResult = await this.discover({
          ...options,
          timeout: Math.min(
            3000,
            negotiation.probe.timeoutMs ?? options?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MSEC,
          ),
        });
        if (!discoverResult.supportedVersions.includes(modernVersion))
          throw Error(`the second server/discover does not offer ${modernVersion}`);
        return {
          era: "modern",
          version: modernVersion,
          discover: discoverResult,
        };
      } catch (error) {
        transport._anthropicRediscoverError = error;
        this._negotiatedProtocolVersion = undefined;
        this.close();
        throw initializeError;
      }
    }
    async _connectNegotiated(transport, negotiation, options) {
      if (transport.sessionId !== undefined) {
        await super.connect(transport);
        let negotiatedProtocolVersion = this._negotiatedProtocolVersion;
        if (negotiatedProtocolVersion !== undefined && transport.setProtocolVersion)
          transport.setProtocolVersion(negotiatedProtocolVersion);
        return;
      }
      this._resetConnectionState();
      let result;
      try {
        let transportKind = detectProbeTransportKind(transport);
        let baseDeps = {
          clientInfo: this._clientInfo,
          capabilities: this._capabilities,
          environment: detectProbeEnvironment(),
          defaultTimeoutMs: options?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MSEC,
        };
        let stdioParams = transportKind === "stdio" ? readStdioServerParams(transport) : undefined;
        result =
          stdioParams === undefined
            ? await negotiateEra(negotiation, {
                ...baseDeps,
                transport,
                transportKind,
              })
            : await negotiateStdioViaSibling(negotiation, transport, stdioParams, baseDeps);
      } catch (error) {
        await transport.close().catch(() => {});
        disarmSpentCloseGuard(transport);
        throw error;
      }
      disarmSpentCloseGuard(transport);
      await super.connect(transport);
      if (result.era === "legacy")
        try {
          await this._legacyHandshake(transport, options, false);
          return;
        } catch (error) {
          result = await this._discoverAfterRejectedInitialize(transport, error, negotiation, options);
        }
      this._serverCapabilities = result.discover.capabilities;
      this._serverVersion = serverInfoFromDiscover(result.discover);
      this._cache.setServerIdentity(this._deriveServerIdentity(transport));
      this._instructions = result.discover.instructions;
      this._discoverResult = result.discover;
      this._negotiatedProtocolVersion = result.version;
      if (transport.setProtocolVersion) transport.setProtocolVersion(result.version);
      if (this._listChangedConfig) {
        let config = this._listChangedConfig;
        let advertised = this._serverCapabilities;
        let effective = {
          ...(config.tools &&
            advertised?.tools?.listChanged && {
              tools: config.tools,
            }),
          ...(config.prompts &&
            advertised?.prompts?.listChanged && {
              prompts: config.prompts,
            }),
          ...(config.resources &&
            advertised?.resources?.listChanged && {
              resources: config.resources,
            }),
        };
        let handlersRegistered = true;
        try {
          this._setupListChangedHandlers(effective);
        } catch (error) {
          handlersRegistered = false;
          this.onerror?.(error instanceof Error ? error : Error(String(error)));
        }
        let filter = handlersRegistered
          ? {
              ...(effective.tools && {
                toolsListChanged: true,
              }),
              ...(effective.prompts && {
                promptsListChanged: true,
              }),
              ...(effective.resources && {
                resourcesListChanged: true,
              }),
            }
          : {};
        if (Object.keys(filter).length > 0) {
          let ackAbort = new AbortController();
          let onConnectAbort = () => ackAbort.abort(options?.signal?.reason);
          if (options?.signal?.aborted) onConnectAbort();
          options?.signal?.addEventListener("abort", onConnectAbort);
          try {
            this._autoOpenedSubscription = await this.listen(filter, {
              timeout: options?.timeout,
              signal: ackAbort.signal,
            });
          } catch (error) {
            if (options?.signal?.aborted) {
              await this.close().catch(() => {});
              throw error;
            }
            this.onerror?.(error instanceof Error ? error : Error(String(error)));
          } finally {
            options?.signal?.removeEventListener("abort", onConnectAbort);
          }
        }
      }
    }
    async _connectFromPrior(transport, prior, options) {
      if (prior.kind === "legacy") return this._connectPlainLegacy(transport, options);
      let discover = prior.discover;
      this._resetConnectionState();
      let explicit = this._supportedProtocolVersionsOption;
      let version = (
        explicit && modernProtocolVersions(explicit).length > 0
          ? modernProtocolVersions(explicit)
          : defaultModernVersions
      ).find((v) => discover.supportedVersions.includes(v));
      if (version === undefined)
        throw new SdkError(
          SdkErrorCode.EraNegotiationFailed,
          "connect({ prior }) with a modern verdict requires a 2026-07-28+ mutual protocol version; the supplied DiscoverResult and this client's supportedProtocolVersions have no modern overlap. For a server known to be legacy, pass prior: { kind: 'legacy' } to skip the probe and initialize directly, or use versionNegotiation: { mode: 'auto' } to re-probe with legacy fallback.",
        );
      await super.connect(transport);
      this._discoverResult = discover;
      this._serverCapabilities = discover.capabilities;
      this._serverVersion = serverInfoFromDiscover(discover);
      this._cache.setServerIdentity(this._deriveServerIdentity(transport));
      this._instructions = discover.instructions;
      this._negotiatedProtocolVersion = version;
      transport.setProtocolVersion?.(version);
      if (this._listChangedConfig)
        try {
          this._setupListChangedHandlers(this._listChangedConfig);
        } catch (error) {
          this.onerror?.(error instanceof Error ? error : Error(String(error)));
        }
    }
    getServerCapabilities() {
      return this._serverCapabilities;
    }
    getServerVersion() {
      return this._serverVersion;
    }
    _deriveServerIdentity(transport) {
      let v = this._serverVersion;
      if (v !== undefined) return `${v.name}@${v.version}`;
      return transport.sessionId ?? `anonymous:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    getNegotiatedProtocolVersion() {
      return this._negotiatedProtocolVersion;
    }
    getProtocolEra() {
      let version = this._negotiatedProtocolVersion;
      if (version === undefined) return;
      return isModernProtocolVersion(version) ? "modern" : "legacy";
    }
    getInstructions() {
      return this._instructions;
    }
    getDiscoverResult() {
      return this._discoverResult;
    }
    assertCapabilityForMethod(method) {
      switch (method) {
        case "logging/setLevel":
          if (!this._serverCapabilities?.logging)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Server does not support logging (required for ${method})`,
            );
          break;
        case "prompts/get":
        case "prompts/list":
          if (!this._serverCapabilities?.prompts)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Server does not support prompts (required for ${method})`,
            );
          break;
        case "resources/list":
        case "resources/templates/list":
        case "resources/read":
        case "resources/subscribe":
        case "resources/unsubscribe":
          if (!this._serverCapabilities?.resources)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Server does not support resources (required for ${method})`,
            );
          if (method === "resources/subscribe" && !this._serverCapabilities.resources.subscribe)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Server does not support resource subscriptions (required for ${method})`,
            );
          break;
        case "tools/call":
        case "tools/list":
          if (!this._serverCapabilities?.tools)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Server does not support tools (required for ${method})`,
            );
          break;
        case "completion/complete":
          if (!this._serverCapabilities?.completions)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Server does not support completions (required for ${method})`,
            );
          break;
        case "initialize":
          break;
        case "server/discover":
          break;
        case "ping":
          break;
      }
    }
    assertNotificationCapability(method) {
      switch (method) {
        case "notifications/roots/list_changed":
          if (!this._capabilities.roots?.listChanged)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Client does not support roots list changed notifications (required for ${method})`,
            );
          break;
        case "notifications/initialized":
          break;
        case "notifications/cancelled":
          break;
        case "notifications/progress":
          break;
      }
    }
    assertRequestHandlerCapability(method) {
      switch (method) {
        case "sampling/createMessage":
          if (!this._capabilities.sampling)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Client does not support sampling capability (required for ${method})`,
            );
          break;
        case "elicitation/create":
          if (!this._capabilities.elicitation)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Client does not support elicitation capability (required for ${method})`,
            );
          break;
        case "roots/list":
          if (!this._capabilities.roots)
            throw new SdkError(
              SdkErrorCode.CapabilityNotSupported,
              `Client does not support roots capability (required for ${method})`,
            );
          break;
        case "ping":
          break;
      }
    }
    async ping(options) {
      return this.request(
        {
          method: "ping",
        },
        options,
      );
    }
    async discover(options) {
      let result = await this._requestWithSchema(
        {
          method: "server/discover",
        },
        DiscoverResultSchema,
        options,
      );
      this._discoverResult = result;
      return result;
    }
    async complete(params, options) {
      return this.request(
        {
          method: "completion/complete",
          params,
        },
        options,
      );
    }
    async setLoggingLevel(level, options) {
      return this.request(
        {
          method: "logging/setLevel",
          params: {
            level,
          },
        },
        options,
      );
    }
    async getPrompt(params, options) {
      return this.request(
        {
          method: "prompts/get",
          params,
        },
        options,
      );
    }
    async listPrompts(params, options) {
      if (!this._serverCapabilities?.prompts && !this._enforceStrictCapabilities) {
        console.debug(
          "Client.listPrompts() called but server does not advertise prompts capability - returning empty list",
        );
        return {
          prompts: [],
        };
      }
      if (params?.cursor !== undefined)
        return this.request(
          {
            method: "prompts/list",
            params,
          },
          options,
        );
      let hit = await this._serveFromCache("prompts/list", undefined, options);
      if (hit !== undefined) return hit;
      return this._listAllPages("prompts/list", params, options, (acc, page) =>
        acc.prompts.push(...page.prompts),
      );
    }
    async listResources(params, options) {
      if (!this._serverCapabilities?.resources && !this._enforceStrictCapabilities) {
        console.debug(
          "Client.listResources() called but server does not advertise resources capability - returning empty list",
        );
        return {
          resources: [],
        };
      }
      if (params?.cursor !== undefined)
        return this.request(
          {
            method: "resources/list",
            params,
          },
          options,
        );
      let hit = await this._serveFromCache("resources/list", undefined, options);
      if (hit !== undefined) return hit;
      return this._listAllPages("resources/list", params, options, (acc, page) =>
        acc.resources.push(...page.resources),
      );
    }
    async listResourceTemplates(params, options) {
      if (!this._serverCapabilities?.resources && !this._enforceStrictCapabilities) {
        console.debug(
          "Client.listResourceTemplates() called but server does not advertise resources capability - returning empty list",
        );
        return {
          resourceTemplates: [],
        };
      }
      if (params?.cursor !== undefined)
        return this.request(
          {
            method: "resources/templates/list",
            params,
          },
          options,
        );
      let hit = await this._serveFromCache("resources/templates/list", undefined, options);
      if (hit !== undefined) return hit;
      return this._listAllPages("resources/templates/list", params, options, (acc, page) =>
        acc.resourceTemplates.push(...page.resourceTemplates),
      );
    }
    async _listAllPages(method, baseParams, options, append, finalize) {
      let bypass = options?.cacheMode === "bypass";
      let generation = this._cache.captureGeneration(method);
      let acc = await this.request(
        {
          method,
          ...(baseParams && {
            params: {
              ...baseParams,
            },
          }),
        },
        options,
      );
      let cursor = acc.nextCursor;
      let seen = new Set();
      let pages = 1;
      while (cursor !== undefined && !seen.has(cursor)) {
        if (this._listMaxPages !== 0 && pages >= this._listMaxPages)
          throw new SdkError(
            SdkErrorCode.ListPaginationExceeded,
            `${method}: exceeded listMaxPages (${this._listMaxPages}); server pagination did not terminate`,
            {
              method,
              listMaxPages: this._listMaxPages,
            },
          );
        seen.add(cursor);
        let page = await this.request(
          {
            method,
            params: {
              ...baseParams,
              cursor,
            },
          },
          options,
        );
        append(acc, page);
        cursor = page.nextCursor;
        pages++;
      }
      delete acc.nextCursor;
      finalize?.(acc);
      if (bypass) return acc;
      await this._cache.write(method, acc, generation, this._freshness(acc));
      return acc;
    }
    _freshness(result, params) {
      let body = result;
      let ttlMs = typeof body.ttlMs === "number" ? body.ttlMs : this._defaultCacheTtlMs;
      let scope = body.cacheScope === "public" ? "public" : "private";
      return {
        expiresAt: this._cache.now() + Math.min(Math.max(0, ttlMs), MAX_CACHE_TTL_MS),
        scope,
        params,
      };
    }
    async _serveFromCache(method, params, options) {
      if (options?.cacheMode === "bypass" || options?.cacheMode === "refresh") return;
      let hit = await this._cache.read(method, params).catch((error) => void this._reportStoreError(error));
      if (hit !== undefined) {
        if (options?.signal?.aborted) {
          let reason = options.signal.reason;
          throw reason instanceof SdkError
            ? reason
            : new SdkError(SdkErrorCode.RequestTimeout, String(reason));
        }
        return hit.value;
      }
    }
    _reportStoreError(error) {
      this.onerror?.(error instanceof Error ? error : Error(String(error)));
    }
    _compileOutputValidator(tool) {
      if (!tool.outputSchema) return;
      try {
        return {
          ok: true,
          validator: this._jsonSchemaValidator.getValidator(tool.outputSchema),
        };
      } catch (error) {
        return {
          ok: false,
          compileError: error,
        };
      }
    }
    async _resolveXMcpHeaderScan(name, override) {
      let tool = override ?? (await this._cache.toolDefinition(name));
      return tool === undefined ? undefined : scanXMcpHeaderDeclarations(tool.inputSchema);
    }
    async readResource(params, options) {
      let hit = await this._serveFromCache("resources/read", params.uri, options);
      if (hit !== undefined) return hit;
      let generation = this._cache.captureGeneration("resources/read", params.uri);
      let result = await this.request(
        {
          method: "resources/read",
          params,
        },
        options,
      );
      if (options?.cacheMode !== "bypass") {
        let freshness = this._freshness(result, params.uri);
        if (freshness.expiresAt > this._cache.now())
          await this._cache.write("resources/read", result, generation, freshness);
        else if (options?.cacheMode === "refresh") await this._cache.evictKey("resources/read", params.uri);
      }
      return result;
    }
    async subscribeResource(params, options) {
      return this.request(
        {
          method: "resources/subscribe",
          params,
        },
        options,
      );
    }
    async unsubscribeResource(params, options) {
      return this.request(
        {
          method: "resources/unsubscribe",
          params,
        },
        options,
      );
    }
    async listen(filter, options) {
      if (this.transport === undefined) throw new SdkError(SdkErrorCode.NotConnected, "Not connected");
      let negotiated = this._negotiatedProtocolVersion;
      if (negotiated === undefined || !isModernProtocolVersion(negotiated))
        throw new SdkError(
          SdkErrorCode.MethodNotSupportedByProtocolVersion,
          `subscriptions/listen requires a 2026-07-28-era connection (negotiated: ${negotiated ?? "none"}). On a 2025-era connection, change notifications are delivered unsolicited: use ClientOptions.listChanged and resources/subscribe instead.`,
          {
            method: "subscriptions/listen",
            protocolVersion: negotiated,
          },
        );
      if (options?.signal?.aborted) {
        let reason = options.signal.reason;
        throw reason instanceof SdkError ? reason : new SdkError(SdkErrorCode.RequestTimeout, String(reason));
      }
      let requestAbort = new AbortController();
      let listenId = `listen:${this._nextListenId++}`;
      let state = "opening";
      let ackTimer;
      let onCallerAbort;
      let resolveOpening;
      let rejectOpening;
      let opening = new Promise((resolve, reject) => {
        resolveOpening = resolve;
        rejectOpening = reject;
      });
      opening.catch(() => {});
      let resolveClosed;
      let closed = new Promise((resolve) => {
        resolveClosed = resolve;
      });
      let settle = (outcome) => {
        if (state === "closed") return;
        let wasOpening = state === "opening";
        if (ackTimer !== undefined) {
          clearTimeout(ackTimer);
          ackTimer = undefined;
        }
        if ("ack" in outcome) {
          state = "open";
          resolveOpening(outcome.ack);
          return;
        }
        state = "closed";
        if (onCallerAbort !== undefined) options?.signal?.removeEventListener("abort", onCallerAbort);
        this._listenState.delete(listenId);
        requestAbort.abort();
        resolveClosed(outcome.cause);
        if (wasOpening)
          rejectOpening(
            outcome.error ??
              new SdkError(
                SdkErrorCode.ConnectionClosed,
                "subscriptions/listen closed before the server acknowledged",
              ),
          );
      };
      let wireTeardown = async () => {
        requestAbort.abort();
        await this.notification({
          method: "notifications/cancelled",
          params: {
            requestId: listenId,
          },
        }).catch(() => {});
      };
      let close = async () => {
        if (state === "closed") return;
        settle({
          cause: "local",
        });
        await wireTeardown();
      };
      this._listenState.set(listenId, {
        settle,
      });
      let ackTimeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MSEC;
      ackTimer = setTimeout(() => {
        settle({
          cause: "remote",
          error: new SdkError(SdkErrorCode.RequestTimeout, "subscriptions/listen ack timed out", {
            timeout: ackTimeout,
          }),
        });
        wireTeardown().catch(() => {});
      }, ackTimeout);
      if (options?.signal) {
        let callerSignal = options.signal;
        onCallerAbort = () => {
          if (state === "closed") return;
          let reason = callerSignal.reason;
          settle({
            cause: "local",
            error: reason instanceof Error ? reason : Error(String(reason ?? "Aborted")),
          });
          wireTeardown().catch(() => {});
        };
        callerSignal.addEventListener("abort", onCallerAbort, {
          once: true,
        });
      }
      let jsonrpcRequest = {
        jsonrpc: "2.0",
        id: listenId,
        method: "subscriptions/listen",
        params: {
          _meta: {
            ...this._outboundMetaEnvelope(),
          },
          notifications: filter,
        },
      };
      try {
        await this.transport.send(jsonrpcRequest, {
          requestSignal: requestAbort.signal,
          onRequestStreamEnd: () =>
            settle({
              cause: "remote",
              error: Error("subscriptions/listen: stream ended"),
            }),
        });
      } catch (error) {
        settle({
          cause: "remote",
          error: error instanceof Error ? error : Error(String(error)),
        });
      }
      return {
        honoredFilter: await opening,
        close,
        closed,
      };
    }
    get autoOpenedSubscription() {
      return this._autoOpenedSubscription;
    }
    _onnotification(raw, extra) {
      let evicted = Object.hasOwn(LIST_CHANGED_EVICTIONS, raw.method)
        ? LIST_CHANGED_EVICTIONS[raw.method]
        : undefined;
      if (raw.method === "notifications/resources/updated") {
        let uri = raw.params?.uri;
        if (typeof uri === "string") this._cache.evictKey("resources/read", uri);
      } else if (evicted !== undefined) for (let method of evicted) this._cache.evict(method);
      if (raw.method === "notifications/subscriptions/acknowledged") {
        let subscriptionId = raw.params?._meta?.[SUBSCRIPTION_ID_META_KEY];
        let entry = typeof subscriptionId === "string" ? this._listenState.get(subscriptionId) : undefined;
        if (entry !== undefined) {
          let honored = this._wireCodec().validateNotification(
            "notifications/subscriptions/acknowledged",
            raw,
          );
          entry.settle({
            ack: honored.ok ? honored.value.params.notifications : {},
          });
          return;
        }
      }
      if (raw.method === "notifications/cancelled") {
        let cancelledId = raw.params?.requestId;
        let entry = typeof cancelledId === "string" ? this._listenState.get(cancelledId) : undefined;
        if (entry !== undefined) {
          entry.settle({
            cause: "remote",
            error: Error("subscriptions/listen: server cancelled the subscription"),
          });
          return;
        }
      }
      super._onnotification(raw, extra);
    }
    _onresponse(response) {
      let id = response.id;
      let entry = typeof id === "string" ? this._listenState.get(id) : undefined;
      if (entry !== undefined) {
        if (isJSONRPCErrorResponse(response))
          entry.settle({
            cause: "remote",
            error: ProtocolError.fromError(response.error.code, response.error.message, response.error.data),
          });
        else
          entry.settle({
            cause: "graceful",
            error: new SdkError(
              SdkErrorCode.ConnectionClosed,
              "subscriptions/listen: server closed the subscription gracefully before acknowledging",
            ),
          });
        return;
      }
      super._onresponse(response);
    }
    _onclose() {
      if (this._listenState.size > 0) {
        let reason = new SdkError(SdkErrorCode.ConnectionClosed, "Connection closed");
        for (let entry of this._listenState.values())
          entry.settle({
            cause: "remote",
            error: reason,
          });
        this._listenState.clear();
      }
      super._onclose();
    }
    async callTool(params, options) {
      let mirroringActive = this.getProtocolEra() === "modern" && detectProbeEnvironment() !== "browser";
      let buildSendOptions = async () => {
        if (!mirroringActive) return options;
        let scan;
        try {
          scan = await this._resolveXMcpHeaderScan(params.name, options?.toolDefinition);
        } catch (error) {
          this._reportStoreError(error);
        }
        if (!scan?.valid || scan.declarations.length === 0) return options;
        let paramHeaders = buildMcpParamHeaders(scan.declarations, params.arguments);
        return Object.keys(paramHeaders).length === 0
          ? options
          : {
              ...options,
              headers: {
                ...options?.headers,
                ...paramHeaders,
              },
            };
      };
      let compiled =
        options?.toolDefinition === undefined
          ? await this._cache
              .outputValidator(params.name, (tool) => this._compileOutputValidator(tool))
              .catch((error) => void this._reportStoreError(error))
          : this._compileOutputValidator(options.toolDefinition);
      let assertCompiled = () => {
        if (compiled === undefined || compiled.ok) return;
        let err = compiled.compileError;
        let message = (err instanceof Error ? err.message : String(err)).slice(0, 200);
        throw new ProtocolError(
          ProtocolErrorCode.InvalidParams,
          `Tool '${params.name}' has an invalid outputSchema: ${message}`,
        );
      };
      assertCompiled();
      let result;
      try {
        result = await this.request(
          {
            method: "tools/call",
            params,
          },
          await buildSendOptions(),
        );
      } catch (error) {
        let isHeaderMismatch = error instanceof ProtocolError && error.code === HEADER_MISMATCH_ERROR_CODE;
        if (!mirroringActive || !isHeaderMismatch || options?.toolDefinition !== undefined) throw error;
        let refreshOptions = {
          signal: options?.signal,
          timeout: options?.timeout,
          cacheMode: "refresh",
        };
        await this._cache.evict("tools/list");
        await this.listTools(undefined, refreshOptions).catch((error_) => this._reportStoreError(error_));
        compiled = await this._cache
          .outputValidator(params.name, (tool) => this._compileOutputValidator(tool))
          .catch((error_) => void this._reportStoreError(error_));
        assertCompiled();
        result = await this.request(
          {
            method: "tools/call",
            params,
          },
          await buildSendOptions(),
        );
      }
      if (options?.allowTask === true && result.resultType === "task") return result;
      let validator = compiled !== undefined && compiled.ok ? compiled.validator : undefined;
      if (validator) {
        if (result.structuredContent === undefined && !result.isError)
          throw new ProtocolError(
            ProtocolErrorCode.InvalidRequest,
            `Tool ${params.name} has an output schema but did not return structured content`,
          );
        if (result.structuredContent !== undefined && !result.isError)
          try {
            let validationResult = validator(result.structuredContent);
            if (!validationResult.valid)
              throw new ProtocolError(
                ProtocolErrorCode.InvalidParams,
                `Structured content does not match the tool's output schema: ${validationResult.errorMessage}`,
              );
          } catch (error) {
            if (error instanceof ProtocolError) throw error;
            throw new ProtocolError(
              ProtocolErrorCode.InvalidParams,
              `Failed to validate structured content: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
      }
      return result;
    }
    async listTools(params, options) {
      if (!this._serverCapabilities?.tools && !this._enforceStrictCapabilities) {
        console.debug(
          "Client.listTools() called but server does not advertise tools capability - returning empty list",
        );
        return {
          tools: [],
        };
      }
      if (params?.cursor !== undefined) {
        let page = await this.request(
          {
            method: "tools/list",
            params,
          },
          options,
        );
        this._excludeInvalidXMcpHeaderTools(page);
        return page;
      }
      let hit = await this._serveFromCache("tools/list", undefined, options);
      if (hit !== undefined) return hit;
      return this._listAllPages(
        "tools/list",
        params,
        options,
        (acc, page) => acc.tools.push(...page.tools),
        (acc) => this._excludeInvalidXMcpHeaderTools(acc),
      );
    }
    _excludeInvalidXMcpHeaderTools(result) {
      if (
        this.getProtocolEra() !== "modern" ||
        !this.transport ||
        detectProbeTransportKind(this.transport) === "stdio"
      )
        return;
      try {
        if (!JSON.stringify(result.tools).includes("x-mcp-header")) return;
      } catch {}
      let filtered = result.tools.filter((tool) => {
        let scan = scanXMcpHeaderDeclarations(tool.inputSchema);
        if (!scan.valid) {
          console.warn(
            `[mcp-sdk] excluding tool '${tool.name}' from tools/list: invalid x-mcp-header declaration \u2014 ${scan.reason}`,
          );
          return false;
        }
        return true;
      });
      if (filtered.length !== result.tools.length) result.tools = filtered;
    }
    _setupListChangedHandler(listType, notificationMethod, options, fetcher) {
      let parseResult = parseSchema(ListChangedOptionsBaseSchema, options);
      if (!parseResult.success)
        throw Error(`Invalid ${listType} listChanged options: ${parseResult.error.message}`);
      if (typeof options.onChanged !== "function")
        throw TypeError(`Invalid ${listType} listChanged options: onChanged must be a function`);
      let { autoRefresh, debounceMs } = parseResult.data;
      let { onChanged } = options;
      let refresh = async () => {
        if (!autoRefresh) {
          onChanged(null, null);
          return;
        }
        try {
          onChanged(null, await fetcher());
        } catch (error) {
          onChanged(error instanceof Error ? error : Error(String(error)), null);
        }
      };
      let handler = () => {
        if (debounceMs) {
          let existingTimer = this._listChangedDebounceTimers.get(listType);
          if (existingTimer) clearTimeout(existingTimer);
          let timer = setTimeout(refresh, debounceMs);
          this._listChangedDebounceTimers.set(listType, timer);
        } else refresh();
      };
      this.setNotificationHandler(notificationMethod, handler);
    }
    async sendRootsListChanged() {
      return this.notification({
        method: "notifications/roots/list_changed",
      });
    }
  };
});
//@ chunk-r1g76qsy.js:316569-321626 esm-fingerprint
var SseError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SSEClientTransport;
var DEFAULT_MAX_STEP_UP_RETRIES;
var DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS;
var RESERVED_REQUEST_HEADER_NAMES;
deferInit("chunk-r1g76qsy.js:316569", () => {
  SseError = class extends Error {
    static {
      Object.defineProperty(this, "mcpBrand", {
        value: "mcp.SseError",
      });
    }
    static [Symbol.hasInstance](value) {
      return brandedHasInstance(this, value);
    }
    static isInstance(value) {
      if (typeof this !== "function")
        throw TypeError(
          "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
        );
      return brandedHasInstance(this, value);
    }
    constructor(code, message, event) {
      super(`SSE error: ${message}`);
      this.code = code;
      this.event = event;
      stampErrorBrands(this, new.target);
    }
  };
  SSEClientTransport = class {
    _eventSource;
    _endpoint;
    _abortController;
    _url;
    _resourceMetadataUrl;
    _scope;
    _eventSourceInit;
    _requestInit;
    _authProvider;
    _oauthProvider;
    _skipIssuerMetadataValidation;
    _fetch;
    _fetchWithInit;
    _protocolVersion;
    onclose;
    onerror;
    onmessage;
    constructor(url, opts) {
      this._url = url;
      this._resourceMetadataUrl = undefined;
      this._scope = undefined;
      this._eventSourceInit = opts?.eventSourceInit;
      this._requestInit = opts?.requestInit;
      this._skipIssuerMetadataValidation = opts?.skipIssuerMetadataValidation;
      if (isOAuthClientProvider(opts?.authProvider)) {
        this._oauthProvider = opts.authProvider;
        this._authProvider = adaptOAuthProvider(opts.authProvider, {
          skipIssuerMetadataValidation: opts.skipIssuerMetadataValidation,
        });
      } else this._authProvider = opts?.authProvider;
      this._fetch = opts?.fetch;
      this._fetchWithInit = createFetchWithInit(opts?.fetch, opts?.requestInit);
    }
    _last401Response;
    async _commonHeaders() {
      let headers = {};
      let token = await this._authProvider?.token();
      if (token) headers.Authorization = `Bearer ${token}`;
      if (this._protocolVersion) headers["mcp-protocol-version"] = this._protocolVersion;
      let extraHeaders = normalizeHeaders(this._requestInit?.headers);
      return new Headers({
        ...headers,
        ...extraHeaders,
      });
    }
    _startOrAuth() {
      let fetchImpl = this?._eventSourceInit?.fetch ?? this._fetch ?? fetch;
      return new Promise((resolve, reject) => {
        this._eventSource = new EventSource(this._url.href, {
          ...this._eventSourceInit,
          fetch: async (url, init) => {
            let headers = await this._commonHeaders();
            headers.set("Accept", "text/event-stream");
            let response = await fetchImpl(url, {
              ...init,
              headers,
            });
            if (response.status === 401) {
              this._last401Response = response;
              if (response.headers.has("www-authenticate")) {
                let { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
                this._resourceMetadataUrl = resourceMetadataUrl;
                this._scope = scope;
              }
            }
            return response;
          },
        });
        this._abortController = new AbortController();
        this._eventSource.onerror = (event) => {
          if (event.code === 401 && this._authProvider) {
            if (this._authProvider.onUnauthorized && this._last401Response) {
              let response = this._last401Response;
              this._last401Response = undefined;
              this._eventSource?.close();
              this._authProvider
                .onUnauthorized({
                  response,
                  serverUrl: this._url,
                  fetchFn: this._fetchWithInit,
                })
                .then(
                  () => this._startOrAuth().then(resolve, reject),
                  (error$2) => {
                    this.onerror?.(error$2);
                    reject(error$2);
                  },
                );
              return;
            }
            let error$1 = new UnauthorizedError();
            reject(error$1);
            this.onerror?.(error$1);
            return;
          }
          let error = new SseError(event.code, event.message, event);
          reject(error);
          this.onerror?.(error);
        };
        this._eventSource.onopen = () => {};
        this._eventSource.addEventListener("endpoint", (event) => {
          let messageEvent = event;
          try {
            this._endpoint = new URL(messageEvent.data, this._url);
            if (this._endpoint.origin !== this._url.origin)
              throw Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`);
          } catch (error) {
            reject(error);
            this.onerror?.(error);
            this.close();
            return;
          }
          resolve();
        });
        this._eventSource.onmessage = (event) => {
          let messageEvent = event;
          let message;
          try {
            message = parseJsonRpcMessage(JSON.parse(messageEvent.data));
          } catch (error) {
            this.onerror?.(error);
            return;
          }
          this.onmessage?.(message);
        };
      });
    }
    async start() {
      if (this._eventSource)
        throw Error(
          "SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.",
        );
      return await this._startOrAuth();
    }
    async finishAuth(codeOrParams, iss) {
      if (!this._oauthProvider) throw new UnauthorizedError("finishAuth requires an OAuthClientProvider");
      let { authorizationCode, iss: issParam } = await resolveAuthorizationCallbackParams(
        codeOrParams,
        iss,
        this._oauthProvider,
        this._url,
        {
          fetchFn: this._fetchWithInit,
          resourceMetadataUrl: this._resourceMetadataUrl,
        },
      );
      if (
        (await auth(this._oauthProvider, {
          serverUrl: this._url,
          authorizationCode,
          iss: issParam,
          resourceMetadataUrl: this._resourceMetadataUrl,
          scope: this._scope,
          fetchFn: this._fetchWithInit,
          skipIssuerMetadataValidation: this._skipIssuerMetadataValidation,
        })) !== "AUTHORIZED"
      )
        throw new UnauthorizedError("Failed to authorize");
    }
    async close() {
      this._abortController?.abort();
      this._eventSource?.close();
      this.onclose?.();
    }
    async send(message) {
      return this._send(message, false);
    }
    async _send(message, isAuthRetry) {
      if (!this._endpoint) throw new SdkError(SdkErrorCode.NotConnected, "Not connected");
      try {
        let headers = await this._commonHeaders();
        headers.set("content-type", "application/json");
        let init = {
          ...this._requestInit,
          method: "POST",
          headers,
          body: JSON.stringify(message),
          signal: this._abortController?.signal,
        };
        let response = await (this._fetch ?? fetch)(this._endpoint, init);
        if (!response.ok) {
          if (response.status === 401 && this._authProvider) {
            if (response.headers.has("www-authenticate")) {
              let { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
              this._resourceMetadataUrl = resourceMetadataUrl;
              this._scope = scope;
            }
            if (this._authProvider.onUnauthorized && !isAuthRetry) {
              await this._authProvider.onUnauthorized({
                response,
                serverUrl: this._url,
                fetchFn: this._fetchWithInit,
              });
              await response.text?.().catch(() => {});
              return this._send(message, true);
            }
            await response.text?.().catch(() => {});
            if (isAuthRetry)
              throw new SdkHttpError(
                SdkErrorCode.ClientHttpAuthentication,
                "Server returned 401 after re-authentication",
                {
                  status: 401,
                  statusText: response.statusText,
                },
              );
            throw new UnauthorizedError();
          }
          let text = await response.text?.().catch(() => null);
          throw Error(`Error POSTing to endpoint (HTTP ${response.status}): ${text}`);
        }
        await response.text?.().catch(() => {});
      } catch (error) {
        this.onerror?.(error);
        throw error;
      }
    }
    setProtocolVersion(version) {
      this._protocolVersion = version;
    }
  };
  DEFAULT_MAX_STEP_UP_RETRIES = 1;
  DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS = {
    initialReconnectionDelay: 1000,
    maxReconnectionDelay: 30000,
    reconnectionDelayGrowFactor: 1.5,
    maxRetries: 2,
  };
  RESERVED_REQUEST_HEADER_NAMES = new Set([
    "authorization",
    "content-type",
    "mcp-protocol-version",
    "mcp-method",
    "mcp-name",
    "mcp-session-id",
  ]);
});
//@ chunk-r1g76qsy.js:321626-322076 esm-fingerprint
function anySignal(a_2, b) {
  if (typeof AbortSignal.any === "function") return AbortSignal.any([a_2, b]);
  let controller = new AbortController();
  if (a_2.aborted) {
    controller.abort(a_2.reason);
    return controller.signal;
  }
  if (b.aborted) {
    controller.abort(b.reason);
    return controller.signal;
  }
  let cleanup = () => {
    a_2.removeEventListener("abort", onA);
    b.removeEventListener("abort", onB);
  };
  function onA() {
    cleanup();
    controller.abort(a_2.reason);
  }
  function onB() {
    cleanup();
    controller.abort(b.reason);
  }
  a_2.addEventListener("abort", onA, {
    once: true,
  });
  b.addEventListener("abort", onB, {
    once: true,
  });
  return controller.signal;
}
//@ chunk-r1g76qsy.js:322076-333766 esm-fingerprint
var StreamableHTTPClientTransport = class {
  _abortController;
  _url;
  _resourceMetadataUrl;
  _scope;
  _requestInit;
  _authProvider;
  _oauthProvider;
  _skipIssuerMetadataValidation;
  _fetch;
  _fetchWithInit;
  _sessionId;
  _reconnectionOptions;
  _protocolVersion;
  _onInsufficientScope;
  _maxStepUpRetries;
  _serverRetryMs;
  _reconnectionScheduler;
  _cancelReconnection;
  onclose;
  onerror;
  onmessage;
  hasPerRequestStream = true;
  constructor(url, opts) {
    this._url = url;
    this._resourceMetadataUrl = undefined;
    this._scope = undefined;
    this._requestInit = opts?.requestInit;
    this._skipIssuerMetadataValidation = opts?.skipIssuerMetadataValidation;
    if (isOAuthClientProvider(opts?.authProvider)) {
      this._oauthProvider = opts.authProvider;
      this._authProvider = adaptOAuthProvider(opts.authProvider, {
        skipIssuerMetadataValidation: opts.skipIssuerMetadataValidation,
      });
    } else this._authProvider = opts?.authProvider;
    this._fetch = opts?.fetch;
    this._fetchWithInit = createFetchWithInit(opts?.fetch, opts?.requestInit);
    this._sessionId = opts?.sessionId;
    this._protocolVersion = opts?.protocolVersion;
    this._reconnectionOptions = opts?.reconnectionOptions ?? DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS;
    this._reconnectionScheduler = opts?.reconnectionScheduler;
    this._onInsufficientScope = opts?.onInsufficientScope ?? "reauthorize";
    this._maxStepUpRetries = Math.max(0, opts?.maxStepUpRetries ?? DEFAULT_MAX_STEP_UP_RETRIES);
  }
  async _stepUpAuthorize(challenge, stepUpRetries) {
    if (this._onInsufficientScope === "throw")
      throw new InsufficientScopeError({
        requiredScope: challenge.scope,
        resourceMetadataUrl: challenge.resourceMetadataUrl,
        errorDescription: challenge.errorDescription,
      });
    if (!this._oauthProvider)
      throw new InsufficientScopeError({
        requiredScope: challenge.scope,
        resourceMetadataUrl: challenge.resourceMetadataUrl,
        errorDescription: challenge.errorDescription,
      });
    if (stepUpRetries >= this._maxStepUpRetries)
      throw new SdkHttpError(
        SdkErrorCode.ClientHttpForbidden,
        `Server returned 403 insufficient_scope after step-up re-authorization (retry limit ${this._maxStepUpRetries} reached)`,
        {
          status: 403,
          statusText: challenge.statusText ?? "Forbidden",
          text: challenge.text,
        },
      );
    if (challenge.resourceMetadataUrl) this._resourceMetadataUrl = challenge.resourceMetadataUrl;
    let tokens = await this._oauthProvider.tokens();
    let unionScope = computeScopeUnion(this._scope, tokens?.scope, challenge.scope);
    this._scope = unionScope;
    let forceReauthorization = isStrictScopeSuperset(unionScope, tokens?.scope);
    return auth(this._oauthProvider, {
      serverUrl: this._url,
      resourceMetadataUrl: this._resourceMetadataUrl,
      scope: unionScope,
      forceReauthorization,
      fetchFn: this._fetchWithInit,
      skipIssuerMetadataValidation: this._skipIssuerMetadataValidation,
    });
  }
  async _commonHeaders() {
    let headers = {};
    let token = await this._authProvider?.token();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (this._sessionId) headers["mcp-session-id"] = this._sessionId;
    if (this._protocolVersion) headers["mcp-protocol-version"] = this._protocolVersion;
    let extraHeaders = normalizeHeaders(this._requestInit?.headers);
    return new Headers({
      ...headers,
      ...extraHeaders,
    });
  }
  _applyBodyDerivedHeaders(headers, message) {
    if (Array.isArray(message) || !isJSONRPCRequest(message)) return;
    let envelopeVersion = message.params?._meta?.[PROTOCOL_VERSION_META_KEY];
    if (typeof envelopeVersion !== "string") return;
    headers.set("mcp-protocol-version", envelopeVersion);
    headers.set("mcp-method", message.method);
    let params = message.params;
    let nameHeader =
      message.method === "resources/read"
        ? typeof params?.uri === "string"
          ? params.uri
          : undefined
        : typeof params?.name === "string"
          ? params.name
          : undefined;
    if (nameHeader !== undefined) headers.set("mcp-name", encodeMcpParamValue(nameHeader));
    let taskId =
      message.method.startsWith("tasks/") && typeof params?.taskId === "string" ? params.taskId : undefined;
    if (taskId !== undefined) headers.set("mcp-name", encodeMcpParamValue(taskId));
  }
  _isModernEnvelopedRequest(message) {
    if (Array.isArray(message) || !isJSONRPCRequest(message)) return false;
    let v = message.params?._meta?.[PROTOCOL_VERSION_META_KEY];
    return typeof v === "string" && isModernProtocolVersion(v);
  }
  async _startOrAuthSse(options, isAuthRetry = false, stepUpRetries = 0) {
    let { resumptionToken, requestSignal } = options;
    let isIntentionalAbort = () =>
      this._abortController?.signal.aborted === true || requestSignal?.aborted === true;
    try {
      let headers = await this._commonHeaders();
      let types = [
        ...(headers
          .get("accept")
          ?.split(",")
          .map((s) => s.trim().toLowerCase()) ?? []),
        "text/event-stream",
      ];
      headers.set("accept", [...new Set(types)].join(", "));
      if (resumptionToken) headers.set("last-event-id", resumptionToken);
      let transportSignal = this._abortController?.signal;
      let signal =
        requestSignal !== undefined && transportSignal !== undefined
          ? anySignal(transportSignal, requestSignal)
          : (requestSignal ?? transportSignal);
      let response = await (this._fetch ?? fetch)(this._url, {
        ...this._requestInit,
        method: "GET",
        headers,
        signal,
      });
      if (!response.ok) {
        if (response.status === 401 && this._authProvider) {
          if (response.headers.has("www-authenticate")) {
            let { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
            this._resourceMetadataUrl = resourceMetadataUrl;
            this._scope = computeScopeUnion(this._scope, scope);
          }
          if (this._authProvider.onUnauthorized && !isAuthRetry) {
            await this._authProvider.onUnauthorized({
              response,
              serverUrl: this._url,
              fetchFn: this._fetchWithInit,
            });
            await response.text?.().catch(() => {});
            return this._startOrAuthSse(options, true, stepUpRetries);
          }
          await response.text?.().catch(() => {});
          if (isAuthRetry)
            throw new SdkHttpError(
              SdkErrorCode.ClientHttpAuthentication,
              "Server returned 401 after re-authentication",
              {
                status: 401,
                statusText: response.statusText,
              },
            );
          throw new UnauthorizedError();
        }
        if (response.status === 403) {
          let { resourceMetadataUrl, scope, error, errorDescription } =
            extractWWWAuthenticateParams(response);
          if (error === "insufficient_scope") {
            let text = await response.text?.().catch(() => null);
            if (
              (await this._stepUpAuthorize(
                {
                  scope,
                  resourceMetadataUrl,
                  errorDescription,
                  statusText: response.statusText,
                  text,
                },
                stepUpRetries,
              )) !== "AUTHORIZED"
            )
              throw new UnauthorizedError();
            return this._startOrAuthSse(options, isAuthRetry, stepUpRetries + 1);
          }
        }
        await response.text?.().catch(() => {});
        if (response.status === 405) {
          options.onRequestStreamEnd?.();
          return;
        }
        throw new SdkHttpError(
          SdkErrorCode.ClientHttpFailedToOpenStream,
          `Failed to open SSE stream: ${response.statusText}`,
          {
            status: response.status,
            statusText: response.statusText,
          },
        );
      }
      this._handleSseStream(response.body, options, true);
    } catch (error) {
      if (!isIntentionalAbort()) this.onerror?.(error);
      throw error;
    }
  }
  _getNextReconnectionDelay(attempt) {
    if (this._serverRetryMs !== undefined) return this._serverRetryMs;
    let initialDelay = this._reconnectionOptions.initialReconnectionDelay;
    let growFactor = this._reconnectionOptions.reconnectionDelayGrowFactor;
    let maxDelay = this._reconnectionOptions.maxReconnectionDelay;
    return Math.min(initialDelay * Math.pow(growFactor, attempt), maxDelay);
  }
  _scheduleReconnection(options, attemptCount = 0) {
    let maxRetries = this._reconnectionOptions.maxRetries;
    if (attemptCount >= maxRetries) {
      this.onerror?.(Error(`Maximum reconnection attempts (${maxRetries}) exceeded.`));
      options.onRequestStreamEnd?.();
      return;
    }
    let delay = this._getNextReconnectionDelay(attemptCount);
    let reconnect = () => {
      this._cancelReconnection = undefined;
      if (this._abortController?.signal.aborted || options.requestSignal?.aborted) return;
      this._startOrAuthSse(options).catch((error) => {
        if (this._abortController?.signal.aborted || options.requestSignal?.aborted) return;
        this.onerror?.(
          Error(`Failed to reconnect SSE stream: ${error instanceof Error ? error.message : String(error)}`),
        );
        try {
          this._scheduleReconnection(options, attemptCount + 1);
        } catch (scheduleError) {
          this.onerror?.(scheduleError instanceof Error ? scheduleError : Error(String(scheduleError)));
        }
      });
    };
    if (this._reconnectionScheduler) {
      let cancel = this._reconnectionScheduler(reconnect, delay, attemptCount);
      this._cancelReconnection = typeof cancel === "function" ? cancel : undefined;
    } else {
      let handle = setTimeout(reconnect, delay);
      this._cancelReconnection = () => clearTimeout(handle);
    }
  }
  _handleSseStream(stream, options, isReconnectable) {
    if (!stream) {
      options.onRequestStreamEnd?.();
      return;
    }
    let { onresumptiontoken, replayMessageId, requestSignal, onRequestStreamEnd } = options;
    let isIntentionalAbort = () =>
      this._abortController?.signal.aborted === true || requestSignal?.aborted === true;
    let lastEventId;
    let hasPrimingEvent = false;
    let receivedResponse = false;
    (async () => {
      try {
        let reader = stream
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(
            new EventSourceParserStream({
              onRetry: (retryMs) => {
                this._serverRetryMs = retryMs;
              },
            }),
          )
          .getReader();
        while (true) {
          let { value: event, done } = await reader.read();
          if (done) break;
          if (event.id) {
            lastEventId = event.id;
            hasPrimingEvent = true;
            onresumptiontoken?.(event.id);
          }
          if (!event.data) continue;
          if (!event.event || event.event === "message")
            try {
              let message = parseJsonRpcMessage(JSON.parse(event.data));
              if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
                receivedResponse = true;
                if (replayMessageId !== undefined) message.id = replayMessageId;
              }
              this.onmessage?.(message);
            } catch (error) {
              this.onerror?.(error);
            }
        }
        if (
          (isReconnectable || hasPrimingEvent) &&
          !receivedResponse &&
          this._abortController &&
          !isIntentionalAbort()
        )
          this._scheduleReconnection(
            {
              resumptionToken: lastEventId,
              onresumptiontoken,
              replayMessageId,
              requestSignal,
              onRequestStreamEnd,
            },
            0,
          );
        else if (!isIntentionalAbort()) onRequestStreamEnd?.();
      } catch (error) {
        if (isIntentionalAbort()) return;
        this.onerror?.(Error(`SSE stream disconnected: ${error}`));
        if (
          (isReconnectable || hasPrimingEvent) &&
          !receivedResponse &&
          this._abortController &&
          !isIntentionalAbort()
        )
          try {
            this._scheduleReconnection(
              {
                resumptionToken: lastEventId,
                onresumptiontoken,
                replayMessageId,
                requestSignal,
                onRequestStreamEnd,
              },
              0,
            );
          } catch (error$1) {
            this.onerror?.(
              Error(`Failed to reconnect: ${error$1 instanceof Error ? error$1.message : String(error$1)}`),
            );
            onRequestStreamEnd?.();
          }
        else onRequestStreamEnd?.();
      }
    })();
  }
  async start() {
    if (this._abortController)
      throw Error(
        "StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    this._abortController = new AbortController();
  }
  async finishAuth(codeOrParams, iss) {
    if (!this._oauthProvider) throw new UnauthorizedError("finishAuth requires an OAuthClientProvider");
    let { authorizationCode, iss: issParam } = await resolveAuthorizationCallbackParams(
      codeOrParams,
      iss,
      this._oauthProvider,
      this._url,
      {
        fetchFn: this._fetchWithInit,
        resourceMetadataUrl: this._resourceMetadataUrl,
      },
    );
    if (
      (await auth(this._oauthProvider, {
        serverUrl: this._url,
        authorizationCode,
        iss: issParam,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit,
        skipIssuerMetadataValidation: this._skipIssuerMetadataValidation,
      })) !== "AUTHORIZED"
    )
      throw new UnauthorizedError("Failed to authorize");
  }
  async close() {
    try {
      this._cancelReconnection?.();
    } finally {
      this._cancelReconnection = undefined;
      this._abortController?.abort();
      this.onclose?.();
    }
  }
  async send(message, options) {
    return this._send(message, options, false);
  }
  async _send(message, options, isAuthRetry, stepUpRetries = 0) {
    try {
      let { resumptionToken, onresumptiontoken } = options || {};
      if (resumptionToken) {
        this._startOrAuthSse({
          resumptionToken,
          replayMessageId: isJSONRPCRequest(message) ? message.id : undefined,
          requestSignal: options?.requestSignal,
        }).catch((error) => this.onerror?.(error));
        return;
      }
      let headers = await this._commonHeaders();
      this._applyBodyDerivedHeaders(headers, message);
      let isHandshake = Array.isArray(message)
        ? message.some((m) => isInitializeMessage(m))
        : isInitializeMessage(message);
      if (isHandshake) headers.delete("mcp-session-id");
      if (options?.headers !== undefined)
        for (let [name, value] of Object.entries(options.headers)) {
          if (RESERVED_REQUEST_HEADER_NAMES.has(name.toLowerCase())) continue;
          headers.set(name, value);
        }
      headers.set("content-type", "application/json");
      let types = [
        ...(headers
          .get("accept")
          ?.split(",")
          .map((s) => s.trim().toLowerCase()) ?? []),
        "application/json",
        "text/event-stream",
      ];
      headers.set("accept", [...new Set(types)].join(", "));
      let transportSignal = this._abortController?.signal;
      let signal =
        options?.requestSignal !== undefined && transportSignal !== undefined
          ? anySignal(transportSignal, options.requestSignal)
          : (options?.requestSignal ?? transportSignal);
      let init = {
        ...this._requestInit,
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal,
      };
      let response = await (this._fetch ?? fetch)(this._url, init);
      if (isHandshake && response.ok) this._sessionId = response.headers.get("mcp-session-id") || undefined;
      if (!response.ok) {
        if (response.status === 401 && this._authProvider) {
          if (response.headers.has("www-authenticate")) {
            let { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
            this._resourceMetadataUrl = resourceMetadataUrl;
            this._scope = computeScopeUnion(this._scope, scope);
          }
          if (this._authProvider.onUnauthorized && !isAuthRetry) {
            await this._authProvider.onUnauthorized({
              response,
              serverUrl: this._url,
              fetchFn: this._fetchWithInit,
            });
            await response.text?.().catch(() => {});
            return this._send(message, options, true, stepUpRetries);
          }
          await response.text?.().catch(() => {});
          if (isAuthRetry)
            throw new SdkHttpError(
              SdkErrorCode.ClientHttpAuthentication,
              "Server returned 401 after re-authentication",
              {
                status: 401,
                statusText: response.statusText,
              },
            );
          throw new UnauthorizedError();
        }
        let text = await response.text?.().catch(() => null);
        if (response.status === 403) {
          let { resourceMetadataUrl, scope, error, errorDescription } =
            extractWWWAuthenticateParams(response);
          if (error === "insufficient_scope") {
            if (
              (await this._stepUpAuthorize(
                {
                  scope,
                  resourceMetadataUrl,
                  errorDescription,
                  statusText: response.statusText,
                  text,
                },
                stepUpRetries,
              )) !== "AUTHORIZED"
            )
              throw new UnauthorizedError();
            return this._send(message, options, isAuthRetry, stepUpRetries + 1);
          }
        }
        if (response.status === 400 && typeof text === "string" && this._isModernEnvelopedRequest(message))
          try {
            let parsed = parseJsonRpcMessage(JSON.parse(text));
            let requests = (Array.isArray(message) ? message : [message]).filter((m) => isJSONRPCRequest(m));
            if (isJSONRPCErrorResponse(parsed) && requests.some((r) => r.id === parsed.id)) {
              this.onmessage?.(parsed);
              return;
            }
          } catch {}
        throw new SdkHttpError(SdkErrorCode.ClientHttpNotImplemented, `Error POSTing to endpoint: ${text}`, {
          status: response.status,
          statusText: response.statusText,
          text,
        });
      }
      if (response.status === 202) {
        await response.text?.().catch(() => {});
        if (isInitializedNotification(message))
          this._startOrAuthSse({
            resumptionToken: undefined,
          }).catch((error) => this.onerror?.(error));
        return;
      }
      let hasRequests = (Array.isArray(message) ? message : [message]).some(
        (msg) => "method" in msg && "id" in msg && msg.id !== undefined,
      );
      let contentType = response.headers.get("content-type");
      let responseMediaType = parseContentType(contentType);
      if (hasRequests) {
        if (responseMediaType === "text/event-stream")
          this._handleSseStream(
            response.body,
            {
              onresumptiontoken,
              requestSignal: options?.requestSignal,
              onRequestStreamEnd: options?.onRequestStreamEnd,
            },
            false,
          );
        else if (responseMediaType === "application/json") {
          let data = await response.json();
          let responseMessages = Array.isArray(data)
            ? data.map((msg) => parseJsonRpcMessage(msg))
            : [parseJsonRpcMessage(data)];
          for (let msg of responseMessages) this.onmessage?.(msg);
        } else {
          await response.text?.().catch(() => {});
          throw new SdkError(
            SdkErrorCode.ClientHttpUnexpectedContent,
            `Unexpected content type: ${contentType}`,
            {
              contentType,
            },
          );
        }
      } else await response.text?.().catch(() => {});
    } catch (error) {
      if (options?.requestSignal?.aborted !== true) this.onerror?.(error);
      throw error;
    }
  }
  get sessionId() {
    return this._sessionId;
  }
  async terminateSession() {
    if (!this._sessionId) return;
    try {
      let headers = await this._commonHeaders();
      let init = {
        ...this._requestInit,
        method: "DELETE",
        headers,
        signal: this._abortController?.signal,
      };
      let response = await (this._fetch ?? fetch)(this._url, init);
      await response.text?.().catch(() => {});
      if (!response.ok && response.status !== 405)
        throw new SdkHttpError(
          SdkErrorCode.ClientHttpFailedToTerminateSession,
          `Failed to terminate session: ${response.statusText}`,
          {
            status: response.status,
            statusText: response.statusText,
          },
        );
      this._sessionId = undefined;
    } catch (error) {
      this.onerror?.(error);
      throw error;
    }
  }
  setProtocolVersion(version) {
    this._protocolVersion = version;
  }
  get protocolVersion() {
    return this._protocolVersion;
  }
  async resumeStream(lastEventId, options) {
    await this._startOrAuthSse({
      resumptionToken: lastEventId,
      onresumptiontoken: options?.onresumptiontoken,
    });
  }
};
//@ chunk-n1aavqzh.js:4420-5535 esm-fingerprint
/**
 * requestJwtAuthorizationGrant（v2 副本）。
 */
async function exchangeIdTokenForJag_2(opts) {
  let fetchFn = opts.fetchFn ?? defaultXaaFetch_2;
  let params = new URLSearchParams({
    grant_type: TOKEN_EXCHANGE_GRANT_2,
    requested_token_type: ID_JAG_TOKEN_TYPE_2,
    audience: opts.audience,
    resource: opts.resource,
    subject_token: opts.idToken,
    subject_token_type: ID_TOKEN_TYPE_2,
    client_id: opts.clientId,
  });
  if (opts.clientSecret) params.set("client_secret", opts.clientSecret);
  if (opts.scope) params.set("scope", opts.scope);
  let res = await fetchFn(opts.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    let body = redactTokens_2(await res.text()).slice(0, 200);
    let shouldClear = res.status < 500;
    throw new XaaTokenExchangeError_2(`XAA: token exchange failed: HTTP ${res.status}: ${body}`, shouldClear);
  }
  let rawExchange;
  try {
    rawExchange = await res.json();
  } catch {
    throw new XaaTokenExchangeError_2(
      `XAA: token exchange returned non-JSON (captive portal?) at ${redactUrlSecrets(opts.tokenEndpoint)}`,
      false,
    );
  }
  let exchangeParsed = TokenExchangeResponseSchema_2().safeParse(rawExchange);
  if (!exchangeParsed.success)
    throw new XaaTokenExchangeError_2(
      `XAA: token exchange response did not match expected shape: ${redactTokens_2(rawExchange)}`,
      true,
    );
  let result = exchangeParsed.data;
  if (!result.access_token)
    throw new XaaTokenExchangeError_2(
      `XAA: token exchange response missing access_token: ${redactTokens_2(result)}`,
      true,
    );
  if (result.issued_token_type !== ID_JAG_TOKEN_TYPE_2)
    throw new XaaTokenExchangeError_2(
      `XAA: token exchange returned unexpected issued_token_type: ${result.issued_token_type}`,
      true,
    );
  return {
    jwtAuthGrant: result.access_token,
    expiresIn: result.expires_in,
    scope: result.scope,
  };
}
//@ chunk-1kaj6e83.js:4349-5464 esm-fingerprint
/**
 * requestJwtAuthorizationGrant：RFC 8693 token exchange（subject_token=id_token，requested_token_type=id-jag），失败抛 XaaTokenExchangeError（4xx 时 shouldClearIdToken）。
 */
async function exchangeIdTokenForJag(opts) {
  let fetchFn = opts.fetchFn ?? defaultXaaFetch;
  let params = new URLSearchParams({
    grant_type: TOKEN_EXCHANGE_GRANT,
    requested_token_type: ID_JAG_TOKEN_TYPE,
    audience: opts.audience,
    resource: opts.resource,
    subject_token: opts.idToken,
    subject_token_type: ID_TOKEN_TYPE,
    client_id: opts.clientId,
  });
  if (opts.clientSecret) params.set("client_secret", opts.clientSecret);
  if (opts.scope) params.set("scope", opts.scope);
  let res = await fetchFn(opts.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    let body = redactTokens(await res.text()).slice(0, 200);
    let shouldClear = res.status < 500;
    throw new XaaTokenExchangeError(`XAA: token exchange failed: HTTP ${res.status}: ${body}`, shouldClear);
  }
  let rawExchange;
  try {
    rawExchange = await res.json();
  } catch {
    throw new XaaTokenExchangeError(
      `XAA: token exchange returned non-JSON (captive portal?) at ${redactUrlSecrets(opts.tokenEndpoint)}`,
      false,
    );
  }
  let exchangeParsed = TokenExchangeResponseSchema().safeParse(rawExchange);
  if (!exchangeParsed.success)
    throw new XaaTokenExchangeError(
      `XAA: token exchange response did not match expected shape: ${redactTokens(rawExchange)}`,
      true,
    );
  let result = exchangeParsed.data;
  if (!result.access_token)
    throw new XaaTokenExchangeError(
      `XAA: token exchange response missing access_token: ${redactTokens(result)}`,
      true,
    );
  if (result.issued_token_type !== ID_JAG_TOKEN_TYPE)
    throw new XaaTokenExchangeError(
      `XAA: token exchange returned unexpected issued_token_type: ${result.issued_token_type}`,
      true,
    );
  return {
    jwtAuthGrant: result.access_token,
    expiresIn: result.expires_in,
    scope: result.scope,
  };
}
//@ chunk-1ny7cxrt.js:1387514-1387570 esm-fingerprint
var LOOPBACK_HOSTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1ny7cxrt.js:1387514", () => {
  LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
});
export {
  UnauthorizedError,
  StreamableHTTPClientTransport,
  SSEClientTransport,
  Client,
  SseError,
  exchangeIdTokenForJag,
  discoverOAuthProtectedResourceMetadata,
  discoverAuthorizationServerMetadata,
  exchangeIdTokenForJag_2,
  IssuerMismatchError,
  RegistrationRejectedError,
  discoverOAuthServerInfo,
  auth,
  extractWWWAuthenticateParams,
  refreshAuthorization,
  LOOPBACK_HOSTS,
  startAuthorization,
  exchangeAuthorization,
};

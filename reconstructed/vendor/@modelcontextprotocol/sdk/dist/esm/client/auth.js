/**
 * @modelcontextprotocol/sdk/dist/esm/client/auth.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-9z4e25ww.js (31)
 * attribution: esm-fingerprint 29, esm-layout 2
 */
import {
  OAuthErrorResponseSchema,
  OAuthProtectedResourceMetadataSchema,
  OAuthMetadataSchema,
  OpenIdProviderDiscoveryMetadataSchema,
  OAuthTokensSchema,
  OAuthClientInformationFullSchema,
} from "../shared/auth.js";
import {
  OAUTH_ERRORS,
  ServerError,
  InvalidClientError,
  UnauthorizedClientError,
  InvalidGrantError,
  InvalidClientMetadataError,
  OAuthError,
} from "../server/auth/errors.js";
import { resourceUrlFromServerUrl, checkResourceAllowed } from "../shared/auth-utils.js";
import { LATEST_PROTOCOL_VERSION } from "../types.js";
import { pkceChallenge } from "../../../../../pkce-challenge/dist/index.node.js";

//@ chunk-9z4e25ww.js:6666-6730 esm-fingerprint
class UnauthorizedError extends Error {
  constructor(message) {
    super(message ?? "Unauthorized");
  }
}
//@ chunk-9z4e25ww.js:6730-6815 esm-fingerprint
function isClientAuthMethod(method) {
  return ["client_secret_basic", "client_secret_post", "none"].includes(method);
}
//@ chunk-9z4e25ww.js:6815-6837 esm-fingerprint
var AUTHORIZATION_CODE_RESPONSE_TYPE = "code";
var AUTHORIZATION_CODE_CHALLENGE_METHOD = "S256";
//@ chunk-9z4e25ww.js:6837-7339 esm-fingerprint
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
//@ chunk-9z4e25ww.js:7339-7587 esm-fingerprint
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
//@ chunk-9z4e25ww.js:7587-7747 esm-fingerprint
function applyBasicAuth(clientId, clientSecret, headers) {
  if (!clientSecret) throw Error("client_secret_basic authentication requires a client_secret");
  let credentials = btoa(`${clientId}:${clientSecret}`);
  headers.set("Authorization", `Basic ${credentials}`);
}
//@ chunk-9z4e25ww.js:7747-7817 esm-fingerprint
function applyPostAuth(clientId, clientSecret, params) {
  params.set("client_id", clientId);
  if (clientSecret) params.set("client_secret", clientSecret);
}
//@ chunk-9z4e25ww.js:7817-7855 esm-fingerprint
function applyPublicAuth(clientId, params) {
  params.set("client_id", clientId);
}
//@ chunk-9z4e25ww.js:7855-8178 esm-fingerprint
async function parseErrorResponse(input) {
  let statusCode = input instanceof Response ? input.status : undefined;
  let body = input instanceof Response ? await input.text() : input;
  try {
    let result = OAuthErrorResponseSchema.parse(JSON.parse(body));
    let { error, error_description, error_uri } = result;
    return new (OAUTH_ERRORS[error] || ServerError)(error_description || "", error_uri);
  } catch (error) {
    let errorMessage = `${statusCode ? `HTTP ${statusCode}: ` : ""}Invalid OAuth error response: ${error}. Raw body: ${body}`;
    return new ServerError(errorMessage);
  }
}
//@ chunk-9z4e25ww.js:8178-8424 esm-fingerprint
async function auth(provider, options) {
  try {
    return await authInternal(provider, options);
  } catch (error) {
    if (error instanceof InvalidClientError || error instanceof UnauthorizedClientError) {
      await provider.invalidateCredentials?.("all");
      return await authInternal(provider, options);
    } else if (error instanceof InvalidGrantError) {
      await provider.invalidateCredentials?.("tokens");
      return await authInternal(provider, options);
    }
    throw error;
  }
}
//@ chunk-9z4e25ww.js:8424-10757 esm-fingerprint
async function authInternal(provider, { serverUrl, authorizationCode, scope, resourceMetadataUrl, fetchFn }) {
  let cachedState = await provider.discoveryState?.();
  let resourceMetadata;
  let authorizationServerUrl;
  let metadata;
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
      } catch {}
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
    });
    authorizationServerUrl = serverInfo.authorizationServerUrl;
    metadata = serverInfo.authorizationServerMetadata;
    resourceMetadata = serverInfo.resourceMetadata;
    await provider.saveDiscoveryState?.({
      authorizationServerUrl: String(authorizationServerUrl),
      resourceMetadataUrl: effectiveResourceMetadataUrl?.toString(),
      resourceMetadata,
      authorizationServerMetadata: metadata,
    });
  }
  let resource = await selectResourceURL(serverUrl, provider, resourceMetadata);
  let resolvedScope = scope || resourceMetadata?.scopes_supported?.join(" ") || provider.clientMetadata.scope;
  let clientInformation = await Promise.resolve(provider.clientInformation());
  if (!clientInformation) {
    if (authorizationCode !== undefined)
      throw Error("Existing OAuth client information is required when exchanging an authorization code");
    let supportsUrlBasedClientId = metadata?.client_id_metadata_document_supported === true;
    let clientMetadataUrl = provider.clientMetadataUrl;
    if (clientMetadataUrl && !isHttpsUrl(clientMetadataUrl))
      throw new InvalidClientMetadataError(
        `clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${clientMetadataUrl}`,
      );
    if (supportsUrlBasedClientId && clientMetadataUrl) {
      clientInformation = {
        client_id: clientMetadataUrl,
      };
      await provider.saveClientInformation?.(clientInformation);
    } else {
      if (!provider.saveClientInformation)
        throw Error("OAuth client information must be saveable for dynamic registration");
      let fullInformation = await registerClient(authorizationServerUrl, {
        metadata,
        clientMetadata: provider.clientMetadata,
        scope: resolvedScope,
        fetchFn,
      });
      await provider.saveClientInformation(fullInformation);
      clientInformation = fullInformation;
    }
  }
  let nonInteractiveFlow = !provider.redirectUrl;
  if (authorizationCode !== undefined || nonInteractiveFlow) {
    let tokens = await fetchToken(provider, authorizationServerUrl, {
      metadata,
      resource,
      authorizationCode,
      fetchFn,
    });
    await provider.saveTokens(tokens);
    return "AUTHORIZED";
  }
  let tokens = await provider.tokens();
  if (tokens?.refresh_token)
    try {
      let newTokens = await refreshAuthorization(authorizationServerUrl, {
        metadata,
        clientInformation,
        refreshToken: tokens.refresh_token,
        resource,
        addClientAuthentication: provider.addClientAuthentication,
        fetchFn,
      });
      await provider.saveTokens(newTokens);
      return "AUTHORIZED";
    } catch (error) {
      if (!(error instanceof OAuthError) || error instanceof ServerError);
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
//@ chunk-9z4e25ww.js:10757-10871 esm-fingerprint
function isHttpsUrl(value) {
  if (!value) return false;
  try {
    let url = new URL(value);
    return url.protocol === "https:" && url.pathname !== "/";
  } catch {
    return false;
  }
}
//@ chunk-9z4e25ww.js:10871-11170 esm-fingerprint
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
//@ chunk-9z4e25ww.js:11170-11472 esm-fingerprint
function extractWWWAuthenticateParams(res) {
  let authenticateHeader = res.headers.get("WWW-Authenticate");
  if (!authenticateHeader) return {};
  let [type, scheme] = authenticateHeader.split(" ");
  if (type.toLowerCase() !== "bearer" || !scheme) return {};
  let resourceMetadataMatch = extractFieldFromWwwAuth(res, "resource_metadata") || undefined;
  let resourceMetadataUrl;
  if (resourceMetadataMatch)
    try {
      resourceMetadataUrl = new URL(resourceMetadataMatch);
    } catch {}
  let scope = extractFieldFromWwwAuth(res, "scope") || undefined;
  let error = extractFieldFromWwwAuth(res, "error") || undefined;
  return {
    resourceMetadataUrl,
    scope,
    error,
  };
}
//@ chunk-9z4e25ww.js:11472-11644 esm-fingerprint
function extractFieldFromWwwAuth(response, fieldName) {
  let wwwAuthHeader = response.headers.get("WWW-Authenticate");
  if (!wwwAuthHeader) return null;
  let pattern = new RegExp(`${fieldName}=(?:"([^"]+)"|([^\\s,]+))`);
  let match = wwwAuthHeader.match(pattern);
  if (match) return match[1] || match[2];
  return null;
}
//@ chunk-9z4e25ww.js:11644-12086 esm-fingerprint
async function discoverOAuthProtectedResourceMetadata(serverUrl, opts, fetchFn = fetch) {
  let response = await discoverMetadataWithFallback(serverUrl, "oauth-protected-resource", fetchFn, {
    protocolVersion: opts?.protocolVersion,
    metadataUrl: opts?.resourceMetadataUrl,
  });
  if (!response || response.status === 404) {
    await response?.body?.cancel();
    throw Error("Resource server does not implement OAuth 2.0 Protected Resource Metadata.");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw Error(`HTTP ${response.status} trying to load well-known OAuth protected resource metadata.`);
  }
  return OAuthProtectedResourceMetadataSchema.parse(await response.json());
}
//@ chunk-9z4e25ww.js:12086-12232 esm-layout
async function fetchWithCorsRetry(url, headers, fetchFn = fetch) {
  try {
    return await fetchFn(url, {
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError)
      if (headers) return fetchWithCorsRetry(url, undefined, fetchFn);
      else return;
    throw error;
  }
}
//@ chunk-9z4e25ww.js:12232-12365 esm-fingerprint
function buildWellKnownPath(wellKnownPrefix, pathname = "", options = {}) {
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return options.prependPathname
    ? `${pathname}/.well-known/${wellKnownPrefix}`
    : `/.well-known/${wellKnownPrefix}${pathname}`;
}
//@ chunk-9z4e25ww.js:12365-12442 esm-fingerprint
async function tryMetadataDiscovery(url, protocolVersion, fetchFn = fetch) {
  return await fetchWithCorsRetry(
    url,
    {
      "MCP-Protocol-Version": protocolVersion,
    },
    fetchFn,
  );
}
//@ chunk-9z4e25ww.js:12442-12506 esm-layout
function shouldAttemptFallback(response, pathname) {
  return !response || (response.status >= 400 && response.status < 500 && pathname !== "/");
}
//@ chunk-9z4e25ww.js:12506-12826 esm-fingerprint
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
  if (!opts?.metadataUrl && shouldAttemptFallback(response, issuer.pathname)) {
    let rootUrl = new URL(`/.well-known/${wellKnownType}`, issuer);
    response = await tryMetadataDiscovery(rootUrl, protocolVersion, fetchFn);
  }
  return response;
}
//@ chunk-9z4e25ww.js:12826-13406 esm-fingerprint
function buildDiscoveryUrls(authorizationServerUrl) {
  let url =
    typeof authorizationServerUrl === "string" ? new URL(authorizationServerUrl) : authorizationServerUrl;
  let hasPath = url.pathname !== "/";
  let urlsToTry = [];
  if (!hasPath) {
    urlsToTry.push({
      url: new URL("/.well-known/oauth-authorization-server", url.origin),
      type: "oauth",
    });
    urlsToTry.push({
      url: new URL("/.well-known/openid-configuration", url.origin),
      type: "oidc",
    });
    return urlsToTry;
  }
  let pathname = url.pathname;
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  urlsToTry.push({
    url: new URL(`/.well-known/oauth-authorization-server${pathname}`, url.origin),
    type: "oauth",
  });
  urlsToTry.push({
    url: new URL(`/.well-known/openid-configuration${pathname}`, url.origin),
    type: "oidc",
  });
  urlsToTry.push({
    url: new URL(`${pathname}/.well-known/openid-configuration`, url.origin),
    type: "oidc",
  });
  return urlsToTry;
}
//@ chunk-9z4e25ww.js:13406-13874 esm-fingerprint
async function discoverAuthorizationServerMetadata(
  authorizationServerUrl,
  { fetchFn = fetch, protocolVersion = LATEST_PROTOCOL_VERSION } = {},
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
      await response.body?.cancel();
      if (response.status >= 400 && response.status < 500) continue;
      throw Error(
        `HTTP ${response.status} trying to load ${type === "oauth" ? "OAuth" : "OpenID provider"} metadata from ${endpointUrl}`,
      );
    }
    if (type === "oauth") return OAuthMetadataSchema.parse(await response.json());
    else return OpenIdProviderDiscoveryMetadataSchema.parse(await response.json());
  }
  return;
}
//@ chunk-9z4e25ww.js:13874-14231 esm-fingerprint
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
  } catch {}
  if (!authorizationServerUrl) authorizationServerUrl = String(new URL("/", serverUrl));
  let authorizationServerMetadata = await discoverAuthorizationServerMetadata(authorizationServerUrl, {
    fetchFn: opts?.fetchFn,
  });
  return {
    authorizationServerUrl,
    authorizationServerMetadata,
    resourceMetadata,
  };
}
//@ chunk-9z4e25ww.js:14231-15195 esm-fingerprint
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
  if (scope?.includes("offline_access")) authorizationUrl.searchParams.append("prompt", "consent");
  if (resource) authorizationUrl.searchParams.set("resource", resource.href);
  return {
    authorizationUrl,
    codeVerifier,
  };
}
//@ chunk-9z4e25ww.js:15195-15321 esm-fingerprint
function prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, redirectUri) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    code_verifier: codeVerifier,
    redirect_uri: String(redirectUri),
  });
}
//@ chunk-9z4e25ww.js:15321-15859 esm-fingerprint
async function executeTokenRequest(
  authorizationServerUrl,
  { metadata, tokenRequestParams, clientInformation, addClientAuthentication, resource, fetchFn },
) {
  let tokenUrl = metadata?.token_endpoint
    ? new URL(metadata.token_endpoint)
    : new URL("/token", authorizationServerUrl);
  let headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  });
  if (resource) tokenRequestParams.set("resource", resource.href);
  if (addClientAuthentication) await addClientAuthentication(headers, tokenRequestParams, tokenUrl, metadata);
  else if (clientInformation) {
    let supportedMethods = metadata?.token_endpoint_auth_methods_supported ?? [];
    let authMethod = selectClientAuthMethod(clientInformation, supportedMethods);
    applyClientAuthentication(authMethod, clientInformation, headers, tokenRequestParams);
  }
  let response = await (fetchFn ?? fetch)(tokenUrl, {
    method: "POST",
    headers,
    body: tokenRequestParams,
  });
  if (!response.ok) throw await parseErrorResponse(response);
  return OAuthTokensSchema.parse(await response.json());
}
//@ chunk-9z4e25ww.js:15859-16138 esm-fingerprint
async function exchangeAuthorization(
  authorizationServerUrl,
  {
    metadata,
    clientInformation,
    authorizationCode,
    codeVerifier,
    redirectUri,
    resource,
    addClientAuthentication,
    fetchFn,
  },
) {
  let tokenRequestParams = prepareAuthorizationCodeRequest(authorizationCode, codeVerifier, redirectUri);
  return executeTokenRequest(authorizationServerUrl, {
    metadata,
    tokenRequestParams,
    clientInformation,
    addClientAuthentication,
    resource,
    fetchFn,
  });
}
//@ chunk-9z4e25ww.js:16138-16470 esm-fingerprint
async function refreshAuthorization(
  authorizationServerUrl,
  { metadata, clientInformation, refreshToken, resource, addClientAuthentication, fetchFn },
) {
  let tokenRequestParams = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  let tokens = await executeTokenRequest(authorizationServerUrl, {
    metadata,
    tokenRequestParams,
    clientInformation,
    addClientAuthentication,
    resource,
    fetchFn,
  });
  return {
    refresh_token: refreshToken,
    ...tokens,
  };
}
//@ chunk-9z4e25ww.js:16470-17054 esm-fingerprint
async function fetchToken(
  provider,
  authorizationServerUrl,
  { metadata, resource, authorizationCode, fetchFn } = {},
) {
  let scope = provider.clientMetadata.scope;
  let tokenRequestParams;
  if (provider.prepareTokenRequest) tokenRequestParams = await provider.prepareTokenRequest(scope);
  if (!tokenRequestParams) {
    if (!authorizationCode)
      throw Error("Either provider.prepareTokenRequest() or authorizationCode is required");
    if (!provider.redirectUrl) throw Error("redirectUrl is required for authorization_code flow");
    let codeVerifier = await provider.codeVerifier();
    tokenRequestParams = prepareAuthorizationCodeRequest(
      authorizationCode,
      codeVerifier,
      provider.redirectUrl,
    );
  }
  let clientInformation = await provider.clientInformation();
  return executeTokenRequest(authorizationServerUrl, {
    metadata,
    tokenRequestParams,
    clientInformation: clientInformation ?? undefined,
    addClientAuthentication: provider.addClientAuthentication,
    resource,
    fetchFn,
  });
}
//@ chunk-9z4e25ww.js:17054-17511 esm-fingerprint
async function registerClient(authorizationServerUrl, { metadata, clientMetadata, scope, fetchFn }) {
  let registrationUrl;
  if (metadata) {
    if (!metadata.registration_endpoint)
      throw Error("Incompatible auth server: does not support dynamic client registration");
    registrationUrl = new URL(metadata.registration_endpoint);
  } else registrationUrl = new URL("/register", authorizationServerUrl);
  let response = await (fetchFn ?? fetch)(registrationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...clientMetadata,
      ...(scope !== undefined
        ? {
            scope,
          }
        : {}),
    }),
  });
  if (!response.ok) throw await parseErrorResponse(response);
  return OAuthClientInformationFullSchema.parse(await response.json());
}
export {
  UnauthorizedError,
  discoverOAuthProtectedResourceMetadata,
  discoverAuthorizationServerMetadata,
  discoverOAuthServerInfo,
  auth,
  extractWWWAuthenticateParams,
  refreshAuthorization,
  startAuthorization,
  exchangeAuthorization,
};

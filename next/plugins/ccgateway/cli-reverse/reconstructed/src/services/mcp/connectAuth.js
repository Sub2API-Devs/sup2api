/**
 * services/mcp/connectAuth.ts
 *
 * 2.1.316 新增。MCP 连接时的认证处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h44h5gdv.js (31)
 * attribution: placement 31
 */
import { randomUUID } from "crypto";
import { isToolDetailsLoggingEnabled, THIRD_PARTY } from "../analytics/metadata.js";
import { parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";
import {
  isAnthropicPluginSource,
  getTelemetryPluginScope,
  pluginIdHash,
  buildPluginSourceFields,
} from "../../utils/telemetry/pluginTelemetry.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { sanitizeConnectErrorCodeForTelemetry_2 } from "./discovery.js";
import { isLegacyProtocolEra } from "./connectionRegistry.js";
import { ZodError } from "../../../vendor/zod/v4/classic/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import {
  mcpBaseUrlAnalytics,
  setMcpAuthCacheEntry,
  NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS,
  serverCacheKey,
} from "./client.js";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import {
  hasStoredRefreshToken,
  isDesignMcpUrl,
  configHasAuthorizationHeader,
  isFirstPartyMcpUrl,
} from "./auth.js";
import { isCurrentIdentityEpoch } from "./identityChange.js";
import { getConnectionCache } from "./needsAuthCache.js";
import { logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { isDiscoveryCacheUsable } from "./mcpAccountKey.js";
import { flushDiscoveryCache, deleteDiscoveryCache } from "./discoveryCache.js";
import { mcpSdkGeneration } from "./mcpSdkGeneration.js";
import { UnauthorizedError } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { recordTokenlessRejection, handleRejectedToken } from "./signedOutFallback.js";
import { sanitizeErrorDetail } from "../api/deferredToolsState.js";
import { redactMcpErrorDetail } from "./mcpServerOrigin.js";
import { stripRedirectLocation } from "./connectionLifecycle.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { getPresentedCredentialLog } from "./discoveryIdentity.js";
import { getCurrentCallId, X_CCR_TURN_ID } from "./ccrTurnId.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../utils/json.js";
import {
  runBeforeRequestHook,
  resolveBearerTokenFor,
  withheldBearerRefusalFor,
  cliOwnedRequestHeaders,
  isCredentialRequestHeader,
  notifyResponseObserver,
  shouldResendRequest,
  getCliOwnedState,
} from "./cliOwnedClients.js";
import { shortHash } from "../../utils/shortHash.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedFeatureErrorCodeForTelemetry,
} from "../../utils/errors.js";
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokensAsync,
  getClaudeAIOAuthTokens,
  handleOAuth401Error,
  readFreshOAuthAccessToken,
} from "../../utils/auth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  getScaffoldResolver,
  noteScopeExpansion,
  peekScopeExpansionNotice,
  FirstPartyDesignNeedsConsentError,
} from "./firstPartyDesignConsent.js";
import {
  MEMBERSHIP_METHODS,
  clearApprovedPlans,
  clearPlansForProject,
  clearVerifiedProjectGrant,
  markRecardProject,
} from "./designPlanGate.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { getMCPUserAgent } from "../../utils/http.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-h44h5gdv.js:47816-48275 placement
/**
 * logMcpConnectionOtelEvent（v1 副本）。
 */
function logMcpConnectionOtelEvent_2(serverName, serverRef, result) {
  let detailsLogging = isToolDetailsLoggingEnabled();
  let pluginId = serverRef.pluginSource ? parsePluginIdentifier_2(serverRef.pluginSource) : undefined;
  let isAnthropicPlugin =
    pluginId &&
    (isAnthropicPluginSource(getTelemetryPluginScope(pluginId.name, pluginId.marketplace, null)) ||
      detailsLogging);
  logOTelEvent("mcp_server_connection", {
    status: result.status,
    transport_type: serverRef.type ?? "stdio",
    server_scope: serverRef.scope,
    duration_ms: String(Math.round(result.durationMs)),
    is_plugin: pluginId !== undefined,
    ...(pluginId && {
      plugin_id_hash: pluginIdHash(pluginId.name, pluginId.marketplace),
      "plugin.name": isAnthropicPlugin ? pluginId.name : THIRD_PARTY,
    }),
    ...(result.errorCode && {
      error_code: String(sanitizeConnectErrorCodeForTelemetry_2(result.errorCode)),
    }),
    ...(detailsLogging && {
      server_name: serverName,
      ...(result.error && {
        error: result.error,
      }),
    }),
  });
}
//@ chunk-h44h5gdv.js:48275-48938 placement (2.1.88 match: handleRemoteAuthFailure, 0.71)
async function handleRemoteAuthFailure(
  serverName,
  serverRef,
  transportType,
  error,
  isRefreshPath401,
  roundEpoch,
  storageV5,
) {
  isLegacyProtocolEra();
  let isZodError = error instanceof ZodError;
  let firstIssue = isZodError ? error.issues[0] : undefined;
  let error_2 = firstIssue
    ? `Server OAuth metadata invalid: ${firstIssue.path.join(".") || "(root)"} \u2014 ${firstIssue.message}`
    : undefined;
  logEvent("tengu_mcp_server_needs_auth", {
    transportType: fromEnum(transportType),
    ...(isZodError && {
      cause: lit("discovery_schema"),
    }),
    ...mcpBaseUrlAnalytics(serverRef, serverName),
  });
  logMCPDebug(
    serverName,
    `Authentication required for ${
      {
        sse: "SSE",
        http: "HTTP",
        "claudeai-proxy": "claude.ai proxy",
      }[transportType]
    } server`,
  );
  let canRefresh =
    isRefreshPath401 &&
    (serverRef.type === "http" || serverRef.type === "sse") &&
    (await hasStoredRefreshToken(serverName, serverRef));
  if (roundEpoch === undefined || isCurrentIdentityEpoch(roundEpoch))
    setMcpAuthCacheEntry(
      serverName,
      serverRef.type === "claudeai-proxy" ? serverRef.id : undefined,
      canRefresh ? NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS : undefined,
      storageV5,
      getConnectionCache().lapsedSignInKey(serverCacheKey(serverName, serverRef)),
    );
  await purgeDiscoveryCacheOnAuthFailure(serverName, serverRef, roundEpoch);
  logFeatureSad("mcp_connect", "mcp_connect_needs_auth");
  return {
    name: serverName,
    type: "needs-auth",
    config: serverRef,
    error: error_2,
  };
}
//@ chunk-h44h5gdv.js:48938-49171 placement
async function purgeDiscoveryCacheOnAuthFailure(serverName, serverRef, roundEpoch) {
  let identityCurrent = roundEpoch === undefined || isCurrentIdentityEpoch(roundEpoch);
  if (isDiscoveryCacheUsable())
    if (identityCurrent) await flushDiscoveryCache(deleteDiscoveryCache(serverName, serverRef));
    else
      logMCPDebug(
        serverName,
        "Discovery cache 401/403 purge skipped: identity changed since this connect round started (the current entry belongs to the new principal)",
      );
}
//@ chunk-h44h5gdv.js:49171-49576 placement
var AUTH_REJECTION_SEVERITY = {
  AUTH_HEADER_REJECTED: {
    severity: "bad",
    featureErrorCode: "mcp_connect_auth_header_rejected",
  },
  HEADERS_HELPER_AUTH_REJECTED: {
    severity: "bad",
    featureErrorCode: "mcp_connect_headers_helper_auth_rejected",
  },
  CLI_OWNED_BEARER_REJECTED: {
    severity: "bad",
    featureErrorCode: "mcp_connect_cli_owned_bearer_rejected",
  },
  FIRST_PARTY_AUTH_REJECTED: {
    severity: "sad",
    featureErrorCode: "mcp_connect_first_party_auth_rejected",
  },
};
//@ chunk-h44h5gdv.js:49576-49980 placement
function failWithAuthRejection({
  name: serverName,
  serverRef,
  transportType,
  errorCode,
  message,
  displayDetail,
}) {
  logEvent("tengu_mcp_server_connection_failed", {
    transportType: fromEnum(transportType),
    errorCode: fromEnum(errorCode),
    sdkGeneration: fromEnum(mcpSdkGeneration()),
    ...mcpBaseUrlAnalytics(serverRef, serverName),
    ...buildPluginSourceFields(serverRef),
  });
  let { severity, featureErrorCode } = AUTH_REJECTION_SEVERITY[errorCode];
  if (severity === "bad") logFeatureBad("mcp_connect", featureErrorCode);
  else logFeatureSad("mcp_connect", featureErrorCode);
  logMCPError(serverName, message);
  return {
    name: serverName,
    type: "failed",
    config: serverRef,
    error: message,
    ...(displayDetail !== undefined && {
      displayDetail,
    }),
    errorCode,
  };
}
//@ chunk-h44h5gdv.js:49980-51549 placement
function failFirstPartyAuthRejected(credentialKind, name, config, transportType, statusCode) {
  let host = "api.anthropic.com";
  try {
    if ("url" in config) host = new URL(config.url).host;
  } catch {}
  let statusLabel = `HTTP ${statusCode ?? 401}`;
  let isDesignServer = isDesignServerConfig(config);
  let message;
  switch (credentialKind) {
    case "design_credential":
      message =
        statusCode === 403
          ? `${host} rejected your /design-login credential (HTTP 403). Check that your account has access to Claude Design, or run /design-login to re-authorize it and retry.`
          : `${host} rejected your /design-login credential (${statusLabel}). Run /design-login to re-authorize it and retry.`;
      break;
    case "none":
      message = `${host} needs a claude.ai sign-in and Claude Code had no usable credential to send (${statusLabel}). Run ${isDesignServer ? "/design-login" : "/login"} and retry.`;
      break;
    case "design_scoped_login":
    case "login": {
      if (statusCode === 403 && isDesignServer)
        message =
          credentialKind === "design_scoped_login"
            ? `${host} rejected your claude.ai login for Claude Design (HTTP 403) even though that login already includes Claude Design permissions, so this is most likely an account or project access problem. Check that your account has access to Claude Design; if it does, run /design-login and retry.`
            : `${host} rejected your claude.ai login for Claude Design (HTTP 403), most likely because a /login token carries no Claude Design access. Run /design-login and retry, or check that your account has access to Claude Design.`;
      else
        message =
          statusCode === 403
            ? `${host} rejected your claude.ai login (HTTP 403). Check that your account has access to this server. If it does, your ` +
              `token may be missing a scope \u2014 run ${"/login"} and retry.`
            : `${host} rejected your claude.ai login (${statusLabel}). Run /login and retry.`;
      break;
    }
    default:
      return credentialKind;
  }
  return failWithAuthRejection({
    name,
    serverRef: config,
    transportType,
    errorCode: "FIRST_PARTY_AUTH_REJECTED",
    message,
  });
}
//@ chunk-h44h5gdv.js:51549-51629 placement
/**
 * 判断错误是否属于认证失败（401/403 或认证错误）。
 */
function isAuthFailure_2(error, statusCode, sawAuthChallenge) {
  return (
    error instanceof UnauthorizedError ||
    (error instanceof ZodError && sawAuthChallenge) ||
    statusCode === 401 ||
    statusCode === 403
  );
}
//@ chunk-h44h5gdv.js:51629-53168 placement
async function handleRemoteConnectAuthError_2({
  name: serverName,
  serverRef,
  transportType,
  error,
  statusCode,
  sawAuthChallenge,
  hasUserAuthHeader,
  helperMintsAuthHeader,
  cliOwnedBearer,
  useFirstPartyAuth,
  firstPartyBearer,
  authProvider,
  roundEpoch,
  storageV5,
}) {
  await recordTokenlessRejection(serverName, serverRef, authProvider);
  if (!isAuthFailure_2(error, statusCode, sawAuthChallenge)) return;
  if (hasUserAuthHeader) {
    let errorDetail = sanitizeErrorDetail(redactMcpErrorDetail(serverName, serverRef, error.message));
    return failWithAuthRejection({
      name: serverName,
      serverRef,
      transportType,
      errorCode: "AUTH_HEADER_REJECTED",
      message:
        `Server rejected the configured Authorization header (HTTP ${statusCode ?? 401}). ` +
        "Check that the token is valid for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when headers.Authorization is set.",
      ...(errorDetail !== "" && {
        displayDetail: `Error detail: ${errorDetail}`,
      }),
    });
  }
  if (helperMintsAuthHeader) {
    let errorDetail = sanitizeErrorDetail(redactMcpErrorDetail(serverName, serverRef, error.message));
    return failWithAuthRejection({
      name: serverName,
      serverRef,
      transportType,
      errorCode: "HEADERS_HELPER_AUTH_REJECTED",
      message:
        `Server rejected the Authorization header minted by the configured headersHelper (HTTP ${statusCode ?? 401}). ` +
        "Check that the helper command returns a valid credential for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when the helper supplies Authorization.",
      ...(errorDetail !== "" && {
        displayDetail: `Error detail: ${errorDetail}`,
      }),
    });
  }
  if (cliOwnedBearer)
    return failWithAuthRejection({
      name: serverName,
      serverRef,
      transportType,
      errorCode: "CLI_OWNED_BEARER_REJECTED",
      message: `Server rejected the session credential (HTTP ${statusCode ?? 401}). It will be retried when the session credential is refreshed.`,
    });
  if (useFirstPartyAuth)
    return failFirstPartyAuthRejected(
      firstPartyBearer ?? "none",
      serverName,
      serverRef,
      transportType,
      statusCode,
    );
  let isRefreshPath401 = error instanceof UnauthorizedError || statusCode === 401;
  let rejectedTokenResult = await handleRejectedToken({
    name: serverName,
    serverRef,
    authProvider,
    isRefreshPath401,
    needsAuth: () =>
      handleRemoteAuthFailure(
        serverName,
        serverRef,
        transportType,
        error,
        isRefreshPath401,
        roundEpoch,
        storageV5,
      ),
  });
  if (rejectedTokenResult !== undefined) {
    await purgeDiscoveryCacheOnAuthFailure(serverName, serverRef, roundEpoch);
    return rejectedTokenResult;
  }
  return handleRemoteAuthFailure(
    serverName,
    serverRef,
    transportType,
    error,
    isRefreshPath401,
    roundEpoch,
    storageV5,
  );
}
//@ chunk-h44h5gdv.js:53168-53736 placement
/**
 * wrapFetchWithCcrSessionAuth（v1 副本）。
 */
function wrapFetchWithCcrSessionAuth_2(wsHeadersForLogging, dialOptions, connectionKey) {
  wsHeadersForLogging = stripRedirectLocation(wsHeadersForLogging);
  return async (url, init) => {
    let headers = new Headers(init?.headers);
    if (!headers.has("Authorization")) {
      let sessionIngressAuthToken = getSessionIngressAuthToken();
      if (sessionIngressAuthToken) {
        getPresentedCredentialLog().record(sessionIngressAuthToken);
        headers.set("Authorization", `Bearer ${sessionIngressAuthToken}`);
      }
    }
    let currentCallId = getCurrentCallId();
    headers.delete(X_CCR_TURN_ID);
    if (currentCallId) headers.set(X_CCR_TURN_ID, currentCallId);
    headers.delete(X_CCR_DIAL_TOOL_USE_ID);
    if (dialOptions?.toolUseId !== undefined) {
      let handshakeKind = classifyHandshakeRequest(init);
      if (handshakeKind === "handshake" || (handshakeKind === "listing" && dialOptions.withListings))
        headers.set(X_CCR_DIAL_TOOL_USE_ID, dialOptions.toolUseId);
    }
    let redirect = init?.redirect === "error" ? "error" : "manual";
    let response = await wsHeadersForLogging(url, {
      ...init,
      headers,
      redirect,
    });
    let connectionCache = getConnectionCache();
    connectionCache.noteHostDraining(url, response);
    if (
      connectionKey !== undefined &&
      (response.status === 401 || connectionCache.lapsedCcrSignIns.has(connectionKey)) &&
      classifyHandshakeRequest(init) !== undefined
    )
      connectionCache.noteCcrDialAnswer(connectionKey, response);
    return response;
  };
}
//@ chunk-h44h5gdv.js:53736-53993 placement
function classifyHandshakeRequest(init) {
  if (init?.method?.toUpperCase() !== "POST" || typeof init.body !== "string") return;
  let method = objectSchema({
    method: stringSchema(),
  }).safeParse(safeParseJSON(init.body, false)).data?.method;
  if (method === "initialize" || method === "notifications/initialized") return "handshake";
  return method === "tools/list" ? "listing" : undefined;
}
//@ chunk-h44h5gdv.js:53993-54058 placement
var X_CCR_DIAL_TOOL_USE_ID = "X-CCR-Dial-Tool-Use-Id";
var TOOL_USE_ID_PATTERN = /^toolu_[A-Za-z0-9_-]{1,64}$/;
//@ chunk-h44h5gdv.js:54058-55002 placement
/**
 * wrapFetchWithCliOwnedBearer（v1 副本）。
 */
function wrapFetchWithCliOwnedBearer_2(wsHeadersForLogging, config) {
  let attemptRequest = async (...[url, init]) => {
    let requestMeta = {
      method: (init?.method ?? "GET").toUpperCase(),
      body: init?.body,
    };
    await runBeforeRequestHook(config, requestMeta);
    let headers = new Headers(init?.headers);
    let bearerFingerprint = null;
    let isBearerWithheld = false;
    if (!headers.has("Authorization")) {
      let bearerTokenFor = await resolveBearerTokenFor(config);
      if (bearerTokenFor) {
        getPresentedCredentialLog().record(bearerTokenFor);
        headers.set("Authorization", `Bearer ${bearerTokenFor}`);
        bearerFingerprint = shortHash(bearerTokenFor);
      } else {
        isBearerWithheld = true;
        let refusalMessage = withheldBearerRefusalFor(config);
        if (refusalMessage !== undefined)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            refusalMessage,
            "CLI-owned MCP request not sent: its bearer was withheld",
          );
      }
    }
    let ownedHeaders = {};
    for (let [key, value] of Object.entries(cliOwnedRequestHeaders(config, requestMeta)))
      if (
        !headers.has(key) &&
        key.toLowerCase() !== "authorization" &&
        !(isBearerWithheld && isCredentialRequestHeader(config, key))
      ) {
        headers.set(key, value);
        ownedHeaders[key] = value;
      }
    let response = await wsHeadersForLogging(url, {
      ...init,
      headers,
      redirect: "error",
    });
    notifyResponseObserver(config, {
      method: requestMeta.method,
      status: response.status,
      headers: response.headers,
      requestHeaders: {
        get: (headerName) =>
          headerName.toLowerCase() === "authorization" || isCredentialRequestHeader(config, headerName)
            ? null
            : headers.get(headerName),
      },
      bearerFingerprint,
    });
    return {
      response,
      owned: ownedHeaders,
    };
  };
  return async (url, init) => {
    let { response, owned } = await attemptRequest(url, init);
    if (!(await shouldResendRequest(config, response, owned))) return response;
    await response.body?.cancel().catch(() => {});
    let retryResult = await attemptRequest(url, init);
    shouldResendRequest(config, retryResult.response, retryResult.owned);
    return retryResult.response;
  };
}
//@ chunk-h44h5gdv.js:55002-55264 placement
/**
 * ClaudeAiProxyBearerRejectedError（v1 副本）。
 */
class ClaudeAiProxyBearerRejectedError extends Error {
  code = "CLAUDEAI_BEARER_REJECTED";
  reasonCode = "claudeai_bearer_rejected";
  constructor() {
    super(
      "claude.ai rejected the session token \u2014 it may lack connector scopes or be invalid. Run /login.",
    );
    this.name = "ClaudeAiProxyBearerRejectedError";
  }
}
//@ chunk-h44h5gdv.js:55264-56435 placement (2.1.88 match: createClaudeAiProxyFetch, 0.635)
/**
 * createClaudeAiProxyFetch（v1 副本）。
 */
function createClaudeAiProxyFetch(fetchFn, credentials) {
  fetchFn = stripRedirectLocation(fetchFn);
  return async (url, init) => {
    let doRequest = async () => {
      await checkAndRefreshOAuthTokenIfNeeded({
        credentials,
      });
      let currentTokens =
        isStorageV5Enabled() && credentials !== undefined
          ? await getClaudeAIOAuthTokensAsync(credentials)
          : getClaudeAIOAuthTokens();
      if (!currentTokens) throw Error("No claude.ai OAuth token available");
      let headers = new Headers(init?.headers);
      getPresentedCredentialLog().record(currentTokens.accessToken);
      headers.set("Authorization", `Bearer ${currentTokens.accessToken}`);
      let redirect = init?.redirect === "error" ? "error" : "manual";
      return {
        response: await fetchFn(url, {
          ...init,
          headers,
          redirect,
        }),
        sentToken: currentTokens.accessToken,
      };
    };
    async function normalizeErrorResponse(response) {
      if (response.status >= 400 && response.headers.get("content-type")?.includes("text/event-stream")) {
        let text = await response.text();
        let found = text
          .split(
            `
`,
          )
          .find((line) => line.startsWith("data: "));
        return new Response(found ? found.slice(6) : text, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
      return response;
    }
    let { response, sentToken } = await doRequest();
    if (response.status !== 401) return normalizeErrorResponse(response);
    let proxyErrorCode = response.headers.get("X-Mcp-Error-Code") ?? undefined;
    if (proxyErrorCode) {
      logEvent("tengu_mcp_claudeai_proxy_401", {
        tokenChanged: false,
        proxyErrorCode: sanitizedFeatureErrorCodeForTelemetry(proxyErrorCode),
      });
      return response;
    }
    let tokenChanged = await handleOAuth401Error(sentToken, credentials).catch(() => false);
    logEvent("tengu_mcp_claudeai_proxy_401", {
      tokenChanged,
    });
    if (!tokenChanged) {
      let now =
        isStorageV5Enabled() && credentials !== undefined
          ? await readFreshOAuthAccessToken(credentials)
          : getClaudeAIOAuthTokens()?.accessToken;
      if (!now || now === sentToken) throw new ClaudeAiProxyBearerRejectedError();
    }
    let response_2 = (await doRequest()).response;
    if (response_2.status === 401 && !response_2.headers.get("X-Mcp-Error-Code"))
      throw new ClaudeAiProxyBearerRejectedError();
    return normalizeErrorResponse(response_2);
  };
}
//@ chunk-h44h5gdv.js:56435-56947 placement
async function expandFirstPartyDesignScopes(url, credentials) {
  if (isDesignMcpUrl(url)) {
    let scaffoldResult = await getScaffoldResolver()?.(credentials);
    if (scaffoldResult?.ok) {
      if (scaffoldResult.expanded) {
        noteScopeExpansion(
          "Added user:design:read and user:design:write to your claude.ai login (for the Design MCP connector).",
        );
        logEvent("tengu_mcp_first_party_scope_expanded", {
          pathPrefix: lit("/v1/design/"),
        });
      }
      return {
        accessToken: scaffoldResult.accessToken,
        bearer: scaffoldResult.bearer,
      };
    }
  }
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials,
  });
  let tokens =
    isStorageV5Enabled() && credentials !== undefined
      ? await getClaudeAIOAuthTokensAsync(credentials)
      : getClaudeAIOAuthTokens();
  if (!tokens?.accessToken) return;
  return {
    accessToken: tokens.accessToken,
    bearer: tokens.scopes?.includes("user:design:read") ? "design_scoped_login" : "login",
  };
}
//@ chunk-h44h5gdv.js:56947-57176 placement
/**
 * readNeedsConsentBit（v1 副本）。
 */
async function readNeedsConsentBit(response) {
  let notice = peekScopeExpansionNotice();
  if (notice === null) return null;
  let body;
  try {
    body = await response.clone().json();
  } catch {
    return null;
  }
  if (body == null || typeof body !== "object" || body.error !== "needs_consent") return null;
  let consent = body.consent;
  return notice.isConsentBit(consent) ? consent : null;
}
//@ chunk-h44h5gdv.js:57176-57313 placement
function noteDesignProjectId(designSession, isDesignServer, name, payload) {
  if (!isDesignServer || !MEMBERSHIP_METHODS.has(name)) return;
  let projectId = payload.project_id;
  if (typeof projectId === "string" && projectId.length > 0) {
    clearApprovedPlans(designSession, projectId);
    clearPlansForProject(designSession, projectId);
    clearVerifiedProjectGrant(designSession, projectId);
    markRecardProject(designSession, projectId);
  }
}
//@ chunk-h44h5gdv.js:57313-57378 placement
var DESIGN_WRITE_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h44h5gdv.js:57313", () => {
  DESIGN_WRITE_TOOLS = new Set(["write_files", "create_support_js", "copy_files"]);
});
//@ chunk-h44h5gdv.js:57378-57905 placement
/**
 * gateDesignWriteWithoutPlanToken（v1 副本）。
 */
function gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, name, input) {
  if (!isFirstPartyDesignServer || !DESIGN_WRITE_TOOLS.has(name)) return null;
  let planToken = input?.plan_token;
  if (typeof planToken === "string" && planToken.length > 0) return null;
  return {
    behavior: "deny",
    message: `${name}: writing without a plan_token is available only through the native Claude Design tool \u2014 call finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "tokenless design writes are native-tool-only \u2014 this connector surface has no reserved-path or grant-approval flow",
      classifierApprovable: false,
    },
  };
}
//@ chunk-h44h5gdv.js:57905-57967 placement
var DESIGN_PLAN_TOOLS; // deferred: uses DESIGN_WRITE_TOOLS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h44h5gdv.js:57905", () => {
  DESIGN_PLAN_TOOLS = new Set([
    ...DESIGN_WRITE_TOOLS,
    "finalize_plan",
    "delete_files",
    ...MEMBERSHIP_METHODS,
  ]);
});
//@ chunk-h44h5gdv.js:57967-58004 placement
function isDesignGatedTool(isFirstPartyDesignServer, name) {
  return isFirstPartyDesignServer && DESIGN_PLAN_TOOLS.has(name);
}
//@ chunk-h44h5gdv.js:58004-58296 placement
/**
 * askDesignConsent（v1 副本）。
 */
function askDesignConsent(message, input, __consentNonce) {
  return {
    behavior: "ask",
    message,
    updatedInput: {
      ...input,
      __consentNonce,
    },
    localDisplayOnly: true,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "design agent consent \u2014 approving records a server-side grant for Claude agents to write your design projects",
      classifierApprovable: false,
    },
  };
}
//@ chunk-h44h5gdv.js:58296-58370 placement
function isDesignServerConfig(config) {
  return (
    (config.type === "sse" || config.type === "http") &&
    isDesignMcpUrl(config.url) &&
    !configHasAuthorizationHeader(config)
  );
}
//@ chunk-h44h5gdv.js:58370-58524 placement
/**
 * canAskDesignConsent（v1 副本）。
 */
function canAskDesignConsent(tool) {
  let toolPermissionContext = getToolPermissionContext(tool);
  return (
    !tool.options.isNonInteractiveSession &&
    toolPermissionContext.mode !== "bypassPermissions" &&
    !(toolPermissionContext.mode === "plan" && toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-h44h5gdv.js:58524-58696 placement
/**
 * canPromptForPermission（v1 副本）。
 */
function canPromptForPermission(tool) {
  let toolPermissionContext = getToolPermissionContext(tool);
  return (
    toolPermissionContext.mode !== "bypassPermissions" &&
    toolPermissionContext.mode !== "dontAsk" &&
    !(toolPermissionContext.mode === "plan" && toolPermissionContext.isBypassPermissionsModeAvailable) &&
    !toolPermissionContext.shouldAvoidPermissionPrompts
  );
}
//@ chunk-h44h5gdv.js:58696-58707 placement
var MAX_DESIGN_CONSENT_ASKS = 100;
//@ chunk-h44h5gdv.js:58707-58979 placement
/**
 * rememberDesignConsentAsk（v1 副本）。
 */
function rememberDesignConsentAsk(toolUseId, consentBit, askReachesUser) {
  let firstPartyDesignConsentAsks = getCliOwnedState().firstPartyDesignConsentAsks;
  let existingAsk = firstPartyDesignConsentAsks.get(toolUseId);
  let sameBit = existingAsk !== undefined && existingAsk.bit === consentBit;
  let nonce = sameBit ? existingAsk.nonce : randomUUID();
  firstPartyDesignConsentAsks.delete(toolUseId);
  firstPartyDesignConsentAsks.set(toolUseId, {
    bit: consentBit,
    nonce,
    askReachesUser: sameBit ? existingAsk.askReachesUser && askReachesUser : askReachesUser,
  });
  while (firstPartyDesignConsentAsks.size > MAX_DESIGN_CONSENT_ASKS) {
    let oldestToolUseId = firstPartyDesignConsentAsks.keys().next().value;
    if (oldestToolUseId === undefined) break;
    firstPartyDesignConsentAsks.delete(oldestToolUseId);
  }
  return nonce;
}
//@ chunk-h44h5gdv.js:58979-59189 placement
/**
 * takeDesignConsentAsk（v1 副本）。
 */
function takeDesignConsentAsk(toolUseId, nonce) {
  if (toolUseId === undefined) return null;
  let firstPartyDesignConsentAsks = getCliOwnedState().firstPartyDesignConsentAsks;
  let ask = firstPartyDesignConsentAsks.get(toolUseId) ?? null;
  firstPartyDesignConsentAsks.delete(toolUseId);
  if (ask === null || nonce === undefined || ask.nonce !== nonce) return null;
  return {
    bit: ask.bit,
    askReachesUser: ask.askReachesUser,
  };
}
//@ chunk-h44h5gdv.js:59189-60022 placement
/**
 * wrapCallWithDesignConsent（v1 副本）。
 */
function wrapCallWithDesignConsent(callTool, options) {
  let { designSession, approvedConsentBit, consentAskReachesUser, credentials } = options;
  return async (requestOptions) => {
    let notice = peekScopeExpansionNotice();
    try {
      let result = await callTool(requestOptions);
      if (approvedConsentBit !== null && !requestOptions.aborted)
        notice?.seedDesignConsentBit(designSession, approvedConsentBit, true);
      return result;
    } catch (error) {
      if (!(error instanceof FirstPartyDesignNeedsConsentError) || !notice) throw error;
      let consent = error.consent;
      if (consent !== approvedConsentBit) {
        notice.seedDesignConsentBit(designSession, consent, false);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${notice.consentPromptFor(consent)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
          "first-party design MCP needs_consent (not shown)",
        );
      }
      if (!consentAskReachesUser) {
        notice.seedDesignConsentBit(designSession, consent, false);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${notice.consentPromptFor(consent)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
          "first-party design MCP needs_consent (no prompt)",
        );
      }
      await notice.postDesignConsent(designSession, consent, credentials);
      return callTool(requestOptions);
    }
  };
}
//@ chunk-h44h5gdv.js:60022-60916 placement
/**
 * wrapFetchWithFirstPartyAuth（v1 副本）。
 */
function wrapFetchWithFirstPartyAuth_2(fetchFn, credentials, bearerTracker) {
  fetchFn = stripRedirectLocation(fetchFn);
  return async (url, init) => {
    let headers = new Headers(init?.headers);
    let redirect = init?.redirect === "error" ? "error" : "manual";
    if (headers.has("Authorization") || !isFirstPartyMcpUrl(url) || !isFirstPartyProvider())
      return fetchFn(url, {
        ...init,
        redirect,
      });
    let sendWithAuth = async () => {
      let designAuth = await expandFirstPartyDesignScopes(url, credentials);
      bearerTracker.last = designAuth?.bearer ?? "none";
      if (!designAuth)
        return {
          response: await fetchFn(url, {
            ...init,
            redirect,
          }),
          sentToken: undefined,
        };
      let accessToken = designAuth.accessToken;
      getPresentedCredentialLog().record(accessToken);
      let headers = {
        ...Object.fromEntries(new Headers(init?.headers)),
        Authorization: `Bearer ${accessToken}`,
      };
      return {
        response: await fetchFn(url, {
          ...init,
          headers,
          redirect,
        }),
        sentToken: accessToken,
      };
    };
    let checkConsent = async (attempt) => {
      if (attempt.response.status === 403 && attempt.sentToken && isDesignMcpUrl(url)) {
        let consent = await readNeedsConsentBit(attempt.response);
        if (consent !== null) throw new FirstPartyDesignNeedsConsentError(consent);
      }
    };
    let firstAttempt = await sendWithAuth();
    await checkConsent(firstAttempt);
    let { response, sentToken } = firstAttempt;
    if (response.status !== 401 || !sentToken) return response;
    if (!(await handleOAuth401Error(sentToken, credentials).catch(() => false))) {
      let freshToken =
        isStorageV5Enabled() && credentials !== undefined
          ? await readFreshOAuthAccessToken(credentials)
          : getClaudeAIOAuthTokens()?.accessToken;
      if (!freshToken || freshToken === sentToken) return response;
    }
    let retryAttempt;
    try {
      retryAttempt = await sendWithAuth();
    } catch {
      return response;
    }
    await checkConsent(retryAttempt);
    return retryAttempt.response;
  };
}
//@ chunk-h44h5gdv.js:60916-61139 placement
/**
 * mergeRequestHeaders（v1 副本）。
 */
function mergeRequestHeaders_2(headers, authHeaders, extraHeaders) {
  let headers_2 = new Headers({
    "User-Agent": getMCPUserAgent(),
    "Accept-Encoding": "identity",
    ...authHeaders,
  });
  new Headers(headers).forEach((value, key) => headers_2.set(key, value));
  for (let [key, value] of Object.entries(extraHeaders)) headers_2.set(key, value);
  headers_2.set("Accept", "text/event-stream");
  return headers_2;
}
export {
  wrapFetchWithFirstPartyAuth_2,
  mergeRequestHeaders_2,
  wrapFetchWithCcrSessionAuth_2,
  wrapFetchWithCliOwnedBearer_2,
  createClaudeAiProxyFetch,
  isAuthFailure_2,
  handleRemoteConnectAuthError_2,
  handleRemoteAuthFailure,
  logMcpConnectionOtelEvent_2,
  TOOL_USE_ID_PATTERN,
  isDesignGatedTool,
  gateDesignWriteWithoutPlanToken,
  rememberDesignConsentAsk,
  canAskDesignConsent,
  askDesignConsent,
  isDesignServerConfig,
  takeDesignConsentAsk,
  noteDesignProjectId,
  canPromptForPermission,
  wrapCallWithDesignConsent,
  ClaudeAiProxyBearerRejectedError,
  DESIGN_WRITE_TOOLS,
  readNeedsConsentBit,
};

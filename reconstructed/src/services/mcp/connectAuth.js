/**
 * services/mcp/connectAuth.ts
 *
 * 2.1.316 新增。MCP 连接时的认证处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z1n5m6nf.js (31)
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
import { mcpBaseUrlAnalytics, isMcpAuthCached_3, NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS_2 } from "./client.js";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import {
  hasStoredRefreshToken,
  isDesignMcpUrl,
  configHasAuthorizationHeader,
  isFirstPartyMcpUrl,
} from "./auth.js";
import { isCurrentIdentityEpoch } from "./identityChange.js";
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
import { getConnectionCache } from "./needsAuthCache.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-z1n5m6nf.js:46289-46748 placement
/**
 * logMcpConnectionOtelEvent（v1 副本）。
 */
function logMcpConnectionOtelEvent_2(serverName, serverRef, n) {
  let s = isToolDetailsLoggingEnabled();
  let h = serverRef.pluginSource ? parsePluginIdentifier_2(serverRef.pluginSource) : undefined;
  let y = h && (isAnthropicPluginSource(getTelemetryPluginScope(h.name, h.marketplace, null)) || s);
  logOTelEvent("mcp_server_connection", {
    status: n.status,
    transport_type: serverRef.type ?? "stdio",
    server_scope: serverRef.scope,
    duration_ms: String(Math.round(n.durationMs)),
    is_plugin: h !== undefined,
    ...(h && {
      plugin_id_hash: pluginIdHash(h.name, h.marketplace),
      "plugin.name": y ? h.name : THIRD_PARTY,
    }),
    ...(n.errorCode && {
      error_code: String(sanitizeConnectErrorCodeForTelemetry_2(n.errorCode)),
    }),
    ...(s && {
      server_name: serverName,
      ...(n.error && {
        error: n.error,
      }),
    }),
  });
}
//@ chunk-z1n5m6nf.js:46748-47381 placement
async function handleRemoteAuthFailure_2(
  serverId,
  serverRef,
  transportType,
  error,
  h,
  roundEpoch,
  storageV5,
) {
  isLegacyProtocolEra();
  let T = error instanceof ZodError;
  let M = T ? error.issues[0] : undefined;
  let error_2 = M
    ? `Server OAuth metadata invalid: ${M.path.join(".") || "(root)"} \u2014 ${M.message}`
    : undefined;
  logEvent("tengu_mcp_server_needs_auth", {
    transportType: fromEnum(transportType),
    ...(T && {
      cause: lit("discovery_schema"),
    }),
    ...mcpBaseUrlAnalytics(serverRef, serverId),
  });
  logMCPDebug(
    serverId,
    `Authentication required for ${
      {
        sse: "SSE",
        http: "HTTP",
        "claudeai-proxy": "claude.ai proxy",
      }[transportType]
    } server`,
  );
  let E =
    h &&
    (serverRef.type === "http" || serverRef.type === "sse") &&
    (await hasStoredRefreshToken(serverId, serverRef));
  if (roundEpoch === undefined || isCurrentIdentityEpoch(roundEpoch))
    isMcpAuthCached_3(
      serverId,
      serverRef.type === "claudeai-proxy" ? serverRef.id : undefined,
      E ? NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS_2 : undefined,
      storageV5,
    );
  await purgeDiscoveryCacheOnAuthFailure(serverId, serverRef, roundEpoch);
  logFeatureSad("mcp_connect", "mcp_connect_needs_auth");
  return {
    name: serverId,
    type: "needs-auth",
    config: serverRef,
    error: error_2,
  };
}
//@ chunk-z1n5m6nf.js:47381-47613 placement
async function purgeDiscoveryCacheOnAuthFailure(e, r, n) {
  let s = n === undefined || isCurrentIdentityEpoch(n);
  if (isDiscoveryCacheUsable())
    if (s) await flushDiscoveryCache(deleteDiscoveryCache(e, r));
    else
      logMCPDebug(
        e,
        "Discovery cache 401/403 purge skipped: identity changed since this connect round started (the current entry belongs to the new principal)",
      );
}
//@ chunk-z1n5m6nf.js:47613-48018 placement
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
//@ chunk-z1n5m6nf.js:48018-48422 placement
function failWithAuthRejection({ name: e, serverRef, transportType, errorCode, message, displayDetail }) {
  logEvent("tengu_mcp_server_connection_failed", {
    transportType: fromEnum(transportType),
    errorCode: fromEnum(errorCode),
    sdkGeneration: fromEnum(mcpSdkGeneration()),
    ...mcpBaseUrlAnalytics(serverRef, e),
    ...buildPluginSourceFields(serverRef),
  });
  let { severity, featureErrorCode } = AUTH_REJECTION_SEVERITY[errorCode];
  if (severity === "bad") logFeatureBad("mcp_connect", featureErrorCode);
  else logFeatureSad("mcp_connect", featureErrorCode);
  logMCPError(e, message);
  return {
    name: e,
    type: "failed",
    config: serverRef,
    error: message,
    ...(displayDetail !== undefined && {
      displayDetail,
    }),
    errorCode,
  };
}
//@ chunk-z1n5m6nf.js:48422-49991 placement
function failFirstPartyAuthRejected(e, name, config, transportType, statusCode) {
  let y = "api.anthropic.com";
  try {
    if ("url" in config) y = new URL(config.url).host;
  } catch {}
  let S = `HTTP ${statusCode ?? 401}`;
  let T = isDesignServerConfig(config);
  let M;
  switch (e) {
    case "design_credential":
      M =
        statusCode === 403
          ? `${y} rejected your /design-login credential (HTTP 403). Check that your account has access to Claude Design, or run /design-login to re-authorize it and retry.`
          : `${y} rejected your /design-login credential (${S}). Run /design-login to re-authorize it and retry.`;
      break;
    case "none":
      M = `${y} needs a claude.ai sign-in and Claude Code had no usable credential to send (${S}). Run ${T ? "/design-login" : "/login"} and retry.`;
      break;
    case "design_scoped_login":
    case "login": {
      if (statusCode === 403 && T)
        M =
          e === "design_scoped_login"
            ? `${y} rejected your claude.ai login for Claude Design (HTTP 403) even though that login already includes Claude Design permissions, so this is most likely an account or project access problem. Check that your account has access to Claude Design; if it does, run /design-login and retry.`
            : `${y} rejected your claude.ai login for Claude Design (HTTP 403), most likely because a /login token carries no Claude Design access. Run /design-login and retry, or check that your account has access to Claude Design.`;
      else
        M =
          statusCode === 403
            ? `${y} rejected your claude.ai login (HTTP 403). Check that your account has access to this server. If it does, your ` +
              `token may be missing a scope \u2014 run ${"/login"} and retry.`
            : `${y} rejected your claude.ai login (${S}). Run /login and retry.`;
      break;
    }
    default:
      return e;
  }
  return failWithAuthRejection({
    name,
    serverRef: config,
    transportType,
    errorCode: "FIRST_PARTY_AUTH_REJECTED",
    message: M,
  });
}
//@ chunk-z1n5m6nf.js:49991-50071 placement
/**
 * 判断错误是否属于认证失败（401/403 或认证错误）。
 */
function isAuthFailure_2(error, r, n) {
  return error instanceof UnauthorizedError || (error instanceof ZodError && n) || r === 401 || r === 403;
}
//@ chunk-z1n5m6nf.js:50071-51610 placement
async function handleRemoteConnectAuthError_2({
  name,
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
  await recordTokenlessRejection(name, serverRef, authProvider);
  if (!isAuthFailure_2(error, statusCode, sawAuthChallenge)) return;
  if (hasUserAuthHeader) {
    let he = sanitizeErrorDetail(redactMcpErrorDetail(name, serverRef, error.message));
    return failWithAuthRejection({
      name,
      serverRef,
      transportType,
      errorCode: "AUTH_HEADER_REJECTED",
      message:
        `Server rejected the configured Authorization header (HTTP ${statusCode ?? 401}). ` +
        "Check that the token is valid for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when headers.Authorization is set.",
      ...(he !== "" && {
        displayDetail: `Error detail: ${he}`,
      }),
    });
  }
  if (helperMintsAuthHeader) {
    let he = sanitizeErrorDetail(redactMcpErrorDetail(name, serverRef, error.message));
    return failWithAuthRejection({
      name,
      serverRef,
      transportType,
      errorCode: "HEADERS_HELPER_AUTH_REJECTED",
      message:
        `Server rejected the Authorization header minted by the configured headersHelper (HTTP ${statusCode ?? 401}). ` +
        "Check that the helper command returns a valid credential for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when the helper supplies Authorization.",
      ...(he !== "" && {
        displayDetail: `Error detail: ${he}`,
      }),
    });
  }
  if (cliOwnedBearer)
    return failWithAuthRejection({
      name,
      serverRef,
      transportType,
      errorCode: "CLI_OWNED_BEARER_REJECTED",
      message: `Server rejected the session credential (HTTP ${statusCode ?? 401}). It will be retried when the session credential is refreshed.`,
    });
  if (useFirstPartyAuth)
    return failFirstPartyAuthRejected(firstPartyBearer ?? "none", name, serverRef, transportType, statusCode);
  let U = error instanceof UnauthorizedError || statusCode === 401;
  let re = await handleRejectedToken({
    name,
    serverRef,
    authProvider,
    isRefreshPath401: U,
    needsAuth: () =>
      handleRemoteAuthFailure_2(name, serverRef, transportType, error, U, roundEpoch, storageV5),
  });
  if (re !== undefined) {
    await purgeDiscoveryCacheOnAuthFailure(name, serverRef, roundEpoch);
    return re;
  }
  return handleRemoteAuthFailure_2(name, serverRef, transportType, error, U, roundEpoch, storageV5);
}
//@ chunk-z1n5m6nf.js:51610-52203 placement
/**
 * wrapFetchWithCcrSessionAuth（v1 副本）。
 */
function wrapFetchWithCcrSessionAuth_2(wsHeadersForLogging, r, n) {
  wsHeadersForLogging = stripRedirectLocation(wsHeadersForLogging);
  return async (s, h) => {
    let headers = new Headers(h?.headers);
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
    if (r?.toolUseId !== undefined) {
      let R = classifyHandshakeRequest(h);
      if (R === "handshake" || (R === "listing" && r.withListings))
        headers.set(X_CCR_DIAL_TOOL_USE_ID, r.toolUseId);
    }
    getConnectionCache().attachCcrTicket(s, headers);
    let redirect = h?.redirect === "error" ? "error" : "manual";
    let M = await wsHeadersForLogging(s, {
      ...h,
      headers,
      redirect,
    });
    let connectionCache = getConnectionCache();
    connectionCache.noteCcrTicket(s, headers, M);
    if (
      n !== undefined &&
      (M.status === 401 || connectionCache.lapsedCcrSignIns.has(n)) &&
      classifyHandshakeRequest(h) !== undefined
    )
      connectionCache.noteCcrDialAnswer(n, M);
    return M;
  };
}
//@ chunk-z1n5m6nf.js:52203-52460 placement
function classifyHandshakeRequest(e) {
  if (e?.method?.toUpperCase() !== "POST" || typeof e.body !== "string") return;
  let method = u({
    method: string(),
  }).safeParse(safeParseJSON(e.body, false)).data?.method;
  if (method === "initialize" || method === "notifications/initialized") return "handshake";
  return method === "tools/list" ? "listing" : undefined;
}
//@ chunk-z1n5m6nf.js:52460-52525 placement
var X_CCR_DIAL_TOOL_USE_ID = "X-CCR-Dial-Tool-Use-Id";
var TOOL_USE_ID_PATTERN = /^toolu_[A-Za-z0-9_-]{1,64}$/;
//@ chunk-z1n5m6nf.js:52525-53469 placement
/**
 * wrapFetchWithCliOwnedBearer（v1 副本）。
 */
function wrapFetchWithCliOwnedBearer_2(wsHeadersForLogging, serverRef) {
  let n = async (...[s, h]) => {
    let y = {
      method: (h?.method ?? "GET").toUpperCase(),
      body: h?.body,
    };
    await runBeforeRequestHook(serverRef, y);
    let headers = new Headers(h?.headers);
    let bearerFingerprint = null;
    let M = false;
    if (!headers.has("Authorization")) {
      let bearerTokenFor = await resolveBearerTokenFor(serverRef);
      if (bearerTokenFor) {
        getPresentedCredentialLog().record(bearerTokenFor);
        headers.set("Authorization", `Bearer ${bearerTokenFor}`);
        bearerFingerprint = shortHash(bearerTokenFor);
      } else {
        M = true;
        let Q = withheldBearerRefusalFor(serverRef);
        if (Q !== undefined)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            Q,
            "CLI-owned MCP request not sent: its bearer was withheld",
          );
      }
    }
    let w = {};
    for (let [key, value] of Object.entries(cliOwnedRequestHeaders(serverRef, y)))
      if (
        !headers.has(key) &&
        key.toLowerCase() !== "authorization" &&
        !(M && isCredentialRequestHeader(serverRef, key))
      ) {
        headers.set(key, value);
        w[key] = value;
      }
    let R = await wsHeadersForLogging(s, {
      ...h,
      headers,
      redirect: "error",
    });
    notifyResponseObserver(serverRef, {
      method: y.method,
      status: R.status,
      headers: R.headers,
      requestHeaders: {
        get: (E) =>
          E.toLowerCase() === "authorization" || isCredentialRequestHeader(serverRef, E)
            ? null
            : headers.get(E),
      },
      bearerFingerprint,
    });
    return {
      response: R,
      owned: w,
    };
  };
  return async (s, h) => {
    let { response, owned } = await n(s, h);
    if (!(await shouldResendRequest(serverRef, response, owned))) return response;
    await response.body?.cancel().catch(() => {});
    let T = await n(s, h);
    shouldResendRequest(serverRef, T.response, T.owned);
    return T.response;
  };
}
//@ chunk-z1n5m6nf.js:53469-53731 placement
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
//@ chunk-z1n5m6nf.js:53731-54902 placement
/**
 * createClaudeAiProxyFetch（v1 副本）。
 */
function createClaudeAiProxyFetch_2(e, credentials) {
  e = stripRedirectLocation(e);
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
        response: await e(url, {
          ...init,
          headers,
          redirect,
        }),
        sentToken: currentTokens.accessToken,
      };
    };
    async function y(response) {
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
    if (response.status !== 401) return y(response);
    let M = response.headers.get("X-Mcp-Error-Code") ?? undefined;
    if (M) {
      logEvent("tengu_mcp_claudeai_proxy_401", {
        tokenChanged: false,
        proxyErrorCode: sanitizedFeatureErrorCodeForTelemetry(M),
      });
      return response;
    }
    let w = await handleOAuth401Error(sentToken, credentials).catch(() => false);
    logEvent("tengu_mcp_claudeai_proxy_401", {
      tokenChanged: w,
    });
    if (!w) {
      let now =
        isStorageV5Enabled() && credentials !== undefined
          ? await readFreshOAuthAccessToken(credentials)
          : getClaudeAIOAuthTokens()?.accessToken;
      if (!now || now === sentToken) throw new ClaudeAiProxyBearerRejectedError();
    }
    let response_2 = (await doRequest()).response;
    if (response_2.status === 401 && !response_2.headers.get("X-Mcp-Error-Code"))
      throw new ClaudeAiProxyBearerRejectedError();
    return y(response_2);
  };
}
//@ chunk-z1n5m6nf.js:54902-55414 placement
async function expandFirstPartyDesignScopes(e, r) {
  if (isDesignMcpUrl(e)) {
    let s = await getScaffoldResolver()?.(r);
    if (s?.ok) {
      if (s.expanded) {
        noteScopeExpansion(
          "Added user:design:read and user:design:write to your claude.ai login (for the Design MCP connector).",
        );
        logEvent("tengu_mcp_first_party_scope_expanded", {
          pathPrefix: lit("/v1/design/"),
        });
      }
      return {
        accessToken: s.accessToken,
        bearer: s.bearer,
      };
    }
  }
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials: r,
  });
  let n =
    isStorageV5Enabled() && r !== undefined ? await getClaudeAIOAuthTokensAsync(r) : getClaudeAIOAuthTokens();
  if (!n?.accessToken) return;
  return {
    accessToken: n.accessToken,
    bearer: n.scopes?.includes("user:design:read") ? "design_scoped_login" : "login",
  };
}
//@ chunk-z1n5m6nf.js:55414-55643 placement
/**
 * readNeedsConsentBit（v1 副本）。
 */
async function readNeedsConsentBit(response) {
  let r = peekScopeExpansionNotice();
  if (r === null) return null;
  let n;
  try {
    n = await response.clone().json();
  } catch {
    return null;
  }
  if (n == null || typeof n !== "object" || n.error !== "needs_consent") return null;
  let consent = n.consent;
  return r.isConsentBit(consent) ? consent : null;
}
//@ chunk-z1n5m6nf.js:55643-55780 placement
function noteDesignProjectId(e, r, name, s) {
  if (!r || !MEMBERSHIP_METHODS.has(name)) return;
  let projectId = s.project_id;
  if (typeof projectId === "string" && projectId.length > 0) {
    clearApprovedPlans(e, projectId);
    clearPlansForProject(e, projectId);
    clearVerifiedProjectGrant(e, projectId);
    markRecardProject(e, projectId);
  }
}
//@ chunk-z1n5m6nf.js:55780-55845 placement
var DESIGN_WRITE_TOOLS = new Set(["write_files", "create_support_js", "copy_files"]);
//@ chunk-z1n5m6nf.js:55845-56372 placement
/**
 * gateDesignWriteWithoutPlanToken（v1 副本）。
 */
function gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, name, n) {
  if (!isFirstPartyDesignServer || !DESIGN_WRITE_TOOLS.has(name)) return null;
  let planToken = n?.plan_token;
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
//@ chunk-z1n5m6nf.js:56372-56434 placement
var DESIGN_PLAN_TOOLS = new Set([
  ...DESIGN_WRITE_TOOLS,
  "finalize_plan",
  "delete_files",
  ...MEMBERSHIP_METHODS,
]);
//@ chunk-z1n5m6nf.js:56434-56471 placement
function isDesignGatedTool(isFirstPartyDesignServer, name) {
  return isFirstPartyDesignServer && DESIGN_PLAN_TOOLS.has(name);
}
//@ chunk-z1n5m6nf.js:56471-56763 placement
/**
 * askDesignConsent（v1 副本）。
 */
function askDesignConsent(message, r, __consentNonce) {
  return {
    behavior: "ask",
    message,
    updatedInput: {
      ...r,
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
//@ chunk-z1n5m6nf.js:56763-56837 placement
function isDesignServerConfig(config) {
  return (
    (config.type === "sse" || config.type === "http") &&
    isDesignMcpUrl(config.url) &&
    !configHasAuthorizationHeader(config)
  );
}
//@ chunk-z1n5m6nf.js:56837-56991 placement
/**
 * canAskDesignConsent（v1 副本）。
 */
function canAskDesignConsent(e) {
  let toolPermissionContext = getToolPermissionContext(e);
  return (
    !e.options.isNonInteractiveSession &&
    toolPermissionContext.mode !== "bypassPermissions" &&
    !(toolPermissionContext.mode === "plan" && toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-z1n5m6nf.js:56991-57163 placement
/**
 * canPromptForPermission（v1 副本）。
 */
function canPromptForPermission(e) {
  let toolPermissionContext = getToolPermissionContext(e);
  return (
    toolPermissionContext.mode !== "bypassPermissions" &&
    toolPermissionContext.mode !== "dontAsk" &&
    !(toolPermissionContext.mode === "plan" && toolPermissionContext.isBypassPermissionsModeAvailable) &&
    !toolPermissionContext.shouldAvoidPermissionPrompts
  );
}
//@ chunk-z1n5m6nf.js:57163-57174 placement
var MAX_DESIGN_CONSENT_ASKS = 100;
//@ chunk-z1n5m6nf.js:57174-57446 placement
/**
 * rememberDesignConsentAsk（v1 副本）。
 */
function rememberDesignConsentAsk(toolUseId, r, n) {
  let firstPartyDesignConsentAsks = getCliOwnedState().firstPartyDesignConsentAsks;
  let h = firstPartyDesignConsentAsks.get(toolUseId);
  let y = h !== undefined && h.bit === r;
  let S = y ? h.nonce : randomUUID();
  firstPartyDesignConsentAsks.delete(toolUseId);
  firstPartyDesignConsentAsks.set(toolUseId, {
    bit: r,
    nonce: S,
    askReachesUser: y ? h.askReachesUser && n : n,
  });
  while (firstPartyDesignConsentAsks.size > MAX_DESIGN_CONSENT_ASKS) {
    let T = firstPartyDesignConsentAsks.keys().next().value;
    if (T === undefined) break;
    firstPartyDesignConsentAsks.delete(T);
  }
  return S;
}
//@ chunk-z1n5m6nf.js:57446-57656 placement
/**
 * takeDesignConsentAsk（v1 副本）。
 */
function takeDesignConsentAsk(e, r) {
  if (e === undefined) return null;
  let firstPartyDesignConsentAsks = getCliOwnedState().firstPartyDesignConsentAsks;
  let s = firstPartyDesignConsentAsks.get(e) ?? null;
  firstPartyDesignConsentAsks.delete(e);
  if (s === null || r === undefined || s.nonce !== r) return null;
  return {
    bit: s.bit,
    askReachesUser: s.askReachesUser,
  };
}
//@ chunk-z1n5m6nf.js:57656-58489 placement
/**
 * wrapCallWithDesignConsent（v1 副本）。
 */
function wrapCallWithDesignConsent(e, r) {
  let { designSession, approvedConsentBit, consentAskReachesUser, credentials } = r;
  return async (S) => {
    let T = peekScopeExpansionNotice();
    try {
      let M = await e(S);
      if (approvedConsentBit !== null && !S.aborted)
        T?.seedDesignConsentBit(designSession, approvedConsentBit, true);
      return M;
    } catch (error) {
      if (!(error instanceof FirstPartyDesignNeedsConsentError) || !T) throw error;
      let consent = error.consent;
      if (consent !== approvedConsentBit) {
        T.seedDesignConsentBit(designSession, consent, false);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${T.consentPromptFor(consent)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
          "first-party design MCP needs_consent (not shown)",
        );
      }
      if (!consentAskReachesUser) {
        T.seedDesignConsentBit(designSession, consent, false);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${T.consentPromptFor(consent)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
          "first-party design MCP needs_consent (no prompt)",
        );
      }
      await T.postDesignConsent(designSession, consent, credentials);
      return e(S);
    }
  };
}
//@ chunk-z1n5m6nf.js:58489-59383 placement
/**
 * wrapFetchWithFirstPartyAuth（v1 副本）。
 */
function wrapFetchWithFirstPartyAuth_2(e, credentials, n) {
  e = stripRedirectLocation(e);
  return async (s, h) => {
    let headers = new Headers(h?.headers);
    let redirect = h?.redirect === "error" ? "error" : "manual";
    if (headers.has("Authorization") || !isFirstPartyMcpUrl(s) || !isFirstPartyProvider())
      return e(s, {
        ...h,
        redirect,
      });
    let T = async () => {
      let U = await expandFirstPartyDesignScopes(s, credentials);
      n.last = U?.bearer ?? "none";
      if (!U)
        return {
          response: await e(s, {
            ...h,
            redirect,
          }),
          sentToken: undefined,
        };
      let accessToken = U.accessToken;
      getPresentedCredentialLog().record(accessToken);
      let headers = {
        ...Object.fromEntries(new Headers(h?.headers)),
        Authorization: `Bearer ${accessToken}`,
      };
      return {
        response: await e(s, {
          ...h,
          headers,
          redirect,
        }),
        sentToken: accessToken,
      };
    };
    let M = async (U) => {
      if (U.response.status === 403 && U.sentToken && isDesignMcpUrl(s)) {
        let consent = await readNeedsConsentBit(U.response);
        if (consent !== null) throw new FirstPartyDesignNeedsConsentError(consent);
      }
    };
    let w = await T();
    await M(w);
    let { response, sentToken } = w;
    if (response.status !== 401 || !sentToken) return response;
    if (!(await handleOAuth401Error(sentToken, credentials).catch(() => false))) {
      let U =
        isStorageV5Enabled() && credentials !== undefined
          ? await readFreshOAuthAccessToken(credentials)
          : getClaudeAIOAuthTokens()?.accessToken;
      if (!U || U === sentToken) return response;
    }
    let H;
    try {
      H = await T();
    } catch {
      return response;
    }
    await M(H);
    return H.response;
  };
}
//@ chunk-z1n5m6nf.js:59383-59606 placement
/**
 * mergeRequestHeaders（v1 副本）。
 */
function mergeRequestHeaders_2(headers, authHeaders, n) {
  let headers_2 = new Headers({
    "User-Agent": getMCPUserAgent(),
    "Accept-Encoding": "identity",
    ...authHeaders,
  });
  new Headers(headers).forEach((h, y) => headers_2.set(y, h));
  for (let [key, value] of Object.entries(n)) headers_2.set(key, value);
  headers_2.set("Accept", "text/event-stream");
  return headers_2;
}
export {
  wrapFetchWithFirstPartyAuth_2,
  mergeRequestHeaders_2,
  wrapFetchWithCcrSessionAuth_2,
  wrapFetchWithCliOwnedBearer_2,
  createClaudeAiProxyFetch_2,
  isAuthFailure_2,
  handleRemoteConnectAuthError_2,
  handleRemoteAuthFailure_2,
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
};

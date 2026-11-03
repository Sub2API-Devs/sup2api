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
  lx,
  buildPluginSourceFields,
} from "../../utils/telemetry/pluginTelemetry.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { sanitizeConnectErrorCodeForTelemetry_2 } from "./discovery.js";
import { isLegacyProtocolEra } from "./connectionRegistry.js";
import { kR } from "../../../vendor/zod/v4/classic/errors.js";
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
import { IM } from "./mcpAccountKey.js";
import { flushDiscoveryCache, deleteDiscoveryCache } from "./discoveryCache.js";
import { mcpSdkGeneration } from "./mcpSdkGeneration.js";
import { AM } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { recordTokenlessRejection, handleRejectedToken } from "./signedOutFallback.js";
import { sanitizeErrorDetail } from "../api/deferredToolsState.js";
import { redactMcpErrorDetail } from "./mcpServerOrigin.js";
import { stripRedirectLocation } from "./connectionLifecycle.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { Ny } from "./discoveryIdentity.js";
import { getCurrentCallId, X_CCR_TURN_ID } from "./ccrTurnId.js";
import { getConnectionCache } from "./needsAuthCache.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../utils/json.js";
import {
  runBeforeRequestHook,
  resolveBearerTokenFor,
  withheldBearerRefusalFor,
  cliOwnedRequestHeaders,
  isCredentialRequestHeader,
  notifyResponseObserver,
  shouldResendRequest,
  ht,
} from "./cliOwnedClients.js";
import { gn } from "../../utils/shortHash.js";
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
  kYn,
  noteScopeExpansion,
  SZe,
  FirstPartyDesignNeedsConsentError,
} from "./firstPartyDesignConsent.js";
import {
  $ze,
  clearApprovedPlans,
  clearPlansForProject,
  clearVerifiedProjectGrant,
  F_t,
} from "./designPlanGate.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { getMCPUserAgent } from "../../utils/http.js";

/**
 * logMcpConnectionOtelEvent（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:46289-46748 placement
function logMcpConnectionOtelEvent_2(e, r, n) {
  let s = isToolDetailsLoggingEnabled(),
    h = r.pluginSource ? parsePluginIdentifier_2(r.pluginSource) : void 0,
    y = h && (isAnthropicPluginSource(getTelemetryPluginScope(h.name, h.marketplace, null)) || s);
  logOTelEvent("mcp_server_connection", {
    status: n.status,
    transport_type: r.type ?? "stdio",
    server_scope: r.scope,
    duration_ms: String(Math.round(n.durationMs)),
    is_plugin: h !== void 0,
    ...(h && { plugin_id_hash: lx(h.name, h.marketplace), "plugin.name": y ? h.name : THIRD_PARTY }),
    ...(n.errorCode && { error_code: String(sanitizeConnectErrorCodeForTelemetry_2(n.errorCode)) }),
    ...(s && { server_name: e, ...(n.error && { error: n.error }) }),
  });
}
//@ chunk-z1n5m6nf.js:46748-47381 placement
async function handleRemoteAuthFailure_2(e, r, n, s, h, y, S) {
  isLegacyProtocolEra();
  let T = s instanceof kR,
    M = T ? s.issues[0] : void 0,
    w = M ? `Server OAuth metadata invalid: ${M.path.join(".") || "(root)"} \u2014 ${M.message}` : void 0;
  (logEvent("tengu_mcp_server_needs_auth", {
    transportType: fromEnum(n),
    ...(T && { cause: lit("discovery_schema") }),
    ...mcpBaseUrlAnalytics(r, e),
  }),
    logMCPDebug(
      e,
      `Authentication required for ${{ sse: "SSE", http: "HTTP", "claudeai-proxy": "claude.ai proxy" }[n]} server`,
    ));
  let E = h && (r.type === "http" || r.type === "sse") && (await hasStoredRefreshToken(e, r));
  if (y === void 0 || isCurrentIdentityEpoch(y))
    isMcpAuthCached_3(
      e,
      r.type === "claudeai-proxy" ? r.id : void 0,
      E ? NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS_2 : void 0,
      S,
    );
  return (
    await purgeDiscoveryCacheOnAuthFailure(e, r, y),
    logFeatureSad("mcp_connect", "mcp_connect_needs_auth"),
    { name: e, type: "needs-auth", config: r, error: w }
  );
}
//@ chunk-z1n5m6nf.js:47381-47613 placement
async function purgeDiscoveryCacheOnAuthFailure(e, r, n) {
  let s = n === void 0 || isCurrentIdentityEpoch(n);
  if (IM())
    if (s) await flushDiscoveryCache(deleteDiscoveryCache(e, r));
    else
      logMCPDebug(
        e,
        "Discovery cache 401/403 purge skipped: identity changed since this connect round started (the current entry belongs to the new principal)",
      );
}
//@ chunk-z1n5m6nf.js:47613-48018 placement
var AUTH_REJECTION_SEVERITY = {
  AUTH_HEADER_REJECTED: { severity: "bad", featureErrorCode: "mcp_connect_auth_header_rejected" },
  HEADERS_HELPER_AUTH_REJECTED: {
    severity: "bad",
    featureErrorCode: "mcp_connect_headers_helper_auth_rejected",
  },
  CLI_OWNED_BEARER_REJECTED: { severity: "bad", featureErrorCode: "mcp_connect_cli_owned_bearer_rejected" },
  FIRST_PARTY_AUTH_REJECTED: { severity: "sad", featureErrorCode: "mcp_connect_first_party_auth_rejected" },
};
//@ chunk-z1n5m6nf.js:48018-48422 placement
function failWithAuthRejection({
  name: e,
  serverRef: serverRef,
  transportType: transportType,
  errorCode: errorCode,
  message: message,
  displayDetail: displayDetail,
}) {
  logEvent("tengu_mcp_server_connection_failed", {
    transportType: fromEnum(transportType),
    errorCode: fromEnum(errorCode),
    sdkGeneration: fromEnum(mcpSdkGeneration()),
    ...mcpBaseUrlAnalytics(serverRef, e),
    ...buildPluginSourceFields(serverRef),
  });
  let { severity: severity, featureErrorCode: featureErrorCode } = AUTH_REJECTION_SEVERITY[errorCode];
  if (severity === "bad") logFeatureBad("mcp_connect", featureErrorCode);
  else logFeatureSad("mcp_connect", featureErrorCode);
  return (
    logMCPError(e, message),
    {
      name: e,
      type: "failed",
      config: serverRef,
      error: message,
      ...(displayDetail !== void 0 && { displayDetail: displayDetail }),
      errorCode: errorCode,
    }
  );
}
//@ chunk-z1n5m6nf.js:48422-49991 placement
function failFirstPartyAuthRejected(e, r, n, s, h) {
  let y = "api.anthropic.com";
  try {
    if ("url" in n) y = new URL(n.url).host;
  } catch {}
  let S = `HTTP ${h ?? 401}`,
    T = isDesignServerConfig(n),
    M;
  switch (e) {
    case "design_credential":
      M =
        h === 403
          ? `${y} rejected your /design-login credential (HTTP 403). Check that your account has access to Claude Design, or run /design-login to re-authorize it and retry.`
          : `${y} rejected your /design-login credential (${S}). Run /design-login to re-authorize it and retry.`;
      break;
    case "none":
      M = `${y} needs a claude.ai sign-in and Claude Code had no usable credential to send (${S}). Run ${T ? "/design-login" : "/login"} and retry.`;
      break;
    case "design_scoped_login":
    case "login": {
      if (h === 403 && T)
        M =
          e === "design_scoped_login"
            ? `${y} rejected your claude.ai login for Claude Design (HTTP 403) even though that login already includes Claude Design permissions, so this is most likely an account or project access problem. Check that your account has access to Claude Design; if it does, run /design-login and retry.`
            : `${y} rejected your claude.ai login for Claude Design (HTTP 403), most likely because a /login token carries no Claude Design access. Run /design-login and retry, or check that your account has access to Claude Design.`;
      else
        M =
          h === 403
            ? `${y} rejected your claude.ai login (HTTP 403). Check that your account has access to this server. If it does, your ` +
              `token may be missing a scope \u2014 run ${"/login"} and retry.`
            : `${y} rejected your claude.ai login (${S}). Run /login and retry.`;
      break;
    }
    default:
      return e;
  }
  return failWithAuthRejection({
    name: r,
    serverRef: n,
    transportType: s,
    errorCode: "FIRST_PARTY_AUTH_REJECTED",
    message: M,
  });
}
//@ chunk-z1n5m6nf.js:49991-50071 placement
function mr(e, r, n) {
  return e instanceof AM || (e instanceof kR && n) || r === 401 || r === 403;
}
//@ chunk-z1n5m6nf.js:50071-51610 placement
async function handleRemoteConnectAuthError_2({
  name: e,
  serverRef: serverRef,
  transportType: transportType,
  error: error,
  statusCode: statusCode,
  sawAuthChallenge: sawAuthChallenge,
  hasUserAuthHeader: hasUserAuthHeader,
  helperMintsAuthHeader: helperMintsAuthHeader,
  cliOwnedBearer: cliOwnedBearer,
  useFirstPartyAuth: useFirstPartyAuth,
  firstPartyBearer: firstPartyBearer,
  authProvider: authProvider,
  roundEpoch: roundEpoch,
  storageV5: storageV5,
}) {
  if ((await recordTokenlessRejection(e, serverRef, authProvider), !mr(error, statusCode, sawAuthChallenge)))
    return;
  if (hasUserAuthHeader) {
    let he = sanitizeErrorDetail(redactMcpErrorDetail(e, serverRef, error.message));
    return failWithAuthRejection({
      name: e,
      serverRef: serverRef,
      transportType: transportType,
      errorCode: "AUTH_HEADER_REJECTED",
      message:
        `Server rejected the configured Authorization header (HTTP ${statusCode ?? 401}). ` +
        "Check that the token is valid for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when headers.Authorization is set.",
      ...(he !== "" && { displayDetail: `Error detail: ${he}` }),
    });
  }
  if (helperMintsAuthHeader) {
    let he = sanitizeErrorDetail(redactMcpErrorDetail(e, serverRef, error.message));
    return failWithAuthRejection({
      name: e,
      serverRef: serverRef,
      transportType: transportType,
      errorCode: "HEADERS_HELPER_AUTH_REJECTED",
      message:
        `Server rejected the Authorization header minted by the configured headersHelper (HTTP ${statusCode ?? 401}). ` +
        "Check that the helper command returns a valid credential for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when the helper supplies Authorization.",
      ...(he !== "" && { displayDetail: `Error detail: ${he}` }),
    });
  }
  if (cliOwnedBearer)
    return failWithAuthRejection({
      name: e,
      serverRef: serverRef,
      transportType: transportType,
      errorCode: "CLI_OWNED_BEARER_REJECTED",
      message: `Server rejected the session credential (HTTP ${statusCode ?? 401}). It will be retried when the session credential is refreshed.`,
    });
  if (useFirstPartyAuth)
    return failFirstPartyAuthRejected(firstPartyBearer ?? "none", e, serverRef, transportType, statusCode);
  let U = error instanceof AM || statusCode === 401,
    re = await handleRejectedToken({
      name: e,
      serverRef: serverRef,
      authProvider: authProvider,
      isRefreshPath401: U,
      needsAuth: () =>
        handleRemoteAuthFailure_2(e, serverRef, transportType, error, U, roundEpoch, storageV5),
    });
  if (re !== void 0) return (await purgeDiscoveryCacheOnAuthFailure(e, serverRef, roundEpoch), re);
  return handleRemoteAuthFailure_2(e, serverRef, transportType, error, U, roundEpoch, storageV5);
}
/**
 * wrapFetchWithCcrSessionAuth（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:51610-52203 placement
function wrapFetchWithCcrSessionAuth_2(e, r, n) {
  return (
    (e = stripRedirectLocation(e)),
    async (s, h) => {
      let headers = new Headers(h?.headers);
      if (!headers.has("Authorization")) {
        let R = getSessionIngressAuthToken();
        if (R) (Ny().record(R), headers.set("Authorization", `Bearer ${R}`));
      }
      let S = getCurrentCallId();
      if ((headers.delete(X_CCR_TURN_ID), S)) headers.set(X_CCR_TURN_ID, S);
      if ((headers.delete(X_CCR_DIAL_TOOL_USE_ID), r?.toolUseId !== void 0)) {
        let R = classifyHandshakeRequest(h);
        if (R === "handshake" || (R === "listing" && r.withListings))
          headers.set(X_CCR_DIAL_TOOL_USE_ID, r.toolUseId);
      }
      getConnectionCache().attachCcrTicket(s, headers);
      let T = h?.redirect === "error" ? "error" : "manual",
        M = await e(s, { ...h, headers: headers, redirect: T }),
        w = getConnectionCache();
      if (
        (w.noteCcrTicket(s, headers, M),
        n !== void 0 &&
          (M.status === 401 || w.lapsedCcrSignIns.has(n)) &&
          classifyHandshakeRequest(h) !== void 0)
      )
        w.noteCcrDialAnswer(n, M);
      return M;
    }
  );
}
//@ chunk-z1n5m6nf.js:52203-52460 placement
function classifyHandshakeRequest(e) {
  if (e?.method?.toUpperCase() !== "POST" || typeof e.body !== "string") return;
  let r = u({ method: o() }).safeParse(safeParseJSON(e.body, !1)).data?.method;
  if (r === "initialize" || r === "notifications/initialized") return "handshake";
  return r === "tools/list" ? "listing" : void 0;
}
//@ chunk-z1n5m6nf.js:52460-52525 placement
var X_CCR_DIAL_TOOL_USE_ID = "X-CCR-Dial-Tool-Use-Id",
  TOOL_USE_ID_PATTERN = /^toolu_[A-Za-z0-9_-]{1,64}$/;
/**
 * wrapFetchWithCliOwnedBearer（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:52525-53469 placement
function wrapFetchWithCliOwnedBearer_2(e, r) {
  let n = async (...[s, h]) => {
    let y = { method: (h?.method ?? "GET").toUpperCase(), body: h?.body };
    await runBeforeRequestHook(r, y);
    let headers = new Headers(h?.headers),
      T = null,
      M = !1;
    if (!headers.has("Authorization")) {
      let E = await resolveBearerTokenFor(r);
      if (E) (Ny().record(E), headers.set("Authorization", `Bearer ${E}`), (T = gn(E)));
      else {
        M = !0;
        let Q = withheldBearerRefusalFor(r);
        if (Q !== void 0)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            Q,
            "CLI-owned MCP request not sent: its bearer was withheld",
          );
      }
    }
    let w = {};
    for (let [E, Q] of Object.entries(cliOwnedRequestHeaders(r, y)))
      if (!headers.has(E) && E.toLowerCase() !== "authorization" && !(M && isCredentialRequestHeader(r, E)))
        (headers.set(E, Q), (w[E] = Q));
    let R = await e(s, { ...h, headers: headers, redirect: "error" });
    return (
      notifyResponseObserver(r, {
        method: y.method,
        status: R.status,
        headers: R.headers,
        requestHeaders: {
          get: (E) =>
            E.toLowerCase() === "authorization" || isCredentialRequestHeader(r, E) ? null : headers.get(E),
        },
        bearerFingerprint: T,
      }),
      { response: R, owned: w }
    );
  };
  return async (s, h) => {
    let { response: response, owned: owned } = await n(s, h);
    if (!(await shouldResendRequest(r, response, owned))) return response;
    await response.body?.cancel().catch(() => {});
    let T = await n(s, h);
    return (shouldResendRequest(r, T.response, T.owned), T.response);
  };
}
/**
 * ClaudeAiProxyBearerRejectedError（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:53469-53731 placement
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
/**
 * createClaudeAiProxyFetch（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:53731-54902 placement
function createClaudeAiProxyFetch_2(e, r) {
  return (
    (e = stripRedirectLocation(e)),
    async (n, s) => {
      let h = async () => {
        await checkAndRefreshOAuthTokenIfNeeded({ credentials: r });
        let E =
          isStorageV5Enabled() && r !== void 0
            ? await getClaudeAIOAuthTokensAsync(r)
            : getClaudeAIOAuthTokens();
        if (!E) throw Error("No claude.ai OAuth token available");
        let headers = new Headers(s?.headers);
        (Ny().record(E.accessToken), headers.set("Authorization", `Bearer ${E.accessToken}`));
        let H = s?.redirect === "error" ? "error" : "manual";
        return { response: await e(n, { ...s, headers: headers, redirect: H }), sentToken: E.accessToken };
      };
      async function y(E) {
        if (E.status >= 400 && E.headers.get("content-type")?.includes("text/event-stream")) {
          let text = await E.text(),
            found = text
              .split(
                `
`,
              )
              .find((U) => U.startsWith("data: "));
          return new Response(found ? found.slice(6) : text, {
            status: E.status,
            statusText: E.statusText,
            headers: E.headers,
          });
        }
        return E;
      }
      let { response: response, sentToken: sentToken } = await h();
      if (response.status !== 401) return y(response);
      let M = response.headers.get("X-Mcp-Error-Code") ?? void 0;
      if (M)
        return (
          logEvent("tengu_mcp_claudeai_proxy_401", {
            tokenChanged: !1,
            proxyErrorCode: sanitizedFeatureErrorCodeForTelemetry(M),
          }),
          response
        );
      let w = await handleOAuth401Error(sentToken, r).catch(() => !1);
      if ((logEvent("tengu_mcp_claudeai_proxy_401", { tokenChanged: w }), !w)) {
        let E =
          isStorageV5Enabled() && r !== void 0
            ? await readFreshOAuthAccessToken(r)
            : getClaudeAIOAuthTokens()?.accessToken;
        if (!E || E === sentToken) throw new ClaudeAiProxyBearerRejectedError();
      }
      let response_2 = (await h()).response;
      if (response_2.status === 401 && !response_2.headers.get("X-Mcp-Error-Code"))
        throw new ClaudeAiProxyBearerRejectedError();
      return y(response_2);
    }
  );
}
//@ chunk-z1n5m6nf.js:54902-55414 placement
async function expandFirstPartyDesignScopes(e, r) {
  if (isDesignMcpUrl(e)) {
    let s = await kYn()?.(r);
    if (s?.ok) {
      if (s.expanded)
        (noteScopeExpansion(
          "Added user:design:read and user:design:write to your claude.ai login (for the Design MCP connector).",
        ),
          logEvent("tengu_mcp_first_party_scope_expanded", { pathPrefix: lit("/v1/design/") }));
      return { accessToken: s.accessToken, bearer: s.bearer };
    }
  }
  await checkAndRefreshOAuthTokenIfNeeded({ credentials: r });
  let n =
    isStorageV5Enabled() && r !== void 0 ? await getClaudeAIOAuthTokensAsync(r) : getClaudeAIOAuthTokens();
  if (!n?.accessToken) return;
  return {
    accessToken: n.accessToken,
    bearer: n.scopes?.includes("user:design:read") ? "design_scoped_login" : "login",
  };
}
/**
 * readNeedsConsentBit（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:55414-55643 placement
async function readNeedsConsentBit(e) {
  let r = SZe();
  if (r === null) return null;
  let n;
  try {
    n = await e.clone().json();
  } catch {
    return null;
  }
  if (n == null || typeof n !== "object" || n.error !== "needs_consent") return null;
  let consent = n.consent;
  return r.isConsentBit(consent) ? consent : null;
}
//@ chunk-z1n5m6nf.js:55643-55780 placement
function noteDesignProjectId(e, r, n, s) {
  if (!r || !$ze.has(n)) return;
  let project_id = s.project_id;
  if (typeof project_id === "string" && project_id.length > 0)
    (clearApprovedPlans(e, project_id),
      clearPlansForProject(e, project_id),
      clearVerifiedProjectGrant(e, project_id),
      F_t(e, project_id));
}
//@ chunk-z1n5m6nf.js:55780-55845 placement
var DESIGN_WRITE_TOOLS = new Set(["write_files", "create_support_js", "copy_files"]);
/**
 * gateDesignWriteWithoutPlanToken（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:55845-56372 placement
function gateDesignWriteWithoutPlanToken(e, r, n) {
  if (!e || !DESIGN_WRITE_TOOLS.has(r)) return null;
  let s = n?.plan_token;
  if (typeof s === "string" && s.length > 0) return null;
  return {
    behavior: "deny",
    message: `${r}: writing without a plan_token is available only through the native Claude Design tool \u2014 call finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "tokenless design writes are native-tool-only \u2014 this connector surface has no reserved-path or grant-approval flow",
      classifierApprovable: !1,
    },
  };
}
//@ chunk-z1n5m6nf.js:56372-56434 placement
var DESIGN_PLAN_TOOLS = new Set([...DESIGN_WRITE_TOOLS, "finalize_plan", "delete_files", ...$ze]);
//@ chunk-z1n5m6nf.js:56434-56471 placement
function isDesignGatedTool(e, r) {
  return e && DESIGN_PLAN_TOOLS.has(r);
}
/**
 * askDesignConsent（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:56471-56763 placement
function askDesignConsent(e, r, n) {
  return {
    behavior: "ask",
    message: e,
    updatedInput: { ...r, __consentNonce: n },
    localDisplayOnly: !0,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "design agent consent \u2014 approving records a server-side grant for Claude agents to write your design projects",
      classifierApprovable: !1,
    },
  };
}
//@ chunk-z1n5m6nf.js:56763-56837 placement
function isDesignServerConfig(e) {
  return (e.type === "sse" || e.type === "http") && isDesignMcpUrl(e.url) && !configHasAuthorizationHeader(e);
}
/**
 * canAskDesignConsent（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:56837-56991 placement
function canAskDesignConsent(e) {
  let r = getToolPermissionContext(e);
  return (
    !e.options.isNonInteractiveSession &&
    r.mode !== "bypassPermissions" &&
    !(r.mode === "plan" && r.isBypassPermissionsModeAvailable)
  );
}
/**
 * canPromptForPermission（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:56991-57163 placement
function canPromptForPermission(e) {
  let r = getToolPermissionContext(e);
  return (
    r.mode !== "bypassPermissions" &&
    r.mode !== "dontAsk" &&
    !(r.mode === "plan" && r.isBypassPermissionsModeAvailable) &&
    !r.shouldAvoidPermissionPrompts
  );
}
//@ chunk-z1n5m6nf.js:57163-57174 placement
var MAX_DESIGN_CONSENT_ASKS = 100;
/**
 * rememberDesignConsentAsk（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:57174-57446 placement
function rememberDesignConsentAsk(e, r, n) {
  let firstPartyDesignConsentAsks = ht().firstPartyDesignConsentAsks,
    h = firstPartyDesignConsentAsks.get(e),
    y = h !== void 0 && h.bit === r,
    S = y ? h.nonce : randomUUID();
  (firstPartyDesignConsentAsks.delete(e),
    firstPartyDesignConsentAsks.set(e, { bit: r, nonce: S, askReachesUser: y ? h.askReachesUser && n : n }));
  while (firstPartyDesignConsentAsks.size > MAX_DESIGN_CONSENT_ASKS) {
    let T = firstPartyDesignConsentAsks.keys().next().value;
    if (T === void 0) break;
    firstPartyDesignConsentAsks.delete(T);
  }
  return S;
}
/**
 * takeDesignConsentAsk（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:57446-57656 placement
function takeDesignConsentAsk(e, r) {
  if (e === void 0) return null;
  let firstPartyDesignConsentAsks = ht().firstPartyDesignConsentAsks,
    s = firstPartyDesignConsentAsks.get(e) ?? null;
  if ((firstPartyDesignConsentAsks.delete(e), s === null || r === void 0 || s.nonce !== r)) return null;
  return { bit: s.bit, askReachesUser: s.askReachesUser };
}
/**
 * wrapCallWithDesignConsent（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:57656-58489 placement
function wrapCallWithDesignConsent(e, r) {
  let {
    designSession: designSession,
    approvedConsentBit: approvedConsentBit,
    consentAskReachesUser: consentAskReachesUser,
    credentials: credentials,
  } = r;
  return async (S) => {
    let T = SZe();
    try {
      let M = await e(S);
      if (approvedConsentBit !== null && !S.aborted)
        T?.seedDesignConsentBit(designSession, approvedConsentBit, !0);
      return M;
    } catch (error) {
      if (!(error instanceof FirstPartyDesignNeedsConsentError) || !T) throw error;
      let consent = error.consent;
      if (consent !== approvedConsentBit)
        throw (
          T.seedDesignConsentBit(designSession, consent, !1),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${T.consentPromptFor(consent)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
            "first-party design MCP needs_consent (not shown)",
          )
        );
      if (!consentAskReachesUser)
        throw (
          T.seedDesignConsentBit(designSession, consent, !1),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${T.consentPromptFor(consent)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
            "first-party design MCP needs_consent (no prompt)",
          )
        );
      return (await T.postDesignConsent(designSession, consent, credentials), e(S));
    }
  };
}
/**
 * wrapFetchWithFirstPartyAuth（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:58489-59383 placement
function wrapFetchWithFirstPartyAuth_2(e, r, n) {
  return (
    (e = stripRedirectLocation(e)),
    async (s, h) => {
      let headers = new Headers(h?.headers),
        S = h?.redirect === "error" ? "error" : "manual";
      if (headers.has("Authorization") || !isFirstPartyMcpUrl(s) || !isFirstPartyProvider())
        return e(s, { ...h, redirect: S });
      let T = async () => {
          let U = await expandFirstPartyDesignScopes(s, r);
          if (((n.last = U?.bearer ?? "none"), !U))
            return { response: await e(s, { ...h, redirect: S }), sentToken: void 0 };
          let accessToken = U.accessToken;
          Ny().record(accessToken);
          let he = { ...Object.fromEntries(new Headers(h?.headers)), Authorization: `Bearer ${accessToken}` };
          return { response: await e(s, { ...h, headers: he, redirect: S }), sentToken: accessToken };
        },
        M = async (U) => {
          if (U.response.status === 403 && U.sentToken && isDesignMcpUrl(s)) {
            let re = await readNeedsConsentBit(U.response);
            if (re !== null) throw new FirstPartyDesignNeedsConsentError(re);
          }
        },
        w = await T();
      await M(w);
      let { response: response, sentToken: sentToken } = w;
      if (response.status !== 401 || !sentToken) return response;
      if (!(await handleOAuth401Error(sentToken, r).catch(() => !1))) {
        let U =
          isStorageV5Enabled() && r !== void 0
            ? await readFreshOAuthAccessToken(r)
            : getClaudeAIOAuthTokens()?.accessToken;
        if (!U || U === sentToken) return response;
      }
      let H;
      try {
        H = await T();
      } catch {
        return response;
      }
      return (await M(H), H.response);
    }
  );
}
/**
 * mergeRequestHeaders（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:59383-59606 placement
function mergeRequestHeaders_2(e, r, n) {
  let headers = new Headers({ "User-Agent": getMCPUserAgent(), "Accept-Encoding": "identity", ...r });
  new Headers(e).forEach((h, y) => headers.set(y, h));
  for (let [h, y] of Object.entries(n)) headers.set(h, y);
  return (headers.set("Accept", "text/event-stream"), headers);
}

export {
  wrapFetchWithFirstPartyAuth_2,
  mergeRequestHeaders_2,
  wrapFetchWithCcrSessionAuth_2,
  wrapFetchWithCliOwnedBearer_2,
  createClaudeAiProxyFetch_2,
  mr,
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

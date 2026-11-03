/**
 * services/mcp/auth.ts
 *
 * 并入旧版已有路径：MCP OAuth。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/auth.ts
 * pieces: chunk-1kaj6e83.js (43), chunk-4w0z5wdp.js (6), chunk-cyj440je.js (10), chunk-n1aavqzh.js (56), chunk-yqnmafqp.js (36)
 * attribution: sole-consumer 12, affinity 4, facade-exports 50, layout 42, fingerprint 10, placement 32, callgraph-fingerprint 1
 */
import { randomUUID, randomBytes, createHash } from "crypto";
import { createServer } from "http";
import { parse } from "url";
import { join } from "path";
import {
  discoverOAuthProtectedResourceMetadata,
  discoverAuthorizationServerMetadata as discoverAuthorizationServerMetadata_2,
  et,
  IssuerMismatchError,
  RegistrationRejectedError,
  discoverOAuthServerInfo as discoverOAuthServerInfo_2,
  UnauthorizedError as UnauthorizedError_2,
  auth as auth_2,
  extractWWWAuthenticateParams as extractWWWAuthenticateParams_2,
  refreshAuthorization as refreshAuthorization_2,
} from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import {
  defaultXaaFetch_2,
  normalizeUrl_2,
  JWT_BEARER_GRANT_2,
  redactTokens_2,
  makeXaaFetch_2,
  XaaTokenExchangeError_2,
  performCrossAppAccess_2,
  XaaTokenExchangeError,
} from "./xaa.js";
import {
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  errorMessage,
} from "../../utils/errors.js";
import { redactUrlSecrets } from "../../utils/urlRedaction.js";
import { getPresentedCredentialLog, basicAuthValue } from "./discoveryIdentity.js";
import {
  JwtBearerResponseSchema_2,
  OAuthTokensSchema as OAuthTokensSchema_2,
  OAuthErrorResponseSchema as OAuthErrorResponseSchema_2,
  OAuthMetadataSchema as OAuthMetadataSchema_2,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { logMCPDebug } from "../../utils/log.js";
import {
  TRANSIENT_SOCKET_CODES,
  UNREACHABLE_ERROR_CODES,
  extractConnectionErrorDetails,
} from "../api/errorUtils.js";
import {
  OAuthErrorCode,
  OAuthError as OAuthError_2,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import {
  fromEnumOpt,
  lit,
  mcpNameForAnalytics_GATE_EVALUATED,
  fromEnum,
  fromEnumArr,
  fromNumberOpt,
} from "../analytics/safeMetadata.js";
import { UNREACHABLE_ERRNOS } from "./mcpResultErrors.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { sleep } from "../../utils/sleep.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { loggingSafeOrigin, McpCredentialStoreUnavailableError } from "./client.js";
import { isMcpServerLoggableInAnalytics } from "../analytics/metadata.js";
import { logEvent } from "../analytics/index.js";
import { shortHash } from "../../utils/shortHash.js";
import { buildRedirectUri, findAvailablePort, firstOf } from "./oauthPort.js";
import { env } from "../../utils/env.js";
import { MCP_CLIENT_METADATA_URL } from "../../constants/oauth.js";
import { getCliOwnedState, isCliOwnedConfig } from "./cliOwnedClients.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import {
  xaaPinnedServer,
  authDiscoveryState,
  pinXaaAuth,
  isTokenRejected,
  withoutTokenlessRejection,
  mergeSignInAuth,
  recordSavedAccessToken,
  mergeDiscoveredAuth,
  tokenlessRejectedAt,
} from "./signedOutFallback.js";
import {
  sameOriginRedirectGuard,
  wrapFetchWithHeaders,
  dynamicHeadersForRequest,
  mcpServerTelemetry,
} from "./headersHelper.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { readSecureStorageForMcp } from "./credentialStoreRead.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { confirmCredentialRemoval } from "../../utils/secureStorage/credentialLegs.js";
import { clearDiscoveryPathMemo } from "./discoveryCache.js";
import {
  getXaaIdpSettings,
  getIdpClientSecret_2,
  getCachedIdpIdToken_2,
  acquireIdpIdToken_2,
  discoverOidc_2,
  clearIdpIdToken_2,
  isXaaEnabled,
  getIdpClientSecret,
  getCachedIdpIdToken,
  acquireIdpIdToken,
  discoverOidc,
  clearIdpIdToken,
} from "./xaaIdpLogin.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { callbackPageBody } from "../oauth/callbackPage.js";
import { getPlatform } from "../../utils/platform.js";
import { isBrowserUnavailable, openValidatedUrlSucceeded } from "../../utils/browser.js";
import { isDiskless } from "../../bootstrap/state.js";
import {
  getProjectDirsUpToHome,
  clearKeychainCache,
} from "../../utils/secureStorage/macOsKeychainHelpers.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { lock } from "../../utils/lockfile.js";
import { AUTH_LOST_SIGNAL } from "./connectionFlags.js";
import {
  OAuthError,
  InvalidGrantError,
  ServerError,
  TemporarilyUnavailableError,
  TooManyRequestsError,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/auth/errors.js";
import {
  OAuthTokensSchema,
  OAuthErrorResponseSchema,
  OAuthMetadataSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/shared/auth.js";
import {
  discoverOAuthServerInfo,
  discoverAuthorizationServerMetadata,
  UnauthorizedError,
  auth,
  extractWWWAuthenticateParams,
  refreshAuthorization,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { isLoopbackOrigin_2, extractHost } from "../../utils/plugins/fetchTelemetry.js";
import { uniq } from "../../utils/collections.js";
import { DOCS_MCP_PATH } from "./firstPartyServerIds.js";
import { isFirstPartyAnthropicHost, isFirstPartyProvider } from "../../utils/model/providers.js";
import { normalizeServerNameShort } from "../api/deferredToolsState.js";
import { claudeCommand } from "../../utils/worktreeResumeHint.js";
import { isCcrInjectedMcpUrl } from "./ccrMcpUrls.js";

//@ chunk-n1aavqzh.js:2890-3504 placement = discoverProtectedResource (0.828)
/**
 * discoverProtectedResource（v2 副本）。
 */
async function discoverProtectedResource(serverUrl, opts) {
  let prm;
  try {
    prm = await discoverOAuthProtectedResourceMetadata(
      serverUrl,
      undefined,
      opts?.fetchFn ?? defaultXaaFetch_2,
    );
  } catch (error) {
    if (isAbortError(error)) throw error;
    let s = error instanceof Error ? /^HTTP (\d{3}) /.exec(error.message)?.[1] : undefined;
    throw Error(
      `XAA: PRM discovery failed for ${redactUrlSecrets(serverUrl)} (${s ? `HTTP ${s}` : error instanceof Error ? error.name : typeof error})`,
    );
  }
  if (!prm.resource || !prm.authorization_servers?.[0])
    throw Error("XAA: PRM discovery failed: PRM missing resource or authorization_servers");
  if (normalizeUrl_2(prm.resource) !== normalizeUrl_2(serverUrl))
    throw Error(
      `XAA: PRM discovery failed: PRM resource mismatch: expected ${redactUrlSecrets(serverUrl)}, got ${redactUrlSecrets(prm.resource)}`,
    );
  return {
    resource: prm.resource,
    authorization_servers: prm.authorization_servers,
  };
}
//@ chunk-n1aavqzh.js:3504-4420 placement = discoverAuthorizationServer (0.794)
/**
 * discoverAuthorizationServer（v2 副本，元数据发现跳过 issuer 内建校验后自行比对）。
 */
async function discoverAuthorizationServer(asUrl, opts) {
  let meta;
  try {
    meta = await discoverAuthorizationServerMetadata_2(asUrl, {
      fetchFn: opts?.fetchFn ?? defaultXaaFetch_2,
      skipIssuerValidation: true,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    let s = error instanceof Error ? /^HTTP (\d{3}) /.exec(error.message)?.[1] : undefined;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: AS metadata discovery failed (${s ? `HTTP ${s}` : error instanceof Error ? error.name : typeof error})`,
      "XAA: AS metadata discovery failed",
    );
  }
  if (!meta?.issuer || !meta.token_endpoint)
    throw Error(`XAA: AS metadata discovery failed: no valid metadata at ${redactUrlSecrets(asUrl)}`);
  if (normalizeUrl_2(meta.issuer) !== normalizeUrl_2(asUrl))
    throw Error(
      `XAA: AS metadata discovery failed: issuer mismatch: expected ${redactUrlSecrets(asUrl)}, got ${redactUrlSecrets(meta.issuer)}`,
    );
  if (!URL.canParse(meta.token_endpoint) || new URL(meta.token_endpoint).protocol !== "https:")
    throw Error(`XAA: refusing non-HTTPS token endpoint: ${redactUrlSecrets(meta.token_endpoint)}`);
  return {
    issuer: meta.issuer,
    token_endpoint: meta.token_endpoint,
    grant_types_supported: meta.grant_types_supported,
    token_endpoint_auth_methods_supported: meta.token_endpoint_auth_methods_supported,
  };
}
//@ chunk-n1aavqzh.js:5535-6523 sole-consumer = exchangeJwtAuthGrant (0.989)
/**
 * exchangeJwtAuthGrant（v2 副本）。
 */
async function exchangeJwtAuthGrant(opts) {
  let fetchFn = opts.fetchFn ?? defaultXaaFetch_2;
  let authMethod = opts.authMethod ?? "client_secret_basic";
  let params = new URLSearchParams({
    grant_type: JWT_BEARER_GRANT_2,
    assertion: opts.assertion,
  });
  if (opts.scope) params.set("scope", opts.scope);
  let headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (authMethod === "client_secret_basic") {
    let basicAuth = Buffer.from(
      `${encodeURIComponent(opts.clientId)}:${encodeURIComponent(opts.clientSecret)}`,
    ).toString("base64");
    headers.Authorization = `Basic ${basicAuth}`;
    getPresentedCredentialLog().record(basicAuth);
  } else {
    params.set("client_id", opts.clientId);
    params.set("client_secret", opts.clientSecret);
  }
  getPresentedCredentialLog().record(opts.clientSecret);
  getPresentedCredentialLog().record(opts.assertion);
  let res = await fetchFn(opts.tokenEndpoint, {
    method: "POST",
    headers,
    body: params,
  });
  if (!res.ok) {
    let body = redactTokens_2(await res.text()).slice(0, 200);
    throw Error(`XAA: jwt-bearer grant failed: HTTP ${res.status}: ${body}`);
  }
  let rawTokens;
  try {
    rawTokens = await res.json();
  } catch {
    throw Error(
      `XAA: jwt-bearer grant returned non-JSON (captive portal?) at ${redactUrlSecrets(opts.tokenEndpoint)}`,
    );
  }
  let tokensParsed = JwtBearerResponseSchema_2().safeParse(rawTokens);
  if (!tokensParsed.success)
    throw Error(`XAA: jwt-bearer response did not match expected shape: ${redactTokens_2(rawTokens)}`);
  return tokensParsed.data;
}
//@ chunk-n1aavqzh.js:6523-8495 sole-consumer = performCrossAppAccess (0.894)
/**
 * performCrossAppAccess（v2 副本）。
 */
async function performCrossAppAccess(serverUrl, config, serverName = "xaa", abortSignal) {
  let fetchFn = makeXaaFetch_2(abortSignal);
  logMCPDebug(serverName, `XAA: discovering PRM for ${redactUrlSecrets(serverUrl)}`);
  let prm = await discoverProtectedResource(serverUrl, {
    fetchFn,
  });
  logMCPDebug(
    serverName,
    `XAA: discovered resource=${redactUrlSecrets(prm.resource)} ASes=[${prm.authorization_servers.map(redactUrlSecrets).join(", ")}]`,
  );
  let pinnedAuthorizationServer = config.pinnedAuthorizationServer;
  let A =
    pinnedAuthorizationServer === undefined
      ? prm.authorization_servers
      : prm.authorization_servers.filter(
          (authorizationServer) =>
            normalizeUrl_2(authorizationServer) === normalizeUrl_2(pinnedAuthorizationServer),
        );
  if (pinnedAuthorizationServer !== undefined && A.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: authorization server changed: signed in with ${redactUrlSecrets(pinnedAuthorizationServer)}, server now names [${prm.authorization_servers.map(redactUrlSecrets).join(", ")}]. If this move is expected, run \`claude mcp remove\` for this server and add it again with its client secret.`,
      "XAA: authorization server changed",
    );
  let asMeta;
  let asErrors = [];
  for (let asUrl of A) {
    let candidate;
    try {
      candidate = await discoverAuthorizationServer(asUrl, {
        fetchFn,
      });
    } catch (e) {
      if (abortSignal?.aborted) throw e;
      asErrors.push(`${redactUrlSecrets(asUrl)}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (candidate.grant_types_supported && !candidate.grant_types_supported.includes(JWT_BEARER_GRANT_2)) {
      asErrors.push(
        `${redactUrlSecrets(asUrl)}: does not advertise jwt-bearer grant (supported: ${candidate.grant_types_supported.join(", ")})`,
      );
      continue;
    }
    asMeta = candidate;
    break;
  }
  if (!asMeta)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: no authorization server supports jwt-bearer. Tried: ${asErrors.join("; ")}`,
      `XAA: no authorization server supports jwt-bearer (tried ${A.length})`,
    );
  let authMethods = asMeta.token_endpoint_auth_methods_supported;
  let authMethod =
    authMethods && !authMethods.includes("client_secret_basic") && authMethods.includes("client_secret_post")
      ? "client_secret_post"
      : "client_secret_basic";
  logMCPDebug(
    serverName,
    `XAA: AS issuer=${redactUrlSecrets(asMeta.issuer)} token_endpoint=${redactUrlSecrets(asMeta.token_endpoint)} auth_method=${authMethod}`,
  );
  logMCPDebug(serverName, "XAA: exchanging id_token for ID-JAG at IdP");
  let jag = await et({
    tokenEndpoint: config.idpTokenEndpoint,
    audience: asMeta.issuer,
    resource: prm.resource,
    idToken: config.idpIdToken,
    clientId: config.idpClientId,
    clientSecret: config.idpClientSecret,
    fetchFn,
  });
  logMCPDebug(serverName, "XAA: ID-JAG obtained");
  logMCPDebug(serverName, "XAA: exchanging ID-JAG for access_token at AS");
  let tokens = await exchangeJwtAuthGrant({
    tokenEndpoint: asMeta.token_endpoint,
    assertion: jag.jwtAuthGrant,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authMethod,
    fetchFn,
  });
  logMCPDebug(serverName, "XAA: access_token obtained");
  return {
    ...tokens,
    authorizationServerUrl: asMeta.issuer,
  };
}
//@ chunk-n1aavqzh.js:8495-8563 sole-consumer
/**
 * 认证重试前的等待。
 */
var AUTH_REQUEST_TIMEOUT_MS = 30000;
var AUTH_RETRY_DELAY_MS = 500;
var AUTH_FLOW_DISCOVERY_TTL_MS = 600000;
var RETRYABLE_CONNECTION_ERRORS = new Set([
  ...TRANSIENT_SOCKET_CODES,
  ...UNREACHABLE_ERROR_CODES,
  "ETIMEDOUT",
]);
//@ chunk-n1aavqzh.js:8563-8696 sole-consumer
/**
 * 判断错误是否可重试（中止、超时或连接错误）。
 */
function isRetryableAuthError(error) {
  if (isAbortError(error)) return true;
  if (error instanceof Error && error.name === "TimeoutError") return true;
  let connectionErrorDetails = extractConnectionErrorDetails(error);
  return connectionErrorDetails !== null && RETRYABLE_CONNECTION_ERRORS.has(connectionErrorDetails.code);
}
//@ chunk-n1aavqzh.js:8696-8797 sole-consumer
function isZodError_2(e) {
  let t = e;
  return (t?.name === "ZodError" || t?.name === "$ZodError") && Array.isArray(t?.issues);
}
//@ chunk-n1aavqzh.js:8797-8922 affinity
/**
 * 已知 OAuth 错误码全集（设备流 + 重试类）。
 */
var DEVICE_FLOW_PENDING_ERRORS = new Set(Object.values(OAuthErrorCode));
var DEVICE_FLOW_RETRY_ERRORS = ["authorization_pending", "expired_token", "slow_down"];
var KNOWN_OAUTH_ERROR_CODES = [...Object.values(OAuthErrorCode), ...DEVICE_FLOW_RETRY_ERRORS];
//@ chunk-n1aavqzh.js:8922-8989 facade-exports
/**
 * 把 OAuth 错误码收敛成遥测白名单值：命中已知错误码表则原样（标为可上报）返回，否则记为 `other`，避免把服务器自定义字符串送进遥测。（v2）
 */
function sanitizeOAuthErrorCodeForAnalytics_2(e) {
  let found = KNOWN_OAUTH_ERROR_CODES.find((n) => n === e);
  return fromEnumOpt(found) ?? lit("other");
}
//@ chunk-n1aavqzh.js:8989-9816 facade-exports
/**
 * describeIssuerEchoError：把 issuer 回显错误归类为 issuer_echo_denied/mismatch 等原因码。
 */
function classifySdkAuthFailure_2(msg, cause) {
  let n =
    cause instanceof Error
      ? `${msg}
${cause.message}`
      : msg;
  if (cause instanceof IssuerEchoCrossOriginError) return "issuer_echo_denied";
  if (cause instanceof IssuerMismatchError)
    return cause.kind === "metadata" ? "issuer_echo_mismatch" : "issuer_response_mismatch";
  if (cause instanceof RegistrationRejectedError) return "dcr_rejected";
  if (
    n.includes("dynamic client registration") ||
    (cause instanceof OAuthError_2 && cause.code === "invalid_client_metadata")
  )
    return "dcr_failed";
  if ((n.includes("trying to load") && n.includes("metadata")) || n.includes("Incompatible auth server"))
    return "discovery_failed";
  if (cause instanceof OAuthError_2) return "dcr_rejected";
  if (n.includes("Issuer mismatch in authorization server metadata")) return "issuer_echo_mismatch";
  if (n.includes("Issuer mismatch in authorization response")) return "issuer_response_mismatch";
  let r = getErrnoCode(cause) ?? getErrnoCode(cause instanceof Error ? cause.cause : undefined);
  if (r && UNREACHABLE_ERRNOS.has(r)) return "network_failed";
  return "sdk_auth_failed";
}
//@ chunk-n1aavqzh.js:9816-9825 layout
var MAX_METADATA_REDIRECTS_2 = 5;
//@ chunk-n1aavqzh.js:9825-9879 facade-exports
/**
 * 生成用于调试日志的授权 URL：origin+path 经 URL 脱敏（用户名/密码/查询值替换为 REDACTED）后，再拼上只保留参数名的查询摘要。（v2）
 */
function authorizationUrlForDebugLog_2(e) {
  return redactUrlSecrets(e.origin + e.pathname) + redactUrlSearchParams(e);
}
//@ chunk-n1aavqzh.js:9879-9961 layout = NONSTANDARD_INVALID_GRANT_ALIASES (1)
var NONSTANDARD_INVALID_GRANT_ALIASES_2 = new Set([
  "invalid_refresh_token",
  "expired_refresh_token",
  "token_expired",
]);
//@ chunk-n1aavqzh.js:9961-10425 facade-exports = normalizeOAuthErrorBody (1)
/**
 * normalizeOAuthErrorBody（v2 副本）：把非标准 OAuth 错误体（如 invalid_refresh_token 等别名）规范化为标准 invalid_grant，便于 SDK 正确处理刷新失败。
 */
async function normalizeOAuthErrorBody_2(response) {
  if (!response.ok) return response;
  let text = await response.text();
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return new Response(text, response);
  }
  if (OAuthTokensSchema_2.safeParse(parsed).success) return new Response(text, response);
  let result = OAuthErrorResponseSchema_2.safeParse(parsed);
  if (!result.success) return new Response(text, response);
  let normalized = NONSTANDARD_INVALID_GRANT_ALIASES_2.has(result.data.error)
    ? {
        error: "invalid_grant",
        error_description:
          result.data.error_description ?? `Server returned non-standard error code: ${result.data.error}`,
      }
    : result.data;
  return new Response(jsonStringify(normalized), {
    status: 400,
    statusText: "Bad Request",
    headers: response.headers,
  });
}
//@ chunk-n1aavqzh.js:10425-10585 facade-exports
/**
 * throwIfAborted：返回一个在信号已中止时抛出的检查函数（OAuth 请求用）。
 */
function createAuthFetch_2() {
  return async (url, init) => {
    try {
      return await createAuthFetch_4(url, init);
    } catch (error) {
      if (init?.signal?.aborted || !isRetryableAuthError(error)) throw error;
      await sleep(AUTH_RETRY_DELAY_MS, init?.signal ?? undefined);
      return await createAuthFetch_4(url, init);
    }
  };
}
//@ chunk-n1aavqzh.js:10585-11116 layout = createAuthFetch (1)
async function createAuthFetch_4(url, init) {
  let timeoutSignal = AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS);
  let isPost = init?.method?.toUpperCase() === "POST";
  let proxyFetchOptions = getProxyFetchOptions({
    url: String(url),
  });
  if (!init?.signal) {
    let response;
    try {
      response = await fetch(url, {
        ...init,
        ...proxyFetchOptions,
        signal: timeoutSignal,
      });
    } catch (error) {
      rethrowRedactedFetchError(error, url);
    }
    return isPost ? normalizeOAuthErrorBody_2(response) : response;
  }
  let controller = new AbortController();
  let abort = () => controller.abort();
  init.signal.addEventListener("abort", abort);
  timeoutSignal.addEventListener("abort", abort);
  let cleanup = () => {
    init.signal?.removeEventListener("abort", abort);
    timeoutSignal.removeEventListener("abort", abort);
  };
  if (init.signal.aborted) controller.abort();
  try {
    let response = await fetch(url, {
      ...init,
      ...proxyFetchOptions,
      signal: controller.signal,
    });
    cleanup();
    return isPost ? normalizeOAuthErrorBody_2(response) : response;
  } catch (error) {
    cleanup();
    rethrowRedactedFetchError(error, url);
  }
}
//@ chunk-n1aavqzh.js:11116-12321 layout
/**
 * fetchAuthServerMetadata：授权服务器元数据发现：配置的 authServerMetadataUrl（必须 https）直接用，否则按资源元数据/RFC 8414/OIDC 路径探测，支持限次重定向。
 */
async function fetchAuthServerMetadata(serverName, serverUrl, options) {
  let { configuredMetadataUrl, fetchFn, resourceMetadataUrl, serverConfigForAnalytics } = options ?? {};
  let A = fetchFn ?? createAuthFetch_2();
  if (configuredMetadataUrl) {
    if (!configuredMetadataUrl.startsWith("https://"))
      throw Error(
        `authServerMetadataUrl must use https:// (got: ${redactUrlSecrets(configuredMetadataUrl)})`,
      );
    let y = await A(configuredMetadataUrl, {
      headers: {
        Accept: "application/json",
      },
    });
    if (y.ok) {
      let w;
      try {
        w = await y.json();
      } catch {
        throw Error(
          `Configured auth server metadata at ${redactUrlSecrets(configuredMetadataUrl)} is not valid JSON`,
        );
      }
      return OAuthMetadataSchema_2.parse(w);
    }
    throw Error(
      `HTTP ${y.status} fetching configured auth server metadata from ${redactUrlSecrets(configuredMetadataUrl)}`,
    );
  }
  try {
    let { authorizationServerUrl, authorizationServerMetadata } = await discoverOAuthServerInfo_2(serverUrl, {
      fetchFn: A,
      ...(resourceMetadataUrl && {
        resourceMetadataUrl,
      }),
      skipIssuerMetadataValidation: true,
    });
    if (authorizationServerMetadata) {
      evaluateIssuerEchoPolicy({
        serverName,
        site: "rfc9728_chain",
        expectedIssuer: authorizationServerUrl,
        receivedIssuer: authorizationServerMetadata.issuer,
        serverConfig: serverConfigForAnalytics,
      });
      return authorizationServerMetadata;
    }
  } catch (error) {
    if (error instanceof IssuerEchoCrossOriginError) throw error;
    logMCPDebug(
      serverName,
      `RFC 9728 discovery failed, falling back: ${describeSdkFetchError(error, serverUrl)}`,
    );
  }
  let url = new URL(serverUrl);
  if (url.pathname === "/") return;
  try {
    let authorizationServerMetadata = await discoverAuthorizationServerMetadata_2(url, {
      fetchFn: A,
      skipIssuerValidation: true,
    });
    if (authorizationServerMetadata)
      evaluateIssuerEchoPolicy({
        serverName,
        site: "legacy_path_fallback",
        expectedIssuer: url.href,
        receivedIssuer: authorizationServerMetadata.issuer,
        serverConfig: serverConfigForAnalytics,
      });
    return authorizationServerMetadata;
  } catch (error) {
    if (error instanceof IssuerEchoCrossOriginError) throw error;
    logMCPDebug(
      serverName,
      `Path-aware auth server discovery failed: ${describeSdkFetchError(error, serverUrl)}`,
    );
    return;
  }
}
//@ chunk-n1aavqzh.js:12321-12621 facade-exports
/**
 * IssuerEchoCrossOriginError：issuer 回显跨源不一致错误。
 */
class IssuerEchoCrossOriginError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  expected;
  received;
  constructor(expectedIssuer, receivedIssuer) {
    super(
      `Issuer echo cross-origin mismatch (RFC 8414 \xA73.3): expected ${jsonStringify(expectedIssuer)}, received ${jsonStringify(receivedIssuer)}`,
      "issuer echo cross-origin mismatch (RFC 8414 \xA73.3)",
      "issuer_echo_denied",
    );
    this.expected = expectedIssuer;
    this.received = receivedIssuer;
    this.name = "IssuerEchoCrossOriginError";
  }
}
//@ chunk-n1aavqzh.js:12621-12704 layout
function isIssuerStrictEchoEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_issuer_strict_echo", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-n1aavqzh.js:12704-12770 layout
function stripTrailingSlash(expectedIssuer, receivedIssuer) {
  return (
    receivedIssuer === expectedIssuer ||
    (expectedIssuer.endsWith("/") && receivedIssuer === expectedIssuer.slice(0, -1))
  );
}
//@ chunk-n1aavqzh.js:12770-12897 layout
function getHttpOrigin(e) {
  try {
    let t = new URL(e);
    if ((t.protocol === "https:" || t.protocol === "http:") && t.origin !== "null") return t;
  } catch {}
  return;
}
//@ chunk-n1aavqzh.js:12897-13139 layout
function compareIssuerOrigin(expectedIssuer, receivedIssuer) {
  let httpOrigin = getHttpOrigin(expectedIssuer);
  let httpOrigin_2 = getHttpOrigin(receivedIssuer);
  if (!httpOrigin || !httpOrigin_2) return "unparseable";
  if (
    httpOrigin.username !== "" ||
    httpOrigin.password !== "" ||
    httpOrigin_2.username !== "" ||
    httpOrigin_2.password !== "" ||
    httpOrigin_2.search !== "" ||
    httpOrigin_2.hash !== ""
  )
    return "cross_origin";
  return httpOrigin.origin === httpOrigin_2.origin ? "same_origin" : "cross_origin";
}
//@ chunk-n1aavqzh.js:13139-13568 layout
function diffUrlComponents(expectedIssuer, receivedIssuer) {
  let httpOrigin = getHttpOrigin(expectedIssuer);
  let httpOrigin_2 = getHttpOrigin(receivedIssuer);
  if (!httpOrigin || !httpOrigin_2) return [];
  let s = [];
  if (httpOrigin.protocol !== httpOrigin_2.protocol) s.push("scheme");
  if (httpOrigin.username !== httpOrigin_2.username || httpOrigin.password !== httpOrigin_2.password)
    s.push("userinfo");
  if (httpOrigin.hostname !== httpOrigin_2.hostname) s.push("host");
  if (httpOrigin.port !== httpOrigin_2.port) s.push("port");
  if (httpOrigin.pathname !== httpOrigin_2.pathname) s.push("path");
  if (httpOrigin.search !== httpOrigin_2.search) s.push("query");
  if (httpOrigin.hash !== httpOrigin_2.hash) s.push("fragment");
  if (s.length === 0) s.push("normalization_only");
  return s;
}
//@ chunk-n1aavqzh.js:13568-14262 facade-exports
/**
 * checkIssuerEcho：校验授权响应回显的 issuer（RFC 9207）与预期一致，enforce 模式拒绝跨源不一致，observe 模式只记录。
 */
function evaluateIssuerEchoPolicy({ serverName, site, expectedIssuer, receivedIssuer, serverConfig }) {
  if (expectedIssuer === undefined) return;
  if (receivedIssuer !== undefined && stripTrailingSlash(expectedIssuer, receivedIssuer)) return;
  let S = receivedIssuer === undefined ? "unparseable" : compareIssuerOrigin(expectedIssuer, receivedIssuer);
  let h = isIssuerStrictEchoEnabled() ? "enforce" : "observe";
  let A = h === "enforce" && S !== "same_origin";
  try {
    let l =
      receivedIssuer === undefined ? ["issuer_missing"] : diffUrlComponents(expectedIssuer, receivedIssuer);
    let y = serverConfig ? loggingSafeOrigin(serverConfig) : undefined;
    let w = serverConfig
      ? mcpNameForAnalytics_GATE_EVALUATED(
          serverName,
          isMcpServerLoggableInAnalytics(serverName, serverConfig),
        )
      : undefined;
    logEvent("tengu_mcp_oauth_issuer_echo_mismatch", {
      site: fromEnum(site),
      mode: fromEnum(h),
      originRelation: fromEnum(S),
      outcome: A ? lit("denied") : lit("proceeded"),
      ...(l.length > 0 && {
        mismatchFacets: fromEnumArr(l),
      }),
      expectedIssuerHash: shortHash(expectedIssuer),
      ...(receivedIssuer !== undefined && {
        receivedIssuerHash: shortHash(receivedIssuer),
      }),
      ...(y && {
        mcpServerBaseUrl: y,
      }),
      ...(w && {
        mcpServerName: w,
      }),
    });
  } catch (error) {
    try {
      logMCPDebug(serverName, `issuer-echo telemetry failed: ${errorMessage(error)}`);
    } catch {}
  }
  if (A) throw new IssuerEchoCrossOriginError(expectedIssuer, receivedIssuer);
}
//@ chunk-n1aavqzh.js:14262-14470 facade-exports
/**
 * McpClientRegistrationDeferredError：需要认证但客户端注册推迟到用户认证时。
 */
class McpClientRegistrationDeferredError_2 extends UnauthorizedError_2 {
  serverName;
  constructor(serverName) {
    super("Authentication required; client registration is deferred until the user authenticates");
    this.serverName = serverName;
    this.name = "McpClientRegistrationDeferredError";
  }
}
//@ chunk-n1aavqzh.js:14470-14588 facade-exports = AuthenticationCancelledError (1)
/**
 * 用户取消 MCP OAuth 授权时抛出的错误类（消息 `Authentication was cancelled`），调用方据此区分"取消"与"失败"。（v2）
 */
class AuthenticationCancelledError_2 extends Error {
  constructor() {
    super("Authentication was cancelled");
    this.name = "AuthenticationCancelledError";
  }
}
//@ chunk-n1aavqzh.js:14588-14677 layout
function getUrlOriginNoPort(redirectUri) {
  try {
    let t = new URL(redirectUri);
    return `${t.protocol}//${t.hostname}`;
  } catch {
    return redirectUri;
  }
}
//@ chunk-n1aavqzh.js:14677-14758 layout
function isLoopbackOrigin(e) {
  let urlOriginNoPort = getUrlOriginNoPort(e);
  return urlOriginNoPort === "http://127.0.0.1" || urlOriginNoPort === "http://localhost";
}
//@ chunk-n1aavqzh.js:14758-14955 layout
function getRegisteredLoopbackPort_2(e) {
  if (!e?.clientId || !e.redirectUri || !isLoopbackOrigin(e.redirectUri)) return;
  let t = Number(new URL(e.redirectUri).port);
  return t && e.redirectUri.replace("//127.0.0.1:", "//localhost:") === buildRedirectUri(t) ? t : undefined;
}
//@ chunk-n1aavqzh.js:14955-15013 layout
function getClientMetadataDocumentUrl_2() {
  return env.MCP_OAUTH_CLIENT_METADATA_URL || MCP_CLIENT_METADATA_URL;
}
//@ chunk-n1aavqzh.js:15013-15108 layout
function isLoopbackCallbackUri_2(redirectUri) {
  if (!isLoopbackOrigin(redirectUri)) return false;
  try {
    return new URL(redirectUri).pathname === "/callback";
  } catch {
    return false;
  }
}
//@ chunk-n1aavqzh.js:15108-15162 layout
function isClientMetadataDocumentId_2(clientId) {
  return (
    clientId !== undefined &&
    (clientId === MCP_CLIENT_METADATA_URL || clientId === getClientMetadataDocumentUrl_2())
  );
}
//@ chunk-n1aavqzh.js:15162-15221 facade-exports
/**
 * 按服务器键取出进程级状态里登记的 OAuth 回调提交器（用于把粘贴的回调 URL 交给正在等待的授权流程）。（v2）
 */
function getOAuthCallbackSubmitter_2(e) {
  return getCliOwnedState().oauthCallbackSubmitters.get(e);
}
//@ chunk-n1aavqzh.js:15221-15337 facade-exports
/**
 * 登记某服务器正在进行的 OAuth 授权 Promise，结束后（无论成败）若仍是同一个则从 activeOAuthFlows 移除，用于并发去重。（v2）
 */
function setActiveOAuthPromise_2(e, t) {
  let activeOAuthFlows = getCliOwnedState().activeOAuthFlows;
  activeOAuthFlows.set(e, t);
  t.finally(() => {
    if (activeOAuthFlows.get(e) === t) activeOAuthFlows.delete(e);
  }).catch(() => {});
}
//@ chunk-n1aavqzh.js:15337-15389 facade-exports
/**
 * 取出某服务器正在进行的 OAuth 授权 Promise（没有则 undefined），让并发的授权请求复用同一流程。（v2）
 */
function getActiveOAuthPromise_2(e) {
  return getCliOwnedState().activeOAuthFlows.get(e);
}
//@ chunk-n1aavqzh.js:15389-15769 facade-exports
/**
 * clearTokenlessStub：删除既无令牌也无发现状态的占位凭证条目。
 */
async function clearMcpOAuthStubIfTokenless_2(e, t) {
  let serverKey = getServerKey(e, t);
  let r = (await getSecureStorage().readAsync())?.mcpOAuth?.[serverKey];
  if (!r || r.accessToken || r.refreshToken || xaaPinnedServer(r.discoveryState)) return;
  try {
    await getSecureStorage().mutate((s) => {
      let S = s.mcpOAuth?.[serverKey];
      if (!S || S.accessToken || S.refreshToken || xaaPinnedServer(S.discoveryState)) return s;
      let h = {
        ...s.mcpOAuth,
      };
      delete h[serverKey];
      return {
        ...s,
        mcpOAuth: h,
      };
    });
  } catch (error) {
    logMCPDebug(e, `clear tokenless stub failed: ${errorMessage(error)}`);
  }
}
//@ chunk-n1aavqzh.js:15769-16823 layout = revokeToken (0.967)
async function revokeToken_2({
  serverName,
  endpoint,
  token,
  tokenTypeHint,
  clientId,
  clientSecret,
  accessToken,
  authMethod = "client_secret_basic",
  configuredHeaders,
}) {
  let params = new URLSearchParams();
  params.set("token", token);
  params.set("token_type_hint", tokenTypeHint);
  let headers = {
    ...configuredHeaders,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  let R =
    Object.keys(configuredHeaders).length > 0
      ? {
          beforeRedirect: sameOriginRedirectGuard(endpoint),
        }
      : {};
  if (clientId && clientSecret) {
    if (authMethod === "client_secret_post") {
      params.set("client_id", clientId);
      params.set("client_secret", clientSecret);
    } else {
      let basic = Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString(
        "base64",
      );
      headers.Authorization = `Basic ${basic}`;
      getPresentedCredentialLog().record(basic);
    }
  } else if (clientId) params.set("client_id", clientId);
  else logMCPDebug(serverName, `No client_id available for ${tokenTypeHint} revocation - server may reject`);
  try {
    await axios_default.post(endpoint, params, {
      headers,
      ...R,
    });
    logMCPDebug(serverName, `Successfully revoked ${tokenTypeHint}`);
  } catch (error) {
    if (axios_default.isAxiosError(error) && error.response?.status === 401 && accessToken) {
      logMCPDebug(serverName, `Got 401, retrying ${tokenTypeHint} revocation with Bearer auth`);
      params.delete("client_id");
      params.delete("client_secret");
      await axios_default.post(endpoint, params, {
        headers: {
          ...headers,
          Authorization: `Bearer ${accessToken}`,
        },
        ...R,
      });
      logMCPDebug(serverName, `Successfully revoked ${tokenTypeHint} with Bearer auth`);
    } else throw error;
  }
}
//@ chunk-n1aavqzh.js:16823-17121 facade-exports
/**
 * readStoredServerCredentials：读取服务器的令牌/客户端信息。
 */
async function snapshotServerTokens_2(e, t) {
  let r = (await getSecureStorage().readAsync())?.mcpOAuth?.[getServerKey(e, t)];
  if (!r?.accessToken && !r?.refreshToken) return;
  return {
    accessToken: r.accessToken || undefined,
    refreshToken: r.refreshToken,
    clientId: r.clientId,
    clientSecret: r.clientSecret,
    ...(r.discoveryState && {
      discoveryState: authDiscoveryState(r.discoveryState),
    }),
  };
}
//@ chunk-n1aavqzh.js:17121-18760 layout = revokeServerTokens (0.772)
async function revokeServerTokens_4(serverName, serverConfig, tokenData) {
  let storage = getPresentedCredentialLog();
  storage.record(tokenData.accessToken);
  storage.record(tokenData.refreshToken);
  storage.record(tokenData.clientSecret);
  let s;
  try {
    let asUrl = tokenData.discoveryState?.authorizationServerUrl ?? serverConfig.url;
    let metadata = await fetchAuthServerMetadata(serverName, asUrl, {
      configuredMetadataUrl: xaaPinnedServer(tokenData.discoveryState)
        ? undefined
        : serverConfig.oauth?.authServerMetadataUrl,
      fetchFn: wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch_2()),
      serverConfigForAnalytics: serverConfig,
    });
    if (!metadata) {
      logMCPDebug(serverName, "No OAuth metadata found");
      s = "no_metadata";
    } else {
      let revocationEndpoint = "revocation_endpoint" in metadata ? metadata.revocation_endpoint : null;
      if (!revocationEndpoint) {
        logMCPDebug(serverName, "Server does not support token revocation");
        s = "no_revocation_endpoint";
      } else {
        let revocationEndpointStr = String(revocationEndpoint);
        let configuredHeaders = await dynamicHeadersForRequest(
          serverName,
          serverConfig,
          revocationEndpointStr,
        );
        let authMethods =
          ("revocation_endpoint_auth_methods_supported" in metadata
            ? metadata.revocation_endpoint_auth_methods_supported
            : undefined) ??
          ("token_endpoint_auth_methods_supported" in metadata
            ? metadata.token_endpoint_auth_methods_supported
            : undefined);
        let authMethod =
          authMethods &&
          !authMethods.includes("client_secret_basic") &&
          authMethods.includes("client_secret_post")
            ? "client_secret_post"
            : "client_secret_basic";
        logMCPDebug(
          serverName,
          `Revoking tokens via ${redactUrlSecrets(revocationEndpointStr)} (${authMethod})`,
        );
        if (tokenData.refreshToken)
          try {
            await revokeToken_2({
              serverName,
              endpoint: revocationEndpointStr,
              token: tokenData.refreshToken,
              tokenTypeHint: "refresh_token",
              clientId: tokenData.clientId,
              clientSecret: tokenData.clientSecret,
              accessToken: tokenData.accessToken,
              authMethod,
              configuredHeaders,
            });
          } catch (error) {
            logMCPDebug(serverName, `Failed to revoke refresh token: ${errorMessage(error)}`);
            s = "server_revoke_failed";
          }
        if (tokenData.accessToken)
          try {
            await revokeToken_2({
              serverName,
              endpoint: revocationEndpointStr,
              token: tokenData.accessToken,
              tokenTypeHint: "access_token",
              clientId: tokenData.clientId,
              clientSecret: tokenData.clientSecret,
              accessToken: tokenData.accessToken,
              authMethod,
              configuredHeaders,
            });
          } catch (error) {
            logMCPDebug(serverName, `Failed to revoke access token: ${errorMessage(error)}`);
            s = "server_revoke_failed";
          }
      }
    }
  } catch (error) {
    logMCPDebug(serverName, `Failed to revoke tokens: ${errorMessage(error)}`);
    s = error instanceof IssuerEchoCrossOriginError ? "issuer_echo_denied" : "server_revoke_failed";
  }
  return s;
}
//@ chunk-n1aavqzh.js:18760-19280 facade-exports
/**
 * revokeReplacedTokens：令牌被替换后撤销旧令牌。
 */
async function revokeReplacedServerTokens_2(serverName, serverConfig, n) {
  let r;
  try {
    let s = (await getSecureStorage().readAsync())?.mcpOAuth?.[getServerKey(serverName, serverConfig)];
    let tokenData = {
      ...n,
      accessToken: n.accessToken && n.accessToken !== s?.accessToken ? n.accessToken : undefined,
      refreshToken: n.refreshToken && n.refreshToken !== s?.refreshToken ? n.refreshToken : undefined,
    };
    if (!tokenData.accessToken && !tokenData.refreshToken) {
      logMCPDebug(serverName, "No replaced tokens to revoke");
      logFeatureOk("mcp_oauth_revoke");
      return;
    }
    r = await revokeServerTokens_4(serverName, serverConfig, tokenData);
  } catch (error) {
    logMCPDebug(serverName, `Failed to revoke replaced tokens: ${errorMessage(error)}`);
    r = "server_revoke_failed";
  }
  if (r) logFeatureSad("mcp_oauth_revoke", r);
  else logFeatureOk("mcp_oauth_revoke");
}
//@ chunk-n1aavqzh.js:19280-21238 facade-exports
/**
 * clearServerTokens：撤销并清除服务器令牌（可保留 step-up 状态），凭证存储不可读时放弃。
 */
async function revokeServerTokens_2(serverName, serverConfig, { preserveStepUpState: n = false } = {}) {
  let secureStorage = getSecureStorage();
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (secureStorageForMcp === READ_FAILED) {
    logMCPDebug(serverName, "Could not read the credential store to clear tokens");
    logFeatureBad("mcp_oauth_revoke", "local_read_failed");
    return {
      cleared: false,
      reason: "credential_store_failed",
    };
  }
  let serverKey = getServerKey(serverName, serverConfig);
  let h = secureStorageForMcp?.mcpOAuth?.[serverKey];
  let A;
  if (h?.accessToken || h?.refreshToken)
    A = await revokeServerTokens_4(serverName, serverConfig, {
      accessToken: h.accessToken || undefined,
      refreshToken: h.refreshToken,
      clientId: h.clientId,
      clientSecret: h.clientSecret,
      ...(h.discoveryState && {
        discoveryState: authDiscoveryState(h.discoveryState),
      }),
    });
  else logMCPDebug(serverName, "No tokens to revoke");
  let l = false;
  try {
    if (n && h && (h.stepUpScope || h.discoveryState || h.clientId)) {
      let y = await secureStorage.mutate((w) => {
        let R = w.mcpOAuth?.[serverKey];
        if (R?.accessToken !== h.accessToken || R?.clientId !== h.clientId) return w;
        return {
          ...w,
          mcpOAuth: {
            ...w.mcpOAuth,
            [serverKey]: {
              serverName,
              serverUrl: serverConfig.url,
              accessToken: "",
              refreshToken: undefined,
              expiresAt: undefined,
              ...(h.clientId && {
                clientId: h.clientId,
                ...(h.redirectUri && {
                  redirectUri: h.redirectUri,
                }),
                ...(h.clientSecret !== undefined && {
                  clientSecret: h.clientSecret,
                }),
              }),
              ...(h.stepUpScope && {
                stepUpScope: h.stepUpScope,
              }),
              ...(h.discoveryState && {
                discoveryState: {
                  ...authDiscoveryState(h.discoveryState),
                  resourceMetadataUrl: h.discoveryState.resourceMetadataUrl,
                  tokenlessRejectedAt: h.discoveryState.tokenlessRejectedAt,
                },
              }),
            },
          },
        };
      });
      l = y.success;
      logMCPDebug(
        serverName,
        y.success
          ? "Preserved step-up auth state across revocation"
          : `clear local tokens failed: ${y.warning ?? "storage write failed"}`,
      );
    } else if (n) l = (await clearServerTokensFromLocalStorage_2(serverName, serverConfig)).success;
    else {
      let y = await confirmCredentialRemoval(
        secureStorage,
        (w) => {
          if (!w.mcpOAuth?.[serverKey]) return w;
          let { [serverKey]: R, ...T } = w.mcpOAuth;
          return {
            ...w,
            mcpOAuth: T,
          };
        },
        (w) => w.mcpOAuth?.[serverKey] !== undefined,
      );
      if (!y.confirmed && y.reason === "keychain_unreadable") {
        logMCPDebug(serverName, "Could not read the keychain to clear tokens");
        logFeatureBad("mcp_oauth_revoke", "keychain_unreadable");
        return {
          cleared: false,
          reason: "keychain_unreadable",
        };
      }
      l = y.confirmed;
    }
  } catch (error) {
    logMCPDebug(serverName, `clear local tokens failed: ${errorMessage(error)}`);
  }
  if (!l) A ??= "local_clear_failed";
  clearDiscoveryPathMemo(serverName);
  if (A) logFeatureSad("mcp_oauth_revoke", A);
  else logFeatureOk("mcp_oauth_revoke");
  return l
    ? {
        cleared: true,
      }
    : {
        cleared: false,
        reason: "credential_store_failed",
      };
}
//@ chunk-n1aavqzh.js:21238-21871 facade-exports
/**
 * clearServerTokensFromLocalStorage：只清本地存储里的令牌，可保留客户端注册。
 */
async function clearServerTokensFromLocalStorage_2(serverName, serverConfig, n) {
  let serverKey = getServerKey(serverName, serverConfig);
  let s;
  let S = await getSecureStorage().mutate((h) => {
    let A = h.mcpOAuth?.[serverKey];
    if (!A) return h;
    let l = {
      ...h.mcpOAuth,
    };
    if (A.clientId && n?.preserveClientRegistration?.(A)) {
      if (!A.accessToken && !A.refreshToken) return h;
      l[serverKey] = {
        ...A,
        accessToken: "",
        refreshToken: undefined,
        expiresAt: 0,
        scope: undefined,
      };
      s = "tokens";
    } else if (n?.keepXaaPin && xaaPinnedServer(A.discoveryState)) {
      l[serverKey] = {
        serverName: A.serverName,
        serverUrl: A.serverUrl,
        accessToken: "",
        expiresAt: 0,
        discoveryState: A.discoveryState,
      };
      s = "all";
    } else {
      delete l[serverKey];
      s = "all";
    }
    return {
      ...h,
      mcpOAuth: l,
    };
  });
  if (s)
    logMCPDebug(
      serverName,
      s === "tokens" ? "Cleared stored tokens (preserved client registration)" : "Cleared stored tokens",
    );
  return S;
}
//@ chunk-n1aavqzh.js:21871-22160 layout
function logStorageWriteFailure_2(serverName, serverConfig, n, r) {
  if (n?.success) return;
  let s = r ? "mutate_rejected" : "storage_write_failed";
  let S = r ? errorMessage(r) : (n?.warning ?? "storage write failed");
  logMCPDebug(serverName, `Token persist failed: ${S}`);
  let h = loggingSafeOrigin(serverConfig);
  logEvent("tengu_mcp_oauth_token_persist_failed", {
    transportType: fromEnum(serverConfig.type),
    ...(h && {
      mcpServerBaseUrl: h,
    }),
    reason: fromEnum(s),
  });
}
//@ chunk-n1aavqzh.js:22160-22319 layout
async function hasStoredOAuthState_2(serverName, serverConfig) {
  let serverKey = getServerKey(serverName, serverConfig);
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (
    secureStorageForMcp === READ_FAILED ||
    (serverConfig.oauth?.xaa && !secureStorageForMcp?.mcpOAuthClientConfig?.[serverKey])
  )
    return READ_FAILED;
  return xaaPinnedServer(secureStorageForMcp?.mcpOAuth?.[serverKey]?.discoveryState);
}
//@ chunk-n1aavqzh.js:22319-24942 layout = performMCPXaaAuth (0.9)
/**
 * performMCPXaaAuth（v2）：XAA 认证：取 IdP 设置与 client secret，acquireIdpIdToken 后 performCrossAppAccess，令牌写入存储并固定授权服务器。
 */
async function performMCPXaaAuth_2(
  serverName,
  serverConfig,
  onAuthorizationUrl,
  abortSignal,
  skipBrowserOpen,
) {
  if (!serverConfig.oauth?.xaa) throw Error("XAA: oauth.xaa must be set");
  let idp = getXaaIdpSettings();
  if (!idp)
    throw Error(
      "XAA: no IdP connection configured. Run 'claude mcp xaa setup --issuer <url> --client-id <id> --client-secret' to configure.",
    );
  let clientId = serverConfig.oauth?.clientId;
  if (!clientId) throw Error(`XAA: server '${serverName}' needs an AS client_id. Re-add with --client-id.`);
  let clientSecret = (await getMcpClientConfig_2(serverName, serverConfig))?.clientSecret;
  if (!clientSecret) {
    let wantedKey = getServerKey(serverName, serverConfig);
    let haveKeys = Object.keys((await getSecureStorage().readAsync())?.mcpOAuthClientConfig ?? {});
    let headersForLogging = redactHeaders(serverConfig.headers ?? {});
    logMCPDebug(
      serverName,
      `XAA: secret lookup miss. wanted=${wantedKey} have=[${haveKeys.join(", ")}] configHeaders=${jsonStringify(headersForLogging)}`,
    );
    throw Error(`XAA: AS client secret not found for '${serverName}'. Re-add with --client-secret.`);
  }
  if ((await hasStoredOAuthState_2(serverName, serverConfig)) === READ_FAILED)
    throw new McpCredentialStoreUnavailableError(serverName);
  logMCPDebug(serverName, "XAA: starting cross-app access flow");
  let idpClientSecret = await getIdpClientSecret_2(idp.issuer);
  let idTokenCacheHit = (await getCachedIdpIdToken_2(idp.issuer)) !== undefined;
  let failureStage = "idp_login";
  try {
    let idToken;
    try {
      idToken = await acquireIdpIdToken_2({
        idpIssuer: idp.issuer,
        idpClientId: idp.clientId,
        idpClientSecret,
        callbackPort: idp.callbackPort,
        onAuthorizationUrl,
        skipBrowserOpen,
        abortSignal,
      });
    } catch (e) {
      if (abortSignal?.aborted) throw new AuthenticationCancelledError_2();
      throw e;
    }
    failureStage = "discovery";
    let oidc = await discoverOidc_2(idp.issuer);
    failureStage = "token_exchange";
    getPresentedCredentialLog().record(clientSecret);
    let F = await hasStoredOAuthState_2(serverName, serverConfig);
    if (F === READ_FAILED) throw new McpCredentialStoreUnavailableError(serverName);
    let tokens;
    try {
      tokens = await performCrossAppAccess(
        serverConfig.url,
        {
          clientId,
          clientSecret,
          idpClientId: idp.clientId,
          idpClientSecret,
          idpIdToken: idToken,
          idpTokenEndpoint: oidc.token_endpoint,
          pinnedAuthorizationServer: F,
        },
        serverName,
        abortSignal,
      );
    } catch (e) {
      if (abortSignal?.aborted) throw new AuthenticationCancelledError_2();
      let msg = errorMessage(e);
      if (e instanceof XaaTokenExchangeError_2) {
        if (e.shouldClearIdToken) {
          await clearIdpIdToken_2(idp.issuer);
          logMCPDebug(serverName, "XAA: cleared cached id_token after token-exchange failure");
        }
      } else if (
        msg.includes("PRM discovery failed") ||
        msg.includes("AS metadata discovery failed") ||
        msg.includes("no authorization server supports jwt-bearer") ||
        msg.includes("authorization server changed")
      )
        failureStage = "discovery";
      else if (msg.includes("jwt-bearer")) failureStage = "jwt_bearer";
      throw e;
    }
    let serverKey = getServerKey(serverName, serverConfig);
    let storage = getPresentedCredentialLog();
    storage.record(tokens.access_token);
    storage.record(tokens.refresh_token);
    let D;
    let W;
    try {
      D = await getSecureStorage().mutate((existingData) => {
        let prev = existingData.mcpOAuth?.[serverKey];
        return {
          ...existingData,
          mcpOAuth: {
            ...existingData.mcpOAuth,
            [serverKey]: {
              ...prev,
              serverName,
              serverUrl: serverConfig.url,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token ?? prev?.refreshToken,
              expiresAt: tokens.expires_in != null ? Date.now() + tokens.expires_in * 1000 : undefined,
              scope: tokens.scope,
              clientId,
              clientSecret,
              discoveryState: pinXaaAuth({
                previous: prev?.discoveryState,
                issuedBy: tokens.authorizationServerUrl,
                interactiveSignIn: true,
              }),
            },
          },
        };
      });
    } catch (error) {
      W = error;
    }
    if (D?.success) logMCPDebug(serverName, "XAA: tokens saved");
    else logStorageWriteFailure_2(serverName, serverConfig, D, W);
    logEvent("tengu_mcp_oauth_flow_success", {
      authMethod: lit("xaa"),
      idTokenCacheHit,
    });
    logFeatureOk("mcp_oauth_flow");
  } catch (e) {
    if (e instanceof AuthenticationCancelledError_2) throw e;
    logFeatureBad("mcp_oauth_flow", "mcp_oauth_xaa_failed");
    logEvent("tengu_mcp_oauth_flow_failure", {
      authMethod: lit("xaa"),
      xaaFailureStage: fromEnum(failureStage),
      idTokenCacheHit,
    });
    throw e;
  }
}
//@ chunk-n1aavqzh.js:24942-33269 facade-exports = performMCPOAuthFlow (0.765)
/**
 * performMCPOAuthFlow（v2）：MCP OAuth 主流程：XAA 分支；否则选回调端口（配置 callbackPort/重用已注册端口/findAvailablePort）、清旧令牌、起 127.0.0.1 回调服务器、ClaudeAuthProvider 发起授权（CIMD 或 DCR、PKCE）、浏览器打开、等待回调换令牌，记录 tengu_mcp_oauth_flow_* 遥测。
 */
async function performMCPOAuthFlow_2(serverName, serverConfig, onAuthorizationUrl, abortSignal, options) {
  if (!URL.canParse(serverConfig.url)) {
    logFeatureBad("mcp_oauth_flow", "mcp_oauth_no_valid_url");
    let configError =
      "configError" in serverConfig && typeof serverConfig.configError === "string"
        ? serverConfig.configError
        : undefined;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      configError ||
        "This server's URL is missing or not a valid URL, so sign-in can't start. Fix the URL in its MCP config (or set the environment variable it uses) and try again.",
      "MCP OAuth refused: no valid server URL",
    );
  }
  if (serverConfig.oauth?.xaa) {
    if (!isXaaEnabled())
      throw Error(
        `XAA is not enabled (set CLAUDE_CODE_ENABLE_XAA=1). Remove 'oauth.xaa' from server '${serverName}' to use the standard consent flow.`,
      );
    logEvent("tengu_mcp_oauth_flow_start", {
      isOAuthFlow: true,
      authMethod: lit("xaa"),
      transportType: fromEnum(serverConfig.type),
      ...(loggingSafeOrigin(serverConfig) && {
        mcpServerBaseUrl: loggingSafeOrigin(serverConfig),
      }),
    });
    await performMCPXaaAuth_2(
      serverName,
      serverConfig,
      onAuthorizationUrl,
      abortSignal,
      options?.skipBrowserOpen,
    );
    return;
  }
  let storage = getSecureStorage();
  let serverKey = getServerKey(serverName, serverConfig);
  let cachedEntry = (await storage.readAsync())?.mcpOAuth?.[serverKey];
  let cachedStepUpScope = cachedEntry?.stepUpScope;
  let cachedResourceMetadataUrl = cachedEntry?.discoveryState?.resourceMetadataUrl;
  let registeredLoopbackPort = getRegisteredLoopbackPort_2(cachedEntry);
  let resourceMetadataUrl;
  if (cachedResourceMetadataUrl)
    try {
      resourceMetadataUrl = new URL(cachedResourceMetadataUrl);
    } catch {
      logMCPDebug(
        serverName,
        `Invalid cached resourceMetadataUrl: ${redactUrlSecrets(cachedResourceMetadataUrl)}`,
      );
    }
  let wwwAuthParams = {
    scope: cachedStepUpScope,
    resourceMetadataUrl,
  };
  let flowAttemptId = randomUUID();
  let F = mcpServerTelemetry(serverConfig, options?.redirectUri);
  logEvent("tengu_mcp_oauth_flow_start", {
    flowAttemptId: sanitizeMarkName(flowAttemptId),
    isOAuthFlow: true,
    transportType: fromEnum(serverConfig.type),
    ...F,
    ...(loggingSafeOrigin(serverConfig) && {
      mcpServerBaseUrl: loggingSafeOrigin(serverConfig),
    }),
  });
  let x = false;
  try {
    let configuredCallbackPort = serverConfig.oauth?.callbackPort;
    let P = !!options?.redirectUri;
    let D = P ? 0 : (configuredCallbackPort ?? (await findAvailablePort(registeredLoopbackPort)));
    let redirectUri = options?.redirectUri ?? buildRedirectUri(D);
    logMCPDebug(
      serverName,
      P
        ? `Using custom redirectUri: ${redactUrlSecrets(redirectUri)} (no localhost listener)`
        : `Using redirect port: ${D}${configuredCallbackPort ? " (from config)" : registeredLoopbackPort && D === registeredLoopbackPort ? " (reusing registered port)" : ""}`,
    );
    try {
      await clearServerTokensFromLocalStorage_2(serverName, serverConfig, {
        preserveClientRegistration: (j) =>
          D === getRegisteredLoopbackPort_2(j) || j.redirectUri === redirectUri,
        keepXaaPin: true,
      });
    } catch (error) {
      logMCPDebug(serverName, `clear stored credentials failed: ${errorMessage(error)}`);
    }
    let cliOwnedState = getCliOwnedState();
    let abortController = new AbortController();
    if (!P) {
      cliOwnedState.oauthCallbackListeners.get(D)?.abort();
      cliOwnedState.oauthCallbackListeners.set(D, abortController);
    }
    let G = new ClaudeAuthProvider_2(
      serverName,
      serverConfig,
      redirectUri,
      true,
      onAuthorizationUrl,
      options?.skipBrowserOpen,
    );
    let redirectUri_2 = Boolean(serverConfig.oauth?.scopes || serverConfig.oauth?.authServerMetadataUrl);
    if (wwwAuthParams.scope && !redirectUri_2) G.markStepUpPending(wwwAuthParams.scope);
    let fetchFn = wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch_2());
    try {
      let metadata = await fetchAuthServerMetadata(serverName, serverConfig.url, {
        configuredMetadataUrl: serverConfig.oauth?.authServerMetadataUrl,
        fetchFn,
        resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
        serverConfigForAnalytics: serverConfig,
      });
      if (metadata) {
        G.setMetadata(metadata);
        logMCPDebug(
          serverName,
          `Fetched OAuth metadata with scope: ${redactSensitiveUrlParams("scope", getScopeFromMetadata_2(metadata) ?? "") || "NONE"}`,
        );
      }
    } catch (error) {
      if (error instanceof IssuerEchoCrossOriginError) throw error;
      logMCPDebug(
        serverName,
        `Failed to fetch OAuth metadata: ${describeSdkFetchError(error, serverConfig.url)}`,
      );
    }
    let oauthState = await G.state();
    let server = null;
    let timeoutId = null;
    let abortHandler = null;
    let Ce = null;
    let cleanup = () => {
      if (server) {
        server.removeAllListeners();
        server.on("error", () => {});
        server.close();
        server = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (abortHandler) {
        abortSignal?.removeEventListener("abort", abortHandler);
        abortController.signal.removeEventListener("abort", abortHandler);
        abortHandler = null;
      }
      if (cliOwnedState.oauthCallbackListeners.get(D) === abortController)
        cliOwnedState.oauthCallbackListeners.delete(D);
      if (cliOwnedState.oauthCallbackSubmitters.get(serverName) === Ce)
        cliOwnedState.oauthCallbackSubmitters.delete(serverName);
      logMCPDebug(serverName, "MCP OAuth server cleaned up");
    };
    let { code, iss } = await new Promise((resolve, reject) => {
      let resolved = false;
      let resolveOnce = (resolve_2, reject) => {
        if (resolved) return;
        resolved = true;
        resolve({
          code: resolve_2,
          iss: reject,
        });
      };
      let rejectOnce = (error) => {
        if (resolved) return;
        resolved = true;
        reject(error);
      };
      abortHandler = () => {
        cleanup();
        rejectOnce(new AuthenticationCancelledError_2());
      };
      if (abortSignal?.aborted || abortController.signal.aborted) {
        abortHandler();
        return;
      }
      abortSignal?.addEventListener("abort", abortHandler);
      abortController.signal.addEventListener("abort", abortHandler);
      {
        let rejectOnce_2 = (callbackUrl) => {
          try {
            let parsed = new URL(callbackUrl);
            let code = parsed.searchParams.get("code");
            let state = parsed.searchParams.get("state");
            let error = parsed.searchParams.get("error");
            let reject = firstOf(parsed.searchParams.get("iss"));
            if (!code && !error) return false;
            if (state !== oauthState) {
              logMCPDebug(serverName, "Ignoring manual callback URL whose state belongs to a different flow");
              return false;
            }
            if (error) {
              let errorDescription = parsed.searchParams.get("error_description") || "";
              cleanup();
              rejectOnce(Error(`OAuth error: ${error} - ${errorDescription}`));
              return true;
            }
            if (!code) return false;
            logMCPDebug(serverName, "Received auth code via manual callback URL");
            cleanup();
            resolveOnce(code, reject);
            return true;
          } catch {
            return false;
          }
        };
        Ce = rejectOnce_2;
        cliOwnedState.oauthCallbackSubmitters.set(serverName, rejectOnce_2);
        options?.onWaitingForCallback?.(rejectOnce_2, D, oauthState);
      }
      let Oe = async () => {
        try {
          logMCPDebug(serverName, "Starting SDK auth");
          logMCPDebug(serverName, `Server URL: ${redactUrlSecrets(serverConfig.url)}`);
          let result = await auth_2(G, {
            serverUrl: serverConfig.url,
            scope: wwwAuthParams.scope,
            resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
            fetchFn,
            skipIssuerMetadataValidation: true,
          });
          logMCPDebug(serverName, `Initial auth result: ${result}`);
          if (result !== "REDIRECT")
            logMCPDebug(serverName, `Unexpected auth result, expected REDIRECT: ${result}`);
        } catch (error) {
          logMCPDebug(serverName, `SDK auth error: ${describeSdkFetchError(error, serverConfig.url)}`);
          cleanup();
          rejectOnce(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `SDK auth failed: ${describeSdkFetchError(error, serverConfig.url)}`,
                "SDK auth failed",
              ),
              {
                cause: error,
              },
            ),
          );
        }
      };
      if (P) Oe();
      else {
        server = createServer((req, res) => {
          let parsedUrl = parse(req.url || "", true);
          if (parsedUrl.pathname === "/callback") {
            let code = parsedUrl.query.code;
            let state = parsedUrl.query.state;
            let error = parsedUrl.query.error;
            let errorDescription = parsedUrl.query.error_description;
            let errorUri = parsedUrl.query.error_uri;
            let sanitizedError = firstOf(parsedUrl.query.iss);
            if (state !== oauthState) {
              res.writeHead(400, {
                "Content-Type": "text/html",
              });
              res.end(
                callbackPageBody({
                  ok: false,
                  heading: "Authentication failed",
                  message: "Invalid state parameter. Close this tab and try again from Claude Code.",
                }),
              );
              return;
            }
            if (error) {
              res.writeHead(200, {
                "Content-Type": "text/html",
              });
              res.end(
                callbackPageBody({
                  ok: false,
                  heading: "Authentication failed",
                  message: "Close this tab and try again from Claude Code.",
                  detail: `${String(error)}: ${errorDescription ?? ""}`,
                }),
              );
              cleanup();
              let errorMessage = `OAuth error: ${error}`;
              if (errorDescription) errorMessage += ` - ${errorDescription}`;
              if (errorUri) errorMessage += ` (See: ${errorUri})`;
              rejectOnce(Error(errorMessage));
              return;
            }
            if (code) {
              res.writeHead(200, {
                "Content-Type": "text/html",
              });
              res.end(
                callbackPageBody({
                  ok: true,
                  heading: "Authentication successful",
                  message: "You can close this tab and return to Claude Code.",
                }),
              );
              cleanup();
              resolveOnce(code, sanitizedError);
            }
          } else {
            res.writeHead(404, {
              "Content-Type": "text/html",
            });
            res.end(
              callbackPageBody({
                ok: false,
                heading: "Not found",
                message: `This is the Claude Code MCP OAuth callback listener. It only handles /callback. If your OAuth provider redirected here, the registered redirect_uri must be ${redactUrlSecrets(redirectUri)}.`,
              }),
            );
          }
        });
        server.on("error", (err) => {
          cleanup();
          if (err.code === "EADDRINUSE") {
            let findCmd =
              getPlatform() === "windows" ? `netstat -ano | findstr :${D}` : `lsof -ti:${D} -sTCP:LISTEN`;
            rejectOnce(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `OAuth callback port ${D} is already in use \u2014 another process may be holding it. ` +
                  `Run \`${findCmd}\` to find it.`,
                "OAuth callback port already in use",
              ),
            );
          } else
            rejectOnce(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `OAuth callback server failed: ${err.message}`,
                "OAuth callback server failed",
              ),
            );
        });
        server.listen(D, "127.0.0.1", () => void Oe());
        server.unref();
      }
      timeoutId = setTimeout(
        (cleanup, rejectOnce) => {
          cleanup();
          rejectOnce(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "Authentication timeout",
              "Authentication timeout",
            ),
          );
        },
        300000,
        cleanup,
        rejectOnce,
      );
      timeoutId.unref();
    });
    x = true;
    logMCPDebug(serverName, "Completing auth flow with authorization code");
    getPresentedCredentialLog().record(code);
    let result = await auth_2(G, {
      serverUrl: serverConfig.url,
      authorizationCode: code,
      iss,
      resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
      fetchFn: wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch_2()),
      skipIssuerMetadataValidation: true,
    });
    logMCPDebug(serverName, `Auth result: ${result}`);
    if (result === "AUTHORIZED") {
      let savedTokens = await G.tokens().catch(() => {
        return;
      });
      logMCPDebug(serverName, `Tokens after auth: ${savedTokens ? "Present" : "Missing"}`);
      if (savedTokens) logMCPDebug(serverName, `Token expires_in: ${savedTokens.expires_in}`);
      logEvent("tengu_mcp_oauth_flow_success", {
        flowAttemptId: sanitizeMarkName(flowAttemptId),
        transportType: fromEnum(serverConfig.type),
        ...F,
        ...(loggingSafeOrigin(serverConfig) && {
          mcpServerBaseUrl: loggingSafeOrigin(serverConfig),
        }),
      });
      logFeatureOk("mcp_oauth_flow");
    } else
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Unexpected auth result: " + result,
        "Unexpected auth result",
      );
  } catch (error) {
    logMCPDebug(
      serverName,
      `Error during auth completion: ${describeSdkFetchError(error, serverConfig.url)}`,
    );
    let reason = "unknown";
    let D;
    let W;
    let msg = errorMessage(error);
    let cause = error instanceof Error ? error.cause : undefined;
    if (error instanceof AuthenticationCancelledError_2) reason = "cancelled";
    else if (error instanceof IssuerEchoCrossOriginError || cause instanceof IssuerEchoCrossOriginError)
      reason = "issuer_echo_denied";
    else if (error instanceof IssuerMismatchError || cause instanceof IssuerMismatchError)
      reason =
        [error, cause].find((z) => z instanceof IssuerMismatchError)?.kind === "metadata"
          ? "issuer_echo_mismatch"
          : "issuer_response_mismatch";
    else if (/AADSTS\d/.test(msg)) reason = "entra_specific";
    else if (/redirect[_ ]uri/i.test(msg)) reason = "redirect_uri_mismatch";
    else if (x && (isZodError_2(error) || isZodError_2(cause))) reason = "token_response_schema_rejected";
    else if (x) reason = "token_exchange_failed";
    else if (msg.includes("Authentication timeout")) reason = "timeout";
    else if (msg.includes("OAuth error:")) reason = "provider_denied";
    else if (
      msg.includes("already in use") ||
      msg.includes("EADDRINUSE") ||
      msg.includes("callback server failed") ||
      msg.includes("No available port")
    )
      reason = "port_unavailable";
    else if (msg.includes("SDK auth failed")) reason = classifySdkAuthFailure_2(msg, cause);
    let found = [cause, error].find((L) => L instanceof RegistrationRejectedError);
    let match = (cause instanceof Error ? cause : error instanceof Error ? error : null)?.message.match(
      /^HTTP (\d{3})\b/,
    );
    if (found) W = found.status;
    else if (match) W = Number(match[1]);
    if (cause instanceof OAuthError_2) D = cause.code;
    if (error instanceof OAuthError_2) {
      D = error.code;
      if (error.code === "invalid_client" || error.code === "unauthorized_client") {
        let serverKey = getServerKey(serverName, serverConfig);
        try {
          await getSecureStorage().mutate((z) => {
            let H = z.mcpOAuth?.[serverKey];
            if (!H) return z;
            return {
              ...z,
              mcpOAuth: {
                ...z.mcpOAuth,
                [serverKey]: {
                  ...H,
                  clientId: undefined,
                  clientSecret: undefined,
                },
              },
            };
          });
        } catch (error) {
          logMCPDebug(serverName, `clear clientId failed: ${errorMessage(error)}`);
        }
      }
    }
    if (
      !/^OAuth error: access_denied(?: |$)/.test(msg) &&
      (reason === "timeout" || msg.includes("OAuth error:"))
    ) {
      let serverKey = getServerKey(serverName, serverConfig);
      await getSecureStorage()
        .mutate((z) => {
          let H = z.mcpOAuth?.[serverKey];
          if (!H?.clientId || H.accessToken || H.refreshToken || H.clientId !== cachedEntry?.clientId)
            return z;
          return {
            ...z,
            mcpOAuth: {
              ...z.mcpOAuth,
              [serverKey]: {
                ...H,
                clientId: undefined,
                clientSecret: undefined,
              },
            },
          };
        })
        .catch((error) => logMCPDebug(serverName, `drop clientId failed: ${errorMessage(error)}`));
    }
    if (reason !== "cancelled") logFeatureBad("mcp_oauth_flow", "mcp_oauth_flow_failed");
    logEvent("tengu_mcp_oauth_flow_error", {
      flowAttemptId: sanitizeMarkName(flowAttemptId),
      reason: fromEnum(reason),
      error_code: D === undefined ? undefined : sanitizeOAuthErrorCodeForAnalytics_2(D),
      http_status: fromNumberOpt(W),
      transportType: fromEnum(serverConfig.type),
      ...F,
      ...(loggingSafeOrigin(serverConfig) && {
        mcpServerBaseUrl: loggingSafeOrigin(serverConfig),
      }),
    });
    let serverKey = describeSdkFetchError(error, serverConfig.url);
    throw serverKey === errorMessage(error)
      ? error
      : Error(serverKey, {
          cause: error,
        });
  }
}
//@ chunk-n1aavqzh.js:33269-33798 facade-exports
/**
 * wrapFetchWithAuthChallengeDetection：记录 401/403 认证挑战与 insufficient_scope（step-up）信息到 provider。
 */
function wrapFetchWithStepUpDetection_2(fetchFn, authProvider) {
  return async (n, r) => {
    let s = await fetchFn(n, r);
    if (s.status === 401 || s.status === 403) authProvider.sawAuthChallenge = true;
    authProvider.noteServerAnswer(
      n,
      s.status === 401 ||
        (s.status === 403 && extractWWWAuthenticateParams_2(s).error === "insufficient_scope"),
    );
    if (s.status === 401 || s.status === 403)
      authProvider.noteAuthRejection(n, s.status, new Headers(r?.headers).get("authorization"));
    if (!new Headers(r?.headers).has("authorization")) return s;
    if (s.status === 403) {
      let { error, scope } = extractWWWAuthenticateParams_2(s);
      if (error === "insufficient_scope" && scope) authProvider.markStepUpPending(scope);
    } else if (s.status === 401) authProvider.clearStepUpPending();
    return s;
  };
}
//@ chunk-n1aavqzh.js:33798-62345 facade-exports
/**
 * ClaudeAuthProvider（v2）：OAuthClientProvider 实现：客户端元数据（CIMD URL 或 DCR）、令牌读写（安全存储 mcpOAuth[serverKey]）、XAA 静默刷新、刷新令牌并发协调、step-up scope、发现状态缓存、重定向到授权页。
 */
class ClaudeAuthProvider_2 {
  serverName;
  serverConfig;
  redirectUri;
  handleRedirection;
  _codeVerifier;
  _flowDiscoveryState;
  _flowDiscoveryStateAt = 0;
  _flowDiscoveryStateFromConfiguredUrl = false;
  _metadataEchoMode;
  _authorizationUrl;
  _state;
  _scopes;
  _metadata;
  _refreshInProgress;
  _pendingStepUpScope;
  _servedOverrideAuthorizationServerUrl;
  _servedOverrideDocuments = new WeakMap();
  _discoveredAuthorizationServer;
  _lastServedClientId;
  _lastServedAccessToken;
  _lastServedRefreshToken;
  _lastAuthRejection;
  _presented;
  onAuthorizationUrlCallback;
  skipBrowserOpen;
  constructor(
    serverName,
    serverConfig,
    redirectUri = buildRedirectUri(),
    handleRedirection = false,
    onAuthorizationUrl,
    skipBrowserOpen,
  ) {
    this.serverName = serverName;
    this.serverConfig = serverConfig;
    this.redirectUri = redirectUri;
    this.handleRedirection = handleRedirection;
    this.onAuthorizationUrlCallback = onAuthorizationUrl;
    this.skipBrowserOpen = skipBrowserOpen ?? false;
    this._presented = getPresentedCredentialLog();
  }
  get redirectUrl() {
    return this.redirectUri;
  }
  get authorizationUrl() {
    return this._authorizationUrl;
  }
  get clientMetadata() {
    let metadata = {
      client_name: `Claude Code (${this.serverName})`,
      redirect_uris: [this.redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
    let metadataScope = this.getCuratedMetadataScope();
    if (metadataScope) {
      metadata.scope = metadataScope;
      logMCPDebug(
        this.serverName,
        `Using scope from metadata: ${redactSensitiveUrlParams("scope", metadata.scope)}`,
      );
    }
    return metadata;
  }
  get clientMetadataUrl() {
    if (!isLoopbackCallbackUri_2(this.redirectUri)) {
      logMCPDebug(
        this.serverName,
        `redirectUri ${redactUrlSecrets(this.redirectUri)} is not the document's loopback /callback: withholding CIMD client_id \u2014 registering via DCR`,
      );
      return;
    }
    let override = getClientMetadataDocumentUrl_2();
    if (override !== MCP_CLIENT_METADATA_URL)
      logMCPDebug(this.serverName, `Using CIMD URL from env: ${override}`);
    return override;
  }
  setMetadata(metadata) {
    this._metadata = metadata;
    this._metadataEchoMode = isIssuerStrictEchoEnabled() ? "enforce" : "observe";
  }
  getCuratedMetadataScope() {
    let scopeFromMetadata = getScopeFromMetadata_2(this._metadata);
    if (scopeFromMetadata !== undefined) return scopeFromMetadata;
    if (this.serverConfig.oauth?.authServerMetadataUrl && Array.isArray(this._metadata?.scopes_supported))
      return this._metadata.scopes_supported.join(" ");
    return;
  }
  markStepUpPending(scope) {
    this._pendingStepUpScope = scope;
    logMCPDebug(this.serverName, `Marked step-up pending: ${redactSensitiveUrlParams("scope", scope)}`);
  }
  get pendingStepUpScope() {
    return this._pendingStepUpScope;
  }
  get lastAuthRejection() {
    return this._lastAuthRejection;
  }
  noteAuthRejection(e, status, n) {
    let url = this.serverConfig.url;
    if (String(e) === (URL.canParse(url) ? new URL(url).href : url))
      this._lastAuthRejection = {
        status,
        accessToken: n?.startsWith("Bearer ") ? n.slice(7) : undefined,
      };
  }
  clearStepUpPending() {
    this._pendingStepUpScope = undefined;
  }
  clearStepUpPendingOnCredentialGone() {
    if (!this.handleRedirection) this.clearStepUpPending();
  }
  sawAuthChallenge = false;
  authChallengeOpen = false;
  noteServerAnswer(e, authChallengeOpen) {
    let url = this.serverConfig.url;
    if (String(e) === (URL.canParse(url) ? new URL(url).href : url))
      this.authChallengeOpen = authChallengeOpen;
  }
  registrationOfferedByDiscovery = false;
  async readCredentialStore() {
    let secureStorageForMcp = await readSecureStorageForMcp(
      this.handleRedirection
        ? undefined
        : {
            serverName: this.serverName,
            serverConfig: this.serverConfig,
            challenged: this.authChallengeOpen,
          },
    );
    if (secureStorageForMcp === READ_FAILED) {
      logMCPDebug(
        this.serverName,
        "Credential store could not be read (the login keychain may be locked); not reporting credentials as absent",
      );
      throw new McpCredentialStoreUnavailableError(this.serverName);
    }
    return secureStorageForMcp;
  }
  async state() {
    if (!this._state) {
      this._state = randomBytes(32).toString("base64url");
      logMCPDebug(this.serverName, "Generated new OAuth state");
    }
    return this._state;
  }
  async clientInformation() {
    let clientInformation = await this.resolveClientInformation();
    this._presented.record(clientInformation?.client_secret);
    this._presented.record(basicAuthValue(clientInformation?.client_id, clientInformation?.client_secret));
    return clientInformation;
  }
  async resolveClientInformation() {
    let credentialStore = await this.readCredentialStore();
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let clientSecret = credentialStore?.mcpOAuthClientConfig?.[serverKey]?.clientSecret;
    let clientId = this.serverConfig.oauth?.clientId;
    let s = credentialStore?.mcpOAuth?.[serverKey];
    let S =
      this.handleRedirection &&
      isClientMetadataDocumentId_2(s?.clientId) &&
      !isLoopbackCallbackUri_2(this.redirectUri);
    if (S) {
      logMCPDebug(
        this.serverName,
        `Stored client_id is the CIMD document URL (loopback /callback only); current redirectUri is ${redactUrlSecrets(this.redirectUri)} \u2014 ${clientId ? "serving the configured client" : "registering via DCR"} instead`,
      );
      if (clientId)
        await this.patchStoredClientEntry(
          serverKey,
          {
            clientId,
            clientSecret: undefined,
            redirectUri: this.redirectUri,
          },
          "stale CIMD client_id repair",
        );
    }
    if (s?.clientId && !S) {
      let redirectUri = s.redirectUri;
      if (
        this.handleRedirection &&
        (redirectUri
          ? getUrlOriginNoPort(redirectUri) !== getUrlOriginNoPort(this.redirectUri)
          : !this.redirectUri.startsWith("http://localhost"))
      ) {
        let A = redirectUri ? redactUrlSecrets(redirectUri) : "localhost";
        if (!clientId) {
          logMCPDebug(
            this.serverName,
            `Cached client_id was registered for ${A}; current redirectUri is ${redactUrlSecrets(this.redirectUri)} \u2014 forcing re-DCR`,
          );
          return;
        }
        if (s.clientId !== clientId) {
          logMCPDebug(
            this.serverName,
            `Stored client_id is stale and its redirectUri ${A} predates ${redactUrlSecrets(this.redirectUri)} \u2014 serving the configured client (no registration to redo)`,
          );
          await this.patchStoredClientEntry(
            serverKey,
            {
              clientId,
              clientSecret: undefined,
              redirectUri: this.redirectUri,
            },
            "stale client_id repair",
          );
          this._lastServedClientId = clientId;
          return {
            client_id: clientId,
            issuer: s.issuer,
            client_secret: clientSecret,
          };
        }
        logMCPDebug(
          this.serverName,
          `Stored redirectUri ${A} predates ${redactUrlSecrets(this.redirectUri)}, but the client_id is the configured one \u2014 serving it (no registration to redo)`,
        );
        await this.patchStoredClientEntry(
          serverKey,
          {
            redirectUri: this.redirectUri,
          },
          "stored redirectUri convergence",
        );
      }
      logMCPDebug(this.serverName, "Found client info");
      this._lastServedClientId = s.clientId;
      return {
        client_id: s.clientId,
        issuer: s.issuer,
        client_secret: s.clientSecret ?? (s.clientId === clientId ? clientSecret : undefined),
      };
    }
    if (clientId) {
      logMCPDebug(this.serverName, "Using pre-configured client ID");
      this._lastServedClientId = clientId;
      return {
        client_id: clientId,
        client_secret: clientSecret,
      };
    }
    if (
      !this.handleRedirection &&
      this.registrationOfferedByDiscovery &&
      !s?.accessToken &&
      !s?.refreshToken
    ) {
      logMCPDebug(
        this.serverName,
        "No client info found; deferring client registration to authentication time",
      );
      throw new McpClientRegistrationDeferredError_2(this.serverName);
    }
    logMCPDebug(this.serverName, "No client info found");
    return;
  }
  async patchStoredClientEntry(e, t, n) {
    try {
      if (
        !(
          await getSecureStorage().mutate((s) => {
            let S = s.mcpOAuth?.[e];
            if (!S) return s;
            return {
              ...s,
              mcpOAuth: {
                ...s.mcpOAuth,
                [e]: {
                  ...S,
                  ...t,
                },
              },
            };
          })
        )?.success
      )
        logMCPDebug(this.serverName, `${n} resolved unsuccessful`);
    } catch (error) {
      logMCPDebug(this.serverName, `${n} failed: ${errorMessage(error)}`);
    }
  }
  async saveClientInformation(e) {
    this._presented.record(e.client_secret);
    this._presented.record(basicAuthValue(e.client_id, e.client_secret));
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    try {
      if (
        (
          await getSecureStorage().mutate((r) => ({
            ...r,
            mcpOAuth: {
              ...r.mcpOAuth,
              [serverKey]: {
                ...r.mcpOAuth?.[serverKey],
                serverName: this.serverName,
                serverUrl: this.serverConfig.url,
                clientId: e.client_id,
                clientSecret:
                  e.issuer !== undefined &&
                  e.client_id === r.mcpOAuth?.[serverKey]?.clientId &&
                  r.mcpOAuth?.[serverKey]?.clientSecret === undefined &&
                  e.client_id === this.serverConfig.oauth?.clientId
                    ? undefined
                    : e.client_secret,
                issuer: e.issuer ?? r.mcpOAuth?.[serverKey]?.issuer,
                redirectUri:
                  !this.handleRedirection && e.client_id === r.mcpOAuth?.[serverKey]?.clientId
                    ? r.mcpOAuth?.[serverKey]?.redirectUri
                    : this.redirectUri,
                accessToken: r.mcpOAuth?.[serverKey]?.accessToken || "",
                expiresAt: r.mcpOAuth?.[serverKey]?.expiresAt,
              },
            },
          }))
        )?.success
      )
        this._lastServedClientId = e.client_id;
      else logMCPDebug(this.serverName, "saveClientInformation persist resolved unsuccessful");
    } catch (error) {
      logMCPDebug(this.serverName, `saveClientInformation persist failed: ${errorMessage(error)}`);
    }
  }
  async tokens() {
    let credentialStore = await this.readCredentialStore();
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let tokenData = credentialStore?.mcpOAuth?.[serverKey];
    if (
      isXaaEnabled() &&
      this.serverConfig.oauth?.xaa &&
      !tokenData?.refreshToken &&
      (!tokenData?.accessToken ||
        (tokenData.expiresAt != null && (tokenData.expiresAt - Date.now()) / 1000 <= 300))
    ) {
      if (!this._refreshInProgress) {
        logMCPDebug(
          this.serverName,
          tokenData
            ? "XAA: access_token expiring, attempting silent exchange"
            : "XAA: no access_token yet, attempting silent exchange",
        );
        this._refreshInProgress = this.xaaRefresh().finally(() => {
          this._refreshInProgress = undefined;
        });
      }
      try {
        let _refreshInProgress = await this._refreshInProgress;
        if (_refreshInProgress) {
          this._lastServedAccessToken = _refreshInProgress.access_token;
          this._presented.record(_refreshInProgress.access_token);
          this._presented.record(_refreshInProgress.refresh_token);
          this._lastServedRefreshToken = _refreshInProgress.refresh_token ?? this._lastServedRefreshToken;
          return {
            ..._refreshInProgress,
            issuer: tokenData?.issuer,
          };
        }
      } catch (e) {
        logMCPDebug(this.serverName, `XAA silent exchange failed: ${errorMessage(e)}`);
      }
    }
    if (!tokenData) {
      logMCPDebug(this.serverName, "No token data found");
      this.clearStepUpPendingOnCredentialGone();
      return;
    }
    if (!tokenData.accessToken) {
      logMCPDebug(this.serverName, "No access token in storage");
      this.clearStepUpPendingOnCredentialGone();
      return;
    }
    if (isTokenRejected(serverKey, tokenData.accessToken)) {
      logMCPDebug(
        this.serverName,
        "Not sending the stored access token, because the server rejected it earlier in this session",
      );
      return;
    }
    this._lastServedAccessToken = tokenData.accessToken;
    this._presented.record(tokenData.accessToken);
    this._presented.record(tokenData.refreshToken);
    this._lastServedRefreshToken = tokenData.refreshToken;
    let expiresIn = tokenData.expiresAt != null ? (tokenData.expiresAt - Date.now()) / 1000 : undefined;
    let _pendingStepUpScope = this._pendingStepUpScope;
    let needsStepUp = _pendingStepUpScope !== undefined;
    if (needsStepUp)
      logMCPDebug(
        this.serverName,
        `Step-up pending (${redactSensitiveUrlParams("scope", _pendingStepUpScope)}), omitting refresh_token`,
      );
    if (expiresIn != null && expiresIn <= 0 && !tokenData.refreshToken) {
      logMCPDebug(this.serverName, "Token expired without refresh token");
      this.clearStepUpPendingOnCredentialGone();
      return;
    }
    if (expiresIn != null && expiresIn <= 300 && tokenData.refreshToken && !needsStepUp) {
      if (!this._refreshInProgress) {
        logMCPDebug(
          this.serverName,
          `Token expires in ${Math.floor(expiresIn)}s, attempting proactive refresh`,
        );
        this._refreshInProgress = this.refreshAuthorization(tokenData.refreshToken).finally(() => {
          this._refreshInProgress = undefined;
        });
      } else logMCPDebug(this.serverName, "Token refresh already in progress, reusing existing promise");
      try {
        let _refreshInProgress = await this._refreshInProgress;
        if (_refreshInProgress) {
          logMCPDebug(this.serverName, "Token refreshed successfully");
          this._lastServedAccessToken = _refreshInProgress.access_token;
          this._presented.record(_refreshInProgress.access_token);
          this._presented.record(_refreshInProgress.refresh_token);
          this._lastServedRefreshToken = _refreshInProgress.refresh_token ?? this._lastServedRefreshToken;
          return {
            ..._refreshInProgress,
            issuer: tokenData?.issuer,
          };
        }
        logMCPDebug(this.serverName, "Token refresh failed, returning current tokens");
      } catch (error) {
        logMCPDebug(
          this.serverName,
          `Token refresh error: ${describeSdkFetchError(error, this.serverConfig.url)}`,
        );
      }
    }
    let tokens = {
      access_token: tokenData.accessToken,
      refresh_token: needsStepUp ? undefined : tokenData.refreshToken,
      expires_in: expiresIn,
      scope: tokenData.scope,
      token_type: "Bearer",
      issuer: tokenData.issuer,
    };
    logMCPDebug(this.serverName, "Returning tokens");
    logMCPDebug(this.serverName, `Has refresh token: ${!!tokens.refresh_token}`);
    logMCPDebug(
      this.serverName,
      expiresIn != null ? `Expires in: ${Math.floor(expiresIn)}s` : "No expiration specified",
    );
    return tokens;
  }
  async saveTokens(e) {
    this._presented.record(e.access_token);
    this._presented.record(e.refresh_token);
    let t = e.access_token !== this._lastServedAccessToken;
    let _flowDiscoveryStateAt = this._flowDiscoveryStateAt;
    if (t && this.handleRedirection) this._pendingStepUpScope = undefined;
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    logMCPDebug(this.serverName, "Saving tokens");
    logMCPDebug(this.serverName, `Token expires in: ${e.expires_in}`);
    logMCPDebug(this.serverName, `Has refresh token: ${!!e.refresh_token}`);
    let signIn =
      this._servedOverrideAuthorizationServerUrl === undefined
        ? this._discoveredAuthorizationServer
        : {
            authorizationServerUrl: this._servedOverrideAuthorizationServerUrl,
            oauthMetadataFound: true,
          };
    let servedMetadataUrl =
      this.servedMetadataUrl() ?? this._discoveredAuthorizationServer?.servedMetadataUrl;
    let h;
    let A;
    try {
      h = await getSecureStorage().mutate((l) => ({
        ...l,
        mcpOAuth: {
          ...l.mcpOAuth,
          [serverKey]: {
            ...l.mcpOAuth?.[serverKey],
            serverName: this.serverName,
            serverUrl: this.serverConfig.url,
            accessToken: e.access_token,
            refreshToken: e.refresh_token ?? l.mcpOAuth?.[serverKey]?.refreshToken,
            expiresAt: e.expires_in != null ? Date.now() + e.expires_in * 1000 : undefined,
            scope: e.scope,
            issuer: e.issuer ?? l.mcpOAuth?.[serverKey]?.issuer,
            discoveryState: withoutTokenlessRejection(
              mergeSignInAuth({
                previous: l.mcpOAuth?.[serverKey]?.discoveryState,
                signIn,
                servedMetadataUrl,
                interactiveSignIn: this.handleRedirection,
              }),
            ),
          },
        },
      }));
    } catch (error) {
      A = error;
    }
    if (h?.success) {
      this._lastServedAccessToken = e.access_token;
      this._lastServedRefreshToken = e.refresh_token ?? this._lastServedRefreshToken;
      recordSavedAccessToken(serverKey, e.access_token);
    }
    this.logTokenPersistFailed(h, A);
    if (t && this._flowDiscoveryStateAt === _flowDiscoveryStateAt) {
      this._flowDiscoveryState = undefined;
      this._flowDiscoveryStateAt = 0;
    }
  }
  logTokenPersistFailed(e, t) {
    logStorageWriteFailure_2(this.serverName, this.serverConfig, e, t);
  }
  async xaaRefresh() {
    let idp = getXaaIdpSettings();
    if (!idp) return;
    let idToken = await getCachedIdpIdToken_2(idp.issuer);
    if (!idToken) {
      logMCPDebug(this.serverName, "XAA: id_token not cached, needs interactive re-auth");
      return;
    }
    let clientId = this.serverConfig.oauth?.clientId;
    let clientConfig = await getMcpClientConfig_2(this.serverName, this.serverConfig);
    if (!clientId || !clientConfig?.clientSecret) {
      logMCPDebug(
        this.serverName,
        "XAA: missing clientId or clientSecret in config \u2014 skipping silent refresh",
      );
      return;
    }
    let s = await hasStoredOAuthState_2(this.serverName, this.serverConfig);
    if (s === READ_FAILED) {
      logMCPDebug(this.serverName, "XAA: stored credentials unreadable");
      return;
    }
    let S = s
      ? undefined
      : await getSecureStorage().readAsyncStrict?.(undefined, {
          inaccessibleAs: "failure",
        });
    if (S === READ_FAILED) {
      logMCPDebug(this.serverName, "XAA: no pin and the keychain is unreadable");
      return;
    }
    let pinnedAuthorizationServer =
      s ?? xaaPinnedServer(S?.mcpOAuth?.[getServerKey(this.serverName, this.serverConfig)]?.discoveryState);
    let idpClientSecret = await getIdpClientSecret_2(idp.issuer);
    let oidc;
    try {
      oidc = await discoverOidc_2(idp.issuer);
    } catch (e) {
      logMCPDebug(this.serverName, `XAA: OIDC discovery failed in silent refresh: ${errorMessage(e)}`);
      return;
    }
    this._presented.record(clientConfig.clientSecret);
    try {
      let tokens = await performCrossAppAccess(
        this.serverConfig.url,
        {
          clientId,
          clientSecret: clientConfig.clientSecret,
          idpClientId: idp.clientId,
          idpClientSecret,
          idpIdToken: idToken,
          idpTokenEndpoint: oidc.token_endpoint,
          pinnedAuthorizationServer,
        },
        this.serverName,
      );
      let serverKey = getServerKey(this.serverName, this.serverConfig);
      let R;
      let T;
      try {
        R = await getSecureStorage().mutate((existingData) => {
          let prev = existingData.mcpOAuth?.[serverKey];
          return {
            ...existingData,
            mcpOAuth: {
              ...existingData.mcpOAuth,
              [serverKey]: {
                ...prev,
                serverName: this.serverName,
                serverUrl: this.serverConfig.url,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? prev?.refreshToken,
                expiresAt: tokens.expires_in != null ? Date.now() + tokens.expires_in * 1000 : undefined,
                scope: tokens.scope,
                clientId,
                clientSecret: clientConfig.clientSecret,
                discoveryState: pinXaaAuth({
                  previous: prev?.discoveryState,
                  issuedBy: tokens.authorizationServerUrl,
                  interactiveSignIn: false,
                }),
              },
            },
          };
        });
      } catch (error) {
        T = error;
      }
      this.logTokenPersistFailed(R, T);
      return {
        access_token: tokens.access_token,
        token_type: "Bearer",
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        refresh_token: tokens.refresh_token,
      };
    } catch (e) {
      if (e instanceof XaaTokenExchangeError_2 && e.shouldClearIdToken) {
        await clearIdpIdToken_2(idp.issuer);
        logMCPDebug(this.serverName, "XAA: cleared id_token after exchange failure");
      }
      throw e;
    }
  }
  async redirectToAuthorization(e) {
    let t = this._pendingStepUpScope
      ? undefined
      : this.serverConfig.oauth?.scopes ||
        (this.serverConfig.oauth?.authServerMetadataUrl ? this.getCuratedMetadataScope() : undefined);
    let n = e.searchParams.get("scope");
    let r = t ?? n;
    if (r !== n)
      logMCPDebug(
        this.serverName,
        `Overrode authorization scope from ${n ? redactSensitiveUrlParams("scope", n) : "NONE"} to configured: ${r ? redactSensitiveUrlParams("scope", r) : "NONE"}`,
      );
    let s = r === null ? null : maybeAppendOfflineAccess_2(r, this._metadata);
    if (s !== null && s !== n) {
      e.searchParams.set("scope", s);
      if (s !== t) logMCPDebug(this.serverName, "Appended offline_access to authorization scope");
    }
    let S = isEntraLoginUrl_2(e);
    let all = e.searchParams.getAll("prompt");
    let A = S ? all.filter((E) => E !== "consent") : all;
    if (A.length !== all.length || A.length > 1) {
      e.searchParams.delete("prompt");
      if (A.length > 0) e.searchParams.set("prompt", A.includes("consent") ? "consent" : A.at(-1));
    }
    this._authorizationUrl = e.toString();
    let scopes = e.searchParams.get("scope");
    logMCPDebug(this.serverName, `Authorization URL: ${authorizationUrlForDebugLog_2(e)}`);
    logMCPDebug(
      this.serverName,
      `Scopes in URL: ${scopes ? redactSensitiveUrlParams("scope", scopes) : "NOT FOUND"}`,
    );
    if (scopes) {
      this._scopes = scopes;
      logMCPDebug(
        this.serverName,
        `Captured scopes from authorization URL: ${redactSensitiveUrlParams("scope", scopes)}`,
      );
    } else {
      let metadataScope = this.getCuratedMetadataScope();
      if (metadataScope) {
        this._scopes = metadataScope;
        logMCPDebug(
          this.serverName,
          `Using scopes from metadata: ${redactSensitiveUrlParams("scope", metadataScope)}`,
        );
      } else logMCPDebug(this.serverName, "No scopes available from URL or metadata");
    }
    if (this._scopes && !this.handleRedirection && this._pendingStepUpScope) {
      let serverKey = getServerKey(this.serverName, this.serverConfig);
      let _scopes = this._scopes;
      let x = false;
      try {
        await getSecureStorage().mutate((U) => {
          let P = U.mcpOAuth?.[serverKey];
          if (!P) return U;
          x = true;
          return {
            ...U,
            mcpOAuth: {
              ...U.mcpOAuth,
              [serverKey]: {
                ...P,
                stepUpScope: _scopes,
              },
            },
          };
        });
      } catch (error) {
        logMCPDebug(this.serverName, `step-up scope persist failed: ${errorMessage(error)}`);
      }
      if (x)
        logMCPDebug(
          this.serverName,
          `Persisted step-up scope: ${redactSensitiveUrlParams("scope", _scopes)}`,
        );
    }
    if (!this.handleRedirection) {
      logMCPDebug(this.serverName, "Redirection handling is disabled, skipping redirect");
      return;
    }
    let urlString = e.toString();
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://"))
      throw Error("Invalid authorization URL: must use http:// or https:// scheme");
    logMCPDebug(this.serverName, "Redirecting to authorization URL");
    let w = authorizationUrlForDebugLog_2(e);
    logMCPDebug(this.serverName, `Authorization URL: ${w}`);
    if (this.onAuthorizationUrlCallback) this.onAuthorizationUrlCallback(urlString);
    if (this.skipBrowserOpen) {
      logMCPDebug(this.serverName, `Skipping browser open (skipBrowserOpen=true). URL: ${w}`);
      return;
    }
    let R = isBrowserUnavailable();
    if (R) logMCPDebug(this.serverName, `Skipping browser open (headless environment). URL: ${w}`);
    else logMCPDebug(this.serverName, `Opening authorization URL: ${w}`);
    let T = R ? false : await openValidatedUrlSucceeded(urlString);
    logEvent("tengu_mcp_oauth_browser_open", {
      success: T,
      headless: R,
      platform: fromEnum(getPlatform()),
    });
    if (!R && !T) logMCPDebug(this.serverName, "Browser didn't open automatically. URL is shown in UI.");
  }
  async saveCodeVerifier(codeVerifier) {
    logMCPDebug(this.serverName, "Saving code verifier");
    this._codeVerifier = codeVerifier;
  }
  async codeVerifier() {
    if (!this._codeVerifier) {
      logMCPDebug(this.serverName, "No code verifier saved");
      throw Error("No code verifier saved");
    }
    logMCPDebug(this.serverName, "Returning code verifier");
    this._presented.record(this._codeVerifier);
    return this._codeVerifier;
  }
  async invalidateCredentials(e) {
    if (e === "verifier") {
      this._codeVerifier = undefined;
      logMCPDebug(this.serverName, "Invalidated credentials (scope: verifier)");
      return;
    }
    let t = e;
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let r = false;
    try {
      let _lastServedClientId = this._lastServedClientId;
      let _lastServedAccessToken = this._lastServedAccessToken;
      let _lastServedRefreshToken = this._lastServedRefreshToken;
      await getSecureStorage().mutate((A) => {
        let l = A.mcpOAuth?.[serverKey];
        if (!l) return A;
        let y = {
          ...A.mcpOAuth,
        };
        switch (t) {
          case "all": {
            let w =
              _lastServedAccessToken != null && !!l.accessToken && l.accessToken !== _lastServedAccessToken;
            let R = _lastServedClientId != null && l.clientId != null && l.clientId !== _lastServedClientId;
            if (w || R) {
              logMCPDebug(
                this.serverName,
                `invalidateCredentials('all') preserved: ${w ? "foreign token" : "concurrent re-registration"}`,
              );
              return A;
            }
            if (!l.clientId && !l.refreshToken && l.accessToken === "") return A;
            y[serverKey] = {
              serverName: l.serverName,
              serverUrl: l.serverUrl,
              accessToken: "",
              ...(l.discoveryState && {
                discoveryState: l.discoveryState,
              }),
              ...(l.stepUpScope && {
                stepUpScope: l.stepUpScope,
              }),
            };
            break;
          }
          case "client":
            y[serverKey] = {
              ...l,
              clientId: undefined,
              clientSecret: undefined,
            };
            break;
          case "tokens": {
            if (
              (_lastServedRefreshToken != null &&
                l.refreshToken &&
                l.refreshToken !== _lastServedRefreshToken) ||
              (_lastServedAccessToken != null && !!l.accessToken && l.accessToken !== _lastServedAccessToken)
            ) {
              logMCPDebug(this.serverName, "invalidateCredentials('tokens') preserved: concurrent rotation");
              return A;
            }
            y[serverKey] = {
              ...l,
              accessToken: "",
              refreshToken: undefined,
              expiresAt: 0,
            };
            break;
          }
          case "discovery": {
            if (!l.discoveryState?.authorizationServerMetadata) {
              logMCPDebug(
                this.serverName,
                "invalidateCredentials('discovery') preserved: concurrent URL-only re-save",
              );
              return A;
            }
            y[serverKey] = {
              ...l,
              discoveryState: authDiscoveryState(l.discoveryState),
            };
            break;
          }
        }
        r = true;
        return {
          ...A,
          mcpOAuth: y,
        };
      });
    } catch (error) {
      logMCPDebug(this.serverName, `invalidateCredentials persist failed: ${errorMessage(error)}`);
    }
    if (r) logMCPDebug(this.serverName, `Invalidated credentials (scope: ${e})`);
  }
  async saveDiscoveryState(e) {
    if (e.authorizationServerMetadata)
      evaluateIssuerEchoPolicy({
        serverName: this.serverName,
        site: "sdk_auth",
        expectedIssuer: e.authorizationServerUrl,
        receivedIssuer: e.authorizationServerMetadata.issuer,
        serverConfig: this.serverConfig,
      });
    if (this.serverConfig.oauth?.xaa) return;
    this._flowDiscoveryState = e;
    this._flowDiscoveryStateAt = Date.now();
    this._flowDiscoveryStateFromConfiguredUrl = false;
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    logMCPDebug(
      this.serverName,
      `Saving discovery state (authServer: ${redactUrlSecrets(e.authorizationServerUrl)})`,
    );
    let authorizationServerMetadata = e.authorizationServerMetadata;
    this.registrationOfferedByDiscovery =
      authorizationServerMetadata !== undefined &&
      (typeof authorizationServerMetadata.registration_endpoint === "string" ||
        (authorizationServerMetadata.client_id_metadata_document_supported === true &&
          this.clientMetadataUrl !== undefined));
    let r = {
      authorizationServerUrl: e.authorizationServerUrl,
      oauthMetadataFound: !!e.authorizationServerMetadata,
    };
    let servedMetadataUrl =
      (e.authorizationServerMetadata !== undefined
        ? this._servedOverrideDocuments.get(e.authorizationServerMetadata)
        : undefined) ?? this.servedMetadataUrl();
    this._discoveredAuthorizationServer = {
      ...r,
      servedMetadataUrl,
    };
    try {
      await getSecureStorage().mutate((S) => {
        let h = mergeDiscoveredAuth({
          previous: S.mcpOAuth?.[serverKey]?.discoveryState,
          discovered: r,
          servedMetadataUrl,
        });
        return {
          ...S,
          mcpOAuth: {
            ...S.mcpOAuth,
            [serverKey]: {
              ...S.mcpOAuth?.[serverKey],
              serverName: this.serverName,
              serverUrl: this.serverConfig.url,
              accessToken: S.mcpOAuth?.[serverKey]?.accessToken || "",
              expiresAt: S.mcpOAuth?.[serverKey]?.expiresAt,
              discoveryState: {
                ...h,
                resourceMetadataUrl: e.resourceMetadataUrl,
                tokenlessRejectedAt: tokenlessRejectedAt(serverKey, S.mcpOAuth?.[serverKey]),
                registrationNotOfferedAt:
                  authorizationServerMetadata === undefined
                    ? S.mcpOAuth?.[serverKey]?.discoveryState?.registrationNotOfferedAt
                    : typeof authorizationServerMetadata.registration_endpoint !== "string" &&
                        authorizationServerMetadata.client_id_metadata_document_supported !== true
                      ? Date.now()
                      : undefined,
              },
            },
          },
        };
      });
    } catch (error) {
      logMCPDebug(this.serverName, `saveDiscoveryState persist failed: ${errorMessage(error)}`);
    }
  }
  servePolicyCheckedDiscoveryState(e) {
    if (e?.authorizationServerMetadata && e.authorizationServerUrl)
      try {
        evaluateIssuerEchoPolicy({
          serverName: this.serverName,
          site: "persisted_state",
          expectedIssuer: e.authorizationServerUrl,
          receivedIssuer: e.authorizationServerMetadata.issuer,
          serverConfig: this.serverConfig,
        });
      } catch (error) {
        if (error instanceof IssuerEchoCrossOriginError && this._flowDiscoveryState === e) {
          this._flowDiscoveryState = undefined;
          this._flowDiscoveryStateAt = 0;
        }
        throw error;
      }
    return e;
  }
  servedMetadataUrl() {
    return this._servedOverrideAuthorizationServerUrl === undefined
      ? undefined
      : this.serverConfig.oauth?.authServerMetadataUrl;
  }
  async discoveryState() {
    this._servedOverrideAuthorizationServerUrl = undefined;
    let authServerMetadataUrl = this.serverConfig.oauth?.authServerMetadataUrl;
    if (this.authChallengeOpen) await this.readCredentialStore();
    let t = await hasStoredOAuthState_2(this.serverName, this.serverConfig);
    if (t === READ_FAILED) {
      if (this.serverConfig.oauth?.xaa) throw new McpCredentialStoreUnavailableError(this.serverName);
    } else if (t)
      return {
        authorizationServerUrl: t,
      };
    if (authServerMetadataUrl) {
      logMCPDebug(
        this.serverName,
        `Fetching metadata from configured URL: ${redactUrlSecrets(authServerMetadataUrl)}`,
      );
      try {
        let authServerMetadata = await fetchAuthServerMetadata(this.serverName, this.serverConfig.url, {
          configuredMetadataUrl: authServerMetadataUrl,
          fetchFn: wrapFetchWithHeaders(this.serverName, this.serverConfig, createAuthFetch_2()),
        });
        if (authServerMetadata) {
          let l = {
            authorizationServerUrl: authServerMetadata.issuer,
            authorizationServerMetadata: authServerMetadata,
          };
          this._servedOverrideAuthorizationServerUrl = authServerMetadata.issuer;
          this._servedOverrideDocuments.set(authServerMetadata, authServerMetadataUrl);
          this._flowDiscoveryState = l;
          this._flowDiscoveryStateFromConfiguredUrl = true;
          return this.servePolicyCheckedDiscoveryState(l);
        }
      } catch (error) {
        logMCPDebug(
          this.serverName,
          `Failed to fetch from configured metadata URL: ${describeSdkFetchError(error, this.serverConfig.url)}`,
        );
      }
      if (this._flowDiscoveryStateFromConfiguredUrl)
        this._servedOverrideAuthorizationServerUrl = this._flowDiscoveryState?.authorizationServerUrl;
      return this.servePolicyCheckedDiscoveryState(this._flowDiscoveryState);
    }
    if (this._flowDiscoveryState && Date.now() - this._flowDiscoveryStateAt < AUTH_FLOW_DISCOVERY_TTL_MS)
      return this.servePolicyCheckedDiscoveryState(this._flowDiscoveryState);
    let _flowDiscoveryStateAt = this._flowDiscoveryStateAt;
    let async = await getSecureStorage().readAsync();
    if (
      this._flowDiscoveryState &&
      this._flowDiscoveryStateAt !== _flowDiscoveryStateAt &&
      Date.now() - this._flowDiscoveryStateAt < AUTH_FLOW_DISCOVERY_TTL_MS
    )
      return this.servePolicyCheckedDiscoveryState(this._flowDiscoveryState);
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let cached = async?.mcpOAuth?.[serverKey]?.discoveryState;
    if (cached?.authorizationServerUrl) {
      logMCPDebug(
        this.serverName,
        `Returning cached discovery state (authServer: ${redactUrlSecrets(cached.authorizationServerUrl)})`,
      );
      let A = {
        authorizationServerUrl: cached.authorizationServerUrl,
        resourceMetadataUrl: cached.resourceMetadataUrl,
        resourceMetadata: cached.resourceMetadata,
        authorizationServerMetadata: cached.authorizationServerMetadata,
      };
      try {
        this.servePolicyCheckedDiscoveryState(A);
      } catch (error) {
        if (error instanceof IssuerEchoCrossOriginError) {
          await this.invalidateCredentials("discovery").catch(() => {});
          if (this._flowDiscoveryStateAt === _flowDiscoveryStateAt) {
            this._flowDiscoveryState = undefined;
            this._flowDiscoveryStateAt = 0;
          }
        }
        throw error;
      }
      this._flowDiscoveryStateFromConfiguredUrl = false;
      return (this._flowDiscoveryState = A);
    }
    return this.servePolicyCheckedDiscoveryState(this._flowDiscoveryState);
  }
  async refreshAuthorization(refreshToken) {
    if (isDiskless()) {
      logMCPDebug(this.serverName, "claude-code-server session; skipping refresh");
      return;
    }
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let claudeDir = getProjectDirsUpToHome();
    await getFsImplementation().mkdir(claudeDir);
    let sanitizedKey = serverKey.replace(/[^a-zA-Z0-9]/g, "_");
    let lockfilePath = join(claudeDir, `mcp-refresh-${sanitizedKey}.lock`);
    let release;
    for (let retry = 0; retry < MAX_METADATA_REDIRECTS_2; retry++)
      try {
        logMCPDebug(this.serverName, `Acquiring refresh lock (attempt ${retry + 1})`);
        release = await lock(lockfilePath, {
          realpath: false,
          stale: 60000,
          update: 5000,
          onCompromised: () => {
            logMCPDebug(this.serverName, "Refresh lock was compromised");
          },
        });
        logMCPDebug(this.serverName, "Acquired refresh lock");
        break;
      } catch (e) {
        let code = getErrnoCode(e);
        if (code === "ELOCKED") {
          logMCPDebug(
            this.serverName,
            `Refresh lock held by another process, waiting (attempt ${retry + 1}/${MAX_METADATA_REDIRECTS_2})`,
          );
          await sleep(1000 + Math.random() * 1000);
          continue;
        }
        logMCPDebug(this.serverName, `Failed to acquire refresh lock: ${code}; skipping refresh`);
        return;
      }
    if (!release) {
      logMCPDebug(
        this.serverName,
        `Could not acquire refresh lock after ${MAX_METADATA_REDIRECTS_2} retries; skipping refresh`,
      );
      return;
    }
    try {
      clearKeychainCache();
      let l = (await getSecureStorage().readAsync())?.mcpOAuth?.[serverKey];
      if (l) {
        let y = l.expiresAt != null ? (l.expiresAt - Date.now()) / 1000 : undefined;
        if (l.accessToken && (y == null || y > 300)) {
          logMCPDebug(
            this.serverName,
            y != null
              ? `Another process already refreshed tokens (expires in ${Math.floor(y)}s)`
              : "Another process already refreshed tokens (no expiration)",
          );
          return {
            access_token: l.accessToken,
            refresh_token: l.refreshToken,
            expires_in: y,
            scope: l.scope,
            token_type: "Bearer",
          };
        }
        if (l.refreshToken) {
          refreshToken = l.refreshToken;
          this._lastServedRefreshToken = l.refreshToken;
          this._presented.record(l.refreshToken);
        }
      }
      return await this._doRefresh(refreshToken);
    } finally {
      if (release)
        try {
          await release();
          logMCPDebug(this.serverName, "Released refresh lock");
        } catch {
          logMCPDebug(this.serverName, "Failed to release refresh lock");
        }
    }
  }
  async readConcurrentRefreshWinner() {
    clearKeychainCache();
    let t = (await getSecureStorage().readAsync())?.mcpOAuth?.[
      getServerKey(this.serverName, this.serverConfig)
    ];
    let n = t?.expiresAt != null ? (t.expiresAt - Date.now()) / 1000 : undefined;
    if (t?.accessToken && (n == null || n > 300)) {
      logMCPDebug(this.serverName, "Another process landed fresh tokens; using those");
      let freshTokens = {
        access_token: t.accessToken,
        refresh_token: t.refreshToken,
        expires_in: n,
        scope: t.scope,
        token_type: "Bearer",
      };
      return {
        tokenData: t,
        freshTokens,
      };
    }
    return {
      tokenData: t,
      freshTokens: undefined,
    };
  }
  async _doRefresh(refreshToken) {
    this._presented.record(refreshToken);
    let MAX_ATTEMPTS = 3;
    let mcpServerBaseUrl = loggingSafeOrigin(this.serverConfig);
    let emitRefreshEvent = (outcome, reason) => {
      logEvent(
        outcome === "success" ? "tengu_mcp_oauth_refresh_success" : "tengu_mcp_oauth_refresh_failure",
        {
          transportType: fromEnum(this.serverConfig.type),
          ...(mcpServerBaseUrl && {
            mcpServerBaseUrl,
          }),
          ...(reason && {
            reason: fromEnum(reason),
          }),
        },
      );
    };
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let S;
      try {
        logMCPDebug(this.serverName, "Starting token refresh");
        let authFetch = wrapFetchWithHeaders(this.serverName, this.serverConfig, createAuthFetch_2());
        let A = isIssuerStrictEchoEnabled() ? "enforce" : "observe";
        let metadata = this._metadataEchoMode === A ? this._metadata : undefined;
        if (!metadata) {
          let cached = await this.discoveryState();
          if (cached?.authorizationServerMetadata) metadata = cached.authorizationServerMetadata;
          else if (cached?.authorizationServerUrl) {
            logMCPDebug(
              this.serverName,
              `Re-discovering metadata from persisted auth server URL: ${redactUrlSecrets(cached.authorizationServerUrl)}`,
            );
            let authorizationServerUrl = cached.authorizationServerUrl;
            metadata = await discoverAuthorizationServerMetadata_2(authorizationServerUrl, {
              fetchFn: authFetch,
              skipIssuerValidation: true,
            });
            if (metadata)
              evaluateIssuerEchoPolicy({
                serverName: this.serverName,
                site: "refresh_rediscovery",
                expectedIssuer: authorizationServerUrl,
                receivedIssuer: metadata.issuer,
                serverConfig: this.serverConfig,
              });
          }
        }
        if (
          !metadata &&
          !this.serverConfig.oauth?.xaa &&
          (await hasStoredOAuthState_2(this.serverName, this.serverConfig)) === undefined
        )
          metadata = await fetchAuthServerMetadata(this.serverName, this.serverConfig.url, {
            configuredMetadataUrl: this.serverConfig.oauth?.authServerMetadataUrl,
            fetchFn: authFetch,
            serverConfigForAnalytics: this.serverConfig,
          });
        if (!metadata) {
          logMCPDebug(this.serverName, "Failed to discover OAuth metadata");
          emitRefreshEvent("failure", "metadata_discovery_failed");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_metadata_failed");
          return;
        }
        this._metadata = metadata;
        this._metadataEchoMode = isIssuerStrictEchoEnabled() ? "enforce" : "observe";
        S = await this.clientInformation();
        if (!S) {
          logMCPDebug(this.serverName, "No client information available");
          emitRefreshEvent("failure", "no_client_info");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_no_client_info");
          return;
        }
        let newTokens = await refreshAuthorization_2(new URL(this.serverConfig.url), {
          metadata,
          clientInformation: S,
          refreshToken,
          resource: new URL(this.serverConfig.url),
          fetchFn: authFetch,
        });
        if (newTokens) {
          logMCPDebug(this.serverName, "Token refresh successful");
          await this.saveTokens(newTokens);
          emitRefreshEvent("success");
          logFeatureOk("mcp_oauth_refresh");
          return newTokens;
        }
        logMCPDebug(this.serverName, "Token refresh returned no tokens");
        emitRefreshEvent("failure", "no_tokens_returned");
        logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_no_tokens");
        return;
      } catch (error) {
        if (error instanceof IssuerEchoCrossOriginError) {
          logMCPDebug(this.serverName, `Token refresh denied by issuer-echo policy: ${errorMessage(error)}`);
          emitRefreshEvent("failure", "issuer_echo_denied");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_issuer_echo_denied");
          return;
        }
        if (error instanceof OAuthError_2 && error.code === OAuthErrorCode.InvalidGrant) {
          logMCPDebug(this.serverName, `Token refresh failed with invalid_grant: ${error.message}`);
          let { freshTokens } = await this.readConcurrentRefreshWinner();
          if (freshTokens) {
            logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_winner");
            return freshTokens;
          }
          logMCPDebug(this.serverName, "No valid tokens in storage, clearing stored tokens");
          emitRefreshEvent("failure", "invalid_grant");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_invalid_grant");
          await this.invalidateCredentials("tokens");
          AUTH_LOST_SIGNAL.emit(this.serverName);
          return;
        }
        if (
          error instanceof OAuthError_2 &&
          (error.code === "invalid_client" || error.code === "unauthorized_client")
        ) {
          logMCPDebug(
            this.serverName,
            "Token refresh failed: DCR client expired or invalid; clearing stored client registration",
          );
          let { tokenData, freshTokens } = await this.readConcurrentRefreshWinner();
          if (freshTokens) {
            logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_winner");
            return freshTokens;
          }
          if (tokenData?.clientId && S && tokenData.clientId !== S.client_id) {
            logMCPDebug(this.serverName, "Another process re-registered client; preserving");
            emitRefreshEvent("failure", "concurrent_reregister");
            logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_reregister");
            return;
          }
          emitRefreshEvent(
            "failure",
            error.code === "unauthorized_client" ? "unauthorized_client" : "invalid_client",
          );
          logFeatureBad(
            "mcp_oauth_refresh",
            error.code === "unauthorized_client"
              ? "mcp_oauth_refresh_unauthorized_client"
              : "mcp_oauth_refresh_invalid_client",
          );
          await this.invalidateCredentials("all");
          AUTH_LOST_SIGNAL.emit(this.serverName);
          return;
        }
        if (isZodError_2(error)) {
          logMCPDebug(
            this.serverName,
            `Token refresh failed: token response rejected by SDK schema: ${errorMessage(error)}`,
          );
          emitRefreshEvent("failure", "token_response_schema_rejected");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_token_response_schema_rejected");
          return;
        }
        let A = error instanceof McpCredentialStoreUnavailableError;
        let l = error instanceof Error && /timeout|timed out|etimedout|econnreset/i.test(error.message);
        let isTransientServerError =
          error instanceof OAuthError_2 &&
          (error.code === OAuthErrorCode.ServerError ||
            error.code === OAuthErrorCode.TemporarilyUnavailable ||
            error.code === OAuthErrorCode.TooManyRequests ||
            !DEVICE_FLOW_PENDING_ERRORS.has(error.code));
        let isRetryable = l || isTransientServerError || A;
        if (!isRetryable || attempt >= MAX_ATTEMPTS) {
          logMCPDebug(
            this.serverName,
            `Token refresh failed: ${describeSdkFetchError(error, this.serverConfig.url)}`,
          );
          emitRefreshEvent("failure", isRetryable ? "transient_retries_exhausted" : "request_failed");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_request_failed");
          return;
        }
        let delayMs = 1000 * Math.pow(2, attempt - 1);
        logMCPDebug(
          this.serverName,
          `Token refresh failed, retrying in ${delayMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})`,
        );
        await sleep(delayMs);
      }
    }
    return;
  }
}
//@ chunk-n1aavqzh.js:62345-63004 facade-exports = readClientSecret (1)
/**
 * readClientSecret：从 MCP_CLIENT_SECRET 或 TTY 交互读取 client secret。
 */
async function readClientSecret_2() {
  let envSecret = process.env.MCP_CLIENT_SECRET;
  if (envSecret) return envSecret;
  if (!process.stdin.isTTY)
    throw Error("No TTY available to prompt for client secret. Set MCP_CLIENT_SECRET env var instead.");
  return new Promise((resolve, reject) => {
    process.stderr.write("Enter OAuth client secret: ");
    process.stdin.setRawMode?.(true);
    let secret = "";
    let onData = (ch) => {
      let str = ch.toString();
      if (
        str ===
          `
` ||
        str === "\r"
      ) {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener("data", onData);
        process.stderr.write(`
`);
        resolve(secret);
      } else if (str === "\x03") {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener("data", onData);
        reject(Error("Cancelled"));
      } else if (str === "\x7F" || str === "\b") secret = secret.slice(0, -1);
      else secret += str;
    };
    process.stdin.on("data", onData);
  });
}
//@ chunk-n1aavqzh.js:63004-63200 facade-exports
/**
 * saveMcpClientSecret：把 client secret 写入 mcpOAuthClientConfig[serverKey]。
 */
async function saveMcpClientSecret_2(serverName, serverConfig, clientSecret) {
  let serverKey = getServerKey(serverName, serverConfig);
  try {
    return await getSecureStorage().mutate((s) => ({
      ...s,
      mcpOAuthClientConfig: {
        ...s.mcpOAuthClientConfig,
        [serverKey]: {
          clientSecret,
        },
      },
    }));
  } catch (error) {
    return {
      success: false,
      warning: errorMessage(error),
    };
  }
}
//@ chunk-n1aavqzh.js:63200-63388 facade-exports
/**
 * clearMcpClientConfig：删除 mcpOAuthClientConfig 条目。
 */
async function clearMcpClientConfig_2(e, t) {
  let serverKey = getServerKey(e, t);
  await getSecureStorage().mutate((r) => {
    if (!r.mcpOAuthClientConfig?.[serverKey]) return r;
    let s = {
      ...r.mcpOAuthClientConfig,
    };
    delete s[serverKey];
    return {
      ...r,
      mcpOAuthClientConfig: s,
    };
  });
}
//@ chunk-n1aavqzh.js:63388-63487 facade-exports
/**
 * 从安全存储读取某服务器（名字+配置算出的键）保存的 OAuth 客户端配置 `mcpOAuthClientConfig`（如 DCR 得到的 client_id/secret）。（v2）
 */
async function getMcpClientConfig_2(serverName, serverConfig) {
  let async = await getSecureStorage().readAsync();
  let serverKey = getServerKey(serverName, serverConfig);
  return async?.mcpOAuthClientConfig?.[serverKey];
}
//@ chunk-n1aavqzh.js:63487-63660 layout = getScopeFromMetadata (0.903)
function getScopeFromMetadata_2(metadata) {
  if (!metadata) return;
  if ("scope" in metadata && typeof metadata.scope === "string") return metadata.scope;
  if ("default_scope" in metadata && typeof metadata.default_scope === "string")
    return metadata.default_scope;
  return;
}
//@ chunk-n1aavqzh.js:63660-63856 facade-exports
/**
 * shouldRequestOfflineAccess：元数据 scopes_supported 含 offline_access。
 */
function maybeAppendOfflineAccess_2(e, t) {
  if (e !== null && e.split(" ").includes("offline_access")) return e;
  if (!t?.scopes_supported?.includes("offline_access")) return e;
  return e === null ? "offline_access" : `${e} offline_access`;
}
//@ chunk-n1aavqzh.js:63856-64018 layout
var ENTRA_LOGIN_HOSTS = [
  "login.microsoftonline.com",
  "login.microsoftonline.us",
  "login.partner.microsoftonline.cn",
  "login.chinacloudapi.cn",
];
var ENTRA_LOGIN_HOST_SUFFIXES = [".b2clogin.com", ".ciamlogin.com"];
//@ chunk-n1aavqzh.js:64018-64155 facade-exports
/**
 * 判断 URL 主机是否属于 Microsoft Entra ID 登录域（精确列表或后缀匹配），解析失败返回 false；用于对 Entra 授权服务器做特殊处理。（v2）
 */
function isEntraLoginUrl_2(e) {
  try {
    let hostname = (typeof e === "string" ? new URL(e) : e).hostname;
    return (
      ENTRA_LOGIN_HOSTS.includes(hostname) || ENTRA_LOGIN_HOST_SUFFIXES.some((n) => hostname.endsWith(n))
    );
  } catch {
    return false;
  }
}
//@ chunk-1kaj6e83.js:8424-8482 sole-consumer
/**
 * 可重试连接错误码集合。
 */
var AUTH_REQUEST_TIMEOUT_MS_ALT = 30000;
var AUTH_RETRY_DELAY_MS_2 = 500;
var RETRYABLE_CONNECTION_ERRORS_ALT = new Set([
  ...TRANSIENT_SOCKET_CODES,
  ...UNREACHABLE_ERROR_CODES,
  "ETIMEDOUT",
]);
//@ chunk-1kaj6e83.js:8482-8615 sole-consumer
function isTransientAuthFetchError(error) {
  if (isAbortError(error)) return true;
  if (error instanceof Error && error.name === "TimeoutError") return true;
  let connectionErrorDetails = extractConnectionErrorDetails(error);
  return connectionErrorDetails !== null && RETRYABLE_CONNECTION_ERRORS_ALT.has(connectionErrorDetails.code);
}
//@ chunk-1kaj6e83.js:8615-8716 sole-consumer
function isZodError(e) {
  let t = e;
  return (t?.name === "ZodError" || t?.name === "$ZodError") && Array.isArray(t?.issues);
}
//@ chunk-1kaj6e83.js:8716-9122 affinity
/**
 * 可上报的 OAuth 错误码白名单。
 */
var OAUTH_ERROR_CODES = [
  "invalid_request",
  "invalid_client",
  "invalid_grant",
  "unauthorized_client",
  "unsupported_grant_type",
  "invalid_scope",
  "access_denied",
  "server_error",
  "temporarily_unavailable",
  "unsupported_response_type",
  "unsupported_token_type",
  "invalid_token",
  "method_not_allowed",
  "too_many_requests",
  "invalid_client_metadata",
  "insufficient_scope",
  "invalid_target",
  "authorization_pending",
  "expired_token",
  "slow_down",
];
//@ chunk-1kaj6e83.js:9122-9189 facade-exports
/**
 * 把 OAuth 错误码收敛成遥测白名单值，未知码记为 `other`。（v1 副本，同 chunk-n1aavqzh.js#q0i）
 */
function sanitizeOAuthErrorCodeForAnalytics(e) {
  let found = OAUTH_ERROR_CODES.find((r) => r === e);
  return fromEnumOpt(found) ?? lit("other");
}
//@ chunk-1kaj6e83.js:9189-9650 facade-exports
/**
 * 把 SDK 授权失败按消息与错误类型归类：dcr_failed（动态注册/客户端元数据无效）、discovery_failed（元数据加载失败或授权服务器不兼容）、dcr_rejected、network_failed（网络错误码）、其余 sdk_auth_failed；供遥测与提示。（v1 副本）
 */
function classifySdkAuthFailure(msg, cause) {
  let r =
    cause instanceof Error
      ? `${msg}
${cause.message}`
      : msg;
  if (
    r.includes("dynamic client registration") ||
    (cause instanceof OAuthError && cause.errorCode === "invalid_client_metadata")
  )
    return "dcr_failed";
  if ((r.includes("trying to load") && r.includes("metadata")) || r.includes("Incompatible auth server"))
    return "discovery_failed";
  if (cause instanceof OAuthError) return "dcr_rejected";
  let n = getErrnoCode(cause) ?? getErrnoCode(cause instanceof Error ? cause.cause : undefined);
  if (n && UNREACHABLE_ERRNOS.has(n)) return "network_failed";
  return "sdk_auth_failed";
}
//@ chunk-1kaj6e83.js:9650-9659 layout
var MAX_METADATA_REDIRECTS = 5;
//@ chunk-1kaj6e83.js:9659-9713 facade-exports
/**
 * 生成脱敏后的授权 URL 调试日志串。（v1 副本，同 chunk-n1aavqzh.js#izs）
 */
function authorizationUrlForDebugLog(e) {
  return redactUrlSecrets(e.origin + e.pathname) + redactUrlSearchParams(e);
}
//@ chunk-1kaj6e83.js:9713-9795 fingerprint = NONSTANDARD_INVALID_GRANT_ALIASES (1)
var NONSTANDARD_INVALID_GRANT_ALIASES = new Set([
  "invalid_refresh_token",
  "expired_refresh_token",
  "token_expired",
]);
//@ chunk-1kaj6e83.js:9795-10259 facade-exports = normalizeOAuthErrorBody (1)
/**
 * normalizeOAuthErrorBody：把非标准 OAuth 错误体（NONSTANDARD_INVALID_GRANT_ALIASES 中的别名）改写成 invalid_grant。
 */
async function normalizeOAuthErrorBody(response) {
  if (!response.ok) return response;
  let text = await response.text();
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return new Response(text, response);
  }
  if (OAuthTokensSchema.safeParse(parsed).success) return new Response(text, response);
  let result = OAuthErrorResponseSchema.safeParse(parsed);
  if (!result.success) return new Response(text, response);
  let normalized = NONSTANDARD_INVALID_GRANT_ALIASES.has(result.data.error)
    ? {
        error: "invalid_grant",
        error_description:
          result.data.error_description ?? `Server returned non-standard error code: ${result.data.error}`,
      }
    : result.data;
  return new Response(jsonStringify(normalized), {
    status: 400,
    statusText: "Bad Request",
    headers: response.headers,
  });
}
//@ chunk-1kaj6e83.js:10259-10419 facade-exports
/**
 * throwIfAborted（v1 副本）。
 */
function createAuthFetch() {
  return async (url, init) => {
    try {
      return await createAuthFetch_3(url, init);
    } catch (error) {
      if (init?.signal?.aborted || !isTransientAuthFetchError(error)) throw error;
      await sleep(AUTH_RETRY_DELAY_MS_2, init?.signal ?? undefined);
      return await createAuthFetch_3(url, init);
    }
  };
}
//@ chunk-1kaj6e83.js:10419-10950 fingerprint = createAuthFetch (1)
async function createAuthFetch_3(url, init) {
  let timeoutSignal = AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS_ALT);
  let isPost = init?.method?.toUpperCase() === "POST";
  let proxyFetchOptions = getProxyFetchOptions({
    url: String(url),
  });
  if (!init?.signal) {
    let response;
    try {
      response = await fetch(url, {
        ...init,
        ...proxyFetchOptions,
        signal: timeoutSignal,
      });
    } catch (error) {
      rethrowRedactedFetchError(error, url);
    }
    return isPost ? normalizeOAuthErrorBody(response) : response;
  }
  let controller = new AbortController();
  let abort = () => controller.abort();
  init.signal.addEventListener("abort", abort);
  timeoutSignal.addEventListener("abort", abort);
  let cleanup = () => {
    init.signal?.removeEventListener("abort", abort);
    timeoutSignal.removeEventListener("abort", abort);
  };
  if (init.signal.aborted) controller.abort();
  try {
    let response = await fetch(url, {
      ...init,
      ...proxyFetchOptions,
      signal: controller.signal,
    });
    cleanup();
    return isPost ? normalizeOAuthErrorBody(response) : response;
  } catch (error) {
    cleanup();
    rethrowRedactedFetchError(error, url);
  }
}
//@ chunk-1kaj6e83.js:10950-11774 fingerprint = fetchAuthServerMetadata (0.81)
/**
 * fetchAuthServerMetadata（v1）。
 */
async function fetchAuthServerMetadata_2(serverName, serverUrl, options) {
  let { configuredMetadataUrl, fetchFn, resourceMetadataUrl } = options ?? {};
  let authFetch = fetchFn ?? createAuthFetch();
  if (configuredMetadataUrl) {
    if (!configuredMetadataUrl.startsWith("https://"))
      throw Error(
        `authServerMetadataUrl must use https:// (got: ${redactUrlSecrets(configuredMetadataUrl)})`,
      );
    let response = await authFetch(configuredMetadataUrl, {
      headers: {
        Accept: "application/json",
      },
    });
    if (response.ok) {
      let A;
      try {
        A = await response.json();
      } catch {
        throw Error(
          `Configured auth server metadata at ${redactUrlSecrets(configuredMetadataUrl)} is not valid JSON`,
        );
      }
      return OAuthMetadataSchema.parse(A);
    }
    throw Error(
      `HTTP ${response.status} fetching configured auth server metadata from ${redactUrlSecrets(configuredMetadataUrl)}`,
    );
  }
  try {
    let { authorizationServerMetadata } = await discoverOAuthServerInfo(serverUrl, {
      fetchFn: authFetch,
      ...(resourceMetadataUrl && {
        resourceMetadataUrl,
      }),
    });
    if (authorizationServerMetadata) return authorizationServerMetadata;
  } catch (err) {
    logMCPDebug(
      serverName,
      `RFC 9728 discovery failed, falling back: ${describeSdkFetchError(err, serverUrl)}`,
    );
  }
  let url = new URL(serverUrl);
  if (url.pathname === "/") return;
  try {
    return await discoverAuthorizationServerMetadata(url, {
      fetchFn: authFetch,
    });
  } catch (error) {
    logMCPDebug(
      serverName,
      `Path-aware auth server discovery failed: ${describeSdkFetchError(error, serverUrl)}`,
    );
    return;
  }
}
//@ chunk-1kaj6e83.js:11774-11982 facade-exports
/**
 * McpClientRegistrationDeferredError（v1 副本）。
 */
class McpClientRegistrationDeferredError extends UnauthorizedError {
  serverName;
  constructor(serverName) {
    super("Authentication required; client registration is deferred until the user authenticates");
    this.serverName = serverName;
    this.name = "McpClientRegistrationDeferredError";
  }
}
//@ chunk-1kaj6e83.js:11982-12100 facade-exports = AuthenticationCancelledError (1)
/**
 * 用户取消 MCP OAuth 授权时抛出的错误类。（v1 副本）
 */
class AuthenticationCancelledError extends Error {
  constructor() {
    super("Authentication was cancelled");
    this.name = "AuthenticationCancelledError";
  }
}
//@ chunk-1kaj6e83.js:12270-12467 sole-consumer
function getRegisteredLoopbackPort(e) {
  if (!e?.clientId || !e.redirectUri || !isLoopbackOrigin_2(e.redirectUri)) return;
  let t = Number(new URL(e.redirectUri).port);
  return t && e.redirectUri.replace("//127.0.0.1:", "//localhost:") === buildRedirectUri(t) ? t : undefined;
}
//@ chunk-1kaj6e83.js:12467-12525 sole-consumer
function getClientMetadataDocumentUrl() {
  return env.MCP_OAUTH_CLIENT_METADATA_URL || MCP_CLIENT_METADATA_URL;
}
//@ chunk-1kaj6e83.js:12525-12620 sole-consumer
function isLoopbackCallbackUri(redirectUri) {
  if (!isLoopbackOrigin_2(redirectUri)) return false;
  try {
    return new URL(redirectUri).pathname === "/callback";
  } catch {
    return false;
  }
}
//@ chunk-1kaj6e83.js:12620-12674 sole-consumer
function isClientMetadataDocumentId(clientId) {
  return (
    clientId !== undefined &&
    (clientId === MCP_CLIENT_METADATA_URL || clientId === getClientMetadataDocumentUrl())
  );
}
//@ chunk-1kaj6e83.js:12674-12733 facade-exports
/**
 * 按服务器键取 OAuth 回调提交器。（v1 副本）
 */
function getOAuthCallbackSubmitter(e) {
  return getCliOwnedState().oauthCallbackSubmitters.get(e);
}
//@ chunk-1kaj6e83.js:12733-12849 facade-exports
/**
 * 登记进行中的 OAuth 授权 Promise，结束后自动移除。（v1 副本）
 */
function setActiveOAuthPromise(e, t) {
  let activeOAuthFlows = getCliOwnedState().activeOAuthFlows;
  activeOAuthFlows.set(e, t);
  t.finally(() => {
    if (activeOAuthFlows.get(e) === t) activeOAuthFlows.delete(e);
  }).catch(() => {});
}
//@ chunk-1kaj6e83.js:12849-12901 facade-exports
/**
 * 取出进行中的 OAuth 授权 Promise。（v1 副本）
 */
function getActiveOAuthPromise(e) {
  return getCliOwnedState().activeOAuthFlows.get(e);
}
//@ chunk-1kaj6e83.js:12901-13281 facade-exports
/**
 * 清理"无令牌桩"：安全存储里某服务器的 mcpOAuth 记录既无 accessToken 也无 refreshToken、且没有进行中的发现状态时，原子地删除该条；失败只记 MCP 调试日志。（v1）
 */
async function clearMcpOAuthStubIfTokenless(e, t) {
  let serverKey = getServerKey(e, t);
  let n = (await getSecureStorage().readAsync())?.mcpOAuth?.[serverKey];
  if (!n || n.accessToken || n.refreshToken || xaaPinnedServer(n.discoveryState)) return;
  try {
    await getSecureStorage().mutate((s) => {
      let h = s.mcpOAuth?.[serverKey];
      if (!h || h.accessToken || h.refreshToken || xaaPinnedServer(h.discoveryState)) return s;
      let l = {
        ...s.mcpOAuth,
      };
      delete l[serverKey];
      return {
        ...s,
        mcpOAuth: l,
      };
    });
  } catch (error) {
    logMCPDebug(e, `clear tokenless stub failed: ${errorMessage(error)}`);
  }
}
//@ chunk-1kaj6e83.js:13281-14335 fingerprint = revokeToken (0.967)
async function revokeToken({
  serverName,
  endpoint,
  token,
  tokenTypeHint,
  clientId,
  clientSecret,
  accessToken,
  authMethod = "client_secret_basic",
  configuredHeaders,
}) {
  let params = new URLSearchParams();
  params.set("token", token);
  params.set("token_type_hint", tokenTypeHint);
  let headers = {
    ...configuredHeaders,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  let U =
    Object.keys(configuredHeaders).length > 0
      ? {
          beforeRedirect: sameOriginRedirectGuard(endpoint),
        }
      : {};
  if (clientId && clientSecret) {
    if (authMethod === "client_secret_post") {
      params.set("client_id", clientId);
      params.set("client_secret", clientSecret);
    } else {
      let basic = Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString(
        "base64",
      );
      headers.Authorization = `Basic ${basic}`;
      getPresentedCredentialLog().record(basic);
    }
  } else if (clientId) params.set("client_id", clientId);
  else logMCPDebug(serverName, `No client_id available for ${tokenTypeHint} revocation - server may reject`);
  try {
    await axios_default.post(endpoint, params, {
      headers,
      ...U,
    });
    logMCPDebug(serverName, `Successfully revoked ${tokenTypeHint}`);
  } catch (error) {
    if (axios_default.isAxiosError(error) && error.response?.status === 401 && accessToken) {
      logMCPDebug(serverName, `Got 401, retrying ${tokenTypeHint} revocation with Bearer auth`);
      params.delete("client_id");
      params.delete("client_secret");
      await axios_default.post(endpoint, params, {
        headers: {
          ...headers,
          Authorization: `Bearer ${accessToken}`,
        },
        ...U,
      });
      logMCPDebug(serverName, `Successfully revoked ${tokenTypeHint} with Bearer auth`);
    } else throw error;
  }
}
//@ chunk-1kaj6e83.js:14335-14633 facade-exports
/**
 * readStoredServerCredentials（v1 副本）。
 */
async function snapshotServerTokens(e, t) {
  let n = (await getSecureStorage().readAsync())?.mcpOAuth?.[getServerKey(e, t)];
  if (!n?.accessToken && !n?.refreshToken) return;
  return {
    accessToken: n.accessToken || undefined,
    refreshToken: n.refreshToken,
    clientId: n.clientId,
    clientSecret: n.clientSecret,
    ...(n.discoveryState && {
      discoveryState: authDiscoveryState(n.discoveryState),
    }),
  };
}
//@ chunk-1kaj6e83.js:14633-16208 fingerprint = revokeServerTokens (0.795)
/**
 * revokeServerTokens（v1）：按 RFC 7009 撤销访问与刷新令牌。
 */
async function revokeServerTokens_3(serverName, serverConfig, tokenData) {
  let storage = getPresentedCredentialLog();
  storage.record(tokenData.accessToken);
  storage.record(tokenData.refreshToken);
  storage.record(tokenData.clientSecret);
  let s;
  try {
    let asUrl = tokenData.discoveryState?.authorizationServerUrl ?? serverConfig.url;
    let metadata = await fetchAuthServerMetadata_2(serverName, asUrl, {
      configuredMetadataUrl: xaaPinnedServer(tokenData.discoveryState)
        ? undefined
        : serverConfig.oauth?.authServerMetadataUrl,
      fetchFn: wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch()),
    });
    if (!metadata) {
      logMCPDebug(serverName, "No OAuth metadata found");
      s = "no_metadata";
    } else {
      let revocationEndpoint = "revocation_endpoint" in metadata ? metadata.revocation_endpoint : null;
      if (!revocationEndpoint) {
        logMCPDebug(serverName, "Server does not support token revocation");
        s = "no_revocation_endpoint";
      } else {
        let revocationEndpointStr = String(revocationEndpoint);
        let configuredHeaders = await dynamicHeadersForRequest(
          serverName,
          serverConfig,
          revocationEndpointStr,
        );
        let authMethods =
          ("revocation_endpoint_auth_methods_supported" in metadata
            ? metadata.revocation_endpoint_auth_methods_supported
            : undefined) ??
          ("token_endpoint_auth_methods_supported" in metadata
            ? metadata.token_endpoint_auth_methods_supported
            : undefined);
        let authMethod =
          authMethods &&
          !authMethods.includes("client_secret_basic") &&
          authMethods.includes("client_secret_post")
            ? "client_secret_post"
            : "client_secret_basic";
        logMCPDebug(
          serverName,
          `Revoking tokens via ${redactUrlSecrets(revocationEndpointStr)} (${authMethod})`,
        );
        if (tokenData.refreshToken)
          try {
            await revokeToken({
              serverName,
              endpoint: revocationEndpointStr,
              token: tokenData.refreshToken,
              tokenTypeHint: "refresh_token",
              clientId: tokenData.clientId,
              clientSecret: tokenData.clientSecret,
              accessToken: tokenData.accessToken,
              authMethod,
              configuredHeaders,
            });
          } catch (error) {
            logMCPDebug(serverName, `Failed to revoke refresh token: ${errorMessage(error)}`);
            s = "server_revoke_failed";
          }
        if (tokenData.accessToken)
          try {
            await revokeToken({
              serverName,
              endpoint: revocationEndpointStr,
              token: tokenData.accessToken,
              tokenTypeHint: "access_token",
              clientId: tokenData.clientId,
              clientSecret: tokenData.clientSecret,
              accessToken: tokenData.accessToken,
              authMethod,
              configuredHeaders,
            });
          } catch (error) {
            logMCPDebug(serverName, `Failed to revoke access token: ${errorMessage(error)}`);
            s = "server_revoke_failed";
          }
      }
    }
  } catch (error) {
    logMCPDebug(serverName, `Failed to revoke tokens: ${errorMessage(error)}`);
    s = "server_revoke_failed";
  }
  return s;
}
//@ chunk-1kaj6e83.js:16208-16728 facade-exports
/**
 * revokeReplacedTokens（v1 副本）。
 */
async function revokeReplacedServerTokens(serverName, serverConfig, r) {
  let n;
  try {
    let s = (await getSecureStorage().readAsync())?.mcpOAuth?.[getServerKey(serverName, serverConfig)];
    let tokenData = {
      ...r,
      accessToken: r.accessToken && r.accessToken !== s?.accessToken ? r.accessToken : undefined,
      refreshToken: r.refreshToken && r.refreshToken !== s?.refreshToken ? r.refreshToken : undefined,
    };
    if (!tokenData.accessToken && !tokenData.refreshToken) {
      logMCPDebug(serverName, "No replaced tokens to revoke");
      logFeatureOk("mcp_oauth_revoke");
      return;
    }
    n = await revokeServerTokens_3(serverName, serverConfig, tokenData);
  } catch (error) {
    logMCPDebug(serverName, `Failed to revoke replaced tokens: ${errorMessage(error)}`);
    n = "server_revoke_failed";
  }
  if (n) logFeatureSad("mcp_oauth_revoke", n);
  else logFeatureOk("mcp_oauth_revoke");
}
//@ chunk-1kaj6e83.js:16728-18686 facade-exports
/**
 * clearServerTokens（v1）。
 */
async function revokeServerTokens(serverName, serverConfig, { preserveStepUpState: r = false } = {}) {
  let secureStorage = getSecureStorage();
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (secureStorageForMcp === READ_FAILED) {
    logMCPDebug(serverName, "Could not read the credential store to clear tokens");
    logFeatureBad("mcp_oauth_revoke", "local_read_failed");
    return {
      cleared: false,
      reason: "credential_store_failed",
    };
  }
  let serverKey = getServerKey(serverName, serverConfig);
  let l = secureStorageForMcp?.mcpOAuth?.[serverKey];
  let S;
  if (l?.accessToken || l?.refreshToken)
    S = await revokeServerTokens_3(serverName, serverConfig, {
      accessToken: l.accessToken || undefined,
      refreshToken: l.refreshToken,
      clientId: l.clientId,
      clientSecret: l.clientSecret,
      ...(l.discoveryState && {
        discoveryState: authDiscoveryState(l.discoveryState),
      }),
    });
  else logMCPDebug(serverName, "No tokens to revoke");
  let v = false;
  try {
    if (r && l && (l.stepUpScope || l.discoveryState || l.clientId)) {
      let A = await secureStorage.mutate((y) => {
        let U = y.mcpOAuth?.[serverKey];
        if (U?.accessToken !== l.accessToken || U?.clientId !== l.clientId) return y;
        return {
          ...y,
          mcpOAuth: {
            ...y.mcpOAuth,
            [serverKey]: {
              serverName,
              serverUrl: serverConfig.url,
              accessToken: "",
              refreshToken: undefined,
              expiresAt: undefined,
              ...(l.clientId && {
                clientId: l.clientId,
                ...(l.redirectUri && {
                  redirectUri: l.redirectUri,
                }),
                ...(l.clientSecret !== undefined && {
                  clientSecret: l.clientSecret,
                }),
              }),
              ...(l.stepUpScope && {
                stepUpScope: l.stepUpScope,
              }),
              ...(l.discoveryState && {
                discoveryState: {
                  ...authDiscoveryState(l.discoveryState),
                  resourceMetadataUrl: l.discoveryState.resourceMetadataUrl,
                  tokenlessRejectedAt: l.discoveryState.tokenlessRejectedAt,
                },
              }),
            },
          },
        };
      });
      v = A.success;
      logMCPDebug(
        serverName,
        A.success
          ? "Preserved step-up auth state across revocation"
          : `clear local tokens failed: ${A.warning ?? "storage write failed"}`,
      );
    } else if (r) v = (await clearServerTokensFromLocalStorage(serverName, serverConfig)).success;
    else {
      let A = await confirmCredentialRemoval(
        secureStorage,
        (y) => {
          if (!y.mcpOAuth?.[serverKey]) return y;
          let { [serverKey]: U, ...w } = y.mcpOAuth;
          return {
            ...y,
            mcpOAuth: w,
          };
        },
        (y) => y.mcpOAuth?.[serverKey] !== undefined,
      );
      if (!A.confirmed && A.reason === "keychain_unreadable") {
        logMCPDebug(serverName, "Could not read the keychain to clear tokens");
        logFeatureBad("mcp_oauth_revoke", "keychain_unreadable");
        return {
          cleared: false,
          reason: "keychain_unreadable",
        };
      }
      v = A.confirmed;
    }
  } catch (error) {
    logMCPDebug(serverName, `clear local tokens failed: ${errorMessage(error)}`);
  }
  if (!v) S ??= "local_clear_failed";
  clearDiscoveryPathMemo(serverName);
  if (S) logFeatureSad("mcp_oauth_revoke", S);
  else logFeatureOk("mcp_oauth_revoke");
  return v
    ? {
        cleared: true,
      }
    : {
        cleared: false,
        reason: "credential_store_failed",
      };
}
//@ chunk-1kaj6e83.js:18686-19319 facade-exports = clearServerTokensFromLocalStorage (0.306)
/**
 * clearServerTokensFromLocalStorage（v1）。
 */
async function clearServerTokensFromLocalStorage(serverName, serverConfig, r) {
  let serverKey = getServerKey(serverName, serverConfig);
  let s;
  let h = await getSecureStorage().mutate((l) => {
    let S = l.mcpOAuth?.[serverKey];
    if (!S) return l;
    let v = {
      ...l.mcpOAuth,
    };
    if (S.clientId && r?.preserveClientRegistration?.(S)) {
      if (!S.accessToken && !S.refreshToken) return l;
      v[serverKey] = {
        ...S,
        accessToken: "",
        refreshToken: undefined,
        expiresAt: 0,
        scope: undefined,
      };
      s = "tokens";
    } else if (r?.keepXaaPin && xaaPinnedServer(S.discoveryState)) {
      v[serverKey] = {
        serverName: S.serverName,
        serverUrl: S.serverUrl,
        accessToken: "",
        expiresAt: 0,
        discoveryState: S.discoveryState,
      };
      s = "all";
    } else {
      delete v[serverKey];
      s = "all";
    }
    return {
      ...l,
      mcpOAuth: v,
    };
  });
  if (s)
    logMCPDebug(
      serverName,
      s === "tokens" ? "Cleared stored tokens (preserved client registration)" : "Cleared stored tokens",
    );
  return h;
}
//@ chunk-1kaj6e83.js:19319-19608 layout
function logStorageWriteFailure(serverName, serverConfig, r, n) {
  if (r?.success) return;
  let s = n ? "mutate_rejected" : "storage_write_failed";
  let h = n ? errorMessage(n) : (r?.warning ?? "storage write failed");
  logMCPDebug(serverName, `Token persist failed: ${h}`);
  let l = loggingSafeOrigin(serverConfig);
  logEvent("tengu_mcp_oauth_token_persist_failed", {
    transportType: fromEnum(serverConfig.type),
    ...(l && {
      mcpServerBaseUrl: l,
    }),
    reason: fromEnum(s),
  });
}
//@ chunk-1kaj6e83.js:19608-19767 layout
async function hasStoredOAuthState(serverName, serverConfig) {
  let serverKey = getServerKey(serverName, serverConfig);
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (
    secureStorageForMcp === READ_FAILED ||
    (serverConfig.oauth?.xaa && !secureStorageForMcp?.mcpOAuthClientConfig?.[serverKey])
  )
    return READ_FAILED;
  return xaaPinnedServer(secureStorageForMcp?.mcpOAuth?.[serverKey]?.discoveryState);
}
//@ chunk-1kaj6e83.js:19767-22390 fingerprint = performMCPXaaAuth (0.9)
/**
 * performMCPXaaAuth（v1）。
 */
async function performMCPXaaAuth(serverName, serverConfig, onAuthorizationUrl, abortSignal, skipBrowserOpen) {
  if (!serverConfig.oauth?.xaa) throw Error("XAA: oauth.xaa must be set");
  let idp = getXaaIdpSettings();
  if (!idp)
    throw Error(
      "XAA: no IdP connection configured. Run 'claude mcp xaa setup --issuer <url> --client-id <id> --client-secret' to configure.",
    );
  let clientId = serverConfig.oauth?.clientId;
  if (!clientId) throw Error(`XAA: server '${serverName}' needs an AS client_id. Re-add with --client-id.`);
  let clientSecret = (await getMcpClientConfig(serverName, serverConfig))?.clientSecret;
  if (!clientSecret) {
    let wantedKey = getServerKey(serverName, serverConfig);
    let haveKeys = Object.keys((await getSecureStorage().readAsync())?.mcpOAuthClientConfig ?? {});
    let headersForLogging = redactHeaders(serverConfig.headers ?? {});
    logMCPDebug(
      serverName,
      `XAA: secret lookup miss. wanted=${wantedKey} have=[${haveKeys.join(", ")}] configHeaders=${jsonStringify(headersForLogging)}`,
    );
    throw Error(`XAA: AS client secret not found for '${serverName}'. Re-add with --client-secret.`);
  }
  if ((await hasStoredOAuthState(serverName, serverConfig)) === READ_FAILED)
    throw new McpCredentialStoreUnavailableError(serverName);
  logMCPDebug(serverName, "XAA: starting cross-app access flow");
  let idpClientSecret = await getIdpClientSecret(idp.issuer);
  let idTokenCacheHit = (await getCachedIdpIdToken(idp.issuer)) !== undefined;
  let failureStage = "idp_login";
  try {
    let idToken;
    try {
      idToken = await acquireIdpIdToken({
        idpIssuer: idp.issuer,
        idpClientId: idp.clientId,
        idpClientSecret,
        callbackPort: idp.callbackPort,
        onAuthorizationUrl,
        skipBrowserOpen,
        abortSignal,
      });
    } catch (e) {
      if (abortSignal?.aborted) throw new AuthenticationCancelledError();
      throw e;
    }
    failureStage = "discovery";
    let oidc = await discoverOidc(idp.issuer);
    failureStage = "token_exchange";
    getPresentedCredentialLog().record(clientSecret);
    let F = await hasStoredOAuthState(serverName, serverConfig);
    if (F === READ_FAILED) throw new McpCredentialStoreUnavailableError(serverName);
    let tokens;
    try {
      tokens = await performCrossAppAccess_2(
        serverConfig.url,
        {
          clientId,
          clientSecret,
          idpClientId: idp.clientId,
          idpClientSecret,
          idpIdToken: idToken,
          idpTokenEndpoint: oidc.token_endpoint,
          pinnedAuthorizationServer: F,
        },
        serverName,
        abortSignal,
      );
    } catch (e) {
      if (abortSignal?.aborted) throw new AuthenticationCancelledError();
      let msg = errorMessage(e);
      if (e instanceof XaaTokenExchangeError) {
        if (e.shouldClearIdToken) {
          await clearIdpIdToken(idp.issuer);
          logMCPDebug(serverName, "XAA: cleared cached id_token after token-exchange failure");
        }
      } else if (
        msg.includes("PRM discovery failed") ||
        msg.includes("AS metadata discovery failed") ||
        msg.includes("no authorization server supports jwt-bearer") ||
        msg.includes("authorization server changed")
      )
        failureStage = "discovery";
      else if (msg.includes("jwt-bearer")) failureStage = "jwt_bearer";
      throw e;
    }
    let serverKey = getServerKey(serverName, serverConfig);
    let storage = getPresentedCredentialLog();
    storage.record(tokens.access_token);
    storage.record(tokens.refresh_token);
    let x;
    let B;
    try {
      x = await getSecureStorage().mutate((existingData) => {
        let prev = existingData.mcpOAuth?.[serverKey];
        return {
          ...existingData,
          mcpOAuth: {
            ...existingData.mcpOAuth,
            [serverKey]: {
              ...prev,
              serverName,
              serverUrl: serverConfig.url,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token ?? prev?.refreshToken,
              expiresAt: tokens.expires_in != null ? Date.now() + tokens.expires_in * 1000 : undefined,
              scope: tokens.scope,
              clientId,
              clientSecret,
              discoveryState: pinXaaAuth({
                previous: prev?.discoveryState,
                issuedBy: tokens.authorizationServerUrl,
                interactiveSignIn: true,
              }),
            },
          },
        };
      });
    } catch (error) {
      B = error;
    }
    if (x?.success) logMCPDebug(serverName, "XAA: tokens saved");
    else logStorageWriteFailure(serverName, serverConfig, x, B);
    logEvent("tengu_mcp_oauth_flow_success", {
      authMethod: lit("xaa"),
      idTokenCacheHit,
    });
    logFeatureOk("mcp_oauth_flow");
  } catch (e) {
    if (e instanceof AuthenticationCancelledError) throw e;
    logFeatureBad("mcp_oauth_flow", "mcp_oauth_xaa_failed");
    logEvent("tengu_mcp_oauth_flow_failure", {
      authMethod: lit("xaa"),
      xaaFailureStage: fromEnum(failureStage),
      idTokenCacheHit,
    });
    throw e;
  }
}
//@ chunk-1kaj6e83.js:22390-30247 facade-exports = performMCPOAuthFlow (0.792)
/**
 * performMCPOAuthFlow（v1）：同 v2，回调不处理 iss。
 */
async function performMCPOAuthFlow(serverName, serverConfig, onAuthorizationUrl, abortSignal, options) {
  if (!URL.canParse(serverConfig.url)) {
    logFeatureBad("mcp_oauth_flow", "mcp_oauth_no_valid_url");
    let configError =
      "configError" in serverConfig && typeof serverConfig.configError === "string"
        ? serverConfig.configError
        : undefined;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      configError ||
        "This server's URL is missing or not a valid URL, so sign-in can't start. Fix the URL in its MCP config (or set the environment variable it uses) and try again.",
      "MCP OAuth refused: no valid server URL",
    );
  }
  if (serverConfig.oauth?.xaa) {
    if (!isXaaEnabled())
      throw Error(
        `XAA is not enabled (set CLAUDE_CODE_ENABLE_XAA=1). Remove 'oauth.xaa' from server '${serverName}' to use the standard consent flow.`,
      );
    logEvent("tengu_mcp_oauth_flow_start", {
      isOAuthFlow: true,
      authMethod: lit("xaa"),
      transportType: fromEnum(serverConfig.type),
      ...(loggingSafeOrigin(serverConfig) && {
        mcpServerBaseUrl: loggingSafeOrigin(serverConfig),
      }),
    });
    await performMCPXaaAuth(
      serverName,
      serverConfig,
      onAuthorizationUrl,
      abortSignal,
      options?.skipBrowserOpen,
    );
    return;
  }
  let storage = getSecureStorage();
  let serverKey = getServerKey(serverName, serverConfig);
  let cachedEntry = (await storage.readAsync())?.mcpOAuth?.[serverKey];
  let cachedStepUpScope = cachedEntry?.stepUpScope;
  let cachedResourceMetadataUrl = cachedEntry?.discoveryState?.resourceMetadataUrl;
  let registeredLoopbackPort = getRegisteredLoopbackPort(cachedEntry);
  let resourceMetadataUrl;
  if (cachedResourceMetadataUrl)
    try {
      resourceMetadataUrl = new URL(cachedResourceMetadataUrl);
    } catch {
      logMCPDebug(
        serverName,
        `Invalid cached resourceMetadataUrl: ${redactUrlSecrets(cachedResourceMetadataUrl)}`,
      );
    }
  let wwwAuthParams = {
    scope: cachedStepUpScope,
    resourceMetadataUrl,
  };
  let flowAttemptId = randomUUID();
  let F = mcpServerTelemetry(serverConfig, options?.redirectUri);
  logEvent("tengu_mcp_oauth_flow_start", {
    flowAttemptId: sanitizeMarkName(flowAttemptId),
    isOAuthFlow: true,
    transportType: fromEnum(serverConfig.type),
    ...F,
    ...(loggingSafeOrigin(serverConfig) && {
      mcpServerBaseUrl: loggingSafeOrigin(serverConfig),
    }),
  });
  let authorizationCodeObtained = false;
  try {
    let configuredCallbackPort = serverConfig.oauth?.callbackPort;
    let E = !!options?.redirectUri;
    let port = E ? 0 : (configuredCallbackPort ?? (await findAvailablePort(registeredLoopbackPort)));
    let redirectUri = options?.redirectUri ?? buildRedirectUri(port);
    logMCPDebug(
      serverName,
      E
        ? `Using custom redirectUri: ${redactUrlSecrets(redirectUri)} (no localhost listener)`
        : `Using redirect port: ${port}${configuredCallbackPort ? " (from config)" : registeredLoopbackPort && port === registeredLoopbackPort ? " (reusing registered port)" : ""}`,
    );
    try {
      await clearServerTokensFromLocalStorage(serverName, serverConfig, {
        preserveClientRegistration: (z) =>
          port === getRegisteredLoopbackPort(z) || z.redirectUri === redirectUri,
        keepXaaPin: true,
      });
    } catch (error) {
      logMCPDebug(serverName, `clear stored credentials failed: ${errorMessage(error)}`);
    }
    let cliOwnedState = getCliOwnedState();
    let abortController = new AbortController();
    if (!E) {
      cliOwnedState.oauthCallbackListeners.get(port)?.abort();
      cliOwnedState.oauthCallbackListeners.set(port, abortController);
    }
    let provider = new ClaudeAuthProvider(
      serverName,
      serverConfig,
      redirectUri,
      true,
      onAuthorizationUrl,
      options?.skipBrowserOpen,
    );
    let redirectUri_2 = Boolean(serverConfig.oauth?.scopes || serverConfig.oauth?.authServerMetadataUrl);
    if (wwwAuthParams.scope && !redirectUri_2) provider.markStepUpPending(wwwAuthParams.scope);
    let fetchFn = wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch());
    try {
      let metadata = await fetchAuthServerMetadata_2(serverName, serverConfig.url, {
        configuredMetadataUrl: serverConfig.oauth?.authServerMetadataUrl,
        fetchFn,
        resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
      });
      if (metadata) {
        provider.setMetadata(metadata);
        logMCPDebug(
          serverName,
          `Fetched OAuth metadata with scope: ${redactSensitiveUrlParams("scope", getScopeFromMetadata(metadata) ?? "") || "NONE"}`,
        );
      }
    } catch (error) {
      logMCPDebug(
        serverName,
        `Failed to fetch OAuth metadata: ${describeSdkFetchError(error, serverConfig.url)}`,
      );
    }
    let oauthState = await provider.state();
    let server = null;
    let timeoutId = null;
    let abortHandler = null;
    let Se = null;
    let cleanup = () => {
      if (server) {
        server.removeAllListeners();
        server.on("error", () => {});
        server.close();
        server = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (abortHandler) {
        abortSignal?.removeEventListener("abort", abortHandler);
        abortController.signal.removeEventListener("abort", abortHandler);
        abortHandler = null;
      }
      if (cliOwnedState.oauthCallbackListeners.get(port) === abortController)
        cliOwnedState.oauthCallbackListeners.delete(port);
      if (cliOwnedState.oauthCallbackSubmitters.get(serverName) === Se)
        cliOwnedState.oauthCallbackSubmitters.delete(serverName);
      logMCPDebug(serverName, "MCP OAuth server cleaned up");
    };
    let authorizationCode = await new Promise((resolve, reject) => {
      let resolved = false;
      let resolveOnce = (code) => {
        if (resolved) return;
        resolved = true;
        resolve(code);
      };
      let rejectOnce = (error) => {
        if (resolved) return;
        resolved = true;
        reject(error);
      };
      abortHandler = () => {
        cleanup();
        rejectOnce(new AuthenticationCancelledError());
      };
      if (abortSignal?.aborted || abortController.signal.aborted) {
        abortHandler();
        return;
      }
      abortSignal?.addEventListener("abort", abortHandler);
      abortController.signal.addEventListener("abort", abortHandler);
      {
        let L = (callbackUrl) => {
          try {
            let parsed = new URL(callbackUrl);
            let code = parsed.searchParams.get("code");
            let state = parsed.searchParams.get("state");
            let error = parsed.searchParams.get("error");
            if (!code && !error) return false;
            if (state !== oauthState) {
              logMCPDebug(serverName, "Ignoring manual callback URL whose state belongs to a different flow");
              return false;
            }
            if (error) {
              let errorDescription = parsed.searchParams.get("error_description") || "";
              cleanup();
              rejectOnce(Error(`OAuth error: ${error} - ${errorDescription}`));
              return true;
            }
            if (!code) return false;
            logMCPDebug(serverName, "Received auth code via manual callback URL");
            cleanup();
            resolveOnce(code);
            return true;
          } catch {
            return false;
          }
        };
        Se = L;
        cliOwnedState.oauthCallbackSubmitters.set(serverName, L);
        options?.onWaitingForCallback?.(L, port, oauthState);
      }
      let Te = async () => {
        try {
          logMCPDebug(serverName, "Starting SDK auth");
          logMCPDebug(serverName, `Server URL: ${redactUrlSecrets(serverConfig.url)}`);
          let result = await auth(provider, {
            serverUrl: serverConfig.url,
            scope: wwwAuthParams.scope,
            resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
            fetchFn,
          });
          logMCPDebug(serverName, `Initial auth result: ${result}`);
          if (result !== "REDIRECT")
            logMCPDebug(serverName, `Unexpected auth result, expected REDIRECT: ${result}`);
        } catch (error) {
          logMCPDebug(serverName, `SDK auth error: ${describeSdkFetchError(error, serverConfig.url)}`);
          cleanup();
          rejectOnce(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `SDK auth failed: ${describeSdkFetchError(error, serverConfig.url)}`,
                "SDK auth failed",
              ),
              {
                cause: error,
              },
            ),
          );
        }
      };
      if (E) Te();
      else {
        server = createServer((req, res) => {
          let parsedUrl = parse(req.url || "", true);
          if (parsedUrl.pathname === "/callback") {
            let code = parsedUrl.query.code;
            let state = parsedUrl.query.state;
            let error = parsedUrl.query.error;
            let errorDescription = parsedUrl.query.error_description;
            let errorUri = parsedUrl.query.error_uri;
            if (state !== oauthState) {
              res.writeHead(400, {
                "Content-Type": "text/html",
              });
              res.end(
                callbackPageBody({
                  ok: false,
                  heading: "Authentication failed",
                  message: "Invalid state parameter. Close this tab and try again from Claude Code.",
                }),
              );
              return;
            }
            if (error) {
              res.writeHead(200, {
                "Content-Type": "text/html",
              });
              res.end(
                callbackPageBody({
                  ok: false,
                  heading: "Authentication failed",
                  message: "Close this tab and try again from Claude Code.",
                  detail: `${String(error)}: ${errorDescription ?? ""}`,
                }),
              );
              cleanup();
              let errorMessage = `OAuth error: ${error}`;
              if (errorDescription) errorMessage += ` - ${errorDescription}`;
              if (errorUri) errorMessage += ` (See: ${errorUri})`;
              rejectOnce(Error(errorMessage));
              return;
            }
            if (code) {
              res.writeHead(200, {
                "Content-Type": "text/html",
              });
              res.end(
                callbackPageBody({
                  ok: true,
                  heading: "Authentication successful",
                  message: "You can close this tab and return to Claude Code.",
                }),
              );
              cleanup();
              resolveOnce(code);
            }
          } else {
            res.writeHead(404, {
              "Content-Type": "text/html",
            });
            res.end(
              callbackPageBody({
                ok: false,
                heading: "Not found",
                message: `This is the Claude Code MCP OAuth callback listener. It only handles /callback. If your OAuth provider redirected here, the registered redirect_uri must be ${redactUrlSecrets(redirectUri)}.`,
              }),
            );
          }
        });
        server.on("error", (err) => {
          cleanup();
          if (err.code === "EADDRINUSE") {
            let findCmd =
              getPlatform() === "windows"
                ? `netstat -ano | findstr :${port}`
                : `lsof -ti:${port} -sTCP:LISTEN`;
            rejectOnce(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `OAuth callback port ${port} is already in use \u2014 another process may be holding it. ` +
                  `Run \`${findCmd}\` to find it.`,
                "OAuth callback port already in use",
              ),
            );
          } else
            rejectOnce(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `OAuth callback server failed: ${err.message}`,
                "OAuth callback server failed",
              ),
            );
        });
        server.listen(port, "127.0.0.1", () => void Te());
        server.unref();
      }
      timeoutId = setTimeout(
        (cleanup, rejectOnce) => {
          cleanup();
          rejectOnce(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "Authentication timeout",
              "Authentication timeout",
            ),
          );
        },
        300000,
        cleanup,
        rejectOnce,
      );
      timeoutId.unref();
    });
    authorizationCodeObtained = true;
    logMCPDebug(serverName, "Completing auth flow with authorization code");
    getPresentedCredentialLog().record(authorizationCode);
    let result = await auth(provider, {
      serverUrl: serverConfig.url,
      authorizationCode,
      resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
      fetchFn: wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch()),
    });
    logMCPDebug(serverName, `Auth result: ${result}`);
    if (result === "AUTHORIZED") {
      let savedTokens = await provider.tokens().catch(() => {
        return;
      });
      logMCPDebug(serverName, `Tokens after auth: ${savedTokens ? "Present" : "Missing"}`);
      if (savedTokens) logMCPDebug(serverName, `Token expires_in: ${savedTokens.expires_in}`);
      logEvent("tengu_mcp_oauth_flow_success", {
        flowAttemptId: sanitizeMarkName(flowAttemptId),
        transportType: fromEnum(serverConfig.type),
        ...F,
        ...(loggingSafeOrigin(serverConfig) && {
          mcpServerBaseUrl: loggingSafeOrigin(serverConfig),
        }),
      });
      logFeatureOk("mcp_oauth_flow");
    } else
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Unexpected auth result: " + result,
        "Unexpected auth result",
      );
  } catch (error) {
    logMCPDebug(
      serverName,
      `Error during auth completion: ${describeSdkFetchError(error, serverConfig.url)}`,
    );
    let reason = "unknown";
    let x;
    let B;
    let msg = errorMessage(error);
    let cause = error instanceof Error ? error.cause : undefined;
    if (error instanceof AuthenticationCancelledError) reason = "cancelled";
    else if (/AADSTS\d/.test(msg)) reason = "entra_specific";
    else if (/redirect[_ ]uri/i.test(msg)) reason = "redirect_uri_mismatch";
    else if (authorizationCodeObtained && (isZodError(error) || isZodError(cause)))
      reason = "token_response_schema_rejected";
    else if (authorizationCodeObtained) reason = "token_exchange_failed";
    else if (msg.includes("Authentication timeout")) reason = "timeout";
    else if (msg.includes("OAuth error:")) reason = "provider_denied";
    else if (
      msg.includes("already in use") ||
      msg.includes("EADDRINUSE") ||
      msg.includes("callback server failed") ||
      msg.includes("No available port")
    )
      reason = "port_unavailable";
    else if (msg.includes("SDK auth failed")) reason = classifySdkAuthFailure(msg, cause);
    let statusMatch = (cause instanceof Error ? cause : error instanceof Error ? error : null)?.message.match(
      /^HTTP (\d{3})\b/,
    );
    if (statusMatch) B = Number(statusMatch[1]);
    if (cause instanceof OAuthError) x = cause.errorCode;
    if (error instanceof OAuthError) {
      x = error.errorCode;
      if (error.errorCode === "invalid_client" || error.errorCode === "unauthorized_client") {
        let serverKey = getServerKey(serverName, serverConfig);
        try {
          await getSecureStorage().mutate((M) => {
            let D = M.mcpOAuth?.[serverKey];
            if (!D) return M;
            return {
              ...M,
              mcpOAuth: {
                ...M.mcpOAuth,
                [serverKey]: {
                  ...D,
                  clientId: undefined,
                  clientSecret: undefined,
                },
              },
            };
          });
        } catch (error) {
          logMCPDebug(serverName, `clear clientId failed: ${errorMessage(error)}`);
        }
      }
    }
    if (
      !/^OAuth error: access_denied(?: |$)/.test(msg) &&
      (reason === "timeout" || msg.includes("OAuth error:"))
    ) {
      let serverKey = getServerKey(serverName, serverConfig);
      await getSecureStorage()
        .mutate((M) => {
          let D = M.mcpOAuth?.[serverKey];
          if (!D?.clientId || D.accessToken || D.refreshToken || D.clientId !== cachedEntry?.clientId)
            return M;
          return {
            ...M,
            mcpOAuth: {
              ...M.mcpOAuth,
              [serverKey]: {
                ...D,
                clientId: undefined,
                clientSecret: undefined,
              },
            },
          };
        })
        .catch((error) => logMCPDebug(serverName, `drop clientId failed: ${errorMessage(error)}`));
    }
    if (reason !== "cancelled") logFeatureBad("mcp_oauth_flow", "mcp_oauth_flow_failed");
    logEvent("tengu_mcp_oauth_flow_error", {
      flowAttemptId: sanitizeMarkName(flowAttemptId),
      reason: fromEnum(reason),
      error_code: x === undefined ? undefined : sanitizeOAuthErrorCodeForAnalytics(x),
      http_status: fromNumberOpt(B),
      transportType: fromEnum(serverConfig.type),
      ...F,
      ...(loggingSafeOrigin(serverConfig) && {
        mcpServerBaseUrl: loggingSafeOrigin(serverConfig),
      }),
    });
    let serverKey = describeSdkFetchError(error, serverConfig.url);
    throw serverKey === errorMessage(error)
      ? error
      : Error(serverKey, {
          cause: error,
        });
  }
}
//@ chunk-1kaj6e83.js:30247-30776 facade-exports = wrapFetchWithStepUpDetection (0.428)
/**
 * wrapFetchWithAuthChallengeDetection（v1 副本）。
 */
function wrapFetchWithStepUpDetection(fetchFn, authProvider) {
  return async (url, init) => {
    let response = await fetchFn(url, init);
    if (response.status === 401 || response.status === 403) authProvider.sawAuthChallenge = true;
    authProvider.noteServerAnswer(
      url,
      response.status === 401 ||
        (response.status === 403 && extractWWWAuthenticateParams(response).error === "insufficient_scope"),
    );
    if (response.status === 401 || response.status === 403)
      authProvider.noteAuthRejection(url, response.status, new Headers(init?.headers).get("authorization"));
    if (!new Headers(init?.headers).has("authorization")) return response;
    if (response.status === 403) {
      let { error, scope } = extractWWWAuthenticateParams(response);
      if (error === "insufficient_scope" && scope) authProvider.markStepUpPending(scope);
    } else if (response.status === 401) authProvider.clearStepUpPending();
    return response;
  };
}
//@ chunk-1kaj6e83.js:30776-56066 facade-exports = ClaudeAuthProvider (0.728)
/**
 * ClaudeAuthProvider（v1）。
 */
class ClaudeAuthProvider {
  serverName;
  serverConfig;
  redirectUri;
  handleRedirection;
  _codeVerifier;
  _authorizationUrl;
  _state;
  _scopes;
  _metadata;
  _refreshInProgress;
  _pendingStepUpScope;
  _servedOverrideAuthorizationServerUrl;
  _servedOverrideDocuments = new WeakMap();
  _discoveredAuthorizationServer;
  _lastServedClientId;
  _lastServedAccessToken;
  _lastServedRefreshToken;
  _lastAuthRejection;
  _presented;
  onAuthorizationUrlCallback;
  skipBrowserOpen;
  constructor(
    serverName,
    serverConfig,
    redirectUri = buildRedirectUri(),
    handleRedirection = false,
    onAuthorizationUrl,
    skipBrowserOpen,
  ) {
    this.serverName = serverName;
    this.serverConfig = serverConfig;
    this.redirectUri = redirectUri;
    this.handleRedirection = handleRedirection;
    this.onAuthorizationUrlCallback = onAuthorizationUrl;
    this.skipBrowserOpen = skipBrowserOpen ?? false;
    this._presented = getPresentedCredentialLog();
  }
  get redirectUrl() {
    return this.redirectUri;
  }
  get authorizationUrl() {
    return this._authorizationUrl;
  }
  get clientMetadata() {
    let metadata = {
      client_name: `Claude Code (${this.serverName})`,
      redirect_uris: [this.redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
    let metadataScope = this.getCuratedMetadataScope();
    if (metadataScope) {
      metadata.scope = metadataScope;
      logMCPDebug(
        this.serverName,
        `Using scope from metadata: ${redactSensitiveUrlParams("scope", metadata.scope)}`,
      );
    }
    return metadata;
  }
  get clientMetadataUrl() {
    if (!isLoopbackCallbackUri(this.redirectUri)) {
      logMCPDebug(
        this.serverName,
        `redirectUri ${redactUrlSecrets(this.redirectUri)} is not the document's loopback /callback: withholding CIMD client_id \u2014 registering via DCR`,
      );
      return;
    }
    let override = getClientMetadataDocumentUrl();
    if (override !== MCP_CLIENT_METADATA_URL)
      logMCPDebug(this.serverName, `Using CIMD URL from env: ${override}`);
    return override;
  }
  setMetadata(metadata) {
    this._metadata = metadata;
  }
  getCuratedMetadataScope() {
    let scopeFromMetadata = getScopeFromMetadata(this._metadata);
    if (scopeFromMetadata !== undefined) return scopeFromMetadata;
    if (this.serverConfig.oauth?.authServerMetadataUrl && Array.isArray(this._metadata?.scopes_supported))
      return this._metadata.scopes_supported.join(" ");
    return;
  }
  markStepUpPending(scope) {
    this._pendingStepUpScope = scope;
    logMCPDebug(this.serverName, `Marked step-up pending: ${redactSensitiveUrlParams("scope", scope)}`);
  }
  get pendingStepUpScope() {
    return this._pendingStepUpScope;
  }
  get lastAuthRejection() {
    return this._lastAuthRejection;
  }
  noteAuthRejection(e, status, r) {
    let url = this.serverConfig.url;
    if (String(e) === (URL.canParse(url) ? new URL(url).href : url))
      this._lastAuthRejection = {
        status,
        accessToken: r?.startsWith("Bearer ") ? r.slice(7) : undefined,
      };
  }
  clearStepUpPending() {
    this._pendingStepUpScope = undefined;
  }
  clearStepUpPendingOnCredentialGone() {
    if (!this.handleRedirection) this.clearStepUpPending();
  }
  sawAuthChallenge = false;
  authChallengeOpen = false;
  noteServerAnswer(e, authChallengeOpen) {
    let url = this.serverConfig.url;
    if (String(e) === (URL.canParse(url) ? new URL(url).href : url))
      this.authChallengeOpen = authChallengeOpen;
  }
  registrationOfferedByDiscovery = false;
  async readCredentialStore() {
    let secureStorageForMcp = await readSecureStorageForMcp(
      this.handleRedirection
        ? undefined
        : {
            serverName: this.serverName,
            serverConfig: this.serverConfig,
            challenged: this.authChallengeOpen,
          },
    );
    if (secureStorageForMcp === READ_FAILED) {
      logMCPDebug(
        this.serverName,
        "Credential store could not be read (the login keychain may be locked); not reporting credentials as absent",
      );
      throw new McpCredentialStoreUnavailableError(this.serverName);
    }
    return secureStorageForMcp;
  }
  async state() {
    if (!this._state) {
      this._state = randomBytes(32).toString("base64url");
      logMCPDebug(this.serverName, "Generated new OAuth state");
    }
    return this._state;
  }
  async clientInformation() {
    let clientInformation = await this.resolveClientInformation();
    this._presented.record(clientInformation?.client_secret);
    this._presented.record(basicAuthValue(clientInformation?.client_id, clientInformation?.client_secret));
    return clientInformation;
  }
  async resolveClientInformation() {
    let data = await this.readCredentialStore();
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let clientSecret = data?.mcpOAuthClientConfig?.[serverKey]?.clientSecret;
    let clientId = this.serverConfig.oauth?.clientId;
    let s = data?.mcpOAuth?.[serverKey];
    let h =
      this.handleRedirection &&
      isClientMetadataDocumentId(s?.clientId) &&
      !isLoopbackCallbackUri(this.redirectUri);
    if (h) {
      logMCPDebug(
        this.serverName,
        `Stored client_id is the CIMD document URL (loopback /callback only); current redirectUri is ${redactUrlSecrets(this.redirectUri)} \u2014 ${clientId ? "serving the configured client" : "registering via DCR"} instead`,
      );
      if (clientId)
        await this.patchStoredClientEntry(
          serverKey,
          {
            clientId,
            clientSecret: undefined,
            redirectUri: this.redirectUri,
          },
          "stale CIMD client_id repair",
        );
    }
    if (s?.clientId && !h) {
      let redirectUri = s.redirectUri;
      if (
        this.handleRedirection &&
        (redirectUri
          ? extractHost(redirectUri) !== extractHost(this.redirectUri)
          : !this.redirectUri.startsWith("http://localhost"))
      ) {
        let S = redirectUri ? redactUrlSecrets(redirectUri) : "localhost";
        if (!clientId) {
          logMCPDebug(
            this.serverName,
            `Cached client_id was registered for ${S}; current redirectUri is ${redactUrlSecrets(this.redirectUri)} \u2014 forcing re-DCR`,
          );
          return;
        }
        if (s.clientId !== clientId) {
          logMCPDebug(
            this.serverName,
            `Stored client_id is stale and its redirectUri ${S} predates ${redactUrlSecrets(this.redirectUri)} \u2014 serving the configured client (no registration to redo)`,
          );
          await this.patchStoredClientEntry(
            serverKey,
            {
              clientId,
              clientSecret: undefined,
              redirectUri: this.redirectUri,
            },
            "stale client_id repair",
          );
          this._lastServedClientId = clientId;
          return {
            client_id: clientId,
            client_secret: clientSecret,
          };
        }
        logMCPDebug(
          this.serverName,
          `Stored redirectUri ${S} predates ${redactUrlSecrets(this.redirectUri)}, but the client_id is the configured one \u2014 serving it (no registration to redo)`,
        );
        await this.patchStoredClientEntry(
          serverKey,
          {
            redirectUri: this.redirectUri,
          },
          "stored redirectUri convergence",
        );
      }
      logMCPDebug(this.serverName, "Found client info");
      this._lastServedClientId = s.clientId;
      return {
        client_id: s.clientId,
        client_secret: s.clientSecret ?? (s.clientId === clientId ? clientSecret : undefined),
      };
    }
    if (clientId) {
      logMCPDebug(this.serverName, "Using pre-configured client ID");
      this._lastServedClientId = clientId;
      return {
        client_id: clientId,
        client_secret: clientSecret,
      };
    }
    if (
      !this.handleRedirection &&
      this.registrationOfferedByDiscovery &&
      !s?.accessToken &&
      !s?.refreshToken
    ) {
      logMCPDebug(
        this.serverName,
        "No client info found; deferring client registration to authentication time",
      );
      throw new McpClientRegistrationDeferredError(this.serverName);
    }
    logMCPDebug(this.serverName, "No client info found");
    return;
  }
  async patchStoredClientEntry(e, t, r) {
    try {
      if (
        !(
          await getSecureStorage().mutate((s) => {
            let h = s.mcpOAuth?.[e];
            if (!h) return s;
            return {
              ...s,
              mcpOAuth: {
                ...s.mcpOAuth,
                [e]: {
                  ...h,
                  ...t,
                },
              },
            };
          })
        )?.success
      )
        logMCPDebug(this.serverName, `${r} resolved unsuccessful`);
    } catch (error) {
      logMCPDebug(this.serverName, `${r} failed: ${errorMessage(error)}`);
    }
  }
  async saveClientInformation(clientInformation) {
    this._presented.record(clientInformation.client_secret);
    this._presented.record(basicAuthValue(clientInformation.client_id, clientInformation.client_secret));
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    try {
      if (
        (
          await getSecureStorage().mutate((existingData) => ({
            ...existingData,
            mcpOAuth: {
              ...existingData.mcpOAuth,
              [serverKey]: {
                ...existingData.mcpOAuth?.[serverKey],
                serverName: this.serverName,
                serverUrl: this.serverConfig.url,
                clientId: clientInformation.client_id,
                clientSecret: clientInformation.client_secret,
                redirectUri: this.redirectUri,
                accessToken: existingData.mcpOAuth?.[serverKey]?.accessToken || "",
                expiresAt: existingData.mcpOAuth?.[serverKey]?.expiresAt,
              },
            },
          }))
        )?.success
      )
        this._lastServedClientId = clientInformation.client_id;
      else logMCPDebug(this.serverName, "saveClientInformation persist resolved unsuccessful");
    } catch (error) {
      logMCPDebug(this.serverName, `saveClientInformation persist failed: ${errorMessage(error)}`);
    }
  }
  async tokens() {
    let credentialStore = await this.readCredentialStore();
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let tokenData = credentialStore?.mcpOAuth?.[serverKey];
    if (
      isXaaEnabled() &&
      this.serverConfig.oauth?.xaa &&
      !tokenData?.refreshToken &&
      (!tokenData?.accessToken ||
        (tokenData.expiresAt != null && (tokenData.expiresAt - Date.now()) / 1000 <= 300))
    ) {
      if (!this._refreshInProgress) {
        logMCPDebug(
          this.serverName,
          tokenData
            ? "XAA: access_token expiring, attempting silent exchange"
            : "XAA: no access_token yet, attempting silent exchange",
        );
        this._refreshInProgress = this.xaaRefresh().finally(() => {
          this._refreshInProgress = undefined;
        });
      }
      try {
        let _refreshInProgress = await this._refreshInProgress;
        if (_refreshInProgress) {
          this._lastServedAccessToken = _refreshInProgress.access_token;
          this._presented.record(_refreshInProgress.access_token);
          this._presented.record(_refreshInProgress.refresh_token);
          this._lastServedRefreshToken = _refreshInProgress.refresh_token ?? this._lastServedRefreshToken;
          return _refreshInProgress;
        }
      } catch (e) {
        logMCPDebug(this.serverName, `XAA silent exchange failed: ${errorMessage(e)}`);
      }
    }
    if (!tokenData) {
      logMCPDebug(this.serverName, "No token data found");
      this.clearStepUpPendingOnCredentialGone();
      return;
    }
    if (!tokenData.accessToken) {
      logMCPDebug(this.serverName, "No access token in storage");
      this.clearStepUpPendingOnCredentialGone();
      return;
    }
    if (isTokenRejected(serverKey, tokenData.accessToken)) {
      logMCPDebug(
        this.serverName,
        "Not sending the stored access token, because the server rejected it earlier in this session",
      );
      return;
    }
    this._lastServedAccessToken = tokenData.accessToken;
    this._presented.record(tokenData.accessToken);
    this._presented.record(tokenData.refreshToken);
    this._lastServedRefreshToken = tokenData.refreshToken;
    let expiresIn = tokenData.expiresAt != null ? (tokenData.expiresAt - Date.now()) / 1000 : undefined;
    let _pendingStepUpScope = this._pendingStepUpScope;
    let needsStepUp = _pendingStepUpScope !== undefined;
    if (needsStepUp)
      logMCPDebug(
        this.serverName,
        `Step-up pending (${redactSensitiveUrlParams("scope", _pendingStepUpScope)}), omitting refresh_token`,
      );
    if (expiresIn != null && expiresIn <= 0 && !tokenData.refreshToken) {
      logMCPDebug(this.serverName, "Token expired without refresh token");
      this.clearStepUpPendingOnCredentialGone();
      return;
    }
    if (expiresIn != null && expiresIn <= 300 && tokenData.refreshToken && !needsStepUp) {
      if (!this._refreshInProgress) {
        logMCPDebug(
          this.serverName,
          `Token expires in ${Math.floor(expiresIn)}s, attempting proactive refresh`,
        );
        this._refreshInProgress = this.refreshAuthorization(tokenData.refreshToken).finally(() => {
          this._refreshInProgress = undefined;
        });
      } else logMCPDebug(this.serverName, "Token refresh already in progress, reusing existing promise");
      try {
        let _refreshInProgress = await this._refreshInProgress;
        if (_refreshInProgress) {
          logMCPDebug(this.serverName, "Token refreshed successfully");
          this._lastServedAccessToken = _refreshInProgress.access_token;
          this._presented.record(_refreshInProgress.access_token);
          this._presented.record(_refreshInProgress.refresh_token);
          this._lastServedRefreshToken = _refreshInProgress.refresh_token ?? this._lastServedRefreshToken;
          return _refreshInProgress;
        }
        logMCPDebug(this.serverName, "Token refresh failed, returning current tokens");
      } catch (error) {
        logMCPDebug(
          this.serverName,
          `Token refresh error: ${describeSdkFetchError(error, this.serverConfig.url)}`,
        );
      }
    }
    let tokens = {
      access_token: tokenData.accessToken,
      refresh_token: needsStepUp ? undefined : tokenData.refreshToken,
      expires_in: expiresIn,
      scope: tokenData.scope,
      token_type: "Bearer",
    };
    logMCPDebug(this.serverName, "Returning tokens");
    logMCPDebug(this.serverName, `Has refresh token: ${!!tokens.refresh_token}`);
    logMCPDebug(
      this.serverName,
      expiresIn != null ? `Expires in: ${Math.floor(expiresIn)}s` : "No expiration specified",
    );
    return tokens;
  }
  async saveTokens(tokens) {
    this._presented.record(tokens.access_token);
    this._presented.record(tokens.refresh_token);
    if (this.handleRedirection) this._pendingStepUpScope = undefined;
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    logMCPDebug(this.serverName, "Saving tokens");
    logMCPDebug(this.serverName, `Token expires in: ${tokens.expires_in}`);
    logMCPDebug(this.serverName, `Has refresh token: ${!!tokens.refresh_token}`);
    let signIn =
      this._servedOverrideAuthorizationServerUrl === undefined
        ? this._discoveredAuthorizationServer
        : {
            authorizationServerUrl: this._servedOverrideAuthorizationServerUrl,
            oauthMetadataFound: true,
          };
    let servedMetadataUrl =
      this.servedMetadataUrl() ?? this._discoveredAuthorizationServer?.servedMetadataUrl;
    let s;
    let h;
    try {
      s = await getSecureStorage().mutate((l) => ({
        ...l,
        mcpOAuth: {
          ...l.mcpOAuth,
          [serverKey]: {
            ...l.mcpOAuth?.[serverKey],
            serverName: this.serverName,
            serverUrl: this.serverConfig.url,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? l.mcpOAuth?.[serverKey]?.refreshToken,
            expiresAt: tokens.expires_in != null ? Date.now() + tokens.expires_in * 1000 : undefined,
            scope: tokens.scope,
            discoveryState: withoutTokenlessRejection(
              mergeSignInAuth({
                previous: l.mcpOAuth?.[serverKey]?.discoveryState,
                signIn,
                servedMetadataUrl,
                interactiveSignIn: this.handleRedirection,
              }),
            ),
          },
        },
      }));
    } catch (error) {
      h = error;
    }
    if (s?.success) {
      this._lastServedAccessToken = tokens.access_token;
      this._lastServedRefreshToken = tokens.refresh_token ?? this._lastServedRefreshToken;
      recordSavedAccessToken(serverKey, tokens.access_token);
    }
    this.logTokenPersistFailed(s, h);
  }
  logTokenPersistFailed(e, t) {
    logStorageWriteFailure(this.serverName, this.serverConfig, e, t);
  }
  async xaaRefresh() {
    let idp = getXaaIdpSettings();
    if (!idp) return;
    let idToken = await getCachedIdpIdToken(idp.issuer);
    if (!idToken) {
      logMCPDebug(this.serverName, "XAA: id_token not cached, needs interactive re-auth");
      return;
    }
    let clientId = this.serverConfig.oauth?.clientId;
    let clientConfig = await getMcpClientConfig(this.serverName, this.serverConfig);
    if (!clientId || !clientConfig?.clientSecret) {
      logMCPDebug(
        this.serverName,
        "XAA: missing clientId or clientSecret in config \u2014 skipping silent refresh",
      );
      return;
    }
    let s = await hasStoredOAuthState(this.serverName, this.serverConfig);
    if (s === READ_FAILED) {
      logMCPDebug(this.serverName, "XAA: stored credentials unreadable");
      return;
    }
    let h = s
      ? undefined
      : await getSecureStorage().readAsyncStrict?.(undefined, {
          inaccessibleAs: "failure",
        });
    if (h === READ_FAILED) {
      logMCPDebug(this.serverName, "XAA: no pin and the keychain is unreadable");
      return;
    }
    let pinnedAuthorizationServer =
      s ?? xaaPinnedServer(h?.mcpOAuth?.[getServerKey(this.serverName, this.serverConfig)]?.discoveryState);
    let idpClientSecret = await getIdpClientSecret(idp.issuer);
    let oidc;
    try {
      oidc = await discoverOidc(idp.issuer);
    } catch (e) {
      logMCPDebug(this.serverName, `XAA: OIDC discovery failed in silent refresh: ${errorMessage(e)}`);
      return;
    }
    this._presented.record(clientConfig.clientSecret);
    try {
      let tokens = await performCrossAppAccess_2(
        this.serverConfig.url,
        {
          clientId,
          clientSecret: clientConfig.clientSecret,
          idpClientId: idp.clientId,
          idpClientSecret,
          idpIdToken: idToken,
          idpTokenEndpoint: oidc.token_endpoint,
          pinnedAuthorizationServer,
        },
        this.serverName,
      );
      let serverKey = getServerKey(this.serverName, this.serverConfig);
      let U;
      let w;
      try {
        U = await getSecureStorage().mutate((existingData) => {
          let prev = existingData.mcpOAuth?.[serverKey];
          return {
            ...existingData,
            mcpOAuth: {
              ...existingData.mcpOAuth,
              [serverKey]: {
                ...prev,
                serverName: this.serverName,
                serverUrl: this.serverConfig.url,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? prev?.refreshToken,
                expiresAt: tokens.expires_in != null ? Date.now() + tokens.expires_in * 1000 : undefined,
                scope: tokens.scope,
                clientId,
                clientSecret: clientConfig.clientSecret,
                discoveryState: pinXaaAuth({
                  previous: prev?.discoveryState,
                  issuedBy: tokens.authorizationServerUrl,
                  interactiveSignIn: false,
                }),
              },
            },
          };
        });
      } catch (error) {
        w = error;
      }
      this.logTokenPersistFailed(U, w);
      return {
        access_token: tokens.access_token,
        token_type: "Bearer",
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        refresh_token: tokens.refresh_token,
      };
    } catch (e) {
      if (e instanceof XaaTokenExchangeError && e.shouldClearIdToken) {
        await clearIdpIdToken(idp.issuer);
        logMCPDebug(this.serverName, "XAA: cleared id_token after exchange failure");
      }
      throw e;
    }
  }
  async redirectToAuthorization(e) {
    let t = this._pendingStepUpScope
      ? undefined
      : this.serverConfig.oauth?.scopes ||
        (this.serverConfig.oauth?.authServerMetadataUrl ? this.getCuratedMetadataScope() : undefined);
    let r = e.searchParams.get("scope");
    let n = t ?? r;
    if (n !== r)
      logMCPDebug(
        this.serverName,
        `Overrode authorization scope from ${r ? redactSensitiveUrlParams("scope", r) : "NONE"} to configured: ${n ? redactSensitiveUrlParams("scope", n) : "NONE"}`,
      );
    let s = n === null ? null : maybeAppendOfflineAccess(n, this._metadata);
    if (s !== null && s !== r) {
      e.searchParams.set("scope", s);
      if (s !== t) logMCPDebug(this.serverName, "Appended offline_access to authorization scope");
    }
    let h = isEntraLoginUrl(e);
    let all = e.searchParams.getAll("prompt");
    let S = h ? all.filter((O) => O !== "consent") : all;
    if (S.length !== all.length || S.length > 1) {
      e.searchParams.delete("prompt");
      if (S.length > 0) e.searchParams.set("prompt", S.includes("consent") ? "consent" : S.at(-1));
    }
    this._authorizationUrl = e.toString();
    let scopes = e.searchParams.get("scope");
    logMCPDebug(this.serverName, `Authorization URL: ${authorizationUrlForDebugLog(e)}`);
    logMCPDebug(
      this.serverName,
      `Scopes in URL: ${scopes ? redactSensitiveUrlParams("scope", scopes) : "NOT FOUND"}`,
    );
    if (scopes) {
      this._scopes = scopes;
      logMCPDebug(
        this.serverName,
        `Captured scopes from authorization URL: ${redactSensitiveUrlParams("scope", scopes)}`,
      );
    } else {
      let metadataScope = this.getCuratedMetadataScope();
      if (metadataScope) {
        this._scopes = metadataScope;
        logMCPDebug(
          this.serverName,
          `Using scopes from metadata: ${redactSensitiveUrlParams("scope", metadataScope)}`,
        );
      } else logMCPDebug(this.serverName, "No scopes available from URL or metadata");
    }
    if (this._scopes && !this.handleRedirection && this._pendingStepUpScope) {
      let serverKey = getServerKey(this.serverName, this.serverConfig);
      let _scopes = this._scopes;
      let P = false;
      try {
        await getSecureStorage().mutate((T) => {
          let E = T.mcpOAuth?.[serverKey];
          if (!E) return T;
          P = true;
          return {
            ...T,
            mcpOAuth: {
              ...T.mcpOAuth,
              [serverKey]: {
                ...E,
                stepUpScope: _scopes,
              },
            },
          };
        });
      } catch (error) {
        logMCPDebug(this.serverName, `step-up scope persist failed: ${errorMessage(error)}`);
      }
      if (P)
        logMCPDebug(
          this.serverName,
          `Persisted step-up scope: ${redactSensitiveUrlParams("scope", _scopes)}`,
        );
    }
    if (!this.handleRedirection) {
      logMCPDebug(this.serverName, "Redirection handling is disabled, skipping redirect");
      return;
    }
    let urlString = e.toString();
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://"))
      throw Error("Invalid authorization URL: must use http:// or https:// scheme");
    logMCPDebug(this.serverName, "Redirecting to authorization URL");
    let redactedUrl = authorizationUrlForDebugLog(e);
    logMCPDebug(this.serverName, `Authorization URL: ${redactedUrl}`);
    if (this.onAuthorizationUrlCallback) this.onAuthorizationUrlCallback(urlString);
    if (this.skipBrowserOpen) {
      logMCPDebug(this.serverName, `Skipping browser open (skipBrowserOpen=true). URL: ${redactedUrl}`);
      return;
    }
    let U = isBrowserUnavailable();
    if (U) logMCPDebug(this.serverName, `Skipping browser open (headless environment). URL: ${redactedUrl}`);
    else logMCPDebug(this.serverName, `Opening authorization URL: ${redactedUrl}`);
    let w = U ? false : await openValidatedUrlSucceeded(urlString);
    logEvent("tengu_mcp_oauth_browser_open", {
      success: w,
      headless: U,
      platform: fromEnum(getPlatform()),
    });
    if (!U && !w) logMCPDebug(this.serverName, "Browser didn't open automatically. URL is shown in UI.");
  }
  async saveCodeVerifier(codeVerifier) {
    logMCPDebug(this.serverName, "Saving code verifier");
    this._codeVerifier = codeVerifier;
  }
  async codeVerifier() {
    if (!this._codeVerifier) {
      logMCPDebug(this.serverName, "No code verifier saved");
      throw Error("No code verifier saved");
    }
    logMCPDebug(this.serverName, "Returning code verifier");
    this._presented.record(this._codeVerifier);
    return this._codeVerifier;
  }
  async invalidateCredentials(e) {
    if (e === "verifier") {
      this._codeVerifier = undefined;
      logMCPDebug(this.serverName, "Invalidated credentials (scope: verifier)");
      return;
    }
    let t = e;
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let n = false;
    try {
      let _lastServedClientId = this._lastServedClientId;
      let _lastServedAccessToken = this._lastServedAccessToken;
      let _lastServedRefreshToken = this._lastServedRefreshToken;
      await getSecureStorage().mutate((S) => {
        let v = S.mcpOAuth?.[serverKey];
        if (!v) return S;
        let A = {
          ...S.mcpOAuth,
        };
        switch (t) {
          case "all": {
            let y =
              _lastServedAccessToken != null && !!v.accessToken && v.accessToken !== _lastServedAccessToken;
            let U = _lastServedClientId != null && v.clientId != null && v.clientId !== _lastServedClientId;
            if (y || U) {
              logMCPDebug(
                this.serverName,
                `invalidateCredentials('all') preserved: ${y ? "foreign token" : "concurrent re-registration"}`,
              );
              return S;
            }
            if (!v.clientId && !v.refreshToken && v.accessToken === "") return S;
            A[serverKey] = {
              serverName: v.serverName,
              serverUrl: v.serverUrl,
              accessToken: "",
              ...(v.discoveryState && {
                discoveryState: v.discoveryState,
              }),
              ...(v.stepUpScope && {
                stepUpScope: v.stepUpScope,
              }),
            };
            break;
          }
          case "client":
            A[serverKey] = {
              ...v,
              clientId: undefined,
              clientSecret: undefined,
            };
            break;
          case "tokens": {
            if (
              (_lastServedRefreshToken != null &&
                v.refreshToken &&
                v.refreshToken !== _lastServedRefreshToken) ||
              (_lastServedAccessToken != null && !!v.accessToken && v.accessToken !== _lastServedAccessToken)
            ) {
              logMCPDebug(this.serverName, "invalidateCredentials('tokens') preserved: concurrent rotation");
              return S;
            }
            A[serverKey] = {
              ...v,
              accessToken: "",
              refreshToken: undefined,
              expiresAt: 0,
            };
            break;
          }
          case "discovery":
            A[serverKey] = {
              ...v,
              discoveryState: v.discoveryState && authDiscoveryState(v.discoveryState),
              stepUpScope: undefined,
            };
            break;
        }
        n = true;
        return {
          ...S,
          mcpOAuth: A,
        };
      });
    } catch (error) {
      logMCPDebug(this.serverName, `invalidateCredentials persist failed: ${errorMessage(error)}`);
    }
    if (n) logMCPDebug(this.serverName, `Invalidated credentials (scope: ${e})`);
  }
  async saveDiscoveryState(e) {
    if (this.serverConfig.oauth?.xaa) return;
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    logMCPDebug(
      this.serverName,
      `Saving discovery state (authServer: ${redactUrlSecrets(e.authorizationServerUrl)})`,
    );
    let authorizationServerMetadata = e.authorizationServerMetadata;
    this.registrationOfferedByDiscovery =
      authorizationServerMetadata !== undefined &&
      (typeof authorizationServerMetadata.registration_endpoint === "string" ||
        (authorizationServerMetadata.client_id_metadata_document_supported === true &&
          this.clientMetadataUrl !== undefined));
    let n = {
      authorizationServerUrl: e.authorizationServerUrl,
      oauthMetadataFound: !!e.authorizationServerMetadata,
    };
    let servedMetadataUrl =
      (e.authorizationServerMetadata !== undefined
        ? this._servedOverrideDocuments.get(e.authorizationServerMetadata)
        : undefined) ?? this.servedMetadataUrl();
    this._discoveredAuthorizationServer = {
      ...n,
      servedMetadataUrl,
    };
    try {
      await getSecureStorage().mutate((h) => {
        let l = mergeDiscoveredAuth({
          previous: h.mcpOAuth?.[serverKey]?.discoveryState,
          discovered: n,
          servedMetadataUrl,
        });
        return {
          ...h,
          mcpOAuth: {
            ...h.mcpOAuth,
            [serverKey]: {
              ...h.mcpOAuth?.[serverKey],
              serverName: this.serverName,
              serverUrl: this.serverConfig.url,
              accessToken: h.mcpOAuth?.[serverKey]?.accessToken || "",
              expiresAt: h.mcpOAuth?.[serverKey]?.expiresAt,
              discoveryState: {
                ...l,
                resourceMetadataUrl: e.resourceMetadataUrl,
                tokenlessRejectedAt: tokenlessRejectedAt(serverKey, h.mcpOAuth?.[serverKey]),
                registrationNotOfferedAt:
                  authorizationServerMetadata === undefined
                    ? h.mcpOAuth?.[serverKey]?.discoveryState?.registrationNotOfferedAt
                    : typeof authorizationServerMetadata.registration_endpoint !== "string" &&
                        authorizationServerMetadata.client_id_metadata_document_supported !== true
                      ? Date.now()
                      : undefined,
              },
            },
          },
        };
      });
    } catch (error) {
      logMCPDebug(this.serverName, `saveDiscoveryState persist failed: ${errorMessage(error)}`);
    }
  }
  servedMetadataUrl() {
    return this._servedOverrideAuthorizationServerUrl === undefined
      ? undefined
      : this.serverConfig.oauth?.authServerMetadataUrl;
  }
  async discoveryState() {
    this._servedOverrideAuthorizationServerUrl = undefined;
    let authServerMetadataUrl = this.serverConfig.oauth?.authServerMetadataUrl;
    if (this.authChallengeOpen) await this.readCredentialStore();
    let t = await hasStoredOAuthState(this.serverName, this.serverConfig);
    if (t === READ_FAILED) {
      if (this.serverConfig.oauth?.xaa) throw new McpCredentialStoreUnavailableError(this.serverName);
    } else if (t)
      return {
        authorizationServerUrl: t,
      };
    if (authServerMetadataUrl) {
      logMCPDebug(
        this.serverName,
        `Fetching metadata from configured URL: ${redactUrlSecrets(authServerMetadataUrl)}`,
      );
      try {
        let authServerMetadata = await fetchAuthServerMetadata_2(this.serverName, this.serverConfig.url, {
          configuredMetadataUrl: authServerMetadataUrl,
          fetchFn: wrapFetchWithHeaders(this.serverName, this.serverConfig, createAuthFetch()),
        });
        if (authServerMetadata) {
          this._servedOverrideAuthorizationServerUrl = authServerMetadata.issuer;
          this._servedOverrideDocuments.set(authServerMetadata, authServerMetadataUrl);
          return {
            authorizationServerUrl: authServerMetadata.issuer,
            authorizationServerMetadata: authServerMetadata,
          };
        }
      } catch (error) {
        logMCPDebug(
          this.serverName,
          `Failed to fetch from configured metadata URL: ${describeSdkFetchError(error, this.serverConfig.url)}`,
        );
      }
      return;
    }
    let async = await getSecureStorage().readAsync();
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let cached = async?.mcpOAuth?.[serverKey]?.discoveryState;
    if (cached?.authorizationServerUrl) {
      logMCPDebug(
        this.serverName,
        `Returning cached discovery state (authServer: ${redactUrlSecrets(cached.authorizationServerUrl)})`,
      );
      return {
        authorizationServerUrl: cached.authorizationServerUrl,
        resourceMetadataUrl: cached.resourceMetadataUrl,
        resourceMetadata: cached.resourceMetadata,
        authorizationServerMetadata: cached.authorizationServerMetadata,
      };
    }
    return;
  }
  async refreshAuthorization(refreshToken) {
    if (isDiskless()) {
      logMCPDebug(this.serverName, "claude-code-server session; skipping refresh");
      return;
    }
    let serverKey = getServerKey(this.serverName, this.serverConfig);
    let claudeDir = getProjectDirsUpToHome();
    await getFsImplementation().mkdir(claudeDir);
    let sanitizedKey = serverKey.replace(/[^a-zA-Z0-9]/g, "_");
    let lockfilePath = join(claudeDir, `mcp-refresh-${sanitizedKey}.lock`);
    let release;
    for (let retry = 0; retry < MAX_METADATA_REDIRECTS; retry++)
      try {
        logMCPDebug(this.serverName, `Acquiring refresh lock (attempt ${retry + 1})`);
        release = await lock(lockfilePath, {
          realpath: false,
          stale: 60000,
          update: 5000,
          onCompromised: () => {
            logMCPDebug(this.serverName, "Refresh lock was compromised");
          },
        });
        logMCPDebug(this.serverName, "Acquired refresh lock");
        break;
      } catch (e) {
        let code = getErrnoCode(e);
        if (code === "ELOCKED") {
          logMCPDebug(
            this.serverName,
            `Refresh lock held by another process, waiting (attempt ${retry + 1}/${MAX_METADATA_REDIRECTS})`,
          );
          await sleep(1000 + Math.random() * 1000);
          continue;
        }
        logMCPDebug(this.serverName, `Failed to acquire refresh lock: ${code}; skipping refresh`);
        return;
      }
    if (!release) {
      logMCPDebug(
        this.serverName,
        `Could not acquire refresh lock after ${MAX_METADATA_REDIRECTS} retries; skipping refresh`,
      );
      return;
    }
    try {
      clearKeychainCache();
      let v = (await getSecureStorage().readAsync())?.mcpOAuth?.[serverKey];
      if (v) {
        let A = v.expiresAt != null ? (v.expiresAt - Date.now()) / 1000 : undefined;
        if (v.accessToken && (A == null || A > 300)) {
          logMCPDebug(
            this.serverName,
            A != null
              ? `Another process already refreshed tokens (expires in ${Math.floor(A)}s)`
              : "Another process already refreshed tokens (no expiration)",
          );
          return {
            access_token: v.accessToken,
            refresh_token: v.refreshToken,
            expires_in: A,
            scope: v.scope,
            token_type: "Bearer",
          };
        }
        if (v.refreshToken) {
          refreshToken = v.refreshToken;
          this._lastServedRefreshToken = v.refreshToken;
          this._presented.record(v.refreshToken);
        }
      }
      return await this._doRefresh(refreshToken);
    } finally {
      if (release)
        try {
          await release();
          logMCPDebug(this.serverName, "Released refresh lock");
        } catch {
          logMCPDebug(this.serverName, "Failed to release refresh lock");
        }
    }
  }
  async readConcurrentRefreshWinner() {
    clearKeychainCache();
    let t = (await getSecureStorage().readAsync())?.mcpOAuth?.[
      getServerKey(this.serverName, this.serverConfig)
    ];
    let r = t?.expiresAt != null ? (t.expiresAt - Date.now()) / 1000 : undefined;
    if (t?.accessToken && (r == null || r > 300)) {
      logMCPDebug(this.serverName, "Another process landed fresh tokens; using those");
      let freshTokens = {
        access_token: t.accessToken,
        refresh_token: t.refreshToken,
        expires_in: r,
        scope: t.scope,
        token_type: "Bearer",
      };
      return {
        tokenData: t,
        freshTokens,
      };
    }
    return {
      tokenData: t,
      freshTokens: undefined,
    };
  }
  async _doRefresh(refreshToken) {
    this._presented.record(refreshToken);
    let MAX_ATTEMPTS = 3;
    let mcpServerBaseUrl = loggingSafeOrigin(this.serverConfig);
    let emitRefreshEvent = (outcome, reason) => {
      logEvent(
        outcome === "success" ? "tengu_mcp_oauth_refresh_success" : "tengu_mcp_oauth_refresh_failure",
        {
          transportType: fromEnum(this.serverConfig.type),
          ...(mcpServerBaseUrl && {
            mcpServerBaseUrl,
          }),
          ...(reason && {
            reason: fromEnum(reason),
          }),
        },
      );
    };
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let h;
      try {
        logMCPDebug(this.serverName, "Starting token refresh");
        let authFetch = wrapFetchWithHeaders(this.serverName, this.serverConfig, createAuthFetch());
        let metadata = this._metadata;
        if (!metadata) {
          let cached = await this.discoveryState();
          if (cached?.authorizationServerMetadata) metadata = cached.authorizationServerMetadata;
          else if (cached?.authorizationServerUrl) {
            logMCPDebug(
              this.serverName,
              `Re-discovering metadata from persisted auth server URL: ${redactUrlSecrets(cached.authorizationServerUrl)}`,
            );
            metadata = await discoverAuthorizationServerMetadata(cached.authorizationServerUrl, {
              fetchFn: authFetch,
            });
          }
        }
        if (
          !metadata &&
          !this.serverConfig.oauth?.xaa &&
          (await hasStoredOAuthState(this.serverName, this.serverConfig)) === undefined
        )
          metadata = await fetchAuthServerMetadata_2(this.serverName, this.serverConfig.url, {
            configuredMetadataUrl: this.serverConfig.oauth?.authServerMetadataUrl,
            fetchFn: authFetch,
          });
        if (!metadata) {
          logMCPDebug(this.serverName, "Failed to discover OAuth metadata");
          emitRefreshEvent("failure", "metadata_discovery_failed");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_metadata_failed");
          return;
        }
        this._metadata = metadata;
        h = await this.clientInformation();
        if (!h) {
          logMCPDebug(this.serverName, "No client information available");
          emitRefreshEvent("failure", "no_client_info");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_no_client_info");
          return;
        }
        let newTokens = await refreshAuthorization(new URL(this.serverConfig.url), {
          metadata,
          clientInformation: h,
          refreshToken,
          resource: new URL(this.serverConfig.url),
          fetchFn: authFetch,
        });
        if (newTokens) {
          logMCPDebug(this.serverName, "Token refresh successful");
          await this.saveTokens(newTokens);
          emitRefreshEvent("success");
          logFeatureOk("mcp_oauth_refresh");
          return newTokens;
        }
        logMCPDebug(this.serverName, "Token refresh returned no tokens");
        emitRefreshEvent("failure", "no_tokens_returned");
        logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_no_tokens");
        return;
      } catch (error) {
        if (error instanceof InvalidGrantError) {
          logMCPDebug(this.serverName, `Token refresh failed with invalid_grant: ${error.message}`);
          let { freshTokens } = await this.readConcurrentRefreshWinner();
          if (freshTokens) {
            logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_winner");
            return freshTokens;
          }
          logMCPDebug(this.serverName, "No valid tokens in storage, clearing stored tokens");
          emitRefreshEvent("failure", "invalid_grant");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_invalid_grant");
          await this.invalidateCredentials("tokens");
          AUTH_LOST_SIGNAL.emit(this.serverName);
          return;
        }
        if (
          error instanceof OAuthError &&
          (error.errorCode === "invalid_client" || error.errorCode === "unauthorized_client")
        ) {
          logMCPDebug(
            this.serverName,
            "Token refresh failed: DCR client expired or invalid; clearing stored client registration",
          );
          let { tokenData, freshTokens } = await this.readConcurrentRefreshWinner();
          if (freshTokens) {
            logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_winner");
            return freshTokens;
          }
          if (tokenData?.clientId && h && tokenData.clientId !== h.client_id) {
            logMCPDebug(this.serverName, "Another process re-registered client; preserving");
            emitRefreshEvent("failure", "concurrent_reregister");
            logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_reregister");
            return;
          }
          emitRefreshEvent(
            "failure",
            error.errorCode === "unauthorized_client" ? "unauthorized_client" : "invalid_client",
          );
          logFeatureBad(
            "mcp_oauth_refresh",
            error.errorCode === "unauthorized_client"
              ? "mcp_oauth_refresh_unauthorized_client"
              : "mcp_oauth_refresh_invalid_client",
          );
          await this.invalidateCredentials("all");
          AUTH_LOST_SIGNAL.emit(this.serverName);
          return;
        }
        if (isZodError(error)) {
          logMCPDebug(
            this.serverName,
            `Token refresh failed: token response rejected by SDK schema: ${errorMessage(error)}`,
          );
          emitRefreshEvent("failure", "token_response_schema_rejected");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_token_response_schema_rejected");
          return;
        }
        let S = error instanceof McpCredentialStoreUnavailableError;
        let v = error instanceof Error && /timeout|timed out|etimedout|econnreset/i.test(error.message);
        let isTransientServerError =
          error instanceof ServerError ||
          error instanceof TemporarilyUnavailableError ||
          error instanceof TooManyRequestsError;
        let isRetryable = v || isTransientServerError || S;
        if (!isRetryable || attempt >= MAX_ATTEMPTS) {
          logMCPDebug(
            this.serverName,
            `Token refresh failed: ${describeSdkFetchError(error, this.serverConfig.url)}`,
          );
          emitRefreshEvent("failure", isRetryable ? "transient_retries_exhausted" : "request_failed");
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_request_failed");
          return;
        }
        let delayMs = 1000 * Math.pow(2, attempt - 1);
        logMCPDebug(
          this.serverName,
          `Token refresh failed, retrying in ${delayMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})`,
        );
        await sleep(delayMs);
      }
    }
    return;
  }
}
//@ chunk-1kaj6e83.js:56066-56725 facade-exports = readClientSecret (1)
/**
 * readClientSecret（v1）。
 */
async function readClientSecret() {
  let envSecret = process.env.MCP_CLIENT_SECRET;
  if (envSecret) return envSecret;
  if (!process.stdin.isTTY)
    throw Error("No TTY available to prompt for client secret. Set MCP_CLIENT_SECRET env var instead.");
  return new Promise((resolve, reject) => {
    process.stderr.write("Enter OAuth client secret: ");
    process.stdin.setRawMode?.(true);
    let secret = "";
    let onData = (ch) => {
      let str = ch.toString();
      if (
        str ===
          `
` ||
        str === "\r"
      ) {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener("data", onData);
        process.stderr.write(`
`);
        resolve(secret);
      } else if (str === "\x03") {
        process.stdin.setRawMode?.(false);
        process.stdin.removeListener("data", onData);
        reject(Error("Cancelled"));
      } else if (str === "\x7F" || str === "\b") secret = secret.slice(0, -1);
      else secret += str;
    };
    process.stdin.on("data", onData);
  });
}
//@ chunk-1kaj6e83.js:56725-56921 facade-exports = saveMcpClientSecret (0.631)
/**
 * saveMcpClientSecret（v1）。
 */
async function saveMcpClientSecret(serverName, serverConfig, clientSecret) {
  let serverKey = getServerKey(serverName, serverConfig);
  try {
    return await getSecureStorage().mutate((existingData) => ({
      ...existingData,
      mcpOAuthClientConfig: {
        ...existingData.mcpOAuthClientConfig,
        [serverKey]: {
          clientSecret,
        },
      },
    }));
  } catch (error) {
    return {
      success: false,
      warning: errorMessage(error),
    };
  }
}
//@ chunk-1kaj6e83.js:56921-57109 facade-exports = getMcpClientConfig (0.711)
/**
 * getMcpClientConfig（v1）：读 mcpOAuthClientConfig[serverKey]。
 */
async function clearMcpClientConfig(serverName, serverConfig) {
  let serverKey = getServerKey(serverName, serverConfig);
  await getSecureStorage().mutate((n) => {
    if (!n.mcpOAuthClientConfig?.[serverKey]) return n;
    let s = {
      ...n.mcpOAuthClientConfig,
    };
    delete s[serverKey];
    return {
      ...n,
      mcpOAuthClientConfig: s,
    };
  });
}
//@ chunk-1kaj6e83.js:57109-57208 facade-exports
/**
 * 从安全存储读取某服务器的 OAuth 客户端配置。（v1 副本）
 */
async function getMcpClientConfig(serverName, serverConfig) {
  let async = await getSecureStorage().readAsync();
  let serverKey = getServerKey(serverName, serverConfig);
  return async?.mcpOAuthClientConfig?.[serverKey];
}
//@ chunk-1kaj6e83.js:57208-57381 fingerprint = getScopeFromMetadata (0.903)
function getScopeFromMetadata(metadata) {
  if (!metadata) return;
  if ("scope" in metadata && typeof metadata.scope === "string") return metadata.scope;
  if ("default_scope" in metadata && typeof metadata.default_scope === "string")
    return metadata.default_scope;
  return;
}
//@ chunk-1kaj6e83.js:57381-57577 facade-exports
/**
 * shouldRequestOfflineAccess（v1 副本）。
 */
function maybeAppendOfflineAccess(e, t) {
  if (e !== null && e.split(" ").includes("offline_access")) return e;
  if (!t?.scopes_supported?.includes("offline_access")) return e;
  return e === null ? "offline_access" : `${e} offline_access`;
}
//@ chunk-1kaj6e83.js:57577-57739 layout
var ENTRA_LOGIN_HOSTS_V1 = [
  "login.microsoftonline.com",
  "login.microsoftonline.us",
  "login.partner.microsoftonline.cn",
  "login.chinacloudapi.cn",
];
var ENTRA_LOGIN_HOST_SUFFIXES_V1 = [".b2clogin.com", ".ciamlogin.com"];
//@ chunk-1kaj6e83.js:57739-57876 facade-exports
/**
 * 判断 URL 是否是 Microsoft Entra 登录域。（v1 副本）
 */
function isEntraLoginUrl(e) {
  try {
    let hostname = (typeof e === "string" ? new URL(e) : e).hostname;
    return (
      ENTRA_LOGIN_HOSTS_V1.includes(hostname) ||
      ENTRA_LOGIN_HOST_SUFFIXES_V1.some((r) => hostname.endsWith(r))
    );
  } catch {
    return false;
  }
}
//@ chunk-yqnmafqp.js:338-346 placement
/**
 * 授权服务器发现的最大尝试次数（8）。
 */
var MAX_DISCOVERY_ATTEMPTS = 8;
//@ chunk-yqnmafqp.js:346-376 placement
/**
 * 匹配版本号样式的正则。
 */
var VERSION_STRING_RE = /^v?\d+(?:[._-]\d+)*$/i;
//@ chunk-yqnmafqp.js:376-557 placement
/**
 * scope 记号格式正则。
 */
var regExp = new RegExp("^[A-Za-z0-9._~+/=%-]+$");
var regExp_2 = new RegExp("[^A-Za-z0-9._~+/=%-]+");
var SCOPE_TOKEN_RE =
  /^(?=.{1,32}$)(?:[a-z]+|[A-Z][a-z]{2,}|[A-Z]+|\d+)(?:[-_](?:[a-z]+|[A-Z][a-z]{2,}|[A-Z]+|\d+))*$/;
//@ chunk-yqnmafqp.js:557-644 placement
/**
 * 判断字符串是否看起来像随机令牌。
 */
function looksRandomToken(t) {
  return /[a-z]/i.test(t) && (/\d/.test(t) || (/[a-z]/.test(t) && /[A-Z]/.test(t)));
}
//@ chunk-yqnmafqp.js:644-719 placement
/**
 * 判断字符串是否像令牌（长度、字符集、不像版本号/scope）。
 */
function isTokenLike(t) {
  return (
    t.length >= 24 &&
    regExp.test(t) &&
    !VERSION_STRING_RE.test(t) &&
    !SCOPE_TOKEN_RE.test(t) &&
    looksRandomToken(t)
  );
}
//@ chunk-yqnmafqp.js:719-860 placement
function safeDecodeURIComponent(t) {
  try {
    return decodeURIComponent(t);
  } catch {
    return t.replace(/%[0-9A-Fa-f]{2}/g, (e) => String.fromCharCode(parseInt(e.slice(1), 16)));
  }
}
//@ chunk-yqnmafqp.js:860-1169 placement
/**
 * 匹配结尾多余分隔符的正则。
 */
var MEDIA_TYPE_RE =
  /^(?:\*|application|audio|font|example|haptics|image|message|model|multipart|text|video)\/(?:\*|[a-z0-9](?:[a-z0-9!#$&^_.+-])*)(?:\s*;\s*[a-z0-9!#$&^_.-]+=[\w!#$&^_.+-]*)*$/i;
var ACCEPT_ENCODING_RE = /^(?:gzip|x-gzip|deflate|br|zstd|compress|identity|\*)(?:\s*;\s*q=[\d.]+)?$/i;
var CHARSET_PARAM_RE = /^charset=[\w.:-]+$/i;
var TRAILING_SEPARATOR_RE = /(?<![;,\s])[;,\s]+$/;
//@ chunk-yqnmafqp.js:1169-1329 placement
function isBenignHeaderValue(t) {
  let filtered = t
    .replace(TRAILING_SEPARATOR_RE, "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (filtered.length === 0) return false;
  return filtered.every(
    (n) => MEDIA_TYPE_RE.test(n) || ACCEPT_ENCODING_RE.test(n) || CHARSET_PARAM_RE.test(n),
  );
}
//@ chunk-yqnmafqp.js:1329-1617 placement
/**
 * 请求头分隔符正则。
 */
var BENIGN_HEADER_NAMES = new Set([
  "accept",
  "accept-encoding",
  "content-length",
  "content-type",
  "user-agent",
]);
var NUMERIC_STRING_RE = /^\d+$/;
var SECRET_IN_PROSE_RE =
  /(?:^|[^A-Za-z0-9_-])[A-Za-z][A-Za-z0-9_-]{1,31}\s+[A-Za-z0-9._~+/=%-]{8,}(?![A-Za-z0-9._~+/=%-])/;
var SEPARATOR_SPLIT_RE = /([;,&\s]+)/;
var SCHEME_LIKE_RE = /[a-z0-9+.-]+/gi;
var URL_SCHEME_RE = /^(?:https?|wss?|ftp)$/i;
var HEADER_SEPARATOR_RE = /[;,&=]/;
var WHITESPACE_RE = /[\t\n\r]/g;
//@ chunk-yqnmafqp.js:1617-1663 placement
function looksLikeTokenSegment(t) {
  return t.length >= MAX_DISCOVERY_ATTEMPTS && looksRandomToken(t) && !isBenignHeaderValue(t);
}
//@ chunk-yqnmafqp.js:1663-1728 placement
/**
 * 判断单个片段是否像令牌。
 */
function hasTokenSegment(t) {
  return looksLikeTokenSegment(t) || (t.includes("+") && t.split("+").some(looksLikeTokenSegment));
}
//@ chunk-yqnmafqp.js:1728-1921 placement
/**
 * 判断请求头值里是否含密钥。
 */
function headerValueHasSecret(t) {
  return (
    t.split(/\s+/).some((e) => e.includes("+") && e.split("+").some(looksLikeTokenSegment)) ||
    t.split(/[;,&\s]+/).some((e) => {
      let index = e.indexOf("=");
      return index === -1
        ? hasTokenSegment(e)
        : hasTokenSegment(e.slice(0, index)) || hasTokenSegment(e.slice(index + 1));
    })
  );
}
//@ chunk-yqnmafqp.js:1921-2006 placement
function isSafeHeaderValue(t, e) {
  if (t === "user-agent") return !SECRET_IN_PROSE_RE.test(e);
  return NUMERIC_STRING_RE.test(e) || (isBenignHeaderValue(e) && !headerValueHasSecret(e));
}
//@ chunk-yqnmafqp.js:2006-2134 placement = redactSecrets (0.815)
/**
 * 请求头脱敏：只有白名单内的无害头名且值通过安全检查时保留原值，其余一律替换成 `[REDACTED]`；用于 MCP/XAA 调试日志打印请求头。
 */
function redactHeaders(content) {
  let e = {};
  for (let [key, value] of Object.entries(content)) {
    let lower = key.toLowerCase();
    e[key] = BENIGN_HEADER_NAMES.has(lower) && isSafeHeaderValue(lower, value) ? value : "[REDACTED]";
  }
  return e;
}
//@ chunk-yqnmafqp.js:2134-2403 layout
function looksLikeUrlWithScheme(t, e = false) {
  let replaced = t.replace(WHITESPACE_RE, "");
  if (!replaced.includes(":")) return false;
  let o = e ? -1 : replaced.lastIndexOf("?");
  for (let r of replaced.matchAll(SCHEME_LIKE_RE)) {
    let c = r.index + r[0].length;
    if (replaced[c] !== ":" || !/[a-z]/i.test(r[0])) continue;
    if (/[/\\]/.test(replaced[c + 1] ?? "") || (!e && URL_SCHEME_RE.test(r[0])) || o > c) return true;
  }
  return false;
}
//@ chunk-yqnmafqp.js:2403-2500 layout
/**
 * 判断字符串是否（多次解码后）是带协议的 URL。
 */
function isEncodedUrl(t) {
  let e = t;
  for (let i = 0; ; i++) {
    if (looksLikeUrlWithScheme(e)) return true;
    let o = i < 3 ? safeDecodeURIComponent(e) : e;
    if (o === e) return false;
    e = o;
  }
}
//@ chunk-yqnmafqp.js:2500-2607 layout
function userinfoAtIndex(t) {
  let e = t.length < 2 ? -1 : t.lastIndexOf("@", t.length - 2);
  let index = t.indexOf(":");
  return index !== -1 && e > index + 1 ? e : -1;
}
//@ chunk-yqnmafqp.js:2607-2784 layout
function looksLikeSecretBearingText(t, e = true) {
  for (let n of uniq([t, t.replaceAll(" ", "+")])) {
    let o = n;
    for (let i = 0; ; i++) {
      if (
        isTokenLike(o) ||
        looksLikeUrlWithScheme(o) ||
        userinfoAtIndex(o) !== -1 ||
        (e && hasEmbeddedSecret(o))
      )
        return true;
      let c = i < 3 ? safeDecodeURIComponent(o) : o;
      if (c === o) break;
      o = c;
    }
  }
  return false;
}
//@ chunk-yqnmafqp.js:2784-2828 layout
/**
 * 安全时原样返回，疑似密钥则返回 REDACTED。
 */
function redactUnlessSafe(t, e) {
  return !e || looksLikeSecretBearingText(t) ? "REDACTED" : t;
}
//@ chunk-yqnmafqp.js:2828-2863 layout
/**
 * 判断片段或其 URL 解码形式是否像令牌。
 */
function anySegmentTokenLike(t) {
  return isTokenLike(t) || isTokenLike(safeDecodeURIComponent(t));
}
//@ chunk-yqnmafqp.js:2863-2923 layout
/**
 * 判断空白分隔的片段里是否有密钥。
 */
function hasEmbeddedSecret(t) {
  return t.replace(/\s+/g, "+").split(regExp_2).some(anySegmentTokenLike);
}
//@ chunk-yqnmafqp.js:2923-3325 fingerprint = SENSITIVE_OAUTH_PARAMS (0.414)
var SENSITIVE_OAUTH_PARAMS = new Map([
  ["state", "sensitive"],
  ["nonce", "sensitive"],
  ["code_challenge", "sensitive"],
  ["code_verifier", "sensitive"],
  ["code", "sensitive"],
  ["redirect_uri", "url"],
  ["resource", "url"],
  ["audience", "url"],
  ["scope", "judged"],
  ["client_id", "judged"],
  ["response_type", "judged"],
  ["response_mode", "judged"],
  ["code_challenge_method", "judged"],
  ["prompt", "judged"],
  ["access_type", "judged"],
  ["display", "judged"],
]);
//@ chunk-yqnmafqp.js:3325-3506 layout
/**
 * redactUrlSearchParams：把 URL 查询串中的敏感 OAuth 参数值替换为 REDACTED。
 */
function redactUrlSearchParams(t) {
  let uRLSearchParams = new URLSearchParams();
  for (let [o, r] of t.searchParams) {
    let c = redactUnlessSafe(o, r !== "");
    uRLSearchParams.append(c, c === "REDACTED" ? "REDACTED" : redactSensitiveUrlParams(o, r));
  }
  let str = uRLSearchParams.toString();
  return str === "" ? "" : `?${str}`;
}
//@ chunk-yqnmafqp.js:3506-3707 callgraph-fingerprint = redactSensitiveUrlParams (0.308)
/**
 * redactSensitiveUrlParams：日志中把 URL/字段里的敏感 OAuth 参数（state、nonce、code…）替换为 REDACTED。
 */
function redactSensitiveUrlParams(t, e) {
  let n = SENSITIVE_OAUTH_PARAMS.get(t);
  if (n === undefined) return "REDACTED";
  switch (n) {
    case "sensitive":
      return "[REDACTED]";
    case "url":
      return isEncodedUrl(e) || isEncodedUrl(e.replaceAll(" ", "+")) ? redactUrlSecrets(e) : "REDACTED";
    case "judged":
      return redactWords(e);
  }
}
//@ chunk-yqnmafqp.js:3707-3870 affinity
/**
 * 按 URL 与非 URL 分段脱敏。
 */
function redactWords(t) {
  let e = [];
  let n = [];
  let o = () => {
    if (n.length > 0) {
      e.push(...redactTokens(n));
      n = [];
    }
  };
  for (let r of t.split(" "))
    if (isEncodedUrl(r)) {
      o();
      e.push(redactUrlSecrets(r));
    } else n.push(r);
  o();
  return e.join(" ");
}
//@ chunk-yqnmafqp.js:3870-4135 affinity
/**
 * 对一组片段做脱敏（含逐段判断）。
 */
function redactTokens(t) {
  if (looksLikeSecretBearingText(t.join(" "), false)) return ["REDACTED"];
  let e = [];
  let n = [];
  let o = () => {
    if (n.length > 0) {
      e.push(
        ...(looksLikeSecretBearingText(n.join("+"))
          ? ["REDACTED"]
          : n.map((r) => (looksLikeSecretBearingText(r) ? "REDACTED" : r))),
      );
      n = [];
    }
  };
  for (let r of t)
    if (r === "" || regExp.test(r)) n.push(r);
    else {
      o();
      e.push(looksLikeSecretBearingText(r) || hasEmbeddedSecret(r) ? "REDACTED" : r);
    }
  o();
  return e;
}
//@ chunk-yqnmafqp.js:5542-5633 placement = validateURL (0.823)
/**
 * URL 带用户名/密码或无法解析时返回 true。
 */
function urlHasCredentials(url) {
  try {
    let parsedUrl = new URL(url);
    return parsedUrl.username !== "" || parsedUrl.password !== "";
  } catch {
    return true;
  }
}
//@ chunk-yqnmafqp.js:5633-5764 placement
function isExpectedAuthError(t) {
  return (
    isAbortError(t) ||
    (t instanceof Error && (t.name === "TimeoutError" || t.name === "AuthenticationCancelledError")) ||
    t instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  );
}
//@ chunk-yqnmafqp.js:5764-5879 placement
/**
 * 生成 fetch 错误描述。
 */
function describeFetchError(t, e) {
  let url = String(e);
  return urlHasCredentials(url) && !isExpectedAuthError(t)
    ? `${t instanceof Error ? t.name : typeof t} fetching ${redactUrlSecrets(url)}`
    : errorMessage(t);
}
//@ chunk-yqnmafqp.js:5879-5945 placement
/**
 * 判断 URL 脱敏后是否与规范化形式一致。
 */
function urlAlreadyClean(t) {
  try {
    return redactUrlSecrets(t) === new URL(t).href;
  } catch {
    return false;
  }
}
//@ chunk-yqnmafqp.js:5945-6007 placement
/**
 * 生成 MCP SDK 请求失败的描述。
 */
function describeSdkFetchError(error, url) {
  return describeFetchError_2(error, String(url), "from the MCP SDK for");
}
//@ chunk-yqnmafqp.js:6007-6229 placement
function describeFetchError_2(t, e, n) {
  if (isExpectedAuthError(t) || urlAlreadyClean(e)) return errorMessage(t);
  let o = t instanceof Error ? /\bHTTP (\d{3})\b/.exec(t.message)?.[1] : undefined;
  let code = extractConnectionErrorDetails(t)?.code;
  return `${o ? `HTTP ${o}` : t instanceof Error ? t.name : typeof t} ${n} ${redactUrlSecrets(e)}${code ? ` (${code})` : ""}`;
}
//@ chunk-yqnmafqp.js:6229-6345 placement
/**
 * 简要描述错误：可安全展示的直接用消息，否则只给错误类型与错误码。
 */
function describeErrorBrief(error) {
  if (isExpectedAuthError(error)) return errorMessage(error);
  let code = extractConnectionErrorDetails(error)?.code;
  return `${error instanceof Error ? error.name : typeof error}${code ? ` (${code})` : ""}`;
}
//@ chunk-yqnmafqp.js:6345-6547 placement = expandEnvVars (0.824)
/**
 * describeConnectError：连接错误描述，远程传输附带 URL（拨号阶段）。
 */
function describeConnectError(error, e) {
  switch (e.type) {
    case "ws":
    case "ws-ide":
    case "sse":
    case "sse-ide":
    case "http":
    case "claudeai-proxy":
      return describeFetchError_2(error, e.url, "dialing");
    case undefined:
    case "stdio":
    case "sdk":
      return errorMessage(error);
    default:
      return e;
  }
}
//@ chunk-yqnmafqp.js:6547-6599 placement
/**
 * 连接错误里含凭据时抛脱敏后的错误。
 */
function rethrowRedactedConnectError(error, serverRef) {
  let n = describeConnectError(error, serverRef);
  return n === errorMessage(error) ? error : n;
}
//@ chunk-yqnmafqp.js:6599-6738 placement
/**
 * fetch 出错时若 URL 含凭据，抛出不含凭据的 TypeError（保留错误码），否则原样抛出。
 */
function rethrowRedactedFetchError(error, e) {
  if (isExpectedAuthError(error)) throw error;
  if (urlHasCredentials(String(e))) {
    let code = extractConnectionErrorDetails(error)?.code;
    throw Object.assign(
      TypeError(describeFetchError(error, e)),
      code === undefined
        ? {}
        : {
            code,
          },
    );
  }
  throw error;
}
//@ chunk-cyj440je.js:8407-8551 fingerprint = getServerKey (1)
/**
 * getServerKey：OAuth 令牌存储键 "<name>|<sha256(type,url,headers) 前 16 位>"。
 */
function getServerKey(serverName, serverConfig) {
  let configJson = jsonStringify({
    type: serverConfig.type,
    url: serverConfig.url,
    headers: serverConfig.headers || {},
  });
  let hash = createHash("sha256").update(configJson).digest("hex").substring(0, 16);
  return `${serverName}|${hash}`;
}
//@ chunk-cyj440je.js:8551-8634 layout
/**
 * 判断请求头对象里是否有 Authorization 头（大小写不敏感）。
 */
function hasAuthorizationHeader(e) {
  return Object.keys(e).some((key) => key.toLowerCase() === "authorization");
}
//@ chunk-cyj440je.js:8634-8675 layout
/**
 * 判断 MCP 服务器配置的 headers 是否带 Authorization 头（带了就视为外部自带凭证，不走 OAuth）。
 */
function configHasAuthorizationHeader(config) {
  return hasAuthorizationHeader(config.headers ?? {});
}
//@ chunk-cyj440je.js:8675-8724 layout
var DESIGN_PATH_PREFIX = "/v1/design/";
var FIRST_PARTY_MCP_PATH_PREFIXES = [DESIGN_PATH_PREFIX, "/v1/claude/test/", DOCS_MCP_PATH];
//@ chunk-cyj440je.js:8724-8913 layout
/**
 * isFirstPartyMcpUrl：https 且 Anthropic 域名下 /v1/design/、/v1/claude/test/ 等一方 MCP 路径。
 */
function isFirstPartyMcpUrl(url) {
  try {
    let r = new URL(url);
    if (r.protocol !== "https:" || !isFirstPartyAnthropicHost(r.href)) return false;
    if (
      FIRST_PARTY_MCP_PATH_PREFIXES.some((o) =>
        o.endsWith("/") ? r.pathname.startsWith(o) : r.pathname === o,
      )
    )
      return true;
    return false;
  } catch {
    return false;
  }
}
//@ chunk-cyj440je.js:8913-9004 layout
/**
 * 判断 URL 是否是一方 MCP 网关上的 Design 连接器路径（一方 MCP 主机且 path 以 Design 前缀开头）；解析失败返回 false。
 */
function isDesignMcpUrl(url) {
  try {
    let r = new URL(url);
    return isFirstPartyMcpUrl(r) && r.pathname.startsWith(DESIGN_PATH_PREFIX);
  } catch {
    return false;
  }
}
//@ chunk-cyj440je.js:9004-9159 layout
/**
 * usesNonOAuthAuth：XAA、自定义 headers/headersHelper 或一方登录的服务器（不走标准 OAuth 发现）。
 */
function usesNonOAuthAuth(e) {
  if (isXaaEnabled() && e.oauth?.xaa) return true;
  if (e.headersHelper || (e.headers && Object.keys(e.headers).length > 0)) return true;
  if (isFirstPartyMcpUrl(e.url) && isFirstPartyProvider()) return true;
  return false;
}
//@ chunk-cyj440je.js:9159-9217 layout
/**
 * 判断服务器是否已有"外部认证"：配置了 Authorization 头、或是 CCR 托管配置、或是一方 MCP URL 且已一方登录并允许使用；有则跳过 OAuth 流程。
 */
function hasExternalAuthForConfig(config, r) {
  return (
    configHasAuthorizationHeader(config) ||
    isCliOwnedConfig(config) ||
    (isFirstPartyMcpUrl(config.url) && isFirstPartyProvider() && r)
  );
}
//@ chunk-cyj440je.js:9217-9322 layout
/**
 * 异步判断安全存储里某服务器是否保存了 refresh token（存储为特殊哨兵值时视为有）；用于决定能否静默刷新而不是标记 needs-auth。
 */
async function hasStoredRefreshToken(e, r) {
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (secureStorageForMcp === READ_FAILED) return true;
  return !!secureStorageForMcp?.mcpOAuth?.[getServerKey(e, r)]?.refreshToken;
}
//@ chunk-cyj440je.js:9322-9454 fingerprint = hasMcpDiscoveryButNoToken (0.717)
/**
 * hasMcpDiscoveryButNoToken：存储里有发现状态但没有访问令牌。
 */
async function hasMcpDiscoveryButNoToken(serverName, serverConfig) {
  let secureStorageForMcp = await readSecureStorageForMcp();
  if (secureStorageForMcp === READ_FAILED) return READ_FAILED;
  let entry = secureStorageForMcp?.mcpOAuth?.[getServerKey(serverName, serverConfig)];
  return !!entry?.accessToken || !!entry?.refreshToken;
}
//@ chunk-4w0z5wdp.js:335-418 placement
/**
 * 不提供本地 OAuth 的托管 MCP 主机名。
 */
var LOCAL_OAUTH_BLOCKED_HOSTS = [
  "microsoft365.mcp.claude.com",
  "gmail.mcp.claude.com",
  "gcal.mcp.claude.com",
];
//@ chunk-4w0z5wdp.js:418-473 placement
function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/\.$/, "");
}
//@ chunk-4w0z5wdp.js:473-708 placement
function localOAuthBlockedHosts() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_mcp_local_oauth_blocked_hosts",
    {
      hosts: LOCAL_OAUTH_BLOCKED_HOSTS,
    },
  );
  let e = LOCAL_OAUTH_BLOCKED_HOSTS;
  if (
    featureValue_CACHED_MAY_BE_STALE !== null &&
    typeof featureValue_CACHED_MAY_BE_STALE === "object" &&
    "hosts" in featureValue_CACHED_MAY_BE_STALE &&
    Array.isArray(featureValue_CACHED_MAY_BE_STALE.hosts)
  ) {
    let filtered = featureValue_CACHED_MAY_BE_STALE.hosts.filter((host) => typeof host === "string");
    if (filtered.length > 0) e = filtered;
  }
  return new Set(e.map(normalizeHostname));
}
//@ chunk-4w0z5wdp.js:708-804 placement
/**
 * 判断主机是否属于不允许本地 OAuth 的托管服务。
 */
function isLocalOAuthBlockedHost(url) {
  if (!url) return false;
  try {
    let e = normalizeHostname(new URL(url).hostname);
    return localOAuthBlockedHosts().has(e);
  } catch {
    return false;
  }
}
//@ chunk-4w0z5wdp.js:804-1195 placement
/**
 * Anthropic 托管 MCP 服务器不支持本地 OAuth 时的提示：请在 claude.ai 连接器中连接，可附带移除旧配置的命令。
 */
function anthropicHostedOAuthMessage(serverName, e = {}) {
  let o =
    `"${normalizeServerNameShort(serverName)}" is Anthropic-hosted and doesn't support local OAuth. ` +
    "Connect it via Settings \u2192 Connectors on claude.ai (requires " +
    "`claude login`), then it'll be available here automatically.";
  let r =
    e.scope === "local" || e.scope === "project" || e.scope === "user"
      ? claudeCommand("mcp remove", serverName)
      : null;
  let s = r ? `${o} Remove the stale entry with: \`${r}\`` : o;
  return r && [...s].length <= 1024 ? s : o;
}
//@ chunk-4w0z5wdp.js:1195-1820 placement
/**
 * 判断一个 MCP 服务器能否在本地做 OAuth：claude.ai 代理、非 HTTP 传输、Anthropic 托管（附去 claude.ai 连接的提示）、云服务注入的服务器，或普通 oauth。
 */
function classifyMcpAuthTarget(serverName, config) {
  if (config.type === "claudeai-proxy")
    return {
      kind: "claudeai-proxy",
      config,
    };
  if (config.type !== "sse" && config.type !== "http")
    return {
      kind: "unsupported-transport",
      transport: config.type ?? "stdio",
    };
  if (isLocalOAuthBlockedHost(config.url))
    return {
      kind: "anthropic-hosted",
      config,
      message: anthropicHostedOAuthMessage(serverName, {
        scope: config.scope,
      }),
    };
  if (isCcrInjectedMcpUrl(serverName, config))
    return {
      kind: "anthropic-hosted",
      config,
      message: `"${normalizeServerNameShort(serverName)}" is provided to this session by Claude Code's cloud service, which holds its sign-in, so it can't be signed in to from here. If it is one of your claude.ai connectors, reconnect it under Settings \u2192 Connectors on claude.ai and then start a new session.`,
    };
  return {
    kind: "oauth",
    config,
  };
}
export {
  describeErrorBrief,
  isFirstPartyMcpUrl,
  configHasAuthorizationHeader,
  getServerKey,
  IssuerEchoCrossOriginError,
  usesNonOAuthAuth,
  hasStoredRefreshToken,
  isDesignMcpUrl,
  rethrowRedactedFetchError,
  hasAuthorizationHeader,
  ClaudeAuthProvider_2,
  wrapFetchWithStepUpDetection_2,
  redactHeaders,
  describeConnectError,
  rethrowRedactedConnectError,
  performMCPOAuthFlow_2,
  clearMcpOAuthStubIfTokenless_2,
  redactSensitiveUrlParams,
  ClaudeAuthProvider,
  wrapFetchWithStepUpDetection,
  clearMcpOAuthStubIfTokenless,
  classifyMcpAuthTarget,
  hasMcpDiscoveryButNoToken,
  hasExternalAuthForConfig,
  anySegmentTokenLike,
  looksRandomToken,
  SEPARATOR_SPLIT_RE,
  isEncodedUrl,
  hasEmbeddedSecret,
  safeDecodeURIComponent,
  userinfoAtIndex,
  looksLikeUrlWithScheme,
  HEADER_SEPARATOR_RE,
  redactUnlessSafe,
};

/**
 * services/mcp/auth.ts
 *
 * 并入旧版已有路径：MCP OAuth。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/auth.ts
 * pieces: chunk-1kaj6e83.js (43), chunk-4w0z5wdp.js (6), chunk-cyj440je.js (10), chunk-n1aavqzh.js (54), chunk-yqnmafqp.js (36)
 * attribution: sole-consumer 12, affinity 4, facade-exports 50, layout 42, fingerprint 10, placement 30, callgraph-fingerprint 1
 */
import { randomUUID, randomBytes, createHash } from "crypto";
import { createServer } from "http";
import { parse } from "url";
import { join } from "path";
import {
  defaultXaaFetch_2,
  JWT_BEARER_GRANT_2,
  redactTokens_2,
  makeXaaFetch_2,
  normalizeUrl_2,
  XaaTokenExchangeError_2,
  performCrossAppAccess_2,
  XaaTokenExchangeError,
} from "./xaa.js";
import { Ny, basicAuthValue } from "./discoveryIdentity.js";
import { redactUrlSecrets } from "../../utils/urlRedaction.js";
import {
  JwtBearerResponseSchema_2,
  strip as strip_2,
  OBt,
  M_t,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { logMCPDebug } from "../../utils/log.js";
import {
  discoverProtectedResource,
  discoverAuthorizationServer,
} from "./_new/discoverAuthorizationServer.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isAbortError,
  getErrnoCode,
  errorMessage,
} from "../../utils/errors.js";
import {
  et_2,
  D_t,
  XNr,
  QNr,
  LBt,
  UnauthorizedError,
  DBt,
  Mze,
  dLo,
} from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import { LK, PU, extractConnectionErrorDetails } from "../api/errorUtils.js";
import { Sue, OAuthError } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
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
import { ET, McpCredentialStoreUnavailableError } from "./client.js";
import { isMcpServerLoggableInAnalytics } from "../analytics/metadata.js";
import { logEvent } from "../analytics/index.js";
import { gn } from "../../utils/shortHash.js";
import { buildRedirectUri, findAvailablePort, Pdn } from "./oauthPort.js";
import { env } from "../../utils/env.js";
import { MCP_CLIENT_METADATA_URL } from "../../constants/oauth.js";
import { ht, Zl } from "./cliOwnedClients.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import {
  xaaPinnedServer,
  authDiscoveryState,
  pinXaaAuth,
  Adn,
  withoutTokenlessRejection,
  mergeSignInAuth,
  recordSavedAccessToken,
  mergeDiscoveredAuth,
  tokenlessRejectedAt,
} from "./signedOutFallback.js";
import { G4n, wrapFetchWithHeaders, W4n, mcpServerTelemetry } from "./headersHelper.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
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
import { ye } from "../../utils/startupMarks.js";
import { callbackPageBody } from "../oauth/callbackPage.js";
import { getPlatform } from "../../utils/platform.js";
import { isBrowserUnavailable, fi } from "../../utils/browser.js";
import { isDiskless } from "../../bootstrap/state.js";
import {
  getProjectDirsUpToHome,
  clearKeychainCache,
} from "../../utils/secureStorage/macOsKeychainHelpers.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { lock } from "../../utils/lockfile.js";
import { AUTH_LOST_SIGNAL } from "./connectionFlags.js";
import {
  TM,
  J_t,
  Jze,
  scn,
  icn,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/auth/errors.js";
import { strip, R$r, KYn } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/shared/auth.js";
import {
  QLo,
  s1t,
  AM,
  Aue,
  NHe,
  eHo,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { isLoopbackOrigin_2, extractHost } from "../../utils/plugins/fetchTelemetry.js";
import { uniq } from "../../utils/collections.js";
import { DOCS_MCP_PATH } from "./firstPartyServerIds.js";
import { isFirstPartyAnthropicHost, isFirstPartyProvider } from "../../utils/model/providers.js";
import { uo } from "../api/deferredToolsState.js";
import { claudeCommand } from "../../utils/worktreeResumeHint.js";
import { isCcrInjectedMcpUrl } from "./ccrMcpUrls.js";

/**
 * exchangeJwtAuthGrant（v2 副本）。
 */
//@ chunk-n1aavqzh.js:5535-6523 sole-consumer = exchangeJwtAuthGrant (0.989)
async function exchangeJwtAuthGrant(opts) {
  let t = opts.fetchFn ?? defaultXaaFetch_2,
    n = opts.authMethod ?? "client_secret_basic",
    params = new URLSearchParams({ grant_type: JWT_BEARER_GRANT_2, assertion: opts.assertion });
  if (opts.scope) params.set("scope", opts.scope);
  let headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (n === "client_secret_basic") {
    let basicAuth = Buffer.from(
      `${encodeURIComponent(opts.clientId)}:${encodeURIComponent(opts.clientSecret)}`,
    ).toString("base64");
    ((headers.Authorization = `Basic ${basicAuth}`), Ny().record(basicAuth));
  } else (params.set("client_id", opts.clientId), params.set("client_secret", opts.clientSecret));
  (Ny().record(opts.clientSecret), Ny().record(opts.assertion));
  let res = await t(opts.tokenEndpoint, { method: "POST", headers: headers, body: params });
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
/**
 * performCrossAppAccess（v2 副本）。
 */
//@ chunk-n1aavqzh.js:6523-8495 sole-consumer = performCrossAppAccess (0.894)
async function performCrossAppAccess(serverUrl, config, serverName = "xaa", abortSignal) {
  let fetchFn = makeXaaFetch_2(abortSignal);
  logMCPDebug(serverName, `XAA: discovering PRM for ${redactUrlSecrets(serverUrl)}`);
  let prm = await discoverProtectedResource(serverUrl, { fetchFn: fetchFn });
  logMCPDebug(
    serverName,
    `XAA: discovered resource=${redactUrlSecrets(prm.resource)} ASes=[${prm.authorization_servers.map(redactUrlSecrets).join(", ")}]`,
  );
  let pinnedAuthorizationServer = config.pinnedAuthorizationServer,
    A =
      pinnedAuthorizationServer === void 0
        ? prm.authorization_servers
        : prm.authorization_servers.filter(
            (authorization_server) =>
              normalizeUrl_2(authorization_server) === normalizeUrl_2(pinnedAuthorizationServer),
          );
  if (pinnedAuthorizationServer !== void 0 && A.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: authorization server changed: signed in with ${redactUrlSecrets(pinnedAuthorizationServer)}, server now names [${prm.authorization_servers.map(redactUrlSecrets).join(", ")}]. If this move is expected, run \`claude mcp remove\` for this server and add it again with its client secret.`,
      "XAA: authorization server changed",
    );
  let l,
    asErrors = [];
  for (let F of A) {
    let x;
    try {
      x = await discoverAuthorizationServer(F, { fetchFn: fetchFn });
    } catch (error) {
      if (abortSignal?.aborted) throw error;
      asErrors.push(`${redactUrlSecrets(F)}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (x.grant_types_supported && !x.grant_types_supported.includes(JWT_BEARER_GRANT_2)) {
      asErrors.push(
        `${redactUrlSecrets(F)}: does not advertise jwt-bearer grant (supported: ${x.grant_types_supported.join(", ")})`,
      );
      continue;
    }
    l = x;
    break;
  }
  if (!l)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: no authorization server supports jwt-bearer. Tried: ${asErrors.join("; ")}`,
      `XAA: no authorization server supports jwt-bearer (tried ${A.length})`,
    );
  let authMethods = l.token_endpoint_auth_methods_supported,
    R =
      authMethods &&
      !authMethods.includes("client_secret_basic") &&
      authMethods.includes("client_secret_post")
        ? "client_secret_post"
        : "client_secret_basic";
  (logMCPDebug(
    serverName,
    `XAA: AS issuer=${redactUrlSecrets(l.issuer)} token_endpoint=${redactUrlSecrets(l.token_endpoint)} auth_method=${R}`,
  ),
    logMCPDebug(serverName, "XAA: exchanging id_token for ID-JAG at IdP"));
  let jag = await et_2({
    tokenEndpoint: config.idpTokenEndpoint,
    audience: l.issuer,
    resource: prm.resource,
    idToken: config.idpIdToken,
    clientId: config.idpClientId,
    clientSecret: config.idpClientSecret,
    fetchFn: fetchFn,
  });
  (logMCPDebug(serverName, "XAA: ID-JAG obtained"),
    logMCPDebug(serverName, "XAA: exchanging ID-JAG for access_token at AS"));
  let tokens = await exchangeJwtAuthGrant({
    tokenEndpoint: l.token_endpoint,
    assertion: jag.jwtAuthGrant,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authMethod: R,
    fetchFn: fetchFn,
  });
  return (
    logMCPDebug(serverName, "XAA: access_token obtained"),
    { ...tokens, authorizationServerUrl: l.issuer }
  );
}
//@ chunk-n1aavqzh.js:8495-8563 sole-consumer
var at = 30000,
  ct = 500,
  Ie = 600000,
  dt = new Set([...LK, ...PU, "ETIMEDOUT"]);
//@ chunk-n1aavqzh.js:8563-8696 sole-consumer
function ut(e) {
  if (isAbortError(e)) return !0;
  if (e instanceof Error && e.name === "TimeoutError") return !0;
  let t = extractConnectionErrorDetails(e);
  return t !== null && dt.has(t.code);
}
//@ chunk-n1aavqzh.js:8696-8797 sole-consumer
function isZodError_2(e) {
  let t = e;
  return (t?.name === "ZodError" || t?.name === "$ZodError") && Array.isArray(t?.issues);
}
//@ chunk-n1aavqzh.js:8797-8922 affinity
var DEVICE_FLOW_PENDING_ERRORS = new Set(Object.values(Sue)),
  ft = ["authorization_pending", "expired_token", "slow_down"],
  pt = [...Object.values(Sue), ...ft];
/**
 * 把 OAuth 错误码收敛成遥测白名单值：命中已知错误码表则原样（标为可上报）返回，否则记为 `other`，避免把服务器自定义字符串送进遥测。（v2）
 */
//@ chunk-n1aavqzh.js:8922-8989 facade-exports
function sanitizeOAuthErrorCodeForAnalytics_2(e) {
  let found = pt.find((n) => n === e);
  return fromEnumOpt(found) ?? lit("other");
}
/**
 * describeIssuerEchoError：把 issuer 回显错误归类为 issuer_echo_denied/mismatch 等原因码。
 */
//@ chunk-n1aavqzh.js:8989-9816 facade-exports
function classifySdkAuthFailure_2(e, t) {
  let n =
    t instanceof Error
      ? `${e}
${t.message}`
      : e;
  if (t instanceof IssuerEchoCrossOriginError) return "issuer_echo_denied";
  if (t instanceof D_t) return t.kind === "metadata" ? "issuer_echo_mismatch" : "issuer_response_mismatch";
  if (t instanceof XNr) return "dcr_rejected";
  if (
    n.includes("dynamic client registration") ||
    (t instanceof OAuthError && t.code === "invalid_client_metadata")
  )
    return "dcr_failed";
  if ((n.includes("trying to load") && n.includes("metadata")) || n.includes("Incompatible auth server"))
    return "discovery_failed";
  if (t instanceof OAuthError) return "dcr_rejected";
  if (n.includes("Issuer mismatch in authorization server metadata")) return "issuer_echo_mismatch";
  if (n.includes("Issuer mismatch in authorization response")) return "issuer_response_mismatch";
  let r = getErrnoCode(t) ?? getErrnoCode(t instanceof Error ? t.cause : void 0);
  if (r && UNREACHABLE_ERRNOS.has(r)) return "network_failed";
  return "sdk_auth_failed";
}
//@ chunk-n1aavqzh.js:9816-9825 layout
var MAX_METADATA_REDIRECTS_2 = 5;
/**
 * 生成用于调试日志的授权 URL：origin+path 经 URL 脱敏（用户名/密码/查询值替换为 REDACTED）后，再拼上只保留参数名的查询摘要。（v2）
 */
//@ chunk-n1aavqzh.js:9825-9879 facade-exports
function authorizationUrlForDebugLog_2(e) {
  return redactUrlSecrets(e.origin + e.pathname) + redactUrlSearchParams(e);
}
//@ chunk-n1aavqzh.js:9879-9961 layout = NONSTANDARD_INVALID_GRANT_ALIASES (1)
var NONSTANDARD_INVALID_GRANT_ALIASES_2 = new Set([
  "invalid_refresh_token",
  "expired_refresh_token",
  "token_expired",
]);
/**
 * normalizeOAuthErrorBody（v2 副本）：把非标准 OAuth 错误体（如 invalid_refresh_token 等别名）规范化为标准 invalid_grant，便于 SDK 正确处理刷新失败。
 */
//@ chunk-n1aavqzh.js:9961-10425 facade-exports = normalizeOAuthErrorBody (1)
async function normalizeOAuthErrorBody_2(response) {
  if (!response.ok) return response;
  let text = await response.text(),
    parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return new Response(text, response);
  }
  if (strip_2.safeParse(parsed).success) return new Response(text, response);
  let result = OBt.safeParse(parsed);
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
/**
 * throwIfAborted：返回一个在信号已中止时抛出的检查函数（OAuth 请求用）。
 */
//@ chunk-n1aavqzh.js:10425-10585 facade-exports
function createAuthFetch_2() {
  return async (e, t) => {
    try {
      return await createAuthFetch_4(e, t);
    } catch (error) {
      if (t?.signal?.aborted || !ut(error)) throw error;
      return (await sleep(ct, t?.signal ?? void 0), await createAuthFetch_4(e, t));
    }
  };
}
//@ chunk-n1aavqzh.js:10585-11116 layout = createAuthFetch (1)
async function createAuthFetch_4(e, t) {
  let timeoutSignal = AbortSignal.timeout(at),
    isPost = t?.method?.toUpperCase() === "POST",
    s = getProxyFetchOptions({ url: String(e) });
  if (!t?.signal) {
    let l;
    try {
      l = await fetch(e, { ...t, ...s, signal: timeoutSignal });
    } catch (error) {
      rethrowRedactedFetchError(error, e);
    }
    return isPost ? normalizeOAuthErrorBody_2(l) : l;
  }
  let controller = new AbortController(),
    abort = () => controller.abort();
  (t.signal.addEventListener("abort", abort), timeoutSignal.addEventListener("abort", abort));
  let cleanup = () => {
    (t.signal?.removeEventListener("abort", abort), timeoutSignal.removeEventListener("abort", abort));
  };
  if (t.signal.aborted) controller.abort();
  try {
    let response = await fetch(e, { ...t, ...s, signal: controller.signal });
    return (cleanup(), isPost ? normalizeOAuthErrorBody_2(response) : response);
  } catch (error) {
    (cleanup(), rethrowRedactedFetchError(error, e));
  }
}
/**
 * fetchAuthServerMetadata：授权服务器元数据发现：配置的 authServerMetadataUrl（必须 https）直接用，否则按资源元数据/RFC 8414/OIDC 路径探测，支持限次重定向。
 */
//@ chunk-n1aavqzh.js:11116-12321 layout
async function fetchAuthServerMetadata(serverName, serverUrl, options) {
  let {
      configuredMetadataUrl: configuredMetadataUrl,
      fetchFn: fetchFn,
      resourceMetadataUrl: resourceMetadataUrl,
      serverConfigForAnalytics: serverConfigForAnalytics,
    } = options ?? {},
    A = fetchFn ?? createAuthFetch_2();
  if (configuredMetadataUrl) {
    if (!configuredMetadataUrl.startsWith("https://"))
      throw Error(
        `authServerMetadataUrl must use https:// (got: ${redactUrlSecrets(configuredMetadataUrl)})`,
      );
    let y = await A(configuredMetadataUrl, { headers: { Accept: "application/json" } });
    if (y.ok) {
      let w;
      try {
        w = await y.json();
      } catch {
        throw Error(
          `Configured auth server metadata at ${redactUrlSecrets(configuredMetadataUrl)} is not valid JSON`,
        );
      }
      return M_t.parse(w);
    }
    throw Error(
      `HTTP ${y.status} fetching configured auth server metadata from ${redactUrlSecrets(configuredMetadataUrl)}`,
    );
  }
  try {
    let {
      authorizationServerUrl: authorizationServerUrl,
      authorizationServerMetadata: authorizationServerMetadata,
    } = await QNr(serverUrl, {
      fetchFn: A,
      ...(resourceMetadataUrl && { resourceMetadataUrl: resourceMetadataUrl }),
      skipIssuerMetadataValidation: !0,
    });
    if (authorizationServerMetadata)
      return (
        evaluateIssuerEchoPolicy({
          serverName: serverName,
          site: "rfc9728_chain",
          expectedIssuer: authorizationServerUrl,
          receivedIssuer: authorizationServerMetadata.issuer,
          serverConfig: serverConfigForAnalytics,
        }),
        authorizationServerMetadata
      );
  } catch (error) {
    if (error instanceof IssuerEchoCrossOriginError) throw error;
    logMCPDebug(serverName, `RFC 9728 discovery failed, falling back: ${yF(error, serverUrl)}`);
  }
  let l = new URL(serverUrl);
  if (l.pathname === "/") return;
  try {
    let y = await LBt(l, { fetchFn: A, skipIssuerValidation: !0 });
    if (y)
      evaluateIssuerEchoPolicy({
        serverName: serverName,
        site: "legacy_path_fallback",
        expectedIssuer: l.href,
        receivedIssuer: y.issuer,
        serverConfig: serverConfigForAnalytics,
      });
    return y;
  } catch (error) {
    if (error instanceof IssuerEchoCrossOriginError) throw error;
    logMCPDebug(serverName, `Path-aware auth server discovery failed: ${yF(error, serverUrl)}`);
    return;
  }
}
/**
 * IssuerEchoCrossOriginError：issuer 回显跨源不一致错误。
 */
//@ chunk-n1aavqzh.js:12321-12621 facade-exports
class IssuerEchoCrossOriginError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  expected;
  received;
  constructor(e, t) {
    super(
      `Issuer echo cross-origin mismatch (RFC 8414 \xA73.3): expected ${jsonStringify(e)}, received ${jsonStringify(t)}`,
      "issuer echo cross-origin mismatch (RFC 8414 \xA73.3)",
      "issuer_echo_denied",
    );
    this.expected = e;
    this.received = t;
    this.name = "IssuerEchoCrossOriginError";
  }
}
//@ chunk-n1aavqzh.js:12621-12704 layout
function isIssuerStrictEchoEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_issuer_strict_echo", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-n1aavqzh.js:12704-12770 layout
function stripTrailingSlash(e, t) {
  return t === e || (e.endsWith("/") && t === e.slice(0, -1));
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
function compareIssuerOrigin(e, t) {
  let n = getHttpOrigin(e),
    r = getHttpOrigin(t);
  if (!n || !r) return "unparseable";
  if (
    n.username !== "" ||
    n.password !== "" ||
    r.username !== "" ||
    r.password !== "" ||
    r.search !== "" ||
    r.hash !== ""
  )
    return "cross_origin";
  return n.origin === r.origin ? "same_origin" : "cross_origin";
}
//@ chunk-n1aavqzh.js:13139-13568 layout
function diffUrlComponents(e, t) {
  let n = getHttpOrigin(e),
    r = getHttpOrigin(t);
  if (!n || !r) return [];
  let s = [];
  if (n.protocol !== r.protocol) s.push("scheme");
  if (n.username !== r.username || n.password !== r.password) s.push("userinfo");
  if (n.hostname !== r.hostname) s.push("host");
  if (n.port !== r.port) s.push("port");
  if (n.pathname !== r.pathname) s.push("path");
  if (n.search !== r.search) s.push("query");
  if (n.hash !== r.hash) s.push("fragment");
  if (s.length === 0) s.push("normalization_only");
  return s;
}
/**
 * checkIssuerEcho：校验授权响应回显的 issuer（RFC 9207）与预期一致，enforce 模式拒绝跨源不一致，observe 模式只记录。
 */
//@ chunk-n1aavqzh.js:13568-14262 facade-exports
function evaluateIssuerEchoPolicy({
  serverName: serverName,
  site: site,
  expectedIssuer: expectedIssuer,
  receivedIssuer: receivedIssuer,
  serverConfig: serverConfig,
}) {
  if (expectedIssuer === void 0) return;
  if (receivedIssuer !== void 0 && stripTrailingSlash(expectedIssuer, receivedIssuer)) return;
  let S = receivedIssuer === void 0 ? "unparseable" : compareIssuerOrigin(expectedIssuer, receivedIssuer),
    h = isIssuerStrictEchoEnabled() ? "enforce" : "observe",
    A = h === "enforce" && S !== "same_origin";
  try {
    let l =
        receivedIssuer === void 0 ? ["issuer_missing"] : diffUrlComponents(expectedIssuer, receivedIssuer),
      y = serverConfig ? ET(serverConfig) : void 0,
      w = serverConfig
        ? mcpNameForAnalytics_GATE_EVALUATED(
            serverName,
            isMcpServerLoggableInAnalytics(serverName, serverConfig),
          )
        : void 0;
    logEvent("tengu_mcp_oauth_issuer_echo_mismatch", {
      site: fromEnum(site),
      mode: fromEnum(h),
      originRelation: fromEnum(S),
      outcome: A ? lit("denied") : lit("proceeded"),
      ...(l.length > 0 && { mismatchFacets: fromEnumArr(l) }),
      expectedIssuerHash: gn(expectedIssuer),
      ...(receivedIssuer !== void 0 && { receivedIssuerHash: gn(receivedIssuer) }),
      ...(y && { mcpServerBaseUrl: y }),
      ...(w && { mcpServerName: w }),
    });
  } catch (error) {
    try {
      logMCPDebug(serverName, `issuer-echo telemetry failed: ${errorMessage(error)}`);
    } catch {}
  }
  if (A) throw new IssuerEchoCrossOriginError(expectedIssuer, receivedIssuer);
}
/**
 * McpClientRegistrationDeferredError：需要认证但客户端注册推迟到用户认证时。
 */
//@ chunk-n1aavqzh.js:14262-14470 facade-exports
class McpClientRegistrationDeferredError_2 extends UnauthorizedError {
  serverName;
  constructor(e) {
    super("Authentication required; client registration is deferred until the user authenticates");
    this.serverName = e;
    this.name = "McpClientRegistrationDeferredError";
  }
}
/**
 * 用户取消 MCP OAuth 授权时抛出的错误类（消息 `Authentication was cancelled`），调用方据此区分"取消"与"失败"。（v2）
 */
//@ chunk-n1aavqzh.js:14470-14588 facade-exports = AuthenticationCancelledError (1)
class AuthenticationCancelledError_2 extends Error {
  constructor() {
    super("Authentication was cancelled");
    this.name = "AuthenticationCancelledError";
  }
}
//@ chunk-n1aavqzh.js:14588-14677 layout
function getUrlOriginNoPort(e) {
  try {
    let t = new URL(e);
    return `${t.protocol}//${t.hostname}`;
  } catch {
    return e;
  }
}
//@ chunk-n1aavqzh.js:14677-14758 layout
function isLoopbackOrigin(e) {
  let t = getUrlOriginNoPort(e);
  return t === "http://127.0.0.1" || t === "http://localhost";
}
//@ chunk-n1aavqzh.js:14758-14955 layout
function getRegisteredLoopbackPort_2(e) {
  if (!e?.clientId || !e.redirectUri || !isLoopbackOrigin(e.redirectUri)) return;
  let t = Number(new URL(e.redirectUri).port);
  return t && e.redirectUri.replace("//127.0.0.1:", "//localhost:") === buildRedirectUri(t) ? t : void 0;
}
//@ chunk-n1aavqzh.js:14955-15013 layout
function getClientMetadataDocumentUrl_2() {
  return env.MCP_OAUTH_CLIENT_METADATA_URL || MCP_CLIENT_METADATA_URL;
}
//@ chunk-n1aavqzh.js:15013-15108 layout
function isLoopbackCallbackUri_2(e) {
  if (!isLoopbackOrigin(e)) return !1;
  try {
    return new URL(e).pathname === "/callback";
  } catch {
    return !1;
  }
}
//@ chunk-n1aavqzh.js:15108-15162 layout
function isClientMetadataDocumentId_2(e) {
  return e !== void 0 && (e === MCP_CLIENT_METADATA_URL || e === getClientMetadataDocumentUrl_2());
}
/**
 * 按服务器键取出进程级状态里登记的 OAuth 回调提交器（用于把粘贴的回调 URL 交给正在等待的授权流程）。（v2）
 */
//@ chunk-n1aavqzh.js:15162-15221 facade-exports
function getOAuthCallbackSubmitter_2(e) {
  return ht().oauthCallbackSubmitters.get(e);
}
/**
 * 登记某服务器正在进行的 OAuth 授权 Promise，结束后（无论成败）若仍是同一个则从 activeOAuthFlows 移除，用于并发去重。（v2）
 */
//@ chunk-n1aavqzh.js:15221-15337 facade-exports
function setActiveOAuthPromise_2(e, t) {
  let activeOAuthFlows = ht().activeOAuthFlows;
  (activeOAuthFlows.set(e, t),
    t
      .finally(() => {
        if (activeOAuthFlows.get(e) === t) activeOAuthFlows.delete(e);
      })
      .catch(() => {}));
}
/**
 * 取出某服务器正在进行的 OAuth 授权 Promise（没有则 undefined），让并发的授权请求复用同一流程。（v2）
 */
//@ chunk-n1aavqzh.js:15337-15389 facade-exports
function getActiveOAuthPromise_2(e) {
  return ht().activeOAuthFlows.get(e);
}
/**
 * clearTokenlessStub：删除既无令牌也无发现状态的占位凭证条目。
 */
//@ chunk-n1aavqzh.js:15389-15769 facade-exports
async function clearMcpOAuthStubIfTokenless_2(e, t) {
  let n = getServerKey(e, t),
    r = (await getSecureStorage().readAsync())?.mcpOAuth?.[n];
  if (!r || r.accessToken || r.refreshToken || xaaPinnedServer(r.discoveryState)) return;
  try {
    await getSecureStorage().mutate((s) => {
      let S = s.mcpOAuth?.[n];
      if (!S || S.accessToken || S.refreshToken || xaaPinnedServer(S.discoveryState)) return s;
      let h = { ...s.mcpOAuth };
      return (delete h[n], { ...s, mcpOAuth: h });
    });
  } catch (error) {
    logMCPDebug(e, `clear tokenless stub failed: ${errorMessage(error)}`);
  }
}
//@ chunk-n1aavqzh.js:15769-16823 layout = revokeToken (0.967)
async function revokeToken_2({
  serverName: serverName,
  endpoint: endpoint,
  token: token,
  tokenTypeHint: tokenTypeHint,
  clientId: clientId,
  clientSecret: clientSecret,
  accessToken: accessToken,
  authMethod: authMethod = "client_secret_basic",
  configuredHeaders: configuredHeaders,
}) {
  let params = new URLSearchParams();
  (params.set("token", token), params.set("token_type_hint", tokenTypeHint));
  let w = { ...configuredHeaders, "Content-Type": "application/x-www-form-urlencoded" },
    R = Object.keys(configuredHeaders).length > 0 ? { beforeRedirect: G4n(endpoint) } : {};
  if (clientId && clientSecret)
    if (authMethod === "client_secret_post")
      (params.set("client_id", clientId), params.set("client_secret", clientSecret));
    else {
      let basic = Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString(
        "base64",
      );
      ((w.Authorization = `Basic ${basic}`), Ny().record(basic));
    }
  else if (clientId) params.set("client_id", clientId);
  else logMCPDebug(serverName, `No client_id available for ${tokenTypeHint} revocation - server may reject`);
  try {
    (await Dt.post(endpoint, params, { headers: w, ...R }),
      logMCPDebug(serverName, `Successfully revoked ${tokenTypeHint}`));
  } catch (error) {
    if (Dt.isAxiosError(error) && error.response?.status === 401 && accessToken)
      (logMCPDebug(serverName, `Got 401, retrying ${tokenTypeHint} revocation with Bearer auth`),
        params.delete("client_id"),
        params.delete("client_secret"),
        await Dt.post(endpoint, params, { headers: { ...w, Authorization: `Bearer ${accessToken}` }, ...R }),
        logMCPDebug(serverName, `Successfully revoked ${tokenTypeHint} with Bearer auth`));
    else throw error;
  }
}
/**
 * readStoredServerCredentials：读取服务器的令牌/客户端信息。
 */
//@ chunk-n1aavqzh.js:16823-17121 facade-exports
async function snapshotServerTokens_2(e, t) {
  let r = (await getSecureStorage().readAsync())?.mcpOAuth?.[getServerKey(e, t)];
  if (!r?.accessToken && !r?.refreshToken) return;
  return {
    accessToken: r.accessToken || void 0,
    refreshToken: r.refreshToken,
    clientId: r.clientId,
    clientSecret: r.clientSecret,
    ...(r.discoveryState && { discoveryState: authDiscoveryState(r.discoveryState) }),
  };
}
//@ chunk-n1aavqzh.js:17121-18760 layout = revokeServerTokens (0.772)
async function revokeServerTokens_4(serverName, serverConfig, n) {
  let storage = Ny();
  (storage.record(n.accessToken), storage.record(n.refreshToken), storage.record(n.clientSecret));
  let s;
  try {
    let S = n.discoveryState?.authorizationServerUrl ?? serverConfig.url,
      metadata = await fetchAuthServerMetadata(serverName, S, {
        configuredMetadataUrl: xaaPinnedServer(n.discoveryState)
          ? void 0
          : serverConfig.oauth?.authServerMetadataUrl,
        fetchFn: wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch_2()),
        serverConfigForAnalytics: serverConfig,
      });
    if (!metadata) (logMCPDebug(serverName, "No OAuth metadata found"), (s = "no_metadata"));
    else {
      let A = "revocation_endpoint" in metadata ? metadata.revocation_endpoint : null;
      if (!A)
        (logMCPDebug(serverName, "Server does not support token revocation"), (s = "no_revocation_endpoint"));
      else {
        let revocationEndpointStr = String(A),
          y = await W4n(serverName, serverConfig, revocationEndpointStr),
          w =
            ("revocation_endpoint_auth_methods_supported" in metadata
              ? metadata.revocation_endpoint_auth_methods_supported
              : void 0) ??
            ("token_endpoint_auth_methods_supported" in metadata
              ? metadata.token_endpoint_auth_methods_supported
              : void 0),
          R =
            w && !w.includes("client_secret_basic") && w.includes("client_secret_post")
              ? "client_secret_post"
              : "client_secret_basic";
        if (
          (logMCPDebug(serverName, `Revoking tokens via ${redactUrlSecrets(revocationEndpointStr)} (${R})`),
          n.refreshToken)
        )
          try {
            await revokeToken_2({
              serverName: serverName,
              endpoint: revocationEndpointStr,
              token: n.refreshToken,
              tokenTypeHint: "refresh_token",
              clientId: n.clientId,
              clientSecret: n.clientSecret,
              accessToken: n.accessToken,
              authMethod: R,
              configuredHeaders: y,
            });
          } catch (error) {
            (logMCPDebug(serverName, `Failed to revoke refresh token: ${errorMessage(error)}`),
              (s = "server_revoke_failed"));
          }
        if (n.accessToken)
          try {
            await revokeToken_2({
              serverName: serverName,
              endpoint: revocationEndpointStr,
              token: n.accessToken,
              tokenTypeHint: "access_token",
              clientId: n.clientId,
              clientSecret: n.clientSecret,
              accessToken: n.accessToken,
              authMethod: R,
              configuredHeaders: y,
            });
          } catch (error) {
            (logMCPDebug(serverName, `Failed to revoke access token: ${errorMessage(error)}`),
              (s = "server_revoke_failed"));
          }
      }
    }
  } catch (error) {
    (logMCPDebug(serverName, `Failed to revoke tokens: ${errorMessage(error)}`),
      (s = error instanceof IssuerEchoCrossOriginError ? "issuer_echo_denied" : "server_revoke_failed"));
  }
  return s;
}
/**
 * revokeReplacedTokens：令牌被替换后撤销旧令牌。
 */
//@ chunk-n1aavqzh.js:18760-19280 facade-exports
async function revokeReplacedServerTokens_2(e, t, n) {
  let r;
  try {
    let s = (await getSecureStorage().readAsync())?.mcpOAuth?.[getServerKey(e, t)],
      S = {
        ...n,
        accessToken: n.accessToken && n.accessToken !== s?.accessToken ? n.accessToken : void 0,
        refreshToken: n.refreshToken && n.refreshToken !== s?.refreshToken ? n.refreshToken : void 0,
      };
    if (!S.accessToken && !S.refreshToken) {
      (logMCPDebug(e, "No replaced tokens to revoke"), logFeatureOk("mcp_oauth_revoke"));
      return;
    }
    r = await revokeServerTokens_4(e, t, S);
  } catch (error) {
    (logMCPDebug(e, `Failed to revoke replaced tokens: ${errorMessage(error)}`),
      (r = "server_revoke_failed"));
  }
  if (r) logFeatureSad("mcp_oauth_revoke", r);
  else logFeatureOk("mcp_oauth_revoke");
}
/**
 * clearServerTokens：撤销并清除服务器令牌（可保留 step-up 状态），凭证存储不可读时放弃。
 */
//@ chunk-n1aavqzh.js:19280-21238 facade-exports
async function revokeServerTokens_2(serverName, serverConfig, { preserveStepUpState: n = !1 } = {}) {
  let r = getSecureStorage(),
    s = await readSecureStorageForMcp();
  if (s === READ_FAILED)
    return (
      logMCPDebug(serverName, "Could not read the credential store to clear tokens"),
      logFeatureBad("mcp_oauth_revoke", "local_read_failed"),
      { cleared: !1, reason: "credential_store_failed" }
    );
  let S = getServerKey(serverName, serverConfig),
    h = s?.mcpOAuth?.[S],
    A;
  if (h?.accessToken || h?.refreshToken)
    A = await revokeServerTokens_4(serverName, serverConfig, {
      accessToken: h.accessToken || void 0,
      refreshToken: h.refreshToken,
      clientId: h.clientId,
      clientSecret: h.clientSecret,
      ...(h.discoveryState && { discoveryState: authDiscoveryState(h.discoveryState) }),
    });
  else logMCPDebug(serverName, "No tokens to revoke");
  let l = !1;
  try {
    if (n && h && (h.stepUpScope || h.discoveryState || h.clientId)) {
      let mutate = await r.mutate((w) => {
        let R = w.mcpOAuth?.[S];
        if (R?.accessToken !== h.accessToken || R?.clientId !== h.clientId) return w;
        return {
          ...w,
          mcpOAuth: {
            ...w.mcpOAuth,
            [S]: {
              serverName: serverName,
              serverUrl: serverConfig.url,
              accessToken: "",
              refreshToken: void 0,
              expiresAt: void 0,
              ...(h.clientId && {
                clientId: h.clientId,
                ...(h.redirectUri && { redirectUri: h.redirectUri }),
                ...(h.clientSecret !== void 0 && { clientSecret: h.clientSecret }),
              }),
              ...(h.stepUpScope && { stepUpScope: h.stepUpScope }),
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
      ((l = mutate.success),
        logMCPDebug(
          serverName,
          mutate.success
            ? "Preserved step-up auth state across revocation"
            : `clear local tokens failed: ${mutate.warning ?? "storage write failed"}`,
        ));
    } else if (n) l = (await clearServerTokensFromLocalStorage_2(serverName, serverConfig)).success;
    else {
      let y = await confirmCredentialRemoval(
        r,
        (w) => {
          if (!w.mcpOAuth?.[S]) return w;
          let { [S]: R, ...T } = w.mcpOAuth;
          return { ...w, mcpOAuth: T };
        },
        (w) => w.mcpOAuth?.[S] !== void 0,
      );
      if (!y.confirmed && y.reason === "keychain_unreadable")
        return (
          logMCPDebug(serverName, "Could not read the keychain to clear tokens"),
          logFeatureBad("mcp_oauth_revoke", "keychain_unreadable"),
          { cleared: !1, reason: "keychain_unreadable" }
        );
      l = y.confirmed;
    }
  } catch (error) {
    logMCPDebug(serverName, `clear local tokens failed: ${errorMessage(error)}`);
  }
  if (!l) A ??= "local_clear_failed";
  if ((clearDiscoveryPathMemo(serverName), A)) logFeatureSad("mcp_oauth_revoke", A);
  else logFeatureOk("mcp_oauth_revoke");
  return l ? { cleared: !0 } : { cleared: !1, reason: "credential_store_failed" };
}
/**
 * clearServerTokensFromLocalStorage：只清本地存储里的令牌，可保留客户端注册。
 */
//@ chunk-n1aavqzh.js:21238-21871 facade-exports
async function clearServerTokensFromLocalStorage_2(serverName, serverConfig, n) {
  let r = getServerKey(serverName, serverConfig),
    s,
    mutate = await getSecureStorage().mutate((h) => {
      let A = h.mcpOAuth?.[r];
      if (!A) return h;
      let l = { ...h.mcpOAuth };
      if (A.clientId && n?.preserveClientRegistration?.(A)) {
        if (!A.accessToken && !A.refreshToken) return h;
        ((l[r] = { ...A, accessToken: "", refreshToken: void 0, expiresAt: 0, scope: void 0 }),
          (s = "tokens"));
      } else if (n?.keepXaaPin && xaaPinnedServer(A.discoveryState))
        ((l[r] = {
          serverName: A.serverName,
          serverUrl: A.serverUrl,
          accessToken: "",
          expiresAt: 0,
          discoveryState: A.discoveryState,
        }),
          (s = "all"));
      else (delete l[r], (s = "all"));
      return { ...h, mcpOAuth: l };
    });
  if (s)
    logMCPDebug(
      serverName,
      s === "tokens" ? "Cleared stored tokens (preserved client registration)" : "Cleared stored tokens",
    );
  return mutate;
}
//@ chunk-n1aavqzh.js:21871-22160 layout
function logStorageWriteFailure_2(e, t, n, r) {
  if (n?.success) return;
  let s = r ? "mutate_rejected" : "storage_write_failed",
    S = r ? errorMessage(r) : (n?.warning ?? "storage write failed");
  logMCPDebug(e, `Token persist failed: ${S}`);
  let h = ET(t);
  logEvent("tengu_mcp_oauth_token_persist_failed", {
    transportType: fromEnum(t.type),
    ...(h && { mcpServerBaseUrl: h }),
    reason: fromEnum(s),
  });
}
//@ chunk-n1aavqzh.js:22160-22319 layout
async function hasStoredOAuthState_2(e, t) {
  let n = getServerKey(e, t),
    r = await readSecureStorageForMcp();
  if (r === READ_FAILED || (t.oauth?.xaa && !r?.mcpOAuthClientConfig?.[n])) return READ_FAILED;
  return xaaPinnedServer(r?.mcpOAuth?.[n]?.discoveryState);
}
/**
 * performMCPXaaAuth（v2）：XAA 认证：取 IdP 设置与 client secret，acquireIdpIdToken 后 performCrossAppAccess，令牌写入存储并固定授权服务器。
 */
//@ chunk-n1aavqzh.js:22319-24942 layout = performMCPXaaAuth (0.9)
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
    let wantedKey = getServerKey(serverName, serverConfig),
      haveKeys = Object.keys((await getSecureStorage().readAsync())?.mcpOAuthClientConfig ?? {}),
      idpClientSecret = redactHeaders(serverConfig.headers ?? {});
    throw (
      logMCPDebug(
        serverName,
        `XAA: secret lookup miss. wanted=${wantedKey} have=[${haveKeys.join(", ")}] configHeaders=${jsonStringify(idpClientSecret)}`,
      ),
      Error(`XAA: AS client secret not found for '${serverName}'. Re-add with --client-secret.`)
    );
  }
  if ((await hasStoredOAuthState_2(serverName, serverConfig)) === READ_FAILED)
    throw new McpCredentialStoreUnavailableError(serverName);
  logMCPDebug(serverName, "XAA: starting cross-app access flow");
  let y = await getIdpClientSecret_2(idp.issuer),
    idTokenCacheHit = (await getCachedIdpIdToken_2(idp.issuer)) !== void 0,
    failureStage = "idp_login";
  try {
    let T;
    try {
      T = await acquireIdpIdToken_2({
        idpIssuer: idp.issuer,
        idpClientId: idp.clientId,
        idpClientSecret: y,
        callbackPort: idp.callbackPort,
        onAuthorizationUrl: onAuthorizationUrl,
        skipBrowserOpen: skipBrowserOpen,
        abortSignal: abortSignal,
      });
    } catch (error) {
      if (abortSignal?.aborted) throw new AuthenticationCancelledError_2();
      throw error;
    }
    failureStage = "discovery";
    let oidc = await discoverOidc_2(idp.issuer);
    ((failureStage = "token_exchange"), Ny().record(clientSecret));
    let F = await hasStoredOAuthState_2(serverName, serverConfig);
    if (F === READ_FAILED) throw new McpCredentialStoreUnavailableError(serverName);
    let x;
    try {
      x = await performCrossAppAccess(
        serverConfig.url,
        {
          clientId: clientId,
          clientSecret: clientSecret,
          idpClientId: idp.clientId,
          idpClientSecret: y,
          idpIdToken: T,
          idpTokenEndpoint: oidc.token_endpoint,
          pinnedAuthorizationServer: F,
        },
        serverName,
        abortSignal,
      );
    } catch (error) {
      if (abortSignal?.aborted) throw new AuthenticationCancelledError_2();
      let msg = errorMessage(error);
      if (error instanceof XaaTokenExchangeError_2) {
        if (error.shouldClearIdToken)
          (await clearIdpIdToken_2(idp.issuer),
            logMCPDebug(serverName, "XAA: cleared cached id_token after token-exchange failure"));
      } else if (
        msg.includes("PRM discovery failed") ||
        msg.includes("AS metadata discovery failed") ||
        msg.includes("no authorization server supports jwt-bearer") ||
        msg.includes("authorization server changed")
      )
        failureStage = "discovery";
      else if (msg.includes("jwt-bearer")) failureStage = "jwt_bearer";
      throw error;
    }
    let U = getServerKey(serverName, serverConfig),
      storage = Ny();
    (storage.record(x.access_token), storage.record(x.refresh_token));
    let D, W;
    try {
      D = await getSecureStorage().mutate((O) => {
        let prev = O.mcpOAuth?.[U];
        return {
          ...O,
          mcpOAuth: {
            ...O.mcpOAuth,
            [U]: {
              ...prev,
              serverName: serverName,
              serverUrl: serverConfig.url,
              accessToken: x.access_token,
              refreshToken: x.refresh_token ?? prev?.refreshToken,
              expiresAt: x.expires_in != null ? Date.now() + x.expires_in * 1000 : void 0,
              scope: x.scope,
              clientId: clientId,
              clientSecret: clientSecret,
              discoveryState: pinXaaAuth({
                previous: prev?.discoveryState,
                issuedBy: x.authorizationServerUrl,
                interactiveSignIn: !0,
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
    (logEvent("tengu_mcp_oauth_flow_success", { authMethod: lit("xaa"), idTokenCacheHit: idTokenCacheHit }),
      logFeatureOk("mcp_oauth_flow"));
  } catch (error) {
    if (error instanceof AuthenticationCancelledError_2) throw error;
    throw (
      logFeatureBad("mcp_oauth_flow", "mcp_oauth_xaa_failed"),
      logEvent("tengu_mcp_oauth_flow_failure", {
        authMethod: lit("xaa"),
        xaaFailureStage: fromEnum(failureStage),
        idTokenCacheHit: idTokenCacheHit,
      }),
      error
    );
  }
}
/**
 * performMCPOAuthFlow（v2）：MCP OAuth 主流程：XAA 分支；否则选回调端口（配置 callbackPort/重用已注册端口/findAvailablePort）、清旧令牌、起 127.0.0.1 回调服务器、ClaudeAuthProvider 发起授权（CIMD 或 DCR、PKCE）、浏览器打开、等待回调换令牌，记录 tengu_mcp_oauth_flow_* 遥测。
 */
//@ chunk-n1aavqzh.js:24942-33269 facade-exports = performMCPOAuthFlow (0.765)
async function performMCPOAuthFlow_2(serverName, serverConfig, onAuthorizationUrl, abortSignal, options) {
  if (!URL.canParse(serverConfig.url)) {
    logFeatureBad("mcp_oauth_flow", "mcp_oauth_no_valid_url");
    let U =
      "configError" in serverConfig && typeof serverConfig.configError === "string"
        ? serverConfig.configError
        : void 0;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      U ||
        "This server's URL is missing or not a valid URL, so sign-in can't start. Fix the URL in its MCP config (or set the environment variable it uses) and try again.",
      "MCP OAuth refused: no valid server URL",
    );
  }
  if (serverConfig.oauth?.xaa) {
    if (!isXaaEnabled())
      throw Error(
        `XAA is not enabled (set CLAUDE_CODE_ENABLE_XAA=1). Remove 'oauth.xaa' from server '${serverName}' to use the standard consent flow.`,
      );
    (logEvent("tengu_mcp_oauth_flow_start", {
      isOAuthFlow: !0,
      authMethod: lit("xaa"),
      transportType: fromEnum(serverConfig.type),
      ...(ET(serverConfig) && { mcpServerBaseUrl: ET(serverConfig) }),
    }),
      await performMCPXaaAuth_2(
        serverName,
        serverConfig,
        onAuthorizationUrl,
        abortSignal,
        options?.skipBrowserOpen,
      ));
    return;
  }
  let storage = getSecureStorage(),
    serverKey = getServerKey(serverName, serverConfig),
    cachedEntry = (await storage.readAsync())?.mcpOAuth?.[serverKey],
    cachedStepUpScope = cachedEntry?.stepUpScope,
    cachedResourceMetadataUrl = cachedEntry?.discoveryState?.resourceMetadataUrl,
    w = getRegisteredLoopbackPort_2(cachedEntry),
    R;
  if (cachedResourceMetadataUrl)
    try {
      R = new URL(cachedResourceMetadataUrl);
    } catch {
      logMCPDebug(
        serverName,
        `Invalid cached resourceMetadataUrl: ${redactUrlSecrets(cachedResourceMetadataUrl)}`,
      );
    }
  let wwwAuthParams = { scope: cachedStepUpScope, resourceMetadataUrl: R },
    flowAttemptId = randomUUID(),
    F = mcpServerTelemetry(serverConfig, options?.redirectUri);
  logEvent("tengu_mcp_oauth_flow_start", {
    flowAttemptId: ye(flowAttemptId),
    isOAuthFlow: !0,
    transportType: fromEnum(serverConfig.type),
    ...F,
    ...(ET(serverConfig) && { mcpServerBaseUrl: ET(serverConfig) }),
  });
  let x = !1;
  try {
    let configuredCallbackPort = serverConfig.oauth?.callbackPort,
      P = !!options?.redirectUri,
      D = P ? 0 : (configuredCallbackPort ?? (await findAvailablePort(w))),
      W = options?.redirectUri ?? buildRedirectUri(D);
    logMCPDebug(
      serverName,
      P
        ? `Using custom redirectUri: ${redactUrlSecrets(W)} (no localhost listener)`
        : `Using redirect port: ${D}${configuredCallbackPort ? " (from config)" : w && D === w ? " (reusing registered port)" : ""}`,
    );
    try {
      await clearServerTokensFromLocalStorage_2(serverName, serverConfig, {
        preserveClientRegistration: (j) => D === getRegisteredLoopbackPort_2(j) || j.redirectUri === W,
        keepXaaPin: !0,
      });
    } catch (error) {
      logMCPDebug(serverName, `clear stored credentials failed: ${errorMessage(error)}`);
    }
    let O = ht(),
      abortController = new AbortController();
    if (!P) (O.oauthCallbackListeners.get(D)?.abort(), O.oauthCallbackListeners.set(D, abortController));
    let G = new ClaudeAuthProvider_2(
        serverName,
        serverConfig,
        W,
        !0,
        onAuthorizationUrl,
        options?.skipBrowserOpen,
      ),
      redirectUri = Boolean(serverConfig.oauth?.scopes || serverConfig.oauth?.authServerMetadataUrl);
    if (wwwAuthParams.scope && !redirectUri) G.markStepUpPending(wwwAuthParams.scope);
    let me = wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch_2());
    try {
      let j = await fetchAuthServerMetadata(serverName, serverConfig.url, {
        configuredMetadataUrl: serverConfig.oauth?.authServerMetadataUrl,
        fetchFn: me,
        resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
        serverConfigForAnalytics: serverConfig,
      });
      if (j)
        (G.setMetadata(j),
          logMCPDebug(
            serverName,
            `Fetched OAuth metadata with scope: ${redactSensitiveUrlParams("scope", getScopeFromMetadata_2(j) ?? "") || "NONE"}`,
          ));
    } catch (error) {
      if (error instanceof IssuerEchoCrossOriginError) throw error;
      logMCPDebug(serverName, `Failed to fetch OAuth metadata: ${yF(error, serverConfig.url)}`);
    }
    let oauthState = await G.state(),
      server = null,
      timeoutId = null,
      abortHandler = null,
      Ce = null,
      cleanup = () => {
        if (server)
          (server.removeAllListeners(), server.on("error", () => {}), server.close(), (server = null));
        if (timeoutId) (clearTimeout(timeoutId), (timeoutId = null));
        if (abortHandler)
          (abortSignal?.removeEventListener("abort", abortHandler),
            abortController.signal.removeEventListener("abort", abortHandler),
            (abortHandler = null));
        if (O.oauthCallbackListeners.get(D) === abortController) O.oauthCallbackListeners.delete(D);
        if (O.oauthCallbackSubmitters.get(serverName) === Ce) O.oauthCallbackSubmitters.delete(serverName);
        logMCPDebug(serverName, "MCP OAuth server cleaned up");
      },
      { code: code, iss: iss } = await new Promise((j, He) => {
        let ce = !1,
          Re = (resolve, reject) => {
            if (ce) return;
            ((ce = !0), j({ code: resolve, iss: reject }));
          },
          resolveOnce = (code) => {
            if (ce) return;
            ((ce = !0), He(code));
          };
        if (
          ((abortHandler = () => {
            (cleanup(), resolveOnce(new AuthenticationCancelledError_2()));
          }),
          abortSignal?.aborted || abortController.signal.aborted)
        ) {
          abortHandler();
          return;
        }
        (abortSignal?.addEventListener("abort", abortHandler),
          abortController.signal.addEventListener("abort", abortHandler));
        {
          let rejectOnce = (error) => {
            try {
              let parsed = new URL(error),
                code = parsed.searchParams.get("code"),
                state = parsed.searchParams.get("state"),
                error_2 = parsed.searchParams.get("error"),
                ie = Pdn(parsed.searchParams.get("iss"));
              if (!code && !error_2) return !1;
              if (state !== oauthState)
                return (
                  logMCPDebug(
                    serverName,
                    "Ignoring manual callback URL whose state belongs to a different flow",
                  ),
                  !1
                );
              if (error_2) {
                let ue = parsed.searchParams.get("error_description") || "";
                return (cleanup(), resolveOnce(Error(`OAuth error: ${error_2} - ${ue}`)), !0);
              }
              if (!code) return !1;
              return (
                logMCPDebug(serverName, "Received auth code via manual callback URL"),
                cleanup(),
                Re(code, ie),
                !0
              );
            } catch {
              return !1;
            }
          };
          ((Ce = rejectOnce),
            O.oauthCallbackSubmitters.set(serverName, rejectOnce),
            options?.onWaitingForCallback?.(rejectOnce, D, oauthState));
        }
        let Oe = async () => {
          try {
            (logMCPDebug(serverName, "Starting SDK auth"),
              logMCPDebug(serverName, `Server URL: ${redactUrlSecrets(serverConfig.url)}`));
            let N = await DBt(G, {
              serverUrl: serverConfig.url,
              scope: wwwAuthParams.scope,
              resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
              fetchFn: me,
              skipIssuerMetadataValidation: !0,
            });
            if ((logMCPDebug(serverName, `Initial auth result: ${N}`), N !== "REDIRECT"))
              logMCPDebug(serverName, `Unexpected auth result, expected REDIRECT: ${N}`);
          } catch (error) {
            (logMCPDebug(serverName, `SDK auth error: ${yF(error, serverConfig.url)}`),
              cleanup(),
              resolveOnce(
                Object.assign(
                  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `SDK auth failed: ${yF(error, serverConfig.url)}`,
                    "SDK auth failed",
                  ),
                  { cause: error },
                ),
              ));
          }
        };
        if (P) Oe();
        else
          ((server = createServer((req, res) => {
            let parsedUrl = parse(req.url || "", !0);
            if (parsedUrl.pathname === "/callback") {
              let code = parsedUrl.query.code,
                state = parsedUrl.query.state,
                error = parsedUrl.query.error,
                errorDescription = parsedUrl.query.error_description,
                errorUri = parsedUrl.query.error_uri,
                sanitizedError = Pdn(parsedUrl.query.iss);
              if (state !== oauthState) {
                (res.writeHead(400, { "Content-Type": "text/html" }),
                  res.end(
                    callbackPageBody({
                      ok: !1,
                      heading: "Authentication failed",
                      message: "Invalid state parameter. Close this tab and try again from Claude Code.",
                    }),
                  ));
                return;
              }
              if (error) {
                (res.writeHead(200, { "Content-Type": "text/html" }),
                  res.end(
                    callbackPageBody({
                      ok: !1,
                      heading: "Authentication failed",
                      message: "Close this tab and try again from Claude Code.",
                      detail: `${String(error)}: ${errorDescription ?? ""}`,
                    }),
                  ),
                  cleanup());
                let errorMessage = `OAuth error: ${error}`;
                if (errorDescription) errorMessage += ` - ${errorDescription}`;
                if (errorUri) errorMessage += ` (See: ${errorUri})`;
                resolveOnce(Error(errorMessage));
                return;
              }
              if (code)
                (res.writeHead(200, { "Content-Type": "text/html" }),
                  res.end(
                    callbackPageBody({
                      ok: !0,
                      heading: "Authentication successful",
                      message: "You can close this tab and return to Claude Code.",
                    }),
                  ),
                  cleanup(),
                  Re(code, sanitizedError));
            } else
              (res.writeHead(404, { "Content-Type": "text/html" }),
                res.end(
                  callbackPageBody({
                    ok: !1,
                    heading: "Not found",
                    message: `This is the Claude Code MCP OAuth callback listener. It only handles /callback. If your OAuth provider redirected here, the registered redirect_uri must be ${redactUrlSecrets(W)}.`,
                  }),
                ));
          })),
            server.on("error", (err) => {
              if ((cleanup(), err.code === "EADDRINUSE")) {
                let B =
                  getPlatform() === "windows" ? `netstat -ano | findstr :${D}` : `lsof -ti:${D} -sTCP:LISTEN`;
                resolveOnce(
                  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `OAuth callback port ${D} is already in use \u2014 another process may be holding it. ` +
                      `Run \`${B}\` to find it.`,
                    "OAuth callback port already in use",
                  ),
                );
              } else
                resolveOnce(
                  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `OAuth callback server failed: ${err.message}`,
                    "OAuth callback server failed",
                  ),
                );
            }),
            server.listen(D, "127.0.0.1", () => void Oe()),
            server.unref());
        ((timeoutId = setTimeout(
          (cleanup, rejectOnce) => {
            (cleanup(),
              rejectOnce(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  "Authentication timeout",
                  "Authentication timeout",
                ),
              ));
          },
          300000,
          cleanup,
          resolveOnce,
        )),
          timeoutId.unref());
      });
    ((x = !0), logMCPDebug(serverName, "Completing auth flow with authorization code"), Ny().record(code));
    let result = await DBt(G, {
      serverUrl: serverConfig.url,
      authorizationCode: code,
      iss: iss,
      resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
      fetchFn: wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch_2()),
      skipIssuerMetadataValidation: !0,
    });
    if ((logMCPDebug(serverName, `Auth result: ${result}`), result === "AUTHORIZED")) {
      let j = await G.tokens().catch(() => {
        return;
      });
      if ((logMCPDebug(serverName, `Tokens after auth: ${j ? "Present" : "Missing"}`), j))
        logMCPDebug(serverName, `Token expires_in: ${j.expires_in}`);
      (logEvent("tengu_mcp_oauth_flow_success", {
        flowAttemptId: ye(flowAttemptId),
        transportType: fromEnum(serverConfig.type),
        ...F,
        ...(ET(serverConfig) && { mcpServerBaseUrl: ET(serverConfig) }),
      }),
        logFeatureOk("mcp_oauth_flow"));
    } else
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Unexpected auth result: " + result,
        "Unexpected auth result",
      );
  } catch (error) {
    logMCPDebug(serverName, `Error during auth completion: ${yF(error, serverConfig.url)}`);
    let reason = "unknown",
      D,
      W,
      msg = errorMessage(error),
      M = error instanceof Error ? error.cause : void 0;
    if (error instanceof AuthenticationCancelledError_2) reason = "cancelled";
    else if (error instanceof IssuerEchoCrossOriginError || M instanceof IssuerEchoCrossOriginError)
      reason = "issuer_echo_denied";
    else if (error instanceof D_t || M instanceof D_t)
      reason =
        [error, M].find((z) => z instanceof D_t)?.kind === "metadata"
          ? "issuer_echo_mismatch"
          : "issuer_response_mismatch";
    else if (/AADSTS\d/.test(msg)) reason = "entra_specific";
    else if (/redirect[_ ]uri/i.test(msg)) reason = "redirect_uri_mismatch";
    else if (x && (isZodError_2(error) || isZodError_2(M))) reason = "token_response_schema_rejected";
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
    else if (msg.includes("SDK auth failed")) reason = classifySdkAuthFailure_2(msg, M);
    let found = [M, error].find((L) => L instanceof XNr),
      ae = (M instanceof Error ? M : error instanceof Error ? error : null)?.message.match(/^HTTP (\d{3})\b/);
    if (found) W = found.status;
    else if (ae) W = Number(ae[1]);
    if (M instanceof OAuthError) D = M.code;
    if (error instanceof OAuthError) {
      if (((D = error.code), error.code === "invalid_client" || error.code === "unauthorized_client")) {
        let L = getServerKey(serverName, serverConfig);
        try {
          await getSecureStorage().mutate((z) => {
            let H = z.mcpOAuth?.[L];
            if (!H) return z;
            return {
              ...z,
              mcpOAuth: { ...z.mcpOAuth, [L]: { ...H, clientId: void 0, clientSecret: void 0 } },
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
      let L = getServerKey(serverName, serverConfig);
      await getSecureStorage()
        .mutate((z) => {
          let H = z.mcpOAuth?.[L];
          if (!H?.clientId || H.accessToken || H.refreshToken || H.clientId !== cachedEntry?.clientId)
            return z;
          return { ...z, mcpOAuth: { ...z.mcpOAuth, [L]: { ...H, clientId: void 0, clientSecret: void 0 } } };
        })
        .catch((z) => logMCPDebug(serverName, `drop clientId failed: ${errorMessage(z)}`));
    }
    if (reason !== "cancelled") logFeatureBad("mcp_oauth_flow", "mcp_oauth_flow_failed");
    logEvent("tengu_mcp_oauth_flow_error", {
      flowAttemptId: ye(flowAttemptId),
      reason: fromEnum(reason),
      error_code: D === void 0 ? void 0 : sanitizeOAuthErrorCodeForAnalytics_2(D),
      http_status: fromNumberOpt(W),
      transportType: fromEnum(serverConfig.type),
      ...F,
      ...(ET(serverConfig) && { mcpServerBaseUrl: ET(serverConfig) }),
    });
    let serverKey = yF(error, serverConfig.url);
    throw serverKey === errorMessage(error) ? error : Error(serverKey, { cause: error });
  }
}
/**
 * wrapFetchWithAuthChallengeDetection：记录 401/403 认证挑战与 insufficient_scope（step-up）信息到 provider。
 */
//@ chunk-n1aavqzh.js:33269-33798 facade-exports
function wrapFetchWithStepUpDetection_2(fetchFn, authProvider) {
  return async (n, r) => {
    let s = await fetchFn(n, r);
    if (s.status === 401 || s.status === 403) authProvider.sawAuthChallenge = !0;
    if (
      (authProvider.noteServerAnswer(
        n,
        s.status === 401 || (s.status === 403 && Mze(s).error === "insufficient_scope"),
      ),
      s.status === 401 || s.status === 403)
    )
      authProvider.noteAuthRejection(n, s.status, new Headers(r?.headers).get("authorization"));
    if (!new Headers(r?.headers).has("authorization")) return s;
    if (s.status === 403) {
      let { error: error, scope: scope } = Mze(s);
      if (error === "insufficient_scope" && scope) authProvider.markStepUpPending(scope);
    } else if (s.status === 401) authProvider.clearStepUpPending();
    return s;
  };
}
/**
 * ClaudeAuthProvider（v2）：OAuthClientProvider 实现：客户端元数据（CIMD URL 或 DCR）、令牌读写（安全存储 mcpOAuth[serverKey]）、XAA 静默刷新、刷新令牌并发协调、step-up scope、发现状态缓存、重定向到授权页。
 */
//@ chunk-n1aavqzh.js:33798-62345 facade-exports
class ClaudeAuthProvider_2 {
  serverName;
  serverConfig;
  redirectUri;
  handleRedirection;
  _codeVerifier;
  _flowDiscoveryState;
  _flowDiscoveryStateAt = 0;
  _flowDiscoveryStateFromConfiguredUrl = !1;
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
  constructor(e, t, n = buildRedirectUri(), r = !1, s, S) {
    ((this.serverName = e),
      (this.serverConfig = t),
      (this.redirectUri = n),
      (this.handleRedirection = r),
      (this.onAuthorizationUrlCallback = s),
      (this.skipBrowserOpen = S ?? !1),
      (this._presented = Ny()));
  }
  get redirectUrl() {
    return this.redirectUri;
  }
  get authorizationUrl() {
    return this._authorizationUrl;
  }
  get clientMetadata() {
    let e = {
        client_name: `Claude Code (${this.serverName})`,
        redirect_uris: [this.redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      curatedMetadataScope = this.getCuratedMetadataScope();
    if (curatedMetadataScope)
      ((e.scope = curatedMetadataScope),
        logMCPDebug(
          this.serverName,
          `Using scope from metadata: ${redactSensitiveUrlParams("scope", e.scope)}`,
        ));
    return e;
  }
  get clientMetadataUrl() {
    if (!isLoopbackCallbackUri_2(this.redirectUri)) {
      logMCPDebug(
        this.serverName,
        `redirectUri ${redactUrlSecrets(this.redirectUri)} is not the document's loopback /callback: withholding CIMD client_id \u2014 registering via DCR`,
      );
      return;
    }
    let e = getClientMetadataDocumentUrl_2();
    if (e !== MCP_CLIENT_METADATA_URL) logMCPDebug(this.serverName, `Using CIMD URL from env: ${e}`);
    return e;
  }
  setMetadata(e) {
    ((this._metadata = e), (this._metadataEchoMode = isIssuerStrictEchoEnabled() ? "enforce" : "observe"));
  }
  getCuratedMetadataScope() {
    let e = getScopeFromMetadata_2(this._metadata);
    if (e !== void 0) return e;
    if (this.serverConfig.oauth?.authServerMetadataUrl && Array.isArray(this._metadata?.scopes_supported))
      return this._metadata.scopes_supported.join(" ");
    return;
  }
  markStepUpPending(e) {
    ((this._pendingStepUpScope = e),
      logMCPDebug(this.serverName, `Marked step-up pending: ${redactSensitiveUrlParams("scope", e)}`));
  }
  get pendingStepUpScope() {
    return this._pendingStepUpScope;
  }
  get lastAuthRejection() {
    return this._lastAuthRejection;
  }
  noteAuthRejection(e, t, n) {
    let url = this.serverConfig.url;
    if (String(e) === (URL.canParse(url) ? new URL(url).href : url))
      this._lastAuthRejection = { status: t, accessToken: n?.startsWith("Bearer ") ? n.slice(7) : void 0 };
  }
  clearStepUpPending() {
    this._pendingStepUpScope = void 0;
  }
  clearStepUpPendingOnCredentialGone() {
    if (!this.handleRedirection) this.clearStepUpPending();
  }
  sawAuthChallenge = !1;
  authChallengeOpen = !1;
  noteServerAnswer(e, t) {
    let url = this.serverConfig.url;
    if (String(e) === (URL.canParse(url) ? new URL(url).href : url)) this.authChallengeOpen = t;
  }
  registrationOfferedByDiscovery = !1;
  async readCredentialStore() {
    let e = await readSecureStorageForMcp(
      this.handleRedirection
        ? void 0
        : {
            serverName: this.serverName,
            serverConfig: this.serverConfig,
            challenged: this.authChallengeOpen,
          },
    );
    if (e === READ_FAILED)
      throw (
        logMCPDebug(
          this.serverName,
          "Credential store could not be read (the login keychain may be locked); not reporting credentials as absent",
        ),
        new McpCredentialStoreUnavailableError(this.serverName)
      );
    return e;
  }
  async state() {
    if (!this._state)
      ((this._state = randomBytes(32).toString("base64url")),
        logMCPDebug(this.serverName, "Generated new OAuth state"));
    return this._state;
  }
  async clientInformation() {
    let clientInformation = await this.resolveClientInformation();
    return (
      this._presented.record(clientInformation?.client_secret),
      this._presented.record(basicAuthValue(clientInformation?.client_id, clientInformation?.client_secret)),
      clientInformation
    );
  }
  async resolveClientInformation() {
    let credentialStore = await this.readCredentialStore(),
      t = getServerKey(this.serverName, this.serverConfig),
      n = credentialStore?.mcpOAuthClientConfig?.[t]?.clientSecret,
      r = this.serverConfig.oauth?.clientId,
      s = credentialStore?.mcpOAuth?.[t],
      S =
        this.handleRedirection &&
        isClientMetadataDocumentId_2(s?.clientId) &&
        !isLoopbackCallbackUri_2(this.redirectUri);
    if (S) {
      if (
        (logMCPDebug(
          this.serverName,
          `Stored client_id is the CIMD document URL (loopback /callback only); current redirectUri is ${redactUrlSecrets(this.redirectUri)} \u2014 ${r ? "serving the configured client" : "registering via DCR"} instead`,
        ),
        r)
      )
        await this.patchStoredClientEntry(
          t,
          { clientId: r, clientSecret: void 0, redirectUri: this.redirectUri },
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
        if (!r) {
          logMCPDebug(
            this.serverName,
            `Cached client_id was registered for ${A}; current redirectUri is ${redactUrlSecrets(this.redirectUri)} \u2014 forcing re-DCR`,
          );
          return;
        }
        if (s.clientId !== r)
          return (
            logMCPDebug(
              this.serverName,
              `Stored client_id is stale and its redirectUri ${A} predates ${redactUrlSecrets(this.redirectUri)} \u2014 serving the configured client (no registration to redo)`,
            ),
            await this.patchStoredClientEntry(
              t,
              { clientId: r, clientSecret: void 0, redirectUri: this.redirectUri },
              "stale client_id repair",
            ),
            (this._lastServedClientId = r),
            { client_id: r, issuer: s.issuer, client_secret: n }
          );
        (logMCPDebug(
          this.serverName,
          `Stored redirectUri ${A} predates ${redactUrlSecrets(this.redirectUri)}, but the client_id is the configured one \u2014 serving it (no registration to redo)`,
        ),
          await this.patchStoredClientEntry(
            t,
            { redirectUri: this.redirectUri },
            "stored redirectUri convergence",
          ));
      }
      return (
        logMCPDebug(this.serverName, "Found client info"),
        (this._lastServedClientId = s.clientId),
        {
          client_id: s.clientId,
          issuer: s.issuer,
          client_secret: s.clientSecret ?? (s.clientId === r ? n : void 0),
        }
      );
    }
    if (r)
      return (
        logMCPDebug(this.serverName, "Using pre-configured client ID"),
        (this._lastServedClientId = r),
        { client_id: r, client_secret: n }
      );
    if (!this.handleRedirection && this.registrationOfferedByDiscovery && !s?.accessToken && !s?.refreshToken)
      throw (
        logMCPDebug(
          this.serverName,
          "No client info found; deferring client registration to authentication time",
        ),
        new McpClientRegistrationDeferredError_2(this.serverName)
      );
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
            return { ...s, mcpOAuth: { ...s.mcpOAuth, [e]: { ...S, ...t } } };
          })
        )?.success
      )
        logMCPDebug(this.serverName, `${n} resolved unsuccessful`);
    } catch (error) {
      logMCPDebug(this.serverName, `${n} failed: ${errorMessage(error)}`);
    }
  }
  async saveClientInformation(e) {
    (this._presented.record(e.client_secret),
      this._presented.record(basicAuthValue(e.client_id, e.client_secret)));
    let t = getServerKey(this.serverName, this.serverConfig);
    try {
      if (
        (
          await getSecureStorage().mutate((r) => ({
            ...r,
            mcpOAuth: {
              ...r.mcpOAuth,
              [t]: {
                ...r.mcpOAuth?.[t],
                serverName: this.serverName,
                serverUrl: this.serverConfig.url,
                clientId: e.client_id,
                clientSecret:
                  e.issuer !== void 0 &&
                  e.client_id === r.mcpOAuth?.[t]?.clientId &&
                  r.mcpOAuth?.[t]?.clientSecret === void 0 &&
                  e.client_id === this.serverConfig.oauth?.clientId
                    ? void 0
                    : e.client_secret,
                issuer: e.issuer ?? r.mcpOAuth?.[t]?.issuer,
                redirectUri:
                  !this.handleRedirection && e.client_id === r.mcpOAuth?.[t]?.clientId
                    ? r.mcpOAuth?.[t]?.redirectUri
                    : this.redirectUri,
                accessToken: r.mcpOAuth?.[t]?.accessToken || "",
                expiresAt: r.mcpOAuth?.[t]?.expiresAt,
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
    let credentialStore = await this.readCredentialStore(),
      t = getServerKey(this.serverName, this.serverConfig),
      n = credentialStore?.mcpOAuth?.[t];
    if (
      isXaaEnabled() &&
      this.serverConfig.oauth?.xaa &&
      !n?.refreshToken &&
      (!n?.accessToken || (n.expiresAt != null && (n.expiresAt - Date.now()) / 1000 <= 300))
    ) {
      if (!this._refreshInProgress)
        (logMCPDebug(
          this.serverName,
          n
            ? "XAA: access_token expiring, attempting silent exchange"
            : "XAA: no access_token yet, attempting silent exchange",
        ),
          (this._refreshInProgress = this.xaaRefresh().finally(() => {
            this._refreshInProgress = void 0;
          })));
      try {
        let _refreshInProgress = await this._refreshInProgress;
        if (_refreshInProgress)
          return (
            (this._lastServedAccessToken = _refreshInProgress.access_token),
            this._presented.record(_refreshInProgress.access_token),
            this._presented.record(_refreshInProgress.refresh_token),
            (this._lastServedRefreshToken = _refreshInProgress.refresh_token ?? this._lastServedRefreshToken),
            { ..._refreshInProgress, issuer: n?.issuer }
          );
      } catch (error) {
        logMCPDebug(this.serverName, `XAA silent exchange failed: ${errorMessage(error)}`);
      }
    }
    if (!n) {
      (logMCPDebug(this.serverName, "No token data found"), this.clearStepUpPendingOnCredentialGone());
      return;
    }
    if (!n.accessToken) {
      (logMCPDebug(this.serverName, "No access token in storage"), this.clearStepUpPendingOnCredentialGone());
      return;
    }
    if (Adn(t, n.accessToken)) {
      logMCPDebug(
        this.serverName,
        "Not sending the stored access token, because the server rejected it earlier in this session",
      );
      return;
    }
    ((this._lastServedAccessToken = n.accessToken),
      this._presented.record(n.accessToken),
      this._presented.record(n.refreshToken),
      (this._lastServedRefreshToken = n.refreshToken));
    let r = n.expiresAt != null ? (n.expiresAt - Date.now()) / 1000 : void 0,
      _pendingStepUpScope = this._pendingStepUpScope,
      S = _pendingStepUpScope !== void 0;
    if (S)
      logMCPDebug(
        this.serverName,
        `Step-up pending (${redactSensitiveUrlParams("scope", _pendingStepUpScope)}), omitting refresh_token`,
      );
    if (r != null && r <= 0 && !n.refreshToken) {
      (logMCPDebug(this.serverName, "Token expired without refresh token"),
        this.clearStepUpPendingOnCredentialGone());
      return;
    }
    if (r != null && r <= 300 && n.refreshToken && !S) {
      if (!this._refreshInProgress)
        (logMCPDebug(this.serverName, `Token expires in ${Math.floor(r)}s, attempting proactive refresh`),
          (this._refreshInProgress = this.refreshAuthorization(n.refreshToken).finally(() => {
            this._refreshInProgress = void 0;
          })));
      else logMCPDebug(this.serverName, "Token refresh already in progress, reusing existing promise");
      try {
        let _refreshInProgress = await this._refreshInProgress;
        if (_refreshInProgress)
          return (
            logMCPDebug(this.serverName, "Token refreshed successfully"),
            (this._lastServedAccessToken = _refreshInProgress.access_token),
            this._presented.record(_refreshInProgress.access_token),
            this._presented.record(_refreshInProgress.refresh_token),
            (this._lastServedRefreshToken = _refreshInProgress.refresh_token ?? this._lastServedRefreshToken),
            { ..._refreshInProgress, issuer: n?.issuer }
          );
        logMCPDebug(this.serverName, "Token refresh failed, returning current tokens");
      } catch (error) {
        logMCPDebug(this.serverName, `Token refresh error: ${yF(error, this.serverConfig.url)}`);
      }
    }
    let h = {
      access_token: n.accessToken,
      refresh_token: S ? void 0 : n.refreshToken,
      expires_in: r,
      scope: n.scope,
      token_type: "Bearer",
      issuer: n.issuer,
    };
    return (
      logMCPDebug(this.serverName, "Returning tokens"),
      logMCPDebug(this.serverName, `Has refresh token: ${!!h.refresh_token}`),
      logMCPDebug(this.serverName, r != null ? `Expires in: ${Math.floor(r)}s` : "No expiration specified"),
      h
    );
  }
  async saveTokens(e) {
    (this._presented.record(e.access_token), this._presented.record(e.refresh_token));
    let t = e.access_token !== this._lastServedAccessToken,
      _flowDiscoveryStateAt = this._flowDiscoveryStateAt;
    if (t && this.handleRedirection) this._pendingStepUpScope = void 0;
    let r = getServerKey(this.serverName, this.serverConfig);
    (logMCPDebug(this.serverName, "Saving tokens"),
      logMCPDebug(this.serverName, `Token expires in: ${e.expires_in}`),
      logMCPDebug(this.serverName, `Has refresh token: ${!!e.refresh_token}`));
    let s =
        this._servedOverrideAuthorizationServerUrl === void 0
          ? this._discoveredAuthorizationServer
          : { authorizationServerUrl: this._servedOverrideAuthorizationServerUrl, oauthMetadataFound: !0 },
      S = this.servedMetadataUrl() ?? this._discoveredAuthorizationServer?.servedMetadataUrl,
      h,
      A;
    try {
      h = await getSecureStorage().mutate((l) => ({
        ...l,
        mcpOAuth: {
          ...l.mcpOAuth,
          [r]: {
            ...l.mcpOAuth?.[r],
            serverName: this.serverName,
            serverUrl: this.serverConfig.url,
            accessToken: e.access_token,
            refreshToken: e.refresh_token ?? l.mcpOAuth?.[r]?.refreshToken,
            expiresAt: e.expires_in != null ? Date.now() + e.expires_in * 1000 : void 0,
            scope: e.scope,
            issuer: e.issuer ?? l.mcpOAuth?.[r]?.issuer,
            discoveryState: withoutTokenlessRejection(
              mergeSignInAuth({
                previous: l.mcpOAuth?.[r]?.discoveryState,
                signIn: s,
                servedMetadataUrl: S,
                interactiveSignIn: this.handleRedirection,
              }),
            ),
          },
        },
      }));
    } catch (error) {
      A = error;
    }
    if (h?.success)
      ((this._lastServedAccessToken = e.access_token),
        (this._lastServedRefreshToken = e.refresh_token ?? this._lastServedRefreshToken),
        recordSavedAccessToken(r, e.access_token));
    if ((this.logTokenPersistFailed(h, A), t && this._flowDiscoveryStateAt === _flowDiscoveryStateAt))
      ((this._flowDiscoveryState = void 0), (this._flowDiscoveryStateAt = 0));
  }
  logTokenPersistFailed(e, t) {
    logStorageWriteFailure_2(this.serverName, this.serverConfig, e, t);
  }
  async xaaRefresh() {
    let e = getXaaIdpSettings();
    if (!e) return;
    let t = await getCachedIdpIdToken_2(e.issuer);
    if (!t) {
      logMCPDebug(this.serverName, "XAA: id_token not cached, needs interactive re-auth");
      return;
    }
    let n = this.serverConfig.oauth?.clientId,
      r = await getMcpClientConfig_2(this.serverName, this.serverConfig);
    if (!n || !r?.clientSecret) {
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
    let S = s ? void 0 : await getSecureStorage().readAsyncStrict?.(void 0, { inaccessibleAs: "failure" });
    if (S === READ_FAILED) {
      logMCPDebug(this.serverName, "XAA: no pin and the keychain is unreadable");
      return;
    }
    let h =
        s ?? xaaPinnedServer(S?.mcpOAuth?.[getServerKey(this.serverName, this.serverConfig)]?.discoveryState),
      A = await getIdpClientSecret_2(e.issuer),
      l;
    try {
      l = await discoverOidc_2(e.issuer);
    } catch (error) {
      logMCPDebug(this.serverName, `XAA: OIDC discovery failed in silent refresh: ${errorMessage(error)}`);
      return;
    }
    this._presented.record(r.clientSecret);
    try {
      let y = await performCrossAppAccess(
          this.serverConfig.url,
          {
            clientId: n,
            clientSecret: r.clientSecret,
            idpClientId: e.clientId,
            idpClientSecret: A,
            idpIdToken: t,
            idpTokenEndpoint: l.token_endpoint,
            pinnedAuthorizationServer: h,
          },
          this.serverName,
        ),
        w = getServerKey(this.serverName, this.serverConfig),
        R,
        T;
      try {
        R = await getSecureStorage().mutate((E) => {
          let F = E.mcpOAuth?.[w];
          return {
            ...E,
            mcpOAuth: {
              ...E.mcpOAuth,
              [w]: {
                ...F,
                serverName: this.serverName,
                serverUrl: this.serverConfig.url,
                accessToken: y.access_token,
                refreshToken: y.refresh_token ?? F?.refreshToken,
                expiresAt: y.expires_in != null ? Date.now() + y.expires_in * 1000 : void 0,
                scope: y.scope,
                clientId: n,
                clientSecret: r.clientSecret,
                discoveryState: pinXaaAuth({
                  previous: F?.discoveryState,
                  issuedBy: y.authorizationServerUrl,
                  interactiveSignIn: !1,
                }),
              },
            },
          };
        });
      } catch (error) {
        T = error;
      }
      return (
        this.logTokenPersistFailed(R, T),
        {
          access_token: y.access_token,
          token_type: "Bearer",
          expires_in: y.expires_in,
          scope: y.scope,
          refresh_token: y.refresh_token,
        }
      );
    } catch (error) {
      if (error instanceof XaaTokenExchangeError_2 && error.shouldClearIdToken)
        (await clearIdpIdToken_2(e.issuer),
          logMCPDebug(this.serverName, "XAA: cleared id_token after exchange failure"));
      throw error;
    }
  }
  async redirectToAuthorization(e) {
    let t = this._pendingStepUpScope
        ? void 0
        : this.serverConfig.oauth?.scopes ||
          (this.serverConfig.oauth?.authServerMetadataUrl ? this.getCuratedMetadataScope() : void 0),
      n = e.searchParams.get("scope"),
      r = t ?? n;
    if (r !== n)
      logMCPDebug(
        this.serverName,
        `Overrode authorization scope from ${n ? redactSensitiveUrlParams("scope", n) : "NONE"} to configured: ${r ? redactSensitiveUrlParams("scope", r) : "NONE"}`,
      );
    let s = r === null ? null : maybeAppendOfflineAccess_2(r, this._metadata);
    if (s !== null && s !== n) {
      if ((e.searchParams.set("scope", s), s !== t))
        logMCPDebug(this.serverName, "Appended offline_access to authorization scope");
    }
    let S = isEntraLoginUrl_2(e),
      all = e.searchParams.getAll("prompt"),
      A = S ? all.filter((E) => E !== "consent") : all;
    if (A.length !== all.length || A.length > 1) {
      if ((e.searchParams.delete("prompt"), A.length > 0))
        e.searchParams.set("prompt", A.includes("consent") ? "consent" : A.at(-1));
    }
    this._authorizationUrl = e.toString();
    let l = e.searchParams.get("scope");
    if (
      (logMCPDebug(this.serverName, `Authorization URL: ${authorizationUrlForDebugLog_2(e)}`),
      logMCPDebug(
        this.serverName,
        `Scopes in URL: ${l ? redactSensitiveUrlParams("scope", l) : "NOT FOUND"}`,
      ),
      l)
    )
      ((this._scopes = l),
        logMCPDebug(
          this.serverName,
          `Captured scopes from authorization URL: ${redactSensitiveUrlParams("scope", l)}`,
        ));
    else {
      let curatedMetadataScope = this.getCuratedMetadataScope();
      if (curatedMetadataScope)
        ((this._scopes = curatedMetadataScope),
          logMCPDebug(
            this.serverName,
            `Using scopes from metadata: ${redactSensitiveUrlParams("scope", curatedMetadataScope)}`,
          ));
      else logMCPDebug(this.serverName, "No scopes available from URL or metadata");
    }
    if (this._scopes && !this.handleRedirection && this._pendingStepUpScope) {
      let E = getServerKey(this.serverName, this.serverConfig),
        _scopes = this._scopes,
        x = !1;
      try {
        await getSecureStorage().mutate((U) => {
          let P = U.mcpOAuth?.[E];
          if (!P) return U;
          return ((x = !0), { ...U, mcpOAuth: { ...U.mcpOAuth, [E]: { ...P, stepUpScope: _scopes } } });
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
    let str = e.toString();
    if (!str.startsWith("http://") && !str.startsWith("https://"))
      throw Error("Invalid authorization URL: must use http:// or https:// scheme");
    logMCPDebug(this.serverName, "Redirecting to authorization URL");
    let w = authorizationUrlForDebugLog_2(e);
    if ((logMCPDebug(this.serverName, `Authorization URL: ${w}`), this.onAuthorizationUrlCallback))
      this.onAuthorizationUrlCallback(str);
    if (this.skipBrowserOpen) {
      logMCPDebug(this.serverName, `Skipping browser open (skipBrowserOpen=true). URL: ${w}`);
      return;
    }
    let R = isBrowserUnavailable();
    if (R) logMCPDebug(this.serverName, `Skipping browser open (headless environment). URL: ${w}`);
    else logMCPDebug(this.serverName, `Opening authorization URL: ${w}`);
    let T = R ? !1 : await fi(str);
    if (
      (logEvent("tengu_mcp_oauth_browser_open", {
        success: T,
        headless: R,
        platform: fromEnum(getPlatform()),
      }),
      !R && !T)
    )
      logMCPDebug(this.serverName, "Browser didn't open automatically. URL is shown in UI.");
  }
  async saveCodeVerifier(e) {
    (logMCPDebug(this.serverName, "Saving code verifier"), (this._codeVerifier = e));
  }
  async codeVerifier() {
    if (!this._codeVerifier)
      throw (logMCPDebug(this.serverName, "No code verifier saved"), Error("No code verifier saved"));
    return (
      logMCPDebug(this.serverName, "Returning code verifier"),
      this._presented.record(this._codeVerifier),
      this._codeVerifier
    );
  }
  async invalidateCredentials(e) {
    if (e === "verifier") {
      ((this._codeVerifier = void 0),
        logMCPDebug(this.serverName, "Invalidated credentials (scope: verifier)"));
      return;
    }
    let t = e,
      n = getServerKey(this.serverName, this.serverConfig),
      r = !1;
    try {
      let _lastServedClientId = this._lastServedClientId,
        _lastServedAccessToken = this._lastServedAccessToken,
        _lastServedRefreshToken = this._lastServedRefreshToken;
      await getSecureStorage().mutate((A) => {
        let l = A.mcpOAuth?.[n];
        if (!l) return A;
        let y = { ...A.mcpOAuth };
        switch (t) {
          case "all": {
            let w =
                _lastServedAccessToken != null && !!l.accessToken && l.accessToken !== _lastServedAccessToken,
              R = _lastServedClientId != null && l.clientId != null && l.clientId !== _lastServedClientId;
            if (w || R)
              return (
                logMCPDebug(
                  this.serverName,
                  `invalidateCredentials('all') preserved: ${w ? "foreign token" : "concurrent re-registration"}`,
                ),
                A
              );
            if (!l.clientId && !l.refreshToken && l.accessToken === "") return A;
            y[n] = {
              serverName: l.serverName,
              serverUrl: l.serverUrl,
              accessToken: "",
              ...(l.discoveryState && { discoveryState: l.discoveryState }),
              ...(l.stepUpScope && { stepUpScope: l.stepUpScope }),
            };
            break;
          }
          case "client":
            y[n] = { ...l, clientId: void 0, clientSecret: void 0 };
            break;
          case "tokens": {
            if (
              (_lastServedRefreshToken != null &&
                l.refreshToken &&
                l.refreshToken !== _lastServedRefreshToken) ||
              (_lastServedAccessToken != null && !!l.accessToken && l.accessToken !== _lastServedAccessToken)
            )
              return (
                logMCPDebug(
                  this.serverName,
                  "invalidateCredentials('tokens') preserved: concurrent rotation",
                ),
                A
              );
            y[n] = { ...l, accessToken: "", refreshToken: void 0, expiresAt: 0 };
            break;
          }
          case "discovery": {
            if (!l.discoveryState?.authorizationServerMetadata)
              return (
                logMCPDebug(
                  this.serverName,
                  "invalidateCredentials('discovery') preserved: concurrent URL-only re-save",
                ),
                A
              );
            y[n] = { ...l, discoveryState: authDiscoveryState(l.discoveryState) };
            break;
          }
        }
        return ((r = !0), { ...A, mcpOAuth: y });
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
    ((this._flowDiscoveryState = e),
      (this._flowDiscoveryStateAt = Date.now()),
      (this._flowDiscoveryStateFromConfiguredUrl = !1));
    let t = getServerKey(this.serverName, this.serverConfig);
    logMCPDebug(
      this.serverName,
      `Saving discovery state (authServer: ${redactUrlSecrets(e.authorizationServerUrl)})`,
    );
    let authorizationServerMetadata = e.authorizationServerMetadata;
    this.registrationOfferedByDiscovery =
      authorizationServerMetadata !== void 0 &&
      (typeof authorizationServerMetadata.registration_endpoint === "string" ||
        (authorizationServerMetadata.client_id_metadata_document_supported === !0 &&
          this.clientMetadataUrl !== void 0));
    let r = {
        authorizationServerUrl: e.authorizationServerUrl,
        oauthMetadataFound: !!e.authorizationServerMetadata,
      },
      s =
        (e.authorizationServerMetadata !== void 0
          ? this._servedOverrideDocuments.get(e.authorizationServerMetadata)
          : void 0) ?? this.servedMetadataUrl();
    this._discoveredAuthorizationServer = { ...r, servedMetadataUrl: s };
    try {
      await getSecureStorage().mutate((S) => {
        let h = mergeDiscoveredAuth({
          previous: S.mcpOAuth?.[t]?.discoveryState,
          discovered: r,
          servedMetadataUrl: s,
        });
        return {
          ...S,
          mcpOAuth: {
            ...S.mcpOAuth,
            [t]: {
              ...S.mcpOAuth?.[t],
              serverName: this.serverName,
              serverUrl: this.serverConfig.url,
              accessToken: S.mcpOAuth?.[t]?.accessToken || "",
              expiresAt: S.mcpOAuth?.[t]?.expiresAt,
              discoveryState: {
                ...h,
                resourceMetadataUrl: e.resourceMetadataUrl,
                tokenlessRejectedAt: tokenlessRejectedAt(t, S.mcpOAuth?.[t]),
                registrationNotOfferedAt:
                  authorizationServerMetadata === void 0
                    ? S.mcpOAuth?.[t]?.discoveryState?.registrationNotOfferedAt
                    : typeof authorizationServerMetadata.registration_endpoint !== "string" &&
                        authorizationServerMetadata.client_id_metadata_document_supported !== !0
                      ? Date.now()
                      : void 0,
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
        if (error instanceof IssuerEchoCrossOriginError && this._flowDiscoveryState === e)
          ((this._flowDiscoveryState = void 0), (this._flowDiscoveryStateAt = 0));
        throw error;
      }
    return e;
  }
  servedMetadataUrl() {
    return this._servedOverrideAuthorizationServerUrl === void 0
      ? void 0
      : this.serverConfig.oauth?.authServerMetadataUrl;
  }
  async discoveryState() {
    this._servedOverrideAuthorizationServerUrl = void 0;
    let e = this.serverConfig.oauth?.authServerMetadataUrl;
    if (this.authChallengeOpen) await this.readCredentialStore();
    let t = await hasStoredOAuthState_2(this.serverName, this.serverConfig);
    if (t === READ_FAILED) {
      if (this.serverConfig.oauth?.xaa) throw new McpCredentialStoreUnavailableError(this.serverName);
    } else if (t) return { authorizationServerUrl: t };
    if (e) {
      logMCPDebug(this.serverName, `Fetching metadata from configured URL: ${redactUrlSecrets(e)}`);
      try {
        let A = await fetchAuthServerMetadata(this.serverName, this.serverConfig.url, {
          configuredMetadataUrl: e,
          fetchFn: wrapFetchWithHeaders(this.serverName, this.serverConfig, createAuthFetch_2()),
        });
        if (A) {
          let l = { authorizationServerUrl: A.issuer, authorizationServerMetadata: A };
          return (
            (this._servedOverrideAuthorizationServerUrl = A.issuer),
            this._servedOverrideDocuments.set(A, e),
            (this._flowDiscoveryState = l),
            (this._flowDiscoveryStateFromConfiguredUrl = !0),
            this.servePolicyCheckedDiscoveryState(l)
          );
        }
      } catch (error) {
        logMCPDebug(
          this.serverName,
          `Failed to fetch from configured metadata URL: ${yF(error, this.serverConfig.url)}`,
        );
      }
      if (this._flowDiscoveryStateFromConfiguredUrl)
        this._servedOverrideAuthorizationServerUrl = this._flowDiscoveryState?.authorizationServerUrl;
      return this.servePolicyCheckedDiscoveryState(this._flowDiscoveryState);
    }
    if (this._flowDiscoveryState && Date.now() - this._flowDiscoveryStateAt < Ie)
      return this.servePolicyCheckedDiscoveryState(this._flowDiscoveryState);
    let _flowDiscoveryStateAt = this._flowDiscoveryStateAt,
      async = await getSecureStorage().readAsync();
    if (
      this._flowDiscoveryState &&
      this._flowDiscoveryStateAt !== _flowDiscoveryStateAt &&
      Date.now() - this._flowDiscoveryStateAt < Ie
    )
      return this.servePolicyCheckedDiscoveryState(this._flowDiscoveryState);
    let S = getServerKey(this.serverName, this.serverConfig),
      h = async?.mcpOAuth?.[S]?.discoveryState;
    if (h?.authorizationServerUrl) {
      logMCPDebug(
        this.serverName,
        `Returning cached discovery state (authServer: ${redactUrlSecrets(h.authorizationServerUrl)})`,
      );
      let A = {
        authorizationServerUrl: h.authorizationServerUrl,
        resourceMetadataUrl: h.resourceMetadataUrl,
        resourceMetadata: h.resourceMetadata,
        authorizationServerMetadata: h.authorizationServerMetadata,
      };
      try {
        this.servePolicyCheckedDiscoveryState(A);
      } catch (error) {
        if (error instanceof IssuerEchoCrossOriginError) {
          if (
            (await this.invalidateCredentials("discovery").catch(() => {}),
            this._flowDiscoveryStateAt === _flowDiscoveryStateAt)
          )
            ((this._flowDiscoveryState = void 0), (this._flowDiscoveryStateAt = 0));
        }
        throw error;
      }
      return ((this._flowDiscoveryStateFromConfiguredUrl = !1), (this._flowDiscoveryState = A));
    }
    return this.servePolicyCheckedDiscoveryState(this._flowDiscoveryState);
  }
  async refreshAuthorization(e) {
    if (isDiskless()) {
      logMCPDebug(this.serverName, "claude-code-server session; skipping refresh");
      return;
    }
    let t = getServerKey(this.serverName, this.serverConfig),
      n = getProjectDirsUpToHome();
    await getFsImplementation().mkdir(n);
    let replaced = t.replace(/[^a-zA-Z0-9]/g, "_"),
      s = join(n, `mcp-refresh-${replaced}.lock`),
      S;
    for (let h = 0; h < MAX_METADATA_REDIRECTS_2; h++)
      try {
        (logMCPDebug(this.serverName, `Acquiring refresh lock (attempt ${h + 1})`),
          (S = await lock(s, {
            realpath: !1,
            stale: 60000,
            update: 5000,
            onCompromised: () => {
              logMCPDebug(this.serverName, "Refresh lock was compromised");
            },
          })),
          logMCPDebug(this.serverName, "Acquired refresh lock"));
        break;
      } catch (error) {
        let l = getErrnoCode(error);
        if (l === "ELOCKED") {
          (logMCPDebug(
            this.serverName,
            `Refresh lock held by another process, waiting (attempt ${h + 1}/${MAX_METADATA_REDIRECTS_2})`,
          ),
            await sleep(1000 + Math.random() * 1000));
          continue;
        }
        logMCPDebug(this.serverName, `Failed to acquire refresh lock: ${l}; skipping refresh`);
        return;
      }
    if (!S) {
      logMCPDebug(
        this.serverName,
        `Could not acquire refresh lock after ${MAX_METADATA_REDIRECTS_2} retries; skipping refresh`,
      );
      return;
    }
    try {
      clearKeychainCache();
      let l = (await getSecureStorage().readAsync())?.mcpOAuth?.[t];
      if (l) {
        let y = l.expiresAt != null ? (l.expiresAt - Date.now()) / 1000 : void 0;
        if (l.accessToken && (y == null || y > 300))
          return (
            logMCPDebug(
              this.serverName,
              y != null
                ? `Another process already refreshed tokens (expires in ${Math.floor(y)}s)`
                : "Another process already refreshed tokens (no expiration)",
            ),
            {
              access_token: l.accessToken,
              refresh_token: l.refreshToken,
              expires_in: y,
              scope: l.scope,
              token_type: "Bearer",
            }
          );
        if (l.refreshToken)
          ((e = l.refreshToken),
            (this._lastServedRefreshToken = l.refreshToken),
            this._presented.record(l.refreshToken));
      }
      return await this._doRefresh(e);
    } finally {
      if (S)
        try {
          (await S(), logMCPDebug(this.serverName, "Released refresh lock"));
        } catch {
          logMCPDebug(this.serverName, "Failed to release refresh lock");
        }
    }
  }
  async readConcurrentRefreshWinner() {
    clearKeychainCache();
    let t = (await getSecureStorage().readAsync())?.mcpOAuth?.[
        getServerKey(this.serverName, this.serverConfig)
      ],
      n = t?.expiresAt != null ? (t.expiresAt - Date.now()) / 1000 : void 0;
    if (t?.accessToken && (n == null || n > 300)) {
      logMCPDebug(this.serverName, "Another process landed fresh tokens; using those");
      let r = {
        access_token: t.accessToken,
        refresh_token: t.refreshToken,
        expires_in: n,
        scope: t.scope,
        token_type: "Bearer",
      };
      return { tokenData: t, freshTokens: r };
    }
    return { tokenData: t, freshTokens: void 0 };
  }
  async _doRefresh(e) {
    this._presented.record(e);
    let t = 3,
      n = ET(this.serverConfig),
      r = (s, S) => {
        logEvent(s === "success" ? "tengu_mcp_oauth_refresh_success" : "tengu_mcp_oauth_refresh_failure", {
          transportType: fromEnum(this.serverConfig.type),
          ...(n && { mcpServerBaseUrl: n }),
          ...(S && { reason: fromEnum(S) }),
        });
      };
    for (let s = 1; s <= t; s++) {
      let S;
      try {
        logMCPDebug(this.serverName, "Starting token refresh");
        let h = wrapFetchWithHeaders(this.serverName, this.serverConfig, createAuthFetch_2()),
          A = isIssuerStrictEchoEnabled() ? "enforce" : "observe",
          l = this._metadataEchoMode === A ? this._metadata : void 0;
        if (!l) {
          let discoveryState = await this.discoveryState();
          if (discoveryState?.authorizationServerMetadata) l = discoveryState.authorizationServerMetadata;
          else if (discoveryState?.authorizationServerUrl) {
            logMCPDebug(
              this.serverName,
              `Re-discovering metadata from persisted auth server URL: ${redactUrlSecrets(discoveryState.authorizationServerUrl)}`,
            );
            let authorizationServerUrl = discoveryState.authorizationServerUrl;
            if (((l = await LBt(authorizationServerUrl, { fetchFn: h, skipIssuerValidation: !0 })), l))
              evaluateIssuerEchoPolicy({
                serverName: this.serverName,
                site: "refresh_rediscovery",
                expectedIssuer: authorizationServerUrl,
                receivedIssuer: l.issuer,
                serverConfig: this.serverConfig,
              });
          }
        }
        if (
          !l &&
          !this.serverConfig.oauth?.xaa &&
          (await hasStoredOAuthState_2(this.serverName, this.serverConfig)) === void 0
        )
          l = await fetchAuthServerMetadata(this.serverName, this.serverConfig.url, {
            configuredMetadataUrl: this.serverConfig.oauth?.authServerMetadataUrl,
            fetchFn: h,
            serverConfigForAnalytics: this.serverConfig,
          });
        if (!l) {
          (logMCPDebug(this.serverName, "Failed to discover OAuth metadata"),
            r("failure", "metadata_discovery_failed"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_metadata_failed"));
          return;
        }
        if (
          ((this._metadata = l),
          (this._metadataEchoMode = isIssuerStrictEchoEnabled() ? "enforce" : "observe"),
          (S = await this.clientInformation()),
          !S)
        ) {
          (logMCPDebug(this.serverName, "No client information available"),
            r("failure", "no_client_info"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_no_client_info"));
          return;
        }
        let y = await dLo(new URL(this.serverConfig.url), {
          metadata: l,
          clientInformation: S,
          refreshToken: e,
          resource: new URL(this.serverConfig.url),
          fetchFn: h,
        });
        if (y)
          return (
            logMCPDebug(this.serverName, "Token refresh successful"),
            await this.saveTokens(y),
            r("success"),
            logFeatureOk("mcp_oauth_refresh"),
            y
          );
        (logMCPDebug(this.serverName, "Token refresh returned no tokens"),
          r("failure", "no_tokens_returned"),
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_no_tokens"));
        return;
      } catch (error) {
        if (error instanceof IssuerEchoCrossOriginError) {
          (logMCPDebug(this.serverName, `Token refresh denied by issuer-echo policy: ${errorMessage(error)}`),
            r("failure", "issuer_echo_denied"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_issuer_echo_denied"));
          return;
        }
        if (error instanceof OAuthError && error.code === Sue.InvalidGrant) {
          logMCPDebug(this.serverName, `Token refresh failed with invalid_grant: ${error.message}`);
          let { freshTokens: freshTokens } = await this.readConcurrentRefreshWinner();
          if (freshTokens)
            return (logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_winner"), freshTokens);
          (logMCPDebug(this.serverName, "No valid tokens in storage, clearing stored tokens"),
            r("failure", "invalid_grant"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_invalid_grant"),
            await this.invalidateCredentials("tokens"),
            AUTH_LOST_SIGNAL.emit(this.serverName));
          return;
        }
        if (
          error instanceof OAuthError &&
          (error.code === "invalid_client" || error.code === "unauthorized_client")
        ) {
          logMCPDebug(
            this.serverName,
            "Token refresh failed: DCR client expired or invalid; clearing stored client registration",
          );
          let { tokenData: tokenData, freshTokens: freshTokens } = await this.readConcurrentRefreshWinner();
          if (freshTokens)
            return (logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_winner"), freshTokens);
          if (tokenData?.clientId && S && tokenData.clientId !== S.client_id) {
            (logMCPDebug(this.serverName, "Another process re-registered client; preserving"),
              r("failure", "concurrent_reregister"),
              logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_reregister"));
            return;
          }
          (r("failure", error.code === "unauthorized_client" ? "unauthorized_client" : "invalid_client"),
            logFeatureBad(
              "mcp_oauth_refresh",
              error.code === "unauthorized_client"
                ? "mcp_oauth_refresh_unauthorized_client"
                : "mcp_oauth_refresh_invalid_client",
            ),
            await this.invalidateCredentials("all"),
            AUTH_LOST_SIGNAL.emit(this.serverName));
          return;
        }
        if (isZodError_2(error)) {
          (logMCPDebug(
            this.serverName,
            `Token refresh failed: token response rejected by SDK schema: ${errorMessage(error)}`,
          ),
            r("failure", "token_response_schema_rejected"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_token_response_schema_rejected"));
          return;
        }
        let A = error instanceof McpCredentialStoreUnavailableError,
          l = error instanceof Error && /timeout|timed out|etimedout|econnreset/i.test(error.message),
          y =
            error instanceof OAuthError &&
            (error.code === Sue.ServerError ||
              error.code === Sue.TemporarilyUnavailable ||
              error.code === Sue.TooManyRequests ||
              !DEVICE_FLOW_PENDING_ERRORS.has(error.code)),
          w = l || y || A;
        if (!w || s >= t) {
          (logMCPDebug(this.serverName, `Token refresh failed: ${yF(error, this.serverConfig.url)}`),
            r("failure", w ? "transient_retries_exhausted" : "request_failed"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_request_failed"));
          return;
        }
        let R = 1000 * Math.pow(2, s - 1);
        (logMCPDebug(this.serverName, `Token refresh failed, retrying in ${R}ms (attempt ${s}/${t})`),
          await sleep(R));
      }
    }
    return;
  }
}
/**
 * readClientSecret：从 MCP_CLIENT_SECRET 或 TTY 交互读取 client secret。
 */
//@ chunk-n1aavqzh.js:62345-63004 facade-exports = readClientSecret (1)
async function readClientSecret_2() {
  let envSecret = process.env.MCP_CLIENT_SECRET;
  if (envSecret) return envSecret;
  if (!process.stdin.isTTY)
    throw Error("No TTY available to prompt for client secret. Set MCP_CLIENT_SECRET env var instead.");
  return new Promise((resolve, reject) => {
    (process.stderr.write("Enter OAuth client secret: "), process.stdin.setRawMode?.(!0));
    let secret = "",
      onData = (ch) => {
        let str = ch.toString();
        if (
          str ===
            `
` ||
          str === "\r"
        )
          (process.stdin.setRawMode?.(!1),
            process.stdin.removeListener("data", onData),
            process.stderr.write(`
`),
            resolve(secret));
        else if (str === "\x03")
          (process.stdin.setRawMode?.(!1),
            process.stdin.removeListener("data", onData),
            reject(Error("Cancelled")));
        else if (str === "\x7F" || str === "\b") secret = secret.slice(0, -1);
        else secret += str;
      };
    process.stdin.on("data", onData);
  });
}
/**
 * saveMcpClientSecret：把 client secret 写入 mcpOAuthClientConfig[serverKey]。
 */
//@ chunk-n1aavqzh.js:63004-63200 facade-exports
async function saveMcpClientSecret_2(e, t, n) {
  let r = getServerKey(e, t);
  try {
    return await getSecureStorage().mutate((s) => ({
      ...s,
      mcpOAuthClientConfig: { ...s.mcpOAuthClientConfig, [r]: { clientSecret: n } },
    }));
  } catch (error) {
    return { success: !1, warning: errorMessage(error) };
  }
}
/**
 * clearMcpClientConfig：删除 mcpOAuthClientConfig 条目。
 */
//@ chunk-n1aavqzh.js:63200-63388 facade-exports
async function clearMcpClientConfig_2(e, t) {
  let n = getServerKey(e, t);
  await getSecureStorage().mutate((r) => {
    if (!r.mcpOAuthClientConfig?.[n]) return r;
    let s = { ...r.mcpOAuthClientConfig };
    return (delete s[n], { ...r, mcpOAuthClientConfig: s });
  });
}
/**
 * 从安全存储读取某服务器（名字+配置算出的键）保存的 OAuth 客户端配置 `mcpOAuthClientConfig`（如 DCR 得到的 client_id/secret）。（v2）
 */
//@ chunk-n1aavqzh.js:63388-63487 facade-exports
async function getMcpClientConfig_2(e, t) {
  let async = await getSecureStorage().readAsync(),
    s = getServerKey(e, t);
  return async?.mcpOAuthClientConfig?.[s];
}
//@ chunk-n1aavqzh.js:63487-63660 layout = getScopeFromMetadata (0.903)
function getScopeFromMetadata_2(metadata) {
  if (!metadata) return;
  if ("scope" in metadata && typeof metadata.scope === "string") return metadata.scope;
  if ("default_scope" in metadata && typeof metadata.default_scope === "string")
    return metadata.default_scope;
  return;
}
/**
 * shouldRequestOfflineAccess：元数据 scopes_supported 含 offline_access。
 */
//@ chunk-n1aavqzh.js:63660-63856 facade-exports
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
  ],
  ENTRA_LOGIN_HOST_SUFFIXES = [".b2clogin.com", ".ciamlogin.com"];
/**
 * 判断 URL 主机是否属于 Microsoft Entra ID 登录域（精确列表或后缀匹配），解析失败返回 false；用于对 Entra 授权服务器做特殊处理。（v2）
 */
//@ chunk-n1aavqzh.js:64018-64155 facade-exports
function isEntraLoginUrl_2(e) {
  try {
    let hostname = (typeof e === "string" ? new URL(e) : e).hostname;
    return (
      ENTRA_LOGIN_HOSTS.includes(hostname) || ENTRA_LOGIN_HOST_SUFFIXES.some((n) => hostname.endsWith(n))
    );
  } catch {
    return !1;
  }
}
//@ chunk-1kaj6e83.js:8424-8482 sole-consumer
var tt = 30000,
  rt = 500,
  nt = new Set([...LK, ...PU, "ETIMEDOUT"]);
//@ chunk-1kaj6e83.js:8482-8615 sole-consumer
function isTransientAuthFetchError(e) {
  if (isAbortError(e)) return !0;
  if (e instanceof Error && e.name === "TimeoutError") return !0;
  let t = extractConnectionErrorDetails(e);
  return t !== null && nt.has(t.code);
}
//@ chunk-1kaj6e83.js:8615-8716 sole-consumer
function isZodError(e) {
  let t = e;
  return (t?.name === "ZodError" || t?.name === "$ZodError") && Array.isArray(t?.issues);
}
/**
 * 可上报的 OAuth 错误码白名单。
 */
//@ chunk-1kaj6e83.js:8716-9122 affinity
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
/**
 * 把 OAuth 错误码收敛成遥测白名单值，未知码记为 `other`。（v1 副本，同 chunk-n1aavqzh.js#q0i）
 */
//@ chunk-1kaj6e83.js:9122-9189 facade-exports
function sanitizeOAuthErrorCodeForAnalytics(e) {
  let found = OAUTH_ERROR_CODES.find((r) => r === e);
  return fromEnumOpt(found) ?? lit("other");
}
/**
 * 把 SDK 授权失败按消息与错误类型归类：dcr_failed（动态注册/客户端元数据无效）、discovery_failed（元数据加载失败或授权服务器不兼容）、dcr_rejected、network_failed（网络错误码）、其余 sdk_auth_failed；供遥测与提示。（v1 副本）
 */
//@ chunk-1kaj6e83.js:9189-9650 facade-exports
function classifySdkAuthFailure(e, t) {
  let r =
    t instanceof Error
      ? `${e}
${t.message}`
      : e;
  if (
    r.includes("dynamic client registration") ||
    (t instanceof TM && t.errorCode === "invalid_client_metadata")
  )
    return "dcr_failed";
  if ((r.includes("trying to load") && r.includes("metadata")) || r.includes("Incompatible auth server"))
    return "discovery_failed";
  if (t instanceof TM) return "dcr_rejected";
  let n = getErrnoCode(t) ?? getErrnoCode(t instanceof Error ? t.cause : void 0);
  if (n && UNREACHABLE_ERRNOS.has(n)) return "network_failed";
  return "sdk_auth_failed";
}
//@ chunk-1kaj6e83.js:9650-9659 layout
var MAX_METADATA_REDIRECTS = 5;
/**
 * 生成脱敏后的授权 URL 调试日志串。（v1 副本，同 chunk-n1aavqzh.js#izs）
 */
//@ chunk-1kaj6e83.js:9659-9713 facade-exports
function authorizationUrlForDebugLog(e) {
  return redactUrlSecrets(e.origin + e.pathname) + redactUrlSearchParams(e);
}
//@ chunk-1kaj6e83.js:9713-9795 fingerprint = NONSTANDARD_INVALID_GRANT_ALIASES (1)
var NONSTANDARD_INVALID_GRANT_ALIASES = new Set([
  "invalid_refresh_token",
  "expired_refresh_token",
  "token_expired",
]);
/**
 * normalizeOAuthErrorBody：把非标准 OAuth 错误体（NONSTANDARD_INVALID_GRANT_ALIASES 中的别名）改写成 invalid_grant。
 */
//@ chunk-1kaj6e83.js:9795-10259 facade-exports = normalizeOAuthErrorBody (1)
async function normalizeOAuthErrorBody(response) {
  if (!response.ok) return response;
  let text = await response.text(),
    parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return new Response(text, response);
  }
  if (strip.safeParse(parsed).success) return new Response(text, response);
  let result = R$r.safeParse(parsed);
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
/**
 * throwIfAborted（v1 副本）。
 */
//@ chunk-1kaj6e83.js:10259-10419 facade-exports
function createAuthFetch() {
  return async (e, t) => {
    try {
      return await createAuthFetch_3(e, t);
    } catch (error) {
      if (t?.signal?.aborted || !isTransientAuthFetchError(error)) throw error;
      return (await sleep(rt, t?.signal ?? void 0), await createAuthFetch_3(e, t));
    }
  };
}
//@ chunk-1kaj6e83.js:10419-10950 fingerprint = createAuthFetch (1)
async function createAuthFetch_3(e, t) {
  let timeoutSignal = AbortSignal.timeout(tt),
    isPost = t?.method?.toUpperCase() === "POST",
    s = getProxyFetchOptions({ url: String(e) });
  if (!t?.signal) {
    let v;
    try {
      v = await fetch(e, { ...t, ...s, signal: timeoutSignal });
    } catch (error) {
      rethrowRedactedFetchError(error, e);
    }
    return isPost ? normalizeOAuthErrorBody(v) : v;
  }
  let controller = new AbortController(),
    abort = () => controller.abort();
  (t.signal.addEventListener("abort", abort), timeoutSignal.addEventListener("abort", abort));
  let cleanup = () => {
    (t.signal?.removeEventListener("abort", abort), timeoutSignal.removeEventListener("abort", abort));
  };
  if (t.signal.aborted) controller.abort();
  try {
    let response = await fetch(e, { ...t, ...s, signal: controller.signal });
    return (cleanup(), isPost ? normalizeOAuthErrorBody(response) : response);
  } catch (error) {
    (cleanup(), rethrowRedactedFetchError(error, e));
  }
}
/**
 * fetchAuthServerMetadata（v1）。
 */
//@ chunk-1kaj6e83.js:10950-11774 fingerprint = fetchAuthServerMetadata (0.81)
async function fetchAuthServerMetadata_2(serverName, serverUrl, options) {
  let {
      configuredMetadataUrl: configuredMetadataUrl,
      fetchFn: fetchFn,
      resourceMetadataUrl: resourceMetadataUrl,
    } = options ?? {},
    authFetch = fetchFn ?? createAuthFetch();
  if (configuredMetadataUrl) {
    if (!configuredMetadataUrl.startsWith("https://"))
      throw Error(
        `authServerMetadataUrl must use https:// (got: ${redactUrlSecrets(configuredMetadataUrl)})`,
      );
    let response = await authFetch(configuredMetadataUrl, { headers: { Accept: "application/json" } });
    if (response.ok) {
      let A;
      try {
        A = await response.json();
      } catch {
        throw Error(
          `Configured auth server metadata at ${redactUrlSecrets(configuredMetadataUrl)} is not valid JSON`,
        );
      }
      return KYn.parse(A);
    }
    throw Error(
      `HTTP ${response.status} fetching configured auth server metadata from ${redactUrlSecrets(configuredMetadataUrl)}`,
    );
  }
  try {
    let { authorizationServerMetadata: authorizationServerMetadata } = await QLo(serverUrl, {
      fetchFn: authFetch,
      ...(resourceMetadataUrl && { resourceMetadataUrl: resourceMetadataUrl }),
    });
    if (authorizationServerMetadata) return authorizationServerMetadata;
  } catch (err) {
    logMCPDebug(serverName, `RFC 9728 discovery failed, falling back: ${yF(err, serverUrl)}`);
  }
  let url = new URL(serverUrl);
  if (url.pathname === "/") return;
  try {
    return await s1t(url, { fetchFn: authFetch });
  } catch (error) {
    logMCPDebug(serverName, `Path-aware auth server discovery failed: ${yF(error, serverUrl)}`);
    return;
  }
}
/**
 * McpClientRegistrationDeferredError（v1 副本）。
 */
//@ chunk-1kaj6e83.js:11774-11982 facade-exports
class McpClientRegistrationDeferredError extends AM {
  serverName;
  constructor(e) {
    super("Authentication required; client registration is deferred until the user authenticates");
    this.serverName = e;
    this.name = "McpClientRegistrationDeferredError";
  }
}
/**
 * 用户取消 MCP OAuth 授权时抛出的错误类。（v1 副本）
 */
//@ chunk-1kaj6e83.js:11982-12100 facade-exports = AuthenticationCancelledError (1)
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
  return t && e.redirectUri.replace("//127.0.0.1:", "//localhost:") === buildRedirectUri(t) ? t : void 0;
}
//@ chunk-1kaj6e83.js:12467-12525 sole-consumer
function getClientMetadataDocumentUrl() {
  return env.MCP_OAUTH_CLIENT_METADATA_URL || MCP_CLIENT_METADATA_URL;
}
//@ chunk-1kaj6e83.js:12525-12620 sole-consumer
function isLoopbackCallbackUri(e) {
  if (!isLoopbackOrigin_2(e)) return !1;
  try {
    return new URL(e).pathname === "/callback";
  } catch {
    return !1;
  }
}
//@ chunk-1kaj6e83.js:12620-12674 sole-consumer
function isClientMetadataDocumentId(e) {
  return e !== void 0 && (e === MCP_CLIENT_METADATA_URL || e === getClientMetadataDocumentUrl());
}
/**
 * 按服务器键取 OAuth 回调提交器。（v1 副本）
 */
//@ chunk-1kaj6e83.js:12674-12733 facade-exports
function getOAuthCallbackSubmitter(e) {
  return ht().oauthCallbackSubmitters.get(e);
}
/**
 * 登记进行中的 OAuth 授权 Promise，结束后自动移除。（v1 副本）
 */
//@ chunk-1kaj6e83.js:12733-12849 facade-exports
function setActiveOAuthPromise(e, t) {
  let activeOAuthFlows = ht().activeOAuthFlows;
  (activeOAuthFlows.set(e, t),
    t
      .finally(() => {
        if (activeOAuthFlows.get(e) === t) activeOAuthFlows.delete(e);
      })
      .catch(() => {}));
}
/**
 * 取出进行中的 OAuth 授权 Promise。（v1 副本）
 */
//@ chunk-1kaj6e83.js:12849-12901 facade-exports
function getActiveOAuthPromise(e) {
  return ht().activeOAuthFlows.get(e);
}
/**
 * 清理"无令牌桩"：安全存储里某服务器的 mcpOAuth 记录既无 accessToken 也无 refreshToken、且没有进行中的发现状态时，原子地删除该条；失败只记 MCP 调试日志。（v1）
 */
//@ chunk-1kaj6e83.js:12901-13281 facade-exports
async function clearMcpOAuthStubIfTokenless(e, t) {
  let r = getServerKey(e, t),
    n = (await getSecureStorage().readAsync())?.mcpOAuth?.[r];
  if (!n || n.accessToken || n.refreshToken || xaaPinnedServer(n.discoveryState)) return;
  try {
    await getSecureStorage().mutate((s) => {
      let h = s.mcpOAuth?.[r];
      if (!h || h.accessToken || h.refreshToken || xaaPinnedServer(h.discoveryState)) return s;
      let l = { ...s.mcpOAuth };
      return (delete l[r], { ...s, mcpOAuth: l });
    });
  } catch (error) {
    logMCPDebug(e, `clear tokenless stub failed: ${errorMessage(error)}`);
  }
}
//@ chunk-1kaj6e83.js:13281-14335 fingerprint = revokeToken (0.967)
async function revokeToken({
  serverName: serverName,
  endpoint: endpoint,
  token: token,
  tokenTypeHint: tokenTypeHint,
  clientId: clientId,
  clientSecret: clientSecret,
  accessToken: accessToken,
  authMethod: authMethod = "client_secret_basic",
  configuredHeaders: configuredHeaders,
}) {
  let params = new URLSearchParams();
  (params.set("token", token), params.set("token_type_hint", tokenTypeHint));
  let y = { ...configuredHeaders, "Content-Type": "application/x-www-form-urlencoded" },
    U = Object.keys(configuredHeaders).length > 0 ? { beforeRedirect: G4n(endpoint) } : {};
  if (clientId && clientSecret)
    if (authMethod === "client_secret_post")
      (params.set("client_id", clientId), params.set("client_secret", clientSecret));
    else {
      let basic = Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString(
        "base64",
      );
      ((y.Authorization = `Basic ${basic}`), Ny().record(basic));
    }
  else if (clientId) params.set("client_id", clientId);
  else logMCPDebug(serverName, `No client_id available for ${tokenTypeHint} revocation - server may reject`);
  try {
    (await Dt.post(endpoint, params, { headers: y, ...U }),
      logMCPDebug(serverName, `Successfully revoked ${tokenTypeHint}`));
  } catch (error) {
    if (Dt.isAxiosError(error) && error.response?.status === 401 && accessToken)
      (logMCPDebug(serverName, `Got 401, retrying ${tokenTypeHint} revocation with Bearer auth`),
        params.delete("client_id"),
        params.delete("client_secret"),
        await Dt.post(endpoint, params, { headers: { ...y, Authorization: `Bearer ${accessToken}` }, ...U }),
        logMCPDebug(serverName, `Successfully revoked ${tokenTypeHint} with Bearer auth`));
    else throw error;
  }
}
/**
 * readStoredServerCredentials（v1 副本）。
 */
//@ chunk-1kaj6e83.js:14335-14633 facade-exports
async function snapshotServerTokens(e, t) {
  let n = (await getSecureStorage().readAsync())?.mcpOAuth?.[getServerKey(e, t)];
  if (!n?.accessToken && !n?.refreshToken) return;
  return {
    accessToken: n.accessToken || void 0,
    refreshToken: n.refreshToken,
    clientId: n.clientId,
    clientSecret: n.clientSecret,
    ...(n.discoveryState && { discoveryState: authDiscoveryState(n.discoveryState) }),
  };
}
/**
 * revokeServerTokens（v1）：按 RFC 7009 撤销访问与刷新令牌。
 */
//@ chunk-1kaj6e83.js:14633-16208 fingerprint = revokeServerTokens (0.795)
async function revokeServerTokens_3(serverName, serverConfig, r) {
  let storage = Ny();
  (storage.record(r.accessToken), storage.record(r.refreshToken), storage.record(r.clientSecret));
  let s;
  try {
    let h = r.discoveryState?.authorizationServerUrl ?? serverConfig.url,
      metadata = await fetchAuthServerMetadata_2(serverName, h, {
        configuredMetadataUrl: xaaPinnedServer(r.discoveryState)
          ? void 0
          : serverConfig.oauth?.authServerMetadataUrl,
        fetchFn: wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch()),
      });
    if (!metadata) (logMCPDebug(serverName, "No OAuth metadata found"), (s = "no_metadata"));
    else {
      let S = "revocation_endpoint" in metadata ? metadata.revocation_endpoint : null;
      if (!S)
        (logMCPDebug(serverName, "Server does not support token revocation"), (s = "no_revocation_endpoint"));
      else {
        let revocationEndpointStr = String(S),
          A = await W4n(serverName, serverConfig, revocationEndpointStr),
          y =
            ("revocation_endpoint_auth_methods_supported" in metadata
              ? metadata.revocation_endpoint_auth_methods_supported
              : void 0) ??
            ("token_endpoint_auth_methods_supported" in metadata
              ? metadata.token_endpoint_auth_methods_supported
              : void 0),
          U =
            y && !y.includes("client_secret_basic") && y.includes("client_secret_post")
              ? "client_secret_post"
              : "client_secret_basic";
        if (
          (logMCPDebug(serverName, `Revoking tokens via ${redactUrlSecrets(revocationEndpointStr)} (${U})`),
          r.refreshToken)
        )
          try {
            await revokeToken({
              serverName: serverName,
              endpoint: revocationEndpointStr,
              token: r.refreshToken,
              tokenTypeHint: "refresh_token",
              clientId: r.clientId,
              clientSecret: r.clientSecret,
              accessToken: r.accessToken,
              authMethod: U,
              configuredHeaders: A,
            });
          } catch (error) {
            (logMCPDebug(serverName, `Failed to revoke refresh token: ${errorMessage(error)}`),
              (s = "server_revoke_failed"));
          }
        if (r.accessToken)
          try {
            await revokeToken({
              serverName: serverName,
              endpoint: revocationEndpointStr,
              token: r.accessToken,
              tokenTypeHint: "access_token",
              clientId: r.clientId,
              clientSecret: r.clientSecret,
              accessToken: r.accessToken,
              authMethod: U,
              configuredHeaders: A,
            });
          } catch (error) {
            (logMCPDebug(serverName, `Failed to revoke access token: ${errorMessage(error)}`),
              (s = "server_revoke_failed"));
          }
      }
    }
  } catch (error) {
    (logMCPDebug(serverName, `Failed to revoke tokens: ${errorMessage(error)}`),
      (s = "server_revoke_failed"));
  }
  return s;
}
/**
 * revokeReplacedTokens（v1 副本）。
 */
//@ chunk-1kaj6e83.js:16208-16728 facade-exports
async function revokeReplacedServerTokens(e, t, r) {
  let n;
  try {
    let s = (await getSecureStorage().readAsync())?.mcpOAuth?.[getServerKey(e, t)],
      h = {
        ...r,
        accessToken: r.accessToken && r.accessToken !== s?.accessToken ? r.accessToken : void 0,
        refreshToken: r.refreshToken && r.refreshToken !== s?.refreshToken ? r.refreshToken : void 0,
      };
    if (!h.accessToken && !h.refreshToken) {
      (logMCPDebug(e, "No replaced tokens to revoke"), logFeatureOk("mcp_oauth_revoke"));
      return;
    }
    n = await revokeServerTokens_3(e, t, h);
  } catch (error) {
    (logMCPDebug(e, `Failed to revoke replaced tokens: ${errorMessage(error)}`),
      (n = "server_revoke_failed"));
  }
  if (n) logFeatureSad("mcp_oauth_revoke", n);
  else logFeatureOk("mcp_oauth_revoke");
}
/**
 * clearServerTokens（v1）。
 */
//@ chunk-1kaj6e83.js:16728-18686 facade-exports
async function revokeServerTokens(serverName, serverConfig, { preserveStepUpState: r = !1 } = {}) {
  let n = getSecureStorage(),
    s = await readSecureStorageForMcp();
  if (s === READ_FAILED)
    return (
      logMCPDebug(serverName, "Could not read the credential store to clear tokens"),
      logFeatureBad("mcp_oauth_revoke", "local_read_failed"),
      { cleared: !1, reason: "credential_store_failed" }
    );
  let h = getServerKey(serverName, serverConfig),
    l = s?.mcpOAuth?.[h],
    S;
  if (l?.accessToken || l?.refreshToken)
    S = await revokeServerTokens_3(serverName, serverConfig, {
      accessToken: l.accessToken || void 0,
      refreshToken: l.refreshToken,
      clientId: l.clientId,
      clientSecret: l.clientSecret,
      ...(l.discoveryState && { discoveryState: authDiscoveryState(l.discoveryState) }),
    });
  else logMCPDebug(serverName, "No tokens to revoke");
  let v = !1;
  try {
    if (r && l && (l.stepUpScope || l.discoveryState || l.clientId)) {
      let mutate = await n.mutate((y) => {
        let U = y.mcpOAuth?.[h];
        if (U?.accessToken !== l.accessToken || U?.clientId !== l.clientId) return y;
        return {
          ...y,
          mcpOAuth: {
            ...y.mcpOAuth,
            [h]: {
              serverName: serverName,
              serverUrl: serverConfig.url,
              accessToken: "",
              refreshToken: void 0,
              expiresAt: void 0,
              ...(l.clientId && {
                clientId: l.clientId,
                ...(l.redirectUri && { redirectUri: l.redirectUri }),
                ...(l.clientSecret !== void 0 && { clientSecret: l.clientSecret }),
              }),
              ...(l.stepUpScope && { stepUpScope: l.stepUpScope }),
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
      ((v = mutate.success),
        logMCPDebug(
          serverName,
          mutate.success
            ? "Preserved step-up auth state across revocation"
            : `clear local tokens failed: ${mutate.warning ?? "storage write failed"}`,
        ));
    } else if (r) v = (await clearServerTokensFromLocalStorage(serverName, serverConfig)).success;
    else {
      let A = await confirmCredentialRemoval(
        n,
        (y) => {
          if (!y.mcpOAuth?.[h]) return y;
          let { [h]: U, ...w } = y.mcpOAuth;
          return { ...y, mcpOAuth: w };
        },
        (y) => y.mcpOAuth?.[h] !== void 0,
      );
      if (!A.confirmed && A.reason === "keychain_unreadable")
        return (
          logMCPDebug(serverName, "Could not read the keychain to clear tokens"),
          logFeatureBad("mcp_oauth_revoke", "keychain_unreadable"),
          { cleared: !1, reason: "keychain_unreadable" }
        );
      v = A.confirmed;
    }
  } catch (error) {
    logMCPDebug(serverName, `clear local tokens failed: ${errorMessage(error)}`);
  }
  if (!v) S ??= "local_clear_failed";
  if ((clearDiscoveryPathMemo(serverName), S)) logFeatureSad("mcp_oauth_revoke", S);
  else logFeatureOk("mcp_oauth_revoke");
  return v ? { cleared: !0 } : { cleared: !1, reason: "credential_store_failed" };
}
/**
 * clearServerTokensFromLocalStorage（v1）。
 */
//@ chunk-1kaj6e83.js:18686-19319 facade-exports = clearServerTokensFromLocalStorage (0.306)
async function clearServerTokensFromLocalStorage(serverName, serverConfig, r) {
  let serverKey = getServerKey(serverName, serverConfig),
    s,
    mutate = await getSecureStorage().mutate((l) => {
      let S = l.mcpOAuth?.[serverKey];
      if (!S) return l;
      let v = { ...l.mcpOAuth };
      if (S.clientId && r?.preserveClientRegistration?.(S)) {
        if (!S.accessToken && !S.refreshToken) return l;
        ((v[serverKey] = { ...S, accessToken: "", refreshToken: void 0, expiresAt: 0, scope: void 0 }),
          (s = "tokens"));
      } else if (r?.keepXaaPin && xaaPinnedServer(S.discoveryState))
        ((v[serverKey] = {
          serverName: S.serverName,
          serverUrl: S.serverUrl,
          accessToken: "",
          expiresAt: 0,
          discoveryState: S.discoveryState,
        }),
          (s = "all"));
      else (delete v[serverKey], (s = "all"));
      return { ...l, mcpOAuth: v };
    });
  if (s)
    logMCPDebug(
      serverName,
      s === "tokens" ? "Cleared stored tokens (preserved client registration)" : "Cleared stored tokens",
    );
  return mutate;
}
//@ chunk-1kaj6e83.js:19319-19608 layout
function logStorageWriteFailure(e, t, r, n) {
  if (r?.success) return;
  let s = n ? "mutate_rejected" : "storage_write_failed",
    h = n ? errorMessage(n) : (r?.warning ?? "storage write failed");
  logMCPDebug(e, `Token persist failed: ${h}`);
  let l = ET(t);
  logEvent("tengu_mcp_oauth_token_persist_failed", {
    transportType: fromEnum(t.type),
    ...(l && { mcpServerBaseUrl: l }),
    reason: fromEnum(s),
  });
}
//@ chunk-1kaj6e83.js:19608-19767 layout
async function hasStoredOAuthState(e, t) {
  let r = getServerKey(e, t),
    n = await readSecureStorageForMcp();
  if (n === READ_FAILED || (t.oauth?.xaa && !n?.mcpOAuthClientConfig?.[r])) return READ_FAILED;
  return xaaPinnedServer(n?.mcpOAuth?.[r]?.discoveryState);
}
/**
 * performMCPXaaAuth（v1）。
 */
//@ chunk-1kaj6e83.js:19767-22390 fingerprint = performMCPXaaAuth (0.9)
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
    let wantedKey = getServerKey(serverName, serverConfig),
      haveKeys = Object.keys((await getSecureStorage().readAsync())?.mcpOAuthClientConfig ?? {}),
      idpClientSecret = redactHeaders(serverConfig.headers ?? {});
    throw (
      logMCPDebug(
        serverName,
        `XAA: secret lookup miss. wanted=${wantedKey} have=[${haveKeys.join(", ")}] configHeaders=${jsonStringify(idpClientSecret)}`,
      ),
      Error(`XAA: AS client secret not found for '${serverName}'. Re-add with --client-secret.`)
    );
  }
  if ((await hasStoredOAuthState(serverName, serverConfig)) === READ_FAILED)
    throw new McpCredentialStoreUnavailableError(serverName);
  logMCPDebug(serverName, "XAA: starting cross-app access flow");
  let A = await getIdpClientSecret(idp.issuer),
    idTokenCacheHit = (await getCachedIdpIdToken(idp.issuer)) !== void 0,
    failureStage = "idp_login";
  try {
    let w;
    try {
      w = await acquireIdpIdToken({
        idpIssuer: idp.issuer,
        idpClientId: idp.clientId,
        idpClientSecret: A,
        callbackPort: idp.callbackPort,
        onAuthorizationUrl: onAuthorizationUrl,
        skipBrowserOpen: skipBrowserOpen,
        abortSignal: abortSignal,
      });
    } catch (error) {
      if (abortSignal?.aborted) throw new AuthenticationCancelledError();
      throw error;
    }
    failureStage = "discovery";
    let oidc = await discoverOidc(idp.issuer);
    ((failureStage = "token_exchange"), Ny().record(clientSecret));
    let F = await hasStoredOAuthState(serverName, serverConfig);
    if (F === READ_FAILED) throw new McpCredentialStoreUnavailableError(serverName);
    let P;
    try {
      P = await performCrossAppAccess_2(
        serverConfig.url,
        {
          clientId: clientId,
          clientSecret: clientSecret,
          idpClientId: idp.clientId,
          idpClientSecret: A,
          idpIdToken: w,
          idpTokenEndpoint: oidc.token_endpoint,
          pinnedAuthorizationServer: F,
        },
        serverName,
        abortSignal,
      );
    } catch (error) {
      if (abortSignal?.aborted) throw new AuthenticationCancelledError();
      let msg = errorMessage(error);
      if (error instanceof XaaTokenExchangeError) {
        if (error.shouldClearIdToken)
          (await clearIdpIdToken(idp.issuer),
            logMCPDebug(serverName, "XAA: cleared cached id_token after token-exchange failure"));
      } else if (
        msg.includes("PRM discovery failed") ||
        msg.includes("AS metadata discovery failed") ||
        msg.includes("no authorization server supports jwt-bearer") ||
        msg.includes("authorization server changed")
      )
        failureStage = "discovery";
      else if (msg.includes("jwt-bearer")) failureStage = "jwt_bearer";
      throw error;
    }
    let T = getServerKey(serverName, serverConfig),
      storage = Ny();
    (storage.record(P.access_token), storage.record(P.refresh_token));
    let x, B;
    try {
      x = await getSecureStorage().mutate((R) => {
        let prev = R.mcpOAuth?.[T];
        return {
          ...R,
          mcpOAuth: {
            ...R.mcpOAuth,
            [T]: {
              ...prev,
              serverName: serverName,
              serverUrl: serverConfig.url,
              accessToken: P.access_token,
              refreshToken: P.refresh_token ?? prev?.refreshToken,
              expiresAt: P.expires_in != null ? Date.now() + P.expires_in * 1000 : void 0,
              scope: P.scope,
              clientId: clientId,
              clientSecret: clientSecret,
              discoveryState: pinXaaAuth({
                previous: prev?.discoveryState,
                issuedBy: P.authorizationServerUrl,
                interactiveSignIn: !0,
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
    (logEvent("tengu_mcp_oauth_flow_success", { authMethod: lit("xaa"), idTokenCacheHit: idTokenCacheHit }),
      logFeatureOk("mcp_oauth_flow"));
  } catch (error) {
    if (error instanceof AuthenticationCancelledError) throw error;
    throw (
      logFeatureBad("mcp_oauth_flow", "mcp_oauth_xaa_failed"),
      logEvent("tengu_mcp_oauth_flow_failure", {
        authMethod: lit("xaa"),
        xaaFailureStage: fromEnum(failureStage),
        idTokenCacheHit: idTokenCacheHit,
      }),
      error
    );
  }
}
/**
 * performMCPOAuthFlow（v1）：同 v2，回调不处理 iss。
 */
//@ chunk-1kaj6e83.js:22390-30247 facade-exports = performMCPOAuthFlow (0.792)
async function performMCPOAuthFlow(serverName, serverConfig, onAuthorizationUrl, abortSignal, options) {
  if (!URL.canParse(serverConfig.url)) {
    logFeatureBad("mcp_oauth_flow", "mcp_oauth_no_valid_url");
    let T =
      "configError" in serverConfig && typeof serverConfig.configError === "string"
        ? serverConfig.configError
        : void 0;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      T ||
        "This server's URL is missing or not a valid URL, so sign-in can't start. Fix the URL in its MCP config (or set the environment variable it uses) and try again.",
      "MCP OAuth refused: no valid server URL",
    );
  }
  if (serverConfig.oauth?.xaa) {
    if (!isXaaEnabled())
      throw Error(
        `XAA is not enabled (set CLAUDE_CODE_ENABLE_XAA=1). Remove 'oauth.xaa' from server '${serverName}' to use the standard consent flow.`,
      );
    (logEvent("tengu_mcp_oauth_flow_start", {
      isOAuthFlow: !0,
      authMethod: lit("xaa"),
      transportType: fromEnum(serverConfig.type),
      ...(ET(serverConfig) && { mcpServerBaseUrl: ET(serverConfig) }),
    }),
      await performMCPXaaAuth(
        serverName,
        serverConfig,
        onAuthorizationUrl,
        abortSignal,
        options?.skipBrowserOpen,
      ));
    return;
  }
  let storage = getSecureStorage(),
    serverKey = getServerKey(serverName, serverConfig),
    cachedEntry = (await storage.readAsync())?.mcpOAuth?.[serverKey],
    cachedStepUpScope = cachedEntry?.stepUpScope,
    cachedResourceMetadataUrl = cachedEntry?.discoveryState?.resourceMetadataUrl,
    y = getRegisteredLoopbackPort(cachedEntry),
    U;
  if (cachedResourceMetadataUrl)
    try {
      U = new URL(cachedResourceMetadataUrl);
    } catch {
      logMCPDebug(
        serverName,
        `Invalid cached resourceMetadataUrl: ${redactUrlSecrets(cachedResourceMetadataUrl)}`,
      );
    }
  let wwwAuthParams = { scope: cachedStepUpScope, resourceMetadataUrl: U },
    flowAttemptId = randomUUID(),
    F = mcpServerTelemetry(serverConfig, options?.redirectUri);
  logEvent("tengu_mcp_oauth_flow_start", {
    flowAttemptId: ye(flowAttemptId),
    isOAuthFlow: !0,
    transportType: fromEnum(serverConfig.type),
    ...F,
    ...(ET(serverConfig) && { mcpServerBaseUrl: ET(serverConfig) }),
  });
  let P = !1;
  try {
    let configuredCallbackPort = serverConfig.oauth?.callbackPort,
      E = !!options?.redirectUri,
      x = E ? 0 : (configuredCallbackPort ?? (await findAvailablePort(y))),
      B = options?.redirectUri ?? buildRedirectUri(x);
    logMCPDebug(
      serverName,
      E
        ? `Using custom redirectUri: ${redactUrlSecrets(B)} (no localhost listener)`
        : `Using redirect port: ${x}${configuredCallbackPort ? " (from config)" : y && x === y ? " (reusing registered port)" : ""}`,
    );
    try {
      await clearServerTokensFromLocalStorage(serverName, serverConfig, {
        preserveClientRegistration: (z) => x === getRegisteredLoopbackPort(z) || z.redirectUri === B,
        keepXaaPin: !0,
      });
    } catch (error) {
      logMCPDebug(serverName, `clear stored credentials failed: ${errorMessage(error)}`);
    }
    let R = ht(),
      abortController = new AbortController();
    if (!E) (R.oauthCallbackListeners.get(x)?.abort(), R.oauthCallbackListeners.set(x, abortController));
    let K = new ClaudeAuthProvider(
        serverName,
        serverConfig,
        B,
        !0,
        onAuthorizationUrl,
        options?.skipBrowserOpen,
      ),
      redirectUri = Boolean(serverConfig.oauth?.scopes || serverConfig.oauth?.authServerMetadataUrl);
    if (wwwAuthParams.scope && !redirectUri) K.markStepUpPending(wwwAuthParams.scope);
    let re = wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch());
    try {
      let z = await fetchAuthServerMetadata_2(serverName, serverConfig.url, {
        configuredMetadataUrl: serverConfig.oauth?.authServerMetadataUrl,
        fetchFn: re,
        resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
      });
      if (z)
        (K.setMetadata(z),
          logMCPDebug(
            serverName,
            `Fetched OAuth metadata with scope: ${redactSensitiveUrlParams("scope", getScopeFromMetadata(z) ?? "") || "NONE"}`,
          ));
    } catch (error) {
      logMCPDebug(serverName, `Failed to fetch OAuth metadata: ${yF(error, serverConfig.url)}`);
    }
    let oauthState = await K.state(),
      server = null,
      timeoutId = null,
      abortHandler = null,
      Se = null,
      cleanup = () => {
        if (server)
          (server.removeAllListeners(), server.on("error", () => {}), server.close(), (server = null));
        if (timeoutId) (clearTimeout(timeoutId), (timeoutId = null));
        if (abortHandler)
          (abortSignal?.removeEventListener("abort", abortHandler),
            abortController.signal.removeEventListener("abort", abortHandler),
            (abortHandler = null));
        if (R.oauthCallbackListeners.get(x) === abortController) R.oauthCallbackListeners.delete(x);
        if (R.oauthCallbackSubmitters.get(serverName) === Se) R.oauthCallbackSubmitters.delete(serverName);
        logMCPDebug(serverName, "MCP OAuth server cleaned up");
      },
      authorizationCode = await new Promise((resolve, reject) => {
        let ae = !1,
          resolveOnce = (code) => {
            if (ae) return;
            ((ae = !0), resolve(code));
          },
          rejectOnce = (error) => {
            if (ae) return;
            ((ae = !0), reject(error));
          };
        if (
          ((abortHandler = () => {
            (cleanup(), rejectOnce(new AuthenticationCancelledError()));
          }),
          abortSignal?.aborted || abortController.signal.aborted)
        ) {
          abortHandler();
          return;
        }
        (abortSignal?.addEventListener("abort", abortHandler),
          abortController.signal.addEventListener("abort", abortHandler));
        {
          let L = (callbackUrl) => {
            try {
              let parsed = new URL(callbackUrl),
                code = parsed.searchParams.get("code"),
                state = parsed.searchParams.get("state"),
                error = parsed.searchParams.get("error");
              if (!code && !error) return !1;
              if (state !== oauthState)
                return (
                  logMCPDebug(
                    serverName,
                    "Ignoring manual callback URL whose state belongs to a different flow",
                  ),
                  !1
                );
              if (error) {
                let ne = parsed.searchParams.get("error_description") || "";
                return (cleanup(), rejectOnce(Error(`OAuth error: ${error} - ${ne}`)), !0);
              }
              if (!code) return !1;
              return (
                logMCPDebug(serverName, "Received auth code via manual callback URL"),
                cleanup(),
                resolveOnce(code),
                !0
              );
            } catch {
              return !1;
            }
          };
          ((Se = L),
            R.oauthCallbackSubmitters.set(serverName, L),
            options?.onWaitingForCallback?.(L, x, oauthState));
        }
        let Te = async () => {
          try {
            (logMCPDebug(serverName, "Starting SDK auth"),
              logMCPDebug(serverName, `Server URL: ${redactUrlSecrets(serverConfig.url)}`));
            let L = await Aue(K, {
              serverUrl: serverConfig.url,
              scope: wwwAuthParams.scope,
              resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
              fetchFn: re,
            });
            if ((logMCPDebug(serverName, `Initial auth result: ${L}`), L !== "REDIRECT"))
              logMCPDebug(serverName, `Unexpected auth result, expected REDIRECT: ${L}`);
          } catch (error) {
            (logMCPDebug(serverName, `SDK auth error: ${yF(error, serverConfig.url)}`),
              cleanup(),
              rejectOnce(
                Object.assign(
                  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `SDK auth failed: ${yF(error, serverConfig.url)}`,
                    "SDK auth failed",
                  ),
                  { cause: error },
                ),
              ));
          }
        };
        if (E) Te();
        else
          ((server = createServer((req, res) => {
            let parsedUrl = parse(req.url || "", !0);
            if (parsedUrl.pathname === "/callback") {
              let code = parsedUrl.query.code,
                state = parsedUrl.query.state,
                error = parsedUrl.query.error,
                errorDescription = parsedUrl.query.error_description,
                errorUri = parsedUrl.query.error_uri;
              if (state !== oauthState) {
                (res.writeHead(400, { "Content-Type": "text/html" }),
                  res.end(
                    callbackPageBody({
                      ok: !1,
                      heading: "Authentication failed",
                      message: "Invalid state parameter. Close this tab and try again from Claude Code.",
                    }),
                  ));
                return;
              }
              if (error) {
                (res.writeHead(200, { "Content-Type": "text/html" }),
                  res.end(
                    callbackPageBody({
                      ok: !1,
                      heading: "Authentication failed",
                      message: "Close this tab and try again from Claude Code.",
                      detail: `${String(error)}: ${errorDescription ?? ""}`,
                    }),
                  ),
                  cleanup());
                let errorMessage = `OAuth error: ${error}`;
                if (errorDescription) errorMessage += ` - ${errorDescription}`;
                if (errorUri) errorMessage += ` (See: ${errorUri})`;
                rejectOnce(Error(errorMessage));
                return;
              }
              if (code)
                (res.writeHead(200, { "Content-Type": "text/html" }),
                  res.end(
                    callbackPageBody({
                      ok: !0,
                      heading: "Authentication successful",
                      message: "You can close this tab and return to Claude Code.",
                    }),
                  ),
                  cleanup(),
                  resolveOnce(code));
            } else
              (res.writeHead(404, { "Content-Type": "text/html" }),
                res.end(
                  callbackPageBody({
                    ok: !1,
                    heading: "Not found",
                    message: `This is the Claude Code MCP OAuth callback listener. It only handles /callback. If your OAuth provider redirected here, the registered redirect_uri must be ${redactUrlSecrets(B)}.`,
                  }),
                ));
          })),
            server.on("error", (err) => {
              if ((cleanup(), err.code === "EADDRINUSE")) {
                let j =
                  getPlatform() === "windows" ? `netstat -ano | findstr :${x}` : `lsof -ti:${x} -sTCP:LISTEN`;
                rejectOnce(
                  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    `OAuth callback port ${x} is already in use \u2014 another process may be holding it. ` +
                      `Run \`${j}\` to find it.`,
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
            }),
            server.listen(x, "127.0.0.1", () => void Te()),
            server.unref());
        ((timeoutId = setTimeout(
          (cleanup, rejectOnce) => {
            (cleanup(),
              rejectOnce(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  "Authentication timeout",
                  "Authentication timeout",
                ),
              ));
          },
          300000,
          cleanup,
          rejectOnce,
        )),
          timeoutId.unref());
      });
    ((P = !0),
      logMCPDebug(serverName, "Completing auth flow with authorization code"),
      Ny().record(authorizationCode));
    let result = await Aue(K, {
      serverUrl: serverConfig.url,
      authorizationCode: authorizationCode,
      resourceMetadataUrl: wwwAuthParams.resourceMetadataUrl,
      fetchFn: wrapFetchWithHeaders(serverName, serverConfig, createAuthFetch()),
    });
    if ((logMCPDebug(serverName, `Auth result: ${result}`), result === "AUTHORIZED")) {
      let z = await K.tokens().catch(() => {
        return;
      });
      if ((logMCPDebug(serverName, `Tokens after auth: ${z ? "Present" : "Missing"}`), z))
        logMCPDebug(serverName, `Token expires_in: ${z.expires_in}`);
      (logEvent("tengu_mcp_oauth_flow_success", {
        flowAttemptId: ye(flowAttemptId),
        transportType: fromEnum(serverConfig.type),
        ...F,
        ...(ET(serverConfig) && { mcpServerBaseUrl: ET(serverConfig) }),
      }),
        logFeatureOk("mcp_oauth_flow"));
    } else
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Unexpected auth result: " + result,
        "Unexpected auth result",
      );
  } catch (error) {
    logMCPDebug(serverName, `Error during auth completion: ${yF(error, serverConfig.url)}`);
    let reason = "unknown",
      x,
      B,
      msg = errorMessage(error),
      N = error instanceof Error ? error.cause : void 0;
    if (error instanceof AuthenticationCancelledError) reason = "cancelled";
    else if (/AADSTS\d/.test(msg)) reason = "entra_specific";
    else if (/redirect[_ ]uri/i.test(msg)) reason = "redirect_uri_mismatch";
    else if (P && (isZodError(error) || isZodError(N))) reason = "token_response_schema_rejected";
    else if (P) reason = "token_exchange_failed";
    else if (msg.includes("Authentication timeout")) reason = "timeout";
    else if (msg.includes("OAuth error:")) reason = "provider_denied";
    else if (
      msg.includes("already in use") ||
      msg.includes("EADDRINUSE") ||
      msg.includes("callback server failed") ||
      msg.includes("No available port")
    )
      reason = "port_unavailable";
    else if (msg.includes("SDK auth failed")) reason = classifySdkAuthFailure(msg, N);
    let K = (N instanceof Error ? N : error instanceof Error ? error : null)?.message.match(
      /^HTTP (\d{3})\b/,
    );
    if (K) B = Number(K[1]);
    if (N instanceof TM) x = N.errorCode;
    if (error instanceof TM) {
      if (
        ((x = error.errorCode),
        error.errorCode === "invalid_client" || error.errorCode === "unauthorized_client")
      ) {
        let W = getServerKey(serverName, serverConfig);
        try {
          await getSecureStorage().mutate((M) => {
            let D = M.mcpOAuth?.[W];
            if (!D) return M;
            return {
              ...M,
              mcpOAuth: { ...M.mcpOAuth, [W]: { ...D, clientId: void 0, clientSecret: void 0 } },
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
      let W = getServerKey(serverName, serverConfig);
      await getSecureStorage()
        .mutate((M) => {
          let D = M.mcpOAuth?.[W];
          if (!D?.clientId || D.accessToken || D.refreshToken || D.clientId !== cachedEntry?.clientId)
            return M;
          return { ...M, mcpOAuth: { ...M.mcpOAuth, [W]: { ...D, clientId: void 0, clientSecret: void 0 } } };
        })
        .catch((M) => logMCPDebug(serverName, `drop clientId failed: ${errorMessage(M)}`));
    }
    if (reason !== "cancelled") logFeatureBad("mcp_oauth_flow", "mcp_oauth_flow_failed");
    logEvent("tengu_mcp_oauth_flow_error", {
      flowAttemptId: ye(flowAttemptId),
      reason: fromEnum(reason),
      error_code: x === void 0 ? void 0 : sanitizeOAuthErrorCodeForAnalytics(x),
      http_status: fromNumberOpt(B),
      transportType: fromEnum(serverConfig.type),
      ...F,
      ...(ET(serverConfig) && { mcpServerBaseUrl: ET(serverConfig) }),
    });
    let serverKey = yF(error, serverConfig.url);
    throw serverKey === errorMessage(error) ? error : Error(serverKey, { cause: error });
  }
}
/**
 * wrapFetchWithAuthChallengeDetection（v1 副本）。
 */
//@ chunk-1kaj6e83.js:30247-30776 facade-exports = wrapFetchWithStepUpDetection (0.428)
function wrapFetchWithStepUpDetection(fetchFn, authProvider) {
  return async (url, init) => {
    let response = await fetchFn(url, init);
    if (response.status === 401 || response.status === 403) authProvider.sawAuthChallenge = !0;
    if (
      (authProvider.noteServerAnswer(
        url,
        response.status === 401 || (response.status === 403 && NHe(response).error === "insufficient_scope"),
      ),
      response.status === 401 || response.status === 403)
    )
      authProvider.noteAuthRejection(url, response.status, new Headers(init?.headers).get("authorization"));
    if (!new Headers(init?.headers).has("authorization")) return response;
    if (response.status === 403) {
      let { error: error, scope: scope } = NHe(response);
      if (error === "insufficient_scope" && scope) authProvider.markStepUpPending(scope);
    } else if (response.status === 401) authProvider.clearStepUpPending();
    return response;
  };
}
/**
 * ClaudeAuthProvider（v1）。
 */
//@ chunk-1kaj6e83.js:30776-56066 facade-exports = ClaudeAuthProvider (0.728)
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
  constructor(e, t, r = buildRedirectUri(), n = !1, s, h) {
    ((this.serverName = e),
      (this.serverConfig = t),
      (this.redirectUri = r),
      (this.handleRedirection = n),
      (this.onAuthorizationUrlCallback = s),
      (this.skipBrowserOpen = h ?? !1),
      (this._presented = Ny()));
  }
  get redirectUrl() {
    return this.redirectUri;
  }
  get authorizationUrl() {
    return this._authorizationUrl;
  }
  get clientMetadata() {
    let e = {
        client_name: `Claude Code (${this.serverName})`,
        redirect_uris: [this.redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      curatedMetadataScope = this.getCuratedMetadataScope();
    if (curatedMetadataScope)
      ((e.scope = curatedMetadataScope),
        logMCPDebug(
          this.serverName,
          `Using scope from metadata: ${redactSensitiveUrlParams("scope", e.scope)}`,
        ));
    return e;
  }
  get clientMetadataUrl() {
    if (!isLoopbackCallbackUri(this.redirectUri)) {
      logMCPDebug(
        this.serverName,
        `redirectUri ${redactUrlSecrets(this.redirectUri)} is not the document's loopback /callback: withholding CIMD client_id \u2014 registering via DCR`,
      );
      return;
    }
    let e = getClientMetadataDocumentUrl();
    if (e !== MCP_CLIENT_METADATA_URL) logMCPDebug(this.serverName, `Using CIMD URL from env: ${e}`);
    return e;
  }
  setMetadata(e) {
    this._metadata = e;
  }
  getCuratedMetadataScope() {
    let e = getScopeFromMetadata(this._metadata);
    if (e !== void 0) return e;
    if (this.serverConfig.oauth?.authServerMetadataUrl && Array.isArray(this._metadata?.scopes_supported))
      return this._metadata.scopes_supported.join(" ");
    return;
  }
  markStepUpPending(e) {
    ((this._pendingStepUpScope = e),
      logMCPDebug(this.serverName, `Marked step-up pending: ${redactSensitiveUrlParams("scope", e)}`));
  }
  get pendingStepUpScope() {
    return this._pendingStepUpScope;
  }
  get lastAuthRejection() {
    return this._lastAuthRejection;
  }
  noteAuthRejection(e, t, r) {
    let url = this.serverConfig.url;
    if (String(e) === (URL.canParse(url) ? new URL(url).href : url))
      this._lastAuthRejection = { status: t, accessToken: r?.startsWith("Bearer ") ? r.slice(7) : void 0 };
  }
  clearStepUpPending() {
    this._pendingStepUpScope = void 0;
  }
  clearStepUpPendingOnCredentialGone() {
    if (!this.handleRedirection) this.clearStepUpPending();
  }
  sawAuthChallenge = !1;
  authChallengeOpen = !1;
  noteServerAnswer(e, t) {
    let url = this.serverConfig.url;
    if (String(e) === (URL.canParse(url) ? new URL(url).href : url)) this.authChallengeOpen = t;
  }
  registrationOfferedByDiscovery = !1;
  async readCredentialStore() {
    let e = await readSecureStorageForMcp(
      this.handleRedirection
        ? void 0
        : {
            serverName: this.serverName,
            serverConfig: this.serverConfig,
            challenged: this.authChallengeOpen,
          },
    );
    if (e === READ_FAILED)
      throw (
        logMCPDebug(
          this.serverName,
          "Credential store could not be read (the login keychain may be locked); not reporting credentials as absent",
        ),
        new McpCredentialStoreUnavailableError(this.serverName)
      );
    return e;
  }
  async state() {
    if (!this._state)
      ((this._state = randomBytes(32).toString("base64url")),
        logMCPDebug(this.serverName, "Generated new OAuth state"));
    return this._state;
  }
  async clientInformation() {
    let clientInformation = await this.resolveClientInformation();
    return (
      this._presented.record(clientInformation?.client_secret),
      this._presented.record(basicAuthValue(clientInformation?.client_id, clientInformation?.client_secret)),
      clientInformation
    );
  }
  async resolveClientInformation() {
    let credentialStore = await this.readCredentialStore(),
      t = getServerKey(this.serverName, this.serverConfig),
      r = credentialStore?.mcpOAuthClientConfig?.[t]?.clientSecret,
      n = this.serverConfig.oauth?.clientId,
      s = credentialStore?.mcpOAuth?.[t],
      h =
        this.handleRedirection &&
        isClientMetadataDocumentId(s?.clientId) &&
        !isLoopbackCallbackUri(this.redirectUri);
    if (h) {
      if (
        (logMCPDebug(
          this.serverName,
          `Stored client_id is the CIMD document URL (loopback /callback only); current redirectUri is ${redactUrlSecrets(this.redirectUri)} \u2014 ${n ? "serving the configured client" : "registering via DCR"} instead`,
        ),
        n)
      )
        await this.patchStoredClientEntry(
          t,
          { clientId: n, clientSecret: void 0, redirectUri: this.redirectUri },
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
        if (!n) {
          logMCPDebug(
            this.serverName,
            `Cached client_id was registered for ${S}; current redirectUri is ${redactUrlSecrets(this.redirectUri)} \u2014 forcing re-DCR`,
          );
          return;
        }
        if (s.clientId !== n)
          return (
            logMCPDebug(
              this.serverName,
              `Stored client_id is stale and its redirectUri ${S} predates ${redactUrlSecrets(this.redirectUri)} \u2014 serving the configured client (no registration to redo)`,
            ),
            await this.patchStoredClientEntry(
              t,
              { clientId: n, clientSecret: void 0, redirectUri: this.redirectUri },
              "stale client_id repair",
            ),
            (this._lastServedClientId = n),
            { client_id: n, client_secret: r }
          );
        (logMCPDebug(
          this.serverName,
          `Stored redirectUri ${S} predates ${redactUrlSecrets(this.redirectUri)}, but the client_id is the configured one \u2014 serving it (no registration to redo)`,
        ),
          await this.patchStoredClientEntry(
            t,
            { redirectUri: this.redirectUri },
            "stored redirectUri convergence",
          ));
      }
      return (
        logMCPDebug(this.serverName, "Found client info"),
        (this._lastServedClientId = s.clientId),
        { client_id: s.clientId, client_secret: s.clientSecret ?? (s.clientId === n ? r : void 0) }
      );
    }
    if (n)
      return (
        logMCPDebug(this.serverName, "Using pre-configured client ID"),
        (this._lastServedClientId = n),
        { client_id: n, client_secret: r }
      );
    if (!this.handleRedirection && this.registrationOfferedByDiscovery && !s?.accessToken && !s?.refreshToken)
      throw (
        logMCPDebug(
          this.serverName,
          "No client info found; deferring client registration to authentication time",
        ),
        new McpClientRegistrationDeferredError(this.serverName)
      );
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
            return { ...s, mcpOAuth: { ...s.mcpOAuth, [e]: { ...h, ...t } } };
          })
        )?.success
      )
        logMCPDebug(this.serverName, `${r} resolved unsuccessful`);
    } catch (error) {
      logMCPDebug(this.serverName, `${r} failed: ${errorMessage(error)}`);
    }
  }
  async saveClientInformation(e) {
    (this._presented.record(e.client_secret),
      this._presented.record(basicAuthValue(e.client_id, e.client_secret)));
    let t = getServerKey(this.serverName, this.serverConfig);
    try {
      if (
        (
          await getSecureStorage().mutate((n) => ({
            ...n,
            mcpOAuth: {
              ...n.mcpOAuth,
              [t]: {
                ...n.mcpOAuth?.[t],
                serverName: this.serverName,
                serverUrl: this.serverConfig.url,
                clientId: e.client_id,
                clientSecret: e.client_secret,
                redirectUri: this.redirectUri,
                accessToken: n.mcpOAuth?.[t]?.accessToken || "",
                expiresAt: n.mcpOAuth?.[t]?.expiresAt,
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
    let credentialStore = await this.readCredentialStore(),
      t = getServerKey(this.serverName, this.serverConfig),
      r = credentialStore?.mcpOAuth?.[t];
    if (
      isXaaEnabled() &&
      this.serverConfig.oauth?.xaa &&
      !r?.refreshToken &&
      (!r?.accessToken || (r.expiresAt != null && (r.expiresAt - Date.now()) / 1000 <= 300))
    ) {
      if (!this._refreshInProgress)
        (logMCPDebug(
          this.serverName,
          r
            ? "XAA: access_token expiring, attempting silent exchange"
            : "XAA: no access_token yet, attempting silent exchange",
        ),
          (this._refreshInProgress = this.xaaRefresh().finally(() => {
            this._refreshInProgress = void 0;
          })));
      try {
        let _refreshInProgress = await this._refreshInProgress;
        if (_refreshInProgress)
          return (
            (this._lastServedAccessToken = _refreshInProgress.access_token),
            this._presented.record(_refreshInProgress.access_token),
            this._presented.record(_refreshInProgress.refresh_token),
            (this._lastServedRefreshToken = _refreshInProgress.refresh_token ?? this._lastServedRefreshToken),
            _refreshInProgress
          );
      } catch (error) {
        logMCPDebug(this.serverName, `XAA silent exchange failed: ${errorMessage(error)}`);
      }
    }
    if (!r) {
      (logMCPDebug(this.serverName, "No token data found"), this.clearStepUpPendingOnCredentialGone());
      return;
    }
    if (!r.accessToken) {
      (logMCPDebug(this.serverName, "No access token in storage"), this.clearStepUpPendingOnCredentialGone());
      return;
    }
    if (Adn(t, r.accessToken)) {
      logMCPDebug(
        this.serverName,
        "Not sending the stored access token, because the server rejected it earlier in this session",
      );
      return;
    }
    ((this._lastServedAccessToken = r.accessToken),
      this._presented.record(r.accessToken),
      this._presented.record(r.refreshToken),
      (this._lastServedRefreshToken = r.refreshToken));
    let n = r.expiresAt != null ? (r.expiresAt - Date.now()) / 1000 : void 0,
      _pendingStepUpScope = this._pendingStepUpScope,
      h = _pendingStepUpScope !== void 0;
    if (h)
      logMCPDebug(
        this.serverName,
        `Step-up pending (${redactSensitiveUrlParams("scope", _pendingStepUpScope)}), omitting refresh_token`,
      );
    if (n != null && n <= 0 && !r.refreshToken) {
      (logMCPDebug(this.serverName, "Token expired without refresh token"),
        this.clearStepUpPendingOnCredentialGone());
      return;
    }
    if (n != null && n <= 300 && r.refreshToken && !h) {
      if (!this._refreshInProgress)
        (logMCPDebug(this.serverName, `Token expires in ${Math.floor(n)}s, attempting proactive refresh`),
          (this._refreshInProgress = this.refreshAuthorization(r.refreshToken).finally(() => {
            this._refreshInProgress = void 0;
          })));
      else logMCPDebug(this.serverName, "Token refresh already in progress, reusing existing promise");
      try {
        let _refreshInProgress = await this._refreshInProgress;
        if (_refreshInProgress)
          return (
            logMCPDebug(this.serverName, "Token refreshed successfully"),
            (this._lastServedAccessToken = _refreshInProgress.access_token),
            this._presented.record(_refreshInProgress.access_token),
            this._presented.record(_refreshInProgress.refresh_token),
            (this._lastServedRefreshToken = _refreshInProgress.refresh_token ?? this._lastServedRefreshToken),
            _refreshInProgress
          );
        logMCPDebug(this.serverName, "Token refresh failed, returning current tokens");
      } catch (error) {
        logMCPDebug(this.serverName, `Token refresh error: ${yF(error, this.serverConfig.url)}`);
      }
    }
    let l = {
      access_token: r.accessToken,
      refresh_token: h ? void 0 : r.refreshToken,
      expires_in: n,
      scope: r.scope,
      token_type: "Bearer",
    };
    return (
      logMCPDebug(this.serverName, "Returning tokens"),
      logMCPDebug(this.serverName, `Has refresh token: ${!!l.refresh_token}`),
      logMCPDebug(this.serverName, n != null ? `Expires in: ${Math.floor(n)}s` : "No expiration specified"),
      l
    );
  }
  async saveTokens(e) {
    if (
      (this._presented.record(e.access_token),
      this._presented.record(e.refresh_token),
      this.handleRedirection)
    )
      this._pendingStepUpScope = void 0;
    let t = getServerKey(this.serverName, this.serverConfig);
    (logMCPDebug(this.serverName, "Saving tokens"),
      logMCPDebug(this.serverName, `Token expires in: ${e.expires_in}`),
      logMCPDebug(this.serverName, `Has refresh token: ${!!e.refresh_token}`));
    let r =
        this._servedOverrideAuthorizationServerUrl === void 0
          ? this._discoveredAuthorizationServer
          : { authorizationServerUrl: this._servedOverrideAuthorizationServerUrl, oauthMetadataFound: !0 },
      n = this.servedMetadataUrl() ?? this._discoveredAuthorizationServer?.servedMetadataUrl,
      s,
      h;
    try {
      s = await getSecureStorage().mutate((l) => ({
        ...l,
        mcpOAuth: {
          ...l.mcpOAuth,
          [t]: {
            ...l.mcpOAuth?.[t],
            serverName: this.serverName,
            serverUrl: this.serverConfig.url,
            accessToken: e.access_token,
            refreshToken: e.refresh_token ?? l.mcpOAuth?.[t]?.refreshToken,
            expiresAt: e.expires_in != null ? Date.now() + e.expires_in * 1000 : void 0,
            scope: e.scope,
            discoveryState: withoutTokenlessRejection(
              mergeSignInAuth({
                previous: l.mcpOAuth?.[t]?.discoveryState,
                signIn: r,
                servedMetadataUrl: n,
                interactiveSignIn: this.handleRedirection,
              }),
            ),
          },
        },
      }));
    } catch (error) {
      h = error;
    }
    if (s?.success)
      ((this._lastServedAccessToken = e.access_token),
        (this._lastServedRefreshToken = e.refresh_token ?? this._lastServedRefreshToken),
        recordSavedAccessToken(t, e.access_token));
    this.logTokenPersistFailed(s, h);
  }
  logTokenPersistFailed(e, t) {
    logStorageWriteFailure(this.serverName, this.serverConfig, e, t);
  }
  async xaaRefresh() {
    let e = getXaaIdpSettings();
    if (!e) return;
    let t = await getCachedIdpIdToken(e.issuer);
    if (!t) {
      logMCPDebug(this.serverName, "XAA: id_token not cached, needs interactive re-auth");
      return;
    }
    let r = this.serverConfig.oauth?.clientId,
      n = await getMcpClientConfig(this.serverName, this.serverConfig);
    if (!r || !n?.clientSecret) {
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
    let h = s ? void 0 : await getSecureStorage().readAsyncStrict?.(void 0, { inaccessibleAs: "failure" });
    if (h === READ_FAILED) {
      logMCPDebug(this.serverName, "XAA: no pin and the keychain is unreadable");
      return;
    }
    let l =
        s ?? xaaPinnedServer(h?.mcpOAuth?.[getServerKey(this.serverName, this.serverConfig)]?.discoveryState),
      S = await getIdpClientSecret(e.issuer),
      v;
    try {
      v = await discoverOidc(e.issuer);
    } catch (error) {
      logMCPDebug(this.serverName, `XAA: OIDC discovery failed in silent refresh: ${errorMessage(error)}`);
      return;
    }
    this._presented.record(n.clientSecret);
    try {
      let A = await performCrossAppAccess_2(
          this.serverConfig.url,
          {
            clientId: r,
            clientSecret: n.clientSecret,
            idpClientId: e.clientId,
            idpClientSecret: S,
            idpIdToken: t,
            idpTokenEndpoint: v.token_endpoint,
            pinnedAuthorizationServer: l,
          },
          this.serverName,
        ),
        y = getServerKey(this.serverName, this.serverConfig),
        U,
        w;
      try {
        U = await getSecureStorage().mutate((O) => {
          let F = O.mcpOAuth?.[y];
          return {
            ...O,
            mcpOAuth: {
              ...O.mcpOAuth,
              [y]: {
                ...F,
                serverName: this.serverName,
                serverUrl: this.serverConfig.url,
                accessToken: A.access_token,
                refreshToken: A.refresh_token ?? F?.refreshToken,
                expiresAt: A.expires_in != null ? Date.now() + A.expires_in * 1000 : void 0,
                scope: A.scope,
                clientId: r,
                clientSecret: n.clientSecret,
                discoveryState: pinXaaAuth({
                  previous: F?.discoveryState,
                  issuedBy: A.authorizationServerUrl,
                  interactiveSignIn: !1,
                }),
              },
            },
          };
        });
      } catch (error) {
        w = error;
      }
      return (
        this.logTokenPersistFailed(U, w),
        {
          access_token: A.access_token,
          token_type: "Bearer",
          expires_in: A.expires_in,
          scope: A.scope,
          refresh_token: A.refresh_token,
        }
      );
    } catch (error) {
      if (error instanceof XaaTokenExchangeError && error.shouldClearIdToken)
        (await clearIdpIdToken(e.issuer),
          logMCPDebug(this.serverName, "XAA: cleared id_token after exchange failure"));
      throw error;
    }
  }
  async redirectToAuthorization(e) {
    let t = this._pendingStepUpScope
        ? void 0
        : this.serverConfig.oauth?.scopes ||
          (this.serverConfig.oauth?.authServerMetadataUrl ? this.getCuratedMetadataScope() : void 0),
      r = e.searchParams.get("scope"),
      n = t ?? r;
    if (n !== r)
      logMCPDebug(
        this.serverName,
        `Overrode authorization scope from ${r ? redactSensitiveUrlParams("scope", r) : "NONE"} to configured: ${n ? redactSensitiveUrlParams("scope", n) : "NONE"}`,
      );
    let s = n === null ? null : maybeAppendOfflineAccess(n, this._metadata);
    if (s !== null && s !== r) {
      if ((e.searchParams.set("scope", s), s !== t))
        logMCPDebug(this.serverName, "Appended offline_access to authorization scope");
    }
    let h = isEntraLoginUrl(e),
      all = e.searchParams.getAll("prompt"),
      S = h ? all.filter((O) => O !== "consent") : all;
    if (S.length !== all.length || S.length > 1) {
      if ((e.searchParams.delete("prompt"), S.length > 0))
        e.searchParams.set("prompt", S.includes("consent") ? "consent" : S.at(-1));
    }
    this._authorizationUrl = e.toString();
    let v = e.searchParams.get("scope");
    if (
      (logMCPDebug(this.serverName, `Authorization URL: ${authorizationUrlForDebugLog(e)}`),
      logMCPDebug(
        this.serverName,
        `Scopes in URL: ${v ? redactSensitiveUrlParams("scope", v) : "NOT FOUND"}`,
      ),
      v)
    )
      ((this._scopes = v),
        logMCPDebug(
          this.serverName,
          `Captured scopes from authorization URL: ${redactSensitiveUrlParams("scope", v)}`,
        ));
    else {
      let curatedMetadataScope = this.getCuratedMetadataScope();
      if (curatedMetadataScope)
        ((this._scopes = curatedMetadataScope),
          logMCPDebug(
            this.serverName,
            `Using scopes from metadata: ${redactSensitiveUrlParams("scope", curatedMetadataScope)}`,
          ));
      else logMCPDebug(this.serverName, "No scopes available from URL or metadata");
    }
    if (this._scopes && !this.handleRedirection && this._pendingStepUpScope) {
      let O = getServerKey(this.serverName, this.serverConfig),
        _scopes = this._scopes,
        P = !1;
      try {
        await getSecureStorage().mutate((T) => {
          let E = T.mcpOAuth?.[O];
          if (!E) return T;
          return ((P = !0), { ...T, mcpOAuth: { ...T.mcpOAuth, [O]: { ...E, stepUpScope: _scopes } } });
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
    let str = e.toString();
    if (!str.startsWith("http://") && !str.startsWith("https://"))
      throw Error("Invalid authorization URL: must use http:// or https:// scheme");
    logMCPDebug(this.serverName, "Redirecting to authorization URL");
    let y = authorizationUrlForDebugLog(e);
    if ((logMCPDebug(this.serverName, `Authorization URL: ${y}`), this.onAuthorizationUrlCallback))
      this.onAuthorizationUrlCallback(str);
    if (this.skipBrowserOpen) {
      logMCPDebug(this.serverName, `Skipping browser open (skipBrowserOpen=true). URL: ${y}`);
      return;
    }
    let U = isBrowserUnavailable();
    if (U) logMCPDebug(this.serverName, `Skipping browser open (headless environment). URL: ${y}`);
    else logMCPDebug(this.serverName, `Opening authorization URL: ${y}`);
    let w = U ? !1 : await fi(str);
    if (
      (logEvent("tengu_mcp_oauth_browser_open", {
        success: w,
        headless: U,
        platform: fromEnum(getPlatform()),
      }),
      !U && !w)
    )
      logMCPDebug(this.serverName, "Browser didn't open automatically. URL is shown in UI.");
  }
  async saveCodeVerifier(e) {
    (logMCPDebug(this.serverName, "Saving code verifier"), (this._codeVerifier = e));
  }
  async codeVerifier() {
    if (!this._codeVerifier)
      throw (logMCPDebug(this.serverName, "No code verifier saved"), Error("No code verifier saved"));
    return (
      logMCPDebug(this.serverName, "Returning code verifier"),
      this._presented.record(this._codeVerifier),
      this._codeVerifier
    );
  }
  async invalidateCredentials(e) {
    if (e === "verifier") {
      ((this._codeVerifier = void 0),
        logMCPDebug(this.serverName, "Invalidated credentials (scope: verifier)"));
      return;
    }
    let t = e,
      r = getServerKey(this.serverName, this.serverConfig),
      n = !1;
    try {
      let _lastServedClientId = this._lastServedClientId,
        _lastServedAccessToken = this._lastServedAccessToken,
        _lastServedRefreshToken = this._lastServedRefreshToken;
      await getSecureStorage().mutate((S) => {
        let v = S.mcpOAuth?.[r];
        if (!v) return S;
        let A = { ...S.mcpOAuth };
        switch (t) {
          case "all": {
            let y =
                _lastServedAccessToken != null && !!v.accessToken && v.accessToken !== _lastServedAccessToken,
              U = _lastServedClientId != null && v.clientId != null && v.clientId !== _lastServedClientId;
            if (y || U)
              return (
                logMCPDebug(
                  this.serverName,
                  `invalidateCredentials('all') preserved: ${y ? "foreign token" : "concurrent re-registration"}`,
                ),
                S
              );
            if (!v.clientId && !v.refreshToken && v.accessToken === "") return S;
            A[r] = {
              serverName: v.serverName,
              serverUrl: v.serverUrl,
              accessToken: "",
              ...(v.discoveryState && { discoveryState: v.discoveryState }),
              ...(v.stepUpScope && { stepUpScope: v.stepUpScope }),
            };
            break;
          }
          case "client":
            A[r] = { ...v, clientId: void 0, clientSecret: void 0 };
            break;
          case "tokens": {
            if (
              (_lastServedRefreshToken != null &&
                v.refreshToken &&
                v.refreshToken !== _lastServedRefreshToken) ||
              (_lastServedAccessToken != null && !!v.accessToken && v.accessToken !== _lastServedAccessToken)
            )
              return (
                logMCPDebug(
                  this.serverName,
                  "invalidateCredentials('tokens') preserved: concurrent rotation",
                ),
                S
              );
            A[r] = { ...v, accessToken: "", refreshToken: void 0, expiresAt: 0 };
            break;
          }
          case "discovery":
            A[r] = {
              ...v,
              discoveryState: v.discoveryState && authDiscoveryState(v.discoveryState),
              stepUpScope: void 0,
            };
            break;
        }
        return ((n = !0), { ...S, mcpOAuth: A });
      });
    } catch (error) {
      logMCPDebug(this.serverName, `invalidateCredentials persist failed: ${errorMessage(error)}`);
    }
    if (n) logMCPDebug(this.serverName, `Invalidated credentials (scope: ${e})`);
  }
  async saveDiscoveryState(e) {
    if (this.serverConfig.oauth?.xaa) return;
    let t = getServerKey(this.serverName, this.serverConfig);
    logMCPDebug(
      this.serverName,
      `Saving discovery state (authServer: ${redactUrlSecrets(e.authorizationServerUrl)})`,
    );
    let authorizationServerMetadata = e.authorizationServerMetadata;
    this.registrationOfferedByDiscovery =
      authorizationServerMetadata !== void 0 &&
      (typeof authorizationServerMetadata.registration_endpoint === "string" ||
        (authorizationServerMetadata.client_id_metadata_document_supported === !0 &&
          this.clientMetadataUrl !== void 0));
    let n = {
        authorizationServerUrl: e.authorizationServerUrl,
        oauthMetadataFound: !!e.authorizationServerMetadata,
      },
      s =
        (e.authorizationServerMetadata !== void 0
          ? this._servedOverrideDocuments.get(e.authorizationServerMetadata)
          : void 0) ?? this.servedMetadataUrl();
    this._discoveredAuthorizationServer = { ...n, servedMetadataUrl: s };
    try {
      await getSecureStorage().mutate((h) => {
        let l = mergeDiscoveredAuth({
          previous: h.mcpOAuth?.[t]?.discoveryState,
          discovered: n,
          servedMetadataUrl: s,
        });
        return {
          ...h,
          mcpOAuth: {
            ...h.mcpOAuth,
            [t]: {
              ...h.mcpOAuth?.[t],
              serverName: this.serverName,
              serverUrl: this.serverConfig.url,
              accessToken: h.mcpOAuth?.[t]?.accessToken || "",
              expiresAt: h.mcpOAuth?.[t]?.expiresAt,
              discoveryState: {
                ...l,
                resourceMetadataUrl: e.resourceMetadataUrl,
                tokenlessRejectedAt: tokenlessRejectedAt(t, h.mcpOAuth?.[t]),
                registrationNotOfferedAt:
                  authorizationServerMetadata === void 0
                    ? h.mcpOAuth?.[t]?.discoveryState?.registrationNotOfferedAt
                    : typeof authorizationServerMetadata.registration_endpoint !== "string" &&
                        authorizationServerMetadata.client_id_metadata_document_supported !== !0
                      ? Date.now()
                      : void 0,
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
    return this._servedOverrideAuthorizationServerUrl === void 0
      ? void 0
      : this.serverConfig.oauth?.authServerMetadataUrl;
  }
  async discoveryState() {
    this._servedOverrideAuthorizationServerUrl = void 0;
    let e = this.serverConfig.oauth?.authServerMetadataUrl;
    if (this.authChallengeOpen) await this.readCredentialStore();
    let t = await hasStoredOAuthState(this.serverName, this.serverConfig);
    if (t === READ_FAILED) {
      if (this.serverConfig.oauth?.xaa) throw new McpCredentialStoreUnavailableError(this.serverName);
    } else if (t) return { authorizationServerUrl: t };
    if (e) {
      logMCPDebug(this.serverName, `Fetching metadata from configured URL: ${redactUrlSecrets(e)}`);
      try {
        let l = await fetchAuthServerMetadata_2(this.serverName, this.serverConfig.url, {
          configuredMetadataUrl: e,
          fetchFn: wrapFetchWithHeaders(this.serverName, this.serverConfig, createAuthFetch()),
        });
        if (l)
          return (
            (this._servedOverrideAuthorizationServerUrl = l.issuer),
            this._servedOverrideDocuments.set(l, e),
            { authorizationServerUrl: l.issuer, authorizationServerMetadata: l }
          );
      } catch (error) {
        logMCPDebug(
          this.serverName,
          `Failed to fetch from configured metadata URL: ${yF(error, this.serverConfig.url)}`,
        );
      }
      return;
    }
    let async = await getSecureStorage().readAsync(),
      s = getServerKey(this.serverName, this.serverConfig),
      h = async?.mcpOAuth?.[s]?.discoveryState;
    if (h?.authorizationServerUrl)
      return (
        logMCPDebug(
          this.serverName,
          `Returning cached discovery state (authServer: ${redactUrlSecrets(h.authorizationServerUrl)})`,
        ),
        {
          authorizationServerUrl: h.authorizationServerUrl,
          resourceMetadataUrl: h.resourceMetadataUrl,
          resourceMetadata: h.resourceMetadata,
          authorizationServerMetadata: h.authorizationServerMetadata,
        }
      );
    return;
  }
  async refreshAuthorization(e) {
    if (isDiskless()) {
      logMCPDebug(this.serverName, "claude-code-server session; skipping refresh");
      return;
    }
    let t = getServerKey(this.serverName, this.serverConfig),
      r = getProjectDirsUpToHome();
    await getFsImplementation().mkdir(r);
    let replaced = t.replace(/[^a-zA-Z0-9]/g, "_"),
      s = join(r, `mcp-refresh-${replaced}.lock`),
      h;
    for (let l = 0; l < MAX_METADATA_REDIRECTS; l++)
      try {
        (logMCPDebug(this.serverName, `Acquiring refresh lock (attempt ${l + 1})`),
          (h = await lock(s, {
            realpath: !1,
            stale: 60000,
            update: 5000,
            onCompromised: () => {
              logMCPDebug(this.serverName, "Refresh lock was compromised");
            },
          })),
          logMCPDebug(this.serverName, "Acquired refresh lock"));
        break;
      } catch (error) {
        let v = getErrnoCode(error);
        if (v === "ELOCKED") {
          (logMCPDebug(
            this.serverName,
            `Refresh lock held by another process, waiting (attempt ${l + 1}/${MAX_METADATA_REDIRECTS})`,
          ),
            await sleep(1000 + Math.random() * 1000));
          continue;
        }
        logMCPDebug(this.serverName, `Failed to acquire refresh lock: ${v}; skipping refresh`);
        return;
      }
    if (!h) {
      logMCPDebug(
        this.serverName,
        `Could not acquire refresh lock after ${MAX_METADATA_REDIRECTS} retries; skipping refresh`,
      );
      return;
    }
    try {
      clearKeychainCache();
      let v = (await getSecureStorage().readAsync())?.mcpOAuth?.[t];
      if (v) {
        let A = v.expiresAt != null ? (v.expiresAt - Date.now()) / 1000 : void 0;
        if (v.accessToken && (A == null || A > 300))
          return (
            logMCPDebug(
              this.serverName,
              A != null
                ? `Another process already refreshed tokens (expires in ${Math.floor(A)}s)`
                : "Another process already refreshed tokens (no expiration)",
            ),
            {
              access_token: v.accessToken,
              refresh_token: v.refreshToken,
              expires_in: A,
              scope: v.scope,
              token_type: "Bearer",
            }
          );
        if (v.refreshToken)
          ((e = v.refreshToken),
            (this._lastServedRefreshToken = v.refreshToken),
            this._presented.record(v.refreshToken));
      }
      return await this._doRefresh(e);
    } finally {
      if (h)
        try {
          (await h(), logMCPDebug(this.serverName, "Released refresh lock"));
        } catch {
          logMCPDebug(this.serverName, "Failed to release refresh lock");
        }
    }
  }
  async readConcurrentRefreshWinner() {
    clearKeychainCache();
    let t = (await getSecureStorage().readAsync())?.mcpOAuth?.[
        getServerKey(this.serverName, this.serverConfig)
      ],
      r = t?.expiresAt != null ? (t.expiresAt - Date.now()) / 1000 : void 0;
    if (t?.accessToken && (r == null || r > 300)) {
      logMCPDebug(this.serverName, "Another process landed fresh tokens; using those");
      let n = {
        access_token: t.accessToken,
        refresh_token: t.refreshToken,
        expires_in: r,
        scope: t.scope,
        token_type: "Bearer",
      };
      return { tokenData: t, freshTokens: n };
    }
    return { tokenData: t, freshTokens: void 0 };
  }
  async _doRefresh(e) {
    this._presented.record(e);
    let t = 3,
      r = ET(this.serverConfig),
      n = (s, h) => {
        logEvent(s === "success" ? "tengu_mcp_oauth_refresh_success" : "tengu_mcp_oauth_refresh_failure", {
          transportType: fromEnum(this.serverConfig.type),
          ...(r && { mcpServerBaseUrl: r }),
          ...(h && { reason: fromEnum(h) }),
        });
      };
    for (let s = 1; s <= t; s++) {
      let h;
      try {
        logMCPDebug(this.serverName, "Starting token refresh");
        let l = wrapFetchWithHeaders(this.serverName, this.serverConfig, createAuthFetch()),
          _metadata = this._metadata;
        if (!_metadata) {
          let discoveryState = await this.discoveryState();
          if (discoveryState?.authorizationServerMetadata)
            _metadata = discoveryState.authorizationServerMetadata;
          else if (discoveryState?.authorizationServerUrl)
            (logMCPDebug(
              this.serverName,
              `Re-discovering metadata from persisted auth server URL: ${redactUrlSecrets(discoveryState.authorizationServerUrl)}`,
            ),
              (_metadata = await s1t(discoveryState.authorizationServerUrl, { fetchFn: l })));
        }
        if (
          !_metadata &&
          !this.serverConfig.oauth?.xaa &&
          (await hasStoredOAuthState(this.serverName, this.serverConfig)) === void 0
        )
          _metadata = await fetchAuthServerMetadata_2(this.serverName, this.serverConfig.url, {
            configuredMetadataUrl: this.serverConfig.oauth?.authServerMetadataUrl,
            fetchFn: l,
          });
        if (!_metadata) {
          (logMCPDebug(this.serverName, "Failed to discover OAuth metadata"),
            n("failure", "metadata_discovery_failed"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_metadata_failed"));
          return;
        }
        if (((this._metadata = _metadata), (h = await this.clientInformation()), !h)) {
          (logMCPDebug(this.serverName, "No client information available"),
            n("failure", "no_client_info"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_no_client_info"));
          return;
        }
        let v = await eHo(new URL(this.serverConfig.url), {
          metadata: _metadata,
          clientInformation: h,
          refreshToken: e,
          resource: new URL(this.serverConfig.url),
          fetchFn: l,
        });
        if (v)
          return (
            logMCPDebug(this.serverName, "Token refresh successful"),
            await this.saveTokens(v),
            n("success"),
            logFeatureOk("mcp_oauth_refresh"),
            v
          );
        (logMCPDebug(this.serverName, "Token refresh returned no tokens"),
          n("failure", "no_tokens_returned"),
          logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_no_tokens"));
        return;
      } catch (error) {
        if (error instanceof J_t) {
          logMCPDebug(this.serverName, `Token refresh failed with invalid_grant: ${error.message}`);
          let { freshTokens: freshTokens } = await this.readConcurrentRefreshWinner();
          if (freshTokens)
            return (logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_winner"), freshTokens);
          (logMCPDebug(this.serverName, "No valid tokens in storage, clearing stored tokens"),
            n("failure", "invalid_grant"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_invalid_grant"),
            await this.invalidateCredentials("tokens"),
            AUTH_LOST_SIGNAL.emit(this.serverName));
          return;
        }
        if (
          error instanceof TM &&
          (error.errorCode === "invalid_client" || error.errorCode === "unauthorized_client")
        ) {
          logMCPDebug(
            this.serverName,
            "Token refresh failed: DCR client expired or invalid; clearing stored client registration",
          );
          let { tokenData: tokenData, freshTokens: freshTokens } = await this.readConcurrentRefreshWinner();
          if (freshTokens)
            return (logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_winner"), freshTokens);
          if (tokenData?.clientId && h && tokenData.clientId !== h.client_id) {
            (logMCPDebug(this.serverName, "Another process re-registered client; preserving"),
              n("failure", "concurrent_reregister"),
              logFeatureSad("mcp_oauth_refresh", "mcp_oauth_refresh_concurrent_reregister"));
            return;
          }
          (n("failure", error.errorCode === "unauthorized_client" ? "unauthorized_client" : "invalid_client"),
            logFeatureBad(
              "mcp_oauth_refresh",
              error.errorCode === "unauthorized_client"
                ? "mcp_oauth_refresh_unauthorized_client"
                : "mcp_oauth_refresh_invalid_client",
            ),
            await this.invalidateCredentials("all"),
            AUTH_LOST_SIGNAL.emit(this.serverName));
          return;
        }
        if (isZodError(error)) {
          (logMCPDebug(
            this.serverName,
            `Token refresh failed: token response rejected by SDK schema: ${errorMessage(error)}`,
          ),
            n("failure", "token_response_schema_rejected"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_token_response_schema_rejected"));
          return;
        }
        let S = error instanceof McpCredentialStoreUnavailableError,
          v = error instanceof Error && /timeout|timed out|etimedout|econnreset/i.test(error.message),
          A = error instanceof Jze || error instanceof scn || error instanceof icn,
          y = v || A || S;
        if (!y || s >= t) {
          (logMCPDebug(this.serverName, `Token refresh failed: ${yF(error, this.serverConfig.url)}`),
            n("failure", y ? "transient_retries_exhausted" : "request_failed"),
            logFeatureBad("mcp_oauth_refresh", "mcp_oauth_refresh_request_failed"));
          return;
        }
        let U = 1000 * Math.pow(2, s - 1);
        (logMCPDebug(this.serverName, `Token refresh failed, retrying in ${U}ms (attempt ${s}/${t})`),
          await sleep(U));
      }
    }
    return;
  }
}
/**
 * readClientSecret（v1）。
 */
//@ chunk-1kaj6e83.js:56066-56725 facade-exports = readClientSecret (1)
async function readClientSecret() {
  let envSecret = process.env.MCP_CLIENT_SECRET;
  if (envSecret) return envSecret;
  if (!process.stdin.isTTY)
    throw Error("No TTY available to prompt for client secret. Set MCP_CLIENT_SECRET env var instead.");
  return new Promise((resolve, reject) => {
    (process.stderr.write("Enter OAuth client secret: "), process.stdin.setRawMode?.(!0));
    let secret = "",
      onData = (ch) => {
        let str = ch.toString();
        if (
          str ===
            `
` ||
          str === "\r"
        )
          (process.stdin.setRawMode?.(!1),
            process.stdin.removeListener("data", onData),
            process.stderr.write(`
`),
            resolve(secret));
        else if (str === "\x03")
          (process.stdin.setRawMode?.(!1),
            process.stdin.removeListener("data", onData),
            reject(Error("Cancelled")));
        else if (str === "\x7F" || str === "\b") secret = secret.slice(0, -1);
        else secret += str;
      };
    process.stdin.on("data", onData);
  });
}
/**
 * saveMcpClientSecret（v1）。
 */
//@ chunk-1kaj6e83.js:56725-56921 facade-exports = saveMcpClientSecret (0.631)
async function saveMcpClientSecret(serverName, serverConfig, clientSecret) {
  let serverKey = getServerKey(serverName, serverConfig);
  try {
    return await getSecureStorage().mutate((s) => ({
      ...s,
      mcpOAuthClientConfig: { ...s.mcpOAuthClientConfig, [serverKey]: { clientSecret: clientSecret } },
    }));
  } catch (error) {
    return { success: !1, warning: errorMessage(error) };
  }
}
/**
 * getMcpClientConfig（v1）：读 mcpOAuthClientConfig[serverKey]。
 */
//@ chunk-1kaj6e83.js:56921-57109 facade-exports = getMcpClientConfig (0.711)
async function clearMcpClientConfig(serverName, serverConfig) {
  let serverKey = getServerKey(serverName, serverConfig);
  await getSecureStorage().mutate((n) => {
    if (!n.mcpOAuthClientConfig?.[serverKey]) return n;
    let s = { ...n.mcpOAuthClientConfig };
    return (delete s[serverKey], { ...n, mcpOAuthClientConfig: s });
  });
}
/**
 * 从安全存储读取某服务器的 OAuth 客户端配置。（v1 副本）
 */
//@ chunk-1kaj6e83.js:57109-57208 facade-exports
async function getMcpClientConfig(e, t) {
  let async = await getSecureStorage().readAsync(),
    s = getServerKey(e, t);
  return async?.mcpOAuthClientConfig?.[s];
}
//@ chunk-1kaj6e83.js:57208-57381 fingerprint = getScopeFromMetadata (0.903)
function getScopeFromMetadata(metadata) {
  if (!metadata) return;
  if ("scope" in metadata && typeof metadata.scope === "string") return metadata.scope;
  if ("default_scope" in metadata && typeof metadata.default_scope === "string")
    return metadata.default_scope;
  return;
}
/**
 * shouldRequestOfflineAccess（v1 副本）。
 */
//@ chunk-1kaj6e83.js:57381-57577 facade-exports
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
  ],
  ENTRA_LOGIN_HOST_SUFFIXES_V1 = [".b2clogin.com", ".ciamlogin.com"];
/**
 * 判断 URL 是否是 Microsoft Entra 登录域。（v1 副本）
 */
//@ chunk-1kaj6e83.js:57739-57876 facade-exports
function isEntraLoginUrl(e) {
  try {
    let hostname = (typeof e === "string" ? new URL(e) : e).hostname;
    return (
      ENTRA_LOGIN_HOSTS_V1.includes(hostname) ||
      ENTRA_LOGIN_HOST_SUFFIXES_V1.some((r) => hostname.endsWith(r))
    );
  } catch {
    return !1;
  }
}
//@ chunk-yqnmafqp.js:338-346 placement
var N = 8;
//@ chunk-yqnmafqp.js:346-376 placement
var F = /^v?\d+(?:[._-]\d+)*$/i;
//@ chunk-yqnmafqp.js:376-557 placement
var regExp = new RegExp("^[A-Za-z0-9._~+/=%-]+$"),
  regExp_2 = new RegExp("[^A-Za-z0-9._~+/=%-]+"),
  K = /^(?=.{1,32}$)(?:[a-z]+|[A-Z][a-z]{2,}|[A-Z]+|\d+)(?:[-_](?:[a-z]+|[A-Z][a-z]{2,}|[A-Z]+|\d+))*$/;
//@ chunk-yqnmafqp.js:557-644 placement
function p_yqnm(t) {
  return /[a-z]/i.test(t) && (/\d/.test(t) || (/[a-z]/.test(t) && /[A-Z]/.test(t)));
}
//@ chunk-yqnmafqp.js:644-719 placement
function h(t) {
  return t.length >= 24 && regExp.test(t) && !F.test(t) && !K.test(t) && p_yqnm(t);
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
var MEDIA_TYPE_RE =
    /^(?:\*|application|audio|font|example|haptics|image|message|model|multipart|text|video)\/(?:\*|[a-z0-9](?:[a-z0-9!#$&^_.+-])*)(?:\s*;\s*[a-z0-9!#$&^_.-]+=[\w!#$&^_.+-]*)*$/i,
  q = /^(?:gzip|x-gzip|deflate|br|zstd|compress|identity|\*)(?:\s*;\s*q=[\d.]+)?$/i,
  G = /^charset=[\w.:-]+$/i,
  V = /(?<![;,\s])[;,\s]+$/;
//@ chunk-yqnmafqp.js:1169-1329 placement
function isBenignHeaderValue(t) {
  let filtered = t
    .replace(V, "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (filtered.length === 0) return !1;
  return filtered.every((n) => MEDIA_TYPE_RE.test(n) || q.test(n) || G.test(n));
}
//@ chunk-yqnmafqp.js:1329-1617 placement
var BENIGN_HEADER_NAMES = new Set([
    "accept",
    "accept-encoding",
    "content-length",
    "content-type",
    "user-agent",
  ]),
  Q = /^\d+$/,
  W = /(?:^|[^A-Za-z0-9_-])[A-Za-z][A-Za-z0-9_-]{1,31}\s+[A-Za-z0-9._~+/=%-]{8,}(?![A-Za-z0-9._~+/=%-])/,
  Y = /([;,&\s]+)/,
  J = /[a-z0-9+.-]+/gi,
  X = /^(?:https?|wss?|ftp)$/i,
  tt_yqnm = /[;,&=]/,
  et = /[\t\n\r]/g;
//@ chunk-yqnmafqp.js:1617-1663 placement
function looksLikeTokenSegment(t) {
  return t.length >= N && p_yqnm(t) && !isBenignHeaderValue(t);
}
//@ chunk-yqnmafqp.js:1663-1728 placement
function b(t) {
  return looksLikeTokenSegment(t) || (t.includes("+") && t.split("+").some(looksLikeTokenSegment));
}
//@ chunk-yqnmafqp.js:1728-1921 placement
function nt_yqnm(t) {
  return (
    t.split(/\s+/).some((e) => e.includes("+") && e.split("+").some(looksLikeTokenSegment)) ||
    t.split(/[;,&\s]+/).some((e) => {
      let index = e.indexOf("=");
      return index === -1 ? b(e) : b(e.slice(0, index)) || b(e.slice(index + 1));
    })
  );
}
//@ chunk-yqnmafqp.js:1921-2006 placement
function isSafeHeaderValue(t, e) {
  if (t === "user-agent") return !W.test(e);
  return Q.test(e) || (isBenignHeaderValue(e) && !nt_yqnm(e));
}
/**
 * 请求头脱敏：只有白名单内的无害头名且值通过安全检查时保留原值，其余一律替换成 `[REDACTED]`；用于 MCP/XAA 调试日志打印请求头。
 */
//@ chunk-yqnmafqp.js:2006-2134 placement = redactSecrets (0.815)
function redactHeaders(content) {
  let e = {};
  for (let [n, o] of Object.entries(content)) {
    let lower = n.toLowerCase();
    e[n] = BENIGN_HEADER_NAMES.has(lower) && isSafeHeaderValue(lower, o) ? o : "[REDACTED]";
  }
  return e;
}
//@ chunk-yqnmafqp.js:2134-2403 layout
function looksLikeUrlWithScheme(t, e = !1) {
  let replaced = t.replace(et, "");
  if (!replaced.includes(":")) return !1;
  let o = e ? -1 : replaced.lastIndexOf("?");
  for (let r of replaced.matchAll(J)) {
    let c = r.index + r[0].length;
    if (replaced[c] !== ":" || !/[a-z]/i.test(r[0])) continue;
    if (/[/\\]/.test(replaced[c + 1] ?? "") || (!e && X.test(r[0])) || o > c) return !0;
  }
  return !1;
}
//@ chunk-yqnmafqp.js:2403-2500 layout
function R(t) {
  let e = t;
  for (let n = 0; ; n++) {
    if (looksLikeUrlWithScheme(e)) return !0;
    let o = n < 3 ? safeDecodeURIComponent(e) : e;
    if (o === e) return !1;
    e = o;
  }
}
//@ chunk-yqnmafqp.js:2500-2607 layout
function userinfoAtIndex(t) {
  let e = t.length < 2 ? -1 : t.lastIndexOf("@", t.length - 2),
    index = t.indexOf(":");
  return index !== -1 && e > index + 1 ? e : -1;
}
//@ chunk-yqnmafqp.js:2607-2784 layout
function looksLikeSecretBearingText(t, e = !0) {
  for (let n of uniq([t, t.replaceAll(" ", "+")])) {
    let o = n;
    for (let r = 0; ; r++) {
      if (h(o) || looksLikeUrlWithScheme(o) || userinfoAtIndex(o) !== -1 || (e && A(o))) return !0;
      let c = r < 3 ? safeDecodeURIComponent(o) : o;
      if (c === o) break;
      o = c;
    }
  }
  return !1;
}
//@ chunk-yqnmafqp.js:2784-2828 layout
function x(t, e) {
  return !e || looksLikeSecretBearingText(t) ? "REDACTED" : t;
}
//@ chunk-yqnmafqp.js:2828-2863 layout
function m(t) {
  return h(t) || h(safeDecodeURIComponent(t));
}
//@ chunk-yqnmafqp.js:2863-2923 layout
function A(t) {
  return t.replace(/\s+/g, "+").split(regExp_2).some(m);
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
/**
 * redactUrlSearchParams：把 URL 查询串中的敏感 OAuth 参数值替换为 REDACTED。
 */
//@ chunk-yqnmafqp.js:3325-3506 layout
function redactUrlSearchParams(t) {
  let uRLSearchParams = new URLSearchParams();
  for (let [o, r] of t.searchParams) {
    let c = x(o, r !== "");
    uRLSearchParams.append(c, c === "REDACTED" ? "REDACTED" : redactSensitiveUrlParams(o, r));
  }
  let str = uRLSearchParams.toString();
  return str === "" ? "" : `?${str}`;
}
/**
 * redactSensitiveUrlParams：日志中把 URL/字段里的敏感 OAuth 参数（state、nonce、code…）替换为 REDACTED。
 */
//@ chunk-yqnmafqp.js:3506-3707 callgraph-fingerprint = redactSensitiveUrlParams (0.308)
function redactSensitiveUrlParams(t, e) {
  let n = SENSITIVE_OAUTH_PARAMS.get(t);
  if (n === void 0) return "REDACTED";
  switch (n) {
    case "sensitive":
      return "[REDACTED]";
    case "url":
      return R(e) || R(e.replaceAll(" ", "+")) ? redactUrlSecrets(e) : "REDACTED";
    case "judged":
      return st(e);
  }
}
//@ chunk-yqnmafqp.js:3707-3870 affinity
function st(t) {
  let e = [],
    n = [],
    o = () => {
      if (n.length > 0) (e.push(...it(n)), (n = []));
    };
  for (let r of t.split(" "))
    if (R(r)) (o(), e.push(redactUrlSecrets(r)));
    else n.push(r);
  return (o(), e.join(" "));
}
//@ chunk-yqnmafqp.js:3870-4135 affinity
function it(t) {
  if (looksLikeSecretBearingText(t.join(" "), !1)) return ["REDACTED"];
  let e = [],
    n = [],
    o = () => {
      if (n.length > 0)
        (e.push(
          ...(looksLikeSecretBearingText(n.join("+"))
            ? ["REDACTED"]
            : n.map((r) => (looksLikeSecretBearingText(r) ? "REDACTED" : r))),
        ),
          (n = []));
    };
  for (let r of t)
    if (r === "" || regExp.test(r)) n.push(r);
    else (o(), e.push(looksLikeSecretBearingText(r) || A(r) ? "REDACTED" : r));
  return (o(), e);
}
/**
 * URL 带用户名/密码或无法解析时返回 true。
 */
//@ chunk-yqnmafqp.js:5542-5633 placement = validateURL (0.823)
function urlHasCredentials(url) {
  try {
    let e = new URL(url);
    return e.username !== "" || e.password !== "";
  } catch {
    return !0;
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
function at_yqnm(t, e) {
  let n = String(e);
  return urlHasCredentials(n) && !isExpectedAuthError(t)
    ? `${t instanceof Error ? t.name : typeof t} fetching ${redactUrlSecrets(n)}`
    : errorMessage(t);
}
//@ chunk-yqnmafqp.js:5879-5945 placement
function ct_yqnm(t) {
  try {
    return redactUrlSecrets(t) === new URL(t).href;
  } catch {
    return !1;
  }
}
//@ chunk-yqnmafqp.js:5945-6007 placement
function yF(t, e) {
  return describeFetchError(t, String(e), "from the MCP SDK for");
}
//@ chunk-yqnmafqp.js:6007-6229 placement
function describeFetchError(t, e, n) {
  if (isExpectedAuthError(t) || ct_yqnm(e)) return errorMessage(t);
  let o = t instanceof Error ? /\bHTTP (\d{3})\b/.exec(t.message)?.[1] : void 0,
    r = extractConnectionErrorDetails(t)?.code;
  return `${o ? `HTTP ${o}` : t instanceof Error ? t.name : typeof t} ${n} ${redactUrlSecrets(e)}${r ? ` (${r})` : ""}`;
}
/**
 * 简要描述错误：可安全展示的直接用消息，否则只给错误类型与错误码。
 */
//@ chunk-yqnmafqp.js:6229-6345 placement
function describeErrorBrief(t) {
  if (isExpectedAuthError(t)) return errorMessage(t);
  let e = extractConnectionErrorDetails(t)?.code;
  return `${t instanceof Error ? t.name : typeof t}${e ? ` (${e})` : ""}`;
}
/**
 * describeConnectError：连接错误描述，远程传输附带 URL（拨号阶段）。
 */
//@ chunk-yqnmafqp.js:6345-6547 placement = expandEnvVars (0.824)
function describeConnectError(t, e) {
  switch (e.type) {
    case "ws":
    case "ws-ide":
    case "sse":
    case "sse-ide":
    case "http":
    case "claudeai-proxy":
      return describeFetchError(t, e.url, "dialing");
    case void 0:
    case "stdio":
    case "sdk":
      return errorMessage(t);
    default:
      return e;
  }
}
//@ chunk-yqnmafqp.js:6547-6599 placement
function JHe(t, e) {
  let n = describeConnectError(t, e);
  return n === errorMessage(t) ? t : n;
}
/**
 * fetch 出错时若 URL 含凭据，抛出不含凭据的 TypeError（保留错误码），否则原样抛出。
 */
//@ chunk-yqnmafqp.js:6599-6738 placement
function rethrowRedactedFetchError(t, e) {
  if (isExpectedAuthError(t)) throw t;
  if (urlHasCredentials(String(e))) {
    let n = extractConnectionErrorDetails(t)?.code;
    throw Object.assign(TypeError(at_yqnm(t, e)), n === void 0 ? {} : { code: n });
  }
  throw t;
}
/**
 * getServerKey：OAuth 令牌存储键 "<name>|<sha256(type,url,headers) 前 16 位>"。
 */
//@ chunk-cyj440je.js:8407-8551 fingerprint = getServerKey (1)
function getServerKey(serverName, serverConfig) {
  let configJson = jsonStringify({
      type: serverConfig.type,
      url: serverConfig.url,
      headers: serverConfig.headers || {},
    }),
    hash = createHash("sha256").update(configJson).digest("hex").substring(0, 16);
  return `${serverName}|${hash}`;
}
/**
 * 判断请求头对象里是否有 Authorization 头（大小写不敏感）。
 */
//@ chunk-cyj440je.js:8551-8634 layout
function hasAuthorizationHeader(e) {
  return Object.keys(e).some((r) => r.toLowerCase() === "authorization");
}
/**
 * 判断 MCP 服务器配置的 headers 是否带 Authorization 头（带了就视为外部自带凭证，不走 OAuth）。
 */
//@ chunk-cyj440je.js:8634-8675 layout
function configHasAuthorizationHeader(e) {
  return hasAuthorizationHeader(e.headers ?? {});
}
//@ chunk-cyj440je.js:8675-8724 layout
var DESIGN_PATH_PREFIX = "/v1/design/",
  FIRST_PARTY_MCP_PATH_PREFIXES = [DESIGN_PATH_PREFIX, "/v1/claude/test/", DOCS_MCP_PATH];
/**
 * isFirstPartyMcpUrl：https 且 Anthropic 域名下 /v1/design/、/v1/claude/test/ 等一方 MCP 路径。
 */
//@ chunk-cyj440je.js:8724-8913 layout
function isFirstPartyMcpUrl(e) {
  try {
    let r = new URL(e);
    if (r.protocol !== "https:" || !isFirstPartyAnthropicHost(r.href)) return !1;
    if (
      FIRST_PARTY_MCP_PATH_PREFIXES.some((o) =>
        o.endsWith("/") ? r.pathname.startsWith(o) : r.pathname === o,
      )
    )
      return !0;
    return !1;
  } catch {
    return !1;
  }
}
/**
 * 判断 URL 是否是一方 MCP 网关上的 Design 连接器路径（一方 MCP 主机且 path 以 Design 前缀开头）；解析失败返回 false。
 */
//@ chunk-cyj440je.js:8913-9004 layout
function isDesignMcpUrl(e) {
  try {
    let r = new URL(e);
    return isFirstPartyMcpUrl(r) && r.pathname.startsWith(DESIGN_PATH_PREFIX);
  } catch {
    return !1;
  }
}
/**
 * usesNonOAuthAuth：XAA、自定义 headers/headersHelper 或一方登录的服务器（不走标准 OAuth 发现）。
 */
//@ chunk-cyj440je.js:9004-9159 layout
function usesNonOAuthAuth(e) {
  if (isXaaEnabled() && e.oauth?.xaa) return !0;
  if (e.headersHelper || (e.headers && Object.keys(e.headers).length > 0)) return !0;
  if (isFirstPartyMcpUrl(e.url) && isFirstPartyProvider()) return !0;
  return !1;
}
/**
 * 判断服务器是否已有"外部认证"：配置了 Authorization 头、或是 CCR 托管配置、或是一方 MCP URL 且已一方登录并允许使用；有则跳过 OAuth 流程。
 */
//@ chunk-cyj440je.js:9159-9217 layout
function hasExternalAuthForConfig(e, r) {
  return (
    configHasAuthorizationHeader(e) || Zl(e) || (isFirstPartyMcpUrl(e.url) && isFirstPartyProvider() && r)
  );
}
/**
 * 异步判断安全存储里某服务器是否保存了 refresh token（存储为特殊哨兵值时视为有）；用于决定能否静默刷新而不是标记 needs-auth。
 */
//@ chunk-cyj440je.js:9217-9322 layout
async function hasStoredRefreshToken(e, r) {
  let o = await readSecureStorageForMcp();
  if (o === READ_FAILED) return !0;
  return !!o?.mcpOAuth?.[getServerKey(e, r)]?.refreshToken;
}
/**
 * hasMcpDiscoveryButNoToken：存储里有发现状态但没有访问令牌。
 */
//@ chunk-cyj440je.js:9322-9454 fingerprint = hasMcpDiscoveryButNoToken (0.717)
async function hasMcpDiscoveryButNoToken(serverName, serverConfig) {
  let o = await readSecureStorageForMcp();
  if (o === READ_FAILED) return READ_FAILED;
  let entry = o?.mcpOAuth?.[getServerKey(serverName, serverConfig)];
  return !!entry?.accessToken || !!entry?.refreshToken;
}
//@ chunk-4w0z5wdp.js:335-418 placement
var i = ["microsoft365.mcp.claude.com", "gmail.mcp.claude.com", "gcal.mcp.claude.com"];
//@ chunk-4w0z5wdp.js:418-473 placement
function p(t) {
  return t.toLowerCase().replace(/\.$/, "");
}
//@ chunk-4w0z5wdp.js:473-708 placement
function localOAuthBlockedHosts() {
  let t = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_local_oauth_blocked_hosts", { hosts: i }),
    e = i;
  if (t !== null && typeof t === "object" && "hosts" in t && Array.isArray(t.hosts)) {
    let filtered = t.hosts.filter((host) => typeof host === "string");
    if (filtered.length > 0) e = filtered;
  }
  return new Set(e.map(p));
}
//@ chunk-4w0z5wdp.js:708-804 placement
function c(t) {
  if (!t) return !1;
  try {
    let e = p(new URL(t).hostname);
    return localOAuthBlockedHosts().has(e);
  } catch {
    return !1;
  }
}
/**
 * Anthropic 托管 MCP 服务器不支持本地 OAuth 时的提示：请在 claude.ai 连接器中连接，可附带移除旧配置的命令。
 */
//@ chunk-4w0z5wdp.js:804-1195 placement
function anthropicHostedOAuthMessage(t, e = {}) {
  let o =
      `"${uo(t)}" is Anthropic-hosted and doesn't support local OAuth. ` +
      "Connect it via Settings \u2192 Connectors on claude.ai (requires " +
      "`claude login`), then it'll be available here automatically.",
    r =
      e.scope === "local" || e.scope === "project" || e.scope === "user"
        ? claudeCommand("mcp remove", t)
        : null,
    s = r ? `${o} Remove the stale entry with: \`${r}\`` : o;
  return r && [...s].length <= 1024 ? s : o;
}
/**
 * 判断一个 MCP 服务器能否在本地做 OAuth：claude.ai 代理、非 HTTP 传输、Anthropic 托管（附去 claude.ai 连接的提示）、云服务注入的服务器，或普通 oauth。
 */
//@ chunk-4w0z5wdp.js:1195-1820 placement
function classifyMcpAuthTarget(serverName, config) {
  if (config.type === "claudeai-proxy") return { kind: "claudeai-proxy", config: config };
  if (config.type !== "sse" && config.type !== "http")
    return { kind: "unsupported-transport", transport: config.type ?? "stdio" };
  if (c(config.url))
    return {
      kind: "anthropic-hosted",
      config: config,
      message: anthropicHostedOAuthMessage(serverName, { scope: config.scope }),
    };
  if (isCcrInjectedMcpUrl(serverName, config))
    return {
      kind: "anthropic-hosted",
      config: config,
      message: `"${uo(serverName)}" is provided to this session by Claude Code's cloud service, which holds its sign-in, so it can't be signed in to from here. If it is one of your claude.ai connectors, reconnect it under Settings \u2192 Connectors on claude.ai and then start a new session.`,
    };
  return { kind: "oauth", config: config };
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
  JHe,
  performMCPOAuthFlow_2,
  clearMcpOAuthStubIfTokenless_2,
  redactSensitiveUrlParams,
  ClaudeAuthProvider,
  wrapFetchWithStepUpDetection,
  clearMcpOAuthStubIfTokenless,
  classifyMcpAuthTarget,
  hasMcpDiscoveryButNoToken,
  hasExternalAuthForConfig,
  m,
  p_yqnm,
  Y,
  R,
  A,
  safeDecodeURIComponent,
  userinfoAtIndex,
  looksLikeUrlWithScheme,
  tt_yqnm,
  x,
};

/**
 * services/routines/routinesApi.ts
 *
 * 2.1.316 新增：统一的 Anthropic API 请求：选主机与认证、OAuth 刷新、重试、上传超时、frame 隧道；刷新官方 MCP 服务器 URL 集合（tengu_mcp_directory_bff）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (46)
 * attribution: placement 46
 */
import { Agent as Agent_3 } from "http";
import { Readable } from "stream";
import { CODE_SESSIONS_PATH, CODE_TRIGGERS_PATH_PATTERN } from "../../bridge/workSecret.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { env } from "../../utils/env.js";
import {
  memoryApiOverride,
  isConsoleProfileSessionsCredential,
  consoleProfileCredentialProviderLoaded,
  consoleProfileOrganizationLabel,
  prepareApiRequest,
  CloudSessionAccessError,
  getOAuthHeaders,
  memoryApiTarget,
  recoverConsoleProfileBearerOutcome,
  cloudSessionsSignInRefusal,
} from "../../utils/teleport/api.js";
import { resolveRemoteSdkUrl } from "../ccrAgentProxy/agentProxy.js";
import { resolveSdkUrl } from "../../cli/transports/sdkUrlValidation.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { getTransportForUrl } from "../../cli/transports/transportUtils.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import {
  getClaudeAIOAuthTokens,
  isUsableClaudeAILoginRecord,
  checkAndRefreshOAuthTokenIfNeeded,
  isOAuthRefreshKnownDeadAsync,
  hasClaudeAISignInToken,
  handleOAuth401Error,
} from "../../utils/auth.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import {
  PLUGIN_DIRECTORY_API_PATH,
  DEFAULT_STALL_MS,
  isZodVersionCompatible,
  uploadBufferWithProgress,
  maxAllowedStallMs,
  UploadStalledError,
  sessionHostKind,
} from "../../utils/telemetry/memorySummary.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getAPIProvider, isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { noteExternalHttpUse } from "../../utils/testNetworkGuard.js";
import { axios_default, AxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { getSdkOAuthTokenRefreshCallback, getStrictMcpConfig } from "../../bootstrap/state.js";
import { getAuthHeadersAsync, getAuthHeaders, getUserAgent } from "../../utils/http.js";
import { apiKeyForHost } from "../analytics/telemetryCredentialGuard.js";
import { createUploadWireTransport } from "../api/uploadWire.js";
import { sameOrigin, urlFromRequestOptions } from "../../utils/network/privateHostCheck.js";
import { createOneOffHttpsAgent } from "../../utils/mtls.js";
import { recoverHostSessionsBearer, ensureHostSessionsBearer } from "../../utils/hostSessionsBearer.js";
import { lacksAuthorizationHeader, bearerOf } from "../oauth/sessionsBearerHooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logError } from "../../utils/log.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getCliOwnedState } from "../mcp/cliOwnedClients.js";
import { lit } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { isSameOriginAsCcr } from "../mcp/ccrMcpUrls.js";

//@ chunk-aepeg2w5.js:802953-803044 placement
/**
 * 校验请求路径只含安全字符且不含 .. 或 //。
 */
function isSafeRelativePath(e) {
  return /^[A-Za-z0-9_\-/.:]+$/.test(e) && !/(?:^|\/)\.\.?(?:\/|$)|\/\//.test(e);
}
//@ chunk-aepeg2w5.js:803044-803260 placement
var CONSOLE_PROFILE_UNSUPPORTED_MESSAGE =
  "This request can't be made with a Console-profile sign-in, and the part of Claude Code that reads that sign-in isn't loaded in this process (a bug in Claude Code; please report it, with the command you ran)";
//@ chunk-aepeg2w5.js:803260-803629 placement
/**
 * 判断请求路径对应的 routine/session 操作。
 */
function classifyRoutineRequest(e, n, r) {
  let index = n.indexOf("?");
  let h = index < 0 ? n : n.slice(0, index);
  if (!isSafeRelativePath(h)) return null;
  if (h.startsWith(CODE_SESSIONS_PATH)) return "session";
  if (!CODE_TRIGGERS_PATH_PATTERN.test(n)) return null;
  if (!h.startsWith("/v1/code/triggers/")) return e === "GET" ? "routine_list" : null;
  return e === "POST" &&
    typeof r === "object" &&
    r !== null &&
    !Array.isArray(r) &&
    Object.keys(r).length === 1 &&
    "enabled" in r &&
    r.enabled === false
    ? "routine_pause"
    : null;
}
//@ chunk-aepeg2w5.js:803629-803745 placement
function isSessionsApiPath(e, n, r) {
  let index = n.indexOf("?");
  let h = index < 0 ? n : n.slice(0, index);
  if (!isSafeRelativePath(h)) return false;
  return SESSIONS_PATH_RE.test(h) || classifyRoutineRequest(e, n, r) !== null;
}
//@ chunk-aepeg2w5.js:803745-803968 placement
/**
 * sessions 路径正则、上传超时、敏感头与官方源。
 */
var SESSIONS_PATH_RE = /^\/v1\/(?:code\/)?sessions(?:\/|$)/;
var UPLOAD_TIMEOUT_MS = 15000;
var SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "x-authorization",
  "x-api-key",
  "cookie",
]);
var OFFICIAL_API_ORIGINS = new Set(["https://api.anthropic.com", "https://api-staging.anthropic.com"]);
//@ chunk-aepeg2w5.js:803968-804136 placement
function isOfficialApiOrigin(e) {
  let n;
  try {
    n = new URL(getOauthConfig().BASE_API_URL).origin;
  } catch {
    return false;
  }
  if (e.origin === n) return true;
  if (env.CLAUDE_CODE_CUSTOM_OAUTH_URL) return false;
  return OFFICIAL_API_ORIGINS.has(e.origin);
}
//@ chunk-aepeg2w5.js:804136-804192 placement
/**
 * 校验为合法 https 地址时返回其 origin。
 */
function httpsOrigin(e) {
  let n = validateHttpsUrl(e);
  return n.ok ? n.origin : undefined;
}
//@ chunk-aepeg2w5.js:804192-804524 placement
/**
 * 校验 URL 为不带凭据和端口的 https。
 */
function validateHttpsUrl(e) {
  if (!e)
    return {
      ok: false,
      reason: "unparseable",
    };
  let n;
  try {
    n = new URL(e);
  } catch {
    return {
      ok: false,
      reason: "unparseable",
    };
  }
  if (n.protocol !== "https:")
    return {
      ok: false,
      reason: "not_https",
    };
  if (n.username || n.password || n.port)
    return {
      ok: false,
      reason: "userinfo_or_port",
    };
  if (!isOfficialApiOrigin(n))
    return {
      ok: false,
      reason: "untrusted_origin",
    };
  return {
    ok: true,
    origin: n.origin,
  };
}
//@ chunk-aepeg2w5.js:804524-804580 placement
/**
 * 非法 https 地址时返回原因。
 */
function invalidHttpsUrlReason(filestoreUrl) {
  let n = validateHttpsUrl(filestoreUrl);
  return n.ok ? undefined : n.reason;
}
//@ chunk-aepeg2w5.js:804580-804680 placement
function baseUrlForRequest(e, n) {
  return n.auth === "none" && n.host !== "frame" && n.host !== "memory" && n.baseUrl ? n.baseUrl : e;
}
//@ chunk-aepeg2w5.js:804680-804702 placement
/**
 * frame 主机覆盖（外部构建无）。
 */
function getFrameHostOverride() {
  return;
}
//@ chunk-aepeg2w5.js:804702-804736 placement
/**
 * 返回 frame 主机类别的基础 URL。
 */
function frameBaseUrl() {
  return apiHostUrl("frame");
}
//@ chunk-aepeg2w5.js:804736-805061 placement
/**
 * 按主机类别（api、claude-ai、mcp-proxy、frame、memory…）取基础 URL。
 */
function apiHostUrl(e) {
  let oauthConfig = getOauthConfig();
  switch (e) {
    case "api":
      return oauthConfig.BASE_API_URL;
    case "claude-ai":
      return oauthConfig.CLAUDE_AI_ORIGIN;
    case "mcp-proxy":
      return oauthConfig.MCP_PROXY_URL;
    case "frame":
      return getFrameHostOverride() ?? oauthConfig.BASE_API_URL;
    case "memory":
      return memoryApiOverride() ?? oauthConfig.BASE_API_URL;
    case "ccr-session":
      return ccrHostUrl(e).href.replace(/\/$/, "");
    case "ccr-gateway":
      return ccrHostUrl(e).origin;
  }
}
//@ chunk-aepeg2w5.js:805061-805529 placement
/**
 * ccr-session/ccr-gateway 主机 URL（需要 --sdk-url）。
 */
function ccrHostUrl(e) {
  let n = e === "ccr-gateway" ? resolveRemoteSdkUrl() : resolveSdkUrl();
  switch (n.status) {
    case "absent":
      throw e === "ccr-session"
        ? Error("ccr-session host requires --sdk-url")
        : Error("ccr-gateway host requires --sdk-url");
    case "rejected":
      throw e === "ccr-session"
        ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `ccr-session --sdk-url rejected: ${n.reason}`,
            "ccr-session --sdk-url rejected by allowlist",
          )
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `ccr-gateway --sdk-url rejected: ${n.reason}`,
            "ccr-gateway --sdk-url rejected by allowlist",
          );
    case "ok":
      return getTransportForUrl(new URL(n.url));
  }
}
//@ chunk-aepeg2w5.js:805529-805558 placement
/**
 * 凭据摘要。
 */
function hashCredential(e) {
  return computeContentHash(e);
}
//@ chunk-aepeg2w5.js:805558-805654 placement
/**
 * 当前 claude.ai 登录可用时返回 bearer 摘要，否则 null。
 */
function claudeAiBearerDigest() {
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  let accessToken = claudeAIOAuthTokens?.accessToken;
  if (!isUsableClaudeAILoginRecord(claudeAIOAuthTokens) || !accessToken) return null;
  return hashCredential(`Bearer ${accessToken}`);
}
//@ chunk-aepeg2w5.js:805654-805805 placement
/**
 * 刷新后取可用的 claude.ai 访问令牌。
 */
async function getClaudeAiAccessToken() {
  if (publicCatalogShortcut({}, undefined) !== undefined) return null;
  await refreshOAuthIfRequested({
    refreshOAuth: true,
  });
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  let accessToken = claudeAIOAuthTokens?.accessToken;
  if (!isUsableClaudeAILoginRecord(claudeAIOAuthTokens) || !accessToken) return null;
  return accessToken;
}
//@ chunk-aepeg2w5.js:805805-806194 placement
/**
 * 公开插件目录请求的快捷判断。
 */
function publicCatalogShortcut(e, n) {
  if (
    e.publicPluginDirectoryCatalog === true &&
    e.auth === "none" &&
    (e.host === undefined || e.host === "api") &&
    e.baseUrl === undefined &&
    e.headers === undefined &&
    n?.method === "GET" &&
    firstLineOf(n.path, "?") === PLUGIN_DIRECTORY_API_PATH &&
    !new URLSearchParams(n.path.slice(PLUGIN_DIRECTORY_API_PATH.length)).has("q")
  )
    return;
  let r = false;
  if (!e.bypassEssentialTrafficOnly && !r && isEssentialTrafficOnly()) return "essential-traffic-only";
  if (getAPIProvider() !== "firstParty") return "data-residency";
  return;
}
//@ chunk-aepeg2w5.js:806194-806239 placement
/**
 * 是否可发起 API 请求。
 */
function hasApiClient() {
  return publicCatalogShortcut({}, undefined) === undefined;
}
//@ chunk-aepeg2w5.js:806239-806342 placement
var REFRESH_TOKEN_INVALID_MESSAGE = "OAuth refresh token is no longer valid; run /login to re-authenticate";
var NO_CLAUDE_AI_LOGIN = "no claude.ai login";
//@ chunk-aepeg2w5.js:806342-811894 placement
/**
 * 统一的 Anthropic API 请求：选主机与认证、OAuth 刷新、重试、上传超时、frame 隧道。
 */
async function apiRequest(e, n, r, s = {}, h = false) {
  let y = r;
  noteExternalHttpUse();
  let S = publicCatalogShortcut(s, {
    method: e,
    path: n,
  });
  if (S !== undefined)
    return {
      ok: false,
      reason: S,
    };
  if (s.frameTunnel && (s.host !== "frame" || s.auth !== "session-jwt"))
    throw Error("frameTunnel requires host 'frame' and auth 'session-jwt'");
  let w = {};
  let Authorization;
  let x = n;
  let P = null;
  let F = false;
  let L = false;
  let G;
  if (s.auth === "teleport-org") {
    let Z;
    if (isConsoleProfileSessionsCredential()) {
      let fe = classifyRoutineRequest(e, n, y);
      if (fe === null)
        return {
          ok: false,
          reason: "no-auth",
          detail: !consoleProfileCredentialProviderLoaded()
            ? CONSOLE_PROFILE_UNSUPPORTED_MESSAGE
            : consoleProfileOrganizationLabel() === "unknown"
              ? "The organization's policy has not been read yet; a Console-profile sign-in is in use"
              : "A Console-profile sign-in is in use; this needs a claude.ai sign-in",
        };
      if (fe === "routine_pause")
        y = {
          enabled: false,
        };
      let Ae;
      try {
        Ae = await prepareApiRequest(s.credentials);
      } catch (error) {
        if (error instanceof CloudSessionAccessError)
          return {
            ok: false,
            reason: "no-auth",
            detail: error.message,
          };
        throw error;
      }
      P = Ae.accessToken;
      Z = Ae;
      F = true;
      w = {
        ...getOAuthHeaders(Ae.accessToken),
        "x-organization-uuid": Ae.orgUUID,
      };
      x = n.replace(":orgUUID", Ae.orgUUID);
    } else {
      await checkAndRefreshOAuthTokenIfNeeded({
        credentials: s.credentials,
        storageV5: s.storageV5,
      });
      if (await isOAuthRefreshKnownDeadAsync(s.credentials))
        return {
          ok: false,
          reason: "no-auth",
          detail: REFRESH_TOKEN_INVALID_MESSAGE,
        };
      if (!getClaudeAIOAuthTokens()?.accessToken)
        return {
          ok: false,
          reason: "no-auth",
          detail: "No OAuth token in keychain",
        };
      L = isSessionsApiPath(e, n, y);
      let { accessToken, orgUUID } = await prepareApiRequest(s.credentials, L);
      P = accessToken;
      Z = {
        accessToken,
        orgUUID,
      };
      w = {
        ...getOAuthHeaders(accessToken),
        "x-organization-uuid": orgUUID,
      };
      x = n.replace(":orgUUID", orgUUID);
    }
    let { earlyAnswer } = s;
    if (earlyAnswer !== undefined && e === "GET") {
      let { accessToken, orgUUID } = Z;
      G = async (Me) => {
        let xe = await earlyAnswer({
          path: n,
          baseUrl: apiHostUrl(s.host ?? "api"),
          orgUuid: orgUUID,
          authFingerprint: hashCredential(`Bearer ${accessToken}`),
        });
        return xe === undefined
          ? axios_default.getAdapter(axios_default.defaults.adapter)(Me)
          : {
              data: xe.body,
              status: xe.status,
              statusText: "",
              headers: {},
              config: Me,
            };
      };
    }
  } else if (s.auth === "session-jwt") {
    let sessionIngressAuthToken = getSessionIngressAuthToken();
    if (!sessionIngressAuthToken)
      return {
        ok: false,
        reason: "no-auth",
        detail: "No session access token",
      };
    w = {
      Authorization: `Bearer ${sessionIngressAuthToken}`,
    };
    Authorization = w.Authorization;
  } else if (s.auth === "claude-ai-oauth") {
    await refreshOAuthIfRequested(s);
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    let accessToken = claudeAIOAuthTokens?.accessToken;
    if (!isUsableClaudeAILoginRecord(claudeAIOAuthTokens) || !accessToken)
      return {
        ok: false,
        reason: "no-auth",
        detail: NO_CLAUDE_AI_LOGIN,
      };
    w = {
      Authorization: `Bearer ${accessToken}`,
      "anthropic-beta": OAUTH_BETA_HEADER,
    };
    if (s.recoverOAuth401 && (claudeAIOAuthTokens?.refreshToken || getSdkOAuthTokenRefreshCallback()))
      P = accessToken;
  } else if (s.auth !== "none") {
    await refreshOAuthIfRequested(s);
    let Z = s.auth === "async" ? await getAuthHeadersAsync() : getAuthHeaders();
    let ce = Z.headers["x-api-key"];
    let fe =
      Z.error ??
      (ce && !apiKeyForHost(ce)
        ? "API key not sent: ANTHROPIC_BASE_URL is not an Anthropic host"
        : undefined);
    if (fe && s.auth !== "optional")
      return {
        ok: false,
        reason: "no-auth",
        detail: fe,
      };
    w = fe ? {} : Z.headers;
  }
  if (s.host === "frame" && getFrameHostOverride() !== undefined) {
    if (env.CLAUDE_CODE_ARTIFACTS_API_TOKEN)
      w = {
        Authorization: `Bearer ${env.CLAUDE_CODE_ARTIFACTS_API_TOKEN}`,
      };
    P = null;
  }
  if (s.host === "memory") {
    let Z = memoryApiTarget();
    if (Z.auth === "none") {
      w = Z.headers ?? {};
      P = null;
    }
  }
  let j = {
    "User-Agent": getUserAgent(),
    ...w,
    ...s.headers,
  };
  if (F) {
    for (let key of Object.keys(j)) if (key.toLowerCase() === "x-trusted-device-token") delete j[key];
  }
  if (s.frameTunnel) {
    for (let key of Object.keys(j)) if (SENSITIVE_HEADERS.has(key.toLowerCase())) delete j[key];
    j.Authorization = Authorization;
  }
  let sentAuthFingerprint = null;
  if (s.reportSentAuth) {
    let Z;
    for (let [key, value] of Object.entries(j)) if (key.toLowerCase() === "authorization") Z = value;
    sentAuthFingerprint = Z === undefined ? null : hashCredential(Z);
  }
  let q = s.maxRedirects ?? (s.host === "frame" ? 0 : undefined);
  let Q = y;
  let timeout = s.timeout ?? UPLOAD_TIMEOUT_MS;
  let se;
  if (s.streamUpload !== undefined && y !== undefined) {
    let buffer = toBuffer(y);
    let ce = typeof y !== "string" && !isPlainJsonBody(y);
    if (s.maxBodyLength !== undefined && buffer.length > s.maxBodyLength)
      throw new AxiosError("Request body larger than maxBodyLength limit", AxiosError.ERR_BAD_REQUEST);
    let stallMs = s.streamUpload.stallMs ?? DEFAULT_STALL_MS;
    let Ae = s.streamUpload.tailFloorMs?.(buffer.length);
    if (isZodVersionCompatible()) {
      se = uploadBufferWithProgress(buffer, {
        stallMs,
        ...(Ae !== undefined && {
          tailFloorMs: Ae,
        }),
        signal: s.signal,
      });
      Q = se.body;
    } else {
      Q = buffer;
      timeout = Math.max(maxAllowedStallMs(buffer.length, stallMs), Ae ?? 0);
    }
    if (!hasHeaderIgnoringCase(j, "content-type") && !ce)
      j["Content-Type"] = typeof y === "string" ? "text/plain" : "application/json";
    j["Content-Length"] = String(buffer.length);
  }
  let Se =
    s.streamUpload !== undefined && y !== undefined && q === 0 ? createUploadWireTransport() : undefined;
  let ae = s.frameTunnel
    ? `https://${s.frameTunnel.host}`
    : baseUrlForRequest(apiHostUrl(s.host ?? "api"), s);
  let ie;
  try {
    try {
      ie = await axios_default.request({
        method: e,
        baseURL: ae,
        url: x,
        data: Q,
        timeout: se ? 0 : timeout,
        signal: se ? se.signal : s.signal,
        responseType: s.responseType,
        validateStatus: s.validateStatus,
        skipSessionsBearerReport: true,
        maxContentLength: s.maxContentLength,
        maxBodyLength: s.maxBodyLength,
        ...(q !== undefined && {
          maxRedirects: q,
        }),
        ...(q !== 0 && {
          beforeRedirect: (Z) => {
            if (!sameOrigin(urlFromRequestOptions(Z), ae))
              throw Error("first-party request redirected to another origin");
          },
        }),
        ...(Se && {
          transport: Se.transport,
        }),
        ...(G && {
          adapter: G,
        }),
        ...(s.freshConnection &&
          !s.frameTunnel && {
            httpsAgent: createOneOffHttpsAgent(),
            httpAgent: new Agent_3({
              keepAlive: false,
            }),
          }),
        ...(s.noEnvProxy && {
          proxy: false,
        }),
        ...(s.frameTunnel && {
          httpsAgent: s.frameTunnel.agent,
          proxy: false,
        }),
        headers: j,
      });
    } catch (error) {
      throw se ? uploadStallError(error, se) : error;
    } finally {
      if (se) {
        se.dispose();
        s.streamUpload?.onSettled?.({
          ...se.seen(),
          ...Se?.seen(true),
        });
      } else if (s.streamUpload && Buffer.isBuffer(Q))
        s.streamUpload.onSettled?.({
          body_bytes: Q.length,
          bytes_handed: Q.length,
          stalled: false,
          ...Se?.seen(false),
        });
    }
  } catch (error) {
    if (
      (h || s.isBackground) &&
      L &&
      P !== null &&
      axios_default.isAxiosError(error) &&
      error.response?.status === 401 &&
      !s.isRouteOwned401?.(error.response.data)
    )
      recoverHostSessionsBearer(
        bearerHeaderOrFallback(P, error.config, L),
        lacksAuthorizationHeader(error.config) ? "withheld" : "refused",
      ).catch(() => {});
    if (
      P !== null &&
      !h &&
      !s.isBackground &&
      axios_default.isAxiosError(error) &&
      error.response?.status === 401 &&
      !s.isRouteOwned401?.(error.response.data)
    ) {
      let ce = bearerHeaderOrFallback(P, error.config, L);
      let fe = F
        ? await recoverConsoleProfileAuth(ce)
        : await recoverAuthFailure(ce, s, L, lacksAuthorizationHeader(error.config));
      if (fe === "retry") {
        destroyIfStream(error.response.data);
        return apiRequest(e, n, y, s, true);
      }
      if (fe !== null) {
        destroyIfStream(error.response.data);
        return fe;
      }
    }
    throw error;
  }
  if ((h || s.isBackground) && L && P !== null && ie.status === 401 && !s.isRouteOwned401?.(ie.data))
    recoverHostSessionsBearer(
      bearerHeaderOrFallback(P, ie.config, L),
      lacksAuthorizationHeader(ie.config) ? "withheld" : "refused",
    ).catch(() => {});
  if (P !== null && ie.status === 401 && !h && !s.isBackground && !s.isRouteOwned401?.(ie.data)) {
    let Z = bearerHeaderOrFallback(P, ie.config, L);
    let ce = F
      ? await recoverConsoleProfileAuth(Z)
      : await recoverAuthFailure(Z, s, L, lacksAuthorizationHeader(ie.config));
    if (ce === "retry") {
      destroyIfStream(ie.data);
      return apiRequest(e, n, y, s, true);
    }
    if (ce !== null) {
      destroyIfStream(ie.data);
      return ce;
    }
  }
  return {
    ok: true,
    data: ie.data,
    status: ie.status,
    response: ie,
    ...(s.reportSentAuth && {
      sentAuthFingerprint,
    }),
  };
}
//@ chunk-aepeg2w5.js:811894-812121 placement
async function refreshOAuthIfRequested(e) {
  if (!e.refreshOAuth) return;
  try {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials: e.credentials,
      storageV5: e.storageV5,
    });
  } catch (error) {
    logForDebugging(
      `firstPartyApi: refreshOAuth failed (${error instanceof Error ? error.message : error}); proceeding with cached token`,
    );
  }
}
//@ chunk-aepeg2w5.js:812121-812459 placement
/**
 * 上传停滞时转换错误信息。
 */
function uploadStallError(error, n) {
  let r = n.seen();
  if (!(axios_default.isCancel(error) && r.stalled)) return error;
  let reason = n.signal.reason;
  let h = reason instanceof UploadStalledError ? `${Math.round(reason.waitedMs / 1000)}s` : "the allowance";
  return new AxiosError(
    r.bytes_handed === r.body_bytes
      ? `upload stalled: no answer within ${h} of the body being handed over`
      : `upload stalled: nothing moved for ${h}`,
    AxiosError.ECONNABORTED,
  );
}
//@ chunk-aepeg2w5.js:812459-812761 placement
/**
 * 把各种数据转为 Buffer。
 */
function toBuffer(e) {
  if (Buffer.isBuffer(e)) return e;
  if (isArrayBufferView(e)) return Buffer.from(e.buffer, e.byteOffset, e.byteLength);
  if (e instanceof ArrayBuffer) return Buffer.from(e);
  if (typeof e === "string") return Buffer.from(e);
  if (isPlainJsonBody(e)) return Buffer.from(jsonStringify(e));
  throw TypeError("streamUpload: unsupported request body type");
}
//@ chunk-aepeg2w5.js:812761-812916 placement
function isPlainJsonBody(e) {
  if (Array.isArray(e)) return true;
  if (typeof e !== "object" || e === null) return false;
  let prototypeOf = Object.getPrototypeOf(e);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
//@ chunk-aepeg2w5.js:812916-813008 placement
/**
 * 大小写不敏感地判断对象是否已有某个头。
 */
function hasHeaderIgnoringCase(e, n) {
  let lower = n.toLowerCase();
  return Object.keys(e).some((key) => key.toLowerCase() === lower);
}
//@ chunk-aepeg2w5.js:813008-813052 placement
/**
 * 判断值是否为 ArrayBuffer 视图（TypedArray/DataView）。
 */
function isArrayBufferView(e) {
  return ArrayBuffer.isView(e);
}
//@ chunk-aepeg2w5.js:813052-813098 placement
/**
 * 若响应数据是流则销毁，避免连接泄漏。
 */
function destroyIfStream(e) {
  if (e instanceof Readable) e.destroy();
}
//@ chunk-aepeg2w5.js:813098-813182 placement
/**
 * 重试时若新请求带了 Authorization 头，用它替换原来的 bearer。
 */
function bearerHeaderOrFallback(e, config, r) {
  if (!r) return e;
  return bearerOf(config?.headers?.get?.("Authorization")) ?? e;
}
//@ chunk-aepeg2w5.js:813182-813347 placement
async function recoverConsoleProfileAuth(e) {
  switch (await recoverConsoleProfileBearerOutcome(e)) {
    case "recovered":
      return "retry";
    case "needs_sign_in":
      return {
        ok: false,
        reason: "no-auth",
        detail: cloudSessionsSignInRefusal(),
      };
    case "transient":
      return null;
  }
}
//@ chunk-aepeg2w5.js:813347-813735 placement
/**
 * 认证失败后尝试恢复（刷新令牌）并决定是否重试。
 */
async function recoverAuthFailure(e, n, r, s) {
  let h = n.auth === "claude-ai-oauth";
  try {
    if (r) {
      let y = await recoverHostSessionsBearer(e, s ? "withheld" : "refused");
      if (y !== "not_held") return y === "recovered" || hasClaudeAISignInToken() ? "retry" : null;
      if ((await ensureHostSessionsBearer()) !== null) return "retry";
    }
    if (await handleOAuth401Error(e, n.credentials, n.storageV5)) return "retry";
    if (await isOAuthRefreshKnownDeadAsync(n.credentials))
      return {
        ok: false,
        reason: "no-auth",
        detail: h ? NO_CLAUDE_AI_LOGIN : REFRESH_TOKEN_INVALID_MESSAGE,
      };
    return null;
  } catch (error) {
    if (!h) throw error;
    logError(error);
    return null;
  }
}
//@ chunk-aepeg2w5.js:813735-813934 placement
/**
 * API 客户端（get/post/put/patch/delete）。
 */
var apiClient = {
  get(e, n) {
    return apiRequest("GET", e, undefined, n);
  },
  post(e, n, r) {
    return apiRequest("POST", e, n, r);
  },
  put(e, n, r) {
    return apiRequest("PUT", e, n, r);
  },
  patch(e, n, r) {
    return apiRequest("PATCH", e, n, r);
  },
  delete(e, n, r) {
    return apiRequest("DELETE", e, n, r);
  },
};
//@ chunk-aepeg2w5.js:813934-814114 placement
var URL_CONTROL_CHARS_RE = /[\u0000-\u0020\u007f]/;
var STRICT_URL_RE = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/\\?#]+)([^?#]*)(\?[^#]*)?(?:#[\s\S]*)?$/;
var DEFAULT_PORTS = {
  "ftp:": "21",
  "http:": "80",
  "https:": "443",
  "ws:": "80",
  "wss:": "443",
};
//@ chunk-aepeg2w5.js:814114-814687 placement
/**
 * 严格解析 URL（拒绝控制字符与不一致的协议）。
 */
function parseStrictUrl(e) {
  if (URL_CONTROL_CHARS_RE.test(e)) return null;
  let match = STRICT_URL_RE.exec(e);
  if (!match) return null;
  let r;
  try {
    r = new URL(e);
  } catch {
    return null;
  }
  let [, s = "", h = "", y = "", S = ""] = match;
  if (r.protocol !== `${s.toLowerCase()}:`) return null;
  let index = h.lastIndexOf("@");
  let R = h.slice(0, index + 1) + h.slice(index + 1).replace(/[A-Z]/g, (L) => L.toLowerCase());
  let P = `${r.username || r.password ? `${r.username}${r.password ? `:${r.password}` : ""}@` : ""}${r.host}`;
  let F = DEFAULT_PORTS[r.protocol];
  if (R !== P && !(r.port === "" && F !== undefined && R === `${P}:${F}`)) return null;
  if (r.pathname !== y && !(y === "" && r.pathname === "/")) return null;
  if (r.search !== (S === "?" ? "" : S)) return null;
  return r;
}
//@ chunk-aepeg2w5.js:814687-814852 placement
function normalizeServerUrl(e) {
  let strictUrl = parseStrictUrl(e);
  if (!strictUrl) return e.replace(/\/$/, "");
  strictUrl.search = "";
  strictUrl.hash = "";
  strictUrl.pathname = strictUrl.pathname.replace(/\/$/, "") || "/";
  return strictUrl.toString().replace(/\/$/, "");
}
//@ chunk-aepeg2w5.js:814852-815068 placement
/**
 * 去片段与尾斜杠（保留查询）。
 */
function normalizeMcpServerUrl(e) {
  let strictUrl = parseStrictUrl(e);
  if (!strictUrl) return e.includes("?") ? e : e.replace(/\/$/, "");
  strictUrl.hash = "";
  if (!strictUrl.search) strictUrl.search = "";
  strictUrl.pathname = strictUrl.pathname.replace(/\/$/, "") || "/";
  let str = strictUrl.toString();
  return strictUrl.search ? str : str.replace(/\/$/, "");
}
//@ chunk-aepeg2w5.js:815068-815127 placement
/**
 * MCP 目录可见组织类型的默认值（commercial/gsuite/enterprise/health）与翻页上限。
 */
var DEFAULT_MCP_DIRECTORY_KINDS = ["commercial", "gsuite", "enterprise", "health"];
var MAX_MCP_DIRECTORY_PAGES = 20;
//@ chunk-aepeg2w5.js:815127-815229 placement = validateURL (0.823)
/**
 * 去掉 URL 的用户名/密码后交给 dO 处理。
 */
function stripUrlCredentials(url) {
  try {
    let n = new URL(url);
    n.username = "";
    n.password = "";
    return normalizeServerUrl(n.toString());
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:815229-815376 placement
function mcpDirectoryVisibility() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_mcp_directory_visibility",
    DEFAULT_MCP_DIRECTORY_KINDS,
  );
  return Array.isArray(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE.every((n) => typeof n === "string")
    ? featureValue_CACHED_MAY_BE_STALE.filter((n) => n.length > 0)
    : DEFAULT_MCP_DIRECTORY_KINDS;
}
//@ chunk-aepeg2w5.js:815376-815786 placement
/**
 * 分页获取 MCP 注册表服务器 URL。
 */
async function fetchRegistryServerUrls(e) {
  let n = new Set();
  let visibility = e.join(",");
  let s;
  for (let j = 0; j < MAX_MCP_DIRECTORY_PAGES; j++) {
    let uRLSearchParams = new URLSearchParams({
      version: "latest",
      limit: "100",
      visibility,
    });
    if (s) uRLSearchParams.set("cursor", s);
    let S = await apiClient.get(`/mcp-registry/v0/servers?${uRLSearchParams}`, {
      auth: "none",
      timeout: 5000,
    });
    if (!S.ok) break;
    for (let w of S.data.servers ?? [])
      for (let R of w.server?.remotes ?? []) {
        let x = stripUrlCredentials(R.url);
        if (x) n.add(x);
      }
    s = S.data.metadata?.nextCursor;
    if (!s) break;
  }
  return n;
}
//@ chunk-aepeg2w5.js:815786-816202 placement
/**
 * 分页获取目录服务器 URL（BFF）。
 */
async function fetchDirectoryServerUrls(e) {
  let n = new Set();
  let visibility = e.join(",");
  let s;
  for (let j = 0; j < MAX_MCP_DIRECTORY_PAGES; j++) {
    let uRLSearchParams = new URLSearchParams({
      limit: "500",
      visibility,
    });
    if (s) uRLSearchParams.set("cursor", s);
    let S = await apiClient.get(`/api/directory/servers?${uRLSearchParams}`, {
      auth: "none",
      timeout: 5000,
    });
    if (!S.ok) break;
    for (let w of S.data.servers ?? []) {
      if (w.type !== "remote") continue;
      let url = w.remote?.url;
      if (!url) continue;
      let x = stripUrlCredentials(url);
      if (x) n.add(x);
    }
    s = S.data.next_cursor ?? undefined;
    if (!s) break;
  }
  return n;
}
//@ chunk-aepeg2w5.js:816202-816376 placement
/**
 * 启动时按需预取官方 MCP URL。
 */
async function prefetchOfficialMcpUrls() {
  let cliOwnedState = getCliOwnedState();
  if (
    sessionHostKind() !== "none" &&
    !cliOwnedState.listableUrlLookedUp &&
    !env.CLAUDE_CODE_MCP_REGISTRY_FETCH_AT_STARTUP
  ) {
    cliOwnedState.officialUrlsFetchAwaitsLookup = true;
    return;
  }
  await fetchOfficialMcpUrlsOnce();
}
//@ chunk-aepeg2w5.js:816376-816542 placement
/**
 * 共享一次官方 MCP URL 刷新。
 */
function fetchOfficialMcpUrlsOnce() {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.officialUrlsFetchAwaitsLookup = false;
  cliOwnedState.officialUrlsFetch ??= refreshOfficialMcpUrls()
    .catch(logError)
    .finally(() => {
      cliOwnedState.officialUrlsFetch = undefined;
    });
  return cliOwnedState.officialUrlsFetch;
}
//@ chunk-aepeg2w5.js:816542-817296 placement
/**
 * 刷新官方 MCP 服务器 URL 集合（tengu_mcp_directory_bff）。
 */
async function refreshOfficialMcpUrls() {
  if (isEssentialTrafficOnly()) return;
  if (getStrictMcpConfig()) return;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_mcp_directory_bff",
    false,
  );
  let source = lit(featureValue_CACHED_MAY_BE_STALE ? "bff" : "legacy");
  let r = mcpDirectoryVisibility();
  if (r.length === 0) {
    getCliOwnedState().officialUrls = new Set();
    logFeatureOk("mcp_registry_fetch");
    logEvent("tengu_mcp_registry_fetch", {
      source,
      success: true,
      url_count: 0,
      duration_ms: 0,
      empty_visibility: true,
    });
    return;
  }
  let now = Date.now();
  try {
    let h = featureValue_CACHED_MAY_BE_STALE
      ? await fetchDirectoryServerUrls(r)
      : await fetchRegistryServerUrls(r);
    getCliOwnedState().officialUrls = h;
    logForDebugging(
      `[mcp-registry] Loaded ${h.size} official MCP URLs (${featureValue_CACHED_MAY_BE_STALE ? "bff" : "legacy"})`,
    );
    logFeatureOk("mcp_registry_fetch");
    logEvent("tengu_mcp_registry_fetch", {
      source,
      success: true,
      url_count: h.size,
      duration_ms: Date.now() - now,
    });
  } catch (error) {
    logForDebugging(`Failed to fetch MCP registry: ${errorMessage(error)}`, {
      level: "error",
    });
    logFeatureSad("mcp_registry_fetch", "fetch_failed");
    logEvent("tengu_mcp_registry_fetch", {
      source,
      success: false,
      url_count: 0,
      duration_ms: Date.now() - now,
    });
  }
}
//@ chunk-aepeg2w5.js:817296-817603 placement
/**
 * URL 是否为官方 MCP 服务器。
 */
function isOfficialMcpUrl(e) {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.officialUrls !== undefined) return cliOwnedState.officialUrls.has(e);
  if (cliOwnedState.listableUrlLookedUp || cliOwnedState.urlsRegistryCannotList.has(e)) return false;
  if (e.startsWith("https://") && !isFirstPartyAnthropicHost(e) && !isSameOriginAsCcr(e)) {
    cliOwnedState.listableUrlLookedUp = true;
    if (cliOwnedState.officialUrlsFetchAwaitsLookup) fetchOfficialMcpUrlsOnce();
  } else cliOwnedState.urlsRegistryCannotList.add(e);
  return false;
}
//@ chunk-aepeg2w5.js:817603-817674 placement
/**
 * 两个移动设备模拟器连接的显示名（iOS Simulator、Android Emulator）。
 */
var IOS_SIMULATOR_DISPLAY_NAME = "Claude Code iOS Simulator";
var ANDROID_EMULATOR_DISPLAY_NAME = "Claude Code Android Emulator";
export {
  apiClient,
  httpsOrigin,
  normalizeMcpServerUrl,
  hashCredential,
  hasApiClient,
  IOS_SIMULATOR_DISPLAY_NAME,
  ANDROID_EMULATOR_DISPLAY_NAME,
  isOfficialMcpUrl,
  claudeAiBearerDigest,
  prefetchOfficialMcpUrls,
  fetchOfficialMcpUrlsOnce,
  getFrameHostOverride,
  frameBaseUrl,
  getClaudeAiAccessToken,
  invalidHttpsUrlReason,
  UPLOAD_TIMEOUT_MS,
};

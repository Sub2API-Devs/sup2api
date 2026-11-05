/**
 * services/routines/routinesApi.ts
 *
 * 2.1.316 新增：统一的 Anthropic API 请求：选主机与认证、OAuth 刷新、重试、上传超时、frame 隧道；刷新官方 MCP 服务器 URL 集合（tengu_mcp_directory_bff）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (47)
 * attribution: placement 45, layout 2
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
import { httpUrlFromWs } from "../../cli/transports/transportUtils.js";
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
  uploadStreamWithProgress,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:824064-824155 placement
/**
 * 校验请求路径只含安全字符且不含 .. 或 //。
 */
function isSafeRelativePath(relativePath) {
  return /^[A-Za-z0-9_\-/.:]+$/.test(relativePath) && !/(?:^|\/)\.\.?(?:\/|$)|\/\//.test(relativePath);
}
//@ chunk-exfmq47h.js:824155-824371 placement
var CONSOLE_PROFILE_UNSUPPORTED_MESSAGE =
  "This request can't be made with a Console-profile sign-in, and the part of Claude Code that reads that sign-in isn't loaded in this process (a bug in Claude Code; please report it, with the command you ran)";
//@ chunk-exfmq47h.js:824371-824740 placement
/**
 * 判断请求路径对应的 routine/session 操作。
 */
function classifyRoutineRequest(method, requestPath, body) {
  let index = requestPath.indexOf("?");
  let pathWithoutQuery = index < 0 ? requestPath : requestPath.slice(0, index);
  if (!isSafeRelativePath(pathWithoutQuery)) return null;
  if (pathWithoutQuery.startsWith(CODE_SESSIONS_PATH)) return "session";
  if (!CODE_TRIGGERS_PATH_PATTERN.test(requestPath)) return null;
  if (!pathWithoutQuery.startsWith("/v1/code/triggers/")) return method === "GET" ? "routine_list" : null;
  return method === "POST" &&
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    Object.keys(body).length === 1 &&
    "enabled" in body &&
    body.enabled === false
    ? "routine_pause"
    : null;
}
//@ chunk-exfmq47h.js:824740-824856 placement
function isSessionsApiPath(method, requestPath, body) {
  let index = requestPath.indexOf("?");
  let pathWithoutQuery = index < 0 ? requestPath : requestPath.slice(0, index);
  if (!isSafeRelativePath(pathWithoutQuery)) return false;
  return (
    SESSIONS_PATH_RE.test(pathWithoutQuery) || classifyRoutineRequest(method, requestPath, body) !== null
  );
}
//@ chunk-exfmq47h.js:824856-824910 placement
/**
 * sessions 路径正则、上传超时、敏感头与官方源。
 */
var SESSIONS_PATH_RE = /^\/v1\/(?:code\/)?sessions(?:\/|$)/;
var UPLOAD_TIMEOUT_MS = 15000;
//@ chunk-exfmq47h.js:824910-824987 layout
class SlicedBody {
  slices;
  byteLength;
  constructor(slices, byteLength) {
    this.slices = slices;
    this.byteLength = byteLength;
  }
}
//@ chunk-exfmq47h.js:824987-825160 layout
var SENSITIVE_HEADERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OFFICIAL_API_ORIGINS;
deferInit("chunk-exfmq47h.js:824987", () => {
  SENSITIVE_HEADERS = new Set([
    "authorization",
    "proxy-authorization",
    "x-authorization",
    "x-api-key",
    "cookie",
  ]);
  OFFICIAL_API_ORIGINS = new Set(["https://api.anthropic.com", "https://api-staging.anthropic.com"]);
});
//@ chunk-exfmq47h.js:825160-825328 placement
function isOfficialApiOrigin(url) {
  let baseOrigin;
  try {
    baseOrigin = new URL(getOauthConfig().BASE_API_URL).origin;
  } catch {
    return false;
  }
  if (url.origin === baseOrigin) return true;
  if (env.CLAUDE_CODE_CUSTOM_OAUTH_URL) return false;
  return OFFICIAL_API_ORIGINS.has(url.origin);
}
//@ chunk-exfmq47h.js:825328-825384 placement
/**
 * 校验为合法 https 地址时返回其 origin。
 */
function httpsOrigin(url) {
  let validation = validateHttpsUrl(url);
  return validation.ok ? validation.origin : undefined;
}
//@ chunk-exfmq47h.js:825384-825716 placement
/**
 * 校验 URL 为不带凭据和端口的 https。
 */
function validateHttpsUrl(rawUrl) {
  if (!rawUrl)
    return {
      ok: false,
      reason: "unparseable",
    };
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return {
      ok: false,
      reason: "unparseable",
    };
  }
  if (url.protocol !== "https:")
    return {
      ok: false,
      reason: "not_https",
    };
  if (url.username || url.password || url.port)
    return {
      ok: false,
      reason: "userinfo_or_port",
    };
  if (!isOfficialApiOrigin(url))
    return {
      ok: false,
      reason: "untrusted_origin",
    };
  return {
    ok: true,
    origin: url.origin,
  };
}
//@ chunk-exfmq47h.js:825716-825772 placement
/**
 * 非法 https 地址时返回原因。
 */
function invalidHttpsUrlReason(rawUrl) {
  let validation = validateHttpsUrl(rawUrl);
  return validation.ok ? undefined : validation.reason;
}
//@ chunk-exfmq47h.js:825772-825872 placement
function baseUrlForRequest(defaultBaseUrl, options) {
  return options.auth === "none" && options.host !== "frame" && options.host !== "memory" && options.baseUrl
    ? options.baseUrl
    : defaultBaseUrl;
}
//@ chunk-exfmq47h.js:825872-825894 placement
/**
 * frame 主机覆盖（外部构建无）。
 */
function getFrameHostOverride() {
  return;
}
//@ chunk-exfmq47h.js:825894-825928 placement
/**
 * 返回 frame 主机类别的基础 URL。
 */
function frameBaseUrl() {
  return apiHostUrl("frame");
}
//@ chunk-exfmq47h.js:825928-826253 placement
/**
 * 按主机类别（api、claude-ai、mcp-proxy、frame、memory…）取基础 URL。
 */
function apiHostUrl(hostKind) {
  let oauthConfig = getOauthConfig();
  switch (hostKind) {
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
      return ccrHostUrl(hostKind).href.replace(/\/$/, "");
    case "ccr-gateway":
      return ccrHostUrl(hostKind).origin;
  }
}
//@ chunk-exfmq47h.js:826253-826721 placement
/**
 * ccr-session/ccr-gateway 主机 URL（需要 --sdk-url）。
 */
function ccrHostUrl(hostKind) {
  let sdkUrl = hostKind === "ccr-gateway" ? resolveRemoteSdkUrl() : resolveSdkUrl();
  switch (sdkUrl.status) {
    case "absent":
      throw hostKind === "ccr-session"
        ? Error("ccr-session host requires --sdk-url")
        : Error("ccr-gateway host requires --sdk-url");
    case "rejected":
      throw hostKind === "ccr-session"
        ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `ccr-session --sdk-url rejected: ${sdkUrl.reason}`,
            "ccr-session --sdk-url rejected by allowlist",
          )
        : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `ccr-gateway --sdk-url rejected: ${sdkUrl.reason}`,
            "ccr-gateway --sdk-url rejected by allowlist",
          );
    case "ok":
      return httpUrlFromWs(new URL(sdkUrl.url));
  }
}
//@ chunk-exfmq47h.js:826721-826750 placement
/**
 * 凭据摘要。
 */
function hashCredential(credential) {
  return computeContentHash(credential);
}
//@ chunk-exfmq47h.js:826750-826846 placement
/**
 * 当前 claude.ai 登录可用时返回 bearer 摘要，否则 null。
 */
function claudeAiBearerDigest() {
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  let accessToken = claudeAIOAuthTokens?.accessToken;
  if (!isUsableClaudeAILoginRecord(claudeAIOAuthTokens) || !accessToken) return null;
  return hashCredential(`Bearer ${accessToken}`);
}
//@ chunk-exfmq47h.js:826846-826997 placement
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
//@ chunk-exfmq47h.js:826997-827386 placement
/**
 * 公开插件目录请求的快捷判断。
 */
function publicCatalogShortcut(options, request) {
  if (
    options.publicPluginDirectoryCatalog === true &&
    options.auth === "none" &&
    (options.host === undefined || options.host === "api") &&
    options.baseUrl === undefined &&
    options.headers === undefined &&
    request?.method === "GET" &&
    firstLineOf(request.path, "?") === PLUGIN_DIRECTORY_API_PATH &&
    !new URLSearchParams(request.path.slice(PLUGIN_DIRECTORY_API_PATH.length)).has("q")
  )
    return;
  let isEssentialTrafficOverride = false;
  if (!options.bypassEssentialTrafficOnly && !isEssentialTrafficOverride && isEssentialTrafficOnly())
    return "essential-traffic-only";
  if (getAPIProvider() !== "firstParty") return "data-residency";
  return;
}
//@ chunk-exfmq47h.js:827386-827431 placement
/**
 * 是否可发起 API 请求。
 */
function hasApiClient() {
  return publicCatalogShortcut({}, undefined) === undefined;
}
//@ chunk-exfmq47h.js:827431-827534 placement
var REFRESH_TOKEN_INVALID_MESSAGE = "OAuth refresh token is no longer valid; run /login to re-authenticate";
var NO_CLAUDE_AI_LOGIN = "no claude.ai login";
//@ chunk-exfmq47h.js:827534-834260 placement
/**
 * 统一的 Anthropic API 请求：选主机与认证、OAuth 刷新、重试、上传超时、frame 隧道。
 */
async function apiRequest(method, requestPath, body, options = {}, isRetry = false) {
  let requestBody = body;
  noteExternalHttpUse();
  let shortcutReason = publicCatalogShortcut(options, {
    method,
    path: requestPath,
  });
  if (shortcutReason !== undefined)
    return {
      ok: false,
      reason: shortcutReason,
    };
  if (options.frameTunnel && (options.host !== "frame" || options.auth !== "session-jwt"))
    throw Error("frameTunnel requires host 'frame' and auth 'session-jwt'");
  let authHeaders = {};
  let Authorization;
  let urlPath = requestPath;
  let refreshableAccessToken = null;
  let isConsoleProfile = false;
  let isSessionsApi = false;
  let earlyAnswerAdapter;
  if (options.auth === "teleport-org") {
    let credentialInfo;
    if (isConsoleProfileSessionsCredential()) {
      let routineKind = classifyRoutineRequest(method, requestPath, requestBody);
      if (routineKind === null)
        return {
          ok: false,
          reason: "no-auth",
          detail: !consoleProfileCredentialProviderLoaded()
            ? CONSOLE_PROFILE_UNSUPPORTED_MESSAGE
            : consoleProfileOrganizationLabel() === "unknown"
              ? "The organization's policy has not been read yet; a Console-profile sign-in is in use"
              : "A Console-profile sign-in is in use; this needs a claude.ai sign-in",
        };
      if (routineKind === "routine_pause")
        requestBody = {
          enabled: false,
        };
      let preparedRequest;
      try {
        preparedRequest = await prepareApiRequest(options.credentials);
      } catch (error) {
        if (error instanceof CloudSessionAccessError)
          return {
            ok: false,
            reason: "no-auth",
            detail: error.message,
          };
        throw error;
      }
      refreshableAccessToken = preparedRequest.accessToken;
      credentialInfo = preparedRequest;
      isConsoleProfile = true;
      authHeaders = {
        ...getOAuthHeaders(preparedRequest.accessToken),
        "x-organization-uuid": preparedRequest.orgUUID,
      };
      urlPath = requestPath.replace(":orgUUID", preparedRequest.orgUUID);
    } else {
      await checkAndRefreshOAuthTokenIfNeeded({
        credentials: options.credentials,
        storageV5: options.storageV5,
      });
      if (await isOAuthRefreshKnownDeadAsync(options.credentials))
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
      isSessionsApi = isSessionsApiPath(method, requestPath, requestBody);
      let { accessToken, orgUUID } = await prepareApiRequest(options.credentials, isSessionsApi);
      refreshableAccessToken = accessToken;
      credentialInfo = {
        accessToken,
        orgUUID,
      };
      authHeaders = {
        ...getOAuthHeaders(accessToken),
        "x-organization-uuid": orgUUID,
      };
      urlPath = requestPath.replace(":orgUUID", orgUUID);
    }
    let { earlyAnswer } = options;
    if (earlyAnswer !== undefined && method === "GET") {
      let { accessToken, orgUUID } = credentialInfo;
      earlyAnswerAdapter = async (config) => {
        let earlyAnswerResult = await earlyAnswer({
          path: requestPath,
          baseUrl: apiHostUrl(options.host ?? "api"),
          orgUuid: orgUUID,
          authFingerprint: hashCredential(`Bearer ${accessToken}`),
        });
        return earlyAnswerResult === undefined
          ? axios_default.getAdapter(axios_default.defaults.adapter)(config)
          : {
              data: earlyAnswerResult.body,
              status: earlyAnswerResult.status,
              statusText: "",
              headers: {},
              config,
            };
      };
    }
  } else if (options.auth === "session-jwt") {
    let sessionIngressAuthToken = getSessionIngressAuthToken();
    if (!sessionIngressAuthToken)
      return {
        ok: false,
        reason: "no-auth",
        detail: "No session access token",
      };
    authHeaders = {
      Authorization: `Bearer ${sessionIngressAuthToken}`,
    };
    Authorization = authHeaders.Authorization;
  } else if (options.auth === "claude-ai-oauth") {
    await refreshOAuthIfRequested(options);
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    let accessToken = claudeAIOAuthTokens?.accessToken;
    if (!isUsableClaudeAILoginRecord(claudeAIOAuthTokens) || !accessToken)
      return {
        ok: false,
        reason: "no-auth",
        detail: NO_CLAUDE_AI_LOGIN,
      };
    authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "anthropic-beta": OAUTH_BETA_HEADER,
    };
    if (options.recoverOAuth401 && (claudeAIOAuthTokens?.refreshToken || getSdkOAuthTokenRefreshCallback()))
      refreshableAccessToken = accessToken;
  } else if (options.auth !== "none") {
    await refreshOAuthIfRequested(options);
    let authHeadersResult = options.auth === "async" ? await getAuthHeadersAsync() : getAuthHeaders();
    let apiKey = authHeadersResult.headers["x-api-key"];
    let apiKeyProblem =
      authHeadersResult.error ??
      (apiKey && !apiKeyForHost(apiKey)
        ? "API key not sent: ANTHROPIC_BASE_URL is not an Anthropic host"
        : undefined);
    if (apiKeyProblem && options.auth !== "optional")
      return {
        ok: false,
        reason: "no-auth",
        detail: apiKeyProblem,
      };
    authHeaders = apiKeyProblem ? {} : authHeadersResult.headers;
  }
  if (options.host === "frame" && getFrameHostOverride() !== undefined) {
    if (env.CLAUDE_CODE_ARTIFACTS_API_TOKEN)
      authHeaders = {
        Authorization: `Bearer ${env.CLAUDE_CODE_ARTIFACTS_API_TOKEN}`,
      };
    refreshableAccessToken = null;
  }
  if (options.host === "memory") {
    let memoryTarget = memoryApiTarget();
    if (memoryTarget.auth === "none") {
      authHeaders = memoryTarget.headers ?? {};
      refreshableAccessToken = null;
    }
  }
  let headers = {
    "User-Agent": getUserAgent(),
    ...authHeaders,
    ...options.headers,
  };
  if (isConsoleProfile) {
    for (let key of Object.keys(headers))
      if (key.toLowerCase() === "x-trusted-device-token") delete headers[key];
  }
  if (options.frameTunnel) {
    for (let key of Object.keys(headers)) if (SENSITIVE_HEADERS.has(key.toLowerCase())) delete headers[key];
    headers.Authorization = Authorization;
  }
  let sentAuthFingerprint = null;
  if (options.reportSentAuth) {
    let authorizationHeader;
    for (let [key, value] of Object.entries(headers))
      if (key.toLowerCase() === "authorization") authorizationHeader = value;
    sentAuthFingerprint = authorizationHeader === undefined ? null : hashCredential(authorizationHeader);
  }
  let maxRedirects = options.maxRedirects ?? (options.host === "frame" ? 0 : undefined);
  let sentBody = requestBody;
  let timeout = options.timeout ?? UPLOAD_TIMEOUT_MS;
  let uploadProgress;
  let sliced = options.streamUpload?.sliced;
  if (requestBody instanceof SlicedBody || (sliced !== undefined && requestBody !== undefined))
    throw TypeError(
      "StreamedUploadBody must be passed as streamUpload.sliced with no body argument; it was passed as the body, or together with one",
    );
  if (options.streamUpload !== undefined && requestBody !== undefined) {
    let buffer = toBuffer(requestBody);
    let bodyIsPlainObject = typeof requestBody !== "string" && !isPlainJsonBody(requestBody);
    if (options.maxBodyLength !== undefined && buffer.length > options.maxBodyLength)
      throw new AxiosError("Request body larger than maxBodyLength limit", AxiosError.ERR_BAD_REQUEST);
    let stallMs = options.streamUpload.stallMs ?? DEFAULT_STALL_MS;
    let tailFloorMs = options.streamUpload.tailFloorMs?.(buffer.length);
    if (isZodVersionCompatible()) {
      uploadProgress = uploadBufferWithProgress(buffer, {
        stallMs,
        ...(tailFloorMs !== undefined && {
          tailFloorMs,
        }),
        signal: options.signal,
      });
      sentBody = uploadProgress.body;
    } else {
      sentBody = buffer;
      timeout = Math.max(maxAllowedStallMs(buffer.length, stallMs), tailFloorMs ?? 0);
    }
    if (!hasHeaderIgnoringCase(headers, "content-type") && !bodyIsPlainObject)
      headers["Content-Type"] = typeof requestBody === "string" ? "text/plain" : "application/json";
    headers["Content-Length"] = String(buffer.length);
  }
  if (options.streamUpload !== undefined && sliced !== undefined) {
    if (options.maxBodyLength !== undefined && sliced.byteLength > options.maxBodyLength)
      throw new AxiosError("Request body larger than maxBodyLength limit", AxiosError.ERR_BAD_REQUEST);
    let stallMs = options.streamUpload.stallMs ?? DEFAULT_STALL_MS;
    let tailFloorMs = options.streamUpload.tailFloorMs?.(sliced.byteLength);
    if (isZodVersionCompatible()) {
      uploadProgress = uploadStreamWithProgress(sliced.slices(), sliced.byteLength, {
        stallMs,
        ...(tailFloorMs !== undefined && {
          tailFloorMs,
        }),
        signal: options.signal,
      });
      sentBody = uploadProgress.body;
    } else {
      let chunks = [];
      for await (let chunk of sliced.slices()) chunks.push(chunk);
      sentBody = Buffer.concat(chunks);
      timeout = Math.max(maxAllowedStallMs(sliced.byteLength, stallMs), tailFloorMs ?? 0);
    }
    headers["Content-Length"] = String(sliced.byteLength);
  }
  let wireTransport =
    options.streamUpload !== undefined && requestBody !== undefined && maxRedirects === 0
      ? createUploadWireTransport()
      : undefined;
  let slicedUploadTransport =
    sliced !== undefined && maxRedirects === 0 ? createUploadWireTransport() : undefined;
  let baseUrl = options.frameTunnel
    ? `https://${options.frameTunnel.host}`
    : baseUrlForRequest(apiHostUrl(options.host ?? "api"), options);
  let response;
  try {
    try {
      response = await axios_default.request({
        method,
        baseURL: baseUrl,
        url: urlPath,
        data: sentBody,
        timeout: uploadProgress ? 0 : timeout,
        signal: uploadProgress ? uploadProgress.signal : options.signal,
        responseType: options.responseType,
        validateStatus: options.validateStatus,
        skipSessionsBearerReport: true,
        maxContentLength: options.maxContentLength,
        maxBodyLength: options.maxBodyLength,
        ...(maxRedirects !== undefined && {
          maxRedirects,
        }),
        ...(maxRedirects !== 0 && {
          beforeRedirect: (redirectOptions) => {
            if (!sameOrigin(urlFromRequestOptions(redirectOptions), baseUrl))
              throw Error("first-party request redirected to another origin");
          },
        }),
        ...(wireTransport && {
          transport: wireTransport.transport,
        }),
        ...(slicedUploadTransport && {
          transport: slicedUploadTransport.transport,
        }),
        ...(earlyAnswerAdapter && {
          adapter: earlyAnswerAdapter,
        }),
        ...(options.freshConnection &&
          !options.frameTunnel && {
            httpsAgent: createOneOffHttpsAgent(),
            httpAgent: new Agent_3({
              keepAlive: false,
            }),
          }),
        ...(options.noEnvProxy && {
          proxy: false,
        }),
        ...(options.frameTunnel && {
          httpsAgent: options.frameTunnel.agent,
          proxy: false,
        }),
        headers,
      });
    } catch (error) {
      throw uploadProgress ? uploadStallError(error, uploadProgress) : error;
    } finally {
      if (uploadProgress) {
        uploadProgress.dispose();
        if (sliced !== undefined) uploadProgress.body.destroy();
        options.streamUpload?.onSettled?.({
          ...uploadProgress.seen(),
          ...wireTransport?.seen(true),
          ...slicedUploadTransport?.seen(true),
        });
      } else if (options.streamUpload && Buffer.isBuffer(sentBody))
        options.streamUpload.onSettled?.({
          body_bytes: sentBody.length,
          bytes_handed: sentBody.length,
          stalled: false,
          ...wireTransport?.seen(false),
          ...slicedUploadTransport?.seen(false),
        });
    }
  } catch (error) {
    if (
      (isRetry || options.isBackground) &&
      isSessionsApi &&
      refreshableAccessToken !== null &&
      axios_default.isAxiosError(error) &&
      error.response?.status === 401 &&
      !options.isRouteOwned401Answer?.(error.response.data, error.response.headers) &&
      !options.isRouteOwned401?.(error.response.data)
    )
      recoverHostSessionsBearer(
        bearerHeaderOrFallback(refreshableAccessToken, error.config, isSessionsApi),
        lacksAuthorizationHeader(error.config) ? "withheld" : "refused",
      ).catch(() => {});
    if (
      refreshableAccessToken !== null &&
      !isRetry &&
      !options.isBackground &&
      axios_default.isAxiosError(error) &&
      error.response?.status === 401 &&
      !options.isRouteOwned401Answer?.(error.response.data, error.response.headers) &&
      !options.isRouteOwned401?.(error.response.data)
    ) {
      let bearerHeader = bearerHeaderOrFallback(refreshableAccessToken, error.config, isSessionsApi);
      let recoveryOutcome = isConsoleProfile
        ? await recoverConsoleProfileAuth(bearerHeader)
        : await recoverAuthFailure(
            bearerHeader,
            options,
            isSessionsApi,
            lacksAuthorizationHeader(error.config),
          );
      if (recoveryOutcome === "retry") {
        destroyIfStream(error.response.data);
        return apiRequest(method, requestPath, requestBody, options, true);
      }
      if (recoveryOutcome !== null) {
        destroyIfStream(error.response.data);
        return recoveryOutcome;
      }
    }
    throw error;
  }
  if (
    (isRetry || options.isBackground) &&
    isSessionsApi &&
    refreshableAccessToken !== null &&
    response.status === 401 &&
    !options.isRouteOwned401Answer?.(response.data, response.headers) &&
    !options.isRouteOwned401?.(response.data)
  )
    recoverHostSessionsBearer(
      bearerHeaderOrFallback(refreshableAccessToken, response.config, isSessionsApi),
      lacksAuthorizationHeader(response.config) ? "withheld" : "refused",
    ).catch(() => {});
  if (
    refreshableAccessToken !== null &&
    response.status === 401 &&
    !isRetry &&
    !options.isBackground &&
    !options.isRouteOwned401Answer?.(response.data, response.headers) &&
    !options.isRouteOwned401?.(response.data)
  ) {
    let bearerHeader = bearerHeaderOrFallback(refreshableAccessToken, response.config, isSessionsApi);
    let recoveryOutcome = isConsoleProfile
      ? await recoverConsoleProfileAuth(bearerHeader)
      : await recoverAuthFailure(
          bearerHeader,
          options,
          isSessionsApi,
          lacksAuthorizationHeader(response.config),
        );
    if (recoveryOutcome === "retry") {
      destroyIfStream(response.data);
      return apiRequest(method, requestPath, requestBody, options, true);
    }
    if (recoveryOutcome !== null) {
      destroyIfStream(response.data);
      return recoveryOutcome;
    }
  }
  return {
    ok: true,
    data: response.data,
    status: response.status,
    response,
    ...(options.reportSentAuth && {
      sentAuthFingerprint,
    }),
  };
}
//@ chunk-exfmq47h.js:834260-834487 placement
async function refreshOAuthIfRequested(options) {
  if (!options.refreshOAuth) return;
  try {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials: options.credentials,
      storageV5: options.storageV5,
    });
  } catch (error) {
    logForDebugging(
      `firstPartyApi: refreshOAuth failed (${error instanceof Error ? error.message : error}); proceeding with cached token`,
    );
  }
}
//@ chunk-exfmq47h.js:834487-834825 placement
/**
 * 上传停滞时转换错误信息。
 */
function uploadStallError(error, progress) {
  let snapshot = progress.seen();
  if (!(axios_default.isCancel(error) && snapshot.stalled)) return error;
  let reason = progress.signal.reason;
  let waitText =
    reason instanceof UploadStalledError ? `${Math.round(reason.waitedMs / 1000)}s` : "the allowance";
  return new AxiosError(
    snapshot.bytes_handed === snapshot.body_bytes
      ? `upload stalled: no answer within ${waitText} of the body being handed over`
      : `upload stalled: nothing moved for ${waitText}`,
    AxiosError.ECONNABORTED,
  );
}
//@ chunk-exfmq47h.js:834825-835127 placement
/**
 * 把各种数据转为 Buffer。
 */
function toBuffer(body) {
  if (Buffer.isBuffer(body)) return body;
  if (isArrayBufferView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (typeof body === "string") return Buffer.from(body);
  if (isPlainJsonBody(body)) return Buffer.from(jsonStringify(body));
  throw TypeError("streamUpload: unsupported request body type");
}
//@ chunk-exfmq47h.js:835127-835282 placement
function isPlainJsonBody(value) {
  if (Array.isArray(value)) return true;
  if (typeof value !== "object" || value === null) return false;
  let prototypeOf = Object.getPrototypeOf(value);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
//@ chunk-exfmq47h.js:835282-835374 placement
/**
 * 大小写不敏感地判断对象是否已有某个头。
 */
function hasHeaderIgnoringCase(headers, headerName) {
  let lower = headerName.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}
//@ chunk-exfmq47h.js:835374-835418 placement
/**
 * 判断值是否为 ArrayBuffer 视图（TypedArray/DataView）。
 */
function isArrayBufferView(value) {
  return ArrayBuffer.isView(value);
}
//@ chunk-exfmq47h.js:835418-835464 placement
/**
 * 若响应数据是流则销毁，避免连接泄漏。
 */
function destroyIfStream(body) {
  if (body instanceof Readable) body.destroy();
}
//@ chunk-exfmq47h.js:835464-835548 placement
/**
 * 重试时若新请求带了 Authorization 头，用它替换原来的 bearer。
 */
function bearerHeaderOrFallback(fallback, config, isSessionsApi) {
  if (!isSessionsApi) return fallback;
  return bearerOf(config?.headers?.get?.("Authorization")) ?? fallback;
}
//@ chunk-exfmq47h.js:835548-835713 placement
async function recoverConsoleProfileAuth(bearerHeader) {
  switch (await recoverConsoleProfileBearerOutcome(bearerHeader)) {
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
//@ chunk-exfmq47h.js:835713-836101 placement
/**
 * 认证失败后尝试恢复（刷新令牌）并决定是否重试。
 */
async function recoverAuthFailure(bearerHeader, options, isSessionsApi, headerWithheld) {
  let isClaudeAiAuth = options.auth === "claude-ai-oauth";
  try {
    if (isSessionsApi) {
      let recoveryResult = await recoverHostSessionsBearer(
        bearerHeader,
        headerWithheld ? "withheld" : "refused",
      );
      if (recoveryResult !== "not_held")
        return recoveryResult === "recovered" || hasClaudeAISignInToken() ? "retry" : null;
      if ((await ensureHostSessionsBearer()) !== null) return "retry";
    }
    if (await handleOAuth401Error(bearerHeader, options.credentials, options.storageV5)) return "retry";
    if (await isOAuthRefreshKnownDeadAsync(options.credentials))
      return {
        ok: false,
        reason: "no-auth",
        detail: isClaudeAiAuth ? NO_CLAUDE_AI_LOGIN : REFRESH_TOKEN_INVALID_MESSAGE,
      };
    return null;
  } catch (error) {
    if (!isClaudeAiAuth) throw error;
    logError(error);
    return null;
  }
}
//@ chunk-exfmq47h.js:836101-836300 placement
/**
 * API 客户端（get/post/put/patch/delete）。
 */
var apiClient = {
  get(path, options) {
    return apiRequest("GET", path, undefined, options);
  },
  post(path, body, options) {
    return apiRequest("POST", path, body, options);
  },
  put(path, body, options) {
    return apiRequest("PUT", path, body, options);
  },
  patch(path, body, options) {
    return apiRequest("PATCH", path, body, options);
  },
  delete(path, body, options) {
    return apiRequest("DELETE", path, body, options);
  },
};
//@ chunk-exfmq47h.js:836300-836480 placement
var URL_CONTROL_CHARS_RE = /[\u0000-\u0020\u007f]/;
var STRICT_URL_RE = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/\\?#]+)([^?#]*)(\?[^#]*)?(?:#[\s\S]*)?$/;
var DEFAULT_PORTS = {
  "ftp:": "21",
  "http:": "80",
  "https:": "443",
  "ws:": "80",
  "wss:": "443",
};
//@ chunk-exfmq47h.js:836480-837053 placement
/**
 * 严格解析 URL（拒绝控制字符与不一致的协议）。
 */
function parseStrictUrl(rawUrl) {
  if (URL_CONTROL_CHARS_RE.test(rawUrl)) return null;
  let match = STRICT_URL_RE.exec(rawUrl);
  if (!match) return null;
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }
  let [, scheme = "", authority = "", pathPart = "", queryPart = ""] = match;
  if (parsedUrl.protocol !== `${scheme.toLowerCase()}:`) return null;
  let index = authority.lastIndexOf("@");
  let expectedAuthority =
    authority.slice(0, index + 1) +
    authority.slice(index + 1).replace(/[A-Z]/g, (letter) => letter.toLowerCase());
  let actualAuthority = `${parsedUrl.username || parsedUrl.password ? `${parsedUrl.username}${parsedUrl.password ? `:${parsedUrl.password}` : ""}@` : ""}${parsedUrl.host}`;
  let defaultPort = DEFAULT_PORTS[parsedUrl.protocol];
  if (
    expectedAuthority !== actualAuthority &&
    !(
      parsedUrl.port === "" &&
      defaultPort !== undefined &&
      expectedAuthority === `${actualAuthority}:${defaultPort}`
    )
  )
    return null;
  if (parsedUrl.pathname !== pathPart && !(pathPart === "" && parsedUrl.pathname === "/")) return null;
  if (parsedUrl.search !== (queryPart === "?" ? "" : queryPart)) return null;
  return parsedUrl;
}
//@ chunk-exfmq47h.js:837053-837219 placement
function normalizeServerUrl(serverUrl) {
  let strictUrl = parseStrictUrl(serverUrl);
  if (!strictUrl) return serverUrl.replace(/\/$/, "");
  strictUrl.search = "";
  strictUrl.hash = "";
  strictUrl.pathname = strictUrl.pathname.replace(/\/$/, "") || "/";
  return strictUrl.toString().replace(/\/$/, "");
}
//@ chunk-exfmq47h.js:837219-837435 placement
/**
 * 去片段与尾斜杠（保留查询）。
 */
function normalizeMcpServerUrl(serverUrl) {
  let strictUrl = parseStrictUrl(serverUrl);
  if (!strictUrl) return serverUrl.includes("?") ? serverUrl : serverUrl.replace(/\/$/, "");
  strictUrl.hash = "";
  if (!strictUrl.search) strictUrl.search = "";
  strictUrl.pathname = strictUrl.pathname.replace(/\/$/, "") || "/";
  let str = strictUrl.toString();
  return strictUrl.search ? str : str.replace(/\/$/, "");
}
//@ chunk-exfmq47h.js:837435-837494 placement
/**
 * MCP 目录可见组织类型的默认值（commercial/gsuite/enterprise/health）与翻页上限。
 */
var DEFAULT_MCP_DIRECTORY_KINDS = ["commercial", "gsuite", "enterprise", "health"];
var MAX_MCP_DIRECTORY_PAGES = 20;
//@ chunk-exfmq47h.js:837494-837597 placement (2.1.88 match: validateURL, 0.823)
/**
 * 去掉 URL 的用户名/密码后交给 dO 处理。
 */
function stripUrlCredentials(url) {
  try {
    let parsedUrl = new URL(url);
    parsedUrl.username = "";
    parsedUrl.password = "";
    return normalizeServerUrl(parsedUrl.toString());
  } catch {
    return;
  }
}
//@ chunk-exfmq47h.js:837597-837745 placement
function mcpDirectoryVisibility() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_mcp_directory_visibility",
    DEFAULT_MCP_DIRECTORY_KINDS,
  );
  return Array.isArray(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE.every((kind) => typeof kind === "string")
    ? featureValue_CACHED_MAY_BE_STALE.filter((kind) => kind.length > 0)
    : DEFAULT_MCP_DIRECTORY_KINDS;
}
//@ chunk-exfmq47h.js:837745-838155 placement
/**
 * 分页获取 MCP 注册表服务器 URL。
 */
async function fetchRegistryServerUrls(visibilityKinds) {
  let serverUrls = new Set();
  let visibility = visibilityKinds.join(",");
  let cursor;
  for (let j = 0; j < MAX_MCP_DIRECTORY_PAGES; j++) {
    let uRLSearchParams = new URLSearchParams({
      version: "latest",
      limit: "100",
      visibility,
    });
    if (cursor) uRLSearchParams.set("cursor", cursor);
    let response = await apiClient.get(`/mcp-registry/v0/servers?${uRLSearchParams}`, {
      auth: "none",
      timeout: 5000,
    });
    if (!response.ok) break;
    for (let server of response.data.servers ?? [])
      for (let remote of server.server?.remotes ?? []) {
        let normalizedUrl = stripUrlCredentials(remote.url);
        if (normalizedUrl) serverUrls.add(normalizedUrl);
      }
    cursor = response.data.metadata?.nextCursor;
    if (!cursor) break;
  }
  return serverUrls;
}
//@ chunk-exfmq47h.js:838155-838571 placement
/**
 * 分页获取目录服务器 URL（BFF）。
 */
async function fetchDirectoryServerUrls(visibilityKinds) {
  let serverUrls = new Set();
  let visibility = visibilityKinds.join(",");
  let cursor;
  for (let j = 0; j < MAX_MCP_DIRECTORY_PAGES; j++) {
    let uRLSearchParams = new URLSearchParams({
      limit: "500",
      visibility,
    });
    if (cursor) uRLSearchParams.set("cursor", cursor);
    let response = await apiClient.get(`/api/directory/servers?${uRLSearchParams}`, {
      auth: "none",
      timeout: 5000,
    });
    if (!response.ok) break;
    for (let server of response.data.servers ?? []) {
      if (server.type !== "remote") continue;
      let url = server.remote?.url;
      if (!url) continue;
      let normalizedUrl = stripUrlCredentials(url);
      if (normalizedUrl) serverUrls.add(normalizedUrl);
    }
    cursor = response.data.next_cursor ?? undefined;
    if (!cursor) break;
  }
  return serverUrls;
}
//@ chunk-exfmq47h.js:838571-838745 placement
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
//@ chunk-exfmq47h.js:838745-838911 placement
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
//@ chunk-exfmq47h.js:838911-839666 placement
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
  let visibilityKinds = mcpDirectoryVisibility();
  if (visibilityKinds.length === 0) {
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
    let urls = featureValue_CACHED_MAY_BE_STALE
      ? await fetchDirectoryServerUrls(visibilityKinds)
      : await fetchRegistryServerUrls(visibilityKinds);
    getCliOwnedState().officialUrls = urls;
    logForDebugging(
      `[mcp-registry] Loaded ${urls.size} official MCP URLs (${featureValue_CACHED_MAY_BE_STALE ? "bff" : "legacy"})`,
    );
    logFeatureOk("mcp_registry_fetch");
    logEvent("tengu_mcp_registry_fetch", {
      source,
      success: true,
      url_count: urls.size,
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
//@ chunk-exfmq47h.js:839666-839973 placement
/**
 * URL 是否为官方 MCP 服务器。
 */
function isOfficialMcpUrl(url) {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.officialUrls !== undefined) return cliOwnedState.officialUrls.has(url);
  if (cliOwnedState.listableUrlLookedUp || cliOwnedState.urlsRegistryCannotList.has(url)) return false;
  if (url.startsWith("https://") && !isFirstPartyAnthropicHost(url) && !isSameOriginAsCcr(url)) {
    cliOwnedState.listableUrlLookedUp = true;
    if (cliOwnedState.officialUrlsFetchAwaitsLookup) fetchOfficialMcpUrlsOnce();
  } else cliOwnedState.urlsRegistryCannotList.add(url);
  return false;
}
export {
  isOfficialMcpUrl,
  apiClient,
  normalizeMcpServerUrl,
  httpsOrigin,
  invalidHttpsUrlReason,
  hasApiClient,
  claudeAiBearerDigest,
  hashCredential,
  prefetchOfficialMcpUrls,
  getFrameHostOverride,
  UPLOAD_TIMEOUT_MS,
  frameBaseUrl,
  getClaudeAiAccessToken,
  fetchOfficialMcpUrlsOnce,
  mcpDirectoryVisibility,
  normalizeServerUrl,
};

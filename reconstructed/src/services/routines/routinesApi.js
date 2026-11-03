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
import { Readable, Readable as Readable_2 } from "stream";
import { CODE_SESSIONS_PATH, CODE_TRIGGERS_PATH_PATTERN } from "../../bridge/workSecret.js";
import { getOauthConfig, OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { env } from "../../utils/env.js";
import {
  vgr,
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
  cgr,
  Sg,
  dgr,
  Dx,
  Mx,
  UploadStalledError,
  sessionHostKind,
} from "../../utils/telemetry/memorySummary.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getAPIProvider, isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { noteExternalHttpUse } from "../../utils/testNetworkGuard.js";
import { Dt, AxiosError } from "../../../vendor/axios/dist/esm/axios.js";
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
import { ht } from "../mcp/cliOwnedClients.js";
import { lit } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { isSameOriginAsCcr } from "../mcp/ccrMcpUrls.js";

//@ chunk-aepeg2w5.js:802953-803044 placement
function rO(e) {
  return /^[A-Za-z0-9_\-/.:]+$/.test(e) && !/(?:^|\/)\.\.?(?:\/|$)|\/\//.test(e);
}
//@ chunk-aepeg2w5.js:803044-803260 placement
var CONSOLE_PROFILE_UNSUPPORTED_MESSAGE =
  "This request can't be made with a Console-profile sign-in, and the part of Claude Code that reads that sign-in isn't loaded in this process (a bug in Claude Code; please report it, with the command you ran)";
/**
 * 判断请求路径对应的 routine/session 操作。
 */
//@ chunk-aepeg2w5.js:803260-803629 placement
function classifyRoutineRequest(e, n, r) {
  let index = n.indexOf("?"),
    h = index < 0 ? n : n.slice(0, index);
  if (!rO(h)) return null;
  if (h.startsWith(CODE_SESSIONS_PATH)) return "session";
  if (!CODE_TRIGGERS_PATH_PATTERN.test(n)) return null;
  if (!h.startsWith("/v1/code/triggers/")) return e === "GET" ? "routine_list" : null;
  return e === "POST" &&
    typeof r === "object" &&
    r !== null &&
    !Array.isArray(r) &&
    Object.keys(r).length === 1 &&
    "enabled" in r &&
    r.enabled === !1
    ? "routine_pause"
    : null;
}
//@ chunk-aepeg2w5.js:803629-803745 placement
function isSessionsApiPath(e, n, r) {
  let index = n.indexOf("?"),
    h = index < 0 ? n : n.slice(0, index);
  if (!rO(h)) return !1;
  return SESSIONS_PATH_RE.test(h) || classifyRoutineRequest(e, n, r) !== null;
}
/**
 * sessions 路径正则、上传超时、敏感头与官方源。
 */
//@ chunk-aepeg2w5.js:803745-803968 placement
var SESSIONS_PATH_RE = /^\/v1\/(?:code\/)?sessions(?:\/|$)/,
  UPLOAD_TIMEOUT_MS = 15000,
  SENSITIVE_HEADERS = new Set([
    "authorization",
    "proxy-authorization",
    "x-authorization",
    "x-api-key",
    "cookie",
  ]),
  OFFICIAL_API_ORIGINS = new Set(["https://api.anthropic.com", "https://api-staging.anthropic.com"]);
//@ chunk-aepeg2w5.js:803968-804136 placement
function isOfficialApiOrigin(e) {
  let n;
  try {
    n = new URL(getOauthConfig().BASE_API_URL).origin;
  } catch {
    return !1;
  }
  if (e.origin === n) return !0;
  if (env.CLAUDE_CODE_CUSTOM_OAUTH_URL) return !1;
  return OFFICIAL_API_ORIGINS.has(e.origin);
}
//@ chunk-aepeg2w5.js:804136-804192 placement
function kgr(e) {
  let n = validateHttpsUrl(e);
  return n.ok ? n.origin : void 0;
}
/**
 * 校验 URL 为不带凭据和端口的 https。
 */
//@ chunk-aepeg2w5.js:804192-804524 placement
function validateHttpsUrl(e) {
  if (!e) return { ok: !1, reason: "unparseable" };
  let n;
  try {
    n = new URL(e);
  } catch {
    return { ok: !1, reason: "unparseable" };
  }
  if (n.protocol !== "https:") return { ok: !1, reason: "not_https" };
  if (n.username || n.password || n.port) return { ok: !1, reason: "userinfo_or_port" };
  if (!isOfficialApiOrigin(n)) return { ok: !1, reason: "untrusted_origin" };
  return { ok: !0, origin: n.origin };
}
//@ chunk-aepeg2w5.js:804524-804580 placement
function zki(e) {
  let n = validateHttpsUrl(e);
  return n.ok ? void 0 : n.reason;
}
//@ chunk-aepeg2w5.js:804580-804680 placement
function baseUrlForRequest(e, n) {
  return n.auth === "none" && n.host !== "frame" && n.host !== "memory" && n.baseUrl ? n.baseUrl : e;
}
/**
 * frame 主机覆盖（外部构建无）。
 */
//@ chunk-aepeg2w5.js:804680-804702 placement
function getFrameHostOverride() {
  return;
}
//@ chunk-aepeg2w5.js:804702-804736 placement
function Tgr() {
  return apiHostUrl("frame");
}
/**
 * 按主机类别（api、claude-ai、mcp-proxy、frame、memory…）取基础 URL。
 */
//@ chunk-aepeg2w5.js:804736-805061 placement
function apiHostUrl(e) {
  let n = getOauthConfig();
  switch (e) {
    case "api":
      return n.BASE_API_URL;
    case "claude-ai":
      return n.CLAUDE_AI_ORIGIN;
    case "mcp-proxy":
      return n.MCP_PROXY_URL;
    case "frame":
      return getFrameHostOverride() ?? n.BASE_API_URL;
    case "memory":
      return vgr() ?? n.BASE_API_URL;
    case "ccr-session":
      return ccrHostUrl(e).href.replace(/\/$/, "");
    case "ccr-gateway":
      return ccrHostUrl(e).origin;
  }
}
/**
 * ccr-session/ccr-gateway 主机 URL（需要 --sdk-url）。
 */
//@ chunk-aepeg2w5.js:805061-805529 placement
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
/**
 * 凭据摘要。
 */
//@ chunk-aepeg2w5.js:805529-805558 placement
function hashCredential(e) {
  return computeContentHash(e);
}
//@ chunk-aepeg2w5.js:805558-805654 placement
function Agr() {
  let e = getClaudeAIOAuthTokens(),
    n = e?.accessToken;
  if (!isUsableClaudeAILoginRecord(e) || !n) return null;
  return hashCredential(`Bearer ${n}`);
}
/**
 * 刷新后取可用的 claude.ai 访问令牌。
 */
//@ chunk-aepeg2w5.js:805654-805805 placement
async function getClaudeAiAccessToken() {
  if (publicCatalogShortcut({}, void 0) !== void 0) return null;
  await refreshOAuthIfRequested({ refreshOAuth: !0 });
  let e = getClaudeAIOAuthTokens(),
    n = e?.accessToken;
  if (!isUsableClaudeAILoginRecord(e) || !n) return null;
  return n;
}
/**
 * 公开插件目录请求的快捷判断。
 */
//@ chunk-aepeg2w5.js:805805-806194 placement
function publicCatalogShortcut(e, n) {
  if (
    e.publicPluginDirectoryCatalog === !0 &&
    e.auth === "none" &&
    (e.host === void 0 || e.host === "api") &&
    e.baseUrl === void 0 &&
    e.headers === void 0 &&
    n?.method === "GET" &&
    firstLineOf(n.path, "?") === cgr &&
    !new URLSearchParams(n.path.slice(cgr.length)).has("q")
  )
    return;
  let r = !1;
  if (!e.bypassEssentialTrafficOnly && !r && isEssentialTrafficOnly()) return "essential-traffic-only";
  if (getAPIProvider() !== "firstParty") return "data-residency";
  return;
}
/**
 * 是否可发起 API 请求。
 */
//@ chunk-aepeg2w5.js:806194-806239 placement
function hasApiClient() {
  return publicCatalogShortcut({}, void 0) === void 0;
}
//@ chunk-aepeg2w5.js:806239-806342 placement
var REFRESH_TOKEN_INVALID_MESSAGE = "OAuth refresh token is no longer valid; run /login to re-authenticate",
  NO_CLAUDE_AI_LOGIN = "no claude.ai login";
/**
 * 统一的 Anthropic API 请求：选主机与认证、OAuth 刷新、重试、上传超时、frame 隧道。
 */
//@ chunk-aepeg2w5.js:806342-811894 placement
async function apiRequest(e, n, r, s = {}, h = !1) {
  let y = r;
  noteExternalHttpUse();
  let S = publicCatalogShortcut(s, { method: e, path: n });
  if (S !== void 0) return { ok: !1, reason: S };
  if (s.frameTunnel && (s.host !== "frame" || s.auth !== "session-jwt"))
    throw Error("frameTunnel requires host 'frame' and auth 'session-jwt'");
  let w = {},
    R,
    x = n,
    P = null,
    F = !1,
    L = !1,
    G;
  if (s.auth === "teleport-org") {
    let Z;
    if (isConsoleProfileSessionsCredential()) {
      let fe = classifyRoutineRequest(e, n, y);
      if (fe === null)
        return {
          ok: !1,
          reason: "no-auth",
          detail: !consoleProfileCredentialProviderLoaded()
            ? CONSOLE_PROFILE_UNSUPPORTED_MESSAGE
            : consoleProfileOrganizationLabel() === "unknown"
              ? "The organization's policy has not been read yet; a Console-profile sign-in is in use"
              : "A Console-profile sign-in is in use; this needs a claude.ai sign-in",
        };
      if (fe === "routine_pause") y = { enabled: !1 };
      let Ae;
      try {
        Ae = await prepareApiRequest(s.credentials);
      } catch (error) {
        if (error instanceof CloudSessionAccessError)
          return { ok: !1, reason: "no-auth", detail: error.message };
        throw error;
      }
      ((P = Ae.accessToken),
        (Z = Ae),
        (F = !0),
        (w = { ...getOAuthHeaders(Ae.accessToken), "x-organization-uuid": Ae.orgUUID }),
        (x = n.replace(":orgUUID", Ae.orgUUID)));
    } else {
      if (
        (await checkAndRefreshOAuthTokenIfNeeded({ credentials: s.credentials, storageV5: s.storageV5 }),
        await isOAuthRefreshKnownDeadAsync(s.credentials))
      )
        return { ok: !1, reason: "no-auth", detail: REFRESH_TOKEN_INVALID_MESSAGE };
      if (!getClaudeAIOAuthTokens()?.accessToken)
        return { ok: !1, reason: "no-auth", detail: "No OAuth token in keychain" };
      L = isSessionsApiPath(e, n, y);
      let { accessToken: accessToken, orgUUID: orgUUID } = await prepareApiRequest(s.credentials, L);
      ((P = accessToken),
        (Z = { accessToken: accessToken, orgUUID: orgUUID }),
        (w = { ...getOAuthHeaders(accessToken), "x-organization-uuid": orgUUID }),
        (x = n.replace(":orgUUID", orgUUID)));
    }
    let { earlyAnswer: earlyAnswer } = s;
    if (earlyAnswer !== void 0 && e === "GET") {
      let { accessToken: accessToken, orgUUID: orgUUID } = Z;
      G = async (Me) => {
        let xe = await earlyAnswer({
          path: n,
          baseUrl: apiHostUrl(s.host ?? "api"),
          orgUuid: orgUUID,
          authFingerprint: hashCredential(`Bearer ${accessToken}`),
        });
        return xe === void 0
          ? Dt.getAdapter(Dt.defaults.adapter)(Me)
          : { data: xe.body, status: xe.status, statusText: "", headers: {}, config: Me };
      };
    }
  } else if (s.auth === "session-jwt") {
    let Z = getSessionIngressAuthToken();
    if (!Z) return { ok: !1, reason: "no-auth", detail: "No session access token" };
    ((w = { Authorization: `Bearer ${Z}` }), (R = w.Authorization));
  } else if (s.auth === "claude-ai-oauth") {
    await refreshOAuthIfRequested(s);
    let Z = getClaudeAIOAuthTokens(),
      ce = Z?.accessToken;
    if (!isUsableClaudeAILoginRecord(Z) || !ce)
      return { ok: !1, reason: "no-auth", detail: NO_CLAUDE_AI_LOGIN };
    if (
      ((w = { Authorization: `Bearer ${ce}`, "anthropic-beta": OAUTH_BETA_HEADER }),
      s.recoverOAuth401 && (Z?.refreshToken || getSdkOAuthTokenRefreshCallback()))
    )
      P = ce;
  } else if (s.auth !== "none") {
    await refreshOAuthIfRequested(s);
    let Z = s.auth === "async" ? await getAuthHeadersAsync() : getAuthHeaders(),
      ce = Z.headers["x-api-key"],
      fe =
        Z.error ??
        (ce && !apiKeyForHost(ce) ? "API key not sent: ANTHROPIC_BASE_URL is not an Anthropic host" : void 0);
    if (fe && s.auth !== "optional") return { ok: !1, reason: "no-auth", detail: fe };
    w = fe ? {} : Z.headers;
  }
  if (s.host === "frame" && getFrameHostOverride() !== void 0) {
    if (env.CLAUDE_CODE_ARTIFACTS_API_TOKEN)
      w = { Authorization: `Bearer ${env.CLAUDE_CODE_ARTIFACTS_API_TOKEN}` };
    P = null;
  }
  if (s.host === "memory") {
    let Z = memoryApiTarget();
    if (Z.auth === "none") ((w = Z.headers ?? {}), (P = null));
  }
  let j = { "User-Agent": getUserAgent(), ...w, ...s.headers };
  if (F) {
    for (let Z of Object.keys(j)) if (Z.toLowerCase() === "x-trusted-device-token") delete j[Z];
  }
  if (s.frameTunnel) {
    for (let Z of Object.keys(j)) if (SENSITIVE_HEADERS.has(Z.toLowerCase())) delete j[Z];
    j.Authorization = R;
  }
  let ee = null;
  if (s.reportSentAuth) {
    let Z;
    for (let [ce, fe] of Object.entries(j)) if (ce.toLowerCase() === "authorization") Z = fe;
    ee = Z === void 0 ? null : hashCredential(Z);
  }
  let q = s.maxRedirects ?? (s.host === "frame" ? 0 : void 0),
    Q = y,
    re = s.timeout ?? UPLOAD_TIMEOUT_MS,
    se;
  if (s.streamUpload !== void 0 && y !== void 0) {
    let Z = toBuffer(y),
      ce = typeof y !== "string" && !isPlainJsonBody(y);
    if (s.maxBodyLength !== void 0 && Z.length > s.maxBodyLength)
      throw new AxiosError("Request body larger than maxBodyLength limit", AxiosError.ERR_BAD_REQUEST);
    let fe = s.streamUpload.stallMs ?? Sg,
      Ae = s.streamUpload.tailFloorMs?.(Z.length);
    if (dgr())
      ((se = Dx(Z, { stallMs: fe, ...(Ae !== void 0 && { tailFloorMs: Ae }), signal: s.signal })),
        (Q = se.body));
    else ((Q = Z), (re = Math.max(Mx(Z.length, fe), Ae ?? 0)));
    if (!kV(j, "content-type") && !ce)
      j["Content-Type"] = typeof y === "string" ? "text/plain" : "application/json";
    j["Content-Length"] = String(Z.length);
  }
  let Se = s.streamUpload !== void 0 && y !== void 0 && q === 0 ? createUploadWireTransport() : void 0,
    ae = s.frameTunnel ? `https://${s.frameTunnel.host}` : baseUrlForRequest(apiHostUrl(s.host ?? "api"), s),
    ie;
  try {
    try {
      ie = await Dt.request({
        method: e,
        baseURL: ae,
        url: x,
        data: Q,
        timeout: se ? 0 : re,
        signal: se ? se.signal : s.signal,
        responseType: s.responseType,
        validateStatus: s.validateStatus,
        skipSessionsBearerReport: !0,
        maxContentLength: s.maxContentLength,
        maxBodyLength: s.maxBodyLength,
        ...(q !== void 0 && { maxRedirects: q }),
        ...(q !== 0 && {
          beforeRedirect: (Z) => {
            if (!sameOrigin(urlFromRequestOptions(Z), ae))
              throw Error("first-party request redirected to another origin");
          },
        }),
        ...(Se && { transport: Se.transport }),
        ...(G && { adapter: G }),
        ...(s.freshConnection &&
          !s.frameTunnel && {
            httpsAgent: createOneOffHttpsAgent(),
            httpAgent: new Agent_3({ keepAlive: !1 }),
          }),
        ...(s.noEnvProxy && { proxy: !1 }),
        ...(s.frameTunnel && { httpsAgent: s.frameTunnel.agent, proxy: !1 }),
        headers: j,
      });
    } catch (error) {
      throw se ? uploadStallError(error, se) : error;
    } finally {
      if (se) (se.dispose(), s.streamUpload?.onSettled?.({ ...se.seen(), ...Se?.seen(!0) }));
      else if (s.streamUpload && Buffer.isBuffer(Q))
        s.streamUpload.onSettled?.({
          body_bytes: Q.length,
          bytes_handed: Q.length,
          stalled: !1,
          ...Se?.seen(!1),
        });
    }
  } catch (error) {
    if (
      (h || s.isBackground) &&
      L &&
      P !== null &&
      Dt.isAxiosError(error) &&
      error.response?.status === 401 &&
      !s.isRouteOwned401?.(error.response.data)
    )
      recoverHostSessionsBearer(
        ud(P, error.config, L),
        lacksAuthorizationHeader(error.config) ? "withheld" : "refused",
      ).catch(() => {});
    if (
      P !== null &&
      !h &&
      !s.isBackground &&
      Dt.isAxiosError(error) &&
      error.response?.status === 401 &&
      !s.isRouteOwned401?.(error.response.data)
    ) {
      let ce = ud(P, error.config, L),
        fe = F
          ? await recoverConsoleProfileAuth(ce)
          : await recoverAuthFailure(ce, s, L, lacksAuthorizationHeader(error.config));
      if (fe === "retry") return (sd(error.response.data), apiRequest(e, n, y, s, !0));
      if (fe !== null) return (sd(error.response.data), fe);
    }
    throw error;
  }
  if ((h || s.isBackground) && L && P !== null && ie.status === 401 && !s.isRouteOwned401?.(ie.data))
    recoverHostSessionsBearer(
      ud(P, ie.config, L),
      lacksAuthorizationHeader(ie.config) ? "withheld" : "refused",
    ).catch(() => {});
  if (P !== null && ie.status === 401 && !h && !s.isBackground && !s.isRouteOwned401?.(ie.data)) {
    let Z = ud(P, ie.config, L),
      ce = F
        ? await recoverConsoleProfileAuth(Z)
        : await recoverAuthFailure(Z, s, L, lacksAuthorizationHeader(ie.config));
    if (ce === "retry") return (sd(ie.data), apiRequest(e, n, y, s, !0));
    if (ce !== null) return (sd(ie.data), ce);
  }
  return {
    ok: !0,
    data: ie.data,
    status: ie.status,
    response: ie,
    ...(s.reportSentAuth && { sentAuthFingerprint: ee }),
  };
}
//@ chunk-aepeg2w5.js:811894-812121 placement
async function refreshOAuthIfRequested(e) {
  if (!e.refreshOAuth) return;
  try {
    await checkAndRefreshOAuthTokenIfNeeded({ credentials: e.credentials, storageV5: e.storageV5 });
  } catch (error) {
    logForDebugging(
      `firstPartyApi: refreshOAuth failed (${error instanceof Error ? error.message : error}); proceeding with cached token`,
    );
  }
}
/**
 * 上传停滞时转换错误信息。
 */
//@ chunk-aepeg2w5.js:812121-812459 placement
function uploadStallError(e, n) {
  let seen = n.seen();
  if (!(Dt.isCancel(e) && seen.stalled)) return e;
  let reason = n.signal.reason,
    h = reason instanceof UploadStalledError ? `${Math.round(reason.waitedMs / 1000)}s` : "the allowance";
  return new AxiosError(
    seen.bytes_handed === seen.body_bytes
      ? `upload stalled: no answer within ${h} of the body being handed over`
      : `upload stalled: nothing moved for ${h}`,
    AxiosError.ECONNABORTED,
  );
}
/**
 * 把各种数据转为 Buffer。
 */
//@ chunk-aepeg2w5.js:812459-812761 placement
function toBuffer(e) {
  if (Buffer.isBuffer(e)) return e;
  if (wV(e)) return Buffer.from(e.buffer, e.byteOffset, e.byteLength);
  if (e instanceof ArrayBuffer) return Buffer.from(e);
  if (typeof e === "string") return Buffer.from(e);
  if (isPlainJsonBody(e)) return Buffer.from(jsonStringify(e));
  throw TypeError("streamUpload: unsupported request body type");
}
//@ chunk-aepeg2w5.js:812761-812916 placement
function isPlainJsonBody(e) {
  if (Array.isArray(e)) return !0;
  if (typeof e !== "object" || e === null) return !1;
  let prototypeOf = Object.getPrototypeOf(e);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
//@ chunk-aepeg2w5.js:812916-813008 placement
function kV(e, n) {
  let lower = n.toLowerCase();
  return Object.keys(e).some((s) => s.toLowerCase() === lower);
}
//@ chunk-aepeg2w5.js:813008-813052 placement
function wV(e) {
  return ArrayBuffer.isView(e);
}
//@ chunk-aepeg2w5.js:813052-813098 placement
function sd(e) {
  if (e instanceof Readable_2) e.destroy();
}
//@ chunk-aepeg2w5.js:813098-813182 placement
function ud(e, n, r) {
  if (!r) return e;
  return bearerOf(n?.headers?.get?.("Authorization")) ?? e;
}
//@ chunk-aepeg2w5.js:813182-813347 placement
async function recoverConsoleProfileAuth(e) {
  switch (await recoverConsoleProfileBearerOutcome(e)) {
    case "recovered":
      return "retry";
    case "needs_sign_in":
      return { ok: !1, reason: "no-auth", detail: cloudSessionsSignInRefusal() };
    case "transient":
      return null;
  }
}
/**
 * 认证失败后尝试恢复（刷新令牌）并决定是否重试。
 */
//@ chunk-aepeg2w5.js:813347-813735 placement
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
      return { ok: !1, reason: "no-auth", detail: h ? NO_CLAUDE_AI_LOGIN : REFRESH_TOKEN_INVALID_MESSAGE };
    return null;
  } catch (error) {
    if (!h) throw error;
    return (logError(error), null);
  }
}
/**
 * API 客户端（get/post/put/patch/delete）。
 */
//@ chunk-aepeg2w5.js:813735-813934 placement
var apiClient = {
  get(e, n) {
    return apiRequest("GET", e, void 0, n);
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
var URL_CONTROL_CHARS_RE = /[\u0000-\u0020\u007f]/,
  STRICT_URL_RE = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/\\?#]+)([^?#]*)(\?[^#]*)?(?:#[\s\S]*)?$/,
  DEFAULT_PORTS = { "ftp:": "21", "http:": "80", "https:": "443", "ws:": "80", "wss:": "443" };
/**
 * 严格解析 URL（拒绝控制字符与不一致的协议）。
 */
//@ chunk-aepeg2w5.js:814114-814687 placement
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
  let index = h.lastIndexOf("@"),
    R = h.slice(0, index + 1) + h.slice(index + 1).replace(/[A-Z]/g, (L) => L.toLowerCase()),
    P = `${r.username || r.password ? `${r.username}${r.password ? `:${r.password}` : ""}@` : ""}${r.host}`,
    F = DEFAULT_PORTS[r.protocol];
  if (R !== P && !(r.port === "" && F !== void 0 && R === `${P}:${F}`)) return null;
  if (r.pathname !== y && !(y === "" && r.pathname === "/")) return null;
  if (r.search !== (S === "?" ? "" : S)) return null;
  return r;
}
//@ chunk-aepeg2w5.js:814687-814852 placement
function normalizeServerUrl(e) {
  let n = parseStrictUrl(e);
  if (!n) return e.replace(/\/$/, "");
  return (
    (n.search = ""),
    (n.hash = ""),
    (n.pathname = n.pathname.replace(/\/$/, "") || "/"),
    n.toString().replace(/\/$/, "")
  );
}
/**
 * 去片段与尾斜杠（保留查询）。
 */
//@ chunk-aepeg2w5.js:814852-815068 placement
function normalizeMcpServerUrl(e) {
  let n = parseStrictUrl(e);
  if (!n) return e.includes("?") ? e : e.replace(/\/$/, "");
  if (((n.hash = ""), !n.search)) n.search = "";
  n.pathname = n.pathname.replace(/\/$/, "") || "/";
  let str = n.toString();
  return n.search ? str : str.replace(/\/$/, "");
}
//@ chunk-aepeg2w5.js:815068-815127 placement
var cO = ["commercial", "gsuite", "enterprise", "health"],
  fO = 20;
/**
 * 去掉 URL 的用户名/密码后交给 dO 处理。
 */
//@ chunk-aepeg2w5.js:815127-815229 placement = validateURL (0.823)
function stripUrlCredentials(url) {
  try {
    let n = new URL(url);
    return ((n.username = ""), (n.password = ""), normalizeServerUrl(n.toString()));
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:815229-815376 placement
function mcpDirectoryVisibility() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_directory_visibility", cO);
  return Array.isArray(e) && e.every((n) => typeof n === "string") ? e.filter((n) => n.length > 0) : cO;
}
/**
 * 分页获取 MCP 注册表服务器 URL。
 */
//@ chunk-aepeg2w5.js:815376-815786 placement
async function fetchRegistryServerUrls(e) {
  let n = new Set(),
    joined = e.join(","),
    s;
  for (let h = 0; h < fO; h++) {
    let uRLSearchParams = new URLSearchParams({ version: "latest", limit: "100", visibility: joined });
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
    if (((s = S.data.metadata?.nextCursor), !s)) break;
  }
  return n;
}
/**
 * 分页获取目录服务器 URL（BFF）。
 */
//@ chunk-aepeg2w5.js:815786-816202 placement
async function fetchDirectoryServerUrls(e) {
  let n = new Set(),
    joined = e.join(","),
    s;
  for (let h = 0; h < fO; h++) {
    let uRLSearchParams = new URLSearchParams({ limit: "500", visibility: joined });
    if (s) uRLSearchParams.set("cursor", s);
    let S = await apiClient.get(`/api/directory/servers?${uRLSearchParams}`, { auth: "none", timeout: 5000 });
    if (!S.ok) break;
    for (let w of S.data.servers ?? []) {
      if (w.type !== "remote") continue;
      let R = w.remote?.url;
      if (!R) continue;
      let x = stripUrlCredentials(R);
      if (x) n.add(x);
    }
    if (((s = S.data.next_cursor ?? void 0), !s)) break;
  }
  return n;
}
/**
 * 启动时按需预取官方 MCP URL。
 */
//@ chunk-aepeg2w5.js:816202-816376 placement
async function prefetchOfficialMcpUrls() {
  let e = ht();
  if (
    sessionHostKind() !== "none" &&
    !e.listableUrlLookedUp &&
    !env.CLAUDE_CODE_MCP_REGISTRY_FETCH_AT_STARTUP
  ) {
    e.officialUrlsFetchAwaitsLookup = !0;
    return;
  }
  await fetchOfficialMcpUrlsOnce();
}
/**
 * 共享一次官方 MCP URL 刷新。
 */
//@ chunk-aepeg2w5.js:816376-816542 placement
function fetchOfficialMcpUrlsOnce() {
  let e = ht();
  return (
    (e.officialUrlsFetchAwaitsLookup = !1),
    (e.officialUrlsFetch ??= refreshOfficialMcpUrls()
      .catch(logError)
      .finally(() => {
        e.officialUrlsFetch = void 0;
      })),
    e.officialUrlsFetch
  );
}
/**
 * 刷新官方 MCP 服务器 URL 集合（tengu_mcp_directory_bff）。
 */
//@ chunk-aepeg2w5.js:816542-817296 placement
async function refreshOfficialMcpUrls() {
  if (isEssentialTrafficOnly()) return;
  if (getStrictMcpConfig()) return;
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_directory_bff", !1),
    n = lit(e ? "bff" : "legacy"),
    r = mcpDirectoryVisibility();
  if (r.length === 0) {
    ((ht().officialUrls = new Set()),
      logFeatureOk("mcp_registry_fetch"),
      logEvent("tengu_mcp_registry_fetch", {
        source: n,
        success: !0,
        url_count: 0,
        duration_ms: 0,
        empty_visibility: !0,
      }));
    return;
  }
  let now = Date.now();
  try {
    let h = e ? await fetchDirectoryServerUrls(r) : await fetchRegistryServerUrls(r);
    ((ht().officialUrls = h),
      logForDebugging(`[mcp-registry] Loaded ${h.size} official MCP URLs (${e ? "bff" : "legacy"})`),
      logFeatureOk("mcp_registry_fetch"),
      logEvent("tengu_mcp_registry_fetch", {
        source: n,
        success: !0,
        url_count: h.size,
        duration_ms: Date.now() - now,
      }));
  } catch (error) {
    (logForDebugging(`Failed to fetch MCP registry: ${errorMessage(error)}`, { level: "error" }),
      logFeatureSad("mcp_registry_fetch", "fetch_failed"),
      logEvent("tengu_mcp_registry_fetch", {
        source: n,
        success: !1,
        url_count: 0,
        duration_ms: Date.now() - now,
      }));
  }
}
/**
 * URL 是否为官方 MCP 服务器。
 */
//@ chunk-aepeg2w5.js:817296-817603 placement
function isOfficialMcpUrl(e) {
  let n = ht();
  if (n.officialUrls !== void 0) return n.officialUrls.has(e);
  if (n.listableUrlLookedUp || n.urlsRegistryCannotList.has(e)) return !1;
  if (e.startsWith("https://") && !isFirstPartyAnthropicHost(e) && !isSameOriginAsCcr(e)) {
    if (((n.listableUrlLookedUp = !0), n.officialUrlsFetchAwaitsLookup)) fetchOfficialMcpUrlsOnce();
  } else n.urlsRegistryCannotList.add(e);
  return !1;
}
//@ chunk-aepeg2w5.js:817603-817674 placement
var Aro = "Claude Code iOS Simulator",
  Cro = "Claude Code Android Emulator";

export {
  apiClient,
  kgr,
  normalizeMcpServerUrl,
  hashCredential,
  hasApiClient,
  Aro,
  Cro,
  isOfficialMcpUrl,
  Agr,
  prefetchOfficialMcpUrls,
  fetchOfficialMcpUrlsOnce,
  getFrameHostOverride,
  Tgr,
  getClaudeAiAccessToken,
  zki,
  UPLOAD_TIMEOUT_MS,
};

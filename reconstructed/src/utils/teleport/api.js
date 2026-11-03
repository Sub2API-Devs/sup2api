/**
 * utils/teleport/api.ts
 *
 * Sessions API 客户端：列出/拉取/归档会话，发送事件、控制请求与历史，OAuth 头、重试与设备信任处理（/v1/code/sessions…）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teleport/api.ts
 * pieces: chunk-0qx6sn4e.js (1), chunk-3nztfxrw.js (1), chunk-aepeg2w5.js (80)
 * attribution: fingerprint 6, placement 76
 */
import { randomUUID } from "crypto";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { logForDebugging } from "../debug.js";
import {
  errorMessage,
  toError,
  isExpectedApiError,
  TeleportOperationError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { sleep } from "../sleep.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  string,
  _enum,
  array,
  looseObject,
  literal,
  record,
  unknown,
  M,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  KNOWN_WORKER_STATES,
  describeCloudSession,
  signClientEvent,
  ClientEventUploader,
  ClientEventUploadError,
  setTrustedDeviceProbe,
  getConsoleProfileBearerProvider,
  UPLOAD_CHUNK_BYTES,
} from "../telemetry/memorySummary.js";
import { isFirstPartyProvider } from "../model/providers.js";
import { computeContentHash } from "../commitAttribution.js";
import {
  ensureHostSessionsBearer,
  heldHostSessionsBearer,
  readHostSessionsBearer,
  isHostHandedSessionsBearer,
  recoverHostSessionsBearer,
} from "../hostSessionsBearer.js";
import {
  getClaudeAIOAuthTokens,
  checkAndRefreshOAuthTokenIfNeeded,
  hostSessionsBearerOffered,
  isWIFDispatchAuth,
  hasUsableClaudeAILogin,
  recoverCloudSessionsBearer,
  hasClaudeAISignInToken,
} from "../auth.js";
import { isOAuthTokenExpired, getOrganizationUUID } from "../../services/oauth/client.js";
import { parseGitHubRepository } from "../detectRepository.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { sanitizeSessionTitle } from "../stringUtils.js";
import { logError } from "../log.js";
import { getClientPlatform, claudeCodeUserAgent, withOAuth401Retry } from "../http.js";
import { cloudErrorMessage, safeTokenText } from "./cloudErrorMessage.js";
import { printableName } from "../printableName.js";
import { jsonStringify } from "../slowOperations.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import {
  SDKControlResponseMessageSchema,
  SDKControlCancelRequestMessageSchema,
} from "../../entrypoints/sdk/controlSchemas.js";
import { env, antEnv } from "../env.js";
import { getOAuthTokenFromFileDescriptor } from "../authFileDescriptor.js";
import { HostScoped } from "../hostScoped.js";
import { getWIFAuthType, getWIFAccountInfo } from "../wifProfile.js";
import { getRootSession } from "../../bootstrap/state.js";
import { lacksAuthorizationHeader } from "../../services/oauth/sessionsBearerHooks.js";
import { TRANSIENT_NETWORK_ERRNOS } from "../../services/mcp/mcpClientCapabilities.js";

//@ chunk-aepeg2w5.js:777841-778062 placement
/**
 * 按 payload.uuid 去重事件（就地），返回删除数。
 */
function dedupeEventsByUuid(e) {
  let n = new Set();
  let r = 0;
  for (let s = 0; s < e.length;) {
    let h = e[s];
    if (h.ephemeral || typeof h.payload.uuid !== "string") {
      s++;
      continue;
    }
    if (n.has(h.payload.uuid)) {
      e.splice(s, 1);
      r++;
      continue;
    }
    n.add(h.payload.uuid);
    s++;
  }
  return r;
}
//@ chunk-aepeg2w5.js:778461-778628 placement
/**
 * 构造成功的 control_response。
 */
function buildControlResponse(requestId, n, r, s = false) {
  return {
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
      response:
        r !== undefined && (n.behavior === "allow" || s)
          ? {
              ...n,
              tool_name: r,
            }
          : n,
    },
  };
}
//@ chunk-aepeg2w5.js:781069-781236 placement
/**
 * 响应中的会话对象。
 */
function extractSessionFromResponse(e) {
  if (e === null || typeof e !== "object") return;
  let n = e;
  let r = n.response_shape ?? n.session;
  if (r === null || typeof r !== "object" || typeof r.id !== "string") return;
  return r;
}
//@ chunk-aepeg2w5.js:781236-781349 fingerprint = fetchSession (0.343)
/**
 * Sessions API 的错误文案常量组（会话不存在、无效 id、会话过期）。
 */
var SESSION_NOT_FOUND_MESSAGE = "Session not found:";
var INVALID_SESSION_ID_MESSAGE = "invalid session ID";
var SESSION_EXPIRED_MESSAGE = "Session expired. Please run /login to sign in again.";
//@ chunk-aepeg2w5.js:782331-782400 placement = CCR_BYOC_BETA_HEADER (1)
var RETRY_DELAYS_MS = [2000, 4000, 8000, 16000];
var MAX_SESSION_API_RETRIES = RETRY_DELAYS_MS.length;
var CCR_BYOC_BETA = "ccr-byoc-2025-07-29";
//@ chunk-aepeg2w5.js:782400-782551 placement
function sessionsApiWire(e, n, r) {
  return e === "v1alpha2"
    ? {
        url: `${n}/v1/code/sessions`,
        headers: getOAuthRequestHeaders(r),
      }
    : {
        url: `${n}/v1/sessions`,
        headers: {
          ...getOAuthRequestHeaders(r),
          "anthropic-beta": CCR_BYOC_BETA,
        },
      };
}
//@ chunk-aepeg2w5.js:782551-782667 placement = isTransientNetworkError (1)
function isTransientNetworkError(error) {
  if (!axios_default.isAxiosError(error)) return false;
  if (!error.response) return true;
  if (error.response.status >= 500) return true;
  return false;
}
//@ chunk-aepeg2w5.js:782667-782704 placement
/**
 * 带指数退避的 GET（只对瞬时网络错误重试）。
 */
function axiosGetWithRetry(url, n) {
  return axiosGetWithRetry_2(url, () => n);
}
//@ chunk-aepeg2w5.js:782704-783021 fingerprint = axiosGetWithRetry (1)
async function axiosGetWithRetry_2(url, config) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_SESSION_API_RETRIES; attempt++)
    try {
      return await axios_default.get(url, await config());
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error)) throw error;
      if (attempt >= MAX_SESSION_API_RETRIES) {
        logForDebugging(`Teleport request failed after ${attempt + 1} attempts: ${errorMessage(error)}`);
        throw error;
      }
      let delay = RETRY_DELAYS_MS[attempt] ?? 2000;
      logForDebugging(
        `Teleport request failed (attempt ${attempt + 1}/${MAX_SESSION_API_RETRIES + 1}), retrying in ${delay}ms: ${errorMessage(error)}`,
      );
      await sleep(delay);
    }
  throw lastError;
}
//@ chunk-aepeg2w5.js:783021-783317 fingerprint = CodeSessionSchema (0.888)
var CodeSessionSchema = DoctorLazy(() =>
  u({
    id: string(),
    title: string(),
    description: string(),
    status: _enum(["idle", "working", "waiting", "completed", "archived", "cancelled", "rejected"]),
    repo: u({
      name: string(),
      owner: u({
        login: string(),
      }),
      default_branch: string().optional(),
    }).nullable(),
    turns: array(string()),
    created_at: string(),
    updated_at: string(),
    environment_kind: _enum(KNOWN_WORKER_STATES).optional(),
  }),
);
//@ chunk-aepeg2w5.js:783317-783407 placement
function sessionsApiBearerFingerprint() {
  if (!isFirstPartyProvider()) return;
  let e = sessionsApiAccessTokenNow(isConsoleProfileSessionsCredential());
  return e === undefined ? undefined : computeContentHash(e).slice(0, 24);
}
//@ chunk-aepeg2w5.js:783407-783613 placement
async function primeSessionsApiBearer({ refresh, credentials }) {
  if (!isFirstPartyProvider()) return;
  if (isConsoleProfileSessionsCredential()) {
    if (refresh) await sessionsApiAccessToken();
    return;
  }
  if ((refresh ? await ensureHostSessionsBearer() : heldHostSessionsBearer()) !== null) return;
  if (!refresh) {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    if (claudeAIOAuthTokens && isOAuthTokenExpired(claudeAIOAuthTokens.expiresAt)) return;
  }
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials,
  });
}
//@ chunk-aepeg2w5.js:783613-783654 fingerprint = prepareApiRequest (0.73)
var prepareApiRequest_2 = "Unable to get organization UUID";
//@ chunk-aepeg2w5.js:783654-783738 placement
class CloudSessionAccessError extends Error {
  constructor(message) {
    super(message);
    this.name = "CloudSessionAccessError";
  }
}
//@ chunk-aepeg2w5.js:783738-784178 placement = getMyAdminRequests (0.212)
/**
 * 取云会话调用所需的 {accessToken, orgUUID, profile}：仅第一方提供商；必要时刷新 OAuth。旧版名 getMyAdminRequests 不准确。
 */
async function prepareApiRequest(requestType, statuses = true) {
  if (!isFirstPartyProvider())
    throw new CloudSessionAccessError(
      "Cloud sessions are only available on the first-party Anthropic API provider.",
    );
  let r;
  let s = isConsoleProfileSessionsCredential();
  if (s)
    try {
      r = await resolveConsoleProfileBearer({
        credentials: requestType,
        signIn: false,
      });
    } catch (error) {
      if (error instanceof ConsoleProfileCloudSessionsError) throw new CloudSessionAccessError(error.message);
      throw error;
    }
  else {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials: requestType,
    });
    r = (statuses ? await ensureHostSessionsBearer() : null) ?? getClaudeAIOAuthTokens()?.accessToken;
  }
  if (r === undefined) throw new CloudSessionAccessError(cloudSessionsSignInRefusal());
  let h = await sessionsApiOrganizationUUID(s);
  if (!h) throw new CloudSessionAccessError(prepareApiRequest_2);
  return {
    accessToken: r,
    orgUUID: h,
    profile: s,
  };
}
//@ chunk-aepeg2w5.js:784178-784360 placement
function repoFromGitSource(e) {
  if (!e?.url) return null;
  let gitHubRepository = parseGitHubRepository(e.url);
  if (!gitHubRepository) return null;
  let [r, s] = gitHubRepository.split("/");
  if (!r || !s) return null;
  return {
    name: s,
    owner: {
      login: r,
    },
    default_branch: e.revision || undefined,
  };
}
//@ chunk-aepeg2w5.js:784360-785105 placement = fetchCodeSessionsFromSessionsAPI (0.443)
/**
 * GET /v1/code/sessions 列出云端会话（teleport_sessions_list）。
 */
async function fetchCodeSessionsFromSessionsAPI() {
  return withFeatureTelemetry("teleport_sessions_list", async () => {
    let { accessToken } = await prepareApiRequest();
    let url = `${getOauthConfig().BASE_API_URL}/v1/code/sessions`;
    try {
      let response = await axiosGetWithRetry(url, {
        headers: getOAuthRequestHeaders(accessToken),
      });
      if (response.status !== 200) throw Error(`Failed to fetch code sessions: HTTP ${response.status}`);
      return response.data.data.map((session) => {
        let repo = repoFromGitSource(
          session.config?.sources?.find((source) => source.type === "git_repository"),
        );
        return {
          id: session.id,
          title:
            (typeof session.title === "string" && sanitizeSessionTitle(session.title).replace(/\s+/g, " ")) ||
            "Untitled",
          description: "",
          status: session.status === "archived" ? "archived" : (session.worker_status ?? "idle"),
          repo,
          turns: [],
          created_at: session.created_at,
          updated_at: session.last_event_at,
          environment_kind: session.environment_kind,
        };
      });
    } catch (error) {
      let err = toError(error);
      if (isExpectedApiError(error))
        logForDebugging(`Failed to fetch code sessions: ${err.message}`, {
          level: "error",
        });
      else logError(err);
      throw error;
    }
  });
}
//@ chunk-aepeg2w5.js:785105-785257 placement = getOAuthHeaders (0.875)
function getOAuthHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-client-platform": getClientPlatform(),
  };
}
//@ chunk-aepeg2w5.js:785257-785308 placement = getGroveSettings (0.554)
/**
 * User-Agent + OAuth 认证头。旧版名 getGroveSettings 为错配。
 */
function getOAuthRequestHeaders(e) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    ...getOAuthHeaders(e),
  };
}
//@ chunk-aepeg2w5.js:785308-785404 placement
async function fetchSession(e, n, credentials) {
  let { session, serverNow } = await sendCloudSessionEvent(e, n, credentials);
  return describeCloudSession(session, {
    serverNow,
  });
}
//@ chunk-aepeg2w5.js:785404-786206 placement
/**
 * 发送云会话事件（仅第一方）。
 */
async function sendCloudSessionEvent(e, n, r) {
  if (!isFirstPartyProvider())
    throw new TeleportOperationError(
      "Cloud sessions are only available on the first-party Anthropic API provider.",
      "Cloud sessions are only available on the first-party Anthropic API provider.",
    );
  let { accessToken } = n ?? (await prepareApiRequest(r));
  let h = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}`;
  let y = await axios_default.get(h, {
    headers: getOAuthRequestHeaders(accessToken),
    timeout: 15000,
    validateStatus: (R) => R < 500,
  });
  if (y.status !== 200) {
    let { message, statusLine } = cloudErrorMessage(y, y.data?.error?.message);
    if (y.status === 404) {
      let P = `${SESSION_NOT_FOUND_MESSAGE} ${safeTokenText(e)}`;
      throw new TeleportOperationError(P, P);
    }
    if (y.status === 401) throw new TeleportOperationError(SESSION_EXPIRED_MESSAGE, SESSION_EXPIRED_MESSAGE);
    if (y.status === 400 && message?.startsWith(INVALID_SESSION_ID_MESSAGE))
      throw new TeleportOperationError(message, message);
    throw Error(message || `Failed to fetch session: ${statusLine}`);
  }
  let sessionFromResponse = extractSessionFromResponse(y.data);
  if (!sessionFromResponse) throw Error(`${SESSION_NOT_FOUND_MESSAGE} ${safeTokenText(e)}`);
  let timestamp = Date.parse(String(y.headers?.date ?? ""));
  return {
    session: sessionFromResponse,
    serverNow: Number.isFinite(timestamp) ? timestamp : undefined,
  };
}
//@ chunk-aepeg2w5.js:786206-786317 placement = getBranchFromSession (1)
function getBranchFromSession(session) {
  return session.session_context.outcomes?.find((outcome) => outcome.type === "git_repository")?.git_info
    ?.branches[0];
}
//@ chunk-aepeg2w5.js:786317-786377 placement
async function getSessionRequestHeaders(accessToken, profile) {
  return {
    ...getOAuthRequestHeaders(accessToken),
    ...(profile ? {} : await trustedDeviceHeaders()),
  };
}
//@ chunk-aepeg2w5.js:786377-786946 placement
async function resendAfterUntrustedDevice(e, n, r, s) {
  if (e.status !== 403) return e;
  let { isDeviceIdentityEnabled } = await import("./chunk-m288yvvf.js");
  if (!(await isDeviceIdentityEnabled().catch(() => false))) return e;
  let { readUntrustedDeviceRefusal, shouldCloudSessionEnroll, shouldRemoteControlEnroll } =
    await import("./chunk-g9dw262t.js");
  let untrustedDeviceRefusal = readUntrustedDeviceRefusal(e.data);
  if (untrustedDeviceRefusal === undefined) return e;
  let { clearTrustedDeviceTokenCache, logRefusalWithoutEnrollment, withUntrustedDeviceRecovery } =
    await import("./chunk-3kb57csj.js");
  if (
    !(s === "remote_control"
      ? shouldRemoteControlEnroll(untrustedDeviceRefusal)
      : shouldCloudSessionEnroll(untrustedDeviceRefusal))
  ) {
    logRefusalWithoutEnrollment("[teleport]", untrustedDeviceRefusal);
    clearTrustedDeviceTokenCache();
    return e;
  }
  return (
    (await withUntrustedDeviceRecovery(n, r, undefined).catch(() => {
      return;
    })) ?? e
  );
}
//@ chunk-aepeg2w5.js:786946-787659 placement
/**
 * 附加设备证明并签名事件。
 */
async function attachDeviceAttestation(e, n, r, accessToken, h) {
  if (
    r.device_attestation !== undefined ||
    typeof r.payload.uuid !== "string" ||
    (h.eventSigner === undefined && h.signerForBoundDevice === undefined)
  )
    return;
  let { classifyElevatedAuthError, classifyElevatedAuthSubReason } = await import("./chunk-g9dw262t.js");
  if (
    classifyElevatedAuthSubReason(e.data) !== "bound_unattested" &&
    classifyElevatedAuthError(e.data) !== "session_stale_relogin"
  )
    return;
  if (h.eventSigner !== undefined) {
    let x = await signClientEvent(h.eventSigner, n, r.payload);
    if (x.device_attestation !== undefined) return x;
  }
  if (h.signerForBoundDevice === undefined) return;
  let w = await fetchSession(n, {
    accessToken,
  }).then(
    (session) => session.bound_device_uuid,
    () => {
      return;
    },
  );
  if (w === undefined) return;
  let R = await signClientEvent(
    h.signerForBoundDevice(w).catch(() => {
      return;
    }),
    n,
    r.payload,
  );
  return R.device_attestation === undefined ? undefined : R;
}
//@ chunk-aepeg2w5.js:787659-787817 placement
/**
 * 可信设备令牌头 X-Trusted-Device-Token（设备身份功能开启时）。
 */
async function trustedDeviceHeaders() {
  let { getTrustedDeviceToken } = await import("./chunk-3kb57csj.js");
  let n = await getTrustedDeviceToken().catch(() => {
    return;
  });
  return n
    ? {
        "X-Trusted-Device-Token": n,
      }
    : {};
}
//@ chunk-aepeg2w5.js:787817-787956 placement
function parsePositiveInt(sequenceNum) {
  let n =
    typeof sequenceNum === "number"
      ? sequenceNum
      : typeof sequenceNum === "string" && /^\d+$/.test(sequenceNum)
        ? Number(sequenceNum)
        : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}
//@ chunk-aepeg2w5.js:787956-790321 placement
/**
 * 向远程会话发事件：POST <BASE_API_URL>/v1/code/sessions/<id>/events（OAuth Bearer + 组织头），403 未信任设备时尝试设备登记后重试；仅第一方。
 */
async function sendEventToRemoteSession_2(e, n, r, s = {}) {
  if (!isFirstPartyProvider())
    return {
      ok: false,
      reason: "Cloud sessions are only available on the first-party Anthropic API provider.",
      cause: "not_first_party",
    };
  try {
    let { accessToken, profile } = await prepareApiRequest();
    let S = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}/events`;
    let headers = await getSessionRequestHeaders(accessToken, profile);
    logForDebugging(`${r} Sending event to session ${e}`);
    let R = await signClientEvent(s.eventSigner, e, n);
    let x;
    let P = (headers) =>
      axios_default
        .post(
          S,
          {
            events: [R],
          },
          {
            headers,
            validateStatus: (Q) => Q < 500,
            timeout: 30000,
          },
        )
        .catch((error) => {
          x ??= {
            error,
          };
          throw error;
        });
    let F = await P(headers);
    let L = false;
    if (F.status === 403) {
      let { isDeviceIdentityEnabled } = await import("./chunk-m288yvvf.js");
      L = await isDeviceIdentityEnabled().catch(() => false);
      let Q = L ? await attachDeviceAttestation(F, e, R, accessToken, s) : undefined;
      if (Q !== undefined) {
        logForDebugging(`${r} Refused unsigned by a session bound to this machine; resending signed`);
        R = Q;
        F = await P(headers).catch((error) => {
          logForDebugging(`${r} Signed resend failed: ${errorMessage(error)}`);
          return F;
        });
      }
      F = await resendAfterUntrustedDevice(
        F,
        headers["X-Trusted-Device-Token"],
        async (re) => {
          let apiRequest = await prepareApiRequest();
          return P({
            ...getOAuthRequestHeaders(apiRequest.accessToken),
            ...(apiRequest.profile
              ? {}
              : {
                  "X-Trusted-Device-Token": re,
                }),
          });
        },
        "cloud_session",
      );
    }
    let G = F.status === 200 || F.status === 201;
    if (x !== undefined && !G) {
      logForDebugging(
        `${r} Not reporting HTTP ${F.status} (${printableName(String(jsonStringify(F.data)), 500)}) as the outcome: another POST of this event failed (5xx, timeout or network) and may have been stored`,
      );
      logEvent("tengu_remote_send_refusal_not_reported", {
        status: F.status,
        cause: fromEnumOpt(classifyRequestFailure(x.error)),
      });
      throw x.error;
    }
    if (G) {
      logForDebugging(`${r} Successfully sent event to session ${e}`);
      let results = F.data?.results;
      let positiveInt = parsePositiveInt(results?.[0]?.sequence_num);
      return {
        ok: true,
        ...(results?.[0]?.duplicate === true && {
          duplicate: true,
        }),
        ...(positiveInt !== undefined && {
          sequenceNum: positiveInt,
        }),
      };
    }
    logForDebugging(`${r} Failed with status ${F.status}: ${jsonStringify(F.data)}`);
    let j;
    if (L && F.status === 403) {
      let { classifyElevatedAuthSubReason } = await import("./chunk-g9dw262t.js");
      if (classifyElevatedAuthSubReason(F.data) === "bound_unattested") {
        let { loginEnrollmentOnThisComputer } = await import("./chunk-3kb57csj.js");
        j =
          loginEnrollmentOnThisComputer() === "enrolls"
            ? "this machine could not prove it is the computer the session is bound to, or a trusted device; run /login to enroll it"
            : "this machine could not prove it is the computer the session is bound to, or a trusted device";
      }
    }
    let message = F.data?.error?.message;
    return {
      ok: false,
      reason:
        j !== undefined
          ? `${j} (HTTP ${F.status})`
          : typeof message === "string"
            ? `${printableName(message, 300)} (HTTP ${F.status})`
            : `HTTP ${F.status}`,
      status: F.status,
      ...(j !== undefined && {
        advice: j,
      }),
    };
  } catch (error) {
    logForDebugging(`${r} Error: ${errorMessage(error)}`);
    if (error instanceof CloudSessionAccessError)
      return {
        ok: false,
        reason: error.message,
        advice: error.message,
      };
    let y = classifyRequestFailure(error);
    return {
      ok: false,
      reason: errorMessage(error),
      ...(y !== undefined && {
        cause: y,
      }),
    };
  }
}
//@ chunk-aepeg2w5.js:790321-790455 placement
function classifyRequestFailure(error) {
  if (!axios_default.isAxiosError(error)) return;
  if (error.response !== undefined) return "server";
  return error.code === "ECONNABORTED" ? "timeout" : "network";
}
//@ chunk-aepeg2w5.js:790455-790797 placement
async function sendEventToRemoteSession(e, content, r) {
  return sendEventToRemoteSession_2(
    e,
    {
      uuid: r?.uuid ?? randomUUID(),
      session_id: e,
      type: "user",
      parent_tool_use_id: null,
      message: {
        role: "user",
        content,
      },
      ...(r?.priority && {
        priority: r.priority,
      }),
      ...(r?.pastedContent && {
        pasted_content: r.pastedContent,
      }),
      ...(r?.inlinePastes && {
        inline_pastes: r.inlinePastes,
      }),
    },
    "[sendEventToRemoteSession]",
    {
      eventSigner: r?.eventSigner,
    },
  );
}
//@ chunk-aepeg2w5.js:790797-790920 placement
async function sendControlRequestToRemoteSession(e, renameSessionRequest, r) {
  return sendEventToRemoteSession_2(
    e,
    {
      uuid: randomUUID(),
      ...renameSessionRequest,
    },
    "[sendControlRequestToRemoteSession]",
    {
      eventSigner: r?.eventSigner,
    },
  );
}
//@ chunk-aepeg2w5.js:790920-791026 placement
async function sendControlResponseToRemoteSession(sessionId, requestId, r, s) {
  return sendEventToRemoteSession_2(
    sessionId,
    {
      uuid: randomUUID(),
      ...buildControlResponse(requestId, r),
    },
    "[sendControlResponseToRemoteSession]",
    s,
  );
}
//@ chunk-aepeg2w5.js:791026-791232 placement
async function sendBashCommandToRemoteSession(sessionId, n, r) {
  return sendEventToRemoteSession_2(
    sessionId,
    {
      uuid: r?.uuid ?? randomUUID(),
      session_id: sessionId,
      type: "bash_command",
      command: n.command,
      ...(n.cwd !== undefined && {
        cwd: n.cwd,
      }),
    },
    "[sendBashCommandToRemoteSession]",
    {
      eventSigner: r?.eventSigner,
    },
  );
}
//@ chunk-aepeg2w5.js:791232-791260 placement
var SESSION_EVENTS_BATCH_SIZE = 100;
var MAX_BATCH_BYTES = 10485760;
var MAX_CONSECUTIVE_FAILURES = 4;
//@ chunk-aepeg2w5.js:791260-793010 placement
/**
 * 把本地会话历史批量上传为远程会话事件（/v1/code/sessions/<id>/events，分批、限大小）。
 */
async function sendSessionHistoryEvents(infraSessionId, n, r) {
  if (!isFirstPartyProvider())
    return {
      ok: false,
      reason: "Cloud sessions are only available on the first-party Anthropic API provider.",
    };
  if (n.length === 0)
    return {
      ok: true,
      droppedEvents: 0,
    };
  let s = "[sendSessionHistoryEvents]";
  let h = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${infraSessionId}/events`;
  let y = 0;
  let S;
  let w = false;
  let R = new ClientEventUploader({
    maxBatchSize: SESSION_EVENTS_BATCH_SIZE,
    maxBatchBytes: MAX_BATCH_BYTES,
    maxQueueSize: Math.max(n.length, SESSION_EVENTS_BATCH_SIZE),
    baseDelayMs: 500,
    maxDelayMs: 8000,
    jitterMs: 250,
    maxConsecutiveFailures: MAX_CONSECUTIVE_FAILURES,
    onBatchDropped: () => {
      w = true;
      R.close();
    },
    send: async (x) => {
      let mapped = x.map((j) => ({
        payload: {
          ...j,
          historical: true,
        },
        historical: true,
      }));
      dedupeEventsByUuid(mapped);
      let F;
      try {
        let { accessToken, profile } = await prepareApiRequest(r);
        let headers = await getSessionRequestHeaders(accessToken, profile);
        let Q = (headers) =>
          axios_default.post(
            h,
            {
              events: mapped,
            },
            {
              headers,
              validateStatus: (se) => se < 500,
              timeout: 60000,
            },
          );
        F = await resendAfterUntrustedDevice(
          await Q(headers),
          headers["X-Trusted-Device-Token"],
          async (re) => {
            let apiRequest = await prepareApiRequest(r);
            return Q({
              ...getOAuthRequestHeaders(apiRequest.accessToken),
              ...(apiRequest.profile
                ? {}
                : {
                    "X-Trusted-Device-Token": re,
                  }),
            });
          },
          "remote_control",
        );
      } catch (error) {
        S = {
          reason: errorMessage(error),
        };
        throw error;
      }
      if (F.status === 200 || F.status === 201) return;
      let message = F.data?.error?.message;
      let G =
        typeof message === "string"
          ? `${printableName(message, 300)} (HTTP ${F.status})`
          : `HTTP ${F.status}`;
      if (F.status === 400 || F.status === 413 || F.status === 422) {
        logForDebugging(`${s} Dropping ${x.length} history event(s) the server refused: ${G}`, {
          level: "warn",
        });
        y += x.length;
        return;
      }
      S = {
        reason: G,
        status: F.status,
      };
      if (F.status === 429) {
        let j = Number(F.headers?.["retry-after"]);
        throw new ClientEventUploadError(G, Number.isFinite(j) ? j * 1000 : undefined);
      }
      throw Error("session history POST refused");
    },
  });
  try {
    await R.enqueue(n.slice());
    await R.flush();
  } finally {
    R.close();
  }
  if (w) {
    logForDebugging(`${s} Upload to ${infraSessionId} failed: ${S?.reason ?? "unknown"}`);
    return {
      ok: false,
      reason: S?.reason ?? "upload failed",
      ...(S?.status !== undefined && {
        status: S.status,
      }),
    };
  }
  logForDebugging(
    `${s} Wrote ${n.length - y} history events to session ${infraSessionId}${y > 0 ? ` (${y} refused)` : ""}`,
  );
  return {
    ok: true,
    droppedEvents: y,
  };
}
//@ chunk-aepeg2w5.js:793010-793525 placement = updateSessionTitle (0.66)
/**
 * 更新云会话标题（/v1/code/sessions/<id>）。
 */
async function updateSessionTitle(sessionId, title, signal) {
  try {
    let { accessToken, profile } = await prepareApiRequest();
    let url = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}`;
    logForDebugging(`[updateSessionTitle] Updating title for session ${sessionId}: "${title}"`);
    let response = await axios_default.put(
      url,
      {
        title,
      },
      {
        headers: await getSessionRequestHeaders(accessToken, profile),
        signal,
        validateStatus: (status) => status < 500,
      },
    );
    if (response.status === 200) {
      logForDebugging(`[updateSessionTitle] Successfully updated title for session ${sessionId}`);
      return true;
    }
    logForDebugging(
      `[updateSessionTitle] Failed with status ${response.status}: ${jsonStringify(response.data)}`,
    );
    return false;
  } catch (error) {
    logForDebugging(`[updateSessionTitle] Error: ${errorMessage(error)}`);
    return false;
  }
}
//@ chunk-aepeg2w5.js:793525-793865 placement
async function markSessionRead(sessionId, n) {
  try {
    let { accessToken } = await prepareApiRequest();
    let s = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}/mark_read`;
    let h = await axios_default.post(
      s,
      n
        ? {
            event_id: n,
          }
        : {},
      {
        headers: getOAuthRequestHeaders(accessToken),
        timeout: 1e4,
        validateStatus: (y) => y < 500,
      },
    );
    if (h.status !== 200)
      logForDebugging(`[markSessionRead] Failed with status ${h.status}: ${jsonStringify(h.data)}`);
  } catch (error) {
    logForDebugging(`[markSessionRead] Error: ${errorMessage(error)}`);
  }
}
//@ chunk-aepeg2w5.js:793865-794214 placement
/**
 * can_use_tool 控制请求的 zod schema（含工具名、输入、交互要求与匹配规则）。
 */
var CanUseToolRequestSchema = DoctorLazy(() =>
  looseObject({
    subtype: literal("can_use_tool"),
    tool_name: string(),
    input: record(string(), unknown()),
    tool_use_id: string(),
    requires_user_interaction: M().optional(),
    decision_reason_type: unknown().optional(),
    classifier_approvable: unknown().optional(),
    matched_ask_rule: unknown().optional(),
  }),
);
var canUseToolRequestEventSchema = DoctorLazy(() =>
  discriminatedUnion("type", [
    u({
      type: literal("control_request"),
      request_id: string(),
      request: CanUseToolRequestSchema(),
    }),
    SDKControlResponseMessageSchema(),
    SDKControlCancelRequestMessageSchema(),
  ]),
);
var MCP_QUESTION_GRACE_MS = 600000;
//@ chunk-aepeg2w5.js:794214-794324 placement
function getAccessTokenWithCcrFallback() {
  return (
    getClaudeAIOAuthTokens()?.accessToken ??
    (env.CLAUDE_CODE_REMOTE
      ? env.CLAUDE_CODE_OAUTH_TOKEN || getOAuthTokenFromFileDescriptor() || undefined
      : undefined)
  );
}
//@ chunk-aepeg2w5.js:794324-794401 placement
function deviceBridgeAccessToken(apiCreds) {
  return (
    (apiCreds.profile ? sessionsApiAccessTokenNow(true) : getAccessTokenWithCcrFallback()) ??
    (hostSessionsBearerOffered() ? undefined : apiCreds.accessToken)
  );
}
//@ chunk-aepeg2w5.js:794401-794445 placement
function sessionsApiAccessTokenWithCcrFallback(profile) {
  return profile
    ? sessionsApiAccessTokenNow(profile)
    : (readHostSessionsBearer() ?? getAccessTokenWithCcrFallback());
}
//@ chunk-aepeg2w5.js:794445-795880 placement = pollRemoteSessionEvents (0.527)
/**
 * 轮询远程会话事件（after_id 分页），用于 teleport 拉取日志。
 */
async function pollRemoteSessionEvents(sessionId, afterId, opts) {
  if (!isFirstPartyProvider())
    throw Error("Cloud sessions are only available on the first-party Anthropic API provider.");
  let s;
  let h = isConsoleProfileSessionsCredential();
  let y = null;
  if (h) s = await sessionsApiAccessToken(h);
  else {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials: opts.credentials,
    });
    y = await ensureHostSessionsBearer();
    s = y ?? getAccessTokenWithCcrFallback();
  }
  if (!s) throw Error("No access token for polling");
  let S = s;
  let eventsUrl = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}/events`;
  let MAX_EVENT_PAGES = 50;
  let x = [];
  let P = [];
  let cursor = afterId;
  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    let eventsResponse = await resendOnHeldBearer401(
      y,
      (Se) => {
        y = Se;
        return axiosGetWithRetry_2(eventsUrl, async () => {
          S = h
            ? bearerToSend(null, s)
            : bearerToSend(readHostSessionsBearer(), getAccessTokenWithCcrFallback());
          return {
            headers: await getSessionRequestHeaders(S, h),
            params: {
              sort_order: "asc",
              ...(cursor && {
                cursor,
              }),
            },
            timeout: 30000,
          };
        });
      },
      {
        waitForHost: true,
      },
    );
    if (eventsResponse.status !== 200)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to fetch session events: HTTP ${eventsResponse.status}`,
        "Failed to fetch session events",
      );
    let eventsData = eventsResponse.data;
    if (!eventsData?.data || !Array.isArray(eventsData.data)) throw Error("Invalid events response");
    for (let event of eventsData.data) {
      let sequenceNum = event?.sequence_num;
      if (sequenceNum !== undefined) cursor = String(sequenceNum);
      let payload = event?.payload;
      if (payload && typeof payload === "object" && "type" in payload) {
        let Z = canUseToolRequestEventSchema().safeParse(payload);
        if (Z.success) P.push(Z.data);
        else if ("session_id" in payload) x.push(payload);
      }
    }
    if (!eventsData.next_cursor) break;
  }
  if (opts.skipMetadata)
    return {
      newEvents: x,
      controlFrames: P,
      lastEventId: cursor,
    };
  let branch;
  let sessionStatus;
  let startupFailure;
  let pendingAction;
  let metadataFetchError;
  try {
    let sessionData = await fetchSession(sessionId, {
      accessToken: S,
    });
    branch = getBranchFromSession(sessionData);
    sessionStatus = sessionData.session_status;
    startupFailure = sessionData.startup_failure;
    pendingAction = sessionData.pending_action;
  } catch (e) {
    metadataFetchError = errorMessage(e);
    logForDebugging(`teleport: failed to fetch session ${sessionId} metadata: ${e}`, {
      level: "warn",
    });
  }
  return {
    newEvents: x,
    controlFrames: P,
    lastEventId: cursor,
    branch,
    sessionStatus,
    startupFailure,
    pendingAction,
    metadataFetchError,
  };
}
//@ chunk-aepeg2w5.js:795880-796493 placement = archiveRemoteSession (0.535)
/**
 * POST /v1/code/sessions/<id>/archive 归档云会话。
 */
async function archiveRemoteSession(sessionId, timeout = 1e4) {
  if (!isFirstPartyProvider()) {
    logForDebugging(`[archiveRemoteSession] ${sessionId} skipped: non-first-party provider`);
    return false;
  }
  let r = isConsoleProfileSessionsCredential();
  let s = r ? null : readHostSessionsBearer();
  let h = r ? sessionsApiAccessTokenNow(r) : getAccessTokenWithCcrFallback();
  if (!(s ?? h)) return false;
  let url = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}/archive`;
  try {
    let resp = await resendOnHeldBearer401(
      s,
      async (R) =>
        axios_default.post(
          url,
          {},
          {
            headers: await getSessionRequestHeaders(bearerToSend(R, h), r),
            timeout,
            validateStatus: (x) => x < 500,
          },
        ),
      {
        waitForHost: false,
      },
    );
    if (resp.status === 200 || resp.status === 409) {
      logForDebugging(`[archiveRemoteSession] archived ${sessionId}`);
      return true;
    }
    logForDebugging(`[archiveRemoteSession] ${sessionId} failed ${resp.status}: ${jsonStringify(resp.data)}`);
    return false;
  } catch (err) {
    logForDebugging(`[archiveRemoteSession] ${sessionId} failed: ${errorMessage(err)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-aepeg2w5.js:796493-796571 placement
var BEARER_FRESHNESS_MS = 30000;
var consoleProfileBearerByHost = new HostScoped(() => ({
  lastBearer: undefined,
  storedCredentialCheck: undefined,
}));
//@ chunk-aepeg2w5.js:796571-796657 placement
function isConsoleProfileSessionsCredential() {
  if (getWIFAuthType() !== "user_oauth" || !isWIFDispatchAuth()) return false;
  return consoleProfileOrganizationLabel() !== "not_ldr" || !hasUsableClaudeAILogin();
}
//@ chunk-aepeg2w5.js:796657-796664 placement
setTrustedDeviceProbe(isConsoleProfileSessionsCredential);
//@ chunk-aepeg2w5.js:796664-796723 placement
function consoleProfileOrganizationLabel() {
  return getConsoleProfileBearerProvider()?.organizationLabel() ?? "unknown";
}
//@ chunk-aepeg2w5.js:796723-796783 placement
function consoleProfileOrganizationUuid() {
  return getWIFAccountInfo()?.organizationUuid?.trim() || undefined;
}
//@ chunk-aepeg2w5.js:796783-796806 placement
function isConsoleProfileProviderReady() {
  return false;
}
//@ chunk-aepeg2w5.js:796806-797176 placement
/**
 * 是否有当前组织的最近凭据。
 */
function hasRecentBearerForOrg() {
  let e = consoleProfileOrganizationUuid();
  if (e === undefined) return false;
  let n = consoleProfileBearerByHost.of(getRootSession().host);
  if (n.lastBearer?.organizationUuid === e) return true;
  let now = Date.now();
  if (
    n.storedCredentialCheck === undefined ||
    n.storedCredentialCheck.organizationUuid !== e ||
    now - n.storedCredentialCheck.at > BEARER_FRESHNESS_MS
  )
    n.storedCredentialCheck = {
      at: now,
      organizationUuid: e,
      present: getConsoleProfileBearerProvider()?.hasStored(e) === true,
    };
  return n.storedCredentialCheck.present;
}
//@ chunk-aepeg2w5.js:797176-797232 placement
function consoleProfileCanStartCloudSessions() {
  return (
    isConsoleProfileSessionsCredential() &&
    consoleProfileOrganizationUuid() !== undefined &&
    (isConsoleProfileProviderReady() || hasRecentBearerForOrg())
  );
}
//@ chunk-aepeg2w5.js:797232-797533 placement
/**
 * 云会话登录提示文案：先运行 claude auth login 再重试。
 */
var LOGIN_REQUIRED_HINT = "Run `claude auth login` (or /login in a local session), then try again.";
var CREDENTIAL_PROVIDER_MISSING_TEXT =
  "This command can't use your Console sign-in for cloud sessions: the part of Claude Code that reads that sign-in isn't loaded in this process. That's a bug in Claude Code; please report it, with the command you ran.";
//@ chunk-aepeg2w5.js:797533-797567 placement
function consoleProfileCredentialProviderLoaded() {
  return getConsoleProfileBearerProvider() !== null;
}
//@ chunk-aepeg2w5.js:797567-797903 placement
function cloudSessionsSignInRefusal() {
  if (isConsoleProfileSessionsCredential()) {
    if (!consoleProfileCredentialProviderLoaded()) return CREDENTIAL_PROVIDER_MISSING_TEXT;
    if (consoleProfileOrganizationLabel() === "unknown")
      return "Your organization's policy hasn't been read yet, so a cloud session can't start. Try again in a moment.";
    return `Cloud sessions aren't available with this Console sign-in. They need a claude.ai sign-in. ${LOGIN_REQUIRED_HINT}`;
  }
  return `Cloud sessions need a claude.ai sign-in. ${LOGIN_REQUIRED_HINT}`;
}
//@ chunk-aepeg2w5.js:797903-797997 placement
class ConsoleProfileCloudSessionsError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConsoleProfileCloudSessionsError";
  }
}
//@ chunk-aepeg2w5.js:797997-798660 placement
async function resolveConsoleProfileBearer({ credentials, signIn, onBrowserOpening }) {
  let s = consoleProfileOrganizationUuid();
  if (s === undefined)
    throw new ConsoleProfileCloudSessionsError(
      "Your Console sign-in doesn't record an organization, so a cloud session can't be started. Sign in again with /login or `ant auth login`.",
    );
  let consoleProfileCredential = await fetchConsoleProfileCredential({
    organizationUuid: s,
    credentials,
  });
  if (consoleProfileCredential.ok)
    return rememberConsoleProfileBearer(consoleProfileCredential.accessToken, s);
  if (consoleProfileCredential.reason === "refresh_failed")
    throw new ConsoleProfileCloudSessionsError(
      `Your cloud-sessions sign-in could not be renewed (${consoleProfileCredential.detail ?? "unknown cause"}). Try again.`,
    );
  forgetConsoleProfileCloudSessionsBearer();
  if (!signIn || !isConsoleProfileProviderReady())
    throw new ConsoleProfileCloudSessionsError(cloudSessionsSignInRefusal());
  let consoleProfileBearerProvider = getConsoleProfileBearerProvider();
  let S = consoleProfileBearerProvider
    ? await consoleProfileBearerProvider.signIn({
        organizationUuid: s,
        onBrowserOpening,
      })
    : {
        ok: false,
        message: cloudSessionsSignInRefusal(),
      };
  if (!S.ok) throw new ConsoleProfileCloudSessionsError(S.message);
  return rememberConsoleProfileBearer(S.accessToken, s);
}
//@ chunk-aepeg2w5.js:798660-798757 placement
function fetchConsoleProfileCredential(e) {
  let consoleProfileBearerProvider = getConsoleProfileBearerProvider();
  return consoleProfileBearerProvider
    ? consoleProfileBearerProvider.getValid(e)
    : Promise.resolve({
        ok: false,
        reason: "needs_sign_in",
      });
}
//@ chunk-aepeg2w5.js:798757-798845 placement
async function ensureConsoleProfileCloudSessionsCredential(credentials, onBrowserOpening) {
  if (isConsoleProfileSessionsCredential())
    await resolveConsoleProfileBearer({
      credentials,
      signIn: true,
      onBrowserOpening,
    });
}
//@ chunk-aepeg2w5.js:798845-798933 placement
function rememberConsoleProfileBearer(accessToken, organizationUuid) {
  consoleProfileBearerByHost.of(getRootSession().host).lastBearer = {
    accessToken,
    organizationUuid,
  };
  return accessToken;
}
//@ chunk-aepeg2w5.js:798933-799021 placement
function forgetConsoleProfileCloudSessionsBearer() {
  let e = consoleProfileBearerByHost.of(getRootSession().host);
  e.lastBearer = undefined;
  e.storedCredentialCheck = undefined;
}
//@ chunk-aepeg2w5.js:799021-799313 placement
async function recoverConsoleProfileBearerOutcome(e) {
  let n = consoleProfileOrganizationUuid();
  if (n === undefined) return "needs_sign_in";
  let consoleProfileCredential = await fetchConsoleProfileCredential({
    organizationUuid: n,
    refusedAccessToken: e,
  });
  if (!consoleProfileCredential.ok) {
    if (consoleProfileCredential.reason === "needs_sign_in") {
      forgetConsoleProfileCloudSessionsBearer();
      return "needs_sign_in";
    }
    return "transient";
  }
  if (consoleProfileCredential.accessToken === e) return "transient";
  rememberConsoleProfileBearer(consoleProfileCredential.accessToken, n);
  return "recovered";
}
//@ chunk-aepeg2w5.js:799313-799368 placement
async function isBearerRecovered(e) {
  return (await recoverConsoleProfileBearerOutcome(e)) === "recovered";
}
//@ chunk-aepeg2w5.js:799368-799537 placement
function sessionsApiAccessTokenNow(e) {
  if (e) {
    let lastBearer = consoleProfileBearerByHost.of(getRootSession().host).lastBearer;
    let r = consoleProfileOrganizationUuid();
    return lastBearer !== undefined && r !== undefined && lastBearer.organizationUuid === r
      ? lastBearer.accessToken
      : undefined;
  }
  return readHostSessionsBearer() ?? getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-aepeg2w5.js:799537-799599 placement
async function accountApiAccessToken(e = isConsoleProfileSessionsCredential()) {
  return e ? sessionsApiAccessToken(true) : getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-aepeg2w5.js:799599-799816 placement
async function sessionsApiAccessToken(e = isConsoleProfileSessionsCredential()) {
  if (e) {
    let n = consoleProfileOrganizationUuid();
    if (n === undefined) return;
    let consoleProfileCredential = await fetchConsoleProfileCredential({
      organizationUuid: n,
    });
    if (consoleProfileCredential.ok)
      return rememberConsoleProfileBearer(consoleProfileCredential.accessToken, n);
    if (consoleProfileCredential.reason === "needs_sign_in") forgetConsoleProfileCloudSessionsBearer();
    return;
  }
  return (await ensureHostSessionsBearer()) ?? getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-aepeg2w5.js:799816-799879 placement
async function sessionsApiOrganizationUUID(e = isConsoleProfileSessionsCredential()) {
  if (e) return consoleProfileOrganizationUuid() ?? null;
  return getOrganizationUUID();
}
//@ chunk-aepeg2w5.js:799879-799937 placement
function recoverSessionsApiBearer(e, n, r, profile) {
  if (profile) return isBearerRecovered(e);
  return recoverCloudSessionsBearer(e, n, r);
}
//@ chunk-aepeg2w5.js:799937-800530 placement
async function withSessionsApiBearer401Retry(e, n) {
  let r = n.profile ?? isConsoleProfileSessionsCredential();
  let fallbackToken =
    n.fallbackToken !== undefined &&
    !isHostHandedSessionsBearer(n.fallbackToken) &&
    (r || !hostSessionsBearerOffered())
      ? n.fallbackToken
      : undefined;
  let h = r ? sessionsApiAccessTokenNow(true) : ((await ensureHostSessionsBearer()) ?? undefined);
  if (!r && h === undefined)
    return withOAuth401Retry(() => e(requireBearer(sessionsApiAccessTokenNow(false) ?? fallbackToken)), n);
  try {
    return await e(requireBearer(h ?? fallbackToken));
  } catch (error) {
    if (
      h === undefined ||
      !axios_default.isAxiosError(error) ||
      error.response?.status !== 401 ||
      !(r
        ? await isBearerRecovered(h)
        : (await recoverHostSessionsBearer(
            h,
            lacksAuthorizationHeader(error.config) ? "withheld" : "refused",
          )) === "recovered" || hasClaudeAISignInToken())
    )
      throw error;
    let S = sessionsApiAccessTokenNow(r) ?? fallbackToken;
    if (S === undefined) throw error;
    try {
      return await e(S);
    } catch (error) {
      if (!r && axios_default.isAxiosError(error) && error.response?.status === 401)
        recoverHostSessionsBearer(S, lacksAuthorizationHeader(error.config) ? "withheld" : "refused").catch(
          () => {},
        );
      throw error;
    }
  }
}
//@ chunk-aepeg2w5.js:800530-800588 placement
function requireBearer(e) {
  if (e === undefined) throw new CloudSessionAccessError(cloudSessionsSignInRefusal());
  return e;
}
//@ chunk-aepeg2w5.js:800588-800712 placement
function bearerToSend(e, n) {
  let r = e ?? n;
  if (r === undefined) throw Error("No credential left to send a cloud-sessions request with");
  return r;
}
//@ chunk-aepeg2w5.js:800712-800948 placement
async function resendOnHeldBearer401(e, n, { waitForHost }) {
  let s;
  try {
    s = await n(e);
  } catch (error) {
    if (e === null || !axios_default.isAxiosError(error) || error.response?.status !== 401) throw error;
    return resolveSessionsAuth(e, n, waitForHost, lacksAuthorizationHeader(error.config));
  }
  if (e === null || s.status !== 401) return s;
  return resolveSessionsAuth(e, n, waitForHost, lacksAuthorizationHeader(s.config));
}
//@ chunk-aepeg2w5.js:800948-801310 placement
/**
 * 解析会话 API 的认证。
 */
async function resolveSessionsAuth(e, n, waitForHost, s) {
  let h = recoverHostSessionsBearer(e, s ? "withheld" : "refused");
  let y;
  if (waitForHost) {
    await h;
    y = await ensureHostSessionsBearer();
  } else {
    h.catch(() => {});
    y = heldHostSessionsBearer();
  }
  let S;
  try {
    S = await n(y);
  } catch (error) {
    if (y !== null && axios_default.isAxiosError(error) && error.response?.status === 401)
      recoverHostSessionsBearer(y, lacksAuthorizationHeader(error.config) ? "withheld" : "refused").catch(
        () => {},
      );
    throw error;
  }
  if (y !== null && S.status === 401)
    recoverHostSessionsBearer(y, lacksAuthorizationHeader(S.config) ? "withheld" : "refused").catch(() => {});
  return S;
}
//@ chunk-aepeg2w5.js:801310-801387 placement
class WarnOnceSlot {
  warned = false;
  claim() {
    if (this.warned) return false;
    this.warned = true;
    return true;
  }
}
//@ chunk-aepeg2w5.js:801387-801412 placement
var warnOnceSlotByHost = new HostScoped(() => new WarnOnceSlot());
//@ chunk-aepeg2w5.js:801412-801449 placement
function warnOnceSlot() {
  return warnOnceSlotByHost.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:801449-801471 placement
/**
 * 记忆 API 覆盖地址（外部构建恒 undefined）。
 */
function memoryApiOverride() {
  return;
}
//@ chunk-aepeg2w5.js:801471-801508 placement
/**
 * 是否配置了记忆 API 覆盖。
 */
function hasMemoryApiOverride() {
  return memoryApiOverride() !== undefined;
}
//@ chunk-aepeg2w5.js:801508-801718 placement
/**
 * 记忆 API 的主机与认证方式。
 */
function memoryApiTarget() {
  if (!hasMemoryApiOverride())
    return {
      host: "memory",
      auth: "async",
      refreshOAuth: true,
    };
  let CLAUDE_CODE_MEMORY_API_TOKEN = antEnv.CLAUDE_CODE_MEMORY_API_TOKEN;
  return {
    host: "memory",
    auth: "none",
    refreshOAuth: false,
    ...(CLAUDE_CODE_MEMORY_API_TOKEN && {
      headers: {
        Authorization: `Bearer ${CLAUDE_CODE_MEMORY_API_TOKEN}`,
      },
    }),
  };
}
//@ chunk-aepeg2w5.js:801761-801774 placement
var FLUSH_PROGRESS_SLACK_BYTES = 4 * UPLOAD_CHUNK_BYTES;
//@ chunk-aepeg2w5.js:801774-801932 placement
/**
 * 上传是否停滞（未开始响应且已刷出的字节明显不足）。
 */
function isStalledUpload(seen) {
  return (
    seen.response_started !== true &&
    seen.bytes_handed + UPLOAD_CHUNK_BYTES < seen.body_bytes &&
    seen.bytes_flushed !== undefined &&
    seen.bytes_flushed > 0 &&
    seen.bytes_flushed + FLUSH_PROGRESS_SLACK_BYTES < seen.body_bytes
  );
}
//@ chunk-0qx6sn4e.js:3581-3725 fingerprint = isTransientNetworkError (1)
function isTransientNetworkError_2(error) {
  if (!axios_default.isAxiosError(error)) return false;
  let status = error.response?.status;
  if (status !== undefined) return status >= 500 && status < 600;
  return error.code !== undefined && TRANSIENT_NETWORK_ERRNOS.has(error.code);
}
//@ chunk-3nztfxrw.js:5348-5466 fingerprint = getOAuthHeaders (1)
function getOAuthHeaders_2(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
}
export {
  isStalledUpload,
  sendEventToRemoteSession,
  sendBashCommandToRemoteSession,
  buildControlResponse,
  prepareApiRequest,
  getSessionRequestHeaders,
  getOAuthRequestHeaders,
  resendAfterUntrustedDevice,
  fetchCodeSessionsFromSessionsAPI,
  isTransientNetworkError_2,
  archiveRemoteSession,
  fetchSession,
  MCP_QUESTION_GRACE_MS,
  sendControlResponseToRemoteSession,
  pollRemoteSessionEvents,
  getOAuthHeaders_2,
  ensureConsoleProfileCloudSessionsCredential,
  sessionsApiAccessTokenNow,
  deviceBridgeAccessToken,
  recoverSessionsApiBearer,
  SESSION_EXPIRED_MESSAGE,
  markSessionRead,
  updateSessionTitle,
  isConsoleProfileSessionsCredential,
  sessionsApiAccessToken,
  cloudSessionsSignInRefusal,
  sessionsApiOrganizationUUID,
  trustedDeviceHeaders,
  getBranchFromSession,
  sendControlRequestToRemoteSession,
  getAccessTokenWithCcrFallback,
  resolveConsoleProfileBearer,
  ConsoleProfileCloudSessionsError,
  resendOnHeldBearer401,
  bearerToSend,
  CCR_BYOC_BETA,
  dedupeEventsByUuid,
  extractSessionFromResponse,
  consoleProfileCredentialProviderLoaded,
  consoleProfileOrganizationLabel,
  hasMemoryApiOverride,
  memoryApiTarget,
  memoryApiOverride,
  getOAuthHeaders,
  CloudSessionAccessError,
  recoverConsoleProfileBearerOutcome,
  sessionsApiWire,
  isTransientNetworkError,
  axiosGetWithRetry,
  consoleProfileCanStartCloudSessions,
  SESSION_NOT_FOUND_MESSAGE,
  INVALID_SESSION_ID_MESSAGE,
  forgetConsoleProfileCloudSessionsBearer,
  withSessionsApiBearer401Retry,
  sessionsApiAccessTokenWithCcrFallback,
  accountApiAccessToken,
  sendSessionHistoryEvents,
};

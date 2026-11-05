/**
 * utils/teleport/api.ts
 *
 * Sessions API 客户端：列出/拉取/归档会话，发送事件、控制请求与历史，OAuth 头、重试与设备信任处理（/v1/code/sessions…）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teleport/api.ts
 * pieces: chunk-06vyq63w.js (1), chunk-a3r2kq46.js (1), chunk-exfmq47h.js (81)
 * attribution: fingerprint 6, placement 76, facade-majority 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  objectSchema,
  stringSchema,
  _enum,
  array,
  looseObject,
  literal,
  record,
  unknown,
  booleanSchema,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  KNOWN_WORKER_STATES,
  describeCloudSession,
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
import {
  signClientEvent,
  ClientEventUploader,
  ClientEventUploadError,
} from "../telemetry/clientEventUploader.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:798601-798822 placement
/**
 * 按 payload.uuid 去重事件（就地），返回删除数。
 */
function dedupeEventsByUuid(events) {
  let seenUuids = new Set();
  let removedCount = 0;
  for (let index = 0; index < events.length;) {
    let event = events[index];
    if (event.ephemeral || typeof event.payload.uuid !== "string") {
      index++;
      continue;
    }
    if (seenUuids.has(event.payload.uuid)) {
      events.splice(index, 1);
      removedCount++;
      continue;
    }
    seenUuids.add(event.payload.uuid);
    index++;
  }
  return removedCount;
}
//@ chunk-exfmq47h.js:799221-799388 placement
/**
 * 构造成功的 control_response。
 */
function buildControlResponse(requestId, response, toolName, alwaysAttachToolName = false) {
  return {
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
      response:
        toolName !== undefined && (response.behavior === "allow" || alwaysAttachToolName)
          ? {
              ...response,
              tool_name: toolName,
            }
          : response,
    },
  };
}
//@ chunk-exfmq47h.js:801865-802032 placement
/**
 * 响应中的会话对象。
 */
function extractSessionFromResponse(payload) {
  if (payload === null || typeof payload !== "object") return;
  let body = payload;
  let session = body.response_shape ?? body.session;
  if (session === null || typeof session !== "object" || typeof session.id !== "string") return;
  return session;
}
//@ chunk-exfmq47h.js:802032-802145 fingerprint (2.1.88 match: fetchSession, 0.343)
/**
 * Sessions API 的错误文案常量组（会话不存在、无效 id、会话过期）。
 */
var SESSION_NOT_FOUND_MESSAGE = "Session not found:";
var INVALID_SESSION_ID_MESSAGE = "invalid session ID";
var SESSION_EXPIRED_MESSAGE = "Session expired. Please run /login to sign in again.";
//@ chunk-exfmq47h.js:803127-803196 placement (2.1.88 match: CCR_BYOC_BETA_HEADER, 1)
var RETRY_DELAYS_MS = [2000, 4000, 8000, 16000];
var MAX_SESSION_API_RETRIES = RETRY_DELAYS_MS.length;
var CCR_BYOC_BETA = "ccr-byoc-2025-07-29";
//@ chunk-exfmq47h.js:803196-803347 placement
function sessionsApiWire(apiVersion, baseUrl, credentials) {
  return apiVersion === "v1alpha2"
    ? {
        url: `${baseUrl}/v1/code/sessions`,
        headers: getOAuthRequestHeaders(credentials),
      }
    : {
        url: `${baseUrl}/v1/sessions`,
        headers: {
          ...getOAuthRequestHeaders(credentials),
          "anthropic-beta": CCR_BYOC_BETA,
        },
      };
}
//@ chunk-exfmq47h.js:803347-803463 placement (2.1.88 match: isTransientNetworkError, 1)
function isTransientNetworkError(error) {
  if (!axios_default.isAxiosError(error)) return false;
  if (!error.response) return true;
  if (error.response.status >= 500) return true;
  return false;
}
//@ chunk-exfmq47h.js:803463-803500 placement
/**
 * 带指数退避的 GET（只对瞬时网络错误重试）。
 */
function axiosGetWithRetry(url, options) {
  return axiosGetWithRetry_2(url, () => options);
}
//@ chunk-exfmq47h.js:803500-803817 fingerprint (2.1.88 match: axiosGetWithRetry, 1)
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
//@ chunk-exfmq47h.js:803817-804113 fingerprint (2.1.88 match: CodeSessionSchema, 0.888)
var CodeSessionSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:803817", () => {
  CodeSessionSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      title: stringSchema(),
      description: stringSchema(),
      status: _enum(["idle", "working", "waiting", "completed", "archived", "cancelled", "rejected"]),
      repo: objectSchema({
        name: stringSchema(),
        owner: objectSchema({
          login: stringSchema(),
        }),
        default_branch: stringSchema().optional(),
      }).nullable(),
      turns: array(stringSchema()),
      created_at: stringSchema(),
      updated_at: stringSchema(),
      environment_kind: _enum(KNOWN_WORKER_STATES).optional(),
    }),
  );
});
//@ chunk-exfmq47h.js:804113-804203 placement
function sessionsApiBearerFingerprint() {
  if (!isFirstPartyProvider()) return;
  let accessToken = sessionsApiAccessTokenNow(isConsoleProfileSessionsCredential());
  return accessToken === undefined ? undefined : computeContentHash(accessToken).slice(0, 24);
}
//@ chunk-exfmq47h.js:804203-804409 placement
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
//@ chunk-exfmq47h.js:804409-804450 fingerprint (2.1.88 match: prepareApiRequest, 0.73)
var prepareApiRequest_2 = "Unable to get organization UUID";
//@ chunk-exfmq47h.js:804450-804534 placement
class CloudSessionAccessError extends Error {
  constructor(message) {
    super(message);
    this.name = "CloudSessionAccessError";
  }
}
//@ chunk-exfmq47h.js:804534-804974 placement (2.1.88 match: getMyAdminRequests, 0.212)
/**
 * 取云会话调用所需的 {accessToken, orgUUID, profile}：仅第一方提供商；必要时刷新 OAuth。旧版名 getMyAdminRequests 不准确。
 */
async function prepareApiRequest(requestType, statuses = true) {
  if (!isFirstPartyProvider())
    throw new CloudSessionAccessError(
      "Cloud sessions are only available on the first-party Anthropic API provider.",
    );
  let accessToken;
  let isConsoleProfile = isConsoleProfileSessionsCredential();
  if (isConsoleProfile)
    try {
      accessToken = await resolveConsoleProfileBearer({
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
    accessToken =
      (statuses ? await ensureHostSessionsBearer() : null) ?? getClaudeAIOAuthTokens()?.accessToken;
  }
  if (accessToken === undefined) throw new CloudSessionAccessError(cloudSessionsSignInRefusal());
  let orgUUID = await sessionsApiOrganizationUUID(isConsoleProfile);
  if (!orgUUID) throw new CloudSessionAccessError(prepareApiRequest_2);
  return {
    accessToken,
    orgUUID,
    profile: isConsoleProfile,
  };
}
//@ chunk-exfmq47h.js:804974-805156 placement
function repoFromGitSource(gitSource) {
  if (!gitSource?.url) return null;
  let gitHubRepository = parseGitHubRepository(gitSource.url);
  if (!gitHubRepository) return null;
  let [owner, repoName] = gitHubRepository.split("/");
  if (!owner || !repoName) return null;
  return {
    name: repoName,
    owner: {
      login: owner,
    },
    default_branch: gitSource.revision || undefined,
  };
}
//@ chunk-exfmq47h.js:805156-805901 placement (2.1.88 match: fetchCodeSessionsFromSessionsAPI, 0.442)
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
//@ chunk-exfmq47h.js:805901-806053 placement (2.1.88 match: getOAuthHeaders, 0.875)
function getOAuthHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-client-platform": getClientPlatform(),
  };
}
//@ chunk-exfmq47h.js:806053-806104 placement (2.1.88 match: getGroveSettings, 0.554)
/**
 * User-Agent + OAuth 认证头。旧版名 getGroveSettings 为错配。
 */
function getOAuthRequestHeaders(credentials) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    ...getOAuthHeaders(credentials),
  };
}
//@ chunk-exfmq47h.js:806104-806201 placement
async function fetchSession(sessionId, request, credentials) {
  let { session, serverNow } = await fetchOwnedSession(sessionId, request, credentials);
  return describeCloudSession(session, {
    serverNow,
  });
}
//@ chunk-exfmq47h.js:806201-807004 placement
/**
 * 发送云会话事件（仅第一方）。
 */
async function fetchOwnedSession(sessionId, options, credentials) {
  if (!isFirstPartyProvider())
    throw new TeleportOperationError(
      "Cloud sessions are only available on the first-party Anthropic API provider.",
      "Cloud sessions are only available on the first-party Anthropic API provider.",
    );
  let { accessToken } = options ?? (await prepareApiRequest(credentials));
  let eventsUrl = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}`;
  let sessionResponse = await axios_default.get(eventsUrl, {
    headers: getOAuthRequestHeaders(accessToken),
    timeout: 15000,
    validateStatus: (eventList) => eventList < 500,
  });
  if (sessionResponse.status !== 200) {
    let { message, statusLine } = cloudErrorMessage(sessionResponse, sessionResponse.data?.error?.message);
    if (sessionResponse.status === 404) {
      let notFoundMessage = `${SESSION_NOT_FOUND_MESSAGE} ${safeTokenText(sessionId)}`;
      throw new TeleportOperationError(notFoundMessage, notFoundMessage);
    }
    if (sessionResponse.status === 401)
      throw new TeleportOperationError(SESSION_EXPIRED_MESSAGE, SESSION_EXPIRED_MESSAGE);
    if (sessionResponse.status === 400 && message?.startsWith(INVALID_SESSION_ID_MESSAGE))
      throw new TeleportOperationError(message, message);
    throw Error(message || `Failed to fetch session: ${statusLine}`);
  }
  let sessionFromResponse = extractSessionFromResponse(sessionResponse.data);
  if (!sessionFromResponse) throw Error(`${SESSION_NOT_FOUND_MESSAGE} ${safeTokenText(sessionId)}`);
  let timestamp = Date.parse(String(sessionResponse.headers?.date ?? ""));
  return {
    session: sessionFromResponse,
    serverNow: Number.isFinite(timestamp) ? timestamp : undefined,
  };
}
//@ chunk-exfmq47h.js:807004-807115 placement (2.1.88 match: getBranchFromSession, 1)
function getBranchFromSession(session) {
  return session.session_context.outcomes?.find((outcome) => outcome.type === "git_repository")?.git_info
    ?.branches[0];
}
//@ chunk-exfmq47h.js:807115-807175 placement
async function getSessionRequestHeaders(accessToken, profile) {
  return {
    ...getOAuthRequestHeaders(accessToken),
    ...(profile ? {} : await trustedDeviceHeaders()),
  };
}
//@ chunk-exfmq47h.js:807175-807744 placement
async function resendAfterUntrustedDevice(response, request, credentials, purpose) {
  if (response.status !== 403) return response;
  let { isDeviceIdentityEnabled } = await import("../../services/analytics/violinGates.js");
  if (!(await isDeviceIdentityEnabled().catch(() => false))) return response;
  let { readUntrustedDeviceRefusal, shouldCloudSessionEnroll, shouldRemoteControlEnroll } =
    await import("../../bridge/codeSessionApi.js");
  let untrustedDeviceRefusal = readUntrustedDeviceRefusal(response.data);
  if (untrustedDeviceRefusal === undefined) return response;
  let { clearTrustedDeviceTokenCache, logRefusalWithoutEnrollment, withUntrustedDeviceRecovery } =
    await import("../../bridge/trustedDevice.js");
  if (
    !(purpose === "remote_control"
      ? shouldRemoteControlEnroll(untrustedDeviceRefusal)
      : shouldCloudSessionEnroll(untrustedDeviceRefusal))
  ) {
    logRefusalWithoutEnrollment("[teleport]", untrustedDeviceRefusal);
    clearTrustedDeviceTokenCache();
    return response;
  }
  return (
    (await withUntrustedDeviceRecovery(request, credentials, undefined).catch(() => {
      return;
    })) ?? response
  );
}
//@ chunk-exfmq47h.js:807744-808457 placement
/**
 * 附加设备证明并签名事件。
 */
async function attachDeviceAttestation(response, event, credentials, accessToken, signerOptions) {
  if (
    credentials.device_attestation !== undefined ||
    typeof credentials.payload.uuid !== "string" ||
    (signerOptions.eventSigner === undefined && signerOptions.signerForBoundDevice === undefined)
  )
    return;
  let { classifyElevatedAuthError, classifyElevatedAuthSubReason } =
    await import("../../bridge/codeSessionApi.js");
  if (
    classifyElevatedAuthSubReason(response.data) !== "bound_unattested" &&
    classifyElevatedAuthError(response.data) !== "session_stale_relogin"
  )
    return;
  if (signerOptions.eventSigner !== undefined) {
    let refusal = await signClientEvent(signerOptions.eventSigner, event, credentials.payload);
    if (refusal.device_attestation !== undefined) return refusal;
  }
  if (signerOptions.signerForBoundDevice === undefined) return;
  let envelope = await fetchSession(event, {
    accessToken,
  }).then(
    (session) => session.bound_device_uuid,
    () => {
      return;
    },
  );
  if (envelope === undefined) return;
  let signed = await signClientEvent(
    signerOptions.signerForBoundDevice(envelope).catch(() => {
      return;
    }),
    event,
    credentials.payload,
  );
  return signed.device_attestation === undefined ? undefined : signed;
}
//@ chunk-exfmq47h.js:808457-808615 placement
/**
 * 可信设备令牌头 X-Trusted-Device-Token（设备身份功能开启时）。
 */
async function trustedDeviceHeaders() {
  let { getTrustedDeviceToken } = await import("../../bridge/trustedDevice.js");
  let deviceToken = await getTrustedDeviceToken().catch(() => {
    return;
  });
  return deviceToken
    ? {
        "X-Trusted-Device-Token": deviceToken,
      }
    : {};
}
//@ chunk-exfmq47h.js:808615-808754 placement
function parsePositiveInt(sequenceNum) {
  let sequenceNum_2 =
    typeof sequenceNum === "number"
      ? sequenceNum
      : typeof sequenceNum === "string" && /^\d+$/.test(sequenceNum)
        ? Number(sequenceNum)
        : NaN;
  return Number.isSafeInteger(sequenceNum_2) && sequenceNum_2 > 0 ? sequenceNum_2 : undefined;
}
//@ chunk-exfmq47h.js:808754-811119 placement
/**
 * 向远程会话发事件：POST <BASE_API_URL>/v1/code/sessions/<id>/events（OAuth Bearer + 组织头），403 未信任设备时尝试设备登记后重试；仅第一方。
 */
async function sendEventToRemoteSession_2(sessionId, event, credentials, signerOptions = {}) {
  if (!isFirstPartyProvider())
    return {
      ok: false,
      reason: "Cloud sessions are only available on the first-party Anthropic API provider.",
      cause: "not_first_party",
    };
  try {
    let { accessToken, profile } = await prepareApiRequest();
    let eventsUrl = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}/events`;
    let headers = await getSessionRequestHeaders(accessToken, profile);
    logForDebugging(`${credentials} Sending event to session ${sessionId}`);
    let signedEvent = await signClientEvent(signerOptions.eventSigner, sessionId, event);
    let firstRequestError;
    let postWithHeaders = (headers) =>
      axios_default
        .post(
          eventsUrl,
          {
            events: [signedEvent],
          },
          {
            headers,
            validateStatus: (status) => status < 500,
            timeout: 30000,
          },
        )
        .catch((error) => {
          firstRequestError ??= {
            error,
          };
          throw error;
        });
    let response = await postWithHeaders(headers);
    let deviceIdentityEnabled = false;
    if (response.status === 403) {
      let { isDeviceIdentityEnabled } = await import("../../services/analytics/violinGates.js");
      deviceIdentityEnabled = await isDeviceIdentityEnabled().catch(() => false);
      let attestation = deviceIdentityEnabled
        ? await attachDeviceAttestation(response, sessionId, signedEvent, accessToken, signerOptions)
        : undefined;
      if (attestation !== undefined) {
        logForDebugging(
          `${credentials} Refused unsigned by a session bound to this machine; resending signed`,
        );
        signedEvent = attestation;
        response = await postWithHeaders(headers).catch((error) => {
          logForDebugging(`${credentials} Signed resend failed: ${errorMessage(error)}`);
          return response;
        });
      }
      response = await resendAfterUntrustedDevice(
        response,
        headers["X-Trusted-Device-Token"],
        async (trustedToken) => {
          let apiRequest = await prepareApiRequest();
          return postWithHeaders({
            ...getOAuthRequestHeaders(apiRequest.accessToken),
            ...(apiRequest.profile
              ? {}
              : {
                  "X-Trusted-Device-Token": trustedToken,
                }),
          });
        },
        "cloud_session",
      );
    }
    let succeeded = response.status === 200 || response.status === 201;
    if (firstRequestError !== undefined && !succeeded) {
      logForDebugging(
        `${credentials} Not reporting HTTP ${response.status} (${printableName(String(jsonStringify(response.data)), 500)}) as the outcome: another POST of this event failed (5xx, timeout or network) and may have been stored`,
      );
      logEvent("tengu_remote_send_refusal_not_reported", {
        status: response.status,
        cause: fromEnumOpt(classifyRequestFailure(firstRequestError.error)),
      });
      throw firstRequestError.error;
    }
    if (succeeded) {
      logForDebugging(`${credentials} Successfully sent event to session ${sessionId}`);
      let results = response.data?.results;
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
    logForDebugging(`${credentials} Failed with status ${response.status}: ${jsonStringify(response.data)}`);
    let advice;
    if (deviceIdentityEnabled && response.status === 403) {
      let { classifyElevatedAuthSubReason } = await import("../../bridge/codeSessionApi.js");
      if (classifyElevatedAuthSubReason(response.data) === "bound_unattested") {
        let { loginEnrollmentOnThisComputer } = await import("../../bridge/trustedDevice.js");
        advice =
          loginEnrollmentOnThisComputer() === "enrolls"
            ? "this machine could not prove it is the computer the session is bound to, or a trusted device; run /login to enroll it"
            : "this machine could not prove it is the computer the session is bound to, or a trusted device";
      }
    }
    let message = response.data?.error?.message;
    return {
      ok: false,
      reason:
        advice !== undefined
          ? `${advice} (HTTP ${response.status})`
          : typeof message === "string"
            ? `${printableName(message, 300)} (HTTP ${response.status})`
            : `HTTP ${response.status}`,
      status: response.status,
      ...(advice !== undefined && {
        advice,
      }),
    };
  } catch (error) {
    logForDebugging(`${credentials} Error: ${errorMessage(error)}`);
    if (error instanceof CloudSessionAccessError)
      return {
        ok: false,
        reason: error.message,
        advice: error.message,
      };
    let cause = classifyRequestFailure(error);
    return {
      ok: false,
      reason: errorMessage(error),
      ...(cause !== undefined && {
        cause,
      }),
    };
  }
}
//@ chunk-exfmq47h.js:811119-811253 placement
function classifyRequestFailure(error) {
  if (!axios_default.isAxiosError(error)) return;
  if (error.response !== undefined) return "server";
  return error.code === "ECONNABORTED" ? "timeout" : "network";
}
//@ chunk-exfmq47h.js:811253-811663 placement
async function sendEventToRemoteSession(sessionId, content, options) {
  return sendEventToRemoteSession_2(
    sessionId,
    {
      uuid: options?.uuid ?? randomUUID(),
      session_id: sessionId,
      type: "user",
      parent_tool_use_id: null,
      message: {
        role: "user",
        content,
      },
      ...(options?.priority && {
        priority: options.priority,
      }),
      ...(options?.pastedContent && {
        pasted_content: options.pastedContent,
      }),
      ...(options?.inlinePastes && {
        inline_pastes: options.inlinePastes,
      }),
      ...(options?.fileAttachments?.length && {
        file_attachments: options.fileAttachments,
      }),
    },
    "[sendEventToRemoteSession]",
    {
      eventSigner: options?.eventSigner,
    },
  );
}
//@ chunk-exfmq47h.js:811663-811905 facade-majority
async function sendHandoffToRemoteSession(sessionId, content, handoff) {
  return sendEventToRemoteSession_2(
    sessionId,
    {
      uuid: handoff.uuid,
      session_id: sessionId,
      type: "user",
      parent_tool_use_id: null,
      message: {
        role: "user",
        content,
      },
      isSynthetic: true,
      client_composed: true,
      shouldQuery: false,
    },
    "[sendHandoffToRemoteSession]",
    {
      eventSigner: handoff.eventSigner,
    },
  );
}
//@ chunk-exfmq47h.js:811905-812028 placement
async function sendControlRequestToRemoteSession(sessionId, renameSessionRequest, options) {
  return sendEventToRemoteSession_2(
    sessionId,
    {
      uuid: randomUUID(),
      ...renameSessionRequest,
    },
    "[sendControlRequestToRemoteSession]",
    {
      eventSigner: options?.eventSigner,
    },
  );
}
//@ chunk-exfmq47h.js:812028-812134 placement
async function sendControlResponseToRemoteSession(sessionId, requestId, response, options) {
  return sendEventToRemoteSession_2(
    sessionId,
    {
      uuid: randomUUID(),
      ...buildControlResponse(requestId, response),
    },
    "[sendControlResponseToRemoteSession]",
    options,
  );
}
//@ chunk-exfmq47h.js:812134-812340 placement
async function sendBashCommandToRemoteSession(sessionId, command, options) {
  return sendEventToRemoteSession_2(
    sessionId,
    {
      uuid: options?.uuid ?? randomUUID(),
      session_id: sessionId,
      type: "bash_command",
      command: command.command,
      ...(command.cwd !== undefined && {
        cwd: command.cwd,
      }),
    },
    "[sendBashCommandToRemoteSession]",
    {
      eventSigner: options?.eventSigner,
    },
  );
}
//@ chunk-exfmq47h.js:812340-812368 placement
var SESSION_EVENTS_BATCH_SIZE = 100;
var MAX_BATCH_BYTES = 10485760;
var MAX_CONSECUTIVE_FAILURES = 4;
//@ chunk-exfmq47h.js:812368-814118 placement
/**
 * 把本地会话历史批量上传为远程会话事件（/v1/code/sessions/<id>/events，分批、限大小）。
 */
async function sendSessionHistoryEvents(infraSessionId, events, credentials) {
  if (!isFirstPartyProvider())
    return {
      ok: false,
      reason: "Cloud sessions are only available on the first-party Anthropic API provider.",
    };
  if (events.length === 0)
    return {
      ok: true,
      droppedEvents: 0,
    };
  let logLabel = "[sendSessionHistoryEvents]";
  let eventsUrl = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${infraSessionId}/events`;
  let uploadedCount = 0;
  let error;
  let gaveUp = false;
  let uploader = new ClientEventUploader({
    maxBatchSize: SESSION_EVENTS_BATCH_SIZE,
    maxBatchBytes: MAX_BATCH_BYTES,
    maxQueueSize: Math.max(events.length, SESSION_EVENTS_BATCH_SIZE),
    baseDelayMs: 500,
    maxDelayMs: 8000,
    jitterMs: 250,
    maxConsecutiveFailures: MAX_CONSECUTIVE_FAILURES,
    onBatchDropped: () => {
      gaveUp = true;
      uploader.close();
    },
    send: async (batch) => {
      let events = batch.map((event) => ({
        payload: {
          ...event,
          historical: true,
        },
        historical: true,
      }));
      dedupeEventsByUuid(events);
      let response;
      try {
        let { accessToken, profile } = await prepareApiRequest(credentials);
        let headers = await getSessionRequestHeaders(accessToken, profile);
        let postWithHeaders = (headers) =>
          axios_default.post(
            eventsUrl,
            {
              events,
            },
            {
              headers,
              validateStatus: (status) => status < 500,
              timeout: 60000,
            },
          );
        response = await resendAfterUntrustedDevice(
          await postWithHeaders(headers),
          headers["X-Trusted-Device-Token"],
          async (trustedToken) => {
            let apiRequest = await prepareApiRequest(credentials);
            return postWithHeaders({
              ...getOAuthRequestHeaders(apiRequest.accessToken),
              ...(apiRequest.profile
                ? {}
                : {
                    "X-Trusted-Device-Token": trustedToken,
                  }),
            });
          },
          "remote_control",
        );
      } catch (error_2) {
        error = {
          reason: errorMessage(error_2),
        };
        throw error_2;
      }
      if (response.status === 200 || response.status === 201) return;
      let message = response.data?.error?.message;
      let errorText =
        typeof message === "string"
          ? `${printableName(message, 300)} (HTTP ${response.status})`
          : `HTTP ${response.status}`;
      if (response.status === 400 || response.status === 413 || response.status === 422) {
        logForDebugging(
          `${logLabel} Dropping ${batch.length} history event(s) the server refused: ${errorText}`,
          {
            level: "warn",
          },
        );
        uploadedCount += batch.length;
        return;
      }
      error = {
        reason: errorText,
        status: response.status,
      };
      if (response.status === 429) {
        let retryAfterSeconds = Number(response.headers?.["retry-after"]);
        throw new ClientEventUploadError(
          errorText,
          Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : undefined,
        );
      }
      throw Error("session history POST refused");
    },
  });
  try {
    await uploader.enqueue(events.slice());
    await uploader.flush();
  } finally {
    uploader.close();
  }
  if (gaveUp) {
    logForDebugging(`${logLabel} Upload to ${infraSessionId} failed: ${error?.reason ?? "unknown"}`);
    return {
      ok: false,
      reason: error?.reason ?? "upload failed",
      ...(error?.status !== undefined && {
        status: error.status,
      }),
    };
  }
  logForDebugging(
    `${logLabel} Wrote ${events.length - uploadedCount} history events to session ${infraSessionId}${uploadedCount > 0 ? ` (${uploadedCount} refused)` : ""}`,
  );
  return {
    ok: true,
    droppedEvents: uploadedCount,
  };
}
//@ chunk-exfmq47h.js:814118-814633 placement (2.1.88 match: updateSessionTitle, 0.66)
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
//@ chunk-exfmq47h.js:814633-814973 placement
async function markSessionRead(sessionId, eventId) {
  try {
    let { accessToken } = await prepareApiRequest();
    let url = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}/mark_read`;
    let response = await axios_default.post(
      url,
      eventId
        ? {
            event_id: eventId,
          }
        : {},
      {
        headers: getOAuthRequestHeaders(accessToken),
        timeout: 1e4,
        validateStatus: (status) => status < 500,
      },
    );
    if (response.status !== 200)
      logForDebugging(
        `[markSessionRead] Failed with status ${response.status}: ${jsonStringify(response.data)}`,
      );
  } catch (error) {
    logForDebugging(`[markSessionRead] Error: ${errorMessage(error)}`);
  }
}
//@ chunk-exfmq47h.js:814973-815322 placement
/**
 * can_use_tool 控制请求的 zod schema（含工具名、输入、交互要求与匹配规则）。
 */
var CanUseToolRequestSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var canUseToolRequestEventSchema;
var MCP_QUESTION_GRACE_MS;
deferInit("chunk-exfmq47h.js:814973", () => {
  CanUseToolRequestSchema = DoctorLazy(() =>
    looseObject({
      subtype: literal("can_use_tool"),
      tool_name: stringSchema(),
      input: record(stringSchema(), unknown()),
      tool_use_id: stringSchema(),
      requires_user_interaction: booleanSchema().optional(),
      decision_reason_type: unknown().optional(),
      classifier_approvable: unknown().optional(),
      matched_ask_rule: unknown().optional(),
    }),
  );
  canUseToolRequestEventSchema = DoctorLazy(() =>
    discriminatedUnion("type", [
      objectSchema({
        type: literal("control_request"),
        request_id: stringSchema(),
        request: CanUseToolRequestSchema(),
      }),
      SDKControlResponseMessageSchema(),
      SDKControlCancelRequestMessageSchema(),
    ]),
  );
  MCP_QUESTION_GRACE_MS = 600000;
});
//@ chunk-exfmq47h.js:815322-815432 placement
function getAccessTokenWithCcrFallback() {
  return (
    getClaudeAIOAuthTokens()?.accessToken ??
    (env.CLAUDE_CODE_REMOTE
      ? env.CLAUDE_CODE_OAUTH_TOKEN || getOAuthTokenFromFileDescriptor() || undefined
      : undefined)
  );
}
//@ chunk-exfmq47h.js:815432-815509 placement
function deviceBridgeAccessToken(credentials) {
  return (
    (credentials.profile ? sessionsApiAccessTokenNow(true) : getAccessTokenWithCcrFallback()) ??
    (hostSessionsBearerOffered() ? undefined : credentials.accessToken)
  );
}
//@ chunk-exfmq47h.js:815509-815553 placement
function sessionsApiAccessTokenWithCcrFallback(profile) {
  return profile
    ? sessionsApiAccessTokenNow(profile)
    : (readHostSessionsBearer() ?? getAccessTokenWithCcrFallback());
}
//@ chunk-exfmq47h.js:815553-816991 placement (2.1.88 match: pollRemoteSessionEvents, 0.528)
/**
 * 轮询远程会话事件（after_id 分页），用于 teleport 拉取日志。
 */
async function pollRemoteSessionEvents(sessionId, afterId, opts) {
  if (!isFirstPartyProvider())
    throw Error("Cloud sessions are only available on the first-party Anthropic API provider.");
  let accessToken;
  let isConsoleProfile = isConsoleProfileSessionsCredential();
  let hostBearer = null;
  if (isConsoleProfile) accessToken = await sessionsApiAccessToken(isConsoleProfile);
  else {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials: opts.credentials,
    });
    hostBearer = await ensureHostSessionsBearer();
    accessToken = hostBearer ?? getAccessTokenWithCcrFallback();
  }
  if (!accessToken) throw Error("No access token for polling");
  let currentToken = accessToken;
  let eventsUrl = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}/events`;
  let MAX_EVENT_PAGES = 50;
  let newEvents = [];
  let controlFrames = [];
  let cursor = afterId;
  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    let eventsResponse = await resendOnHeldBearer401(
      hostBearer,
      (heldToken) => {
        hostBearer = heldToken;
        return axiosGetWithRetry_2(eventsUrl, async () => {
          currentToken = isConsoleProfile
            ? bearerToSend(null, accessToken)
            : bearerToSend(readHostSessionsBearer(), getAccessTokenWithCcrFallback());
          return {
            headers: await getSessionRequestHeaders(currentToken, isConsoleProfile),
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
        let parsedEvent = canUseToolRequestEventSchema().safeParse(payload);
        if (parsedEvent.success) controlFrames.push(parsedEvent.data);
        else if ("session_id" in payload) newEvents.push(payload);
      }
    }
    if (!eventsData.next_cursor) break;
  }
  if (opts.skipMetadata)
    return {
      newEvents,
      controlFrames,
      lastEventId: cursor,
    };
  let branch;
  let sessionStatus;
  let startupFailure;
  let pendingAction;
  let metadataFetchError;
  try {
    let sessionData = await fetchSession(sessionId, {
      accessToken: currentToken,
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
    newEvents,
    controlFrames,
    lastEventId: cursor,
    branch,
    sessionStatus,
    startupFailure,
    pendingAction,
    metadataFetchError,
  };
}
//@ chunk-exfmq47h.js:816991-817604 placement (2.1.88 match: archiveRemoteSession, 0.534)
/**
 * POST /v1/code/sessions/<id>/archive 归档云会话。
 */
async function archiveRemoteSession(sessionId, timeout = 1e4) {
  if (!isFirstPartyProvider()) {
    logForDebugging(`[archiveRemoteSession] ${sessionId} skipped: non-first-party provider`);
    return false;
  }
  let isConsoleProfile = isConsoleProfileSessionsCredential();
  let hostBearer = isConsoleProfile ? null : readHostSessionsBearer();
  let fallbackToken = isConsoleProfile
    ? sessionsApiAccessTokenNow(isConsoleProfile)
    : getAccessTokenWithCcrFallback();
  if (!(hostBearer ?? fallbackToken)) return false;
  let url = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}/archive`;
  try {
    let resp = await resendOnHeldBearer401(
      hostBearer,
      async (bearerR) =>
        axios_default.post(
          url,
          {},
          {
            headers: await getSessionRequestHeaders(bearerToSend(bearerR, fallbackToken), isConsoleProfile),
            timeout,
            validateStatus: (status) => status < 500,
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
//@ chunk-exfmq47h.js:817604-817682 placement
var BEARER_FRESHNESS_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var consoleProfileBearerByHost;
deferInit("chunk-exfmq47h.js:817604", () => {
  BEARER_FRESHNESS_MS = 30000;
  consoleProfileBearerByHost = new HostScoped(() => ({
    lastBearer: undefined,
    storedCredentialCheck: undefined,
  }));
});
//@ chunk-exfmq47h.js:817682-817768 placement
function isConsoleProfileSessionsCredential() {
  if (getWIFAuthType() !== "user_oauth" || !isWIFDispatchAuth()) return false;
  return consoleProfileOrganizationLabel() !== "not_ldr" || !hasUsableClaudeAILogin();
}
//@ chunk-exfmq47h.js:817768-817775 placement
// deferred: uses setTrustedDeviceProbe (../telemetry/memorySummary.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:817768", () => {
  setTrustedDeviceProbe(isConsoleProfileSessionsCredential);
});
//@ chunk-exfmq47h.js:817775-817834 placement
function consoleProfileOrganizationLabel() {
  return getConsoleProfileBearerProvider()?.organizationLabel() ?? "unknown";
}
//@ chunk-exfmq47h.js:817834-817894 placement
function consoleProfileOrganizationUuid() {
  return getWIFAccountInfo()?.organizationUuid?.trim() || undefined;
}
//@ chunk-exfmq47h.js:817894-817917 placement
function isConsoleProfileProviderReady() {
  return false;
}
//@ chunk-exfmq47h.js:817917-818287 placement
/**
 * 是否有当前组织的最近凭据。
 */
function hasRecentBearerForOrg() {
  let organizationUuid = consoleProfileOrganizationUuid();
  if (organizationUuid === undefined) return false;
  let state = consoleProfileBearerByHost.of(getRootSession().host);
  if (state.lastBearer?.organizationUuid === organizationUuid) return true;
  let now = Date.now();
  if (
    state.storedCredentialCheck === undefined ||
    state.storedCredentialCheck.organizationUuid !== organizationUuid ||
    now - state.storedCredentialCheck.at > BEARER_FRESHNESS_MS
  )
    state.storedCredentialCheck = {
      at: now,
      organizationUuid,
      present: getConsoleProfileBearerProvider()?.hasStored(organizationUuid) === true,
    };
  return state.storedCredentialCheck.present;
}
//@ chunk-exfmq47h.js:818287-818343 placement
function consoleProfileCanStartCloudSessions() {
  return (
    isConsoleProfileSessionsCredential() &&
    consoleProfileOrganizationUuid() !== undefined &&
    (isConsoleProfileProviderReady() || hasRecentBearerForOrg())
  );
}
//@ chunk-exfmq47h.js:818343-818644 placement
/**
 * 云会话登录提示文案：先运行 claude auth login 再重试。
 */
var LOGIN_REQUIRED_HINT = "Run `claude auth login` (or /login in a local session), then try again.";
var CREDENTIAL_PROVIDER_MISSING_TEXT =
  "This command can't use your Console sign-in for cloud sessions: the part of Claude Code that reads that sign-in isn't loaded in this process. That's a bug in Claude Code; please report it, with the command you ran.";
//@ chunk-exfmq47h.js:818644-818678 placement
function consoleProfileCredentialProviderLoaded() {
  return getConsoleProfileBearerProvider() !== null;
}
//@ chunk-exfmq47h.js:818678-819014 placement
function cloudSessionsSignInRefusal() {
  if (isConsoleProfileSessionsCredential()) {
    if (!consoleProfileCredentialProviderLoaded()) return CREDENTIAL_PROVIDER_MISSING_TEXT;
    if (consoleProfileOrganizationLabel() === "unknown")
      return "Your organization's policy hasn't been read yet, so a cloud session can't start. Try again in a moment.";
    return `Cloud sessions aren't available with this Console sign-in. They need a claude.ai sign-in. ${LOGIN_REQUIRED_HINT}`;
  }
  return `Cloud sessions need a claude.ai sign-in. ${LOGIN_REQUIRED_HINT}`;
}
//@ chunk-exfmq47h.js:819014-819108 placement
class ConsoleProfileCloudSessionsError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConsoleProfileCloudSessionsError";
  }
}
//@ chunk-exfmq47h.js:819108-819771 placement
async function resolveConsoleProfileBearer({ credentials, signIn, onBrowserOpening }) {
  let organizationUuid = consoleProfileOrganizationUuid();
  if (organizationUuid === undefined)
    throw new ConsoleProfileCloudSessionsError(
      "Your Console sign-in doesn't record an organization, so a cloud session can't be started. Sign in again with /login or `ant auth login`.",
    );
  let consoleProfileCredential = await fetchConsoleProfileCredential({
    organizationUuid,
    credentials,
  });
  if (consoleProfileCredential.ok)
    return rememberConsoleProfileBearer(consoleProfileCredential.accessToken, organizationUuid);
  if (consoleProfileCredential.reason === "refresh_failed")
    throw new ConsoleProfileCloudSessionsError(
      `Your cloud-sessions sign-in could not be renewed (${consoleProfileCredential.detail ?? "unknown cause"}). Try again.`,
    );
  forgetConsoleProfileCloudSessionsBearer();
  if (!signIn || !isConsoleProfileProviderReady())
    throw new ConsoleProfileCloudSessionsError(cloudSessionsSignInRefusal());
  let consoleProfileBearerProvider = getConsoleProfileBearerProvider();
  let provider = consoleProfileBearerProvider
    ? await consoleProfileBearerProvider.signIn({
        organizationUuid,
        onBrowserOpening,
      })
    : {
        ok: false,
        message: cloudSessionsSignInRefusal(),
      };
  if (!provider.ok) throw new ConsoleProfileCloudSessionsError(provider.message);
  return rememberConsoleProfileBearer(provider.accessToken, organizationUuid);
}
//@ chunk-exfmq47h.js:819771-819868 placement
function fetchConsoleProfileCredential(options) {
  let consoleProfileBearerProvider = getConsoleProfileBearerProvider();
  return consoleProfileBearerProvider
    ? consoleProfileBearerProvider.getValid(options)
    : Promise.resolve({
        ok: false,
        reason: "needs_sign_in",
      });
}
//@ chunk-exfmq47h.js:819868-819956 placement
async function ensureConsoleProfileCloudSessionsCredential(credentials, onBrowserOpening) {
  if (isConsoleProfileSessionsCredential())
    await resolveConsoleProfileBearer({
      credentials,
      signIn: true,
      onBrowserOpening,
    });
}
//@ chunk-exfmq47h.js:819956-820044 placement
function rememberConsoleProfileBearer(accessToken, organizationUuid) {
  consoleProfileBearerByHost.of(getRootSession().host).lastBearer = {
    accessToken,
    organizationUuid,
  };
  return accessToken;
}
//@ chunk-exfmq47h.js:820044-820132 placement
function forgetConsoleProfileCloudSessionsBearer() {
  let state = consoleProfileBearerByHost.of(getRootSession().host);
  state.lastBearer = undefined;
  state.storedCredentialCheck = undefined;
}
//@ chunk-exfmq47h.js:820132-820424 placement
async function recoverConsoleProfileBearerOutcome(refusedToken) {
  let organizationUuid = consoleProfileOrganizationUuid();
  if (organizationUuid === undefined) return "needs_sign_in";
  let consoleProfileCredential = await fetchConsoleProfileCredential({
    organizationUuid,
    refusedAccessToken: refusedToken,
  });
  if (!consoleProfileCredential.ok) {
    if (consoleProfileCredential.reason === "needs_sign_in") {
      forgetConsoleProfileCloudSessionsBearer();
      return "needs_sign_in";
    }
    return "transient";
  }
  if (consoleProfileCredential.accessToken === refusedToken) return "transient";
  rememberConsoleProfileBearer(consoleProfileCredential.accessToken, organizationUuid);
  return "recovered";
}
//@ chunk-exfmq47h.js:820424-820479 placement
async function isBearerRecovered(refusedToken) {
  return (await recoverConsoleProfileBearerOutcome(refusedToken)) === "recovered";
}
//@ chunk-exfmq47h.js:820479-820648 placement
function sessionsApiAccessTokenNow(isConsoleProfile) {
  if (isConsoleProfile) {
    let lastBearer = consoleProfileBearerByHost.of(getRootSession().host).lastBearer;
    let organizationUuid = consoleProfileOrganizationUuid();
    return lastBearer !== undefined &&
      organizationUuid !== undefined &&
      lastBearer.organizationUuid === organizationUuid
      ? lastBearer.accessToken
      : undefined;
  }
  return readHostSessionsBearer() ?? getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-exfmq47h.js:820648-820710 placement
async function accountApiAccessToken(isConsoleProfile = isConsoleProfileSessionsCredential()) {
  return isConsoleProfile ? sessionsApiAccessToken(true) : getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-exfmq47h.js:820710-820927 placement
async function sessionsApiAccessToken(isConsoleProfile = isConsoleProfileSessionsCredential()) {
  if (isConsoleProfile) {
    let organizationUuid = consoleProfileOrganizationUuid();
    if (organizationUuid === undefined) return;
    let consoleProfileCredential = await fetchConsoleProfileCredential({
      organizationUuid,
    });
    if (consoleProfileCredential.ok)
      return rememberConsoleProfileBearer(consoleProfileCredential.accessToken, organizationUuid);
    if (consoleProfileCredential.reason === "needs_sign_in") forgetConsoleProfileCloudSessionsBearer();
    return;
  }
  return (await ensureHostSessionsBearer()) ?? getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-exfmq47h.js:820927-820990 placement
async function sessionsApiOrganizationUUID(isConsoleProfile = isConsoleProfileSessionsCredential()) {
  if (isConsoleProfile) return consoleProfileOrganizationUuid() ?? null;
  return getOrganizationUUID();
}
//@ chunk-exfmq47h.js:820990-821048 placement
function recoverSessionsApiBearer(token, mode, third, profile) {
  if (profile) return isBearerRecovered(token);
  return recoverCloudSessionsBearer(token, mode, third);
}
//@ chunk-exfmq47h.js:821048-821641 placement
async function withSessionsApiBearer401Retry(run, options) {
  let isConsoleProfile = options.profile ?? isConsoleProfileSessionsCredential();
  let fallbackToken =
    options.fallbackToken !== undefined &&
    !isHostHandedSessionsBearer(options.fallbackToken) &&
    (isConsoleProfile || !hostSessionsBearerOffered())
      ? options.fallbackToken
      : undefined;
  let token = isConsoleProfile
    ? sessionsApiAccessTokenNow(true)
    : ((await ensureHostSessionsBearer()) ?? undefined);
  if (!isConsoleProfile && token === undefined)
    return withOAuth401Retry(
      () => run(requireBearer(sessionsApiAccessTokenNow(false) ?? fallbackToken)),
      options,
    );
  try {
    return await run(requireBearer(token ?? fallbackToken));
  } catch (error) {
    if (
      token === undefined ||
      !axios_default.isAxiosError(error) ||
      error.response?.status !== 401 ||
      !(isConsoleProfile
        ? await isBearerRecovered(token)
        : (await recoverHostSessionsBearer(
            token,
            lacksAuthorizationHeader(error.config) ? "withheld" : "refused",
          )) === "recovered" || hasClaudeAISignInToken())
    )
      throw error;
    let nextToken = sessionsApiAccessTokenNow(isConsoleProfile) ?? fallbackToken;
    if (nextToken === undefined) throw error;
    try {
      return await run(nextToken);
    } catch (error) {
      if (!isConsoleProfile && axios_default.isAxiosError(error) && error.response?.status === 401)
        recoverHostSessionsBearer(
          nextToken,
          lacksAuthorizationHeader(error.config) ? "withheld" : "refused",
        ).catch(() => {});
      throw error;
    }
  }
}
//@ chunk-exfmq47h.js:821641-821699 placement
function requireBearer(token) {
  if (token === undefined) throw new CloudSessionAccessError(cloudSessionsSignInRefusal());
  return token;
}
//@ chunk-exfmq47h.js:821699-821823 placement
function bearerToSend(heldToken, fallbackToken) {
  let token = heldToken ?? fallbackToken;
  if (token === undefined) throw Error("No credential left to send a cloud-sessions request with");
  return token;
}
//@ chunk-exfmq47h.js:821823-822059 placement
async function resendOnHeldBearer401(heldToken, send, { waitForHost }) {
  let response;
  try {
    response = await send(heldToken);
  } catch (error) {
    if (heldToken === null || !axios_default.isAxiosError(error) || error.response?.status !== 401)
      throw error;
    return resolveSessionsAuth(heldToken, send, waitForHost, lacksAuthorizationHeader(error.config));
  }
  if (heldToken === null || response.status !== 401) return response;
  return resolveSessionsAuth(heldToken, send, waitForHost, lacksAuthorizationHeader(response.config));
}
//@ chunk-exfmq47h.js:822059-822421 placement
/**
 * 解析会话 API 的认证。
 */
async function resolveSessionsAuth(heldToken, send, waitForHost, withheld) {
  let recovery = recoverHostSessionsBearer(heldToken, withheld ? "withheld" : "refused");
  let token;
  if (waitForHost) {
    await recovery;
    token = await ensureHostSessionsBearer();
  } else {
    recovery.catch(() => {});
    token = heldHostSessionsBearer();
  }
  let response;
  try {
    response = await send(token);
  } catch (error) {
    if (token !== null && axios_default.isAxiosError(error) && error.response?.status === 401)
      recoverHostSessionsBearer(token, lacksAuthorizationHeader(error.config) ? "withheld" : "refused").catch(
        () => {},
      );
    throw error;
  }
  if (token !== null && response.status === 401)
    recoverHostSessionsBearer(
      token,
      lacksAuthorizationHeader(response.config) ? "withheld" : "refused",
    ).catch(() => {});
  return response;
}
//@ chunk-exfmq47h.js:822421-822498 placement
class WarnOnceSlot {
  warned = false;
  claim() {
    if (this.warned) return false;
    this.warned = true;
    return true;
  }
}
//@ chunk-exfmq47h.js:822498-822523 placement
var warnOnceSlotByHost; // deferred: uses WarnOnceSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:822498", () => {
  warnOnceSlotByHost = new HostScoped(() => new WarnOnceSlot());
});
//@ chunk-exfmq47h.js:822523-822560 placement
function warnOnceSlot() {
  return warnOnceSlotByHost.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:822560-822582 placement
/**
 * 记忆 API 覆盖地址（外部构建恒 undefined）。
 */
function memoryApiOverride() {
  return;
}
//@ chunk-exfmq47h.js:822582-822619 placement
/**
 * 是否配置了记忆 API 覆盖。
 */
function hasMemoryApiOverride() {
  return memoryApiOverride() !== undefined;
}
//@ chunk-exfmq47h.js:822619-822829 placement
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
//@ chunk-exfmq47h.js:822872-822885 placement
var FLUSH_PROGRESS_SLACK_BYTES = 4 * UPLOAD_CHUNK_BYTES;
//@ chunk-exfmq47h.js:822885-823043 placement
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
//@ chunk-06vyq63w.js:3259-3403 fingerprint (2.1.88 match: isTransientNetworkError, 1)
function isTransientNetworkError_2(error) {
  if (!axios_default.isAxiosError(error)) return false;
  let status = error.response?.status;
  if (status !== undefined) return status >= 500 && status < 600;
  return error.code !== undefined && TRANSIENT_NETWORK_ERRNOS.has(error.code);
}
//@ chunk-a3r2kq46.js:5348-5466 fingerprint (2.1.88 match: getOAuthHeaders, 1)
function getOAuthHeaders_2(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
}
export {
  isTransientNetworkError_2,
  fetchSession,
  sendEventToRemoteSession,
  ensureConsoleProfileCloudSessionsCredential,
  prepareApiRequest,
  sessionsApiAccessTokenNow,
  deviceBridgeAccessToken,
  recoverSessionsApiBearer,
  fetchCodeSessionsFromSessionsAPI,
  pollRemoteSessionEvents,
  isTransientNetworkError,
  isConsoleProfileSessionsCredential,
  sessionsApiAccessToken,
  cloudSessionsSignInRefusal,
  CloudSessionAccessError,
  isStalledUpload,
  getAccessTokenWithCcrFallback,
  trustedDeviceHeaders,
  getOAuthRequestHeaders,
  resendAfterUntrustedDevice,
  axiosGetWithRetry,
  consoleProfileCanStartCloudSessions,
  archiveRemoteSession,
  MCP_QUESTION_GRACE_MS,
  sendControlResponseToRemoteSession,
  sessionsApiWire,
  sessionsApiOrganizationUUID,
  getBranchFromSession,
  sendControlRequestToRemoteSession,
  resolveConsoleProfileBearer,
  ConsoleProfileCloudSessionsError,
  resendOnHeldBearer401,
  bearerToSend,
  CCR_BYOC_BETA,
  extractSessionFromResponse,
  accountApiAccessToken,
  fetchOwnedSession,
  consoleProfileCredentialProviderLoaded,
  consoleProfileOrganizationLabel,
  hasMemoryApiOverride,
  memoryApiTarget,
  memoryApiOverride,
  getOAuthHeaders_2,
  buildControlResponse,
  SESSION_EXPIRED_MESSAGE,
  markSessionRead,
  updateSessionTitle,
  sendSessionHistoryEvents,
  getOAuthHeaders,
  recoverConsoleProfileBearerOutcome,
  forgetConsoleProfileCloudSessionsBearer,
  sendHandoffToRemoteSession,
  sendBashCommandToRemoteSession,
  getSessionRequestHeaders,
  dedupeEventsByUuid,
  sessionsApiAccessTokenWithCcrFallback,
  SESSION_NOT_FOUND_MESSAGE,
  INVALID_SESSION_ID_MESSAGE,
  withSessionsApiBearer401Retry,
  primeSessionsApiBearer,
  sessionsApiBearerFingerprint,
};

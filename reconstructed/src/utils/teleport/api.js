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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
} from "crypto";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
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
import { u, o, U, A, kt, T, pe, oe, M, Ir } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  wg,
  describeCloudSession,
  signClientEvent,
  ClientEventUploader,
  q6e,
  Fx,
  $o,
  dBe,
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
import { cloudErrorMessage, vPt } from "./cloudErrorMessage.js";
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

/**
 * 按 payload.uuid 去重事件（就地），返回删除数。
 */
//@ chunk-aepeg2w5.js:777841-778062 placement
function dedupeEventsByUuid(e) {
  let n = new Set(),
    r = 0;
  for (let s = 0; s < e.length;) {
    let h = e[s];
    if (h.ephemeral || typeof h.payload.uuid !== "string") {
      s++;
      continue;
    }
    if (n.has(h.payload.uuid)) {
      (e.splice(s, 1), r++);
      continue;
    }
    (n.add(h.payload.uuid), s++);
  }
  return r;
}
/**
 * 构造成功的 control_response。
 */
//@ chunk-aepeg2w5.js:778461-778628 placement
function buildControlResponse(e, n, r, s = !1) {
  return {
    type: "control_response",
    response: {
      subtype: "success",
      request_id: e,
      response: r !== void 0 && (n.behavior === "allow" || s) ? { ...n, tool_name: r } : n,
    },
  };
}
/**
 * 响应中的会话对象。
 */
//@ chunk-aepeg2w5.js:781069-781236 placement
function extractSessionFromResponse(e) {
  if (e === null || typeof e !== "object") return;
  let n = e,
    r = n.response_shape ?? n.session;
  if (r === null || typeof r !== "object" || typeof r.id !== "string") return;
  return r;
}
//@ chunk-aepeg2w5.js:781236-781349 fingerprint = fetchSession (0.343)
var SESSION_NOT_FOUND_MESSAGE = "Session not found:",
  pro = "invalid session ID",
  ggr = "Session expired. Please run /login to sign in again.";
//@ chunk-aepeg2w5.js:782331-782400 placement = CCR_BYOC_BETA_HEADER (1)
var $x = [2000, 4000, 8000, 16000],
  xg = $x.length,
  CCR_BYOC_BETA = "ccr-byoc-2025-07-29";
//@ chunk-aepeg2w5.js:782400-782551 placement
function sessionsApiWire(e, n, r) {
  return e === "v1alpha2"
    ? { url: `${n}/v1/code/sessions`, headers: getOAuthRequestHeaders(r) }
    : { url: `${n}/v1/sessions`, headers: { ...getOAuthRequestHeaders(r), "anthropic-beta": CCR_BYOC_BETA } };
}
//@ chunk-aepeg2w5.js:782551-782667 placement = isTransientNetworkError (1)
function isTransientNetworkError(error) {
  if (!Dt.isAxiosError(error)) return !1;
  if (!error.response) return !0;
  if (error.response.status >= 500) return !0;
  return !1;
}
/**
 * 带指数退避的 GET（只对瞬时网络错误重试）。
 */
//@ chunk-aepeg2w5.js:782667-782704 placement
function axiosGetWithRetry(e, n) {
  return axiosGetWithRetry_2(e, () => n);
}
//@ chunk-aepeg2w5.js:782704-783021 fingerprint = axiosGetWithRetry (1)
async function axiosGetWithRetry_2(url, config) {
  let lastError;
  for (let attempt = 0; attempt <= xg; attempt++)
    try {
      return await Dt.get(url, await config());
    } catch (error) {
      if (((lastError = error), !isTransientNetworkError(error))) throw error;
      if (attempt >= xg)
        throw (
          logForDebugging(`Teleport request failed after ${attempt + 1} attempts: ${errorMessage(error)}`),
          error
        );
      let delay = $x[attempt] ?? 2000;
      (logForDebugging(
        `Teleport request failed (attempt ${attempt + 1}/${xg + 1}), retrying in ${delay}ms: ${errorMessage(error)}`,
      ),
        await sleep(delay));
    }
  throw lastError;
}
//@ chunk-aepeg2w5.js:783021-783317 fingerprint = CodeSessionSchema (0.888)
var CodeSessionSchema = DoctorLazy(() =>
  u({
    id: o(),
    title: o(),
    description: o(),
    status: U(["idle", "working", "waiting", "completed", "archived", "cancelled", "rejected"]),
    repo: u({ name: o(), owner: u({ login: o() }), default_branch: o().optional() }).nullable(),
    turns: A(o()),
    created_at: o(),
    updated_at: o(),
    environment_kind: U(wg).optional(),
  }),
);
//@ chunk-aepeg2w5.js:783317-783407 placement
function sessionsApiBearerFingerprint() {
  if (!isFirstPartyProvider()) return;
  let e = sessionsApiAccessTokenNow(isConsoleProfileSessionsCredential());
  return e === void 0 ? void 0 : computeContentHash(e).slice(0, 24);
}
//@ chunk-aepeg2w5.js:783407-783613 placement
async function primeSessionsApiBearer({ refresh: refresh, credentials: credentials }) {
  if (!isFirstPartyProvider()) return;
  if (isConsoleProfileSessionsCredential()) {
    if (refresh) await sessionsApiAccessToken();
    return;
  }
  if ((refresh ? await ensureHostSessionsBearer() : heldHostSessionsBearer()) !== null) return;
  if (!refresh) {
    let r = getClaudeAIOAuthTokens();
    if (r && isOAuthTokenExpired(r.expiresAt)) return;
  }
  await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials });
}
//@ chunk-aepeg2w5.js:783613-783654 fingerprint = prepareApiRequest (0.73)
var prepareApiRequest_2 = "Unable to get organization UUID";
//@ chunk-aepeg2w5.js:783654-783738 placement
class CloudSessionAccessError extends Error {
  constructor(e) {
    super(e);
    this.name = "CloudSessionAccessError";
  }
}
/**
 * 取云会话调用所需的 {accessToken, orgUUID, profile}：仅第一方提供商；必要时刷新 OAuth。旧版名 getMyAdminRequests 不准确。
 */
//@ chunk-aepeg2w5.js:783738-784178 placement = getMyAdminRequests (0.212)
async function prepareApiRequest(requestType, statuses = !0) {
  if (!isFirstPartyProvider())
    throw new CloudSessionAccessError(
      "Cloud sessions are only available on the first-party Anthropic API provider.",
    );
  let r,
    s = isConsoleProfileSessionsCredential();
  if (s)
    try {
      r = await resolveConsoleProfileBearer({ credentials: requestType, signIn: !1 });
    } catch (error) {
      if (error instanceof ConsoleProfileCloudSessionsError) throw new CloudSessionAccessError(error.message);
      throw error;
    }
  else
    (await checkAndRefreshOAuthTokenIfNeeded({ credentials: requestType }),
      (r = (statuses ? await ensureHostSessionsBearer() : null) ?? getClaudeAIOAuthTokens()?.accessToken));
  if (r === void 0) throw new CloudSessionAccessError(cloudSessionsSignInRefusal());
  let h = await sessionsApiOrganizationUUID(s);
  if (!h) throw new CloudSessionAccessError(prepareApiRequest_2);
  return { accessToken: r, orgUUID: h, profile: s };
}
//@ chunk-aepeg2w5.js:784178-784360 placement
function repoFromGitSource(e) {
  if (!e?.url) return null;
  let n = parseGitHubRepository(e.url);
  if (!n) return null;
  let [r, s] = n.split("/");
  if (!r || !s) return null;
  return { name: s, owner: { login: r }, default_branch: e.revision || void 0 };
}
/**
 * GET /v1/code/sessions 列出云端会话（teleport_sessions_list）。
 */
//@ chunk-aepeg2w5.js:784360-785105 placement = fetchCodeSessionsFromSessionsAPI (0.443)
async function fetchCodeSessionsFromSessionsAPI() {
  return withFeatureTelemetry("teleport_sessions_list", async () => {
    let { accessToken: accessToken } = await prepareApiRequest(),
      url = `${getOauthConfig().BASE_API_URL}/v1/code/sessions`;
    try {
      let response = await axiosGetWithRetry(url, { headers: getOAuthRequestHeaders(accessToken) });
      if (response.status !== 200) throw Error(`Failed to fetch code sessions: HTTP ${response.status}`);
      return response.data.data.map((session) => {
        let y = repoFromGitSource(
          session.config?.sources?.find((source) => source.type === "git_repository"),
        );
        return {
          id: session.id,
          title:
            (typeof session.title === "string" && sanitizeSessionTitle(session.title).replace(/\s+/g, " ")) ||
            "Untitled",
          description: "",
          status: session.status === "archived" ? "archived" : (session.worker_status ?? "idle"),
          repo: y,
          turns: [],
          created_at: session.created_at,
          updated_at: session.last_event_at,
          environment_kind: session.environment_kind,
        };
      });
    } catch (error) {
      let err = toError(error);
      if (isExpectedApiError(error))
        logForDebugging(`Failed to fetch code sessions: ${err.message}`, { level: "error" });
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
/**
 * User-Agent + OAuth 认证头。旧版名 getGroveSettings 为错配。
 */
//@ chunk-aepeg2w5.js:785257-785308 placement = getGroveSettings (0.554)
function getOAuthRequestHeaders(e) {
  return { "User-Agent": claudeCodeUserAgent(), ...getOAuthHeaders(e) };
}
//@ chunk-aepeg2w5.js:785308-785404 placement
async function fetchSession(e, n, r) {
  let { session: session, serverNow: serverNow } = await sendCloudSessionEvent(e, n, r);
  return describeCloudSession(session, { serverNow: serverNow });
}
/**
 * 发送云会话事件（仅第一方）。
 */
//@ chunk-aepeg2w5.js:785404-786206 placement
async function sendCloudSessionEvent(e, n, r) {
  if (!isFirstPartyProvider())
    throw new TeleportOperationError(
      "Cloud sessions are only available on the first-party Anthropic API provider.",
      "Cloud sessions are only available on the first-party Anthropic API provider.",
    );
  let { accessToken: accessToken } = n ?? (await prepareApiRequest(r)),
    h = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}`,
    y = await Dt.get(h, {
      headers: getOAuthRequestHeaders(accessToken),
      timeout: 15000,
      validateStatus: (R) => R < 500,
    });
  if (y.status !== 200) {
    let { message: message, statusLine: statusLine } = cloudErrorMessage(y, y.data?.error?.message);
    if (y.status === 404) {
      let P = `${SESSION_NOT_FOUND_MESSAGE} ${vPt(e)}`;
      throw new TeleportOperationError(P, P);
    }
    if (y.status === 401) throw new TeleportOperationError(ggr, ggr);
    if (y.status === 400 && message?.startsWith(pro)) throw new TeleportOperationError(message, message);
    throw Error(message || `Failed to fetch session: ${statusLine}`);
  }
  let S = extractSessionFromResponse(y.data);
  if (!S) throw Error(`${SESSION_NOT_FOUND_MESSAGE} ${vPt(e)}`);
  let parse = Date.parse(String(y.headers?.date ?? ""));
  return { session: S, serverNow: Number.isFinite(parse) ? parse : void 0 };
}
//@ chunk-aepeg2w5.js:786206-786317 placement = getBranchFromSession (1)
function getBranchFromSession(session) {
  return session.session_context.outcomes?.find((outcome) => outcome.type === "git_repository")?.git_info
    ?.branches[0];
}
//@ chunk-aepeg2w5.js:786317-786377 placement
async function getSessionRequestHeaders(e, n) {
  return { ...getOAuthRequestHeaders(e), ...(n ? {} : await trustedDeviceHeaders()) };
}
//@ chunk-aepeg2w5.js:786377-786946 placement
async function resendAfterUntrustedDevice(e, n, r, s) {
  if (e.status !== 403) return e;
  let { isDeviceIdentityEnabled: isDeviceIdentityEnabled } = await import("./chunk-m288yvvf.js");
  if (!(await isDeviceIdentityEnabled().catch(() => !1))) return e;
  let {
      readUntrustedDeviceRefusal: readUntrustedDeviceRefusal,
      shouldCloudSessionEnroll: shouldCloudSessionEnroll,
      shouldRemoteControlEnroll: shouldRemoteControlEnroll,
    } = await import("./chunk-g9dw262t.js"),
    R = readUntrustedDeviceRefusal(e.data);
  if (R === void 0) return e;
  let {
    clearTrustedDeviceTokenCache: clearTrustedDeviceTokenCache,
    logRefusalWithoutEnrollment: logRefusalWithoutEnrollment,
    withUntrustedDeviceRecovery: withUntrustedDeviceRecovery,
  } = await import("./chunk-3kb57csj.js");
  if (!(s === "remote_control" ? shouldRemoteControlEnroll(R) : shouldCloudSessionEnroll(R)))
    return (logRefusalWithoutEnrollment("[teleport]", R), clearTrustedDeviceTokenCache(), e);
  return (
    (await withUntrustedDeviceRecovery(n, r, void 0).catch(() => {
      return;
    })) ?? e
  );
}
/**
 * 附加设备证明并签名事件。
 */
//@ chunk-aepeg2w5.js:786946-787659 placement
async function attachDeviceAttestation(e, n, r, s, h) {
  if (
    r.device_attestation !== void 0 ||
    typeof r.payload.uuid !== "string" ||
    (h.eventSigner === void 0 && h.signerForBoundDevice === void 0)
  )
    return;
  let {
    classifyElevatedAuthError: classifyElevatedAuthError,
    classifyElevatedAuthSubReason: classifyElevatedAuthSubReason,
  } = await import("./chunk-g9dw262t.js");
  if (
    classifyElevatedAuthSubReason(e.data) !== "bound_unattested" &&
    classifyElevatedAuthError(e.data) !== "session_stale_relogin"
  )
    return;
  if (h.eventSigner !== void 0) {
    let x = await signClientEvent(h.eventSigner, n, r.payload);
    if (x.device_attestation !== void 0) return x;
  }
  if (h.signerForBoundDevice === void 0) return;
  let w = await fetchSession(n, { accessToken: s }).then(
    (x) => x.bound_device_uuid,
    () => {
      return;
    },
  );
  if (w === void 0) return;
  let R = await signClientEvent(
    h.signerForBoundDevice(w).catch(() => {
      return;
    }),
    n,
    r.payload,
  );
  return R.device_attestation === void 0 ? void 0 : R;
}
/**
 * 可信设备令牌头 X-Trusted-Device-Token（设备身份功能开启时）。
 */
//@ chunk-aepeg2w5.js:787659-787817 placement
async function trustedDeviceHeaders() {
  let { getTrustedDeviceToken: getTrustedDeviceToken } = await import("./chunk-3kb57csj.js"),
    n = await getTrustedDeviceToken().catch(() => {
      return;
    });
  return n ? { "X-Trusted-Device-Token": n } : {};
}
//@ chunk-aepeg2w5.js:787817-787956 placement
function parsePositiveInt(e) {
  let n = typeof e === "number" ? e : typeof e === "string" && /^\d+$/.test(e) ? Number(e) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : void 0;
}
/**
 * 向远程会话发事件：POST <BASE_API_URL>/v1/code/sessions/<id>/events（OAuth Bearer + 组织头），403 未信任设备时尝试设备登记后重试；仅第一方。
 */
//@ chunk-aepeg2w5.js:787956-790321 placement
async function sendEventToRemoteSession_2(e, n, r, s = {}) {
  if (!isFirstPartyProvider())
    return {
      ok: !1,
      reason: "Cloud sessions are only available on the first-party Anthropic API provider.",
      cause: "not_first_party",
    };
  try {
    let { accessToken: accessToken, profile: profile } = await prepareApiRequest(),
      S = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}/events`,
      w = await getSessionRequestHeaders(accessToken, profile);
    logForDebugging(`${r} Sending event to session ${e}`);
    let R = await signClientEvent(s.eventSigner, e, n),
      x,
      P = (q) =>
        Dt.post(S, { events: [R] }, { headers: q, validateStatus: (Q) => Q < 500, timeout: 30000 }).catch(
          (Q) => {
            throw ((x ??= { error: Q }), Q);
          },
        ),
      F = await P(w),
      L = !1;
    if (F.status === 403) {
      let { isDeviceIdentityEnabled: isDeviceIdentityEnabled } = await import("./chunk-m288yvvf.js");
      L = await isDeviceIdentityEnabled().catch(() => !1);
      let Q = L ? await attachDeviceAttestation(F, e, R, accessToken, s) : void 0;
      if (Q !== void 0)
        (logForDebugging(`${r} Refused unsigned by a session bound to this machine; resending signed`),
          (R = Q),
          (F = await P(w).catch(
            (re) => (logForDebugging(`${r} Signed resend failed: ${errorMessage(re)}`), F),
          )));
      F = await resendAfterUntrustedDevice(
        F,
        w["X-Trusted-Device-Token"],
        async (re) => {
          let se = await prepareApiRequest();
          return P({
            ...getOAuthRequestHeaders(se.accessToken),
            ...(se.profile ? {} : { "X-Trusted-Device-Token": re }),
          });
        },
        "cloud_session",
      );
    }
    let G = F.status === 200 || F.status === 201;
    if (x !== void 0 && !G)
      throw (
        logForDebugging(
          `${r} Not reporting HTTP ${F.status} (${printableName(String(jsonStringify(F.data)), 500)}) as the outcome: another POST of this event failed (5xx, timeout or network) and may have been stored`,
        ),
        logEvent("tengu_remote_send_refusal_not_reported", {
          status: F.status,
          cause: fromEnumOpt(classifyRequestFailure(x.error)),
        }),
        x.error
      );
    if (G) {
      logForDebugging(`${r} Successfully sent event to session ${e}`);
      let q = F.data?.results,
        Q = parsePositiveInt(q?.[0]?.sequence_num);
      return {
        ok: !0,
        ...(q?.[0]?.duplicate === !0 && { duplicate: !0 }),
        ...(Q !== void 0 && { sequenceNum: Q }),
      };
    }
    logForDebugging(`${r} Failed with status ${F.status}: ${jsonStringify(F.data)}`);
    let j;
    if (L && F.status === 403) {
      let { classifyElevatedAuthSubReason: classifyElevatedAuthSubReason } =
        await import("./chunk-g9dw262t.js");
      if (classifyElevatedAuthSubReason(F.data) === "bound_unattested") {
        let { loginEnrollmentOnThisComputer: loginEnrollmentOnThisComputer } =
          await import("./chunk-3kb57csj.js");
        j =
          loginEnrollmentOnThisComputer() === "enrolls"
            ? "this machine could not prove it is the computer the session is bound to, or a trusted device; run /login to enroll it"
            : "this machine could not prove it is the computer the session is bound to, or a trusted device";
      }
    }
    let ee = F.data?.error?.message;
    return {
      ok: !1,
      reason:
        j !== void 0
          ? `${j} (HTTP ${F.status})`
          : typeof ee === "string"
            ? `${printableName(ee, 300)} (HTTP ${F.status})`
            : `HTTP ${F.status}`,
      status: F.status,
      ...(j !== void 0 && { advice: j }),
    };
  } catch (error) {
    if ((logForDebugging(`${r} Error: ${errorMessage(error)}`), error instanceof CloudSessionAccessError))
      return { ok: !1, reason: error.message, advice: error.message };
    let y = classifyRequestFailure(error);
    return { ok: !1, reason: errorMessage(error), ...(y !== void 0 && { cause: y }) };
  }
}
//@ chunk-aepeg2w5.js:790321-790455 placement
function classifyRequestFailure(e) {
  if (!Dt.isAxiosError(e)) return;
  if (e.response !== void 0) return "server";
  return e.code === "ECONNABORTED" ? "timeout" : "network";
}
//@ chunk-aepeg2w5.js:790455-790797 placement
async function sendEventToRemoteSession(e, n, r) {
  return sendEventToRemoteSession_2(
    e,
    {
      uuid: r?.uuid ?? randomUUID_10(),
      session_id: e,
      type: "user",
      parent_tool_use_id: null,
      message: { role: "user", content: n },
      ...(r?.priority && { priority: r.priority }),
      ...(r?.pastedContent && { pasted_content: r.pastedContent }),
      ...(r?.inlinePastes && { inline_pastes: r.inlinePastes }),
    },
    "[sendEventToRemoteSession]",
    { eventSigner: r?.eventSigner },
  );
}
//@ chunk-aepeg2w5.js:790797-790920 placement
async function sendControlRequestToRemoteSession(e, n, r) {
  return sendEventToRemoteSession_2(
    e,
    { uuid: randomUUID_10(), ...n },
    "[sendControlRequestToRemoteSession]",
    { eventSigner: r?.eventSigner },
  );
}
//@ chunk-aepeg2w5.js:790920-791026 placement
async function sendControlResponseToRemoteSession(e, n, r, s) {
  return sendEventToRemoteSession_2(
    e,
    { uuid: randomUUID_10(), ...buildControlResponse(n, r) },
    "[sendControlResponseToRemoteSession]",
    s,
  );
}
//@ chunk-aepeg2w5.js:791026-791232 placement
async function sendBashCommandToRemoteSession(e, n, r) {
  return sendEventToRemoteSession_2(
    e,
    {
      uuid: r?.uuid ?? randomUUID_10(),
      session_id: e,
      type: "bash_command",
      command: n.command,
      ...(n.cwd !== void 0 && { cwd: n.cwd }),
    },
    "[sendBashCommandToRemoteSession]",
    { eventSigner: r?.eventSigner },
  );
}
//@ chunk-aepeg2w5.js:791232-791260 placement
var SESSION_EVENTS_BATCH_SIZE = 100,
  Jj = 10485760,
  Qj = 4;
/**
 * 把本地会话历史批量上传为远程会话事件（/v1/code/sessions/<id>/events，分批、限大小）。
 */
//@ chunk-aepeg2w5.js:791260-793010 placement
async function sendSessionHistoryEvents(e, n, r) {
  if (!isFirstPartyProvider())
    return { ok: !1, reason: "Cloud sessions are only available on the first-party Anthropic API provider." };
  if (n.length === 0) return { ok: !0, droppedEvents: 0 };
  let s = "[sendSessionHistoryEvents]",
    h = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}/events`,
    y = 0,
    S,
    w = !1,
    R = new ClientEventUploader({
      maxBatchSize: SESSION_EVENTS_BATCH_SIZE,
      maxBatchBytes: Jj,
      maxQueueSize: Math.max(n.length, SESSION_EVENTS_BATCH_SIZE),
      baseDelayMs: 500,
      maxDelayMs: 8000,
      jitterMs: 250,
      maxConsecutiveFailures: Qj,
      onBatchDropped: () => {
        ((w = !0), R.close());
      },
      send: async (x) => {
        let mapped = x.map((j) => ({ payload: { ...j, historical: !0 }, historical: !0 }));
        dedupeEventsByUuid(mapped);
        let F;
        try {
          let { accessToken: accessToken, profile: profile } = await prepareApiRequest(r),
            q = await getSessionRequestHeaders(accessToken, profile),
            Q = (re) =>
              Dt.post(
                h,
                { events: mapped },
                { headers: re, validateStatus: (se) => se < 500, timeout: 60000 },
              );
          F = await resendAfterUntrustedDevice(
            await Q(q),
            q["X-Trusted-Device-Token"],
            async (re) => {
              let se = await prepareApiRequest(r);
              return Q({
                ...getOAuthRequestHeaders(se.accessToken),
                ...(se.profile ? {} : { "X-Trusted-Device-Token": re }),
              });
            },
            "remote_control",
          );
        } catch (error) {
          throw ((S = { reason: errorMessage(error) }), error);
        }
        if (F.status === 200 || F.status === 201) return;
        let L = F.data?.error?.message,
          G = typeof L === "string" ? `${printableName(L, 300)} (HTTP ${F.status})` : `HTTP ${F.status}`;
        if (F.status === 400 || F.status === 413 || F.status === 422) {
          (logForDebugging(`${s} Dropping ${x.length} history event(s) the server refused: ${G}`, {
            level: "warn",
          }),
            (y += x.length));
          return;
        }
        if (((S = { reason: G, status: F.status }), F.status === 429)) {
          let j = Number(F.headers?.["retry-after"]);
          throw new q6e(G, Number.isFinite(j) ? j * 1000 : void 0);
        }
        throw Error("session history POST refused");
      },
    });
  try {
    (await R.enqueue(n.slice()), await R.flush());
  } finally {
    R.close();
  }
  if (w)
    return (
      logForDebugging(`${s} Upload to ${e} failed: ${S?.reason ?? "unknown"}`),
      { ok: !1, reason: S?.reason ?? "upload failed", ...(S?.status !== void 0 && { status: S.status }) }
    );
  return (
    logForDebugging(
      `${s} Wrote ${n.length - y} history events to session ${e}${y > 0 ? ` (${y} refused)` : ""}`,
    ),
    { ok: !0, droppedEvents: y }
  );
}
/**
 * 更新云会话标题（/v1/code/sessions/<id>）。
 */
//@ chunk-aepeg2w5.js:793010-793525 placement = updateSessionTitle (0.66)
async function updateSessionTitle(e, n, r) {
  try {
    let { accessToken: accessToken, profile: profile } = await prepareApiRequest(),
      url = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}`;
    logForDebugging(`[updateSessionTitle] Updating title for session ${e}: "${n}"`);
    let put = await Dt.put(
      url,
      { title: n },
      {
        headers: await getSessionRequestHeaders(accessToken, profile),
        signal: r,
        validateStatus: (status) => status < 500,
      },
    );
    if (put.status === 200)
      return (logForDebugging(`[updateSessionTitle] Successfully updated title for session ${e}`), !0);
    return (
      logForDebugging(`[updateSessionTitle] Failed with status ${put.status}: ${jsonStringify(put.data)}`),
      !1
    );
  } catch (error) {
    return (logForDebugging(`[updateSessionTitle] Error: ${errorMessage(error)}`), !1);
  }
}
//@ chunk-aepeg2w5.js:793525-793865 placement
async function markSessionRead(e, n) {
  try {
    let { accessToken: accessToken } = await prepareApiRequest(),
      s = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}/mark_read`,
      post = await Dt.post(s, n ? { event_id: n } : {}, {
        headers: getOAuthRequestHeaders(accessToken),
        timeout: 1e4,
        validateStatus: (y) => y < 500,
      });
    if (post.status !== 200)
      logForDebugging(`[markSessionRead] Failed with status ${post.status}: ${jsonStringify(post.data)}`);
  } catch (error) {
    logForDebugging(`[markSessionRead] Error: ${errorMessage(error)}`);
  }
}
/**
 * can_use_tool 控制请求 schema。
 */
//@ chunk-aepeg2w5.js:793865-794214 placement
var CanUseToolRequestSchema = DoctorLazy(() =>
    kt({
      subtype: T("can_use_tool"),
      tool_name: o(),
      input: pe(o(), oe()),
      tool_use_id: o(),
      requires_user_interaction: M().optional(),
      decision_reason_type: oe().optional(),
      classifier_approvable: oe().optional(),
      matched_ask_rule: oe().optional(),
    }),
  ),
  eV = DoctorLazy(() =>
    Ir("type", [
      u({ type: T("control_request"), request_id: o(), request: CanUseToolRequestSchema() }),
      SDKControlResponseMessageSchema(),
      SDKControlCancelRequestMessageSchema(),
    ]),
  ),
  MCP_QUESTION_GRACE_MS = 600000;
//@ chunk-aepeg2w5.js:794214-794324 placement
function getAccessTokenWithCcrFallback() {
  return (
    getClaudeAIOAuthTokens()?.accessToken ??
    (env.CLAUDE_CODE_REMOTE
      ? env.CLAUDE_CODE_OAUTH_TOKEN || getOAuthTokenFromFileDescriptor() || void 0
      : void 0)
  );
}
//@ chunk-aepeg2w5.js:794324-794401 placement
function deviceBridgeAccessToken(e) {
  return (
    (e.profile ? sessionsApiAccessTokenNow(!0) : getAccessTokenWithCcrFallback()) ??
    (hostSessionsBearerOffered() ? void 0 : e.accessToken)
  );
}
//@ chunk-aepeg2w5.js:794401-794445 placement
function sessionsApiAccessTokenWithCcrFallback(e) {
  return e ? sessionsApiAccessTokenNow(e) : (readHostSessionsBearer() ?? getAccessTokenWithCcrFallback());
}
/**
 * 轮询远程会话事件（after_id 分页），用于 teleport 拉取日志。
 */
//@ chunk-aepeg2w5.js:794445-795880 placement = pollRemoteSessionEvents (0.527)
async function pollRemoteSessionEvents(sessionId, afterId, opts) {
  if (!isFirstPartyProvider())
    throw Error("Cloud sessions are only available on the first-party Anthropic API provider.");
  let s,
    h = isConsoleProfileSessionsCredential(),
    y = null;
  if (h) s = await sessionsApiAccessToken(h);
  else
    (await checkAndRefreshOAuthTokenIfNeeded({ credentials: opts.credentials }),
      (y = await ensureHostSessionsBearer()),
      (s = y ?? getAccessTokenWithCcrFallback()));
  if (!s) throw Error("No access token for polling");
  let S = s,
    eventsUrl = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}/events`,
    MAX_EVENT_PAGES = 50,
    x = [],
    P = [],
    F = afterId;
  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    let re = await resendOnHeldBearer401(
      y,
      (Se) => (
        (y = Se),
        axiosGetWithRetry_2(
          eventsUrl,
          async () => (
            (S = h
              ? bearerToSend(null, s)
              : bearerToSend(readHostSessionsBearer(), getAccessTokenWithCcrFallback())),
            {
              headers: await getSessionRequestHeaders(S, h),
              params: { sort_order: "asc", ...(F && { cursor: F }) },
              timeout: 30000,
            }
          ),
        )
      ),
      { waitForHost: !0 },
    );
    if (re.status !== 200)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to fetch session events: HTTP ${re.status}`,
        "Failed to fetch session events",
      );
    let eventsData = re.data;
    if (!eventsData?.data || !Array.isArray(eventsData.data)) throw Error("Invalid events response");
    for (let event of eventsData.data) {
      let ae = event?.sequence_num;
      if (ae !== void 0) F = String(ae);
      let ie = event?.payload;
      if (ie && typeof ie === "object" && "type" in ie) {
        let safeParse = eV().safeParse(ie);
        if (safeParse.success) P.push(safeParse.data);
        else if ("session_id" in ie) x.push(ie);
      }
    }
    if (!eventsData.next_cursor) break;
  }
  if (opts.skipMetadata) return { newEvents: x, controlFrames: P, lastEventId: F };
  let L, G, j, ee, q;
  try {
    let Q = await fetchSession(sessionId, { accessToken: S });
    ((L = getBranchFromSession(Q)), (G = Q.session_status), (j = Q.startup_failure), (ee = Q.pending_action));
  } catch (error) {
    ((q = errorMessage(error)),
      logForDebugging(`teleport: failed to fetch session ${sessionId} metadata: ${error}`, {
        level: "warn",
      }));
  }
  return {
    newEvents: x,
    controlFrames: P,
    lastEventId: F,
    branch: L,
    sessionStatus: G,
    startupFailure: j,
    pendingAction: ee,
    metadataFetchError: q,
  };
}
/**
 * POST /v1/code/sessions/<id>/archive 归档云会话。
 */
//@ chunk-aepeg2w5.js:795880-796493 placement = archiveRemoteSession (0.535)
async function archiveRemoteSession(e, n = 1e4) {
  if (!isFirstPartyProvider())
    return (logForDebugging(`[archiveRemoteSession] ${e} skipped: non-first-party provider`), !1);
  let r = isConsoleProfileSessionsCredential(),
    s = r ? null : readHostSessionsBearer(),
    h = r ? sessionsApiAccessTokenNow(r) : getAccessTokenWithCcrFallback();
  if (!(s ?? h)) return !1;
  let url = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}/archive`;
  try {
    let w = await resendOnHeldBearer401(
      s,
      async (R) =>
        Dt.post(
          url,
          {},
          {
            headers: await getSessionRequestHeaders(bearerToSend(R, h), r),
            timeout: n,
            validateStatus: (x) => x < 500,
          },
        ),
      { waitForHost: !1 },
    );
    if (w.status === 200 || w.status === 409)
      return (logForDebugging(`[archiveRemoteSession] archived ${e}`), !0);
    return (logForDebugging(`[archiveRemoteSession] ${e} failed ${w.status}: ${jsonStringify(w.data)}`), !1);
  } catch (err) {
    return (
      logForDebugging(`[archiveRemoteSession] ${e} failed: ${errorMessage(err)}`, { level: "error" }),
      !1
    );
  }
}
//@ chunk-aepeg2w5.js:796493-796571 placement
var tV = 30000,
  id = new HostScoped(() => ({ lastBearer: void 0, storedCredentialCheck: void 0 }));
//@ chunk-aepeg2w5.js:796571-796657 placement
function isConsoleProfileSessionsCredential() {
  if (getWIFAuthType() !== "user_oauth" || !isWIFDispatchAuth()) return !1;
  return consoleProfileOrganizationLabel() !== "not_ldr" || !hasUsableClaudeAILogin();
}
//@ chunk-aepeg2w5.js:796657-796664 placement
Fx(isConsoleProfileSessionsCredential);
//@ chunk-aepeg2w5.js:796664-796723 placement
function consoleProfileOrganizationLabel() {
  return $o()?.organizationLabel() ?? "unknown";
}
//@ chunk-aepeg2w5.js:796723-796783 placement
function Kr() {
  return getWIFAccountInfo()?.organizationUuid?.trim() || void 0;
}
//@ chunk-aepeg2w5.js:796783-796806 placement
function zx() {
  return !1;
}
/**
 * 是否有当前组织的最近凭据。
 */
//@ chunk-aepeg2w5.js:796806-797176 placement
function hasRecentBearerForOrg() {
  let e = Kr();
  if (e === void 0) return !1;
  let of = id.of(getRootSession().host);
  if (of.lastBearer?.organizationUuid === e) return !0;
  let now = Date.now();
  if (
    of.storedCredentialCheck === void 0 ||
    of.storedCredentialCheck.organizationUuid !== e ||
    now - of.storedCredentialCheck.at > tV
  )
    of.storedCredentialCheck = { at: now, organizationUuid: e, present: $o()?.hasStored(e) === !0 };
  return of.storedCredentialCheck.present;
}
//@ chunk-aepeg2w5.js:797176-797232 placement
function consoleProfileCanStartCloudSessions() {
  return isConsoleProfileSessionsCredential() && Kr() !== void 0 && (zx() || hasRecentBearerForOrg());
}
/**
 * 需要登录、控制台登录不可用的提示。
 */
//@ chunk-aepeg2w5.js:797232-797533 placement
var LOGIN_REQUIRED_HINT = "Run `claude auth login` (or /login in a local session), then try again.",
  rV =
    "This command can't use your Console sign-in for cloud sessions: the part of Claude Code that reads that sign-in isn't loaded in this process. That's a bug in Claude Code; please report it, with the command you ran.";
//@ chunk-aepeg2w5.js:797533-797567 placement
function consoleProfileCredentialProviderLoaded() {
  return $o() !== null;
}
//@ chunk-aepeg2w5.js:797567-797903 placement
function cloudSessionsSignInRefusal() {
  if (isConsoleProfileSessionsCredential()) {
    if (!consoleProfileCredentialProviderLoaded()) return rV;
    if (consoleProfileOrganizationLabel() === "unknown")
      return "Your organization's policy hasn't been read yet, so a cloud session can't start. Try again in a moment.";
    return `Cloud sessions aren't available with this Console sign-in. They need a claude.ai sign-in. ${LOGIN_REQUIRED_HINT}`;
  }
  return `Cloud sessions need a claude.ai sign-in. ${LOGIN_REQUIRED_HINT}`;
}
//@ chunk-aepeg2w5.js:797903-797997 placement
class ConsoleProfileCloudSessionsError extends Error {
  constructor(e) {
    super(e);
    this.name = "ConsoleProfileCloudSessionsError";
  }
}
//@ chunk-aepeg2w5.js:797997-798660 placement
async function resolveConsoleProfileBearer({
  credentials: credentials,
  signIn: signIn,
  onBrowserOpening: onBrowserOpening,
}) {
  let s = Kr();
  if (s === void 0)
    throw new ConsoleProfileCloudSessionsError(
      "Your Console sign-in doesn't record an organization, so a cloud session can't be started. Sign in again with /login or `ant auth login`.",
    );
  let h = await Og({ organizationUuid: s, credentials: credentials });
  if (h.ok) return nd(h.accessToken, s);
  if (h.reason === "refresh_failed")
    throw new ConsoleProfileCloudSessionsError(
      `Your cloud-sessions sign-in could not be renewed (${h.detail ?? "unknown cause"}). Try again.`,
    );
  if ((forgetConsoleProfileCloudSessionsBearer(), !signIn || !zx()))
    throw new ConsoleProfileCloudSessionsError(cloudSessionsSignInRefusal());
  let y = $o(),
    S = y
      ? await y.signIn({ organizationUuid: s, onBrowserOpening: onBrowserOpening })
      : { ok: !1, message: cloudSessionsSignInRefusal() };
  if (!S.ok) throw new ConsoleProfileCloudSessionsError(S.message);
  return nd(S.accessToken, s);
}
//@ chunk-aepeg2w5.js:798660-798757 placement
function Og(e) {
  let n = $o();
  return n ? n.getValid(e) : Promise.resolve({ ok: !1, reason: "needs_sign_in" });
}
//@ chunk-aepeg2w5.js:798757-798845 placement
async function ensureConsoleProfileCloudSessionsCredential(e, n) {
  if (isConsoleProfileSessionsCredential())
    await resolveConsoleProfileBearer({ credentials: e, signIn: !0, onBrowserOpening: n });
}
//@ chunk-aepeg2w5.js:798845-798933 placement
function nd(e, n) {
  return ((id.of(getRootSession().host).lastBearer = { accessToken: e, organizationUuid: n }), e);
}
//@ chunk-aepeg2w5.js:798933-799021 placement
function forgetConsoleProfileCloudSessionsBearer() {
  let of = id.of(getRootSession().host);
  ((of.lastBearer = void 0), (of.storedCredentialCheck = void 0));
}
//@ chunk-aepeg2w5.js:799021-799313 placement
async function recoverConsoleProfileBearerOutcome(e) {
  let n = Kr();
  if (n === void 0) return "needs_sign_in";
  let r = await Og({ organizationUuid: n, refusedAccessToken: e });
  if (!r.ok) {
    if (r.reason === "needs_sign_in") return (forgetConsoleProfileCloudSessionsBearer(), "needs_sign_in");
    return "transient";
  }
  if (r.accessToken === e) return "transient";
  return (nd(r.accessToken, n), "recovered");
}
//@ chunk-aepeg2w5.js:799313-799368 placement
async function jx(e) {
  return (await recoverConsoleProfileBearerOutcome(e)) === "recovered";
}
//@ chunk-aepeg2w5.js:799368-799537 placement
function sessionsApiAccessTokenNow(e) {
  if (e) {
    let lastBearer = id.of(getRootSession().host).lastBearer,
      r = Kr();
    return lastBearer !== void 0 && r !== void 0 && lastBearer.organizationUuid === r
      ? lastBearer.accessToken
      : void 0;
  }
  return readHostSessionsBearer() ?? getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-aepeg2w5.js:799537-799599 placement
async function accountApiAccessToken(e = isConsoleProfileSessionsCredential()) {
  return e ? sessionsApiAccessToken(!0) : getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-aepeg2w5.js:799599-799816 placement
async function sessionsApiAccessToken(e = isConsoleProfileSessionsCredential()) {
  if (e) {
    let n = Kr();
    if (n === void 0) return;
    let r = await Og({ organizationUuid: n });
    if (r.ok) return nd(r.accessToken, n);
    if (r.reason === "needs_sign_in") forgetConsoleProfileCloudSessionsBearer();
    return;
  }
  return (await ensureHostSessionsBearer()) ?? getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-aepeg2w5.js:799816-799879 placement
async function sessionsApiOrganizationUUID(e = isConsoleProfileSessionsCredential()) {
  if (e) return Kr() ?? null;
  return getOrganizationUUID();
}
//@ chunk-aepeg2w5.js:799879-799937 placement
function recoverSessionsApiBearer(e, n, r, s) {
  if (s) return jx(e);
  return recoverCloudSessionsBearer(e, n, r);
}
//@ chunk-aepeg2w5.js:799937-800530 placement
async function withSessionsApiBearer401Retry(e, n) {
  let r = n.profile ?? isConsoleProfileSessionsCredential(),
    s =
      n.fallbackToken !== void 0 &&
      !isHostHandedSessionsBearer(n.fallbackToken) &&
      (r || !hostSessionsBearerOffered())
        ? n.fallbackToken
        : void 0,
    h = r ? sessionsApiAccessTokenNow(!0) : ((await ensureHostSessionsBearer()) ?? void 0);
  if (!r && h === void 0) return withOAuth401Retry(() => e(Kx(sessionsApiAccessTokenNow(!1) ?? s)), n);
  try {
    return await e(Kx(h ?? s));
  } catch (error) {
    if (
      h === void 0 ||
      !Dt.isAxiosError(error) ||
      error.response?.status !== 401 ||
      !(r
        ? await jx(h)
        : (await recoverHostSessionsBearer(
            h,
            lacksAuthorizationHeader(error.config) ? "withheld" : "refused",
          )) === "recovered" || hasClaudeAISignInToken())
    )
      throw error;
    let S = sessionsApiAccessTokenNow(r) ?? s;
    if (S === void 0) throw error;
    try {
      return await e(S);
    } catch (error) {
      if (!r && Dt.isAxiosError(error) && error.response?.status === 401)
        recoverHostSessionsBearer(S, lacksAuthorizationHeader(error.config) ? "withheld" : "refused").catch(
          () => {},
        );
      throw error;
    }
  }
}
//@ chunk-aepeg2w5.js:800530-800588 placement
function Kx(e) {
  if (e === void 0) throw new CloudSessionAccessError(cloudSessionsSignInRefusal());
  return e;
}
//@ chunk-aepeg2w5.js:800588-800712 placement
function bearerToSend(e, n) {
  let r = e ?? n;
  if (r === void 0) throw Error("No credential left to send a cloud-sessions request with");
  return r;
}
//@ chunk-aepeg2w5.js:800712-800948 placement
async function resendOnHeldBearer401(e, n, { waitForHost: waitForHost }) {
  let s;
  try {
    s = await n(e);
  } catch (error) {
    if (e === null || !Dt.isAxiosError(error) || error.response?.status !== 401) throw error;
    return resolveSessionsAuth(e, n, waitForHost, lacksAuthorizationHeader(error.config));
  }
  if (e === null || s.status !== 401) return s;
  return resolveSessionsAuth(e, n, waitForHost, lacksAuthorizationHeader(s.config));
}
/**
 * 解析会话 API 的认证。
 */
//@ chunk-aepeg2w5.js:800948-801310 placement
async function resolveSessionsAuth(e, n, r, s) {
  let h = recoverHostSessionsBearer(e, s ? "withheld" : "refused"),
    y;
  if (r) (await h, (y = await ensureHostSessionsBearer()));
  else (h.catch(() => {}), (y = heldHostSessionsBearer()));
  let S;
  try {
    S = await n(y);
  } catch (error) {
    if (y !== null && Dt.isAxiosError(error) && error.response?.status === 401)
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
class Vx {
  warned = !1;
  claim() {
    if (this.warned) return !1;
    return ((this.warned = !0), !0);
  }
}
//@ chunk-aepeg2w5.js:801387-801412 placement
var oV = new HostScoped(() => new Vx());
//@ chunk-aepeg2w5.js:801412-801449 placement
function iV() {
  return oV.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:801449-801471 placement
function vgr() {
  return;
}
/**
 * 是否配置了记忆 API 覆盖。
 */
//@ chunk-aepeg2w5.js:801471-801508 placement
function hasMemoryApiOverride() {
  return vgr() !== void 0;
}
/**
 * 记忆 API 的主机与认证方式。
 */
//@ chunk-aepeg2w5.js:801508-801718 placement
function memoryApiTarget() {
  if (!hasMemoryApiOverride()) return { host: "memory", auth: "async", refreshOAuth: !0 };
  let CLAUDE_CODE_MEMORY_API_TOKEN = antEnv.CLAUDE_CODE_MEMORY_API_TOKEN;
  return {
    host: "memory",
    auth: "none",
    refreshOAuth: !1,
    ...(CLAUDE_CODE_MEMORY_API_TOKEN && {
      headers: { Authorization: `Bearer ${CLAUDE_CODE_MEMORY_API_TOKEN}` },
    }),
  };
}
//@ chunk-aepeg2w5.js:801761-801774 placement
var sV = 4 * dBe;
//@ chunk-aepeg2w5.js:801774-801932 placement
function Gki(e) {
  return (
    e.response_started !== !0 &&
    e.bytes_handed + dBe < e.body_bytes &&
    e.bytes_flushed !== void 0 &&
    e.bytes_flushed > 0 &&
    e.bytes_flushed + sV < e.body_bytes
  );
}
//@ chunk-0qx6sn4e.js:3581-3725 fingerprint = isTransientNetworkError (1)
function isTransientNetworkError_2(error) {
  if (!Dt.isAxiosError(error)) return !1;
  let n = error.response?.status;
  if (n !== void 0) return n >= 500 && n < 600;
  return error.code !== void 0 && TRANSIENT_NETWORK_ERRNOS.has(error.code);
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
  Gki,
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
  ggr,
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
  vgr,
  getOAuthHeaders,
  CloudSessionAccessError,
  recoverConsoleProfileBearerOutcome,
  sessionsApiWire,
  isTransientNetworkError,
  axiosGetWithRetry,
  consoleProfileCanStartCloudSessions,
  SESSION_NOT_FOUND_MESSAGE,
  pro,
  forgetConsoleProfileCloudSessionsBearer,
  withSessionsApiBearer401Retry,
  sessionsApiAccessTokenWithCcrFallback,
  accountApiAccessToken,
  sendSessionHistoryEvents,
};

/**
 * bridge/createSession.ts
 *
 * 并入已有模块：创建/读取桥接会话、颜色标签与拒绝标记。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/createSession.ts
 * pieces: chunk-f25sswmp.js (20), chunk-ypjxapg8.js (9)
 * attribution: placement 20, sole-consumer 7, callgraph-fingerprint 1, affinity 1
 */
import { randomUUID } from "crypto";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "../utils/debug.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { buildGitSessionContext } from "./gitSessionContext.js";
import { environmentSelector } from "../utils/teleport/environments.js";
import {
  setModeControlEvent,
  buildSessionCreateBody,
  sessionIdFromCreateResponse,
  sessionEventsUrl,
} from "../utils/teleport/sessionCreate.js";
import { errorMessage } from "../utils/errors.js";
import { lacksAuthorizationHeader } from "../services/oauth/sessionsBearerHooks.js";
import { extractErrorDetail } from "./debugUtils.js";
import { reportGitSessionContext } from "./reportGitSessionContext.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { toCompatSessionId, sessionIdBody, toInfraSessionId } from "./sessionIdCompat.js";
import { ao } from "./bridgeHostState.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { logError } from "../utils/log.js";
import { getRootSession, isReplBridgeActive } from "../bootstrap/state.js";
import { isCcrV2SessionCrudEnabled, isCcrV2SendEventsEnabled } from "./bridgeGates.js";
import {
  getTrustedDeviceToken,
  recoverFromUntrustedDevice,
  logRefusalWithoutEnrollment,
  clearTrustedDeviceTokenCache,
  CLOUD_CANNOT_REACH_ELEVATED_HINT,
  isTrustedDeviceGateEnabled,
  untrustedDeviceHint,
  serviceRouteSentence,
} from "./trustedDevice.js";
import {
  getSelfBridgeCompatId,
  adoptSelfBridgeTitleFromRoster,
  getSelfBridgeTitle,
} from "./replBridgeHandle.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import {
  readUntrustedDeviceRefusal,
  shouldRemoteControlEnroll,
  classifyElevatedAuthError,
} from "./codeSessionApi.js";
import { toDisplaySessionStatus } from "../utils/background/remote/remoteSession.js";
import { isKnownWorkerState, reportSignerLoadFailure } from "../utils/telemetry/memorySummary.js";
import { parseCrossSessionInboundCapability } from "../utils/sessionState.js";
import { ownRemoteSessionId } from "../utils/remoteSessionEnv.js";
import { DBe, hIt, extendHopChain, peerMessageInfo, SQ } from "../utils/peerMessageHeaders.js";
import { lst } from "../utils/randomId.js";
import { createMessageEnvelope } from "../utils/udsMessaging/messageEnvelope.js";
import { sanitizeAddressPart } from "../utils/swarm/teammateIds.js";
import { escapePluginTags } from "../utils/messages/pluginTags.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { env } from "../utils/env.js";
import { isDeviceIdentityServedOff } from "../services/analytics/violinGates.js";
import { Ehe } from "../utils/remoteEnvironment.js";
import { describeCredentialFailure } from "./remoteBridgeCore.js";
import { stripAnsiAndControls } from "../utils/printableName.js";

//@ chunk-f25sswmp.js:25881-26085 placement
var CREATE_RESPONSE_ERRORS = {
  no_session_id: { debug: "No session ID in response", code: "bridge_session_create_bad_response" },
  unusable_session_id: {
    debug: "Unusable session ID in response",
    code: "bridge_session_create_unusable_id",
  },
};
/**
 * 在 environment 下创建会话：一方提供商与 OAuth/组织检查，带 git sources/outcomes、模型、cwd、权限模式事件与 tags，按 tengu_ccr_v2_bridge_create_cli 选 v1 或 v1alpha2；返回 session_ 形式 ID 或 null。
 */
//@ chunk-f25sswmp.js:26085-28598 placement = createBridgeSession (0.387)
async function createBridgeSession({
  environmentId: environmentId,
  title: title,
  gitRepoUrl: gitRepoUrl,
  branch: branch,
  defaultBranch: defaultBranch,
  signal: signal,
  baseUrl: baseUrl,
  getAccessToken: getAccessToken,
  credentials: credentials,
  permissionMode: permissionMode,
  tags: tags,
}) {
  let {
      getClaudeAIOAuthTokens: getClaudeAIOAuthTokens,
      getClaudeAIOAuthTokensAsync: getClaudeAIOAuthTokensAsync,
    } = await import("./chunk-7v0gj88m.js"),
    { loginToHandOn: loginToHandOn } = await import("./chunk-temp5jed.js"),
    { readHostSessionsBearer: readHostSessionsBearer, recoverHostSessionsBearer: recoverHostSessionsBearer } =
      await import("./chunk-k6mn44mc.js"),
    { bearerOf: bearerOf } = await import("./chunk-28vb8cw9.js"),
    { getOrganizationUUID: getOrganizationUUID } = await import("./chunk-appaeyg7.js"),
    { getOauthConfig: getOauthConfig } = await import("./chunk-pcmb1mv7.js"),
    { sessionsApiWire: sessionsApiWire } = await import("./chunk-6phxatm7.js"),
    { getMainLoopModel: getMainLoopModel } = await import("./chunk-gqemcfsb.js"),
    { getOriginalCwd: getOriginalCwd } = await import("./chunk-nj7t53r7.js"),
    { default: axios } = await import("./chunk-j1zq5m4b.js"),
    { isCcrV2BridgeCreateEnabled: isCcrV2BridgeCreateEnabled } = await import("./chunk-zke21f1q.js"),
    z = isCcrV2BridgeCreateEnabled() ? "v1alpha2" : "v1",
    U = { create_endpoint: fromEnum(z) },
    { isFirstPartyProvider: isFirstPartyProvider } = await import("./chunk-hzephfq7.js");
  if (!isFirstPartyProvider())
    return (
      logForDebugging("[bridge] Session create skipped on non-firstParty provider"),
      V("bridge_session_create_3p_provider", U)
    );
  let X =
    getAccessToken?.() ??
    ie(
      readHostSessionsBearer,
      isStorageV5Enabled() && credentials !== void 0
        ? loginToHandOn(await getClaudeAIOAuthTokensAsync(credentials))?.accessToken
        : loginToHandOn(getClaudeAIOAuthTokens())?.accessToken,
    );
  if (!X)
    return (
      logForDebugging("[bridge] No access token for session creation"),
      V("bridge_session_create_no_token", U)
    );
  let orgUUID = await getOrganizationUUID();
  if (!orgUUID)
    return (
      logForDebugging("[bridge] No org UUID for session creation"),
      V("bridge_session_create_no_org", U)
    );
  let {
      sources: sources,
      outcomes: outcomes,
      report: report,
    } = await buildGitSessionContext(gitRepoUrl, branch, defaultBranch),
    parsed = environmentSelector(environmentId),
    fe = getMainLoopModel(),
    pe = getOriginalCwd(),
    ge = permissionMode ? [setModeControlEvent(permissionMode)] : [],
    Ve =
      z === "v1alpha2"
        ? buildSessionCreateBody({
            title: title,
            worker: parsed,
            events: ge,
            sources: sources,
            outcomes: outcomes,
            model: fe,
            cwd: pe,
            reuseOutcomeBranches: !0,
            tags: tags?.length ? tags : void 0,
          })
        : {
            ...(title !== void 0 && { title: title }),
            events: ge,
            session_context: {
              sources: sources,
              outcomes: outcomes,
              model: fe,
              cwd: pe,
              reuse_outcome_branches: !0,
            },
            ...parsed,
            source: "remote-control",
            ...(tags?.length && { tags: tags }),
          },
    me = sessionsApiWire(z, baseUrl ?? getOauthConfig().BASE_API_URL, X),
    $e = { ...me.headers, "x-organization-uuid": orgUUID },
    response;
  try {
    response = await axios.post(me.url, Ve, { headers: $e, signal: signal, validateStatus: (L) => L < 500 });
  } catch (err) {
    return (
      logForDebugging(`[bridge] Session creation request failed: ${errorMessage(err)}`),
      V("bridge_session_create_request_failed", U)
    );
  }
  if (!(response.status === 200 || response.status === 201)) {
    if (response.status === 401)
      recoverHostSessionsBearer(
        bearerOf(response.config?.headers?.get?.("Authorization")) ?? X,
        lacksAuthorizationHeader(response.config) ? "withheld" : "refused",
      ).catch(() => {});
    let detail = extractErrorDetail(response.data);
    return (
      logForDebugging(
        `[bridge] Session creation failed with status ${response.status}${detail ? `: ${detail}` : ""}`,
      ),
      V("bridge_session_create_http_error", U)
    );
  }
  let K = sessionIdFromCreateResponse(z, response.data);
  if (!K.ok)
    return (
      logForDebugging(`[bridge] ${CREATE_RESPONSE_ERRORS[K.error].debug}`),
      V(CREATE_RESPONSE_ERRORS[K.error].code, U)
    );
  return (
    reportGitSessionContext(report),
    logFeatureOk("bridge_session_create", U),
    toCompatSessionId(K.value.id)
  );
}
//@ chunk-f25sswmp.js:28598-28653 placement
async function getBridgeSession(e, n) {
  return (await getBridgeSessionOrStatus(e, n)).session;
}
//@ chunk-f25sswmp.js:28653-30375 placement
async function getBridgeSessionOrStatus(sessionId, opts) {
  let {
      getClaudeAIOAuthTokens: getClaudeAIOAuthTokens,
      getClaudeAIOAuthTokensAsync: getClaudeAIOAuthTokensAsync,
    } = await import("./chunk-7v0gj88m.js"),
    { loginToHandOn: loginToHandOn } = await import("./chunk-temp5jed.js"),
    { readHostSessionsBearer: readHostSessionsBearer, recoverHostSessionsBearer: recoverHostSessionsBearer } =
      await import("./chunk-k6mn44mc.js"),
    { getOauthConfig: getOauthConfig } = await import("./chunk-pcmb1mv7.js"),
    { getCodeSession: getCodeSession } = await import("./chunk-g9dw262t.js"),
    { isCcrV2SessionCrudEnabled: isCcrV2SessionCrudEnabled } = await import("./chunk-zke21f1q.js"),
    { isFirstPartyProvider: isFirstPartyProvider } = await import("./chunk-hzephfq7.js");
  if (!isFirstPartyProvider())
    return (
      logFeatureBad("bridge_session_get", "bridge_session_get_3p_provider"),
      { session: null, notFound: !1 }
    );
  let T =
    opts?.getAccessToken?.() ??
    ie(
      readHostSessionsBearer,
      isStorageV5Enabled() && opts?.credentials !== void 0
        ? loginToHandOn(await getClaudeAIOAuthTokensAsync(opts.credentials))?.accessToken
        : loginToHandOn(getClaudeAIOAuthTokens())?.accessToken,
    );
  if (!T)
    return (
      logForDebugging("[bridge] No access token for session fetch"),
      logFeatureBad("bridge_session_get", "bridge_session_get_no_token"),
      { session: null, notFound: !1 }
    );
  let S = opts?.useV2 ?? isCcrV2SessionCrudEnabled(),
    response;
  if (!S) {
    let { getOrganizationUUID: getOrganizationUUID } = await import("./chunk-appaeyg7.js");
    if (((response = (await getOrganizationUUID()) ?? void 0), !response))
      return (
        logForDebugging("[bridge] No org UUID for session fetch"),
        logFeatureBad("bridge_session_get", "bridge_session_get_no_org"),
        { session: null, notFound: !1 }
      );
  }
  let b = await getCodeSession(opts?.baseUrl ?? getOauthConfig().BASE_API_URL, T, sessionId, 1e4, {
    useV2: S,
    orgUUID: response,
  });
  if (typeof b !== "object") {
    if (b === 401) recoverHostSessionsBearer(T).catch(() => {});
    return (
      logFeatureBad(
        "bridge_session_get",
        b === "invalid"
          ? "bridge_session_get_invalid_id"
          : typeof b === "number"
            ? "bridge_session_get_http_error"
            : "bridge_session_get_request_failed",
      ),
      { session: null, notFound: b === 404 }
    );
  }
  return (
    logFeatureOk("bridge_session_get"),
    {
      session: {
        environment_id: b.environment_id,
        title: b.title,
        status: b.status,
        created_at: b.created_at,
        updated_at: b.updated_at,
        connection_status:
          "connection_status" in b && typeof b.connection_status === "string" ? b.connection_status : void 0,
        tags: b.tags,
      },
      notFound: !1,
    }
  );
}
//@ chunk-f25sswmp.js:30375-31903 placement
async function archiveBridgeSession(e, n, r, s) {
  let {
      getClaudeAIOAuthTokens: getClaudeAIOAuthTokens,
      getClaudeAIOAuthTokensAsync: getClaudeAIOAuthTokensAsync,
    } = await import("./chunk-7v0gj88m.js"),
    { loginToHandOn: loginToHandOn } = await import("./chunk-temp5jed.js"),
    { readHostSessionsBearer: readHostSessionsBearer, recoverHostSessionsBearer: recoverHostSessionsBearer } =
      await import("./chunk-k6mn44mc.js"),
    { getOauthConfig: getOauthConfig } = await import("./chunk-pcmb1mv7.js"),
    { updateCodeSession: updateCodeSession } = await import("./chunk-g9dw262t.js"),
    { isCcrV2SessionCrudEnabled: isCcrV2SessionCrudEnabled } = await import("./chunk-zke21f1q.js"),
    { isFirstPartyProvider: isFirstPartyProvider } = await import("./chunk-hzephfq7.js");
  if (!isFirstPartyProvider())
    return (logFeatureBad("bridge_session_patch", "bridge_session_patch_3p_provider"), "rejected");
  let v =
    s?.getAccessToken?.() ??
    ie(
      readHostSessionsBearer,
      isStorageV5Enabled() && s?.credentials !== void 0
        ? loginToHandOn(await getClaudeAIOAuthTokensAsync(s.credentials))?.accessToken
        : loginToHandOn(getClaudeAIOAuthTokens())?.accessToken,
    );
  if (!v) return (logForDebugging(`[bridge] No access token for session ${r} update`), "failed");
  let b = "client_metadata" in n || isCcrV2SessionCrudEnabled(),
    x;
  if (!b) {
    let { getOrganizationUUID: getOrganizationUUID } = await import("./chunk-appaeyg7.js");
    if (((x = (await getOrganizationUUID()) ?? void 0), !x))
      return (logForDebugging(`[bridge] No org UUID for session ${r} update`), "failed");
  }
  logForDebugging(`[bridge] Updating session ${r}: ${e}`);
  let k = await updateCodeSession(s?.baseUrl ?? getOauthConfig().BASE_API_URL, v, e, n, 1e4, {
    useV2: b,
    orgUUID: x,
  });
  if (k === "invalid")
    return (logFeatureBad("bridge_session_patch", "bridge_session_patch_invalid_id"), "rejected");
  else if (typeof k !== "number")
    return (logFeatureBad("bridge_session_patch", "bridge_session_patch_request_failed"), "failed");
  else if (k === 200)
    return (
      logForDebugging(`[bridge] Session ${r} updated successfully`),
      logFeatureOk("bridge_session_patch"),
      "landed"
    );
  else {
    if (k === 401) recoverHostSessionsBearer(v).catch(() => {});
    return (logFeatureSad("bridge_session_patch", "bridge_session_patch_http_error"), "failed");
  }
}
//@ chunk-f25sswmp.js:31903-31962 placement
async function updateBridgeSessionTitle(e, n, r) {
  return archiveBridgeSession(e, { title: n }, "title", r);
}
//@ chunk-f25sswmp.js:31962-32094 placement
async function markBridgeSessionRefusedAtCapacity(e, n, r) {
  return markBridgeSessionRefused(
    e,
    { title: `Couldn't start \u2014 too many sessions are running \xB7 ${n}`, reason: "capacity" },
    r,
  );
}
//@ chunk-f25sswmp.js:32094-32230 placement
async function markBridgeSessionRefused(e, n, r) {
  return archiveBridgeSession(
    e,
    { title: n.title, client_metadata: { desktop_rc_refusal: { title: n.title, reason: n.reason } } },
    "refusal",
    r,
  );
}
//@ chunk-f25sswmp.js:32230-32247 placement
var SESSION_COLOR_TAG_PREFIX = "color:";
//@ chunk-f25sswmp.js:32247-32409 placement
async function updateBridgeSessionColorTag(e, n, r, s) {
  let i = n === "default",
    mapped = r.filter((E) => i || E !== n).map((E) => SESSION_COLOR_TAG_PREFIX + E),
    h = i ? void 0 : [SESSION_COLOR_TAG_PREFIX + n];
  await archiveBridgeSession(e, { add_tags: h, remove_tags: mapped }, "color tag", s);
}
//@ chunk-f25sswmp.js:32409-32444 placement
async function updateBridgeSessionNameTag(e, n, r) {
  return !1;
}
//@ chunk-f25sswmp.js:32444-32503 placement
function V(e, n) {
  return (logFeatureBad("bridge_session_create", e, n), null);
}
//@ chunk-f25sswmp.js:32503-32552 placement
function ie(e, n) {
  return n === void 0 ? void 0 : (e() ?? n);
}
//@ chunk-f25sswmp.js:32552-32684 placement
function markTeleportedSession(e) {
  let teleportedSessionIds = ao().teleportedSessionIds;
  if ((teleportedSessionIds.add(sessionIdBody(e)), teleportedSessionIds.size > 64)) {
    let r = teleportedSessionIds.values().next().value;
    if (r !== void 0) teleportedSessionIds.delete(r);
  }
}
//@ chunk-f25sswmp.js:32684-32743 placement
function isTeleportedSession(e) {
  return ao().teleportedSessionIds.has(sessionIdBody(e));
}
//@ chunk-f25sswmp.js:32743-32799 placement
function unmarkTeleportedSession(e) {
  ao().teleportedSessionIds.delete(sessionIdBody(e));
}
//@ chunk-f25sswmp.js:32799-32824 placement
class Ue {
  listener = void 0;
}
//@ chunk-f25sswmp.js:32824-32850 placement
var De = new SessionRootSlot(() => new Ue());
//@ chunk-f25sswmp.js:32850-32937 placement
function Xli(e, n) {
  try {
    return De.peek(e)?.listener?.(n)?.catch(logError);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-f25sswmp.js:32937-33032 placement
function Jli(e) {
  let of = De.of(getRootSession());
  return (
    (of.listener = e),
    () => {
      if (of.listener === e) of.listener = void 0;
    }
  );
}
//@ chunk-ypjxapg8.js:5578-5601 sole-consumer
var Y = 5000,
  U = 5,
  G = 32768;
/**
 * 分页列出本组织的其他远程会话（v1 或 v1alpha2），跳过归档与自身，处理未信任设备的注册重试，返回对端列表并记录失败与截断。
 */
//@ chunk-ypjxapg8.js:5601-7905 sole-consumer
async function listPeerSessions(stats, options) {
  let { prepareApiRequest: prepareApiRequest, sessionsApiWire: sessionsApiWire } =
      await import("./chunk-6phxatm7.js"),
    { getOauthConfig: getOauthConfig } = await import("./chunk-pcmb1mv7.js"),
    accessToken,
    orgUuid;
  try {
    ({ accessToken: accessToken, orgUUID: orgUuid } = await prepareApiRequest(options));
  } catch (page) {
    if ((logForDebugging(`[bridge:peers] auth prep failed: ${errorMessage(page)}`), stats)) stats.failed = !0;
    return [];
  }
  let useV2 = isCcrV2SessionCrudEnabled(),
    wire = sessionsApiWire(useV2 ? "v1alpha2" : "v1", getOauthConfig().BASE_API_URL, accessToken),
    headers = { ...wire.headers, ...(!useV2 && { "x-organization-uuid": orgUuid }) },
    deviceToken = await getTrustedDeviceToken();
  if (deviceToken) headers["X-Trusted-Device-Token"] = deviceToken;
  let selfCompatId = getSelfBridgeCompatId(),
    selfBody = selfCompatId ? sessionIdBody(selfCompatId) : void 0,
    peers = [],
    seen = new Set(),
    cursor = null,
    truncated = !1,
    enrollTried = !1;
  for (let l = 0; l < U; l++) {
    let uRLSearchParams = new URLSearchParams();
    if (useV2)
      (uRLSearchParams.set("limit", "200"),
        uRLSearchParams.append("statuses", "active"),
        uRLSearchParams.append("statuses", "paused"));
    if (cursor) uRLSearchParams.set(useV2 ? "cursor" : "after_id", cursor);
    let str = uRLSearchParams.toString(),
      url = str ? `${wire.url}?${str}` : wire.url,
      response;
    try {
      response = await Dt.get(url, { headers: headers, timeout: 15000, validateStatus: (n) => n < 500 });
    } catch (error) {
      if ((logForDebugging(`[bridge:peers] list request failed: ${errorMessage(error)}`), stats))
        stats.failed = !0;
      return peers;
    }
    let refusal =
      response.status === 403 && !enrollTried ? readUntrustedDeviceRefusal(response.data) : void 0;
    if (refusal !== void 0 && shouldRemoteControlEnroll(refusal)) {
      enrollTried = !0;
      let n = await recoverFromUntrustedDevice(deviceToken);
      if (n) {
        ((headers["X-Trusted-Device-Token"] = n), (deviceToken = n), l--);
        continue;
      }
    } else if (refusal !== void 0)
      (logRefusalWithoutEnrollment("[bridge:peers]", refusal), clearTrustedDeviceTokenCache());
    if (response.status !== 200) {
      if ((logForDebugging(`[bridge:peers] list failed ${response.status}`), stats)) stats.failed = !0;
      return peers;
    }
    if (response.data === null || typeof response.data !== "object" || !Array.isArray(response.data.data)) {
      if ((logForDebugging("[bridge:peers] list body `data` not an array; stopping"), stats))
        stats.failed = !0;
      return peers;
    }
    for (let n of response.data.data)
      try {
        let isV2Row = "session_status" in n,
          status = isV2Row ? n.session_status : toDisplaySessionStatus(n);
        if (status === "archived") continue;
        let sessionId = isV2Row ? n.id : toCompatSessionId(n.id),
          bodyId = sessionIdBody(sessionId);
        if (selfBody && bodyId === selfBody) {
          adoptSelfBridgeTitleFromRoster(n.title);
          continue;
        }
        if (seen.has(bodyId)) continue;
        (seen.add(bodyId),
          peers.push({
            id: sessionId,
            title: isV2Row ? n.title : n.title || null,
            status: status,
            updated_at: (isV2Row ? n.updated_at : n.last_event_at) ?? "",
            ...(isKnownWorkerState(n.environment_kind) && { environmentKind: n.environment_kind }),
            ...((n.connection_status === "connected" || n.connection_status === "disconnected") && {
              connected: n.connection_status === "connected",
            }),
            ...(isV2Row
              ? { inboundReportUnavailable: !0 }
              : parseCrossSessionInboundCapability(n.external_metadata)),
          }));
      } catch (error) {
        logForDebugging(`[bridge:peers] skipping malformed session row: ${errorMessage(error)}`);
      }
    let nextCursor = useV2
      ? (response.data.next_cursor ?? null)
      : response.data.has_more
        ? (response.data.last_id ?? null)
        : null;
    if (!nextCursor) break;
    if (((cursor = nextCursor), l === U - 1))
      ((truncated = !0),
        logForDebugging(
          `[bridge:peers] page budget exhausted with more sessions remaining (scanned ${U} pages)`,
        ));
  }
  if (
    (logForDebugging(
      `[bridge:peers] listed ${peers.length} peer sessions${truncated ? ` \u2014 TRUNCATED at ${U} pages (more sessions exist)` : ""}`,
      truncated ? { level: "warn" } : void 0,
    ),
    stats)
  )
    stats.truncated = truncated;
  return peers;
}
//@ chunk-ypjxapg8.js:7905-8175 sole-consumer
function De_ypjx(e) {
  if (!e) return !1;
  if (e.startsWith("auth:")) return !1;
  if (e.startsWith("invalid session ID format")) return !1;
  let match = /^HTTP (\d{3})/.exec(e);
  if (match) {
    let u = Number(match[1]);
    if (u === 401 || u === 403) return !1;
    if (u >= 500) return !1;
  }
  if (/status code 5\d\d/.test(e)) return !1;
  return !0;
}
/**
 * 把发给对端会话的错误信息归类为 bridge_auth、invalid_target、4xx/5xx、timeout 或 other。
 */
//@ chunk-ypjxapg8.js:8175-8520 sole-consumer
function classifyPeerSendError(e) {
  if (!e) return "other";
  if (e.startsWith("auth:")) return "bridge_auth";
  if (e.startsWith("invalid session ID format")) return "invalid_target";
  let match = /^HTTP (\d)\d\d/.exec(e);
  if (match) return match[1] === "5" ? "bridge_http_5xx" : "bridge_http_4xx";
  if (/status code 5\d\d/.test(e)) return "bridge_http_5xx";
  if (/timeout/i.test(e)) return "timeout";
  return "other";
}
/**
 * 向另一个会话发一条 peer 用户消息（POST events）：带来源 origin、附件、可信设备 token、可选设备签名；403 untrusted_device 时注册设备重试；返回 {ok, msgId|error}。
 */
//@ chunk-ypjxapg8.js:8520-10969 callgraph-fingerprint = updateBridgeSessionTitle (0.242)
async function postPeerMessage(
  sessionId,
  text,
  fromName,
  fileAttachments,
  b,
  C,
  credentials,
  fromPlugin,
  A = !1,
) {
  let {
      prepareApiRequest: prepareApiRequest,
      getOAuthRequestHeaders: getOAuthRequestHeaders,
      CCR_BYOC_BETA: CCR_BYOC_BETA,
    } = await import("./chunk-6phxatm7.js"),
    { getOauthConfig: getOauthConfig } = await import("./chunk-pcmb1mv7.js"),
    p,
    I;
  try {
    ({ accessToken: p, orgUUID: I } = await prepareApiRequest(credentials));
  } catch (error) {
    return { ok: !1, error: `auth: ${errorMessage(error)}` };
  }
  let c = toCompatSessionId(sessionId);
  if (!/^session_[A-Za-z0-9_-]+$/.test(c))
    return { ok: !1, error: `invalid session ID format: ${sessionId}` };
  let accessToken = getSelfBridgeCompatId() ?? ownRemoteSessionId(),
    y = accessToken ? DBe(accessToken) : "unknown",
    l = hIt(
      y,
      getSelfBridgeTitle() ?? fromName,
      text,
      void 0,
      extendHopChain(b, accessToken ? lst(y) : void 0),
      C,
    ),
    E = createMessageEnvelope(),
    g = peerMessageInfo(l),
    O = sanitizeAddressPart(fromPlugin),
    s = (fileAttachments?.length ?? 0) > 0,
    R = {
      kind: "peer",
      from: y,
      ...(g.name !== void 0 && { name: g.name }),
      ...(g.fromMode !== void 0 && { fromMode: g.fromMode }),
      ...(O !== void 0 && { plugin: O }),
      ...(g.body !== void 0 && !s && Buffer.byteLength(l) <= G && { body: g.body }),
    },
    B = SQ(R, escapePluginTags(l), l),
    n = {
      ...E,
      type: "user",
      message: { role: "user", content: l },
      parent_tool_use_id: null,
      session_id: c,
      uuid: randomUUID(),
      ...(!A && { origin: B }),
      ...(fromPlugin !== void 0 && { from_plugin: fromPlugin }),
      ...(s && { file_attachments: fileAttachments }),
    },
    f = { ...getOAuthRequestHeaders(p), "anthropic-beta": CCR_BYOC_BETA, "x-organization-uuid": I },
    orgUUID = await getTrustedDeviceToken();
  if (orgUUID) f["X-Trusted-Device-Token"] = orgUUID;
  let x = isCcrV2SendEventsEnabled(),
    compatId = toInfraSessionId(c),
    N =
      orgUUID &&
      x &&
      !isEssentialTrafficOnly() &&
      !env.CLAUDE_CODE_REMOTE &&
      !isDeviceIdentityServedOff() &&
      (Ehe() || isReplBridgeActive())
        ? await import("./chunk-fwcps4x0.js").catch(reportSignerLoadFailure)
        : void 0,
    F = N
      ? await N.signForElevatedPeer(
          () =>
            Dt.get(`${getOauthConfig().BASE_API_URL}/v1/code/sessions/${encodeURIComponent(compatId)}`, {
              headers: f,
              timeout: Y,
              validateStatus: (a) => a < 500,
            }).then((a) => (a.status === 200 ? a.data : void 0)),
          compatId,
          n,
          credentials,
        )
      : { payload: n, device_attestation: void 0 },
    { url: url, body: body } = sessionEventsUrl(
      getOauthConfig().BASE_API_URL,
      c,
      [F.payload],
      x,
      F.device_attestation,
    ),
    o;
  try {
    o = await Dt.post(url, body, { headers: f, timeout: 1e4, validateStatus: (a) => a < 500 });
  } catch (error) {
    return { ok: !1, error: errorMessage(error) };
  }
  logPeerPostRejected(c, o);
  let M = o.status === 403 ? readUntrustedDeviceRefusal(o.data) : void 0;
  if (M !== void 0) {
    if (env.CLAUDE_CODE_REMOTE === !0 && !orgUUID && !env.CLAUDE_TRUSTED_DEVICE_TOKEN)
      return { ok: !1, error: `auth: ${CLOUD_CANNOT_REACH_ELEVATED_HINT}` };
    let detail = shouldRemoteControlEnroll(M);
    if (!detail) (logRefusalWithoutEnrollment("[bridge:peers]", M), clearTrustedDeviceTokenCache());
    let H = detail ? await recoverFromUntrustedDevice(orgUUID) : void 0;
    if (H) {
      try {
        o = await Dt.post(url, body, {
          headers: { ...f, "X-Trusted-Device-Token": H },
          timeout: 1e4,
          validateStatus: (L) => L < 500,
        });
      } catch (err) {
        return { ok: !1, error: errorMessage(err) };
      }
      logPeerPostRejected(c, o);
    }
    let W = o.status === 403 ? readUntrustedDeviceRefusal(o.data) : void 0;
    if (W !== void 0) {
      if (isTrustedDeviceGateEnabled())
        return { ok: !1, error: `auth: ${untrustedDeviceHint(W, { justEnrolled: Boolean(H) })}` };
    }
  }
  if (o.status === 403 && classifyElevatedAuthError(o.data) === "session_stale_relogin")
    return {
      ok: !1,
      error: `auth: ${describeCredentialFailure({ terminal: !0, reason: "session_stale_relogin" })}`,
    };
  if (!j(o.status)) {
    if (o.status === 401 && env.CLAUDE_CODE_REMOTE === !0)
      return { ok: !1, error: `auth: ${CLOUD_CANNOT_MESSAGE_PEERS}` };
    return { ok: !1, error: `HTTP ${o.status}` };
  }
  return (
    logForDebugging(`[bridge:peers] posted to ${c}: ${text.slice(0, 60)}`),
    { ok: !0, msgId: E.msg_id }
  );
}
//@ chunk-ypjxapg8.js:10969-11206 affinity
var CLOUD_CANNOT_MESSAGE_PEERS =
  "this cloud session cannot message other sessions yet \u2014 its credential is accepted for its own work but not for delivering to another session, so a reply from here is not possible; say so in your response instead of retrying";
/**
 * 云会话向对端发消息被拒（403/401）时生成说明，提示改用服务路由发送；不适用时返回 undefined。
 */
//@ chunk-ypjxapg8.js:11206-11510 sole-consumer
function describeCloudPeerRefusal(e, r, u, S) {
  let b = e === "HTTP 403" ? "403" : e === `auth: ${CLOUD_CANNOT_MESSAGE_PEERS}` ? "401" : void 0;
  if (env.CLAUDE_CODE_REMOTE !== !0 || b === void 0) return;
  let C = S(),
    _ = C === void 0 ? void 0 : serviceRouteSentence({ sendTool: C, sessionId: u });
  return _ === void 0
    ? void 0
    : `Nothing was sent to '${r}': the post from this cloud session was refused (HTTP ${b}). ${_}`;
}
//@ chunk-ypjxapg8.js:11510-11557 sole-consumer
function j(e) {
  return e === 200 || e === 201 || e === 204;
}
//@ chunk-ypjxapg8.js:11557-11713 sole-consumer
function logPeerPostRejected(e, r) {
  if (j(r.status)) return;
  let u = extractErrorDetail(r.data);
  logForDebugging(
    `[bridge:peers] post to ${e} rejected: HTTP ${r.status}${u ? ` \u2014 ${stripAnsiAndControls(u)}` : ""}`,
    { level: "warn" },
  );
}

export {
  isTeleportedSession,
  Jli,
  getBridgeSessionOrStatus,
  Xli,
  getBridgeSession,
  updateBridgeSessionColorTag,
  unmarkTeleportedSession,
  markTeleportedSession,
  updateBridgeSessionTitle,
  createBridgeSession,
};

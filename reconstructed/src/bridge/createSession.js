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
import { bridgeHostState } from "./bridgeHostState.js";
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
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import {
  readUntrustedDeviceRefusal,
  shouldRemoteControlEnroll,
  classifyElevatedAuthError,
} from "./codeSessionApi.js";
import { toDisplaySessionStatus } from "../utils/background/remote/remoteSession.js";
import { isKnownWorkerState, reportSignerLoadFailure } from "../utils/telemetry/memorySummary.js";
import { parseCrossSessionInboundCapability } from "../utils/sessionState.js";
import { ownRemoteSessionId } from "../utils/remoteSessionEnv.js";
import {
  bridgeAddressFromToken,
  wrapPeerMessage,
  extendHopChain,
  peerMessageInfo,
  stripPeerMessageBody,
} from "../utils/peerMessageHeaders.js";
import { hmacRandomId } from "../utils/randomId.js";
import { createMessageEnvelope } from "../utils/udsMessaging/messageEnvelope.js";
import { sanitizeAddressPart } from "../utils/swarm/teammateIds.js";
import { escapePluginTags } from "../utils/messages/pluginTags.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { env } from "../utils/env.js";
import { isDeviceIdentityServedOff } from "../services/analytics/violinGates.js";
import { isTopLevelBridgeSession } from "../utils/remoteEnvironment.js";
import { describeCredentialFailure } from "./remoteBridgeCore.js";
import { stripAnsiAndControls } from "../utils/printableName.js";

//@ chunk-f25sswmp.js:25881-26085 placement
var CREATE_RESPONSE_ERRORS = {
  no_session_id: {
    debug: "No session ID in response",
    code: "bridge_session_create_bad_response",
  },
  unusable_session_id: {
    debug: "Unusable session ID in response",
    code: "bridge_session_create_unusable_id",
  },
};
//@ chunk-f25sswmp.js:26085-28598 placement = createBridgeSession (0.387)
/**
 * 在 environment 下创建会话：一方提供商与 OAuth/组织检查，带 git sources/outcomes、模型、cwd、权限模式事件与 tags，按 tengu_ccr_v2_bridge_create_cli 选 v1 或 v1alpha2；返回 session_ 形式 ID 或 null。
 */
async function createBridgeSession({
  environmentId,
  title,
  gitRepoUrl,
  branch,
  defaultBranch,
  signal,
  baseUrl,
  getAccessToken,
  credentials,
  permissionMode,
  tags,
}) {
  let { getClaudeAIOAuthTokens, getClaudeAIOAuthTokensAsync } = await import("./chunk-7v0gj88m.js");
  let { loginToHandOn } = await import("./chunk-temp5jed.js");
  let { readHostSessionsBearer, recoverHostSessionsBearer } = await import("./chunk-k6mn44mc.js");
  let { bearerOf } = await import("./chunk-28vb8cw9.js");
  let { getOrganizationUUID } = await import("./chunk-appaeyg7.js");
  let { getOauthConfig } = await import("./chunk-pcmb1mv7.js");
  let { sessionsApiWire } = await import("./chunk-6phxatm7.js");
  let { getMainLoopModel } = await import("./chunk-gqemcfsb.js");
  let { getOriginalCwd } = await import("./chunk-nj7t53r7.js");
  let { default: axios } = await import("./chunk-j1zq5m4b.js");
  let { isCcrV2BridgeCreateEnabled } = await import("./chunk-zke21f1q.js");
  let z = isCcrV2BridgeCreateEnabled() ? "v1alpha2" : "v1";
  let U = {
    create_endpoint: fromEnum(z),
  };
  let { isFirstPartyProvider } = await import("./chunk-hzephfq7.js");
  if (!isFirstPartyProvider()) {
    logForDebugging("[bridge] Session create skipped on non-firstParty provider");
    return logBridgeSessionCreateFailure("bridge_session_create_3p_provider", U);
  }
  let X =
    getAccessToken?.() ??
    pickOrFallback(
      readHostSessionsBearer,
      isStorageV5Enabled() && credentials !== undefined
        ? loginToHandOn(await getClaudeAIOAuthTokensAsync(credentials))?.accessToken
        : loginToHandOn(getClaudeAIOAuthTokens())?.accessToken,
    );
  if (!X) {
    logForDebugging("[bridge] No access token for session creation");
    return logBridgeSessionCreateFailure("bridge_session_create_no_token", U);
  }
  let orgUUID = await getOrganizationUUID();
  if (!orgUUID) {
    logForDebugging("[bridge] No org UUID for session creation");
    return logBridgeSessionCreateFailure("bridge_session_create_no_org", U);
  }
  let { sources, outcomes, report } = await buildGitSessionContext(gitRepoUrl, branch, defaultBranch);
  let parsed = environmentSelector(environmentId);
  let model = getMainLoopModel();
  let cwd = getOriginalCwd();
  let events = permissionMode ? [setModeControlEvent(permissionMode)] : [];
  let Ve =
    z === "v1alpha2"
      ? buildSessionCreateBody({
          title,
          worker: parsed,
          events,
          sources,
          outcomes,
          model,
          cwd,
          reuseOutcomeBranches: true,
          tags: tags?.length ? tags : undefined,
        })
      : {
          ...(title !== undefined && {
            title,
          }),
          events,
          session_context: {
            sources,
            outcomes,
            model,
            cwd,
            reuse_outcome_branches: true,
          },
          ...parsed,
          source: "remote-control",
          ...(tags?.length && {
            tags,
          }),
        };
  let me = sessionsApiWire(z, baseUrl ?? getOauthConfig().BASE_API_URL, X);
  let headers = {
    ...me.headers,
    "x-organization-uuid": orgUUID,
  };
  let response;
  try {
    response = await axios.post(me.url, Ve, {
      headers,
      signal,
      validateStatus: (L) => L < 500,
    });
  } catch (err) {
    logForDebugging(`[bridge] Session creation request failed: ${errorMessage(err)}`);
    return logBridgeSessionCreateFailure("bridge_session_create_request_failed", U);
  }
  if (!(response.status === 200 || response.status === 201)) {
    if (response.status === 401)
      recoverHostSessionsBearer(
        bearerOf(response.config?.headers?.get?.("Authorization")) ?? X,
        lacksAuthorizationHeader(response.config) ? "withheld" : "refused",
      ).catch(() => {});
    let detail = extractErrorDetail(response.data);
    logForDebugging(
      `[bridge] Session creation failed with status ${response.status}${detail ? `: ${detail}` : ""}`,
    );
    return logBridgeSessionCreateFailure("bridge_session_create_http_error", U);
  }
  let K = sessionIdFromCreateResponse(z, response.data);
  if (!K.ok) {
    logForDebugging(`[bridge] ${CREATE_RESPONSE_ERRORS[K.error].debug}`);
    return logBridgeSessionCreateFailure(CREATE_RESPONSE_ERRORS[K.error].code, U);
  }
  reportGitSessionContext(report);
  logFeatureOk("bridge_session_create", U);
  return toCompatSessionId(K.value.id);
}
//@ chunk-f25sswmp.js:28598-28653 placement
async function getBridgeSession(bridgeSessionId, n) {
  return (await getBridgeSessionOrStatus(bridgeSessionId, n)).session;
}
//@ chunk-f25sswmp.js:28653-30375 placement
async function getBridgeSessionOrStatus(sessionId, opts) {
  let { getClaudeAIOAuthTokens, getClaudeAIOAuthTokensAsync } = await import("./chunk-7v0gj88m.js");
  let { loginToHandOn } = await import("./chunk-temp5jed.js");
  let { readHostSessionsBearer, recoverHostSessionsBearer } = await import("./chunk-k6mn44mc.js");
  let { getOauthConfig } = await import("./chunk-pcmb1mv7.js");
  let { getCodeSession } = await import("./chunk-g9dw262t.js");
  let { isCcrV2SessionCrudEnabled } = await import("./chunk-zke21f1q.js");
  let { isFirstPartyProvider } = await import("./chunk-hzephfq7.js");
  if (!isFirstPartyProvider()) {
    logFeatureBad("bridge_session_get", "bridge_session_get_3p_provider");
    return {
      session: null,
      notFound: false,
    };
  }
  let T =
    opts?.getAccessToken?.() ??
    pickOrFallback(
      readHostSessionsBearer,
      isStorageV5Enabled() && opts?.credentials !== undefined
        ? loginToHandOn(await getClaudeAIOAuthTokensAsync(opts.credentials))?.accessToken
        : loginToHandOn(getClaudeAIOAuthTokens())?.accessToken,
    );
  if (!T) {
    logForDebugging("[bridge] No access token for session fetch");
    logFeatureBad("bridge_session_get", "bridge_session_get_no_token");
    return {
      session: null,
      notFound: false,
    };
  }
  let S = opts?.useV2 ?? isCcrV2SessionCrudEnabled();
  let response;
  if (!S) {
    let { getOrganizationUUID } = await import("./chunk-appaeyg7.js");
    response = (await getOrganizationUUID()) ?? undefined;
    if (!response) {
      logForDebugging("[bridge] No org UUID for session fetch");
      logFeatureBad("bridge_session_get", "bridge_session_get_no_org");
      return {
        session: null,
        notFound: false,
      };
    }
  }
  let codeSession = await getCodeSession(opts?.baseUrl ?? getOauthConfig().BASE_API_URL, T, sessionId, 1e4, {
    useV2: S,
    orgUUID: response,
  });
  if (typeof codeSession !== "object") {
    if (codeSession === 401) recoverHostSessionsBearer(T).catch(() => {});
    logFeatureBad(
      "bridge_session_get",
      codeSession === "invalid"
        ? "bridge_session_get_invalid_id"
        : typeof codeSession === "number"
          ? "bridge_session_get_http_error"
          : "bridge_session_get_request_failed",
    );
    return {
      session: null,
      notFound: codeSession === 404,
    };
  }
  logFeatureOk("bridge_session_get");
  return {
    session: {
      environment_id: codeSession.environment_id,
      title: codeSession.title,
      status: codeSession.status,
      created_at: codeSession.created_at,
      updated_at: codeSession.updated_at,
      connection_status:
        "connection_status" in codeSession && typeof codeSession.connection_status === "string"
          ? codeSession.connection_status
          : undefined,
      tags: codeSession.tags,
    },
    notFound: false,
  };
}
//@ chunk-f25sswmp.js:30375-31903 placement
async function archiveBridgeSession(e, n, r, s) {
  let { getClaudeAIOAuthTokens, getClaudeAIOAuthTokensAsync } = await import("./chunk-7v0gj88m.js");
  let { loginToHandOn } = await import("./chunk-temp5jed.js");
  let { readHostSessionsBearer, recoverHostSessionsBearer } = await import("./chunk-k6mn44mc.js");
  let { getOauthConfig } = await import("./chunk-pcmb1mv7.js");
  let { updateCodeSession } = await import("./chunk-g9dw262t.js");
  let { isCcrV2SessionCrudEnabled } = await import("./chunk-zke21f1q.js");
  let { isFirstPartyProvider } = await import("./chunk-hzephfq7.js");
  if (!isFirstPartyProvider()) {
    logFeatureBad("bridge_session_patch", "bridge_session_patch_3p_provider");
    return "rejected";
  }
  let v =
    s?.getAccessToken?.() ??
    pickOrFallback(
      readHostSessionsBearer,
      isStorageV5Enabled() && s?.credentials !== undefined
        ? loginToHandOn(await getClaudeAIOAuthTokensAsync(s.credentials))?.accessToken
        : loginToHandOn(getClaudeAIOAuthTokens())?.accessToken,
    );
  if (!v) {
    logForDebugging(`[bridge] No access token for session ${r} update`);
    return "failed";
  }
  let b = "client_metadata" in n || isCcrV2SessionCrudEnabled();
  let x;
  if (!b) {
    let { getOrganizationUUID } = await import("./chunk-appaeyg7.js");
    x = (await getOrganizationUUID()) ?? undefined;
    if (!x) {
      logForDebugging(`[bridge] No org UUID for session ${r} update`);
      return "failed";
    }
  }
  logForDebugging(`[bridge] Updating session ${r}: ${e}`);
  let k = await updateCodeSession(s?.baseUrl ?? getOauthConfig().BASE_API_URL, v, e, n, 1e4, {
    useV2: b,
    orgUUID: x,
  });
  if (k === "invalid") {
    logFeatureBad("bridge_session_patch", "bridge_session_patch_invalid_id");
    return "rejected";
  } else if (typeof k !== "number") {
    logFeatureBad("bridge_session_patch", "bridge_session_patch_request_failed");
    return "failed";
  } else if (k === 200) {
    logForDebugging(`[bridge] Session ${r} updated successfully`);
    logFeatureOk("bridge_session_patch");
    return "landed";
  } else {
    if (k === 401) recoverHostSessionsBearer(v).catch(() => {});
    logFeatureSad("bridge_session_patch", "bridge_session_patch_http_error");
    return "failed";
  }
}
//@ chunk-f25sswmp.js:31903-31962 placement
async function updateBridgeSessionTitle(e, title, opts) {
  return archiveBridgeSession(
    e,
    {
      title,
    },
    "title",
    opts,
  );
}
//@ chunk-f25sswmp.js:31962-32094 placement
async function markBridgeSessionRefusedAtCapacity(e, n, r) {
  return markBridgeSessionRefused(
    e,
    {
      title: `Couldn't start \u2014 too many sessions are running \xB7 ${n}`,
      reason: "capacity",
    },
    r,
  );
}
//@ chunk-f25sswmp.js:32094-32230 placement
async function markBridgeSessionRefused(e, n, r) {
  return archiveBridgeSession(
    e,
    {
      title: n.title,
      client_metadata: {
        desktop_rc_refusal: {
          title: n.title,
          reason: n.reason,
        },
      },
    },
    "refusal",
    r,
  );
}
//@ chunk-f25sswmp.js:32230-32247 placement
var SESSION_COLOR_TAG_PREFIX = "color:";
//@ chunk-f25sswmp.js:32247-32409 placement
async function updateBridgeSessionColorTag(e, currentSessionAgentColor, r, s) {
  let i = currentSessionAgentColor === "default";
  let removeTags = r
    .filter((E) => i || E !== currentSessionAgentColor)
    .map((E) => SESSION_COLOR_TAG_PREFIX + E);
  let addTags = i ? undefined : [SESSION_COLOR_TAG_PREFIX + currentSessionAgentColor];
  await archiveBridgeSession(
    e,
    {
      add_tags: addTags,
      remove_tags: removeTags,
    },
    "color tag",
    s,
  );
}
//@ chunk-f25sswmp.js:32409-32444 placement
async function updateBridgeSessionNameTag(e, n, r) {
  return false;
}
//@ chunk-f25sswmp.js:32444-32503 placement
function logBridgeSessionCreateFailure(e, n) {
  logFeatureBad("bridge_session_create", e, n);
  return null;
}
//@ chunk-f25sswmp.js:32503-32552 placement
function pickOrFallback(readHostSessionsBearer, n) {
  return n === undefined ? undefined : (readHostSessionsBearer() ?? n);
}
//@ chunk-f25sswmp.js:32552-32684 placement
function markTeleportedSession(e) {
  let teleportedSessionIds = bridgeHostState().teleportedSessionIds;
  teleportedSessionIds.add(sessionIdBody(e));
  if (teleportedSessionIds.size > 64) {
    let r = teleportedSessionIds.values().next().value;
    if (r !== undefined) teleportedSessionIds.delete(r);
  }
}
//@ chunk-f25sswmp.js:32684-32743 placement
function isTeleportedSession(sessionId) {
  return bridgeHostState().teleportedSessionIds.has(sessionIdBody(sessionId));
}
//@ chunk-f25sswmp.js:32743-32799 placement
function unmarkTeleportedSession(bridgeSessionId) {
  bridgeHostState().teleportedSessionIds.delete(sessionIdBody(bridgeSessionId));
}
//@ chunk-f25sswmp.js:32799-32824 placement
class BridgeSessionListenerSlot {
  listener = undefined;
}
//@ chunk-f25sswmp.js:32824-32850 placement
var BRIDGE_SESSION_LISTENER_SLOT = new SessionRootSlot(() => new BridgeSessionListenerSlot());
//@ chunk-f25sswmp.js:32850-32937 placement
/**
 * 安全地调用当前会话的桥接事件监听器（peek，不存在时忽略，异常只记日志）。
 */
function notifyBridgeSessionListener(session, n) {
  try {
    return BRIDGE_SESSION_LISTENER_SLOT.peek(session)?.listener?.(n)?.catch(logError);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-f25sswmp.js:32937-33032 placement
/**
 * 给当前根会话注册桥接事件监听器，返回注销函数（仅当仍是同一监听器时清除）。
 */
function setBridgeSessionListener(e) {
  let n = BRIDGE_SESSION_LISTENER_SLOT.of(getRootSession());
  n.listener = e;
  return () => {
    if (n.listener === e) n.listener = undefined;
  };
}
//@ chunk-ypjxapg8.js:5578-5601 sole-consumer
var BRIDGE_SESSION_API_TIMEOUT_MS = 5000;
var MAX_PAGE_FETCH_ATTEMPTS = 5;
var MAX_BRIDGE_SESSION_BODY_CHARS = 32768;
//@ chunk-ypjxapg8.js:5601-7905 sole-consumer
/**
 * 分页列出本组织的其他远程会话（v1 或 v1alpha2），跳过归档与自身，处理未信任设备的注册重试，返回对端列表并记录失败与截断。
 */
async function listPeerSessions(stats, options) {
  let { prepareApiRequest, sessionsApiWire } = await import("./chunk-6phxatm7.js");
  let { getOauthConfig } = await import("./chunk-pcmb1mv7.js");
  let accessToken;
  let orgUuid;
  try {
    ({ accessToken, orgUUID: orgUuid } = await prepareApiRequest(options));
  } catch (page) {
    logForDebugging(`[bridge:peers] auth prep failed: ${errorMessage(page)}`);
    if (stats) stats.failed = true;
    return [];
  }
  let useV2 = isCcrV2SessionCrudEnabled();
  let wire = sessionsApiWire(useV2 ? "v1alpha2" : "v1", getOauthConfig().BASE_API_URL, accessToken);
  let headers = {
    ...wire.headers,
    ...(!useV2 && {
      "x-organization-uuid": orgUuid,
    }),
  };
  let deviceToken = await getTrustedDeviceToken();
  if (deviceToken) headers["X-Trusted-Device-Token"] = deviceToken;
  let selfCompatId = getSelfBridgeCompatId();
  let selfBody = selfCompatId ? sessionIdBody(selfCompatId) : undefined;
  let peers = [];
  let seen = new Set();
  let cursor = null;
  let truncated = false;
  let enrollTried = false;
  for (let idx = 0; idx < MAX_PAGE_FETCH_ATTEMPTS; idx++) {
    let uRLSearchParams = new URLSearchParams();
    if (useV2) {
      uRLSearchParams.set("limit", "200");
      uRLSearchParams.append("statuses", "active");
      uRLSearchParams.append("statuses", "paused");
    }
    if (cursor) uRLSearchParams.set(useV2 ? "cursor" : "after_id", cursor);
    let str = uRLSearchParams.toString();
    let url = str ? `${wire.url}?${str}` : wire.url;
    let response;
    try {
      response = await axios_default.get(url, {
        headers,
        timeout: 15000,
        validateStatus: (n) => n < 500,
      });
    } catch (error) {
      logForDebugging(`[bridge:peers] list request failed: ${errorMessage(error)}`);
      if (stats) stats.failed = true;
      return peers;
    }
    let refusal =
      response.status === 403 && !enrollTried ? readUntrustedDeviceRefusal(response.data) : undefined;
    if (refusal !== undefined && shouldRemoteControlEnroll(refusal)) {
      enrollTried = true;
      let n = await recoverFromUntrustedDevice(deviceToken);
      if (n) {
        headers["X-Trusted-Device-Token"] = n;
        deviceToken = n;
        idx--;
        continue;
      }
    } else if (refusal !== undefined) {
      logRefusalWithoutEnrollment("[bridge:peers]", refusal);
      clearTrustedDeviceTokenCache();
    }
    if (response.status !== 200) {
      logForDebugging(`[bridge:peers] list failed ${response.status}`);
      if (stats) stats.failed = true;
      return peers;
    }
    if (response.data === null || typeof response.data !== "object" || !Array.isArray(response.data.data)) {
      logForDebugging("[bridge:peers] list body `data` not an array; stopping");
      if (stats) stats.failed = true;
      return peers;
    }
    for (let n of response.data.data)
      try {
        let isV2Row = "session_status" in n;
        let status = isV2Row ? n.session_status : toDisplaySessionStatus(n);
        if (status === "archived") continue;
        let sessionId = isV2Row ? n.id : toCompatSessionId(n.id);
        let bodyId = sessionIdBody(sessionId);
        if (selfBody && bodyId === selfBody) {
          adoptSelfBridgeTitleFromRoster(n.title);
          continue;
        }
        if (seen.has(bodyId)) continue;
        seen.add(bodyId);
        peers.push({
          id: sessionId,
          title: isV2Row ? n.title : n.title || null,
          status,
          updated_at: (isV2Row ? n.updated_at : n.last_event_at) ?? "",
          ...(isKnownWorkerState(n.environment_kind) && {
            environmentKind: n.environment_kind,
          }),
          ...((n.connection_status === "connected" || n.connection_status === "disconnected") && {
            connected: n.connection_status === "connected",
          }),
          ...(isV2Row
            ? {
                inboundReportUnavailable: true,
              }
            : parseCrossSessionInboundCapability(n.external_metadata)),
        });
      } catch (error) {
        logForDebugging(`[bridge:peers] skipping malformed session row: ${errorMessage(error)}`);
      }
    let nextCursor = useV2
      ? (response.data.next_cursor ?? null)
      : response.data.has_more
        ? (response.data.last_id ?? null)
        : null;
    if (!nextCursor) break;
    cursor = nextCursor;
    if (idx === MAX_PAGE_FETCH_ATTEMPTS - 1) {
      truncated = true;
      logForDebugging(
        `[bridge:peers] page budget exhausted with more sessions remaining (scanned ${MAX_PAGE_FETCH_ATTEMPTS} pages)`,
      );
    }
  }
  logForDebugging(
    `[bridge:peers] listed ${peers.length} peer sessions${truncated ? ` \u2014 TRUNCATED at ${MAX_PAGE_FETCH_ATTEMPTS} pages (more sessions exist)` : ""}`,
    truncated
      ? {
          level: "warn",
        }
      : undefined,
  );
  if (stats) stats.truncated = truncated;
  return peers;
}
//@ chunk-ypjxapg8.js:7905-8175 sole-consumer
function De(e) {
  if (!e) return false;
  if (e.startsWith("auth:")) return false;
  if (e.startsWith("invalid session ID format")) return false;
  let match = /^HTTP (\d{3})/.exec(e);
  if (match) {
    let u = Number(match[1]);
    if (u === 401 || u === 403) return false;
    if (u >= 500) return false;
  }
  if (/status code 5\d\d/.test(e)) return false;
  return true;
}
//@ chunk-ypjxapg8.js:8175-8520 sole-consumer
/**
 * 把发给对端会话的错误信息归类为 bridge_auth、invalid_target、4xx/5xx、timeout 或 other。
 */
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
//@ chunk-ypjxapg8.js:8520-10969 callgraph-fingerprint = updateBridgeSessionTitle (0.242)
/**
 * 向另一个会话发一条 peer 用户消息（POST events）：带来源 origin、附件、可信设备 token、可选设备签名；403 untrusted_device 时注册设备重试；返回 {ok, msgId|error}。
 */
async function postPeerMessage(
  sessionId,
  text,
  fromName,
  fileAttachments,
  b,
  C,
  credentials,
  fromPlugin,
  A = false,
) {
  let { prepareApiRequest, getOAuthRequestHeaders, CCR_BYOC_BETA } = await import("./chunk-6phxatm7.js");
  let { getOauthConfig } = await import("./chunk-pcmb1mv7.js");
  let p;
  let I;
  try {
    ({ accessToken: p, orgUUID: I } = await prepareApiRequest(credentials));
  } catch (error) {
    return {
      ok: false,
      error: `auth: ${errorMessage(error)}`,
    };
  }
  let compatSessionId = toCompatSessionId(sessionId);
  if (!/^session_[A-Za-z0-9_-]+$/.test(compatSessionId))
    return {
      ok: false,
      error: `invalid session ID format: ${sessionId}`,
    };
  let accessToken = getSelfBridgeCompatId() ?? ownRemoteSessionId();
  let y = accessToken ? bridgeAddressFromToken(accessToken) : "unknown";
  let l = wrapPeerMessage(
    y,
    getSelfBridgeTitle() ?? fromName,
    text,
    undefined,
    extendHopChain(b, accessToken ? hmacRandomId(y) : undefined),
    C,
  );
  let messageEnvelope = createMessageEnvelope();
  let g = peerMessageInfo(l);
  let O = sanitizeAddressPart(fromPlugin);
  let s = (fileAttachments?.length ?? 0) > 0;
  let R = {
    kind: "peer",
    from: y,
    ...(g.name !== undefined && {
      name: g.name,
    }),
    ...(g.fromMode !== undefined && {
      fromMode: g.fromMode,
    }),
    ...(O !== undefined && {
      plugin: O,
    }),
    ...(g.body !== undefined &&
      !s &&
      Buffer.byteLength(l) <= MAX_BRIDGE_SESSION_BODY_CHARS && {
        body: g.body,
      }),
  };
  let origin = stripPeerMessageBody(R, escapePluginTags(l), l);
  let n = {
    ...messageEnvelope,
    type: "user",
    message: {
      role: "user",
      content: l,
    },
    parent_tool_use_id: null,
    session_id: compatSessionId,
    uuid: randomUUID(),
    ...(!A && {
      origin,
    }),
    ...(fromPlugin !== undefined && {
      from_plugin: fromPlugin,
    }),
    ...(s && {
      file_attachments: fileAttachments,
    }),
  };
  let f = {
    ...getOAuthRequestHeaders(p),
    "anthropic-beta": CCR_BYOC_BETA,
    "x-organization-uuid": I,
  };
  let orgUUID = await getTrustedDeviceToken();
  if (orgUUID) f["X-Trusted-Device-Token"] = orgUUID;
  let x = isCcrV2SendEventsEnabled();
  let compatId = toInfraSessionId(compatSessionId);
  let N =
    orgUUID &&
    x &&
    !isEssentialTrafficOnly() &&
    !env.CLAUDE_CODE_REMOTE &&
    !isDeviceIdentityServedOff() &&
    (isTopLevelBridgeSession() || isReplBridgeActive())
      ? await import("./chunk-fwcps4x0.js").catch(reportSignerLoadFailure)
      : undefined;
  let F = N
    ? await N.signForElevatedPeer(
        () =>
          axios_default
            .get(`${getOauthConfig().BASE_API_URL}/v1/code/sessions/${encodeURIComponent(compatId)}`, {
              headers: f,
              timeout: BRIDGE_SESSION_API_TIMEOUT_MS,
              validateStatus: (a) => a < 500,
            })
            .then((a) => (a.status === 200 ? a.data : undefined)),
        compatId,
        n,
        credentials,
      )
    : {
        payload: n,
        device_attestation: undefined,
      };
  let { url, body } = sessionEventsUrl(
    getOauthConfig().BASE_API_URL,
    compatSessionId,
    [F.payload],
    x,
    F.device_attestation,
  );
  let o;
  try {
    o = await axios_default.post(url, body, {
      headers: f,
      timeout: 1e4,
      validateStatus: (a) => a < 500,
    });
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error),
    };
  }
  logPeerPostRejected(compatSessionId, o);
  let M = o.status === 403 ? readUntrustedDeviceRefusal(o.data) : undefined;
  if (M !== undefined) {
    if (env.CLAUDE_CODE_REMOTE === true && !orgUUID && !env.CLAUDE_TRUSTED_DEVICE_TOKEN)
      return {
        ok: false,
        error: `auth: ${CLOUD_CANNOT_REACH_ELEVATED_HINT}`,
      };
    let detail = shouldRemoteControlEnroll(M);
    if (!detail) {
      logRefusalWithoutEnrollment("[bridge:peers]", M);
      clearTrustedDeviceTokenCache();
    }
    let H = detail ? await recoverFromUntrustedDevice(orgUUID) : undefined;
    if (H) {
      try {
        o = await axios_default.post(url, body, {
          headers: {
            ...f,
            "X-Trusted-Device-Token": H,
          },
          timeout: 1e4,
          validateStatus: (L) => L < 500,
        });
      } catch (err) {
        return {
          ok: false,
          error: errorMessage(err),
        };
      }
      logPeerPostRejected(compatSessionId, o);
    }
    let refusal = o.status === 403 ? readUntrustedDeviceRefusal(o.data) : undefined;
    if (refusal !== undefined) {
      if (isTrustedDeviceGateEnabled())
        return {
          ok: false,
          error: `auth: ${untrustedDeviceHint(refusal, {
            justEnrolled: Boolean(H),
          })}`,
        };
    }
  }
  if (o.status === 403 && classifyElevatedAuthError(o.data) === "session_stale_relogin")
    return {
      ok: false,
      error: `auth: ${describeCredentialFailure({
        terminal: true,
        reason: "session_stale_relogin",
      })}`,
    };
  if (!isHttpSuccessStatus(o.status)) {
    if (o.status === 401 && env.CLAUDE_CODE_REMOTE === true)
      return {
        ok: false,
        error: `auth: ${CLOUD_CANNOT_MESSAGE_PEERS}`,
      };
    return {
      ok: false,
      error: `HTTP ${o.status}`,
    };
  }
  logForDebugging(`[bridge:peers] posted to ${compatSessionId}: ${text.slice(0, 60)}`);
  return {
    ok: true,
    msgId: messageEnvelope.msg_id,
  };
}
//@ chunk-ypjxapg8.js:10969-11206 affinity
var CLOUD_CANNOT_MESSAGE_PEERS =
  "this cloud session cannot message other sessions yet \u2014 its credential is accepted for its own work but not for delivering to another session, so a reply from here is not possible; say so in your response instead of retrying";
//@ chunk-ypjxapg8.js:11206-11510 sole-consumer
/**
 * 云会话向对端发消息被拒（403/401）时生成说明，提示改用服务路由发送；不适用时返回 undefined。
 */
function describeCloudPeerRefusal(e, r, sessionId, S) {
  let b = e === "HTTP 403" ? "403" : e === `auth: ${CLOUD_CANNOT_MESSAGE_PEERS}` ? "401" : undefined;
  if (env.CLAUDE_CODE_REMOTE !== true || b === undefined) return;
  let C = S();
  let _ =
    C === undefined
      ? undefined
      : serviceRouteSentence({
          sendTool: C,
          sessionId,
        });
  return _ === undefined
    ? undefined
    : `Nothing was sent to '${r}': the post from this cloud session was refused (HTTP ${b}). ${_}`;
}
//@ chunk-ypjxapg8.js:11510-11557 sole-consumer
function isHttpSuccessStatus(status) {
  return status === 200 || status === 201 || status === 204;
}
//@ chunk-ypjxapg8.js:11557-11713 sole-consumer
function logPeerPostRejected(compatSessionId, r) {
  if (isHttpSuccessStatus(r.status)) return;
  let errorDetail = extractErrorDetail(r.data);
  logForDebugging(
    `[bridge:peers] post to ${compatSessionId} rejected: HTTP ${r.status}${errorDetail ? ` \u2014 ${stripAnsiAndControls(errorDetail)}` : ""}`,
    {
      level: "warn",
    },
  );
}
export {
  isTeleportedSession,
  setBridgeSessionListener,
  getBridgeSessionOrStatus,
  notifyBridgeSessionListener,
  getBridgeSession,
  updateBridgeSessionColorTag,
  unmarkTeleportedSession,
  markTeleportedSession,
  updateBridgeSessionTitle,
  createBridgeSession,
};

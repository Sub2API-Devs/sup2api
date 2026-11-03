/**
 * assistant/sessionHistory.ts
 *
 * 远程会话事件历史：按页拉取最新/更早事件、判断远程回合是否仍在进行、构造会话端点 URL 与认证头
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/assistant/sessionHistory.ts
 * pieces: chunk-08945j39.js (2), chunk-fe6rs39h.js (2), chunk-kgtpkbhq.js (1)
 * attribution: fingerprint 4, affinity 1
 */
import {
  DEFAULT_EVENT_PAGE_SIZE,
  renewDeviceTokenAndRetry,
  getSessionRequestConfig,
} from "../remote/RemoteSessionManager.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  SESSION_HISTORY_PAGE_SIZE,
  SESSION_HISTORY_MAX_PAGES,
} from "../cli/headlessCloud/openBareCloudSession.js";
import { toInfraSessionId, toCompatSessionId } from "../bridge/sessionIdCompat.js";
import { oauthHeaders } from "../bridge/codeSessionApi.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-08945j39.js:78703-78925 fingerprint = fetchLatestEvents (0.435)
/**
 * 取会话最新一页事件（倒序），失败记 assistant_history_load。
 */
async function fetchLatestEvents(ctx, limit = DEFAULT_EVENT_PAGE_SIZE, s) {
  let i = await renewDeviceTokenAndRetry(
    ctx,
    {
      limit,
      sort_order: "desc",
    },
    "fetchLatestEvents",
  );
  if (s?.reportFeatureHealth !== false)
    if (i === null) logFeatureBad("assistant_history_load", "http_error");
    else logFeatureOk("assistant_history_load");
  return i;
}
//@ chunk-08945j39.js:78925-79028 fingerprint = fetchOlderEvents (0.553)
/**
 * 取更早一页会话事件（按游标倒序翻页）。
 */
async function fetchOlderEvents(ctx, cursor, limit = DEFAULT_EVENT_PAGE_SIZE, i) {
  return renewDeviceTokenAndRetry(
    ctx,
    {
      limit,
      sort_order: "desc",
      cursor,
    },
    "fetchOlderEvents",
    i,
  );
}
//@ chunk-fe6rs39h.js:150538-150807 fingerprint = fetchPage (0.361)
/**
 * 向前翻页查找远程会话最近的回合状态，返回是否仍在进行（under_way）。
 */
async function isRemoteTurnUnderWay(sessionId, context) {
  try {
    let ctx = await getSessionRequestConfig(sessionId, context);
    let latestEvents = await fetchLatestEvents(ctx, SESSION_HISTORY_PAGE_SIZE, {
      reportFeatureHealth: false,
    });
    for (let h = 1; latestEvents !== null; h += 1) {
      let y = classifyLatestTurnState(latestEvents.events);
      if (y !== undefined) return y === "under_way";
      if (!latestEvents.hasMore || latestEvents.firstId === null || h >= SESSION_HISTORY_MAX_PAGES) return;
      latestEvents = await fetchOlderEvents(ctx, latestEvents.firstId, SESSION_HISTORY_PAGE_SIZE);
    }
    return;
  } catch {
    return;
  }
}
//@ chunk-fe6rs39h.js:150807-151068 affinity
/**
 * 从事件末尾找顶层回合状态：worker 的 result → over，worker assistant 或客户端 user → under_way。
 */
function classifyLatestTurnState(events) {
  for (let event of [...events].reverse()) {
    if (!!event.payload.parent_tool_use_id) continue;
    if (event.source === "worker") {
      if (event.payload.type === "result") return "over";
      if (event.payload.type === "assistant") return "under_way";
    } else if (event.payload.type === "user") return "under_way";
  }
  return;
}
//@ chunk-kgtpkbhq.js:6745-7196 fingerprint = createHistoryAuthCtx (0.566)
/**
 * 构造会话端点：v2 用 /v1/code/sessions/{cse_id}{suffix} + OAuth 头；v1 兼容路径用 /v1/sessions/{session_id}{suffix} + ccr-byoc beta 与 x-organization-uuid；可附 X-Trusted-Device-Token。
 */
function buildSessionEndpoint(label, baseUrl, accessToken, sessionId, options, pathSuffix = "") {
  let m = options.trustedDeviceToken
    ? {
        "X-Trusted-Device-Token": options.trustedDeviceToken,
      }
    : undefined;
  if (options.useV2) {
    let infraSessionId = toInfraSessionId(sessionId);
    return {
      url: `${baseUrl}/v1/code/sessions/${infraSessionId}${pathSuffix}`,
      headers: {
        ...oauthHeaders(accessToken),
        ...m,
      },
      id: infraSessionId,
    };
  }
  if (!options.orgUUID) {
    logForDebugging(`[code-session] ${label} ${sessionId}: v1 compat path needs an org UUID`);
    return null;
  }
  let compatSessionId = toCompatSessionId(sessionId);
  return {
    url: `${baseUrl}/v1/sessions/${compatSessionId}${pathSuffix}`,
    headers: {
      ...oauthHeaders(accessToken),
      "anthropic-beta": "ccr-byoc-2025-07-29",
      "x-organization-uuid": options.orgUUID,
      ...m,
    },
    id: compatSessionId,
  };
}
export { fetchLatestEvents, fetchOlderEvents, buildSessionEndpoint, isRemoteTurnUnderWay };
